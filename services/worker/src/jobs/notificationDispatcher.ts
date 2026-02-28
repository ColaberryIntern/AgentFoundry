import { queryRows, execSql, intToUuid } from '../utils/db';
import { publishComplianceAlert } from '../utils/rabbitmq';
import logger from '../utils/logger';

const JOB = 'notificationDispatcher';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function runNotificationDispatcher(): Promise<void> {
  try {
    // Find recent non-compliant records from the last 20 minutes that don't have a notification yet
    const records = await queryRows(
      `SELECT cr.id, cr.user_id, cr.compliance_type, cr.details, cr.regulation_id
       FROM compliance_records cr
       WHERE cr.status = 'non_compliant'
         AND cr."createdAt" > NOW() - INTERVAL '20 minutes'
       ORDER BY cr."createdAt" DESC
       LIMIT 5`,
    );

    let created = 0;
    const perUserCount: Record<number, number> = {};

    for (const rec of records) {
      // Limit to 3 notifications per user per cycle
      perUserCount[rec.user_id] = (perUserCount[rec.user_id] || 0) + 1;
      if (perUserCount[rec.user_id] > 3) continue;

      const userUuid = intToUuid(rec.user_id);

      // Check if we already created a notification for this record
      const existing = await queryRows(
        `SELECT id FROM notifications
         WHERE user_id = $1::uuid
           AND metadata::text LIKE $2
           AND "createdAt" > NOW() - INTERVAL '30 minutes'
         LIMIT 1`,
        [userUuid, `%complianceRecordId%${rec.id}%`],
      );

      if (existing.length > 0) continue;

      const notifId = generateId();
      const title = `${rec.compliance_type} Non-Compliance Alert`;
      const message =
        rec.details ||
        `Non-compliance detected for ${rec.regulation_id}. Immediate review required.`;

      await execSql(
        `INSERT INTO notifications (id, user_id, type, title, message, is_read, metadata, "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, 'compliance_alert', $3, $4, false, $5::json, NOW(), NOW())`,
        [
          notifId,
          userUuid,
          title,
          message,
          JSON.stringify({ complianceRecordId: rec.id, regulationId: rec.regulation_id }),
        ],
      );

      // Also publish to RabbitMQ for WebSocket push
      publishComplianceAlert({
        userId: rec.user_id.toString(),
        title,
        message,
        type: 'compliance_alert',
        metadata: { complianceRecordId: rec.id },
      });

      created++;
    }

    // Also check for degraded agents and notify
    const agentRows = await queryRows(
      `SELECT id, name, user_id, health_status FROM agent_stacks
       WHERE health_status IN ('degraded', 'unhealthy')
         AND "updatedAt" > NOW() - INTERVAL '10 minutes'`,
    );

    for (const agent of agentRows) {
      const agentUserUuid = intToUuid(agent.user_id);
      const existingAgentNotif = await queryRows(
        `SELECT id FROM notifications
         WHERE user_id = $1::uuid
           AND metadata::text LIKE $2
           AND "createdAt" > NOW() - INTERVAL '1 hour'
         LIMIT 1`,
        [agentUserUuid, `%agentId%${agent.id}%`],
      );

      if (existingAgentNotif.length > 0) continue;

      const notifId = generateId();
      await execSql(
        `INSERT INTO notifications (id, user_id, type, title, message, is_read, metadata, "createdAt", "updatedAt")
         VALUES ($1::uuid, $2::uuid, 'system', $3, $4, false, $5::json, NOW(), NOW())`,
        [
          notifId,
          agentUserUuid,
          `Agent ${agent.health_status}: ${agent.name}`,
          `Agent "${agent.name}" health status changed to ${agent.health_status}. Check the Agent Console for details.`,
          JSON.stringify({ agentId: agent.id, healthStatus: agent.health_status }),
        ],
      );
      created++;
    }

    if (created > 0) {
      logger.info(`Dispatched ${created} notifications`, { job: JOB });
    }
  } catch (err: any) {
    logger.error('Notification dispatcher failed', { job: JOB, error: err.message });
  }
}
