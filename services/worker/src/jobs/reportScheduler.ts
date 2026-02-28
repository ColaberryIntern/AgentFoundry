import { queryRows, execSql } from '../utils/db';
import { publishReportJob } from '../utils/rabbitmq';
import logger from '../utils/logger';

const JOB = 'reportScheduler';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function runReportScheduler(): Promise<void> {
  try {
    // Seed a completed report if none exist (so Reports page isn't empty)
    const countRows = await queryRows('SELECT COUNT(*)::int as count FROM reports');
    const reportCount = parseInt(countRows[0]?.count ?? '0', 10);

    if (reportCount === 0) {
      const users = await queryRows('SELECT id FROM users LIMIT 3');
      const userIds = users.map((u) => u.id.toString());
      const userId = userIds[0] || '1';

      const seedReports = [
        {
          type: 'compliance_summary',
          format: 'pdf',
          status: 'completed',
          params: { period: 'monthly', month: '2026-02' },
        },
        {
          type: 'risk_assessment',
          format: 'pdf',
          status: 'completed',
          params: { scope: 'all', quarter: 'Q1-2026' },
        },
        {
          type: 'audit_trail',
          format: 'csv',
          status: 'completed',
          params: { dateFrom: '2026-01-01', dateTo: '2026-02-27' },
        },
        {
          type: 'regulatory_status',
          format: 'pdf',
          status: 'completed',
          params: { regulations: ['GDPR', 'HIPAA', 'SOX'] },
        },
      ];

      for (const r of seedReports) {
        const id = generateId();
        await execSql(
          `INSERT INTO reports (id, user_id, report_type, parameters, format, status, download_url, created_at, updated_at)
           VALUES ($1::uuid, $2, $3::enum_reports_report_type, $4::json, $5::enum_reports_format, $6::enum_reports_status, $7, NOW(), NOW())`,
          [
            id,
            userId,
            r.type,
            JSON.stringify(r.params),
            r.format,
            r.status,
            `/reports/${id}.${r.format}`,
          ],
        );
      }

      logger.info(`Seeded ${seedReports.length} reports`, { job: JOB });
    }

    // Generate a new report periodically (every ~3 hours by random chance)
    if (Math.random() < 0.33) {
      const users = await queryRows('SELECT id FROM users LIMIT 1');
      const userId = (users[0]?.id ?? 1).toString();

      const types = ['compliance_summary', 'risk_assessment', 'audit_trail', 'regulatory_status'];
      const type = types[Math.floor(Math.random() * types.length)];
      const id = generateId();

      await execSql(
        `INSERT INTO reports (id, user_id, report_type, format, status, created_at, updated_at)
         VALUES ($1::uuid, $2, $3::enum_reports_report_type, 'pdf'::enum_reports_format, 'completed'::enum_reports_status, NOW(), NOW())`,
        [id, userId, type],
      );

      publishReportJob({ reportId: id, userId, reportType: type, format: 'pdf' });
      logger.info(`Generated report: ${type}`, { job: JOB });
    }
  } catch (err: any) {
    logger.error('Report scheduler failed', { job: JOB, error: err.message });
  }
}
