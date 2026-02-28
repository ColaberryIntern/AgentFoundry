import { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const mainNav: NavItem[] = [
  {
    label: 'Intelligence Map',
    path: '/',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"
        />
      </svg>
    ),
  },
  {
    label: 'Use Cases',
    path: '/use-cases',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  },
  {
    label: 'Agent Stacks',
    path: '/agents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    label: 'Taxonomy',
    path: '/taxonomy',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
  },
  {
    label: 'Certifications',
    path: '/certifications',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
    ),
  },
  {
    label: 'Deployments',
    path: '/deployments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
    ),
  },
  {
    label: 'System Health',
    path: '/system-health',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
  },
];

const toolsNav: NavItem[] = [
  {
    label: 'Reports',
    path: '/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    label: 'Custom Reports',
    path: '/reports/custom',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    label: 'Notifications',
    path: '/notifications',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  },
  {
    label: 'Webhooks',
    path: '/webhooks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    ),
  },
  {
    label: 'Recommendations',
    path: '/recommendations',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
];

const adminNav: NavItem[] = [
  {
    label: 'Manage Roles',
    path: '/admin/roles',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  const isActive = useCallback(
    (path: string) => {
      if (path === '/') return location.pathname === '/';
      return location.pathname === path || location.pathname.startsWith(path + '/');
    },
    [location.pathname],
  );

  const linkClasses = (path: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
     ${
       isActive(path)
         ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
         : 'text-gray-600 dark:text-gray-400 hover:bg-[var(--sidebar-item-hover)] hover:text-gray-900 dark:hover:text-gray-200'
     }`;

  const showAdmin = user?.role === 'it_admin';

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full flex flex-col
          bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]
          backdrop-blur-[var(--glass-blur)]
          transition-all duration-200 ease-in-out
          ${collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-[var(--topbar-height)] px-4 border-b border-[var(--sidebar-border)]">
          {!collapsed && (
            <Link
              to="/"
              className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-lg"
              onClick={onMobileClose}
            >
              <span className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                A
              </span>
              Agent OS
            </Link>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] transition-colors hidden lg:block"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] lg:hidden"
            aria-label="Close sidebar"
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

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main navigation">
          {/* Main */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Platform
              </p>
            )}
            {mainNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={linkClasses(item.path)}
                title={collapsed ? item.label : undefined}
                onClick={onMobileClose}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>

          {/* Tools */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Tools
              </p>
            )}
            {toolsNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={linkClasses(item.path)}
                title={collapsed ? item.label : undefined}
                onClick={onMobileClose}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>

          {/* Admin */}
          {showAdmin && (
            <div className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  Admin
                </p>
              )}
              {adminNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={linkClasses(item.path)}
                  title={collapsed ? item.label : undefined}
                  onClick={onMobileClose}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* User info at bottom */}
        {user && !collapsed && (
          <div className="px-4 py-3 border-t border-[var(--sidebar-border)]">
            <div className="text-xs text-[var(--text-secondary)] truncate">{user.email}</div>
            <div className="text-[10px] text-[var(--text-muted)] capitalize">
              {user.role?.replace(/_/g, ' ')}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
