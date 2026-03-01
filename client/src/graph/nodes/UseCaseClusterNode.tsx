import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { scoreToColor } from '../utils/performanceUtils';

/**
 * Rounded rectangle cluster bubble for INDUSTRY altitude.
 * Shows outcome, stack/deployment count, cert state, urgency bar.
 */
function UseCaseClusterNodeInner({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const label = (d.label as string) ?? '';
  const monetizationType = (d.monetizationType as string) ?? '';
  const urgencyScore = (d.urgencyScore as number | null) ?? null;
  const stackCount = (d.stackCount as number) ?? 0;
  const deploymentCount = (d.deploymentCount as number) ?? 0;
  const metrics = d.metrics as
    | {
        certHealthPercent: number;
        riskIndex: number;
      }
    | undefined;

  const certHealth = metrics?.certHealthPercent ?? 0;
  const certColor = scoreToColor(certHealth);

  return (
    <div
      className="relative rounded-xl min-w-[170px] max-w-[200px] backdrop-blur-md border border-amber-500/20 bg-amber-500/[0.06] shadow-sm cursor-pointer group hover:border-amber-500/40 transition-all duration-200"
      style={{ opacity: (d.opacity as number) ?? 1 }}
    >
      {/* Type badge */}
      <div className="absolute -top-2 -left-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
        UC
      </div>

      <div className="p-3 pt-4">
        {/* Outcome */}
        <div className="text-[11px] font-medium text-[var(--text-primary)] leading-tight line-clamp-2">
          {label}
        </div>

        {/* Monetization type */}
        {monetizationType && (
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5 capitalize">
            {monetizationType.replace(/_/g, ' ')}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] text-purple-400 font-medium">{stackCount} stacks</span>
          <span className="text-[9px] text-indigo-400 font-medium">{deploymentCount} deploys</span>
          <span
            className="w-2 h-2 rounded-full ml-auto"
            style={{ backgroundColor: certColor }}
            title={`Cert health: ${certHealth}%`}
          />
        </div>

        {/* Urgency bar */}
        {urgencyScore != null && (
          <div className="mt-1.5">
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${urgencyScore * 100}%`,
                  backgroundColor: scoreToColor(100 - urgencyScore * 100),
                }}
              />
            </div>
            <div className="text-[8px] text-[var(--text-muted)] mt-0.5">
              urgency {Math.round(urgencyScore * 100)}%
            </div>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-amber-500/60 !border-amber-400/30"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-amber-500/60 !border-amber-400/30"
      />
    </div>
  );
}

export const UseCaseClusterNode = memo(UseCaseClusterNodeInner);
