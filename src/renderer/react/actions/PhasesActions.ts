/**
 * Phases Actions - Centralized business logic for project phases operations
 * Following the application's state manager + actions + dispatcher pattern
 */

export interface PhaseData {
  id: string;
  name: string;
  description: string;
  type: string;
  defaultEffort: { G1: number; G2: number; TA: number; PM: number };
  editable: boolean;
  calculated?: boolean;
  manDays: number;
  effort: { G1: number; G2: number; TA: number; PM: number };
  assignedResources: any[];
  cost: number;
  lastModified: string;
}

export interface ResourceRates {
  G1: number;
  G2: number; 
  TA: number;
  PM: number;
}

export interface SelectedSuppliers {
  G1: string | null;
  G2: string | null;
  TA: string | null;
  PM: string | null;
}

export interface PhasesTotals {
  manDays: number;
  manDaysByResource: { G1: number; G2: number; TA: number; PM: number };
  costByResource: { G1: number; G2: number; TA: number; PM: number };
}

export interface Supplier {
  id: string;
  name: string;
  lta: string;
  role: string;
  department: string;
  realRate: number;
  officialRate: number;
  isGlobal?: boolean;
}

export class PhasesActions {
  private getApp() {
    return (window as any).app;
  }

  private getConfigManager() {
    const app = this.getApp();
    return app?.managers?.config;
  }

  private getStore() {
    return (window as any).appStore;
  }

  /**
   * Initialize phases data from current project or defaults
   */
  async loadPhaseData(): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      
      // Initialize phases
      state.initializePhases();
      
      // Load available suppliers
      await this.loadAvailableSuppliers();
      
      // Calculate development phase from features + coverage
      this.calculateDevelopmentPhase();
      
      // Calculate totals
      this.calculateTotals();
      
      console.log('Phases data loaded successfully');
    } catch (error) {
      console.error('Failed to load phases data:', error);
      throw error;
    }
  }

  /**
   * Load available suppliers from configuration
   */
  async loadAvailableSuppliers(): Promise<void> {
    try {
      const configManager = this.getConfigManager();
      const store = this.getStore();
      
      if (!configManager || !store) {
        throw new Error('Config manager or store not available');
      }

      const state = store.getState();
      const currentProject = state.currentProject;
      
      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // Get project configuration
      const projectConfig = configManager.getProjectConfig(currentProject.config);
      const allSuppliers = [...projectConfig.suppliers, ...projectConfig.internalResources];
      
      // Load suppliers into store
      state.loadAvailableSuppliers(allSuppliers);
      
      // Update resource rates from selected suppliers
      this.updateResourceRatesFromSuppliers();
      
      console.log(`Loaded ${allSuppliers.length} available suppliers`);
    } catch (error) {
      console.error('Failed to load available suppliers:', error);
      throw error;
    }
  }

  /**
   * Update resource rates based on selected suppliers
   */
  private updateResourceRatesFromSuppliers(): void {
    try {
      const store = this.getStore();
      if (!store) return;

      const state = store.getState();
      const { selectedSuppliers, availableSuppliers } = state;
      
      const updatedRates: ResourceRates = { ...state.resourceRates };
      
      Object.keys(selectedSuppliers).forEach((resourceType) => {
        const selectedSupplierId = selectedSuppliers[resourceType as keyof SelectedSuppliers];
        if (selectedSupplierId) {
          const supplier = availableSuppliers.find((s: Supplier) => s.id === selectedSupplierId);
          if (supplier) {
            updatedRates[resourceType as keyof ResourceRates] = supplier.realRate || supplier.officialRate;
          }
        }
      });
      
      // Update rates in store
      Object.keys(updatedRates).forEach((resourceType) => {
        const rate = updatedRates[resourceType as keyof ResourceRates];
        state.setSelectedSupplier(resourceType, selectedSuppliers[resourceType as keyof SelectedSuppliers]);
      });

    } catch (error) {
      console.error('Failed to update resource rates from suppliers:', error);
    }
  }

  /**
   * Calculate development phase man days from features + coverage
   */
  calculateDevelopmentPhase(): void {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      state.calculateDevelopmentPhase();
      
      console.log('Development phase calculated');
    } catch (error) {
      console.error('Failed to calculate development phase:', error);
      throw error;
    }
  }

  /**
   * Calculate development costs using feature-specific supplier rates
   */
  calculateDevelopmentCosts(developmentPhase: PhaseData): { G1: number; G2: number; TA: number; PM: number } {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      const { currentProject, availableSuppliers, resourceRates } = state;

      // For Development: G2 cost uses feature-specific supplier rates
      let g2Cost = 0;
      
      if (currentProject?.features) {
        const g2EffortPercent = developmentPhase.effort.G2 / 100;
        
        currentProject.features.forEach((feature: any) => {
          const featureManDays = parseFloat(feature.manDays) || 0;
          
          // Find feature-specific supplier
          const featureSupplier = availableSuppliers.find((s: Supplier) => s.id === feature.supplier);
          const featureRate = featureSupplier ? (featureSupplier.realRate || featureSupplier.officialRate || 0) : 0;
          
          // Calculate cost using feature-specific rate
          g2Cost += featureManDays * featureRate * g2EffortPercent;
        });
      }
      
      // Calculate man days by resource for other types
      const manDaysByResource = this.calculateManDaysByResource(developmentPhase.manDays, developmentPhase.effort);
      
      return {
        G1: Math.round(manDaysByResource.G1 * resourceRates.G1),
        G2: Math.round(g2Cost),
        TA: Math.round(manDaysByResource.TA * resourceRates.TA),
        PM: Math.round(manDaysByResource.PM * resourceRates.PM)
      };
    } catch (error) {
      console.error('Failed to calculate development costs:', error);
      return { G1: 0, G2: 0, TA: 0, PM: 0 };
    }
  }

  /**
   * Calculate man days by resource type
   */
  calculateManDaysByResource(totalManDays: number, effort: { G1: number; G2: number; TA: number; PM: number }): { G1: number; G2: number; TA: number; PM: number } {
    return {
      G1: (totalManDays * effort.G1) / 100,
      G2: (totalManDays * effort.G2) / 100,
      TA: (totalManDays * effort.TA) / 100,
      PM: (totalManDays * effort.PM) / 100
    };
  }

  /**
   * Calculate cost by resource for a phase
   */
  calculateCostByResource(manDaysByResource: { G1: number; G2: number; TA: number; PM: number }, phase: PhaseData): { G1: number; G2: number; TA: number; PM: number } {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      
      // Special calculation for Development phase
      if (phase.id === 'development') {
        return this.calculateDevelopmentCosts(phase);
      }
      
      // Normal calculation for other phases
      const { resourceRates } = state;
      return {
        G1: Math.round(manDaysByResource.G1 * resourceRates.G1),
        G2: Math.round(manDaysByResource.G2 * resourceRates.G2),
        TA: Math.round(manDaysByResource.TA * resourceRates.TA),
        PM: Math.round(manDaysByResource.PM * resourceRates.PM)
      };
    } catch (error) {
      console.error('Failed to calculate cost by resource:', error);
      return { G1: 0, G2: 0, TA: 0, PM: 0 };
    }
  }

  /**
   * Update phase man days
   */
  async updatePhaseManDays(phaseId: string, manDays: number): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      
      // Update man days
      state.updatePhaseManDays(phaseId, manDays);
      
      // Recalculate totals
      this.calculateTotals();
      
      // Mark project as dirty
      state.markDirty();
      
      console.log(`Phase ${phaseId} man days updated to ${manDays}`);
    } catch (error) {
      console.error('Failed to update phase man days:', error);
      throw error;
    }
  }

  /**
   * Update phase effort distribution
   */
  async updatePhaseEffort(phaseId: string, resourceType: string, percentage: number): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      
      // Update effort percentage
      state.updatePhaseEffort(phaseId, resourceType, percentage);
      
      // Recalculate totals
      this.calculateTotals();
      
      // Mark project as dirty
      state.markDirty();
      
      console.log(`Phase ${phaseId} effort ${resourceType} updated to ${percentage}%`);
    } catch (error) {
      console.error('Failed to update phase effort:', error);
      throw error;
    }
  }

  /**
   * Set selected supplier for resource type
   */
  async setSelectedSupplier(resourceType: string, supplierId: string): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      
      // Update selected supplier
      state.setSelectedSupplier(resourceType, supplierId);
      
      // Recalculate totals
      this.calculateTotals();
      
      // Mark project as dirty
      state.markDirty();
      
      console.log(`Selected supplier for ${resourceType}: ${supplierId}`);
    } catch (error) {
      console.error('Failed to set selected supplier:', error);
      throw error;
    }
  }

  /**
   * Validate effort percentages for a phase
   */
  validateEffortPercentages(phaseId: string): 'valid' | 'invalid' | 'warning' {
    try {
      const store = this.getStore();
      if (!store) return 'invalid';

      const state = store.getState();
      const phase = state.currentPhases.find((p: PhaseData) => p.id === phaseId);
      
      if (!phase) return 'invalid';
      
      const total = Object.values(phase.effort).reduce((sum, val) => sum + val, 0);
      
      if (total === 100) return 'valid';
      if (total > 100) return 'invalid';
      return 'warning';
    } catch (error) {
      console.error('Failed to validate effort percentages:', error);
      return 'invalid';
    }
  }

  /**
   * Calculate totals for all phases
   */
  calculateTotals(): void {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      state.calculatePhasesTotals();
      
      console.log('Phases totals calculated');
    } catch (error) {
      console.error('Failed to calculate totals:', error);
      throw error;
    }
  }

  /**
   * Save phases data to project
   */
  async savePhases(): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      const { currentPhases, selectedSuppliers } = state;
      
      // Convert current phases to project phases format
      const phasesData: any = {};
      currentPhases.forEach((phase: PhaseData) => {
        phasesData[phase.id] = {
          manDays: phase.manDays,
          effort: phase.effort,
          assignedResources: phase.assignedResources,
          cost: phase.cost,
          lastModified: phase.lastModified
        };
      });
      
      // Add selected suppliers
      phasesData.selectedSuppliers = selectedSuppliers;
      
      // Update project phases
      state.updateProjectPhases(phasesData);
      
      console.log('Phases data saved to project');
    } catch (error) {
      console.error('Failed to save phases:', error);
      throw error;
    }
  }

  /**
   * Get available suppliers filtered by role
   */
  getAvailableSuppliersByRole(role: string): Supplier[] {
    try {
      const store = this.getStore();
      if (!store) return [];

      const state = store.getState();
      return state.availableSuppliers.filter((supplier: Supplier) => supplier.role === role);
    } catch (error) {
      console.error('Failed to get suppliers by role:', error);
      return [];
    }
  }

  /**
   * Get display text for development notice
   */
  getDevelopmentNoticeText(): string {
    try {
      const store = this.getStore();
      if (!store) return 'Development Phase: calculated from features + coverage';

      const state = store.getState();
      const { currentProject } = state;
      
      if (!currentProject) return 'Development Phase: calculated from features + coverage';
      
      const featuresCount = currentProject.features?.length || 0;
      const developmentPhase = state.currentPhases.find((p: PhaseData) => p.id === 'development');
      const developmentDays = developmentPhase?.manDays || 0;
      const coverageMDs = currentProject.coverage?.manDays || 0;
      
      return `Development Phase: Man Days are automatically calculated from ${featuresCount} features + coverage (Coverage: ${coverageMDs.toFixed(1)} days, Total: ${developmentDays.toFixed(1)} days). You can configure effort distribution percentages.`;
    } catch (error) {
      console.error('Failed to get development notice text:', error);
      return 'Development Phase: calculated from features + coverage';
    }
  }
}

// Create singleton instance
export const phasesActions = new PhasesActions();

// Make available globally for store integration
if (typeof window !== 'undefined') {
  (window as any).phasesActions = phasesActions;
  console.log('✅ PhasesActions available globally');
}