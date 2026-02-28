import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getIndustries,
  getIndustryByCode,
  getIndustryRegulations,
  getTaxonomyNodes,
  getTaxonomyNodeById,
  getOntologyRelationships,
  getEntityRelationships,
  getUseCases,
  getUseCaseById,
  getAgentSkeletons,
  getAgentVariants,
  getAgentVariantById,
  getCertifications,
  getDeployments,
  getIntelligence,
  getAuditLog,
  simulateStack,
  deployStack,
} from '../controllers/registryController';

const router = Router();

// NAICS Industries
router.get('/industries', authenticate, getIndustries);
router.get('/industries/:code', authenticate, getIndustryByCode);
router.get('/industries/:code/regulations', authenticate, getIndustryRegulations);

// Taxonomy
router.get('/taxonomy', authenticate, getTaxonomyNodes);
router.get('/taxonomy/:id', authenticate, getTaxonomyNodeById);

// Ontology
router.get('/ontology', authenticate, getOntologyRelationships);
router.get('/ontology/:entityType/:entityId', authenticate, getEntityRelationships);

// Use Cases
router.get('/usecases', authenticate, getUseCases);
router.get('/usecases/:id', authenticate, getUseCaseById);

// Agent Infrastructure
router.get('/agents/skeletons', authenticate, getAgentSkeletons);
router.get('/agents/variants', authenticate, getAgentVariants);
router.get('/agents/variants/:id', authenticate, getAgentVariantById);

// Certifications
router.get('/certifications', authenticate, getCertifications);

// Deployments
router.get('/deployments', authenticate, getDeployments);

// System Intelligence
router.get('/intelligence', authenticate, getIntelligence);

// Audit Log
router.get('/audit-log', authenticate, getAuditLog);

// Actions
router.post('/simulate-stack', authenticate, simulateStack);
router.post('/deploy-stack', authenticate, deployStack);

export default router;
