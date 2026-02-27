/**
 * Master seed script
 *
 * Connects to PostgreSQL via DATABASE_URL and runs all seeders in order.
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx ts-node scripts/seed/index.ts
 *   npm run seed
 */
import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

import { seedRegulations } from './seed-regulations';
import { seedAgentTemplates } from './seed-agent-templates';
import { seedReportTemplates } from './seed-report-templates';

dotenv.config();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[seed] ${new Date().toISOString()} — ${message}`);
}

function logError(message: string): void {
  // eslint-disable-next-line no-console
  console.error(`[seed] ${new Date().toISOString()} — ERROR: ${message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logError('DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  log('Connecting to database...');
  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    log('Database connection established.');

    // Run seeders in order
    log('Seeding regulations...');
    const regCount = await seedRegulations(sequelize);
    log(`Regulations seeded: ${regCount} new records.`);

    log('Seeding agent templates...');
    const agentCount = await seedAgentTemplates(sequelize);
    log(`Agent templates seeded: ${agentCount} new records.`);

    log('Seeding report templates...');
    const reportCount = await seedReportTemplates(sequelize);
    log(`Report templates seeded: ${reportCount} new records.`);

    log('All seeders completed successfully.');
    log(
      `Summary: ${regCount} regulations, ${agentCount} agent templates, ${reportCount} report templates.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Seeding failed: ${message}`);
    process.exit(1);
  } finally {
    await sequelize.close();
    log('Database connection closed.');
  }
}

main();
