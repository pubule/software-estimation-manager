/**
 * CreateVersionModal - React modal for creating new versions
 *
 * REQUIRED PATTERN: State/Actions/Dispatcher
 * - Presentation and UI only
 * - Zero business logic
 * - Props for data and handlers from VersionHistoryActions
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { useVersionHistoryActions } from '../hooks/useVersionHistoryActions';
import Button from './Button';

const CreateVersionModal: React.FC = () => {
  // Read-only from store - Specific selectors for maximum reactivity
  const modalState = useStore(state => state.versionHistoryData?.modalStates?.createModal || { isOpen: false, selectedVersion: null });
  const currentProject = useStore(state => state.currentProject);
  const isLoading = useStore(state => state.versionHistoryData?.isLoading || false);
  
  // Actions for business operations (via hook)
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

  // Handle form submission (Actions call only)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Please provide a reason for creating this version');
      return;
    }

    try {
      setError('');
      // No business logic here! Actions call only
      await actions.createVersion(reason.trim());
    } catch (error) {
      console.error('Error creating version:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while creating the version');
    }
  };

  // Handle modal close (Actions call only)
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
    <div className="modal active create-version-modal">
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

            {/* Current Calculations Preview */}
            {currentProject?.calculationData?.vendorCosts && currentProject.calculationData.vendorCosts.length > 0 && (
              <div className="initial-content-section">
                <h5><i className="fas fa-calculator"></i> Cost Calculations ({currentProject.calculationData.vendorCosts.length} vendors)</h5>
                <div className="initial-vendors-list">
                  {currentProject.calculationData.vendorCosts.map((vendor: any, index: number) => (
                    <div key={vendor.vendorId || index} className="initial-vendor-item">
                      <div className="vendor-main-info">
                        <span className="vendor-name">{vendor.vendor}</span>
                        <span className="vendor-role-dept">{vendor.role} - {vendor.department}</span>
                      </div>
                      <div className="vendor-metrics">
                        <span className="vendor-mds">{(vendor.manDays || 0).toFixed(1)} MD</span>
                        <span className="vendor-rate">€{vendor.rate || 0}/day</span>
                        <span className="vendor-total">€{(vendor.cost || 0).toLocaleString('en-US')}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="calculations-summary">
                  <div className="summary-totals">
                    <span className="total-effort">
                      Total MDs: <strong>{currentProject.calculationData.vendorCosts
                        .reduce((sum: number, vendor: any) => sum + (vendor.manDays || 0), 0)
                        .toFixed(1)} MD</strong>
                    </span>
                    <span className="total-cost">
                      Total Cost: <strong>€{currentProject.calculationData.vendorCosts
                        .reduce((sum: number, vendor: any) => sum + (vendor.cost || 0), 0)
                        .toLocaleString('en-US')}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              disabled={!reason.trim()}
              icon={!isLoading ? <i className="fas fa-save" /> : undefined}
            >
              {isLoading ? 'Creating...' : 'Create Version'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVersionModal;