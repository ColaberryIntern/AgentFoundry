import logger from '../utils/logger';
import { queryRows, execSql } from '../utils/db';

interface SettingSeed {
  key: string;
  value: unknown;
  type: 'toggle' | 'slider' | 'select' | 'number';
  category: 'autonomy' | 'guardrails' | 'scheduling' | 'marketplace';
  label: string;
  description: string;
  min?: number;
  max?: number;
}

const SETTINGS: SettingSeed[] = [
  // ── Autonomy ──
  {
    key: 'autonomy_level',
    value: 'advisory',
    type: 'select',
    category: 'autonomy',
    label: 'Autonomy Level',
    description:
      'Controls how much the orchestrator can act without approval. Advisory = all actions need approval. Semi-autonomous = low-risk auto-approved. Full = guardrails-only gating.',
  },
  {
    key: 'auto_gap_detection',
    value: true,
    type: 'toggle',
    category: 'autonomy',
    label: 'Auto-Detect Coverage Gaps',
    description: 'Automatically detect industries without agent variant coverage.',
  },
  {
    key: 'auto_drift_remediation',
    value: false,
    type: 'toggle',
    category: 'autonomy',
    label: 'Auto-Remediate Drift',
    description: 'Automatically propose remediation for drifting deployments.',
  },
  {
    key: 'auto_use_case_generation',
    value: false,
    type: 'toggle',
    category: 'autonomy',
    label: 'Auto-Generate Use Cases',
    description: 'Allow the orchestrator to propose new use cases based on coverage analysis.',
  },
  {
    key: 'auto_stack_generation',
    value: false,
    type: 'toggle',
    category: 'autonomy',
    label: 'Auto-Generate Agent Stacks',
    description: 'Allow the orchestrator to propose new agent variants and stacks.',
  },
  {
    key: 'auto_cert_low_risk',
    value: false,
    type: 'toggle',
    category: 'autonomy',
    label: 'Auto-Certify Low Risk',
    description: 'Auto-approve certification for low-risk agent variants.',
  },
  {
    key: 'allow_ontology_evolution',
    value: false,
    type: 'toggle',
    category: 'autonomy',
    label: 'Allow Ontology Evolution',
    description: 'Allow the orchestrator to propose new ontology relationships.',
  },
  {
    key: 'allow_taxonomy_expansion',
    value: false,
    type: 'toggle',
    category: 'autonomy',
    label: 'Allow Taxonomy Expansion',
    description: 'Allow the orchestrator to propose new taxonomy nodes.',
  },

  // ── Guardrails ──
  {
    key: 'approval_required_production',
    value: true,
    type: 'toggle',
    category: 'guardrails',
    label: 'Require Approval for Production',
    description:
      'All production environment changes require explicit admin approval. Cannot be overridden by autonomy level.',
  },
  {
    key: 'max_risk_threshold',
    value: 0.7,
    type: 'slider',
    category: 'guardrails',
    label: 'Risk Tolerance Threshold',
    description: 'Maximum risk score (0-1) allowed for autonomous actions.',
    min: 0,
    max: 1,
  },
  {
    key: 'max_drift_threshold',
    value: 15,
    type: 'slider',
    category: 'guardrails',
    label: 'Drift Alert Threshold (%)',
    description: 'Performance score drop percentage that triggers drift remediation.',
    min: 1,
    max: 50,
  },
  {
    key: 'max_daily_token_budget',
    value: 1000,
    type: 'number',
    category: 'guardrails',
    label: 'Daily Action Budget',
    description: 'Maximum number of orchestrator actions per day.',
    min: 1,
    max: 10000,
  },
  {
    key: 'max_monthly_token_budget',
    value: 25000,
    type: 'number',
    category: 'guardrails',
    label: 'Monthly Action Budget',
    description: 'Maximum number of orchestrator actions per month.',
    min: 1,
    max: 100000,
  },
  {
    key: 'max_concurrent_actions',
    value: 3,
    type: 'number',
    category: 'guardrails',
    label: 'Max Concurrent Actions',
    description: 'Maximum number of actions executing simultaneously.',
    min: 1,
    max: 20,
  },
  {
    key: 'log_reasoning_chain',
    value: true,
    type: 'toggle',
    category: 'guardrails',
    label: 'Log Reasoning Chain',
    description: 'Store detailed reasoning context for every orchestrator decision.',
  },

  // ── Scheduling ──
  {
    key: 'scan_interval_minutes',
    value: 10,
    type: 'number',
    category: 'scheduling',
    label: 'Scan Interval (minutes)',
    description: 'How often the orchestrator runs a full scan cycle.',
    min: 1,
    max: 60,
  },
  {
    key: 'regulatory_scan_frequency',
    value: 'daily',
    type: 'select',
    category: 'scheduling',
    label: 'Regulatory Scan Frequency',
    description: 'How often to scan for regulatory changes and certification expirations.',
  },
  {
    key: 'drift_scan_frequency',
    value: '30min',
    type: 'select',
    category: 'scheduling',
    label: 'Drift Scan Frequency',
    description: 'How often to scan for performance drift in deployments.',
  },
  {
    key: 'gap_scan_frequency',
    value: 'weekly',
    type: 'select',
    category: 'scheduling',
    label: 'Gap Scan Frequency',
    description: 'How often to scan for industry coverage gaps.',
  },

  // ── Marketplace ──
  {
    key: 'marketplace_enabled',
    value: false,
    type: 'toggle',
    category: 'marketplace',
    label: 'Enable Marketplace',
    description: 'Enable the agent marketplace for submissions and listings.',
  },
  {
    key: 'external_submission_enabled',
    value: false,
    type: 'toggle',
    category: 'marketplace',
    label: 'Allow External Submissions',
    description: 'Allow third-party agent submissions to the marketplace.',
  },
  {
    key: 'public_listing_enabled',
    value: false,
    type: 'toggle',
    category: 'marketplace',
    label: 'Public Listings',
    description: 'Make approved marketplace agents publicly visible.',
  },
  {
    key: 'require_cert_for_listing',
    value: true,
    type: 'toggle',
    category: 'marketplace',
    label: 'Require Certification for Listing',
    description: 'Agents must be certified before they can be listed in the marketplace.',
  },
];

export async function runOrchestratorSettingsSeeder(): Promise<void> {
  // Check if settings already exist
  const existing = await queryRows('SELECT COUNT(*) as cnt FROM orchestrator_settings');
  if (existing.length > 0 && (existing[0] as { cnt: number }).cnt > 0) {
    logger.info('Orchestrator settings already seeded, skipping', {
      job: 'orchestratorSettingsSeeder',
    });
    return;
  }

  logger.info(`Seeding ${SETTINGS.length} orchestrator settings...`, {
    job: 'orchestratorSettingsSeeder',
  });

  for (const s of SETTINGS) {
    await execSql(
      `INSERT INTO orchestrator_settings
        (id, setting_key, setting_value, setting_type, category, label, description, min_value, max_value, default_value, "createdAt", "updatedAt")
       VALUES
        (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (setting_key) DO NOTHING`,
      [
        s.key,
        JSON.stringify(s.value),
        s.type,
        s.category,
        s.label,
        s.description,
        s.min ?? null,
        s.max ?? null,
        JSON.stringify(s.value),
      ],
    );
  }

  logger.info(`Seeded ${SETTINGS.length} orchestrator settings`, {
    job: 'orchestratorSettingsSeeder',
  });
}
