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

    async loadSuppliersConfig() {
        const contentDiv = document.getElementById('suppliers-content');
        if (!contentDiv) return;

        // Ottieni i suppliers usando i metodi esistenti del ConfigurationManager
        const globalSuppliers = this.configManager?.globalConfig?.suppliers || [];
        const currentProject = this.app.currentProject;
        const projectSuppliers = currentProject ? this.configManager.getSuppliers(currentProject.config) : [];

        contentDiv.innerHTML = `
        <div class="suppliers-config-container">
            <!-- Scope Selector -->
            <div class="suppliers-scope-selector">
                <div class="scope-tabs">
                    <button class="scope-tab active" data-scope="global">
                        <i class="fas fa-globe"></i> Global Suppliers
                        <span class="count">(${globalSuppliers.length})</span>
                    </button>
                    <button class="scope-tab ${!currentProject ? 'disabled' : ''}" data-scope="project" ${!currentProject ? 'disabled' : ''}>
                        <i class="fas fa-project-diagram"></i> Project Suppliers
                        <span class="count">(${projectSuppliers.length})</span>
                    </button>
                </div>
            </div>

            <!-- Global Suppliers Section -->
            <div id="global-suppliers-section" class="suppliers-scope-content active">
                <div class="suppliers-actions">
                    <button class="btn btn-primary" id="add-global-supplier">
                        <i class="fas fa-plus"></i> Add Global Supplier
                    </button>
                    <button class="btn btn-secondary" id="export-global-suppliers">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>

                <div class="suppliers-list">
                    ${this.renderSuppliersList(globalSuppliers, 'global')}
                </div>
            </div>

            <!-- Project Suppliers Section -->
            <div id="project-suppliers-section" class="suppliers-scope-content">
                ${currentProject ? `
                    <div class="suppliers-actions">
                        <button class="btn btn-primary" id="add-project-supplier">
                            <i class="fas fa-plus"></i> Add Project Supplier
                        </button>
                        <button class="btn btn-secondary" id="copy-suppliers-from-global">
                            <i class="fas fa-copy"></i> Copy from Global
                        </button>
                    </div>

                    <div class="suppliers-list">
                        ${this.renderSuppliersList(projectSuppliers, 'project')}
                    </div>
                ` : `
                    <div class="no-project-message">
                        <i class="fas fa-info-circle"></i>
                        <h4>No Project Loaded</h4>
                        <p>Load or create a project to manage project-specific suppliers</p>
                    </div>
                `}
            </div>
        </div>

        <!-- Supplier Modal -->
        <div id="supplier-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="supplier-modal-title">Add Supplier</h3>
                    <button class="modal-close" onclick="closeSuppliersModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="supplier-form">
                        <div class="form-group">
                            <label for="supplier-name">Supplier Name:</label>
                            <input type="text" id="supplier-name" name="name" required maxlength="100" 
                                   placeholder="Enter supplier company name">
                        </div>
                        <div class="form-group">
                            <label for="supplier-real-rate">Real Rate (€/day):</label>
                            <input type="number" id="supplier-real-rate" name="realRate" min="0" step="0.01" required
                                   placeholder="Actual daily rate">
                        </div>
                        <div class="form-group">
                            <label for="supplier-official-rate">Official Rate (€/day):</label>
                            <input type="number" id="supplier-official-rate" name="officialRate" min="0" step="0.01" required
                                   placeholder="Official/invoiced daily rate">
                        </div>
                        <div class="form-group">
                            <label for="supplier-status">Status:</label>
                            <select id="supplier-status" name="status" required>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="supplier-notes">Notes (Optional):</label>
                            <textarea id="supplier-notes" name="notes" rows="3" maxlength="500" 
                                      placeholder="Additional notes about this supplier"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeSuppliersModal()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveSuppliersModal()">Save Supplier</button>
                </div>
            </div>
        </div>
    `;

        // Setup event listeners dopo aver creato il DOM
        this.setupSuppliersEventListeners();
    }

// Aggiungi questo metodo per renderizzare la lista suppliers
    renderSuppliersList(suppliers, scope) {
        if (!suppliers || suppliers.length === 0) {
            return `
            <div class="empty-suppliers-state">
                <i class="fas fa-users"></i>
                <h4>No suppliers configured</h4>
                <p>Add suppliers to get started with project estimation</p>
            </div>
        `;
        }

        return `
        <div class="suppliers-grid">
            ${suppliers.map(supplier => `
                <div class="supplier-card" data-supplier-id="${supplier.id}" data-scope="${scope}">
                    <div class="supplier-header">
                        <h4>${this.escapeHtml(supplier.name)}</h4>
                        <div class="supplier-status ${supplier.status || 'active'}">
                            ${supplier.status === 'inactive' ? 'Inactive' : 'Active'}
                        </div>
                    </div>
                    <div class="supplier-details">
                        <div class="rate-info">
                            <div class="rate-item">
                                <span class="rate-label">Real Rate:</span>
                                <span class="rate-value">€${supplier.realRate}/day</span>
                            </div>
                            <div class="rate-item">
                                <span class="rate-label">Official Rate:</span>
                                <span class="rate-value">€${supplier.officialRate}/day</span>
                            </div>
                        </div>
                        ${supplier.notes ? `
                            <div class="supplier-notes">
                                <strong>Notes:</strong> ${this.escapeHtml(supplier.notes)}
                            </div>
                        ` : ''}
                        ${supplier.isProjectSpecific ? `
                            <div class="supplier-badge project-specific">Project Specific</div>
                        ` : supplier.isOverridden ? `
                            <div class="supplier-badge overridden">Modified</div>
                        ` : ''}
                    </div>
                    <div class="supplier-actions">
                        <button class="btn btn-small btn-secondary" onclick="editSupplier('${supplier.id}', '${scope}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        ${scope === 'global' || supplier.isProjectSpecific ? `
                            <button class="btn btn-small btn-danger" onclick="deleteSupplier('${supplier.id}', '${scope}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : `
                            <button class="btn btn-small btn-warning" onclick="disableSupplier('${supplier.id}')">
                                <i class="fas fa-ban"></i> Disable
                            </button>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    }

// Aggiungi questo metodo per gestire gli event listeners
    setupSuppliersEventListeners() {
        // Scope tabs switching
        document.querySelectorAll('.suppliers-config-container .scope-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (tab.disabled) return;

                const scope = tab.dataset.scope;

                // Update active tab
                document.querySelectorAll('.suppliers-config-container .scope-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update content sections
                document.querySelectorAll('.suppliers-scope-content').forEach(section => {
                    section.classList.remove('active');
                });
                document.getElementById(`${scope}-suppliers-section`).classList.add('active');
            });
        });

        // Add supplier buttons
        document.getElementById('add-global-supplier')?.addEventListener('click', () => {
            showSuppliersModal('global');
        });

        document.getElementById('add-project-supplier')?.addEventListener('click', () => {
            showSuppliersModal('project');
        });

        // Copy from global button
        document.getElementById('copy-suppliers-from-global')?.addEventListener('click', () => {
            this.copyGlobalSuppliersToProject();
        });

        // Export button
        document.getElementById('export-global-suppliers')?.addEventListener('click', () => {
            this.exportGlobalSuppliers();
        });
    }

// Escape HTML helper
    escapeHtml(text) {
        if (typeof Helpers !== 'undefined' && Helpers.escapeHtml) {
            return Helpers.escapeHtml(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

// Metodo per copiare suppliers globali al progetto corrente
    async copyGlobalSuppliersToProject() {
        try {
            if (!this.app.currentProject || !this.configManager) {
                NotificationManager.warning('No project loaded or configuration manager not available');
                return;
            }

            const globalSuppliers = this.configManager.globalConfig?.suppliers || [];
            if (globalSuppliers.length === 0) {
                NotificationManager.info('No global suppliers to copy');
                return;
            }

            let copiedCount = 0;
            for (const supplier of globalSuppliers) {
                // Crea una copia come supplier specifico del progetto
                const projectSupplier = {
                    ...supplier,
                    id: this.generateId('supplier_proj_'),
                    isProjectSpecific: true,
                    isGlobal: false
                };

                // Usa il metodo esistente del ConfigurationManager
                this.configManager.addSupplierToProject(this.app.currentProject.config, projectSupplier);
                copiedCount++;
            }

            this.app.markDirty();
            await this.loadSuppliersConfig(); // Ricarica la sezione
            this.app.refreshDropdowns(); // Aggiorna i dropdown

            NotificationManager.success(`Copied ${copiedCount} suppliers from global configuration`);
        } catch (error) {
            console.error('Failed to copy suppliers from global:', error);
            NotificationManager.error('Failed to copy suppliers from global configuration');
        }
    }

// Metodo per esportare suppliers globali
    exportGlobalSuppliers() {
        try {
            const globalSuppliers = this.configManager?.globalConfig?.suppliers || [];

            if (globalSuppliers.length === 0) {
                NotificationManager.info('No global suppliers to export');
                return;
            }

            const exportData = {
                metadata: {
                    type: 'suppliers',
                    version: '1.0.0',
                    exportDate: new Date().toISOString(),
                    count: globalSuppliers.length
                },
                suppliers: globalSuppliers
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const filename = `suppliers-export-${new Date().toISOString().split('T')[0]}.json`;

            // Usa il metodo helper se disponibile
            if (typeof Helpers !== 'undefined' && Helpers.downloadAsFile) {
                Helpers.downloadAsFile(dataStr, filename, 'application/json');
            } else {
                // Fallback per download
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            NotificationManager.success('Global suppliers exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            NotificationManager.error('Failed to export suppliers');
        }
    }

// Genera ID univoco
    generateId(prefix = 'supplier_') {
        return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async loadResourcesConfig() {
        const contentDiv = document.getElementById('resources-content');
        if (!contentDiv) return;

        // Ottieni le risorse interne usando i metodi esistenti del ConfigurationManager
        const globalResources = this.configManager?.globalConfig?.internalResources || [];
        const currentProject = this.app.currentProject;
        const projectResources = currentProject ? this.configManager.getInternalResources(currentProject.config) : [];

        contentDiv.innerHTML = `
        <div class="resources-config-container">
            <!-- Scope Selector -->
            <div class="resources-scope-selector">
                <div class="scope-tabs">
                    <button class="scope-tab active" data-scope="global">
                        <i class="fas fa-globe"></i> Global Resources
                        <span class="count">(${globalResources.length})</span>
                    </button>
                    <button class="scope-tab ${!currentProject ? 'disabled' : ''}" data-scope="project" ${!currentProject ? 'disabled' : ''}>
                        <i class="fas fa-project-diagram"></i> Project Resources
                        <span class="count">(${projectResources.length})</span>
                    </button>
                </div>
            </div>

            <!-- Global Resources Section -->
            <div id="global-resources-section" class="resources-scope-content active">
                <div class="resources-actions">
                    <button class="btn btn-primary" id="add-global-resource">
                        <i class="fas fa-plus"></i> Add Global Resource
                    </button>
                    <button class="btn btn-secondary" id="export-global-resources">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>

                <div class="resources-list">
                    ${this.renderResourcesList(globalResources, 'global')}
                </div>
            </div>

            <!-- Project Resources Section -->
            <div id="project-resources-section" class="resources-scope-content">
                ${currentProject ? `
                    <div class="resources-actions">
                        <button class="btn btn-primary" id="add-project-resource">
                            <i class="fas fa-plus"></i> Add Project Resource
                        </button>
                        <button class="btn btn-secondary" id="copy-resources-from-global">
                            <i class="fas fa-copy"></i> Copy from Global
                        </button>
                    </div>

                    <div class="resources-list">
                        ${this.renderResourcesList(projectResources, 'project')}
                    </div>
                ` : `
                    <div class="no-project-message">
                        <i class="fas fa-info-circle"></i>
                        <h4>No Project Loaded</h4>
                        <p>Load or create a project to manage project-specific resources</p>
                    </div>
                `}
            </div>
        </div>

        <!-- Resource Modal -->
        <div id="resource-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="resource-modal-title">Add Internal Resource</h3>
                    <button class="modal-close" onclick="closeResourcesModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="resource-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="resource-name">Resource Name:</label>
                                <input type="text" id="resource-name" name="name" required maxlength="100" 
                                       placeholder="e.g., John Doe">
                            </div>
                            <div class="form-group">
                                <label for="resource-role">Role:</label>
                                <input type="text" id="resource-role" name="role" required maxlength="100"
                                       placeholder="e.g., Senior Developer">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="resource-department">Department:</label>
                                <select id="resource-department" name="department" required>
                                    <option value="">Select Department</option>
                                    <option value="IT">IT</option>
                                    <option value="Development">Development</option>
                                    <option value="QA">QA</option>
                                    <option value="DevOps">DevOps</option>
                                    <option value="Business Analysis">Business Analysis</option>
                                    <option value="Project Management">Project Management</option>
                                    <option value="Security">Security</option>
                                    <option value="Architecture">Architecture</option>
                                    <option value="UX/UI Design">UX/UI Design</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="resource-status">Status:</label>
                                <select id="resource-status" name="status" required>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="on-leave">On Leave</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="resource-real-rate">Real Rate (€/day):</label>
                                <input type="number" id="resource-real-rate" name="realRate" min="0" step="0.01" required
                                       placeholder="e.g., 350.00">
                            </div>
                            <div class="form-group">
                                <label for="resource-official-rate">Official Rate (€/day):</label>
                                <input type="number" id="resource-official-rate" name="officialRate" min="0" step="0.01" required
                                       placeholder="e.g., 400.00">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="resource-skills">Skills & Technologies:</label>
                            <textarea id="resource-skills" name="skills" rows="2" maxlength="500" 
                                      placeholder="e.g., Java, React, Spring Boot, Docker, AWS"></textarea>
                            <small class="form-help">List main skills and technologies (optional)</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="resource-notes">Notes:</label>
                            <textarea id="resource-notes" name="notes" rows="3" maxlength="500" 
                                      placeholder="Additional notes about this resource"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeResourcesModal()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveResourcesModal()">Save Resource</button>
                </div>
            </div>
        </div>
    `;

        // Setup event listeners dopo aver creato il DOM
        this.setupResourcesEventListeners();
    }

// Aggiungi questo metodo per renderizzare la lista resources
    renderResourcesList(resources, scope) {
        if (!resources || resources.length === 0) {
            return `
            <div class="empty-resources-state">
                <i class="fas fa-user-friends"></i>
                <h4>No internal resources configured</h4>
                <p>Add internal team members to track their utilization and costs</p>
            </div>
        `;
        }

        return `
        <div class="resources-grid">
            ${resources.map(resource => `
                <div class="resource-card" data-resource-id="${resource.id}" data-scope="${scope}">
                    <div class="resource-header">
                        <div class="resource-title">
                            <h4>${this.escapeHtml(resource.name)}</h4>
                            <span class="resource-role">${this.escapeHtml(resource.role)}</span>
                        </div>
                        <div class="resource-status ${resource.status || 'active'}">
                            ${this.getResourceStatusDisplay(resource.status)}
                        </div>
                    </div>
                    
                    <div class="resource-details">
                        <div class="detail-section">
                            <div class="detail-item">
                                <span class="detail-label">Department:</span>
                                <span class="detail-value">${this.escapeHtml(resource.department)}</span>
                            </div>
                        </div>
                        
                        <div class="rate-section">
                            <div class="rate-item">
                                <span class="rate-label">Real Rate:</span>
                                <span class="rate-value">€${resource.realRate}/day</span>
                            </div>
                            <div class="rate-item">
                                <span class="rate-label">Official Rate:</span>
                                <span class="rate-value">€${resource.officialRate}/day</span>
                            </div>
                        </div>
                        
                        ${resource.skills ? `
                            <div class="skills-section">
                                <span class="skills-label">Skills:</span>
                                <div class="skills-tags">
                                    ${resource.skills.split(',').map(skill =>
            `<span class="skill-tag">${this.escapeHtml(skill.trim())}</span>`
        ).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${resource.notes ? `
                            <div class="resource-notes">
                                <strong>Notes:</strong> ${this.escapeHtml(resource.notes)}
                            </div>
                        ` : ''}
                        
                        ${resource.isProjectSpecific ? `
                            <div class="resource-badge project-specific">Project Specific</div>
                        ` : resource.isOverridden ? `
                            <div class="resource-badge overridden">Modified</div>
                        ` : ''}
                    </div>
                    
                    <div class="resource-actions">
                        <button class="btn btn-small btn-secondary" onclick="editResource('${resource.id}', '${scope}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        ${scope === 'global' || resource.isProjectSpecific ? `
                            <button class="btn btn-small btn-danger" onclick="deleteResource('${resource.id}', '${scope}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : `
                            <button class="btn btn-small btn-warning" onclick="disableResource('${resource.id}')">
                                <i class="fas fa-ban"></i> Disable
                            </button>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    }

// Metodo helper per il display dello status
    getResourceStatusDisplay(status) {
        const statusMap = {
            'active': 'Active',
            'inactive': 'Inactive',
            'on-leave': 'On Leave'
        };
        return statusMap[status] || 'Active';
    }

// Aggiungi questo metodo per gestire gli event listeners
    setupResourcesEventListeners() {
        // Scope tabs switching
        document.querySelectorAll('.resources-config-container .scope-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (tab.disabled) return;

                const scope = tab.dataset.scope;

                // Update active tab
                document.querySelectorAll('.resources-config-container .scope-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update content sections
                document.querySelectorAll('.resources-scope-content').forEach(section => {
                    section.classList.remove('active');
                });
                document.getElementById(`${scope}-resources-section`).classList.add('active');
            });
        });

        // Add resource buttons
        document.getElementById('add-global-resource')?.addEventListener('click', () => {
            showResourcesModal('global');
        });

        document.getElementById('add-project-resource')?.addEventListener('click', () => {
            showResourcesModal('project');
        });

        // Copy from global button
        document.getElementById('copy-resources-from-global')?.addEventListener('click', () => {
            this.copyGlobalResourcesToProject();
        });

        // Export button
        document.getElementById('export-global-resources')?.addEventListener('click', () => {
            this.exportGlobalResources();
        });
    }

// Metodo per copiare resources globali al progetto corrente
    async copyGlobalResourcesToProject() {
        try {
            if (!this.app.currentProject || !this.configManager) {
                NotificationManager.warning('No project loaded or configuration manager not available');
                return;
            }

            const globalResources = this.configManager.globalConfig?.internalResources || [];
            if (globalResources.length === 0) {
                NotificationManager.info('No global resources to copy');
                return;
            }

            let copiedCount = 0;
            for (const resource of globalResources) {
                // Crea una copia come resource specifico del progetto
                const projectResource = {
                    ...resource,
                    id: this.generateId('resource_proj_'),
                    isProjectSpecific: true,
                    isGlobal: false
                };

                // Usa il metodo esistente del ConfigurationManager
                this.configManager.addInternalResourceToProject(this.app.currentProject.config, projectResource);
                copiedCount++;
            }

            this.app.markDirty();
            await this.loadResourcesConfig(); // Ricarica la sezione
            this.app.refreshDropdowns(); // Aggiorna i dropdown

            NotificationManager.success(`Copied ${copiedCount} resources from global configuration`);
        } catch (error) {
            console.error('Failed to copy resources from global:', error);
            NotificationManager.error('Failed to copy resources from global configuration');
        }
    }

// Metodo per esportare resources globali
    exportGlobalResources() {
        try {
            const globalResources = this.configManager?.globalConfig?.internalResources || [];

            if (globalResources.length === 0) {
                NotificationManager.info('No global resources to export');
                return;
            }

            const exportData = {
                metadata: {
                    type: 'internalResources',
                    version: '1.0.0',
                    exportDate: new Date().toISOString(),
                    count: globalResources.length
                },
                internalResources: globalResources
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const filename = `internal-resources-export-${new Date().toISOString().split('T')[0]}.json`;

            // Usa il metodo helper se disponibile
            if (typeof Helpers !== 'undefined' && Helpers.downloadAsFile) {
                Helpers.downloadAsFile(dataStr, filename, 'application/json');
            } else {
                // Fallback per download
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            NotificationManager.success('Global internal resources exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            NotificationManager.error('Failed to export resources');
        }
    }



}

// Funzioni globali per gestire il modal (da chiamare dall'HTML)
window.showResourcesModal = function(scope, resource = null) {
    const modal = document.getElementById('resource-modal');
    const title = document.getElementById('resource-modal-title');
    const form = document.getElementById('resource-form');

    if (!modal || !title || !form) return;

    title.textContent = resource ? 'Edit Internal Resource' : 'Add Internal Resource';

    if (resource) {
        // Popola il form con i dati esistenti
        document.getElementById('resource-name').value = resource.name || '';
        document.getElementById('resource-role').value = resource.role || '';
        document.getElementById('resource-department').value = resource.department || '';
        document.getElementById('resource-real-rate').value = resource.realRate || '';
        document.getElementById('resource-official-rate').value = resource.officialRate || '';
        document.getElementById('resource-status').value = resource.status || 'active';
        document.getElementById('resource-skills').value = resource.skills || '';
        document.getElementById('resource-notes').value = resource.notes || '';
    } else {
        // Reset form per nuovo resource
        form.reset();
    }

    // Salva i dati nel modal per uso successivo
    modal.dataset.scope = scope;
    modal.dataset.resourceId = resource?.id || '';

    modal.classList.add('active');

    // Focus sul primo campo
    setTimeout(() => {
        document.getElementById('resource-name')?.focus();
    }, 100);
};

window.closeResourcesModal = function() {
    const modal = document.getElementById('resource-modal');
    if (modal) {
        modal.classList.remove('active');
    }
};

window.saveResourcesModal = function() {
    const modal = document.getElementById('resource-modal');
    const scope = modal.dataset.scope;
    const resourceId = modal.dataset.resourceId;
    const form = document.getElementById('resource-form');

    if (!form || !window.app?.configManager) return;

    const formData = new FormData(form);
    const resourceData = {
        id: resourceId || window.app.navigationManager.generateId('resource_'),
        name: formData.get('name').trim(),
        role: formData.get('role').trim(),
        department: formData.get('department'),
        realRate: parseFloat(formData.get('realRate')) || 0,
        officialRate: parseFloat(formData.get('officialRate')) || 0,
        status: formData.get('status'),
        skills: formData.get('skills').trim(),
        notes: formData.get('notes').trim(),
        isGlobal: scope === 'global'
    };

    // Validazione base
    if (!resourceData.name) {
        NotificationManager.error('Resource name is required');
        return;
    }
    if (!resourceData.role) {
        NotificationManager.error('Role is required');
        return;
    }
    if (!resourceData.department) {
        NotificationManager.error('Department is required');
        return;
    }
    if (resourceData.realRate <= 0 || resourceData.officialRate <= 0) {
        NotificationManager.error('Rates must be greater than 0');
        return;
    }

    try {
        if (scope === 'global') {
            // Usa i metodi esistenti per gestire global config
            if (resourceId) {
                // Modifica resource esistente
                const index = window.app.configManager.globalConfig.internalResources.findIndex(r => r.id === resourceId);
                if (index >= 0) {
                    window.app.configManager.globalConfig.internalResources[index] = resourceData;
                }
            } else {
                // Aggiungi nuovo resource
                window.app.configManager.globalConfig.internalResources.push(resourceData);
            }
            window.app.configManager.saveGlobalConfig();
        } else {
            // Usa il metodo esistente addInternalResourceToProject del ConfigurationManager
            window.app.configManager.addInternalResourceToProject(window.app.currentProject.config, resourceData);
            window.app.markDirty();
        }

        closeResourcesModal();

        // Ricarica la sezione resources
        window.app.navigationManager.loadResourcesConfig();

        // Refresh dropdowns
        window.app.refreshDropdowns();

        NotificationManager.success('Internal resource saved successfully');
    } catch (error) {
        console.error('Failed to save resource:', error);
        NotificationManager.error('Failed to save internal resource');
    }
};

window.editResource = function(resourceId, scope) {
    let resource;

    if (scope === 'global') {
        resource = window.app.configManager.globalConfig.internalResources.find(r => r.id === resourceId);
    } else {
        const projectResources = window.app.configManager.getInternalResources(window.app.currentProject.config);
        resource = projectResources.find(r => r.id === resourceId);
    }

    if (resource) {
        showResourcesModal(scope, resource);
    }
};

window.deleteResource = function(resourceId, scope) {
    if (!confirm('Are you sure you want to delete this internal resource?')) return;

    try {
        if (scope === 'global') {
            window.app.configManager.globalConfig.internalResources =
                window.app.configManager.globalConfig.internalResources.filter(r => r.id !== resourceId);
            window.app.configManager.saveGlobalConfig();
        } else {
            // Usa il metodo esistente deleteInternalResourceFromProject
            window.app.configManager.deleteInternalResourceFromProject(window.app.currentProject.config, resourceId);
            window.app.markDirty();
        }

        // Ricarica la sezione
        window.app.navigationManager.loadResourcesConfig();
        window.app.refreshDropdowns();

        NotificationManager.success('Internal resource deleted successfully');
    } catch (error) {
        console.error('Failed to delete resource:', error);
        NotificationManager.error('Failed to delete internal resource');
    }
};

window.disableResource = function(resourceId) {
    try {
        if (!window.app.currentProject) return;

        // Usa la logica esistente per disabilitare resource per il progetto
        if (!window.app.currentProject.config.projectOverrides) {
            window.app.currentProject.config.projectOverrides = {
                suppliers: [], internalResources: [], categories: [], calculationParams: {}
            };
        }

        const existingOverride = window.app.currentProject.config.projectOverrides.internalResources.find(r => r.id === resourceId);
        if (existingOverride) {
            existingOverride.status = 'inactive';
        } else {
            window.app.currentProject.config.projectOverrides.internalResources.push({
                id: resourceId,
                status: 'inactive'
            });
        }

        window.app.markDirty();
        window.app.navigationManager.loadResourcesConfig();
        window.app.refreshDropdowns();

        NotificationManager.success('Internal resource disabled for this project');
    } catch (error) {
        console.error('Failed to disable resource:', error);
        NotificationManager.error('Failed to disable internal resource');
    }
};

// Funzioni globali per gestire il modal (da chiamare dall'HTML)
window.showSuppliersModal = function(scope, supplier = null) {
    const modal = document.getElementById('supplier-modal');
    const title = document.getElementById('supplier-modal-title');
    const form = document.getElementById('supplier-form');

    if (!modal || !title || !form) return;

    title.textContent = supplier ? 'Edit Supplier' : 'Add Supplier';

    if (supplier) {
        // Popola il form con i dati esistenti
        document.getElementById('supplier-name').value = supplier.name || '';
        document.getElementById('supplier-real-rate').value = supplier.realRate || '';
        document.getElementById('supplier-official-rate').value = supplier.officialRate || '';
        document.getElementById('supplier-status').value = supplier.status || 'active';
        document.getElementById('supplier-notes').value = supplier.notes || '';
    } else {
        // Reset form per nuovo supplier
        form.reset();
    }

    // Salva i dati nel modal per uso successivo
    modal.dataset.scope = scope;
    modal.dataset.supplierId = supplier?.id || '';

    modal.classList.add('active');

    // Focus sul primo campo
    setTimeout(() => {
        document.getElementById('supplier-name')?.focus();
    }, 100);
};

window.closeSuppliersModal = function() {
    const modal = document.getElementById('supplier-modal');
    if (modal) {
        modal.classList.remove('active');
    }
};

window.saveSuppliersModal = function() {
    const modal = document.getElementById('supplier-modal');
    const scope = modal.dataset.scope;
    const supplierId = modal.dataset.supplierId;
    const form = document.getElementById('supplier-form');

    if (!form || !window.app?.configManager) return;

    const formData = new FormData(form);
    const supplierData = {
        id: supplierId || window.app.navigationManager.generateId('supplier_'),
        name: formData.get('name').trim(),
        realRate: parseFloat(formData.get('realRate')) || 0,
        officialRate: parseFloat(formData.get('officialRate')) || 0,
        status: formData.get('status'),
        notes: formData.get('notes').trim(),
        isGlobal: scope === 'global'
    };

    // Validazione base
    if (!supplierData.name) {
        NotificationManager.error('Supplier name is required');
        return;
    }
    if (supplierData.realRate <= 0 || supplierData.officialRate <= 0) {
        NotificationManager.error('Rates must be greater than 0');
        return;
    }

    try {
        if (scope === 'global') {
            // Usa i metodi esistenti per gestire global config
            if (supplierId) {
                // Modifica supplier esistente
                const index = window.app.configManager.globalConfig.suppliers.findIndex(s => s.id === supplierId);
                if (index >= 0) {
                    window.app.configManager.globalConfig.suppliers[index] = supplierData;
                }
            } else {
                // Aggiungi nuovo supplier
                window.app.configManager.globalConfig.suppliers.push(supplierData);
            }
            window.app.configManager.saveGlobalConfig();
        } else {
            // Usa il metodo esistente addSupplierToProject del ConfigurationManager
            window.app.configManager.addSupplierToProject(window.app.currentProject.config, supplierData);
            window.app.markDirty();
        }

        closeSuppliersModal();

        // Ricarica la sezione suppliers
        window.app.navigationManager.loadSuppliersConfig();

        // Refresh dropdowns
        window.app.refreshDropdowns();

        NotificationManager.success('Supplier saved successfully');
    } catch (error) {
        console.error('Failed to save supplier:', error);
        NotificationManager.error('Failed to save supplier');
    }
};

window.editSupplier = function(supplierId, scope) {
    let supplier;

    if (scope === 'global') {
        supplier = window.app.configManager.globalConfig.suppliers.find(s => s.id === supplierId);
    } else {
        const projectSuppliers = window.app.configManager.getSuppliers(window.app.currentProject.config);
        supplier = projectSuppliers.find(s => s.id === supplierId);
    }

    if (supplier) {
        showSuppliersModal(scope, supplier);
    }
};

window.deleteSupplier = function(supplierId, scope) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
        if (scope === 'global') {
            window.app.configManager.globalConfig.suppliers =
                window.app.configManager.globalConfig.suppliers.filter(s => s.id !== supplierId);
            window.app.configManager.saveGlobalConfig();
        } else {
            // Usa il metodo esistente deleteSupplierFromProject
            window.app.configManager.deleteSupplierFromProject(window.app.currentProject.config, supplierId);
            window.app.markDirty();
        }

        // Ricarica la sezione
        window.app.navigationManager.loadSuppliersConfig();
        window.app.refreshDropdowns();

        NotificationManager.success('Supplier deleted successfully');
    } catch (error) {
        console.error('Failed to delete supplier:', error);
        NotificationManager.error('Failed to delete supplier');
    }
};

window.disableSupplier = function(supplierId) {
    try {
        if (!window.app.currentProject) return;

        // Usa la logica esistente per disabilitare supplier per il progetto
        if (!window.app.currentProject.config.projectOverrides) {
            window.app.currentProject.config.projectOverrides = {
                suppliers: [], internalResources: [], categories: [], calculationParams: {}
            };
        }

        const existingOverride = window.app.currentProject.config.projectOverrides.suppliers.find(s => s.id === supplierId);
        if (existingOverride) {
            existingOverride.status = 'inactive';
        } else {
            window.app.currentProject.config.projectOverrides.suppliers.push({
                id: supplierId,
                status: 'inactive'
            });
        }

        window.app.markDirty();
        window.app.navigationManager.loadSuppliersConfig();
        window.app.refreshDropdowns();

        NotificationManager.success('Supplier disabled for this project');
    } catch (error) {
        console.error('Failed to disable supplier:', error);
        NotificationManager.error('Failed to disable supplier');
    }
};

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