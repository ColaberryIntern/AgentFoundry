import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import OnboardingFlow from './OnboardingFlow';
import FeedbackWidget from './FeedbackWidget';

function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 dark:border-gray-800 py-4 text-center text-sm text-gray-500">
        Agent Foundry &copy; {new Date().getFullYear()}
      </footer>
      <OnboardingFlow />
      <FeedbackWidget />
    </div>
  );
}

export default Layout;
