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

export interface PhaseResource {
  vendorId: string;
  jobCluster: string;
  seniority: string;
  location: string;
  deliveryModel: string;
}

export interface SelectedPhaseResources {
  G1: Partial<PhaseResource> | null;
  G2: Partial<PhaseResource> | null;
  TA: Partial<PhaseResource> | null;
  PM: Partial<PhaseResource> | null;
}

export interface PhasesTotals {
  manDays: number;
  manDaysByResource: { G1: number; G2: number; TA: number; PM: number };
  costByResource: { G1: number; G2: number; TA: number; PM: number };
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

  async updateSelectedPhaseResource(resourceType: string, resource: Partial<PhaseResource> | null): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      store.getState().updateSelectedPhaseResource(resourceType, resource);
      this.calculateTotals();
    } catch (error) {
      console.error('Failed to update selected phase resource:', error);
      throw error;
    }
  }

  openRateSpecModal(role: string): void {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      store.getState().openRateSpecModal(role);
    } catch (error) {
      console.error('Failed to open rate specification modal:', error);
      throw error;
    }
  }

  closeRateSpecModal(): void {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      store.getState().closeRateSpecModal();
    } catch (error) {
      console.error('Failed to close rate specification modal:', error);
      throw error;
    }
  }

  async loadPhaseData(): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      store.getState().initializePhases();
      await this.loadAvailableSuppliers();
      this.calculateDevelopmentPhase();
      this.calculateTotals();
      console.log('Phases data loaded successfully');
    } catch (error) {
      console.error('Failed to load phases data:', error);
      throw error;
    }
  }

  async loadAvailableSuppliers(): Promise<void> {
    try {
      const configManager = this.getConfigManager();
      const store = this.getStore();
      if (!configManager || !store) throw new Error('Config manager or store not available');
      const state = store.getState();
      const currentProject = state.currentProject;
      if (!currentProject) throw new Error('No project loaded');
      const projectConfig = configManager.getProjectConfig(currentProject.config);
      const allSuppliers = projectConfig.vendors || [];
      state.loadAvailableSuppliers(allSuppliers);
      console.log(`Loaded ${allSuppliers.length} available suppliers`);
    } catch (error) {
      console.error('Failed to load available suppliers:', error);
      throw error;
    }
  }

  calculateDevelopmentPhase(): void {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      store.getState().calculateDevelopmentPhase();
      console.log('Development phase calculated');
    } catch (error) {
      console.error('Failed to calculate development phase:', error);
      throw error;
    }
  }

  calculateDevelopmentPhaseG2Cost(developmentPhase: PhaseData, resourceRates: ResourceRates): number {
    try {
      const store = this.getStore();
      const configManager = this.getConfigManager();
      if (!store || !configManager) throw new Error('Store or ConfigManager not available');

      const state = store.getState();
      const { currentProject, selectedPhaseResources } = state;
      let g2Cost = 0;

      if (currentProject?.features) {
        const g2EffortPercent = developmentPhase.effort.G2 / 100;
        currentProject.features.forEach((feature: any) => {
          const featureManDays = parseFloat(feature.manDays) || 0;
          // Use feature.rate directly (saved when feature was created) with fallback to resourceRates.G2
          const featureRate = parseFloat(feature.rate) || resourceRates.G2;
          g2Cost += featureManDays * featureRate * g2EffortPercent;
        });

        const coverageMDs = currentProject.coverage || 0;
        if (coverageMDs > 0 && selectedPhaseResources?.G2) {
          g2Cost += coverageMDs * resourceRates.G2 * g2EffortPercent;
        }
      }
      return Math.round(g2Cost);
    } catch (error) {
      console.error('Failed to calculate development G2 cost:', error);
      return 0;
    }
  }

  calculateManDaysByResource(totalManDays: number, effort: { G1: number; G2: number; TA: number; PM: number }): { G1: number; G2: number; TA: number; PM: number } {
    return {
      G1: (totalManDays * effort.G1) / 100,
      G2: (totalManDays * effort.G2) / 100,
      TA: (totalManDays * effort.TA) / 100,
      PM: (totalManDays * effort.PM) / 100
    };
  }

  calculateCostByResourceForPhase(phase: PhaseData): { G1: number; G2: number; TA: number; PM: number } {
    try {
      const store = this.getStore();
      const configManager = this.getConfigManager();
      if (!store || !configManager) {
        console.warn(`[PhasesActions] calculateCostByResourceForPhase(${phase.id}): store or configManager not available`, { store: !!store, configManager: !!configManager });
        return { G1: 0, G2: 0, TA: 0, PM: 0 };
      }

      const state = store.getState();
      const { selectedPhaseResources } = state;
      const resourceRates: ResourceRates = { G1: 0, G2: 0, TA: 0, PM: 0 };

      const missingRates: string[] = [];

      console.log(`[Phases] calculateCostByResourceForPhase called for phase: ${phase.id}`);
      console.log(`[Phases] selectedPhaseResources:`, selectedPhaseResources);

      for (const role of Object.keys(selectedPhaseResources) as Array<keyof SelectedPhaseResources>) {
        const resource = selectedPhaseResources[role];
        if (resource && resource.vendorId && resource.jobCluster && resource.seniority && resource.location && resource.deliveryModel) {
          const rateDetails = configManager.getRate(resource);
          resourceRates[role] = rateDetails.realRate || 0;
          console.log(`[Phases] Rate for ${role}: ${resourceRates[role]} (from configManager)`);
          if (resourceRates[role] === 0) {
            console.error(`[Phases] CRITICAL: Rate is 0 for ${role} in phase "${phase.id}". Resource config:`, resource);
            missingRates.push(role);
          }
        } else {
          resourceRates[role] = 0;
          console.error(`[Phases] CRITICAL: Missing resource configuration for ${role} in phase "${phase.id}". Resource:`, resource);
          missingRates.push(role);
        }
      }

      // Show toast if any rates are missing
      if (missingRates.length > 0) {
        const errorMsg = `Rate not configured for: ${missingRates.join(', ')}. Click "Specify full rate details" to configure.`;
        this.showErrorNotification(errorMsg);
      }

      const manDaysByResource = this.calculateManDaysByResource(phase.manDays, phase.effort);

      if (phase.id === 'development') {
        const g2Cost = this.calculateDevelopmentPhaseG2Cost(phase, resourceRates);
        return {
            G1: Math.round(manDaysByResource.G1 * resourceRates.G1),
            G2: g2Cost,
            TA: Math.round(manDaysByResource.TA * resourceRates.TA),
            PM: Math.round(manDaysByResource.PM * resourceRates.PM)
        };
      }

      return {
        G1: Math.round(manDaysByResource.G1 * resourceRates.G1),
        G2: Math.round(manDaysByResource.G2 * resourceRates.G2),
        TA: Math.round(manDaysByResource.TA * resourceRates.TA),
        PM: Math.round(manDaysByResource.PM * resourceRates.PM)
      };
    } catch (error) {
      console.error('Failed to calculate cost by resource for phase:', error);
      return { G1: 0, G2: 0, TA: 0, PM: 0 };
    }
  }

  async updatePhaseManDays(phaseId: string, manDays: number): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      store.getState().updatePhaseManDays(phaseId, manDays);
      this.calculateTotals();
      store.getState().markDirty();
    } catch (error) {
      console.error('Failed to update phase man days:', error);
      throw error;
    }
  }

  async updatePhaseEffort(phaseId: string, resourceType: string, percentage: number): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      store.getState().updatePhaseEffort(phaseId, resourceType, percentage);
      this.calculateTotals();
      store.getState().markDirty();
    } catch (error) {
      console.error('Failed to update phase effort:', error);
      throw error;
    }
  }

  validateEffortPercentages(phaseId: string): 'valid' | 'invalid' | 'warning' {
    try {
      const store = this.getStore();
      if (!store) return 'invalid';
      const phase = store.getState().currentPhases.find((p: PhaseData) => p.id === phaseId);
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

  calculateTotals(): void {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      store.getState().calculatePhasesTotals();
    } catch (error) {
      console.error('Failed to calculate totals:', error);
      throw error;
    }
  }

  async savePhases(): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      const state = store.getState();
      const { currentPhases, selectedPhaseResources } = state;
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
      phasesData.selectedPhaseResources = selectedPhaseResources;
      state.updateProjectPhases(phasesData);
    } catch (error) {
      console.error('Failed to save phases:', error);
      throw error;
    }
  }

  getAvailableSuppliersByRole(role: string): any[] {
    try {
      const store = this.getStore();
      if (!store) return [];
      return store.getState().availableSuppliers || [];
    } catch (error) {
      console.error('Failed to get suppliers by role:', error);
      return [];
    }
  }

  getDevelopmentNoticeText(): string {
    try {
      const store = this.getStore();
      if (!store) return 'Development Phase: calculated from features + coverage';
      const state = store.getState();
      const { currentProject, currentPhases } = state;
      if (!currentProject) return 'Development Phase: calculated from features + coverage';
      const featuresCount = currentProject.features?.length || 0;
      const developmentPhase = currentPhases.find((p: PhaseData) => p.id === 'development');
      const developmentDays = developmentPhase?.manDays || 0;
      const coverageMDs = currentProject.coverage || 0;
      return `Development Phase: Man Days are automatically calculated from ${featuresCount} features + coverage (Coverage: ${coverageMDs.toFixed(1)} days, Total: ${developmentDays.toFixed(1)} days). You can configure effort distribution percentages.`;
    } catch (error) {
      console.error('Failed to get development notice text:', error);
      return 'Development Phase: calculated from features + coverage';
    }
  }

  /**
   * Show error notification toast
   */
  showErrorNotification(message: string): void {
    try {
      const store = this.getStore();
      if (!store) {
        console.warn('Store not available for notification');
        return;
      }

      const state = store.getState();
      if (state.addNotification) {
        const notificationConfig = this.createNotificationConfig(message, 'error');
        state.addNotification(notificationConfig);
      }
    } catch (error) {
      console.error('Failed to show error notification:', error);
    }
  }

  private createNotificationConfig(message: string, type: string): any {
    return {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
      message: message,
      type: type,
      duration: 5000,
      persistent: false,
      actions: [],
      onClick: null,
      onClose: null,
      timestamp: new Date()
    };
  }
}

export const phasesActions = new PhasesActions();

if (typeof window !== 'undefined') {
  (window as any).phasesActions = phasesActions;
  console.log('✅ PhasesActions available globally');
}
