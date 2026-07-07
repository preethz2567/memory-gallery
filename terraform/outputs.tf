output "app_public_ip" {
  description = "Public IP of the EC2 instance — visit http://<this-ip>:4000"
  value       = aws_instance.app.public_ip
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.address
  sensitive   = true
}

output "app_url" {
  description = "Your live app URL"
  value       = "http://${aws_instance.app.public_ip}:4000"
}