/**
 * Calculator.ts - Interfaccia base per tutti i calculator
 *
 * PATTERN: Strategy Pattern per segregazione logica di calcolo
 * - FeatureBasedCalculator: Calcoli basati su feature e fasi
 * - WorkingPackageCalculator: Calcoli basati su importi GTO/GDS
 */

import type { VendorCost, KPIData } from '../CalculationsActions';

/**
 * Tipo di modalità di calcolo
 */
export type CalculationMode = 'feature-based' | 'working-package';

/**
 * Risultato base del calcolo
 */
export interface CalculationResult {
  mode: CalculationMode;
  vendorCosts: VendorCost[];
  kpiData: KPIData;
}

/**
 * Interfaccia base per tutti i calculator
 */
export interface ICalculator {
  /**
   * Esegue il calcolo completo
   * @param overrides - Optional Final MDs overrides (only used by FeatureBasedCalculator)
   * @returns CalculationResult con i dati calcolati
   */
  calculate(overrides?: Record<string, number>): CalculationResult;
}

/**
 * Interfaccia per dati specifici di Feature-based calculation
 */
export interface FeatureBasedCostData extends CalculationResult {
  mode: 'feature-based';
  entries: FeatureBasedEntry[];
}

/**
 * Entry per feature-based calculation
 */
export interface FeatureBasedEntry {
  vendorId: string;
  vendorName: string;
  role: 'G1' | 'G2' | 'TA' | 'PM';
  manDays: number;
  realRate: number;
  totalCost: number;
  isInternal: boolean;
  department: string;
  source: 'phases' | 'features' | 'coverage';
}

/**
 * Interfaccia per dati specifici di Working Package calculation
 */
export interface WorkingPackageCostData extends CalculationResult {
  mode: 'working-package';
  entries: WorkingPackageEntry[];
  summary: {
    gtoTotal: number;
    gdsTotal: number;
    projectTotal: number;
  };
  calculated: {
    gto: {
      primaryAmount: number;
      secondaryAmount: number;
      totalAmount: number;
    };
    gds: {
      primaryAmount: number;
      secondaryAmount: number;
      totalAmount: number;
    };
  };
}

/**
 * Entry per working package calculation
 */
export interface WorkingPackageEntry {
  vendorId: string;
  vendorName: string;
  category: 'GTO' | 'GDS';
  allocationType: 'primary' | 'secondary';
  percentage: number;
  amount: number;
  isInternal: boolean;
  role: 'G1' | 'G2' | 'TA' | 'PM';
}

/**
 * Costanti per i ruoli
 */
export const ROLES = {
  G1: 'G1' as const,
  G2: 'G2' as const,
  TA: 'TA' as const,
  PM: 'PM' as const
};

/**
 * Mappatura categorie a ruoli
 */
export const CATEGORY_ROLES = {
  gto: [ROLES.G2, ROLES.TA],
  gds: [ROLES.G1, ROLES.PM]
};
