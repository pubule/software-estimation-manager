/**
 * CalculationsManager - Handles cost calculations, KPI analysis, and vendor summaries
 * Provides comprehensive project cost breakdown and resource utilization metrics
 */
class CalculationsManager {
    constructor(app, configManager) {
        console.log('=== CALCULATIONS MANAGER CONSTRUCTOR ===');
        console.log('App:', app);
        console.log('Config Manager:', configManager);
        
        this.app = app;
        this.configManager = configManager;
        this.vendorCosts = [];
        this.kpiData = {};
        this.currentFilters = {
            vendor: '',
            role: ''
        };
        
        this.initializeEventListeners();
        console.log('CalculationsManager initialized successfully');
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
        console.log('=== CALCULATE VENDOR COSTS START ===');
        
        const currentProject = this.app?.currentProject;
        if (!currentProject || !this.configManager) {
            console.log('No current project or config manager');
            this.vendorCosts = [];
            return;
        }

        console.log('Current project:', currentProject);
        console.log('Project phases:', currentProject.phases);
        console.log('Project features:', currentProject.features);

        const projectConfig = this.configManager.getProjectConfig(currentProject.config);
        const allSuppliers = [...projectConfig.suppliers, ...projectConfig.internalResources];
        
        console.log('All suppliers:', allSuppliers);
        console.log('External suppliers:', projectConfig.suppliers);
        console.log('Internal resources:', projectConfig.internalResources);
        
        // Debug: Show which suppliers have internal vs external rates
        allSuppliers.forEach(supplier => {
            const hasInternal = supplier.internalRate !== undefined && supplier.internalRate !== null;
            const hasExternal = supplier.officialRate !== undefined && supplier.officialRate !== null;
            console.log(`${supplier.name}: internal=${hasInternal}(${supplier.internalRate}), external=${hasExternal}(${supplier.officialRate})`);
        });
        
        // Create vendor costs map: vendorId_role -> { vendor, role, manDays, rate, cost }
        const vendorCostsMap = new Map();

        // Process phases data
        this.processPhasesCosts(vendorCostsMap, allSuppliers, currentProject);
        
        // Process features data  
        this.processFeaturesCosts(vendorCostsMap, allSuppliers, currentProject);

        console.log('Vendor costs map after processing:', vendorCostsMap);

        // Convert map to array
        this.vendorCosts = Array.from(vendorCostsMap.values()).sort((a, b) => {
            if (a.vendor !== b.vendor) return a.vendor.localeCompare(b.vendor);
            return a.role.localeCompare(b.role);
        });

        console.log('Final vendor costs:', this.vendorCosts);
        console.log('=== CALCULATE VENDOR COSTS END ===');
    }

    /**
     * Process costs from project phases
     */
    processPhasesCosts(vendorCostsMap, allSuppliers, currentProject) {
        console.log('=== PROCESS PHASES COSTS START ===');
        
        const phases = currentProject.phases;
        console.log('Project phases object:', phases);
        
        if (!phases || !phases.selectedSuppliers) {
            console.log('Missing phases data:', {
                phases: !!phases,
                selectedSuppliers: phases?.selectedSuppliers
            });
            return;
        }

        const selectedSuppliers = phases.selectedSuppliers;
        
        // Convert phases object to array - the phases are stored as individual properties
        const phasesData = [];
        const phaseKeys = Object.keys(phases).filter(key => key !== 'selectedSuppliers');
        
        phaseKeys.forEach(phaseKey => {
            const phaseData = phases[phaseKey];
            if (phaseData && typeof phaseData === 'object' && phaseData.manDays !== undefined) {
                phasesData.push({
                    id: phaseKey,
                    ...phaseData
                });
            }
        });
        
        console.log('Converted phases data to array:', phasesData);

        console.log('Selected suppliers:', selectedSuppliers);
        console.log('Phases data:', phasesData);

        // Map resource types to roles
        const resourceRoleMap = {
            'G1': 'G1',
            'G2': 'G2', 
            'TA': 'TA',
            'PM': 'PM'
        };

        Object.entries(selectedSuppliers).forEach(([resourceType, supplierId]) => {
            console.log(`Processing resource type: ${resourceType}, supplier ID: ${supplierId}`);
            
            if (!supplierId) {
                console.log(`No supplier ID for ${resourceType}`);
                return;
            }

            const supplier = allSuppliers.find(s => s.id === supplierId);
            if (!supplier) {
                console.log(`Supplier not found for ID: ${supplierId}`);
                return;
            }

            console.log(`Found supplier: ${supplier.name} for ${resourceType}`);

            const role = resourceRoleMap[resourceType];
            if (!role) {
                console.log(`No role mapping for resource type: ${resourceType}`);
                return;
            }

            // Calculate total man days for this resource type across all phases
            let totalManDays = 0;
            phasesData.forEach(phase => {
                const phaseManDays = parseFloat(phase.manDays) || 0;
                const effortPercent = (phase.effort && phase.effort[resourceType]) || 0;
                const phaseMDs = (phaseManDays * effortPercent) / 100;
                totalManDays += phaseMDs;
                
                console.log(`Phase ${phase.id}: ${phaseManDays} MDs x ${effortPercent}% = ${phaseMDs} MDs`);
            });

            console.log(`Total MDs for ${resourceType}: ${totalManDays}`);

            if (totalManDays > 0) {
                const key = `${supplier.id}_${role}`;
                const rate = this.getSupplierRate(supplier, role);
                const cost = totalManDays * rate;

                console.log(`Adding to map - Key: ${key}, Rate: ${rate}, Cost: ${cost}`);

                if (vendorCostsMap.has(key)) {
                    const existing = vendorCostsMap.get(key);
                    existing.manDays += totalManDays;
                    existing.cost += cost;
                    console.log(`Updated existing entry for ${key}`);
                } else {
                    vendorCostsMap.set(key, {
                        vendor: supplier.name,
                        vendorId: supplier.id,
                        role: role,
                        manDays: totalManDays,
                        rate: rate,
                        cost: cost,
                        isInternal: this.isInternalResource(supplier)
                    });
                    console.log(`Created new entry for ${key}`);
                }
            }
        });
        
        console.log('=== PROCESS PHASES COSTS END ===');
    }

    /**
     * Process costs from features (Development phase G2 resources)
     */
    processFeaturesCosts(vendorCostsMap, allSuppliers, currentProject) {
        console.log('=== PROCESS FEATURES COSTS START ===');
        
        const features = currentProject.features || [];
        const phases = currentProject.phases;
        
        console.log('Features:', features);
        console.log('Features count:', features.length);
        
        if (!phases) {
            console.log('No phases data for features processing');
            return;
        }

        // Find development phase and G2 effort percentage - access directly from phases object
        const developmentPhase = phases.development;
        console.log('Development phase:', developmentPhase);
        
        if (!developmentPhase) {
            console.log('No development phase found');
            return;
        }

        const g2EffortPercent = (developmentPhase.effort && developmentPhase.effort.G2) || 0;
        console.log('G2 effort percent from development phase:', g2EffortPercent);
        
        if (g2EffortPercent === 0) {
            console.log('G2 effort percent is 0, skipping features processing');
            return;
        }

        features.forEach((feature, index) => {
            console.log(`Processing feature ${index + 1}:`, feature);
            
            const supplierId = feature.supplier;
            if (!supplierId) {
                console.log(`Feature ${feature.id} has no supplier`);
                return;
            }

            const supplier = allSuppliers.find(s => s.id === supplierId);
            if (!supplier) {
                console.log(`Supplier not found for ID: ${supplierId} in feature ${feature.id}`);
                return;
            }

            console.log(`Found supplier: ${supplier.name} for feature ${feature.id}`);

            const featureManDays = parseFloat(feature.manDays) || 0;
            const g2ManDays = (featureManDays * g2EffortPercent) / 100;

            console.log(`Feature ${feature.id}: ${featureManDays} MDs x ${g2EffortPercent}% = ${g2ManDays} G2 MDs`);

            if (g2ManDays > 0) {
                const key = `${supplier.id}_G2`;
                const rate = this.getSupplierRate(supplier, 'G2');
                const cost = g2ManDays * rate;

                console.log(`Adding feature cost - Key: ${key}, Rate: ${rate}, Cost: ${cost}`);

                if (vendorCostsMap.has(key)) {
                    const existing = vendorCostsMap.get(key);
                    existing.manDays += g2ManDays;
                    existing.cost += cost;
                    console.log(`Updated existing G2 entry for ${supplier.name}, new total: ${existing.manDays} MDs`);
                } else {
                    vendorCostsMap.set(key, {
                        vendor: supplier.name,
                        vendorId: supplier.id,
                        role: 'G2',
                        manDays: g2ManDays,
                        rate: rate,
                        cost: cost,
                        isInternal: this.isInternalResource(supplier)
                    });
                    console.log(`Created new G2 entry for ${supplier.name}`);
                }
            }
        });
        
        console.log('=== PROCESS FEATURES COSTS END ===');
    }

    /**
     * Calculate KPI metrics
     */
    calculateKPIs() {
        // Calculate totals by role groups
        const gtoRoles = ['G2', 'TA'];
        const gdsRoles = ['G1', 'PM'];

        const gtoInternal = this.vendorCosts
            .filter(vc => gtoRoles.includes(vc.role) && vc.isInternal)
            .reduce((sum, vc) => sum + vc.cost, 0);

        const gtoExternal = this.vendorCosts
            .filter(vc => gtoRoles.includes(vc.role) && !vc.isInternal)
            .reduce((sum, vc) => sum + vc.cost, 0);

        const gtoTotal = gtoInternal + gtoExternal;

        const gdsInternal = this.vendorCosts
            .filter(vc => gdsRoles.includes(vc.role) && vc.isInternal)
            .reduce((sum, vc) => sum + vc.cost, 0);

        const gdsExternal = this.vendorCosts
            .filter(vc => gdsRoles.includes(vc.role) && !vc.isInternal)
            .reduce((sum, vc) => sum + vc.cost, 0);

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
     * Get supplier rate for specific role
     */
    getSupplierRate(supplier, role) {
        const isInternal = this.isInternalResource(supplier);
        let rate = 0;
        
        if (isInternal) {
            rate = supplier.internalRate || 0;
        } else {
            rate = supplier.officialRate || 0;
        }
        
        console.log(`Getting rate for ${supplier.name} (${isInternal ? 'internal' : 'external'}): €${rate}/day`);
        return rate;
    }

    /**
     * Check if supplier is internal resource
     */
    isInternalResource(supplier) {
        // Check if it has internalRate field (internal resources) vs officialRate (external suppliers)
        const hasInternalRate = supplier.internalRate !== undefined && supplier.internalRate !== null;
        const hasOfficialRate = supplier.officialRate !== undefined && supplier.officialRate !== null;
        
        // Internal resources should have internalRate, external suppliers should have officialRate
        const isInternal = hasInternalRate && !hasOfficialRate;
        
        console.log(`Checking if ${supplier.name} is internal: ${isInternal}`);
        console.log(`  - internalRate: ${supplier.internalRate} (has: ${hasInternalRate})`);
        console.log(`  - officialRate: ${supplier.officialRate} (has: ${hasOfficialRate})`);
        
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
                                    <span class="breakdown-cost">€${kpi.totalProject.toLocaleString()}</span>
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
                <div class="table-header">
                    <h3>Vendor Cost Summary</h3>
                    <div class="table-actions">
                        <button class="btn btn-secondary" id="export-calculations-csv">
                            <i class="fas fa-download"></i> Export CSV
                        </button>
                    </div>
                </div>
                
                <div class="table-filters">
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

                <div class="table-container">
                    <table class="calculations-table">
                        <thead>
                            <tr>
                                <th>Vendor</th>
                                <th>Role</th>
                                <th>Total MDs</th>
                                <th>Rate</th>
                                <th>Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredCosts.length === 0 ? 
                                '<tr><td colspan="5" class="no-data">No cost data available</td></tr>' :
                                filteredCosts.map(cost => `
                                    <tr class="${cost.isInternal ? 'internal-resource' : 'external-supplier'}">
                                        <td>
                                            ${cost.vendor}
                                            <span class="resource-type">${cost.isInternal ? '(Internal)' : '(External)'}</span>
                                        </td>
                                        <td><span class="role-badge role-${cost.role.toLowerCase()}">${cost.role}</span></td>
                                        <td class="number">${cost.manDays.toFixed(1)}</td>
                                        <td class="currency">€${cost.rate.toLocaleString()}/day</td>
                                        <td class="currency total-cost">€${cost.cost.toLocaleString()}</td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                        ${filteredCosts.length > 0 ? `
                            <tfoot>
                                <tr class="totals-row">
                                    <td colspan="2"><strong>Total</strong></td>
                                    <td class="number"><strong>${filteredCosts.reduce((sum, c) => sum + c.manDays, 0).toFixed(1)}</strong></td>
                                    <td></td>
                                    <td class="currency total-cost"><strong>€${filteredCosts.reduce((sum, c) => sum + c.cost, 0).toLocaleString()}</strong></td>
                                </tr>
                            </tfoot>
                        ` : ''}
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
            if (this.currentFilters.vendor && cost.vendor !== this.currentFilters.vendor) {
                return false;
            }
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
        // Filter listeners
        const vendorFilter = document.getElementById('vendor-filter');
        const roleFilter = document.getElementById('role-filter');
        const exportBtn = document.getElementById('export-calculations-csv');

        if (vendorFilter) {
            vendorFilter.addEventListener('change', (e) => {
                this.currentFilters.vendor = e.target.value;
                this.updateTable();
            });
        }

        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.currentFilters.role = e.target.value;
                this.updateTable();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToCSV();
            });
        }
    }

    /**
     * Update table content with current filters
     */
    updateTable() {
        const tableSection = document.querySelector('.calculations-table-section');
        if (tableSection) {
            const newTableHTML = this.renderCostTable();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newTableHTML;
            
            tableSection.innerHTML = tempDiv.firstElementChild.innerHTML;
            this.attachTableEventListeners();
        }
    }

    /**
     * Export current filtered data to CSV
     */
    exportToCSV() {
        const filteredCosts = this.getFilteredVendorCosts();
        if (filteredCosts.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = ['Vendor', 'Role', 'Total MDs', 'Rate', 'Total Cost'];
        const csvData = [
            headers,
            ...filteredCosts.map(cost => [
                cost.vendor,
                cost.role,
                cost.manDays.toFixed(1),
                cost.rate,
                cost.cost.toFixed(2)
            ])
        ];

        const csvContent = csvData.map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vendor-costs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
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

// Make CalculationsManager available globally
if (typeof window !== 'undefined') {
    window.CalculationsManager = CalculationsManager;
}