# SNS Topic for Order Events
resource "aws_sns_topic" "order_events" {
  name = "${var.name_prefix}-order-events-${var.environment}"

  tags = {
    Name        = "${var.name_prefix}-order-events-${var.environment}"
    Environment = var.environment
  }
}

# -------------------------------------------------------------------
# SQS: Inventory Queue & DLQ
# -------------------------------------------------------------------
resource "aws_sqs_queue" "inventory_dlq" {
  name                      = "${var.name_prefix}-inventory-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name        = "${var.name_prefix}-inventory-dlq-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_sqs_queue" "inventory_queue" {
  name                      = "${var.name_prefix}-inventory-queue-${var.environment}"
  message_retention_seconds = 86400 # 1 day
  receive_wait_time_seconds = 20    # Long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.inventory_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "${var.name_prefix}-inventory-queue-${var.environment}"
    Environment = var.environment
  }
}

# SQS Queue Policy to allow SNS Topic to publish to Inventory Queue
resource "aws_sqs_queue_policy" "inventory_policy" {
  queue_url = aws_sqs_queue.inventory_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSNSPublish"
        Effect    = "Allow"
        Principal = "*"
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.inventory_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.order_events.arn
          }
        }
      }
    ]
  })
}

# SNS to Inventory SQS Subscription
resource "aws_sns_topic_subscription" "inventory_sub" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.inventory_queue.arn
}

# -------------------------------------------------------------------
# SQS: Notification Queue & DLQ
# -------------------------------------------------------------------
resource "aws_sqs_queue" "notification_dlq" {
  name                      = "${var.name_prefix}-notification-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name        = "${var.name_prefix}-notification-dlq-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_sqs_queue" "notification_queue" {
  name                      = "${var.name_prefix}-notification-queue-${var.environment}"
  message_retention_seconds = 86400 # 1 day
  receive_wait_time_seconds = 20    # Long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "${var.name_prefix}-notification-queue-${var.environment}"
    Environment = var.environment
  }
}

# SQS Queue Policy to allow SNS Topic to publish to Notification Queue
resource "aws_sqs_queue_policy" "notification_policy" {
  queue_url = aws_sqs_queue.notification_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSNSPublish"
        Effect    = "Allow"
        Principal = "*"
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.notification_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.order_events.arn
          }
        }
      }
    ]
  })
}

# SNS to Notification SQS Subscription
resource "aws_sns_topic_subscription" "notification_sub" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.notification_queue.arn
}

# ===================================================================
# ShopSphere Payment Events SNS Topic (Phase 3 upgrade)
# ===================================================================
resource "aws_sns_topic" "payment_events" {
  name = "shopsphere-payment-events-${var.environment}"

  tags = {
    Name        = "shopsphere-payment-events-${var.environment}"
    Environment = var.environment
  }
}
