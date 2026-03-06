---
name: aws-production-deploy
description: "Production AWS infrastructure with Terraform/CDK: VPC, ECS Fargate, RDS, CloudFront, CI/CD, monitoring, and security hardening."
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

# One NAT per AZ for production HA. Single NAT for dev to save ~$100/mo.
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
  route { cidr_block = "0.0.0.0/0"; gateway_id = aws_internet_gateway.main.id }
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = var.environment == "production" ? var.az_count : 1
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"; nat_gateway_id = aws_nat_gateway.main[count.index].id }
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

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}"
  setting { name = "containerInsights"; value = "enabled" }
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
      { Effect = "Allow", Action = ["xray:PutTraceSegments","xray:PutTelemetryRecords"], Resource = ["*"] }
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
        options = { "awslogs-group" = aws_cloudwatch_log_group.app.name, "awslogs-region" = data.aws_region.current.name, "awslogs-stream-prefix" = "app" }
      }
      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}/health || exit 1"]
        interval = 30, timeout = 5, retries = 3, startPeriod = 60
      }
    },
    {
      name = "xray-daemon", image = "amazon/aws-xray-daemon:latest"
      cpu = 32, memory = 64, essential = false
      portMappings = [{ containerPort = 2000, protocol = "udp" }]
      logConfiguration = { logDriver = "awslogs", options = { "awslogs-group" = aws_cloudwatch_log_group.app.name, "awslogs-region" = data.aws_region.current.name, "awslogs-stream-prefix" = "xray" } }
    }
  ])
}

# Security groups
resource "aws_security_group" "alb" {
  name_prefix = "${var.project}-${var.environment}-alb-"
  vpc_id      = var.vpc_id
  ingress { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 80; to_port = 80; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
  lifecycle { create_before_destroy = true }
}

resource "aws_security_group" "ecs" {
  name_prefix = "${var.project}-${var.environment}-ecs-"
  vpc_id      = var.vpc_id
  ingress { from_port = var.container_port; to_port = var.container_port; protocol = "tcp"; security_groups = [aws_security_group.alb.id] }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
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
  default_action { type = "forward"; target_group_arn = aws_lb_target_group.blue.arn }
  lifecycle { ignore_changes = [default_action] }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action { type = "redirect"; redirect { port = "443"; protocol = "HTTPS"; status_code = "HTTP_301" } }
}

# Blue/Green target groups for zero-downtime deploys
resource "aws_lb_target_group" "blue" {
  name_prefix          = "blue-"
  port                 = var.container_port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 30
  health_check { path = var.health_check_path; healthy_threshold = 2; unhealthy_threshold = 3; timeout = 5; interval = 15; matcher = "200" }
  lifecycle { create_before_destroy = true }
}

resource "aws_lb_target_group" "green" {
  name_prefix          = "green-"
  port                 = var.container_port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 30
  health_check { path = var.health_check_path; healthy_threshold = 2; unhealthy_threshold = 3; timeout = 5; interval = 15; matcher = "200" }
  lifecycle { create_before_destroy = true }
}

# ECS Service with circuit breaker auto-rollback
resource "aws_ecs_service" "app" {
  name            = "${var.project}-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"
  enable_execute_command = true

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

  deployment_configuration { maximum_percent = 200; minimum_healthy_percent = 100 }
  deployment_circuit_breaker { enable = true; rollback = true }

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
    target_value = 65; scale_in_cooldown = 300; scale_out_cooldown = 60
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
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.blue.arn_suffix}"
    }
    target_value = 1000; scale_in_cooldown = 300; scale_out_cooldown = 60
  }
}
```

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
  ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [var.ecs_security_group_id] }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier                  = "${var.project}-${var.environment}"
  engine                              = "aurora-postgresql"
  engine_version                      = "15.4"
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
      http_port = 80; https_port = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "s3-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # Static assets — immutable, 1 year cache
  ordered_cache_behavior {
    path_pattern     = "/_next/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-assets"
    compress         = true
    forwarded_values { query_string = false; cookies { forward = "none" } }
    viewer_protocol_policy = "redirect-to-https"
    min_ttl = 31536000; default_ttl = 31536000; max_ttl = 31536000
  }

  # Default — forward to ALB
  default_cache_behavior {
    allowed_methods        = ["DELETE","GET","HEAD","OPTIONS","PATCH","POST","PUT"]
    cached_methods         = ["GET","HEAD"]
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    forwarded_values { query_string = true; headers = ["Host","Authorization","Accept"]; cookies { forward = "all" } }
    min_ttl = 0; default_ttl = 0; max_ttl = 0
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions { geo_restriction { restriction_type = "none" } }
}

# WAF — rate limiting + OWASP managed rules
resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project}-${var.environment}"
  scope = "CLOUDFRONT"
  provider = aws.us-east-1

  default_action { allow {} }

  rule {
    name     = "rate-limit"
    priority = 1
    action { block {} }
    statement { rate_based_statement { limit = 2000; aggregate_key_type = "IP" } }
    visibility_config { cloudwatch_metrics_enabled = true; metric_name = "rate-limit"; sampled_requests_enabled = true }
  }

  rule {
    name     = "aws-managed-common"
    priority = 2
    override_action { none {} }
    statement { managed_rule_group_statement { name = "AWSManagedRulesCommonRuleSet"; vendor_name = "AWS" } }
    visibility_config { cloudwatch_metrics_enabled = true; metric_name = "common"; sampled_requests_enabled = true }
  }

  rule {
    name     = "aws-managed-sqli"
    priority = 3
    override_action { none {} }
    statement { managed_rule_group_statement { name = "AWSManagedRulesSQLiRuleSet"; vendor_name = "AWS" } }
    visibility_config { cloudwatch_metrics_enabled = true; metric_name = "sqli"; sampled_requests_enabled = true }
  }

  visibility_config { cloudwatch_metrics_enabled = true; metric_name = "${var.project}-waf"; sampled_requests_enabled = true }
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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npm test && npm run lint && npm run typecheck

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
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

      - name: Run migrations
        run: |
          TASK_ARN=$(aws ecs run-task --cluster myapp-production \
            --task-definition myapp-production-migrate --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG],assignPublicIp=DISABLED}" \
            --overrides '{"containerOverrides":[{"name":"migrate","command":["npx","prisma","migrate","deploy"]}]}' \
            --query 'tasks[0].taskArn' --output text)
          aws ecs wait tasks-stopped --cluster myapp-production --tasks $TASK_ARN
          EXIT=$(aws ecs describe-tasks --cluster myapp-production --tasks $TASK_ARN \
            --query 'tasks[0].containers[0].exitCode' --output text)
          [ "$EXIT" = "0" ] || exit 1
        env:
          SUBNETS: ${{ secrets.PRIVATE_SUBNET_IDS }}
          SG: ${{ secrets.ECS_SECURITY_GROUP_ID }}

      - name: Deploy
        run: |
          TASK_DEF=$(aws ecs describe-task-definition --task-definition myapp-production --query 'taskDefinition')
          NEW_DEF=$(echo $TASK_DEF | jq --arg IMG "${{ steps.build.outputs.image }}" \
            '.containerDefinitions[0].image = $IMG | del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy)')
          NEW_ARN=$(aws ecs register-task-definition --cli-input-json "$NEW_DEF" --query 'taskDefinition.taskDefinitionArn' --output text)
          aws ecs update-service --cluster myapp-production --service myapp-production --task-definition $NEW_ARN --force-new-deployment
          aws ecs wait services-stable --cluster myapp-production --services myapp-production

      - name: Verify
        run: |
          for i in {1..5}; do
            [ "$(curl -so /dev/null -w '%{http_code}' https://api.example.com/health)" = "200" ] || exit 1
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
  dimensions          = { ClusterName = var.ecs_cluster_name; ServiceName = var.ecs_service_name }
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
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_15_4 }),
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

**Biggest cost trap: NAT Gateway data charges.** Add VPC endpoints for S3, ECR, and CloudWatch Logs:

```hcl
resource "aws_vpc_endpoint" "s3" {
  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.${data.aws_region.current.name}.s3"
  route_table_ids = aws_route_table.private[*].id
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  private_dns_enabled = true
}
```

Saves $50-200/mo on active services.

---

## 10. Debugging ECS in Production

```bash
# SSH into running container
aws ecs execute-command --cluster myapp-prod --task TASK_ID \
  --container app --interactive --command /bin/sh

# Tail logs
aws logs tail /ecs/myapp-production/app --since 30m --follow

# Check why tasks are failing
aws ecs describe-tasks --cluster myapp-prod --tasks TASK_ARN \
  --query 'tasks[0].stoppedReason'

# Force redeploy
aws ecs update-service --cluster myapp-prod --service myapp-prod --force-new-deployment
```
