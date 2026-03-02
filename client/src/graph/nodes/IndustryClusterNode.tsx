import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useAppSelector } from '../../store/hooks';
import type { MacroSectorId } from '../altitude/macroSectors';

/**
 * Circular bubble node for GLOBAL altitude.
 * Size ∝ weighting mode, fill = risk gradient, ring = cert health gradient,
 * ring thickness ∝ cert%, volatility pulse ∝ volatilityScore.
 *
 * Opacity is computed at render time from Redux hoveredMacroSectorId —
 * this prevents hover from triggering layout re-simulation.
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

  // SVG ring for cert health — variable thickness based on cert%
  const certStrokeWidth = 2 + (certHealth / 100) * 4; // 2-6px
  const radius = bubbleSize / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const certArc = (certHealth / 100) * circumference;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Volatility pulse: threshold 30, speed scales with score
  const hasVolatilityPulse = volatilityScore > 30 && !prefersReducedMotion;
  const pulseDuration = hasVolatilityPulse ? `${Math.max(1, 4 - volatilityScore / 30)}s` : '2s';

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
        transition:
          'opacity 200ms ease, transform 200ms ease, filter 200ms ease, width 400ms ease, height 400ms ease',
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
        {/* Background circle */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={radius + 2}
          fill={riskColor}
          opacity={0.08}
        />

        {/* Inner glow — volatility pulse */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={radius - 10}
          fill={riskColor}
          opacity={0.12}
        >
          {hasVolatilityPulse && (
            <animate
              attributeName="opacity"
              values="0.06;0.22;0.06"
              dur={pulseDuration}
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* Cert health ring — background track */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={radius}
          fill="none"
          stroke={riskColor}
          strokeWidth={1}
          opacity={0.15}
        />

        {/* Cert health ring — active arc with variable thickness */}
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
      </svg>

      {/* Content */}
      <div className="relative z-10 text-center px-2">
        <div className="text-[11px] font-bold text-[var(--text-primary)] leading-tight line-clamp-2">
          {title}
        </div>
        <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{code}</div>
        {macroSectorLabel && (
          <div className="text-[8px] text-[var(--text-muted)]/60 mt-0.5">{macroSectorLabel}</div>
        )}
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-[9px] text-blue-400">{useCaseCount} UC</span>
          <span className="text-[9px] text-cyan-400">{agentCount} Agents</span>
        </div>
      </div>

      {/* Hover mini-panel */}
      {hovered && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ top: bubbleSize + 4, left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="bg-[var(--surface-primary)]/95 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-xl min-w-[150px]">
            <div className="text-[10px] text-[var(--text-primary)] font-semibold mb-1 truncate">
              {title}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
              <span className="text-[var(--text-muted)]">Use Cases</span>
              <span className="text-[var(--text-primary)] text-right">{useCaseCount}</span>
              <span className="text-[var(--text-muted)]">Stacks</span>
              <span className="text-[var(--text-primary)] text-right">{stackCount}</span>
              <span className="text-[var(--text-muted)]">Risk</span>
              <span className="text-right" style={{ color: riskColor }}>
                {metrics?.riskIndex ?? 0}
              </span>
              <span className="text-[var(--text-muted)]">Coverage</span>
              <span className="text-[var(--text-primary)] text-right">
                {metrics?.coveragePercent ?? 0}%
              </span>
              <span className="text-[var(--text-muted)]">Cert %</span>
              <span className="text-right" style={{ color: certRingColor }}>
                {certHealth}%
              </span>
              <span className="text-[var(--text-muted)]">Volatility</span>
              <span className="text-[var(--text-primary)] text-right">{volatilityScore}</span>
              <span className="text-[var(--text-muted)]">Revenue</span>
              <span className="text-[var(--text-primary)] text-right">{agentCount} agents</span>
            </div>
          </div>
        </div>
      )}

      {/* Hover glow */}
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
    p.macroSectorId === n.macroSectorId &&
    p.title === n.title &&
    p.code === n.code &&
    p.useCaseCount === n.useCaseCount &&
    p.stackCount === n.stackCount &&
    p.agentCount === n.agentCount
  );
});
