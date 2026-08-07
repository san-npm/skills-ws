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
