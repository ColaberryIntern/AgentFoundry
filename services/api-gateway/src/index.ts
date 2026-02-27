import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerUi from 'swagger-ui-express';

import healthRouter from './routes/health';
import searchRouter from './routes/search';
import analyticsRouter from './routes/analytics';
import feedbackRouter from './routes/feedback';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import { apiVersionMiddleware, createVersionRouter } from './middleware/apiVersion';
import { correlationIdMiddleware } from './middleware/correlationId';
import { cacheResponse } from './middleware/cacheResponse';
import { sanitizeInput } from './middleware/sanitize';
import logger from './utils/logger';
import { openApiSpec } from './docs/openapi';
import { initModels } from './models';

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Sprint 18: X-Frame-Options DENY (blocks clickjacking)
    frameguard: { action: 'deny' },
    // Sprint 18: HSTS — enforce HTTPS for 1 year, include subdomains
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    // Sprint 18: X-Content-Type-Options nosniff (enabled by default in helmet, explicit here)
    noSniff: true,
  }),
);

// Sprint 18: Permissions-Policy — restrict browser features
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  );
  next();
});
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-API-Version'],
  }),
);
app.use(express.json());

// Sprint 18: Sanitize all incoming request bodies, query params, and route params
app.use(sanitizeInput);

app.use(compression());

// ---------------------------------------------------------------------------
// API Documentation — Swagger UI (BEFORE proxy routes so it is not proxied)
// ---------------------------------------------------------------------------
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Agent Foundry API',
  }),
);
app.get('/api/docs.json', (_req, res) => res.json(openApiSpec));

// ---------------------------------------------------------------------------
// Correlation ID — generate or propagate request correlation IDs
// ---------------------------------------------------------------------------
app.use(correlationIdMiddleware);

// ---------------------------------------------------------------------------
// API versioning — resolve version from header or URL
// ---------------------------------------------------------------------------
app.use(apiVersionMiddleware);

// Metrics endpoint — before rate limiter so it is not rate-limited
app.get('/metrics', metricsEndpoint);

app.use(rateLimiter);
app.use(metricsMiddleware);

// HTTP request logging via Winston (disabled during tests)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        correlationId: req.headers['x-correlation-id'] || undefined,
      });
    });
    next();
  });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health / liveness probe
app.use('/health', healthRouter);

// Search API — aggregated search across downstream services (cached 5 min)
app.use('/api/search', cacheResponse('search', 300), searchRouter);

// Analytics — engagement event tracking
app.use('/api/analytics', analyticsRouter);

// Feedback — user feedback collection and statistics
app.use('/api/feedback', feedbackRouter);

// ---------------------------------------------------------------------------
// Service proxies
// ---------------------------------------------------------------------------

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const COMPLIANCE_SERVICE_URL = process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3002';
const REPORTING_SERVICE_URL = process.env.REPORTING_SERVICE_URL || 'http://localhost:3003';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3004';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';

// Sprint 1-2: User Service proxy (auth, roles, API keys)
app.use(
  '/api/users',
  createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/users': '/api/users' },
  }),
);

// Sprint 2: Roles proxy → User Service
app.use(
  '/api/roles',
  createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/roles': '/api/roles' },
  }),
);

// Sprint 2: API Keys proxy → User Service
app.use(
  '/api/keys',
  createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/keys': '/api/keys' },
  }),
);

// Sprint 3: Compliance Service proxy
app.use(
  '/api/compliance',
  createProxyMiddleware({
    target: COMPLIANCE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/compliance': '/api/compliance' },
  }),
);

// Sprint 21: Agent Management proxy → Compliance Service
app.use(
  '/api/agents',
  createProxyMiddleware({
    target: COMPLIANCE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/agents': '/api/agents' },
  }),
);

// Sprint 3: Dashboard proxy → Compliance Service (cached 30s)
app.use(
  '/api/dashboard',
  cacheResponse('dashboard', 30),
  createProxyMiddleware({
    target: COMPLIANCE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/dashboard': '/api/dashboard' },
  }),
);

// Sprint 4: Reporting Service proxy
app.use(
  '/api/reports',
  createProxyMiddleware({
    target: REPORTING_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/reports': '/api/reports' },
  }),
);

// Sprint 4: Notification Service proxy
app.use(
  '/api/notifications',
  createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/notifications': '/api/notifications' },
  }),
);

// Sprint 10: Webhooks proxy → Notification Service
app.use(
  '/api/webhooks',
  createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/webhooks': '/api/webhooks' },
  }),
);

// Sprint 13: AI Recommendation Service proxy
app.use(
  '/api/recommendations',
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/recommendations': '/api/recommendations' },
  }),
);

// Sprint 13: AI Inference proxy → AI Recommendation Service (health cached 60s)
app.use(
  '/api/inference',
  cacheResponse('inference', 60),
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/inference': '/api/inference' },
  }),
);

// Sprint 13: AI Models proxy → AI Recommendation Service
app.use(
  '/api/models',
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/models': '/api/models' },
  }),
);

// Sprint 14: User Interactions proxy → AI Recommendation Service
app.use(
  '/api/interactions',
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/interactions': '/api/interactions' },
  }),
);

// Sprint 14: Adaptive Preferences proxy → AI Recommendation Service (cached 1 hour)
app.use(
  '/api/adaptive',
  cacheResponse('adaptive', 3600),
  createProxyMiddleware({
    target: AI_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/adaptive': '/api/adaptive' },
  }),
);

// ---------------------------------------------------------------------------
// API version prefix routing: /api/v1/* → /api/*
// ---------------------------------------------------------------------------
app.use('/api/v1', createVersionRouter(app));

// ---------------------------------------------------------------------------
// Error handling — must be last
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Server start
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.API_PORT ?? '3000', 10);

let server: ReturnType<typeof app.listen> | undefined;

if (process.env.NODE_ENV !== 'test') {
  initModels()
    .then(() => {
      server = app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`[api-gateway] listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[api-gateway] Failed to initialize database:', err);
      process.exit(1);
    });
}

export { app, server };
