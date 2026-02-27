/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../index';
import { sequelize } from '../config/database';
import ComplianceCalendar from '../models/ComplianceCalendar';

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
  await ComplianceCalendar.destroy({ where: {} });
});

// ──────────────────────────────────────────────────────────
// Create Calendar Event
// ──────────────────────────────────────────────────────────

describe('POST /api/compliance/calendar', () => {
  it('should create a calendar event and return 201', async () => {
    const res = await request(app)
      .post('/api/compliance/calendar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'GDPR Annual Audit',
        eventType: 'audit',
        date: '2026-04-15',
        priority: 'high',
        description: 'Annual GDPR compliance audit',
      });

    expect(res.status).toBe(201);
    expect(res.body.event).toHaveProperty('id');
    expect(res.body.event.title).toBe('GDPR Annual Audit');
    expect(res.body.event.eventType).toBe('audit');
    expect(res.body.event.priority).toBe('high');
    expect(res.body.event.status).toBe('upcoming');
    expect(res.body.event.description).toBe('Annual GDPR compliance audit');
    expect(res.body.event.userId).toBe('1');
    expect(res.body.event.reminderDays).toBe(7);
  });

  it('should return 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/compliance/calendar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        eventType: 'audit',
        date: '2026-04-15',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when eventType is missing', async () => {
    const res = await request(app)
      .post('/api/compliance/calendar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Event',
        date: '2026-04-15',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when date is missing', async () => {
    const res = await request(app)
      .post('/api/compliance/calendar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Event',
        eventType: 'audit',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 for invalid eventType', async () => {
    const res = await request(app)
      .post('/api/compliance/calendar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Event',
        eventType: 'invalid_type',
        date: '2026-04-15',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 for invalid priority', async () => {
    const res = await request(app)
      .post('/api/compliance/calendar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Event',
        eventType: 'audit',
        date: '2026-04-15',
        priority: 'invalid_priority',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).post('/api/compliance/calendar').send({
      title: 'Test Event',
      eventType: 'audit',
      date: '2026-04-15',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('should create event with metadata', async () => {
    const metadata = { department: 'Legal', tags: ['annual', 'gdpr'] };
    const res = await request(app)
      .post('/api/compliance/calendar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test With Metadata',
        eventType: 'review',
        date: '2026-05-01',
        metadata,
      });

    expect(res.status).toBe(201);
    expect(res.body.event.metadata).toEqual(metadata);
  });
});

// ──────────────────────────────────────────────────────────
// List Calendar Events
// ──────────────────────────────────────────────────────────

describe('GET /api/compliance/calendar', () => {
  beforeEach(async () => {
    await ComplianceCalendar.bulkCreate([
      {
        userId: '1',
        title: 'Event A',
        eventType: 'deadline',
        date: new Date('2026-03-01'),
        status: 'upcoming',
        priority: 'high',
      },
      {
        userId: '1',
        title: 'Event B',
        eventType: 'audit',
        date: new Date('2026-03-15'),
        status: 'upcoming',
        priority: 'medium',
      },
      {
        userId: '1',
        title: 'Event C',
        eventType: 'deadline',
        date: new Date('2026-04-01'),
        status: 'completed',
        priority: 'low',
      },
      {
        userId: '2',
        title: 'Event D',
        eventType: 'training',
        date: new Date('2026-03-10'),
        status: 'upcoming',
        priority: 'medium',
      },
      {
        userId: '1',
        title: 'Event E',
        eventType: 'review',
        date: new Date('2026-03-20'),
        status: 'in_progress',
        priority: 'critical',
      },
    ]);
  });

  it('should return all events with 200', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('events');
    expect(res.body).toHaveProperty('total', 5);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit');
    expect(res.body.events.length).toBe(5);
  });

  it('should filter by userId', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar?userId=1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    res.body.events.forEach((event: any) => {
      expect(event.userId).toBe('1');
    });
  });

  it('should filter by eventType', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar?eventType=deadline')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    res.body.events.forEach((event: any) => {
      expect(event.eventType).toBe('deadline');
    });
  });

  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar?status=upcoming')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    res.body.events.forEach((event: any) => {
      expect(event.status).toBe('upcoming');
    });
  });

  it('should filter by date range', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar?dateFrom=2026-03-10&dateTo=2026-03-20')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
  });

  it('should paginate results', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar?page=1&limit=2')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.events.length).toBe(2);
    expect(res.body.total).toBe(5);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });

  it('should return events sorted by date ascending', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const dates = res.body.events.map((e: any) => new Date(e.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });
});

// ──────────────────────────────────────────────────────────
// Get Single Calendar Event
// ──────────────────────────────────────────────────────────

describe('GET /api/compliance/calendar/:id', () => {
  it('should return a single event by ID', async () => {
    const event = await ComplianceCalendar.create({
      userId: '1',
      title: 'Single Event',
      eventType: 'audit',
      date: new Date('2026-04-15'),
    });

    const res = await request(app)
      .get(`/api/compliance/calendar/${event.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.event.id).toBe(event.id);
    expect(res.body.event.title).toBe('Single Event');
  });

  it('should return 404 for non-existent event', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});

// ──────────────────────────────────────────────────────────
// Update Calendar Event
// ──────────────────────────────────────────────────────────

describe('PUT /api/compliance/calendar/:id', () => {
  let eventId: string;

  beforeEach(async () => {
    const event = await ComplianceCalendar.create({
      userId: '1',
      title: 'Original Title',
      eventType: 'review',
      date: new Date('2026-04-01'),
      priority: 'medium',
      status: 'upcoming',
    });
    eventId = event.id;
  });

  it('should update event fields and return 200', async () => {
    const res = await request(app)
      .put(`/api/compliance/calendar/${eventId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Updated Title',
        priority: 'critical',
        status: 'in_progress',
      });

    expect(res.status).toBe(200);
    expect(res.body.event.title).toBe('Updated Title');
    expect(res.body.event.priority).toBe('critical');
    expect(res.body.event.status).toBe('in_progress');
  });

  it('should return 404 for non-existent event', async () => {
    const res = await request(app)
      .put('/api/compliance/calendar/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('should return 400 for invalid eventType', async () => {
    const res = await request(app)
      .put(`/api/compliance/calendar/${eventId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ eventType: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 for invalid status', async () => {
    const res = await request(app)
      .put(`/api/compliance/calendar/${eventId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 for invalid priority', async () => {
    const res = await request(app)
      .put(`/api/compliance/calendar/${eventId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ priority: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });
});

// ──────────────────────────────────────────────────────────
// Delete Calendar Event
// ──────────────────────────────────────────────────────────

describe('DELETE /api/compliance/calendar/:id', () => {
  it('should delete an event and return 200', async () => {
    const event = await ComplianceCalendar.create({
      userId: '1',
      title: 'To Delete',
      eventType: 'review',
      date: new Date('2026-04-01'),
    });

    const res = await request(app)
      .delete(`/api/compliance/calendar/${event.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Calendar event deleted successfully');

    const deleted = await ComplianceCalendar.findByPk(event.id);
    expect(deleted).toBeNull();
  });

  it('should return 404 for non-existent event', async () => {
    const res = await request(app)
      .delete('/api/compliance/calendar/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});

// ──────────────────────────────────────────────────────────
// Upcoming Deadlines
// ──────────────────────────────────────────────────────────

describe('GET /api/compliance/calendar/upcoming', () => {
  beforeEach(async () => {
    const now = new Date();
    const inFiveDays = new Date();
    inFiveDays.setDate(now.getDate() + 5);
    const inTenDays = new Date();
    inTenDays.setDate(now.getDate() + 10);
    const inTwentyDays = new Date();
    inTwentyDays.setDate(now.getDate() + 20);
    const inSixtyDays = new Date();
    inSixtyDays.setDate(now.getDate() + 60);
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    await ComplianceCalendar.bulkCreate([
      {
        userId: '1',
        title: 'Deadline Soon',
        eventType: 'deadline',
        date: inFiveDays,
        status: 'upcoming',
        priority: 'high',
      },
      {
        userId: '1',
        title: 'Audit Next Week',
        eventType: 'audit',
        date: inTenDays,
        status: 'upcoming',
        priority: 'medium',
      },
      {
        userId: '1',
        title: 'Review Later',
        eventType: 'review',
        date: inTwentyDays,
        status: 'upcoming',
        priority: 'low',
      },
      {
        userId: '1',
        title: 'Far Future Deadline',
        eventType: 'deadline',
        date: inSixtyDays,
        status: 'upcoming',
        priority: 'medium',
      },
      {
        userId: '1',
        title: 'Completed Audit',
        eventType: 'audit',
        date: inFiveDays,
        status: 'completed',
        priority: 'medium',
      },
      {
        userId: '1',
        title: 'Past Deadline',
        eventType: 'deadline',
        date: yesterday,
        status: 'overdue',
        priority: 'critical',
      },
      {
        userId: '2',
        title: 'Other User Deadline',
        eventType: 'deadline',
        date: inFiveDays,
        status: 'upcoming',
        priority: 'high',
      },
    ]);
  });

  it('should return upcoming deadlines and audits within 30 days', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar/upcoming')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('events');
    expect(res.body).toHaveProperty('total');

    // Should include: Deadline Soon, Audit Next Week, Other User Deadline (not review, not completed, not past, not far future)
    const titles = res.body.events.map((e: any) => e.title);
    expect(titles).toContain('Deadline Soon');
    expect(titles).toContain('Audit Next Week');
    expect(titles).toContain('Other User Deadline');
    expect(titles).not.toContain('Review Later'); // review type, not deadline/audit
    expect(titles).not.toContain('Far Future Deadline'); // beyond 30 days
    expect(titles).not.toContain('Completed Audit'); // already completed
  });

  it('should filter upcoming deadlines by userId', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar/upcoming?userId=1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    res.body.events.forEach((event: any) => {
      expect(event.userId).toBe('1');
    });
    const titles = res.body.events.map((e: any) => e.title);
    expect(titles).not.toContain('Other User Deadline');
  });

  it('should return events sorted by date ascending', async () => {
    const res = await request(app)
      .get('/api/compliance/calendar/upcoming')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const dates = res.body.events.map((e: any) => new Date(e.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });
});

// ──────────────────────────────────────────────────────────
// Auth required
// ──────────────────────────────────────────────────────────

describe('Authentication required', () => {
  it('GET /api/compliance/calendar should return 401 without auth', async () => {
    const res = await request(app).get('/api/compliance/calendar');
    expect(res.status).toBe(401);
  });

  it('GET /api/compliance/calendar/upcoming should return 401 without auth', async () => {
    const res = await request(app).get('/api/compliance/calendar/upcoming');
    expect(res.status).toBe(401);
  });

  it('POST /api/compliance/calendar should return 401 without auth', async () => {
    const res = await request(app).post('/api/compliance/calendar').send({ title: 'Test' });
    expect(res.status).toBe(401);
  });

  it('PUT /api/compliance/calendar/:id should return 401 without auth', async () => {
    const res = await request(app)
      .put('/api/compliance/calendar/some-id')
      .send({ title: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/compliance/calendar/:id should return 401 without auth', async () => {
    const res = await request(app).delete('/api/compliance/calendar/some-id');
    expect(res.status).toBe(401);
  });
});
