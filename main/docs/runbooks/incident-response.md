# Incident Response Runbook

## Severity Levels

| Level | Criteria | Response Time | Example |
|-------|----------|---------------|---------|
| SEV1 | Service down, data loss risk | 15 min | DB unreachable, full outage |
| SEV2 | Degraded performance, partial outage | 30 min | p95 > 5s, single service down |
| SEV3 | Minor issue, no user impact | 4 hours | Non-critical job failures |

## Alert → Triage (0-15 min)

1. Acknowledge alert in PagerDuty / Slack `#incidents`
2. Check CloudWatch dashboard: `https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#dashboards:name=aentro-prod`
3. Identify affected services:
   ```bash
   aws ecs describe-services --cluster aentro-prod --services aentro-prod-backend aentro-prod-frontend
   ```
4. Check recent deployments:
   ```bash
   aws ecs describe-services --cluster aentro-prod --services aentro-prod-backend --query 'services[0].deployments'
   ```
5. Check logs:
   ```bash
   aws logs tail /ecs/aentro-prod/backend --since 30m --follow
   ```

## Mitigate (15-60 min)

### If deployment-related:
```bash
# Rollback to previous task definition
aws ecs update-service --cluster aentro-prod --service aentro-prod-backend \
  --task-definition aentro-prod-backend:<previous-revision>
```

### If database-related:
- Check Aurora cluster status in RDS console
- Check connection count: see `db-migration.md` for connection commands
- If failover needed: see `dr.md`

### If traffic spike:
```bash
# Scale up manually
aws ecs update-service --cluster aentro-prod --service aentro-prod-backend --desired-count 4
```

## Communicate

- Post status update in `#incidents` every 15 min during SEV1/SEV2
- Update status page if customer-facing
- Template: `[HH:MM] Status: <investigating|identified|mitigating|resolved>. Impact: <description>. ETA: <time>`

## RCA (within 48 hours)

1. Create incident document in `docs/incidents/YYYY-MM-DD-title.md`
2. Timeline of events
3. Root cause analysis (5 Whys)
4. Action items with owners and deadlines
5. Review in weekly engineering meeting

## Follow-up

- [ ] Action items tracked in GitHub Issues
- [ ] Monitoring gaps addressed
- [ ] Runbook updated if procedure was missing
- [ ] Post-mortem shared with team
