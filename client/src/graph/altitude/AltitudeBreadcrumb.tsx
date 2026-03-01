import { useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import { AltitudeController } from './AltitudeController';
import { useAltitudeController } from './useAltitudeController';
import { ALTITUDE_LABELS } from './altitudeTypes';

/**
 * Horizontal breadcrumb bar: Global > Industry > Use Case > Stack > Agent
 * Each segment is clickable to jump to that altitude.
 */
export function AltitudeBreadcrumb() {
  const { currentAltitude, altitudeContext } = useAppSelector((s) => s.graph);
  const { industries, useCases, skeletons, variants } = useAppSelector((s) => s.registry);
  const { handleJumpTo } = useAltitudeController();

  // Build entity label lookup
  const entityLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const ind of industries) {
      labels[ind.code] = ind.title;
    }
    for (const uc of useCases) {
      labels[uc.id] =
        uc.outcomeStatement.length > 30
          ? uc.outcomeStatement.slice(0, 27) + '...'
          : uc.outcomeStatement;
    }
    for (const sk of skeletons) {
      labels[sk.id] = sk.name;
    }
    for (const v of variants) {
      labels[v.id] = v.name;
    }
    return labels;
  }, [industries, useCases, skeletons, variants]);

  const breadcrumbs = AltitudeController.computeBreadcrumbs(
    currentAltitude,
    altitudeContext,
    entityLabels,
  );

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--surface-primary)]/80 backdrop-blur-md border border-white/5 shadow-lg">
      {breadcrumbs.map((crumb, idx) => {
        const isActive = idx === breadcrumbs.length - 1;
        const isClickable = !isActive;

        return (
          <div key={crumb.level} className="flex items-center">
            {idx > 0 && (
              <svg
                className="w-3 h-3 text-[var(--text-muted)] mx-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            <button
              onClick={() => isClickable && handleJumpTo(crumb.level, crumb.context)}
              disabled={isActive}
              className={`text-[11px] font-medium px-1.5 py-0.5 rounded transition-colors ${
                isActive
                  ? 'text-blue-400 cursor-default'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer'
              }`}
              title={ALTITUDE_LABELS[crumb.level]}
            >
              {crumb.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
