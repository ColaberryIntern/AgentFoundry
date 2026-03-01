import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { scoreToColor } from '../utils/performanceUtils';

/**
 * Rounded rectangle cluster for USE_CASE altitude.
 * Shows skeleton name, variant count, risk indicator, cert health bar.
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
        activeDeployments: number;
      }
    | undefined;

  const certHealth = metrics?.certHealthPercent ?? 0;
  const activeDeployments = metrics?.activeDeployments ?? 0;

  const riskColors: Record<string, string> = {
    low: 'text-emerald-400 bg-emerald-500/10',
    medium: 'text-amber-400 bg-amber-500/10',
    high: 'text-red-400 bg-red-500/10',
    critical: 'text-red-500 bg-red-500/15',
  };
  const riskClass = riskColors[riskLevel] ?? riskColors.low;

  return (
    <div
      className="relative rounded-xl min-w-[180px] max-w-[220px] backdrop-blur-md border border-purple-500/20 bg-purple-500/[0.06] shadow-sm cursor-pointer group hover:border-purple-500/40 transition-all duration-200"
      style={{ opacity: (d.opacity as number) ?? 1 }}
    >
      {/* Type badge */}
      <div className="absolute -top-2 -left-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
        STK
      </div>

      <div className="p-3 pt-4">
        {/* Name */}
        <div className="text-[11px] font-medium text-[var(--text-primary)] leading-tight">
          {label}
        </div>

        {/* Specialization */}
        {sublabel && (
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5 capitalize">{sublabel}</div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] text-cyan-400 font-medium">{variantCount} variants</span>
          <span className="text-[9px] text-indigo-400 font-medium">{activeDeployments} active</span>
          <span
            className={`text-[8px] font-bold px-1 py-0.5 rounded ml-auto capitalize ${riskClass}`}
          >
            {riskLevel}
          </span>
        </div>

        {/* Cert health bar */}
        <div className="mt-1.5">
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${certHealth}%`,
                backgroundColor: scoreToColor(certHealth),
              }}
            />
          </div>
          <div className="text-[8px] text-[var(--text-muted)] mt-0.5">
            cert health {certHealth}%
          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-purple-500/60 !border-purple-400/30"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-purple-500/60 !border-purple-400/30"
      />
    </div>
  );
}

export const StackClusterNode = memo(StackClusterNodeInner);
