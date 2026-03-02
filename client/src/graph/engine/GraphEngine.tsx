import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAltitudeData } from '../altitude/useAltitudeData';
import { useAltitudeLayout } from '../altitude/useAltitudeLayout';
import { useAltitudeController } from '../altitude/useAltitudeController';
import { getNodeTypeFromId } from './nodeTransformers';
import {
  hoverNode,
  deselectAll,
  hideContextMenu,
  setHoveredMacroSector,
} from '../state/graphSlice';
import { getMacroSector } from '../altitude/macroSectors';
import type { MacroSectorId } from '../altitude/macroSectors';

// Custom node imports (detail nodes)
import { IndustryNode } from '../nodes/IndustryNode';
import { UseCaseNode } from '../nodes/UseCaseNode';
import { SkeletonNode } from '../nodes/SkeletonNode';
import { VariantNode } from '../nodes/VariantNode';
import { CertificationNode } from '../nodes/CertificationNode';
import { DeploymentNode } from '../nodes/DeploymentNode';
import { RiskNode } from '../nodes/RiskNode';
import { MarketplaceNode } from '../nodes/MarketplaceNode';

// Cluster node imports (altitude aggregate nodes)
import { IndustryClusterNode } from '../nodes/IndustryClusterNode';
import { UseCaseClusterNode } from '../nodes/UseCaseClusterNode';
import { StackClusterNode } from '../nodes/StackClusterNode';

// Custom edge imports
import { HierarchicalEdge } from '../edges/HierarchicalEdge';
import { SemanticEdge } from '../edges/SemanticEdge';

// Overlay imports
import { TraverseMenu } from '../menus/TraverseMenu';
import { ModeToolbar } from '../modes/ModeToolbar';
import { CommandConsole } from '../console/CommandConsole';
import { SimulationBanner } from '../simulation/SimulationBanner';
import { SystemHealthOrb } from '../widgets/SystemHealthOrb';
import { GlobalMetricsStrip } from '../widgets/GlobalMetricsStrip';
import { SectorBoundaryOverlay } from '../overlays/SectorBoundaryOverlay';
import { SectorBadgeOverlay } from '../overlays/SectorBadgeOverlay';
import { SectorSelectorBar } from '../widgets/SectorSelectorBar';
import { MetricDetailPanel } from '../panels/MetricDetailPanel';
import { AgentBrainOrb } from '../widgets/AgentBrainOrb';
import { AltitudeBreadcrumb } from '../altitude/AltitudeBreadcrumb';
import { AltitudeIndicator } from '../altitude/AltitudeIndicator';
import { ALTITUDE_LABELS } from '../altitude/altitudeTypes';

// Node type registry (detail + cluster nodes)
const nodeTypes = {
  // Detail nodes (STACK & AGENT altitudes)
  industryNode: IndustryNode,
  useCaseNode: UseCaseNode,
  skeletonNode: SkeletonNode,
  variantNode: VariantNode,
  certificationNode: CertificationNode,
  deploymentNode: DeploymentNode,
  riskNode: RiskNode,
  marketplaceNode: MarketplaceNode,
  // Cluster nodes (GLOBAL, INDUSTRY, USE_CASE altitudes)
  industryClusterNode: IndustryClusterNode,
  useCaseClusterNode: UseCaseClusterNode,
  stackClusterNode: StackClusterNode,
};

// Edge type registry
const edgeTypes = {
  hierarchicalEdge: HierarchicalEdge,
  semanticEdge: SemanticEdge,
};

// MiniMap color mapping
const miniMapColorMap: Record<string, string> = {
  industry: '#3b82f6',
  useCase: '#f59e0b',
  skeleton: '#a855f7',
  variant: '#06b6d4',
  certification: '#10b981',
  deployment: '#6366f1',
  risk: '#ef4444',
  marketplace: '#ec4899',
  industryCluster: '#3b82f6',
  useCaseCluster: '#f59e0b',
  stackCluster: '#a855f7',
};

function GraphEngineInner() {
  const dispatch = useAppDispatch();
  const reactFlowInstance = useReactFlow();
  const altitudeCtrl = useAltitudeController();
  const hiddenSectorIds =
    useAppSelector(
      (s) => (s.graph as unknown as { hiddenSectorIds?: MacroSectorId[] }).hiddenSectorIds,
    ) ?? [];
  const focusedSectorId =
    useAppSelector(
      (s) => (s.graph as unknown as { focusedSectorId?: MacroSectorId | null }).focusedSectorId,
    ) ?? null;

  // Altitude-scoped data (replaces useGraphData)
  const {
    nodes: rawNodes,
    edges: rawEdges,
    layoutStrategy,
    nodeCount,
    edgeCount,
    altitude,
  } = useAltitudeData();

  // Compute center sector: the sector with the most nodes in the current weighting
  const centerSectorId = useMemo((): MacroSectorId | null => {
    if (altitude !== 'GLOBAL' || rawNodes.length === 0) return null;

    // Group nodes by macroSectorId and pick the one with highest aggregate bubble size
    const sectorScores = new Map<MacroSectorId, number>();
    for (const node of rawNodes) {
      const data = node.data as Record<string, unknown>;
      const sectorId = (data.macroSectorId as MacroSectorId) ?? 'other';
      const bubbleSize = (data.bubbleSize as number) ?? 100;
      sectorScores.set(sectorId, (sectorScores.get(sectorId) ?? 0) + bubbleSize);
    }

    let topSector: MacroSectorId = 'other';
    let topScore = 0;
    for (const [sid, score] of sectorScores) {
      if (score > topScore) {
        topScore = score;
        topSector = sid;
      }
    }
    return topSector;
  }, [altitude, rawNodes]);

  // Compute triggerKey — layout only recalculates when this changes
  const triggerKey = useMemo(
    () => `${altitude}:${nodeCount}:${centerSectorId ?? ''}:${hiddenSectorIds.join(',')}`,
    [altitude, nodeCount, centerSectorId, hiddenSectorIds],
  );

  // Altitude-aware layout with physics freeze
  const { nodes, edges, anchorMap } = useAltitudeLayout(
    rawNodes,
    rawEdges,
    layoutStrategy,
    triggerKey,
    centerSectorId,
  );

  // Imperative fitView on mount and altitude change only
  const lastAltitudeRef = useRef(altitude);
  const initialFitDoneRef = useRef(false);

  useEffect(() => {
    if (nodes.length === 0) return;

    // Fit on initial render or altitude change
    if (!initialFitDoneRef.current || altitude !== lastAltitudeRef.current) {
      // Small delay to ensure nodes are positioned
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      }, 50);
      initialFitDoneRef.current = true;
      lastAltitudeRef.current = altitude;
      return () => clearTimeout(timer);
    }
  }, [nodes.length, altitude, reactFlowInstance]);

  // Compute visible sector IDs from laid-out nodes
  const visibleSectorIds = useMemo(() => {
    const ids = new Set<MacroSectorId>();
    for (const node of nodes) {
      const data = node.data as Record<string, unknown>;
      const msId = data.macroSectorId as MacroSectorId | undefined;
      if (msId) ids.add(msId);
    }
    return ids;
  }, [nodes]);

  // Auto-zoom on sector focus change
  const lastFocusRef = useRef<MacroSectorId | null>(null);

  useEffect(() => {
    if (focusedSectorId === lastFocusRef.current) return;
    lastFocusRef.current = focusedSectorId;
    if (nodes.length === 0) return;

    if (focusedSectorId === null) {
      // Reset to full view
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
      }, 50);
      return () => clearTimeout(timer);
    }

    // Collect node IDs belonging to focused sector
    const sectorNodeIds = nodes
      .filter((n) => {
        const data = n.data as Record<string, unknown>;
        return (data.macroSectorId as MacroSectorId) === focusedSectorId;
      })
      .map((n) => ({ id: n.id }));

    if (sectorNodeIds.length === 0) return;

    // Animate camera to bounding box of sector nodes
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({
        nodes: sectorNodeIds,
        duration: 400,
        padding: 0.15,
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [focusedSectorId, nodes, reactFlowInstance]);

  // -- Event Handlers (routed through AltitudeController) --
  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      altitudeCtrl.handleNodeClick(node.id, event as unknown as React.MouseEvent);
    },
    [altitudeCtrl],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      altitudeCtrl.handleNodeDoubleClick(node.id);
    },
    [altitudeCtrl],
  );

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      const nodeType = getNodeTypeFromId(node.id);
      if (nodeType) {
        const mouseEvent = event as unknown as React.MouseEvent;
        dispatch({
          type: 'graph/showContextMenu',
          payload: {
            visible: true,
            x: mouseEvent.clientX,
            y: mouseEvent.clientY,
            nodeId: node.id,
            nodeType,
          },
        });
      }
    },
    [dispatch],
  );

  const onNodeMouseEnter: NodeMouseHandler = useCallback(
    (_event, node) => {
      dispatch(hoverNode(node.id));
      // Resolve macro-sector for cluster-wide focus effect
      const data = node.data as Record<string, unknown>;
      const macroSectorId = data.macroSectorId as MacroSectorId | undefined;
      if (macroSectorId) {
        dispatch(setHoveredMacroSector(macroSectorId));
      } else {
        // For non-cluster nodes, derive from sector code
        const sector = data.sector as string | undefined;
        if (sector) {
          const ms = getMacroSector(sector);
          dispatch(setHoveredMacroSector(ms.id));
        }
      }
    },
    [dispatch],
  );

  const onNodeMouseLeave = useCallback(() => {
    dispatch(hoverNode(null));
    dispatch(setHoveredMacroSector(null));
  }, [dispatch]);

  const onPaneClick = useCallback(() => {
    dispatch(deselectAll());
    dispatch(hideContextMenu());
  }, [dispatch]);

  // Handle keyboard escape for altitude ascent
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && altitudeCtrl.canAscend) {
        altitudeCtrl.handleAscend();
      }
    },
    [altitudeCtrl],
  );

  const statsText = `${ALTITUDE_LABELS[altitude]} · ${nodeCount} nodes · ${edgeCount} edges`;

  return (
    <div className="w-full h-full relative" onKeyDown={onKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        minZoom={0.1}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        className="bg-[var(--surface-primary)]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(148,163,184,0.08)"
        />
        <Controls
          position="bottom-left"
          className="!bg-[var(--surface-primary)]/80 !backdrop-blur-xl !border-white/10 !rounded-lg !shadow-lg [&>button]:!bg-transparent [&>button]:!border-white/5 [&>button]:!text-[var(--text-muted)] [&>button:hover]:!bg-white/5"
        />
        <MiniMap
          position="bottom-right"
          className="!bg-[var(--surface-primary)]/80 !backdrop-blur-xl !border-white/10 !rounded-lg"
          nodeColor={(node) => {
            const type = getNodeTypeFromId(node.id);
            return miniMapColorMap[type ?? ''] ?? '#6b7280';
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>

      {/* Sector boundary + badge overlays (GLOBAL only) */}
      {altitude === 'GLOBAL' && (
        <>
          <SectorBoundaryOverlay
            nodes={nodes}
            anchorMap={anchorMap}
            centerSectorId={centerSectorId}
          />
          <SectorBadgeOverlay anchorMap={anchorMap} nodes={nodes} />
        </>
      )}

      {/* Altitude Navigation */}
      <AltitudeBreadcrumb />
      <AltitudeIndicator />

      {/* Simulation Banner (top) */}
      <SimulationBanner />

      {/* Global Metrics Strip (GLOBAL only) */}
      {altitude === 'GLOBAL' && <GlobalMetricsStrip />}

      {/* Mode Toolbar overlay */}
      <ModeToolbar />

      {/* Sector Selector (GLOBAL only) */}
      {altitude === 'GLOBAL' && <SectorSelectorBar visibleSectorIds={visibleSectorIds} />}

      {/* System Health Orb */}
      <SystemHealthOrb />

      {/* Agent Brain Orb (GLOBAL only) */}
      {altitude === 'GLOBAL' && <AgentBrainOrb />}

      {/* Traverse Menu */}
      <TraverseMenu />

      {/* Command Console (bottom) */}
      <CommandConsole />

      {/* Metric Detail Panel (GLOBAL only) */}
      {altitude === 'GLOBAL' && <MetricDetailPanel />}

      {/* Stats bar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-[var(--surface-primary)]/60 backdrop-blur-md border border-white/5 text-[10px] text-[var(--text-muted)]">
        {statsText}
      </div>
    </div>
  );
}

export function GraphEngine() {
  return (
    <ReactFlowProvider>
      <GraphEngineInner />
    </ReactFlowProvider>
  );
}
