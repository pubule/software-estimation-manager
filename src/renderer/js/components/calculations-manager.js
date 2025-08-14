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
            this.autoDistribution = new AutoDistribution(this.workingDaysCalculator, this.teamManager);
        }

        // Initialize capacity panel event listeners
        this.initializeCapacityPanelEventListeners();

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
            await this.loadDashboardData();
            
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
            console.log('Loaded saved capacity data successfully');
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
                                    <th class="fixed-col col-actions">Actions</th>
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
                                    <td colspan="19" class="no-data-message">
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
        console.log(`Member vendorId: '${member.vendorId}'`);
        console.log(`Member vendorType: '${member.vendorType}'`);
        
        if (!member.vendorId) {
            console.log(`Missing vendorId (${member.vendorId}), defaulting to G2`);
            return 'G2';
        }
        
        if (!this.app?.managers?.configuration) {
            console.log(`Configuration manager not available, checking alternative sources...`);
            
            // Try alternative access paths
            const altConfigManager = this.app?.managers?.config || 
                                   window.app?.managers?.configuration ||
                                   window.configManager;
            
            console.log('Alternative config manager found:', !!altConfigManager);
            
            if (!altConfigManager) {
                console.log(`No configuration manager available, defaulting to G2`);
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
        console.log('=== GENERATE SEQUENTIAL ALLOCATIONS ===');
        console.log('Member:', member.id);
        console.log('Role:', memberRole);  
        console.log('Projects to process:', projects.length);
        
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
            
            console.log(`Processing project ${project.name} with ${project.phases.length} phases`);
            const phaseTimeline = this.calculateProjectPhaseTimeline(project, project.startDate);
            console.log(`Generated ${phaseTimeline.length} timeline phases for project ${project.name}`);
            
            phaseTimeline.forEach(phase => {
                const participation = this.getRoleParticipationInPhase(phase, memberRole);
                console.log(`Phase ${phase.phaseName}: participates=${participation.participates}, roleMDs=${participation.roleMDs}`);
                
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
     * Generate overflow alerts for UI display
     */
    generateOverflowAlerts(teamMembers) {
        const alerts = [];
        
        teamMembers.forEach(member => {
            Object.entries(member.allocations || {}).forEach(([month, projects]) => {
                Object.entries(projects).forEach(([projectName, allocation]) => {
                    if (allocation.hasOverflow) {
                        alerts.push({
                            type: 'overflow',
                            severity: 'error',
                            memberId: member.id,
                            memberName: `${member.firstName} ${member.lastName}`,
                            month: month,
                            projectName: projectName,
                            overflowAmount: allocation.overflowAmount,
                            message: `${member.firstName} ${member.lastName}: ${this.formatMonth(month)} overallocated by ${allocation.overflowAmount} MDs on project "${projectName}"`
                        });
                    }
                });
            });
        });
        
        return alerts;
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
            console.log('Configuration manager available:', !!configManager);
            console.log('Global config available:', !!configManager?.globalConfig);
            
            if (!configManager || !configManager.globalConfig) {
                console.warn('Configuration manager not available, trying direct access...');
                
                // Try to get the global config directly from window or app
                const globalConfig = window.globalConfig || 
                                  this.app?.globalConfig || 
                                  (window.app && window.app.managers && window.app.managers.configuration && window.app.managers.configuration.globalConfig);
                
                if (globalConfig) {
                    console.log('Found global config through alternative path');
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
                console.log(`Team ${team.name} members:`);
                (team.members || []).forEach(member => {
                    console.log(`  - ${member.firstName} ${member.lastName}: vendorId='${member.vendorId}', vendorType='${member.vendorType}'`);
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
                            console.log('Updated global config with corrected team data');
                            
                            // Re-log corrected team data
                            teams.forEach(team => {
                                console.log(`CORRECTED Team ${team.name} members:`);
                                (team.members || []).forEach(member => {
                                    console.log(`  - ${member.firstName} ${member.lastName}: vendorId='${member.vendorId}', vendorType='${member.vendorType}'`);
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
                        console.log(`Initialized ${teams.length} default teams from configuration`);
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
                                console.log(`Loaded ${teams.length} teams from defaults.json`);
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
                    console.log(`Loaded ${projectsList.length} project metadata files`);
                    
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
                    
                    console.log(`Processed ${projects.length} valid projects for capacity calculation`);
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
                    
                    console.log(`Filtered to ${projectsForAutoAllocation.length} projects with dates for automatic allocation`);
                    
                    // Use filtered projects for automatic allocations, original projects list for manual assignments
                    projects = projectsForAutoAllocation;
                }
            } catch (error) {
                console.warn('Error loading projects:', error);
                projects = [];
            }

            // Generate real team members
            console.log('DEBUG: Raw teams data before processing:', teams);
            const realTeamMembers = teams.flatMap(team => 
                (team.members || []).map(member => {
                    console.log('DEBUG: Processing raw team member:', member);
                    console.log('DEBUG: Raw member vendorId:', member.vendorId);
                    
                    const memberRole = this.getMemberRole(member);
                    const vendor = this.resolveVendorName(member);
                    
                    // Generate sequential allocations based on project phases
                    const automaticAllocations = this.generateSequentialAllocations(member, memberRole, projects);
                    
                    // CRITICAL FIX: Create unique composite ID BEFORE merging manual assignments
                    const uniqueId = `${team.id}:${member.id}`;
                    console.log(`DEBUG: Creating unique ID: ${member.id} -> ${uniqueId} (vendorId: ${member.vendorId})`);
                    
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
                            console.log(`  Month ${monthKey}: projects = [${projects.join(', ')}]`);
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

            console.log(`Generated ${realTeamMembers.length} real team members from ${teams.length} teams and ${projects.length} projects`);
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
     * Display overflow alerts in UI
     */
    displayOverflowAlerts(alerts) {
        const alertsContainer = document.querySelector('.capacity-alerts-container') || 
                               document.getElementById('capacity-alerts') ||
                               this.createAlertsContainer();
        
        if (!alertsContainer) return;
        
        if (alerts.length === 0) {
            alertsContainer.style.display = 'none';
            return;
        }
        
        alertsContainer.style.display = 'block';
        alertsContainer.innerHTML = `
            <div class="alerts-header">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Capacity Overflow Alerts (${alerts.length})</h4>
            </div>
            <div class="alerts-list">
                ${alerts.map(alert => `
                    <div class="alert-item alert-high">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>${alert.message}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Create alerts container if it doesn't exist
     */
    createAlertsContainer() {
        const container = document.createElement('div');
        container.className = 'capacity-alerts-container';
        container.style.cssText = `
            margin-bottom: 16px;
            padding: 12px;
            background: #fee;
            border: 1px solid #f56565;
            border-radius: 4px;
            display: none;
        `;
        
        // Try to insert before capacity table
        const tableContainer = document.querySelector('.capacity-table-container') || 
                              document.querySelector('.table-container');
        if (tableContainer && tableContainer.parentNode) {
            tableContainer.parentNode.insertBefore(container, tableContainer);
            return container;
        }
        
        return null;
    }

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
            
            console.log(`Changing status for ${project} (member ${memberId}) to: ${newStatus}`);
            
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
        
        console.log(`Updated ${updatesCount} monthly allocations for ${projectName} to status: ${newStatus}`);
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
                
                console.log(`Consolidated member ${member.firstName} ${member.lastName}: merged allocations from team ${member.teamId}`);
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
                console.log(`Added new consolidated member ${member.firstName} ${member.lastName} (ID: ${consolidatedMember.id}, from: ${member.id})`);
                console.log(`  Allocations months: ${Object.keys(consolidatedMember.allocations).join(', ')}`);
            }
        });
        
        const result = Array.from(consolidated.values());
        console.log(`Consolidated ${teamMembers.length} team member entries into ${result.length} unique persons`);
        
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
     * Load and populate the capacity planning table
     */
    async loadCapacityTable() {
        const rawTeamMembers = await this.getRealTeamMembers();
        const teamMembers = this.consolidateTeamMembersByPerson(rawTeamMembers);
        const tableBody = document.getElementById('capacity-table-body');
        
        if (!tableBody) {
            console.warn('Capacity table body not found');
            return;
        }

        // Generate overflow alerts first
        const overflowAlerts = this.generateOverflowAlerts(teamMembers);
        this.displayOverflowAlerts(overflowAlerts);

        // Generate table rows for each team member and their allocations
        let tableHTML = '';
        
        teamMembers.forEach(member => {
            // Get all projects this member is allocated to across all months
            const allProjects = new Set();
            Object.values(member.allocations).forEach(monthAllocations => {
                Object.keys(monthAllocations).forEach(project => allProjects.add(project));
            });
            
            const projects = Array.from(allProjects);
            
            // Skip members with no project assignments
            if (projects.length === 0) {
                return;
            }
            
            projects.forEach((project, index) => {
                const isFirstProject = index === 0;
                const memberName = `${member.firstName} ${member.lastName}`;
                const memberRole = `${member.role} - ${member.vendor}`;
                
                // Generate month cells for this project allocation
                const monthCells = this.getTimelineMonths().map(monthKey => {
                    // Convert abbreviated month format (e.g., "Aug") to ISO format (e.g., "2025-08")
                    const isoMonthKey = this.convertTimelineToISOMonth(monthKey);
                    const monthData = member.allocations[isoMonthKey];
                    const projectData = monthData && monthData[project];
                    
                    // Debug timeline cell rendering
                    console.log(`Timeline cell debug: month=${monthKey} (ISO: ${isoMonthKey}), project=${project}, hasMonthData=${!!monthData}, hasProjectData=${!!projectData}`);
                    if (monthData) {
                        console.log(`  Month ${monthKey} projects:`, Object.keys(monthData));
                    }
                    
                    if (projectData) {
                        const statusIcon = projectData.status === 'approved' ? '✅' : '🟡';
                        const statusClass = projectData.status;
                        const overflowClass = projectData.hasOverflow ? 'overflow' : '';
                        const phases = projectData.phases ? projectData.phases.map(p => p.phaseName).join(', ') : '';
                        
                        return `
                            <td class="timeline-cell editable-cell ${statusClass} ${overflowClass}" 
                                title="${memberName} - ${project}: ${projectData.days} MDs (${projectData.status})${phases ? ` - Phases: ${phases}` : ''}">
                                <input type="number" class="capacity-mds-input ${overflowClass}" 
                                       value="${projectData.days}" 
                                       min="0" 
                                       step="1" 
                                       data-member-id="${member.id}"
                                       data-project="${project}"
                                       data-month="${isoMonthKey}"
                                       data-original-value="${projectData.days}"
                                       ${projectData.hasOverflow ? 'style="background-color: #fee; border-color: #f56565; color: #c53030;"' : ''}>
                                <button type="button" class="reset-capacity-mds-btn" 
                                        title="Reset to original value" 
                                        data-member-id="${member.id}"
                                        data-project="${project}"
                                        data-month="${isoMonthKey}">
                                    <i class="fas fa-undo"></i>
                                </button>
                                ${projectData.hasOverflow ? '<i class="fas fa-exclamation-triangle overflow-warning" style="color: #f56565; margin-left: 4px;"></i>' : ''}
                            </td>
                        `;
                    } else {
                        return `<td class="timeline-cell empty" 
                                    title="${memberName} - ${project}: No allocation">
                                <span class="no-allocation">-</span>
                            </td>`;
                    }
                }).join('');
                
                // Find the corresponding manual assignment for this member/project combination
                const projectObj = this.getProjectByName(project);
                const assignment = this.findAssignmentForMemberAndProject(member.id, projectObj?.id || project);
                
                tableHTML += `
                    <tr class="capacity-row" data-member="${member.id}" data-project="${project}" ${assignment ? `data-assignment-id="${assignment.id}"` : ''}>
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
                        ${isFirstProject ? `
                            <td class="fixed-col col-member" rowspan="${projects.length}">
                                <div class="member-info">
                                    <span class="member-name">${memberName}</span>
                                    <span class="member-details">${memberRole}</span>
                                    <span class="member-capacity">Max: ${member.maxCapacity} MD/month</span>
                                </div>
                            </td>
                        ` : ''}
                        <td class="fixed-col col-project">${project}</td>
                        <td class="fixed-col col-status">
                            <div class="project-status">
                                ${this.generateProjectStatusFromRealData(member, project)}
                            </div>
                        </td>
                        ${monthCells}
                    </tr>
                `;
            });
        });
        
        // If no assignments exist, show empty table with message
        if (tableHTML.trim() === '') {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="100%" class="empty-capacity-message">
                        <div class="no-assignments">
                            <i class="fas fa-calendar-times"></i>
                            <p>No project assignments found</p>
                            <small>Add team members to projects to see capacity planning data</small>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = tableHTML;
            // Initialize event listeners for editable cells only if we have data
            this.initializeCapacityCellEventListeners();
        }
        
        const assignmentCount = tableHTML.trim() === '' ? 0 : tableBody.querySelectorAll('tr').length;
        console.log(`Capacity table loaded with ${teamMembers.length} team members and ${assignmentCount} project assignments`);
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
    async handleCapacityValueReset(button) {
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
            
            // Update tooltip with real team member data
            const cell = input.closest('td');
            if (cell) {
                const teamMembers = await this.getRealTeamMembers();
                const memberName = teamMembers.find(m => m.id === memberId);
                const displayName = memberName ? `${memberName.firstName} ${memberName.lastName}` : memberId;
                cell.title = `${displayName} - ${project}: ${originalValue} MDs`;
            }
        }
    }

    /**
     * Update capacity value in data structure
     */
    async updateCapacityValue(memberId, project, month, newValue) {
        // This is a placeholder for updating the actual data structure
        // In a real implementation, you would update your data model here
        console.log(`Updating data: ${memberId} - ${project} - ${month} = ${newValue} MDs`);
        
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
        console.log('Real team member options loaded for filters:', teamMembers.length);
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
        console.log('Real vendor options loaded for filters:', vendors.length);
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
        console.log('Applying filters:', this.currentFilters);
        
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
        
        console.log('Filters applied successfully with real team members');
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
        
        console.log('DEBUG: Selected member ID from dropdown:', teamMemberSelect.value);
        
        // Get selected member data
        const teamMembers = await this.getRealTeamMembers();
        console.log('DEBUG: All team members from getRealTeamMembers:', teamMembers);
        
        const selectedMember = teamMembers.find(m => m.id === teamMemberSelect.value);
        console.log('DEBUG: Found selected member:', selectedMember);
        
        if (selectedMember) {
            console.log('DEBUG: Selected member vendorId:', selectedMember.vendorId);
            console.log('DEBUG: Selected member vendorType:', selectedMember.vendorType);
            
            const memberRole = this.getMemberRole(selectedMember);
            const vendorName = this.getVendorName(selectedMember);
            memberRoleInfo.textContent = `Role: ${memberRole}, Vendor: ${vendorName}`;
        } else {
            console.error('DEBUG: No member found with ID:', teamMemberSelect.value);
            console.log('DEBUG: Available member IDs:', teamMembers.map(m => m.id));
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
            
            console.log('=== DEBUG loadProjectForAssignment ===');
            console.log('  - Project ID:', projectId);
            console.log('  - Project metadata:', project);
            console.log('  - Complete project data loaded:', !!completeProjectData);
            console.log('  - Complete project keys:', Object.keys(completeProjectData || {}));
            console.log('  - Project.project available:', !!completeProjectData?.project);
            console.log('  - Project.project.name:', completeProjectData?.project?.name);
            
            // NUOVO: Recupera calculationData dalla versione più recente se disponibile
            if (completeProjectData.versions && completeProjectData.versions.length > 0) {
                console.log('  - Project has versions:', completeProjectData.versions.length);
                
                // Ordina le versioni per ID e prendi la più recente
                const sortedVersions = completeProjectData.versions.sort((a, b) => {
                    // Confronta gli ID delle versioni (es. "v1.0.0" vs "v1.1.0")
                    return b.id.localeCompare(a.id, undefined, { numeric: true });
                });
                
                const latestVersion = sortedVersions[0];
                console.log('  - Latest version ID:', latestVersion.id);
                
                // Usa i calculationData dalla versione più recente se disponibili
                if (latestVersion.projectSnapshot?.calculationData) {
                    completeProjectData.calculationData = latestVersion.projectSnapshot.calculationData;
                    console.log('  - Using calculationData from latest version:', latestVersion.id);
                    console.log('  - Version calculationData.vendorCosts length:', 
                        latestVersion.projectSnapshot.calculationData.vendorCosts?.length || 0);
                } else {
                    console.log('  - Latest version has no calculationData in projectSnapshot');
                }
            } else {
                console.log('  - Project has no versions, will use direct calculationData or generate dynamically');
            }
            
            console.log('  - calculationData available:', !!completeProjectData?.calculationData);
            console.log('  - vendorCosts available:', !!completeProjectData?.calculationData?.vendorCosts);
            console.log('  - vendorCosts length:', completeProjectData?.calculationData?.vendorCosts?.length || 0);
            
            if (completeProjectData?.calculationData?.vendorCosts) {
                console.log('  - Available vendor costs in loaded project:');
                completeProjectData.calculationData.vendorCosts.forEach((cost, index) => {
                    console.log(`    ${index}: vendorId='${cost.vendorId}', role='${cost.role}', finalMDs=${cost.finalMDs}`);
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
                            console.log(`    ${index}: vendorId='${cost.vendorId}', role='${cost.role}', finalMDs=${cost.finalMDs}`);
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
        console.log('getVendorName for member:', teamMember);
        console.log('Member vendorId:', teamMember.vendorId);
        console.log('Member vendorType:', teamMember.vendorType);
        
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
            
            console.log('Alternative config manager found:', !!configManager);
            
            if (!configManager) {
                console.log('No configuration manager available, returning Unknown');
                return 'Unknown';
            }
        }
        
        console.log('Available internal resources:', configManager.globalConfig?.internalResources?.length || 0);
        console.log('Available suppliers:', configManager.globalConfig?.suppliers?.length || 0);
        
        // Check internal resources first
        if (teamMember.vendorType === 'internal') {
            console.log(`Looking for internal resource with ID ${teamMember.vendorId}`);
            const internalResource = configManager.globalConfig?.internalResources?.find(
                r => r.id === teamMember.vendorId
            );
            console.log('Found internal resource:', internalResource);
            if (internalResource) {
                console.log(`Returning internal resource name: ${internalResource.name}`);
                return internalResource.name;
            }
        } else {
            console.log(`Looking for supplier with ID ${teamMember.vendorId}`);
            const supplier = configManager.globalConfig?.suppliers?.find(
                s => s.id === teamMember.vendorId
            );
            console.log('Found supplier:', supplier);
            if (supplier) {
                console.log(`Returning supplier name: ${supplier.name}`);
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
                console.log('Populating project dropdown with:', projects);
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
            console.log('Dropdown population completed');
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
            
            console.log('=== DEBUG updateBudgetSection START ===');
            console.log('  - Dropdown selected value:', teamMemberSelect.value);
            console.log('  - Available team members count:', teamMembers.length);
            console.log('  - Team members IDs:', teamMembers.map(m => `${m.id} (vendorId: ${m.vendorId})`));
            
            const selectedMember = teamMembers.find(m => m.id === teamMemberSelect.value);
            
            if (!selectedMember) {
                console.error('  - CRITICAL: No team member found with ID:', teamMemberSelect.value);
                console.error('  - Available IDs are:', teamMembers.map(m => m.id));
                document.getElementById('total-final-mds').textContent = 'Error: Member not found';
                return;
            }
            
            console.log('  - Selected member found:', selectedMember.firstName, selectedMember.lastName);
            console.log('  - Selected member originalId:', selectedMember.originalId);
            console.log('  - Selected member teamId:', selectedMember.teamId);
            console.log('  - Selected member vendorId:', selectedMember.vendorId);
            console.log('  - Selected member vendorType:', selectedMember.vendorType);
            
            const memberRole = this.getMemberRole(selectedMember);
            const vendorName = this.getVendorName(selectedMember);
            
            console.log('  - Calculated member role:', memberRole);
            console.log('  - Calculated vendor name:', vendorName);
            
            // Find matching vendor cost in project calculation data
            let finalMDs = 0;
            console.log('  - Project name:', completeProject?.project?.name || completeProject?.name);
            console.log('  - Project structure keys:', Object.keys(completeProject || {}));
            console.log('  - Project.project available:', !!completeProject?.project);
            console.log('  - Project calculationData available:', !!completeProject.calculationData);
            console.log('  - VendorCosts available:', !!completeProject.calculationData?.vendorCosts);
            console.log('  - VendorCosts length:', completeProject.calculationData?.vendorCosts?.length || 0);
            
            if (completeProject.calculationData?.vendorCosts) {
                console.log('  - Available vendor costs in project:');
                completeProject.calculationData.vendorCosts.forEach((cost, index) => {
                    console.log(`    ${index}: vendorId='${cost.vendorId}', role='${cost.role}', finalMDs=${cost.finalMDs}, vendor='${cost.vendor}'`);
                });
                
                console.log('  - Searching for match with:');
                console.log(`    vendorId: '${selectedMember.vendorId}' (type: ${typeof selectedMember.vendorId})`);
                console.log(`    role: '${memberRole}' (type: ${typeof memberRole})`);
                
                const vendorCost = completeProject.calculationData.vendorCosts.find(cost => {
                    const vendorIdMatch = cost.vendorId === selectedMember.vendorId;
                    const roleMatch = cost.role === memberRole;
                    console.log(`  - Checking cost: vendorId='${cost.vendorId}' (match: ${vendorIdMatch}), role='${cost.role}' (match: ${roleMatch})`);
                    return vendorIdMatch && roleMatch;
                });
                
                console.log('  - Found matching vendor cost:', vendorCost);
                if (vendorCost) {
                    finalMDs = vendorCost.finalMDs || 0;
                    console.log('  - Using finalMDs:', finalMDs);
                } else {
                    console.log('  - ISSUE: No matching vendor cost found!');
                    console.log('  - Expected match:', `vendorId='${selectedMember.vendorId}' AND role='${memberRole}'`);
                    console.log('  - Available combinations:');
                    completeProject.calculationData.vendorCosts.forEach((cost, index) => {
                        console.log(`    Option ${index}: '${cost.vendorId}' + '${cost.role}' -> ${cost.finalMDs} MDs`);
                    });
                }
            } else {
                console.error('  - CRITICAL: No calculationData.vendorCosts found in project');
            }
            
            console.log('  - Final result: finalMDs =', finalMDs);
            console.log('=== DEBUG updateBudgetSection END ===');
            
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
        
        if (isStartDate) {
            console.log(`Start date changed for phase ${phaseId}, triggering sequential propagation`);
            
            // Find the index of this phase in the DOM
            const phaseItems = document.querySelectorAll('.phase-item');
            let phaseIndex = -1;
            
            for (let i = 0; i < phaseItems.length; i++) {
                if (phaseItems[i].dataset.phaseId === phaseId) {
                    phaseIndex = i;
                    break;
                }
            }
            
            if (phaseIndex !== -1) {
                // Propagate dates to this and all subsequent phases
                this.propagateSequentialDates(phaseIndex, input);
            } else {
                console.warn(`Could not find phase index for ${phaseId}`);
                // Fallback to original behavior
                this.calculatePhaseAvailability(phaseId);
                this.updateBudgetBalance();
            }
        } else {
            // For end date changes, use original behavior
            this.calculatePhaseAvailability(phaseId);
            this.updateBudgetBalance();
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
        const estimatedMDsText = phaseItem.querySelector('.phase-mds').textContent;
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
        console.log('Starting sequential date propagation from phase index:', startingPhaseIndex);
        
        const phaseItems = document.querySelectorAll('.phase-item');
        if (startingPhaseIndex >= phaseItems.length) {
            console.warn('Starting phase index out of bounds');
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
                console.warn(`Missing elements for phase ${phaseId}`);
                continue;
            }
            
            const estimatedMDs = parseFloat(phaseMDsElement.textContent);
            
            if (i === startingPhaseIndex) {
                // For the starting phase, use its current start date (if available)
                const startDateValue = startDateInput.value;
                if (!startDateValue) {
                    console.warn(`No start date available for starting phase ${phaseId}`);
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
                console.log(`Phase ${phaseId}: start=${startDateValue}, end=${endDateString}, MDs=${estimatedMDs}`);
                
            } else {
                // For subsequent phases, start date = next working day after previous phase end
                if (!currentEndDate) {
                    console.warn(`No end date available from previous phase for ${phaseId}`);
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
                console.log(`Phase ${phaseId}: start=${startDateString}, end=${endDateString}, MDs=${estimatedMDs}`);
            }
            
            // Trigger recalculation for this phase
            this.calculatePhaseAvailability(phaseId);
        }
        
        // Update overall budget balance
        this.updateBudgetBalance();
        
        console.log('Sequential date propagation completed');
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
                console.log('Assignment updated:', updatedAssignment.id);
                
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
                    notes: notes,
                    created: new Date().toISOString()
                };

                console.log('Creating new phase-based assignment:', assignment);
                
                // Save assignment
                this.manualAssignments.push(assignment);
                console.log('Assignment added to manualAssignments. Total assignments:', this.manualAssignments.length);
                console.log('manualAssignments:', this.manualAssignments.map(a => ({ id: a.id, teamMemberId: a.teamMemberId, projectId: a.projectId })));
                
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
            
            console.log('All capacity sections refreshed successfully');
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
            console.log('=== CALCULATING PHASE-BASED ALLOCATION ===');
            console.log('TeamMember:', teamMember.id, teamMember.firstName, teamMember.lastName);
            console.log('Project:', completeProject.project.name);
            console.log('Phase Schedule:', phaseSchedule);
            
            const memberRole = this.getMemberRole(teamMember);
            console.log('Member role:', memberRole);
            
            const allocations = {};
            
            // Process each phase in the schedule
            phaseSchedule.forEach(phaseScheduleItem => {
                console.log(`Processing phase: ${phaseScheduleItem.phaseName}`);
                
                // Distribute the estimated MDs across the phase period
                const phaseDistribution = this.distributePhaseAcrossMonths(
                    phaseScheduleItem.estimatedMDs,
                    new Date(phaseScheduleItem.startDate),
                    new Date(phaseScheduleItem.endDate),
                    this.getMonthsInDateRange(new Date(phaseScheduleItem.startDate), new Date(phaseScheduleItem.endDate))
                );
                
                console.log(`Phase ${phaseScheduleItem.phaseName} distribution:`, Object.keys(phaseDistribution));
                
                Object.entries(phaseDistribution).forEach(([month, dayData]) => {
                    if (!allocations[month]) allocations[month] = {};
                    
                    // Add overflow information to the allocation
                    const hasOverflow = phaseScheduleItem.overflow > 0;
                    const overflowAmount = phaseScheduleItem.overflow;
                    
                    if (allocations[month][completeProject.project.name]) {
                        allocations[month][completeProject.project.name].days += dayData.days;
                        allocations[month][completeProject.project.name].phases.push({
                            phaseName: phaseScheduleItem.phaseName,
                            phaseDays: dayData.days,
                            hasOverflow,
                            overflowAmount: hasOverflow ? overflowAmount : 0
                        });
                        
                        // Update overall overflow for the month
                        if (hasOverflow) {
                            allocations[month][completeProject.project.name].hasOverflow = true;
                            allocations[month][completeProject.project.name].overflowAmount += overflowAmount;
                        }
                    } else {
                        allocations[month][completeProject.project.name] = {
                            days: dayData.days,
                            status: completeProject.project.status || 'approved',
                            hasOverflow,
                            overflowAmount: hasOverflow ? overflowAmount : 0,
                            phases: [{
                                phaseName: phaseScheduleItem.phaseName,
                                phaseDays: dayData.days,
                                hasOverflow,
                                overflowAmount: hasOverflow ? overflowAmount : 0
                            }]
                        };
                    }
                });
            });
            
            console.log('Final phase-based allocations:', allocations);
            console.log('Number of months with allocation:', Object.keys(allocations).length);
            
            return allocations;
            
        } catch (error) {
            console.error('Error calculating phase-based allocation:', error);
            throw new Error(`Cannot create assignment: ${error.message}`);
        }
    }
    
    /**
     * Calculate allocation for a manual assignment (LEGACY - keeping for compatibility)
     */
    async calculateAssignmentAllocation(teamMember, project, startDate, endDate) {
        try {
            console.log('=== CALCULATING ASSIGNMENT ALLOCATION ===');
            console.log('TeamMember:', teamMember.id, teamMember.firstName, teamMember.lastName);
            console.log('Project raw:', project);
            console.log('Assignment Dates:', { startDate, endDate });
            
            // Get member role for phase participation calculation
            const memberRole = this.getMemberRole(teamMember);
            console.log('Member role:', memberRole);
            
            // Use the complete project data that was already loaded and passed in
            const completeProjectData = project; // project is already the complete loaded data
            const completeProject = project.project;
            console.log('Using complete project data:', completeProject.name);
            
            // Convert phases object to array if needed (phases are stored as object in JSON at root level)
            let phasesArray = [];
            
            console.log('=== PHASES CONVERSION DEBUG ===');
            console.log('completeProjectData.phases:', completeProjectData.phases);
            console.log('completeProject.phases:', completeProject.phases);
            console.log('phases type:', typeof completeProjectData.phases);
            console.log('phases is array:', Array.isArray(completeProjectData.phases));
            console.log('phases exists:', !!completeProjectData.phases);
            
            if (completeProjectData.phases && typeof completeProjectData.phases === 'object' && !Array.isArray(completeProjectData.phases)) {
                console.log('Converting phases object to array...');
                const phaseKeys = Object.keys(completeProjectData.phases);
                console.log('All phase keys:', phaseKeys);
                
                const filteredKeys = phaseKeys.filter(key => key !== 'selectedSuppliers');
                console.log('Filtered phase keys (excluding selectedSuppliers):', filteredKeys);
                
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
                    console.log(`Skipping phase ${phaseKey} - invalid data`);
                    return null;
                }).filter(phase => phase !== null);
                
                console.log(`Converted phases object to array: ${phasesArray.length} phases`);
                console.log('Final phases array:', phasesArray);
            } else if (Array.isArray(completeProjectData.phases)) {
                phasesArray = completeProjectData.phases;
                console.log(`Project already has phases as array: ${phasesArray.length} phases`);
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
            
            console.log('=== PROJECT VALIDATION ===');
            console.log('Complete project status:', completeProject.status);
            console.log('Final project status:', projectForCalculation.status);
            console.log('Final project name:', projectForCalculation.name);
            console.log('Final project startDate:', projectForCalculation.startDate);
            console.log('Validation checks:');
            console.log('  - hasName:', !!projectForCalculation.name);
            console.log('  - hasStartDate:', !!projectForCalculation.startDate);  
            console.log('  - hasStatus:', !!projectForCalculation.status);
            console.log('  - phasesLength:', projectForCalculation.phases.length);
            
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
            
            console.log('Calculated allocations for assignment:', allocations);
            console.log('Number of months with allocation:', Object.keys(allocations).length);
            
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
        console.log(`Merging assignments for member ${member.id} (${member.firstName} ${member.lastName})`);
        console.log('Manual assignments available:', this.manualAssignments?.length || 0);
        console.log('All manualAssignments:', this.manualAssignments?.map(a => ({ id: a.id, teamMemberId: a.teamMemberId, projectId: a.projectId })));
        console.log('Automatic allocations:', Object.keys(automaticAllocations).length);
        
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
                console.log(`Direct match: assignment ${assignment.id} matches member ${member.id}`);
                return true;
            }
            
            // Check if this member has consolidatedFrom IDs (happens after consolidation)
            if (member.consolidatedFrom && member.consolidatedFrom.length > 0) {
                // Check if assignment matches any of the original IDs
                const matchesConsolidatedId = member.consolidatedFrom.some(originalId => 
                    assignment.teamMemberId === originalId
                );
                if (matchesConsolidatedId) {
                    console.log(`Consolidated match: assignment ${assignment.id} (${assignment.teamMemberId}) matches consolidated member ${member.id}`);
                    return true;
                }
            }
            
            // Legacy support: assignments without team prefix can match any team with that member
            if (!assignment.teamMemberId.includes(':')) {
                const baseMemberId = member.id.includes(':') 
                    ? member.id.split(':')[1] 
                    : member.id;
                    
                if (assignment.teamMemberId === baseMemberId) {
                    console.log(`Legacy match: assignment ${assignment.id} matches member ${member.id}`);
                    return true;
                }
            }
            
            return false;
        });
        
        console.log(`Found ${memberAssignments.length} manual assignments for member ${member.id}`);
        
        memberAssignments.forEach(assignment => {
            console.log(`Processing assignment ${assignment.id} for member ${member.id}`);
            console.log(`Assignment projectId: ${assignment.projectId}`);
            const calculatedAllocation = assignment.calculatedAllocation;
            console.log('Assignment calculated allocation:', calculatedAllocation);
            
            // Merge each month's allocation
            Object.entries(calculatedAllocation).forEach(([monthKey, monthAllocationData]) => {
                if (!mergedAllocations[monthKey]) {
                    mergedAllocations[monthKey] = {};
                }
                
                // Get project name
                const projectName = this.getProjectNameById(assignment.projectId);
                console.log(`Project name resolved: "${assignment.projectId}" -> "${projectName}"`);
                console.log(`Month ${monthKey} allocation data structure:`, Object.keys(monthAllocationData));
                
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
                console.log(`getProjectNameById: ${projectId} -> ${projectName}`);
                return projectName;
            }
        }
        
        // Fallback to generic name
        console.log(`getProjectNameById: ${projectId} -> Project ${projectId} (fallback)`);
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
            
            console.log(`Filtered to ${availableProjects.length} available projects`);
            
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
        console.log('Show edit assignment modal for:', assignmentId);
        
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
        console.log('Duplicate assignment:', assignmentId);
        
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
            
            console.log('Assignment duplicated successfully:', duplicatedAssignment.id);
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
        console.log('Delete assignment:', assignmentId);
        
        const assignment = this.manualAssignments.find(a => a.id === assignmentId);
        if (!assignment) {
            NotificationManager.error('Assignment not found');
            return;
        }
        
        // Show confirmation dialog
        const confirmed = confirm(`Are you sure you want to delete this assignment?\n\nTeam Member: ${assignment.teamMemberId}\nProject: ${assignment.projectId}`);
        if (!confirmed) {
            return;
        }
        
        try {
            // Remove from manual assignments array
            const index = this.manualAssignments.findIndex(a => a.id === assignmentId);
            if (index > -1) {
                this.manualAssignments.splice(index, 1);
            }
            
            console.log('Assignment deleted successfully:', assignmentId);
            NotificationManager.success('Assignment deleted successfully');
            
            // Refresh the table
            await this.refreshAllCapacitySections();
            
        } catch (error) {
            console.error('Error deleting assignment:', error);
            NotificationManager.error(`Failed to delete assignment: ${error.message}`);
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
     * Initialize capacity panel event listeners
     */
    initializeCapacityPanelEventListeners() {
        // Prevent multiple event listener attachments
        if (this.capacityEventListenersInitialized) {
            console.log('Capacity panel event listeners already initialized');
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
        console.log('Capacity panel event listeners initialized');
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

            console.log(`Collected capacity data: ${teamMembers?.length || 0} team members, ${projects?.length || 0} projects`);
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
                        console.log('Capacity data saved successfully to:', filePath);
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
            
            console.log('Capacity data downloaded as:', downloadFilename);
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

            console.log('Capacity data exported successfully:', filename);
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
            console.log('Loading capacity data from file:', file.name);
            
            // Show loading state
            const loadBtn = document.getElementById('capacity-load-btn');
            if (loadBtn) {
                loadBtn.disabled = true;
                loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            }

            // Read file content
            const text = await file.text();
            console.log('Raw file content (first 500 chars):', text.substring(0, 500));
            console.log('File content has \\n characters:', text.includes('\\n'));
            console.log('File content has newlines:', text.includes('\n'));
            
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
                console.log('Failed to parse content:', text.substring(0, 200));
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
            console.log(`Loaded capacity data: ${capacityData.teamMembers?.length || 0} team members, ${capacityData.projects?.length || 0} projects`);
            
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
            console.log('All capacity sections refreshed successfully');

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
                console.log('Auto-load capacity data completed (no existing data or error):', error.message);
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
}

// Make CapacityManager available globally
if (typeof window !== 'undefined') {
    window.CapacityManager = CapacityManager;
}

// Make CalculationsManager available globally
if (typeof window !== 'undefined') {
    window.CalculationsManager = CalculationsManager;
}