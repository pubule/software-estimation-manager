/**
 * Global Loading Indicator
 * Shows loading state for global async operations
 */

class GlobalLoadingIndicator {
    constructor() {
        // Connect to global state store
        this.store = window.appStore;
        this.storeUnsubscribe = null;
        
        this.indicator = null;
        this.currentOperations = new Set();
        
        this.init();
        this.setupStoreSubscription();
    }

    init() {
        this.createIndicator();
        this.attachToDOM();
    }

    /**
     * Create the loading indicator element
     */
    createIndicator() {
        this.indicator = document.createElement('div');
        this.indicator.id = 'global-loading-indicator';
        this.indicator.className = 'global-loading-indicator hidden';
        
        this.indicator.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <div class="loading-text">
                    <span class="loading-message">Loading...</span>
                    <span class="loading-operations" id="loading-operations-list"></span>
                </div>
            </div>
        `;
        
        // Add CSS styles
        this.addStyles();
    }

    /**
     * Add CSS styles for the loading indicator
     */
    addStyles() {
        const styles = `
            .global-loading-indicator {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--color-bg-secondary, #2d2d30);
                border: 1px solid var(--color-border, #3c3c3c);
                border-radius: 8px;
                padding: 12px 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                min-width: 200px;
                transition: opacity 0.3s ease, transform 0.3s ease;
                opacity: 1;
                transform: translateY(0);
            }
            
            .global-loading-indicator.hidden {
                opacity: 0;
                transform: translateY(-20px);
                pointer-events: none;
            }
            
            .loading-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .loading-spinner .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid var(--color-text-secondary, #cccccc);
                border-top: 2px solid var(--color-accent, #007acc);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-text {
                flex: 1;
                min-width: 0;
            }
            
            .loading-message {
                display: block;
                color: var(--color-text-primary, #cccccc);
                font-size: 14px;
                font-weight: 500;
            }
            
            .loading-operations {
                display: block;
                color: var(--color-text-secondary, #969696);
                font-size: 12px;
                margin-top: 4px;
                opacity: 0.8;
            }
        `;
        
        // Add styles to head if not already present
        if (!document.getElementById('global-loading-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'global-loading-styles';
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
        }
    }

    /**
     * Attach indicator to DOM
     */
    attachToDOM() {
        document.body.appendChild(this.indicator);
    }

    /**
     * Setup store subscription for reactive loading updates
     */
    setupStoreSubscription() {
        if (!this.store) {
            console.warn('Store not available for GlobalLoadingIndicator');
            return;
        }

        this.storeUnsubscribe = this.store.subscribe((state, prevState) => {
            // React to loading state changes
            if (state.loadingStates !== prevState.loadingStates) {
                this.updateIndicator(state.loadingStates);
            }
        });
    }

    /**
     * Update indicator based on loading states
     */
    updateIndicator(loadingStates) {
        const loadingKeys = Array.from(loadingStates.keys());
        const isLoading = loadingKeys.length > 0;
        
        if (isLoading) {
            this.showIndicator(loadingKeys);
        } else {
            this.hideIndicator();
        }
    }

    /**
     * Show loading indicator with current operations
     */
    showIndicator(operations) {
        if (!this.indicator) return;
        
        // Update operations list
        const operationsText = this.formatOperations(operations);
        const operationsList = this.indicator.querySelector('#loading-operations-list');
        if (operationsList) {
            operationsList.textContent = operationsText;
        }
        
        // Show indicator
        this.indicator.classList.remove('hidden');
    }

    /**
     * Hide loading indicator
     */
    hideIndicator() {
        if (!this.indicator) return;
        
        this.indicator.classList.add('hidden');
    }

    /**
     * Format operations for display
     */
    formatOperations(operations) {
        if (operations.length === 0) return '';
        if (operations.length === 1) return this.formatOperationName(operations[0]);
        
        return `${operations.length} operations in progress`;
    }

    /**
     * Format operation name for user display
     */
    formatOperationName(operation) {
        const operationNames = {
            'project-save': 'Saving project',
            'project-load': 'Loading project',
            'project-export': 'Exporting project',
            'project-create': 'Creating project',
            'projects-list-load': 'Loading projects list',
            'projects-refresh': 'Refreshing projects',
            'feature-save': 'Saving feature',
            'feature-delete': 'Deleting feature',
            'feature-export': 'Exporting features',
            'config-load': 'Loading configuration',
            'config-save': 'Saving configuration',
            'calculations': 'Calculating costs',
            'version-create': 'Creating version',
            'data-import': 'Importing data',
            'data-export': 'Exporting data'
        };
        
        return operationNames[operation] || `Loading (${operation})`;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
            this.storeUnsubscribe = null;
        }
        
        if (this.indicator && this.indicator.parentNode) {
            this.indicator.parentNode.removeChild(this.indicator);
        }
        
        // Remove styles
        const styles = document.getElementById('global-loading-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Initialize global loading indicator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.appStore) {
        window.globalLoadingIndicator = new GlobalLoadingIndicator();
    } else {
        // Wait for store to be available
        const checkStore = setInterval(() => {
            if (window.appStore) {
                window.globalLoadingIndicator = new GlobalLoadingIndicator();
                clearInterval(checkStore);
            }
        }, 100);
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalLoadingIndicator;
}