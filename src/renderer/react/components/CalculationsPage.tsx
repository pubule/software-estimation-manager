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
  // State for copy feedback
  const [isCopied, setIsCopied] = React.useState(false);
  
  // SOLO lettura dallo store - Selettori specifici per massima reattività
  const currentProject = useStore(state => state.currentProject);
  const calculationsData = useStore(state => state.calculationsData);
  
  // Selettori specifici per ogni proprietà per forzare re-render
  const calculationsVersion = useStore(state => state.calculationsData?.version || 0);
  const vendorCosts = useStore(state => {
    const costs = state.calculationsData?.vendorCosts || [];
    console.log('🔍 VENDOR_COSTS SELECTOR - Count:', costs.length);
    return costs;
  });
  const kpiData = useStore(state => state.calculationsData?.kpiData);
  // Force selectors to refresh using calculationsVersion
  const categoryFilter = useStore(state => {
    const version = state.calculationsData?.version || 0;
    const category = state.calculationsData?.filters?.category || 'all';
    console.log('🔍 CATEGORY_SELECTOR - Version:', version, 'Category:', category);
    return category;
  });
  const vendorFilter = useStore(state => {
    const version = state.calculationsData?.version || 0;
    const vendor = state.calculationsData?.filters?.vendor || 'all';
    console.log('🔍 VENDOR_SELECTOR - Version:', version, 'Vendor:', vendor);
    return vendor;
  });
  const roleFilter = useStore(state => {
    const version = state.calculationsData?.version || 0;
    const role = state.calculationsData?.filters?.role || 'all';
    console.log('🔍 ROLE_SELECTOR - Version:', version, 'Role:', role);
    return role;
  });
  
  // Combine for compatibility
  const filters = useMemo(() => {
    const result = { vendor: vendorFilter, role: roleFilter, category: categoryFilter };
    console.log('🔍 FILTERS COMBINED - Recalculating with:', { vendorFilter, roleFilter, categoryFilter });
    console.log('🔍 FILTERS COMBINED - Result filters:', result);
    return result;
  }, [vendorFilter, roleFilter, categoryFilter]);
  const finalMDsOverrides = useStore(state => state.calculationsData?.finalMDsOverrides || {});
  
  
  
  
  
  // Actions per operazioni business (attraverso hook)
  const {
    calculateProjectCosts,
    updateFinalMDs,
    applyFilters,
    applyCategoryFilter,
    shareByEmail,
    copyToClipboard,
    resetAllFinalMDs,
    resetSingleFinalMD,
    getVendorCountsByCategory
  } = useCalculationsActions();
  
  // Calcola al mount e quando cambia progetto (calcoli ogni volta come richiesto)
  useEffect(() => {
    
    if (currentProject) {
      // CRITICAL: Check if there are manual finalMDsOverrides that should be preserved
      const existingOverrides = calculationsData?.finalMDsOverrides;
      const hasManualOverrides = existingOverrides && Object.keys(existingOverrides).length > 0;
      
      if (hasManualOverrides) {
      } else {
        calculateProjectCosts();
      }
    } else {
    }
  }, [currentProject, calculateProjectCosts, calculationsData?.finalMDsOverrides]);
  
  // Handler eventi (SOLO chiamate ad Actions)
  const handleFinalMDsChange = (vendorId: string, role: string, department: string, value: number) => {
    // MAI business logic qui! Solo chiamata ad Actions
    updateFinalMDs(vendorId, role, department, value);
  };
  
  const handleFilterChange = (vendorFilter: string, roleFilter: string) => {
    // MAI business logic qui! Solo chiamata ad Actions
    applyFilters(vendorFilter, roleFilter);
  };
  
  const handleCopyTemplate = async () => {
    // MAI business logic qui! Solo chiamata ad Actions
    try {
      await copyToClipboard();
      setIsCopied(true);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
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
  
  // Helper function to get input value from finalMDsOverrides or fallback to estimatedMDs
  const getInputValue = (cost: any) => {
    const key = `${cost.vendorId}_${cost.role}_${cost.department}`;
    return finalMDsOverrides[key] ?? cost.estimatedMDs;
  };

  // Computed values per UI (derived state) - LOCAL reactive filtering
  const filteredCosts = useMemo(() => {
    console.log('🔍 FILTERED COSTS - Recalculating with filters:', filters);
    console.log('🔍 FILTERED COSTS - VendorCosts count:', vendorCosts.length);
    
    const result = vendorCosts.filter(cost => {
      const vendorMatch = filters.vendor === 'all' || cost.vendorId === filters.vendor;
      const roleMatch = filters.role === 'all' || cost.role === filters.role;
      
      // Category filter (GTO = G2 + TA, GDS = G1 + PM)
      let categoryMatch = true;
      if (filters.category === 'gto') {
        categoryMatch = cost.role === 'G2' || cost.role === 'TA';
      } else if (filters.category === 'gds') {
        categoryMatch = cost.role === 'G1' || cost.role === 'PM';
      }
      
      const matches = vendorMatch && roleMatch && categoryMatch;
      if (!matches) {
        console.log('🔍 FILTERED COSTS - Filtering out:', { 
          vendor: cost.vendorName, 
          role: cost.role, 
          vendorMatch, 
          roleMatch, 
          categoryMatch,
          filterCategory: filters.category
        });
      }
      
      return matches;
    });
    
    console.log('🔍 FILTERED COSTS - Result count:', result.length, 'from', vendorCosts.length);
    return result;
  }, [vendorCosts, filters]);
  
  // Calculate vendor counts for category filters (reactive to vendorCosts)
  const vendorCounts = useMemo(() => {
    if (!vendorCosts || vendorCosts.length === 0) {
      return { all: 0, gto: 0, gds: 0 };
    }
    
    // Count unique vendors per category
    const uniqueVendors = new Set(vendorCosts.map(cost => cost.vendorId));
    const gtoVendors = new Set(vendorCosts.filter(cost => cost.role === 'G2' || cost.role === 'TA').map(cost => cost.vendorId));
    const gdsVendors = new Set(vendorCosts.filter(cost => cost.role === 'G1' || cost.role === 'PM').map(cost => cost.vendorId));
    
    return {
      all: uniqueVendors.size,
      gto: gtoVendors.size,
      gds: gdsVendors.size
    };
  }, [vendorCosts]);
  
  const uniqueVendors = useMemo(() => {
    const vendors = new Map<string, { id: string, name: string }>();
    vendorCosts.forEach(cost => {
      if (!vendors.has(cost.vendorId)) {
        vendors.set(cost.vendorId, { id: cost.vendorId, name: cost.vendorName });
      }
    });
    return Array.from(vendors.values());
  }, [vendorCosts]);
  
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    vendorCosts.forEach(cost => {
      roles.add(cost.role);
    });
    return Array.from(roles);
  }, [vendorCosts]);
  
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
      </div>

      {/* KPI Cards Section */}
      {kpiData && (
        <div className="calculations-kpis">
          <div className="kpi-cards">
            {/* GTO Card */}
            <div className="kpi-card gto-card">
              <div className="kpi-header">
                <h3>GTO (G2, TA)</h3>
                <span className="kpi-subtitle">G2 + TA Resources</span>
              </div>
              <div className="kpi-metrics">
                <div className="kpi-metric">
                  <span className="metric-label">Internal:</span>
                  <div>
                    <span className="metric-value">{kpiData.gto.internalPercentage.toFixed(1)}%</span>
                    <span className="metric-cost">€{kpiData.gto.internal.toLocaleString()}</span>
                  </div>
                </div>
                <div className="kpi-metric">
                  <span className="metric-label">External:</span>
                  <div>
                    <span className="metric-value">{kpiData.gto.externalPercentage.toFixed(1)}%</span>
                    <span className="metric-cost">€{kpiData.gto.external.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="kpi-total">
                <span className="total-label">Total GTO</span>
                <span className="total-cost">€{kpiData.gto.total.toLocaleString()}</span>
              </div>
            </div>

            {/* GDS Card */}
            <div className="kpi-card gds-card">
              <div className="kpi-header">
                <h3>GDS (G1, PM)</h3>
                <span className="kpi-subtitle">G1 + PM Resources</span>
              </div>
              <div className="kpi-metrics">
                <div className="kpi-metric">
                  <span className="metric-label">Internal:</span>
                  <div>
                    <span className="metric-value">{kpiData.gds.internalPercentage.toFixed(1)}%</span>
                    <span className="metric-cost">€{kpiData.gds.internal.toLocaleString()}</span>
                  </div>
                </div>
                <div className="kpi-metric">
                  <span className="metric-label">External:</span>
                  <div>
                    <span className="metric-value">{kpiData.gds.externalPercentage.toFixed(1)}%</span>
                    <span className="metric-cost">€{kpiData.gds.external.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="kpi-total">
                <span className="total-label">Total GDS</span>
                <span className="total-cost">€{kpiData.gds.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Total Project Card */}
            <div className="kpi-card total-card">
              <div className="kpi-header">
                <h3>Total Project</h3>
                <span className="kpi-subtitle">Complete Cost Breakdown</span>
              </div>
              <div className="kpi-total-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">GTO Cost</span>
                  <span className="breakdown-cost">€{kpiData.gto.total.toLocaleString()}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">GDS Cost</span>
                  <span className="breakdown-cost">€{kpiData.gds.total.toLocaleString()}</span>
                </div>
                <div className="breakdown-total">
                  <span className="breakdown-label">Total Project</span>
                  <span className="total-cost">€{kpiData.totalProject.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Cost Summary Section */}
      <div className="vendor-cost-summary">
        <div className="vendor-cost-header">
          <h3>Vendor Cost Summary</h3>
          <button 
            className={`btn ${isCopied ? 'btn-success' : 'btn-primary'} btn-share`}
            onClick={handleCopyTemplate}
            title="Copy template to Clipboard"
            disabled={isCopied}
          >
            <i className={`fas ${isCopied ? 'fa-check' : 'fa-copy'}`}></i> {isCopied ? 'Copied!' : 'Share'}
          </button>
        </div>
        
        {/* Category Filter Buttons */}
        <div className="filter-buttons-group">
          <button 
            className={`filter-btn filter-btn-all ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => applyCategoryFilter('all')}
          >
            ALL
            <span className="filter-count">({vendorCounts.all})</span>
          </button>
          <button 
            className={`filter-btn filter-btn-gto ${categoryFilter === 'gto' ? 'active' : ''}`}
            onClick={() => applyCategoryFilter('gto')}
          >
            GTO
            <span className="filter-count">({vendorCounts.gto})</span>
          </button>
          <button 
            className={`filter-btn filter-btn-gds ${categoryFilter === 'gds' ? 'active' : ''}`}
            onClick={() => applyCategoryFilter('gds')}
          >
            GDS
            <span className="filter-count">({vendorCounts.gds})</span>
          </button>
        </div>
        
        {/* Filters Section */}
        <div className="filters-section">
          <div className="filters-bar">
            <div className="filter-group">
              <label htmlFor="vendor-filter">VENDOR:</label>
              <select 
                id="vendor-filter"
                value={filters.vendor}
                onChange={(e) => handleFilterChange(e.target.value, filters.role)}
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
              <label htmlFor="role-filter">ROLE:</label>
              <select 
                id="role-filter"
                value={filters.role}
                onChange={(e) => handleFilterChange(filters.vendor, e.target.value)}
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
                  <th>Total MDs</th>
                  <th>Official Tot MDs</th>
                  <th>Final Tot MDs</th>
                  <th>Official Rate</th>
                  <th>Total Cost</th>
                  <th>Final Tot Cost</th>
                </tr>
              </thead>
              <tbody>
                {filteredCosts.map((cost, index) => (
                  <tr key={`${cost.vendorId}_${cost.role}_${cost.department}`}>
                    <td className="vendor-name">
                      {cost.vendorName}
                      {cost.isInternal && <span className="internal-badge"> (Internal)</span>}
                    </td>
                    <td className="vendor-role">
                      <span className={`role-badge role-${cost.role.toLowerCase()}`}>
                        {cost.role}
                      </span>
                    </td>
                    <td className="vendor-department">{cost.department}</td>
                    <td className="total-mds">{cost.estimatedMDs}</td>
                    <td className="official-tot-mds">{cost.estimatedMDs}</td>
                    <td className="final-tot-mds">
                      <input
                        type="number"
                        value={getInputValue(cost)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          handleFinalMDsChange(cost.vendorId, cost.role, cost.department, value);
                        }}
                        className="final-mds-input"
                        min="0"
                        step="0.1"
                        key={`${cost.vendorId}_${cost.role}_${cost.department}`}
                      />
                      <button
                        className="reset-mds-btn"
                        onClick={() => resetSingleFinalMD(cost.vendorId, cost.role, cost.department)}
                        title="Reset to Official value"
                      >
                        ↻
                      </button>
                    </td>
                    <td className="official-rate">€{cost.officialRate.toLocaleString()}</td>
                    <td className="total-cost">€{cost.totCost.toLocaleString()}</td>
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