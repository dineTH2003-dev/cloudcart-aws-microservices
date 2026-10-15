# RDS Subnet Group
resource "aws_db_subnet_group" "rds" {
  name       = "${var.name_prefix}-rds-subnet-group-${var.environment}"
  subnet_ids = var.database_subnet_ids

  tags = {
    Name        = "${var.name_prefix}-rds-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds-sg-${var.environment}"
  description = "Controls traffic to CloudCart RDS PostgreSQL instance"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow inbound PostgreSQL from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.eks_nodes_security_group_id != "" ? [var.eks_nodes_security_group_id] : null
    cidr_blocks     = var.eks_nodes_security_group_id == "" ? ["10.0.0.0/16"] : null
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.name_prefix}-rds-sg-${var.environment}"
    Environment = var.environment
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier        = "${var.name_prefix}-postgres-${var.environment}"
  engine            = "postgres"
  engine_version    = "16.3"
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = false
  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name        = "${var.name_prefix}-postgres-${var.environment}"
    Environment = var.environment
  }
}
