/**
 * Software Estimation Manager - Main Application
 * Entry point for the renderer process
 */

class SoftwareEstimationApp {
    constructor() {
        this.currentProject = null;
        this.isDirty = false;
        this.autoSaveInterval = null;
        this.currentPage = 'features';

        this.init();
    }

    async init() {
        try {
            await this.initializeComponents();
            this.setupEventListeners();
            this.setupAutoSave();
            await this.loadLastProject();
            this.updateUI();

            // Ensure proper initial section display
            setTimeout(() => {
                this.navigationManager.navigateTo('projects');
            }, 200);

            console.log('Software Estimation Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            NotificationManager.show('Failed to initialize application', 'error');
        }
    }

    async initializeComponents() {
        // Debug: Check if all classes are available
        console.log('Checking class availability:');
        console.log('DataManager:', typeof DataManager);
        console.log('FeatureManager:', typeof FeatureManager);
        console.log('NavigationManager:', typeof NavigationManager);
        console.log('ModalManager:', typeof ModalManager);
        console.log('ProjectManager:', typeof ProjectManager);
        console.log('NotificationManager:', typeof NotificationManager);
        console.log('Helpers:', typeof Helpers);
        console.log('electronAPI:', typeof window.electronAPI);

        // Check if classes are defined before initializing
        if (typeof DataManager === 'undefined') {
            throw new Error('DataManager is not defined - check data-manager.js');
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

        // Initialize managers
        this.dataManager = new DataManager();
        this.featureManager = new FeatureManager(this.dataManager);
        this.navigationManager = new NavigationManager(this);
        this.modalManager = new ModalManager();
        this.projectManager = new ProjectManager(this);

        console.log('All managers initialized successfully');

        // Initialize default project structure
        if (!this.currentProject) {
            this.currentProject = this.createNewProject();
        }

        // Populate dropdowns with default data
        await this.populateDropdowns();
    }

    createNewProject() {
        return {
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
            config: {
                suppliers: [
                    { id: 'supplier1', name: 'External Supplier A', realRate: 450, officialRate: 500, status: 'active' },
                    { id: 'supplier2', name: 'External Supplier B', realRate: 400, officialRate: 450, status: 'active' }
                ],
                internalResources: [
                    { id: 'internal1', name: 'Tech Analyst IT', role: 'Tech Analyst IT', realRate: 350, officialRate: 400, department: 'IT' },
                    { id: 'internal2', name: 'Tech Analyst RO', role: 'Tech Analyst RO', realRate: 320, officialRate: 380, department: 'RO' },
                    { id: 'internal3', name: 'Developer', role: 'Developer', realRate: 400, officialRate: 450, department: 'Development' }
                ],
                categories: [
                    { id: 'security', name: 'Security', description: 'Security-related features', multiplier: 1.2 },
                    { id: 'ui', name: 'User Interface', description: 'UI/UX features', multiplier: 1.0 },
                    { id: 'backend', name: 'Backend', description: 'Backend logic and APIs', multiplier: 1.1 },
                    { id: 'integration', name: 'Integration', description: 'Third-party integrations', multiplier: 1.3 },
                    { id: 'reporting', name: 'Reporting', description: 'Reports and analytics', multiplier: 1.1 }
                ],
                calculationParams: {
                    workingDaysPerMonth: 22,
                    workingHoursPerDay: 8,
                    currencySymbol: '€',
                    riskMargin: 0.15,
                    overheadPercentage: 0.10
                }
            },
            templates: [],
            versions: []
        };
    }

    async populateDropdowns() {
        if (!this.currentProject) return;

        // Populate category dropdowns
        const categorySelects = document.querySelectorAll('#category-filter, #feature-category');
        categorySelects.forEach(select => {
            // Clear existing options (except first)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }

            // Add categories
            this.currentProject.config.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        });

        // Populate supplier dropdowns
        const supplierSelects = document.querySelectorAll('#supplier-filter, #feature-supplier');
        supplierSelects.forEach(select => {
            // Clear existing options (except first)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }

            // Add suppliers
            this.currentProject.config.suppliers.forEach(supplier => {
                if (supplier.status === 'active') {
                    const option = document.createElement('option');
                    option.value = supplier.id;
                    option.textContent = supplier.name;
                    select.appendChild(option);
                }
            });

            // Add internal resources
            this.currentProject.config.internalResources.forEach(resource => {
                const option = document.createElement('option');
                option.value = resource.id;
                option.textContent = `${resource.name} (Internal)`;
                select.appendChild(option);
            });
        });
    }

    setupEventListeners() {
        // Menu actions from main process
        window.electronAPI?.onMenuAction?.(this.handleMenuAction.bind(this));

        // Navigation
        document.querySelectorAll('.nav-section').forEach(section => {
            section.addEventListener('click', (e) => {
                const sectionName = section.dataset.section;
                this.navigationManager.navigateTo(sectionName);
            });
        });

        // Save button
        document.getElementById('save-btn')?.addEventListener('click', () => {
            this.saveProject();
        });

        // Export button
        document.getElementById('export-btn')?.addEventListener('click', () => {
            this.showExportMenu();
        });

        // Feature management
        document.getElementById('add-feature-btn')?.addEventListener('click', () => {
            this.featureManager.showAddFeatureModal();
        });

        document.getElementById('import-features-btn')?.addEventListener('click', () => {
            this.importFeatures();
        });

        // Modal events
        document.getElementById('save-feature-btn')?.addEventListener('click', () => {
            this.featureManager.saveFeature();
        });

        document.getElementById('cancel-feature-btn')?.addEventListener('click', () => {
            this.modalManager.closeModal('feature-modal');
        });

        // Search and filters
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.featureManager.filterFeatures();
        });

        document.getElementById('category-filter')?.addEventListener('change', () => {
            this.featureManager.filterFeatures();
        });

        document.getElementById('supplier-filter')?.addEventListener('change', () => {
            this.featureManager.filterFeatures();
        });

        // Table sorting
        document.querySelectorAll('[data-sort]').forEach(header => {
            header.addEventListener('click', (e) => {
                const sortField = header.dataset.sort;
                this.featureManager.sortFeatures(sortField);
            });
        });

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
        });
    }

    setupAutoSave() {
        // Auto-save every 2 minutes
        this.autoSaveInterval = setInterval(() => {
            if (this.isDirty) {
                this.autoSave();
            }
        }, 120000);
    }

    async handleMenuAction(action) {
        try {
            switch (action) {
                case 'new-project':
                    await this.newProject();
                    break;
                case 'open-project':
                    await this.openProject();
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
                case 'show-recent-projects':
                    this.projectManager.showLoadProjectModal();
                    break;
                case 'load-project-file':
                    await this.projectManager.importProject();
                    break;
                case 'import-project':
                    await this.projectManager.importProject();
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
        await this.populateDropdowns();
        this.updateUI();

        NotificationManager.show('New project created', 'success');
    }

    async openProject() {
        if (this.isDirty) {
            const save = await this.confirmSave();
            if (save === null) return; // User cancelled
            if (save) await this.saveProject();
        }

        try {
            const result = await window.electronAPI?.openFile?.();
            if (result?.success && result.data) {
                this.currentProject = result.data;
                this.isDirty = false;
                await this.populateDropdowns();
                this.updateUI();

                NotificationManager.show(`Project "${this.currentProject.project.name}" opened`, 'success');
            }
        } catch (error) {
            console.error('Failed to open project:', error);
            NotificationManager.show('Failed to open project', 'error');
        }
    }

    async saveProject() {
        if (!this.currentProject) return;

        try {
            this.showLoading('Saving project...');

            // Update project metadata
            this.currentProject.project.lastModified = new Date().toISOString();

            // Save to localStorage with unique key
            const projectKey = `software-estimation-project-${this.currentProject.project.id}`;
            localStorage.setItem(projectKey, JSON.stringify(this.currentProject));

            // Also save as current project
            await this.dataManager.saveProject(this.currentProject);

            this.isDirty = false;
            this.updateProjectStatus();

            // Update project manager if available
            if (this.projectManager) {
                this.projectManager.loadSavedProjects();
                this.projectManager.updateCurrentProjectUI();
            }

            NotificationManager.show('Project saved successfully', 'success');
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

            // Create a copy with new timestamp
            const projectCopy = Helpers.deepClone(this.currentProject);
            projectCopy.project.lastModified = new Date().toISOString();

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

    async autoSave() {
        if (!this.currentProject || !this.isDirty) return;

        try {
            await this.dataManager.saveProject(this.currentProject, 'autosave');
            this.updateLastSaved();
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

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
        const result = await window.electronAPI?.saveFile?.(
            `${filename}.json`,
            this.currentProject
        );

        if (!result?.success && !result?.canceled) {
            throw new Error(result?.error || 'Failed to save JSON file');
        }
    }

    async exportCSV(filename) {
        // Export features to CSV
        const csvData = this.featureManager.generateCSV();
        const blob = new Blob([csvData], { type: 'text/csv' });

        // For now, we'll use the JSON save method and let user change extension
        // In a full implementation, this would use a CSV-specific save dialog
        const result = await window.electronAPI?.saveFile?.(
            `${filename}_features.csv`,
            csvData
        );

        if (!result?.success && !result?.canceled) {
            throw new Error(result?.error || 'Failed to save CSV file');
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
        menu.innerHTML = `
            <div class="context-menu-item" data-action="export-json">
                <i class="fas fa-file-code"></i> Export as JSON
            </div>
            <div class="context-menu-item" data-action="export-csv">
                <i class="fas fa-file-csv"></i> Export as CSV
            </div>
            <div class="context-menu-item" data-action="export-excel">
                <i class="fas fa-file-excel"></i> Export as Excel
            </div>
        `;

        // Position and show menu (simplified implementation)
        document.body.appendChild(menu);

        // Handle menu clicks
        menu.addEventListener('click', async (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action) {
                const format = action.replace('export-', '');
                await this.exportProject(format);
            }
            menu.remove();
        });

        // Remove menu on outside click
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }

    async loadLastProject() {
        try {
            const lastProject = await this.dataManager.loadProject();
            if (lastProject) {
                this.currentProject = lastProject;
                await this.populateDropdowns();
            }
        } catch (error) {
            console.warn('Failed to load last project:', error);
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
        this.updateProjectStatus();
    }

    updateUI() {
        this.updateProjectInfo();
        this.updateProjectStatus();
        this.featureManager.refreshTable();
        this.updateSummary();
    }

    updateProjectInfo() {
        if (!this.currentProject) return;

        const projectNameEl = document.getElementById('project-name');
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

    updateSummary() {
        if (!this.currentProject) return;

        const features = this.currentProject.features;
        const totalFeatures = features.length;
        const totalManDays = features.reduce((sum, feature) => sum + (feature.manDays || 0), 0);
        const averageManDays = totalFeatures > 0 ? (totalManDays / totalFeatures).toFixed(1) : 0;

        // Update summary display
        const totalFeaturesEl = document.getElementById('total-features');
        const totalManDaysEl = document.getElementById('total-man-days');
        const averageManDaysEl = document.getElementById('average-man-days');

        if (totalFeaturesEl) totalFeaturesEl.textContent = totalFeatures;
        if (totalManDaysEl) totalManDaysEl.textContent = totalManDays;
        if (averageManDaysEl) averageManDaysEl.textContent = averageManDays;
    }

    updateLastSaved() {
        const lastSavedEl = document.getElementById('last-saved');
        if (lastSavedEl) {
            lastSavedEl.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
        }
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const messageEl = overlay?.querySelector('p');

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

    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add delay to ensure all scripts are loaded
    setTimeout(() => {
        console.log('Starting app initialization...');

        // Check if all required classes are available
        const requiredClasses = [
            'DataManager', 'FeatureManager', 'NavigationManager',
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