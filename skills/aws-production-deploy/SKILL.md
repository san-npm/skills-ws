---
name: aws-production-deploy
description: "Production AWS infra-as-code in Terraform & CDK: 3-tier VPC, ECS Fargate, Aurora, CloudFront/S3/WAF, OIDC CI/CD, monitoring, security hardening. Use when deploying a web app to AWS for production, writing/reviewing Terraform or CDK, setting up GitHub Actions OIDC deploys, or hardening an AWS account (remote state, GuardDuty, KMS, IAM)."
---
# AWS Production Deploy

Production-grade AWS infrastructure patterns. Not hello-world — real modules you'd ship to production with VPC isolation, ECS Fargate, RDS, CloudFront, and full CI/CD.

## Safety gate

Before executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.

## Reference guide

Read only the references needed for the current request:

- **Architecture Overview**: [references/architecture-overview.md](references/architecture-overview.md)
- **1. VPC with Proper Network Isolation — Terraform**: [references/1-vpc-with-proper-network-isolation-terraform.md](references/1-vpc-with-proper-network-isolation-terraform.md)
- **2. ECS Fargate with Auto-Scaling**: [references/2-ecs-fargate-with-auto-scaling.md](references/2-ecs-fargate-with-auto-scaling.md)
- **3. RDS Aurora with Read Replicas**: [references/3-rds-aurora-with-read-replicas.md](references/3-rds-aurora-with-read-replicas.md)
- **4. CloudFront + S3 + WAF**: [references/4-cloudfront-s3-waf.md](references/4-cloudfront-s3-waf.md)
- **5. CI/CD — GitHub Actions to ECS**: [references/5-ci-cd-github-actions-to-ecs.md](references/5-ci-cd-github-actions-to-ecs.md)
- **6. Monitoring & Cost Alerts**: [references/6-monitoring-cost-alerts.md](references/6-monitoring-cost-alerts.md)
- **7. Database Migration Strategy**: [references/7-database-migration-strategy.md](references/7-database-migration-strategy.md)
- **8. CDK Alternative**: [references/8-cdk-alternative.md](references/8-cdk-alternative.md)
- **9. Cost Optimization**: [references/9-cost-optimization.md](references/9-cost-optimization.md)
- **10. Debugging ECS in Production**: [references/10-debugging-ecs-in-production.md](references/10-debugging-ecs-in-production.md)
- **11. Terraform Remote State (do this first)**: [references/11-terraform-remote-state-do-this-first.md](references/11-terraform-remote-state-do-this-first.md)
- **12. Production Guardrails (don't skip these)**: [references/12-production-guardrails-don-t-skip-these.md](references/12-production-guardrails-don-t-skip-these.md)
