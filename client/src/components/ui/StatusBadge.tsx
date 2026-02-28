type BadgeVariant =
  | 'healthy'
  | 'running'
  | 'certified'
  | 'active'
  | 'completed'
  | 'online'
  | 'degraded'
  | 'pending'
  | 'paused'
  | 'warning'
  | 'expiring'
  | 'unhealthy'
  | 'error'
  | 'failed'
  | 'revoked'
  | 'offline'
  | 'expired'
  | 'stopped'
  | 'draft'
  | 'unknown'
  | 'uncertified'
  | 'info';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<string, { bg: string; text: string; dot: string }> = {
  // Green family
  healthy: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  running: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  certified: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  active: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  completed: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  online: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },

  // Amber family
  degraded: {
    bg: 'bg-amber-100 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  pending: {
    bg: 'bg-amber-100 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  paused: {
    bg: 'bg-amber-100 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  warning: {
    bg: 'bg-amber-100 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  expiring: {
    bg: 'bg-amber-100 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },

  // Red family
  unhealthy: {
    bg: 'bg-red-100 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  error: {
    bg: 'bg-red-100 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  failed: {
    bg: 'bg-red-100 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  revoked: {
    bg: 'bg-red-100 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  offline: {
    bg: 'bg-red-100 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  expired: {
    bg: 'bg-red-100 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },

  // Gray family
  stopped: {
    bg: 'bg-gray-100 dark:bg-gray-500/15',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
  draft: {
    bg: 'bg-gray-100 dark:bg-gray-500/15',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
  unknown: {
    bg: 'bg-gray-100 dark:bg-gray-500/15',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
  uncertified: {
    bg: 'bg-gray-100 dark:bg-gray-500/15',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
  },

  // Blue family
  info: {
    bg: 'bg-blue-100 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
};

export function StatusBadge({
  variant,
  label,
  dot = true,
  size = 'sm',
  className = '',
}: StatusBadgeProps) {
  const styles = variantStyles[variant] || variantStyles.unknown;
  const displayLabel =
    label || variant.charAt(0).toUpperCase() + variant.slice(1).replace(/_/g, ' ');

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${styles.bg} ${styles.text}
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`inline-block rounded-full ${styles.dot} ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        />
      )}
      {displayLabel}
    </span>
  );
}
