## Contents

- 12. Production Guardrails (don't skip these)
- CI role: scope it and bound it
- Detection: turn it on account-wide
- ECR: scan on push + expire old images
- RDS: parameter group + KMS + tested restores
- Canary / synthetic alarm
- Tagging & least-privilege defaults

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
