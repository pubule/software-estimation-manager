/**
 * CreateVersionModal - Modal React per creazione nuova versione
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - SOLO presentazione e UI
 * - ZERO business logic
 * - Props per dati e handlers da VersionHistoryActions
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { useVersionHistoryActions } from '../hooks/useVersionHistoryActions';

const CreateVersionModal: React.FC = () => {
  // SOLO lettura dallo store - Selettori specifici per massima reattività
  const modalState = useStore(state => state.versionHistoryData?.modalStates?.createModal || { isOpen: false, selectedVersion: null });
  const currentProject = useStore(state => state.currentProject);
  const isLoading = useStore(state => state.versionHistoryData?.isLoading || false);
  
  // Actions per operazioni business (attraverso hook)
  const actions = useVersionHistoryActions();
  
  // LOCAL form state (non business data)
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (modalState.isOpen) {
      setReason('');
      setError('');
    }
  }, [modalState.isOpen]);

  // Handle form submission (SOLO chiamata ad Actions)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for creating this version');
      return;
    }

    try {
      setError('');
      // MAI business logic qui! Solo chiamata ad Actions
      await actions.createVersion(reason.trim());
    } catch (error) {
      console.error('Error creating version:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while creating the version');
    }
  };

  // Handle modal close (SOLO chiamata ad Actions)
  const handleClose = () => {
    if (isLoading) return; // Prevent closing during operation
    // MAI business logic qui! Solo chiamata ad Actions
    actions.closeCreateVersionModal();
  };

  // REMOVED: Handle backdrop click - Modal should not close when clicking outside

  // Don't render if modal is not open
  if (!modalState.isOpen) {
    return null;
  }

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Version</h3>
          <button 
            className="modal-close" 
            onClick={handleClose}
            disabled={isLoading}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="version-create-info">
              <div className="version-create-project">
                <strong>Project:</strong> {currentProject?.project?.name || 'Unknown Project'}
              </div>
              <div className="version-create-warning">
                <i className="fas fa-info-circle"></i>
                <span>This will create a snapshot of your current project state including features, assumptions, and configuration.</span>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}

            {/* Reason Field */}
            <div className="form-group">
              <label htmlFor="version-reason">Reason for Version:</label>
              <textarea
                id="version-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why you're creating this version (e.g., 'Major feature additions', 'Before client review', 'Backup before changes')..."
                disabled={isLoading}
                rows={4}
                maxLength={500}
                required
              />
              <small className="form-help">{reason.length}/500 characters</small>
            </div>

            {/* Version Preview */}
            <div className="version-preview">
              <h4>What will be included:</h4>
              <div className="version-preview-items">
                <div className="version-preview-item">
                  <i className="fas fa-list-ul"></i>
                  <span>Features: {currentProject?.features?.length || 0}</span>
                </div>
                <div className="version-preview-item">
                  <i className="fas fa-clipboard-list"></i>
                  <span>Assumptions: {currentProject?.assumptions?.length || 0}</span>
                </div>
                <div className="version-preview-item">
                  <i className="fas fa-cog"></i>
                  <span>Configuration settings</span>
                </div>
                <div className="version-preview-item">
                  <i className="fas fa-chart-bar"></i>
                  <span>Current calculations</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading || !reason.trim()}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Create Version
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVersionModal;