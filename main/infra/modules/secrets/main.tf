variable "project" {
  default = "aentro"
}

variable "env" {
  type = string
}

variable "kms_key_id" {
  type = string
}

locals {
  name = "${var.project}-${var.env}"
}

resource "aws_secretsmanager_secret" "database_url" {
  name       = "${local.name}/database-url"
  kms_key_id = var.kms_key_id

  tags = {
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name       = "${local.name}/jwt-secret"
  kms_key_id = var.kms_key_id

  tags = {
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name       = "${local.name}/anthropic-api-key"
  kms_key_id = var.kms_key_id

  tags = {
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_secretsmanager_secret" "ingestion_master_key" {
  name       = "${local.name}/ingestion-master-key"
  kms_key_id = var.kms_key_id

  tags = {
    Environment = var.env
    Project     = var.project
  }
}

output "secret_arns" {
  value = {
    database_url        = aws_secretsmanager_secret.database_url.arn
    jwt_secret          = aws_secretsmanager_secret.jwt_secret.arn
    anthropic_api_key   = aws_secretsmanager_secret.anthropic_api_key.arn
    ingestion_master_key = aws_secretsmanager_secret.ingestion_master_key.arn
  }
}
