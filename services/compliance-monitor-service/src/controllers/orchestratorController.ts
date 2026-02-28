import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { OrchestratorIntent } from '../models/OrchestratorIntent';
import { OrchestratorAction } from '../models/OrchestratorAction';
import { OrchestratorSetting } from '../models/OrchestratorSetting';
import { OrchestratorGuardrailViolation } from '../models/OrchestratorGuardrailViolation';
import { OrchestratorScanLog } from '../models/OrchestratorScanLog';
import { MarketplaceSubmission } from '../models/MarketplaceSubmission';
import { SystemIntelligence } from '../models/SystemIntelligence';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function paginate(query: { page?: string; limit?: string }) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '25', 10)));
  return { page, limit, offset: (page - 1) * limit };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function getDashboard(_req: Request, res: Response) {
  try {
    const [activeIntents, pendingApprovals, guardrailViolations, completedToday] =
      await Promise.all([
        OrchestratorIntent.count({
          where: {
            status: {
              [Op.in]: [
                'detected',
                'evaluating',
                'proposed',
                'approved',
                'simulating',
                'executing',
              ],
            },
          },
        }),
        OrchestratorAction.count({ where: { status: 'awaiting_approval' } }),
        OrchestratorGuardrailViolation.count({ where: { resolved: false } }),
        OrchestratorIntent.count({
          where: {
            status: 'completed',
            resolvedAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
      ]);

    const recentIntents = await OrchestratorIntent.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    const recentViolations = await OrchestratorGuardrailViolation.findAll({
      where: { resolved: false },
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    // Determine autonomy mode from settings
    const autonomyLevelSetting = await OrchestratorSetting.findOne({
      where: { settingKey: 'autonomy_level' },
    });
    const autonomyMode = (autonomyLevelSetting?.settingValue as string) || 'advisory';

    // System confidence from latest orchestrator_health intelligence
    const latestHealth = await SystemIntelligence.findOne({
      where: { metricType: 'health' },
      order: [['computedAt', 'DESC']],
    });
    const systemConfidence = latestHealth?.score ?? 0;

    res.json({
      data: {
        activeIntents,
        pendingApprovals,
        guardrailViolations,
        completedToday,
        recentIntents,
        recentViolations,
        autonomyMode,
        systemConfidence,
      },
    });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

// ---------------------------------------------------------------------------
// Intents
// ---------------------------------------------------------------------------
export async function getIntents(req: Request, res: Response) {
  try {
    const { page, limit, offset } = paginate(req.query as Record<string, string>);
    const where: Record<string, unknown> = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.intentType = req.query.type;
    if (req.query.priority) where.priority = req.query.priority;

    const { rows, count } = await OrchestratorIntent.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function getIntentById(req: Request, res: Response) {
  try {
    const intent = await OrchestratorIntent.findByPk(req.params.id, {
      include: [{ model: OrchestratorAction, as: 'actions' }],
    });
    if (!intent) return res.status(404).json({ error: { message: 'Intent not found' } });
    res.json({ data: intent });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function approveIntent(req: Request, res: Response) {
  try {
    const intent = await OrchestratorIntent.findByPk(req.params.id);
    if (!intent) return res.status(404).json({ error: { message: 'Intent not found' } });
    if (intent.status !== 'proposed') {
      return res
        .status(400)
        .json({ error: { message: `Cannot approve intent in '${intent.status}' status` } });
    }

    const user = (req as unknown as { user: { email?: string } }).user;
    await intent.update({
      status: 'approved',
      resolvedBy: user?.email || 'admin',
      resolvedAt: new Date(),
    });

    // Advance all pending actions to approved
    await OrchestratorAction.update(
      { status: 'approved', approvedBy: user?.email || 'admin', approvedAt: new Date() },
      { where: { intentId: intent.id, status: { [Op.in]: ['pending', 'awaiting_approval'] } } },
    );

    res.json({ data: intent });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function rejectIntent(req: Request, res: Response) {
  try {
    const intent = await OrchestratorIntent.findByPk(req.params.id);
    if (!intent) return res.status(404).json({ error: { message: 'Intent not found' } });

    const user = (req as unknown as { user: { email?: string } }).user;
    await intent.update({
      status: 'rejected',
      resolvedBy: user?.email || 'admin',
      resolvedAt: new Date(),
      description: req.body.reason
        ? `${intent.description || ''}\n\nRejection reason: ${req.body.reason}`
        : intent.description,
    });

    // Reject all pending actions
    await OrchestratorAction.update(
      { status: 'failed', errorMessage: req.body.reason || 'Intent rejected' },
      {
        where: {
          intentId: intent.id,
          status: { [Op.in]: ['pending', 'awaiting_approval', 'approved'] },
        },
      },
    );

    res.json({ data: intent });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function cancelIntent(req: Request, res: Response) {
  try {
    const intent = await OrchestratorIntent.findByPk(req.params.id);
    if (!intent) return res.status(404).json({ error: { message: 'Intent not found' } });
    if (['completed', 'cancelled'].includes(intent.status)) {
      return res
        .status(400)
        .json({ error: { message: `Cannot cancel intent in '${intent.status}' status` } });
    }

    const user = (req as unknown as { user: { email?: string } }).user;
    await intent.update({
      status: 'cancelled',
      resolvedBy: user?.email || 'admin',
      resolvedAt: new Date(),
    });

    // Cancel all non-completed actions
    await OrchestratorAction.update(
      { status: 'failed', errorMessage: 'Intent cancelled' },
      {
        where: {
          intentId: intent.id,
          status: { [Op.notIn]: ['completed', 'failed', 'rolled_back'] },
        },
      },
    );

    res.json({ data: intent });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
export async function getActions(req: Request, res: Response) {
  try {
    const { page, limit, offset } = paginate(req.query as Record<string, string>);
    const where: Record<string, unknown> = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.intent_id) where.intentId = req.query.intent_id;

    const { rows, count } = await OrchestratorAction.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: OrchestratorIntent,
          as: 'intent',
          attributes: ['id', 'title', 'intentType', 'priority'],
        },
      ],
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function getActionById(req: Request, res: Response) {
  try {
    const action = await OrchestratorAction.findByPk(req.params.id, {
      include: [
        { model: OrchestratorIntent, as: 'intent' },
        { model: OrchestratorGuardrailViolation, as: 'violations' },
      ],
    });
    if (!action) return res.status(404).json({ error: { message: 'Action not found' } });
    res.json({ data: action });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function approveAction(req: Request, res: Response) {
  try {
    const action = await OrchestratorAction.findByPk(req.params.id);
    if (!action) return res.status(404).json({ error: { message: 'Action not found' } });
    if (action.status !== 'awaiting_approval') {
      return res
        .status(400)
        .json({ error: { message: `Cannot approve action in '${action.status}' status` } });
    }

    const user = (req as unknown as { user: { email?: string } }).user;
    await action.update({
      status: 'approved',
      approvedBy: user?.email || 'admin',
      approvedAt: new Date(),
    });

    res.json({ data: action });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function rejectAction(req: Request, res: Response) {
  try {
    const action = await OrchestratorAction.findByPk(req.params.id);
    if (!action) return res.status(404).json({ error: { message: 'Action not found' } });

    await action.update({
      status: 'failed',
      errorMessage: req.body.reason || 'Rejected by admin',
    });

    res.json({ data: action });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function getSettings(req: Request, res: Response) {
  try {
    const where: Record<string, unknown> = {};
    if (req.query.category) where.category = req.query.category;

    const settings = await OrchestratorSetting.findAll({
      where,
      order: [
        ['category', 'ASC'],
        ['label', 'ASC'],
      ],
    });

    res.json({ data: settings });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function updateSetting(req: Request, res: Response) {
  try {
    const user = (req as unknown as { user: { role?: string; email?: string } }).user;
    if (user?.role !== 'it_admin') {
      return res
        .status(403)
        .json({ error: { message: 'Only IT admins can modify orchestrator settings' } });
    }

    const setting = await OrchestratorSetting.findOne({
      where: { settingKey: req.params.key },
    });
    if (!setting) return res.status(404).json({ error: { message: 'Setting not found' } });

    // Validate numeric bounds
    const newValue = req.body.value;
    if (setting.minValue != null && typeof newValue === 'number' && newValue < setting.minValue) {
      return res.status(400).json({
        error: { message: `Value must be >= ${setting.minValue}` },
      });
    }
    if (setting.maxValue != null && typeof newValue === 'number' && newValue > setting.maxValue) {
      return res.status(400).json({
        error: { message: `Value must be <= ${setting.maxValue}` },
      });
    }

    await setting.update({
      settingValue: newValue,
      updatedBy: user?.email || 'admin',
    });

    res.json({ data: setting });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

// ---------------------------------------------------------------------------
// Guardrail Violations
// ---------------------------------------------------------------------------
export async function getViolations(req: Request, res: Response) {
  try {
    const { page, limit, offset } = paginate(req.query as Record<string, string>);
    const where: Record<string, unknown> = {};
    if (req.query.resolved === 'true') where.resolved = true;
    if (req.query.resolved === 'false') where.resolved = false;

    const { rows, count } = await OrchestratorGuardrailViolation.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function resolveViolation(req: Request, res: Response) {
  try {
    const user = (req as unknown as { user: { role?: string; email?: string } }).user;
    if (user?.role !== 'it_admin') {
      return res.status(403).json({ error: { message: 'Only IT admins can resolve violations' } });
    }

    const violation = await OrchestratorGuardrailViolation.findByPk(req.params.id);
    if (!violation) return res.status(404).json({ error: { message: 'Violation not found' } });

    await violation.update({
      resolved: true,
      resolvedBy: user?.email || 'admin',
      resolvedAt: new Date(),
    });

    res.json({ data: violation });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

// ---------------------------------------------------------------------------
// Scan Log
// ---------------------------------------------------------------------------
export async function getScans(req: Request, res: Response) {
  try {
    const { page, limit, offset } = paginate(req.query as Record<string, string>);
    const where: Record<string, unknown> = {};
    if (req.query.scan_type) where.scanType = req.query.scan_type;

    const { rows, count } = await OrchestratorScanLog.findAndCountAll({
      where,
      order: [['startedAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------
export async function getMarketplace(req: Request, res: Response) {
  try {
    const { page, limit, offset } = paginate(req.query as Record<string, string>);
    const where: Record<string, unknown> = {};
    if (req.query.status) where.status = req.query.status;

    const { rows, count } = await MarketplaceSubmission.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function createMarketplaceSubmission(req: Request, res: Response) {
  try {
    const user = (req as unknown as { user: { userId?: string } }).user;
    const { agent_variant_id, name, description, documentation_url } = req.body;

    if (!name) return res.status(400).json({ error: { message: 'name is required' } });

    const submission = await MarketplaceSubmission.create({
      submitterId: user?.userId || 'unknown',
      agentVariantId: agent_variant_id || null,
      submissionName: name,
      description: description || null,
      documentationUrl: documentation_url || null,
    });

    res.status(201).json({ data: submission });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}

export async function reviewMarketplaceSubmission(req: Request, res: Response) {
  try {
    const user = (req as unknown as { user: { role?: string; email?: string } }).user;
    if (user?.role !== 'it_admin') {
      return res.status(403).json({ error: { message: 'Only IT admins can review submissions' } });
    }

    const submission = await MarketplaceSubmission.findByPk(req.params.id);
    if (!submission) return res.status(404).json({ error: { message: 'Submission not found' } });

    const { status, notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: { message: 'status must be approved or rejected' } });
    }

    const existingNotes = (submission.reviewNotes || []) as Record<string, unknown>[];
    existingNotes.push({
      reviewer: user?.email || 'admin',
      note: notes || '',
      timestamp: new Date().toISOString(),
    });

    await submission.update({
      status,
      reviewNotes: existingNotes,
      reviewedAt: new Date(),
      ...(status === 'approved' ? { publishedAt: new Date() } : {}),
    });

    res.json({ data: submission });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
}
