/**
 * Project Business Logic - Pure business logic without UI dependencies
 * Extracted from ProjectManager for use by React components
 */

class ProjectBusinessLogic extends BaseComponent {
    constructor(app) {
        super('ProjectBusinessLogic');
        this.app = app;
        
        // Business state
        this.recentProjects = [];
        this.savedProjects = [];
        
        this.initializeBusinessLogic();
    }
    
    async initializeBusinessLogic() {
        try {
            await this.loadRecentProjects();
            await this.loadSavedProjects();
            console.log('Project business logic initialized successfully');
        } catch (error) {
            console.error('Failed to initialize project business logic:', error);
        }
    }

    // =====================================
    // RECENT PROJECTS MANAGEMENT
    // =====================================

    async loadRecentProjects() {
        try {
            const data = localStorage.getItem('recent-projects');
            this.recentProjects = data ? JSON.parse(data) : [];
            console.log(`Loaded ${this.recentProjects.length} recent projects`);
        } catch (error) {
            console.error('Failed to load recent projects:', error);
            this.recentProjects = [];
        }
    }

    async addToRecentProjects(projectData) {
        try {
            const recentItem = {
                id: projectData.project.id,
                name: projectData.project.name,
                version: projectData.project.version,
                lastOpened: new Date().toISOString(),
                filePath: this.app.dataManager?.currentProjectPath
            };

            // Remove if already exists
            this.recentProjects = this.recentProjects.filter(p => p.id !== recentItem.id);
            
            // Add to beginning
            this.recentProjects.unshift(recentItem);
            
            // Keep only last 10
            this.recentProjects = this.recentProjects.slice(0, 10);
            
            // Save to localStorage
            localStorage.setItem('recent-projects', JSON.stringify(this.recentProjects));
            
            // Dispatch events
            window.dispatchEvent(new CustomEvent('recent-projects-updated'));
            
            console.log(`Added "${recentItem.name}" to recent projects`);
        } catch (error) {
            console.error('Failed to add to recent projects:', error);
        }
    }

    removeRecentProject(projectId) {
        try {
            this.recentProjects = this.recentProjects.filter(p => p.id !== projectId);
            localStorage.setItem('recent-projects', JSON.stringify(this.recentProjects));
            window.dispatchEvent(new CustomEvent('recent-projects-updated'));
            console.log(`Removed project ${projectId} from recent projects`);
        } catch (error) {
            console.error('Failed to remove recent project:', error);
        }
    }

    clearRecentProjects() {
        try {
            this.recentProjects = [];
            localStorage.removeItem('recent-projects');
            window.dispatchEvent(new CustomEvent('recent-projects-updated'));
            console.log('Cleared all recent projects');
        } catch (error) {
            console.error('Failed to clear recent projects:', error);
        }
    }

    // =====================================
    // SAVED PROJECTS MANAGEMENT
    // =====================================

    async loadSavedProjects() {
        try {
            if (!this.app.dataManager) {
                throw new Error('Data manager not available');
            }

            const projects = await this.app.dataManager.listProjects();
            this.savedProjects = projects;
            console.log(`Loaded ${this.savedProjects.length} saved projects`);
            
            window.dispatchEvent(new CustomEvent('saved-projects-updated'));
        } catch (error) {
            console.error('Failed to load saved projects:', error);
            this.savedProjects = [];
        }
    }

    // =====================================
    // PROJECT OPERATIONS
    // =====================================

    async createNewProject(formData) {
        try {
            // Validate input
            this.validateNewProjectData(formData);

            // Initialize phases with default structure (fixing version snapshot issue)
            const initializedPhases = this.createInitialPhases();
            console.log('✅ DEBUG: initializedPhases created:', Object.keys(initializedPhases));

            // Create project data structure
            const projectData = {
                project: {
                    id: formData.code,
                    code: formData.code,
                    name: formData.name,
                    description: formData.description || '',
                    version: '1.0.0',
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                },
                features: [],
                phases: initializedPhases,
                config: {
                    projectOverrides: {}
                },
                coverage: 0,
                coverageIsAutoCalculated: true,
                versions: []
            };

            // Load project into application
            await this.loadProjectData(projectData, `new-project-${Date.now()}`);
            
            // Mark as dirty for auto-save
            if (this.app.store) {
                this.app.store.getState().markDirty();
            }

            console.log(`Created new project: ${formData.name}`);
            NotificationManager.success(`Project "${formData.name}" created successfully`);

        } catch (error) {
            console.error('Failed to create new project:', error);
            NotificationManager.error(`Failed to create project: ${error.message}`);
            throw error;
        }
    }

    validateNewProjectData(formData) {
        const errors = {};

        // Validate code
        if (!formData.code) {
            errors.code = 'Project code is required';
        } else if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
            errors.code = 'Project code can only contain uppercase letters, numbers, hyphens and underscores';
        } else if (formData.code.length < 3) {
            errors.code = 'Project code must be at least 3 characters long';
        } else if (formData.code.length > 20) {
            errors.code = 'Project code must be less than 20 characters';
        }

        // Validate name
        if (!formData.name) {
            errors.name = 'Project name is required';
        } else if (formData.name.length < 3) {
            errors.name = 'Project name must be at least 3 characters long';
        } else if (formData.name.length > 100) {
            errors.name = 'Project name must be less than 100 characters';
        }

        // Validate description
        if (formData.description && formData.description.length > 500) {
            errors.description = 'Description must be less than 500 characters';
        }

        if (Object.keys(errors).length > 0) {
            throw new Error('Validation failed: ' + JSON.stringify(errors));
        }
    }

    async loadProjectData(projectData, source = 'unknown') {
        try {
            console.log(`Loading project data from source: ${source}`);
            
            // Validate project data
            this.validateProjectData(projectData);

            // Update application store with forced synchronization and reference validation
            // CRITICAL FIX: Force use of global store to ensure consistency
            const globalStore = window.appStore;
            if (globalStore) {
                globalStore.getState().setProject(projectData);
                
                // Force store reference consistency across all components
                this.validateAndRefreshStoreReferences();
                
                // Force a small delay to ensure store update propagates through all listeners
                // This prevents race conditions between different parts of the system
                await new Promise(resolve => setTimeout(resolve, 50));
                
                console.log('🔄 Store update forced to propagate, project should be available to all systems');
            }

            // Extract filePath from source and update DataManager currentProjectPath for React components
            if (source.startsWith('file:') && this.app.dataManager) {
                const filePath = source.substring(5); // Remove 'file:' prefix
                this.app.dataManager.currentProjectPath = filePath;
            }

            // Add to recent projects
            await this.addToRecentProjects(projectData);

            // Trigger updates in other managers
            this.notifyProjectLoaded(projectData);

            // Update window title with project info
            await this.updateWindowTitle(projectData);

            // Wait for project to be fully synchronized in store before proceeding
            console.log('🔄 Waiting for project synchronization in store...');
            await this.waitForProjectInStore();
            console.log('✅ Project synchronized in store');

            // Create initial version for new projects (AFTER store sync)
            if (source && source.startsWith('new-project-')) {
                try {
                    if (window.versionHistoryActions) {
                        await window.versionHistoryActions.createVersion('Initial project creation');
                        console.log('✅ Initial version created for new project');
                    } else {
                        console.warn('⚠️ versionHistoryActions not available, initial version not created');
                    }
                } catch (error) {
                    console.error('❌ Failed to create initial version:', error);
                    // Don't throw error to avoid breaking project creation
                }
            }

            // Auto-navigate to features section (AFTER version creation)
            if (this.app.navigationManager) {
                try {
                    console.log('🔄 Navigating to features...');
                    this.app.navigationManager.navigateTo('features');
                    console.log('✅ Navigation to features completed');
                } catch (error) {
                    console.error('Failed to navigate to features after project load:', error);
                }
            }

            console.log(`✅ Project "${projectData.project.name}" loaded successfully`);
        } catch (error) {
            console.error('Failed to load project data:', error);
            throw error;
        }
    }

    validateProjectData(projectData) {
        if (!projectData || typeof projectData !== 'object') {
            throw new Error('Invalid project data');
        }

        if (!projectData.project) {
            throw new Error('Missing project metadata');
        }

        if (!projectData.project.name) {
            throw new Error('Missing project name');
        }

        if (!Array.isArray(projectData.features)) {
            throw new Error('Invalid features data');
        }

        if (!projectData.phases || typeof projectData.phases !== 'object') {
            throw new Error('Invalid phases data');
        }

        if (!projectData.config || typeof projectData.config !== 'object') {
            throw new Error('Invalid configuration data');
        }
    }

    notifyProjectLoaded(projectData) {
        // Let other components know about project load
        window.dispatchEvent(new CustomEvent('project-loaded', {
            detail: projectData
        }));
    }

    async saveCurrentProject() {
        try {
            if (!this.app.store) {
                throw new Error('Store not available');
            }

            const state = this.app.store.getState();
            if (!state.currentProject) {
                throw new Error('No project to save');
            }


            if (!this.app.dataManager) {
                throw new Error('Data manager not available');
            }

            // CRITICAL: Sync finalMDsOverrides from calculationsData to currentProject before saving
            const calculationsData = state.calculationsData;
            
            if (calculationsData?.finalMDsOverrides) {
                state.currentProject.finalMDsOverrides = { ...calculationsData.finalMDsOverrides };
            }

            // Save project (now includes manual finalMDsOverrides modifications)
            const result = await this.app.dataManager.saveProject(state.currentProject);
            
            if (result.success) {
                // Mark as clean
                state.markClean();
                
                // Update recent projects
                await this.addToRecentProjects(state.currentProject);
                
                // Refresh saved projects list
                await this.loadSavedProjects();
                
                // 🔧 FIX: Aggiorna la versione corrente con i dati di calcolo aggiornati
                try {
                    if (state.currentProject.versions && state.currentProject.versions.length > 0) {
                        console.log('🔄 Updating current version with latest calculationData after save...');
                        
                        // Importa dinamicamente VersionHistoryActions
                        const { VersionHistoryActions } = await import('../react/actions/VersionHistoryActions.js');
                        const versionActions = new VersionHistoryActions();
                        await versionActions.updateCurrentVersion();
                        
                        console.log('✅ Current version updated successfully with latest data');
                    }
                } catch (versionError) {
                    console.error('⚠️  Failed to update current version after save (non-critical):', versionError);
                    // Non fallire il salvataggio se l'aggiornamento versione fallisce
                }
                
                console.log('Project saved successfully');
                NotificationManager.success('Project saved successfully');
            } else {
                throw new Error(result.error || 'Failed to save project');
            }
        } catch (error) {
            console.error('Failed to save project:', error);
            NotificationManager.error(`Failed to save project: ${error.message}`);
            throw error;
        }
    }

    async closeCurrentProject() {
        try {
            if (!this.app.store) {
                throw new Error('Store not available');
            }

            const state = this.app.store.getState();
            
            // Check for unsaved changes
            if (state.isDirty) {
                const save = confirm('You have unsaved changes. Do you want to save before closing?');
                if (save) {
                    await this.saveCurrentProject();
                }
            }

            // Clear current project
            state.setProject(null);
            
            // Clear data manager state
            if (this.app.dataManager) {
                this.app.dataManager.currentProjectPath = null;
            }

            // Reset window title to default
            await this.resetWindowTitle();

            console.log('Project closed successfully');
            NotificationManager.success('Project closed successfully');

        } catch (error) {
            console.error('Failed to close project:', error);
            NotificationManager.error(`Failed to close project: ${error.message}`);
            throw error;
        }
    }

    async loadSavedProject(filePath) {
        try {
            if (!this.app.dataManager) {
                throw new Error('Data manager not available');
            }

            console.log(`🔄 Loading project from file: ${filePath}`);
            const projectData = await this.app.dataManager.loadProject(filePath);
            
            if (projectData && typeof projectData === 'object' && projectData.project) {
                console.log(`🔄 Project data loaded, starting enhanced loading sequence...`);
                await this.loadProjectData(projectData, `file:${filePath}`);
                console.log(`✅ Project loaded successfully: ${projectData.project.name}`);
                NotificationManager.success(`Project loaded successfully`);
            } else {
                throw new Error('Invalid project data returned from DataManager');
            }
        } catch (error) {
            console.error('❌ Failed to load saved project:', error);
            NotificationManager.error(`Failed to load project: ${error.message}`);
            throw error;
        }
    }

    async loadRecentProject(projectId) {
        try {
            console.log(`🔄 Loading recent project: ${projectId}`);
            const recentProject = this.recentProjects.find(p => p.id === projectId);
            if (!recentProject) {
                throw new Error('Recent project not found');
            }

            if (recentProject.filePath) {
                console.log(`🔄 Recent project file path found, delegating to loadSavedProject...`);
                await this.loadSavedProject(recentProject.filePath);
            } else {
                throw new Error('Recent project file path not available');
            }
        } catch (error) {
            console.error('❌ Failed to load recent project:', error);
            NotificationManager.error(`Failed to load recent project: ${error.message}`);
            throw error;
        }
    }

    async exportSavedProject(filePath) {
        try {
            if (!this.app.dataManager) {
                throw new Error('Data manager not available');
            }

            // This would typically open a file dialog and export
            // For now, just log the action
            console.log(`Exporting project: ${filePath}`);
            NotificationManager.success('Export functionality would be implemented here');
        } catch (error) {
            console.error('Failed to export project:', error);
            NotificationManager.error(`Failed to export project: ${error.message}`);
            throw error;
        }
    }

    async deleteSavedProject(filePath) {
        try {
            if (!this.app.dataManager) {
                throw new Error('Data manager not available');
            }

            const confirmed = confirm('Are you sure you want to delete this project? This action cannot be undone.');
            if (!confirmed) {
                return;
            }

            console.log(`🗑️ Deleting project: ${filePath}`);
            
            // Actually delete the project using DataManager
            const success = await this.app.dataManager.deleteProject(filePath);
            
            if (success) {
                // Refresh saved projects list
                await this.loadSavedProjects();
                
                console.log(`✅ Project deleted successfully: ${filePath}`);
                NotificationManager.success('Project deleted successfully');
            } else {
                throw new Error('Delete operation failed');
            }
        } catch (error) {
            console.error('❌ Failed to delete project:', error);
            NotificationManager.error(`Failed to delete project: ${error.message}`);
            throw error;
        }
    }

    // =====================================
    // WINDOW TITLE MANAGEMENT
    // =====================================

    /**
     * Update window title with project code and name
     */
    async updateWindowTitle(projectData) {
        try {
            if (!projectData || !projectData.project) {
                await this.resetWindowTitle();
                return;
            }

            const { id, name } = projectData.project;
            
            // Format: "PJ-07 - Progetto A"
            let title;
            if (id && name) {
                title = `${id} - ${name}`;
            } else if (name) {
                // Fallback se manca il codice
                title = name;
            } else {
                // Fallback se mancano entrambi
                title = 'Untitled Project';
            }

            // Set title through Electron API
            if (window.electronAPI && window.electronAPI.setWindowTitle) {
                const result = await window.electronAPI.setWindowTitle(title);
                if (result.success) {
                    console.log(`✅ Window title updated: "${title}"`);
                } else {
                    console.warn('⚠️ Failed to update window title:', result.reason || result.error);
                }
            } else {
                console.warn('⚠️ Electron API not available for window title update');
            }
        } catch (error) {
            console.error('❌ Failed to update window title:', error);
        }
    }

    /**
     * Reset window title to default
     */
    async resetWindowTitle() {
        try {
            if (window.electronAPI && window.electronAPI.setWindowTitle) {
                const result = await window.electronAPI.setWindowTitle('Software Estimation Manager');
                if (result.success) {
                    console.log('✅ Window title reset to default');
                } else {
                    console.warn('⚠️ Failed to reset window title:', result.reason || result.error);
                }
            }
        } catch (error) {
            console.error('❌ Failed to reset window title:', error);
        }
    }

    /**
     * Create initial phases structure for new projects
     * Fixes version snapshot issue by ensuring complete phases from start
     */
    createInitialPhases() {
        const now = new Date().toISOString();
        
        // Phase definitions (from app-store.js)
        const phaseDefinitions = [
            {
                id: "functionalAnalysis",
                name: "Functional Analysis",
                description: "Business requirements analysis and functional specification",
                type: "analysis",
                defaultEffort: { G1: 100, G2: 0, TA: 20, PM: 50 },
                editable: true
            },
            {
                id: "technicalAnalysis",
                name: "Technical Analysis", 
                description: "Technical design and architecture specification",
                type: "analysis",
                defaultEffort: { G1: 0, G2: 100, TA: 60, PM: 20 },
                editable: true
            },
            {
                id: "development",
                name: "Development",
                description: "Implementation of features (calculated from features list)",
                type: "development", 
                defaultEffort: { G1: 0, G2: 100, TA: 40, PM: 20 },
                editable: true,
                calculated: true
            },
            {
                id: "integrationTests",
                name: "Integration Tests",
                description: "System integration and integration testing", 
                type: "testing",
                defaultEffort: { G1: 100, G2: 50, TA: 50, PM: 75 },
                editable: true
            },
            {
                id: "uatTests", 
                name: "UAT Tests",
                description: "User acceptance testing support and execution",
                type: "testing",
                defaultEffort: { G1: 50, G2: 50, TA: 40, PM: 75 },
                editable: true
            },
            {
                id: "consolidation",
                name: "Consolidation",
                description: "Final testing, bug fixing, and deployment preparation", 
                type: "testing",
                defaultEffort: { G1: 30, G2: 30, TA: 30, PM: 20 },
                editable: true
            },
            {
                id: "vapt",
                name: "VAPT", 
                description: "Vulnerability Assessment and Penetration Testing",
                type: "security",
                defaultEffort: { G1: 30, G2: 30, TA: 30, PM: 20 },
                editable: true
            },
            {
                id: "postGoLive", 
                name: "Post Go-Live Support",
                description: "Production support and monitoring after deployment",
                type: "support", 
                defaultEffort: { G1: 0, G2: 100, TA: 50, PM: 100 },
                editable: true
            }
        ];

        // Create phases object
        const phases = {};
        
        // Initialize each phase with default values
        phaseDefinitions.forEach(def => {
            phases[def.id] = {
                manDays: 0,
                effort: { ...def.defaultEffort },
                assignedResources: [],
                cost: 0,
                lastModified: now
            };
        });

        // Add selectedSuppliers
        phases.selectedSuppliers = {
            G1: null,
            G2: null, 
            TA: null,
            PM: null
        };

        return phases;
    }

    /**
     * Wait for project to be available in store before navigation
     * Prevents race conditions between store updates and navigation
     * Enhanced with longer timeout and exponential backoff
     */
    /**
     * Wait for project to be available in store before navigation
     * Prevents race conditions between store updates and navigation
     * Enhanced to ensure both business logic AND navigation system see the project
     */
    /**
     * Wait for project to be available in store before navigation
     * Enhanced with event-based verification and fresh store references
     */
    /**
     * Wait for project to be available in store before navigation
     * UNIFIED STORE APPROACH: Uses only window.appStore + navigation events
     */
    async waitForProjectInStore(timeout = 3000, maxRetries = 2) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let navigationEventReceived = false;
            
            // Listen for navigation event that indicates project is ready
            const navigationListener = () => {
                navigationEventReceived = true;
                console.log('✅ Navigation event received - project should be ready');
            };
            
            // Add temporary listener for navigation ready event
            window.addEventListener('navigation-project-ready', navigationListener, { once: true });
            
            const checkProject = () => {
                const globalStore = window.appStore;
                let projectAvailable = false;
                
                if (globalStore) {
                    try {
                        const state = globalStore.getState();
                        projectAvailable = state.currentProject !== null;
                        
                        if (projectAvailable) {
                            console.log('✅ Project confirmed in global store, ready for operations');
                            window.removeEventListener('navigation-project-ready', navigationListener);
                            resolve(true);
                            return;
                        }
                    } catch (error) {
                        console.warn('⚠️ Error checking global store:', error);
                    }
                } else {
                    console.warn('⚠️ Global store not available');
                }
                
                const elapsed = Date.now() - startTime;
                
                // If we received navigation event but store still shows no project,
                // it might be a very small timing issue - give it one more moment
                if (navigationEventReceived && !projectAvailable && elapsed < timeout + 500) {
                    console.log('🔄 Navigation event received but project not in store yet, waiting briefly...');
                    setTimeout(checkProject, 50);
                    return;
                }
                
                // Check timeout
                if (elapsed > timeout) {
                    window.removeEventListener('navigation-project-ready', navigationListener);
                    
                    // If we got navigation event, proceed anyway (likely just a timing issue)
                    if (navigationEventReceived) {
                        console.log('⚠️ Navigation event received - proceeding despite store timing issue');
                        resolve(true);
                        return;
                    }
                    
                    console.error(`❌ Project sync timeout after ${timeout}ms - no project found in global store`);
                    reject(new Error(`Timeout waiting for project in global store after ${timeout}ms`));
                    return;
                }
                
                // Continue polling with shorter intervals
                setTimeout(checkProject, 25);
            };
            
            // Start checking immediately
            checkProject();
            
            // Also trigger the navigation event manually if we detect the project is already there
            // This handles cases where the event was fired before we started listening
            setTimeout(() => {
                const globalStore = window.appStore;
                if (globalStore && globalStore.getState().currentProject && !navigationEventReceived) {
                    console.log('🔄 Project detected in store, triggering navigation ready event');
                    window.dispatchEvent(new CustomEvent('navigation-project-ready'));
                }
            }, 100);
        });
    }

    /**
     * Validate and refresh store references across all components
     * Ensures all parts of the application use the same store instance
     */
    /**
     * Validate and refresh store references across all components
     * UNIFIED STORE APPROACH: Force all components to use window.appStore
     */
    validateAndRefreshStoreReferences() {
        const globalStore = window.appStore;
        if (!globalStore) {
            console.warn('⚠️ Global store not available for reference validation');
            return;
        }

        // Force navigation manager to use global store
        if (this.app.navigationManager) {
            this.app.navigationManager.store = globalStore;
            console.log('🔄 Navigation manager now uses global store');
        }

        // Force business logic to also use global store for consistency
        this.app.store = globalStore;

        console.log('✅ All components now use unified global store reference');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ProjectBusinessLogic = ProjectBusinessLogic;
}

console.log('Project Business Logic loaded');