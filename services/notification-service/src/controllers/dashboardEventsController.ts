import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { broadcastDashboardUpdate } from '../ws/dashboardWs';

/**
 * POST /api/dashboard-events/metrics
 *
 * Broadcasts a metrics update to all dashboard WebSocket clients
 * subscribed to the "metrics" channel.
 *
 * Required body fields: complianceRate, openIssues, alertsCount, lastChecked
 */
export async function broadcastMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { complianceRate, openIssues, alertsCount, lastChecked } = req.body;

    if (
      complianceRate === undefined ||
      openIssues === undefined ||
      alertsCount === undefined ||
      lastChecked === undefined
    ) {
      throw AppError.badRequest(
        'Missing required fields: complianceRate, openIssues, alertsCount, lastChecked',
      );
    }

    broadcastDashboardUpdate('metrics', {
      complianceRate,
      openIssues,
      alertsCount,
      lastChecked,
    });

    res.status(200).json({ success: true, channel: 'metrics' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/dashboard-events/activity
 *
 * Broadcasts a new activity item to all dashboard WebSocket clients
 * subscribed to the "activity" channel.
 *
 * Required body fields: id, complianceType, status, regulationId, timestamp
 */
export async function broadcastActivity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id, complianceType, status, regulationId, timestamp } = req.body;

    if (!id || !complianceType || !status || !regulationId || !timestamp) {
      throw AppError.badRequest(
        'Missing required fields: id, complianceType, status, regulationId, timestamp',
      );
    }

    broadcastDashboardUpdate('activity', {
      id,
      complianceType,
      status,
      regulationId,
      timestamp,
    });

    res.status(200).json({ success: true, channel: 'activity' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/dashboard-events/compliance
 *
 * Broadcasts a compliance status change to all dashboard WebSocket clients
 * subscribed to the "compliance" channel.
 *
 * Required body fields: status, regulationId, details
 */
export async function broadcastCompliance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status, regulationId, details } = req.body;

    if (!status || !regulationId || !details) {
      throw AppError.badRequest('Missing required fields: status, regulationId, details');
    }

    broadcastDashboardUpdate('compliance', {
      status,
      regulationId,
      details,
    });

    res.status(200).json({ success: true, channel: 'compliance' });
  } catch (err) {
    next(err);
  }
}
