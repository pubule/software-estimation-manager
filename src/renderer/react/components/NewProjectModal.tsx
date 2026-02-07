import React, { useEffect } from 'react';
import { useFormValidation } from '../hooks/useFormValidation';
import { ValidationRulesLibrary } from '../utils/validationRules';
import Button from './Button';

interface FormData {
  code: string;
  name: string;
  description: string;
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (formData: FormData) => Promise<void>;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject
}) => {
  // Form validation hook
  const {
    formData,
    errors,
    isSubmitting,
    getFieldProps,
    hasError,
    reset,
    handleSubmit: createHandleSubmit,
  } = useFormValidation<FormData>({
    initialValues: {
      code: '',
      name: '',
      description: ''
    },
    validationRules: {
      code: [
        ValidationRulesLibrary.required(),
        ValidationRulesLibrary.pattern(
          /^[A-Z0-9_-]+$/,
          'Project code can only contain uppercase letters, numbers, hyphens and underscores'
        ),
        ValidationRulesLibrary.length(
          3,
          20,
          'Project code must be between 3 and 20 characters'
        ),
      ],
      name: [
        ValidationRulesLibrary.required(),
        ValidationRulesLibrary.length(
          3,
          100,
          'Project name must be between 3 and 100 characters'
        ),
      ],
      description: [
        ValidationRulesLibrary.maxLength(500, 'Description must be less than 500 characters'),
      ],
    },
    onSuccess: async (values) => {
      await onCreateProject(values);
      // Modal will be closed by parent component after successful creation
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen]);

  // Handle form submission - project code should be uppercase
  const handleSubmit = createHandleSubmit(async (values) => {
    // Ensure code is uppercase
    const normalizedValues = {
      ...values,
      code: values.code.toUpperCase(),
    };
    await onCreateProject(normalizedValues);
  });

  if (!isOpen) return null;

  return (
    <div id="new-project-modal" className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close create project modal"
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Project Code Field */}
            <div className="form-group">
              <label htmlFor="project-code">Project Code:</label>
              <input
                id="project-code"
                type="text"
                placeholder="Enter project code (e.g., PRJ_001)"
                className={hasError('code') ? 'validation-error' : ''}
                maxLength={20}
                disabled={isSubmitting}
                {...getFieldProps('code')}
              />
              {errors.code?.isInvalid && (
                <div id="code-error" className="error-message" role="alert">
                  {errors.code.message}
                </div>
              )}
            </div>

            {/* Project Name Field */}
            <div className="form-group">
              <label htmlFor="project-name">Project Name:</label>
              <input
                id="project-name"
                type="text"
                placeholder="Enter project name"
                className={hasError('name') ? 'validation-error' : ''}
                maxLength={100}
                disabled={isSubmitting}
                {...getFieldProps('name')}
              />
              {errors.name?.isInvalid && (
                <div id="name-error" className="error-message" role="alert">
                  {errors.name.message}
                </div>
              )}
            </div>

            {/* Description Field (Optional) */}
            <div className="form-group">
              <label htmlFor="project-description">Description (Optional):</label>
              <textarea
                id="project-description"
                className={hasError('description') ? 'validation-error' : ''}
                placeholder="Brief description of the project..."
                rows={3}
                maxLength={500}
                disabled={isSubmitting}
                {...getFieldProps('description')}
              />
              {errors.description?.isInvalid && (
                <div id="description-error" className="error-message" role="alert">
                  {errors.description.message}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProjectModal;
