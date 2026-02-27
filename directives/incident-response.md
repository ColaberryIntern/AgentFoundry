# Incident Response Playbook

Version: 1.0.0
Last updated: 2026-02-27

## Severity Levels

| Level         | Description                                                   | Response Time     | Notification        |
| ------------- | ------------------------------------------------------------- | ----------------- | ------------------- |
| P1 — Critical | Complete service outage or data loss                          | 15 minutes        | SMS + Email + Slack |
| P2 — High     | Major feature unavailable, degraded performance for all users | 1 hour            | Email + Slack       |
| P3 — Medium   | Minor feature broken, workaround available                    | 4 hours           | Slack               |
| P4 — Low      | Cosmetic issue, non-urgent improvement needed                 | Next business day | Ticket only         |

## Escalation Matrix

| Issue Type              | First Responder  | Escalation          |
| ----------------------- | ---------------- | ------------------- |
| Service crash / outage  | On-call engineer | Platform lead       |
| Database failure        | On-call engineer | DBA / Platform lead |
| Security incident       | On-call engineer | Security lead + CTO |
| Data breach             | Security lead    | CTO + Legal         |
| Model server failure    | On-call engineer | ML engineer         |
| Authentication failure  | On-call engineer | Platform lead       |
| Performance degradation | On-call engineer | Platform lead       |

## Common Failure Scenarios

### Service Crash

**Symptoms:** Health check returns non-200, container exits unexpectedly.

1. Check service logs: `docker compose logs <service-name> --tail 100`
2. Check container status: `docker compose ps`
3. Restart the container: `docker compose restart <service-name>`
4. Verify health: `curl http://localhost:<port>/health`
5. If repeated crashes: check memory usage, review recent deployments, roll back if necessary

### Database Connection Failure

**Symptoms:** Services return 500 errors, logs show "ECONNREFUSED" or "too many connections."

1. Verify PostgreSQL is running: `docker compose ps postgres`
2. Test connectivity: `docker compose exec postgres pg_isready -U agentfoundry`
3. Check connection pool: review active connections with `SELECT count(*) FROM pg_stat_activity;`
4. If connection pool exhausted: restart affected services to release connections
5. Check disk space: `docker compose exec postgres df -h`
6. Review postgres logs: `docker compose logs postgres --tail 100`

### Model Server Timeout

**Symptoms:** AI recommendation service returns timeouts, slow inference responses.

1. Check model-server health: `curl http://localhost:8000/health`
2. Check Python process: `docker compose exec model-server ps aux`
3. Check model-server logs: `docker compose logs model-server --tail 100`
4. Restart container: `docker compose restart model-server`
5. If persistent: check model file integrity in `/app/models`, verify GPU/CPU resource allocation

### High Latency

**Symptoms:** API response times exceed SLA, user-facing slowness.

1. Identify bottleneck service via Grafana dashboards or health check response times
2. Check Redis: `docker compose exec redis redis-cli ping` and `redis-cli info memory`
3. Check database query performance: review slow query log
4. Check RabbitMQ queue depth: access management UI at port 15672
5. Check container resource usage: `docker stats`
6. If Redis-related: flush cache if stale data suspected, restart Redis
7. If database-related: analyze queries with `EXPLAIN ANALYZE`, add missing indexes

### Authentication Failures

**Symptoms:** Users cannot log in, 401 errors on valid tokens.

1. Verify JWT_SECRET matches across all services: check environment variables
2. Check token expiry configuration
3. Verify user-service is healthy: `curl http://localhost:3001/health`
4. Test token generation: attempt login via API
5. If JWT_SECRET mismatch: update all services with correct secret, restart
6. Check clock synchronization across containers (JWT expiry is time-sensitive)

### RabbitMQ Queue Backlog

**Symptoms:** Notifications delayed, compliance checks stalling.

1. Check RabbitMQ health: `docker compose exec rabbitmq rabbitmq-diagnostics -q ping`
2. Access management UI: `http://localhost:15672` (guest/guest in dev)
3. Check queue depths and consumer counts
4. Restart consumers: `docker compose restart notification-service`
5. If persistent: check if consumers are crashing (review logs)

### Disk Space Full

**Symptoms:** Database writes fail, container logs not rotating.

1. Check disk usage: `df -h` on host
2. Prune Docker resources: `docker system prune -f`
3. Rotate logs: configure Docker log rotation in daemon.json
4. Clean old backups if applicable
5. Expand disk if needed

## Post-Incident Review Template

Complete within 48 hours of P1/P2 resolution.

```
Incident ID: INC-YYYY-MM-DD-NNN
Severity: P1/P2/P3/P4
Duration: Start time — End time
Impact: [Number of users affected, features impacted]

Timeline:
- HH:MM — Issue detected (how?)
- HH:MM — First responder engaged
- HH:MM — Root cause identified
- HH:MM — Fix applied
- HH:MM — Service restored
- HH:MM — All-clear confirmed

Root Cause:
[Description of the underlying cause]

Resolution:
[What was done to fix it]

Corrective Actions:
- [ ] [Action item 1 — owner — due date]
- [ ] [Action item 2 — owner — due date]

Lessons Learned:
- [What went well]
- [What could be improved]
- [Changes to monitoring/alerting needed]
```

## Monitoring Quick Reference

| Endpoint                       | What It Shows                   |
| ------------------------------ | ------------------------------- |
| `http://localhost:3000/health` | API Gateway status              |
| `http://localhost:3001/health` | User Service status             |
| `http://localhost:3002/health` | Compliance Monitor status       |
| `http://localhost:3003/health` | Reporting Service status        |
| `http://localhost:3004/health` | AI Recommendation status        |
| `http://localhost:3005/health` | Notification Service status     |
| `http://localhost:8000/health` | Model Server status             |
| `http://localhost:15672`       | RabbitMQ Management UI          |
| `npm run health-check`         | Automated check of all services |
