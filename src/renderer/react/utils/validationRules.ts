/**
 * Predefined Validation Rules Library
 * Common validation rules used across forms in the application
 * Provides a catalog of reusable rules to prevent duplication
 */

import { ValidationRule } from '../types/formValidation';

/**
 * Collection of predefined validation rules
 * Use these to avoid writing the same rules repeatedly
 */
export const ValidationRulesLibrary = {
  // ===== REQUIRED RULES =====

  /**
   * Field is required (cannot be empty)
   */
  required: (): ValidationRule => ({
    type: 'required',
    message: 'This field is required',
  }),

  /**
   * Field is required with custom message
   */
  requiredWithMessage: (message: string): ValidationRule => ({
    type: 'required',
    message,
  }),

  // ===== TEXT/STRING RULES =====

  /**
   * String with minimum length
   */
  minLength: (min: number, message?: string): ValidationRule => ({
    type: 'length',
    min,
    message: message || `Minimum ${min} characters required`,
  }),

  /**
   * String with maximum length
   */
  maxLength: (max: number, message?: string): ValidationRule => ({
    type: 'length',
    max,
    message: message || `Maximum ${max} characters allowed`,
  }),

  /**
   * String with exact length range
   */
  length: (min: number, max: number, message?: string): ValidationRule => ({
    type: 'length',
    min,
    max,
    message: message || `Length must be between ${min} and ${max} characters`,
  }),

  /**
   * Email validation
   */
  email: (message?: string): ValidationRule => ({
    type: 'pattern',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || 'Please enter a valid email address',
  }),

  /**
   * URL validation
   */
  url: (message?: string): ValidationRule => ({
    type: 'pattern',
    pattern: /^https?:\/\/.+/i,
    message: message || 'Please enter a valid URL',
  }),

  /**
   * Only alphanumeric characters
   */
  alphanumeric: (message?: string): ValidationRule => ({
    type: 'pattern',
    pattern: /^[a-zA-Z0-9]+$/,
    message: message || 'Only letters and numbers are allowed',
  }),

  /**
   * Only letters (no numbers)
   */
  lettersOnly: (message?: string): ValidationRule => ({
    type: 'pattern',
    pattern: /^[a-zA-Z\s]+$/,
    message: message || 'Only letters are allowed',
  }),

  /**
   * No special characters (alphanumeric + spaces + hyphens)
   */
  noSpecialChars: (message?: string): ValidationRule => ({
    type: 'pattern',
    pattern: /^[a-zA-Z0-9\s\-_]+$/,
    message: message || 'Special characters are not allowed',
  }),

  /**
   * Custom regex pattern
   */
  pattern: (regex: RegExp, message: string): ValidationRule => ({
    type: 'pattern',
    pattern: regex,
    message,
  }),

  // ===== NUMERIC RULES =====

  /**
   * Minimum numeric value
   */
  minValue: (min: number, message?: string): ValidationRule => ({
    type: 'range',
    min,
    message: message || `Value must be at least ${min}`,
  }),

  /**
   * Maximum numeric value
   */
  maxValue: (max: number, message?: string): ValidationRule => ({
    type: 'range',
    max,
    message: message || `Value must not exceed ${max}`,
  }),

  /**
   * Numeric value in range
   */
  range: (min: number, max: number, message?: string): ValidationRule => ({
    type: 'range',
    min,
    max,
    message: message || `Value must be between ${min} and ${max}`,
  }),

  /**
   * Positive number (greater than 0)
   */
  positive: (message?: string): ValidationRule => ({
    type: 'range',
    min: 0.0001, // Smallest positive number
    message: message || 'Value must be positive',
  }),

  /**
   * Non-negative number (0 or greater)
   */
  nonNegative: (message?: string): ValidationRule => ({
    type: 'range',
    min: 0,
    message: message || 'Value cannot be negative',
  }),

  /**
   * Integer only (no decimals)
   */
  integer: (message?: string): ValidationRule => ({
    type: 'custom',
    validator: (value) => Number.isInteger(Number(value)),
    message: message || 'Value must be a whole number',
  }),

  // ===== SELECTION RULES =====

  /**
   * Value must be one of allowed options
   */
  enum: (
    allowedValues: (string | number | boolean)[],
    message?: string
  ): ValidationRule => ({
    type: 'enum',
    allowedValues,
    message:
      message ||
      `Value must be one of: ${allowedValues.join(', ')}`,
  }),

  /**
   * At least one option selected (for arrays/multi-select)
   */
  minItems: (min: number, message?: string): ValidationRule => ({
    type: 'custom',
    validator: (value) => Array.isArray(value) && value.length >= min,
    message: message || `Please select at least ${min} option(s)`,
  }),

  /**
   * Maximum number of options selected
   */
  maxItems: (max: number, message?: string): ValidationRule => ({
    type: 'custom',
    validator: (value) => !Array.isArray(value) || value.length <= max,
    message: message || `Maximum ${max} option(s) allowed`,
  }),

  // ===== UNIQUENESS RULES =====

  /**
   * Value must be unique in collection
   */
  unique: (
    collection: any[],
    message?: string,
    compareFn?: (value: any, item: any) => boolean
  ): ValidationRule => ({
    type: 'unique',
    collection,
    compareFn,
    message: message || 'This value already exists',
  }),

  /**
   * Unique by property (e.g., unique project name)
   */
  uniqueProperty: (
    collection: any[],
    propertyName: string,
    message?: string
  ): ValidationRule => ({
    type: 'unique',
    collection,
    compareFn: (value, item) => item[propertyName] === value,
    message: message || `This ${propertyName} is already in use`,
  }),

  // ===== CUSTOM VALIDATION =====

  /**
   * Custom validation function
   */
  custom: (validator: (value: any) => boolean, message: string): ValidationRule => ({
    type: 'custom',
    validator,
    message,
  }),

  /**
   * Conditional validation (only validates if condition met)
   */
  conditional: (
    rule: ValidationRule,
    condition: (formData: Record<string, any>) => boolean
  ): ValidationRule => ({
    ...rule,
    condition,
  }),

  /**
   * Match two fields (e.g., password confirmation)
   */
  match: (
    fieldToMatch: string,
    fieldLabel: string,
    message?: string
  ): ValidationRule => ({
    type: 'custom',
    validator: function (value) {
      // This will be set during hook creation
      return false;
    },
    message: message || `Must match ${fieldLabel}`,
  }),

  // ===== ASYNC VALIDATION =====

  /**
   * Server-side validation (async)
   */
  async: (
    asyncValidator: (value: any) => Promise<boolean>,
    message: string
  ): ValidationRule => ({
    type: 'async',
    asyncValidator,
    message,
  }),

  /**
   * Check if username is available (example async)
   */
  usernameAvailable: (
    checkAvailability: (username: string) => Promise<boolean>,
    message?: string
  ): ValidationRule => ({
    type: 'async',
    asyncValidator: checkAvailability,
    message: message || 'Username is not available',
  }),

  /**
   * Check if email is available (example async)
   */
  emailAvailable: (
    checkAvailability: (email: string) => Promise<boolean>,
    message?: string
  ): ValidationRule => ({
    type: 'async',
    asyncValidator: checkAvailability,
    message: message || 'Email is already registered',
  }),
};

/**
 * Helper function to create match validation for form fields
 * Usage: createMatchRule(formData, 'password', 'Password')
 */
export function createMatchRule(
  formData: Record<string, any>,
  fieldToMatch: string,
  fieldLabel: string,
  message?: string
): ValidationRule {
  return {
    type: 'custom',
    validator: (value) => value === formData[fieldToMatch],
    message: message || `Must match ${fieldLabel}`,
  };
}

/**
 * Combine multiple rules for the same field
 * Useful for common patterns like required + email
 */
export function combineRules(rules: ValidationRule[]): ValidationRule[] {
  return rules;
}

/**
 * Common validation patterns (quick access)
 */
export const ValidationPatterns = {
  // Email format
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // URL format
  URL: /^https?:\/\/.+/i,

  // Alphanumeric only
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,

  // Letters only
  LETTERS: /^[a-zA-Z\s]+$/,

  // No special characters
  NO_SPECIAL: /^[a-zA-Z0-9\s\-_]+$/,

  // Phone number (basic)
  PHONE: /^[\d\s\+\-\(\)]+$/,

  // Hex color
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,

  // Strong password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special)
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};
