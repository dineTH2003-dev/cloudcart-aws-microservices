variable "repository_names" {
  description = "List of microservice repository names to create"
  type        = list(string)
  default = [
    "cloudcart/product-service",
    "cloudcart/user-service",
    "cloudcart/order-service",
    "cloudcart/inventory-service",
    "cloudcart/notification-service",
    "cloudcart/frontend"
  ]
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}
