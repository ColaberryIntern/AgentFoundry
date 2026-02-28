import amqplib from 'amqplib';
import logger from './logger';

const EXCHANGE = 'compliance_events';
const REPORT_QUEUE = 'report_generation';

let channel: any = null;
let conn: any = null;

export async function connectRabbitMQ(): Promise<void> {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  try {
    conn = await amqplib.connect(url);
    channel = await conn.createChannel();
    await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });
    await channel.assertQueue(REPORT_QUEUE, { durable: true });
    logger.info('RabbitMQ connected', { job: 'rabbitmq' });
  } catch (err: any) {
    logger.warn('RabbitMQ connection failed — notifications will be database-only', {
      job: 'rabbitmq',
      error: err?.message,
    });
  }
}

export function publishComplianceAlert(payload: Record<string, any>): boolean {
  if (!channel) return false;
  try {
    channel.publish(EXCHANGE, '', Buffer.from(JSON.stringify(payload)));
    return true;
  } catch {
    return false;
  }
}

export function publishReportJob(payload: Record<string, any>): boolean {
  if (!channel) return false;
  try {
    channel.sendToQueue(REPORT_QUEUE, Buffer.from(JSON.stringify(payload)), { persistent: true });
    return true;
  } catch {
    return false;
  }
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (conn) await conn.close();
  } catch {
    // ignore
  }
  channel = null;
  conn = null;
}
