import { useMemo } from 'react';
import { useViewport } from '@xyflow/react';
import { MACRO_SECTORS, computeClusterAnchor } from '../altitude/macroSectors';
import type { MacroSectorId } from '../altitude/macroSectors';

/**
 * SVG overlay rendering soft ellipse boundaries + labels per macro-sector.
 * Purely decorative — pointer-events: none.
 */
export function SectorBoundaryOverlay({
  anchorMap,
  centerSectorId,
}: {
  anchorMap: Map<MacroSectorId, { x: number; y: number }>;
  centerSectorId: MacroSectorId | null;
}) {
  const viewport = useViewport();
  const nodeCount = 20; // approximate for ring radius
  const ringRadius = 300 + Math.sqrt(nodeCount) * 30;

  const sectors = useMemo(() => {
    return MACRO_SECTORS.map((ms) => {
      // Use provided anchor if available, otherwise compute
      const anchor = anchorMap.get(ms.id) ?? computeClusterAnchor(ms, ringRadius);
      const isCenter = ms.id === centerSectorId;

      return {
        id: ms.id,
        label: ms.label,
        cx: anchor.x,
        cy: anchor.y,
        rx: ms.boundaryRadius * 0.9,
        ry: ms.boundaryRadius * 0.75,
        color: ms.glowColor,
        isCenter,
      };
    });
  }, [anchorMap, centerSectorId, ringRadius]);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: '0 0',
        zIndex: 1,
      }}
    >
      <defs>
        {sectors.map((s) => (
          <radialGradient key={`bg-${s.id}`} id={`sector-bg-${s.id}`}>
            <stop offset="0%" stopColor={s.color} stopOpacity={0.04} />
            <stop offset="70%" stopColor={s.color} stopOpacity={0.02} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>

      {sectors.map((s) => (
        <g key={s.id}>
          {/* Radial gradient fill */}
          <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={`url(#sector-bg-${s.id})`} />

          {/* Boundary stroke */}
          <ellipse
            cx={s.cx}
            cy={s.cy}
            rx={s.rx}
            ry={s.ry}
            fill="none"
            stroke={s.color}
            strokeWidth={1}
            opacity={0.08}
            strokeDasharray={s.isCenter ? 'none' : '6 4'}
          />

          {/* Sector label */}
          <text
            x={s.cx}
            y={s.cy - s.ry - 8}
            textAnchor="middle"
            fill={s.color}
            fontSize={9}
            fontWeight={500}
            opacity={0.5}
          >
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
