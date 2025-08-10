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
        console.log('=== SUPPLIER ANALYSIS ===');
        projectConfig.internalResources.forEach(supplier => {
            const hasInternal = supplier.internalRate !== undefined && supplier.internalRate !== null;
            const hasExternal = supplier.officialRate !== undefined && supplier.officialRate !== null;
            console.log(`INTERNAL: ${supplier.name} (${supplier.id}): internalRate=${supplier.internalRate}, officialRate=${supplier.officialRate}`);
        });
        
        projectConfig.suppliers.forEach(supplier => {
            const hasInternal = supplier.internalRate !== undefined && supplier.internalRate !== null;
            const hasExternal = supplier.officialRate !== undefined && supplier.officialRate !== null;
            console.log(`EXTERNAL: ${supplier.name} (${supplier.id}): internalRate=${supplier.internalRate}, officialRate=${supplier.officialRate}`);
        });

        // Debug selected suppliers
        console.log('=== SELECTED SUPPLIERS ANALYSIS ===');
        let selectedSuppliers = currentProject.phases?.selectedSuppliers || {};
        console.log('Selected suppliers object:', selectedSuppliers);
        
        if (Object.keys(selectedSuppliers).length === 0) {
            console.log('WARNING: No selected suppliers found. This will cause empty calculations.');
            console.log('Trying to initialize phases if phases manager is available...');
            
            // Try to initialize phases data if phases manager is available
            if (this.app.phasesManager || this.app.projectPhasesManager) {
                const phasesManager = this.app.phasesManager || this.app.projectPhasesManager;
                console.log('Found phases manager, attempting to sync phases...');
                phasesManager.synchronizeWithProject();
                // Re-check after sync and update the local variable
                selectedSuppliers = currentProject.phases?.selectedSuppliers || {};
                console.log('Selected suppliers after sync:', selectedSuppliers);
            }
        }
        
        Object.entries(selectedSuppliers).forEach(([role, supplierId]) => {
            const supplier = allSuppliers.find(s => s.id === supplierId);
            if (supplier) {
                const isFromInternalList = projectConfig.internalResources.some(ir => ir.id === supplierId);
                const isFromExternalList = projectConfig.suppliers.some(s => s.id === supplierId);
                console.log(`${role}: ${supplier.name} (${supplierId}) - fromInternal:${isFromInternalList}, fromExternal:${isFromExternalList}`);
                console.log(`  rates: internal=${supplier.internalRate}, official=${supplier.officialRate}`);
            }
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

        // Restore any manually set finalMDs values from project data
        this.restoreFinalMDsFromProject();

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
        
        console.log('Converted phases data to array (including development phase):', phasesData);
        console.log('Note: Development phase G2 MDs will be calculated from features in processFeaturesCosts()');

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
            // For development phase, exclude G2 as it's calculated from features in processFeaturesCosts()
            let totalManDays = 0;
            phasesData.forEach(phase => {
                // Skip G2 calculation for development phase only
                if (phase.id === 'development' && resourceType === 'G2') {
                    console.log(`Phase ${phase.id}: Skipping G2 calculation (handled by features)`);
                    return;
                }
                
                const phaseManDays = parseFloat(phase.manDays) || 0;
                const effortPercent = (phase.effort && phase.effort[resourceType]) || 0;
                const phaseMDs = (phaseManDays * effortPercent) / 100;
                totalManDays += phaseMDs;
                
                console.log(`Phase ${phase.id}: ${phaseManDays} MDs x ${effortPercent}% = ${phaseMDs} MDs`);
            });

            console.log(`Total MDs for ${resourceType}: ${totalManDays}`);

            if (totalManDays > 0) {
                const department = supplier.department || 'Unknown';
                const key = `${supplier.name}_${role}_${department}`;
                const realRate = this.getSupplierRate(supplier, role); // Use realRate for calculations
                const officialRate = supplier.officialRate || 0; // Official rate for display
                const cost = totalManDays * realRate;

                console.log(`Adding to map - Key: ${key}, Real Rate: €${realRate}, Official Rate: €${officialRate}, Cost: €${cost}`);

                if (vendorCostsMap.has(key)) {
                    const existing = vendorCostsMap.get(key);
                    existing.manDays += totalManDays;
                    existing.cost += cost;
                    // Update finalMDs to reflect new total
                    const officialTotalMDs = existing.officialRate > 0 ? existing.cost / existing.officialRate : 0;
                    existing.finalMDs = Math.round(officialTotalMDs);
                    console.log(`Updated existing entry for ${key}, total MDs: ${existing.manDays}, total cost: €${existing.cost}`);
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
                const department = supplier.department || 'Unknown';
                const key = `${supplier.name}_G2_${department}`;
                const realRate = this.getSupplierRate(supplier, 'G2'); // Use realRate for calculations
                const officialRate = supplier.officialRate || 0; // Official rate for display
                const cost = g2ManDays * realRate;

                console.log(`Adding feature cost - Key: ${key}, Real Rate: €${realRate}, Official Rate: €${officialRate}, Cost: €${cost}`);

                if (vendorCostsMap.has(key)) {
                    const existing = vendorCostsMap.get(key);
                    existing.manDays += g2ManDays;
                    existing.cost += cost;
                    // Update finalMDs to reflect new total
                    const officialTotalMDs = existing.officialRate > 0 ? existing.cost / existing.officialRate : 0;
                    existing.finalMDs = Math.round(officialTotalMDs);
                    console.log(`Updated existing G2 entry for ${supplier.name}, total MDs: ${existing.manDays}, total cost: €${existing.cost}`);
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
                    console.log(`Created new G2 entry for ${supplier.name}`);
                }
            }
        });

        // Process coverage MDs as additional G2 development costs
        const coverageMDs = parseFloat(currentProject.coverage) || 0;
        if (coverageMDs > 0 && g2EffortPercent > 0) {
            console.log(`Processing coverage MDs: ${coverageMDs}`);
            
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

                    console.log(`Adding coverage cost - Key: ${key}, Coverage G2 MDs: ${coverageG2ManDays}, Cost: €${coverageCost}`);

                    if (vendorCostsMap.has(key)) {
                        const existing = vendorCostsMap.get(key);
                        existing.manDays += coverageG2ManDays;
                        existing.cost += coverageCost;
                        // Update finalMDs to reflect new total
                        const officialTotalMDs = existing.officialRate > 0 ? existing.cost / existing.officialRate : 0;
                        existing.finalMDs = Math.round(officialTotalMDs);
                        console.log(`Updated existing G2 entry for ${g2Supplier.name} with coverage, total MDs: ${existing.manDays}, total cost: €${existing.cost}`);
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
                        console.log(`Created new G2 entry for ${g2Supplier.name} with coverage`);
                    }
                } else {
                    console.log(`G2 supplier not found for coverage calculation: ${g2SupplierId}`);
                }
            } else {
                console.log('No G2 supplier selected for coverage calculation');
            }
        }
        
        console.log('=== PROCESS FEATURES COSTS END ===');
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
        
        console.log(`Getting rate for ${supplier.name} (${isInternal ? 'internal' : 'external'}): €${rate}/day (using ${supplier.realRate !== undefined ? 'realRate' : 'fallback'})`);
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
        
        console.log(`Checking if ${supplier.name} is internal: ${isInternal}`);
        console.log(`  - fromInternalList: ${isFromInternalList}`);
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
        console.log('=== RESET BUTTON CLICKED ===');
        
        // Validate button element
        if (!button || !button.dataset) {
            console.error('Invalid button element:', button);
            return;
        }

        const vendorId = button.dataset.vendorId;
        const role = button.dataset.role;
        const department = button.dataset.department;

        console.log(`Reset for: ${vendorId}, ${role}, ${department}`);

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
        
        console.log(`Current input value: ${currentInputValue}, Calculated value: ${calculatedValue}, costEntry.finalMDs: ${costEntry.finalMDs}`);
        
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
        
        console.log(`Updated input value to: ${calculatedValue}`);

        // Update the Final Tot Cost cell
        const finalCostCell = row.querySelector('.final-cost');
        if (finalCostCell) {
            const finalCost = calculatedValue * costEntry.officialRate;
            finalCostCell.textContent = `€${finalCost.toLocaleString()}`;
            finalCostCell.classList.add('value-updated');
            setTimeout(() => {
                finalCostCell.classList.remove('value-updated');
            }, 300);
            console.log(`Updated final cost to: €${finalCost.toLocaleString()}`);
        }

        // Update footer totals
        this.updateFooterTotals();
        
        // Update KPI cards with new Final Tot Cost values
        this.updateKPICards();
        
        console.log(`Reset completed for ${costEntry.vendor} ${role} to ${calculatedValue}`);
        console.log('=== RESET BUTTON END ===');
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
                console.log(`Restored finalMDs for ${cost.vendor} ${cost.role}: ${cost.finalMDs}`);
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
        
        console.log(`Saved finalMDs override for ${key}: ${finalMDs}`);
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
        
        console.log(`Removed finalMDs override for ${key}`);
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
                console.log('Table update completed');
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

        console.log('CapacityManager initialized');
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
            this.autoDistribution = new AutoDistribution(this.workingDaysCalculator, this.teamManager);
        }

        console.log('Capacity planning components initialized');
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
            this.loadDashboardData();
            
            console.log('Capacity planning dashboard rendered successfully');
            
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
            refreshBtn.addEventListener('click', () => this.loadDashboardData());
        }

        // Allocation timeframe filter
        const allocationTimeframe = document.getElementById('allocation-timeframe');
        if (allocationTimeframe) {
            allocationTimeframe.addEventListener('change', () => this.updateAllocationChart());
        }
    }

    // Load Dashboard Data
    loadDashboardData() {
        // Load team overview data

        
        // Load capacity utilization data
        this.loadCapacityUtilizationData();
        

        
        // Load alerts and warnings
        this.loadAlertsData();
        
        // Load analytics charts
        this.loadAllocationChart();
        this.loadTimelineOverviewChart();
        
        // Load team performance data
        this.loadTeamPerformanceData();
    }



    // Load Capacity Utilization Data
    loadCapacityUtilizationData() {
        // Mock capacity utilization data
        const currentDate = new Date();
        const currentMonth = currentDate.toISOString().slice(0, 7);
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
            .toISOString().slice(0, 7);

        // Calculate utilization percentages
        const currentUtil = Math.round(Math.random() * 40 + 60); // 60-100%
        const nextUtil = Math.round(Math.random() * 30 + 50); // 50-80%
        const avgUtil = Math.round(Math.random() * 25 + 65); // 65-90%

        this.updateUtilizationDisplay('current-month-util', currentUtil);
        this.updateUtilizationDisplay('next-month-util', nextUtil);
        this.updateUtilizationDisplay('avg-utilization', avgUtil);
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

    // Load Project Allocation Data


    // Load Alerts Data
    loadAlertsData() {
        const alertsContainer = document.getElementById('alerts-content');
        
        // Generate mock alerts
        const alerts = [
            { type: 'warning', message: 'Mario Rossi over-allocated by 5 MDs in Dec 2024', severity: 'medium' },
            { type: 'error', message: 'Vendor A capacity exceeded for Q1 2025', severity: 'high' },
            { type: 'info', message: '3 pending project assignments need approval', severity: 'low' }
        ];

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

    // Get Alert Icon
    getAlertIcon(type) {
        switch(type) {
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'bell';
        }
    }

    // Load Allocation Chart
    loadAllocationChart() {
        const chartContainer = document.getElementById('allocation-chart');
        
        // Get team members and calculate project allocations
        const teamMembers = this.getMockTeamMembers();
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
                    status: allocation.status
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
            
            resources.forEach((resource, index) => {
                const isFirstRow = index === 0;
                
                tableRows += `
                    <tr class="allocation-chart-row ${isFirstRow ? 'project-first-row' : ''}">
                        ${isFirstRow ? `
                            <td class="allocation-cell-project" rowspan="${resourceCount}">
                                <div class="allocation-project-info">
                                    <span class="allocation-project-name">${projectName}</span>
                                    <div class="allocation-project-summary">
                                        <span class="allocation-project-total">${totalDays} MDs</span>
                                        <span class="allocation-project-resources">${resources.length} resources</span>
                                        <div class="allocation-project-status">
                                            ${approvedCount > 0 ? `<span class="approved-count">${approvedCount} ✓</span>` : ''}
                                            ${pendingCount > 0 ? `<span class="pending-count">${pendingCount} ⏳</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </td>
                        ` : ''}
                        <td class="allocation-cell-resource">${resource.resource}</td>
                        <td class="allocation-cell-role">${resource.role}</td>
                        <td class="allocation-cell-vendor">${resource.vendor}</td>
                        <td class="allocation-cell-days">
                            <span class="allocation-days-value ${resource.status}">${resource.days}</span>
                        </td>
                        <td class="allocation-cell-status">
                            <span class="allocation-status-badge ${resource.status}">
                                ${resource.status === 'approved' ? '✓' : '✗'}
                            </span>
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
    loadTimelineOverviewChart() {
        const chartContainer = document.getElementById('timeline-overview-chart');
        
        // Generate 15 months of mock data (Jan current year + 3 months next year)
        const months = [];
        const currentYear = new Date().getFullYear();
        
        for (let i = 0; i < 15; i++) {
            const month = new Date(currentYear, i, 1); // Start from January (month 0)
            const monthStr = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            const utilization = Math.round(Math.random() * 40 + 50); // 50-90%
            
            months.push({ month: monthStr, utilization });
        }

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
    loadTeamPerformanceData() {
        const container = document.getElementById('team-performance-grid');
        const teamMembers = this.getMockTeamMembers();
        
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
                        <span class="performance-value">${Object.keys(member.allocations?.['2025-12'] || {}).length || 1}</span>
                    </div>
                    <div class="performance-item">
                        <span class="performance-label">Next Month</span>
                        <span class="performance-value">${Math.round(member.currentUtilization * 0.9)}%</span>
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
            
            console.log('Resource capacity overview rendered successfully');
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
            
            console.log('Capacity planning timeline rendered successfully');
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
                <!-- Capacity Planning Table -->
                <div class="capacity-table-container">
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
                    
                    <div class="scrollable-table-wrapper">
                        <table id="capacity-table" class="capacity-planning-table">
                            <thead>
                                <tr>
                                    <!-- Fixed columns -->
                                    <th class="fixed-col col-member">Team Member</th>
                                    <th class="fixed-col col-project">Project</th>
                                    <th class="fixed-col col-status">Status</th>
                                    <!-- Scrollable month columns - All current year months + 3 next year months -->
                                    ${this.generateMonthHeaders()}
                                </tr>
                            </thead>
                            <tbody id="capacity-table-body">
                                <!-- Table rows will be populated here -->
                                <tr class="no-data-row">
                                    <td colspan="18" class="no-data-message">
                                        <div class="no-data-content">
                                            <i class="fas fa-table"></i>
                                            <p>No capacity assignments configured yet.</p>
                                            <button class="btn-primary" id="create-first-row-btn">Create First Assignment</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
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
                console.log('Member filter changed to:', e.target.value);
                await this.updateCapacityOverview();
            });
        }

        if (overviewStatusFilter) {
            overviewStatusFilter.addEventListener('change', async (e) => {
                console.log('Status filter changed to:', e.target.value);
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
        
        console.log('Resource overview event listeners initialized');
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
        const exportTableBtn = document.getElementById('export-table-btn');
        const refreshTimelineBtn = document.getElementById('refresh-timeline-btn');
        const createFirstRowBtn = document.getElementById('create-first-row-btn');

        if (addAssignmentBtn) {
            addAssignmentBtn.addEventListener('click', () => this.showAddAssignmentModal());
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
        
        console.log('Capacity timeline event listeners initialized');
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
            console.log('Using embedded fallback HTML');
            
            // Fallback: return embedded mock HTML for development
            return this.getEmbeddedCapacityHTML();
        }
    }

    /**
     * Get embedded capacity HTML as fallback
     */
    getEmbeddedCapacityHTML() {
        return `
        <section id="capacity-section">

        <!-- Statistics and Alerts Panel -->
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

        <!-- Capacity Planning Table -->
        <div class="capacity-table-container">
            <div class="capacity-table-header">
                <h2>📋 Capacity Planning Timeline</h2>

            </div>
            
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
            
            <div class="scrollable-table-wrapper">
                <table id="capacity-table" class="capacity-planning-table">
                    <thead>
                        <tr>
                            <!-- Fixed columns -->
                            <th class="fixed-col col-member">Team Member</th>
                            <th class="fixed-col col-project">Project</th>
                            <th class="fixed-col col-status">Status</th>
                            <!-- Scrollable month columns - All current year months + 3 next year months -->
                            ${this.generateMonthHeaders()}
                        </tr>
                    </thead>
                    <tbody id="capacity-table-body">
                        <!-- Dynamic content will be generated here -->
                    </tbody>
                </table>
            </div>
        </div>

        </section>
        `;
    }

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
     * Get mock team members with 2025 allocation data
     */
    getMockTeamMembers() {
        return [
            {
                id: 'mario-rossi',
                firstName: 'Mario',
                lastName: 'Rossi',
                role: 'Senior Developer',
                vendor: 'Internal',
                maxCapacity: 20, // MDs per month
                currentUtilization: 85,
                allocations: {
                    '2025-01': { 'E-Commerce Platform': { days: 15, status: 'approved' }, 'Mobile App': { days: 5, status: 'approved' } },
                    '2025-02': { 'E-Commerce Platform': { days: 12, status: 'approved' }, 'CRM System': { days: 8, status: 'pending' } },
                    '2025-03': { 'E-Commerce Platform': { days: 10, status: 'approved' }, 'CRM System': { days: 10, status: 'approved' } },
                    '2025-04': { 'CRM System': { days: 15, status: 'approved' }, 'Analytics Dashboard': { days: 5, status: 'pending' } },
                    '2025-05': { 'CRM System': { days: 12, status: 'approved' }, 'Analytics Dashboard': { days: 8, status: 'approved' } },
                    '2025-06': { 'Analytics Dashboard': { days: 18, status: 'approved' }, 'Mobile App': { days: 2, status: 'pending' } },
                    '2025-07': { 'Analytics Dashboard': { days: 15, status: 'approved' }, 'Mobile App': { days: 5, status: 'approved' } },
                    '2025-08': { 'Mobile App': { days: 20, status: 'approved' } },
                    '2025-09': { 'Mobile App': { days: 15, status: 'approved' }, 'Payment System': { days: 5, status: 'pending' } },
                    '2025-10': { 'Payment System': { days: 18, status: 'pending' } },
                    '2025-11': { 'Payment System': { days: 16, status: 'approved' }, 'API Gateway': { days: 4, status: 'pending' } },
                    '2025-12': { 'API Gateway': { days: 20, status: 'approved' } },
                    '2026-01': { 'API Gateway': { days: 15, status: 'pending' }, 'New Project': { days: 5, status: 'pending' } },
                    '2026-02': { 'New Project': { days: 18, status: 'pending' } },
                    '2026-03': { 'New Project': { days: 20, status: 'pending' } }
                }
            },
            {
                id: 'giulia-bianchi',
                firstName: 'Giulia',
                lastName: 'Bianchi',
                role: 'Frontend Developer',
                vendor: 'Vendor A',
                maxCapacity: 22,
                currentUtilization: 75,
                allocations: {
                    '2025-01': { 'E-Commerce Platform': { days: 12, status: 'approved' }, 'Mobile App': { days: 8, status: 'approved' } },
                    '2025-02': { 'Mobile App': { days: 16, status: 'approved' }, 'Analytics Dashboard': { days: 4, status: 'pending' } },
                    '2025-03': { 'Mobile App': { days: 14, status: 'approved' }, 'Analytics Dashboard': { days: 8, status: 'approved' } },
                    '2025-04': { 'Analytics Dashboard': { days: 18, status: 'approved' }, 'E-Commerce Platform': { days: 4, status: 'pending' } },
                    '2025-05': { 'Analytics Dashboard': { days: 15, status: 'approved' }, 'E-Commerce Platform': { days: 6, status: 'approved' } },
                    '2025-06': { 'E-Commerce Platform': { days: 20, status: 'approved' } },
                    '2025-07': { 'E-Commerce Platform': { days: 16, status: 'approved' }, 'CRM System': { days: 6, status: 'pending' } },
                    '2025-08': { 'CRM System': { days: 18, status: 'approved' }, 'Mobile App': { days: 4, status: 'pending' } },
                    '2025-09': { 'CRM System': { days: 14, status: 'approved' }, 'Mobile App': { days: 8, status: 'approved' } },
                    '2025-10': { 'Mobile App': { days: 20, status: 'approved' } },
                    '2025-11': { 'Mobile App': { days: 16, status: 'approved' }, 'Payment System': { days: 6, status: 'pending' } },
                    '2025-12': { 'Payment System': { days: 22, status: 'approved' } },
                    '2026-01': { 'Payment System': { days: 18, status: 'pending' }, 'API Gateway': { days: 4, status: 'pending' } },
                    '2026-02': { 'API Gateway': { days: 20, status: 'pending' } },
                    '2026-03': { 'API Gateway': { days: 22, status: 'pending' } }
                }
            },
            {
                id: 'luca-verdi',
                firstName: 'Luca',
                lastName: 'Verdi',
                role: 'Backend Developer',
                vendor: 'Vendor A',
                maxCapacity: 20,
                currentUtilization: 90,
                allocations: {
                    '2025-01': { 'CRM System': { days: 18, status: 'approved' } },
                    '2025-02': { 'CRM System': { days: 20, status: 'approved' } },
                    '2025-03': { 'Payment System': { days: 16, status: 'approved' }, 'CRM System': { days: 4, status: 'pending' } },
                    '2025-04': { 'Payment System': { days: 20, status: 'approved' } },
                    '2025-05': { 'Payment System': { days: 18, status: 'approved' }, 'API Gateway': { days: 2, status: 'pending' } },
                    '2025-06': { 'API Gateway': { days: 16, status: 'approved' }, 'Analytics Dashboard': { days: 4, status: 'pending' } },
                    '2025-07': { 'API Gateway': { days: 20, status: 'approved' } },
                    '2025-08': { 'API Gateway': { days: 18, status: 'approved' }, 'E-Commerce Platform': { days: 2, status: 'pending' } },
                    '2025-09': { 'E-Commerce Platform': { days: 20, status: 'approved' } },
                    '2025-10': { 'E-Commerce Platform': { days: 18, status: 'approved' }, 'Mobile App': { days: 2, status: 'pending' } },
                    '2025-11': { 'Mobile App': { days: 20, status: 'approved' } },
                    '2025-12': { 'Mobile App': { days: 16, status: 'approved' }, 'New Project': { days: 4, status: 'pending' } },
                    '2026-01': { 'New Project': { days: 20, status: 'pending' } },
                    '2026-02': { 'New Project': { days: 18, status: 'pending' }, 'Future Project': { days: 2, status: 'pending' } },
                    '2026-03': { 'Future Project': { days: 20, status: 'pending' } }
                }
            },
            {
                id: 'anna-ferrari',
                firstName: 'Anna',
                lastName: 'Ferrari',
                role: 'UI/UX Designer',
                vendor: 'Internal',
                maxCapacity: 18,
                currentUtilization: 65,
                allocations: {
                    '2025-01': { 'E-Commerce Platform': { days: 10, status: 'approved' }, 'Mobile App': { days: 6, status: 'approved' } },
                    '2025-02': { 'Mobile App': { days: 12, status: 'approved' }, 'Analytics Dashboard': { days: 4, status: 'pending' } },
                    '2025-03': { 'Analytics Dashboard': { days: 14, status: 'approved' } },
                    '2025-04': { 'Analytics Dashboard': { days: 10, status: 'approved' }, 'CRM System': { days: 6, status: 'approved' } },
                    '2025-05': { 'CRM System': { days: 12, status: 'approved' }, 'Payment System': { days: 4, status: 'pending' } },
                    '2025-06': { 'Payment System': { days: 16, status: 'approved' } },
                    '2025-07': { 'Payment System': { days: 12, status: 'approved' }, 'API Gateway': { days: 4, status: 'pending' } },
                    '2025-08': { 'API Gateway': { days: 14, status: 'approved' } },
                    '2025-09': { 'API Gateway': { days: 10, status: 'approved' }, 'E-Commerce Platform': { days: 6, status: 'approved' } },
                    '2025-10': { 'E-Commerce Platform': { days: 16, status: 'approved' } },
                    '2025-11': { 'E-Commerce Platform': { days: 12, status: 'approved' }, 'Mobile App': { days: 4, status: 'pending' } },
                    '2025-12': { 'Mobile App': { days: 18, status: 'approved' } },
                    '2026-01': { 'Mobile App': { days: 14, status: 'pending' }, 'New Project': { days: 4, status: 'pending' } },
                    '2026-02': { 'New Project': { days: 16, status: 'pending' } },
                    '2026-03': { 'New Project': { days: 18, status: 'pending' } }
                }
            },
            {
                id: 'marco-russo',
                firstName: 'Marco',
                lastName: 'Russo',
                role: 'DevOps Engineer',
                vendor: 'Vendor B',
                maxCapacity: 20,
                currentUtilization: 80,
                allocations: {
                    '2025-01': { 'E-Commerce Platform': { days: 8, status: 'approved' }, 'CRM System': { days: 10, status: 'approved' } },
                    '2025-02': { 'CRM System': { days: 16, status: 'approved' }, 'Payment System': { days: 2, status: 'pending' } },
                    '2025-03': { 'Payment System': { days: 14, status: 'approved' }, 'API Gateway': { days: 4, status: 'pending' } },
                    '2025-04': { 'API Gateway': { days: 16, status: 'approved' } },
                    '2025-05': { 'API Gateway': { days: 12, status: 'approved' }, 'Analytics Dashboard': { days: 6, status: 'approved' } },
                    '2025-06': { 'Analytics Dashboard': { days: 18, status: 'approved' } },
                    '2025-07': { 'Analytics Dashboard': { days: 14, status: 'approved' }, 'Mobile App': { days: 4, status: 'pending' } },
                    '2025-08': { 'Mobile App': { days: 16, status: 'approved' } },
                    '2025-09': { 'Mobile App': { days: 12, status: 'approved' }, 'E-Commerce Platform': { days: 6, status: 'approved' } },
                    '2025-10': { 'E-Commerce Platform': { days: 18, status: 'approved' } },
                    '2025-11': { 'E-Commerce Platform': { days: 14, status: 'approved' }, 'CRM System': { days: 4, status: 'pending' } },
                    '2025-12': { 'CRM System': { days: 20, status: 'approved' } },
                    '2026-01': { 'CRM System': { days: 16, status: 'pending' }, 'Payment System': { days: 4, status: 'pending' } },
                    '2026-02': { 'Payment System': { days: 18, status: 'pending' } },
                    '2026-03': { 'Payment System': { days: 20, status: 'pending' } }
                }
            },
            {
                id: 'sara-conti',
                firstName: 'Sara',
                lastName: 'Conti',
                role: 'QA Engineer',
                vendor: 'Internal',
                maxCapacity: 22,
                currentUtilization: 70,
                allocations: {
                    '2025-01': { 'E-Commerce Platform': { days: 12, status: 'approved' }, 'Mobile App': { days: 6, status: 'approved' } },
                    '2025-02': { 'Mobile App': { days: 14, status: 'approved' }, 'CRM System': { days: 4, status: 'pending' } },
                    '2025-03': { 'CRM System': { days: 16, status: 'approved' }, 'Analytics Dashboard': { days: 4, status: 'pending' } },
                    '2025-04': { 'Analytics Dashboard': { days: 18, status: 'approved' } },
                    '2025-05': { 'Analytics Dashboard': { days: 14, status: 'approved' }, 'Payment System': { days: 6, status: 'approved' } },
                    '2025-06': { 'Payment System': { days: 20, status: 'approved' } },
                    '2025-07': { 'Payment System': { days: 16, status: 'approved' }, 'API Gateway': { days: 4, status: 'pending' } },
                    '2025-08': { 'API Gateway': { days: 18, status: 'approved' } },
                    '2025-09': { 'API Gateway': { days: 14, status: 'approved' }, 'E-Commerce Platform': { days: 6, status: 'approved' } },
                    '2025-10': { 'E-Commerce Platform': { days: 20, status: 'approved' } },
                    '2025-11': { 'E-Commerce Platform': { days: 16, status: 'approved' }, 'Mobile App': { days: 4, status: 'pending' } },
                    '2025-12': { 'Mobile App': { days: 22, status: 'approved' } },
                    '2026-01': { 'Mobile App': { days: 18, status: 'pending' }, 'New Project': { days: 4, status: 'pending' } },
                    '2026-02': { 'New Project': { days: 20, status: 'pending' } },
                    '2026-03': { 'New Project': { days: 22, status: 'pending' } }
                }
            },
            {
                id: 'alessandro-lombardi',
                firstName: 'Alessandro',
                lastName: 'Lombardi',
                role: 'Tech Lead',
                vendor: 'Internal',
                maxCapacity: 18,
                currentUtilization: 95,
                allocations: {
                    '2025-01': { 'E-Commerce Platform': { days: 16, status: 'approved' }, 'Team Management': { days: 2, status: 'approved' } },
                    '2025-02': { 'E-Commerce Platform': { days: 14, status: 'approved' }, 'CRM System': { days: 4, status: 'approved' } },
                    '2025-03': { 'CRM System': { days: 12, status: 'approved' }, 'Mobile App': { days: 6, status: 'approved' } },
                    '2025-04': { 'Mobile App': { days: 15, status: 'approved' }, 'Analytics Dashboard': { days: 3, status: 'pending' } },
                    '2025-05': { 'Analytics Dashboard': { days: 16, status: 'approved' }, 'FERIE': { days: 2, status: 'approved' } },
                    '2025-06': { 'Analytics Dashboard': { days: 14, status: 'approved' }, 'Payment System': { days: 4, status: 'approved' } },
                    '2025-07': { 'Payment System': { days: 18, status: 'approved' } },
                    '2025-08': { 'FERIE': { days: 10, status: 'approved' }, 'API Gateway': { days: 8, status: 'pending' } },
                    '2025-09': { 'API Gateway': { days: 16, status: 'approved' }, 'Training': { days: 2, status: 'approved' } },
                    '2025-10': { 'API Gateway': { days: 14, status: 'approved' }, 'E-Commerce Platform': { days: 4, status: 'pending' } },
                    '2025-11': { 'E-Commerce Platform': { days: 18, status: 'approved' } },
                    '2025-12': { 'E-Commerce Platform': { days: 12, status: 'approved' }, 'Planning 2026': { days: 6, status: 'pending' } },
                    '2026-01': { 'Planning 2026': { days: 16, status: 'pending' }, 'New Project': { days: 2, status: 'pending' } },
                    '2026-02': { 'New Project': { days: 18, status: 'pending' } },
                    '2026-03': { 'New Project': { days: 16, status: 'pending' }, 'Research': { days: 2, status: 'pending' } }
                }
            },
            {
                id: 'francesca-marino',
                firstName: 'Francesca',
                lastName: 'Marino',
                role: 'Frontend Developer',
                vendor: 'Vendor B',
                maxCapacity: 20,
                currentUtilization: 88,
                allocations: {
                    '2025-01': { 'Mobile App': { days: 18, status: 'approved' } },
                    '2025-02': { 'Mobile App': { days: 16, status: 'approved' }, 'E-Commerce Platform': { days: 4, status: 'approved' } },
                    '2025-03': { 'E-Commerce Platform': { days: 20, status: 'approved' } },
                    '2025-04': { 'E-Commerce Platform': { days: 15, status: 'approved' }, 'Analytics Dashboard': { days: 5, status: 'pending' } },
                    '2025-05': { 'Analytics Dashboard': { days: 18, status: 'approved' }, 'Training': { days: 2, status: 'approved' } },
                    '2025-06': { 'Analytics Dashboard': { days: 16, status: 'approved' }, 'CRM System': { days: 4, status: 'pending' } },
                    '2025-07': { 'CRM System': { days: 20, status: 'approved' } },
                    '2025-08': { 'CRM System': { days: 14, status: 'approved' }, 'Payment System': { days: 6, status: 'approved' } },
                    '2025-09': { 'Payment System': { days: 18, status: 'approved' }, 'Mobile App': { days: 2, status: 'pending' } },
                    '2025-10': { 'Mobile App': { days: 20, status: 'approved' } },
                    '2025-11': { 'Mobile App': { days: 16, status: 'approved' }, 'API Gateway': { days: 4, status: 'pending' } },
                    '2025-12': { 'API Gateway': { days: 20, status: 'approved' } },
                    '2026-01': { 'API Gateway': { days: 15, status: 'pending' }, 'Innovation Project': { days: 5, status: 'pending' } },
                    '2026-02': { 'Innovation Project': { days: 18, status: 'pending' }, 'Mobile App': { days: 2, status: 'pending' } },
                    '2026-03': { 'Mobile App': { days: 20, status: 'pending' } }
                }
            },
            {
                id: 'roberto-galli',
                firstName: 'Roberto',
                lastName: 'Galli',
                role: 'Database Admin',
                vendor: 'Vendor A',
                maxCapacity: 22,
                currentUtilization: 60,
                allocations: {
                    '2025-01': { 'CRM System': { days: 14, status: 'approved' }, 'Maintenance': { days: 4, status: 'approved' } },
                    '2025-02': { 'CRM System': { days: 12, status: 'approved' }, 'E-Commerce Platform': { days: 6, status: 'approved' } },
                    '2025-03': { 'E-Commerce Platform': { days: 16, status: 'approved' }, 'Payment System': { days: 4, status: 'pending' } },
                    '2025-04': { 'Payment System': { days: 18, status: 'approved' }, 'Training': { days: 2, status: 'approved' } },
                    '2025-05': { 'Payment System': { days: 14, status: 'approved' }, 'Analytics Dashboard': { days: 6, status: 'approved' } },
                    '2025-06': { 'Analytics Dashboard': { days: 20, status: 'approved' } },
                    '2025-07': { 'Analytics Dashboard': { days: 16, status: 'approved' }, 'API Gateway': { days: 4, status: 'pending' } },
                    '2025-08': { 'FERIE': { days: 15, status: 'approved' }, 'Maintenance': { days: 5, status: 'approved' } },
                    '2025-09': { 'API Gateway': { days: 18, status: 'approved' }, 'Mobile App': { days: 2, status: 'pending' } },
                    '2025-10': { 'Mobile App': { days: 16, status: 'approved' }, 'CRM System': { days: 4, status: 'approved' } },
                    '2025-11': { 'CRM System': { days: 20, status: 'approved' } },
                    '2025-12': { 'CRM System': { days: 14, status: 'approved' }, 'Year End Tasks': { days: 6, status: 'pending' } },
                    '2026-01': { 'Year End Tasks': { days: 18, status: 'pending' }, 'Planning': { days: 2, status: 'pending' } },
                    '2026-02': { 'Planning': { days: 20, status: 'pending' } },
                    '2026-03': { 'Planning': { days: 16, status: 'pending' }, 'New Infrastructure': { days: 4, status: 'pending' } }
                }
            },
            {
                id: 'valentina-costa',
                firstName: 'Valentina',
                lastName: 'Costa',
                role: 'Product Manager',
                vendor: 'Internal',
                maxCapacity: 20,
                currentUtilization: 78,
                allocations: {
                    '2025-01': { 'E-Commerce Platform': { days: 8, status: 'approved' }, 'Mobile App': { days: 8, status: 'approved' }, 'Planning': { days: 4, status: 'approved' } },
                    '2025-02': { 'Mobile App': { days: 10, status: 'approved' }, 'CRM System': { days: 6, status: 'approved' }, 'Strategy': { days: 4, status: 'pending' } },
                    '2025-03': { 'CRM System': { days: 12, status: 'approved' }, 'Analytics Dashboard': { days: 8, status: 'approved' } },
                    '2025-04': { 'Analytics Dashboard': { days: 16, status: 'approved' }, 'Product Research': { days: 4, status: 'pending' } },
                    '2025-05': { 'Analytics Dashboard': { days: 10, status: 'approved' }, 'Payment System': { days: 8, status: 'approved' }, 'Training': { days: 2, status: 'approved' } },
                    '2025-06': { 'Payment System': { days: 16, status: 'approved' }, 'Market Analysis': { days: 4, status: 'pending' } },
                    '2025-07': { 'Payment System': { days: 12, status: 'approved' }, 'API Gateway': { days: 6, status: 'approved' }, 'FERIE': { days: 2, status: 'approved' } },
                    '2025-08': { 'FERIE': { days: 12, status: 'approved' }, 'API Gateway': { days: 8, status: 'pending' } },
                    '2025-09': { 'API Gateway': { days: 14, status: 'approved' }, 'Mobile App': { days: 6, status: 'approved' } },
                    '2025-10': { 'Mobile App': { days: 12, status: 'approved' }, 'E-Commerce Platform': { days: 8, status: 'pending' } },
                    '2025-11': { 'E-Commerce Platform': { days: 16, status: 'approved' }, 'Roadmap Planning': { days: 4, status: 'approved' } },
                    '2025-12': { 'Roadmap Planning': { days: 18, status: 'approved' }, 'Budget Planning': { days: 2, status: 'pending' } },
                    '2026-01': { 'Budget Planning': { days: 16, status: 'pending' }, 'Q1 Strategy': { days: 4, status: 'pending' } },
                    '2026-02': { 'Q1 Strategy': { days: 20, status: 'pending' } },
                    '2026-03': { 'Q1 Strategy': { days: 12, status: 'pending' }, 'Innovation Lab': { days: 8, status: 'pending' } }
                }
            },
            {
                id: 'davide-ricci',
                firstName: 'Davide',
                lastName: 'Ricci',
                role: 'Security Engineer',
                vendor: 'Vendor C',
                maxCapacity: 20,
                currentUtilization: 82,
                allocations: {
                    '2025-01': { 'E-Commerce Platform': { days: 10, status: 'approved' }, 'Security Audit': { days: 8, status: 'approved' } },
                    '2025-02': { 'CRM System': { days: 14, status: 'approved' }, 'Compliance': { days: 4, status: 'approved' } },
                    '2025-03': { 'Payment System': { days: 16, status: 'approved' }, 'Penetration Testing': { days: 4, status: 'pending' } },
                    '2025-04': { 'Payment System': { days: 18, status: 'approved' }, 'Documentation': { days: 2, status: 'approved' } },
                    '2025-05': { 'API Gateway': { days: 15, status: 'approved' }, 'Security Training': { days: 3, status: 'approved' }, 'Audit': { days: 2, status: 'pending' } },
                    '2025-06': { 'API Gateway': { days: 18, status: 'approved' }, 'Monitoring': { days: 2, status: 'approved' } },
                    '2025-07': { 'Analytics Dashboard': { days: 12, status: 'approved' }, 'Infrastructure Security': { days: 8, status: 'approved' } },
                    '2025-08': { 'Infrastructure Security': { days: 16, status: 'approved' }, 'FERIE': { days: 4, status: 'approved' } },
                    '2025-09': { 'Mobile App': { days: 14, status: 'approved' }, 'Vulnerability Assessment': { days: 6, status: 'pending' } },
                    '2025-10': { 'Mobile App': { days: 12, status: 'approved' }, 'E-Commerce Platform': { days: 8, status: 'approved' } },
                    '2025-11': { 'E-Commerce Platform': { days: 16, status: 'approved' }, 'Security Review': { days: 4, status: 'pending' } },
                    '2025-12': { 'Security Review': { days: 18, status: 'approved' }, 'Year End Audit': { days: 2, status: 'approved' } },
                    '2026-01': { 'Year End Audit': { days: 14, status: 'pending' }, 'New Security Framework': { days: 6, status: 'pending' } },
                    '2026-02': { 'New Security Framework': { days: 20, status: 'pending' } },
                    '2026-03': { 'New Security Framework': { days: 16, status: 'pending' }, 'Q1 Security Assessment': { days: 4, status: 'pending' } }
                }
            },
            {
                id: 'chiara-fontana',
                firstName: 'Chiara',
                lastName: 'Fontana',
                role: 'Data Analyst',
                vendor: 'Vendor A',
                maxCapacity: 22,
                currentUtilization: 72,
                allocations: {
                    '2025-01': { 'Analytics Dashboard': { days: 16, status: 'approved' }, 'Data Migration': { days: 4, status: 'approved' } },
                    '2025-02': { 'Analytics Dashboard': { days: 18, status: 'approved' }, 'Reporting': { days: 2, status: 'approved' } },
                    '2025-03': { 'Analytics Dashboard': { days: 14, status: 'approved' }, 'CRM System': { days: 6, status: 'pending' } },
                    '2025-04': { 'CRM System': { days: 20, status: 'approved' }, 'Training': { days: 2, status: 'approved' } },
                    '2025-05': { 'CRM System': { days: 16, status: 'approved' }, 'Payment System': { days: 4, status: 'approved' } },
                    '2025-06': { 'Payment System': { days: 18, status: 'approved' }, 'Data Quality': { days: 4, status: 'pending' } },
                    '2025-07': { 'Payment System': { days: 14, status: 'approved' }, 'API Gateway': { days: 6, status: 'approved' } },
                    '2025-08': { 'API Gateway': { days: 20, status: 'approved' }, 'FERIE': { days: 2, status: 'approved' } },
                    '2025-09': { 'API Gateway': { days: 16, status: 'approved' }, 'Mobile App': { days: 4, status: 'approved' } },
                    '2025-10': { 'Mobile App': { days: 18, status: 'approved' }, 'Analytics Dashboard': { days: 4, status: 'pending' } },
                    '2025-11': { 'Analytics Dashboard': { days: 20, status: 'approved' }, 'BI Dashboard': { days: 2, status: 'pending' } },
                    '2025-12': { 'BI Dashboard': { days: 22, status: 'approved' } },
                    '2026-01': { 'BI Dashboard': { days: 18, status: 'pending' }, 'ML Pipeline': { days: 4, status: 'pending' } },
                    '2026-02': { 'ML Pipeline': { days: 20, status: 'pending' }, 'Data Warehouse': { days: 2, status: 'pending' } },
                    '2026-03': { 'Data Warehouse': { days: 22, status: 'pending' } }
                }
            },
            {
                id: 'stefano-mancini',
                firstName: 'Stefano',
                lastName: 'Mancini',
                role: 'DevOps Engineer',
                vendor: 'Vendor B',
                maxCapacity: 20,
                currentUtilization: 92,
                allocations: {
                    '2025-01': { 'Infrastructure': { days: 12, status: 'approved' }, 'E-Commerce Platform': { days: 6, status: 'approved' }, 'Monitoring': { days: 2, status: 'approved' } },
                    '2025-02': { 'E-Commerce Platform': { days: 14, status: 'approved' }, 'CRM System': { days: 6, status: 'approved' } },
                    '2025-03': { 'CRM System': { days: 16, status: 'approved' }, 'CI/CD Pipeline': { days: 4, status: 'pending' } },
                    '2025-04': { 'CI/CD Pipeline': { days: 18, status: 'approved' }, 'Infrastructure': { days: 2, status: 'approved' } },
                    '2025-05': { 'Payment System': { days: 16, status: 'approved' }, 'Security Setup': { days: 4, status: 'approved' } },
                    '2025-06': { 'Payment System': { days: 14, status: 'approved' }, 'Analytics Dashboard': { days: 6, status: 'pending' } },
                    '2025-07': { 'Analytics Dashboard': { days: 18, status: 'approved' }, 'Cloud Migration': { days: 2, status: 'pending' } },
                    '2025-08': { 'Cloud Migration': { days: 20, status: 'approved' } },
                    '2025-09': { 'API Gateway': { days: 16, status: 'approved' }, 'Backup Systems': { days: 4, status: 'approved' } },
                    '2025-10': { 'API Gateway': { days: 14, status: 'approved' }, 'Mobile App': { days: 6, status: 'pending' } },
                    '2025-11': { 'Mobile App': { days: 18, status: 'approved' }, 'Infrastructure': { days: 2, status: 'approved' } },
                    '2025-12': { 'Infrastructure': { days: 20, status: 'approved' } },
                    '2026-01': { 'Infrastructure': { days: 16, status: 'pending' }, 'Kubernetes Migration': { days: 4, status: 'pending' } },
                    '2026-02': { 'Kubernetes Migration': { days: 18, status: 'pending' }, 'Automation': { days: 2, status: 'pending' } },
                    '2026-03': { 'Automation': { days: 20, status: 'pending' } }
                }
            },
            {
                id: 'elena-benedetti',
                firstName: 'Elena',
                lastName: 'Benedetti',
                role: 'Scrum Master',
                vendor: 'Internal',
                maxCapacity: 20,
                currentUtilization: 68,
                allocations: {
                    '2025-01': { 'Team Coordination': { days: 8, status: 'approved' }, 'E-Commerce Platform': { days: 6, status: 'approved' }, 'Mobile App': { days: 4, status: 'approved' } },
                    '2025-02': { 'Team Coordination': { days: 10, status: 'approved' }, 'Mobile App': { days: 6, status: 'approved' }, 'CRM System': { days: 4, status: 'pending' } },
                    '2025-03': { 'CRM System': { days: 8, status: 'approved' }, 'Analytics Dashboard': { days: 8, status: 'approved' }, 'Process Improvement': { days: 4, status: 'approved' } },
                    '2025-04': { 'Analytics Dashboard': { days: 12, status: 'approved' }, 'Payment System': { days: 6, status: 'pending' }, 'Training': { days: 2, status: 'approved' } },
                    '2025-05': { 'Payment System': { days: 10, status: 'approved' }, 'API Gateway': { days: 8, status: 'approved' }, 'ALLINEAMENTO': { days: 2, status: 'approved' } },
                    '2025-06': { 'API Gateway': { days: 14, status: 'approved' }, 'Agile Coaching': { days: 6, status: 'approved' } },
                    '2025-07': { 'Agile Coaching': { days: 16, status: 'approved' }, 'Team Building': { days: 4, status: 'pending' } },
                    '2025-08': { 'Team Building': { days: 18, status: 'approved' }, 'FERIE': { days: 2, status: 'approved' } },
                    '2025-09': { 'Mobile App': { days: 12, status: 'approved' }, 'Performance Review': { days: 8, status: 'approved' } },
                    '2025-10': { 'Performance Review': { days: 16, status: 'approved' }, 'Sprint Planning': { days: 4, status: 'approved' } },
                    '2025-11': { 'Sprint Planning': { days: 18, status: 'approved' }, 'Retrospectives': { days: 2, status: 'approved' } },
                    '2025-12': { 'Retrospectives': { days: 14, status: 'approved' }, 'Q4 Review': { days: 6, status: 'pending' } },
                    '2026-01': { 'Q4 Review': { days: 12, status: 'pending' }, 'Q1 Planning': { days: 8, status: 'pending' } },
                    '2026-02': { 'Q1 Planning': { days: 20, status: 'pending' } },
                    '2026-03': { 'Q1 Planning': { days: 16, status: 'pending' }, 'Process Optimization': { days: 4, status: 'pending' } }
                }
            }
        ];
    }

    /**
     * Data Service Layer - Abstract all data access
     * These methods can be replaced with real API calls in the future
     */
    
    // === TEAM DATA SERVICES ===
    /**
     * Get all team members - abstraction layer for future API integration
     */
    async getTeamMembers() {
        // TODO: Replace with actual API call
        // return await this.api.getTeamMembers();
        return this.getMockTeamMembers();
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
            return this.generateDefaultCapacityData(memberId, monthKey);
        }
        return member.allocations[monthKey];
    }
    
    /**
     * Generate default/mock capacity data when no real data exists
     */
    generateDefaultCapacityData(memberId, monthKey) {
        // TODO: Replace with intelligent defaults based on historical data
        const mockDays = Math.floor(Math.random() * 20) + 1;
        return {
            [`Mock Project ${monthKey.slice(-2)}`]: {
                days: mockDays,
                status: 'pending'
            }
        };
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
    populateOverviewFilters() {
        const teamMembers = this.getMockTeamMembers();
        
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
        
        console.log('Overview filters populated with', teamMembers.length, 'team members');
    }

    /**
     * Load and populate the capacity planning table
     */
    loadCapacityTable() {
        const teamMembers = this.getMockTeamMembers();
        const tableBody = document.getElementById('capacity-table-body');
        
        if (!tableBody) {
            console.warn('Capacity table body not found');
            return;
        }

        // Generate table rows for each team member and their allocations
        let tableHTML = '';
        
        teamMembers.forEach(member => {
            // Get all projects this member is allocated to across all months
            const allProjects = new Set();
            Object.values(member.allocations).forEach(monthAllocations => {
                Object.keys(monthAllocations).forEach(project => allProjects.add(project));
            });
            
            const projects = Array.from(allProjects);
            
            projects.forEach((project, index) => {
                const isFirstProject = index === 0;
                const memberName = `${member.firstName} ${member.lastName}`;
                const memberRole = `${member.role} - ${member.vendor}`;
                
                // Generate month cells for this project allocation
                const monthCells = this.getTimelineMonths().map(monthKey => {
                    const monthData = member.allocations[monthKey];
                    const projectData = monthData && monthData[project];
                    
                    if (projectData) {
                        const statusIcon = projectData.status === 'approved' ? '✅' : '🟡';
                        const statusClass = projectData.status;
                        return `
                            <td class="timeline-cell editable-cell ${statusClass}" 
                                title="${memberName} - ${project}: ${projectData.days} MDs (${projectData.status})">
                                <input type="number" class="capacity-mds-input" 
                                       value="${projectData.days}" 
                                       min="0" 
                                       step="1" 
                                       data-member-id="${member.id}"
                                       data-project="${project}"
                                       data-month="${monthKey}"
                                       data-original-value="${projectData.days}">
                                <button type="button" class="reset-capacity-mds-btn" 
                                        title="Reset to original value" 
                                        data-member-id="${member.id}"
                                        data-project="${project}"
                                        data-month="${monthKey}">
                                    <i class="fas fa-undo"></i>
                                </button>
                            </td>
                        `;
                    } else {
                        const mockDays = Math.floor(Math.random() * 20) + 1;
                        return `<td class="timeline-cell editable-cell mock" 
                                    title="Mock: ${mockDays} MD - ${memberName} - ${project}">
                                <input type="number" class="capacity-mds-input" 
                                       value="${mockDays}" 
                                       min="0" 
                                       step="1" 
                                       data-member-id="${member.id}"
                                       data-project="${project}"
                                       data-month="${monthKey}"
                                       data-original-value="${mockDays}">
                                <button type="button" class="reset-capacity-mds-btn" 
                                        title="Reset to original value" 
                                        data-member-id="${member.id}"
                                        data-project="${project}"
                                        data-month="${monthKey}">
                                    <i class="fas fa-undo"></i>
                                </button>
                            </td>`;
                    }
                }).join('');
                
                tableHTML += `
                    <tr class="capacity-row" data-member="${member.id}" data-project="${project}">
                        ${isFirstProject ? `
                            <td class="fixed-col col-member" rowspan="${projects.length}">
                                <div class="member-info">
                                    <span class="member-name">${memberName}</span>
                                    <span class="member-details">${memberRole}</span>
                                </div>
                            </td>
                        ` : ''}
                        <td class="fixed-col col-project">${project}</td>
                        <td class="fixed-col col-status">
                            <div class="project-status">
                                ${this.generateProjectStatus(member, project)}
                            </div>
                        </td>
                        ${monthCells}
                    </tr>
                `;
            });
        });
        
        tableBody.innerHTML = tableHTML;
        
        // Initialize event listeners for editable cells
        this.initializeCapacityCellEventListeners();
        
        console.log('Capacity table loaded with', teamMembers.length, 'team members');
    }

    /**
     * Initialize event listeners for editable capacity cells
     */
    initializeCapacityCellEventListeners() {
        // Add event listeners for capacity input changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('capacity-mds-input')) {
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

        console.log('Capacity cell event listeners initialized');
    }

    /**
     * Handle capacity value change
     */
    handleCapacityValueChange(input) {
        const memberId = input.dataset.memberId;
        const project = input.dataset.project;
        const month = input.dataset.month;
        const newValue = parseInt(input.value) || 0;

        console.log(`Capacity changed: ${memberId} - ${project} - ${month}: ${newValue} MDs`);
        
        // Here you would typically save the change to your data structure
        // and potentially trigger recalculations
        this.updateCapacityValue(memberId, project, month, newValue);
        
        // Mark as modified (visual feedback)
        input.classList.add('modified');
        
        // Update tooltip
        const originalValue = input.dataset.originalValue;
        const cell = input.closest('td');
        if (cell) {
            const currentTitle = cell.title;
            cell.title = currentTitle.replace(/: \d+ MDs/, `: ${newValue} MDs`) + 
                       (newValue != originalValue ? ` (Original: ${originalValue})` : '');
        }
    }

    /**
     * Handle capacity value reset
     */
    handleCapacityValueReset(button) {
        const memberId = button.dataset.memberId;
        const project = button.dataset.project;
        const month = button.dataset.month;
        
        // Find the corresponding input
        const input = document.querySelector(
            `input[data-member-id="${memberId}"][data-project="${project}"][data-month="${month}"]`
        );
        
        if (input) {
            const originalValue = parseInt(input.dataset.originalValue) || 0;
            input.value = originalValue;
            input.classList.remove('modified');
            
            console.log(`Capacity reset: ${memberId} - ${project} - ${month}: back to ${originalValue} MDs`);
            
            // Update data structure
            this.updateCapacityValue(memberId, project, month, originalValue);
            
            // Update tooltip
            const cell = input.closest('td');
            if (cell) {
                const memberName = this.getMockTeamMembers().find(m => m.id === memberId);
                const displayName = memberName ? `${memberName.firstName} ${memberName.lastName}` : memberId;
                cell.title = `${displayName} - ${project}: ${originalValue} MDs`;
            }
        }
    }

    /**
     * Update capacity value in data structure
     */
    updateCapacityValue(memberId, project, month, newValue) {
        // This is a placeholder for updating the actual data structure
        // In a real implementation, you would update your data model here
        console.log(`Updating data: ${memberId} - ${project} - ${month} = ${newValue} MDs`);
        
        // You might want to:
        // 1. Update the mock data structure
        // 2. Trigger recalculations
        // 3. Mark data as dirty for saving
        // 4. Validate the new value
        
        // For now, just log the change
        const teamMembers = this.getMockTeamMembers();
        const member = teamMembers.find(m => m.id === memberId);
        if (member && member.allocations && member.allocations[month] && member.allocations[month][project]) {
            member.allocations[month][project].days = newValue;
            member.allocations[month][project].modified = true;
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
        
        console.log(`Generating capacity cell for ${member.firstName} ${member.lastName} - ${monthKey} with filter: ${statusFilterValue}`);
        
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
    loadTeamMemberOptions() {
        const teamMembers = this.getMockTeamMembers();
        const teamFilter = document.getElementById('team-filter');
        
        if (!teamFilter) return;
        
        let options = '<option value="">All Team Members</option>';
        
        // Add individual team members only
        teamMembers.forEach(member => {
            options += `<option value="${member.id}">${member.firstName} ${member.lastName}</option>`;
        });
        
        teamFilter.innerHTML = options;
        console.log('Team member options loaded for filters');
    }

    /**
     * Load vendor options for filters
     */
    loadVendorOptions() {
        const teamMembers = this.getMockTeamMembers();
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
        console.log('Vendor options loaded for filters');
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
    applyFilters() {
        console.log('Applying filters:', this.currentFilters);
        
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
                const memberData = this.getMockTeamMembers().find(m => m.id === row.dataset.member);
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
        
        console.log('Filters applied successfully');
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
        
        console.log('Timeline range updated:', this.currentFilters.timeline, 'months');
    }

    /**
     * Navigate timeline (previous/next)
     */
    navigateTimeline(direction) {
        console.log(`Navigate timeline: ${direction > 0 ? 'next' : 'previous'}`);
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
    showAddAssignmentModal() {
        console.log('Show add assignment modal');
        // This would open the assignment modal
        // For now, just log the action  
        NotificationManager.info('Add Assignment: Feature in development');
    }

    /**
     * Edit team member
     */
    editTeamMember(memberId) {
        console.log('Edit team member:', memberId);
        // This would open the edit team member modal
        NotificationManager.info(`Edit Team Member ${memberId}: Feature in development`);
    }

    /**
     * Edit assignment
     */
    editAssignment(assignmentId) {
        console.log('Edit assignment:', assignmentId);
        NotificationManager.info(`Edit Assignment ${assignmentId}: Feature in development`);
    }

    /**
     * Approve assignment
     */
    approveAssignment(assignmentId) {
        console.log('Approve assignment:', assignmentId);
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
        console.log('View assignment details:', assignmentId);
        NotificationManager.info(`View Assignment Details ${assignmentId}: Feature in development`);
    }

    /**
     * View team member details
     */
    viewMemberDetails(memberId) {
        console.log('View member details:', memberId);
        // This would show detailed member information
        NotificationManager.info(`View Member Details ${memberId}: Feature in development`);
    }

    /**
     * Export capacity data
     */
    exportCapacityData() {
        console.log('Export capacity data');
        // This would export current capacity data to Excel/CSV
        NotificationManager.info('Export Capacity Data: Feature in development');
    }

    /**
     * Export capacity table data
     */
    exportCapacityTable() {
        console.log('Export capacity table');
        // This would export the table data to Excel/CSV
        NotificationManager.info('Export Capacity Table: Feature in development');
    }

    /**
     * Refresh capacity data
     */
    refresh() {
        console.log('Refreshing capacity data...');
        NotificationManager.info('Refreshing capacity planning data...');
        this.loadInitialData();
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
}

// Make CapacityManager available globally
if (typeof window !== 'undefined') {
    window.CapacityManager = CapacityManager;
}

// Make CalculationsManager available globally
if (typeof window !== 'undefined') {
    window.CalculationsManager = CalculationsManager;
}