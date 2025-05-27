/**
 * Project Manager - Handles project loading, saving, and management
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
        this.loadSavedProjects();
        this.setupEventListeners();

        // Delay initial UI update to ensure DOM is ready
        setTimeout(() => {
            this.updateUI();
        }, 100);
    }

    setupEventListeners() {
        // Main project actions
        document.getElementById('new-project-btn')?.addEventListener('click', () => {
            this.createNewProject();
        });

        document.getElementById('load-project-btn')?.addEventListener('click', () => {
            this.showLoadProjectModal();
        });

        document.getElementById('import-project-btn')?.addEventListener('click', () => {
            this.importProject();
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

        // Modal actions
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
     * Create a new project
     */
    async createNewProject() {
        try {
            // Check if current project needs saving
            if (this.app.isDirty) {
                const save = await this.confirmSave();
                if (save === null) return; // User cancelled
                if (save) await this.app.saveProject();
            }

            // Create new project
            await this.app.newProject();

            // Update UI
            this.updateCurrentProjectUI();

            // Navigate to features section
            this.app.navigationManager.navigateTo('features');

            NotificationManager.success('New project created successfully');
        } catch (error) {
            console.error('Failed to create new project:', error);
            NotificationManager.error(`Failed to create new project: ${error.message}`);
        }
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
            await this.loadProjectData(this.selectedFile.data);

            // Add to recent projects
            this.addToRecentProjects(this.selectedFile.data.project);

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
     * Load project data into application
     */
    async loadProjectData(projectData) {
        // Set project data
        this.app.currentProject = projectData;
        this.app.isDirty = false;

        // Update dropdowns
        await this.app.populateDropdowns();

        // Update all UI components
        this.app.updateUI();
        this.updateCurrentProjectUI();

        // Refresh all sections
        if (this.app.featureManager) {
            this.app.featureManager.refreshTable();
        }
    }

    /**
     * Import project (same as load but from menu)
     */
    async importProject() {
        try {
            // Use file picker
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.style.display = 'none';

            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const content = await this.readFileContent(file);
                        const projectData = JSON.parse(content);
                        this.validateProjectFile(projectData);

                        // Check if current project needs saving
                        if (this.app.isDirty) {
                            const save = await this.confirmSave();
                            if (save === null) return;
                            if (save) await this.app.saveProject();
                        }

                        await this.loadProjectData(projectData);
                        this.addToRecentProjects(projectData.project);
                        this.app.navigationManager.navigateTo('features');

                        NotificationManager.success(`Project "${projectData.project.name}" imported successfully`);
                    } catch (error) {
                        NotificationManager.error(`Import failed: ${error.message}`);
                    }
                }
            });

            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);

        } catch (error) {
            console.error('Import project failed:', error);
            NotificationManager.error('Failed to import project');
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
                this.updateCurrentProjectUI();

                // Refresh saved projects list
                await this.loadSavedProjects();
                this.updateSavedProjectsUI();

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

            // Update UI
            await this.app.populateDropdowns();
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
            version: projectInfo.version,
            lastOpened: new Date().toISOString(),
            created: projectInfo.created,
            modified: projectInfo.lastModified,
            filePath: filePath // Store file path for file-based projects
        };

        // Remove if already exists
        this.recentProjects = this.recentProjects.filter(p => p.id !== projectInfo.id);

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
            this.updateUI();
            NotificationManager.info('Projects list refreshed');
        } catch (error) {
            console.error('Failed to refresh projects:', error);
            NotificationManager.error('Failed to refresh projects list');
        }
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
        const hasProject = project && project.name !== 'New Project';

        // Update project info
        const nameEl = document.getElementById('current-project-name');
        if (nameEl) {
            nameEl.textContent = project?.name || 'No Project Loaded';
        }

        const createdEl = document.getElementById('current-project-created');
        if (createdEl) {
            createdEl.textContent = project?.created ? Helpers.formatDate(project.created) : '-';
        }

        const modifiedEl = document.getElementById('current-project-modified');
        if (modifiedEl) {
            modifiedEl.textContent = project?.lastModified ? Helpers.formatDate(project.lastModified) : '-';
        }

        const versionEl = document.getElementById('current-project-version');
        if (versionEl) {
            versionEl.textContent = project?.version || '-';
        }

        // Update action buttons
        const saveBtn = document.getElementById('save-current-project-btn');
        const closeBtn = document.getElementById('close-current-project-btn');

        if (saveBtn) {
            saveBtn.disabled = !hasProject || !this.app.isDirty;
        }

        if (closeBtn) {
            closeBtn.disabled = !hasProject;
        }

        // Update project status in title bar
        this.app.updateProjectInfo();
        this.app.updateProjectStatus();
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

        container.innerHTML = this.recentProjects.map(project => `
            <div class="project-item" data-project-id="${project.id}">
                <div class="project-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="project-info">
                    <h4>${Helpers.escapeHtml(project.name)}</h4>
                    <div class="project-meta">
                        <span><i class="fas fa-calendar"></i> ${Helpers.formatDate(project.created)}</span>
                        <span><i class="fas fa-edit"></i> ${Helpers.formatDate(project.modified)}</span>
                        <span><i class="fas fa-eye"></i> ${Helpers.formatDate(project.lastOpened)}</span>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-small btn-primary load-recent-project" data-project-id="${project.id}">
                        <i class="fas fa-folder-open"></i> Load
                    </button>
                    <button class="btn btn-small btn-danger remove-recent-project" data-project-id="${project.id}">
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

        if (this.savedProjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-save"></i>
                    <p>No saved projects</p>
                    <small>Projects are saved in your configured projects folder</small>
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
                    <h4>${Helpers.escapeHtml(item.project.name)}</h4>
                    <div class="project-meta">
                        <span><i class="fas fa-calendar"></i> Created: ${Helpers.formatDate(item.project.created)}</span>
                        <span><i class="fas fa-edit"></i> Modified: ${Helpers.formatDate(item.project.lastModified)}</span>
                        <span><i class="fas fa-code-branch"></i> v${item.project.version}</span>
                        <span><i class="fas fa-hdd"></i> ${Helpers.formatBytes(item.fileSize)}</span>
                    </div>
                    <div class="project-path">
                        <small><i class="fas fa-folder"></i> ${item.fileName}</small>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-small btn-primary load-saved-project" data-file-path="${item.filePath}">
                        <i class="fas fa-folder-open"></i> Load
                    </button>
                    <button class="btn btn-small btn-secondary export-saved-project" data-file-path="${item.filePath}">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button class="btn btn-small btn-danger delete-saved-project" data-file-path="${item.filePath}">
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
     * Load recent project
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
     * Load saved project
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

            // Refresh lists
            await this.loadSavedProjects();
            this.updateUI();

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