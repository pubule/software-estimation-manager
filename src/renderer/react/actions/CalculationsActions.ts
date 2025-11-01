/**
 * CalculationsActions - Business Logic per Calculations Dashboard
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - TUTTA la business logic QUI (calcoli, processamento, validazioni)
 * - Aggiorna SOLO attraverso store methods
 * - Components chiamano SOLO questi metodi
 */

interface VendorCost {
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
}

interface KPIData {
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

interface CalculationsFilters {
  vendor: string;
  role: string;
  category: string; // 'all' | 'gto' | 'gds'
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
   * Processamento completo features + phases → vendor costs
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

      // 1. Processa tutti i costi (features + phases)
      const vendorCosts = this.processAllCosts(currentProject);
      
      // 2. Applica override Final MDs se esistono
      const costsWithOverrides = this.applyFinalMDsOverrides(vendorCosts);
      
      // 3. Calcola KPI
      const kpiData = this.calculateKPIs(costsWithOverrides);
      
      // 4. Preserve existing finalMDsOverrides from current state or project data
      const currentOverrides = state.calculationsData?.finalMDsOverrides || {};
      const projectOverrides = currentProject.finalMDsOverrides || {};
      const preservedOverrides = Object.keys(projectOverrides).length > 0 ? projectOverrides : currentOverrides;
      
      // 5. Aggiorna store
      state.setCalculationsData({
        vendorCosts: costsWithOverrides,
        kpiData: kpiData,
        finalMDsOverrides: preservedOverrides
      });
      
      console.log('✅ Calculations completed:', costsWithOverrides.length, 'vendor costs');
    } catch (error) {
      console.error('Failed to calculate project costs:', error);
      throw error;
    }
  }

  /**
   * Processa tutti i costi (SEMPRE features per development + phases per altre fasi)
   * 
   * LOGICA CORRETTA (fix implementato):
   * - SEMPRE processare features per development (vendor costs consolidati per G2)
   * - Processare altre phases se disponibili 
   * - Consolidare tutti i vendor costs per vendor+role+department
   */
  private processAllCosts(project: any): VendorCost[] {
    const allCosts: VendorCost[] = [];

    // 1. SEMPRE processare features per development
    if (project.features && project.features.length > 0) {
      const featuresCosts = this.processFeaturesCosts(project.features);
      allCosts.push(...featuresCosts);
    }

    // 1b. Aggiungere Development TA e PM usando selected suppliers
    // Development Total MDs = features + coverage (come calcolato in calculateDevelopmentPhase)
    const featuresTotal = (project.features || []).reduce((sum: number, feature: any) => {
      return sum + (parseFloat(feature.manDays) || 0);
    }, 0);
    const coverageMDs = project.coverage || 0;
    const developmentTotal = featuresTotal + coverageMDs;

    if (developmentTotal > 0 && project.phases?.development?.effort && project.phases?.selectedSuppliers) {
      const developmentEffort = project.phases.development.effort;

      // Development TA
      if (developmentEffort.TA && developmentEffort.TA > 0 && project.phases.selectedSuppliers.TA) {
        const developmentTA_MDs = Math.round((developmentTotal * developmentEffort.TA) / 100 * 10) / 10;
        const selectedTA = project.phases.selectedSuppliers.TA;
        const taSupplier = this.getSupplierData(selectedTA);

        if (taSupplier) {
          const taCost: VendorCost = {
            vendorId: selectedTA,
            vendorName: taSupplier.name || selectedTA,
            role: 'TA',
            department: taSupplier.department || 'TA',
            officialRate: taSupplier.officialRate || 0,
            realRate: taSupplier.realRate || 0,
            estimatedMDs: developmentTA_MDs,
            finalMDs: developmentTA_MDs,
            totCost: Math.round(developmentTA_MDs * (taSupplier.realRate || 0)),
            finalTotCost: Math.round(developmentTA_MDs * (taSupplier.officialRate || 0)),
            isInternal: taSupplier.type === 'internal'
          };
          allCosts.push(taCost);
        }
      }

      // Development PM
      if (developmentEffort.PM && developmentEffort.PM > 0 && project.phases.selectedSuppliers.PM) {
        const developmentPM_MDs = Math.round((developmentTotal * developmentEffort.PM) / 100 * 10) / 10;
        const selectedPM = project.phases.selectedSuppliers.PM;
        const pmSupplier = this.getSupplierData(selectedPM);

        if (pmSupplier) {
          const pmCost: VendorCost = {
            vendorId: selectedPM,
            vendorName: pmSupplier.name || selectedPM,
            role: 'PM',
            department: pmSupplier.department || 'PM',
            officialRate: pmSupplier.officialRate || 0,
            realRate: pmSupplier.realRate || 0,
            estimatedMDs: developmentPM_MDs,
            finalMDs: developmentPM_MDs,
            totCost: Math.round(developmentPM_MDs * (pmSupplier.realRate || 0)),
            finalTotCost: Math.round(developmentPM_MDs * (pmSupplier.officialRate || 0)),
            isInternal: pmSupplier.type === 'internal'
          };
          allCosts.push(pmCost);
        }
      }
    }

    // 2. Processare altre phases (non-development) se disponibili
    const hasValidPhases = project.phases &&
                          Object.keys(project.phases).some(key =>
                            key !== 'selectedSuppliers' &&
                            key !== 'development' && // Skip development, già processato da features
                            project.phases[key]?.manDays > 0
                          );

    if (hasValidPhases) {
      const phasesCosts = this.processNonDevelopmentPhases(project.phases);
      allCosts.push(...phasesCosts);
    }

    // 3. Processare coverage assegnato al vendor G2 selezionato
    if (project.coverage && project.coverage > 0 && project.phases?.selectedSuppliers?.G2) {
      const coverageCost = this.processCoverageCost(project.coverage, project.phases.selectedSuppliers.G2);
      if (coverageCost) {
        allCosts.push(coverageCost);
      }
    }

    // 4. Raggruppa per vendor + role + department
    const consolidatedCosts = this.consolidateVendorCosts(allCosts);

    return consolidatedCosts;
  }

  /**
   * Processa costi dalle features
   */
  private processFeaturesCosts(features: any[]): VendorCost[] {
    const costs: VendorCost[] = [];
    
    features.forEach(feature => {
      const supplierData = this.getSupplierData(feature.supplier);
      
      if (!supplierData) {
        console.warn('Supplier not found for feature:', feature.id, feature.supplier);
        return;
      }
      const cost: VendorCost = {
        vendorId: feature.supplier,
        vendorName: supplierData.name,
        role: supplierData.role,
        department: supplierData.department || 'General',
        officialRate: supplierData.officialRate || 0,
        realRate: supplierData.realRate || 0,
        estimatedMDs: feature.manDays || 0,
        finalMDs: feature.manDays || 0,
        totCost: (feature.manDays || 0) * (supplierData.realRate || 0),
        finalTotCost: (feature.manDays || 0) * (supplierData.officialRate || 0),
        isInternal: supplierData.type === 'internal'
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
          
          // Calculate MDs for this role in this phase (round to 1 decimal)
          const phaseMDs = Math.round((phaseData.manDays * (percentage / 100)) * 10) / 10;
          
          const cost: VendorCost = {
            vendorId: supplierId,
            vendorName: supplierData.name || supplierId,
            role: role as 'G1' | 'G2' | 'TA' | 'PM',
            department: supplierData.department || role,
            officialRate: supplierData.officialRate || 0,
            realRate: supplierData.realRate || 0,
            estimatedMDs: phaseMDs,
            finalMDs: phaseMDs,
            totCost: Math.round(phaseMDs * (supplierData.realRate || 0)),
            finalTotCost: Math.round(phaseMDs * (supplierData.officialRate || 0)),
            isInternal: supplierData.type === 'internal' || false
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
    
    // Extract selectedSuppliers from phases object
    const selectedSuppliers = phases.selectedSuppliers || {};
    
    // Process each phase except 'development' and 'selectedSuppliers'
    Object.entries(phases).forEach(([phaseKey, phaseData]: [string, any]) => {
      // Skip selectedSuppliers entry and development phase (handled by features)
      if (phaseKey === 'selectedSuppliers' || phaseKey === 'development') {
        return;
      }
      
      if (phaseData.manDays && phaseData.manDays > 0 && phaseData.effort) {
        // Process each role in the phase effort distribution
        Object.entries(phaseData.effort).forEach(([role, percentage]: [string, any]) => {
          if (!percentage || percentage === 0) return;
          
          const supplierId = selectedSuppliers[role];
          if (!supplierId) {
            return;
          }
          
          const supplierData = this.getSupplierData(supplierId);
          if (!supplierData) {
            return;
          }
          
          // Calculate MDs for this role in this phase (round to 1 decimal)
          const phaseMDs = Math.round((phaseData.manDays * (percentage / 100)) * 10) / 10;
          
          const cost: VendorCost = {
            vendorId: supplierId,
            vendorName: supplierData.name || supplierId,
            role: role as 'G1' | 'G2' | 'TA' | 'PM',
            department: supplierData.department || role,
            officialRate: supplierData.officialRate || 0,
            realRate: supplierData.realRate || 0,
            estimatedMDs: phaseMDs,
            finalMDs: phaseMDs,
            totCost: Math.round(phaseMDs * (supplierData.realRate || 0)),
            finalTotCost: Math.round(phaseMDs * (supplierData.officialRate || 0)),
            isInternal: supplierData.type === 'internal' || false
          };
          
          costs.push(cost);
        });
      }
    });
    return costs;
  }

  /**
   * Processa costi dal coverage - assegnato al vendor G2 selezionato
   */
  private processCoverageCost(coverage: number, g2VendorId: string): VendorCost | null {
    const supplierData = this.getSupplierData(g2VendorId);
    
    if (!supplierData) {
      console.warn('G2 vendor not found for coverage:', g2VendorId);
      return null;
    }
    
    const coverageCost: VendorCost = {
      vendorId: g2VendorId,
      vendorName: supplierData.name || g2VendorId,
      role: 'G2' as 'G2',
      department: supplierData.department || 'Development',
      officialRate: supplierData.officialRate || 0,
      realRate: supplierData.realRate || 0,
      estimatedMDs: coverage,
      finalMDs: coverage,
      totCost: Math.round(coverage * (supplierData.realRate || 0)),
      finalTotCost: Math.round(coverage * (supplierData.officialRate || 0)),
      isInternal: supplierData.type === 'internal' || false
    };
    
    return coverageCost;
  }

  /**
   * Consolida costi per vendor + role + department
   */
  private consolidateVendorCosts(costs: VendorCost[]): VendorCost[] {
    const consolidated = new Map<string, VendorCost>();
    
    costs.forEach(cost => {
      const key = `${cost.vendorId}_${cost.role}_${cost.department}`;
      
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.estimatedMDs = Math.round((existing.estimatedMDs + cost.estimatedMDs) * 10) / 10;
        existing.finalMDs = Math.round((existing.finalMDs + cost.finalMDs) * 10) / 10;
        existing.totCost = Math.round(existing.totCost + cost.totCost);
        existing.finalTotCost = Math.round(existing.finalTotCost + cost.finalTotCost);
      } else {
        consolidated.set(key, { ...cost });
      }
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
   */
  private applyFinalMDsOverridesWithCustom(vendorCosts: VendorCost[], overrides: Record<string, number>): VendorCost[] {
    
    const result = vendorCosts.map(cost => {
      const key = `${cost.vendorId}_${cost.role}_${cost.department}`;
      const override = overrides[key];
      
      if (override !== undefined) {
        return {
          ...cost,
          finalMDs: override,
          finalTotCost: override * cost.officialRate
        };
      }
      
      return cost;
    });
    
    
    return result;
  }

  /**
   * EDITING: Update Final MDs per vendor - ATOMIC UPDATE
   */
  updateFinalMDs(vendorId: string, role: string, department: string, newValue: number): void {
    try {
      
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;
      
      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // Get current overrides and add new one
      const currentOverrides = state.calculationsData?.finalMDsOverrides || {};
      const key = `${vendorId}_${role}_${department}`;
      const updatedOverrides = {
        ...currentOverrides,
        [key]: newValue
      };
      
      
      // 1. Process all costs (same as calculateProjectCosts)
      const vendorCosts = this.processAllCosts(currentProject);
      
      // 2. Apply ALL overrides (including the new one)
      const costsWithOverrides = this.applyFinalMDsOverridesWithCustom(vendorCosts, updatedOverrides);
      
      // 3. Calculate KPIs
      const kpiData = this.calculateKPIs(costsWithOverrides);
      
      // 4. SINGLE store update with everything
      state.setCalculationsData({
        vendorCosts: costsWithOverrides,
        kpiData: kpiData,
        finalMDsOverrides: updatedOverrides
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
   * Helper: Ottiene dati supplier
   */
  private getSupplierData(supplierId: string): any {
    const configManager = this.getConfigManager();
    if (!configManager) {
      console.error(`ConfigManager not available for supplier: ${supplierId}`);
      return null;
    }
    
    // Get project configuration from current project (following FeatureActions pattern)
    const store = this.getStore();
    const state = store?.getState();
    const currentProject = state?.currentProject;
    // Support both legacy (config) and new (configuration) structure
    const projectConfig = currentProject?.configuration || currentProject?.config;
    
    // Cerca nei suppliers (external)
    const suppliers = configManager.getSuppliers(projectConfig) || [];
    
    let supplier = suppliers.find(s => s.id === supplierId);
    
    if (supplier) {
      return supplier;
    }
    
    // Se non trovato, cerca negli internal resources
    const internalResources = configManager.getInternalResources(projectConfig) || [];
    
    supplier = internalResources.find(r => r.id === supplierId);
    
    if (supplier) {
      supplier.type = 'internal';
      return supplier;
    }
    
    console.error('Supplier not found:', supplierId);
    return null;
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
    
    const emailTemplate = `Dear colleagues,
Please find below the estimation details for the implementation of ${projectName} based on the provided requirements.

The estimated budget for the technical part is ${gtoTotal.toLocaleString()} € vat incl.

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
   */
  resetSingleFinalMD(vendorId: string, role: string, department: string): void {
    try {
      const store = this.getStore();
      const state = store.getState();
      const currentProject = state.currentProject;
      
      if (!currentProject) {
        throw new Error('No project loaded');
      }

      const key = `${vendorId}_${role}_${department}`;
      
      // Rimuovi override specifico
      const currentOverrides = state.calculationsData?.finalMDsOverrides || {};
      const newOverrides = { ...currentOverrides };
      delete newOverrides[key];
      
      // 1. Process all costs (same as calculateProjectCosts)
      const vendorCosts = this.processAllCosts(currentProject);
      
      // 2. Apply remaining overrides (excluding the one we just deleted)
      const costsWithOverrides = this.applyFinalMDsOverridesWithCustom(vendorCosts, newOverrides);
      
      // 3. Calculate KPIs
      const kpiData = this.calculateKPIs(costsWithOverrides);
      
      // 4. Update store with all changes
      state.setCalculationsData({
        vendorCosts: costsWithOverrides,
        kpiData: kpiData,
        finalMDsOverrides: newOverrides
      });
      
      console.log('Single Final MD reset:', { vendorId, role, department });
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
}

// Create singleton instance
export const calculationsActions = new CalculationsActions();