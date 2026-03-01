import { useSimulation } from './SimulationProvider';
import { useSimulationData } from './useSimulationData';

export function SimulationBanner() {
  const { active, exit, enteredAt, altitudeLabel } = useSimulation();
  const { stats } = useSimulationData();

  if (!active) return null;

  const elapsed = enteredAt ? Math.round((Date.now() - enteredAt) / 1000) : 0;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Simulation Mode
          </span>
          <span className="text-[10px] text-amber-300/60">@ {altitudeLabel}</span>
        </div>
        {stats.total > 0 && (
          <div className="flex items-center gap-2 text-[10px] text-amber-300/70">
            {stats.added > 0 && <span className="text-emerald-400">+{stats.added}</span>}
            {stats.modified > 0 && <span className="text-amber-400">~{stats.modified}</span>}
            {stats.removed > 0 && <span className="text-red-400">-{stats.removed}</span>}
          </div>
        )}
        <span className="text-[10px] text-amber-300/50 font-mono">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
      <button
        onClick={exit}
        className="px-3 py-1 text-xs font-medium text-amber-200 bg-amber-500/20 rounded-md hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
      >
        Exit Simulation
      </button>
    </div>
  );
}
