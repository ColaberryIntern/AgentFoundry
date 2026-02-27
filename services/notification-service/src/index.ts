import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import notificationRouter from './routes/notifications';
import webhookRouter from './routes/webhooks';
import { errorHandler } from './middleware/errorHandler';
import { initModels } from './models';
import { setupWebSocket } from './ws/notificationWs';
import { setupDashboardWebSocket } from './ws/dashboardWs';
import dashboardEventsRouter from './routes/dashboardEvents';
import { rabbitmqConsumer } from './utils/rabbitmq';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3005', 10);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(compression());

// Metrics endpoint — before auth-protected routes
app.get('/metrics', metricsEndpoint);
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

app.use('/health', healthRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/dashboard-events', dashboardEventsRouter);

app.use(errorHandler);

/**
 * Creates an HTTP server with WebSocket support for both notifications and dashboard.
 * Separated from module-level code so tests that only need the Express
 * app (via supertest) don't leak open handles from the WS heartbeat.
 */
function createServer(): {
  server: http.Server;
  wss: ReturnType<typeof setupWebSocket>;
  dashboardWss: ReturnType<typeof setupDashboardWebSocket>;
} {
  const server = http.createServer(app);
  const wss = setupWebSocket(server);
  const dashboardWss = setupDashboardWebSocket(server);
  return { server, wss, dashboardWss };
}

if (require.main === module) {
  const { server } = createServer();

  initModels()
    .then(() => {
      server.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Notification Service listening on port ${PORT}`);
      });

      // Start RabbitMQ consumer (not in test mode)
      if (process.env.NODE_ENV !== 'test') {
        rabbitmqConsumer.connect().catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[notification-service] RabbitMQ consumer startup warning:', err);
        });
      }
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[notification-service] Failed to initialize models:', err);
      process.exit(1);
    });
}

export default app;
export { createServer };
