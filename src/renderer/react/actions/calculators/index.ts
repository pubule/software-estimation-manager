/**
 * Calculators Module - Export centralizzato
 *
 * PATTERN: Barrel Export
 * Centralizza l'export di tutti i calculator
 */

// Interfacce e tipi
export type {
  ICalculator,
  CalculationMode,
  CalculationResult,
  FeatureBasedCostData,
  FeatureBasedEntry,
  WorkingPackageCostData,
  WorkingPackageEntry
} from './Calculator';

export { ROLES, CATEGORY_ROLES } from './Calculator';

// Calculator implementations
export { FeatureBasedCalculator } from './FeatureBasedCalculator';
export { WorkingPackageCalculator } from './WorkingPackageCalculator';

// Factory
export { CalculatorFactory, type CalculatorFactoryDependencies } from './CalculatorFactory';
