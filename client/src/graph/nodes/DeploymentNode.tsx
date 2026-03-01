import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseGraphNode } from './BaseGraphNode';
import type { DeploymentNodeData } from '../types/graphTypes';

const ENV_COLORS: Record<string, string> = {
  production: 'text-emerald-400 bg-emerald-500/15',
  staging: 'text-amber-400 bg-amber-500/15',
  development: 'text-blue-400 bg-blue-500/15',
};

function DeploymentNodeComponent({ data }: NodeProps) {
  const d = data as DeploymentNodeData;
  const errorRate = d.executionCount > 0 ? (d.errorCount / d.executionCount) * 100 : 0;

  return (
    <BaseGraphNode nodeType="deployment" data={d}>
      <div className="flex items-center gap-2">
        <span
          className={`px-1.5 py-0.5 text-[9px] font-medium rounded capitalize ${ENV_COLORS[d.environment] ?? ENV_COLORS.development}`}
        >
          {d.environment}
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${d.activeStatus ? 'bg-emerald-400' : 'bg-gray-500'}`}
        />
      </div>
      {d.performanceScore != null && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-[10px] text-[var(--text-muted)]">Perf</span>
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${d.performanceScore}%` }}
            />
          </div>
          <span className="text-[9px] text-indigo-400">{Math.round(d.performanceScore)}%</span>
        </div>
      )}
      <div className="flex items-center gap-3 mt-1 text-[9px] text-[var(--text-muted)]">
        <span>{d.executionCount.toLocaleString()} exec</span>
        {errorRate > 0 && (
          <span className={errorRate > 10 ? 'text-red-400' : 'text-amber-400'}>
            {errorRate.toFixed(1)}% err
          </span>
        )}
      </div>
    </BaseGraphNode>
  );
}

export const DeploymentNode = memo(DeploymentNodeComponent);
