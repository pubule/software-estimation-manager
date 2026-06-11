import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Button from './Button';
import { importActions } from '../actions/ImportActions';
import type {
  ImportWizardStep,
  ImportWizardState,
  FeatureImportConfig,
} from '../types/ImportTypes';

interface ImportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const STEPS: ImportWizardStep[] = [
  'file-select', 'preview', 'vendor-mapping', 'feature-config', 'calc-mode', 'metadata', 'confirm',
];

const STEP_LABELS: Record<ImportWizardStep, string> = {
  'file-select': 'Select File',
  'preview': 'Preview',
  'vendor-mapping': 'Vendor Mapping',
  'feature-config': 'Features',
  'calc-mode': 'Calculation Mode',
  'metadata': 'Project Info',
  'confirm': 'Confirm',
};

const initialWizardState: ImportWizardState = {
  step: 'file-select',
  parsedData: null,
  fileName: '',
  filePath: '',
  vendorMappings: [],
  featureConfigs: [],
  metadata: { code: '', name: '', description: '' },
  calcMode: 'feature-based',
  workingPackageConfig: null,
  errors: [],
  warnings: [],
};

const ImportProjectModal: React.FC<ImportProjectModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [wizard, setWizard] = useState<ImportWizardState>({ ...initialWizardState });
  const [isLoading, setIsLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setWizard({ ...initialWizardState });
      setImportError('');
      setCategories(importActions.getAvailableCategories());
      setVendors(importActions.getAvailableVendors());
    }
  }, [isOpen]);

  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (wizard.step !== 'metadata') return;
    const code = wizard.metadata.code;
    if (code.length < 3 || !/^[A-Z0-9_-]+$/.test(code)) {
      setWizard(prev => {
        if (!prev.existingProject) return prev;
        const { existingProject: _, ...rest } = prev;
        return rest as ImportWizardState;
      });
      return;
    }

    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(async () => {
      const result = await importActions.checkExistingProject(code);
      setWizard(prev => ({ ...prev, existingProject: result }));
    }, 300);

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [wizard.step, wizard.metadata.code]);

  const currentStepIndex = STEPS.indexOf(wizard.step);

  const handleSelectFile = useCallback(async () => {
    setIsLoading(true);
    setImportError('');
    try {
      const result = await importActions.openExcelFile();
      if (!result.data) return; // canceled

      const code = importActions.extractProjectCodeFromFilename(result.fileName);
      const vendorMappings = importActions.buildVendorMappings(result.data.vendorNames);
      const featureConfigs = importActions.buildFeatureConfigs(result.data.features);
      const wpConfig = importActions.buildWorkingPackageConfig(result.data.estimationExport, vendorMappings, result.data.estimationTotalAmount, result.data.estimationSecondaryPct);

      setWizard(prev => ({
        ...prev,
        parsedData: result.data,
        fileName: result.fileName,
        filePath: result.filePath,
        vendorMappings,
        featureConfigs,
        metadata: { code, name: '', description: '' },
        warnings: result.warnings,
        workingPackageConfig: wpConfig,
      }));
    } catch (err: any) {
      setImportError(err.message || 'Failed to read Excel file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const canProceed = useMemo((): boolean => {
    switch (wizard.step) {
      case 'file-select':
        return wizard.parsedData !== null;
      case 'preview':
        return true;
      case 'vendor-mapping':
        return wizard.vendorMappings.every(vm => vm.toolSupplierId !== '');
      case 'feature-config': {
        const included = wizard.featureConfigs.filter(fc => fc.include);
        return included.length > 0 && included.every(fc => fc.category && fc.featureType);
      }
      case 'calc-mode':
        if (wizard.calcMode === 'working-package') {
          return !!(wizard.workingPackageConfig?.primaryVendorId);
        }
        return true;
      case 'metadata':
        return wizard.metadata.code.length >= 3 &&
          /^[A-Z0-9_-]+$/.test(wizard.metadata.code) &&
          wizard.metadata.name.length >= 3;
      case 'confirm':
        return true;
      default:
        return false;
    }
  }, [wizard]);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setWizard(prev => ({ ...prev, step: STEPS[nextIndex] }));
    }
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setWizard(prev => ({ ...prev, step: STEPS[prevIndex] }));
    }
  }, [currentStepIndex]);

  const handleImport = useCallback(async () => {
    setIsLoading(true);
    setImportError('');
    try {
      await importActions.executeImport(wizard);
      onImportComplete();
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setIsLoading(false);
    }
  }, [wizard, onImportComplete]);

  const updateVendorMapping = useCallback((excelVendor: string, toolSupplierId: string) => {
    setWizard(prev => ({
      ...prev,
      vendorMappings: prev.vendorMappings.map(vm =>
        vm.excelVendorName === excelVendor ? { ...vm, toolSupplierId } : vm
      ),
    }));
  }, []);

  const updateFeatureConfig = useCallback((brId: string, field: keyof FeatureImportConfig, value: any) => {
    setWizard(prev => ({
      ...prev,
      featureConfigs: prev.featureConfigs.map(fc => {
        if (fc.brId !== brId) return fc;
        const updated = { ...fc, [field]: value };
        if (field === 'category') {
          updated.featureType = '';
        }
        return updated;
      }),
    }));
  }, []);

  const bulkSetCategory = useCallback((categoryId: string) => {
    setWizard(prev => ({
      ...prev,
      featureConfigs: prev.featureConfigs.map(fc =>
        fc.include ? { ...fc, category: categoryId, featureType: '' } : fc
      ),
    }));
  }, []);

  const bulkSetFeatureType = useCallback((featureTypeId: string) => {
    setWizard(prev => ({
      ...prev,
      featureConfigs: prev.featureConfigs.map(fc =>
        fc.include ? { ...fc, featureType: featureTypeId } : fc
      ),
    }));
  }, []);

  if (!isOpen) return null;

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', alignItems: 'center' }}>
      {STEPS.map((step, idx) => (
        <React.Fragment key={step}>
          <div style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: idx === currentStepIndex ? 600 : 400,
            background: idx < currentStepIndex ? 'var(--success)' :
              idx === currentStepIndex ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: idx <= currentStepIndex ? '#fff' : 'var(--text-secondary)',
          }}>
            {idx + 1}. {STEP_LABELS[step]}
          </div>
          {idx < STEPS.length - 1 && (
            <i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'var(--text-muted)' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderFileSelect = () => (
    <div>
      <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
        Select an Excel estimation workbook to import as a new project.
      </p>
      <div style={{ textAlign: 'center', padding: '32px', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
        {wizard.parsedData ? (
          <div>
            <i className="fas fa-file-excel" style={{ fontSize: '32px', color: 'var(--success)', marginBottom: '8px' }} />
            <p style={{ fontWeight: 600 }}>{wizard.fileName}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {wizard.parsedData.features.length} features, {wizard.parsedData.phases.length} phases found
            </p>
            <Button variant="secondary" size="small" onClick={handleSelectFile} style={{ marginTop: '8px' }}>
              Choose Different File
            </Button>
          </div>
        ) : (
          <div>
            <i className="fas fa-upload" style={{ fontSize: '32px', color: 'var(--text-muted)', marginBottom: '8px' }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>No file selected</p>
            <Button variant="primary" onClick={handleSelectFile} loading={isLoading}>
              <i className="fas fa-file-excel" style={{ marginRight: '6px' }} />Choose Excel File
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!wizard.parsedData) return null;
    const { features, phases, estimationExport } = wizard.parsedData;
    return (
      <div>
        {wizard.warnings.length > 0 && (
          <div style={{ background: 'var(--warning-bg)', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
            {wizard.warnings.map((w, i) => <div key={i}><i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }} />{w}</div>)}
          </div>
        )}
        <h4 style={{ marginBottom: '8px' }}>Features ({features.length})</h4>
        <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '16px' }}>
          <table className="pm-table" style={{ fontSize: '13px' }}>
            <thead><tr><th>BR</th><th>Description</th><th>MDs</th><th>Vendor</th></tr></thead>
            <tbody>
              {features.map(f => (
                <tr key={f.brId}><td>{f.brId}</td><td>{f.description}</td><td>{f.mds}</td><td>{f.vendor}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 style={{ marginBottom: '8px' }}>Phases ({phases.length})</h4>
        <div style={{ maxHeight: '150px', overflow: 'auto', marginBottom: '16px' }}>
          <table className="pm-table" style={{ fontSize: '13px' }}>
            <thead><tr><th>Phase</th><th>G2 MDs</th><th>TA MDs</th><th>Total</th></tr></thead>
            <tbody>
              {phases.map(p => (
                <tr key={p.phaseName} style={p.phaseName === 'DEV' ? { opacity: 0.4, textDecoration: 'line-through' } : {}}>
                  <td>{p.phaseName}{p.phaseName === 'DEV' ? ' (auto-calculated)' : ''}</td>
                  <td>{p.g2MDs}</td><td>{p.taMDs}</td><td>{p.elapsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {estimationExport.length > 0 && (
          <>
            <h4 style={{ marginBottom: '8px' }}>Estimation Export ({estimationExport.length} vendors)</h4>
            <div style={{ maxHeight: '120px', overflow: 'auto' }}>
              <table className="pm-table" style={{ fontSize: '13px' }}>
                <thead><tr><th>Vendor</th><th>Role</th><th>MDs</th><th>Cost</th></tr></thead>
                <tbody>
                  {estimationExport.map((r, i) => (
                    <tr key={i}><td>{r.vendorName}</td><td>{r.role}</td><td>{r.totalMDs.toFixed(1)}</td><td>{'€'}{r.totalCost.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderVendorMapping = () => (
    <div>
      <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
        Map each Excel vendor to a tool supplier. All vendors must be mapped to proceed.
      </p>
      <table className="pm-table" style={{ fontSize: '13px' }}>
        <thead><tr><th>Excel Vendor</th><th>Tool Supplier</th></tr></thead>
        <tbody>
          {wizard.vendorMappings.map(vm => (
            <tr key={vm.excelVendorName}>
              <td style={{ fontWeight: 500 }}>{vm.excelVendorName}</td>
              <td>
                <select
                  value={vm.toolSupplierId}
                  onChange={e => updateVendorMapping(vm.excelVendorName, e.target.value)}
                  style={{ width: '100%', padding: '4px 8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                >
                  <option value="">-- Select Supplier --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFeatureConfig = () => {
    const allIncluded = wizard.featureConfigs.filter(fc => fc.include);
    const commonCategory = allIncluded.length > 0 && allIncluded.every(fc => fc.category === allIncluded[0].category)
      ? allIncluded[0].category : '';
    const commonFeatureTypes = commonCategory ? importActions.getFeatureTypesForCategory(commonCategory) : [];

    return (
      <div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Set all:</span>
          <select
            value=""
            onChange={e => e.target.value && bulkSetCategory(e.target.value)}
            style={{ padding: '4px 8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}
          >
            <option value="">Category...</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {commonCategory && commonFeatureTypes.length > 0 && (
            <select
              value=""
              onChange={e => e.target.value && bulkSetFeatureType(e.target.value)}
              style={{ padding: '4px 8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}
            >
              <option value="">Feature Type...</option>
              {commonFeatureTypes.map((ft: any) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ maxHeight: '350px', overflow: 'auto' }}>
          <table className="pm-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Include</th>
                <th style={{ width: '50px' }}>BR</th>
                <th>Description</th>
                <th style={{ width: '50px' }}>MDs</th>
                <th style={{ width: '160px' }}>Category</th>
                <th style={{ width: '160px' }}>Feature Type</th>
              </tr>
            </thead>
            <tbody>
              {wizard.featureConfigs.map(fc => {
                const featureTypes = fc.category ? importActions.getFeatureTypesForCategory(fc.category) : [];
                return (
                  <tr key={fc.brId} style={!fc.include ? { opacity: 0.4 } : {}}>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={fc.include}
                        onChange={e => updateFeatureConfig(fc.brId, 'include', e.target.checked)} />
                    </td>
                    <td>{fc.brId}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={fc.description}>{fc.description}</td>
                    <td>{fc.mds}</td>
                    <td>
                      <select value={fc.category} disabled={!fc.include}
                        onChange={e => updateFeatureConfig(fc.brId, 'category', e.target.value)}
                        style={{ width: '100%', padding: '2px 4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px', fontSize: '12px' }}
                      >
                        <option value="">--</option>
                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={fc.featureType} disabled={!fc.include || !fc.category}
                        onChange={e => updateFeatureConfig(fc.brId, 'featureType', e.target.value)}
                        style={{ width: '100%', padding: '2px 4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px', fontSize: '12px' }}
                      >
                        <option value="">--</option>
                        {featureTypes.map((ft: any) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCalcMode = () => (
    <div>
      <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
        Choose how project costs should be calculated.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{
          display: 'flex', gap: '12px', padding: '12px', borderRadius: '8px', cursor: 'pointer',
          border: wizard.calcMode === 'feature-based' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
          background: wizard.calcMode === 'feature-based' ? 'var(--bg-secondary)' : 'transparent',
        }}>
          <input type="radio" name="calcMode" value="feature-based"
            checked={wizard.calcMode === 'feature-based'}
            onChange={() => setWizard(prev => ({ ...prev, calcMode: 'feature-based' }))} />
          <div>
            <div style={{ fontWeight: 600 }}>Feature-Based</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Costs calculated from individual features + phases. Standard mode.
            </div>
          </div>
        </label>
        <label style={{
          display: 'flex', gap: '12px', padding: '12px', borderRadius: '8px', cursor: 'pointer',
          border: wizard.calcMode === 'working-package' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
          background: wizard.calcMode === 'working-package' ? 'var(--bg-secondary)' : 'transparent',
          opacity: wizard.parsedData?.estimationExport?.length ? 1 : 0.5,
          pointerEvents: wizard.parsedData?.estimationExport?.length ? 'auto' : 'none',
        }}>
          <input type="radio" name="calcMode" value="working-package"
            checked={wizard.calcMode === 'working-package'}
            disabled={!wizard.parsedData?.estimationExport?.length}
            onChange={() => setWizard(prev => ({ ...prev, calcMode: 'working-package' }))} />
          <div>
            <div style={{ fontWeight: 600 }}>Working Package</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Fixed budget buckets (GTO). Data from "Estimation export" sheet.
              {!wizard.parsedData?.estimationExport?.length && ' (No estimation export data found)'}
            </div>
          </div>
        </label>
      </div>

      {wizard.calcMode === 'working-package' && wizard.workingPackageConfig && (
        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <h4 style={{ marginBottom: '8px' }}>GTO Configuration</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Amount</label>
              <div style={{ fontWeight: 600 }}>{'€'}{wizard.workingPackageConfig.gtoTotalAmount.toLocaleString()}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Secondary %</label>
              <div style={{ fontWeight: 600 }}>{wizard.workingPackageConfig.secondaryPercentage}%</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Primary Vendor</label>
              <select
                value={wizard.workingPackageConfig.primaryVendorId}
                onChange={e => setWizard(prev => ({
                  ...prev,
                  workingPackageConfig: prev.workingPackageConfig ? { ...prev.workingPackageConfig, primaryVendorId: e.target.value } : prev.workingPackageConfig,
                }))}
                style={{ width: '100%', padding: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
              >
                <option value="">-- Select --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Secondary Vendor</label>
              <select
                value={wizard.workingPackageConfig.secondaryVendorId}
                onChange={e => setWizard(prev => ({
                  ...prev,
                  workingPackageConfig: prev.workingPackageConfig ? { ...prev.workingPackageConfig, secondaryVendorId: e.target.value } : prev.workingPackageConfig,
                }))}
                style={{ width: '100%', padding: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
              >
                <option value="">-- None --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMetadata = () => (
    <div>
      {wizard.existingProject?.exists && (
        <div style={{ background: 'var(--warning-bg, #2d2a1b)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: 'var(--warning, #ffc107)', border: '1px solid var(--warning, #ffc107)' }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }} />
          Il progetto <strong>{wizard.metadata.code}</strong> esiste già.
          L'importazione sostituirà tutti i dati esistenti (feature, fasi, costi).
        </div>
      )}
      <div className="form-group">
        <label htmlFor="import-project-code">Project Code:</label>
        <input
          id="import-project-code"
          type="text"
          value={wizard.metadata.code}
          onChange={e => setWizard(prev => ({
            ...prev,
            metadata: { ...prev.metadata, code: e.target.value.toUpperCase() },
          }))}
          placeholder="e.g., CREDORIG-3331"
          maxLength={20}
          className={wizard.metadata.code.length > 0 && (wizard.metadata.code.length < 3 || !/^[A-Z0-9_-]+$/.test(wizard.metadata.code)) ? 'validation-error' : ''}
        />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Uppercase letters, numbers, hyphens, underscores. 3-20 characters.
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="import-project-name">Project Name:</label>
        <input
          id="import-project-name"
          type="text"
          value={wizard.metadata.name}
          onChange={e => setWizard(prev => ({
            ...prev,
            metadata: { ...prev.metadata, name: e.target.value },
          }))}
          placeholder="Enter project name"
          maxLength={100}
          className={wizard.metadata.name.length > 0 && wizard.metadata.name.length < 3 ? 'validation-error' : ''}
        />
      </div>
      <div className="form-group">
        <label htmlFor="import-project-desc">Description (Optional):</label>
        <textarea
          id="import-project-desc"
          value={wizard.metadata.description}
          onChange={e => setWizard(prev => ({
            ...prev,
            metadata: { ...prev.metadata, description: e.target.value },
          }))}
          placeholder="Brief description of the project..."
          rows={3}
          maxLength={500}
        />
      </div>
    </div>
  );

  const renderConfirm = () => {
    const includedFeatures = wizard.featureConfigs.filter(fc => fc.include);
    const totalMDs = includedFeatures.reduce((sum, fc) => sum + fc.mds, 0);
    const importedPhases = (wizard.parsedData?.phases || []).filter(p => p.phaseName !== 'DEV' && importActions.mapExcelPhaseToToolPhaseId(p.phaseName));

    return (
      <div>
        <h4 style={{ marginBottom: '12px' }}>
          {wizard.existingProject?.exists ? 'Aggiornamento progetto esistente' : 'Import Summary'}
        </h4>
        {wizard.existingProject?.exists && (
          <div style={{ background: 'var(--warning-bg, #2d2a1b)', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', color: 'var(--warning, #ffc107)' }}>
            <i className="fas fa-sync-alt" style={{ marginRight: '6px' }} />
            I dati del progetto esistente verranno completamente sostituiti.
          </div>
        )}
        <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <strong>Project:</strong> {wizard.metadata.code} — {wizard.metadata.name}
          </div>
          <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <strong>Mode:</strong> {wizard.calcMode === 'feature-based' ? 'Feature-Based' : 'Working Package'}
          </div>
          <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <strong>Features:</strong> {includedFeatures.length} features, {totalMDs} total MDs
          </div>
          <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <strong>Phases:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              {importedPhases.map(p => (
                <li key={p.phaseName}>{p.phaseName}: {p.elapsed} MDs</li>
              ))}
              <li style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Development: auto-calculated from features</li>
            </ul>
          </div>
          {wizard.calcMode === 'working-package' && wizard.workingPackageConfig && (
            <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <strong>GTO:</strong> {'€'}{wizard.workingPackageConfig.gtoTotalAmount.toLocaleString()}
              {' '}(Secondary: {wizard.workingPackageConfig.secondaryPercentage}%)
            </div>
          )}
          <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <strong>Vendor Mappings:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              {wizard.vendorMappings.map(vm => {
                const vendor = vendors.find(v => v.id === vm.toolSupplierId);
                return <li key={vm.excelVendorName}>{vm.excelVendorName} → {vendor?.name || vm.toolSupplierId}</li>;
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (wizard.step) {
      case 'file-select': return renderFileSelect();
      case 'preview': return renderPreview();
      case 'vendor-mapping': return renderVendorMapping();
      case 'feature-config': return renderFeatureConfig();
      case 'calc-mode': return renderCalcMode();
      case 'metadata': return renderMetadata();
      case 'confirm': return renderConfirm();
    }
  };

  return (
    <div id="import-project-modal" className="modal active">
      <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3>Import Project from Excel</h3>
          <button className="modal-close" onClick={onClose} disabled={isLoading}>&times;</button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'auto' }}>
          {renderStepIndicator()}

          {importError && (
            <div style={{ background: 'var(--danger-bg, #2d1b1b)', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', color: 'var(--danger, #ff6b6b)', fontSize: '13px' }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }} />{importError}
            </div>
          )}

          {renderCurrentStep()}
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStepIndex > 0 && (
              <Button variant="secondary" onClick={goBack} disabled={isLoading}>
                <i className="fas fa-arrow-left" style={{ marginRight: '4px' }} />Back
              </Button>
            )}
            {wizard.step === 'confirm' ? (
              <Button variant="primary" onClick={handleImport} loading={isLoading} disabled={!canProceed}>
                <i className={`fas fa-${wizard.existingProject?.exists ? 'sync-alt' : 'file-import'}`} style={{ marginRight: '4px' }} />
                {wizard.existingProject?.exists ? 'Update Project' : 'Import Project'}
              </Button>
            ) : (
              <Button variant="primary" onClick={goNext} disabled={!canProceed || isLoading}>
                Next<i className="fas fa-arrow-right" style={{ marginLeft: '4px' }} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportProjectModal;
