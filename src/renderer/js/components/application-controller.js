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
                { original: 'DataManager', refactored: 'DataManager' },
                { original: 'ConfigurationManager', refactored: 'ConfigurationManager' },
                { original: 'FeatureManager', refactored: 'FeatureManager' }
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
        if (window.FeatureManager) {
            this.managers.feature = new FeatureManager(this.managers.data, this.managers.config);
        } else {
            this.managers.feature = new FeatureManager(this.managers.data, this.managers.config);
        }
        await this.managers.feature.init();
        
        // Assumptions manager
        this.managers.assumptions = new AssumptionsManager();
        await this.managers.assumptions.init();
        
        // Calculations manager
        this.managers.calculations = new CalculationsManager(this, this.managers.config);
        
        // Project manager
        this.managers.project = new ProjectManager(this);
        
        // Project phases manager
        this.managers.projectPhases = new ProjectPhasesManager(this, this.managers.config);
        
        // Version manager
        this.managers.version = new VersionManager(this);
        
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
        this.featureManager = this.managers.feature;
        this.calculationsManager = this.managers.calculations;
        this.projectManager = this.managers.project;
        this.projectPhasesManager = this.managers.projectPhases;
        this.versionManager = this.managers.version;
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

        // Add assumption button
        const addAssumptionBtn = this.getElement('add-assumption-btn');
        if (addAssumptionBtn) {
            this.addEventListener(addAssumptionBtn, 'click', () => {
                this.managers.assumptions?.showAddAssumptionModal();
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
        // Get calculations manager data
        const calcManager = this.managers.calculations;
        
        // Ensure vendor costs are calculated
        if (calcManager) {
            calcManager.calculateVendorCosts();
        }
        
        const vendorCosts = calcManager?.vendorCosts || [];
        const kpiData = calcManager?.kpiData || {};
        
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
            if (!vendorSummary[cost.vendor]) {
                vendorSummary[cost.vendor] = {
                    manDays: 0,
                    cost: 0
                };
            }
            vendorSummary[cost.vendor].manDays += cost.finalMDs || cost.manDays || 0;
            const finalCost = cost.finalMDs ? (cost.finalMDs * cost.officialRate) : cost.cost;
            vendorSummary[cost.vendor].cost += finalCost || 0;
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

        // Get calculations manager data
        const calcManager = this.managers.calculations;
        if (calcManager) {
            calcManager.calculateVendorCosts();
            calcManager.calculateKPIs();
        }
        
        const vendorCosts = calcManager?.vendorCosts || [];
        const kpiData = calcManager?.kpiData || {};
        
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

        worksheet.getCell(`A${row}`).value = 'Total Features:';
        worksheet.getCell(`A${row}`).style = { font: { bold: true } };
        worksheet.getCell(`B${row}`).value = this.currentProject?.features?.length || 0;
        row++;

        worksheet.getCell(`A${row}`).value = 'Total Man Days:';
        worksheet.getCell(`A${row}`).style = { font: { bold: true } };
        const totalMD = this.currentProject?.features?.reduce((sum, f) => sum + (f.manDays || 0), 0) || 0;
        worksheet.getCell(`B${row}`).value = totalMD;
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
                const finalCost = cost.finalMDs ? (cost.finalMDs * cost.officialRate) : cost.cost;
                
                // Alternate row colors
                const rowStyle = index % 2 === 0 ? 
                    { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } } } : {};
                
                worksheet.getCell(row, 1).value = cost.vendor || '';
                worksheet.getCell(row, 1).style = { ...styles.dataCell, ...rowStyle };
                
                worksheet.getCell(row, 2).value = cost.role || '';
                worksheet.getCell(row, 2).style = { ...styles.dataCell, ...rowStyle };
                
                worksheet.getCell(row, 3).value = cost.department || '';
                worksheet.getCell(row, 3).style = { ...styles.dataCell, ...rowStyle };
                
                worksheet.getCell(row, 4).value = cost.manDays || 0;
                worksheet.getCell(row, 4).style = { ...styles.numberCell, ...rowStyle };
                
                worksheet.getCell(row, 5).value = cost.officialRate || 0;
                worksheet.getCell(row, 5).style = { ...styles.currencyCell, ...rowStyle };
                
                worksheet.getCell(row, 6).value = cost.cost || 0;
                worksheet.getCell(row, 6).style = { ...styles.currencyCell, ...rowStyle };
                
                worksheet.getCell(row, 7).value = cost.finalMDs || cost.manDays || 0;
                worksheet.getCell(row, 7).style = { ...styles.numberCell, ...rowStyle };
                
                worksheet.getCell(row, 8).value = finalCost || 0;
                worksheet.getCell(row, 8).style = { ...styles.currencyCell, ...rowStyle };
                
                row++;
            });
            
            // Totals row
            const totalManDays = vendorCosts.reduce((sum, c) => sum + (c.manDays || 0), 0);
            const totalCost = vendorCosts.reduce((sum, c) => sum + (c.cost || 0), 0);
            const totalFinalMDs = vendorCosts.reduce((sum, c) => sum + (c.finalMDs || c.manDays || 0), 0);
            const totalFinalCost = vendorCosts.reduce((sum, c) => {
                const finalCost = c.finalMDs ? (c.finalMDs * c.officialRate) : c.cost;
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
        row++; // Empty row

        // Summary by Vendor Section
        worksheet.mergeCells(`A${row}:H${row}`);
        const summaryHeaderCell = worksheet.getCell(`A${row}`);
        summaryHeaderCell.value = 'SUMMARY BY VENDOR';
        summaryHeaderCell.style = styles.sectionHeader;
        row++;

        // Summary headers
        ['Vendor', 'Total Man Days', 'Total Cost (€)'].forEach((header, index) => {
            const cell = worksheet.getCell(row, index + 1);
            cell.value = header;
            cell.style = styles.tableHeader;
        });
        row++;

        // Group costs by vendor
        const vendorSummary = {};
        vendorCosts.forEach(cost => {
            if (!vendorSummary[cost.vendor]) {
                vendorSummary[cost.vendor] = {
                    manDays: 0,
                    cost: 0
                };
            }
            vendorSummary[cost.vendor].manDays += cost.finalMDs || cost.manDays || 0;
            const finalCost = cost.finalMDs ? (cost.finalMDs * cost.officialRate) : cost.cost;
            vendorSummary[cost.vendor].cost += finalCost || 0;
        });

        // Add vendor summary rows
        Object.entries(vendorSummary).forEach(([vendor, summary]) => {
            worksheet.getCell(row, 1).value = vendor;
            worksheet.getCell(row, 1).style = styles.dataCell;
            worksheet.getCell(row, 2).value = summary.manDays;
            worksheet.getCell(row, 2).style = styles.numberCell;
            worksheet.getCell(row, 3).value = summary.cost;
            worksheet.getCell(row, 3).style = styles.currencyCell;
            row++;
        });

        // Grand total
        const grandTotalMDs = Object.values(vendorSummary).reduce((sum, s) => sum + s.manDays, 0);
        const grandTotalCost = Object.values(vendorSummary).reduce((sum, s) => sum + s.cost, 0);
        
        worksheet.getCell(row, 1).value = 'GRAND TOTAL';
        worksheet.getCell(row, 1).style = { ...styles.totalRow, font: { bold: true, size: 12 } };
        worksheet.getCell(row, 2).value = grandTotalMDs;
        worksheet.getCell(row, 2).style = { ...styles.numberCell, ...styles.totalRow };
        worksheet.getCell(row, 3).value = grandTotalCost;
        worksheet.getCell(row, 3).style = { ...styles.currencyCell, ...styles.totalRow, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } } };

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

        const features = this.currentProject?.features || [];
        const projectConfig = this.currentProject?.configuration;
        
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
            row.getCell(7).value = feature.expertise || 100;
            row.getCell(8).value = feature.riskMargin || 10;
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

        // Check if phases manager and project are available
        if (!this.managers.projectPhases || !this.currentProject) {
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

        const phases = this.managers.projectPhases.getProjectPhases() || [];
        const phaseDefinitions = this.managers.projectPhases.phaseDefinitions || this.managers.projectPhases.createFallbackPhaseDefinitions();
        const selectedSuppliers = this.managers.projectPhases.selectedSuppliers || {};
        
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
        
        phases.forEach((phase, index) => {
            if (phase.manDays > 0) {
                // Get phase definition for type info
                const phaseDef = phaseDefinitions.find(pd => pd.id === phase.id);
                
                // Calculate resource breakdown
                const manDaysByResource = this.managers.projectPhases.calculateManDaysByResource(phase.manDays, phase.effort) || {};
                const costByResource = this.managers.projectPhases.calculateCostByResource(manDaysByResource, phase) || {};
                const phaseTotalCost = Object.values(costByResource).reduce((sum, cost) => sum + (cost || 0), 0);
                
                totalManDays += phase.manDays || 0;
                totalCost += phaseTotalCost;

                // Alternate row colors
                const fillColor = index % 2 === 0 ? 'FFE6E0EC' : 'FFFFFFFF';
                
                // Phase name
                worksheet.getCell(row, 1).value = phase.name || '';
                worksheet.getCell(row, 1).style = { ...styles.dataCell, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } };
                
                // Phase type
                worksheet.getCell(row, 2).value = phaseDef?.type || '';
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
        
        // Calculate resource totals
        let totalG1MD = 0, totalG2MD = 0, totalTAMD = 0, totalPMMD = 0;
        let totalG1Cost = 0, totalG2Cost = 0, totalTACost = 0, totalPMCost = 0;
        
        phases.forEach(phase => {
            if (phase.manDays > 0) {
                const manDaysByResource = this.managers.projectPhases.calculateManDaysByResource(phase.manDays, phase.effort) || {};
                const costByResource = this.managers.projectPhases.calculateCostByResource(manDaysByResource, phase) || {};
                
                totalG1MD += manDaysByResource.G1 || 0;
                totalG2MD += manDaysByResource.G2 || 0;
                totalTAMD += manDaysByResource.TA || 0;
                totalPMMD += manDaysByResource.PM || 0;
                
                totalG1Cost += costByResource.G1 || 0;
                totalG2Cost += costByResource.G2 || 0;
                totalTACost += costByResource.TA || 0;
                totalPMCost += costByResource.PM || 0;
            }
        });
        
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

            // Check version update conditions

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
        this.managers.assumptions?.refreshTable();
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