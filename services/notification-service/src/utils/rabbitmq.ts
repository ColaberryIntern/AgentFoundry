import amqplib from 'amqplib';
import { Notification } from '../models/Notification';
import { pushToUser } from '../ws/notificationWs';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME = 'compliance_events';
const QUEUE_NAME = 'compliance_alerts';

/**
 * RabbitMQ consumer singleton.
 *
 * Connects to RabbitMQ, sets up a fanout exchange ('compliance_events')
 * bound to the 'compliance_alerts' queue, and consumes messages.
 *
 * Each message is expected to be JSON with at least:
 *   { userId, type?, title, message, metadata? }
 *
 * On receipt: creates a Notification record and pushes it via WebSocket.
 *
 * Connection failures are logged as warnings and do NOT crash the service.
 */
class RabbitMQConsumer {
  private connection: Awaited<ReturnType<typeof amqplib.connect>> | null = null;
  private channel: Awaited<
    ReturnType<Awaited<ReturnType<typeof amqplib.connect>>['createChannel']>
  > | null = null;

  async connect(): Promise<void> {
    try {
      const conn = await amqplib.connect(RABBITMQ_URL);
      this.connection = conn;
      const ch = await conn.createChannel();
      this.channel = ch;

      // Declare exchange and queue, then bind
      await ch.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
      await ch.assertQueue(QUEUE_NAME, { durable: true });
      await ch.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

      // Start consuming
      await ch.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;

        try {
          const payload = JSON.parse(msg.content.toString());

          const notification = await Notification.create({
            userId: payload.userId,
            type: payload.type || 'compliance_alert',
            title: payload.title,
            message: payload.message,
            metadata: payload.metadata || null,
          });

          // Push to connected WebSocket clients
          pushToUser(payload.userId, notification.toJSON());

          ch.ack(msg);
        } catch (err) {
          console.error('[rabbitmq] Failed to process message:', err);
          // Negative-acknowledge so the message can be redelivered
          ch.nack(msg, false, true);
        }
      });

      console.log('[rabbitmq] Connected and consuming from', QUEUE_NAME);
    } catch (err) {
      console.warn('[rabbitmq] Connection failed (service continues without RabbitMQ):', err);
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (err) {
      console.warn('[rabbitmq] Error during close:', err);
    }
  }
}

const rabbitmqConsumer = new RabbitMQConsumer();

export { rabbitmqConsumer };
