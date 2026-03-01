import type { IndustryNodeData } from '../types/graphTypes';

export function IndustryPanel({ data }: { data: IndustryNodeData }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-bold text-[var(--text-primary)]">{data.title}</div>
        <div className="text-sm text-blue-400 font-mono">NAICS {data.code}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricBox label="Use Cases" value={data.useCaseCount} />
        <MetricBox label="Agents" value={data.variantCount} />
        <MetricBox label="Certified" value={data.certifiedCount} color="text-emerald-400" />
        <MetricBox label="Sector" value={data.sector} />
      </div>

      <div>
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Intelligence
        </div>
        <div className="space-y-2">
          <BarMetric
            label="Coverage"
            value={data.variantCount > 0 ? (data.certifiedCount / data.variantCount) * 100 : 0}
          />
          <BarMetric label="Use Case Density" value={Math.min(data.useCaseCount * 10, 100)} />
        </div>
      </div>

      <div className="text-[10px] text-[var(--text-muted)] font-mono pt-2 border-t border-white/5">
        ID: industry-{data.code}
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className={`text-lg font-bold ${color ?? 'text-[var(--text-primary)]'}`}>{value}</div>
    </div>
  );
}

function BarMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-muted)] w-24">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{ width: `${Math.round(value)}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-muted)] w-8 text-right">{Math.round(value)}%</span>
    </div>
  );
}
