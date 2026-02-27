/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../config/database';
import { Recommendation } from '../models/Recommendation';
import { ModelRegistry } from '../models/ModelRegistry';

// Force test environment
process.env.NODE_ENV = 'test';

describe('Recommendation Model', () => {
  beforeAll(async () => {
    // Import models index to set up associations
    require('../models');
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await Recommendation.destroy({ where: {} });
    await ModelRegistry.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should create a recommendation with valid data', async () => {
    const rec = await Recommendation.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'compliance_gap',
      title: 'Missing GDPR consent form',
      description: 'Your application lacks a GDPR consent form for EU users.',
      confidence: 0.92,
      severity: 'high',
      category: 'GDPR',
    });

    expect(rec.id).toBeDefined();
    expect(rec.userId).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(rec.type).toBe('compliance_gap');
    expect(rec.title).toBe('Missing GDPR consent form');
    expect(rec.description).toBe('Your application lacks a GDPR consent form for EU users.');
    expect(rec.confidence).toBe(0.92);
    expect(rec.severity).toBe('high');
    expect(rec.category).toBe('GDPR');
    expect(rec.createdAt).toBeDefined();
    expect(rec.updatedAt).toBeDefined();
  });

  it('should have default values: status=active, severity=medium', async () => {
    const rec = await Recommendation.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'optimization',
      title: 'Optimize data retention',
      description: 'Consider reducing data retention period.',
      confidence: 0.75,
    });

    expect(rec.status).toBe('active');
    expect(rec.severity).toBe('medium');
  });

  it('should require userId', async () => {
    await expect(
      Recommendation.create({
        type: 'compliance_gap',
        title: 'Test',
        description: 'Test desc',
        confidence: 0.5,
      } as any),
    ).rejects.toThrow();
  });

  it('should require type', async () => {
    await expect(
      Recommendation.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test',
        description: 'Test desc',
        confidence: 0.5,
      } as any),
    ).rejects.toThrow();
  });

  it('should require title', async () => {
    await expect(
      Recommendation.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: 'compliance_gap',
        description: 'Test desc',
        confidence: 0.5,
      } as any),
    ).rejects.toThrow();
  });

  it('should require description', async () => {
    await expect(
      Recommendation.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: 'compliance_gap',
        title: 'Test',
        confidence: 0.5,
      } as any),
    ).rejects.toThrow();
  });

  it('should require confidence', async () => {
    await expect(
      Recommendation.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: 'compliance_gap',
        title: 'Test',
        description: 'Test desc',
      } as any),
    ).rejects.toThrow();
  });

  it('should reject confidence below 0', async () => {
    await expect(
      Recommendation.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: 'compliance_gap',
        title: 'Test',
        description: 'Test desc',
        confidence: -0.1,
      }),
    ).rejects.toThrow();
  });

  it('should reject confidence above 1', async () => {
    await expect(
      Recommendation.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        type: 'compliance_gap',
        title: 'Test',
        description: 'Test desc',
        confidence: 1.1,
      }),
    ).rejects.toThrow();
  });

  it('should store JSON metadata', async () => {
    const metadata = {
      featureImportances: { consent_form: 0.85, data_retention: 0.15 },
      predictionDetails: { modelVersion: '1.0.0' },
    };

    const rec = await Recommendation.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'compliance_gap',
      title: 'Test',
      description: 'Test desc',
      confidence: 0.8,
      metadata,
    });

    await rec.reload();
    expect(rec.metadata).toEqual(metadata);
  });

  it('should associate with ModelRegistry', async () => {
    const model = await ModelRegistry.create({
      name: 'compliance-gap-classifier',
      version: '1.0.0',
      type: 'random_forest',
      status: 'deployed',
    });

    const rec = await Recommendation.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      type: 'compliance_gap',
      title: 'Test association',
      description: 'Test desc',
      confidence: 0.9,
      modelId: model.id,
      modelVersion: '1.0.0',
    });

    expect(rec.modelId).toBe(model.id);
    expect(rec.modelVersion).toBe('1.0.0');
  });
});
