import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { sequelize } from './config/database';
import './models'; // Register all models and associations
import healthRouter from './routes/health';
import usersRouter from './routes/users';
import preferencesRouter from './routes/preferences';
import onboardingRouter from './routes/onboarding';
import rolesRouter from './routes/roles';
import apiKeysRouter from './routes/apiKeys';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import logger from './utils/logger';

const app = express();

// --------------- Global Middleware ---------------
app.use(helmet());
app.use(cors());
app.use(express.json());

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

// --------------- Routes ---------------
app.use('/health', healthRouter);
app.use('/api/users/onboarding', authenticate, onboardingRouter);
app.use('/api/users/preferences', authenticate, preferencesRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/keys', apiKeysRouter);

// --------------- Error Handling ---------------
app.use(errorHandler);

// --------------- Server Startup ---------------
const PORT = parseInt(process.env.USER_SERVICE_PORT ?? '3001', 10);

if (require.main === module) {
  sequelize.sync().then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`[user-service] listening on port ${PORT}`);
    });
  });
}

export { app };
