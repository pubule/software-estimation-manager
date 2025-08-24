/**
 * Updated Project Phases Manager
 * Manual save system - removed auto-save functionality, added Save Configuration button
 */

class ProjectPhasesManager {
    constructor(app, configManager) {
        this.app = app;
        this.configManager = configManager;
        
        // PURE STATE MANAGER: NO duplicated isDirty state! Use StateSelectors.getIsDirty()
        // REMOVED: this.isDirty = false; → Use store state instead
        
        // 🚨 CRITICAL FIX: Conditional store connection to prevent race conditions
        this.store = window.appStore || null;
        
        // If store is not available yet, set up a retry mechanism
        if (!this.store) {
            console.warn('🛡️ Store not available during ProjectPhasesManager initialization, will retry');
            this.setupStoreConnection();
        }

        // Resource rates (daily) - ora vengono da supplier selezionati
        this.selectedSuppliers = {
            G1: null,  // Grade 1 Developer
            G2: null,  // Grade 2 Developer
            TA: null,  // Technical Analyst
            PM: null   // Project Manager
        };
        
        this.resourceRates = {
            G1: 450,  // Grade 1 Developer (default)
            G2: 380,  // Grade 2 Developer (default)
            TA: 420,  // Technical Analyst (default)
            PM: 500   // Project Manager (default)
        };

        // Phase definitions will be loaded from configuration
        this.phaseDefinitions = [];
        this.currentPhases = [];
        this.init();
    }

    /**
     * 🚨 CRITICAL FIX: Set up store connection with retry mechanism
     * Prevents race condition during initialization
     */
    setupStoreConnection() {
        const maxRetries = 10;
        let retryCount = 0;
        
        const tryConnect = () => {
            this.store = window.appStore || null;
            
            if (this.store) {
                console.log('✅ ProjectPhasesManager store connection established');
                return;
            }
            
            retryCount++;
            if (retryCount < maxRetries) {
                console.warn(`🔄 ProjectPhasesManager store retry ${retryCount}/${maxRetries}`);
                setTimeout(tryConnect, 100 * retryCount);
            } else {
                console.error('❌ ProjectPhasesManager: Failed to connect to store after maximum retries');
            }
        };
        
        // Initial retry in next tick
        setTimeout(tryConnect, 50);
    }

    async init() {
        try {
            // Load phase definitions from configuration manager
            if (this.configManager && this.configManager.defaultConfigManager) {
                this.phaseDefinitions = await this.configManager.defaultConfigManager.getPhaseDefinitions();
            } else {
                console.warn('DefaultConfigManager not available, using fallback phase definitions');
                this.phaseDefinitions = this.createFallbackPhaseDefinitions();
            }
            
            this.loadResourceRates();
            this.initializePhases();
            this.setupEventListeners();
            console.log('Project Phases Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Project Phases Manager:', error);
            this.phaseDefinitions = this.createFallbackPhaseDefinitions();
            this.loadResourceRates();
            this.initializePhases();
            this.setupEventListeners();
        }
    }

    loadResourceRates() {
        // Carica i supplier selezionati dal progetto corrente
        const currentProject = StateSelectors.getCurrentProject();
        if (currentProject && currentProject.phases) {
            const phasesConfig = currentProject.phases;
            
            if (phasesConfig.selectedSuppliers) {
                this.selectedSuppliers = { ...phasesConfig.selectedSuppliers };
                this.updateRatesFromSelectedSuppliers();
            }
        }
    }
    
    updateRatesFromSelectedSuppliers() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!this.configManager || !currentProject) return;
        
        const projectConfig = this.configManager.getProjectConfig(currentProject.config);
        const allSuppliers = [...projectConfig.suppliers, ...projectConfig.internalResources];
        
        Object.keys(this.selectedSuppliers).forEach(resourceType => {
            const selectedSupplierId = this.selectedSuppliers[resourceType];
            if (selectedSupplierId) {
                const supplier = allSuppliers.find(s => s.id === selectedSupplierId);
                if (supplier) {
                    this.resourceRates[resourceType] = supplier.realRate || supplier.officialRate;
                }
            }
        });
    }
    
    getAvailableSuppliers() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!this.configManager || !currentProject) return [];
        
        const projectConfig = this.configManager.getProjectConfig(currentProject.config);
        return [...projectConfig.suppliers, ...projectConfig.internalResources];
    }

    initializePhases() {
        // Inizializza le fasi dal progetto corrente o dai default
        const currentProject = StateSelectors.getCurrentProject();
        if (currentProject && currentProject.phases) {
            this.currentPhases = this.mergeProjectPhases(currentProject.phases);
            
            // Restore selected suppliers from project if they exist
            if (currentProject.phases.selectedSuppliers) {
                this.selectedSuppliers = { ...currentProject.phases.selectedSuppliers };
            }
        } else {
            this.currentPhases = this.createDefaultPhases();
        }

        this.calculateDevelopmentPhase();
    }

    createDefaultPhases() {
        return this.phaseDefinitions.map(def => ({
            ...def,
            manDays: 0,
            effort: { ...def.defaultEffort },
            assignedResources: [],
            cost: 0,
            lastModified: new Date().toISOString()
        }));
    }

    mergeProjectPhases(existingPhases) {
        return this.phaseDefinitions.map(def => {
            const existing = existingPhases[def.id] || {};
            return {
                ...def,
                manDays: existing.manDays || 0,
                effort: existing.effort || { ...def.defaultEffort },
                assignedResources: existing.assignedResources || [],
                cost: existing.cost || 0,
                lastModified: existing.lastModified || new Date().toISOString()
            };
        });
    }

    calculateDevelopmentPhase() {
        // Calcola automaticamente i man days della fase Development dalla lista features + coverage
        const developmentPhase = this.currentPhases.find(p => p.id === 'development');
        const currentProject = StateSelectors.getCurrentProject();
        if (developmentPhase && currentProject) {
            const featuresTotal = currentProject.features.reduce((sum, feature) => {
                return sum + (parseFloat(feature.manDays) || 0);
            }, 0);

            // Add coverage MDs to development phase
            const coverageMDs = parseFloat(currentProject.coverage) || 0;
            const totalDevelopmentMDs = featuresTotal + coverageMDs;

            // Round to 1 decimal place to avoid too many decimal digits
            developmentPhase.manDays = Math.round(totalDevelopmentMDs * 10) / 10;
            developmentPhase.lastModified = new Date().toISOString();
            
            // Sync updated phase data to current project to ensure it's available for version snapshots
            this.syncToCurrentProject();
        }
    }

    renderPhasesPage(container) {
        if (!container) return;

        // Assicurati che i dati siano sincronizzati prima del render
        this.synchronizeWithProject();

        // SEMPRE ricalcola la fase Development prima del render
        this.calculateDevelopmentPhase();

        container.innerHTML = `
            <div class="phases-configuration">
                <div class="phases-header">
                    <h2><i class="fas fa-project-diagram"></i> Project Phases Configuration</h2>
                    <p class="phases-description">Configure effort distribution and costs for each project phase across different resource types. Remember to save your configuration to persist changes.</p>
                </div>

                ${this.renderDevelopmentNotice()}
                ${this.renderPhasesControls()}
                ${this.renderPhasesTable()}
            </div>
        `;

        this.attachEventListeners(container);
        this.updateCalculations();
    }

    renderDevelopmentNotice() {
        const developmentPhase = this.currentPhases.find(p => p.id === 'development');
        const currentProject = StateSelectors.getCurrentProject();
        const featuresCount = currentProject?.features?.length || 0;
        const developmentDays = developmentPhase?.manDays || 0;
        const coverageMDs = parseFloat(currentProject?.coverage) || 0;

        return `
            <div class="development-notice">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>Development Phase:</strong> 
                    Man Days are automatically calculated from ${featuresCount} features + coverage 
                    (Coverage: ${coverageMDs.toFixed(1)} days, Total: ${developmentDays.toFixed(1)} days). You can configure effort distribution percentages.
                </div>
            </div>
        `;
    }

    renderPhasesControls() {
        const availableSuppliers = this.getAvailableSuppliers();
        
        return `
            <div class="phases-controls">
                <div class="controls-left">
                    <div class="supplier-selectors">
                        <div class="supplier-selector">
                            <label for="g1-supplier">G1 (Grade 1 Developer):</label>
                            ${this.renderSupplierDropdown('G1', 'g1-supplier', availableSuppliers)}
                        </div>
                        <div class="supplier-selector">
                            <label for="g2-supplier">G2 (Grade 2 Developer):</label>
                            ${this.renderSupplierDropdown('G2', 'g2-supplier', availableSuppliers)}
                            <small class="supplier-note">Note: Development phase uses feature-specific suppliers</small>
                        </div>
                        <div class="supplier-selector">
                            <label for="ta-supplier">TA (Technical Analyst):</label>
                            ${this.renderSupplierDropdown('TA', 'ta-supplier', availableSuppliers)}
                        </div>
                        <div class="supplier-selector">
                            <label for="pm-supplier">PM (Project Manager):</label>
                            ${this.renderSupplierDropdown('PM', 'pm-supplier', availableSuppliers)}
                        </div>
                    </div>
                </div>
                <div class="controls-right">
                    <!-- Buttons removed - saving is handled by main Save button -->
                </div>
            </div>
        `;
    }
    
    renderSupplierDropdown(resourceType, selectId, suppliers) {
        const selectedValue = this.selectedSuppliers[resourceType] || '';
        
        // Filter suppliers by role - only show suppliers with matching role
        const filteredSuppliers = suppliers.filter(supplier => supplier.role === resourceType);
        
        let options = '<option value="">Select Supplier</option>';
        filteredSuppliers.forEach(supplier => {
            const selected = supplier.id === selectedValue ? 'selected' : '';
            const rate = supplier.realRate || supplier.officialRate || 0;
            const displayName = `${supplier.department} - ${supplier.name} (€${rate}/day)`;
            options += `<option value="${supplier.id}" data-rate="${rate}" ${selected}>${displayName}</option>`;
        });
        
        return `<select id="${selectId}" data-resource="${resourceType}" class="supplier-select">${options}</select>`;
    }

    renderPhasesTable() {
        return `
            <div class="phases-table-container">
                <table class="phases-table">
                    <thead>
                        <tr>
                            <th class="phase-name header-group">Phase</th>
                            <th class="header-group">Man Days</th>
                            <th class="header-group" colspan="4">% Effort Distribution</th>
                            <th class="header-group" colspan="4">Man Days by Resource</th>
                            <th class="header-group" colspan="4">Cost by Resource (€)</th>
                        </tr>
                        <tr>
                            <th class="phase-name sub-header">Name</th>
                            <th class="sub-header">Total</th>
                            <th class="sub-header">G1</th>
                            <th class="sub-header">G2</th>
                            <th class="sub-header">TA</th>
                            <th class="sub-header">PM</th>
                            <th class="sub-header">G1</th>
                            <th class="sub-header">G2</th>
                            <th class="sub-header">TA</th>
                            <th class="sub-header">PM</th>
                            <th class="sub-header">G1</th>
                            <th class="sub-header">G2</th>
                            <th class="sub-header">TA</th>
                            <th class="sub-header">PM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderPhaseRows()}
                    </tbody>
                    <tfoot>
                        ${this.renderTotalsRow()}
                    </tfoot>
                </table>
            </div>
        `;
    }

    renderPhaseRows() {
        return this.currentPhases.map(phase => {
            const effort = phase.effort;
            const manDaysByResource = this.calculateManDaysByResource(phase.manDays, effort);
            const costByResource = this.calculateCostByResource(manDaysByResource, phase);
            const effortTotal = Object.values(effort).reduce((sum, val) => sum + val, 0);
            const effortClass = effortTotal === 100 ? 'valid' : (effortTotal > 100 ? 'invalid' : 'warning');

            return `
                <tr class="phase-row ${phase.type ? 'phase-' + phase.type : ''}" data-phase-id="${phase.id}">
                    <td class="phase-name">
                        <strong>${phase.name}</strong>
                        ${phase.description ? `<span class="phase-description">${phase.description}</span>` : ''}
                    </td>
                    <td>
                        <input type="number" 
                               value="${phase.manDays}" 
                               ${phase.calculated ? 'readonly class="calculated tooltip" data-tooltip="Calculated from features list"' : ''} 
                               data-field="manDays"
                               min="0" step="0.5">
                    </td>
                    <td class="effort-cell">
                        <input type="number" value="${effort.G1}" data-field="effort" data-resource="G1" 
                               min="0" max="100" step="1" class="effort-input">
                        <span class="percentage-sign">%</span>
                    </td>
                    <td class="effort-cell">
                        <input type="number" value="${effort.G2}" data-field="effort" data-resource="G2" 
                               min="0" max="100" step="1" class="effort-input">
                        <span class="percentage-sign">%</span>
                    </td>
                    <td class="effort-cell">
                        <input type="number" value="${effort.TA}" data-field="effort" data-resource="TA" 
                               min="0" max="100" step="1" class="effort-input">
                        <span class="percentage-sign">%</span>
                    </td>
                    <td class="effort-cell">
                        <input type="number" value="${effort.PM}" data-field="effort" data-resource="PM" 
                               min="0" max="100" step="1" class="effort-input">
                        <span class="percentage-sign">%</span>
                    </td>
                    <td class="phases-currency resource-g1">${manDaysByResource.G1.toFixed(1)}</td>
                    <td class="phases-currency resource-g2">${manDaysByResource.G2.toFixed(1)}</td>
                    <td class="phases-currency resource-ta">${manDaysByResource.TA.toFixed(1)}</td>
                    <td class="phases-currency resource-pm">${manDaysByResource.PM.toFixed(1)}</td>
                    <td class="phases-currency resource-g1">€${costByResource.G1.toLocaleString()}</td>
                    <td class="phases-currency resource-g2">€${costByResource.G2.toLocaleString()}</td>
                    <td class="phases-currency resource-ta">€${costByResource.TA.toLocaleString()}</td>
                    <td class="phases-currency resource-pm">€${costByResource.PM.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    }

    renderTotalsRow() {
        const totals = this.calculateTotals();

        return `
            <tr class="phases-totals-row">
                <td class="phase-name"><strong>TOTALS</strong></td>
                <td class="phases-currency">${totals.manDays.toFixed(1)}</td>
                <td colspan="4"></td>
                <td class="phases-currency">${totals.manDaysByResource.G1.toFixed(1)}</td>
                <td class="phases-currency">${totals.manDaysByResource.G2.toFixed(1)}</td>
                <td class="phases-currency">${totals.manDaysByResource.TA.toFixed(1)}</td>
                <td class="phases-currency">${totals.manDaysByResource.PM.toFixed(1)}</td>
                <td class="phases-currency">€${totals.costByResource.G1.toLocaleString()}</td>
                <td class="phases-currency">€${totals.costByResource.G2.toLocaleString()}</td>
                <td class="phases-currency">€${totals.costByResource.TA.toLocaleString()}</td>
                <td class="phases-currency">€${totals.costByResource.PM.toLocaleString()}</td>
            </tr>
        `;
    }

    calculateManDaysByResource(totalManDays, effort) {
        // Calculate man days per resource: Man Days * (% Effort Distribution / 100)
        return {
            G1: (totalManDays * effort.G1) / 100,
            G2: (totalManDays * effort.G2) / 100,
            TA: (totalManDays * effort.TA) / 100,
            PM: (totalManDays * effort.PM) / 100
        };
    }

    calculateCostByResource(manDaysByResource, phase = null) {
        // Per la fase Development, usa una logica speciale per G2
        if (phase && phase.id === 'development') {
            return this.calculateDevelopmentCosts(phase);
        }
        
        return {
            G1: Math.round(manDaysByResource.G1 * this.resourceRates.G1),
            G2: Math.round(manDaysByResource.G2 * this.resourceRates.G2),
            TA: Math.round(manDaysByResource.TA * this.resourceRates.TA),
            PM: Math.round(manDaysByResource.PM * this.resourceRates.PM)
        };
    }
    
    calculateDevelopmentCosts(developmentPhase) {
        // Per Development: somma di (ogni feature: Calc MDs * rate supplier specifico della feature * effort % G2)
        let g2Cost = 0;
        
        const currentProject = StateSelectors.getCurrentProject();
        if (currentProject && currentProject.features) {
            const g2EffortPercent = developmentPhase.effort.G2 / 100;
            const projectConfig = this.configManager ? this.configManager.getProjectConfig(currentProject.config) : null;
            const allSuppliers = projectConfig ? [...projectConfig.suppliers, ...projectConfig.internalResources] : [];
            
            currentProject.features.forEach(feature => {
                const featureManDays = parseFloat(feature.manDays) || 0;
                
                // Trova il supplier specifico di questa feature
                const featureSupplier = allSuppliers.find(s => s.id === feature.supplier);
                const featureRate = featureSupplier ? (featureSupplier.realRate || featureSupplier.officialRate || 0) : 0;
                
                // Calcola il costo usando il rate specifico della feature
                g2Cost += featureManDays * featureRate * g2EffortPercent;
            });
        }
        
        // Per gli altri resource types, usa il calcolo normale
        const manDaysByResource = this.calculateManDaysByResource(developmentPhase.manDays, developmentPhase.effort);
        
        return {
            G1: Math.round(manDaysByResource.G1 * this.resourceRates.G1),
            G2: Math.round(g2Cost),
            TA: Math.round(manDaysByResource.TA * this.resourceRates.TA),
            PM: Math.round(manDaysByResource.PM * this.resourceRates.PM)
        };
    }

    calculateTotals() {
        let totals = {
            manDays: 0,
            manDaysByResource: { G1: 0, G2: 0, TA: 0, PM: 0 },
            costByResource: { G1: 0, G2: 0, TA: 0, PM: 0 }
        };

        this.currentPhases.forEach(phase => {
            const effort = phase.effort;
            const manDaysByResource = this.calculateManDaysByResource(phase.manDays, effort);
            const costByResource = this.calculateCostByResource(manDaysByResource, phase);

            totals.manDays += phase.manDays;
            totals.manDaysByResource.G1 += manDaysByResource.G1;
            totals.manDaysByResource.G2 += manDaysByResource.G2;
            totals.manDaysByResource.TA += manDaysByResource.TA;
            totals.manDaysByResource.PM += manDaysByResource.PM;
            totals.costByResource.G1 += costByResource.G1;
            totals.costByResource.G2 += costByResource.G2;
            totals.costByResource.TA += costByResource.TA;
            totals.costByResource.PM += costByResource.PM;
        });

        return totals;
    }

    /**
     * ⚡ REACTIVE ACTION DISPATCHER: Setup reactive actions for phases
     * Replaces 4 traditional addEventListener calls with centralized action management
     */
    attachEventListeners(container) {
        this.setupReactivePhasesActions(container);
    }

    /**
     * Setup reactive actions system for phases management
     */
    setupReactivePhasesActions(container) {
        this.setupPhasesActionDispatcher();
        this.setupDelegatedPhasesHandler(container);
    }

    /**
     * Setup centralized action dispatcher for phases
     */
    setupPhasesActionDispatcher() {
        this.phasesActionMap = {
            'input-change': (target) => this.handleInputChange(target),
            'supplier-change': (target) => this.handleSupplierChange(target),
            'validation': (target) => this.validateInput(target),
            'action-handler': (action, target) => this.handleAction(action, target)
        };
    }

    /**
     * Setup single delegated event handler for ALL phases interactions
     * REPLACES 4 individual addEventListener calls with 1 centralized handler
     */
    setupDelegatedPhasesHandler(container) {
        // Single input event handler for all number inputs
        container.addEventListener('input', (e) => {
            if (e.target.type === 'number') {
                this.dispatchPhasesAction('input-change', e.target);
            }
        });

        // Single change event handler for supplier dropdowns
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('supplier-select')) {
                this.dispatchPhasesAction('supplier-change', e.target);
            }
        });

        // Single click event handler for action buttons
        container.addEventListener('click', (e) => {
            const actionElement = e.target.closest('[data-action]');
            if (actionElement) {
                const action = actionElement.dataset.action;
                this.dispatchPhasesAction('action-handler', action, actionElement);
            }
        });

        // Single blur event handler for validation
        container.addEventListener('blur', (e) => {
            if (e.target.type === 'number') {
                this.dispatchPhasesAction('validation', e.target);
            }
        }, true);
    }

    /**
     * Centralized action dispatcher for phases
     */
    dispatchPhasesAction(actionType, ...params) {
        const handler = this.phasesActionMap[actionType];
        if (handler) {
            try {
                handler(...params);
            } catch (error) {
                console.error(`ProjectPhasesManager action '${actionType}' failed:`, error);
                if (window.NotificationManager) {
                    NotificationManager.show(`Phase action failed: ${error.message}`, 'error');
                }
            }
        } else {
            console.warn(`ProjectPhasesManager: Unknown action type '${actionType}'`);
        }
    }
    
    handleSupplierChange(select) {
        const resourceType = select.dataset.resource;
        const selectedSupplierId = select.value;
        
        // Update selected supplier
        this.selectedSuppliers[resourceType] = selectedSupplierId;
        
        // Update rate
        if (selectedSupplierId) {
            const selectedOption = select.querySelector(`option[value="${selectedSupplierId}"]`);
            const rate = parseFloat(selectedOption.dataset.rate);
            this.resourceRates[resourceType] = rate;
            
            // Update rate display
            const rateDisplay = document.getElementById(`${resourceType.toLowerCase()}-rate`);
            if (rateDisplay) {
                rateDisplay.textContent = `€${rate}/day`;
            }
        }
        
        // Mark as dirty and recalculate
        this.markDirty();
        
        // Sync supplier changes to current project
        this.syncToCurrentProject();
        
        // Ricalcola solo le fasi NON-Development, perché Development dipende dai supplier delle singole feature
        this.updateCalculationsExceptDevelopment();
    }
    
    updateCalculationsExceptDevelopment() {
        this.currentPhases.forEach(phase => {
            if (phase.id !== 'development') {
                this.updatePhaseCalculations(phase.id);
                this.validateEffortDistribution(phase.id);
            }
        });
        
        // Aggiorna i totali (che includeranno anche Development con i suoi calcoli originali)
        this.updateTotals();
    }

    handleInputChange(input) {
        const row = input.closest('.phase-row');
        const phaseId = row?.dataset.phaseId;
        const phase = this.currentPhases.find(p => p.id === phaseId);

        if (!phase) return;

        const field = input.dataset.field;
        const value = parseFloat(input.value) || 0;

        if (field === 'manDays' && !phase.calculated) {
            phase.manDays = value;
            this.markDirty();
            this.updatePhaseCalculations(phaseId);
        } else if (field === 'effort') {
            const resource = input.dataset.resource;
            phase.effort[resource] = value;
            this.markDirty();
            
            // Per la fase Development, solo il cambio di effort G2 deve triggerare il ricalcolo del costo
            // perché usa i supplier delle singole feature, non il supplier G2 globale
            this.updatePhaseCalculations(phaseId);
            this.validateEffortDistribution(phaseId);
        }

        // Sync changes back to the current project in memory
        this.syncToCurrentProject();

        // Update column totals after any input change
        // Use setTimeout to ensure DOM updates are complete
        setTimeout(() => {
            this.updateTotals();
        }, 10);
        
        phase.lastModified = new Date().toISOString();
    }

    /**
     * Sync current phases data back to the project in memory
     * This ensures changes persist when navigating between sections
     */
    /**
     * Sync current phases data back to the project in memory
     * This ensures changes persist when navigating between sections
     */
    syncToCurrentProject() {
        // 🚨 CRITICAL FIX: Check store availability to prevent undefined access
        if (!this.store) {
            console.warn('🛡️ Store not available in ProjectPhasesManager, skipping syncToCurrentProject');
            return;
        }
        
        const currentProject = StateSelectors.getCurrentProject();
        if (!this.app || !currentProject) {
            console.warn('No current project to sync to');
            return;
        }

        // Project already retrieved above
        
        // PURE STATE MANAGER: Build phases object for store update
        const newPhasesObject = {};

        // Sync phases data to project structure
        this.currentPhases.forEach(phase => {
            newPhasesObject[phase.id] = {
                manDays: phase.manDays,
                effort: { ...phase.effort }, // Deep copy effort object
                lastModified: phase.lastModified,
                calculated: phase.calculated
            };
        });

        // Preserve selectedSuppliers
        if (this.selectedSuppliers) {
            newPhasesObject.selectedSuppliers = { ...this.selectedSuppliers };
        }
        
        // 🚨 CRITICAL FIX: Compare current and new phases data to prevent infinite loops
        const currentPhasesObject = currentProject.phases || {};
        const hasRealChanges = this.phasesDataHasChanged(currentPhasesObject, newPhasesObject);
        
        if (!hasRealChanges) {
            console.log('🛡️ Phases data unchanged, skipping store update to prevent loop');
            return;
        }
        
        // 🚨 CRITICAL FIX: Access store state and actions correctly
        try {
            const storeState = this.store.getState();
            if (storeState && typeof storeState.updateProjectPhases === 'function') {
                storeState.updateProjectPhases(newPhasesObject);
                console.log('Phases data synced to current project via store');
            } else {
                throw new Error('updateProjectPhases not available on store state');
            }
        } catch (error) {
            console.error('Error syncing phases to store:', error);
            // Fallback: direct project update (legacy approach)
            if (this.app && currentProject) {
                // PURE STATE MANAGER: Use store action instead of direct mutation
                if (this.store) {
                    this.store.getState().updateProjectPhases(newPhasesObject);
                }
                if (typeof this.app.markDirty === 'function') {
                    this.app.markDirty();
                }
                console.log('Phases synced via fallback direct update');
            }
        }
    }

    /**
     * 🚨 CRITICAL FIX: Check if phases data has actually changed to prevent infinite loops
     */
    phasesDataHasChanged(currentPhasesObject, newPhasesObject) {
        // Quick reference comparison - if same object, no changes
        if (currentPhasesObject === newPhasesObject) {
            return false;
        }
        
        // Compare keys
        const currentKeys = Object.keys(currentPhasesObject).sort();
        const newKeys = Object.keys(newPhasesObject).sort();
        
        if (currentKeys.length !== newKeys.length) {
            return true;
        }
        
        // Compare each phase data (excluding volatile fields like timestamps)
        for (const key of currentKeys) {
            if (!newKeys.includes(key)) {
                return true;
            }
            
            const currentPhase = currentPhasesObject[key];
            const newPhase = newPhasesObject[key];
            
            // Skip if either is null/undefined but not both
            if ((currentPhase == null) !== (newPhase == null)) {
                return true;
            }
            
            if (currentPhase == null && newPhase == null) {
                continue;
            }
            
            // Compare significant fields (excluding lastModified which is volatile)
            if (currentPhase.manDays !== newPhase.manDays ||
                currentPhase.calculated !== newPhase.calculated) {
                return true;
            }
            
            // Compare effort objects
            if (!this.effortObjectsEqual(currentPhase.effort, newPhase.effort)) {
                return true;
            }
        }
        
        // Compare selectedSuppliers
        const currentSuppliers = currentPhasesObject.selectedSuppliers || {};
        const newSuppliers = newPhasesObject.selectedSuppliers || {};
        
        if (!this.suppliersEqual(currentSuppliers, newSuppliers)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Compare effort objects for equality
     */
    effortObjectsEqual(effort1, effort2) {
        if ((effort1 == null) !== (effort2 == null)) {
            return false;
        }
        
        if (effort1 == null && effort2 == null) {
            return true;
        }
        
        const keys1 = Object.keys(effort1).sort();
        const keys2 = Object.keys(effort2).sort();
        
        if (keys1.length !== keys2.length) {
            return false;
        }
        
        for (const key of keys1) {
            if (!keys2.includes(key) || effort1[key] !== effort2[key]) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Compare suppliers objects for equality
     */
    suppliersEqual(suppliers1, suppliers2) {
        const keys1 = Object.keys(suppliers1).sort();
        const keys2 = Object.keys(suppliers2).sort();
        
        if (keys1.length !== keys2.length) {
            return false;
        }
        
        for (const key of keys1) {
            if (!keys2.includes(key) || suppliers1[key] !== suppliers2[key]) {
                return false;
            }
        }
        
        return true;
    }

    validateInput(input) {
        const field = input.dataset.field;
        const value = parseFloat(input.value);

        if (field === 'effort') {
            if (value < 0) {
                input.value = 0;
                this.handleInputChange(input);
            } else if (value > 100) {
                input.value = 100;
                this.handleInputChange(input);
            }
        } else if (field === 'manDays') {
            if (value < 0) {
                input.value = 0;
                this.handleInputChange(input);
            }
        }
    }

    validateEffortDistribution(phaseId) {
        const phase = this.currentPhases.find(p => p.id === phaseId);
        if (!phase) return;

        const total = Object.values(phase.effort).reduce((sum, val) => sum + val, 0);
        const row = document.querySelector(`[data-phase-id="${phaseId}"]`);
        const indicator = row?.querySelector('.effort-total-indicator');

        if (indicator) {
            indicator.textContent = `${total}%`;
            indicator.className = 'effort-total-indicator tooltip';
            indicator.setAttribute('data-tooltip', `Total: ${total}%`);

            if (total === 100) {
                indicator.classList.add('valid');
            } else if (total > 100) {
                indicator.classList.add('invalid');
            } else {
                indicator.classList.add('warning');
            }
        }

        // Highlight effort inputs if total is not 100%
        const effortInputs = row?.querySelectorAll('.effort-input');
        effortInputs?.forEach(input => {
            input.classList.remove('percentage-error', 'percentage-warning');
            if (total > 100) {
                input.classList.add('percentage-error');
            } else if (total !== 100) {
                input.classList.add('percentage-warning');
            }
        });
    }

    updatePhaseCalculations(phaseId) {
        const phase = this.currentPhases.find(p => p.id === phaseId);
        const row = document.querySelector(`[data-phase-id="${phaseId}"]`);

        if (!phase || !row) return;

        const effort = phase.effort;
        const manDaysByResource = this.calculateManDaysByResource(phase.manDays, effort);
        const costByResource = this.calculateCostByResource(manDaysByResource, phase);

        // Update calculated fields
        const cells = row.cells;
        if (cells.length >= 14) {
            cells[6].textContent = manDaysByResource.G1.toFixed(1);
            cells[7].textContent = manDaysByResource.G2.toFixed(1);
            cells[8].textContent = manDaysByResource.TA.toFixed(1);
            cells[9].textContent = manDaysByResource.PM.toFixed(1);
            cells[10].textContent = `€${costByResource.G1.toLocaleString()}`;
            cells[11].textContent = `€${costByResource.G2.toLocaleString()}`;
            cells[12].textContent = `€${costByResource.TA.toLocaleString()}`;
            cells[13].textContent = `€${costByResource.PM.toLocaleString()}`;
        }

        this.updateTotals();
    }

    updateCalculations() {
        this.currentPhases.forEach(phase => {
            this.updatePhaseCalculations(phase.id);
            this.validateEffortDistribution(phase.id);
        });
    }

    updateTotals() {
        const totals = this.calculateTotals();
        console.log('updateTotals called, calculated totals:', totals);
        
        // Try multiple selectors to find the totals row
        let totalsRow = document.querySelector('.phases-table .phases-totals-row') || 
                       document.querySelector('.phases-totals-row') ||
                       document.querySelector('tr.phases-totals-row');
        
        console.log('Found totals row:', !!totalsRow);

        if (totalsRow) {
            const cells = totalsRow.cells;
            console.log('Totals row cells count:', cells.length);
            
            // Check if we have the required cells (11 physical td elements: indices 0-10)
            if (cells.length >= 11 && cells[10]) {
                try {
                    // Update total man days (physical cell 1)
                    cells[1].textContent = totals.manDays.toFixed(1);
                    
                    // Update man days by resource (physical cells 3-6)
                    cells[3].textContent = totals.manDaysByResource.G1.toFixed(1);
                    cells[4].textContent = totals.manDaysByResource.G2.toFixed(1);
                    cells[5].textContent = totals.manDaysByResource.TA.toFixed(1);
                    cells[6].textContent = totals.manDaysByResource.PM.toFixed(1);
                    
                    // Update costs by resource (physical cells 7-10)
                    cells[7].textContent = `€${totals.costByResource.G1.toLocaleString()}`;
                    cells[8].textContent = `€${totals.costByResource.G2.toLocaleString()}`;
                    cells[9].textContent = `€${totals.costByResource.TA.toLocaleString()}`;
                    cells[10].textContent = `€${totals.costByResource.PM.toLocaleString()}`;
                    
                    console.log('Totals updated successfully');
                } catch (error) {
                    console.warn('Error updating totals row cells:', error);
                    this.regenerateTotalsRow(totals);
                }
            } else {
                console.warn('Totals row has insufficient cells:', cells.length);
                // Fallback: try to regenerate the entire totals row
                this.regenerateTotalsRow(totals);
            }
        } else {
            console.warn('Totals row not found in DOM, trying to regenerate...');
            this.regenerateTotalsRow(totals);
        }
    }

    regenerateTotalsRow(totals) {
        const table = document.querySelector('.phases-table');
        if (!table) return;

        // Remove existing totals row if present
        const existingTotalsRow = table.querySelector('.phases-totals-row');
        if (existingTotalsRow) {
            existingTotalsRow.remove();
        }

        // Create new totals row
        const tbody = table.querySelector('tbody');
        if (tbody) {
            const newTotalsRow = document.createElement('tr');
            newTotalsRow.className = 'phases-totals-row';
            newTotalsRow.innerHTML = this.renderTotalsRow();
            tbody.appendChild(newTotalsRow);
            console.log('Totals row regenerated successfully');
        }
    }

    handleAction(action, button) {
        // No more local actions - phases are now saved with main project save
        console.log('Phase action:', action, 'but handled by main app');
    }

    // Method removed - reset functionality no longer available

    /**
     * Mark project as dirty to indicate unsaved changes
     */
    /**
     * Mark project as dirty to indicate unsaved changes
     */
    markDirty() {
        // 🚨 CRITICAL FIX: Check store availability before using StateSelectors
        if (!this.store) {
            console.warn('🛡️ Store not available in ProjectPhasesManager.markDirty, using app fallback');
            if (this.app && typeof this.app.markDirty === 'function') {
                this.app.markDirty();
            }
            return;
        }
        
        // PURE STATE MANAGER: Use StateSelectors which has safe access
        try {
            StateSelectors.markProjectDirty();
        } catch (error) {
            console.error('Error using StateSelectors.markProjectDirty:', error);
            // Fallback to app method
            if (this.app && typeof this.app.markDirty === 'function') {
                this.app.markDirty();
            }
        }
        
        // Update UI to show unsaved changes indicator
        this.updateSaveButtonState();
    }

    /**
     * Update save button state - now handled by main app save button
     */
    updateSaveButtonState() {
        // Save button is now the main app save button - no local button to update
    }

    /**
     * Save phases to project - now handled automatically by main app save
     * This method is kept for compatibility but is no longer used
     */
    async savePhaseToProject() {
        console.log('Phases are now saved automatically with project - use main Save button');
    }

    calculatePhaseTotalCost(phase) {
        const manDaysByResource = this.calculateManDaysByResource(phase.manDays, phase.effort);
        const costByResource = this.calculateCostByResource(manDaysByResource, phase);
        return Object.values(costByResource).reduce((sum, cost) => sum + cost, 0);
    }

    validateAllPhases() {
        const errors = [];

        this.currentPhases.forEach(phase => {

            // Check negative values
            if (phase.manDays < 0) {
                errors.push(`${phase.name}: Man days cannot be negative`);
            }

            Object.entries(phase.effort).forEach(([resource, value]) => {
                if (value < 0 || value > 100) {
                    errors.push(`${phase.name}: ${resource} effort must be between 0-100%`);
                }
            });
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Method removed - export functionality moved to main app export

    /**
     * ⚡ REACTIVE SETUP: Initialize reactive event system
     * Now handles phase change notifications via app integration
     */
    setupEventListeners() {
        // Listen for feature changes to update development phase
        if (this.app) {
            const originalMarkDirty = this.app.markDirty;
            this.app.markDirty = () => {
                originalMarkDirty.call(this.app);
                // Check if features changed and update development phase
                this.calculateDevelopmentPhase();
                const container = document.querySelector('.phases-configuration');
                if (container) {
                    this.updateCalculations();
                }
            };
        }
    }

    // Public methods for integration
    refreshFromFeatures() {
        this.calculateDevelopmentPhase();
        // Mark as dirty when features change
        this.markDirty();

        const container = document.querySelector('.phases-configuration');
        if (container) {
            this.renderPhasesPage(container.parentElement);
        }
    }

    // New method: Call this when a project is loaded to ensure phases are synchronized
    synchronizeWithProject() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject) {
            return;
        }
        
        // Re-initialize phases from current project
        this.loadResourceRates();  // Reload rates first
        this.initializePhases();
        
        // Force recalculation of development phase from features
        this.calculateDevelopmentPhase();
        
        // Mark as dirty after synchronization
        this.markDirty();
    }

    getProjectPhases() {
        return this.currentPhases;
    }

    /**
     * Create fallback phase definitions if DefaultConfigManager is not available
     */
    createFallbackPhaseDefinitions() {
        return [
            {
                id: "functionalAnalysis",
                name: "Functional Analysis",
                description: "Business requirements analysis and functional specification",
                type: "analysis",
                defaultEffort: { G1: 100, G2: 0, TA: 20, PM: 50 },
                editable: true
            },
            {
                id: "technicalAnalysis",
                name: "Technical Analysis",
                description: "Technical design and architecture specification",
                type: "analysis",
                defaultEffort: { G1: 0, G2: 100, TA: 60, PM: 20 },
                editable: true
            },
            {
                id: "development",
                name: "Development",
                description: "Implementation of features (calculated from features list)",
                type: "development",
                defaultEffort: { G1: 0, G2: 100, TA: 40, PM: 20 },
                editable: true,
                calculated: true
            },
            {
                id: "integrationTests",
                name: "Integration Tests",
                description: "System integration and integration testing",
                type: "testing",
                defaultEffort: { G1: 100, G2: 50, TA: 50, PM: 75 },
                editable: true
            },
            {
                id: "uatTests",
                name: "UAT Tests",
                description: "User acceptance testing support and execution",
                type: "testing",
                defaultEffort: { G1: 50, G2: 50, TA: 40, PM: 75 },
                editable: true
            },
            {
                id: "consolidation",
                name: "Consolidation",
                description: "Final testing, bug fixing, and deployment preparation",
                type: "testing",
                defaultEffort: { G1: 30, G2: 30, TA: 30, PM: 20 },
                editable: true
            },
            {
                id: "deployment",
                name: "Deployment",
                description: "Production deployment and go-live activities",
                type: "deployment",
                defaultEffort: { G1: 10, G2: 20, TA: 50, PM: 40 },
                editable: true
            },
            {
                id: "projectManagement",
                name: "Project Management",
                description: "Project coordination, planning, and management activities",
                type: "management",
                defaultEffort: { G1: 0, G2: 0, TA: 10, PM: 100 },
                editable: true
            }
        ];
    }

    getTotalProjectCost() {
        const totals = this.calculateTotals();
        return Object.values(totals.costByResource).reduce((sum, cost) => sum + cost, 0);
    }

    getTotalProjectManDays() {
        return this.calculateTotals().manDays;
    }

    /**
     * Clear selected suppliers to ensure clean state for new projects
     */
    clearSelectedSuppliers() {
        this.selectedSuppliers = {
            G1: null,
            G2: null, 
            TA: null,
            PM: null
        };
        
        // Force re-render of phases page if currently visible
        const phasesContainer = document.querySelector('.phases-content');
        if (phasesContainer) {
            this.renderPhasesPage(phasesContainer);
        }
    }

    /**
     * Reset all phase data for new projects
     */
    resetAllPhaseData() {
        // Reset selected suppliers
        this.selectedSuppliers = {
            G1: null,
            G2: null, 
            TA: null,
            PM: null
        };

        // Remove any saved selected suppliers from project data to prevent restore
        const currentProject = StateSelectors.getCurrentProject();
        if (currentProject && currentProject.phases) {
            delete currentProject.phases.selectedSuppliers;
        }

        // Reset phases to default clean state
        this.currentPhases = this.createDefaultPhases();
        
        // Update project phases with clean data
        if (currentProject) {
            // PURE STATE MANAGER: Use store action instead of direct mutation
            if (this.store) {
                this.store.getState().updateProjectPhases(this.getProjectPhases());
            }
        }

        // Force re-render of phases page to reflect clean state
        const phasesContainer = document.querySelector('.phases-content');
        if (phasesContainer) {
            this.renderPhasesPage(phasesContainer);
        }
    }
}

// Make ProjectPhasesManager available globally
if (typeof window !== 'undefined') {
    window.ProjectPhasesManager = ProjectPhasesManager;
}