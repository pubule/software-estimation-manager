/**
 * Base Navigation Manager
 */
class NavigationManager extends BaseComponent {
    constructor(app) {
        super('NavigationManager');
        this.app = app;
        this.currentSection = 'projects';
    }

    navigateTo(sectionName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active state from all nav sections
        document.querySelectorAll('.nav-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${sectionName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Set active nav section
        const targetNav = document.querySelector(`[data-section="${sectionName}"]`);
        if (targetNav) {
            targetNav.classList.add('active');
        }

        this.currentSection = sectionName;

        console.log(`Navigated to section: ${sectionName}`);
    }

}

class EnhancedNavigationManager extends NavigationManager {
    constructor(app, configManager) {
        super(app);
        this.configManager = configManager;
        
        // Connect to global state store (may not be available immediately)
        this.store = window.appStore;
        this.storeUnsubscribe = null;
        
        // Local UI state (not in global store)
        this.projectsExpanded = false;
        this.capacityExpanded = true;
        this.lastActivePanel = null; // For collapse/expand functionality
        this.currentActivePanel = null;

        this.initializeNestedNavigation();
        this.setupStoreSubscription();
        
        // If store wasn't available during construction, try to connect when it becomes available
        if (!this.store) {
            console.log('Store not available during NavigationManager construction, will attempt to connect later');
            this.connectToStoreWhenReady();
        }
    }
    /**
     * Setup store subscription for reactive navigation updates
     */
    setupStoreSubscription() {
        if (!this.store) {
            console.warn('Store not available for NavigationManager');
            return;
        }

        this.storeUnsubscribe = this.store.subscribe((state, prevState) => {
            // React to current section changes
            if (state.currentSection !== prevState.currentSection) {
                this.handleSectionChange(state.currentSection);
            }

            // React to project state changes
            const hasProject = state.currentProject !== null;
            const prevHasProject = prevState.currentProject !== null;
            if (hasProject !== prevHasProject) {
                this.handleProjectLoadedChange(hasProject);
            }

            // React to dirty state changes  
            if (state.isDirty !== prevState.isDirty) {
                this.handleDirtyStateChange(state.isDirty);
            }

            // React to current page changes
            if (state.currentPage !== prevState.currentPage) {
                this.handlePageChange(state.currentPage);
            }
        });
    }

    /**
     * Handle section changes from global state
     */
    handleSectionChange(newSection) {
        console.log(`Navigation: Section changed to ${newSection}`);
        this.updateActiveStates(newSection);
    }

    /**
     * Handle project loaded state changes from global state  
     */
    handleProjectLoadedChange(hasProject) {
        console.log(`Navigation: Project loaded state changed to ${hasProject}`);
        
        // Auto-expand projects section when project is loaded (from old onProjectLoaded logic)
        if (hasProject && !this.projectsExpanded) {
            this.projectsExpanded = true;
            this.updateProjectsExpansion();
        }
        
        this.updateProjectStatus();
        this.updateProjectSubSections();
        
        // If project is being closed and user is viewing a project sub-section,
        // navigate back to projects main page
        if (!hasProject && this.store && this.store.getState) {
            if (this.isProjectSubSection(this.store.getState().currentSection)) {
                this.store.getState().navigateTo('projects');
            }
        }
    }

    /**
     * Handle dirty state changes from global state
     */
    handleDirtyStateChange(isDirty) {
        console.log(`Navigation: Dirty state changed to ${isDirty}`);
        this.updateProjectStatus();
    }

    /**
     * Handle page changes from global state
     */
    handlePageChange(newPage) {
        console.log(`Navigation: Page changed to ${newPage}`);
        // Update active states and UI as needed
    }

    /**
     * Attempt to connect to store when it becomes available
     */
    connectToStoreWhenReady() {
        // Check periodically for store availability
        const checkForStore = () => {
            if (window.appStore && !this.store) {
                console.log('Store now available, connecting NavigationManager...');
                this.store = window.appStore;
                this.setupStoreSubscription();
                return;
            }
            
            // Keep checking every 100ms for up to 5 seconds
            if (!this.store && (this.storeCheckAttempts || 0) < 50) {
                this.storeCheckAttempts = (this.storeCheckAttempts || 0) + 1;
                setTimeout(checkForStore, 100);
            } else if (!this.store) {
                console.warn('NavigationManager: Store not available after 5 seconds, will operate without store integration');
            }
        };
        
        setTimeout(checkForStore, 100);
    }
    
    /**
     * Cleanup store subscription
     */
    destroy() {
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
            this.storeUnsubscribe = null;
        }
    }

    initializeNestedNavigation() {
        this.setupNestedEventListeners();
        this.updateProjectStatus();
        this.setupCapacityToggle();
        this.capacityExpanded = true;
        this.setupVSCodeSidebar();
        this.currentActivePanel = null;
    }

    setupNestedEventListeners() {
        // Override parent navigation setup
        this.setupNavigationEvents();
        this.setupProjectToggle();
    }

    /**
     * ⚡ REACTIVE NAVIGATION: Setup reactive navigation system
     * Replaces 15+ traditional addEventListener calls with centralized action management
     */
    setupNavigationEvents() {
        this.setupReactiveNavigation();
    }

    /**
     * Setup reactive navigation system  
     */
    setupReactiveNavigation() {
        this.setupNavigationActionDispatcher();
        this.setupDelegatedNavigationHandler();
        console.log('🚀 Navigation: Using reactive navigation system (15+ listeners → 1 delegated)');
    }

    /**
     * Setup centralized action dispatcher for navigation
     */
    setupNavigationActionDispatcher() {
        this.navigationActionMap = {
            // Main navigation actions
            'nav-section': (params) => this.handleNavSectionClick(params.sectionName),
            'nav-child': (params) => this.handleNavChildClick(params.sectionName),
            'nav-capacity-child': (params) => this.handleCapacityChildClick(params.sectionName),
            
            // Toggle actions  
            'projects-toggle': () => this.toggleProjectsSection(),
            'capacity-toggle': () => this.toggleCapacitySection(),
            'collapse-toggle': () => this.toggleSidebarCollapse(),
            
            // VSCode sidebar actions
            'icon-item': (params) => this.toggleSidebarPanel(params.panelType)
        };
    }

    /**
     * Setup single delegated navigation handler
     * REPLACES 15+ individual addEventListener calls with 1 centralized handler
     */
    setupDelegatedNavigationHandler() {
        // Single click handler for ALL navigation interactions
        document.addEventListener('click', (e) => {
            // METHOD 1: Handle main navigation sections
            const navSection = e.target.closest('.nav-section[data-section]');
            if (navSection) {
                const navItem = e.target.closest('.nav-item');
                if (navItem) {
                    e.stopPropagation();
                    const sectionName = navSection.dataset.section;
                    this.dispatchNavigationAction('nav-section', { sectionName });
                    return;
                }
            }

            // METHOD 2: Handle nested project sections
            const navChild = e.target.closest('.nav-child[data-section]');
            if (navChild && !navChild.classList.contains('disabled')) {
                e.stopPropagation();
                const sectionName = navChild.dataset.section;
                this.dispatchNavigationAction('nav-child', { sectionName });
                return;
            }

            // METHOD 3: Handle nested capacity sections
            const navCapacityChild = e.target.closest('.nav-capacity-child[data-section]');
            if (navCapacityChild) {
                e.stopPropagation();
                const sectionName = navCapacityChild.dataset.section;
                this.dispatchNavigationAction('nav-capacity-child', { sectionName });
                return;
            }

            // METHOD 4: Handle toggle buttons by ID
            const toggleActions = {
                'projects-toggle': 'projects-toggle',
                'capacity-toggle': 'capacity-toggle'
            };
            const toggleAction = toggleActions[e.target.id];
            if (toggleAction) {
                e.stopPropagation();
                this.dispatchNavigationAction(toggleAction);
                return;
            }

            // METHOD 5: Handle collapse toggle
            if (e.target.closest('.collapse-toggle')) {
                e.preventDefault();
                e.stopPropagation();
                this.dispatchNavigationAction('collapse-toggle');
                return;
            }

            // METHOD 6: Handle VSCode sidebar icon items
            const iconItem = e.target.closest('.icon-item:not(.collapse-toggle)');
            if (iconItem) {
                e.preventDefault();
                e.stopPropagation();
                const panelType = iconItem.dataset.panel;
                if (panelType) {
                    this.dispatchNavigationAction('icon-item', { panelType });
                    return;
                }
            }
        });
    }

    /**
     * Centralized navigation action dispatcher
     */
    dispatchNavigationAction(actionType, params = {}) {
        const handler = this.navigationActionMap[actionType];
        if (handler) {
            try {
                handler(params);
            } catch (error) {
                console.error(`NavigationManager action '${actionType}' failed:`, error);
                if (window.NotificationManager) {
                    NotificationManager.show(`Navigation action failed: ${error.message}`, 'error');
                }
            }
        } else {
            console.warn(`NavigationManager: Unknown action type '${actionType}'`);
        }
    }

    /**
     * Handle main navigation section clicks
     */
    handleNavSectionClick(sectionName) {
        if (sectionName === 'projects') {
            // Always navigate to Projects page
            this.navigateTo('projects');

            // Then expand section if project is loaded
            if (this.store && this.store.getState) {
                const state = this.store.getState();
                const hasProject = state.currentProject !== null;
                if (hasProject && !this.projectsExpanded) {
                    this.projectsExpanded = true;
                    this.updateProjectsExpansion();
                }
            }
        } else {
            this.navigateTo(sectionName);
        }
    }

    /**
     * Handle nested child navigation clicks
     */
    handleNavChildClick(sectionName) {
        this.navigateTo(sectionName);
    }

    /**
     * Handle capacity child navigation clicks  
     */
    handleCapacityChildClick(sectionName) {
        this.navigateToCapacitySubSection(sectionName);
    }

    /**
     * ⚡ DEPRECATED: Replaced by setupDelegatedNavigationHandler()
     * Project toggle now handled by reactive navigation system
     */
    setupProjectToggle() {
        // 🚀 REACTIVE TRANSFORMATION COMPLETE
        // projects-toggle clicks now handled by:
        // - setupDelegatedNavigationHandler() METHOD 4
        // - dispatchNavigationAction('projects-toggle')
        console.log('📋 Navigation: projects-toggle using reactive actions (delegated events)');
    }
    
    /**
     * ⚡ DEPRECATED: Replaced by setupDelegatedNavigationHandler()
     * Capacity toggle now handled by reactive navigation system
     */
    setupCapacityToggle() {
        // 🚀 REACTIVE TRANSFORMATION COMPLETE
        // capacity-toggle clicks now handled by:
        // - setupDelegatedNavigationHandler() METHOD 4
        // - dispatchNavigationAction('capacity-toggle')
        console.log('📋 Navigation: capacity-toggle using reactive actions (delegated events)');
    }

    /**
     * ⚡ DEPRECATED: Setup VSCode-style Sidebar (now reactive)
     * Icon items and collapse toggle now handled by reactive navigation system
     */
    setupVSCodeSidebar() {
        console.log('Setting up VSCode sidebar...');
        
        // 🚀 REACTIVE TRANSFORMATION COMPLETE
        // Icon items clicks now handled by:
        // - setupDelegatedNavigationHandler() METHOD 6
        // - dispatchNavigationAction('icon-item', { panelType })
        
        const iconItems = document.querySelectorAll('.icon-item:not(.collapse-toggle)');
        console.log(`⚡ Found ${iconItems.length} icon items: Using reactive actions (delegated events)`);

        // Setup collapse toggle (also reactive now)
        this.setupSidebarCollapse();

        // Panel close buttons have been removed - no handlers needed

        // Initialize with projects panel active by default
        setTimeout(() => {
            console.log('Initializing projects panel...');
            
            // Double-check elements exist
            const projectsPanel = document.getElementById('projects-panel');
            const projectsIcon = document.querySelector('.icon-item[data-panel="projects"]');
            console.log('Projects panel exists:', !!projectsPanel);
            console.log('Projects icon exists:', !!projectsIcon);
            
            if (projectsPanel && projectsIcon) {
                this.openSidebarPanel('projects');
            } else {
                console.error('VSCode sidebar elements not found!');
            }
        }, 500);
    }

    // Toggle sidebar panel
    toggleSidebarPanel(panelType) {
        if (this.currentActivePanel === panelType) {
            // Close current panel if clicking same icon
            this.closeSidebarPanel(panelType);
        } else {
            // Open new panel (closes others automatically)
            this.openSidebarPanel(panelType);
        }
    }

    // Open specific sidebar panel
    openSidebarPanel(panelType) {
        console.log(`Attempting to open panel: ${panelType}`);
        
        // Close all panels first
        this.closeAllSidebarPanels();
        
        // Activate the icon
        document.querySelectorAll('.icon-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const targetIcon = document.querySelector(`.icon-item[data-panel="${panelType}"]`);
        console.log('Target icon found:', !!targetIcon);
        if (targetIcon) {
            targetIcon.classList.add('active');
        }

        // Show the panel
        const targetPanel = document.getElementById(`${panelType}-panel`);
        console.log('Target panel found:', !!targetPanel);
        if (targetPanel) {
            targetPanel.classList.add('active');
            console.log('Panel class added, current classes:', targetPanel.className);
        }

        // Add active panel class to container
        const panelsContainer = document.querySelector('.expandable-panels');
        if (panelsContainer) {
            panelsContainer.classList.add('has-active-panel');
        }

        // Auto-expand sidebar if it was collapsed
        const sidebarContainer = document.querySelector('.vscode-sidebar-container');
        if (sidebarContainer && sidebarContainer.classList.contains('collapsed')) {
            console.log('Auto-expanding sidebar - panel becoming active');
            sidebarContainer.classList.remove('collapsed');
        }

        // Update current active panel
        this.currentActivePanel = panelType;

        // Auto-navigate based on panel type
        this.handlePanelNavigation(panelType);

        console.log(`Opened sidebar panel: ${panelType}`);
    }

    // Close specific sidebar panel
    closeSidebarPanel(panelType) {
        // Deactivate the icon
        const targetIcon = document.querySelector(`.icon-item[data-panel="${panelType}"]`);
        if (targetIcon) {
            targetIcon.classList.remove('active');
        }

        // Hide the panel
        const targetPanel = document.getElementById(`${panelType}-panel`);
        if (targetPanel) {
            targetPanel.classList.remove('active');
        }

        // Update current active panel
        if (this.currentActivePanel === panelType) {
            this.currentActivePanel = null;
        }

        // Remove active panel class from container
        const panelsContainer = document.querySelector('.expandable-panels');
        if (panelsContainer) {
            panelsContainer.classList.remove('has-active-panel');
        }

        // Auto-collapse sidebar when no panels are active
        const sidebarContainer = document.querySelector('.vscode-sidebar-container');
        if (sidebarContainer && !sidebarContainer.classList.contains('collapsed')) {
            console.log('Auto-collapsing sidebar - no active panels');
            this.lastActivePanel = panelType; // Remember what was closed for potential restore
            sidebarContainer.classList.add('collapsed');
        }

        console.log(`Closed sidebar panel: ${panelType}`);
    }

    // Close all sidebar panels
    closeAllSidebarPanels() {
        document.querySelectorAll('.icon-item').forEach(item => {
            item.classList.remove('active');
        });

        document.querySelectorAll('.sidebar-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Remove active panel class from container
        const panelsContainer = document.querySelector('.expandable-panels');
        if (panelsContainer) {
            panelsContainer.classList.remove('has-active-panel');
        }

        this.currentActivePanel = null;
    }

    // Handle navigation based on panel type
    handlePanelNavigation(panelType) {
        switch (panelType) {
            case 'projects':
                // Default to projects page, but don't force navigation
                // User can navigate within the panel
                if (!this.isProjectSubSection(this.currentSection) && this.currentSection !== 'projects') {
                    this.navigateTo('projects');
                }
                break;
                
            case 'capacity':
                // Default to main capacity page
                if (!this.isCapacitySubSection(this.currentSection) && this.currentSection !== 'capacity') {
                    this.navigateTo('capacity');
                }
                break;
                
            case 'configuration':
                // Navigate to configuration
                if (this.currentSection !== 'configuration') {
                    this.navigateTo('configuration');
                }
                break;
        }
    }

    // Test method for debugging (will be removed later)
    testSidebar() {
        console.log('=== VSCode Sidebar Test ===');
        
        const vscodeSidebarContainer = document.querySelector('.vscode-sidebar-container');
        const iconSidebar = document.querySelector('.icon-sidebar');
        const expandablePanels = document.querySelector('.expandable-panels');
        const projectsPanel = document.getElementById('projects-panel');
        const projectsIcon = document.querySelector('.icon-item[data-panel="projects"]');
        
        console.log('VSCode sidebar container:', !!vscodeSidebarContainer);
        console.log('Icon sidebar:', !!iconSidebar);
        console.log('Expandable panels:', !!expandablePanels);
        console.log('Projects panel:', !!projectsPanel);
        console.log('Projects icon:', !!projectsIcon);
        
        if (expandablePanels) {
            console.log('Expandable panels styles:', getComputedStyle(expandablePanels));
        }
        
        if (projectsPanel) {
            console.log('Projects panel styles:', getComputedStyle(projectsPanel));
            console.log('Projects panel classes:', projectsPanel.className);
        }
        
        // Force open projects panel for testing
        if (projectsPanel && projectsIcon) {
            console.log('Forcing projects panel to open...');
            projectsIcon.classList.add('active');
            projectsPanel.classList.add('active');
            expandablePanels?.classList.add('has-active-panel');
            this.currentActivePanel = 'projects';
            console.log('Projects panel forced open. Check visual result.');
        }
        
        console.log('=== End Test ===');
    }

    toggleProjectsSection() {
        this.projectsExpanded = !this.projectsExpanded;
        this.updateProjectsExpansion();

        // If projects section is being opened and no specific sub-section is active,
        // navigate to projects main page
        if (this.projectsExpanded && !this.isProjectSubSection(this.currentSection)) {
            this.navigateTo('projects');
        }
    }

    navigateTo(sectionName) {
        // Check if store is available
        if (!this.store || !this.store.getState) {
            console.warn('Store not available for NavigationManager.navigateTo, navigation aborted');
            return;
        }
        
        const state = this.store.getState();
        
        // Check if user is trying to access a project sub-section without a loaded project
        const hasProject = state.currentProject !== null;
        if (this.isProjectSubSection(sectionName) && !hasProject) {
            console.warn(`Cannot navigate to ${sectionName}: No project loaded`);
            NotificationManager.warning('Please load or create a project first');
            return;
        }

        // Special handling for phases navigation
        if (sectionName === 'phases') {
            this.showPhasesPage();
            return;
        }

        // Special handling for calculations navigation
        if (sectionName === 'calculations') {
            this.showCalculationsPage();
            return;
        }

        // Special handling for version history navigation
        if (sectionName === 'history') {
            this.showHistoryPage();
            return;
        }

        // Special handling for capacity navigation
        if (sectionName === 'capacity') {
            this.showCapacityPage();
            return;
        }
        
        // Special handling for capacity sub-sections
        if (sectionName === 'resource-overview') {
            this.showResourceOverviewPage();
            return;
        }
        
        if (sectionName === 'capacity-timeline') {
            this.showCapacityTimelinePage();
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Update active states
        this.updateActiveStates(sectionName);

        // Show target page
        const targetPage = document.getElementById(`${sectionName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update global state instead of local state
        this.store.getState().setSection(sectionName);

        // If navigating to a project sub-section, ensure projects is expanded
        if (this.isProjectSubSection(sectionName)) {
            if (!this.projectsExpanded) {
                this.projectsExpanded = true;
                this.updateProjectsExpansion();
            }
        }

        if (sectionName === 'configuration') {
            this.app.configurationUI?.render();
        }

        console.log(`Navigated to section: ${sectionName}`);
    }


    // Special method for phases page
    showPhasesPage() {
        // Check if store is available
        if (!this.store || !this.store.getState) {
            console.warn('Store not available for NavigationManager.showPhasesPage, navigation aborted');
            return;
        }
        
        const state = this.store.getState();
        const hasProject = state.currentProject !== null;
        
        // Verify project is loaded
        if (!hasProject) {
            console.warn('Cannot navigate to phases: No project loaded');
            NotificationManager.warning('Please load or create a project first to access project phases');
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Update active states
        this.updateActiveStates('phases');

        // Show target page
        const targetPage = document.getElementById('phases-page');
        if (targetPage) {
            targetPage.classList.add('active');

            // Initialize phases manager if not exists
            if (!this.app.projectPhasesManager) {
                this.app.projectPhasesManager = new ProjectPhasesManager(this.app, this.configManager);
            }

            // Render phases content
            setTimeout(() => {
                this.app.projectPhasesManager.renderPhasesPage(targetPage);
            }, 100);
        }

        // Store current section
        this.currentSection = 'phases';

        // Ensure projects is expanded
        if (!this.projectsExpanded) {
            this.projectsExpanded = true;
            this.updateProjectsExpansion();
        }

        console.log('Navigated to phases page');
    }

    // Special method for calculations page
    showCalculationsPage() {
        // Check if store is available
        if (!this.store || !this.store.getState) {
            console.warn('Store not available for NavigationManager.showCalculationsPage, navigation aborted');
            return;
        }
        
        const state = this.store.getState();
        const hasProject = state.currentProject !== null;
        
        // Verify project is loaded
        if (!hasProject) {
            console.warn('Cannot navigate to calculations: No project loaded');
            NotificationManager.warning('Please load or create a project first to view calculations');
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Update active states
        this.updateActiveStates('calculations');

        // Show target page
        const targetPage = document.getElementById('calculations-page');
        if (targetPage) {
            targetPage.classList.add('active');

            // Initialize calculations manager if not exists
            if (!this.app.calculationsManager) {
                this.app.calculationsManager = new CalculationsManager(this.app, this.configManager);
            }

            // Render calculations content
            setTimeout(() => {
                this.app.calculationsManager.render();
            }, 100);
        }

        // Store current section
        this.currentSection = 'calculations';

        // Ensure projects is expanded
        if (!this.projectsExpanded) {
            this.projectsExpanded = true;
            this.updateProjectsExpansion();
        }

        console.log('Navigated to calculations page');
    }

    // Special method for version history page
    showHistoryPage() {
        // Check if store is available
        if (!this.store || !this.store.getState) {
            console.warn('Store not available for NavigationManager.showHistoryPage, navigation aborted');
            return;
        }
        
        const state = this.store.getState();
        const hasProject = state.currentProject !== null;
        
        // Verify project is loaded
        if (!hasProject) {
            console.warn('Cannot navigate to history: No project loaded');
            NotificationManager.warning('Please load or create a project first to view version history');
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Update active states
        this.updateActiveStates('history');

        // Show target page
        const targetPage = document.getElementById('history-page');
        if (targetPage) {
            targetPage.classList.add('active');

            // Version manager should already be initialized in main app
            if (this.app.versionManager) {
                // Render version history content
                setTimeout(() => {
                    this.app.versionManager.render();
                }, 100);
            } else {
                console.error('Version manager not initialized');
            }
        }

        // Store current section
        this.currentSection = 'history';

        // Ensure projects is expanded
        if (!this.projectsExpanded) {
            this.projectsExpanded = true;
            this.updateProjectsExpansion();
        }

        console.log('Navigated to version history page');
    }

    // Special method for capacity page
    showCapacityPage() {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Update active states
        this.updateActiveStates('capacity');

        // Show target page
        const targetPage = document.getElementById('capacity-page');
        if (targetPage) {
            targetPage.classList.add('active');

            // Initialize capacity manager if not exists
            if (!this.app.capacityManager) {
                this.app.capacityManager = new CapacityManager(this.app, this.configManager);
            }

            // Render capacity content
            setTimeout(() => {
                this.app.capacityManager.render();
            }, 100);
        }

        // Store current section
        this.currentSection = 'capacity';

        console.log('Navigated to capacity planning page');
    }
    
    // Method for navigating to capacity sub-sections
    navigateToCapacitySubSection(sectionName) {
        console.log(`Navigating to capacity sub-section: ${sectionName}`);
        
        // Expand capacity section if not expanded
        if (!this.capacityExpanded) {
            this.capacityExpanded = true;
            this.updateCapacityExpansion();
        }
        
        this.navigateTo(sectionName);
    }
    
    // Method for Resource Capacity Overview
    showResourceOverviewPage() {
        console.log('Showing Resource Capacity Overview page');
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Update active states
        this.updateActiveStates('resource-overview');
        
        // Show target page
        const targetPage = document.getElementById('resource-overview-page');
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Initialize capacity manager if not exists
            if (!this.app.capacityManager) {
                this.app.capacityManager = new CapacityManager(this.app, this.configManager);
            }
            
            // Render resource overview content
            setTimeout(async () => {
                await this.app.capacityManager.renderResourceOverview();
            }, 100);
        }
        
        // Store current section
        this.currentSection = 'resource-overview';
        
        // Ensure capacity is expanded
        if (!this.capacityExpanded) {
            this.capacityExpanded = true;
            this.updateCapacityExpansion();
        }
        
        console.log('Navigated to resource overview page');
    }
    
    // Method for Capacity Planning Timeline
    showCapacityTimelinePage() {
        console.log('Showing Capacity Planning Timeline page');
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Update active states
        this.updateActiveStates('capacity-timeline');
        
        // Show target page
        const targetPage = document.getElementById('capacity-timeline-page');
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Initialize capacity manager if not exists
            if (!this.app.capacityManager) {
                this.app.capacityManager = new CapacityManager(this.app, this.configManager);
            }
            
            // Render capacity timeline content
            setTimeout(() => {
                this.app.capacityManager.renderCapacityTimeline();
            }, 100);
        }
        
        // Store current section
        this.currentSection = 'capacity-timeline';
        
        // Ensure capacity is expanded
        if (!this.capacityExpanded) {
            this.capacityExpanded = true;
            this.updateCapacityExpansion();
        }
        
        console.log('Navigated to capacity timeline page');
    }
    
    toggleCapacitySection() {
        this.capacityExpanded = !this.capacityExpanded;
        this.updateCapacityExpansion();
        
        // If capacity section is being opened and no specific sub-section is active,
        // navigate to main capacity page
        if (this.capacityExpanded && !this.isCapacitySubSection(this.currentSection)) {
            this.navigateTo('capacity');
        }
    }
    
    updateCapacityExpansion() {
        const toggle = document.getElementById('capacity-toggle');
        const children = document.getElementById('capacity-children');
        
        if (toggle && children) {
            toggle.classList.toggle('expanded', this.capacityExpanded);
            children.classList.toggle('expanded', this.capacityExpanded);
        }
    }

    updateActiveStates(activeSectionName) {
        // Remove all active states
        document.querySelectorAll('.nav-section, .nav-child').forEach(el => {
            el.classList.remove('active');
        });

        // Set active state for the target section
        const activeElement = document.querySelector(`[data-section="${activeSectionName}"]`);
        if (activeElement) {
            activeElement.classList.add('active');

            // If it's a project sub-section, also mark projects as active
            if (this.isProjectSubSection(activeSectionName)) {
                const projectsSection = document.querySelector('[data-section="projects"]');
                if (projectsSection) {
                    projectsSection.classList.add('active');
                }
            }
            
            // If it's a capacity sub-section, also mark capacity as active
            if (this.isCapacitySubSection(activeSectionName)) {
                const capacitySection = document.querySelector('[data-section="capacity"]');
                if (capacitySection) {
                    capacitySection.classList.add('active');
                }
            }
        }
    }

    updateProjectsExpansion() {
        const toggle = document.getElementById('projects-toggle');
        const children = document.getElementById('projects-children');

        if (toggle && children) {
            toggle.classList.toggle('expanded', this.projectsExpanded);
            children.classList.toggle('expanded', this.projectsExpanded);
        }
    }

    isProjectSubSection(sectionName) {
        return ['features', 'phases', 'calculations', 'history'].includes(sectionName);
    }
    
    isCapacitySubSection(sectionName) {
        return ['resource-overview', 'capacity-timeline'].includes(sectionName);
    }

    setProjectStatus(loaded, dirty = false) {
        // Check if store is available
        if (!this.store || !this.store.getState) {
            console.warn('Store not available for NavigationManager.setProjectStatus, ignoring status update');
            return;
        }
        
        // Update global state instead of local state
        const state = this.store.getState();
        
        const hasProject = state.currentProject !== null;
        if (loaded && !hasProject) {
            // Project is being loaded - store will handle this via ApplicationController
            console.log('Navigation: Project loading detected');
        } else if (!loaded && hasProject) {
            // Project is being closed - store will handle this via ApplicationController  
            console.log('Navigation: Project closing detected');
        }
        
        if (dirty !== state.isDirty) {
            // Dirty state change - store will handle this via ApplicationController
            console.log(`Navigation: Dirty state change detected: ${dirty}`);
        }

        // UI updates will be handled by store subscription
        // No need to directly call updateProjectStatus() or updateProjectSubSections()
    }

    updateProjectStatus() {
        const indicator = document.getElementById('nav-project-status');
        if (indicator) {
            // Reset classes
            indicator.className = 'project-status-indicator';

            // Check if store is available before accessing
            if (!this.store || !this.store.getState) {
                console.warn('Store not available for NavigationManager.updateProjectStatus, using default state');
                indicator.classList.add('no-project');
                return;
            }

            // Read from global state instead of local properties
            const state = this.store.getState();
            
            const hasProject = state.currentProject !== null;
            if (!hasProject) {
                indicator.classList.add('no-project');
            } else if (state.isDirty) {
                indicator.classList.add('project-dirty');
            } else {
                indicator.classList.add('project-loaded');
            }
        }
    }

    updateProjectSubSections() {
        // Only select nav-child elements under projects-children, not capacity-children
        const subSections = document.querySelectorAll('#projects-children .nav-child[data-section]');
        
        // Check if store is available before accessing
        if (!this.store || !this.store.getState) {
            console.warn('Store not available for NavigationManager.updateProjectSubSections, disabling all sub-sections');
            subSections.forEach(child => {
                child.classList.add('disabled');
            });
            return;
        }
        
        const state = this.store.getState();
        
        const hasProject = state.currentProject !== null;
        subSections.forEach(child => {
            if (hasProject) {
                child.classList.remove('disabled');
            } else {
                child.classList.add('disabled');
            }
        });
    }

    // REMOVED LEGACY METHOD FOR PURE STATE MANAGER:
    // onProjectLoaded() → All project load reactions happen automatically via handleProjectLoadedChange()

    // REMOVED LEGACY METHOD FOR PURE STATE MANAGER:
    // onProjectClosed() → All project closed reactions happen automatically via handleProjectLoadedChange(false)

    // REMOVED LEGACY METHOD FOR PURE STATE MANAGER:
    // onProjectDirty() → All dirty state reactions happen automatically via handleDirtyStateChange()

    getNavigationState() {
        return {
            currentSection: this.currentSection,
            projectLoaded: this.projectLoaded,
            projectDirty: this.projectDirty,
            projectsExpanded: this.projectsExpanded,
            capacityExpanded: this.capacityExpanded,
            currentActivePanel: this.currentActivePanel
        };
    }

    restoreNavigationState(state) {
        if (state) {
            this.projectLoaded = state.projectLoaded || false;
            this.projectDirty = state.projectDirty || false;
            this.projectsExpanded = state.projectsExpanded || false;
            this.capacityExpanded = state.capacityExpanded || false;
            this.currentActivePanel = state.currentActivePanel || null;

            this.updateProjectStatus();
            this.updateProjectSubSections();
            this.updateProjectsExpansion();
            this.updateCapacityExpansion();

            // Restore active sidebar panel
            if (this.currentActivePanel) {
                setTimeout(() => {
                    this.openSidebarPanel(this.currentActivePanel);
                }, 50);
            }

            if (state.currentSection) {
                this.navigateTo(state.currentSection);
            }
        }
    }

    /**
     * ⚡ DEPRECATED: Setup collapse toggle functionality (now reactive)
     * Collapse toggle now handled by reactive navigation system
     */
    setupSidebarCollapse() {
        // 🚀 REACTIVE TRANSFORMATION COMPLETE
        // collapse-toggle clicks now handled by:
        // - setupDelegatedNavigationHandler() METHOD 5
        // - dispatchNavigationAction('collapse-toggle')
        
        const collapseToggle = document.querySelector('.collapse-toggle');
        const sidebarContainer = document.querySelector('.vscode-sidebar-container');
        
        if (collapseToggle && sidebarContainer) {
            console.log('⚡ Collapse toggle: Using reactive actions (delegated events)');
        }
    }

    // Toggle sidebar collapse state
    toggleSidebarCollapse() {
        const sidebarContainer = document.querySelector('.vscode-sidebar-container');
        if (!sidebarContainer) return;
        
        const isCollapsed = sidebarContainer.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand: restore last active panel
            console.log('Expanding sidebar, restoring panel:', this.lastActivePanel);
            sidebarContainer.classList.remove('collapsed');
            if (this.lastActivePanel) {
                this.openSidebarPanel(this.lastActivePanel);
            } else {
                // Default to projects panel if no last active panel
                this.openSidebarPanel('projects');
            }
        } else {
            // Collapse: save current state and close all panels
            console.log('Collapsing sidebar, current panel:', this.currentActivePanel);
            this.lastActivePanel = this.currentActivePanel;
            sidebarContainer.classList.add('collapsed');
            this.closeAllSidebarPanels();
        }
    }

}

// Make the test method globally available for debugging
if (typeof window !== 'undefined') {
    window.testVSCodeSidebar = function() {
        if (window.app && window.app.navigationManager) {
            window.app.navigationManager.testSidebar();
        } else {
            console.error('Navigation manager not available');
        }
    };
}

// Utility functions for navigation state management
class NavigationStateManager {
    static saveState(navigationManager) {
        const state = navigationManager.getNavigationState();
        localStorage.setItem('navigation-state', JSON.stringify(state));
    }

    static loadState() {
        try {
            const stateData = localStorage.getItem('navigation-state');
            return stateData ? JSON.parse(stateData) : null;
        } catch (error) {
            console.warn('Failed to load navigation state:', error);
            return null;
        }
    }

    static clearState() {
        localStorage.removeItem('navigation-state');
    }
}

// Make enhanced classes available globally
if (typeof window !== 'undefined') {
    window.NavigationManager = NavigationManager;
    window.EnhancedNavigationManager = EnhancedNavigationManager;
    window.NavigationStateManager = NavigationStateManager;
}