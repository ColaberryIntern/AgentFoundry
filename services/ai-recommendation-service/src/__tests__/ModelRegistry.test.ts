/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../config/database';
import { ModelRegistry } from '../models/ModelRegistry';

// Force test environment
process.env.NODE_ENV = 'test';

describe('ModelRegistry Model', () => {
  beforeAll(async () => {
    require('../models');
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await ModelRegistry.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should create a model with valid data', async () => {
    const model = await ModelRegistry.create({
      name: 'compliance-gap-classifier',
      version: '1.0.0',
      type: 'random_forest',
      accuracy: 0.95,
      artifactPath: '/models/compliance-gap-classifier-1.0.0.pkl',
    });

    expect(model.id).toBeDefined();
    expect(model.name).toBe('compliance-gap-classifier');
    expect(model.version).toBe('1.0.0');
    expect(model.type).toBe('random_forest');
    expect(model.accuracy).toBe(0.95);
    expect(model.artifactPath).toBe('/models/compliance-gap-classifier-1.0.0.pkl');
    expect(model.createdAt).toBeDefined();
    expect(model.updatedAt).toBeDefined();
  });

  it('should have default status of training', async () => {
    const model = await ModelRegistry.create({
      name: 'regulatory-predictor',
      version: '1.0.0',
      type: 'lstm',
    });

    expect(model.status).toBe('training');
  });

  it('should require name', async () => {
    await expect(
      ModelRegistry.create({
        version: '1.0.0',
        type: 'random_forest',
      } as any),
    ).rejects.toThrow();
  });

  it('should require version', async () => {
    await expect(
      ModelRegistry.create({
        name: 'test-model',
        type: 'random_forest',
      } as any),
    ).rejects.toThrow();
  });

  it('should require type', async () => {
    await expect(
      ModelRegistry.create({
        name: 'test-model',
        version: '1.0.0',
      } as any),
    ).rejects.toThrow();
  });

  it('should store JSON metrics', async () => {
    const metrics = {
      loss: 0.05,
      f1: 0.93,
      precision: 0.94,
      recall: 0.92,
    };

    const model = await ModelRegistry.create({
      name: 'compliance-gap-classifier',
      version: '2.0.0',
      type: 'random_forest',
      metrics,
    });

    await model.reload();
    expect(model.metrics).toEqual(metrics);
  });

  it('should store JSON parameters', async () => {
    const parameters = {
      n_estimators: 100,
      max_depth: 10,
      learning_rate: 0.01,
    };

    const model = await ModelRegistry.create({
      name: 'compliance-gap-classifier',
      version: '3.0.0',
      type: 'random_forest',
      parameters,
    });

    await model.reload();
    expect(model.parameters).toEqual(parameters);
  });

  it('should store JSON trainingDataInfo', async () => {
    const trainingDataInfo = {
      datasetSize: 10000,
      dateRange: { start: '2025-01-01', end: '2025-12-31' },
      features: ['consent_form', 'data_retention', 'encryption'],
    };

    const model = await ModelRegistry.create({
      name: 'regulatory-predictor',
      version: '2.0.0',
      type: 'lstm',
      trainingDataInfo,
    });

    await model.reload();
    expect(model.trainingDataInfo).toEqual(trainingDataInfo);
  });

  it('should allow status transitions', async () => {
    const model = await ModelRegistry.create({
      name: 'test-model',
      version: '1.0.0',
      type: 'random_forest',
    });

    expect(model.status).toBe('training');

    await model.update({ status: 'ready' });
    expect(model.status).toBe('ready');

    await model.update({ status: 'deployed', deployedAt: new Date() });
    expect(model.status).toBe('deployed');
    expect(model.deployedAt).toBeDefined();

    await model.update({ status: 'deprecated' });
    expect(model.status).toBe('deprecated');
  });
});
