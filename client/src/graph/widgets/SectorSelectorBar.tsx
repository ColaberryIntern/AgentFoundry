import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setFocusedSector } from '../state/graphSlice';
import { MACRO_SECTORS } from '../altitude/macroSectors';
import type { MacroSectorId } from '../altitude/macroSectors';

/**
 * Horizontal pill selector for sector focus mode on the GLOBAL altitude.
 * "ALL" resets to global view; clicking a sector pill activates focus mode.
 */
export function SectorSelectorBar({ visibleSectorIds }: { visibleSectorIds: Set<MacroSectorId> }) {
  const dispatch = useAppDispatch();
  const focusedSectorId =
    useAppSelector(
      (s) => (s.graph as unknown as { focusedSectorId?: MacroSectorId | null }).focusedSectorId,
    ) ?? null;

  const visibleSectors = MACRO_SECTORS.filter((ms) => visibleSectorIds.has(ms.id));

  const handleSelect = (sectorId: MacroSectorId | null) => {
    dispatch(setFocusedSector(sectorId));
  };

  return (
    <div className="absolute top-[160px] left-4 z-30">
      <div className="flex flex-col gap-1 p-1.5 rounded-xl bg-[var(--surface-primary)]/80 backdrop-blur-md border border-white/5 shadow-lg max-w-[180px]">
        {/* ALL pill */}
        <button
          onClick={() => handleSelect(null)}
          className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-lg transition-all duration-200 text-left ${
            focusedSectorId === null
              ? 'bg-white/15 text-[var(--text-primary)] border border-white/20 shadow-sm'
              : 'text-[var(--text-muted)] hover:bg-white/5 border border-transparent'
          }`}
        >
          ALL SECTORS
        </button>

        {/* Sector pills */}
        {visibleSectors.map((ms) => {
          const isActive = focusedSectorId === ms.id;
          return (
            <button
              key={ms.id}
              onClick={() => handleSelect(ms.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-all duration-200 text-left ${
                isActive
                  ? 'bg-white/15 text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:bg-white/5'
              }`}
              style={{
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: isActive ? `${ms.glowColor}40` : 'transparent',
                boxShadow: isActive ? `0 0 8px ${ms.glowColor}20` : undefined,
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: ms.glowColor }}
              />
              {ms.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
