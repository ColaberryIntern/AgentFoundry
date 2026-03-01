import type {
  GraphNode,
  GraphNodeType,
  IndustryNodeData,
  UseCaseNodeData,
  SkeletonNodeData,
  VariantNodeData,
  CertificationNodeData,
  DeploymentNodeData,
  RiskNodeData,
  MarketplaceNodeData,
  NodeEmphasis,
} from '../types/graphTypes';
import type {
  NaicsIndustry,
  UseCase,
  AgentSkeleton,
  AgentVariant,
  CertificationRecord,
  DeploymentInstance,
  RiskAnalysisResult,
} from '../../types/compliance';
import type { MarketplaceSubmission } from '../../types/orchestrator';

// ---------------------------------------------------------------------------
// Industry → GraphNode
// ---------------------------------------------------------------------------

export function industryToNode(
  ind: NaicsIndustry,
  useCaseCount: number,
  variantCount: number,
  certifiedCount: number,
  emphasis: NodeEmphasis = 'primary',
): GraphNode {
  const data: IndustryNodeData = {
    nodeType: 'industry',
    label: ind.title,
    sublabel: `NAICS ${ind.code}`,
    status: undefined,
    emphasis,
    selected: false,
    opacity: 1,
    code: ind.code,
    title: ind.title,
    sector: ind.sector,
    level: ind.level,
    useCaseCount,
    variantCount,
    certifiedCount,
  };
  return { id: `industry-${ind.code}`, type: 'industryNode', position: { x: 0, y: 0 }, data };
}

// ---------------------------------------------------------------------------
// UseCase → GraphNode
// ---------------------------------------------------------------------------

export function useCaseToNode(uc: UseCase, emphasis: NodeEmphasis = 'primary'): GraphNode {
  const data: UseCaseNodeData = {
    nodeType: 'useCase',
    label:
      uc.outcomeStatement.length > 60
        ? uc.outcomeStatement.slice(0, 57) + '...'
        : uc.outcomeStatement,
    sublabel: uc.monetizationType?.replace(/_/g, ' ') ?? '',
    status: uc.status,
    emphasis,
    selected: false,
    opacity: 1,
    outcomeStatement: uc.outcomeStatement,
    monetizationType: uc.monetizationType,
    urgencyScore: uc.urgencyScore,
    regulatoryScope: uc.regulatoryScope ?? [],
    industryScope: uc.industryScope ?? [],
    kpi: uc.measurableKpi,
  };
  return { id: `usecase-${uc.id}`, type: 'useCaseNode', position: { x: 0, y: 0 }, data };
}

// ---------------------------------------------------------------------------
// AgentSkeleton → GraphNode
// ---------------------------------------------------------------------------

export function skeletonToNode(
  sk: AgentSkeleton,
  variantCount: number,
  emphasis: NodeEmphasis = 'primary',
): GraphNode {
  const data: SkeletonNodeData = {
    nodeType: 'skeleton',
    label: sk.name,
    sublabel: sk.specializationType?.replace(/_/g, ' ') ?? '',
    status: undefined,
    emphasis,
    selected: false,
    opacity: 1,
    name: sk.name,
    specializationType: sk.specializationType,
    capabilities: sk.coreCapabilities ?? [],
    riskLevel: sk.riskLevel,
    variantCount,
  };
  return { id: `skeleton-${sk.id}`, type: 'skeletonNode', position: { x: 0, y: 0 }, data };
}

// ---------------------------------------------------------------------------
// AgentVariant → GraphNode
// ---------------------------------------------------------------------------

export function variantToNode(
  v: AgentVariant,
  skeletonName?: string,
  emphasis: NodeEmphasis = 'primary',
): GraphNode {
  const data: VariantNodeData = {
    nodeType: 'variant',
    label: v.name,
    sublabel: v.certificationStatus,
    status: v.certificationStatus,
    emphasis,
    selected: false,
    opacity: 1,
    name: v.name,
    industryCode: v.industryCode,
    certificationStatus: v.certificationStatus,
    certificationScore: v.certificationScore,
    skeletonId: v.skeletonId,
    skeletonName,
  };
  return { id: `variant-${v.id}`, type: 'variantNode', position: { x: 0, y: 0 }, data };
}

// ---------------------------------------------------------------------------
// CertificationRecord → GraphNode
// ---------------------------------------------------------------------------

export function certificationToNode(
  c: CertificationRecord,
  emphasis: NodeEmphasis = 'primary',
): GraphNode {
  const data: CertificationNodeData = {
    nodeType: 'certification',
    label: c.complianceFramework,
    sublabel: c.certificationType?.replace(/_/g, ' ') ?? '',
    status: c.auditPassed ? 'passed' : 'failed',
    emphasis,
    selected: false,
    opacity: 1,
    certificationType: c.certificationType,
    complianceFramework: c.complianceFramework,
    bestPracticeScore: c.bestPracticeScore,
    auditPassed: c.auditPassed,
    expiryDate: c.expiryDate,
    variantId: c.agentVariantId,
  };
  return { id: `cert-${c.id}`, type: 'certificationNode', position: { x: 0, y: 0 }, data };
}

// ---------------------------------------------------------------------------
// DeploymentInstance → GraphNode
// ---------------------------------------------------------------------------

export function deploymentToNode(
  d: DeploymentInstance,
  emphasis: NodeEmphasis = 'primary',
): GraphNode {
  const data: DeploymentNodeData = {
    nodeType: 'deployment',
    label: `${d.environment} deploy`,
    sublabel: d.activeStatus ? 'Active' : 'Inactive',
    status: d.activeStatus ? 'active' : 'inactive',
    emphasis,
    selected: false,
    opacity: 1,
    environment: d.environment,
    activeStatus: d.activeStatus,
    performanceScore: d.performanceScore,
    executionCount: d.executionCount,
    errorCount: d.errorCount,
    variantId: d.agentVariantId,
  };
  return { id: `deploy-${d.id}`, type: 'deploymentNode', position: { x: 0, y: 0 }, data };
}

// ---------------------------------------------------------------------------
// RiskAnalysisResult → GraphNode
// ---------------------------------------------------------------------------

export function riskToNode(r: RiskAnalysisResult, emphasis: NodeEmphasis = 'primary'): GraphNode {
  const data: RiskNodeData = {
    nodeType: 'risk',
    label: r.title,
    sublabel: r.severity,
    status: r.severity,
    emphasis,
    selected: false,
    opacity: 1,
    severity: r.severity,
    likelihood: r.likelihood,
    impact: r.impact,
    riskScore: r.riskScore,
    category: r.category,
    regulation: r.regulation,
  };
  return { id: `risk-${r.id}`, type: 'riskNode', position: { x: 0, y: 0 }, data };
}

// ---------------------------------------------------------------------------
// MarketplaceSubmission → GraphNode
// ---------------------------------------------------------------------------

export function marketplaceToNode(
  m: MarketplaceSubmission,
  emphasis: NodeEmphasis = 'primary',
): GraphNode {
  const data: MarketplaceNodeData = {
    nodeType: 'marketplace',
    label: m.submissionName,
    sublabel: m.status?.replace(/_/g, ' ') ?? '',
    status: m.status,
    emphasis,
    selected: false,
    opacity: 1,
    submissionName: m.submissionName,
    marketplaceStatus: m.status,
    certificationRequired: m.certificationRequired,
    variantId: m.agentVariantId,
    submitterId: m.submitterId,
  };
  return { id: `market-${m.id}`, type: 'marketplaceNode', position: { x: 0, y: 0 }, data };
}

// ---------------------------------------------------------------------------
// Type guard helpers
// ---------------------------------------------------------------------------

export function getNodeTypeFromId(id: string): GraphNodeType | null {
  const prefix = id.split('-')[0];
  const map: Record<string, GraphNodeType> = {
    industry: 'industry',
    usecase: 'useCase',
    skeleton: 'skeleton',
    variant: 'variant',
    cert: 'certification',
    deploy: 'deployment',
    risk: 'risk',
    market: 'marketplace',
    indcluster: 'industryCluster',
    uccluster: 'useCaseCluster',
    skcluster: 'stackCluster',
  };
  return map[prefix] ?? null;
}

/**
 * Check if a node ID represents a cluster (aggregate) node.
 */
export function isClusterNodeId(id: string): boolean {
  return id.startsWith('indcluster-') || id.startsWith('uccluster-') || id.startsWith('skcluster-');
}

/**
 * Extract the entity ID from a cluster node ID.
 * e.g., 'indcluster-51' → '51', 'uccluster-abc123' → 'abc123'
 */
export function extractClusterEntityId(id: string): string {
  const dashIdx = id.indexOf('-');
  return dashIdx >= 0 ? id.slice(dashIdx + 1) : id;
}
