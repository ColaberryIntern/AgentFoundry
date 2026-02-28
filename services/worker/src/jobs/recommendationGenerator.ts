import { queryRows, execSql } from '../utils/db';
import logger from '../utils/logger';

const JOB = 'recommendationGenerator';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const GAP_RECOMMENDATIONS = [
  {
    title: 'Strengthen Data Encryption Standards',
    description:
      'Current encryption does not meet FIPS 140-2 requirements. Upgrade to AES-256 for data at rest and TLS 1.3 for data in transit.',
    category: 'data-protection',
  },
  {
    title: 'Implement Access Review Automation',
    description:
      'Quarterly access reviews are overdue. Deploy automated access certification to ensure least-privilege compliance.',
    category: 'access-control',
  },
  {
    title: 'Update Data Retention Policies',
    description:
      'Current retention policies do not align with GDPR Article 5(1)(e). Define specific retention periods per data category.',
    category: 'data-governance',
  },
  {
    title: 'Deploy Multi-Factor Authentication',
    description:
      'MFA is not enforced for privileged accounts accessing compliance-sensitive systems. Implement TOTP or FIDO2.',
    category: 'authentication',
  },
  {
    title: 'Establish Incident Response Procedures',
    description:
      'HIPAA breach notification procedures need updating to reflect current organizational structure.',
    category: 'incident-response',
  },
];

const RISK_RECOMMENDATIONS = [
  {
    title: 'High-Risk Vendor Assessment Required',
    description:
      'Three vendors with access to PII have not completed SOC2 Type 2 audits. Schedule assessments within 30 days.',
    category: 'vendor-risk',
  },
  {
    title: 'Elevated Threat Landscape Alert',
    description:
      'Industry-specific threats have increased 25% this quarter. Review and update security controls accordingly.',
    category: 'threat-assessment',
  },
  {
    title: 'Data Breach Risk Mitigation',
    description:
      'Unencrypted backup storage detected. Migrate to encrypted storage to prevent potential data exposure.',
    category: 'data-protection',
  },
];

const OPTIMIZATION_RECOMMENDATIONS = [
  {
    title: 'Consolidate Compliance Monitoring Tools',
    description:
      'Multiple overlapping tools are increasing cost. Consolidate monitoring through the Agent Foundry platform for 40% cost reduction.',
    category: 'optimization',
  },
  {
    title: 'Automate Evidence Collection',
    description:
      'Manual evidence collection for SOX audits takes 120 hours/quarter. Automate with continuous control monitoring.',
    category: 'efficiency',
  },
  {
    title: 'Streamline Regulatory Reporting',
    description:
      'Reduce reporting cycle time by 60% by implementing automated data aggregation and template-based reports.',
    category: 'reporting',
  },
];

export async function runRecommendationGenerator(): Promise<void> {
  try {
    // Expire old recommendations
    await execSql(
      `UPDATE recommendations SET status = 'expired', updated_at = NOW()
       WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW()`,
    );

    // Get users
    const users = await queryRows('SELECT id FROM users ORDER BY id');
    const userIds = users.map((u) => u.id.toString());

    if (userIds.length === 0) return;

    // Check how many active recommendations exist
    const countRows = await queryRows(
      "SELECT COUNT(*)::int as count FROM recommendations WHERE status = 'active'",
    );
    const activeCount = parseInt(countRows[0]?.count ?? '0', 10);

    // Keep a reasonable number of active recommendations (max 20)
    if (activeCount >= 20) {
      logger.info('Sufficient active recommendations — skipping generation', {
        job: JOB,
        activeCount,
      });
      return;
    }

    // Generate 1-3 recommendations
    const toCreate = 1 + Math.floor(Math.random() * 3);
    let created = 0;

    for (let i = 0; i < toCreate; i++) {
      const userId = pick(userIds);
      const r = Math.random();
      let type: string;
      let rec: { title: string; description: string; category: string };
      let severity: string;
      let confidence: number;

      if (r < 0.4) {
        type = 'compliance_gap';
        rec = pick(GAP_RECOMMENDATIONS);
        severity = pick(['medium', 'high', 'critical']);
        confidence = 0.75 + Math.random() * 0.2;
      } else if (r < 0.7) {
        type = 'risk_alert';
        rec = pick(RISK_RECOMMENDATIONS);
        severity = pick(['high', 'critical']);
        confidence = 0.7 + Math.random() * 0.25;
      } else {
        type = 'optimization';
        rec = pick(OPTIMIZATION_RECOMMENDATIONS);
        severity = pick(['low', 'medium']);
        confidence = 0.8 + Math.random() * 0.15;
      }

      const id = generateId();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await execSql(
        `INSERT INTO recommendations (id, user_id, type, title, description, confidence, severity, category, status, expires_at, created_at, updated_at)
         VALUES ($1::uuid, $2, $3::enum_recommendations_type, $4, $5, $6, $7::enum_recommendations_severity, $8, 'active'::enum_recommendations_status, $9, NOW(), NOW())`,
        [
          id,
          userId,
          type,
          rec.title,
          rec.description,
          Math.round(confidence * 100) / 100,
          severity,
          rec.category,
          expiresAt,
        ],
      );
      created++;
    }

    logger.info(`Generated ${created} recommendations`, { job: JOB });
  } catch (err: any) {
    logger.error('Recommendation generator failed', { job: JOB, error: err.message });
  }
}
