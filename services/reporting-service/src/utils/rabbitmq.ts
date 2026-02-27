import amqplib, { ChannelModel, Channel } from 'amqplib';

const QUEUE_NAME = 'report_generation';

/**
 * RabbitMQ client singleton for publishing report generation jobs.
 *
 * Gracefully handles connection failures -- if RabbitMQ is unavailable the
 * service continues to operate (the controller falls back to synchronous
 * generation).
 */
class RabbitMQClient {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private url: string;

  constructor() {
    this.url = process.env.RABBITMQ_URL || 'amqp://localhost';
  }

  /**
   * Establish connection and create a channel.
   * Logs a warning and returns gracefully on failure.
   */
  async connect(): Promise<void> {
    try {
      this.connection = await amqplib.connect(this.url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(QUEUE_NAME, { durable: true });
      console.log('[rabbitmq] Connected and queue asserted:', QUEUE_NAME);
    } catch (err) {
      console.warn(
        '[rabbitmq] Failed to connect -- falling back to synchronous mode:',
        (err as Error).message,
      );
      this.connection = null;
      this.channel = null;
    }
  }

  /**
   * Returns true if the client has an active channel.
   */
  isConnected(): boolean {
    return this.channel !== null;
  }

  /**
   * Publish a report generation job to the queue.
   * Returns true if the message was sent, false otherwise.
   */
  async publishReportJob(
    reportId: string,
    reportType: string,
    parameters: object,
    format: string,
  ): Promise<boolean> {
    if (!this.channel) {
      console.warn('[rabbitmq] Cannot publish -- not connected');
      return false;
    }

    const message = JSON.stringify({ reportId, reportType, parameters, format });
    const sent = this.channel.sendToQueue(QUEUE_NAME, Buffer.from(message), {
      persistent: true,
    });

    return sent;
  }

  /**
   * Close channel and connection gracefully.
   */
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
      console.warn('[rabbitmq] Error during close:', (err as Error).message);
    }
  }

  /**
   * Expose channel for the worker consumer.
   */
  getChannel(): Channel | null {
    return this.channel;
  }
}

const rabbitmq = new RabbitMQClient();

export { rabbitmq, QUEUE_NAME };
export default rabbitmq;
