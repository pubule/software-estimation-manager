import React from 'react';

export interface EmptyStateProps {
  /**
   * Icon class (Font Awesome icon, e.g., 'fas fa-inbox')
   * @default 'fas fa-inbox'
   */
  icon?: string;

  /**
   * Main title/heading text
   */
  title: string;

  /**
   * Subtitle/description text
   */
  message: string;

  /**
   * Optional action button
   */
  action?: {
    label: string;
    onClick: () => void;
  };

  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable empty state component for displaying when no data is available.
 * WCAG AA compliant with proper contrast and text hierarchy.
 *
 * @example
 * <EmptyState
 *   icon="fas fa-list"
 *   title="No Features Found"
 *   message="Start by adding your first feature to the project."
 *   action={{ label: 'Create Feature', onClick: handleCreate }}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'fas fa-inbox',
  title,
  message,
  action,
  size = 'md'
}) => {
  const sizeClass = {
    sm: 'empty-state-sm',
    md: 'empty-state-md',
    lg: 'empty-state-lg'
  }[size];

  return (
    <div className={`empty-state ${sizeClass}`} role="status">
      <i className={`${icon} empty-state-icon`} aria-hidden="true"></i>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && (
        <button
          className="empty-state-action"
          onClick={action.onClick}
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
