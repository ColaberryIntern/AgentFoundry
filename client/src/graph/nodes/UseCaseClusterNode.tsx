import { memo, useState, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

/** Generate SVG polygon points for a regular hexagon. */
function hexagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

/** Perimeter of a regular hexagon with radius r. */
function hexPerimeter(r: number): number {
  return 6 * r; // each side = r for a regular hexagon
}

/**
 * Hexagonal bubble node for INDUSTRY altitude (use case clusters).
 *
 * Distinct hexagon shape differentiates UC clusters from GLOBAL circles.
 *
 * 7 simultaneous KPI channels:
 *   1. Size      → stackCount + agentCount (power curve)
 *   2. Fill tint → riskIndex (20-35% opacity gradient)
 *   3. Outer ring→ certHealthPercent (1-4px hex outline)
 *   4. Inner ring→ coveragePercent (green hex outline)
 *   5. Glow      → revenueScore (outer blur if ≥ 60)
 *   6. Dot       → volatilityScore (gray/amber/red marker)
 *   7. Text      → outcome + stack/agent count
 */
function UseCaseClusterNodeInner({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const label = (d.label as string) ?? '';
  const monetizationType = (d.monetizationType as string) ?? '';
  const urgencyScore = (d.urgencyScore as number | null) ?? null;
  const stackCount = (d.stackCount as number) ?? 0;
  const agentCount = (d.agentCount as number) ?? 0;
  const deploymentCount = (d.deploymentCount as number) ?? 0;
  const metrics = d.metrics as
    | {
        certHealthPercent: number;
        riskIndex: number;
        coveragePercent: number;
        volatilityScore: number;
      }
    | undefined;

  const bubbleSize = (d.bubbleSize as number) ?? 120;
  const riskColor = (d.riskColor as string) ?? '#f59e0b';
  const certRingColor = (d.certRingColor as string) ?? riskColor;
  const certHealth = metrics?.certHealthPercent ?? 0;
  const riskIndex = metrics?.riskIndex ?? 0;
  const volatilityScore = (d.volatilityScore as number) ?? metrics?.volatilityScore ?? 0;
  const coveragePercent = (d.coveragePercent as number) ?? metrics?.coveragePercent ?? 0;
  const revenueScore = (d.revenueScore as number) ?? 0;

  const [hovered, setHovered] = useState(false);

  const cx = bubbleSize / 2;
  const cy = bubbleSize / 2;
  const radius = bubbleSize / 2 - 6;

  // -- KPI 2: Risk fill tint opacity (20-35%)
  const riskFillOpacity = 0.2 + (riskIndex / 100) * 0.15;

  // -- KPI 3: Cert health ring
  const certStrokeWidth = 1 + (certHealth / 100) * 3;
  const certPerimeter = hexPerimeter(radius);
  const certArc = (certHealth / 100) * certPerimeter;

  // -- KPI 4: Coverage gap ring
  const coverageRadius = radius - certStrokeWidth - 4;
  const coveragePerimeter = hexPerimeter(coverageRadius);
  const coverageArc = (coveragePercent / 100) * coveragePerimeter;

  // -- KPI 5: Revenue glow
  const hasRevenueGlow = revenueScore >= 60;
  const revenueGlowSize = hasRevenueGlow ? 12 + (revenueScore - 60) * 0.3 : 0;

  // -- KPI 6: Volatility dot
  const volatilityDotColor =
    volatilityScore > 70 ? '#ef4444' : volatilityScore > 40 ? '#f59e0b' : '#6b7280';
  const volatilityDotR = 3 + (volatilityScore / 100) * 3;

  const baseOpacity = 0.8 + (bubbleSize / 220) * 0.2;

  // Hex points for different layers
  const outerHex = useMemo(() => hexagonPoints(cx, cy, radius + 2), [cx, cy, radius]);
  const innerGlowHex = useMemo(() => hexagonPoints(cx, cy, radius - 10), [cx, cy, radius]);
  const certHex = useMemo(() => hexagonPoints(cx, cy, radius), [cx, cy, radius]);
  const coverageHex = useMemo(
    () => hexagonPoints(cx, cy, coverageRadius),
    [cx, cy, coverageRadius],
  );

  // CSS clip-path for hexagonal container shape
  const clipPath = 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)';

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer group"
      style={{
        width: bubbleSize,
        height: bubbleSize,
        opacity: ((d.opacity as number) ?? 1) * baseOpacity,
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        filter: hovered ? `drop-shadow(0 4px 16px ${riskColor}40)` : 'none',
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
        {/* KPI 2: Background hexagon — risk tint */}
        <polygon points={outerHex} fill={riskColor} opacity={riskFillOpacity} />
        {/* Inner glow */}
        <polygon points={innerGlowHex} fill={riskColor} opacity={0.08} />

        {/* KPI 3: Cert health ring — background track */}
        <polygon points={certHex} fill="none" stroke={riskColor} strokeWidth={1} opacity={0.15} />
        {/* KPI 3: Cert health ring — active arc */}
        <polygon
          points={certHex}
          fill="none"
          stroke={certRingColor}
          strokeWidth={certStrokeWidth}
          strokeDasharray={`${certArc} ${certPerimeter}`}
          strokeLinejoin="round"
          opacity={0.8}
        />

        {/* KPI 4: Coverage ring — gray track */}
        <polygon
          points={coverageHex}
          fill="none"
          stroke="#374151"
          strokeWidth={1.5}
          opacity={0.2}
        />
        {/* KPI 4: Coverage ring — green fill */}
        <polygon
          points={coverageHex}
          fill="none"
          stroke="#10b981"
          strokeWidth={1.5}
          strokeDasharray={`${coverageArc} ${coveragePerimeter}`}
          strokeLinejoin="round"
          opacity={0.7}
        />

        {/* KPI 6: Volatility marker — at bottom-right */}
        <circle
          cx={cx + radius * 0.55}
          cy={cy + radius * 0.55}
          r={volatilityDotR}
          fill={volatilityDotColor}
          opacity={0.85}
        />
      </svg>

      {/* Revenue glow behind shape */}
      {hasRevenueGlow && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath,
            boxShadow: `inset 0 0 ${revenueGlowSize}px ${riskColor}30`,
            borderRadius: 0,
          }}
        />
      )}

      {/* KPI 7: Content text */}
      <div className="relative z-10 text-center px-3">
        <div className="text-[10px] font-bold text-[var(--text-primary)] leading-tight line-clamp-2">
          {label}
        </div>
        <div className="text-[8px] text-[var(--text-muted)] mt-0.5">
          {stackCount} stk · {agentCount > 0 ? agentCount : deploymentCount} agents
        </div>
        {monetizationType && (
          <div className="text-[7px] text-[var(--text-muted)]/60 mt-0.5 capitalize">
            {monetizationType.replace(/_/g, ' ')}
          </div>
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
              <span className="text-[var(--text-muted)] whitespace-nowrap">Stacks</span>
              <span className="text-[var(--text-primary)] text-right">{stackCount}</span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Agents</span>
              <span className="text-[var(--text-primary)] text-right">
                {agentCount > 0 ? agentCount : deploymentCount}
              </span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Risk</span>
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
              {urgencyScore != null && (
                <>
                  <span className="text-[var(--text-muted)] whitespace-nowrap">Urgency</span>
                  <span className="text-[var(--text-primary)] text-right">
                    {Math.round(urgencyScore * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hover glow ring */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          clipPath,
          boxShadow: `0 0 20px ${riskColor}30, 0 0 40px ${riskColor}10`,
        }}
      />

      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-amber-500/60 !border-amber-400/30 !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-amber-500/60 !border-amber-400/30 !opacity-0"
      />
    </div>
  );
}

export const UseCaseClusterNode = memo(UseCaseClusterNodeInner, (prev, next) => {
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
    p.stackCount === n.stackCount &&
    p.agentCount === n.agentCount &&
    p.deploymentCount === n.deploymentCount
  );
});
