import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import OnboardingFlow from './OnboardingFlow';
import FeedbackWidget from './FeedbackWidget';
import NPSSurvey from './NPSSurvey';

function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* Skip to main content — visible only on focus for keyboard / screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-700 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
      >
        Skip to main content
      </a>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 container mx-auto px-4 py-6 sm:px-6 lg:px-8 outline-none"
      >
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 dark:border-gray-800 py-4 text-center text-sm text-gray-500">
        Agent Foundry &copy; {new Date().getFullYear()}
      </footer>
      <OnboardingFlow />
      <FeedbackWidget />
      <NPSSurvey />
    </div>
  );
}

export default Layout;
