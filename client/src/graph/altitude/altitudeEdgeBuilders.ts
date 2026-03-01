import type { Edge } from '@xyflow/react';
import type { AltitudeLevel } from './altitudeTypes';
import type { IndustryClusterAgg, UseCaseClusterAgg, StackClusterAgg } from './aggregators';
import type { AgentVariant } from '../../types/compliance';

/**
 * Build edges for the current altitude level.
 * Returns ReactFlow edges with proper typing.
 */
export function buildAltitudeEdges(
  altitude: AltitudeLevel,
  context: {
    industryClusters?: IndustryClusterAgg[];
    useCaseClusters?: UseCaseClusterAgg[];
    stackClusters?: StackClusterAgg[];
    variants?: AgentVariant[];
    industryCode?: string | null;
    useCaseId?: string | null;
    skeletonId?: string | null;
    variantId?: string | null;
  },
): Edge[] {
  switch (altitude) {
    case 'GLOBAL':
      return buildGlobalEdges(context.industryClusters ?? []);
    case 'INDUSTRY':
      return buildIndustryEdges(context.industryCode ?? '', context.useCaseClusters ?? []);
    case 'USE_CASE':
      return buildUseCaseEdges(context.useCaseId ?? '', context.stackClusters ?? []);
    case 'STACK':
      return buildStackEdges(context.skeletonId ?? '', context.variants ?? []);
    case 'AGENT':
      return buildAgentEdges(context.variantId ?? '', context.variants ?? []);
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// GLOBAL: cross-industry edges (shared skeletons)
// ---------------------------------------------------------------------------

function buildGlobalEdges(clusters: IndustryClusterAgg[]): Edge[] {
  // At GLOBAL level, edges are optional — show connections between
  // industries that share common agent types (via variant overlap).
  // For now, no edges at GLOBAL to keep the bubble view clean.
  // Can be enhanced later with cross-industry links.
  void clusters;
  return [];
}

// ---------------------------------------------------------------------------
// INDUSTRY: industry → use case cluster edges
// ---------------------------------------------------------------------------

function buildIndustryEdges(industryCode: string, ucClusters: UseCaseClusterAgg[]): Edge[] {
  const edges: Edge[] = [];
  const sourceId = `industry-${industryCode}`;

  for (const uc of ucClusters) {
    edges.push({
      id: `e-ind-uc-${uc.useCaseId}`,
      source: sourceId,
      target: `uccluster-${uc.useCaseId}`,
      type: 'hierarchicalEdge',
      data: {
        edgeType: 'hierarchical' as const,
        label: 'has use case',
        animated: false,
      },
    });
  }

  return edges;
}

// ---------------------------------------------------------------------------
// USE_CASE: use case → stack cluster edges
// ---------------------------------------------------------------------------

function buildUseCaseEdges(useCaseId: string, stackClusters: StackClusterAgg[]): Edge[] {
  const edges: Edge[] = [];
  const sourceId = `usecase-${useCaseId}`;

  for (const sk of stackClusters) {
    edges.push({
      id: `e-uc-sk-${sk.skeletonId}`,
      source: sourceId,
      target: `skcluster-${sk.skeletonId}`,
      type: 'hierarchicalEdge',
      data: {
        edgeType: 'hierarchical' as const,
        label: 'solves with',
        animated: false,
      },
    });
  }

  return edges;
}

// ---------------------------------------------------------------------------
// STACK: skeleton → variant edges, variant → cert/deploy edges
// ---------------------------------------------------------------------------

function buildStackEdges(skeletonId: string, variants: AgentVariant[]): Edge[] {
  const edges: Edge[] = [];
  const sourceId = `skeleton-${skeletonId}`;

  for (const v of variants) {
    // Skeleton → Variant
    edges.push({
      id: `e-sk-var-${v.id}`,
      source: sourceId,
      target: `variant-${v.id}`,
      type: 'hierarchicalEdge',
      data: { edgeType: 'template' as const, animated: false },
    });

    // Variant → Certifications
    for (const cert of v.certifications ?? []) {
      edges.push({
        id: `e-var-cert-${cert.id}`,
        source: `variant-${v.id}`,
        target: `cert-${cert.id}`,
        type: 'semanticEdge',
        data: { edgeType: 'certifies' as const, label: cert.complianceFramework, animated: false },
      });
    }

    // Variant → Deployments
    for (const dep of v.deployments ?? []) {
      edges.push({
        id: `e-var-dep-${dep.id}`,
        source: `variant-${v.id}`,
        target: `deploy-${dep.id}`,
        type: 'hierarchicalEdge',
        data: { edgeType: 'deploys' as const, animated: dep.activeStatus },
      });
    }
  }

  return edges;
}

// ---------------------------------------------------------------------------
// AGENT: variant → cert/deploy/risk/marketplace edges
// ---------------------------------------------------------------------------

function buildAgentEdges(variantId: string, variants: AgentVariant[]): Edge[] {
  const edges: Edge[] = [];
  const variant = variants.find((v) => v.id === variantId);
  if (!variant) return edges;

  const sourceId = `variant-${variantId}`;

  // Variant → Certifications
  for (const cert of variant.certifications ?? []) {
    edges.push({
      id: `e-agent-cert-${cert.id}`,
      source: sourceId,
      target: `cert-${cert.id}`,
      type: 'semanticEdge',
      data: { edgeType: 'certifies' as const, label: cert.complianceFramework, animated: false },
    });
  }

  // Variant → Deployments
  for (const dep of variant.deployments ?? []) {
    edges.push({
      id: `e-agent-dep-${dep.id}`,
      source: sourceId,
      target: `deploy-${dep.id}`,
      type: 'hierarchicalEdge',
      data: { edgeType: 'deploys' as const, animated: dep.activeStatus },
    });
  }

  // Cross-stack reuse: other variants sharing the same skeleton
  const siblings = variants.filter(
    (v) => v.skeletonId === variant.skeletonId && v.id !== variantId,
  );
  for (const sib of siblings.slice(0, 5)) {
    edges.push({
      id: `e-reuse-${variantId}-${sib.id}`,
      source: sourceId,
      target: `variant-${sib.id}`,
      type: 'semanticEdge',
      data: { edgeType: 'semantic' as const, label: 'shared skeleton', animated: false },
    });
  }

  return edges;
}
