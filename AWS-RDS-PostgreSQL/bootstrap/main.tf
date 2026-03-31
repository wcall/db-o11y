locals {
  tags = {
    Project   = "db-o11y"
    ManagedBy = "terraform"
    Account   = "grafanalabs-solutions-engineering"
    Owner     = "wei-chin.call@grafana.com"
  }
}

resource "aws_s3_bucket" "tfstate" {
  bucket = "wcall-rds-postgresql-bucket"

  tags = merge(local.tags, { Name = "wcall-rds-postgresql-bucket" })
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "tfstate_bucket_name" {
  value = aws_s3_bucket.tfstate.bucket
}
