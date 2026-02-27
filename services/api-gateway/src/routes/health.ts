import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 *
 * Lightweight liveness probe used by load balancers, container orchestrators,
 * and monitoring dashboards.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

export default router;
