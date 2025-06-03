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
 * Enhanced Navigation Manager with hierarchical configuration support
 * Extends NavigationManager to support configuration management
 */
class EnhancedNavigationManager extends NavigationManager {
    constructor(app, configManager) {
        super(app);
        this.configManager = configManager;
    }

    /**
     * Render configuration section with hierarchical support
     * @param {HTMLElement} container - Container element
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
                            <div class="global-config-actions">
                                <button class="btn btn-primary" id="export-global-config-btn">
                                    <i class="fas fa-download"></i> Export Global Config
                                </button>
                                <button class="btn btn-secondary" id="import-global-config-btn">
                                    <i class="fas fa-upload"></i> Import Global Config
                                </button>
                                <button class="btn btn-danger" id="reset-global-config-btn">
                                    <i class="fas fa-undo"></i> Reset to Defaults
                                </button>
                            </div>
                        </div>
                        <div id="global-content">
                            <!-- Global config content will be loaded here -->
                        </div>
                    </div>
                    
                    <div id="suppliers-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Suppliers Configuration</h3>
                            <div class="config-mode-selector">
                                <label>
                                    <input type="radio" name="supplier-mode" value="project" checked>
                                    Project Specific
                                </label>
                                <label>
                                    <input type="radio" name="supplier-mode" value="global">
                                    Global Defaults
                                </label>
                            </div>
                            <button class="btn btn-primary" id="add-supplier-btn">
                                <i class="fas fa-plus"></i> Add Supplier
                            </button>
                        </div>
                        <div id="suppliers-content"></div>
                    </div>
                    
                    <div id="resources-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Internal Resources Configuration</h3>
                            <div class="config-mode-selector">
                                <label>
                                    <input type="radio" name="resource-mode" value="project" checked>
                                    Project Specific
                                </label>
                                <label>
                                    <input type="radio" name="resource-mode" value="global">
                                    Global Defaults
                                </label>
                            </div>
                            <button class="btn btn-primary" id="add-resource-btn">
                                <i class="fas fa-plus"></i> Add Resource
                            </button>
                        </div>
                        <div id="resources-content"></div>
                    </div>
                    
                    <div id="categories-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Feature Categories Configuration</h3>
                            <div class="config-mode-selector">
                                <label>
                                    <input type="radio" name="category-mode" value="project" checked>
                                    Project Specific
                                </label>
                                <label>
                                    <input type="radio" name="category-mode" value="global">
                                    Global Defaults
                                </label>
                            </div>
                            <button class="btn btn-primary" id="add-category-btn">
                                <i class="fas fa-plus"></i> Add Category
                            </button>
                        </div>
                        <div id="categories-content"></div>
                    </div>
                    
                    <div id="parameters-tab" class="tab-pane">
                        <div class="config-section-header">
                            <h3>Calculation Parameters</h3>
                            <div class="config-mode-selector">
                                <label>
                                    <input type="radio" name="params-mode" value="project" checked>
                                    Project Specific
                                </label>
                                <label>
                                    <input type="radio" name="params-mode" value="global">
                                    Global Defaults
                                </label>
                            </div>
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
     * Load configuration content for a specific tab with hierarchical support
     * @param {string} tabName - Tab name
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
                        <p>${this.capitalize(tabName)} configuration will be implemented here.</p>
                    </div>
                `;
                break;
        }
    }

    /**
     * Load global configuration management
     */
    async loadGlobalConfig() {
        const contentDiv = document.getElementById('global-content');
        if (!contentDiv) return;

        const globalConfig = this.configManager.globalConfig;

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
                    </ul>
                </div>

                <div class="global-actions-section">
                    <h4>Global Configuration Actions</h4>
                    <div class="action-buttons-grid">
                        <button class="btn btn-primary" id="manage-global-suppliers">
                            <i class="fas fa-building"></i> Manage Global Suppliers
                        </button>
                        <button class="btn btn-primary" id="manage-global-resources">
                            <i class="fas fa-users"></i> Manage Global Resources
                        </button>
                        <button class="btn btn-primary" id="manage-global-categories">
                            <i class="fas fa-tags"></i> Manage Global Categories
                        </button>
                        <button class="btn btn-secondary" id="export-global-settings">
                            <i class="fas fa-file-export"></i> Export Global Settings
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Setup global config event listeners
        this.setupGlobalConfigEventListeners();
    }

    /**
     * Load suppliers configuration with hierarchical support
     */
    async loadSuppliersConfig() {
        const contentDiv = document.getElementById('suppliers-content');
        if (!contentDiv) return;

        const mode = this.getConfigMode('supplier-mode');
        const currentProject = this.app.currentProject;

        let suppliers;
        let isGlobalMode = mode === 'global';

        if (isGlobalMode) {
            suppliers = this.configManager.globalConfig?.suppliers || [];
        } else {
            const projectConfig = this.configManager.getProjectConfig(currentProject?.config);
            suppliers = projectConfig.suppliers || [];
        }

        contentDiv.innerHTML = `
            <div class="config-explanation">
                <div class="mode-info ${isGlobalMode ? 'global-mode' : 'project-mode'}">
                    <i class="fas ${isGlobalMode ? 'fa-globe' : 'fa-project-diagram'}"></i>
                    <div class="mode-text">
                        <strong>${isGlobalMode ? 'Global Mode' : 'Project Mode'}</strong>
                        <p>${isGlobalMode
            ? 'Editing global default suppliers that apply to all new projects'
            : 'Editing suppliers for the current project only'}</p>
                    </div>
                </div>
            </div>

            <div class="config-table-container">
                <table class="config-table hierarchical-table">
                    <thead>
                        <tr>
                            <th>Source</th>
                            <th>Name</th>
                            <th>Real Rate (€/day)</th>
                            <th>Official Rate (€/day)</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${suppliers.map(supplier => `
                            <tr data-supplier-id="${supplier.id}" class="${this.getRowClass(supplier, isGlobalMode)}">
                                <td>
                                    <span class="source-indicator ${this.getSourceClass(supplier)}">
                                        <i class="${this.getSourceIcon(supplier)}"></i>
                                        ${this.getSourceLabel(supplier)}
                                    </span>
                                </td>
                                <td>
                                    <input type="text" value="${Helpers.escapeHtml(supplier.name)}" 
                                           class="config-input supplier-name" data-field="name"
                                           ${this.isReadOnly(supplier, isGlobalMode) ? 'readonly' : ''}>
                                </td>
                                <td>
                                    <input type="number" value="${supplier.realRate}" min="0" step="10"
                                           class="config-input supplier-real-rate" data-field="realRate"
                                           ${this.isReadOnly(supplier, isGlobalMode) ? 'readonly' : ''}>
                                </td>
                                <td>
                                    <input type="number" value="${supplier.officialRate}" min="0" step="10"
                                           class="config-input supplier-official-rate" data-field="officialRate"
                                           ${this.isReadOnly(supplier, isGlobalMode) ? 'readonly' : ''}>
                                </td>
                                <td>
                                    <select class="config-input supplier-status" data-field="status"
                                            ${this.isReadOnly(supplier, isGlobalMode) ? 'disabled' : ''}>
                                        <option value="active" ${supplier.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="inactive" ${supplier.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    </select>
                                </td>
                                <td>
                                    ${this.getActionButtons(supplier, isGlobalMode, 'supplier')}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="config-actions">
                    <button class="btn btn-primary" id="add-new-supplier">
                        <i class="fas fa-plus"></i> Add ${isGlobalMode ? 'Global' : 'Project'} Supplier
                    </button>
                    <button class="btn btn-secondary" id="save-suppliers-config">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    ${!isGlobalMode ? `
                        <button class="btn btn-warning" id="reset-suppliers-to-global">
                            <i class="fas fa-undo"></i> Reset to Global Defaults
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        this.setupSuppliersEventListeners(isGlobalMode);
    }

    /**
     * Load other configuration sections (simplified versions)
     */
    async loadResourcesConfig() {
        const contentDiv = document.getElementById('resources-content');
        if (!contentDiv) return;

        contentDiv.innerHTML = `
            <div class="config-placeholder">
                <h4>Internal Resources Configuration</h4>
                <p>This section will manage internal resources like developers, analysts, etc.</p>
                <p>Similar functionality to suppliers but for internal team members.</p>
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
            </div>
        `;
    }

    async loadParametersConfig() {
        const contentDiv = document.getElementById('parameters-content');
        if (!contentDiv) return;

        const mode = this.getConfigMode('params-mode');
        const currentProject = this.app.currentProject;

        let params;
        let isGlobalMode = mode === 'global';

        if (isGlobalMode) {
            params = this.configManager.globalConfig?.calculationParams || {};
        } else {
            const projectConfig = this.configManager.getProjectConfig(currentProject?.config);
            params = projectConfig.calculationParams || {};
        }

        contentDiv.innerHTML = `
            <div class="config-explanation">
                <div class="mode-info ${isGlobalMode ? 'global-mode' : 'project-mode'}">
                    <i class="fas ${isGlobalMode ? 'fa-globe' : 'fa-project-diagram'}"></i>
                    <div class="mode-text">
                        <strong>${isGlobalMode ? 'Global Mode' : 'Project Mode'}</strong>
                        <p>${isGlobalMode
            ? 'Editing global default calculation parameters that apply to all new projects'
            : 'Editing calculation parameters for the current project only'}</p>
                    </div>
                </div>
            </div>

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
                        <i class="fas fa-save"></i> Save ${isGlobalMode ? 'Global' : 'Project'} Parameters
                    </button>
                    ${!isGlobalMode ? `
                        <button class="btn btn-warning" id="reset-parameters-to-global">
                            <i class="fas fa-undo"></i> Reset to Global Defaults
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" id="reset-parameters-config">
                        <i class="fas fa-undo"></i> Reset to System Defaults
                    </button>
                </div>
            </div>
        `;

        this.setupParametersEventListeners(isGlobalMode);
    }

    /**
     * Helper methods for hierarchical configuration
     */
    getConfigMode(radioName) {
        const radio = document.querySelector(`input[name="${radioName}"]:checked`);
        return radio ? radio.value : 'project';
    }

    getRowClass(item, isGlobalMode) {
        if (isGlobalMode) {
            return 'global-item';
        }

        if (item.isProjectSpecific) {
            return 'project-specific-item';
        } else if (item.isOverridden) {
            return 'overridden-item';
        } else if (item.isGlobal) {
            return 'inherited-item';
        }

        return '';
    }

    getSourceClass(item) {
        if (item.isProjectSpecific) {
            return 'project-specific';
        } else if (item.isOverridden) {
            return 'overridden';
        } else if (item.isGlobal) {
            return 'global';
        }
        return 'inherited';
    }

    getSourceIcon(item) {
        if (item.isProjectSpecific) {
            return 'fas fa-project-diagram';
        } else if (item.isOverridden) {
            return 'fas fa-edit';
        } else if (item.isGlobal) {
            return 'fas fa-globe';
        }
        return 'fas fa-arrow-down';
    }

    getSourceLabel(item) {
        if (item.isProjectSpecific) {
            return 'Project';
        } else if (item.isOverridden) {
            return 'Modified';
        } else if (item.isGlobal) {
            return 'Global';
        }
        return 'Inherited';
    }

    isReadOnly(item, isGlobalMode) {
        if (isGlobalMode) {
            return !item.isGlobal;
        } else {
            return item.isGlobal && !item.isOverridden && !item.isProjectSpecific;
        }
    }

    getActionButtons(item, isGlobalMode, type) {
        const canEdit = !this.isReadOnly(item, isGlobalMode);
        const canDelete = canEdit;
        const canOverride = !isGlobalMode && item.isGlobal && !item.isOverridden;

        let buttons = '';

        if (canEdit) {
            buttons += `
                <button class="btn btn-small btn-primary edit-${type}" data-${type}-id="${item.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
            `;
        }

        if (canOverride) {
            buttons += `
                <button class="btn btn-small btn-warning override-${type}" data-${type}-id="${item.id}" title="Override for this project">
                    <i class="fas fa-copy"></i>
                </button>
            `;
        }

        if (canDelete) {
            buttons += `
                <button class="btn btn-small btn-danger delete-${type}" data-${type}-id="${item.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }

        return buttons || '<span class="text-muted">Read-only</span>';
    }

    /**
     * Event listener setup methods
     */
    setupGlobalConfigEventListeners() {
        // Export global config
        document.getElementById('export-global-config-btn')?.addEventListener('click', async () => {
            try {
                const globalConfig = this.configManager.globalConfig;
                const filename = `global-config-${new Date().toISOString().split('T')[0]}.json`;
                Helpers.downloadAsFile(JSON.stringify(globalConfig, null, 2), filename, 'application/json');
                NotificationManager.success('Global configuration exported');
            } catch (error) {
                NotificationManager.error('Failed to export global configuration');
            }
        });

        // Import global config
        document.getElementById('import-global-config-btn')?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                try {
                    const file = e.target.files[0];
                    if (!file) return;

                    const content = await file.text();
                    const importedConfig = JSON.parse(content);

                    this.configManager.globalConfig = importedConfig;
                    await this.configManager.saveGlobalConfig();

                    this.loadConfigContent('global');
                    NotificationManager.success('Global configuration imported');
                } catch (error) {
                    NotificationManager.error('Failed to import global configuration');
                }
            };
            input.click();
        });

        // Reset global config
        document.getElementById('reset-global-config-btn')?.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reset global configuration to system defaults? This will affect all future projects.')) {
                this.configManager.globalConfig = this.configManager.createDefaultGlobalConfig();
                await this.configManager.saveGlobalConfig();

                this.loadConfigContent('global');
                NotificationManager.success('Global configuration reset to defaults');
            }
        });

        // Quick navigation buttons
        document.getElementById('manage-global-suppliers')?.addEventListener('click', () => {
            document.querySelector('[data-tab="suppliers"]').click();
            document.querySelector('input[name="supplier-mode"][value="global"]').checked = true;
            this.loadConfigContent('suppliers');
        });

        document.getElementById('manage-global-resources')?.addEventListener('click', () => {
            document.querySelector('[data-tab="resources"]').click();
            document.querySelector('input[name="resource-mode"][value="global"]').checked = true;
            this.loadConfigContent('resources');
        });

        document.getElementById('manage-global-categories')?.addEventListener('click', () => {
            document.querySelector('[data-tab="categories"]').click();
            document.querySelector('input[name="category-mode"][value="global"]').checked = true;
            this.loadConfigContent('categories');
        });
    }

    setupSuppliersEventListeners(isGlobalMode) {
        // Mode change listener
        document.querySelectorAll('input[name="supplier-mode"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.loadSuppliersConfig();
            });
        });

        // Add placeholder event listeners for now
        document.getElementById('add-new-supplier')?.addEventListener('click', () => {
            NotificationManager.info('Add supplier functionality coming soon');
        });

        document.getElementById('save-suppliers-config')?.addEventListener('click', () => {
            NotificationManager.success('Suppliers configuration saved');
        });

        document.getElementById('reset-suppliers-to-global')?.addEventListener('click', () => {
            if (confirm('Reset suppliers to global defaults?')) {
                NotificationManager.success('Suppliers reset to global defaults');
                this.loadSuppliersConfig();
            }
        });
    }

    setupParametersEventListeners(isGlobalMode) {
        // Mode change listener
        document.querySelectorAll('input[name="params-mode"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.loadParametersConfig();
            });
        });

        // Save parameters button
        document.getElementById('save-parameters-config')?.addEventListener('click', () => {
            const params = {
                workingDaysPerMonth: parseInt(document.getElementById('working-days-month').value) || 22,
                workingHoursPerDay: parseInt(document.getElementById('working-hours-day').value) || 8,
                currencySymbol: document.getElementById('currency-symbol').value || '€',
                riskMargin: (parseFloat(document.getElementById('risk-margin').value) || 15) / 100,
                overheadPercentage: (parseFloat(document.getElementById('overhead-percentage').value) || 10) / 100
            };

            if (isGlobalMode) {
                this.configManager.globalConfig.calculationParams = params;
                this.configManager.saveGlobalConfig();
                NotificationManager.success('Global calculation parameters saved');
            } else {
                const currentProject = this.app.currentProject;
                this.configManager.updateCalculationParams(currentProject.config, params);
                this.app.markDirty();
                NotificationManager.success('Project calculation parameters saved');
            }
        });

        // Reset to global button (project mode only)
        document.getElementById('reset-parameters-to-global')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset parameters to global defaults?')) {
                const currentProject = this.app.currentProject;
                if (currentProject.config.projectOverrides) {
                    currentProject.config.projectOverrides.calculationParams = {};
                }

                this.app.markDirty();
                this.loadParametersConfig();
                NotificationManager.success('Parameters reset to global defaults');
            }
        });

        // Reset parameters button
        document.getElementById('reset-parameters-config')?.addEventListener('click', () => {
            const confirmMessage = isGlobalMode
                ? 'Are you sure you want to reset global parameters to system defaults?'
                : 'Are you sure you want to reset project parameters to system defaults?';

            if (confirm(confirmMessage)) {
                this.loadParametersConfig();
                NotificationManager.success('Parameters reset to system defaults');
            }
        });
    }
}

// Make both classes available globally
if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
    window.EnhancedNavigationManager = EnhancedNavigationManager;
}