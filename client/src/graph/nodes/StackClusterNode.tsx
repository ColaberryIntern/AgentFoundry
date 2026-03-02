import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

/**
 * Rounded-square bubble node for USE_CASE altitude (stack/skeleton clusters).
 *
 * Distinct rounded-square shape differentiates stack clusters from
 * GLOBAL circles and INDUSTRY hexagons.
 *
 * 7 simultaneous KPI channels:
 *   1. Size      → variantCount (power curve)
 *   2. Fill tint → riskIndex (20-35% opacity gradient)
 *   3. Outer ring→ certHealthPercent (1-4px rounded-rect outline)
 *   4. Inner ring→ coveragePercent (green rounded-rect outline)
 *   5. Glow      → revenueScore (outer blur if ≥ 60)
 *   6. Dot       → volatilityScore (gray/amber/red marker)
 *   7. Text      → skeleton name + variant count
 */
function StackClusterNodeInner({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const label = (d.label as string) ?? '';
  const sublabel = (d.sublabel as string) ?? '';
  const riskLevel = (d.riskLevel as string) ?? 'low';
  const variantCount = (d.variantCount as number) ?? 0;
  const metrics = d.metrics as
    | {
        certHealthPercent: number;
        riskIndex: number;
        coveragePercent: number;
        volatilityScore: number;
        activeDeployments: number;
      }
    | undefined;

  const bubbleSize = (d.bubbleSize as number) ?? 110;
  const riskColor = (d.riskColor as string) ?? '#8b5cf6';
  const certRingColor = (d.certRingColor as string) ?? riskColor;
  const certHealth = metrics?.certHealthPercent ?? 0;
  const riskIndex = metrics?.riskIndex ?? 0;
  const activeDeployments = metrics?.activeDeployments ?? 0;
  const volatilityScore = (d.volatilityScore as number) ?? metrics?.volatilityScore ?? 0;
  const coveragePercent = (d.coveragePercent as number) ?? metrics?.coveragePercent ?? 0;
  const revenueScore = (d.revenueScore as number) ?? 0;

  const [hovered, setHovered] = useState(false);

  // Rounded-square dimensions
  const padding = 6;
  const side = bubbleSize - padding * 2;
  const rx = side * 0.15; // corner radius = 15% of side
  const x0 = padding;
  const y0 = padding;

  // -- KPI 2: Risk fill tint opacity (20-35%)
  const riskFillOpacity = 0.2 + (riskIndex / 100) * 0.15;

  // -- KPI 3: Cert health ring — rounded rect perimeter
  const certStrokeWidth = 1 + (certHealth / 100) * 3;
  const certPerimeter = 2 * (side + side) - 8 * rx + 2 * Math.PI * rx; // approx rounded rect perimeter
  const certArc = (certHealth / 100) * certPerimeter;

  // -- KPI 4: Coverage ring
  const coveragePad = certStrokeWidth + 4;
  const coverageSide = side - coveragePad * 2;
  const coverageRx = coverageSide * 0.15;
  const coveragePerimeter =
    2 * (coverageSide + coverageSide) - 8 * coverageRx + 2 * Math.PI * coverageRx;
  const coverageArc = (coveragePercent / 100) * coveragePerimeter;

  // -- KPI 5: Revenue glow
  const hasRevenueGlow = revenueScore >= 60;
  const revenueGlowSize = hasRevenueGlow ? 12 + (revenueScore - 60) * 0.3 : 0;

  // -- KPI 6: Volatility dot
  const volatilityDotColor =
    volatilityScore > 70 ? '#ef4444' : volatilityScore > 40 ? '#f59e0b' : '#6b7280';
  const volatilityDotR = 3 + (volatilityScore / 100) * 3;

  // Risk badge colors
  const riskColors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  };

  const baseOpacity = 0.8 + (bubbleSize / 220) * 0.2;
  const borderRadius = `${(rx / side) * 100}%`;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer group"
      style={{
        width: bubbleSize,
        height: bubbleSize,
        opacity: ((d.opacity as number) ?? 1) * baseOpacity,
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        filter: hovered ? `drop-shadow(0 4px 16px ${riskColor}40)` : 'none',
        boxShadow: hasRevenueGlow ? `0 0 ${revenueGlowSize}px ${riskColor}30` : 'none',
        borderRadius,
        transition:
          'opacity 200ms ease, transform 200ms ease, filter 200ms ease, box-shadow 300ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        width={bubbleSize}
        height={bubbleSize}
        viewBox={`0 0 ${bubbleSize} ${bubbleSize}`}
        className="absolute inset-0"
      >
        {/* KPI 2: Background rounded-square — risk tint */}
        <rect
          x={x0 - 2}
          y={y0 - 2}
          width={side + 4}
          height={side + 4}
          rx={rx}
          ry={rx}
          fill={riskColor}
          opacity={riskFillOpacity}
        />
        {/* Inner glow */}
        <rect
          x={x0 + 10}
          y={y0 + 10}
          width={side - 20}
          height={side - 20}
          rx={rx * 0.6}
          ry={rx * 0.6}
          fill={riskColor}
          opacity={0.08}
        />

        {/* KPI 3: Cert health ring — background track */}
        <rect
          x={x0}
          y={y0}
          width={side}
          height={side}
          rx={rx}
          ry={rx}
          fill="none"
          stroke={riskColor}
          strokeWidth={1}
          opacity={0.15}
        />
        {/* KPI 3: Cert health ring — active arc */}
        <rect
          x={x0}
          y={y0}
          width={side}
          height={side}
          rx={rx}
          ry={rx}
          fill="none"
          stroke={certRingColor}
          strokeWidth={certStrokeWidth}
          strokeDasharray={`${certArc} ${certPerimeter}`}
          strokeLinejoin="round"
          opacity={0.8}
        />

        {/* KPI 4: Coverage ring — gray track */}
        <rect
          x={x0 + coveragePad}
          y={y0 + coveragePad}
          width={coverageSide}
          height={coverageSide}
          rx={coverageRx}
          ry={coverageRx}
          fill="none"
          stroke="#374151"
          strokeWidth={1.5}
          opacity={0.2}
        />
        {/* KPI 4: Coverage ring — green fill */}
        <rect
          x={x0 + coveragePad}
          y={y0 + coveragePad}
          width={coverageSide}
          height={coverageSide}
          rx={coverageRx}
          ry={coverageRx}
          fill="none"
          stroke="#10b981"
          strokeWidth={1.5}
          strokeDasharray={`${coverageArc} ${coveragePerimeter}`}
          strokeLinejoin="round"
          opacity={0.7}
        />

        {/* KPI 6: Volatility marker — bottom-right corner */}
        <circle
          cx={x0 + side - 8}
          cy={y0 + side - 8}
          r={volatilityDotR}
          fill={volatilityDotColor}
          opacity={0.85}
        />
      </svg>

      {/* KPI 7: Content text */}
      <div className="relative z-10 text-center px-2">
        <div className="text-[10px] font-bold text-[var(--text-primary)] leading-tight line-clamp-2">
          {label}
        </div>
        <div className="text-[8px] text-[var(--text-muted)] mt-0.5">
          {variantCount} var · {activeDeployments} active
        </div>
        {sublabel && (
          <div className="text-[7px] text-[var(--text-muted)]/60 mt-0.5 capitalize">{sublabel}</div>
        )}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ top: bubbleSize + 4, left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="bg-[#0f172a] backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 shadow-2xl shadow-black/50 min-w-[220px] text-white">
            <div className="text-[10px] text-[var(--text-primary)] font-semibold mb-1 truncate">
              {label}
            </div>
            <div className="grid grid-cols-[auto_minmax(40px,1fr)] gap-x-4 gap-y-0.5 text-[9px]">
              <span className="text-[var(--text-muted)] whitespace-nowrap">Variants</span>
              <span className="text-[var(--text-primary)] text-right">{variantCount}</span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Active</span>
              <span className="text-[var(--text-primary)] text-right">{activeDeployments}</span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Risk Level</span>
              <span
                className="text-right capitalize"
                style={{ color: riskColors[riskLevel] ?? '#10b981' }}
              >
                {riskLevel}
              </span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Risk Index</span>
              <span className="text-right" style={{ color: riskColor }}>
                {riskIndex}
              </span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Coverage</span>
              <span className="text-[var(--text-primary)] text-right">{coveragePercent}%</span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Cert %</span>
              <span className="text-right" style={{ color: certRingColor }}>
                {certHealth}%
              </span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Volatility</span>
              <span className="text-[var(--text-primary)] text-right">{volatilityScore}</span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Revenue</span>
              <span className="text-[var(--text-primary)] text-right">{revenueScore}</span>
            </div>
          </div>
        </div>
      )}

      {/* Hover glow ring */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: `0 0 20px ${riskColor}30, 0 0 40px ${riskColor}10`,
          borderRadius,
        }}
      />

      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-purple-500/60 !border-purple-400/30 !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-purple-500/60 !border-purple-400/30 !opacity-0"
      />
    </div>
  );
}

export const StackClusterNode = memo(StackClusterNodeInner, (prev, next) => {
  const p = prev.data as Record<string, unknown>;
  const n = next.data as Record<string, unknown>;
  return (
    p.bubbleSize === n.bubbleSize &&
    p.riskColor === n.riskColor &&
    p.certRingColor === n.certRingColor &&
    p.volatilityScore === n.volatilityScore &&
    p.coveragePercent === n.coveragePercent &&
    p.revenueScore === n.revenueScore &&
    p.label === n.label &&
    p.variantCount === n.variantCount
  );
});
