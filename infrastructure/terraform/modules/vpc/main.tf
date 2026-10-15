# VPC Module for CloudCart
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.name_prefix}-vpc-${var.environment}"
    Environment = var.environment
  }
}

# Internet Gateway for Public Subnets
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.name_prefix}-igw-${var.environment}"
    Environment = var.environment
  }
}

# Public Subnets (For ALB and NAT Gateway)
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                           = "${var.name_prefix}-public-${var.availability_zones[count.index]}"
    Environment                                    = var.environment
    "kubernetes.io/role/elb"                       = "1"
    "kubernetes.io/cluster/${var.cluster_name}"    = "shared"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "${var.name_prefix}-nat-eip-${var.environment}"
    Environment = var.environment
  }
}

# Single NAT Gateway for cost-effective dev environment
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "${var.name_prefix}-nat-${var.environment}"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.igw]
}

# Private Application Subnets (For EKS Worker Nodes)
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name                                           = "${var.name_prefix}-private-app-${var.availability_zones[count.index]}"
    Environment                                    = var.environment
    "kubernetes.io/role/internal-elb"              = "1"
    "kubernetes.io/cluster/${var.cluster_name}"    = "shared"
  }
}

# Private Database Subnets (Isolated for RDS)
resource "aws_subnet" "database" {
  count             = length(var.database_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.name_prefix}-private-db-${var.availability_zones[count.index]}"
    Environment = var.environment
  }
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name        = "${var.name_prefix}-public-rt-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Table for Private Subnets (Routes out via NAT Gateway)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name        = "${var.name_prefix}-private-rt-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# Route Table for Database Subnets (Isolated, no internet egress)
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.name_prefix}-database-rt-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "database" {
  count          = length(aws_subnet.database)
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}
