/**
 * CalculationsActions - Business Logic per Calculations Dashboard
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - TUTTA la business logic QUI (calcoli, processamento, validazioni)
 * - Aggiorna SOLO attraverso store methods
 * - Components chiamano SOLO questi metodi
 * 
 * ARCHITETTURA: Segregazione logica tramite Calculator Pattern
 * - FeatureBasedCalculator: Per modalità basata su feature/fasi
 * - WorkingPackageCalculator: Per modalità Working Package
 * - CalculatorFactory: Selezione dinamica del calculator appropriato
 */

import { CalculatorFactory, type CalculationResult } from './calculators';

export interface VendorCost {
  vendorId: string;
  vendorName: string;
  role: 'G1' | 'G2' | 'TA' | 'PM';
  department: string;
  officialRate: number;
  realRate: number;
  estimatedMDs: number;
  finalMDs: number;
  totCost: number;
  finalTotCost: number;
  isInternal: boolean;
  // WP mode specific fields
  category?: 'GTO' | 'GDS';
  allocationType?: 'primary' | 'secondary';
}

export interface KPIData {
  gto: {
    internal: number;
    external: number;
    total: number;
    internalPercentage: number;
    externalPercentage: number;
  };
  gds: {
    internal: number;
    external: number;
    total: number;
    internalPercentage: number;
    externalPercentage: number;
  };
  totalProject: number;
  totalInternalPercentage: number;
  totalExternalPercentage: number;
}

export interface CalculationsFilters {
  vendor: string;
  role: string;
  category: string; // 'all' | 'gto' | 'gds'
}

export interface WorkingPackageCategoryData {
  enabled: boolean;
  totalAmount: number;
  primaryVendorId: string | null;
  secondaryVendorId: string | null;
  secondaryPercentage: number;
}

export interface WorkingPackageData {
  enabled: boolean;
  gto: WorkingPackageCategoryData;
  gds: WorkingPackageCategoryData;
}

export interface WorkingPackageResource {
  vendorId: string;
  jobCluster: string;
  seniority: string;
  location: string;
  deliveryModel: string;
}

export class CalculationsActions {
  private getStore() { 
    return (window as any).appStore; 
  }

  private getConfigManager() {
    const app = this.getApp();
    return app?.managers?.config;
  }
  
  private getApp() {
    return (window as any).app;
  }


  /**
   * CORE BUSINESS LOGIC: Calcola tutti i costi del progetto
   * 
   * ARCHITETTURA: Utilizza CalculatorFactory per selezionare il calculator
   * appropriato in base alla modalita (Feature-based vs Working Package)
   */
  calculateProjectCosts(): void {
    try {
      const store = this.getStore();
      if (!store) {
        throw new Error('Store not available');
      }

      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      console.log('🧮 CalculationsActions: Calculating project costs...');

      // 🏭 FACTORY PATTERN: Seleziona e esegue il calculator appropriato
      const factory = new CalculatorFactory({
        store,
        configManager: this.getConfigManager()
      });

      const calculator = factory.createCalculator();

      // MODE-AWARE: Pass existing overrides from the CORRECT mode section
      const isWP = currentProject.workingPackageData?.enabled || false;
      let existingOverrides;
      if (isWP) {
        // WP mode: read WP overrides from project or store
        existingOverrides = currentProject.workingPackageOverrides || state.calculationsData?.workingPackage?.finalMDsOverrides || {};
      } else {
        // FB mode: read FB overrides from project or store
        existingOverrides = currentProject.featureBasedOverrides || state.calculationsData?.featureBased?.finalMDsOverrides || {};
      }
      const result = (calculator as any).calculate(existingOverrides);

      // Aggiorna store con i risultati
      this.updateStoreWithResults(result);

    } catch (error) {
      console.error('❌ CalculationsActions: Error calculating project costs:', error);
      throw error;
    }
  }

  /**
   * Aggiorna lo store con i risultati del calculator
   * Uses separate storage sections for each mode (featureBased vs workingPackage)
   */
  private updateStoreWithResults(result: CalculationResult): void {
    const store = this.getStore();
    const state = store.getState();

    // Preserva filtri esistenti
    const existingFilters = state.calculationsData?.filters;
    const existingFB = state.calculationsData?.featureBased || {};
    const existingWP = state.calculationsData?.workingPackage || {};

    // MODE-AWARE STORAGE: Pass only data portion (not full state) to setCalculationsData
    // The setCalculationsData method will build the full state structure internally
    let calculationsData: any;

    if (result.mode === 'working-package') {
      const wpResult = result as any;
      // WP mode: pass data with workingPackage entries/summary
      calculationsData = {
        vendorCosts: result.vendorCosts,
        kpiData: result.kpiData,
        workingPackage: {
          vendorCosts: result.vendorCosts,
          kpiData: result.kpiData,
          entries: wpResult.entries,
          summary: wpResult.summary,
          calculated: wpResult.calculated,
          projectTotal: wpResult.summary?.projectTotal || 0
        },
        filters: existingFilters || { vendor: 'all', role: 'all', category: 'all' }
      };
    } else {
      // FB mode: update FB section, keep WP section intact
      // Feature-based: apply FB overrides (if any)
      const fbOverrides = existingFB.finalMDsOverrides || {};
      const vendorCostsWithOverrides = this.applyFinalMDsOverridesWithCustom(result.vendorCosts, fbOverrides);

      calculationsData = {
        vendorCosts: vendorCostsWithOverrides,
        kpiData: result.kpiData,
        featureBased: {
          vendorCosts: vendorCostsWithOverrides,
          kpiData: result.kpiData,
          finalMDsOverrides: fbOverrides
        },
        filters: existingFilters || { vendor: 'all', role: 'all', category: 'all' }
      };
    }

    state.setCalculationsData(calculationsData);

    console.log(`✅ CalculationsActions: ${result.mode} calculation completed with`,
      result.vendorCosts.length, 'vendor costs');
  }

  /**
   * Restituisce KPI data vuoto
   */
  private getEmptyKPIData(): KPIData {
    return {
      gto: {
        internal: 0,
        external: 0,
        total: 0,
        internalPercentage: 0,
        externalPercentage: 0
      },
      gds: {
        internal: 0,
        external: 0,
        total: 0,
        internalPercentage: 0,
        externalPercentage: 0
      },
      totalProject: 0,
      totalInternalPercentage: 0,
      totalExternalPercentage: 0
    };
  }

  /**
   * Processa tutti i costi usando le stesse funzioni di Phases per coerenza assoluta.
   * Accumula MDs e costi per ruolo da tutte le fasi, poi assegna ai vendor configurati.
   */
  private processAllCosts(project: any): VendorCost[] {
    const phasesActions = (window as any).phasesActions;
    if (!phasesActions) {
      console.error('[Calculations] phasesActions not available');
      return [];
    }

    const selectedPhaseResources = project.phases?.selectedPhaseResources || project.phases?.selectedSuppliers || {};

    // Accumulatori per ruolo: sommiamo MDs e costi da tutte le fasi
    const roleTotals: Record<string, { mds: number; cost: number; vendorId: string; rate: number }> = {
      G1: { mds: 0, cost: 0, vendorId: '', rate: 0 },
      G2: { mds: 0, cost: 0, vendorId: '', rate: 0 },
      TA: { mds: 0, cost: 0, vendorId: '', rate: 0 },
      PM: { mds: 0, cost: 0, vendorId: '', rate: 0 }
    };

    // Ottieni vendor configurati e i loro rate per ogni ruolo
    ['G1', 'G2', 'TA', 'PM'].forEach(role => {
      const resourceConfig = selectedPhaseResources[role];
      if (resourceConfig) {
        const vendorId = typeof resourceConfig === 'string' ? resourceConfig : resourceConfig.vendorId;
        roleTotals[role].vendorId = vendorId;
        // Ottieni il rate usando la stessa logica di Phases
        const supplierData = this.getSupplierData(vendorId);
        if (supplierData && resourceConfig.jobCluster) {
          const configManager = this.getConfigManager();
          if (configManager) {
            const rateDetails = configManager.getRate({
              vendorId,
              jobCluster: resourceConfig.jobCluster,
              seniority: resourceConfig.seniority,
              location: resourceConfig.location || 'italy',
              deliveryModel: resourceConfig.deliveryModel || 'onsite'
            });
            roleTotals[role].rate = rateDetails?.realRate || 0;
          }
        }
      }
    });

    // Per ogni fase, accumula MDs e costi usando le funzioni di Phases
    Object.entries(project.phases || {}).forEach(([phaseKey, phaseData]: [string, any]) => {
      if (phaseKey === 'selectedSuppliers' || phaseKey === 'selectedPhaseResources') return;
      if (!phaseData.manDays || phaseData.manDays <= 0 || !phaseData.effort) return;

      const phase = {
        id: phaseKey,
        name: phaseKey,
        manDays: phaseData.manDays,
        effort: phaseData.effort
      };

      // Usa le stesse funzioni esatte di Phases
      const manDaysByResource = phasesActions.calculateManDaysByResource(phase.manDays, phase.effort);
      const costByResource = phasesActions.calculateCostByResourceForPhase(phase);

      // Accumula per ogni ruolo
      ['G1', 'G2', 'TA', 'PM'].forEach(role => {
        const mds = manDaysByResource[role] || 0;
        const cost = costByResource[role] || 0;
        roleTotals[role].mds += mds;
        roleTotals[role].cost += cost;
      });
    });

    // Crea VendorCost dai totali accumulati per vendor+ruolo
    const allCosts: VendorCost[] = [];
    ['G1', 'G2', 'TA', 'PM'].forEach(role => {
      const total = roleTotals[role];
      if (total.mds > 0 && total.vendorId) {
        const supplierData = this.getSupplierData(total.vendorId);
        if (supplierData) {
          // Usa il rate salvato o calcola dal costo/mds
          const effectiveRate = total.rate || (total.mds > 0 ? Math.round(total.cost / total.mds) : 0);
          const finalMDs = Math.round(total.mds * 10) / 10;

          allCosts.push({
            vendorId: total.vendorId,
            vendorName: supplierData.name || total.vendorId,
            role: role as 'G1' | 'G2' | 'TA' | 'PM',
            department: '',
            officialRate: effectiveRate,
            realRate: effectiveRate,
            estimatedMDs: finalMDs,
            finalMDs: finalMDs,
            totCost: Math.round(total.cost),
            finalTotCost: Math.round(finalMDs * effectiveRate),
            isInternal: supplierData.type?.toLowerCase() === 'internal' || false
          });
        }
      }
    });

    return allCosts;
  }

  /**
   * Processa costi dalle features
   */
  private processFeaturesCosts(features: any[]): VendorCost[] {
    const costs: VendorCost[] = [];

    features.forEach(feature => {
      // Use saved role and rate from feature if available
      let role = feature.role;
      let officialRate = feature.rate;
      let realRate = feature.rate;

      // Fallback: calculate rate if not saved in feature
      if (!officialRate) {
        const rateInfo = this.getRateInfo({
            vendorId: feature.supplier,
            jobClusterId: feature.jobCluster,
            seniority: feature.seniority,
            location: feature.location,
            deliveryModel: feature.deliveryModel,
        });

        if (!rateInfo || !rateInfo.officialRate) {
          console.warn('Rate not found for feature:', feature.id);
          return;
        }
        officialRate = rateInfo.officialRate;
        realRate = rateInfo.realRate;
      }

      // Fallback: get role from supplier data if not saved in feature
      if (!role) {
        const supplierData = this.getSupplierData(feature.supplier);
        role = this.getVendorRole(supplierData);
      }

      const supplierData = this.getSupplierData(feature.supplier); // Still needed for name, etc.

      const totCost = (feature.manDays || 0) * (realRate || 0);
      // Usa manDays direttamente come finalMDs per coerenza
      const finalMDs = feature.manDays || 0;

      const cost: VendorCost = {
        vendorId: feature.supplier,
        vendorName: supplierData?.name || feature.supplier,
        role: role,
        department: '', // Department rimosso - non significativo per G2 con location diverse
        officialRate: officialRate || 0,
        realRate: realRate || 0,
        estimatedMDs: feature.manDays || 0,
        finalMDs: finalMDs,
        totCost: totCost,
        finalTotCost: Math.round(finalMDs * (realRate || 0)),
        isInternal: supplierData?.type === 'internal'
      };

      costs.push(cost);
    });
    return costs;
  }

  /**
   * Processa costi dalle phases
   */
  private processPhasesCosts(phases: any): VendorCost[] {
    const costs: VendorCost[] = [];
    const tempRate = 400;
    
    // Extract selectedSuppliers from phases object (not from array)
    const selectedSuppliers = phases.selectedSuppliers || {};
    
    // Process each phase (skip selectedSuppliers entry)
    Object.entries(phases).forEach(([phaseKey, phaseData]: [string, any]) => {
      // Skip selectedSuppliers entry
      if (phaseKey === 'selectedSuppliers') return;
      
      if (phaseData.manDays && phaseData.manDays > 0 && phaseData.effort) {
        // Process each role in the phase effort distribution
        Object.entries(phaseData.effort).forEach(([role, percentage]: [string, any]) => {
          if (!percentage || percentage === 0) return;
          
          const supplierId = selectedSuppliers[role];
          if (!supplierId) return;
          
          const supplierData = this.getSupplierData(supplierId);
          if (!supplierData) return;

          // Calculate MDs for this role in this phase - no intermediate rounding to match Phases/Excel
          const phaseMDs = phaseData.manDays * (percentage / 100);
          const totCost = Math.round(phaseMDs * tempRate);
          // Usa phaseMDs direttamente come finalMDs per coerenza
          const finalMDs = phaseMDs;

          const cost: VendorCost = {
            vendorId: supplierId,
            vendorName: supplierData.name || supplierId,
            role: role as 'G1' | 'G2' | 'TA' | 'PM',
            department: supplierData.department || role,
            officialRate: tempRate,
            realRate: tempRate,
            estimatedMDs: phaseMDs,
            finalMDs: finalMDs,
            totCost: totCost,
            finalTotCost: Math.round(finalMDs * tempRate),
            isInternal: supplierData.type?.toLowerCase() === 'internal' || false
          };
          
          costs.push(cost);
        });
      }
    });
    
    return costs;
  }

  /**
   * Processa costi da phases NON-DEVELOPMENT (esclude development già processato da features)
   */
  private processNonDevelopmentPhases(phases: any): VendorCost[] {
    const costs: VendorCost[] = [];

    // Support both old structure (selectedSuppliers) and new structure (selectedPhaseResources)
    const selectedPhaseResources = phases.selectedPhaseResources || phases.selectedSuppliers || {};

    // Use PhasesActions to calculate costs - same source of truth as Phases page
    const phasesActions = (window as any).phasesActions;
    if (!phasesActions) {
      console.error('[Calculations] phasesActions not available on window');
      return [];
    }

    // Process each phase including development (for non-G2 roles)
    Object.entries(phases).forEach(([phaseKey, phaseData]: [string, any]) => {
      // Skip metadata entries only
      if (phaseKey === 'selectedSuppliers' || phaseKey === 'selectedPhaseResources') {
        return;
      }

      if (phaseData.manDays && phaseData.manDays > 0 && phaseData.effort) {
        // Create phase object compatible with PhasesActions
        const phase: any = {
          id: phaseKey,
          name: phaseKey,
          manDays: phaseData.manDays,
          effort: phaseData.effort
        };

        // Use PhasesActions to calculate manDays and costs - same as Phases page
        const manDaysByResource = phasesActions.calculateManDaysByResource(phase.manDays, phase.effort);
        const costByResource = phasesActions.calculateCostByResourceForPhase(phase);

        // Process each role
        Object.entries(phaseData.effort).forEach(([role, percentage]: [string, any]) => {
          // For development phase, skip G2 role (handled by features)
          if (phaseKey === 'development' && role === 'G2') {
            return;
          }
          if (!percentage || percentage === 0) return;

          // Get resource configuration for this role
          const resourceConfig = selectedPhaseResources[role];
          if (!resourceConfig) {
            console.warn(`No resource config found for role ${role} in phase ${phaseKey}`);
            return;
          }

          // Support both old format (string vendorId) and new format (object with vendorId)
          const supplierId = typeof resourceConfig === 'string' ? resourceConfig : resourceConfig.vendorId;
          if (!supplierId) {
            console.warn(`No supplierId found for role ${role} in phase ${phaseKey}`);
            return;
          }

          const supplierData = this.getSupplierData(supplierId);
          if (!supplierData) {
            console.warn(`Supplier data not found for ${supplierId}`);
            return;
          }

          // Get rate from resource config
          const rate = this.getPhaseResourceRate(resourceConfig, supplierData, role, phaseKey);

          // Use values from PhasesActions (source of truth)
          const roleMDs = manDaysByResource[role as keyof typeof manDaysByResource] || 0;
          const roleCost = costByResource[role as keyof typeof costByResource] || 0;

          const cost: VendorCost = {
            vendorId: supplierId,
            vendorName: supplierData.name || supplierId,
            role: role as 'G1' | 'G2' | 'TA' | 'PM',
            department: '',
            officialRate: rate,
            realRate: rate,
            estimatedMDs: roleMDs,
            finalMDs: roleMDs,
            totCost: roleCost,
            finalTotCost: roleCost,
            isInternal: supplierData.type?.toLowerCase() === 'internal' || false
          };

          costs.push(cost);
        });
      }
    });

    return costs;
  }

  /**
   * Get rate for a phase resource configuration
   */
  private getPhaseResourceRate(resourceConfig: any, supplierData: any, role?: string, phaseKey?: string): number {
    const context = role && phaseKey ? `[${phaseKey}/${role}]` : '';

    // If resourceConfig is a number (old format), use it directly
    if (typeof resourceConfig === 'number') {
      console.warn(`[Calculations] ${context} Using numeric rate - this is deprecated`);
      return resourceConfig;
    }

    // If resourceConfig is a string (old format vendorId), ERROR - rate cannot be determined
    if (typeof resourceConfig === 'string') {
      console.error(`[Calculations] CRITICAL ${context} Resource config is string "${resourceConfig}" - rate cannot be determined. Please reconfigure phase resources.`);
      return 0;
    }

    // If resourceConfig is null or undefined, ERROR
    if (!resourceConfig) {
      console.error(`[Calculations] CRITICAL ${context} Resource config is null/undefined - rate cannot be determined. Please configure phase resources.`);
      return 0;
    }

    // New format: object with jobCluster, seniority, location, deliveryModel
    if (resourceConfig.jobCluster && resourceConfig.seniority) {
      const configManager = this.getConfigManager();
      if (configManager) {
        const rateDetails = configManager.getRate({
          vendorId: resourceConfig.vendorId,
          jobCluster: resourceConfig.jobCluster,
          seniority: resourceConfig.seniority,
          location: resourceConfig.location || 'italy',
          deliveryModel: resourceConfig.deliveryModel || 'onsite',
        });
        if (rateDetails && rateDetails.realRate) {
          return rateDetails.realRate;
        }
        console.error(`[Calculations] CRITICAL ${context} Rate not found in configManager for:`, resourceConfig);
        return 0;
      }
      console.error(`[Calculations] CRITICAL ${context} ConfigManager not available`);
      return 0;
    }

    // Missing required fields
    console.error(`[Calculations] CRITICAL ${context} Resource config missing required fields (jobCluster, seniority):`, resourceConfig);
    return 0;
  }

  /**
   * Processa costi dal coverage - assegnato al vendor G2 selezionato
   * Applica l'effort percentage G2 (come fa Phases)
   */
  private processCoverageCost(coverage: number, g2Resource: any, g2EffortPercent: number = 100): VendorCost | null {
    // Support both old format (string vendorId) and new format (object with vendorId)
    const g2VendorId = typeof g2Resource === 'string' ? g2Resource : g2Resource?.vendorId;

    if (!g2VendorId) {
      console.warn('G2 vendor not found for coverage');
      return null;
    }

    const supplierData = this.getSupplierData(g2VendorId);
    if (!supplierData) {
      console.warn('G2 vendor data not found for coverage:', g2VendorId);
      return null;
    }

    // Get rate from resource config or calculate it
    const rate = this.getPhaseResourceRate(g2Resource, supplierData, 'G2', 'coverage');

    // Applica effort percentage come fa Phases
    const effectiveCoverage = coverage * (g2EffortPercent / 100);

    const totCost = Math.round(effectiveCoverage * rate);
    // Usa effectiveCoverage come finalMDs per coerenza
    const finalMDs = effectiveCoverage;

    const coverageCost: VendorCost = {
      vendorId: g2VendorId,
      vendorName: supplierData.name || g2VendorId,
      role: 'G2' as 'G2',
      department: '', // Department rimosso - non significativo per G2 con location diverse
      officialRate: rate,
      realRate: rate,
      estimatedMDs: effectiveCoverage,
      finalMDs: finalMDs,
      totCost: totCost,
      finalTotCost: Math.round(finalMDs * rate),
      isInternal: supplierData.type?.toLowerCase() === 'internal' || false
    };

    return coverageCost;
  }

  /**
   * Consolida costi per vendor + role (ignora department per raggruppare tutte le location)
   */
  private consolidateVendorCosts(costs: VendorCost[]): VendorCost[] {
    const consolidated = new Map<string, VendorCost>();

    costs.forEach(cost => {
      // Chiave: vendorId + role (senza department per consolidare cross-location)
      const key = `${cost.vendorId}_${cost.role}`;

      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        // Somma senza arrotondare per mantenere precisione
        existing.estimatedMDs += cost.estimatedMDs;
        existing.finalMDs += cost.finalMDs;
        existing.totCost += cost.totCost;
        // Somma i finalTotCost invece di ricalcolare per preservare costi con rate diversi
        existing.finalTotCost += cost.finalTotCost;
        // Aggiorna department con la location del costo corrente (l'ultima vince)
        existing.department = cost.department;
      } else {
        consolidated.set(key, { ...cost });
      }
    });

    // Arrotonda i valori finali per visualizzazione
    consolidated.forEach(cost => {
      cost.estimatedMDs = Math.round(cost.estimatedMDs * 10) / 10;
      cost.finalMDs = Math.round(cost.finalMDs * 10) / 10;
      cost.totCost = Math.round(cost.totCost);
      cost.finalTotCost = Math.round(cost.finalTotCost);
    });

    return Array.from(consolidated.values());
  }

  /**
   * Calcola KPI (GTO/GDS, Internal/External)
   */
  private calculateKPIs(vendorCosts: VendorCost[]): KPIData {
    const gtoRoles = ['G2', 'TA'];
    const gdsRoles = ['G1', 'PM'];

    // GTO calculations
    const gtoInternal = vendorCosts
      .filter(vc => gtoRoles.includes(vc.role) && vc.isInternal)
      .reduce((sum, vc) => sum + vc.finalTotCost, 0);

    const gtoExternal = vendorCosts
      .filter(vc => gtoRoles.includes(vc.role) && !vc.isInternal)
      .reduce((sum, vc) => sum + vc.finalTotCost, 0);

    const gtoTotal = gtoInternal + gtoExternal;

    // GDS calculations
    const gdsInternal = vendorCosts
      .filter(vc => gdsRoles.includes(vc.role) && vc.isInternal)
      .reduce((sum, vc) => sum + vc.finalTotCost, 0);

    const gdsExternal = vendorCosts
      .filter(vc => gdsRoles.includes(vc.role) && !vc.isInternal)
      .reduce((sum, vc) => sum + vc.finalTotCost, 0);

    const gdsTotal = gdsInternal + gdsExternal;
    const totalProject = gtoTotal + gdsTotal;

    // Calculate percentages
    const totalInternal = gtoInternal + gdsInternal;
    const totalExternal = gtoExternal + gdsExternal;

    return {
      gto: {
        internal: gtoInternal,
        external: gtoExternal,
        total: gtoTotal,
        internalPercentage: gtoTotal > 0 ? (gtoInternal / gtoTotal) * 100 : 0,
        externalPercentage: gtoTotal > 0 ? (gtoExternal / gtoTotal) * 100 : 0
      },
      gds: {
        internal: gdsInternal,
        external: gdsExternal,
        total: gdsTotal,
        internalPercentage: gdsTotal > 0 ? (gdsInternal / gdsTotal) * 100 : 0,
        externalPercentage: gdsTotal > 0 ? (gdsExternal / gdsTotal) * 100 : 0
      },
      totalProject: totalProject,
      totalInternalPercentage: totalProject > 0 ? (totalInternal / totalProject) * 100 : 0,
      totalExternalPercentage: totalProject > 0 ? (totalExternal / totalProject) * 100 : 0
    };
  }

  /**
   * Applica override manuali Final MDs (da store)
   */
  private applyFinalMDsOverrides(vendorCosts: VendorCost[]): VendorCost[] {
    const store = this.getStore();
    const state = store.getState();
    const overrides = state.calculationsData?.finalMDsOverrides || {};
    
    return this.applyFinalMDsOverridesWithCustom(vendorCosts, overrides);
  }

  /**
   * Applica override manuali Final MDs (con override custom)
   * Calcola finalTotCost = finalMDs * realRate
   */
  private applyFinalMDsOverridesWithCustom(vendorCosts: VendorCost[], overrides: Record<string, number>): VendorCost[] {

    const result = vendorCosts.map(cost => {
      const key = `${cost.vendorId}_${cost.role}`; // Senza department
      const override = overrides[key];

      if (override !== undefined) {
        // Apply override: finalMDs = override value, finalTotCost = finalMDs * realRate
        return {
          ...cost,
          finalMDs: override,
          finalTotCost: Math.round(override * cost.realRate)
        };
      }

      return cost;
    });


    return result;
  }

  /**
   * EDITING: Update Final MDs per vendor - ATOMIC UPDATE
   * Works for both Feature-based and Working Package modes
   */
  async updateFinalMDs(vendorId: string, role: string, newValue: number): Promise<void> {
    try {

      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // Detect current mode
      const isWorkingPackageMode = currentProject.workingPackageData?.enabled || false;

      // Get current overrides from the CORRECT mode section
      const key = `${vendorId}_${role}`;
      let updatedOverrides;

      if (isWorkingPackageMode) {
        // Working Package mode: read/write WP overrides only
        const currentWPOverrides = state.calculationsData?.workingPackage?.finalMDsOverrides || {};
        updatedOverrides = { ...currentWPOverrides, [key]: newValue };

        const { WorkingPackageCalculator } = await import('./calculators');
        const calculator = new WorkingPackageCalculator(store, this.getConfigManager());
        const result = calculator.calculate(updatedOverrides);

        // Update store with WP results - keep FB overrides intact
        // setCalculationsData reads finalMDsOverrides from workingPackage section
        state.setCalculationsData({
          vendorCosts: result.vendorCosts,
          kpiData: result.kpiData,
          workingPackage: {
            vendorCosts: result.vendorCosts,
            kpiData: result.kpiData,
            entries: result.entries,
            summary: result.summary,
            calculated: result.calculated,
            finalMDsOverrides: updatedOverrides
          },
          filters: state.calculationsData?.filters || { vendor: 'all', role: 'all', category: 'all' }
        });
      } else {
        // Feature-based mode: read/write FB overrides only
        const currentFBOverrides = state.calculationsData?.featureBased?.finalMDsOverrides || {};
        updatedOverrides = { ...currentFBOverrides, [key]: newValue };

        const { FeatureBasedCalculator } = await import('./calculators');
        const calculator = new FeatureBasedCalculator(store, this.getConfigManager());
        const result = calculator.calculate(updatedOverrides);

        // Update store with FB results - keep WP overrides intact
        // setCalculationsData reads finalMDsOverrides from featureBased section
        state.setCalculationsData({
          vendorCosts: result.vendorCosts,
          kpiData: result.kpiData,
          featureBased: {
            vendorCosts: result.vendorCosts,
            kpiData: result.kpiData,
            finalMDsOverrides: updatedOverrides
          },
          filters: state.calculationsData?.filters || { vendor: 'all', role: 'all', category: 'all' }
        });
      }

      // Save mode-specific overrides to project for persistence
      state.updateProject({
        ...currentProject,
        workingPackageOverrides: isWorkingPackageMode ? updatedOverrides : (currentProject.workingPackageOverrides || {}),
        featureBasedOverrides: !isWorkingPackageMode ? updatedOverrides : (currentProject.featureBasedOverrides || {})
      });

    } catch (error) {
      console.error('Failed to update Final MDs:', error);
      throw error;
    }
  }

  /**
   * FILTRI: Applica filtri vendor, role e category
   */
  applyFilters(vendorFilter: string, roleFilter: string, categoryFilter?: string): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      
      const filters = {
        vendor: vendorFilter,
        role: roleFilter,
        category: categoryFilter || state.calculationsData?.filters?.category || 'all'
      };
      
      state.setCalculationsFilters(filters);
      
      console.log('Filters applied:', filters);
    } catch (error) {
      console.error('Failed to apply filters:', error);
      throw error;
    }
  }

  /**
   * FILTRI: Applica filtro categoria (ALL/GTO/GDS)
   */
  applyCategoryFilter(category: 'all' | 'gto' | 'gds'): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentFilters = state.calculationsData?.filters || { vendor: 'all', role: 'all', category: 'all' };
      
      
      const newFilters = {
        ...currentFilters,
        category: category
      };
      
      
      state.setCalculationsFilters(newFilters);
      
      // Debug: Verify state after update
      const stateAfterUpdate = store.getState();
      console.log('Category filter applied:', category);
    } catch (error) {
      console.error('Failed to apply category filter:', error);
      throw error;
    }
  }

  /**
   * Ottiene costi filtrati per la UI
   */
  getFilteredCosts(): VendorCost[] {
    const store = this.getStore();
    const state = store.getState();
    const { vendorCosts = [], filters = { vendor: 'all', role: 'all', category: 'all' } } = state.calculationsData || {};
    
    return vendorCosts.filter(cost => {
      const vendorMatch = filters.vendor === 'all' || cost.vendorId === filters.vendor;
      const roleMatch = filters.role === 'all' || cost.role === filters.role;
      
      // Category filter (GTO = G2 + TA, GDS = G1 + PM)
      let categoryMatch = true;
      if (filters.category === 'gto') {
        categoryMatch = cost.role === 'G2' || cost.role === 'TA';
      } else if (filters.category === 'gds') {
        categoryMatch = cost.role === 'G1' || cost.role === 'PM';
      }
      
      return vendorMatch && roleMatch && categoryMatch;
    });
  }

  /**
   * SHARE: Condivisione email (formato Excel mantenuto)
   */
  shareByEmail(): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;
      const { vendorCosts = [], kpiData } = state.calculationsData || {};
      
      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // Genera email con formato Excel attuale
      const emailData = this.generateEmailContent(currentProject, vendorCosts, kpiData);
      
      // Apri client email
      const emailUrl = `mailto:?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
      window.open(emailUrl);
      
      console.log('Email sharing initiated');
    } catch (error) {
      console.error('Failed to share by email:', error);
      throw error;
    }
  }

  /**
   * COPY: Copia dati in clipboard
   */
  async copyToClipboard(): Promise<void> {
    try {
      const store = this.getStore();
      const state = store.getState();
      const { vendorCosts = [], filters = { vendor: 'all', role: 'all' } } = state.calculationsData || {};
      
      // Apply filters directly here
      const filteredCosts = vendorCosts.filter(cost => {
        const vendorMatch = filters.vendor === 'all' || cost.vendorId === filters.vendor;
        const roleMatch = filters.role === 'all' || cost.role === filters.role;
        return vendorMatch && roleMatch;
      });
      
      const tabularData = this.generateTabularData(filteredCosts);
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(tabularData);
      } else {
        this.fallbackCopyToClipboard(tabularData);
      }
      
      console.log('Data copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  }

  /**
   * Helper: Ottiene dati supplier - DEPRECATED, use getRateInfo for rates
   */
  private getSupplierData(supplierId: string): any {
    const configManager = this.getConfigManager();
    if (!configManager) {
      console.error(`ConfigManager not available for supplier: ${supplierId}`);
      return null;
    }
    
    const vendors = configManager.getVendors() || [];
    const vendor = vendors.find(v => v.id === supplierId);

    if (vendor) {
      return vendor;
    }
    
    console.error('Vendor not found:', supplierId);
    return null;
  }

  /**
   * Helper: Ottiene il ruolo di un vendor dal primo job cluster
   * Nota: il ruolo è ora memorizzato a livello job cluster, non a livello vendor
   */
  private getVendorRole(vendor: any): string {
    if (!vendor?.jobClusters || vendor.jobClusters.length === 0) {
      return 'G2'; // Default fallback
    }
    // Cerca il primo job cluster con un ruolo definito
    const firstClusterWithRole = vendor.jobClusters.find((jc: any) => jc.role);
    return firstClusterWithRole?.role || 'G2';
  }

  /**
   * Helper: Ottiene dati team member
   */
  private getTeamMemberData(memberId: string): any {
    const teamManager = (window as any).teamManager;
    return teamManager?.getTeamMemberById(memberId);
  }

  /**
   * Helper: Genera contenuto email
   */
  private generateEmailContent(project: any, vendorCosts: VendorCost[], kpiData: KPIData): { subject: string, body: string } {
    const projectName = project.project?.name || 'Unknown Project';
    const subject = `Calculations Summary - ${projectName}`;
    
    // Formato Excel mantenuto
    let body = `Project: ${projectName}\\n\\n`;
    
    // KPI Summary
    body += `=== KPI SUMMARY ===\\n`;
    body += `Total Project Cost: €${kpiData.totalProject.toLocaleString()}\\n`;
    body += `GTO Total: €${kpiData.gto.total.toLocaleString()} (Internal: ${kpiData.gto.internalPercentage.toFixed(1)}%, External: ${kpiData.gto.externalPercentage.toFixed(1)}%)\\n`;
    body += `GDS Total: €${kpiData.gds.total.toLocaleString()} (Internal: ${kpiData.gds.internalPercentage.toFixed(1)}%, External: ${kpiData.gds.externalPercentage.toFixed(1)}%)\\n\\n`;
    
    // Tabella dettagliata
    body += `=== DETAILED COSTS ===\\n`;
    body += `Vendor\\tRole\\tDepartment\\tOfficial Rate\\tReal Rate\\tEstimated MDs\\tFinal MDs\\tTot Cost\\tFinal Tot Cost\\n`;
    
    vendorCosts.forEach(cost => {
      body += `${cost.vendorName}\\t${cost.role}\\t${cost.department}\\t€${cost.officialRate}\\t€${cost.realRate}\\t${cost.estimatedMDs}\\t${cost.finalMDs}\\t€${cost.totCost}\\t€${cost.finalTotCost}\\n`;
    });
    
    return { subject, body };
  }

  /**
   * Helper: Genera template email professionale
   */
  private generateTabularData(vendorCosts: VendorCost[]): string {
    const store = this.getStore();
    const state = store.getState();
    const currentProject = state.currentProject;
    const { kpiData } = state.calculationsData || {};

    if (!currentProject) {
      return 'No project loaded';
    }

    // Try to get project name from project.project.name or project.name
    const projectName = currentProject.project?.name || currentProject.name || 'Project';
    // Use GTO total instead of totalProject
    const gtoTotal = kpiData?.gto?.total || 0;

    // Get assumptions from project
    const assumptions = currentProject.assumptions || [];
    const assumptionsList = assumptions.length > 0
      ? assumptions.map(assumption => `- ${assumption.description}`).join('\n')
      : '- [To be defined]';

    // Calcola totali per vendor GTO (G2 + TA) aggregando i finalTotCost
    const gtoRoles = ['G2', 'TA'];
    const vendorTotals = new Map<string, { name: string; total: number; g2Total: number; taTotal: number }>();
    vendorCosts
      .filter(cost => gtoRoles.includes(cost.role))
      .forEach(cost => {
        const existing = vendorTotals.get(cost.vendorId);
        if (existing) {
          existing.total += cost.finalTotCost || 0;
          if (cost.role === 'G2') existing.g2Total += cost.finalTotCost || 0;
          if (cost.role === 'TA') existing.taTotal += cost.finalTotCost || 0;
        } else {
          vendorTotals.set(cost.vendorId, {
            name: cost.vendorName,
            total: cost.finalTotCost || 0,
            g2Total: cost.role === 'G2' ? cost.finalTotCost || 0 : 0,
            taTotal: cost.role === 'TA' ? cost.finalTotCost || 0 : 0
          });
        }
      });

    // Sezione vendor breakdown con dettaglio G2 e TA
    let vendorBreakdown = '';
    if (vendorTotals.size > 0) {
      vendorBreakdown = '\n\nBreakdown by vendor:\n';
      vendorTotals.forEach(({ name, total, g2Total, taTotal }) => {
        vendorBreakdown += `- ${name}: ${total.toLocaleString()} €`;
        if (g2Total > 0 && taTotal > 0) {
          vendorBreakdown += ` (G2: ${g2Total.toLocaleString()} € + TA: ${taTotal.toLocaleString()} €)`;
        } else if (g2Total > 0) {
          vendorBreakdown += ` (G2)`;
        } else if (taTotal > 0) {
          vendorBreakdown += ` (TA)`;
        }
        vendorBreakdown += '\n';
      });
    }

    const emailTemplate = `Dear colleagues,
Please find below the estimation details for the implementation of ${projectName} based on the provided requirements.

The estimated budget for the technical part is ${gtoTotal.toLocaleString()} € vat incl.${vendorBreakdown}
This includes all necessary activities such as technical analysis, development, SIT, support UAT phases, deployment, and post go live support.

Assumptions and out of scopes:
${assumptionsList}`;

    return emailTemplate;
  }

  /**
   * Fallback copy to clipboard
   */
  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      console.log('Fallback copy successful');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  }

  /**
   * Reset tutti i Final MDs ai valori stimati
   */
  resetAllFinalMDs(): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      
      // Rimuovi tutti gli override
      state.clearFinalMDsOverrides();
      
      // Ricalcola
      this.calculateProjectCosts();
      
      console.log('All Final MDs reset to estimated values');
    } catch (error) {
      console.error('Failed to reset Final MDs:', error);
      throw error;
    }
  }

  /**
   * Reset singolo Final MD al valore stimato
   * Works for both Feature-based and Working Package modes
   */
  async resetSingleFinalMD(vendorId: string, role: string): Promise<void> {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      const key = `${vendorId}_${role}`;

      // Detect current mode
      const isWorkingPackageMode = currentProject.workingPackageData?.enabled || false;
      let newOverrides;

      if (isWorkingPackageMode) {
        // Working Package mode: remove from WP overrides only
        const currentWPOverrides = state.calculationsData?.workingPackage?.finalMDsOverrides || {};
        newOverrides = { ...currentWPOverrides };
        delete newOverrides[key];

        const { WorkingPackageCalculator } = await import('./calculators');
        const calculator = new WorkingPackageCalculator(store, this.getConfigManager());
        const result = calculator.calculate(newOverrides);

        // In WP mode: force finalTotCost = totCost, recalculate finalMDs
        // This ensures costs remain fixed (set by user via Total Amount * percentage)
        const adjustedVendorCosts = result.vendorCosts.map((cost: any) => {
          if (cost.vendorId === vendorId && cost.role === role) {
            // Force final Tot Cost = Tot Cost (original allocation)
            const finalTotCost = cost.totCost;
            // Recalculate final MDs using the rate
            const realRate = cost.realRate;
            const finalMDs = realRate > 0 ? Math.round((finalTotCost / realRate) * 10) / 10 : 0;
            return {
              ...cost,
              finalTotCost,
              finalMDs
            };
          }
          return cost;
        });

        // Update store with WP results - keep FB overrides intact
        // setCalculationsData reads finalMDsOverrides from workingPackage section
        state.setCalculationsData({
          vendorCosts: adjustedVendorCosts,
          kpiData: result.kpiData,
          workingPackage: {
            vendorCosts: adjustedVendorCosts,
            kpiData: result.kpiData,
            entries: result.entries,
            summary: result.summary,
            calculated: result.calculated,
            finalMDsOverrides: newOverrides
          },
          filters: state.calculationsData?.filters || { vendor: 'all', role: 'all', category: 'all' }
        });
      } else {
        // Feature-based mode: remove from FB overrides only
        const currentFBOverrides = state.calculationsData?.featureBased?.finalMDsOverrides || {};
        newOverrides = { ...currentFBOverrides };
        delete newOverrides[key];

        const { FeatureBasedCalculator } = await import('./calculators');
        const calculator = new FeatureBasedCalculator(store, this.getConfigManager());
        const result = calculator.calculate(newOverrides);

        // Update store with FB results - keep WP overrides intact
        // setCalculationsData reads finalMDsOverrides from featureBased section
        state.setCalculationsData({
          vendorCosts: result.vendorCosts,
          kpiData: result.kpiData,
          featureBased: {
            vendorCosts: result.vendorCosts,
            kpiData: result.kpiData,
            finalMDsOverrides: newOverrides
          },
          filters: state.calculationsData?.filters || { vendor: 'all', role: 'all', category: 'all' }
        });
      }

      // Save mode-specific overrides to project for persistence
      state.updateProject({
        ...currentProject,
        workingPackageOverrides: isWorkingPackageMode ? newOverrides : (currentProject.workingPackageOverrides || {}),
        featureBasedOverrides: !isWorkingPackageMode ? newOverrides : (currentProject.featureBasedOverrides || {})
      });

      console.log('Single Final MD reset:', { vendorId, role, mode: isWorkingPackageMode ? 'WP' : 'FB' });
    } catch (error) {
      console.error('Failed to reset single Final MD:', error);
      throw error;
    }
  }

  /**
   * Ottiene lista unica vendors per filtri
   */
  getUniqueVendors(): Array<{ id: string, name: string }> {
    const store = this.getStore();
    const state = store.getState();
    const { vendorCosts = [] } = state.calculationsData || {};
    
    const vendors = new Map();
    vendorCosts.forEach(cost => {
      if (!vendors.has(cost.vendorId)) {
        vendors.set(cost.vendorId, { id: cost.vendorId, name: cost.vendorName });
      }
    });
    
    return Array.from(vendors.values());
  }

  /**
   * Ottiene lista unica roles per filtri
   */
  getUniqueRoles(): string[] {
    const store = this.getStore();
    const state = store.getState();
    const { vendorCosts = [] } = state.calculationsData || {};
    
    const roles = new Set<string>();
    vendorCosts.forEach(cost => {
      roles.add(cost.role);
    });
    
    return Array.from(roles);
  }

  /**
   * Conta i vendor per categoria
   */
  getVendorCountsByCategory(): { all: number, gto: number, gds: number } {
    const store = this.getStore();
    const state = store.getState();
    const { vendorCosts = [] } = state.calculationsData || {};

    const gtoCount = vendorCosts.filter(cost => cost.role === 'G2' || cost.role === 'TA').length;
    const gdsCount = vendorCosts.filter(cost => cost.role === 'G1' || cost.role === 'PM').length;

    return {
      all: vendorCosts.length,
      gto: gtoCount,
      gds: gdsCount
    };
  }

  /**
   * Clear all Final MDs overrides (without recalculating)
   * Called when project changes to reset manual overrides
   * Actual recalculation happens in the component's useEffect
   */
  clearFinalMDsOverrides(): void {
    try {
      const store = this.getStore();
      const state = store.getState();

      // Clear overrides from both store and currentProject
      state.clearFinalMDsOverrides();

      console.log('🧹 Final MDs overrides cleared (recalculation will follow)');
    } catch (error) {
      console.error('Failed to clear Final MDs overrides:', error);
      throw error;
    }
  }

  // ======================
  // WORKING PACKAGE METHODS
  // ======================

  /**
   * Abilita/disabilita modalità Working Package
   */
  setWorkingPackageEnabled(enabled: boolean): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      const workingPackage = {
        ...currentProject.workingPackageData,
        enabled
      };

      state.updateProjectField('workingPackageData', workingPackage);

      // Also save workingPackageResources to project for persistence
      const workingPackageResources = currentProject.workingPackageResources || {
        gto: { primaryResource: null, secondaryResource: null },
        gds: { primaryResource: null, secondaryResource: null }
      };
      state.updateWorkingPackageResources(workingPackageResources);

      // Ricalcola
      this.calculateProjectCosts();

      console.log('✅ Working Package mode:', enabled ? 'enabled' : 'disabled');
    } catch (error) {
      console.error('Failed to set Working Package enabled:', error);
      throw error;
    }
  }

  /**
   * Aggiorna dati Working Package
   */
  updateWorkingPackage(data: Partial<WorkingPackageData>): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      const workingPackage = {
        ...currentProject.workingPackageData,
        ...data
      };

      state.updateProjectField('workingPackageData', workingPackage);

      // Also save workingPackageResources to project for persistence
      const workingPackageResources = currentProject.workingPackageResources || {
        gto: { primaryResource: null, secondaryResource: null },
        gds: { primaryResource: null, secondaryResource: null }
      };
      state.updateWorkingPackageResources(workingPackageResources);

      // Ricalcola se abilitato
      if (workingPackage.enabled) {
        this.calculateProjectCosts();
      }

      console.log('✅ Working Package data updated:', data);
    } catch (error) {
      console.error('Failed to update Working Package data:', error);
      throw error;
    }
  }

  /**
   * Ottiene lo stato attuale del Working Package
   */
  getWorkingPackageData(): WorkingPackageData | null {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject) {
        return null;
      }

      return currentProject.workingPackageData || null;
    } catch (error) {
      console.error('Failed to get Working Package data:', error);
      return null;
    }
  }

  /**
   * Aggiorna dati di una singola categoria (GTO o GDS)
   */
  updateWorkingPackageCategory(
    category: 'gto' | 'gds',
    data: Partial<WorkingPackageCategoryData>
  ): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      const currentWP = currentProject.workingPackageData || {};
      const currentCategory = currentWP[category] || {};

      const workingPackage = {
        ...currentWP,
        [category]: {
          ...currentCategory,
          ...data
        }
      };

      state.updateProjectField('workingPackageData', workingPackage);

      // Also save workingPackageResources to project for persistence
      const workingPackageResources = currentProject.workingPackageResources || {
        gto: { primaryResource: null, secondaryResource: null },
        gds: { primaryResource: null, secondaryResource: null }
      };
      state.updateWorkingPackageResources(workingPackageResources);

      // Ricalcola se il Working Package è abilitato
      if (currentWP.enabled) {
        this.calculateProjectCosts();
      }

      console.log(`✅ Working Package ${category.toUpperCase()} updated:`, data);
    } catch (error) {
      console.error(`Failed to update Working Package ${category}:`, error);
      throw error;
    }
  }

  /**
   * Helper: Ottiene dati rate
   */
  private getRateInfo(options: { vendorId: string, jobClusterId: string, seniority: string, location: string, deliveryModel: string }): { realRate: number, officialRate: number } {
    const configManager = this.getConfigManager();
    if (!configManager) {
      console.error(`ConfigManager not available for getRateInfo`);
      return { realRate: 0, officialRate: 0 };
    }
    const rate = configManager.getRate(options);
    if (typeof rate === 'number') {
        return { realRate: rate, officialRate: rate };
    }
    return rate || { realRate: 0, officialRate: 0 };
  }

  /**
   * Processa tutti i costi (SEMPRE features per development + phases per altre fasi)
   */
  private processAllCostsV2(project: any): VendorCost[] {
    const allCosts: VendorCost[] = [];

    if (project.features && project.features.length > 0) {
      const featuresCosts = this.processFeaturesCostsV2(project.features);
      allCosts.push(...featuresCosts);
    }

    const featuresTotal = (project.features || []).reduce((sum: number, feature: any) => {
      return sum + (parseFloat(feature.manDays) || 0);
    }, 0);
    const coverageMDs = project.coverage || 0;
    const developmentTotal = featuresTotal + coverageMDs;
    const tempRate = 400; // Temporary fixed rate

    if (developmentTotal > 0 && project.phases?.development?.effort && project.phases?.selectedSuppliers) {
        const developmentEffort = project.phases.development.effort;

        if (developmentEffort.TA && developmentEffort.TA > 0 && project.phases.selectedSuppliers.TA) {
            const developmentTA_MDs = Math.round((developmentTotal * developmentEffort.TA) / 100 * 10) / 10;
            const selectedTA = project.phases.selectedSuppliers.TA;
            const taSupplier = this.getSupplierData(selectedTA);
            if (taSupplier) {
                const totCost = Math.round(developmentTA_MDs * tempRate);
                const finalMDs_TA = Math.round((totCost / tempRate) * 10) / 10;
                const taCost: VendorCost = {
                    vendorId: selectedTA, vendorName: taSupplier.name || selectedTA, role: 'TA',
                    department: taSupplier.department || 'TA', officialRate: tempRate, realRate: tempRate,
                    estimatedMDs: developmentTA_MDs, finalMDs: finalMDs_TA, totCost: totCost,
                    finalTotCost: Math.round(finalMDs_TA * tempRate),
                    isInternal: taSupplier.type === 'internal'
                };
                allCosts.push(taCost);
            }
        }

        if (developmentEffort.PM && developmentEffort.PM > 0 && project.phases.selectedSuppliers.PM) {
            const developmentPM_MDs = Math.round((developmentTotal * developmentEffort.PM) / 100 * 10) / 10;
            const selectedPM = project.phases.selectedSuppliers.PM;
            const pmSupplier = this.getSupplierData(selectedPM);
            if (pmSupplier) {
                const totCost = Math.round(developmentPM_MDs * tempRate);
                const finalMDs_PM = Math.round((totCost / tempRate) * 10) / 10;
                const pmCost: VendorCost = {
                    vendorId: selectedPM, vendorName: pmSupplier.name || selectedPM, role: 'PM',
                    department: pmSupplier.department || 'PM', officialRate: tempRate, realRate: tempRate,
                    estimatedMDs: developmentPM_MDs, finalMDs: finalMDs_PM, totCost: totCost,
                    finalTotCost: Math.round(finalMDs_PM * tempRate),
                    isInternal: pmSupplier.type === 'internal'
                };
                allCosts.push(pmCost);
            }
        }
    }

    const hasValidPhases = project.phases && Object.keys(project.phases).some(key => key !== 'selectedSuppliers' && key !== 'development' && project.phases[key]?.manDays > 0);

    if (hasValidPhases) {
      const phasesCosts = this.processNonDevelopmentPhases(project.phases);
      allCosts.push(...phasesCosts);
    }

    // Get G2 resource from either selectedPhaseResources (new) or selectedSuppliers (old)
    const g2Resource = project.phases?.selectedPhaseResources?.G2 || project.phases?.selectedSuppliers?.G2;
    if (project.coverage && project.coverage > 0 && g2Resource) {
      // Get G2 effort percentage from development phase (default to 100 if not found)
      const g2EffortPercent = project.phases?.development?.effort?.G2 || 100;
      const coverageCost = this.processCoverageCost(project.coverage, g2Resource, g2EffortPercent);
      if (coverageCost) {
        allCosts.push(coverageCost);
      }
    }

    const consolidatedCosts = this.consolidateVendorCosts(allCosts);

    return consolidatedCosts;
  }

  private processFeaturesCostsV2(features: any[]): VendorCost[] {
    const costs: VendorCost[] = [];

    features.forEach(feature => {
      // Use saved role and rate from feature if available
      let role = feature.role;
      let officialRate = feature.rate;
      let realRate = feature.rate;

      // Fallback: calculate rate if not saved in feature
      if (!officialRate) {
        const rateInfo = this.getRateInfo({
            vendorId: feature.supplier,
            jobClusterId: feature.jobCluster,
            seniority: feature.seniority,
            location: feature.location,
            deliveryModel: feature.deliveryModel,
        });

        if (!rateInfo || !rateInfo.officialRate) {
          console.warn('Rate not found for feature:', feature.id);
          return;
        }
        officialRate = rateInfo.officialRate;
        realRate = rateInfo.realRate;
      }

      // Fallback: get role from supplier data if not saved in feature
      if (!role) {
        const supplierData = this.getSupplierData(feature.supplier);
        role = this.getVendorRole(supplierData);
      }

      const supplierData = this.getSupplierData(feature.supplier); // Still needed for name, etc.

      const totCost = (feature.manDays || 0) * (realRate || 0);
      // Usa manDays direttamente come finalMDs per coerenza
      const finalMDs = feature.manDays || 0;

      const cost: VendorCost = {
        vendorId: feature.supplier,
        vendorName: supplierData?.name || feature.supplier,
        role: role,
        department: '', // Department rimosso - non significativo per G2 con location diverse
        officialRate: officialRate || 0,
        realRate: realRate || 0,
        estimatedMDs: feature.manDays || 0,
        finalMDs: finalMDs,
        totCost: totCost,
        finalTotCost: Math.round(finalMDs * (realRate || 0)),
        isInternal: supplierData?.type === 'internal'
      };

      costs.push(cost);
    });
    return costs;
  }

  /**
   * Track if we've already shown rate error toast to avoid spam
   */
  private hasShownRateErrorToast = false;

  /**
   * Show error notification toast for missing rates
   */
  private showRateErrorNotification(missingRoles: string[]): void {
    if (this.hasShownRateErrorToast) return;

    try {
      const store = this.getStore();
      if (!store) {
        console.warn('Store not available for notification');
        return;
      }

      const state = store.getState();
      if (state.addNotification) {
        const notificationConfig = {
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'Error',
          message: `Rate not configured for: ${missingRoles.join(', ')}. Please configure phase resources.`,
          type: 'error',
          duration: 5000,
          persistent: false,
          actions: [],
          onClick: null,
          onClose: null,
          timestamp: new Date()
        };
        state.addNotification(notificationConfig);
        this.hasShownRateErrorToast = true;
        // Reset after 5 seconds to allow future notifications
        setTimeout(() => { this.hasShownRateErrorToast = false; }, 5000);
      }
    } catch (error) {
      console.error('Failed to show error notification:', error);
    }
  }

  // ======================
  // WORKING PACKAGE RESOURCE ACTIONS
  // ======================

  /**
   * Update Working Package resource selection (vendor + rate details)
   * @param category - 'gto' or 'gds'
   * @param resourceType - 'primaryResource' or 'secondaryResource'
   * @param resource - Full resource config (vendorId, jobCluster, seniority, location, deliveryModel)
   */
  async updateWorkingPackageResource(
    category: 'gto' | 'gds',
    resourceType: 'primaryResource' | 'secondaryResource',
    resource: Partial<WorkingPackageResource> | null
  ): Promise<void> {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      const state = store.getState();

      // Update in store
      state.updateWorkingPackageResource(category, resourceType, resource);

      // Also save to project for persistence
      const workingPackageResources = state.currentProject?.workingPackageResources || {
        gto: { primaryResource: null, secondaryResource: null },
        gds: { primaryResource: null, secondaryResource: null }
      };
      const currentCategory = workingPackageResources[category] || {};
      const existingResource = currentCategory[resourceType] || {};

      // Merge new resource with existing resource to preserve fields that weren't changed
      // Only merge fields that have truthy values in the new resource
      const mergedResource = {
        ...existingResource,
        ...resource
      };

      // Clean up any undefined values that might have been carried over from existing resource
      // This ensures that if a field was undefined before but is now missing in new resource,
      // we don't explicitly set it to undefined
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
      state.updateWorkingPackageResources(newWorkingPackageResources);

      // Re-calculate costs to update rates based on new resource selection
      this.calculateProjectCosts();
    } catch (error) {
      console.error('Failed to update Working Package resource:', error);
      throw error;
    }
  }

  /**
   * Open rate specification modal for Working Package
   * @param role - The role being configured (G1, G2, TA, PM)
   */
  openRateSpecModalForWP(role: string): void {
    try {
      const store = this.getStore();
      if (!store) throw new Error('Store not available');
      store.getState().openRateSpecModal(role, 'wp');
    } catch (error) {
      console.error('Failed to open rate specification modal for WP:', error);
      throw error;
    }
  }

  /**
   * Update Working Package vendor and resource together
   * This ensures both workingPackageData (vendorId) and workingPackageResources (full rate details)
   * are updated consistently when user selects a rate via modal.
   * @param category - 'gto' or 'gds'
   * @param resourceType - 'primaryResource' or 'secondaryResource'
   * @param resource - Full resource config (vendorId, jobCluster, seniority, location, deliveryModel)
   */
  updateWorkingPackageVendorAndResource(
    category: 'gto' | 'gds',
    resourceType: 'primaryResource' | 'secondaryResource',
    resource: Partial<WorkingPackageResource>
  ): void {
    try {
      console.log('📦 updateWorkingPackageVendorAndResource called:', { category, resourceType, resource });
      const store = this.getStore();
      if (!store) throw new Error('Store not available');

      const vendorIdFieldName = resourceType.replace('Resource', 'VendorId') as
        | 'primaryVendorId'
        | 'secondaryVendorId';

      // Update vendorId in workingPackageData
      const currentState = store.getState();
      const workingPackageData = currentState.currentProject?.workingPackageData;
      if (workingPackageData) {
        const newWorkingPackageData = {
          ...workingPackageData,
          [category]: {
            ...(workingPackageData[category] || {}),
            [vendorIdFieldName]: resource.vendorId || workingPackageData[category]?.[vendorIdFieldName]
          }
        };
        currentState.updateProjectField('workingPackageData', newWorkingPackageData);
      }

      // Update resource details in workingPackageResources AND save to project
      currentState.updateWorkingPackageResource(category, resourceType, resource);

      // Also save workingPackageResources to project for persistence
      const workingPackageResources = currentState.currentProject?.workingPackageResources || {
        gto: { primaryResource: null, secondaryResource: null },
        gds: { primaryResource: null, secondaryResource: null }
      };
      const currentCategory = workingPackageResources[category] || {};
      const existingResource = currentCategory[resourceType] || {};

      // Merge new resource with existing resource to preserve fields that weren't changed
      // This prevents data loss when partial updates are made (e.g., only vendorId changed)
      const mergedResource = {
        ...existingResource,
        ...resource
      };

      // Clean up any undefined values that might have been carried over from existing resource
      // This ensures that if a field was undefined before but is now missing in new resource,
      // we don't explicitly set it to undefined
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
      currentState.updateWorkingPackageResources(newWorkingPackageResources);

      // Re-calculate costs to update rates based on new resource selection
      this.calculateProjectCosts();
    } catch (error) {
      console.error('Failed to update Working Package vendor and resource:', error);
      throw error;
    }
  }

  /**
   * Close rate specification modal
   */
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
}

// Create singleton instance
export const calculationsActions = new CalculationsActions();