/**
 * CalculationsManager - Handles cost calculations, KPI analysis, and vendor summaries
 * Provides comprehensive project cost breakdown and resource utilization metrics
 */
class CalculationsManager {
    constructor(app, configManager) {
        
        this.app = app;
        this.configManager = configManager;
        this.vendorCosts = [];
        this.kpiData = {};
        this.currentFilters = {
            vendor: '',
            role: '',
            roleGroup: 'all'
        };

        // Bind event handlers once to enable proper cleanup
        this.boundHandlers = {
            filterChipClick: this.handleFilterChipClick.bind(this),
            vendorFilterChange: this.handleVendorFilterChange.bind(this),
            roleFilterChange: this.handleRoleFilterChange.bind(this),
            shareClick: this.shareByEmail.bind(this),
            tableBlur: this.handleTableBlur.bind(this),
            tableClick: this.handleTableClick.bind(this)
        };
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Filter event listeners will be added after render
    }

    /**
     * Render the calculations dashboard
     */
    render() {
        const container = document.querySelector('.calculations-content');
        if (!container) return;

        const currentProject = this.app?.currentProject;
        if (!currentProject) {
            container.innerHTML = this.renderNoProjectState();
            return;
        }

        // Calculate all data
        this.calculateVendorCosts();
        this.calculateKPIs();

        container.innerHTML = `
            ${this.renderKPICards()}
            ${this.renderCostTable()}
        `;

        this.attachTableEventListeners();
    }

    /**
     * Calculate vendor costs aggregating from phases and features
     */
    calculateVendorCosts() {
        
        const currentProject = this.app?.currentProject;
        if (!currentProject || !this.configManager) {
            this.vendorCosts = [];
            return;
        }

        const projectConfig = this.configManager.getProjectConfig(currentProject.config);
        const allSuppliers = [...projectConfig.suppliers, ...projectConfig.internalResources];

        // Debug: Show which suppliers have internal vs external rates

        projectConfig.internalResources.forEach(supplier => {
            const hasInternal = supplier.internalRate !== undefined && supplier.internalRate !== null;
            const hasExternal = supplier.officialRate !== undefined && supplier.officialRate !== null;

        });
        
        projectConfig.suppliers.forEach(supplier => {
            const hasInternal = supplier.internalRate !== undefined && supplier.internalRate !== null;
            const hasExternal = supplier.officialRate !== undefined && supplier.officialRate !== null;

        });

        // Debug selected suppliers

        let selectedSuppliers = currentProject.phases?.selectedSuppliers || {};

        if (Object.keys(selectedSuppliers).length === 0) {
            console.log('WARNING: No selected suppliers found. This will cause empty calculations.');
            console.log('Trying to initialize phases if phases manager is available...');
            
            // Try to initialize phases data if phases manager is available
            if (this.app.phasesManager || this.app.projectPhasesManager) {
                const phasesManager = this.app.phasesManager || this.app.projectPhasesManager;

                phasesManager.synchronizeWithProject();
                // Re-check after sync and update the local variable
                selectedSuppliers = currentProject.phases?.selectedSuppliers || {};

            }
        }
        
        Object.entries(selectedSuppliers).forEach(([role, supplierId]) => {
            const supplier = allSuppliers.find(s => s.id === supplierId);
            if (supplier) {
                const isFromInternalList = projectConfig.internalResources.some(ir => ir.id === supplierId);
                const isFromExternalList = projectConfig.suppliers.some(s => s.id === supplierId);

            }
        });
        
        // Create vendor costs map: vendorId_role -> { vendor, role, manDays, rate, cost }
        const vendorCostsMap = new Map();

        // Process phases data
        this.processPhasesCosts(vendorCostsMap, allSuppliers, currentProject);
        
        // Process features data  
        this.processFeaturesCosts(vendorCostsMap, allSuppliers, currentProject);

        // Convert map to array
        this.vendorCosts = Array.from(vendorCostsMap.values()).sort((a, b) => {
            if (a.vendor !== b.vendor) return a.vendor.localeCompare(b.vendor);
            return a.role.localeCompare(b.role);
        });

        // Restore any manually set finalMDs values from project data
        this.restoreFinalMDsFromProject();

    }

    /**
     * Process costs from project phases
     */
    processPhasesCosts(vendorCostsMap, allSuppliers, currentProject) {

        const phases = currentProject.phases;

        if (!phases || !phases.selectedSuppliers) {
            console.log('Missing phases data:', {
                phases: !!phases,
                selectedSuppliers: phases?.selectedSuppliers
            });
            return;
        }

        const selectedSuppliers = phases.selectedSuppliers;
        
        // Convert phases object to array - include development phase for all resource types except G2
        const phasesData = [];
        const phaseKeys = Object.keys(phases).filter(key => 
            key !== 'selectedSuppliers'
        );
        
        phaseKeys.forEach(phaseKey => {
            const phaseData = phases[phaseKey];
            if (phaseData && typeof phaseData === 'object' && phaseData.manDays !== undefined) {
                phasesData.push({
                    id: phaseKey,
                    ...phaseData
                });
            }
        });

        console.log('Note: Development phase G2 MDs will be calculated from features in processFeaturesCosts()');

        // Map resource types to roles
        const resourceRoleMap = {
            'G1': 'G1',
            'G2': 'G2', 
            'TA': 'TA',
            'PM': 'PM'
        };

        Object.entries(selectedSuppliers).forEach(([resourceType, supplierId]) => {

            if (!supplierId) {

                return;
            }

            const supplier = allSuppliers.find(s => s.id === supplierId);
            if (!supplier) {

                return;
            }

            const role = resourceRoleMap[resourceType];
            if (!role) {

                return;
            }

            // Calculate total man days for this resource type across all phases
            // For development phase, exclude G2 as it's calculated from features in processFeaturesCosts()
            let totalManDays = 0;
            phasesData.forEach(phase => {
                // Skip G2 calculation for development phase only
                if (phase.id === 'development' && resourceType === 'G2') {

                    return;
                }
                
                const phaseManDays = parseFloat(phase.manDays) || 0;
                const effortPercent = (phase.effort && phase.effort[resourceType]) || 0;
                const phaseMDs = (phaseManDays * effortPercent) / 100;
                totalManDays += phaseMDs;

            });

            if (totalManDays > 0) {
                const department = supplier.department || 'Unknown';
                const key = `${supplier.name}_${role}_${department}`;
                const realRate = this.getSupplierRate(supplier, role); // Use realRate for calculations
                const officialRate = supplier.officialRate || 0; // Official rate for display
                const cost = totalManDays * realRate;

                if (vendorCostsMap.has(key)) {
                    const existing = vendorCostsMap.get(key);
                    existing.manDays += totalManDays;
                    existing.cost += cost;
                    // Update finalMDs to reflect new total
                    const officialTotalMDs = existing.officialRate > 0 ? existing.cost / existing.officialRate : 0;
                    existing.finalMDs = Math.round(officialTotalMDs);

                } else {
                    const officialTotalMDs = officialRate > 0 ? cost / officialRate : 0;
                    vendorCostsMap.set(key, {
                        vendor: supplier.name,
                        vendorId: supplier.id,
                        role: role,
                        department: department,
                        manDays: totalManDays,
                        rate: realRate, // Rate used in calculations  
                        officialRate: officialRate, // Rate for display
                        cost: cost,
                        finalMDs: Math.round(officialTotalMDs), // Initialize with rounded official MDs
                        isInternal: this.isInternalResource(supplier)
                    });

                }
            }
        });

    }

    /**
     * Process costs from features (Development phase G2 resources)
     */
    processFeaturesCosts(vendorCostsMap, allSuppliers, currentProject) {

        const features = currentProject.features || [];
        const phases = currentProject.phases;

        if (!phases) {
            console.log('No phases data for features processing');
            return;
        }

        // Find development phase and G2 effort percentage - access directly from phases object
        const developmentPhase = phases.development;

        if (!developmentPhase) {
            console.log('No development phase found');
            return;
        }

        const g2EffortPercent = (developmentPhase.effort && developmentPhase.effort.G2) || 0;

        if (g2EffortPercent === 0) {
            console.log('G2 effort percent is 0, skipping features processing');
            return;
        }

        features.forEach((feature, index) => {
            console.log(`Processing feature ${index + 1}:`, feature);
            
            const supplierId = feature.supplier;
            if (!supplierId) {

                return;
            }

            const supplier = allSuppliers.find(s => s.id === supplierId);
            if (!supplier) {

                return;
            }

            const featureManDays = parseFloat(feature.manDays) || 0;
            const g2ManDays = (featureManDays * g2EffortPercent) / 100;

            if (g2ManDays > 0) {
                const department = supplier.department || 'Unknown';
                const key = `${supplier.name}_G2_${department}`;
                const realRate = this.getSupplierRate(supplier, 'G2'); // Use realRate for calculations
                const officialRate = supplier.officialRate || 0; // Official rate for display
                const cost = g2ManDays * realRate;

                if (vendorCostsMap.has(key)) {
                    const existing = vendorCostsMap.get(key);
                    existing.manDays += g2ManDays;
                    existing.cost += cost;
                    // Update finalMDs to reflect new total
                    const officialTotalMDs = existing.officialRate > 0 ? existing.cost / existing.officialRate : 0;
                    existing.finalMDs = Math.round(officialTotalMDs);

                } else {
                    const officialTotalMDs = officialRate > 0 ? cost / officialRate : 0;
                    vendorCostsMap.set(key, {
                        vendor: supplier.name,
                        vendorId: supplier.id,
                        role: 'G2',
                        department: department,
                        manDays: g2ManDays,
                        rate: realRate, // Rate used in calculations  
                        officialRate: officialRate, // Rate for display
                        cost: cost,
                        finalMDs: Math.round(officialTotalMDs), // Initialize with rounded official MDs
                        isInternal: this.isInternalResource(supplier)
                    });

                }
            }
        });

        // Process coverage MDs as additional G2 development costs
        const coverageMDs = parseFloat(currentProject.coverage) || 0;
        if (coverageMDs > 0 && g2EffortPercent > 0) {

            // For coverage, we need to determine which supplier to use
            // We'll use the selected G2 supplier from phases configuration
            const selectedSuppliers = phases.selectedSuppliers;
            const g2SupplierId = selectedSuppliers?.G2;
            
            if (g2SupplierId) {
                const g2Supplier = allSuppliers.find(s => s.id === g2SupplierId);
                if (g2Supplier) {
                    const coverageG2ManDays = (coverageMDs * g2EffortPercent) / 100;
                    const department = g2Supplier.department || 'Unknown';
                    const key = `${g2Supplier.name}_G2_${department}`;
                    const realRate = this.getSupplierRate(g2Supplier, 'G2');
                    const officialRate = g2Supplier.officialRate || 0;
                    const coverageCost = coverageG2ManDays * realRate;

                    if (vendorCostsMap.has(key)) {
                        const existing = vendorCostsMap.get(key);
                        existing.manDays += coverageG2ManDays;
                        existing.cost += coverageCost;
                        // Update finalMDs to reflect new total
                        const officialTotalMDs = existing.officialRate > 0 ? existing.cost / existing.officialRate : 0;
                        existing.finalMDs = Math.round(officialTotalMDs);

                    } else {
                        const officialTotalMDs = officialRate > 0 ? coverageCost / officialRate : 0;
                        vendorCostsMap.set(key, {
                            vendor: g2Supplier.name,
                            vendorId: g2Supplier.id,
                            role: 'G2',
                            department: department,
                            manDays: coverageG2ManDays,
                            rate: realRate,
                            officialRate: officialRate,
                            cost: coverageCost,
                            finalMDs: Math.round(officialTotalMDs), // Initialize with rounded official MDs
                            isInternal: this.isInternalResource(g2Supplier)
                        });

                    }
                } else {

                }
            } else {
                console.log('No G2 supplier selected for coverage calculation');
            }
        }

    }

    /**
     * Calculate KPI metrics
     */
    calculateKPIs() {
        // Calculate totals by role groups using Final Tot Cost
        const gtoRoles = ['G2', 'TA'];
        const gdsRoles = ['G1', 'PM'];

        const gtoInternal = this.vendorCosts
            .filter(vc => gtoRoles.includes(vc.role) && vc.isInternal)
            .reduce((sum, vc) => sum + ((vc.finalMDs || 0) * vc.officialRate), 0);

        const gtoExternal = this.vendorCosts
            .filter(vc => gtoRoles.includes(vc.role) && !vc.isInternal)
            .reduce((sum, vc) => sum + ((vc.finalMDs || 0) * vc.officialRate), 0);

        const gtoTotal = gtoInternal + gtoExternal;

        const gdsInternal = this.vendorCosts
            .filter(vc => gdsRoles.includes(vc.role) && vc.isInternal)
            .reduce((sum, vc) => sum + ((vc.finalMDs || 0) * vc.officialRate), 0);

        const gdsExternal = this.vendorCosts
            .filter(vc => gdsRoles.includes(vc.role) && !vc.isInternal)
            .reduce((sum, vc) => sum + ((vc.finalMDs || 0) * vc.officialRate), 0);

        const gdsTotal = gdsInternal + gdsExternal;

        this.kpiData = {
            gto: {
                internal: gtoInternal,
                external: gtoExternal,
                total: gtoTotal,
                internalPercentage: gtoTotal > 0 ? (gtoInternal / gtoTotal) * 100 : 0,
                externalPercentage: gtoTotal > 0 ? (gtoExternal / gtoTotal) * 100 : 0
            },
            gds: {
                internal: gdsInternal,
                external: gdsExternal, 
                total: gdsTotal,
                internalPercentage: gdsTotal > 0 ? (gdsInternal / gdsTotal) * 100 : 0,
                externalPercentage: gdsTotal > 0 ? (gdsExternal / gdsTotal) * 100 : 0
            },
            totalProject: gtoTotal + gdsTotal
        };
    }

    /**
     * Get supplier rate for specific role (uses real rate)
     */
    getSupplierRate(supplier, role) {
        const isInternal = this.isInternalResource(supplier);
        let rate = 0;
        
        // Always use realRate first, then fallback to officialRate if realRate not available
        if (supplier.realRate !== undefined && supplier.realRate !== null) {
            rate = supplier.realRate;
        } else if (isInternal) {
            // For internal resources, fallback to internalRate then officialRate
            rate = supplier.internalRate || supplier.officialRate || 0;
        } else {
            rate = supplier.officialRate || 0;
        }

        return rate;
    }

    /**
     * Check if supplier is internal resource
     */
    isInternalResource(supplier) {
        const currentProject = this.app?.currentProject;
        if (!currentProject || !this.configManager) return false;

        const projectConfig = this.configManager.getProjectConfig(currentProject.config);
        
        // Check if supplier is in the internalResources list
        const isFromInternalList = projectConfig.internalResources.some(ir => ir.id === supplier.id);
        
        // Also check rate structure as backup
        const hasInternalRate = supplier.internalRate !== undefined && supplier.internalRate !== null;
        const hasOfficialRate = supplier.officialRate !== undefined && supplier.officialRate !== null;
        
        // Primary check: is it from internal resources list?
        // Secondary check: has internal rate but no official rate
        const isInternal = isFromInternalList || (hasInternalRate && !hasOfficialRate);

        return isInternal;
    }

    /**
     * Render KPI cards
     */
    renderKPICards() {
        const kpi = this.kpiData;
        
        return `
            <div class="calculations-kpis">
                <div class="kpi-cards">
                    <div class="kpi-card gto-card">
                        <div class="kpi-header">
                            <h3>KPI GTO</h3>
                            <span class="kpi-subtitle">G2 + TA Resources</span>
                        </div>
                        <div class="kpi-metrics">
                            <div class="kpi-metric">
                                <span class="metric-label">Internal</span>
                                <span class="metric-value">${kpi.gto.internalPercentage.toFixed(1)}%</span>
                                <span class="metric-cost">€${kpi.gto.internal.toLocaleString()}</span>
                            </div>
                            <div class="kpi-metric">
                                <span class="metric-label">External</span>
                                <span class="metric-value">${kpi.gto.externalPercentage.toFixed(1)}%</span>
                                <span class="metric-cost">€${kpi.gto.external.toLocaleString()}</span>
                            </div>
                            <div class="kpi-total">
                                <span class="total-label">Total GTO</span>
                                <span class="total-cost">€${kpi.gto.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div class="kpi-card gds-card">
                        <div class="kpi-header">
                            <h3>KPI GDS</h3>
                            <span class="kpi-subtitle">G1 + PM Resources</span>
                        </div>
                        <div class="kpi-metrics">
                            <div class="kpi-metric">
                                <span class="metric-label">Internal</span>
                                <span class="metric-value">${kpi.gds.internalPercentage.toFixed(1)}%</span>
                                <span class="metric-cost">€${kpi.gds.internal.toLocaleString()}</span>
                            </div>
                            <div class="kpi-metric">
                                <span class="metric-label">External</span>
                                <span class="metric-value">${kpi.gds.externalPercentage.toFixed(1)}%</span>
                                <span class="metric-cost">€${kpi.gds.external.toLocaleString()}</span>
                            </div>
                            <div class="kpi-total">
                                <span class="total-label">Total GDS</span>
                                <span class="total-cost">€${kpi.gds.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div class="kpi-card total-card">
                        <div class="kpi-header">
                            <h3>Project Total</h3>
                            <span class="kpi-subtitle">Complete Cost Breakdown</span>
                        </div>
                        <div class="kpi-metrics">
                            <div class="kpi-total-breakdown">
                                <div class="breakdown-item">
                                    <span class="breakdown-label">GTO Cost</span>
                                    <span class="breakdown-cost">€${kpi.gto.total.toLocaleString()}</span>
                                </div>
                                <div class="breakdown-item">
                                    <span class="breakdown-label">GDS Cost</span>
                                    <span class="breakdown-cost">€${kpi.gds.total.toLocaleString()}</span>
                                </div>
                                <div class="breakdown-total">
                                    <span class="breakdown-label">Total Project</span>
                                    <span class="total-cost">€${kpi.totalProject.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render cost table with filters
     */
    renderCostTable() {
        const filteredCosts = this.getFilteredVendorCosts();
        
        return `
            <div class="calculations-table-section">
                <div class="calculations-section-header">
                    <h3>Vendor Cost Summary</h3>
                    <div class="table-actions">
                        <button class="btn btn-primary" id="share-calculations-btn">
                            <i class="fas fa-share"></i> Share
                        </button>
                    </div>
                </div>
                
                <div class="table-filters">
                    <div class="filter-chips">
                        <button class="filter-chip ${this.currentFilters.roleGroup === 'all' ? 'active' : ''}" 
                                data-filter-group="all">
                            ALL <span class="count">(${this.vendorCosts.length})</span>
                        </button>
                        <button class="filter-chip ${this.currentFilters.roleGroup === 'gto' ? 'active' : ''}" 
                                data-filter-group="gto">
                            GTO <span class="count">(${this.vendorCosts.filter(c => ['G2', 'TA'].includes(c.role)).length})</span>
                        </button>
                        <button class="filter-chip ${this.currentFilters.roleGroup === 'gds' ? 'active' : ''}" 
                                data-filter-group="gds">
                            GDS <span class="count">(${this.vendorCosts.filter(c => ['PM', 'G1'].includes(c.role)).length})</span>
                        </button>
                    </div>
                    <div class="filter-group">
                        <label>Vendor:</label>
                        <select id="vendor-filter">
                            <option value="">All Vendors</option>
                            ${this.getUniqueVendors().map(vendor => 
                                `<option value="${vendor}" ${this.currentFilters.vendor === vendor ? 'selected' : ''}>${vendor}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Role:</label>
                        <select id="role-filter">
                            <option value="">All Roles</option>
                            ${this.getUniqueRoles().map(role => 
                                `<option value="${role}" ${this.currentFilters.role === role ? 'selected' : ''}>${role}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>

                <div class="calculations-table-container">
                    <table class="calculations-table">
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
                                <th class="final-cost">Final Tot Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredCosts.length === 0 ? 
                                '<tr><td colspan="9" class="no-data">No cost data available</td></tr>' :
                                filteredCosts.map(cost => `
                                    <tr class="${cost.isInternal ? 'internal-resource' : 'external-supplier'}">
                                        <td>
                                            ${cost.vendor}
                                            <span class="resource-type">${cost.isInternal ? '(Internal)' : '(External)'}</span>
                                        </td>
                                        <td><span class="role-badge role-${cost.role.toLowerCase()}">${cost.role}</span></td>
                                        <td><span class="department-badge">${cost.department}</span></td>
                                        <td class="number">${cost.manDays.toFixed(1)}</td>
                                        <td class="number">${cost.officialRate > 0 ? (cost.cost / cost.officialRate).toFixed(1) : '0.0'}</td>
                                        <td class="number editable-cell">
                                            <input type="number" 
                                                   class="final-mds-input" 
                                                   value="${cost.finalMDs || 0}" 
                                                   min="0" 
                                                   step="1"
                                                   data-vendor-id="${cost.vendorId}"
                                                   data-role="${cost.role}"
                                                   data-department="${cost.department}">
                                            <button type="button" 
                                                    class="reset-final-mds-btn" 
                                                    title="Reset to calculated value"
                                                    data-vendor-id="${cost.vendorId}"
                                                    data-role="${cost.role}"
                                                    data-department="${cost.department}">
                                                <i class="fas fa-undo"></i>
                                            </button>
                                        </td>
                                        <td class="currency">€${cost.officialRate.toLocaleString()}/day</td>
                                        <td class="currency total-cost">€${cost.cost.toLocaleString()}</td>
                                        <td class="currency final-cost">€${((cost.finalMDs || 0) * cost.officialRate).toLocaleString()}</td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                        ${filteredCosts.length > 0 ? (() => {
                            const totalCost = filteredCosts.reduce((sum, c) => sum + c.cost, 0);
                            const finalTotalCost = filteredCosts.reduce((sum, c) => sum + ((c.finalMDs || 0) * c.officialRate), 0);
                            const finalCostClass = finalTotalCost > totalCost ? 'final-cost-higher' : 'final-cost-lower';
                            
                            return `
                            <tfoot>
                                <tr class="totals-row">
                                    <td colspan="3"><strong>Total</strong></td>
                                    <td class="number"><strong>${filteredCosts.reduce((sum, c) => sum + c.manDays, 0).toFixed(1)}</strong></td>
                                    <td class="number"><strong>${filteredCosts.reduce((sum, c) => sum + (c.officialRate > 0 ? c.cost / c.officialRate : 0), 0).toFixed(1)}</strong></td>
                                    <td class="number"><strong>${filteredCosts.reduce((sum, c) => sum + (c.finalMDs || 0), 0)}</strong></td>
                                    <td></td>
                                    <td class="currency total-cost"><strong>€${totalCost.toLocaleString()}</strong></td>
                                    <td class="currency final-cost ${finalCostClass}"><strong>€${finalTotalCost.toLocaleString()}</strong></td>
                                </tr>
                            </tfoot>
                            `;
                        })() : ''}
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Get filtered vendor costs based on current filters
     */
    getFilteredVendorCosts() {
        return this.vendorCosts.filter(cost => {
            // Role group filter
            if (this.currentFilters.roleGroup === 'gto' && !['G2', 'TA'].includes(cost.role)) {
                return false;
            }
            if (this.currentFilters.roleGroup === 'gds' && !['PM', 'G1'].includes(cost.role)) {
                return false;
            }
            
            // Vendor filter
            if (this.currentFilters.vendor && cost.vendor !== this.currentFilters.vendor) {
                return false;
            }
            
            // Individual role filter
            if (this.currentFilters.role && cost.role !== this.currentFilters.role) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * Get unique vendors for filter dropdown
     */
    getUniqueVendors() {
        return [...new Set(this.vendorCosts.map(c => c.vendor))].sort();
    }

    /**
     * Get unique roles for filter dropdown
     */
    getUniqueRoles() {
        return [...new Set(this.vendorCosts.map(c => c.role))].sort();
    }

    /**
     * Attach event listeners to table elements
     */
    attachTableEventListeners() {
        // Remove existing event listeners first to prevent duplicates
        this.removeTableEventListeners();

        // Role group filter chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', this.boundHandlers.filterChipClick);
        });
        
        // Filter listeners
        const vendorFilter = document.getElementById('vendor-filter');
        const roleFilter = document.getElementById('role-filter');
        const shareBtn = document.getElementById('share-calculations-btn');

        if (vendorFilter) {
            vendorFilter.addEventListener('change', this.boundHandlers.vendorFilterChange);
        }

        if (roleFilter) {
            roleFilter.addEventListener('change', this.boundHandlers.roleFilterChange);
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', this.boundHandlers.shareClick);
        }

        // Use event delegation for table elements to avoid reattaching listeners
        const tableContainer = document.querySelector('.calculations-table-section');
        if (tableContainer) {
            // Remove existing delegated listeners first
            tableContainer.removeEventListener('blur', this.boundHandlers.tableBlur, true);
            tableContainer.removeEventListener('click', this.boundHandlers.tableClick);
            
            // Add new delegated listeners - use blur with capture for input changes
            tableContainer.addEventListener('blur', this.boundHandlers.tableBlur, true);
            tableContainer.addEventListener('click', this.boundHandlers.tableClick);
            
            console.log('Event delegation set up for table container with blur events');
        }
    }

    /**
     * Remove table event listeners to prevent memory leaks
     */
    removeTableEventListeners() {
        // Remove filter chip listeners
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.removeEventListener('click', this.boundHandlers.filterChipClick);
        });

        // Remove filter listeners
        const vendorFilter = document.getElementById('vendor-filter');
        const roleFilter = document.getElementById('role-filter');

        if (vendorFilter) {
            vendorFilter.removeEventListener('change', this.boundHandlers.vendorFilterChange);
        }

        if (roleFilter) {
            roleFilter.removeEventListener('change', this.boundHandlers.roleFilterChange);
        }

        // Remove delegated listeners from table container
        const tableContainer = document.querySelector('.calculations-table-section');
        if (tableContainer) {
            tableContainer.removeEventListener('blur', this.boundHandlers.tableBlur, true);
            tableContainer.removeEventListener('click', this.boundHandlers.tableClick);
        }
    }

    /**
     * Handle filter chip clicks
     */
    handleFilterChipClick(e) {
        const filterGroup = e.currentTarget.dataset.filterGroup;
        if (filterGroup === this.currentFilters.roleGroup) return;

        // Update filter state
        this.currentFilters.roleGroup = filterGroup;
        
        // Update UI - remove active from all chips, add to clicked one
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        this.updateTable();
    }

    /**
     * Handle vendor filter changes
     */
    handleVendorFilterChange(e) {
        this.currentFilters.vendor = e.target.value;
        this.updateTable();
    }

    /**
     * Handle role filter changes
     */
    handleRoleFilterChange(e) {
        this.currentFilters.role = e.target.value;
        this.updateTable();
    }

    /**
     * Handle table blur events (delegated) - triggers when user finishes editing and loses focus
     */
    handleTableBlur(e) {
        if (e.target.classList.contains('final-mds-input')) {
            console.log('Final MDs input blurred (user finished editing)');
            this.handleFinalMDsChange(e.target);
        }
    }

    /**
     * Handle table click events (delegated)
     */
    handleTableClick(e) {
        if (e.target.classList.contains('reset-final-mds-btn') || 
            e.target.closest('.reset-final-mds-btn')) {
            
            const button = e.target.classList.contains('reset-final-mds-btn') ? 
                e.target : e.target.closest('.reset-final-mds-btn');
            
            console.log('Reset button clicked via delegation');
            e.preventDefault();
            e.stopPropagation();
            this.handleFinalMDsReset(button);
        }
    }

    /**
     * Handle Final MDs input change
     */
    handleFinalMDsChange(input) {
        const vendorId = input.dataset.vendorId;
        const role = input.dataset.role;
        const department = input.dataset.department;
        const newValue = parseInt(input.value) || 0;

        // Find the vendor cost entry and update finalMDs
        const costEntry = this.vendorCosts.find(c => 
            c.vendorId === vendorId && c.role === role && c.department === department
        );

        if (costEntry) {
            costEntry.finalMDs = newValue;
            
            // Save to project data for persistence
            this.saveFinalMDsToProject(vendorId, role, department, newValue);
            
            // Update the corresponding Final Tot Cost cell
            const row = input.closest('tr');
            const finalCostCell = row.querySelector('.final-cost');
            if (finalCostCell) {
                const finalCost = newValue * costEntry.officialRate;
                finalCostCell.textContent = `€${finalCost.toLocaleString()}`;
            }

            // Update footer totals and KPI cards
            this.updateFooterTotals();
            this.updateKPICards();
        }
    }

    /**
     * Handle Final MDs reset button click
     */
    handleFinalMDsReset(button) {

        // Validate button element
        if (!button || !button.dataset) {
            console.error('Invalid button element:', button);
            return;
        }

        const vendorId = button.dataset.vendorId;
        const role = button.dataset.role;
        const department = button.dataset.department;

        // Validate required data attributes
        if (!vendorId || !role || !department) {
            console.error('Missing data attributes:', { vendorId, role, department });
            return;
        }

        // Find the vendor cost entry
        const costEntry = this.vendorCosts.find(c => 
            c.vendorId === vendorId && c.role === role && c.department === department
        );

        if (!costEntry) {
            console.error(`Cost entry not found for ${vendorId}, ${role}, ${department}`);
            console.log('Available cost entries:', this.vendorCosts.map(c => ({
                vendorId: c.vendorId, 
                role: c.role, 
                department: c.department
            })));
            return;
        }

        // Calculate original value (rounded official MDs)
        const calculatedValue = costEntry.officialRate > 0 ? 
            Math.round(costEntry.cost / costEntry.officialRate) : 0;
        
        // Get the table row and input field
        const row = button.closest('tr');
        if (!row) {
            console.error('Could not find table row for button');
            return;
        }

        const input = row.querySelector('.final-mds-input');
        if (!input) {
            console.error('Could not find input field in row');
            return;
        }

        const currentInputValue = parseInt(input.value) || 0;

        // Always reset to calculated value regardless of current state
        // This ensures the reset works even if there are synchronization issues
        costEntry.finalMDs = calculatedValue;

        // Remove from project overrides since we're resetting to calculated value
        this.removeFinalMDsFromProject(vendorId, role, department);

        // Update the input field with visual feedback
        input.value = calculatedValue;
        input.classList.add('value-updated');
        setTimeout(() => {
            input.classList.remove('value-updated');
        }, 300);

        // Update the Final Tot Cost cell
        const finalCostCell = row.querySelector('.final-cost');
        if (finalCostCell) {
            const finalCost = calculatedValue * costEntry.officialRate;
            finalCostCell.textContent = `€${finalCost.toLocaleString()}`;
            finalCostCell.classList.add('value-updated');
            setTimeout(() => {
                finalCostCell.classList.remove('value-updated');
            }, 300);

        }

        // Update footer totals
        this.updateFooterTotals();
        
        // Update KPI cards with new Final Tot Cost values
        this.updateKPICards();

    }

    /**
     * Update footer totals for Final columns without regenerating the table
     */
    updateFooterTotals() {
        const totalsRow = document.querySelector('.calculations-table .totals-row');
        if (!totalsRow) {
            return;
        }

        const filteredCosts = this.getFilteredVendorCosts();
        
        // Calculate totals using the same logic as KPI cards
        const totalCost = filteredCosts.reduce((sum, c) => sum + c.cost, 0);
        const finalTotalCost = filteredCosts.reduce((sum, c) => sum + ((c.finalMDs || 0) * c.officialRate), 0);
        
        // Update Final Tot MDs total (cell index 3)
        const finalMDsTotal = filteredCosts.reduce((sum, c) => sum + (c.finalMDs || 0), 0);
        const finalMDsCell = totalsRow.cells[3];
        if (finalMDsCell) {
            finalMDsCell.innerHTML = `<strong>${finalMDsTotal}</strong>`;
        }

        // Update Total Cost (cell index 5)
        const totalCostCell = totalsRow.cells[5];
        if (totalCostCell) {
            totalCostCell.innerHTML = `<strong>€${totalCost.toLocaleString()}</strong>`;
        }

        // Update Final Tot Cost with dynamic styling (cell index 6)  
        const finalCostCell = totalsRow.cells[6];
        if (finalCostCell) {
            // Remove existing color classes
            finalCostCell.classList.remove('final-cost-higher', 'final-cost-lower');
            
            // Apply appropriate color class based on comparison
            const colorClass = finalTotalCost > totalCost ? 'final-cost-higher' : 'final-cost-lower';
            finalCostCell.classList.add(colorClass);
            
            finalCostCell.innerHTML = `<strong>€${finalTotalCost.toLocaleString()}</strong>`;
        }
    }

    /**
     * Update KPI cards with new data (live update)
     */
    updateKPICards() {
        // Recalculate KPIs with current Final Tot Cost values
        this.calculateKPIs();
        
        // Update KPI cards in DOM
        const kpiContainer = document.querySelector('.calculations-kpis');
        if (kpiContainer) {
            kpiContainer.innerHTML = this.renderKPICards();
        }
    }

    /**
     * Restore manually set finalMDs values from project data
     */
    restoreFinalMDsFromProject() {
        const currentProject = this.app?.currentProject;
        if (!currentProject || !currentProject.finalMDsOverrides) {
            return;
        }

        // Apply saved finalMDs overrides to vendor costs
        this.vendorCosts.forEach(cost => {
            const key = `${cost.vendorId}_${cost.role}_${cost.department}`;
            if (currentProject.finalMDsOverrides[key] !== undefined) {
                cost.finalMDs = currentProject.finalMDsOverrides[key];

            }
        });
    }

    /**
     * Save manually set finalMDs values to project data
     */
    saveFinalMDsToProject(vendorId, role, department, finalMDs) {
        const currentProject = this.app?.currentProject;
        if (!currentProject) {
            return;
        }

        // Initialize finalMDsOverrides if it doesn't exist
        if (!currentProject.finalMDsOverrides) {
            currentProject.finalMDsOverrides = {};
        }

        const key = `${vendorId}_${role}_${department}`;
        currentProject.finalMDsOverrides[key] = finalMDs;

    }

    /**
     * Remove finalMDs override from project data (when resetting to calculated value)
     */
    removeFinalMDsFromProject(vendorId, role, department) {
        const currentProject = this.app?.currentProject;
        if (!currentProject || !currentProject.finalMDsOverrides) {
            return;
        }

        const key = `${vendorId}_${role}_${department}`;
        delete currentProject.finalMDsOverrides[key];

    }

    /**
     * Update table content with current filters
     */
    updateTable() {
        const tableSection = document.querySelector('.calculations-table-section');
        if (tableSection) {
            console.log('Updating table content...');
            
            const newTableHTML = this.renderCostTable();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newTableHTML;
            
            // Clear existing content
            tableSection.innerHTML = tempDiv.firstElementChild.innerHTML;
            
            // Use requestAnimationFrame instead of setTimeout for better DOM synchronization
            requestAnimationFrame(() => {
                console.log('DOM updated, reattaching event listeners...');
                this.attachTableEventListeners();
                this.updateFilterChipCounts();

            });
        }
    }

    /**
     * Update filter chip counts based on current vendor/role filters
     */
    updateFilterChipCounts() {
        // Get base costs filtered by vendor and individual role only (not role group)
        const baseCosts = this.vendorCosts.filter(cost => {
            if (this.currentFilters.vendor && cost.vendor !== this.currentFilters.vendor) {
                return false;
            }
            if (this.currentFilters.role && cost.role !== this.currentFilters.role) {
                return false;
            }
            return true;
        });

        // Update counts
        const allChip = document.querySelector('.filter-chip[data-filter-group="all"] .count');
        const gtoChip = document.querySelector('.filter-chip[data-filter-group="gto"] .count');
        const gdsChip = document.querySelector('.filter-chip[data-filter-group="gds"] .count');

        if (allChip) allChip.textContent = `(${baseCosts.length})`;
        if (gtoChip) gtoChip.textContent = `(${baseCosts.filter(c => ['G2', 'TA'].includes(c.role)).length})`;
        if (gdsChip) gdsChip.textContent = `(${baseCosts.filter(c => ['PM', 'G1'].includes(c.role)).length})`;
    }

    /**
     * Share project estimation via email
     */
    shareByEmail() {
        const currentProject = this.app?.currentProject;
        if (!currentProject) {
            alert('No project loaded');
            return;
        }

        // Get final total cost from GTO KPI data
        const finalTotalCost = this.kpiData?.gto?.total || 0;
        
        // Get project name
        const projectName = currentProject.project?.name || 'Unknown Project';
        
        // Get project phases with their total MDs
        const projectPhases = currentProject.phases || {};
        let phasesList = '';
        
        // Build phases list using the phase definitions from ProjectPhasesManager
        if (this.app.projectPhasesManager?.phaseDefinitions) {
            this.app.projectPhasesManager.phaseDefinitions.forEach(phaseDef => {
                const phaseData = projectPhases[phaseDef.id];
                if (phaseData && phaseData.manDays > 0) {
                    phasesList += `- ${phaseDef.name}: ${phaseData.manDays.toFixed(1)} MD\n`;
                }
            });
        } else {
            // Fallback: iterate through available phases
            Object.entries(projectPhases).forEach(([phaseId, phaseData]) => {
                if (phaseData && phaseData.manDays > 0) {
                    // Try to get readable phase name or use ID
                    const phaseName = phaseId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    phasesList += `- ${phaseName}: ${phaseData.manDays.toFixed(1)} MD\n`;
                }
            });
        }

        // Calculate total elapsed time from all phases (excluding post go-live support)
        let totalMDs = 0;
        Object.entries(projectPhases).forEach(([phaseId, phaseData]) => {
            if (phaseData && phaseData.manDays > 0 && phaseId !== 'postGoLive') {
                totalMDs += phaseData.manDays;
            }
        });
        
        // Convert MDs to working weeks (5 working days per week)
        const totalWeeks = totalMDs / 5;
        
        // Convert weeks to months (approximately 4 weeks per month)
        const totalMonths = totalWeeks / 4;
        
        // Format the elapsed time
        let elapsedTime;
        if (totalMonths < 1) {
            elapsedTime = `${totalWeeks.toFixed(1)} weeks`;
        } else if (totalMonths < 2) {
            elapsedTime = `${totalMonths.toFixed(1)} month`;
        } else {
            elapsedTime = `${totalMonths.toFixed(1)} months`;
        }

        // Email template
        const emailTemplate = `Dear colleagues,

Please find below the estimation details for the implementation of ${projectName} based on the provided requirements.

The estimated budget for the technical part is ${finalTotalCost.toLocaleString()} € vat incl.

This includes all necessary activities such as technical analysis, development, SIT, support UAT phases, deployment, and post go live support.

Overall Required time is: ${elapsedTime}.

Phase:
${phasesList}

Assumptions and out of scopes:`;

        // Copy email template to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(emailTemplate).then(() => {
                alert(`Email template copied to clipboard!\n\nSubject: Software Estimation - ${projectName}\n\nPaste the content into your email client.`);
            }).catch(() => {
                // Fallback for clipboard API failure
                this.fallbackCopyToClipboard(emailTemplate, projectName);
            });
        } else {
            // Fallback for browsers without clipboard API
            this.fallbackCopyToClipboard(emailTemplate, projectName);
        }
    }

    /**
     * Fallback method to copy text to clipboard
     */
    fallbackCopyToClipboard(text, projectName) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            alert(`Email template copied to clipboard!\n\nSubject: Software Estimation - ${projectName}\n\nPaste the content into your email client.`);
        } catch (err) {
            alert(`Unable to copy to clipboard. Please copy the following text manually:\n\nSubject: Software Estimation - ${projectName}\n\n` + text);
        } finally {
            document.body.removeChild(textArea);
        }
    }

    /**
     * Render no project state
     */
    renderNoProjectState() {
        return `
            <div class="no-project-state">
                <div class="no-project-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <h3>No Project Loaded</h3>
                <p>Load a project to view cost calculations and KPI analysis.</p>
            </div>
        `;
    }

    /**
     * Refresh calculations when project data changes
     */
    refresh() {
        this.render();
    }
}

/**
 * Capacity Planning Manager
 * Handles team resource allocation and capacity planning
 */
/**
 * Capacity Planning Manager
 * Handles team resource allocation and capacity planning
 */
class CapacityManager extends BaseComponent {
    constructor(app, configManager) {
        super('CapacityManager');
        
        this.app = app;
        this.configManager = configManager;
        this.teamManager = null;
        this.workingDaysCalculator = null;
        this.autoDistribution = null;
        this.currentFilters = {
            team: '',
            projects: '',
            timeline: '15',
            status: 'all'
        };

        // Make this instance available globally for modal interactions
        if (typeof window !== 'undefined') {
            window.capacityManager = this;
        }

        // Auto-load capacity data on initialization
        this.autoLoadCapacityData();
    }

    /**
     * Initialize core components for capacity planning
     */
    initializeComponents() {
        // Initialize Team Manager if not exists
        if (!this.teamManager && typeof TeamManager !== 'undefined') {
            this.teamManager = new TeamManager(this.app?.dataManager, this.configManager);
        }

        // Initialize Working Days Calculator if not exists  
        if (!this.workingDaysCalculator && typeof WorkingDaysCalculator !== 'undefined') {
            this.workingDaysCalculator = new WorkingDaysCalculator();
        }

        // Initialize Auto Distribution if not exists
        if (!this.autoDistribution && typeof AutoDistribution !== 'undefined') {
            // Create a simple teamManager adapter for AutoDistribution
            const teamManagerAdapter = {
                getTeamMemberById: (memberId) => {
                    console.log('TeamManager adapter: looking for member ID:', memberId);
                    // For now, return the team member that was passed to the method
                    // This is a simple workaround since we have access to the actual team member object
                    if (this._currentTeamMember && this._currentTeamMember.id === memberId) {
                        console.log('TeamManager adapter: returning current team member');
                        return this._currentTeamMember;
                    }
                    console.log('TeamManager adapter: team member not found');
                    return null;
                }
            };
            
            this.autoDistribution = new AutoDistribution(this.workingDaysCalculator, teamManagerAdapter);
        }

        // Initialize capacity panel event listeners
        this.initializeCapacityPanelEventListeners();

        console.log('Available components:', {
            teamManager: !!this.teamManager,
            workingDaysCalculator: !!this.workingDaysCalculator,
            autoDistribution: !!this.autoDistribution
        });
    }

    /**
     * Render the capacity planning section (legacy method)
     */
    async render() {
        const container = document.getElementById('capacity-content');
        if (!container) {
            console.error('Capacity content container not found');
            return;
        }

        try {
            // Show loading state
            container.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading capacity planning dashboard...</p>
                </div>
            `;

            // Initialize components
            this.initializeComponents();

            // Generate dashboard HTML
            const dashboardHTML = this.generateCapacityDashboard();
            
            container.innerHTML = dashboardHTML;
            
            // Initialize dashboard event listeners
            this.initializeDashboardEventListeners();
            
            // Load and display dashboard data
            await this.loadDashboardData();

        } catch (error) {
            console.error('Error rendering capacity dashboard:', error);
            container.innerHTML = this.renderErrorState(error.message);
        }
    }

    // Generate Capacity Planning Dashboard HTML
    generateCapacityDashboard() {
        return `
            <div class="capacity-dashboard">
                
                <!-- Quick Actions Bar -->
                <div class="dashboard-quick-actions">
                    <button class="btn btn-primary" onclick="window.app?.navigationManager?.navigateToCapacitySubSection('resource-overview')">
                        <i class="fas fa-chart-pie"></i> Resource Overview
                    </button>
                    <button class="btn btn-primary" onclick="window.app?.navigationManager?.navigateToCapacitySubSection('capacity-timeline')">
                        <i class="fas fa-calendar-alt"></i> Timeline Planning
                    </button>
                    <button class="btn btn-secondary" id="refresh-dashboard-btn">
                        <i class="fas fa-sync-alt"></i> Refresh Data
                    </button>
                </div>

                <!-- Statistics Cards Row -->
                <div class="dashboard-stats-grid">
                    <!-- Alerts & Warnings Card -->
                    <div class="dashboard-card alerts-card">
                        <div class="card-header">
                            <h3><i class="fas fa-exclamation-triangle"></i> Alerts & Warnings</h3>
                        </div>
                        <div class="card-content" id="alerts-content">
                            <div class="loading-alerts">
                                <i class="fas fa-spinner fa-spin"></i> Loading alerts...
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Analytics Section -->
                <div class="dashboard-analytics">
                    
                    <!-- Capacity Timeline Overview -->
                    <div class="analytics-card timeline-overview">
                        <div class="card-header">
                            <h3><i class="fas fa-calendar-alt"></i> 15-Month Capacity Overview</h3>
                            <div class="card-actions">
                                <button class="btn btn-small" onclick="window.app?.navigationManager?.navigateToCapacitySubSection('capacity-timeline')">
                                    <i class="fas fa-external-link-alt"></i> View Details
                                </button>
                            </div>
                        </div>
                        <div class="card-content">
                            <div class="timeline-overview-chart" id="timeline-overview-chart">
                                <!-- Timeline overview chart will be generated here -->
                            </div>
                        </div>
                    </div>

                    <!-- Resource Allocation Chart -->
                    <div class="analytics-card resource-allocation-chart">
                        <div class="card-header">
                            <h3><i class="fas fa-chart-pie"></i> Resource Allocation by Project</h3>
                            <div class="card-actions">
                                <select id="allocation-timeframe" class="filter-select">
                                    <option value="current-month">Current Month</option>
                                    <option value="next-month">Next Month</option>
                                    <option value="current-quarter">Current Quarter</option>
                                </select>
                            </div>
                        </div>
                        <div class="card-content">
                            <div class="allocation-chart-container allocation-chart-scrollable" id="allocation-chart">
                                <!-- Chart will be generated here -->
                            </div>
                        </div>
                    </div>

                </div>
                        <div class="card-content">
                            <div class="timeline-overview-chart" id="timeline-overview-chart">
                                <!-- Timeline overview chart will be generated here -->
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Team Performance Section -->
                <div class="dashboard-team-performance">
                    <div class="card-header">
                        <h3><i class="fas fa-users-cog"></i> Team Performance Summary</h3>
                    </div>
                    <div class="team-performance-grid" id="team-performance-grid">
                        <!-- Team performance cards will be generated here -->
                    </div>
                </div>

            </div>
        `;
    }

    // Initialize Dashboard Event Listeners
    initializeDashboardEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => await this.loadDashboardData());
        }

        // Allocation timeframe filter
        const allocationTimeframe = document.getElementById('allocation-timeframe');
        if (allocationTimeframe) {
            allocationTimeframe.addEventListener('change', () => this.updateAllocationChart());
        }
    }

    // Load Dashboard Data
    async loadDashboardData() {
        // Try to load saved capacity data first
        const savedData = await this.loadCapacityData();
        if (savedData) {

        }
        
        // Load team overview data

        // Load capacity utilization data
        await this.loadCapacityUtilizationData();

        // Load alerts and warnings
        await this.loadAlertsData();
        
        // Load analytics charts
        this.loadAllocationChart();
        await this.loadTimelineOverviewChart();
        
        // Load team performance data
        this.loadTeamPerformanceData();
    }

    // Load Capacity Utilization Data
    async loadCapacityUtilizationData() {
        // Calculate real capacity utilization data
        const currentDate = new Date();
        const currentMonth = currentDate.toISOString().slice(0, 7);
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
            .toISOString().slice(0, 7);
        
        try {
            const teamMembers = await this.getRealTeamMembers();
            
            // Calculate current month utilization
            const currentUtil = this.calculateMonthUtilization(teamMembers, currentMonth);
            
            // Calculate next month utilization
            const nextUtil = this.calculateMonthUtilization(teamMembers, nextMonth);
            
            // Calculate average utilization (last 3 months)
            const avgUtil = this.calculateAverageUtilization(teamMembers);
            
            this.updateUtilizationDisplay('current-month-util', currentUtil);
            this.updateUtilizationDisplay('next-month-util', nextUtil);
            this.updateUtilizationDisplay('avg-utilization', avgUtil);
        } catch (error) {
            console.error('Error loading capacity utilization data:', error);
            // Show 0% instead of mock data
            this.updateUtilizationDisplay('current-month-util', 0);
            this.updateUtilizationDisplay('next-month-util', 0);
            this.updateUtilizationDisplay('avg-utilization', 0);
        }
    }

    // Update Utilization Display with Color Coding
    updateUtilizationDisplay(elementId, percentage) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = percentage + '%';
            
            // Apply color coding based on utilization percentage
            element.className = 'stat-value capacity-percentage';
            if (percentage >= 90) {
                element.classList.add('over-capacity');
            } else if (percentage >= 80) {
                element.classList.add('high-capacity');
            } else if (percentage >= 60) {
                element.classList.add('normal-capacity');
            } else {
                element.classList.add('low-capacity');
            }
        }
    }

    /**
     * Calculate month utilization percentage for team members
     */
    calculateMonthUtilization(teamMembers, monthKey) {
        if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
            return 0;
        }
        
        let totalCapacity = 0;
        let totalAllocated = 0;
        
        teamMembers.forEach(member => {
            // Get member capacity for the month
            const memberCapacity = member.monthlyCapacity || 22; // Default working days
            totalCapacity += memberCapacity;
            
            // Get member allocations for this month
            if (member.allocations && member.allocations[monthKey]) {
                const monthAllocations = member.allocations[monthKey];
                const memberAllocated = Object.values(monthAllocations).reduce((sum, project) => {
                    return sum + (project.days || 0);
                }, 0);
                totalAllocated += memberAllocated;
            }
        });
        
        return totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;
    }

    /**
     * Calculate average utilization over last 3 months
     */
    calculateAverageUtilization(teamMembers) {
        if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
            return 0;
        }
        
        const currentDate = new Date();
        const utilizations = [];
        
        // Calculate utilization for last 3 months
        for (let i = 0; i < 3; i++) {
            const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = month.toISOString().slice(0, 7);
            const monthUtil = this.calculateMonthUtilization(teamMembers, monthKey);
            utilizations.push(monthUtil);
        }
        
        return utilizations.length > 0 ? 
            Math.round(utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length) : 0;
    }

    // Load Project Allocation Data

    // Load Alerts Data
    async loadAlertsData() {
        const alertsContainer = document.getElementById('alerts-content');
        
        // Generate real alerts based on capacity data
        const alerts = await this.generateRealAlerts();

        if (alerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-check-circle"></i>
                    <span>No alerts at this time</span>
                </div>
            `;
        } else {
            alertsContainer.innerHTML = alerts.map(alert => `
                <div class="alert-item alert-${alert.severity}">
                    <i class="fas fa-${this.getAlertIcon(alert.type)}"></i>
                    <span class="alert-message">${alert.message}</span>
                </div>
            `).join('');
        }
    }

    /**
     * Generate real alerts based on system data
     */
    async generateRealAlerts() {
        const alerts = [];
        
        try {
            const teamMembers = await this.getRealTeamMembers();
            const currentDate = new Date();
            
            // Ensure teamMembers is an array
            if (!Array.isArray(teamMembers)) {
                console.warn('getRealTeamMembers returned non-array:', typeof teamMembers);
                return alerts;
            }
            
            teamMembers.forEach(member => {
                // Check for over-allocation
                const overallocationAlert = this.checkMemberOverallocation(member, currentDate);
                if (overallocationAlert) {
                    alerts.push(overallocationAlert);
                }
                
                // Check for assignment overflows
                const overflowAlerts = this.checkMemberAssignmentOverflows(member);
                alerts.push(...overflowAlerts);
            });

            // Check for projects without assignments
            const projects = await this.getAvailableProjects();
            
            // Ensure projects is an array
            if (!Array.isArray(projects)) {
                console.warn('getAvailableProjects returned non-array:', typeof projects);
            } else {
                const unassignedProjects = projects.filter(project => {
                return !this.hasProjectAssignments(project.id);
                });

                if (unassignedProjects.length > 0) {
                    alerts.push({
                        type: 'warning',
                        message: `${unassignedProjects.length} project(s) have no team member assignments`,
                        severity: 'medium'
                    });
                }
            }

        } catch (error) {
            console.error('Error generating alerts:', error);
        }
        
        return alerts;
    }
    
    /**
     * Check for assignment overflow alerts for a team member
     */
    checkMemberAssignmentOverflows(member) {
        const alerts = [];
        
        if (!this.manualAssignments || this.manualAssignments.length === 0) {
            return alerts;
        }
        
        // Find assignments for this member
        const memberAssignments = this.manualAssignments.filter(assignment => 
            assignment.teamMemberId === member.id
        );
        
        if (memberAssignments.length === 0) {
            return alerts;
        }
        
        // Check each assignment for overflows
        const overflowProjects = [];
        
        memberAssignments.forEach(assignment => {
            if (assignment.phaseSchedule) {
                const overflowPhases = assignment.phaseSchedule.filter(phase => phase.overflow > 0);
                
                if (overflowPhases.length > 0) {
                    // Get project name
                    const projectName = this.getProjectNameById(assignment.projectId) || 'Unknown Project';
                    
                    overflowPhases.forEach(phase => {
                        overflowProjects.push({
                            projectName,
                            phaseName: phase.phaseName,
                            overflow: phase.overflow
                        });
                    });
                }
            }
        });
        
        if (overflowProjects.length > 0) {
            // Group overflows by member as requested
            const overflowSummary = overflowProjects.map(overflow => 
                `${overflow.projectName}: ${overflow.phaseName} +${overflow.overflow.toFixed(1)} MDs`
            ).join(', ');
            
            alerts.push({
                type: 'overflow',
                severity: 'warning',
                message: `${member.firstName} ${member.lastName} (${this.getMemberRole(member)} - ${this.getVendorName(member)}): ${overflowSummary}`
            });
        }
        
        return alerts;
    }

    /**
     * Check if member is over-allocated
     */
    checkMemberOverallocation(member, currentDate) {
        // Implementation would check if member's total allocation exceeds capacity
        // For now, return null since we don't have allocation data structure yet
        return null;
    }

    /**
     * Check if project has any assignments
     */
    hasProjectAssignments(projectId) {
        // Implementation would check if project has team member assignments
        // For now, return true since we don't have assignments data structure yet
        return true;
    }

    // Get Alert Icon
    getAlertIcon(type) {
        switch(type) {
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            case 'overallocation': return 'exclamation-triangle';
            case 'unassigned': return 'user-clock';
            case 'deadline': return 'calendar-times';
            case 'overflow': return 'tachometer-alt';
            default: return 'bell';
        }
    }

    // Load Allocation Chart
    async loadAllocationChart() {
        const chartContainer = document.getElementById('allocation-chart');
        
        // Get real team members and calculate project allocations
        const teamMembers = await this.getRealTeamMembers();
        const currentMonth = '2025-08'; // Could be dynamic based on the filter
        
        // Process allocations by project and resource
        const projectAllocations = {};
        
        teamMembers.forEach(member => {
            const monthAllocations = member.allocations[currentMonth];
            if (!monthAllocations) return;
            
            Object.keys(monthAllocations).forEach(projectName => {
                // Skip non-project items like FERIE, ALLINEAMENTO, etc.
                if (['FERIE', 'ALLINEAMENTO', 'Training'].includes(projectName)) {
                    return;
                }
                
                if (!projectAllocations[projectName]) {
                    projectAllocations[projectName] = [];
                }
                
                const allocation = monthAllocations[projectName];
                projectAllocations[projectName].push({
                    resource: `${member.firstName} ${member.lastName}`,
                    role: member.role,
                    vendor: member.vendor,
                    days: allocation.days,
                    status: allocation.status,
                    hasOverflow: allocation.hasOverflow || false,
                    phases: allocation.phases || []
                });
            });
        });

        // Sort projects by total MDs (descending)
        const sortedProjects = Object.entries(projectAllocations).sort((a, b) => {
            const totalA = a[1].reduce((sum, resource) => sum + resource.days, 0);
            const totalB = b[1].reduce((sum, resource) => sum + resource.days, 0);
            return totalB - totalA;
        });

        // Generate HTML table with rowspan for project column
        let tableRows = '';
        
        sortedProjects.forEach(([projectName, resources]) => {
            const totalDays = resources.reduce((sum, resource) => sum + resource.days, 0);
            const approvedCount = resources.filter(r => r.status === 'approved').length;
            const pendingCount = resources.length - approvedCount;
            const resourceCount = resources.length;
            const hasAnyOverflow = resources.some(r => r.hasOverflow);
            
            resources.forEach((resource, index) => {
                const isFirstRow = index === 0;
                
                tableRows += `
                    <tr class="allocation-chart-row ${isFirstRow ? 'project-first-row' : ''} ${resource.hasOverflow ? 'overflow-row' : ''}">
                        ${isFirstRow ? `
                            <td class="allocation-cell-project" rowspan="${resourceCount}">
                                <div class="allocation-project-info">
                                    <span class="allocation-project-name">${projectName}</span>
                                    <div class="allocation-project-summary">
                                        <span class="allocation-project-total ${hasAnyOverflow ? 'overflow' : ''}">${totalDays} MDs</span>
                                        <span class="allocation-project-resources">${resources.length} resources</span>
                                        <div class="allocation-project-status">
                                            ${approvedCount > 0 ? `<span class="approved-count">${approvedCount} ✓</span>` : ''}
                                            ${pendingCount > 0 ? `<span class="pending-count">${pendingCount} ⏳</span>` : ''}
                                            ${hasAnyOverflow ? `<span class="overflow-indicator">⚠️ Overflow</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </td>
                        ` : ''}
                        <td class="allocation-cell-resource">${resource.resource}</td>
                        <td class="allocation-cell-role">${resource.role}</td>
                        <td class="allocation-cell-vendor">${resource.vendor}</td>
                        <td class="allocation-cell-days">
                            <span class="allocation-days-value ${resource.status} ${resource.hasOverflow ? 'overflow' : ''}">${resource.days}</span>
                            ${resource.phases && resource.phases.length > 0 ? 
                                `<div class="allocation-phases">${resource.phases.map(p => p.phaseName).join(', ')}</div>` : 
                                ''
                            }
                        </td>
                        <td class="allocation-cell-status">
                            <span class="allocation-status-badge ${resource.status}">
                                ${resource.status === 'approved' ? '✓' : '✗'}
                            </span>
                            ${resource.hasOverflow ? '<span class="overflow-badge">⚠️</span>' : ''}
                        </td>
                    </tr>
                `;
            });
        });

        const chartHTML = `
            <table class="allocation-chart-table">
                <thead>
                    <tr>
                        <th class="allocation-header-project">Project</th>
                        <th class="allocation-header-resource">Resource</th>
                        <th class="allocation-header-role">Role</th>
                        <th class="allocation-header-vendor">Vendor</th>
                        <th class="allocation-header-days">Days</th>
                        <th class="allocation-header-status">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;

        chartContainer.innerHTML = chartHTML || '<div class="no-data">No project allocations found for the selected period</div>';
    }

    // Load Timeline Overview Chart
    async loadTimelineOverviewChart() {
        const chartContainer = document.getElementById('timeline-overview-chart');
        if (!chartContainer) return;
        
        // Generate real utilization data based on team member allocations
        const months = await this.calculateRealUtilizationData();

        const chartHTML = `
            <div class="timeline-chart">
                ${months.map(data => `
                    <div class="timeline-month">
                        <div class="month-bar">
                            <div class="month-fill ${this.getUtilizationClass(data.utilization)}" 
                                 style="height: ${data.utilization}%;"
                                 title="${data.month}: ${data.utilization}% utilization">
                            </div>
                        </div>
                        <div class="month-label">${data.month}</div>
                        <div class="month-percentage">${data.utilization}%</div>
                    </div>
                `).join('')}
            </div>
        `;

        chartContainer.innerHTML = chartHTML;
    }

    /**
     * Calculate real utilization data for chart
     */
    async calculateRealUtilizationData() {
        const months = [];
        const currentYear = new Date().getFullYear();
        
        try {
            const teamMembers = await this.getRealTeamMembers();
            
            // Ensure teamMembers is an array
            if (!Array.isArray(teamMembers)) {
                console.warn('getRealTeamMembers returned non-array:', typeof teamMembers);
                return months;
            }
            
            for (let i = 0; i < 15; i++) {
                const month = new Date(currentYear, i, 1);
                const monthStr = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                const monthKey = month.toISOString().slice(0, 7);
                
                // Calculate actual utilization based on team member allocations
                let totalCapacity = 0;
                let totalAllocated = 0;
                
                teamMembers.forEach(member => {
                    const workingDays = this.calculateWorkingDaysInMonth(month.getFullYear(), month.getMonth());
                    totalCapacity += member.monthlyCapacity || workingDays;
                    
                    // Get member allocations for this month
                    if (member.allocations && member.allocations[monthKey]) {
                        const monthAllocations = member.allocations[monthKey];
                        const memberAllocated = Object.values(monthAllocations).reduce((sum, project) => {
                            return sum + (project.days || 0);
                        }, 0);
                        totalAllocated += memberAllocated;
                    }
                });
                
                const utilization = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;
                months.push({ month: monthStr, utilization });
            }
        } catch (error) {
            console.error('Error calculating utilization data:', error);
            // Return empty data instead of mock data
            for (let i = 0; i < 15; i++) {
                const month = new Date(currentYear, i, 1);
                const monthStr = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                months.push({ month: monthStr, utilization: 0 });
            }
        }
        
        return months;
    }

    // Initialize allocation chart toggle functionality
    initializeAllocationChartToggle() {
        // Create global reference for onclick handlers
        if (!window.allocationChart) {
            window.allocationChart = {
                toggleProject: (projectId) => {
                    const projectResources = document.getElementById(projectId);
                    const expandIcon = document.getElementById(`${projectId}-icon`);
                    
                    if (!projectResources || !expandIcon) return;
                    
                    const isCollapsed = projectResources.classList.contains('collapsed');
                    
                    if (isCollapsed) {
                        // Expand
                        projectResources.classList.remove('collapsed');
                        projectResources.classList.add('expanded');
                        expandIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    } else {
                        // Collapse  
                        projectResources.classList.remove('expanded');
                        projectResources.classList.add('collapsed');
                        expandIcon.innerHTML = '<i class="fas fa-chevron-right"></i>';
                    }
                }
            };
        }
    }

    // Get Utilization Class
    getUtilizationClass(percentage) {
        if (percentage >= 90) return 'over-capacity';
        if (percentage >= 80) return 'high-capacity';
        if (percentage >= 60) return 'normal-capacity';
        return 'low-capacity';
    }

    // Load Team Performance Data
    async loadTeamPerformanceData() {
        const container = document.getElementById('team-performance-grid');
        const teamMembers = await this.getRealTeamMembers();
        
        const performanceHTML = teamMembers.slice(0, 4).map(member => `
            <div class="team-performance-card">
                <div class="performance-header">
                    <div class="member-info">
                        <span class="member-name">${member.firstName} ${member.lastName}</span>
                        <span class="member-role">${member.role} - ${member.vendor}</span>
                    </div>
                    <div class="performance-score ${this.getPerformanceScoreClass(member.currentUtilization)}">
                        ${member.currentUtilization}%
                    </div>
                </div>
                <div class="performance-details">
                    <div class="performance-item">
                        <span class="performance-label">Current Projects</span>
                        <span class="performance-value">${Object.keys(member.allocations?.['2025-12'] || {}).length || 0}</span>
                    </div>
                    <div class="performance-item">
                        <span class="performance-label">Max Capacity</span>
                        <span class="performance-value">${member.maxCapacity} MD/month</span>
                    </div>
                    <div class="performance-item">
                        <span class="performance-label">Available Days</span>
                        <span class="performance-value">${member._debugInfo?.availableDays || 0} MDs</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = performanceHTML;
    }

    // Get Performance Score Class
    getPerformanceScoreClass(utilization) {
        if (utilization >= 95) return 'score-critical';
        if (utilization >= 85) return 'score-high';
        if (utilization >= 70) return 'score-good';
        return 'score-low';
    }

    // Update Allocation Chart (when timeframe changes)
    updateAllocationChart() {
        // For now, just reload the chart
        // In a real implementation, this would fetch different data based on timeframe
        this.loadAllocationChart();
    }

    /**
     * Render the Resource Capacity Overview section
     */
    async renderResourceOverview() {
        const container = document.getElementById('resource-overview-content');
        if (!container) {
            console.error('Resource overview content container not found');
            return;
        }

        try {
            // Show loading state
            container.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading resource capacity overview...</p>
                </div>
            `;

            // Initialize components
            this.initializeComponents();

            // Generate only the overview section
            const overviewHTML = this.generateResourceOverviewHTML();
            container.innerHTML = overviewHTML;
            
            // Initialize overview-specific event listeners
            this.initializeOverviewEventListeners();
            
            // Load overview data
            await this.loadOverviewData();

        } catch (error) {
            console.error('Error rendering resource overview:', error);
            container.innerHTML = this.renderErrorState(error.message);
        }
    }

    /**
     * Render the Capacity Planning Timeline section
     */
    async renderCapacityTimeline() {
        const container = document.getElementById('capacity-timeline-content');
        if (!container) {
            console.error('Capacity timeline content container not found');
            return;
        }

        try {
            // Show loading state
            container.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading capacity planning timeline...</p>
                </div>
            `;

            // Initialize components
            this.initializeComponents();

            // Generate only the timeline section
            const timelineHTML = this.generateCapacityTimelineHTML();
            container.innerHTML = timelineHTML;
            
            // Initialize timeline-specific event listeners
            this.initializeTimelineEventListeners();
            
            // Load timeline data
            this.loadTimelineData();

        } catch (error) {
            console.error('Error rendering capacity timeline:', error);
            container.innerHTML = this.renderErrorState(error.message);
        }
    }

    /**
     * Generate HTML for Resource Capacity Overview section
     */
    generateResourceOverviewHTML() {
        return `
            <div class="resource-overview-section">
                <div class="capacity-table-container">

            <!-- Overview Filters -->
            <div class="capacity-filters">
                <div class="filter-group">
                    <label for="overview-member-filter">Member:</label>
                    <select id="overview-member-filter" class="filter-select">
                        <option value="">All Members</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="overview-status-filter">Status View:</label>
                    <select id="overview-status-filter" class="filter-select">
                        <option value="all">All Status (Forecast)</option>
                        <option value="approved">Approved Only</option>
                        <option value="pending">Pending Only</option>
                    </select>
                </div>
            </div>
            
            <div class="scrollable-table-wrapper" id="capacity-overview-grid">
                <!-- Dynamic capacity overview will be generated here -->
            </div>
        </div>
            </div>
        `;
    }

    /**
     * Generate HTML for Capacity Planning Timeline section
     */
    generateCapacityTimelineHTML() {
        return `
            <div class="capacity-timeline-section">
                <!-- Table Filters -->
                <div class="capacity-filters">
                    <div class="filter-group">
                        <label for="team-filter">Team member:</label>
                        <select id="team-filter" class="filter-select">
                            <option value="">All Teams</option>
                            <option value="vendor-a">Vendor A</option>
                            <option value="internal">Internal Resources</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="projects-filter">Projects:</label>
                        <select id="projects-filter" class="filter-select">
                            <option value="">All Projects</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="vendor-filter">Vendor:</label>
                        <select id="vendor-filter" class="filter-select">
                            <option value="">All Vendors</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="status-filter">Status:</label>
                        <select id="status-filter" class="filter-select">
                            <option value="all">All Statuses</option>
                            <option value="approved">Approved</option>
                            <option value="pending">Pending</option>
                            <option value="draft">Draft</option>
                        </select>
                    </div>
                </div>

                <!-- Two-Panel Layout -->
                <div class="two-panel-layout">
                    <!-- Panel 1: Project Phases Gantt -->
                    <div class="gantt-panel collapsed">
                        <div class="panel-title">
                            <i class="fas fa-project-diagram"></i>
                            <span>Project Phases Timeline</span>
                            <button class="panel-collapse-btn" id="toggle-gantt-panel">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </div>
                        <div class="scrollable-table-wrapper gantt-wrapper" id="gantt-scroll-wrapper">
                            <table id="gantt-table" class="gantt-phases-table">
                                <thead>
                                    <tr>
                                        <!-- Fixed columns -->
                                        <th class="fixed-col col-project-name">Project</th>
                                        <th class="fixed-col col-phases">Phases</th>
                                        <th class="fixed-col col-total-mds">Total MDs</th>
                                        <!-- Scrollable month columns -->
                                        ${this.generateMonthHeaders()}
                                    </tr>
                                </thead>
                                <tbody id="gantt-table-body">
                                    <!-- Gantt rows will be populated here -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Panel 2: Team Member Allocations -->
                    <div class="allocations-panel">
                        <div class="panel-title">
                            <i class="fas fa-users"></i>
                            <span>Team Member Allocations</span>
                        </div>
                        <div class="scrollable-table-wrapper allocations-wrapper" id="allocations-scroll-wrapper">
                            <table id="allocations-table" class="team-allocations-table">
                                <thead>
                                    <tr>
                                        <!-- Fixed columns -->
                                        <th class="fixed-col col-member">Team Member</th>
                                        <th class="fixed-col col-actions">Actions</th>
                                        <!-- Scrollable month columns -->
                                        ${this.generateMonthHeaders()}
                                    </tr>
                                </thead>
                                <tbody id="allocations-table-body">
                                    <!-- Allocation rows will be populated here -->
                                    <tr class="no-data-row">
                                        <td colspan="20" class="no-data-message">
                                            <div class="no-data-content">
                                                <i class="fas fa-table" style="color: #6c757d; font-size: 2.5em; margin-bottom: 1rem;"></i>
                                                <p style="color: #6c757d; font-size: 1.1em; margin: 0; font-weight: 500;">No capacity assignments configured yet</p>
                                                <p style="color: #868e96; font-size: 0.9em; margin: 0.5rem 0 0 0;">Use "Add Assignment" to create your first assignment</p>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize event listeners for Resource Overview section
     */
    initializeOverviewEventListeners() {
        // Overview filter listeners
        const overviewMemberFilter = document.getElementById('overview-member-filter');
        const overviewStatusFilter = document.getElementById('overview-status-filter');

        if (overviewMemberFilter) {
            overviewMemberFilter.addEventListener('change', async (e) => {

                await this.updateCapacityOverview();
            });
        }

        if (overviewStatusFilter) {
            overviewStatusFilter.addEventListener('change', async (e) => {

                await this.updateCapacityOverview();
            });
        }

        // Action buttons
        const refreshBtn = document.getElementById('refresh-capacity-btn');
        const exportBtn = document.getElementById('export-capacity-btn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCapacityData());
        }

    }

    /**
     * Initialize event listeners for Timeline section
     */
    initializeTimelineEventListeners() {
        // Filter event listeners
        const teamFilter = document.getElementById('team-filter');
        const projectsFilter = document.getElementById('projects-filter');
        const vendorFilter = document.getElementById('vendor-filter');
        const statusFilter = document.getElementById('status-filter');

        if (teamFilter) {
            teamFilter.addEventListener('change', (e) => {
                this.currentFilters.team = e.target.value;
                this.applyFilters();
            });
        }

        if (projectsFilter) {
            projectsFilter.addEventListener('change', (e) => {
                this.currentFilters.projects = e.target.value;
                this.applyFilters();
            });
        }

        if (vendorFilter) {
            vendorFilter.addEventListener('change', (e) => {
                this.currentFilters.vendor = e.target.value;
                this.applyFilters();
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Action button listeners
        const addAssignmentBtn = document.getElementById('add-assignment-btn');
        const addTimelineAssignmentBtn = document.getElementById('add-timeline-assignment-btn');
        const exportTableBtn = document.getElementById('export-table-btn');
        const refreshTimelineBtn = document.getElementById('refresh-timeline-btn');
        const createFirstRowBtn = document.getElementById('create-first-row-btn');

        if (addAssignmentBtn) {
            addAssignmentBtn.addEventListener('click', () => this.showAddAssignmentModal());
        }

        if (addTimelineAssignmentBtn) {
            addTimelineAssignmentBtn.addEventListener('click', () => this.showAddAssignmentModal());
        }

        if (exportTableBtn) {
            exportTableBtn.addEventListener('click', () => this.exportCapacityTable());
        }

        if (refreshTimelineBtn) {
            refreshTimelineBtn.addEventListener('click', () => this.refresh());
        }

        if (createFirstRowBtn) {
            createFirstRowBtn.addEventListener('click', () => this.showAddAssignmentModal());
        }

    }

    /**
     * Load overview-specific data
     */
    async loadOverviewData() {
        // Populate overview filters
        this.populateOverviewFilters();
        
        // Generate capacity overview
        await this.generateCapacityOverview();
        
        console.log('Overview data loaded');
    }

    /**
     * Load timeline-specific data
     */
    loadTimelineData() {
        // Load project options for filters
        this.loadProjectOptions();
        
        // Load team member options for filters
        this.loadTeamMemberOptions();
        
        // Load vendor options for filters
        this.loadVendorOptions();
        
        // Load capacity table
        this.loadCapacityTable();
        
        console.log('Timeline data loaded');
    }

    /**
     * Load capacity section HTML content
     */
    async loadCapacitySectionHTML() {
        try {
            const response = await fetch('capacity-section.html');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            return html;
        } catch (error) {
            console.error('Error loading capacity section HTML:', error);
            console.log('HTML loading failed, returning error message');
            
            // Return error message instead of mock HTML
            return '<div class="error-message"><p>Unable to load capacity section. Please check your configuration.</p></div>';
        }
    }

    /**
     * Removed embedded capacity HTML fallback as per user request to eliminate mock data
     */

    /**
     * Generate month headers for capacity timeline table
     */
    generateMonthHeaders() {
        const currentYear = 2025;
        const nextYear = 2026;
        const monthNames = [
            'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
            'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
        ];
        
        let headers = '';
        
        // Current year months (all 12)
        for (let month = 1; month <= 12; month++) {
            const monthKey = `${currentYear}-${month.toString().padStart(2, '0')}`;
            const monthName = monthNames[month - 1];
            headers += `<th class="month-col" data-month="${monthKey}">${monthName}<br>${currentYear}</th>`;
        }
        
        // Next year first 3 months
        for (let month = 1; month <= 3; month++) {
            const monthKey = `${nextYear}-${month.toString().padStart(2, '0')}`;
            const monthName = monthNames[month - 1];
            headers += `<th class="month-col" data-month="${monthKey}">${monthName}<br>${nextYear}</th>`;
        }
        
        return headers;
    }

    /**
     * Removed mock data method as per user request to show only real data without fallbacks
     */

    /**
     * REAL TEAM INTEGRATION SYSTEM
     * Replaces mock data with real Teams configuration and project calculations
     */

    /**
     * Calculate working days in a month excluding weekends and holidays
     */
    calculateWorkingDaysInMonth(year, month, country = 'IT') {
        const holidays = this.getHolidays(year, country);
        const daysInMonth = new Date(year, month, 0).getDate();
        let workingDays = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            const dateString = date.toISOString().split('T')[0];
            
            // Skip weekends (0=Sunday, 6=Saturday)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                // Skip holidays
                if (!holidays.includes(dateString)) {
                    workingDays++;
                }
            }
        }
        
        return workingDays;
    }

    /**
     * Get holiday dates for a specific year and country
     */
    getHolidays(year, country = 'IT') {
        const holidays = {
            'IT': {
                2024: [
                    '2024-01-01', '2024-01-06', '2024-04-01', '2024-04-25',
                    '2024-05-01', '2024-06-02', '2024-08-15', '2024-11-01',
                    '2024-12-08', '2024-12-25', '2024-12-26'
                ],
                2025: [
                    '2025-01-01', '2025-01-06', '2025-04-21', '2025-04-25',
                    '2025-05-01', '2025-06-02', '2025-08-15', '2025-11-01',
                    '2025-12-08', '2025-12-25', '2025-12-26'
                ]
            }
        };
        
        return holidays[country]?.[year] || [];
    }

    /**
     * Calculate working days between two dates
     */
    calculateWorkingDaysBetween(startDate, endDate, country = 'IT') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const holidays = this.getHolidays(start.getFullYear(), country);
        let workingDays = 0;
        
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            const dateString = current.toISOString().split('T')[0];
            
            // Skip weekends and holidays
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateString)) {
                workingDays++;
            }
            
            current.setDate(current.getDate() + 1);
        }
        
        return workingDays;
    }

    /**
     * Add working days to a date (excluding weekends and holidays)
     */
    addWorkingDays(startDate, daysToAdd, country = 'IT') {
        const holidays = this.getHolidays(startDate.getFullYear(), country);
        const result = new Date(startDate);
        let addedDays = 0;
        
        while (addedDays < daysToAdd) {
            result.setDate(result.getDate() + 1);
            const dayOfWeek = result.getDay();
            const dateString = result.toISOString().split('T')[0];
            
            // Count only working days
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateString)) {
                addedDays++;
            }
        }
        
        return result;
    }

    /**
     * Get months between two dates in YYYY-MM format
     */
    getMonthsInDateRange(startDate, endDate) {
        const months = [];
        const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        
        while (current <= end) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            months.push(`${year}-${month}`);
            current.setMonth(current.getMonth() + 1);
        }
        
        return months;
    }

    /**
     * Get working days in a month that belong to a specific phase
     */
    getWorkingDaysInMonthForPhase(monthString, phaseStartDate, phaseEndDate) {
        const [year, month] = monthString.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0); // Last day of month
        
        // Find intersection between month and phase
        const intersectionStart = new Date(Math.max(monthStart, phaseStartDate));
        const intersectionEnd = new Date(Math.min(monthEnd, phaseEndDate));
        
        if (intersectionStart > intersectionEnd) {
            return 0; // No intersection
        }
        
        return this.calculateWorkingDaysBetween(intersectionStart, intersectionEnd);
    }

    /**
     * SEQUENTIAL PHASE ALLOCATION SYSTEM
     */

    /**
     * Calculate sequential timeline for project phases
     */
    calculateProjectPhaseTimeline(project, startDate) {
        if (!project.phases || project.phases.length === 0) {
            return [];
        }

        const phases = [...project.phases].sort((a, b) => (a.order || 0) - (b.order || 0));
        const timeline = [];
        let currentDate = new Date(startDate);
        
        phases.forEach(phase => {
            const phaseTotalMDs = phase.manDays || 0;
            
            if (phaseTotalMDs > 0) {
                const phaseEndDate = this.addWorkingDays(currentDate, phaseTotalMDs);
                
                timeline.push({
                    phaseId: phase.id,
                    phaseName: phase.name,
                    totalMDs: phaseTotalMDs,
                    startDate: new Date(currentDate),
                    endDate: phaseEndDate,
                    effort: phase.effort || {}, // { G1: 100, G2: 0, TA: 20, PM: 50 }
                    months: this.getMonthsInDateRange(currentDate, phaseEndDate)
                });
                
                // Next phase starts the next working day
                currentDate = new Date(phaseEndDate);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });
        
        return timeline;
    }

    /**
     * Get member role from vendor configuration
     */
    getMemberRole(member) {
        console.log(`getMemberRole for member:`, member);

        if (!member.vendorId) {

            return 'G2';
        }
        
        if (!this.app?.managers?.configuration) {

            // Try alternative access paths
            const altConfigManager = this.app?.managers?.config || 
                                   window.app?.managers?.configuration ||
                                   window.configManager;

            if (!altConfigManager) {

                return 'G2';
            }
            
            // Use alternative config manager
            const configManager = altConfigManager;
        } else {
            const configManager = this.app.managers.configuration;
        }
        
        // Get config manager (either from this.app or alternative)
        const configManager = this.app?.managers?.configuration || 
                              this.app?.managers?.config || 
                              window.app?.managers?.configuration ||
                              window.configManager;
        console.log(`Available internal resources:`, configManager.globalConfig?.internalResources?.length || 0);
        console.log(`Available suppliers:`, configManager.globalConfig?.suppliers?.length || 0);
        
        if (member.vendorType === 'internal') {
            const internal = configManager.globalConfig?.internalResources?.find(r => r.id === member.vendorId);
            console.log(`Looking for internal resource with ID ${member.vendorId}:`, internal);
            return internal?.role || 'G2';
        } else {
            const supplier = configManager.globalConfig?.suppliers?.find(s => s.id === member.vendorId);
            console.log(`Looking for supplier with ID ${member.vendorId}:`, supplier);
            return supplier?.role || 'G2';
        }
    }

    /**
     * Resolve vendor name from configuration
     */
    resolveVendorName(member) {
        if (!member.vendorId || !this.app?.managers?.configuration) {
            return member.vendorType === 'internal' ? 'Internal' : 'External';
        }

        const configManager = this.app.managers.configuration;
        
        if (member.vendorType === 'internal') {
            const internal = configManager.globalConfig?.internalResources?.find(r => r.id === member.vendorId);
            return internal?.name || 'Internal';
        } else {
            const supplier = configManager.globalConfig?.suppliers?.find(s => s.id === member.vendorId);
            return supplier?.name || 'External';
        }
    }

    /**
     * Determine role participation in a phase
     */
    getRoleParticipationInPhase(phase, memberRole) {
        const roleEffortPercent = phase.effort?.[memberRole] || 0;
        
        return {
            participates: roleEffortPercent > 0,
            effortPercent: roleEffortPercent,
            roleMDs: Math.round((phase.totalMDs * roleEffortPercent) / 100)
        };
    }

    /**
     * Distribute phase MDs across months with real working days calculation
     */
    distributePhaseAcrossMonths(phaseMDs, phaseStartDate, phaseEndDate, phaseMonths) {
        // Legacy method - we'll use the new algorithm at a higher level
        // This method is kept for compatibility but the real improvement is in calculatePhaseBasedAllocation
        
        // Legacy fallback distribution method
        const distribution = {};
        let remainingMDs = phaseMDs;
        
        // Calculate total working days in the phase
        const totalWorkingDaysInPhase = this.calculateWorkingDaysBetween(phaseStartDate, phaseEndDate);
        
        if (totalWorkingDaysInPhase === 0) {
            return distribution;
        }
        
        phaseMonths.forEach((month, index) => {
            const isLastMonth = index === phaseMonths.length - 1;
            
            // Calculate real working days in month that belong to this phase
            const workingDaysInMonth = this.getWorkingDaysInMonthForPhase(
                month, 
                phaseStartDate, 
                phaseEndDate
            );
            
            if (workingDaysInMonth > 0) {
                // Distribute proportionally to real working days
                const monthMDs = isLastMonth ? 
                    remainingMDs : 
                    Math.round((workingDaysInMonth / totalWorkingDaysInPhase) * phaseMDs);
                
                if (monthMDs > 0) {
                    distribution[month] = {
                        days: monthMDs,
                        workingDaysInMonth: workingDaysInMonth,
                        phaseStartDate: phaseStartDate,
                        phaseEndDate: phaseEndDate
                    };
                    
                    remainingMDs -= monthMDs;
                }
            }
        });
        
        return distribution;
    }

    /**
     * Generate sequential allocations based on project phases
     */
    generateSequentialAllocations(member, memberRole, projects) {

        const allocations = {};
        
        projects.forEach((project, index) => {
            console.log(`Processing project ${index}:`, project);
            console.log(`Project details:`, {
                name: project.name,
                startDate: project.startDate,
                endDate: project.endDate,
                status: project.status,
                phasesCount: project.phases?.length || 0
            });
            
            // Skip projects without required data - more robust check
            if (!project.startDate || !project.status || !project.name) {
                console.warn(`Skipping project ${project.name || 'UNNAMED'} - missing required data:`);
                console.warn('Missing data:', { 
                    name: project.name, 
                    startDate: project.startDate, 
                    status: project.status 
                });
                return;
            }
            
            // Additional check for phases
            if (!project.phases || project.phases.length === 0) {
                console.warn(`Project ${project.name} has no phases - skipping allocation`);
                return;
            }

            const phaseTimeline = this.calculateProjectPhaseTimeline(project, project.startDate);

            phaseTimeline.forEach(phase => {
                const participation = this.getRoleParticipationInPhase(phase, memberRole);

                if (participation.participates && participation.roleMDs > 0) {
                    // Distribute phase MDs across months
                    const phaseDistribution = this.distributePhaseAcrossMonths(
                        participation.roleMDs,
                        phase.startDate,
                        phase.endDate,
                        phase.months
                    );
                    
                    console.log(`Phase ${phase.phaseName} distribution:`, Object.keys(phaseDistribution));
                    
                    Object.entries(phaseDistribution).forEach(([month, dayData]) => {
                        if (!allocations[month]) allocations[month] = {};
                        
                        // Combine allocations if project already exists in the month
                        if (allocations[month][project.name]) {
                            allocations[month][project.name].days += dayData.days;
                            allocations[month][project.name].phases.push({
                                phaseName: phase.phaseName,
                                phaseDays: dayData.days
                            });
                        } else {
                            allocations[month][project.name] = {
                                days: dayData.days,
                                status: project.status,
                                hasOverflow: false,
                                overflowAmount: 0,
                                phases: [{
                                    phaseName: phase.phaseName,
                                    phaseDays: dayData.days
                                }]
                            };
                        }
                    });
                }
            });
        });
        
        console.log(`Final allocations for ${member.id}:`, Object.keys(allocations).length, 'months');
        return allocations;
    }

    /**
     * Calculate current utilization based on real allocations
     */
    calculateCurrentUtilization(allocations, memberRole) {
        const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
        const currentAllocations = allocations[currentMonth] || {};
        
        // Calculate real working days in current month
        const currentDate = new Date();
        const realWorkingDaysInMonth = this.calculateWorkingDaysInMonth(
            currentDate.getFullYear(), 
            currentDate.getMonth() + 1
        );
        
        // Sum all allocated days in current month
        const totalAllocatedDays = Object.values(currentAllocations)
            .reduce((sum, allocation) => sum + allocation.days, 0);
        
        // Calculate utilization percentage based on real working days
        const utilizationPercentage = realWorkingDaysInMonth > 0 ? 
            Math.round((totalAllocatedDays / realWorkingDaysInMonth) * 100) : 0;
        
        return {
            utilizationPercentage,
            allocatedDays: totalAllocatedDays,
            availableDays: realWorkingDaysInMonth - totalAllocatedDays,
            realWorkingDaysInMonth
        };
    }

    /**
     * OVERFLOW MANAGEMENT SYSTEM
     */

    /**
     * Get available capacity for a month considering existing allocations
     */
    getAvailableCapacityForMonth(month, memberMaxCapacity, existingAllocations) {
        const monthAllocations = existingAllocations[month] || {};
        
        // Sum all days already allocated for the month
        const totalAllocatedDays = Object.values(monthAllocations)
            .reduce((sum, allocation) => {
                return sum + (allocation.days || 0);
            }, 0);
        
        // Available capacity = max capacity - already allocated days
        const availableCapacity = memberMaxCapacity - totalAllocatedDays;
        
        return Math.max(0, availableCapacity); // Cannot be negative
    }

    /**
     * Check and flag overflow in allocations
     */
    checkAndFlagOverflow(allocations, memberMaxCapacity) {
        const processedAllocations = {};
        let cumulativeAllocations = {};
        
        // Process allocations month by month to track overflow
        Object.keys(allocations).sort().forEach(month => {
            processedAllocations[month] = {};
            
            const [year, monthNum] = month.split('-').map(Number);
            const realWorkingDaysInMonth = this.calculateWorkingDaysInMonth(year, monthNum);
            
            Object.entries(allocations[month]).forEach(([projectName, allocation]) => {
                const availableCapacity = this.getAvailableCapacityForMonth(
                    month, 
                    realWorkingDaysInMonth, 
                    cumulativeAllocations
                );
                
                const hasOverflow = allocation.days > availableCapacity;
                const overflowAmount = Math.max(0, allocation.days - availableCapacity);
                
                processedAllocations[month][projectName] = {
                    ...allocation,
                    hasOverflow,
                    overflowAmount,
                    availableCapacity,
                    realCapacityInMonth: realWorkingDaysInMonth
                };
                
                // Update cumulative allocations for next iteration
                if (!cumulativeAllocations[month]) cumulativeAllocations[month] = {};
                cumulativeAllocations[month][projectName] = { days: allocation.days };
            });
        });
        
        return processedAllocations;
    }

    /**
     * Format month string for display
     */
    formatMonth(monthString) {
        const [year, month] = monthString.split('-');
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    }

    /**
     * MAIN METHOD: Get real team members from Teams configuration
     */
    async getRealTeamMembers() {
        try {
            console.log('getRealTeamMembers: Starting...');
            
            // Try multiple ways to get teams from configuration
            let configManager = this.app?.managers?.configuration || this.configManager;

            if (!configManager || !configManager.globalConfig) {
                console.warn('Configuration manager not available, trying direct access...');
                
                // Try to get the global config directly from window or app
                const globalConfig = window.globalConfig || 
                                  this.app?.globalConfig || 
                                  (window.app && window.app.managers && window.app.managers.configuration && window.app.managers.configuration.globalConfig);
                
                if (globalConfig) {

                    configManager = { globalConfig: globalConfig };
                } else {
                    console.warn('No configuration available, returning empty team members array');
                    return [];
                }
            }

            let teams = configManager.globalConfig.teams || [];
            console.log(`Found ${teams.length} teams in configuration:`, teams.map(t => t.name));
            
            // DEBUG: Log raw team data to see vendorId values
            teams.forEach(team => {

                (team.members || []).forEach(member => {

                });
            });
            
            // CRITICAL FIX: Check for vendorId truncation and reload from defaults if needed
            const hasInvalidVendorIds = teams.some(team => 
                (team.members || []).some(member => 
                    member.vendorType === 'internal' && 
                    member.firstName === 'Ioana-Simina' && 
                    member.vendorId === 'developer-g2'
                )
            );
            
            if (hasInvalidVendorIds) {
                console.log('DETECTED VENDORID TRUNCATION - Reloading teams from defaults.json...');
                
                try {
                    // Force reload from defaults
                    const defaultConfigManager = this.app?.managers?.defaultConfig || window.defaultConfigManager;
                    if (defaultConfigManager && typeof defaultConfigManager.getDefaultTeams === 'function') {
                        const defaultTeams = await defaultConfigManager.getDefaultTeams();
                        if (defaultTeams && defaultTeams.length > 0) {
                            console.log('Successfully reloaded teams from defaults.json');
                            teams = defaultTeams;
                            
                            // Update global config with correct data
                            configManager.globalConfig.teams = teams;
                            await configManager.saveGlobalConfig();

                            // Re-log corrected team data
                            teams.forEach(team => {

                                (team.members || []).forEach(member => {

                                });
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to reload teams from defaults:', error);
                }
            }
            
            // If no teams exist, try to initialize from TeamsConfigManager
            if (teams.length === 0) {
                console.log('No teams configured, attempting to initialize from TeamsConfigManager...');
                
                // Try to get TeamsConfigManager to load default teams
                const teamsManager = this.app?.managers?.teams || window.teamsManager;
                if (teamsManager && typeof teamsManager.ensureDefaultTeams === 'function') {
                    try {
                        await teamsManager.ensureDefaultTeams();
                        teams = configManager.globalConfig.teams || [];

                    } catch (error) {
                        console.warn('Failed to initialize default teams:', error);
                    }
                }
                
                // If still no teams, try alternative approach - direct load from DefaultConfigManager
                if (teams.length === 0) {
                    console.log('Trying direct load from DefaultConfigManager...');
                    const defaultConfigManager = this.app?.managers?.defaultConfig || window.defaultConfigManager;
                    if (defaultConfigManager && typeof defaultConfigManager.getDefaultTeams === 'function') {
                        try {
                            const defaultTeams = await defaultConfigManager.getDefaultTeams();
                            if (defaultTeams && defaultTeams.length > 0) {
                                teams = defaultTeams;
                                // Save to global config
                                configManager.globalConfig.teams = teams;
                                await configManager.saveGlobalConfig();

                            }
                        } catch (error) {
                            console.warn('Failed to load default teams from defaults.json:', error);
                        }
                    }
                }
                
                if (teams.length === 0) {
                    console.warn('No teams available - returning empty team members array');
                    return [];
                }
            }

            // Load real projects
            const dataManager = this.app?.managers?.data || window.dataManager;
            if (!dataManager) {
                console.warn('Data manager not available, using empty projects list');
                // Still continue with empty projects array instead of falling back to mock
            }

            let projects = [];
            try {
                if (dataManager) {
                    const projectsList = await dataManager.listProjects() || [];

                    // Transform project list to extract project data properly
                    projects = projectsList.map(projectItem => {
                        if (projectItem && projectItem.project) {
                            // Extract project data from nested structure
                            return {
                                ...projectItem.project,  // Include all project metadata (id, name, code, etc.)
                                filePath: projectItem.filePath,
                                fileName: projectItem.fileName,
                                // Add default phases structure if missing (will be empty array since we don't load full data here)
                                phases: [],  // Will be loaded later if needed by individual functions
                                status: projectItem.project.status || 'approved',  // Ensure status exists
                                startDate: projectItem.project.startDate || null,
                                endDate: projectItem.project.endDate || null
                            };
                        } else {
                            console.warn('Invalid project item structure:', projectItem);
                            return null;
                        }
                    }).filter(project => project !== null);

                    console.log('Projects:', projects.map(p => ({
                        name: p.name,
                        id: p.id,
                        status: p.status,
                        startDate: p.startDate,
                        phasesCount: p.phases?.length || 0
                    })));
                    
                    // Filter out projects without required dates for automatic allocation
                    // Only projects with proper dates can be used for automatic allocation
                    const projectsForAutoAllocation = projects.filter(project => {
                        return project.startDate && project.endDate && project.status;
                    });

                    // Use filtered projects for automatic allocations, original projects list for manual assignments
                    projects = projectsForAutoAllocation;
                }
            } catch (error) {
                console.warn('Error loading projects:', error);
                projects = [];
            }

            // Generate real team members

            const realTeamMembers = teams.flatMap(team => 
                (team.members || []).map(member => {

                    const memberRole = this.getMemberRole(member);
                    const vendor = this.resolveVendorName(member);
                    
                    // Generate sequential allocations based on project phases
                    const automaticAllocations = this.generateSequentialAllocations(member, memberRole, projects);
                    
                    // CRITICAL FIX: Create unique composite ID BEFORE merging manual assignments
                    const uniqueId = `${team.id}:${member.id}`;

                    // Create member with unique ID for manual assignment matching
                    const memberWithUniqueId = {
                        ...member,
                        id: uniqueId,
                        originalId: member.id,
                        teamId: team.id
                    };
                    
                    // Merge with manual assignments using the unique ID
                    const allocations = this.mergeManualAssignments(memberWithUniqueId, automaticAllocations);
                    
                    // Debug: show allocation structure
                    console.log(`Final allocations for ${uniqueId}:`, Object.keys(allocations).length, 'months');
                    Object.entries(allocations).forEach(([monthKey, monthData]) => {
                        const projects = Object.keys(monthData);
                        if (projects.length > 0) {

                        }
                    });
                    
                    // Check and flag overflow
                    const processedAllocations = this.checkAndFlagOverflow(
                        allocations, 
                        member.monthlyCapacity || 22
                    );
                    
                    // Calculate current utilization
                    const utilizationData = this.calculateCurrentUtilization(processedAllocations, memberRole);
                    
                    return {
                        ...member, // Include ALL original member fields (including vendorId!)
                        id: uniqueId, // Override with unique composite ID
                        originalId: member.id, // Keep original ID for reference
                        teamId: team.id, // Add team reference
                        role: memberRole, // From vendor configuration (G1/G2/TA/PM)
                        vendor: vendor,
                        maxCapacity: utilizationData.realWorkingDaysInMonth, // Real working days
                        currentUtilization: utilizationData.utilizationPercentage,
                        allocations: processedAllocations,
                        _debugInfo: {
                            allocatedDays: utilizationData.allocatedDays,
                            availableDays: utilizationData.availableDays,
                            originalMonthlyCapacity: member.monthlyCapacity || 22
                        }
                    };
                })
            );

            return realTeamMembers;

        } catch (error) {
            console.error('Error generating real team members:', error);
            console.warn('Error generating team members, returning empty array');
            return [];
        }
    }

    /**
     * AUXILIARY METHODS FOR UI INTEGRATION
     */

    /**
     * Generate project status from real data with interactive dropdown
     */
    generateProjectStatusFromRealData(member, project) {
        if (project === 'No Projects') {
            return '<span class="status-badge pending">No Projects</span>';
        }

        // Find if project has allocations in any month
        let hasApproved = false;
        let hasPending = false;
        let hasOverflow = false;

        Object.values(member.allocations).forEach(monthAllocations => {
            if (monthAllocations[project]) {
                const allocation = monthAllocations[project];
                if (allocation.status === 'approved') hasApproved = true;
                if (allocation.status === 'pending') hasPending = true;
                if (allocation.hasOverflow) hasOverflow = true;
            }
        });

        // Determine predominant status for dropdown default
        let predominantStatus = 'pending';
        if (hasApproved && !hasPending) {
            predominantStatus = 'approved';
        } else if (hasApproved && hasPending) {
            predominantStatus = 'approved'; // Default to approved when mixed
        }

        // Generate interactive dropdown for status change
        const overflowBadge = hasOverflow ? ' <span class="status-badge overflow">⚠️</span>' : '';
        
        return `
            <select class="status-dropdown" 
                    data-member-id="${member.id}" 
                    data-project="${project}"
                    onchange="window.capacityManager?.handleProjectStatusChange(this)">
                <option value="approved" ${predominantStatus === 'approved' ? 'selected' : ''}>✓ Approved</option>
                <option value="pending" ${predominantStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
            </select>${overflowBadge}
        `;
    }

    /**
     * Handle project status change from timeline dropdown
     */
    async handleProjectStatusChange(selectElement) {
        try {
            const memberId = selectElement.dataset.memberId;
            const project = selectElement.dataset.project;
            const newStatus = selectElement.value;

            // Update status in all allocations for this member-project combination
            await this.updateProjectStatusInAllocations(memberId, project, newStatus);
            
            // Refresh all capacity sections to reflect the change
            console.log('Refreshing all sections after status change...');
            await this.refreshAllCapacitySections();
            
            // Show success notification
            NotificationManager.success(`Project ${project} status changed to ${newStatus}`);
            
        } catch (error) {
            console.error('Error changing project status:', error);
            NotificationManager.error(`Failed to change project status: ${error.message}`);
        }
    }

    /**
     * Update project status in member allocations
     */
    async updateProjectStatusInAllocations(memberId, projectName, newStatus) {
        // Find the team member - handle both simple and composite IDs
        const rawTeamMembers = await this.getRealTeamMembers();
        const teamMembers = this.consolidateTeamMembersByPerson(rawTeamMembers);
        
        // Try to find member by exact ID match or by matching the member part of composite IDs
        const member = teamMembers.find(m => {
            // Direct match
            if (m.id === memberId) return true;
            
            // Check if memberId matches the originalId
            if (m.originalId === memberId) return true;
            
            // Check if memberId is in the consolidatedFrom array
            if (m.consolidatedFrom && m.consolidatedFrom.some(id => {
                // Extract member part from composite ID
                const memberPart = id.includes(':') ? id.split(':')[1] : id;
                return memberPart === memberId;
            })) return true;
            
            // Extract member part from current ID and compare
            const currentMemberPart = m.id.includes(':') ? m.id.split(':')[1] : m.id;
            return currentMemberPart === memberId;
        });
        
        if (!member) {
            console.error(`Team member with ID ${memberId} not found. Available IDs:`, 
                teamMembers.map(m => ({ id: m.id, originalId: m.originalId, consolidatedFrom: m.consolidatedFrom })));
            throw new Error(`Team member with ID ${memberId} not found`);
        }
        
        // Update status in all monthly allocations for this project
        let updatesCount = 0;
        Object.keys(member.allocations).forEach(monthKey => {
            if (member.allocations[monthKey][projectName]) {
                member.allocations[monthKey][projectName].status = newStatus;
                updatesCount++;
            }
        });
        
        // Also update status in manual assignments if they exist
        if (this.manualAssignments) {
            this.manualAssignments.forEach(assignment => {
                // Check if this assignment belongs to the member (handle different ID formats)
                const assignmentMemberPart = assignment.teamMemberId.includes(':') 
                    ? assignment.teamMemberId.split(':')[1] 
                    : assignment.teamMemberId;
                const searchMemberPart = memberId.includes(':') 
                    ? memberId.split(':')[1] 
                    : memberId;
                    
                if (assignment.teamMemberId === memberId || assignmentMemberPart === searchMemberPart) {
                    // Find project in calculatedAllocation
                    Object.keys(assignment.calculatedAllocation || {}).forEach(monthKey => {
                        if (assignment.calculatedAllocation[monthKey][projectName]) {
                            assignment.calculatedAllocation[monthKey][projectName].status = newStatus;
                        }
                    });
                }
            });
        }

    }

    /**
     * Removed createFallbackTeams method as per user request to eliminate all mock data
     */

    /**
     * Data Service Layer - Abstract all data access
     * These methods can be replaced with real API calls in the future
     */
    
    // === TEAM DATA SERVICES ===
    /**
     * Get all team members - abstraction layer for future API integration
     */
    async getTeamMembers() {
        // Return real team members from Teams configuration
        return await this.getRealTeamMembers();
    }
    
    /**
     * Get team member by ID
     */
    async getTeamMember(memberId) {
        // TODO: Replace with actual API call
        // return await this.api.getTeamMember(memberId);
        const members = await this.getTeamMembers();
        return members.find(m => m.id === memberId);
    }
    
    /**
     * Get unique vendors from team data
     */
    async getVendors() {
        // TODO: Replace with actual API call
        // return await this.api.getVendors();
        const members = await this.getTeamMembers();
        return [...new Set(members.map(m => m.vendor))];
    }
    
    // === PROJECT DATA SERVICES ===
    /**
     * Get all projects - abstraction for future API
     */
    async getProjects() {
        // TODO: Replace with actual API call
        // return await this.api.getProjects();
        const members = await this.getTeamMembers();
        const projects = new Set();
        members.forEach(member => {
            Object.values(member.allocations).forEach(monthAlloc => {
                Object.keys(monthAlloc).forEach(project => projects.add(project));
            });
        });
        return Array.from(projects);
    }
    
    // === CAPACITY DATA SERVICES ===
    /**
     * Get capacity data for a member in a specific month
     */
    async getCapacityData(memberId, monthKey) {
        // TODO: Replace with actual API call
        // return await this.api.getCapacityData(memberId, monthKey);
        const member = await this.getTeamMember(memberId);
        if (!member || !member.allocations || !member.allocations[monthKey]) {
            // Return empty object instead of generating mock data
            return {};
        }
        return member.allocations[monthKey];
    }

    /**
     * Update capacity allocation - abstraction for future API
     */
    async updateCapacityAllocation(memberId, project, monthKey, days) {
        // TODO: Replace with actual API call
        // return await this.api.updateCapacityAllocation(memberId, project, monthKey, days);
        const member = await this.getTeamMember(memberId);
        if (member && member.allocations && member.allocations[monthKey] && member.allocations[monthKey][project]) {
            member.allocations[monthKey][project].days = days;
            member.allocations[monthKey][project].modified = true;
            member.allocations[monthKey][project].lastUpdated = new Date().toISOString();
            return true;
        }
        return false;
    }

    // === CALCULATION SERVICES ===
    /**
     * Calculate capacity metrics for a member in a specific month
     */
    async calculateCapacityMetrics(memberId, monthKey, maxCapacity = 22) {
        const capacityData = await this.getCapacityData(memberId, monthKey);
        
        let approvedMDs = 0;
        let pendingMDs = 0;
        
        Object.entries(capacityData).forEach(([project, allocation]) => {
            const days = allocation.days || 0;
            const status = allocation.status || 'approved';
            
            if (status === 'approved') {
                approvedMDs += days;
            } else if (status === 'pending') {
                pendingMDs += days;
            }
        });
        
        const totalMDs = approvedMDs + pendingMDs;
        
        return {
            approvedMDs,
            pendingMDs,
            totalMDs,
            approvedPercentage: maxCapacity > 0 ? Math.round((approvedMDs / maxCapacity) * 100) : 0,
            pendingPercentage: maxCapacity > 0 ? Math.round((pendingMDs / maxCapacity) * 100) : 0,
            totalPercentage: maxCapacity > 0 ? Math.round((totalMDs / maxCapacity) * 100) : 0,
            maxCapacity
        };
    }
    
    /**
     * Calculate percentage class for styling
     */
    getPercentageClass(percentage) {
        if (percentage >= 90) return 'high';    // Verde >= 90%
        if (percentage >= 50) return 'medium';  // Giallo 50-89%
        return 'low';                           // Rosso < 50%
    }
    
    /**
     * Get filtered team members based on current filters
     */
    async getFilteredTeamMembers(filters = {}) {
        let members = await this.getTeamMembers();
        
        if (filters.memberId) {
            members = members.filter(m => m.id === filters.memberId);
        }
        
        if (filters.vendor) {
            const vendorValue = filters.vendor.toLowerCase().replace(' ', '-');
            members = members.filter(m => m.vendor.toLowerCase().replace(' ', '-') === vendorValue);
        }
        
        return members;
    }
    
    /**
     * Get timeline months - abstraction for future customization
     */
    getTimelineMonths() {
        // TODO: Replace with user-configurable timeline
        const months = [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Add all months from January of current year to December of current year
        for (let month = 0; month < 12; month++) {
            const monthDate = new Date(currentYear, month, 1);
            const monthName = monthDate.toLocaleDateString('en', { month: 'short' });
            const year = monthDate.getFullYear();
            const displayYear = year !== currentDate.getFullYear() ? year.toString().slice(-2) : '';
            months.push(monthName + displayYear);
        }
        
        // Add first 3 months of next year
        for (let month = 0; month < 3; month++) {
            const monthDate = new Date(currentYear + 1, month, 1);
            const monthName = monthDate.toLocaleDateString('en', { month: 'short' });
            const year = monthDate.getFullYear();
            const displayYear = year.toString().slice(-2);
            months.push(monthName + displayYear);
        }
        
        return months;
    }

    /**
     * Converts ISO month format (e.g., "2025-08") to abbreviated format (e.g., "Aug") 
     * used by timeline display
     */
    convertISOToTimelineMonth(isoMonth) {
        const [year, month] = isoMonth.split('-');
        const monthIndex = parseInt(month, 10) - 1; // Convert to 0-based index
        const date = new Date(parseInt(year), monthIndex, 1);
        const monthName = date.toLocaleDateString('en', { month: 'short' });
        const currentYear = new Date().getFullYear();
        const displayYear = parseInt(year) !== currentYear ? year.slice(-2) : '';
        return monthName + displayYear;
    }

    /**
     * Converts timeline month format (e.g., "Aug") to ISO format (e.g., "2025-08")
     * for data lookup
     */
    convertTimelineToISOMonth(timelineMonth) {
        const currentYear = new Date().getFullYear();
        
        // Extract month name and year suffix
        const yearMatch = timelineMonth.match(/(\d{2})$/);
        const yearSuffix = yearMatch ? yearMatch[1] : '';
        const monthName = yearSuffix ? timelineMonth.replace(yearSuffix, '') : timelineMonth;
        
        // Determine full year
        let fullYear;
        if (yearSuffix) {
            // If year suffix exists, it's next year (25 = 2025)
            fullYear = parseInt('20' + yearSuffix);
        } else {
            // No year suffix means current year
            fullYear = currentYear;
        }
        
        // Convert month name to number
        const monthMap = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        
        const monthNumber = monthMap[monthName];
        return monthNumber ? `${fullYear}-${monthNumber}` : null;
    }

    /**
     * Consolidate duplicate team members by person, merging their allocations
     * This fixes the issue where the same person appears in multiple teams
     */
    consolidateTeamMembersByPerson(teamMembers) {
        const consolidated = new Map();
        
        teamMembers.forEach(member => {
            // Use firstName + lastName as the consolidation key
            const personKey = `${member.firstName}_${member.lastName}`;
            
            if (consolidated.has(personKey)) {
                // Merge allocations with existing entry
                const existingMember = consolidated.get(personKey);
                
                // Track all IDs this person has across teams
                existingMember.teamIds.push(member.teamId);
                existingMember.consolidatedFrom.push(member.id);
                
                // Merge allocations from all teams this person belongs to
                Object.entries(member.allocations || {}).forEach(([monthKey, monthData]) => {
                    if (!existingMember.allocations[monthKey]) {
                        existingMember.allocations[monthKey] = {};
                    }
                    
                    // Merge project allocations for this month
                    Object.entries(monthData).forEach(([projectName, projectData]) => {
                        if (existingMember.allocations[monthKey][projectName]) {
                            // Add days if project already exists - ensure we have valid numbers
                            const existingDays = parseFloat(existingMember.allocations[monthKey][projectName].days) || 0;
                            const newDays = parseFloat(projectData.days) || 0;
                            existingMember.allocations[monthKey][projectName].days = existingDays + newDays;
                            
                            // Merge phases if they exist
                            if (projectData.phases && existingMember.allocations[monthKey][projectName].phases) {
                                existingMember.allocations[monthKey][projectName].phases.push(...projectData.phases);
                            }
                            
                            // Preserve status and other metadata
                            if (!existingMember.allocations[monthKey][projectName].status && projectData.status) {
                                existingMember.allocations[monthKey][projectName].status = projectData.status;
                            }
                        } else {
                            // Copy project allocation with validated days value
                            existingMember.allocations[monthKey][projectName] = {
                                ...projectData,
                                days: parseFloat(projectData.days) || 0
                            };
                        }
                    });
                });
                
                // Update other aggregated properties
                existingMember.maxCapacity = Math.max(existingMember.maxCapacity || 0, member.maxCapacity || 0);

            } else {
                // First occurrence of this person 
                // IMPORTANT: Keep the original allocations that already include manual assignments
                const consolidatedMember = {
                    ...member,
                    id: member.originalId || member.id, // Use original ID to avoid team prefix
                    teamIds: [member.teamId], // Track which teams this person belongs to
                    consolidatedFrom: [member.id], // Track original unique IDs
                    // Keep the original allocations which already have manual assignments merged
                    allocations: member.allocations || {}
                };
                
                // Just ensure days values are valid numbers
                Object.entries(consolidatedMember.allocations).forEach(([monthKey, monthData]) => {
                    Object.entries(monthData).forEach(([projectName, projectData]) => {
                        if (projectData && typeof projectData.days !== 'undefined') {
                            projectData.days = parseFloat(projectData.days) || 0;
                        }
                    });
                });
                
                consolidated.set(personKey, consolidatedMember);

            }
        });
        
        const result = Array.from(consolidated.values());

        // Debug: log sample allocation data
        if (result.length > 0) {
            const sample = result[0];
            console.log(`Sample consolidated member ${sample.firstName} ${sample.lastName}:`, {
                id: sample.id,
                consolidatedFrom: sample.consolidatedFrom,
                allocationsMonths: Object.keys(sample.allocations),
                sampleMonth: Object.keys(sample.allocations)[0] ? sample.allocations[Object.keys(sample.allocations)[0]] : 'No allocations'
            });
        }
        
        return result;
    }

    /**
     * Get month keys for data access
     */
    getTimelineMonthKeys() {
        const monthKeys = [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Current year months
        for (let month = 1; month <= 12; month++) {
            monthKeys.push(`${currentYear}-${month.toString().padStart(2, '0')}`);
        }
        
        // Next year first 3 months
        for (let month = 1; month <= 3; month++) {
            monthKeys.push(`${currentYear + 1}-${month.toString().padStart(2, '0')}`);
        }
        
        return monthKeys;
    }
    
    // === FILTER SERVICES ===
    /**
     * Get filter options for vendors
     */
    async getVendorFilterOptions() {
        const vendors = await this.getVendors();
        return [
            { value: '', label: 'All Vendors' },
            ...vendors.map(vendor => ({
                value: vendor.toLowerCase().replace(' ', '-'),
                label: vendor
            }))
        ];
    }
    
    /**
     * Get filter options for team members
     */
    async getTeamMemberFilterOptions() {
        const members = await this.getTeamMembers();
        return [
            { value: '', label: 'All Team Members' },
            ...members.map(member => ({
                value: member.id,
                label: `${member.firstName} ${member.lastName}`
            }))
        ];
    }
    
    /**
     * Get filter options for projects
     */
    async getProjectFilterOptions() {
        const projects = await this.getProjects();
        return [
            { value: '', label: 'All Projects' },
            ...projects.map(project => ({
                value: project.toLowerCase().replace(/\s+/g, '-'),
                label: project
            }))
        ];
    }

    /**
     * Populate overview filters with team member options
     */
    async populateOverviewFilters() {
        const teamMembers = await this.getRealTeamMembers();
        
        // Populate member filter
        const memberFilter = document.getElementById('overview-member-filter');
        if (memberFilter) {
            memberFilter.innerHTML = `
                <option value="">All Members</option>
                ${teamMembers.map(member => 
                    `<option value="${member.id}">${member.firstName} ${member.lastName}</option>`
                ).join('')}
            `;
        }
        
        console.log('Overview filters populated with', teamMembers.length, 'real team members');
    }

    /**
     * Load and populate the capacity planning tables with two-panel layout
     */
    async loadCapacityTable() {
        const rawTeamMembers = await this.getRealTeamMembers();
        const teamMembers = this.consolidateTeamMembersByPerson(rawTeamMembers);
        
        // Get both table bodies
        const ganttTableBody = document.getElementById('gantt-table-body');
        const allocationsTableBody = document.getElementById('allocations-table-body');
        
        if (!ganttTableBody || !allocationsTableBody) {
            // Fallback to old single table if new structure not found
            const oldTableBody = document.getElementById('capacity-table-body');
            if (oldTableBody) {
                const ganttHTML = await this.generateGanttTableRows(teamMembers);
                oldTableBody.innerHTML = ganttHTML;
                this.initializeGanttExpansion();
            } else {
                console.warn('Capacity table bodies not found');
            }
            return;
        }

        // Generate content for both panels
        const projectsData = this.groupAllocationsByProject(teamMembers);
        
        // Panel 1: Generate Gantt view for project phases
        const ganttHTML = this.generateGanttPanel(projectsData);
        ganttTableBody.innerHTML = ganttHTML;
        
        // Panel 2: Generate allocations view for team members
        const allocationsHTML = this.generateAllocationsPanel(projectsData, teamMembers);
        allocationsTableBody.innerHTML = allocationsHTML;

        // Initialize event listeners for both panels (with slight delay to ensure DOM is ready)
        setTimeout(() => {
            this.initializeSynchronizedScroll();
            this.initializeAllocationActions();
            this.initializeCapacityCellEventListeners();
        }, 100);
    }

    /**
     * Generate Gantt-style table rows with project phases and expandable team member allocations
     */
    async generateGanttTableRows(teamMembers) {
        // Group allocations by project first
        const projectsData = this.groupAllocationsByProject(teamMembers);
        
        if (projectsData.length === 0) {
            return `
                <tr class="no-data-row">
                    <td colspan="20" class="no-data-message">
                        <div class="no-data-content">
                            <i class="fas fa-tasks" style="color: #6c757d; font-size: 2.5em; margin-bottom: 1rem;"></i>
                            <p style="color: #6c757d; font-size: 1.1em; margin: 0; font-weight: 500;">No capacity assignments found</p>
                            <p style="color: #868e96; font-size: 0.9em; margin: 0.5rem 0 0 0;">Create manual assignments or check your team configuration</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        let html = '';
        
        for (const projectData of projectsData) {
            // Generate Gantt row for project phases
            html += this.generateProjectGanttRow(projectData);
            
            // Generate expandable team member allocation rows
            html += this.generateTeamMemberAllocationRows(projectData);
        }
        
        return html;
    }

    /**
     * Group team member allocations by project
     */
    groupAllocationsByProject(teamMembers) {
        const projectsMap = new Map();
        
        teamMembers.forEach(member => {
            Object.values(member.allocations).forEach(monthAllocations => {
                Object.keys(monthAllocations).forEach(projectName => {
                    if (!projectsMap.has(projectName)) {
                        projectsMap.set(projectName, {
                            name: projectName,
                            members: new Map(),
                            assignment: null
                        });
                    }
                    
                    const projectData = projectsMap.get(projectName);
                    if (!projectData.members.has(member.id)) {
                        projectData.members.set(member.id, {
                            member: member,
                            allocations: member.allocations
                        });
                    }
                });
            });
        });
        
        // Convert to array and get assignments for each project
        const projectsArray = Array.from(projectsMap.values());
        
        projectsArray.forEach(projectData => {
            // Find manual assignment for this project
            const projectObj = this.getProjectByName(projectData.name);
            projectData.assignment = this.manualAssignments?.find(a => 
                a.projectId === (projectObj?.id || projectData.name)
            );
        });
        
        return projectsArray;
    }

    /**
     * Generate Gantt row showing project phases
     */
    generateProjectGanttRow(projectData) {
        const assignment = projectData.assignment;
        const projectName = projectData.name;
        
        // Generate month cells with phase visualization
        const monthCells = this.generateProjectGanttCells(projectData);
        
        return `
            <tr class="gantt-row project-row" data-project-name="${projectName}" ${assignment ? `data-assignment-id="${assignment.id}"` : ''}>
                <td class="fixed-col expand-toggle">
                    <button class="expand-btn" data-expanded="false" data-project="${projectName}">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </td>
                <td class="fixed-col col-actions">
                    <div class="row-actions">
                        ${assignment ? `
                            <button class="btn btn-small btn-secondary edit-assignment-btn" 
                                    data-action="edit" data-assignment-id="${assignment.id}" title="Edit Assignment">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-small btn-secondary duplicate-assignment-btn"
                                    data-action="duplicate" data-assignment-id="${assignment.id}" title="Duplicate Assignment">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn btn-small btn-danger delete-assignment-btn"
                                    data-action="delete" data-assignment-id="${assignment.id}" title="Delete Assignment">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <span class="text-muted" style="font-size: 0.8em;">Auto-generated</span>
                        `}
                    </div>
                </td>
                <td class="fixed-col col-project">
                    <div class="project-info">
                        <span class="project-name">${projectName}</span>
                        <span class="project-status status-${assignment?.status || 'auto-generated'}">
                            ${assignment?.status || 'auto-generated'}
                        </span>
                        ${assignment ? `<span class="phase-count">${assignment.phaseSchedule?.length || 0} phases</span>` : ''}
                    </div>
                </td>
                <td class="fixed-col col-status">
                    <div class="status-badge status-active">
                        ● Active
                    </div>
                </td>
                ${monthCells}
            </tr>
        `;
    }

    /**
     * Generate Gantt cells for project phases visualization
     */
    generateProjectGanttCells(projectData) {
        const assignment = projectData.assignment;
        const timelineMonths = this.getTimelineMonths();
        
        // If no assignment with phases, show simple allocation totals
        if (!assignment || !assignment.phaseSchedule) {
            return timelineMonths.map(monthKey => {
                const isoMonthKey = this.convertTimelineToISOMonth(monthKey);
                let totalMDs = 0;
                
                // Sum up all member allocations for this project in this month
                projectData.members.forEach(memberData => {
                    const monthData = memberData.allocations[isoMonthKey];
                    const projectAllocation = monthData?.[projectData.name];
                    if (projectAllocation) {
                        totalMDs += projectAllocation.days || 0;
                    }
                });
                
                return `
                    <td class="month-col gantt-cell simple" data-month="${isoMonthKey}">
                        <div class="simple-allocation">
                            <span class="month-total">${totalMDs > 0 ? totalMDs + ' MDs' : '-'}</span>
                        </div>
                    </td>
                `;
            }).join('');
        }
        
        // Generate phase-based Gantt visualization
        const phaseGanttBars = this.generatePhaseGanttBars(assignment.phaseSchedule, timelineMonths);
        
        return timelineMonths.map(monthKey => {
            const isoMonthKey = this.convertTimelineToISOMonth(monthKey);
            const monthPhases = phaseGanttBars[isoMonthKey] || [];
            
            let totalMDs = 0;
            let hasOverflow = false;
            
            // Calculate total MDs and overflow for this month
            projectData.members.forEach(memberData => {
                const monthData = memberData.allocations[isoMonthKey];
                const projectAllocation = monthData?.[projectData.name];
                if (projectAllocation) {
                    totalMDs += projectAllocation.days || 0;
                    if (projectAllocation.hasOverflow) hasOverflow = true;
                }
            });
            
            const phaseBarsHTML = monthPhases.map(phase => `
                <div class="phase-bar phase-${phase.phaseId} ${phase.overflow > 0 ? 'overflow' : ''}" 
                     title="${phase.phaseName}: ${phase.estimatedMDs} MDs${phase.overflow > 0 ? ` (Overflow: +${phase.overflow})` : ''}">
                    <span class="phase-name">${this.truncateText(phase.phaseName, 8)}</span>
                </div>
            `).join('');
            
            return `
                <td class="month-col gantt-cell ${hasOverflow ? 'overflow' : ''}" data-month="${isoMonthKey}">
                    <div class="phase-bars">
                        ${phaseBarsHTML}
                    </div>
                    <span class="month-total">${totalMDs > 0 ? totalMDs + ' MDs' : '-'}</span>
                    ${hasOverflow ? '<i class="fas fa-exclamation-triangle overflow-warning"></i>' : ''}
                </td>
            `;
        }).join('');
    }

    /**
     * Generate phase Gantt bars for timeline visualization
     */
    generatePhaseGanttBars(phaseSchedule, timelineMonths) {
        const ganttBars = {};
        
        phaseSchedule.forEach(phase => {
            const startMonth = this.getMonthFromDate(phase.startDate);
            const endMonth = this.getMonthFromDate(phase.endDate);
            const monthsSpanned = this.getMonthsBetween(phase.startDate, phase.endDate);
            
            monthsSpanned.forEach(month => {
                if (!ganttBars[month]) ganttBars[month] = [];
                
                ganttBars[month].push({
                    phaseName: phase.phaseName,
                    phaseId: phase.phaseId,
                    estimatedMDs: phase.estimatedMDs,
                    overflow: phase.overflow,
                    isStart: month === startMonth,
                    isEnd: month === endMonth
                });
            });
        });
        
        return ganttBars;
    }

    /**
     * Generate expandable team member allocation rows
     */
    generateTeamMemberAllocationRows(projectData) {
        const timelineMonths = this.getTimelineMonths();
        const projectName = projectData.name;
        
        let html = '';
        
        // Header row for team member allocations
        html += `
            <tr class="allocation-row allocation-header hidden" data-parent-project="${projectName}">
                <td colspan="4" class="allocation-section-header">
                    <i class="fas fa-users"></i> Team Member Allocations
                </td>
                ${timelineMonths.map(monthKey => {
                    const isoMonthKey = this.convertTimelineToISOMonth(monthKey);
                    return `<td class="month-col allocation-header-cell">${monthKey}</td>`;
                }).join('')}
            </tr>
        `;
        
        // Individual team member rows
        projectData.members.forEach(memberData => {
            const member = memberData.member;
            const memberName = `${member.firstName} ${member.lastName}`;
            const memberRole = `${member.role} - ${member.vendor}`;
            
            const monthCells = timelineMonths.map(monthKey => {
                const isoMonthKey = this.convertTimelineToISOMonth(monthKey);
                const monthData = memberData.allocations[isoMonthKey];
                const projectAllocation = monthData?.[projectName];
                
                if (projectAllocation) {
                    const overflowClass = projectAllocation.hasOverflow ? 'overflow' : '';
                    return `
                        <td class="month-col member-allocation ${overflowClass}">
                            <div class="capacity-input-container">
                                <input type="number" class="capacity-mds-input ${overflowClass}" 
                                       value="${projectAllocation.days}" 
                                       min="0" step="1" 
                                       data-member-id="${member.id}"
                                       data-project="${projectName}"
                                       data-project-id="${projectId}"
                                       data-month="${isoMonthKey}"
                                       data-original-value="${projectAllocation.days}"
                                       title="${memberName} - ${projectName}: ${projectAllocation.days} MDs">
                                <button class="reset-capacity-mds-btn" 
                                        data-member-id="${member.id}"
                                        data-project="${projectName}"
                                        data-project-id="${projectId}"
                                        data-month="${isoMonthKey}"
                                        title="Reset to original value (${projectAllocation.days} MDs)"
                                        style="display: none;">
                                    <i class="fas fa-undo"></i>
                                </button>
                                ${projectAllocation.hasOverflow ? '<i class="fas fa-exclamation-triangle overflow-warning"></i>' : ''}
                            </div>
                        </td>
                    `;
                } else {
                    return `
                        <td class="month-col member-allocation empty">
                            <span class="no-allocation">-</span>
                        </td>
                    `;
                }
            }).join('');
            
            html += `
                <tr class="allocation-row member-row hidden" data-parent-project="${projectName}" data-member-id="${member.id}">
                    <td class="fixed-col"></td>
                    <td class="fixed-col"></td>
                    <td class="fixed-col col-member">
                        <div class="member-info">
                            <span class="member-name">${memberName}</span>
                            <span class="member-details">${memberRole}</span>
                        </div>
                    </td>
                    <td class="fixed-col member-capacity">
                        Max: ${member.maxCapacity} MD/month
                    </td>
                    ${monthCells}
                </tr>
            `;
        });
        
        return html;
    }

    /**
     * Generate Gantt panel content for project phases
     */
    generateGanttPanel(projectsData) {
        if (projectsData.length === 0) {
            return `
                <tr class="no-data-row">
                    <td colspan="20" class="no-data-message">
                        <div class="no-data-content">
                            <i class="fas fa-project-diagram" style="color: #6c757d; font-size: 2.5em; margin-bottom: 1rem;"></i>
                            <p style="color: #6c757d; font-size: 1.1em; margin: 0; font-weight: 500;">No projects available</p>
                            <p style="color: #868e96; font-size: 0.9em; margin: 0.5rem 0 0 0;">Load projects to see capacity planning data</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        let html = '';
        const timelineMonths = this.getTimelineMonths();
        
        projectsData.forEach(projectData => {
            const assignment = projectData.assignment;
            const phasesInfo = assignment?.phaseSchedule ? 
                Object.keys(assignment.phaseSchedule).map(phase => 
                    this.getPhaseDisplayName(phase)
                ).join(', ') : 'No phases defined';
            
            html += `
                <tr class="gantt-project-row" data-project="${projectData.name}">
                    <td class="fixed-col col-project-name">
                        <div class="project-name-cell">
                            <span class="project-name">${projectData.name}</span>
                        </div>
                    </td>
                    <td class="fixed-col col-phases">
                        <div class="phases-summary">
                            <span class="phases-count">${assignment?.phaseSchedule ? Object.keys(assignment.phaseSchedule).length : 0} phases</span>
                            <span class="phases-list" title="${phasesInfo}">${phasesInfo}</span>
                        </div>
                    </td>
                    <td class="fixed-col col-total-mds">
                        <div class="total-mds-cell">
                            <span class="total-mds-value">${assignment?.totalMDs || 0} MDs</span>
                        </div>
                    </td>
                    ${this.generateGanttCells(projectData, timelineMonths)}
                </tr>
            `;
        });
        
        return html;
    }

    /**
     * Generate Gantt cells for project timeline
     */
    generateGanttCells(projectData, timelineMonths) {
        const assignment = projectData.assignment;
        
        if (!assignment || !assignment.phaseSchedule) {
            return timelineMonths.map(() => 
                '<td class="month-col gantt-cell empty"><span class="no-phase">-</span></td>'
            ).join('');
        }
        
        const phaseGanttBars = this.generatePhaseGanttBars(assignment.phaseSchedule, timelineMonths);
        
        return timelineMonths.map(monthKey => {
            const isoMonthKey = this.convertTimelineToISOMonth(monthKey);
            const monthPhases = phaseGanttBars[isoMonthKey] || [];
            
            if (monthPhases.length === 0) {
                return '<td class="month-col gantt-cell empty"><span class="no-phase">-</span></td>';
            }
            
            const phaseBarsHTML = monthPhases.map(phase => `
                <div class="phase-bar phase-${phase.phaseId} ${phase.overflow > 0 ? 'overflow' : ''}" 
                     title="${phase.phaseName}: ${phase.estimatedMDs} MDs${phase.overflow > 0 ? ` (Overflow: +${phase.overflow})` : ''}">
                    <span class="phase-name">${phase.phaseName.substring(0, 5)}...</span>
                </div>
            `).join('');
            
            return `
                <td class="month-col gantt-cell ${monthPhases.some(p => p.overflow > 0) ? 'has-overflow' : ''}">
                    <div class="phase-bars">
                        ${phaseBarsHTML}
                    </div>
                </td>
            `;
        }).join('');
    }

    /**
     * Generate allocations panel content for team members
     */
    generateAllocationsPanel(projectsData, teamMembers) {
        if (projectsData.length === 0 || teamMembers.length === 0) {
            return `
                <tr class="no-data-row">
                    <td colspan="20" class="no-data-message">
                        <div class="no-data-content">
                            <i class="fas fa-users-slash" style="color: #6c757d; font-size: 2.5em; margin-bottom: 1rem;"></i>
                            <p style="color: #6c757d; font-size: 1.1em; margin: 0; font-weight: 500;">No team member allocations available</p>
                            <p style="color: #868e96; font-size: 0.9em; margin: 0.5rem 0 0 0;">Create assignments to see team member allocations here</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        let html = '';
        const timelineMonths = this.getTimelineMonths();
        
        // Create a map of all allocations by team member and project
        const allocationsByMember = new Map();
        
        projectsData.forEach(projectData => {
            projectData.members.forEach((memberData, memberId) => {
                const member = memberData.member;
                const key = `${memberId}_${projectData.name}`;
                
                // Find the assignment for this member and project
                const assignment = this.findAssignmentForMemberAndProject(memberId, projectData.assignment?.projectId);
                
                allocationsByMember.set(key, {
                    member: member,
                    projectName: projectData.name,
                    projectId: projectData.assignment?.projectId,
                    allocations: memberData.allocations,
                    assignment: assignment,
                    assignmentId: assignment?.id
                });
            });
        });
        
        // Generate rows for each member-project combination
        allocationsByMember.forEach((data, key) => {
            const member = data.member;
            const memberName = `${member.firstName} ${member.lastName}`;
            const memberRole = member.role || '';
            const memberVendor = member.vendor || '';
            
            // Always show action buttons for manual assignments
            const hasAssignment = data.assignmentId && data.assignmentId !== 'undefined';
            
            html += `
                <tr class="allocation-member-row" data-member="${member.id}" data-project="${data.projectName}">
                    <td class="fixed-col col-member">
                        <div class="member-info">
                            <span class="member-name">${memberName}</span>
                            <span class="member-details">${memberRole}${memberRole && memberVendor ? ' - ' : ''}${memberVendor}</span>
                            <span class="project-tag">${data.projectName}</span>
                        </div>
                    </td>
                    <td class="fixed-col col-actions">
                        <div class="row-actions">
                            ${hasAssignment ? `
                                <button class="btn btn-small btn-secondary edit-allocation-btn" 
                                        data-action="edit" 
                                        data-assignment-id="${data.assignmentId}"
                                        data-member-id="${member.id}"
                                        data-project-id="${data.projectId}"
                                        title="Edit Allocation">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-small btn-secondary duplicate-allocation-btn" 
                                        data-action="duplicate" 
                                        data-assignment-id="${data.assignmentId}"
                                        data-member-id="${member.id}"
                                        data-project-id="${data.projectId}"
                                        title="Duplicate Allocation">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button class="btn btn-small btn-danger delete-allocation-btn" 
                                        data-action="delete" 
                                        data-assignment-id="${data.assignmentId}"
                                        data-member-id="${member.id}"
                                        data-project-id="${data.projectId}"
                                        title="Delete Allocation">
                                    <i class="fas fa-trash"></i>
                                </button>
                                <button class="btn btn-small btn-warning reset-allocation-btn" 
                                        data-action="reset" 
                                        data-assignment-id="${data.assignmentId}"
                                        data-member-id="${member.id}"
                                        data-project-id="${data.projectId}"
                                        title="Reset allocation to original values">
                                    <i class="fas fa-undo-alt"></i>
                                </button>
                            ` : `
                                <span class="auto-generated-label">Auto-generated</span>
                            `}
                        </div>
                    </td>
                    ${this.generateAllocationCells(member, data.projectName, data.projectId, data.allocations, timelineMonths)}
                </tr>
            `;
        });
        
        return html;
    }

    /**
     * Generate allocation cells for a team member
     */
    generateAllocationCells(member, projectName, projectId, allocations, timelineMonths) {
        return timelineMonths.map(monthKey => {
            const isoMonthKey = this.convertTimelineToISOMonth(monthKey);
            const monthData = allocations[isoMonthKey];
            const projectAllocation = monthData?.[projectName];
            
            if (projectAllocation) {
                const overflowClass = projectAllocation.hasOverflow ? 'overflow' : '';
                return `
                    <td class="month-col member-allocation ${overflowClass}">
                        <div class="capacity-input-container">
                            <input type="number" 
                                   class="capacity-mds-input ${overflowClass}" 
                                   value="${projectAllocation.days}" 
                                   min="0" 
                                   step="1" 
                                   data-member-id="${member.id}" 
                                   data-project="${projectName}" 
                                   data-project-id="${projectId}"
                                   data-month="${isoMonthKey}"
                                   data-original-value="${projectAllocation.days}"
                                   title="${member.firstName} ${member.lastName} - ${projectName}: ${projectAllocation.days} MDs">
                            <button class="reset-capacity-mds-btn" 
                                    data-member-id="${member.id}"
                                    data-project="${projectName}"
                                    data-project-id="${projectId}"
                                    data-month="${isoMonthKey}"
                                    title="Reset to original value (${projectAllocation.days} MDs)"
                                    style="display: none;">
                                <i class="fas fa-undo"></i>
                            </button>
                            ${projectAllocation.hasOverflow ? '<i class="fas fa-exclamation-triangle overflow-warning"></i>' : ''}
                        </div>
                    </td>
                `;
            } else {
                return `
                    <td class="month-col member-allocation empty">
                        <span class="no-allocation">-</span>
                    </td>
                `;
            }
        }).join('');
    }

    /**
     * Initialize synchronized scrolling between panels
     */
    initializeSynchronizedScroll() {
        const ganttWrapper = document.getElementById('gantt-scroll-wrapper');
        const allocationsWrapper = document.getElementById('allocations-scroll-wrapper');
        
        if (ganttWrapper && allocationsWrapper) {
            let isScrolling = false;
            
            ganttWrapper.addEventListener('scroll', () => {
                if (!isScrolling) {
                    isScrolling = true;
                    allocationsWrapper.scrollLeft = ganttWrapper.scrollLeft;
                    setTimeout(() => { isScrolling = false; }, 10);
                }
            });
            
            allocationsWrapper.addEventListener('scroll', () => {
                if (!isScrolling) {
                    isScrolling = true;
                    ganttWrapper.scrollLeft = allocationsWrapper.scrollLeft;
                    setTimeout(() => { isScrolling = false; }, 10);
                }
            });
        }
        
        // Handle panel collapse/expand using event delegation
        document.addEventListener('click', (e) => {
            if (e.target.id === 'toggle-gantt-panel' || e.target.closest('#toggle-gantt-panel')) {
                e.preventDefault();
                e.stopPropagation();
                
                const toggleBtn = document.getElementById('toggle-gantt-panel');
                const ganttPanel = document.querySelector('.gantt-panel');
                
                if (!ganttPanel) return;
                
                if (ganttPanel.classList.contains('collapsed')) {
                    ganttPanel.classList.remove('collapsed');
                    const icon = toggleBtn?.querySelector('i');
                    if (icon) icon.className = 'fas fa-chevron-up';
                } else {
                    ganttPanel.classList.add('collapsed');
                    const icon = toggleBtn?.querySelector('i');
                    if (icon) icon.className = 'fas fa-chevron-down';
                }
            }
        });
    }

    /**
     * Initialize event listeners for allocation actions
     */
    initializeAllocationActions() {
        // Edit allocation
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.edit-allocation-btn')) {
                const btn = e.target.closest('.edit-allocation-btn');
                const assignmentId = btn.dataset.assignmentId;
                await this.showEditAssignmentModal(assignmentId);
            }
        });
        
        // Duplicate allocation
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.duplicate-allocation-btn')) {
                const btn = e.target.closest('.duplicate-allocation-btn');
                const assignmentId = btn.dataset.assignmentId;
                await this.duplicateAssignment(assignmentId);
            }
        });
        
        // Delete allocation
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.delete-allocation-btn')) {
                const btn = e.target.closest('.delete-allocation-btn');
                const assignmentId = btn.dataset.assignmentId;
                await this.deleteAssignment(assignmentId);
            }
        });
        
        // Handle capacity input changes
        document.addEventListener('change', async (e) => {
            if (e.target.classList.contains('capacity-mds-input')) {
                const input = e.target;
                const memberId = input.dataset.memberId;
                const project = input.dataset.project;
                const month = input.dataset.month;
                const value = parseInt(input.value) || 0;
                
                await this.updateCapacityValue(memberId, project, month, value);
            }
        });
    }

    /**
     * Initialize expand/collapse functionality for Gantt rows
     */
    initializeGanttExpansion() {
        // Add event listeners for expand/collapse buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('expand-btn') || e.target.closest('.expand-btn')) {
                const button = e.target.closest('.expand-btn') || e.target;
                const projectName = button.dataset.project;
                this.toggleProjectExpansion(projectName, button);
            }
        });
    }

    /**
     * Toggle expansion of project team member allocations
     */
    toggleProjectExpansion(projectName, button) {
        const allocationRows = document.querySelectorAll(`[data-parent-project="${projectName}"]`);
        const isExpanded = button.dataset.expanded === 'true';
        
        if (isExpanded) {
            // Collapse
            allocationRows.forEach(row => row.classList.add('hidden'));
            button.innerHTML = '<i class="fas fa-chevron-right"></i>';
            button.dataset.expanded = 'false';
        } else {
            // Expand
            allocationRows.forEach(row => row.classList.remove('hidden'));
            button.innerHTML = '<i class="fas fa-chevron-down"></i>';
            button.dataset.expanded = 'true';
        }
    }

    /**
     * Utility function to truncate text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Get month string from date (YYYY-MM format)
     */
    getMonthFromDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Get array of months between two dates
     */
    getMonthsBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const months = [];
        
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            months.push(`${year}-${month}`);
            current.setMonth(current.getMonth() + 1);
        }
        
        return months;
    }

    /**
     * Initialize event listeners for editable capacity cells
     */
    initializeCapacityCellEventListeners() {
        // Add event listeners for capacity input changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('capacity-mds-input')) {
                // Skip handling if we're in the middle of a reset operation
                if (this._resettingAllocation) {
                    console.log('Skipping capacity value change during reset operation');
                    return;
                }
                this.handleCapacityValueChange(e.target);
            }
        });

        // Add event listeners for reset buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('reset-capacity-mds-btn') || 
                e.target.closest('.reset-capacity-mds-btn')) {
                const button = e.target.closest('.reset-capacity-mds-btn') || e.target;
                this.handleCapacityValueReset(button);
            }
        });

        // Add event listeners for assignment action buttons
        document.addEventListener('click', (e) => {
            // Edit assignment button
            if (e.target.classList.contains('edit-assignment-btn') || 
                e.target.closest('.edit-assignment-btn')) {
                const button = e.target.closest('.edit-assignment-btn') || e.target;
                const assignmentId = button.dataset.assignmentId;
                this.showEditAssignmentModal(assignmentId);
            }
            
            // Duplicate assignment button
            if (e.target.classList.contains('duplicate-assignment-btn') || 
                e.target.closest('.duplicate-assignment-btn')) {
                const button = e.target.closest('.duplicate-assignment-btn') || e.target;
                const assignmentId = button.dataset.assignmentId;
                this.duplicateAssignment(assignmentId);
            }
            
            // Delete assignment button
            if (e.target.classList.contains('delete-assignment-btn') || 
                e.target.closest('.delete-assignment-btn')) {
                const button = e.target.closest('.delete-assignment-btn') || e.target;
                const assignmentId = button.dataset.assignmentId;
                this.deleteAssignment(assignmentId);
            }
            
            // Reset allocation button
            if (e.target.classList.contains('reset-allocation-btn') || 
                e.target.closest('.reset-allocation-btn')) {
                const button = e.target.closest('.reset-allocation-btn') || e.target;
                const assignmentId = button.dataset.assignmentId;
                const memberId = button.dataset.memberId;
                const projectId = button.dataset.projectId;
                this.resetAllocationToOriginal(assignmentId, memberId, projectId);
            }
        });

    }

    /**
     * Handle capacity value change
     */
    handleCapacityValueChange(input) {
        const memberId = input.dataset.memberId;
        const project = input.dataset.project;
        const projectId = input.dataset.projectId;
        const month = input.dataset.month;
        const newValue = parseInt(input.value) || 0;
        const originalValue = parseInt(input.dataset.originalValue) || 0;

        // Mark as modified and show reset button if value changed
        const hasChanged = newValue !== originalValue;
        const resetButton = input.parentElement.querySelector('.reset-capacity-mds-btn');
        
        if (hasChanged) {
            input.classList.add('modified');
            if (resetButton) resetButton.style.display = 'inline-block';
        } else {
            input.classList.remove('modified');
            if (resetButton) resetButton.style.display = 'none';
        }
        
        // Update tooltip
        const cell = input.closest('td');
        if (cell) {
            const currentTitle = cell.title;
            cell.title = currentTitle.replace(/: \d+ MDs/, `: ${newValue} MDs`) + 
                       (hasChanged ? ` (Original: ${originalValue})` : '');
        }

        // Save the change to data structure
        this.updateCapacityValue(memberId, project, month, newValue);
        
        // Trigger auto-redistribution for this assignment (use projectId not projectName)
        this.triggerAutoRedistribution(memberId, projectId || project, newValue, month);
    }


    /**
     * Update capacity value in data structure
     */
    async updateCapacityValue(memberId, project, month, newValue) {
        // This is a placeholder for updating the actual data structure
        // In a real implementation, you would update your data model here

        // You might want to:
        // 1. Update the real team members data structure
        // 2. Trigger recalculations for overflow detection
        // 3. Mark data as dirty for saving
        // 4. Validate the new value against capacity constraints
        
        // For now, just log the change and update overflow status
        const teamMembers = await this.getRealTeamMembers();
        const member = teamMembers.find(m => m.id === memberId);
        if (member && member.allocations && member.allocations[month] && member.allocations[month][project]) {
            member.allocations[month][project].days = newValue;
            member.allocations[month][project].modified = true;
            
            // Recalculate overflow for this member/month
            const [year, monthNum] = month.split('-').map(Number);
            const realWorkingDaysInMonth = this.calculateWorkingDaysInMonth(year, monthNum);
            const totalAllocatedInMonth = Object.values(member.allocations[month])
                .reduce((sum, allocation) => sum + allocation.days, 0);
            
            // Check if this change creates overflow
            const hasOverflow = totalAllocatedInMonth > realWorkingDaysInMonth;
            if (hasOverflow) {
                console.warn(`Overflow detected for ${member.firstName} ${member.lastName} in ${month}: ${totalAllocatedInMonth} > ${realWorkingDaysInMonth}`);
            }
        }
    }

    /**
     * Trigger auto-redistribution for an assignment when user changes a value
     */
    async triggerAutoRedistribution(memberId, projectIdOrName, newValue, changedMonth) {
        try {
            // Find the assignment that corresponds to this allocation
            const assignment = this.findAssignmentForMemberAndProject(memberId, projectIdOrName);
            if (!assignment) {
                console.warn(`No assignment found for member ${memberId} and project ${projectIdOrName}`);
                return;
            }

            console.log('Found assignment:', assignment);

            // Get the auto-distribution algorithm
            if (!this.autoDistribution) {
                console.warn('AutoDistribution not available');
                return;
            }

            // Get project name - need this to access the nested structure
            let projectName = null;
            
            // Find the project name from the calculatedAllocation structure
            if (assignment.calculatedAllocation) {
                const firstMonth = Object.keys(assignment.calculatedAllocation)[0];
                if (firstMonth && assignment.calculatedAllocation[firstMonth]) {
                    projectName = Object.keys(assignment.calculatedAllocation[firstMonth])[0];
                }
            }
            
            if (!projectName) {
                console.error('Could not determine project name from assignment');
                return;
            }
            
            console.log('Project name:', projectName);

            // Convert assignment data to allocations format for the algorithm
            let allocations = {};
            
            // Extract allocations from calculatedAllocation
            if (assignment.calculatedAllocation) {
                Object.entries(assignment.calculatedAllocation).forEach(([month, monthData]) => {
                    // Check if it's a valid month format (YYYY-MM)
                    if (!/^\d{4}-\d{2}$/.test(month)) {
                        return;
                    }
                    
                    // Get the project data for this month
                    const projectData = monthData[projectName];
                    
                    if (projectData && projectData.days > 0) {
                        allocations[month] = {
                            planned: projectData.days,
                            actual: projectData.days,
                            locked: false
                        };
                    }
                });
            }

            console.log('Converted allocations:', allocations);
            
            // If allocations are still empty, we can't proceed
            if (Object.keys(allocations).length === 0) {
                console.error('Could not extract allocations from assignment');
                return;
            }

            // Calculate total MDs for validation
            const totalMDs = Object.values(allocations).reduce((sum, a) => sum + a.planned, 0);
            console.log('Total MDs before redistribution:', totalMDs);

            // Create a temporary assignment structure for the algorithm
            const tempAssignment = {
                ...assignment,
                allocations: allocations
            };
            
            console.log('Calling redistributeAfterUserChange with:', {
                month: changedMonth,
                newValue: newValue,
                currentAllocations: allocations
            });
            
            // Use the redistribution after user change method
            const updatedAssignment = this.autoDistribution.redistributeAfterUserChange(
                tempAssignment, 
                changedMonth, 
                newValue
            );

            console.log('Redistribution result:', updatedAssignment);

            if (updatedAssignment && updatedAssignment.allocations) {
                // Calculate new total for validation
                const newTotal = Object.values(updatedAssignment.allocations)
                    .filter(a => typeof a === 'object' && a.planned !== undefined)
                    .reduce((sum, a) => sum + a.planned, 0);
                console.log('Total MDs after redistribution:', newTotal);
                
                // Save original allocation on first modification (if not already saved)
                if (assignment.calculatedAllocation && !assignment.originalCalculatedAllocation) {
                    console.log('Saving original allocation for reset functionality');
                    assignment.originalCalculatedAllocation = JSON.parse(JSON.stringify(assignment.calculatedAllocation));
                }
                
                // Update the original assignment with new distribution
                if (assignment.calculatedAllocation) {
                    Object.keys(assignment.calculatedAllocation).forEach(month => {
                        if (updatedAssignment.allocations[month] && /^\d{4}-\d{2}$/.test(month)) {
                            // Update the nested structure
                            if (assignment.calculatedAllocation[month][projectName]) {
                                const newDays = updatedAssignment.allocations[month].planned;
                                assignment.calculatedAllocation[month][projectName].days = newDays;
                                
                                console.log(`Updated ${month}: ${newDays} MDs`);
                            }
                        }
                    });
                }
                
                // Update the UI with the new distribution
                this.updateUIAfterRedistribution(memberId, projectName, projectIdOrName, updatedAssignment.allocations, changedMonth);
                
                // Mark data as dirty for saving
                this.isCapacityDataDirty = true;
                
                console.log('Assignment updated successfully');
            }

        } catch (error) {
            console.error('Error during auto-redistribution:', error);
        }
    }

    /**
     * Update UI cells after auto-redistribution
     */
    updateUIAfterRedistribution(memberId, projectName, projectId, newAllocations, excludeMonth) {
        Object.keys(newAllocations).forEach(month => {
            // Skip the month that was manually changed
            if (month === excludeMonth) return;
            
            // Skip metadata fields
            if (['hasOverflow', 'overflowAmount', 'hasUnallocatedMDs', 'unallocatedAmount', 'error'].includes(month)) {
                return;
            }

            const allocation = newAllocations[month];
            if (allocation && typeof allocation === 'object' && allocation.planned !== undefined) {
                // Find the corresponding input field - use projectId if available
                const selector = projectId ? 
                    `.capacity-mds-input[data-member-id="${memberId}"][data-project-id="${projectId}"][data-month="${month}"]` :
                    `.capacity-mds-input[data-member-id="${memberId}"][data-project="${projectName}"][data-month="${month}"]`;
                    
                const input = document.querySelector(selector);
                
                if (input && allocation.planned !== undefined) {
                    const newValue = Math.round(allocation.planned);
                    input.value = newValue;
                    
                    // Update tooltip
                    const cell = input.closest('td');
                    if (cell) {
                        const originalTitle = cell.title.split(' (Original')[0];
                        cell.title = originalTitle.replace(/: \d+ MDs/, `: ${newValue} MDs`);
                    }
                    
                    // Mark as auto-updated (different from user-modified)
                    input.classList.add('auto-updated');
                    input.classList.remove('modified');
                    
                    // Hide reset button for auto-updated fields
                    const resetButton = input.parentElement?.querySelector('.reset-capacity-mds-btn');
                    if (resetButton) resetButton.style.display = 'none';
                }
            }
        });
    }

    /**
     * Handle reset button clicks to restore original values
     */
    handleCapacityValueReset(button) {
        const memberId = button.dataset.memberId;
        const project = button.dataset.project;
        const projectId = button.dataset.projectId;
        const month = button.dataset.month;
        
        // Find the corresponding input field - use projectId if available
        const selector = projectId ? 
            `.capacity-mds-input[data-member-id="${memberId}"][data-project-id="${projectId}"][data-month="${month}"]` :
            `.capacity-mds-input[data-member-id="${memberId}"][data-project="${project}"][data-month="${month}"]`;
            
        const input = document.querySelector(selector);
        
        if (input) {
            const originalValue = parseInt(input.dataset.originalValue) || 0;
            
            // Reset to original value
            input.value = originalValue;
            input.classList.remove('modified', 'auto-updated');
            
            // Hide reset button
            button.style.display = 'none';
            
            // Update tooltip
            const cell = input.closest('td');
            if (cell) {
                const currentTitle = cell.title.split(' (Original')[0];
                cell.title = currentTitle.replace(/: \d+ MDs/, `: ${originalValue} MDs`);
            }
            
            // Update the data structure
            this.updateCapacityValue(memberId, project, month, originalValue);
            
            // Trigger auto-redistribution with the reset value (use projectId not projectName)
            this.triggerAutoRedistribution(memberId, projectId || project, originalValue, month);
        }
    }

    /**
     * Generate project status badge based on member allocations
     */
    generateProjectStatus(member, project) {
        const allocations = Object.values(member.allocations);
        const projectAllocations = allocations.filter(monthAlloc => 
            monthAlloc && monthAlloc[project]
        );
        
        if (projectAllocations.length === 0) {
            return '<span class="status-badge draft">Draft</span>';
        }
        
        // Check status distribution for this project
        let approvedCount = 0;
        let pendingCount = 0;
        let draftCount = 0;
        
        projectAllocations.forEach(monthAlloc => {
            const allocation = monthAlloc[project];
            if (allocation) {
                switch (allocation.status) {
                    case 'approved':
                        approvedCount++;
                        break;
                    case 'pending':
                        pendingCount++;
                        break;
                    default:
                        draftCount++;
                        break;
                }
            }
        });
        
        // Determine overall status
        if (approvedCount > 0 && pendingCount === 0 && draftCount === 0) {
            return '<span class="status-badge approved">Approved</span>';
        } else if (pendingCount > 0 && approvedCount === 0 && draftCount === 0) {
            return '<span class="status-badge pending">Pending</span>';
        } else if (approvedCount > 0 && (pendingCount > 0 || draftCount > 0)) {
            return '<span class="status-badge partial">Mixed</span>';
        } else {
            return '<span class="status-badge draft">Draft</span>';
        }
    }

    /**
     * Update capacity overview when filters change
     */
    async updateCapacityOverview() {
        console.log('Updating capacity overview with current filter settings');
        await this.generateCapacityOverview();
    }

    /**
     * Render assignment card
     */
    renderAssignmentCard(assignment) {
        const statusClass = assignment.status;
        const statusIcon = assignment.status === 'approved' ? '✅' : '🟡';
        const progressClass = assignment.progress > 0 ? '' : 'pending';
        
        return `
            <div class="assignment-card ${statusClass}" data-assignment-id="${assignment.id}">
                <div class="assignment-header">
                    <div class="assignment-info">
                        <h3>${statusIcon} ${assignment.projectName}</h3>
                        <p class="assignment-details">${assignment.teamMember} • ${assignment.startDate} - ${assignment.endDate} • ${assignment.totalMDs} MDs</p>
                    </div>
                    <div class="assignment-actions">
                        <button class="btn-secondary" onclick="window.capacityManager?.editAssignment('${assignment.id}')">Edit</button>
                        ${assignment.status === 'pending' ? 
                            `<button class="btn-primary" onclick="window.capacityManager?.approveAssignment('${assignment.id}')">Approve</button>` :
                            `<button class="btn-secondary" onclick="window.capacityManager?.viewAssignmentDetails('${assignment.id}')">Details</button>`
                        }
                    </div>
                </div>
                <div class="assignment-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" style="width: ${assignment.progress}%"></div>
                    </div>
                    <span class="progress-text">
                        ${assignment.progress > 0 ? 
                            `${Math.round(assignment.totalMDs * assignment.progress / 100)}/${assignment.totalMDs} MDs completed (${assignment.progress}%)` :
                            assignment.status === 'pending' ? 'Not started (Pending approval)' : 'Ready to start'
                        }
                    </span>
                </div>
                <div class="assignment-status">
                    <span class="status-badge ${assignment.status}">${assignment.status.toUpperCase()}</span>
                    ${assignment.progress === 0 && assignment.status === 'approved' ? 
                        '<span class="capacity-badge available">✅ Ready to start</span>' : ''
                    }
                </div>
            </div>
        `;
    }

    /**
     * Update capacity statistics
     */
    async updateStatistics() {
        // Generate capacity overview grid
        await this.generateCapacityOverview();
    }

    /**
     * Generate capacity overview showing resource allocation by month
     */
    async generateCapacityOverview() {
        const overviewContainer = document.getElementById('capacity-overview-grid');
        if (!overviewContainer) return;

        const teamMembers = await this.getTeamMembers();
        const months = this.getTimelineMonths();
        const currentDate = new Date();
        
        // Generate table structure - AWAIT the async method
        const tableHTML = await this.buildCapacityOverviewTable(teamMembers, months, currentDate);
        overviewContainer.innerHTML = tableHTML;
        
        console.log('Capacity overview generated for', teamMembers.length, 'resources across', months.length, 'months');
    }

    /**
     * Build the capacity overview table HTML
     */
    async buildCapacityOverviewTable(teamMembers, months, currentDate) {
        // Get current member filter
        const memberFilter = document.getElementById('overview-member-filter');
        const selectedMemberId = memberFilter ? memberFilter.value : '';
        
        // Filter team members if specific member selected
        let filteredMembers = teamMembers;
        if (selectedMemberId && selectedMemberId.trim() !== '') {
            filteredMembers = teamMembers.filter(member => member.id === selectedMemberId);
            console.log(`Filtering by member ${selectedMemberId}:`, filteredMembers.length, 'members found');
        }
        
        // Generate month headers with correct classes
        const monthHeaders = months.map(monthDisplay => 
            `<th class="month-col">${monthDisplay}</th>`
        ).join('');
        
        // Generate rows for each filtered team member - AWAIT all async cell generation
        const memberRowsPromises = filteredMembers.map(async member => {
            const memberName = `${member.firstName} ${member.lastName}`;
            const memberRole = `${member.role} - ${member.vendor}`;
            
            // Generate month cells for this member - AWAIT each cell
            const monthCellPromises = months.map(async (monthDisplay, index) => {
                // Calculate correct month: 0-11 for current year, 0-2 for next year
                const currentYear = currentDate.getFullYear();
                const monthDate = index < 12 
                    ? new Date(currentYear, index, 1)
                    : new Date(currentYear + 1, index - 12, 1);
                const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
                
                return await this.generateMonthCapacityCell(member, monthKey);
            });
            
            // Wait for all month cells to be generated
            const monthCells = (await Promise.all(monthCellPromises)).join('');
            
            return `
                <tr class="capacity-overview-row" data-member="${member.id}">
                    <td class="fixed-col col-member resource-name">
                        <div class="resource-info">
                            <div class="resource-name-text">${memberName}</div>
                            <div class="resource-role">${memberRole}</div>
                        </div>
                    </td>
                    ${monthCells}
                </tr>
            `;
        });
        
        // Wait for all member rows to be generated
        const memberRows = (await Promise.all(memberRowsPromises)).join('');
        
        // Show message if no members match filter
        const noDataRow = filteredMembers.length === 0 ? `
            <tr>
                <td class="fixed-col col-member resource-name">No members match the selected filter</td>
                ${months.map(() => '<td class="capacity-month-cell"><span style="color: #666;">-</span></td>').join('')}
            </tr>
        ` : '';
        
        return `
            <table class="capacity-overview-table">
                <thead>
                    <tr>
                        <th class="fixed-col col-member">Resource</th>
                        ${monthHeaders}
                    </tr>
                </thead>
                <tbody>
                    ${memberRows}${noDataRow}
                </tbody>
            </table>
        `;
    }

    /**
     * Generate capacity cell for a specific member and month
     */
    // Generate capacity cell content based on business rules and filters
    generateCapacityCellContent(metrics, statusFilter) {
        const { approvedMDs, pendingMDs, totalMDs, approvedPercentage, pendingPercentage, totalPercentage } = metrics;
        
        // Apply business logic for showing/hiding subcells based on filter
        const showAll = statusFilter === 'all';
        const showOnlyApproved = statusFilter === 'approved';
        const showOnlyPending = statusFilter === 'pending';
        
        if (showAll) {
            // Show only total data in 2x1 grid for 'all' filter
            return `
                <div class="capacity-cell-grid grid-2x1">
                    <div class="capacity-subcell total">
                        <strong>${totalMDs}</strong>
                    </div>
                    <div class="capacity-subcell percentage total ${this.getPercentageColorClass(totalPercentage)}">
                        <strong>${totalPercentage}%</strong>
                    </div>
                </div>
            `;
        } else if (showOnlyApproved) {
            // Show only approved data in 2x1 grid
            return `
                <div class="capacity-cell-grid grid-2x1">
                    <div class="capacity-subcell approved">
                        ${approvedMDs}
                    </div>
                    <div class="capacity-subcell percentage approved ${this.getPercentageColorClass(approvedPercentage)}">
                        ${approvedPercentage}%
                    </div>
                </div>
            `;
        } else if (showOnlyPending) {
            // Show only pending data in 2x1 grid
            return `
                <div class="capacity-cell-grid grid-2x1">
                    <div class="capacity-subcell pending">
                        ${pendingMDs}
                    </div>
                    <div class="capacity-subcell percentage pending ${this.getPercentageColorClass(pendingPercentage)}">
                        ${pendingPercentage}%
                    </div>
                </div>
            `;
        }
    }

    // Helper method to determine color class based on percentage thresholds
    getPercentageColorClass(percentage) {
        if (percentage >= 90) return 'high-utilization';
        if (percentage >= 50) return 'medium-utilization';
        return 'low-utilization';
    }

    async generateMonthCapacityCell(member, monthKey) {
        // Get current overview status filter
        const overviewStatusFilter = document.getElementById('overview-status-filter');
        const statusFilterValue = overviewStatusFilter ? overviewStatusFilter.value : 'all';

        // Use data service to get capacity metrics
        const metrics = await this.calculateCapacityMetrics(member.id, monthKey, member.monthlyCapacity || 22);
        
        // Extract values from metrics for easier access
        const { approvedMDs, pendingMDs, totalMDs, approvedPercentage, pendingPercentage, totalPercentage, maxCapacity } = metrics;
        
        // Generate filtered grid content using business logic service
        const cellContent = this.generateCapacityCellContent(metrics, statusFilterValue);
        
        // Generate comprehensive tooltip information
        const tooltipText = `${member.firstName} ${member.lastName} - ${monthKey}: \nApproved: ${approvedMDs} MDs (${approvedPercentage}%)\nPending: ${pendingMDs} MDs (${pendingPercentage}%)\nTotal: ${totalMDs}/${maxCapacity} MDs (${totalPercentage}%)`;
        
        return `
            <td class="capacity-month-cell" 
                data-month="${monthKey}" 
                data-member="${member.id}"
                data-utilization="${totalPercentage}"
                data-approved="${approvedMDs}"
                data-pending="${pendingMDs}"
                title="${tooltipText}">
                ${cellContent}
            </td>
        `;
    }

    /**
     * Load project options for filters
     */
    loadProjectOptions() {
        const currentProject = this.app?.currentProject;
        const projectsFilter = document.getElementById('projects-filter');
        
        if (!projectsFilter) return;

        if (currentProject) {
            projectsFilter.innerHTML = `
                <option value="">All Projects</option>
                <option value="current">${currentProject.project?.name || 'Current Project'}</option>
            `;
        } else {
            projectsFilter.innerHTML = '<option value="">No Projects Available</option>';
        }
        
        console.log('Project options loaded for filters');
    }

    /**
     * Load team member options for filters
     */
    async loadTeamMemberOptions() {
        const teamMembers = await this.getRealTeamMembers();
        const teamFilter = document.getElementById('team-filter');
        
        if (!teamFilter) return;
        
        let options = '<option value="">All Team Members</option>';
        
        // Add individual team members only
        teamMembers.forEach(member => {
            options += `<option value="${member.id}">${member.firstName} ${member.lastName}</option>`;
        });
        
        teamFilter.innerHTML = options;

    }

    /**
     * Load vendor options for filters
     */
    async loadVendorOptions() {
        const teamMembers = await this.getRealTeamMembers();
        const vendorFilter = document.getElementById('vendor-filter');
        
        if (!vendorFilter) return;
        
        // Get unique vendors
        const vendors = [...new Set(teamMembers.map(m => m.vendor))];
        
        let options = '<option value="">All Vendors</option>';
        
        vendors.forEach(vendor => {
            const vendorValue = vendor.toLowerCase().replace(' ', '-');
            options += `<option value="${vendorValue}">${vendor}</option>`;
        });
        
        vendorFilter.innerHTML = options;

    }

    /**
     * Generate timeline months header
     */
    generateTimelineMonths() {
        const months = this.getTimelineMonths();
        return months.map(month => `<div class="month-cell">${month}</div>`).join('');
    }

    /**
     * Get timeline months based on current range
     * Modified to show all months of current year + 3 months of next year
     */
    getTimelineMonths() {
        const months = [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Add all months from January of current year to December of current year
        for (let month = 0; month < 12; month++) {
            const monthDate = new Date(currentYear, month, 1);
            const monthName = monthDate.toLocaleDateString('en', { month: 'short' });
            const year = monthDate.getFullYear();
            const displayYear = year !== currentDate.getFullYear() ? year.toString().slice(-2) : '';
            months.push(monthName + displayYear);
        }
        
        // Add first 3 months of next year
        for (let month = 0; month < 3; month++) {
            const monthDate = new Date(currentYear + 1, month, 1);
            const monthName = monthDate.toLocaleDateString('en', { month: 'short' });
            const year = monthDate.getFullYear();
            const displayYear = year.toString().slice(-2);
            months.push(monthName + displayYear);
        }
        
        return months;
    }

    /**
     * Get timeline range display text
     */
    getTimelineRangeDisplay() {
        const currentDate = new Date();
        const endMonth = parseInt(this.currentFilters.timeline) - 1;
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + endMonth, 1);
        
        const startText = currentDate.toLocaleDateString('en', { year: 'numeric', month: '2-digit' });
        const endText = endDate.toLocaleDateString('en', { year: 'numeric', month: '2-digit' });
        
        return `${startText} to ${endText}`;
    }

    /**
     * Apply current filters
     */
    async applyFilters() {

        // Get real team members for filtering
        const teamMembers = await this.getRealTeamMembers();
        
        // Get all capacity rows
        const capacityRows = document.querySelectorAll('.capacity-row');
        
        capacityRows.forEach(row => {
            let shouldShow = true;
            
            // Apply team filter (only by member ID now)
            if (this.currentFilters.team && this.currentFilters.team.trim() !== '') {
                if (this.currentFilters.team !== row.dataset.member) {
                    shouldShow = false;
                }
            }
            
            // Apply vendor filter
            if (this.currentFilters.vendor && this.currentFilters.vendor.trim() !== '') {
                const memberData = teamMembers.find(m => m.id === row.dataset.member);
                if (memberData) {
                    const memberVendor = memberData.vendor.toLowerCase().replace(' ', '-');
                    if (memberVendor !== this.currentFilters.vendor) {
                        shouldShow = false;
                    }
                }
            }
            
            // Apply project filter
            if (this.currentFilters.projects && this.currentFilters.projects.trim() !== '') {
                const projectName = row.dataset.project;
                if (this.currentFilters.projects === 'current' && !projectName.toLowerCase().includes('current')) {
                    shouldShow = false;
                }
            }
            
            // Apply status filter
            if (this.currentFilters.status && this.currentFilters.status !== 'all') {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge) {
                    const rowStatus = statusBadge.textContent.toLowerCase();
                    if (rowStatus !== this.currentFilters.status) {
                        shouldShow = false;
                    }
                }
            }
            
            // Show/hide row
            row.style.display = shouldShow ? '' : 'none';
        });

    }

    /**
     * Update timeline range
     */
    updateTimelineRange() {
        const timelineDisplay = document.getElementById('timeline-range-display');
        if (timelineDisplay) {
            timelineDisplay.textContent = this.getTimelineRangeDisplay();
        }

        // Regenerate timeline months
        const timelineMonths = document.querySelector('.timeline-months');
        if (timelineMonths) {
            timelineMonths.innerHTML = this.generateTimelineMonths();
        }

    }

    /**
     * Navigate timeline (previous/next)
     */
    navigateTimeline(direction) {

        // This would shift the timeline view
        // For now, just log the action
        NotificationManager.info(`Timeline navigation: ${direction > 0 ? 'Next' : 'Previous'} period`);
    }

    /**
     * Show add team member modal
     */
    showAddTeamMemberModal() {
        console.log('Show add team member modal');
        // This would open the team member modal
        // For now, just log the action
        NotificationManager.info('Add Team Member: Feature in development');
    }

    /**
     * Show add assignment modal
     */
    async showAddAssignmentModal() {
        console.log('Show add assignment modal');
        
        // Check if modal already exists
        let modal = document.getElementById('assignment-modal');
        if (!modal) {
            // Create the modal HTML
            modal = document.createElement('div');
            modal.id = 'assignment-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content assignment-modal-content">
                    <div class="modal-header">
                        <h3>Add Team Member Assignment</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="assignment-form">
                            <div class="form-group">
                                <label for="assignment-team-member">Team Member *</label>
                                <select id="assignment-team-member" name="teamMember" required>
                                    <option value="">Select Team Member</option>
                                </select>
                                <small class="field-info" id="member-role-info"></small>
                            </div>
                            <div class="form-group">
                                <label for="assignment-project">Project *</label>
                                <select id="assignment-project" name="project" required>
                                    <option value="">Select Project</option>
                                </select>
                            </div>
                            
                            <!-- Budget Tracking Section -->
                            <div class="budget-section" id="budget-section" style="display: none;">
                                <h4><i class="fas fa-chart-line"></i> Budget Overview</h4>
                                <div class="budget-summary">
                                    <div class="budget-item">
                                        <label>Total Final MDs:</label>
                                        <span id="total-final-mds" class="budget-value">-</span>
                                        <small id="budget-context"></small>
                                    </div>
                                    <div class="budget-item">
                                        <label>Total Allocated MDs:</label>
                                        <span id="total-allocated-mds" class="budget-value">0.0</span>
                                        <small>Sum of MDs allocated in phases below</small>
                                    </div>
                                    <div class="budget-item balance-item">
                                        <label>Balance:</label>
                                        <span id="budget-balance" class="budget-balance">-</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Phase Scheduling Section -->
                            <div class="phases-section" id="phases-section" style="display: none;">
                                <h4><i class="fas fa-calendar-alt"></i> Phase Scheduling</h4>
                                <div id="phases-list">
                                    <!-- Dynamic phase items will be inserted here -->
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="assignment-notes">Notes</label>
                                <textarea id="assignment-notes" name="notes" rows="3" maxlength="500"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                        <button type="submit" class="btn btn-primary" form="assignment-form" id="submit-assignment">Add Assignment</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Populate dropdowns
        await this.populateAssignmentModalDropdowns();
        
        // Setup event listeners for dynamic content
        this.setupAssignmentModalEventListeners();

        // Show modal
        modal.classList.add('active');

        // Setup form submission
        const form = document.getElementById('assignment-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddAssignment();
        });

        // Setup modal close handlers
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.resetAssignmentModal();
                modal.classList.remove('active');
            });
        });
    }

    /**
     * Setup assignment modal event listeners
     */
    setupAssignmentModalEventListeners() {
        const teamMemberSelect = document.getElementById('assignment-team-member');
        const projectSelect = document.getElementById('assignment-project');
        
        // Team member selection change
        teamMemberSelect.addEventListener('change', () => {
            this.handleTeamMemberSelectionChange();
        });
        
        // Project selection change  
        projectSelect.addEventListener('change', () => {
            this.handleProjectSelectionChange();
        });
    }
    
    /**
     * Reset assignment modal to initial state
     */
    resetAssignmentModal() {
        // Hide dynamic sections
        document.getElementById('budget-section').style.display = 'none';
        document.getElementById('phases-section').style.display = 'none';
        
        // Clear dynamic content
        document.getElementById('member-role-info').textContent = '';
        document.getElementById('total-final-mds').textContent = '-';
        document.getElementById('total-allocated-mds').textContent = '0.0';
        document.getElementById('budget-balance').textContent = '-';
        document.getElementById('budget-context').textContent = '';
        document.getElementById('phases-list').innerHTML = '';
        
        // Reset modal title and button text to default
        const modal = document.getElementById('assignment-modal');
        const title = modal?.querySelector('.modal-header h3');
        const submitBtn = modal?.querySelector('#submit-assignment');
        
        if (title) title.textContent = 'Add Team Member Assignment';
        if (submitBtn) submitBtn.textContent = 'Add Assignment';
        
        // Clear editing state
        if (modal?.dataset.editingAssignmentId) {
            delete modal.dataset.editingAssignmentId;
        }
        
        // Reset form
        document.getElementById('assignment-form').reset();
    }
    
    /**
     * Handle team member selection change
     */
    async handleTeamMemberSelectionChange() {
        const teamMemberSelect = document.getElementById('assignment-team-member');
        const memberRoleInfo = document.getElementById('member-role-info');
        
        if (!teamMemberSelect.value) {
            memberRoleInfo.textContent = '';
            this.updateBudgetSection();
            return;
        }

        // Get selected member data
        const teamMembers = await this.getRealTeamMembers();

        const selectedMember = teamMembers.find(m => m.id === teamMemberSelect.value);

        if (selectedMember) {

            const memberRole = this.getMemberRole(selectedMember);
            const vendorName = this.getVendorName(selectedMember);
            memberRoleInfo.textContent = `Role: ${memberRole}, Vendor: ${vendorName}`;
        } else {
            console.error('DEBUG: No member found with ID:', teamMemberSelect.value);

        }
        
        this.updateBudgetSection();
    }
    
    /**
     * Handle project selection change
     */
    async handleProjectSelectionChange() {
        const projectSelect = document.getElementById('assignment-project');
        
        if (!projectSelect.value) {
            document.getElementById('budget-section').style.display = 'none';
            document.getElementById('phases-section').style.display = 'none';
            return;
        }
        
        await this.loadProjectForAssignment(projectSelect.value);
    }
    
    /**
     * Load project data and populate phase scheduling
     */
    async loadProjectForAssignment(projectId) {
        try {
            // Get project data
            const projects = await this.getAvailableProjects();
            const project = projects.find(p => p.id === projectId);
            
            if (!project || !project.filePath) {
                throw new Error('Project data not found');
            }
            
            // Load complete project data
            const dataManager = this.app?.managers?.data || window.dataManager;
            const completeProjectData = await dataManager.loadProject(project.filePath);

            // NUOVO: Recupera calculationData dalla versione più recente se disponibile
            if (completeProjectData.versions && completeProjectData.versions.length > 0) {

                // Ordina le versioni per ID e prendi la più recente
                const sortedVersions = completeProjectData.versions.sort((a, b) => {
                    // Confronta gli ID delle versioni (es. "v1.0.0" vs "v1.1.0")
                    return b.id.localeCompare(a.id, undefined, { numeric: true });
                });
                
                const latestVersion = sortedVersions[0];

                // Usa i calculationData dalla versione più recente se disponibili
                if (latestVersion.projectSnapshot?.calculationData) {
                    completeProjectData.calculationData = latestVersion.projectSnapshot.calculationData;

                    console.log('  - Version calculationData.vendorCosts length:', 
                        latestVersion.projectSnapshot.calculationData.vendorCosts?.length || 0);
                } else {
                    console.log('  - Latest version has no calculationData in projectSnapshot');
                }
            } else {
                console.log('  - Project has no versions, will use direct calculationData or generate dynamically');
            }

            if (completeProjectData?.calculationData?.vendorCosts) {
                console.log('  - Available vendor costs in loaded project:');
                completeProjectData.calculationData.vendorCosts.forEach((cost, index) => {

                });
            } else {
                console.log('  - CRITICAL: calculationData missing, generating dynamically...');
                
                // CRITICAL FIX: Generate calculationData if missing
                // Temporarily set this project as current to trigger vendor costs calculation
                const originalCurrentProject = this.app.currentProject;
                this.app.currentProject = completeProjectData;
                
                try {
                    // Trigger vendor costs calculation
                    this.calculateVendorCosts();
                    
                    // Add the calculated vendorCosts to the project data
                    if (this.vendorCosts && this.vendorCosts.length > 0) {
                        completeProjectData.calculationData = {
                            vendorCosts: JSON.parse(JSON.stringify(this.vendorCosts)),
                            timestamp: new Date().toISOString()
                        };
                        console.log('  - Successfully generated calculationData with', completeProjectData.calculationData.vendorCosts.length, 'vendor costs');
                        console.log('  - Generated vendor costs:');
                        completeProjectData.calculationData.vendorCosts.forEach((cost, index) => {

                        });
                    } else {
                        console.warn('  - Failed to generate vendor costs - array is empty');
                    }
                } catch (error) {
                    console.error('  - Error generating vendor costs:', error);
                } finally {
                    // Restore original current project
                    this.app.currentProject = originalCurrentProject;
                }
            }
            
            // Show dynamic sections
            document.getElementById('budget-section').style.display = 'block';
            document.getElementById('phases-section').style.display = 'block';
            
            // Update budget section and phases - pass the project data correctly
            await this.updateBudgetSection(completeProjectData);
            await this.updatePhasesSection(completeProjectData);
            
        } catch (error) {
            console.error('Error loading project for assignment:', error);
            // Hide sections on error
            document.getElementById('budget-section').style.display = 'none';
            document.getElementById('phases-section').style.display = 'none';
        }
    }
    
    /**
     * Get vendor name for team member
     */
    getVendorName(teamMember) {

        if (!teamMember.vendorId) {
            console.log('Missing vendorId, returning Unknown');
            return 'Unknown';
        }
        
        // Use same alternative access paths as getMemberRole()
        let configManager = this.app?.managers?.configuration;
        
        if (!configManager) {
            console.log('Configuration manager not available, checking alternative sources...');
            
            // Try alternative access paths
            configManager = this.app?.managers?.config || 
                           window.app?.managers?.configuration ||
                           window.configManager;

            if (!configManager) {
                console.log('No configuration manager available, returning Unknown');
                return 'Unknown';
            }
        }

        // Check internal resources first
        if (teamMember.vendorType === 'internal') {

            const internalResource = configManager.globalConfig?.internalResources?.find(
                r => r.id === teamMember.vendorId
            );

            if (internalResource) {

                return internalResource.name;
            }
        } else {

            const supplier = configManager.globalConfig?.suppliers?.find(
                s => s.id === teamMember.vendorId
            );

            if (supplier) {

                return supplier.name;
            }
        }
        
        console.log('No matching vendor found, returning Unknown');
        return 'Unknown';
    }
    
    /**
     * Get vendor details (department, role, name, rate) for team member
     */
    getVendorDetails(teamMember) {
        if (!teamMember.vendorId) {
            return {
                department: 'Unknown',
                role: 'Unknown',
                name: 'Unknown',
                rate: 0
            };
        }
        
        // Use same alternative access paths as getVendorName()
        let configManager = this.app?.managers?.configuration;
        
        if (!configManager) {
            configManager = this.app?.managers?.config || 
                           window.app?.managers?.configuration ||
                           window.configManager;
            
            if (!configManager) {
                return {
                    department: 'Unknown',
                    role: 'Unknown', 
                    name: 'Unknown',
                    rate: 0
                };
            }
        }
        
        // Check internal resources first
        if (teamMember.vendorType === 'internal') {
            const internalResource = configManager.globalConfig?.internalResources?.find(
                r => r.id === teamMember.vendorId
            );
            if (internalResource) {
                return {
                    department: internalResource.department || 'Unknown',
                    role: internalResource.role || 'Unknown',
                    name: internalResource.name || 'Unknown',
                    rate: internalResource.realRate || 0
                };
            }
        } else {
            const supplier = configManager.globalConfig?.suppliers?.find(
                s => s.id === teamMember.vendorId
            );
            if (supplier) {
                return {
                    department: supplier.department || 'Unknown',
                    role: supplier.role || 'Unknown',
                    name: supplier.name || 'Unknown',
                    rate: supplier.realRate || 0
                };
            }
        }
        
        return {
            department: 'Unknown',
            role: 'Unknown',
            name: 'Unknown',
            rate: 0
        };
    }
    
    /**
     * Populate assignment modal dropdowns
     */
    async populateAssignmentModalDropdowns() {
        // Prevent multiple simultaneous calls
        if (this._populatingDropdowns) {
            console.log('Dropdown population already in progress, skipping...');
            return;
        }
        
        this._populatingDropdowns = true;
        console.log('Starting dropdown population...');
        
        try {
            // Populate team members
            const teamMemberSelect = document.getElementById('assignment-team-member');
            const projectSelect = document.getElementById('assignment-project');
            
            if (teamMemberSelect) {
                teamMemberSelect.innerHTML = '<option value="">Select Team Member</option>';
                
                // Use await instead of .then() to avoid race conditions
                const teamMembers = await this.getRealTeamMembers();
                if (Array.isArray(teamMembers) && teamMembers.length > 0) {
                    teamMembers.forEach(member => {
                        const option = document.createElement('option');
                        option.value = member.id;
                        
                        // Get vendor details for enhanced display
                        const vendorDetails = this.getVendorDetails(member);
                        
                        // Format: "Ioana-Simina Stoica - RO [G2] Developer (€352/day)"
                        option.textContent = `${member.firstName} ${member.lastName} - ${vendorDetails.department} [${vendorDetails.role}] ${vendorDetails.name} (€${vendorDetails.rate}/day)`;
                        teamMemberSelect.appendChild(option);
                    });
                } else {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No team members configured';
                    option.disabled = true;
                    teamMemberSelect.appendChild(option);
                }
            }

            // Populate projects
            if (projectSelect) {
                projectSelect.innerHTML = '<option value="">Select Project</option>';
                
                // Use await instead of .then() to avoid race conditions
                const projects = await this.getAvailableProjects();

                if (Array.isArray(projects) && projects.length > 0) {
                    projects.forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.id || project.code;
                        option.textContent = project.name || project.code;
                        projectSelect.appendChild(option);
                    });
                } else {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No projects available';
                    option.disabled = true;
                    projectSelect.appendChild(option);
                }
            }
            
        } catch (error) {
            console.error('Error populating dropdowns:', error);
            
            // Reset dropdowns to error state
            const teamMemberSelect = document.getElementById('assignment-team-member');
            const projectSelect = document.getElementById('assignment-project');
            
            if (teamMemberSelect) {
                teamMemberSelect.innerHTML = '<option value="">Error loading team members</option>';
            }
            if (projectSelect) {
                projectSelect.innerHTML = '<option value="">Error loading projects</option>';
            }
        } finally {
            // Always reset the flag when done
            this._populatingDropdowns = false;

        }
    }
    
    /**
     * Update budget tracking section
     */
    async updateBudgetSection(completeProject = null) {
        const teamMemberSelect = document.getElementById('assignment-team-member');
        const projectSelect = document.getElementById('assignment-project');
        
        if (!teamMemberSelect.value || !projectSelect.value || !completeProject) {
            document.getElementById('total-final-mds').textContent = '-';
            document.getElementById('budget-context').textContent = '';
            this.updateBudgetBalance();
            return;
        }
        
        try {
            // Get team member role and vendor
            const teamMembers = await this.getRealTeamMembers();

            const selectedMember = teamMembers.find(m => m.id === teamMemberSelect.value);
            
            if (!selectedMember) {
                console.error('  - CRITICAL: No team member found with ID:', teamMemberSelect.value);
                console.error('  - Available IDs are:', teamMembers.map(m => m.id));
                document.getElementById('total-final-mds').textContent = 'Error: Member not found';
                return;
            }

            const memberRole = this.getMemberRole(selectedMember);
            const vendorName = this.getVendorName(selectedMember);

            // Find matching vendor cost in project calculation data
            let finalMDs = 0;

            if (completeProject.calculationData?.vendorCosts) {
                console.log('  - Available vendor costs in project:');
                completeProject.calculationData.vendorCosts.forEach((cost, index) => {

                });
                
                console.log('  - Searching for match with:');

                const vendorCost = completeProject.calculationData.vendorCosts.find(cost => {
                    const vendorIdMatch = cost.vendorId === selectedMember.vendorId;
                    const roleMatch = cost.role === memberRole;

                    return vendorIdMatch && roleMatch;
                });

                if (vendorCost) {
                    finalMDs = vendorCost.finalMDs || 0;

                } else {
                    console.log('  - ISSUE: No matching vendor cost found!');

                    console.log('  - Available combinations:');
                    completeProject.calculationData.vendorCosts.forEach((cost, index) => {

                    });
                }
            } else {
                console.error('  - CRITICAL: No calculationData.vendorCosts found in project');
            }
            
            console.log('  - Final result: finalMDs =', finalMDs);

            document.getElementById('total-final-mds').textContent = `${finalMDs.toFixed(1)} MDs`;
            document.getElementById('budget-context').textContent = `Budget for ${vendorName} - ${memberRole} in this project`;
            
            this.updateBudgetBalance();
            
        } catch (error) {
            console.error('Error updating budget section:', error);
            document.getElementById('total-final-mds').textContent = 'Error';
            document.getElementById('budget-context').textContent = 'Unable to load budget data';
        }
    }
    
    /**
     * Update phases scheduling section
     */
    async updatePhasesSection(completeProject) {
        const teamMemberSelect = document.getElementById('assignment-team-member');
        const phasesListContainer = document.getElementById('phases-list');
        
        if (!teamMemberSelect.value) {
            phasesListContainer.innerHTML = '';
            return;
        }
        
        try {
            // Get team member role
            const teamMembers = await this.getRealTeamMembers();
            const selectedMember = teamMembers.find(m => m.id === teamMemberSelect.value);
            const memberRole = this.getMemberRole(selectedMember);
            
            // Get active phases (phases with manDays > 0 and effort for member role > 0)
            const phases = completeProject.phases || {};
            const activePhases = Object.entries(phases)
                .filter(([key, phase]) => {
                    if (key === 'selectedSuppliers') return false;
                    return (phase.manDays || 0) > 0 && (phase.effort?.[memberRole] || 0) > 0;
                })
                .map(([key, phase]) => ({
                    id: key,
                    name: this.getPhaseDisplayName(key),
                    ...phase
                }));
            
            if (activePhases.length === 0) {
                phasesListContainer.innerHTML = `
                    <div class="no-phases-message">
                        <i class="fas fa-info-circle"></i>
                        <span>No phases available for ${memberRole} role in this project</span>
                    </div>
                `;
                return;
            }
            
            // Generate phase items HTML
            const phaseItemsHTML = activePhases.map(phase => {
                const phaseMDs = this.calculatePhaseMDsForRole(phase, memberRole);
                return `
                    <div class="phase-item" data-phase-id="${phase.id}">
                        <div class="phase-header">
                            <h5><i class="fas fa-tasks"></i> ${phase.name}</h5>
                            <span class="phase-mds">${phaseMDs.toFixed(1)} MDs</span>
                        </div>
                        <div class="phase-dates">
                            <div class="form-group">
                                <label>Start Date *</label>
                                <input type="date" class="phase-start-date" data-phase-id="${phase.id}" required>
                            </div>
                            <div class="form-group">
                                <label>End Date *</label>
                                <input type="date" class="phase-end-date" data-phase-id="${phase.id}" required>
                            </div>
                            <div class="phase-stats">
                                <div class="stat-item">
                                    <label>Available MDs:</label>
                                    <span class="available-mds" data-phase-id="${phase.id}">-</span>
                                </div>
                                <div class="stat-item overflow-indicator" data-phase-id="${phase.id}" style="display: none;">
                                    <label>Overflow MDs:</label>
                                    <span class="overflow-amount" data-phase-id="${phase.id}">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            phasesListContainer.innerHTML = phaseItemsHTML;
            
            // Setup event listeners for phase date changes
            this.setupPhaseEventListeners();
            
        } catch (error) {
            console.error('Error updating phases section:', error);
            phasesListContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Error loading project phases</span>
                </div>
            `;
        }
    }
    
    /**
     * Calculate MDs for specific role in a phase
     */
    calculatePhaseMDsForRole(phase, memberRole) {
        const totalMDs = phase.manDays || 0;
        const effortPercentage = phase.effort?.[memberRole] || 0;
        return (totalMDs * effortPercentage) / 100;
    }
    
    /**
     * Get display name for phase
     */
    getPhaseDisplayName(phaseKey) {
        const phaseNames = {
            functionalAnalysis: 'Functional Analysis',
            technicalAnalysis: 'Technical Analysis', 
            development: 'Development',
            integrationTests: 'Integration Tests',
            uatTests: 'UAT Tests',
            consolidation: 'Consolidation',
            vapt: 'VAPT',
            postGoLive: 'Post Go-Live'
        };
        return phaseNames[phaseKey] || phaseKey;
    }
    
    /**
     * Setup event listeners for phase date inputs
     */
    setupPhaseEventListeners() {
        const phaseStartDates = document.querySelectorAll('.phase-start-date');
        const phaseEndDates = document.querySelectorAll('.phase-end-date');
        
        [...phaseStartDates, ...phaseEndDates].forEach(input => {
            input.addEventListener('change', (e) => {
                this.handlePhaseDateChange(e.target);
            });
        });
    }
    
    /**
     * Handle phase date change
     */
    handlePhaseDateChange(input) {
        const phaseId = input.dataset.phaseId;
        
        // Mark this input as user-modified to preserve manual changes
        input.dataset.userModified = 'true';
        
        // Check if this is a start date input
        const isStartDate = input.classList.contains('phase-start-date');
        
        // Find the index of this phase in the DOM
        const phaseItems = document.querySelectorAll('.phase-item');
        let phaseIndex = -1;
        
        for (let i = 0; i < phaseItems.length; i++) {
            if (phaseItems[i].dataset.phaseId === phaseId) {
                phaseIndex = i;
                break;
            }
        }
        
        if (phaseIndex === -1) {
            console.warn(`Could not find phase index for ${phaseId}`);
            // Fallback to original behavior
            this.calculatePhaseAvailability(phaseId);
            this.updateBudgetBalance();
            return;
        }
        
        if (isStartDate) {
            // Propagate dates to this and all subsequent phases
            this.propagateSequentialDates(phaseIndex, input);
        } else {
            // For end date changes, first recalculate current phase availability
            this.calculatePhaseAvailability(phaseId);
            
            // Then propagate to subsequent phases (starting from the next phase)
            if (phaseIndex + 1 < phaseItems.length) {
                // Pass the modified end date to start propagation from next phase
                const currentEndDateValue = input.value;
                if (currentEndDateValue) {
                    this.propagateSequentialDatesFromEndDate(phaseIndex + 1, new Date(currentEndDateValue));
                }
            } else {
                // If this is the last phase, just update budget balance
                this.updateBudgetBalance();
            }
        }
    }
    
    /**
     * Calculate available MDs and overflow for a phase
     */
    calculatePhaseAvailability(phaseId) {
        const startDateInput = document.querySelector(`[data-phase-id="${phaseId}"] .phase-start-date`);
        const endDateInput = document.querySelector(`[data-phase-id="${phaseId}"] .phase-end-date`);
        const availableMDsSpan = document.querySelector(`.available-mds[data-phase-id="${phaseId}"]`);
        const overflowIndicator = document.querySelector(`.overflow-indicator[data-phase-id="${phaseId}"]`);
        
        // Check if DOM elements exist before accessing their properties
        if (!startDateInput || !endDateInput || !availableMDsSpan || !overflowIndicator) {
            console.warn(`Missing DOM elements for phase ${phaseId}:`, {
                startDateInput: !!startDateInput,
                endDateInput: !!endDateInput,
                availableMDsSpan: !!availableMDsSpan,
                overflowIndicator: !!overflowIndicator
            });
            return;
        }
        
        if (!startDateInput.value || !endDateInput.value) {
            availableMDsSpan.textContent = '-';
            overflowIndicator.style.display = 'none';
            return;
        }
        
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        
        if (endDate <= startDate) {
            availableMDsSpan.textContent = 'Invalid dates';
            availableMDsSpan.className = 'available-mds error';
            overflowIndicator.style.display = 'none';
            return;
        }
        
        // Calculate working days between dates
        const workingDays = this.calculateWorkingDaysBetween(startDate, endDate);
        availableMDsSpan.textContent = `${workingDays} MDs`;
        availableMDsSpan.className = 'available-mds';
        
        // Get estimated MDs for this phase
        const phaseItem = document.querySelector(`[data-phase-id="${phaseId}"]`);
        if (!phaseItem) {
            console.warn(`Phase item not found for phaseId: ${phaseId}`);
            return;
        }
        
        const phaseMDsElement = phaseItem.querySelector('.phase-mds');
        if (!phaseMDsElement) {
            console.warn(`Phase MDs element not found for phaseId: ${phaseId}`);
            return;
        }
        
        const estimatedMDsText = phaseMDsElement.textContent;
        const estimatedMDs = parseFloat(estimatedMDsText);
        
        // Check for overflow
        const overflow = estimatedMDs - workingDays;
        if (overflow > 0) {
            overflowIndicator.style.display = 'flex';
            overflowIndicator.querySelector('.overflow-amount').textContent = `+${Math.round(overflow)} MDs`;
            overflowIndicator.className = 'stat-item overflow-indicator overflow-warning';
        } else {
            overflowIndicator.style.display = 'none';
        }
    }
    
    /**
     * Calculate working days between two dates
     */
    calculateWorkingDaysBetween(startDate, endDate) {
        let workingDays = 0;
        const currentDate = new Date(startDate);
        
        while (currentDate < endDate) {
            const dayOfWeek = currentDate.getDay();
            // Count Monday-Friday (1-5) as working days
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                workingDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return workingDays;
    }
    
    /**
     * Calculate end date from start date and required MDs (working days)
     * @param {Date|string} startDate - The start date
     * @param {number} requiredMDs - Number of working days (MDs) required
     * @param {string} country - Country code for holidays (default: 'IT')
     * @returns {Date} The calculated end date
     */
    calculateEndDateFromMDs(startDate, requiredMDs, country = 'IT') {
        if (requiredMDs <= 0) {
            return new Date(startDate);
        }
        
        const start = new Date(startDate);
        const holidays = this.getHolidays(start.getFullYear(), country);
        let workingDaysCount = 0;
        const currentDate = new Date(start);
        
        // We need to count working days until we reach requiredMDs
        while (workingDaysCount < requiredMDs) {
            const dayOfWeek = currentDate.getDay();
            const dateString = currentDate.toISOString().split('T')[0];
            
            // Count Monday-Friday (1-5) as working days, excluding holidays
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidays.includes(dateString)) {
                workingDaysCount++;
            }
            
            // If we haven't reached the required MDs, move to next day
            if (workingDaysCount < requiredMDs) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        return currentDate;
    }
    
    /**
     * Get next working day after a given date
     * @param {Date} date - The reference date
     * @param {string} country - Country code for holidays (default: 'IT')
     * @returns {Date} Next working day
     */
    getNextWorkingDay(date, country = 'IT') {
        const holidays = this.getHolidays(date.getFullYear(), country);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Keep advancing until we find a working day
        while (true) {
            const dayOfWeek = nextDay.getDay();
            const dateString = nextDay.toISOString().split('T')[0];
            
            // Check if it's a working day (Mon-Fri, not holiday)
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidays.includes(dateString)) {
                return nextDay;
            }
            
            nextDay.setDate(nextDay.getDate() + 1);
        }
    }
    
    /**
     * Propagate sequential dates to all phases starting from a given phase index
     * @param {number} startingPhaseIndex - Index of the phase to start propagation from
     * @param {HTMLElement} triggerInput - The input element that triggered the propagation (optional)
     */
    propagateSequentialDates(startingPhaseIndex, triggerInput = null) {
        const phaseItems = document.querySelectorAll('.phase-item');
        if (startingPhaseIndex >= phaseItems.length) {
            return;
        }
        
        let currentEndDate = null;
        
        // Process each phase from the starting index onwards
        for (let i = startingPhaseIndex; i < phaseItems.length; i++) {
            const phaseItem = phaseItems[i];
            const phaseId = phaseItem.dataset.phaseId;
            const startDateInput = phaseItem.querySelector('.phase-start-date');
            const endDateInput = phaseItem.querySelector('.phase-end-date');
            const phaseMDsElement = phaseItem.querySelector('.phase-mds');
            
            if (!startDateInput || !endDateInput || !phaseMDsElement) {
                continue;
            }
            
            const estimatedMDs = parseFloat(phaseMDsElement.textContent);
            
            if (i === startingPhaseIndex) {
                // For the starting phase, use its current start date (if available)
                const startDateValue = startDateInput.value;
                if (!startDateValue) {
                    break;
                }
                
                // Calculate end date for this phase
                const startDate = new Date(startDateValue);
                const endDate = this.calculateEndDateFromMDs(startDate, estimatedMDs);
                const endDateString = endDate.toISOString().split('T')[0];
                
                // Update end date input (only if not manually set by user)
                if (!endDateInput.dataset.userModified) {
                    endDateInput.value = endDateString;
                    endDateInput.dataset.autoPopulated = 'true';
                }
                
                currentEndDate = endDate;
                
            } else {
                // For subsequent phases, start date = next working day after previous phase end
                if (!currentEndDate) {
                    break;
                }
                
                const nextStartDate = this.getNextWorkingDay(currentEndDate);
                const startDateString = nextStartDate.toISOString().split('T')[0];
                
                // Calculate end date for this phase
                const endDate = this.calculateEndDateFromMDs(nextStartDate, estimatedMDs);
                const endDateString = endDate.toISOString().split('T')[0];
                
                // Update both start and end date inputs (only if not manually modified)
                if (!startDateInput.dataset.userModified) {
                    startDateInput.value = startDateString;
                    startDateInput.dataset.autoPopulated = 'true';
                }
                
                if (!endDateInput.dataset.userModified) {
                    endDateInput.value = endDateString;
                    endDateInput.dataset.autoPopulated = 'true';
                }
                
                currentEndDate = endDate;
            }
            
            // Trigger recalculation for this phase
            this.calculatePhaseAvailability(phaseId);
        }
        
        // Update overall budget balance
        this.updateBudgetBalance();
    }
    
    /**
     * Propagate sequential dates starting from a specific end date
     * @param {number} startingPhaseIndex - Index of the first phase to update
     * @param {Date} previousEndDate - End date of the previous phase
     */
    propagateSequentialDatesFromEndDate(startingPhaseIndex, previousEndDate) {
        const phaseItems = document.querySelectorAll('.phase-item');
        if (startingPhaseIndex >= phaseItems.length) {
            return;
        }
        
        let currentEndDate = previousEndDate;
        
        // Process each phase from the starting index onwards
        for (let i = startingPhaseIndex; i < phaseItems.length; i++) {
            const phaseItem = phaseItems[i];
            const phaseId = phaseItem.dataset.phaseId;
            const startDateInput = phaseItem.querySelector('.phase-start-date');
            const endDateInput = phaseItem.querySelector('.phase-end-date');
            const phaseMDsElement = phaseItem.querySelector('.phase-mds');
            
            if (!startDateInput || !endDateInput || !phaseMDsElement) {
                continue;
            }
            
            const estimatedMDs = parseFloat(phaseMDsElement.textContent);
            
            // Calculate start date as next working day after previous phase end
            const nextStartDate = this.getNextWorkingDay(currentEndDate);
            const startDateString = nextStartDate.toISOString().split('T')[0];
            
            // Calculate end date for this phase
            const endDate = this.calculateEndDateFromMDs(nextStartDate, estimatedMDs);
            const endDateString = endDate.toISOString().split('T')[0];
            
            // Update both start and end date inputs (only if not manually modified)
            if (!startDateInput.dataset.userModified) {
                startDateInput.value = startDateString;
                startDateInput.dataset.autoPopulated = 'true';
            }
            
            if (!endDateInput.dataset.userModified) {
                endDateInput.value = endDateString;
                endDateInput.dataset.autoPopulated = 'true';
            }
            
            currentEndDate = endDate;
            
            // Trigger recalculation for this phase
            this.calculatePhaseAvailability(phaseId);
        }
        
        // Update overall budget balance
        this.updateBudgetBalance();
    }
    
    /**
     * Update budget balance display
     */
    updateBudgetBalance() {
        const totalFinalMDsText = document.getElementById('total-final-mds').textContent;
        const balanceElement = document.getElementById('budget-balance');
        
        if (totalFinalMDsText === '-' || totalFinalMDsText === 'Error') {
            balanceElement.textContent = '-';
            balanceElement.className = 'budget-balance';
            return;
        }
        
        const totalFinalMDs = parseFloat(totalFinalMDsText);
        
        // Calculate total allocated MDs from all phases
        let totalAllocatedMDs = 0;
        document.querySelectorAll('.phase-item').forEach(phaseItem => {
            const phaseMDsText = phaseItem.querySelector('.phase-mds').textContent;
            const startDate = phaseItem.querySelector('.phase-start-date').value;
            const endDate = phaseItem.querySelector('.phase-end-date').value;
            
            // Only count phases with valid dates
            if (startDate && endDate) {
                const phaseMDs = parseFloat(phaseMDsText);
                totalAllocatedMDs += phaseMDs;
            }
        });
        
        document.getElementById('total-allocated-mds').textContent = `${totalAllocatedMDs.toFixed(1)} MDs`;
        
        const balance = totalFinalMDs - totalAllocatedMDs;
        
        if (balance >= 0) {
            balanceElement.textContent = `+${balance.toFixed(1)} MDs remaining`;
            balanceElement.className = 'budget-balance positive';
        } else {
            balanceElement.textContent = `${balance.toFixed(1)} MDs over budget`;
            balanceElement.className = 'budget-balance negative';
        }
    }

    /**
     * Handle add assignment form submission
     */
    async handleAddAssignment() {
        try {
            const form = document.getElementById('assignment-form');
            const modal = document.getElementById('assignment-modal');
            const formData = new FormData(form);
            
            const teamMemberId = formData.get('teamMember');
            const projectId = formData.get('project');
            const notes = formData.get('notes');
            
            // Check if we're editing an existing assignment
            const editingAssignmentId = modal?.dataset.editingAssignmentId;
            const isEditing = !!editingAssignmentId;
            
            // Validate selections
            if (!teamMemberId || !projectId) {
                NotificationManager.error('Please select both team member and project');
                return;
            }
            
            // Collect phase schedule data
            const phaseSchedule = this.collectPhaseScheduleData();
            if (phaseSchedule.length === 0) {
                NotificationManager.error('Please set dates for at least one phase');
                return;
            }
            
            // Validate phase dates
            const validation = this.validatePhaseSchedule(phaseSchedule);
            if (!validation.isValid) {
                NotificationManager.error(`Phase validation error: ${validation.error}`);
                return;
            }
            
            // Get team member and project data
            const teamMembers = await this.getRealTeamMembers();
            const projects = await this.getAvailableProjects();
            
            const teamMember = teamMembers.find(m => m.id === teamMemberId);
            const project = projects.find(p => p.id === projectId);
            
            if (!teamMember || !project) {
                NotificationManager.error('Invalid team member or project selection');
                return;
            }
            
            // Load complete project data
            const dataManager = this.app?.managers?.data || window.dataManager;
            if (!project.filePath) {
                throw new Error(`Project file path not available for project ${project.name || project.id}`);
            }
            const completeProject = await dataManager.loadProject(project.filePath);
            
            // Get budget info
            const budgetInfo = this.getBudgetInfo();
            
            // Calculate phase-based allocation
            const calculatedAllocation = await this.calculatePhaseBasedAllocation(teamMember, completeProject, phaseSchedule);
            
            // Initialize manual assignments array if it doesn't exist
            if (!this.manualAssignments) {
                this.manualAssignments = [];
            }
            
            if (isEditing) {
                // Update existing assignment
                const existingIndex = this.manualAssignments.findIndex(a => a.id === editingAssignmentId);
                if (existingIndex === -1) {
                    throw new Error('Assignment to edit not found');
                }
                
                const existingAssignment = this.manualAssignments[existingIndex];
                
                // Update assignment with new data
                const updatedAssignment = {
                    ...existingAssignment,
                    teamMemberId: teamMemberId,
                    projectId: projectId,
                    phaseSchedule: phaseSchedule,
                    budgetInfo: budgetInfo,
                    calculatedAllocation: calculatedAllocation,
                    notes: notes,
                    updated: new Date().toISOString()
                };
                
                this.manualAssignments[existingIndex] = updatedAssignment;

                // Check for overflows and show alerts
                const overflows = this.detectOverflows(phaseSchedule);
                if (overflows.length > 0) {
                    const overflowMessages = overflows.map(o => `${o.phaseName}: +${o.overflow.toFixed(1)} MDs`);
                    NotificationManager.warning(`Assignment updated with overflows: ${overflowMessages.join(', ')}`);
                } else {
                    NotificationManager.success('Assignment updated successfully');
                }
                
            } else {
                // Create new assignment
                const assignment = {
                    id: this.generateId('assignment-'),
                    teamMemberId: teamMemberId,
                    projectId: projectId,
                    status: 'approved',
                    phaseSchedule: phaseSchedule,
                    budgetInfo: budgetInfo,
                    calculatedAllocation: calculatedAllocation,
                    originalCalculatedAllocation: JSON.parse(JSON.stringify(calculatedAllocation)), // Save original for reset
                    notes: notes,
                    created: new Date().toISOString()
                };

                // Save assignment
                this.manualAssignments.push(assignment);

                // Check for overflows and show alerts
                const overflows = this.detectOverflows(phaseSchedule);
                if (overflows.length > 0) {
                    const overflowMessages = overflows.map(o => `${o.phaseName}: +${o.overflow.toFixed(1)} MDs`);
                    NotificationManager.warning(`Assignment created with overflows: ${overflowMessages.join(', ')}`);
                } else {
                    NotificationManager.success('Assignment created successfully');
                }
            }
            
            // Close modal and refresh
            this.resetAssignmentModal();
            
            // Clear editing state
            if (modal?.dataset.editingAssignmentId) {
                delete modal.dataset.editingAssignmentId;
            }
            
            document.getElementById('assignment-modal').classList.remove('active');
            
            await this.refreshAllCapacitySections();
            
        } catch (error) {
            console.error('Error handling assignment:', error);
            const isEditing = !!editingAssignmentId;
            NotificationManager.error(`Failed to ${isEditing ? 'update' : 'create'} assignment: ${error.message}`);
        }
    }
    
    /**
     * Collect phase schedule data from modal
     */
    collectPhaseScheduleData() {
        const phaseSchedule = [];
        
        document.querySelectorAll('.phase-item').forEach(phaseItem => {
            const phaseId = phaseItem.dataset.phaseId;
            const phaseName = phaseItem.querySelector('h5').textContent.replace(/^.*?\s/, '').trim();
            const startDate = phaseItem.querySelector('.phase-start-date').value;
            const endDate = phaseItem.querySelector('.phase-end-date').value;
            const estimatedMDsText = phaseItem.querySelector('.phase-mds').textContent;
            const estimatedMDs = parseFloat(estimatedMDsText);
            
            if (startDate && endDate) {
                const availableMDs = this.calculateWorkingDaysBetween(new Date(startDate), new Date(endDate));
                const overflow = Math.max(0, estimatedMDs - availableMDs);
                
                phaseSchedule.push({
                    phaseId,
                    phaseName,
                    startDate,
                    endDate,
                    estimatedMDs,
                    availableMDs,
                    overflow
                });
            }
        });
        
        return phaseSchedule;
    }
    
    /**
     * Validate phase schedule data
     */
    validatePhaseSchedule(phaseSchedule) {
        for (const phase of phaseSchedule) {
            const start = new Date(phase.startDate);
            const end = new Date(phase.endDate);
            
            if (end <= start) {
                return {
                    isValid: false,
                    error: `Invalid dates for ${phase.phaseName}: end date must be after start date`
                };
            }
        }
        
        return { isValid: true };
    }
    
    /**
     * Get budget information
     */
    getBudgetInfo() {
        const totalFinalMDsText = document.getElementById('total-final-mds').textContent;
        const totalAllocatedMDsText = document.getElementById('total-allocated-mds').textContent;
        const budgetBalanceText = document.getElementById('budget-balance').textContent;
        
        return {
            totalFinalMDs: totalFinalMDsText === '-' ? 0 : parseFloat(totalFinalMDsText),
            totalAllocatedMDs: parseFloat(totalAllocatedMDsText) || 0,
            balance: budgetBalanceText === '-' ? 0 : parseFloat(budgetBalanceText),
            isOverBudget: budgetBalanceText.includes('over budget')
        };
    }
    
    /**
     * Detect overflow phases
     */
    detectOverflows(phaseSchedule) {
        return phaseSchedule.filter(phase => phase.overflow > 0);
    }

    /**
     * Refresh all capacity sections after assignment changes
     */
    async refreshAllCapacitySections() {
        try {
            console.log('Refreshing all capacity sections after assignment change...');
            
            // Show loading state
            this.showCapacityLoadingState();
            
            // Refresh all major sections in parallel for better performance
            const refreshPromises = [];
            
            // Always refresh capacity table
            refreshPromises.push(this.loadCapacityTable());
            
            // Always refresh dashboard data (utilization, alerts, charts)
            refreshPromises.push(this.loadDashboardData());
            
            // Conditionally refresh overview if it exists and is visible
            if (document.getElementById('resource-overview-content')) {
                refreshPromises.push(this.loadOverviewData());
            }
            
            // Conditionally refresh timeline if it exists and is visible  
            if (document.getElementById('capacity-timeline-content')) {
                refreshPromises.push(this.renderCapacityTimeline());
            }
            
            // Wait for all refreshes to complete
            await Promise.all(refreshPromises);

            NotificationManager.success('Capacity views updated with new assignment');
            
        } catch (error) {
            console.error('Error refreshing capacity sections:', error);
            NotificationManager.error('Error updating capacity views');
        } finally {
            this.hideCapacityLoadingState();
        }
    }

    /**
     * Show loading state in capacity sections
     */
    showCapacityLoadingState() {
        const sections = [
            'capacity-content',
            'resource-overview-content', 
            'capacity-timeline-content',
            'capacity-table-body'
        ];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Add loading class
                element.classList.add('loading');
                
                // Add visual loading indicator if not already present
                if (!element.querySelector('.loading-indicator')) {
                    const loadingDiv = document.createElement('div');
                    loadingDiv.className = 'loading-indicator';
                    loadingDiv.innerHTML = `
                        <div class="spinner-overlay">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Updating capacity data...</span>
                        </div>
                    `;
                    element.style.position = 'relative';
                    element.appendChild(loadingDiv);
                }
            }
        });
    }
    
    /**
     * Hide loading state from capacity sections
     */
    hideCapacityLoadingState() {
        const sections = [
            'capacity-content',
            'resource-overview-content',
            'capacity-timeline-content', 
            'capacity-table-body'
        ];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Remove loading class
                element.classList.remove('loading');
                
                // Remove loading indicator
                const loadingIndicator = element.querySelector('.loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
            }
        });
    }

    /**
     * Calculate phase-based allocation for assignment
     */
    async calculatePhaseBasedAllocation(teamMember, completeProject, phaseSchedule) {
        try {

            const memberRole = this.getMemberRole(teamMember);

            const allocations = {};
            
            // Use the new auto-distribution algorithm for better allocation
            console.log('calculatePhaseBasedAllocation: autoDistribution available:', !!this.autoDistribution);
            console.log('calculatePhaseBasedAllocation: teamMember:', teamMember.id, teamMember.firstName, teamMember.lastName);
            console.log('calculatePhaseBasedAllocation: phaseSchedule:', phaseSchedule.length, 'phases');
            
            if (this.autoDistribution) {
                // Calculate total MDs for all phases
                const totalMDs = phaseSchedule.reduce((sum, phase) => sum + phase.estimatedMDs, 0);
                console.log('calculatePhaseBasedAllocation: totalMDs:', totalMDs);
                
                // Find the earliest start date and latest end date
                const startDate = new Date(Math.min(...phaseSchedule.map(p => new Date(p.startDate))));
                const endDate = new Date(Math.max(...phaseSchedule.map(p => new Date(p.endDate))));
                console.log('calculatePhaseBasedAllocation: date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
                
                try {
                    // Debug team member ID format
                    console.log('Auto-distribution: teamMember.id:', teamMember.id);
                    console.log('Auto-distribution: this.autoDistribution.teamManager available:', !!this.autoDistribution.teamManager);
                    
                    // Set current team member for the adapter
                    this._currentTeamMember = teamMember;
                    
                    // Use autoDistributeMDs for intelligent distribution
                    const autoDistribution = this.autoDistribution.autoDistributeMDs(
                        totalMDs,
                        startDate,
                        endDate,
                        teamMember.id
                    );
                    
                    console.log(`Auto-distribution for ${completeProject.project.name}:`, autoDistribution);
                    
                    // Convert autoDistribution format to expected allocations format
                    Object.keys(autoDistribution).forEach(month => {
                        // Skip metadata keys
                        if (['hasOverflow', 'overflowAmount'].includes(month)) {
                            return;
                        }
                        
                        const allocation = autoDistribution[month];
                        if (allocation && allocation.planned > 0) {
                            if (!allocations[month]) allocations[month] = {};
                            
                            allocations[month][completeProject.project.name] = {
                                days: allocation.planned,
                                status: completeProject.project.status || 'approved',
                                hasOverflow: false, // New algorithm prevents overflow
                                overflowAmount: 0,
                                phases: phaseSchedule.map(phase => ({
                                    phaseName: phase.phaseName,
                                    phaseDays: allocation.planned / phaseSchedule.length, // Simplified equal distribution
                                    hasOverflow: false,
                                    overflowAmount: 0
                                }))
                            };
                        }
                    });
                    
                } catch (error) {
                    console.warn('Auto-distribution failed, falling back to legacy method:', error);
                    // Fall back to legacy method below
                    this.useLegacyPhaseDistribution(phaseSchedule, allocations, completeProject);
                }
            } else {
                // Fall back to legacy method
                console.warn('Auto-distribution not available, falling back to legacy method');
                console.warn('Available autoDistribution instance:', !!this.autoDistribution);
                console.warn('AutoDistribution class available:', typeof AutoDistribution !== 'undefined');
                this.useLegacyPhaseDistribution(phaseSchedule, allocations, completeProject);
            }

            return allocations;
            
        } catch (error) {
            console.error('Error calculating phase-based allocation:', error);
            throw new Error(`Cannot create assignment: ${error.message}`);
        }
    }

    /**
     * Legacy phase distribution fallback method
     * Used when auto-distribution fails or is not available
     */
    useLegacyPhaseDistribution(phaseSchedule, allocations, completeProject) {
        console.log('Using legacy phase distribution method');
        
        try {
            // Simple fallback: distribute phases evenly across time period
            phaseSchedule.forEach(phase => {
                const phaseStartDate = new Date(phase.startDate);
                const phaseEndDate = new Date(phase.endDate);
                
                // Get months for this phase
                const phaseMonths = this.getMonthsBetween(phaseStartDate, phaseEndDate);
                const phaseMDs = phase.estimatedMDs;
                
                if (phaseMonths.length > 0 && phaseMDs > 0) {
                    const mdsPerMonth = Math.ceil(phaseMDs / phaseMonths.length);
                    
                    phaseMonths.forEach((month, index) => {
                        if (!allocations[month]) allocations[month] = {};
                        
                        // For last month, allocate remaining MDs
                        const isLastMonth = index === phaseMonths.length - 1;
                        const monthMDs = isLastMonth ? 
                            (phaseMDs - (mdsPerMonth * (phaseMonths.length - 1))) : 
                            mdsPerMonth;
                        
                        if (monthMDs > 0) {
                            if (!allocations[month][completeProject.project.name]) {
                                allocations[month][completeProject.project.name] = {
                                    days: 0,
                                    status: 'approved',
                                    hasOverflow: true, // Legacy method doesn't check capacity
                                    overflowAmount: 0,
                                    phases: []
                                };
                            }
                            
                            allocations[month][completeProject.project.name].days += monthMDs;
                            allocations[month][completeProject.project.name].phases.push({
                                phaseName: phase.phaseName,
                                phaseDays: monthMDs,
                                hasOverflow: true, // Legacy method may cause overflow
                                overflowAmount: 0
                            });
                        }
                    });
                }
            });
            
            console.log('Legacy distribution completed for', Object.keys(allocations).length, 'months');
            
        } catch (error) {
            console.error('Legacy phase distribution failed:', error);
            // Return empty allocations on failure
        }
    }

    /**
     * Get months between start and end date (helper for legacy method)
     * @param {Date} startDate Start date (inclusive)
     * @param {Date} endDate End date (exclusive)
     * @returns {Array} Array of month strings in YYYY-MM format
     */
    getMonthsBetween(startDate, endDate) {
        const months = [];
        const current = new Date(startDate);

        while (current < endDate) {
            const monthString = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
            months.push(monthString);
            current.setMonth(current.getMonth() + 1);
            
            // Stop if we've reached the end month
            const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
            const currentMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
            if (currentMonth === endMonth) {
                break;
            }
        }

        return months;
    }

    /**
     * Calculate allocation for a manual assignment (LEGACY - keeping for compatibility)
     */
    async calculateAssignmentAllocation(teamMember, project, startDate, endDate) {
        try {

            // Get member role for phase participation calculation
            const memberRole = this.getMemberRole(teamMember);

            // Use the complete project data that was already loaded and passed in
            const completeProjectData = project; // project is already the complete loaded data
            const completeProject = project.project;

            // Convert phases object to array if needed (phases are stored as object in JSON at root level)
            let phasesArray = [];

            if (completeProjectData.phases && typeof completeProjectData.phases === 'object' && !Array.isArray(completeProjectData.phases)) {
                console.log('Converting phases object to array...');
                const phaseKeys = Object.keys(completeProjectData.phases);

                const filteredKeys = phaseKeys.filter(key => key !== 'selectedSuppliers');

                phasesArray = filteredKeys.map(phaseKey => {
                    const phaseData = completeProjectData.phases[phaseKey];
                    console.log(`Processing phase ${phaseKey}:`, phaseData);
                    console.log(`Phase ${phaseKey} has manDays:`, phaseData && phaseData.manDays);
                    
                    if (phaseData && typeof phaseData === 'object' && phaseData.manDays !== undefined) {
                        const convertedPhase = {
                            id: phaseKey,
                            name: phaseKey,
                            ...phaseData
                        };
                        console.log(`Converted phase ${phaseKey}:`, convertedPhase);
                        return convertedPhase;
                    }

                    return null;
                }).filter(phase => phase !== null);

            } else if (Array.isArray(completeProjectData.phases)) {
                phasesArray = completeProjectData.phases;

            } else {
                console.warn('Project has no valid phases structure');
                console.warn('completeProjectData.phases value:', completeProjectData.phases);
                console.warn('Type:', typeof completeProjectData.phases);
            }
            
            console.log('Complete project structure:', {
                name: completeProject.name,
                code: completeProject.code,
                originalStartDate: completeProject.startDate,
                originalEndDate: completeProject.endDate,
                status: completeProject.status,
                phases: phasesArray.length,
                features: completeProject.features?.length || 0
            });
            
            // Create project with assignment dates but preserve all other properties
            const projectForCalculation = {
                ...completeProject,
                name: completeProject.name || 'Unnamed Project',
                startDate: startDate,
                endDate: endDate,
                status: (completeProject.status && completeProject.status.trim()) ? completeProject.status.trim() : 'approved',
                phases: phasesArray  // Use converted phases array
            };

            console.log('Validation checks:');

            console.log('Project for calculation:', {
                name: projectForCalculation.name,
                startDate: projectForCalculation.startDate,
                endDate: projectForCalculation.endDate,
                status: projectForCalculation.status,
                phases: projectForCalculation.phases?.length || 0,
                features: projectForCalculation.features?.length || 0
            });
            
            // Use existing sequential allocation logic with complete project data
            const allocations = this.generateSequentialAllocations(teamMember, memberRole, [projectForCalculation]);

            if (Object.keys(allocations).length === 0) {
                console.warn('No allocations generated - debugging project phases...');
                if (projectForCalculation.phases && projectForCalculation.phases.length > 0) {
                    console.log('Project has phases:', projectForCalculation.phases.map(p => ({
                        name: p.name,
                        manDays: p.manDays,
                        effort: p.effort
                    })));
                } else {
                    console.error('Project has no phases - this will result in empty allocations');
                }
            }
            
            return allocations;
            
        } catch (error) {
            console.error('Error calculating assignment allocation:', error);
            // No fallback - if we can't calculate properly, the operation should fail
            throw new Error(`Cannot create assignment: ${error.message}`);
        }
    }
    
    /**
     * Generate simple month-by-month allocation as fallback
     */
    generateSimpleAllocation(startDate, endDate) {
        const allocations = {};
        const start = new Date(startDate);
        const end = new Date(endDate);
        const defaultDaysPerMonth = 5; // Default allocation
        
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        
        while (current <= end) {
            const monthKey = current.toISOString().slice(0, 7);
            
            allocations[monthKey] = {
                days: defaultDaysPerMonth,
                status: 'approved',
                hasOverflow: false,
                overflowAmount: 0,
                phases: [{
                    phaseName: 'Manual Assignment',
                    phaseDays: defaultDaysPerMonth
                }]
            };
            
            current.setMonth(current.getMonth() + 1);
        }
        
        return allocations;
    }

    /**
     * Merge manual assignments with automatic allocations
     */
    mergeManualAssignments(member, automaticAllocations) {
        const mergedAllocations = { ...automaticAllocations };
        
        // Debug logging

        // If no manual assignments exist, return automatic allocations
        if (!this.manualAssignments || this.manualAssignments.length === 0) {
            console.log('No manual assignments found, returning automatic allocations only');
            return mergedAllocations;
        }
        
        // Find manual assignments for this member
        // Be careful to only match the correct team when assignment specifies a team
        const memberAssignments = this.manualAssignments.filter(assignment => {
            // Direct match with full unique ID - this is the primary matching mechanism
            if (assignment.teamMemberId === member.id) {

                return true;
            }
            
            // Check if this member has consolidatedFrom IDs (happens after consolidation)
            if (member.consolidatedFrom && member.consolidatedFrom.length > 0) {
                // Check if assignment matches any of the original IDs
                const matchesConsolidatedId = member.consolidatedFrom.some(originalId => 
                    assignment.teamMemberId === originalId
                );
                if (matchesConsolidatedId) {

                    return true;
                }
            }
            
            // Legacy support: assignments without team prefix can match any team with that member
            if (!assignment.teamMemberId.includes(':')) {
                const baseMemberId = member.id.includes(':') 
                    ? member.id.split(':')[1] 
                    : member.id;
                    
                if (assignment.teamMemberId === baseMemberId) {

                    return true;
                }
            }
            
            return false;
        });

        memberAssignments.forEach(assignment => {

            const calculatedAllocation = assignment.calculatedAllocation;

            // Merge each month's allocation
            Object.entries(calculatedAllocation).forEach(([monthKey, monthAllocationData]) => {
                if (!mergedAllocations[monthKey]) {
                    mergedAllocations[monthKey] = {};
                }
                
                // Get project name
                const projectName = this.getProjectNameById(assignment.projectId);

                
                // Check if monthAllocationData already has the project as a key (nested structure)
                // This happens when calculatedAllocation already has the structure: month -> project -> data
                if (monthAllocationData[projectName]) {
                    // The allocation data is already nested with project name
                    const projectData = monthAllocationData[projectName];
                    
                    if (mergedAllocations[monthKey][projectName]) {
                        // If project already exists, add to existing allocation
                        mergedAllocations[monthKey][projectName].days += projectData.days;
                        if (projectData.phases) {
                            mergedAllocations[monthKey][projectName].phases.push(...projectData.phases);
                        }
                    } else {
                        // Create new allocation entry
                        mergedAllocations[monthKey][projectName] = {
                            ...projectData,
                            isManual: true // Flag to identify manual assignments
                        };
                    }
                } else {
                    // The allocation data is flat (directly contains days, status, etc.)
                    // This is the expected structure from phase-based calculations
                    if (mergedAllocations[monthKey][projectName]) {
                        // If project already exists, add to existing allocation
                        mergedAllocations[monthKey][projectName].days += (monthAllocationData.days || 0);
                        if (monthAllocationData.phases) {
                            mergedAllocations[monthKey][projectName].phases.push(...monthAllocationData.phases);
                        }
                    } else {
                        // Create new allocation entry
                        mergedAllocations[monthKey][projectName] = {
                            ...monthAllocationData,
                            isManual: true // Flag to identify manual assignments
                        };
                    }
                }
            });
        });
        
        console.log(`Merged allocations result:`, Object.keys(mergedAllocations).length, 'months with allocations');
        
        return mergedAllocations;
    }
    
    /**
     * Get project name by ID
     */
    getProjectNameById(projectId) {
        // Try to find in loaded projects (now using transformed structure)
        if (this.cachedProjects) {
            const project = this.cachedProjects.find(p => p.id === projectId);
            if (project) {
                const projectName = project.name || project.code;

                return projectName;
            }
        }
        
        // Fallback to generic name

        return `Project ${projectId}`;
    }

    /**
     * Get available projects for assignment
     */
    async getAvailableProjects() {
        try {
            console.log('Loading available projects...');
            
            // Try to get projects from DataManager
            const dataManager = this.app?.managers?.data || window.dataManager;
            if (!dataManager) {
                console.warn('DataManager not available');
                return [];
            }
            
            const projects = await dataManager.listProjects() || [];
            console.log(`Found ${projects.length} projects:`, projects.map(p => p.project?.name || p.project?.code));
            
            const availableProjects = projects.filter(projectItem => {
                // Extract the actual project object from listProjects() structure
                const project = projectItem.project;
                return project && (project.name || project.code);
            }).map(projectItem => ({
                id: projectItem.project.id,
                code: projectItem.project.code,
                name: projectItem.project.name,
                description: projectItem.project.description,
                version: projectItem.project.version,
                filePath: projectItem.filePath,
                fileName: projectItem.fileName
            }));

            // Cache projects for lookup in manual assignments (use transformed structure for consistency)
            this.cachedProjects = availableProjects;
            
            // Return only real projects, no mock fallback
            if (availableProjects.length === 0) {
                console.log('No projects found in configured directory - returning empty list');
                return [];
            }
            
            return availableProjects;
        } catch (error) {
            console.error('Error getting available projects:', error);
            return [];
        }
    }

    /**
     * Get project object by name
     */
    getProjectByName(projectName) {
        if (!this.cachedProjects) {
            return null;
        }
        return this.cachedProjects.find(project => 
            project.name === projectName || project.code === projectName
        );
    }

    /**
     * Find assignment for a specific member and project combination
     */
    findAssignmentForMemberAndProject(memberId, projectId) {
        if (!this.manualAssignments || this.manualAssignments.length === 0) {
            return null;
        }
        
        // Direct match
        let assignment = this.manualAssignments.find(a => 
            a.teamMemberId === memberId && a.projectId === projectId
        );
        
        if (assignment) {
            return assignment;
        }
        
        // Check consolidated IDs - members might be consolidated from different teams
        // Look for assignments that match any consolidated source ID
        return this.manualAssignments.find(a => {
            if (a.projectId !== projectId) {
                return false;
            }
            
            // If the member has been consolidated, check all original team IDs
            // memberId format: "member-fullstack-1" (consolidated)
            // assignment.teamMemberId format: "team-fullstack-avg:member-fullstack-1" (original)
            
            // Extract base member ID
            const baseMemberId = memberId.includes(':') ? memberId.split(':')[1] : memberId;
            
            // Check if assignment's teamMemberId contains this base ID
            if (a.teamMemberId.includes(':')) {
                const assignmentBaseMemberId = a.teamMemberId.split(':')[1];
                return assignmentBaseMemberId === baseMemberId;
            } else {
                return a.teamMemberId === baseMemberId;
            }
        });
    }

    /**
     * Show edit assignment modal with pre-filled data
     */
    async showEditAssignmentModal(assignmentId) {

        // Find the assignment to edit
        const assignment = this.manualAssignments.find(a => a.id === assignmentId);
        if (!assignment) {
            NotificationManager.error('Assignment not found');
            return;
        }
        
        // Show the add assignment modal first
        await this.showAddAssignmentModal();
        
        // Change modal title and button text
        const modal = document.getElementById('assignment-modal');
        const title = modal.querySelector('.modal-header h3');
        const submitBtn = modal.querySelector('#submit-assignment');
        
        if (title) title.textContent = 'Edit Team Member Assignment';
        if (submitBtn) submitBtn.textContent = 'Update Assignment';
        
        // Pre-fill form data
        this.populateAssignmentModalWithData(assignment);
        
        // Store assignment ID for update
        modal.dataset.editingAssignmentId = assignmentId;
    }

    /**
     * Populate assignment modal with existing assignment data
     */
    populateAssignmentModalWithData(assignment) {
        // Fill team member dropdown
        const teamMemberSelect = document.getElementById('assignment-team-member');
        if (teamMemberSelect) {
            teamMemberSelect.value = assignment.teamMemberId;
            // Trigger change event to update member info
            teamMemberSelect.dispatchEvent(new Event('change'));
        }
        
        // Fill project dropdown  
        const projectSelect = document.getElementById('assignment-project');
        if (projectSelect) {
            projectSelect.value = assignment.projectId;
            // Trigger change event to load project phases
            projectSelect.dispatchEvent(new Event('change'));
        }
        
        // Fill notes
        const notesTextarea = document.getElementById('assignment-notes');
        if (notesTextarea) {
            notesTextarea.value = assignment.notes || '';
        }
        
        // Wait for phase schedule to be populated, then fill it
        setTimeout(() => {
            this.populatePhaseScheduleData(assignment.phaseSchedule);
        }, 500);
    }

    /**
     * Populate phase schedule data
     */
    populatePhaseScheduleData(phaseSchedule) {
        phaseSchedule.forEach(phase => {
            // Fill start date
            const startDateInput = document.querySelector(`[data-phase-id="${phase.phaseId}"] .phase-start-date`);
            if (startDateInput) {
                startDateInput.value = phase.startDate;
            }
            
            // Fill end date
            const endDateInput = document.querySelector(`[data-phase-id="${phase.phaseId}"] .phase-end-date`);
            if (endDateInput) {
                endDateInput.value = phase.endDate;
            }
            
            // Calculate availability and overflow for this phase
            this.calculatePhaseAvailability(phase.phaseId);
        });
        
        // Trigger recalculation
        this.updateBudgetBalance();
    }

    /**
     * Duplicate assignment
     */
    async duplicateAssignment(assignmentId) {

        const assignment = this.manualAssignments.find(a => a.id === assignmentId);
        if (!assignment) {
            NotificationManager.error('Assignment not found');
            return;
        }
        
        try {
            // Create duplicated assignment with new ID
            const duplicatedAssignment = {
                ...assignment,
                id: this.generateId('assignment-'),
                created: new Date().toISOString(),
                notes: (assignment.notes || '') + ' (Copy)'
            };
            
            // Add to manual assignments
            if (!this.manualAssignments) {
                this.manualAssignments = [];
            }
            this.manualAssignments.push(duplicatedAssignment);

            NotificationManager.success('Assignment duplicated successfully');
            
            // Refresh the table
            await this.refreshAllCapacitySections();
            
        } catch (error) {
            console.error('Error duplicating assignment:', error);
            NotificationManager.error(`Failed to duplicate assignment: ${error.message}`);
        }
    }

    /**
     * Delete assignment
     */
    async deleteAssignment(assignmentId) {
        // Reset stuck flag after 5 seconds (failsafe)
        if (this.deletingAssignment && this.deleteStartTime && (Date.now() - this.deleteStartTime > 5000)) {
            console.log(`Resetting stuck delete flag for assignment: ${this.deletingAssignment}`);
            this.deletingAssignment = null;
            this.deleteStartTime = null;
        }
        
        // Prevent duplicate calls by checking if deletion is already in progress
        if (this.deletingAssignment === assignmentId) {
            console.log(`Delete operation already in progress for assignment: ${assignmentId}`);
            return;
        }
        
        // Set flag to prevent duplicate calls
        this.deletingAssignment = assignmentId;
        this.deleteStartTime = Date.now();
        
        try {
            const assignment = this.manualAssignments?.find(a => a.id === assignmentId);
            if (!assignment) {
                NotificationManager.error('Assignment not found');
                return;
            }
        
            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to delete this assignment?\n\nTeam Member: ${assignment.teamMemberId}\nProject: ${assignment.projectId}`);
            if (!confirmed) {
                return;
            }
            
            // Remove from manual assignments array
            const index = this.manualAssignments.findIndex(a => a.id === assignmentId);
            if (index > -1) {
                this.manualAssignments.splice(index, 1);
                NotificationManager.success('Assignment deleted successfully');
                
                // Refresh the table
                await this.refreshAllCapacitySections();
            } else {
                NotificationManager.error('Assignment not found in array');
            }
            
        } catch (error) {
            console.error('Error deleting assignment:', error);
            NotificationManager.error(`Failed to delete assignment: ${error.message}`);
        } finally {
            // Always clear the deletion flag
            this.deletingAssignment = null;
            this.deleteStartTime = null;
        }
    }

    /**
     * Generate unique ID
     */
    generateId(prefix = 'id-') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Edit team member
     */
    editTeamMember(memberId) {

        // This would open the edit team member modal
        NotificationManager.info(`Edit Team Member ${memberId}: Feature in development`);
    }

    /**
     * Edit assignment
     */
    editAssignment(assignmentId) {

        NotificationManager.info(`Edit Assignment ${assignmentId}: Feature in development`);
    }

    /**
     * Approve assignment
     */
    approveAssignment(assignmentId) {

        NotificationManager.success(`Assignment ${assignmentId} approved!`);
        
        // Update the assignment status in the UI
        const assignmentCard = document.querySelector(`[data-assignment-id="${assignmentId}"]`);
        if (assignmentCard) {
            assignmentCard.classList.remove('pending');
            assignmentCard.classList.add('approved');
            
            const statusBadge = assignmentCard.querySelector('.status-badge');
            if (statusBadge) {
                statusBadge.textContent = 'APPROVED';
                statusBadge.classList.remove('pending');
                statusBadge.classList.add('approved');
            }
            
            // Update the header icon
            const headerIcon = assignmentCard.querySelector('h3');
            if (headerIcon) {
                headerIcon.innerHTML = headerIcon.innerHTML.replace('🟡', '✅');
            }
            
            // Update action buttons
            const actionsDiv = assignmentCard.querySelector('.assignment-actions');
            const assignmentInfo = assignmentCard.querySelector('.assignment-info h3').textContent;
            const projectName = assignmentInfo.replace('🟡 ', '').replace('✅ ', '');
            
            if (actionsDiv) {
                actionsDiv.innerHTML = `
                    <button class="btn-secondary" onclick="window.capacityManager?.editAssignment('${assignmentId}')">Edit</button>
                    <button class="btn-secondary" onclick="window.capacityManager?.viewAssignmentDetails('${assignmentId}')">Details</button>
                `;
            }
        }
    }

    /**
     * View assignment details
     */
    viewAssignmentDetails(assignmentId) {

        NotificationManager.info(`View Assignment Details ${assignmentId}: Feature in development`);
    }

    /**
     * View team member details
     */
    viewMemberDetails(memberId) {

        // This would show detailed member information
        NotificationManager.info(`View Member Details ${memberId}: Feature in development`);
    }

    /**
     * Initialize capacity panel event listeners
     */
    initializeCapacityPanelEventListeners() {
        // Prevent multiple event listener attachments
        if (this.capacityEventListenersInitialized) {

            return;
        }
        
        // Save button with debounce
        let saveInProgress = false;
        const saveBtn = document.getElementById('capacity-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (saveInProgress) return;
                saveInProgress = true;
                try {
                    await this.saveCapacityData();
                } finally {
                    saveInProgress = false;
                }
            });
        }

        // Load button
        const loadBtn = document.getElementById('capacity-load-btn');
        const fileInput = document.getElementById('capacity-file-input');
        if (loadBtn && fileInput) {
            loadBtn.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    await this.loadCapacityDataFromFile(file);
                    // Reset file input
                    event.target.value = '';
                }
            });
        }
        
        // Mark as initialized
        this.capacityEventListenersInitialized = true;

    }

    /**
     * Generate unique capacity ID for this planning session
     */
    generateCapacityId() {
        if (!this.capacityId) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '').replace('T', '-');
            this.capacityId = `capacity-${timestamp}`;
        }
        return this.capacityId;
    }

    /**
     * Get or create capacity name and description
     */
    getCapacityMetadata() {
        const capacityId = this.generateCapacityId();
        const now = new Date();
        const defaultName = `Capacity Planning - ${now.toLocaleDateString()}`;
        const defaultDescription = `Capacity planning session created on ${now.toLocaleString()}`;

        return {
            capacityId,
            capacityName: this.capacityName || defaultName,
            capacityDescription: this.capacityDescription || defaultDescription
        };
    }

    /**
     * Collect all capacity data for saving/export
     */
    async collectCapacityData() {
        try {
            console.log('Collecting capacity data...');

            // Get current data
            const teamMembers = await this.getRealTeamMembers();
            const projects = await this.getAvailableProjects();
            const timelineData = this.getTimelineMonths();
            // Get utilization and alerts data with proper error handling
            let utilizationData = {};
            let alerts = [];
            
            try {
                utilizationData = await this.calculateRealUtilizationData() || {};
            } catch (error) {
                console.warn('Error calculating utilization data:', error);
                utilizationData = {};
            }
            
            try {
                alerts = await this.generateRealAlerts() || [];
                // Ensure alerts is always an array
                if (!Array.isArray(alerts)) alerts = [];
            } catch (error) {
                console.warn('Error generating alerts:', error);
                alerts = [];
            }

            const capacityMetadata = this.getCapacityMetadata();
            
            const capacityData = {
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    capacityId: capacityMetadata.capacityId,
                    capacityName: capacityMetadata.capacityName,
                    capacityDescription: capacityMetadata.capacityDescription
                },
                teamMembers: teamMembers || [],
                projects: projects || [],
                timeline: timelineData || {},
                utilization: utilizationData || {},
                alerts: alerts || [],
                filters: this.currentFilters || {},
                manualAssignments: this.manualAssignments || []
            };

            return capacityData;

        } catch (error) {
            console.error('Error collecting capacity data:', error);
            throw error;
        }
    }

    /**
     * Save capacity data to fixed file
     */
    async saveCapacityData() {
        try {
            console.log('Saving capacity data...');
            
            // Show loading state
            const saveBtn = document.getElementById('capacity-save-btn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }

            // Collect data
            const capacityData = await this.collectCapacityData();

            // Try to save in /capacity folder, fallback to download
            const capacityMetadata = this.getCapacityMetadata();
            const filename = `${capacityMetadata.capacityId}.json`;
            
            // Try to save directly to /capacity folder using DataManager
            try {
                const dataManager = this.app?.managers?.data || window.dataManager;
                if (dataManager) {
                    const projectsPath = await dataManager.getProjectsPath();
                    const capacityDir = `${projectsPath}/capacity`;
                    const filePath = `${capacityDir}/${filename}`;
                    
                    // Create directory if it doesn't exist
                    if (window.electronAPI && window.electronAPI.ensureDirectory) {
                        await window.electronAPI.ensureDirectory(capacityDir);
                    }
                    
                    // Try to save file directly
                    if (window.electronAPI && window.electronAPI.saveFile) {
                        await window.electronAPI.saveFile(filePath, JSON.stringify(capacityData));

                        NotificationManager.success(`Capacity data saved to /capacity/${filename}`);
                        return; // Success, exit early
                    }
                }
            } catch (error) {
                console.warn('Could not save to /capacity folder, falling back to download:', error);
            }
            
            // Fallback: browser download with instructive filename
            const downloadFilename = `SAVE-TO-CAPACITY-FOLDER-${filename}`;
            const blob = new Blob([JSON.stringify(capacityData)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            NotificationManager.info(`Capacity data downloaded as ${downloadFilename}. Please save it in your projects/capacity folder.`);

        } catch (error) {
            console.error('Failed to save capacity data:', error);
            NotificationManager.error(`Failed to save capacity data: ${error.message}`);
        } finally {
            // Reset button state
            const saveBtn = document.getElementById('capacity-save-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            }
        }
    }

    /**
     * Load saved capacity data (placeholder - users should load manually via file input)
     */
    async loadCapacityData() {
        try {
            console.log('Loading capacity data...');
            // Since we save as downloads, there's no fixed location to auto-load from
            console.log('No existing capacity data file found - this is normal for first use');
            return null;
        } catch (error) {
            console.warn('Failed to load capacity data:', error);
            return null;
        }
    }

    /**
     * Load capacity data from fixed file
     */
    async loadCapacityData() {
        try {
            console.log('Loading capacity data...');

            // Get projects path
            const dataManager = this.app?.managers?.data || window.dataManager;
            if (!dataManager) {
                console.warn('Data manager not available for loading capacity data');
                return null;
            }

            const projectsPath = await dataManager.getProjectsPath();
            const capacityFilePath = `${projectsPath}/capacity/capacity-planning.json`;

            // Try to load from file using DataManager
            const result = await dataManager.persistenceStrategy.loadProject(capacityFilePath);

            if (result.success && result.data) {
                const capacityData = JSON.parse(result.data);
                console.log('Capacity data loaded successfully:', {
                    timestamp: capacityData.metadata?.timestamp,
                    teamMembers: capacityData.teamMembers?.length || 0,
                    projects: capacityData.projects?.length || 0
                });

                // Apply loaded filters if available
                if (capacityData.filters) {
                    this.currentFilters = { ...this.currentFilters, ...capacityData.filters };
                }

                NotificationManager.success('Capacity data loaded successfully');
                return capacityData;

            } else {
                console.log('No existing capacity data file found - this is normal for first use');
                return null;
            }

        } catch (error) {
            console.warn('Could not load capacity data (this is normal for first use):', error.message);
            return null;
        }
    }

    /**
     * Export capacity data as download
     */
    async exportCapacityData() {
        try {
            console.log('Exporting capacity data...');
            
            // Show loading state
            const exportBtn = document.getElementById('capacity-export-btn');
            if (exportBtn) {
                exportBtn.disabled = true;
                exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            }

            // Collect data
            const capacityData = await this.collectCapacityData();

            // Create filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
            const filename = `capacity-planning-export-${timestamp}.json`;

            // Trigger download
            const blob = new Blob([JSON.stringify(capacityData)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            NotificationManager.success(`Capacity data exported as ${filename}`);

        } catch (error) {
            console.error('Failed to export capacity data:', error);
            NotificationManager.error(`Failed to export capacity data: ${error.message}`);
        } finally {
            // Reset button state
            const exportBtn = document.getElementById('capacity-export-btn');
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fas fa-download"></i> Export';
            }
        }
    }

    /**
     * Load capacity data from selected file
     */
    async loadCapacityDataFromFile(file) {
        try {

            // Show loading state
            const loadBtn = document.getElementById('capacity-load-btn');
            if (loadBtn) {
                loadBtn.disabled = true;
                loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            }

            // Read file content
            const text = await file.text();

            let capacityData;
            try {
                capacityData = JSON.parse(text);
                
                // Handle double-stringified JSON (common issue)
                if (typeof capacityData === 'string') {
                    console.log('Detected double-stringified JSON, parsing again...');
                    capacityData = JSON.parse(capacityData);
                }
            } catch (parseError) {
                console.error('JSON parse error:', parseError);

                throw new Error(`Invalid JSON format: ${parseError.message}`);
            }

            console.log('Parsed capacity data structure:', {
                hasMetadata: !!capacityData.metadata,
                hasTeamMembers: !!capacityData.teamMembers,
                hasProjects: !!capacityData.projects,
                metadataKeys: capacityData.metadata ? Object.keys(capacityData.metadata) : [],
                teamMembersLength: capacityData.teamMembers?.length,
                projectsLength: capacityData.projects?.length
            });

            // Validate the loaded data has expected structure
            if (!capacityData.metadata || !capacityData.teamMembers || !capacityData.projects) {
                throw new Error('Invalid capacity data file format - missing required fields');
            }
            
            // Validate capacity-specific metadata
            if (!capacityData.metadata.capacityId) {
                throw new Error('Invalid capacity data: missing capacityId');
            }

            // Apply the loaded data to current session

            // Store loaded data and adopt its identity for this session
            this.loadedCapacityData = capacityData;
            this.capacityId = capacityData.metadata.capacityId;
            this.capacityName = capacityData.metadata.capacityName;
            this.capacityDescription = capacityData.metadata.capacityDescription;
            this.manualAssignments = capacityData.manualAssignments || [];
            
            NotificationManager.success(`Capacity data loaded from ${file.name}`);
            
            // Refresh all capacity sections to show loaded data immediately
            console.log('Refreshing all capacity sections after file load...');
            await this.refreshAllCapacitySections();

        } catch (error) {
            console.error('Failed to load capacity data from file:', error);
            NotificationManager.error(`Failed to load capacity data: ${error.message}`);
        } finally {
            // Reset button state
            const loadBtn = document.getElementById('capacity-load-btn');
            if (loadBtn) {
                loadBtn.disabled = false;
                loadBtn.innerHTML = '<i class="fas fa-upload"></i> Load';
            }
        }
    }

    /**
     * Auto-load capacity data on initialization (non-blocking)
     */
    autoLoadCapacityData() {
        // Use setTimeout to avoid blocking initialization
        setTimeout(async () => {
            try {
                await this.loadCapacityData();
            } catch (error) {

            }
        }, 1000); // Delay to ensure other components are initialized
    }

    /**
     * Refresh capacity data
     */
    refresh() {
        console.log('Refreshing capacity data...');
        NotificationManager.info('Refreshing capacity planning data...');
        
        // Refresh the capacity dashboard
        try {
            this.render();
        } catch (error) {
            console.error('Error refreshing capacity data:', error);
        }
    }

    /**
     * Render error state
     */
    renderErrorState(errorMessage) {
        return `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Capacity Planning</h3>
                <p>${errorMessage}</p>
                <button class="btn-primary" onclick="window.capacityManager?.refresh()">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
    }

    /**
     * Reset allocation to original values for a specific assignment
     * @param {string} assignmentId Assignment ID 
     * @param {string} memberId Team member ID
     * @param {string} projectId Project ID
     */
    async resetAllocationToOriginal(assignmentId, memberId, projectId) {
        // Create unique key for this specific reset operation
        const resetKey = `${assignmentId || `${memberId}-${projectId}`}`;
        
        // Initialize reset tracking if needed
        if (!this._activeResets) {
            this._activeResets = new Set();
        }
        
        // Prevent multiple calls for the same assignment
        if (this._activeResets.has(resetKey)) {
            console.log(`Reset already in progress for ${resetKey}, skipping...`);
            return;
        }
        
        this._activeResets.add(resetKey);
        this._resettingAllocation = true;
        
        try {
            // Get project name first
            const projectName = this.getProjectNameById(projectId);
            
            // Add a small delay to prevent multiple rapid-fire resets
            await new Promise(resolve => setTimeout(resolve, 100));

            // Find the assignment - try by assignmentId first, then fallback to member+project search
            let assignment = null;
            
            if (assignmentId && this.manualAssignments) {
                assignment = this.manualAssignments.find(a => a.id === assignmentId);
            }
            
            if (!assignment) {
                // Fallback: try to find by member ID (including consolidated members)
                assignment = await this.findAssignmentForMemberAndProject(memberId, projectName);
                
                // If still not found, try with different member ID formats
                if (!assignment && this.manualAssignments) {
                    // Try to find assignment by checking if memberId is contained in teamMemberId
                    assignment = this.manualAssignments.find(a => {
                        const matchesProject = (a.projectId === projectId) || 
                                             (projectName && a.projectName === projectName);
                        
                        if (!matchesProject) return false;
                        
                        // Check various formats
                        return (
                            a.teamMemberId === memberId ||
                            a.teamMemberId.endsWith(`:${memberId}`) ||
                            a.teamMemberId.includes(memberId)
                        );
                    });
                }
            }
            
            if (!assignment) {
                throw new Error(`Assignment not found for member ${memberId} and project ${projectName}. Available assignments: ${
                    this.manualAssignments ? this.manualAssignments.map(a => `${a.teamMemberId}->${a.projectId || a.projectName}`).join(', ') : 'none'
                }`);
            }
            
            console.log('Found assignment for reset:', assignment);

            // Check if assignment has saved original allocation
            if (!assignment.originalCalculatedAllocation || Object.keys(assignment.originalCalculatedAllocation).length === 0) {
                throw new Error('No original allocation found to restore. The assignment needs to have originalCalculatedAllocation saved during creation/modification.');
            }

            console.log('Using saved original allocation:', assignment.originalCalculatedAllocation);
            const savedAllocation = assignment.originalCalculatedAllocation;
            
            // Update the UI directly with saved values - NO DATA MODIFICATION, ONLY UI RESTORE
            const updatedInputs = [];
            
            // Find all input fields for this member/project and restore their values
            const allocationRows = document.querySelectorAll(`tr[data-member="${memberId}"][data-project="${projectName}"]`);
            
            allocationRows.forEach(row => {
                // Find all capacity input fields in this row
                const capacityInputs = row.querySelectorAll('.capacity-mds-input');
                
                capacityInputs.forEach(input => {
                    const month = input.dataset.month;
                    
                    // Get the saved value for this month
                    if (savedAllocation[month] && savedAllocation[month][projectName]) {
                        const savedValue = savedAllocation[month][projectName].days || 0;
                        const currentValue = parseFloat(input.value) || 0;
                        
                        if (savedValue !== currentValue) {
                            // Temporarily disable event handling during reset to prevent loops
                            const originalResetting = this._resettingAllocation;
                            this._resettingAllocation = true;
                            
                            // Restore the saved value
                            input.value = savedValue;
                            
                            // Update the data-original-value to match saved value
                            input.dataset.originalValue = savedValue;
                            
                            // Remove any modification indicators
                            input.classList.remove('modified', 'auto-updated');
                            
                            // Hide reset button since value is now original
                            const resetButton = input.parentElement.querySelector('.reset-capacity-mds-btn');
                            if (resetButton) {
                                resetButton.style.display = 'none';
                            }
                            
                            // Update tooltip to remove "(Original: X)" indicators
                            const cell = input.closest('td');
                            if (cell) {
                                cell.title = `${projectName}: ${savedValue} MDs`;
                            }
                            
                            // Track that this input was updated
                            updatedInputs.push({
                                month,
                                oldValue: currentValue,
                                newValue: savedValue
                            });
                            
                            console.log(`Reset ${month}: ${currentValue} → ${savedValue}`);
                            
                            // Restore original resetting flag for this input
                            this._resettingAllocation = originalResetting;
                        }
                    }
                });
            });
            
            console.log(`Reset completed. Updated ${updatedInputs.length} input fields.`);
            
            // NO SAVING - just UI restoration, no data modification

            // Show success message
            const message = `✅ Reset allocation for ${memberId} on ${projectName} to saved values (${updatedInputs.length} fields updated)`;
            
            // Show notification (no automatic saving!)
            if (window.app && window.app.managers && window.app.managers.notification) {
                window.app.managers.notification.show(message, 'success');
            } else {
                alert(message);
            }
            
            // No refresh needed - we've updated the UI directly

        } catch (error) {
            console.error('Error resetting allocation to original:', error);
            
            const errorMessage = `❌ Failed to reset allocation: ${error.message}`;
            if (window.app && window.app.managers && window.app.managers.notification) {
                window.app.managers.notification.show(errorMessage, 'error');
            } else {
                alert(errorMessage);
            }
        } finally {
            // Always reset the debounce flags
            this._resettingAllocation = false;
            if (this._activeResets) {
                this._activeResets.delete(resetKey);
            }
        }
    }
}

// Make CapacityManager available globally
if (typeof window !== 'undefined') {
    window.CapacityManager = CapacityManager;
}

// Make CalculationsManager available globally
if (typeof window !== 'undefined') {
    window.CalculationsManager = CalculationsManager;
}