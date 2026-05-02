variable "project" {
  default = "aentro"
}

variable "env" {
  type = string
}

locals {
  name = "${var.project}-${var.env}"
}

# --- KMS Key ---
resource "aws_kms_key" "main" {
  description             = "${local.name} encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${local.name}"
  target_key_id = aws_kms_key.main.key_id
}

# --- Uploads Bucket ---
resource "aws_s3_bucket" "uploads" {
  bucket = "${local.name}-uploads"

  tags = {
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

# --- Backups Bucket ---
resource "aws_s3_bucket" "backups" {
  bucket = "${local.name}-backups"

  tags = {
    Environment = var.env
    Project     = var.project
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "archive"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# --- Outputs ---
output "uploads_bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}

output "backups_bucket_arn" {
  value = aws_s3_bucket.backups.arn
}

output "kms_key_arn" {
  value = aws_kms_key.main.arn
}

output "kms_key_id" {
  value = aws_kms_key.main.key_id
}
