import { queryRows, execSql } from '../utils/db';
import logger from '../utils/logger';

const JOB = 'agentManager';

const SEED_AGENTS = [
  {
    name: 'GDPR Compliance Monitor',
    description: 'Continuously monitors data protection compliance across all systems',
    type: 'compliance_monitor',
    configuration: { regulations: ['GDPR-2016-679'], checkInterval: '15m', alertThreshold: 0.85 },
  },
  {
    name: 'Financial Risk Analyzer',
    description: 'Analyzes financial controls and SOX compliance risks in real-time',
    type: 'risk_analyzer',
    configuration: {
      regulations: ['SOX-2002', 'PCI-DSS-4.0'],
      riskModel: 'gradient_boosting',
      sensitivity: 'medium',
    },
  },
  {
    name: 'Regulatory Change Tracker',
    description: 'Tracks and alerts on regulatory changes across HIPAA, CCPA, and NIST frameworks',
    type: 'regulatory_tracker',
    configuration: {
      regulations: ['HIPAA-1996', 'CCPA-2018', 'NIST-CSF-2.0'],
      sources: ['federalregister', 'iapp'],
      pollInterval: '1h',
    },
  },
  {
    name: 'ISO 27001 Audit Agent',
    description: 'Automated audit checks for ISO 27001 ISMS requirements',
    type: 'audit_agent',
    configuration: {
      regulations: ['ISO-27001-2022'],
      auditScope: 'full',
      evidenceCollection: true,
    },
  },
];

function generateId(): string {
  // Simple UUID v4 without crypto import
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function runAgentManager(): Promise<void> {
  try {
    // Get the first IT admin user for agent ownership
    const admins = await queryRows("SELECT id FROM users WHERE role = 'it_admin' LIMIT 1");
    const adminId = (admins[0]?.id ?? 1).toString();

    // Check if agents exist
    const countRows = await queryRows('SELECT COUNT(*)::int as count FROM agent_stacks');
    const agentCount = parseInt(countRows[0]?.count ?? '0', 10);

    // Seed agents if none exist
    if (agentCount === 0) {
      for (const agent of SEED_AGENTS) {
        const id = generateId();
        await execSql(
          `INSERT INTO agent_stacks
            (id, user_id, name, description, type, status, configuration, metrics, health_status, deployed_at, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5::enum_agent_stacks_type, 'running'::enum_agent_stacks_status, $6, $7, 'healthy'::enum_agent_stacks_health_status, NOW(), NOW(), NOW())`,
          [
            id,
            adminId,
            agent.name,
            agent.description,
            agent.type,
            JSON.stringify(agent.configuration),
            JSON.stringify({
              checksCompleted: Math.floor(Math.random() * 500) + 100,
              alertsGenerated: Math.floor(Math.random() * 20),
              lastCheckDuration: Math.floor(Math.random() * 3000) + 500,
              uptime: '7d 4h 22m',
            }),
          ],
        );
      }
      logger.info(`Seeded ${SEED_AGENTS.length} agents`, { job: JOB });
    }

    // Update metrics for running agents
    const agents = await queryRows(
      "SELECT id, metrics, health_status FROM agent_stacks WHERE status = 'running'",
    );

    for (const agent of agents) {
      let metrics: Record<string, unknown>;
      try {
        metrics =
          typeof agent.metrics === 'string' ? JSON.parse(agent.metrics) : agent.metrics || {};
      } catch {
        metrics = {};
      }

      // Increment checks completed
      const checksCompleted =
        ((metrics.checksCompleted as number) || 0) + Math.floor(Math.random() * 5) + 1;
      const alertsGenerated =
        ((metrics.alertsGenerated as number) || 0) + (Math.random() < 0.15 ? 1 : 0);
      const lastCheckDuration = Math.floor(Math.random() * 3000) + 200;

      // Occasionally degrade health (~5%) or recover
      let healthStatus = agent.health_status;
      if (healthStatus === 'healthy' && Math.random() < 0.05) {
        healthStatus = 'degraded';
      } else if (healthStatus === 'degraded' && Math.random() < 0.6) {
        healthStatus = 'healthy';
      } else if (healthStatus === 'unhealthy' && Math.random() < 0.3) {
        healthStatus = 'degraded';
      }

      const updatedMetrics = JSON.stringify({
        ...metrics,
        checksCompleted,
        alertsGenerated,
        lastCheckDuration,
        uptime: `${Math.floor(checksCompleted / 12)}d ${Math.floor(Math.random() * 24)}h`,
      });

      await execSql(
        `UPDATE agent_stacks
         SET metrics = $1::json, health_status = $2::enum_agent_stacks_health_status, last_health_check = NOW(), "updatedAt" = NOW()
         WHERE id = $3`,
        [updatedMetrics, healthStatus, agent.id],
      );
    }

    if (agents.length > 0) {
      logger.info(`Updated metrics for ${agents.length} running agents`, { job: JOB });
    }
  } catch (err: any) {
    logger.error('Agent manager failed', { job: JOB, error: err.message });
  }
}
