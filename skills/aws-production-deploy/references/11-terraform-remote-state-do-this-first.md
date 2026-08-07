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
