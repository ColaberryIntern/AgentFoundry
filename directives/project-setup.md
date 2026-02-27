# Directive: Project Setup

**Version:** 1.0
**Last Updated:** 2026-02-26
**Owner:** Agent Foundry Team

---

## Goal

Enable any developer to set up the full Agent Foundry stack locally in under 15 minutes, with all services running and communicating correctly.

---

## Prerequisites

| Tool           | Minimum Version | Verify Command           |
| -------------- | --------------- | ------------------------ |
| Node.js        | 20.x            | `node --version`         |
| npm            | 10.x            | `npm --version`          |
| Docker         | 24.x            | `docker --version`       |
| Docker Compose | 2.x             | `docker compose version` |
| Git            | 2.x             | `git --version`          |

---

## Inputs

- A cloned copy of the Agent Foundry repository.
- Internet access for pulling Docker images and npm packages on first run.

---

## Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd agent-foundry
```

### 2. Create Environment Files

Copy every `.env.example` to `.env` at all locations:

```bash
# Root
cp .env.example .env

# Each service
for svc in api-gateway user-service compliance-monitor-service reporting-service ai-recommendation-service notification-service; do
  cp "services/$svc/.env.example" "services/$svc/.env"
done
```

Review each `.env` file. For local development the defaults are sufficient. For staging or production, replace every placeholder value.

### 3. Install Dependencies

```bash
npm run install:all
```

This runs `npm install` in the root, the client, and every service directory.

### 4. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL, RabbitMQ, and Redis containers.

### 5. Run Database Migrations

```bash
npm run migrate:all
```

### 6. Start Services

```bash
npm run dev
```

Or start each service individually:

```bash
npm run dev --workspace=services/api-gateway
npm run dev --workspace=services/user-service
# ... etc.
```

### 7. Start the Client

```bash
cd client
npm run dev
```

---

## Expected Outputs

| Component            | URL / Port                   | Status    |
| -------------------- | ---------------------------- | --------- |
| API Gateway          | http://localhost:3000        | 200 OK    |
| User Service         | http://localhost:3001        | 200 OK    |
| Compliance Service   | http://localhost:3002        | 200 OK    |
| Reporting Service    | http://localhost:3003        | 200 OK    |
| AI Recommendation    | http://localhost:3004        | 200 OK    |
| Notification Service | http://localhost:3005        | 200 OK    |
| WebSocket            | ws://localhost:3006          | Connected |
| PostgreSQL           | localhost:5432               | Running   |
| RabbitMQ             | localhost:5672 (mgmt: 15672) | Running   |
| Redis                | localhost:6379               | Running   |
| Client (Vite)        | http://localhost:5173        | 200 OK    |

---

## Edge Cases

- **Port conflicts:** If a port is already in use, update the relevant `.env` file and the corresponding `docker-compose.yml` port mapping.
- **Docker not running:** The `docker compose up` step will fail. Ensure the Docker daemon is started before running compose commands.
- **Database connection refused:** PostgreSQL may take a few seconds after `docker compose up` to accept connections. Retry migrations after a short wait.
- **npm install failures:** Delete `node_modules` and `package-lock.json` in the affected directory, then run install again.
- **WSL / Windows path issues:** Use forward slashes in all paths. Ensure line endings are LF, not CRLF (`git config core.autocrlf input`).

---

## Safety Constraints

- Never commit `.env` files. They are gitignored.
- Never use production credentials in local development.
- Docker volumes persist data between restarts. Use `docker compose down -v` to reset all data.

---

## Verification

Run the following to confirm the stack is healthy:

```bash
# Check Docker containers
docker compose ps

# Health-check each service
curl -sf http://localhost:3000/health && echo "API Gateway: OK"
curl -sf http://localhost:3001/health && echo "User Service: OK"
curl -sf http://localhost:3002/health && echo "Compliance Service: OK"
curl -sf http://localhost:3003/health && echo "Reporting Service: OK"
curl -sf http://localhost:3004/health && echo "AI Service: OK"
curl -sf http://localhost:3005/health && echo "Notification Service: OK"
```

All commands should print `OK`. If any fail, check the service logs:

```bash
docker compose logs <service-name>
# or for a Node service:
npm run dev --workspace=services/<service-name>
```
