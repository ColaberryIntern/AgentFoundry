import type {
  NaicsIndustry,
  UseCase,
  AgentSkeleton,
  AgentVariant,
  CertificationRecord,
  SystemIntelligence,
} from '../../types/compliance';

// ---------------------------------------------------------------------------
// Deterministic seed helper (no external deps)
// ---------------------------------------------------------------------------

let _seed = 42;
let _idCounter = 0;
function seededRandom(): number {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}
function randInt(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)];
}
function demoId(): string {
  _idCounter += 1;
  return `demo-${_idCounter.toString().padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Industry definitions for Healthcare & Professional sector
// ---------------------------------------------------------------------------

interface IndustryDef {
  code: string;
  title: string;
  sector: string;
  useCases: string[];
}

const INDUSTRY_DEFS: IndustryDef[] = [
  {
    code: '6211',
    title: 'Offices of Physicians',
    sector: '62',
    useCases: [
      'Automate patient intake and triage documentation',
      'AI-assisted differential diagnosis from symptoms',
      'Predictive no-show scheduling optimization',
      'Automated insurance pre-authorization processing',
      'Real-time clinical decision support alerts',
    ],
  },
  {
    code: '6221',
    title: 'General Medical and Surgical Hospitals',
    sector: '62',
    useCases: [
      'Automated bed capacity management and patient flow',
      'AI-powered sepsis early warning system',
      'Drug interaction and adverse event detection',
      'Operating room scheduling optimization',
      'Automated clinical coding for billing compliance',
      'Patient readmission risk prediction',
      'Supply chain demand forecasting for medical supplies',
      'Nurse staffing optimization based on acuity',
    ],
  },
  {
    code: '6231',
    title: 'Nursing Care Facilities',
    sector: '62',
    useCases: [
      'Fall risk prediction and prevention monitoring',
      'Automated medication administration verification',
      'Resident care plan compliance tracking',
    ],
  },
  {
    code: '6241',
    title: 'Individual and Family Services',
    sector: '62',
    useCases: [
      'Case management workflow automation',
      'Service eligibility determination engine',
      'Outcome measurement and reporting automation',
      'Client risk assessment scoring',
    ],
  },
  {
    code: '5411',
    title: 'Legal Services',
    sector: '54',
    useCases: [
      'Contract analysis and clause extraction',
      'Regulatory compliance monitoring for healthcare law',
      'Automated legal document drafting',
      'Case precedent research and summarization',
      'Billing compliance audit for legal services',
    ],
  },
  {
    code: '5415',
    title: 'Computer Systems Design',
    sector: '54',
    useCases: [
      'Automated code review and security scanning',
      'Infrastructure cost optimization analysis',
      'Incident response and root cause analysis',
      'Automated testing pipeline orchestration',
      'Cloud resource right-sizing recommendations',
      'API security compliance validation',
    ],
  },
  {
    code: '5416',
    title: 'Management Consulting',
    sector: '54',
    useCases: [
      'Market analysis and competitive intelligence gathering',
      'Process mining and workflow optimization',
      'Change management impact assessment',
      'Strategic scenario modeling and simulation',
    ],
  },
  {
    code: '5511',
    title: 'Management of Companies',
    sector: '55',
    useCases: [
      'Portfolio company performance benchmarking',
      'Cross-subsidiary risk aggregation and reporting',
      'Executive dashboard KPI anomaly detection',
    ],
  },
  {
    code: '5613',
    title: 'Employment Services',
    sector: '56',
    useCases: [
      'Resume screening and candidate matching',
      'Workforce demand forecasting',
      'Employee retention risk prediction',
      'Compensation benchmarking analysis',
    ],
  },
  {
    code: '6111',
    title: 'Elementary and Secondary Schools',
    sector: '61',
    useCases: [
      'Student performance early warning system',
      'Curriculum effectiveness analysis',
      'Automated IEP compliance monitoring',
      'Budget allocation optimization',
      'Teacher workload balancing',
    ],
  },
];

const SKELETON_TYPES: Array<{
  name: string;
  specializationType: string;
  capabilities: string[];
}> = [
  {
    name: 'Compliance Monitor',
    specializationType: 'compliance_monitor',
    capabilities: ['regulatory_scanning', 'violation_detection', 'report_generation'],
  },
  {
    name: 'Risk Analyzer',
    specializationType: 'risk_analyzer',
    capabilities: ['risk_scoring', 'trend_analysis', 'threshold_alerting'],
  },
  {
    name: 'Data Classifier',
    specializationType: 'data_classifier',
    capabilities: ['data_ingestion', 'classification', 'validation', 'enrichment'],
  },
  {
    name: 'Anomaly Detector',
    specializationType: 'anomaly_detector',
    capabilities: ['pattern_detection', 'scoring', 'threshold_alerting'],
  },
  {
    name: 'Report Generator',
    specializationType: 'report_generator',
    capabilities: ['data_aggregation', 'template_rendering', 'distribution'],
  },
  {
    name: 'Workflow Orchestrator',
    specializationType: 'workflow_orchestrator',
    capabilities: ['task_routing', 'state_management', 'escalation'],
  },
];

const CERT_TYPES = [
  'regulatory_compliance',
  'security_audit',
  'performance_benchmark',
  'data_governance',
] as const;

const CERT_FRAMEWORKS = ['HIPAA', 'SOC2', 'ISO 27001', 'GDPR', 'NIST CSF', 'PCI DSS', 'FedRAMP'];

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export interface DemoDataResult {
  industries: NaicsIndustry[];
  useCases: UseCase[];
  skeletons: AgentSkeleton[];
  variants: AgentVariant[];
  certifications: CertificationRecord[];
  intelligence: SystemIntelligence[];
}

export function generateHealthcareDemoData(): DemoDataResult {
  _seed = 42; // Reset for determinism
  _idCounter = 0;

  const now = new Date().toISOString();
  const industries: NaicsIndustry[] = [];
  const useCases: UseCase[] = [];
  const skeletons: AgentSkeleton[] = [];
  const variants: AgentVariant[] = [];
  const certifications: CertificationRecord[] = [];
  const intelligence: SystemIntelligence[] = [];

  // Pre-generate skeletons (shared across industries)
  const skeletonIds: string[] = [];
  for (const skelDef of SKELETON_TYPES) {
    const id = demoId();
    skeletonIds.push(id);
    skeletons.push({
      id,
      name: skelDef.name,
      specializationType: skelDef.specializationType as AgentSkeleton['specializationType'],
      coreCapabilities: skelDef.capabilities,
      inputContract: { type: 'object', required: ['input'] },
      outputContract: { type: 'object', required: ['result'] },
      allowedTaxonomyScope: null,
      communicationProtocol: 'async_message',
      riskLevel: pick(['low', 'medium', 'high']) as AgentSkeleton['riskLevel'],
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const indDef of INDUSTRY_DEFS) {
    // Industry
    industries.push({
      code: indDef.code,
      title: indDef.title,
      description: `${indDef.title} — AI agent deployment sector`,
      level: 4,
      parentCode: indDef.sector,
      sector: indDef.sector,
      versionYear: 2022,
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
    });

    // Use cases for this industry
    const ucCount = indDef.useCases.length;
    const ucIds: string[] = [];
    for (const ucText of indDef.useCases) {
      const ucId = demoId();
      ucIds.push(ucId);
      useCases.push({
        id: ucId,
        outcomeStatement: ucText,
        measurableKpi: `${randInt(5, 40)}% improvement in ${pick(['efficiency', 'accuracy', 'cost reduction', 'throughput', 'compliance rate'])}`,
        industryScope: [indDef.code],
        regulatoryScope: indDef.sector === '62' ? ['HIPAA'] : null,
        urgencyScore: randInt(30, 95),
        capitalDependencyScore: randInt(10, 70),
        monetizationType: pick([
          'cost_reduction',
          'revenue_generation',
          'risk_mitigation',
          'compliance_automation',
        ]) as UseCase['monetizationType'],
        status: pick(['active', 'active', 'active', 'draft']) as UseCase['status'],
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Variants per industry (3-12)
    const variantCount = randInt(3, Math.min(12, ucCount * 3));
    for (let v = 0; v < variantCount; v++) {
      const variantId = demoId();
      const skelIdx = randInt(0, skeletonIds.length - 1);
      const certScore = randInt(40, 98);
      const certStatus =
        certScore >= 80
          ? 'certified'
          : certScore >= 60
            ? pick(['certified', 'pending'])
            : pick(['pending', 'uncertified']);

      // Deployments (0-3 per variant)
      const deploymentCount = certStatus === 'certified' ? randInt(1, 3) : randInt(0, 1);
      const deployments = [];
      for (let d = 0; d < deploymentCount; d++) {
        const execCount = randInt(100, 10000);
        const errorRate = seededRandom() * 0.05; // 0-5%
        deployments.push({
          id: demoId(),
          agentStackId: demoId(),
          agentVariantId: variantId,
          environment: pick(['production', 'staging', 'development']) as
            | 'production'
            | 'staging'
            | 'development',
          activeStatus: seededRandom() > 0.15,
          performanceScore: randInt(60, 99),
          lastExecution: now,
          executionCount: execCount,
          errorCount: Math.round(execCount * errorRate),
          deployedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      variants.push({
        id: variantId,
        skeletonId: skeletonIds[skelIdx],
        industryCode: indDef.code,
        regulationId: indDef.sector === '62' ? 'HIPAA' : null,
        name: `${indDef.title} ${SKELETON_TYPES[skelIdx].name} v${randInt(1, 4)}.${randInt(0, 9)}`,
        configuration: { model: pick(['gpt-4', 'claude-3', 'llama-3']), temperature: 0.1 },
        thresholdRules: {
          maxLatencyMs: randInt(500, 5000),
          minConfidence: seededRandom() * 0.3 + 0.7,
        },
        certificationStatus: certStatus as AgentVariant['certificationStatus'],
        certificationScore: certScore,
        version: randInt(1, 5),
        deployments,
        createdAt: now,
        updatedAt: now,
      });

      // Certifications (1-3 per variant)
      const certCount = randInt(1, 3);
      for (let c = 0; c < certCount; c++) {
        const daysUntilExpiry = randInt(-30, 365);
        const expiryDate = new Date(Date.now() + daysUntilExpiry * 86400000).toISOString();
        certifications.push({
          id: demoId(),
          agentVariantId: variantId,
          certificationType: pick([...CERT_TYPES]) as CertificationRecord['certificationType'],
          complianceFramework: pick(CERT_FRAMEWORKS),
          bestPracticeScore: randInt(55, 99),
          auditPassed: seededRandom() > 0.2,
          findings:
            seededRandom() > 0.5 ? { issues: randInt(0, 5), critical: randInt(0, 1) } : null,
          expiryDate,
          lastReviewed: now,
          version: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  // System Intelligence entries
  const metricTypes = [
    'health',
    'coverage',
    'compliance_exposure',
    'drift',
    'expansion_opportunity',
  ] as const;
  for (const mt of metricTypes) {
    intelligence.push({
      id: demoId(),
      metricType: mt as SystemIntelligence['metricType'],
      score: randInt(40, 95),
      details: { source: 'demo', generated: now },
      computedBy: 'demo-generator',
      computedAt: now,
      createdAt: now,
    });
  }

  return { industries, useCases, skeletons, variants, certifications, intelligence };
}
