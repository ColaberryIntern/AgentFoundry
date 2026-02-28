import type { GuardrailViolation } from '../../types/orchestrator';

interface GuardrailViolationBannerProps {
  violations: GuardrailViolation[];
  onResolve?: (id: string) => void;
}

export function GuardrailViolationBanner({ violations, onResolve }: GuardrailViolationBannerProps) {
  const unresolved = violations.filter((v) => !v.resolved);
  if (unresolved.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <span className="text-sm font-semibold text-red-700 dark:text-red-400">
          {unresolved.length} Guardrail Violation{unresolved.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-1.5">
        {unresolved.slice(0, 5).map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/50 dark:bg-white/5"
          >
            <div className="min-w-0">
              <span className="text-xs font-medium text-red-700 dark:text-red-400">
                [{v.guardrailType.replace(/_/g, ' ')}]
              </span>
              <span className="text-xs text-[var(--text-secondary)] ml-1.5">
                {v.severity === 'block' ? 'Blocked' : 'Warning'}
              </span>
            </div>
            {onResolve && (
              <button
                onClick={() => onResolve(v.id)}
                className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25 transition-colors font-medium"
              >
                Resolve
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
