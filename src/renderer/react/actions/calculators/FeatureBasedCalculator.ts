/**
 * FeatureBasedCalculator.ts
 *
 * Calcolatore per modalità Feature-based.
 * Replica la logica originale di processAllCosts per garantire compatibilità.
 */

import type { ICalculator, FeatureBasedCostData, FeatureBasedEntry } from './Calculator';
import type { VendorCost, KPIData } from '../CalculationsActions';

export class FeatureBasedCalculator implements ICalculator {
  private store: any;
  private configManager: any;
  private project: any;

  constructor(store: any, configManager: any) {
    this.store = store;
    this.configManager = configManager;
    this.project = store.getState().currentProject;
  }

  /**
   * Esegue il calcolo completo feature-based
   * Usa la stessa logica dell'originale processAllCosts
   *
   * @param overrides - Optional Final MDs overrides to apply { "vendorId_role": finalMDs }
   */
  calculate(overrides?: Record<string, number>): FeatureBasedCostData {
    console.log('🧮 FeatureBasedCalculator: Starting calculation...', overrides ? `with ${Object.keys(overrides).length} overrides` : '');

    // Usa la logica originale che funziona con la struttura dati reale
    let vendorCosts = this.processAllCosts();

    // Apply overrides if provided
    if (overrides && Object.keys(overrides).length > 0) {
      vendorCosts = this.applyOverrides(vendorCosts, overrides);
    }

    // Calcola KPIs
    const kpiData = this.calculateKPIs(vendorCosts);

    // Converti a FeatureBasedEntry
    const entries: FeatureBasedEntry[] = vendorCosts.map(vc => ({
      vendorId: vc.vendorId,
      vendorName: vc.vendorName,
      role: vc.role,
      manDays: vc.estimatedMDs,
      realRate: vc.realRate,
      totalCost: vc.totCost,
      isInternal: vc.isInternal,
      department: vc.department,
      source: 'phases' as const
    }));

    console.log('✅ FeatureBasedCalculator: Completed with', entries.length, 'entries');

    return {
      mode: 'feature-based',
      vendorCosts,
      kpiData,
      entries
    };
  }

  /**
   * Applica override Final MDs ai vendor costs
   * Calcola finalTotCost = finalMDs * realRate
   */
  private applyOverrides(vendorCosts: VendorCost[], overrides: Record<string, number>): VendorCost[] {
    return vendorCosts.map(cost => {
      const key = `${cost.vendorId}_${cost.role}`;
      const override = overrides[key];

      if (override !== undefined) {
        return {
          ...cost,
          finalMDs: override,
          finalTotCost: Math.round(override * cost.realRate)
        };
      }

      return cost;
    });
  }

  /**
   * Processa tutti i costi usando le stesse funzioni di Phases per coerenza assoluta.
   * Replica l'originale processAllCosts da CalculationsActions.
   */
  private processAllCosts(): VendorCost[] {
    const phasesActions = (window as any).phasesActions;
    if (!phasesActions) {
      console.error('[FeatureBasedCalculator] phasesActions not available');
      return [];
    }

    const selectedPhaseResources = this.project.phases?.selectedPhaseResources || this.project.phases?.selectedSuppliers || {};

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
          const configManager = this.configManager;
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
    Object.entries(this.project.phases || {}).forEach(([phaseKey, phaseData]: [string, any]) => {
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
        const supplier = this.getSupplierData(total.vendorId);
        const officialRate = this.getOfficialRate(total.vendorId, role);
        const realRate = total.rate || officialRate;
        const finalMDs = Math.round(total.mds * 10) / 10;

        allCosts.push({
          vendorId: total.vendorId,
          vendorName: supplier?.name || `${role} Vendor`,
          role: role as 'G1' | 'G2' | 'TA' | 'PM',
          department: supplier?.department || 'Development',
          officialRate: officialRate,
          realRate: realRate,
          estimatedMDs: finalMDs,
          finalMDs: finalMDs,
          totCost: Math.round(total.cost),
          finalTotCost: Math.round(finalMDs * realRate),
          isInternal: supplier?.type?.toLowerCase() === 'internal'
        });
      }
    });

    return allCosts;
  }

  /**
   * Recupera dati supplier
   */
  private getSupplierData(vendorId: string): any {
    const configManager = this.configManager;
    if (!configManager) return null;
    const vendors = configManager.getVendors() || [];
    return vendors.find((v: any) => v.id === vendorId);
  }

  /**
   * Recupera official rate per vendor+role
   */
  private getOfficialRate(vendorId: string, role: string): number {
    const supplier = this.getSupplierData(vendorId);
    if (!supplier) return 0;

    // Cerca rate specifico per ruolo nei job clusters
    if (supplier.jobClusters && supplier.jobClusters.length > 0) {
      for (const jc of supplier.jobClusters) {
        if (jc.role === role) {
          return jc.officialRate || jc.rate || 0;
        }
      }
    }

    return supplier.officialRate || supplier.rate || 0;
  }

  /**
   * Calcola KPIs dai vendor costs
   */
  private calculateKPIs(vendorCosts: VendorCost[]): KPIData {
    const gtoRoles = ['G2', 'TA'];
    const gdsRoles = ['G1', 'PM'];

    const gtoCosts = vendorCosts.filter(c => gtoRoles.includes(c.role));
    const gdsCosts = vendorCosts.filter(c => gdsRoles.includes(c.role));

    const gtoInternal = gtoCosts.filter(c => c.isInternal).reduce((sum, c) => sum + c.finalTotCost, 0);
    const gtoExternal = gtoCosts.filter(c => !c.isInternal).reduce((sum, c) => sum + c.finalTotCost, 0);
    const gtoTotal = gtoInternal + gtoExternal;

    const gdsInternal = gdsCosts.filter(c => c.isInternal).reduce((sum, c) => sum + c.finalTotCost, 0);
    const gdsExternal = gdsCosts.filter(c => !c.isInternal).reduce((sum, c) => sum + c.finalTotCost, 0);
    const gdsTotal = gdsInternal + gdsExternal;

    const totalProject = gtoTotal + gdsTotal;

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
}
