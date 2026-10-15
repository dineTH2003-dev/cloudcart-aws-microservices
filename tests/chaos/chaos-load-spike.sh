#!/usr/bin/env bash
set -e

# Chaos Test: Flash Sale Load Spike & HPA Autoscaling
# Generates high concurrent load against Product Service to trigger HPA scaling

TARGET_URL="${TARGET_URL:-http://localhost:8001/api/products}"
CONCURRENCY="${CONCURRENCY:-20}"
REQUESTS="${REQUESTS:-500}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}  Chaos Test: Traffic Spike & Auto-Scaling (HPA)    ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo "Sending $REQUESTS requests to $TARGET_URL (Concurrency: $CONCURRENCY)..."

# Run concurrent traffic test using ApacheBench or curl loop
if command -v ab >/dev/null 2>&1; then
  ab -n "$REQUESTS" -c "$CONCURRENCY" "$TARGET_URL"
else
  echo "Using parallel curl workers..."
  seq "$REQUESTS" | xargs -n 1 -P "$CONCURRENCY" curl -s -o /dev/null -w "%{http_code}\n" "$TARGET_URL" | grep -c "200" || true
fi

echo -e "${GREEN}✓ Traffic burst executed successfully!${NC}"
echo "Check HPA status with: kubectl get hpa -n cloudcart"
