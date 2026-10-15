output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_name" {
  description = "EKS Cluster Name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS Cluster API Endpoint"
  value       = module.eks.cluster_endpoint
}

output "rds_postgres_endpoint" {
  description = "RDS PostgreSQL Endpoint"
  value       = module.rds.endpoint
}

output "dynamodb_users_table" {
  description = "DynamoDB Users Table Name"
  value       = module.dynamodb.table_name
}

output "sns_order_topic_arn" {
  description = "SNS Order Events Topic ARN"
  value       = module.messaging.order_topic_arn
}

output "inventory_queue_url" {
  description = "SQS Inventory Queue URL"
  value       = module.messaging.inventory_queue_url
}

output "notification_queue_url" {
  description = "SQS Notification Queue URL"
  value       = module.messaging.notification_queue_url
}

output "ecr_repository_urls" {
  description = "ECR Repository URLs"
  value       = module.ecr.repository_urls
}
