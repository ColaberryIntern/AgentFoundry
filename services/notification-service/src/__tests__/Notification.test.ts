import { sequelize, Notification, initModels } from '../models';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initModels();
});

afterEach(async () => {
  await Notification.destroy({ where: {} });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Notification Model', () => {
  const validAttrs = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    type: 'compliance_alert' as const,
    title: 'Test Alert',
    message: 'Something happened',
  };

  it('creates a notification with valid attributes', async () => {
    const n = await Notification.create(validAttrs);

    expect(n.id).toBeDefined();
    expect(n.userId).toBe(validAttrs.userId);
    expect(n.type).toBe('compliance_alert');
    expect(n.title).toBe('Test Alert');
    expect(n.message).toBe('Something happened');
    expect(n.createdAt).toBeInstanceOf(Date);
    expect(n.updatedAt).toBeInstanceOf(Date);
  });

  it('defaults isRead to false', async () => {
    const n = await Notification.create(validAttrs);
    expect(n.isRead).toBe(false);
  });

  it('stores and retrieves JSON metadata', async () => {
    const metadata = { reportId: 'r-123', severity: 'high' };
    const n = await Notification.create({ ...validAttrs, metadata });

    const fetched = await Notification.findByPk(n.id);
    expect(fetched!.metadata).toEqual(metadata);
  });

  it('allows null metadata by default', async () => {
    const n = await Notification.create(validAttrs);
    expect(n.metadata).toBeNull();
  });

  it('rejects creation without userId', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...attrs } = validAttrs;
    await expect(Notification.create(attrs as any)).rejects.toThrow();
  });

  it('rejects creation without title', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { title, ...attrs } = validAttrs;
    await expect(Notification.create(attrs as any)).rejects.toThrow();
  });

  it('rejects creation without message', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { message, ...attrs } = validAttrs;
    await expect(Notification.create(attrs as any)).rejects.toThrow();
  });

  it('rejects creation without type', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, ...attrs } = validAttrs;
    await expect(Notification.create(attrs as any)).rejects.toThrow();
  });
});
