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
