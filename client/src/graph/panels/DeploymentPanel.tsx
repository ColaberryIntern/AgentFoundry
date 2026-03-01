import type { DeploymentNodeData } from '../types/graphTypes';

export function DeploymentPanel({ data }: { data: DeploymentNodeData }) {
  const errorRate = data.executionCount > 0 ? (data.errorCount / data.executionCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-bold text-[var(--text-primary)] capitalize">
          {data.environment} Deployment
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`w-2 h-2 rounded-full ${data.activeStatus ? 'bg-emerald-400' : 'bg-gray-500'}`}
          />
          <span className="text-sm text-[var(--text-muted)]">
            {data.activeStatus ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="text-[10px] text-[var(--text-muted)]">Executions</div>
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {data.executionCount.toLocaleString()}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="text-[10px] text-[var(--text-muted)]">Errors</div>
          <div
            className={`text-lg font-bold ${data.errorCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}
          >
            {data.errorCount.toLocaleString()}
          </div>
        </div>
      </div>

      {data.performanceScore != null && (
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Performance
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${data.performanceScore}%` }}
              />
            </div>
            <span className="text-sm font-medium text-indigo-400">
              {Math.round(data.performanceScore)}%
            </span>
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
          Error Rate
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${errorRate > 10 ? 'bg-red-500' : errorRate > 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(errorRate, 100)}%` }}
            />
          </div>
          <span
            className={`text-sm font-medium ${errorRate > 10 ? 'text-red-400' : errorRate > 5 ? 'text-amber-400' : 'text-emerald-400'}`}
          >
            {errorRate.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="text-[10px] text-[var(--text-muted)] font-mono pt-2 border-t border-white/5">
        Variant: {data.variantId}
      </div>
    </div>
  );
}
