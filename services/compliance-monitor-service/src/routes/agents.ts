import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createAgentStack,
  listAgentStacks,
  getAgentStack,
  updateAgentStack,
  deployAgentStack,
  pauseAgentStack,
  resumeAgentStack,
  stopAgentStack,
  deleteAgentStack,
  getAgentMetrics,
  optimizeAgent,
} from '../controllers/agentController';

const router = Router();

// POST /api/agents — create a new agent stack
router.post('/', authenticate, createAgentStack);

// GET /api/agents — list agent stacks with pagination and filters
router.get('/', authenticate, listAgentStacks);

// GET /api/agents/:id — get a single agent stack
router.get('/:id', authenticate, getAgentStack);

// PUT /api/agents/:id — update an agent stack
router.put('/:id', authenticate, updateAgentStack);

// POST /api/agents/:id/deploy — deploy an agent stack
router.post('/:id/deploy', authenticate, deployAgentStack);

// POST /api/agents/:id/pause — pause a running agent
router.post('/:id/pause', authenticate, pauseAgentStack);

// POST /api/agents/:id/resume — resume a paused agent
router.post('/:id/resume', authenticate, resumeAgentStack);

// POST /api/agents/:id/stop — stop a running or paused agent
router.post('/:id/stop', authenticate, stopAgentStack);

// DELETE /api/agents/:id — delete an agent stack
router.delete('/:id', authenticate, deleteAgentStack);

// GET /api/agents/:id/metrics — get agent metrics with drift analysis
router.get('/:id/metrics', authenticate, getAgentMetrics);

// POST /api/agents/:id/optimize — optimize agent deployment
router.post('/:id/optimize', authenticate, optimizeAgent);

export default router;
