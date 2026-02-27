import { Request, Response, NextFunction } from 'express';
import { Registry, Counter, Gauge } from 'prom-client';

// ---------------------------------------------------------------------------
// Business-level Prometheus metrics for Agent Foundry.
//
// These counters / gauges are incremented based on the proxied request path
// so the API gateway can track platform-wide business activity.
// ---------------------------------------------------------------------------

/**
 * Accepts an existing prom-client Registry so all business metrics appear
 * alongside the default process metrics on the /metrics endpoint.
 */
export function createBusinessMetrics(register: Registry) {
  const activeUsers = new Gauge({
    name: 'platform_active_users_total',
    help: 'Unique authenticated users seen in the current tracking window',
    registers: [register],
  });

  const complianceChecks = new Counter({
    name: 'platform_compliance_checks_total',
    help: 'Total compliance checks performed',
    registers: [register],
  });

  const reportsGenerated = new Counter({
    name: 'platform_reports_generated_total',
    help: 'Total reports generated',
    registers: [register],
  });

  const aiRecommendationsServed = new Counter({
    name: 'platform_ai_recommendations_served_total',
    help: 'Total AI recommendations served',
    registers: [register],
  });

  const searchQueries = new Counter({
    name: 'platform_search_queries_total',
    help: 'Total search queries performed',
    registers: [register],
  });

  const agentDeployments = new Counter({
    name: 'platform_agent_deployments_total',
    help: 'Total agent deployments',
    registers: [register],
  });

  // Track unique users seen within the last hour
  const recentUsers = new Set<string>();
  let lastReset = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    // Reset the active-user set every hour
    if (Date.now() - lastReset > ONE_HOUR) {
      recentUsers.clear();
      lastReset = Date.now();
    }

    // Track authenticated user
    const userId =
      ((req as unknown as Record<string, unknown>).userId as string | undefined) ??
      (req.headers['x-user-id'] as string | undefined);
    if (userId) {
      recentUsers.add(userId);
      activeUsers.set(recentUsers.size);
    }

    res.on('finish', () => {
      const path = req.originalUrl || req.path;
      const method = req.method;
      const status = res.statusCode;

      // Only count successful mutations / reads that indicate real usage
      if (path.startsWith('/api/compliance') && method === 'POST' && status < 400) {
        complianceChecks.inc();
      }

      if (path.startsWith('/api/reports') && method === 'POST' && status < 400) {
        reportsGenerated.inc();
      }

      if (path.startsWith('/api/recommendations') && method === 'GET' && status < 400) {
        aiRecommendationsServed.inc();
      }

      if (path.startsWith('/api/search') && method === 'GET' && status < 400) {
        searchQueries.inc();
      }

      if (path.startsWith('/api/agents') && method === 'POST' && status < 400) {
        agentDeployments.inc();
      }
    });

    next();
  };

  return {
    middleware,
    counters: {
      activeUsers,
      complianceChecks,
      reportsGenerated,
      aiRecommendationsServed,
      searchQueries,
      agentDeployments,
    },
  };
}
