import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-md">
            This page encountered an unexpected error. You can try again or navigate to a different
            page.
          </p>
          {this.state.error && (
            <pre className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg p-3 mb-4 max-w-lg overflow-x-auto">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
