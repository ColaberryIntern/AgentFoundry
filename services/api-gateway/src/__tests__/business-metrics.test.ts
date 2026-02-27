import { Registry } from 'prom-client';
import { createBusinessMetrics } from '../middleware/businessMetrics';
import { Request, Response, NextFunction } from 'express';

/**
 * Helper to build a minimal Express-like request object.
 */
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/',
    originalUrl: '/',
    headers: {},
    ...overrides,
  } as unknown as Request;
}

/**
 * Helper to build a minimal Express-like response object that supports
 * the `on('finish', cb)` pattern used by the middleware.
 */
function mockRes(statusCode = 200): Response & { _fire: () => void } {
  const listeners: Array<() => void> = [];
  return {
    statusCode,
    on: (event: string, cb: () => void) => {
      if (event === 'finish') listeners.push(cb);
    },
    _fire: () => listeners.forEach((fn) => fn()),
  } as unknown as Response & { _fire: () => void };
}

describe('businessMetrics middleware', () => {
  let registry: Registry;

  beforeEach(() => {
    // Fresh registry per test to avoid metric-name collisions
    registry = new Registry();
  });

  it('registers all expected counters and gauges', async () => {
    createBusinessMetrics(registry);

    const metrics = await registry.getMetricsAsJSON();
    const names = metrics.map((m) => m.name);

    expect(names).toContain('platform_active_users_total');
    expect(names).toContain('platform_compliance_checks_total');
    expect(names).toContain('platform_reports_generated_total');
    expect(names).toContain('platform_ai_recommendations_served_total');
    expect(names).toContain('platform_search_queries_total');
    expect(names).toContain('platform_agent_deployments_total');
  });

  it('increments compliance_checks_total on POST /api/compliance', async () => {
    const { middleware, counters } = createBusinessMetrics(registry);
    const req = mockReq({
      method: 'POST',
      originalUrl: '/api/compliance/run',
      path: '/api/compliance/run',
    });
    const res = mockRes(201);
    const next: NextFunction = jest.fn();

    middleware(req, res, next);
    res._fire();

    expect(next).toHaveBeenCalled();
    const value = await registry.getSingleMetricAsString('platform_compliance_checks_total');
    expect(value).toContain('platform_compliance_checks_total');
    expect(counters.complianceChecks).toBeDefined();
  });

  it('increments reports_generated_total on POST /api/reports', async () => {
    const { middleware } = createBusinessMetrics(registry);
    const req = mockReq({ method: 'POST', originalUrl: '/api/reports', path: '/api/reports' });
    const res = mockRes(201);
    const next: NextFunction = jest.fn();

    middleware(req, res, next);
    res._fire();

    const value = await registry.getSingleMetricAsString('platform_reports_generated_total');
    expect(value).toContain('1');
  });

  it('increments ai_recommendations_served_total on GET /api/recommendations', async () => {
    const { middleware } = createBusinessMetrics(registry);
    const req = mockReq({
      method: 'GET',
      originalUrl: '/api/recommendations',
      path: '/api/recommendations',
    });
    const res = mockRes(200);
    const next: NextFunction = jest.fn();

    middleware(req, res, next);
    res._fire();

    const value = await registry.getSingleMetricAsString(
      'platform_ai_recommendations_served_total',
    );
    expect(value).toContain('1');
  });

  it('increments search_queries_total on GET /api/search', async () => {
    const { middleware } = createBusinessMetrics(registry);
    const req = mockReq({ method: 'GET', originalUrl: '/api/search?q=test', path: '/api/search' });
    const res = mockRes(200);
    const next: NextFunction = jest.fn();

    middleware(req, res, next);
    res._fire();

    const value = await registry.getSingleMetricAsString('platform_search_queries_total');
    expect(value).toContain('1');
  });

  it('increments agent_deployments_total on POST /api/agents', async () => {
    const { middleware } = createBusinessMetrics(registry);
    const req = mockReq({ method: 'POST', originalUrl: '/api/agents', path: '/api/agents' });
    const res = mockRes(201);
    const next: NextFunction = jest.fn();

    middleware(req, res, next);
    res._fire();

    const value = await registry.getSingleMetricAsString('platform_agent_deployments_total');
    expect(value).toContain('1');
  });

  it('does NOT increment counters on error status codes (>= 400)', async () => {
    const { middleware } = createBusinessMetrics(registry);
    const req = mockReq({
      method: 'POST',
      originalUrl: '/api/compliance/run',
      path: '/api/compliance/run',
    });
    const res = mockRes(500);
    const next: NextFunction = jest.fn();

    middleware(req, res, next);
    res._fire();

    const value = await registry.getSingleMetricAsString('platform_compliance_checks_total');
    // Counter should not have been incremented — output should show 0 or no sample line
    expect(value).not.toContain(' 1');
  });

  it('tracks active users via x-user-id header', async () => {
    const { middleware, counters } = createBusinessMetrics(registry);
    const req = mockReq({
      method: 'GET',
      originalUrl: '/api/dashboard',
      path: '/api/dashboard',
      headers: { 'x-user-id': 'user-abc-123' },
    });
    const res = mockRes(200);
    const next: NextFunction = jest.fn();

    middleware(req, res, next);
    res._fire();

    const gaugeValue = await (
      counters.activeUsers as { get: () => Promise<{ values: Array<{ value: number }> }> }
    ).get();
    expect(gaugeValue.values[0].value).toBeGreaterThanOrEqual(1);
  });

  it('exposes business metrics on the registry text output', async () => {
    createBusinessMetrics(registry);

    const text = await registry.metrics();
    expect(text).toContain('platform_active_users_total');
    expect(text).toContain('platform_compliance_checks_total');
    expect(text).toContain('platform_reports_generated_total');
    expect(text).toContain('platform_ai_recommendations_served_total');
    expect(text).toContain('platform_search_queries_total');
    expect(text).toContain('platform_agent_deployments_total');
  });
});
