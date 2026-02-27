import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { Recommendation } from '../models/Recommendation';
import { aiInferenceDuration, aiRecommendationsGenerated } from '../middleware/metrics';

const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://localhost:8000';

/**
 * POST /api/inference/compliance-gaps
 *
 * Run compliance gap analysis by calling the Python model server.
 * Stores results as Recommendation records.
 *
 * Returns 503 gracefully if the model server is unavailable.
 */
export async function complianceGaps(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, complianceData } = req.body;

    const start = Date.now();
    let response;
    try {
      response = await axios.post(`${MODEL_SERVER_URL}/predict/compliance-gaps`, {
        userId,
        complianceData,
      });
    } catch {
      // Model server is offline / unreachable
      res.status(503).json({
        error: {
          code: 'MODEL_SERVER_UNAVAILABLE',
          message: 'AI model server is currently offline. Please try again later.',
        },
      });
      return;
    }

    const duration = (Date.now() - start) / 1000;
    aiInferenceDuration.observe(
      { model_name: 'compliance-gap', model_version: 'latest', endpoint: 'compliance-gaps' },
      duration,
    );

    // Store each prediction as a Recommendation
    const predictions = response.data.predictions || [];
    const recommendations = [];

    for (const pred of predictions) {
      const rec = await Recommendation.create({
        userId,
        type: 'compliance_gap',
        title: pred.title || 'Compliance gap detected',
        description: pred.description || 'A compliance gap was identified.',
        confidence: pred.confidence || 0.5,
        severity: pred.severity || 'medium',
        category: pred.category || null,
        metadata: pred.metadata || null,
        modelId: pred.modelId || null,
        modelVersion: pred.modelVersion || null,
      });
      recommendations.push(rec.toJSON());

      aiRecommendationsGenerated.inc({
        type: 'compliance_gap',
        severity: rec.severity,
      });
    }

    res.status(200).json({
      recommendations,
      count: recommendations.length,
      inferenceTime: duration,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/inference/regulatory-predictions
 *
 * Run regulatory change predictions by calling the Python model server.
 * Stores results as Recommendation records.
 *
 * Returns 503 gracefully if the model server is unavailable.
 */
export async function regulatoryPredictions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, regulationIds } = req.body;

    const start = Date.now();
    let response;
    try {
      response = await axios.post(`${MODEL_SERVER_URL}/predict/regulatory-changes`, {
        userId,
        regulationIds,
      });
    } catch {
      // Model server is offline / unreachable
      res.status(503).json({
        error: {
          code: 'MODEL_SERVER_UNAVAILABLE',
          message: 'AI model server is currently offline. Please try again later.',
        },
      });
      return;
    }

    const duration = (Date.now() - start) / 1000;
    aiInferenceDuration.observe(
      {
        model_name: 'regulatory-predictor',
        model_version: 'latest',
        endpoint: 'regulatory-predictions',
      },
      duration,
    );

    // Store each prediction as a Recommendation
    const predictions = response.data.predictions || [];
    const recommendations = [];

    for (const pred of predictions) {
      const rec = await Recommendation.create({
        userId,
        type: 'regulatory_prediction',
        title: pred.title || 'Regulatory change predicted',
        description: pred.description || 'A regulatory change is anticipated.',
        confidence: pred.confidence || 0.5,
        severity: pred.severity || 'medium',
        category: pred.category || null,
        metadata: pred.metadata || null,
        modelId: pred.modelId || null,
        modelVersion: pred.modelVersion || null,
      });
      recommendations.push(rec.toJSON());

      aiRecommendationsGenerated.inc({
        type: 'regulatory_prediction',
        severity: rec.severity,
      });
    }

    res.status(200).json({
      predictions: recommendations,
      count: recommendations.length,
      inferenceTime: duration,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/inference/health
 *
 * Check model server health.
 * Returns the status of the model server (online/offline).
 */
export async function inferenceHealth(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let modelServerStatus = 'offline';

    try {
      const response = await axios.get(`${MODEL_SERVER_URL}/health`, { timeout: 5000 });
      if (response.status === 200) {
        modelServerStatus = 'online';
      }
    } catch {
      // Model server is unreachable
      modelServerStatus = 'offline';
    }

    res.status(200).json({
      service: 'ai-recommendation-service',
      modelServer: modelServerStatus,
      modelServerUrl: MODEL_SERVER_URL,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
