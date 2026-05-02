# Infrastructure

```
infra/
├── modules/                    # Reusable Terraform modules
│   ├── network/                # VPC, subnets, NAT, SG
│   ├── database/               # Aurora PostgreSQL + pgvector
│   ├── compute/                # ECS Fargate services
│   ├── storage/                # S3 + KMS
│   ├── secrets/                # Secrets Manager + KMS
│   └── observability/          # OTel collector + log forwarders
├── environments/
│   ├── dev/                    # Multi-tenant shared dev
│   ├── staging/
│   ├── prod-shared/            # Multi-tenant shared production
│   └── prod-dedicated/         # Per-customer dedicated VPC
├── grafana/
│   └── dashboards/             # Dashboard JSON committed alongside infra
└── helm/
    └── aentro/                 # Helm chart for k8s-preferring customers
```

## Quick start (dev)

```bash
cd infra/environments/dev
terraform init
terraform apply -var="customer_id=acme" -var="aws_region=ap-northeast-1"
```

Expected apply time: ~15-20 min for cold env.

## Quick start (Helm dry-run)

```bash
helm install aentro infra/helm/aentro --dry-run --debug
```
