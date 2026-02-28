interface MetricRingProps {
  value: number;
  max?: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function getColor(pct: number): string {
  if (pct >= 80) return 'var(--accent-green)';
  if (pct >= 60) return 'var(--accent-blue)';
  if (pct >= 40) return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

export function MetricRing({
  value,
  max = 100,
  label,
  size = 80,
  strokeWidth = 6,
  className = '',
}: MetricRingProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = getColor(pct);

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ring-bg)"
          strokeWidth={strokeWidth}
        />
        {/* Value ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center value */}
      <div
        className="absolute flex items-center justify-center"
        style={{ width: size, height: size, marginTop: 0 }}
      >
        <span className="text-lg font-bold" style={{ color }}>
          {Math.round(value)}
        </span>
      </div>
      <span className="text-xs text-[var(--text-secondary)] text-center leading-tight mt-0.5">
        {label}
      </span>
    </div>
  );
}

/**
 * Compact inline metric ring for use inside cards/tables.
 */
export function MetricRingInline({
  value,
  max = 100,
  size = 32,
  strokeWidth = 3,
}: Pick<MetricRingProps, 'value' | 'max' | 'size' | 'strokeWidth'>) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = getColor(pct);

  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ring-bg)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold" style={{ color }}>
        {Math.round(value)}
      </span>
    </span>
  );
}
