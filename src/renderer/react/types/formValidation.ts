/**
 * Form Validation Type Definitions
 * Central TypeScript types for the form validation system
 */

/**
 * Validation rule type - defines what kind of validation to apply
 */
export type ValidationRuleType =
  | 'required'      // Field must not be empty
  | 'length'        // String length validation (min, max)
  | 'pattern'       // Regex pattern matching
  | 'range'         // Numeric range validation (min, max)
  | 'enum'          // Must be one of allowed values
  | 'custom'        // Custom validation function
  | 'unique'        // Value must be unique in collection
  | 'async';        // Async validation (server validation)

/**
 * A single validation rule configuration
 */
export interface ValidationRule {
  type: ValidationRuleType;
  message: string;
  // For 'length' rule
  min?: number;
  max?: number;
  // For 'pattern' rule
  pattern?: RegExp;
  // For 'range' rule
  // min and max already defined above
  // For 'enum' rule
  allowedValues?: (string | number | boolean)[];
  // For 'custom' rule
  validator?: (value: any) => boolean;
  // For 'unique' rule
  collection?: any[];
  compareFn?: (value: any, item: any) => boolean;
  // For 'async' rule
  asyncValidator?: (value: any) => Promise<boolean>;
  // Optional: only validate if condition met
  condition?: (formData: Record<string, any>) => boolean;
}

/**
 * Rules configuration for a form field
 */
export interface FieldRules {
  [fieldName: string]: ValidationRule[];
}

/**
 * Error state for a single field
 */
export interface FieldError {
  isInvalid: boolean;
  message?: string;
  type?: ValidationRuleType;
}

/**
 * Complete error state for form
 */
export interface FormErrors {
  [fieldName: string]: FieldError;
}

/**
 * Touched state for form (which fields user has interacted with)
 */
export interface FormTouched {
  [fieldName: string]: boolean;
}

/**
 * Form validation options
 */
export interface FormValidationOptions {
  validateOnChange?: boolean;    // Validate when field changes (default: false)
  validateOnBlur?: boolean;       // Validate when field loses focus (default: true)
  validateOnSubmit?: boolean;     // Validate before submission (default: true)
  revalidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
}

/**
 * Return type for useFormValidation hook
 */
export interface UseFormValidationReturn<T extends Record<string, any>> {
  // Form data
  formData: T;

  // State management
  errors: FormErrors;
  touched: FormTouched;
  isDirty: boolean;
  isValidating: boolean;
  isSubmitting: boolean;

  // Field handlers
  setFieldValue: (fieldName: keyof T, value: any) => void;
  setFieldTouched: (fieldName: keyof T, isTouched: boolean) => void;
  setFieldError: (fieldName: keyof T, error: FieldError | null) => void;

  // Validation
  validateField: (fieldName: keyof T) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  validate: (fieldNames?: (keyof T)[]) => Promise<boolean>;

  // Form management
  reset: (initialValues?: Partial<T>) => void;
  setFormData: (data: Partial<T>) => void;
  setErrors: (errors: Partial<FormErrors>) => void;

  // Submission
  handleSubmit: (callback: (values: T) => void | Promise<void>) => (e: React.FormEvent) => Promise<void>;

  // Utilities
  getFieldProps: (fieldName: keyof T) => {
    value: any;
    onChange: (e: React.ChangeEvent<any>) => void;
    onBlur: (e: React.FocusEvent<any>) => void;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  };

  getFieldError: (fieldName: keyof T) => FieldError | undefined;
  getFieldState: (fieldName: keyof T) => {
    value: any;
    error?: FieldError;
    isTouched: boolean;
    isDirty: boolean;
  };

  hasError: (fieldName: keyof T) => boolean;
}

/**
 * Hook configuration
 */
export interface UseFormValidationConfig<T extends Record<string, any>> {
  initialValues: T;
  validationRules: FieldRules;
  options?: FormValidationOptions;
  onSuccess?: (values: T) => void | Promise<void>;
  onError?: (errors: FormErrors) => void;
}
