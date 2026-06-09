/**
 * Button Component - Standardized, Reusable Button Library
 *
 * Consolidates 33+ button CSS classes into a single component with:
 * - TypeScript variant/size system
 * - WCAG AA compliance (focus-visible, aria attributes)
 * - Loading state support
 * - Icon button support
 * - Flexible styling via props
 *
 * Usage:
 * <Button variant="primary" size="medium" onClick={handleClick}>Save</Button>
 * <Button variant="danger" size="small" disabled>Delete</Button>
 * <Button variant="secondary" icon={<SaveIcon />} />
 */

import React, { ReactNode } from 'react';
import '../../styles/button.css';

/**
 * Button size variants
 * - small: Compact buttons for table actions, secondary actions (28px height)
 * - medium: Standard button size for most use cases (36px height)
 * - large: Prominent button for primary actions (44px height)
 */
export type ButtonSize = 'small' | 'medium' | 'large';

/**
 * Button color variants
 * - primary: Primary action (blue/teal theme)
 * - secondary: Secondary action (gray/neutral theme)
 * - danger: Destructive action (red theme)
 * - warning: Warning/caution action (yellow/orange theme)
 * - link: Unstyled button that looks like a link
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'link';

/**
 * Button type attribute
 * - button: Standard button (default)
 * - submit: Form submission
 * - reset: Form reset
 */
export type ButtonType = 'button' | 'submit' | 'reset';

interface ButtonProps {
  /**
   * Visual variant/color theme
   * @default 'secondary'
   */
  variant?: ButtonVariant;

  /**
   * Button size
   * @default 'medium'
   */
  size?: ButtonSize;

  /**
   * Button type attribute
   * @default 'button'
   */
  type?: ButtonType;

  /**
   * Disable the button (prevents interaction)
   * @default false
   */
  disabled?: boolean;

  /**
   * Show loading state (usually with spinner)
   * @default false
   */
  loading?: boolean;

  /**
   * Full width button (100% of container)
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Icon to display inside button
   * Useful for icon-only buttons or buttons with leading icons
   */
  icon?: ReactNode;

  /**
   * Position of icon relative to text
   * @default 'left'
   */
  iconPosition?: 'left' | 'right';

  /**
   * Text content of button
   */
  children?: ReactNode;

  /**
   * Callback when button is clicked
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * Additional CSS classes to apply
   */
  className?: string;

  /**
   * Button title/tooltip text
   */
  title?: string;

  /**
   * ARIA label for screen readers
   * Auto-generated from children if not provided
   */
  'aria-label'?: string;

  /**
   * ARIA busy state (true when loading)
   * Automatically set when loading prop is true
   */
  'aria-busy'?: boolean;

  /**
   * Any other button attributes
   */
  [key: string]: any;
}

/**
 * Button component - Standardized reusable button
 *
 * Features:
 * - TypeScript-based variant/size system
 * - WCAG AA compliant (focus-visible, aria attributes)
 * - Loading state with spinner
 * - Icon support (leading/trailing)
 * - Full width option
 * - Comprehensive accessibility
 *
 * @example
 * // Basic button
 * <Button onClick={handleClick}>Click me</Button>
 *
 * // Primary action
 * <Button variant="primary" size="large">Save Changes</Button>
 *
 * // Destructive action
 * <Button variant="danger" size="small" onClick={handleDelete}>Delete</Button>
 *
 * // Loading state
 * <Button variant="primary" loading isSubmitting>Saving...</Button>
 *
 * // Icon button
 * <Button icon={<SaveIcon />} title="Save" aria-label="Save file" />
 *
 * // Icon with text
 * <Button variant="primary" icon={<PlusIcon />} iconPosition="left">
 *   Add Item
 * </Button>
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'medium',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  children,
  onClick,
  className = '',
  title,
  'aria-label': ariaLabel,
  'aria-busy': ariaBusy,
  ...restProps
}) => {
  // Construct CSS class list — map 'danger' variant to 'destructive' CSS class
  const cssVariant = variant === 'danger' ? 'destructive' : variant;
  const classes = [
    'btn',
    `btn-${cssVariant}`,
    `btn-${size}`,
    fullWidth && 'btn-full-width',
    loading && 'btn-loading',
    icon && !children && 'btn-icon-only',
    className
  ]
    .filter(Boolean)
    .join(' ');

  // Determine if button is effectively disabled
  const isDisabled = disabled || loading;

  // If icon-only button, use icon as aria-label if not provided
  const computedAriaLabel = ariaLabel || (icon && !children ? title : undefined);

  // Render icon wrapper if icon provided
  const iconElement = icon ? (
    <span className="btn-icon" aria-hidden="true">
      {icon}
    </span>
  ) : null;

  // Render loading spinner if in loading state
  const loadingSpinner = loading ? (
    <span className="btn-spinner" aria-hidden="true">
      <i className="fas fa-spinner fa-spin" />
    </span>
  ) : null;

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      onClick={onClick}
      title={title}
      aria-label={computedAriaLabel}
      aria-busy={ariaBusy ?? loading}
      {...restProps}
    >
      {/* Loading spinner takes priority over content */}
      {loading ? (
        <>
          {loadingSpinner}
          <span className="btn-text">{children}</span>
        </>
      ) : (
        <>
          {iconPosition === 'left' && iconElement}
          {children && <span className="btn-text">{children}</span>}
          {iconPosition === 'right' && iconElement}
        </>
      )}
    </button>
  );
};

export default Button;

/**
 * Re-export types for convenience
 * @example import { Button, ButtonVariant, ButtonSize } from './Button';
 */
export { type ButtonSize, type ButtonVariant, type ButtonType, type ButtonProps };

/**
 * Size presets for common button configurations
 * Useful for documentation or creating button style guides
 */
export const ButtonSizePresets = {
  small: { size: 'small' as const, description: 'Compact (28px) - Table actions, secondary' },
  medium: { size: 'medium' as const, description: 'Standard (36px) - Default, most use' },
  large: { size: 'large' as const, description: 'Prominent (44px) - Primary actions' }
} as const;

/**
 * Variant presets for common button configurations
 */
export const ButtonVariantPresets = {
  primary: { variant: 'primary' as const, description: 'Primary action (blue)' },
  secondary: { variant: 'secondary' as const, description: 'Secondary action (gray)' },
  danger: { variant: 'danger' as const, description: 'Destructive action (red)' },
  warning: { variant: 'warning' as const, description: 'Warning/caution (yellow)' },
  link: { variant: 'link' as const, description: 'Link-styled button (no background)' }
} as const;

/**
 * Common button configurations (predefined prop combinations)
 */
export const ButtonPresets = {
  // Modal buttons
  modalPrimary: { variant: 'primary' as const, size: 'medium' as const },
  modalSecondary: { variant: 'secondary' as const, size: 'medium' as const },

  // Table action buttons
  tableEdit: { variant: 'secondary' as const, size: 'small' as const },
  tableDelete: { variant: 'danger' as const, size: 'small' as const },

  // Icon buttons
  iconPrimary: { size: 'small' as const, variant: 'primary' as const },
  iconSecondary: { size: 'small' as const, variant: 'secondary' as const },
  iconDanger: { size: 'small' as const, variant: 'danger' as const },

  // Link buttons
  link: { variant: 'link' as const }
} as const;
