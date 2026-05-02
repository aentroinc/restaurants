variable "project" {
  default = "aentro"
}

variable "env" {
  type = string
}

variable "db_sg_id" {
  type = string
}

variable "data_subnet_ids" {
  type = list(string)
}

variable "instance_class" {
  default = "db.r6g.large"
}

locals {
  name = "${var.project}-${var.env}"
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db"
  subnet_ids = var.data_subnet_ids
  tags       = { Name = local.name }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier          = local.name
  engine                      = "aurora-postgresql"
  engine_version              = "16.1"
  database_name               = "restaurant_os"
  master_username             = "aentro"
  manage_master_user_password = true
  vpc_security_group_ids      = [var.db_sg_id]
  db_subnet_group_name        = aws_db_subnet_group.main.name
  backup_retention_period     = 7
  preferred_backup_window     = "03:00-04:00"
  deletion_protection         = var.env == "prod" ? true : false
  storage_encrypted           = true
  copy_tags_to_snapshot       = true
  skip_final_snapshot         = var.env != "prod"
  final_snapshot_identifier   = var.env == "prod" ? "${local.name}-final" : null

  tags = {
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_rds_cluster_instance" "main" {
  count              = var.env == "prod" ? 2 : 1
  identifier         = "${local.name}-${count.index}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = var.instance_class
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  tags = {
    Environment = var.env
    Project     = var.project
  }
}

output "cluster_endpoint" {
  value = aws_rds_cluster.main.endpoint
}

output "cluster_reader_endpoint" {
  value = aws_rds_cluster.main.reader_endpoint
}

output "cluster_id" {
  value = aws_rds_cluster.main.id
}
