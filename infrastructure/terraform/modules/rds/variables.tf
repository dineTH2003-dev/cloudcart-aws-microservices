variable "name_prefix" {
  type        = string
  default     = "cloudcart"
  description = "Prefix for resources"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment name"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where RDS should reside"
}

variable "database_subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for DB subnet group"
}

variable "eks_nodes_security_group_id" {
  type        = string
  description = "Security Group ID of EKS nodes to allow inbound PostgreSQL traffic"
}

variable "db_name" {
  type    = string
  default = "cloudcart"
}

variable "db_username" {
  type    = string
  default = "cloudcart_admin"
}

variable "db_password" {
  type      = string
  sensitive = true
  default   = "CloudCartSecure2026!"
}
