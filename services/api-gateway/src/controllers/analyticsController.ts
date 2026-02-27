import { Request, Response, NextFunction } from 'express';
import { Op, fn, col, literal, GroupOption } from 'sequelize';
import { UserEvent } from '../models/UserEvent';
import { AppError } from '../utils/AppError';

/**
 * POST /api/analytics/event
 *
 * Creates a single user engagement event.
 * Body: { eventType, eventData?, sessionId? }
 */
export async function trackEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { eventType, eventData, sessionId } = req.body;

    const event = await UserEvent.create({
      userId,
      eventType,
      eventData: eventData ?? null,
      sessionId: sessionId ?? null,
    });

    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analytics/events
 *
 * Creates multiple user engagement events in batch.
 * Body: { events: [{ eventType, eventData?, sessionId? }] }
 */
export async function trackBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { events } = req.body;

    const records = events.map(
      (e: { eventType: string; eventData?: object; sessionId?: string }) => ({
        userId,
        eventType: e.eventType,
        eventData: e.eventData ?? null,
        sessionId: e.sessionId ?? null,
      }),
    );

    const created = await UserEvent.bulkCreate(records);

    res.status(201).json({ count: created.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/stats
 *
 * Returns engagement metrics. IT Admin only.
 * Supports ?days query param (default 7).
 *
 * Response shape:
 * - totalEvents
 * - activeUsers
 * - eventsByType
 * - topFeatures
 * - onboardingCompletionRate (placeholder)
 */
export async function getEngagementStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'it_admin') {
      throw AppError.forbidden('Only IT admins can access engagement stats');
    }

    const days = Math.max(1, parseInt(req.query.days as string, 10) || 7);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Total events in period
    const totalEvents = await UserEvent.count({
      where: {
        createdAt: { [Op.gte]: since },
      },
    });

    // Active users (distinct userIds) in period
    const activeUsersResult = await UserEvent.count({
      where: {
        createdAt: { [Op.gte]: since },
      },
      distinct: true,
      col: 'user_id',
    });

    // Events by type — group by eventType with counts
    const eventsByTypeRows = (await UserEvent.findAll({
      where: {
        createdAt: { [Op.gte]: since },
      },
      attributes: ['eventType', [fn('COUNT', col('id')), 'count']],
      group: ['eventType'],
      raw: true,
    })) as unknown as Array<{ eventType: string; count: string }>;

    const eventsByType = eventsByTypeRows.map((row) => ({
      eventType: row.eventType,
      count: parseInt(row.count, 10),
    }));

    // Top 10 features (from feature_use events)
    const topFeaturesRows = (await UserEvent.findAll({
      where: {
        createdAt: { [Op.gte]: since },
        eventType: 'feature_use',
      },
      attributes: [
        [literal("json_extract(event_data, '$.featureName')"), 'featureName'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: [literal("json_extract(event_data, '$.featureName')")] as unknown as GroupOption,
      order: [[literal('count'), 'DESC']],
      limit: 10,
      raw: true,
    })) as unknown as Array<{ featureName: string; count: string }>;

    const topFeatures = topFeaturesRows.map((row) => ({
      featureName: row.featureName,
      count: parseInt(row.count, 10),
    }));

    // Placeholder for onboarding completion rate
    const onboardingCompletionRate = 0.72;

    res.status(200).json({
      totalEvents,
      activeUsers: activeUsersResult,
      eventsByType,
      topFeatures,
      onboardingCompletionRate,
      periodDays: days,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/users/:userId/activity
 *
 * Returns a specific user's recent events.
 * Accessible by IT Admin or the user themselves.
 * Supports ?page and ?limit query params.
 */
export async function getUserActivity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requestingUserId = req.user?.userId;
    const requestingRole = req.user?.role;
    const targetUserId = req.params.userId;

    if (!requestingUserId) {
      throw AppError.unauthorized('User not authenticated');
    }

    // Only the user themselves or an IT admin can view activity
    if (requestingUserId !== targetUserId && requestingRole !== 'it_admin') {
      throw AppError.forbidden('You can only view your own activity');
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await UserEvent.findAndCountAll({
      where: { userId: targetUserId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.status(200).json({
      events: rows,
      total: count,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
}
