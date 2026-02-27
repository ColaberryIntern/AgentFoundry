import axios from 'axios';
import * as crypto from 'crypto';
import { Webhook } from '../models/Webhook';
import { WebhookLog } from '../models/WebhookLog';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // exponential backoff in ms
const MAX_FAILURE_COUNT = 10; // auto-disable after this many consecutive failures

/**
 * Returns the retry delays to use. In test mode, delays are 0ms
 * to avoid slowing down the test suite.
 */
function getRetryDelays(): number[] {
  if (process.env.NODE_ENV === 'test') {
    return [0, 0, 0];
  }
  return RETRY_DELAYS;
}

/**
 * Signs a payload string with the given secret using HMAC-SHA256.
 */
export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Dispatches a webhook delivery to the target URL with retries.
 * Creates WebhookLog entries for each attempt.
 */
export async function dispatchWebhook(
  webhook: Webhook,
  eventType: string,
  data: object,
): Promise<void> {
  const payload = JSON.stringify({ event: eventType, data, timestamp: new Date().toISOString() });
  const signature = signPayload(payload, webhook.secret);
  const delays = getRetryDelays();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const start = Date.now();
    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': eventType,
          'X-Webhook-Id': webhook.id,
        },
        timeout: 10000,
        validateStatus: () => true, // don't throw on non-2xx
      });

      const duration = Date.now() - start;
      const success = response.status >= 200 && response.status < 300;
      const responseBody =
        typeof response.data === 'string'
          ? response.data.substring(0, 1000)
          : JSON.stringify(response.data).substring(0, 1000);

      await WebhookLog.create({
        webhookId: webhook.id,
        eventType,
        payload: JSON.parse(payload),
        responseStatus: response.status,
        responseBody,
        success,
        attempt,
        duration,
      });

      if (success) {
        await webhook.update({ failureCount: 0, lastTriggeredAt: new Date() });
        return;
      }

      // Non-2xx: retry if attempts remain
      if (attempt < MAX_RETRIES) {
        await delay(delays[attempt - 1]);
        continue;
      }

      // All retries exhausted
      await incrementFailureCount(webhook);
      return;
    } catch (err) {
      const duration = Date.now() - start;
      await WebhookLog.create({
        webhookId: webhook.id,
        eventType,
        payload: JSON.parse(payload),
        success: false,
        attempt,
        error: (err as Error).message,
        duration,
      });

      if (attempt < MAX_RETRIES) {
        await delay(delays[attempt - 1]);
        continue;
      }

      await incrementFailureCount(webhook);
      return;
    }
  }
}

/**
 * Increments the failure count on a webhook. Auto-disables the webhook
 * if the failure count reaches MAX_FAILURE_COUNT.
 */
async function incrementFailureCount(webhook: Webhook): Promise<void> {
  const newCount = webhook.failureCount + 1;
  if (newCount >= MAX_FAILURE_COUNT) {
    await webhook.update({ failureCount: newCount, isActive: false });
  } else {
    await webhook.update({ failureCount: newCount, lastTriggeredAt: new Date() });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dispatches to all active webhooks that subscribe to the given event type.
 * Fires all deliveries concurrently (fire-and-forget semantics for the caller).
 */
export async function triggerWebhooks(eventType: string, data: object): Promise<void> {
  const webhooks = await Webhook.findAll({
    where: { isActive: true },
  });

  const matching = webhooks.filter((wh) => {
    const events = wh.events as string[];
    return events.includes(eventType);
  });

  // Fire and forget (don't block caller)
  await Promise.allSettled(matching.map((wh) => dispatchWebhook(wh, eventType, data)));
}
