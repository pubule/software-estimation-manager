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
    // LOOP PREVENTION STATE
    // ======================
    _isUpdatingCoverage: false, // 🚨 CRITICAL: Prevents infinite coverage update loops
    
    // ======================
    // UI STATE
    // ======================
    currentPage: 'projects',
    currentSection: 'projects', // 🚨 ULTRA THINK FIX: Start with 'projects' section, not 'features' when no project loaded
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
    // PROJECT PROPERTY ACTIONS (for eliminating direct mutations)
    // ======================
    
    /**
     * Update project features
     */
    updateProjectFeatures: (features) => {
        const currentState = get();
        if (!currentState.currentProject) return;
        
        const updatedProject = {
            ...currentState.currentProject,
            features: features
        };
        
        set({ 
            currentProject: updatedProject,
            isDirty: true
        });
    },
    
    /**
     * Add project feature
     */
    addProjectFeature: (feature) => {
        const currentState = get();
        if (!currentState.currentProject) return;
        
        const updatedFeatures = [...currentState.currentProject.features, feature];
        const updatedProject = {
            ...currentState.currentProject,
            features: updatedFeatures
        };
        
        set({ 
            currentProject: updatedProject,
            isDirty: true
        });
    },
    
    /**
     * Update project feature
     */
    updateProjectFeature: (featureIndex, updatedFeature) => {
        const currentState = get();
        if (!currentState.currentProject || !currentState.currentProject.features) return;
        
        const updatedFeatures = [...currentState.currentProject.features];
        updatedFeatures[featureIndex] = updatedFeature;
        
        const updatedProject = {
            ...currentState.currentProject,
            features: updatedFeatures
        };
        
        set({ 
            currentProject: updatedProject,
            isDirty: true
        });
    },
    
    /**
     * Remove project feature
     */
    removeProjectFeature: (featureIndex) => {
        const currentState = get();
        if (!currentState.currentProject || !currentState.currentProject.features) return;
        
        const updatedFeatures = currentState.currentProject.features.filter((_, index) => index !== featureIndex);
        const updatedProject = {
            ...currentState.currentProject,
            features: updatedFeatures
        };
        
        set({ 
            currentProject: updatedProject,
            isDirty: true
        });
    },
    
    /**
     * Update project phases
     */
    updateProjectPhases: (phases) => {
        const currentState = get();
        if (!currentState.currentProject) return;
        
        const updatedProject = {
            ...currentState.currentProject,
            phases: phases
        };
        
        set({ 
            currentProject: updatedProject,
            isDirty: true
        });
    },
    
    /**
     * Update project configuration
     */
    updateProjectConfig: (config) => {
        const currentState = get();
        if (!currentState.currentProject) return;
        
        const updatedProject = {
            ...currentState.currentProject,
            config: config
        };
        
        set({ 
            currentProject: updatedProject,
            isDirty: true
        });
    },
    
    /**
     * Update project coverage
     */
    updateProjectCoverage: (coverage, isAutoCalculated = false) => {
        const currentState = get();
        if (!currentState.currentProject) return;
        
        // 🚨 CRITICAL FIX: Prevent infinite loop in coverage update chain
        if (currentState._isUpdatingCoverage) {
            console.warn('🛡️ Prevented recursive coverage update');
            return;
        }
        
        set({ _isUpdatingCoverage: true });
        
        const updatedProject = {
            ...currentState.currentProject,
            coverage: coverage,
            coverageIsAutoCalculated: isAutoCalculated
        };
        
        set({ 
            currentProject: updatedProject,
            isDirty: true,
            _isUpdatingCoverage: false
        });
    },
    
    /**
     * Update project versions
     */
    updateProjectVersions: (versions) => {
        const currentState = get();
        if (!currentState.currentProject) return;
        
        const updatedProject = {
            ...currentState.currentProject,
            versions: versions
        };
        
        set({ 
            currentProject: updatedProject,
            isDirty: true
        });
    },
    
    /**
     * Update project metadata (project.name, project.comment, etc.)
     */
    updateProjectMetadata: (metadata) => {
        const currentState = get();
        if (!currentState.currentProject) return;
        
        const updatedProject = {
            ...currentState.currentProject,
            project: {
                ...currentState.currentProject.project,
                ...metadata,
                lastModified: new Date().toISOString()
            }
        };
        
        set({ 
            currentProject: updatedProject,
            isDirty: true
        });
    },
    
    // ======================
    // UI ACTIONS
    // ======================
    
    /**
     * Navigate to page and section
     */
    navigateTo: (page, section = null) => {
        const updates = { currentPage: page };
        if (section) {
            updates.currentSection = section;
        }
        set(updates);
    },
    
    /**
     * Set current section
     */
    setSection: (section) => {
        set({ currentSection: section });
    },
    
    /**
     * Open modal
     */
    openModal: (modalId) => {
        const currentState = get();
        const newModalsOpen = new Set(currentState.modalsOpen);
        newModalsOpen.add(modalId);
        set({ 
            modalsOpen: newModalsOpen,
            hasOpenModal: newModalsOpen.size > 0
        });
    },
    
    /**
     * Close modal
     */
    closeModal: (modalId) => {
        const currentState = get();
        const newModalsOpen = new Set(currentState.modalsOpen);
        newModalsOpen.delete(modalId);
        set({ 
            modalsOpen: newModalsOpen,
            hasOpenModal: newModalsOpen.size > 0
        });
    },
    
    /**
     * Close all modals
     */
    closeAllModals: () => {
        set({ 
            modalsOpen: new Set(),
            hasOpenModal: false
        });
    },
    
    // ======================
    // LOADING STATE ACTIONS
    // ======================
    
    /**
     * Set loading state
     */
    setLoading: (key, loading = true) => {
        const currentState = get();
        const newLoadingStates = new Map(currentState.loadingStates);
        
        if (loading) {
            newLoadingStates.set(key, true);
        } else {
            newLoadingStates.delete(key);
        }
        
        set({ 
            loadingStates: newLoadingStates,
            isLoading: newLoadingStates.size > 0
        });
    },
    
    /**
     * Clear all loading states
     */
    clearAllLoading: () => {
        set({ 
            loadingStates: new Map(),
            isLoading: false
        });
    },
    
    // ======================
    // NOTIFICATION ACTIONS
    // ======================
    
    /**
     * Add notification
     */
    addNotification: (notification) => {
        const currentState = get();
        const newNotifications = [...currentState.notifications, {
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            ...notification
        }];
        set({ notifications: newNotifications });
    },
    
    /**
     * Remove notification
     */
    removeNotification: (notificationId) => {
        const currentState = get();
        const newNotifications = currentState.notifications.filter(n => n.id !== notificationId);
        set({ notifications: newNotifications });
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
    
    /**
     * Update global configuration
     */
    updateGlobalConfig: (updater) => {
        const currentState = get();
        const updatedConfig = typeof updater === 'function' 
            ? updater(currentState.globalConfig) 
            : updater;
        set({ globalConfig: updatedConfig });
    },
    
    // ======================
    // COMPUTED PROPERTIES (SELECTORS)
    // ======================
    
    // Project computed values
    hasProject: () => {
        const state = get();
        return state.currentProject !== null;
    },
    
    projectName: () => {
        const state = get();
        return state.currentProject?.project?.name || 'New Project';
    },
    
    featureCount: () => {
        const state = get();
        return state.currentProject?.features?.length || 0;
    },
    
    totalManDays: () => {
        const state = get();
        return state.currentProject?.features?.reduce((sum, feature) => sum + (feature.manDays || 0), 0) || 0;
    },
    
    lastSavedFormatted: () => {
        const state = get();
        if (!state.lastSavedTime) return 'Never';
        return state.lastSavedTime.toLocaleString();
    },
    
    // UI computed values
    hasOpenModal: () => {
        const state = get();
        return state.modalsOpen.size > 0;
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