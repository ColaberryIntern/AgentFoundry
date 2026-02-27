import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import GlobalSearch from './GlobalSearch';

function Navbar() {
  const { t } = useTranslation('navigation');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  /** Returns aria-current="page" when the given path matches the current route */
  const ariaCurrent = (path: string): { 'aria-current'?: 'page' } =>
    location.pathname === path ? { 'aria-current': 'page' as const } : {};

  const openGlobalSearch = useCallback(() => setGlobalSearchOpen(true), []);
  const closeGlobalSearch = useCallback(() => setGlobalSearchOpen(false), []);

  const handleLogout = () => {
    dispatch(logout());
    setMobileMenuOpen(false);
    navigate('/');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'c_suite':
        return 'C-Suite';
      case 'compliance_officer':
        return 'Compliance Officer';
      case 'it_admin':
        return 'IT Admin';
      default:
        return role;
    }
  };

  // Global Ctrl+K / Cmd+K listener to open search
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
    <nav
      role="navigation"
      aria-label={t('mainNavigation')}
      className="bg-primary-700 text-white shadow-md"
    >
      <GlobalSearch isOpen={globalSearchOpen} onClose={closeGlobalSearch} />
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Agent Foundry
        </Link>

        {/* Desktop nav items */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              {/* Search button */}
              <button
                onClick={openGlobalSearch}
                className="flex items-center gap-1.5 px-2.5 py-1 text-sm text-primary-200 hover:text-white transition-colors rounded-md hover:bg-primary-600"
                title={`${t('search')} (${t('searchShortcut')})`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="text-xs text-primary-300">{t('searchShortcut')}</span>
              </button>
              <span className="text-sm text-primary-200">
                {user.email} ({roleLabel(user.role)})
              </span>
              <Link
                to="/dashboard"
                {...ariaCurrent('/dashboard')}
                className="px-3 py-1 text-sm hover:text-primary-200 transition-colors"
              >
                {t('dashboard')}
              </Link>
              <Link
                to="/reports"
                {...ariaCurrent('/reports')}
                className="px-3 py-1 text-sm hover:text-primary-200 transition-colors"
              >
                {t('reports')}
              </Link>
              <Link
                to="/reports/custom"
                {...ariaCurrent('/reports/custom')}
                className="px-3 py-1 text-sm hover:text-primary-200 transition-colors"
              >
                {t('customReports')}
              </Link>
              <Link
                to="/webhooks"
                {...ariaCurrent('/webhooks')}
                className="px-3 py-1 text-sm hover:text-primary-200 transition-colors"
              >
                {t('webhooks')}
              </Link>
              <Link
                to="/recommendations"
                {...ariaCurrent('/recommendations')}
                className="px-3 py-1 text-sm hover:text-primary-200 transition-colors"
              >
                {t('recommendations')}
              </Link>
              <Link
                to="/compliance"
                {...ariaCurrent('/compliance')}
                className="px-3 py-1 text-sm hover:text-primary-200 transition-colors"
              >
                Advanced Compliance
              </Link>
              {user.role === 'it_admin' && (
                <Link
                  to="/agents"
                  {...ariaCurrent('/agents')}
                  className="px-3 py-1 text-sm hover:text-primary-200 transition-colors"
                >
                  Agents
                </Link>
              )}
              {user.role === 'it_admin' && (
                <Link
                  to="/admin/roles"
                  {...ariaCurrent('/admin/roles')}
                  className="px-3 py-1 text-sm hover:text-primary-200 transition-colors"
                >
                  {t('manageRoles')}
                </Link>
              )}
              <NotificationBell />
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm bg-primary-800 hover:bg-primary-900 rounded-md transition-colors"
              >
                {t('auth:logout', 'Logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-1 text-sm hover:text-primary-200 transition-colors"
              >
                {t('signIn')}
              </Link>
              <Link
                to="/register"
                className="px-3 py-1 text-sm bg-white text-primary-700 rounded-md hover:bg-primary-50 transition-colors font-medium"
              >
                {t('getStarted')}
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={t('toggleMenu')}
            aria-expanded={mobileMenuOpen}
            className="p-1.5 rounded-md hover:bg-primary-600 transition-colors"
          >
            {mobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-primary-600 px-4 py-3 space-y-2">
          {user ? (
            <>
              <div className="text-sm text-primary-200 pb-2 border-b border-primary-600">
                {user.email} ({roleLabel(user.role)})
              </div>
              <button
                onClick={() => {
                  closeMobileMenu();
                  openGlobalSearch();
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {t('search')}
              </button>
              <Link
                to="/dashboard"
                onClick={closeMobileMenu}
                className="block px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
              >
                {t('dashboard')}
              </Link>
              <Link
                to="/reports"
                onClick={closeMobileMenu}
                className="block px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
              >
                {t('reports')}
              </Link>
              <Link
                to="/reports/custom"
                onClick={closeMobileMenu}
                className="block px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
              >
                {t('customReports')}
              </Link>
              <Link
                to="/webhooks"
                onClick={closeMobileMenu}
                className="block px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
              >
                {t('webhooks')}
              </Link>
              <Link
                to="/recommendations"
                onClick={closeMobileMenu}
                className="block px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
              >
                {t('recommendations')}
              </Link>
              <Link
                to="/compliance"
                onClick={closeMobileMenu}
                className="block px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
              >
                Advanced Compliance
              </Link>
              {user.role === 'it_admin' && (
                <Link
                  to="/agents"
                  onClick={closeMobileMenu}
                  className="block px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
                >
                  Agents
                </Link>
              )}
              {user.role === 'it_admin' && (
                <Link
                  to="/admin/roles"
                  onClick={closeMobileMenu}
                  className="block px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
                >
                  {t('manageRoles')}
                </Link>
              )}
              <Link
                to="/notifications"
                onClick={closeMobileMenu}
                className="block px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
              >
                {t('notifications')}
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm bg-primary-800 hover:bg-primary-900 rounded-md transition-colors"
              >
                {t('auth:logout', 'Logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="block px-3 py-2 text-sm hover:bg-primary-600 rounded-md transition-colors"
              >
                {t('signIn')}
              </Link>
              <Link
                to="/register"
                onClick={closeMobileMenu}
                className="block px-3 py-2 text-sm bg-white text-primary-700 rounded-md hover:bg-primary-50 transition-colors font-medium text-center"
              >
                {t('getStarted')}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
