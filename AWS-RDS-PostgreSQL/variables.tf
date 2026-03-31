variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-west-1"
}

variable "identifier" {
  description = "Unique identifier for the RDS instance"
  type        = string
  default     = "db-o11y-postgres"
}

variable "db_name" {
  description = "Name of the initial database"
  type        = string
  default     = "wcallrdspostgresql17" # Cannot use hyphen in db_name
}

variable "db_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "dbadmin"
}

variable "db_password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true
}

variable "monitoring_user_password" {
  description = "Password for the db_o11y monitoring user"
  type        = string
  sensitive   = true
}

variable "psql_host" {
  description = "Host for init SQL local-exec (psql). Null = aws_db_instance address (direct RDS). Use 127.0.0.1 with an SSM tunnel."
  type        = string
  default     = null
  nullable    = true
}

variable "psql_port" {
  description = "Port for init SQL local-exec (psql). Null = RDS instance port. Use your tunnel localPortNumber when psql_host is localhost."
  type        = number
  default     = null
  nullable    = true
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "17.2"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum storage for autoscaling in GB"
  type        = number
  default     = 100
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to RDS on port 5432"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
