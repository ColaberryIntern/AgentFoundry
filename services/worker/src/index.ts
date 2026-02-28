import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { connectDb, closeDb } from './utils/db';
import { connectRabbitMQ, closeRabbitMQ } from './utils/rabbitmq';
import logger from './utils/logger';

import { runComplianceChecker } from './jobs/complianceChecker';
import { runAgentManager } from './jobs/agentManager';
import { runNotificationDispatcher } from './jobs/notificationDispatcher';
import { runRecommendationGenerator } from './jobs/recommendationGenerator';
import { runCalendarManager } from './jobs/calendarManager';
import { runReportScheduler } from './jobs/reportScheduler';
import { runIndustrySeeder } from './jobs/industrySeeder';
import { runTaxonomySeeder } from './jobs/taxonomySeeder';
import {
  runNaicsUpdateAgent,
  runRegulatoryChangeAgent,
  runTaxonomyGapAgent,
  runOntologyIntegrityAgent,
  runPerformanceDriftAgent,
  runUseCaseReplicationAgent,
} from './jobs/registryAgents';

// ---------------------------------------------------------------------------
// Wrap job execution with error handling and logging
// ---------------------------------------------------------------------------
async function runJob(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    logger.info(`Job completed in ${Date.now() - start}ms`, { job: name });
  } catch (err) {
    logger.error(`Job failed after ${Date.now() - start}ms`, {
      job: name,
      error: (err as Error).message,
    });
  }
}

// ---------------------------------------------------------------------------
// Startup — run seed jobs immediately, then schedule recurring jobs
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  logger.info('Agent Foundry Worker Service starting...');

  // Connect to database and message queue
  await connectDb();
  await connectRabbitMQ();

  logger.info('Running initial seed jobs...');

  // Phase 1: Seed NAICS industries + taxonomy (must run before other jobs)
  await runJob('industrySeeder', runIndustrySeeder);
  await runJob('taxonomySeeder', runTaxonomySeeder);

  // Phase 2: Run existing seed-capable jobs
  await runJob('agentManager', runAgentManager);
  await runJob('calendarManager', runCalendarManager);
  await runJob('reportScheduler', runReportScheduler);
  await runJob('complianceChecker', runComplianceChecker);
  await runJob('recommendationGenerator', runRecommendationGenerator);
  await runJob('notificationDispatcher', runNotificationDispatcher);

  logger.info('Initial seed complete. Starting scheduled jobs...');

  // -------------------------------------------------------------------------
  // Schedule recurring jobs
  // -------------------------------------------------------------------------

  // Agent health & metrics — every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    runJob('agentManager', runAgentManager);
  });

  // Notification dispatcher — every 10 minutes
  cron.schedule('*/10 * * * *', () => {
    runJob('notificationDispatcher', runNotificationDispatcher);
  });

  // Compliance checks — every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    runJob('complianceChecker', runComplianceChecker);
  });

  // Recommendations — every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    runJob('recommendationGenerator', runRecommendationGenerator);
  });

  // Report scheduler — every hour
  cron.schedule('0 * * * *', () => {
    runJob('reportScheduler', runReportScheduler);
  });

  // Calendar manager — daily at midnight
  cron.schedule('0 0 * * *', () => {
    runJob('calendarManager', runCalendarManager);
  });

  // -------------------------------------------------------------------------
  // Registry background agents
  // -------------------------------------------------------------------------

  // Performance drift agent — every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    runJob('performanceDriftAgent', runPerformanceDriftAgent);
  });

  // Regulatory change agent — daily at 2 AM
  cron.schedule('0 2 * * *', () => {
    runJob('regulatoryChangeAgent', runRegulatoryChangeAgent);
  });

  // Ontology integrity agent — nightly at 4 AM
  cron.schedule('0 4 * * *', () => {
    runJob('ontologyIntegrityAgent', runOntologyIntegrityAgent);
  });

  // Taxonomy gap agent — weekly on Monday at 3 AM
  cron.schedule('0 3 * * 1', () => {
    runJob('taxonomyGapAgent', runTaxonomyGapAgent);
  });

  // Use case replication agent — weekly on Monday at 5 AM
  cron.schedule('0 5 * * 1', () => {
    runJob('useCaseReplicationAgent', runUseCaseReplicationAgent);
  });

  // NAICS update agent — quarterly (1st of Jan, Apr, Jul, Oct)
  cron.schedule('0 0 1 1,4,7,10 *', () => {
    runJob('naicsUpdateAgent', runNaicsUpdateAgent);
  });

  logger.info(
    [
      '',
      'Agent Foundry Worker v2.0.0',
      '==========================================',
      'Scheduled jobs:',
      '  Agent Manager:           every 5 min',
      '  Notification Dispatcher: every 10 min',
      '  Compliance Checker:      every 15 min',
      '  Recommendation Engine:   every 30 min',
      '  Performance Drift Agent: every 30 min',
      '  Report Scheduler:        every hour',
      '  Regulatory Change Agent: daily at 2 AM',
      '  Ontology Integrity:      nightly at 4 AM',
      '  Calendar Manager:        daily at midnight',
      '  Taxonomy Gap Agent:      weekly (Mon 3 AM)',
      '  Use Case Replication:    weekly (Mon 5 AM)',
      '  NAICS Update Agent:      quarterly',
      '==========================================',
      '  NAICS industries seeded: 24 sectors',
      '  Registry agents active:  12 total',
      '==========================================',
      '',
    ].join('\n'),
  );
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal} — shutting down gracefully...`);
  await closeRabbitMQ();
  await closeDb();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch((err) => {
  logger.error('Worker failed to start', { error: (err as Error).message });
  process.exit(1);
});
