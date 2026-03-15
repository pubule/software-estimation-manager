/**
 * WorkingPackageCalculator.ts
 *
 * Calcolatore per modalità Working Package.
 * Basato su importi totali GTO/GDS con split tra vendor.
 *
 * RESPONSABILITA':
 * - Leggere configurazione GTO/GDS
 * - Calcolare split primary/secondary
 * - Generare entries senza calcolo MDs/rate
 * - Gestire percentuali e importi
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
    this.project = store.getState().currentProject;
    this.workingPackageData = this.project?.workingPackageData || {
      enabled: false,
      gto: { enabled: false, totalAmount: 0, primaryVendorId: null, secondaryVendorId: null, secondaryPercentage: 0 },
      gds: { enabled: false, totalAmount: 0, primaryVendorId: null, secondaryVendorId: null, secondaryPercentage: 0 }
    };
  }

  /**
   * Esegue il calcolo completo Working Package
   * @param _overrides - Ignored in WP mode (only for interface compatibility)
   */
  calculate(_overrides?: Record<string, number>): WorkingPackageCostData {
    console.log('📦 WorkingPackageCalculator: Starting calculation...');

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

    // Converti a VendorCost per compatibilità UI
    const vendorCosts = this.convertToVendorCosts(entries);

    // Calcola KPIs
    const kpiData = this.calculateKPIs(entries, summary);

    console.log('✅ WorkingPackageCalculator: Completed with', entries.length, 'entries');

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

    // Crea entry primary
    if (categoryData.primaryVendorId) {
      const primaryVendor = this.getVendorData(categoryData.primaryVendorId);
      if (primaryVendor) {
        entries.push({
          vendorId: categoryData.primaryVendorId,
          vendorName: primaryVendor.name,
          category,
          allocationType: 'primary',
          percentage: 100 - (categoryData.secondaryPercentage || 0),
          amount: split.primaryAmount,
          isInternal: primaryVendor.type === 'internal',
          role: this.getVendorRole(categoryData.primaryVendorId) || defaultRole
        });
      }
    }

    // Crea entry secondary
    if (categoryData.secondaryVendorId && categoryData.secondaryPercentage > 0) {
      const secondaryVendor = this.getVendorData(categoryData.secondaryVendorId);
      if (secondaryVendor) {
        entries.push({
          vendorId: categoryData.secondaryVendorId,
          vendorName: secondaryVendor.name,
          category,
          allocationType: 'secondary',
          percentage: categoryData.secondaryPercentage,
          amount: split.secondaryAmount,
          isInternal: secondaryVendor.type === 'internal',
          role: this.getVendorRole(categoryData.secondaryVendorId) || defaultRole
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
   * NOTA: In Working Package mode, MDs e Rate non sono significativi.
   * Vengono impostati a valori placeholder (0, 1) per mantenere la compatibilità
   * con la tabella esistente che si aspetta questi campi.
   *
   * IMPORTANTE: Le entry vengono consolidate per vendor+role per evitare duplicati
   * quando lo stesso vendor è usato per più categorie (GTO/GDS) o allocation types.
   */
  private convertToVendorCosts(entries: WorkingPackageEntry[]): VendorCost[] {
    // Consolidate by vendorId+role to avoid duplicate keys
    const consolidated = new Map<string, VendorCost>();

    entries.forEach(entry => {
      const key = `${entry.vendorId}_${entry.role}`;

      if (consolidated.has(key)) {
        // Add amounts for same vendor+role
        const existing = consolidated.get(key)!;
        existing.totCost += entry.amount;
        existing.finalTotCost += entry.amount;
      } else {
        // In WP mode, i campi MDs e Rate sono placeholder
        // L'importo reale è in totCost/finalTotCost
        const placeholderMDs = 0;
        const placeholderRate = 1;

        consolidated.set(key, {
          vendorId: entry.vendorId,
          vendorName: entry.vendorName,
          role: entry.role,
          department: entry.isInternal ? 'Internal' : 'External',
          officialRate: placeholderRate,
          realRate: placeholderRate,
          estimatedMDs: placeholderMDs,
          finalMDs: placeholderMDs,
          totCost: entry.amount,
          finalTotCost: entry.amount,
          isInternal: entry.isInternal
        });
      }
    });

    return Array.from(consolidated.values());
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
   * Recupera ruolo del vendor dal job cluster
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
