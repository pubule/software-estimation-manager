/**
 * RestoreVersionModal - Modal React per ripristino versione
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - SOLO presentazione e UI
 * - ZERO business logic
 * - Props per dati e handlers da VersionHistoryActions
 */

import React, { useMemo, useState } from 'react';
import { useStore } from '../hooks/useStore';
import { useVersionHistoryActions } from '../hooks/useVersionHistoryActions';
import { ComparisonData } from '../actions/VersionHistoryActions';

const RestoreVersionModal: React.FC = () => {
  // SOLO lettura dallo store - Selettori specifici per massima reattività
  const modalState = useStore(state => state.versionHistoryData?.modalStates?.restoreModal || { isOpen: false, selectedVersion: null });
  const currentProject = useStore(state => state.currentProject);
  const isLoading = useStore(state => state.versionHistoryData?.isLoading || false);
  
  // Actions per operazioni business (attraverso hook)
  const actions = useVersionHistoryActions();

  // LOCAL UI state
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState('');

  // Computed comparison data per preview (derived state)
  const comparisonData: ComparisonData | null = useMemo(() => {
    if (!modalState.selectedVersion || !modalState.isOpen) return null;
    
    try {
      // MAI business logic qui! Solo chiamata ad Actions per calcolo
      return actions.generateComparisonData(modalState.selectedVersion);
    } catch (error) {
      console.error('Error generating comparison data for restore:', error);
      return null;
    }
  }, [modalState.selectedVersion, modalState.isOpen, actions]);

  // Handle restore confirmation (SOLO chiamata ad Actions)
  const handleRestore = async () => {
    if (!modalState.selectedVersion || !isConfirmed) return;

    try {
      setError('');
      // MAI business logic qui! Solo chiamata ad Actions
      await actions.restoreVersion(modalState.selectedVersion.id);
    } catch (error) {
      console.error('Error restoring version:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while restoring the version');
    }
  };

  // Handle modal close (SOLO chiamata ad Actions)
  const handleClose = () => {
    if (isLoading) return; // Prevent closing during operation
    // MAI business logic qui! Solo chiamata ad Actions
    actions.closeRestoreModal();
    // Reset local state
    setIsConfirmed(false);
    setError('');
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Don't render if modal is not open or no version selected
  if (!modalState.isOpen || !modalState.selectedVersion) {
    return null;
  }

  const selectedVersion = modalState.selectedVersion;

  return (
    <div className="modal active" onClick={handleBackdropClick}>
      <div className="modal-content restore-modal-content">
        <div className="modal-header">
          <h3>Restore Version {selectedVersion.id}</h3>
          <button 
            className="modal-close" 
            onClick={handleClose}
            disabled={isLoading}
          >
            &times;
          </button>
        </div>
        
        <div className="modal-body">
          {/* Warning Section */}
          <div className="restore-warning">
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <strong>Warning:</strong> Restoring this version will create a backup of your current state and replace it with the selected version's data.
              This action will affect all features, assumptions, and configuration.
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          {/* Version Details */}
          <div className="restore-details">
            <div className="restore-detail-row">
              <span className="restore-label">Restore from:</span>
              <span className="restore-value">
                {selectedVersion.id} ({new Date(selectedVersion.timestamp).toLocaleString()})
              </span>
            </div>
            <div className="restore-detail-row">
              <span className="restore-label">Reason:</span>
              <span className="restore-value">{selectedVersion.reason}</span>
            </div>
            <div className="restore-detail-row">
              <span className="restore-label">Project:</span>
              <span className="restore-value">{currentProject?.project?.name || 'Unknown Project'}</span>
            </div>
          </div>

          {/* What Will Change Preview */}
          {comparisonData && (
            <div className="restore-preview">
              <h4>What will change:</h4>
              <div className="restore-changes">
                {/* Features Changes Summary */}
                {(comparisonData.featureChanges.added.length > 0 || 
                  comparisonData.featureChanges.removed.length > 0 || 
                  comparisonData.featureChanges.modified.length > 0) && (
                  <div className="restore-change-section">
                    <h5><i className="fas fa-list-ul"></i> Features</h5>
                    <div className="change-summary">
                      {comparisonData.featureChanges.added.length > 0 && (
                        <span className="change-count removed">
                          -{comparisonData.featureChanges.added.length} features will be removed
                        </span>
                      )}
                      {comparisonData.featureChanges.removed.length > 0 && (
                        <span className="change-count added">
                          +{comparisonData.featureChanges.removed.length} features will be restored
                        </span>
                      )}
                      {comparisonData.featureChanges.modified.length > 0 && (
                        <span className="change-count modified">
                          {comparisonData.featureChanges.modified.length} features will be reverted
                        </span>
                      )}
                      <span className="change-total">
                        Total MD Change: 
                        <strong className={comparisonData.featureChanges.totalMDDifference < 0 ? 'positive' : 'negative'}>
                          {-comparisonData.featureChanges.totalMDDifference > 0 ? '+' : ''}{(-comparisonData.featureChanges.totalMDDifference).toFixed(1)} MD
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Assumptions Changes Summary */}
                {(comparisonData.assumptionChanges.added.length > 0 || 
                  comparisonData.assumptionChanges.removed.length > 0 || 
                  comparisonData.assumptionChanges.modified.length > 0) && (
                  <div className="restore-change-section">
                    <h5><i className="fas fa-clipboard-list"></i> Assumptions</h5>
                    <div className="change-summary">
                      {comparisonData.assumptionChanges.added.length > 0 && (
                        <span className="change-count removed">
                          -{comparisonData.assumptionChanges.added.length} assumptions will be removed
                        </span>
                      )}
                      {comparisonData.assumptionChanges.removed.length > 0 && (
                        <span className="change-count added">
                          +{comparisonData.assumptionChanges.removed.length} assumptions will be restored
                        </span>
                      )}
                      {comparisonData.assumptionChanges.modified.length > 0 && (
                        <span className="change-count modified">
                          {comparisonData.assumptionChanges.modified.length} assumptions will be reverted
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Configuration Changes Summary */}
                <div className="restore-change-section">
                  <h5><i className="fas fa-cog"></i> Configuration</h5>
                  <div className="config-changes">
                    {Object.values(comparisonData.configurationChanges).map((config: any, index) => (
                      <div key={index} className="config-change">
                        <span className="config-name">{config.label}:</span>
                        <span className="config-change-value">
                          {config.currentValue} → {config.compareValue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup Information */}
          <div className="restore-backup-info">
            <i className="fas fa-shield-alt"></i>
            <div>
              <strong>Automatic Backup:</strong> Your current project state will be automatically saved as a backup version before restoration.
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="restore-confirmation">
            <label className="restore-checkbox-label">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                disabled={isLoading}
              />
              <span className="checkmark"></span>
              I understand that this will replace my current project data with the selected version, and a backup will be created automatically.
            </label>
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
            type="button" 
            className="btn btn-warning" 
            onClick={handleRestore}
            disabled={isLoading || !isConfirmed}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Restoring...
              </>
            ) : (
              <>
                <i className="fas fa-undo"></i>
                Restore Version
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreVersionModal;