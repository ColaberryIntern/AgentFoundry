import { useMemo } from 'react';
import dagre from '@dagrejs/dagre';
import type { GraphNode, GraphEdge } from '../types/graphTypes';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

export function useGraphLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: 'TB' | 'LR' | 'radial' = 'TB',
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges };

    // For radial layout, use TB dagre then apply polar transform
    const dagreDirection = direction === 'radial' ? 'TB' : direction;

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: dagreDirection,
      nodesep: 60,
      ranksep: 100,
      edgesep: 30,
      marginx: 40,
      marginy: 40,
    });

    // Only add nodes that exist to dagre
    const nodeIdSet = new Set(nodes.map((n) => n.id));
    for (const node of nodes) {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }

    // Only add edges whose source and target exist
    for (const edge of edges) {
      if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
        g.setEdge(edge.source, edge.target);
      }
    }

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      if (!nodeWithPosition) return node;

      let x = nodeWithPosition.x - NODE_WIDTH / 2;
      let y = nodeWithPosition.y - NODE_HEIGHT / 2;

      // Radial transform: convert linear layout to polar coordinates
      if (direction === 'radial') {
        const centerX = (g.graph().width ?? 600) / 2;
        const centerY = (g.graph().height ?? 600) / 2;
        const dx = nodeWithPosition.x - centerX;
        const dy = nodeWithPosition.y - centerY;
        const angle = Math.atan2(dy, dx);
        const radius = Math.sqrt(dx * dx + dy * dy) * 0.8;
        x = centerX + radius * Math.cos(angle) - NODE_WIDTH / 2;
        y = centerY + radius * Math.sin(angle) - NODE_HEIGHT / 2;
      }

      return { ...node, position: { x, y } };
    });

    // Filter edges to only include those with valid source/target nodes
    const validEdges = edges.filter(
      (edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target),
    );

    return { nodes: layoutedNodes, edges: validEdges };
  }, [nodes, edges, direction]);
}
