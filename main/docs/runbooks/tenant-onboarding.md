# Tenant Onboarding Runbook

## Shared Environment (Multi-tenant)

### 1. Create tenant record

```sql
INSERT INTO tenants (name, slug, plan, status, created_at)
VALUES ('Restaurant Chain X', 'restaurant-chain-x', 'enterprise', 'active', NOW());
```

### 2. Create admin user

```sql
INSERT INTO users (tenant_id, email, name, role, created_at)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'restaurant-chain-x'),
  'admin@restaurant-chain-x.com',
  'Admin User',
  'tenant_admin',
  NOW()
);
```

### 3. Configure POS integration

1. Obtain POS API credentials from customer
2. Store in Secrets Manager:
   ```bash
   aws secretsmanager create-secret \
     --name "aentro-prod/tenants/restaurant-chain-x/pos-credentials" \
     --secret-string '{"api_key":"...","endpoint":"..."}'
   ```
3. Create integration config via admin API:
   ```bash
   curl -X POST https://api.aentro.io/admin/integrations \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"tenant_id":"<id>","type":"pos","provider":"smaregi","config_secret":"aentro-prod/tenants/restaurant-chain-x/pos-credentials"}'
   ```

### 4. Initial data ingestion

```bash
curl -X POST https://api.aentro.io/admin/ingestion/trigger \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"tenant_id":"<id>","type":"full_sync"}'
```

### 5. Verify

- [ ] Tenant can log in
- [ ] Dashboard loads with data
- [ ] POS data flowing
- [ ] AI features responding

## Dedicated Environment

### 1. Provision infrastructure

```bash
cd infra/environments/prod-dedicated
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with tenant-specific values
terraform init
terraform plan
terraform apply
```

### 2. Deploy application

```bash
# Use same container images as shared environment
aws ecs update-service --cluster aentro-<tenant-slug> --service aentro-<tenant-slug>-backend --force-new-deployment
aws ecs update-service --cluster aentro-<tenant-slug> --service aentro-<tenant-slug>-frontend --force-new-deployment
```

### 3. Run database migrations

```bash
aws ecs run-task \
  --cluster aentro-<tenant-slug> \
  --task-definition aentro-<tenant-slug>-migration \
  --launch-type FARGATE \
  --network-configuration "..." \
  --overrides '{"containerOverrides":[{"name":"migration","command":["alembic","upgrade","head"]}]}'
```

### 4. Configure DNS

Add CNAME record: `<tenant-slug>.aentro.io → <ALB DNS name>`

### 5. Handoff checklist

- [ ] Infrastructure provisioned and healthy
- [ ] Application deployed and accessible
- [ ] Admin user created and credentials sent securely
- [ ] POS integration configured and tested
- [ ] Initial data sync complete
- [ ] Monitoring and alerts configured
- [ ] Customer success team notified
