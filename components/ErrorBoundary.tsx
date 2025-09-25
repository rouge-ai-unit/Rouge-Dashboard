"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: DefaultErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="mt-2">
            {error?.message || "An unexpected error occurred. Please try refreshing the page."}
          </AlertDescription>
        </Alert>

        <div className="mt-4 flex gap-2">
          <Button onClick={resetError} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 p-4 bg-muted rounded-lg">
            <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// Hook for functional components to use error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);

    // In a real app, you might want to send this to an error reporting service
    // like Sentry, LogRocket, or Bugsnag
  };
}

export default ErrorBoundary;
