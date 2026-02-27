/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import app from '../index';
import { sequelize } from '../config/database';
import AgentStack from '../models/AgentStack';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function generateToken(payload: { userId: number; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const adminUser = { userId: 1, email: 'admin@test.com', role: 'it_admin' };
let adminToken: string;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  adminToken = generateToken(adminUser);
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await AgentStack.destroy({ where: {} });
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────────────
// Create agent stack
// ──────────────────────────────────────────────────────────

describe('POST /api/agents', () => {
  it('should create an agent stack with valid data and return 201', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'My Compliance Agent',
        type: 'compliance_monitor',
        description: 'Monitors GDPR compliance',
        configuration: { threshold: 0.95 },
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('My Compliance Agent');
    expect(res.body.type).toBe('compliance_monitor');
    expect(res.body.status).toBe('draft');
    expect(res.body.healthStatus).toBe('unknown');
    expect(res.body.description).toBe('Monitors GDPR compliance');
    expect(res.body.configuration).toEqual({ threshold: 0.95 });
  });

  it('should create an agent stack with minimal data', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Minimal Agent',
        type: 'custom',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Minimal Agent');
    expect(res.body.type).toBe('custom');
    expect(res.body.status).toBe('draft');
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'custom' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when type is invalid', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Type', type: 'invalid_type' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when type is missing', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'No Type' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/agents')
      .send({ name: 'Unauth Agent', type: 'custom' });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});

// ──────────────────────────────────────────────────────────
// List agent stacks
// ──────────────────────────────────────────────────────────

describe('GET /api/agents', () => {
  beforeEach(async () => {
    await AgentStack.bulkCreate([
      { userId: '1', name: 'Agent 1', type: 'compliance_monitor', status: 'running' },
      { userId: '1', name: 'Agent 2', type: 'risk_analyzer', status: 'draft' },
      { userId: '2', name: 'Agent 3', type: 'custom', status: 'stopped' },
      { userId: '1', name: 'Agent 4', type: 'audit_agent', status: 'running' },
      { userId: '1', name: 'Agent 5', type: 'regulatory_tracker', status: 'paused' },
    ]);
  });

  it('should return 200 with paginated results', async () => {
    const res = await request(app).get('/api/agents').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('agents');
    expect(res.body).toHaveProperty('total', 5);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit');
    expect(res.body.agents.length).toBe(5);
  });

  it('should filter by userId', async () => {
    const res = await request(app)
      .get('/api/agents?userId=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    res.body.agents.forEach((agent: any) => {
      expect(agent.userId).toBe('1');
    });
  });

  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/agents?status=running')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    res.body.agents.forEach((agent: any) => {
      expect(agent.status).toBe('running');
    });
  });

  it('should filter by type', async () => {
    const res = await request(app)
      .get('/api/agents?type=custom')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.agents[0].type).toBe('custom');
  });

  it('should paginate results', async () => {
    const res = await request(app)
      .get('/api/agents?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.agents.length).toBe(2);
    expect(res.body.total).toBe(5);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(401);
  });
});

// ──────────────────────────────────────────────────────────
// Get agent stack
// ──────────────────────────────────────────────────────────

describe('GET /api/agents/:id', () => {
  it('should return 200 with the agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Get Test Agent',
      type: 'custom',
    });

    const res = await request(app)
      .get(`/api/agents/${agent.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(agent.id);
    expect(res.body.name).toBe('Get Test Agent');
  });

  it('should return 404 for non-existent agent', async () => {
    const res = await request(app)
      .get('/api/agents/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});

// ──────────────────────────────────────────────────────────
// Update agent stack
// ──────────────────────────────────────────────────────────

describe('PUT /api/agents/:id', () => {
  it('should update agent when in draft status', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Original Name',
      type: 'custom',
      status: 'draft',
    });

    const res = await request(app)
      .put(`/api/agents/${agent.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Name', description: 'Updated desc' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.description).toBe('Updated desc');
  });

  it('should update agent when in stopped status', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Stopped Agent',
      type: 'custom',
      status: 'stopped',
    });

    const res = await request(app)
      .put(`/api/agents/${agent.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Stopped Agent' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Stopped Agent');
  });

  it('should return 400 when agent is running', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Running Agent',
      type: 'custom',
      status: 'running',
    });

    const res = await request(app)
      .put(`/api/agents/${agent.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cannot Update' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 404 for non-existent agent', async () => {
    const res = await request(app)
      .put('/api/agents/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Does Not Exist' });

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────
// Deploy agent stack
// ──────────────────────────────────────────────────────────

describe('POST /api/agents/:id/deploy', () => {
  it('should deploy an agent from draft status', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Deploy Agent',
      type: 'compliance_monitor',
      status: 'draft',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/deploy`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
    expect(res.body.deployedAt).toBeTruthy();
    expect(res.body.healthStatus).toBe('healthy');
  });

  it('should deploy an agent from stopped status', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Stopped Deploy Agent',
      type: 'custom',
      status: 'stopped',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/deploy`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
  });

  it('should return 400 when deploying from error status', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Error Agent',
      type: 'custom',
      status: 'error',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/deploy`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('should return 400 when deploying from running status', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Running Agent',
      type: 'custom',
      status: 'running',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/deploy`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent agent', async () => {
    const res = await request(app)
      .post('/api/agents/00000000-0000-0000-0000-000000000000/deploy')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────
// Pause agent stack
// ──────────────────────────────────────────────────────────

describe('POST /api/agents/:id/pause', () => {
  it('should pause a running agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Pause Agent',
      type: 'custom',
      status: 'running',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/pause`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paused');
  });

  it('should return 400 when pausing a draft agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Draft Pause',
      type: 'custom',
      status: 'draft',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/pause`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('should return 400 when pausing a stopped agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Stopped Pause',
      type: 'custom',
      status: 'stopped',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/pause`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

// ──────────────────────────────────────────────────────────
// Resume agent stack
// ──────────────────────────────────────────────────────────

describe('POST /api/agents/:id/resume', () => {
  it('should resume a paused agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Resume Agent',
      type: 'custom',
      status: 'paused',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/resume`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
  });

  it('should return 400 when resuming a running agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Running Resume',
      type: 'custom',
      status: 'running',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/resume`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('should return 400 when resuming a draft agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Draft Resume',
      type: 'custom',
      status: 'draft',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/resume`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

// ──────────────────────────────────────────────────────────
// Stop agent stack
// ──────────────────────────────────────────────────────────

describe('POST /api/agents/:id/stop', () => {
  it('should stop a running agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Stop Agent',
      type: 'custom',
      status: 'running',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/stop`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('stopped');
    expect(res.body.healthStatus).toBe('unknown');
  });

  it('should stop a paused agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Paused Stop',
      type: 'custom',
      status: 'paused',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/stop`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('stopped');
  });

  it('should return 400 when stopping a draft agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Draft Stop',
      type: 'custom',
      status: 'draft',
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/stop`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

// ──────────────────────────────────────────────────────────
// Delete agent stack
// ──────────────────────────────────────────────────────────

describe('DELETE /api/agents/:id', () => {
  it('should delete a draft agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Delete Draft',
      type: 'custom',
      status: 'draft',
    });

    const res = await request(app)
      .delete(`/api/agents/${agent.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Agent stack deleted successfully');

    const found = await AgentStack.findByPk(agent.id);
    expect(found).toBeNull();
  });

  it('should delete a stopped agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Delete Stopped',
      type: 'custom',
      status: 'stopped',
    });

    const res = await request(app)
      .delete(`/api/agents/${agent.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('should return 400 when deleting a running agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Running Delete',
      type: 'custom',
      status: 'running',
    });

    const res = await request(app)
      .delete(`/api/agents/${agent.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('should return 400 when deleting a paused agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Paused Delete',
      type: 'custom',
      status: 'paused',
    });

    const res = await request(app)
      .delete(`/api/agents/${agent.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent agent', async () => {
    const res = await request(app)
      .delete('/api/agents/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────
// Agent metrics
// ──────────────────────────────────────────────────────────

describe('GET /api/agents/:id/metrics', () => {
  it('should return metrics for an agent', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Metrics Agent',
      type: 'compliance_monitor',
      status: 'running',
      healthStatus: 'healthy',
      metrics: { requests: 100, errors: 2, avg_latency: 50, uptime: 99.5 },
    });

    mockedAxios.post.mockResolvedValueOnce({
      data: { drift: 0.02, status: 'stable' },
    });

    const res = await request(app)
      .get(`/api/agents/${agent.id}/metrics`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.agentId).toBe(agent.id);
    expect(res.body.metrics).toEqual({ requests: 100, errors: 2, avg_latency: 50, uptime: 99.5 });
    expect(res.body.healthStatus).toBe('healthy');
    expect(res.body.driftAnalysis).toEqual({ drift: 0.02, status: 'stable' });
  });

  it('should return default metrics when agent has no metrics', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'No Metrics Agent',
      type: 'custom',
      status: 'draft',
    });

    mockedAxios.post.mockRejectedValueOnce(new Error('Service unavailable'));

    const res = await request(app)
      .get(`/api/agents/${agent.id}/metrics`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({ requests: 0, errors: 0, avg_latency: 0, uptime: 0 });
    expect(res.body.driftAnalysis).toEqual({ error: 'AI service unavailable' });
  });

  it('should return 404 for non-existent agent', async () => {
    const res = await request(app)
      .get('/api/agents/00000000-0000-0000-0000-000000000000/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────
// Optimize agent
// ──────────────────────────────────────────────────────────

describe('POST /api/agents/:id/optimize', () => {
  it('should return optimization recommendations', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Optimize Agent',
      type: 'compliance_monitor',
      status: 'running',
      configuration: { threshold: 0.9 },
      metrics: { requests: 500, errors: 10 },
    });

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        recommendations: ['Increase threshold to 0.95', 'Add retry logic'],
        optimizedConfig: { threshold: 0.95 },
      },
    });

    const res = await request(app)
      .post(`/api/agents/${agent.id}/optimize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ constraints: { maxLatency: 100 } });

    expect(res.status).toBe(200);
    expect(res.body.agentId).toBe(agent.id);
    expect(res.body.optimization).toHaveProperty('recommendations');
  });

  it('should return 503 when AI service is unavailable', async () => {
    const agent = await AgentStack.create({
      userId: '1',
      name: 'Optimize Unavailable',
      type: 'custom',
      status: 'running',
    });

    mockedAxios.post.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app)
      .post(`/api/agents/${agent.id}/optimize`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(503);
    expect(res.body.error).toHaveProperty('code', 'SERVICE_UNAVAILABLE');
  });

  it('should return 404 for non-existent agent', async () => {
    const res = await request(app)
      .post('/api/agents/00000000-0000-0000-0000-000000000000/optimize')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
