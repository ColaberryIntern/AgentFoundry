import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl sm:text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">404</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">Page not found</p>
      <Link
        to="/"
        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}

export default NotFoundPage;
