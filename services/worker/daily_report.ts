/**
 * Daily Report Worker
 *
 * Generates a daily executive summary per CLAUDE.md requirements.
 * Reads from the database and produces a structured JSON report saved
 * to the reports/ directory.
 *
 * This is a script — not a running service. Run via cron or:
 *   npm run daily-report
 *   npx ts-node services/worker/daily_report.ts
 */
import { Sequelize, QueryTypes } from 'sequelize';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ComplianceStatusSummary {
  compliant: number;
  non_compliant: number;
  pending: number;
  review: number;
}

interface RecommendationBreakdown {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

interface AgentStackHealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  unknown: number;
}

interface ModelInferenceStats {
  totalRequests: number;
  avgLatencyMs: number;
}

interface DailyReport {
  generatedAt: string;
  dateRange: {
    from: string;
    to: string;
  };
  complianceStatus: ComplianceStatusSummary;
  recommendations: RecommendationBreakdown;
  agentStackHealth: AgentStackHealthSummary;
  modelInference: ModelInferenceStats;
  openEscalations: number;
  riskFlags: string[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[daily-report] ${new Date().toISOString()} — ${message}`);
}

function logError(message: string): void {
  // eslint-disable-next-line no-console
  console.error(`[daily-report] ${new Date().toISOString()} — ERROR: ${message}`);
}

// ---------------------------------------------------------------------------
// Data queries
// ---------------------------------------------------------------------------
async function getComplianceStatus(
  sequelize: Sequelize,
  since: Date,
): Promise<ComplianceStatusSummary> {
  const results = await sequelize
    .query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::int as count
     FROM compliance_records
     WHERE "createdAt" >= :since
     GROUP BY status`,
      { replacements: { since }, type: QueryTypes.SELECT },
    )
    .catch(() => []);

  const summary: ComplianceStatusSummary = {
    compliant: 0,
    non_compliant: 0,
    pending: 0,
    review: 0,
  };

  for (const row of results) {
    const key = row.status as keyof ComplianceStatusSummary;
    if (key in summary) {
      summary[key] = parseInt(String(row.count), 10);
    }
  }

  return summary;
}

async function getRecommendations(
  sequelize: Sequelize,
  since: Date,
): Promise<RecommendationBreakdown> {
  const byType = await sequelize
    .query<{ type: string; count: string }>(
      `SELECT type, COUNT(*)::int as count
     FROM recommendations
     WHERE created_at >= :since
     GROUP BY type`,
      { replacements: { since }, type: QueryTypes.SELECT },
    )
    .catch(() => []);

  const bySeverity = await sequelize
    .query<{ severity: string; count: string }>(
      `SELECT severity, COUNT(*)::int as count
     FROM recommendations
     WHERE created_at >= :since
     GROUP BY severity`,
      { replacements: { since }, type: QueryTypes.SELECT },
    )
    .catch(() => []);

  const typeMap: Record<string, number> = {};
  let total = 0;
  for (const row of byType) {
    const count = parseInt(String(row.count), 10);
    typeMap[row.type] = count;
    total += count;
  }

  const sevMap: Record<string, number> = {};
  for (const row of bySeverity) {
    sevMap[row.severity] = parseInt(String(row.count), 10);
  }

  return { total, byType: typeMap, bySeverity: sevMap };
}

async function getAgentStackHealth(sequelize: Sequelize): Promise<AgentStackHealthSummary> {
  const results = await sequelize
    .query<{ health_status: string; count: string }>(
      `SELECT health_status, COUNT(*)::int as count
     FROM agent_stacks
     GROUP BY health_status`,
      { type: QueryTypes.SELECT },
    )
    .catch(() => []);

  const summary: AgentStackHealthSummary = {
    total: 0,
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
    unknown: 0,
  };

  for (const row of results) {
    const key = row.health_status as keyof Omit<AgentStackHealthSummary, 'total'>;
    if (key in summary && key !== 'total') {
      const count = parseInt(String(row.count), 10);
      (summary as Record<string, number>)[key] = count;
      summary.total += count;
    }
  }

  return summary;
}

async function getModelInferenceStats(
  sequelize: Sequelize,
  since: Date,
): Promise<ModelInferenceStats> {
  // user_interactions table tracks inference requests when it exists
  const results = await sequelize
    .query<{ total: string; avg_latency: string }>(
      `SELECT
       COUNT(*)::int as total,
       COALESCE(AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000), 0)::float as avg_latency
     FROM user_interactions
     WHERE "createdAt" >= :since`,
      { replacements: { since }, type: QueryTypes.SELECT },
    )
    .catch(() => [{ total: '0', avg_latency: '0' }]);

  const row = results[0] || { total: '0', avg_latency: '0' };
  return {
    totalRequests: parseInt(String(row.total), 10),
    avgLatencyMs: Math.round(parseFloat(String(row.avg_latency)) * 100) / 100,
  };
}

function getOpenEscalations(): number {
  const escalationPath = path.resolve('/tmp/escalation.json');
  try {
    if (fs.existsSync(escalationPath)) {
      const data = JSON.parse(fs.readFileSync(escalationPath, 'utf-8'));
      return Array.isArray(data) ? data.length : 1;
    }
  } catch {
    // File doesn't exist or is invalid — no escalations
  }
  return 0;
}

function buildRiskFlags(
  compliance: ComplianceStatusSummary,
  recommendations: RecommendationBreakdown,
  agentHealth: AgentStackHealthSummary,
): string[] {
  const flags: string[] = [];

  if (compliance.non_compliant > 0) {
    flags.push(`${compliance.non_compliant} non-compliant records detected`);
  }

  const criticalRecs = recommendations.bySeverity['critical'] || 0;
  if (criticalRecs > 0) {
    flags.push(`${criticalRecs} critical severity recommendations pending`);
  }

  if (agentHealth.unhealthy > 0) {
    flags.push(`${agentHealth.unhealthy} agent stacks in unhealthy state`);
  }

  if (agentHealth.total > 0 && agentHealth.unknown === agentHealth.total) {
    flags.push('All agent stacks have unknown health status');
  }

  return flags;
}

function buildSummary(
  compliance: ComplianceStatusSummary,
  recommendations: RecommendationBreakdown,
  agentHealth: AgentStackHealthSummary,
  riskFlags: string[],
): string {
  const totalCompliance =
    compliance.compliant + compliance.non_compliant + compliance.pending + compliance.review;
  const complianceRate =
    totalCompliance > 0 ? Math.round((compliance.compliant / totalCompliance) * 100) : 0;

  const parts: string[] = [
    `Compliance rate: ${complianceRate}% (${compliance.compliant}/${totalCompliance} records).`,
    `New recommendations: ${recommendations.total}.`,
    `Agent stacks: ${agentHealth.total} total, ${agentHealth.healthy} healthy.`,
  ];

  if (riskFlags.length > 0) {
    parts.push(`Risk flags: ${riskFlags.length}.`);
  } else {
    parts.push('No risk flags.');
  }

  return parts.join(' ');
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

  log('Starting daily report generation...');
  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    log('Database connection established.');

    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    log('Querying compliance status...');
    const complianceStatus = await getComplianceStatus(sequelize, since);

    log('Querying recommendations...');
    const recommendations = await getRecommendations(sequelize, since);

    log('Querying agent stack health...');
    const agentStackHealth = await getAgentStackHealth(sequelize);

    log('Querying model inference stats...');
    const modelInference = await getModelInferenceStats(sequelize, since);

    log('Checking open escalations...');
    const openEscalations = getOpenEscalations();

    const riskFlags = buildRiskFlags(complianceStatus, recommendations, agentStackHealth);
    const summary = buildSummary(complianceStatus, recommendations, agentStackHealth, riskFlags);

    const report: DailyReport = {
      generatedAt: now.toISOString(),
      dateRange: {
        from: since.toISOString(),
        to: now.toISOString(),
      },
      complianceStatus,
      recommendations,
      agentStackHealth,
      modelInference,
      openEscalations,
      riskFlags,
      summary,
    };

    // Save report
    const reportsDir = path.resolve(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const dateStr = now.toISOString().split('T')[0];
    const filename = `daily-report-${dateStr}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
    log(`Report saved to: ${filepath}`);

    log('--- Executive Summary ---');
    log(summary);
    if (riskFlags.length > 0) {
      log('Risk flags:');
      for (const flag of riskFlags) {
        log(`  - ${flag}`);
      }
    }
    log('Daily report generation complete.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Report generation failed: ${message}`);
    process.exit(1);
  } finally {
    await sequelize.close();
    log('Database connection closed.');
  }
}

main();
