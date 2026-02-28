import { Request, Response, NextFunction } from 'express';
import { NaicsIndustry } from '../models/NaicsIndustry';
import { TaxonomyNode } from '../models/TaxonomyNode';
import { OntologyRelationship } from '../models/OntologyRelationship';
import { UseCase } from '../models/UseCase';
import { AgentSkeleton } from '../models/AgentSkeleton';
import { AgentVariant } from '../models/AgentVariant';
import { DeploymentInstance } from '../models/DeploymentInstance';
import { CertificationRecord } from '../models/CertificationRecord';
import { RegistryAuditLog } from '../models/RegistryAuditLog';
import { SystemIntelligence } from '../models/SystemIntelligence';
import { AppError } from '../utils/AppError';
import { Op } from 'sequelize';

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------
function paginate(query: Record<string, any>) {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 25));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// ===========================================================================
// NAICS Industries
// ===========================================================================

export async function getIndustries(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit, offset, page } = paginate(req.query);
    const where: any = {};

    if (req.query.level) where.level = parseInt(req.query.level as string, 10);
    if (req.query.sector) where.sector = req.query.sector;

    const { rows, count } = await NaicsIndustry.findAndCountAll({
      where,
      order: [['code', 'ASC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getIndustryByCode(req: Request, res: Response, next: NextFunction) {
  try {
    const industry = await NaicsIndustry.findByPk(req.params.code, {
      include: [{ model: NaicsIndustry, as: 'children' }],
    });

    if (!industry) throw AppError.notFound('Industry not found');
    res.json({ data: industry });
  } catch (err) {
    next(err);
  }
}

export async function getIndustryRegulations(req: Request, res: Response, next: NextFunction) {
  try {
    const code = req.params.code;
    const industry = await NaicsIndustry.findByPk(code);
    if (!industry) throw AppError.notFound('Industry not found');

    // Find regulations that apply to this industry (directly or via cross-industry)
    const relationships = await OntologyRelationship.findAll({
      where: {
        relationshipType: 'APPLIES_TO',
        objectType: 'industry',
        objectId: { [Op.in]: [code, industry.sector] },
      },
    });

    // Get the regulation taxonomy nodes
    const regIds = relationships.map((r) => r.subjectId);
    const regulations =
      regIds.length > 0
        ? await TaxonomyNode.findAll({
            where: { id: { [Op.in]: regIds }, nodeType: 'regulation' },
          })
        : [];

    res.json({ data: regulations, industryCode: code });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// Taxonomy
// ===========================================================================

export async function getTaxonomyNodes(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit, offset, page } = paginate(req.query);
    const where: any = {};

    if (req.query.node_type) where.nodeType = req.query.node_type;
    if (req.query.risk_tier) where.riskTier = req.query.risk_tier;

    const { rows, count } = await TaxonomyNode.findAndCountAll({
      where,
      order: [
        ['nodeType', 'ASC'],
        ['name', 'ASC'],
      ],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTaxonomyNodeById(req: Request, res: Response, next: NextFunction) {
  try {
    const node = await TaxonomyNode.findByPk(req.params.id, {
      include: [{ model: TaxonomyNode, as: 'children' }],
    });

    if (!node) throw AppError.notFound('Taxonomy node not found');
    res.json({ data: node });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// Ontology
// ===========================================================================

export async function getOntologyRelationships(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit, offset, page } = paginate(req.query);
    const where: any = {};

    if (req.query.subject_type) where.subjectType = req.query.subject_type;
    if (req.query.object_type) where.objectType = req.query.object_type;
    if (req.query.relationship_type) where.relationshipType = req.query.relationship_type;

    const { rows, count } = await OntologyRelationship.findAndCountAll({
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
    next(err);
  }
}

export async function getEntityRelationships(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityType, entityId } = req.params;

    const relationships = await OntologyRelationship.findAll({
      where: {
        [Op.or]: [
          { subjectType: entityType, subjectId: entityId },
          { objectType: entityType, objectId: entityId },
        ],
      },
      order: [['weight', 'DESC']],
    });

    res.json({ data: relationships });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// Use Cases
// ===========================================================================

export async function getUseCases(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit, offset, page } = paginate(req.query);
    const where: any = {};

    if (req.query.status) where.status = req.query.status;
    if (req.query.monetization_type) where.monetizationType = req.query.monetization_type;

    const { rows, count } = await UseCase.findAndCountAll({
      where,
      order: [['urgencyScore', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUseCaseById(req: Request, res: Response, next: NextFunction) {
  try {
    const useCase = await UseCase.findByPk(req.params.id);
    if (!useCase) throw AppError.notFound('Use case not found');

    // Get linked agents via ontology
    const agentLinks = await OntologyRelationship.findAll({
      where: { subjectType: 'use_case', subjectId: req.params.id },
    });

    res.json({ data: useCase, relationships: agentLinks });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// Agent Skeletons & Variants
// ===========================================================================

export async function getAgentSkeletons(req: Request, res: Response, next: NextFunction) {
  try {
    const skeletons = await AgentSkeleton.findAll({
      order: [['specializationType', 'ASC']],
      include: [{ model: AgentVariant, as: 'variants' }],
    });

    res.json({ data: skeletons });
  } catch (err) {
    next(err);
  }
}

export async function getAgentVariants(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit, offset, page } = paginate(req.query);
    const where: any = {};

    if (req.query.industry_code) where.industryCode = req.query.industry_code;
    if (req.query.certification_status) where.certificationStatus = req.query.certification_status;
    if (req.query.skeleton_id) where.skeletonId = req.query.skeleton_id;

    const { rows, count } = await AgentVariant.findAndCountAll({
      where,
      include: [{ model: AgentSkeleton, as: 'skeleton' }],
      order: [['certificationScore', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAgentVariantById(req: Request, res: Response, next: NextFunction) {
  try {
    const variant = await AgentVariant.findByPk(req.params.id, {
      include: [
        { model: AgentSkeleton, as: 'skeleton' },
        { model: CertificationRecord, as: 'certifications' },
        { model: DeploymentInstance, as: 'deployments' },
      ],
    });

    if (!variant) throw AppError.notFound('Agent variant not found');
    res.json({ data: variant });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// Certifications
// ===========================================================================

export async function getCertifications(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit, offset, page } = paginate(req.query);
    const where: any = {};

    if (req.query.certification_type) where.certificationType = req.query.certification_type;
    if (req.query.compliance_framework) where.complianceFramework = req.query.compliance_framework;

    const { rows, count } = await CertificationRecord.findAndCountAll({
      where,
      include: [{ model: AgentVariant, as: 'variant' }],
      order: [['expiryDate', 'ASC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// Deployments
// ===========================================================================

export async function getDeployments(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit, offset, page } = paginate(req.query);
    const where: any = {};

    if (req.query.environment) where.environment = req.query.environment;
    if (req.query.active_status) where.activeStatus = req.query.active_status === 'true';

    const { rows, count } = await DeploymentInstance.findAndCountAll({
      where,
      include: [{ model: AgentVariant, as: 'variant' }],
      order: [['deployedAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      data: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// System Intelligence
// ===========================================================================

export async function getIntelligence(req: Request, res: Response, next: NextFunction) {
  try {
    const where: any = {};
    if (req.query.metric_type) where.metricType = req.query.metric_type;

    // Get latest metric per type
    const metrics = await SystemIntelligence.findAll({
      where,
      order: [['computedAt', 'DESC']],
      limit: req.query.metric_type ? 10 : 50,
    });

    res.json({ data: metrics });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// Audit Log
// ===========================================================================

export async function getAuditLog(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit, offset, page } = paginate(req.query);
    const where: any = {};

    if (req.query.entity_type) where.entityType = req.query.entity_type;
    if (req.query.action) where.action = req.query.action;
    if (req.query.actor) where.actor = req.query.actor;

    const { rows, count } = await RegistryAuditLog.findAndCountAll({
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
    next(err);
  }
}

// ===========================================================================
// Stack Simulation
// ===========================================================================

export async function simulateStack(req: Request, res: Response, next: NextFunction) {
  try {
    const { industry_code, use_case_id } = req.body;
    if (!industry_code) throw AppError.badRequest('industry_code is required');

    // Find matching agent variants for the industry
    const variants = await AgentVariant.findAll({
      where: { industryCode: industry_code, certificationStatus: 'certified' },
      include: [{ model: AgentSkeleton, as: 'skeleton' }],
    });

    // Find applicable regulations
    const regulations = await OntologyRelationship.findAll({
      where: {
        relationshipType: 'APPLIES_TO',
        objectType: 'industry',
        objectId: industry_code,
      },
    });

    // Build simulation result
    const simulation = {
      industryCode: industry_code,
      useCaseId: use_case_id || null,
      recommendedAgents: variants.map((v) => ({
        id: v.id,
        name: v.name,
        skeleton: (v as any).skeleton?.name,
        certificationStatus: v.certificationStatus,
        certificationScore: v.certificationScore,
      })),
      applicableRegulations: regulations.length,
      estimatedCoverage:
        variants.length > 0 ? Math.min(100, Math.round((variants.length / 5) * 100)) : 0,
      readiness: variants.length >= 3 ? 'high' : variants.length >= 1 ? 'medium' : 'low',
    };

    res.json({ data: simulation });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// Deploy Stack
// ===========================================================================

export async function deployStack(req: Request, res: Response, next: NextFunction) {
  try {
    const { agent_variant_id, agent_stack_id, environment } = req.body;
    if (!agent_variant_id || !agent_stack_id) {
      throw AppError.badRequest('agent_variant_id and agent_stack_id are required');
    }

    const variant = await AgentVariant.findByPk(agent_variant_id);
    if (!variant) throw AppError.notFound('Agent variant not found');

    const deployment = await DeploymentInstance.create({
      agentStackId: agent_stack_id,
      agentVariantId: agent_variant_id,
      environment: environment || 'development',
      activeStatus: true,
      performanceScore: 100,
      executionCount: 0,
      errorCount: 0,
      deployedAt: new Date(),
    });

    // Log to audit
    await RegistryAuditLog.create({
      actor: req.user?.email || 'api',
      action: 'create',
      entityType: 'deployment_instances',
      entityId: deployment.id,
      changes: { agentVariantId: agent_variant_id, environment },
      reason: 'Stack deployment via API',
    });

    res.status(201).json({ data: deployment });
  } catch (err) {
    next(err);
  }
}
