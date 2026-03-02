import { memo, useState, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { UseCaseNodeData } from '../types/graphTypes';

/** Generate SVG polygon points for a regular hexagon. */
function hexagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

/** Perimeter of a regular hexagon with radius r. */
function hexPerimeter(r: number): number {
  return 6 * r;
}

/**
 * Center detail node at USE_CASE altitude.
 *
 * Renders as a larger KPI-rich hexagon (matching INDUSTRY-level UseCaseClusterNode)
 * with a "USE CASE" type badge to distinguish it from surrounding stack rounded-squares.
 *
 * 7 KPI channels: size, risk fill, cert ring, coverage arc, revenue glow,
 * volatility dot, text content.
 */
function UseCaseNodeComponent({ data }: NodeProps) {
  const d = data as UseCaseNodeData;
  const [hovered, setHovered] = useState(false);

  const bubbleSize = d.bubbleSize ?? 200;
  const riskColor = d.riskColor ?? '#f59e0b';
  const certRingColor = d.certRingColor ?? riskColor;
  const certHealth = d.metrics?.certHealthPercent ?? 0;
  const riskIndex = d.metrics?.riskIndex ?? 0;
  const volatilityScore = d.volatilityScore ?? d.metrics?.volatilityScore ?? 0;
  const coveragePercent = d.coveragePercent ?? d.metrics?.coveragePercent ?? 0;
  const revenueScore = d.revenueScore ?? 0;
  const stackCount = d.stackCount ?? 0;
  const agentCount = d.agentCount ?? 0;
  const deploymentCount = d.deploymentCount ?? 0;

  const cx = bubbleSize / 2;
  const cy = bubbleSize / 2;
  const radius = bubbleSize / 2 - 6;

  // -- KPI 2: Risk fill tint opacity (20-35%)
  const riskFillOpacity = 0.2 + (riskIndex / 100) * 0.15;

  // -- KPI 3: Cert health ring
  const certStrokeWidth = 1 + (certHealth / 100) * 3;
  const certPerim = hexPerimeter(radius);
  const certArc = (certHealth / 100) * certPerim;

  // -- KPI 4: Coverage ring
  const coverageRadius = radius - certStrokeWidth - 4;
  const coveragePerim = hexPerimeter(coverageRadius);
  const coverageArc = (coveragePercent / 100) * coveragePerim;

  // -- KPI 5: Revenue glow
  const hasRevenueGlow = revenueScore >= 60;
  const revenueGlowSize = hasRevenueGlow ? 12 + (revenueScore - 60) * 0.3 : 0;

  // -- KPI 6: Volatility dot
  const volatilityDotColor =
    volatilityScore > 70 ? '#ef4444' : volatilityScore > 40 ? '#f59e0b' : '#6b7280';
  const volatilityDotR = 3 + (volatilityScore / 100) * 3;

  // Hex points
  const outerHex = useMemo(() => hexagonPoints(cx, cy, radius + 2), [cx, cy, radius]);
  const innerGlowHex = useMemo(() => hexagonPoints(cx, cy, radius - 10), [cx, cy, radius]);
  const certHex = useMemo(() => hexagonPoints(cx, cy, radius), [cx, cy, radius]);
  const coverageHex = useMemo(
    () => hexagonPoints(cx, cy, coverageRadius),
    [cx, cy, coverageRadius],
  );

  const clipPath = 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)';

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer group"
      style={{
        width: bubbleSize,
        height: bubbleSize,
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        filter: hovered ? `drop-shadow(0 4px 16px ${riskColor}40)` : 'none',
        transition: 'transform 200ms ease, filter 200ms ease, box-shadow 300ms ease',
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
          strokeDasharray={`${certArc} ${certPerim}`}
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
          strokeDasharray={`${coverageArc} ${coveragePerim}`}
          strokeLinejoin="round"
          opacity={0.7}
        />

        {/* KPI 6: Volatility marker */}
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
          }}
        />
      )}

      {/* USE CASE type badge */}
      <div
        className="absolute z-20 flex items-center justify-center"
        style={{ top: 12, left: '50%', transform: 'translateX(-50%)' }}
      >
        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider bg-amber-500/30 text-amber-300 border border-amber-400/30 backdrop-blur-sm">
          USE CASE
        </span>
      </div>

      {/* KPI 7: Content text */}
      <div className="relative z-10 text-center px-4 mt-3">
        <div className="text-[11px] font-bold text-[var(--text-primary)] leading-tight line-clamp-2">
          {d.outcomeStatement.length > 50
            ? d.outcomeStatement.slice(0, 47) + '...'
            : d.outcomeStatement}
        </div>
        <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
          {stackCount} stk · {agentCount > 0 ? agentCount : deploymentCount} agents
        </div>
        {d.monetizationType && (
          <div className="text-[8px] text-[var(--text-muted)]/60 mt-0.5 capitalize">
            {d.monetizationType.replace(/_/g, ' ')}
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
              {d.outcomeStatement}
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
              {d.urgencyScore != null && (
                <>
                  <span className="text-[var(--text-muted)] whitespace-nowrap">Urgency</span>
                  <span className="text-[var(--text-primary)] text-right">
                    {Math.round(d.urgencyScore * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hover glow */}
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

export const UseCaseNode = memo(UseCaseNodeComponent);
