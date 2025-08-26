/**
 * React Features Wrapper - Integrates React features page with vanilla navigation
 * Similar to react-project-manager-wrapper.js but for features page
 */

class ReactFeaturesWrapper {
    constructor() {
        this.initialized = false;
        this.reactRoot = null;
        this.container = null;
        
        console.log('ReactFeaturesWrapper created');
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('Initializing React Features Page');
            
            // Wait for React to be available
            await this.waitForReact();
            
            // Get the features page container
            const featuresPage = document.getElementById('features-page');
            if (!featuresPage) {
                console.error('Features page container not found');
                return;
            }

            // Clear existing content and create React container
            featuresPage.innerHTML = '';
            
            // Create React container
            this.container = document.createElement('div');
            this.container.id = 'react-features-root';
            featuresPage.appendChild(this.container);

            // Mount React app
            this.mountReactApp();
            
            this.initialized = true;
            console.log('React Features Page initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize React Features Page:', error);
            throw error;
        }
    }

    async waitForReact() {
        return new Promise((resolve) => {
            const checkReact = () => {
                if (window.React && window.ReactDOM && window.ReactComponents && window.ReactComponents.FeaturesPage) {
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
            
            // Create the FeaturesPage React component
            const FeaturesPageApp = window.React.createElement(
                window.ReactComponents.FeaturesPage,
                null
            );
            
            // Render the app
            this.reactRoot.render(FeaturesPageApp);
            
            console.log('React Features Page mounted successfully');
        } catch (error) {
            console.error('Error mounting React Features app:', error);
            // Fallback to show error message
            this.container.innerHTML = `
                <div class="react-error" style="padding: 2rem; text-align: center; color: #ff6b6b;">
                    <h3>❌ React Features Page Error</h3>
                    <p>Failed to load React components</p>
                    <p><small>${error.message}</small></p>
                </div>
            `;
        }
    }

    // Method called when navigating to features page
    onNavigate() {
        if (!this.initialized) {
            this.init().catch(error => {
                console.error('Failed to initialize React Features Page on navigate:', error);
            });
        }
    }

    // Cleanup method
    destroy() {
        if (this.reactRoot) {
            try {
                this.reactRoot.unmount();
                this.reactRoot = null;
            } catch (error) {
                console.error('Error unmounting React Features app:', error);
            }
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.initialized = false;
        console.log('React Features Wrapper destroyed');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ReactFeaturesWrapper = ReactFeaturesWrapper;
}

console.log('React Features Wrapper loaded');