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
  ucTotal: number;
  avgRisk: number;
  avgCert: number;
  avgCoverage: number;
  avgRevenue: number;
  avgVolatility: number;
  color: string;
}

const NODE_HALF = 80;

/**
 * Per-sector summary badge overlay. Displays glassmorphic pills below each
 * sector cluster with 6 weighted-average KPI metrics computed from node data.
 * Weights are proportional to useCaseCount per industry.
 */
export function SectorBadgeOverlay({
  nodes,
}: {
  anchorMap: Map<MacroSectorId, { x: number; y: number }>;
  nodes: Node[];
}) {
  const viewport = useViewport();

  const badges = useMemo((): SectorBadge[] => {
    // Group nodes by macroSectorId and compute weighted-average metrics
    const sectorData = new Map<
      MacroSectorId,
      {
        count: number;
        ucTotal: number;
        totalWeight: number;
        weightedRisk: number;
        weightedCert: number;
        weightedCoverage: number;
        weightedRevenue: number;
        weightedVolatility: number;
        points: { x: number; y: number }[];
      }
    >();

    for (const node of nodes) {
      const data = node.data as Record<string, unknown>;
      const sectorId = (data.macroSectorId as MacroSectorId) ?? 'other';
      const metrics = data.metrics as
        | {
            riskIndex: number;
            certHealthPercent: number;
            coveragePercent: number;
            volatilityScore: number;
          }
        | undefined;
      const useCaseCount = (data.useCaseCount as number) ?? 0;
      const revenueScore = (data.revenueScore as number) ?? 0;
      const weight = useCaseCount || 1; // fallback weight of 1 for zero-UC industries

      const existing = sectorData.get(sectorId) ?? {
        count: 0,
        ucTotal: 0,
        totalWeight: 0,
        weightedRisk: 0,
        weightedCert: 0,
        weightedCoverage: 0,
        weightedRevenue: 0,
        weightedVolatility: 0,
        points: [],
      };

      existing.count += 1;
      existing.ucTotal += useCaseCount;
      existing.totalWeight += weight;
      existing.weightedRisk += (metrics?.riskIndex ?? 0) * weight;
      existing.weightedCert += (metrics?.certHealthPercent ?? 0) * weight;
      existing.weightedCoverage += (metrics?.coveragePercent ?? 0) * weight;
      existing.weightedRevenue += revenueScore * weight;
      existing.weightedVolatility += (metrics?.volatilityScore ?? 0) * weight;
      existing.points.push({
        x: node.position.x + NODE_HALF,
        y: node.position.y + NODE_HALF,
      });
      sectorData.set(sectorId, existing);
    }

    return MACRO_SECTORS.filter((ms) => (sectorData.get(ms.id)?.count ?? 0) > 0).map((ms) => {
      const sd = sectorData.get(ms.id)!;
      const bbox = computeBoundingBox(sd.points);
      const cx = (bbox.minX + bbox.maxX) / 2;
      const cy = bbox.maxY + 30;
      const w = sd.totalWeight || 1;

      return {
        id: ms.id,
        cx,
        cy,
        industryCount: sd.count,
        ucTotal: sd.ucTotal,
        avgRisk: Math.round(sd.weightedRisk / w),
        avgCert: Math.round(sd.weightedCert / w),
        avgCoverage: Math.round(sd.weightedCoverage / w),
        avgRevenue: Math.round(sd.weightedRevenue / w),
        avgVolatility: Math.round(sd.weightedVolatility / w),
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
            left: b.cx - 65,
            top: b.cy,
            width: 130,
          }}
        >
          <div className="bg-[var(--surface-primary)]/70 backdrop-blur-sm border border-white/5 rounded-md px-2 py-1.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[7px]">
              <span style={{ color: b.color }}>{b.ucTotal} uc</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-red-400">{b.avgRisk}r</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-green-400">{b.avgCert}%c</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[7px] mt-0.5">
              <span className="text-emerald-400">{b.avgCoverage}%cv</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-pink-400">{b.avgRevenue}rv</span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-amber-400">{b.avgVolatility}v</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
