/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../config/database';
import AgentStack from '../models/AgentStack';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await AgentStack.destroy({ where: {} });
});

// ──────────────────────────────────────────────────────────
// Model creation with all fields
// ──────────────────────────────────────────────────────────

describe('AgentStack model', () => {
  it('should create an agent stack with all fields', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Test Compliance Monitor',
      description: 'A test agent for compliance monitoring',
      type: 'compliance_monitor',
      configuration: { threshold: 0.95, schedule: '*/5 * * * *' },
    });

    expect(agent.id).toBeTruthy();
    expect(agent.userId).toBe('1');
    expect(agent.name).toBe('Test Compliance Monitor');
    expect(agent.description).toBe('A test agent for compliance monitoring');
    expect(agent.type).toBe('compliance_monitor');
    expect(agent.status).toBe('draft');
    expect(agent.healthStatus).toBe('unknown');
    expect(agent.configuration).toEqual({ threshold: 0.95, schedule: '*/5 * * * *' });
    expect(agent.metrics).toBeFalsy();
    expect(agent.lastHealthCheck).toBeFalsy();
    expect(agent.deployedAt).toBeFalsy();
    expect(agent.createdAt).toBeInstanceOf(Date);
    expect(agent.updatedAt).toBeInstanceOf(Date);
  });

  it('should generate a UUID primary key', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'UUID Test',
      type: 'custom',
    });

    // UUID format: 8-4-4-4-12 hex characters
    expect(agent.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should require userId', async () => {
    await expect(
      AgentStack.create({
        name: 'No User',
        type: 'custom',
      } as any),
    ).rejects.toThrow();
  });

  it('should require name', async () => {
    await expect(
      AgentStack.create({
        userId: '1',
        type: 'custom',
      } as any),
    ).rejects.toThrow();
  });

  it('should require type', async () => {
    await expect(
      AgentStack.create({
        userId: '1',
        name: 'No Type',
      } as any),
    ).rejects.toThrow();
  });

  // ──────────────────────────────────────────────────────────
  // Enum validation
  // ──────────────────────────────────────────────────────────

  describe('type enum validation', () => {
    const validTypes = [
      'compliance_monitor',
      'risk_analyzer',
      'regulatory_tracker',
      'audit_agent',
      'custom',
    ];

    validTypes.forEach((type) => {
      it(`should accept type: ${type}`, async () => {
        const agent = await AgentStack.create({
          userId: '1',
          name: `Type ${type}`,
          type: type as any,
        });
        expect(agent.type).toBe(type);
      });
    });
  });

  describe('status enum and defaults', () => {
    it('should default status to draft', async () => {
      const agent = await AgentStack.create({
        userId: '1',
        name: 'Draft Agent',
        type: 'custom',
      });
      expect(agent.status).toBe('draft');
    });

    const validStatuses = ['draft', 'deploying', 'running', 'paused', 'stopped', 'error'];

    validStatuses.forEach((status) => {
      it(`should accept status: ${status}`, async () => {
        const agent = await AgentStack.create({
          userId: '1',
          name: `Status ${status}`,
          type: 'custom',
        });
        agent.status = status as any;
        await agent.save();
        expect(agent.status).toBe(status);
      });
    });
  });

  describe('healthStatus enum and defaults', () => {
    it('should default healthStatus to unknown', async () => {
      const agent = await AgentStack.create({
        userId: '1',
        name: 'Health Agent',
        type: 'custom',
      });
      expect(agent.healthStatus).toBe('unknown');
    });

    const validHealthStatuses = ['healthy', 'degraded', 'unhealthy', 'unknown'];

    validHealthStatuses.forEach((hs) => {
      it(`should accept healthStatus: ${hs}`, async () => {
        const agent = await AgentStack.create({
          userId: '1',
          name: `Health ${hs}`,
          type: 'custom',
        });
        agent.healthStatus = hs as any;
        await agent.save();
        expect(agent.healthStatus).toBe(hs);
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // JSON fields
  // ──────────────────────────────────────────────────────────

  describe('JSON fields', () => {
    it('should store and retrieve configuration JSON', async () => {
      const config = {
        threshold: 0.95,
        targets: ['gdpr', 'hipaa'],
        schedule: '*/5 * * * *',
        nested: { key: 'value' },
      };

      const agent = await AgentStack.create({
        userId: '1',
        name: 'Config Agent',
        type: 'custom',
        configuration: config,
      });

      const retrieved = await AgentStack.findByPk(agent.id);
      expect(retrieved!.configuration).toEqual(config);
    });

    it('should store and retrieve metrics JSON', async () => {
      const metricsData = {
        requests: 1500,
        errors: 12,
        avg_latency: 45.2,
        uptime: 99.8,
      };

      const agent = await AgentStack.create({
        userId: '1',
        name: 'Metrics Agent',
        type: 'custom',
      });

      agent.metrics = metricsData;
      await agent.save();

      const retrieved = await AgentStack.findByPk(agent.id);
      expect(retrieved!.metrics).toEqual(metricsData);
    });

    it('should allow null configuration', async () => {
      const agent = await AgentStack.create({
        userId: '1',
        name: 'Null Config',
        type: 'custom',
      });
      expect(agent.configuration).toBeFalsy();
    });

    it('should allow null metrics', async () => {
      const agent = await AgentStack.create({
        userId: '1',
        name: 'Null Metrics',
        type: 'custom',
      });
      expect(agent.metrics).toBeFalsy();
    });
  });

  // ──────────────────────────────────────────────────────────
  // Date fields
  // ──────────────────────────────────────────────────────────

  describe('date fields', () => {
    it('should store deployedAt', async () => {
      const agent = await AgentStack.create({
        userId: '1',
        name: 'Deploy Date',
        type: 'custom',
      });

      const now = new Date();
      agent.deployedAt = now;
      await agent.save();

      const retrieved = await AgentStack.findByPk(agent.id);
      expect(new Date(retrieved!.deployedAt!).getTime()).toBeCloseTo(now.getTime(), -3);
    });

    it('should store lastHealthCheck', async () => {
      const agent = await AgentStack.create({
        userId: '1',
        name: 'Health Check Date',
        type: 'custom',
      });

      const now = new Date();
      agent.lastHealthCheck = now;
      await agent.save();

      const retrieved = await AgentStack.findByPk(agent.id);
      expect(new Date(retrieved!.lastHealthCheck!).getTime()).toBeCloseTo(now.getTime(), -3);
    });
  });
});
