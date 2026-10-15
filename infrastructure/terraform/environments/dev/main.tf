terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "account2"

  default_tags {
    tags = {
      Project     = "CloudCart"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}

# 1. Multi-AZ VPC Networking
module "vpc" {
  source       = "../../modules/vpc"
  name_prefix  = var.name_prefix
  environment  = var.environment
  cluster_name = "${var.name_prefix}-eks-${var.environment}"
}

# 2. Amazon ECR Container Repositories
module "ecr" {
  source      = "../../modules/ecr"
  environment = var.environment
}

# 3. Amazon RDS PostgreSQL Database
module "rds" {
  source                      = "../../modules/rds"
  name_prefix                 = var.name_prefix
  environment                 = var.environment
  vpc_id                      = module.vpc.vpc_id
  database_subnet_ids         = module.vpc.database_subnet_ids
  eks_nodes_security_group_id = "" # Will fallback to VPC CIDR ingress
  db_password                 = var.db_password
}

# 4. Amazon DynamoDB Table (Users)
module "dynamodb" {
  source      = "../../modules/dynamodb"
  name_prefix = var.name_prefix
  environment = var.environment
}

# 5. Asynchronous Messaging (Amazon SNS + SQS + DLQs)
module "messaging" {
  source      = "../../modules/messaging"
  name_prefix = var.name_prefix
  environment = var.environment
}

# 6. Amazon EKS Cluster & Managed Node Group
module "eks" {
  source              = "../../modules/eks"
  cluster_name        = "${var.name_prefix}-eks-${var.environment}"
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  public_subnet_ids   = module.vpc.public_subnet_ids
  node_instance_types = ["t3.small"]
}
