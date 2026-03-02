import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

/**
 * Circular bubble node for INDUSTRY altitude (use case clusters).
 *
 * 7 simultaneous KPI channels (matching IndustryClusterNode):
 *   1. Radius     → stackCount + agentCount (power curve)
 *   2. Fill tint  → riskIndex (20-35% opacity gradient)
 *   3. Outer ring → certHealthPercent (1-4px, green/amber/red arc)
 *   4. Inner arc  → coveragePercent (green arc over gray track)
 *   5. Glow       → revenueScore (outer blur if ≥ 60)
 *   6. Dot        → volatilityScore (gray/amber/red static marker)
 *   7. Text       → outcome + stack/agent count
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

  // -- KPI 2: Risk fill tint opacity (20-35%)
  const riskFillOpacity = 0.2 + (riskIndex / 100) * 0.15;

  // -- KPI 3: Cert health ring
  const certStrokeWidth = 1 + (certHealth / 100) * 3;
  const radius = bubbleSize / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const certArc = (certHealth / 100) * circumference;

  // -- KPI 4: Coverage gap arc
  const coverageRadius = radius - certStrokeWidth - 3;
  const coverageCircum = 2 * Math.PI * coverageRadius;
  const coverageArc = (coveragePercent / 100) * coverageCircum;

  // -- KPI 5: Revenue glow
  const hasRevenueGlow = revenueScore >= 60;
  const revenueGlowSize = hasRevenueGlow ? 12 + (revenueScore - 60) * 0.3 : 0;

  // -- KPI 6: Volatility dot (always shown)
  const volatilityDotColor =
    volatilityScore > 70 ? '#ef4444' : volatilityScore > 40 ? '#f59e0b' : '#6b7280';
  const volatilityDotR = 3 + (volatilityScore / 100) * 3;

  const baseOpacity = 0.8 + (bubbleSize / 220) * 0.2;

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
        borderRadius: '50%',
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
        {/* KPI 2: Background circle — risk tint */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={radius + 2}
          fill={riskColor}
          opacity={riskFillOpacity}
        />
        {/* Inner glow */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={radius - 10}
          fill={riskColor}
          opacity={0.08}
        />

        {/* KPI 3: Cert health ring — background track */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={radius}
          fill="none"
          stroke={riskColor}
          strokeWidth={1}
          opacity={0.15}
        />
        {/* KPI 3: Cert health ring — active arc */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={radius}
          fill="none"
          stroke={certRingColor}
          strokeWidth={certStrokeWidth}
          strokeDasharray={`${certArc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${bubbleSize / 2} ${bubbleSize / 2})`}
          opacity={0.8}
        />

        {/* KPI 4: Coverage gap arc — gray track */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={coverageRadius}
          fill="none"
          stroke="#374151"
          strokeWidth={1.5}
          opacity={0.2}
        />
        {/* KPI 4: Coverage gap arc — green fill */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={coverageRadius}
          fill="none"
          stroke="#10b981"
          strokeWidth={1.5}
          strokeDasharray={`${coverageArc} ${coverageCircum}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${bubbleSize / 2} ${bubbleSize / 2})`}
          opacity={0.7}
        />

        {/* KPI 6: Volatility marker — always shown */}
        <circle
          cx={bubbleSize / 2 + radius * 0.6}
          cy={bubbleSize / 2 + radius * 0.6}
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
          <div className="bg-[#0f172a] backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 shadow-2xl shadow-black/50 min-w-[160px] text-white">
            <div className="text-[10px] text-[var(--text-primary)] font-semibold mb-1 truncate">
              {label}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
              <span className="text-[var(--text-muted)]">Stacks</span>
              <span className="text-[var(--text-primary)] text-right">{stackCount}</span>
              <span className="text-[var(--text-muted)]">Agents</span>
              <span className="text-[var(--text-primary)] text-right">
                {agentCount > 0 ? agentCount : deploymentCount}
              </span>
              <span className="text-[var(--text-muted)]">Risk</span>
              <span className="text-right" style={{ color: riskColor }}>
                {riskIndex}
              </span>
              <span className="text-[var(--text-muted)]">Coverage</span>
              <span className="text-[var(--text-primary)] text-right">{coveragePercent}%</span>
              <span className="text-[var(--text-muted)]">Cert %</span>
              <span className="text-right" style={{ color: certRingColor }}>
                {certHealth}%
              </span>
              <span className="text-[var(--text-muted)]">Volatility</span>
              <span className="text-[var(--text-primary)] text-right">{volatilityScore}</span>
              <span className="text-[var(--text-muted)]">Revenue</span>
              <span className="text-[var(--text-primary)] text-right">{revenueScore}</span>
              {urgencyScore != null && (
                <>
                  <span className="text-[var(--text-muted)]">Urgency</span>
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
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: `0 0 20px ${riskColor}30, 0 0 40px ${riskColor}10`,
          borderRadius: '50%',
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
