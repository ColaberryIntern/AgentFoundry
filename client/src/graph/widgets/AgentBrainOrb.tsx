import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleAgentBrain } from '../state/graphSlice';
import { useAltitudeScopedIntelligence } from '../intelligence/useAltitudeScopedIntelligence';

const ALTITUDE_RING_COLORS: Record<string, string> = {
  GLOBAL: '#6366f1',
  INDUSTRY: '#3b82f6',
  USE_CASE: '#f59e0b',
  STACK: '#a855f7',
  AGENT: '#06b6d4',
};

/**
 * Persistent AI avatar (right rail, vertically centered below SystemHealthOrb).
 * Shows altitude-scoped alert badge. Available at ALL altitudes.
 * Renamed from AgentBrainOrb; exported as both for backward compat.
 */
export function AgentBrainAvatar() {
  const dispatch = useAppDispatch();
  const agentBrainOpen = useAppSelector((s) => s.graph.agentBrainOpen);
  const scoped = useAltitudeScopedIntelligence();

  const totalAlerts = scoped.totalAlertCount;
  const hasAlerts = totalAlerts > 0;
  const ringColor = ALTITUDE_RING_COLORS[scoped.altitude] ?? '#6366f1';

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="absolute right-4 z-30" style={{ top: 'calc(50% + 48px)' }}>
      <button
        onClick={() => dispatch(toggleAgentBrain())}
        className={`relative w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all hover:scale-105 ${
          agentBrainOpen ? 'ring-2 ring-indigo-400/50' : ''
        }`}
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(12px)',
          border: `1.5px solid ${ringColor}40`,
          boxShadow: `0 0 20px ${ringColor}15, 0 4px 12px rgba(0,0,0,0.3)`,
        }}
        aria-label="Toggle Agent Intelligence"
      >
        {/* Animated gradient ring */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 52 52" fill="none">
          <circle
            cx="26"
            cy="26"
            r="24.5"
            stroke={`url(#avatar-ring-gradient)`}
            strokeWidth="1.5"
            strokeDasharray="60 94"
            className={prefersReducedMotion ? '' : 'animate-ring-glow'}
          />
          <defs>
            <linearGradient id="avatar-ring-gradient" x1="0" y1="0" x2="52" y2="52">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Neural face icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          {/* Eyes */}
          <circle cx="8.5" cy="10" r="2" fill={ringColor} opacity="0.9" />
          <circle cx="15.5" cy="10" r="2" fill={ringColor} opacity="0.9" />
          {/* Inner eye dots */}
          <circle cx="9" cy="9.5" r="0.6" fill="white" opacity="0.8" />
          <circle cx="16" cy="9.5" r="0.6" fill="white" opacity="0.8" />
          {/* Smile arc */}
          <path
            d="M8.5 16c0 0 1.5 2.5 3.5 2.5s3.5-2.5 3.5-2.5"
            stroke={ringColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>

        {/* Total alert badge */}
        {hasAlerts && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-lg">
            {totalAlerts > 99 ? '99+' : totalAlerts}
          </span>
        )}
      </button>
    </div>
  );
}

// Backward compatibility export
export const AgentBrainOrb = AgentBrainAvatar;
