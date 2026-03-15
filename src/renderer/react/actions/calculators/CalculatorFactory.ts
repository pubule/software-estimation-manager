/**
 * CalculatorFactory.ts - Factory per creazione calculator
 *
 * PATTERN: Factory Method
 * Centralizza la selezione del calculator appropriato in base alla modalità
 */

import type { ICalculator, CalculationMode } from './Calculator';
import { FeatureBasedCalculator } from './FeatureBasedCalculator';
import { WorkingPackageCalculator } from './WorkingPackageCalculator';

export interface CalculatorFactoryDependencies {
  store: any;
  configManager: any;
}

export class CalculatorFactory {
  private static instance: CalculatorFactory | null = null;
  private store: any;
  private configManager: any;

  constructor(dependencies: CalculatorFactoryDependencies) {
    this.store = dependencies.store;
    this.configManager = dependencies.configManager;
  }

  /**
   * Crea il calculator appropriato in base alla modalità del progetto
   */
  createCalculator(): ICalculator {
    const project = this.store?.getState?.()?.currentProject;
    const isWorkingPackage = project?.workingPackageData?.enabled;

    if (isWorkingPackage) {
      console.log('🏭 CalculatorFactory: Creating WorkingPackageCalculator');
      return new WorkingPackageCalculator(this.store, this.configManager);
    } else {
      console.log('🏭 CalculatorFactory: Creating FeatureBasedCalculator');
      return new FeatureBasedCalculator(this.store, this.configManager);
    }
  }

  /**
   * Determina la modalità di calcolo corrente
   */
  getCalculationMode(): CalculationMode {
    const project = this.store?.getState?.()?.currentProject;
    return project?.workingPackageData?.enabled ? 'working-package' : 'feature-based';
  }

  /**
   * Verifica se è in modalità Working Package
   */
  isWorkingPackageMode(): boolean {
    return this.getCalculationMode() === 'working-package';
  }

  /**
   * Verifica se è in modalità Feature-based
   */
  isFeatureBasedMode(): boolean {
    return this.getCalculationMode() === 'feature-based';
  }

  /**
   * Singleton instance (opzionale)
   */
  static getInstance(dependencies?: CalculatorFactoryDependencies): CalculatorFactory {
    if (!CalculatorFactory.instance && dependencies) {
      CalculatorFactory.instance = new CalculatorFactory(dependencies);
    }
    if (!CalculatorFactory.instance) {
      throw new Error('CalculatorFactory not initialized');
    }
    return CalculatorFactory.instance;
  }

  /**
   * Reset singleton (per testing)
   */
  static resetInstance(): void {
    CalculatorFactory.instance = null;
  }
}
