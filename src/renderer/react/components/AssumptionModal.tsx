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
import Button from './Button';

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

  // Don't render if modal is not open
  if (!modalState.isOpen) {
    return null;
  }

  const isEditMode = modalState.mode === 'edit';
  const title = isEditMode ? 'Edit Assumption' : 'Add Assumption';
  const submitText = isEditMode ? 'Update Assumption' : 'Create Assumption';

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={handleClose}>
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* General Error */}
            {errors.general && (
              <div className="error-message">
                {errors.general}
              </div>
            )}

            {/* ID Field */}
            <div className="form-group">
              <label htmlFor="assumption-id">ID:</label>
              <input
                type="text"
                id="assumption-id"
                value={formData.id}
                onChange={(e) => handleFormChange('id', e.target.value)}
                className={errors.id ? 'error' : ''}
                placeholder="ASS-001"
                disabled={isSubmitting || isEditMode}
                maxLength={7}
                required
              />
              {errors.id && <span className="error-message">{errors.id}</span>}
              <small className="form-help">Format: ASS-XXX (e.g., ASS-001)</small>
            </div>

            {/* Description Field */}
            <div className="form-group">
              <label htmlFor="assumption-description">Description:</label>
              <textarea
                id="assumption-description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                className={errors.description ? 'error' : ''}
                placeholder="Describe the assumption..."
                disabled={isSubmitting}
                rows={3}
                maxLength={500}
                required
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
              <small className="form-help">{formData.description.length}/500 characters</small>
            </div>

            {/* Type Field */}
            <div className="form-group">
              <label htmlFor="assumption-type">Type:</label>
              <select
                id="assumption-type"
                value={formData.type}
                onChange={(e) => handleFormChange('type', e.target.value)}
                className={errors.type ? 'error' : ''}
                disabled={isSubmitting}
                required
              >
                <option value="Technical">Technical</option>
                <option value="Business">Business</option>
                <option value="Resource">Resource</option>
                <option value="Timeline">Timeline</option>
              </select>
              {errors.type && <span className="error-message">{errors.type}</span>}
            </div>

            {/* Impact Field */}
            <div className="form-group">
              <label htmlFor="assumption-impact">Impact:</label>
              <select
                id="assumption-impact"
                value={formData.impact}
                onChange={(e) => handleFormChange('impact', e.target.value)}
                className={errors.impact ? 'error' : ''}
                disabled={isSubmitting}
                required
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              {errors.impact && <span className="error-message">{errors.impact}</span>}
            </div>

            {/* Notes Field */}
            <div className="form-group">
              <label htmlFor="assumption-notes">Notes:</label>
              <textarea
                id="assumption-notes"
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder="Additional notes or details..."
                disabled={isSubmitting}
                rows={4}
                maxLength={1000}
              />
              <small className="form-help">{formData.notes.length}/1000 characters</small>
            </div>
          </div>
          
          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {submitText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssumptionModal;