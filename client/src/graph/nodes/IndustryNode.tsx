import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { IndustryNodeData } from '../types/graphTypes';

/**
 * Center detail node at INDUSTRY altitude.
 *
 * Renders as a larger KPI-rich circle (matching GLOBAL-level IndustryClusterNode)
 * with an "INDUSTRY" type badge to distinguish it from surrounding UC hexagons.
 *
 * 7 KPI channels: radius, risk fill, cert ring, coverage arc, revenue glow,
 * volatility dot, text content.
 */
function IndustryNodeComponent({ data }: NodeProps) {
  const d = data as IndustryNodeData;
  const [hovered, setHovered] = useState(false);

  const bubbleSize = d.bubbleSize ?? 200;
  const riskColor = d.riskColor ?? '#3b82f6';
  const certRingColor = d.certRingColor ?? riskColor;
  const certHealth = d.metrics?.certHealthPercent ?? 0;
  const riskIndex = d.metrics?.riskIndex ?? 0;
  const volatilityScore = d.volatilityScore ?? d.metrics?.volatilityScore ?? 0;
  const coveragePercent = d.coveragePercent ?? d.metrics?.coveragePercent ?? 0;
  const revenueScore = d.revenueScore ?? 0;
  const activeDeployments = d.metrics?.activeDeployments ?? 0;

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

  // -- KPI 6: Volatility dot
  const volatilityDotColor =
    volatilityScore > 70 ? '#ef4444' : volatilityScore > 40 ? '#f59e0b' : '#6b7280';
  const volatilityDotR = 3 + (volatilityScore / 100) * 3;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer group"
      style={{
        width: bubbleSize,
        height: bubbleSize,
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        filter: hovered ? `drop-shadow(0 4px 16px ${riskColor}40)` : 'none',
        boxShadow: hasRevenueGlow ? `0 0 ${revenueGlowSize}px ${riskColor}30` : 'none',
        borderRadius: '50%',
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

        {/* KPI 6: Volatility marker */}
        <circle
          cx={bubbleSize / 2 + radius * 0.6}
          cy={bubbleSize / 2 + radius * 0.6}
          r={volatilityDotR}
          fill={volatilityDotColor}
          opacity={0.85}
        />
      </svg>

      {/* INDUSTRY type badge */}
      <div
        className="absolute z-20 flex items-center justify-center"
        style={{ top: 8, left: '50%', transform: 'translateX(-50%)' }}
      >
        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider bg-blue-500/30 text-blue-300 border border-blue-400/30 backdrop-blur-sm">
          INDUSTRY
        </span>
      </div>

      {/* KPI 7: Content text */}
      <div className="relative z-10 text-center px-3 mt-2">
        <div className="text-[12px] font-bold text-[var(--text-primary)] leading-tight line-clamp-2">
          {d.title}
        </div>
        <div className="text-[10px] text-blue-400 font-semibold mt-0.5">{d.code}</div>
        <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
          {d.useCaseCount} UC · {d.variantCount} agents
        </div>
        {d.certifiedCount > 0 && (
          <div className="text-[8px] text-emerald-400 mt-0.5">{d.certifiedCount} certified</div>
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
              {d.title}
            </div>
            <div className="grid grid-cols-[auto_minmax(40px,1fr)] gap-x-4 gap-y-0.5 text-[9px]">
              <span className="text-[var(--text-muted)] whitespace-nowrap">Use Cases</span>
              <span className="text-[var(--text-primary)] text-right">{d.useCaseCount}</span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Agents</span>
              <span className="text-[var(--text-primary)] text-right">{d.variantCount}</span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Certified</span>
              <span className="text-emerald-400 text-right">{d.certifiedCount}</span>
              <span className="text-[var(--text-muted)] whitespace-nowrap">Active</span>
              <span className="text-[var(--text-primary)] text-right">{activeDeployments}</span>
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

export const IndustryNode = memo(IndustryNodeComponent);
