import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
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
  setWeightingMode,
  toggleHeatmap,
} from '../state/graphSlice';
import type { WeightingMode } from '../altitude/weightingModes';
import { WEIGHTING_CONFIGS } from '../altitude/weightingModes';

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
import { HeatmapOverlay } from '../overlays/HeatmapOverlay';
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

// Weighting mode toggle — only shown at GLOBAL altitude
function WeightingModeToggle({
  current,
  onSelect,
}: {
  current: WeightingMode;
  onSelect: (mode: WeightingMode) => void;
}) {
  const modes = Object.values(WEIGHTING_CONFIGS);
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--surface-primary)]/80 backdrop-blur-md border border-white/5">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          title={m.description}
          className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
            current === m.id
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'text-[var(--text-muted)] hover:bg-white/5 border border-transparent'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function GraphEngineInner() {
  const dispatch = useAppDispatch();
  const altitudeCtrl = useAltitudeController();
  const weightingMode =
    useAppSelector(
      (s) => (s.graph as unknown as { weightingMode?: WeightingMode }).weightingMode,
    ) ?? 'coverage';
  const heatmapEnabled =
    useAppSelector((s) => (s.graph as unknown as { heatmapEnabled?: boolean }).heatmapEnabled) ??
    false;

  // Altitude-scoped data (replaces useGraphData)
  const {
    nodes: rawNodes,
    edges: rawEdges,
    layoutStrategy,
    nodeCount,
    edgeCount,
    altitude,
  } = useAltitudeData();

  // Altitude-aware layout (replaces useGraphLayout)
  const { nodes, edges } = useAltitudeLayout(rawNodes, rawEdges, layoutStrategy);

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
    },
    [dispatch],
  );

  const onNodeMouseLeave = useCallback(() => {
    dispatch(hoverNode(null));
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
        fitView
        fitViewOptions={{ padding: 0.2 }}
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

      {/* Heatmap overlay (behind nodes, GLOBAL only) */}
      {altitude === 'GLOBAL' && heatmapEnabled && <HeatmapOverlay />}

      {/* Altitude Navigation */}
      <AltitudeBreadcrumb />
      <AltitudeIndicator />

      {/* Simulation Banner (top) */}
      <SimulationBanner />

      {/* Global Metrics Strip (GLOBAL only) */}
      {altitude === 'GLOBAL' && <GlobalMetricsStrip />}

      {/* Mode Toolbar overlay */}
      <ModeToolbar />

      {/* Weighting Mode + Heatmap Toggle (GLOBAL only) */}
      {altitude === 'GLOBAL' && (
        <div className="absolute top-20 left-4 z-30 flex flex-col gap-2">
          <WeightingModeToggle
            current={weightingMode}
            onSelect={(mode) => dispatch(setWeightingMode(mode))}
          />
          <button
            onClick={() => dispatch(toggleHeatmap())}
            className={`self-start px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors border ${
              heatmapEnabled
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'text-[var(--text-muted)] hover:bg-white/5 border-white/5'
            } bg-[var(--surface-primary)]/80 backdrop-blur-md`}
          >
            Heatmap {heatmapEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {/* System Health Orb */}
      <SystemHealthOrb />

      {/* Traverse Menu */}
      <TraverseMenu />

      {/* Command Console (bottom) */}
      <CommandConsole />

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
