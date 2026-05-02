# Secret Rotation Runbook

## Secrets Inventory

| Secret | Location | Rotation Frequency |
|--------|----------|-------------------|
| Database password | AWS Secrets Manager (auto-managed by RDS) | 90 days (automatic) |
| JWT_SECRET_KEY | AWS Secrets Manager `aentro-<env>/jwt-secret` | 90 days |
| ANTHROPIC_API_KEY | AWS Secrets Manager `aentro-<env>/anthropic-api-key` | On compromise |
| INGESTION_MASTER_KEY | AWS Secrets Manager `aentro-<env>/ingestion-master-key` | 90 days |

## JWT Secret Rotation

JWT rotation requires a grace period to avoid invalidating active sessions.

1. Generate new secret:
   ```bash
   NEW_SECRET=$(openssl rand -base64 32)
   ```

2. Update in Secrets Manager:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id aentro-prod/jwt-secret \
     --secret-string "$NEW_SECRET"
   ```

3. Deploy backend (it reads secret on startup):
   ```bash
   aws ecs update-service --cluster aentro-prod --service aentro-prod-backend --force-new-deployment
   ```

4. Note: Active sessions signed with the old key will fail. Schedule during low-traffic.

## API Key Rotation (Anthropic)

1. Generate new key in Anthropic Console
2. Update Secrets Manager:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id aentro-prod/anthropic-api-key \
     --secret-string "sk-ant-..."
   ```
3. Redeploy backend
4. Revoke old key in Anthropic Console after confirming new key works

## Ingestion Master Key Rotation

1. Generate new key:
   ```bash
   NEW_KEY=$(openssl rand -hex 32)
   ```
2. Update Secrets Manager
3. Redeploy backend
4. Update all POS integration configs that use this key

## Database Password

Aurora with `manage_master_user_password = true` handles rotation automatically via Secrets Manager. No manual action needed.

To force rotation:
```bash
aws secretsmanager rotate-secret --secret-id rds!cluster-<cluster-resource-id>
```

## Emergency: Compromised Secret

1. Rotate immediately using steps above
2. Force redeploy all services
3. Check CloudTrail for unauthorized access
4. Review access logs for the compromised time window
5. File incident report (see `incident-response.md`)
