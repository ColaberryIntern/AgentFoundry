// Set environment before importing anything
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-gateway';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { sequelize, initModels } from '../models';
import {
  classifyIntent,
  extractEntities,
  buildStructuredQuery,
  buildInterpretation,
} from '../controllers/nlSearchController';

const JWT_SECRET = 'test-jwt-secret-for-gateway';

function generateToken(payload: { userId: string; email?: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const testUser = {
  userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  email: 'test@example.com',
  role: 'admin',
};
let token: string;

beforeAll(async () => {
  await initModels();
  token = generateToken(testUser);
});

afterAll(async () => {
  await sequelize.close();
});

// ===========================================================================
// Unit tests: Intent Classification
// ===========================================================================

describe('classifyIntent', () => {
  it('should classify GDPR queries as compliance_search', () => {
    const result = classifyIntent('Show me GDPR compliance status');
    expect(result.intent).toBe('compliance_search');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should classify HIPAA queries as compliance_search', () => {
    const result = classifyIntent('HIPAA compliance regulation check');
    expect(result.intent).toBe('compliance_search');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should classify regulation queries as compliance_search', () => {
    const result = classifyIntent('Are we compliant with regulatory requirements?');
    expect(result.intent).toBe('compliance_search');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should classify report queries as report_search', () => {
    const result = classifyIntent('Generate a compliance summary report');
    expect(result.intent).toBe('report_search');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should classify document queries as report_search', () => {
    const result = classifyIntent('Show me the latest risk assessment document');
    expect(result.intent).toBe('report_search');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should classify user queries as user_search', () => {
    const result = classifyIntent('Find users with admin role');
    expect(result.intent).toBe('user_search');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should classify system queries as system_search', () => {
    const result = classifyIntent('What is the system health status?');
    expect(result.intent).toBe('system_search');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should fall back to general_search for ambiguous queries', () => {
    const result = classifyIntent('hello world');
    expect(result.intent).toBe('general_search');
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });
});

// ===========================================================================
// Unit tests: Entity Extraction
// ===========================================================================

describe('extractEntities', () => {
  it('should extract regulation entities', () => {
    const entities = extractEntities('Check GDPR and HIPAA compliance');
    const regulations = entities.filter((e) => e.type === 'regulation');
    expect(regulations).toContainEqual({ type: 'regulation', value: 'GDPR' });
    expect(regulations).toContainEqual({ type: 'regulation', value: 'HIPAA' });
  });

  it('should extract PCI-DSS regulation', () => {
    const entities = extractEntities('PCI DSS compliance check');
    const regulations = entities.filter((e) => e.type === 'regulation');
    expect(regulations).toContainEqual({ type: 'regulation', value: 'PCI-DSS' });
  });

  it('should extract SOC2 regulation', () => {
    const entities = extractEntities('SOC 2 audit results');
    const regulations = entities.filter((e) => e.type === 'regulation');
    expect(regulations).toContainEqual({ type: 'regulation', value: 'SOC2' });
  });

  it('should extract status entities', () => {
    const entities = extractEntities('Show non-compliant records');
    const statuses = entities.filter((e) => e.type === 'status');
    expect(statuses).toContainEqual({ type: 'status', value: 'non_compliant' });
  });

  it('should extract compliant status', () => {
    const entities = extractEntities('List all compliant items');
    const statuses = entities.filter((e) => e.type === 'status');
    expect(statuses).toContainEqual({ type: 'status', value: 'compliant' });
  });

  it('should extract severity entities', () => {
    const entities = extractEntities('Show critical severity issues');
    const severities = entities.filter((e) => e.type === 'severity');
    expect(severities).toContainEqual({ type: 'severity', value: 'critical' });
  });

  it('should extract date references', () => {
    const entities = extractEntities('Show compliance records from last month');
    const dates = entities.filter((e) => e.type === 'date');
    expect(dates).toContainEqual({ type: 'date', value: 'last_month' });
  });

  it('should extract explicit year', () => {
    const entities = extractEntities('GDPR compliance in 2024');
    const dates = entities.filter((e) => e.type === 'date');
    expect(dates).toContainEqual({ type: 'date', value: '2024' });
  });

  it('should extract report type entities', () => {
    const entities = extractEntities('Generate a risk assessment');
    const reportTypes = entities.filter((e) => e.type === 'report_type');
    expect(reportTypes).toContainEqual({ type: 'report_type', value: 'risk_assessment' });
  });

  it('should extract compliance_summary report type', () => {
    const entities = extractEntities('I need a compliance summary');
    const reportTypes = entities.filter((e) => e.type === 'report_type');
    expect(reportTypes).toContainEqual({ type: 'report_type', value: 'compliance_summary' });
  });

  it('should extract multiple entity types from a complex query', () => {
    const entities = extractEntities('Show critical GDPR non-compliant records from last week');
    expect(entities.find((e) => e.type === 'regulation' && e.value === 'GDPR')).toBeDefined();
    expect(entities.find((e) => e.type === 'status' && e.value === 'non_compliant')).toBeDefined();
    expect(entities.find((e) => e.type === 'severity' && e.value === 'critical')).toBeDefined();
    expect(entities.find((e) => e.type === 'date' && e.value === 'last_week')).toBeDefined();
  });
});

// ===========================================================================
// Unit tests: Structured Query Building
// ===========================================================================

describe('buildStructuredQuery', () => {
  it('should set type to compliance for compliance_search intent', () => {
    const query = buildStructuredQuery('GDPR check', 'compliance_search', []);
    expect(query.type).toBe('compliance');
  });

  it('should set type to reports for report_search intent', () => {
    const query = buildStructuredQuery('Generate report', 'report_search', []);
    expect(query.type).toBe('reports');
  });

  it('should set type to all for general_search intent', () => {
    const query = buildStructuredQuery('hello', 'general_search', []);
    expect(query.type).toBe('all');
  });

  it('should apply regulation entity to query', () => {
    const entities = [{ type: 'regulation' as const, value: 'GDPR' }];
    const query = buildStructuredQuery('Show GDPR items', 'compliance_search', entities);
    expect(query.query).toBe('GDPR');
  });

  it('should apply status entity', () => {
    const entities = [{ type: 'status' as const, value: 'non_compliant' }];
    const query = buildStructuredQuery('non-compliant items', 'compliance_search', entities);
    expect(query.status).toBe('non_compliant');
  });

  it('should apply severity entity', () => {
    const entities = [{ type: 'severity' as const, value: 'critical' }];
    const query = buildStructuredQuery('critical issues', 'compliance_search', entities);
    expect(query.severity).toBe('critical');
  });

  it('should apply date entity with year resolution', () => {
    const entities = [{ type: 'date' as const, value: '2024' }];
    const query = buildStructuredQuery('Records from 2024', 'compliance_search', entities);
    expect(query.dateFrom).toBe('2024-01-01');
    expect(query.dateTo).toBe('2024-12-31');
  });
});

// ===========================================================================
// Unit tests: Interpretation
// ===========================================================================

describe('buildInterpretation', () => {
  it('should generate interpretation for compliance search', () => {
    const interp = buildInterpretation('compliance_search', [], 'test');
    expect(interp).toContain('compliance records');
  });

  it('should include regulation in interpretation', () => {
    const entities = [{ type: 'regulation' as const, value: 'GDPR' }];
    const interp = buildInterpretation('compliance_search', entities, 'GDPR');
    expect(interp).toContain('GDPR');
  });

  it('should include status in interpretation', () => {
    const entities = [{ type: 'status' as const, value: 'non_compliant' }];
    const interp = buildInterpretation('compliance_search', entities, 'test');
    expect(interp).toContain('non_compliant');
  });

  it('should generate interpretation for report search', () => {
    const interp = buildInterpretation('report_search', [], 'test');
    expect(interp).toContain('reports');
  });
});

// ===========================================================================
// Integration: POST /api/search/natural
// ===========================================================================

describe('POST /api/search/natural', () => {
  it('should return 200 with NL search results for a compliance query', async () => {
    const res = await request(app)
      .post('/api/search/natural')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'Show me GDPR compliance records' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('intent', 'compliance_search');
    expect(res.body).toHaveProperty('confidence');
    expect(res.body.confidence).toBeGreaterThan(0.5);
    expect(res.body).toHaveProperty('entities');
    expect(res.body.entities).toContainEqual({ type: 'regulation', value: 'GDPR' });
    expect(res.body).toHaveProperty('structuredQuery');
    expect(res.body.structuredQuery.type).toBe('compliance');
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('interpretation');
    expect(res.body.interpretation).toContain('GDPR');
  });

  it('should return 200 with results for a report query', async () => {
    const res = await request(app)
      .post('/api/search/natural')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'Generate a risk assessment report' });

    expect(res.status).toBe(200);
    expect(res.body.intent).toBe('report_search');
    expect(res.body.structuredQuery.type).toBe('reports');
    expect(res.body.entities).toContainEqual({ type: 'report_type', value: 'risk_assessment' });
  });

  it('should return 200 with general search for ambiguous queries', async () => {
    const res = await request(app)
      .post('/api/search/natural')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'hello world' });

    expect(res.status).toBe(200);
    expect(res.body.intent).toBe('general_search');
    expect(res.body.results).toEqual([]);
  });

  it('should extract multiple entities from a complex query', async () => {
    const res = await request(app)
      .post('/api/search/natural')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'Show critical HIPAA non-compliant records from 2024' });

    expect(res.status).toBe(200);
    expect(
      res.body.entities.find(
        (e: { type: string; value: string }) => e.type === 'regulation' && e.value === 'HIPAA',
      ),
    ).toBeDefined();
    expect(
      res.body.entities.find(
        (e: { type: string; value: string }) => e.type === 'status' && e.value === 'non_compliant',
      ),
    ).toBeDefined();
    expect(
      res.body.entities.find(
        (e: { type: string; value: string }) => e.type === 'severity' && e.value === 'critical',
      ),
    ).toBeDefined();
    expect(
      res.body.entities.find(
        (e: { type: string; value: string }) => e.type === 'date' && e.value === '2024',
      ),
    ).toBeDefined();
  });

  it('should return 400 when query is missing', async () => {
    const res = await request(app)
      .post('/api/search/natural')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when query is empty', async () => {
    const res = await request(app)
      .post('/api/search/natural')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 401 without auth', async () => {
    const res = await request(app).post('/api/search/natural').send({ query: 'GDPR compliance' });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});
