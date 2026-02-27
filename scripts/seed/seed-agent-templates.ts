/**
 * Seed script — Agent stack templates
 *
 * Inserts pre-configured agent templates into the agent_stacks table.
 * Idempotent: uses findOrCreate keyed on name + system userId.
 */
import { Sequelize, DataTypes, Model } from 'sequelize';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AgentTemplateSeed {
  name: string;
  type: 'compliance_monitor' | 'risk_analyzer' | 'regulatory_tracker' | 'audit_agent' | 'custom';
  description: string;
  configuration: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
export const agentTemplates: AgentTemplateSeed[] = [
  {
    name: 'GDPR Monitor',
    type: 'compliance_monitor',
    description:
      'Monitors GDPR compliance across data processing activities, consent management, and data subject rights.',
    configuration: {
      regulations: ['GDPR'],
      checkInterval: '6h',
      alertThreshold: 0.85,
      modules: ['consent-tracker', 'data-mapping', 'breach-detector'],
      notifyOnViolation: true,
    },
  },
  {
    name: 'SOX Compliance Tracker',
    type: 'compliance_monitor',
    description:
      'Tracks SOX compliance for financial reporting controls, audit trails, and internal controls.',
    configuration: {
      regulations: ['SOX'],
      checkInterval: '24h',
      alertThreshold: 0.9,
      modules: ['financial-controls', 'audit-trail', 'access-review'],
      notifyOnViolation: true,
      reportingPeriod: 'quarterly',
    },
  },
  {
    name: 'Risk Analyzer',
    type: 'risk_analyzer',
    description:
      'Analyzes compliance risk across multiple regulations and generates risk scores with mitigation recommendations.',
    configuration: {
      regulations: ['GDPR', 'HIPAA', 'SOX', 'PCI-DSS'],
      riskModel: 'weighted-multi-factor',
      scoringMethod: 'quantitative',
      refreshInterval: '12h',
      riskCategories: ['data-privacy', 'financial', 'operational', 'reputational'],
    },
  },
  {
    name: 'Regulatory Change Monitor',
    type: 'regulatory_tracker',
    description:
      'Monitors regulatory landscape changes and alerts on new or amended regulations that may affect the organization.',
    configuration: {
      jurisdictions: ['US', 'EU', 'UK', 'CA'],
      categories: ['Data Privacy', 'Financial', 'Healthcare', 'Cybersecurity'],
      sources: ['federal-register', 'eu-lex', 'regulatory-feeds'],
      checkInterval: '4h',
      impactAnalysis: true,
    },
  },
  {
    name: 'Audit Scheduler',
    type: 'audit_agent',
    description:
      'Automates audit scheduling, evidence collection, and finding tracking for internal and external audits.',
    configuration: {
      auditTypes: ['internal', 'external', 'certification'],
      defaultCadence: 'annual',
      evidenceRetentionDays: 2555,
      autoCollectEvidence: true,
      findingCategories: ['critical', 'major', 'minor', 'observation'],
      reminderDays: [30, 14, 7, 1],
    },
  },
];

// ---------------------------------------------------------------------------
// Minimal inline model
// ---------------------------------------------------------------------------
class AgentStack extends Model {}

function defineModel(sequelize: Sequelize): typeof AgentStack {
  AgentStack.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.STRING, allowNull: false, field: 'user_id' },
      name: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      type: {
        type: DataTypes.ENUM(
          'compliance_monitor',
          'risk_analyzer',
          'regulatory_tracker',
          'audit_agent',
          'custom',
        ),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('draft', 'deploying', 'running', 'paused', 'stopped', 'error'),
        allowNull: false,
        defaultValue: 'draft',
      },
      configuration: { type: DataTypes.JSON, allowNull: true },
      metrics: { type: DataTypes.JSON, allowNull: true },
      healthStatus: {
        type: DataTypes.ENUM('healthy', 'degraded', 'unhealthy', 'unknown'),
        allowNull: false,
        defaultValue: 'unknown',
        field: 'health_status',
      },
      lastHealthCheck: { type: DataTypes.DATE, allowNull: true, field: 'last_health_check' },
      deployedAt: { type: DataTypes.DATE, allowNull: true, field: 'deployed_at' },
    },
    {
      sequelize,
      tableName: 'agent_stacks',
      timestamps: true,
      underscored: false,
    },
  );
  return AgentStack;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
export async function seedAgentTemplates(sequelize: Sequelize): Promise<number> {
  const Model = defineModel(sequelize);
  await Model.sync();

  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
  let created = 0;

  for (const tpl of agentTemplates) {
    const [, wasCreated] = await Model.findOrCreate({
      where: { name: tpl.name, userId: SYSTEM_USER_ID },
      defaults: {
        userId: SYSTEM_USER_ID,
        name: tpl.name,
        description: tpl.description,
        type: tpl.type,
        status: 'draft',
        configuration: tpl.configuration,
        metrics: null,
        healthStatus: 'unknown',
      },
    });
    if (wasCreated) created++;
  }

  return created;
}
