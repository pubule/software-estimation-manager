/**
 * Navigation Manager
 * Handles navigation between different sections of the application
 */

class NavigationManager {
    constructor(app) {
        this.app = app;
        this.currentSection = 'projects';
        this.sections = [
            'projects',
            'features',
            'phases',
            'calculations',
            'configuration',
            'templates',
            'history'
        ];

        this.init();
    }

    init() {
        this.setupNavigationEvents();
        this.updateActiveNavigation();

        // Initialize the current section immediately
        setTimeout(() => {
            this.initializeSection(this.currentSection);
        }, 100);
    }

    /**
     * Setup navigation event listeners
     */
    setupNavigationEvents() {
        // Navigation section clicks
        document.querySelectorAll('.nav-section').forEach(section => {
            section.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionName = section.dataset.section;
                if (sectionName && this.sections.includes(sectionName)) {
                    this.navigateTo(sectionName);
                }
            });
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.section) {
                this.navigateTo(e.state.section, false);
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                const sectionKeys = {
                    '1': 'projects',
                    '2': 'features',
                    '3': 'phases',
                    '4': 'calculations',
                    '5': 'configuration',
                    '6': 'templates',
                    '7': 'history'
                };

                if (sectionKeys[e.key]) {
                    e.preventDefault();
                    this.navigateTo(sectionKeys[e.key]);
                }
            }
        });
    }

    /**
     * Navigate to a specific section
     * @param {string} sectionName - Name of the section to navigate to
     * @param {boolean} pushState - Whether to push state to browser history
     */
    navigateTo(sectionName, pushState = true) {
        if (!this.sections.includes(sectionName)) {
            console.warn(`Unknown section: ${sectionName}`);
            return false;
        }

        // Check if we need to save before navigating
        if (this.app.isDirty && this.currentSection !== sectionName) {
            // For now, we'll just navigate. In a full implementation,
            // you might want to prompt the user to save
        }

        // Hide current section
        this.hideSection(this.currentSection);

        // Show new section
        this.showSection(sectionName);

        // Update navigation state
        this.currentSection = sectionName;
        this.updateActiveNavigation();

        // Update browser history
        if (pushState) {
            const state = { section: sectionName };
            const title = this.getSectionTitle(sectionName);
            const url = `#${sectionName}`;

            history.pushState(state, title, url);
        }

        // Trigger section-specific initialization
        this.initializeSection(sectionName);

        // Update page title
        this.updatePageTitle();

        return true;
    }

    /**
     * Hide a section
     * @param {string} sectionName - Section to hide
     */
    hideSection(sectionName) {
        const page = document.getElementById(`${sectionName}-page`);
        if (page) {
            page.classList.remove('active');
        }
    }

    /**
     * Show a section
     * @param {string} sectionName - Section to show
     */
    showSection(sectionName) {
        const page = document.getElementById(`${sectionName}-page`);
        if (page) {
            page.classList.add('active');
            page.classList.add('fade-in');

            // Remove animation class after animation completes
            setTimeout(() => {
                page.classList.remove('fade-in');
            }, 300);
        }
    }

    /**
     * Update active navigation highlighting
     */
    updateActiveNavigation() {
        // Remove active class from all nav sections
        document.querySelectorAll('.nav-section').forEach(section => {
            section.classList.remove('active');
        });

        // Add active class to current section
        const activeSection = document.querySelector(`.nav-section[data-section="${this.currentSection}"]`);
        if (activeSection) {
            activeSection.classList.add('active');
        }
    }

    /**
     * Initialize section-specific functionality
     * @param {string} sectionName - Section to initialize
     */
    initializeSection(sectionName) {
        switch (sectionName) {
            case 'projects':
                this.initializeProjectsSection();
                break;
            case 'features':
                this.initializeFeaturesSection();
                break;
            case 'phases':
                this.initializePhasesSection();
                break;
            case 'calculations':
                this.initializeCalculationsSection();
                break;
            case 'configuration':
                this.initializeConfigurationSection();
                break;
            case 'templates':
                this.initializeTemplatesSection();
                break;
            case 'history':
                this.initializeHistorySection();
                break;
        }
    }

    /**
     * Initialize projects section
     */
    initializeProjectsSection() {
        // Projects section is initialized by ProjectManager
        if (this.app.projectManager) {
            // Force refresh to ensure content is loaded
            setTimeout(() => {
                this.app.projectManager.loadRecentProjects();
                this.app.projectManager.loadSavedProjects();
                this.app.projectManager.updateUI();
            }, 50);
        }
    }

    /**
     * Initialize features section
     */
    initializeFeaturesSection() {
        // Features section is initialized by FeatureManager
        if (this.app.featureManager) {
            this.app.featureManager.refreshTable();
        }
    }

    /**
     * Initialize phases section
     */
    initializePhasesSection() {
        // Load phases data and render
        const phasesContent = document.querySelector('#phases-page .phases-content');
        if (phasesContent && this.app.currentProject) {
            this.renderPhasesSection(phasesContent);
        }
    }

    /**
     * Initialize calculations section
     */
    initializeCalculationsSection() {
        // Load calculations data and render
        const calculationsContent = document.querySelector('#calculations-page .calculations-content');
        if (calculationsContent && this.app.currentProject) {
            this.renderCalculationsSection(calculationsContent);
        }
    }

    /**
     * Initialize configuration section
     */
    initializeConfigurationSection() {
        // Load configuration data and render
        const configContent = document.querySelector('#configuration-page .config-content');
        if (configContent && this.app.currentProject) {
            this.renderConfigurationSection(configContent);
        }
    }

    /**
     * Initialize templates section
     */
    initializeTemplatesSection() {
        // Load templates data and render
        const templatesContent = document.querySelector('#templates-page .templates-content');
        if (templatesContent && this.app.currentProject) {
            this.renderTemplatesSection(templatesContent);
        }
    }

    /**
     * Initialize history section
     */
    initializeHistorySection() {
        // Load version history and render
        const historyContent = document.querySelector('#history-page .history-content');
        if (historyContent) {
            this.renderHistorySection(historyContent);
        }
    }

    /**
     * Render phases section content
     * @param {HTMLElement} container - Container element
     */
    renderPhasesSection(container) {
        const phases = this.app.currentProject.phases;
        const totalDevManDays = this.calculateDevelopmentManDays();

        // Update development phase automatically
        phases.development.manDays = totalDevManDays;

        container.innerHTML = `
            <div class="phases-grid">
                ${Object.entries(phases).map(([key, phase]) => `
                    <div class="phase-card ${key === 'development' ? 'calculated' : ''}">
                        <div class="phase-header">
                            <h3>${this.formatPhaseTitle(key)}</h3>
                            ${key === 'development' ? '<span class="badge info">Auto-calculated</span>' : ''}
                        </div>
                        <div class="phase-content">
                            <div class="form-group">
                                <label>Man Days:</label>
                                <input type="number" 
                                       value="${phase.manDays || 0}" 
                                       ${key === 'development' ? 'readonly' : ''}
                                       data-phase="${key}"
                                       class="phase-man-days">
                            </div>
                            <div class="form-group">
                                <label>Estimated Cost:</label>
                                <div class="cost-display">${Helpers.formatCurrency(this.calculatePhaseCost(phase))}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="phases-summary">
                <div class="summary-card">
                    <h3>Project Summary</h3>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <label>Total Man Days:</label>
                            <span>${this.calculateTotalManDays()}</span>
                        </div>
                        <div class="summary-item">
                            <label>Total Cost:</label>
                            <span>${Helpers.formatCurrency(this.calculateTotalCost())}</span>
                        </div>
                        <div class="summary-item">
                            <label>Duration (months):</label>
                            <span>${this.calculateProjectDuration()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for phase inputs
        container.querySelectorAll('.phase-man-days').forEach(input => {
            if (!input.readOnly) {
                input.addEventListener('change', (e) => {
                    const phase = e.target.dataset.phase;
                    const value = parseFloat(e.target.value) || 0;

                    this.app.currentProject.phases[phase].manDays = value;
                    this.app.markDirty();

                    // Refresh calculations
                    this.initializePhasesSection();
                });
            }
        });
    }

    /**
     * Render calculations section content
     * @param {HTMLElement} container - Container element
     */
    renderCalculationsSection(container) {
        const calculations = this.generateCalculations();

        container.innerHTML = `
            <div class="calculations-dashboard">
                <div class="dashboard-grid">
                    <div class="calc-card">
                        <h3>Project Overview</h3>
                        <div class="calc-metrics">
                            <div class="metric">
                                <label>Total Features:</label>
                                <span class="metric-value">${calculations.totalFeatures}</span>
                            </div>
                            <div class="metric">
                                <label>Total Man Days:</label>
                                <span class="metric-value">${calculations.totalManDays}</span>
                            </div>
                            <div class="metric">
                                <label>Total Cost:</label>
                                <span class="metric-value">${Helpers.formatCurrency(calculations.totalCost)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="calc-card">
                        <h3>Phase Breakdown</h3>
                        <div class="phase-breakdown">
                            ${calculations.phaseBreakdown.map(phase => `
                                <div class="phase-item">
                                    <span class="phase-name">${phase.name}</span>
                                    <span class="phase-days">${phase.manDays} days</span>
                                    <span class="phase-cost">${Helpers.formatCurrency(phase.cost)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="calc-card">
                        <h3>Supplier Breakdown</h3>
                        <div class="supplier-breakdown">
                            ${calculations.supplierBreakdown.map(supplier => `
                                <div class="supplier-item">
                                    <span class="supplier-name">${supplier.name}</span>
                                    <span class="supplier-days">${supplier.manDays} days</span>
                                    <span class="supplier-cost">${Helpers.formatCurrency(supplier.cost)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="calc-card">
                        <h3>Category Breakdown</h3>
                        <div class="category-breakdown">
                            ${calculations.categoryBreakdown.map(category => `
                                <div class="category-item">
                                    <span class="category-name">${category.name}</span>
                                    <span class="category-days">${category.manDays} days</span>
                                    <span class="category-cost">${Helpers.formatCurrency(category.cost)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render configuration section content
     * @param {HTMLElement} container - Container element
     */
    renderConfigurationSection(container) {
        container.innerHTML = `
            <div class="config-tabs">
                <div class="tabs">
                    <div class="tabs-nav">
                        <button class="tab-button active" data-tab="storage">Storage</button>
                        <button class="tab-button" data-tab="suppliers">Suppliers</button>
                        <button class="tab-button" data-tab="resources">Internal Resources</button>
                        <button class="tab-button" data-tab="categories">Categories</button>
                        <button class="tab-button" data-tab="parameters">Parameters</button>
                    </div>
                </div>
                
                <div class="tab-content">
                    <div id="storage-tab" class="tab-pane active">
                        <div class="config-section-header">
                            <h3>Projects Storage Configuration</h3>
                        </div>
                        <div id="storage-content">
                            <div class="storage-config">
                                <div class="form-group">
                                    <label>Projects Folder:</label>
                                    <div class="input-group">
                                        <input type="text" id="projects-path-input" readonly class="projects-path-display">
                                        <button class="btn btn-secondary" id="choose-projects-folder-btn">
                                            <i class="fas fa-folder-open"></i> Choose Folder
                                        </button>
                                        <button class="btn btn-secondary" id="open-projects-folder-btn">
                                            <i class="fas fa-external-link-alt"></i> Open Folder
                                        </button>
                                    </div>
                                    <small class="form-help">All projects will be saved as JSON files in this folder</small>
                                </div>
                                
                                <div class="storage-info">
                                    <h4>Storage Information</h4>
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <label>Saved Projects:</label>
                                            <span id="storage-saved-count">-</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Total Size:</label>
                                            <span id="storage-total-size">-</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Auto-save:</label>
                                            <span id="storage-autosave">Enabled</span>
                                        </div>
                                    </div>
                                    <button class="btn btn-primary" id="refresh-storage-info-btn">
                                        <i class="fas fa-sync"></i> Refresh Info
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="suppliers-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Suppliers Configuration</h3>
                            <button class="btn btn-primary" id="add-supplier-btn">
                                <i class="fas fa-plus"></i> Add Supplier
                            </button>
                        </div>
                        <div id="suppliers-content"></div>
                    </div>
                    
                    <div id="resources-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Internal Resources Configuration</h3>
                            <button class="btn btn-primary" id="add-resource-btn">
                                <i class="fas fa-plus"></i> Add Resource
                            </button>
                        </div>
                        <div id="resources-content"></div>
                    </div>
                    
                    <div id="categories-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Feature Categories Configuration</h3>
                            <button class="btn btn-primary" id="add-category-btn">
                                <i class="fas fa-plus"></i> Add Category
                            </button>
                        </div>
                        <div id="categories-content"></div>
                    </div>
                    
                    <div id="parameters-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Calculation Parameters</h3>
                        </div>
                        <div id="parameters-content"></div>
                    </div>
                </div>
            </div>
        `;

        // Initialize tab functionality
        this.initializeConfigTabs(container);

        // Load initial tab content
        this.loadConfigContent('storage');
    }

    /**
     * Render templates section content
     * @param {HTMLElement} container - Container element
     */
    renderTemplatesSection(container) {
        container.innerHTML = `
            <div class="templates-section">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-copy"></i>
                    </div>
                    <div class="empty-state-title">Templates Coming Soon</div>
                    <div class="empty-state-message">
                        Template management functionality will be available in a future update.
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render history section content
     * @param {HTMLElement} container - Container element
     */
    renderHistorySection(container) {
        container.innerHTML = `
            <div class="history-section">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <div class="empty-state-title">Version History Coming Soon</div>
                    <div class="empty-state-message">
                        Version history and project versioning will be available in a future update.
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize configuration tabs
     * @param {HTMLElement} container - Container element
     */
    initializeConfigTabs(container) {
        const tabButtons = container.querySelectorAll('.tab-button');
        const tabPanes = container.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;

                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update active tab pane
                tabPanes.forEach(pane => pane.classList.remove('active'));
                const targetPane = container.querySelector(`#${tabName}-tab`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }

                // Load tab content
                this.loadConfigContent(tabName);
            });
        });
    }

    /**
     * Load configuration content for a specific tab
     * @param {string} tabName - Tab name
     */
    async loadConfigContent(tabName) {
        const contentDiv = document.getElementById(`${tabName}-content`);
        if (!contentDiv) return;

        switch (tabName) {
            case 'storage':
                await this.loadStorageConfig();
                break;
            default:
                contentDiv.innerHTML = `
                    <div class="config-placeholder">
                        <p>${this.capitalize(tabName)} configuration will be implemented here.</p>
                    </div>
                `;
                break;
        }
    }

    /**
     * Load storage configuration
     */
    async loadStorageConfig() {
        try {
            // Get current projects path
            const projectsPath = await this.app.dataManager.getProjectsPath();

            // Update projects path input
            const pathInput = document.getElementById('projects-path-input');
            if (pathInput) {
                pathInput.value = projectsPath || 'Not set';
            }

            // Setup event listeners for storage tab
            this.setupStorageEventListeners();

            // Load storage info
            await this.refreshStorageInfo();

        } catch (error) {
            console.error('Failed to load storage config:', error);
        }
    }

    /**
     * Setup event listeners for storage configuration
     */
    setupStorageEventListeners() {
        // Choose folder button
        document.getElementById('choose-projects-folder-btn')?.addEventListener('click', async () => {
            try {
                const result = await this.app.dataManager.chooseProjectsFolder();

                if (result.success && result.path) {
                    const success = await this.app.dataManager.setProjectsPath(result.path);

                    if (success) {
                        document.getElementById('projects-path-input').value = result.path;
                        await this.refreshStorageInfo();

                        // Refresh project manager
                        if (this.app.projectManager) {
                            await this.app.projectManager.loadSavedProjects();
                            this.app.projectManager.updateUI();
                        }

                        NotificationManager.success(`Projects folder updated: ${result.path}`);
                    } else {
                        NotificationManager.error('Failed to update projects folder');
                    }
                }
            } catch (error) {
                console.error('Failed to choose projects folder:', error);
                NotificationManager.error('Failed to choose projects folder');
            }
        });

        // Open folder button
        document.getElementById('open-projects-folder-btn')?.addEventListener('click', async () => {
            try {
                const success = await this.app.dataManager.openProjectsFolder();
                if (!success) {
                    NotificationManager.error('Failed to open projects folder');
                }
            } catch (error) {
                console.error('Failed to open projects folder:', error);
                NotificationManager.error('Failed to open projects folder');
            }
        });

        // Refresh info button
        document.getElementById('refresh-storage-info-btn')?.addEventListener('click', async () => {
            await this.refreshStorageInfo();

            // Refresh project manager
            if (this.app.projectManager) {
                await this.app.projectManager.refreshProjects();
            }
        });
    }

    /**
     * Refresh storage information display
     */
    async refreshStorageInfo() {
        try {
            // Get projects list to calculate stats
            const projects = await this.app.dataManager.listProjects();

            let totalSize = 0;
            projects.forEach(project => {
                totalSize += project.fileSize || 0;
            });

            // Update display
            document.getElementById('storage-saved-count').textContent = projects.length;
            document.getElementById('storage-total-size').textContent = Helpers.formatBytes(totalSize);

        } catch (error) {
            console.error('Failed to refresh storage info:', error);
            document.getElementById('storage-saved-count').textContent = 'Error';
            document.getElementById('storage-total-size').textContent = 'Error';
        }
    }

    /**
     * Helper methods for calculations
     */
    calculateDevelopmentManDays() {
        if (!this.app.currentProject) return 0;
        return this.app.currentProject.features.reduce((sum, feature) => sum + (feature.manDays || 0), 0);
    }

    calculateTotalManDays() {
        if (!this.app.currentProject) return 0;
        return Object.values(this.app.currentProject.phases).reduce((sum, phase) => sum + (phase.manDays || 0), 0);
    }

    calculatePhaseCost(phase) {
        // Simplified cost calculation - in reality this would be more complex
        return (phase.manDays || 0) * 400 * 8; // Assuming €400/day * 8 hours
    }

    calculateTotalCost() {
        if (!this.app.currentProject) return 0;
        return Object.values(this.app.currentProject.phases).reduce((sum, phase) => sum + this.calculatePhaseCost(phase), 0);
    }

    calculateProjectDuration() {
        const totalManDays = this.calculateTotalManDays();
        const workingDaysPerMonth = this.app.currentProject?.config?.calculationParams?.workingDaysPerMonth || 22;
        return (totalManDays / workingDaysPerMonth).toFixed(1);
    }

    generateCalculations() {
        if (!this.app.currentProject) return {};

        const project = this.app.currentProject;

        return {
            totalFeatures: project.features.length,
            totalManDays: this.calculateTotalManDays(),
            totalCost: this.calculateTotalCost(),
            phaseBreakdown: Object.entries(project.phases).map(([key, phase]) => ({
                name: this.formatPhaseTitle(key),
                manDays: phase.manDays || 0,
                cost: this.calculatePhaseCost(phase)
            })),
            supplierBreakdown: this.calculateSupplierBreakdown(),
            categoryBreakdown: this.calculateCategoryBreakdown()
        };
    }

    calculateSupplierBreakdown() {
        // Implementation would calculate breakdown by supplier
        return [];
    }

    calculateCategoryBreakdown() {
        // Implementation would calculate breakdown by category
        return [];
    }

    /**
     * Utility methods
     */
    getSectionTitle(sectionName) {
        const titles = {
            projects: 'Project Manager',
            features: 'Features Management',
            phases: 'Project Phases',
            calculations: 'Calculations',
            configuration: 'Configuration',
            templates: 'Templates',
            history: 'Version History'
        };

        return titles[sectionName] || 'Software Estimation Manager';
    }

    formatPhaseTitle(phaseKey) {
        const titles = {
            functionalSpec: 'Functional Specification',
            techSpec: 'Technical Specification',
            development: 'Development',
            sit: 'System Integration Testing',
            uat: 'User Acceptance Testing',
            vapt: 'Vulnerability Assessment',
            consolidation: 'Consolidation',
            postGoLive: 'Post Go-Live'
        };

        return titles[phaseKey] || phaseKey;
    }

    updatePageTitle() {
        const sectionTitle = this.getSectionTitle(this.currentSection);
        const projectName = this.app.currentProject?.project?.name || 'New Project';
        document.title = `${sectionTitle} - ${projectName} - Software Estimation Manager`;
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get current section
     */
    getCurrentSection() {
        return this.currentSection;
    }

    /**
     * Check if section exists
     * @param {string} sectionName - Section name to check
     */
    hasSection(sectionName) {
        return this.sections.includes(sectionName);
    }
}

// Make NavigationManager available globally
if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
}