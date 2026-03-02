import type {
  NaicsIndustry,
  UseCase,
  AgentSkeleton,
  AgentVariant,
  CertificationRecord,
  SystemIntelligence,
  OntologyRelationship,
  RiskAnalysisResult,
} from '../../types/compliance';
import type { MarketplaceSubmission, OrchestratorDashboard } from '../../types/orchestrator';

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
// Industry definitions across ALL 11 macro-sectors
// ---------------------------------------------------------------------------

interface IndustryDef {
  code: string;
  title: string;
  sector: string;
  useCases: string[];
}

const ALL_INDUSTRY_DEFS: IndustryDef[] = [
  // ── Healthcare & Professional (sectors 54, 55, 56, 61, 62) ──
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

  // ── Finance & Insurance (sectors 52, 53) ──
  {
    code: '5221',
    title: 'Depository Credit Intermediation',
    sector: '52',
    useCases: [
      'Real-time fraud detection and transaction monitoring',
      'Automated credit scoring and underwriting',
      'Anti-money laundering pattern recognition',
      'Customer churn prediction and retention',
    ],
  },
  {
    code: '5231',
    title: 'Securities and Commodity Exchanges',
    sector: '52',
    useCases: [
      'Algorithmic trade surveillance and compliance',
      'Market manipulation detection',
      'Regulatory reporting automation (MiFID II/SEC)',
    ],
  },
  {
    code: '5311',
    title: 'Lessors of Real Estate',
    sector: '53',
    useCases: [
      'Automated property valuation models',
      'Tenant risk scoring and screening',
      'Lease compliance monitoring',
    ],
  },

  // ── Technology & Information (sector 51) ──
  {
    code: '5112',
    title: 'Software Publishers',
    sector: '51',
    useCases: [
      'Automated vulnerability scanning and remediation',
      'License compliance tracking across deployments',
      'Customer usage pattern analysis for churn',
      'AI-powered code generation and review',
    ],
  },
  {
    code: '5182',
    title: 'Data Processing and Hosting',
    sector: '51',
    useCases: [
      'Data center capacity optimization',
      'Automated SLA compliance monitoring',
      'Anomaly detection in server performance',
    ],
  },
  {
    code: '5191',
    title: 'Other Information Services',
    sector: '51',
    useCases: [
      'Content moderation and classification',
      'Semantic search and knowledge graph enrichment',
      'Automated fact-checking pipeline',
    ],
  },

  // ── Manufacturing & Construction (sectors 23, 31, 32, 33) ──
  {
    code: '3361',
    title: 'Motor Vehicle Manufacturing',
    sector: '33',
    useCases: [
      'Predictive maintenance for assembly line robotics',
      'Quality inspection via computer vision',
      'Supply chain disruption early warning',
      'Production schedule optimization',
    ],
  },
  {
    code: '3254',
    title: 'Pharmaceutical Manufacturing',
    sector: '32',
    useCases: [
      'Drug interaction prediction modeling',
      'Batch quality control anomaly detection',
      'Regulatory submission document automation',
      'Clinical trial data monitoring',
    ],
  },
  {
    code: '2362',
    title: 'Commercial Building Construction',
    sector: '23',
    useCases: [
      'Project cost estimation and overrun prediction',
      'Safety compliance monitoring via IoT sensors',
      'Building permit automation',
    ],
  },

  // ── Energy & Mining (sector 21) ──
  {
    code: '2111',
    title: 'Oil and Gas Extraction',
    sector: '21',
    useCases: [
      'Drilling optimization and reservoir modeling',
      'Environmental compliance monitoring',
      'Pipeline integrity anomaly detection',
    ],
  },
  {
    code: '2131',
    title: 'Support Activities for Mining',
    sector: '21',
    useCases: [
      'Equipment failure prediction',
      'Mine safety compliance automation',
      'Resource estimation and grade control',
    ],
  },

  // ── Transportation & Logistics (sectors 48, 49) ──
  {
    code: '4811',
    title: 'Scheduled Air Transportation',
    sector: '48',
    useCases: [
      'Dynamic pricing and revenue management',
      'Flight delay prediction and rebooking',
      'Crew scheduling optimization',
      'Maintenance log anomaly detection',
    ],
  },
  {
    code: '4931',
    title: 'Warehousing and Storage',
    sector: '49',
    useCases: [
      'Inventory demand forecasting',
      'Automated pick-path optimization',
      'Warehouse space utilization analysis',
    ],
  },

  // ── Retail & Wholesale (sectors 42, 44, 45) ──
  {
    code: '4451',
    title: 'Grocery and Specialty Food Stores',
    sector: '44',
    useCases: [
      'Perishable inventory demand forecasting',
      'Dynamic markdown pricing optimization',
      'Shelf space allocation using sales velocity',
    ],
  },
  {
    code: '4511',
    title: 'Sporting Goods and Hobby Stores',
    sector: '45',
    useCases: [
      'Seasonal demand prediction',
      'Customer segmentation and personalized offers',
      'Return fraud detection',
    ],
  },
  {
    code: '4231',
    title: 'Motor Vehicle Parts Wholesale',
    sector: '42',
    useCases: [
      'Aftermarket parts demand forecasting',
      'Supplier quality scoring',
      'Route optimization for delivery fleet',
    ],
  },

  // ── Agriculture & Forestry (sector 11) ──
  {
    code: '1111',
    title: 'Oilseed and Grain Farming',
    sector: '11',
    useCases: [
      'Crop yield prediction from satellite imagery',
      'Precision irrigation scheduling',
      'Pest and disease early detection',
    ],
  },
  {
    code: '1121',
    title: 'Cattle Ranching and Farming',
    sector: '11',
    useCases: [
      'Livestock health monitoring via sensors',
      'Feed optimization and cost reduction',
      'Breeding program analytics',
    ],
  },

  // ── Utilities (sector 22) ──
  {
    code: '2211',
    title: 'Electric Power Generation',
    sector: '22',
    useCases: [
      'Grid load forecasting and demand response',
      'Renewable energy output prediction',
      'Equipment failure prediction for transformers',
    ],
  },
  {
    code: '2213',
    title: 'Water Supply and Sewage Systems',
    sector: '22',
    useCases: [
      'Pipe leak detection and network optimization',
      'Water quality anomaly monitoring',
      'Consumption pattern analysis for conservation',
    ],
  },

  // ── Public Sector (sector 92) ──
  {
    code: '9211',
    title: 'Executive and Legislative Offices',
    sector: '92',
    useCases: [
      'Citizen service request routing and triage',
      'Budget allocation optimization',
      'Policy impact simulation modeling',
    ],
  },
  {
    code: '9221',
    title: 'Justice, Public Order, and Safety',
    sector: '92',
    useCases: [
      'Case prioritization and resource allocation',
      'Recidivism risk assessment',
      'Evidence processing and chain of custody tracking',
      'Emergency response optimization',
    ],
  },

  // ── Services & Other (sectors 71, 72, 81) ──
  {
    code: '7211',
    title: 'Hotels and Motels',
    sector: '72',
    useCases: [
      'Dynamic room pricing and yield management',
      'Guest experience personalization',
      'Staff scheduling based on occupancy forecast',
    ],
  },
  {
    code: '7111',
    title: 'Performing Arts Companies',
    sector: '71',
    useCases: [
      'Ticket pricing optimization',
      'Audience segmentation and targeted marketing',
      'Event scheduling conflict detection',
    ],
  },
  {
    code: '8111',
    title: 'Automotive Repair and Maintenance',
    sector: '81',
    useCases: [
      'Diagnostic prediction from vehicle telemetry',
      'Parts inventory demand forecasting',
      'Service appointment scheduling optimization',
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

const RISK_CATEGORIES = ['data_privacy', 'model_bias', 'operational', 'regulatory', 'security'];

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
  ontologyRelationships: OntologyRelationship[];
  riskAnalysis: RiskAnalysisResult[];
  marketplace: MarketplaceSubmission[];
  dashboard: OrchestratorDashboard;
}

export function generateAllSectorDemoData(): DemoDataResult {
  _seed = 42; // Reset for determinism
  _idCounter = 0;

  const now = new Date().toISOString();
  const industries: NaicsIndustry[] = [];
  const useCases: UseCase[] = [];
  const skeletons: AgentSkeleton[] = [];
  const variants: AgentVariant[] = [];
  const certifications: CertificationRecord[] = [];
  const intelligence: SystemIntelligence[] = [];
  const ontologyRelationships: OntologyRelationship[] = [];
  const riskAnalysis: RiskAnalysisResult[] = [];
  const marketplace: MarketplaceSubmission[] = [];

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

  for (const indDef of ALL_INDUSTRY_DEFS) {
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

    // Generate SOLVES ontology relationships: each UC → 2-3 skeletons
    for (const ucId of ucIds) {
      const linkCount = randInt(2, 3);
      const shuffled = [...skeletonIds].sort(() => seededRandom() - 0.5);
      for (let i = 0; i < Math.min(linkCount, shuffled.length); i++) {
        ontologyRelationships.push({
          id: demoId(),
          subjectType: 'skeleton',
          subjectId: shuffled[i],
          relationshipType: 'SOLVES',
          objectType: 'use_case',
          objectId: ucId,
          weight: seededRandom() * 0.5 + 0.5,
          metadata: null,
          version: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Variants per industry (3-12)
    const ucCount = indDef.useCases.length;
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
        const errorRate = seededRandom() * 0.05;
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
      const certRecordCount = randInt(1, 3);
      for (let c = 0; c < certRecordCount; c++) {
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

      // Marketplace submissions for ~40% of certified variants
      if (certStatus === 'certified' && seededRandom() > 0.6) {
        const mktStatus = pick([
          'draft',
          'submitted',
          'under_review',
          'approved',
          'published',
        ]) as MarketplaceSubmission['status'];
        marketplace.push({
          id: demoId(),
          submitterId: demoId(),
          agentVariantId: variantId,
          submissionName: `${indDef.title} ${SKELETON_TYPES[skelIdx].name} Listing`,
          description: `Marketplace submission for ${indDef.title} agent`,
          documentationUrl: null,
          status: mktStatus,
          reviewNotes: null,
          certificationRequired: true,
          listingMetadata: null,
          submittedAt: now,
          reviewedAt: mktStatus === 'approved' || mktStatus === 'published' ? now : null,
          publishedAt: mktStatus === 'published' ? now : null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Risk analysis entries (1-2 per industry)
    const riskCount = randInt(1, 2);
    for (let r = 0; r < riskCount; r++) {
      const severity = pick([
        'low',
        'medium',
        'high',
        'critical',
      ]) as RiskAnalysisResult['severity'];
      const likelihood = randInt(20, 90);
      const impact = randInt(30, 95);
      riskAnalysis.push({
        id: demoId(),
        title: `${indDef.title} ${pick(RISK_CATEGORIES)} risk`,
        description: `Risk assessment for ${indDef.title} operations`,
        severity,
        likelihood,
        impact,
        riskScore: Math.round((likelihood * impact) / 100),
        category: pick(RISK_CATEGORIES),
        regulation: pick(['HIPAA', 'SOC2', 'GDPR', 'PCI DSS', undefined]),
      });
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

  // Orchestrator dashboard
  const dashboard: OrchestratorDashboard = {
    activeIntents: randInt(5, 20),
    pendingApprovals: randInt(1, 8),
    guardrailViolations: randInt(0, 3),
    completedToday: randInt(3, 15),
    recentIntents: [],
    recentViolations: [],
    autonomyMode: 'governed_autonomous',
    systemConfidence: 0.72 + seededRandom() * 0.2,
  };

  return {
    industries,
    useCases,
    skeletons,
    variants,
    certifications,
    intelligence,
    ontologyRelationships,
    riskAnalysis,
    marketplace,
    dashboard,
  };
}
