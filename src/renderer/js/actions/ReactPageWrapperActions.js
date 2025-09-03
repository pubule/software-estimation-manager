/**
 * ReactPageWrapperActions.js - Business logic per wrapper pages React
 * 
 * PATTERN: State/Actions/Dispatcher (dal file /agents/auto-workflow.js)
 * - TUTTA la logica business qui
 * - Gestisce inizializzazione, mount/unmount React pages
 * - Nessuna business logic nei wrapper (solo presentazione)
 */

class ReactPageWrapperActions {
    constructor() {
        // Pattern State/Actions/Dispatcher: no state locale, tutto nel store
        console.log('ReactPageWrapperActions initialized with State/Actions/Dispatcher pattern');
    }

    /**
     * Business logic: Initialize React page wrapper
     */
    async initializePage(config) {
        const { pageId, componentName, containerId, wrapperName } = config;
        
        console.log(`🚀 ReactPageWrapper: Initializing ${pageId} with ${componentName}`);
        
        try {
            // Business logic: Wait for React dependencies
            await this.waitForReactDependencies(componentName);
            
            // Business logic: Setup page container
            const container = this.setupPageContainer(pageId, containerId);
            
            // Business logic: Mount React component
            const reactRoot = this.mountReactComponent(container, componentName);
            
            console.log(`✅ ReactPageWrapper: ${pageId} initialized successfully`);
            
            return {
                container,
                reactRoot,
                initialized: true
            };
            
        } catch (error) {
            console.error(`❌ ReactPageWrapper: Failed to initialize ${pageId}:`, error);
            throw error;
        }
    }

    /**
     * Business logic: Wait for React and component dependencies
     */
    async waitForReactDependencies(componentName) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds timeout
            
            const checkDependencies = () => {
                attempts++;
                
                // Business logic: Check base React dependencies
                if (!window.React || !window.ReactDOM) {
                    if (attempts >= maxAttempts) {
                        reject(new Error('Timeout waiting for React libraries'));
                        return;
                    }
                    setTimeout(checkDependencies, 100);
                    return;
                }
                
                // Business logic: Check specific React component
                if (componentName && (!window.ReactComponents || !window.ReactComponents[componentName])) {
                    if (attempts >= maxAttempts) {
                        reject(new Error(`Timeout waiting for React component: ${componentName}`));
                        return;
                    }
                    console.log(`⏳ Waiting for ${componentName}... attempt ${attempts}/${maxAttempts}`);
                    setTimeout(checkDependencies, 100);
                    return;
                }
                
                resolve();
            };
            
            checkDependencies();
        });
    }

    /**
     * Business logic: Setup page container DOM
     */
    setupPageContainer(pageId, containerId) {
        const page = document.getElementById(pageId);
        if (!page) {
            throw new Error(`Page element not found: ${pageId}`);
        }
        
        // Business logic: Clear existing content and create React container
        page.innerHTML = '';
        
        const container = document.createElement('div');
        container.id = containerId;
        page.appendChild(container);
        
        return container;
    }

    /**
     * Business logic: Mount React component
     */
    mountReactComponent(container, componentName) {
        try {
            // Business logic: Create React root
            const reactRoot = window.ReactDOM.createRoot(container);
            
            // Business logic: Create React element
            const ReactComponent = window.ReactComponents[componentName];
            const element = window.React.createElement(ReactComponent, null);
            
            // Business logic: Render component
            reactRoot.render(element);
            
            console.log(`✅ React component ${componentName} mounted successfully`);
            return reactRoot;
            
        } catch (error) {
            console.error(`❌ Error mounting React component ${componentName}:`, error);
            
            // Business logic: Fallback error display
            this.showErrorFallback(container, componentName, error);
            throw error;
        }
    }

    /**
     * Business logic: Show error fallback UI
     */
    showErrorFallback(container, componentName, error) {
        container.innerHTML = `
            <div class="react-error" style="padding: 2rem; text-align: center; color: #ff6b6b;">
                <h3>❌ React ${componentName} Error</h3>
                <p>Failed to load React components</p>
                <p><small>${error.message}</small></p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                    Reload Application
                </button>
            </div>
        `;
    }

    /**
     * Business logic: Handle navigation to page
     */
    handleNavigation(wrapperInstance) {
        if (!wrapperInstance.initialized) {
            wrapperInstance.init().catch(error => {
                console.error(`Failed to initialize on navigation:`, error);
            });
        }
    }

    /**
     * Business logic: Cleanup React page
     */
    destroyPage(state) {
        const { reactRoot, container } = state;
        
        if (reactRoot) {
            try {
                reactRoot.unmount();
            } catch (error) {
                console.error('Error unmounting React app:', error);
            }
        }
        
        if (container) {
            container.innerHTML = '';
        }
        
        console.log('React page wrapper destroyed');
        
        return {
            reactRoot: null,
            container: null,
            initialized: false
        };
    }

    /**
     * Business logic: Get configuration for specific pages
     */
    getPageConfig(pageType) {
        const configs = {
            phases: {
                pageId: 'phases-page',
                componentName: 'PhasesManager',
                containerId: 'react-phases-root',
                wrapperName: 'ReactPhasesWrapper'
            },
            features: {
                pageId: 'features-page',
                componentName: 'FeaturesPage',
                containerId: 'react-features-root',
                wrapperName: 'ReactFeaturesWrapper'
            },
            projects: {
                pageId: 'projects-page',
                componentName: 'ProjectManager',
                containerId: 'react-project-manager-root',
                wrapperName: 'ReactProjectManagerWrapper'
            },
            calculations: {
                pageId: 'calculations-page',
                componentName: 'CalculationsPage',
                containerId: 'react-calculations-root',
                wrapperName: 'ReactCalculationsWrapper'
            },
            assumptions: {
                pageId: 'assumptions-page',
                componentName: 'AssumptionsPage',
                containerId: 'assumptions-react-root',
                wrapperName: 'ReactAssumptionsWrapper'
            }
        };
        
        if (!configs[pageType]) {
            throw new Error(`Unknown page type: ${pageType}`);
        }
        
        return configs[pageType];
    }
}

// Make available globally for script loading
if (typeof window !== 'undefined') {
    window.ReactPageWrapperActions = ReactPageWrapperActions;
}

console.log('✅ ReactPageWrapperActions loaded (State/Actions/Dispatcher pattern)');