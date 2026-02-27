import request from 'supertest';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import app from '../index';
import { sequelize } from '../config/database';
import ComplianceRecord from '../models/ComplianceRecord';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function generateToken(payload: { userId: number; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const testUser = { userId: 1, email: 'user@test.com', role: 'user' };
let userToken: string;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  userToken = generateToken(testUser);
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await ComplianceRecord.destroy({ where: {} });
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────────────────
// POST /api/compliance/analyze
// ──────────────────────────────────────────────────────────

describe('POST /api/compliance/analyze', () => {
  beforeEach(async () => {
    await ComplianceRecord.bulkCreate([
      {
        userId: 1,
        complianceType: 'GDPR',
        status: 'compliant',
        regulationId: 'REG-001',
        lastChecked: new Date(),
      },
      {
        userId: 1,
        complianceType: 'HIPAA',
        status: 'non_compliant',
        regulationId: 'REG-002',
        lastChecked: new Date(),
      },
    ]);
  });

  it('should return 200 with AI analysis results when AI service is available', async () => {
    const mockAiResponse = {
      data: {
        gaps: [
          {
            regulationId: 'REG-002',
            type: 'HIPAA',
            severity: 'high',
            confidence: 0.92,
            description: 'Non-compliant with HIPAA data protection requirements',
          },
        ],
        analyzedAt: '2026-02-27T10:00:00.000Z',
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockAiResponse);

    const res = await request(app)
      .post('/api/compliance/analyze')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('gaps');
    expect(res.body.gaps).toHaveLength(1);
    expect(res.body.gaps[0]).toHaveProperty('severity', 'high');
    expect(res.body.gaps[0]).toHaveProperty('confidence', 0.92);

    // Verify axios was called with the right URL and compliance data
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const callArgs = mockedAxios.post.mock.calls[0];
    expect(callArgs[0]).toContain('/api/inference/compliance-gaps');
    expect(callArgs[1]).toHaveProperty('complianceData');
    expect((callArgs[1] as Record<string, unknown[]>).complianceData).toHaveLength(2);
  });

  it('should return 400 when userId is missing', async () => {
    const res = await request(app)
      .post('/api/compliance/analyze')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).post('/api/compliance/analyze').send({ userId: 1 });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 503 when AI service is unavailable (connection refused)', async () => {
    const connectionError = new Error('connect ECONNREFUSED');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connectionError as any).code = 'ECONNREFUSED';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connectionError as any).isAxiosError = true;
    mockedAxios.isAxiosError.mockReturnValueOnce(true);
    mockedAxios.post.mockRejectedValueOnce(connectionError);

    const res = await request(app)
      .post('/api/compliance/analyze')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: 1 });

    expect(res.status).toBe(503);
    expect(res.body.error).toHaveProperty('code', 'SERVICE_UNAVAILABLE');
    expect(res.body.error.message).toContain('AI Recommendation Service');
  });

  it('should send empty complianceData when user has no records', async () => {
    const mockAiResponse = {
      data: {
        gaps: [],
        analyzedAt: '2026-02-27T10:00:00.000Z',
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockAiResponse);

    const res = await request(app)
      .post('/api/compliance/analyze')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: 999 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('gaps');
    expect(res.body.gaps).toHaveLength(0);

    const callArgs = mockedAxios.post.mock.calls[0];
    expect((callArgs[1] as Record<string, unknown[]>).complianceData).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────
// GET /api/regulations/predictions
// ──────────────────────────────────────────────────────────

describe('GET /api/regulations/predictions', () => {
  beforeEach(async () => {
    await ComplianceRecord.bulkCreate([
      {
        userId: 1,
        complianceType: 'GDPR',
        status: 'compliant',
        regulationId: 'REG-001',
        lastChecked: new Date(),
      },
      {
        userId: 1,
        complianceType: 'HIPAA',
        status: 'non_compliant',
        regulationId: 'REG-002',
        lastChecked: new Date(),
      },
      {
        userId: 1,
        complianceType: 'SOX',
        status: 'pending',
        regulationId: null,
        lastChecked: new Date(),
      },
    ]);
  });

  it('should return 200 with predictions when AI service is available', async () => {
    const mockAiResponse = {
      data: {
        predictions: [
          {
            regulationId: 'REG-001',
            likelihood: 0.85,
            predictedChange: 'Stricter data residency requirements expected',
            effectiveDate: '2026-06-01',
          },
          {
            regulationId: 'REG-002',
            likelihood: 0.72,
            predictedChange: 'New audit requirements for healthcare data',
            effectiveDate: '2026-09-01',
          },
        ],
        generatedAt: '2026-02-27T10:00:00.000Z',
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockAiResponse);

    const res = await request(app)
      .get('/api/regulations/predictions?userId=1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('predictions');
    expect(res.body.predictions).toHaveLength(2);
    expect(res.body.predictions[0]).toHaveProperty('likelihood');
    expect(res.body.predictions[0]).toHaveProperty('predictedChange');

    // Verify axios was called with only non-null regulation IDs
    const callArgs = mockedAxios.post.mock.calls[0];
    expect(callArgs[0]).toContain('/api/inference/regulatory-predictions');
    expect(callArgs[1]).toHaveProperty('regulationIds');
    expect((callArgs[1] as Record<string, string[]>).regulationIds).toEqual(['REG-001', 'REG-002']);
  });

  it('should return 400 when userId query param is missing', async () => {
    const res = await request(app)
      .get('/api/regulations/predictions')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when userId is not a number', async () => {
    const res = await request(app)
      .get('/api/regulations/predictions?userId=abc')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).get('/api/regulations/predictions?userId=1');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should return 503 when AI service is unavailable', async () => {
    const connectionError = new Error('connect ECONNREFUSED');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connectionError as any).code = 'ECONNREFUSED';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connectionError as any).isAxiosError = true;
    mockedAxios.isAxiosError.mockReturnValueOnce(true);
    mockedAxios.post.mockRejectedValueOnce(connectionError);

    const res = await request(app)
      .get('/api/regulations/predictions?userId=1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(503);
    expect(res.body.error).toHaveProperty('code', 'SERVICE_UNAVAILABLE');
    expect(res.body.error.message).toContain('AI Recommendation Service');
  });

  it('should send empty regulationIds when user has no records with regulation IDs', async () => {
    // Create a user with no regulation IDs
    await ComplianceRecord.destroy({ where: {} });
    await ComplianceRecord.create({
      userId: 50,
      complianceType: 'SOX',
      status: 'pending',
      regulationId: null,
      lastChecked: new Date(),
    });

    const mockAiResponse = {
      data: {
        predictions: [],
        generatedAt: '2026-02-27T10:00:00.000Z',
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockAiResponse);

    const res = await request(app)
      .get('/api/regulations/predictions?userId=50')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.predictions).toHaveLength(0);

    const callArgs = mockedAxios.post.mock.calls[0];
    expect((callArgs[1] as Record<string, string[]>).regulationIds).toEqual([]);
  });
});
