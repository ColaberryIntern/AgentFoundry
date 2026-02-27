import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import ComplianceCalendar from '../models/ComplianceCalendar';
import { AppError } from '../utils/AppError';

const VALID_EVENT_TYPES = ['deadline', 'audit', 'regulatory_change', 'review', 'training'] as const;
const VALID_STATUSES = ['upcoming', 'in_progress', 'completed', 'overdue', 'cancelled'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

/**
 * GET /api/compliance/calendar
 * List calendar events with optional filters and pagination.
 */
export async function listCalendarEvents(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (req.query.userId) {
      where.userId = req.query.userId;
    }

    if (req.query.eventType) {
      where.eventType = req.query.eventType;
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    // Date range filtering
    if (req.query.dateFrom || req.query.dateTo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dateFilter: any = {};
      if (req.query.dateFrom) {
        dateFilter[Op.gte] = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        dateFilter[Op.lte] = new Date(req.query.dateTo as string);
      }
      where.date = dateFilter;
    }

    const { count, rows } = await ComplianceCalendar.findAndCountAll({
      where,
      limit,
      offset,
      order: [['date', 'ASC']],
    });

    res.status(200).json({
      events: rows.map((r) => r.toJSON()),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/compliance/calendar/upcoming
 * Returns upcoming deadlines and audits within the next 30 days, sorted by date.
 */
export async function getUpcomingDeadlines(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const where: Record<string, unknown> = {
      eventType: { [Op.in]: ['deadline', 'audit'] },
      date: { [Op.gte]: now, [Op.lte]: thirtyDaysFromNow },
      status: { [Op.notIn]: ['completed', 'cancelled'] },
    };

    if (req.query.userId) {
      where.userId = req.query.userId;
    }

    const events = await ComplianceCalendar.findAll({
      where,
      order: [['date', 'ASC']],
    });

    res.status(200).json({
      events: events.map((r) => r.toJSON()),
      total: events.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/compliance/calendar/:id
 * Get a single calendar event by ID.
 */
export async function getCalendarEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const event = await ComplianceCalendar.findByPk(id);

    if (!event) {
      throw AppError.notFound('Calendar event not found');
    }

    res.status(200).json({ event: event.toJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/compliance/calendar
 * Create a new calendar event.
 */
export async function createCalendarEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      title,
      description,
      eventType,
      date,
      endDate,
      status,
      priority,
      regulationId,
      metadata,
      reminderDays,
    } = req.body;

    if (!title) {
      throw AppError.badRequest('title is required');
    }

    if (!eventType) {
      throw AppError.badRequest('eventType is required');
    }

    if (!VALID_EVENT_TYPES.includes(eventType)) {
      throw AppError.badRequest(
        `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
      );
    }

    if (!date) {
      throw AppError.badRequest('date is required');
    }

    if (status && !VALID_STATUSES.includes(status)) {
      throw AppError.badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      throw AppError.badRequest(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    const event = await ComplianceCalendar.create({
      userId: String(req.user!.userId),
      title,
      description: description || null,
      eventType,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      status: status || 'upcoming',
      priority: priority || 'medium',
      regulationId: regulationId || null,
      metadata: metadata || null,
      reminderDays: reminderDays != null ? reminderDays : 7,
    });

    res.status(201).json({ event: event.toJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/compliance/calendar/:id
 * Update an existing calendar event.
 */
export async function updateCalendarEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const event = await ComplianceCalendar.findByPk(id);

    if (!event) {
      throw AppError.notFound('Calendar event not found');
    }

    const {
      title,
      description,
      eventType,
      date,
      endDate,
      status,
      priority,
      regulationId,
      metadata,
      reminderDays,
    } = req.body;

    if (eventType && !VALID_EVENT_TYPES.includes(eventType)) {
      throw AppError.badRequest(
        `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      throw AppError.badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      throw AppError.badRequest(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (eventType !== undefined) event.eventType = eventType;
    if (date !== undefined) event.date = new Date(date);
    if (endDate !== undefined) event.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) event.status = status;
    if (priority !== undefined) event.priority = priority;
    if (regulationId !== undefined) event.regulationId = regulationId;
    if (metadata !== undefined) event.metadata = metadata;
    if (reminderDays !== undefined) event.reminderDays = reminderDays;

    await event.save();

    res.status(200).json({ event: event.toJSON() });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/compliance/calendar/:id
 * Delete a calendar event.
 */
export async function deleteCalendarEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const event = await ComplianceCalendar.findByPk(id);

    if (!event) {
      throw AppError.notFound('Calendar event not found');
    }

    await event.destroy();

    res.status(200).json({ message: 'Calendar event deleted successfully' });
  } catch (err) {
    next(err);
  }
}
