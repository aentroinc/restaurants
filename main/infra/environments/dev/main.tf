terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "aentro-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "aentro-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = "ap-northeast-1"

  default_tags {
    tags = {
      Project     = "aentro"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  env = "dev"
}

module "network" {
  source = "../../modules/network"
  env    = local.env
}

module "database" {
  source          = "../../modules/database"
  env             = local.env
  db_sg_id        = module.network.db_sg_id
  data_subnet_ids = module.network.data_subnet_ids
  instance_class  = "db.t4g.medium"
}

module "storage" {
  source = "../../modules/storage"
  env    = local.env
}

module "secrets" {
  source     = "../../modules/secrets"
  env        = local.env
  kms_key_id = module.storage.kms_key_id
}

module "compute" {
  source             = "../../modules/compute"
  env                = local.env
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  public_subnet_ids  = module.network.public_subnet_ids
  app_sg_id          = module.network.app_sg_id
  alb_sg_id          = module.network.alb_sg_id
  backend_image      = "aentro/backend:dev"
  frontend_image     = "aentro/frontend:dev"
  backend_cpu        = 256
  backend_memory     = 512
  frontend_cpu       = 256
  frontend_memory    = 512
}

module "observability" {
  source           = "../../modules/observability"
  env              = local.env
  ecs_cluster_name = "aentro-${local.env}"
}
