# Agent Foundry — Operational Runbook

> Version 1.0 | Sprint 25
> Last updated: 2026-02-27

---

## Table of Contents

1. [Service Architecture](#service-architecture)
2. [Deployment Procedures](#deployment-procedures)
3. [Health Monitoring](#health-monitoring)
4. [Common Issues & Remediation](#common-issues--remediation)
5. [Backup & Recovery](#backup--recovery)
6. [Scaling Guide](#scaling-guide)
7. [On-Call Rotation](#on-call-rotation)
8. [Post-Incident Review](#post-incident-review)

---

## Service Architecture

```
                    +-----------+
                    |  Client   |
                    |  (React)  |
                    |  :8080    |
                    +-----+-----+
                          |
                    +-----v-----+
                    |API Gateway|
                    |  :3000    |
                    +-----+-----+
                          |
        +---------+-------+-------+---------+-----------+
        |         |               |         |           |
  +-----v--+ +---v----+  +-------v---+ +---v----+ +----v----+
  |  User  | |Complian.| |Reporting  | |AI Rec. | |Notific. |
  |Service | |Monitor  | |Service    | |Service | |Service  |
  | :3001  | | :3002   | | :3003     | | :3004  | | :3005   |
  +---+----+ +---+-----+ +---+-------+ +---+----+ +---+-----+
      |          |            |             |          |
      +----------+------------+             |          |
               |                      +-----v-----+   |
         +-----v-----+               |Model Server|   |
         | PostgreSQL |               |  (FastAPI) |   |
         |   :5432    |               |   :8000    |   |
         +-----------+               +------------+   |
                                                       |
                     +----------+    +---------+       |
                     | RabbitMQ |    |  Redis  |<------+
                     |  :5672   |    |  :6379  |
                     +----------+    +---------+
```

### Services

| Service                    | Port | Technology        | Purpose                                  |
| -------------------------- | ---- | ----------------- | ---------------------------------------- |
| API Gateway                | 3000 | Node.js / Express | Routing, auth proxy, metrics, rate-limit |
| User Service               | 3001 | Node.js / Express | Authentication, roles, API keys          |
| Compliance Monitor Service | 3002 | Node.js / Express | Compliance checks, agent management      |
| Reporting Service          | 3003 | Node.js / Express | Report generation and scheduling         |
| AI Recommendation Service  | 3004 | Node.js / Express | Recommendations, inference proxy         |
| Notification Service       | 3005 | Node.js / Express | Notifications, webhooks, WebSocket       |
| Model Server               | 8000 | Python / FastAPI  | ML model inference                       |
| Client                     | 8080 | React             | Frontend SPA                             |

### Infrastructure

| Component    | Port | Purpose                        |
| ------------ | ---- | ------------------------------ |
| PostgreSQL   | 5432 | Primary data store             |
| RabbitMQ     | 5672 | Async message queue            |
| Redis        | 6379 | Caching, sessions, rate-limits |
| Prometheus   | 9090 | Metrics collection & alerting  |
| Grafana      | 3030 | Dashboard visualization        |
| AlertManager | 9093 | Alert routing                  |

---

## Deployment Procedures

### Standard Deployment (Docker Compose)

```bash
# 1. Pull latest code
ssh deploy@95.216.199.47
cd /opt/agent-foundry

# 2. Pull latest images / build
docker compose pull
docker compose build --no-cache

# 3. Run database migrations (if any)
docker compose run --rm api-gateway npx sequelize-cli db:migrate

# 4. Start services
docker compose up -d

# 5. Verify health
curl -s http://localhost:3000/health | jq .
curl -s http://localhost:3001/health | jq .
curl -s http://localhost:3002/health | jq .
curl -s http://localhost:3003/health | jq .
curl -s http://localhost:3004/health | jq .
curl -s http://localhost:3005/health | jq .
curl -s http://localhost:8000/health | jq .
```

### With Monitoring Stack

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Rollback Procedure

```bash
# 1. Identify the previous working version
docker compose ps        # note current image tags
docker images            # find previous tags

# 2. Roll back to previous images
docker compose down
git checkout <previous-commit>
docker compose up -d --build

# 3. Roll back database if needed
docker compose run --rm api-gateway npx sequelize-cli db:migrate:undo

# 4. Verify
curl -s http://localhost:3000/health | jq .
```

### Zero-Downtime Deploy (Blue-Green)

Kubernetes blue-green deployment manifests are in `k8s/base/blue-green/`. For Docker Compose, use rolling restarts:

```bash
# Restart one service at a time
docker compose up -d --no-deps --build api-gateway
docker compose up -d --no-deps --build user-service
# ... repeat for each service
```

---

## Health Monitoring

### Health Check Endpoints

Every service exposes `GET /health` returning:

```json
{
  "status": "ok",
  "uptime": 12345.67,
  "memoryUsage": {
    "rss": 104857600,
    "heapTotal": 52428800,
    "heapUsed": 41943040
  }
}
```

### Expected Healthy Responses

- HTTP 200 on all `/health` endpoints
- Prometheus targets showing `up == 1` on `/targets`
- No critical alerts firing in AlertManager

### Dashboard Locations

| Dashboard            | URL                                                            |
| -------------------- | -------------------------------------------------------------- |
| Service Health       | http://95.216.199.47:3030/d/agent-foundry-service-health       |
| Business Metrics     | http://95.216.199.47:3030/d/agent-foundry-business-metrics     |
| AI Model Performance | http://95.216.199.47:3030/d/agent-foundry-ai-model-performance |
| Prometheus Targets   | http://95.216.199.47:9090/targets                              |
| AlertManager         | http://95.216.199.47:9093                                      |

### Quick Health Check Script

```bash
for port in 3000 3001 3002 3003 3004 3005 8000; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)
  echo "Port $port: $status"
done
```

---

## Common Issues & Remediation

### Container Won't Start

**Symptoms:** `docker compose ps` shows container in `Restarting` or `Exit` state.

**Steps:**

1. Check container logs: `docker compose logs <service-name> --tail=50`
2. Verify environment variables are set in `.env` or `docker-compose.yml`
3. Check port conflicts: `ss -tlnp | grep <port>`
4. Ensure dependent services are healthy (postgres, redis, rabbitmq)
5. Rebuild the image: `docker compose build --no-cache <service-name>`

### Database Migration Failure

**Symptoms:** Service crashes on startup with Sequelize error.

**Steps:**

1. Check database connectivity: `docker compose exec postgres psql -U agentfoundry -d agentfoundry_db -c "SELECT 1;"`
2. View pending migrations: `docker compose run --rm api-gateway npx sequelize-cli db:migrate:status`
3. Run migrations manually: `docker compose run --rm api-gateway npx sequelize-cli db:migrate`
4. If migration is corrupt, undo and retry:
   ```bash
   docker compose run --rm api-gateway npx sequelize-cli db:migrate:undo
   docker compose run --rm api-gateway npx sequelize-cli db:migrate
   ```

### High Memory Usage

**Symptoms:** AlertManager fires `HighMemoryUsage`; Grafana shows RSS climbing.

**Steps:**

1. Identify the service: check Grafana "Service Health" dashboard, Memory Usage panel
2. Check for memory leaks: review recent code changes for unclosed connections, growing arrays, or event listener leaks
3. Immediate mitigation: restart the service: `docker compose restart <service-name>`
4. Long-term: add heap profiling, use `--max-old-space-size` in Node.js

### Authentication Errors

**Symptoms:** 401/403 responses across services; users cannot log in.

**Steps:**

1. Verify `JWT_SECRET` is identical across all services:
   ```bash
   docker compose exec api-gateway printenv JWT_SECRET
   docker compose exec user-service printenv JWT_SECRET
   ```
2. Check token expiration settings
3. Verify user-service is healthy: `curl http://localhost:3001/health`
4. Check Redis connectivity (session store): `docker compose exec redis redis-cli ping`

### Model Server Slow or Unresponsive

**Symptoms:** High latency on `/api/recommendations`; `AIModelServerDown` alert.

**Steps:**

1. Check model-server logs: `docker compose logs model-server --tail=50`
2. Check CPU/memory: `docker stats model-server`
3. Verify model files exist: `docker compose exec model-server ls -la /app/models/`
4. Restart: `docker compose restart model-server`
5. If GPU-related, check CUDA driver compatibility

### WebSocket Disconnections

**Symptoms:** Real-time notifications stop; frontend shows "disconnected".

**Steps:**

1. Check notification-service health: `curl http://localhost:3005/health`
2. Verify RabbitMQ is running: `docker compose exec rabbitmq rabbitmq-diagnostics -q ping`
3. Check Redis for pub/sub: `docker compose exec redis redis-cli ping`
4. Review notification-service logs for connection errors
5. Restart: `docker compose restart notification-service`

---

## Backup & Recovery

### Backup Schedule

| What          | Frequency | Retention | Method                |
| ------------- | --------- | --------- | --------------------- |
| PostgreSQL    | Daily 2AM | 30 days   | `pg_dump` via CronJob |
| Redis         | Hourly    | 24 hours  | RDB snapshots (auto)  |
| Model files   | Weekly    | 4 weeks   | Volume snapshot       |
| Configuration | On change | Unlimited | Git repository        |

### Manual Database Backup

```bash
# Create backup
docker compose exec postgres pg_dump -U agentfoundry -d agentfoundry_db \
  --format=custom --file=/tmp/backup_$(date +%Y%m%d_%H%M%S).dump

# Copy to host
docker compose cp postgres:/tmp/backup_*.dump ./backups/
```

### Restore Procedure

```bash
# 1. Stop application services (keep postgres running)
docker compose stop api-gateway user-service compliance-monitor-service \
  reporting-service ai-recommendation-service notification-service

# 2. Restore database
docker compose exec postgres pg_restore -U agentfoundry -d agentfoundry_db \
  --clean --if-exists /tmp/backup_YYYYMMDD_HHMMSS.dump

# 3. Restart services
docker compose start api-gateway user-service compliance-monitor-service \
  reporting-service ai-recommendation-service notification-service

# 4. Verify data integrity
curl -s http://localhost:3000/health | jq .
```

### Verification Steps

After any restore:

1. Run health checks on all services
2. Verify user login works
3. Check dashboard data loads
4. Verify recent compliance records exist
5. Run a test report generation

---

## Scaling Guide

### When to Scale

| Symptom                         | Scale What                              |
| ------------------------------- | --------------------------------------- |
| API latency > 500ms sustained   | API Gateway replicas                    |
| Auth endpoint queue depth rises | User Service replicas                   |
| Report generation backlog       | Reporting Service + worker replicas     |
| Inference latency > 2s          | Model Server replicas or resources      |
| WebSocket connection limit hit  | Notification Service replicas           |
| DB connection pool exhaustion   | PostgreSQL max_connections or PgBouncer |

### Horizontal Scaling (Docker Compose)

```bash
docker compose up -d --scale user-service=3 --scale reporting-service=2
```

### Resource Requirements (per instance)

| Service                    | CPU  | Memory | Notes                          |
| -------------------------- | ---- | ------ | ------------------------------ |
| API Gateway                | 0.25 | 256 MB | Stateless, scales easily       |
| User Service               | 0.25 | 256 MB | DB connection pool             |
| Compliance Monitor Service | 0.25 | 256 MB | DB connection pool             |
| Reporting Service          | 0.5  | 512 MB | Report generation is CPU-heavy |
| AI Recommendation Service  | 0.25 | 256 MB | Stateless proxy                |
| Notification Service       | 0.25 | 256 MB | WebSocket connections          |
| Model Server               | 1.0  | 1 GB   | ML inference workload          |
| PostgreSQL                 | 1.0  | 1 GB   | Tuned for OLTP                 |
| Redis                      | 0.25 | 256 MB | In-memory cache                |
| RabbitMQ                   | 0.5  | 512 MB | Message broker                 |

### Kubernetes Autoscaling

HPA manifests are defined in `k8s/base/hpa.yml`. Default settings:

- Target CPU utilization: 70%
- Min replicas: 2
- Max replicas: 10

---

## On-Call Rotation

### Template

| Week Starting | Primary On-Call | Secondary On-Call | Notes |
| ------------- | --------------- | ----------------- | ----- |
| YYYY-MM-DD    | Engineer A      | Engineer B        |       |
| YYYY-MM-DD    | Engineer B      | Engineer C        |       |
| YYYY-MM-DD    | Engineer C      | Engineer A        |       |

### On-Call Responsibilities

1. Monitor AlertManager and Grafana dashboards
2. Respond to critical alerts within 15 minutes
3. Respond to warning alerts within 1 hour
4. Escalate unresolvable issues to team lead
5. Document all incidents in the post-incident review template
6. Handoff summary to next on-call engineer

### Alert Severity Response Times

| Severity | Response Time     | Escalation After |
| -------- | ----------------- | ---------------- |
| Critical | 15 minutes        | 30 minutes       |
| Warning  | 1 hour            | 4 hours          |
| Info     | Next business day | N/A              |

---

## Post-Incident Review

### Template

Use this template for every P1/P2 incident:

```markdown
# Post-Incident Review

## Incident Summary

- **Date:** YYYY-MM-DD
- **Duration:** HH:MM
- **Severity:** P1 / P2
- **Services Affected:**

## Timeline

| Time  | Event                 |
| ----- | --------------------- |
| HH:MM | Alert triggered       |
| HH:MM | On-call acknowledged  |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed          |
| HH:MM | All systems nominal   |

## Root Cause Analysis

<!-- What was the fundamental cause? -->

## Impact

- Users affected:
- Data loss (if any):
- Revenue impact (if any):

## What Went Well

-

## What Could Be Improved

-

## Action Items

| Action | Owner | Deadline | Status |
| ------ | ----- | -------- | ------ |
|        |       |          |        |

## Lessons Learned

-
```

### Review Process

1. Primary on-call writes draft within 24 hours
2. Team reviews in next standup
3. Action items tracked in issue tracker
4. Follow-up review after action items complete
