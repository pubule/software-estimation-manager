/**
 * CalculationsManager - Handles cost calculations, KPI analysis, and vendor summaries
 * Provides comprehensive project cost breakdown and resource utilization metrics
 */
class CalculationsManager {
    constructor(app, configManager) {
        
        this.app = app;
        this.configManager = configManager;
        
        // Connect to global state store (may not be available immediately)
        this.store = window.appStore;
        this.storeUnsubscribe = null;
        
        this.vendorCosts = [];
        this.kpiData = {};
        this.currentFilters = {
            vendor: '',
            role: '',
            roleGroup: 'all'
        };
        
        // Flag to prevent race conditions in timeline chart loading
        this.timelineChartLoading = false;

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
        this.setupStoreSubscription();
        
        // If store wasn't available during construction, try to connect when it becomes available
        if (!this.store) {
            console.log('Store not available during CalculationsManager construction, will attempt to connect later');
            this.connectToStoreWhenReady();
        }
    }

    /**
     * Attempt to connect to store when it becomes available
     */
    connectToStoreWhenReady() {
        // Check periodically for store availability
        const checkForStore = () => {
            if (window.appStore && !this.store) {
                console.log('Store now available, connecting CalculationsManager...');
                this.store = window.appStore;
                this.setupStoreSubscription();
                return;
            }
            
            // Keep checking every 100ms for up to 5 seconds
            if (!this.store && (this.storeCheckAttempts || 0) < 50) {
                this.storeCheckAttempts = (this.storeCheckAttempts || 0) + 1;
                setTimeout(checkForStore, 100);
            } else if (!this.store) {
                console.warn('CalculationsManager: Store not available after 5 seconds, will operate without store integration');
            }
        };
        
        setTimeout(checkForStore, 100);
    }
    
    /**
     * Setup store subscription for reactive calculation updates
     */
    setupStoreSubscription() {
        if (!this.store) {
            console.warn('Store not available for CalculationsManager');
            return;
        }

        this.storeUnsubscribe = this.store.subscribe((state, prevState) => {
            // React to project changes  
            if (state.currentProject !== prevState.currentProject) {
                this.handleProjectChange(state.currentProject);
            }
        });
    }
    
    /**
     * Handle project changes from global state
     */
    handleProjectChange(newProject) {
        console.log('CalculationsManager: Project changed', {
            hasProject: !!newProject
        });
        
        // Re-render calculations when project changes
        if (newProject) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                if (this.render && typeof this.render === 'function') {
                    this.render();
                }
            }, 100);
        }
    }
    
    /**
     * Cleanup store subscription
     */
    destroy() {
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
            this.storeUnsubscribe = null;
        }
    }

    /**
     * ⚡ REACTIVE ACTION DISPATCHER: Enhanced reactive event system
     * Optimizes existing bounded handlers with centralized action management  
     */
    initializeEventListeners() {
        this.setupReactiveCalculationsActions();
    }

    /**
     * Setup enhanced reactive actions system for calculations
     */
    setupReactiveCalculationsActions() {
        this.setupCalculationsActionDispatcher();
        this.setupEnhancedBoundedHandlers();
        this.setupGlobalCalculationsListeners();
    }

    /**
     * Setup centralized action dispatcher for calculations
     */
    setupCalculationsActionDispatcher() {
        this.calculationsActionMap = {
            // Filter actions
            'filter-chip-click': (target) => this.handleFilterChipClick(target),
            'vendor-filter-change': (target) => this.handleVendorFilterChange(target),  
            'role-filter-change': (target) => this.handleRoleFilterChange(target),
            
            // Action buttons
            'share-calculations': () => this.shareByEmail(),
            'refresh-capacity': () => this.refresh(),
            'export-capacity': () => this.exportCapacityData(),
            'export-table': () => this.exportCapacityTable(),
            'add-assignment': () => this.showAddAssignmentModal(),
            
            // Table interactions
            'table-blur': (target) => this.handleTableBlur(target),
            'table-click': (target) => this.handleTableClick(target)
        };
    }

    /**
     * Enhanced bounded handlers with action dispatch
     */
    setupEnhancedBoundedHandlers() {
        // Maintain existing bounded handlers for backward compatibility
        // but enhance with centralized dispatch
        const originalBoundHandlers = this.boundHandlers;
        
        this.boundHandlers = {
            ...originalBoundHandlers,
            
            // Enhanced dispatchers
            filterChipClick: (e) => this.dispatchCalculationsAction('filter-chip-click', e.target),
            vendorFilterChange: (e) => this.dispatchCalculationsAction('vendor-filter-change', e.target),
            roleFilterChange: (e) => this.dispatchCalculationsAction('role-filter-change', e.target),
            shareClick: () => this.dispatchCalculationsAction('share-calculations'),
            tableBlur: (e) => this.dispatchCalculationsAction('table-blur', e.target),
            tableClick: (e) => this.dispatchCalculationsAction('table-click', e.target)
        };
    }

    /**
     * Setup global reactive listeners for calculations sections
     */
    setupGlobalCalculationsListeners() {
        // Single global click handler for all calculations actions
        document.addEventListener('click', (e) => {
            // Handle main action buttons by ID
            const buttonActions = {
                'refresh-btn': 'refresh-capacity',
                'export-btn': 'export-capacity', 
                'export-table-btn': 'export-table',
                'add-assignment-btn': 'add-assignment',
                'add-timeline-assignment-btn': 'add-assignment',
                'refresh-timeline-btn': 'refresh-capacity',
                'create-first-row-btn': 'add-assignment'
            };
            
            const actionType = buttonActions[e.target.id];
            if (actionType && this.isCalculationsElement(e.target)) {
                e.preventDefault();
                this.dispatchCalculationsAction(actionType);
                return;
            }
            
            // Handle data-action attributes
            const actionElement = e.target.closest('[data-action]');
            if (actionElement && this.isCalculationsElement(actionElement)) {
                e.preventDefault();
                const action = actionElement.dataset.action;
                this.dispatchCalculationsAction(action, actionElement);
                return;
            }
        });

        // Single global change handler for filters and inputs
        document.addEventListener('change', (e) => {
            const filterActions = {
                'matrix-team-filter': 'matrix-filter-change',
                'matrix-timeframe': 'matrix-filter-change',
                'matrix-view-mode': 'matrix-filter-change',
                'overview-member-filter': 'overview-filter-change',
                'overview-status-filter': 'overview-filter-change',
                'team-filter': 'team-filter-change',
                'projects-filter': 'projects-filter-change',
                'status-filter': 'status-filter-change'
            };
            
            const actionType = filterActions[e.target.id];
            if (actionType && this.isCalculationsElement(e.target)) {
                this.dispatchCalculationsAction(actionType, e.target);
                return;
            }
        });
    }

    /**
     * Centralized action dispatcher for calculations
     */
    dispatchCalculationsAction(actionType, ...params) {
        const handler = this.calculationsActionMap[actionType];
        if (handler) {
            try {
                handler(...params);
            } catch (error) {
                console.error(`CalculationsManager action '${actionType}' failed:`, error);
                if (window.NotificationManager) {
                    NotificationManager.show(`Calculation action failed: ${error.message}`, 'error');
                }
            }
        } else {
            console.warn(`CalculationsManager: Unknown action type '${actionType}'`);
        }
    }

    /**
     * Check if element belongs to calculations manager
     */
    isCalculationsElement(element) {
        return element.closest('.calculations-content') || 
               element.closest('.capacity-section') ||
               element.id?.includes('calculation') ||
               element.id?.includes('capacity');
    }

    /**
     * Render the calculations dashboard
     */
    render() {
        const container = document.querySelector('.calculations-content');
        if (!container) return;

        // PURE STATE MANAGER: Always use StateSelectors for consistency
        const currentProject = StateSelectors.getCurrentProject();
        
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
        
        const currentProject = StateSelectors.getCurrentProject();
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
            return;
        }

        // Find development phase and G2 effort percentage - access directly from phases object
        const developmentPhase = phases.development;

        if (!developmentPhase) {
            return;
        }

        const g2EffortPercent = (developmentPhase.effort && developmentPhase.effort.G2) || 0;

        if (g2EffortPercent === 0) {
            return;
        }

        features.forEach((feature, index) => {
            
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
        const totalProject = gtoTotal + gdsTotal;

        // Calculate project-level percentages
        const totalInternalAmount = gtoInternal + gdsInternal;
        const totalExternalAmount = gtoExternal + gdsExternal;

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
            totalProject: totalProject,
            // Project-level percentages
            totalInternalPercentage: totalProject > 0 ? (totalInternalAmount / totalProject) * 100 : 0,
            totalExternalPercentage: totalProject > 0 ? (totalExternalAmount / totalProject) * 100 : 0
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
        const currentProject = StateSelectors.getCurrentProject();
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
        const currentProject = StateSelectors.getCurrentProject();
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
        const currentProject = StateSelectors.getCurrentProject();
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
        const currentProject = StateSelectors.getCurrentProject();
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
            
            const newTableHTML = this.renderCostTable();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newTableHTML;
            
            // Clear existing content
            tableSection.innerHTML = tempDiv.firstElementChild.innerHTML;
            
            // Use requestAnimationFrame instead of setTimeout for better DOM synchronization
            requestAnimationFrame(() => {
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
        const currentProject = StateSelectors.getCurrentProject();
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

        // Get project assumptions
        const assumptions = currentProject.assumptions || [];
        let assumptionsSection = '';
        
        if (assumptions.length > 0) {
            assumptionsSection = '\nAssumptions and out of scopes:\n';
            assumptions.forEach(assumption => {
                if (assumption.description) {
                    assumptionsSection += `- ${assumption.description}\n`;
                }
            });
        }

        // Email template
        const emailTemplate = `Dear colleagues,

Please find below the estimation details for the implementation of ${projectName} based on the provided requirements.

The estimated budget for the technical part is ${finalTotalCost.toLocaleString()} € vat incl.

This includes all necessary activities such as technical analysis, development, SIT, support UAT phases, deployment, and post go live support.

Overall Required time is: ${elapsedTime}.

Phase:
${phasesList}${assumptionsSection}`;

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

        // Track expanded details rows to preserve state during refresh
        this._expandedDetailsRows = new Set();

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
                    // Handle both old format ("member-fullstack-1") and new format ("team-fullstack:member-fullstack-1") IDs
                    if (this._currentTeamMember) {
                        const currentBaseName = this._currentTeamMember.id.includes(':') ? 
                            this._currentTeamMember.id.split(':')[1] : this._currentTeamMember.id;
                        const requestedBaseName = memberId.includes(':') ? 
                            memberId.split(':')[1] : memberId;
                        
                        if (currentBaseName === requestedBaseName || this._currentTeamMember.id === memberId) {
                            return this._currentTeamMember;
                        }
                    }
                    return null;
                }
            };
            
            this.autoDistribution = new AutoDistribution(this.workingDaysCalculator, teamManagerAdapter);
        }

        // Initialize capacity panel event listeners
        this.initializeCapacityPanelEventListeners();

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
                            </div>
                        </div>
                        <div class="card-content">
                            <div class="timeline-overview-chart" id="timeline-overview-chart">
                                <!-- Timeline overview chart will be generated here -->
                            </div>
                        </div>
                    </div>

                    <!-- Resource Availability Matrix -->
                    <div class="analytics-card resource-availability-matrix">
                        <div class="card-header">
                            <h3><i class="fas fa-users-cog"></i> Resource Availability Matrix</h3>
                            <div class="card-actions">
                                <div class="matrix-filters">
                                    <select id="matrix-team-filter" class="filter-select">
                                        <option value="">All Teams</option>
                                        <option value="vendor-a">Vendor A</option>
                                        <option value="internal">Internal</option>
                                    </select>
                                    <select id="matrix-timeframe" class="filter-select">
                                        <option value="3">Next 3 Months</option>
                                        <option value="6">Next 6 Months</option>
                                        <option value="12">Next 12 Months</option>
                                    </select>
                                    <select id="matrix-view-mode" class="filter-select">
                                        <option value="capacity">Capacity View</option>
                                        <option value="skills">Skills View</option>
                                        <option value="projects">Projects View</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="card-content">
                            <div class="availability-matrix-container" id="availability-matrix">
                                <!-- Matrix will be generated here -->
                            </div>
                            <div class="matrix-legend">
                                <div class="legend-item">
                                    <span class="legend-color available"></span>
                                    <span>Available (&lt; 80%)</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-color busy"></span>
                                    <span>Busy (80-100%)</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-color overloaded"></span>
                                    <span>Overloaded (&gt; 100%)</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-color vacation"></span>
                                    <span>Vacation/Leave</span>
                                </div>
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


            </div>
        `;
    }

    // Initialize Dashboard Event Listeners
    initializeDashboardEventListeners() {
        // Matrix filters
        const matrixTeamFilter = document.getElementById('matrix-team-filter');
        const matrixTimeframe = document.getElementById('matrix-timeframe');
        const matrixViewMode = document.getElementById('matrix-view-mode');
        
        if (matrixTeamFilter) {
            matrixTeamFilter.addEventListener('change', () => this.loadAvailabilityMatrix());
        }
        
        if (matrixTimeframe) {
            matrixTimeframe.addEventListener('change', () => this.loadAvailabilityMatrix());
        }
        
        if (matrixViewMode) {
            matrixViewMode.addEventListener('change', () => this.loadAvailabilityMatrix());
        }
        
        // Matrix cell click events removed
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
        this.loadAvailabilityMatrix();
        
        // Only load timeline chart if we have capacity data loaded
        // This prevents the problematic first call with empty session data
        if (this.loadedCapacityData) {
            await this.loadTimelineOverviewChart();
        } else {
            // Create placeholder for timeline chart
            const timelineContainer = document.getElementById('timeline-overview-chart');
            if (timelineContainer) {
                timelineContainer.innerHTML = `
                    <div class="timeline-placeholder">
                        <div class="placeholder-message">
                            <i class="fas fa-info-circle"></i>
                            <p>Timeline chart will appear after loading capacity data</p>
                            <small>Click "Load" in the Capacity Planning section to import your team capacity data</small>
                        </div>
                    </div>
                `;
            }
        }
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
            // Get member capacity for the month based on real working days
            const [year, month] = monthKey.split('-').map(Number);
            const memberCapacity = this.workingDaysCalculator.calculateWorkingDays(month, year, member.country || 'IT');
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
            // Use loaded capacity data if available, otherwise fallback to current data
            let teamMembers, projects, manualAssignments;
            
            if (this.loadedCapacityData) {
                teamMembers = this.loadedCapacityData.teamMembers || [];
                projects = this.loadedCapacityData.projects || [];
                manualAssignments = this.loadedCapacityData.manualAssignments || [];
                
                // Store references for other methods to use
                this.loadedTeamMembers = teamMembers;
                this.loadedProjects = projects;
                this.manualAssignments = manualAssignments;
            } else {
                teamMembers = await this.getRealTeamMembers();
                // 🚨 FIX: getAvailableProjects() returns flattened structure compatible with getProjectNameById
                projects = await this.getAvailableProjects();
                manualAssignments = this.manualAssignments || [];
            }
            
            const currentDate = new Date();
            
            // Ensure teamMembers is an array
            if (!Array.isArray(teamMembers)) {
                console.warn('Team members is not an array:', typeof teamMembers);
                return alerts;
            }
            
            teamMembers.forEach(member => {
                // Check for over-allocation
                const overallocationAlert = this.checkMemberOverallocation(member, currentDate);
                if (overallocationAlert) {
                    alerts.push(overallocationAlert);
                }
                
                // Skip assignment overflow alerts (too noisy for small overflows)
                // const overflowAlerts = this.checkMemberAssignmentOverflows(member);
                // alerts.push(...overflowAlerts);
            });

            // Skip budget overflow alerts when budget is 0 (not meaningful)
            if (manualAssignments && manualAssignments.length > 0) {
                manualAssignments.forEach(assignment => {
                    if (assignment.budgetInfo && assignment.budgetInfo.isOverBudget) {
                        // Only show budget alert if there's actually a budget defined (> 0)
                        if (assignment.budgetInfo.totalFinalMDs > 0) {
                            const projectName = this.getProjectNameById(assignment.projectId, projects) || 'Unknown Project';
                            const overBudgetAmount = Math.abs(assignment.budgetInfo.balance);
                            
                            alerts.push({
                                type: 'error',
                                severity: 'high',
                                message: `<strong>Project "${projectName}"</strong> is over budget by <span style="color: #ff6b6b;">${overBudgetAmount.toFixed(1)} MDs</span><br><small style="opacity: 0.8;">Allocated: ${assignment.budgetInfo.totalAllocatedMDs} MDs | Budget: ${assignment.budgetInfo.totalFinalMDs} MDs</small>`
                            });
                        }
                    }
                });
            }

            // Check for projects without assignments
            // Ensure projects is an array
            if (!Array.isArray(projects)) {
                console.warn('Projects is not an array:', typeof projects);
            } else {
                const unassignedProjects = projects.filter(project => {
                return !this.hasProjectAssignments(project.id);
                });

                if (unassignedProjects.length > 0) {
                    const projectNames = unassignedProjects.map(p => p.name).join(', ');
                    alerts.push({
                        type: 'warning',
                        message: `<strong>${unassignedProjects.length} project(s)</strong> have no team member assignments<br><small style="opacity: 0.8;">${projectNames}</small>`,
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
        const overflowProjects = [];
        
        // Check overflows in member allocations (real data structure)
        if (member.allocations) {
            for (const monthKey in member.allocations) {
                const monthAllocations = member.allocations[monthKey];
                
                for (const projectName in monthAllocations) {
                    const projectAllocation = monthAllocations[projectName];
                    
                    // Check if project has overflow
                    if (projectAllocation.hasOverflow && projectAllocation.overflowAmount > 0) {
                        overflowProjects.push({
                            projectName,
                            month: monthKey,
                            overflow: projectAllocation.overflowAmount,
                            phases: []
                        });
                    }
                    
                    // Check individual phases for overflow
                    if (projectAllocation.phases && Array.isArray(projectAllocation.phases)) {
                        projectAllocation.phases.forEach(phase => {
                            if (phase.hasOverflow && phase.overflowAmount > 0) {
                                const existingProject = overflowProjects.find(p => 
                                    p.projectName === projectName && p.month === monthKey
                                );
                                
                                if (existingProject) {
                                    existingProject.phases.push({
                                        phaseName: phase.phaseName,
                                        overflow: phase.overflowAmount
                                    });
                                } else {
                                    overflowProjects.push({
                                        projectName,
                                        month: monthKey,
                                        overflow: 0,
                                        phases: [{
                                            phaseName: phase.phaseName,
                                            overflow: phase.overflowAmount
                                        }]
                                    });
                                }
                            }
                        });
                    }
                }
            }
        }
        
        // Also check assignment phaseSchedule overflow (fallback for different data structure)
        if (!overflowProjects.length && this.manualAssignments) {
            const memberAssignments = this.manualAssignments.filter(assignment => 
                assignment.teamMemberId === member.id
            );
            
            memberAssignments.forEach(assignment => {
                if (assignment.phaseSchedule) {
                    const overflowPhases = assignment.phaseSchedule.filter(phase => phase.overflow > 0);
                    
                    if (overflowPhases.length > 0) {
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
        }
        
        if (overflowProjects.length > 0) {
            // Create detailed overflow summary
            const overflowSummary = overflowProjects.map(overflow => {
                if (overflow.phases && overflow.phases.length > 0) {
                    const phaseDetails = overflow.phases.map(phase => 
                        `${phase.phaseName} +${phase.overflow.toFixed(1)} MDs`
                    ).join(', ');
                    return `${overflow.projectName} (${overflow.month}): ${phaseDetails}`;
                } else {
                    return `${overflow.projectName}: +${overflow.overflow.toFixed(1)} MDs`;
                }
            }).join('; ');
            
            alerts.push({
                type: 'overflow',
                severity: 'warning',
                message: `<strong>${member.firstName} ${member.lastName}</strong> has phase overflow<br><small style="opacity: 0.8;">${overflowSummary}</small>`
            });
        }
        
        return alerts;
    }

    /**
     * Check if member is over-allocated
     */
    checkMemberOverallocation(member, currentDate) {
        if (!member.allocations) {
            return null;
        }
        
        const overallocatedMonths = [];
        const currentYear = currentDate.getFullYear();
        
        // Check each month for over-allocation
        for (const monthKey in member.allocations) {
            const monthAllocations = member.allocations[monthKey];
            
            // Calculate total days allocated for this month
            let totalAllocated = 0;
            for (const projectName in monthAllocations) {
                const allocation = monthAllocations[projectName];
                if (allocation.days) {
                    totalAllocated += allocation.days;
                }
            }
            
            // Get member's capacity for this month
            const memberCapacity = member.maxCapacity || member.monthlyCapacity || 21;
            
            // Check if allocated days exceed capacity
            if (totalAllocated > memberCapacity) {
                const month = new Date(monthKey + '-01');
                const monthName = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                
                overallocatedMonths.push({
                    month: monthName,
                    allocated: totalAllocated,
                    capacity: memberCapacity,
                    overflow: totalAllocated - memberCapacity
                });
            }
        }
        
        if (overallocatedMonths.length > 0) {
            // Calculate total overflow
            const totalOverflow = overallocatedMonths.reduce((sum, month) => sum + month.overflow, 0);
            
            // Create cleaner summary message
            let message = `<strong>${member.firstName} ${member.lastName}</strong> is over-allocated in ${overallocatedMonths.length} month(s)`;
            message += ` <span style="color: #ff6b6b;">(+${totalOverflow.toFixed(1)} MDs total)</span>`;
            
            // Add compact month list if not too many
            if (overallocatedMonths.length <= 4) {
                const monthsList = overallocatedMonths.map(month => 
                    `${month.month} (+${month.overflow.toFixed(0)})`
                ).join(', ');
                message += `<br><small style="opacity: 0.8;">Months: ${monthsList}</small>`;
            } else {
                // For many months, show range and worst cases
                const firstMonth = overallocatedMonths[0].month;
                const lastMonth = overallocatedMonths[overallocatedMonths.length - 1].month;
                const worstMonth = overallocatedMonths.reduce((prev, current) => 
                    prev.overflow > current.overflow ? prev : current
                );
                message += `<br><small style="opacity: 0.8;">Period: ${firstMonth} - ${lastMonth} | Peak: ${worstMonth.month} (+${worstMonth.overflow.toFixed(0)} MDs)</small>`;
            }
            
            return {
                type: 'overallocation',
                severity: 'high',
                message: message
            };
        }
        
        return null;
    }

    /**
     * Check if project has any assignments
     */
    hasProjectAssignments(projectId) {
        // Check in manual assignments
        if (this.manualAssignments && this.manualAssignments.length > 0) {
            const hasManualAssignment = this.manualAssignments.some(assignment => 
                assignment.projectId === projectId
            );
            
            if (hasManualAssignment) {
                return true;
            }
        }
        
        // Check in team members allocations (loaded from capacity file)
        if (this.loadedTeamMembers && this.loadedTeamMembers.length > 0) {
            return this.loadedTeamMembers.some(member => {
                if (!member.allocations) return false;
                
                // Check if any month has allocations for this project
                for (const monthKey in member.allocations) {
                    const monthAllocations = member.allocations[monthKey];
                    
                    // Look for project by name in allocations
                    for (const projectName in monthAllocations) {
                        // Try to match by project name
                        const project = this.getProjectById(projectId);
                        if (project && project.name === projectName) {
                            return true;
                        }
                    }
                }
                
                return false;
            });
        }
        
        // Fallback: check current team members from getRealTeamMembers
        return false;
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

    // Load Availability Matrix
    async loadAvailabilityMatrix() {
        const matrixContainer = document.getElementById('availability-matrix');
        if (!matrixContainer) return;
        
        // Get filters
        const teamFilter = document.getElementById('matrix-team-filter')?.value || '';
        const timeframeMonths = parseInt(document.getElementById('matrix-timeframe')?.value) || 3;
        const viewMode = document.getElementById('matrix-view-mode')?.value || 'capacity';
        
        // Get team members data
        const teamMembers = await this.getRealTeamMembers();
        if (!teamMembers || teamMembers.length === 0) {
            matrixContainer.innerHTML = '<div class="no-data">No team members data available</div>';
            return;
        }
        
        // Filter team members if needed
        const filteredMembers = teamFilter ? 
            teamMembers.filter(member => member.vendor === teamFilter) : 
            teamMembers;
        
        // Generate matrix based on view mode
        let matrixHTML = '';
        
        switch (viewMode) {
            case 'capacity':
                matrixHTML = this.generateCapacityMatrix(filteredMembers, timeframeMonths);
                break;
            case 'skills':
                matrixHTML = this.generateSkillsMatrix(filteredMembers, timeframeMonths);
                break;
            case 'projects':
                matrixHTML = this.generateProjectsMatrix(filteredMembers, timeframeMonths);
                break;
        }
        
        matrixContainer.innerHTML = matrixHTML;
    }
    
    // Generate Capacity Matrix
    generateCapacityMatrix(teamMembers, timeframeMonths) {
        // Generate month headers starting from current month
        const currentDate = new Date();
        const monthHeaders = [];
        
        for (let i = 0; i < timeframeMonths; i++) {
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            monthHeaders.push({ key: monthKey, label: monthLabel });
        }
        
        // Generate matrix rows
        let matrixRows = '';
        
        teamMembers.forEach(member => {
            let memberRow = `
                <tr class="matrix-row" data-member-id="${member.id}">
                    <td class="matrix-member-cell">
                        <div class="member-info">
                            <div class="member-name">${member.firstName} ${member.lastName}</div>
                            <div class="member-details">
                                <span class="member-role">${member.role}</span>
                                <span class="member-vendor">${member.vendor}</span>
                            </div>
                        </div>
                    </td>
            `;
            
            monthHeaders.forEach(({ key: monthKey }) => {
                const utilization = this.calculateMonthUtilization(member, monthKey);
                const cellClass = this.getUtilizationClass(utilization);
                const cellContent = this.getUtilizationContent(member, monthKey, utilization);
                
                memberRow += `
                    <td class="matrix-cell ${cellClass}" 
                        data-month="${monthKey}" 
                        data-member="${member.id}">
                        ${cellContent}
                    </td>
                `;
            });
            
            memberRow += '</tr>';
            matrixRows += memberRow;
        });
        
        // Generate table
        return `
            <table class="availability-matrix-table">
                <thead>
                    <tr>
                        <th class="matrix-header-member">Team Member</th>
                        ${monthHeaders.map(month => `<th class="matrix-header-month">${month.label}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${matrixRows}
                </tbody>
            </table>
        `;
    }
    
    // Calculate month utilization for a team member
    calculateMonthUtilization(member, monthKey) {
        const allocations = member.allocations?.[monthKey];
        if (!allocations) {
            return { percentage: 0, allocated: 0, capacity: member.monthlyCapacity || 22, hasVacation: false };
        }
        
        let totalAllocated = 0;
        let hasVacation = false;
        let realMonthCapacity = member.monthlyCapacity || 22; // Default fallback
        const projects = [];
        
        Object.keys(allocations).forEach(projectName => {
            const allocation = allocations[projectName];
            
            if (projectName === 'FERIE') {
                hasVacation = true;
            } else {
                totalAllocated += allocation.days || 0;
                
                // Use realCapacityInMonth from the first project allocation if available
                if (allocation.realCapacityInMonth && !projects.length) {
                    realMonthCapacity = allocation.realCapacityInMonth;
                }
                
                if (allocation.days > 0) {
                    projects.push({
                        name: projectName,
                        days: allocation.days,
                        status: allocation.status || 'pending'
                    });
                }
            }
        });
        
        const percentage = Math.round((totalAllocated / realMonthCapacity) * 100);
        
        return {
            percentage,
            allocated: totalAllocated,
            capacity: realMonthCapacity,
            hasVacation,
            projects
        };
    }
    
    // Get CSS class based on utilization
    getUtilizationClass(utilization) {
        if (utilization.hasVacation) return 'vacation';
        if (utilization.percentage === 0) return 'available';
        if (utilization.percentage < 80) return 'available';
        if (utilization.percentage <= 100) return 'busy';
        return 'overloaded';
    }
    
    // Get cell content based on utilization
    getUtilizationContent(member, monthKey, utilization) {
        if (utilization.hasVacation) {
            return `
                <div class="cell-content">
                    <div class="utilization-text">Vacation</div>
                </div>
            `;
        }
        
        if (utilization.percentage === 0) {
            return `
                <div class="cell-content">
                    <div class="utilization-percentage">0%</div>
                    <div class="utilization-text">Available</div>
                </div>
            `;
        }
        
        return `
            <div class="cell-content">
                <div class="utilization-percentage">${utilization.percentage}%</div>
                <div class="utilization-details">${utilization.allocated}/${utilization.capacity} days</div>
            </div>
        `;
    }
    
    // Generate Skills Matrix (placeholder)
    generateSkillsMatrix(teamMembers, timeframeMonths) {
        // Group by role/skill
        const roleGroups = {};
        teamMembers.forEach(member => {
            if (!roleGroups[member.role]) {
                roleGroups[member.role] = [];
            }
            roleGroups[member.role].push(member);
        });
        
        let skillsHTML = '<div class="skills-matrix">';
        
        Object.keys(roleGroups).forEach(role => {
            const members = roleGroups[role];
            const availableCount = members.filter(m => {
                // Check if member has availability in next 3 months
                const nextMonth = new Date().getMonth() + 1;
                const year = new Date().getFullYear();
                const monthKey = `${year}-${String(nextMonth).padStart(2, '0')}`;
                const util = this.calculateMonthUtilization(m, monthKey);
                return util.percentage < 80;
            }).length;
            
            skillsHTML += `
                <div class="skill-group">
                    <div class="skill-header">
                        <h4>${role}</h4>
                        <span class="skill-availability">${availableCount}/${members.length} available</span>
                    </div>
                    <div class="skill-members">
                        ${members.map(m => `
                            <div class="skill-member ${availableCount > 0 ? 'available' : 'busy'}">
                                ${m.firstName} ${m.lastName} (${m.vendor})
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        skillsHTML += '</div>';
        return skillsHTML;
    }
    
    // Generate Projects Matrix (placeholder)
    generateProjectsMatrix(teamMembers, timeframeMonths) {
        // Get all projects from allocations
        const projects = new Set();
        teamMembers.forEach(member => {
            Object.keys(member.allocations || {}).forEach(month => {
                Object.keys(member.allocations[month] || {}).forEach(project => {
                    if (!['FERIE', 'ALLINEAMENTO', 'Training'].includes(project)) {
                        projects.add(project);
                    }
                });
            });
        });
        
        let projectsHTML = '<div class="projects-matrix">';
        
        Array.from(projects).forEach(project => {
            const projectMembers = teamMembers.filter(member => {
                return Object.keys(member.allocations || {}).some(month => 
                    member.allocations[month][project]?.days > 0
                );
            });
            
            projectsHTML += `
                <div class="project-group">
                    <div class="project-header">
                        <h4>${project}</h4>
                        <span class="project-members">${projectMembers.length} members</span>
                    </div>
                    <div class="project-team">
                        ${projectMembers.map(m => `
                            <div class="project-member">
                                ${m.firstName} ${m.lastName} (${m.role})
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        projectsHTML += '</div>';
        return projectsHTML;
    }
    
    // Handle Matrix Cell Click for drill-down
    handleMatrixCellClick(details) {
        const { memberId, month, utilization } = details;
        
        // Create and show modal with detailed information
        this.showMemberDetailModal(memberId, month, utilization);
    }
    
    // Show Member Detail Modal
    async showMemberDetailModal(memberId, month, utilization) {
        // Get team member data
        const teamMembers = await this.getRealTeamMembers();
        const member = teamMembers.find(m => m.id === memberId);
        
        if (!member) {
            console.error('Member not found:', memberId);
            return;
        }
        
        // Get utilization details for the month
        const utilizationData = this.calculateMonthUtilization(member, month);
        
        // Create modal content
        const modalContent = `
            <div class="member-detail-modal">
                <div class="member-detail-header">
                    <div class="member-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="member-info">
                        <h3>${member.firstName} ${member.lastName}</h3>
                        <div class="member-meta">
                            <span class="member-role">${member.role}</span>
                            <span class="member-vendor">${member.vendor}</span>
                        </div>
                    </div>
                </div>
                
                <div class="member-detail-content">
                    <div class="month-summary">
                        <h4>📅 ${this.formatMonth(month)} Summary</h4>
                        <div class="summary-stats">
                            <div class="stat-item">
                                <span class="stat-label">Utilization:</span>
                                <span class="stat-value ${this.getUtilizationClass(utilizationData)}">${utilizationData.percentage}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Allocated:</span>
                                <span class="stat-value">${utilizationData.allocated} days</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Capacity:</span>
                                <span class="stat-value">${utilizationData.capacity} days</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Available:</span>
                                <span class="stat-value">${utilizationData.capacity - utilizationData.allocated} days</span>
                            </div>
                        </div>
                    </div>
                    
                    ${utilizationData.hasVacation ? `
                        <div class="vacation-notice">
                            <i class="fas fa-umbrella-beach"></i>
                            <span>This member has vacation planned for this month</span>
                        </div>
                    ` : ''}
                    
                    ${utilizationData.projects && utilizationData.projects.length > 0 ? `
                        <div class="projects-allocation">
                            <h4>🎯 Project Allocations</h4>
                            <div class="projects-list">
                                ${utilizationData.projects.map(project => `
                                    <div class="project-allocation-item">
                                        <div class="project-name">${project.name}</div>
                                        <div class="project-details">
                                            <span class="project-days">${project.days} days</span>
                                            <span class="project-status ${project.status}">${project.status}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : `
                        <div class="no-projects">
                            <i class="fas fa-calendar-check"></i>
                            <span>No project allocations for this month</span>
                        </div>
                    `}
                    
                    <div class="quick-actions">
                        <h4>⚡ Quick Actions</h4>
                        <div class="action-buttons">
                            <button class="btn btn-secondary" onclick="window.app?.managers?.calculations?.viewMemberCapacity('${memberId}')">
                                <i class="fas fa-calendar-alt"></i> View Full Calendar
                            </button>
                            <button class="btn btn-secondary" onclick="window.app?.managers?.calculations?.editMemberCapacity('${memberId}')">
                                <i class="fas fa-edit"></i> Edit Capacity
                            </button>
                            ${utilizationData.percentage < 80 ? `
                                <button class="btn btn-primary" onclick="window.app?.managers?.calculations?.assignToProject('${memberId}')">
                                    <i class="fas fa-plus"></i> Assign to Project
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Show modal using existing modal system
        if (window.ModalManager) {
            window.ModalManager.show({
                title: `${member.firstName} ${member.lastName} - ${this.formatMonth(month)}`,
                content: modalContent,
                size: 'large',
                closeButton: true
            });
        } else {
            // Fallback: simple alert with basic info
            alert(`${member.firstName} ${member.lastName} - ${this.formatMonth(month)}\n\nUtilization: ${utilizationData.percentage}%\nAllocated: ${utilizationData.allocated}/${utilizationData.capacity} days`);
        }
    }
    
    // Format month for display
    formatMonth(monthKey) {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    // Placeholder functions for quick actions
    viewMemberCapacity(memberId) {
        // Navigate to capacity timeline focused on this member
        if (window.app?.navigationManager) {
            window.app.navigationManager.navigateTo('capacity-timeline');
        }
    }
    
    editMemberCapacity(memberId) {
        // Open capacity editing interface
        alert('Member capacity editing feature would open here');
    }
    
    assignToProject(memberId) {
        // Open project assignment interface
        alert('Project assignment interface would open here');
    }

    // Load Timeline Overview Chart
    async loadTimelineOverviewChart() {
        // Prevent race conditions with flag
        if (this.timelineChartLoading) {
            return;
        }
        
        this.timelineChartLoading = true;
        
        try {
            const chartContainer = document.getElementById('timeline-overview-chart');
            if (!chartContainer) {
                console.warn('Timeline chart container not found!');
                return;
            }
        
        // Generate real utilization data based on team member allocations
        const months = await this.calculateRealUtilizationData();
        
        const chartHTML = `
            <div class="timeline-chart">
                ${months.map(data => {
                    return `
                    <div class="timeline-month">
                        <div class="month-bar">
                            <div class="month-fill ${this.getTimelineUtilizationClass(data.utilization)}" 
                                 style="height: ${data.utilization}%;"
                                 title="${data.month}: ${data.utilization}% utilization">
                            </div>
                        </div>
                        <div class="month-label">${data.month}</div>
                        <div class="month-percentage">${data.utilization}%</div>
                    </div>
                `;
                }).join('')}
            </div>
        `;

            chartContainer.innerHTML = chartHTML;
            
        } catch (error) {
            console.error('❌ Error loading timeline chart:', error);
            const chartContainer = document.getElementById('timeline-overview-chart');
            if (chartContainer) {
                chartContainer.innerHTML = `<div class="error-message">Error loading timeline chart: ${error.message}</div>`;
            }
        } finally {
            // Always reset the loading flag
            this.timelineChartLoading = false;
        }
    }

    /**
     * Calculate real utilization data for chart
     */
    async calculateRealUtilizationData() {
        const months = [];
        const currentYear = new Date().getFullYear();
        
        try {
            // Use loaded capacity data if available (like in generateRealAlerts)
            let teamMembers;
            if (this.loadedCapacityData) {
                teamMembers = this.loadedCapacityData.teamMembers || [];
            } else {
                teamMembers = await this.getRealTeamMembers();
            }
            
            // Ensure teamMembers is an array
            if (!Array.isArray(teamMembers)) {
                console.warn('getRealTeamMembers returned non-array:', typeof teamMembers);
                return months;
            }
            
            // Start from January of current year, but handle months > 11 correctly
            for (let i = 0; i < 15; i++) {
                const year = i < 12 ? currentYear : currentYear + 1;
                const monthIndex = i < 12 ? i : i - 12;
                const month = new Date(year, monthIndex, 1);
                const monthStr = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                // Fix: Create monthKey without timezone issues
                const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                
                
                // Calculate actual utilization based on team member allocations
                let totalCapacity = 0;
                let totalAllocated = 0;
                
                teamMembers.forEach(member => {
                    const workingDays = this.calculateWorkingDaysInMonth(month.getFullYear(), month.getMonth());
                    totalCapacity += workingDays;
                    
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

    /**
     * DESTROY & REBUILD timeline chart - clean solution for timeline bug
     */
    async destroyAndRebuildTimelineChart() {
        
        // Find the timeline container
        const timelineContainer = document.getElementById('timeline-overview-chart');
        if (!timelineContainer) {
            console.warn('Timeline container not found for destruction');
            return;
        }
        
        // Get the parent container to recreate the element
        const parentContainer = timelineContainer.parentElement;
        if (!parentContainer) {
            console.warn('Timeline container parent not found');
            return;
        }
        
        // Destroy the old container completely
        timelineContainer.remove();
        
        // Create a brand new container
        const newTimelineContainer = document.createElement('div');
        newTimelineContainer.className = 'timeline-overview-chart';
        newTimelineContainer.id = 'timeline-overview-chart';
        
        // Insert the new container in the same position
        parentContainer.appendChild(newTimelineContainer);
        
        // Small delay to ensure DOM is updated
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Now generate the timeline chart with correct data
        await this.loadTimelineOverviewChart();
    }

    /**
     * Validate that loaded capacity data contains expected allocations
     */
    validateCapacityAllocations(capacityData) {
        const teamMembers = capacityData.teamMembers || [];
        let jan2025Allocations = 0;
        let membersWithAllocations = 0;
        
        teamMembers.forEach(member => {
            if (member.allocations) {
                membersWithAllocations++;
                if (member.allocations['2025-01']) {
                    jan2025Allocations++;
                }
            }
        });
        
        const manualAssignments = capacityData.manualAssignments || [];
        
        return {
            teamMembersCount: teamMembers.length,
            membersWithAllocations,
            jan2025Allocations,
            manualAssignmentsCount: manualAssignments.length
        };
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

    // Get Utilization Class (legacy - for timeline chart)
    getTimelineUtilizationClass(percentage) {
        if (percentage >= 90) return 'over-capacity';
        if (percentage >= 80) return 'high-capacity';
        if (percentage >= 60) return 'normal-capacity';
        return 'low-capacity';
    }


    // Update Allocation Chart (when timeframe changes)
    updateAllocationChart() {
        // For now, just reload the chart
        // In a real implementation, this would fetch different data based on timeframe
        this.loadAvailabilityMatrix();
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
            // Save current gantt panel state before regenerating HTML
            let ganttPanelExpanded = false;
            const existingGanttPanel = document.querySelector('.gantt-panel');
            if (existingGanttPanel) {
                ganttPanelExpanded = !existingGanttPanel.classList.contains('collapsed');
            }

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
            
            // Restore gantt panel state after HTML regeneration
            const newGanttPanel = document.querySelector('.gantt-panel');
            const toggleBtn = document.getElementById('toggle-gantt-panel');
            if (newGanttPanel && toggleBtn && ganttPanelExpanded) {
                newGanttPanel.classList.remove('collapsed');
                const icon = toggleBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-chevron-up';
            }
            
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
                        <label for="status-filter">Status:</label>
                        <select id="status-filter" class="filter-select">
                            <option value="all">All Statuses</option>
                            <option value="approved">Approved</option>
                            <option value="pending">Pending</option>
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
                                        <th class="fixed-col col-expand"></th>
                                        <th class="fixed-col col-project-name">Project</th>
                                        <th class="fixed-col col-status">Status</th>
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
                                        <th class="fixed-col col-expand"></th>
                                        <th class="fixed-col col-member">Team Member</th>
                                        <th class="fixed-col col-actions">Actions</th>
                                        <th class="fixed-col col-total-mds">Total MDs</th>
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

        // Handle panel collapse/expand for gantt panel
        this.initializeGanttPanelToggle();
    }

    /**
     * Initialize gantt panel toggle functionality
     */
    initializeGanttPanelToggle() {
        // Remove existing listener to prevent duplicates
        if (this._ganttPanelToggleHandler) {
            document.removeEventListener('click', this._ganttPanelToggleHandler);
        }

        // Create the handler function
        this._ganttPanelToggleHandler = (e) => {
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
        };

        // Add the event listener
        document.addEventListener('click', this._ganttPanelToggleHandler);
    }

    /**
     * Load overview-specific data
     */
    async loadOverviewData() {
        // Populate overview filters
        this.populateOverviewFilters();
        
        // Generate capacity overview
        await this.generateCapacityOverview();
        
    }

    /**
     * Load timeline-specific data
     */
    async loadTimelineData() {
        // Load project options for filters
        await this.loadProjectOptions();
        
        // Load team member options for filters
        await this.loadTeamMemberOptions();
        
        
        // Load capacity table
        this.loadCapacityTable();
        
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
        
        if (member.vendorType === 'internal') {
            const internal = configManager.globalConfig?.internalResources?.find(r => r.id === member.vendorId);
            return internal?.role || 'G2';
        } else {
            const supplier = configManager.globalConfig?.suppliers?.find(s => s.id === member.vendorId);
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
            
            // Skip projects without required data - more robust check
            if (!project.startDate || !project.name) {
                console.warn(`Skipping project ${project.name || 'UNNAMED'} - missing required data:`);
                console.warn('Missing data:', { 
                    name: project.name, 
                    startDate: project.startDate
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
    checkAndFlagOverflow(allocations) {
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
        // Check cache first to avoid repeated calculations
        if (this._teamMembersCache && this._teamMembersCacheTime && 
            (Date.now() - this._teamMembersCacheTime < 30000) && !this._cacheIsDirty) { // 30 second cache
            return this._teamMembersCache;
        }
        
        try {
            
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
                
                try {
                    // Force reload from defaults
                    const defaultConfigManager = this.app?.managers?.defaultConfig || window.defaultConfigManager;
                    if (defaultConfigManager && typeof defaultConfigManager.getDefaultTeams === 'function') {
                        const defaultTeams = await defaultConfigManager.getDefaultTeams();
                        if (defaultTeams && defaultTeams.length > 0) {
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

            // Load real projects - cache projects too for better performance
            let projects = [];
            if (!this._projectsCache || !this._projectsCacheTime || 
                (Date.now() - this._projectsCacheTime > 60000)) { // 1 minute cache for projects
                
                const dataManager = this.app?.managers?.data || window.dataManager;
                if (!dataManager) {
                    console.warn('Data manager not available, using empty projects list');
                } else {
                    try {
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
                                    startDate: projectItem.project.startDate || null,
                                    endDate: projectItem.project.endDate || null
                                };
                            } else {
                                console.warn('Invalid project item structure:', projectItem);
                                return null;
                            }
                        }).filter(project => project !== null);
                        
                        // Filter out projects without required dates for automatic allocation
                        // Only projects with proper dates can be used for automatic allocation
                        const projectsForAutoAllocation = projects.filter(project => {
                            return project.startDate && project.endDate && project.status;
                        });

                        // Use filtered projects for automatic allocations, original projects list for manual assignments
                        projects = projectsForAutoAllocation;
                        
                        // Cache projects
                        this._projectsCache = projects;
                        this._projectsCacheTime = Date.now();
                        
                    } catch (error) {
                        console.warn('Error loading projects:', error);
                        projects = [];
                    }
                }
            } else {
                projects = this._projectsCache;
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
                    Object.entries(allocations).forEach(([monthKey, monthData]) => {
                        const projects = Object.keys(monthData);
                        if (projects.length > 0) {
                        }
                    });
                    
                    // Check and flag overflow (capacity calculated internally using real working days)
                    const processedAllocations = this.checkAndFlagOverflow(allocations);
                    
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
                            originalMonthlyCapacity: 22 // Standard working days per month
                        }
                    };
                })
            );

            // Cache the result
            this._teamMembersCache = realTeamMembers;
            this._teamMembersCacheTime = Date.now();
            this._cacheIsDirty = false; // Reset dirty flag when cache is updated

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
    generateProjectStatusFromRealData(member, project, projectId = null) {
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
        const overflowBadge = ''; // Removed overflow badge as requested
        
        // Use projectId if available, fallback to project name for backward compatibility
        const effectiveProjectId = projectId || this.getProjectIdByName(project);
        
        return `
            <select class="status-dropdown" 
                    data-member-id="${member.id}" 
                    data-project-id="${effectiveProjectId}"
                    onchange="window.capacityManager?.handleProjectStatusChange(this)">
                <option value="approved" ${predominantStatus === 'approved' ? 'selected' : ''}>✓ Approved</option>
                <option value="pending" ${predominantStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
            </select>${overflowBadge}
        `;
    }

    /**
     * Generate project status dropdown for gantt table
     */
    generateProjectStatusDropdown(projectData) {
        
        if (!projectData) {
            console.warn('No projectData provided to generateProjectStatusDropdown');
            return '<span class="status-badge pending">No Project Data</span>';
        }

        // Handle different projectData structures - prioritize real project ID
        let projectId = projectData.id || projectData.code;
        let projectName = projectData.name || projectData.code || projectId;
        
        // If no ID found, try to find the real project ID from the projects list
        if (!projectId || projectId === projectName) {
            // Search in projects for a project with matching name
            if (this.projects) {
                const foundProject = this.projects.find(p => p.name === projectName);
                if (foundProject) {
                    projectId = foundProject.id || foundProject.code;
                }
            }
        }
        

        if (!projectId || !projectName) {
            console.warn('Project missing ID or name:', projectData);
            return '<span class="status-badge pending">Missing Project Info</span>';
        }

        // Find project in the projects array to get its status
        const project = this.projects?.find(p => 
            p.id === projectId || 
            p.name === projectName ||
            p.code === projectId
        );
        
        // Get status from project, default to 'approved'
        const projectStatus = project?.status || 'approved';

        // Generate interactive dropdown for status change
        const overflowBadge = ''; // Removed overflow badge as requested
        
        return `
            <select class="status-dropdown project-status-dropdown" 
                    data-project-id="${projectId}"
                    data-project-name="${projectName}"
                    onchange="window.capacityManager?.handleProjectStatusChangeForProject(this)">
                <option value="approved" ${projectStatus === 'approved' ? 'selected' : ''}>✓ Approved</option>
                <option value="pending" ${projectStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
            </select>${overflowBadge}
        `;
    }

    /**
     * Handle project status change from timeline dropdown
     */
    async handleProjectStatusChange(selectElement) {
        try {
            const memberId = selectElement.dataset.memberId;
            const projectId = selectElement.dataset.projectId;
            const newStatus = selectElement.value;

            // Get project name for legacy compatibility
            const projectName = this.getProjectNameById(projectId);
            
            if (!projectName) {
                throw new Error(`Project with ID ${projectId} not found`);
            }

            // Update status at project level
            await this.updateProjectStatus(null, projectName, newStatus);
            
            // Refresh all capacity sections to reflect the change
            await this.refreshAllCapacitySections();
            
            // Show success notification
            NotificationManager.success(`Project ${projectName} status changed to ${newStatus}`);
            
        } catch (error) {
            console.error('Error changing project status:', error);
            NotificationManager.error(`Failed to change project status: ${error.message}`);
        }
    }

    /**
     * Handle project status change at project level (affects all team members)
     */
    async handleProjectStatusChangeForProject(selectElement) {
        try {
            const projectId = selectElement.dataset.projectId;
            const projectName = selectElement.dataset.projectName;
            const newStatus = selectElement.value;


            // Update status at project level
            await this.updateProjectStatus(projectId, projectName, newStatus);
            
            // Refresh all capacity sections to reflect the changes
            await this.refreshAllCapacitySections();
            
            // Show success notification (no automatic save)
            NotificationManager.success(`Project ${projectName} status changed to ${newStatus}`);
            
        } catch (error) {
            console.error('Error changing project status:', error);
            NotificationManager.error(`Failed to change project status: ${error.message}`);
        }
    }

    /**
     * Update project status at project level
     */
    async updateProjectStatus(projectId, projectName, newStatus) {
        // Find project by ID or name in the projects array
        const project = this.projects?.find(p => 
            p.id === projectId || 
            p.name === projectName ||
            p.code === projectId
        );
        
        if (!project) {
            console.error(`Project not found with ID/name: ${projectId || projectName}`);
            throw new Error(`Project not found: ${projectId || projectName}`);
        }
        
        // Update status at project level
        const oldStatus = project.status;
        project.status = newStatus;
        
        
        // Don't auto-save, let caller decide when to save
    }

    /**
     * Get project status from projects array by project ID or name
     */
    getProjectStatus(projectId, projectName) {
        if (!this.projects || this.projects.length === 0) {
            return 'approved'; // Default status
        }
        
        const project = this.projects.find(p => 
            p.id === projectId || 
            p.name === projectName ||
            p.code === projectId
        );
        
        return project?.status || 'approved';
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
            const status = allocation.status || 'pending';
            
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
        
    }

    /**
     * Load and populate the capacity planning tables with two-panel layout
     */
    async loadCapacityTable() {
        // Add debounce for loadCapacityTable to prevent excessive calls
        if (this._loadCapacityTableTimer) {
            clearTimeout(this._loadCapacityTableTimer);
        }
        
        // If already loading, return existing promise
        if (this._loadingCapacityTable) {
            return this._capacityTablePromise || Promise.resolve();
        }
        
        this._loadingCapacityTable = true;
        
        this._capacityTablePromise = (async () => {
            try {
                const rawTeamMembers = await this.getRealTeamMembers();
        const teamMembers = this.consolidateTeamMembersByPerson(rawTeamMembers);
        
        // Store consolidated team members for use in other functions
        this.consolidatedTeamMembers = teamMembers;
        
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
        
            } catch (error) {
                console.error('Error loading capacity table:', error);
                throw error;
            } finally {
                this._loadingCapacityTable = false;
                this._capacityTablePromise = null;
            }
        })();
        
        return this._capacityTablePromise;
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
            // Find manual assignment for this project using multiple matching strategies
            if (this.manualAssignments?.length > 0) {
                // Strategy 1: Find by project name directly
                projectData.assignment = this.manualAssignments.find(a => {
                    const projectObj = this.getProjectNameById(a.projectId);
                    return projectObj === projectData.name;
                });
                
                // If found, add project ID to projectData
                if (projectData.assignment) {
                    projectData.id = projectData.assignment.projectId;
                }
                
                // Strategy 2: If not found, try by project object lookup
                if (!projectData.assignment) {
                    const projectObj = this.getProjectByName(projectData.name);
                    if (projectObj) {
                        // Add project ID from project object
                        projectData.id = projectObj.id;
                        
                        projectData.assignment = this.manualAssignments.find(a => 
                            a.projectId === projectObj.id
                        );
                    }
                }
                
                // Strategy 3: If still not found, try fuzzy matching
                if (!projectData.assignment) {
                    projectData.assignment = this.manualAssignments.find(a => {
                        return a.projectName === projectData.name || 
                               a.projectId === projectData.name;
                    });
                    
                    // If found via fuzzy matching, add project ID
                    if (projectData.assignment) {
                        projectData.id = projectData.assignment.projectId;
                    }
                }
            }
            
            // If no assignment found but we can still get project ID, try to find it
            if (!projectData.id) {
                const projectObj = this.getProjectByName(projectData.name);
                if (projectObj && projectObj.id) {
                    projectData.id = projectObj.id;
                }
            }
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
            <tr class="gantt-row project-row" data-project-name="${projectName}" data-status="${this.getProjectStatus(projectData.id, projectName)}" ${assignment ? `data-assignment-id="${assignment.id}"` : ''}>
                <td class="fixed-col expand-toggle">
                    <button class="expand-btn" data-expanded="false" data-project-id="${projectData.id}">
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
            if (!phase.startDate || !phase.endDate) {
                console.warn(`Phase ${phase.phaseName || phase.phaseId} missing start/end dates`);
                return;
            }
            
            const startDate = new Date(phase.startDate);
            const endDate = new Date(phase.endDate);
            const startMonth = this.getMonthFromDate(phase.startDate);
            const endMonth = this.getMonthFromDate(phase.endDate);
            const monthsSpanned = this.generateMonthsBetweenDates(phase.startDate, phase.endDate);
            
            
            
            // Create continuous bar only in the starting month
            if (!ganttBars[startMonth]) ganttBars[startMonth] = [];
            
            // Calculate precise positioning for continuous bar across all months
            const startMonthDate = new Date(startMonth + '-01');
            const daysInStartMonth = new Date(startMonthDate.getFullYear(), startMonthDate.getMonth() + 1, 0).getDate();
            const startPosition = ((startDate.getDate() - 1) / daysInStartMonth) * 100;
            
            // Calculate total width spanning all months
            let totalWidthPercent = 0;
            
            monthsSpanned.forEach((month, index) => {
                const monthDate = new Date(month + '-01');
                const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                
                if (month === startMonth && month === endMonth) {
                    // Phase starts and ends in same month
                    const endPosition = (endDate.getDate() / daysInMonth) * 100;
                    totalWidthPercent = endPosition - startPosition;
                } else if (month === startMonth) {
                    // First month: from start position to end of month
                    totalWidthPercent += (100 - startPosition);
                } else if (month === endMonth) {
                    // Last month: from start of month to end position
                    const endPosition = (endDate.getDate() / daysInMonth) * 100;
                    totalWidthPercent += endPosition;
                } else {
                    // Middle months: full month width
                    totalWidthPercent += 100;
                }
            });
            
            // Calculate absolute width in pixels for continuous bars
            const monthColumnWidth = 80; // px - matches CSS .month-col width
            
            // For continuous bars spanning multiple months, calculate proper pixel width
            let absoluteWidthPx;
            if (monthsSpanned.length > 1) {
                // Calculate width for continuous bars:
                // First month pixels (from start position to end of month)
                const firstMonthPixels = ((100 - startPosition) / 100) * monthColumnWidth;
                
                // Full months in between (excluding first and last)
                const fullMonths = Math.max(0, monthsSpanned.length - 2);
                const fullMonthsPixels = fullMonths * monthColumnWidth;
                
                // Last month pixels (from start of month to end position)
                let lastMonthPixels = 0;
                if (endMonth !== startMonth) {
                    const endMonthDate = new Date(endMonth + '-01');
                    const daysInEndMonth = new Date(endMonthDate.getFullYear(), endMonthDate.getMonth() + 1, 0).getDate();
                    const endPosition = (endDate.getDate() / daysInEndMonth) * 100;
                    lastMonthPixels = (endPosition / 100) * monthColumnWidth;
                }
                
                absoluteWidthPx = firstMonthPixels + fullMonthsPixels + lastMonthPixels;
            } else {
                // Single month bar: use percentage-based width
                absoluteWidthPx = (totalWidthPercent / 100) * monthColumnWidth;
            }
            
            const roundedStartPosition = Math.round(startPosition * 100) / 100;
            const roundedTotalWidthPercent = Math.round(totalWidthPercent * 100) / 100;
            const roundedAbsoluteWidthPx = Math.round(absoluteWidthPx * 100) / 100;
            
            

            ganttBars[startMonth].push({
                phaseName: phase.phaseName || `Phase ${phase.phaseId}`,
                phaseId: phase.phaseId || 'unknown',
                estimatedMDs: phase.estimatedMDs || 0,
                overflow: phase.overflow || 0,
                isStart: true,
                isEnd: startMonth === endMonth,
                startPosition: roundedStartPosition,
                totalWidthPercent: roundedTotalWidthPercent,
                absoluteWidthPx: roundedAbsoluteWidthPx,
                monthsSpanned: monthsSpanned.length,
                startDate: phase.startDate,
                endDate: phase.endDate,
                isContinuous: monthsSpanned.length > 1
            });
        });
        
        return ganttBars;
    }

    
    /**
     * Generate months between two dates - dedicated method for phase timeline
     */
    generateMonthsBetweenDates(startDate, endDate) {
        const months = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Ensure we have valid dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn('Invalid dates provided:', { startDate, endDate });
            return months;
        }
        
        // Start from the beginning of the start month
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        
        // Continue until we've passed the end date's month
        while (current.getFullYear() < end.getFullYear() || 
               (current.getFullYear() === end.getFullYear() && current.getMonth() <= end.getMonth())) {
            
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const monthString = `${year}-${month}`;
            months.push(monthString);
            
            // Move to next month
            current.setMonth(current.getMonth() + 1);
            
            // Safety check to prevent infinite loops
            if (months.length > 24) {
                console.warn('Month generation exceeded 24 months, breaking loop');
                break;
            }
        }
        
        return months;
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
                                       readonly
                                       data-member-id="${member.id}"
                                       data-project-id="${projectId}"
                                       data-month="${isoMonthKey}"
                                       data-original-value="${projectAllocation.days}"
                                       title="${memberName} - ${projectName}: ${projectAllocation.days} MDs">
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
            
            // Calculate phases info
            let phasesCount = 0;
            let phasesInfo = 'No phases defined';
            let totalMDs = 0;
            
            if (assignment?.phaseSchedule && Array.isArray(assignment.phaseSchedule)) {
                phasesCount = assignment.phaseSchedule.length;
                phasesInfo = assignment.phaseSchedule.map(phase => 
                    this.getPhaseDisplayName(phase.phaseName || phase.phaseId || 'Phase')
                ).join(', ');
                
                // Calculate total MDs from phase schedule
                totalMDs = assignment.phaseSchedule.reduce((sum, phase) => {
                    return sum + (parseFloat(phase.estimatedMDs) || 0);
                }, 0);
            } else if (assignment?.budgetInfo?.totalFinalMDs) {
                // Fallback to budget info if available
                totalMDs = parseFloat(assignment.budgetInfo.totalFinalMDs) || 0;
            }
            
            // Format phases info for display
            const shortPhasesInfo = phasesCount > 0 ? 
                assignment.phaseSchedule.map((_, index) => index).join(', ') : 
                'No phases';
            
            // Debug project data structure
            const effectiveProjectId = projectData.id || projectData.code || projectData.name || 'unknown';
            
            html += `
                <tr class="gantt-project-row" data-project-id="${effectiveProjectId}" data-status="${this.getProjectStatus(projectData.id, projectData.name)}">
                    <td class="fixed-col col-expand"></td>
                    <td class="fixed-col col-project-name">
                        <div class="project-name-cell">
                            <span class="project-name">${projectData.name}</span>
                        </div>
                    </td>
                    <td class="fixed-col col-status">
                        <div class="status-cell">
                            ${this.generateProjectStatusDropdown(projectData)}
                        </div>
                    </td>
                    <td class="fixed-col col-total-mds">
                        <div class="total-mds-cell">
                            <span class="total-mds-value">${totalMDs.toFixed(1)} MDs</span>
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
            
            const phaseBarsHTML = monthPhases.map((phase, index) => {
                // For continuous bars spanning multiple months, use pixel-based positioning and width
                // For single-month bars, use percentage-based positioning and width
                let left, width;
                
                if (phase.isContinuous) {
                    // Convert percentage position to pixels for consistent alignment with pixel width
                    const leftInPixels = (phase.startPosition / 100) * 80; // 80px is the month column width
                    left = `${leftInPixels}px`;
                    width = `${phase.absoluteWidthPx}px`;
                } else {
                    // Single month bars use percentages for both position and width
                    left = `${phase.startPosition}%`;
                    width = `${phase.totalWidthPercent}%`;
                }
                
                // Intelligent stacking: only stack vertically if phases truly overlap in dates
                let topOffset = 2; // Default top margin
                
                if (index > 0) {
                    // Check for actual date overlap with previous phases in the same month
                    let stackLevel = 0;
                    const currentStart = new Date(phase.startDate);
                    const currentEnd = new Date(phase.endDate);
                    
                    for (let i = 0; i < index; i++) {
                        const previousPhase = monthPhases[i];
                        const prevStart = new Date(previousPhase.startDate);
                        const prevEnd = new Date(previousPhase.endDate);
                        
                        // Check for actual date overlap: phases overlap if one starts before the other ends
                        const hasOverlap = currentStart <= prevEnd && currentEnd >= prevStart;
                        
                        if (hasOverlap) {
                            stackLevel++;
                        }
                    }
                    
                    // Only add vertical offset if there are actual overlapping phases
                    topOffset = 2 + (stackLevel * 18);
                }
                
                // Add visual indicator for continuous bars
                const continuousClass = phase.isContinuous ? 'continuous-bar' : '';
                const durationText = phase.isContinuous ? ` (${phase.monthsSpanned} months)` : '';
                
                return `
                    <div class="phase-bar phase-${phase.phaseId} ${phase.overflow > 0 ? 'overflow' : ''} ${continuousClass}" 
                         style="left: ${left}; width: ${width}; position: absolute; top: ${topOffset}px;"
                         title="${phase.phaseName}: ${phase.estimatedMDs} MDs${durationText} (${phase.startDate} → ${phase.endDate})${phase.overflow > 0 ? ` | Overflow: +${phase.overflow}` : ''}">
                        <span class="phase-name">${phase.phaseName.substring(0, 8)}</span>
                    </div>
                `;
            }).join('');
            
            // Calculate dynamic height based on number of stacked phases
            const containerHeight = Math.max(20, monthPhases.length * 18 + 4);
            
            return `
                <td class="month-col gantt-cell ${monthPhases.some(p => p.overflow > 0) ? 'has-overflow' : ''}">
                    <div class="phase-bars positioned-bars" style="height: ${containerHeight}px;">
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
        const uniqueMembers = new Map(); // Track unique team members
        
        projectsData.forEach(projectData => {
            projectData.members.forEach((memberData, memberId) => {
                const member = memberData.member;
                const key = `${memberId}_${projectData.name}`;
                
                // Track unique members for capacity rows
                if (!uniqueMembers.has(memberId)) {
                    uniqueMembers.set(memberId, member);
                }
                
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
        
        // Group allocations by member for better organization
        const memberGroups = new Map();
        allocationsByMember.forEach((data, key) => {
            const memberId = data.member.id;
            if (!memberGroups.has(memberId)) {
                memberGroups.set(memberId, []);
            }
            memberGroups.get(memberId).push(data);
        });
        
        // Generate rows: capacity row first, then allocation rows for each member
        memberGroups.forEach((allocations, memberId) => {
            const member = uniqueMembers.get(memberId);
            
            // Generate capacity row for this member
            html += this.generateCapacityRow(member, timelineMonths);
            
            // Generate allocation rows for all projects of this member
            allocations.forEach((data) => {
                const memberName = `${member.firstName} ${member.lastName}`;
                const memberRole = member.role || '';
                const memberVendor = member.vendor || '';
            
            // Calculate total MDs using the improved method
            const totalMDs = this.calculateRowTotalMDs(data.allocations, member, data.projectName, data.projectId);
            
            // Always show action buttons for manual assignments
            const hasAssignment = data.assignmentId && data.assignmentId !== 'undefined';
            
            html += `
                <tr class="allocation-member-row" data-member="${member.id}" data-project-id="${data.projectId}" data-status="${this.getProjectStatus(data.projectId, data.projectName)}" data-assignment-id="${data.assignmentId || ''}">
                    <td class="fixed-col col-expand">
                        <button class="expand-details-btn" data-member-id="${member.id}" data-project-id="${data.projectId}" data-assignment-id="${data.assignmentId || ''}" title="Show/Hide Phase Details">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </td>
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
                            ` : `
                                <span class="auto-generated-label">Auto-generated</span>
                            `}
                        </div>
                    </td>
                    <td class="fixed-col col-total-mds">
                        <div class="total-mds-cell">
                            <span class="total-mds-value">${totalMDs} MDs</span>
                        </div>
                    </td>
                    ${this.generateAllocationCells(member, data.projectName, data.projectId, data.allocations, timelineMonths)}
                </tr>
            `;
            }); // Close allocations.forEach
        }); // Close memberGroups.forEach
        
        return html;
    }

    /**
     * Generate capacity row for a team member showing available MDs per month
     */
    generateCapacityRow(member, timelineMonths) {
        const memberName = `${member.firstName} ${member.lastName}`;
        const memberRole = member.role || '';
        const memberVendor = member.vendor || '';
        
        // Calculate total capacity across all months
        let totalCapacity = 0;
        const capacityByMonth = {};
        
        timelineMonths.forEach(monthKey => {
            const isoMonth = this.convertTimelineToISOMonth(monthKey);
            try {
                const monthCapacity = this.workingDaysCalculator ? 
                    this.workingDaysCalculator.calculateAvailableCapacity(member, isoMonth, null, false) : 22;
                capacityByMonth[isoMonth] = Math.round(monthCapacity * 10) / 10;
                totalCapacity += monthCapacity;
            } catch (error) {
                // Fallback to default capacity if calculation fails
                capacityByMonth[isoMonth] = 22;
                totalCapacity += 22;
            }
        });
        
        totalCapacity = Math.round(totalCapacity * 10) / 10;
        
        return `
            <tr class="capacity-info-row" data-member="${member.id}">
                <td class="fixed-col col-expand">
                    <div class="capacity-expand">
                        <i class="fas fa-info-circle" title="Capacity information"></i>
                    </div>
                </td>
                <td class="fixed-col col-member">
                    <div class="capacity-info">
                        <span class="capacity-label">Available Capacity</span>
                        <span class="member-name">${memberName}</span>
                        <span class="member-details">${memberRole}${memberRole && memberVendor ? ' - ' : ''}${memberVendor}</span>
                    </div>
                </td>
                <td class="fixed-col col-actions">
                    <div class="capacity-actions">
                        <i class="fas fa-calendar-check" title="Capacity information"></i>
                    </div>
                </td>
                <td class="fixed-col col-total-mds">
                    <div class="total-capacity-cell">
                        <span class="total-capacity-value">${totalCapacity} MDs</span>
                    </div>
                </td>
                ${this.generateCapacityCells(member, capacityByMonth, timelineMonths)}
            </tr>
        `;
    }

    /**
     * Generate capacity cells for monthly available MDs
     */
    generateCapacityCells(member, capacityByMonth, timelineMonths) {
        return timelineMonths.map(monthKey => {
            const isoMonth = this.convertTimelineToISOMonth(monthKey);
            const capacity = capacityByMonth[isoMonth] || 0;
            
            return `
                <td class="month-col capacity-month" data-month="${isoMonth}">
                    <div class="capacity-display">
                        <span class="capacity-value">${capacity} MDs</span>
                    </div>
                </td>
            `;
        }).join('');
    }

    /**
     * Calculate total MDs for a row by summing all monthly allocations
     */
    calculateRowTotalMDs(allocations, member, projectName, projectId) {
        // Method 1: Try to get from assignment data (most accurate)
        if (projectId && this.manualAssignments) {
            const assignment = this.manualAssignments.find(a => a.projectId === projectId);
            if (assignment && assignment.phaseSchedule) {
                const totalFromPhases = assignment.phaseSchedule.reduce((sum, phase) => {
                    return sum + (parseFloat(phase.estimatedMDs) || 0);
                }, 0);
                if (totalFromPhases > 0) {
                    return Math.round(totalFromPhases * 10) / 10;
                }
            }
        }
        
        // Method 2: Try to calculate from member allocations for this specific project
        if (member && projectName && member.allocations) {
            let total = 0;
            Object.entries(member.allocations).forEach(([month, monthData]) => {
                if (/^\d{4}-\d{2}$/.test(month) && monthData && typeof monthData === 'object') {
                    const projectAllocation = monthData[projectName];
                    if (projectAllocation && typeof projectAllocation.planned === 'number') {
                        total += projectAllocation.planned;
                    }
                }
            });
            if (total > 0) {
                return Math.round(total * 10) / 10;
            }
        }
        
        // Method 3: Fallback to old calculation method
        if (!allocations || typeof allocations !== 'object') {
            return 0;
        }

        let total = 0;
        Object.entries(allocations).forEach(([month, monthData]) => {
            // Skip metadata fields and ensure it's a valid month format
            if (/^\\d{4}-\\d{2}$/.test(month) && monthData && typeof monthData === 'object') {
                Object.values(monthData).forEach(projectData => {
                    if (projectData && typeof projectData.days === 'number') {
                        total += projectData.days;
                    } else if (projectData && typeof projectData.planned === 'number') {
                        total += projectData.planned;
                    }
                });
            }
        });

        return Math.round(total * 10) / 10; // Round to 1 decimal place
    }

    /**
     * Update Total MDs column for a specific row by summing capacity inputs
     */
    updateRowTotalMDs(memberId, projectName, projectId = null) {
        try {
            // Find the row for this member/project - use projectId if available, fallback to projectName
            let row;
            if (projectId) {
                row = document.querySelector(`tr[data-member="${memberId}"][data-project-id="${projectId}"]`);
            } else {
                // Fallback to name-based lookup for backward compatibility
                row = document.querySelector(`tr[data-member="${memberId}"][data-project="${projectName}"]`);
            }
            
            if (!row) return;

            // Find all capacity input fields in this row
            const capacityInputs = row.querySelectorAll('.capacity-mds-input');
            let total = 0;

            capacityInputs.forEach(input => {
                const value = parseFloat(input.value) || 0;
                total += value;
            });

            // Update the total cell
            const totalCell = row.querySelector('.total-mds');
            if (totalCell) {
                totalCell.textContent = total.toFixed(1);
            }

        } catch (error) {
            console.error('Error updating row total MDs:', error);
        }
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
                                   readonly
                                   data-member-id="${member.id}" 
                                   data-project-id="${projectId}"
                                   data-month="${isoMonthKey}"
                                   data-original-value="${projectAllocation.days}"
                                   title="${member.firstName} ${member.lastName} - ${projectName}: ${projectAllocation.days} MDs">
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
    }

    /**
     * Initialize event listeners for allocation actions
     */
    initializeAllocationActions() {
        // Remove existing listener if it exists to prevent duplicates
        if (this._allocationActionsHandler) {
            document.removeEventListener('click', this._allocationActionsHandler);
        }
        
        // Create a single consolidated event handler for ALL assignment actions
        this._allocationActionsHandler = async (e) => {
            // Prevent event bubbling to avoid multiple triggers
            e.stopPropagation();
            
            // Expand/collapse details buttons
            if (e.target.closest('.expand-details-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.expand-details-btn');
                const memberId = btn.dataset.memberId;
                const projectId = btn.dataset.projectId;
                const assignmentId = btn.dataset.assignmentId;
                await this.toggleAllocationDetails(memberId, projectId, assignmentId);
                return;
            }
            
            // Edit assignment buttons (both -assignment-btn and -allocation-btn)
            if (e.target.closest('.edit-assignment-btn') || e.target.closest('.edit-allocation-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.edit-assignment-btn') || e.target.closest('.edit-allocation-btn');
                const assignmentId = btn.dataset.assignmentId;
                await this.showEditAssignmentModal(assignmentId);
                return;
            }
            
            // Duplicate assignment buttons (both -assignment-btn and -allocation-btn)
            if (e.target.closest('.duplicate-assignment-btn') || e.target.closest('.duplicate-allocation-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.duplicate-assignment-btn') || e.target.closest('.duplicate-allocation-btn');
                const assignmentId = btn.dataset.assignmentId;
                await this.duplicateAssignment(assignmentId);
                return;
            }
            
            // Delete assignment buttons (both -assignment-btn and -allocation-btn)
            if (e.target.closest('.delete-assignment-btn') || e.target.closest('.delete-allocation-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.delete-assignment-btn') || e.target.closest('.delete-allocation-btn');
                const assignmentId = btn.dataset.assignmentId;
                await this.deleteAssignment(assignmentId);
                return;
            }
        };
        
        // Add the single delegated event listener
        document.addEventListener('click', this._allocationActionsHandler);
        
        // Handle capacity input changes with delegation
        if (this._capacityInputHandler) {
            document.removeEventListener('change', this._capacityInputHandler);
        }
        
        this._capacityInputHandler = async (e) => {
            if (e.target.classList.contains('capacity-mds-input')) {
                const input = e.target;
                const memberId = input.dataset.memberId;
                const project = input.dataset.project;
                const month = input.dataset.month;
                const value = parseInt(input.value) || 0;
                
                await this.updateCapacityValue(memberId, project, month, value);
            }
        };
        
        document.addEventListener('change', this._capacityInputHandler);
    }

    /**
     * Initialize expand/collapse functionality for Gantt rows
     */
    initializeGanttExpansion() {
        // Remove existing listener to prevent duplicates
        if (this._ganttExpansionHandler) {
            document.removeEventListener('click', this._ganttExpansionHandler);
        }
        
        // Create expansion handler
        this._ganttExpansionHandler = (e) => {
            if (e.target.classList.contains('expand-btn') || e.target.closest('.expand-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const button = e.target.closest('.expand-btn') || e.target;
                const projectName = button.dataset.project;
                this.toggleProjectExpansion(projectName, button);
            }
        };
        
        // Add event listener for expand/collapse buttons
        document.addEventListener('click', this._ganttExpansionHandler);
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
     * Initialize event listeners for capacity cells (no longer needed - cells are read-only)
     */
    initializeCapacityCellEventListeners() {
        // Cells are now read-only, no event listeners needed
        // All editing is done through the assignment modal
    }

    // handleCapacityValueChange method removed - cells are now read-only


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

    // triggerAutoRedistribution method removed - cells are now read-only

    // updateUIAfterRedistribution method removed - cells are now read-only

    // handleCapacityValueReset method removed - cells are now read-only

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
        if (percentage > 100) return 'over-utilization';
        if (percentage >= 90) return 'high-utilization';
        if (percentage >= 50) return 'medium-utilization';
        return 'low-utilization';
    }

    async generateMonthCapacityCell(member, monthKey) {
        // Get current overview status filter
        const overviewStatusFilter = document.getElementById('overview-status-filter');
        const statusFilterValue = overviewStatusFilter ? overviewStatusFilter.value : 'all';

        // Use data service to get capacity metrics with real working days for the month
        const [year, month] = monthKey.split('-').map(Number);
        const realWorkingDays = this.workingDaysCalculator.calculateWorkingDays(month, year, member.country || 'IT');
        const metrics = await this.calculateCapacityMetrics(member.id, monthKey, realWorkingDays);
        
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
    async loadProjectOptions() {
        const projectsFilter = document.getElementById('projects-filter');
        
        if (!projectsFilter) return;

        try {
            // Use the same method as the assignment modal to get all available projects
            const projects = await this.getAvailableProjects();
            
            // Create ID → Name mapping for filter logic
            this.projectIdToNameMap = new Map();
            
            let options = '<option value="">All Projects</option>';
            
            if (Array.isArray(projects) && projects.length > 0) {
                projects.forEach(project => {
                    const projectId = project.id || project.code;
                    const projectName = project.name || project.code;
                    
                    // Store ID → Name mapping
                    this.projectIdToNameMap.set(projectId, projectName);
                    
                    options += `<option value="${projectId}">${projectName}</option>`;
                });
            } else {
                // Fallback to current project if no projects available through getAvailableProjects
                const currentProject = StateSelectors.getCurrentProject();
                if (currentProject) {
                    const currentProjectName = currentProject.project?.name || 'Current Project';
                    this.projectIdToNameMap.set('current', currentProjectName);
                    options += `<option value="current">${currentProjectName}</option>`;
                }
            }
            
            projectsFilter.innerHTML = options;
            
        } catch (error) {
            console.error('Error loading project options for filter:', error);
            projectsFilter.innerHTML = '<option value="">Error Loading Projects</option>';
        }
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
            // Extract member ID without team prefix (e.g., "member-fullstack-1" from "team-fullstack:member-fullstack-1")
            const memberId = member.id.includes(':') ? member.id.split(':')[1] : member.id;
            options += `<option value="${memberId}">${member.firstName} ${member.lastName}</option>`;
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
        
        // Get rows from different tables - treat them separately
        const ganttRows = document.querySelectorAll('#gantt-table .gantt-row, #gantt-table .gantt-project-row, #gantt-table .capacity-info-row');
        const allocationRows = document.querySelectorAll('#allocations-table .allocation-member-row, #allocations-table .capacity-info-row');
        
        // Get the project filter value - prioritize ID matching
        let projectFilterId = '';
        let projectFilterName = '';
        if (this.currentFilters.projects && this.currentFilters.projects.trim() !== '') {
            projectFilterId = this.currentFilters.projects;
            
            // Convert ID to name for fallback matching
            if (this.projectIdToNameMap && this.projectIdToNameMap.has(this.currentFilters.projects)) {
                projectFilterName = this.projectIdToNameMap.get(this.currentFilters.projects);
            } else {
                // If no mapping exists, assume the filter value might be a name already
                projectFilterName = this.currentFilters.projects;
            }
        }
        
        // Filter Project Phases Timeline (gantt-table)
        ganttRows.forEach(row => {
            let shouldShow = true;
            
            // Team filter does NOT apply to Project Phases Timeline
            // Only apply project and status filters to gantt table
            
            // Apply project filter to gantt rows (but not capacity rows)
            if ((projectFilterId || projectFilterName) && !row.classList.contains('capacity-info-row')) {
                // Priority 1: Check for data-project-id (preferred)
                const rowProjectId = row.dataset.projectId;
                
                // Priority 2: Check for data-project (name-based, fallback)
                const rowProjectName = row.dataset.project || row.dataset.projectName;
                
                let matches = false;
                
                // First try ID matching (most reliable)
                if (projectFilterId && rowProjectId && projectFilterId === rowProjectId) {
                    matches = true;
                }
                
                // Then try name matching (fallback)
                if (!matches && projectFilterName && rowProjectName) {
                    if (projectFilterName === 'current') {
                        // Special handling for "current" projects
                        if (rowProjectName.toLowerCase().includes('current') || 
                            rowProjectName.toLowerCase().includes('new project')) {
                            matches = true;
                        }
                    } else {
                        // Exact name match
                        if (rowProjectName === projectFilterName) {
                            matches = true;
                        }
                    }
                }
                
                if (!matches) {
                    shouldShow = false;
                }
            }
            
            // Apply status filter to gantt rows (but not capacity rows)
            if (this.currentFilters.status && this.currentFilters.status !== 'all' && 
                !row.classList.contains('capacity-info-row')) {
                const rowStatus = row.dataset.status || 'approved';
                if (rowStatus !== this.currentFilters.status) {
                    shouldShow = false;
                }
            }
            
            row.style.display = shouldShow ? '' : 'none';
        });
        
        // Filter Team Member Allocations (allocations-table)
        allocationRows.forEach(row => {
            let shouldShow = true;
            
            // Apply team filter to both allocation rows AND capacity rows
            if (this.currentFilters.team && this.currentFilters.team.trim() !== '') {
                const rowMemberId = row.dataset.member || row.dataset.memberid;
                const filterMemberId = this.currentFilters.team;
                if (filterMemberId !== rowMemberId) {
                    shouldShow = false;
                }
            }
            
            // Apply project filter to allocation rows (not capacity rows)
            if ((projectFilterId || projectFilterName) && !row.classList.contains('capacity-info-row')) {
                // Priority 1: Check for data-project-id (preferred)
                const rowProjectId = row.dataset.projectId;
                
                // Priority 2: Check for data-project (name-based, fallback)
                const rowProjectName = row.dataset.project || row.dataset.projectName;
                
                let matches = false;
                
                // First try ID matching (most reliable)
                if (projectFilterId && rowProjectId && projectFilterId === rowProjectId) {
                    matches = true;
                }
                
                // Then try name matching (fallback)
                if (!matches && projectFilterName && rowProjectName) {
                    if (projectFilterName === 'current') {
                        // Special handling for "current" projects
                        if (rowProjectName.toLowerCase().includes('current') || 
                            rowProjectName.toLowerCase().includes('new project')) {
                            matches = true;
                        }
                    } else {
                        // Exact name match
                        if (rowProjectName === projectFilterName) {
                            matches = true;
                        }
                    }
                }
                
                if (!matches) {
                    shouldShow = false;
                }
            }
            
            // Apply status filter to allocation rows (not capacity rows)
            if (this.currentFilters.status && this.currentFilters.status !== 'all' && 
                !row.classList.contains('capacity-info-row')) {
                const rowStatus = row.dataset.status || 'approved';
                if (rowStatus !== this.currentFilters.status) {
                    shouldShow = false;
                }
            }
            
            row.style.display = shouldShow ? '' : 'none';
        });

        // Update filter UI indicators
        this.updateFilterIndicators();
    }

    /**
     * Update visual indicators for active filters
     */
    updateFilterIndicators() {
        const filters = [
            { id: 'team-filter', key: 'team' },
            { id: 'projects-filter', key: 'projects' },
            { id: 'status-filter', key: 'status' }
        ];

        filters.forEach(({ id, key }) => {
            const filterElement = document.getElementById(id);
            if (filterElement) {
                const isActive = this.currentFilters[key] && 
                                this.currentFilters[key] !== '' && 
                                this.currentFilters[key] !== 'all';
                
                if (isActive) {
                    filterElement.classList.add('filter-active');
                } else {
                    filterElement.classList.remove('filter-active');
                }
            }
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
        // This would open the team member modal
        // For now, just log the action
        NotificationManager.info('Add Team Member: Feature in development');
    }

    /**
     * Show add assignment modal
     */
    async showAddAssignmentModal(mode = 'create', assignmentData = null) {
        // Prevent multiple simultaneous calls to this method
        if (this._showingAssignmentModal) {
            return;
        }
        
        this._showingAssignmentModal = true;
        
        try {
            
            // Check if modal already exists
            let modal = document.getElementById('assignment-modal');
            if (!modal) {
                // Create the modal HTML - 🔧 FIXED: Project selection BEFORE Team Member
                modal = document.createElement('div');
                modal.id = 'assignment-modal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content assignment-modal-content">
                        <div class="modal-header">
                            <h3 id="assignment-modal-title">Add Team Member Assignment</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="assignment-form">
                                <div class="form-group">
                                    <label for="assignment-project">Project *</label>
                                    <select id="assignment-project" name="project" required>
                                        <option value="">Select Project</option>
                                    </select>
                                    <small class="field-info" id="project-readonly-info" style="display: none; color: #888;">Project cannot be changed when editing an assignment</small>
                                </div>
                                <div class="form-group">
                                    <label for="assignment-team-member">Team Member *</label>
                                    <select id="assignment-team-member" name="teamMember" required>
                                        <option value="">First select a project to see available team members</option>
                                    </select>
                                    <small class="field-info" id="member-role-info"></small>
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
                            <button type="button" class="btn btn-secondary" id="cancel-assignment">Cancel</button>
                            <button type="submit" class="btn btn-primary" form="assignment-form" id="submit-assignment">Add Assignment</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                // IMPORTANT: Setup event listeners ONLY when creating the modal for the first time
                // This prevents duplicate listeners that cause multiple assignment creation
                
                // Setup form submission - ONLY ONCE when modal is created
                const form = document.getElementById('assignment-form');
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    // Prevent double-clicks by disabling the submit button
                    const submitBtn = document.getElementById('submit-assignment');
                    if (submitBtn && !submitBtn.disabled) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = mode === 'edit' ? 'Updating...' : 'Creating...';
                        
                        // Call handler and re-enable button when done
                        this.handleAddAssignment().finally(() => {
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.textContent = mode === 'edit' ? 'Update Assignment' : 'Add Assignment';
                            }
                        });
                    }
                });

                // Setup modal close handlers - ONLY ONCE when modal is created
                modal.querySelectorAll('.modal-close').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.resetAssignmentModal();
                        modal.classList.remove('active');
                    });
                });
                
                // Setup cancel button handler separately
                modal.querySelector('#cancel-assignment').addEventListener('click', () => {
                    this.resetAssignmentModal();
                    modal.classList.remove('active');
                });
            }

            // Reset modal based on mode
            if (mode === 'edit') {
                // For edit mode, use partial reset to preserve data
                this.partialResetModal();
            } else {
                // For create/duplicate modes, do full reset
                this.resetAssignmentModal();
            }

            // Set modal mode and data
            modal.dataset.mode = mode;
            
            // CRITICAL FIX: Only set editingAssignmentId for edit mode, NOT for duplicate mode
            if (mode === 'edit' && assignmentData) {
                modal.dataset.editingAssignmentId = assignmentData.id;
            } else {
                // For create and duplicate modes, ensure no editingAssignmentId is set
                delete modal.dataset.editingAssignmentId;
            }

            // Update modal title and button text based on mode
            const titleElement = document.getElementById('assignment-modal-title');
            const submitBtn = document.getElementById('submit-assignment');
            
            switch (mode) {
                case 'edit':
                    titleElement.textContent = 'Edit Team Member Assignment';
                    submitBtn.textContent = 'Update Assignment';
                    break;
                case 'duplicate':
                    titleElement.textContent = 'Duplicate Team Member Assignment';
                    submitBtn.textContent = 'Create Duplicate';
                    break;
                default: // create
                    titleElement.textContent = 'Add Team Member Assignment';
                    submitBtn.textContent = 'Add Assignment';
                    break;
            }

            // Populate dropdowns with filtering based on mode
            await this.populateAssignmentModalDropdowns(mode);
            
            // Pre-populate form if editing or duplicating
            if (assignmentData) {
                await this.populateAssignmentForm(assignmentData, mode);
            }
            
            // Setup event listeners for dynamic content (this can be done every time)
            this.setupAssignmentModalEventListeners();

            // Show modal
            modal.classList.add('active');
            
        } finally {
            // Always reset the flag
            this._showingAssignmentModal = false;
        }
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
        
        // Reset internal flags to prevent loops
        this._duplicateFormPopulating = false;
        this._loadingProjectForAssignment = false;
        this._phaseDataPopulated = false;
        
        // Remove hidden input if it exists (from edit mode)
        const hiddenProjectInput = document.getElementById('hidden-project-input');
        if (hiddenProjectInput) {
            hiddenProjectInput.remove();
        }
        
        // Reset form
        document.getElementById('assignment-form').reset();
    }

    /**
     * Partial reset for edit mode - preserves form data but clears dynamic content
     */
    partialResetModal() {
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
        
        // Reset internal flags to prevent loops
        this._duplicateFormPopulating = false;
        this._loadingProjectForAssignment = false;
        this._phaseDataPopulated = false;
        
        // DON'T reset form data in edit mode - that's the key difference
        // DON'T clear modal title/button text - will be set by calling function
        // DON'T remove editingAssignmentId - will be set by calling function
    }
    
    /**
     * Handle team member selection change
     */
    async handleTeamMemberSelectionChange() {
        const teamMemberSelect = document.getElementById('assignment-team-member');
        const memberRoleInfo = document.getElementById('member-role-info');
        const projectSelect = document.getElementById('assignment-project');
        
        if (!teamMemberSelect.value) {
            memberRoleInfo.textContent = '';
            // Clear phases section when no team member is selected
            document.getElementById('phases-list').innerHTML = '';
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
            console.error('No member found with ID:', teamMemberSelect.value);
        }
        
        // 🔥 IMPROVED FIX: Update phases and budget when team member is selected
        if (projectSelect.value && teamMemberSelect.value) {
            try {
                const projects = await this.getAvailableProjects();
                let selectedProject = projects.find(p => p.id === projectSelect.value);
                if (!selectedProject) {
                    selectedProject = projects.find(p => p.filePath === projectSelect.value);
                }
                
                if (selectedProject && selectedProject.filePath) {
                    const dataManager = this.app?.managers?.data || window.dataManager;
                    const projectData = await dataManager.loadProject(selectedProject.filePath);
                    
                    // Try to get calculationData from latest version first
                    if (projectData.versions && projectData.versions.length > 0) {
                        const sortedVersions = projectData.versions.sort((a, b) => {
                            return b.id.localeCompare(a.id, undefined, { numeric: true });
                        });
                        
                        const latestVersion = sortedVersions[0];
                        if (latestVersion.projectSnapshot?.calculationData) {
                            projectData.calculationData = latestVersion.projectSnapshot.calculationData;
                        }
                    }

                    // Generate calculationData if missing
                    if (!projectData?.calculationData?.vendorCosts) {
                        console.log('🔧 Generating calculationData for team member selection...');
                        try {
                            const generatedCalculationData = await this.generateCalculationDataForProject(projectData);
                            if (generatedCalculationData && generatedCalculationData.vendorCosts?.length > 0) {
                                projectData.calculationData = generatedCalculationData;
                            } else {
                                projectData.calculationData = {
                                    vendorCosts: [],
                                    timestamp: new Date().toISOString()
                                };
                            }
                        } catch (error) {
                            console.error('Error generating calculationData:', error);
                            projectData.calculationData = {
                                vendorCosts: [],
                                timestamp: new Date().toISOString()
                            };
                        }
                    }
                    
                    // 🎯 UPDATE PHASES SECTION with project data that has calculationData
                    await this.updatePhasesSection(projectData);
                    
                    // Update budget section with the same project data
                    await this.updateBudgetSection(projectData);
                } else {
                    console.warn('Cannot load project data for phases/budget calculation');
                    document.getElementById('phases-list').innerHTML = '';
                    this.updateBudgetSection();
                }
            } catch (error) {
                console.error('Error loading project data for team member selection:', error);
                document.getElementById('phases-list').innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i><span>Error loading project phases</span></div>';
                this.updateBudgetSection();
            }
        } else {
            // If no project selected, just update budget
            this.updateBudgetSection();
        }
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
            
            // 🔧 CRITICAL FIX: Handle both ID and filePath-based lookup
            // The dropdown uses filePath as value, but sometimes we get project ID
            let project = projects.find(p => p.id === projectId);
            if (!project) {
                // If not found by ID, try to find by filePath (dropdown uses filePath as value)
                project = projects.find(p => p.filePath === projectId);
            }
            
            if (!project || !project.filePath) {
                console.error('❌ Project not found:', {
                    projectId,
                    searchedByType: projectId.includes('/') ? 'filePath' : 'id',
                    availableProjects: projects.map(p => ({ 
                        id: p.id, 
                        name: p.name, 
                        filePath: p.filePath,
                        hasFilePath: !!p.filePath 
                    }))
                });
                throw new Error('Project data not found');
            }
            
            // Load complete project data using the correct filePath
            const dataManager = this.app?.managers?.data || window.dataManager;
            const completeProjectData = await dataManager.loadProject(project.filePath);

            // Try to get calculationData from the latest version first
            if (completeProjectData.versions && completeProjectData.versions.length > 0) {
                const sortedVersions = completeProjectData.versions.sort((a, b) => {
                    return b.id.localeCompare(a.id, undefined, { numeric: true });
                });
                
                const latestVersion = sortedVersions[0];
                if (latestVersion.projectSnapshot?.calculationData) {
                    completeProjectData.calculationData = latestVersion.projectSnapshot.calculationData;
                    console.log('📊 Using calculationData from latest version:', latestVersion.id);
                }
            }

            // 🔥 IMPROVED FIX: Generate calculationData if still missing
            if (!completeProjectData?.calculationData?.vendorCosts) {
                console.log('🔧 GeneratingcalculationData for assignment modal...');
                
                try {
                    // Use the dedicated method to generate calculation data
                    const generatedCalculationData = await this.generateCalculationDataForProject(completeProjectData);
                    if (generatedCalculationData && generatedCalculationData.vendorCosts?.length > 0) {
                        completeProjectData.calculationData = generatedCalculationData;
                        console.log('✅ Generated calculationData with', generatedCalculationData.vendorCosts.length, 'vendor cost entries');
                    } else {
                        console.warn('⚠️ Failed to generate calculationData - using empty vendor costs');
                        completeProjectData.calculationData = {
                            vendorCosts: [],
                            timestamp: new Date().toISOString()
                        };
                    }
                } catch (error) {
                    console.error('❌ Error generating calculationData:', error);
                    // Create empty calculationData to prevent further errors
                    completeProjectData.calculationData = {
                        vendorCosts: [],
                        timestamp: new Date().toISOString()
                    };
                }
            }
            
            // Show dynamic sections
            document.getElementById('budget-section').style.display = 'block';
            document.getElementById('phases-section').style.display = 'block';
            
            // Update budget section and phases - pass the project data with calculationData
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
            return 'Unknown';
        }
        
        // Use same alternative access paths as getMemberRole()
        let configManager = this.app?.managers?.configuration;
        
        if (!configManager) {
            
            // Try alternative access paths
            configManager = this.app?.managers?.config || 
                           window.app?.managers?.configuration ||
                           window.configManager;

            if (!configManager) {
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
    async populateAssignmentModalDropdowns(mode = 'create') {
        // Prevent multiple simultaneous calls
        if (this._populatingDropdowns) {
            return;
        }
        
        this._populatingDropdowns = true;
        
        try {
            const teamMemberSelect = document.getElementById('assignment-team-member');
            const projectSelect = document.getElementById('assignment-project');
            const projectReadonlyInfo = document.getElementById('project-readonly-info');
            
            // 🚨 ULTRA THINK FIX: First populate projects, then team members will be filtered by project selection
            
            // Initialize team member dropdown with placeholder (will be populated after project selection)
            if (teamMemberSelect) {
                if (mode === 'edit') {
                    // In edit mode, populate all team members (existing behavior for edit)
                    teamMemberSelect.innerHTML = '<option value="">Select Team Member</option>';
                    
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
                } else {
                    // In create mode, show placeholder until project is selected
                    teamMemberSelect.innerHTML = '<option value="">First select a project to see available team members</option>';
                    teamMemberSelect.disabled = true;
                }
            }

            // Handle project dropdown based on mode
            if (projectSelect) {
                // Populate the projects dropdown
                await this.populateProjectsDropdown(projectSelect, mode);
                
                // Apply mode-specific restrictions
                if (mode === 'edit') {
                    // In edit mode, make project selection visually disabled but keep value
                    projectSelect.style.backgroundColor = '#f5f5f5';
                    projectSelect.style.cursor = 'not-allowed';
                    projectSelect.style.pointerEvents = 'none';
                    projectSelect.setAttribute('readonly', 'true');
                    
                    // Add a hidden input to ensure the value is always submitted
                    let hiddenProjectInput = document.getElementById('hidden-project-input');
                    if (!hiddenProjectInput) {
                        hiddenProjectInput = document.createElement('input');
                        hiddenProjectInput.type = 'hidden';
                        hiddenProjectInput.id = 'hidden-project-input';
                        hiddenProjectInput.name = 'project';
                        projectSelect.parentNode.appendChild(hiddenProjectInput);
                    }
                    
                    // Update hidden input when project select value changes
                    hiddenProjectInput.value = projectSelect.value;
                    
                    if (projectReadonlyInfo) {
                        projectReadonlyInfo.style.display = 'block';
                    }
                } else {
                    // In create/duplicate mode, enable project selection
                    projectSelect.style.backgroundColor = '';
                    projectSelect.style.cursor = '';
                    projectSelect.style.pointerEvents = '';
                    projectSelect.removeAttribute('readonly');
                    
                    // Remove hidden input if it exists
                    const hiddenProjectInput = document.getElementById('hidden-project-input');
                    if (hiddenProjectInput) {
                        hiddenProjectInput.remove();
                    }
                    
                    if (projectReadonlyInfo) {
                        projectReadonlyInfo.style.display = 'none';
                    }
                    
                    // 🚨 ULTRA THINK: Setup project selection handler to filter team members
                    this.setupProjectBasedTeamMemberFiltering(projectSelect, teamMemberSelect);
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
     * 🚨 ULTRA THINK: Setup project-based team member filtering
     * Only show team members who have corresponding vendor costs in the selected project's calculationData
     */
    setupProjectBasedTeamMemberFiltering(projectSelect, teamMemberSelect) {
        // Remove any existing change listeners first to prevent duplicates
        const existingHandler = this._projectFilterHandler;
        if (existingHandler) {
            projectSelect.removeEventListener('change', existingHandler);
        }

        // Create new handler
        this._projectFilterHandler = async (event) => {
            const selectedProjectPath = event.target.value;
            
            if (!selectedProjectPath) {
                // No project selected - disable team member dropdown
                teamMemberSelect.innerHTML = '<option value="">First select a project to see available team members</option>';
                teamMemberSelect.disabled = true;
                return;
            }

            try {
                console.log(`🔄 ULTRA THINK: Filtering team members for project ${selectedProjectPath}`);
                
                // Load the complete project data with calculationData
                const dataManager = this.app?.managers?.data || window.dataManager;
                let projectData = null;
                
                // 🚨 CRITICAL FIX: Handle both filepath and ID loading
                try {
                    projectData = await dataManager.loadProject(selectedProjectPath);
                    console.log(`📂 Successfully loaded project from: ${selectedProjectPath}`);
                } catch (loadError) {
                    console.error(`❌ Failed to load project: ${loadError.message}`);
                    // Show error in team member dropdown
                    teamMemberSelect.innerHTML = '<option value="">Error loading project data</option>';
                    teamMemberSelect.disabled = true;
                    return;
                }
                
                if (!projectData) {
                    console.error('❌ Project data is null after loading');
                    teamMemberSelect.innerHTML = '<option value="">Failed to load project data</option>';
                    teamMemberSelect.disabled = true;
                    return;
                }
                
                console.log('📊 Project calculationData:', projectData?.calculationData);
                
                // 🚨 CRITICAL FIX: Generate calculationData automatically if missing
                let calculationData = projectData?.calculationData;
                
                if (!calculationData?.vendorCosts) {
                    console.log('🔧 ULTRA THINK: calculationData missing - generating automatically...');
                    calculationData = await this.generateCalculationDataForProject(projectData);
                    console.log('✅ Generated calculationData:', calculationData);
                }
                
                // Get all team members
                const allTeamMembers = await this.getRealTeamMembers();
                console.log(`👥 Total team members available: ${allTeamMembers.length}`);
                
                // Filter team members based on calculationData
                const availableTeamMembers = this.filterTeamMembersByCalculationData(
                    allTeamMembers, 
                    calculationData
                );
                
                console.log(`✅ Team members with budget allocated: ${availableTeamMembers.length}`);
                
                // Update team member dropdown
                teamMemberSelect.innerHTML = '<option value="">Select Team Member</option>';
                
                if (availableTeamMembers.length === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = calculationData?.vendorCosts ? 
                        'No team members have budget allocated in this project' :
                        'Project has no budget calculated - please go to Calculations section first';
                    option.disabled = true;
                    teamMemberSelect.appendChild(option);
                    teamMemberSelect.disabled = true;
                } else {
                    // Populate with filtered team members
                    availableTeamMembers.forEach(member => {
                        const option = document.createElement('option');
                        option.value = member.id;
                        
                        // Get vendor details for enhanced display
                        const vendorDetails = this.getVendorDetails(member);
                        
                        // Format: "Ioana-Simina Stoica - RO [G2] Developer (€352/day)"
                        option.textContent = `${member.firstName} ${member.lastName} - ${vendorDetails.department} [${vendorDetails.role}] ${vendorDetails.name} (€${vendorDetails.rate}/day)`;
                        teamMemberSelect.appendChild(option);
                    });
                    teamMemberSelect.disabled = false;
                }
                
            } catch (error) {
                console.error('Error filtering team members by project:', error);
                teamMemberSelect.innerHTML = '<option value="">Error loading team members for this project</option>';
                teamMemberSelect.disabled = true;
            }
        };

        // Add the new event listener
        projectSelect.addEventListener('change', this._projectFilterHandler);
    }

    /**
     * 🚨 ULTRA THINK: Filter team members to only show those with budget allocated in calculationData
     * @param {Array} teamMembers - All available team members
     * @param {Object} calculationData - Project's calculationData with vendorCosts
     * @returns {Array} Filtered team members who have corresponding vendor costs
     */
    filterTeamMembersByCalculationData(teamMembers, calculationData) {
        if (!calculationData?.vendorCosts || !Array.isArray(calculationData.vendorCosts)) {
            console.warn('🚨 ULTRA THINK: No calculationData.vendorCosts found - no team members will be available');
            return [];
        }

        const vendorCosts = calculationData.vendorCosts;
        console.log('📊 Available vendor costs:', vendorCosts.map(vc => `${vc.vendor} - ${vc.role} (${vc.vendorId})`));

        const filteredMembers = teamMembers.filter(member => {
            // Get member's role and vendorId
            const memberRole = this.getMemberRole(member);
            const memberVendorId = member.vendorId;

            if (!memberRole || !memberVendorId) {
                console.warn(`⚠️ Team member ${member.firstName} ${member.lastName} missing role or vendorId`);
                return false;
            }

            // Check if there's a matching vendor cost entry
            const hasMatchingVendorCost = vendorCosts.some(vendorCost => {
                const vendorIdMatch = vendorCost.vendorId === memberVendorId;
                const roleMatch = vendorCost.role === memberRole;
                
                if (vendorIdMatch && roleMatch) {
                    console.log(`✅ Found match: ${member.firstName} ${member.lastName} [${memberRole}] -> ${vendorCost.vendor} (${vendorCost.finalMDs} MDs)`);
                    return true;
                }
                
                return false;
            });

            if (!hasMatchingVendorCost) {
                console.log(`❌ No match: ${member.firstName} ${member.lastName} [${memberRole}] (vendorId: ${memberVendorId})`);
            }

            return hasMatchingVendorCost;
        });

        console.log(`🎯 ULTRA THINK: Filtered ${teamMembers.length} -> ${filteredMembers.length} team members based on calculationData`);
        return filteredMembers;
    }

    /**
     * 🚨 ULTRA THINK: Generate calculationData for a project that doesn't have it
     * @param {Object} projectData - Project data to generate calculations for
     * @returns {Object} Generated calculationData with vendorCosts
     */
    async generateCalculationDataForProject(projectData) {
        if (!projectData) {
            console.warn('🚨 Cannot generate calculationData: no project data provided');
            return null;
        }

        // Store original state to restore later (declare at top level for proper scope)
        const originalCurrentProject = StateSelectors.getCurrentProject();

        try {
            console.log(`🔧 Generating calculationData for project: ${projectData.project?.name || 'Unknown'}`);
            
            // Validate project data structure
            if (!projectData.project || (!projectData.features && !projectData.phases)) {
                console.warn('⚠️ Project data incomplete - missing features or phases');
                return {
                    vendorCosts: [],
                    timestamp: new Date().toISOString(),
                    generationError: 'Project data incomplete - missing features or phases'
                };
            }
            
            // 🚨 PURE STATE MANAGER: Use store action instead of direct mutation
            (window.appStore || window.AppStore).getState().setProject(projectData);
            console.log('🔄 Temporarily set project as current for calculation');
            
            // 🚨 CRITICAL FIX: Access CalculationsManager from app.managers
            const calculationsManager = this.app?.managers?.calculations || this.app?.calculationsManager;
            
            if (!calculationsManager) {
                console.error('🚨 CalculationsManager not available');
                return {
                    vendorCosts: [],
                    timestamp: new Date().toISOString(),
                    generationError: 'CalculationsManager not available'
                };
            }
            
            // Generate vendor costs using CalculationsManager
            calculationsManager.calculateVendorCosts();
            
            let calculationData = null;
            
            // Check if we successfully generated vendor costs
            if (calculationsManager.vendorCosts && calculationsManager.vendorCosts.length > 0) {
                calculationData = {
                    vendorCosts: JSON.parse(JSON.stringify(calculationsManager.vendorCosts)), // Deep copy
                    timestamp: new Date().toISOString()
                };
                
                console.log(`✅ Generated calculationData with ${calculationData.vendorCosts.length} vendor cost entries`);
                
                // Log generated vendor costs for debugging
                calculationData.vendorCosts.forEach(vc => {
                    console.log(`   📊 ${vc.vendor} [${vc.role}] - ${vc.finalMDs} MDs (vendorId: ${vc.vendorId})`);
                });
            } else {
                console.warn('⚠️ No vendor costs generated - project may need phases configuration');
                console.log('📋 Project features count:', projectData.features?.length || 0);
                console.log('📋 Project phases:', Object.keys(projectData.phases || {}));
                
                calculationData = {
                    vendorCosts: [],
                    timestamp: new Date().toISOString(),
                    generationError: 'No vendor costs could be calculated - check project phases configuration'
                };
            }
            
            return calculationData;
            
        } catch (error) {
            console.error('🚨 Error generating calculationData:', error);
            
            return {
                vendorCosts: [],
                timestamp: new Date().toISOString(),
                generationError: error.message
            };
        } finally {
            // 🚨 PURE STATE MANAGER: Always restore original current project using store action
            const calculationsManager = this.app?.managers?.calculations || this.app?.calculationsManager;
            
            if (originalCurrentProject && calculationsManager) {
                (window.appStore || window.AppStore).getState().setProject(originalCurrentProject);
                calculationsManager.calculateVendorCosts();
                console.log('🔄 Restored original project state');
            } else if (calculationsManager) {
                // Clear the project state using store action
                (window.appStore || window.AppStore).getState().newProject();
                calculationsManager.vendorCosts = [];
                console.log('🔄 Cleared current project state');
            }
        }
    }

    /**
     * Setup dynamic project filtering based on selected team member
     */
    setupProjectFilteringForTeamMember(teamMemberSelect, projectSelect) {
        // Remove existing listeners to prevent duplicates
        const newTeamMemberSelect = teamMemberSelect.cloneNode(true);
        teamMemberSelect.parentNode.replaceChild(newTeamMemberSelect, teamMemberSelect);
        
        // Add change listener for team member selection
        newTeamMemberSelect.addEventListener('change', async (e) => {
            const selectedTeamMemberId = e.target.value;
            await this.filterProjectsForTeamMember(selectedTeamMemberId, projectSelect);
        });
    }

    /**
     * Filter projects dropdown based on selected team member's existing assignments
     */
    async filterProjectsForTeamMember(teamMemberId, projectSelect) {
        if (!teamMemberId) {
            // If no team member selected, show all projects
            await this.populateProjectsDropdown(projectSelect, 'create');
            return;
        }

        // Get all projects
        const allProjects = await this.getAvailableProjects();
        
        // Find existing assignments for this team member
        const existingProjectIds = new Set();
        if (this.manualAssignments && Array.isArray(this.manualAssignments)) {
            this.manualAssignments.forEach(assignment => {
                if (assignment.teamMemberId === teamMemberId) {
                    existingProjectIds.add(assignment.projectId);
                }
            });
        }

        // Filter out projects that already have assignments for this team member
        const availableProjects = allProjects.filter(project => 
            !existingProjectIds.has(project.id || project.code)
        );

        // Populate dropdown with filtered projects
        projectSelect.innerHTML = '<option value="">Select Project</option>';
        
        if (availableProjects.length > 0) {
            availableProjects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id || project.code;
                option.textContent = project.name || project.code;
                projectSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No available projects (all assigned to this member)';
            option.disabled = true;
            projectSelect.appendChild(option);
        }

    }

    /**
     * Populate projects dropdown (used for initial load and edit mode)
     */
    async populateProjectsDropdown(projectSelect, mode = 'create') {
        projectSelect.innerHTML = '<option value="">Select Project</option>';
        
        try {
            const projects = await this.getAvailableProjects();

            if (Array.isArray(projects) && projects.length > 0) {
                projects.forEach(project => {
                    const option = document.createElement('option');
                    // 🚨 CRITICAL FIX: Use filePath as value instead of ID for proper loading
                    option.value = project.filePath || project.id || project.code;
                    option.textContent = project.name || project.code;
                    
                    // Add debug info as data attribute
                    option.setAttribute('data-project-id', project.id || '');
                    option.setAttribute('data-project-name', project.name || '');
                    
                    projectSelect.appendChild(option);
                });
                
                console.log(`📋 Populated project dropdown with ${projects.length} projects`);
                projects.forEach(p => {
                    console.log(`   📁 ${p.name} -> filePath: ${p.filePath}`);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No projects available';
                option.disabled = true;
                projectSelect.appendChild(option);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            projectSelect.innerHTML = '<option value="">Error loading projects</option>';
        }
    }

    /**
     * Populate assignment form with existing data for edit/duplicate modes
     */
    async populateAssignmentForm(assignmentData, mode) {
        try {
            
            // Populate team member
            const teamMemberSelect = document.getElementById('assignment-team-member');
            if (teamMemberSelect && assignmentData.teamMemberId) {
                teamMemberSelect.value = assignmentData.teamMemberId;
                
                // ONLY trigger change event for duplicate mode, and only once
                // DO NOT trigger change in edit mode to avoid loops
                if (mode === 'duplicate' && !this._duplicateFormPopulating) {
                    this._duplicateFormPopulating = true;
                    teamMemberSelect.dispatchEvent(new Event('change'));
                    // Reset flag after a delay
                    setTimeout(() => {
                        this._duplicateFormPopulating = false;
                    }, 1000);
                }
            }

            // Populate project
            const projectSelect = document.getElementById('assignment-project');
            if (projectSelect && assignmentData.projectId) {
                projectSelect.value = assignmentData.projectId;
                
                // For edit mode, also update the hidden input
                if (mode === 'edit') {
                    const hiddenProjectInput = document.getElementById('hidden-project-input');
                    if (hiddenProjectInput) {
                        hiddenProjectInput.value = assignmentData.projectId;
                    }
                }
                
                // For edit/duplicate modes, load the project data to show budget and phases
                // But prevent multiple simultaneous calls
                if ((mode === 'edit' || mode === 'duplicate') && !this._loadingProjectForAssignment) {
                    this._loadingProjectForAssignment = true;
                    await this.loadProjectForAssignment(assignmentData.projectId);
                    this._loadingProjectForAssignment = false;
                }
            }

            // Populate notes
            const notesTextarea = document.getElementById('assignment-notes');
            if (notesTextarea) {
                if (mode === 'duplicate') {
                    // Add "(Copy)" suffix for duplicates
                    notesTextarea.value = (assignmentData.notes || '') + ' (Copy)';
                } else {
                    notesTextarea.value = assignmentData.notes || '';
                }
            }

            // For edit/duplicate modes, populate existing assignment data after project is loaded
            // But only once per modal opening
            if ((mode === 'edit' || mode === 'duplicate') && assignmentData.phaseSchedule && !this._phaseDataPopulated) {
                this._phaseDataPopulated = true;
                
                // Wait longer for the project data to be fully loaded and UI updated
                // Increased timeout to reduce race conditions with HTML regeneration
                setTimeout(() => {
                    this.populatePhaseScheduleData(assignmentData.phaseSchedule);
                    
                    // Also populate budget info if available
                    if (assignmentData.budgetInfo) {
                        this.populateBudgetInfo(assignmentData.budgetInfo);
                    }
                    
                    // Reset flag when modal closes
                    const modal = document.getElementById('assignment-modal');
                    if (modal) {
                        const closeHandler = () => {
                            this._phaseDataPopulated = false;
                            modal.removeEventListener('transitionend', closeHandler);
                        };
                        modal.addEventListener('transitionend', closeHandler);
                    }
                }, 500);
            }

        } catch (error) {
            console.error('Error populating assignment form:', error);
        }
    }
    
    /**
     * Update budget tracking section
     */
    async updateBudgetSection(completeProject = null) {
        const teamMemberSelect = document.getElementById('assignment-team-member');
        const projectSelect = document.getElementById('assignment-project');
        
        if (!teamMemberSelect.value || !projectSelect.value) {
            document.getElementById('total-final-mds').textContent = '-';
            document.getElementById('budget-context').textContent = '';
            this.updateBudgetBalance();
            return;
        }
        
        try {
            // 🚨 CRITICAL FIX: If no completeProject provided, try to load it
            let projectData = completeProject;
            if (!projectData) {
                console.log('🔄 No project data provided, attempting to load project for budget calculation');
                // Try to load the selected project
                const projects = await this.getAvailableProjects();
                // 🔧 CONSISTENT FIX: Handle both ID and filePath-based lookup
                let selectedProject = projects.find(p => p.id === projectSelect.value);
                if (!selectedProject) {
                    selectedProject = projects.find(p => p.filePath === projectSelect.value);
                }
                
                if (selectedProject && selectedProject.filePath) {
                    const dataManager = this.app?.managers?.data || window.dataManager;
                    projectData = await dataManager.loadProject(selectedProject.filePath);
                    
                    // Try to get calculationData from latest version if available
                    if (projectData.versions && projectData.versions.length > 0) {
                        const sortedVersions = projectData.versions.sort((a, b) => {
                            return b.id.localeCompare(a.id, undefined, { numeric: true });
                        });
                        
                        const latestVersion = sortedVersions[0];
                        if (latestVersion.projectSnapshot?.calculationData) {
                            projectData.calculationData = latestVersion.projectSnapshot.calculationData;
                        }
                    }
                } else {
                    console.warn('🚨 Cannot load project data for budget calculation', {
                        projectSelect: projectSelect.value,
                        availableProjects: projects.map(p => ({ id: p.id, name: p.name, hasFilePath: !!p.filePath }))
                    });
                    document.getElementById('total-final-mds').textContent = '-';
                    document.getElementById('budget-context').textContent = 'Project data not available';
                    this.updateBudgetBalance();
                    return;
                }
            }
            
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

            if (projectData.calculationData?.vendorCosts) {
                const vendorCost = projectData.calculationData.vendorCosts.find(cost => {
                    const vendorIdMatch = cost.vendorId === selectedMember.vendorId;
                    const roleMatch = cost.role === memberRole;
                    return vendorIdMatch && roleMatch;
                });

                if (vendorCost) {
                    finalMDs = vendorCost.finalMDs || 0;
                } else {
                    console.warn(`  - No vendor cost found for vendor ${selectedMember.vendorId} with role ${memberRole}`);
                }
            } else {
                console.error('  - CRITICAL: No calculationData.vendorCosts found in project');
                console.warn('  - 🔧 Budget calculation may not have been performed yet for this project');
            }

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
            
            // CRITICAL FIX: Re-populate phase dates after HTML regeneration in edit mode
            // Check if we're in edit mode and have assignment data with phase schedule
            const modal = document.getElementById('assignment-modal');
            const editingAssignmentId = modal?.dataset.editingAssignmentId;
            if (editingAssignmentId) {
                const assignment = this.manualAssignments.find(a => a.id === editingAssignmentId);
                if (assignment?.phaseSchedule) {
                    // Use setTimeout to ensure DOM is fully updated
                    setTimeout(() => {
                        this.populatePhaseScheduleData(assignment.phaseSchedule);
                    }, 50);
                }
            }
            
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
     * FIXED: Added DOM availability check with retry mechanism for better timing
     */
    calculatePhaseAvailability(phaseId, retryCount = 0) {
        const startDateInput = document.querySelector(`[data-phase-id="${phaseId}"] .phase-start-date`);
        const endDateInput = document.querySelector(`[data-phase-id="${phaseId}"] .phase-end-date`);
        const availableMDsSpan = document.querySelector(`.available-mds[data-phase-id="${phaseId}"]`);
        const overflowIndicator = document.querySelector(`.overflow-indicator[data-phase-id="${phaseId}"]`);
        
        // Check if DOM elements exist before accessing their properties
        if (!startDateInput || !endDateInput || !availableMDsSpan || !overflowIndicator) {
            // DOM not ready - retry once after short delay
            if (retryCount < 1) {
                setTimeout(() => this.calculatePhaseAvailability(phaseId, retryCount + 1), 100);
                return;
            }
            console.warn(`Missing DOM elements for phase ${phaseId} after retry:`, {
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
            // DOM element might not be ready yet - skip this calculation
            if (retryCount < 1) {
                setTimeout(() => this.calculatePhaseAvailability(phaseId, retryCount + 1), 100);
                return;
            }
            console.warn(`Phase MDs element not found for phaseId: ${phaseId} after retry - skipping calculation`);
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
        // Use unified calculation with holidays through WorkingDaysCalculator
        if (!this.workingDaysCalculator) {
            throw new Error('WorkingDaysCalculator not initialized - required for unified holiday calculations');
        }
        
        return this.workingDaysCalculator.calculateWorkingDaysBetween(startDate, endDate);
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
            
            // Check if we're editing an existing assignment
            const editingAssignmentId = modal?.dataset.editingAssignmentId;
            const isEditing = !!editingAssignmentId;
            
            
            let teamMemberId = formData.get('teamMember');
            let projectId = formData.get('project');
            const notes = formData.get('notes');
            
            // In edit mode, if form values are missing (due to disabled fields), use existing assignment data
            if (isEditing) {
                const existingAssignment = this.manualAssignments.find(a => a.id === editingAssignmentId);
                if (existingAssignment) {
                    // Use existing values if form values are empty (due to disabled fields)
                    teamMemberId = teamMemberId || existingAssignment.teamMemberId;
                    projectId = projectId || existingAssignment.projectId;
                    
                } else {
                    throw new Error('Assignment to edit not found');
                }
            }
            
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
            // 🔧 CONSISTENT FIX: Handle both ID and filePath-based lookup like in loadProjectForAssignment
            let project = projects.find(p => p.id === projectId);
            if (!project) {
                project = projects.find(p => p.filePath === projectId);
            }
            
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
                
                // Clear all caches to ensure fresh data
                this._teamMembersCache = null;
                this._teamMembersCacheTime = null;
                this._cacheIsDirty = true;

                // Synchronize main form phase inputs with updated assignment
                this.synchronizeMainFormPhaseDates(phaseSchedule);
                
                // Check for overflows and show alerts
                const overflows = this.detectOverflows(phaseSchedule);
                if (overflows.length > 0) {
                    const overflowMessages = overflows.map(o => `${o.phaseName}: +${o.overflow.toFixed(1)} MDs`);
                    NotificationManager.warning(`Assignment updated with overflows: ${overflowMessages.join(', ')}`);
                } else {
                    NotificationManager.success('Assignment updated successfully');
                }
                
            } else {
                // Create new assignment with a unique, stable ID
                const assignment = {
                    id: this.generateId('assignment-'),
                    teamMemberId: teamMemberId,
                    projectId: projectId,
                    phaseSchedule: phaseSchedule,
                    budgetInfo: budgetInfo,
                    calculatedAllocation: calculatedAllocation,
                    originalCalculatedAllocation: JSON.parse(JSON.stringify(calculatedAllocation)), // Save original for reset
                    notes: notes,
                    created: new Date().toISOString()
                };

                // Save assignment - NO duplicate checking, user manages duplicates manually
                this.manualAssignments.push(assignment);
                
                // Clear all caches to ensure fresh data
                this._teamMembersCache = null;
                this._teamMembersCacheTime = null;
                this._cacheIsDirty = true;

                // Synchronize main form phase inputs with new assignment
                this.synchronizeMainFormPhaseDates(phaseSchedule);

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
            const modal = document.getElementById('assignment-modal');
            const editingAssignmentId = modal?.dataset.editingAssignmentId;
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
     * Synchronize main form phase date inputs with assignment phase schedule
     * This ensures the main form reflects the latest phase dates from assignments
     */
    synchronizeMainFormPhaseDates(phaseSchedule) {
        
        phaseSchedule.forEach(phase => {
            // Find the main form phase inputs for this phase
            const mainFormPhaseElement = document.querySelector(`[data-phase-id="${phase.phaseId}"]`);
            if (!mainFormPhaseElement) {
                console.warn(`Main form phase element not found for phase ID: ${phase.phaseId}`);
                return;
            }
            
            // Update start date input
            const startDateInput = mainFormPhaseElement.querySelector('.phase-start-date');
            if (startDateInput && phase.startDate) {
                startDateInput.value = phase.startDate;
                startDateInput.setAttribute('value', phase.startDate);
            }
            
            // Update end date input
            const endDateInput = mainFormPhaseElement.querySelector('.phase-end-date');
            if (endDateInput && phase.endDate) {
                endDateInput.value = phase.endDate;
                endDateInput.setAttribute('value', phase.endDate);
            }
        });
        
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
     * Populate budget information in the modal
     */
    populateBudgetInfo(budgetInfo) {
        try {
            // Populate total final MDs
            const totalFinalMDsElement = document.getElementById('total-final-mds');
            if (totalFinalMDsElement && budgetInfo.totalFinalMDs !== undefined) {
                totalFinalMDsElement.textContent = budgetInfo.totalFinalMDs.toFixed(1);
            }

            // Populate total allocated MDs
            const totalAllocatedMDsElement = document.getElementById('total-allocated-mds');
            if (totalAllocatedMDsElement && budgetInfo.totalAllocatedMDs !== undefined) {
                totalAllocatedMDsElement.textContent = budgetInfo.totalAllocatedMDs.toFixed(1);
            }

            // Populate budget balance
            const budgetBalanceElement = document.getElementById('budget-balance');
            if (budgetBalanceElement && budgetInfo.balance !== undefined) {
                if (budgetInfo.isOverBudget) {
                    budgetBalanceElement.textContent = `${Math.abs(budgetInfo.balance).toFixed(1)} over budget`;
                    budgetBalanceElement.className = 'budget-balance over-budget';
                } else {
                    budgetBalanceElement.textContent = budgetInfo.balance.toFixed(1);
                    budgetBalanceElement.className = 'budget-balance available';
                }
            }

        } catch (error) {
            console.error('Error populating budget info:', error);
        }
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
        // Implement proper debounce mechanism to prevent multiple rapid calls
        if (this._refreshDebounceTimer) {
            clearTimeout(this._refreshDebounceTimer);
        }
        
        // Return a promise that resolves after debounce delay
        return new Promise((resolve, reject) => {
            this._refreshDebounceTimer = setTimeout(async () => {
                try {
                    await this._doRefreshAllCapacitySections();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 150); // 150ms debounce delay to group rapid operations
        });
    }
    
    /**
     * Internal method that performs the actual refresh
     */
    async _doRefreshAllCapacitySections() {
        // Prevent multiple simultaneous refreshes - return existing promise if already running
        if (this._refreshInProgress) {
            return this._currentRefreshPromise || Promise.resolve();
        }
        
        this._refreshInProgress = true;
        
        // Store the current refresh promise to return to subsequent calls
        this._currentRefreshPromise = (async () => {
        try {
            
            // Show loading state
            this.showCapacityLoadingState();
            
            // IMPORTANT: Clear all caches to ensure fresh data after assignment changes
            this._teamMembersCache = null;
            this._teamMembersCacheTime = null;
            this._cacheIsDirty = false; // Reset dirty flag after clearing cache
            this._capacityTablePromise = null;
            this._loadingCapacityTable = false;
            
            // Log current manual assignments state for debugging (only if debugging enabled)
            
            // Save expanded details state before refresh
            this._saveExpandedDetailsState();
            
            // Batch refresh operations for better performance
            const refreshOperations = [];
            
            // Priority 1: Essential data that affects other views
            refreshOperations.push(
                this.loadCapacityTable().catch(error => {
                    console.error('Error loading capacity table:', error);
                    return null; // Don't fail the entire refresh
                })
            );
            
            // Priority 2: Dashboard data (can run in parallel with capacity table)
            refreshOperations.push(
                this.loadDashboardData().catch(error => {
                    console.error('Error loading dashboard data:', error);
                    return null;
                })
            );
            
            // Priority 3: Conditional refreshes (only if elements exist and are visible)
            const overviewElement = document.getElementById('resource-overview-content');
            if (overviewElement && overviewElement.offsetParent !== null) {
                refreshOperations.push(
                    this.loadOverviewData().catch(error => {
                        console.error('Error loading overview data:', error);
                        return null;
                    })
                );
            }
            
            const timelineElement = document.getElementById('capacity-timeline-content');
            if (timelineElement && timelineElement.offsetParent !== null) {
                refreshOperations.push(
                    this.renderCapacityTimeline().catch(error => {
                        console.error('Error rendering capacity timeline:', error);
                        return null;
                    })
                );
            }
            
            // Execute all refresh operations in parallel
            const startTime = performance.now();
            await Promise.allSettled(refreshOperations);
            const endTime = performance.now();
            
            // Restore expanded details state after refresh
            await this._restoreExpandedDetailsState();
            
            NotificationManager.success('Capacity views updated');
            
        } catch (error) {
            console.error('Error refreshing capacity sections:', error);
            NotificationManager.error('Error updating capacity views');
            throw error;
        } finally {
            this.hideCapacityLoadingState();
            this._refreshInProgress = false;
            this._currentRefreshPromise = null;
        }
        })();
        
        return this._currentRefreshPromise;
    }

    /**
     * Show loading state in capacity sections
     */
    showCapacityLoadingState() {
        // Throttle loading state updates to prevent excessive DOM manipulation
        if (this._loadingStateShown) {
            return;
        }
        this._loadingStateShown = true;
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
        // Clear the loading state flag
        this._loadingStateShown = false;
        
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
     * Merge phase distribution into the final allocations object
     */
    mergePhaseDistribution(phaseAllocations, phaseDistribution, phase, projectName) {
        Object.keys(phaseDistribution).forEach(month => {
            // Skip metadata
            if (['hasOverflow', 'overflowAmount'].includes(month)) return;
            
            const allocation = phaseDistribution[month];
            if (allocation && allocation.planned > 0) {
                if (!phaseAllocations[month]) {
                    phaseAllocations[month] = {};
                }
                
                if (!phaseAllocations[month][projectName]) {
                    phaseAllocations[month][projectName] = {
                        days: 0,
                        hasOverflow: false,
                        overflowAmount: 0,
                        phases: []
                    };
                }
                
                // Add phase days to monthly total
                phaseAllocations[month][projectName].days += allocation.planned;
                
                // Add phase detail
                phaseAllocations[month][projectName].phases.push({
                    phaseName: phase.phaseName,
                    phaseDays: allocation.planned,
                    hasOverflow: false,
                    overflowAmount: 0
                });
            }
        });
        
        // Handle overflow from phase distribution
        if (phaseDistribution.hasOverflow && phaseDistribution.overflowAmount > 0) {
            // Find months where this phase was allocated and mark overflow
            Object.keys(phaseDistribution).forEach(month => {
                if (['hasOverflow', 'overflowAmount'].includes(month)) return;
                
                const allocation = phaseDistribution[month];
                if (allocation && allocation.planned > 0 && phaseAllocations[month] && phaseAllocations[month][projectName]) {
                    // Estimate overflow per month (simplified approach)
                    const monthOverflow = phaseDistribution.overflowAmount / 
                        Object.keys(phaseDistribution).filter(k => !['hasOverflow', 'overflowAmount'].includes(k)).length;
                    
                    phaseAllocations[month][projectName].hasOverflow = true;
                    phaseAllocations[month][projectName].overflowAmount += monthOverflow;
                    
                    // Update phase overflow info
                    const phaseInMonth = phaseAllocations[month][projectName].phases
                        .find(p => p.phaseName === phase.phaseName);
                    if (phaseInMonth) {
                        phaseInMonth.hasOverflow = true;
                        phaseInMonth.overflowAmount = monthOverflow;
                    }
                }
            });
        }
    }

    /**
     * Calculate phase-based allocation for assignment
     */
    async calculatePhaseBasedAllocation(teamMember, completeProject, phaseSchedule) {
        try {

            const memberRole = this.getMemberRole(teamMember);

            const allocations = {};
            
            // Use the new auto-distribution algorithm for better allocation
            
            if (this.autoDistribution) {
                        
                // Set current team member for the adapter
                this._currentTeamMember = teamMember;
                
                // Use phases in their predefined order (NOT sorted by date)
                // The order matters for allocation priority, not the dates
                const sortedPhases = phaseSchedule; // Keep original order
                
                
                // Distribute phase by phase, tracking existing allocations
                const existingAllocations = {}; // Track accumulated allocations per month
                const projectName = completeProject.project.name;
                
                for (const phase of sortedPhases) {
                    
                    const phaseDistribution = this.autoDistribution.autoDistributeMDs(
                        phase.estimatedMDs,
                        new Date(phase.startDate),
                        new Date(phase.endDate),
                        teamMember.id,
                        existingAllocations
                    );
                    
                    
                    // Merge phase distribution into final allocations
                    this.mergePhaseDistribution(allocations, phaseDistribution, phase, projectName);
                    
                    // Update existing allocations for next phase with temporal information
                    Object.keys(phaseDistribution).forEach(month => {
                        if (!['hasOverflow', 'overflowAmount'].includes(month)) {
                            const allocation = phaseDistribution[month];
                            if (allocation && allocation.planned > 0) {
                                // Initialize month array if not exists
                                if (!existingAllocations[month]) {
                                    existingAllocations[month] = [];
                                }
                                
                                // Add allocation with phase temporal info
                                existingAllocations[month].push({
                                    phaseId: phase.phaseId,
                                    phaseName: phase.phaseName,
                                    startDate: phase.startDate,
                                    endDate: phase.endDate,
                                    allocatedMDs: allocation.planned
                                });
                            }
                        }
                    });
                    
                }
            } else {
                throw new Error('Auto-distribution not available - cannot calculate phase-based allocation');
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
                const phaseKeys = Object.keys(completeProjectData.phases);

                const filteredKeys = phaseKeys.filter(key => key !== 'selectedSuppliers');

                phasesArray = filteredKeys.map(phaseKey => {
                    const phaseData = completeProjectData.phases[phaseKey];
                    
                    if (phaseData && typeof phaseData === 'object' && phaseData.manDays !== undefined) {
                        const convertedPhase = {
                            id: phaseKey,
                            name: phaseKey,
                            ...phaseData
                        };
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
            
            // Create project with assignment dates but preserve all other properties
            const projectForCalculation = {
                ...completeProject,
                name: completeProject.name || 'Unnamed Project',
                startDate: startDate,
                endDate: endDate,
                status: (completeProject.status && completeProject.status.trim()) ? completeProject.status.trim() : 'pending',
                phases: phasesArray  // Use converted phases array
            };
            
            // Use existing sequential allocation logic with complete project data
            const allocations = this.generateSequentialAllocations(teamMember, memberRole, [projectForCalculation]);

            if (Object.keys(allocations).length === 0) {
                console.warn('No allocations generated - debugging project phases...');
                if (projectForCalculation.phases && projectForCalculation.phases.length > 0) {
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
                    
                    // Calculate total days from phase allocations if available
                    let totalDays = 0;
                    if (Array.isArray(monthAllocationData)) {
                        // New format: array of phase allocations
                        totalDays = monthAllocationData.reduce((sum, phase) => {
                            const phaseValue = parseFloat(phase.allocatedMDs) || parseFloat(phase.planned) || parseFloat(phase.actual) || 0;
                            return sum + phaseValue;
                        }, 0);
                    } else {
                        // Legacy format
                        totalDays = monthAllocationData.days || 0;
                    }
                    
                    if (mergedAllocations[monthKey][projectName]) {
                        // If project already exists, add to existing allocation
                        mergedAllocations[monthKey][projectName].days += totalDays;
                        if (monthAllocationData.phases) {
                            mergedAllocations[monthKey][projectName].phases.push(...monthAllocationData.phases);
                        }
                    } else {
                        // Create new allocation entry
                        mergedAllocations[monthKey][projectName] = {
                            ...monthAllocationData,
                            days: totalDays,
                            isManual: true // Flag to identify manual assignments
                        };
                    }
                }
            });
        });
        
        
        return mergedAllocations;
    }
    
    /**
     * Get project name by ID
     */
    getProjectNameById(projectId, projectsList = null) {
        // Try to find in provided projects list first
        if (projectsList && Array.isArray(projectsList)) {
            const project = projectsList.find(p => p.id === projectId);
            if (project) {
                return project.name || project.code || `Project ${projectId}`;
            }
        }
        
        // Try to find in loaded projects (cached)
        if (this.cachedProjects) {
            const project = this.cachedProjects.find(p => p.id === projectId);
            if (project) {
                const projectName = project.name || project.code;
                return projectName;
            }
        }
        
        // Try loaded projects from capacity data
        if (this.loadedProjects && Array.isArray(this.loadedProjects)) {
            const project = this.loadedProjects.find(p => p.id === projectId);
            if (project) {
                return project.name || project.code || `Project ${projectId}`;
            }
        }
        
        // Fallback to generic name
        return `Project ${projectId}`;
    }

    /**
     * Get project by ID
     */
    getProjectById(projectId) {
        // Try loaded projects from capacity data first
        if (this.loadedProjects && Array.isArray(this.loadedProjects)) {
            const project = this.loadedProjects.find(p => p.id === projectId);
            if (project) {
                return project;
            }
        }
        
        // Try cached projects
        if (this.cachedProjects) {
            const project = this.cachedProjects.find(p => p.id === projectId);
            if (project) {
                return project;
            }
        }
        
        return null;
    }

    /**
     * Get project ID by project name
     */
    getProjectIdByName(projectName) {
        // Try to find in loaded projects
        if (this.cachedProjects) {
            const project = this.cachedProjects.find(p => (p.name || p.code) === projectName);
            if (project) {
                return project.id;
            }
        }
        
        // Fallback: return the name as ID if no match found
        return projectName;
    }

    /**
     * Get available projects for assignment
     */
    async getAvailableProjects() {
        try {
            
            // Try to get projects from DataManager
            const dataManager = this.app?.managers?.data || window.dataManager;
            if (!dataManager) {
                console.warn('DataManager not available');
                return [];
            }
            
            const projects = await dataManager.listProjects() || [];
            
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
                fileName: projectItem.fileName,
                status: 'pending' // Default status for all projects
            }));

            // Cache projects for lookup in manual assignments (use transformed structure for consistency)
            this.cachedProjects = availableProjects;
            
            // Store projects with status for capacity management
            // Preserve existing status from memory if already set
            if (this.projects && this.projects.length > 0) {
                availableProjects.forEach(newProject => {
                    const existingProject = this.projects.find(p => 
                        p.id === newProject.id || 
                        p.name === newProject.name ||
                        p.code === newProject.code
                    );
                    if (existingProject && existingProject.status) {
                        newProject.status = existingProject.status;
                    }
                });
            }
            this.projects = availableProjects;
            
            // Return only real projects, no mock fallback
            if (availableProjects.length === 0) {
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
        
        
        // Use the proper edit mode in showAddAssignmentModal
        await this.showAddAssignmentModal('edit', assignment);
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
            const phaseElement = document.querySelector(`[data-phase-id="${phase.phaseId}"]`);
            if (!phaseElement) {
                console.warn(`Phase element not found for phase ID: ${phase.phaseId}`);
                return;
            }
            
            // Fill start date
            const startDateInput = phaseElement.querySelector('.phase-start-date');
            if (startDateInput && phase.startDate) {
                startDateInput.value = phase.startDate;
                // Force update the DOM attribute as well
                startDateInput.setAttribute('value', phase.startDate);
            }
            
            // Fill end date
            const endDateInput = phaseElement.querySelector('.phase-end-date');
            if (endDateInput && phase.endDate) {
                endDateInput.value = phase.endDate;
                // Force update the DOM attribute as well
                endDateInput.setAttribute('value', phase.endDate);
            }
            
            // Fill estimated MDs if available
            const phaseMDsElement = phaseElement.querySelector('.phase-mds');
            if (phaseMDsElement && phase.estimatedMDs !== undefined) {
                phaseMDsElement.textContent = phase.estimatedMDs.toFixed(1);
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
            // Instead of creating the duplicate immediately, open modal with assignment data
            await this.showAddAssignmentModal('duplicate', assignment);
            
        } catch (error) {
            console.error('Error opening duplicate assignment modal:', error);
            NotificationManager.error(`Failed to open duplicate assignment: ${error.message}`);
        }
    }

    /**
     * Delete assignment
     */
    async deleteAssignment(assignmentId) {
        // Reset stuck flag after 5 seconds (failsafe)
        if (this.deletingAssignment && this.deleteStartTime && (Date.now() - this.deleteStartTime > 5000)) {
            this.deletingAssignment = null;
            this.deleteStartTime = null;
        }
        
        // Prevent duplicate calls by checking if deletion is already in progress for THE SAME assignment
        if (this.deletingAssignment === assignmentId) {
            return;
        }
        
        // If we have a different assignment ID, reset the flag (important for re-rendered buttons)
        if (this.deletingAssignment && this.deletingAssignment !== assignmentId) {
            this.deletingAssignment = null;
            this.deleteStartTime = null;
        }
        
        try {
            // Check if manual assignments array exists
            if (!this.manualAssignments || !Array.isArray(this.manualAssignments)) {
                NotificationManager.info('No assignments to delete');
                return;
            }
            
            const assignment = this.manualAssignments.find(a => a.id === assignmentId);
            if (!assignment) {
                NotificationManager.error('Assignment not found - it may have already been deleted');
                return;
            }
        
            // Get readable names for team member and project
            let teamMemberName = assignment.teamMemberId;
            let projectName = assignment.projectId;
            
            try {
                // Get team member data to show name instead of ID
                const teamMembers = await this.getRealTeamMembers();
                const teamMember = teamMembers.find(m => m.id === assignment.teamMemberId);
                if (teamMember) {
                    teamMemberName = `${teamMember.firstName} ${teamMember.lastName}`;
                }
                
                // Get project data to show name instead of ID
                const projects = await this.getAvailableProjects();
                // 🔧 CONSISTENT FIX: Handle both ID and filePath-based lookup
                let project = projects.find(p => p.id === assignment.projectId);
                if (!project) {
                    project = projects.find(p => p.filePath === assignment.projectId);
                }
                if (project) {
                    projectName = project.name || project.id;
                }
            } catch (error) {
                console.warn('Error getting readable names for confirmation dialog:', error);
                // Continue with IDs if names can't be retrieved
            }
        
            // Show confirmation dialog with readable names
            const confirmed = confirm(`Are you sure you want to delete this assignment?\n\nTeam Member: ${teamMemberName}\nProject: ${projectName}`);
            if (!confirmed) {
                // User cancelled - no need to set/reset flag
                return;
            }
            
            // Set flag to prevent duplicate calls ONLY after user confirms
            this.deletingAssignment = assignmentId;
            this.deleteStartTime = Date.now();
            
            // Remove from manual assignments array
            const index = this.manualAssignments.findIndex(a => a.id === assignmentId);
            if (index > -1) {
                // Store removed assignment for logging
                const removedAssignment = this.manualAssignments.splice(index, 1)[0];
                
                // Clear any cached data related to this assignment
                this._cacheIsDirty = true;
                this._teamMembersCache = null; // Force reload of team members
                this._teamMembersCacheTime = null;
                
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
     * Mark assignment-related caches as dirty for efficient cache management
     */
    markCacheAsDirty() {
        this._cacheIsDirty = true;
        
        // Clear only non-critical caches immediately
        this._capacityTablePromise = null;
        this._loadingCapacityTable = false;
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
    async editAssignment(assignmentId) {
        
        // Find the assignment to edit
        const assignment = this.manualAssignments.find(a => a.id === assignmentId);
        if (!assignment) {
            console.error(`Assignment not found: ${assignmentId}`);
            NotificationManager.error(`Assignment ${assignmentId} not found`);
            return;
        }
        
        
        // Open modal in edit mode with the assignment data
        await this.showAddAssignmentModal('edit', assignment);
    }

    /**
     * Toggle phase details for an allocation row
     */
    async toggleAllocationDetails(memberId, projectId, assignmentId) {
        try {
            // Create unique identifier for this row using a separator that won't conflict
            const rowId = `${memberId}|${projectId}|${assignmentId}`;
            
            // Find the allocation row
            const allocationRow = document.querySelector(`#allocations-table .allocation-member-row[data-member="${memberId}"][data-project-id="${projectId}"]`);
            if (!allocationRow) {
                console.error('Allocation row not found');
                return;
            }

            // Check if details row already exists
            const existingDetailsRow = allocationRow.nextElementSibling;
            const isExpanded = existingDetailsRow && existingDetailsRow.classList.contains('allocation-details-row');
            
            const expandBtn = allocationRow.querySelector('.expand-details-btn i');
            
            if (isExpanded) {
                // Collapse: remove details row
                existingDetailsRow.remove();
                expandBtn.className = 'fas fa-chevron-right';
                // Remove from tracking set
                this._expandedDetailsRows.delete(rowId);
            } else {
                // Expand: create and insert details row
                const detailsRow = await this.createAllocationDetailsRow(memberId, projectId, assignmentId);
                if (detailsRow) {
                    allocationRow.insertAdjacentElement('afterend', detailsRow);
                    expandBtn.className = 'fas fa-chevron-down';
                    // Add to tracking set
                    this._expandedDetailsRows.add(rowId);
                }
            }
        } catch (error) {
            console.error('Error toggling allocation details:', error);
        }
    }

    /**
     * Save current expanded details state before refresh
     */
    _saveExpandedDetailsState() {
        // Clear existing state first
        this._expandedDetailsRows.clear();
        
        // Find all currently expanded rows and save their identifiers
        const expandedRows = document.querySelectorAll('#allocations-table .allocation-member-row');
        expandedRows.forEach(row => {
            const nextRow = row.nextElementSibling;
            if (nextRow && nextRow.classList.contains('allocation-details-row')) {
                const memberId = row.dataset.member;
                const projectId = row.dataset.projectId;
                const assignmentId = row.dataset.assignmentId;
                
                if (memberId && projectId && assignmentId) {
                    const rowId = `${memberId}|${projectId}|${assignmentId}`;
                    this._expandedDetailsRows.add(rowId);
                }
            }
        });
        
    }

    /**
     * Restore expanded details state after refresh
     */
    async _restoreExpandedDetailsState() {
        if (this._expandedDetailsRows.size === 0) {
            return; // Nothing to restore
        }

        
        // Process each saved expanded row
        for (const rowId of this._expandedDetailsRows) {
            try {
                const [memberId, projectId, assignmentId] = rowId.split('|');
                
                // Find the row in the DOM
                const allocationRow = document.querySelector(`#allocations-table .allocation-member-row[data-member="${memberId}"][data-project-id="${projectId}"]`);
                if (!allocationRow) {
                    console.warn(`Row not found during restore: ${rowId}`);
                    continue;
                }

                // Check if already expanded (shouldn't be, but safety check)
                const existingDetailsRow = allocationRow.nextElementSibling;
                if (existingDetailsRow && existingDetailsRow.classList.contains('allocation-details-row')) {
                    continue; // Already expanded
                }

                // Expand the row
                const detailsRow = await this.createAllocationDetailsRow(memberId, projectId, assignmentId);
                if (detailsRow) {
                    allocationRow.insertAdjacentElement('afterend', detailsRow);
                    const expandBtn = allocationRow.querySelector('.expand-details-btn i');
                    if (expandBtn) {
                        expandBtn.className = 'fas fa-chevron-down';
                    }
                }
            } catch (error) {
                console.warn(`Error restoring expanded state for row ${rowId}:`, error);
            }
        }
        
    }

    /**
     * Create detailed phase breakdown row
     */
    async createAllocationDetailsRow(memberId, projectId, assignmentId) {
        try {
            // Get assignment data
            const assignment = this.manualAssignments.find(a => a.id === assignmentId);
            if (!assignment) {
                console.error('Assignment not found:', assignmentId);
                return null;
            }

            // Get project name for display
            const projectName = this.getProjectNameById(assignment.projectId) || 'Unknown Project';

            // Calculate phase breakdown using assignment data
            const phaseBreakdown = await this.calculatePhaseBreakdown(assignment);
            
            // Generate details table HTML
            const detailsHTML = this.generatePhaseDetailsTable(phaseBreakdown);
            
            // Create the row element
            const detailsRow = document.createElement('tr');
            detailsRow.className = 'allocation-details-row';
            detailsRow.dataset.assignmentId = assignmentId;
            detailsRow.innerHTML = `
                <td colspan="100%" class="details-cell">
                    <div class="phase-details-container">
                        <h4>Phase Breakdown for ${projectName}</h4>
                        ${detailsHTML}
                    </div>
                </td>
            `;
            
            // Add event listeners for phase MD inputs
            this.attachPhaseInputEventListeners(detailsRow, assignmentId);
            
            return detailsRow;
        } catch (error) {
            console.error('Error creating allocation details row:', error);
            return null;
        }
    }

    /**
     * Attach event listeners for phase MD input fields
     */
    attachPhaseInputEventListeners(detailsRow, assignmentId) {
        const inputs = detailsRow.querySelectorAll('.phase-md-input');
        
        inputs.forEach(input => {
            // Handle input changes
            input.addEventListener('change', (e) => {
                this.handlePhaseInputChange(e.target, assignmentId);
            });
            
            // Handle Enter key
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur(); // Trigger change event
                }
            });
            
            // Visual feedback on focus
            input.addEventListener('focus', (e) => {
                e.target.parentElement.classList.add('editing');
            });
            
            input.addEventListener('blur', (e) => {
                e.target.parentElement.classList.remove('editing');
            });
        });
        
    }

    /**
     * Handle changes to phase MD input fields
     */
    async handlePhaseInputChange(input, assignmentId) {
        try {
            const phaseId = input.dataset.phaseId;
            const month = input.dataset.month;
            const newValue = parseFloat(input.value) || 0;
            const originalValue = parseFloat(input.dataset.originalValue) || 0;
            
            
            if (newValue === originalValue) {
                return; // No change
            }
            
            // Find the assignment
            const assignment = this.manualAssignments.find(a => a.id === assignmentId);
            if (!assignment) {
                console.error('Assignment not found:', assignmentId);
                return;
            }
            
            // Update assignment with new phase allocation
            const updated = await this.updatePhaseAllocation(assignment, phaseId, month, newValue);
            
            if (updated) {
                // Update the original value for future comparisons
                input.dataset.originalValue = newValue.toString();
                
                // Recalculate subsequent phases with manual override
                await this.recalculateSubsequentPhases(assignment, phaseId, month, newValue);
                
                // Refresh the UI
                await this.refreshAllCapacitySections();
                
                // Visual feedback
                input.classList.add('value-updated');
                setTimeout(() => {
                    input.classList.remove('value-updated');
                }, 300);
                
            }
            
        } catch (error) {
            console.error('Error handling phase input change:', error);
            
            // Reset to original value on error
            const originalValue = input.dataset.originalValue || '0';
            input.value = originalValue;
            
            // Show error feedback
            input.classList.add('error');
            setTimeout(() => {
                input.classList.remove('error');
            }, 1000);
        }
    }

    /**
     * Calculate phase breakdown for an assignment
     */
    async calculatePhaseBreakdown(assignment) {
        try {
            
            // Get phase schedule from assignment
            const phaseSchedule = assignment.phaseSchedule || [];
            if (phaseSchedule.length === 0) {
                console.warn('No phase schedule found in assignment');
                return [];
            }

            // Get timeline months for alignment
            const timelineMonths = this.getTimelineMonthKeys();
            
            const breakdown = [];
            
            // Use calculatedAllocation which contains the phase-level MD distribution
            const calculatedAllocation = assignment.calculatedAllocation || {};
            
            // Get project name from assignment
            const projectName = this.getProjectNameById(assignment.projectId) || 'Unknown Project';
            
            for (const phase of phaseSchedule) {
                const phaseData = {
                    phaseName: phase.phaseName,
                    phaseId: phase.phaseId,
                    startDate: phase.startDate,
                    endDate: phase.endDate,
                    totalMDs: phase.estimatedMDs,
                    monthlyAllocations: {}
                };

                // Extract phase allocations from calculatedAllocation
                for (const [month, monthData] of Object.entries(calculatedAllocation)) {
                    if (Array.isArray(monthData)) {
                        // New format: array of phase allocations
                        const phaseAllocation = monthData.find(a => a.phaseId === phase.phaseId);
                        if (phaseAllocation && phaseAllocation.allocatedMDs > 0) {
                            phaseData.monthlyAllocations[month] = phaseAllocation.allocatedMDs;
                        }
                    } else if (monthData && monthData[projectName]) {
                        // Legacy format: project-based structure
                        const projectData = monthData[projectName];
                        
                        // Find this phase in the month's phases array
                        if (projectData.phases && Array.isArray(projectData.phases)) {
                            const phaseInMonth = projectData.phases.find(p => p.phaseName === phase.phaseName);
                            
                            if (phaseInMonth && phaseInMonth.phaseDays > 0) {
                                phaseData.monthlyAllocations[month] = phaseInMonth.phaseDays;
                            }
                        }
                    }
                }
                
                breakdown.push(phaseData);
            }

            return breakdown;
        } catch (error) {
            console.error('Error calculating phase breakdown:', error);
            return [];
        }
    }

    /**
     * Generate HTML table for phase details
     */
    generatePhaseDetailsTable(phaseBreakdown) {
        if (!phaseBreakdown || phaseBreakdown.length === 0) {
            return '<p class="no-phases">No phase data available</p>';
        }

        // Get timeline months for column headers
        const timelineMonths = this.getTimelineMonthKeys();
        
        // Generate month headers that align with main table format (Month<br>Year)
        const monthHeaders = timelineMonths.map(monthKey => {
            const [year, month] = monthKey.split('-');
            const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            return `<th class="month-col">${monthName}<br>${year}</th>`;
        }).join('');

        // Generate phase rows
        const phaseRows = phaseBreakdown.map(phase => {
            const monthCells = timelineMonths.map(monthKey => {
                // monthKey is already in YYYY-MM format
                const allocation = phase.monthlyAllocations[monthKey];
                const numericValue = (typeof allocation === 'number' && allocation > 0) ? allocation : 0;
                const value = numericValue.toFixed(1);
                
                // Create editable input for each month cell
                return `
                    <td class="month-col phase-allocation editable-cell">
                        <input type="number" 
                               class="phase-md-input" 
                               min="0" 
                               step="0.1" 
                               value="${value}"
                               data-phase-id="${phase.phaseId}"
                               data-month="${monthKey}"
                               data-original-value="${value}"
                               title="Edit MDs for ${phase.phaseName} in ${monthKey}">
                    </td>
                `;
            }).join('');
            
            // Calculate allocated MDs (sum of all monthly allocations)
            const allocatedMDs = Object.values(phase.monthlyAllocations || {}).reduce((sum, val) => {
                const numericVal = (typeof val === 'number' && !isNaN(val)) ? val : 0;
                return sum + numericVal;
            }, 0);
            const allocatedMDsFormatted = allocatedMDs.toFixed(1);
            
            // Determine if allocated < total (apply overflow styling)
            const isUnderAllocated = allocatedMDs < phase.totalMDs;
            const allocatedCellClass = isUnderAllocated ? 'phase-allocated overflow' : 'phase-allocated';

            return `
                <tr class="phase-detail-row">
                    <td class="phase-name">${phase.phaseName}</td>
                    <td class="phase-dates">${this.formatDateRange(phase.startDate, phase.endDate)}</td>
                    <td class="phase-total">${phase.totalMDs} MD</td>
                    <td class="${allocatedCellClass}">${allocatedMDsFormatted} MD</td>
                    ${monthCells}
                </tr>
            `;
        }).join('');

        return `
            <table class="phase-details-table">
                <thead>
                    <tr>
                        <th class="fixed-col-detail col-phase-name">Phase</th>
                        <th class="fixed-col-detail col-phase-dates">Date Range</th>
                        <th class="fixed-col-detail col-phase-total">Total MDs</th>
                        <th class="fixed-col-detail col-phase-allocated">Allocated MDs</th>
                        ${monthHeaders}
                    </tr>
                </thead>
                <tbody>
                    ${phaseRows}
                </tbody>
            </table>
        `;
    }

    /**
     * Calculate proportional allocation for a specific phase in a specific month
     * @private
     */
    _calculatePhaseAllocationForMonth(phase, month, totalMonthMDs, allPhases) {
        try {
            // Parse month to get month boundaries
            const [year, monthNum] = month.split('-').map(Number);
            const monthStart = new Date(year, monthNum - 1, 1);
            const monthEnd = new Date(year, monthNum, 0); // Last day of month
            
            // Parse phase dates
            const phaseStart = new Date(phase.startDate);
            const phaseEnd = new Date(phase.endDate);
            
            // Check if phase overlaps with this month
            if (phaseEnd < monthStart || phaseStart > monthEnd) {
                return 0; // No overlap
            }
            
            // Calculate intersection of phase with month
            const intersectionStart = new Date(Math.max(phaseStart.getTime(), monthStart.getTime()));
            const intersectionEnd = new Date(Math.min(phaseEnd.getTime(), monthEnd.getTime()));
            
            // Calculate working days for this phase in this month
            const phaseWorkingDaysInMonth = this.calculateWorkingDaysBetween(intersectionStart, intersectionEnd);
            
            if (phaseWorkingDaysInMonth <= 0) {
                return 0;
            }
            
            // Calculate total working days for all phases in this month
            let totalWorkingDaysInMonth = 0;
            for (const otherPhase of allPhases) {
                const otherPhaseStart = new Date(otherPhase.startDate);
                const otherPhaseEnd = new Date(otherPhase.endDate);
                
                // Check if other phase overlaps with this month
                if (otherPhaseEnd >= monthStart && otherPhaseStart <= monthEnd) {
                    const otherIntersectionStart = new Date(Math.max(otherPhaseStart.getTime(), monthStart.getTime()));
                    const otherIntersectionEnd = new Date(Math.min(otherPhaseEnd.getTime(), monthEnd.getTime()));
                    
                    const otherPhaseWorkingDays = this.calculateWorkingDaysBetween(otherIntersectionStart, otherIntersectionEnd);
                    totalWorkingDaysInMonth += otherPhaseWorkingDays;
                }
            }
            
            if (totalWorkingDaysInMonth <= 0) {
                return 0;
            }
            
            // Calculate proportional allocation
            const proportionalAllocation = (phaseWorkingDaysInMonth / totalWorkingDaysInMonth) * totalMonthMDs;
            
            
            return Math.round(proportionalAllocation * 10) / 10; // Round to 1 decimal
            
        } catch (error) {
            console.error('Error calculating phase allocation for month:', error);
            return 0;
        }
    }

    /**
     * Format date range for display
     */
    formatDateRange(startDate, endDate) {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const startStr = start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            const endStr = end.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            return `${startStr} - ${endStr}`;
        } catch (error) {
            return `${startDate} - ${endDate}`;
        }
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
     * Cleanup method to remove all event listeners to prevent memory leaks
     */
    cleanup() {
        
        // Remove allocation actions listener
        if (this._allocationActionsHandler) {
            document.removeEventListener('click', this._allocationActionsHandler);
            this._allocationActionsHandler = null;
        }
        
        // Remove capacity input change listener
        if (this._capacityInputHandler) {
            document.removeEventListener('change', this._capacityInputHandler);
            this._capacityInputHandler = null;
        }
        
        // Remove capacity cell event listeners
        if (this._capacityCellHandler) {
            document.removeEventListener('click', this._capacityCellHandler);
            this._capacityCellHandler = null;
        }
        
        if (this._capacityCellChangeHandler) {
            document.removeEventListener('change', this._capacityCellChangeHandler);
            this._capacityCellChangeHandler = null;
        }
        
        // Remove gantt expansion handler
        if (this._ganttExpansionHandler) {
            document.removeEventListener('click', this._ganttExpansionHandler);
            this._ganttExpansionHandler = null;
        }
        
        // Remove gantt panel toggle handler
        if (this._ganttPanelToggleHandler) {
            document.removeEventListener('click', this._ganttPanelToggleHandler);
            this._ganttPanelToggleHandler = null;
        }
        
        // Clear any pending timers
        if (this._refreshInProgress) {
            this._refreshInProgress = false;
            this._currentRefreshPromise = null;
        }
        
        // Clear flags
        this.deletingAssignment = null;
        this.deleteStartTime = null;
        this._showingAssignmentModal = false;
        
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

            // Get current data
            const teamMembers = await this.getRealTeamMembers();
            const projects = this.projects || await this.getAvailableProjects();
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
                        await window.electronAPI.saveFile(filePath, JSON.stringify(capacityData, null, 2));

                        NotificationManager.success(`Capacity data saved to /capacity/${filename}`);
                        return; // Success, exit early
                    }
                }
            } catch (error) {
                console.warn('Could not save to /capacity folder, falling back to download:', error);
            }
            
            // Fallback: browser download with instructive filename
            const downloadFilename = `SAVE-TO-CAPACITY-FOLDER-${filename}`;
            const blob = new Blob([JSON.stringify(capacityData, null, 2)], { type: 'application/json' });
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
     * Load capacity data from fixed file
     */
    async loadCapacityData() {
        try {

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

                // Apply loaded filters if available
                if (capacityData.filters) {
                    this.currentFilters = { ...this.currentFilters, ...capacityData.filters };
                }
                
                // Restore capacity metadata and manual assignments
                if (capacityData.metadata) {
                    this.capacityId = capacityData.metadata.capacityId;
                    this.capacityName = capacityData.metadata.capacityName;
                    this.capacityDescription = capacityData.metadata.capacityDescription;
                }
                this.manualAssignments = capacityData.manualAssignments || [];
                
                // Apply saved status from the loaded capacity data
                this.applySavedStatusFromCapacityData(capacityData);

                NotificationManager.success('Capacity data loaded successfully');
                return capacityData;

            } else {
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
            const blob = new Blob([JSON.stringify(capacityData, null, 2)], { type: 'application/json' });
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
                    capacityData = JSON.parse(capacityData);
                }
            } catch (parseError) {
                console.error('JSON parse error:', parseError);

                throw new Error(`Invalid JSON format: ${parseError.message}`);
            }

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
            
            // Validate that capacity data contains expected allocations
            this.validateCapacityAllocations(capacityData);
            
            this.capacityId = capacityData.metadata.capacityId;
            this.capacityName = capacityData.metadata.capacityName;
            this.capacityDescription = capacityData.metadata.capacityDescription;
            
            this.manualAssignments = capacityData.manualAssignments || [];
            
            // DESTROY & REBUILD timeline chart with correct data - do this after setting manualAssignments
            await this.destroyAndRebuildTimelineChart();
            
            // Apply saved status from the loaded capacity data
            this.applySavedStatusFromCapacityData(capacityData);
            
            NotificationManager.success(`Capacity data loaded from ${file.name}`);
            
            // Refresh all capacity sections to show loaded data immediately
            await this.refreshAllCapacitySections();
            
            // Timeline chart is already rebuilt by destroyAndRebuildTimelineChart()

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
     * Apply saved status from capacity data to current projects
     * @private
     */
    applySavedStatusFromCapacityData(capacityData) {
        if (!capacityData || !capacityData.projects) {
            return;
        }

        
        let appliedCount = 0;
        
        // Apply saved status to current projects
        if (this.projects && capacityData.projects) {
            capacityData.projects.forEach(savedProject => {
                if (savedProject.status) {
                    // Find the current project with matching ID or name
                    const currentProject = this.projects.find(p => 
                        p.id === savedProject.id || 
                        p.name === savedProject.name ||
                        p.code === savedProject.code
                    );
                    
                    if (currentProject) {
                        const oldStatus = currentProject.status;
                        currentProject.status = savedProject.status;
                        appliedCount++;
                    }
                }
            });
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
     * Update phase allocation in assignment data
     */
    async updatePhaseAllocation(assignment, phaseId, month, newValue) {
        try {
            
            // Find the calculated allocation for this assignment
            if (!assignment.calculatedAllocation) {
                console.error('No calculated allocation found in assignment');
                return false;
            }
            
            // Update the allocation in the assignment's calculated allocation
            if (assignment.calculatedAllocation[month]) {
                // Find the specific phase allocation for this month
                let found = false;
                
                if (Array.isArray(assignment.calculatedAllocation[month])) {
                    // New format: array of phase allocations
                    for (let allocation of assignment.calculatedAllocation[month]) {
                        if (allocation.phaseId === phaseId) {
                            allocation.allocatedMDs = newValue;
                            allocation.planned = newValue;
                            allocation.actual = newValue;
                            found = true;
                            break;
                        }
                    }
                    
                    // If phase not found, add it
                    if (!found) {
                        assignment.calculatedAllocation[month].push({
                            phaseId: phaseId,
                            allocatedMDs: newValue,
                            planned: newValue,
                            actual: newValue
                        });
                    }
                } else {
                    // Legacy format: convert to new array format
                    const existingValue = assignment.calculatedAllocation[month];
                    assignment.calculatedAllocation[month] = [
                        {
                            phaseId: phaseId,
                            allocatedMDs: newValue,
                            planned: newValue,
                            actual: newValue
                        }
                    ];
                    
                    if (existingValue > 0) {
                        console.warn(`Converted legacy allocation format for ${month}: ${existingValue} → array format`);
                    }
                }
            } else {
                // Create new month allocation
                assignment.calculatedAllocation[month] = [
                    {
                        phaseId: phaseId,
                        allocatedMDs: newValue,
                        planned: newValue,
                        actual: newValue
                    }
                ];
            }
            
            return true;
            
        } catch (error) {
            console.error('Error updating phase allocation:', error);
            return false;
        }
    }

    /**
     * Recalculate subsequent phases after a manual change
     */
    async recalculateSubsequentPhases(assignment, changedPhaseId, changedMonth = null, manualValue = null) {
        try {
            
            // Get the predefined phase order
            const phaseOrder = ['technicalAnalysis', 'development', 'integrationTests', 'uatTests', 'consolidation', 'vapt', 'postGoLive'];
            const changedPhaseIndex = phaseOrder.indexOf(changedPhaseId);
            
            if (changedPhaseIndex === -1) {
                console.warn(`Phase ${changedPhaseId} not found in predefined order`);
                return;
            }
            
            // Verify auto-distribution is available
            if (!this.autoDistribution) {
                console.error('Auto-distribution not available for recalculation');
                return;
            }
            
            // Get team member for auto-distribution
            // Handle both old format ("member-fullstack-1") and new format ("team-fullstack:member-fullstack-1") IDs
            const baseMemberId = assignment.teamMemberId.includes(':') ? 
                assignment.teamMemberId.split(':')[1] : assignment.teamMemberId;
            
            
            // Get all team members and find the one with matching base ID
            const allTeamMembers = await this.getTeamMembers();
            const teamMember = allTeamMembers.find(member => {
                const memberBaseName = member.id.includes(':') ? member.id.split(':')[1] : member.id;
                return memberBaseName === baseMemberId;
            });
            
            if (!teamMember) {
                console.error(`Team member not found for recalculation. Assignment ID: ${assignment.teamMemberId}, Base ID: ${baseMemberId}`);
                return;
            }
            
            
            // Set current team member for auto-distribution adapter
            this._currentTeamMember = teamMember;
            
            // Build existing allocations from all phases up to and including the changed phase
            const existingAllocations = {};
            
            // Process all phases up to and including the changed phase
            for (let i = 0; i <= changedPhaseIndex; i++) {
                const phaseId = phaseOrder[i];
                const phase = assignment.phaseSchedule.find(p => p.phaseId === phaseId);
                
                if (phase && assignment.calculatedAllocation) {
                    for (const [month, allocations] of Object.entries(assignment.calculatedAllocation)) {
                        if (Array.isArray(allocations)) {
                            // New format: array of phase allocations
                            const phaseAllocation = allocations.find(a => a.phaseId === phaseId);
                            if (phaseAllocation && phaseAllocation.allocatedMDs > 0) {
                                if (!existingAllocations[month]) {
                                    existingAllocations[month] = [];
                                }
                                
                                // Preserve manually edited value if this is the changed phase and month
                                let allocatedValue = phaseAllocation.allocatedMDs;
                                if (phaseId === changedPhaseId && month === changedMonth && manualValue !== null) {
                                    allocatedValue = manualValue;
                                }
                                
                                existingAllocations[month].push({
                                    phaseId: phaseId,
                                    allocatedMDs: allocatedValue
                                });
                            }
                        }
                    }
                }
            }
            
            
            // Recalculate all subsequent phases using auto-distribution
            for (let i = changedPhaseIndex + 1; i < phaseOrder.length; i++) {
                const phaseId = phaseOrder[i];
                const phase = assignment.phaseSchedule.find(p => p.phaseId === phaseId);
                
                if (phase && phase.estimatedMDs > 0) {
                    
                    // Use auto-distribution for this phase
                    const distribution = this.autoDistribution.autoDistributeMDs(
                        phase.estimatedMDs,
                        new Date(phase.startDate),
                        new Date(phase.endDate),
                        assignment.teamMemberId,
                        existingAllocations
                    );
                    
                    // Update assignment with new distribution
                    for (const [month, allocation] of Object.entries(distribution)) {
                        if (month !== 'hasOverflow' && month !== 'overflowAmount' && allocation.planned > 0) {
                            if (!assignment.calculatedAllocation[month]) {
                                assignment.calculatedAllocation[month] = [];
                            }
                            
                            // Remove existing allocation for this phase in this month
                            if (Array.isArray(assignment.calculatedAllocation[month])) {
                                assignment.calculatedAllocation[month] = assignment.calculatedAllocation[month].filter(a => a.phaseId !== phaseId);
                                
                                // Add new allocation
                                assignment.calculatedAllocation[month].push({
                                    phaseId: phaseId,
                                    allocatedMDs: allocation.planned,
                                    planned: allocation.planned,
                                    actual: allocation.planned
                                });
                            }
                            
                            // Update existing allocations for next iteration
                            if (!existingAllocations[month]) {
                                existingAllocations[month] = [];
                            }
                            existingAllocations[month].push({
                                phaseId: phaseId,
                                allocatedMDs: allocation.planned
                            });
                        }
                    }
                }
            }
            
            
        } catch (error) {
            console.error('Error recalculating subsequent phases:', error?.message || error);
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