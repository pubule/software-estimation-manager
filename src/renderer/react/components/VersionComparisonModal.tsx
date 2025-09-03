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
  
  // Actions per operazioni business (attraverso hook)
  const actions = useVersionHistoryActions();

  // Computed comparison data with navigation (derived state)
  const comparisonData = useMemo(() => {
    if (!modalState.selectedVersion || !modalState.isOpen) return null;
    
    try {
      // MAI business logic qui! Solo chiamata ad Actions per calcolo
      return actions.generateComparisonDataWithNavigation(modalState.selectedVersion);
    } catch (error) {
      console.error('Error generating comparison data:', error);
      return null;
    }
  }, [modalState.selectedVersion, modalState.isOpen, actions]);

  // Handle modal close (SOLO chiamata ad Actions)
  const handleClose = () => {
    actions.closeCompareModal();
  };

  // Handle restore from comparison (SOLO chiamata ad Actions)
  const handleRestoreFromComparison = () => {
    if (modalState.selectedVersion) {
      actions.closeCompareModal();
      actions.openRestoreModal(modalState.selectedVersion);
    }
  };

  // Handle version navigation (SOLO chiamate ad Actions)
  const handlePreviousVersion = () => {
    if (modalState.selectedVersion) {
      actions.navigateToPreviousVersion(modalState.selectedVersion.id);
    }
  };

  const handleNextVersion = () => {
    if (modalState.selectedVersion) {
      actions.navigateToNextVersion(modalState.selectedVersion.id);
    }
  };

  // Don't render if modal is not open or no version selected
  if (!modalState.isOpen || !modalState.selectedVersion || !comparisonData) {
    return null;
  }

  const selectedVersion = modalState.selectedVersion;
  const { evolutionSummary, navigationContext } = comparisonData;

  // Render different layouts based on comparison type
  if (comparisonData.comparisonType === 'initial-version') {
    return (
      <div className="modal active">
        <div className="modal-content comparison-modal-content initial-version-modal">
          <div className="modal-header">
            <h3>Initial Version Analysis</h3>
            <button className="modal-close" onClick={handleClose}>
              &times;
            </button>
          </div>
          
          <div className="modal-body">
            {/* Initial Version Header */}
            <div className="initial-version-header">
              <div className="version-badge initial">
                <i className="fas fa-star"></i>
                <span>Version {selectedVersion.id}</span>
              </div>
              <div className="version-info">
                <h4>Project Baseline Established</h4>
                <p className="version-timestamp">
                  {new Date(selectedVersion.timestamp).toLocaleDateString()} at {new Date(selectedVersion.timestamp).toLocaleTimeString()}
                </p>
                <p className="version-reason">{selectedVersion.reason}</p>
              </div>
            </div>

            {/* Initial Version Summary */}
            <div className="initial-version-summary">
              <div className="summary-card">
                <h5><i className="fas fa-rocket"></i> Project Foundation</h5>
                <div className="foundation-metrics">
                  <div className="metric">
                    <span className="metric-value">{comparisonData.featureChanges.added.length}</span>
                    <span className="metric-label">Initial Features</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{evolutionSummary.effortAfter}</span>
                    <span className="metric-label">Total Man Days</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{comparisonData.assumptionChanges.added.length}</span>
                    <span className="metric-label">Assumptions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Baseline */}
            <div className="initial-content-section">
              <h5><i className="fas fa-list-ul"></i> Initial Features ({comparisonData.featureChanges.added.length})</h5>
              <div className="initial-features-list">
                {comparisonData.featureChanges.added.map((feature: any, index) => (
                  <div key={feature.id || index} className="initial-feature-item">
                    <span className="feature-id">{feature.id}</span>
                    <span className="feature-description">{feature.description}</span>
                    <span className="feature-effort">{feature.manDays || 0} MD</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Close Analysis
            </button>
            {navigationContext.canNavigateNext && (
              <button type="button" className="btn btn-primary" onClick={handleNextVersion}>
                <i className="fas fa-arrow-right"></i>
                Next Version
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Change-Focused Layout (Proposal 3)
  return (
    <div className="modal active">
      <div className="modal-content comparison-modal-content change-focused-modal">
        <div className="modal-header">
          <div className="evolution-header">
            <h3>Version Evolution Analysis</h3>
            <div className="version-navigation">
              <span className="version-position">{navigationContext.position}</span>
              <div className="nav-buttons">
                <button 
                  className={`nav-btn previous ${!navigationContext.canNavigatePrevious ? 'disabled' : ''}`}
                  onClick={handlePreviousVersion}
                  disabled={!navigationContext.canNavigatePrevious}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button 
                  className={`nav-btn next ${!navigationContext.canNavigateNext ? 'disabled' : ''}`}
                  onClick={handleNextVersion}
                  disabled={!navigationContext.canNavigateNext}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose}>
            &times;
          </button>
        </div>
        
        <div className="modal-body">
          {/* Evolution Timeline Header */}
          <div className="evolution-timeline">
            <div className="timeline-progression">
              <div className="version-point from">
                <div className="version-badge">
                  {comparisonData.fromVersion?.id || 'Initial'}
                </div>
                <div className="version-details">
                  <span className="version-timestamp">
                    {comparisonData.fromVersion ? 
                      new Date(comparisonData.fromVersion.timestamp).toLocaleDateString() : 
                      'Project Start'
                    }
                  </span>
                </div>
              </div>
              
              <div className="timeline-arrow">
                <i className="fas fa-arrow-right"></i>
                <span className="time-elapsed">{evolutionSummary.timeElapsed}</span>
              </div>
              
              <div className="version-point to active">
                <div className="version-badge">
                  {selectedVersion.id}
                </div>
                <div className="version-details">
                  <span className="version-timestamp">
                    {new Date(selectedVersion.timestamp).toLocaleDateString()}
                  </span>
                  <span className="version-reason">{selectedVersion.reason}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evolution Impact Summary */}
          <div className="evolution-impact-summary">
            <div className={`impact-badge ${evolutionSummary.impactLevel}`}>
              <i className={`fas ${evolutionSummary.impactLevel === 'high' ? 'fa-exclamation-circle' : 
                                evolutionSummary.impactLevel === 'medium' ? 'fa-info-circle' : 'fa-check-circle'}`}></i>
              <span>{evolutionSummary.impactLevel.toUpperCase()} IMPACT</span>
            </div>
            
            <div className="summary-message">
              <p>{evolutionSummary.summaryMessage}</p>
            </div>

            <div className="impact-metrics">
              <div className="metric effort">
                <span className="metric-label">Effort Change</span>
                <span className={`metric-value ${evolutionSummary.effortDifference > 0 ? 'positive' : evolutionSummary.effortDifference < 0 ? 'negative' : 'neutral'}`}>
                  {evolutionSummary.effortDifference > 0 ? '+' : ''}{evolutionSummary.effortDifference.toFixed(1)} MD
                  ({evolutionSummary.effortPercentageChange > 0 ? '+' : ''}{evolutionSummary.effortPercentageChange}%)
                </span>
              </div>
              <div className="metric changes">
                <span className="metric-label">Total Changes</span>
                <span className="metric-value">{evolutionSummary.totalChanges}</span>
              </div>
            </div>
          </div>

          {/* Change Categories - PROPOSAL 3 CORE LAYOUT */}
          <div className="change-categories">
            
            {/* ADDITIONS */}
            {evolutionSummary.additionsCount > 0 && (
              <div className="change-category additions">
                <div className="category-header">
                  <h5>
                    <i className="fas fa-plus-circle"></i>
                    ADDITIONS ({evolutionSummary.additionsCount} changes)
                  </h5>
                </div>
                <div className="category-content">
                  {comparisonData.featureChanges.added.length > 0 && (
                    <div className="change-group features">
                      <h6><i className="fas fa-list-ul"></i> New Features ({comparisonData.featureChanges.added.length})</h6>
                      <div className="change-items">
                        {comparisonData.featureChanges.added.map((feature: any) => (
                          <div key={feature.id} className="change-item added">
                            <span className="change-id">{feature.id}</span>
                            <span className="change-description">{feature.description}</span>
                            <span className="change-impact">+{feature.manDays || 0} MD</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {comparisonData.assumptionChanges.added.length > 0 && (
                    <div className="change-group assumptions">
                      <h6><i className="fas fa-clipboard-list"></i> New Assumptions ({comparisonData.assumptionChanges.added.length})</h6>
                      <div className="change-items">
                        {comparisonData.assumptionChanges.added.map((assumption: any, index) => (
                          <div key={assumption.id || index} className="change-item added">
                            <span className="change-description">{assumption.description}</span>
                            <span className="change-type">{assumption.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODIFICATIONS */}
            {evolutionSummary.modificationsCount > 0 && (
              <div className="change-category modifications">
                <div className="category-header">
                  <h5>
                    <i className="fas fa-edit"></i>
                    MODIFICATIONS ({evolutionSummary.modificationsCount} changes)
                  </h5>
                </div>
                <div className="category-content">
                  {comparisonData.featureChanges.modified.length > 0 && (
                    <div className="change-group features">
                      <h6><i className="fas fa-list-ul"></i> Modified Features ({comparisonData.featureChanges.modified.length})</h6>
                      <div className="change-items">
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

                  {comparisonData.projectChanges.some(change => change.hasDifference) && (
                    <div className="change-group project-metadata">
                      <h6><i className="fas fa-project-diagram"></i> Project Changes</h6>
                      <div className="change-items">
                        {comparisonData.projectChanges
                          .filter(change => change.hasDifference)
                          .map((change, index) => (
                            <div key={index} className="change-item modified">
                              <span className="change-field">{change.label}</span>
                              <span className="change-evolution">
                                {change.currentValue} ← {change.compareValue}
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REMOVALS */}
            {evolutionSummary.removalsCount > 0 && (
              <div className="change-category removals">
                <div className="category-header">
                  <h5>
                    <i className="fas fa-minus-circle"></i>
                    REMOVALS ({evolutionSummary.removalsCount} changes)
                  </h5>
                </div>
                <div className="category-content">
                  {comparisonData.featureChanges.removed.length > 0 && (
                    <div className="change-group features">
                      <h6><i className="fas fa-list-ul"></i> Removed Features ({comparisonData.featureChanges.removed.length})</h6>
                      <div className="change-items">
                        {comparisonData.featureChanges.removed.map((feature: any) => (
                          <div key={feature.id} className="change-item removed">
                            <span className="change-id">{feature.id}</span>
                            <span className="change-description">{feature.description}</span>
                            <span className="change-impact">-{feature.manDays || 0} MD</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {comparisonData.assumptionChanges.removed.length > 0 && (
                    <div className="change-group assumptions">
                      <h6><i className="fas fa-clipboard-list"></i> Removed Assumptions ({comparisonData.assumptionChanges.removed.length})</h6>
                      <div className="change-items">
                        {comparisonData.assumptionChanges.removed.map((assumption: any, index) => (
                          <div key={assumption.id || index} className="change-item removed">
                            <span className="change-description">{assumption.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CALCULATIONS CHANGES */}
            {comparisonData.calculationChanges.vendorCostChanges.length > 0 && (
              <div className="change-category calculations">
                <div className="category-header">
                  <h5>
                    <i className="fas fa-calculator"></i>
                    COST CALCULATIONS ({comparisonData.calculationChanges.vendorCostChanges.length} changes)
                  </h5>
                  <div className="calculation-summary">
                    <div className="calculation-totals">
                      <span className="total-cost">
                        Total Cost: <strong className={comparisonData.calculationChanges.totalCostDifference >= 0 ? 'positive' : 'negative'}>
                          {comparisonData.calculationChanges.totalCostDifference >= 0 ? '+' : ''}
                          {comparisonData.calculationChanges.totalCostDifference.toLocaleString('en-US')}€
                        </strong>
                      </span>
                      <span className="total-mds">
                        Total MDs: <strong className={comparisonData.calculationChanges.totalMDsDifference >= 0 ? 'positive' : 'negative'}>
                          {comparisonData.calculationChanges.totalMDsDifference >= 0 ? '+' : ''}
                          {comparisonData.calculationChanges.totalMDsDifference.toFixed(1)} MD
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="category-content">
                  {/* Added Vendors */}
                  {comparisonData.calculationChanges.addedVendors.length > 0 && (
                    <div className="change-group calculations">
                      <h6><i className="fas fa-plus-circle"></i> Added Vendors ({comparisonData.calculationChanges.addedVendors.length})</h6>
                      <div className="vendor-changes">
                        {comparisonData.calculationChanges.vendorCostChanges
                          .filter((change: any) => change.changeType === 'added')
                          .map((change: any, index: number) => (
                            <div key={change.vendorId} className="vendor-change-item added">
                              <div className="vendor-info">
                                <span className="vendor-name">{change.vendor}</span>
                                <span className="vendor-role">{change.role} - {change.department}</span>
                              </div>
                              <div className="vendor-details">
                                <span className="vendor-mds">{change.currentValue?.manDays || 0} MD</span>
                                <span className="vendor-rate">€{change.currentValue?.rate || 0}/day</span>
                                <span className="vendor-cost">€{(change.currentValue?.cost || 0).toLocaleString('en-US')}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Removed Vendors */}
                  {comparisonData.calculationChanges.removedVendors.length > 0 && (
                    <div className="change-group calculations">
                      <h6><i className="fas fa-minus-circle"></i> Removed Vendors ({comparisonData.calculationChanges.removedVendors.length})</h6>
                      <div className="vendor-changes">
                        {comparisonData.calculationChanges.vendorCostChanges
                          .filter((change: any) => change.changeType === 'removed')
                          .map((change: any, index: number) => (
                            <div key={change.vendorId} className="vendor-change-item removed">
                              <div className="vendor-info">
                                <span className="vendor-name">{change.vendor}</span>
                                <span className="vendor-role">{change.role} - {change.department}</span>
                              </div>
                              <div className="vendor-details">
                                <span className="vendor-mds">-{change.previousValue?.manDays || 0} MD</span>
                                <span className="vendor-rate">€{change.previousValue?.rate || 0}/day</span>
                                <span className="vendor-cost">-€{(change.previousValue?.cost || 0).toLocaleString('en-US')}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Modified Vendors */}
                  {comparisonData.calculationChanges.modifiedVendors.length > 0 && (
                    <div className="change-group calculations">
                      <h6><i className="fas fa-edit"></i> Modified Vendors ({comparisonData.calculationChanges.modifiedVendors.length})</h6>
                      <div className="vendor-changes">
                        {comparisonData.calculationChanges.vendorCostChanges
                          .filter((change: any) => change.changeType === 'modified')
                          .map((change: any, index: number) => (
                            <div key={change.vendorId} className="vendor-change-item modified">
                              <div className="vendor-info">
                                <span className="vendor-name">{change.vendor}</span>
                                <span className="vendor-role">{change.role} - {change.department}</span>
                              </div>
                              <div className="vendor-comparison">
                                <div className="vendor-before">
                                  <span className="label">Before:</span>
                                  <span className="vendor-mds">{change.previousValue?.manDays || 0} MD</span>
                                  <span className="vendor-rate">€{change.previousValue?.rate || 0}/day</span>
                                  <span className="vendor-cost">€{(change.previousValue?.cost || 0).toLocaleString('en-US')}</span>
                                </div>
                                <div className="vendor-after">
                                  <span className="label">After:</span>
                                  <span className="vendor-mds">{change.currentValue?.manDays || 0} MD</span>
                                  <span className="vendor-rate">€{change.currentValue?.rate || 0}/day</span>
                                  <span className="vendor-cost">€{(change.currentValue?.cost || 0).toLocaleString('en-US')}</span>
                                </div>
                                <div className="vendor-difference">
                                  <span className="diff-cost">
                                    {change.costDifference >= 0 ? '+' : ''}€{change.costDifference.toLocaleString('en-US')}
                                  </span>
                                  <span className="diff-mds">
                                    {change.mdsDifference >= 0 ? '+' : ''}{change.mdsDifference.toFixed(1)} MD
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NO CHANGES STATE */}
            {evolutionSummary.totalChanges === 0 && (
              <div className="no-changes-state">
                <div className="no-changes-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <h5>No Changes Detected</h5>
                <p>This version is identical to the previous version.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Close Analysis
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