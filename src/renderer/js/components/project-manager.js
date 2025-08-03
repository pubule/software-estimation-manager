/**
 * Project Manager - Handles project loading, saving, and management
 * FIXED: Removed calls to non-existent populateDropdowns method
 */

class ProjectManager {
    constructor(app) {
        this.app = app;
        this.recentProjects = [];
        this.savedProjects = [];
        this.maxRecentProjects = 10;
        this.selectedFile = null;

        this.init();
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

        document.getElementById('close-current-project-btn')?.addEventListener('click', () => {
            this.closeCurrentProject();
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
            // Check if current project needs saving
            if (this.app.isDirty) {
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
                config: this.app.createNewProject().config // Use app's default config
            };

            // Set as current project
            this.app.currentProject = newProject;
            this.app.isDirty = true;

            // Notifica il navigation manager che un progetto è stato caricato
            this.app.navigationManager.onProjectLoaded();

            // AUTO-SAVE: Save new project automatically
            console.log('Auto-saving new project...');
            const saveResult = await this.app.dataManager.saveProject(newProject);

            if (saveResult.success) {
                this.app.isDirty = false;
                this.app.dataManager.currentProjectPath = saveResult.filePath;

                // Aggiorna lo stato dirty del navigation manager
                this.app.navigationManager.onProjectDirty(false);

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

            // Update UI
            this.app.updateUI();
            this.updateCurrentProjectUI();

            // Reset all phase data AFTER UI updates to ensure clean state
            setTimeout(() => {
                if (this.app.projectPhasesManager) {
                    this.app.projectPhasesManager.resetAllPhaseData();
                }
            }, 100);

            // Auto-create initial version AFTER phase reset
            setTimeout(async () => {
                try {
                    if (this.app.versionManager) {
                        await this.app.versionManager.createVersion('Initial project creation');
                    }
                } catch (error) {
                    console.error('Failed to create initial version:', error);
                }
            }, 600);

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
     * Show form validation errors
     */
    showNewProjectFormErrors(errors) {
        // Clear existing errors
        this.clearNewProjectFormErrors();

        // Show new errors
        Object.keys(errors).forEach(field => {
            const fieldId = `project-${field}`;
            const element = document.getElementById(fieldId);

            if (element) {
                element.classList.add('error');

                // Add error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = errors[field];

                element.parentNode.appendChild(errorDiv);
            }
        });

        // Focus first error field
        const firstErrorField = document.querySelector('#new-project-form .error');
        if (firstErrorField) {
            firstErrorField.focus();
        }
    }

    /**
     * Clear form validation errors
     */
    clearNewProjectFormErrors() {
        // Remove error classes
        document.querySelectorAll('#new-project-form .error').forEach(el => {
            el.classList.remove('error');
        });

        // Remove error messages
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

            // Navigate to features
            this.app.navigationManager.navigateTo('features');

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
        // Set project data
        this.app.currentProject = projectData;
        this.app.isDirty = false;

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

        // Update all UI components
        this.app.updateUI();
        this.updateCurrentProjectUI();

        // Refresh all sections
        if (this.app.featureManager) {
            this.app.featureManager.refreshTable();
        }
    }

    /**
     * Save current project
     */
    async saveCurrentProject() {
        try {
            if (!this.app.currentProject) {
                throw new Error('No project to save');
            }

            const result = await this.app.dataManager.saveProject(this.app.currentProject);

            if (result.success) {
                this.app.isDirty = false;

                // Update current project path if it's a new save
                this.app.dataManager.currentProjectPath = result.filePath;

                // Add to recent projects
                this.addToRecentProjects(this.app.currentProject.project, result.filePath);

                this.updateCurrentProjectUI();

                // AUTO-REFRESH: Refresh saved projects list every time we save
                await this.loadSavedProjects();
                this.renderSavedProjects();

                NotificationManager.success(`Project saved: ${result.fileName || 'Success'}`);
            }
        } catch (error) {
            console.error('Save failed:', error);
            NotificationManager.error(`Failed to save project: ${error.message}`);
        }
    }

    /**
     * Close current project
     */
    async closeCurrentProject() {
        try {
            // Check if project needs saving
            if (this.app.isDirty) {
                const save = await this.confirmSave();
                if (save === null) return; // User cancelled
                if (save) await this.app.saveProject();
            }

            // Reset to empty project
            this.app.currentProject = this.app.createNewProject();
            this.app.isDirty = false;

            // Notifica il navigation manager che il progetto è stato chiuso
            this.app.navigationManager.onProjectClosed();

            this.app.refreshDropdowns();
            this.app.updateUI();
            this.updateCurrentProjectUI();

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
     * Load saved projects (from file system)
     */
    async loadSavedProjects() {
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
        } catch (error) {
            console.error('Failed to load saved projects:', error);
            this.savedProjects = [];
        }
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
     * Refresh projects lists
     */
    async refreshProjects() {
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
        }
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
                    <div class="project-header">
                        <h4>${Helpers.escapeHtml(item.project.name)}</h4>
                        <span class="project-version">v${item.project.version}</span>
                    </div>
                    <div class="project-meta">
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
                    <div class="project-header">
                        <h4>${Helpers.escapeHtml(project.name)}</h4>
                        <span class="project-version">v${project.version}</span>
                    </div>
                    <div class="project-meta">
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
            this.app.navigationManager.navigateTo('features');

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
            this.app.navigationManager.navigateTo('features');

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