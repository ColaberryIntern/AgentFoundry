import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { ReportTemplate } from '../models/ReportTemplate';
import { AppError } from '../utils/AppError';

/**
 * POST /api/reports/templates
 *
 * Creates a new report template for the authenticated user.
 */
export async function createTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = (req as any).user;
    const { name, description, reportType, defaultParameters, sections, isPublic } = req.body;

    const template = await ReportTemplate.create({
      userId: user.userId,
      name,
      description: description || null,
      reportType,
      defaultParameters: defaultParameters || null,
      sections: sections || null,
      isPublic: isPublic ?? false,
    });

    res.status(201).json(template.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/templates
 *
 * List templates visible to the authenticated user: own templates + public templates.
 * Supports ?page and ?limit pagination.
 */
export async function listTemplates(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = (req as any).user;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    // Show own templates (public or private) + other users' public templates
    const where = {
      [Op.or]: [{ userId: user.userId }, { isPublic: true }],
    };

    const { rows: templates, count: total } = await ReportTemplate.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      templates: templates.map((t) => t.toJSON()),
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
 * GET /api/reports/templates/:id
 *
 * Retrieve a single template. Users can see their own templates + public templates.
 */
export async function getTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const template = await ReportTemplate.findByPk(id);

    if (!template) {
      throw AppError.notFound('Template not found');
    }

    // Allow access if own template or public
    if (template.userId !== user.userId && !template.isPublic) {
      throw AppError.forbidden('You do not have permission to view this template');
    }

    res.status(200).json(template.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/reports/templates/:id
 *
 * Update an existing template. Only the owner can update.
 */
export async function updateTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const template = await ReportTemplate.findByPk(id);

    if (!template) {
      throw AppError.notFound('Template not found');
    }

    if (template.userId !== user.userId) {
      throw AppError.forbidden('You do not have permission to update this template');
    }

    const { name, description, reportType, defaultParameters, sections, isPublic } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (reportType !== undefined) updates.reportType = reportType;
    if (defaultParameters !== undefined) updates.defaultParameters = defaultParameters;
    if (sections !== undefined) updates.sections = sections;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    await template.update(updates);

    res.status(200).json(template.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/reports/templates/:id
 *
 * Delete an existing template. Only the owner can delete.
 */
export async function deleteTemplate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const template = await ReportTemplate.findByPk(id);

    if (!template) {
      throw AppError.notFound('Template not found');
    }

    if (template.userId !== user.userId) {
      throw AppError.forbidden('You do not have permission to delete this template');
    }

    await template.destroy();

    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (err) {
    next(err);
  }
}
