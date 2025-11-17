import React from 'react';

export interface ErrorStateProps {
  /**
   * Error message to display
   */
  message: string;

  /**
   * Additional error details (technical information)
   */
  details?: string;

  /**
   * Retry callback function
   */
  onRetry?: () => void;

  /**
   * Icon class (Font Awesome icon)
   * @default 'fas fa-exclamation-circle'
   */
  icon?: string;

  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable error state component for displaying error messages with retry option.
 * WCAG AAA compliant with high contrast and assertive live region.
 *
 * @example
 * <ErrorState
 *   message="Failed to load features"
 *   details="Network error: Connection timeout"
 *   onRetry={handleRetry}
 * />
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  details,
  onRetry,
  icon = 'fas fa-exclamation-circle',
  size = 'md'
}) => {
  const sizeClass = {
    sm: 'error-state-sm',
    md: 'error-state-md',
    lg: 'error-state-lg'
  }[size];

  return (
    <div
      className={`error-state ${sizeClass}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <i className={`${icon} error-state-icon`} aria-hidden="true"></i>
      <h3 className="error-state-title">{message}</h3>
      {details && <p className="error-state-details">{details}</p>}
      <div className="error-state-actions">
        {onRetry && (
          <button
            className="error-state-retry-btn"
            onClick={onRetry}
            aria-label="Retry loading"
          >
            <i className="fas fa-redo-alt" aria-hidden="true"></i>
            Retry
          </button>
        )}
        <button
          className="error-state-dismiss-btn"
          onClick={() => {
            // Component can be dismissed or parent can handle this
            // For now, just provide visual feedback
          }}
          aria-label="Dismiss error"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default ErrorState;
