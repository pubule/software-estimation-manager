/**
 * Main Application Entry Point (Refactored)
 * Uses the new refactored components while maintaining backward compatibility
 */

// Global application instance
let app = null;

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing Software Estimation Manager...');
        
        // Create application instance using refactored controller
        if (window.ApplicationController) {
            app = new ApplicationController();
        } else {
            // Fallback to original implementation if refactored not available
            console.warn('Using fallback to original SoftwareEstimationApp');
            app = new SoftwareEstimationApp();
        }
        
        // Make app globally available for backward compatibility
        window.app = app;
        
        // Initialize the application
        await app.init();
        
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Show error to user
        if (window.NotificationManager) {
            NotificationManager.show('Failed to initialize application: ' + error.message, 'error');
        } else {
            alert('Failed to initialize application: ' + error.message);
        }
    }
});

/**
 * Original SoftwareEstimationApp (kept for backward compatibility)
 * This is a simplified version that can act as a fallback
 * Only define if not already defined to avoid conflicts
 */
if (!window.SoftwareEstimationApp) {
    class SoftwareEstimationApp {
    constructor() {
        console.log('Using legacy SoftwareEstimationApp as fallback');
        
        // Initialize with minimal required properties for backward compatibility
        this.currentProject = null;
        this.isDirty = false;
        this.currentPage = 'projects';
        
        // Initialize components in compatibility mode
        this.featureManager = null;
        this.configManager = null;
        this.dataManager = null;
        this.navigationManager = null;
        this.phasesManager = null;
    }

    async init() {
        console.log('Initializing legacy application...');
        
        try {
            // Initialize data manager
            this.dataManager = new DataManager();
            
            // Initialize configuration manager
            this.configManager = new ConfigurationManager(this.dataManager);
            await this.configManager.init();
            
            // Initialize feature manager
            this.featureManager = new FeatureManager(this.dataManager, this.configManager);
            
            // Initialize other managers...
            if (window.EnhancedNavigationManager) {
                this.navigationManager = new EnhancedNavigationManager(this, this.configManager);
            }
            
            if (window.ProjectPhasesManager) {
                this.phasesManager = new ProjectPhasesManager(this, this.configManager);
            }
            
            // Create default project
            this.currentProject = this.createNewProject();
            
            // Set up basic event listeners
            this.setupBasicEventListeners();
            
            console.log('Legacy application initialized');
            
        } catch (error) {
            console.error('Legacy initialization failed:', error);
            throw error;
        }
    }

    createNewProject() {
        return {
            project: {
                id: this.generateId(),
                name: 'New Project',
                version: '1.0.0',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            },
            features: [],
            phases: {},
            config: this.configManager?.initializeProjectConfig() || {},
            versions: []
        };
    }

    setupBasicEventListeners() {
        // Basic save functionality
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProject());
        }

        // Add feature button
        const addFeatureBtn = document.getElementById('add-feature-btn');
        if (addFeatureBtn) {
            addFeatureBtn.addEventListener('click', () => {
                this.featureManager?.showAddFeatureModal();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveProject();
                        break;
                }
            }
        });
    }

    async saveProject() {
        if (!this.currentProject) return false;
        
        try {
            this.currentProject.project.lastModified = new Date().toISOString();
            await this.dataManager.saveProject(this.currentProject);
            
            this.isDirty = false;
            this.updateProjectStatus();
            
            if (window.NotificationManager) {
                NotificationManager.show('Project saved successfully', 'success');
            }
            
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            return false;
        }
    }

    markDirty() {
        this.isDirty = true;
        this.updateProjectStatus();
    }

    updateProjectStatus() {
        const statusEl = document.getElementById('project-status');
        if (statusEl) {
            statusEl.className = this.isDirty ? 'unsaved' : 'saved';
            statusEl.textContent = this.isDirty ? '●' : '○';
        }
    }

    updateSummary() {
        if (!this.currentProject) return;

        const features = this.currentProject.features;
        const totalFeatures = features.length;
        const totalManDays = features.reduce((sum, feature) => sum + (feature.manDays || 0), 0);

        const totalFeaturesEl = document.getElementById('total-features');
        if (totalFeaturesEl) totalFeaturesEl.textContent = totalFeatures;

        const totalManDaysEl = document.getElementById('total-man-days');
        if (totalManDaysEl) totalManDaysEl.textContent = totalManDays.toFixed(1);
    }

    generateId(prefix = '') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return prefix ? `${prefix}_${result}` : result;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SoftwareEstimationApp = SoftwareEstimationApp;
}
} // End of if (!window.SoftwareEstimationApp) condition

/**
 * Legacy compatibility functions
 * These ensure that existing code continues to work
 */

// Make sure global app reference is available
window.getApp = function() {
    return window.app;
};

// Compatibility shims for commonly used patterns
window.initializeApp = async function() {
    if (!window.app) {
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
        
        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return window.app;
};

// Error handling for missing dependencies
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Try to show user-friendly error
    if (window.NotificationManager) {
        NotificationManager.show('An error occurred: ' + event.error.message, 'error');
    } else if (window.ErrorHandler) {
        ErrorHandler.getInstance().handleError('Global Error', event.error);
    }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (window.ErrorHandler) {
        ErrorHandler.getInstance().handleError('Unhandled Promise Rejection', event.reason);
    }
});

console.log('Main application script loaded');