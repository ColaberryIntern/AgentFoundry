/* eslint-disable @typescript-eslint/no-explicit-any */
import { sequelize } from '../config/database';
import ComplianceCalendar from '../models/ComplianceCalendar';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await ComplianceCalendar.destroy({ where: {} });
});

describe('ComplianceCalendar Model', () => {
  it('should create a calendar event with all required fields', async () => {
    const event = await ComplianceCalendar.create({
      userId: '1',
      title: 'GDPR Annual Audit',
      eventType: 'audit',
      date: new Date('2026-04-15'),
    });

    expect(event.id).toBeTruthy();
    expect(event.userId).toBe('1');
    expect(event.title).toBe('GDPR Annual Audit');
    expect(event.eventType).toBe('audit');
    expect(event.date).toBeTruthy();
    expect(event.status).toBe('upcoming');
    expect(event.priority).toBe('medium');
    expect(event.reminderDays).toBe(7);
    expect(event.description).toBeFalsy();
    expect(event.endDate).toBeFalsy();
    expect(event.regulationId).toBeFalsy();
    expect(event.metadata).toBeFalsy();
    expect(event.createdAt).toBeTruthy();
    expect(event.updatedAt).toBeTruthy();
  });

  it('should create a calendar event with all optional fields', async () => {
    const event = await ComplianceCalendar.create({
      userId: '1',
      title: 'SOX Compliance Deadline',
      description: 'Annual SOX compliance deadline for Q1 reporting',
      eventType: 'deadline',
      date: new Date('2026-03-31'),
      endDate: new Date('2026-04-01'),
      status: 'in_progress',
      priority: 'high',
      regulationId: 'SOX-2026',
      metadata: { department: 'Finance', contact: 'cfo@company.com' },
      reminderDays: 14,
    });

    expect(event.title).toBe('SOX Compliance Deadline');
    expect(event.description).toBe('Annual SOX compliance deadline for Q1 reporting');
    expect(event.eventType).toBe('deadline');
    expect(event.status).toBe('in_progress');
    expect(event.priority).toBe('high');
    expect(event.regulationId).toBe('SOX-2026');
    expect(event.metadata).toEqual({ department: 'Finance', contact: 'cfo@company.com' });
    expect(event.reminderDays).toBe(14);
    expect(event.endDate).toBeTruthy();
  });

  it('should use UUID as primary key', async () => {
    const event = await ComplianceCalendar.create({
      userId: '1',
      title: 'Test Event',
      eventType: 'review',
      date: new Date('2026-05-01'),
    });

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(event.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('should enforce required userId field', async () => {
    await expect(
      ComplianceCalendar.create({
        title: 'No User Event',
        eventType: 'review',
        date: new Date('2026-05-01'),
      } as any),
    ).rejects.toThrow();
  });

  it('should enforce required title field', async () => {
    await expect(
      ComplianceCalendar.create({
        userId: '1',
        eventType: 'review',
        date: new Date('2026-05-01'),
      } as any),
    ).rejects.toThrow();
  });

  it('should enforce required date field', async () => {
    await expect(
      ComplianceCalendar.create({
        userId: '1',
        title: 'No Date Event',
        eventType: 'review',
      } as any),
    ).rejects.toThrow();
  });

  it('should validate eventType enum values', async () => {
    const validTypes = ['deadline', 'audit', 'regulatory_change', 'review', 'training'];

    for (const eventType of validTypes) {
      const event = await ComplianceCalendar.create({
        userId: '1',
        title: `Test ${eventType}`,
        eventType: eventType as any,
        date: new Date('2026-05-01'),
      });
      expect(event.eventType).toBe(eventType);
    }
  });

  it('should validate status enum values', async () => {
    const validStatuses = ['upcoming', 'in_progress', 'completed', 'overdue', 'cancelled'];

    for (const status of validStatuses) {
      const event = await ComplianceCalendar.create({
        userId: '1',
        title: `Test ${status}`,
        eventType: 'review',
        date: new Date('2026-05-01'),
        status: status as any,
      });
      expect(event.status).toBe(status);
    }
  });

  it('should validate priority enum values', async () => {
    const validPriorities = ['low', 'medium', 'high', 'critical'];

    for (const priority of validPriorities) {
      const event = await ComplianceCalendar.create({
        userId: '1',
        title: `Test ${priority}`,
        eventType: 'review',
        date: new Date('2026-05-01'),
        priority: priority as any,
      });
      expect(event.priority).toBe(priority);
    }
  });

  it('should store and retrieve JSON metadata', async () => {
    const metadata = {
      tags: ['urgent', 'quarterly'],
      assignees: [{ name: 'John', role: 'auditor' }],
      notes: 'Important quarterly review',
    };

    const event = await ComplianceCalendar.create({
      userId: '1',
      title: 'Metadata Test',
      eventType: 'review',
      date: new Date('2026-05-01'),
      metadata,
    });

    const fetched = await ComplianceCalendar.findByPk(event.id);
    expect(fetched!.metadata).toEqual(metadata);
  });

  it('should default status to upcoming', async () => {
    const event = await ComplianceCalendar.create({
      userId: '1',
      title: 'Default Status Test',
      eventType: 'review',
      date: new Date('2026-05-01'),
    });

    expect(event.status).toBe('upcoming');
  });

  it('should default priority to medium', async () => {
    const event = await ComplianceCalendar.create({
      userId: '1',
      title: 'Default Priority Test',
      eventType: 'review',
      date: new Date('2026-05-01'),
    });

    expect(event.priority).toBe('medium');
  });

  it('should default reminderDays to 7', async () => {
    const event = await ComplianceCalendar.create({
      userId: '1',
      title: 'Default Reminder Test',
      eventType: 'review',
      date: new Date('2026-05-01'),
    });

    expect(event.reminderDays).toBe(7);
  });
});
