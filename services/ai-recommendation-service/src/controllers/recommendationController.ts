import { Request, Response, NextFunction } from 'express';
import { Recommendation } from '../models/Recommendation';
import { AppError } from '../utils/AppError';
import { intToUuid } from '../utils/intToUuid';

/**
 * GET /api/recommendations
 *
 * List recommendations. Supports filtering by userId, type, and status.
 * Paginated with ?page and ?limit query parameters.
 */
export async function listRecommendations(
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
      where.userId = intToUuid(req.query.userId as string);
    }

    if (req.query.type) {
      where.type = req.query.type;
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    const { rows: recommendations, count: total } = await Recommendation.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      recommendations: recommendations.map((r) => r.toJSON()),
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
 * GET /api/recommendations/:id
 *
 * Retrieve a single recommendation by ID.
 */
export async function getRecommendation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const rec = await Recommendation.findByPk(id);

    if (!rec) {
      throw AppError.notFound('Recommendation not found');
    }

    res.status(200).json(rec.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/recommendations/feedback
 *
 * Submit feedback on a recommendation (accept or dismiss).
 * Body: { recommendationId, action: 'accept' | 'dismiss' }
 */
export async function submitFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { recommendationId, action } = req.body;

    const rec = await Recommendation.findByPk(recommendationId);

    if (!rec) {
      throw AppError.notFound('Recommendation not found');
    }

    const newStatus = action === 'accept' ? 'accepted' : 'dismissed';
    await rec.update({ status: newStatus });

    res.status(200).json(rec.toJSON());
  } catch (err) {
    next(err);
  }
}
