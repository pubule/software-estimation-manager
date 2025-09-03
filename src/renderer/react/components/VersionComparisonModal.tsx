/**
 * VersionComparisonModal - Modal React per confronto versioni
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - SOLO presentazione e UI
 * - ZERO business logic
 * - Props per dati e handlers da VersionHistoryActions
 */

import React, { useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { useVersionHistoryActions } from '../hooks/useVersionHistoryActions';
import { ComparisonData, ComparisonField } from '../actions/VersionHistoryActions';

const VersionComparisonModal: React.FC = () => {
  // SOLO lettura dallo store - Selettori specifici per massima reattività
  const modalState = useStore(state => state.versionHistoryData?.modalStates?.compareModal || { isOpen: false, selectedVersion: null });
  const currentProject = useStore(state => state.currentProject);
  
  // Actions per operazioni business (attraverso hook)
  const actions = useVersionHistoryActions();

  // Computed comparison data (derived state)
  const comparisonData: ComparisonData | null = useMemo(() => {
    if (!modalState.selectedVersion || !modalState.isOpen) return null;
    
    try {
      // MAI business logic qui! Solo chiamata ad Actions per calcolo
      return actions.generateComparisonData(modalState.selectedVersion);
    } catch (error) {
      console.error('Error generating comparison data:', error);
      return null;
    }
  }, [modalState.selectedVersion, modalState.isOpen, actions]);

  // Handle modal close (SOLO chiamata ad Actions)
  const handleClose = () => {
    // MAI business logic qui! Solo chiamata ad Actions
    actions.closeCompareModal();
  };

  // Handle restore from comparison (SOLO chiamata ad Actions)
  const handleRestoreFromComparison = () => {
    if (modalState.selectedVersion) {
      // Close comparison modal first
      actions.closeCompareModal();
      // Open restore modal
      actions.openRestoreModal(modalState.selectedVersion);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Don't render if modal is not open or no version selected
  if (!modalState.isOpen || !modalState.selectedVersion || !comparisonData) {
    return null;
  }

  const selectedVersion = modalState.selectedVersion;

  return (
    <div className="modal active" onClick={handleBackdropClick}>
      <div className="modal-content comparison-modal-content">
        <div className="modal-header">
          <h3>Version Comparison</h3>
          <button className="modal-close" onClick={handleClose}>
            &times;
          </button>
        </div>
        
        <div className="modal-body">
          <div className="comparison-header">
            <div className="comparison-versions">
              <div className="comparison-version current">
                <h4>Current Version</h4>
                <span className="version-info">Live project state</span>
              </div>
              <div className="comparison-separator">
                <i className="fas fa-arrows-alt-h"></i>
              </div>
              <div className="comparison-version compare">
                <h4>Version {selectedVersion.id}</h4>
                <span className="version-info">
                  {new Date(selectedVersion.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="comparison-content">
            {/* Project Metadata Comparison */}
            {comparisonData.projectChanges.some(change => change.hasDifference) && (
              <div className="comparison-section">
                <div className="comparison-section-header">
                  <h5><i className="fas fa-project-diagram"></i> Project Information</h5>
                  <small>{comparisonData.projectChanges.filter(c => c.hasDifference).length} field(s) with differences</small>
                </div>
                <div className="comparison-section-body">
                  {comparisonData.projectChanges
                    .filter(change => change.hasDifference)
                    .map((change, index) => (
                      <div key={index} className="comparison-field">
                        <div className="comparison-field-name">{change.label}</div>
                        <div className="comparison-field-values">
                          <div className="comparison-value current">
                            <span className="comparison-label">Current:</span>
                            <span className="comparison-text">{change.currentValue || '(empty)'}</span>
                          </div>
                          <div className="comparison-value compare">
                            <span className="comparison-label">Version {selectedVersion.id}:</span>
                            <span className="comparison-text">{change.compareValue || '(empty)'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Features Comparison */}
            <div className="comparison-section">
              <div className="comparison-section-header">
                <h5><i className="fas fa-list-ul"></i> Features</h5>
                <small>
                  {comparisonData.featureChanges.added.length + 
                   comparisonData.featureChanges.removed.length + 
                   comparisonData.featureChanges.modified.length} changes
                </small>
              </div>
              <div className="comparison-section-body">
                <div className="comparison-stats">
                  <div className="comparison-stat">
                    <span className="stat-label">Total Man Days Change:</span>
                    <span className={`stat-value ${comparisonData.featureChanges.totalMDDifference > 0 ? 'positive' : comparisonData.featureChanges.totalMDDifference < 0 ? 'negative' : 'neutral'}`}>
                      {comparisonData.featureChanges.totalMDDifference > 0 ? '+' : ''}{comparisonData.featureChanges.totalMDDifference.toFixed(1)} MD
                    </span>
                  </div>
                </div>

                {/* Added Features */}
                {comparisonData.featureChanges.added.length > 0 && (
                  <div className="comparison-changes">
                    <h6 className="changes-header added">
                      <i className="fas fa-plus-circle"></i>
                      Added Features ({comparisonData.featureChanges.added.length})
                    </h6>
                    <div className="changes-list">
                      {comparisonData.featureChanges.added.map((feature: any) => (
                        <div key={feature.id} className="change-item added">
                          <span className="change-id">{feature.id}</span>
                          <span className="change-description">{feature.description}</span>
                          <span className="change-md">{feature.manDays || 0} MD</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Removed Features */}
                {comparisonData.featureChanges.removed.length > 0 && (
                  <div className="comparison-changes">
                    <h6 className="changes-header removed">
                      <i className="fas fa-minus-circle"></i>
                      Removed Features ({comparisonData.featureChanges.removed.length})
                    </h6>
                    <div className="changes-list">
                      {comparisonData.featureChanges.removed.map((feature: any) => (
                        <div key={feature.id} className="change-item removed">
                          <span className="change-id">{feature.id}</span>
                          <span className="change-description">{feature.description}</span>
                          <span className="change-md">{feature.manDays || 0} MD</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modified Features */}
                {comparisonData.featureChanges.modified.length > 0 && (
                  <div className="comparison-changes">
                    <h6 className="changes-header modified">
                      <i className="fas fa-edit"></i>
                      Modified Features ({comparisonData.featureChanges.modified.length})
                    </h6>
                    <div className="changes-list">
                      {comparisonData.featureChanges.modified.map((feature: any) => (
                        <div key={feature.id} className="change-item modified">
                          <span className="change-id">{feature.id}</span>
                          <span className="change-description">{feature.description}</span>
                          <span className="change-status">Modified</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assumptions Comparison */}
            <div className="comparison-section">
              <div className="comparison-section-header">
                <h5><i className="fas fa-clipboard-list"></i> Assumptions</h5>
                <small>
                  {comparisonData.assumptionChanges.added.length + 
                   comparisonData.assumptionChanges.removed.length + 
                   comparisonData.assumptionChanges.modified.length} changes
                </small>
              </div>
              <div className="comparison-section-body">
                {/* Similar structure for assumptions */}
                {comparisonData.assumptionChanges.added.length === 0 && 
                 comparisonData.assumptionChanges.removed.length === 0 && 
                 comparisonData.assumptionChanges.modified.length === 0 ? (
                  <div className="no-changes">
                    <i className="fas fa-check-circle"></i>
                    <span>No changes in assumptions</span>
                  </div>
                ) : (
                  <>
                    {comparisonData.assumptionChanges.added.length > 0 && (
                      <div className="comparison-changes">
                        <h6 className="changes-header added">
                          <i className="fas fa-plus-circle"></i>
                          Added Assumptions ({comparisonData.assumptionChanges.added.length})
                        </h6>
                      </div>
                    )}
                    {comparisonData.assumptionChanges.removed.length > 0 && (
                      <div className="comparison-changes">
                        <h6 className="changes-header removed">
                          <i className="fas fa-minus-circle"></i>
                          Removed Assumptions ({comparisonData.assumptionChanges.removed.length})
                        </h6>
                      </div>
                    )}
                    {comparisonData.assumptionChanges.modified.length > 0 && (
                      <div className="comparison-changes">
                        <h6 className="changes-header modified">
                          <i className="fas fa-edit"></i>
                          Modified Assumptions ({comparisonData.assumptionChanges.modified.length})
                        </h6>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Configuration Comparison */}
            <div className="comparison-section">
              <div className="comparison-section-header">
                <h5><i className="fas fa-cog"></i> Configuration</h5>
              </div>
              <div className="comparison-section-body">
                <div className="config-comparison">
                  {Object.values(comparisonData.configurationChanges).map((config: any, index) => (
                    <div key={index} className={`config-item ${config.hasDifference ? 'has-difference' : ''}`}>
                      <span className="config-label">{config.label}:</span>
                      <span className="config-values">
                        {config.currentValue} → {config.compareValue}
                        {config.hasDifference && (
                          <span className={`config-diff ${config.currentValue - config.compareValue > 0 ? 'positive' : 'negative'}`}>
                            ({config.currentValue - config.compareValue > 0 ? '+' : ''}{config.currentValue - config.compareValue})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Close Comparison
          </button>
          <button type="button" className="btn btn-warning" onClick={handleRestoreFromComparison}>
            <i className="fas fa-undo"></i>
            Restore This Version
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionComparisonModal;