import { sequelize, Webhook, WebhookLog, initModels } from '../models';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initModels();
});

afterEach(async () => {
  await WebhookLog.destroy({ where: {} });
  await Webhook.destroy({ where: {} });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Webhook Model', () => {
  const validAttrs = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    url: 'https://example.com/webhook',
    secret: 'test-secret-key-abc123',
    events: ['compliance.check.completed', 'report.generated'],
  };

  it('creates a webhook with valid attributes', async () => {
    const wh = await Webhook.create(validAttrs);

    expect(wh.id).toBeDefined();
    expect(wh.userId).toBe(validAttrs.userId);
    expect(wh.url).toBe(validAttrs.url);
    expect(wh.secret).toBe(validAttrs.secret);
    expect(wh.createdAt).toBeInstanceOf(Date);
    expect(wh.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects creation without url', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { url, ...attrs } = validAttrs;
    await expect(Webhook.create(attrs as any)).rejects.toThrow();
  });

  it('rejects creation without events', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { events, ...attrs } = validAttrs;
    await expect(Webhook.create(attrs as any)).rejects.toThrow();
  });

  it('rejects creation without userId', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...attrs } = validAttrs;
    await expect(Webhook.create(attrs as any)).rejects.toThrow();
  });

  it('defaults isActive to true', async () => {
    const wh = await Webhook.create(validAttrs);
    expect(wh.isActive).toBe(true);
  });

  it('defaults failureCount to 0', async () => {
    const wh = await Webhook.create(validAttrs);
    expect(wh.failureCount).toBe(0);
  });

  it('stores events as a JSON array', async () => {
    const wh = await Webhook.create(validAttrs);
    const fetched = await Webhook.findByPk(wh.id);
    expect(fetched!.events).toEqual(['compliance.check.completed', 'report.generated']);
    expect(Array.isArray(fetched!.events)).toBe(true);
  });

  it('has a hasMany association with WebhookLog', async () => {
    const wh = await Webhook.create(validAttrs);

    await WebhookLog.create({
      webhookId: wh.id,
      eventType: 'compliance.check.completed',
      payload: { event: 'compliance.check.completed', data: {} },
      success: true,
      attempt: 1,
    });

    const logs = await WebhookLog.findAll({ where: { webhookId: wh.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].webhookId).toBe(wh.id);
    expect(logs[0].eventType).toBe('compliance.check.completed');
  });
});
