---
name: aws-production-deploy
description: "Production AWS infra-as-code in Terraform & CDK: 3-tier VPC, ECS Fargate, Aurora, CloudFront/S3/WAF, OIDC CI/CD, monitoring, security hardening. Use when deploying a web app to AWS for production, writing/reviewing Terraform or CDK, setting up GitHub Actions OIDC deploys, or hardening an AWS account (remote state, GuardDuty, KMS, IAM)."
---

# AWS Production Deploy

Production-grade AWS infrastructure patterns. Not hello-world — real modules you'd ship to production with VPC isolation, ECS Fargate, RDS, CloudFront, and full CI/CD.

## Architecture Overview

```
                    ┌─────────────┐
                    │  Route 53   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ CloudFront  │──── S3 (static assets)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │     ALB     │  (public subnets)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼───┐  ┌────▼───┐  ┌────▼───┐
         │ECS Task│  │ECS Task│  │ECS Task│  (private subnets)
         └────┬───┘  └────┬───┘  └────┬───┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │   RDS       │  (isolated subnets)
                    │  Primary +  │
                    │  Read Replica│
                    └─────────────┘
```

---

## 1. VPC with Proper Network Isolation — Terraform

Most tutorials give you a flat VPC. Production needs three tiers: public (ALB only), private (compute), isolated (database). NAT Gateway per AZ for HA.

```hcl
# modules/vpc/main.tf

variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_cidr" { default = "10.0.0.0/16" }
variable "az_count" { default = 3 }

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)
  public_cidrs   = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 4, i)]
  private_cidrs  = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 4, i + var.az_count)]
  isolated_cidrs = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 4, i + var.az_count * 2)]
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "${var.project}-${var.environment}", Environment = var.environment }
}

# VPC Flow Logs — mandatory for debugging and compliance
resource "aws_flow_log" "main" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination_type = "cloud-watch-logs"
  log_destination      = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn         = aws_iam_role.flow_logs.arn
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/vpc/flow-logs/${var.project}-${var.environment}"
  retention_in_days = 30
}

resource "aws_iam_role" "flow_logs" {
  name = "${var.project}-${var.environment}-flow-logs"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole", Effect = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "flow_logs" {
  role = aws_iam_role.flow_logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents","logs:DescribeLogGroups","logs:DescribeLogStreams"]
      Resource = "*"
    }]
  })
}

# Public subnets — ALB lives here
resource "aws_subnet" "public" {
  count                   = var.az_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "${var.project}-${var.environment}-public-${local.azs[count.index]}" }
}

# Private subnets — ECS tasks, NAT for outbound
resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags = { Name = "${var.project}-${var.environment}-private-${local.azs[count.index]}" }
}

# Isolated subnets — RDS, ElastiCache. NO internet access.
resource "aws_subnet" "isolated" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.isolated_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags = { Name = "${var.project}-${var.environment}-isolated-${local.azs[count.index]}" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

# One NAT per AZ for production HA (cross-AZ NAT is a single point of failure
# AND incurs cross-AZ data charges). Single NAT for dev cuts the per-NAT hourly
# fee — roughly one gateway's hourly + data cost; verify current NAT Gateway
# pricing for your region at https://aws.amazon.com/vpc/pricing/.
resource "aws_eip" "nat" {
  count  = var.environment == "production" ? var.az_count : 1
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  count         = var.environment == "production" ? var.az_count : 1
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = var.environment == "production" ? var.az_count : 1
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
}

resource "aws_route_table_association" "private" {
  count          = var.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[var.environment == "production" ? count.index : 0].id
}

# Isolated — no internet route at all
resource "aws_route_table" "isolated" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table_association" "isolated" {
  count          = var.az_count
  subnet_id      = aws_subnet.isolated[count.index].id
  route_table_id = aws_route_table.isolated.id
}

output "vpc_id" { value = aws_vpc.main.id }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "isolated_subnet_ids" { value = aws_subnet.isolated[*].id }
```

---

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

## 3. RDS Aurora with Read Replicas

```hcl
# modules/rds/main.tf

variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "isolated_subnet_ids" { type = list(string) }
variable "ecs_security_group_id" { type = string }

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}"
  subnet_ids = var.isolated_subnet_ids
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project}-${var.environment}-rds-"
  vpc_id      = var.vpc_id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Pin a specific supported minor and pick your upgrade policy. As of mid-2026
# Aurora PostgreSQL supports the 14 / 15 / 16 / 17 / 18 major lines (13.x left
# standard support Feb 2026; 18.3 arrived Jun 2026); 16.x and 17.x carry LTS
# minors (16.8 and 17.7). Use a recent minor
# (e.g. 16.x LTS for stability, 17.x for newest features) and let AWS apply
# patch upgrades in the maintenance window. Verify the current minor list at
# https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/AuroraPostgreSQL.Updates.html
variable "engine_version" { default = "16.8" } # LTS line; bump deliberately

resource "aws_rds_cluster" "main" {
  cluster_identifier                  = "${var.project}-${var.environment}"
  engine                              = "aurora-postgresql"
  engine_version                      = var.engine_version
  allow_major_version_upgrade         = false # set true only for a planned major upgrade
  apply_immediately                   = false # batch changes into the maintenance window
  preferred_maintenance_window        = "sun:05:00-sun:06:00"
  database_name                       = replace(var.project, "-", "_")
  master_username                     = "dbadmin"
  manage_master_user_password         = true
  iam_database_authentication_enabled = true
  db_subnet_group_name                = aws_db_subnet_group.main.name
  vpc_security_group_ids              = [aws_security_group.rds.id]
  backup_retention_period             = 35
  preferred_backup_window             = "03:00-04:00"
  copy_tags_to_snapshot               = true
  deletion_protection                 = var.environment == "production"
  storage_encrypted                   = true
  enabled_cloudwatch_logs_exports     = ["postgresql"]

  serverlessv2_scaling_configuration {
    min_capacity = var.environment == "production" ? 2 : 0.5
    max_capacity = var.environment == "production" ? 16 : 4
  }
}

resource "aws_rds_cluster_instance" "writer" {
  identifier                   = "${var.project}-${var.environment}-writer"
  cluster_identifier           = aws_rds_cluster.main.id
  instance_class               = "db.serverless"
  engine                       = aws_rds_cluster.main.engine
  engine_version               = aws_rds_cluster.main.engine_version
  performance_insights_enabled = true
  monitoring_interval          = 30
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn
}

resource "aws_rds_cluster_instance" "reader" {
  count                        = var.environment == "production" ? 2 : 1
  identifier                   = "${var.project}-${var.environment}-reader-${count.index}"
  cluster_identifier           = aws_rds_cluster.main.id
  instance_class               = "db.serverless"
  engine                       = aws_rds_cluster.main.engine
  engine_version               = aws_rds_cluster.main.engine_version
  performance_insights_enabled = true
  monitoring_interval          = 30
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn
}

resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project}-${var.environment}-rds-mon"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "monitoring.rds.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

output "cluster_endpoint" { value = aws_rds_cluster.main.endpoint }
output "reader_endpoint" { value = aws_rds_cluster.main.reader_endpoint }
```

---

## 4. CloudFront + S3 + WAF

```hcl
# modules/cdn/main.tf

variable "project" { type = string }
variable "environment" { type = string }
variable "domain_name" { type = string }
variable "alb_dns_name" { type = string }
# CloudFront + CLOUDFRONT-scoped WAF certs MUST live in us-east-1. Pass an ACM
# cert ARN from us-east-1 here (see the provider alias note below).
variable "certificate_arn" { type = string }

# CloudFront and a CLOUDFRONT-scoped WAFv2 ACL can only be created in us-east-1.
# Declare a us-east-1 provider alias in the ROOT module and pass it to this
# module via `providers = { aws = aws, aws.us_east_1 = aws.us_east_1 }`:
#
#   # root main.tf
#   provider "aws" { region = "eu-west-1" }            # your primary region
#   provider "aws" {
#     alias  = "us_east_1"
#     region = "us-east-1"
#   }
#   module "cdn" {
#     source    = "./modules/cdn"
#     providers = { aws = aws, aws.us_east_1 = aws.us_east_1 }
#     ...
#   }
#
# and require both in the module:
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", configuration_aliases = [aws.us_east_1] }
  }
}

resource "aws_s3_bucket" "assets" {
  bucket = "${var.project}-${var.environment}-assets"
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.project}-${var.environment}-s3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# OAC requires a bucket policy granting the CloudFront SERVICE principal
# s3:GetObject, scoped to THIS distribution via AWS:SourceArn. Without it,
# every object 403s because public access is blocked above.
resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.assets.arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.main.arn } }
    }]
  })
}

# Managed cache/origin-request/response-header policies (replace legacy
# forwarded_values). These IDs are AWS-managed and stable across accounts.
data "aws_cloudfront_cache_policy" "caching_optimized" { name = "Managed-CachingOptimized" }
data "aws_cloudfront_cache_policy" "caching_disabled" { name = "Managed-CachingDisabled" }
data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" { name = "Managed-AllViewerExceptHostHeader" }
data "aws_cloudfront_response_headers_policy" "security" { name = "Managed-SecurityHeadersPolicy" }

resource "aws_cloudfront_distribution" "main" {
  enabled         = true
  is_ipv6_enabled = true
  aliases         = [var.domain_name]
  price_class     = "PriceClass_100"
  web_acl_id      = aws_wafv2_web_acl.main.arn

  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "s3-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # Static assets — immutable, long cache. CachingOptimized strips cookies,
  # compresses, and respects Cache-Control from the origin.
  ordered_cache_behavior {
    path_pattern               = "/_next/static/*"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "s3-assets"
    compress                   = true
    viewer_protocol_policy     = "redirect-to-https"
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id
  }

  # Default — dynamic, forward to ALB. CachingDisabled = no caching;
  # AllViewerExceptHostHeader forwards query strings, cookies, and headers
  # (minus Host, which must resolve to the ALB origin).
  default_cache_behavior {
    allowed_methods          = ["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"]
    cached_methods           = ["GET","HEAD"]
    target_origin_id         = "alb"
    viewer_protocol_policy    = "redirect-to-https"
    compress                  = true
    cache_policy_id           = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id  = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions { geo_restriction { restriction_type = "none" } }
}

# WAF — rate limiting + OWASP managed rules.
# A CLOUDFRONT-scoped WAFv2 ACL MUST be created in us-east-1, hence the aliased
# provider declared in the module header above.
resource "aws_wafv2_web_acl" "main" {
  provider = aws.us_east_1
  name     = "${var.project}-${var.environment}"
  scope    = "CLOUDFRONT"

  default_action { allow {} }

  rule {
    name     = "rate-limit"
    priority = 1
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "aws-managed-common"
    priority = 2
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "common"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "aws-managed-sqli"
    priority = 3
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "sqli"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-waf"
    sampled_requests_enabled   = true
  }
}
```

---

## 5. CI/CD — GitHub Actions to ECS

```yaml
# .github/workflows/deploy.yml
name: Deploy to ECS
on:
  push:
    branches: [main]

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

permissions:
  id-token: write
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        # Use a current LTS. Node 24 is Active LTS (through Oct 2026); Node 22
        # moved to Maintenance LTS in Oct 2025 (security fixes to Apr 2027);
        # Node 20 is end of life (Apr 2026), do not use. Match this to the
        # runtime in your Dockerfile.
        with: { node-version: 24, cache: npm }
      - run: npm ci && npm test && npm run lint && npm run typecheck

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v7

      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/github-actions-deploy
          aws-region: us-east-1

      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr

      - name: Build and push
        id: build
        env:
          ECR_REGISTRY: ${{ steps.ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build --cache-from $ECR_REGISTRY/myapp:latest \
            -t $ECR_REGISTRY/myapp:$IMAGE_TAG -t $ECR_REGISTRY/myapp:latest .
          docker push $ECR_REGISTRY/myapp:$IMAGE_TAG
          docker push $ECR_REGISTRY/myapp:latest
          echo "image=$ECR_REGISTRY/myapp:$IMAGE_TAG" >> $GITHUB_OUTPUT

      # Requires a `myapp-production-migrate` task definition with a `migrate`
      # container that has DATABASE_URL injected as an ECS secret (valueFrom the
      # same Secrets Manager secret as the app) and the SAME task/execution roles
      # as the app. Register it in Terraform (a second aws_ecs_task_definition with
      # the migrate command), or reuse the app task def and only override the
      # command as below. SUBNETS/SG secrets must each be a JSON-array-safe,
      # COMMA-separated list with NO spaces, e.g. subnet-aaa,subnet-bbb — the CLI
      # parses subnets=[a,b]. Quote them if a single value to avoid shell globbing.
      - name: Run migrations
        env:
          # comma-separated, no spaces: "subnet-aaa,subnet-bbb,subnet-ccc"
          SUBNETS: ${{ secrets.PRIVATE_SUBNET_IDS }}
          SG: ${{ secrets.ECS_SECURITY_GROUP_ID }}
        run: |
          set -euo pipefail
          NETCFG="awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SG}],assignPublicIp=DISABLED}"
          TASK_ARN=$(aws ecs run-task --cluster myapp-production \
            --task-definition myapp-production-migrate --launch-type FARGATE \
            --network-configuration "$NETCFG" \
            --overrides '{"containerOverrides":[{"name":"migrate","command":["npx","prisma","migrate","deploy"]}]}' \
            --query 'tasks[0].taskArn' --output text)
          aws ecs wait tasks-stopped --cluster myapp-production --tasks "$TASK_ARN"
          EXIT=$(aws ecs describe-tasks --cluster myapp-production --tasks "$TASK_ARN" \
            --query 'tasks[0].containers[?name==`migrate`].exitCode | [0]' --output text)
          [ "$EXIT" = "0" ] || { echo "migration exited $EXIT"; exit 1; }

      # Register the new task-definition revision (shared by both deploy styles).
      - name: Register task definition
        id: taskdef
        run: |
          set -euo pipefail
          TASK_DEF=$(aws ecs describe-task-definition --task-definition myapp-production --query 'taskDefinition')
          NEW_DEF=$(echo "$TASK_DEF" | jq --arg IMG "${{ steps.build.outputs.image }}" \
            '.containerDefinitions[0].image = $IMG | del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)')
          NEW_ARN=$(aws ecs register-task-definition --cli-input-json "$NEW_DEF" --query 'taskDefinition.taskDefinitionArn' --output text)
          echo "arn=$NEW_ARN" >> "$GITHUB_OUTPUT"

      # --- Deploy variant A: CodeDeploy blue/green (matches section 2a) ---
      # update-service is REJECTED on a CODE_DEPLOY-controlled service, so drive
      # the deploy through CodeDeploy with an AppSpec that names the new revision.
      - name: Deploy (CodeDeploy blue/green)
        run: |
          set -euo pipefail
          APPSPEC=$(jq -n --arg TD "${{ steps.taskdef.outputs.arn }}" '{
            version: "0.0",
            Resources: [{ TargetService: { Type: "AWS::ECS::Service", Properties: {
              TaskDefinition: $TD,
              LoadBalancerInfo: { ContainerName: "app", ContainerPort: 3000 }
            }}}]
          }')
          DEP_ID=$(aws deploy create-deployment \
            --application-name myapp-production \
            --deployment-group-name myapp-production \
            --revision "revisionType=AppSpecContent,appSpecContent={content='$APPSPEC'}" \
            --query 'deploymentId' --output text)
          aws deploy wait deployment-successful --deployment-id "$DEP_ID"

      # --- Deploy variant B: ECS rolling (use INSTEAD of A if you chose 2b) ---
      # - name: Deploy (ECS rolling)
      #   run: |
      #     aws ecs update-service --cluster myapp-production --service myapp-production \
      #       --task-definition ${{ steps.taskdef.outputs.arn }} --force-new-deployment
      #     aws ecs wait services-stable --cluster myapp-production --services myapp-production

      - name: Verify
        run: |
          set -euo pipefail
          for i in {1..5}; do
            [ "$(curl -so /dev/null -w '%{http_code}' https://api.example.com/health)" = "200" ] && break
            [ "$i" = "5" ] && { echo "health check never returned 200"; exit 1; }
            sleep 2
          done
```

---

## 6. Monitoring & Cost Alerts

```hcl
resource "aws_sns_topic" "alerts" {
  name = "${var.project}-${var.environment}-alerts"
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project}-high-5xx"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 2
  threshold           = 50
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions          = { LoadBalancer = var.alb_arn_suffix }
}

resource "aws_cloudwatch_metric_alarm" "latency_p99" {
  alarm_name          = "${var.project}-high-latency"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "TargetResponseTime"
  extended_statistic  = "p99"
  period              = 300
  evaluation_periods  = 3
  threshold           = 2
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions          = { LoadBalancer = var.alb_arn_suffix }
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  alarm_name          = "${var.project}-ecs-cpu"
  namespace           = "AWS/ECS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions          = { ClusterName = var.ecs_cluster_name, ServiceName = var.ecs_service_name }
}

resource "aws_budgets_budget" "monthly" {
  name         = "${var.project}-monthly"
  budget_type  = "COST"
  limit_amount = "500"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}
```

---

## 7. Database Migration Strategy

**Golden rule: migrations must be backward-compatible.** Old and new code run simultaneously during deployment.

### Safe migration pattern:
```
Deploy 1: ADD new column (nullable)
Deploy 2: Write to BOTH columns
Deploy 3: Backfill old rows in batches
Deploy 4: Read from new column only
Deploy 5: DROP old column
```

### Dangerous vs safe:
```sql
-- NEVER (locks table):
ALTER TABLE users ADD COLUMN verified boolean NOT NULL DEFAULT false;

-- SAFE (two steps):
ALTER TABLE users ADD COLUMN verified boolean;
-- Backfill in batches:
UPDATE users SET verified = false WHERE verified IS NULL AND id BETWEEN $1 AND $2;
-- Then:
ALTER TABLE users ALTER COLUMN verified SET DEFAULT false;
ALTER TABLE users ALTER COLUMN verified SET NOT NULL;
```

### Rollback:
```bash
aws ecs describe-services --cluster myapp-prod --services myapp-prod \
  --query 'services[0].taskDefinition' --output text > /tmp/last-good
# If things break:
aws ecs update-service --cluster myapp-prod --service myapp-prod \
  --task-definition $(cat /tmp/last-good) --force-new-deployment
```

---

## 8. CDK Alternative

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';

export class ProductionStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 3, natGateways: 3,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 20 },
        { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 20 },
        { name: 'Isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 20 },
      ],
    });

    const db = new rds.DatabaseCluster(this, 'Database', {
      // CDK v2. The AuroraPostgresEngineVersion enum often lags AWS's released
      // minors, so prefer `.of()` with an explicit supported version (see the
      // RDS module note in section 3). Use `VER_16_x`/`VER_17_x` if present in
      // your aws-cdk-lib version.
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.of('16.8', '16'),
      }),
      serverlessV2MinCapacity: 2, serverlessV2MaxCapacity: 16,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      readers: [rds.ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true })],
      vpc, vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      backup: { retention: cdk.Duration.days(35) },
      deletionProtection: true, storageEncrypted: true,
    });

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      vpc, taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      cpu: 512, memoryLimitMiB: 1024, desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('.'),
        containerPort: 3000,
        secrets: { DATABASE_URL: ecs.Secret.fromSecretsManager(db.secret!, 'url') },
        environment: { NODE_ENV: 'production' },
      },
      circuitBreaker: { rollback: true },
    });

    const scaling = service.service.autoScaleTaskCount({ minCapacity: 2, maxCapacity: 10 });
    scaling.scaleOnCpuUtilization('Cpu', { targetUtilizationPercent: 65 });
    scaling.scaleOnRequestCount('Req', { requestsPerTarget: 1000, targetGroup: service.targetGroup });
    db.connections.allowDefaultPortFrom(service.service);
  }
}
```

---

## 9. Cost Optimization

| Resource | Dev | Production |
|----------|-----|------------|
| NAT Gateway | 1 | 1 per AZ |
| RDS | Serverless min 0.5 | Serverless min 2 |
| ECS | 256/512 | 512/1024+ |
| Logs retention | 7 days | 30-90 days |

**Biggest cost trap: NAT Gateway data charges.** Route ECR pulls and log shipping through VPC endpoints so they bypass NAT. Pulling images needs ALL of: `ecr.dkr` + `ecr.api` (interface) + `s3` (gateway — ECR layers live in S3). Interface endpoints also need a security group that allows 443 from the ECS tasks.

```hcl
# Interface endpoints need 443 ingress from the workloads using them.
resource "aws_security_group" "vpce" {
  name_prefix = "${var.project}-${var.environment}-vpce-"
  vpc_id      = aws_vpc.main.id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }
  lifecycle { create_before_destroy = true }
}

# Gateway endpoints (S3 + DynamoDB) are FREE — no hourly or data charge.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${data.aws_region.current.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id
}

# Interface endpoints (ECR + logs) bill per-AZ-hour + per-GB; still far cheaper
# than NAT data transfer for steady image pulls and log volume.
locals {
  interface_endpoints = toset(["ecr.dkr", "ecr.api", "logs", "secretsmanager"])
}
resource "aws_vpc_endpoint" "interface" {
  for_each            = local.interface_endpoints
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpce.id]
  private_dns_enabled = true
}
```

Endpoints trade NAT data-transfer cost for per-endpoint hourly + per-GB fees, so the net saving depends on traffic and region — measure with Cost Explorer and verify current rates at https://aws.amazon.com/privatelink/pricing/ and https://aws.amazon.com/vpc/pricing/. Gateway endpoints (S3/DynamoDB) are free, so add them unconditionally.

---

## 10. Debugging ECS in Production

```bash
# Open an interactive shell via ECS Exec (Session Manager, NOT SSH).
# Requires: enable_execute_command on the service, the four ssmmessages:* perms
# on the TASK role (section 2), and a shell in the image. Distroless/no-shell
# images have no /bin/sh — bake in a debug shell or use an ephemeral sidecar.
aws ecs execute-command --cluster myapp-prod --task TASK_ID \
  --container app --interactive --command /bin/sh

# Verify Exec is actually enabled on a running task (look for enableExecuteCommand):
aws ecs describe-tasks --cluster myapp-prod --tasks TASK_ARN \
  --query 'tasks[0].enableExecuteCommand'

# Tail logs
aws logs tail /ecs/myapp-production/app --since 30m --follow

# Check why tasks are failing
aws ecs describe-tasks --cluster myapp-prod --tasks TASK_ARN \
  --query 'tasks[0].stoppedReason'

# Force redeploy (ECS rolling controller only — a CODE_DEPLOY service rejects
# this; trigger a CodeDeploy deployment instead, see section 5 variant A).
aws ecs update-service --cluster myapp-prod --service myapp-prod --force-new-deployment
```

---

## 11. Terraform Remote State (do this first)

Local state is unacceptable for a team or for production. With S3-native state locking (Terraform 1.10+/1.11+) you no longer need a DynamoDB lock table — set `use_lockfile = true`. The state bucket must be encrypted and versioned.

```hcl
# backend.tf — bootstrap the bucket ONCE with local state, then migrate.
terraform {
  backend "s3" {
    bucket       = "myorg-tfstate-prod"
    key          = "app/production/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true            # native S3 lock; Terraform >= 1.10
    kms_key_id   = "alias/tfstate" # CMK, not the default aws/s3 key
  }
}

# state bucket resources (apply with a temporary local backend first)
resource "aws_s3_bucket" "tfstate" { bucket = "myorg-tfstate-prod" }
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.tfstate.arn
    }
  }
}
resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_kms_key" "tfstate" {
  description         = "tfstate"
  enable_key_rotation = true
}
resource "aws_kms_alias" "tfstate" {
  name          = "alias/tfstate"
  target_key_id = aws_kms_key.tfstate.key_id
}
```

If you are on Terraform < 1.10, keep a DynamoDB lock table and set `dynamodb_table` in the backend block instead of `use_lockfile`.

---

## 12. Production Guardrails (don't skip these)

The modules above ship a working stack; these turn it into something you can defend in an audit and operate at 3am.

### CI role: scope it and bound it
The `github-actions-deploy` role assumed in section 5 must be locked to your repo via the OIDC `sub` claim and capped with a permissions boundary so a compromised workflow can't escalate.

```hcl
data "aws_iam_openid_connect_provider" "github" { url = "https://token.actions.githubusercontent.com" }

data "aws_iam_policy_document" "gha_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Lock to one repo + ref. NEVER use repo:org/*:* — that lets any repo assume it.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:myorg/myapp:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "gha_deploy" {
  name                 = "github-actions-deploy"
  assume_role_policy   = data.aws_iam_policy_document.gha_assume.json
  permissions_boundary = aws_iam_policy.gha_boundary.arn # caps max privilege
}
```

Pair this with GitHub Environments: the `environment: production` in section 5 should have **required reviewers** so a human approves each prod deploy (an approval gate, not just a label).

### Detection: turn it on account-wide
```hcl
resource "aws_guardduty_detector" "main" { enable = true }
resource "aws_securityhub_account" "main" {}
resource "aws_config_configuration_recorder" "main" {
  name     = "default"
  role_arn = aws_iam_role.config.arn
  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}
```
GuardDuty (threat detection), Security Hub (CIS/AWS Foundational Security Best Practices scoring), and AWS Config (resource compliance + drift) are the baseline three. Add Access Analyzer to catch public/cross-account exposure.

### ECR: scan on push + expire old images
```hcl
resource "aws_ecr_repository" "app" {
  name                 = "myapp"
  image_tag_mutability = "IMMUTABLE"          # tags can't be overwritten
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "KMS" }
}
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({ rules = [{
    rulePriority = 1, description = "keep last 20 images"
    selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 20 }
    action       = { type = "expire" }
  }] })
}
```
Note: `IMMUTABLE` tags mean the `:latest` retag in section 5's build step will fail — push only the immutable `:$IMAGE_TAG` and reference that, or use a mutable repo for `:latest`.

### RDS: parameter group + KMS + tested restores
- Attach an `aws_rds_cluster_parameter_group` to enforce `rds.force_ssl = 1`, sane `log_min_duration_statement`, and `log_statement = 'ddl'`.
- Encrypt with a customer-managed KMS key (`kms_key_id` on the cluster), not the default `aws/rds` key, so you control rotation and cross-account sharing.
- `backup_retention_period` (35 in section 3) is worthless if you've never restored. Periodically `aws rds restore-db-cluster-to-point-in-time` into a scratch cluster and smoke-test it. Consider `aws_backup` with cross-region copy for DR.

### Canary / synthetic alarm
The section 6 alarms are reactive. Add a CloudWatch Synthetics canary hitting a real user path and alarm on its `SuccessPercent`, so you detect "site is down" before customers do. Wire canary failure into the CodeDeploy `auto_rollback_configuration` alarms (section 2a) so a bad deploy rolls back automatically.

### Tagging & least-privilege defaults
Set a provider-level `default_tags` block (`Environment`, `Project`, `Owner`, `CostCenter`) so every resource is attributable in Cost Explorer and the budget alarm in section 6 is actionable. Run `tfsec`/`checkov`/`trivy config` in the `test` job (section 5) to catch insecure Terraform before apply.
