import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

function HomePage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-3xl sm:text-4xl font-bold text-primary-700 dark:text-primary-400 mb-4">
        Agent Foundry
      </h1>
      <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-xl px-4 sm:px-0">
        AI-powered regulatory compliance platform. Automated governance for C-suite executives.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        {user ? (
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
          >
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/register"
              className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 border border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400 rounded-md hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors font-medium"
            >
              Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default HomePage;
