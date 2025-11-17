/**
 * useFormValidation Hook
 * Centralized form validation and state management hook
 * Eliminates 335+ lines of duplicated validation code across form components
 */

import { useState, useCallback, useRef } from 'react';
import {
  UseFormValidationReturn,
  UseFormValidationConfig,
  FieldRules,
  FormErrors,
  FormTouched,
  FieldError,
  ValidationRule,
} from '../types/formValidation';
import { ValidationRulesEngine } from '../utils/validationRulesEngine';

/**
 * useFormValidation Hook
 * Provides complete form validation and state management
 *
 * @example
 * const { formData, errors, handleSubmit, getFieldProps } = useFormValidation({
 *   initialValues: { email: '', password: '' },
 *   validationRules: {
 *     email: [ValidationRulesLibrary.required(), ValidationRulesLibrary.email()],
 *     password: [ValidationRulesLibrary.required(), ValidationRulesLibrary.minLength(8)]
 *   }
 * });
 *
 * return (
 *   <form onSubmit={handleSubmit(onSubmit)}>
 *     <input {...getFieldProps('email')} />
 *     {errors.email?.isInvalid && <span>{errors.email.message}</span>}
 *   </form>
 * );
 */
export function useFormValidation<T extends Record<string, any>>(
  config: UseFormValidationConfig<T>
): UseFormValidationReturn<T> {
  const {
    initialValues,
    validationRules,
    options = {},
    onSuccess,
    onError,
  } = config;

  // ===== STATE =====
  const [formData, setFormDataState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<FormErrors>({});
  const [touched, setTouchedState] = useState<FormTouched>({});
  const [isDirty, setIsDirtyState] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track async validations in progress
  const asyncValidationsInProgress = useRef<Set<string>>(new Set());

  // ===== FIELD HANDLERS =====

  /**
   * Update a single field value
   */
  const setFieldValue = useCallback(
    (fieldName: keyof T, value: any) => {
      setFormDataState((prev) => ({
        ...prev,
        [fieldName]: value,
      }));

      setIsDirtyState(true);

      // Auto-validate if configured
      if (options.validateOnChange) {
        validateField(fieldName);
      }
    },
    [options.validateOnChange]
  );

  /**
   * Mark field as touched (user has interacted)
   */
  const setFieldTouched = useCallback((fieldName: keyof T, isTouched: boolean) => {
    setTouchedState((prev) => ({
      ...prev,
      [fieldName]: isTouched,
    }));

    // Auto-validate if configured
    if (isTouched && options.validateOnBlur) {
      validateField(fieldName);
    }
  }, [options.validateOnBlur]);

  /**
   * Manually set error for a field
   */
  const setFieldError = useCallback((fieldName: keyof T, error: FieldError | null) => {
    setErrorsState((prev) => {
      if (error === null) {
        const { [fieldName as string]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [fieldName]: error,
      };
    });
  }, []);

  // ===== VALIDATION METHODS =====

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    async (fieldName: keyof T): Promise<boolean> => {
      setIsValidating(true);

      const rules = validationRules[fieldName as string];
      if (!rules || rules.length === 0) {
        setIsValidating(false);
        return true;
      }

      // Get current form data for context-aware validation
      const currentFormData = formData;
      const value = currentFormData[fieldName];

      // Check synchronous rules
      const syncError = ValidationRulesEngine.validateField(
        fieldName as string,
        value,
        rules,
        currentFormData
      );

      // Handle async rules
      const asyncRules = rules.filter((rule) => rule.type === 'async');
      let asyncError: FieldError | undefined;

      if (asyncRules.length > 0) {
        asyncValidationsInProgress.current.add(fieldName as string);

        for (const rule of asyncRules) {
          asyncError = await ValidationRulesEngine.validateFieldAsync(value, rule);
          if (asyncError) break;
        }

        asyncValidationsInProgress.current.delete(fieldName as string);
      }

      // Use first error found (sync or async)
      const finalError = syncError || asyncError;

      setErrorsState((prev) => {
        if (!finalError) {
          const { [fieldName as string]: _, ...rest } = prev;
          return rest;
        }
        return {
          ...prev,
          [fieldName]: finalError,
        };
      });

      setIsValidating(false);
      return !finalError;
    },
    [formData, validationRules]
  );

  /**
   * Validate entire form
   */
  const validateForm = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);

    const { errors: formErrors, isValid } =
      ValidationRulesEngine.validateForm(formData, validationRules);

    setErrorsState(formErrors);

    // Handle async validations
    if (isValid) {
      // Only run async validations if sync validations pass
      const asyncRulesMap = new Map<string, ValidationRule[]>();

      Object.keys(validationRules).forEach((fieldName) => {
        const asyncRules = validationRules[fieldName].filter((r) => r.type === 'async');
        if (asyncRules.length > 0) {
          asyncRulesMap.set(fieldName, asyncRules);
        }
      });

      if (asyncRulesMap.size > 0) {
        for (const [fieldName, asyncRules] of asyncRulesMap) {
          asyncValidationsInProgress.current.add(fieldName);

          for (const rule of asyncRules) {
            const error = await ValidationRulesEngine.validateFieldAsync(
              formData[fieldName],
              rule
            );
            if (error) {
              formErrors[fieldName] = error;
              break;
            }
          }

          asyncValidationsInProgress.current.delete(fieldName);
        }

        setErrorsState(formErrors);
      }
    }

    setIsValidating(false);

    const finalIsValid = Object.keys(formErrors).length === 0;

    if (!finalIsValid && onError) {
      onError(formErrors);
    }

    return finalIsValid;
  }, [formData, validationRules, onError]);

  /**
   * Validate specific fields
   */
  const validate = useCallback(
    async (fieldNames?: (keyof T)[]): Promise<boolean> => {
      if (!fieldNames || fieldNames.length === 0) {
        return validateForm();
      }

      const fieldsToValidate = fieldNames.map((f) => f as string);
      const { errors: fieldErrors, isValid } =
        ValidationRulesEngine.validateFields(fieldsToValidate, formData, validationRules);

      setErrorsState((prev) => ({
        ...prev,
        ...fieldErrors,
      }));

      return isValid;
    },
    [formData, validationRules, validateForm]
  );

  // ===== FORM MANAGEMENT =====

  /**
   * Reset form to initial state
   */
  const reset = useCallback((initialValues?: Partial<T>) => {
    if (initialValues) {
      setFormDataState((prev) => ({
        ...prev,
        ...initialValues,
      }));
    } else {
      setFormDataState(config.initialValues);
    }

    setErrorsState({});
    setTouchedState({});
    setIsDirtyState(false);
  }, [config.initialValues]);

  /**
   * Update form data directly
   */
  const setFormData = useCallback((data: Partial<T>) => {
    setFormDataState((prev) => ({
      ...prev,
      ...data,
    }));
    setIsDirtyState(true);
  }, []);

  /**
   * Update errors directly
   */
  const setErrors = useCallback((newErrors: Partial<FormErrors>) => {
    setErrorsState((prev) => ({
      ...prev,
      ...newErrors,
    }));
  }, []);

  // ===== SUBMISSION =====

  /**
   * Form submission handler
   * Validates form and calls callback if valid
   */
  const handleSubmit = useCallback(
    (callback: (values: T) => void | Promise<void>) =>
      async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);

        try {
          const isValid = await validateForm();

          if (isValid) {
            // Mark all fields as touched on submit
            const allTouched = Object.keys(formData).reduce(
              (acc, key) => ({
                ...acc,
                [key]: true,
              }),
              {} as FormTouched
            );
            setTouchedState(allTouched);

            // Call success callback
            await callback(formData);

            if (onSuccess) {
              await onSuccess(formData);
            }
          }
        } finally {
          setIsSubmitting(false);
        }
      },
    [formData, validateForm, onSuccess]
  );

  // ===== UTILITY METHODS =====

  /**
   * Get props to spread on input elements
   * Automatically handles value, onChange, onBlur, aria-invalid, aria-describedby
   */
  const getFieldProps = useCallback(
    (fieldName: keyof T) => ({
      value: formData[fieldName] ?? '',
      onChange: (e: React.ChangeEvent<any>) => {
        const value = e.target?.value ?? e.target?.checked;
        setFieldValue(fieldName, value);
      },
      onBlur: (e: React.FocusEvent<any>) => {
        setFieldTouched(fieldName, true);
      },
      'aria-invalid': hasError(fieldName),
      'aria-describedby': errors[fieldName] ? `${fieldName}-error` : undefined,
    }),
    [formData, errors, setFieldValue, setFieldTouched]
  );

  /**
   * Get error for a specific field
   */
  const getFieldError = useCallback(
    (fieldName: keyof T): FieldError | undefined => {
      return errors[fieldName];
    },
    [errors]
  );

  /**
   * Get complete state for a field
   */
  const getFieldState = useCallback(
    (fieldName: keyof T) => ({
      value: formData[fieldName],
      error: errors[fieldName],
      isTouched: touched[fieldName] ?? false,
      isDirty: isDirty,
    }),
    [formData, errors, touched, isDirty]
  );

  /**
   * Check if field has error
   */
  const hasError = useCallback(
    (fieldName: keyof T): boolean => {
      return !!errors[fieldName]?.isInvalid;
    },
    [errors]
  );

  // ===== RETURN VALUE =====

  return {
    // State
    formData,
    errors,
    touched,
    isDirty,
    isValidating,
    isSubmitting,

    // Field handlers
    setFieldValue,
    setFieldTouched,
    setFieldError,

    // Validation
    validateField,
    validateForm,
    validate,

    // Form management
    reset,
    setFormData,
    setErrors,

    // Submission
    handleSubmit,

    // Utilities
    getFieldProps,
    getFieldError,
    getFieldState,
    hasError,
  };
}
