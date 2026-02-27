/**
 * Seed script — Report templates
 *
 * Inserts pre-configured report templates into the report_templates table.
 * Idempotent: uses findOrCreate keyed on name + system userId.
 */
import { Sequelize, DataTypes, Model } from 'sequelize';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ReportType =
  | 'compliance_summary'
  | 'risk_assessment'
  | 'audit_trail'
  | 'regulatory_status';

export interface ReportTemplateSeed {
  name: string;
  description: string;
  reportType: ReportType;
  layout: string;
  sections: Array<{
    title: string;
    type: string;
    description: string;
  }>;
  filters: Array<{
    field: string;
    label: string;
    type: string;
  }>;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
export const reportTemplates: ReportTemplateSeed[] = [
  {
    name: 'Monthly Compliance Summary',
    description: 'Executive-level monthly overview of compliance status across all regulations.',
    reportType: 'compliance_summary',
    layout: 'executive-dashboard',
    sections: [
      {
        title: 'Overall Compliance Score',
        type: 'metric-card',
        description: 'Aggregate compliance percentage',
      },
      {
        title: 'Regulation Breakdown',
        type: 'table',
        description: 'Per-regulation compliance status',
      },
      { title: 'Trend Analysis', type: 'line-chart', description: '30-day compliance trend' },
      { title: 'Open Issues', type: 'list', description: 'Unresolved compliance findings' },
      {
        title: 'Recommendations',
        type: 'list',
        description: 'AI-generated compliance recommendations',
      },
    ],
    filters: [
      { field: 'dateRange', label: 'Date Range', type: 'date-range' },
      { field: 'regulation', label: 'Regulation', type: 'multi-select' },
      { field: 'status', label: 'Status', type: 'select' },
    ],
  },
  {
    name: 'Regulatory Gap Analysis',
    description:
      'Detailed analysis of gaps between current compliance posture and regulatory requirements.',
    reportType: 'regulatory_status',
    layout: 'detailed-report',
    sections: [
      {
        title: 'Gap Summary',
        type: 'metric-card',
        description: 'Total gaps identified and severity distribution',
      },
      {
        title: 'Gap Details',
        type: 'table',
        description: 'Detailed gap inventory with remediation status',
      },
      {
        title: 'Risk Matrix',
        type: 'heatmap',
        description: 'Likelihood vs impact matrix for identified gaps',
      },
      {
        title: 'Remediation Timeline',
        type: 'gantt-chart',
        description: 'Planned remediation activities and deadlines',
      },
    ],
    filters: [
      { field: 'regulation', label: 'Regulation', type: 'multi-select' },
      { field: 'severity', label: 'Severity', type: 'select' },
      { field: 'status', label: 'Remediation Status', type: 'select' },
    ],
  },
  {
    name: 'Risk Assessment Report',
    description:
      'Comprehensive risk assessment with quantitative scoring and mitigation strategies.',
    reportType: 'risk_assessment',
    layout: 'detailed-report',
    sections: [
      {
        title: 'Risk Overview',
        type: 'metric-card',
        description: 'Overall risk score and category breakdown',
      },
      {
        title: 'Risk Register',
        type: 'table',
        description: 'Full risk register with scores and owners',
      },
      { title: 'Risk Trends', type: 'line-chart', description: 'Risk score trends over time' },
      {
        title: 'Mitigation Plans',
        type: 'list',
        description: 'Active mitigation strategies and progress',
      },
      {
        title: 'Residual Risk',
        type: 'bar-chart',
        description: 'Residual risk after controls applied',
      },
    ],
    filters: [
      { field: 'dateRange', label: 'Date Range', type: 'date-range' },
      { field: 'category', label: 'Risk Category', type: 'multi-select' },
      { field: 'severity', label: 'Severity', type: 'select' },
      { field: 'owner', label: 'Risk Owner', type: 'select' },
    ],
  },
  {
    name: 'Audit Trail Report',
    description: 'Complete audit trail of system activities, compliance changes, and user actions.',
    reportType: 'audit_trail',
    layout: 'log-report',
    sections: [
      { title: 'Activity Summary', type: 'metric-card', description: 'Total actions by category' },
      { title: 'Timeline', type: 'timeline', description: 'Chronological activity log' },
      { title: 'User Actions', type: 'table', description: 'Actions grouped by user' },
      {
        title: 'Compliance Changes',
        type: 'table',
        description: 'Compliance status change history',
      },
    ],
    filters: [
      { field: 'dateRange', label: 'Date Range', type: 'date-range' },
      { field: 'userId', label: 'User', type: 'select' },
      { field: 'actionType', label: 'Action Type', type: 'multi-select' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Minimal inline model
// ---------------------------------------------------------------------------
class ReportTemplate extends Model {}

function defineModel(sequelize: Sequelize): typeof ReportTemplate {
  ReportTemplate.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      reportType: {
        type: DataTypes.ENUM(
          'compliance_summary',
          'risk_assessment',
          'audit_trail',
          'regulatory_status',
        ),
        allowNull: false,
        field: 'report_type',
      },
      defaultParameters: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        field: 'default_parameters',
      },
      sections: { type: DataTypes.JSON, allowNull: true, defaultValue: null },
      isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_public',
      },
      createdAt: { type: DataTypes.DATE, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
    },
    {
      sequelize,
      tableName: 'report_templates',
      timestamps: true,
      underscored: false,
    },
  );
  return ReportTemplate;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
export async function seedReportTemplates(sequelize: Sequelize): Promise<number> {
  const Model = defineModel(sequelize);
  await Model.sync();

  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
  let created = 0;

  for (const tpl of reportTemplates) {
    const [, wasCreated] = await Model.findOrCreate({
      where: { name: tpl.name, userId: SYSTEM_USER_ID },
      defaults: {
        userId: SYSTEM_USER_ID,
        name: tpl.name,
        description: tpl.description,
        reportType: tpl.reportType,
        defaultParameters: { layout: tpl.layout, filters: tpl.filters },
        sections: tpl.sections,
        isPublic: true,
      },
    });
    if (wasCreated) created++;
  }

  return created;
}
