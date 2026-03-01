import { scoreToColor } from '../utils/performanceUtils';

interface HealthMetrics {
  overall: number;
  health: number;
  coverage: number;
  drift: number;
  complianceExposure: number;
  expansionOpportunity: number;
}

interface Props {
  metrics: HealthMetrics;
  onClose: () => void;
}

const METRIC_LABELS: Array<{
  key: keyof Omit<HealthMetrics, 'overall'>;
  label: string;
  icon: string;
}> = [
  { key: 'health', label: 'Intelligence Health', icon: '~' },
  { key: 'coverage', label: 'Cert Coverage', icon: '%' },
  { key: 'drift', label: 'Drift Score', icon: 'D' },
  { key: 'complianceExposure', label: 'Compliance', icon: 'C' },
  { key: 'expansionOpportunity', label: 'Expansion', icon: 'E' },
];

export function SystemHealthBreakdown({ metrics, onClose }: Props) {
  return (
    <div className="absolute top-14 right-0 w-[280px] bg-[var(--surface-primary)]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
          System Health
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-white/5 text-[var(--text-muted)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            backgroundColor: scoreToColor(metrics.overall) + '20',
            color: scoreToColor(metrics.overall),
          }}
        >
          {metrics.overall}
        </div>
        <div>
          <div className="text-xs font-medium text-[var(--text-primary)]">Overall Score</div>
          <div className="text-[10px] text-[var(--text-muted)]">
            {metrics.overall >= 80
              ? 'Healthy'
              : metrics.overall >= 50
                ? 'Attention Needed'
                : 'Critical'}
          </div>
        </div>
      </div>

      {/* Radial SVG breakdown */}
      <div className="flex justify-center py-2">
        <svg width="180" height="180" viewBox="-90 -90 180 180">
          {METRIC_LABELS.map(({ key }, i) => {
            const angle = (i / METRIC_LABELS.length) * Math.PI * 2 - Math.PI / 2;
            const value = metrics[key];
            const color = scoreToColor(value);
            const barLength = (value / 100) * 60;
            const x1 = Math.cos(angle) * 20;
            const y1 = Math.sin(angle) * 20;
            const x2 = Math.cos(angle) * (20 + barLength);
            const y2 = Math.sin(angle) * (20 + barLength);
            const labelX = Math.cos(angle) * 85;
            const labelY = Math.sin(angle) * 85;

            return (
              <g key={key}>
                {/* Background line */}
                <line
                  x1={Math.cos(angle) * 20}
                  y1={Math.sin(angle) * 20}
                  x2={Math.cos(angle) * 80}
                  y2={Math.sin(angle) * 80}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                {/* Value line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth={4}
                  strokeLinecap="round"
                  opacity={0.8}
                />
                {/* Score label */}
                <text
                  x={labelX}
                  y={labelY + 3}
                  fill={color}
                  fontSize={9}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {value}
                </text>
              </g>
            );
          })}
          {/* Center label */}
          <text
            x={0}
            y={4}
            fill="white"
            fontSize={18}
            textAnchor="middle"
            fontWeight="bold"
            opacity={0.9}
          >
            {metrics.overall}
          </text>
        </svg>
      </div>

      {/* Metric list */}
      <div className="space-y-1.5">
        {METRIC_LABELS.map(({ key, label }) => {
          const value = metrics[key];
          const color = scoreToColor(value);
          return (
            <div key={key} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-medium" style={{ color }}>
                    {value}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 mt-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${value}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
