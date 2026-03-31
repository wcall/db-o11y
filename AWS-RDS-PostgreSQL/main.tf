locals {
  azs = ["${var.aws_region}a", "${var.aws_region}b"]

  common_tags = merge(var.tags, {
    Project   = "db-o11y"
    ManagedBy = "terraform"
    Account   = "grafanalabs-solutions-engineering"
    AccountID = "494614287886"
    Owner     = "wcall"
  })

  # Init provisioners: override with psql_* when using SSM/port-forward to RDS.
  psql_exec_host = coalesce(var.psql_host, aws_db_instance.this.address)
  psql_exec_port = coalesce(var.psql_port, aws_db_instance.this.port)
}

# -----------------------------------------------------------------------------
# VPC
# -----------------------------------------------------------------------------

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.common_tags, { Name = "${var.identifier}-vpc" })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, { Name = "${var.identifier}-igw" })
}

# -----------------------------------------------------------------------------
# Subnets — 2 private (RDS), 2 public (bastion / future use)
# us-west-1 has 2 AZs: us-west-1a, us-west-1b
# -----------------------------------------------------------------------------

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone = local.azs[count.index]

  tags = merge(local.common_tags, {
    Name = "${var.identifier}-private-${local.azs[count.index]}"
    Tier = "private"
  })
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${var.identifier}-public-${local.azs[count.index]}"
    Tier = "public"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = merge(local.common_tags, { Name = "${var.identifier}-public-rt" })
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# -----------------------------------------------------------------------------
# Security Group
# -----------------------------------------------------------------------------

resource "aws_security_group" "rds" {
  name        = "${var.identifier}-sg"
  description = "Security group for ${var.identifier} RDS instance"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "PostgreSQL from allowed CIDRs"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${var.identifier}-sg" })
}

# -----------------------------------------------------------------------------
# DB Subnet Group
# -----------------------------------------------------------------------------

resource "aws_db_subnet_group" "this" {
  name       = "${var.identifier}-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(local.common_tags, { Name = "${var.identifier}-subnet-group" })
}

# -----------------------------------------------------------------------------
# Parameter Group
# -----------------------------------------------------------------------------

resource "aws_db_parameter_group" "this" {
  name        = "${var.identifier}-pg17"
  family      = "postgres17"
  #description = "Parameter group for db-o11y-postgres — enables monitoring extensions"

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "pg_stat_statements.track"
    value        = "all"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "track_activity_query_size"
    value        = "4096"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "pg_stat_statements.max"
    value        = "10000"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "rds.force_ssl"
    value        = "1"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "log_min_duration_statement"
    value        = "1000"
    apply_method = "immediate"
  }

  parameter {
    name         = "log_connections"
    value        = "1"
    apply_method = "immediate"
  }

  parameter {
    name         = "log_disconnections"
    value        = "1"
    apply_method = "immediate"
  }

  tags = merge(local.common_tags, { Name = "${var.identifier}-pg15" })
}

# -----------------------------------------------------------------------------
# IAM Role — RDS Enhanced Monitoring
# -----------------------------------------------------------------------------

resource "aws_iam_role" "rds_monitoring" {
  name = "${var.identifier}-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# -----------------------------------------------------------------------------
# RDS Instance
# -----------------------------------------------------------------------------

resource "aws_db_instance" "this" {
  identifier     = var.identifier
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.this.name

  multi_az                = false
  publicly_accessible     = true # dev only
  backup_retention_period = 1
  deletion_protection     = false

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  monitoring_interval                   = 60
  monitoring_role_arn                   = aws_iam_role.rds_monitoring.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  skip_final_snapshot = true

  tags = merge(local.common_tags, { Name = var.identifier })
}

# -----------------------------------------------------------------------------
# Init — Step 1: Seed schema and sample data
# -----------------------------------------------------------------------------

resource "null_resource" "init_seed" {
  depends_on = [aws_db_instance.this]

  triggers = {
    script_hash   = filemd5("${path.module}/init/01-seed.sql")
    db_endpoint   = aws_db_instance.this.endpoint
    psql_endpoint = "${local.psql_exec_host}:${local.psql_exec_port}"
  }

  provisioner "local-exec" {
    command = <<-EOT
      PGPASSWORD='${var.db_password}' psql \
        --host=${local.psql_exec_host} \
        --port=${local.psql_exec_port} \
        --username=${var.db_username} \
        --dbname=${var.db_name} \
        --file=${path.module}/init/01-seed.sql
    EOT
  }
}

# -----------------------------------------------------------------------------
# Init — Step 2: Monitoring user, extensions, and schema grants
# Depends on init_seed so the wcall schema exists before grants are applied
# -----------------------------------------------------------------------------

resource "null_resource" "init_monitoring" {
  depends_on = [null_resource.init_seed]

  triggers = {
    script_hash   = filemd5("${path.module}/init/02-monitoring.sql")
    db_endpoint   = aws_db_instance.this.endpoint
    psql_endpoint = "${local.psql_exec_host}:${local.psql_exec_port}"
  }

  provisioner "local-exec" {
    environment = {
      PGPASSWORD          = var.db_password
      MONITORING_PASSWORD = var.monitoring_user_password
    }
    command = <<-EOT
      psql \
        --host=${local.psql_exec_host} \
        --port=${local.psql_exec_port} \
        --username=${var.db_username} \
        --dbname=${var.db_name} \
        --file=${path.module}/init/02-monitoring.sql
    EOT
  }
}
