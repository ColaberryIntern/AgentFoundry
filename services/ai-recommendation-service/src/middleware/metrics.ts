import { Request, Response, NextFunction } from 'express';
import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// AI-specific custom metrics
export const aiInferenceDuration = new Histogram({
  name: 'ai_inference_duration_seconds',
  help: 'AI model inference duration in seconds',
  labelNames: ['model_name', 'model_version', 'endpoint'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const aiRecommendationsGenerated = new Counter({
  name: 'ai_recommendations_generated_total',
  help: 'Total AI recommendations generated',
  labelNames: ['type', 'severity'],
  registers: [register],
});

export const aiModelStatus = new Gauge({
  name: 'ai_model_status',
  help: 'Current status of AI models (1=training, 2=ready, 3=deployed, 4=deprecated)',
  labelNames: ['model_name', 'model_version'],
  registers: [register],
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration,
    );
  });
  next();
};

export const metricsEndpoint = async (_req: Request, res: Response): Promise<void> => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};
