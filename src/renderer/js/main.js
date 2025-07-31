/**
 * Software Estimation Manager - Updated Main Application
 * Integrato con sistema di configurazione gerarchica e navigazione annidata
 */

class SoftwareEstimationApp {
    constructor() {
        this.currentProject = null;
        this.isDirty = false;
        this.currentPage = 'projects';

        // Managers for hierarchical configuration and nested navigation
        this.configManager = null;
        this.dataManager = null;
        this.featureManager = null;
        this.calculationsManager = null;
        this.navigationManager = null;
        this.modalManager = null;
        this.projectManager = null;
        this.configurationUI = null;

        this.init();
    }

    async init() {
        try {
            await this.initializeComponents();
            this.setupEventListeners();
            await this.loadLastProject();

            // Verifica e aggiorna lo stato della navigazione dopo il caricamento
            this.updateNavigationState();

            this.updateUI();

            // Ensure proper initial section display
            setTimeout(() => {
                this.navigationManager.navigateTo('projects');
            }, 200);

            console.log('Software Estimation Manager initialized successfully with nested navigation');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            NotificationManager.show('Failed to initialize application', 'error');
        }
    }

    async initializeComponents() {
        // Debug: Check if all classes are available
        console.log('Checking class availability:');
        console.log('DataManager:', typeof DataManager);
        console.log('ConfigurationManager:', typeof ConfigurationManager);
        console.log('FeatureManager:', typeof FeatureManager);
        console.log('CalculationsManager:', typeof CalculationsManager);
        console.log('EnhancedNavigationManager:', typeof EnhancedNavigationManager);
        console.log('ModalManager:', typeof ModalManager);
        console.log('ProjectManager:', typeof ProjectManager);
        console.log('CategoriesConfigManager:', typeof CategoriesConfigManager);
        console.log('NotificationManager:', typeof NotificationManager);
        console.log('Helpers:', typeof Helpers);
        console.log('electronAPI:', typeof window.electronAPI);

        // Check if classes are defined before initializing
        if (typeof DataManager === 'undefined') {
            throw new Error('DataManager is not defined - check data-manager.js');
        }
        if (typeof ConfigurationManager === 'undefined') {
            throw new Error('ConfigurationManager is not defined - check configuration-manager.js');
        }
        if (typeof NotificationManager === 'undefined') {
            throw new Error('NotificationManager is not defined - check notification-manager.js');
        }
        if (typeof ProjectManager === 'undefined') {
            throw new Error('ProjectManager is not defined - check project-manager.js');
        }

        // Show mode info
        if (window.electronAPI) {
            console.log('Running in Electron mode with file system support');
        } else {
            console.log('Running in fallback mode with localStorage');
            NotificationManager.info('Running in development mode - some features may be limited');
        }

        // Initialize managers in correct order
        this.dataManager = new DataManager();
        this.configManager = new ConfigurationManager(this.dataManager);

        // Wait for configuration manager to initialize
        await this.configManager.init();

        // Inizializza Configuration UI Manager
        this.configurationUI = new ConfigurationUIManager(this, this.configManager);

        this.featureManager = new FeatureManager(this.dataManager, this.configManager);
        this.calculationsManager = new CalculationsManager(this, this.configManager);
        this.navigationManager = new EnhancedNavigationManager(this, this.configManager);
        this.modalManager = new ModalManager();
        this.projectManager = new ProjectManager(this);

        this.projectPhasesManager = new ProjectPhasesManager(this, this.configManager);
        console.log('Project Phases Manager initialized and integrated');

        // Initialize Categories Config Manager after ConfigurationManager is ready
        this.categoriesConfigManager = new CategoriesConfigManager(this, this.configManager);
        console.log('Categories Config Manager initialized and integrated');

        console.log('All managers initialized successfully with hierarchical configuration and nested navigation');

        // Initialize default project structure
        if (!this.currentProject) {
            this.currentProject = this.createNewProject();
        }

        // Initialize dropdowns after project is created
        this.initializeDropdowns();
    }

    createNewProject() {
        const baseProject = {
            project: {
                id: Helpers.generateId(),
                name: 'New Project',
                version: '1.0.0',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                comment: 'Initial version'
            },
            features: [],
            phases: {
                functionalSpec: { manDays: 0, assignedResources: [], cost: 0 },
                techSpec: { manDays: 0, assignedResources: [], cost: 0 },
                development: { manDays: 0, calculated: true, cost: 0 },
                sit: { manDays: 0, assignedResources: [], cost: 0 },
                uat: { manDays: 0, assignedResources: [], cost: 0 },
                vapt: { manDays: 0, assignedResources: [], cost: 0 },
                consolidation: { manDays: 0, assignedResources: [], cost: 0 },
                postGoLive: { manDays: 0, assignedResources: [], cost: 0 }
            },
            // Initialize with hierarchical configuration structure
            config: this.configManager.initializeProjectConfig(),
            templates: [],
            versions: []
        };

        console.log('Created new project with hierarchical configuration');
        return baseProject;
    }

    /**
     * Initialize dropdowns using ConfigurationManager
     */
    initializeDropdowns() {
        if (this.featureManager && this.configManager) {
            // Let FeatureManager handle all dropdown population using ConfigurationManager
            this.featureManager.populateFilterDropdowns();
            console.log('Dropdowns initialized through FeatureManager with ConfigurationManager');
        }
    }

    // Nuovo metodo per ottenere il riepilogo delle fasi
    getPhasesSummary() {
        if (this.projectPhasesManager) {
            return {
                totalCost: this.projectPhasesManager.getTotalProjectCost(),
                totalManDays: this.projectPhasesManager.getTotalProjectManDays(),
                phases: this.projectPhasesManager.getProjectPhases(),
                validation: this.projectPhasesManager.validateAllPhases()
            };
        }
        return null;
    }

    /**
     * Refresh dropdowns when project changes
     */
    refreshDropdowns() {
        if (this.featureManager) {
            this.featureManager.refreshDropdowns();
            console.log('Dropdowns refreshed through FeatureManager');
        }
    }

    setupEventListeners() {
        // Menu actions from main process
        if (window.electronAPI && window.electronAPI.onMenuAction) {
            window.electronAPI.onMenuAction(this.handleMenuAction.bind(this));
        }

        // Navigation is now handled by EnhancedNavigationManager
        // Save button
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveProject();
            });
        }

        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showExportMenu();
            });
        }

        // Feature management
        const addFeatureBtn = document.getElementById('add-feature-btn');
        if (addFeatureBtn) {
            addFeatureBtn.addEventListener('click', () => {
                this.featureManager.showAddFeatureModal();
            });
        }

        // Search and filters
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.featureManager.filterFeatures();
            });
        }

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.featureManager.filterFeatures();
            });
        }

        const supplierFilter = document.getElementById('supplier-filter');
        if (supplierFilter) {
            supplierFilter.addEventListener('change', () => {
                this.featureManager.filterFeatures();
            });
        }

        // Table sorting
        document.querySelectorAll('[data-sort]').forEach(header => {
            header.addEventListener('click', (e) => {
                const sortField = header.dataset.sort;
                this.featureManager.sortFeatures(sortField);
            });
        });

        // Coverage input listener
        const coverageInput = document.getElementById('coverage-value');
        if (coverageInput) {
            coverageInput.addEventListener('input', (e) => {
                if (this.currentProject) {
                    const value = parseFloat(e.target.value) || 0;
                    this.currentProject.coverage = value;
                    this.currentProject.coverageIsAutoCalculated = false; // Mark as manually set
                    this.markDirty();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveProject();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.newProject();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.openProject();
                        break;
                }
            }
        });

        // Window events
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }

            // Save navigation state before closing
            if (this.navigationManager && NavigationStateManager) {
                NavigationStateManager.saveState(this.navigationManager);
            }
        });
    }

    // Auto-save removed - only manual save now

    async handleMenuAction(action) {
        try {
            switch (action) {
                case 'new-project':
                    await this.newProject();
                    break;
                case 'open-project':
                    await this.openProject();
                    break;
                case 'close-project':
                    await this.closeProject();
                    break;
                case 'save-project':
                    await this.saveProject();
                    break;
                case 'save-project-as':
                    await this.saveProjectAs();
                    break;
                case 'open-project-manager':
                    this.navigationManager.navigateTo('projects');
                    break;
                case 'open-features-management':
                    this.navigationManager.navigateTo('features');
                    break;
                case 'open-project-phases':
                    this.navigationManager.navigateTo('phases');
                    break;
                case 'open-calculations':
                    this.navigationManager.navigateTo('calculations');
                    break;
                case 'open-version-history':
                    this.navigationManager.navigateTo('history');
                    break;
                case 'show-recent-projects':
                    if (this.projectManager) {
                        this.projectManager.showLoadProjectModal();
                    }
                    break;
                case 'load-project-file':
                    if (this.projectManager) {
                        await this.projectManager.importProject();
                    }
                    break;
                case 'import-project':
                    if (this.projectManager) {
                        await this.projectManager.importProject();
                    }
                    break;
                case 'export-json':
                    await this.exportProject('json');
                    break;
                case 'export-csv':
                    await this.exportProject('csv');
                    break;
                case 'export-excel':
                    await this.exportProject('excel');
                    break;
                case 'backup-data':
                    await this.backupData();
                    break;
                case 'restore-data':
                    await this.restoreData();
                    break;
                case 'open-settings':
                    this.navigationManager.navigateTo('configuration');
                    break;
            }
        } catch (error) {
            console.error('Menu action failed:', error);
            NotificationManager.show(`Failed to ${action}: ${error.message}`, 'error');
        }
    }

    async newProject() {
        if (this.isDirty) {
            const save = await this.confirmSave();
            if (save === null) return; // User cancelled
            if (save) await this.saveProject();
        }

        this.currentProject = this.createNewProject();
        this.isDirty = false;

        // Update navigation state - project is now loaded
        this.navigationManager.onProjectLoaded();

        // Refresh dropdowns after creating new project
        this.refreshDropdowns();
        this.updateUI();

        NotificationManager.show('New project created with default configuration', 'success');
    }

    async openProject() {
        if (this.isDirty) {
            const save = await this.confirmSave();
            if (save === null) return; // User cancelled
            if (save) await this.saveProject();
        }

        try {
            if (window.electronAPI && window.electronAPI.openFile) {
                const result = await window.electronAPI.openFile();
                if (result && result.success && result.data) {
                    // Migrate old project format to new hierarchical format if needed
                    this.currentProject = this.migrateProjectConfig(result.data);
                    this.isDirty = false;

                    // Synchronize phases with loaded project features
                    if (this.projectPhasesManager) {
                        this.projectPhasesManager.synchronizeWithProject();
                    }

                    // Update navigation state - project is now loaded
                    this.navigationManager.onProjectLoaded();

                    // Refresh dropdowns after loading project
                    this.refreshDropdowns();
                    this.updateUI();

                    NotificationManager.show(`Project "${this.currentProject.project.name}" opened`, 'success');
                }
            }
        } catch (error) {
            console.error('Failed to open project:', error);
            NotificationManager.show('Failed to open project', 'error');
        }
    }

    /**
     * New method to handle project closing
     */
    async closeProject() {
        if (this.isDirty) {
            const save = await this.confirmSave();
            if (save === null) return; // User cancelled
            if (save) await this.saveProject();
        }

        // Reset to empty project
        this.currentProject = this.createNewProject();
        this.isDirty = false;

        // Update navigation state - no project loaded
        this.navigationManager.onProjectClosed();

        // Refresh dropdowns and UI
        this.refreshDropdowns();
        this.updateUI();

        NotificationManager.info('Project closed');
    }

    /**
     * Migrate project configuration to hierarchical format
     */
    migrateProjectConfig(projectData) {
        if (!projectData.config) {
            // Very old format - create new config
            projectData.config = this.configManager.initializeProjectConfig();
        } else if (!projectData.config.projectOverrides) {
            // Old format - migrate to hierarchical
            projectData.config = this.configManager.migrateProjectConfig(projectData.config);
        }

        console.log('Project configuration migrated to hierarchical format');
        return projectData;
    }

    async saveProjectPhasesConfiguration() {
        // Save phases configuration from ProjectPhasesManager to current project
        if (this.projectPhasesManager && this.currentProject) {
            try {
                // Get current phases configuration
                const currentPhases = this.projectPhasesManager.getProjectPhases();
                const selectedSuppliers = this.projectPhasesManager.selectedSuppliers;

                // Convert phases array back to object format for storage
                const phasesObject = {};
                currentPhases.forEach(phase => {
                    phasesObject[phase.id] = {
                        manDays: phase.manDays,
                        effort: phase.effort,
                        assignedResources: phase.assignedResources || [],
                        cost: this.projectPhasesManager.calculatePhaseTotalCost(phase),
                        lastModified: phase.lastModified
                    };
                });

                // Save selected suppliers
                phasesObject.selectedSuppliers = { ...selectedSuppliers };

                // Update project with phases configuration
                this.currentProject.phases = phasesObject;
            } catch (error) {
                console.error('Failed to save phases configuration:', error);
                // Don't throw - allow main save to continue
            }
        }
    }

    async saveProject() {
        if (!this.currentProject) return;

        try {
            this.showLoading('Saving project...');

            // Update project metadata
            this.currentProject.project.lastModified = new Date().toISOString();

            // Ensure config is in hierarchical format
            if (!this.currentProject.config.projectOverrides) {
                this.currentProject.config = this.configManager.migrateProjectConfig(this.currentProject.config);
            }

            // Save phases configuration automatically
            await this.saveProjectPhasesConfiguration();

            // Save to localStorage with unique key
            const projectKey = `software-estimation-project-${this.currentProject.project.id}`;
            localStorage.setItem(projectKey, JSON.stringify(this.currentProject));

            // Also save through data manager
            await this.dataManager.saveProject(this.currentProject);

            this.isDirty = false;

            // Update navigation state - project is saved (no longer dirty)
            this.navigationManager.onProjectDirty(false);

            this.updateProjectStatus();

            // Update project manager if available
            if (this.projectManager) {
                this.projectManager.loadSavedProjects();
                this.projectManager.updateCurrentProjectUI();
            }

            NotificationManager.show('Project saved successfully with hierarchical configuration', 'success');
        } catch (error) {
            console.error('Failed to save project:', error);
            NotificationManager.show('Failed to save project', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async saveProjectAs() {
        if (!this.currentProject) return;

        try {
            this.showLoading('Saving project...');

            // Save phases configuration before creating copy
            await this.saveProjectPhasesConfiguration();

            // Create a copy with new timestamp
            const projectCopy = Helpers.deepClone(this.currentProject);
            projectCopy.project.lastModified = new Date().toISOString();

            // Ensure hierarchical config format
            if (!projectCopy.config.projectOverrides) {
                projectCopy.config = this.configManager.migrateProjectConfig(projectCopy.config);
            }

            // Generate filename
            const filename = `${projectCopy.project.name}_${new Date().toISOString().split('T')[0]}.json`;

            // Download file
            const dataStr = JSON.stringify(projectCopy, null, 2);
            Helpers.downloadAsFile(dataStr, filename, 'application/json');

            NotificationManager.show('Project exported successfully', 'success');
        } catch (error) {
            console.error('Failed to save project as:', error);
            NotificationManager.show('Failed to export project', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Auto-save method removed - only manual save available

    async exportProject(format) {
        if (!this.currentProject) return;

        try {
            this.showLoading(`Exporting to ${format.toUpperCase()}...`);

            const filename = `${this.currentProject.project.name}_${new Date().toISOString().split('T')[0]}`;

            switch (format) {
                case 'json':
                    await this.exportJSON(filename);
                    break;
                case 'csv':
                    await this.exportCSV(filename);
                    break;
                case 'excel':
                    await this.exportExcel(filename);
                    break;
            }

            NotificationManager.show(`Project exported to ${format.toUpperCase()}`, 'success');
        } catch (error) {
            console.error(`Export to ${format} failed:`, error);
            NotificationManager.show(`Export to ${format} failed`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async exportJSON(filename) {
        // Ensure hierarchical config format
        if (!this.currentProject.config.projectOverrides) {
            this.currentProject.config = this.configManager.migrateProjectConfig(this.currentProject.config);
        }

        if (window.electronAPI && window.electronAPI.saveFile) {
            const result = await window.electronAPI.saveFile(
                `${filename}.json`,
                this.currentProject
            );

            if (!result.success && !result.canceled) {
                throw new Error(result.error || 'Failed to save JSON file');
            }
        } else {
            // Fallback for web mode
            const dataStr = JSON.stringify(this.currentProject, null, 2);
            Helpers.downloadAsFile(dataStr, `${filename}.json`, 'application/json');
        }
    }

    async exportCSV(filename) {
        // Export features to CSV using ConfigurationManager for proper name resolution
        const csvData = this.featureManager.generateCSV();

        if (window.electronAPI && window.electronAPI.saveFile) {
            const result = await window.electronAPI.saveFile(
                `${filename}_features.csv`,
                csvData
            );

            if (!result.success && !result.canceled) {
                throw new Error(result.error || 'Failed to save CSV file');
            }
        } else {
            // Fallback for web mode
            Helpers.downloadAsFile(csvData, `${filename}_features.csv`, 'text/csv');
        }
    }

    async exportExcel(filename) {
        // This would require the xlsx library
        // For now, we'll show a placeholder
        NotificationManager.show('Excel export coming soon', 'info');
    }

    showExportMenu() {
        // Create a simple context menu for export options
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-md);
            padding: var(--spacing-sm);
            z-index: 1000;
            box-shadow: var(--shadow-md);
        `;

        menu.innerHTML = `
            <div class="context-menu-item" data-action="export-json" style="padding: var(--spacing-sm); cursor: pointer; border-radius: var(--radius-sm);">
                <i class="fas fa-file-code"></i> Export as JSON
            </div>
            <div class="context-menu-item" data-action="export-csv" style="padding: var(--spacing-sm); cursor: pointer; border-radius: var(--radius-sm);">
                <i class="fas fa-file-csv"></i> Export as CSV
            </div>
            <div class="context-menu-item" data-action="export-excel" style="padding: var(--spacing-sm); cursor: pointer; border-radius: var(--radius-sm);">
                <i class="fas fa-file-excel"></i> Export as Excel
            </div>
            <div style="height: 1px; background: var(--border-primary); margin: var(--spacing-xs) 0;"></div>
            <div class="context-menu-item" data-action="export-global-config" style="padding: var(--spacing-sm); cursor: pointer; border-radius: var(--radius-sm);">
                <i class="fas fa-globe"></i> Export Global Configuration
            </div>
        `;

        // Position and show menu
        document.body.appendChild(menu);

        // Add hover effects
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'var(--bg-hover)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
        });

        // Handle menu clicks
        menu.addEventListener('click', async (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action) {
                if (action === 'export-global-config') {
                    await this.exportGlobalConfiguration();
                } else {
                    const format = action.replace('export-', '');
                    await this.exportProject(format);
                }
            }
            menu.remove();
        });

        // Remove menu on outside click
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }

    async exportGlobalConfiguration() {
        try {
            const globalConfig = this.configManager.globalConfig;
            const filename = `global-configuration-${new Date().toISOString().split('T')[0]}.json`;

            const dataStr = JSON.stringify(globalConfig, null, 2);
            Helpers.downloadAsFile(dataStr, filename, 'application/json');

            NotificationManager.show('Global configuration exported successfully', 'success');
        } catch (error) {
            console.error('Failed to export global configuration:', error);
            NotificationManager.show('Failed to export global configuration', 'error');
        }
    }

    async loadLastProject() {
        try {
            const lastProject = await this.dataManager.loadProject();
            if (lastProject) {
                // Migrate configuration format if needed
                this.currentProject = this.migrateProjectConfig(lastProject);

                // Synchronize phases with loaded project features
                if (this.phasesManager) {
                    this.phasesManager.synchronizeWithProject();
                }

                // Update navigation state
                this.updateNavigationState();

                // Refresh dropdowns after loading last project
                this.refreshDropdowns();
            }

            // Restore navigation state
            if (NavigationStateManager) {
                const savedNavState = NavigationStateManager.loadState();
                if (savedNavState) {
                    this.navigationManager.restoreNavigationState(savedNavState);
                }
            }
        } catch (error) {
            console.warn('Failed to load last project:', error);
        }
    }

    /**
     * Update navigation state based on current project
     */
    updateNavigationState() {
        const hasProject = this.currentProject &&
            this.currentProject.project &&
            this.currentProject.project.name !== 'New Project';

        if (hasProject) {
            this.navigationManager.onProjectLoaded();
            this.navigationManager.onProjectDirty(this.isDirty);
        } else {
            this.navigationManager.onProjectClosed();
        }
    }

    confirmSave() {
        return new Promise((resolve) => {
            const result = confirm('You have unsaved changes. Do you want to save before continuing?');
            resolve(result);
        });
    }

    markDirty() {
        this.isDirty = true;

        // Update navigation state - project now has unsaved changes
        this.navigationManager.onProjectDirty(true);

        this.updateProjectStatus();

        // Se sono state modificate le features, aggiorna le fasi
        if (this.projectPhasesManager) {
            this.projectPhasesManager.calculateDevelopmentPhase();

            // Aggiorna la UI solo se siamo nella pagina phases
            if (this.navigationManager.currentSection === 'phases') {
                const phasesPage = document.getElementById('phases-page');
                if (phasesPage && phasesPage.classList.contains('active')) {
                    this.projectPhasesManager.updateCalculations();
                }
            }
        }
    }

    updateUI() {
        this.updateProjectInfo();
        this.updateProjectStatus();
        this.featureManager.refreshTable();
        this.updateSummary();
        this.updateConfigurationStatus();
        // Aggiorna il phases manager se esiste e siamo nella pagina corretta
        if (this.projectPhasesManager && this.navigationManager.currentSection === 'phases') {
            this.projectPhasesManager.refreshFromFeatures();
        }
        // Aggiorna il calculations manager se esiste e siamo nella pagina corretta
        if (this.calculationsManager && this.navigationManager.currentSection === 'calculations') {
            this.calculationsManager.refresh();
        }
    }

    updateProjectInfo() {
        if (!this.currentProject) return;

        const projectNameEl = document.getElementById('title-project-name');
        if (projectNameEl) {
            projectNameEl.textContent = this.currentProject.project.name;
        }
    }

    updateProjectStatus() {
        const statusEl = document.getElementById('project-status');
        if (statusEl) {
            statusEl.className = this.isDirty ? 'unsaved' : 'saved';
            statusEl.textContent = this.isDirty ? '●' : '○';
        }
    }

    updateConfigurationStatus() {
        // Show configuration status in the UI
        if (this.configManager && this.currentProject) {
            const stats = this.configManager.getConfigStats(this.currentProject.config);

            // Update status bar or other UI elements with configuration info
            const statusMessage = document.getElementById('status-message');
            if (statusMessage && stats) {
                const projectSpecificCount = stats.suppliers.projectSpecific +
                    stats.internalResources.projectSpecific +
                    stats.categories.projectSpecific;

                if (projectSpecificCount > 0) {
                    statusMessage.textContent = `Ready - ${projectSpecificCount} project-specific configurations`;
                } else {
                    statusMessage.textContent = 'Ready - Using global configuration';
                }
            }
        }
    }

    updateSummary() {
        if (!this.currentProject) return;

        const features = this.currentProject.features;
        const totalFeatures = features.length;

        // Calculate total man days without category multiplier
        const totalManDays = features.reduce((sum, feature) => sum + (feature.manDays || 0), 0);

        const averageManDays = totalFeatures > 0 ? (totalManDays / totalFeatures).toFixed(1) : 0;

        // Calculate default coverage (30% of total man days)
        const defaultCoverage = (totalManDays * 0.3).toFixed(1);

        // Update summary display
        const totalFeaturesEl = document.getElementById('total-features');
        const totalManDaysEl = document.getElementById('total-man-days');
        const averageManDaysEl = document.getElementById('average-man-days');
        const coverageEl = document.getElementById('coverage-value');

        if (totalFeaturesEl) totalFeaturesEl.textContent = totalFeatures;
        if (totalManDaysEl) totalManDaysEl.textContent = totalManDays.toFixed(1);
        if (averageManDaysEl) averageManDaysEl.textContent = averageManDays;
        
        // Update coverage field - auto-calculate if not manually set by user
        if (coverageEl) {
            // Check if coverage should be auto-calculated or manually maintained
            const coverageIsAutoCalculated = this.currentProject.coverageIsAutoCalculated !== false; // Default to true
            
            if (coverageIsAutoCalculated || this.currentProject.coverage === undefined) {
                // Auto-calculate coverage (30% of total man days)
                coverageEl.value = defaultCoverage;
                this.currentProject.coverage = parseFloat(defaultCoverage);
                this.currentProject.coverageIsAutoCalculated = true;
                // Don't call markDirty() here to avoid "unsaved changes" alert on project load
            } else {
                // Use manually set coverage value
                coverageEl.value = this.currentProject.coverage;
            }
        }
    }

    updateLastSaved() {
        const lastSavedEl = document.getElementById('last-saved');
        if (lastSavedEl) {
            lastSavedEl.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
        }
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const messageEl = overlay ? overlay.querySelector('p') : null;

        if (overlay) {
            if (messageEl) messageEl.textContent = message;
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * Backup and restore functionality
     */
    async backupData() {
        try {
            this.showLoading('Creating backup...');

            const backupData = {
                metadata: {
                    version: '1.0.0',
                    createdAt: new Date().toISOString(),
                    application: 'Software Estimation Manager'
                },
                globalConfiguration: this.configManager.globalConfig,
                currentProject: this.currentProject,
                recentProjects: this.projectManager ? this.projectManager.recentProjects : [],
                applicationSettings: await this.dataManager.getSettings(),
                navigationState: this.navigationManager.getNavigationState()
            };

            const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
            const dataStr = JSON.stringify(backupData, null, 2);

            if (window.electronAPI && window.electronAPI.saveFile) {
                const result = await window.electronAPI.saveFile(filename, backupData);
                if (result && result.success) {
                    NotificationManager.show('Backup created successfully', 'success');
                }
            } else {
                Helpers.downloadAsFile(dataStr, filename, 'application/json');
                NotificationManager.show('Backup downloaded successfully', 'success');
            }
        } catch (error) {
            console.error('Backup failed:', error);
            NotificationManager.show('Failed to create backup', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async restoreData() {
        try {
            if (!confirm('Restoring data will replace all current data. Are you sure you want to continue?')) {
                return;
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = async (e) => {
                try {
                    this.showLoading('Restoring data...');

                    const file = e.target.files[0];
                    if (!file) return;

                    const content = await file.text();
                    const backupData = JSON.parse(content);

                    // Validate backup data
                    if (!backupData.metadata || !backupData.globalConfiguration) {
                        throw new Error('Invalid backup file format');
                    }

                    // Restore global configuration
                    this.configManager.globalConfig = backupData.globalConfiguration;
                    await this.configManager.saveGlobalConfig();

                    // Restore current project if available
                    if (backupData.currentProject) {
                        this.currentProject = this.migrateProjectConfig(backupData.currentProject);
                        this.isDirty = false;
                        
                        // Synchronize phases with restored project features
                        if (this.phasesManager) {
                            this.phasesManager.synchronizeWithProject();
                        }
                        
                        this.navigationManager.onProjectLoaded();
                    }

                    // Restore recent projects if available
                    if (this.projectManager && backupData.recentProjects) {
                        this.projectManager.recentProjects = backupData.recentProjects;
                        this.projectManager.saveRecentProjects();
                    }

                    // Restore application settings if available
                    if (backupData.applicationSettings) {
                        await this.dataManager.saveSettings(backupData.applicationSettings);
                    }

                    // Restore navigation state if available
                    if (backupData.navigationState) {
                        this.navigationManager.restoreNavigationState(backupData.navigationState);
                    }

                    // Refresh UI
                    this.refreshDropdowns();
                    this.updateUI();

                    NotificationManager.show('Data restored successfully', 'success');
                } catch (error) {
                    console.error('Failed to restore data:', error);
                    NotificationManager.show(`Failed to restore data: ${error.message}`, 'error');
                } finally {
                    this.hideLoading();
                }
            };

            input.click();
        } catch (error) {
            console.error('Failed to restore data:', error);
            NotificationManager.show('Failed to restore data', 'error');
        }
    }

    /**
     * Get configuration statistics for current project
     */
    getConfigurationStats() {
        if (!this.configManager || !this.currentProject) {
            return null;
        }

        return this.configManager.getConfigStats(this.currentProject.config);
    }

    /**
     * Reset project configuration to global defaults
     */
    async resetProjectConfigToGlobal() {
        if (!this.configManager || !this.currentProject) {
            return false;
        }

        const confirmed = confirm(
            'Are you sure you want to reset all project configuration to global defaults? ' +
            'This will remove all project-specific suppliers, resources, categories, and parameter overrides.'
        );

        if (!confirmed) return false;

        try {
            this.configManager.resetProjectToGlobalDefaults(this.currentProject.config);
            this.markDirty();
            this.refreshDropdowns();
            this.updateUI();

            NotificationManager.show('Project configuration reset to global defaults', 'success');
            return true;
        } catch (error) {
            console.error('Failed to reset project configuration:', error);
            NotificationManager.show('Failed to reset project configuration', 'error');
            return false;
        }
    }

    /**
     * Import global configuration from file
     */
    async importGlobalConfiguration() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = async (e) => {
                try {
                    const file = e.target.files[0];
                    if (!file) return;

                    this.showLoading('Importing global configuration...');

                    const content = await file.text();
                    const importedConfig = JSON.parse(content);

                    // Remove export metadata if present
                    if (importedConfig.exportMetadata) {
                        delete importedConfig.exportMetadata;
                    }

                    // Validate imported configuration
                    if (!this.validateGlobalConfiguration(importedConfig)) {
                        throw new Error('Invalid configuration file format');
                    }

                    // Backup current configuration
                    const backup = this.configManager.globalConfig;

                    try {
                        this.configManager.globalConfig = importedConfig;
                        await this.configManager.saveGlobalConfig();

                        // Refresh all dropdowns and UI
                        this.refreshDropdowns();
                        this.updateUI();

                        NotificationManager.show('Global configuration imported successfully', 'success');
                    } catch (saveError) {
                        // Restore backup on save failure
                        this.configManager.globalConfig = backup;
                        throw saveError;
                    }
                } catch (error) {
                    console.error('Failed to import global configuration:', error);
                    NotificationManager.show(`Failed to import configuration: ${error.message}`, 'error');
                } finally {
                    this.hideLoading();
                }
            };

            input.click();
        } catch (error) {
            console.error('Failed to import global configuration:', error);
            NotificationManager.show('Failed to import global configuration', 'error');
        }
    }

    /**
     * Validate global configuration structure
     */
    validateGlobalConfiguration(config) {
        if (!config || typeof config !== 'object') return false;

        const requiredProps = ['suppliers', 'internalResources', 'categories', 'calculationParams'];

        for (const prop of requiredProps) {
            if (!(prop in config)) return false;
        }

        // Validate suppliers array
        if (!Array.isArray(config.suppliers)) return false;

        // Validate internal resources array
        if (!Array.isArray(config.internalResources)) return false;

        // Validate categories array
        if (!Array.isArray(config.categories)) return false;

        // Validate calculation params object
        if (!config.calculationParams || typeof config.calculationParams !== 'object') return false;

        return true;
    }

    /**
     * Get current project configuration merged with global defaults
     */
    getEffectiveConfiguration() {
        if (!this.configManager || !this.currentProject) {
            return null;
        }

        return this.configManager.getProjectConfig(this.currentProject.config);
    }

    /**
     * Add supplier to current project
     */
    async addSupplierToProject(supplier) {
        if (!this.configManager || !this.currentProject) {
            return false;
        }

        try {
            this.configManager.addSupplierToProject(this.currentProject.config, supplier);
            this.markDirty();
            this.refreshDropdowns();

            NotificationManager.show('Supplier added to project', 'success');
            return true;
        } catch (error) {
            console.error('Failed to add supplier to project:', error);
            NotificationManager.show('Failed to add supplier', 'error');
            return false;
        }
    }

    /**
     * Add internal resource to current project
     */
    async addInternalResourceToProject(resource) {
        if (!this.configManager || !this.currentProject) {
            return false;
        }

        try {
            this.configManager.addInternalResourceToProject(this.currentProject.config, resource);
            this.markDirty();
            this.refreshDropdowns();

            NotificationManager.show('Internal resource added to project', 'success');
            return true;
        } catch (error) {
            console.error('Failed to add internal resource to project:', error);
            NotificationManager.show('Failed to add internal resource', 'error');
            return false;
        }
    }

    /**
     * Add category to current project
     */
    async addCategoryToProject(category) {
        if (!this.configManager || !this.currentProject) {
            return false;
        }

        try {
            this.configManager.addCategoryToProject(this.currentProject.config, category);
            this.markDirty();
            this.refreshDropdowns();

            NotificationManager.show('Category added to project', 'success');
            return true;
        } catch (error) {
            console.error('Failed to add category to project:', error);
            NotificationManager.show('Failed to add category', 'error');
            return false;
        }
    }

    destroy() {
        // Save navigation state before destroying
        if (this.navigationManager && NavigationStateManager) {
            NavigationStateManager.saveState(this.navigationManager);
        }

        // Clean up configuration manager
        if (this.configManager) {
            this.configManager.clearCache();
        }
    }

}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add delay to ensure all scripts are loaded
    setTimeout(() => {
        console.log('Starting app initialization with hierarchical configuration and nested navigation...');

        // Check if all required classes are available
        const requiredClasses = [
            'DataManager', 'ConfigurationManager', 'FeatureManager', 'EnhancedNavigationManager',
            'ModalManager', 'ProjectManager', 'NotificationManager', 'Helpers'
        ];

        const missingClasses = requiredClasses.filter(className => typeof window[className] === 'undefined');

        if (missingClasses.length > 0) {
            console.error('Missing classes:', missingClasses);
            alert(`Missing required classes: ${missingClasses.join(', ')}\nPlease check that all JavaScript files are loaded correctly.`);
            return;
        }

        try {
            window.app = new SoftwareEstimationApp();

            // Event listeners per l'integrazione delle fasi
            document.addEventListener('DOMContentLoaded', function() {

                // Listener per sincronizzare le fasi quando cambiano le features
                document.addEventListener('featuresChanged', function(event) {
                    if (window.app && window.app.phasesManager) {
                        window.app.phasesManager.refreshFromFeatures();
                        console.log('Phases updated due to features change');
                    }
                });

                // Listener per i cambiamenti di progetto
                document.addEventListener('projectChanged', function(event) {
                    if (window.app && window.app.phasesManager) {
                        window.app.phasesManager.initializePhases();
                        console.log('Phases reinitialized due to project change');
                    }
                });

                // Aggiorna il contenuto della pagina phases se esiste
                const phasesPage = document.getElementById('phases-page');
                if (phasesPage && !phasesPage.querySelector('.phases-configuration')) {
                    phasesPage.innerHTML = `
            <div class="page-header">
                <h2>Project Phases Configuration</h2>
                <div class="page-actions">
                    <button class="btn btn-secondary" onclick="window.refreshPhasesFromFeatures()">
                        <i class="fas fa-sync"></i> Refresh from Features
                    </button>
                    <button class="btn btn-primary" onclick="window.app?.phasesManager?.exportPhases()">
                        <i class="fas fa-download"></i> Export Phases
                    </button>
                </div>
            </div>
            <div class="phases-content">
                <div class="phases-loading">
                    <div class="spinner"></div>
                    <span>Loading phases configuration...</span>
                </div>
            </div>
        `;
                }
            });
        } catch (error) {
            console.error('Failed to initialize app:', error);
            alert(`Failed to initialize application: ${error.message}`);
        }
    }, 500); // Wait 500ms for all scripts to load
});

// Handle app cleanup
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});

// Global helper functions for configuration management and navigation
window.getConfigurationStats = () => {
    return window.app ? window.app.getConfigurationStats() : null;
};

window.resetProjectConfig = () => {
    return window.app ? window.app.resetProjectConfigToGlobal() : false;
};

window.importGlobalConfig = () => {
    if (window.app) {
        return window.app.importGlobalConfiguration();
    }
};

window.exportGlobalConfig = () => {
    if (window.app) {
        return window.app.exportGlobalConfiguration();
    }
};

window.isProjectLoaded = () => {
    return window.app && window.app.currentProject &&
        window.app.currentProject.project &&
        window.app.currentProject.project.name !== 'New Project';
};

window.hasUnsavedChanges = () => {
    return window.app ? window.app.isDirty : false;
};

window.getNavigationState = () => {
    return window.app && window.app.navigationManager ?
        window.app.navigationManager.getNavigationState() : null;
};

window.navigateToSection = (sectionName) => {
    if (window.app && window.app.navigationManager) {
        return window.app.navigationManager.navigateTo(sectionName);
    }
};

// Additional helper functions for debugging and development
window.debugConfig = () => {
    if (window.app && window.app.configManager) {
        console.log('Global Config:', window.app.configManager.globalConfig);
        console.log('Current Project Config:', window.app.currentProject ? window.app.currentProject.config : null);
        console.log('Effective Config:', window.app.getEffectiveConfiguration());
        console.log('Config Stats:', window.app.getConfigurationStats());
        console.log('Navigation State:', window.app.navigationManager ? window.app.navigationManager.getNavigationState() : null);
    }
};

window.clearConfigCache = () => {
    if (window.app && window.app.configManager) {
        window.app.configManager.clearCache();
        console.log('Configuration cache cleared');
    }
};

window.clearNavigationState = () => {
    if (NavigationStateManager) {
        NavigationStateManager.clearState();
        console.log('Navigation state cleared');
    }
};

// Export for external modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoftwareEstimationApp;
}