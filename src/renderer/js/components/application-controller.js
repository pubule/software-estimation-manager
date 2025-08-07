/**
 * Application Controller (Refactored)
 * Main application orchestrator with improved structure and separation of concerns
 */

class ApplicationController extends BaseComponent {
    constructor() {
        super('ApplicationController');
        
        // Application state
        this.currentProject = null;
        this.isDirty = false;
        this.currentPage = 'projects';
        
        // Component managers
        this.managers = {
            config: null,
            data: null,
            feature: null,
            calculations: null,
            navigation: null,
            modal: null,
            project: null,
            configurationUI: null,
            version: null,
            projectPhases: null
        };

        // Bind methods
        this.handleMenuAction = this.handleMenuAction.bind(this);
        this.handleCloseRequest = this.handleCloseRequest.bind(this);
        this.markDirty = this.markDirty.bind(this);
        this.updateUI = this.updateUI.bind(this);
    }

    async onInit() {
        await this.initializeComponents();
        this.setupEventListeners();
        // Removed automatic loading of last project - start with clean state
        // await this.loadLastProject();
        this.updateNavigationState();
        this.updateUI();
        
        // Ensure proper initial navigation
        setTimeout(() => {
            this.managers.navigation?.navigateTo('projects');
        }, 200);

        console.log('Software Estimation Manager initialized successfully');
    }

    /**
     * Initialize all component managers
     */
    async initializeComponents() {
        try {
            // Validate essential dependencies (more flexible for refactored components)
            const requiredDependencies = [
                'CalculationsManager', 'EnhancedNavigationManager', 'ModalManager',
                'ProjectManager', 'NotificationManager', 'Helpers'
            ];
            
            // Check for either original or refactored versions of core components
            const coreComponents = [
                { original: 'DataManager', refactored: 'DataManagerRefactored' },
                { original: 'ConfigurationManager', refactored: 'ConfigurationManagerRefactored' },
                { original: 'FeatureManager', refactored: 'FeatureManagerRefactored' }
            ];
            
            const missingCoreComponents = coreComponents.filter(comp => 
                !window[comp.original] && !window[comp.refactored]
            );
            
            if (missingCoreComponents.length > 0) {
                throw new Error(`Missing core components: ${missingCoreComponents.map(c => c.original).join(', ')}`);
            }
            
            this.validateDependencies(requiredDependencies);

            this.showEnvironmentInfo();
            
            // Initialize core managers first
            await this.initializeCoreManagers();
            
            // Initialize UI managers
            await this.initializeUIManagers();
            
            // Initialize feature managers
            await this.initializeFeatureManagers();
            
            // Initialize default project if needed
            if (!this.currentProject) {
                this.currentProject = await this.createNewProject();
            }

            this.initializeDropdowns();

        } catch (error) {
            this.handleError('Component initialization failed', error);
            throw error;
        }
    }

    /**
     * Initialize core data and configuration managers
     */
    async initializeCoreManagers() {
        // Data manager (use refactored if available, otherwise original)
        if (window.DataManagerRefactored) {
            this.managers.data = new DataManagerRefactored();
        } else {
            this.managers.data = new DataManager();
        }
        
        // Configuration manager (use refactored if available, otherwise original)
        if (window.ConfigurationManagerRefactored) {
            this.managers.config = new ConfigurationManagerRefactored(this.managers.data);
        } else {
            this.managers.config = new ConfigurationManager(this.managers.data);
        }
        await this.managers.config.init();
        
        console.log('Core managers initialized');
        
        // Set up backward compatibility aliases for original components
        this.dataManager = this.managers.data;
        this.configManager = this.managers.config;
        
        console.log('Backward compatibility aliases set up');
    }

    /**
     * Initialize UI managers
     */
    async initializeUIManagers() {
        // Navigation manager
        this.managers.navigation = new EnhancedNavigationManager(this, this.managers.config);
        
        // Modal manager
        this.managers.modal = new ModalManager();
        
        // Configuration UI manager
        this.managers.configurationUI = new ConfigurationUIManager(this, this.managers.config);
        
        console.log('UI managers initialized');
        
        // Set up backward compatibility aliases for UI managers
        this.navigationManager = this.managers.navigation;
        this.modalManager = this.managers.modal;
        this.configurationUIManager = this.managers.configurationUI;
        
        // Additional alias for navigation compatibility
        this.configurationUI = this.managers.configurationUI;
        
        console.log('UI manager backward compatibility aliases set up');
    }

    /**
     * Initialize feature-specific managers
     */
    async initializeFeatureManagers() {
        // Feature manager (use refactored if available, otherwise original)
        if (window.FeatureManagerRefactored) {
            this.managers.feature = new FeatureManagerRefactored(this.managers.data, this.managers.config);
        } else {
            this.managers.feature = new FeatureManager(this.managers.data, this.managers.config);
        }
        await this.managers.feature.init();
        
        // Calculations manager
        this.managers.calculations = new CalculationsManager(this, this.managers.config);
        
        // Project manager
        this.managers.project = new ProjectManager(this);
        
        // Project phases manager
        this.managers.projectPhases = new ProjectPhasesManager(this, this.managers.config);
        
        // Version manager
        this.managers.version = new VersionManager(this);
        
        console.log('Feature managers initialized');
        
        // Set up additional backward compatibility aliases
        this.featureManager = this.managers.feature;
        this.calculationsManager = this.managers.calculations;
        this.projectManager = this.managers.project;
        this.projectPhasesManager = this.managers.projectPhases;
        this.versionManager = this.managers.version;
        
        console.log('Additional backward compatibility aliases set up');
    }

    /**
     * Show environment information
     */
    showEnvironmentInfo() {
        if (window.electronAPI) {
            console.log('Running in Electron mode with file system support');
        } else {
            console.log('Running in fallback mode with localStorage');
            if (window.NotificationManager) {
                NotificationManager.info('Running in development mode - some features may be limited');
            }
        }
    }

    /**
     * Create new project with default structure
     */
    async createNewProject() {
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
            phases: this.createDefaultPhases(),
            config: await this.managers.config.initializeProjectConfig(),
            versions: []
        };

        console.log('Created new project with hierarchical configuration');
        return baseProject;
    }

    /**
     * Create default phases structure
     */
    createDefaultPhases() {
        return {
            functionalSpec: { manDays: 0, assignedResources: [], cost: 0 },
            techSpec: { manDays: 0, assignedResources: [], cost: 0 },
            development: { manDays: 0, calculated: true, cost: 0 },
            sit: { manDays: 0, assignedResources: [], cost: 0 },
            uat: { manDays: 0, assignedResources: [], cost: 0 },
            vapt: { manDays: 0, assignedResources: [], cost: 0 },
            consolidation: { manDays: 0, assignedResources: [], cost: 0 },
            postGoLive: { manDays: 0, assignedResources: [], cost: 0 }
        };
    }

    /**
     * Initialize dropdowns using ConfigurationManager
     */
    initializeDropdowns() {
        if (this.managers.feature && this.managers.config) {
            this.managers.feature.populateFilterDropdowns();
            console.log('Dropdowns initialized through FeatureManager');
        }
    }

    /**
     * Set up application event listeners
     */
    setupEventListeners() {
        // Menu actions from main process
        if (window.electronAPI?.onMenuAction) {
            window.electronAPI.onMenuAction(this.handleMenuAction);
        }

        // Handle application close requests
        if (window.electronAPI?.onCheckBeforeClose) {
            window.electronAPI.onCheckBeforeClose(this.handleCloseRequest);
        }

        this.setupUIEventListeners();
        this.setupKeyboardShortcuts();
        this.setupWindowEvents();
    }

    /**
     * Set up UI event listeners
     */
    setupUIEventListeners() {
        // Save button
        const saveBtn = this.getElement('save-btn');
        if (saveBtn) {
            this.addEventListener(saveBtn, 'click', () => this.saveProject());
        }

        // Export button
        const exportBtn = this.getElement('export-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.showExportMenu());
        }

        // Add feature button
        const addFeatureBtn = this.getElement('add-feature-btn');
        if (addFeatureBtn) {
            this.addEventListener(addFeatureBtn, 'click', () => {
                this.managers.feature?.showAddFeatureModal();
            });
        }

        // Search and filters
        this.setupSearchAndFilters();
        
        // Table sorting
        this.setupTableSorting();
        
        // Coverage controls
        this.setupCoverageControls();
    }

    /**
     * Set up search and filter controls
     */
    setupSearchAndFilters() {
        const searchInput = this.getElement('search-input');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', () => {
                this.managers.feature?.filterFeatures();
            });
        }

        const categoryFilter = this.getElement('category-filter');
        if (categoryFilter) {
            this.addEventListener(categoryFilter, 'change', () => {
                this.managers.feature?.filterFeatures();
            });
        }

        const supplierFilter = this.getElement('supplier-filter');
        if (supplierFilter) {
            this.addEventListener(supplierFilter, 'change', () => {
                this.managers.feature?.filterFeatures();
            });
        }
    }

    /**
     * Set up table sorting
     */
    setupTableSorting() {
        this.querySelectorAll('[data-sort]').forEach(header => {
            this.addEventListener(header, 'click', (e) => {
                const sortField = header.dataset.sort;
                this.managers.feature?.sortFeatures(sortField);
            });
        });
    }

    /**
     * Set up coverage controls
     */
    setupCoverageControls() {
        const coverageInput = this.getElement('coverage-value');
        if (coverageInput) {
            this.addEventListener(coverageInput, 'input', (e) => {
                this.handleCoverageChange(e.target.value);
            });
        }

        const coverageResetBtn = this.getElement('coverage-reset-btn');
        if (coverageResetBtn) {
            this.addEventListener(coverageResetBtn, 'click', () => {
                this.resetCoverageToAuto();
            });
        }
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.addEventListener(document, 'keydown', (e) => {
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
    }

    /**
     * Set up window events
     */
    setupWindowEvents() {
        this.addEventListener(window, 'beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }

            // Save navigation state before closing
            if (this.managers.navigation && window.NavigationStateManager) {
                NavigationStateManager.saveState(this.managers.navigation);
            }
        });
    }

    /**
     * Handle coverage value changes
     */
    handleCoverageChange(value) {
        if (this.currentProject) {
            const numericValue = parseFloat(value) || 0;
            this.currentProject.coverage = numericValue;
            this.currentProject.coverageIsAutoCalculated = false;
            this.updateCoverageResetButtonVisibility();
            this.markDirty();
        }
    }

    /**
     * Show export menu for project export options
     */
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
            this.addEventListener(item, 'mouseenter', () => {
                item.style.backgroundColor = 'var(--bg-hover)';
            });
            this.addEventListener(item, 'mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
        });

        // Handle menu clicks
        this.addEventListener(menu, 'click', async (e) => {
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
            this.addEventListener(document, 'click', () => menu.remove(), { once: true });
        }, 100);
    }

    /**
     * Export project in various formats
     */
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

            if (window.NotificationManager) {
                NotificationManager.show(`Project exported to ${format.toUpperCase()}`, 'success');
            }
        } catch (error) {
            console.error(`Export to ${format} failed:`, error);
            if (window.NotificationManager) {
                NotificationManager.show(`Export to ${format} failed`, 'error');
            }
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Export project as JSON
     */
    async exportJSON(filename) {
        // Ensure hierarchical config format
        if (!this.currentProject.config.projectOverrides) {
            this.currentProject.config = this.managers.config.migrateProjectConfig(this.currentProject.config);
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
            this.helpers.downloadAsFile(dataStr, `${filename}.json`, 'application/json');
        }
    }

    /**
     * Export project as CSV
     */
    async exportCSV(filename) {
        // Export features to CSV using FeatureManager
        const csvData = this.managers.feature?.generateCSV();
        if (!csvData) {
            throw new Error('No CSV data available');
        }

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
            this.helpers.downloadAsFile(csvData, `${filename}_features.csv`, 'text/csv');
        }
    }

    /**
     * Export project as Excel
     */
    async exportExcel(filename) {
        try {
            // Check if XLSX library is available
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX library not available');
            }

            // Create new workbook
            const workbook = XLSX.utils.book_new();

            // Sheet 1: Features Data
            const featuresSheet = this.createFeaturesSheet();
            XLSX.utils.book_append_sheet(workbook, featuresSheet, 'Features');

            // Sheet 2: Phases Data
            const phasesSheet = this.createPhasesSheet();
            XLSX.utils.book_append_sheet(workbook, phasesSheet, 'Phases');

            // Sheet 3: Calculations Data
            const calculationsSheet = this.createCalculationsSheet();
            XLSX.utils.book_append_sheet(workbook, calculationsSheet, 'Calculations');

            // Generate Excel file
            const excelBuffer = XLSX.write(workbook, { 
                bookType: 'xlsx', 
                type: 'array',
                bookSST: false
            });

            // Save file
            if (window.electronAPI && window.electronAPI.saveFileBuffer) {
                const result = await window.electronAPI.saveFileBuffer(
                    `${filename}.xlsx`,
                    excelBuffer
                );
                if (!result.success && !result.canceled) {
                    throw new Error(result.error || 'Failed to save Excel file');
                }
            } else {
                // Fallback for web mode
                const blob = new Blob([excelBuffer], { 
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.xlsx`;
                a.click();
                URL.revokeObjectURL(url);
            }

        } catch (error) {
            console.error('Excel export failed:', error);
            throw error;
        }
    }

    /**
     * Create Excel sheet for features data
     */
    createFeaturesSheet() {
        if (!this.managers.feature || !this.currentProject) {
            return XLSX.utils.aoa_to_sheet([['No features data available']]);
        }

        const features = this.currentProject.features || [];
        const currentProject = this.currentProject;

        // Headers
        const headers = [
            'ID', 'Description', 'Category', 'Feature Type', 'Supplier', 
            'Real Man Days', 'Expertise %', 'Risk Margin %', 
            'Calculated Man Days', 'Notes', 'Created', 'Modified'
        ];

        // Convert features to rows
        const rows = features.map(feature => [
            feature.id || '',
            feature.description || '',
            this.managers.feature?.getCategoryName(currentProject, feature.category) || '',
            this.managers.feature?.getFeatureTypeName(currentProject, feature.featureType) || '',
            this.managers.feature?.getSupplierName(currentProject, feature.supplier) || '',
            feature.realManDays || 0,
            feature.expertise || 100,
            feature.riskMargin || 0,
            feature.manDays || 0,
            feature.notes || '',
            feature.created ? new Date(feature.created).toLocaleDateString() : '',
            feature.modified ? new Date(feature.modified).toLocaleDateString() : ''
        ]);

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // Set column widths
        const columnWidths = [
            {wch: 12}, {wch: 40}, {wch: 15}, {wch: 18}, {wch: 15},
            {wch: 12}, {wch: 12}, {wch: 12}, {wch: 15},
            {wch: 30}, {wch: 12}, {wch: 12}
        ];
        worksheet['!cols'] = columnWidths;

        return worksheet;
    }

    /**
     * Create Excel sheet for phases data
     */
    createPhasesSheet() {
        if (!this.managers.projectPhases || !this.currentProject) {
            return XLSX.utils.aoa_to_sheet([['No phases data available']]);
        }

        const phases = this.managers.projectPhases.getProjectPhases() || [];
        
        // Headers
        const headers = [
            'Phase', 'Man Days', 'G1 (MDs)', 'G2 (MDs)', 'TA (MDs)', 'PM (MDs)',
            'G1 Cost', 'G2 Cost', 'TA Cost', 'PM Cost', 'Total Cost'
        ];

        // Convert phases to rows
        const rows = phases.map(phase => {
            const manDaysByResource = this.managers.projectPhases.calculateManDaysByResource(phase.manDays, phase.effort) || {};
            const costByResource = this.managers.projectPhases.calculateCostByResource(manDaysByResource, phase) || {};

            return [
                phase.name || '',
                phase.manDays || 0,
                manDaysByResource.G1?.toFixed(1) || '0.0',
                manDaysByResource.G2?.toFixed(1) || '0.0', 
                manDaysByResource.TA?.toFixed(1) || '0.0',
                manDaysByResource.PM?.toFixed(1) || '0.0',
                costByResource.G1 || 0,
                costByResource.G2 || 0,
                costByResource.TA || 0,
                costByResource.PM || 0,
                Object.values(costByResource).reduce((sum, cost) => sum + (cost || 0), 0)
            ];
        });

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // Set column widths
        const columnWidths = [
            {wch: 20}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10},
            {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 15}
        ];
        worksheet['!cols'] = columnWidths;

        return worksheet;
    }

    /**
     * Create Excel sheet for calculations data
     */
    createCalculationsSheet() {
        // Create basic calculations sheet
        const data = [
            ['PROJECT CALCULATIONS', '', '', '', ''],
            ['Project Name', this.currentProject?.project?.name || '', '', '', ''],
            ['Export Date', new Date().toLocaleDateString(), '', '', ''],
            ['', '', '', '', ''], // Empty row
            ['FEATURES SUMMARY', '', '', '', ''],
            ['Total Features', this.currentProject?.features?.length || 0, '', '', ''],
            ['Total Man Days', this.currentProject?.features?.reduce((sum, f) => sum + (f.manDays || 0), 0)?.toFixed(1) || '0.0', '', '', '']
        ];

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Set column widths
        worksheet['!cols'] = [
            {wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}
        ];

        return worksheet;
    }

    /**
     * Export global configuration
     */
    async exportGlobalConfiguration() {
        try {
            const globalConfig = this.managers.config.getGlobalConfig();
            const filename = `global-configuration-${new Date().toISOString().split('T')[0]}.json`;

            const dataStr = JSON.stringify(globalConfig, null, 2);
            this.helpers.downloadAsFile(dataStr, filename, 'application/json');

            if (window.NotificationManager) {
                NotificationManager.show('Global configuration exported successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to export global configuration:', error);
            if (window.NotificationManager) {
                NotificationManager.show('Failed to export global configuration', 'error');
            }
        }
    }

    /**
     * Handle menu actions from main process
     */
    async handleMenuAction(action) {
        try {
            const actionHandlers = {
                'new-project': () => this.newProject(),
                'open-project': () => this.openProject(),
                'close-project': () => this.closeProject(),
                'save-project': () => this.saveProject(),
                'save-project-as': () => this.saveProjectAs(),
                'open-project-manager': () => this.managers.navigation.navigateTo('projects'),
                'open-features-management': () => this.managers.navigation.navigateTo('features'),
                'open-project-phases': () => this.managers.navigation.navigateTo('phases'),
                'open-calculations': () => this.managers.navigation.navigateTo('calculations'),
                'open-version-history': () => this.managers.navigation.navigateTo('history'),
                'show-recent-projects': () => this.managers.project?.showLoadProjectModal(),
                'load-project-file': () => this.managers.project?.importProject(),
                'import-project': () => this.managers.project?.importProject(),
                'export-json': () => this.exportProject('json'),
                'export-csv': () => this.exportProject('csv'),
                'export-excel': () => this.exportProject('excel'),
                'backup-data': () => this.backupData(),
                'restore-data': () => this.restoreData(),
                'open-settings': () => this.managers.navigation.navigateTo('configuration')
            };

            const handler = actionHandlers[action];
            if (handler) {
                await handler();
            } else {
                console.warn(`Unknown menu action: ${action}`);
            }

        } catch (error) {
            this.handleError(`Menu action failed: ${action}`, error);
        }
    }

    /**
     * Create new project
     */
    async newProject() {
        if (this.isDirty) {
            const save = await this.confirmSave();
            if (save === null) return; // User cancelled
            if (save) await this.saveProject();
        }

        this.currentProject = await this.createNewProject();
        this.isDirty = false;

        this.managers.navigation.onProjectLoaded();
        this.managers.version?.onProjectChanged(this.currentProject);
        
        this.refreshDropdowns();
        this.updateUI();

        // Reset phases after UI updates
        setTimeout(() => {
            this.managers.projectPhases?.resetAllPhaseData();
        }, 100);

        // Create initial version
        setTimeout(async () => {
            try {
                await this.managers.version?.createVersion('Initial project creation');
            } catch (error) {
                console.error('Failed to create initial version:', error);
            }
        }, 600);

        if (window.NotificationManager) {
            NotificationManager.show('New project created successfully', 'success');
        }
    }

    /**
     * Save project
     */
    async saveProject() {
        if (!this.currentProject) return false;

        try {
            this.showLoading('Saving project...');

            // Update project metadata
            this.currentProject.project.lastModified = new Date().toISOString();

            // Ensure hierarchical config format
            if (!this.currentProject.config.projectOverrides) {
                this.currentProject.config = this.managers.config.migrateProjectConfig(this.currentProject.config);
            }

            // Save phases configuration
            await this.saveProjectPhasesConfiguration();

            // Save through data manager
            await this.managers.data.saveProject(this.currentProject);

            this.isDirty = false;
            this.managers.navigation.onProjectDirty(false);
            this.updateProjectStatus();

            // Update project manager
            this.managers.project?.loadSavedProjects();
            this.managers.project?.updateCurrentProjectUI();

            this.refreshDropdowns();

            // Debug version update conditions
            console.log('🔍 DEBUG - Version manager available:', !!this.managers.version);
            console.log('🔍 DEBUG - Current project available:', !!this.currentProject);
            console.log('🔍 DEBUG - Current project versions:', this.currentProject?.versions?.length || 0);
            console.log('🔍 DEBUG - Current project versions array:', this.currentProject?.versions);

            // Update current version with latest project state after successful save
            if (this.managers.version && this.currentProject && this.currentProject.versions && this.currentProject.versions.length > 0) {
                console.log('🔍 SAVE UPDATE - Updating current version with latest project state');
                console.log('🔍 SAVE UPDATE - Current project features:', this.currentProject.features?.length || 0);
                console.log('🔍 SAVE UPDATE - Current project coverage:', this.currentProject.coverage);
                await this.managers.version.updateCurrentVersion();
                
                // Save the project again to persist the updated version data
                console.log('🔍 SAVE UPDATE - Saving updated version data to disk');
                await this.managers.data.saveProject(this.currentProject);
                
                // Update version manager UI if it's currently visible
                if (this.managers.navigation.currentSection === 'versions') {
                    this.managers.version.render();
                }
                
                console.log('🔍 SAVE UPDATE - Current version updated and saved successfully');
            } else {
                console.log('🔍 SAVE UPDATE - Skipping version update. Conditions not met.');
            }

            if (window.NotificationManager) {
                NotificationManager.show('Project saved successfully', 'success');
            }

            return true;

        } catch (error) {
            this.handleError('Failed to save project', error);
            return false;
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Save project phases configuration
     */
    async saveProjectPhasesConfiguration() {
        if (!this.managers.projectPhases || !this.currentProject) return;

        try {
            const currentPhases = this.managers.projectPhases.getProjectPhases();
            const selectedSuppliers = this.managers.projectPhases.selectedSuppliers;

            const phasesObject = {};
            currentPhases.forEach(phase => {
                phasesObject[phase.id] = {
                    manDays: phase.manDays,
                    effort: phase.effort,
                    assignedResources: phase.assignedResources || [],
                    cost: this.managers.projectPhases.calculatePhaseTotalCost(phase),
                    lastModified: phase.lastModified
                };
            });

            phasesObject.selectedSuppliers = { ...selectedSuppliers };
            this.currentProject.phases = phasesObject;

        } catch (error) {
            console.error('Failed to save phases configuration:', error);
        }
    }

    /**
     * Mark project as dirty
     */
    markDirty() {
        this.isDirty = true;
        this.managers.navigation.onProjectDirty(true);
        this.updateProjectStatus();

        // Update phases if needed
        if (this.managers.projectPhases) {
            this.managers.projectPhases.calculateDevelopmentPhase();

            if (this.managers.navigation.currentSection === 'phases') {
                const phasesPage = this.getElement('phases-page');
                if (phasesPage?.classList.contains('active')) {
                    this.managers.projectPhases.updateCalculations();
                }
            }
        }
    }

    /**
     * Update UI components
     */
    updateUI() {
        this.updateProjectInfo();
        this.updateProjectStatus();
        this.managers.feature?.refreshTable();
        this.updateSummary();
        this.updateConfigurationStatus();
        
        // Update section-specific managers
        const currentSection = this.managers.navigation?.currentSection;
        if (currentSection === 'phases' && this.managers.projectPhases) {
            this.managers.projectPhases.refreshFromFeatures();
        }
        if (currentSection === 'calculations' && this.managers.calculations) {
            this.managers.calculations.refresh();
        }
    }

    /**
     * Update project information display
     */
    updateProjectInfo() {
        const projectNameEl = this.getElement('title-project-name');
        if (!projectNameEl) return;

        if (this.currentProject && this.currentProject.project && this.currentProject.project.name) {
            projectNameEl.textContent = this.currentProject.project.name;
        } else {
            projectNameEl.textContent = 'No Project';
        }
    }

    /**
     * Update project status indicator
     */
    updateProjectStatus() {
        const statusEl = this.getElement('project-status');
        if (statusEl) {
            statusEl.className = this.isDirty ? 'unsaved' : 'saved';
            statusEl.textContent = this.isDirty ? '●' : '○';
        }
    }

    /**
     * Update summary calculations
     */
    updateSummary() {
        if (!this.currentProject) return;

        const features = this.currentProject.features;
        const totalFeatures = features.length;
        const totalManDays = features.reduce((sum, feature) => sum + (feature.manDays || 0), 0);
        const averageManDays = totalFeatures > 0 ? (totalManDays / totalFeatures).toFixed(1) : 0;
        const defaultCoverage = (totalManDays * 0.3).toFixed(1);

        // Update display elements
        this.updateElementContent('total-features', totalFeatures);
        this.updateElementContent('total-man-days', totalManDays.toFixed(1));
        this.updateElementContent('average-man-days', averageManDays);
        
        // Update coverage
        this.updateCoverage(defaultCoverage);
        this.updateCoverageResetButtonVisibility();
    }

    /**
     * Update coverage field
     */
    updateCoverage(defaultCoverage) {
        const coverageEl = this.getElement('coverage-value');
        if (!coverageEl || !this.currentProject) return;

        const coverageIsAutoCalculated = this.currentProject.coverageIsAutoCalculated !== false;
        
        if (coverageIsAutoCalculated || this.currentProject.coverage === undefined) {
            coverageEl.value = defaultCoverage;
            this.currentProject.coverage = parseFloat(defaultCoverage);
            this.currentProject.coverageIsAutoCalculated = true;
        } else {
            coverageEl.value = this.currentProject.coverage;
        }
    }

    /**
     * Reset coverage to automatic calculation
     */
    resetCoverageToAuto() {
        if (!this.currentProject) return;

        const features = this.currentProject.features;
        const totalManDays = features.reduce((sum, feature) => sum + (feature.manDays || 0), 0);
        const defaultCoverage = (totalManDays * 0.3).toFixed(1);

        this.currentProject.coverage = parseFloat(defaultCoverage);
        this.currentProject.coverageIsAutoCalculated = true;

        const coverageEl = this.getElement('coverage-value');
        if (coverageEl) {
            coverageEl.value = defaultCoverage;
        }

        this.updateCoverageResetButtonVisibility();
        this.markDirty();

        if (this.managers.navigation.currentSection === 'phases') {
            this.managers.projectPhases?.calculateDevelopmentPhase();
            this.managers.projectPhases?.updateCalculations();
        }
    }

    /**
     * Update coverage reset button visibility
     */
    updateCoverageResetButtonVisibility() {
        const resetBtn = this.getElement('coverage-reset-btn');
        if (resetBtn && this.currentProject) {
            const isManuallySet = this.currentProject.coverageIsAutoCalculated === false;
            resetBtn.classList.toggle('hidden', !isManuallySet);
        }
    }

    /**
     * Update configuration status
     */
    updateConfigurationStatus() {
        if (!this.managers.config || !this.currentProject) return;

        const stats = this.managers.config.getConfigStats(this.currentProject.config);
        const statusMessage = this.getElement('status-message');
        
        if (statusMessage && stats) {
            const projectSpecificCount = stats.suppliers.projectSpecific +
                stats.internalResources.projectSpecific +
                stats.categories.projectSpecific;

            statusMessage.textContent = projectSpecificCount > 0
                ? `Ready - ${projectSpecificCount} project-specific configurations`
                : 'Ready - Using global configuration';
        }
    }

    /**
     * Refresh all dropdowns
     */
    refreshDropdowns() {
        this.managers.feature?.refreshDropdowns();
    }

    /**
     * Update navigation state based on current project
     */
    updateNavigationState() {
        const hasProject = this.currentProject &&
            this.currentProject.project &&
            this.currentProject.project.name !== 'New Project';

        if (hasProject) {
            this.managers.navigation.onProjectLoaded();
            this.managers.navigation.onProjectDirty(this.isDirty);
        } else {
            this.managers.navigation.onProjectClosed();
        }
    }

    /**
     * Load last saved project
     */
    async loadLastProject() {
        try {
            // Check if we have a method to load the last project, otherwise skip
            let lastProject = null;
            if (this.managers.data.loadLastProject) {
                // Use the specific loadLastProject method if available
                lastProject = await this.managers.data.loadLastProject();
            } else if (this.managers.data.getLastProject) {
                // Try alternative method
                const lastProjectPath = await this.managers.data.getLastProject();
                if (lastProjectPath) {
                    lastProject = await this.managers.data.loadProject(lastProjectPath);
                }
            } else {
                // Skip loading last project if no appropriate method exists
                console.log('No last project loading method available, skipping...');
                return;
            }
            if (lastProject) {
                this.currentProject = await this.migrateProjectConfig(lastProject);
                
                this.managers.version?.onProjectChanged(this.currentProject);
                this.managers.projectPhases?.synchronizeWithProject();
                this.managers.calculations?.calculateVendorCosts();
                
                this.phasesManager = this.managers.projectPhases; // Legacy reference
                this.updateNavigationState();
                this.refreshDropdowns();
            }

            // Restore navigation state
            if (window.NavigationStateManager) {
                const savedNavState = NavigationStateManager.loadState();
                if (savedNavState) {
                    this.managers.navigation.restoreNavigationState(savedNavState);
                }
            }

        } catch (error) {
            console.warn('Failed to load last project:', error);
        }
    }

    /**
     * Migrate project configuration to hierarchical format
     */
    async migrateProjectConfig(projectData) {
        if (!projectData.config) {
            projectData.config = await this.managers.config.initializeProjectConfig();
        } else if (!projectData.config.projectOverrides) {
            projectData.config = this.managers.config.migrateProjectConfig(projectData.config);
        }

        console.log('Project configuration migrated to hierarchical format');
        return projectData;
    }

    /**
     * Show confirmation dialog for save
     */
    confirmSave() {
        return new Promise((resolve) => {
            const result = confirm('You have unsaved changes. Do you want to save before continuing?');
            resolve(result);
        });
    }

    /**
     * Update element content safely
     */
    updateElementContent(elementId, content) {
        const element = this.getElement(elementId);
        if (element) {
            element.textContent = content;
        }
    }

    /**
     * Get phases summary
     */
    getPhasesSummary() {
        if (this.managers.projectPhases) {
            return {
                totalCost: this.managers.projectPhases.getTotalProjectCost(),
                totalManDays: this.managers.projectPhases.getTotalProjectManDays(),
                phases: this.managers.projectPhases.getProjectPhases(),
                validation: this.managers.projectPhases.validateAllPhases()
            };
        }
        return null;
    }

    /**
     * Handle application close request
     */
    async handleCloseRequest() {
        console.log('Application close requested, checking for unsaved changes...');
        
        if (!this.isDirty || !this.currentProject) {
            console.log('No unsaved changes, confirming close');
            window.electronAPI?.confirmWindowClose(true);
            return;
        }

        try {
            const result = confirm('You have unsaved changes. Do you want to save before continuing?');
            
            if (result) {
                const saveResult = await this.saveProject();
                if (saveResult) {
                    await this.performProjectClose();
                    window.electronAPI?.confirmWindowClose(true);
                } else {
                    window.electronAPI?.confirmWindowClose(false);
                }
            } else {
                await this.performProjectClose();
                window.electronAPI?.confirmWindowClose(true);
            }
        } catch (error) {
            this.handleError('Error handling close request', error);
            await this.performProjectClose();
            window.electronAPI?.confirmWindowClose(true);
        }
    }

    /**
     * Close project without confirmation
     */
    async performProjectClose() {
        this.currentProject = await this.createNewProject();
        this.isDirty = false;
        
        this.managers.version?.onProjectChanged(null);
        this.managers.projectPhases?.resetAllPhaseData();
        this.managers.navigation.onProjectClosed();
        
        this.refreshDropdowns();
        this.updateUI();
        
        if (window.NotificationManager) {
            NotificationManager.info('Project closed');
        }
    }

    onDestroy() {
        // Save navigation state
        if (this.managers.navigation && window.NavigationStateManager) {
            NavigationStateManager.saveState(this.managers.navigation);
        }

        // Clear configuration cache
        this.managers.config?.clearCache();
        
        // Destroy all managers
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.destroy === 'function') {
                manager.destroy();
            }
        });
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ApplicationController = ApplicationController;
}