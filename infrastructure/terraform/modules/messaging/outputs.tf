output "order_topic_arn" {
  description = "ARN of the SNS topic for order events"
  value       = aws_sns_topic.order_events.arn
}

output "inventory_queue_url" {
  description = "URL of the inventory SQS queue"
  value       = aws_sqs_queue.inventory_queue.id
}

output "inventory_queue_arn" {
  description = "ARN of the inventory SQS queue"
  value       = aws_sqs_queue.inventory_queue.arn
}

output "notification_queue_url" {
  description = "URL of the notification SQS queue"
  value       = aws_sqs_queue.notification_queue.id
}

output "notification_queue_arn" {
  description = "ARN of the notification SQS queue"
  value       = aws_sqs_queue.notification_queue.arn
}
