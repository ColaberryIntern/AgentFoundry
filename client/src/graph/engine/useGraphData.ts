import { useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import type { GraphNode, GraphEdge, NodeEmphasis } from '../types/graphTypes';
import type { GraphFilters } from '../types/graphState';
import { getModeConfig } from '../modes/modeConfigs';
import {
  industryToNode,
  useCaseToNode,
  skeletonToNode,
  variantToNode,
  certificationToNode,
  deploymentToNode,
  riskToNode,
  marketplaceToNode,
} from './nodeTransformers';
import { ontologyToEdges, buildImplicitEdges } from './edgeTransformers';
import type { CertificationRecord, DeploymentInstance } from '../../types/compliance';

/**
 * Core hook: transforms all Redux entity data into ReactFlow nodes and edges.
 * Applies mode-based emphasis, filters, and isolation.
 */
export function useGraphData() {
  // -- Read domain data from existing slices --
  const { industries, useCases, skeletons, variants, certifications } = useAppSelector(
    (s) => s.registry,
  );
  const { marketplace } = useAppSelector((s) => s.orchestrator);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);
  const agents = useAppSelector((s) => s.agents);
  const agentList = (agents as { agents?: unknown[] })?.agents ?? [];

  // -- Read graph UI state --
  const { viewMode, filters, expandedNodeIds, isolatedSubgraphRoot, selectedNodeIds, ontology } =
    useAppSelector((s) => s.graph);

  const modeConfig = getModeConfig(viewMode);
  const relationships = ontology?.relationships ?? [];

  // -- Extract certifications and deployments from variants --
  const allCerts: CertificationRecord[] = useMemo(() => {
    const certs: CertificationRecord[] = [...(certifications ?? [])];
    for (const v of variants) {
      if (v.certifications) {
        for (const c of v.certifications) {
          if (!certs.find((existing) => existing.id === c.id)) {
            certs.push(c);
          }
        }
      }
    }
    return certs;
  }, [variants, certifications]);

  const allDeployments: DeploymentInstance[] = useMemo(() => {
    const deps: DeploymentInstance[] = [];
    for (const v of variants) {
      if (v.deployments) deps.push(...v.deployments);
    }
    // Also extract from agent stacks if available
    for (const agent of agentList) {
      const a = agent as { deployments?: DeploymentInstance[] };
      if (a.deployments) deps.push(...a.deployments);
    }
    return deps;
  }, [variants, agentList]);

  const risks = riskAnalysis ?? [];
  const marketplaceList = marketplace ?? [];

  // -- Build nodes --
  const allNodes: GraphNode[] = useMemo(() => {
    const nodes: GraphNode[] = [];
    const emphasis = modeConfig.nodeEmphasis;

    // Pre-compute counts for industries
    const industryUseCaseCount = new Map<string, number>();
    const industryVariantCount = new Map<string, number>();
    const industryCertCount = new Map<string, number>();

    for (const uc of useCases) {
      for (const code of uc.industryScope ?? []) {
        industryUseCaseCount.set(code, (industryUseCaseCount.get(code) ?? 0) + 1);
      }
    }
    for (const v of variants) {
      if (v.industryCode) {
        industryVariantCount.set(
          v.industryCode,
          (industryVariantCount.get(v.industryCode) ?? 0) + 1,
        );
        if (v.certificationStatus === 'certified') {
          industryCertCount.set(v.industryCode, (industryCertCount.get(v.industryCode) ?? 0) + 1);
        }
      }
    }

    // Skeleton variant counts
    const skeletonVariantCount = new Map<string, number>();
    for (const v of variants) {
      skeletonVariantCount.set(v.skeletonId, (skeletonVariantCount.get(v.skeletonId) ?? 0) + 1);
    }

    // Skeleton name lookup
    const skeletonNameMap = new Map<string, string>();
    for (const sk of skeletons) {
      skeletonNameMap.set(sk.id, sk.name);
    }

    // Industries
    if (emphasis.industry !== 'hidden') {
      for (const ind of industries) {
        nodes.push(
          industryToNode(
            ind,
            industryUseCaseCount.get(ind.code) ?? 0,
            industryVariantCount.get(ind.code) ?? 0,
            industryCertCount.get(ind.code) ?? 0,
            emphasis.industry,
          ),
        );
      }
    }

    // Use Cases
    if (emphasis.useCase !== 'hidden') {
      for (const uc of useCases) {
        nodes.push(useCaseToNode(uc, emphasis.useCase));
      }
    }

    // Skeletons
    if (emphasis.skeleton !== 'hidden') {
      for (const sk of skeletons) {
        nodes.push(skeletonToNode(sk, skeletonVariantCount.get(sk.id) ?? 0, emphasis.skeleton));
      }
    }

    // Variants
    if (emphasis.variant !== 'hidden') {
      for (const v of variants) {
        nodes.push(variantToNode(v, skeletonNameMap.get(v.skeletonId), emphasis.variant));
      }
    }

    // Certifications
    if (emphasis.certification !== 'hidden') {
      for (const c of allCerts) {
        nodes.push(certificationToNode(c, emphasis.certification));
      }
    }

    // Deployments
    if (emphasis.deployment !== 'hidden') {
      for (const d of allDeployments) {
        nodes.push(deploymentToNode(d, emphasis.deployment));
      }
    }

    // Risks
    if (emphasis.risk !== 'hidden') {
      for (const r of risks) {
        nodes.push(riskToNode(r, emphasis.risk));
      }
    }

    // Marketplace
    if (emphasis.marketplace !== 'hidden') {
      for (const m of marketplaceList) {
        nodes.push(marketplaceToNode(m, emphasis.marketplace));
      }
    }

    return nodes;
  }, [
    industries,
    useCases,
    skeletons,
    variants,
    allCerts,
    allDeployments,
    risks,
    marketplaceList,
    modeConfig,
  ]);

  // -- Build edges --
  const allEdges: GraphEdge[] = useMemo(() => {
    const ontologyEdges = ontologyToEdges(relationships);
    const implicitEdges = buildImplicitEdges(
      useCases,
      variants,
      allCerts,
      allDeployments,
      marketplaceList,
    );
    return [...ontologyEdges, ...implicitEdges];
  }, [relationships, useCases, variants, allCerts, allDeployments, marketplaceList]);

  // -- Apply filters --
  const filteredNodes = useMemo(() => {
    return applyFilters(allNodes, filters);
  }, [allNodes, filters]);

  // -- Apply selection & opacity --
  const styledNodes = useMemo(() => {
    const nodeIdSet = new Set(filteredNodes.map((n) => n.id));

    // If isolated, find reachable nodes from root
    let visibleSet: Set<string> | null = null;
    if (isolatedSubgraphRoot && nodeIdSet.has(isolatedSubgraphRoot)) {
      visibleSet = findReachableNodes(isolatedSubgraphRoot, allEdges, nodeIdSet);
    }

    // If any node is expanded, find children of expanded nodes
    const expandedChildren = new Set<string>();
    if (expandedNodeIds.length > 0) {
      for (const expandedId of expandedNodeIds) {
        for (const edge of allEdges) {
          if (edge.source === expandedId && nodeIdSet.has(edge.target)) {
            expandedChildren.add(edge.target);
          }
        }
      }
    }

    return filteredNodes.map((node) => {
      const isSelected = selectedNodeIds.includes(node.id);
      let opacity = getEmphasisOpacity(node.data.emphasis);

      // If isolated, dim non-reachable nodes
      if (visibleSet && !visibleSet.has(node.id)) {
        opacity = 0.15;
      }

      // If expanded nodes exist and this node is not expanded/child/selected, dim it
      if (
        expandedNodeIds.length > 0 &&
        !expandedNodeIds.includes(node.id) &&
        !expandedChildren.has(node.id) &&
        !isSelected
      ) {
        opacity = Math.min(opacity, 0.2);
      }

      return {
        ...node,
        data: { ...node.data, selected: isSelected, opacity },
        selected: isSelected,
      };
    });
  }, [filteredNodes, selectedNodeIds, expandedNodeIds, isolatedSubgraphRoot, allEdges]);

  return {
    nodes: styledNodes,
    edges: allEdges,
    layoutDirection: modeConfig.layoutDirection,
    nodeCount: styledNodes.length,
    edgeCount: allEdges.length,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyFilters(nodes: GraphNode[], filters: GraphFilters): GraphNode[] {
  let result = nodes;

  // Filter by node type
  if (filters.nodeTypes.length < 8) {
    result = result.filter((n) => filters.nodeTypes.includes(n.data.nodeType));
  }

  // Filter by certification status
  if (filters.certificationStatus.length > 0) {
    result = result.filter((n) => {
      if (n.data.nodeType === 'variant') {
        return filters.certificationStatus.includes(
          (n.data as { certificationStatus: string }).certificationStatus,
        );
      }
      return true;
    });
  }

  // Filter by industry code
  if (filters.industryCode) {
    result = result.filter((n) => {
      if (n.data.nodeType === 'industry') {
        return (
          (n.data as { code: string }).code === filters.industryCode ||
          (n.data as { code: string }).code.startsWith(filters.industryCode!)
        );
      }
      return true;
    });
  }

  // Search query
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter(
      (n) =>
        n.data.label.toLowerCase().includes(q) ||
        (n.data.sublabel?.toLowerCase().includes(q) ?? false),
    );
  }

  return result;
}

function getEmphasisOpacity(emphasis: NodeEmphasis): number {
  switch (emphasis) {
    case 'primary':
      return 1;
    case 'secondary':
      return 0.7;
    case 'muted':
      return 0.35;
    case 'hidden':
      return 0;
  }
}

function findReachableNodes(
  rootId: string,
  edges: GraphEdge[],
  validNodes: Set<string>,
): Set<string> {
  const reachable = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source === current && validNodes.has(edge.target) && !reachable.has(edge.target)) {
        reachable.add(edge.target);
        queue.push(edge.target);
      }
      if (edge.target === current && validNodes.has(edge.source) && !reachable.has(edge.source)) {
        reachable.add(edge.source);
        queue.push(edge.source);
      }
    }
  }
  return reachable;
}
