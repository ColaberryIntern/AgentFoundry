import { Request, Response, NextFunction } from 'express';
import { ScheduledReport } from '../models/ScheduledReport';
import { AppError } from '../utils/AppError';
import { getNextRunDate } from '../utils/cronValidator';

/**
 * POST /api/reports/schedules
 *
 * Creates a new scheduled report for the authenticated user.
 */
export async function createSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = (req as any).user;
    const { reportType, templateId, parameters, format, schedule, isActive } = req.body;

    const nextRunAt = getNextRunDate(schedule);

    const scheduledReport = await ScheduledReport.create({
      userId: user.userId,
      reportType,
      templateId: templateId || null,
      parameters: parameters || null,
      format: format || 'pdf',
      schedule,
      isActive: isActive ?? true,
      nextRunAt,
    });

    res.status(201).json(scheduledReport.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/schedules
 *
 * List scheduled reports for the authenticated user.
 * Supports ?page and ?limit pagination.
 */
export async function listSchedules(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = (req as any).user;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const { rows: schedules, count: total } = await ScheduledReport.findAndCountAll({
      where: { userId: user.userId },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      schedules: schedules.map((s) => s.toJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/schedules/:id
 *
 * Retrieve a single scheduled report. Users can only access their own.
 */
export async function getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const schedule = await ScheduledReport.findByPk(id);

    if (!schedule) {
      throw AppError.notFound('Schedule not found');
    }

    if (schedule.userId !== user.userId) {
      throw AppError.forbidden('You do not have permission to view this schedule');
    }

    res.status(200).json(schedule.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/reports/schedules/:id
 *
 * Update an existing scheduled report. Only the owner can update.
 */
export async function updateSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const scheduledReport = await ScheduledReport.findByPk(id);

    if (!scheduledReport) {
      throw AppError.notFound('Schedule not found');
    }

    if (scheduledReport.userId !== user.userId) {
      throw AppError.forbidden('You do not have permission to update this schedule');
    }

    const { reportType, templateId, parameters, format, schedule, isActive } = req.body;

    const updates: Record<string, unknown> = {};
    if (reportType !== undefined) updates.reportType = reportType;
    if (templateId !== undefined) updates.templateId = templateId;
    if (parameters !== undefined) updates.parameters = parameters;
    if (format !== undefined) updates.format = format;
    if (schedule !== undefined) {
      updates.schedule = schedule;
      updates.nextRunAt = getNextRunDate(schedule);
    }
    if (isActive !== undefined) updates.isActive = isActive;

    await scheduledReport.update(updates);

    res.status(200).json(scheduledReport.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/reports/schedules/:id
 *
 * Delete an existing scheduled report. Only the owner can delete.
 */
export async function deleteSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const scheduledReport = await ScheduledReport.findByPk(id);

    if (!scheduledReport) {
      throw AppError.notFound('Schedule not found');
    }

    if (scheduledReport.userId !== user.userId) {
      throw AppError.forbidden('You do not have permission to delete this schedule');
    }

    await scheduledReport.destroy();

    res.status(200).json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    next(err);
  }
}
