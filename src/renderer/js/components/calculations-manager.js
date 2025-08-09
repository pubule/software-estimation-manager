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
            this.teamManager = new TeamManager();
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
     * Render the capacity planning section
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
                    <p>Loading capacity planning...</p>
                </div>
            `;

            // Initialize components
            this.initializeComponents();

            // Load capacity section HTML content
            const capacityHTML = await this.loadCapacitySectionHTML();
            
            if (capacityHTML) {
                // Extract the section content from the loaded HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = capacityHTML;
                
                const capacitySection = tempDiv.querySelector('#capacity-section');
                if (capacitySection) {
                    // Remove the section wrapper and use its content
                    container.innerHTML = capacitySection.innerHTML;
                    
                    // Initialize event listeners
                    this.initializeEventListeners();
                    
                    // Load initial data
                    this.loadInitialData();
                    
                    console.log('Capacity planning section rendered successfully');
                } else {
                    throw new Error('Capacity section not found in loaded HTML');
                }
            } else {
                throw new Error('Failed to load capacity section HTML');
            }
        } catch (error) {
            console.error('Error rendering capacity section:', error);
            container.innerHTML = this.renderErrorState(error.message);
        }
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
        <div class="section-header">
            <h1>📊 Capacity Planning</h1>
            <div class="header-actions">
                <button id="refresh-capacity-btn" class="btn-secondary">
                    🔄 Refresh
                </button>
                <button id="export-capacity-btn" class="btn-secondary">
                    📊 Export
                </button>
            </div>
        </div>

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
                    <option value="all">Approved + Pending</option>
                    <option value="approved">Approved Only</option>
                    <option value="pending">Pending Only</option>
                </select>
            </div>
        </div>

        <div class="capacity-main-grid">
            <div class="team-panel">
                <div class="panel-header">
                    <h2>👥 Team Members</h2>
                    <button id="add-team-member-btn" class="btn-primary">
                        ➕ Add Member
                    </button>
                </div>
                <div class="team-list" id="team-members-list">
                    <div class="no-team-data">
                        <p>No team members configured yet.</p>
                        <button class="btn-primary" id="add-first-member-btn">Add First Team Member</button>
                    </div>
                </div>
            </div>

            <div class="timeline-panel">
                <div class="panel-header">
                    <h2>📅 Project Timeline</h2>
                    <div class="timeline-controls">
                        <button id="prev-months-btn" class="btn-icon">◀</button>
                        <span id="timeline-range-display">${this.getTimelineRangeDisplay()}</span>
                        <button id="next-months-btn" class="btn-icon">▶</button>
                    </div>
                </div>
                <div class="timeline-header">
                    <div class="timeline-months">
                        ${this.generateTimelineMonths()}
                    </div>
                </div>
                <div class="timeline-body" id="timeline-body">
                    <div class="no-timeline-data">
                        <p>No project assignments configured yet.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="assignments-panel">
            <div class="panel-header">
                <h2>📋 Project Assignments</h2>
                <button id="add-assignment-btn" class="btn-primary">
                    ➕ New Assignment
                </button>
            </div>
            <div class="assignments-list" id="assignments-list">
                <div class="no-assignments-data">
                    <p>No project assignments configured yet.</p>
                    <button class="btn-primary" id="create-first-assignment-btn">Create First Assignment</button>
                </div>
            </div>
        </div>

        <div class="stats-panel">
            <div class="panel-header">
                <h2>📈 Capacity Statistics</h2>
            </div>
            <div class="statistics-grid">
                <div class="stat-card">
                    <div class="stat-value">0</div>
                    <div class="stat-label">Total Team</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">0</div>
                    <div class="stat-label">Active Projects</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">0 MDs</div>
                    <div class="stat-label">This Month Capacity</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">0%</div>
                    <div class="stat-label">Utilization Rate</div>
                </div>
            </div>
        </div>
        </section>
        `;
    }

    /**
     * Initialize event listeners for capacity planning
     */
    initializeEventListeners() {
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

        // Add team member buttons
        const addMemberBtn = document.getElementById('add-team-member-btn');
        const addFirstMemberBtn = document.getElementById('add-first-member-btn');
        
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', () => this.showAddTeamMemberModal());
        }
        
        if (addFirstMemberBtn) {
            addFirstMemberBtn.addEventListener('click', () => this.showAddTeamMemberModal());
        }

        // Add assignment buttons
        const addAssignmentBtn = document.getElementById('add-assignment-btn');
        const createFirstAssignmentBtn = document.getElementById('create-first-assignment-btn');
        
        if (addAssignmentBtn) {
            addAssignmentBtn.addEventListener('click', () => this.showAddAssignmentModal());
        }
        
        if (createFirstAssignmentBtn) {
            createFirstAssignmentBtn.addEventListener('click', () => this.showAddAssignmentModal());
        }
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
        // Load team members
        this.loadTeamMembers();
        
        // Load project assignments
        this.loadProjectAssignments();
        
        // Update statistics
        this.updateStatistics();
        
        // Load project options for filters
        this.loadProjectOptions();
        
        console.log('Initial data loaded for capacity planning');
    }

    /**
     * Load team members data
     */
    loadTeamMembers() {
        // Get team members from TeamManager
        const teamMembers = this.teamManager?.getTeamMembers() || [];
        
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
        // This would load actual project assignments
        // For now, show empty state
        const assignmentsList = document.getElementById('assignments-list');
        if (!assignmentsList) return;

        assignmentsList.innerHTML = `
            <div class="no-assignments-data">
                <p>No project assignments configured yet.</p>
                <button class="btn-primary" id="create-first-assignment-btn">Create First Assignment</button>
            </div>
        `;
        
        // Re-attach event listener
        const createFirstAssignmentBtn = document.getElementById('create-first-assignment-btn');
        if (createFirstAssignmentBtn) {
            createFirstAssignmentBtn.addEventListener('click', () => this.showAddAssignmentModal());
        }
        
        console.log('Project assignments loaded (empty state)');
    }

    /**
     * Update capacity statistics
     */
    updateStatistics() {
        const teamMembers = this.teamManager?.getTeamMembers() || [];
        const totalCapacity = teamMembers.reduce((sum, member) => sum + (member.monthlyCapacity || 0), 0);
        
        // Update stat cards
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards.length >= 4) {
            statCards[0].querySelector('.stat-value').textContent = teamMembers.length;
            statCards[1].querySelector('.stat-value').textContent = '0'; // Active projects
            statCards[2].querySelector('.stat-value').textContent = `${totalCapacity} MDs`;
            statCards[3].querySelector('.stat-value').textContent = '0%'; // Utilization
        }
        
        console.log(`Updated statistics - Team: ${teamMembers.length}, Capacity: ${totalCapacity} MDs`);
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
     */
    getTimelineMonths() {
        const monthCount = parseInt(this.currentFilters.timeline);
        const months = [];
        const currentDate = new Date();
        
        for (let i = 0; i < monthCount; i++) {
            const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const monthName = month.toLocaleDateString('en', { month: 'short' });
            const year = month.getFullYear();
            const displayYear = year !== currentDate.getFullYear() ? year.toString().slice(-2) : '';
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