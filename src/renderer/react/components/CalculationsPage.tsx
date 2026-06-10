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
import RateSpecificationModal from './RateSpecificationModal';

interface CalculationsPageProps {
  // Props interface (se necessario)
}

// Working Package Resource interface
interface WorkingPackageResource {
  vendorId: string;
  jobCluster: string;
  seniority: string;
  location: string;
  deliveryModel: string;
}

const CalculationsPage: React.FC<CalculationsPageProps> = () => {
  // State for copy feedback
  const [isCopied, setIsCopied] = React.useState(false);

  // SOLO lettura dallo store - Selettori specifici per massima reattivita
  const currentProject = useStore(state => state.currentProject);
  const currentPhases = useStore(state => state.currentPhases);
  const calculationsData = useStore(state => state.calculationsData);

  // Selettori specifici per ogni proprieta per forzare re-render
  const calculationsVersion = useStore(state => state.calculationsData?.version || 0);

  // MODE-AWARE SELECTORS: Read from correct data section based on mode
  const workingPackageData = useStore(state => state.currentProject?.workingPackageData);
  const workingPackageEnabled = workingPackageData?.enabled || false;

  const vendorCosts = useStore(state => {
    const isWP = state.currentProject?.workingPackageData?.enabled;
    let costs;
    if (isWP) {
      costs = state.calculationsData?.workingPackage?.vendorCosts || [];
    } else {
      costs = state.calculationsData?.featureBased?.vendorCosts || [];
    }
    console.log('🔍 VENDOR_COSTS SELECTOR - Mode:', isWP ? 'WP' : 'FB', 'Count:', costs.length);
    return costs;
  });

  const kpiData = useStore(state => {
    const isWP = state.currentProject?.workingPackageData?.enabled;
    if (isWP) {
      return state.calculationsData?.workingPackage?.kpiData;
    } else {
      return state.calculationsData?.featureBased?.kpiData;
    }
  });
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
  // MODE-AWARE: Separate overrides for FB and WP modes
  const finalMDsOverrides = useStore(state => {
    const isWP = state.currentProject?.workingPackageData?.enabled;
    if (isWP) {
      return state.calculationsData?.workingPackage?.finalMDsOverrides || {};
    } else {
      return state.calculationsData?.featureBased?.finalMDsOverrides || {};
    }
  });

  // Working Package calculated data (from separate store section)
  const workingPackageCalculated = useStore(state => state.calculationsData?.workingPackage);

  // Working Package resource selections (for full rate details)
  const workingPackageResources = useStore(state => state.workingPackageResources);

  // All suppliers for vendor selection
  const allSuppliers = useStore(state => {
    const app = (window as any).app;
    const configManager = app?.managers?.config;
    if (!configManager) return [];

    const currentProject = state.currentProject;
    const projectConfig = currentProject?.configuration || currentProject?.config;
    const vendors = configManager.getVendors() || [];

    return vendors.map((v: any) => ({ ...v, type: v.type || 'external' }));
  });

  // Expand vendors by job cluster roles and filter for Working Package categories
  const expandedSuppliers = useMemo(() => {
    const expanded: any[] = [];
    allSuppliers.forEach((vendor: any) => {
      if (vendor.jobClusters && vendor.jobClusters.length > 0) {
        vendor.jobClusters.forEach((jc: any) => {
          if (jc.role) {
            expanded.push({
              ...vendor,
              jobClusterId: jc.clusterId,
              role: jc.role,
              displayName: `${vendor.name} - ${jc.clusterId} (${jc.role})`
            });
          }
        });
      } else {
        // Vendor without job clusters - include as-is (backward compatibility)
        expanded.push(vendor);
      }
    });
    return expanded;
  }, [allSuppliers]);

  const gtoSuppliers = useMemo(() => {
    return expandedSuppliers.filter((s: any) => s.role === 'G2' || s.role === 'TA');
  }, [expandedSuppliers]);

  const gdsSuppliers = useMemo(() => {
    return expandedSuppliers.filter((s: any) => s.role === 'G1' || s.role === 'PM');
  }, [expandedSuppliers]);

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
    getVendorCountsByCategory,
    clearFinalMDsOverrides,
    setWorkingPackageEnabled,
    updateWorkingPackage,
    updateWorkingPackageCategory,
    updateWorkingPackageResource,
    openRateSpecModalForWP,
    closeRateSpecModal
  } = useCalculationsActions();

  // Helper function to get formatted resource display string
  const getResourceDisplay = (resource: WorkingPackageResource | null, vendorName: string, vendorCosts: any[]): string => {
    if (!resource) return 'Not specified';
    const { jobCluster, seniority, location, deliveryModel } = resource;
    // Get rate from vendorCosts using vendorId only
    // The rate is per vendor, not per role position
    const rate = vendorCosts.find((c: any) => c.vendorId === resource.vendorId);
    const rateDisplay = rate ? `€${rate.realRate.toLocaleString()}/day` : 'Rate not found';
    return `${vendorName} - ${jobCluster} - ${seniority} (${location}/${deliveryModel}) - ${rateDisplay}`;
  };

  // Helper function to get resource details from workingPackageResources
  const getWPResource = (category: 'gto' | 'gds', type: 'primaryResource' | 'secondaryResource') => {
    return workingPackageResources[category]?.[type as keyof typeof workingPackageResources[category]];
  };

  // Helper function to get vendor info by id
  const getVendorById = (vendorId: string | null) => {
    if (!vendorId) return null;
    return allSuppliers.find((v: any) => v.id === vendorId);
  };

  // Helper function to get resource display for WP category/role
  const getWPResourceDisplay = (category: 'gto' | 'gds', type: 'primaryResource' | 'secondaryResource', vendorCosts: any[]) => {
    const resource = getWPResource(category, type);
    const vendorId = type === 'primaryResource'
      ? workingPackageData?.[category]?.primaryVendorId
      : workingPackageData?.[category]?.secondaryVendorId;
    const vendor = getVendorById(vendorId);
    const vendorName = vendor?.name || 'Unknown Vendor';

    return getResourceDisplay(resource, vendorName, vendorCosts);
  };

  // Helper function to open rate spec modal for WP
  const handleOpenRateSpecWP = (category: 'gto' | 'gds', type: 'primaryResource' | 'secondaryResource') => {
    // Map category + type to role
    // GTO primary -> G2, GTO secondary -> TA
    // GDS primary -> G1, GDS secondary -> PM
    const roleMap: Record<string, string> = {
      'gto-primaryResource': 'G2',
      'gto-secondaryResource': 'TA',
      'gds-primaryResource': 'G1',
      'gds-secondaryResource': 'PM'
    };
    const roleKey = `${category}-${type}`;
    const role = roleMap[roleKey];
    if (role) {
      openRateSpecModalForWP(role);
    }
  };

  // Render supplier control group for WP mode
  const renderSupplierControlGroup = (
    category: 'gto' | 'gds',
    type: 'primaryResource' | 'secondaryResource',
    label: string
  ) => {
    const resource = getWPResource(category, type);
    const vendorId = type === 'primaryResource'
      ? workingPackageData?.[category]?.primaryVendorId
      : workingPackageData?.[category]?.secondaryVendorId;
    const vendor = getVendorById(vendorId);
    const vendorName = vendor?.name || 'Unknown Vendor';

    const displayText = getResourceDisplay(resource, vendorName, vendorCosts);

    return (
      <div className="form-row">
        <label>{label}:</label>
        <div className="supplier-control-group">
          <div className="resource-display">{displayText}</div>
          <button
            type="button"
            className="btn btn-small btn-secondary btn-specify-rate"
            title="Specify full rate details"
            onClick={() => handleOpenRateSpecWP(category, type)}
          >
            <i className="fas fa-edit"></i>
          </button>
        </div>
      </div>
    );
  };

  // Handler eventi (SOLO chiamate ad Actions)
  const handleFinalMDsChange = (vendorId: string, role: string, value: number) => {
    // MAI business logic qui! Solo chiamata ad Actions
    updateFinalMDs(vendorId, role, value);
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

  // Helper function to get input value from finalMDsOverrides or fallback to finalMDs (calculated value)
  const getInputValue = (cost: any) => {
    const key = `${cost.vendorId}_${cost.role}`; // Senza department
    return finalMDsOverrides[key] ?? cost.finalMDs;
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

  // Ref to track previous project for detecting project changes
  const previousProjectIdRef = React.useRef<string | undefined>();

  // Calcola al mount e quando cambia progetto o phases (calcoli ogni volta come richiesto)
  useEffect(() => {
    if (currentProject) {
      // Check if project changed (by ID)
      const projectIdChanged = currentProject.id !== previousProjectIdRef.current;

      // Only clear overrides when switching projects (not on initial load)
      // previousProjectIdRef.current === undefined means this is the initial load
      if (projectIdChanged && previousProjectIdRef.current !== undefined) {
        console.log('📦 Project changed - clearing overrides and recalculating');
        // Reset all overrides on project change (but not on initial load)
        clearFinalMDsOverrides();
      }

      if (projectIdChanged) {
        previousProjectIdRef.current = currentProject.id;
      }

      // ALWAYS recalculate when project or phases change
      // This ensures Development phase changes are reflected in calculations
      console.log('🔄 Recalculating project costs (project or phases changed)');
      calculateProjectCosts();
    }
  }, [currentProject, currentPhases, calculateProjectCosts, clearFinalMDsOverrides]);

  return (
    <div className="calculations-page">
      {/* Page Header */}
      <div className="page-header">
        <h2>Calculations Dashboard</h2>
      </div>

      {/* Calculation Mode Selector */}
      <div className="calculation-mode-section">
        <div className="calculation-mode-selector">
          <label>Estimation Mode:</label>
          <div className="mode-buttons">
            <button
              className={`mode-btn ${!workingPackageEnabled ? 'active' : ''}`}
              onClick={() => setWorkingPackageEnabled(false)}
              aria-pressed={!workingPackageEnabled}
            >
              Feature-based
            </button>
            <button
              className={`mode-btn ${workingPackageEnabled ? 'active' : ''}`}
              onClick={() => setWorkingPackageEnabled(true)}
              aria-pressed={workingPackageEnabled}
            >
              Working Package
            </button>
          </div>
        </div>
      </div>

      {/* Working Package Form */}
      {workingPackageEnabled && (
        <div className="working-package-section">
          {/* GTO Configuration */}
          <div className="working-package-form">
            <h4>
              <label className="category-enable-label">
                <input
                  type="checkbox"
                  checked={workingPackageData?.gto?.enabled || false}
                  onChange={(e) => updateWorkingPackageCategory('gto', {
                    enabled: e.target.checked
                  })}
                />
                GTO Working Package
              </label>
            </h4>

            {workingPackageData?.gto?.enabled && (
              <>
                <div className="form-row">
                  <label>Total Amount:</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={workingPackageData?.gto?.totalAmount || 0}
                      onChange={(e) => updateWorkingPackageCategory('gto', {
                        totalAmount: parseFloat(e.target.value) || 0
                      })}
                      className="form-input"
                    />
                    <span className="input-suffix">€</span>
                  </div>
                </div>

                <div className="form-row">
                  <label>Primary Vendor:</label>
                  {renderSupplierControlGroup('gto', 'primaryResource', 'Primary Vendor')}
                </div>

                <div className="form-row">
                  <label>Secondary %:</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={workingPackageData?.gto?.secondaryPercentage || 0}
                      onChange={(e) => updateWorkingPackageCategory('gto', {
                        secondaryPercentage: parseFloat(e.target.value) || 0
                      })}
                      className="form-input"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>

                <div className="form-row">
                  <label>Secondary Vendor:</label>
                  {renderSupplierControlGroup('gto', 'secondaryResource', 'Secondary Vendor')}
                </div>
              </>
            )}
          </div>

          {/* GDS Configuration */}
          <div className="working-package-form">
            <h4>
              <label className="category-enable-label">
                <input
                  type="checkbox"
                  checked={workingPackageData?.gds?.enabled || false}
                  onChange={(e) => updateWorkingPackageCategory('gds', {
                    enabled: e.target.checked
                  })}
                />
                GDS Working Package
              </label>
            </h4>

            {workingPackageData?.gds?.enabled && (
              <>
                <div className="form-row">
                  <label>Total Amount:</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={workingPackageData?.gds?.totalAmount || 0}
                      onChange={(e) => updateWorkingPackageCategory('gds', {
                        totalAmount: parseFloat(e.target.value) || 0
                      })}
                      className="form-input"
                    />
                    <span className="input-suffix">€</span>
                  </div>
                </div>

                <div className="form-row">
                  <label>Primary Vendor:</label>
                  {renderSupplierControlGroup('gds', 'primaryResource', 'Primary Vendor')}
                </div>

                <div className="form-row">
                  <label>Secondary %:</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={workingPackageData?.gds?.secondaryPercentage || 0}
                      onChange={(e) => updateWorkingPackageCategory('gds', {
                        secondaryPercentage: parseFloat(e.target.value) || 0
                      })}
                      className="form-input"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>

                <div className="form-row">
                  <label>Secondary Vendor:</label>
                  {renderSupplierControlGroup('gds', 'secondaryResource', 'Secondary Vendor')}
                </div>
              </>
            )}
          </div>

          {/* Working Package Summary */}
          {workingPackageCalculated?.calculated && (
            <div className="working-package-summary">
              <h4>Cost Summary</h4>

              {/* GTO Summary */}
              {(workingPackageData?.gto?.enabled || workingPackageCalculated?.calculated?.gto?.totalAmount > 0) && (
                <div className="summary-category gto-summary">
                  <h5>GTO</h5>
                  <div className="summary-row primary">
                    <span>Primary:</span>
                    <span>{(workingPackageCalculated?.calculated?.gto?.primaryAmount || 0).toLocaleString()} €</span>
                  </div>
                  <div className="summary-row secondary">
                    <span>Secondary:</span>
                    <span>{(workingPackageCalculated?.calculated?.gto?.secondaryAmount || 0).toLocaleString()} €</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total GTO:</span>
                    <span>{(workingPackageCalculated?.calculated?.gto?.totalAmount || 0).toLocaleString()} €</span>
                  </div>
                </div>
              )}

              {/* GDS Summary */}
              {(workingPackageData?.gds?.enabled || workingPackageCalculated?.calculated?.gds?.totalAmount > 0) && (
                <div className="summary-category gds-summary">
                  <h5>GDS</h5>
                  <div className="summary-row primary">
                    <span>Primary:</span>
                    <span>{(workingPackageCalculated?.calculated?.gds?.primaryAmount || 0).toLocaleString()} €</span>
                  </div>
                  <div className="summary-row secondary">
                    <span>Secondary:</span>
                    <span>{(workingPackageCalculated?.calculated?.gds?.secondaryAmount || 0).toLocaleString()} €</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total GDS:</span>
                    <span>{(workingPackageCalculated?.calculated?.gds?.totalAmount || 0).toLocaleString()} €</span>
                  </div>
                </div>
              )}

              {/* Project Total */}
              <div className="summary-row grand-total">
                <span>Project Total:</span>
                <span>{(workingPackageCalculated?.projectTotal || 0).toLocaleString()} €</span>
              </div>
            </div>
          )}
        </div>
      )}

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
            aria-pressed={categoryFilter === 'all'}
          >
            ALL
            <span className="filter-count">({vendorCounts.all})</span>
          </button>
          <button
            className={`filter-btn filter-btn-gto ${categoryFilter === 'gto' ? 'active' : ''}`}
            onClick={() => applyCategoryFilter('gto')}
            aria-pressed={categoryFilter === 'gto'}
          >
            GTO
            <span className="filter-count">({vendorCounts.gto})</span>
          </button>
          <button
            className={`filter-btn filter-btn-gds ${categoryFilter === 'gds' ? 'active' : ''}`}
            onClick={() => applyCategoryFilter('gds')}
            aria-pressed={categoryFilter === 'gds'}
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
            <table className={`data-table calculations-table ${workingPackageEnabled ? 'wp-mode' : 'fb-mode'}`}>
              <thead>
                <tr>
                  <th>Vendor</th>
                  {workingPackageEnabled ? (
                    <>
                      <th>Role</th>
                      <th>Type</th>
                      <th>Total MDs</th>
                      <th>Final Tot MDs</th>
                      <th>Rate</th>
                      <th>Tot Cost</th>
                      <th>Final Tot Cost</th>
                    </>
                  ) : (
                    <>
                      <th>Role</th>
                      <th>Type</th>
                      <th>Estimated MDs</th>
                      <th>Final MDs</th>
                      <th>Rate</th>
                      <th>Total Cost</th>
                      <th>Final Total Cost</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredCosts.map((cost) => (
                  <tr key={`${cost.vendorId}_${cost.role}_${cost.allocationType || 'default'}`}>
                    <td className="vendor-name">
                      {cost.vendorName}
                      {cost.isInternal && <span className="internal-badge"> (Internal)</span>}
                    </td>
                    {/* Column 2: Role (WP) or Role (FB) */}
                    <td className={workingPackageEnabled ? "wp-role" : "vendor-role"}>
                      {workingPackageEnabled ? (
                        <span className={`role-badge role-${cost.role.toLowerCase()}`}>
                          {cost.role}
                        </span>
                      ) : (
                        <span className={`role-badge role-${cost.role.toLowerCase()}`}>
                          {cost.role}
                        </span>
                      )}
                    </td>
                    {/* Column 3: Type (shown in both WP and FB modes) */}
                    <td className="wp-type">
                      <span className={`type-badge type-${cost.isInternal ? 'internal' : 'external'}`}>
                        {cost.isInternal ? 'Internal' : 'External'}
                      </span>
                    </td>
                    {/* Column 4: Total MDs (WP) / Estimated MDs (FB) */}
                    <td className="total-mds">{cost.estimatedMDs.toFixed(1)}</td>
                    {/* Column 5: Final Tot MDs (WP) / Final MDs (FB) - editable */}
                    <td className="final-tot-mds">
                      <input
                        type="number"
                        value={getInputValue(cost)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          handleFinalMDsChange(cost.vendorId, cost.role, value);
                        }}
                        className="final-mds-input"
                        min="0"
                        step="0.1"
                        key={`${cost.vendorId}_${cost.role}_${workingPackageEnabled ? 'wp' : 'fb'}`}
                      />
                      <button
                        className="reset-mds-btn"
                        onClick={() => resetSingleFinalMD(cost.vendorId, cost.role)}
                        title="Reset to calculated value"
                      >
                        ↻
                      </button>
                    </td>
                    {/* Column 6: Rate */}
                    <td className="real-rate">€{cost.realRate.toLocaleString()}</td>
                    {/* Column 7: Tot Cost (WP) / Total Cost (FB) */}
                    <td className="total-cost">€{cost.totCost.toLocaleString()}</td>
                    {/* Column 8: Final Tot Cost (WP) / Final Total Cost (FB) */}
                    <td className={`final-tot-cost ${
                      cost.finalTotCost >= cost.totCost ? 'final-cost-higher' : 'final-cost-lower'
                    }`}>
                      <strong>€{cost.finalTotCost.toLocaleString()}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Footer con totali */}
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={6}><strong>TOTALS</strong></td>
                  <td className="total-cost">
                    <strong>€{filteredCosts.reduce((sum, cost) => sum + cost.totCost, 0).toLocaleString()}</strong>
                  </td>
                  {(() => {
                    const totalCost = filteredCosts.reduce((sum, cost) => sum + cost.totCost, 0);
                    const totalFinalCost = filteredCosts.reduce((sum, cost) => sum + cost.finalTotCost, 0);
                    return (
                      <td className={`total-final-cost ${
                        totalFinalCost >= totalCost ? 'final-cost-higher' : 'final-cost-lower'
                      }`}>
                        <strong>€{totalFinalCost.toLocaleString()}</strong>
                      </td>
                    );
                  })()}
                </tr>
              </tfoot>
            </table>

          </div>
        ) : (
          <div className="empty-state">
            <i className="fas fa-chart-line"></i>
            <h3>No calculations available</h3>
            <p>{workingPackageEnabled ? 'Configure the Working Package to generate cost calculations.' : 'Add features or phases to generate cost calculations.'}</p>
          </div>
        )}
      </div>
      {/* Rate Specification Modal for Working Package and Phases */}
      <RateSpecificationModal />
    </div>
  );
};

export default CalculationsPage;
