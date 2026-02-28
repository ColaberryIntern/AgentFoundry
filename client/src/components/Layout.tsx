import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import OnboardingFlow from './OnboardingFlow';
import FeedbackWidget from './FeedbackWidget';
import NPSSurvey from './NPSSurvey';

const PUBLIC_ROUTES = ['/login', '/register'];

function Layout() {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);
  const showShell = !!user && !isPublicRoute;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Public layout (login, register) — no sidebar
  if (!showShell) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--surface-primary)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-700 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          Skip to main content
        </a>
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
        </main>
      </div>
    );
  }

  // Authenticated layout — sidebar + topbar
  return (
    <div className="min-h-screen bg-[var(--surface-primary)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-700 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
      >
        Skip to main content
      </a>

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <TopBar sidebarCollapsed={sidebarCollapsed} onMobileMenuOpen={() => setMobileOpen(true)} />

      <main
        id="main-content"
        tabIndex={-1}
        className={`
          pt-[var(--topbar-height)] min-h-screen outline-none
          transition-all duration-200
          ${sidebarCollapsed ? 'lg:pl-[var(--sidebar-collapsed-width)]' : 'lg:pl-[var(--sidebar-width)]'}
        `}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      <OnboardingFlow />
      <FeedbackWidget />
      <NPSSurvey />
    </div>
  );
}

export default Layout;
