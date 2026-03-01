import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { useAppSelector } from '../../store/hooks';
import type { AltitudeLevel, LayoutStrategy } from './altitudeTypes';
import { ALTITUDE_CONFIGS } from './altitudeTypes';
import {
  aggregateIndustryClusters,
  aggregateUseCaseClusters,
  aggregateStackClusters,
} from './aggregators';
import { buildAltitudeEdges } from './altitudeEdgeBuilders';
import {
  industryToNode,
  useCaseToNode,
  skeletonToNode,
  variantToNode,
  certificationToNode,
  deploymentToNode,
  riskToNode,
  marketplaceToNode,
} from '../engine/nodeTransformers';
import { scoreToColor } from '../utils/performanceUtils';

// ---------------------------------------------------------------------------
// Hook Return Type
// ---------------------------------------------------------------------------

export interface AltitudeDataResult {
  nodes: Node[];
  edges: Edge[];
  layoutStrategy: LayoutStrategy;
  nodeCount: number;
  edgeCount: number;
  altitude: AltitudeLevel;
}

// ---------------------------------------------------------------------------
// Main Hook
// ---------------------------------------------------------------------------

export function useAltitudeData(): AltitudeDataResult {
  const { currentAltitude, altitudeContext } = useAppSelector((s) => s.graph);
  const { industries, useCases, skeletons, variants, intelligence } = useAppSelector(
    (s) => s.registry,
  );
  const { riskAnalysis } = useAppSelector((s) => s.compliance);
  const { marketplace } = useAppSelector((s) => s.orchestrator);
  const ontologyRelationships = useAppSelector((s) => s.graph.ontology.relationships);

  const config = ALTITUDE_CONFIGS[currentAltitude];

  const result = useMemo((): { nodes: Node[]; edges: Edge[] } => {
    switch (currentAltitude) {
      case 'GLOBAL':
        return buildGlobalNodes();
      case 'INDUSTRY':
        return buildIndustryNodes();
      case 'USE_CASE':
        return buildUseCaseNodes();
      case 'STACK':
        return buildStackNodes();
      case 'AGENT':
        return buildAgentNodes();
      default:
        return { nodes: [], edges: [] };
    }

    // -----------------------------------------------------------------
    // GLOBAL: Industry cluster bubbles
    // -----------------------------------------------------------------
    function buildGlobalNodes(): { nodes: Node[]; edges: Edge[] } {
      const clusters = aggregateIndustryClusters(
        industries,
        useCases,
        variants,
        riskAnalysis ?? [],
      );

      const nodes: Node[] = clusters.map((c) => ({
        id: `indcluster-${c.code}`,
        type: 'industryClusterNode',
        position: { x: 0, y: 0 },
        data: {
          nodeType: 'industryCluster',
          label: c.title,
          sublabel: `NAICS ${c.code}`,
          code: c.code,
          title: c.title,
          sector: c.sector,
          useCaseCount: c.useCaseCount,
          stackCount: c.stackCount,
          agentCount: c.agentCount,
          metrics: c.metrics,
          emphasis: 'primary',
          selected: false,
          opacity: 1,
          // Size/color hints for the node component
          bubbleSize: Math.max(80, Math.min(200, 80 + c.useCaseCount * 8)),
          riskColor: scoreToColor(100 - c.metrics.riskIndex),
        },
      }));

      const edges = buildAltitudeEdges('GLOBAL', { industryClusters: clusters });
      return { nodes, edges };
    }

    // -----------------------------------------------------------------
    // INDUSTRY: Selected industry + use case cluster bubbles
    // -----------------------------------------------------------------
    function buildIndustryNodes(): { nodes: Node[]; edges: Edge[] } {
      const code = altitudeContext.industryCode;
      if (!code) return { nodes: [], edges: [] };

      const industry = industries.find((i) => i.code === code);
      if (!industry) return { nodes: [], edges: [] };

      // Use cases in this industry
      const industryUseCases = useCases.filter(
        (uc) => uc.industryScope && uc.industryScope.includes(code),
      );

      // Variants in this industry
      const industryVariants = variants.filter((v) => v.industryCode === code);
      const certifiedCount = industryVariants.filter(
        (v) => v.certificationStatus === 'certified',
      ).length;

      // Build center industry node
      const industryNode = industryToNode(
        industry,
        industryUseCases.length,
        industryVariants.length,
        certifiedCount,
      );

      // Build use case clusters
      const ucClusters = aggregateUseCaseClusters(
        industryUseCases,
        skeletons,
        industryVariants,
        ontologyRelationships.map((r) => ({
          subjectId: r.subjectId,
          objectId: r.objectId,
          relationshipType: r.relationshipType,
        })),
      );

      const ucClusterNodes: Node[] = ucClusters.map((uc) => ({
        id: `uccluster-${uc.useCaseId}`,
        type: 'useCaseClusterNode',
        position: { x: 0, y: 0 },
        data: {
          nodeType: 'useCaseCluster',
          label:
            uc.outcomeStatement.length > 50
              ? uc.outcomeStatement.slice(0, 47) + '...'
              : uc.outcomeStatement,
          sublabel: uc.monetizationType?.replace(/_/g, ' ') ?? '',
          useCaseId: uc.useCaseId,
          outcomeStatement: uc.outcomeStatement,
          monetizationType: uc.monetizationType,
          urgencyScore: uc.urgencyScore,
          stackCount: uc.stackCount,
          agentCount: uc.agentCount,
          deploymentCount: uc.deploymentCount,
          metrics: uc.metrics,
          emphasis: 'primary',
          selected: false,
          opacity: 1,
        },
      }));

      const edges = buildAltitudeEdges('INDUSTRY', {
        industryCode: code,
        useCaseClusters: ucClusters,
      });

      return { nodes: [industryNode, ...ucClusterNodes], edges };
    }

    // -----------------------------------------------------------------
    // USE_CASE: Selected use case + stack cluster bubbles
    // -----------------------------------------------------------------
    function buildUseCaseNodes(): { nodes: Node[]; edges: Edge[] } {
      const ucId = altitudeContext.useCaseId;
      if (!ucId) return { nodes: [], edges: [] };

      const useCase = useCases.find((uc) => uc.id === ucId);
      if (!useCase) return { nodes: [], edges: [] };

      // Find linked skeletons via ontology SOLVES
      const linkedSkeletonIds = ontologyRelationships
        .filter(
          (r) => r.relationshipType === 'SOLVES' && (r.subjectId === ucId || r.objectId === ucId),
        )
        .map((r) => (r.subjectId === ucId ? r.objectId : r.subjectId));

      const linkedSkeletons = skeletons.filter((sk) => linkedSkeletonIds.includes(sk.id));

      // If no ontology links, fall back to all skeletons (for demo data)
      const effectiveSkeletons = linkedSkeletons.length > 0 ? linkedSkeletons : skeletons;

      // Variants for those skeletons
      const relevantVariants = variants.filter((v) =>
        effectiveSkeletons.some((sk) => sk.id === v.skeletonId),
      );

      // Build center use case node
      const ucNode = useCaseToNode(useCase);

      // Build stack clusters
      const stClusters = aggregateStackClusters(effectiveSkeletons, relevantVariants);

      const stClusterNodes: Node[] = stClusters.map((sk) => ({
        id: `skcluster-${sk.skeletonId}`,
        type: 'stackClusterNode',
        position: { x: 0, y: 0 },
        data: {
          nodeType: 'stackCluster',
          label: sk.name,
          sublabel: sk.specializationType?.replace(/_/g, ' ') ?? '',
          skeletonId: sk.skeletonId,
          name: sk.name,
          specializationType: sk.specializationType,
          riskLevel: sk.riskLevel,
          variantCount: sk.variantCount,
          metrics: sk.metrics,
          emphasis: 'primary',
          selected: false,
          opacity: 1,
        },
      }));

      const edges = buildAltitudeEdges('USE_CASE', {
        useCaseId: ucId,
        stackClusters: stClusters,
      });

      return { nodes: [ucNode, ...stClusterNodes], edges };
    }

    // -----------------------------------------------------------------
    // STACK: Skeleton + individual variants + certs + deployments
    // -----------------------------------------------------------------
    function buildStackNodes(): { nodes: Node[]; edges: Edge[] } {
      const skId = altitudeContext.skeletonId;
      if (!skId) return { nodes: [], edges: [] };

      const skeleton = skeletons.find((sk) => sk.id === skId);
      if (!skeleton) return { nodes: [], edges: [] };

      const skVariants = variants.filter((v) => v.skeletonId === skId);
      const skeletonNode = skeletonToNode(skeleton, skVariants.length);

      const nodes: Node[] = [skeletonNode];

      for (const v of skVariants) {
        nodes.push(variantToNode(v, skeleton.name));

        for (const cert of v.certifications ?? []) {
          nodes.push(certificationToNode(cert));
        }
        for (const dep of v.deployments ?? []) {
          nodes.push(deploymentToNode(dep));
        }
      }

      const edges = buildAltitudeEdges('STACK', {
        skeletonId: skId,
        variants: skVariants,
      });

      return { nodes, edges };
    }

    // -----------------------------------------------------------------
    // AGENT: Variant + certs + deploys + risks + marketplace + siblings
    // -----------------------------------------------------------------
    function buildAgentNodes(): { nodes: Node[]; edges: Edge[] } {
      const vId = altitudeContext.variantId;
      if (!vId) return { nodes: [], edges: [] };

      const variant = variants.find((v) => v.id === vId);
      if (!variant) return { nodes: [], edges: [] };

      const skeleton = skeletons.find((sk) => sk.id === variant.skeletonId);
      const variantNode = variantToNode(variant, skeleton?.name);

      const nodes: Node[] = [variantNode];

      // Certifications
      for (const cert of variant.certifications ?? []) {
        nodes.push(certificationToNode(cert));
      }

      // Deployments
      for (const dep of variant.deployments ?? []) {
        nodes.push(deploymentToNode(dep));
      }

      // Risks (all — could be scoped by variant in the future)
      for (const risk of riskAnalysis ?? []) {
        nodes.push(riskToNode(risk));
      }

      // Marketplace submissions for this variant
      const variantMarketplace = (marketplace ?? []).filter((m) => m.agentVariantId === vId);
      for (const m of variantMarketplace) {
        nodes.push(marketplaceToNode(m));
      }

      // Cross-stack siblings (limited to 5)
      const siblings = variants
        .filter((v) => v.skeletonId === variant.skeletonId && v.id !== vId)
        .slice(0, 5);
      for (const sib of siblings) {
        nodes.push(variantToNode(sib, skeleton?.name, 'secondary'));
      }

      const edges = buildAltitudeEdges('AGENT', {
        variantId: vId,
        variants: [...(siblings ? [variant, ...siblings] : [variant])],
      });

      return { nodes, edges };
    }
  }, [
    currentAltitude,
    altitudeContext,
    industries,
    useCases,
    skeletons,
    variants,
    intelligence,
    riskAnalysis,
    marketplace,
    ontologyRelationships,
  ]);

  return {
    nodes: result.nodes,
    edges: result.edges,
    layoutStrategy: config.layoutStrategy,
    nodeCount: result.nodes.length,
    edgeCount: result.edges.length,
    altitude: currentAltitude,
  };
}
