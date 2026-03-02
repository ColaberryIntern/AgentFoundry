import { useMemo } from 'react';
import { useViewport } from '@xyflow/react';
import { useAppSelector } from '../../store/hooks';
import { MACRO_SECTORS, computeClusterAnchor } from '../altitude/macroSectors';

/**
 * SVG overlay that renders soft radial gradients behind macro-sector cluster positions.
 * Purely decorative — pointer-events: none.
 */
export function HeatmapOverlay() {
  const { industries } = useAppSelector((s) => s.registry);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);
  const viewport = useViewport();

  const nodeCount = industries.length;
  const ringRadius = 300 + Math.sqrt(nodeCount) * 30;

  // Compute average risk per macro-sector for glow intensity
  const sectorGlows = useMemo(() => {
    // Aggregate risk by sector
    const riskBySector = new Map<string, number[]>();
    for (const ind of industries) {
      const existing = riskBySector.get(ind.sector) ?? [];
      existing.push(50); // default risk
      riskBySector.set(ind.sector, existing);
    }

    // Add real risk data if available
    if (riskAnalysis) {
      for (const r of riskAnalysis) {
        // Risk analysis isn't sector-keyed, so we use a system-wide average
        for (const [, arr] of riskBySector) {
          arr.push(r.riskScore);
        }
      }
    }

    return MACRO_SECTORS.map((sector) => {
      const anchor = computeClusterAnchor(sector, ringRadius);
      const sectorRisks: number[] = [];
      for (const code of sector.sectorCodes) {
        const risks = riskBySector.get(code);
        if (risks) sectorRisks.push(...risks);
      }
      const avgRisk =
        sectorRisks.length > 0 ? sectorRisks.reduce((a, b) => a + b, 0) / sectorRisks.length : 30;

      // Opacity: 4% + (avgRisk/100 * 8%) => max 12%
      const opacity = 0.04 + (avgRisk / 100) * 0.08;

      return {
        id: sector.id,
        cx: anchor.x,
        cy: anchor.y,
        r: sector.boundaryRadius * 0.8,
        color: sector.glowColor,
        opacity: Math.min(opacity, 0.12),
      };
    });
  }, [industries, riskAnalysis, ringRadius]);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: '0 0',
      }}
    >
      <defs>
        {sectorGlows.map((g) => (
          <radialGradient key={`grad-${g.id}`} id={`heatmap-${g.id}`}>
            <stop offset="0%" stopColor={g.color} stopOpacity={g.opacity} />
            <stop offset="100%" stopColor={g.color} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>
      {sectorGlows.map((g) => (
        <circle key={g.id} cx={g.cx} cy={g.cy} r={g.r} fill={`url(#heatmap-${g.id})`} />
      ))}
    </svg>
  );
}
