'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  feature?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component for graceful error handling
 * Catches JavaScript errors anywhere in child component tree
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.feature || 'component'}:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-400 mb-4 max-w-sm">
            {this.props.feature
              ? `There was an error loading ${this.props.feature}.`
              : 'An unexpected error occurred.'}
          </p>
          <Button onClick={this.handleRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary feature={feature}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Simple error message component for inline errors
 */
export function ErrorMessage({
  message = 'Something went wrong',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
      <p className="text-gray-400 text-center mb-3">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && <Icon className="h-12 w-12 text-gray-500 mb-4" />}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && <p className="text-gray-400 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
