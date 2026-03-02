import { useRef, useMemo } from 'react';
import dagre from '@dagrejs/dagre';
import { forceSimulation, forceCollide, forceManyBody, forceX, forceY } from 'd3-force';
import type { Node, Edge } from '@xyflow/react';
import type { LayoutStrategy } from './altitudeTypes';
import { MACRO_SECTORS, computeClusterAnchor } from './macroSectors';
import type { MacroSectorId } from './macroSectors';

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
// Layout result type (includes anchorMap for overlays)
// ---------------------------------------------------------------------------

export interface AltitudeLayoutResult {
  nodes: Node[];
  edges: Edge[];
  anchorMap: Map<MacroSectorId, { x: number; y: number }>;
}

// ---------------------------------------------------------------------------
// Main Layout Hook — useRef-cached, only re-runs when triggerKey changes
// ---------------------------------------------------------------------------

export function useAltitudeLayout(
  nodes: Node[],
  edges: Edge[],
  strategy: LayoutStrategy,
  triggerKey: string,
  centerSectorId?: MacroSectorId | null,
): AltitudeLayoutResult {
  const cacheRef = useRef<{ key: string; result: AltitudeLayoutResult }>({
    key: '',
    result: { nodes: [], edges: [], anchorMap: new Map() },
  });

  // Non-force strategies don't need caching since they're deterministic and fast
  const nonForceResult = useMemo(() => {
    if (strategy === 'force') return null;
    if (nodes.length === 0)
      return { nodes: [], edges, anchorMap: new Map<MacroSectorId, { x: number; y: number }>() };

    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const validEdges = edges.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

    switch (strategy) {
      case 'radial':
        return {
          ...applyRadialLayout(nodes, validEdges),
          anchorMap: new Map<MacroSectorId, { x: number; y: number }>(),
        };
      case 'dagre-TB':
        return {
          ...applyDagreLayout(nodes, validEdges, 'TB'),
          anchorMap: new Map<MacroSectorId, { x: number; y: number }>(),
        };
      case 'dagre-LR':
        return {
          ...applyDagreLayout(nodes, validEdges, 'LR'),
          anchorMap: new Map<MacroSectorId, { x: number; y: number }>(),
        };
      default:
        return {
          ...applyDagreLayout(nodes, validEdges, 'TB'),
          anchorMap: new Map<MacroSectorId, { x: number; y: number }>(),
        };
    }
  }, [nodes, edges, strategy]);

  if (nonForceResult) return nonForceResult;

  // Force layout: only recompute when triggerKey changes
  if (cacheRef.current.key === triggerKey && cacheRef.current.result.nodes.length > 0) {
    return cacheRef.current.result;
  }

  if (nodes.length === 0) {
    const empty: AltitudeLayoutResult = { nodes: [], edges, anchorMap: new Map() };
    cacheRef.current = { key: triggerKey, result: empty };
    return empty;
  }

  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

  const result = applyForceLayout(nodes, validEdges, centerSectorId ?? null);
  cacheRef.current = { key: triggerKey, result };
  return result;
}

// ---------------------------------------------------------------------------
// Deterministic hash for jitter (replaces Math.random())
// ---------------------------------------------------------------------------

function deterministicJitter(index: number): number {
  return 20 + (((index * 31337) % 1000) / 1000) * 40;
}

// ---------------------------------------------------------------------------
// Force-directed layout (GLOBAL altitude) — Galaxy Core Model
// ---------------------------------------------------------------------------

interface ForceNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  targetX: number;
  targetY: number;
  sectorCode: string;
  index?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

function applyForceLayout(
  nodes: Node[],
  edges: Edge[],
  centerSectorId: MacroSectorId | null,
): AltitudeLayoutResult {
  const dim = DIMENSIONS.force;

  // Compute ring radius based on node count — more nodes = wider ring
  const ringRadius = 300 + Math.sqrt(nodes.length) * 30;

  // Build macro-sector anchor map — Galaxy Core: center sector at {0,0}
  const sectorAnchorMap = new Map<MacroSectorId, { x: number; y: number }>();
  const codeAnchorMap = new Map<string, { x: number; y: number; gravity: number }>();

  for (const ms of MACRO_SECTORS) {
    let anchor: { x: number; y: number };
    let gravity: number;

    if (centerSectorId && ms.id === centerSectorId) {
      // Galaxy Core: center sector occupies origin with strong gravity
      anchor = { x: 0, y: 0 };
      gravity = 0.12;
    } else {
      anchor = computeClusterAnchor(ms, ringRadius);
      gravity = ms.gravityStrength;
    }

    sectorAnchorMap.set(ms.id, anchor);
    for (const code of ms.sectorCodes) {
      codeAnchorMap.set(code, { ...anchor, gravity });
    }
  }

  // Create force nodes positioned near their macro-sector anchor
  const forceNodes: ForceNode[] = nodes.map((n, i) => {
    const data = n.data as Record<string, unknown>;
    const bubbleSize = (data.bubbleSize as number) ?? 120;
    const sector = (data.sector as string) ?? '';
    const anchor = codeAnchorMap.get(sector) ?? { x: 0, y: 0, gravity: 0.04 };

    // Deterministic jitter — same layout for same node set
    const jitterAngle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 + i * 0.618;
    const jitterRadius = deterministicJitter(i);

    return {
      id: n.id,
      x: anchor.x + Math.cos(jitterAngle) * jitterRadius,
      y: anchor.y + Math.sin(jitterAngle) * jitterRadius,
      radius: bubbleSize / 2,
      targetX: anchor.x,
      targetY: anchor.y,
      sectorCode: sector,
    };
  });

  const simulation = forceSimulation<ForceNode>(forceNodes)
    // Cluster gravity: pull each node toward its macro-sector anchor
    .force(
      'x',
      forceX<ForceNode>()
        .x((d) => d.targetX)
        .strength((d) => codeAnchorMap.get(d.sectorCode)?.gravity ?? 0.04),
    )
    .force(
      'y',
      forceY<ForceNode>()
        .y((d) => d.targetY)
        .strength((d) => codeAnchorMap.get(d.sectorCode)?.gravity ?? 0.04),
    )
    // Collision: prevent overlap within and between clusters
    .force(
      'collision',
      forceCollide<ForceNode>()
        .radius((d) => d.radius + 12)
        .strength(0.8),
    )
    // Charge: weaker repulsion since forceX/Y handles positioning
    .force('charge', forceManyBody<ForceNode>().strength(-80))
    .stop();

  // Run simulation synchronously — 200 ticks for convergence
  for (let i = 0; i < 200; i++) simulation.tick();

  // O(1) lookup instead of .find()
  const forceNodeMap = new Map<string, ForceNode>();
  for (const fn of forceNodes) {
    forceNodeMap.set(fn.id, fn);
  }

  const layoutedNodes = nodes.map((node) => {
    const forceNode = forceNodeMap.get(node.id);
    if (!forceNode) return node;
    return {
      ...node,
      position: {
        x: forceNode.x - dim.width / 2,
        y: forceNode.y - dim.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges, anchorMap: sectorAnchorMap };
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
