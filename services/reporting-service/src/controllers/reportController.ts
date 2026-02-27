import { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { Report, ReportType, ReportFormat } from '../models/Report';
import { ReportTemplate } from '../models/ReportTemplate';
import { AppError } from '../utils/AppError';
import rabbitmq from '../utils/rabbitmq';
import { generateReport } from '../utils/reportGenerator';

const VALID_REPORT_TYPES: ReportType[] = [
  'compliance_summary',
  'risk_assessment',
  'audit_trail',
  'regulatory_status',
];
const VALID_FORMATS: ReportFormat[] = ['pdf', 'csv'];

/**
 * POST /api/reports
 *
 * Creates a new report record. If RabbitMQ is connected the job is queued
 * for asynchronous generation; otherwise falls back to synchronous generation.
 */
export async function createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const { reportType, parameters, format, templateId, filters, sections } = req.body;

    // --- Validation ---
    if (!reportType) {
      throw AppError.badRequest('reportType is required');
    }

    if (!VALID_REPORT_TYPES.includes(reportType)) {
      throw AppError.badRequest(
        `Invalid reportType. Must be one of: ${VALID_REPORT_TYPES.join(', ')}`,
      );
    }

    const reportFormat: ReportFormat = format || 'pdf';
    if (!VALID_FORMATS.includes(reportFormat)) {
      throw AppError.badRequest(`Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}`);
    }

    // --- Merge template defaults with request parameters ---
    let mergedParameters: Record<string, unknown> = { ...(parameters || {}) };

    if (templateId) {
      const template = await ReportTemplate.findByPk(templateId);
      if (template && template.defaultParameters) {
        // Template defaults are overridden by request parameters
        mergedParameters = {
          ...(template.defaultParameters as Record<string, unknown>),
          ...mergedParameters,
        };
      }
    }

    // --- Add filters and sections to parameters ---
    if (filters) {
      mergedParameters.filters = filters;
    }
    if (sections) {
      mergedParameters.sections = sections;
    }

    const finalParameters = Object.keys(mergedParameters).length > 0 ? mergedParameters : null;

    // --- Create record ---
    const report = await Report.create({
      userId: user.userId,
      reportType,
      parameters: finalParameters,
      format: reportFormat,
      status: 'queued',
    });

    // --- Dispatch ---
    if (rabbitmq.isConnected()) {
      await rabbitmq.publishReportJob(report.id, reportType, finalParameters || {}, reportFormat);
    } else {
      // Synchronous fallback
      try {
        await report.update({ status: 'processing' });

        await generateReport(report.id, reportType, finalParameters || null, reportFormat);

        const downloadUrl = `/api/reports/download/${report.id}.${reportFormat}`;
        await report.update({ status: 'completed', downloadUrl });
      } catch (genErr) {
        await report.update({
          status: 'failed',
          errorMessage: (genErr as Error).message,
        });
      }
    }

    // Reload to get latest state
    await report.reload();

    res.status(201).json(report.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/:id
 *
 * Retrieve a single report. Users can only access their own reports
 * unless they have the it_admin role.
 */
export async function getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const report = await Report.findByPk(id);

    if (!report) {
      throw AppError.notFound('Report not found');
    }

    if (report.userId !== user.userId && user.role !== 'it_admin') {
      throw AppError.forbidden('You do not have permission to view this report');
    }

    res.status(200).json(report.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports
 *
 * List reports for the authenticated user. Admins (it_admin) see all reports.
 * Supports ?status filter and ?page / ?limit pagination.
 */
export async function listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Non-admins only see own reports
    if (user.role !== 'it_admin') {
      where.userId = user.userId;
    }

    // Optional status filter
    if (req.query.status) {
      where.status = req.query.status;
    }

    const { rows: reports, count: total } = await Report.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      reports: reports.map((r) => r.toJSON()),
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
 * GET /api/reports/download/:filename
 *
 * Serve a generated report file. The filename format is {reportId}.{format}.
 */
export async function downloadReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { filename } = req.params;
    const reportsDir = path.resolve(process.cwd(), 'reports');
    const filePath = path.join(reportsDir, filename);

    // Prevent directory traversal
    if (!filePath.startsWith(reportsDir)) {
      throw AppError.badRequest('Invalid filename');
    }

    if (!fs.existsSync(filePath)) {
      throw AppError.notFound('Report file not found');
    }

    res.download(filePath);
  } catch (err) {
    next(err);
  }
}
