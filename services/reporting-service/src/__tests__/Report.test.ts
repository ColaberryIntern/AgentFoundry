import { sequelize } from '../config/database';
import { Report } from '../models/Report';

// Force test environment
process.env.NODE_ENV = 'test';

describe('Report Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await Report.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should create a report with valid attributes', async () => {
    const report = await Report.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'compliance_summary',
      format: 'pdf',
    });

    expect(report.id).toBeDefined();
    expect(report.userId).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(report.reportType).toBe('compliance_summary');
    expect(report.format).toBe('pdf');
    expect(report.status).toBe('queued');
    expect(report.downloadUrl ?? null).toBeNull();
    expect(report.errorMessage ?? null).toBeNull();
    expect(report.createdAt).toBeDefined();
    expect(report.updatedAt).toBeDefined();
  });

  it('should require userId', async () => {
    await expect(
      Report.create({
        reportType: 'compliance_summary',
      } as any),
    ).rejects.toThrow();
  });

  it('should require reportType', async () => {
    await expect(
      Report.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
      } as any),
    ).rejects.toThrow();
  });

  it('should default format to pdf', async () => {
    const report = await Report.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'risk_assessment',
    });

    expect(report.format).toBe('pdf');
  });

  it('should default status to queued', async () => {
    const report = await Report.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'audit_trail',
    });

    expect(report.status).toBe('queued');
  });

  it('should allow status transitions', async () => {
    const report = await Report.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'compliance_summary',
    });

    expect(report.status).toBe('queued');

    await report.update({ status: 'processing' });
    expect(report.status).toBe('processing');

    await report.update({ status: 'completed', downloadUrl: '/api/reports/download/test.pdf' });
    expect(report.status).toBe('completed');
    expect(report.downloadUrl).toBe('/api/reports/download/test.pdf');
  });

  it('should store JSON parameters', async () => {
    const params = { startDate: '2025-01-01', endDate: '2025-12-31', department: 'engineering' };

    const report = await Report.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'regulatory_status',
      parameters: params,
    });

    await report.reload();

    expect(report.parameters).toEqual(params);
  });

  it('should allow csv format', async () => {
    const report = await Report.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'compliance_summary',
      format: 'csv',
    });

    expect(report.format).toBe('csv');
  });
});
