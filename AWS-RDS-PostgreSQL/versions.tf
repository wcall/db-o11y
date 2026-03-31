# Two-step apply required:
#   1. cd bootstrap && terraform init && terraform apply  (creates S3 bucket)
#   2. cd .. && terraform init && terraform apply         (provisions everything else)

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    bucket = "wcall-rds-postgresql-bucket"
    key    = "rds-postgresql/terraform.tfstate"
    region = "us-west-1"
  }
}

provider "aws" {
  region = var.aws_region
  profile = "terraform-rds"
}
