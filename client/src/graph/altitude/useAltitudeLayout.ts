import { useMemo } from 'react';
import dagre from '@dagrejs/dagre';
import { forceSimulation, forceCenter, forceCollide, forceManyBody, forceLink } from 'd3-force';
import type { Node, Edge } from '@xyflow/react';
import type { LayoutStrategy } from './altitudeTypes';

// ---------------------------------------------------------------------------
// Default node dimensions per layout strategy
// ---------------------------------------------------------------------------

const DIMENSIONS: Record<LayoutStrategy, { width: number; height: number }> = {
  force: { width: 160, height: 160 },
  radial: { width: 180, height: 120 },
  'dagre-TB': { width: 200, height: 90 },
  'dagre-LR': { width: 200, height: 80 },
};

// ---------------------------------------------------------------------------
// Main Layout Hook
// ---------------------------------------------------------------------------

export function useAltitudeLayout(
  nodes: Node[],
  edges: Edge[],
  strategy: LayoutStrategy,
): { nodes: Node[]; edges: Edge[] } {
  return useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges };

    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const validEdges = edges.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

    switch (strategy) {
      case 'force':
        return applyForceLayout(nodes, validEdges);
      case 'radial':
        return applyRadialLayout(nodes, validEdges);
      case 'dagre-TB':
        return applyDagreLayout(nodes, validEdges, 'TB');
      case 'dagre-LR':
        return applyDagreLayout(nodes, validEdges, 'LR');
      default:
        return applyDagreLayout(nodes, validEdges, 'TB');
    }
  }, [nodes, edges, strategy]);
}

// ---------------------------------------------------------------------------
// Force-directed layout (GLOBAL altitude)
// ---------------------------------------------------------------------------

interface ForceNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  index?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

function applyForceLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const dim = DIMENSIONS.force;

  // Create force nodes with bubble size from data
  const forceNodes: ForceNode[] = nodes.map((n, i) => {
    const bubbleSize = ((n.data as Record<string, unknown>).bubbleSize as number) ?? 120;
    return {
      id: n.id,
      x: Math.cos((i / nodes.length) * Math.PI * 2) * 200,
      y: Math.sin((i / nodes.length) * Math.PI * 2) * 200,
      radius: bubbleSize / 2,
    };
  });

  // Create force links
  const forceLinks = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));

  const simulation = forceSimulation<ForceNode>(forceNodes)
    .force('center', forceCenter(0, 0))
    .force(
      'collision',
      forceCollide<ForceNode>().radius((d) => d.radius + 15),
    )
    .force('charge', forceManyBody<ForceNode>().strength(-200))
    .force(
      'link',
      forceLink(forceLinks)
        .id((d) => (d as ForceNode).id)
        .distance(200),
    )
    .stop();

  // Run simulation synchronously
  for (let i = 0; i < 150; i++) simulation.tick();

  const layoutedNodes = nodes.map((node) => {
    const forceNode = forceNodes.find((fn) => fn.id === node.id);
    if (!forceNode) return node;
    return {
      ...node,
      position: {
        x: forceNode.x - dim.width / 2,
        y: forceNode.y - dim.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ---------------------------------------------------------------------------
// Radial layout (INDUSTRY altitude)
// ---------------------------------------------------------------------------

function applyRadialLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const dim = DIMENSIONS.radial;

  if (nodes.length <= 1) {
    return {
      nodes: nodes.map((n, i) => ({
        ...n,
        position: { x: -dim.width / 2, y: i * 150 - dim.height / 2 },
      })),
      edges,
    };
  }

  // First node is the center (parent industry/use case)
  const center = nodes[0];
  const children = nodes.slice(1);

  const layoutedNodes: Node[] = [
    { ...center, position: { x: -dim.width / 2, y: -dim.height / 2 } },
  ];

  // Arrange children in a circle around center
  const baseRadius = 200 + children.length * 10;
  for (let i = 0; i < children.length; i++) {
    const angle = (i / children.length) * Math.PI * 2 - Math.PI / 2;
    const radius = baseRadius;
    layoutedNodes.push({
      ...children[i],
      position: {
        x: radius * Math.cos(angle) - dim.width / 2,
        y: radius * Math.sin(angle) - dim.height / 2,
      },
    });
  }

  return { nodes: layoutedNodes, edges };
}

// ---------------------------------------------------------------------------
// Dagre layout (USE_CASE, STACK, AGENT altitudes)
// ---------------------------------------------------------------------------

function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR',
): { nodes: Node[]; edges: Edge[] } {
  const dim = direction === 'LR' ? DIMENSIONS['dagre-LR'] : DIMENSIONS['dagre-TB'];

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 100,
    edgesep: 30,
    marginx: 40,
    marginy: 40,
  });

  const nodeIdSet = new Set(nodes.map((n) => n.id));

  for (const node of nodes) {
    g.setNode(node.id, { width: dim.width, height: dim.height });
  }

  for (const edge of edges) {
    if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: {
        x: pos.x - dim.width / 2,
        y: pos.y - dim.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
