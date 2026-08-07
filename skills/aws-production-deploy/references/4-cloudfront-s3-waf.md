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
