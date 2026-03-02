import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleSectorVisibility, showAllSectors } from '../state/graphSlice';
import { MACRO_SECTORS } from '../altitude/macroSectors';
import type { MacroSectorId } from '../altitude/macroSectors';

/**
 * Collapsible checkbox panel for filtering macro sectors on the GLOBAL altitude.
 * Shows colored dot + label per sector with toggle visibility.
 */
export function SectorFilterBar() {
  const dispatch = useAppDispatch();
  const hiddenSectorIds =
    useAppSelector(
      (s) => (s.graph as unknown as { hiddenSectorIds?: MacroSectorId[] }).hiddenSectorIds,
    ) ?? [];
  const [collapsed, setCollapsed] = useState(true);

  const hiddenCount = hiddenSectorIds.length;

  return (
    <div className="absolute top-[160px] left-4 z-30">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md bg-[var(--surface-primary)]/80 backdrop-blur-md border border-white/5 text-[var(--text-muted)] hover:bg-white/5 transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
          <rect
            x="1"
            y="1"
            width="3.5"
            height="3.5"
            rx="0.5"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <rect
            x="5.5"
            y="1"
            width="3.5"
            height="3.5"
            rx="0.5"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <rect
            x="1"
            y="5.5"
            width="3.5"
            height="3.5"
            rx="0.5"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <rect
            x="5.5"
            y="5.5"
            width="3.5"
            height="3.5"
            rx="0.5"
            stroke="currentColor"
            strokeWidth="0.8"
          />
        </svg>
        Sectors {hiddenCount > 0 && `(${hiddenCount} hidden)`}
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          className={`opacity-50 transition-transform ${collapsed ? '' : 'rotate-180'}`}
        >
          <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </button>

      {!collapsed && (
        <div className="mt-1 p-2 rounded-lg bg-[var(--surface-primary)]/90 backdrop-blur-md border border-white/5 shadow-lg">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {MACRO_SECTORS.map((ms) => {
              const isHidden = hiddenSectorIds.includes(ms.id);
              return (
                <label
                  key={ms.id}
                  className="flex items-center gap-1.5 cursor-pointer text-[9px] hover:bg-white/5 rounded px-1 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => dispatch(toggleSectorVisibility(ms.id))}
                    className="w-3 h-3 rounded accent-blue-500"
                  />
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ms.glowColor }}
                  />
                  <span
                    className={`${isHidden ? 'text-[var(--text-muted)]/50 line-through' : 'text-[var(--text-primary)]'}`}
                  >
                    {ms.label}
                  </span>
                </label>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <button
              onClick={() => dispatch(showAllSectors())}
              className="mt-2 w-full px-2 py-1 text-[9px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md hover:bg-blue-500/20 transition-colors"
            >
              Show All
            </button>
          )}
        </div>
      )}
    </div>
  );
}
