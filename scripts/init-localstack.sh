#!/usr/bin/env bash
set -e

echo "=== Initializing LocalStack AWS Resources for CloudCart ==="

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ENDPOINT="${AWS_ENDPOINT:-http://localhost:4566}"

export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="$AWS_REGION"

# Helper for awscli targeting localstack
awslocal() {
    aws --endpoint-url="$AWS_ENDPOINT" --region="$AWS_REGION" "$@"
}

echo "1. Creating DynamoDB table: cloudcart-users"
awslocal dynamodb create-table \
    --table-name cloudcart-users \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST || true

echo "2. Seeding test user into DynamoDB"
awslocal dynamodb put-item \
    --table-name cloudcart-users \
    --item '{
        "PK": {"S": "USER#user-101"},
        "SK": {"S": "PROFILE"},
        "id": {"S": "user-101"},
        "email": {"S": "alex.cloud@example.com"},
        "fullName": {"S": "Alex Rivera"},
        "shippingAddress": {"S": "42 Cloud Architecture Way, Seattle, WA 98101"},
        "createdAt": {"S": "2026-10-15T00:00:00.000Z"}
    }' || true

echo "3. Creating SNS Topic: cloudcart-order-events"
TOPIC_ARN=$(awslocal sns create-topic --name cloudcart-order-events --query TopicArn --output text)
echo "SNS Topic ARN: $TOPIC_ARN"

echo "4. Creating SQS Dead Letter Queues"
awslocal sqs create-queue --queue-name cloudcart-inventory-dlq || true
INVENTORY_DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url "$AWS_ENDPOINT/000000000000/cloudcart-inventory-dlq" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

awslocal sqs create-queue --queue-name cloudcart-notification-dlq || true
NOTIF_DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url "$AWS_ENDPOINT/000000000000/cloudcart-notification-dlq" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

echo "5. Creating SQS Queues with Redrive Policy (DLQ attached)"
INVENTORY_REDRIVE_POLICY="{\"deadLetterTargetArn\":\"$INVENTORY_DLQ_ARN\",\"maxReceiveCount\":\"3\"}"
awslocal sqs create-queue \
    --queue-name cloudcart-inventory-queue \
    --attributes "{\"RedrivePolicy\":$(echo $INVENTORY_REDRIVE_POLICY | jq -R .)}" || true

NOTIF_REDRIVE_POLICY="{\"deadLetterTargetArn\":\"$NOTIF_DLQ_ARN\",\"maxReceiveCount\":\"3\"}"
awslocal sqs create-queue \
    --queue-name cloudcart-notification-queue \
    --attributes "{\"RedrivePolicy\":$(echo $NOTIF_REDRIVE_POLICY | jq -R .)}" || true

INVENTORY_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url "$AWS_ENDPOINT/000000000000/cloudcart-inventory-queue" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
NOTIF_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url "$AWS_ENDPOINT/000000000000/cloudcart-notification-queue" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

echo "6. Subscribing SQS queues to SNS topic"
awslocal sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol sqs \
    --notification-endpoint "$INVENTORY_QUEUE_ARN" || true

awslocal sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol sqs \
    --notification-endpoint "$NOTIF_QUEUE_ARN" || true

echo "=== LocalStack Initialization Completed Successfully ==="
