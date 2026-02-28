import type { ScanLogEntry } from '../../types/orchestrator';

interface OrchestratorTimelineProps {
  scans: ScanLogEntry[];
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function OrchestratorTimeline({ scans }: OrchestratorTimelineProps) {
  if (scans.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)] text-center py-4">No scan activity yet</p>
    );
  }

  return (
    <div className="space-y-0">
      {scans.map((scan, idx) => (
        <div key={scan.id} className="flex gap-3">
          {/* Timeline line + dot */}
          <div className="flex flex-col items-center">
            <div
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
                scan.errorMessage
                  ? 'bg-red-500'
                  : scan.intentsDetected > 0
                    ? 'bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            {idx < scans.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 dark:bg-white/10 my-1" />
            )}
          </div>

          {/* Content */}
          <div className="pb-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {scan.scanType} scan
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {timeAgo(scan.startedAt)}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              {scan.intentsDetected} intent{scan.intentsDetected !== 1 ? 's' : ''}
              {' / '}
              {scan.actionsCreated} action{scan.actionsCreated !== 1 ? 's' : ''}
              {scan.guardrailsTriggered > 0 && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  ({scan.guardrailsTriggered} guardrail{scan.guardrailsTriggered !== 1 ? 's' : ''})
                </span>
              )}
              {scan.errorMessage && (
                <span className="text-red-600 dark:text-red-400 ml-1">Error</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
