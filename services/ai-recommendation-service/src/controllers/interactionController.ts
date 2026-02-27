/* eslint-disable no-console */
import { Request, Response, NextFunction } from 'express';
import { UserInteraction, InteractionType } from '../models/UserInteraction';
import { AppError } from '../utils/AppError';

const VALID_INTERACTION_TYPES: InteractionType[] = [
  'page_view',
  'feature_use',
  'search',
  'recommendation_click',
  'report_generate',
  'filter_apply',
  'dashboard_widget_click',
];

/**
 * Validate that a given string is a valid InteractionType.
 */
function isValidInteractionType(value: string): value is InteractionType {
  return VALID_INTERACTION_TYPES.includes(value as InteractionType);
}

/**
 * POST /api/interactions
 *
 * Track a single user interaction. userId is extracted from JWT.
 */
export async function trackInteraction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { interactionType, target, metadata, sessionId, duration } = req.body;

    if (!interactionType || typeof interactionType !== 'string') {
      throw AppError.badRequest('interactionType is required');
    }

    if (!isValidInteractionType(interactionType)) {
      throw AppError.badRequest(
        `Invalid interactionType. Must be one of: ${VALID_INTERACTION_TYPES.join(', ')}`,
      );
    }

    if (!target || typeof target !== 'string') {
      throw AppError.badRequest('target is required and must be a string');
    }

    const interaction = await UserInteraction.create({
      userId,
      interactionType,
      target,
      metadata: metadata || null,
      sessionId: sessionId || null,
      duration: duration != null ? Number(duration) : null,
    });

    res.status(201).json(interaction.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/interactions/batch
 *
 * Track multiple interactions at once. userId is extracted from JWT.
 */
export async function trackBatchInteractions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { interactions } = req.body;

    if (!interactions || !Array.isArray(interactions) || interactions.length === 0) {
      throw AppError.badRequest('interactions must be a non-empty array');
    }

    // Validate each interaction before creating
    for (let i = 0; i < interactions.length; i++) {
      const item = interactions[i];

      if (!item.interactionType || !isValidInteractionType(item.interactionType)) {
        throw AppError.badRequest(
          `interactions[${i}].interactionType is invalid. Must be one of: ${VALID_INTERACTION_TYPES.join(', ')}`,
        );
      }

      if (!item.target || typeof item.target !== 'string') {
        throw AppError.badRequest(`interactions[${i}].target is required and must be a string`);
      }
    }

    const records = interactions.map(
      (item: {
        interactionType: InteractionType;
        target: string;
        metadata?: Record<string, unknown>;
        sessionId?: string;
        duration?: number;
      }) => ({
        userId,
        interactionType: item.interactionType,
        target: item.target,
        metadata: item.metadata || null,
        sessionId: item.sessionId || null,
        duration: item.duration != null ? Number(item.duration) : null,
      }),
    );

    const created = await UserInteraction.bulkCreate(records);

    res.status(201).json({
      created: created.length,
      interactions: created.map((r) => r.toJSON()),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/interactions/summary/:userId
 *
 * Get aggregated interaction summary for a user.
 */
export async function getInteractionSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw AppError.badRequest('userId parameter is required');
    }

    // Fetch all interactions for the user
    const interactions = await UserInteraction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    if (interactions.length === 0) {
      res.status(200).json({
        userId,
        totalInteractions: 0,
        topFeatures: [],
        topPages: [],
        interactionsByType: {},
        timeWeightedPreferences: [],
      });
      return;
    }

    // Count interactions by type
    const interactionsByType: Record<string, number> = {};
    for (const interaction of interactions) {
      const t = interaction.interactionType;
      interactionsByType[t] = (interactionsByType[t] || 0) + 1;
    }

    // Most used features (feature_use + dashboard_widget_click)
    const featureCounts: Record<string, number> = {};
    for (const interaction of interactions) {
      if (
        interaction.interactionType === 'feature_use' ||
        interaction.interactionType === 'dashboard_widget_click'
      ) {
        featureCounts[interaction.target] = (featureCounts[interaction.target] || 0) + 1;
      }
    }

    const topFeatures = Object.entries(featureCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Most viewed pages (page_view)
    const pageCounts: Record<string, number> = {};
    for (const interaction of interactions) {
      if (interaction.interactionType === 'page_view') {
        pageCounts[interaction.target] = (pageCounts[interaction.target] || 0) + 1;
      }
    }

    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Time-weighted preferences: recent interactions score higher
    const now = Date.now();
    const DECAY_HALF_LIFE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    const weightedScores: Record<string, number> = {};

    for (const interaction of interactions) {
      const age = now - new Date(interaction.createdAt).getTime();
      const weight = Math.exp(-age / DECAY_HALF_LIFE);
      const key = `${interaction.interactionType}:${interaction.target}`;
      weightedScores[key] = (weightedScores[key] || 0) + weight;
    }

    // Normalize scores to 0-1 range
    const maxScore = Math.max(...Object.values(weightedScores), 1);
    const timeWeightedPreferences = Object.entries(weightedScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, score]) => {
        const [type, ...targetParts] = key.split(':');
        return {
          type,
          target: targetParts.join(':'),
          score: Math.round((score / maxScore) * 100) / 100,
        };
      });

    res.status(200).json({
      userId,
      totalInteractions: interactions.length,
      topFeatures,
      topPages,
      interactionsByType,
      timeWeightedPreferences,
    });
  } catch (err) {
    next(err);
  }
}
