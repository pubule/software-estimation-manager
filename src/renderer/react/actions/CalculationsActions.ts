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
      
      console.log('🔍 CALCULATE DEBUG - Current project:', currentProject);
      
      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // 1. Processa tutti i costi (features + phases)
      const vendorCosts = this.processAllCosts(currentProject);
      console.log('🔍 CALCULATE DEBUG - Vendor costs processed:', vendorCosts.length);
      
      // 2. Applica override Final MDs se esistono
      const costsWithOverrides = this.applyFinalMDsOverrides(vendorCosts);
      console.log('🔍 CALCULATE DEBUG - Costs with overrides:', costsWithOverrides.length);
      
      // 3. Calcola KPI
      const kpiData = this.calculateKPIs(costsWithOverrides);
      console.log('🔍 CALCULATE DEBUG - KPI calculated:', kpiData);
      
      // 4. Aggiorna store
      state.setCalculationsData({
        vendorCosts: costsWithOverrides,
        kpiData: kpiData
      });
      
      console.log('🔍 CALCULATE DEBUG - Store updated with vendor costs:', costsWithOverrides.length);
      console.log('Calculations updated successfully');
    } catch (error) {
      console.error('Failed to calculate project costs:', error);
      throw error;
    }
  }

  /**
   * Processa tutti i costi (features + phases)
   */
  private processAllCosts(project: any): VendorCost[] {
    const allCosts: VendorCost[] = [];
    
    console.log('🔍 PROCESS_ALL DEBUG - Project features:', project.features?.length || 0);
    console.log('🔍 PROCESS_ALL DEBUG - Project phases:', project.phases ? Object.keys(project.phases).length : 0);
    
    // 1. Processa costi dalle features
    if (project.features && project.features.length > 0) {
      console.log('🔍 PROCESS_ALL DEBUG - Processing features...');
      const featuresCosts = this.processFeaturesCosts(project.features);
      console.log('🔍 PROCESS_ALL DEBUG - Features costs:', featuresCosts.length);
      allCosts.push(...featuresCosts);
    }
    
    // 2. Processa costi dalle phases
    if (project.phases) {
      console.log('🔍 PROCESS_ALL DEBUG - Processing phases...');
      const phasesCosts = this.processPhasesCosts(project.phases);
      console.log('🔍 PROCESS_ALL DEBUG - Phases costs:', phasesCosts.length);
      allCosts.push(...phasesCosts);
    }
    
    console.log('🔍 PROCESS_ALL DEBUG - Total costs before consolidation:', allCosts.length);
    
    // 3. Raggruppa per vendor + role + department
    const consolidatedCosts = this.consolidateVendorCosts(allCosts);
    console.log('🔍 PROCESS_ALL DEBUG - Final consolidated costs:', consolidatedCosts.length);
    
    return consolidatedCosts;
  }

  /**
   * Processa costi dalle features
   */
  private processFeaturesCosts(features: any[]): VendorCost[] {
    const costs: VendorCost[] = [];
    
    features.forEach(feature => {
      const supplierData = this.getSupplierData(feature.supplier);
      if (!supplierData) return;
      
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
   * Consolida costi per vendor + role + department
   */
  private consolidateVendorCosts(costs: VendorCost[]): VendorCost[] {
    const consolidated = new Map<string, VendorCost>();
    
    console.log('🔍 CONSOLIDATE DEBUG - Input costs:', costs.map(c => ({
      vendorId: c.vendorId,
      role: c.role,
      dept: c.department,
      key: `${c.vendorId}_${c.role}_${c.department}`,
      finalMDs: c.finalMDs
    })));
    
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
    
    const result = Array.from(consolidated.values());
    console.log('🔍 CONSOLIDATE DEBUG - Output costs:', result.map(c => ({
      vendorId: c.vendorId,
      role: c.role,
      dept: c.department,
      key: `${c.vendorId}_${c.role}_${c.department}`,
      finalMDs: c.finalMDs
    })));
    
    return result;
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
    console.log('🔍 OVERRIDE DEBUG - Applying overrides:', overrides);
    console.log('🔍 OVERRIDE DEBUG - VendorCosts before override:', vendorCosts.map(c => ({
      vendorId: c.vendorId,
      role: c.role,
      dept: c.department,
      key: `${c.vendorId}_${c.role}_${c.department}`,
      finalMDs: c.finalMDs
    })));
    
    const result = vendorCosts.map(cost => {
      const key = `${cost.vendorId}_${cost.role}_${cost.department}`;
      const override = overrides[key];
      
      if (override !== undefined) {
        console.log('🔍 OVERRIDE DEBUG - Applying override:', { key, override, originalMDs: cost.finalMDs });
        return {
          ...cost,
          finalMDs: override,
          finalTotCost: override * cost.officialRate
        };
      }
      
      return cost;
    });
    
    console.log('🔍 OVERRIDE DEBUG - VendorCosts after override:', result.map(c => ({
      vendorId: c.vendorId,
      role: c.role,
      dept: c.department,
      finalMDs: c.finalMDs
    })));
    
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
      
      console.log('🔍 OVERRIDE DEBUG - Saving:', { key, newValue, vendorId, role, department });
      console.log('🔍 OVERRIDE DEBUG - Current overrides before update:', currentOverrides);
      console.log('🔍 OVERRIDE DEBUG - Updated overrides:', updatedOverrides);
      
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
      
      console.log('Final MDs updated atomically:', { vendorId, role, department, newValue });
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
      
      console.log('🔍 APPLY_CATEGORY DEBUG - Current filters before update:', currentFilters);
      console.log('🔍 APPLY_CATEGORY DEBUG - Setting category to:', category);
      
      const newFilters = {
        ...currentFilters,
        category: category
      };
      
      console.log('🔍 APPLY_CATEGORY DEBUG - New filters object:', newFilters);
      
      state.setCalculationsFilters(newFilters);
      
      // Debug: Verify state after update
      const stateAfterUpdate = store.getState();
      console.log('🔍 ZUSTAND RAW STATE - After filter update:', stateAfterUpdate.calculationsData?.filters);
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
      const key = `${vendorId}_${role}_${department}`;
      
      // Rimuovi override specifico
      const currentOverrides = state.calculationsData?.finalMDsOverrides || {};
      const newOverrides = { ...currentOverrides };
      delete newOverrides[key];
      
      // Aggiorna store con gli override modificati
      state.setCalculationsData({
        ...state.calculationsData,
        finalMDsOverrides: newOverrides,
        version: (state.calculationsData?.version || 0) + 1
      });
      
      // Ricalcola
      this.calculateProjectCosts();
      
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
}

// Create singleton instance
export const calculationsActions = new CalculationsActions();