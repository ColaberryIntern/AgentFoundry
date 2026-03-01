interface AutonomySliderProps {
  label: string;
  description: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  color?: string;
}

export function AutonomySlider({
  label,
  description,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  onChange,
  color = '#3b82f6',
}: AutonomySliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-[var(--text-primary)]">{label}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{description}</div>
        </div>
        <div className="text-sm font-bold text-[var(--text-primary)] min-w-[3rem] text-right">
          {value}
          {unit}
        </div>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{ width: `${percent}%`, backgroundColor: color }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full border-2 bg-[var(--surface-primary)] transition-all duration-200 pointer-events-none"
          style={{ left: `calc(${percent}% - 7px)`, borderColor: color }}
        />
      </div>
    </div>
  );
}
