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

        // Initialize sidebar export button listener
        initializeSidebarExportButton();

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

/**
 * Initialize sidebar export button
 * Handles Excel export from sidebar with dynamic enable/disable based on data availability
 */
async function initializeSidebarExportButton() {
    try {
        const exportBtn = document.getElementById('analytics-export-btn');

        if (!exportBtn) {
            console.warn('Export button not found in sidebar');
            return;
        }

        // Click handler for export button
        exportBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            try {
                // Accedi allo store globale Zustand
                if (!window.appStore) {
                    console.error('App store not available');
                    return;
                }

                const store = window.appStore;
                const state = store.getState();
                const ticketData = state.ticketData || [];

                // Controlla se ci sono dati
                if (!ticketData || ticketData.length === 0) {
                    console.warn('No ticket data available for export');
                    if (window.NotificationManager) {
                        NotificationManager.show('No data available for export', 'warning');
                    }
                    return;
                }

                // Istanzia e chiama l'action di export
                // TicketDashboardActions è esportato globalmente da main.tsx
                if (!window.TicketDashboardActions) {
                    throw new Error('TicketDashboardActions not available - ensure main.tsx has loaded');
                }
                const actions = new window.TicketDashboardActions();
                await actions.exportReportToExcel();

            } catch (error) {
                console.error('Export failed:', error);
                if (window.NotificationManager) {
                    NotificationManager.show('Export failed: ' + error.message, 'error');
                } else {
                    alert('Export failed: ' + error.message);
                }
            }
        });

        // Subscribe to store changes to enable/disable button based on data availability
        if (window.appStore && window.appStore.subscribe) {
            window.appStore.subscribe((state) => {
                const hasData = state.ticketData && state.ticketData.length > 0;
                exportBtn.disabled = !hasData;
                console.log('Export button state updated:', { hasData, ticketDataLength: state.ticketData?.length });
            });
        }

        console.log('Sidebar export button initialized');

    } catch (error) {
        console.error('Failed to initialize sidebar export button:', error);
    }
}

console.log('Main application script loaded');