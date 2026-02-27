/**
 * Seed data validation tests
 *
 * These are pure validation tests — no database required.
 * They verify that all seed data has correct structure and valid values.
 */
import { regulations, RegulationSeed } from '../seed-regulations';
import { agentTemplates, AgentTemplateSeed } from '../seed-agent-templates';
import { reportTemplates, ReportTemplateSeed } from '../seed-report-templates';

// ---------------------------------------------------------------------------
// Regulation seed data tests
// ---------------------------------------------------------------------------
describe('Regulation seed data', () => {
  it('should contain at least 10 regulations', () => {
    expect(regulations.length).toBeGreaterThanOrEqual(10);
  });

  it('should have all required fields for each regulation', () => {
    const requiredFields: (keyof RegulationSeed)[] = [
      'name',
      'description',
      'jurisdiction',
      'category',
      'effectiveDate',
    ];

    for (const reg of regulations) {
      for (const field of requiredFields) {
        expect(reg[field]).toBeDefined();
        expect(typeof reg[field]).toBe('string');
        expect((reg[field] as string).length).toBeGreaterThan(0);
      }
    }
  });

  it('should have valid ISO-8601 date strings for effectiveDate', () => {
    for (const reg of regulations) {
      const parsed = new Date(reg.effectiveDate);
      expect(parsed.getTime()).not.toBeNaN();
      // Verify the format matches YYYY-MM-DD
      expect(reg.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('should have unique regulation names', () => {
    const names = regulations.map((r) => r.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should include the expected key regulations', () => {
    const names = regulations.map((r) => r.name);
    const expectedRegulations = ['GDPR', 'HIPAA', 'SOX', 'PCI-DSS', 'CCPA'];
    for (const expected of expectedRegulations) {
      expect(names).toContain(expected);
    }
  });

  it('should have non-empty descriptions', () => {
    for (const reg of regulations) {
      expect(reg.description.length).toBeGreaterThan(10);
    }
  });
});

// ---------------------------------------------------------------------------
// Agent template seed data tests
// ---------------------------------------------------------------------------
describe('Agent template seed data', () => {
  const validTypes = [
    'compliance_monitor',
    'risk_analyzer',
    'regulatory_tracker',
    'audit_agent',
    'custom',
  ];

  it('should contain at least 5 templates', () => {
    expect(agentTemplates.length).toBeGreaterThanOrEqual(5);
  });

  it('should have all required fields for each template', () => {
    const requiredFields: (keyof AgentTemplateSeed)[] = [
      'name',
      'type',
      'description',
      'configuration',
    ];

    for (const tpl of agentTemplates) {
      for (const field of requiredFields) {
        expect(tpl[field]).toBeDefined();
      }
    }
  });

  it('should have valid agent types', () => {
    for (const tpl of agentTemplates) {
      expect(validTypes).toContain(tpl.type);
    }
  });

  it('should have non-empty configuration objects', () => {
    for (const tpl of agentTemplates) {
      expect(typeof tpl.configuration).toBe('object');
      expect(tpl.configuration).not.toBeNull();
      expect(Object.keys(tpl.configuration).length).toBeGreaterThan(0);
    }
  });

  it('should have unique template names', () => {
    const names = agentTemplates.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have non-empty descriptions', () => {
    for (const tpl of agentTemplates) {
      expect(typeof tpl.description).toBe('string');
      expect(tpl.description.length).toBeGreaterThan(10);
    }
  });
});

// ---------------------------------------------------------------------------
// Report template seed data tests
// ---------------------------------------------------------------------------
describe('Report template seed data', () => {
  const validReportTypes = [
    'compliance_summary',
    'risk_assessment',
    'audit_trail',
    'regulatory_status',
  ];

  it('should contain at least 4 templates', () => {
    expect(reportTemplates.length).toBeGreaterThanOrEqual(4);
  });

  it('should have all required fields for each template', () => {
    const requiredFields: (keyof ReportTemplateSeed)[] = [
      'name',
      'description',
      'reportType',
      'layout',
      'sections',
      'filters',
    ];

    for (const tpl of reportTemplates) {
      for (const field of requiredFields) {
        expect(tpl[field]).toBeDefined();
      }
    }
  });

  it('should have valid report types', () => {
    for (const tpl of reportTemplates) {
      expect(validReportTypes).toContain(tpl.reportType);
    }
  });

  it('should have non-empty sections arrays', () => {
    for (const tpl of reportTemplates) {
      expect(Array.isArray(tpl.sections)).toBe(true);
      expect(tpl.sections.length).toBeGreaterThan(0);
    }
  });

  it('should have valid section structure', () => {
    for (const tpl of reportTemplates) {
      for (const section of tpl.sections) {
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('type');
        expect(section).toHaveProperty('description');
        expect(typeof section.title).toBe('string');
        expect(section.title.length).toBeGreaterThan(0);
        expect(typeof section.type).toBe('string');
        expect(section.type.length).toBeGreaterThan(0);
      }
    }
  });

  it('should have non-empty filters arrays', () => {
    for (const tpl of reportTemplates) {
      expect(Array.isArray(tpl.filters)).toBe(true);
      expect(tpl.filters.length).toBeGreaterThan(0);
    }
  });

  it('should have valid filter structure', () => {
    for (const tpl of reportTemplates) {
      for (const filter of tpl.filters) {
        expect(filter).toHaveProperty('field');
        expect(filter).toHaveProperty('label');
        expect(filter).toHaveProperty('type');
        expect(typeof filter.field).toBe('string');
        expect(filter.field.length).toBeGreaterThan(0);
        expect(typeof filter.label).toBe('string');
        expect(filter.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('should have non-empty layout strings', () => {
    for (const tpl of reportTemplates) {
      expect(typeof tpl.layout).toBe('string');
      expect(tpl.layout.length).toBeGreaterThan(0);
    }
  });

  it('should have unique template names', () => {
    const names = reportTemplates.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});
