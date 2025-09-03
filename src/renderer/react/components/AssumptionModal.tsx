/**
 * AssumptionModal - Modal React per aggiunta/modifica assumptions
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - SOLO presentazione e UI
 * - ZERO business logic
 * - Props per dati e handlers da AssumptionsActions
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { useAssumptionsActions } from '../hooks/useAssumptionsActions';
import { AssumptionFormData } from '../actions/AssumptionsActions';

const AssumptionModal: React.FC = () => {
  // SOLO lettura dallo store - Selettori specifici per massima reattività
  const modalState = useStore(state => state.assumptionsData?.modalState || { isOpen: false, mode: 'add', selectedAssumption: null });
  
  // Actions per operazioni business (attraverso hook)
  const actions = useAssumptionsActions();
  
  // LOCAL form state (non business data)
  const [formData, setFormData] = useState<AssumptionFormData>({
    id: '',
    description: '',
    type: 'Technical',
    impact: 'Medium',
    notes: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form data when modal opens/changes
  useEffect(() => {
    if (modalState.selectedAssumption) {
      setFormData({
        id: modalState.selectedAssumption.id || '',
        description: modalState.selectedAssumption.description || '',
        type: modalState.selectedAssumption.type || 'Technical',
        impact: modalState.selectedAssumption.impact || 'Medium',
        notes: modalState.selectedAssumption.notes || ''
      });
    } else {
      // Reset form for new assumption
      setFormData({
        id: '',
        description: '',
        type: 'Technical',
        impact: 'Medium',
        notes: ''
      });
    }
    setErrors({});
    setIsSubmitting(false);
  }, [modalState.selectedAssumption, modalState.isOpen]);

  // Handle form changes (local UI state only)
  const handleFormChange = (field: keyof AssumptionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle form submission (SOLO chiamata ad Actions)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setErrors({});

    try {
      if (modalState.mode === 'add') {
        // MAI business logic qui! Solo chiamata ad Actions
        actions.createAssumption(formData);
      } else {
        // MAI business logic qui! Solo chiamata ad Actions
        actions.updateAssumption(formData.id, formData);
      }
    } catch (error) {
      // Gestione errori di validazione
      if (error instanceof Error && error.message.includes('Validation failed:')) {
        const validationErrors = error.message.replace('Validation failed: ', '').split(', ');
        const errorMap: Record<string, string> = {};
        validationErrors.forEach(err => {
          if (err.includes('ID')) errorMap.id = err;
          if (err.includes('Description')) errorMap.description = err;
          if (err.includes('Type')) errorMap.type = err;
          if (err.includes('Impact')) errorMap.impact = err;
        });
        setErrors(errorMap);
      } else {
        console.error('Error saving assumption:', error);
        setErrors({ general: 'An error occurred while saving the assumption.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close (SOLO chiamata ad Actions)
  const handleClose = () => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.closeAssumptionModal();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Debug log modal state
  console.log('AssumptionModal - modalState:', modalState);
  
  // Don't render if modal is not open
  if (!modalState.isOpen) {
    console.log('AssumptionModal - Not rendering (isOpen is false)');
    return null;
  }
  
  console.log('AssumptionModal - Rendering modal');

  const isEditMode = modalState.mode === 'edit';
  const title = isEditMode ? 'Edit Assumption' : 'Add New Assumption';
  const submitText = isEditMode ? 'Update Assumption' : 'Create Assumption';

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-dialog assumption-modal">
        <div className="modal-content">
          {/* Modal Header */}
          <div className="modal-header">
            <h3 className="modal-title">
              <i className="fas fa-clipboard-list"></i>
              {title}
            </h3>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              title="Close"
              disabled={isSubmitting}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Modal Body */}
          <div className="modal-body">
            <form onSubmit={handleSubmit} className="assumption-form">
              {/* General Error */}
              {errors.general && (
                <div className="form-error general-error">
                  <i className="fas fa-exclamation-triangle"></i>
                  {errors.general}
                </div>
              )}

              {/* ID Field */}
              <div className="form-group">
                <label htmlFor="assumption-id" className="form-label">
                  ID <span className="required">*</span>
                </label>
                <input
                  id="assumption-id"
                  type="text"
                  className={`form-input ${errors.id ? 'error' : ''}`}
                  value={formData.id}
                  onChange={(e) => handleFormChange('id', e.target.value)}
                  placeholder="ASS-001"
                  disabled={isSubmitting}
                  maxLength={7}
                />
                {errors.id && (
                  <div className="field-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.id}
                  </div>
                )}
                <div className="field-help">Format: ASS-XXX (e.g., ASS-001)</div>
              </div>

              {/* Description Field */}
              <div className="form-group">
                <label htmlFor="assumption-description" className="form-label">
                  Description <span className="required">*</span>
                </label>
                <textarea
                  id="assumption-description"
                  className={`form-textarea ${errors.description ? 'error' : ''}`}
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Describe the assumption..."
                  disabled={isSubmitting}
                  rows={3}
                  maxLength={500}
                />
                {errors.description && (
                  <div className="field-error">
                    <i className="fas fa-exclamation-circle"></i>
                    {errors.description}
                  </div>
                )}
                <div className="field-help">{formData.description.length}/500 characters</div>
              </div>

              {/* Type and Impact Row */}
              <div className="form-row">
                {/* Type Field */}
                <div className="form-group">
                  <label htmlFor="assumption-type" className="form-label">
                    Type <span className="required">*</span>
                  </label>
                  <select
                    id="assumption-type"
                    className={`form-select ${errors.type ? 'error' : ''}`}
                    value={formData.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="Technical">Technical</option>
                    <option value="Business">Business</option>
                    <option value="Resource">Resource</option>
                    <option value="Timeline">Timeline</option>
                  </select>
                  {errors.type && (
                    <div className="field-error">
                      <i className="fas fa-exclamation-circle"></i>
                      {errors.type}
                    </div>
                  )}
                </div>

                {/* Impact Field */}
                <div className="form-group">
                  <label htmlFor="assumption-impact" className="form-label">
                    Impact <span className="required">*</span>
                  </label>
                  <select
                    id="assumption-impact"
                    className={`form-select ${errors.impact ? 'error' : ''}`}
                    value={formData.impact}
                    onChange={(e) => handleFormChange('impact', e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  {errors.impact && (
                    <div className="field-error">
                      <i className="fas fa-exclamation-circle"></i>
                      {errors.impact}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Field */}
              <div className="form-group">
                <label htmlFor="assumption-notes" className="form-label">
                  Notes
                </label>
                <textarea
                  id="assumption-notes"
                  className="form-textarea"
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Additional notes or details..."
                  disabled={isSubmitting}
                  rows={4}
                  maxLength={1000}
                />
                <div className="field-help">{formData.notes.length}/1000 characters</div>
              </div>
            </form>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
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
              {isSubmitting && <i className="fas fa-spinner fa-spin"></i>}
              {isSubmitting ? 'Saving...' : submitText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssumptionModal;