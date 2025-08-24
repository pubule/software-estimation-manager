/**
 * Loading States Helpers
 * Utility functions for managing global loading states
 */

/**
 * Execute an async operation with global loading state
 * @param {string} key - Loading state key
 * @param {Function} operation - Async operation to execute
 * @param {Object} options - Options for loading management
 * @returns {Promise} Result of the operation
 */
async function withLoading(key, operation, options = {}) {
    const store = window.appStore;
    
    if (!store) {
        console.warn('Global store not available, executing without loading state');
        return await operation();
    }

    try {
        // Set loading state
        store.getState().setLoading(key, true);
        
        // Show loading UI if specified
        if (options.showModal) {
            // Show loading modal
            if (window.modalManager) {
                window.modalManager.showLoading(options.message || 'Loading...', {
                    id: `loading-${key}`,
                    ...options.modalOptions
                });
            }
        }
        
        // Execute operation
        const result = await operation();
        
        return result;
        
    } catch (error) {
        // Re-throw error after cleaning up loading state
        throw error;
        
    } finally {
        // Clear loading state
        store.getState().setLoading(key, false);
        
        // Hide loading modal if it was shown
        if (options.showModal && window.modalManager) {
            window.modalManager.hideLoading(`loading-${key}`);
        }
    }
}

/**
 * Check if a specific operation is loading
 * @param {string} key - Loading state key
 * @returns {boolean} True if loading
 */
function isLoading(key) {
    const store = window.appStore;
    if (!store) return false;
    
    return store.getState().loadingStates.has(key);
}

/**
 * Check if any operation is loading
 * @returns {boolean} True if any loading state is active
 */
function isAnyLoading() {
    const store = window.appStore;
    if (!store) return false;
    
    return store.getState().isLoading;
}

/**
 * Get all current loading keys
 * @returns {Array} Array of loading state keys
 */
function getLoadingKeys() {
    const store = window.appStore;
    if (!store) return [];
    
    return Array.from(store.getState().loadingStates.keys());
}

/**
 * Execute multiple async operations in parallel with loading states
 * @param {Object} operations - Object with key-operation pairs
 * @param {Object} options - Global options
 * @returns {Promise<Object>} Results object with same keys
 */
async function withMultipleLoading(operations, options = {}) {
    const promises = Object.entries(operations).map(([key, operation]) =>
        withLoading(key, operation, options).then(result => ({ key, result }))
    );
    
    const results = await Promise.all(promises);
    
    // Convert array back to object
    return results.reduce((acc, { key, result }) => {
        acc[key] = result;
        return acc;
    }, {});
}

/**
 * Loading state decorator for methods
 * @param {string} key - Loading state key
 * @param {Object} options - Loading options
 * @returns {Function} Method decorator
 */
function loadingDecorator(key, options = {}) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function(...args) {
            return await withLoading(key, () => originalMethod.apply(this, args), options);
        };
        
        return descriptor;
    };
}

/**
 * Common loading operations
 */
const LoadingOperations = {
    PROJECT_SAVE: 'project-save',
    PROJECT_LOAD: 'project-load',
    PROJECT_EXPORT: 'project-export',
    PROJECT_CREATE: 'project-create',
    FEATURE_SAVE: 'feature-save',
    FEATURE_DELETE: 'feature-delete',
    FEATURE_EXPORT: 'feature-export',
    CONFIG_LOAD: 'config-load',
    CONFIG_SAVE: 'config-save',
    CALCULATIONS: 'calculations',
    VERSION_CREATE: 'version-create',
    DATA_IMPORT: 'data-import',
    DATA_EXPORT: 'data-export'
};

// Make loading helpers available globally
if (typeof window !== 'undefined') {
    window.LoadingHelpers = {
        withLoading,
        isLoading,
        isAnyLoading,
        getLoadingKeys,
        withMultipleLoading,
        loadingDecorator,
        LoadingOperations
    };
}

// Functions are already available globally via window.LoadingHelpers