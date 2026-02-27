import { Router, Request, Response } from 'express';

const router = Router();

const startTime = Date.now();

/**
 * GET /health
 *
 * Lightweight liveness probe used by load balancers, container orchestrators,
 * and monitoring dashboards.
 */
router.get('/', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    version: '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: {
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
    },
  });
});

export default router;
