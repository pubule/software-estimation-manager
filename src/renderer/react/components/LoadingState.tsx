import React from 'react';

export interface LoadingStateProps {
  /**
   * Message to display while loading
   * @default 'Loading...'
   */
  message?: string;

  /**
   * Icon class (Font Awesome icon)
   * @default 'fas fa-spinner'
   */
  icon?: string;

  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to show as full overlay (fixed positioning)
   * @default false
   */
  isOverlay?: boolean;
}

/**
 * Reusable loading state component for displaying loading indicators.
 * WCAG AA compliant with aria-busy and live region support.
 *
 * @example
 * <LoadingState message="Loading features..." />
 *
 * @example
 * <LoadingState isOverlay={true} message="Saving changes..." />
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  icon = 'fas fa-spinner',
  size = 'md',
  isOverlay = false
}) => {
  const sizeClass = {
    sm: 'loading-state-sm',
    md: 'loading-state-md',
    lg: 'loading-state-lg'
  }[size];

  const containerClass = isOverlay
    ? `loading-state-overlay ${sizeClass}`
    : `loading-state ${sizeClass}`;

  return (
    <div
      className={containerClass}
      role="progressbar"
      aria-busy="true"
      aria-label={message}
      aria-live="polite"
    >
      <i className={`${icon} loading-state-icon fa-spin`} aria-hidden="true"></i>
      {message && <p className="loading-state-message">{message}</p>}
    </div>
  );
};

export default LoadingState;
