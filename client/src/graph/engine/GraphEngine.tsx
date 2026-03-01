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

import { useAppDispatch } from '../../store/hooks';
import { useGraphData } from './useGraphData';
import { useGraphLayout } from './useGraphLayout';
import { useDrillController } from '../controller/useDrillController';
import { getNodeTypeFromId } from './nodeTransformers';
import { hoverNode } from '../state/graphSlice';

// Custom node imports
import { IndustryNode } from '../nodes/IndustryNode';
import { UseCaseNode } from '../nodes/UseCaseNode';
import { SkeletonNode } from '../nodes/SkeletonNode';
import { VariantNode } from '../nodes/VariantNode';
import { CertificationNode } from '../nodes/CertificationNode';
import { DeploymentNode } from '../nodes/DeploymentNode';
import { RiskNode } from '../nodes/RiskNode';
import { MarketplaceNode } from '../nodes/MarketplaceNode';

// Custom edge imports
import { HierarchicalEdge } from '../edges/HierarchicalEdge';
import { SemanticEdge } from '../edges/SemanticEdge';

// Overlay imports
import { TraverseMenu } from '../menus/TraverseMenu';
import { ModeToolbar } from '../modes/ModeToolbar';

// Custom node type registry
const nodeTypes = {
  industryNode: IndustryNode,
  useCaseNode: UseCaseNode,
  skeletonNode: SkeletonNode,
  variantNode: VariantNode,
  certificationNode: CertificationNode,
  deploymentNode: DeploymentNode,
  riskNode: RiskNode,
  marketplaceNode: MarketplaceNode,
};

// Custom edge type registry
const edgeTypes = {
  hierarchicalEdge: HierarchicalEdge,
  semanticEdge: SemanticEdge,
};

function GraphEngineInner() {
  const dispatch = useAppDispatch();
  const controller = useDrillController();
  const {
    nodes: rawNodes,
    edges: rawEdges,
    layoutDirection,
    nodeCount,
    edgeCount,
  } = useGraphData();
  const { nodes, edges } = useGraphLayout(rawNodes, rawEdges, layoutDirection);

  // -- Event Handlers (routed through DrillController) --
  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      const nodeType = getNodeTypeFromId(node.id);
      if (nodeType) {
        controller.handleNodeClick(node.id, nodeType, event as unknown as React.MouseEvent);
      }
    },
    [controller],
  );

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      controller.handleNodeDoubleClick(node.id);
    },
    [controller],
  );

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      const nodeType = getNodeTypeFromId(node.id);
      if (nodeType) {
        controller.handleNodeContextMenu(node.id, nodeType, event as unknown as React.MouseEvent);
      }
    },
    [controller],
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
    controller.handlePaneClick();
  }, [controller]);

  // -- Stats overlay --
  const statsText = `${nodeCount} nodes · ${edgeCount} edges`;

  return (
    <div className="w-full h-full relative">
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
            const colorMap: Record<string, string> = {
              industry: '#3b82f6',
              useCase: '#f59e0b',
              skeleton: '#a855f7',
              variant: '#06b6d4',
              certification: '#10b981',
              deployment: '#6366f1',
              risk: '#ef4444',
              marketplace: '#ec4899',
            };
            return colorMap[type ?? ''] ?? '#6b7280';
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>

      {/* Mode Toolbar overlay */}
      <ModeToolbar />

      {/* Traverse Menu */}
      <TraverseMenu />

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
