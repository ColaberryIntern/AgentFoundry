import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useAppSelector } from '../../store/hooks';
import type { MacroSectorId } from '../altitude/macroSectors';

/**
 * Circular bubble node for GLOBAL altitude.
 *
 * 7 simultaneous KPI channels:
 *   1. Radius     → useCaseCount (power curve)
 *   2. Fill tint  → riskIndex (20-35% opacity gradient)
 *   3. Outer ring → certHealthPercent (1-4px, green/amber/red arc)
 *   4. Inner arc  → coveragePercent (green arc over gray track)
 *   5. Glow       → revenueScore (outer blur if ≥ 60)
 *   6. Dot        → volatilityScore (gray/amber/red static marker)
 *   7. Text       → title + NAICS code + UC count
 */
function IndustryClusterNodeInner({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const title = (d.title as string) ?? '';
  const code = (d.code as string) ?? '';
  const useCaseCount = (d.useCaseCount as number) ?? 0;
  const stackCount = (d.stackCount as number) ?? 0;
  const agentCount = (d.agentCount as number) ?? 0;
  const metrics = d.metrics as
    | {
        certHealthPercent: number;
        riskIndex: number;
        coveragePercent: number;
        volatilityScore: number;
        certifiedCount?: number;
      }
    | undefined;
  const bubbleSize = (d.bubbleSize as number) ?? 120;
  const riskColor = (d.riskColor as string) ?? '#3b82f6';
  const certRingColor = (d.certRingColor as string) ?? riskColor;
  const certHealth = metrics?.certHealthPercent ?? 0;
  const volatilityScore = (d.volatilityScore as number) ?? metrics?.volatilityScore ?? 0;
  const coveragePercent = (d.coveragePercent as number) ?? metrics?.coveragePercent ?? 0;
  const revenueScore = (d.revenueScore as number) ?? 0;
  const macroSectorId = (d.macroSectorId as MacroSectorId) ?? 'other';
  const macroSectorLabel = (d.macroSectorLabel as string) ?? '';

  // Render-time opacity from Redux — no data recomputation on hover/focus
  const hoveredMacroSectorId =
    useAppSelector(
      (s) =>
        (s.graph as unknown as { hoveredMacroSectorId?: MacroSectorId | null })
          .hoveredMacroSectorId,
    ) ?? null;

  const focusedSectorId =
    useAppSelector(
      (s) => (s.graph as unknown as { focusedSectorId?: MacroSectorId | null }).focusedSectorId,
    ) ?? null;

  // Focus takes priority: focused sector nodes stay full, others dim to 10%
  // Hover is secondary: hovered sector nodes stay full, others dim to 30%
  let opacity = 1;
  if (focusedSectorId) {
    opacity = macroSectorId === focusedSectorId ? 1 : 0.1;
  } else if (hoveredMacroSectorId) {
    opacity = macroSectorId === hoveredMacroSectorId ? 1 : 0.3;
  }

  const [hovered, setHovered] = useState(false);

  // -- KPI 3: Cert health ring — variable thickness based on cert%
  const certStrokeWidth = 1 + (certHealth / 100) * 3; // 1-4px per spec
  const radius = bubbleSize / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const certArc = (certHealth / 100) * circumference;

  // -- KPI 4: Coverage gap arc — inner ring
  const coverageRadius = radius - certStrokeWidth - 3;
  const coverageCircum = 2 * Math.PI * coverageRadius;
  const coverageArc = (coveragePercent / 100) * coverageCircum;

  // -- KPI 2: Risk fill tint opacity (20-35%)
  const riskIndex = metrics?.riskIndex ?? 0;
  const riskFillOpacity = 0.2 + (riskIndex / 100) * 0.15;

  // -- KPI 5: Revenue glow
  const hasRevenueGlow = revenueScore >= 60;
  const revenueGlowSize = hasRevenueGlow ? 12 + (revenueScore - 60) * 0.3 : 0;

  // -- KPI 6: Volatility dot
  const volatilityDotColor =
    volatilityScore > 70 ? '#ef4444' : volatilityScore > 40 ? '#f59e0b' : '#6b7280';
  const volatilityDotR = 3 + (volatilityScore / 100) * 3;

  // Depth layering: larger bubbles slightly more opaque
  const baseOpacity = 0.8 + (bubbleSize / 220) * 0.2;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer group"
      style={{
        width: bubbleSize,
        height: bubbleSize,
        opacity: opacity * baseOpacity,
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        filter: hovered ? `drop-shadow(0 4px 16px ${riskColor}40)` : 'none',
        boxShadow: hasRevenueGlow ? `0 0 ${revenueGlowSize}px ${riskColor}30` : 'none',
        borderRadius: '50%',
        transition:
          'opacity 200ms ease, transform 200ms ease, filter 200ms ease, box-shadow 300ms ease, width 400ms ease, height 400ms ease',
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
        {/* KPI 2: Background circle — risk tint (20-35% opacity) */}
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

        {/* KPI 3: Cert health ring — active arc with variable thickness */}
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

        {/* KPI 6: Volatility marker — static colored dot at bottom-right (always shown) */}
        <circle
          cx={bubbleSize / 2 + radius * 0.6}
          cy={bubbleSize / 2 + radius * 0.6}
          r={volatilityDotR}
          fill={volatilityDotColor}
          opacity={0.85}
        />
      </svg>

      {/* KPI 7: Content text — title + code · UC count */}
      <div className="relative z-10 text-center px-2">
        <div className="text-[11px] font-bold text-[var(--text-primary)] leading-tight line-clamp-2">
          {title}
        </div>
        <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
          {code} · {useCaseCount} UC
        </div>
        {macroSectorLabel && (
          <div className="text-[8px] text-[var(--text-muted)]/60 mt-0.5">{macroSectorLabel}</div>
        )}
      </div>

      {/* Hover mini-panel */}
      {hovered && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ top: bubbleSize + 4, left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="bg-[#0f172a] backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 shadow-2xl shadow-black/50 min-w-[160px] text-white">
            <div className="text-[10px] text-[var(--text-primary)] font-semibold mb-1 truncate">
              {title}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
              <span className="text-[var(--text-muted)]">Use Cases</span>
              <span className="text-[var(--text-primary)] text-right">{useCaseCount}</span>
              <span className="text-[var(--text-muted)]">Stacks</span>
              <span className="text-[var(--text-primary)] text-right">{stackCount}</span>
              <span className="text-[var(--text-muted)]">Agents</span>
              <span className="text-[var(--text-primary)] text-right">{agentCount}</span>
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
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-blue-500/60 !border-blue-400/30 !opacity-0"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-blue-500/60 !border-blue-400/30 !opacity-0"
      />
    </div>
  );
}

// Custom memo: only re-render when visual-affecting data changes
export const IndustryClusterNode = memo(IndustryClusterNodeInner, (prev, next) => {
  const p = prev.data as Record<string, unknown>;
  const n = next.data as Record<string, unknown>;
  return (
    p.bubbleSize === n.bubbleSize &&
    p.riskColor === n.riskColor &&
    p.certRingColor === n.certRingColor &&
    p.volatilityScore === n.volatilityScore &&
    p.coveragePercent === n.coveragePercent &&
    p.revenueScore === n.revenueScore &&
    p.macroSectorId === n.macroSectorId &&
    p.title === n.title &&
    p.code === n.code &&
    p.useCaseCount === n.useCaseCount &&
    p.stackCount === n.stackCount &&
    p.agentCount === n.agentCount
  );
});
