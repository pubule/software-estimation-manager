/**
 * Main Application Entry Point
 * Software Estimation Manager
 */

// Global application instance
let app = null;

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing Software Estimation Manager...');
        
        // Create application instance
        if (window.ApplicationController) {
            app = new ApplicationController();
        } else {
            throw new Error('ApplicationController not available');
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

// Legacy compatibility functions
window.getApp = function() {
    return window.app;
};

// Compatibility function for existing code
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