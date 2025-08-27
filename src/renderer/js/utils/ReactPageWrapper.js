/**
 * ReactPageWrapper.js - Generic React page wrapper
 * 
 * PATTERN: State/Actions/Dispatcher (dal file /agents/auto-workflow.js)
 * - Gestisce state (initialized, reactRoot, container)
 * - Delega business logic alle Actions
 * - SOLO presentazione e bridge tra vanilla navigation e React
 */

class ReactPageWrapper {
    constructor(pageType, app = null) {
        // Pattern State/Actions/Dispatcher: State management
        this.pageType = pageType;
        this.app = app;
        this.initialized = false;
        this.reactRoot = null;
        this.container = null;
        
        // Pattern State/Actions/Dispatcher: Actions per business logic
        this.actions = new window.ReactPageWrapperActions();
        
        // Pattern State/Actions/Dispatcher: Get page config tramite Actions
        this.config = this.actions.getPageConfig(pageType);
        
        console.log(`${this.config.wrapperName} created using State/Actions/Dispatcher pattern`);
    }

    /**
     * Initialize page - delega alle Actions per business logic
     */
    async init() {
        if (this.initialized) return;

        try {
            // Pattern State/Actions/Dispatcher: Delega business logic alle Actions
            const result = await this.actions.initializePage(this.config);
            
            // Pattern State/Actions/Dispatcher: Update local state from Actions result
            this.container = result.container;
            this.reactRoot = result.reactRoot;
            this.initialized = result.initialized;
            
        } catch (error) {
            console.error(`Failed to initialize ${this.config.wrapperName}:`, error);
            throw error;
        }
    }

    /**
     * Handle navigation - delega alle Actions
     */
    onNavigate() {
        // Pattern State/Actions/Dispatcher: Actions gestiscono navigation logic
        this.actions.handleNavigation(this);
    }

    /**
     * Cleanup - delega alle Actions per business logic
     */
    destroy() {
        // Pattern State/Actions/Dispatcher: Actions gestiscono cleanup logic
        const newState = this.actions.destroyPage({
            reactRoot: this.reactRoot,
            container: this.container
        });
        
        // Pattern State/Actions/Dispatcher: Update local state
        this.reactRoot = newState.reactRoot;
        this.container = newState.container;
        this.initialized = newState.initialized;
        
        console.log(`${this.config.wrapperName} destroyed`);
    }

    /**
     * Legacy compatibility methods per ProjectManager wrapper
     */
    
    // Project-related methods (only for projects page type)
    async createNewProject(formData) {
        if (this.pageType !== 'projects' || !this.app?.projectManager) return;
        return await this.app.projectManager.createNewProject(formData);
    }

    async saveCurrentProject() {
        if (this.pageType !== 'projects' || !this.app?.projectManager) return;
        return await this.app.projectManager.saveCurrentProject();
    }

    async closeCurrentProject() {
        if (this.pageType !== 'projects' || !this.app?.projectManager) return;
        return await this.app.projectManager.closeCurrentProject();
    }

    async loadSavedProject(filePath) {
        if (this.pageType !== 'projects' || !this.app?.projectManager) return;
        return await this.app.projectManager.loadSavedProject(filePath);
    }

    async loadRecentProject(projectId) {
        if (this.pageType !== 'projects' || !this.app?.projectManager) return;
        return await this.app.projectManager.loadRecentProject(projectId);
    }

    async exportSavedProject(filePath) {
        if (this.pageType !== 'projects' || !this.app?.projectManager) return;
        return await this.app.projectManager.exportSavedProject(filePath);
    }

    async deleteSavedProject(filePath) {
        if (this.pageType !== 'projects' || !this.app?.projectManager) return;
        return await this.app.projectManager.deleteSavedProject(filePath);
    }

    removeRecentProject(projectId) {
        if (this.pageType !== 'projects' || !this.app?.projectManager) return;
        return this.app.projectManager.removeRecentProject(projectId);
    }

    clearRecentProjects() {
        if (this.pageType !== 'projects' || !this.app?.projectManager) return;
        return this.app.projectManager.clearRecentProjects();
    }

    // Modal methods (handled by React components)
    showNewProjectModal() {
        console.log(`${this.config.wrapperName}: showNewProjectModal called (handled by React components)`);
    }

    closeNewProjectModal() {
        console.log(`${this.config.wrapperName}: closeNewProjectModal called (handled by React components)`);
    }

    showLoadProjectModal() {
        console.log(`${this.config.wrapperName}: showLoadProjectModal called (handled by React components)`);
    }

    closeLoadModal() {
        console.log(`${this.config.wrapperName}: closeLoadModal called (handled by React components)`);
    }

    // Generic methods for all page types
    handleProjectChange(project) {
        if (!this.initialized) return;
        console.log(`${this.config.wrapperName}: Project changed (handled by React store)`);
    }

    refresh() {
        if (!this.initialized) return;
        console.log(`${this.config.wrapperName}: Refresh requested (handled by React store)`);
    }

    updateUI() {
        if (!this.initialized) return;
        console.log(`${this.config.wrapperName}: UI update requested (handled by React components)`);
    }
}

// Make available globally for script loading
if (typeof window !== 'undefined') {
    window.ReactPageWrapper = ReactPageWrapper;
    
    // Factory function following State/Actions/Dispatcher pattern
    window.createReactPageWrapper = function(pageType, app = null) {
        return new ReactPageWrapper(pageType, app);
    };
}

console.log('✅ ReactPageWrapper loaded (State/Actions/Dispatcher pattern)');