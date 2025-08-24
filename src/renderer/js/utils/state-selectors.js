/**
 * State Selectors & Helpers
 * Helper functions for accessing and manipulating global state
 */

/**
 * Get the global store instance
 * @returns {Object|null} The global store or null if not available
 */
function getStore() {
    return window.appStore || null;
}

/**
 * Get current global state
 * @returns {Object|null} Current state or null if store not available
 */
function getState() {
    const store = getStore();
    return store ? store.getState() : null;
}

// ======================
// PROJECT SELECTORS
// ======================

/**
 * Get current project
 * @returns {Object|null} Current project or null
 */
function getCurrentProject() {
    const state = getState();
    return state?.currentProject || null;
}

/**
 * Get project basic info
 * @returns {Object|null} Project info or null
 */
function getProjectInfo() {
    const project = getCurrentProject();
    return project?.project || null;
}

/**
 * Get project features
 * @returns {Array} Array of features (empty if no project)
 */
function getProjectFeatures() {
    const project = getCurrentProject();
    return project?.features || [];
}

/**
 * Get project phases
 * @returns {Object} Phases object (empty if no project)
 */
function getProjectPhases() {
    const project = getCurrentProject();
    return project?.phases || {};
}

/**
 * Get project configuration
 * @returns {Object} Project config (empty if no project)
 */
function getProjectConfig() {
    const project = getCurrentProject();
    return project?.config || {};
}

/**
 * Check if project is loaded
 * @returns {boolean} True if project is loaded
 */
function hasProject() {
    const state = getState();
    return state?.hasProject || false;
}

/**
 * Check if project has unsaved changes
 * @returns {boolean} True if project is dirty
 */
function isProjectDirty() {
    const state = getState();
    return state?.isDirty || false;
}

/**
 * Get project name
 * @returns {string} Project name or default
 */
function getProjectName() {
    const state = getState();
    return state?.projectName || 'New Project';
}

/**
 * Get last saved time formatted
 * @returns {string} Formatted last saved time
 */
function getLastSavedFormatted() {
    const state = getState();
    return state?.lastSavedFormatted || 'Never';
}

// ======================
// PROJECT COMPUTED VALUES
// ======================

/**
 * Get total feature count
 * @returns {number} Number of features
 */
function getFeatureCount() {
    const state = getState();
    return state?.featureCount || 0;
}

/**
 * Get total man days across all features
 * @returns {number} Total man days
 */
function getTotalManDays() {
    const state = getState();
    return state?.totalManDays || 0;
}

/**
 * Get features by category
 * @returns {Object} Features grouped by category
 */
function getFeaturesByCategory() {
    const features = getProjectFeatures();
    return features.reduce((acc, feature) => {
        const category = feature.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(feature);
        return acc;
    }, {});
}

/**
 * Get features by supplier
 * @returns {Object} Features grouped by supplier
 */
function getFeaturesBySupplier() {
    const features = getProjectFeatures();
    return features.reduce((acc, feature) => {
        const supplier = feature.supplier || 'Unassigned';
        if (!acc[supplier]) {
            acc[supplier] = [];
        }
        acc[supplier].push(feature);
        return acc;
    }, {});
}

/**
 * Get feature statistics
 * @returns {Object} Statistics about features
 */
function getFeatureStats() {
    const features = getProjectFeatures();
    
    return {
        total: features.length,
        totalManDays: features.reduce((sum, f) => sum + (f.manDays || 0), 0),
        totalRealManDays: features.reduce((sum, f) => sum + (f.realManDays || 0), 0),
        byCategory: getFeaturesByCategory(),
        bySupplier: getFeaturesBySupplier(),
        avgManDaysPerFeature: features.length > 0 
            ? Math.round(features.reduce((sum, f) => sum + (f.manDays || 0), 0) / features.length * 100) / 100 
            : 0
    };
}

// ======================
// UI STATE SELECTORS
// ======================

/**
 * Get current page
 * @returns {string} Current page name
 */
function getCurrentPage() {
    const state = getState();
    return state?.currentPage || 'projects';
}

/**
 * Get current section
 * @returns {string} Current section name
 */
function getCurrentSection() {
    const state = getState();
    return state?.currentSection || 'features';
}

/**
 * Check if any modal is open
 * @returns {boolean} True if modal is open
 */
function hasOpenModal() {
    const state = getState();
    return state?.hasOpenModal || false;
}

/**
 * Get open modal IDs
 * @returns {Array} Array of open modal IDs
 */
function getOpenModals() {
    const state = getState();
    return state?.modalsOpen ? Array.from(state.modalsOpen) : [];
}

/**
 * Check if specific modal is open
 * @param {string} modalId - Modal ID to check
 * @returns {boolean} True if modal is open
 */
function isModalOpen(modalId) {
    const openModals = getOpenModals();
    return openModals.includes(modalId);
}

// ======================
// LOADING STATE SELECTORS
// ======================

/**
 * Check if any loading operation is active
 * @returns {boolean} True if loading
 */
function isAnyLoading() {
    const state = getState();
    return state?.isLoading || false;
}

/**
 * Check if specific operation is loading
 * @param {string} key - Loading operation key
 * @returns {boolean} True if operation is loading
 */
function isLoading(key) {
    const state = getState();
    return state?.loadingStates?.has(key) || false;
}

/**
 * Get all loading operation keys
 * @returns {Array} Array of loading operation keys
 */
function getLoadingKeys() {
    const state = getState();
    return state?.loadingStates ? Array.from(state.loadingStates.keys()) : [];
}

// ======================
// NOTIFICATION SELECTORS
// ======================

/**
 * Get all notifications
 * @returns {Array} Array of notifications
 */
function getNotifications() {
    const state = getState();
    return state?.notifications || [];
}

/**
 * Get notification count
 * @returns {number} Number of notifications
 */
function getNotificationCount() {
    return getNotifications().length;
}

/**
 * Get notifications by type
 * @param {string} type - Notification type
 * @returns {Array} Filtered notifications
 */
function getNotificationsByType(type) {
    return getNotifications().filter(n => n.type === type);
}

// ======================
// CONFIGURATION SELECTORS
// ======================

/**
 * Get global configuration
 * @returns {Object} Global config or empty object
 */
function getGlobalConfig() {
    const state = getState();
    return state?.globalConfig || {};
}

// ======================
// ACTION HELPERS
// ======================

/**
 * Execute action on store
 * @param {string} actionName - Action method name
 * @param {...any} args - Action arguments
 * @returns {any} Action result
 */
function executeAction(actionName, ...args) {
    const state = getState();
    if (state && typeof state[actionName] === 'function') {
        return state[actionName](...args);
    } else {
        console.warn(`Action '${actionName}' not found in store`);
        return null;
    }
}

/**
 * Update project with function
 * @param {Function} updater - Update function
 */
function updateProject(updater) {
    executeAction('updateProject', updater);
}

/**
 * Navigate to page/section
 * @param {string} page - Page name
 * @param {string} section - Section name (optional)
 */
function navigateTo(page, section = null) {
    executeAction('navigateTo', page, section);
}

/**
 * Set current section
 * @param {string} section - Section name
 */
function setSection(section) {
    executeAction('setSection', section);
}

/**
 * Mark project as dirty
 */
function markProjectDirty() {
    executeAction('markDirty');
}

/**
 * Mark project as clean
 */
function markProjectClean() {
    executeAction('markClean');
}

// ======================
// UTILITY FUNCTIONS
// ======================

/**
 * Subscribe to state changes
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
function subscribe(callback) {
    const store = getStore();
    return store ? store.subscribe(callback) : () => {};
}

/**
 * Create a selector hook-like function
 * @param {Function} selector - Selector function
 * @returns {Function} Hook-like function that returns selected value
 */
function createSelector(selector) {
    return () => {
        const state = getState();
        return selector(state);
    };
}

// ======================
// EXPORTS
// ======================

// Make selectors available globally
if (typeof window !== 'undefined') {
    window.StateSelectors = {
        // Core
        getStore,
        getState,
        subscribe,
        createSelector,
        
        // Project
        getCurrentProject,
        getProjectInfo,
        getProjectFeatures,
        getProjectPhases,
        getProjectConfig,
        hasProject,
        isProjectDirty,
        getProjectName,
        getLastSavedFormatted,
        
        // Project computed
        getFeatureCount,
        getTotalManDays,
        getFeaturesByCategory,
        getFeaturesBySupplier,
        getFeatureStats,
        
        // UI State
        getCurrentPage,
        getCurrentSection,
        hasOpenModal,
        getOpenModals,
        isModalOpen,
        
        // Loading
        isAnyLoading,
        isLoading,
        getLoadingKeys,
        
        // Notifications
        getNotifications,
        getNotificationCount,
        getNotificationsByType,
        
        // Configuration
        getGlobalConfig,
        
        // Actions
        executeAction,
        updateProject,
        navigateTo,
        setSection,
        markProjectDirty,
        markProjectClean,
        
        // 🚨 CRITICAL FIX: Add missing alias for getIsDirty
        getIsDirty: isProjectDirty
    };
}

// Functions are already available globally via window.StateSelectors