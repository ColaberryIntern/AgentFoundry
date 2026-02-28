import { queryRows, execSql } from '../utils/db';
import logger from '../utils/logger';

const JOB = 'complianceChecker';

const REGULATIONS = [
  { id: 'GDPR-2016-679', type: 'GDPR', source: 'data-protection-audit' },
  { id: 'HIPAA-1996', type: 'HIPAA', source: 'health-data-scan' },
  { id: 'SOX-2002', type: 'SOX', source: 'financial-controls' },
  { id: 'PCI-DSS-4.0', type: 'PCI-DSS', source: 'payment-scan' },
  { id: 'ISO-27001-2022', type: 'ISO-27001', source: 'isms-review' },
  { id: 'CCPA-2018', type: 'CCPA', source: 'privacy-audit' },
  { id: 'NIST-CSF-2.0', type: 'NIST', source: 'framework-assessment' },
  { id: 'SOC2-Type2', type: 'SOC2', source: 'vendor-audit' },
  { id: 'LGPD-2018', type: 'LGPD', source: 'brazil-privacy-audit' },
  { id: 'PIPEDA-2000', type: 'PIPEDA', source: 'canada-privacy-scan' },
  { id: 'FERPA-1974', type: 'FERPA', source: 'education-data-audit' },
  { id: 'GLBA-1999', type: 'GLBA', source: 'financial-privacy-scan' },
  { id: 'DORA-2022', type: 'DORA', source: 'operational-resilience-audit' },
  { id: 'FISMA-2014', type: 'FISMA', source: 'federal-security-assessment' },
  { id: 'FedRAMP-2011', type: 'FedRAMP', source: 'cloud-security-assessment' },
  { id: 'NERC-CIP-014', type: 'NERC-CIP', source: 'critical-infrastructure-scan' },
  { id: 'FDA-21-CFR-11', type: 'FDA-21-CFR', source: 'electronic-records-audit' },
  { id: 'Basel-III-2010', type: 'Basel-III', source: 'capital-adequacy-review' },
  { id: 'MiFID-II-2018', type: 'MiFID-II', source: 'trading-compliance-scan' },
  { id: 'COPPA-1998', type: 'COPPA', source: 'child-privacy-audit' },
];

const STATUS_WEIGHTS: Array<[string, number]> = [
  ['compliant', 0.68],
  ['non_compliant', 0.12],
  ['pending', 0.12],
  ['review', 0.08],
];

const DETAILS: Record<string, string[]> = {
  compliant: [
    'All controls verified and within acceptable thresholds',
    'Audit completed successfully — no findings',
    'Automated scan passed all validation rules',
    'Documentation and controls reviewed — fully compliant',
    'Periodic assessment completed — meets all requirements',
  ],
  non_compliant: [
    'Critical gap identified in data encryption standards',
    'Access control deficiencies found during review',
    'Missing documentation for required procedures',
    'Vulnerability scan identified unpatched systems',
    'Data retention policy violations detected',
  ],
  pending: [
    'Assessment scheduled — awaiting data collection',
    'Third-party audit in progress',
    'Remediation plan submitted — pending verification',
    'Compliance review initiated — awaiting stakeholder input',
  ],
  review: [
    'Findings under review by compliance team',
    'Exception request submitted for evaluation',
    'Policy update pending management approval',
    'Risk assessment under review by CISO',
  ],
};

function pickWeighted(weights: Array<[string, number]>): string {
  const r = Math.random();
  let acc = 0;
  for (const [val, w] of weights) {
    acc += w;
    if (r <= acc) return val;
  }
  return weights[weights.length - 1][0];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomThreshold(status: string): number {
  if (status === 'compliant') return 0.85 + Math.random() * 0.15;
  if (status === 'non_compliant') return 0.3 + Math.random() * 0.3;
  return 0.6 + Math.random() * 0.25;
}

export async function runComplianceChecker(): Promise<void> {
  try {
    // Get all user IDs
    const rows = await queryRows('SELECT id FROM users ORDER BY id');
    const userIds = rows.map((u) => u.id);

    if (userIds.length === 0) {
      logger.warn('No users found — skipping compliance checks', { job: JOB });
      return;
    }

    // Generate 2-4 checks per cycle
    const count = 2 + Math.floor(Math.random() * 3);
    let created = 0;

    for (let i = 0; i < count; i++) {
      const reg = pick(REGULATIONS);
      const status = pickWeighted(STATUS_WEIGHTS);
      const userId = pick(userIds);
      const threshold = randomThreshold(status);
      const details = pick(DETAILS[status]);

      await execSql(
        `INSERT INTO compliance_records
          (user_id, compliance_type, status, regulation_id, data_source, threshold, details, last_checked, "createdAt", "updatedAt")
         VALUES ($1, $2, $3::enum_compliance_records_status, $4, $5, $6, $7, NOW(), NOW(), NOW())`,
        [userId, reg.type, status, reg.id, reg.source, Math.round(threshold * 100) / 100, details],
      );
      created++;
    }

    logger.info(`Created ${created} compliance records`, { job: JOB });
  } catch (err: any) {
    logger.error('Compliance checker failed', { job: JOB, error: err.message });
  }
}
