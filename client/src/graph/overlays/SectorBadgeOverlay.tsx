import { useMemo } from 'react';
import { useViewport } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { MACRO_SECTORS } from '../altitude/macroSectors';
import type { MacroSectorId } from '../altitude/macroSectors';
import { computeBoundingBox } from '../utils/hullGeometry';

interface SectorBadge {
  id: MacroSectorId;
  cx: number;
  cy: number;
  industryCount: number;
  avgRisk: number;
  certPercent: number;
  color: string;
}

const NODE_HALF = 80;

/**
 * Per-sector summary badge overlay. Displays glassmorphic pills below each
 * sector cluster with per-sector aggregate metrics computed from node data.
 */
export function SectorBadgeOverlay({
  nodes,
}: {
  anchorMap: Map<MacroSectorId, { x: number; y: number }>;
  nodes: Node[];
}) {
  const viewport = useViewport();

  const badges = useMemo((): SectorBadge[] => {
    // Group nodes by macroSectorId and compute per-sector metrics
    const sectorData = new Map<
      MacroSectorId,
      { count: number; totalRisk: number; totalCert: number; points: { x: number; y: number }[] }
    >();

    for (const node of nodes) {
      const data = node.data as Record<string, unknown>;
      const sectorId = (data.macroSectorId as MacroSectorId) ?? 'other';
      const metrics = data.metrics as { riskIndex: number; certHealthPercent: number } | undefined;

      const existing = sectorData.get(sectorId) ?? {
        count: 0,
        totalRisk: 0,
        totalCert: 0,
        points: [],
      };
      existing.count += 1;
      existing.totalRisk += metrics?.riskIndex ?? 0;
      existing.totalCert += metrics?.certHealthPercent ?? 0;
      existing.points.push({
        x: node.position.x + NODE_HALF,
        y: node.position.y + NODE_HALF,
      });
      sectorData.set(sectorId, existing);
    }

    return MACRO_SECTORS.filter((ms) => (sectorData.get(ms.id)?.count ?? 0) > 0).map((ms) => {
      const sd = sectorData.get(ms.id)!;
      // Position badge below the cluster bounding box
      const bbox = computeBoundingBox(sd.points);
      const cx = (bbox.minX + bbox.maxX) / 2;
      const cy = bbox.maxY + 30;

      return {
        id: ms.id,
        cx,
        cy,
        industryCount: sd.count,
        avgRisk: sd.count > 0 ? Math.round(sd.totalRisk / sd.count) : 0,
        certPercent: sd.count > 0 ? Math.round(sd.totalCert / sd.count) : 0,
        color: ms.glowColor,
      };
    });
  }, [nodes]);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: '0 0',
        zIndex: 2,
      }}
    >
      {badges.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            left: b.cx - 50,
            top: b.cy,
            width: 100,
          }}
        >
          <div className="bg-[var(--surface-primary)]/70 backdrop-blur-sm border border-white/5 rounded-md px-2 py-1 text-center">
            <div className="flex items-center justify-center gap-2 text-[8px]">
              <span style={{ color: b.color }}>{b.industryCount} ind</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-red-400">{b.avgRisk}r</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-green-400">{b.certPercent}%c</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
