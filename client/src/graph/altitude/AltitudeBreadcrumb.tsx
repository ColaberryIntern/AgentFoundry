import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { AltitudeController } from './AltitudeController';
import { useAltitudeController } from './useAltitudeController';
import { ALTITUDE_LABELS } from './altitudeTypes';
import { setFocusedSector } from '../state/graphSlice';
import { MACRO_SECTORS } from './macroSectors';
import type { MacroSectorId } from './macroSectors';

/**
 * Horizontal breadcrumb bar: Global > Sector > Industry > Use Case > Stack > Agent
 * Each segment is clickable to jump to that altitude.
 * Sector crumb navigates to GLOBAL with focusedSectorId set.
 */
export function AltitudeBreadcrumb() {
  const dispatch = useAppDispatch();
  const { currentAltitude, altitudeContext } = useAppSelector((s) => s.graph);
  const { industries, useCases, skeletons, variants } = useAppSelector((s) => s.registry);
  const { handleJumpTo } = useAltitudeController();

  const focusedSectorId =
    useAppSelector(
      (s) => (s.graph as unknown as { focusedSectorId?: MacroSectorId | null }).focusedSectorId,
    ) ?? null;

  // Resolve sector label from context or focused sector
  const sectorLabel = useMemo(() => {
    const sid = altitudeContext.sectorId ?? focusedSectorId;
    if (!sid) return null;
    return MACRO_SECTORS.find((ms) => ms.id === sid)?.label ?? null;
  }, [altitudeContext.sectorId, focusedSectorId]);

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
    sectorLabel,
  );

  const handleCrumbClick = (crumb: (typeof breadcrumbs)[0]) => {
    if (crumb.isSectorCrumb && crumb.sectorId) {
      // Navigate to GLOBAL with this sector focused
      handleJumpTo('GLOBAL', {
        sectorId: crumb.sectorId,
        industryCode: null,
        useCaseId: null,
        skeletonId: null,
        variantId: null,
      });
      dispatch(setFocusedSector(crumb.sectorId as MacroSectorId));
    } else {
      handleJumpTo(crumb.level, crumb.context);
      // If jumping to GLOBAL without sector crumb, clear sector focus
      if (crumb.level === 'GLOBAL' && !crumb.isSectorCrumb) {
        dispatch(setFocusedSector(null));
      }
    }
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--surface-primary)]/80 backdrop-blur-md border border-white/5 shadow-lg">
      {breadcrumbs.map((crumb, idx) => {
        const isActive = idx === breadcrumbs.length - 1;
        const isClickable = !isActive;

        return (
          <div key={`${crumb.level}-${idx}`} className="flex items-center">
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
              onClick={() => isClickable && handleCrumbClick(crumb)}
              disabled={isActive}
              className={`text-[11px] font-medium px-1.5 py-0.5 rounded transition-colors ${
                isActive
                  ? 'text-blue-400 cursor-default'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer'
              }`}
              title={crumb.isSectorCrumb ? crumb.label : ALTITUDE_LABELS[crumb.level]}
            >
              {crumb.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
