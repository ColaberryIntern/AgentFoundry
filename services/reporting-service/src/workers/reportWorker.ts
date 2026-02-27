import { Channel, ConsumeMessage } from 'amqplib';
import { Report } from '../models/Report';
import { generateReport } from '../utils/reportGenerator';
import { QUEUE_NAME } from '../utils/rabbitmq';

/**
 * Report generation worker.
 *
 * Consumes messages from the 'report_generation' RabbitMQ queue, generates
 * the requested report (PDF or CSV), and updates the Report record status.
 */
export async function startWorker(channel: Channel): Promise<void> {
  console.log('[worker] Waiting for report generation jobs...');

  await channel.consume(QUEUE_NAME, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    let payload: {
      reportId: string;
      reportType: string;
      parameters: object;
      format: 'pdf' | 'csv';
    };

    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.error('[worker] Invalid message payload -- discarding');
      channel.ack(msg);
      return;
    }

    const { reportId, reportType, parameters, format } = payload;

    try {
      // Mark as processing
      await Report.update({ status: 'processing' }, { where: { id: reportId } });

      // Generate the report file
      await generateReport(reportId, reportType, parameters, format);

      const downloadUrl = `/api/reports/download/${reportId}.${format}`;

      await Report.update({ status: 'completed', downloadUrl }, { where: { id: reportId } });

      console.log(`[worker] Report ${reportId} completed`);
    } catch (err) {
      const errorMessage = (err as Error).message || 'Unknown generation error';

      await Report.update({ status: 'failed', errorMessage }, { where: { id: reportId } }).catch(
        () => {
          console.error(`[worker] Failed to update report ${reportId} status to failed`);
        },
      );

      console.error(`[worker] Report ${reportId} failed:`, errorMessage);
    } finally {
      channel.ack(msg);
    }
  });
}
