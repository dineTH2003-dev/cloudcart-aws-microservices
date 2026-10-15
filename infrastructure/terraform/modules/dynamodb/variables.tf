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
