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
                            <div class="allocation-chart-container" id="allocation-chart">
                                <!-- Chart will be generated here -->
                            </div>
                        </div>
                    </div>

                    <!-- Capacity Timeline Overview -->
                    <div class="analytics-card timeline-overview">
                        <div class="card-header">
                            <h3><i class="fas fa-calendar-alt"></i> 6-Month Capacity Overview</h3>
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
        const currentMonth = '2024-08'; // Could be dynamic based on the filter
        
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

        // Generate HTML for each project
        const chartHTML = sortedProjects.map(([projectName, resources]) => {
            const totalDays = resources.reduce((sum, resource) => sum + resource.days, 0);
            
            const resourcesHTML = resources.map(resource => `
                <div class="resource-allocation">
                    <div class="resource-info">
                        <span class="resource-name">${resource.resource}</span>
                        <span class="resource-role">${resource.role} (${resource.vendor})</span>
                    </div>
                    <div class="resource-days">
                        <span class="days-count ${resource.status === 'approved' ? 'approved' : 'pending'}">${resource.days} MDs</span>
                        <span class="status-indicator ${resource.status === 'approved' ? 'approved' : 'pending'}">${resource.status === 'approved' ? '✓' : '⏳'}</span>
                    </div>
                </div>
            `).join('');
            
            return `
                <div class="project-allocation-section">
                    <div class="project-header">
                        <h4 class="project-name">${projectName}</h4>
                        <span class="project-total">${totalDays} MDs total</span>
                    </div>
                    <div class="project-resources">
                        ${resourcesHTML}
                    </div>
                </div>
            `;
        }).join('');

        chartContainer.innerHTML = chartHTML || '<div class="no-data">No project allocations found for the selected period</div>';
    }

    // Load Timeline Overview Chart
    loadTimelineOverviewChart() {
        const chartContainer = document.getElementById('timeline-overview-chart');
        
        // Generate 6 months of mock data
        const months = [];
        const currentDate = new Date();
        
        for (let i = 0; i < 6; i++) {
            const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
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
                        <span class="performance-value">${Object.keys(member.allocations?.['2024-12'] || {}).length || 1}</span>
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
            this.loadOverviewData();
            
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
                <div class="stats-panel">
                    <div class="panel-header">
                        <h2>📊 Resource Capacity Overview</h2>
                        <div class="overview-filters">
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
                            <div class="table-actions">
                                <button id="refresh-capacity-btn" class="btn-secondary">
                                    🔄 Refresh
                                </button>
                                <button id="export-capacity-btn" class="btn-secondary">
                                    📊 Export
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="capacity-overview-grid" id="capacity-overview-grid">
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
                    <div class="capacity-table-header">
                        <h2>📋 Capacity Planning Timeline</h2>
                        <div class="table-actions">
                            <button id="add-assignment-btn" class="btn-primary">
                                ➕ Add Assignment
                            </button>
                            <button id="export-table-btn" class="btn-secondary">
                                📊 Export Table
                            </button>
                            <button id="refresh-timeline-btn" class="btn-secondary">
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                    
                    <!-- Table Filters -->
                    <div class="capacity-filters">
                        <div class="filter-group">
                            <label for="team-filter">Team:</label>
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
                            <label for="timeline-range">Timeline:</label>
                            <select id="timeline-range" class="filter-select">
                                <option value="15">15 months</option>
                                <option value="12">12 months</option>
                                <option value="6">6 months</option>
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
                                    <!-- Scrollable month columns will be generated dynamically -->
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
            overviewMemberFilter.addEventListener('change', () => this.updateCapacityOverview());
        }

        if (overviewStatusFilter) {
            overviewStatusFilter.addEventListener('change', () => this.updateCapacityOverview());
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
        const timelineRange = document.getElementById('timeline-range');
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

        if (timelineRange) {
            timelineRange.addEventListener('change', (e) => {
                this.currentFilters.timeline = e.target.value;
                this.updateTimelineRange();
                this.updateCapacityOverview();
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
    loadOverviewData() {
        // Populate overview filters
        this.populateOverviewFilters();
        
        // Generate capacity overview
        this.generateCapacityOverview();
        
        console.log('Overview data loaded');
    }

    /**
     * Load timeline-specific data
     */
    loadTimelineData() {
        // Load project options for filters
        this.loadProjectOptions();
        
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
        <div class="stats-panel">
            <div class="panel-header">
                <h2>📊 Resource Capacity Overview</h2>
                <div class="overview-filters">
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
            </div>
            <div class="capacity-overview-grid" id="capacity-overview-grid">
                <!-- Dynamic capacity overview will be generated here -->
            </div>
        </div>

        <!-- Capacity Planning Table -->
        <div class="capacity-table-container">
            <div class="capacity-table-header">
                <h2>📋 Capacity Planning Timeline</h2>
                <div class="table-actions">
                    <button id="add-assignment-btn" class="btn-primary">
                        ➕ Add Assignment
                    </button>
                    <button id="export-table-btn" class="btn-secondary">
                        📊 Export Table
                    </button>
                </div>
            </div>
            
            <!-- Table Filters -->
            <div class="capacity-filters">
                <div class="filter-group">
                    <label for="team-filter">Team:</label>
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
                    <label for="timeline-range">Timeline:</label>
                    <select id="timeline-range" class="filter-select">
                        <option value="15">15 months</option>
                        <option value="12">12 months</option>
                        <option value="6">6 months</option>
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
                            <th class="month-col" data-month="2024-01">Jan 24</th>
                            <th class="month-col" data-month="2024-02">Feb 24</th>
                            <th class="month-col" data-month="2024-03">Mar 24</th>
                            <th class="month-col" data-month="2024-04">Apr 24</th>
                            <th class="month-col" data-month="2024-05">May 24</th>
                            <th class="month-col" data-month="2024-06">Jun 24</th>
                            <th class="month-col" data-month="2024-07">Jul 24</th>
                            <th class="month-col" data-month="2024-08">Aug 24</th>
                            <th class="month-col" data-month="2024-09">Sep 24</th>
                            <th class="month-col" data-month="2024-10">Oct 24</th>
                            <th class="month-col" data-month="2024-11">Nov 24</th>
                            <th class="month-col" data-month="2024-12">Dec 24</th>
                            <th class="month-col" data-month="2025-01">Jan 25</th>
                            <th class="month-col" data-month="2025-02">Feb 25</th>
                            <th class="month-col" data-month="2025-03">Mar 25</th>
                        </tr>
                    </thead>
                    <tbody id="capacity-table-body">
                        <!-- Table rows will be populated here -->
                        <tr class="no-data-row">
                            <td colspan="11" class="no-data-message">
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
        </section>
        `;
    }

    /**
     * Initialize event listeners for capacity planning
     */
    initializeEventListeners() {
        // Overview filter listeners
        const overviewMemberFilter = document.getElementById('overview-member-filter');
        const overviewStatusFilter = document.getElementById('overview-status-filter');

        if (overviewMemberFilter) {
            overviewMemberFilter.addEventListener('change', () => this.updateCapacityOverview());
        }

        if (overviewStatusFilter) {
            overviewStatusFilter.addEventListener('change', () => this.updateCapacityOverview());
        }

        // Filter event listeners
        const teamFilter = document.getElementById('team-filter');
        const projectsFilter = document.getElementById('projects-filter');
        const timelineRange = document.getElementById('timeline-range');
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

        if (timelineRange) {
            timelineRange.addEventListener('change', (e) => {
                this.currentFilters.timeline = e.target.value;
                this.updateTimelineRange();
                this.updateCapacityOverview(); // Update overview when timeline changes
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Action button listeners
        this.initializeActionListeners();
        
        // Timeline navigation listeners
        this.initializeTimelineListeners();
        
        console.log('Capacity planning event listeners initialized');
    }

    /**
     * Populate overview filters with team member options
     */
    populateOverviewFilters() {
        const teamMembers = this.getMockTeamMembers();
        const memberFilter = document.getElementById('overview-member-filter');
        
        if (memberFilter) {
            // Clear existing options except "All Members"
            memberFilter.innerHTML = '<option value="">All Members</option>';
            
            // Add team member options
            teamMembers.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = `${member.firstName} ${member.lastName} (${member.role})`;
                memberFilter.appendChild(option);
            });
        }
    }

    /**
     * Update capacity overview based on current filters
     */
    updateCapacityOverview() {
        this.generateCapacityOverview();
    }

    /**
     * Initialize action button listeners
     */
    initializeActionListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-capacity-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Export button
        const exportBtn = document.getElementById('export-capacity-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCapacityData());
        }

        // Export table button
        const exportTableBtn = document.getElementById('export-table-btn');
        if (exportTableBtn) {
            exportTableBtn.addEventListener('click', () => this.exportCapacityTable());
        }

        // Add assignment buttons (main table actions)
        const addAssignmentBtn = document.getElementById('add-assignment-btn');
        if (addAssignmentBtn) {
            addAssignmentBtn.addEventListener('click', () => this.showAddAssignmentModal());
        }
        
        // Create first assignment button (for empty state)
        const createFirstRowBtn = document.getElementById('create-first-row-btn');
        if (createFirstRowBtn) {
            createFirstRowBtn.addEventListener('click', () => this.showAddAssignmentModal());
        }
        
        console.log('Action listeners initialized for capacity table');
    }

    /**
     * Initialize timeline navigation listeners
     */
    initializeTimelineListeners() {
        const prevBtn = document.getElementById('prev-months-btn');
        const nextBtn = document.getElementById('next-months-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateTimeline(-1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateTimeline(1));
        }
    }

    /**
     * Load initial data for capacity planning
     */
    loadInitialData() {
        // Populate overview filters
        this.populateOverviewFilters();
        
        // Load team members
        this.loadTeamMembers();
        
        // Load project assignments
        this.loadProjectAssignments();
        
        // Update statistics (capacity overview)
        this.updateStatistics();
        
        // Load project options for filters
        this.loadProjectOptions();
        
        console.log('Initial data loaded for capacity planning');
    }

    /**
     * Get mock team members with project allocations
     */
    getMockTeamMembers() {
        return [
            {
                id: 'tm-001',
                firstName: 'Mario',
                lastName: 'Rossi',
                role: 'G2',
                vendor: 'Vendor A',
                monthlyCapacity: 22,
                allocations: {
                    '2024-01': { 
                        'Customer Portal': { days: 20, status: 'approved' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' }
                    },
                    '2024-02': { 
                        'Customer Portal': { days: 19, status: 'approved' },
                        'Training': { days: 1, status: 'pending' }
                    },
                    '2024-03': { 
                        'Customer Portal': { days: 18, status: 'approved' },
                        'FERIE': { days: 4, status: 'approved' }
                    },
                    '2024-04': { 
                        'Customer Portal': { days: 21, status: 'approved' },
                        'ALLINEAMENTO': { days: 1, status: 'approved' }
                    },
                    '2024-05': { 
                        'Customer Portal': { days: 20, status: 'approved' },
                        'Innovation Lab': { days: 2, status: 'pending' }
                    },
                    '2024-06': { 
                        'Customer Portal': { days: 19, status: 'approved' },
                        'Testing': { days: 3, status: 'pending' }
                    },
                    '2024-07': { 
                        'Customer Portal': { days: 15, status: 'approved' },
                        'FERIE': { days: 7, status: 'approved' }
                    },
                    '2024-08': { 
                        'Customer Portal': { days: 18, status: 'approved' },
                        'FERIE': { days: 4, status: 'approved' }
                    },
                    '2024-09': { 
                        'Customer Portal': { days: 16, status: 'approved' },
                        'Mobile App': { days: 6, status: 'pending' }
                    },
                    '2024-10': { 
                        'Customer Portal': { days: 10, status: 'approved' },
                        'Mobile App': { days: 7, status: 'pending' },
                        'API Gateway': { days: 5, status: 'pending' }
                    },
                    '2024-11': { 
                        'Mobile App': { days: 18, status: 'approved' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' },
                        'Data Migration': { days: 2, status: 'pending' }
                    },
                    '2024-12': { 
                        'Mobile App': { days: 8, status: 'approved' },
                        'FERIE': { days: 10, status: 'approved' },
                        'New Project': { days: 4, status: 'pending' }
                    },
                    '2025-01': { 
                        'API Gateway': { days: 20, status: 'approved' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' }
                    },
                    '2025-02': { 
                        'API Gateway': { days: 15, status: 'approved' },
                        'New Project': { days: 7, status: 'pending' }
                    },
                    '2025-03': { 
                        'API Gateway': { days: 12, status: 'approved' },
                        'New Project': { days: 6, status: 'pending' },
                        'FERIE': { days: 4, status: 'approved' }
                    }
                }
            },
            {
                id: 'tm-002',
                firstName: 'Anna',
                lastName: 'Bianchi',
                role: 'PM',
                vendor: 'Internal',
                monthlyCapacity: 20,
                allocations: {
                    '2024-01': { 
                        'Strategic Planning': { days: 18, status: 'approved' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' }
                    },
                    '2024-02': { 
                        'Strategic Planning': { days: 17, status: 'approved' },
                        'Training': { days: 3, status: 'pending' }
                    },
                    '2024-03': { 
                        'Customer Portal': { days: 15, status: 'approved' },
                        'FERIE': { days: 5, status: 'approved' }
                    },
                    '2024-04': { 
                        'Customer Portal': { days: 18, status: 'approved' },
                        'Quality Review': { days: 2, status: 'pending' }
                    },
                    '2024-05': { 
                        'Customer Portal': { days: 19, status: 'approved' },
                        'ALLINEAMENTO': { days: 1, status: 'approved' }
                    },
                    '2024-06': { 
                        'Customer Portal': { days: 17, status: 'approved' },
                        'Process Improvement': { days: 3, status: 'pending' }
                    },
                    '2024-07': { 
                        'Customer Portal': { days: 12, status: 'approved' },
                        'Mobile App': { days: 5, status: 'approved' },
                        'FERIE': { days: 3, status: 'approved' }
                    },
                    '2024-08': { 
                        'Customer Portal': { days: 8, status: 'approved' },
                        'Mobile App': { days: 12, status: 'approved' }
                    },
                    '2024-09': { 
                        'Customer Portal': { days: 6, status: 'approved' },
                        'Mobile App': { days: 10, status: 'approved' },
                        'Testing': { days: 4, status: 'pending' }
                    },
                    '2024-10': { 
                        'API Gateway': { days: 15, status: 'approved' },
                        'Testing': { days: 5, status: 'pending' }
                    },
                    '2024-11': { 
                        'API Gateway': { days: 12, status: 'approved' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' },
                        'Quality Assurance': { days: 6, status: 'pending' }
                    },
                    '2024-12': { 
                        'API Gateway': { days: 10, status: 'approved' },
                        'FERIE': { days: 5, status: 'approved' },
                        'Quality Assurance': { days: 5, status: 'pending' }
                    },
                    '2025-01': { 
                        'Data Migration': { days: 16, status: 'approved' },
                        'Documentation': { days: 4, status: 'pending' }
                    },
                    '2025-02': { 
                        'Data Migration': { days: 14, status: 'approved' },
                        'Documentation': { days: 6, status: 'pending' }
                    },
                    '2025-03': { 
                        'Data Migration': { days: 12, status: 'approved' },
                        'Documentation': { days: 4, status: 'pending' },
                        'FERIE': { days: 4, status: 'approved' }
                    }
                }
            },
            {
                id: 'tm-003',
                firstName: 'Luca',
                lastName: 'Verdi',
                role: 'G1',
                vendor: 'Vendor A',
                monthlyCapacity: 22,
                allocations: {
                    '2024-01': { 
                        'Architecture Review': { days: 16, status: 'approved' },
                        'Training': { days: 4, status: 'approved' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' }
                    },
                    '2024-02': { 
                        'Architecture Review': { days: 18, status: 'approved' },
                        'Code Review': { days: 2, status: 'pending' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' }
                    },
                    '2024-03': { 
                        'System Design': { days: 15, status: 'approved' },
                        'FERIE': { days: 5, status: 'approved' },
                        'Technical Docs': { days: 2, status: 'pending' }
                    },
                    '2024-04': { 
                        'System Design': { days: 19, status: 'approved' },
                        'Code Review': { days: 3, status: 'pending' }
                    },
                    '2024-05': { 
                        'Customer Portal': { days: 18, status: 'approved' },
                        'Research': { days: 2, status: 'pending' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' }
                    },
                    '2024-06': { 
                        'Customer Portal': { days: 16, status: 'approved' },
                        'Performance Testing': { days: 4, status: 'pending' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' }
                    },
                    '2024-07': { 
                        'Customer Portal': { days: 14, status: 'approved' },
                        'Mobile App': { days: 3, status: 'approved' },
                        'FERIE': { days: 5, status: 'approved' }
                    },
                    '2024-08': { 
                        'Mobile App': { days: 20, status: 'approved' },
                        'Research': { days: 2, status: 'pending' }
                    },
                    '2024-09': { 
                        'Mobile App': { days: 18, status: 'approved' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' },
                        'Research': { days: 2, status: 'pending' }
                    },
                    '2024-10': { 
                        'Mobile App': { days: 12, status: 'approved' },
                        'Data Migration': { days: 7, status: 'approved' },
                        'Innovation Lab': { days: 3, status: 'pending' }
                    },
                    '2024-11': { 
                        'Data Migration': { days: 16, status: 'approved' },
                        'Innovation Lab': { days: 6, status: 'pending' }
                    },
                    '2024-12': { 
                        'Data Migration': { days: 8, status: 'approved' },
                        'FERIE': { days: 12, status: 'approved' },
                        'Innovation Lab': { days: 2, status: 'pending' }
                    },
                    '2025-01': { 
                        'Customer Portal V2': { days: 18, status: 'approved' },
                        'Training': { days: 4, status: 'pending' }
                    },
                    '2025-02': { 
                        'Customer Portal V2': { days: 16, status: 'approved' },
                        'Training': { days: 6, status: 'pending' }
                    },
                    '2025-03': { 
                        'Customer Portal V2': { days: 14, status: 'approved' },
                        'Training': { days: 6, status: 'pending' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' }
                    }
                }
            },
            {
                id: 'tm-004',
                firstName: 'Sofia',
                lastName: 'Conti',
                role: 'TA',
                vendor: 'Internal',
                monthlyCapacity: 20,
                allocations: {
                    '2024-08': { 
                        'Testing Portal': { days: 18, status: 'approved' },
                        'Automation': { days: 2, status: 'pending' }
                    },
                    '2024-09': { 
                        'Testing Portal': { days: 10, status: 'approved' },
                        'Testing Mobile': { days: 5, status: 'approved' },
                        'Automation': { days: 5, status: 'pending' }
                    },
                    '2024-10': { 
                        'Testing Mobile': { days: 15, status: 'approved' },
                        'Performance Testing': { days: 5, status: 'pending' }
                    },
                    '2024-11': { 
                        'Testing Mobile': { days: 12, status: 'approved' },
                        'FERIE': { days: 2, status: 'approved' },
                        'Performance Testing': { days: 6, status: 'pending' }
                    },
                    '2024-12': { 
                        'Testing API': { days: 12, status: 'approved' },
                        'FERIE': { days: 5, status: 'approved' },
                        'Security Testing': { days: 3, status: 'pending' }
                    },
                    '2025-01': { 
                        'Testing API': { days: 16, status: 'approved' },
                        'Security Testing': { days: 4, status: 'pending' }
                    },
                    '2025-02': { 
                        'Testing API': { days: 14, status: 'approved' },
                        'ALLINEAMENTO': { days: 2, status: 'approved' },
                        'E2E Testing': { days: 4, status: 'pending' }
                    },
                    '2025-03': { 
                        'Testing Data': { days: 16, status: 'approved' },
                        'E2E Testing': { days: 4, status: 'pending' }
                    }
                }
            }
        ];
    }

    /**
     * Get project colors for visual distinction
     */
    getProjectColors() {
        return {
            'Customer Portal': '#007acc',
            'Mobile App': '#6a9955', 
            'API Gateway': '#c586c0',
            'Data Migration': '#d16969',
            'Customer Portal V2': '#4fc1e9',
            'Testing Portal': '#f7ca18',
            'Testing Mobile': '#e67e22',
            'Testing API': '#9b59b6',
            'Testing Data': '#1abc9c',
            'FERIE': '#ffce54',
            'ALLINEAMENTO': '#9cdcfe'
        };
    }

    /**
     * Load team members data
     */
    loadTeamMembers() {
        // Use mock data for demonstration
        const teamMembers = this.getMockTeamMembers();
        
        const teamList = document.getElementById('team-members-list');
        if (!teamList) return;

        if (teamMembers.length === 0) {
            teamList.innerHTML = `
                <div class="no-team-data">
                    <p>No team members configured yet.</p>
                    <button class="btn-primary" id="add-first-member-btn">Add First Team Member</button>
                </div>
            `;
            
            // Re-attach event listener for the new button
            const addFirstMemberBtn = document.getElementById('add-first-member-btn');
            if (addFirstMemberBtn) {
                addFirstMemberBtn.addEventListener('click', () => this.showAddTeamMemberModal());
            }
        } else {
            teamList.innerHTML = teamMembers.map(member => this.renderTeamMemberCard(member)).join('');
        }
        
        console.log(`Loaded ${teamMembers.length} team members`);
    }

    /**
     * Render team member card
     */
    renderTeamMemberCard(member) {
        const statusClass = this.getTeamMemberStatus(member);
        const statusText = this.getTeamMemberStatusText(member);
        
        return `
            <div class="team-member-card" data-member-id="${member.id}">
                <div class="member-info">
                    <div class="member-avatar">${member.firstName.charAt(0)}</div>
                    <div class="member-details">
                        <h3>${member.firstName} ${member.lastName}</h3>
                        <p class="member-role">${member.role} - ${member.vendor}</p>
                        <p class="member-capacity">${member.monthlyCapacity} MD/month</p>
                    </div>
                </div>
                <div class="member-status">
                    <span class="status-indicator ${statusClass}">${statusText}</span>
                    <div class="member-actions">
                        <button class="btn-icon" onclick="window.capacityManager?.editTeamMember('${member.id}')" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="window.capacityManager?.viewMemberDetails('${member.id}')" title="Details">📊</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get team member status class
     */
    getTeamMemberStatus(member) {
        // This would normally check current allocations
        // For now, return available as default
        return 'available';
    }

    /**
     * Get team member status text
     */
    getTeamMemberStatusText(member) {
        // This would normally check current allocations
        // For now, return available as default
        return '✅ Available';
    }

    /**
     * Load project assignments data
     */
    loadProjectAssignments() {
        // Load capacity table with mock data
        this.loadCapacityTable();
        
        console.log('Capacity table loaded with mock assignment data');
    }

    /**
     * Load timeline with team member allocations
     */
    loadTimeline() {
        // This method is now replaced by loadCapacityTable()
        this.loadCapacityTable();
    }

    /**
     * Load capacity planning table with member-project rows
     */
    loadCapacityTable() {
        const tableBody = document.getElementById('capacity-table-body');
        if (!tableBody) return;

        // Generate table header with dynamic months
        this.generateTableHeader();

        // Generate table rows from mock data
        const tableRows = this.generateCapacityTableRows();
        
        if (tableRows.length > 0) {
            tableBody.innerHTML = tableRows.join('');
        } else {
            tableBody.innerHTML = `
                <tr class="no-data-row">
                    <td colspan="11" class="no-data-message">
                        <div class="no-data-content">
                            <i class="fas fa-table"></i>
                            <p>No capacity assignments configured yet.</p>
                            <button class="btn-primary" id="create-first-row-btn">Create First Assignment</button>
                        </div>
                    </td>
                </tr>
            `;
            
            // Re-attach event listener
            const createFirstRowBtn = document.getElementById('create-first-row-btn');
            if (createFirstRowBtn) {
                createFirstRowBtn.addEventListener('click', () => this.showAddAssignmentModal());
            }
        }
        
        console.log(`Capacity table loaded with ${tableRows.length} assignments`);
    }

    /**
     * Generate table header with dynamic month columns
     */
    generateTableHeader() {
        const tableHeader = document.querySelector('#capacity-table thead tr');
        if (!tableHeader) return;

        const months = this.getTimelineMonths();
        const currentDate = new Date();
        
        // Clear existing month columns and regenerate
        const existingMonthCols = tableHeader.querySelectorAll('.month-col');
        existingMonthCols.forEach(col => col.remove());
        
        // Generate new month columns
        months.forEach((monthDisplay, index) => {
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + index, 1);
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            
            const th = document.createElement('th');
            th.className = 'month-col';
            th.setAttribute('data-month', monthKey);
            th.textContent = monthDisplay;
            
            tableHeader.appendChild(th);
        });
    }

    /**
     * Generate capacity table rows from mock data
     */
    generateCapacityTableRows() {
        const teamMembers = this.getMockTeamMembers();
        const months = this.getTimelineMonths();
        const projectColors = this.getProjectColors();
        const currentDate = new Date();
        
        const tableRows = [];
        
        teamMembers.forEach(member => {
            // Get all unique projects for this member
            const memberProjects = new Set();
            Object.values(member.allocations || {}).forEach(monthAllocation => {
                Object.keys(monthAllocation).forEach(project => {
                    memberProjects.add(project);
                });
            });
            
            // Create a row for each member + project combination
            Array.from(memberProjects).sort((a, b) => {
                // Sort: work projects first, then special projects
                const isSpecialA = ['FERIE', 'ALLINEAMENTO'].includes(a);
                const isSpecialB = ['FERIE', 'ALLINEAMENTO'].includes(b);
                
                if (isSpecialA && !isSpecialB) return 1;
                if (!isSpecialA && isSpecialB) return -1;
                return a.localeCompare(b);
            }).forEach(project => {
                const isSpecialProject = ['FERIE', 'ALLINEAMENTO'].includes(project);
                const projectColor = projectColors[project] || '#007acc';
                const rowId = `${member.id}-${project.replace(/\s+/g, '-').toLowerCase()}`;
                
                // Generate month cells for this member-project combination
                const monthCells = months.map((monthDisplay, index) => {
                    const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + index, 1);
                    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
                    
                    const monthAllocations = member.allocations[monthKey] || {};
                    const projectDays = monthAllocations[project] || 0;
                    
                    const cellContent = projectDays > 0 ? 
                        `<div class="month-allocation has-allocation" 
                              style="background-color: ${projectColor};"
                              title="${project}: ${projectDays} MDs in ${monthKey}"
                              data-member="${member.id}"
                              data-project="${project}"
                              data-month="${monthKey}"
                              data-days="${projectDays}">
                            ${projectDays}
                        </div>` :
                        `<div class="month-allocation no-allocation">-</div>`;
                    
                    return `<td class="month-cell" data-month="${monthKey}">${cellContent}</td>`;
                }).join('');
                
                // Determine status based on project type and allocation
                let status = 'approved';
                if (isSpecialProject) {
                    status = 'approved'; // FERIE and ALLINEAMENTO are always approved
                } else {
                    // For work projects, you could implement logic to determine status
                    status = Math.random() > 0.3 ? 'approved' : 'pending'; // Mock status
                }
                
                const tableRow = `
                    <tr class="capacity-row" data-row-id="${rowId}" data-member="${member.id}" data-project="${project}">
                        <td class="fixed-col col-member">
                            <div class="member-info-cell">
                                <div class="member-avatar-small" style="background-color: ${projectColor};">
                                    ${member.firstName.charAt(0)}
                                </div>
                                <div>
                                    <div class="member-name">${member.firstName} ${member.lastName}</div>
                                    <div class="member-role-small">${member.role} - ${member.vendor}</div>
                                </div>
                            </div>
                        </td>
                        <td class="fixed-col col-project">
                            <div class="project-cell ${isSpecialProject ? 'special-project' : ''}">${project}</div>
                        </td>
                        <td class="fixed-col col-status">
                            <span class="status-badge-small ${status}">${status.toUpperCase()}</span>
                        </td>
                        ${monthCells}
                    </tr>
                `;
                
                tableRows.push(tableRow);
            });
        });
        
        return tableRows;
    }

    /**
     * Generate allocations for a team member across months
     */
    generateMemberAllocations(member, months, projectColors) {
        const currentDate = new Date();
        
        return months.map((monthDisplay, index) => {
            // Convert month display to YYYY-MM format
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + index, 1);
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            
            const monthAllocations = member.allocations[monthKey] || {};
            
            // Check for overflow
            const totalAllocated = Object.values(monthAllocations).reduce((sum, days) => sum + days, 0);
            const hasOverflow = totalAllocated > member.monthlyCapacity;
            
            // Generate allocation blocks for this month
            let allocationBlocks = '';
            
            Object.entries(monthAllocations).forEach(([project, days]) => {
                const color = projectColors[project] || '#666666';
                const isSpecial = ['FERIE', 'ALLINEAMENTO'].includes(project);
                const blockClass = isSpecial ? `special-${project.toLowerCase()}` : 'project-block';
                
                allocationBlocks += `
                    <div class="allocation-block ${blockClass}" 
                         style="background-color: ${color}; margin-bottom: 2px;"
                         title="${project}: ${days} MDs"
                         data-project="${project}"
                         data-days="${days}">
                        <div class="allocation-label">${this.truncateProjectName(project)}</div>
                        <div class="allocation-days">${days}d</div>
                    </div>
                `;
            });
            
            // Add overflow indicator if needed
            const overflowIndicator = hasOverflow ? 
                `<div class="overflow-indicator" title="Overflow: ${totalAllocated - member.monthlyCapacity} MDs">
                    ⚠️ ${totalAllocated - member.monthlyCapacity}
                </div>` : '';
            
            return `
                <div class="timeline-month-cell ${hasOverflow ? 'has-overflow' : ''}" 
                     data-month="${monthKey}"
                     data-member="${member.id}">
                    ${allocationBlocks}
                    ${overflowIndicator}
                    <div class="capacity-summary">
                        <small>${totalAllocated}/${member.monthlyCapacity}</small>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Generate allocations for a specific member-project combination across months
     */
    generateProjectAllocations(member, projectName, months, projectColors) {
        const currentDate = new Date();
        const projectColor = projectColors[projectName] || '#666666';
        const isSpecialProject = ['FERIE', 'ALLINEAMENTO'].includes(projectName);
        
        return months.map((monthDisplay, index) => {
            // Convert month display to YYYY-MM format
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + index, 1);
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            
            const monthAllocations = member.allocations[monthKey] || {};
            const projectDays = monthAllocations[projectName] || 0;
            
            // Generate allocation block only if this project has days in this month
            let allocationBlock = '';
            if (projectDays > 0) {
                const blockClass = isSpecialProject ? `special-${projectName.toLowerCase()}` : 'project-block';
                
                allocationBlock = `
                    <div class="allocation-block ${blockClass}" 
                         style="background-color: ${projectColor};"
                         title="${projectName}: ${projectDays} MDs in ${monthKey}"
                         data-project="${projectName}"
                         data-days="${projectDays}">
                        <div class="allocation-label">${projectDays}</div>
                        <div class="allocation-unit">MDs</div>
                    </div>
                `;
            }
            
            return `
                <div class="timeline-month-cell project-month-cell ${projectDays > 0 ? 'has-allocation' : ''}" 
                     data-month="${monthKey}"
                     data-member="${member.id}"
                     data-project="${projectName}"
                     data-days="${projectDays}">
                    ${allocationBlock}
                    ${projectDays === 0 ? '<div class="no-allocation">-</div>' : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Truncate long project names for display
     */
    truncateProjectName(projectName) {
        if (projectName.length <= 12) return projectName;
        return projectName.substring(0, 10) + '...';
    }

    /**
     * Generate mock assignments for the assignments panel
     */
    generateMockAssignments() {
        return [
            {
                id: 'pa-001',
                projectName: 'Customer Portal',
                teamMember: 'Mario Rossi',
                startDate: '2024-08-01',
                endDate: '2024-10-31',
                totalMDs: 55,
                status: 'approved',
                progress: 35
            },
            {
                id: 'pa-002', 
                projectName: 'Mobile App',
                teamMember: 'Mario Rossi',
                startDate: '2024-10-15',
                endDate: '2024-12-31',
                totalMDs: 41,
                status: 'approved',
                progress: 0
            },
            {
                id: 'pa-003',
                projectName: 'API Gateway',
                teamMember: 'Anna Bianchi',
                startDate: '2024-10-01',
                endDate: '2024-12-31',
                totalMDs: 53,
                status: 'approved',
                progress: 15
            },
            {
                id: 'pa-004',
                projectName: 'Data Migration',
                teamMember: 'Anna Bianchi',
                startDate: '2025-01-01',
                endDate: '2025-03-31',
                totalMDs: 56,
                status: 'pending',
                progress: 0
            }
        ];
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
    updateStatistics() {
        // Generate capacity overview grid
        this.generateCapacityOverview();
    }

    /**
     * Generate capacity overview showing resource allocation by month
     */
    generateCapacityOverview() {
        const overviewContainer = document.getElementById('capacity-overview-grid');
        if (!overviewContainer) return;

        const teamMembers = this.getMockTeamMembers();
        const months = this.getTimelineMonths();
        const currentDate = new Date();
        
        // Generate table structure
        const tableHTML = this.buildCapacityOverviewTable(teamMembers, months, currentDate);
        overviewContainer.innerHTML = tableHTML;
        
        console.log('Capacity overview generated for', teamMembers.length, 'resources across', months.length, 'months');
    }

    /**
     * Build the capacity overview table HTML
     */
    buildCapacityOverviewTable(teamMembers, months, currentDate) {
        // Get current member filter
        const memberFilter = document.getElementById('overview-member-filter');
        const selectedMemberId = memberFilter ? memberFilter.value : '';
        
        // Filter team members if specific member selected
        let filteredMembers = teamMembers;
        if (selectedMemberId) {
            filteredMembers = teamMembers.filter(member => member.id === selectedMemberId);
        }
        
        // Generate month headers
        const monthHeaders = months.map(monthDisplay => 
            `<th class="month-header">${monthDisplay}</th>`
        ).join('');
        
        // Generate rows for each filtered team member
        const memberRows = filteredMembers.map(member => {
            const memberName = `${member.firstName} ${member.lastName}`;
            const memberRole = `${member.role} - ${member.vendor}`;
            
            // Generate month cells for this member
            const monthCells = months.map((monthDisplay, index) => {
                const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + index, 1);
                const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
                
                return this.generateMonthCapacityCell(member, monthKey);
            }).join('');
            
            return `
                <tr class="capacity-overview-row" data-member="${member.id}">
                    <td class="resource-name">
                        <div class="resource-info">
                            <div class="resource-name-text">${memberName}</div>
                            <div class="resource-role">${memberRole}</div>
                        </div>
                    </td>
                    ${monthCells}
                </tr>
            `;
        }).join('');
        
        // Show message if no members match filter
        const noDataRow = filteredMembers.length === 0 ? `
            <tr>
                <td class="resource-name">No members match the selected filter</td>
                ${months.map(() => '<td class="capacity-month-cell"><span style="color: #666;">-</span></td>').join('')}
            </tr>
        ` : '';
        
        return `
            <table class="capacity-overview-table">
                <thead>
                    <tr>
                        <th class="resource-name">Resource</th>
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
    generateMonthCapacityCell(member, monthKey) {
        const monthAllocations = member.allocations[monthKey] || {};
        const maxCapacity = member.monthlyCapacity || 22;
        
        // Get current overview status filter
        const overviewStatusFilter = document.getElementById('overview-status-filter');
        const statusFilterValue = overviewStatusFilter ? overviewStatusFilter.value : 'all';
        
        // Calculate MDs based on status filter
        let totalAllocated = 0;
        let approvedMDs = 0;
        let pendingMDs = 0;
        
        Object.entries(monthAllocations).forEach(([project, allocation]) => {
            const days = allocation.days || 0;
            const status = allocation.status || 'approved';
            
            // Count totals for display
            if (status === 'approved') {
                approvedMDs += days;
            } else if (status === 'pending') {
                pendingMDs += days;
            }
            
            // Calculate allocated based on filter
            switch (statusFilterValue) {
                case 'approved':
                    if (status === 'approved') totalAllocated += days;
                    break;
                case 'pending':
                    if (status === 'pending') totalAllocated += days;
                    break;
                case 'all':
                default:
                    totalAllocated += days;
                    break;
            }
        });
        
        // Calculate percentage based on filtered allocation
        const utilizationPercentage = maxCapacity > 0 ? Math.round((totalAllocated / maxCapacity) * 100) : 0;
        
        // Determine color class based on utilization
        let percentageClass = 'low';
        if (utilizationPercentage >= 90) {
            percentageClass = 'high';
        } else if (utilizationPercentage >= 70) {
            percentageClass = 'medium';
        }
        
        // Generate breakdown display based on filter
        let breakdownContent = '';
        if (statusFilterValue === 'all') {
            breakdownContent = `
                ${approvedMDs > 0 ? `<span class="approved-mds">✓ ${approvedMDs} MDs</span>` : ''}
                ${pendingMDs > 0 ? `<span class="pending-mds">⏳ ${pendingMDs} MDs</span>` : ''}
            `;
        } else if (statusFilterValue === 'approved') {
            breakdownContent = `<span class="approved-mds">✓ ${approvedMDs} MDs</span>`;
        } else if (statusFilterValue === 'pending') {
            breakdownContent = `<span class="pending-mds">⏳ ${pendingMDs} MDs</span>`;
        }
        
        // Generate cell content
        const cellContent = totalAllocated > 0 ? `
            <div class="capacity-cell">
                <span class="capacity-percentage ${percentageClass}">${utilizationPercentage}%</span>
                <div class="capacity-breakdown">
                    ${breakdownContent}
                </div>
                <div class="filter-indicator">
                    <small>${statusFilterValue === 'all' ? 'Forecast' : statusFilterValue.toUpperCase()}</small>
                </div>
            </div>
        ` : `
            <div class="capacity-cell">
                <span class="capacity-percentage low">0%</span>
                <div class="capacity-breakdown">
                    <span style="color: #666;">Available</span>
                </div>
            </div>
        `;
        
        // Generate tooltip information
        const allMDs = approvedMDs + pendingMDs;
        const tooltipText = statusFilterValue === 'all' 
            ? `${member.firstName} ${member.lastName} - ${monthKey}: ${allMDs}/${maxCapacity} MDs (Approved: ${approvedMDs}, Pending: ${pendingMDs})`
            : `${member.firstName} ${member.lastName} - ${monthKey}: ${totalAllocated}/${maxCapacity} MDs (${statusFilterValue} only)`;
        
        return `
            <td class="capacity-month-cell" 
                data-month="${monthKey}" 
                data-member="${member.id}"
                data-utilization="${utilizationPercentage}"
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
        // This would filter the displayed data based on current filters
        console.log('Applying filters:', this.currentFilters);
        
        // For now, just log the filters
        // In a full implementation, this would update the visible data
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