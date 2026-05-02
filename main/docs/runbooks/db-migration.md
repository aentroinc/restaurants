# Database Migration Runbook

## Pre-deploy Checklist

- [ ] Migration tested on staging
- [ ] Migration is backward-compatible (no column drops without deprecation)
- [ ] Backup taken before migration
- [ ] Estimated lock time for large tables documented

## Running Migrations

### Local
```bash
cd main/backend
alembic upgrade head
```

### Staging / Production (via ECS)
```bash
aws ecs run-task \
  --cluster aentro-<env> \
  --task-definition aentro-<env>-migration \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<private-subnet-id>],securityGroups=[<app-sg-id>]}" \
  --overrides '{"containerOverrides":[{"name":"migration","command":["alembic","upgrade","head"]}]}'
```

### Check migration status
```bash
# Current revision
alembic current

# Migration history
alembic history --verbose
```

## Creating New Migrations

```bash
cd main/backend
alembic revision --autogenerate -m "add column X to table Y"
```

Review the generated file in `alembic/versions/` before committing.

## Rollback

```bash
# Roll back one step
alembic downgrade -1

# Roll back to specific revision
alembic downgrade <revision_id>
```

## Large Table Migrations

For tables > 1M rows:

1. Use `ALTER TABLE ... ADD COLUMN ... DEFAULT NULL` (instant in PostgreSQL 11+)
2. Backfill data in batches:
   ```sql
   UPDATE table SET new_col = compute_value(old_col)
   WHERE id BETWEEN :start AND :end;
   ```
3. Add NOT NULL constraint after backfill is complete
4. Schedule during low-traffic window (JST 03:00-05:00)

## Emergency: Stuck Migration

```bash
# Check current alembic version in DB
psql -c "SELECT * FROM alembic_version;"

# Manually stamp to skip broken migration
alembic stamp <target_revision>
```
