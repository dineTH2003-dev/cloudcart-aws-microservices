#!/usr/bin/env bash
set -e

# CloudCart EKS & ECR Deployment Automation Script
# Connects to the Terraform-provisioned EKS cluster, pushes images to ECR, and deploys manifests

export AWS_PROFILE="${AWS_PROFILE:-account2}"
export DOCKER_HOST="${DOCKER_HOST:-unix://${HOME}/.docker/desktop/docker.sock}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-cloudcart-eks-dev}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  Deploying CloudCart to Live Amazon EKS & ECR        ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Fetch AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "ECR Registry: $ECR_REGISTRY"

# 2. Update Kubeconfig
echo -e "\n${YELLOW}[Step 1/4] Updating kubeconfig for EKS cluster: ${CLUSTER_NAME}...${NC}"
aws eks update-kubeconfig --profile "$AWS_PROFILE" --region "$AWS_REGION" --name "$CLUSTER_NAME"
kubectl get nodes

# 3. Log in to Amazon ECR
echo -e "\n${YELLOW}[Step 2/4] Authenticating Docker with Amazon ECR...${NC}"
DOCKER_CONFIG_DIR="/tmp/cloudcart-docker"
mkdir -p "$DOCKER_CONFIG_DIR"
echo '{}' > "$DOCKER_CONFIG_DIR/config.json"
aws ecr get-login-password --profile "$AWS_PROFILE" --region "$AWS_REGION" | docker --config "$DOCKER_CONFIG_DIR" login --username AWS --password-stdin "$ECR_REGISTRY"

# 4. Tag and Push Container Images to ECR
echo -e "\n${YELLOW}[Step 3/4] Tagging and pushing images to ECR...${NC}"
SERVICES=(
  "product-service:cloudcart/product-service"
  "user-service:cloudcart/user-service"
  "order-service:cloudcart/order-service"
  "inventory-service:cloudcart/inventory-service"
  "notification-service:cloudcart/notification-service"
  "frontend:cloudcart/frontend"
)

for entry in "${SERVICES[@]}"; do
  local_name="${entry%%:*}"
  ecr_repo="${entry##*:}"
  
  local_tag="cloudcart-aws-microservices-${local_name}:latest"
  remote_tag="${ECR_REGISTRY}/${ecr_repo}:latest"
  
  echo "Pushing $local_tag -> $remote_tag"
  docker tag "$local_tag" "$remote_tag"
  docker --config "$DOCKER_CONFIG_DIR" push "$remote_tag"
done

# 5. Deploy to EKS with Kustomize
echo -e "\n${YELLOW}[Step 4/4] Applying Kubernetes manifests to EKS...${NC}"
kubectl apply -k kubernetes/base

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}  ✓ CloudCart Deployed Successfully to Amazon EKS!    ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo "Check pods with: kubectl get pods -n cloudcart -o wide"
echo "Check ingress with: kubectl get ingress -n cloudcart"
