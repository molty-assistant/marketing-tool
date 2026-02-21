'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

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
          <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
            <div className="text-4xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred while rendering this page.
            </p>
            {this.state.error?.message ? (
              <p className="text-sm text-muted-foreground bg-muted/50 border border-border rounded-xl p-3 mb-6 break-words">
                {this.state.error.message}
              </p>
            ) : null}
            <Button
              type="button"
              onClick={this.handleTryAgain}
              className="h-auto font-semibold px-5 py-3"
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
