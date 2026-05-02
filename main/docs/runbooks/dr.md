# Disaster Recovery Runbook

## Recovery Objectives

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | 4 hours |
| RPO (Recovery Point Objective) | 1 hour |

## Backup Strategy

- **Aurora PostgreSQL**: PITR with 7-day retention, daily snapshots retained 30 days
- **S3 uploads**: Versioned, cross-region replication (ap-northeast-1 → ap-northeast-3)
- **S3 backups**: Lifecycle policy (30d → IA, 90d → Glacier, 365d → delete)

## Scenario 1: Single AZ Failure

Aurora and ECS Fargate handle this automatically via multi-AZ deployment. No manual action needed.

Verify:
```bash
aws ecs describe-services --cluster aentro-prod --services aentro-prod-backend \
  --query 'services[0].{desired:desiredCount,running:runningCount}'
```

## Scenario 2: RDS Failover

### Automatic failover (< 60 seconds)
Aurora handles automatic failover to read replica. Monitor:
```bash
aws rds describe-db-clusters --db-cluster-identifier aentro-prod \
  --query 'DBClusters[0].{Status:Status,Endpoint:Endpoint}'
```

### Manual failover
```bash
aws rds failover-db-cluster --db-cluster-identifier aentro-prod
```

## Scenario 3: Restore from Snapshot

1. Identify target snapshot:
   ```bash
   aws rds describe-db-cluster-snapshots \
     --db-cluster-identifier aentro-prod \
     --query 'DBClusterSnapshots[*].{ID:DBClusterSnapshotIdentifier,Time:SnapshotCreateTime}' \
     --output table
   ```

2. Restore cluster from snapshot:
   ```bash
   aws rds restore-db-cluster-from-snapshot \
     --db-cluster-identifier aentro-prod-restored \
     --snapshot-identifier <snapshot-id> \
     --engine aurora-postgresql \
     --vpc-security-group-ids <db-sg-id> \
     --db-subnet-group-name aentro-prod-db
   ```

3. Create instance in restored cluster:
   ```bash
   aws rds create-db-cluster-instance \
     --db-cluster-identifier aentro-prod-restored \
     --db-instance-identifier aentro-prod-restored-0 \
     --db-instance-class db.r6g.large \
     --engine aurora-postgresql
   ```

4. Update application config to point to new endpoint
5. Verify data integrity

## Scenario 4: Point-in-Time Recovery

```bash
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier aentro-prod \
  --db-cluster-identifier aentro-prod-pitr \
  --restore-to-time "2026-01-15T10:00:00Z" \
  --vpc-security-group-ids <db-sg-id> \
  --db-subnet-group-name aentro-prod-db
```

## Scenario 5: Region Failure (ap-northeast-1)

1. Activate cross-region read replica (if configured) or restore from S3 backup in ap-northeast-3
2. Update Route53 / CloudFront to point to new region
3. Deploy ECS services in backup region using Terraform:
   ```bash
   cd infra/environments/prod-dr
   terraform apply
   ```
4. Update DNS records

## Post-Recovery Checklist

- [ ] All services healthy (check `/health` endpoints)
- [ ] Database connections verified
- [ ] Sample API calls succeed
- [ ] Background jobs processing
- [ ] Monitoring and alerts active in new environment
- [ ] Customer communication sent
- [ ] Incident report filed
