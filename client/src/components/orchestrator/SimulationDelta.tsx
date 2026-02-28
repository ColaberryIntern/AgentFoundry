import type { SimulationResult } from '../../types/orchestrator';

interface SimulationDeltaProps {
  simulation: SimulationResult;
}

export function SimulationDelta({ simulation }: SimulationDeltaProps) {
  const hasBefore = Object.keys(simulation.before).length > 0;
  const hasAfter = Object.keys(simulation.after).length > 0;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden text-xs">
      {/* Header */}
      <div
        className={`px-3 py-1.5 font-medium ${
          simulation.passed
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
        }`}
      >
        Simulation {simulation.passed ? 'Passed' : 'Failed'}
      </div>

      {/* Before / After */}
      {(hasBefore || hasAfter) && (
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-white/10">
          <div className="p-2">
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase mb-1">
              Before
            </div>
            <pre className="text-[var(--text-secondary)] whitespace-pre-wrap break-all font-mono leading-relaxed">
              {hasBefore ? JSON.stringify(simulation.before, null, 2) : '(empty)'}
            </pre>
          </div>
          <div className="p-2">
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase mb-1">
              After
            </div>
            <pre className="text-[var(--text-secondary)] whitespace-pre-wrap break-all font-mono leading-relaxed">
              {hasAfter ? JSON.stringify(simulation.after, null, 2) : '(empty)'}
            </pre>
          </div>
        </div>
      )}

      {/* Risks */}
      {simulation.risks.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-white/10 bg-amber-50/50 dark:bg-amber-500/5">
          <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase mb-0.5">
            Risks
          </div>
          <ul className="space-y-0.5">
            {simulation.risks.map((risk, i) => (
              <li key={i} className="text-amber-700 dark:text-amber-400">
                - {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Violations */}
      {simulation.violations.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-white/10 bg-red-50/50 dark:bg-red-500/5">
          <div className="text-[10px] font-semibold text-red-700 dark:text-red-400 uppercase mb-0.5">
            Violations
          </div>
          <ul className="space-y-0.5">
            {simulation.violations.map((v, i) => (
              <li key={i} className="text-red-700 dark:text-red-400">
                - {v}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
