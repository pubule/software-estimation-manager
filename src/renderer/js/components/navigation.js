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
        this.projectsExpanded = false;
        this.projectLoaded = false;
        this.projectDirty = false;

        this.initializeNestedNavigation();
    }

    initializeNestedNavigation() {
        this.setupNestedEventListeners();
        this.updateProjectStatus();
        this.setupCapacityToggle();
        this.capacityExpanded = false;
    }

    setupNestedEventListeners() {
        // Override parent navigation setup
        this.setupNavigationEvents();
        this.setupProjectToggle();
    }

    setupNavigationEvents() {
        // Main navigation sections
        document.querySelectorAll('.nav-section[data-section]').forEach(section => {
            const navItem = section.querySelector('.nav-item');
            if (navItem) {
                navItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sectionName = section.dataset.section;

                    if (sectionName === 'projects') {
                        // Always navigate to Projects page
                        this.navigateTo('projects');

                        // Then expand section if project is loaded
                        if (this.projectLoaded && !this.projectsExpanded) {
                            this.projectsExpanded = true;
                            this.updateProjectsExpansion();
                        }
                    } else {
                        this.navigateTo(sectionName);
                    }
                });
            }
        });

        // Nested project sections
        document.querySelectorAll('.nav-child[data-section]').forEach(child => {
            child.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!child.classList.contains('disabled')) {
                    const sectionName = child.dataset.section;
                    this.navigateTo(sectionName);
                }
            });
        });
        
        // Nested capacity sections
        document.querySelectorAll('.nav-capacity-child[data-section]').forEach(child => {
            child.addEventListener('click', (e) => {
                e.stopPropagation();
                const sectionName = child.dataset.section;
                this.navigateToCapacitySubSection(sectionName);
            });
        });
    }

    setupProjectToggle() {
        const projectsToggle = document.getElementById('projects-toggle');
        if (projectsToggle) {
            projectsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProjectsSection();
            });
        }
    }
    
    setupCapacityToggle() {
        const capacityToggle = document.getElementById('capacity-toggle');
        if (capacityToggle) {
            capacityToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCapacitySection();
            });
        }
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
        // Check if user is trying to access a project sub-section without a loaded project
        if (this.isProjectSubSection(sectionName) && !this.projectLoaded) {
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

        // Store current section
        this.currentSection = sectionName;

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
        // Verify project is loaded
        if (!this.projectLoaded) {
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
        // Verify project is loaded
        if (!this.projectLoaded) {
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
        // Verify project is loaded
        if (!this.projectLoaded) {
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
            setTimeout(() => {
                this.app.capacityManager.renderResourceOverview();
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
        this.projectLoaded = loaded;
        this.projectDirty = dirty;
        this.updateProjectStatus();
        this.updateProjectSubSections();

        // If project is being closed and user is viewing a project sub-section,
        // navigate back to projects main page
        if (!loaded && this.isProjectSubSection(this.currentSection)) {
            this.navigateTo('projects');
        }
    }

    updateProjectStatus() {
        const indicator = document.getElementById('nav-project-status');
        if (indicator) {
            // Reset classes
            indicator.className = 'project-status-indicator';

            if (!this.projectLoaded) {
                indicator.classList.add('no-project');
            } else if (this.projectDirty) {
                indicator.classList.add('project-dirty');
            } else {
                indicator.classList.add('project-loaded');
            }
        }
    }

    updateProjectSubSections() {
        // Only select nav-child elements under projects-children, not capacity-children
        const subSections = document.querySelectorAll('#projects-children .nav-child[data-section]');
        subSections.forEach(child => {
            if (this.projectLoaded) {
                child.classList.remove('disabled');
            } else {
                child.classList.add('disabled');
            }
        });
    }

    onProjectLoaded() {
        this.setProjectStatus(true, false);

        // Auto-expand projects section
        if (!this.projectsExpanded) {
            this.projectsExpanded = true;
            this.updateProjectsExpansion();
        }
    }

    onProjectClosed() {
        this.setProjectStatus(false, false);
    }

    onProjectDirty(isDirty) {
        this.setProjectStatus(this.projectLoaded, isDirty);
    }

    getNavigationState() {
        return {
            currentSection: this.currentSection,
            projectLoaded: this.projectLoaded,
            projectDirty: this.projectDirty,
            projectsExpanded: this.projectsExpanded,
            capacityExpanded: this.capacityExpanded
        };
    }

    restoreNavigationState(state) {
        if (state) {
            this.projectLoaded = state.projectLoaded || false;
            this.projectDirty = state.projectDirty || false;
            this.projectsExpanded = state.projectsExpanded || false;
            this.capacityExpanded = state.capacityExpanded || false;

            this.updateProjectStatus();
            this.updateProjectSubSections();
            this.updateProjectsExpansion();
            this.updateCapacityExpansion();

            if (state.currentSection) {
                this.navigateTo(state.currentSection);
            }
        }
    }

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