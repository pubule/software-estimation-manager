/**
 * WorkingPackageCalculator.ts
 *
 * Calcolatore per modalità Working Package.
 * Basato su importi totali GTO/GDS con split tra vendor.
 *
 * RESPONSABILITA':
 * - Leggere configurazione GTO/GDS
 * - Calcolare split primary/secondary
 * - Calcolare MDs come amount / realRate
 * - Supportare override MDs (come Feature-based)
 * - Mantenere righe separate per Primary/Secondary
 */

import type { ICalculator, WorkingPackageCostData, WorkingPackageEntry } from './Calculator';
import type { VendorCost, KPIData, WorkingPackageData, WorkingPackageCategoryData } from '../CalculationsActions';

interface SplitResult {
  primaryAmount: number;
  secondaryAmount: number;
  totalAmount: number;
}

export class WorkingPackageCalculator implements ICalculator {
  private store: any;
  private configManager: any;
  private project: any;
  private workingPackageData: WorkingPackageData;

  constructor(store: any, configManager: any) {
    this.store = store;
    this.configManager = configManager;
    console.log('📦 WorkingPackageCalculator created, configManager available:', !!configManager);
    this.project = store.getState().currentProject;
    this.workingPackageData = this.project?.workingPackageData || {
      enabled: false,
      gto: { enabled: false, totalAmount: 0, primaryVendorId: null, secondaryVendorId: null, secondaryPercentage: 0 },
      gds: { enabled: false, totalAmount: 0, primaryVendorId: null, secondaryVendorId: null, secondaryPercentage: 0 }
    };
  }

  /**
   * Esegue il calcolo completo Working Package
   * @param overrides - Optional Final MDs overrides { "vendorId_role": finalMDs }
   */
  calculate(overrides?: Record<string, number>): WorkingPackageCostData {
    console.log('📦 WorkingPackageCalculator: Starting calculation...', overrides ? `with ${Object.keys(overrides).length} overrides` : '');

    const entries: WorkingPackageEntry[] = [];
    const calculatedData = {
      gto: { primaryAmount: 0, secondaryAmount: 0, totalAmount: 0 },
      gds: { primaryAmount: 0, secondaryAmount: 0, totalAmount: 0 }
    };

    // Processa GTO
    if (this.workingPackageData.gto?.enabled && this.workingPackageData.gto.totalAmount > 0) {
      const gtoEntries = this.processCategory(this.workingPackageData.gto, 'GTO');
      entries.push(...gtoEntries.entries);
      calculatedData.gto = gtoEntries.calculated;
    }

    // Processa GDS
    if (this.workingPackageData.gds?.enabled && this.workingPackageData.gds.totalAmount > 0) {
      const gdsEntries = this.processCategory(this.workingPackageData.gds, 'GDS');
      entries.push(...gdsEntries.entries);
      calculatedData.gds = gdsEntries.calculated;
    }

    // Se nessuna categoria ha dati validi
    if (entries.length === 0) {
      console.log('⚠️ WorkingPackageCalculator: No valid categories configured');
      return this.createEmptyResult();
    }

    // Calcola totali
    const summary = {
      gtoTotal: calculatedData.gto.totalAmount,
      gdsTotal: calculatedData.gds.totalAmount,
      projectTotal: calculatedData.gto.totalAmount + calculatedData.gds.totalAmount
    };

    // Converti a VendorCost per compatibilità UI (righe separate, non consolidate)
    const vendorCosts = this.convertToVendorCosts(entries, overrides);

    // Calcola KPIs
    const kpiData = this.calculateKPIs(entries, summary);

    console.log('✅ WorkingPackageCalculator: Completed with', entries.length, 'entries,', vendorCosts.length, 'vendor costs');

    return {
      mode: 'working-package',
      vendorCosts,
      kpiData,
      entries,
      summary,
      calculated: calculatedData
    };
  }

  /**
   * Processa una categoria (GTO o GDS)
   */
  private processCategory(
    categoryData: WorkingPackageCategoryData,
    category: 'GTO' | 'GDS'
  ): { entries: WorkingPackageEntry[]; calculated: { primaryAmount: number; secondaryAmount: number; totalAmount: number } } {
    const entries: WorkingPackageEntry[] = [];

    // Calcola split
    const split = this.calculateSplit(categoryData.totalAmount, categoryData.secondaryPercentage);

    // Determina ruolo di default per la categoria
    const defaultRole = category === 'GTO' ? 'G2' : 'G1';

    // Ottieni i jobCluster selezionati da workingPackageResources
    const store = this.store.getState();
    const workingPackageResources = store.workingPackageResources;
    const categoryResources = workingPackageResources[category];
    const primaryJobCluster = categoryResources?.primaryResource?.jobCluster;
    const secondaryJobCluster = categoryResources?.secondaryResource?.jobCluster;

    // Crea entry primary
    if (categoryData.primaryVendorId) {
      const primaryVendor = this.getVendorData(categoryData.primaryVendorId);
      if (primaryVendor) {
        // Usa il jobCluster selezionato per cercare il role nel vendor
        const primaryRole = this.getRoleForJobCluster(primaryVendor, primaryJobCluster) || defaultRole;

        entries.push({
          vendorId: categoryData.primaryVendorId,
          vendorName: primaryVendor.name,
          category,
          allocationType: 'primary',
          percentage: 100 - (categoryData.secondaryPercentage || 0),
          amount: split.primaryAmount,
          isInternal: primaryVendor.type?.toLowerCase() === 'internal',
          role: primaryRole
        });
      }
    }

    // Crea entry secondary
    if (categoryData.secondaryVendorId && categoryData.secondaryPercentage > 0) {
      const secondaryVendor = this.getVendorData(categoryData.secondaryVendorId);
      if (secondaryVendor) {
        // Usa il jobCluster selezionato per cercare il role nel vendor
        const secondaryRole = this.getRoleForJobCluster(secondaryVendor, secondaryJobCluster) || defaultRole;

        entries.push({
          vendorId: categoryData.secondaryVendorId,
          vendorName: secondaryVendor.name,
          category,
          allocationType: 'secondary',
          percentage: categoryData.secondaryPercentage,
          amount: split.secondaryAmount,
          isInternal: secondaryVendor.type?.toLowerCase() === 'internal',
          role: secondaryRole
        });
      }
    }

    return {
      entries,
      calculated: split
    };
  }

  /**
   * Calcola lo split tra primary e secondary
   */
  private calculateSplit(totalAmount: number, secondaryPercentage: number): SplitResult {
    const secondaryAmount = Math.round(totalAmount * (secondaryPercentage / 100));
    const primaryAmount = totalAmount - secondaryAmount;

    return {
      primaryAmount,
      secondaryAmount,
      totalAmount
    };
  }

  /**
   * Converte WorkingPackageEntry in VendorCost per compatibilità UI
   *
   * NOTA: Le entry NON vengono consolidate per mantenere righe separate
   * per Primary e Secondary vendor.
   *
   * Calcola MDs come: amount / realRate
   * Applica override se presenti: finalMDs = override ?? estimatedMDs
   * Calcola finalTotCost: finalMDs * realRate
   */
  private convertToVendorCosts(entries: WorkingPackageEntry[], overrides?: Record<string, number>): VendorCost[] {
    const vendorCosts: VendorCost[] = [];

    entries.forEach(entry => {
      // Ottieni il real rate reale del vendor (passa anche il ruolo)
      const realRate = this.getVendorRealRate(entry.vendorId, entry.role);

      // Calcola MDs: amount / rate
      const estimatedMDs = realRate > 0 ? Math.round((entry.amount / realRate) * 10) / 10 : 0;

      // Applica override se presente
      const overrideKey = `${entry.vendorId}_${entry.role}`;
      const overrideMDs = overrides?.[overrideKey];
      const finalMDs = overrideMDs !== undefined ? overrideMDs : estimatedMDs;

      // Calcola finalTotCost
      const finalTotCost = Math.round(finalMDs * realRate);

      vendorCosts.push({
        vendorId: entry.vendorId,
        vendorName: entry.vendorName,
        role: entry.role,
        category: entry.category,  // NUOVO: GTO/GDS
        allocationType: entry.allocationType,  // NUOVO: primary/secondary
        department: entry.isInternal ? 'Internal' : 'External',
        officialRate: realRate,
        realRate: realRate,
        estimatedMDs: estimatedMDs,
        finalMDs: finalMDs,
        totCost: entry.amount,
        finalTotCost: finalTotCost,
        isInternal: entry.isInternal
      });
    });

    return vendorCosts;
  }

  /**
   * Recupera il real rate per un vendor e ruolo
   * Usa workingPackageData per trovare la categoria del vendor,
   * poi usa workingPackageResources per ottenere la selezione della modale
   * SENZA fallback: se non trova la rate, ritorna 0 e logga errore
   */
  private getVendorRealRate(vendorId: string, role?: string): number {
    console.log('🔍 getVendorRealRate called for vendorId:', vendorId, 'role:', role);

    const store = this.store.getState();
    const { workingPackageResources, currentProject } = store;
    const workingPackageData = currentProject?.workingPackageData;

    if (!workingPackageData) {
      console.error('❌ No workingPackageData found for vendor:', vendorId);
      return 0;
    }

    // Trova la category e type per questo vendor cercando in workingPackageData
    // GTO: primaryVendorId -> G2, secondaryVendorId -> TA
    // GDS: primaryVendorId -> G1, secondaryVendorId -> PM
    let category: 'gto' | 'gds' | null = null;
    let type: 'primaryResource' | 'secondaryResource' | null = null;
    let expectedRole: string | null = null;

    if (workingPackageData.gto?.primaryVendorId === vendorId) {
      category = 'gto';
      type = 'primaryResource';
      expectedRole = 'G2';
    } else if (workingPackageData.gto?.secondaryVendorId === vendorId) {
      category = 'gto';
      type = 'secondaryResource';
      expectedRole = 'TA';
    } else if (workingPackageData.gds?.primaryVendorId === vendorId) {
      category = 'gds';
      type = 'primaryResource';
      expectedRole = 'G1';
    } else if (workingPackageData.gds?.secondaryVendorId === vendorId) {
      category = 'gds';
      type = 'secondaryResource';
      expectedRole = 'PM';
    }

    console.log('🔍 Vendor allocation:', { category, type, expectedRole });

    if (!category || !type) {
      console.error('❌ Vendor', vendorId, 'not found in workingPackageData (primary/secondary vendors)');
      return 0;
    }

    // Verifica che il ruolo corrisponda (per debug)
    if (role && expectedRole && role !== expectedRole) {
      console.warn('⚠️ Role mismatch: expected', expectedRole, 'but got', role);
    }

    const resource = workingPackageResources?.[category]?.[type as keyof typeof workingPackageResources[category]];

    console.log('🔍 WP Resource for', category, type, ':', resource);

    if (resource && resource.vendorId === vendorId) {
      // Usa i dettagli dalla selezione della modale
      console.log('🔍 Using modal selection:', resource);
      try {
        const rateDetails = this.configManager.getRate({
          vendorId: resource.vendorId,
          jobCluster: resource.jobCluster,
          seniority: resource.seniority,
          location: resource.location,
          deliveryModel: resource.deliveryModel
        });
        if (rateDetails?.realRate) {
          console.log('✅ Found rate via modal selection:', rateDetails.realRate);
          return rateDetails.realRate;
        }
      } catch (e) {
        console.error('❌ Error getting rate from configManager:', e);
      }
      console.error('❌ Rate not found for vendor:', vendorId, 'with modal selection:', resource);
      return 0;
    }

    console.error('❌ No resource found in workingPackageResources for vendor:', vendorId, '(resource:', resource, ')');
    return 0;
  }

  /**
   * Trova il job cluster per un ruolo specifico
   */
  private getJobClusterForRole(vendor: any, role: string): any {
    if (!vendor.jobClusters || vendor.jobClusters.length === 0) return null;

    // Cerca job cluster che matcha il ruolo
    const matching = vendor.jobClusters.find((jc: any) => jc.role === role);
    if (matching) return matching;

    // Se non trovato, ritorna il primo
    return vendor.jobClusters[0];
  }

  /**
   * Calcola KPIs per Working Package
   */
  private calculateKPIs(entries: WorkingPackageEntry[], summary: { gtoTotal: number; gdsTotal: number; projectTotal: number }): KPIData {
    const gtoEntries = entries.filter(e => e.category === 'GTO');
    const gdsEntries = entries.filter(e => e.category === 'GDS');

    const gtoInternal = gtoEntries.filter(e => e.isInternal).reduce((sum, e) => sum + e.amount, 0);
    const gtoExternal = gtoEntries.filter(e => !e.isInternal).reduce((sum, e) => sum + e.amount, 0);
    const gtoTotal = summary.gtoTotal;

    const gdsInternal = gdsEntries.filter(e => e.isInternal).reduce((sum, e) => sum + e.amount, 0);
    const gdsExternal = gdsEntries.filter(e => !e.isInternal).reduce((sum, e) => sum + e.amount, 0);
    const gdsTotal = summary.gdsTotal;

    const totalProject = summary.projectTotal;

    return {
      gto: {
        internal: gtoInternal,
        external: gtoExternal,
        total: gtoTotal,
        internalPercentage: gtoTotal > 0 ? Math.round((gtoInternal / gtoTotal) * 1000) / 10 : 0,
        externalPercentage: gtoTotal > 0 ? Math.round((gtoExternal / gtoTotal) * 1000) / 10 : 0
      },
      gds: {
        internal: gdsInternal,
        external: gdsExternal,
        total: gdsTotal,
        internalPercentage: gdsTotal > 0 ? Math.round((gdsInternal / gdsTotal) * 1000) / 10 : 0,
        externalPercentage: gdsTotal > 0 ? Math.round((gdsExternal / gdsTotal) * 1000) / 10 : 0
      },
      totalProject,
      totalInternalPercentage: totalProject > 0 ? Math.round(((gtoInternal + gdsInternal) / totalProject) * 1000) / 10 : 0,
      totalExternalPercentage: totalProject > 0 ? Math.round(((gtoExternal + gdsExternal) / totalProject) * 1000) / 10 : 0
    };
  }

  /**
   * Recupera dati vendor
   */
  private getVendorData(vendorId: string): any {
    if (!this.configManager) return null;
    const vendors = this.configManager.getVendors() || [];
    return vendors.find((v: any) => v.id === vendorId);
  }

  /**
   * Recupera ruolo del vendor dal job cluster specificato
   * Cerca nel vendor.jobClusters il matching per clusterId
   */
  private getRoleForJobCluster(vendor: any, jobCluster?: string): 'G1' | 'G2' | 'TA' | 'PM' | null {
    if (!vendor?.jobClusters || vendor.jobClusters.length === 0 || !jobCluster) return null;

    const matching = vendor.jobClusters.find((jc: any) => jc.clusterId === jobCluster);
    if (matching?.role && ['G1', 'G2', 'TA', 'PM'].includes(matching.role)) {
      return matching.role as 'G1' | 'G2' | 'TA' | 'PM';
    }
    return null;
  }

  /**
   * Recupera ruolo del vendor dal job cluster (legacy - usa solo il primo)
   */
  private getVendorRole(vendorId: string): 'G1' | 'G2' | 'TA' | 'PM' | null {
    const vendor = this.getVendorData(vendorId);
    if (!vendor?.jobClusters || vendor.jobClusters.length === 0) return null;

    const jc = vendor.jobClusters[0];
    if (jc.role && ['G1', 'G2', 'TA', 'PM'].includes(jc.role)) {
      return jc.role as 'G1' | 'G2' | 'TA' | 'PM';
    }
    return null;
  }

  /**
   * Crea risultato vuoto per quando non ci sono dati validi
   */
  private createEmptyResult(): WorkingPackageCostData {
    const emptyKPIs: KPIData = {
      gto: { internal: 0, external: 0, total: 0, internalPercentage: 0, externalPercentage: 0 },
      gds: { internal: 0, external: 0, total: 0, internalPercentage: 0, externalPercentage: 0 },
      totalProject: 0,
      totalInternalPercentage: 0,
      totalExternalPercentage: 0
    };

    return {
      mode: 'working-package',
      vendorCosts: [],
      kpiData: emptyKPIs,
      entries: [],
      summary: { gtoTotal: 0, gdsTotal: 0, projectTotal: 0 },
      calculated: {
        gto: { primaryAmount: 0, secondaryAmount: 0, totalAmount: 0 },
        gds: { primaryAmount: 0, secondaryAmount: 0, totalAmount: 0 }
      }
    };
  }
}
