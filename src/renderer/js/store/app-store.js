/**
 * Application State Store (Zustand Vanilla)
 * Centralizes all application state management
 */

/**
 * Main Application Store
 * Contains all global state for the Software Estimation Manager
 */
const appStore = window.zustand.createStore((set, get) => ({
    // ======================
    // PROJECT STATE
    // ======================
    currentProject: null,
    isDirty: false,
    lastSavedTime: null,
    
    // ======================
    // UI STATE
    // ======================
    currentPage: 'projects',
    currentSection: 'features',
    modalsOpen: new Set(),
    loadingStates: new Map(), // For tracking loading states
    
    // ======================
    // NOTIFICATION STATE
    // ======================
    notifications: [],
    
    // ======================
    // CONFIGURATION STATE
    // ======================
    globalConfig: null,
    
    // ======================
    // PROJECT ACTIONS
    // ======================
    
    /**
     * Set the current project
     */
    setProject: (project) => {
        set({ 
            currentProject: project,
            isDirty: false,
            lastSavedTime: project?.project?.lastModified ? new Date(project.project.lastModified) : null
        });
    },
    
    /**
     * Mark project as dirty (has unsaved changes)
     */
    markDirty: () => {
        set({ isDirty: true });
    },
    
    /**
     * Mark project as clean (saved)
     */
    markClean: () => {
        set({ 
            isDirty: false,
            lastSavedTime: new Date()
        });
    },
    
    /**
     * Update project data without changing dirty state
     */
    updateProject: (updater) => {
        const currentState = get();
        const updatedProject = typeof updater === 'function' 
            ? updater(currentState.currentProject) 
            : updater;
        
        set({ 
            currentProject: updatedProject,
            isDirty: true
        });
    },
    
    /**
     * Reset to new project
     */
    newProject: () => {
        set({
            currentProject: null,
            isDirty: false,
            lastSavedTime: null
        });
    },
    
    // ======================
    // UI ACTIONS
    // ======================
    
    /**
     * Navigate to a page/section
     */
    navigateTo: (page, section = null) => {
        const newState = { currentPage: page };
        if (section) {
            newState.currentSection = section;
        }
        set(newState);
    },
    
    /**
     * Set current section
     */
    setSection: (section) => {
        set({ currentSection: section });
    },
    
    /**
     * Modal management
     */
    openModal: (modalId) => {
        const currentState = get();
        const newModals = new Set(currentState.modalsOpen);
        newModals.add(modalId);
        set({ modalsOpen: newModals });
    },
    
    closeModal: (modalId) => {
        const currentState = get();
        const newModals = new Set(currentState.modalsOpen);
        newModals.delete(modalId);
        set({ modalsOpen: newModals });
    },
    
    /**
     * Loading state management
     */
    setLoading: (key, isLoading) => {
        const currentState = get();
        const newLoadingStates = new Map(currentState.loadingStates);
        if (isLoading) {
            newLoadingStates.set(key, true);
        } else {
            newLoadingStates.delete(key);
        }
        set({ loadingStates: newLoadingStates });
    },
    
    // ======================
    // NOTIFICATION ACTIONS
    // ======================
    
    /**
     * Add notification
     */
    addNotification: (notification) => {
        const currentState = get();
        const id = Date.now() + Math.random();
        const newNotification = {
            id,
            timestamp: new Date(),
            ...notification
        };
        
        set({ 
            notifications: [...currentState.notifications, newNotification] 
        });
        
        // Auto-remove after timeout
        if (notification.autoRemove !== false) {
            setTimeout(() => {
                get().removeNotification(id);
            }, notification.timeout || 5000);
        }
        
        return id;
    },
    
    /**
     * Remove notification
     */
    removeNotification: (id) => {
        const currentState = get();
        set({ 
            notifications: currentState.notifications.filter(n => n.id !== id) 
        });
    },
    
    /**
     * Clear all notifications
     */
    clearNotifications: () => {
        set({ notifications: [] });
    },
    
    // ======================
    // CONFIGURATION ACTIONS
    // ======================
    
    /**
     * Set global configuration
     */
    setGlobalConfig: (config) => {
        set({ globalConfig: config });
    },
    
    // ======================
    // COMPUTED GETTERS
    // ======================
    
    /**
     * Get project name (computed)
     */
    get projectName() {
        const state = get();
        return state.currentProject?.project?.name || 'New Project';
    },
    
    /**
     * Check if project is loaded (computed)
     */
    get hasProject() {
        const state = get();
        return state.currentProject !== null;
    },
    
    /**
     * Get project features count (computed)
     */
    get featureCount() {
        const state = get();
        return state.currentProject?.features?.length || 0;
    },
    
    /**
     * Get total man days (computed)
     */
    get totalManDays() {
        const state = get();
        return state.currentProject?.features?.reduce((sum, f) => sum + (f.manDays || 0), 0) || 0;
    },
    
    /**
     * Check if any modal is open (computed)
     */
    get hasOpenModal() {
        const state = get();
        return state.modalsOpen.size > 0;
    },
    
    /**
     * Check if anything is loading (computed)
     */
    get isLoading() {
        const state = get();
        return state.loadingStates.size > 0;
    },
    
    /**
     * Get formatted last saved time (computed)
     */
    get lastSavedFormatted() {
        const state = get();
        if (!state.lastSavedTime) return 'Never';
        
        return state.lastSavedTime.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}));

// ======================
// DEBUGGING HELPERS
// ======================

/**
 * Debug helper - log all state changes in development
 */
if (window.location.hostname === 'localhost' || window.location.hash.includes('debug')) {
    try {
        let previousState = appStore.getState();
        
        appStore.subscribe((state) => {
            // Simple shallow comparison to detect changes
            const changes = {};
            for (const key in state) {
                if (state[key] !== previousState[key]) {
                    changes[key] = { from: previousState[key], to: state[key] };
                }
            }
            
            if (Object.keys(changes).length > 0) {
                console.group('🏪 State Change');
                console.log('Changes:', changes);
                console.log('Full State:', state);
                console.groupEnd();
            }
            
            previousState = state;
        });
        console.log('Debug mode enabled for state store');
    } catch (error) {
        console.warn('Failed to enable debug mode for store:', error);
    }
}

// Make store available globally
if (typeof window !== 'undefined') {
    window.appStore = appStore;
    console.log('✅ App store assigned to window.appStore');
    
    // Verify store is working
    if (window.appStore && typeof window.appStore.getState === 'function') {
        console.log('✅ Store methods verified');
        console.log('Store state keys:', Object.keys(window.appStore.getState()));
    } else {
        console.error('❌ Store methods not available');
    }
} else {
    console.error('❌ Window not available, cannot assign store');
}