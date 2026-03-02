import { useMemo } from 'react';
import { useViewport } from '@xyflow/react';
import { useAppSelector } from '../../store/hooks';
import { MACRO_SECTORS, getMacroSector, computeClusterAnchor } from '../altitude/macroSectors';
import type { MacroSectorId } from '../altitude/macroSectors';

interface SectorBadge {
  id: MacroSectorId;
  cx: number;
  cy: number;
  industryCount: number;
  avgRisk: number;
  certPercent: number;
  color: string;
}

/**
 * Per-sector summary badge overlay. Displays glassmorphic pills below each
 * sector label with key aggregate metrics. Pointer-events: none.
 */
export function SectorBadgeOverlay({
  anchorMap,
}: {
  anchorMap: Map<MacroSectorId, { x: number; y: number }>;
}) {
  const viewport = useViewport();
  const { industries, variants } = useAppSelector((s) => s.registry);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);

  const nodeCount = industries.length;
  const ringRadius = 300 + Math.sqrt(nodeCount) * 30;

  const badges = useMemo((): SectorBadge[] => {
    // Group industries by macro sector
    const sectorIndustries = new Map<MacroSectorId, number>();
    for (const ind of industries) {
      const ms = getMacroSector(ind.sector);
      sectorIndustries.set(ms.id, (sectorIndustries.get(ms.id) ?? 0) + 1);
    }

    // Average risk per sector
    const avgRisk =
      riskAnalysis && riskAnalysis.length > 0
        ? Math.round(riskAnalysis.reduce((s, r) => s + r.riskScore, 0) / riskAnalysis.length)
        : 0;

    // Cert percent
    const certCount = variants.filter((v) => v.certificationStatus === 'certified').length;
    const certPercent = variants.length > 0 ? Math.round((certCount / variants.length) * 100) : 0;

    return MACRO_SECTORS.filter((ms) => (sectorIndustries.get(ms.id) ?? 0) > 0).map((ms) => {
      const anchor = anchorMap.get(ms.id) ?? computeClusterAnchor(ms, ringRadius);
      return {
        id: ms.id,
        cx: anchor.x,
        cy: anchor.y,
        industryCount: sectorIndustries.get(ms.id) ?? 0,
        avgRisk,
        certPercent,
        color: ms.glowColor,
      };
    });
  }, [industries, variants, riskAnalysis, anchorMap, ringRadius]);

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
            top:
              b.cy + (MACRO_SECTORS.find((m) => m.id === b.id)?.boundaryRadius ?? 200) * 0.75 + 12,
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
