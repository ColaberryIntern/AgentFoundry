import { Request, Response, NextFunction } from 'express';
import 'sequelize';
import ComplianceRecord from '../models/ComplianceRecord';
import { AppError } from '../utils/AppError';

const VALID_STATUSES = ['compliant', 'non_compliant', 'pending', 'review'] as const;

/**
 * POST /api/compliance/monitor
 * Creates a new compliance monitoring record.
 */
export async function createMonitor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { compliance_type, regulation_id, data_source, threshold } = req.body;

    if (!compliance_type) {
      throw AppError.badRequest('compliance_type is required');
    }

    const record = await ComplianceRecord.create({
      userId: req.user!.userId,
      complianceType: compliance_type,
      regulationId: regulation_id || null,
      dataSource: data_source || null,
      threshold: threshold != null ? threshold : null,
      status: 'pending',
      lastChecked: new Date(),
    });

    res.status(201).json(record.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/compliance/:userId
 * Returns compliance records for a specific user with optional filtering and pagination.
 */
export async function getComplianceByUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = parseInt(req.params.userId, 10);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    // Build filter conditions
    const where: Record<string, unknown> = { userId };

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.type) {
      where.complianceType = req.query.type;
    }

    const { count, rows } = await ComplianceRecord.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      records: rows.map((r) => r.toJSON()),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/compliance/summary
 * Returns aggregate compliance summary across all records.
 */
export async function getComplianceSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const allRecords = await ComplianceRecord.findAll();
    const totalRecords = allRecords.length;

    // Count by status
    const byStatus: Record<string, number> = {
      compliant: 0,
      non_compliant: 0,
      pending: 0,
      review: 0,
    };

    // Count by type (nested by status)
    const byType: Record<string, Record<string, number>> = {};

    for (const record of allRecords) {
      const r = record.toJSON();
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;

      if (!byType[r.complianceType]) {
        byType[r.complianceType] = { compliant: 0, non_compliant: 0, pending: 0, review: 0 };
      }
      byType[r.complianceType][r.status] = (byType[r.complianceType][r.status] || 0) + 1;
    }

    const complianceRate =
      totalRecords > 0 ? Math.round((byStatus.compliant / totalRecords) * 100) : 0;

    // Recent updates: last 10 records by updatedAt DESC
    const recentUpdates = await ComplianceRecord.findAll({
      order: [['updatedAt', 'DESC']],
      limit: 10,
    });

    res.status(200).json({
      summary: {
        complianceRate,
        totalRecords,
        byStatus,
        byType,
        recentUpdates: recentUpdates.map((r) => r.toJSON()),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/compliance/:id/status
 * Updates the status of a specific compliance record.
 */
export async function updateComplianceStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      throw AppError.badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const record = await ComplianceRecord.findByPk(id);

    if (!record) {
      throw AppError.notFound('Compliance record not found');
    }

    record.status = status;
    record.lastChecked = new Date();
    await record.save();

    res.status(200).json(record.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard
 * Returns dashboard data combining summary with role-specific views.
 */
export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.user?.role;
    const allRecords = await ComplianceRecord.findAll();
    const totalRecords = allRecords.length;

    // Compliance rate
    const compliantCount = allRecords.filter((r) => r.status === 'compliant').length;
    const nonCompliantCount = allRecords.filter((r) => r.status === 'non_compliant').length;
    const complianceRate = totalRecords > 0 ? Math.round((compliantCount / totalRecords) * 100) : 0;

    // Open issues = non_compliant count
    const openIssues = nonCompliantCount;

    // Alerts count = non_compliant + review
    const reviewCount = allRecords.filter((r) => r.status === 'review').length;
    const alertsCount = nonCompliantCount + reviewCount;

    // Recent updates: last 10 records by updatedAt DESC
    const recentUpdates = await ComplianceRecord.findAll({
      order: [['updatedAt', 'DESC']],
      limit: 10,
    });

    // Trend: group records by createdAt date for last 30 days, compute daily compliance rate
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecords = allRecords.filter((r) => r.createdAt >= thirtyDaysAgo);

    // Group by date string
    const dateGroups: Record<string, { total: number; compliant: number }> = {};
    for (const record of recentRecords) {
      const dateStr = record.createdAt.toISOString().split('T')[0];
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = { total: 0, compliant: 0 };
      }
      dateGroups[dateStr].total += 1;
      if (record.status === 'compliant') {
        dateGroups[dateStr].compliant += 1;
      }
    }

    const trend = Object.entries(dateGroups)
      .map(([date, { total, compliant }]) => ({
        date,
        rate: total > 0 ? Math.round((compliant / total) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build response
    const dashboard: Record<string, unknown> = {
      complianceRate,
      openIssues,
      alertsCount,
      recentUpdates: recentUpdates.map((r) => r.toJSON()),
      trend,
    };

    // Role-specific additions
    if (role === 'compliance_officer') {
      const detailedRecords = await ComplianceRecord.findAll({
        order: [['updatedAt', 'DESC']],
      });
      dashboard.detailedRecords = detailedRecords.map((r) => r.toJSON());
    }

    if (role === 'it_admin') {
      dashboard.systemStats = {
        totalRecords,
        databaseSize: totalRecords,
        lastSync: new Date().toISOString(),
        uptime: process.uptime(),
      };
    }

    res.status(200).json({ dashboard });
  } catch (err) {
    next(err);
  }
}
