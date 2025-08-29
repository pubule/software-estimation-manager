/**
 * NavigationActions.ts - Business logic per navigation e state preservation
 * 
 * PATTERN: State/Actions/Dispatcher
 * - TUTTA la logica navigation qui
 * - Gestisce preservation dello state durante navigation
 * - Previene reset inutili delle configurazioni utente
 */

export class NavigationActions {
  /**
   * Get store instance (pattern standard)
   */
  private getStore() {
    return (window as any).appStore;
  }

  /**
   * Navigate to section preservando stato esistente
   */
  navigateToSection(section: string): void {
    const store = this.getStore();
    if (!store) {
      console.warn('Store not available for navigation');
      return;
    }

    const state = store.getState();
    
    // Business logic: preserve existing state se già configurato
    if (section === 'phases') {
      this.navigateToPhases(state);
    } else if (section === 'features') {
      this.navigateToFeatures(state);
    } else {
      // Standard navigation per altre sezioni
      state.setCurrentSection(section);
    }
    
    console.log(`Navigation: Moved to ${section}, state preserved`);
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
    
    console.log(`Navigation: Component ${component} initialized: ${initialized}`);
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
   * Navigation specifica per phases - preserva configurazioni
   */
  private navigateToPhases(state: any): void {
    const currentPhases = state.currentPhases || [];
    const hasExistingPhases = currentPhases.length > 0;
    const hasSelectedSuppliers = Object.values(state.selectedSuppliers || {}).some(s => s !== null);
    
    // Business logic: se ho già configurazioni, NON resettare
    if (hasExistingPhases && hasSelectedSuppliers) {
      console.log('Phases already configured, preserving existing state');
      state.setCurrentSection('phases');
      return;
    }
    
    // Solo se necessario, inizializza
    if (!hasExistingPhases) {
      console.log('Initializing phases for first time');
      state.initializePhases();
    }
    
    state.setCurrentSection('phases');
  }

  /**
   * Navigation specifica per features con state preservation
   */
  private navigateToFeatures(state: any): void {
    // Business logic: preserve features state se esiste
    const hasFilteredFeatures = state.filteredFeatures && state.filteredFeatures.length > 0;
    const hasSort = state.currentSort && state.currentSort.field;
    const hasEditingFeature = state.editingFeature !== null;
    
    // Preserve features state prima di navigare
    if (hasFilteredFeatures || hasSort || hasEditingFeature) {
      const featuresState = {
        filteredFeatures: state.filteredFeatures,
        currentSort: state.currentSort,
        editingFeature: state.editingFeature,
        featureModalOpen: state.featureModalOpen,
        featureModalEditingItem: state.featureModalEditingItem
      };
      
      state.preserveSectionState('features', featuresState);
      console.log('Features state preserved before navigation');
    }
    
    state.setCurrentSection('features');
  }
  
  /**
   * Navigation per projects page
   */
  navigateToProjects(): void {
    const store = this.getStore();
    if (!store) return;
    
    const state = store.getState();
    
    // Projects è la home page, non serve particolare preservation
    // Ma verifichiamo se wrapper React esiste già
    const isInitialized = state.isComponentInitialized('projects');
    
    if (!isInitialized) {
      console.log('Projects page will initialize for first time');
    } else {
      console.log('Projects wrapper already initialized, preserving state');
    }
    
    state.setCurrentSection('projects');
  }

  /**
   * Navigation per calculations page
   */
  navigateToCalculations(): void {
    const store = this.getStore();
    if (!store) return;
    
    const state = store.getState();
    
    // Verifica che ci sia un progetto caricato
    if (!state.currentProject) {
      console.warn('Cannot navigate to calculations: No project loaded');
      // Potresti aggiungere una notification qui se necessario
      return;
    }
    
    // Preserva stato della sezione corrente se necessario
    this.preserveCurrentSectionState();
    
    // Verifica se calculations wrapper React è già inizializzato
    const isInitialized = state.isComponentInitialized('calculations');
    
    if (!isInitialized) {
      console.log('Calculations page will initialize for first time');
      // Il wrapper verrà inizializzato dal ReactCalculationsWrapper
    } else {
      console.log('Calculations wrapper already initialized, preserving state');
    }
    
    state.setCurrentSection('calculations');
    console.log('Navigated to calculations page');
  }
  
  /**
   * Navigation per history/versioning page
   */
  navigateToHistory(): void {
    const store = this.getStore();
    if (!store) return;
    
    const state = store.getState();
    state.setCurrentSection('history');
    console.log('Navigated to version history page');
  }

  /**
   * Preserva stato prima di navigare (per sezioni che necessitano)
   */
  preserveCurrentSectionState(): void {
    const store = this.getStore();
    if (!store) return;

    const state = store.getState();
    const currentSection = state.currentSection;

    // Preserva stato sezioni critiche
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
      console.log('✅ NavigationActions: Preserved phases state including supplier selections');
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
      console.log('✅ NavigationActions: Restored phases state including supplier selections');
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
      console.log('✅ NavigationActions: Preserved features state');
    }
  }

  /**
   * Verifica se sezione necessita preservazione
   */
  needsStatePreservation(section: string): boolean {
    return ['phases', 'features'].includes(section);
  }

  /**
   * Reset forzato di una sezione (solo se richiesto esplicitamente)
   */
  resetSection(section: string): void {
    const store = this.getStore();
    if (!store) return;

    const state = store.getState();
    
    if (section === 'phases') {
      console.log('Force resetting phases section');
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
   * Force component re-initialization (solo se necessario)
   */
  forceComponentReInit(section: string): void {
    const navigationManager = (window as any).app?.navigationManager;
    if (!navigationManager) return;

    if (section === 'phases') {
      navigationManager.reactPhasesWrapper = null;
      console.log('Forced phases component re-initialization');
    }
  }
}