/**
 * Project Manager - Handles project loading, saving, and management
 * FIXED: Removed calls to non-existent populateDropdowns method
 */

class ProjectManager {
    constructor(app) {
        this.app = app;
        
        // Connect to global state store (may not be available immediately)
        this.store = window.appStore;
        this.storeUnsubscribe = null;
        
        this.recentProjects = [];
        this.savedProjects = [];
        this.maxRecentProjects = 10;
        this.selectedFile = null;

        this.init();
        this.setupStoreSubscription();
        
        // If store wasn't available during construction, try to connect when it becomes available
        if (!this.store) {
            console.log('Store not available during ProjectManager construction, will attempt to connect later');
            this.connectToStoreWhenReady();
        }
    }
    /**
     * Setup store subscription for reactive project updates
     */
    setupStoreSubscription() {
        if (!this.store) {
            console.warn('Store not available for ProjectManager');
            return;
        }

        this.storeUnsubscribe = this.store.subscribe((state, prevState) => {
            // React to project changes
            if (state.currentProject !== prevState.currentProject) {
                this.handleProjectChange(state.currentProject, prevState.currentProject);
            }

            // React to dirty state changes
            if (state.isDirty !== prevState.isDirty) {
                this.handleDirtyStateChange(state.isDirty);
            }
        });
    }

    /**
     * Attempt to connect to store when it becomes available
     */
    connectToStoreWhenReady() {
        // Check periodically for store availability
        const checkForStore = () => {
            if (window.appStore && !this.store) {
                console.log('Store now available, connecting ProjectManager...');
                this.store = window.appStore;
                this.setupStoreSubscription();
                return;
            }
            
            // Keep checking every 100ms for up to 5 seconds
            if (!this.store && (this.storeCheckAttempts || 0) < 50) {
                this.storeCheckAttempts = (this.storeCheckAttempts || 0) + 1;
                setTimeout(checkForStore, 100);
            } else if (!this.store) {
                console.warn('ProjectManager: Store not available after 5 seconds, will operate without store integration');
            }
        };
        
        setTimeout(checkForStore, 100);
    }
    
    /**
     * Handle project changes from global state
     */
    handleProjectChange(newProject, previousProject) {
        console.log('ProjectManager: Project changed', {
            hasNew: !!newProject,
            hasPrevious: !!previousProject,
            newProjectName: newProject?.project?.name,
            previousProjectName: previousProject?.project?.name
        });

        // Update UI based on project state
        this.updateCurrentProjectUI();
        
        if (newProject) {
            // Project loaded/changed
            this.updateUI();
        } else {
            // Project closed  
            this.clearProjectUI();
        }
    }

    /**
     * Handle dirty state changes from global state
     */
    handleDirtyStateChange(isDirty) {
        console.log('ProjectManager: Dirty state changed', isDirty);
        // Update UI indicators for dirty state
        this.updateCurrentProjectUI();
    }

    /**
     * Cleanup store subscription
     */
    destroy() {
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
            this.storeUnsubscribe = null;
        }
    }

    init() {
        this.loadRecentProjects();

        // AUTO-LOAD: Load saved projects automatically at startup
        this.loadSavedProjects().then(() => {
            console.log(`Loaded ${this.savedProjects.length} saved projects at startup`);
        });

        this.setupEventListeners();

        // Delay initial UI update to ensure DOM is ready
        setTimeout(() => {
            this.updateUI();
        }, 100);
    }

    setupEventListeners() {
        // Main project actions
        document.getElementById('new-project-btn')?.addEventListener('click', () => {
            this.showNewProjectModal();
        });

        document.getElementById('load-project-btn')?.addEventListener('click', () => {
            this.showLoadProjectModal();
        });

        document.getElementById('save-current-project-btn')?.addEventListener('click', () => {
            this.saveCurrentProject();
        });

        document.getElementById('close-current-project-btn')?.addEventListener('click', async () => {
            await this.closeCurrentProject();
        });

        // Recent projects actions
        document.getElementById('clear-recent-btn')?.addEventListener('click', () => {
            this.clearRecentProjects();
        });

        document.getElementById('refresh-projects-btn')?.addEventListener('click', () => {
            this.refreshProjects();
        });

        // New Project Modal
        document.getElementById('create-project-btn')?.addEventListener('click', () => {
            this.createNewProjectFromModal();
        });

        document.getElementById('cancel-new-project-btn')?.addEventListener('click', () => {
            this.closeNewProjectModal();
        });

        document.querySelector('#new-project-modal .modal-close')?.addEventListener('click', () => {
            this.closeNewProjectModal();
        });

        // New project form submission
        document.getElementById('new-project-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createNewProjectFromModal();
        });

        // Load Project Modal actions
        document.getElementById('select-file-btn')?.addEventListener('click', () => {
            document.getElementById('project-file-input')?.click();
        });

        document.getElementById('project-file-input')?.addEventListener('change', (e) => {
            this.handleFileSelection(e);
        });

        document.getElementById('load-selected-project-btn')?.addEventListener('click', () => {
            this.loadSelectedProject();
        });

        document.getElementById('cancel-load-btn')?.addEventListener('click', () => {
            this.closeLoadModal();
        });

        // Modal close
        document.querySelector('#project-load-modal .modal-close')?.addEventListener('click', () => {
            this.closeLoadModal();
        });
    }

    /**
     * Show new project modal
     */
    showNewProjectModal() {
        // Check if current project needs saving
        if (this.app.isDirty) {
            const confirmed = confirm('You have unsaved changes. Creating a new project will discard them. Continue?');
            if (!confirmed) return;
        }

        // Reset form
        this.resetNewProjectForm();

        const modal = document.getElementById('new-project-modal');
        if (modal) {
            modal.classList.add('active');

            // Focus first input
            const codeInput = document.getElementById('project-code');
            if (codeInput) {
                setTimeout(() => codeInput.focus(), 100);
            }
        }
    }

    /**
     * Close new project modal
     */
    closeNewProjectModal() {
        const modal = document.getElementById('new-project-modal');
        if (modal) {
            modal.classList.remove('active');
        }

        this.resetNewProjectForm();
    }

    /**
     * Reset new project form
     */
    resetNewProjectForm() {
        const form = document.getElementById('new-project-form');
        if (form) {
            form.reset();
        }

        // Clear any validation errors
        this.clearNewProjectFormErrors();
    }

    /**
     * Create new project from modal data
     */
    async createNewProjectFromModal() {
        try {

            // Try normal method first, then alternative method
            let formData = this.getNewProjectFormData();

            console.log('Form data (normal method):', formData);

            // If name is empty, try alternative method
            if (!formData.name) {
                console.log('Name empty, trying alternative method...');
                formData = this.getNewProjectFormDataAlternative();
                console.log('Form data (alternative method):', formData);
            }

            // Validate form data
            const validation = this.validateNewProjectData(formData);
            if (!validation.isValid) {
                console.log('Validation failed:', validation.errors);
                this.showNewProjectFormErrors(validation.errors);
                return;
            }

            // Check if project code already exists
            if (await this.projectCodeExists(formData.code)) {
                this.showNewProjectFormErrors({ code: 'Project code already exists' });
                return;
            }

            // Create new project with form data
            await this.createNewProject(formData);

            // Close modal
            this.closeNewProjectModal();

        } catch (error) {
            console.error('Failed to create new project:', error);
            NotificationManager.error(`Failed to create project: ${error.message}`);
        }
    }

    /**
     * FIXED: Create new project method
     */
    async createNewProject(formData) {
        try {
            const currentState = this.store.getState();
            
            // Check if current project needs saving
            if (currentState.isDirty) {
                const save = await this.confirmSave();
                if (save === null) return; // User cancelled
                if (save) await this.app.saveProject();
            }

            // Create new project with form data instead of calling app.newProject()
            const newProject = {
                project: {
                    id: this.generateProjectId(),
                    code: formData.code,
                    name: formData.name,
                    description: formData.description,
                    version: '1.0.0',
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString()
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
                config: await this.app.configManager.initializeProjectConfig() // Use properly initialized config
            };

            // CLEANUP: Clear all previous project data before setting new project
            await this.cleanupPreviousProjectData();

            // Set as current project using global state
            this.store.getState().setProject(newProject);
            
            // Mark as dirty since it's a new project
            this.store.getState().markDirty();

            // Notify navigation manager that a project was loaded
            this.app.navigationManager.onProjectLoaded();

            // AUTO-SAVE: Save new project automatically
            console.log('Auto-saving new project...');
            const saveResult = await this.app.dataManager.saveProject(newProject);

            if (saveResult.success) {
                // Mark as clean after successful save
                this.store.getState().markClean();
                this.app.dataManager.currentProjectPath = saveResult.filePath;

                // Add to recent projects with the saved file path
                this.addToRecentProjects(newProject.project, saveResult.filePath);

                // Refresh saved projects list
                await this.loadSavedProjects();
                this.renderSavedProjects();

                console.log('New project auto-saved to:', saveResult.filePath);
                NotificationManager.success(`New project created and saved: ${saveResult.fileName}`);
            } else {
                console.warn('Auto-save failed, project created but not saved');
                this.app.dataManager.currentProjectPath = 'new-project';
                NotificationManager.warning('Project created but auto-save failed');
            }

            this.app.refreshDropdowns();

            // Update UI - handled by store subscription
            // this.app.updateUI();
            // this.updateCurrentProjectUI();

            // Reset all phase data to ensure clean state FIRST
            if (this.app.projectPhasesManager) {
                this.app.projectPhasesManager.resetAllPhaseData();
            }

            // Wait a moment to ensure all async operations complete
            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify project is clean before creating initial version
            const currentProject = this.store.getState().currentProject;
            console.log('🔍 Verifying project state before initial version:', {
                features: currentProject.features?.length || 0,
                developmentManDays: currentProject.phases?.development?.manDays || 'N/A',
                selectedSuppliers: currentProject.phases?.selectedSuppliers || 'N/A',
                projectName: currentProject.project?.name
            });

            // Create initial version ONLY after everything is completely clean
            try {
                if (this.app.versionManager) {
                    await this.app.versionManager.createVersion('Initial project creation');
                    console.log('✅ Initial version created after complete cleanup and verification');
                }
            } catch (error) {
                console.error('Failed to create initial version:', error);
            }

            // Navigate to features section
            this.app.navigationManager.navigateTo('features');

        } catch (error) {
            console.error('Failed to create new project:', error);
            NotificationManager.error(`Failed to create new project: ${error.message}`);
        }
    }

    /**
     * Generate a unique project ID
     */
    generateProjectId() {
        return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get new project form data
     */
    getNewProjectFormData() {
        // Debug: log to verify values
        const codeEl = document.getElementById('project-code');
        const nameEl = document.getElementById('project-name');
        const descEl = document.getElementById('project-description');

        console.log('Form elements found:', {
            code: !!codeEl,
            name: !!nameEl,
            desc: !!descEl
        });

        const formData = {
            code: codeEl?.value?.trim().toUpperCase() || '',
            name: nameEl?.value?.trim() || '',
            description: descEl?.value?.trim() || ''
        };

        console.log('Form data extracted:', formData);

        return formData;
    }

    /**
     * Get new project form data (more robust alternative version)
     */
    getNewProjectFormDataAlternative() {
        // Try alternative methods to find fields
        let codeValue = '';
        let nameValue = '';
        let descValue = '';

        // Method 1: getElementById
        const codeEl1 = document.getElementById('project-code');
        const nameEl1 = document.getElementById('project-name');
        const descEl1 = document.getElementById('project-description');

        // Method 2: querySelector
        const codeEl2 = document.querySelector('#project-code');
        const nameEl2 = document.querySelector('#project-name');
        const descEl2 = document.querySelector('#project-description');

        // Method 3: querySelector by name
        const codeEl3 = document.querySelector('input[name="code"]');
        const nameEl3 = document.querySelector('input[name="name"]');
        const descEl3 = document.querySelector('textarea[name="description"]');

        console.log('Elements found by different methods:', {
            byId: { code: !!codeEl1, name: !!nameEl1, desc: !!descEl1 },
            byQuerySelector: { code: !!codeEl2, name: !!nameEl2, desc: !!descEl2 },
            byName: { code: !!codeEl3, name: !!nameEl3, desc: !!descEl3 }
        });

        // Try to get values with different methods
        codeValue = (codeEl1?.value || codeEl2?.value || codeEl3?.value || '').trim().toUpperCase();
        nameValue = (nameEl1?.value || nameEl2?.value || nameEl3?.value || '').trim();
        descValue = (descEl1?.value || descEl2?.value || descEl3?.value || '').trim();

        console.log('Values extracted:', { codeValue, nameValue, descValue });

        return {
            code: codeValue,
            name: nameValue,
            description: descValue
        };
    }

    /**
     * Validate new project data
     */
    validateNewProjectData(data) {
        const errors = {};

        console.log('Validating data:', data);

        // Check if project code is invalid (empty or less than 3 characters)
        const codeInvalid = !data.code || data.code.length < 3;
        // Check if project name is invalid (empty)
        const nameInvalid = !data.name || data.name === '';

        // Special case: both fields are invalid
        if (codeInvalid && nameInvalid) {
            console.log('Both fields are invalid, showing generic message');
            return {
                isValid: false,
                errors: {
                    code: 'Compila questo campo',
                    name: 'Compila questo campo'
                }
            };
        }

        // Standard validation for individual fields
        // Validate project code
        if (!data.code) {
            errors.code = 'Project code is required';
        } else if (!/^[A-Z0-9_-]+$/.test(data.code)) {
            errors.code = 'Project code can only contain uppercase letters, numbers, hyphens and underscores';
        } else if (data.code.length < 3) {
            errors.code = 'Project code must be at least 3 characters long';
        } else if (data.code.length > 20) {
            errors.code = 'Project code must be less than 20 characters';
        }

        // Validate project name
        if (!data.name || data.name === '') {
            errors.name = 'Project name is required';
            console.log('Name validation failed, value:', `"${data.name}"`);
        } else if (data.name.length < 3) {
            errors.name = 'Project name must be at least 3 characters long';
        } else if (data.name.length > 100) {
            errors.name = 'Project name must be less than 100 characters';
        }

        // Validate description (optional)
        if (data.description && data.description.length > 500) {
            errors.description = 'Description must be less than 500 characters';
        }

        console.log('Validation errors:', errors);

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Check if project code already exists
     */
    async projectCodeExists(code) {
        try {
            // Check in recent projects
            const recentExists = this.recentProjects.some(p =>
                p.code && p.code.toUpperCase() === code.toUpperCase()
            );

            if (recentExists) return true;

            // Check in saved projects
            await this.loadSavedProjects();
            const savedExists = this.savedProjects.some(p =>
                p.project.code && p.project.code.toUpperCase() === code.toUpperCase()
            );

            return savedExists;
        } catch (error) {
            console.warn('Could not check for existing project codes:', error);
            return false; // Continue if check fails
        }
    }

    /**
     * Show form validation errors using tooltip system
     */
    showNewProjectFormErrors(errors) {
        console.log('🔧 showNewProjectFormErrors called with:', errors);
        
        // Clear existing errors
        this.clearNewProjectFormErrors();

        // Show new errors using tooltip system
        Object.keys(errors).forEach(field => {
            const fieldId = `project-${field}`;
            const element = document.getElementById(fieldId);
            
            console.log(`🔍 Looking for element: ${fieldId}`, element);

            if (element) {
                console.log(`✅ Found element ${fieldId}, setting error message: "${errors[field]}"`);
                
                // Use validation tooltip system instead of DOM elements
                element.setAttribute('data-error-message', errors[field]);
                element.classList.add('validation-error');
                
                console.log(`📝 Element ${fieldId} classes:`, element.classList.toString());
                console.log(`📝 Element ${fieldId} data-error-message:`, element.getAttribute('data-error-message'));
                
                // Trigger validation state to show tooltip
                element.reportValidity();
            } else {
                console.log(`❌ Element ${fieldId} not found!`);
            }
        });

        // Focus first error field
        const firstErrorField = document.querySelector('#new-project-form [data-error-message]');
        console.log('🎯 First error field:', firstErrorField);
        if (firstErrorField) {
            firstErrorField.focus();
            console.log('🎯 Focused first error field');
        }
    }

    /**
     * Clear form validation errors
     */
    clearNewProjectFormErrors() {
        // Remove validation error classes and attributes
        document.querySelectorAll('#new-project-form .validation-error').forEach(el => {
            el.classList.remove('validation-error');
            el.removeAttribute('data-error-message');
        });

        // Also clean up any legacy error elements (for compatibility)
        document.querySelectorAll('#new-project-form .error').forEach(el => {
            el.classList.remove('error');
        });
        document.querySelectorAll('#new-project-form .error-message').forEach(el => {
            el.remove();
        });
    }

    /**
     * Show load project modal
     */
    showLoadProjectModal() {
        this.selectedFile = null;
        this.updateLoadModalUI();
        this.populateModalRecentProjects();

        const modal = document.getElementById('project-load-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Close load project modal
     */
    closeLoadModal() {
        const modal = document.getElementById('project-load-modal');
        if (modal) {
            modal.classList.remove('active');
        }

        this.selectedFile = null;
        this.updateLoadModalUI();
    }

    /**
     * Handle file selection
     */
    async handleFileSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Validate file type
            if (!file.name.toLowerCase().endsWith('.json')) {
                throw new Error('Please select a JSON file');
            }

            // Read file content
            const content = await this.readFileContent(file);
            const projectData = JSON.parse(content);

            // Validate project data
            this.validateProjectFile(projectData);

            this.selectedFile = {
                file: file,
                data: projectData,
                name: file.name,
                size: file.size
            };

            this.updateLoadModalUI();

        } catch (error) {
            console.error('File selection failed:', error);
            NotificationManager.error(`Invalid project file: ${error.message}`);

            // Reset file input
            event.target.value = '';
            this.selectedFile = null;
            this.updateLoadModalUI();
        }
    }

    /**
     * Read file content
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target.result);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Validate project file
     */
    validateProjectFile(projectData) {
        if (!projectData || typeof projectData !== 'object') {
            throw new Error('Invalid project file format');
        }

        if (!projectData.project) {
            throw new Error('Missing project metadata');
        }

        if (!projectData.project.name) {
            throw new Error('Missing project name');
        }

        if (!projectData.features || !Array.isArray(projectData.features)) {
            throw new Error('Invalid features data');
        }

        if (!projectData.phases || typeof projectData.phases !== 'object') {
            throw new Error('Invalid phases data');
        }

        if (!projectData.config || typeof projectData.config !== 'object') {
            throw new Error('Invalid configuration data');
        }
    }

    /**
     * Load selected project
     */
    async loadSelectedProject() {
        try {
            if (!this.selectedFile) {
                throw new Error('No project file selected');
            }

            // Check if current project needs saving
            if (this.app.isDirty) {
                const save = await this.confirmSave();
                if (save === null) return; // User cancelled
                if (save) await this.app.saveProject();
            }

            // Load the project
            await this.loadProjectData(this.selectedFile.data, 'loaded-from-file');

            // Add to recent projects
            this.addToRecentProjects(this.selectedFile.data.project, 'loaded-from-file');

            // Close modal
            this.closeLoadModal();

            // Navigation to features happens inside loadProjectData after setup
            NotificationManager.success(`Project "${this.selectedFile.data.project.name}" loaded successfully`);

        } catch (error) {
            console.error('Failed to load project:', error);
            NotificationManager.error(`Failed to load project: ${error.message}`);
        }
    }

    /**
     * FIXED: Load project data into application
     */
    async loadProjectData(projectData, filePath = null) {
        return await withLoading(
            LoadingOperations.PROJECT_LOAD,
            async () => {
                // Check if store is available before accessing
                if (!this.store || !this.store.getState) {
                    console.warn('Store not available for ProjectManager.loadProjectData, using fallback behavior');
                    // Fallback to direct app controller call
                    if (this.app && this.app.loadProject) {
                        this.app.loadProject(projectData);
                    }
                } else {
                    // Use global state instead of direct property manipulation
                    this.store.getState().setProject(projectData);
                }

                // Mark as loaded project (not just created)
                if (filePath) {
                    this.app.dataManager.currentProjectPath = filePath;
                }

                // Update title bar with version info
                if (this.app.versionManager) {
                    this.app.versionManager.updateTitleBar();
                }

                // Synchronize phases with loaded project features
                if (this.app.projectPhasesManager) {
                    this.app.projectPhasesManager.synchronizeWithProject();
                }

                // Ensure phases are properly initialized - create phasesManager reference for calculations
                this.app.phasesManager = this.app.projectPhasesManager;

                // Initialize calculations data so it's available for version comparisons
                if (this.app.calculationsManager) {
                    this.app.calculationsManager.calculateVendorCosts();
                }

                this.app.navigationManager.onProjectLoaded();

                // FIXED: Update dropdowns through refreshDropdowns instead of populateDropdowns
                this.app.refreshDropdowns();

                // Update all UI components - handled by store subscription
                // this.app.updateUI();
                // this.updateCurrentProjectUI();

                // Refresh all sections
                if (this.app.featureManager) {
                    this.app.featureManager.refreshTable();
                }
                
                // FIXED: Navigate to features INSIDE loadProjectData after all setup is complete
                // This ensures hasProject is correctly updated before navigation check
                console.log('🧭 Navigating to features after project load complete');
                this.app.navigationManager.navigateTo('features');
                
                return projectData;
            },
            {
                showModal: true,
                message: 'Loading project...',
                modalOptions: { closable: false }
            }
        );
    }

    /**
     * Save current project
     */
    async saveCurrentProject() {
        return await withLoading(
            LoadingOperations.PROJECT_SAVE,
            async () => {
                const currentProject = this.store.getState().currentProject;
                if (!currentProject) {
                    throw new Error('No project to save');
                }

                const result = await this.app.dataManager.saveProject(currentProject);

                if (result.success) {
                    // Mark as clean using global state
                    this.store.getState().markClean();

                    // Update current project path if it's a new save
                    this.app.dataManager.currentProjectPath = result.filePath;

                    // Add to recent projects
                    this.addToRecentProjects(currentProject.project, result.filePath);

                    // UI updates handled by store subscription
                    // this.updateCurrentProjectUI();

                    // AUTO-REFRESH: Refresh saved projects list every time we save
                    await this.loadSavedProjects();
                    this.renderSavedProjects();

                    NotificationManager.success(`Project saved: ${result.fileName || 'Success'}`);
                    return result;
                }
            },
            {
                showModal: true,
                message: 'Saving project...',
                modalOptions: { closable: false }
            }
        );
    }

    /**
     * Close current project
     */
    async closeCurrentProject() {
        try {
            const currentState = this.store.getState();
            
            // Check if project needs saving
            if (currentState.isDirty) {
                const save = await this.confirmSave();
                if (save === null) return; // User cancelled
                if (save) await this.app.saveProject();
            }

            // Reset to empty project using global state
            const newProject = await this.app.createNewProject();
            this.store.getState().setProject(newProject);

            // Notify navigation manager that project was closed
            this.app.navigationManager.onProjectClosed();

            this.app.refreshDropdowns();
            
            // UI updates handled by store subscription
            // this.app.updateUI();
            // this.updateCurrentProjectUI();

            NotificationManager.info('Project closed');

        } catch (error) {
            console.error('Close project failed:', error);
            NotificationManager.error('Failed to close project');
        }
    }

    /**
     * Add project to recent projects
     */
    addToRecentProjects(projectInfo, filePath = null) {
        const recentItem = {
            id: projectInfo.id,
            name: projectInfo.name,
            code: projectInfo.code, // Include code for duplicate checking
            version: projectInfo.version,
            lastOpened: new Date().toISOString(),
            created: projectInfo.created,
            modified: projectInfo.lastModified,
            filePath: filePath // Store file path for file-based projects
        };

        // Remove if already exists (by ID or file path)
        this.recentProjects = this.recentProjects.filter(p =>
            p.id !== projectInfo.id && p.filePath !== filePath
        );

        // Add to beginning
        this.recentProjects.unshift(recentItem);

        // Keep only max items
        if (this.recentProjects.length > this.maxRecentProjects) {
            this.recentProjects = this.recentProjects.slice(0, this.maxRecentProjects);
        }

        // Save to storage
        this.saveRecentProjects();

        // Update UI
        this.updateRecentProjectsUI();

        console.log('Added to recent projects:', recentItem.name, 'FilePath:', filePath);
    }

    /**
     * Update recent project if it exists with current project data
     */
    updateRecentProjectVersion() {
        if (!this.app.currentProject?.project) return;
        
        const currentProject = this.app.currentProject.project;
        const currentFilePath = this.app.dataManager.currentProjectPath;
        
        // Find existing recent project by ID or file path
        const existingIndex = this.recentProjects.findIndex(p => 
            p.id === currentProject.id || (currentFilePath && p.filePath === currentFilePath)
        );
        
        if (existingIndex !== -1) {
            // Update the existing recent project with current data
            this.recentProjects[existingIndex] = {
                ...this.recentProjects[existingIndex],
                version: currentProject.version, // Update version
                name: currentProject.name,
                modified: currentProject.lastModified,
                lastOpened: new Date().toISOString()
            };
            
            // Save to storage
            this.saveRecentProjects();
            
            // Update UI
            this.updateRecentProjectsUI();
            
            console.log('Updated recent project version:', currentProject.name, 'to version', currentProject.version);
        }
    }

    /**
     * Load recent projects from storage
     */
    loadRecentProjects() {
        try {
            const data = localStorage.getItem('recent-projects');
            this.recentProjects = data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load recent projects:', error);
            this.recentProjects = [];
        }
    }

    /**
     * Save recent projects to storage
     */
    saveRecentProjects() {
        try {
            localStorage.setItem('recent-projects', JSON.stringify(this.recentProjects));
        } catch (error) {
            console.error('Failed to save recent projects:', error);
        }
    }

    /**
     * Load saved projects (from file system) - WITH LOADING INDICATOR
     */
    async loadSavedProjects() {
        return await withLoading(
            'projects-list-load',
            async () => {
                try {
                    const projects = await this.app.dataManager.listProjects();
                    this.savedProjects = projects.map(project => ({
                        filePath: project.filePath,
                        fileName: project.fileName,
                        project: project.project,
                        fileSize: project.fileSize,
                        lastModified: project.lastModified
                    }));

                    console.log(`Loaded ${this.savedProjects.length} saved projects`);
                    return this.savedProjects;
                } catch (error) {
                    console.error('Failed to load saved projects:', error);
                    this.savedProjects = [];
                    throw error;
                }
            },
            {
                showModal: false, // Use GlobalLoadingIndicator instead of modal
                message: 'Loading projects...'
            }
        );
    }

    /**
     * Clear recent projects
     */
    clearRecentProjects() {
        this.recentProjects = [];
        this.saveRecentProjects();
        this.updateRecentProjectsUI();
        NotificationManager.info('Recent projects cleared');
    }

    /**
     * Refresh projects lists - WITH LOADING INDICATOR
     */
    async refreshProjects() {
        return await withLoading(
            'projects-refresh',
            async () => {
                try {
                    this.loadRecentProjects();
                    await this.loadSavedProjects();

                    // AUTO-UPDATE: Update both UIs
                    this.updateRecentProjectsUI();
                    this.renderSavedProjects();

                    NotificationManager.info(`Found ${this.savedProjects.length} saved projects`);
                } catch (error) {
                    console.error('Failed to refresh projects:', error);
                    NotificationManager.error('Failed to refresh projects list');
                    throw error;
                }
            },
            {
                showModal: false, // Use GlobalLoadingIndicator
                message: 'Refreshing projects...'
            }
        );
    }

    /**
     * Render saved projects after loading
     */
    renderSavedProjects() {
        const container = document.getElementById('saved-projects-list');
        if (!container) return;

        if (this.savedProjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-save"></i>
                    <p>No saved projects found</p>
                    <small>Save some projects first or check your projects folder configuration</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.savedProjects.map(item => `
            <div class="project-item" data-file-path="${item.filePath}">
                <div class="project-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="project-info">
                    <h4 class="project-name">${Helpers.escapeHtml(item.project.name)}</h4>
                    <div class="project-meta-row">
                        <span class="project-version">v${item.project.version}</span>
                        <span class="project-date"><i class="fas fa-edit"></i> ${Helpers.formatDate(item.project.lastModified)}</span>
                        <span class="project-size">${Helpers.formatBytes(item.fileSize)}</span>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-icon btn-primary load-saved-project" data-file-path="${item.filePath}" title="Load Project">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button class="btn btn-icon btn-secondary export-saved-project" data-file-path="${item.filePath}" title="Export Project">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-icon btn-danger delete-saved-project" data-file-path="${item.filePath}" title="Delete Project">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.load-saved-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filePath = e.target.closest('[data-file-path]').dataset.filePath;
                this.loadSavedProject(filePath);
            });
        });

        container.querySelectorAll('.export-saved-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filePath = e.target.closest('[data-file-path]').dataset.filePath;
                this.exportSavedProject(filePath);
            });
        });

        container.querySelectorAll('.delete-saved-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filePath = e.target.closest('[data-file-path]').dataset.filePath;
                this.deleteSavedProject(filePath);
            });
        });
    }

    /**
     * Update all UI components
     */
    updateUI() {
        this.updateCurrentProjectUI();
        this.updateRecentProjectsUI();
        this.updateSavedProjectsUI();
    }

    /**
     * Update current project UI
     */
    updateCurrentProjectUI() {
        const project = this.app.currentProject?.project;
        // Only really loaded projects, not the default "New Project"
        const hasLoadedProject = project && project.name !== 'New Project' && this.app.dataManager.currentProjectPath;

        // Update project info
        const nameEl = document.getElementById('current-project-name');
        if (nameEl) {
            nameEl.textContent = hasLoadedProject ? project.name : 'No Project Loaded';
        }

        const createdEl = document.getElementById('current-project-created');
        if (createdEl) {
            createdEl.textContent = hasLoadedProject ? Helpers.formatDate(project.created) : '-';
        }

        const modifiedEl = document.getElementById('current-project-modified');
        if (modifiedEl) {
            modifiedEl.textContent = hasLoadedProject ? Helpers.formatDate(project.lastModified) : '-';
        }

        const versionEl = document.getElementById('current-project-version');
        if (versionEl) {
            versionEl.textContent = hasLoadedProject ? project.version : '-';
        }

        // Update action buttons
        const saveBtn = document.getElementById('save-current-project-btn');
        const closeBtn = document.getElementById('close-current-project-btn');

        if (saveBtn) {
            saveBtn.disabled = !hasLoadedProject || !this.app.isDirty;
        }

        if (closeBtn) {
            closeBtn.disabled = !hasLoadedProject;
        }

        // Update project status in title bar only if we have a loaded project
        if (hasLoadedProject) {
            this.app.updateProjectInfo();
            this.app.updateProjectStatus();
            
            // Update recent projects version to keep it synchronized
            this.updateRecentProjectVersion();
        }
    }

    /**
     * Update recent projects UI
     */
    updateRecentProjectsUI() {
        const container = document.getElementById('recent-projects-list');
        if (!container) return;

        if (this.recentProjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No recent projects</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.recentProjects.slice(0, 2).map(project => `
            <div class="project-item" data-project-id="${project.id}">
                <div class="project-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="project-info">
                    <h4 class="project-name">${Helpers.escapeHtml(project.name)}</h4>
                    <div class="project-meta-row">
                        <span class="project-version">v${project.version}</span>
                        <span class="project-date"><i class="fas fa-eye"></i> ${Helpers.formatDate(project.lastOpened)}</span>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-icon btn-primary load-recent-project" data-project-id="${project.id}" title="Load Project">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button class="btn btn-icon btn-danger remove-recent-project" data-project-id="${project.id}" title="Remove from Recent">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.load-recent-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.closest('[data-project-id]').dataset.projectId;
                this.loadRecentProject(projectId);
            });
        });

        container.querySelectorAll('.remove-recent-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.closest('[data-project-id]').dataset.projectId;
                this.removeRecentProject(projectId);
            });
        });
    }

    /**
     * Update saved projects UI
     */
    updateSavedProjectsUI() {
        const container = document.getElementById('saved-projects-list');
        if (!container) return;

        // AUTO-LOAD: Load saved projects automatically if there are none
        if (this.savedProjects.length === 0) {
            this.loadSavedProjects().then(() => {
                if (this.savedProjects.length > 0) {
                    this.renderSavedProjects();
                } else {
                    this.showEmptySavedProjectsState();
                }
            });
        } else {
            this.renderSavedProjects();
        }
    }

    /**
     * Show empty state for saved projects
     */
    showEmptySavedProjectsState() {
        const container = document.getElementById('saved-projects-list');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No saved projects found</p>
                <small>Create a new project to get started - it will be automatically saved</small>
            </div>
        `;
    }

    /**
     * Update load modal UI
     */
    updateLoadModalUI() {
        const fileInfo = document.getElementById('selected-file-info');
        const fileName = document.getElementById('selected-file-name');
        const fileSize = document.getElementById('selected-file-size');
        const loadBtn = document.getElementById('load-selected-project-btn');

        if (this.selectedFile) {
            if (fileInfo) fileInfo.style.display = 'flex';
            if (fileName) fileName.textContent = this.selectedFile.name;
            if (fileSize) fileSize.textContent = Helpers.formatBytes(this.selectedFile.size);
            if (loadBtn) loadBtn.disabled = false;
        } else {
            if (fileInfo) fileInfo.style.display = 'none';
            if (loadBtn) loadBtn.disabled = true;
        }
    }

    /**
     * Populate recent projects in modal
     */
    populateModalRecentProjects() {
        const container = document.getElementById('modal-recent-projects');
        if (!container) return;

        if (this.recentProjects.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent projects</p>';
            return;
        }

        container.innerHTML = this.recentProjects.slice(0, 5).map(project => `
            <div class="recent-project-item" data-project-id="${project.id}">
                <div class="project-info">
                    <span class="project-name">${Helpers.escapeHtml(project.name)}</span>
                    <span class="project-date">${Helpers.formatDate(project.lastOpened)}</span>
                </div>
                <button class="btn btn-small btn-primary load-recent-modal" data-project-id="${project.id}">
                    Load
                </button>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.load-recent-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.dataset.projectId;
                this.loadRecentProject(projectId);
                this.closeLoadModal();
            });
        });
    }

    /**
     * FIXED: Load recent project
     */
    async loadRecentProject(projectId) {
        try {
            const recentProject = this.recentProjects.find(p => p.id === projectId);
            if (!recentProject) {
                throw new Error('Recent project not found');
            }

            // Check if current project needs saving
            if (this.app.isDirty) {
                const save = await this.confirmSave();
                if (save === null) return;
                if (save) await this.saveCurrentProject();
            }

            let projectData;

            if (recentProject.filePath && recentProject.filePath !== 'localStorage') {
                // Load from file system
                projectData = await this.app.dataManager.loadProject(recentProject.filePath);
            } else {
                // Legacy: try to find in saved projects or localStorage
                const savedProject = this.savedProjects.find(p => p.project.id === projectId);
                if (savedProject) {
                    projectData = await this.app.dataManager.loadProject(savedProject.filePath);
                } else {
                    // Try localStorage
                    const localKey = `software-estimation-project-${projectId}`;
                    const localData = localStorage.getItem(localKey);
                    if (localData) {
                        projectData = JSON.parse(localData);
                    } else {
                        throw new Error('Project data not found. It may have been deleted.');
                    }
                }
            }

            await this.loadProjectData(projectData);
            this.addToRecentProjects(projectData.project, recentProject.filePath);
            
            // Navigation to features happens inside loadProjectData after setup
            NotificationManager.success(`Project "${projectData.project.name}" loaded`);

        } catch (error) {
            console.error('Failed to load recent project:', error);
            NotificationManager.error(`Failed to load project: ${error.message}`);

            // Remove from recent projects if file not found
            if (error.message.includes('not found') || error.message.includes('deleted')) {
                this.removeRecentProject(projectId);
            }
        }
    }

    /**
     * Remove recent project
     */
    removeRecentProject(projectId) {
        this.recentProjects = this.recentProjects.filter(p => p.id !== projectId);
        this.saveRecentProjects();
        this.updateRecentProjectsUI();
        this.populateModalRecentProjects();
    }

    /**
     * FIXED: Load saved project
     */
    async loadSavedProject(filePath) {
        try {
            // Check if current project needs saving
            if (this.app.isDirty) {
                const save = await this.confirmSave();
                if (save === null) return;
                if (save) await this.saveCurrentProject();
            }

            const projectData = await this.app.dataManager.loadProject(filePath);
            await this.loadProjectData(projectData);

            // Add to recent projects
            this.addToRecentProjects(projectData.project, filePath);
            
            // Navigation to features happens inside loadProjectData after setup
            NotificationManager.success(`Project "${projectData.project.name}" loaded`);

        } catch (error) {
            console.error('Failed to load saved project:', error);
            NotificationManager.error(`Failed to load project: ${error.message}`);
        }
    }

    /**
     * Export saved project
     */
    async exportSavedProject(filePath) {
        try {
            const projectData = await this.app.dataManager.loadProject(filePath);
            const filename = `${projectData.project.name}_export_${new Date().toISOString().split('T')[0]}.json`;

            // Create download
            const dataStr = JSON.stringify(projectData, null, 2);
            Helpers.downloadAsFile(dataStr, filename, 'application/json');

            NotificationManager.success(`Project "${projectData.project.name}" exported`);

        } catch (error) {
            console.error('Failed to export project:', error);
            NotificationManager.error(`Failed to export project: ${error.message}`);
        }
    }

    /**
     * Delete saved project
     */
    async deleteSavedProject(filePath) {
        try {
            const project = this.savedProjects.find(p => p.filePath === filePath);
            if (!project) {
                throw new Error('Project not found');
            }

            const confirmed = confirm(`Are you sure you want to delete "${project.project.name}"? This action cannot be undone.`);
            if (!confirmed) return;

            await this.app.dataManager.deleteProject(filePath);

            // Remove from recent projects if exists
            this.recentProjects = this.recentProjects.filter(p => p.filePath !== filePath);
            this.saveRecentProjects();

            // AUTO-REFRESH: Refresh lists immediately after deletion
            await this.loadSavedProjects();
            this.updateRecentProjectsUI();
            this.renderSavedProjects();

            NotificationManager.success(`Project "${project.project.name}" deleted`);

        } catch (error) {
            console.error('Failed to delete project:', error);
            NotificationManager.error(`Failed to delete project: ${error.message}`);
        }
    }

    /**
     * Confirm save dialog
     */
    confirmSave() {
        return new Promise((resolve) => {
            const result = confirm('You have unsaved changes. Do you want to save before continuing?');
            resolve(result);
        });
    }

    /**
     * Clean up all previous project data to prevent contamination
     */
    async cleanupPreviousProjectData() {
        console.log('🧹 Cleaning up previous project data...');
        
        try {
            // Clear current project reference
            this.app.currentProject = null;
            this.app.isDirty = false;
            
            // Clear data manager paths
            if (this.app.dataManager) {
                this.app.dataManager.currentProjectPath = null;
            }
            
            // Clear feature manager state and UI
            if (this.app.featureManager || this.app.managers?.feature) {
                const featureManager = this.app.featureManager || this.app.managers.feature;
                if (featureManager.state) {
                    featureManager.state.editingFeature = null;
                    featureManager.state.filteredFeatures = [];
                    featureManager.state.isCalculating = false;
                }
                // Clear features table
                if (featureManager.refreshTable) {
                    featureManager.refreshTable();
                }
            }
            
            // Clear project phases manager - AGGRESSIVE CLEANUP
            if (this.app.projectPhasesManager || this.app.managers?.projectPhases) {
                const phasesManager = this.app.projectPhasesManager || this.app.managers.projectPhases;
                
                // Force clear all phase data to factory defaults
                if (phasesManager.resetAllPhaseData) {
                    phasesManager.resetAllPhaseData();
                }
                
                // Force clear any cached or computed values
                if (phasesManager.phases) {
                    // Reset to completely clean state
                    Object.keys(phasesManager.phases).forEach(phaseKey => {
                        if (phasesManager.phases[phaseKey]) {
                            phasesManager.phases[phaseKey].manDays = 0;
                            phasesManager.phases[phaseKey].lastModified = new Date().toISOString();
                            if (phasesManager.phases[phaseKey].cost !== undefined) {
                                phasesManager.phases[phaseKey].cost = 0;
                            }
                            if (phasesManager.phases[phaseKey].assignedResources) {
                                phasesManager.phases[phaseKey].assignedResources = [];
                            }
                        }
                    });
                    
                    // Clear selected suppliers
                    if (phasesManager.phases.selectedSuppliers) {
                        phasesManager.phases.selectedSuppliers = { G1: null, G2: null, TA: null, PM: null };
                    }
                }
                
                console.log('🧹 Phases data aggressively cleaned');
            }
            
            // Clear calculations manager
            if (this.app.calculationsManager || this.app.managers?.calculations) {
                const calcManager = this.app.calculationsManager || this.app.managers.calculations;
                if (calcManager.clearCalculations) {
                    calcManager.clearCalculations();
                }
            }
            
            // Clear version manager state
            if (this.app.versionManager) {
                // Don't clear versions completely, but reset current state
                if (this.app.versionManager.clearCurrentState) {
                    this.app.versionManager.clearCurrentState();
                }
            }
            
            // Clear configuration cache
            if (this.app.configManager && this.app.configManager.clearCache) {
                this.app.configManager.clearCache();
            }
            
            // Clear UI elements
            this.clearProjectUI();
            
            // Update navigation state
            if (this.app.navigationManager) {
                this.app.navigationManager.onProjectClosed();
            }
            
            console.log('✅ Previous project data cleaned successfully');
        } catch (error) {
            console.warn('⚠️ Some cleanup operations failed:', error);
        }
    }
    
    /**
     * Clear project-related UI elements
     */
    clearProjectUI() {
        // Clear features table
        const featuresTable = document.querySelector('#features-table-body');
        if (featuresTable) {
            featuresTable.innerHTML = '';
        }
        
        // Clear project info displays
        const projectName = document.getElementById('current-project-name');
        if (projectName) {
            projectName.textContent = '';
        }
        
        const projectDescription = document.getElementById('current-project-description');
        if (projectDescription) {
            projectDescription.textContent = '';
        }
        
        // Clear summary displays
        const summaryElements = document.querySelectorAll('.project-summary-value');
        summaryElements.forEach(el => el.textContent = '0');
        
        // Clear version history table
        const versionTable = document.querySelector('#version-history-body');
        if (versionTable) {
            versionTable.innerHTML = '';
        }
        
        console.log('UI elements cleared');
    }

    /**
     * Get project statistics
     */
    getProjectStats() {
        return {
            recentCount: this.recentProjects.length,
            savedCount: this.savedProjects.length,
            currentProject: this.app.currentProject?.project?.name || 'None',
            isDirty: this.app.isDirty
        };
    }
}

// Make ProjectManager available globally
if (typeof window !== 'undefined') {
    window.ProjectManager = ProjectManager;
}