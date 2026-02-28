import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import GlobalSearch from './GlobalSearch';

interface TopBarProps {
  sidebarCollapsed: boolean;
  onMobileMenuOpen: () => void;
}

export default function TopBar({ sidebarCollapsed, onMobileMenuOpen }: TopBarProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  const openGlobalSearch = useCallback(() => setGlobalSearchOpen(true), []);
  const closeGlobalSearch = useCallback(() => setGlobalSearchOpen(false), []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  return (
    <header
      className={`
        fixed top-0 right-0 z-30 h-[var(--topbar-height)]
        bg-[var(--topbar-bg)] border-b border-[var(--topbar-border)]
        backdrop-blur-[var(--glass-blur)]
        flex items-center justify-between px-4 gap-4
        transition-all duration-200
        ${sidebarCollapsed ? 'left-0 lg:left-[var(--sidebar-collapsed-width)]' : 'left-0 lg:left-[var(--sidebar-width)]'}
      `}
    >
      <GlobalSearch isOpen={globalSearchOpen} onClose={closeGlobalSearch} />

      {/* Left: mobile hamburger + search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuOpen}
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-white/10 lg:hidden"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <button
          onClick={openGlobalSearch}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-[var(--text-muted)]">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user && <NotificationBell />}
        {user && (
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
