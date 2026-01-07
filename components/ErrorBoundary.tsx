import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary component.
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-[#0a0a0a] text-white flex items-center justify-center p-6">
          <div className="max-w-xl w-full text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Something went wrong
            </h1>
            <p className="text-gray-400 text-lg">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <pre className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-left text-xs text-red-300 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="px-8 py-3 bg-[#e50914] text-white font-semibold rounded-lg hover:bg-[#c40812] transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
