import { useSimulation } from './SimulationProvider';
import { useSimulationData } from './useSimulationData';

export function SimulationDiffPanel() {
  const { active, exit } = useSimulation();
  const { modifications, stats } = useSimulationData();

  if (!active) return null;

  const actionColors = {
    add: 'text-emerald-400 bg-emerald-500/10',
    modify: 'text-amber-400 bg-amber-500/10',
    remove: 'text-red-400 bg-red-500/10',
  };

  const actionLabels = { add: 'Added', modify: 'Modified', remove: 'Removed' };

  return (
    <div className="w-[340px] h-full border-l border-white/5 bg-[var(--surface-primary)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Simulation Delta
          </div>
          <button
            onClick={exit}
            className="text-[10px] text-[var(--text-muted)] hover:text-amber-300 transition-colors"
          >
            Discard & Exit
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
          <span className="text-emerald-400">{stats.added} added</span>
          <span className="text-amber-400">{stats.modified} modified</span>
          <span className="text-red-400">{stats.removed} removed</span>
        </div>
      </div>

      {/* Modification List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {modifications.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--text-muted)]">
            No changes yet. Interact with the graph to create simulation modifications.
          </div>
        ) : (
          modifications.map((mod, i) => (
            <div
              key={`${mod.entityType}-${mod.entityId}-${i}`}
              className="p-2 rounded-lg bg-white/[0.03] border border-white/5"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase">
                  {mod.entityType}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${actionColors[mod.action]}`}
                >
                  {actionLabels[mod.action]}
                </span>
              </div>
              <div className="text-xs text-[var(--text-primary)] font-mono truncate">
                {mod.entityId}
              </div>
              {mod.field && (
                <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                  <span className="text-[var(--text-primary)]">{mod.field}</span>:{' '}
                  {mod.before != null && (
                    <span className="text-red-400 line-through mr-1">{String(mod.before)}</span>
                  )}
                  {mod.after != null && (
                    <span className="text-emerald-400">{String(mod.after)}</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
