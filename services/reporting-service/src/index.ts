import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import reportsRouter from './routes/reports';
import templatesRouter from './routes/templates';
import schedulesRouter from './routes/schedules';
import { errorHandler } from './middleware/errorHandler';
import { initModels } from './models';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.REPORTING_SERVICE_PORT || '3003', 10);

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
app.use('/api/reports/templates', templatesRouter);
app.use('/api/reports/schedules', schedulesRouter);
app.use('/api/reports', reportsRouter);

app.use(errorHandler);

if (require.main === module) {
  initModels()
    .then(() => {
      app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Reporting Service listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

export default app;
