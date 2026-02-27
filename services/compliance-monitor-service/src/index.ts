import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { sequelize } from './config/database';
import './models/ComplianceRecord';
import healthRouter from './routes/health';
import complianceRouter from './routes/compliance';
import dashboardRouter from './routes/dashboard';
import regulationsRouter from './routes/regulations';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';

const app = express();
const PORT = parseInt(process.env.COMPLIANCE_SERVICE_PORT || '3002', 10);

// --------------- Global Middleware ---------------
app.use(helmet());
app.use(cors());
app.use(express.json());

// Metrics endpoint — before auth-protected routes
app.get('/metrics', metricsEndpoint);
app.use(metricsMiddleware);

// Disable request logging in test environment to keep test output clean
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// --------------- Routes ---------------
app.use('/health', healthRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/regulations', regulationsRouter);

// --------------- Error Handling ---------------
app.use(errorHandler);

// --------------- Server Startup ---------------
if (require.main === module) {
  sequelize.sync().then(() => {
    app.listen(PORT, () => {
      console.log(`Compliance Monitor Service listening on port ${PORT}`);
    });
  });
}

export default app;
