/**
 * Centralized Error Handler
 * Provides consistent error handling across the application
 */

class ErrorHandler {
    static instance = null;

    constructor() {
        if (ErrorHandler.instance) {
            return ErrorHandler.instance;
        }

        this.errorCallbacks = new Map();
        this.errorHistory = [];
        this.maxHistorySize = 100;

        // Set up global error handlers
        this.setupGlobalHandlers();

        ErrorHandler.instance = this;
    }

    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * Set up global error handlers
     */
    setupGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Unhandled Promise Rejection', event.reason, {
                critical: true,
                source: 'promise'
            });
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError('JavaScript Error', new Error(event.message), {
                critical: true,
                source: 'javascript',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
    }

    /**
     * Main error handling method
     */
    handleError(context, error, options = {}) {
        const errorInfo = {
            id: this.generateErrorId(),
            context,
            error: this.normalizeError(error),
            options,
            timestamp: new Date().toISOString(),
            component: options.component || 'Unknown',
            severity: this.determineSeverity(error, options)
        };

        // Add to history
        this.addToHistory(errorInfo);

        // Log to console
        this.logError(errorInfo);

        // Show notification if needed
        if (options.showNotification !== false) {
            this.showNotification(errorInfo);
        }

        // Call registered callbacks
        this.triggerCallbacks(errorInfo);

        // Report to analytics/monitoring if available
        this.reportError(errorInfo);

        return errorInfo;
    }

    /**
     * Normalize error to consistent format
     */
    normalizeError(error) {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        }

        if (typeof error === 'string') {
            return {
                name: 'CustomError',
                message: error,
                stack: new Error().stack
            };
        }

        if (typeof error === 'object' && error !== null) {
            return {
                name: error.name || 'ObjectError',
                message: error.message || JSON.stringify(error),
                stack: error.stack || new Error().stack
            };
        }

        return {
            name: 'UnknownError',
            message: String(error),
            stack: new Error().stack
        };
    }

    /**
     * Determine error severity
     */
    determineSeverity(error, options) {
        if (options.critical) return 'critical';
        
        if (error instanceof TypeError || error instanceof ReferenceError) {
            return 'high';
        }

        if (options.severity) return options.severity;

        return 'medium';
    }

    /**
     * Log error to console with appropriate level
     */
    logError(errorInfo) {
        const { severity, context, error, component, timestamp } = errorInfo;
        const logMessage = `[${timestamp}] ${component}: ${context} - ${error.message}`;

        switch (severity) {
            case 'critical':
                console.error(`🔴 CRITICAL: ${logMessage}`, error);
                break;
            case 'high':
                console.error(`🟠 HIGH: ${logMessage}`, error);
                break;
            case 'medium':
                console.warn(`🟡 MEDIUM: ${logMessage}`, error);
                break;
            default:
                console.log(`ℹ️ INFO: ${logMessage}`, error);
        }
    }

    /**
     * Show user notification
     */
    showNotification(errorInfo) {
        const { severity, context, error } = errorInfo;

        if (!window.NotificationManager) return;

        let message;
        switch (severity) {
            case 'critical':
                message = `Critical Error: ${context}`;
                break;
            case 'high':
                message = `Error: ${context} - ${error.message}`;
                break;
            case 'medium':
                message = `Warning: ${context}`;
                break;
            default:
                message = context;
        }

        const type = severity === 'critical' || severity === 'high' ? 'error' : 'warning';
        NotificationManager.show(message, type);
    }

    /**
     * Register error callback
     */
    onError(component, callback) {
        if (!this.errorCallbacks.has(component)) {
            this.errorCallbacks.set(component, []);
        }
        this.errorCallbacks.get(component).push(callback);
    }

    /**
     * Unregister error callbacks for component
     */
    offError(component) {
        this.errorCallbacks.delete(component);
    }

    /**
     * Trigger registered callbacks
     */
    triggerCallbacks(errorInfo) {
        this.errorCallbacks.forEach((callbacks, component) => {
            callbacks.forEach(callback => {
                try {
                    callback(errorInfo);
                } catch (callbackError) {
                    console.error(`Error in error callback for ${component}:`, callbackError);
                }
            });
        });
    }

    /**
     * Add error to history
     */
    addToHistory(errorInfo) {
        this.errorHistory.unshift(errorInfo);
        
        // Limit history size
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.splice(this.maxHistorySize);
        }
    }

    /**
     * Get error history
     */
    getErrorHistory(limit = 50) {
        return this.errorHistory.slice(0, limit);
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
    }

    /**
     * Report error to external service (placeholder)
     */
    reportError(errorInfo) {
        // This could integrate with external error reporting services
        // like Sentry, LogRocket, etc.
        if (typeof window.errorReporter === 'function') {
            try {
                window.errorReporter(errorInfo);
            } catch (reportError) {
                console.warn('Failed to report error to external service:', reportError);
            }
        }
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errorHistory.length,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            byComponent: {},
            recent: this.errorHistory.slice(0, 10)
        };

        this.errorHistory.forEach(error => {
            stats[error.severity] = (stats[error.severity] || 0) + 1;
            stats.byComponent[error.component] = (stats.byComponent[error.component] || 0) + 1;
        });

        return stats;
    }

    /**
     * Create error boundary for async operations
     */
    async withErrorBoundary(operation, context, options = {}) {
        try {
            return await operation();
        } catch (error) {
            this.handleError(context, error, options);
            
            // Re-throw if not configured to swallow
            if (!options.swallowError) {
                throw error;
            }
            
            return options.defaultValue;
        }
    }

    /**
     * Retry operation with error handling
     */
    async retry(operation, options = {}) {
        const {
            attempts = 3,
            delay = 1000,
            backoff = 2,
            context = 'Retry operation',
            onRetry = null
        } = options;

        let lastError;
        
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === attempts) {
                    this.handleError(`${context} failed after ${attempts} attempts`, error);
                    throw error;
                }

                if (onRetry) {
                    onRetry(attempt, error);
                }

                // Wait before retry with exponential backoff
                await new Promise(resolve => 
                    setTimeout(resolve, delay * Math.pow(backoff, attempt - 1))
                );
            }
        }
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Make available globally
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
    window.errorHandler = errorHandler;
}