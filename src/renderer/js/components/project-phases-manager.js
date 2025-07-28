/**
 * Updated Project Phases Manager
 * Manual save system - removed auto-save functionality, added Save Configuration button
 */

class ProjectPhasesManager {
    constructor(app, configManager) {
        this.app = app;
        this.configManager = configManager;
        this.isDirty = false;

        // Resource rates (daily) - potrebbero venire dalla configurazione
        this.resourceRates = {
            G1: 450,  // Grade 1 Developer
            G2: 380,  // Grade 2 Developer
            TA: 420,  // Technical Analyst
            PM: 500   // Project Manager
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
        // Carica i rates dalle configurazioni se disponibili
        if (this.configManager && this.app.currentProject) {
            const projectConfig = this.configManager.getProjectConfig(this.app.currentProject.config);
            const internalResources = projectConfig.internalResources;

            // Mappa i resources interni ai nostri ruoli standard
            const g1Resource = internalResources.find(r => r.role?.toLowerCase().includes('developer') && r.name?.toLowerCase().includes('senior'));
            const g2Resource = internalResources.find(r => r.role?.toLowerCase().includes('developer') && !r.name?.toLowerCase().includes('senior'));
            const taResource = internalResources.find(r => r.role?.toLowerCase().includes('analyst'));
            const pmResource = internalResources.find(r => r.role?.toLowerCase().includes('manager'));

            if (g1Resource) this.resourceRates.G1 = g1Resource.officialRate || g1Resource.realRate || this.resourceRates.G1;
            if (g2Resource) this.resourceRates.G2 = g2Resource.officialRate || g2Resource.realRate || this.resourceRates.G2;
            if (taResource) this.resourceRates.TA = taResource.officialRate || taResource.realRate || this.resourceRates.TA;
            if (pmResource) this.resourceRates.PM = pmResource.officialRate || pmResource.realRate || this.resourceRates.PM;
        }
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
        return `
            <div class="phases-controls">
                <div class="controls-left">
                    <div class="resource-rates">
                        <div class="rate-info tooltip" data-tooltip="Grade 1 Developer Rate">
                            <span>G1:</span>
                            <span class="rate-value">€${this.resourceRates.G1}/day</span>
                        </div>
                        <div class="rate-info tooltip" data-tooltip="Grade 2 Developer Rate">
                            <span>G2:</span>
                            <span class="rate-value">€${this.resourceRates.G2}/day</span>
                        </div>
                        <div class="rate-info tooltip" data-tooltip="Technical Analyst Rate">
                            <span>TA:</span>
                            <span class="rate-value">€${this.resourceRates.TA}/day</span>
                        </div>
                        <div class="rate-info tooltip" data-tooltip="Project Manager Rate">
                            <span>PM:</span>
                            <span class="rate-value">€${this.resourceRates.PM}/day</span>
                        </div>
                    </div>
                </div>
                <div class="controls-right">
                    <button class="btn btn-secondary" data-action="reset-defaults">
                        <i class="fas fa-undo"></i> Reset to Defaults
                    </button>
                    <button class="btn btn-secondary" data-action="export-phases">
                        <i class="fas fa-download"></i> Export Phases
                    </button>
                    <button class="btn btn-primary" data-action="save-phases">
                        <i class="fas fa-save"></i> Save Configuration
                    </button>
                </div>
            </div>
        `;
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
            const costByResource = this.calculateCostByResource(manDaysByResource);
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

    calculateCostByResource(manDaysByResource) {
        return {
            G1: Math.round(manDaysByResource.G1 * this.resourceRates.G1),
            G2: Math.round(manDaysByResource.G2 * this.resourceRates.G2),
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
            const costByResource = this.calculateCostByResource(manDaysByResource);

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
        const costByResource = this.calculateCostByResource(manDaysByResource);

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
        switch (action) {
            case 'reset-defaults':
                this.resetToDefaults();
                break;
            case 'export-phases':
                this.exportPhases();
                break;
            case 'save-phases':
                this.savePhaseToProject();
                break;
        }
    }

    resetToDefaults() {
        if (!confirm('Are you sure you want to reset all phases to default configurations? This will overwrite all current settings.')) {
            return;
        }

        this.currentPhases = this.createDefaultPhases();
        this.calculateDevelopmentPhase();

        // Mark as dirty for manual save
        this.markDirty();

        // Re-render the table
        const container = document.querySelector('.phases-configuration');
        if (container) {
            this.renderPhasesPage(container.parentElement);
        }

        NotificationManager.success('Phases configuration reset to defaults. Remember to save your project.');
    }

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
     * Update save button state to reflect dirty status
     */
    updateSaveButtonState() {
        const saveButton = document.querySelector('[data-action="save-phases"]');
        if (saveButton) {
            if (this.isDirty) {
                saveButton.classList.add('dirty');
                saveButton.innerHTML = '<i class="fas fa-save"></i> Save Configuration *';
                saveButton.title = 'Configuration has unsaved changes';
            } else {
                saveButton.classList.remove('dirty');
                saveButton.innerHTML = '<i class="fas fa-save"></i> Save Configuration';
                saveButton.title = 'Save phase configuration';
            }
        }
    }

    /**
     * Save phases to project - called manually
     */
    async savePhaseToProject() {
        try {
            if (!this.app.currentProject) {
                console.warn('No current project to save phases to');
                return;
            }

            // Validate all phases before saving
            const validation = this.validateAllPhases();
            if (!validation.isValid) {
                console.warn('Phase validation failed:', validation.errors);
                // Save anyway but show warning
                if (validation.errors.length > 0) {
                    NotificationManager.warning(`Phase validation: ${validation.errors[0]}`);
                }
            }

            // Convert phases array back to object format for storage
            const phasesObject = {};
            this.currentPhases.forEach(phase => {
                phasesObject[phase.id] = {
                    manDays: phase.manDays,
                    effort: phase.effort,
                    assignedResources: phase.assignedResources,
                    cost: this.calculatePhaseTotalCost(phase),
                    lastModified: phase.lastModified
                };
            });

            // Save to project
            this.app.currentProject.phases = phasesObject;

            // Mark project as dirty and save manually
            this.app.markDirty();
            
            // Save the project
            if (this.app.saveProject) {
                await this.app.saveProject();
            }

            // Mark as clean after successful save
            this.isDirty = false;
            this.updateSaveButtonState();

            console.log('Phases configuration saved to project');
            NotificationManager.success('Phases configuration saved successfully');

        } catch (error) {
            console.error('Failed to save phases to project:', error);
            NotificationManager.warning('Failed to save phases configuration');
        }
    }

    calculatePhaseTotalCost(phase) {
        const manDaysByResource = this.calculateManDaysByResource(phase.manDays, phase.effort);
        const costByResource = this.calculateCostByResource(manDaysByResource);
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

    exportPhases() {
        try {
            const totals = this.calculateTotals();
            const exportData = {
                metadata: {
                    projectName: this.app.currentProject?.project?.name || 'Unknown Project',
                    exportDate: new Date().toISOString(),
                    version: '1.0.0'
                },
                resourceRates: this.resourceRates,
                phases: this.currentPhases.map(phase => ({
                    ...phase,
                    totalCost: this.calculatePhaseTotalCost(phase),
                    manDaysByResource: this.calculateManDaysByResource(phase.manDays, phase.effort),
                    costByResource: this.calculateCostByResource(this.calculateManDaysByResource(phase.manDays, phase.effort))
                })),
                totals: {
                    ...totals,
                    totalProjectCost: Object.values(totals.costByResource).reduce((sum, cost) => sum + cost, 0)
                }
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const filename = `project-phases-${this.app.currentProject?.project?.name || 'export'}-${new Date().toISOString().split('T')[0]}.json`;

            Helpers.downloadAsFile(dataStr, filename, 'application/json');
            NotificationManager.success('Project phases exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            NotificationManager.error('Failed to export phases configuration');
        }
    }

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
        console.log('Synchronizing phases with current project...');
        
        // Re-initialize phases from current project
        this.initializePhases();
        
        // Force recalculation of development phase from features
        this.calculateDevelopmentPhase();
        
        // Mark as dirty after synchronization
        this.markDirty();
        
        // Update UI if phases page is currently visible
        const container = document.querySelector('.phases-configuration');
        if (container) {
            this.renderPhasesPage(container.parentElement);
        }
        
        console.log('Phases synchronized successfully');
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