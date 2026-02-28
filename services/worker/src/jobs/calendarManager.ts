import { queryRows, execSql } from '../utils/db';
import logger from '../utils/logger';

const JOB = 'calendarManager';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

const SEED_EVENTS = [
  {
    title: 'GDPR Annual Compliance Review',
    type: 'deadline',
    priority: 'high',
    regId: 'GDPR-2016-679',
    daysOut: 30,
    reminder: 14,
  },
  {
    title: 'HIPAA Security Risk Assessment',
    type: 'audit',
    priority: 'critical',
    regId: 'HIPAA-1996',
    daysOut: 45,
    reminder: 21,
  },
  {
    title: 'SOX Internal Controls Audit Q1',
    type: 'audit',
    priority: 'high',
    regId: 'SOX-2002',
    daysOut: 15,
    reminder: 7,
  },
  {
    title: 'PCI-DSS Quarterly Network Scan',
    type: 'deadline',
    priority: 'high',
    regId: 'PCI-DSS-4.0',
    daysOut: 20,
    reminder: 7,
  },
  {
    title: 'ISO 27001 Surveillance Audit',
    type: 'audit',
    priority: 'medium',
    regId: 'ISO-27001-2022',
    daysOut: 60,
    reminder: 30,
  },
  {
    title: 'CCPA Privacy Impact Assessment',
    type: 'review',
    priority: 'medium',
    regId: 'CCPA-2018',
    daysOut: 40,
    reminder: 14,
  },
  {
    title: 'NIST CSF Gap Remediation Deadline',
    type: 'deadline',
    priority: 'high',
    regId: 'NIST-CSF-2.0',
    daysOut: 25,
    reminder: 7,
  },
  {
    title: 'SOC2 Type 2 Audit Preparation',
    type: 'audit',
    priority: 'critical',
    regId: 'SOC2-Type2',
    daysOut: 55,
    reminder: 21,
  },
  {
    title: 'Data Protection Officer Training',
    type: 'training',
    priority: 'low',
    regId: 'GDPR-2016-679',
    daysOut: 10,
    reminder: 3,
  },
  {
    title: 'EU AI Act Regulatory Update Review',
    type: 'regulatory_change',
    priority: 'medium',
    regId: null,
    daysOut: 35,
    reminder: 14,
  },
  {
    title: 'Annual Security Awareness Training',
    type: 'training',
    priority: 'medium',
    regId: null,
    daysOut: 50,
    reminder: 14,
  },
  {
    title: 'Vendor Risk Assessment Review',
    type: 'review',
    priority: 'medium',
    regId: 'SOC2-Type2',
    daysOut: 22,
    reminder: 7,
  },
];

export async function runCalendarManager(): Promise<void> {
  try {
    // Get first user for seeding
    const users = await queryRows('SELECT id FROM users LIMIT 1');
    const userId = (users[0]?.id ?? 1).toString();

    // Check if calendar has events
    const countRows = await queryRows('SELECT COUNT(*)::int as count FROM compliance_calendar');
    const eventCount = parseInt(countRows[0]?.count ?? '0', 10);

    // Seed events if none exist
    if (eventCount === 0) {
      const now = new Date();
      for (const evt of SEED_EVENTS) {
        const id = generateId();
        const date = addDays(now, evt.daysOut).toISOString();

        await execSql(
          `INSERT INTO compliance_calendar
            (id, user_id, title, event_type, date, status, priority, regulation_id, reminder_days, "createdAt", "updatedAt")
           VALUES ($1::uuid, $2, $3, $4::enum_compliance_calendar_event_type, $5, 'upcoming'::enum_compliance_calendar_status, $6::enum_compliance_calendar_priority, $7, $8, NOW(), NOW())`,
          [id, userId, evt.title, evt.type, date, evt.priority, evt.regId, evt.reminder],
        );
      }
      logger.info(`Seeded ${SEED_EVENTS.length} calendar events`, { job: JOB });
    }

    // Update event statuses based on dates
    // Mark past events as overdue if still upcoming
    const overdueRows = await execSql(
      `UPDATE compliance_calendar
       SET status = 'overdue'::enum_compliance_calendar_status, "updatedAt" = NOW()
       WHERE status = 'upcoming' AND date < NOW()
       RETURNING id`,
    );
    const overdueCount = overdueRows.length;

    // Mark events happening today as in_progress
    const ipRows = await execSql(
      `UPDATE compliance_calendar
       SET status = 'in_progress'::enum_compliance_calendar_status, "updatedAt" = NOW()
       WHERE status = 'upcoming'
         AND date >= CURRENT_DATE
         AND date < CURRENT_DATE + INTERVAL '1 day'
       RETURNING id`,
    );
    const ipCount = ipRows.length;

    if (overdueCount > 0 || ipCount > 0) {
      logger.info(`Calendar: ${overdueCount} overdue, ${ipCount} in-progress`, { job: JOB });
    }
  } catch (err: any) {
    logger.error('Calendar manager failed', { job: JOB, error: err.message });
  }
}
