variable "cluster_name" {
  type        = string
  default     = "cloudcart-eks-dev"
  description = "Name of the EKS cluster"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment name"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where EKS should be deployed"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for EKS worker nodes"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnet IDs for EKS control plane endpoints and public load balancers"
}

variable "kubernetes_version" {
  type        = string
  default     = "1.30"
  description = "Kubernetes control plane version"
}

variable "node_instance_types" {
  type        = list(string)
  default     = ["t3.medium"]
  description = "EC2 instance types for EKS worker nodes"
}

variable "desired_node_count" {
  type        = number
  default     = 2
  description = "Desired number of worker nodes"
}

variable "min_node_count" {
  type        = number
  default     = 2
  description = "Minimum number of worker nodes"
}

variable "max_node_count" {
  type        = number
  default     = 4
  description = "Maximum number of worker nodes for autoscaling"
}
