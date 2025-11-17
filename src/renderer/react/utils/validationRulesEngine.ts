/**
 * Validation Rules Engine
 * Core logic for executing validation rules and generating error messages
 */

import {
  ValidationRule,
  ValidationRuleType,
  FieldError,
  FieldRules,
  FormErrors,
} from '../types/formValidation';

/**
 * Main validation engine class
 * Handles rule validation, error message generation, and form-wide validation
 */
export class ValidationRulesEngine {
  /**
   * Validate a single field value against its rules
   * Returns the first error found, or undefined if valid
   */
  static validateField(
    fieldName: string,
    value: any,
    rules: ValidationRule[],
    formData?: Record<string, any>
  ): FieldError | undefined {
    // Check each rule in order
    for (const rule of rules) {
      // Skip rule if condition not met
      if (rule.condition && !rule.condition(formData || {})) {
        continue;
      }

      const error = this.executeRule(value, rule, formData);
      if (error) {
        return error;
      }
    }

    return undefined; // All rules passed
  }

  /**
   * Execute a single validation rule
   */
  private static executeRule(
    value: any,
    rule: ValidationRule,
    formData?: Record<string, any>
  ): FieldError | undefined {
    switch (rule.type) {
      case 'required':
        return this.validateRequired(value, rule);

      case 'length':
        return this.validateLength(value, rule);

      case 'pattern':
        return this.validatePattern(value, rule);

      case 'range':
        return this.validateRange(value, rule);

      case 'enum':
        return this.validateEnum(value, rule);

      case 'custom':
        return this.validateCustom(value, rule, formData);

      case 'unique':
        return this.validateUnique(value, rule);

      case 'async':
        // Async validation handled separately in hook
        return undefined;

      default:
        return undefined;
    }
  }

  /**
   * Validate required field (not empty, not null, not undefined)
   */
  private static validateRequired(value: any, rule: ValidationRule): FieldError | undefined {
    // Check for empty value
    if (value === null || value === undefined) {
      return { isInvalid: true, message: rule.message, type: 'required' };
    }

    // Check for empty string (trim whitespace)
    if (typeof value === 'string' && value.trim().length === 0) {
      return { isInvalid: true, message: rule.message, type: 'required' };
    }

    // Check for empty array
    if (Array.isArray(value) && value.length === 0) {
      return { isInvalid: true, message: rule.message, type: 'required' };
    }

    // Check for empty object
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      return { isInvalid: true, message: rule.message, type: 'required' };
    }

    return undefined;
  }

  /**
   * Validate string length constraints
   */
  private static validateLength(value: any, rule: ValidationRule): FieldError | undefined {
    if (!value) return undefined; // Skip if empty

    const strValue = String(value);
    const length = strValue.length;

    // Check minimum length
    if (rule.min !== undefined && length < rule.min) {
      return { isInvalid: true, message: rule.message, type: 'length' };
    }

    // Check maximum length
    if (rule.max !== undefined && length > rule.max) {
      return { isInvalid: true, message: rule.message, type: 'length' };
    }

    return undefined;
  }

  /**
   * Validate against regex pattern
   */
  private static validatePattern(value: any, rule: ValidationRule): FieldError | undefined {
    if (!value || !rule.pattern) return undefined;

    if (!rule.pattern.test(String(value))) {
      return { isInvalid: true, message: rule.message, type: 'pattern' };
    }

    return undefined;
  }

  /**
   * Validate numeric range
   */
  private static validateRange(value: any, rule: ValidationRule): FieldError | undefined {
    if (value === null || value === undefined || value === '') return undefined;

    const numValue = Number(value);

    if (isNaN(numValue)) {
      return { isInvalid: true, message: rule.message, type: 'range' };
    }

    // Check minimum
    if (rule.min !== undefined && numValue < rule.min) {
      return { isInvalid: true, message: rule.message, type: 'range' };
    }

    // Check maximum
    if (rule.max !== undefined && numValue > rule.max) {
      return { isInvalid: true, message: rule.message, type: 'range' };
    }

    return undefined;
  }

  /**
   * Validate enum (value must be in allowed list)
   */
  private static validateEnum(value: any, rule: ValidationRule): FieldError | undefined {
    if (!rule.allowedValues || rule.allowedValues.length === 0) {
      return undefined;
    }

    if (!rule.allowedValues.includes(value)) {
      return { isInvalid: true, message: rule.message, type: 'enum' };
    }

    return undefined;
  }

  /**
   * Validate using custom function
   */
  private static validateCustom(
    value: any,
    rule: ValidationRule,
    formData?: Record<string, any>
  ): FieldError | undefined {
    if (!rule.validator) return undefined;

    try {
      const isValid = rule.validator(value);

      if (!isValid) {
        return { isInvalid: true, message: rule.message, type: 'custom' };
      }
    } catch (error) {
      return {
        isInvalid: true,
        message: rule.message || 'Validation error',
        type: 'custom',
      };
    }

    return undefined;
  }

  /**
   * Validate uniqueness in collection
   */
  private static validateUnique(value: any, rule: ValidationRule): FieldError | undefined {
    if (!rule.collection || rule.collection.length === 0) {
      return undefined;
    }

    const compareFn = rule.compareFn || ((v: any, item: any) => v === item);

    // Check if value exists in collection
    const isDuplicate = rule.collection.some((item) => compareFn(value, item));

    if (isDuplicate) {
      return { isInvalid: true, message: rule.message, type: 'unique' };
    }

    return undefined;
  }

  /**
   * Validate async rule (handles promise-based validation)
   */
  static async validateFieldAsync(
    value: any,
    rule: ValidationRule
  ): Promise<FieldError | undefined> {
    if (rule.type !== 'async' || !rule.asyncValidator) {
      return undefined;
    }

    try {
      const isValid = await rule.asyncValidator(value);

      if (!isValid) {
        return { isInvalid: true, message: rule.message, type: 'async' };
      }
    } catch (error) {
      return {
        isInvalid: true,
        message: rule.message || 'Validation error',
        type: 'async',
      };
    }

    return undefined;
  }

  /**
   * Validate entire form
   */
  static validateForm(
    formData: Record<string, any>,
    validationRules: FieldRules
  ): { errors: FormErrors; isValid: boolean } {
    const errors: FormErrors = {};

    Object.keys(validationRules).forEach((fieldName) => {
      const rules = validationRules[fieldName];
      const error = this.validateField(fieldName, formData[fieldName], rules, formData);

      if (error) {
        errors[fieldName] = error;
      }
    });

    return {
      errors,
      isValid: Object.keys(errors).length === 0,
    };
  }

  /**
   * Validate specific fields
   */
  static validateFields(
    fieldNames: string[],
    formData: Record<string, any>,
    validationRules: FieldRules
  ): { errors: FormErrors; isValid: boolean } {
    const errors: FormErrors = {};

    fieldNames.forEach((fieldName) => {
      const rules = validationRules[fieldName];
      if (!rules) return;

      const error = this.validateField(fieldName, formData[fieldName], rules, formData);

      if (error) {
        errors[fieldName] = error;
      }
    });

    return {
      errors,
      isValid: Object.keys(errors).length === 0,
    };
  }

  /**
   * Check if there are async rules in validation
   */
  static hasAsyncRules(validationRules: FieldRules): boolean {
    return Object.values(validationRules).some((rules) =>
      rules.some((rule) => rule.type === 'async')
    );
  }

  /**
   * Get all async rules for a field
   */
  static getAsyncRules(
    fieldName: string,
    validationRules: FieldRules
  ): ValidationRule[] {
    const rules = validationRules[fieldName] || [];
    return rules.filter((rule) => rule.type === 'async');
  }
}
