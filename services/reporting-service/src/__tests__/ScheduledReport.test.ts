import { sequelize, ScheduledReport, ReportTemplate } from '../models';

// Force test environment
process.env.NODE_ENV = 'test';

describe('ScheduledReport Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await ScheduledReport.destroy({ where: {} });
    await ReportTemplate.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should create a scheduled report with valid data', async () => {
    const schedule = await ScheduledReport.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'compliance_summary',
      schedule: '0 9 * * 1',
      format: 'pdf',
      parameters: { department: 'engineering' },
    });

    expect(schedule.id).toBeDefined();
    expect(schedule.userId).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(schedule.reportType).toBe('compliance_summary');
    expect(schedule.schedule).toBe('0 9 * * 1');
    expect(schedule.format).toBe('pdf');
    expect(schedule.parameters).toEqual({ department: 'engineering' });
    expect(schedule.createdAt).toBeDefined();
    expect(schedule.updatedAt).toBeDefined();
  });

  it('should default isActive to true', async () => {
    const schedule = await ScheduledReport.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'risk_assessment',
      schedule: '0 8 * * *',
    });

    expect(schedule.isActive).toBe(true);
  });

  it('should default format to pdf', async () => {
    const schedule = await ScheduledReport.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'audit_trail',
      schedule: '30 17 * * 5',
    });

    expect(schedule.format).toBe('pdf');
  });

  it('should store cron expression', async () => {
    const schedule = await ScheduledReport.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'regulatory_status',
      schedule: '0 0 1 * *',
    });

    await schedule.reload();
    expect(schedule.schedule).toBe('0 0 1 * *');
  });

  it('should require userId', async () => {
    await expect(
      ScheduledReport.create({
        reportType: 'compliance_summary',
        schedule: '0 9 * * 1',
      } as any),
    ).rejects.toThrow();
  });

  it('should require schedule', async () => {
    await expect(
      ScheduledReport.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        reportType: 'compliance_summary',
      } as any),
    ).rejects.toThrow();
  });

  it('should allow nullable templateId, parameters, lastRunAt, nextRunAt', async () => {
    const schedule = await ScheduledReport.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'compliance_summary',
      schedule: '0 9 * * 1',
    });

    expect(schedule.templateId ?? null).toBeNull();
    expect(schedule.parameters ?? null).toBeNull();
    expect(schedule.lastRunAt ?? null).toBeNull();
    expect(schedule.nextRunAt ?? null).toBeNull();
  });

  it('should associate with ReportTemplate', async () => {
    const template = await ReportTemplate.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Weekly Compliance',
      reportType: 'compliance_summary',
    });

    const schedule = await ScheduledReport.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      reportType: 'compliance_summary',
      templateId: template.id,
      schedule: '0 9 * * 1',
    });

    expect(schedule.templateId).toBe(template.id);

    // Verify through query with include
    const found = await ScheduledReport.findByPk(schedule.id, {
      include: [{ model: ReportTemplate, as: 'template' }],
    });

    expect(found).not.toBeNull();
    expect((found as any).template).not.toBeNull();
    expect((found as any).template.name).toBe('Weekly Compliance');
  });
});
