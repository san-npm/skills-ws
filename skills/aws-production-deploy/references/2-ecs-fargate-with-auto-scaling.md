## Contents

- 2. ECS Fargate with Auto-Scaling
- 2a. CodeDeploy blue/green resources
- 2b. Simpler alternative: ECS rolling deploy with circuit breaker

## 2. ECS Fargate with Auto-Scaling

```hcl
# modules/ecs/main.tf

variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "public_subnet_ids" { type = list(string) }
variable "container_image" { type = string }
variable "container_port" { default = 3000 }
variable "cpu" { default = 512 }
variable "memory" { default = 1024 }
variable "desired_count" { default = 2 }
variable "min_count" { default = 2 }
variable "max_count" { default = 10 }
variable "health_check_path" { default = "/health" }
variable "secrets_arn" { type = string }
variable "certificate_arn" { type = string }
variable "admin_cidr" { type = string } # trusted CIDR for the blue/green test listener

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project}-${var.environment}/app"
  retention_in_days = 30
}

# Task execution role — pulls images, writes logs, reads secrets
resource "aws_iam_role" "task_execution" {
  name = "${var.project}-${var.environment}-task-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "task_execution_secrets" {
  role = aws_iam_role.task_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = [var.secrets_arn] }]
  })
}

# Task role — what YOUR CODE runs as. Least privilege.
resource "aws_iam_role" "task" {
  name = "${var.project}-${var.environment}-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy" "task" {
  role = aws_iam_role.task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["s3:GetObject","s3:PutObject"], Resource = ["arn:aws:s3:::${var.project}-${var.environment}-uploads/*"] },
      # Permissions for the ADOT collector sidecar below: forward traces to
      # X-Ray and pull centralized sampling rules.
      { Effect = "Allow",
        Action = ["xray:PutTraceSegments","xray:PutTelemetryRecords","xray:GetSamplingRules","xray:GetSamplingTargets","xray:GetSamplingStatisticSummaries"],
        Resource = ["*"] },
      # Required for ECS Exec (enable_execute_command below). Without these four
      # SSM Messages actions on the TASK role, `aws ecs execute-command` fails with
      # "execute command failed because execute command was not enabled".
      { Effect = "Allow",
        Action = ["ssmmessages:CreateControlChannel","ssmmessages:CreateDataChannel","ssmmessages:OpenControlChannel","ssmmessages:OpenDataChannel"],
        Resource = ["*"] }
    ]
  })
}

data "aws_region" "current" {}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project}-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = var.container_image
      portMappings = [{ containerPort = var.container_port, protocol = "tcp" }]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "${var.secrets_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${var.secrets_arn}:REDIS_URL::" }
      ]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = tostring(var.container_port) }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = { "awslogs-group" = aws_cloudwatch_log_group.app.name, "awslogs-region" = data.aws_region.current.region, "awslogs-stream-prefix" = "app" }
      }
      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}/health || exit 1"]
        interval = 30, timeout = 5, retries = 3, startPeriod = 60
      }
    },
    # Tracing sidecar: ADOT collector (OpenTelemetry), forwards traces to X-Ray.
    # The X-Ray daemon and SDKs entered maintenance mode on February 25, 2026
    # (security fixes only); AWS recommends OpenTelemetry instrumentation. If you
    # must keep the daemon for an existing app, pin amazon/aws-xray-daemon:3.x,
    # never :latest.
    {
      name = "aws-otel-collector", image = "public.ecr.aws/aws-observability/aws-otel-collector:latest"
      cpu = 32, memory = 256, essential = false
      command = ["--config=/etc/ecs/ecs-default-config.yaml"]
      portMappings = [{ containerPort = 4317, protocol = "tcp" }, { containerPort = 4318, protocol = "tcp" }]
      logConfiguration = { logDriver = "awslogs", options = { "awslogs-group" = aws_cloudwatch_log_group.app.name, "awslogs-region" = data.aws_region.current.region, "awslogs-stream-prefix" = "otel" } }
    }
  ])
}

# Security groups
# Only CloudFront's origin-facing ranges may reach the ALB. Opening 80/443 to
# 0.0.0.0/0 would let clients hit the ALB DNS name directly and bypass the WAF
# and rate limits attached to CloudFront in section 4. For defense in depth,
# also verify a secret custom origin header at the ALB.
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "alb" {
  name_prefix = "${var.project}-${var.environment}-alb-"
  vpc_id      = var.vpc_id
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  lifecycle { create_before_destroy = true }
}

resource "aws_security_group" "ecs" {
  name_prefix = "${var.project}-${var.environment}-ecs-"
  vpc_id      = var.vpc_id
  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  lifecycle { create_before_destroy = true }
}

# ALB
resource "aws_lb" "main" {
  name               = "${var.project}-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
  enable_deletion_protection = var.environment == "production"
  drop_invalid_header_fields = true
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue.arn
  }
  lifecycle { ignore_changes = [default_action] }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# --- Two target groups for CodeDeploy blue/green ---
# CodeDeploy swaps the production listener between these two groups. Both must
# exist up front; the running service is attached to exactly one at a time and
# CodeDeploy shifts traffic to the other on each deploy.
resource "aws_lb_target_group" "blue" {
  name_prefix          = "blue-"
  port                 = var.container_port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 30
  health_check {
    path                = var.health_check_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }
  lifecycle { create_before_destroy = true }
}

resource "aws_lb_target_group" "green" {
  name_prefix          = "green-"
  port                 = var.container_port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 30
  health_check {
    path                = var.health_check_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }
  lifecycle { create_before_destroy = true }
}

# Test listener on :8443 — lets CodeDeploy validate the green stack before it
# receives production traffic. Reuse the prod cert or a separate test cert.
resource "aws_lb_listener" "test" {
  load_balancer_arn = aws_lb.main.arn
  port              = 8443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.green.arn
  }
  lifecycle { ignore_changes = [default_action] }
}

# Allow the test-listener port through the ALB and into the tasks. The green
# task set on :8443 is not yet validated, so never expose it to 0.0.0.0/0:
# scope it to a trusted admin CIDR (or the CloudFront prefix list above).
resource "aws_security_group_rule" "alb_test_ingress" {
  type              = "ingress"
  security_group_id = aws_security_group.alb.id
  from_port         = 8443
  to_port           = 8443
  protocol          = "tcp"
  cidr_blocks       = [var.admin_cidr] # e.g. your office/VPN CIDR
}

# ECS Service — CodeDeploy-controlled blue/green with auto-rollback.
# NOTE: deployment_controller = CODE_DEPLOY is INCOMPATIBLE with the ECS
# deployment_circuit_breaker / deployment_configuration blocks; rollback is
# configured on the CodeDeploy deployment group instead (see section 2a). If you
# prefer plain ECS rolling deploys, swap to the variant in section 2b — do NOT
# mix the two.
resource "aws_ecs_service" "app" {
  name            = "${var.project}-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"
  enable_execute_command = true

  deployment_controller { type = "CODE_DEPLOY" }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.blue.arn
    container_name   = "app"
    container_port   = var.container_port
  }

  # CodeDeploy mutates task_definition and load_balancer on each deploy; ignore
  # them so Terraform does not fight CodeDeploy.
  lifecycle { ignore_changes = [task_definition, load_balancer] }
}

# Auto-scaling on CPU and request count
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.max_count
  min_capacity       = var.min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.project}-${var.environment}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification { predefined_metric_type = "ECSServiceAverageCPUUtilization" }
    target_value       = 65
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "requests" {
  name               = "${var.project}-${var.environment}-requests"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      # With CodeDeploy blue/green the live target group alternates blue<->green,
      # so per-target request scaling is approximate right after a deploy. If you
      # need exact request-based scaling under blue/green, prefer a CPU/memory
      # target (above) or a custom CloudWatch metric on the ALB request count.
      resource_label = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.blue.arn_suffix}"
    }
    target_value       = 1000
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

### 2a. CodeDeploy blue/green resources

These complete the blue/green deploy the service above declares. CodeDeploy needs an app, a deployment group bound to the ECS service + ALB listeners + both target groups, and an IAM role. The `AppSpec` and the GitHub Actions invocation are in section 5.

```hcl
# modules/ecs/codedeploy.tf

resource "aws_codedeploy_app" "app" {
  name             = "${var.project}-${var.environment}"
  compute_platform = "ECS"
}

resource "aws_iam_role" "codedeploy" {
  name = "${var.project}-${var.environment}-codedeploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "codedeploy.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}

resource "aws_codedeploy_deployment_group" "app" {
  app_name               = aws_codedeploy_app.app.name
  deployment_group_name  = "${var.project}-${var.environment}"
  service_role_arn       = aws_iam_role.codedeploy.arn
  deployment_config_name = "CodeDeployDefault.ECSCanary10Percent5Minutes"

  deployment_style {
    deployment_type   = "BLUE_GREEN"
    deployment_option = "WITH_TRAFFIC_CONTROL"
  }

  blue_green_deployment_config {
    # Spin up the green task set, run validation, then shift traffic.
    deployment_ready_option { action_on_timeout = "CONTINUE_DEPLOYMENT" }
    # Keep old (blue) task set for 15 min so you can roll back instantly.
    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 15
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  ecs_service {
    cluster_name = aws_ecs_cluster.main.name
    service_name = aws_ecs_service.app.name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route { listener_arns = [aws_lb_listener.https.arn] }
      test_traffic_route { listener_arns = [aws_lb_listener.test.arn] }
      target_group { name = aws_lb_target_group.blue.name }
      target_group { name = aws_lb_target_group.green.name }
    }
  }
}

output "ecs_cluster_name" { value = aws_ecs_cluster.main.name }
output "ecs_service_name" { value = aws_ecs_service.app.name }
output "codedeploy_app_name" { value = aws_codedeploy_app.app.name }
output "codedeploy_deployment_group" { value = aws_codedeploy_deployment_group.app.deployment_group_name }
output "alb_arn_suffix" { value = aws_lb.main.arn_suffix }
output "alb_dns_name" { value = aws_lb.main.dns_name }
output "ecs_security_group_id" { value = aws_security_group.ecs.id }
```

### 2b. Simpler alternative: ECS rolling deploy with circuit breaker

If you do NOT need blue/green (no per-deploy test traffic, faster rollouts are fine), drop section 2a, drop the test listener, and use the standard ECS rolling controller. Pick exactly one of 2a or 2b — `CODE_DEPLOY` and the circuit-breaker block are mutually exclusive.

```hcl
# Replacement for the aws_ecs_service.app body in section 2.
# deployment_controller defaults to ECS, so just omit it.
  enable_execute_command             = true
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  # ECS-native rolling deploys mutate the task definition, so do NOT ignore it:
  lifecycle { ignore_changes = [] }
```

With 2b, the GitHub Actions "Deploy" step in section 5 (`aws ecs update-service --force-new-deployment`) is the correct deploy mechanism. With 2a, use the CodeDeploy step shown there instead.

---
