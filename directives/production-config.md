# Production Environment Configuration

Version: 1.0.0
Last updated: 2026-02-27

## Common Environment Variables

These variables are shared across all Node.js services via `x-common-env` in docker-compose.yml.

| Variable       | Description                      | Default                                                            | Secret |
| -------------- | -------------------------------- | ------------------------------------------------------------------ | ------ |
| `DATABASE_URL` | PostgreSQL connection string     | `postgresql://agentfoundry:localdev@postgres:5432/agentfoundry_db` | Yes    |
| `RABBITMQ_URL` | RabbitMQ AMQP connection string  | `amqp://rabbitmq:5672`                                             | No     |
| `REDIS_URL`    | Redis connection string          | `redis://redis:6379`                                               | No     |
| `JWT_SECRET`   | Secret key for JWT token signing | `dev-jwt-secret-change-in-production`                              | Yes    |
| `NODE_ENV`     | Runtime environment              | `production`                                                       | No     |

## Service-Specific Configuration

### API Gateway (port 3000)

| Variable                   | Description                            | Default                                  | Secret |
| -------------------------- | -------------------------------------- | ---------------------------------------- | ------ |
| `PORT`                     | Service listen port                    | `3000`                                   | No     |
| `USER_SERVICE_URL`         | User service internal URL              | `http://user-service:3001`               | No     |
| `COMPLIANCE_SERVICE_URL`   | Compliance service internal URL        | `http://compliance-monitor-service:3002` | No     |
| `REPORTING_SERVICE_URL`    | Reporting service internal URL         | `http://reporting-service:3003`          | No     |
| `AI_SERVICE_URL`           | AI recommendation service internal URL | `http://ai-recommendation-service:3004`  | No     |
| `NOTIFICATION_SERVICE_URL` | Notification service internal URL      | `http://notification-service:3005`       | No     |
| `RATE_LIMIT_WINDOW_MS`     | Rate limit window in milliseconds      | `900000` (15 min)                        | No     |
| `RATE_LIMIT_MAX`           | Max requests per window                | `100`                                    | No     |

### User Service (port 3001)

| Variable        | Description             | Default | Secret |
| --------------- | ----------------------- | ------- | ------ |
| `PORT`          | Service listen port     | `3001`  | No     |
| `JWT_EXPIRY`    | Token expiration time   | `24h`   | No     |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12`    | No     |

### Compliance Monitor Service (port 3002)

| Variable | Description         | Default | Secret |
| -------- | ------------------- | ------- | ------ |
| `PORT`   | Service listen port | `3002`  | No     |

### Reporting Service (port 3003)

| Variable | Description         | Default | Secret |
| -------- | ------------------- | ------- | ------ |
| `PORT`   | Service listen port | `3003`  | No     |

### AI Recommendation Service (port 3004)

| Variable           | Description             | Default                    | Secret |
| ------------------ | ----------------------- | -------------------------- | ------ |
| `PORT`             | Service listen port     | `3004`                     | No     |
| `MODEL_SERVER_URL` | Python model server URL | `http://model-server:8000` | No     |

### Notification Service (port 3005)

| Variable            | Description                | Default | Secret |
| ------------------- | -------------------------- | ------- | ------ |
| `PORT`              | Service listen port        | `3005`  | No     |
| `SMTP_HOST`         | SMTP server host           | —       | No     |
| `SMTP_PORT`         | SMTP server port           | `587`   | No     |
| `SMTP_USER`         | SMTP username              | —       | Yes    |
| `SMTP_PASSWORD`     | SMTP password              | —       | Yes    |
| `TWILIO_SID`        | Twilio account SID (SMS)   | —       | Yes    |
| `TWILIO_AUTH_TOKEN` | Twilio auth token (SMS)    | —       | Yes    |
| `TWILIO_FROM`       | Twilio sender phone number | —       | No     |

### Model Server (port 8000)

| Variable    | Description                     | Default       | Secret |
| ----------- | ------------------------------- | ------------- | ------ |
| `PORT`      | Service listen port             | `8000`        | No     |
| `MODEL_DIR` | Path to stored ML models        | `/app/models` | No     |
| `DATA_DIR`  | Path to training/inference data | `/app/data`   | No     |

### Client (port 8080 -> nginx 80)

| Variable       | Description                  | Default                 | Secret |
| -------------- | ---------------------------- | ----------------------- | ------ |
| `VITE_API_URL` | API gateway URL for frontend | `http://localhost:3000` | No     |

## Infrastructure Services

### PostgreSQL

| Variable            | Description        | Default           | Secret |
| ------------------- | ------------------ | ----------------- | ------ |
| `POSTGRES_USER`     | Database superuser | `agentfoundry`    | No     |
| `POSTGRES_PASSWORD` | Database password  | `localdev`        | Yes    |
| `POSTGRES_DB`       | Database name      | `agentfoundry_db` | No     |

Port: 5432 (internal), 5432 (exposed in dev, not in prod)

### RabbitMQ

Port: 5672 (AMQP), 15672 (management UI)

### Redis

Port: 6379 (internal)

## Port Mapping Summary

| Service                    | Dev Port | Prod Port (internal) |
| -------------------------- | -------- | -------------------- |
| api-gateway                | 3000     | 3000                 |
| user-service               | 3001     | 3001                 |
| compliance-monitor-service | 3002     | 3002                 |
| reporting-service          | 3003     | 3003                 |
| ai-recommendation-service  | 3004     | 3004                 |
| notification-service       | 3005     | 3005                 |
| model-server               | 8000     | 8000                 |
| client (nginx)             | 8080     | 80                   |
| PostgreSQL                 | 5432     | 5432                 |
| RabbitMQ AMQP              | 5672     | 5672                 |
| RabbitMQ Management        | 15672    | 15672                |
| Redis                      | 6379     | 6379                 |

## Production Deployment Notes

- In production, only the client (port 80/443) and api-gateway should be exposed externally
- All inter-service communication uses the Docker bridge network (`agent-foundry-network`)
- PostgreSQL, Redis, and RabbitMQ ports should NOT be exposed externally in production
- Use Docker secrets or environment file for sensitive values (never commit to repo)
- Production server: Hetzner (95.216.199.47)
