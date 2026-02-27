import { Request, Response, NextFunction } from 'express';
import { fn, col } from 'sequelize';
import { Feedback } from '../models/Feedback';
import { AppError } from '../utils/AppError';

/**
 * POST /api/feedback
 *
 * Creates a feedback record from the authenticated user.
 * Body: { category, message, rating?, page?, metadata? }
 */
export async function submitFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { category, message, rating, page, metadata } = req.body;

    const feedback = await Feedback.create({
      userId,
      category,
      message,
      rating: rating ?? null,
      page: page ?? null,
      metadata: metadata ?? null,
    });

    res.status(201).json({ feedback });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/feedback
 *
 * Returns paginated feedback records. IT Admin only.
 * Supports ?category filter and ?page / ?limit pagination.
 */
export async function listFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'it_admin') {
      throw AppError.forbidden('Only IT admins can access feedback list');
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (req.query.category && typeof req.query.category === 'string') {
      where.category = req.query.category;
    }

    const { count, rows } = await Feedback.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.status(200).json({
      feedback: rows,
      total: count,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/feedback/stats
 *
 * Returns feedback statistics. IT Admin only.
 * Response shape:
 * - totalCount
 * - averageRating
 * - countsByCategory
 */
export async function getFeedbackStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'it_admin') {
      throw AppError.forbidden('Only IT admins can access feedback stats');
    }

    // Total count
    const totalCount = await Feedback.count();

    // Average rating (only rated feedback)
    const { Op } = await import('sequelize');
    const avgResult = (await Feedback.findOne({
      attributes: [[fn('AVG', col('rating')), 'avgRating']],
      where: {
        rating: { [Op.ne]: null },
      },
      raw: true,
    })) as unknown as { avgRating: number | null } | null;

    const averageRating = avgResult?.avgRating
      ? Math.round(Number(avgResult.avgRating) * 100) / 100
      : null;

    // Counts by category
    const categoryRows = (await Feedback.findAll({
      attributes: ['category', [fn('COUNT', col('id')), 'count']],
      group: ['category'],
      raw: true,
    })) as unknown as Array<{ category: string; count: string }>;

    const countsByCategory = categoryRows.map((row) => ({
      category: row.category,
      count: parseInt(row.count, 10),
    }));

    res.status(200).json({
      totalCount,
      averageRating,
      countsByCategory,
    });
  } catch (err) {
    next(err);
  }
}
