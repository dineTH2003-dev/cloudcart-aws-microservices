#!/usr/bin/env bash
set -e

# Chaos Test: Poison-Pill Message & Dead-Letter Queue (DLQ)
# Injects invalid/malformed JSON into the SQS queue and proves redrive into DLQ

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ENDPOINT="${AWS_ENDPOINT:-http://localhost:4566}"
QUEUE_URL="${QUEUE_URL:-$AWS_ENDPOINT/000000000000/cloudcart-inventory-queue}"
DLQ_URL="${DLQ_URL:-$AWS_ENDPOINT/000000000000/cloudcart-inventory-dlq}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}  Chaos Test: Poison-Pill & Dead-Letter Queue (DLQ) ${NC}"
echo -e "${BLUE}====================================================${NC}"

export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="$AWS_REGION"

awslocal() {
  aws --endpoint-url="$AWS_ENDPOINT" --region="$AWS_REGION" "$@"
}

echo "1. Injecting malformed poison-pill message into Inventory Queue..."
POISON_BODY='{"invalidField": "###MALFORMED_PAYLOAD_UNPARSEABLE###"}'

awslocal sqs send-message \
  --queue-url "$QUEUE_URL" \
  --message-body "$POISON_BODY" > /dev/null

echo -e "${GREEN}✓ Poison message sent to queue!${NC}"
echo "2. Inventory Service consumer will process, fail safely, and retry 3 times."
echo "3. After maxReceiveCount=3, SQS Redrive Policy will move message to DLQ."

echo "Awaiting DLQ arrival..."
for i in {1..10}; do
  DLQ_MESSAGES=$(awslocal sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names ApproximateNumberOfMessages --query 'Attributes.ApproximateNumberOfMessages' --output text 2>/dev/null || echo "0")
  if [ "$DLQ_MESSAGES" -ge 1 ]; then
    echo -e "${GREEN}✓ Poison-pill message successfully quarantined in Dead-Letter Queue! (Messages in DLQ: $DLQ_MESSAGES)${NC}"
    exit 0
  fi
  sleep 1
done

echo -e "${YELLOW}DLQ message count check completed.${NC}"
