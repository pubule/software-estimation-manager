import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { ImportActions } from '../../src/renderer/react/actions/ImportActions.ts';

let importActions: InstanceType<typeof ImportActions>;
let parsedData: any = null;
let featureConfigs: any[] = [];
let vendorMappings: any[] = [];
let wpConfig: any = null;
let builtProject: any = null;
let importError: string | null = null;

Given('the import configuration has categories', function () {
  const configManager = (global as any).window.app.managers.config;
  if (configManager && !configManager.getCategories) {
    configManager.getCategories = () => [
      { id: 'cat-general', name: 'General', featureTypes: [
        { id: 'ft-new', name: 'New Development' },
        { id: 'ft-change', name: 'Change Request' },
      ]},
    ];
  }
  importActions = new ImportActions();
});

Given('import data is loaded from fixture {string}', function (fixtureName: string) {
  parsedData = this.loadFixture(fixtureName);
  featureConfigs = [];
  vendorMappings = [];
  wpConfig = null;
  builtProject = null;
  importError = null;
});

Given('a project manager mock is configured', function () {
  const now = new Date().toISOString();
  (global as any).window.app.managers.project = {
    createInitialPhases: () => ({
      functionalAnalysis: { manDays: 0, effort: { G1: 100, G2: 0, TA: 20, PM: 50 }, assignedResources: [], cost: 0, lastModified: now },
      technicalAnalysis: { manDays: 0, effort: { G1: 0, G2: 100, TA: 60, PM: 20 }, assignedResources: [], cost: 0, lastModified: now },
      development: { manDays: 0, effort: { G1: 0, G2: 100, TA: 40, PM: 20 }, assignedResources: [], cost: 0, lastModified: now },
      integrationTests: { manDays: 0, effort: { G1: 100, G2: 50, TA: 50, PM: 75 }, assignedResources: [], cost: 0, lastModified: now },
      uatTests: { manDays: 0, effort: { G1: 50, G2: 50, TA: 40, PM: 75 }, assignedResources: [], cost: 0, lastModified: now },
      consolidation: { manDays: 0, effort: { G1: 30, G2: 30, TA: 30, PM: 20 }, assignedResources: [], cost: 0, lastModified: now },
      vapt: { manDays: 0, effort: { G1: 30, G2: 30, TA: 30, PM: 20 }, assignedResources: [], cost: 0, lastModified: now },
      postGoLive: { manDays: 0, effort: { G1: 0, G2: 100, TA: 50, PM: 100 }, assignedResources: [], cost: 0, lastModified: now },
      selectedSuppliers: { G1: null, G2: null, TA: null, PM: null },
    }),
    loadProjectData: async (data: any) => {
      const store = (global as any).window.appStore;
      if (store) store.getState().setProject(data);
    },
  };
});

Given('a project manager mock is configured to fail', function () {
  (global as any).window.app.managers.project = {
    createInitialPhases: () => ({
      functionalAnalysis: { manDays: 0, effort: {}, assignedResources: [], cost: 0 },
      development: { manDays: 0, effort: {}, assignedResources: [], cost: 0 },
      selectedSuppliers: { G1: null, G2: null, TA: null, PM: null },
    }),
    loadProjectData: async () => {
      throw new Error('Simulated load failure');
    },
  };
});

// --- Phase mapping ---
Then('phase {string} should map to {string}', function (phaseName: string, expected: string) {
  const result = importActions.mapExcelPhaseToToolPhaseId(phaseName);
  assert.strictEqual(result, expected);
});

Then('phase {string} should map to null', function (phaseName: string) {
  const result = importActions.mapExcelPhaseToToolPhaseId(phaseName);
  assert.strictEqual(result, null);
});

// --- Project code extraction ---
Then('extracting code from {string} should return {string}', function (fileName: string, expected: string) {
  const result = importActions.extractProjectCodeFromFilename(fileName);
  assert.strictEqual(result, expected);
});

// --- Vendor mapping ---
When('I build vendor mappings for vendors {string}', function (vendorList: string) {
  const vendors = vendorList.split(',');
  vendorMappings = importActions.buildVendorMappings(vendors);
});

Then('vendor {string} should be mapped to {string}', function (excelVendor: string, expectedId: string) {
  const mapping = vendorMappings.find((vm: any) => vm.excelVendorName === excelVendor);
  assert.ok(mapping, `Vendor mapping not found for "${excelVendor}"`);
  assert.strictEqual(mapping.toolSupplierId, expectedId);
});

// --- Feature configs ---
When('I build feature configs', function () {
  featureConfigs = importActions.buildFeatureConfigs(parsedData.features);
});

Then('there should be {int} feature configs', function (expected: number) {
  assert.strictEqual(featureConfigs.length, expected);
});

Then('all feature configs should have include true', function () {
  assert.ok(featureConfigs.every((fc: any) => fc.include === true));
});

Then('all feature configs should have empty category', function () {
  assert.ok(featureConfigs.every((fc: any) => fc.category === ''));
});

// --- Working Package ---
When('I build working package config', function () {
  wpConfig = importActions.buildWorkingPackageConfig(parsedData.estimationExport, vendorMappings);
});

Then('the working package GTO total should be {int}', function (expected: number) {
  assert.ok(wpConfig, 'Working package config should not be null');
  assert.strictEqual(wpConfig.gtoTotalAmount, expected);
});

Then('the working package secondary percentage should be {int}', function (expected: number) {
  assert.ok(wpConfig, 'Working package config should not be null');
  assert.strictEqual(wpConfig.secondaryPercentage, expected);
});

// --- Build project data ---
When('I exclude feature {string} from import', function (brId: string) {
  if (featureConfigs.length === 0) {
    featureConfigs = importActions.buildFeatureConfigs(parsedData.features);
  }
  featureConfigs = featureConfigs.map((fc: any) =>
    fc.brId === brId ? { ...fc, include: false } : fc
  );
});

When('I build project data with code {string} name {string} and mode {string}', function (code: string, name: string, mode: string) {
  if (featureConfigs.length === 0) {
    featureConfigs = importActions.buildFeatureConfigs(parsedData.features);
  }
  featureConfigs = featureConfigs.map((fc: any) => ({
    ...fc,
    category: fc.category || 'cat-general',
    featureType: fc.featureType || 'ft-new',
  }));

  if (vendorMappings.length === 0) {
    vendorMappings = importActions.buildVendorMappings(parsedData.vendorNames);
  }

  const projectManager = (global as any).window.app.managers.project;
  builtProject = importActions.buildProjectData({
    step: 'confirm',
    parsedData,
    fileName: `${code}.xlsx`,
    filePath: `/tmp/${code}.xlsx`,
    vendorMappings,
    featureConfigs,
    metadata: { code, name, description: '' },
    calcMode: mode as any,
    workingPackageConfig: wpConfig,
    errors: [],
    warnings: [],
  }, projectManager);
});

Then('the built project should have code {string}', function (expected: string) {
  assert.strictEqual((builtProject.project as any).code, expected);
});

Then('the built project should have {int} features', function (expected: number) {
  assert.strictEqual((builtProject.features as any[]).length, expected);
});

Then('the built project phase {string} should have manDays {int}', function (phaseId: string, expected: number) {
  assert.strictEqual((builtProject.phases as any)[phaseId].manDays, expected);
});

// --- Atomic rollback ---
When('I attempt to execute import with code {string}', async function (code: string) {
  if (featureConfigs.length === 0) {
    featureConfigs = importActions.buildFeatureConfigs(parsedData.features);
  }
  featureConfigs = featureConfigs.map((fc: any) => ({
    ...fc,
    category: fc.category || 'cat-general',
    featureType: fc.featureType || 'ft-new',
  }));

  if (vendorMappings.length === 0) {
    vendorMappings = importActions.buildVendorMappings(parsedData.vendorNames);
  }

  importError = null;
  try {
    await importActions.executeImport({
      step: 'confirm',
      parsedData,
      fileName: `${code}.xlsx`,
      filePath: `/tmp/${code}.xlsx`,
      vendorMappings,
      featureConfigs,
      metadata: { code, name: 'Fail Test', description: '' },
      calcMode: 'feature-based',
      workingPackageConfig: null,
      errors: [],
      warnings: [],
    });
  } catch (err: any) {
    importError = err.message;
  }
});

Then('the import should fail', function () {
  assert.ok(importError, 'Expected import to fail but it succeeded');
});

Then('the store should contain the original project', function () {
  const currentProject = this.getState().currentProject;
  assert.ok(currentProject, 'Store should still have a project');
  assert.strictEqual(currentProject.project.id, 'test-project-001');
});
