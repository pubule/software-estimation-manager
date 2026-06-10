import React from 'react';

interface ErrorBoundaryProps {
  /**
   * Content to render when no error is present
   */
  children: React.ReactNode;

  /**
   * Optional custom fallback UI to render on error.
   * When omitted, the default error-boundary-fallback is used.
   */
  fallback?: React.ReactNode;

  /**
   * Optional callback invoked when an error is caught.
   * Useful for logging errors to an external service.
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;

  /**
   * Label shown in the fallback to identify which section failed.
   * @default 'This section'
   */
  sectionLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary class component.
 *
 * Catches JavaScript errors anywhere in its child component tree,
 * logs them, and renders a fallback UI instead of crashing the
 * entire application.
 *
 * Must be a class component because React does not yet support
 * error boundaries as function components.
 *
 * @example
 * <ErrorBoundary sectionLabel="Features">
 *   <FeaturesPage />
 * </ErrorBoundary>
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const sectionLabel = this.props.sectionLabel ?? 'This section';

    return (
      <div className="error-boundary-fallback" role="alert" aria-live="assertive">
        <div className="error-boundary-fallback-icon" aria-hidden="true">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h3 className="error-boundary-fallback-title">Something went wrong</h3>
        <p className="error-boundary-fallback-message">
          {sectionLabel} encountered an unexpected error and could not render.
        </p>
        {this.state.error && (
          <details className="error-boundary-fallback-details">
            <summary>Technical details</summary>
            <pre>{this.state.error.message}</pre>
          </details>
        )}
        <div className="error-boundary-fallback-actions">
          <button
            className="error-boundary-fallback-retry-btn"
            onClick={this.handleReset}
            aria-label={`Retry loading ${sectionLabel}`}
          >
            <i className="fas fa-redo-alt" aria-hidden="true"></i>
            Try again
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
