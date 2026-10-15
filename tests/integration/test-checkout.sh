#!/usr/bin/env bash
set -e

# CloudCart End-to-End Microservices Integration Test
# Validates synchronous REST APIs and asynchronous SNS -> SQS event flow

PRODUCT_URL="${PRODUCT_URL:-http://localhost:8001}"
USER_URL="${USER_URL:-http://localhost:8002}"
ORDER_URL="${ORDER_URL:-http://localhost:8003}"
INVENTORY_URL="${INVENTORY_URL:-http://localhost:8004}"
NOTIF_URL="${NOTIF_URL:-http://localhost:8005}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  Running CloudCart Microservices Integration Tests   ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Health Checks
echo -e "\n${YELLOW}[Step 1/6] Verifying Microservice Health Endpoints...${NC}"
for svc in "$PRODUCT_URL" "$USER_URL" "$ORDER_URL" "$INVENTORY_URL" "$NOTIF_URL"; do
  echo -n "Checking $svc/healthz ... "
  status=$(curl -s -o /dev/null -w "%{http_code}" "$svc/healthz" || echo "failed")
  if [ "$status" != "200" ]; then
    echo -e "${RED}FAILED (HTTP $status)${NC}"
    exit 1
  fi
  echo -e "${GREEN}HEALTHY (200 OK)${NC}"
done

# 2. Query initial stock
echo -e "\n${YELLOW}[Step 2/6] Querying initial product stock from Product Service...${NC}"
INITIAL_STOCK=$(curl -s "$PRODUCT_URL/api/products/prod-101" | jq -r '.stock_quantity')
echo -e "Initial stock for prod-101: ${GREEN}${INITIAL_STOCK}${NC}"

if [ -z "$INITIAL_STOCK" ] || [ "$INITIAL_STOCK" -le 0 ]; then
  echo -e "${RED}Error: prod-101 has insufficient stock to test!${NC}"
  exit 1
fi

# 3. Register or Fetch User
echo -e "\n${YELLOW}[Step 3/6] Fetching / registering test user in User Service (DynamoDB)...${NC}"
USER_ID="user-101"
USER_CHECK=$(curl -s "$USER_URL/api/users/$USER_ID" | jq -r '.id')
if [ "$USER_CHECK" != "$USER_ID" ]; then
  echo "Registering user-101..."
  curl -s -X POST "$USER_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test.user@cloudcart.internal",
      "fullName": "Test Automation User",
      "shippingAddress": "100 Serverless St, Cloud City"
    }' > /dev/null
fi
echo -e "User verified: ${GREEN}${USER_ID}${NC}"

# 4. Create Order
echo -e "\n${YELLOW}[Step 4/6] Creating order in Order Service (PostgreSQL + SNS)...${NC}"
ORDER_PAYLOAD='{
  "userId": "user-101",
  "items": [
    {
      "productId": "prod-101",
      "productName": "Cloud Practitioner Laptop Sleeve",
      "quantity": 2,
      "unitPriceCents": 2999
    }
  ],
  "shippingAddress": "100 Serverless St, Cloud City"
}'

ORDER_RES=$(curl -s -X POST "$ORDER_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d "$ORDER_PAYLOAD")

ORDER_ID=$(echo "$ORDER_RES" | jq -r '.id')
ORDER_STATUS=$(echo "$ORDER_RES" | jq -r '.status')

echo -e "Order created: ${GREEN}${ORDER_ID}${NC} (Status: ${YELLOW}${ORDER_STATUS}${NC})"
if [ "$ORDER_STATUS" != "PENDING" ]; then
  echo -e "${RED}Order initial status was expected to be PENDING! Got: $ORDER_STATUS${NC}"
  exit 1
fi

# 5. Poll for Asynchronous Inventory Stock Reservation
echo -e "\n${YELLOW}[Step 5/6] Awaiting SNS -> SQS -> Inventory Service stock reservation...${NC}"
CONFIRMED=false
for i in {1..15}; do
  CURRENT_STATUS=$(curl -s "$ORDER_URL/api/orders/$ORDER_ID" | jq -r '.status')
  if [ "$CURRENT_STATUS" == "CONFIRMED" ]; then
    CONFIRMED=true
    echo -e "Order #${ORDER_ID} transitioned to: ${GREEN}CONFIRMED${NC} in ${i}s"
    break
  fi
  sleep 1
done

if [ "$CONFIRMED" != "true" ]; then
  echo -e "${RED}Order status did not transition to CONFIRMED within timeout! Last status: $CURRENT_STATUS${NC}"
  exit 1
fi

# Verify stock reduction
UPDATED_STOCK=$(curl -s "$PRODUCT_URL/api/products/prod-101" | jq -r '.stock_quantity')
EXPECTED_STOCK=$((INITIAL_STOCK - 2))
echo -e "Updated stock for prod-101: ${GREEN}${UPDATED_STOCK}${NC} (Expected: ${EXPECTED_STOCK})"
if [ "$UPDATED_STOCK" -ne "$EXPECTED_STOCK" ]; then
  echo -e "${RED}Stock reduction mismatch! Expected: $EXPECTED_STOCK, Got: $UPDATED_STOCK${NC}"
  exit 1
fi

# 6. Verify Customer Notification Dispatch
echo -e "\n${YELLOW}[Step 6/6] Verifying SQS consumer in Notification Service...${NC}"
NOTIF_DISPATCHED=false
for i in {1..10}; do
  NOTIF_COUNT=$(curl -s "$NOTIF_URL/api/notifications?orderId=$ORDER_ID" | jq -r '.count')
  if [ "$NOTIF_COUNT" -gt 0 ]; then
    NOTIF_DISPATCHED=true
    NOTIF_SUBJECT=$(curl -s "$NOTIF_URL/api/notifications?orderId=$ORDER_ID" | jq -r '.notifications[0].subject')
    echo -e "Notification captured: ${GREEN}${NOTIF_SUBJECT}${NC}"
    break
  fi
  sleep 1
done

if [ "$NOTIF_DISPATCHED" != "true" ]; then
  echo -e "${RED}Customer notification for order ${ORDER_ID} was not received by Notification Service!${NC}"
  exit 1
fi

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}  ✓ ALL CLOUDCART MICROSERVICE TESTS PASSED!          ${NC}"
echo -e "${GREEN}======================================================${NC}"
