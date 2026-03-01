import type { GraphEdge, GraphEdgeData } from '../types/graphTypes';
import type {
  OntologyRelationship,
  UseCase,
  AgentVariant,
  CertificationRecord,
  DeploymentInstance,
} from '../../types/compliance';
import type { MarketplaceSubmission } from '../../types/orchestrator';

// ---------------------------------------------------------------------------
// Ontology Relationship → Edge
// ---------------------------------------------------------------------------

const RELATIONSHIP_EDGE_TYPE_MAP: Record<string, GraphEdgeData['edgeType']> = {
  SOLVES: 'solves',
  OPERATES_IN: 'operates_in',
  COMPLIES_WITH: 'complies_with',
  DEPENDS_ON: 'depends_on',
  TRIGGERS: 'semantic',
  INVALIDATES: 'semantic',
  APPLIES_TO: 'semantic',
  REQUIRES: 'semantic',
};

const SUBJECT_ID_PREFIX: Record<string, string> = {
  industry: 'industry',
  use_case: 'usecase',
  agent_skeleton: 'skeleton',
  agent_variant: 'variant',
  certification: 'cert',
  deployment: 'deploy',
  risk: 'risk',
  marketplace: 'market',
};

function entityIdToNodeId(entityType: string, entityId: string): string {
  const prefix = SUBJECT_ID_PREFIX[entityType] ?? entityType;
  return `${prefix}-${entityId}`;
}

export function ontologyToEdges(relationships: OntologyRelationship[]): GraphEdge[] {
  return relationships.map((rel) => {
    const edgeType = RELATIONSHIP_EDGE_TYPE_MAP[rel.relationshipType] ?? 'semantic';
    const data: GraphEdgeData = {
      edgeType,
      label: rel.relationshipType.replace(/_/g, ' '),
      weight: rel.weight,
      relationshipType: rel.relationshipType,
    };
    return {
      id: `onto-${rel.id}`,
      source: entityIdToNodeId(rel.subjectType, rel.subjectId),
      target: entityIdToNodeId(rel.objectType, rel.objectId),
      type: edgeType === 'hierarchical' ? 'hierarchicalEdge' : 'semanticEdge',
      animated: false,
      data,
    };
  });
}

// ---------------------------------------------------------------------------
// Implicit FK Edges — UseCase.industryScope → Industry nodes
// ---------------------------------------------------------------------------

export function useCaseIndustryEdges(useCases: UseCase[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const uc of useCases) {
    if (!uc.industryScope) continue;
    for (const code of uc.industryScope) {
      edges.push({
        id: `uc-ind-${uc.id}-${code}`,
        source: `industry-${code}`,
        target: `usecase-${uc.id}`,
        type: 'hierarchicalEdge',
        data: { edgeType: 'operates_in', label: 'Industry' },
      });
    }
  }
  return edges;
}

// ---------------------------------------------------------------------------
// Variant → Skeleton edges
// ---------------------------------------------------------------------------

export function variantSkeletonEdges(variants: AgentVariant[]): GraphEdge[] {
  return variants.map((v) => ({
    id: `var-sk-${v.id}`,
    source: `skeleton-${v.skeletonId}`,
    target: `variant-${v.id}`,
    type: 'hierarchicalEdge',
    data: { edgeType: 'template' },
  }));
}

// ---------------------------------------------------------------------------
// Variant → Industry edges
// ---------------------------------------------------------------------------

export function variantIndustryEdges(variants: AgentVariant[]): GraphEdge[] {
  return variants
    .filter((v) => v.industryCode)
    .map((v) => ({
      id: `var-ind-${v.id}`,
      source: `industry-${v.industryCode}`,
      target: `variant-${v.id}`,
      type: 'semanticEdge',
      data: { edgeType: 'operates_in', label: 'Operates in' },
    }));
}

// ---------------------------------------------------------------------------
// Certification → Variant edges
// ---------------------------------------------------------------------------

export function certificationVariantEdges(certs: CertificationRecord[]): GraphEdge[] {
  return certs.map((c) => ({
    id: `cert-var-${c.id}`,
    source: `variant-${c.agentVariantId}`,
    target: `cert-${c.id}`,
    type: 'hierarchicalEdge',
    data: { edgeType: 'certifies' },
  }));
}

// ---------------------------------------------------------------------------
// Deployment → Variant edges
// ---------------------------------------------------------------------------

export function deploymentVariantEdges(deployments: DeploymentInstance[]): GraphEdge[] {
  return deployments.map((d) => ({
    id: `dep-var-${d.id}`,
    source: `variant-${d.agentVariantId}`,
    target: `deploy-${d.id}`,
    type: 'hierarchicalEdge',
    data: { edgeType: 'deploys' },
  }));
}

// ---------------------------------------------------------------------------
// Marketplace → Variant edges
// ---------------------------------------------------------------------------

export function marketplaceVariantEdges(submissions: MarketplaceSubmission[]): GraphEdge[] {
  return submissions
    .filter((m) => m.agentVariantId)
    .map((m) => ({
      id: `mkt-var-${m.id}`,
      source: `variant-${m.agentVariantId}`,
      target: `market-${m.id}`,
      type: 'semanticEdge',
      data: { edgeType: 'semantic', label: 'Submitted' },
    }));
}

// ---------------------------------------------------------------------------
// Combine all implicit edges
// ---------------------------------------------------------------------------

export function buildImplicitEdges(
  useCases: UseCase[],
  variants: AgentVariant[],
  certifications: CertificationRecord[],
  deployments: DeploymentInstance[],
  marketplace: MarketplaceSubmission[],
): GraphEdge[] {
  return [
    ...useCaseIndustryEdges(useCases),
    ...variantSkeletonEdges(variants),
    ...variantIndustryEdges(variants),
    ...certificationVariantEdges(certifications),
    ...deploymentVariantEdges(deployments),
    ...marketplaceVariantEdges(marketplace),
  ];
}
