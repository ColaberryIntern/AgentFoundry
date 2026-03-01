import { useAppSelector } from '../../store/hooks';
import { ALTITUDE_ORDER, ALTITUDE_DEPTH, ALTITUDE_LABELS } from './altitudeTypes';
import type { AltitudeLevel } from './altitudeTypes';

/**
 * Vertical dot indicator on the left side showing current altitude depth.
 * 5 dots representing GLOBAL → AGENT, with the current one highlighted.
 */
export function AltitudeIndicator() {
  const { currentAltitude } = useAppSelector((s) => s.graph);
  const currentDepth = ALTITUDE_DEPTH[currentAltitude];

  return (
    <div className="absolute top-1/2 left-3 -translate-y-1/2 z-20 flex flex-col items-center gap-3">
      {ALTITUDE_ORDER.map((level: AltitudeLevel, idx) => {
        const isActive = idx === currentDepth;
        const isPast = idx < currentDepth;

        return (
          <div key={level} className="relative group" title={ALTITUDE_LABELS[level]}>
            {/* Connecting line to next dot */}
            {idx < ALTITUDE_ORDER.length - 1 && (
              <div
                className={`absolute top-3 left-1/2 -translate-x-1/2 w-px h-3 ${
                  idx < currentDepth ? 'bg-blue-500/50' : 'bg-white/10'
                }`}
              />
            )}

            {/* Dot */}
            <div
              className={`w-2.5 h-2.5 rounded-full border transition-all duration-300 ${
                isActive
                  ? 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/30 scale-125'
                  : isPast
                    ? 'bg-blue-500/40 border-blue-500/30'
                    : 'bg-white/10 border-white/10'
              }`}
            />

            {/* Hover tooltip */}
            <div className="absolute left-5 top-1/2 -translate-y-1/2 hidden group-hover:block">
              <div className="px-2 py-0.5 rounded text-[9px] text-[var(--text-primary)] bg-[var(--surface-primary)]/90 border border-white/10 whitespace-nowrap shadow-lg">
                {ALTITUDE_LABELS[level]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
