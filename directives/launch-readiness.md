# Launch Readiness Checklist

Version: 1.0.0
Last updated: 2026-02-27

## Infrastructure

- [ ] All 8 services deployed and running (api-gateway, user-service, compliance-monitor-service, reporting-service, ai-recommendation-service, notification-service, model-server, client)
- [ ] Health checks passing on all services (`npm run health-check`)
- [ ] SSL/TLS configured for production domain (HTTPS enforced)
- [ ] DNS configured and propagated
- [ ] Docker containers running with restart policies
- [ ] Resource limits configured per container (CPU/memory)
- [ ] Volume persistence verified for postgres_data, redis_data, model_data

## Security

- [ ] JWT_SECRET rotated from dev default to production-grade secret (min 64 chars)
- [ ] CORS configured for production domain only (no wildcard)
- [ ] Rate limiting active on api-gateway (per IP and per user)
- [ ] Security headers verified (Helmet configured: CSP, HSTS, X-Frame-Options)
- [ ] Dependency audit clean (`npm audit` shows no critical/high vulnerabilities)
- [ ] No secrets committed to repository (`.env` files in `.gitignore`)
- [ ] Database credentials use strong passwords (not `localdev`)
- [ ] RabbitMQ credentials changed from defaults
- [ ] Redis AUTH enabled in production

## Data

- [ ] Database seeded with reference data (`npm run seed`)
- [ ] Database backup job configured and running (daily)
- [ ] Backup restore tested successfully
- [ ] Database migrations applied and verified
- [ ] Connection pool sizes appropriate for production load

## Monitoring

- [ ] Prometheus scraping all service /metrics endpoints
- [ ] Grafana dashboards configured (service health, latency, error rates)
- [ ] Alerting rules set (service down, high error rate, high latency, disk space)
- [ ] Log aggregation working (structured JSON logs from all services)
- [ ] RabbitMQ management dashboard accessible (port 15672)

## Testing

- [ ] All unit tests passing (`npm run test:unit`)
- [ ] Integration tests passing (`npm run test:integration`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Load tests completed (`npm run load-test`) with acceptable results
- [ ] Security scan clean (OWASP ZAP or equivalent)

## Documentation

- [ ] API docs accessible at /api/docs (Swagger/OpenAPI)
- [ ] User guide complete
- [ ] Admin/operator guide complete
- [ ] Runbook complete (common operations, troubleshooting)
- [ ] Incident response playbook reviewed (`directives/incident-response.md`)

## Compliance

- [ ] GDPR data subject endpoints verified (access, deletion, portability)
- [ ] Data retention policy configured and documented
- [ ] Audit logging active on all data mutations
- [ ] Privacy policy published
- [ ] Cookie consent mechanism implemented (if applicable)

## Final Checks

- [ ] Version bumped to 1.0.0 across all services
- [ ] Blue-green deployment script tested (`scripts/blue-green-deploy.sh`)
- [ ] Rollback procedure documented and tested
- [ ] On-call rotation established
- [ ] Stakeholders notified of launch date
