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
import Button from './Button';

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

  // REMOVED: Handle backdrop click - Modal should not close when clicking outside

  // Don't render if modal is not open or no version selected
  if (!modalState.isOpen || !modalState.selectedVersion) {
    return null;
  }

  const selectedVersion = modalState.selectedVersion;

  return (
    <div className="modal active">
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
              <strong>Warning:</strong> Restoring this version will create a new version with the selected version's data and replace your current project state.
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

                {/* Calculations Changes Summary */}
                {comparisonData.calculationChanges.vendorCostChanges.length > 0 && (
                  <div className="restore-change-section">
                    <h5><i className="fas fa-calculator"></i> Cost Calculations</h5>
                    <div className="calculation-summary">
                      <div className="calculation-totals">
                        <span className="total-cost-change">
                          Total Cost Change: <strong className={comparisonData.calculationChanges.totalCostDifference < 0 ? 'positive' : 'negative'}>
                            {comparisonData.calculationChanges.totalCostDifference < 0 ? '+' : ''}
                            {Math.abs(comparisonData.calculationChanges.totalCostDifference).toLocaleString('en-US')}€
                          </strong>
                        </span>
                        <span className="total-mds-change">
                          Total MDs Change: <strong className={comparisonData.calculationChanges.totalMDsDifference < 0 ? 'positive' : 'negative'}>
                            {comparisonData.calculationChanges.totalMDsDifference < 0 ? '+' : ''}
                            {Math.abs(comparisonData.calculationChanges.totalMDsDifference).toFixed(1)} MD
                          </strong>
                        </span>
                      </div>
                      
                      {/* Vendor Changes Summary */}
                      <div className="vendor-changes-summary">
                        {comparisonData.calculationChanges.addedVendors.length > 0 && (
                          <span className="change-count added">
                            +{comparisonData.calculationChanges.addedVendors.length} vendor{comparisonData.calculationChanges.addedVendors.length > 1 ? 's' : ''} will be restored
                          </span>
                        )}
                        {comparisonData.calculationChanges.removedVendors.length > 0 && (
                          <span className="change-count removed">
                            -{comparisonData.calculationChanges.removedVendors.length} vendor{comparisonData.calculationChanges.removedVendors.length > 1 ? 's' : ''} will be removed
                          </span>
                        )}
                        {comparisonData.calculationChanges.modifiedVendors.length > 0 && (
                          <span className="change-count modified">
                            {comparisonData.calculationChanges.modifiedVendors.length} vendor{comparisonData.calculationChanges.modifiedVendors.length > 1 ? 's' : ''} will be modified
                          </span>
                        )}
                      </div>

                      {/* Top vendor changes (show max 3) */}
                      {comparisonData.calculationChanges.vendorCostChanges.length > 0 && (
                        <div className="vendor-changes-preview">
                          <h6>Key Changes:</h6>
                          {comparisonData.calculationChanges.vendorCostChanges
                            .sort((a: any, b: any) => Math.abs(b.costDifference) - Math.abs(a.costDifference))
                            .slice(0, 3)
                            .map((change: any, index: number) => (
                              <div key={change.vendorId} className={`vendor-change-preview ${change.changeType}`}>
                                <span className="vendor-info">
                                  <strong>{change.vendor}</strong> ({change.role})
                                </span>
                                <span className="change-info">
                                  {change.changeType === 'added' && (
                                    <span className="change-value added">
                                      +€{(change.currentValue?.cost || 0).toLocaleString('en-US')}
                                    </span>
                                  )}
                                  {change.changeType === 'removed' && (
                                    <span className="change-value removed">
                                      -€{(change.previousValue?.cost || 0).toLocaleString('en-US')}
                                    </span>
                                  )}
                                  {change.changeType === 'modified' && (
                                    <span className="change-value modified">
                                      {change.costDifference >= 0 ? '+' : ''}€{change.costDifference.toLocaleString('en-US')}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          {comparisonData.calculationChanges.vendorCostChanges.length > 3 && (
                            <div className="more-changes">
                              +{comparisonData.calculationChanges.vendorCostChanges.length - 3} more vendor changes...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Version Information */}
          <div className="restore-backup-info">
            <i className="fas fa-code-branch"></i>
            <div>
              <strong>New Version:</strong> A new version will be created with the data from the selected version. Your version history will be preserved.
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
              I understand that this will create a new version with the data from the selected version, replacing my current project state.
            </label>
          </div>
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
            type="button"
            variant="warning"
            onClick={handleRestore}
            loading={isLoading}
            disabled={!isConfirmed}
            icon={!isLoading ? <i className="fas fa-undo" /> : undefined}
          >
            {isLoading ? 'Restoring...' : 'Restore Version'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RestoreVersionModal;