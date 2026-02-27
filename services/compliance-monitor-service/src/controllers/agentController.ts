import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import AgentStack from '../models/AgentStack';
import { AppError } from '../utils/AppError';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3004';

const VALID_TYPES = [
  'compliance_monitor',
  'risk_analyzer',
  'regulatory_tracker',
  'audit_agent',
  'custom',
] as const;

const VALID_STATUSES = ['draft', 'deploying', 'running', 'paused', 'stopped', 'error'] as const;

/**
 * POST /api/agents
 * Creates a new agent stack in draft status.
 */
export async function createAgentStack(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, type, description, configuration } = req.body;

    if (!name) {
      throw AppError.badRequest('name is required');
    }

    if (!type || !VALID_TYPES.includes(type)) {
      throw AppError.badRequest(`type is required and must be one of: ${VALID_TYPES.join(', ')}`);
    }

    const agent = await AgentStack.create({
      userId: String(req.user!.userId),
      name,
      type,
      description: description || null,
      configuration: configuration || null,
    });

    res.status(201).json(agent.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/agents
 * Lists agent stacks with pagination and optional filters.
 */
export async function listAgentStacks(
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
      where.userId = req.query.userId;
    }

    if (req.query.status) {
      if (VALID_STATUSES.includes(req.query.status as (typeof VALID_STATUSES)[number])) {
        where.status = req.query.status;
      }
    }

    if (req.query.type) {
      if (VALID_TYPES.includes(req.query.type as (typeof VALID_TYPES)[number])) {
        where.type = req.query.type;
      }
    }

    const { count, rows } = await AgentStack.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      agents: rows.map((r) => r.toJSON()),
      total: count,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/agents/:id
 * Returns a single agent stack with full details.
 */
export async function getAgentStack(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await AgentStack.findByPk(req.params.id);

    if (!agent) {
      throw AppError.notFound('Agent stack not found');
    }

    res.status(200).json(agent.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/agents/:id
 * Updates agent stack name, description, configuration.
 * Only allowed when status is draft or stopped.
 */
export async function updateAgentStack(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await AgentStack.findByPk(req.params.id);

    if (!agent) {
      throw AppError.notFound('Agent stack not found');
    }

    if (agent.status !== 'draft' && agent.status !== 'stopped') {
      throw AppError.badRequest('Agent can only be updated when in draft or stopped status');
    }

    const { name, description, configuration } = req.body;

    if (name !== undefined) agent.name = name;
    if (description !== undefined) agent.description = description;
    if (configuration !== undefined) agent.configuration = configuration;

    await agent.save();

    res.status(200).json(agent.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/agents/:id/deploy
 * Deploys an agent stack (draft/stopped → deploying → running).
 */
export async function deployAgentStack(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await AgentStack.findByPk(req.params.id);

    if (!agent) {
      throw AppError.notFound('Agent stack not found');
    }

    if (agent.status !== 'draft' && agent.status !== 'stopped') {
      throw AppError.badRequest('Agent can only be deployed from draft or stopped status');
    }

    agent.status = 'deploying';
    await agent.save();

    // Simulate deployment completion
    agent.status = 'running';
    agent.deployedAt = new Date();
    agent.healthStatus = 'healthy';
    agent.lastHealthCheck = new Date();
    await agent.save();

    res.status(200).json(agent.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/agents/:id/pause
 * Pauses a running agent stack.
 */
export async function pauseAgentStack(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await AgentStack.findByPk(req.params.id);

    if (!agent) {
      throw AppError.notFound('Agent stack not found');
    }

    if (agent.status !== 'running') {
      throw AppError.badRequest('Agent can only be paused when running');
    }

    agent.status = 'paused';
    await agent.save();

    res.status(200).json(agent.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/agents/:id/resume
 * Resumes a paused agent stack.
 */
export async function resumeAgentStack(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await AgentStack.findByPk(req.params.id);

    if (!agent) {
      throw AppError.notFound('Agent stack not found');
    }

    if (agent.status !== 'paused') {
      throw AppError.badRequest('Agent can only be resumed when paused');
    }

    agent.status = 'running';
    await agent.save();

    res.status(200).json(agent.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/agents/:id/stop
 * Stops a running or paused agent stack.
 */
export async function stopAgentStack(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await AgentStack.findByPk(req.params.id);

    if (!agent) {
      throw AppError.notFound('Agent stack not found');
    }

    if (agent.status !== 'running' && agent.status !== 'paused') {
      throw AppError.badRequest('Agent can only be stopped when running or paused');
    }

    agent.status = 'stopped';
    agent.healthStatus = 'unknown';
    await agent.save();

    res.status(200).json(agent.toJSON());
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/agents/:id
 * Deletes an agent stack (only if stopped or draft).
 */
export async function deleteAgentStack(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await AgentStack.findByPk(req.params.id);

    if (!agent) {
      throw AppError.notFound('Agent stack not found');
    }

    if (agent.status !== 'draft' && agent.status !== 'stopped') {
      throw AppError.badRequest('Agent can only be deleted when in draft or stopped status');
    }

    await agent.destroy();

    res.status(200).json({ message: 'Agent stack deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/agents/:id/metrics
 * Returns agent metrics and drift analysis from model server.
 */
export async function getAgentMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await AgentStack.findByPk(req.params.id);

    if (!agent) {
      throw AppError.notFound('Agent stack not found');
    }

    let driftAnalysis = null;

    try {
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/inference/drift-analysis`, {
        agentId: agent.id,
        agentType: agent.type,
        metrics: agent.metrics,
      });
      driftAnalysis = aiResponse.data;
    } catch {
      // AI service unavailable — return metrics without drift analysis
      driftAnalysis = { error: 'AI service unavailable' };
    }

    res.status(200).json({
      agentId: agent.id,
      metrics: agent.metrics || {
        requests: 0,
        errors: 0,
        avg_latency: 0,
        uptime: 0,
      },
      healthStatus: agent.healthStatus,
      lastHealthCheck: agent.lastHealthCheck,
      driftAnalysis,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/agents/:id/optimize
 * Calls model-server optimize-deployment with agent constraints.
 */
export async function optimizeAgent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await AgentStack.findByPk(req.params.id);

    if (!agent) {
      throw AppError.notFound('Agent stack not found');
    }

    try {
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/inference/optimize-deployment`, {
        agentId: agent.id,
        agentType: agent.type,
        configuration: agent.configuration,
        metrics: agent.metrics,
        constraints: req.body.constraints || {},
      });

      res.status(200).json({
        agentId: agent.id,
        optimization: aiResponse.data,
      });
    } catch {
      res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'AI Recommendation Service is currently unavailable. Please try again later.',
          details: null,
        },
      });
    }
  } catch (err) {
    next(err);
  }
}
