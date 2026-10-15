#!/usr/bin/env bash
set -e

echo "=== Initializing LocalStack AWS Resources for CloudCart ==="

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ENDPOINT="${AWS_ENDPOINT:-http://localhost:4566}"

export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="$AWS_REGION"

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
awslocal sqs create-queue --queue-name cloudcart-notification-dlq || true

echo "5. Creating SQS Queues"
awslocal sqs create-queue --queue-name cloudcart-inventory-queue || true
awslocal sqs create-queue --queue-name cloudcart-notification-queue || true

echo "6. Subscribing SQS queues to SNS topic"
awslocal sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol sqs \
    --notification-endpoint "arn:aws:sqs:$AWS_REGION:000000000000:cloudcart-inventory-queue" || true

awslocal sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol sqs \
    --notification-endpoint "arn:aws:sqs:$AWS_REGION:000000000000:cloudcart-notification-queue" || true

echo "=== LocalStack Initialization Completed Successfully ==="
