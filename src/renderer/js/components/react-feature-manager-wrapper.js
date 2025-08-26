/**
 * React Feature Manager Wrapper
 * Wraps React Feature Manager components for integration with vanilla JS application
 */

class ReactFeatureManagerWrapper {
    constructor(dataManager, configManager) {
        this.dataManager = dataManager;
        this.configManager = configManager;
        this.initialized = false;
        this.reactRoot = null;
        this.container = null;
        
        console.log('ReactFeatureManagerWrapper created');
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('Initializing React Feature Manager');
            
            // Wait for React to be available
            await this.waitForReact();
            
            // Get the container where React app will be mounted
            this.container = document.getElementById('features-react-app');
            if (!this.container) {
                console.error('React container #features-react-app not found');
                return;
            }

            // Mount React app
            this.mountReactApp();
            
            this.initialized = true;
            console.log('React Feature Manager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize React Feature Manager:', error);
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
                this.createFeatureManagerApp(),
                null
            );
            
            // Render the app
            this.reactRoot.render(App);
            
            console.log('React Feature Manager mounted successfully');
        } catch (error) {
            console.error('Error mounting React app:', error);
            // Fallback to show error message
            this.container.innerHTML = `
                <div class="react-error" style="padding: 2rem; text-align: center; color: #ff6b6b;">
                    <h3>❌ React Feature Manager Error</h3>
                    <p>Failed to load React components</p>
                    <p><small>${error.message}</small></p>
                </div>
            `;
        }
    }

    createFeatureManagerApp() {
        // Create a React component that wraps our FeatureManager
        return function FeatureManagerApp() {
            const { useEffect, useState } = window.React;
            const [componentsReady, setComponentsReady] = useState(false);
            
            // Wait for React components to be available
            useEffect(() => {
                const checkComponents = () => {
                    if (window.ReactComponents && window.ReactComponents.FeatureManager) {
                        setComponentsReady(true);
                    } else {
                        setTimeout(checkComponents, 100);
                    }
                };
                checkComponents();
            }, []);
            
            if (!componentsReady) {
                return window.React.createElement('div', {
                    className: 'react-feature-manager-loading',
                    style: {
                        padding: '2rem',
                        textAlign: 'center'
                    }
                }, [
                    window.React.createElement('h3', { 
                        key: 'title',
                        style: { color: '#007acc' }
                    }, '⚛️ Loading React Feature Manager...'),
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
            
            // Return the actual React FeatureManager component
            return window.React.createElement(window.ReactComponents.FeatureManager);
        };
    }

    // Methods to maintain compatibility with vanilla FeatureManager interface
    async handleProjectChange(project) {
        if (!this.initialized) return;
        
        // React components will automatically handle project changes through the store
        console.log('React Feature Manager: Project changed');
    }

    refresh() {
        if (!this.initialized) return;
        
        // React components will automatically refresh through store subscriptions
        console.log('React Feature Manager: Refresh requested');
    }

    updateUI() {
        if (!this.initialized) return;
        
        // React components handle their own UI updates
        console.log('React Feature Manager: UI update requested');
    }

    // MISSING METHOD: populateFilterDropdowns
    populateFilterDropdowns() {
        console.log('React Feature Manager: populateFilterDropdowns called (handled by React components)');
        // React components handle their own dropdowns through config store
        return Promise.resolve();
    }

    // MISSING METHOD: updateFilterDropdowns  
    updateFilterDropdowns() {
        console.log('React Feature Manager: updateFilterDropdowns called (handled by React components)');
        // React components auto-update through store subscriptions
        return Promise.resolve();
    }

    // MISSING METHOD: setupEventListeners
    setupEventListeners() {
        console.log('React Feature Manager: setupEventListeners called (handled by React components)');
        // React components handle their own events
        return Promise.resolve();
    }

    // MISSING METHOD: bindFilterEvents
    bindFilterEvents() {
        console.log('React Feature Manager: bindFilterEvents called (handled by React components)');
        // React components handle filter events internally
        return Promise.resolve();
    }

    // MISSING METHOD: filterFeatures (likely called by other managers)
    filterFeatures() {
        console.log('React Feature Manager: filterFeatures called');
        // Delegate to store
        if (window.appStore) {
            const state = window.appStore.getState();
            const features = state.currentProject?.features || [];
            state.setFilteredFeatures(features);
        }
        return Promise.resolve();
    }

    // MISSING METHOD: updateSummary
    updateSummary() {
        console.log('React Feature Manager: updateSummary called (handled by React components)');
        // React components calculate and display summary automatically
        return Promise.resolve();
    }

    // MISSING METHOD: bindCoverageReset
    bindCoverageReset() {
        console.log('React Feature Manager: bindCoverageReset called (not applicable in React)');
        // Coverage functionality would be handled differently in React
        return Promise.resolve();
    }

    // Feature-related methods that might be called from other parts of the app
    addFeature(feature) {
        if (!window.appStore) return;
        
        // Delegate to store
        window.appStore.getState().addProjectFeature(feature);
    }

    updateFeature(index, feature) {
        if (!window.appStore) return;
        
        // Delegate to store
        window.appStore.getState().updateProjectFeature(index, feature);
    }

    deleteFeature(index) {
        if (!window.appStore) return;
        
        // Delegate to store
        window.appStore.getState().removeProjectFeature(index);
    }

    getFeatures() {
        if (!window.appStore) return [];
        
        const state = window.appStore.getState();
        return state.currentProject?.features || [];
    }

    // Cleanup method
    destroy() {
        if (this.reactRoot) {
            try {
                this.reactRoot.unmount();
                this.reactRoot = null;
            } catch (error) {
                console.error('Error unmounting React app:', error);
            }
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.initialized = false;
        console.log('React Feature Manager destroyed');
    }
}

// Make available globally with the same interface as vanilla FeatureManager
if (typeof window !== 'undefined') {
    window.ReactFeatureManagerWrapper = ReactFeatureManagerWrapper;
    
    // Replace the old FeatureManager with React wrapper
    window.FeatureManager = ReactFeatureManagerWrapper;
    
    console.log('✅ ReactFeatureManagerWrapper registered as window.FeatureManager');
}

console.log('React Feature Manager Wrapper script loaded');