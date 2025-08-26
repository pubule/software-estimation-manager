import React, { useState, useRef, useEffect } from 'react';

interface FormData {
  code: string;
  name: string;
  description: string;
}

interface FormErrors {
  code?: string;
  name?: string;
  description?: string;
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
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ code: '', name: '', description: '' });
      setErrors({});
      setIsSubmitting(false);
      // Focus first input after a small delay
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processedValue = name === 'code' ? value.toUpperCase() : value;
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Validation replicating ProjectManager.js validateNewProjectData
  const validateForm = (): { isValid: boolean; errors: FormErrors } => {
    const newErrors: FormErrors = {};

    // Validate code
    if (!formData.code) {
      newErrors.code = 'Project code is required';
    } else if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
      newErrors.code = 'Project code can only contain uppercase letters, numbers, hyphens and underscores';
    } else if (formData.code.length < 3) {
      newErrors.code = 'Project code must be at least 3 characters long';
    } else if (formData.code.length > 20) {
      newErrors.code = 'Project code must be less than 20 characters';
    }

    // Validate name
    if (!formData.name) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters long';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Project name must be less than 100 characters';
    }

    // Validate description (optional)
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    const validation = validateForm();
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onCreateProject(formData);
      // Modal will be closed by parent component after successful creation
    } catch (error) {
      console.error('Failed to create project:', error);
      // Keep modal open to allow retry
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="new-project-modal" className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form id="new-project-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="project-code">Project Code:</label>
              <input 
                type="text" 
                id="project-code" 
                name="code" 
                ref={codeInputRef}
                className={`validation-tooltip required ${errors.code ? 'validation-error' : ''}`}
                value={formData.code}
                onChange={handleInputChange}
                placeholder="e.g. PJ-001"
                pattern="[A-Z0-9\-_]+"
                title="Only uppercase letters, numbers, hyphens and underscores allowed"
                data-error-message={errors.code}
                required
              />
              <small className="form-help">Unique identifier for the project (uppercase, numbers, - and _ only)</small>
              {errors.code && <div className="error-message">{errors.code}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="project-name">Project Name:</label>
              <input 
                type="text" 
                id="project-name" 
                name="name" 
                className={`validation-tooltip required ${errors.name ? 'validation-error' : ''}`}
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Customer Portal Development"
                maxLength={100}
                data-error-message={errors.name}
                required
              />
              <small className="form-help">Descriptive name for the project</small>
              {errors.name && <div className="error-message">{errors.name}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="project-description">Description (Optional):</label>
              <textarea 
                id="project-description" 
                name="description"
                className={errors.description ? 'validation-error' : ''}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the project..."
                rows={3} 
                maxLength={500}
                data-error-message={errors.description}
              />
              {errors.description && <div className="error-message">{errors.description}</div>}
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Creating...
              </>
            ) : (
              'Create Project'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewProjectModal;