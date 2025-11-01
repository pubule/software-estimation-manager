/**
 * Application Controller (Refactored)
 * Main application orchestrator with improved structure and separation of concerns
 */

class ApplicationController extends BaseComponent {
    constructor() {
        super('ApplicationController');
        
        // Connect to the application store (available globally)
        this.store = window.appStore;
        
        // Store subscription for reactive updates
        this.storeUnsubscribe = null;
        
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
            projectPhases: null
        };

        // Bind methods
        this.handleMenuAction = this.handleMenuAction.bind(this);
        this.handleCloseRequest = this.handleCloseRequest.bind(this);
        this.markDirty = this.markDirty.bind(this);
        
        // REMOVED: this.updateUI.bind(this) → Method eliminated in pure state manager
        
        // Initialize store connection
        this.initializeStoreConnection();
    }
    /**
     * Initialize store connection and subscriptions
     */
    initializeStoreConnection() {
        // Check if store is available
        if (!this.store || !this.store.subscribe) {
            console.warn('Store not available for ApplicationController, will retry when storeReady event fires');
            
            // Listen for store ready event
            window.addEventListener('storeReady', () => {
                console.log('Store ready event received, initializing connection');
                this.store = window.appStore;
                this.initializeStoreConnection();
            }, { once: true });
            
            return;
        }
        
        console.log('Initializing ApplicationController store subscription');
        
        // CRITICAL: Initialize ALL component store connections synchronously
        this.initializeComponentStoreConnections();
        
        // Subscribe to store changes for reactive updates
        this.storeUnsubscribe = this.store.subscribe((state, prevState) => {
            // PURE STATE MANAGER: Only log changes, no direct method calls
            if (state.currentProject !== prevState.currentProject) {
                console.log('🏪 Project changed in store, updating UI');
            }
            
            if (state.isDirty !== prevState.isDirty) {
                console.log('🏪 Dirty state changed:', state.isDirty);
            }
            
            // React to navigation changes
            if (state.currentSection !== prevState.currentSection) {
                this.onSectionChanged(state.currentSection, prevState.currentSection);
            }
        });
        
        console.log('🏪 Store connection initialized');
    }
    
    /**
     * PURE STATE MANAGER: Initialize all component store connections synchronously
     * This ensures ALL components are connected BEFORE any state changes occur
     */
    initializeComponentStoreConnections() {
        console.log('🔄 Initializing component store connections synchronously...');
        
        // Force all managers to connect to store immediately if not already connected
        const managers = [
            this.managers.navigation,
            this.managers.project, 
            this.managers.feature,
            this.managers.notification,
            this.managers.modal
        ];
        
        managers.forEach(manager => {
            if (manager && !manager.store && manager.connectToStoreWhenReady) {
                // Force immediate connection instead of async retry
                manager.store = window.appStore;
                if (manager.setupStoreSubscription) {
                    manager.setupStoreSubscription();
                }
            }
        });
        
        console.log('✅ All component store connections initialized');
    }

    // REMOVED LEGACY METHODS:
    // - onProjectChanged() → Components react via store subscriptions
    // - onDirtyStateChanged() → Components react via store subscriptions
    // PURE STATE MANAGER: No direct method calls to components!

    /**
     * Handle section changes from store
     */
    onSectionChanged(currentSection, previousSection) {
        console.log('🏪 Section changed:', previousSection, '→', currentSection);
        
        // Update section-specific managers
        // REMOVED: Phase refresh now handled by React components
        // if (currentSection === 'phases' && this.managers.projectPhases) {
        //     this.managers.projectPhases.refreshFromFeatures();
        // }
        if (currentSection === 'calculations' && this.managers.calculations) {
            this.managers.calculations.refresh();
        }
    }

    /**
     * Getter for current project (maps to store)
     */
    get currentProject() {
        // Use StateSelectors for consistency
        return StateSelectors.getCurrentProject();
    }

    /**
     * Setter for current project (updates store)
     * Following State/Actions/Dispatcher pattern - NO business logic here!
     */
    set currentProject(project) {
        this.store.getState().setProject(project);
        // Store change will trigger subscription → Actions → Business Logic
    }

    /**
     * Getter for dirty state (maps to store)
     */
    get isDirty() {
        // Use StateSelectors for consistency  
        return StateSelectors.isProjectDirty();
    }

    /**
     * Method to mark project as dirty (updates store)
     */
    markDirty() {
        // Use StateSelectors for consistency
        StateSelectors.markProjectDirty();
        // The store subscription will handle the UI updates
    }

    async onInit() {
        await this.initializeComponents();
        this.setupEventListeners();
        // Removed automatic loading of last project - start with clean state
        // await this.loadLastProject();
        
        // REMOVED LEGACY CALLS FOR PURE STATE MANAGER:
        // this.updateNavigationState(); → NavigationManager handles via subscription
        // this.updateUI(); → All managers handle via subscriptions
        
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
                'EnhancedNavigationManager', 'ModalManager',
                'ProjectBusinessLogic', 'NotificationManager', 'Helpers'
            ];
            
            // Check for either original or refactored versions of core components
            const coreComponents = [
                { original: 'DataManager', refactored: 'DataManager' },
                { original: 'ConfigurationManager', refactored: 'ConfigurationManager' }
                // FeatureManager removed - now using React implementation
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
            
            // 🚨 ULTRA THINK FIX: NO automatic project creation on startup!
            // User should start with clean state without any project
            // REMOVED: Initialize default project if needed
            // if (!this.currentProject) {
            //     this.currentProject = await this.createNewProject();
            // }

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
        if (window.DataManager) {
            this.managers.data = new DataManager();
        } else {
            this.managers.data = new DataManager();
        }
        
        // Configuration manager (use refactored if available, otherwise original)
        if (window.ConfigurationManager) {
            this.managers.config = new ConfigurationManager(this.managers.data);
        } else {
            this.managers.config = new ConfigurationManager(this.managers.data);
        }
        await this.managers.config.init();

        // Load global resource allocations
        await this.loadResourceAllocations();

        // Initialize WorkingDaysCalculator instance globally
        if (window.WorkingDaysCalculator && typeof window.WorkingDaysCalculator === 'function') {
            window.WorkingDaysCalculator = new window.WorkingDaysCalculator();
            console.log('✅ WorkingDaysCalculator instance initialized');
        }

        console.log('Core managers initialized');

        // Set up backward compatibility aliases for original components
        this.dataManager = this.managers.data;
        this.configManager = this.managers.config;

        console.log('Backward compatibility aliases set up');
    }

    /**
     * Load global resource allocations from capacity/allocations.json
     */
    async loadResourceAllocations() {
        try {
            console.log('📦 Loading global resource allocations...');
            const allocations = await this.managers.data.loadResourceAllocations();

            // Save to store
            if (window.appStore) {
                window.appStore.getState().setResourceAllocations(allocations || []);
                console.log('✅ Resource allocations loaded:', allocations?.length || 0, 'items');
            }
        } catch (error) {
            console.error('❌ Failed to load resource allocations:', error);
            // Set empty array on error
            if (window.appStore) {
                window.appStore.getState().setResourceAllocations([]);
            }
        }
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
        // Feature manager - now using React implementation
        // ReactFeaturesWrapper will be initialized by NavigationManager when needed
        this.managers.feature = null; // Placeholder for compatibility
        
        // AssumptionsManager removed - migrated to React with State/Actions/Dispatcher pattern
        
        // CalculationsManager removed - migrated to React with State/Actions/Dispatcher pattern
        
        // Project business logic
        this.managers.project = new ProjectBusinessLogic(this);
        
        // REMOVED: React-only approach - ProjectPhasesManager no longer used
        // this.managers.projectPhases = new ProjectPhasesManager(this, this.managers.config);
        
        // REMOVED: Version manager (migrated to React)
        
        // Default config manager for loading defaults.json
        if (window.DefaultConfigManager) {
            this.managers.defaultConfig = new DefaultConfigManager();
            await this.managers.defaultConfig.loadConfiguration();
        }
        
        // Teams config manager for team management
        if (window.TeamsConfigManager) {
            this.managers.teams = new TeamsConfigManager(this, this.managers.config, this.managers.defaultConfig);
            await this.managers.teams.init();
        }
        
        console.log('Feature managers initialized');
        
        // Set up additional backward compatibility aliases
        this.featureManager = null; // React implementation - no longer needed
        this.calculationsManager = null; // Migrated to React - use window.appStore.getState().calculationsData
        this.projectManager = this.managers.project;
        // REMOVED: React-only approach
        // this.projectPhasesManager = this.managers.projectPhases;
        // REMOVED: Version manager (migrated to React)
        this.defaultConfigManager = this.managers.defaultConfig;
        this.teamsManager = this.managers.teams;
        
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

        // Add assumption button - now handled by React AssumptionsPage

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
            if (StateSelectors.getIsDirty()) {
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
            
            // PURE STATE MANAGER: Use store action instead of direct mutation
            this.store.getState().updateProjectCoverage(numericValue, false);
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
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject) return;

        try {
            this.showLoading(`Exporting to ${format.toUpperCase()}...`);

            const filename = `${currentProject.project.name}_${new Date().toISOString().split('T')[0]}`;

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
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject.config.projectOverrides) {
            currentProject.config = this.managers.config.migrateProjectConfig(currentProject.config);
        }

        if (window.electronAPI && window.electronAPI.saveFile) {
            const result = await window.electronAPI.saveFile(
                `${filename}.json`,
                currentProject
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
            // Check if ExcelJS library is available
            if (typeof ExcelJS === 'undefined') {
                // Try to load ExcelJS dynamically
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
                document.head.appendChild(script);
                
                // Wait for script to load
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Failed to load ExcelJS'));
                    setTimeout(() => reject(new Error('ExcelJS load timeout')), 5000);
                });
            }

            // Create new workbook with ExcelJS
            const workbook = new ExcelJS.Workbook();
            
            // Set workbook properties
            workbook.creator = 'Software Estimation Manager';
            workbook.lastModifiedBy = 'Software Estimation Manager';
            workbook.created = new Date();
            workbook.modified = new Date();

            // Create sheets with styling
            await this.createFeaturesSheetExcelJS(workbook);
            await this.createAssumptionsSheetExcelJS(workbook);
            await this.createPhasesSheetExcelJS(workbook);
            await this.createCalculationsSheetExcelJS(workbook);

            // Generate Excel buffer
            const buffer = await workbook.xlsx.writeBuffer();

            // Save file
            if (window.electronAPI && window.electronAPI.saveFileBuffer) {
                const result = await window.electronAPI.saveFileBuffer(
                    `${filename}.xlsx`,
                    buffer
                );
                if (!result.success && !result.canceled) {
                    throw new Error(result.error || 'Failed to save Excel file');
                }
            } else {
                // Fallback for web mode
                const blob = new Blob([buffer], { 
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
        const currentProject = StateSelectors.getCurrentProject();
        if (!this.managers.feature || !currentProject) {
            return XLSX.utils.aoa_to_sheet([['No features data available']]);
        }

        const features = currentProject.features || [];
        // currentProject already defined above via StateSelectors

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
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject || !currentProject.phases) {
            return XLSX.utils.aoa_to_sheet([['No phases data available']]);
        }

        // Convert phases object to array for Excel export
        const phasesObj = currentProject.phases || {};
        const phases = Object.entries(phasesObj).map(([key, phase]) => ({
            key,
            name: this.getPhaseDisplayName(key),
            ...phase
        }));
        
        // Headers
        const headers = [
            'Phase', 'Man Days', 'G1 (MDs)', 'G2 (MDs)', 'TA (MDs)', 'PM (MDs)',
            'G1 Cost', 'G2 Cost', 'TA Cost', 'PM Cost', 'Total Cost'
        ];

        // Convert phases to rows - simplified for React-only approach
        const rows = phases.map(phase => {
            // Basic export without complex calculations (React components handle calculations)
            const manDays = phase.manDays || 0;
            const cost = phase.cost || 0;

            return [
                phase.name || phase.key || '',
                manDays,
                '0.0', // G1 (MDs) - simplified export
                '0.0', // G2 (MDs) - simplified export  
                '0.0', // TA (MDs) - simplified export
                '0.0', // PM (MDs) - simplified export
                0, // G1 Cost - simplified export
                0, // G2 Cost - simplified export
                0, // TA Cost - simplified export
                0, // PM Cost - simplified export
                cost // Total Cost
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
     * Helper method to get display names for phases
     */
    getPhaseDisplayName(key) {
        const phaseNames = {
            functionalAnalysis: 'Functional Analysis',
            technicalAnalysis: 'Technical Analysis',
            development: 'Development',
            integrationTests: 'Integration Tests',
            uatTests: 'UAT Tests',
            vapt: 'VAPT (Security Testing)',
            consolidation: 'Consolidation',
            postGoLive: 'Post Go-Live Support'
        };
        return phaseNames[key] || key;
    }

    /**
     * Helper method to get phase type for Excel export
     */
    getPhaseType(key) {
        const phaseTypes = {
            functionalAnalysis: 'Analysis',
            technicalAnalysis: 'Analysis',
            development: 'Development',
            integrationTests: 'Testing',
            uatTests: 'Testing',
            vapt: 'Testing',
            consolidation: 'Support',
            postGoLive: 'Support'
        };
        return phaseTypes[key] || 'General';
    }

    /**
     * Helper method to get supplier rate for Excel export
     */
    getSupplierRate(supplierId) {
        if (!this.configManager || !this.currentProject) {
            return 0;
        }

        const projectConfig = this.currentProject.configuration || this.currentProject.config;
        const allSuppliers = [
            ...(this.configManager.getSuppliers(projectConfig) || []),
            ...(this.configManager.getInternalResources(projectConfig) || [])
        ];
        
        const supplier = allSuppliers.find(s => s.id === supplierId);
        return supplier ? (supplier.realRate || supplier.officialRate || 0) : 0;
    }

    /**
     * Create Excel sheet for assumptions data
     */
    createAssumptionsSheet() {
        const assumptions = this.currentProject?.assumptions || [];
        
        // Create headers
        const headers = [
            'ID',
            'Description',
            'Type',
            'Impact',
            'Notes',
            'Created',
            'Modified'
        ];

        // Convert data
        const data = [
            headers,
            ...assumptions.map(assumption => [
                assumption.id || '',
                assumption.description || '',
                assumption.type || '',
                assumption.impact || '',
                assumption.notes || '',
                assumption.created ? new Date(assumption.created).toLocaleDateString() : '',
                assumption.modified ? new Date(assumption.modified).toLocaleDateString() : ''
            ])
        ];

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        
        // Set column widths
        const colWidths = [
            { wch: 10 }, // ID
            { wch: 50 }, // Description
            { wch: 15 }, // Type
            { wch: 10 }, // Impact
            { wch: 30 }, // Notes
            { wch: 12 }, // Created
            { wch: 12 }  // Modified
        ];
        worksheet['!cols'] = colWidths;

        return worksheet;
    }

    /**
     * Create Excel sheet for calculations data
     */
    createCalculationsSheet() {
        // Get calculations data from new React system (migrated from legacy CalculationsManager)
        // Use calculationsActions to calculate and get data from store
        if (window.calculationsActions && window.appStore) {
            try {
                window.calculationsActions.calculateProjectCosts();
            } catch (error) {
                console.error('Failed to calculate project costs for export:', error);
            }
        }
        
        // Get calculated data directly from store (new React pattern)
        const store = window.appStore;
        const state = store?.getState();
        const calculationsData = state?.calculationsData || {};
        const vendorCosts = calculationsData.vendorCosts || [];
        const kpiData = calculationsData.kpiData || {};
        
        // Create basic header
        const data = [
            ['PROJECT CALCULATIONS', '', '', '', '', '', '', ''],
            ['Project Name', this.currentProject?.project?.name || '', '', '', '', '', '', ''],
            ['Export Date', new Date().toLocaleDateString(), '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''], // Empty row
            
            // Features Summary
            ['FEATURES SUMMARY', '', '', '', '', '', '', ''],
            ['Total Features', this.currentProject?.features?.length || 0, '', '', '', '', '', ''],
            ['Total Man Days', this.currentProject?.features?.reduce((sum, f) => sum + (f.manDays || 0), 0)?.toFixed(1) || '0.0', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''], // Empty row
        ];

        // Add Vendor Costs Breakdown
        data.push(['VENDOR COSTS BREAKDOWN', '', '', '', '', '', '', '']);
        data.push(['Vendor', 'Role', 'Department', 'Man Days', 'Rate (€)', 'Cost (€)', 'Final MDs', 'Final Cost (€)']);
        
        if (vendorCosts.length > 0) {
            vendorCosts.forEach(cost => {
                const finalCost = cost.finalMDs ? (cost.finalMDs * cost.officialRate) : cost.cost;
                data.push([
                    cost.vendor || '',
                    cost.role || '',
                    cost.department || '',
                    cost.manDays?.toFixed(1) || '0.0',
                    cost.officialRate?.toFixed(0) || '0',
                    cost.cost?.toFixed(0) || '0',
                    cost.finalMDs?.toFixed(1) || cost.manDays?.toFixed(1) || '0.0',
                    finalCost?.toFixed(0) || '0'
                ]);
            });
            
            // Add totals row
            const totalManDays = vendorCosts.reduce((sum, c) => sum + (c.manDays || 0), 0);
            const totalCost = vendorCosts.reduce((sum, c) => sum + (c.cost || 0), 0);
            const totalFinalMDs = vendorCosts.reduce((sum, c) => sum + (c.finalMDs || c.manDays || 0), 0);
            const totalFinalCost = vendorCosts.reduce((sum, c) => {
                const finalCost = c.finalMDs ? (c.finalMDs * c.officialRate) : c.cost;
                return sum + (finalCost || 0);
            }, 0);
            
            data.push(['TOTAL', '', '', 
                totalManDays.toFixed(1), 
                '', 
                totalCost.toFixed(0),
                totalFinalMDs.toFixed(1),
                totalFinalCost.toFixed(0)
            ]);
        } else {
            data.push(['No vendor costs calculated', '', '', '', '', '', '', '']);
        }
        
        data.push(['', '', '', '', '', '', '', '']); // Empty row
        
        // Add KPI Summary
        data.push(['KPI SUMMARY', '', '', '', '', '', '', '']);
        data.push(['Category', 'Internal (€)', 'External (€)', 'Total (€)', '', '', '', '']);
        
        const gtoInternal = kpiData.gto?.internal || 0;
        const gtoExternal = kpiData.gto?.external || 0;
        const gtoTotal = kpiData.gto?.total || 0;
        
        const gdsInternal = kpiData.gds?.internal || 0;
        const gdsExternal = kpiData.gds?.external || 0;
        const gdsTotal = kpiData.gds?.total || 0;
        
        data.push(['GTO (Technical)', gtoInternal.toFixed(0), gtoExternal.toFixed(0), gtoTotal.toFixed(0), '', '', '', '']);
        data.push(['GDS (Management)', gdsInternal.toFixed(0), gdsExternal.toFixed(0), gdsTotal.toFixed(0), '', '', '', '']);
        data.push(['TOTAL', 
            (gtoInternal + gdsInternal).toFixed(0),
            (gtoExternal + gdsExternal).toFixed(0),
            (gtoTotal + gdsTotal).toFixed(0),
            '', '', '', ''
        ]);
        
        data.push(['', '', '', '', '', '', '', '']); // Empty row
        
        // Add Summary by Vendor
        data.push(['SUMMARY BY VENDOR', '', '', '', '', '', '', '']);
        data.push(['Vendor', 'Total Man Days', 'Total Cost (€)', '', '', '', '', '']);
        
        // Group costs by vendor
        const vendorSummary = {};
        vendorCosts.forEach(cost => {
            if (!vendorSummary[cost.vendorName]) {
                vendorSummary[cost.vendorName] = {
                    manDays: 0,
                    cost: 0
                };
            }
            vendorSummary[cost.vendorName].manDays += cost.finalMDs || cost.estimatedMDs || 0;
            const finalCost = cost.finalMDs ? (cost.finalMDs * cost.officialRate) : cost.totCost;
            vendorSummary[cost.vendorName].cost += finalCost || 0;
        });
        
        // Add vendor summary rows
        Object.entries(vendorSummary).forEach(([vendor, summary]) => {
            data.push([
                vendor,
                summary.manDays.toFixed(1),
                summary.cost.toFixed(0),
                '', '', '', '', ''
            ]);
        });
        
        // Add grand total
        const grandTotalMDs = Object.values(vendorSummary).reduce((sum, s) => sum + s.manDays, 0);
        const grandTotalCost = Object.values(vendorSummary).reduce((sum, s) => sum + s.cost, 0);
        
        data.push(['GRAND TOTAL', 
            grandTotalMDs.toFixed(1),
            grandTotalCost.toFixed(0),
            '', '', '', '', ''
        ]);

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Set column widths
        worksheet['!cols'] = [
            {wch: 25}, // Vendor
            {wch: 12}, // Role
            {wch: 15}, // Department
            {wch: 12}, // Man Days
            {wch: 12}, // Rate
            {wch: 12}, // Cost
            {wch: 12}, // Final MDs
            {wch: 15}  // Final Cost
        ];

        return worksheet;
    }

    /**
     * Create styled calculations sheet using ExcelJS
     */
    async createCalculationsSheetExcelJS(workbook) {
        const worksheet = workbook.addWorksheet('Calculations', {
            properties: { tabColor: { argb: 'FF0066CC' } },
            views: [{ state: 'frozen', ySplit: 1 }]
        });

        // Get calculations data from new React system (migrated from legacy CalculationsManager)
        // Use calculationsActions to calculate and get data from store
        if (window.calculationsActions && window.appStore) {
            try {
                window.calculationsActions.calculateProjectCosts();
            } catch (error) {
                console.error('Failed to calculate project costs for export:', error);
            }
        }
        
        // Get calculated data directly from store (new React pattern)
        const store = window.appStore;
        const state = store?.getState();
        const calculationsData = state?.calculationsData || {};
        const vendorCosts = calculationsData.vendorCosts || [];
        const kpiData = calculationsData.kpiData || {};
        
        // Define styles
        const styles = {
            title: {
                font: { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } },
                alignment: { horizontal: 'center', vertical: 'middle' }
            },
            header: {
                font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
                alignment: { horizontal: 'left', vertical: 'middle' },
                border: {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                }
            },
            sectionHeader: {
                font: { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0066CC' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } },
                alignment: { horizontal: 'left', vertical: 'middle' }
            },
            tableHeader: {
                font: { name: 'Calibri', size: 11, bold: true },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                }
            },
            dataCell: {
                font: { name: 'Calibri', size: 11 },
                alignment: { horizontal: 'left', vertical: 'middle' },
                border: {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                }
            },
            numberCell: {
                font: { name: 'Calibri', size: 11 },
                alignment: { horizontal: 'right', vertical: 'middle' },
                numFmt: '#,##0.0',
                border: {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                }
            },
            currencyCell: {
                font: { name: 'Calibri', size: 11 },
                alignment: { horizontal: 'right', vertical: 'middle' },
                numFmt: '€ #,##0',
                border: {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                }
            },
            totalRow: {
                font: { name: 'Calibri', size: 11, bold: true },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } },
                border: {
                    top: { style: 'double', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } }
                }
            }
        };

        let row = 1;

        // Title
        worksheet.mergeCells(`A${row}:H${row}`);
        const titleCell = worksheet.getCell(`A${row}`);
        titleCell.value = 'PROJECT CALCULATIONS';
        titleCell.style = styles.title;
        worksheet.getRow(row).height = 30;
        row++;

        row++; // Empty row

        // Features Summary Section
        worksheet.mergeCells(`A${row}:H${row}`);
        const featuresHeaderCell = worksheet.getCell(`A${row}`);
        featuresHeaderCell.value = 'FEATURES SUMMARY';
        featuresHeaderCell.style = styles.sectionHeader;
        row++;

        // Get current project from store to ensure fresh data
        const currentProject = StateSelectors.getCurrentProject();

        worksheet.getCell(`A${row}`).value = 'Total Features:';
        worksheet.getCell(`A${row}`).style = { font: { bold: true } };
        worksheet.getCell(`B${row}`).value = currentProject?.features?.length || 0;
        row++;

        worksheet.getCell(`A${row}`).value = 'Total Man Days:';
        worksheet.getCell(`A${row}`).style = { font: { bold: true } };
        const totalMD = currentProject?.features?.reduce((sum, f) => sum + (f.manDays || 0), 0) || 0;
        worksheet.getCell(`B${row}`).value = totalMD;
        worksheet.getCell(`B${row}`).style = styles.numberCell;
        row++;

        worksheet.getCell(`A${row}`).value = 'Coverage:';
        worksheet.getCell(`A${row}`).style = { font: { bold: true } };
        worksheet.getCell(`B${row}`).value = currentProject?.coverage || 0;
        worksheet.getCell(`B${row}`).style = styles.numberCell;
        row++;
        row++; // Empty row

        // Vendor Costs Breakdown Section
        worksheet.mergeCells(`A${row}:H${row}`);
        const vendorHeaderCell = worksheet.getCell(`A${row}`);
        vendorHeaderCell.value = 'VENDOR COSTS BREAKDOWN';
        vendorHeaderCell.style = styles.sectionHeader;
        row++;

        // Table headers
        const headers = ['Vendor', 'Role', 'Department', 'Man Days', 'Rate (€)', 'Cost (€)', 'Final MDs', 'Final Cost (€)'];
        headers.forEach((header, index) => {
            const cell = worksheet.getCell(row, index + 1);
            cell.value = header;
            cell.style = styles.tableHeader;
        });
        row++;

        // Vendor costs data
        if (vendorCosts.length > 0) {
            vendorCosts.forEach((cost, index) => {
                const finalCost = cost.finalMDs ? (cost.finalMDs * cost.officialRate) : cost.totCost;

                // Alternate row colors
                const rowStyle = index % 2 === 0 ?
                    { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } } } : {};

                worksheet.getCell(row, 1).value = cost.vendorName || '';
                worksheet.getCell(row, 1).style = { ...styles.dataCell, ...rowStyle };

                worksheet.getCell(row, 2).value = cost.role || '';
                worksheet.getCell(row, 2).style = { ...styles.dataCell, ...rowStyle };

                worksheet.getCell(row, 3).value = cost.department || '';
                worksheet.getCell(row, 3).style = { ...styles.dataCell, ...rowStyle };

                worksheet.getCell(row, 4).value = cost.estimatedMDs || 0;
                worksheet.getCell(row, 4).style = { ...styles.numberCell, ...rowStyle };

                worksheet.getCell(row, 5).value = cost.officialRate || 0;
                worksheet.getCell(row, 5).style = { ...styles.currencyCell, ...rowStyle };

                worksheet.getCell(row, 6).value = cost.totCost || 0;
                worksheet.getCell(row, 6).style = { ...styles.currencyCell, ...rowStyle };

                worksheet.getCell(row, 7).value = cost.finalMDs || cost.estimatedMDs || 0;
                worksheet.getCell(row, 7).style = { ...styles.numberCell, ...rowStyle };

                worksheet.getCell(row, 8).value = finalCost || 0;
                worksheet.getCell(row, 8).style = { ...styles.currencyCell, ...rowStyle };

                row++;
            });
            
            // Totals row
            const totalManDays = vendorCosts.reduce((sum, c) => sum + (c.estimatedMDs || 0), 0);
            const totalCost = vendorCosts.reduce((sum, c) => sum + (c.totCost || 0), 0);
            const totalFinalMDs = vendorCosts.reduce((sum, c) => sum + (c.finalMDs || c.estimatedMDs || 0), 0);
            const totalFinalCost = vendorCosts.reduce((sum, c) => {
                const finalCost = c.finalMDs ? (c.finalMDs * c.officialRate) : c.totCost;
                return sum + (finalCost || 0);
            }, 0);
            
            worksheet.getCell(row, 1).value = 'TOTAL';
            worksheet.getCell(row, 1).style = { ...styles.totalRow, font: { bold: true } };
            worksheet.getCell(row, 2).style = styles.totalRow;
            worksheet.getCell(row, 3).style = styles.totalRow;
            
            worksheet.getCell(row, 4).value = totalManDays;
            worksheet.getCell(row, 4).style = { ...styles.numberCell, ...styles.totalRow };
            
            worksheet.getCell(row, 5).style = styles.totalRow;
            
            worksheet.getCell(row, 6).value = totalCost;
            worksheet.getCell(row, 6).style = { ...styles.currencyCell, ...styles.totalRow };
            
            worksheet.getCell(row, 7).value = totalFinalMDs;
            worksheet.getCell(row, 7).style = { ...styles.numberCell, ...styles.totalRow };
            
            worksheet.getCell(row, 8).value = totalFinalCost;
            worksheet.getCell(row, 8).style = { ...styles.currencyCell, ...styles.totalRow };
            row++;
        } else {
            worksheet.mergeCells(`A${row}:H${row}`);
            worksheet.getCell(`A${row}`).value = 'No vendor costs calculated';
            worksheet.getCell(`A${row}`).style = { font: { italic: true }, alignment: { horizontal: 'center' } };
            row++;
        }
        row++; // Empty row

        // KPI Summary Section
        worksheet.mergeCells(`A${row}:H${row}`);
        const kpiHeaderCell = worksheet.getCell(`A${row}`);
        kpiHeaderCell.value = 'KPI SUMMARY';
        kpiHeaderCell.style = { ...styles.sectionHeader, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } } };
        row++;

        // KPI table headers
        ['Category', 'Internal (€)', 'External (€)', 'Total (€)'].forEach((header, index) => {
            const cell = worksheet.getCell(row, index + 1);
            cell.value = header;
            cell.style = styles.tableHeader;
        });
        worksheet.mergeCells(`D${row}:H${row}`);
        row++;

        // KPI data
        const gtoInternal = kpiData.gto?.internal || 0;
        const gtoExternal = kpiData.gto?.external || 0;
        const gtoTotal = kpiData.gto?.total || 0;
        
        const gdsInternal = kpiData.gds?.internal || 0;
        const gdsExternal = kpiData.gds?.external || 0;
        const gdsTotal = kpiData.gds?.total || 0;

        // GTO row
        worksheet.getCell(row, 1).value = 'GTO (Technical)';
        worksheet.getCell(row, 1).style = { ...styles.dataCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6FF' } } };
        worksheet.getCell(row, 2).value = gtoInternal;
        worksheet.getCell(row, 2).style = styles.currencyCell;
        worksheet.getCell(row, 3).value = gtoExternal;
        worksheet.getCell(row, 3).style = styles.currencyCell;
        worksheet.getCell(row, 4).value = gtoTotal;
        worksheet.getCell(row, 4).style = { ...styles.currencyCell, font: { bold: true } };
        row++;

        // GDS row
        worksheet.getCell(row, 1).value = 'GDS (Management)';
        worksheet.getCell(row, 1).style = { ...styles.dataCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } } };
        worksheet.getCell(row, 2).value = gdsInternal;
        worksheet.getCell(row, 2).style = styles.currencyCell;
        worksheet.getCell(row, 3).value = gdsExternal;
        worksheet.getCell(row, 3).style = styles.currencyCell;
        worksheet.getCell(row, 4).value = gdsTotal;
        worksheet.getCell(row, 4).style = { ...styles.currencyCell, font: { bold: true } };
        row++;

        // Total row
        worksheet.getCell(row, 1).value = 'TOTAL';
        worksheet.getCell(row, 1).style = { ...styles.totalRow, font: { bold: true } };
        worksheet.getCell(row, 2).value = gtoInternal + gdsInternal;
        worksheet.getCell(row, 2).style = { ...styles.currencyCell, ...styles.totalRow };
        worksheet.getCell(row, 3).value = gtoExternal + gdsExternal;
        worksheet.getCell(row, 3).style = { ...styles.currencyCell, ...styles.totalRow };
        worksheet.getCell(row, 4).value = gtoTotal + gdsTotal;
        worksheet.getCell(row, 4).style = { ...styles.currencyCell, ...styles.totalRow, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } } };
        row++;
        row++; // Empty row

        // Percentages Section
        worksheet.mergeCells(`A${row}:H${row}`);
        const percentagesHeaderCell = worksheet.getCell(`A${row}`);
        percentagesHeaderCell.value = 'PERCENTUALI KPI';
        percentagesHeaderCell.style = { ...styles.sectionHeader, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF2E9' } } };
        row++;

        // Percentages table headers
        ['Descrizione', 'Percentuale'].forEach((header, index) => {
            const cell = worksheet.getCell(row, index + 1);
            cell.value = header;
            cell.style = styles.tableHeader;
        });
        worksheet.mergeCells(`C${row}:H${row}`);
        row++;

        // Percentage style
        const percentageStyle = {
            font: { name: 'Calibri', size: 11, bold: true },
            alignment: { horizontal: 'right', vertical: 'middle' },
            numFmt: '0.0%',
            border: {
                top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
            }
        };

        // 1. GTO interni / totale GTO
        worksheet.getCell(row, 1).value = 'GTO Interni / Totale GTO';
        worksheet.getCell(row, 1).style = { ...styles.dataCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6FF' } } };
        worksheet.getCell(row, 2).value = (kpiData.gto?.internalPercentage || 0) / 100;
        worksheet.getCell(row, 2).style = { ...percentageStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6FF' } } };
        row++;

        // 2. GDS esterni / totale GDS
        worksheet.getCell(row, 1).value = 'GDS Esterni / Totale GDS';
        worksheet.getCell(row, 1).style = { ...styles.dataCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } } };
        worksheet.getCell(row, 2).value = (kpiData.gds?.externalPercentage || 0) / 100;
        worksheet.getCell(row, 2).style = { ...percentageStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } } };
        row++;

        // 3. Totale interni / progetto
        worksheet.getCell(row, 1).value = 'Totale Interni / Progetto';
        worksheet.getCell(row, 1).style = { ...styles.dataCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } } };
        worksheet.getCell(row, 2).value = (kpiData.totalInternalPercentage || 0) / 100;
        worksheet.getCell(row, 2).style = { ...percentageStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } } };
        row++;

        // 4. Totale esterni / progetto
        worksheet.getCell(row, 1).value = 'Totale Esterni / Progetto';
        worksheet.getCell(row, 1).style = { ...styles.dataCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEAA7' } } };
        worksheet.getCell(row, 2).value = (kpiData.totalExternalPercentage || 0) / 100;
        worksheet.getCell(row, 2).style = { ...percentageStyle, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEAA7' } } };
        row++;

        // Set column widths
        worksheet.columns = [
            { width: 25 }, // Vendor
            { width: 12 }, // Role
            { width: 15 }, // Department
            { width: 12 }, // Man Days
            { width: 12 }, // Rate
            { width: 12 }, // Cost
            { width: 12 }, // Final MDs
            { width: 15 }  // Final Cost
        ];
    }

    /**
     * Create styled features sheet using ExcelJS
     */
    async createFeaturesSheetExcelJS(workbook) {
        const worksheet = workbook.addWorksheet('Features', {
            properties: { tabColor: { argb: 'FF00B050' } },
            views: [{ state: 'frozen', ySplit: 1 }]
        });

        // Get current project from store to ensure fresh data
        const currentProject = StateSelectors.getCurrentProject();
        const features = currentProject?.features || [];
        const projectConfig = currentProject?.config;
        
        // Lookup functions for converting IDs to readable names/descriptions
        const lookupCategoryName = (categoryId) => {
            if (!categoryId) return '';
            const categories = this.managers.config?.getCategories(projectConfig) || [];
            const category = categories.find(c => c.id === categoryId);
            return category?.name || categoryId;
        };

        const lookupSupplierName = (supplierId) => {
            if (!supplierId) return '';
            const allSuppliers = [
                ...(this.managers.config?.getSuppliers(projectConfig) || []),
                ...(this.managers.config?.getInternalResources(projectConfig) || [])
            ];
            const supplier = allSuppliers.find(s => s.id === supplierId);
            return supplier?.name || supplierId;
        };

        const lookupFeatureTypeDescription = (categoryId, featureTypeId) => {
            if (!categoryId || !featureTypeId) return '';
            const categories = this.managers.config?.getCategories(projectConfig) || [];
            const category = categories.find(c => c.id === categoryId);
            const featureType = category?.featureTypes?.find(ft => ft.id === featureTypeId);
            return featureType?.description || '';
        };
        
        // Define styles
        const styles = {
            title: {
                font: { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } },
                alignment: { horizontal: 'center', vertical: 'middle' }
            },
            header: {
                font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                }
            }
        };

        // Title
        worksheet.mergeCells('A1:J1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'PROJECT FEATURES';
        titleCell.style = styles.title;
        worksheet.getRow(1).height = 30;

        // Headers - updated with Feature Type column
        const headers = ['ID', 'Description', 'Category', 'Feature Type', 'Supplier', 'Real MD', 'Expertise %', 'Risk %', 'Calculated MD', 'Notes'];
        const headerRow = worksheet.getRow(2);
        headers.forEach((header, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = header;
            cell.style = styles.header;
        });

        // Data rows
        features.forEach((feature, index) => {
            const row = worksheet.getRow(index + 3);
            
            // Alternate row colors
            const fillColor = index % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF';
            
            row.getCell(1).value = feature.id;
            row.getCell(2).value = feature.description;
            row.getCell(3).value = lookupCategoryName(feature.category); // Category name instead of ID
            row.getCell(4).value = lookupFeatureTypeDescription(feature.category, feature.featureType); // Feature type description
            row.getCell(5).value = lookupSupplierName(feature.supplier); // Supplier name instead of ID
            row.getCell(6).value = feature.realManDays || 0;
            row.getCell(7).value = feature.expertise ?? 100;
            row.getCell(8).value = feature.riskMargin ?? 10; // Use nullish coalescing to handle 0 correctly
            row.getCell(9).value = feature.manDays || 0;
            row.getCell(10).value = feature.notes || '';
            
            // Apply styles
            for (let i = 1; i <= 10; i++) {
                const cell = row.getCell(i);
                cell.style = {
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } },
                    border: {
                        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                    }
                };
                
                // Number formatting for numeric columns
                if (i === 6 || i === 9) { // Real MD and Calculated MD
                    cell.numFmt = '#,##0.0';
                    cell.alignment = { horizontal: 'right' };
                } else if (i === 7 || i === 8) { // Expertise and Risk percentages
                    cell.numFmt = '0%';
                    cell.value = cell.value / 100; // Convert to percentage
                    cell.alignment = { horizontal: 'right' };
                } else {
                    cell.alignment = { vertical: 'top', wrapText: true };
                }
            }
        });

        // Summary row
        const summaryRow = worksheet.getRow(features.length + 4);
        summaryRow.getCell(1).value = 'TOTAL';
        summaryRow.getCell(1).style = {
            font: { bold: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }
        };
        
        const totalRealMD = features.reduce((sum, f) => sum + (f.realManDays || 0), 0);
        const totalCalcMD = features.reduce((sum, f) => sum + (f.manDays || 0), 0);
        
        summaryRow.getCell(6).value = totalRealMD;
        summaryRow.getCell(6).numFmt = '#,##0.0';
        summaryRow.getCell(6).style = {
            font: { bold: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } },
            alignment: { horizontal: 'right' }
        };
        
        summaryRow.getCell(9).value = totalCalcMD;
        summaryRow.getCell(9).numFmt = '#,##0.0';
        summaryRow.getCell(9).style = {
            font: { bold: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } },
            alignment: { horizontal: 'right' }
        };

        // Set column widths - updated for new Feature Type column
        worksheet.columns = [
            { width: 12 }, // ID
            { width: 40 }, // Description
            { width: 15 }, // Category
            { width: 25 }, // Feature Type (new column)
            { width: 20 }, // Supplier
            { width: 12 }, // Real MD
            { width: 12 }, // Expertise
            { width: 10 }, // Risk
            { width: 12 }, // Calculated MD
            { width: 30 }  // Notes
        ];
    }

    /**
     * Create styled assumptions sheet using ExcelJS
     */
    async createAssumptionsSheetExcelJS(workbook) {
        const worksheet = workbook.addWorksheet('Assumptions', {
            properties: { tabColor: { argb: 'FFFFC000' } },
            views: [{ state: 'frozen', ySplit: 1 }]
        });

        const assumptions = this.currentProject?.assumptions || [];
        
        // Define styles
        const styles = {
            title: {
                font: { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } },
                alignment: { horizontal: 'center', vertical: 'middle' }
            },
            header: {
                font: { name: 'Calibri', size: 11, bold: true },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                }
            }
        };

        // Title
        worksheet.mergeCells('A1:E1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'PROJECT ASSUMPTIONS';
        titleCell.style = styles.title;
        worksheet.getRow(1).height = 30;

        // Headers
        const headers = ['ID', 'Description', 'Type', 'Impact', 'Notes'];
        const headerRow = worksheet.getRow(2);
        headers.forEach((header, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = header;
            cell.style = styles.header;
        });

        // Data rows
        assumptions.forEach((assumption, index) => {
            const row = worksheet.getRow(index + 3);
            
            row.getCell(1).value = assumption.id;
            row.getCell(2).value = assumption.description;
            row.getCell(3).value = assumption.type || '';
            row.getCell(4).value = assumption.impact || '';
            row.getCell(5).value = assumption.notes || '';
            
            // Apply styles and impact colors
            for (let i = 1; i <= 5; i++) {
                const cell = row.getCell(i);
                
                // Alternate row colors
                const fillColor = index % 2 === 0 ? 'FFF9F9F9' : 'FFFFFFFF';
                
                cell.style = {
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } },
                    border: {
                        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                    },
                    alignment: { vertical: 'top', wrapText: true }
                };
                
                // Special formatting for impact column
                if (i === 4) {
                    let impactColor = 'FFFFFFFF';
                    if (assumption.impact === 'High') {
                        impactColor = 'FFFFCCCC';
                    } else if (assumption.impact === 'Medium') {
                        impactColor = 'FFFFE599';
                    } else if (assumption.impact === 'Low') {
                        impactColor = 'FFD4EDDA';
                    }
                    cell.style.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: impactColor } };
                    cell.style.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.style.font = { bold: true };
                }
            }
        });

        // Summary
        const summaryRow = worksheet.getRow(assumptions.length + 4);
        summaryRow.getCell(1).value = `Total Assumptions: ${assumptions.length}`;
        summaryRow.getCell(1).style = { font: { bold: true } };
        
        const highImpact = assumptions.filter(a => a.impact === 'High').length;
        const mediumImpact = assumptions.filter(a => a.impact === 'Medium').length;
        const lowImpact = assumptions.filter(a => a.impact === 'Low').length;
        
        summaryRow.getCell(3).value = `High: ${highImpact}, Medium: ${mediumImpact}, Low: ${lowImpact}`;
        summaryRow.getCell(3).style = { font: { italic: true } };

        // Set column widths
        worksheet.columns = [
            { width: 12 }, // ID
            { width: 50 }, // Description
            { width: 15 }, // Type
            { width: 12 }, // Impact
            { width: 40 }  // Notes
        ];
    }

    /**
     * Create styled phases sheet using ExcelJS
     */
    async createPhasesSheetExcelJS(workbook) {
        const worksheet = workbook.addWorksheet('Phases', {
            properties: { tabColor: { argb: 'FF7030A0' } },
            views: [{ state: 'frozen', ySplit: 1 }]
        });

        // Check if project is available - React-only approach
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject || !currentProject.phases) {
            // Create a simple message sheet
            worksheet.mergeCells('A1:K1');
            const messageCell = worksheet.getCell('A1');
            messageCell.value = 'No phases data available';
            messageCell.style = {
                font: { name: 'Calibri', size: 14, italic: true },
                alignment: { horizontal: 'center', vertical: 'middle' }
            };
            return;
        }

        // Convert phases object to array for export - React-only approach
        const phasesObj = currentProject.phases || {};
        const phases = Object.entries(phasesObj).map(([key, phase]) => ({
            key,
            name: this.getPhaseDisplayName(key),
            ...phase
        }));
        
        // Simplified for React-only (no complex phase definitions needed)
        const selectedSuppliers = {}; // React components manage supplier selections
        
        // Define styles
        const styles = {
            title: {
                font: { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7030A0' } },
                alignment: { horizontal: 'center', vertical: 'middle' }
            },
            sectionHeader: {
                font: { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF7030A0' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } },
                alignment: { horizontal: 'left', vertical: 'middle' }
            },
            header: {
                font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8E7CC3' } },
                alignment: { horizontal: 'center', vertical: 'middle' },
                border: {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                }
            },
            dataCell: {
                font: { name: 'Calibri', size: 11 },
                alignment: { vertical: 'middle' },
                border: {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                }
            },
            numberCell: {
                font: { name: 'Calibri', size: 11 },
                alignment: { horizontal: 'right', vertical: 'middle' },
                numFmt: '#,##0.0',
                border: {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                }
            },
            currencyCell: {
                font: { name: 'Calibri', size: 11 },
                alignment: { horizontal: 'right', vertical: 'middle' },
                numFmt: '€ #,##0',
                border: {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                }
            },
            totalRow: {
                font: { name: 'Calibri', size: 11, bold: true },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D2E9' } },
                border: {
                    top: { style: 'double', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } }
                }
            }
        };

        let row = 1;

        // Title
        worksheet.mergeCells(`A${row}:L${row}`);
        const titleCell = worksheet.getCell(`A${row}`);
        titleCell.value = 'PROJECT PHASES';
        titleCell.style = styles.title;
        worksheet.getRow(row).height = 30;
        row++;
        row++; // Empty row

        // Phase Details Section
        worksheet.mergeCells(`A${row}:L${row}`);
        const detailsHeaderCell = worksheet.getCell(`A${row}`);
        detailsHeaderCell.value = 'PHASES BREAKDOWN';
        detailsHeaderCell.style = styles.sectionHeader;
        row++;

        // Headers for detailed breakdown
        const headers = [
            'Phase', 'Type', 'Total MDs', 'G1 (MDs)', 'G2 (MDs)', 'TA (MDs)', 'PM (MDs)',
            'G1 Cost', 'G2 Cost', 'TA Cost', 'PM Cost', 'Total Cost'
        ];
        
        headers.forEach((header, index) => {
            const cell = worksheet.getCell(row, index + 1);
            cell.value = header;
            cell.style = styles.header;
        });
        row++;

        // Phase data rows
        let totalManDays = 0;
        let totalCost = 0;
        
        // Resource totals
        let totalG1MD = 0, totalG2MD = 0, totalTAMD = 0, totalPMMD = 0;
        let totalG1Cost = 0, totalG2Cost = 0, totalTACost = 0, totalPMCost = 0;
        
        phases.forEach((phase, index) => {
            if (phase.manDays > 0) {
                // Get phase type from key - React-only simplified approach
                const phaseType = this.getPhaseType(phase.key);
                
                // Calculate phase total cost based on resource breakdown (not phase.cost)
                const manDays = phase.manDays || 0;
                
                // Calculate resource breakdown from phase effort data
                const manDaysByResource = { G1: 0, G2: 0, TA: 0, PM: 0 };
                const costByResource = { G1: 0, G2: 0, TA: 0, PM: 0 };

                // Get store data for correct calculations (same logic as app-store.js::calculatePhasesTotals)
                const storeState = window.appStore?.getState();
                const resourceRates = storeState?.resourceRates || { G1: 450, G2: 380, TA: 420, PM: 500 };
                const availableSuppliers = storeState?.availableSuppliers || [];

                // Calculate man days by resource
                if (phase.effort) {
                    Object.entries(phase.effort).forEach(([role, percentage]) => {
                        if (percentage && percentage > 0) {
                            const roleMDs = (phase.manDays * (percentage / 100));
                            manDaysByResource[role] = Math.round(roleMDs * 10) / 10;
                        }
                    });
                }

                // Calculate costs using the same logic as app-store.js::calculatePhasesTotals()
                // Special calculation for Development phase (uses feature-specific supplier rates)
                if (phase.key === 'development' && currentProject?.features) {
                    const g2EffortPercent = (phase.effort?.G2 || 0) / 100;
                    let g2Cost = 0;

                    // Calculate G2 cost using feature-specific supplier rates
                    currentProject.features.forEach(feature => {
                        const featureManDays = parseFloat(feature.manDays) || 0;
                        const featureSupplier = availableSuppliers.find(s => s.id === feature.supplier);
                        const featureRate = featureSupplier ? (featureSupplier.realRate || featureSupplier.officialRate || 0) : 0;
                        g2Cost += featureManDays * featureRate * g2EffortPercent;
                    });

                    // Get selected suppliers for TA, PM, and coverage
                    const selectedSuppliers = currentProject.phases?.selectedSuppliers || {};

                    // Add coverage cost if present
                    const coverageMDs = currentProject.coverage || 0;
                    if (coverageMDs > 0) {
                        if (selectedSuppliers.G2) {
                            const g2Supplier = availableSuppliers.find(s => s.id === selectedSuppliers.G2);
                            const g2Rate = g2Supplier ? (g2Supplier.realRate || g2Supplier.officialRate || 0) : resourceRates.G2;
                            g2Cost += coverageMDs * g2Rate * g2EffortPercent;
                        }
                    }

                    costByResource.G1 = Math.round(manDaysByResource.G1 * resourceRates.G1);
                    costByResource.G2 = Math.round(g2Cost);

                    // Use selected supplier rates for TA and PM instead of hardcoded resourceRates
                    let taCost = 0;
                    if (manDaysByResource.TA > 0 && selectedSuppliers.TA) {
                        const taSupplier = availableSuppliers.find(s => s.id === selectedSuppliers.TA);
                        const taRate = taSupplier ? (taSupplier.realRate || taSupplier.officialRate || 0) : resourceRates.TA;
                        taCost = Math.round(manDaysByResource.TA * taRate);
                    } else {
                        taCost = Math.round(manDaysByResource.TA * resourceRates.TA);
                    }
                    costByResource.TA = taCost;

                    let pmCost = 0;
                    if (manDaysByResource.PM > 0 && selectedSuppliers.PM) {
                        const pmSupplier = availableSuppliers.find(s => s.id === selectedSuppliers.PM);
                        const pmRate = pmSupplier ? (pmSupplier.realRate || pmSupplier.officialRate || 0) : resourceRates.PM;
                        pmCost = Math.round(manDaysByResource.PM * pmRate);
                    } else {
                        pmCost = Math.round(manDaysByResource.PM * resourceRates.PM);
                    }
                    costByResource.PM = pmCost;
                } else {
                    // Normal calculation for other phases (uses standard resource rates)
                    costByResource.G1 = Math.round(manDaysByResource.G1 * resourceRates.G1);
                    costByResource.G2 = Math.round(manDaysByResource.G2 * resourceRates.G2);
                    costByResource.TA = Math.round(manDaysByResource.TA * resourceRates.TA);
                    costByResource.PM = Math.round(manDaysByResource.PM * resourceRates.PM);
                }

                // Calculate phase total cost from resource breakdown
                const phaseTotalCost = costByResource.G1 + costByResource.G2 + costByResource.TA + costByResource.PM;

                totalManDays += phase.manDays || 0;
                totalCost += phaseTotalCost;
                
                // Accumulate resource totals
                totalG1MD += manDaysByResource.G1 || 0;
                totalG2MD += manDaysByResource.G2 || 0;
                totalTAMD += manDaysByResource.TA || 0;
                totalPMMD += manDaysByResource.PM || 0;
                
                totalG1Cost += costByResource.G1 || 0;
                totalG2Cost += costByResource.G2 || 0;
                totalTACost += costByResource.TA || 0;
                totalPMCost += costByResource.PM || 0;

                // Alternate row colors
                const fillColor = index % 2 === 0 ? 'FFE6E0EC' : 'FFFFFFFF';
                
                // Phase name
                worksheet.getCell(row, 1).value = phase.name || '';
                worksheet.getCell(row, 1).style = { ...styles.dataCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                // Phase type
                worksheet.getCell(row, 2).value = phaseType || '';
                worksheet.getCell(row, 2).style = { ...styles.dataCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                // Total Man Days
                worksheet.getCell(row, 3).value = phase.manDays || 0;
                worksheet.getCell(row, 3).style = { ...styles.numberCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                // Man Days by resource
                worksheet.getCell(row, 4).value = manDaysByResource.G1 || 0;
                worksheet.getCell(row, 4).style = { ...styles.numberCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                worksheet.getCell(row, 5).value = manDaysByResource.G2 || 0;
                worksheet.getCell(row, 5).style = { ...styles.numberCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                worksheet.getCell(row, 6).value = manDaysByResource.TA || 0;
                worksheet.getCell(row, 6).style = { ...styles.numberCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                worksheet.getCell(row, 7).value = manDaysByResource.PM || 0;
                worksheet.getCell(row, 7).style = { ...styles.numberCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                // Costs by resource
                worksheet.getCell(row, 8).value = costByResource.G1 || 0;
                worksheet.getCell(row, 8).style = { ...styles.currencyCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                worksheet.getCell(row, 9).value = costByResource.G2 || 0;
                worksheet.getCell(row, 9).style = { ...styles.currencyCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                worksheet.getCell(row, 10).value = costByResource.TA || 0;
                worksheet.getCell(row, 10).style = { ...styles.currencyCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                worksheet.getCell(row, 11).value = costByResource.PM || 0;
                worksheet.getCell(row, 11).style = { ...styles.currencyCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                // Total cost
                worksheet.getCell(row, 12).value = phaseTotalCost;
                worksheet.getCell(row, 12).style = { ...styles.currencyCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }, font: { bold: true } };
                
                row++;
            }
        });

        // Total row
        worksheet.getCell(row, 1).value = 'TOTAL';
        worksheet.getCell(row, 1).style = { ...styles.totalRow, font: { bold: true } };
        worksheet.getCell(row, 2).style = styles.totalRow;
        
        worksheet.getCell(row, 3).value = totalManDays;
        worksheet.getCell(row, 3).style = { ...styles.numberCell, ...styles.totalRow };
        
        worksheet.getCell(row, 4).value = totalG1MD;
        worksheet.getCell(row, 4).style = { ...styles.numberCell, ...styles.totalRow };
        worksheet.getCell(row, 5).value = totalG2MD;
        worksheet.getCell(row, 5).style = { ...styles.numberCell, ...styles.totalRow };
        worksheet.getCell(row, 6).value = totalTAMD;
        worksheet.getCell(row, 6).style = { ...styles.numberCell, ...styles.totalRow };
        worksheet.getCell(row, 7).value = totalPMMD;
        worksheet.getCell(row, 7).style = { ...styles.numberCell, ...styles.totalRow };
        
        worksheet.getCell(row, 8).value = totalG1Cost;
        worksheet.getCell(row, 8).style = { ...styles.currencyCell, ...styles.totalRow };
        worksheet.getCell(row, 9).value = totalG2Cost;
        worksheet.getCell(row, 9).style = { ...styles.currencyCell, ...styles.totalRow };
        worksheet.getCell(row, 10).value = totalTACost;
        worksheet.getCell(row, 10).style = { ...styles.currencyCell, ...styles.totalRow };
        worksheet.getCell(row, 11).value = totalPMCost;
        worksheet.getCell(row, 11).style = { ...styles.currencyCell, ...styles.totalRow };
        
        worksheet.getCell(row, 12).value = totalCost;
        worksheet.getCell(row, 12).style = { 
            ...styles.currencyCell, 
            ...styles.totalRow,
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } }
        };
        row++;
        row++; // Empty row

        // Selected Suppliers Section
        worksheet.mergeCells(`A${row}:L${row}`);
        const suppliersHeaderCell = worksheet.getCell(`A${row}`);
        suppliersHeaderCell.value = 'SELECTED SUPPLIERS';
        suppliersHeaderCell.style = styles.sectionHeader;
        row++;

        // Suppliers table headers
        ['Resource Type', 'Selected Supplier'].forEach((header, index) => {
            const cell = worksheet.getCell(row, index + 1);
            cell.value = header;
            cell.style = styles.header;
        });
        row++;

        // List selected suppliers
        Object.entries(selectedSuppliers).forEach(([resourceType, supplierId]) => {
            if (supplierId) {
                // Get supplier name from configuration
                const allSuppliers = [
                    ...(this.managers.config?.globalConfig?.suppliers || []),
                    ...(this.managers.config?.globalConfig?.internalResources || [])
                ];
                const supplier = allSuppliers.find(s => s.id === supplierId);
                
                worksheet.getCell(row, 1).value = resourceType;
                worksheet.getCell(row, 1).style = styles.dataCell;
                worksheet.getCell(row, 2).value = supplier?.name || supplierId;
                worksheet.getCell(row, 2).style = styles.dataCell;
                row++;
            }
        });

        // Set column widths
        worksheet.columns = [
            { width: 25 }, // Phase
            { width: 12 }, // Type
            { width: 12 }, // Total MDs
            { width: 10 }, // G1 MDs
            { width: 10 }, // G2 MDs
            { width: 10 }, // TA MDs
            { width: 10 }, // PM MDs
            { width: 12 }, // G1 Cost
            { width: 12 }, // G2 Cost
            { width: 12 }, // TA Cost
            { width: 12 }, // PM Cost
            { width: 15 }  // Total Cost
        ];
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
        if (StateSelectors.getIsDirty()) {
            const save = await this.confirmSave();
            if (save === null) return; // User cancelled
            if (save) await this.saveProject();
        }

        this.currentProject = await this.createNewProject();
        StateSelectors.markProjectClean();

        // REMOVED LEGACY CALLS FOR PURE STATE MANAGER:
        // this.managers.navigation.onProjectLoaded(); → Automatic via subscription
        // this.managers.version?.onProjectChanged(); → Automatic via subscription
        // this.refreshDropdowns(); → Automatic via subscription
        // this.updateUI(); → Automatic via subscription
        // this.updateProjectStatus(); → Automatic via subscription
        
        // PURE STATE MANAGER: All updates happen automatically!

        // REMOVED: Phase reset now handled by React components
        // setTimeout(() => {
        //     this.managers.projectPhases?.resetAllPhaseData();
        // }, 100);

        // Create initial version using React VersionHistoryActions
        setTimeout(async () => {
            try {
                if (window.versionHistoryActions) {
                    await window.versionHistoryActions.createVersion('Initial project creation');
                    console.log('✅ Initial version created for new project');
                } else {
                    console.warn('versionHistoryActions not available, skipping initial version creation');
                }
            } catch (error) {
                console.error('Failed to create initial version:', error);
            }
        }, 600);

        if (window.NotificationManager) {
            NotificationManager.show('New project created successfully', 'success');
        }
    }

    /**
     * Save project - Single unified flow
     */
    async saveProject() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject) return false;

        try {
            this.showLoading('Saving project...');

            // Update metadata
            this.store.getState().updateProjectMetadata({ 
                lastModified: new Date().toISOString() 
            });

            // Ensure hierarchical config format  
            if (!currentProject.config.projectOverrides) {
                const migratedConfig = this.managers.config.migrateProjectConfig(currentProject.config);
                this.store.getState().updateProjectConfig(migratedConfig);
            }

            // ALWAYS save phases configuration including supplier selections
            await this.saveProjectPhasesConfiguration();

            // Get FRESH project data after phases have been updated
            const updatedProject = StateSelectors.getCurrentProject();
            
            // CRITICAL: Sync finalMDsOverrides from calculationsData to currentProject before saving
            const state = this.store.getState();
            const calculationsData = state.calculationsData;
            
            if (calculationsData?.finalMDsOverrides) {
                updatedProject.finalMDsOverrides = { ...calculationsData.finalMDsOverrides };
            }
            
            // Save through data manager with updated data (now includes finalMDsOverrides)
            await this.managers.data.saveProject(updatedProject);

            StateSelectors.markProjectClean();
            this.updateProjectStatus();

            // Update project manager
            this.managers.project?.loadSavedProjects();

            // STATE/ACTIONS/DISPATCHER PATTERN: Dispatch project-saved event instead of direct call
            console.log('🔄 Save completed - dispatching project-saved event');
            window.dispatchEvent(new CustomEvent('project-saved', {
                detail: {
                    projectData: updatedProject,
                    hasVersions: updatedProject && updatedProject.versions?.length > 0,
                    versionHistoryAvailable: !!window.versionHistoryActions
                }
            }));

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
     * Save project phases configuration - ALWAYS save supplier selections
     * PATTERN: State/Actions/Dispatcher - Delegate to PhasesActions
     */
    async saveProjectPhasesConfiguration() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject) return;

        try {
            // Always save phases data including supplier selections
            if (window.phasesActions) {
                await window.phasesActions.savePhases();
                console.log('Phases configuration saved including supplier selections');
            } else {
                console.warn('PhasesActions not available - phases data may not be saved correctly');
            }
            
        } catch (error) {
            console.error('Failed to save phases configuration:', error);
        }
    }

    /**
     * Mark project as dirty
     */
    markDirty() {
        // Use StateSelectors to mark dirty in store
        StateSelectors.markProjectDirty();
        
        // REMOVED LEGACY CALL FOR PURE STATE MANAGER:
        // this.managers.navigation.onProjectDirty(true); → Automatic via subscription
        
        this.updateProjectStatus();

        // REMOVED: Phase calculations now handled by React components
        // if (this.managers.projectPhases) {
        //     this.managers.projectPhases.calculateDevelopmentPhase();
        //     if (this.managers.navigation.currentSection === 'phases') {
        //         const phasesPage = this.getElement('phases-page');
        //         if (phasesPage?.classList.contains('active')) {
        //             this.managers.projectPhases.updateCalculations();
        //         }
        //     }
        // }
    }

    /**
     * Update UI components
     */
    // REMOVED LEGACY METHOD FOR PURE STATE MANAGER:
    // - updateUI() → All managers react to store changes automatically via subscriptions
    // PURE STATE MANAGER: No manual UI updates needed!

    /**
     * Update project information display
     */
    updateProjectInfo() {
        const projectNameEl = this.getElement('title-project-name');
        if (!projectNameEl) return;

        // Use global state selector instead of direct property access
        const projectName = StateSelectors.getProjectName();
        projectNameEl.textContent = projectName;
    }

    /**
     * Update project status indicator
     */
    updateProjectStatus() {
        const statusEl = this.getElement('project-status');
        if (statusEl) {
            const isDirty = StateSelectors.getIsDirty();
            statusEl.className = isDirty ? 'unsaved' : 'saved';
            statusEl.textContent = isDirty ? '●' : '○';
        }

        // Update last saved timestamp
        const lastSavedEl = this.getElement('last-saved');
        if (lastSavedEl) {
            const currentProject = StateSelectors.getCurrentProject();
            if (currentProject && currentProject.project && currentProject.project.lastModified) {
                const date = new Date(currentProject.project.lastModified);
                const formatted = date.toLocaleString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                lastSavedEl.textContent = `Last saved: ${formatted}`;
            } else {
                lastSavedEl.textContent = 'Last saved: Never';
            }
        }
    }

    /**
     * Update summary calculations
     */
    updateSummary() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject) return;

        // Use global state selectors instead of direct property access
        const features = StateSelectors.getProjectFeatures();
        const totalFeatures = StateSelectors.getFeatureCount();
        const totalManDays = StateSelectors.getTotalManDays();
        
        // 🚨 CRITICAL FIX: Ensure totalManDays is always a valid number
        const safeTotalManDays = parseFloat(totalManDays) || 0;
        
        const averageManDays = totalFeatures > 0 ? (safeTotalManDays / totalFeatures).toFixed(1) : 0;
        const defaultCoverage = (safeTotalManDays * 0.3).toFixed(1);

        // Calculate filtered man days
        let filteredManDays = 0;
        if (this.managers.feature && this.managers.feature.state && this.managers.feature.state.filteredFeatures) {
            filteredManDays = this.managers.feature.state.filteredFeatures.reduce((sum, feature) => sum + (parseFloat(feature.manDays) || 0), 0);
        } else {
            // If no filters applied, filtered equals total
            filteredManDays = safeTotalManDays;
        }

        // Update display elements with safe number values
        this.updateElementContent('total-features', totalFeatures);
        this.updateElementContent('total-man-days', safeTotalManDays.toFixed(1));
        this.updateElementContent('average-man-days', averageManDays);
        this.updateElementContent('filtered-man-days', filteredManDays.toFixed(1));
        
        // Update coverage
        this.updateCoverage(defaultCoverage);
        this.updateCoverageResetButtonVisibility();
    }

    /**
     * Update coverage field
     */
    updateCoverage(defaultCoverage) {
        const coverageEl = this.getElement('coverage-value');
        const currentProject = StateSelectors.getCurrentProject();
        if (!coverageEl || !currentProject) return;

        const coverageIsAutoCalculated = currentProject.coverageIsAutoCalculated !== false;
        
        if (coverageIsAutoCalculated || currentProject.coverage === undefined) {
            coverageEl.value = defaultCoverage;
            
            // PURE STATE MANAGER: Use store action instead of direct mutation
            this.store.getState().updateProjectCoverage(parseFloat(defaultCoverage), true);
        } else {
            coverageEl.value = currentProject.coverage;
        }
    }

    /**
     * Reset coverage to automatic calculation
     */
    resetCoverageToAuto() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject) return;

        const features = currentProject.features;
        const totalManDays = features.reduce((sum, feature) => sum + (feature.manDays || 0), 0);
        const defaultCoverage = (totalManDays * 0.3).toFixed(1);

        // PURE STATE MANAGER: Use store action instead of direct mutation
        this.store.getState().updateProjectCoverage(parseFloat(defaultCoverage), true);

        const coverageEl = this.getElement('coverage-value');
        if (coverageEl) {
            coverageEl.value = defaultCoverage;
        }

        this.updateCoverageResetButtonVisibility();
        this.markDirty();

        // REMOVED: Phase calculations now handled by React components
        // if (this.managers.navigation.currentSection === 'phases') {
        //     this.managers.projectPhases?.calculateDevelopmentPhase();
        //     this.managers.projectPhases?.updateCalculations();
        // }
    }

    /**
     * Update coverage reset button visibility
     */
    updateCoverageResetButtonVisibility() {
        const resetBtn = this.getElement('coverage-reset-btn');
        const currentProject = StateSelectors.getCurrentProject();
        if (resetBtn && currentProject) {
            const isManuallySet = currentProject.coverageIsAutoCalculated === false;
            resetBtn.classList.toggle('hidden', !isManuallySet);
        }
    }

    /**
     * Update configuration status
     */
    updateConfigurationStatus() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!this.managers.config || !currentProject) return;

        const stats = this.managers.config.getConfigStats(currentProject.config);
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

    // REMOVED LEGACY METHODS FOR PURE STATE MANAGER:
    // - refreshDropdowns() → FeatureManager reacts to store changes automatically
    // - updateNavigationState() → NavigationManager reacts to store changes automatically
    // PURE STATE MANAGER: Components auto-update via subscriptions!

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
                currentProject = await this.migrateProjectConfig(lastProject);
                
                // REMOVED: Version manager onProjectChanged (now handled by React)
                // REMOVED: Phase sync now handled by React components  
                // this.managers.projectPhases?.synchronizeWithProject();
                
                // Calculate project costs using new React system (migrated from legacy CalculationsManager)
                if (window.calculationsActions) {
                    try {
                        window.calculationsActions.calculateProjectCosts();
                    } catch (error) {
                        console.error('Failed to calculate project costs on project load:', error);
                    }
                }
                
                // REMOVED: React-only approach
                // this.phasesManager = this.managers.projectPhases;
                
                // REMOVED LEGACY CALLS FOR PURE STATE MANAGER:
                // this.updateNavigationState(); → Automatic via subscription
                // this.refreshDropdowns(); → Automatic via subscription
                // this.updateProjectStatus(); → Automatic via subscription
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
     * Get phases summary - React-only approach
     */
    getPhasesSummary() {
        const currentProject = StateSelectors.getCurrentProject();
        if (currentProject && currentProject.phases) {
            // Simplified summary for React-only approach
            const phases = currentProject.phases;
            const totalManDays = Object.values(phases).reduce((sum, phase) => sum + (phase.manDays || 0), 0);
            const totalCost = Object.values(phases).reduce((sum, phase) => sum + (phase.cost || 0), 0);
            
            return {
                totalCost,
                totalManDays,
                phases: Object.entries(phases).map(([key, phase]) => ({ id: key, ...phase })),
                validation: { valid: true } // React components handle validation
            };
        }
        return null;
    }

    /**
     * Handle application close request
     */
    async handleCloseRequest() {
        console.log('Application close requested, checking for unsaved changes...');
        
        const currentProject = StateSelectors.getCurrentProject();
        if (!StateSelectors.getIsDirty() || !currentProject) {
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
        StateSelectors.markProjectClean();
        
        // REMOVED: Version manager onProjectChanged (now handled by React)
        // REMOVED: Phase reset now handled by React components
        // this.managers.projectPhases?.resetAllPhaseData();
        
        // REMOVED LEGACY CALLS FOR PURE STATE MANAGER:
        // this.managers.navigation.onProjectClosed(); → Automatic via subscription
        // this.refreshDropdowns(); → Automatic via subscription  
        // this.updateUI(); → Automatic via subscription
        
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