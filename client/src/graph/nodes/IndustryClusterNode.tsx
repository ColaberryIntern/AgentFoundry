import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { scoreToColor } from '../utils/performanceUtils';

/**
 * Circular bubble node for GLOBAL altitude.
 * Size ∝ use case count, color = risk gradient, ring = cert health.
 */
function IndustryClusterNodeInner({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const title = (d.title as string) ?? '';
  const code = (d.code as string) ?? '';
  const useCaseCount = (d.useCaseCount as number) ?? 0;
  const agentCount = (d.agentCount as number) ?? 0;
  const metrics = d.metrics as
    | {
        certHealthPercent: number;
        riskIndex: number;
        coveragePercent: number;
      }
    | undefined;
  const bubbleSize = (d.bubbleSize as number) ?? 120;
  const riskColor = (d.riskColor as string) ?? '#3b82f6';
  const certHealth = metrics?.certHealthPercent ?? 0;

  // SVG ring for cert health
  const radius = bubbleSize / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const certArc = (certHealth / 100) * circumference;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const isHighRisk = (metrics?.riskIndex ?? 0) > 70;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer group"
      style={{ width: bubbleSize, height: bubbleSize }}
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

        {/* Inner glow */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={radius - 10}
          fill={riskColor}
          opacity={0.12}
        >
          {!prefersReducedMotion && isHighRisk && (
            <animate
              attributeName="opacity"
              values="0.08;0.18;0.08"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* Cert health ring */}
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={radius}
          fill="none"
          stroke={riskColor}
          strokeWidth={1}
          opacity={0.15}
        />
        <circle
          cx={bubbleSize / 2}
          cy={bubbleSize / 2}
          r={radius}
          fill="none"
          stroke={scoreToColor(certHealth)}
          strokeWidth={3}
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
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-[9px] text-blue-400">{useCaseCount} UC</span>
          <span className="text-[9px] text-cyan-400">{agentCount} Agents</span>
        </div>
      </div>

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

export const IndustryClusterNode = memo(IndustryClusterNodeInner);
