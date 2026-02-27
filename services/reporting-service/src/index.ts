import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import reportsRouter from './routes/reports';
import templatesRouter from './routes/templates';
import schedulesRouter from './routes/schedules';
import { errorHandler } from './middleware/errorHandler';
import { initModels } from './models';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.REPORTING_SERVICE_PORT || '3003', 10);

app.use(helmet());
app.use(cors());
app.use(express.json());

// Metrics endpoint — before auth-protected routes
app.get('/metrics', metricsEndpoint);
app.use(metricsMiddleware);

// Disable request logging during tests to keep output clean
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
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
        console.log(`Reporting Service listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

export default app;
