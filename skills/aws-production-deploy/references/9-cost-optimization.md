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
