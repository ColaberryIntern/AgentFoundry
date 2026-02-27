/* eslint-disable @typescript-eslint/no-explicit-any */
// Force test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

import { sequelize } from '../config/database';
import { UserInteraction } from '../models/UserInteraction';

describe('UserInteraction Model', () => {
  beforeAll(async () => {
    require('../models');
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await UserInteraction.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // -----------------------------------------------------------------------
  // Required fields
  // -----------------------------------------------------------------------

  it('should create a valid interaction with required fields', async () => {
    const interaction = await UserInteraction.create({
      userId: 'user-001',
      interactionType: 'page_view',
      target: 'dashboard',
    });

    expect(interaction.id).toBeDefined();
    expect(interaction.userId).toBe('user-001');
    expect(interaction.interactionType).toBe('page_view');
    expect(interaction.target).toBe('dashboard');
    // SQLite returns undefined for unset nullable fields (not null)
    expect(interaction.metadata == null).toBe(true);
    expect(interaction.sessionId == null).toBe(true);
    expect(interaction.duration == null).toBe(true);
    expect(interaction.createdAt).toBeDefined();
    expect(interaction.updatedAt).toBeDefined();
  });

  it('should reject creation when userId is missing', async () => {
    await expect(
      UserInteraction.create({
        interactionType: 'page_view',
        target: 'dashboard',
      } as any), // eslint-disable-line @typescript-eslint/no-explicit-any
    ).rejects.toThrow();
  });

  it('should reject creation when interactionType is missing', async () => {
    await expect(
      UserInteraction.create({
        userId: 'user-001',
        target: 'dashboard',
      } as any), // eslint-disable-line @typescript-eslint/no-explicit-any
    ).rejects.toThrow();
  });

  it('should reject creation when target is missing', async () => {
    await expect(
      UserInteraction.create({
        userId: 'user-001',
        interactionType: 'page_view',
      } as any), // eslint-disable-line @typescript-eslint/no-explicit-any
    ).rejects.toThrow();
  });

  // -----------------------------------------------------------------------
  // ENUM validation
  // -----------------------------------------------------------------------

  it('should accept all valid interactionType values', async () => {
    const validTypes = [
      'page_view',
      'feature_use',
      'search',
      'recommendation_click',
      'report_generate',
      'filter_apply',
      'dashboard_widget_click',
    ];

    for (const type of validTypes) {
      const interaction = await UserInteraction.create({
        userId: 'user-001',
        interactionType: type as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        target: `target-${type}`,
      });
      expect(interaction.interactionType).toBe(type);
    }
  });

  it('should have interactionType defined as ENUM in the model schema', () => {
    // SQLite does not enforce ENUM constraints at the database level,
    // but the model schema defines the allowed values.
    // Validation is enforced at the controller layer instead.
    const attributes = UserInteraction.getAttributes();
    expect(attributes.interactionType).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typeName =
      (attributes.interactionType.type as any).key ||
      attributes.interactionType.type.constructor.name;
    expect(typeName).toBe('ENUM');
  });

  // -----------------------------------------------------------------------
  // Optional fields
  // -----------------------------------------------------------------------

  it('should store JSON metadata correctly', async () => {
    const metadata = { query: 'GDPR compliance', filters: { status: 'active' } };

    const interaction = await UserInteraction.create({
      userId: 'user-001',
      interactionType: 'search',
      target: 'search_bar',
      metadata,
    });

    const found = await UserInteraction.findByPk(interaction.id);
    expect(found?.metadata).toEqual(metadata);
  });

  it('should store sessionId correctly', async () => {
    const interaction = await UserInteraction.create({
      userId: 'user-001',
      interactionType: 'page_view',
      target: 'dashboard',
      sessionId: 'session-abc-123',
    });

    expect(interaction.sessionId).toBe('session-abc-123');
  });

  it('should store duration correctly', async () => {
    const interaction = await UserInteraction.create({
      userId: 'user-001',
      interactionType: 'page_view',
      target: 'dashboard',
      duration: 5000,
    });

    expect(interaction.duration).toBe(5000);
  });

  // -----------------------------------------------------------------------
  // Bulk create
  // -----------------------------------------------------------------------

  it('should support bulkCreate', async () => {
    const records = [
      { userId: 'user-001', interactionType: 'page_view' as const, target: 'home' },
      { userId: 'user-001', interactionType: 'search' as const, target: 'search_bar' },
      { userId: 'user-002', interactionType: 'feature_use' as const, target: 'export' },
    ];

    const created = await UserInteraction.bulkCreate(records);
    expect(created).toHaveLength(3);

    const count = await UserInteraction.count();
    expect(count).toBe(3);
  });

  // -----------------------------------------------------------------------
  // Query by userId
  // -----------------------------------------------------------------------

  it('should query interactions by userId', async () => {
    await UserInteraction.bulkCreate([
      { userId: 'user-001', interactionType: 'page_view', target: 'home' },
      { userId: 'user-001', interactionType: 'search', target: 'search_bar' },
      { userId: 'user-002', interactionType: 'feature_use', target: 'export' },
    ]);

    const user1Interactions = await UserInteraction.findAll({
      where: { userId: 'user-001' },
    });

    expect(user1Interactions).toHaveLength(2);
    user1Interactions.forEach((i) => expect(i.userId).toBe('user-001'));
  });
});
