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
    availableSuppliers: [], // This will be populated from globalConfig.vendors
    selectedPhaseResources: { G1: null, G2: null, TA: null, PM: null },
    // Working Package resource selections (parallel to selectedPhaseResources for phases)
    workingPackageResources: {
        gto: { primaryResource: null, secondaryResource: null },
        gds: { primaryResource: null, secondaryResource: null }
    },
    rateSpecModal: {
        isOpen: false,
        role: null,
        mode: null, // null | 'phase' | 'wp'
    },
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
    // RESOURCE ALLOCATIONS STATE (GLOBAL - across all projects)
    // ======================
    resourceAllocations: [], // Global allocations from capacity/allocations.json

    // ======================
    // FEATURE MODAL STATE
    // ======================
    featureModalOpen: false,
    featureModalEditingItem: null,
    duplicateSourceData: null, // Data from feature to duplicate

    // ======================
    // CALCULATIONS STATE
    // ======================
    calculationsData: {
        // Mode-specific storage with separate overrides
        featureBased: {
            vendorCosts: [],
            kpiData: null,
            finalMDsOverrides: {} // Overrides SOLO per Feature Based mode
        },
        workingPackage: {
            vendorCosts: [],
            kpiData: null,
            entries: [],
            summary: { gtoTotal: 0, gdsTotal: 0, projectTotal: 0 },
            calculated: { gto: {}, gds: {} },
            finalMDsOverrides: {} // Overrides SOLO per Working Package mode
        },
        // Shared settings
        filters: { vendor: 'all', role: 'all', category: 'all' },
        version: 0 // Version counter to force React re-renders
    },

    // ======================
    // ASSUMPTIONS STATE (State/Actions/Dispatcher Pattern)
    // ======================
    assumptionsData: {
        filters: { search: '', type: '', impact: '' }, // Filters for assumptions table
        modalState: {
            isOpen: false,
            mode: 'add', // 'add' | 'edit'
            selectedAssumption: null
        }
    },

    // ======================
    // VERSION HISTORY STATE (State/Actions/Dispatcher Pattern)
    // ======================
    versionHistoryData: {
        filters: { dateRange: '', reason: '' }, // Filters for version history table
        modalStates: {
            createModal: {
                isOpen: false,
                selectedVersion: null
            },
            compareModal: {
                isOpen: false,
                selectedVersion: null
            },
            restoreModal: {
                isOpen: false,
                selectedVersion: null
            }
        },
        isLoading: false
    },

    // ======================
    // TICKET DASHBOARD STATE (State/Actions/Dispatcher Pattern)
    // ======================
    ticketData: [], // Raw ticket data from CSV
    dashboardMetrics: null, // Calculated KPI metrics
    operatorMetrics: [], // Performance metrics per operator
    dashboardAlerts: [], // Critical/warning alerts
    selectedOperator: null, // Currently selected operator for drill-down
    operatorDetails: null, // Detailed metrics for selected operator
    timeFilter: null, // Current time period filter
    additionalFilters: {}, // Priority, state, operator filters
    ticketDashboardError: null, // Error state

    // ======================
    // PROJECT ACTIONS
    // ======================

    /**
     * Set the current project
     * 🔧 FIX: Atomic reset of ALL derived states to prevent data leakage between projects
     */
    setProject: (project) => {
        console.log('🔄 Store: setProject called with project =', project ? 'EXISTS' : 'NULL');

        // 🔧 CRITICAL FIX: Ensure approvalStatus is initialized when loading project
        if (project && project.project && !project.project.approvalStatus) {
            project.project.approvalStatus = "Pending Approval"; // Default for backward compatibility
            console.log('✅ Store: Initialized missing approvalStatus to "Pending Approval"');
        }

        // 🔧 CRITICAL FIX: Atomic reset of ALL derived states
        // This prevents data contamination when switching between projects
        const cleanState = {
            // Core project state
            currentProject: project,
            isDirty: false,
            lastSavedTime: project?.project?.lastModified ? new Date(project.project.lastModified) : null,

            // 🧹 RESET: Phases cache (will be reinitialized from new project)
            currentPhases: [],
            selectedPhaseResources: { G1: null, G2: null, TA: null, PM: null },
            // 🧹 RESET: Working Package resources (will be populated from project data)
            workingPackageResources: {
                gto: { primaryResource: null, secondaryResource: null },
                gds: { primaryResource: null, secondaryResource: null }
            },
            resourceRates: { G1: 450, G2: 380, TA: 420, PM: 500 }, // Default rates
            phasesTotals: {
                manDays: 0,
                manDaysByResource: { G1: 0, G2: 0, TA: 0, PM: 0 },
                costByResource: { G1: 0, G2: 0, TA: 0, PM: 0 }
            },

            // 🧹 RESET: Calculations cache (will be recalculated for new project)
            // 🔧 STRUCTURE FIX: Initialize with separate featureBased and workingPackage sections
            calculationsData: {
                featureBased: {
                    vendorCosts: [],
                    kpiData: null,
                    finalMDsOverrides: project?.featureBasedOverrides || project?.finalMDsOverrides || {} // Migrate legacy overrides
                },
                workingPackage: {
                    vendorCosts: [],
                    kpiData: null,
                    entries: [],
                    summary: { gtoTotal: 0, gdsTotal: 0, projectTotal: 0 },
                    calculated: { gto: {}, gds: {} },
                    finalMDsOverrides: project?.workingPackageOverrides || {}
                },
                filters: { vendor: 'all', role: 'all', category: 'all' },
                version: 0
            },

            // 🧹 RESET: Assumptions UI state
            assumptionsData: {
                filters: { search: '', type: '', impact: '' },
                modalState: { isOpen: false, mode: 'add', selectedAssumption: null }
            },

            // 🧹 RESET: Version History UI state
            versionHistoryData: {
                filters: { dateRange: '', reason: '' },
                modalStates: {
                    createModal: { isOpen: false, selectedVersion: null },
                    compareModal: { isOpen: false, selectedVersion: null },
                    restoreModal: { isOpen: false, selectedVersion: null }
                },
                isLoading: false
            },

            // 🧹 RESET: Feature Manager UI state
            editingFeature: null,
            filteredFeatures: [],
            currentSort: { field: 'id', direction: 'asc' },
            featureModalOpen: false,
            featureModalEditingItem: null,
            duplicateSourceData: null,

            // 🧹 RESET: Navigation state (preservedStates from old project)
            // CRITICAL FIX: Clear preserved section states to prevent old phase data
            // from being restored when navigating to phases/features pages
            navigationState: {
                preservedStates: new Map(),
                lastNavigationTime: null,
                componentStates: new Map()
            }
        };

        // Apply all resets atomically (single set() call to prevent race conditions)
        set(cleanState);

        console.log('✅ Store: All derived states reset atomically for clean project switch');
        console.log('🧹 DEBUG: Preserved navigation states cleared ( Map(0) )');

        // Re-initialize phases from new project data (if project exists)
        // CRITICAL FIX: Call initializePhases synchronously to prevent race conditions
        // with clearAllCalculationsCache which was calling it before setProject completed
        if (project) {
            const state = get();
            // DEBUG: Verify the state is correct before calling initializePhases
            console.log('🔍 DEBUG: setProject - currentProject in state after get():', state.currentProject?.project?.id);
            console.log('🔍 DEBUG: setProject - features count in state:', state.currentProject?.features?.length);
            console.log('🔍 DEBUG: setProject - coverage in state:', state.currentProject?.coverage);

            // Verify state matches what we set
            if (state.currentProject !== project) {
                console.warn('⚠️ DEBUG: State mismatch! State has different project than what was set');
                console.warn('   Set project ID:', project?.project?.id);
                console.warn('   State project ID:', state.currentProject?.project?.id);
            }

            // CRITICAL FIX: Pass project directly to ensure correct data is used
            // instead of relying on get() which may return stale state due to race conditions
            state.initializePhases(project);
            console.log('✅ Store: Phases reinitialized from new project data');

            // 🔧 CRITICAL FIX: Load workingPackageResources from project if present
            // This preserves the vendor + rate details (jobCluster, seniority, location, deliveryModel)
            // when loading a saved project
            if (project.workingPackageResources) {
                console.log('🔧 Loading workingPackageResources from project:', project.workingPackageResources);
                // Update workingPackageResources in store to match project data
                set({ workingPackageResources: project.workingPackageResources });
            } else {
                console.log('ℹ️ No workingPackageResources found in project, using defaults');
            }
        }

        // CRITICAL FALLBACK: Force navigation manager to update menu state
        // This ensures menu items are enabled even if subscription timing fails
        setTimeout(() => {
            console.log('🔧 Store: Force triggering navigation menu update after setProject');
            if (window.app?.navigationManager) {
                console.log('🔄 Store: Calling navigation manager updateProjectSubSections directly');
                window.app.navigationManager.updateProjectSubSections();
                window.app.navigationManager.updateProjectStatus();
            } else if (window.forceUpdateMenu) {
                console.log('🔄 Store: Using global forceUpdateMenu fallback');
                window.forceUpdateMenu();
            } else {
                console.warn('❌ Store: No navigation manager or fallback available for menu update');
            }
        }, 100);
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


        // DEFENSIVE: If phases only contains selectedPhaseResources, preserve existing phases
        const currentPhases = currentState.currentProject.phases || {};
        const hasOnlyselectedPhaseResources = phases &&
              Object.keys(phases).length === 1 &&
              phases.selectedPhaseResources &&
              !phases.functionalAnalysis;

        let mergedPhases;
        if (hasOnlyselectedPhaseResources && Object.keys(currentPhases).length > 1) {
            console.log('⚠️ WARNING: Preventing phase data loss - preserving existing phases');
            mergedPhases = {
                ...currentPhases,
                selectedPhaseResources: phases.selectedPhaseResources
            };
        } else {
            mergedPhases = phases;
        }

        const updatedProject = {
            ...currentState.currentProject,
            phases: mergedPhases
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
     * Update generic project field
     */
    updateProjectField: (field, value) => {
        const currentState = get();
        if (!currentState.currentProject) return;

        const updatedProject = {
            ...currentState.currentProject,
            [field]: value
        };

        set({
            currentProject: updatedProject,
            isDirty: true
        });
    },

    /**
     * Update Working Package resources (for persistence in project JSON)
     * This is separate from workingPackageData to keep phases/featureBased segregated from Working Package
     */
    updateWorkingPackageResources: (resources) => {
        const currentState = get();
        if (!currentState.currentProject) return;

        const updatedProject = {
            ...currentState.currentProject,
            workingPackageResources: resources
        };

        set({
            currentProject: updatedProject,
            isDirty: true
        });
    },

    /**
     * Update working package data
     */
    updateWorkingPackageData: (data) => {
        const currentState = get();
        if (!currentState.currentProject) return;

        const currentWP = currentState.currentProject.workingPackageData || {
            enabled: false,
            gto: {
                enabled: false,
                totalAmount: 0,
                primaryVendorId: null,
                secondaryVendorId: null,
                secondaryPercentage: 35
            },
            gds: {
                enabled: false,
                totalAmount: 0,
                primaryVendorId: null,
                secondaryVendorId: null,
                secondaryPercentage: 35
            }
        };

        const updatedProject = {
            ...currentState.currentProject,
            workingPackageData: {
                ...currentWP,
                ...data
            }
        };

        set({
            currentProject: updatedProject,
            isDirty: true
        });
    },

    /**
     * Set working package enabled state
     */
    setWorkingPackageEnabled: (enabled) => {
        const currentState = get();
        if (!currentState.currentProject) return;

        const currentWP = currentState.currentProject.workingPackageData || {
            enabled: false,
            gto: {
                enabled: false,
                totalAmount: 0,
                primaryVendorId: null,
                secondaryVendorId: null,
                secondaryPercentage: 35
            },
            gds: {
                enabled: false,
                totalAmount: 0,
                primaryVendorId: null,
                secondaryVendorId: null,
                secondaryPercentage: 35
            }
        };

        const updatedProject = {
            ...currentState.currentProject,
            workingPackageData: {
                ...currentWP,
                enabled
            }
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

    /**
     * Set project approval status
     * Validates status is either "Approved" or "Pending Approval"
     */
    setProjectApprovalStatus: (status) => {
        const validStatuses = ["Approved", "Pending Approval"];

        if (!validStatuses.includes(status)) {
            console.error(`Invalid approval status "${status}". Must be "Approved" or "Pending Approval".`);
            return;
        }

        const currentState = get();
        if (!currentState.currentProject) {
            console.error('Cannot update approval status: No project loaded');
            return;
        }

        const updatedProject = {
            ...currentState.currentProject,
            project: {
                ...currentState.currentProject.project,
                approvalStatus: status,
                lastModified: new Date().toISOString()
            }
        };

        set({
            currentProject: updatedProject,
            isDirty: true
        });

        console.log(`✅ Store: Project approval status updated to "${status}"`);
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
     * CRITICAL FIX: Only restores if the preserved state belongs to the current project
     * This prevents data leakage when switching between projects
     */
    restoreSectionState: (section) => {
        const currentState = get();
        const preservedState = currentState.navigationState.preservedStates.get(section);

        if (!preservedState) {
            console.log(`No preserved state found for section: ${section}`);
            return false;
        }

        // CRITICAL FIX: Check if preserved state belongs to current project
        const currentProjectId = currentState.currentProject?.project?.id;
        const preservedProjectId = preservedState._projectId;

        if (preservedProjectId && preservedProjectId !== currentProjectId) {
            console.warn(`⚠️ SKIPPING restore for ${section}: Preserved state belongs to different project!`);
            console.warn(`   Preserved project: ${preservedProjectId}`);
            console.warn(`   Current project: ${currentProjectId}`);
            console.log(`   State will be reinitialized from project data instead.`);
            return false;
        }

        // Restore section-specific state
        if (section === 'phases') {
            set({
                currentPhases: preservedState.currentPhases || currentState.currentPhases,
                selectedPhaseResources: preservedState.selectedPhaseResources || currentState.selectedPhaseResources,
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

        console.log(`✅ State restored for section: ${section} (project: ${preservedProjectId})`);
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

    updateSelectedPhaseResource: (resourceType, resourceDetails) => {
        const state = get();
        const { selectedPhaseResources } = state;
        const existingResource = selectedPhaseResources[resourceType] || {};

        // Merge new resource with existing resource to preserve fields that weren't changed
        const mergedResource = {
            ...existingResource,
            ...resourceDetails
        };

        // Clean up any undefined values that might have been carried over from existing resource
        Object.keys(mergedResource).forEach((key) => {
            if (mergedResource[key] === undefined) {
                delete mergedResource[key];
            }
        });

        const newSelectedResources = {
            ...selectedPhaseResources,
            [resourceType]: mergedResource,
        };

        set({
            selectedPhaseResources: newSelectedResources,
        });
    },

    /**
     * Update Working Package resource selection (vendor + rate details)
     * @param {string} category - 'gto' or 'gds'
     * @param {string} resourceType - 'primaryResource' or 'secondaryResource'
     * @param {object} resourceDetails - Full resource config (vendorId, jobCluster, seniority, location, deliveryModel)
     */
    updateWorkingPackageResource: (category, resourceType, resourceDetails) => {
        const state = get();
        const { workingPackageResources } = state;
        const currentCategory = workingPackageResources[category] || {};
        const existingResource = currentCategory[resourceType] || {};

        // Merge new resource with existing resource to preserve fields that weren't changed
        const mergedResource = {
            ...existingResource,
            ...resourceDetails
        };

        // Clean up any undefined values that might have been carried over from existing resource
        Object.keys(mergedResource).forEach((key) => {
            if (mergedResource[key] === undefined) {
                delete mergedResource[key];
            }
        });

        const newWorkingPackageResources = {
            ...workingPackageResources,
            [category]: {
                ...currentCategory,
                [resourceType]: mergedResource
            }
        };

        set({
            workingPackageResources: newWorkingPackageResources,
        });
    },

    openRateSpecModal: (role, mode = 'phase') => {
        set({ rateSpecModal: { isOpen: true, role, mode } });
    },

    closeRateSpecModal: () => {
        set({ rateSpecModal: { isOpen: false, role: null, mode: null } });
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
     * @param {Object} projectParam - Optional project data to use instead of get().currentProject
     *                              This fixes race conditions where get() returns stale state
     */
    initializePhases: (projectParam = null) => {
        const currentState = get();
        // CRITICAL FIX: Use passed project parameter if available, otherwise fall back to state
        // This ensures correct project data even when get() returns stale state
        const currentProject = projectParam || currentState.currentProject;

        // DEBUG: Log project identification
        console.log('🔧 initializePhases called for project:', currentProject?.project?.id || 'NULL', currentProject?.project?.name || '');
        if (projectParam) {
            console.log('🔧 initializePhases: Using PASSED project parameter (avoiding potential stale get())');
        } else {
            console.log('🔧 initializePhases: Using project from get() state');
        }

        // CRITICAL FIX: Always reset currentPhases first to prevent stale data
        // This ensures no old phase data persists when switching projects
        set({
            currentPhases: []
        });

        if (currentProject && currentProject.phases) {
            console.log('Loading existing phases data from project');
            const existingPhases = currentProject.phases;

            // DEBUG: Log what we're loading from JSON
            console.log('🔍 Phase data from JSON:');
            Object.entries(existingPhases).forEach(([key, phase]) => {
                if (key !== 'selectedSuppliers') {
                    console.log(`  ${key}: ${phase.manDays} man days`);
                }
            });

            const currentPhases = currentState.phaseDefinitions.map(def => {
                const existing = existingPhases[def.id] || {};
                const manDays = existing.manDays !== undefined ? existing.manDays : 0;

                // DEBUG: Log mapping details
                console.log(`  Mapping ${def.id}: existing=${existing.manDays}, using=${manDays}`);

                return {
                    ...def,
                    manDays: manDays,
                    effort: existing.effort || { ...def.defaultEffort },
                    assignedResources: existing.assignedResources || [],
                    cost: existing.cost || 0,
                    lastModified: existing.lastModified || new Date().toISOString()
                };
            });

            // DEBUG: Log what we're setting in the store
            console.log('🔍 Setting phases in store:');
            currentPhases.forEach(phase => {
                console.log(`  ${phase.id}: ${phase.manDays} man days`);
            });

            // MIGRATION: Handle loading old projects with selectedSuppliers
            let resources = existingPhases.selectedPhaseResources;
            if (existingPhases.selectedSuppliers && !resources) {
                console.log('Migrating old selectedSuppliers to new selectedPhaseResources structure...');
                resources = {};
                for (const role in existingPhases.selectedSuppliers) {
                    const vendorId = existingPhases.selectedSuppliers[role];
                    resources[role] = vendorId ? { vendorId } : null;
                }
            }

            set({
                currentPhases: currentPhases,
                selectedPhaseResources: resources || { G1: null, G2: null, TA: null, PM: null }
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
                selectedPhaseResources: { G1: null, G2: null, TA: null, PM: null }
            });
        }

        // CRITICAL FIX: Recalculate development phase from features + coverage after initialization
        // This ensures the development phase manDays is always derived from current features data
        // Use setTimeout to ensure state is fully updated before calculation
        // CRITICAL FIX: Capture correctProject in closure to avoid stale state from get()
        const correctProject = currentProject;
        setTimeout(() => {
            const state = get();
            const project = state.currentProject;
            // CRITICAL FIX: Verify the project from get() matches what we expect
            if (project?.project?.id !== correctProject?.project?.id) {
                console.warn('⚠️ setTimeout: Project mismatch detected!');
                console.warn('   Expected:', correctProject?.project?.id);
                console.warn('   Got from get():', project?.project?.id);
                console.warn('   Using correct project from closure');
            }
            console.log('🔧 setTimeout: Auto-recalculating development phase...');
            console.log('🔧 setTimeout: Current project:', correctProject?.project?.id || 'NULL', correctProject?.project?.name || '');
            console.log('🔧 setTimeout: Features count:', correctProject?.features?.length || 0);
            console.log('🔧 setTimeout: Coverage:', correctProject?.coverage || 0);
            if (state.calculateDevelopmentPhase) {
                // CRITICAL FIX: Pass the correct project to calculateDevelopmentPhase
                // to ensure it uses the right data
                state.calculateDevelopmentPhase(correctProject);
            }
        }, 0);
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
     * Load vendors from configuration
     */
    loadAvailableSuppliers: (suppliers) => {
        set({ availableSuppliers: suppliers || [] });
    },

    /**
     * Calculate development phase man days from features + coverage
     * @param {Object} projectParam - Optional project data to use instead of get().currentProject
     *                              This fixes race conditions where get() returns stale state
     */
    calculateDevelopmentPhase: (projectParam = null) => {
        const currentState = get();
        // CRITICAL FIX: Use passed project parameter if available, otherwise fall back to state
        const currentProject = projectParam || currentState.currentProject;

        if (!currentProject) return;

        if (projectParam) {
            console.log('🔧 calculateDevelopmentPhase: Using PASSED project parameter');
            console.log('🔧 Features count in passed project:', currentProject.features?.length || 0);
            console.log('🔧 Coverage in passed project:', currentProject.coverage || 0);
        }

        const featuresTotal = (currentProject.features || []).reduce((sum, feature) => {
            return sum + (parseFloat(feature.manDays) || 0);
        }, 0);

        const coverageMDs = currentProject.coverage || 0;
        const totalDevelopmentMDs = featuresTotal + coverageMDs;

        // Fix: Only update development phase if the calculated value is different from stored value
        // This prevents unnecessary overwrites of manually-set development values
        const storedDevelopmentMDs = currentProject.phases?.development?.manDays || 0;
        const shouldUpdate = Math.abs(totalDevelopmentMDs - storedDevelopmentMDs) > 0.1;

        if (!shouldUpdate) {
            console.log('Development phase calculation skipped - values match (stored:', storedDevelopmentMDs, 'calculated:', totalDevelopmentMDs, ')');
            return;
        }

        console.log('🔍 Development phase calculation:');
        console.log('  Features total:', featuresTotal);
        console.log('  Coverage MDs:', coverageMDs);
        console.log('  Total calculated:', totalDevelopmentMDs);
        console.log('  Stored in JSON:', storedDevelopmentMDs);

        const roundedDevelopmentMDs = Math.round(totalDevelopmentMDs * 10) / 10;
        const now = new Date().toISOString();

        // Update currentPhases array
        const updatedPhases = currentState.currentPhases.map(phase =>
            phase.id === 'development' ? {
                ...phase,
                manDays: roundedDevelopmentMDs,
                lastModified: now
            } : phase
        );

        // Also sync to currentProject.phases for persistence in saved JSON
        // CRITICAL FIX: Use currentProject (which may be passed param) instead of currentState.currentProject
        const updatedProject = {
            ...currentProject,
            phases: {
                ...currentProject.phases,
                development: {
                    ...currentProject.phases?.development,
                    manDays: roundedDevelopmentMDs,
                    lastModified: now
                }
            }
        };

        set({
            currentPhases: updatedPhases,
            currentProject: updatedProject
        });
    },

    /**
     * Calculate phases totals
     */
    calculatePhasesTotals: () => {
        const currentState = get();
        const { currentPhases, currentProject } = currentState;

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

            // Utilize the dynamic cost calculation from PhasesActions for accurate totals
            // window.phasesActions is globally available as it's exported in PhasesActions.ts
            const dynamicCosts = window.phasesActions.calculateCostByResourceForPhase(phase);
            const costByResource = {
                G1: dynamicCosts.G1,
                G2: dynamicCosts.G2,
                TA: dynamicCosts.TA,
                PM: dynamicCosts.PM
            };

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
     * Add notification with optional deduplication
     */
    addNotification: (notification) => {
        const currentState = get();

        console.log(`[Store] addNotification called: "${notification.message}" (${notification.type}), current count: ${currentState.notifications.length}`);

        // Check for duplicates (same message and type)
        const isDuplicate = currentState.notifications.some(
            n => n.message === notification.message && n.type === notification.type
        );

        if (isDuplicate) {
            console.log('[Store] ⚠️ Duplicate notification suppressed:', notification.message);
            return; // Don't add duplicate
        }

        const newNotifications = [...currentState.notifications, {
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            ...notification
        }];
        console.log(`[Store] Adding notification, new count: ${newNotifications.length}`);
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
    // RESOURCE ALLOCATIONS ACTIONS (GLOBAL)
    // ======================

    /**
     * Set all resource allocations (loaded from allocations.json)
     */
    setResourceAllocations: (allocations) => {
        set({ resourceAllocations: allocations || [] });
    },

    /**
     * Add resource allocation
     */
    addResourceAllocation: (allocation) => {
        const currentState = get();
        const updatedAllocations = [...currentState.resourceAllocations, allocation];
        set({ resourceAllocations: updatedAllocations });
    },

    /**
     * Update resource allocation
     */
    updateResourceAllocation: (id, updatedData) => {
        const currentState = get();
        const updatedAllocations = currentState.resourceAllocations.map(allocation =>
            allocation.id === id ? { ...allocation, ...updatedData, lastModified: new Date().toISOString() } : allocation
        );
        set({ resourceAllocations: updatedAllocations });
    },

    /**
     * Delete resource allocation
     */
    deleteResourceAllocation: (id) => {
        const currentState = get();
        const updatedAllocations = currentState.resourceAllocations.filter(allocation => allocation.id !== id);
        set({ resourceAllocations: updatedAllocations });
    },

    /**
     * Get allocations for a team member
     */
    getAllocationsForMember: (teamMemberId) => {
        const state = get();
        return state.resourceAllocations.filter(a => a.teamMemberId === teamMemberId);
    },

    /**
     * Get allocations for a project
     */
    getAllocationsForProject: (projectId) => {
        const state = get();
        return state.resourceAllocations.filter(a => a.projectId === projectId);
    },

    /**
     * Get allocations for a specific month
     */
    getAllocationsForMonth: (teamMemberId, month) => {
        const state = get();
        return state.resourceAllocations.filter(a =>
            a.teamMemberId === teamMemberId &&
            a.monthlyAllocations &&
            a.monthlyAllocations[month]
        );
    },

    /**
     * Calculate total allocated MDs for member in month (across all projects)
     */
    getTotalAllocatedMDs: (teamMemberId, month) => {
        const state = get();
        return state.resourceAllocations.reduce((total, allocation) => {
            if (allocation.teamMemberId === teamMemberId &&
                allocation.monthlyAllocations &&
                allocation.monthlyAllocations[month]) {
                return total + (allocation.monthlyAllocations[month].planned || 0);
            }
            return total;
        }, 0);
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

    getFormattedPhaseResourceDisplay: (role) => {
        const state = get();
        const { selectedPhaseResources, globalConfig } = state;
        
        if (!globalConfig || !selectedPhaseResources) {
            return 'Not Specified';
        }

        const resource = selectedPhaseResources[role];

        if (!resource || !resource.vendorId) {
            return 'Not Specified';
        }

        const vendor = globalConfig.vendors.find((v) => v.id === resource.vendorId);
        if (!vendor) return 'Invalid Vendor';

        if (resource.jobCluster && resource.seniority && resource.location && resource.deliveryModel) {
            const configManager = window.app.configManager;
            const rateDetails = configManager.getRate(resource);
            const rate = rateDetails.realRate || 0;
            
            const parts = [vendor.name, resource.jobCluster, resource.seniority];
            return `${parts.join(' - ')} (€${rate}/day)`;
        }

        return `${vendor.name} (Incomplete Selection)`;
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
    },

    // ======================
    // CALCULATIONS ACTIONS (State/Actions/Dispatcher Pattern)
    // ======================

    /**
     * Set calculations data (vendor costs + KPI)
     */
    setCalculationsData: (data) => {
        const currentState = get();
        const preservedFilters = currentState.calculationsData?.filters || { vendor: 'all', role: 'all', category: 'all' };

        // Determine mode from project data
        const isWorkingPackageMode = currentState.currentProject?.workingPackageData?.enabled;

        // Get existing sections to preserve
        const existingFB = currentState.calculationsData?.featureBased || {};
        const existingWP = currentState.calculationsData?.workingPackage || {};

        set({
            calculationsData: {
                // Start with existing state
                ...(currentState.calculationsData || {}),

                // Update the active mode's section with incoming data
                [isWorkingPackageMode ? 'workingPackage' : 'featureBased']: {
                    vendorCosts: data.vendorCosts,
                    kpiData: data.kpiData,
                    // Preserve mode-specific fields
                    ...(isWorkingPackageMode ? {
                        entries: data.workingPackage?.entries ?? existingWP.entries,
                        summary: data.workingPackage?.summary ?? existingWP.summary,
                        calculated: data.workingPackage?.calculated ?? existingWP.calculated,
                        projectTotal: data.workingPackage?.projectTotal,
                        finalMDsOverrides: data.workingPackage?.finalMDsOverrides ?? existingWP.finalMDsOverrides ?? {}
                    } : {
                        finalMDsOverrides: data.featureBased?.finalMDsOverrides ?? existingFB.finalMDsOverrides ?? {}
                    }),
                },

                // Update the inactive mode section to preserve its data
                [isWorkingPackageMode ? 'featureBased' : 'workingPackage']: {
                    // For inactive mode, preserve all existing data
                    ...(isWorkingPackageMode ? existingFB : existingWP)
                },

                // Update filters if provided
                filters: data.filters ?? preservedFilters,

                // Increment version for React re-renders
                version: (currentState.calculationsData?.version || 0) + 1
            }
        });
    },

    /**
     * Update Final MDs override per vendor
     */
    updateFinalMDsOverride: (key, value) => set(state => ({
        calculationsData: {
            ...state.calculationsData,
            finalMDsOverrides: {
                ...state.calculationsData.finalMDsOverrides,
                [key]: value
            },
            version: (state.calculationsData?.version || 0) + 1 // Increment version
        }
    })),

    /**
     * Set calculations filters
     */
    setCalculationsFilters: (filters) => {
        const currentState = get();
        const currentFilters = currentState.calculationsData?.filters || { vendor: 'all', role: 'all', category: 'all' };
        const newFilters = { ...currentFilters, ...filters };


        set({
            calculationsData: {
                ...currentState.calculationsData,
                filters: newFilters,
                version: (currentState.calculationsData?.version || 0) + 1
            }
        });
    },

    /**
     * Clear all Final MDs overrides (both FB and WP modes)
     */
    clearFinalMDsOverrides: () => set(state => ({
        calculationsData: {
            ...state.calculationsData,
            featureBased: {
                ...state.calculationsData?.featureBased,
                finalMDsOverrides: {}
            },
            workingPackage: {
                ...state.calculationsData?.workingPackage,
                finalMDsOverrides: {}
            }
        }
    })),

    /**
     * Clear calculations data
     * 🔧 STRUCTURE FIX: Clear both featureBased and workingPackage sections
     */
    clearCalculations: (preserveOverrides) => set(state => ({
        calculationsData: {
            featureBased: {
                vendorCosts: [],
                kpiData: null,
                finalMDsOverrides: preserveOverrides?.featureBased || {}
            },
            workingPackage: {
                vendorCosts: [],
                kpiData: null,
                entries: [],
                summary: { gtoTotal: 0, gdsTotal: 0, projectTotal: 0 },
                calculated: { gto: {}, gds: {} },
                finalMDsOverrides: preserveOverrides?.workingPackage || {}
            },
            filters: { vendor: 'all', role: 'all', category: 'all' },
            version: (state.calculationsData?.version || 0) + 1 // Increment version
        }
    })),

    // ======================
    // ASSUMPTIONS ACTIONS (State/Actions/Dispatcher Pattern)
    // Called ONLY by AssumptionsActions class
    // ======================

    /**
     * Add assumption to current project
     */
    addProjectAssumption: (assumption) => {
        const currentState = get();
        if (!currentState.currentProject) return;

        const updatedAssumptions = [...(currentState.currentProject.assumptions || []), assumption];
        const updatedProject = {
            ...currentState.currentProject,
            assumptions: updatedAssumptions
        };

        set({
            currentProject: updatedProject,
            isDirty: true
        });
    },

    /**
     * Update assumption in current project
     */
    updateProjectAssumption: (id, updatedAssumption) => {
        const currentState = get();
        if (!currentState.currentProject?.assumptions) return;

        const updatedAssumptions = currentState.currentProject.assumptions.map(assumption =>
            assumption.id === id ? updatedAssumption : assumption
        );
        const updatedProject = {
            ...currentState.currentProject,
            assumptions: updatedAssumptions
        };

        set({
            currentProject: updatedProject,
            isDirty: true
        });
    },

    /**
     * Delete assumption from current project
     */
    deleteProjectAssumption: (id) => {
        const currentState = get();
        if (!currentState.currentProject?.assumptions) return;

        const updatedAssumptions = currentState.currentProject.assumptions.filter(assumption =>
            assumption.id !== id
        );
        const updatedProject = {
            ...currentState.currentProject,
            assumptions: updatedAssumptions
        };

        set({
            currentProject: updatedProject,
            isDirty: true
        });
    },

    /**
     * Set assumptions filters
     */
    setAssumptionsFilters: (filters) => {
        const currentState = get();
        const currentAssumptionsData = currentState.assumptionsData || {
            filters: { search: '', type: '', impact: '' },
            modalState: { isOpen: false, mode: 'add', selectedAssumption: null }
        };

        set({
            assumptionsData: {
                ...currentAssumptionsData,
                filters: {
                    ...currentAssumptionsData.filters,
                    ...filters
                }
            }
        });
    },

    /**
     * Set assumptions modal state
     */
    setAssumptionsModalState: (modalState) => {
        const currentState = get();
        const currentAssumptionsData = currentState.assumptionsData || {
            filters: { search: '', type: '', impact: '' },
            modalState: { isOpen: false, mode: 'add', selectedAssumption: null }
        };

        set({
            assumptionsData: {
                ...currentAssumptionsData,
                modalState: {
                    ...currentAssumptionsData.modalState,
                    ...modalState
                }
            }
        });
    },

    // ======================
    // VERSION HISTORY ACTIONS (State/Actions/Dispatcher Pattern)
    // ======================

    /**
     * Set version history filters
     */
    setVersionHistoryFilters: (filters) => {
        const currentState = get();
        const currentVersionHistoryData = currentState.versionHistoryData || {
            filters: { dateRange: '', reason: '' },
            modalStates: {
                createModal: { isOpen: false, selectedVersion: null },
                compareModal: { isOpen: false, selectedVersion: null },
                restoreModal: { isOpen: false, selectedVersion: null }
            },
            isLoading: false
        };

        set({
            versionHistoryData: {
                ...currentVersionHistoryData,
                filters: {
                    ...currentVersionHistoryData.filters,
                    ...filters
                }
            }
        });
    },

    /**
     * Set version history modal state
     */
    setVersionHistoryModalState: (modalType, modalState) => {
        const currentState = get();
        const currentVersionHistoryData = currentState.versionHistoryData || {
            filters: { dateRange: '', reason: '' },
            modalStates: {
                createModal: { isOpen: false, selectedVersion: null },
                compareModal: { isOpen: false, selectedVersion: null },
                restoreModal: { isOpen: false, selectedVersion: null }
            },
            isLoading: false
        };

        set({
            versionHistoryData: {
                ...currentVersionHistoryData,
                modalStates: {
                    ...currentVersionHistoryData.modalStates,
                    [modalType]: {
                        ...currentVersionHistoryData.modalStates[modalType],
                        ...modalState
                    }
                }
            }
        });
    },

    /**
     * Set version history loading state
     */
    setVersionHistoryLoading: (isLoading) => {
        const currentState = get();
        const currentVersionHistoryData = currentState.versionHistoryData || {
            filters: { dateRange: '', reason: '' },
            modalStates: {
                createModal: { isOpen: false, selectedVersion: null },
                compareModal: { isOpen: false, selectedVersion: null },
                restoreModal: { isOpen: false, selectedVersion: null }
            },
            isLoading: false
        };

        set({
            versionHistoryData: {
                ...currentVersionHistoryData,
                isLoading
            }
        });
    },

    /**
     * Update project versions array
     */
    updateProjectVersions: (versions) => {
        const currentState = get();
        if (!currentState.currentProject) {
            console.warn('Cannot update versions: No project loaded');
            return;
        }

        set({
            currentProject: {
                ...currentState.currentProject,
                versions
            }
        });
    },

    // ======================
    // TICKET DASHBOARD ACTIONS (State/Actions/Dispatcher Pattern)
    // Called ONLY by TicketDashboardActions class
    // ======================

    /**
     * Set raw ticket data from CSV
     */
    setTicketData: (tickets) => {
        set({ ticketData: tickets });
    },

    /**
     * Set calculated dashboard metrics
     */
    setDashboardMetrics: (metrics) => {
        set({ dashboardMetrics: metrics });
    },

    /**
     * Set operator performance metrics
     */
    setOperatorMetrics: (metrics) => {
        set({ operatorMetrics: metrics });
    },

    /**
     * Set dashboard alerts
     */
    setDashboardAlerts: (alerts) => {
        set({ dashboardAlerts: alerts });
    },

    /**
     * Set selected operator for drill-down
     */
    setSelectedOperator: (operatorName) => {
        set({ selectedOperator: operatorName });
    },

    /**
     * Set detailed operator metrics
     */
    setOperatorDetails: (details) => {
        set({ operatorDetails: details });
    },

    /**
     * Set time filter
     */
    setTimeFilter: (filter) => {
        set({ timeFilter: filter });
    },

    /**
     * Set additional filters (priority, state, operator)
     */
    setAdditionalFilters: (filters) => {
        set({ additionalFilters: filters });
    },

    /**
     * Set ticket dashboard error
     */
    setTicketDashboardError: (error) => {
        set({ ticketDashboardError: error });
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
