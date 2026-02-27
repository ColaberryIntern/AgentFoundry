import axios from 'axios';
import { sequelize, Webhook, WebhookLog, initModels } from '../models';
import { signPayload, dispatchWebhook, triggerWebhooks } from '../utils/webhookDispatcher';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initModels();
});

afterEach(async () => {
  await WebhookLog.destroy({ where: {} });
  await Webhook.destroy({ where: {} });
  jest.clearAllMocks();
});

afterAll(async () => {
  await sequelize.close();
});

const baseWebhookAttrs = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  url: 'https://example.com/webhook',
  secret: 'test-secret-key',
  events: ['compliance.check.completed', 'report.generated'],
};

describe('signPayload', () => {
  it('generates correct HMAC-SHA256 signature', () => {
    const payload = '{"event":"test","data":{}}';
    const secret = 'my-secret';
    const signature = signPayload(payload, secret);

    // Verify it is a valid hex string of correct length (SHA256 = 64 hex chars)
    expect(signature).toMatch(/^[a-f0-9]{64}$/);

    // Manually verify using crypto
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(signature).toBe(expected);
  });

  it('is deterministic (same input produces same output)', () => {
    const payload = '{"event":"compliance.check.completed","data":{"id":"123"}}';
    const secret = 'deterministic-secret';

    const sig1 = signPayload(payload, secret);
    const sig2 = signPayload(payload, secret);

    expect(sig1).toBe(sig2);
  });
});

describe('dispatchWebhook', () => {
  it('creates a log entry on success', async () => {
    const webhook = await Webhook.create(baseWebhookAttrs);

    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: 'OK',
      headers: {},
      statusText: 'OK',
      config: {} as any,
    });

    await dispatchWebhook(webhook, 'compliance.check.completed', { id: '123' });

    const logs = await WebhookLog.findAll({ where: { webhookId: webhook.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].success).toBe(true);
    expect(logs[0].responseStatus).toBe(200);
    expect(logs[0].attempt).toBe(1);
    expect(logs[0].eventType).toBe('compliance.check.completed');

    // Verify webhook failure count was reset
    await webhook.reload();
    expect(webhook.failureCount).toBe(0);
    expect(webhook.lastTriggeredAt).not.toBeNull();
  });

  it('creates a log entry on failure', async () => {
    const webhook = await Webhook.create(baseWebhookAttrs);

    mockedAxios.post.mockRejectedValue(new Error('Connection refused'));

    await dispatchWebhook(webhook, 'compliance.check.completed', { id: '456' });

    const logs = await WebhookLog.findAll({
      where: { webhookId: webhook.id },
      order: [['attempt', 'ASC']],
    });

    // Should have 3 attempts (all failures)
    expect(logs).toHaveLength(3);
    logs.forEach((log) => {
      expect(log.success).toBe(false);
      expect(log.error).toBe('Connection refused');
    });
  });

  it('retries on failure (verifies 3 attempts)', async () => {
    const webhook = await Webhook.create(baseWebhookAttrs);

    // Fail first two, succeed on third
    mockedAxios.post
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({
        status: 200,
        data: 'OK',
        headers: {},
        statusText: 'OK',
        config: {} as any,
      });

    await dispatchWebhook(webhook, 'compliance.check.completed', { id: '789' });

    const logs = await WebhookLog.findAll({
      where: { webhookId: webhook.id },
      order: [['attempt', 'ASC']],
    });

    expect(logs).toHaveLength(3);
    expect(logs[0].attempt).toBe(1);
    expect(logs[0].success).toBe(false);
    expect(logs[1].attempt).toBe(2);
    expect(logs[1].success).toBe(false);
    expect(logs[2].attempt).toBe(3);
    expect(logs[2].success).toBe(true);

    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
  });

  it('increments failure count after all retries fail', async () => {
    const webhook = await Webhook.create(baseWebhookAttrs);

    mockedAxios.post.mockRejectedValue(new Error('Network error'));

    await dispatchWebhook(webhook, 'compliance.check.completed', { id: '101' });

    await webhook.reload();
    expect(webhook.failureCount).toBe(1);
    expect(webhook.isActive).toBe(true); // Still active, not yet at 10
  });

  it('auto-disables webhook after 10 consecutive failures', async () => {
    const webhook = await Webhook.create({
      ...baseWebhookAttrs,
      failureCount: 9, // One more failure will reach 10
    });

    mockedAxios.post.mockRejectedValue(new Error('Network error'));

    await dispatchWebhook(webhook, 'compliance.check.completed', { id: '102' });

    await webhook.reload();
    expect(webhook.failureCount).toBe(10);
    expect(webhook.isActive).toBe(false); // Should be auto-disabled
  });
});

describe('triggerWebhooks', () => {
  it('only dispatches to webhooks subscribed to the matching event', async () => {
    // Webhook subscribed to compliance events
    const wh1 = await Webhook.create({
      ...baseWebhookAttrs,
      url: 'https://example.com/hook1',
      events: ['compliance.check.completed'],
    });

    // Webhook subscribed to report events only
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const wh2 = await Webhook.create({
      ...baseWebhookAttrs,
      url: 'https://example.com/hook2',
      events: ['report.generated'],
    });

    // Webhook subscribed to compliance events but inactive
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const wh3 = await Webhook.create({
      ...baseWebhookAttrs,
      url: 'https://example.com/hook3',
      events: ['compliance.check.completed'],
      isActive: false,
    });

    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: 'OK',
      headers: {},
      statusText: 'OK',
      config: {} as any,
    });

    await triggerWebhooks('compliance.check.completed', { checkId: 'c-1' });

    // Only wh1 should be called (wh2 wrong event, wh3 inactive)
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://example.com/hook1',
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Webhook-Event': 'compliance.check.completed',
        }),
      }),
    );

    // Verify log was created only for wh1
    const logs = await WebhookLog.findAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].webhookId).toBe(wh1.id);
  });
});
