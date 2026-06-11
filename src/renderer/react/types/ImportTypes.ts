export interface RawExcelFeature {
  brId: string;
  description: string;
  mds: number;
  vendor: string;
  comment: string;
  rowIndex: number;
}

export interface RawExcelPhase {
  phaseName: string;
  elapsed: number;
  g2MDs: number;
  taMDs: number;
}

export interface RawExcelEstimationRow {
  vendorName: string;
  lta: string;
  role: string;
  totalMDs: number;
  totalCost: number;
  rate: number;
}

export interface ParsedExcelData {
  features: RawExcelFeature[];
  phases: RawExcelPhase[];
  estimationExport: RawExcelEstimationRow[];
  estimationTotalAmount?: number;
  vendorNames: string[];
}

export interface VendorMapping {
  excelVendorName: string;
  toolSupplierId: string;
}

export interface FeatureImportConfig {
  brId: string;
  description: string;
  mds: number;
  vendor: string;
  category: string;
  featureType: string;
  include: boolean;
}

export interface ImportProjectMetadata {
  code: string;
  name: string;
  description: string;
}

export type ImportWizardStep =
  | 'file-select'
  | 'preview'
  | 'vendor-mapping'
  | 'feature-config'
  | 'calc-mode'
  | 'metadata'
  | 'confirm';

export type CalcMode = 'feature-based' | 'working-package';

export interface WorkingPackageImportConfig {
  gtoTotalAmount: number;
  primaryVendorId: string;
  secondaryVendorId: string;
  secondaryPercentage: number;
}

export interface ExistingProjectInfo {
  exists: boolean;
  source: 'loaded' | 'disk' | null;
  created?: string;
  version?: string;
}

export interface ImportWizardState {
  step: ImportWizardStep;
  parsedData: ParsedExcelData | null;
  fileName: string;
  filePath: string;
  vendorMappings: VendorMapping[];
  featureConfigs: FeatureImportConfig[];
  metadata: ImportProjectMetadata;
  calcMode: CalcMode;
  workingPackageConfig: WorkingPackageImportConfig | null;
  existingProject?: ExistingProjectInfo;
  errors: string[];
  warnings: string[];
}
