import { Request, Response, NextFunction } from 'express';
import { ModelRegistry } from '../models/ModelRegistry';
import { AppError } from '../utils/AppError';

/**
 * GET /api/models
 *
 * List registered models with pagination.
 */
export async function listModels(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const { rows: models, count: total } = await ModelRegistry.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      models: models.map((m) => m.toJSON()),
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
 * GET /api/models/:id
 *
 * Retrieve a single model by ID.
 */
export async function getModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const model = await ModelRegistry.findByPk(id);

    if (!model) {
      throw AppError.notFound('Model not found');
    }

    res.status(200).json(model.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/models/register
 *
 * Register a new model in the registry.
 */
export async function registerModel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, version, type, accuracy, metrics, artifactPath, parameters, trainingDataInfo } =
      req.body;

    const model = await ModelRegistry.create({
      name,
      version,
      type,
      accuracy: accuracy || null,
      metrics: metrics || null,
      artifactPath: artifactPath || null,
      parameters: parameters || null,
      trainingDataInfo: trainingDataInfo || null,
    });

    res.status(201).json(model.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/models/:id/status
 *
 * Update the status of a model (training -> ready -> deployed -> deprecated).
 * Automatically sets deployedAt when status becomes 'deployed'.
 */
export async function updateModelStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const model = await ModelRegistry.findByPk(id);

    if (!model) {
      throw AppError.notFound('Model not found');
    }

    const updateData: Record<string, unknown> = { status };

    if (status === 'deployed') {
      updateData.deployedAt = new Date();
    }

    await model.update(updateData);

    res.status(200).json(model.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/models/:id/metrics
 *
 * Get training metrics for a specific model.
 */
export async function getModelMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const model = await ModelRegistry.findByPk(id);

    if (!model) {
      throw AppError.notFound('Model not found');
    }

    res.status(200).json({
      modelId: model.id,
      name: model.name,
      version: model.version,
      accuracy: model.accuracy,
      metrics: model.metrics,
      trainingDataInfo: model.trainingDataInfo,
    });
  } catch (err) {
    next(err);
  }
}
