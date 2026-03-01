import { useEffect, useCallback } from 'react';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DetailDrawer({ open, onClose, title, subtitle, children }: DetailDrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-white/10 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-tight">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">{children}</div>
      </div>
    </div>
  );
}

/** Reusable labeled field for detail drawers */
export function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-sm text-[var(--text-primary)]">{children}</div>
    </div>
  );
}

/** Monospace ID field with copy-on-click */
export function DrawerIdField({ label, value }: { label: string; value: string }) {
  return (
    <DrawerField label={label}>
      <span
        className="font-mono text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
        title="Click to copy"
        onClick={() => navigator.clipboard.writeText(value)}
      >
        {value}
      </span>
    </DrawerField>
  );
}

/** Score bar (0-1 or 0-100) */
export function DrawerScoreBar({
  label,
  value,
  max = 1,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = max <= 1 ? value * 100 : value;
  const color =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 60
        ? 'bg-blue-500'
        : pct >= 40
          ? 'bg-amber-500'
          : 'bg-red-500';

  return (
    <DrawerField label={label}>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-mono text-[var(--text-secondary)] w-12 text-right">
          {pct.toFixed(0)}%
        </span>
      </div>
    </DrawerField>
  );
}
