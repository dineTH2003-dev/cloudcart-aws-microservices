output "endpoint" {
  description = "The connection endpoint of the RDS PostgreSQL instance"
  value       = aws_db_instance.postgres.endpoint
}

output "address" {
  description = "The hostname address of the RDS PostgreSQL instance"
  value       = aws_db_instance.postgres.address
}

output "port" {
  description = "The database port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "The database name"
  value       = aws_db_instance.postgres.db_name
}

output "security_group_id" {
  description = "The security group ID of the RDS instance"
  value       = aws_security_group.rds.id
}
