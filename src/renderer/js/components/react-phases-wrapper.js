/**
 * React Phases Wrapper - Integrates React phases page with vanilla navigation
 * Similar to react-features-wrapper.js but for phases page
 */

class ReactPhasesWrapper {
    constructor() {
        this.initialized = false;
        this.reactRoot = null;
        this.container = null;
        
        console.log('ReactPhasesWrapper created');
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('Initializing React Phases Page');
            
            // Wait for React to be available
            await this.waitForReact();
            
            // Get the phases page container
            const phasesPage = document.getElementById('phases-page');
            if (!phasesPage) {
                console.error('Phases page container not found');
                return;
            }

            // Clear existing content and create React container
            phasesPage.innerHTML = '';
            
            // Create React container
            this.container = document.createElement('div');
            this.container.id = 'react-phases-root';
            phasesPage.appendChild(this.container);

            // Mount React app
            this.mountReactApp();
            
            this.initialized = true;
            console.log('React Phases Page initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize React Phases Page:', error);
            throw error;
        }
    }

    async waitForReact() {
        return new Promise((resolve) => {
            const checkReact = () => {
                if (window.React && window.ReactDOM && window.ReactComponents && window.ReactComponents.PhasesManager) {
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
            
            // Create the PhasesManager React component
            const PhasesPageApp = window.React.createElement(
                window.ReactComponents.PhasesManager,
                null
            );
            
            // Render the app
            this.reactRoot.render(PhasesPageApp);
            
            console.log('React Phases Page mounted successfully');
        } catch (error) {
            console.error('Error mounting React Phases app:', error);
            // Fallback to show error message
            this.container.innerHTML = `
                <div class="react-error" style="padding: 2rem; text-align: center; color: #ff6b6b;">
                    <h3>❌ React Phases Page Error</h3>
                    <p>Failed to load React components</p>
                    <p><small>${error.message}</small></p>
                </div>
            `;
        }
    }

    // Method called when navigating to phases page
    onNavigate() {
        if (!this.initialized) {
            this.init().catch(error => {
                console.error('Failed to initialize React Phases Page on navigate:', error);
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
                console.error('Error unmounting React Phases app:', error);
            }
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.initialized = false;
        console.log('React Phases Wrapper destroyed');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ReactPhasesWrapper = ReactPhasesWrapper;
}

console.log('React Phases Wrapper loaded');