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
    
    // Feature Manager UI State
    editingFeature: null,
    filteredFeatures: [],
    currentSort: { field: 'id', direction: 'asc' },
    
    // ======================
    // PHASES STATE
    // ======================
    phaseDefinitions: [
        {
            id: "functionalAnalysis",
            name: "Functional Analysis",
            description: "Business requirements analysis and functional specification",
            type: "analysis",
            defaultEffort: { G1: 100, G2: 0, TA: 20, PM: 50 },
            editable: true
        },
        {
            id: "technicalAnalysis",
            name: "Technical Analysis", 
            description: "Technical design and architecture specification",
            type: "analysis",
            defaultEffort: { G1: 0, G2: 100, TA: 60, PM: 20 },
            editable: true
        },
        {
            id: "development",
            name: "Development",
            description: "Implementation of features (calculated from features list)",
            type: "development", 
            defaultEffort: { G1: 0, G2: 100, TA: 40, PM: 20 },
            editable: true,
            calculated: true
        },
        {
            id: "integrationTests",
            name: "Integration Tests",
            description: "System integration and integration testing", 
            type: "testing",
            defaultEffort: { G1: 100, G2: 50, TA: 50, PM: 75 },
            editable: true
        },
        {
            id: "uatTests", 
            name: "UAT Tests",
            description: "User acceptance testing support and execution",
            type: "testing",
            defaultEffort: { G1: 50, G2: 50, TA: 40, PM: 75 },
            editable: true
        },
        {
            id: "consolidation",
            name: "Consolidation",
            description: "Final testing, bug fixing, and deployment preparation", 
            type: "testing",
            defaultEffort: { G1: 30, G2: 30, TA: 30, PM: 20 },
            editable: true
        },
        {
            id: "vapt",
            name: "VAPT", 
            description: "Vulnerability Assessment and Penetration Testing",
            type: "security",
            defaultEffort: { G1: 30, G2: 30, TA: 30, PM: 20 },
            editable: true
        },
        {
            id: "postGoLive", 
            name: "Post Go-Live Support",
            description: "Production support and monitoring after deployment",
            type: "support", 
            defaultEffort: { G1: 0, G2: 100, TA: 50, PM: 100 },
            editable: true
        }
    ],
    currentPhases: [],
    selectedSuppliers: { G1: null, G2: null, TA: null, PM: null },
    resourceRates: { G1: 450, G2: 380, TA: 420, PM: 500 },
    availableSuppliers: [],
    phasesTotals: { 
        manDays: 0, 
        manDaysByResource: { G1: 0, G2: 0, TA: 0, PM: 0 }, 
        costByResource: { G1: 0, G2: 0, TA: 0, PM: 0 } 
    },
    
    // ======================
    // NAVIGATION STATE (Pattern State/Actions/Dispatcher)
    // ======================
    currentSection: 'projects',
    navigationState: {
        preservedStates: new Map(),
        lastNavigationTime: null,
        componentStates: new Map() // Track React component initialization states
    },
    
    // ======================
    // NOTIFICATION STATE
    // ======================
    notifications: [],
    
    // ======================
    // CONFIGURATION STATE
    // ======================
    globalConfig: null,
    
    // ======================
    // FEATURE MODAL STATE
    // ======================
    featureModalOpen: false,
    featureModalEditingItem: null,
    duplicateSourceData: null, // Data from feature to duplicate
    
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
     * Navigate to page and section (updated for State/Actions pattern)
     */
    navigateTo: (page, section = null) => {
        const updates = { 
            currentPage: page,
            navigationState: {
                ...get().navigationState,
                lastNavigationTime: new Date().toISOString()
            }
        };
        if (section) {
            updates.currentSection = section;
        }
        set(updates);
    },
    
    /**
     * Set current section with state preservation logic
     */
    setCurrentSection: (section) => {
        const currentState = get();
        set({ 
            currentSection: section,
            navigationState: {
                ...currentState.navigationState,
                lastNavigationTime: new Date().toISOString()
            }
        });
    },
    
    /**
     * Legacy setSection for backward compatibility
     */
    setSection: (section) => {
        set({ currentSection: section });
    },

    /**
     * Preserve section state before navigation (Pattern State/Actions/Dispatcher)
     */
    preserveSectionState: (section, sectionState) => {
        const currentState = get();
        const newPreservedStates = new Map(currentState.navigationState.preservedStates);
        newPreservedStates.set(section, {
            ...sectionState,
            preservedAt: new Date().toISOString()
        });
        
        set({
            navigationState: {
                ...currentState.navigationState,
                preservedStates: newPreservedStates
            }
        });
        console.log(`State preserved for section: ${section}`);
    },

    /**
     * Restore preserved section state
     */
    restoreSectionState: (section) => {
        const currentState = get();
        const preservedState = currentState.navigationState.preservedStates.get(section);
        
        if (!preservedState) {
            console.log(`No preserved state found for section: ${section}`);
            return false;
        }

        // Restore section-specific state
        if (section === 'phases') {
            set({
                currentPhases: preservedState.currentPhases || currentState.currentPhases,
                selectedSuppliers: preservedState.selectedSuppliers || currentState.selectedSuppliers,
                resourceRates: preservedState.resourceRates || currentState.resourceRates,
                phasesTotals: preservedState.phasesTotals || currentState.phasesTotals
            });
        } else if (section === 'features') {
            set({
                filteredFeatures: preservedState.filteredFeatures || currentState.filteredFeatures,
                currentSort: preservedState.currentSort || currentState.currentSort,
                editingFeature: preservedState.editingFeature || currentState.editingFeature,
                featureModalOpen: preservedState.featureModalOpen || currentState.featureModalOpen,
                featureModalEditingItem: preservedState.featureModalEditingItem || currentState.featureModalEditingItem
            });
        }
        
        console.log(`State restored for section: ${section}`);
        return true;
    },

    /**
     * Clear preserved state for section
     */
    clearPreservedState: (section) => {
        const currentState = get();
        const newPreservedStates = new Map(currentState.navigationState.preservedStates);
        newPreservedStates.delete(section);
        
        set({
            navigationState: {
                ...currentState.navigationState,
                preservedStates: newPreservedStates
            }
        });
    },

    /**
     * Track React component initialization state
     */
    setComponentInitialized: (section, isInitialized) => {
        const currentState = get();
        const newComponentStates = new Map(currentState.navigationState.componentStates);
        newComponentStates.set(section, isInitialized);
        
        set({
            navigationState: {
                ...currentState.navigationState,
                componentStates: newComponentStates
            }
        });
    },

    /**
     * Check if component is initialized for section
     */
    isComponentInitialized: (section) => {
        const currentState = get();
        return currentState.navigationState.componentStates.get(section) || false;
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
    // FEATURE MANAGER UI ACTIONS
    // ======================
    
    /**
     * Set editing feature
     */
    setEditingFeature: (feature) => {
        set({ editingFeature: feature });
    },
    
    /**
     * Set filtered features
     */
    setFilteredFeatures: (features) => {
        set({ filteredFeatures: features });
    },
    
    /**
     * Set sort order
     */
    setSortOrder: (field, direction = 'asc') => {
        set({ currentSort: { field, direction } });
    },
    
    /**
     * Toggle sort direction for field
     */
    toggleSortDirection: (field) => {
        const currentState = get();
        const currentSort = currentState.currentSort;
        
        if (currentSort.field === field) {
            // Same field, toggle direction
            const newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
            set({ currentSort: { field, direction: newDirection } });
        } else {
            // Different field, set to ascending
            set({ currentSort: { field, direction: 'asc' } });
        }
    },
    
    // ======================
    // PHASES ACTIONS
    // ======================
    
    /**
     * Initialize phases from project data or defaults
     */
    initializePhases: () => {
        const currentState = get();
        const currentProject = currentState.currentProject;
        
        if (currentProject && currentProject.phases) {
            console.log('Loading existing phases data from project');
            const existingPhases = currentProject.phases;
            
            const currentPhases = currentState.phaseDefinitions.map(def => {
                const existing = existingPhases[def.id] || {};
                return {
                    ...def,
                    manDays: existing.manDays !== undefined ? existing.manDays : 0,
                    effort: existing.effort || { ...def.defaultEffort },
                    assignedResources: existing.assignedResources || [],
                    cost: existing.cost || 0,
                    lastModified: existing.lastModified || new Date().toISOString()
                };
            });
            
            set({ 
                currentPhases: currentPhases,
                selectedSuppliers: existingPhases.selectedSuppliers || { G1: null, G2: null, TA: null, PM: null }
            });
        } else {
            console.log('No existing phases data found, using defaults');
            const defaultPhases = currentState.phaseDefinitions.map(def => ({
                ...def,
                manDays: 0,
                effort: { ...def.defaultEffort },
                assignedResources: [],
                cost: 0,
                lastModified: new Date().toISOString()
            }));
            
            set({ 
                currentPhases: defaultPhases,
                selectedSuppliers: { G1: null, G2: null, TA: null, PM: null }
            });
        }
    },
    
    /**
     * Update phase man days
     */
    updatePhaseManDays: (phaseId, manDays) => {
        const currentState = get();
        const updatedPhases = currentState.currentPhases.map(phase => 
            phase.id === phaseId ? { 
                ...phase, 
                manDays: parseFloat(manDays) || 0,
                lastModified: new Date().toISOString()
            } : phase
        );
        
        set({ currentPhases: updatedPhases });
    },
    
    /**
     * Update phase effort distribution
     */
    updatePhaseEffort: (phaseId, resourceType, percentage) => {
        const currentState = get();
        const updatedPhases = currentState.currentPhases.map(phase => 
            phase.id === phaseId ? { 
                ...phase, 
                effort: {
                    ...phase.effort,
                    [resourceType]: parseFloat(percentage) || 0
                },
                lastModified: new Date().toISOString()
            } : phase
        );
        
        set({ currentPhases: updatedPhases });
    },
    
    /**
     * Set selected supplier for resource type
     */
    setSelectedSupplier: (resourceType, supplierId) => {
        const currentState = get();
        const updatedSuppliers = {
            ...currentState.selectedSuppliers,
            [resourceType]: supplierId
        };
        
        // Update resource rate from supplier
        if (supplierId && currentState.availableSuppliers.length > 0) {
            const supplier = currentState.availableSuppliers.find(s => s.id === supplierId);
            if (supplier) {
                const updatedRates = {
                    ...currentState.resourceRates,
                    [resourceType]: supplier.realRate || supplier.officialRate || currentState.resourceRates[resourceType]
                };
                set({ 
                    selectedSuppliers: updatedSuppliers,
                    resourceRates: updatedRates
                });
                return;
            }
        }
        
        set({ selectedSuppliers: updatedSuppliers });
    },
    
    /**
     * Load available suppliers from configuration
     */
    loadAvailableSuppliers: (suppliers) => {
        set({ availableSuppliers: suppliers || [] });
    },
    
    /**
     * Calculate development phase man days from features + coverage
     */
    calculateDevelopmentPhase: () => {
        const currentState = get();
        const currentProject = currentState.currentProject;
        
        if (!currentProject) return;
        
        const featuresTotal = (currentProject.features || []).reduce((sum, feature) => {
            return sum + (parseFloat(feature.manDays) || 0);
        }, 0);
        
        const coverageMDs = currentProject.coverage?.manDays || 0;
        const totalDevelopmentMDs = featuresTotal + coverageMDs;
        
        const updatedPhases = currentState.currentPhases.map(phase => 
            phase.id === 'development' ? { 
                ...phase, 
                manDays: Math.round(totalDevelopmentMDs * 10) / 10,
                lastModified: new Date().toISOString()
            } : phase
        );
        
        set({ currentPhases: updatedPhases });
    },
    
    /**
     * Calculate phases totals
     */
    calculatePhasesTotals: () => {
        const currentState = get();
        const { currentPhases, resourceRates, currentProject } = currentState;
        
        let totals = {
            manDays: 0,
            manDaysByResource: { G1: 0, G2: 0, TA: 0, PM: 0 },
            costByResource: { G1: 0, G2: 0, TA: 0, PM: 0 }
        };
        
        currentPhases.forEach(phase => {
            const effort = phase.effort;
            const manDaysByResource = {
                G1: (phase.manDays * effort.G1) / 100,
                G2: (phase.manDays * effort.G2) / 100,
                TA: (phase.manDays * effort.TA) / 100,
                PM: (phase.manDays * effort.PM) / 100
            };
            
            // Special calculation for Development G2 cost
            let costByResource;
            if (phase.id === 'development' && currentProject?.features) {
                const g2EffortPercent = effort.G2 / 100;
                let g2Cost = 0;
                
                currentProject.features.forEach(feature => {
                    const featureManDays = parseFloat(feature.manDays) || 0;
                    const featureSupplier = currentState.availableSuppliers.find(s => s.id === feature.supplier);
                    const featureRate = featureSupplier ? (featureSupplier.realRate || featureSupplier.officialRate || 0) : 0;
                    g2Cost += featureManDays * featureRate * g2EffortPercent;
                });
                
                costByResource = {
                    G1: Math.round(manDaysByResource.G1 * resourceRates.G1),
                    G2: Math.round(g2Cost),
                    TA: Math.round(manDaysByResource.TA * resourceRates.TA),
                    PM: Math.round(manDaysByResource.PM * resourceRates.PM)
                };
            } else {
                costByResource = {
                    G1: Math.round(manDaysByResource.G1 * resourceRates.G1),
                    G2: Math.round(manDaysByResource.G2 * resourceRates.G2),
                    TA: Math.round(manDaysByResource.TA * resourceRates.TA),
                    PM: Math.round(manDaysByResource.PM * resourceRates.PM)
                };
            }
            
            totals.manDays += phase.manDays;
            totals.manDaysByResource.G1 += manDaysByResource.G1;
            totals.manDaysByResource.G2 += manDaysByResource.G2;
            totals.manDaysByResource.TA += manDaysByResource.TA;
            totals.manDaysByResource.PM += manDaysByResource.PM;
            totals.costByResource.G1 += costByResource.G1;
            totals.costByResource.G2 += costByResource.G2;
            totals.costByResource.TA += costByResource.TA;
            totals.costByResource.PM += costByResource.PM;
        });
        
        set({ phasesTotals: totals });
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
    // FEATURE MODAL ACTIONS
    // ======================
    
    /**
     * Open feature modal for adding or editing
     */
    openFeatureModal: (feature = null) => {
        set({ 
            featureModalOpen: true,
            featureModalEditingItem: feature
        });
    },
    
    /**
     * Close feature modal
     */
    closeFeatureModal: () => {
        set({ 
            featureModalOpen: false,
            featureModalEditingItem: null,
            duplicateSourceData: null
        });
    },
    
    /**
     * Set duplicate source data for feature duplication
     */
    setDuplicateData: (data) => {
        set({ duplicateSourceData: data });
    },
    
    /**
     * Clear duplicate source data
     */
    clearDuplicateData: () => {
        set({ duplicateSourceData: null });
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
    },
    
    // Feature Manager computed values
    isEditingFeature: () => {
        const state = get();
        return state.editingFeature !== null;
    },
    
    filteredFeatureCount: () => {
        const state = get();
        return state.filteredFeatures.length;
    },
    
    sortedFeatures: () => {
        const state = get();
        const { filteredFeatures, currentSort } = state;
        
        if (!filteredFeatures.length) return [];
        
        return [...filteredFeatures].sort((a, b) => {
            const aValue = a[currentSort.field] || '';
            const bValue = b[currentSort.field] || '';
            
            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            else if (aValue > bValue) comparison = 1;
            
            return currentSort.direction === 'desc' ? -comparison : comparison;
        });
    }
}));

// ======================
// WINDOW TITLE SUBSCRIPTION (State/Actions/Dispatcher Pattern)
// ======================

/**
 * Subscribe to store changes to update window title and UI elements
 * Following State/Actions/Dispatcher pattern: Store → Actions → Business Logic
 */
const setupProjectSubscription = () => {
    let previousProject = null;
    
    appStore.subscribe((state) => {
        const currentProject = state.currentProject;
        
        // Only update if project actually changed
        if (currentProject !== previousProject) {
            previousProject = currentProject;
            
            // Update UI element for project name in title bar
            const projectNameEl = document.getElementById('title-project-name');
            if (projectNameEl) {
                const projectName = currentProject?.project?.name || 'New Project';
                projectNameEl.textContent = projectName;
                console.log(`📋 UI updated: Project name = "${projectName}"`);
            }
            
            // Dispatch to Actions layer for window title (following State/Actions/Dispatcher)
            if (window.projectActions) {
                if (currentProject) {
                    window.projectActions.updateWindowTitle(currentProject);
                } else {
                    window.projectActions.resetWindowTitle();
                }
            }
        }
    });
};

// Initialize subscription when projectActions becomes available
const waitForProjectActions = () => {
    if (window.projectActions) {
        setupProjectSubscription();
        console.log('✅ Project subscription initialized (UI + Window Title)');
    } else {
        // Retry after a short delay
        setTimeout(waitForProjectActions, 100);
    }
};

// Start watching for projectActions availability
waitForProjectActions();

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