import { sequelize, ReportTemplate } from '../models';

// Force test environment
process.env.NODE_ENV = 'test';

describe('ReportTemplate Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await ReportTemplate.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should create a template with valid data', async () => {
    const template = await ReportTemplate.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Monthly Compliance Report',
      description: 'A monthly overview of compliance status',
      reportType: 'compliance_summary',
      defaultParameters: { department: 'engineering', period: 'monthly' },
      sections: [
        { type: 'summary', title: 'Executive Summary' },
        { type: 'chart', chartType: 'bar' },
        { type: 'table', columns: ['item', 'status', 'date'] },
      ],
      isPublic: true,
    });

    expect(template.id).toBeDefined();
    expect(template.userId).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(template.name).toBe('Monthly Compliance Report');
    expect(template.description).toBe('A monthly overview of compliance status');
    expect(template.reportType).toBe('compliance_summary');
    expect(template.defaultParameters).toEqual({ department: 'engineering', period: 'monthly' });
    expect(template.sections).toHaveLength(3);
    expect(template.isPublic).toBe(true);
    expect(template.createdAt).toBeDefined();
    expect(template.updatedAt).toBeDefined();
  });

  it('should default isPublic to false', async () => {
    const template = await ReportTemplate.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Private Template',
      reportType: 'risk_assessment',
    });

    expect(template.isPublic).toBe(false);
  });

  it('should require name', async () => {
    await expect(
      ReportTemplate.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        reportType: 'compliance_summary',
      } as any),
    ).rejects.toThrow();
  });

  it('should require reportType', async () => {
    await expect(
      ReportTemplate.create({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Template',
      } as any),
    ).rejects.toThrow();
  });

  it('should require userId', async () => {
    await expect(
      ReportTemplate.create({
        name: 'Test Template',
        reportType: 'compliance_summary',
      } as any),
    ).rejects.toThrow();
  });

  it('should store JSON sections correctly', async () => {
    const sections = [
      { type: 'summary', title: 'Overview' },
      { type: 'chart', chartType: 'pie' },
      { type: 'table', columns: ['name', 'value'] },
    ];

    const template = await ReportTemplate.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Sections Test',
      reportType: 'audit_trail',
      sections,
    });

    await template.reload();
    expect(template.sections).toEqual(sections);
  });

  it('should allow nullable description, defaultParameters, and sections', async () => {
    const template = await ReportTemplate.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Minimal Template',
      reportType: 'regulatory_status',
    });

    expect(template.description ?? null).toBeNull();
    expect(template.defaultParameters ?? null).toBeNull();
    expect(template.sections ?? null).toBeNull();
  });

  it('should distinguish public vs private templates', async () => {
    const publicTemplate = await ReportTemplate.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Public Template',
      reportType: 'compliance_summary',
      isPublic: true,
    });

    const privateTemplate = await ReportTemplate.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Private Template',
      reportType: 'compliance_summary',
      isPublic: false,
    });

    expect(publicTemplate.isPublic).toBe(true);
    expect(privateTemplate.isPublic).toBe(false);

    // Query only public templates
    const publicTemplates = await ReportTemplate.findAll({ where: { isPublic: true } });
    expect(publicTemplates).toHaveLength(1);
    expect(publicTemplates[0].name).toBe('Public Template');
  });
});
