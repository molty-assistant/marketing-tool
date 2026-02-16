'use client';

import React from 'react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep it simple: log to console for local debugging.
    // (No external error reporting services by design.)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-xl bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center">
            <div className="text-4xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 mb-6">
              An unexpected error occurred while rendering this page.
            </p>
            {this.state.error?.message ? (
              <p className="text-sm text-slate-500 bg-slate-900/40 border border-slate-700/60 rounded-xl p-3 mb-6 break-words">
                {this.state.error.message}
              </p>
            ) : null}
            <button
              type="button"
              onClick={this.handleTryAgain}
              className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl transition-all"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
