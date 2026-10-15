#!/usr/bin/env bash
set -e

# One-Click Teardown Script for CloudCart AWS Resources
# Destroys all provisioned AWS cloud infrastructure to prevent ongoing cloud charges

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}======================================================${NC}"
echo -e "${RED}  WARNING: Destroying All CloudCart AWS Infrastructure${NC}"
echo -e "${RED}======================================================${NC}"
echo -e "${YELLOW}This will delete the EKS cluster, worker nodes, RDS database, VPC, NAT Gateway, DynamoDB, SNS, and SQS.${NC}"

read -p "Are you sure you want to proceed with destruction? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Destruction cancelled."
  exit 0
fi

cd "$(dirname "$0")/../infrastructure/terraform/environments/dev"

export AWS_PROFILE="${AWS_PROFILE:-account2}"
echo "Running terraform destroy for AWS Profile: $AWS_PROFILE..."
terraform destroy -auto-approve

echo -e "${GREEN}✓ All AWS CloudCart resources destroyed successfully.${NC}"
