import { useMemo } from 'react';
import { useViewport } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { MACRO_SECTORS, computeClusterAnchor } from '../altitude/macroSectors';
import type { MacroSectorId } from '../altitude/macroSectors';
import {
  convexHull,
  expandHull,
  smoothHullPath,
  circleFallbackPath,
  computeBoundingBox,
} from '../utils/hullGeometry';

// Force layout centers nodes at position.x + 80, position.y + 80 (dim.width/2)
const NODE_HALF = 80;
const HULL_PADDING = 40;
const CATMULL_TENSION = 0.5;

interface SectorHull {
  id: MacroSectorId;
  label: string;
  pathD: string;
  centerX: number;
  labelY: number;
  color: string;
  isCenter: boolean;
}

/**
 * Convex hull boundaries + bold sector labels per macro-sector.
 * Hull shapes render in SVG at z-index 1 (behind nodes).
 * Labels render as HTML at z-index 10 (above nodes) for guaranteed visibility.
 */
export function SectorBoundaryOverlay({
  nodes,
  anchorMap,
  centerSectorId,
}: {
  nodes: Node[];
  anchorMap: Map<MacroSectorId, { x: number; y: number }>;
  centerSectorId: MacroSectorId | null;
}) {
  const viewport = useViewport();
  const ringRadius = 300 + Math.sqrt(nodes.length) * 30;

  const sectorHulls = useMemo((): SectorHull[] => {
    // Group node centers by macroSectorId
    const sectorPoints = new Map<MacroSectorId, { x: number; y: number }[]>();
    for (const node of nodes) {
      const data = node.data as Record<string, unknown>;
      const sectorId = (data.macroSectorId as MacroSectorId) ?? 'other';
      const cx = node.position.x + NODE_HALF;
      const cy = node.position.y + NODE_HALF;
      if (!sectorPoints.has(sectorId)) sectorPoints.set(sectorId, []);
      sectorPoints.get(sectorId)!.push({ x: cx, y: cy });
    }

    return MACRO_SECTORS.map((ms) => {
      const points = sectorPoints.get(ms.id) ?? [];
      const anchor = anchorMap.get(ms.id) ?? computeClusterAnchor(ms, ringRadius);
      const isCenter = ms.id === centerSectorId;

      let pathD: string;
      let centerX: number;
      let labelY: number;

      if (points.length === 0) {
        pathD = circleFallbackPath(anchor, 60);
        centerX = anchor.x;
        labelY = anchor.y - 60 - 16;
      } else if (points.length === 1) {
        const r = HULL_PADDING + 40;
        pathD = circleFallbackPath(points[0], r);
        centerX = points[0].x;
        labelY = points[0].y - r - 16;
      } else {
        const hull = convexHull(points);
        const expanded = expandHull(hull, HULL_PADDING);
        pathD = smoothHullPath(expanded, CATMULL_TENSION);
        const bbox = computeBoundingBox(expanded);
        centerX = (bbox.minX + bbox.maxX) / 2;
        labelY = bbox.minY - 16;
      }

      return {
        id: ms.id,
        label: ms.label,
        pathD,
        centerX,
        labelY,
        color: ms.glowColor,
        isCenter,
      };
    }).filter((s) => {
      const points = sectorPoints.get(s.id as MacroSectorId);
      return points && points.length > 0;
    });
  }, [nodes, anchorMap, centerSectorId, ringRadius]);

  return (
    <>
      {/* Hull shapes — SVG behind nodes (z-index 1) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
          zIndex: 1,
        }}
      >
        <defs>
          {sectorHulls.map((s) => (
            <radialGradient key={`hull-bg-${s.id}`} id={`hull-bg-${s.id}`}>
              <stop offset="0%" stopColor={s.color} stopOpacity={0.06} />
              <stop offset="60%" stopColor={s.color} stopOpacity={0.04} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.0} />
            </radialGradient>
          ))}
        </defs>

        {sectorHulls.map((s) => (
          <g key={s.id}>
            <path d={s.pathD} fill={`url(#hull-bg-${s.id})`} />
            <path
              d={s.pathD}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
              opacity={0.12}
              strokeDasharray={s.isCenter ? 'none' : '6 4'}
            />
          </g>
        ))}
      </svg>

      {/* Sector labels — HTML above nodes (z-index 10) */}
      <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 10 }}>
        {sectorHulls.map((s) => {
          // Convert graph coordinates to screen coordinates
          const screenX = viewport.x + s.centerX * viewport.zoom;
          const screenY = viewport.y + s.labelY * viewport.zoom;

          return (
            <div
              key={`label-${s.id}`}
              className="absolute whitespace-nowrap"
              style={{
                left: screenX,
                top: screenY,
                transform: 'translate(-50%, -100%)',
                fontSize: 16,
                fontWeight: 700,
                color: s.color,
                opacity: 0.85,
                textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.3)',
                letterSpacing: '0.02em',
              }}
            >
              {s.label}
            </div>
          );
        })}
      </div>
    </>
  );
}
