import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { AppError } from '../utils/AppError';
import { intToUuid } from '../utils/intToUuid';
import { pushToUser } from '../ws/notificationWs';
import 'sequelize';

/**
 * GET /api/notifications
 *
 * Lists notifications for the authenticated user, newest first.
 * Supports query parameters:
 *   - unreadOnly=true  — only return unread notifications
 *   - page=1           — page number (1-based)
 *   - limit=20         — items per page
 */
export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = intToUuid((req as any).user.userId);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (req.query.unreadOnly === 'true') {
      where.isRead = false;
    }

    const { rows, count } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.status(200).json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/unread-count
 *
 * Returns the count of unread notifications for the authenticated user.
 */
export async function getUnreadCount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = intToUuid((req as any).user.userId);

    const count = await Notification.count({
      where: { userId, isRead: false },
    });

    res.status(200).json({ count });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/notifications/:id/read
 *
 * Marks a single notification as read. Must belong to the authenticated user.
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = intToUuid((req as any).user.userId);
    const { id } = req.params;

    const notification = await Notification.findByPk(id);

    if (!notification) {
      throw AppError.notFound('Notification not found');
    }

    if (notification.userId !== userId) {
      throw AppError.forbidden("Cannot modify another user's notification");
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ data: notification });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/notifications/read-all
 *
 * Marks all unread notifications as read for the authenticated user.
 * Returns the count of notifications that were updated.
 */
export async function markAllAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = intToUuid((req as any).user.userId);

    const [updatedCount] = await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } },
    );

    res.status(200).json({ updated: updatedCount });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notifications
 *
 * Creates a notification. Intended for internal service-to-service calls.
 * Pushes the notification to the target user via WebSocket if connected.
 */
export async function createNotification(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId: rawUserId, type, title, message, metadata } = req.body;

    if (!rawUserId || !type || !title || !message) {
      throw AppError.badRequest('Missing required fields: userId, type, title, message');
    }

    const validTypes = ['compliance_alert', 'report_ready', 'system', 'role_change'];
    if (!validTypes.includes(type)) {
      throw AppError.badRequest(
        `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
      );
    }

    const userId = intToUuid(rawUserId);

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      metadata: metadata || null,
    });

    // Push via WebSocket to connected clients
    pushToUser(userId, notification.toJSON());

    res.status(201).json({ data: notification });
  } catch (err) {
    next(err);
  }
}
