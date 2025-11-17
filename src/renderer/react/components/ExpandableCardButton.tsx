/**
 * ExpandableCardButton - Specialized button for KPI card headers
 *
 * Consolidates expandable card header patterns used in dashboards
 * Replaces scattered className patterns:
 * - .resolution-card-header
 * - .backlog-card-header
 * - .alert-header
 *
 * Features:
 * - Type-safe props system
 * - WCAG AA accessibility (aria-expanded, aria-label, focus-visible)
 * - Icon rotation animation (90° transform)
 * - Flexible content layout (main content + trailing icon)
 * - CSS variables for dark theme support
 */

import React from 'react';
import '../../styles/button-expandable.css';

/**
 * Card type determines styling and layout
 * - 'kpi': Standard KPI card (value/label + expand icon)
 * - 'alert': Alert card (icon + title + count + expand icon)
 * - 'compact': Minimal card (label + expand icon)
 */
type CardType = 'kpi' | 'alert' | 'compact';

/**
 * Icon position determines where the expand icon appears
 * - 'right': Fixed position on right side (KPI cards)
 * - 'trailing': Flexbox trailing (Alert cards)
 */
type IconPosition = 'right' | 'trailing';

interface ExpandableCardButtonProps {
  /** Whether the card is currently expanded */
  expanded: boolean;

  /** Callback when button is clicked */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /** Card layout type (determines styling) */
  cardType?: CardType;

  /** Icon position strategy */
  iconPosition?: IconPosition;

  /** Main content to display */
  children: React.ReactNode;

  /** Icon to display next to content (optional) */
  icon?: React.ReactNode;

  /** Aria label for accessibility */
  ariaLabel: string;

  /** Additional CSS class name */
  className?: string;

  /** Tooltip title */
  title?: string;

  /** Custom expand/collapse icon (default: ▶/▼) */
  expandIcon?: (expanded: boolean) => React.ReactNode;
}

/**
 * Default expand icon renderer
 * Shows ▶ when collapsed, ▼ when expanded
 */
const defaultExpandIcon = (expanded: boolean): string => (expanded ? '▼' : '▶');

/**
 * ExpandableCardButton Component
 *
 * Specialized button for KPI and collapsible card headers
 * Handles icon animation, accessibility, and theme integration
 *
 * @example
 * // KPI Card Button
 * <ExpandableCardButton
 *   expanded={isExpanded}
 *   onClick={() => setExpanded(!isExpanded)}
 *   ariaLabel="Toggle resolution time details"
 *   cardType="kpi"
 * >
 *   <div className="kpi-value">5.2 hours</div>
 *   <div className="kpi-label">Avg Resolution Time</div>
 * </ExpandableCardButton>
 *
 * @example
 * // Alert Card Button
 * <ExpandableCardButton
 *   expanded={isExpanded}
 *   onClick={() => setExpanded(!isExpanded)}
 *   ariaLabel="High Priority alerts"
 *   cardType="alert"
 *   iconPosition="trailing"
 *   icon={<span className="alert-icon">🔴</span>}
 * >
 *   <strong>High Priority</strong>
 *   <span className="alert-count">5</span>
 * </ExpandableCardButton>
 */
const ExpandableCardButton: React.FC<ExpandableCardButtonProps> = ({
  expanded,
  onClick,
  cardType = 'kpi',
  iconPosition = cardType === 'alert' ? 'trailing' : 'right',
  children,
  icon,
  ariaLabel,
  className,
  title,
  expandIcon = defaultExpandIcon,
}) => {
  const buttonClassName = [
    'expandable-card-button',
    `expandable-card-button--${cardType}`,
    `expandable-card-button--icon-${iconPosition}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={buttonClassName}
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={ariaLabel}
      title={title}
    >
      {/* Icon (if provided) - appears before content */}
      {icon && <span className="expandable-card-button__icon-leading">{icon}</span>}

      {/* Main Content */}
      <span className="expandable-card-button__content">{children}</span>

      {/* Expand/Collapse Icon */}
      <span
        className="expandable-card-button__expand-icon"
        aria-hidden="true"
      >
        {expandIcon(expanded)}
      </span>
    </button>
  );
};

export default ExpandableCardButton;
