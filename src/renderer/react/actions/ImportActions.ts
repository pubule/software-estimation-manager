import { getApp, getAppStore, getElectronAPI, getConfigManager } from '../utils/electronBridge';
import type {
  ParsedExcelData,
  VendorMapping,
  FeatureImportConfig,
  ImportWizardState,
  RawExcelEstimationRow,
  WorkingPackageImportConfig,
} from '../types/ImportTypes';

const PHASE_NAME_MAP: Record<string, string> = {
  'AF': 'functionalAnalysis',
  'AT': 'technicalAnalysis',
  'SIT': 'integrationTests',
  'UAT': 'uatTests',
  'CONSOLIDAMENTO': 'consolidation',
  'VA/PT': 'vapt',
  'Supporto post go live': 'postGoLive',
  'Supporto post go-live': 'postGoLive',
};

export class ImportActions {
  private getStore() {
    return getAppStore();
  }

  private getApp() {
    return getApp();
  }

  async openExcelFile(): Promise<{
    data: ParsedExcelData | null;
    fileName: string;
    filePath: string;
    warnings: string[];
  }> {
    const api = getElectronAPI();
    if (!api) {
      throw new Error('Electron API not available');
    }

    const result = await api.importExcelProject();

    if (!result.success) {
      if (result.canceled) {
        return { data: null, fileName: '', filePath: '', warnings: [] };
      }
      throw new Error(result.error || 'Failed to import Excel file');
    }

    return {
      data: result.data as ParsedExcelData,
      fileName: result.fileName || '',
      filePath: result.filePath || '',
      warnings: result.warnings || [],
    };
  }

  extractProjectCodeFromFilename(fileName: string): string {
    const nameWithoutExt = fileName.replace(/\.(xlsx|xls)$/i, '');
    // Try to extract a code like "CREDORIG-3331" from patterns like "CREDORIG-3331 v2"
    const codeMatch = nameWithoutExt.match(/^([A-Z][A-Z0-9_-]{2,19})/i);
    if (codeMatch) {
      return codeMatch[1].toUpperCase().substring(0, 20);
    }
    return 'IMPORTED';
  }

  buildVendorMappings(excelVendorNames: string[]): VendorMapping[] {
    const configManager = getConfigManager();
    const toolVendors = configManager?.getVendors() || [];

    return excelVendorNames.map(excelName => {
      const lowerExcel = excelName.toLowerCase();
      const matched = toolVendors.find(v =>
        v.name.toLowerCase().includes(lowerExcel) ||
        lowerExcel.includes(v.name.toLowerCase()) ||
        v.id.toLowerCase().includes(lowerExcel)
      );

      return {
        excelVendorName: excelName,
        toolSupplierId: matched?.id || '',
      };
    });
  }

  buildFeatureConfigs(features: ParsedExcelData['features']): FeatureImportConfig[] {
    return features.map(f => ({
      brId: f.brId,
      description: f.description,
      mds: f.mds,
      vendor: f.vendor,
      category: '',
      featureType: '',
      include: true,
    }));
  }

  mapExcelPhaseToToolPhaseId(phaseName: string): string | null {
    if (phaseName === 'DEV') return null;
    return PHASE_NAME_MAP[phaseName] || null;
  }

  buildWorkingPackageConfig(
    estimationExport: RawExcelEstimationRow[],
    vendorMappings: VendorMapping[]
  ): WorkingPackageImportConfig | null {
    if (estimationExport.length === 0) return null;

    const taVendorNames = ['TA IT', 'TA RO'];

    let primaryCost = 0;
    let secondaryCost = 0;
    let primaryExcelVendor = '';
    let secondaryExcelVendor = '';

    for (const row of estimationExport) {
      const isTA = taVendorNames.some(ta =>
        row.vendorName.toUpperCase() === ta.toUpperCase()
      );

      if (isTA) {
        secondaryCost += row.totalCost;
        if (!secondaryExcelVendor && row.totalCost > 0) {
          secondaryExcelVendor = row.vendorName;
        }
      } else {
        primaryCost += row.totalCost;
        if (!primaryExcelVendor && row.totalCost > 0) {
          primaryExcelVendor = row.vendorName;
        }
      }
    }

    const totalCost = primaryCost + secondaryCost;
    if (totalCost <= 0) return null;

    const secondaryPercentage = Math.round((secondaryCost / totalCost) * 100);

    const findToolVendorId = (excelName: string): string => {
      const mapping = vendorMappings.find(m => m.excelVendorName === excelName);
      return mapping?.toolSupplierId || '';
    };

    return {
      gtoTotalAmount: totalCost,
      primaryVendorId: findToolVendorId(primaryExcelVendor),
      secondaryVendorId: findToolVendorId(secondaryExcelVendor),
      secondaryPercentage,
    };
  }

  getAvailableCategories(): any[] {
    const configManager = getConfigManager() as any;
    if (!configManager) return [];
    return configManager.getCategories?.() || [];
  }

  getFeatureTypesForCategory(categoryId: string): any[] {
    const categories = this.getAvailableCategories();
    const category = categories.find((c: any) => c.id === categoryId);
    return category?.featureTypes || [];
  }

  getAvailableVendors(): any[] {
    const configManager = getConfigManager();
    if (!configManager) return [];
    return configManager.getVendors() || [];
  }

  buildProjectData(wizardState: ImportWizardState, projectManager: any): Record<string, unknown> {
    const { metadata, featureConfigs, vendorMappings, parsedData, calcMode, workingPackageConfig } = wizardState;

    const initialPhases = projectManager.createInitialPhases();

    if (parsedData?.phases) {
      for (const excelPhase of parsedData.phases) {
        const phaseId = this.mapExcelPhaseToToolPhaseId(excelPhase.phaseName);
        if (phaseId && initialPhases[phaseId]) {
          initialPhases[phaseId].manDays = excelPhase.g2MDs + excelPhase.taMDs;
        }
      }
    }

    const now = new Date().toISOString();
    const features = featureConfigs
      .filter(fc => fc.include)
      .map(fc => {
        const vendorMap = vendorMappings.find(vm => vm.excelVendorName === fc.vendor);
        return {
          id: `BR-${fc.brId}`,
          name: fc.description,
          description: '',
          category: fc.category,
          featureType: fc.featureType,
          supplier: vendorMap?.toolSupplierId || '',
          jobCluster: 'Fullstack Engineer',
          seniority: 'Medior',
          location: 'Italy',
          deliveryModel: 'offsite',
          realManDays: fc.mds,
          expertise: 100,
          riskMargin: 0,
          manDays: fc.mds,
          notes: '',
          created: now,
          modified: now,
        };
      });

    const workingPackageData: any = {
      enabled: calcMode === 'working-package',
      gto: {
        enabled: calcMode === 'working-package',
        totalAmount: workingPackageConfig?.gtoTotalAmount || 0,
        primaryVendorId: workingPackageConfig?.primaryVendorId || null,
        secondaryVendorId: workingPackageConfig?.secondaryVendorId || null,
        secondaryPercentage: workingPackageConfig?.secondaryPercentage || 35,
      },
      gds: {
        enabled: false,
        totalAmount: 0,
        primaryVendorId: null,
        secondaryVendorId: null,
        secondaryPercentage: 35,
      },
    };

    return {
      project: {
        id: metadata.code,
        code: metadata.code,
        name: metadata.name,
        description: metadata.description,
        version: '1.0.0',
        created: now,
        lastModified: now,
      },
      features,
      phases: initialPhases,
      config: { projectOverrides: {} },
      coverage: 0,
      coverageIsAutoCalculated: true,
      versions: [],
      workingPackageData,
    };
  }

  async executeImport(wizardState: ImportWizardState): Promise<void> {
    const app = this.getApp();
    const store = this.getStore();

    if (!app?.managers?.project) {
      throw new Error('Project manager not available');
    }
    if (!store) {
      throw new Error('Store not available');
    }

    const projectManager = app.managers.project as any;
    const previousState = store.getState().currentProject
      ? JSON.parse(JSON.stringify(store.getState().currentProject))
      : null;

    try {
      const projectData = this.buildProjectData(wizardState, projectManager);
      await projectManager.loadProjectData(projectData, `import-excel-${Date.now()}`);
      store.getState().markDirty();

      if ((window as any).calculationsActions) {
        await (window as any).calculationsActions.calculateProjectCosts();
      }
    } catch (error) {
      if (previousState) {
        store.getState().setProject(previousState);
      }
      throw error;
    }
  }
}

export const importActions = new ImportActions();
