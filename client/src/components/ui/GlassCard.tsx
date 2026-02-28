import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export function GlassCard({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
}: GlassCardProps) {
  return (
    <div
      className={`
        rounded-xl
        bg-white/70 dark:bg-white/5
        border border-gray-200/60 dark:border-white/10
        backdrop-blur-[var(--glass-blur)]
        shadow-[var(--glass-shadow)]
        ${paddingMap[padding]}
        ${hover ? 'transition-all duration-200 hover:bg-white/90 dark:hover:bg-white/[0.08] hover:shadow-lg cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
