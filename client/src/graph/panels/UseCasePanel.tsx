import type { UseCaseNodeData } from '../types/graphTypes';

export function UseCasePanel({ data }: { data: UseCaseNodeData }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-bold text-[var(--text-primary)] leading-relaxed">
          {data.outcomeStatement}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={data.status ?? 'draft'} />
        <span className="px-2 py-0.5 text-xs rounded bg-amber-500/15 text-amber-400 capitalize">
          {data.monetizationType?.replace(/_/g, ' ')}
        </span>
      </div>

      {data.kpi && (
        <Field label="Measurable KPI">
          <p className="text-sm text-[var(--text-primary)]">{data.kpi}</p>
        </Field>
      )}

      {data.urgencyScore != null && (
        <Field label="Urgency Score">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${data.urgencyScore * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-amber-400">
              {Math.round(data.urgencyScore * 100)}%
            </span>
          </div>
        </Field>
      )}

      {data.regulatoryScope.length > 0 && (
        <Field label="Regulatory Scope">
          <div className="flex flex-wrap gap-1.5">
            {data.regulatoryScope.map((reg) => (
              <span
                key={reg}
                className="px-2 py-0.5 text-xs rounded bg-purple-500/15 text-purple-400"
              >
                {reg}
              </span>
            ))}
          </div>
        </Field>
      )}

      {data.industryScope.length > 0 && (
        <Field label="Industry Scope">
          <div className="flex flex-wrap gap-1.5">
            {data.industryScope.map((code) => (
              <span key={code} className="px-2 py-0.5 text-xs rounded bg-blue-500/15 text-blue-400">
                {code}
              </span>
            ))}
          </div>
        </Field>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-400',
    draft: 'bg-gray-500/15 text-gray-400',
    deprecated: 'bg-red-500/15 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded capitalize ${colors[status] ?? colors.draft}`}>
      {status}
    </span>
  );
}
