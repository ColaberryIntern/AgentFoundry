import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { sequelize } from './config/database';
import './models/ComplianceRecord';
import './models/AgentStack';
import './models/ComplianceCalendar';
import './models/NaicsIndustry';
import './models/TaxonomyNode';
import './models/OntologyRelationship';
import './models/UseCase';
import './models/AgentSkeleton';
import './models/AgentVariant';
import './models/DeploymentInstance';
import './models/CertificationRecord';
import './models/RegistryAuditLog';
import './models/SystemIntelligence';
import './models/OrchestratorIntent';
import './models/OrchestratorAction';
import './models/OrchestratorSetting';
import './models/OrchestratorGuardrailViolation';
import './models/OrchestratorScanLog';
import './models/MarketplaceSubmission';
import healthRouter from './routes/health';
import complianceRouter from './routes/compliance';
import dashboardRouter from './routes/dashboard';
import regulationsRouter from './routes/regulations';
import agentsRouter from './routes/agents';
import calendarRouter from './routes/calendar';
import registryRouter from './routes/registry';
import orchestratorRouter from './routes/orchestrator';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import logger from './utils/logger';

const app = express();
const PORT = parseInt(process.env.COMPLIANCE_SERVICE_PORT || '3002', 10);

// --------------- Global Middleware ---------------
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

// --------------- Routes ---------------
app.use('/health', healthRouter);
app.use('/api/compliance/calendar', calendarRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/regulations', regulationsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/registry', registryRouter);
app.use('/api/registry/orchestrator', orchestratorRouter);

// --------------- Error Handling ---------------
app.use(errorHandler);

// --------------- Server Startup ---------------
if (require.main === module) {
  sequelize.sync().then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Compliance Monitor Service listening on port ${PORT}`);
    });
  });
}

export default app;
