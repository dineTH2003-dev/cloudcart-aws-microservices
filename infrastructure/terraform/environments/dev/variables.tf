variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS deployment region"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment name"
}

variable "name_prefix" {
  type        = string
  default     = "cloudcart"
  description = "Resource prefix"
}

variable "db_password" {
  type        = string
  sensitive   = true
  default     = "CloudCartSecure2026!"
  description = "PostgreSQL RDS administrator password"
}
