#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  Connecting Local Browser to Live Amazon EKS Cluster ${NC}"
echo -e "${BLUE}======================================================${NC}"

# Ensure local docker containers aren't occupying ports
if docker ps --format '{{.Names}}' | grep -q 'cloudcart-frontend'; then
  echo -e "${YELLOW}Stopping local Docker compose stack to free ports...${NC}"
  docker compose stop > /dev/null 2>&1 || true
fi

echo -e "${GREEN}Starting background port-forwards to EKS Services in 'cloudcart' namespace...${NC}"

kubectl port-forward -n cloudcart svc/frontend 3001:80 > /dev/null 2>&1 &
PID_FE=$!
kubectl port-forward -n cloudcart svc/product-service 8001:8001 > /dev/null 2>&1 &
PID_PROD=$!
kubectl port-forward -n cloudcart svc/user-service 8002:8002 > /dev/null 2>&1 &
PID_USER=$!
kubectl port-forward -n cloudcart svc/order-service 8003:8003 > /dev/null 2>&1 &
PID_ORDER=$!
kubectl port-forward -n cloudcart svc/inventory-service 8004:8004 > /dev/null 2>&1 &
PID_INV=$!
kubectl port-forward -n cloudcart svc/notification-service 8005:8005 > /dev/null 2>&1 &
PID_NOTIF=$!
kubectl port-forward -n cloudcart svc/payment-service 8006:8006 > /dev/null 2>&1 &
PID_PAY=$!

trap "echo -e '\nStopping EKS port-forwards...'; kill $PID_FE $PID_PROD $PID_USER $PID_ORDER $PID_INV $PID_NOTIF $PID_PAY 2>/dev/null || true; exit 0" SIGINT SIGTERM EXIT

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}  ✓ Connected to Live Amazon EKS (account2: 265283365424)! ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "👉 Open in your web browser: ${BLUE}http://localhost:3001${NC}"
echo -e "• Frontend:     http://localhost:3001 (React Web App on EKS)"
echo -e "• Products:     http://localhost:8001/api/products (RDS PostgreSQL)"
echo -e "• Users:        http://localhost:8002/api/users (DynamoDB)"
echo -e "• Orders:       http://localhost:8003/api/orders (SNS Publisher)"
echo -e "• Payments:     http://localhost:8006/healthz (DynamoDB + SNS)"
echo -e "• Inventory:    http://localhost:8004/healthz (SQS Consumer)"
echo -e "• Notification: http://localhost:8005/healthz (SQS Consumer)"
echo -e "\nPress [Ctrl+C] in this terminal when finished to disconnect."

wait
