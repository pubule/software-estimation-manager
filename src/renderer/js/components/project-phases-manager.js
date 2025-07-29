/**
 * Updated Project Phases Manager
 * Manual save system - removed auto-save functionality, added Save Configuration button
 */

class ProjectPhasesManager {
    constructor(app, configManager) {
        this.app = app;
        this.configManager = configManager;
        this.isDirty = false;

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

        // Phase definitions con configurazioni di default
        this.phaseDefinitions = [
            {
                id: 'functionalAnalysis',
                name: 'Functional Analysis',
                description: 'Business requirements analysis and functional specification',
                type: 'analysis',
                defaultEffort: { G1: 100, G2: 0, TA: 20, PM: 50 },
                editable: true
            },
            {
                id: 'technicalAnalysis',
                name: 'Technical Analysis',
                description: 'Technical design and architecture specification',
                type: 'analysis',
                defaultEffort: { G1: 0, G2: 100, TA: 60, PM: 20 },
                editable: true
            },
            {
                id: 'development',
                name: 'Development',
                description: 'Implementation of features (calculated from features list)',
                type: 'development',
                defaultEffort: { G1: 0, G2: 100, TA: 40, PM: 20 },
                editable: true,
                calculated: true
            },
            {
                id: 'integrationTests',
                name: 'Integration Tests',
                description: 'System integration and integration testing',
                type: 'testing',
                defaultEffort: { G1: 100, G2: 50, TA: 50, PM: 75 },
                editable: true
            },
            {
                id: 'uatTests',
                name: 'UAT Tests',
                description: 'User acceptance testing support and execution',
                type: 'testing',
                defaultEffort: { G1: 50, G2: 50, TA: 40, PM: 75 },
                editable: true
            },
            {
                id: 'consolidation',
                name: 'Consolidation',
                description: 'Final testing, bug fixing, and deployment preparation',
                type: 'testing',
                defaultEffort: { G1: 30, G2: 30, TA: 30, PM: 20 },
                editable: true
            },
            {
                id: 'vapt',
                name: 'VAPT',
                description: 'Vulnerability Assessment and Penetration Testing',
                type: 'testing',
                defaultEffort: { G1: 30, G2: 30, TA: 30, PM: 20 },
                editable: true
            },
            {
                id: 'postGoLive',
                name: 'Post Go-Live Support',
                description: 'Production support and monitoring after deployment',
                type: 'support',
                defaultEffort: { G1: 0, G2: 100, TA: 50, PM: 100 },
                editable: true
            }
        ];

        this.currentPhases = [];
        this.init();
    }

    init() {
        this.loadResourceRates();
        this.initializePhases();
        this.setupEventListeners();
        console.log('Project Phases Manager initialized');
    }

    loadResourceRates() {
        // Carica i supplier selezionati dal progetto corrente
        if (this.app.currentProject && this.app.currentProject.phases) {
            const phasesConfig = this.app.currentProject.phases;
            
            if (phasesConfig.selectedSuppliers) {
                this.selectedSuppliers = { ...phasesConfig.selectedSuppliers };
                this.updateRatesFromSelectedSuppliers();
            }
        }
    }
    
    updateRatesFromSelectedSuppliers() {
        if (!this.configManager || !this.app.currentProject) return;
        
        const projectConfig = this.configManager.getProjectConfig(this.app.currentProject.config);
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
        if (!this.configManager || !this.app.currentProject) return [];
        
        const projectConfig = this.configManager.getProjectConfig(this.app.currentProject.config);
        return [...projectConfig.suppliers, ...projectConfig.internalResources];
    }

    initializePhases() {
        // Inizializza le fasi dal progetto corrente o dai default
        if (this.app.currentProject && this.app.currentProject.phases) {
            this.currentPhases = this.mergeProjectPhases(this.app.currentProject.phases);
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
        // Calcola automaticamente i man days della fase Development dalla lista features
        const developmentPhase = this.currentPhases.find(p => p.id === 'development');
        if (developmentPhase && this.app.currentProject) {
            const featuresTotal = this.app.currentProject.features.reduce((sum, feature) => {
                return sum + (parseFloat(feature.manDays) || 0);
            }, 0);

            developmentPhase.manDays = featuresTotal;
            developmentPhase.lastModified = new Date().toISOString();
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
        const featuresCount = this.app.currentProject?.features?.length || 0;
        const developmentDays = developmentPhase?.manDays || 0;

        return `
            <div class="development-notice">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>Development Phase:</strong> 
                    Man Days are automatically calculated from ${featuresCount} features 
                    (Total: ${developmentDays} days). You can configure effort distribution percentages.
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
                            <span class="current-rate" id="g1-rate">€${this.resourceRates.G1}/day</span>
                        </div>
                        <div class="supplier-selector">
                            <label for="g2-supplier">G2 (Grade 2 Developer):</label>
                            ${this.renderSupplierDropdown('G2', 'g2-supplier', availableSuppliers)}
                            <span class="current-rate" id="g2-rate">€${this.resourceRates.G2}/day</span>
                            <small class="supplier-note">Note: Development phase uses feature-specific suppliers</small>
                        </div>
                        <div class="supplier-selector">
                            <label for="ta-supplier">TA (Technical Analyst):</label>
                            ${this.renderSupplierDropdown('TA', 'ta-supplier', availableSuppliers)}
                            <span class="current-rate" id="ta-rate">€${this.resourceRates.TA}/day</span>
                        </div>
                        <div class="supplier-selector">
                            <label for="pm-supplier">PM (Project Manager):</label>
                            ${this.renderSupplierDropdown('PM', 'pm-supplier', availableSuppliers)}
                            <span class="current-rate" id="pm-rate">€${this.resourceRates.PM}/day</span>
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
        
        let options = '<option value="">Select Supplier</option>';
        suppliers.forEach(supplier => {
            const selected = supplier.id === selectedValue ? 'selected' : '';
            const rate = supplier.realRate || supplier.officialRate || 0;
            options += `<option value="${supplier.id}" data-rate="${rate}" ${selected}>${supplier.name} (€${rate}/day)</option>`;
        });
        
        return `<select id="${selectId}" data-resource="${resourceType}" class="supplier-select">${options}</select>`;
    }

    renderPhasesTable() {
        return `
            <div class="phases-table-container">
                <table class="phases-table">
                    <thead>
                        <tr>
                            <th class="phase-name">Phase</th>
                            <th class="header-group">Man Days</th>
                            <th class="header-group" colspan="4">% Effort Distribution</th>
                            <th class="header-group" colspan="4">Man Days by Resource</th>
                            <th class="header-group" colspan="4">Cost by Resource (€)</th>
                        </tr>
                        <tr>
                            <th class="phase-name"></th>
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
                    <td class="currency resource-g1">${manDaysByResource.G1.toFixed(1)}</td>
                    <td class="currency resource-g2">${manDaysByResource.G2.toFixed(1)}</td>
                    <td class="currency resource-ta">${manDaysByResource.TA.toFixed(1)}</td>
                    <td class="currency resource-pm">${manDaysByResource.PM.toFixed(1)}</td>
                    <td class="currency resource-g1">€${costByResource.G1.toLocaleString()}</td>
                    <td class="currency resource-g2">€${costByResource.G2.toLocaleString()}</td>
                    <td class="currency resource-ta">€${costByResource.TA.toLocaleString()}</td>
                    <td class="currency resource-pm">€${costByResource.PM.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    }

    renderTotalsRow() {
        const totals = this.calculateTotals();

        return `
            <tr class="totals-row">
                <td class="phase-name"><strong>TOTALS</strong></td>
                <td class="currency">${totals.manDays.toFixed(1)}</td>
                <td colspan="4"></td>
                <td class="currency">${totals.manDaysByResource.G1.toFixed(1)}</td>
                <td class="currency">${totals.manDaysByResource.G2.toFixed(1)}</td>
                <td class="currency">${totals.manDaysByResource.TA.toFixed(1)}</td>
                <td class="currency">${totals.manDaysByResource.PM.toFixed(1)}</td>
                <td class="currency">€${totals.costByResource.G1.toLocaleString()}</td>
                <td class="currency">€${totals.costByResource.G2.toLocaleString()}</td>
                <td class="currency">€${totals.costByResource.TA.toLocaleString()}</td>
                <td class="currency">€${totals.costByResource.PM.toLocaleString()}</td>
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
        
        if (this.app.currentProject && this.app.currentProject.features) {
            const g2EffortPercent = developmentPhase.effort.G2 / 100;
            const projectConfig = this.configManager ? this.configManager.getProjectConfig(this.app.currentProject.config) : null;
            const allSuppliers = projectConfig ? [...projectConfig.suppliers, ...projectConfig.internalResources] : [];
            
            this.app.currentProject.features.forEach(feature => {
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

    attachEventListeners(container) {
        // Input changes
        container.addEventListener('input', (e) => {
            if (e.target.type === 'number') {
                this.handleInputChange(e.target);
            }
        });

        // Supplier dropdown changes
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('supplier-select')) {
                this.handleSupplierChange(e.target);
            }
        });

        // Action buttons
        container.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                this.handleAction(action, e.target);
            }
        });

        // Validation on blur
        container.addEventListener('blur', (e) => {
            if (e.target.type === 'number') {
                this.validateInput(e.target);
            }
        }, true);
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

        phase.lastModified = new Date().toISOString();
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
        const totalsRow = document.querySelector('.totals-row');

        if (totalsRow) {
            const cells = totalsRow.cells;
            if (cells.length >= 14) {
                cells[1].textContent = totals.manDays.toFixed(1);
                cells[6].textContent = totals.manDaysByResource.G1.toFixed(1);
                cells[7].textContent = totals.manDaysByResource.G2.toFixed(1);
                cells[8].textContent = totals.manDaysByResource.TA.toFixed(1);
                cells[9].textContent = totals.manDaysByResource.PM.toFixed(1);
                cells[10].textContent = `€${totals.costByResource.G1.toLocaleString()}`;
                cells[11].textContent = `€${totals.costByResource.G2.toLocaleString()}`;
                cells[12].textContent = `€${totals.costByResource.TA.toLocaleString()}`;
                cells[13].textContent = `€${totals.costByResource.PM.toLocaleString()}`;
            }
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
    markDirty() {
        this.isDirty = true;
        
        // Update the app's dirty state as well
        if (this.app && typeof this.app.markDirty === 'function') {
            this.app.markDirty();
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
        if (!this.app.currentProject) {
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

    getTotalProjectCost() {
        const totals = this.calculateTotals();
        return Object.values(totals.costByResource).reduce((sum, cost) => sum + cost, 0);
    }

    getTotalProjectManDays() {
        return this.calculateTotals().manDays;
    }
}

// Make ProjectPhasesManager available globally
if (typeof window !== 'undefined') {
    window.ProjectPhasesManager = ProjectPhasesManager;
}