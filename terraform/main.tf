terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ---- Variables ----
variable "aws_region" {
  default = "ap-south-1"
}

variable "db_password" {
  description = "RDS master password"
  sensitive   = true
}

variable "admin_password" {
  description = "App admin password"
  sensitive   = true
}

variable "s3_bucket_name" {
  description = "S3 bucket name for images"
}

# ---- VPC (use the default AWS VPC to keep it simple) ----
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ---- Security Group for EC2 ----
resource "aws_security_group" "app_sg" {
  name        = "memory-gallery-app-sg"
  description = "Allow HTTP and SSH traffic to the app"
  vpc_id      = data.aws_vpc.default.id

  # Allow HTTP from anywhere
  ingress {
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow SSH for debugging (restrict to your IP in production)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic (needed for pulling Docker image, talking to RDS/S3)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---- Security Group for RDS ----
resource "aws_security_group" "rds_sg" {
  name        = "memory-gallery-rds-sg"
  description = "Allow PostgreSQL traffic only from the app EC2"
  vpc_id      = data.aws_vpc.default.id

  # Only accept connections from the app security group
  # This is least privilege applied at the network level —
  # nothing outside the app can reach the database at all
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---- RDS PostgreSQL ----
resource "aws_db_subnet_group" "default" {
  name       = "memory-gallery-subnet-group"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_db_instance" "postgres" {
  identifier        = "memory-gallery-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"  # Free tier eligible
  allocated_storage = 20

  db_name  = "memorygallery"
  username = "postgres"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  # Free tier — single AZ, no redundancy
  multi_az            = false
  publicly_accessible = false  # Only reachable from inside the VPC

  # Skip final snapshot on destroy (for learning — in production you'd keep this)
  skip_final_snapshot = true

  tags = {
    Name = "memory-gallery-db"
  }
}

# ---- IAM Role for EC2 (least privilege) ----
# This role is attached to the EC2 instance so it can access
# S3 WITHOUT needing AWS credentials in env vars — the SDK
# picks up credentials automatically from instance metadata
resource "aws_iam_role" "ec2_role" {
  name = "memory-gallery-ec2-role"

  # Trust policy: allows EC2 service to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy: ONLY the permissions the app actually needs
# Justification for each permission:
# s3:PutObject — upload new photos
# s3:GetObject — serve photos (though they're public, the app may read them directly)
# s3:DeleteObject — delete photos from the admin panel
# All scoped to this specific bucket only — not s3:* on all buckets
resource "aws_iam_role_policy" "ec2_s3_policy" {
  name = "memory-gallery-s3-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        # Scoped to this bucket only — not arn:aws:s3:::*
        Resource = "arn:aws:s3:::${var.s3_bucket_name}/*"
      },
      {
        # Allow listing the bucket (needed to check if a key exists)
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::${var.s3_bucket_name}"
      }
    ]
  })
}

# Instance profile wraps the IAM role so it can be attached to EC2
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "memory-gallery-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# ---- EC2 Instance ----
# Get the latest Amazon Linux 2023 AMI automatically
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t2.micro"  # Free tier eligible
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  # User data script runs once when the instance first boots
  # Installs Docker, pulls your image from GHCR, and starts the app
  user_data = <<-EOF
    #!/bin/bash
    # Install Docker
    dnf update -y
    dnf install -y docker
    systemctl start docker
    systemctl enable docker

    # Pull and run the app container from GHCR
    docker pull ghcr.io/preethz2567/memory-gallery:latest
    docker run -d \
      --name memory-gallery \
      --restart unless-stopped \
      -p 4000:4000 \
      -e NODE_ENV=production \
      -e ADMIN_PASSWORD=${var.admin_password} \
      -e AWS_REGION=${var.aws_region} \
      -e S3_BUCKET_NAME=${var.s3_bucket_name} \
      -e DB_HOST=${aws_db_instance.postgres.address} \
      -e DB_PORT=5432 \
      -e DB_NAME=memorygallery \
      -e DB_USER=postgres \
      -e DB_PASSWORD=${var.db_password} \
      ghcr.io/preethz2567/memory-gallery:latest
  EOF

  tags = {
    Name = "memory-gallery-app"
  }
}