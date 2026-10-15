output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private application subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of the private database subnets"
  value       = aws_subnet.database[*].id
}

output "nat_gateway_id" {
  description = "ID of the NAT gateway"
  value       = aws_nat_gateway.nat.id
}
