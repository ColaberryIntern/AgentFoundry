import { queryRows, execSql } from '../utils/db';
import logger from '../utils/logger';

const JOB = 'taxonomySeeder';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function deterministicUuid(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash;
  }
  const h = Math.abs(hash).toString(16).padStart(12, '0');
  const s = seed.length.toString(16).padStart(4, '0');
  const c = seed
    .split('')
    .reduce((a, ch) => a + ch.charCodeAt(0), 0)
    .toString(16)
    .padStart(4, '0');
  return `${h.slice(0, 8)}-${s.slice(0, 4)}-4${c.slice(0, 3)}-8${h.slice(0, 3)}-${h.slice(0, 12)}`;
}

// ---------------------------------------------------------------------------
// Process & Function Nodes
// ---------------------------------------------------------------------------
const PROCESS_NODES = [
  {
    name: 'Data Collection',
    description: 'Gathering and ingesting data from various sources for compliance analysis',
  },
  {
    name: 'Risk Assessment',
    description: 'Evaluating and scoring risks across regulatory domains',
  },
  { name: 'Audit Management', description: 'Planning, executing, and tracking compliance audits' },
  {
    name: 'Incident Response',
    description: 'Detecting, reporting, and managing compliance incidents',
  },
  {
    name: 'Policy Enforcement',
    description: 'Applying and monitoring regulatory policies across the organization',
  },
  { name: 'Reporting', description: 'Generating compliance reports and regulatory filings' },
  { name: 'Training', description: 'Compliance training management and certification tracking' },
];

const FUNCTION_NODES = [
  {
    name: 'Monitoring',
    description: 'Continuous observation of compliance metrics and indicators',
  },
  { name: 'Detection', description: 'Identifying compliance violations and anomalies' },
  { name: 'Analysis', description: 'Deep analysis of compliance data patterns and trends' },
  {
    name: 'Remediation',
    description: 'Correcting compliance deficiencies and implementing controls',
  },
  { name: 'Certification', description: 'Managing regulatory certifications and attestations' },
  { name: 'Documentation', description: 'Maintaining compliance documentation and evidence' },
];

// ---------------------------------------------------------------------------
// Agent Skeletons (8 specialization types)
// ---------------------------------------------------------------------------
const AGENT_SKELETONS = [
  {
    name: 'Compliance Monitor Agent',
    specializationType: 'compliance_monitor',
    capabilities: [
      'real_time_monitoring',
      'threshold_alerting',
      'status_tracking',
      'regulation_mapping',
    ],
    protocol: 'event_driven',
    riskLevel: 'medium',
  },
  {
    name: 'Risk Analyzer Agent',
    specializationType: 'risk_analyzer',
    capabilities: ['risk_scoring', 'trend_analysis', 'predictive_modeling', 'scenario_simulation'],
    protocol: 'async',
    riskLevel: 'high',
  },
  {
    name: 'Regulatory Tracker Agent',
    specializationType: 'regulatory_tracker',
    capabilities: [
      'regulation_monitoring',
      'change_detection',
      'impact_assessment',
      'deadline_tracking',
    ],
    protocol: 'async',
    riskLevel: 'medium',
  },
  {
    name: 'Audit Agent',
    specializationType: 'audit_agent',
    capabilities: [
      'evidence_collection',
      'control_testing',
      'finding_documentation',
      'remediation_tracking',
    ],
    protocol: 'sync',
    riskLevel: 'high',
  },
  {
    name: 'Data Classifier Agent',
    specializationType: 'data_classifier',
    capabilities: ['data_discovery', 'sensitivity_classification', 'pii_detection', 'data_mapping'],
    protocol: 'async',
    riskLevel: 'critical',
  },
  {
    name: 'Anomaly Detector Agent',
    specializationType: 'anomaly_detector',
    capabilities: [
      'pattern_recognition',
      'outlier_detection',
      'behavioral_analysis',
      'alert_generation',
    ],
    protocol: 'event_driven',
    riskLevel: 'high',
  },
  {
    name: 'Report Generator Agent',
    specializationType: 'report_generator',
    capabilities: [
      'data_aggregation',
      'template_rendering',
      'multi_format_export',
      'scheduled_generation',
    ],
    protocol: 'async',
    riskLevel: 'low',
  },
  {
    name: 'Workflow Orchestrator Agent',
    specializationType: 'workflow_orchestrator',
    capabilities: ['task_routing', 'approval_chains', 'sla_enforcement', 'escalation_management'],
    protocol: 'event_driven',
    riskLevel: 'medium',
  },
];

// ---------------------------------------------------------------------------
// Agent Variants — industry-specific configurations
// ---------------------------------------------------------------------------
interface VariantDef {
  skeletonType: string;
  industryCode: string;
  regulationId: string | null;
  name: string;
  config: Record<string, unknown>;
}

const AGENT_VARIANTS: VariantDef[] = [
  // Healthcare compliance monitors
  {
    skeletonType: 'compliance_monitor',
    industryCode: '62',
    regulationId: 'HIPAA',
    name: 'HIPAA Compliance Monitor',
    config: { checkInterval: '5m', dataCategories: ['PHI', 'ePHI'], encryptionRequired: true },
  },
  {
    skeletonType: 'risk_analyzer',
    industryCode: '62',
    regulationId: 'HIPAA',
    name: 'Healthcare Risk Analyzer',
    config: { riskCategories: ['data_breach', 'unauthorized_access', 'audit_failure'] },
  },
  {
    skeletonType: 'audit_agent',
    industryCode: '62',
    regulationId: 'HIPAA',
    name: 'HIPAA Audit Agent',
    config: { auditFrequency: 'quarterly', controlFramework: 'HIPAA_Security_Rule' },
  },
  // Financial compliance
  {
    skeletonType: 'compliance_monitor',
    industryCode: '52',
    regulationId: 'GLBA',
    name: 'Financial Privacy Monitor',
    config: { checkInterval: '3m', dataCategories: ['NPI', 'PII'], encryptionRequired: true },
  },
  {
    skeletonType: 'risk_analyzer',
    industryCode: '52',
    regulationId: 'SOX',
    name: 'SOX Risk Analyzer',
    config: { controlCategories: ['financial_reporting', 'internal_controls', 'disclosure'] },
  },
  {
    skeletonType: 'regulatory_tracker',
    industryCode: '52',
    regulationId: 'DORA',
    name: 'DORA Regulatory Tracker',
    config: { jurisdictions: ['EU'], focusAreas: ['ICT_risk', 'operational_resilience'] },
  },
  {
    skeletonType: 'anomaly_detector',
    industryCode: '52',
    regulationId: 'Basel-III',
    name: 'Banking Anomaly Detector',
    config: { monitorMetrics: ['capital_ratio', 'liquidity_coverage', 'leverage_ratio'] },
  },
  // Technology/Information
  {
    skeletonType: 'data_classifier',
    industryCode: '51',
    regulationId: 'GDPR',
    name: 'Data Classification Agent',
    config: { classificationLevels: ['public', 'internal', 'confidential', 'restricted'] },
  },
  {
    skeletonType: 'compliance_monitor',
    industryCode: '51',
    regulationId: 'SOC2',
    name: 'SOC2 Compliance Monitor',
    config: {
      trustServiceCriteria: [
        'security',
        'availability',
        'processing_integrity',
        'confidentiality',
        'privacy',
      ],
    },
  },
  {
    skeletonType: 'report_generator',
    industryCode: '51',
    regulationId: null,
    name: 'Tech Compliance Reporter',
    config: {
      reportTypes: ['compliance_summary', 'risk_assessment', 'audit_trail'],
      formats: ['pdf', 'csv'],
    },
  },
  // Utilities
  {
    skeletonType: 'compliance_monitor',
    industryCode: '22',
    regulationId: 'NERC-CIP',
    name: 'NERC-CIP Compliance Monitor',
    config: {
      checkInterval: '1m',
      focusAreas: ['BES_cyber_systems', 'physical_security', 'incident_reporting'],
    },
  },
  // Education
  {
    skeletonType: 'compliance_monitor',
    industryCode: '61',
    regulationId: 'FERPA',
    name: 'FERPA Compliance Monitor',
    config: {
      dataCategories: ['student_records', 'educational_records'],
      accessControl: 'role_based',
    },
  },
  // Government
  {
    skeletonType: 'compliance_monitor',
    industryCode: '92',
    regulationId: 'FISMA',
    name: 'FISMA Compliance Monitor',
    config: { impactLevels: ['low', 'moderate', 'high'], continuousMonitoring: true },
  },
  {
    skeletonType: 'audit_agent',
    industryCode: '92',
    regulationId: 'FedRAMP',
    name: 'FedRAMP Audit Agent',
    config: { authorizationLevel: 'moderate', controlBaseline: 'rev5' },
  },
  // Manufacturing
  {
    skeletonType: 'compliance_monitor',
    industryCode: '32',
    regulationId: 'FDA-21-CFR',
    name: 'FDA Compliance Monitor',
    config: {
      recordTypes: ['electronic_records', 'electronic_signatures'],
      validationRequired: true,
    },
  },
  {
    skeletonType: 'workflow_orchestrator',
    industryCode: '33',
    regulationId: null,
    name: 'Manufacturing Workflow Orchestrator',
    config: { workflowTypes: ['quality_control', 'supply_chain', 'safety_compliance'] },
  },
  // Retail
  {
    skeletonType: 'compliance_monitor',
    industryCode: '44',
    regulationId: 'PCI-DSS',
    name: 'PCI-DSS Payment Monitor',
    config: {
      requirements: [
        'network_security',
        'data_protection',
        'vulnerability_management',
        'access_control',
      ],
    },
  },
  // Cross-industry
  {
    skeletonType: 'data_classifier',
    industryCode: '54',
    regulationId: 'GDPR',
    name: 'GDPR Data Classifier',
    config: {
      dataSubjectRights: ['access', 'rectification', 'erasure', 'portability'],
      lawfulBases: ['consent', 'contract', 'legitimate_interest'],
    },
  },
  {
    skeletonType: 'regulatory_tracker',
    industryCode: '54',
    regulationId: 'CCPA',
    name: 'CCPA Privacy Tracker',
    config: { consumerRights: ['know', 'delete', 'opt_out', 'non_discrimination'] },
  },
  {
    skeletonType: 'risk_analyzer',
    industryCode: '54',
    regulationId: 'ISO-27001',
    name: 'ISO 27001 Risk Analyzer',
    config: {
      domains: [
        'information_security_policy',
        'asset_management',
        'access_control',
        'cryptography',
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Use Cases (15 across industries)
// ---------------------------------------------------------------------------
const USE_CASES = [
  {
    outcome: 'Automate HIPAA compliance monitoring for healthcare organizations',
    kpi: 'reduction_in_compliance_violations',
    industries: ['62'],
    regulations: ['HIPAA'],
    urgency: 0.9,
    monetization: 'compliance_automation' as const,
  },
  {
    outcome: 'Reduce SOX audit preparation time by 60% for financial institutions',
    kpi: 'reduction_in_audit_time',
    industries: ['52'],
    regulations: ['SOX'],
    urgency: 0.8,
    monetization: 'cost_reduction' as const,
  },
  {
    outcome: 'Implement real-time PCI-DSS monitoring for retail payment processing',
    kpi: 'time_to_detect_violation',
    industries: ['44', '45', '52'],
    regulations: ['PCI-DSS'],
    urgency: 0.85,
    monetization: 'risk_mitigation' as const,
  },
  {
    outcome: 'Automate GDPR data subject access request processing',
    kpi: 'dsar_response_time',
    industries: ['51', '54'],
    regulations: ['GDPR'],
    urgency: 0.7,
    monetization: 'compliance_automation' as const,
  },
  {
    outcome: 'Deploy continuous NERC-CIP compliance for critical infrastructure',
    kpi: 'compliance_score',
    industries: ['22'],
    regulations: ['NERC-CIP'],
    urgency: 0.95,
    monetization: 'risk_mitigation' as const,
  },
  {
    outcome: 'Streamline FERPA compliance for educational institutions',
    kpi: 'student_data_incidents',
    industries: ['61'],
    regulations: ['FERPA'],
    urgency: 0.6,
    monetization: 'compliance_automation' as const,
  },
  {
    outcome: 'Automate FDA 21 CFR Part 11 electronic record validation',
    kpi: 'validation_completion_rate',
    industries: ['31', '32', '33'],
    regulations: ['FDA-21-CFR'],
    urgency: 0.75,
    monetization: 'compliance_automation' as const,
  },
  {
    outcome: 'Implement DORA operational resilience testing for EU financial entities',
    kpi: 'resilience_test_coverage',
    industries: ['52'],
    regulations: ['DORA'],
    urgency: 0.8,
    monetization: 'risk_mitigation' as const,
  },
  {
    outcome: 'Reduce compliance reporting cycle time across all industries',
    kpi: 'reporting_cycle_time',
    industries: [],
    regulations: ['SOX', 'GDPR', 'HIPAA'],
    urgency: 0.65,
    monetization: 'cost_reduction' as const,
  },
  {
    outcome: 'Automate ISO 27001 control assessment and evidence collection',
    kpi: 'control_assessment_coverage',
    industries: ['54', '51'],
    regulations: ['ISO-27001'],
    urgency: 0.7,
    monetization: 'cost_reduction' as const,
  },
  {
    outcome: 'Deploy cross-regulation risk scoring for multi-jurisdictional companies',
    kpi: 'risk_score_accuracy',
    industries: ['52', '54', '51'],
    regulations: ['GDPR', 'CCPA', 'LGPD', 'PIPEDA'],
    urgency: 0.75,
    monetization: 'revenue_generation' as const,
  },
  {
    outcome: 'Implement FedRAMP continuous monitoring for cloud service providers',
    kpi: 'continuous_monitoring_coverage',
    industries: ['54', '51'],
    regulations: ['FedRAMP'],
    urgency: 0.8,
    monetization: 'compliance_automation' as const,
  },
  {
    outcome: 'Automate Basel III capital adequacy reporting for banks',
    kpi: 'reporting_accuracy',
    industries: ['52'],
    regulations: ['Basel-III'],
    urgency: 0.85,
    monetization: 'compliance_automation' as const,
  },
  {
    outcome: 'Enable real-time data classification for privacy compliance',
    kpi: 'classification_accuracy',
    industries: ['51', '54', '52'],
    regulations: ['GDPR', 'CCPA'],
    urgency: 0.7,
    monetization: 'risk_mitigation' as const,
  },
  {
    outcome: 'Deploy AI-powered anomaly detection for financial fraud compliance',
    kpi: 'false_positive_rate',
    industries: ['52'],
    regulations: ['GLBA', 'SOX'],
    urgency: 0.9,
    monetization: 'revenue_generation' as const,
  },
];

// ---------------------------------------------------------------------------
// Main seeder function
// ---------------------------------------------------------------------------
export async function runTaxonomySeeder(): Promise<void> {
  try {
    // Check if taxonomy nodes already seeded (look for process nodes)
    const existing = await queryRows(
      "SELECT COUNT(*)::int as count FROM taxonomy_nodes WHERE node_type = 'process'",
    );
    const existingCount = parseInt(existing[0]?.count ?? '0', 10);

    if (existingCount > 0) {
      logger.info(`Taxonomy already seeded (${existingCount} process nodes) — skipping`, {
        job: JOB,
      });
      return;
    }

    let created = 0;

    // --- Taxonomy: Process Nodes ---
    for (const p of PROCESS_NODES) {
      const id = deterministicUuid(`process-${p.name}`);
      await execSql(
        `INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, description, risk_tier, metadata, version, "createdAt", "updatedAt")
         VALUES ($1::uuid, NULL, 'process', $2, $3, 'medium', NULL, 1, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [id, p.name, p.description],
      );
      created++;
    }

    // --- Taxonomy: Function Nodes ---
    for (const f of FUNCTION_NODES) {
      const id = deterministicUuid(`function-${f.name}`);
      await execSql(
        `INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, description, risk_tier, metadata, version, "createdAt", "updatedAt")
         VALUES ($1::uuid, NULL, 'function', $2, $3, 'medium', NULL, 1, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [id, f.name, f.description],
      );
      created++;
    }

    // --- Taxonomy: Industry Nodes (one per NAICS sector) ---
    const sectors = await queryRows(
      'SELECT code, title FROM naics_industries WHERE level = 2 ORDER BY code',
    );
    for (const s of sectors) {
      const id = deterministicUuid(`industry-${s.code}`);
      await execSql(
        `INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, description, risk_tier, metadata, version, "createdAt", "updatedAt")
         VALUES ($1::uuid, NULL, 'industry', $2, $3, 'medium', $4::json, 1, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [id, s.title, `NAICS Sector ${s.code}`, JSON.stringify({ naicsCode: s.code })],
      );
      created++;
    }

    // --- Taxonomy: Risk Nodes ---
    const riskTiers = [
      {
        name: 'Low Risk Operations',
        tier: 'low',
        description: 'Operations with minimal regulatory exposure',
      },
      {
        name: 'Medium Risk Operations',
        tier: 'medium',
        description: 'Operations requiring standard compliance monitoring',
      },
      {
        name: 'High Risk Operations',
        tier: 'high',
        description: 'Operations with significant regulatory requirements',
      },
      {
        name: 'Critical Risk Operations',
        tier: 'critical',
        description: 'Operations handling sensitive data or critical infrastructure',
      },
    ];
    for (const r of riskTiers) {
      const id = deterministicUuid(`risk-${r.tier}`);
      await execSql(
        `INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, description, risk_tier, metadata, version, "createdAt", "updatedAt")
         VALUES ($1::uuid, NULL, 'risk', $2, $3, $4::enum_taxonomy_nodes_risk_tier, NULL, 1, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [id, r.name, r.description, r.tier],
      );
      created++;
    }

    logger.info(`Seeded ${created} taxonomy nodes`, { job: JOB });

    // --- Agent Skeletons ---
    let skeletonCount = 0;
    const skeletonIds: Record<string, string> = {};

    for (const sk of AGENT_SKELETONS) {
      const id = deterministicUuid(`skeleton-${sk.specializationType}`);
      skeletonIds[sk.specializationType] = id;

      await execSql(
        `INSERT INTO agent_skeletons (id, name, specialization_type, core_capabilities, input_contract, output_contract, allowed_taxonomy_scope, communication_protocol, risk_level, version, "createdAt", "updatedAt")
         VALUES ($1::uuid, $2, $3::enum_agent_skeletons_specialization_type, $4::json, $5::json, $6::json, NULL, $7, $8::enum_agent_skeletons_risk_level, 1, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          sk.name,
          sk.specializationType,
          JSON.stringify(sk.capabilities),
          JSON.stringify({ type: 'object', properties: { data: { type: 'array' } } }),
          JSON.stringify({
            type: 'object',
            properties: { results: { type: 'array' }, score: { type: 'number' } },
          }),
          sk.protocol,
          sk.riskLevel,
        ],
      );
      skeletonCount++;
    }

    logger.info(`Seeded ${skeletonCount} agent skeletons`, { job: JOB });

    // --- Agent Variants ---
    let variantCount = 0;
    for (const v of AGENT_VARIANTS) {
      const skeletonId = skeletonIds[v.skeletonType];
      if (!skeletonId) continue;

      const id = deterministicUuid(`variant-${v.name}`);
      await execSql(
        `INSERT INTO agent_variants (id, skeleton_id, industry_code, regulation_id, name, configuration, threshold_rules, certification_status, certification_score, version, "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::json, $7::json, 'certified'::enum_agent_variants_certification_status, $8, 1, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          skeletonId,
          v.industryCode,
          v.regulationId,
          v.name,
          JSON.stringify(v.config),
          JSON.stringify({ alertThreshold: 0.7, criticalThreshold: 0.9, maxResponseTime: 300 }),
          75 + Math.floor(Math.random() * 20),
        ],
      );

      // Create certification record for each variant
      const certId = deterministicUuid(`cert-${v.name}`);
      const expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
      await execSql(
        `INSERT INTO certification_records (id, agent_variant_id, certification_type, compliance_framework, best_practice_score, audit_passed, findings, expiry_date, last_reviewed, version, "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, 'regulatory_compliance'::enum_certification_records_certification_type, $3, $4, true, $5::json, $6, NOW(), 1, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          certId,
          id,
          v.regulationId || 'ISO-27001',
          75 + Math.floor(Math.random() * 20),
          JSON.stringify({ status: 'passed', findings: [], recommendations: [] }),
          expiryDate,
        ],
      );

      variantCount++;
    }

    logger.info(`Seeded ${variantCount} agent variants with certifications`, { job: JOB });

    // --- Use Cases ---
    let useCaseCount = 0;
    for (const uc of USE_CASES) {
      const id = deterministicUuid(`usecase-${uc.kpi}`);
      await execSql(
        `INSERT INTO use_cases (id, outcome_statement, measurable_kpi, industry_scope, regulatory_scope, urgency_score, capital_dependency_score, monetization_type, status, version, "createdAt", "updatedAt")
         VALUES ($1::uuid, $2, $3, $4::json, $5::json, $6, $7, $8::enum_use_cases_monetization_type, 'active'::enum_use_cases_status, 1, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          uc.outcome,
          uc.kpi,
          JSON.stringify(uc.industries),
          JSON.stringify(uc.regulations),
          uc.urgency,
          Math.round((0.3 + Math.random() * 0.5) * 100) / 100,
          uc.monetization,
        ],
      );

      // Create ontology relationships: use_case OPERATES_IN industries
      for (const ind of uc.industries) {
        await execSql(
          `INSERT INTO ontology_relationships (id, subject_type, subject_id, relationship_type, object_type, object_id, weight, metadata, version, "createdAt", "updatedAt")
           VALUES ($1::uuid, 'use_case', $2, 'OPERATES_IN', 'industry', $3, $4, NULL, 1, NOW(), NOW())
           ON CONFLICT ON CONSTRAINT idx_ontology_unique_rel DO NOTHING`,
          [generateId(), id, ind, uc.urgency],
        );
      }

      useCaseCount++;
    }

    logger.info(`Seeded ${useCaseCount} use cases`, { job: JOB });

    // --- Ontology: Agent Skeleton → Regulation (COMPLIES_WITH) ---
    const regSkeletonLinks = [
      {
        skeleton: 'compliance_monitor',
        regulations: ['GDPR', 'HIPAA', 'SOX', 'PCI-DSS', 'NERC-CIP', 'FERPA', 'FISMA'],
      },
      {
        skeleton: 'risk_analyzer',
        regulations: ['SOX', 'Basel-III', 'DORA', 'ISO-27001', 'NIST-CSF'],
      },
      {
        skeleton: 'regulatory_tracker',
        regulations: ['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'DORA', 'MiFID-II'],
      },
      { skeleton: 'audit_agent', regulations: ['SOX', 'HIPAA', 'FedRAMP', 'SOC2', 'ISO-27001'] },
      { skeleton: 'data_classifier', regulations: ['GDPR', 'CCPA', 'HIPAA', 'GLBA', 'COPPA'] },
      { skeleton: 'anomaly_detector', regulations: ['SOX', 'GLBA', 'Basel-III', 'PCI-DSS'] },
      { skeleton: 'report_generator', regulations: ['SOX', 'GDPR', 'HIPAA', 'Basel-III', 'FISMA'] },
      { skeleton: 'workflow_orchestrator', regulations: ['SOX', 'HIPAA', 'DORA', 'FedRAMP'] },
    ];

    let relCount = 0;
    for (const link of regSkeletonLinks) {
      const skId = skeletonIds[link.skeleton];
      if (!skId) continue;
      for (const reg of link.regulations) {
        const regNodeId = deterministicUuid(`reg-${reg}`);
        await execSql(
          `INSERT INTO ontology_relationships (id, subject_type, subject_id, relationship_type, object_type, object_id, weight, metadata, version, "createdAt", "updatedAt")
           VALUES ($1::uuid, 'agent_skeleton', $2, 'COMPLIES_WITH', 'regulation', $3, 1.0, NULL, 1, NOW(), NOW())
           ON CONFLICT ON CONSTRAINT idx_ontology_unique_rel DO NOTHING`,
          [generateId(), skId, regNodeId],
        );
        relCount++;
      }
    }

    logger.info(`Seeded ${relCount} ontology relationships`, { job: JOB });

    // --- Initial System Intelligence Scores ---
    const intelligenceMetrics = [
      {
        type: 'health',
        score: 92,
        computedBy: 'taxonomySeeder',
        details: { agentHealth: 95, systemUptime: 99.5, dbLatency: 12 },
      },
      {
        type: 'coverage',
        score: 78,
        computedBy: 'taxonomySeeder',
        details: {
          industriesCovered: 20,
          regulationsCovered: 20,
          agentVariants: AGENT_VARIANTS.length,
        },
      },
      {
        type: 'compliance_exposure',
        score: 65,
        computedBy: 'taxonomySeeder',
        details: { highRiskIndustries: 4, criticalRegulations: 7, uncoveredGaps: 3 },
      },
      {
        type: 'drift',
        score: 5,
        computedBy: 'taxonomySeeder',
        details: { staleRelationships: 0, expiredCertifications: 0, orphanedNodes: 0 },
      },
      {
        type: 'expansion_opportunity',
        score: 45,
        computedBy: 'taxonomySeeder',
        details: { replicableUseCases: 8, underservedIndustries: 6, newRegulations: 2 },
      },
    ];

    for (const m of intelligenceMetrics) {
      await execSql(
        `INSERT INTO system_intelligence (id, metric_type, score, details, computed_by, computed_at, "createdAt")
         VALUES ($1::uuid, $2::enum_system_intelligence_metric_type, $3, $4::json, $5, NOW(), NOW())`,
        [generateId(), m.type, m.score, JSON.stringify(m.details), m.computedBy],
      );
    }

    logger.info('Seeded initial system intelligence metrics', { job: JOB });

    // --- Audit Log Entry ---
    await execSql(
      `INSERT INTO registry_audit_log (id, actor, action, entity_type, entity_id, changes, reason, "createdAt")
       VALUES ($1::uuid, 'system', 'create', 'taxonomy_seed', 'initial', $2::json, 'Initial taxonomy seeding on startup', NOW())`,
      [
        generateId(),
        JSON.stringify({
          processNodes: PROCESS_NODES.length,
          functionNodes: FUNCTION_NODES.length,
          agentSkeletons: AGENT_SKELETONS.length,
          agentVariants: AGENT_VARIANTS.length,
          useCases: USE_CASES.length,
        }),
      ],
    );

    logger.info('Taxonomy seeder complete', { job: JOB });
  } catch (err: any) {
    logger.error('Taxonomy seeder failed', { job: JOB, error: err.message });
  }
}
