/**
 * CalculationsPage.tsx - Container principale per Calculations Dashboard
 * 
 * PATTERN: SOLO presentazione! 
 * - SOLO lettura dallo store
 * - Actions per operazioni
 * - MAI business logic qui
 */

import React, { useEffect, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { useCalculationsActions } from '../hooks/useCalculationsActions';

interface CalculationsPageProps {
  // Props interface (se necessario)
}

const CalculationsPage: React.FC<CalculationsPageProps> = () => {
  // SOLO lettura dallo store
  const currentProject = useStore(state => state.currentProject);
  const calculationsData = useStore(state => state.calculationsData);
  
  // Version counter to force re-renders when calculations update
  const calculationsVersion = useStore(state => state.calculationsData?.version || 0);
  
  // Additional specific selectors to ensure reactivity  
  const vendorCosts = useStore(state => state.calculationsData?.vendorCosts || []);
  const kpiData = useStore(state => state.calculationsData?.kpiData);
  
  
  
  
  
  // Actions per operazioni business (attraverso hook)
  const {
    calculateProjectCosts,
    updateFinalMDs,
    applyFilters,
    shareByEmail,
    copyToClipboard,
    resetAllFinalMDs
  } = useCalculationsActions();
  
  // Calcola al mount e quando cambia progetto (calcoli ogni volta come richiesto)
  useEffect(() => {
    if (currentProject) {
      calculateProjectCosts();
    }
  }, [currentProject, calculateProjectCosts]);
  
  // Handler eventi (SOLO chiamate ad Actions)
  const handleFinalMDsChange = (vendorId: string, role: string, department: string, value: number) => {
    // MAI business logic qui! Solo chiamata ad Actions
    updateFinalMDs(vendorId, role, department, value);
  };
  
  const handleFilterChange = (vendorFilter: string, roleFilter: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    applyFilters(vendorFilter, roleFilter);
  };
  
  const handleShareByEmail = () => {
    // MAI business logic qui! Solo chiamata ad Actions
    shareByEmail();
  };
  
  const handleCopyToClipboard = async () => {
    // MAI business logic qui! Solo chiamata ad Actions
    try {
      await copyToClipboard();
      // Potresti aggiungere una notification qui se necessario
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };
  
  const handleResetFinalMDs = () => {
    // MAI business logic qui! Solo chiamata ad Actions
    resetAllFinalMDs();
  };
  
  // Computed values per UI (derived state)
  const filteredCosts = useMemo(() => {
    const filters = calculationsData?.filters || { vendor: 'all', role: 'all' };
    return vendorCosts.filter(cost => {
      const vendorMatch = filters.vendor === 'all' || cost.vendorId === filters.vendor;
      const roleMatch = filters.role === 'all' || cost.role === filters.role;
      return vendorMatch && roleMatch;
    });
  }, [vendorCosts, calculationsData?.filters, calculationsVersion]); // Add version to force recalculation
  
  const uniqueVendors = useMemo(() => {
    const vendors = new Map<string, { id: string, name: string }>();
    vendorCosts.forEach(cost => {
      if (!vendors.has(cost.vendorId)) {
        vendors.set(cost.vendorId, { id: cost.vendorId, name: cost.vendorName });
      }
    });
    return Array.from(vendors.values());
  }, [vendorCosts, calculationsVersion]); // Add version to force recalculation
  
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    vendorCosts.forEach(cost => {
      roles.add(cost.role);
    });
    return Array.from(roles);
  }, [vendorCosts, calculationsVersion]); // Add version to force recalculation
  
  // No project state
  if (!currentProject) {
    return (
      <div className="calculations-page">
        <div className="empty-state">
          <i className="fas fa-calculator"></i>
          <h3>No Project Loaded</h3>
          <p>Please load or create a project to view calculations.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="calculations-page">
      {/* Page Header */}
      <div className="page-header">
        <h2>Calculations Dashboard</h2>
        <div className="page-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleShareByEmail}
            title="Share by Email"
          >
            <i className="fas fa-envelope"></i> Share
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleCopyToClipboard}
            title="Copy to Clipboard"
          >
            <i className="fas fa-copy"></i> Copy
          </button>
          <button 
            className="btn btn-warning"
            onClick={handleResetFinalMDs}
            title="Reset All Final MDs"
          >
            <i className="fas fa-undo"></i> Reset
          </button>
        </div>
      </div>

      {/* KPI Cards Section */}
      {kpiData && (
        <div className="kpi-section">
          <div className="kpi-cards-grid">
            {/* GTO Card */}
            <div className="kpi-card gto-card">
              <div className="kpi-header">
                <h3>GTO (G2, TA)</h3>
                <span className="kpi-total">€{kpiData.gto.total.toLocaleString()}</span>
              </div>
              <div className="kpi-breakdown">
                <div className="kpi-item">
                  <span className="kpi-label">Internal:</span>
                  <span className="kpi-value">€{kpiData.gto.internal.toLocaleString()}</span>
                  <span className="kpi-percentage">({kpiData.gto.internalPercentage.toFixed(1)}%)</span>
                </div>
                <div className="kpi-item">
                  <span className="kpi-label">External:</span>
                  <span className="kpi-value">€{kpiData.gto.external.toLocaleString()}</span>
                  <span className="kpi-percentage">({kpiData.gto.externalPercentage.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
            
            {/* GDS Card */}
            <div className="kpi-card gds-card">
              <div className="kpi-header">
                <h3>GDS (G1, PM)</h3>
                <span className="kpi-total">€{kpiData.gds.total.toLocaleString()}</span>
              </div>
              <div className="kpi-breakdown">
                <div className="kpi-item">
                  <span className="kpi-label">Internal:</span>
                  <span className="kpi-value">€{kpiData.gds.internal.toLocaleString()}</span>
                  <span className="kpi-percentage">({kpiData.gds.internalPercentage.toFixed(1)}%)</span>
                </div>
                <div className="kpi-item">
                  <span className="kpi-label">External:</span>
                  <span className="kpi-value">€{kpiData.gds.external.toLocaleString()}</span>
                  <span className="kpi-percentage">({kpiData.gds.externalPercentage.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
            
            {/* Total Project Card */}
            <div className="kpi-card total-card">
              <div className="kpi-header">
                <h3>Total Project</h3>
                <span className="kpi-total">€{kpiData.totalProject.toLocaleString()}</span>
              </div>
              <div className="kpi-breakdown">
                <div className="kpi-item">
                  <span className="kpi-label">Internal:</span>
                  <span className="kpi-percentage">{kpiData.totalInternalPercentage.toFixed(1)}%</span>
                </div>
                <div className="kpi-item">
                  <span className="kpi-label">External:</span>
                  <span className="kpi-percentage">{kpiData.totalExternalPercentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-bar">
          <div className="filter-group">
            <label htmlFor="vendor-filter">Vendor:</label>
            <select 
              id="vendor-filter"
              value={calculationsData?.filters?.vendor || 'all'}
              onChange={(e) => handleFilterChange(e.target.value, calculationsData?.filters?.role || 'all')}
            >
              <option value="all">All Vendors</option>
              {uniqueVendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="role-filter">Role:</label>
            <select 
              id="role-filter"
              value={calculationsData?.filters?.role || 'all'}
              onChange={(e) => handleFilterChange(calculationsData?.filters?.vendor || 'all', e.target.value)}
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calculations Table Section */}
      <div className="calculations-table-section">
        {filteredCosts && filteredCosts.length > 0 ? (
          <div className="table-container">
            <table className="data-table calculations-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Official Rate</th>
                  <th>Real Rate</th>
                  <th>Estimated MDs</th>
                  <th>Final MDs</th>
                  <th>Tot Cost</th>
                  <th>Final Tot Cost</th>
                </tr>
              </thead>
              <tbody>
                {filteredCosts.map((cost, index) => (
                  <tr key={`${cost.vendorId}-${cost.role}-${cost.department}`}>
                    <td className="vendor-name">
                      {cost.vendorName}
                      {cost.isInternal && <span className="internal-badge">Internal</span>}
                    </td>
                    <td className="vendor-role">
                      <span className={`role-badge role-${cost.role.toLowerCase()}`}>
                        {cost.role}
                      </span>
                    </td>
                    <td className="vendor-department">{cost.department}</td>
                    <td className="official-rate">€{cost.officialRate.toLocaleString()}</td>
                    <td className="real-rate">€{cost.realRate.toLocaleString()}</td>
                    <td className="estimated-mds">{cost.estimatedMDs}</td>
                    <td className="final-mds">
                      <input
                        type="number"
                        value={cost.finalMDs}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleFinalMDsChange(cost.vendorId, cost.role, cost.department, value);
                        }}
                        className="final-mds-input"
                        min="0"
                      />
                    </td>
                    <td className="tot-cost">€{cost.totCost.toLocaleString()}</td>
                    <td className="final-tot-cost">
                      <strong>€{cost.finalTotCost.toLocaleString()}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
              
              {/* Footer con totali */}
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={7}><strong>TOTALS</strong></td>
                  <td className="total-cost">
                    <strong>€{filteredCosts.reduce((sum, cost) => sum + cost.totCost, 0).toLocaleString()}</strong>
                  </td>
                  <td className="total-final-cost">
                    <strong>€{filteredCosts.reduce((sum, cost) => sum + cost.finalTotCost, 0).toLocaleString()}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <i className="fas fa-chart-line"></i>
            <h3>No calculations available</h3>
            <p>Add features or phases to generate cost calculations.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculationsPage;