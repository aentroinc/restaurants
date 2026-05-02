terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    # Configure via -backend-config="..."
    key = "aentro/dev/terraform.tfstate"
  }
}

variable "aws_region"  { type = string, default = "ap-northeast-1" }
variable "customer_id" { type = string, default = "dev" }

provider "aws" {
  region = var.aws_region
}

module "network" {
  source = "../../modules/network"
  name   = "aentro-${var.customer_id}-dev"
}

module "database" {
  source                  = "../../modules/database"
  name                    = "aentro-${var.customer_id}-dev"
  subnet_ids              = module.network.data_subnet_ids
  vpc_security_group_ids  = [module.network.app_sg_id]
  instance_class          = "db.t4g.medium"
}

output "db_endpoint" { value = module.database.endpoint }
output "vpc_id"      { value = module.network.vpc_id }
