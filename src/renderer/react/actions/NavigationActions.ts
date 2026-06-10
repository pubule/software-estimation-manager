/**
 * NavigationActions.ts - Business logic for navigation and state preservation
 *
 * PATTERN: State/Actions/Dispatcher
 * - ALL navigation logic here
 * - Manages state preservation during navigation
 * - Prevents unnecessary resets of user configurations
 */

import { getAppStore, getApp } from '../utils/electronBridge';

export class NavigationActions {
  /**
   * Get store instance (pattern standard)
   */
  private getStore() {
    return getAppStore();
  }

  /**
   * Navigate to section preserving existing state
   */
  navigateToSection(section: string): void {
    const store = this.getStore();
    if (!store) {
      console.warn('Store not available for navigation');
      return;
    }

    const state = store.getState();
    
    // Business logic: preserve existing state if already configured
    if (section === 'phases') {
      this.navigateToPhases(state);
    } else if (section === 'features') {
      this.navigateToFeatures(state);
    } else {
      // Standard navigation for other sections
      state.setCurrentSection(section);
    }

    if (import.meta.env.DEV) console.log(`Navigation: Moved to ${section}, state preserved`);
  }

  /**
   * Set component initialization state
   * PATTERN: State/Actions/Dispatcher - Delegate to store
   */
  setComponentInitialized(component: string, initialized: boolean): void {
    const store = this.getStore();
    if (!store) {
      console.warn('Store not available for setComponentInitialized');
      return;
    }

    const state = store.getState();
    state.setComponentInitialized(component, initialized);
    
    if (import.meta.env.DEV) console.log(`Navigation: Component ${component} initialized: ${initialized}`);
  }

  /**
   * Check if component is initialized
   */
  isComponentInitialized(component: string): boolean {
    const store = this.getStore();
    if (!store) return false;

    const state = store.getState();
    return state.isComponentInitialized(component);
  }

  /**
   * Phase-specific navigation - preserves configurations
   */
  private navigateToPhases(state: any): void {
    const currentPhases = state.currentPhases || [];
    const hasExistingPhases = currentPhases.length > 0;
    const hasSelectedSuppliers = Object.values(state.selectedSuppliers || {}).some(s => s !== null);

    // Business logic: if configurations already exist, do NOT reset
    if (hasExistingPhases && hasSelectedSuppliers) {
      if (import.meta.env.DEV) console.log('Phases already configured, preserving existing state');
      state.setCurrentSection('phases');
      return;
    }

    // Only initialize if necessary
    if (!hasExistingPhases) {
      if (import.meta.env.DEV) console.log('Initializing phases for first time');
      state.initializePhases();
    }

    state.setCurrentSection('phases');
  }

  /**
   * Feature-specific navigation with state preservation
   */
  private navigateToFeatures(state: any): void {
    // Business logic: preserve features state if it exists
    const hasFilteredFeatures = state.filteredFeatures && state.filteredFeatures.length > 0;
    const hasSort = state.currentSort && state.currentSort.field;
    const hasEditingFeature = state.editingFeature !== null;

    // Preserve features state before navigating
    if (hasFilteredFeatures || hasSort || hasEditingFeature) {
      const featuresState = {
        filteredFeatures: state.filteredFeatures,
        currentSort: state.currentSort,
        editingFeature: state.editingFeature,
        featureModalOpen: state.featureModalOpen,
        featureModalEditingItem: state.featureModalEditingItem
      };

      state.preserveSectionState('features', featuresState);
      if (import.meta.env.DEV) console.log('Features state preserved before navigation');
    }

    state.setCurrentSection('features');
  }
  
  /**
   * Navigate to projects page
   */
  navigateToProjects(): void {
    const store = this.getStore();
    if (!store) return;

    const state = store.getState();

    // Projects is the home page, no special preservation needed
    // But verify if the React wrapper already exists
    const isInitialized = state.isComponentInitialized('projects');

    if (!isInitialized) {
      if (import.meta.env.DEV) console.log('Projects page will initialize for first time');
    } else {
      if (import.meta.env.DEV) console.log('Projects wrapper already initialized, preserving state');
    }

    state.setCurrentSection('projects');
  }

  /**
   * Navigate to calculations page
   */
  navigateToCalculations(): void {
    const store = this.getStore();
    if (!store) return;

    const state = store.getState();

    // Verify that a project is loaded
    if (!state.currentProject) {
      console.warn('Cannot navigate to calculations: No project loaded');
      return;
    }

    // Preserve current section state if necessary
    this.preserveCurrentSectionState();

    // Check if calculations React wrapper is already initialized
    const isInitialized = state.isComponentInitialized('calculations');

    if (!isInitialized) {
      if (import.meta.env.DEV) console.log('Calculations page will initialize for first time');
    } else {
      if (import.meta.env.DEV) console.log('Calculations wrapper already initialized, preserving state');
    }

    state.setCurrentSection('calculations');
    if (import.meta.env.DEV) console.log('Navigated to calculations page');
  }
  
  /**
   * Navigate to history/versioning page
   */
  navigateToHistory(): void {
    const store = this.getStore();
    if (!store) return;

    const state = store.getState();
    state.setCurrentSection('history');
    if (import.meta.env.DEV) console.log('Navigated to version history page');
  }

  /**
   * Preserve state before navigating (for sections that need it)
   */
  preserveCurrentSectionState(): void {
    const store = this.getStore();
    if (!store) return;

    const state = store.getState();
    const currentSection = state.currentSection;

    // Preserve state of critical sections
    if (currentSection === 'phases') {
      this.preservePhasesStateBeforeLeaving();
    } else if (currentSection === 'features') {
      this.preserveFeaturesStateBeforeLeaving();
    }
  }

  /**
   * Preserve phases state when leaving the section (Pattern State/Actions/Dispatcher)
   */
  preservePhasesStateBeforeLeaving(): void {
    const store = this.getStore();
    if (!store) return;
    
    const state = store.getState();
    
    if (state.currentSection === 'phases') {
      const phasesState = {
        currentPhases: state.currentPhases,
        selectedSuppliers: state.selectedSuppliers,  // Critical for preserving supplier selections
        resourceRates: state.resourceRates,
        phasesTotals: state.phasesTotals
      };
      
      state.preserveSectionState('phases', phasesState);
      if (import.meta.env.DEV) console.log('NavigationActions: Preserved phases state including supplier selections');
    }
  }

  /**
   * Restore phases state when entering the section (Pattern State/Actions/Dispatcher)
   */
  restorePhasesStateIfExists(): boolean {
    const store = this.getStore();
    if (!store) return false;
    
    const state = store.getState();
    
    // Check if we have preserved phases state
    if (state.navigationState?.preservedStates?.has 
        && typeof state.navigationState.preservedStates.has === 'function' 
        && state.navigationState.preservedStates.has('phases')) {
      state.restoreSectionState('phases');
      if (import.meta.env.DEV) console.log('NavigationActions: Restored phases state including supplier selections');
      return true;
    }
    
    return false;
  }

  /**
   * Preserve features state when leaving
   */
  preserveFeaturesStateBeforeLeaving(): void {
    const store = this.getStore();
    if (!store) return;
    
    const state = store.getState();
    
    if (state.currentSection === 'features') {
      const featuresState = {
        filteredFeatures: state.filteredFeatures,
        currentSort: state.currentSort,
        editingFeature: state.editingFeature,
        featureModalOpen: state.featureModalOpen,
        featureModalEditingItem: state.featureModalEditingItem
      };
      
      state.preserveSectionState('features', featuresState);
      if (import.meta.env.DEV) console.log('NavigationActions: Preserved features state');
    }
  }

  /**
   * Check if section needs state preservation
   */
  needsStatePreservation(section: string): boolean {
    return ['phases', 'features'].includes(section);
  }

  /**
   * Force reset a section (only when explicitly requested)
   */
  resetSection(section: string): void {
    const store = this.getStore();
    if (!store) return;

    const state = store.getState();

    if (section === 'phases') {
      if (import.meta.env.DEV) console.log('Force resetting phases section');
      state.initializePhases(); // Force re-init
    }
  }

  /**
   * Get current navigation state
   */
  getCurrentSection(): string {
    const store = this.getStore();
    if (!store) return 'projects';
    
    const state = store.getState();
    return state.currentSection || 'projects';
  }


  /**
   * Force component re-initialization (only when necessary)
   */
  forceComponentReInit(section: string): void {
    const navigationManager = getApp()?.navigationManager;
    if (!navigationManager) return;

    if (section === 'phases') {
      navigationManager.reactPhasesWrapper = null;
      if (import.meta.env.DEV) console.log('Forced phases component re-initialization');
    }
  }
}