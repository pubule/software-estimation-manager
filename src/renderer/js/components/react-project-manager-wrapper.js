/**
 * React Project Manager Wrapper
 * Wraps React Project Manager components for integration with vanilla JS application
 */

class ReactProjectManagerWrapper {
    constructor(app) {
        this.app = app;
        this.initialized = false;
        this.reactRoot = null;
        this.container = null;
        
        console.log('ReactProjectManagerWrapper created');
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('Initializing React Project Manager');
            
            // Wait for React to be available
            await this.waitForReact();
            
            // CRITICAL: Clear any vanilla JS generated content in projects-page
            const projectsPage = document.getElementById('projects-page');
            if (projectsPage) {
                // Keep only the react-project-manager-root div and remove all other content
                const reactContainer = document.getElementById('react-project-manager-root');
                
                // Clear all content from projects-page
                projectsPage.innerHTML = '';
                
                // Re-add the react container if it existed, or create it
                if (reactContainer) {
                    projectsPage.appendChild(reactContainer);
                    this.container = reactContainer;
                } else {
                    // Create fresh container
                    const newContainer = document.createElement('div');
                    newContainer.id = 'react-project-manager-root';
                    projectsPage.appendChild(newContainer);
                    this.container = newContainer;
                }
                
                console.log('✅ Cleared vanilla JS content from projects-page, React will now manage all UI');
            } else {
                console.error('Projects page not found');
                return;
            }

            // Mount React app
            this.mountReactApp();
            
            this.initialized = true;
            console.log('React Project Manager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize React Project Manager:', error);
            throw error;
        }
    }

    async waitForReact() {
        return new Promise((resolve) => {
            const checkReact = () => {
                if (window.React && window.ReactDOM && window.appStore) {
                    resolve();
                } else {
                    setTimeout(checkReact, 100);
                }
            };
            checkReact();
        });
    }

    mountReactApp() {
        try {
            // Create React root
            this.reactRoot = window.ReactDOM.createRoot(this.container);
            
            // Create the main React app component
            const App = window.React.createElement(
                this.createProjectManagerApp(),
                null
            );
            
            // Render the app
            this.reactRoot.render(App);
            
            console.log('React Project Manager mounted successfully');
        } catch (error) {
            console.error('Error mounting React Project Manager:', error);
            // Fallback to show error message
            this.container.innerHTML = `
                <div class="react-error" style="padding: 2rem; text-align: center; color: #ff6b6b;">
                    <h3>❌ React Project Manager Error</h3>
                    <p>Failed to load React components</p>
                    <p><small>${error.message}</small></p>
                </div>
            `;
        }
    }

    createProjectManagerApp() {
        // Create a React component that wraps our ProjectManager
        return function ProjectManagerApp() {
            const { useEffect, useState } = window.React;
            const [componentsReady, setComponentsReady] = useState(false);
            const [timeoutReached, setTimeoutReached] = useState(false);
            
            // Wait for React components to be available with timeout
            useEffect(() => {
                let attempts = 0;
                const maxAttempts = 100; // 10 seconds timeout (100 * 100ms)
                
                const checkComponents = () => {
                    attempts++;
                    
                    if (window.ReactComponents && window.ReactComponents.ProjectManager) {
                        console.log('✅ React ProjectManager component found after', attempts, 'attempts');
                        setComponentsReady(true);
                        return;
                    }
                    
                    if (attempts >= maxAttempts) {
                        console.error('❌ Timeout waiting for React ProjectManager component after 10 seconds');
                        console.log('Available ReactComponents:', window.ReactComponents ? Object.keys(window.ReactComponents) : 'undefined');
                        setTimeoutReached(true);
                        return;
                    }
                    
                    console.log(`⏳ Waiting for React components... attempt ${attempts}/${maxAttempts}`);
                    setTimeout(checkComponents, 100);
                };
                
                checkComponents();
            }, []);
            
            if (timeoutReached) {
                return window.React.createElement('div', {
                    style: {
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#ff6b6b',
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '8px',
                        margin: '1rem'
                    }
                }, [
                    window.React.createElement('h3', { key: 'title' }, '❌ Project Manager Loading Error'),
                    window.React.createElement('p', { key: 'message' }, 'Failed to load React components after 10 seconds'),
                    window.React.createElement('p', { 
                        key: 'debug',
                        style: { fontSize: '12px', color: '#666' }
                    }, `Debug: ReactComponents = ${window.ReactComponents ? 'available' : 'undefined'}`),
                    window.React.createElement('button', {
                        key: 'reload',
                        onClick: () => location.reload(),
                        className: 'btn btn-primary',
                        style: { marginTop: '1rem' }
                    }, 'Reload Application')
                ]);
            }
            
            if (!componentsReady) {
                return window.React.createElement('div', {
                    className: 'react-project-manager-loading',
                    style: {
                        padding: '2rem',
                        textAlign: 'center'
                    }
                }, [
                    window.React.createElement('h3', { 
                        key: 'title',
                        style: { color: '#007acc' }
                    }, '⚛️ Loading React Project Manager...'),
                    window.React.createElement('p', { key: 'desc' }, 'Initializing React components...'),
                    window.React.createElement('div', { 
                        key: 'spinner',
                        className: 'loading-spinner',
                        style: {
                            border: '3px solid #f3f3f3',
                            borderTop: '3px solid #007acc',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            animation: 'spin 1s linear infinite',
                            margin: '1rem auto'
                        }
                    })
                ]);
            }
            
            // Return the actual React ProjectManager component
            return window.React.createElement(window.ReactComponents.ProjectManager);
        };
    }

    // Methods to maintain compatibility with vanilla ProjectManager interface
    async handleProjectChange(project) {
        if (!this.initialized) return;
        
        // React components will automatically handle project changes through the store
        console.log('React Project Manager: Project changed');
    }

    refresh() {
        if (!this.initialized) return;
        
        // React components will automatically refresh through store subscriptions
        console.log('React Project Manager: Refresh requested');
    }

    updateUI() {
        if (!this.initialized) return;
        
        // React components handle their own UI updates
        console.log('React Project Manager: UI update requested');
    }

    // Project-related methods that might be called from other parts of the app
    async createNewProject(formData) {
        if (!this.app?.projectManager) return;
        
        // Delegate to the ProjectBusinessLogic for business logic
        return await this.app.projectManager.createNewProject(formData);
    }

    async saveCurrentProject() {
        if (!this.app?.projectManager) return;
        
        // Delegate to the ProjectBusinessLogic for business logic
        return await this.app.projectManager.saveCurrentProject();
    }

    async closeCurrentProject() {
        if (!this.app?.projectManager) return;
        
        // Delegate to the ProjectBusinessLogic for business logic
        return await this.app.projectManager.closeCurrentProject();
    }

    async loadSavedProject(filePath) {
        if (!this.app?.projectManager) return;
        
        // Delegate to the ProjectBusinessLogic for business logic
        return await this.app.projectManager.loadSavedProject(filePath);
    }

    async loadRecentProject(projectId) {
        if (!this.app?.projectManager) return;
        
        // Delegate to the ProjectBusinessLogic for business logic
        return await this.app.projectManager.loadRecentProject(projectId);
    }

    async exportSavedProject(filePath) {
        if (!this.app?.projectManager) return;
        
        // Delegate to the ProjectBusinessLogic for business logic
        return await this.app.projectManager.exportSavedProject(filePath);
    }

    async deleteSavedProject(filePath) {
        if (!this.app?.projectManager) return;
        
        // Delegate to the ProjectBusinessLogic for business logic
        return await this.app.projectManager.deleteSavedProject(filePath);
    }

    removeRecentProject(projectId) {
        if (!this.app?.projectManager) return;
        
        // Delegate to the ProjectBusinessLogic for business logic
        return this.app.projectManager.removeRecentProject(projectId);
    }

    clearRecentProjects() {
        if (!this.app?.projectManager) return;
        
        // Delegate to the ProjectBusinessLogic for business logic
        return this.app.projectManager.clearRecentProjects();
    }

    // Show/hide methods for modal compatibility
    showNewProjectModal() {
        console.log('React Project Manager: showNewProjectModal called (handled by React components)');
        // React components handle modals internally
    }

    closeNewProjectModal() {
        console.log('React Project Manager: closeNewProjectModal called (handled by React components)');
        // React components handle modals internally
    }

    showLoadProjectModal() {
        console.log('React Project Manager: showLoadProjectModal called (handled by React components)');
        // React components handle modals internally
    }

    closeLoadModal() {
        console.log('React Project Manager: closeLoadModal called (handled by React components)');
        // React components handle modals internally
    }

    // Cleanup method
    destroy() {
        if (this.reactRoot) {
            try {
                this.reactRoot.unmount();
                this.reactRoot = null;
            } catch (error) {
                console.error('Error unmounting React Project Manager:', error);
            }
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.initialized = false;
        console.log('React Project Manager destroyed');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ReactProjectManagerWrapper = ReactProjectManagerWrapper;
    
    console.log('✅ ReactProjectManagerWrapper registered globally');
}

console.log('React Project Manager Wrapper script loaded');