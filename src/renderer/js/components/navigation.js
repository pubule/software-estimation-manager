/**
 * Base Navigation Manager
 */
class NavigationManager {
    constructor(app) {
        this.app = app;
        this.currentSection = 'projects';
    }

    navigateTo(sectionName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active state from all nav sections
        document.querySelectorAll('.nav-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${sectionName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Set active nav section
        const targetNav = document.querySelector(`[data-section="${sectionName}"]`);
        if (targetNav) {
            targetNav.classList.add('active');
        }

        this.currentSection = sectionName;

        // Load content for configuration section
        if (sectionName === 'configuration' && this.renderConfigurationSection) {
            const container = document.querySelector('#configuration-page .config-content');
            if (container) {
                this.renderConfigurationSection(container);
            }
        }

        console.log(`Navigated to section: ${sectionName}`);
    }

    // Storage configuration
    async loadStorageConfig() {
        const contentDiv = document.getElementById('storage-content');
        if (!contentDiv) return;

        // Get current projects path
        const projectsPath = await this.app.dataManager.getProjectsPath();

        contentDiv.innerHTML = `
            <div class="storage-config">
                <div class="form-group">
                    <label for="projects-path">Projects Storage Folder:</label>
                    <div class="input-group">
                        <input type="text" id="projects-path" class="projects-path-display" 
                               value="${projectsPath || ''}" readonly>
                        <button class="btn btn-secondary" id="browse-projects-folder">
                            <i class="fas fa-folder-open"></i> Browse
                        </button>
                        <button class="btn btn-secondary" id="open-projects-folder">
                            <i class="fas fa-external-link-alt"></i> Open
                        </button>
                    </div>
                    <small class="form-help">Choose where to store your project files</small>
                </div>

                <div class="storage-actions">
                    <button class="btn btn-primary" id="apply-storage-changes">
                        <i class="fas fa-save"></i> Apply Changes
                    </button>
                    <button class="btn btn-secondary" id="reset-storage-defaults">
                        <i class="fas fa-undo"></i> Reset to Defaults
                    </button>
                </div>

                <div class="storage-info">
                    <h4>Storage Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Current Path:</label>
                            <span id="current-path">${projectsPath || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <label>Available Space:</label>
                            <span id="available-space">Calculating...</span>
                        </div>
                        <div class="info-item">
                            <label>Projects Count:</label>
                            <span id="projects-count">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupStorageEventListeners();
        this.updateStorageInfo();
    }

    setupStorageEventListeners() {
        // Browse projects folder
        document.getElementById('browse-projects-folder')?.addEventListener('click', async () => {
            try {
                const result = await this.app.dataManager.chooseProjectsFolder();
                if (result?.success && result.path) {
                    document.getElementById('projects-path').value = result.path;
                }
            } catch (error) {
                NotificationManager.error('Failed to browse folders');
            }
        });

        // Open projects folder
        document.getElementById('open-projects-folder')?.addEventListener('click', async () => {
            try {
                await this.app.dataManager.openProjectsFolder();
            } catch (error) {
                NotificationManager.error('Failed to open projects folder');
            }
        });

        // Apply storage changes
        document.getElementById('apply-storage-changes')?.addEventListener('click', async () => {
            try {
                const newPath = document.getElementById('projects-path').value;
                const success = await this.app.dataManager.setProjectsPath(newPath);

                if (success) {
                    NotificationManager.success('Storage path updated successfully');
                    this.updateStorageInfo();
                } else {
                    NotificationManager.error('Failed to update storage path');
                }
            } catch (error) {
                NotificationManager.error('Failed to apply storage changes');
            }
        });

        // Reset to defaults
        document.getElementById('reset-storage-defaults')?.addEventListener('click', async () => {
            if (confirm('Reset storage path to default location?')) {
                try {
                    // Use a cross-platform default path
                    const defaultPath = 'Documents/Software Estimation Projects';
                    document.getElementById('projects-path').value = defaultPath;
                } catch (error) {
                    NotificationManager.error('Failed to reset to defaults');
                }
            }
        });
    }

    async updateStorageInfo() {
        try {
            // Update projects count
            const projects = await this.app.dataManager.listProjects();
            const projectsCountEl = document.getElementById('projects-count');
            if (projectsCountEl) {
                projectsCountEl.textContent = projects.length.toString();
            }

            // Note: Available space calculation would require additional APIs
            const availableSpaceEl = document.getElementById('available-space');
            if (availableSpaceEl) {
                availableSpaceEl.textContent = 'Available';
            }
        } catch (error) {
            console.error('Failed to update storage info:', error);
        }
    }

    initializeConfigTabs(container) {
        // Tab switching functionality
        const tabButtons = container.querySelectorAll('.tab-button');
        const tabPanes = container.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;

                // Remove active class from all tabs and panes
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));

                // Add active class to clicked tab and corresponding pane
                button.classList.add('active');
                const targetPane = document.getElementById(`${tabName}-tab`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }

                // Load content for the selected tab
                this.loadConfigContent(tabName);
            });
        });
    }

    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
}

/**
 * Enhanced Navigation Manager - UPDATED
 * Rimuove Project Phases dalla configurazione, rimane solo nel sottomenu Projects
 */

class EnhancedNavigationManager extends NavigationManager {
    constructor(app, configManager) {
        super(app);
        this.configManager = configManager;
        this.projectsExpanded = false;
        this.projectLoaded = false;
        this.projectDirty = false;

        this.initializeNestedNavigation();
    }

    initializeNestedNavigation() {
        this.setupNestedEventListeners();
        this.updateProjectStatus();
    }

    setupNestedEventListeners() {
        // Override parent navigation setup
        this.setupNavigationEvents();
        this.setupProjectToggle();
    }

    setupNavigationEvents() {
        // Main navigation sections
        document.querySelectorAll('.nav-section[data-section]').forEach(section => {
            const navItem = section.querySelector('.nav-item');
            if (navItem) {
                navItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sectionName = section.dataset.section;

                    if (sectionName === 'projects') {
                        // Always navigate to Projects page
                        this.navigateTo('projects');

                        // Then expand section if project is loaded
                        if (this.projectLoaded && !this.projectsExpanded) {
                            this.projectsExpanded = true;
                            this.updateProjectsExpansion();
                        }
                    } else {
                        this.navigateTo(sectionName);
                    }
                });
            }
        });

        // Nested project sections
        document.querySelectorAll('.nav-child[data-section]').forEach(child => {
            child.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!child.classList.contains('disabled')) {
                    const sectionName = child.dataset.section;
                    this.navigateTo(sectionName);
                }
            });
        });
    }

    setupProjectToggle() {
        const projectsToggle = document.getElementById('projects-toggle');
        if (projectsToggle) {
            projectsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProjectsSection();
            });
        }
    }

    toggleProjectsSection() {
        this.projectsExpanded = !this.projectsExpanded;
        this.updateProjectsExpansion();

        // If projects section is being opened and no specific sub-section is active,
        // navigate to projects main page
        if (this.projectsExpanded && !this.isProjectSubSection(this.currentSection)) {
            this.navigateTo('projects');
        }
    }

    navigateTo(sectionName) {
        // Check if user is trying to access a project sub-section without a loaded project
        if (this.isProjectSubSection(sectionName) && !this.projectLoaded) {
            console.warn(`Cannot navigate to ${sectionName}: No project loaded`);
            NotificationManager.warning('Please load or create a project first');
            return;
        }

        // Special handling for phases navigation
        if (sectionName === 'phases') {
            this.showPhasesPage();
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Update active states
        this.updateActiveStates(sectionName);

        // Show target page
        const targetPage = document.getElementById(`${sectionName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Store current section
        this.currentSection = sectionName;

        // If navigating to a project sub-section, ensure projects is expanded
        if (this.isProjectSubSection(sectionName)) {
            if (!this.projectsExpanded) {
                this.projectsExpanded = true;
                this.updateProjectsExpansion();
            }
        }

        // Load content for configuration section
        if (sectionName === 'configuration' && this.renderConfigurationSection) {
            const container = document.querySelector('#configuration-page .config-content');
            if (container) {
                this.renderConfigurationSection(container);
            }
        }

        console.log(`Navigated to section: ${sectionName}`);
    }

    // Special method for phases page
    showPhasesPage() {
        // Verify project is loaded
        if (!this.projectLoaded) {
            console.warn('Cannot navigate to phases: No project loaded');
            NotificationManager.warning('Please load or create a project first to access project phases');
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Update active states
        this.updateActiveStates('phases');

        // Show target page
        const targetPage = document.getElementById('phases-page');
        if (targetPage) {
            targetPage.classList.add('active');

            // Initialize phases manager if not exists
            if (!this.app.phasesManager) {
                this.app.phasesManager = new ProjectPhasesManager(this.app, this.configManager);
            }

            // Render phases content
            setTimeout(() => {
                this.app.phasesManager.renderPhasesPage(targetPage);
            }, 100);
        }

        // Store current section
        this.currentSection = 'phases';

        // Ensure projects is expanded
        if (!this.projectsExpanded) {
            this.projectsExpanded = true;
            this.updateProjectsExpansion();
        }

        console.log('Navigated to phases page');
    }

    updateActiveStates(activeSectionName) {
        // Remove all active states
        document.querySelectorAll('.nav-section, .nav-child').forEach(el => {
            el.classList.remove('active');
        });

        // Set active state for the target section
        const activeElement = document.querySelector(`[data-section="${activeSectionName}"]`);
        if (activeElement) {
            activeElement.classList.add('active');

            // If it's a project sub-section, also mark projects as active
            if (this.isProjectSubSection(activeSectionName)) {
                const projectsSection = document.querySelector('[data-section="projects"]');
                if (projectsSection) {
                    projectsSection.classList.add('active');
                }
            }
        }
    }

    updateProjectsExpansion() {
        const toggle = document.getElementById('projects-toggle');
        const children = document.getElementById('projects-children');

        if (toggle && children) {
            toggle.classList.toggle('expanded', this.projectsExpanded);
            children.classList.toggle('expanded', this.projectsExpanded);
        }
    }

    isProjectSubSection(sectionName) {
        return ['features', 'phases', 'calculations', 'history'].includes(sectionName);
    }

    setProjectStatus(loaded, dirty = false) {
        this.projectLoaded = loaded;
        this.projectDirty = dirty;
        this.updateProjectStatus();
        this.updateProjectSubSections();

        // If project is being closed and user is viewing a project sub-section,
        // navigate back to projects main page
        if (!loaded && this.isProjectSubSection(this.currentSection)) {
            this.navigateTo('projects');
        }
    }

    updateProjectStatus() {
        const indicator = document.getElementById('nav-project-status');
        if (indicator) {
            // Reset classes
            indicator.className = 'project-status-indicator';

            if (!this.projectLoaded) {
                indicator.classList.add('no-project');
            } else if (this.projectDirty) {
                indicator.classList.add('project-dirty');
            } else {
                indicator.classList.add('project-loaded');
            }
        }
    }

    updateProjectSubSections() {
        const subSections = document.querySelectorAll('.nav-child[data-section]');
        subSections.forEach(child => {
            if (this.projectLoaded) {
                child.classList.remove('disabled');
            } else {
                child.classList.add('disabled');
            }
        });
    }

    onProjectLoaded() {
        this.setProjectStatus(true, false);

        // Auto-expand projects section
        if (!this.projectsExpanded) {
            this.projectsExpanded = true;
            this.updateProjectsExpansion();
        }
    }

    onProjectClosed() {
        this.setProjectStatus(false, false);
    }

    onProjectDirty(isDirty) {
        this.setProjectStatus(this.projectLoaded, isDirty);
    }

    getNavigationState() {
        return {
            currentSection: this.currentSection,
            projectLoaded: this.projectLoaded,
            projectDirty: this.projectDirty,
            projectsExpanded: this.projectsExpanded
        };
    }

    restoreNavigationState(state) {
        if (state) {
            this.projectLoaded = state.projectLoaded || false;
            this.projectDirty = state.projectDirty || false;
            this.projectsExpanded = state.projectsExpanded || false;

            this.updateProjectStatus();
            this.updateProjectSubSections();
            this.updateProjectsExpansion();

            if (state.currentSection) {
                this.navigateTo(state.currentSection);
            }
        }
    }

    /**
     * UPDATED: Configuration rendering WITHOUT phases tab
     */
    renderConfigurationSection(container) {
        container.innerHTML = `
            <div class="config-tabs">
                <div class="tabs">
                    <div class="tabs-nav">
                        <button class="tab-button active" data-tab="storage">Storage</button>
                        <button class="tab-button" data-tab="global">Global Config</button>
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
                            <!-- Storage content will be loaded here -->
                        </div>
                    </div>

                    <div id="global-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Global Default Configuration</h3>
                            <p class="config-description">
                                These settings apply to all new projects by default. 
                                Projects can override these settings individually.
                            </p>
                        </div>
                        <div id="global-content">
                            <!-- Global config content will be loaded here -->
                        </div>
                    </div>
                    
                    <div id="suppliers-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Suppliers Configuration</h3>
                            <p class="config-description">
                                Manage external suppliers and their rates. These will be available 
                                for all new projects by default.
                            </p>
                        </div>
                        <div id="suppliers-content">
                            <p>Suppliers configuration will be implemented here...</p>
                        </div>
                    </div>
                    
                    <div id="resources-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Internal Resources Configuration</h3>
                            <p class="config-description">
                                Manage internal team resources like developers, analysts, and project managers.
                            </p>
                        </div>
                        <div id="resources-content">
                            <p>Internal resources configuration will be implemented here...</p>
                        </div>
                    </div>
                    
                    <div id="categories-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Feature Categories Configuration</h3>
                            <p class="config-description">
                                Manage feature categories and their complexity multipliers.
                            </p>
                        </div>
                        <div id="categories-content">
                            <p>Categories configuration will be implemented here...</p>
                        </div>
                    </div>
                    
                    <div id="parameters-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Calculation Parameters</h3>
                            <p class="config-description">
                                Configure global calculation parameters like working days, currency, and margins.
                            </p>
                        </div>
                        <div id="parameters-content">
                            <!-- Parameters content will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize tab functionality
        this.initializeConfigTabs(container);

        // Load initial tab content
        this.loadConfigContent('storage');

        // Add project status information to configuration
        this.addProjectStatusToConfig(container);
    }

    /**
     * UPDATED: Load configuration content WITHOUT phases handling
     */
    async loadConfigContent(tabName) {
        const contentDiv = document.getElementById(`${tabName}-content`);
        if (!contentDiv) return;

        switch (tabName) {
            case 'storage':
                await this.loadStorageConfig();
                break;
            case 'global':
                await this.loadGlobalConfig();
                break;
            case 'suppliers':
                await this.loadSuppliersConfig();
                break;
            case 'resources':
                await this.loadResourcesConfig();
                break;
            case 'categories':
                await this.loadCategoriesConfig();
                break;
            case 'parameters':
                await this.loadParametersConfig();
                break;
            default:
                contentDiv.innerHTML = `
                    <div class="config-placeholder">
                        <p>${this.capitalize(tabName)} configuration will be implemented here...</p>
                    </div>
                `;
                break;
        }
    }

    async loadGlobalConfig() {
        const contentDiv = document.getElementById('global-content');
        if (!contentDiv) return;

        const globalConfig = this.configManager?.globalConfig;

        contentDiv.innerHTML = `
            <div class="global-config-overview">
                <div class="config-stats-grid">
                    <div class="stat-card">
                        <h4>Global Suppliers</h4>
                        <div class="stat-value">${globalConfig?.suppliers?.length || 0}</div>
                        <div class="stat-label">External suppliers available by default</div>
                    </div>
                    <div class="stat-card">
                        <h4>Global Resources</h4>
                        <div class="stat-value">${globalConfig?.internalResources?.length || 0}</div>
                        <div class="stat-label">Internal resources available by default</div>
                    </div>
                    <div class="stat-card">
                        <h4>Global Categories</h4>
                        <div class="stat-value">${globalConfig?.categories?.length || 0}</div>
                        <div class="stat-label">Feature categories available by default</div>
                    </div>
                </div>

                <div class="global-config-info">
                    <h4>How Global Configuration Works</h4>
                    <ul class="info-list">
                        <li><strong>Default Templates:</strong> Global settings serve as templates for new projects</li>
                        <li><strong>Project Inheritance:</strong> New projects automatically inherit global settings</li>
                        <li><strong>Project Overrides:</strong> Projects can modify or add to global settings without affecting other projects</li>
                        <li><strong>Centralized Management:</strong> Update global settings to affect all future projects</li>
                        <li><strong>Project Phases:</strong> Configure project phases and effort distribution in the Projects section for each specific project</li>
                    </ul>
                </div>

                <div class="global-actions-section">
                    <h4>Global Configuration Actions</h4>
                    <div class="action-buttons-grid">
                        <button class="btn btn-secondary" onclick="window.importGlobalConfig()">
                            <i class="fas fa-upload"></i> Import Global Config
                        </button>
                        <button class="btn btn-secondary" onclick="window.exportGlobalConfig()">
                            <i class="fas fa-download"></i> Export Global Config
                        </button>
                        <button class="btn btn-warning" onclick="window.resetProjectConfig()">
                            <i class="fas fa-undo"></i> Reset Current Project to Global
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadSuppliersConfig() {
        const contentDiv = document.getElementById('suppliers-content');
        if (!contentDiv) return;

        contentDiv.innerHTML = `
            <div class="config-placeholder">
                <h4>Suppliers Configuration</h4>
                <p>This section will manage external suppliers and their rates.</p>
                <p>Configuration will include both global defaults and project-specific overrides.</p>
                <div style="margin-top: var(--spacing-lg);">
                    <p><strong>Note:</strong> Project-specific supplier configuration is available in the Features Management section when working on a specific project.</p>
                </div>
            </div>
        `;
    }

    async loadResourcesConfig() {
        const contentDiv = document.getElementById('resources-content');
        if (!contentDiv) return;

        contentDiv.innerHTML = `
            <div class="config-placeholder">
                <h4>Internal Resources Configuration</h4>
                <p>This section will manage internal resources like developers, analysts, etc.</p>
                <p>Similar functionality to suppliers but for internal team members.</p>
                <div style="margin-top: var(--spacing-lg);">
                    <p><strong>Note:</strong> Project-specific resource allocation is available in the Project Phases section when working on a specific project.</p>
                </div>
            </div>
        `;
    }

    async loadCategoriesConfig() {
        const contentDiv = document.getElementById('categories-content');
        if (!contentDiv) return;

        contentDiv.innerHTML = `
            <div class="config-placeholder">
                <h4>Feature Categories Configuration</h4>
                <p>This section will manage feature categories with multipliers.</p>
                <p>Categories help organize features and apply complexity multipliers.</p>
                <div style="margin-top: var(--spacing-lg);">
                    <p><strong>Note:</strong> Project-specific categories can be added in the Features Management section when working on a specific project.</p>
                </div>
            </div>
        `;
    }

    async loadParametersConfig() {
        const contentDiv = document.getElementById('parameters-content');
        if (!contentDiv) return;

        const currentProject = this.app.currentProject;
        const params = this.configManager?.getCalculationParams?.(currentProject?.config) || {};

        contentDiv.innerHTML = `
            <div class="config-form">
                <div class="form-group">
                    <label>Working Days per Month:</label>
                    <input type="number" id="working-days-month" value="${params.workingDaysPerMonth || 22}" 
                           min="1" max="31" class="config-input">
                    <small class="form-help">Number of working days in a typical month</small>
                </div>
                
                <div class="form-group">
                    <label>Working Hours per Day:</label>
                    <input type="number" id="working-hours-day" value="${params.workingHoursPerDay || 8}" 
                           min="1" max="24" class="config-input">
                    <small class="form-help">Number of working hours in a day</small>
                </div>
                
                <div class="form-group">
                    <label>Currency Symbol:</label>
                    <input type="text" id="currency-symbol" value="${params.currencySymbol || '€'}" 
                           maxlength="3" class="config-input">
                    <small class="form-help">Currency symbol to display in calculations</small>
                </div>
                
                <div class="form-group">
                    <label>Risk Margin (%):</label>
                    <input type="number" id="risk-margin" value="${(params.riskMargin || 0.15) * 100}" 
                           min="0" max="100" step="1" class="config-input">
                    <small class="form-help">Risk margin to add to estimates (as percentage)</small>
                </div>
                
                <div class="form-group">
                    <label>Overhead Percentage (%):</label>
                    <input type="number" id="overhead-percentage" value="${(params.overheadPercentage || 0.10) * 100}" 
                           min="0" max="100" step="1" class="config-input">
                    <small class="form-help">Overhead costs to add (as percentage)</small>
                </div>
                
                <div class="config-actions">
                    <button class="btn btn-primary" id="save-parameters-config">
                        <i class="fas fa-save"></i> Save Parameters
                    </button>
                    <button class="btn btn-secondary" id="reset-parameters-config">
                        <i class="fas fa-undo"></i> Reset to Defaults
                    </button>
                </div>
                
                <div style="margin-top: var(--spacing-lg); padding: var(--spacing-md); background-color: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-primary);">
                    <p><strong>Note:</strong> These are global default parameters. For project-specific phase configuration and effort distribution, use the Project Phases section in the Projects menu.</p>
                </div>
            </div>
        `;

        this.setupParametersEventListeners();
    }

    setupParametersEventListeners() {
        // Save parameters button
        document.getElementById('save-parameters-config')?.addEventListener('click', () => {
            const params = {
                workingDaysPerMonth: parseInt(document.getElementById('working-days-month').value) || 22,
                workingHoursPerDay: parseInt(document.getElementById('working-hours-day').value) || 8,
                currencySymbol: document.getElementById('currency-symbol').value || '€',
                riskMargin: (parseFloat(document.getElementById('risk-margin').value) || 15) / 100,
                overheadPercentage: (parseFloat(document.getElementById('overhead-percentage').value) || 10) / 100
            };

            if (this.configManager?.updateCalculationParams) {
                const currentProject = this.app.currentProject;
                this.configManager.updateCalculationParams(currentProject.config, params);
                this.app.markDirty();
                NotificationManager.success('Calculation parameters saved');
            } else {
                NotificationManager.warning('Configuration manager not available');
            }
        });

        // Reset parameters button
        document.getElementById('reset-parameters-config')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset parameters to default values?')) {
                this.loadParametersConfig();
                NotificationManager.success('Parameters reset to defaults');
            }
        });
    }

    addProjectStatusToConfig(container) {
        const statusSection = document.createElement('div');
        statusSection.className = 'config-project-status';
        statusSection.innerHTML = `
            <div class="config-section-header">
                <h3>Current Project Status</h3>
            </div>
            <div class="project-status-info">
                <div class="status-item">
                    <label>Project Loaded:</label>
                    <span class="status-value ${this.projectLoaded ? 'success' : 'muted'}">${this.projectLoaded ? 'Yes' : 'No'}</span>
                </div>
                <div class="status-item">
                    <label>Has Unsaved Changes:</label>
                    <span class="status-value ${this.projectDirty ? 'warning' : 'success'}">${this.projectDirty ? 'Yes' : 'No'}</span>
                </div>
                <div class="status-item">
                    <label>Available Sections:</label>
                    <span class="status-value">${this.projectLoaded ? 'All sections accessible' : 'Only Projects and Configuration accessible'}</span>
                </div>
                <div class="status-item">
                    <label>Project Phases:</label>
                    <span class="status-value info">Available in Projects → Project Phases</span>
                </div>
            </div>
        `;

        // Insert at the beginning of configuration content
        const configContent = container.querySelector('.config-tabs');
        if (configContent) {
            container.insertBefore(statusSection, configContent);
        }
    }
}

// Utility functions for navigation state management
class NavigationStateManager {
    static saveState(navigationManager) {
        const state = navigationManager.getNavigationState();
        localStorage.setItem('navigation-state', JSON.stringify(state));
    }

    static loadState() {
        try {
            const stateData = localStorage.getItem('navigation-state');
            return stateData ? JSON.parse(stateData) : null;
        } catch (error) {
            console.warn('Failed to load navigation state:', error);
            return null;
        }
    }

    static clearState() {
        localStorage.removeItem('navigation-state');
    }
}

// Make enhanced classes available globally
if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
    window.EnhancedNavigationManager = EnhancedNavigationManager;
    window.NavigationStateManager = NavigationStateManager;
}