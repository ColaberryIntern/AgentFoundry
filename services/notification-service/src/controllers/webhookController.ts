import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { Webhook } from '../models/Webhook';
import { WebhookLog } from '../models/WebhookLog';
import { AppError } from '../utils/AppError';
import { dispatchWebhook } from '../utils/webhookDispatcher';

/**
 * Checks whether a URL targets a private/internal IP address (basic SSRF prevention).
 * Rejects localhost, 127.x, 10.x, 172.16-31.x, 192.168.x, 0.0.0.0, [::1].
 */
function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // localhost and IPv6 loopback
    if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]') {
      return true;
    }

    // IPv4 patterns
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      // 127.x.x.x
      if (a === 127) return true;
      // 10.x.x.x
      if (a === 10) return true;
      // 172.16.0.0 - 172.31.255.255
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.x.x
      if (a === 192 && b === 168) return true;
      // 0.0.0.0
      if (a === 0 && b === 0) return true;
    }

    return false;
  } catch {
    return true; // If URL cannot be parsed, treat as private
  }
}

/**
 * POST /api/webhooks
 *
 * Creates a new webhook subscription. Generates a random secret if not provided.
 * Validates that the URL is not targeting a private/internal network.
 */
export async function createWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { url, events, description } = req.body;

    // SSRF prevention
    if (isPrivateUrl(url)) {
      throw AppError.badRequest(
        'Webhook URL must not target private or internal network addresses',
      );
    }

    // Generate secret if not provided
    const secret = req.body.secret || crypto.randomBytes(32).toString('hex');

    const webhook = await Webhook.create({
      userId,
      url,
      secret,
      events,
      description: description || null,
    });

    res.status(201).json({ data: webhook });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/webhooks
 *
 * Lists the authenticated user's webhooks (secrets masked).
 * Supports pagination via page and limit query parameters.
 */
export async function listWebhooks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const { rows, count } = await Webhook.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      attributes: { exclude: ['secret'] },
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
 * GET /api/webhooks/:id
 *
 * Returns a single webhook including its secret. Ownership check enforced.
 */
export async function getWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const webhook = await Webhook.findByPk(id);

    if (!webhook) {
      throw AppError.notFound('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw AppError.forbidden("Cannot access another user's webhook");
    }

    res.status(200).json({ data: webhook });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/webhooks/:id
 *
 * Updates a webhook's url, events, description, or isActive status.
 * Ownership check enforced. SSRF check on new URL if provided.
 */
export async function updateWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const webhook = await Webhook.findByPk(id);

    if (!webhook) {
      throw AppError.notFound('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw AppError.forbidden("Cannot modify another user's webhook");
    }

    const { url, events, description, isActive } = req.body;

    // SSRF prevention on updated URL
    if (url !== undefined && isPrivateUrl(url)) {
      throw AppError.badRequest(
        'Webhook URL must not target private or internal network addresses',
      );
    }

    const updates: Partial<{
      url: string;
      events: string[];
      description: string | null;
      isActive: boolean;
    }> = {};
    if (url !== undefined) updates.url = url;
    if (events !== undefined) updates.events = events;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;

    await webhook.update(updates);

    res.status(200).json({ data: webhook });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/webhooks/:id
 *
 * Deletes a webhook. Ownership check enforced.
 */
export async function deleteWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const webhook = await Webhook.findByPk(id);

    if (!webhook) {
      throw AppError.notFound('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw AppError.forbidden("Cannot delete another user's webhook");
    }

    await webhook.destroy();

    res.status(200).json({ message: 'Webhook deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/webhooks/:id/logs
 *
 * Returns delivery logs for a webhook. Ownership check enforced.
 * Paginated, newest first.
 */
export async function getWebhookLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const webhook = await Webhook.findByPk(id);

    if (!webhook) {
      throw AppError.notFound('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw AppError.forbidden("Cannot access another user's webhook logs");
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const { rows, count } = await WebhookLog.findAndCountAll({
      where: { webhookId: id },
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
 * POST /api/webhooks/:id/test
 *
 * Dispatches a test event to the webhook with sample data.
 * Returns 200 with the delivery result (log entry).
 */
export async function testWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const webhook = await Webhook.findByPk(id);

    if (!webhook) {
      throw AppError.notFound('Webhook not found');
    }

    if (webhook.userId !== userId) {
      throw AppError.forbidden("Cannot test another user's webhook");
    }

    const testData = {
      test: true,
      message: 'This is a test webhook delivery from Agent Foundry',
      webhookId: webhook.id,
    };

    // Dispatch synchronously so we can return the result
    await dispatchWebhook(webhook, 'test', testData);

    // Fetch the most recent log entry for this webhook
    const log = await WebhookLog.findOne({
      where: { webhookId: id },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      message: 'Test webhook dispatched',
      data: log,
    });
  } catch (err) {
    next(err);
  }
}
