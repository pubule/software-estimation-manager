const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

/**
 * Project Phases Management Step Definitions
 * Covers 8-phase project planning, resource allocation, and cost calculations
 */

// Background Steps
Given('the Project Phases Manager is initialized', async function() {
  this.log('Verifying Project Phases Manager initialization');
  
  const result = await this.executeScript(`
    return {
      hasProjectPhasesManager: !!window.projectPhasesManager,
      isInitialized: window.projectPhasesManager?.isInitialized || false,
      phaseDefinitions: window.projectPhasesManager?.phaseDefinitions || null,
      methods: {
        calculatePhases: typeof window.projectPhasesManager?.calculatePhases === 'function',
        updatePhaseDistribution: typeof window.projectPhasesManager?.updatePhaseDistribution === 'function',
        getPhaseEffort: typeof window.projectPhasesManager?.getPhaseEffort === 'function'
      }
    };
  `);
  
  assert(result.hasProjectPhasesManager, 'Project Phases Manager should be initialized');
  assert(result.isInitialized, 'Project Phases Manager should be marked as initialized');
  
  Object.entries(result.methods).forEach(([method, exists]) => {
    assert(exists, `Project Phases Manager should have ${method} method`);
  });
  
  this.log('✅ Project Phases Manager is initialized');
});

Given('the configuration manager provides resource and supplier data', async function() {
  this.log('Verifying configuration manager provides resource data');
  
  const result = await this.executeScript(`
    const config = window.configurationManager?.getCurrentConfig();
    return {
      hasConfig: !!config,
      hasInternalResources: !!(config?.globalConfig?.internalResources),
      hasSuppliers: !!(config?.globalConfig?.suppliers),
      resourceCount: (config?.globalConfig?.internalResources || []).length,
      supplierCount: (config?.globalConfig?.suppliers || []).length,
      resourceStructure: config?.globalConfig?.internalResources?.map(r => ({
        name: r.name,
        roles: Object.keys(r.roles || {})
      })) || []
    };
  `);
  
  assert(result.hasConfig, 'Configuration should exist');
  assert(result.hasInternalResources, 'Configuration should have internal resources');
  assert(result.hasSuppliers, 'Configuration should have suppliers');
  assert(result.resourceCount > 0, 'Should have at least one internal resource defined');
  
  this.testContext.resourceData = {
    resourceCount: result.resourceCount,
    supplierCount: result.supplierCount,
    resourceStructure: result.resourceStructure
  };
  
  this.log(`✅ Configuration provides ${result.resourceCount} resources and ${result.supplierCount} suppliers`);
});

Given('a project with features is loaded', async function() {
  this.log('Ensuring project with features is loaded');
  
  // Create project if none exists
  await this.executeScript('window.app.newProject()');
  
  // Add sample features for phase calculation
  await this.executeScript(`
    const sampleFeatures = [
      {
        id: 'FEAT-001',
        description: 'Sample Feature 1',
        category: 'Backend',
        supplier: 'Internal',
        realManDays: 10,
        expertiseLevel: 80,
        riskMargin: 20,
        manDays: 15
      },
      {
        id: 'FEAT-002', 
        description: 'Sample Feature 2',
        category: 'Frontend',
        supplier: 'Internal',
        realManDays: 8,
        expertiseLevel: 90,
        riskMargin: 10,
        manDays: 9.78
      }
    ];
    
    if (window.app.currentProject) {
      window.app.currentProject.features = sampleFeatures;
      
      // Trigger phase calculations if needed
      if (window.projectPhasesManager && window.projectPhasesManager.calculatePhases) {
        window.projectPhasesManager.calculatePhases();
      }
    }
  `);
  
  const result = await this.executeScript(`
    return {
      hasProject: !!window.app.currentProject,
      featureCount: (window.app.currentProject?.features || []).length,
      totalManDays: (window.app.currentProject?.features || []).reduce((sum, f) => sum + (f.manDays || 0), 0)
    };
  `);
  
  assert(result.hasProject, 'Project should be loaded');
  assert(result.featureCount > 0, 'Project should have features for phase calculation');
  
  this.testContext.currentProject = {
    hasFeatures: true,
    featureCount: result.featureCount,
    totalManDays: result.totalManDays
  };
  
  this.log(`✅ Project loaded with ${result.featureCount} features (${result.totalManDays} total man days)`);
});

// Phase Structure Verification
Given('the phase definitions are being loaded', async function() {
  this.log('Preparing to load phase definitions');
  this.testContext.phaseLoadState = { loading: true };
});

When('the project phases are initialized', async function() {
  this.log('Initializing project phases');
  
  const result = await this.executeScript(`
    // Ensure phases are initialized
    if (window.projectPhasesManager && window.projectPhasesManager.initializePhases) {
      window.projectPhasesManager.initializePhases();
    }
    
    return {
      phases: window.app.currentProject?.phases || {},
      phaseKeys: Object.keys(window.app.currentProject?.phases || {}),
      phaseDefinitions: window.projectPhasesManager?.phaseDefinitions || {}
    };
  `);
  
  this.testContext.projectPhases = {
    phases: result.phases,
    phaseKeys: result.phaseKeys,
    definitions: result.phaseDefinitions
  };
  
  this.log(`✅ Project phases initialized: ${result.phaseKeys.join(', ')}`);
});

Then('exactly 8 project phases should be defined', async function() {
  const phaseCount = this.testContext.projectPhases?.phaseKeys.length || 0;
  
  assert.strictEqual(phaseCount, 8, `Should have exactly 8 phases, got ${phaseCount}`);
  
  this.log('✅ Exactly 8 project phases are defined');
});

Then('the phases should be in order: functionalSpec, techSpec, development, sit, uat, vapt, consolidation, postGoLive', async function() {
  const expectedOrder = ['functionalSpec', 'techSpec', 'development', 'sit', 'uat', 'vapt', 'consolidation', 'postGoLive'];
  const actualKeys = this.testContext.projectPhases?.phaseKeys || [];
  
  expectedOrder.forEach((expectedPhase, index) => {
    assert.strictEqual(actualKeys[index], expectedPhase, 
      `Phase at position ${index} should be '${expectedPhase}', got '${actualKeys[index]}'`);
  });
  
  this.log('✅ Phases are in correct order');
});

Then('each phase should have a name, description, type, and calculated flag', async function() {
  const phases = this.testContext.projectPhases?.phases || {};
  const definitions = this.testContext.projectPhases?.definitions || {};
  
  Object.entries(phases).forEach(([phaseKey, phaseData]) => {
    const definition = definitions[phaseKey] || {};
    
    assert(definition.name || phaseData.name, `Phase '${phaseKey}' should have a name`);
    assert(definition.description || phaseData.description, `Phase '${phaseKey}' should have a description`);
    assert(definition.type || phaseData.type, `Phase '${phaseKey}' should have a type`);
    assert(definition.hasOwnProperty('calculated') || phaseData.hasOwnProperty('calculated'), 
      `Phase '${phaseKey}' should have calculated flag`);
  });
  
  this.log('✅ All phases have required properties: name, description, type, calculated flag');
});

Then('each phase should have default effort distribution across 4 roles', async function() {
  const phases = this.testContext.projectPhases?.phases || {};
  const definitions = this.testContext.projectPhases?.definitions || {};
  
  const expectedRoles = ['G1', 'G2', 'TA', 'PM'];
  
  Object.entries(phases).forEach(([phaseKey, phaseData]) => {
    const definition = definitions[phaseKey] || {};
    const distribution = definition.distribution || phaseData.distribution || {};
    
    expectedRoles.forEach(role => {
      assert(distribution.hasOwnProperty(role), 
        `Phase '${phaseKey}' should have effort distribution for role '${role}'`);
      assert(typeof distribution[role] === 'number',
        `Phase '${phaseKey}' distribution for '${role}' should be a number, got ${typeof distribution[role]}`);
    });
    
    // Verify distribution adds up to 100% (allowing for small floating point differences)
    const total = expectedRoles.reduce((sum, role) => sum + (distribution[role] || 0), 0);
    assert(Math.abs(total - 100) < 0.01, 
      `Phase '${phaseKey}' distribution should add up to 100%, got ${total}%`);
  });
  
  this.log('✅ All phases have effort distribution across 4 roles (G1, G2, TA, PM)');
});

// Individual Phase Verification
Given('the project phases are being set up', async function() {
  this.log('Setting up project phases for individual examination');
  
  // Ensure phases are available in test context
  if (!this.testContext.projectPhases) {
    const result = await this.executeScript(`
      return {
        phases: window.app.currentProject?.phases || {},
        definitions: window.projectPhasesManager?.phaseDefinitions || {}
      };
    `);
    
    this.testContext.projectPhases = {
      phases: result.phases,
      definitions: result.definitions
    };
  }
  
  this.log('✅ Project phases setup ready');
});

When('I examine the functional specification phase', async function() {
  this.log('Examining functional specification phase');
  
  const result = await this.executeScript(`
    const phases = window.app.currentProject?.phases || {};
    const definitions = window.projectPhasesManager?.phaseDefinitions || {};
    
    return {
      phase: phases.functionalSpec || {},
      definition: definitions.functionalSpec || {}
    };
  `);
  
  this.testContext.currentPhaseExamination = {
    phaseKey: 'functionalSpec',
    phase: result.phase,
    definition: result.definition
  };
  
  this.log('✅ Functional specification phase ready for examination');
});

When('I examine the technical specification phase', async function() {
  this.log('Examining technical specification phase');
  
  const result = await this.executeScript(`
    const phases = window.app.currentProject?.phases || {};
    const definitions = window.projectPhasesManager?.phaseDefinitions || {};
    
    return {
      phase: phases.techSpec || {},
      definition: definitions.techSpec || {}
    };
  `);
  
  this.testContext.currentPhaseExamination = {
    phaseKey: 'techSpec',
    phase: result.phase,
    definition: result.definition
  };
  
  this.log('✅ Technical specification phase ready for examination');
});

When('I examine the development phase', async function() {
  this.log('Examining development phase');
  
  const result = await this.executeScript(`
    const phases = window.app.currentProject?.phases || {};
    const definitions = window.projectPhasesManager?.phaseDefinitions || {};
    
    return {
      phase: phases.development || {},
      definition: definitions.development || {}
    };
  `);
  
  this.testContext.currentPhaseExamination = {
    phaseKey: 'development',
    phase: result.phase,
    definition: result.definition
  };
  
  this.log('✅ Development phase ready for examination');
});

When('I examine the testing phases', async function() {
  this.log('Examining testing phases (SIT, UAT, VAPT)');
  
  const result = await this.executeScript(`
    const phases = window.app.currentProject?.phases || {};
    const definitions = window.projectPhasesManager?.phaseDefinitions || {};
    
    return {
      sit: {
        phase: phases.sit || {},
        definition: definitions.sit || {}
      },
      uat: {
        phase: phases.uat || {},
        definition: definitions.uat || {}
      },
      vapt: {
        phase: phases.vapt || {},
        definition: definitions.vapt || {}
      }
    };
  `);
  
  this.testContext.testingPhasesExamination = result;
  
  this.log('✅ Testing phases ready for examination');
});

// Phase Property Verification
Then('it should be named {string}', async function(expectedName) {
  const examination = this.testContext.currentPhaseExamination;
  const actualName = examination.definition.name || examination.phase.name;
  
  assert.strictEqual(actualName, expectedName, 
    `Phase should be named '${expectedName}', got '${actualName}'`);
  
  this.log(`✅ Phase is named: ${expectedName}`);
});

Then('it should be of type {string}', async function(expectedType) {
  const examination = this.testContext.currentPhaseExamination;
  const actualType = examination.definition.type || examination.phase.type;
  
  assert.strictEqual(actualType, expectedType, 
    `Phase should be of type '${expectedType}', got '${actualType}'`);
  
  this.log(`✅ Phase is of type: ${expectedType}`);
});

Then('it should not be automatically calculated', async function() {
  const examination = this.testContext.currentPhaseExamination;
  const isCalculated = examination.definition.calculated || examination.phase.calculated;
  
  assert.strictEqual(isCalculated, false, 'Phase should not be automatically calculated');
  
  this.log('✅ Phase is not automatically calculated');
});

Then('it should be marked for automatic calculation', async function() {
  const examination = this.testContext.currentPhaseExamination;
  const isCalculated = examination.definition.calculated || examination.phase.calculated;
  
  assert.strictEqual(isCalculated, true, 'Phase should be marked for automatic calculation');
  
  this.log('✅ Phase is marked for automatic calculation');
});

Then('it should have default effort distribution: {int}% G1, {int}% G2, {int}% TA, {int}% PM', 
async function(g1Percent, g2Percent, taPercent, pmPercent) {
  const examination = this.testContext.currentPhaseExamination;
  const distribution = examination.definition.distribution || examination.phase.distribution || {};
  
  const expectedDistribution = { G1: g1Percent, G2: g2Percent, TA: taPercent, PM: pmPercent };
  
  Object.entries(expectedDistribution).forEach(([role, expectedPercent]) => {
    const actualPercent = distribution[role];
    assert.strictEqual(actualPercent, expectedPercent, 
      `${examination.phaseKey} should have ${expectedPercent}% for ${role}, got ${actualPercent}%`);
  });
  
  this.log(`✅ Phase has correct effort distribution: ${g1Percent}% G1, ${g2Percent}% G2, ${taPercent}% TA, ${pmPercent}% PM`);
});

// Testing Phases Verification  
Then('SIT should have effort distribution: {int}% G1, {int}% G2, {int}% TA, {int}% PM', 
async function(g1Percent, g2Percent, taPercent, pmPercent) {
  const sit = this.testContext.testingPhasesExamination?.sit;
  const distribution = sit?.definition.distribution || sit?.phase.distribution || {};
  
  const expectedDistribution = { G1: g1Percent, G2: g2Percent, TA: taPercent, PM: pmPercent };
  
  Object.entries(expectedDistribution).forEach(([role, expectedPercent]) => {
    const actualPercent = distribution[role];
    assert.strictEqual(actualPercent, expectedPercent, 
      `SIT should have ${expectedPercent}% for ${role}, got ${actualPercent}%`);
  });
  
  this.log(`✅ SIT has correct effort distribution: ${g1Percent}% G1, ${g2Percent}% G2, ${taPercent}% TA, ${pmPercent}% PM`);
});

Then('UAT should have effort distribution: {int}% G1, {int}% G2, {int}% TA, {int}% PM', 
async function(g1Percent, g2Percent, taPercent, pmPercent) {
  const uat = this.testContext.testingPhasesExamination?.uat;
  const distribution = uat?.definition.distribution || uat?.phase.distribution || {};
  
  const expectedDistribution = { G1: g1Percent, G2: g2Percent, TA: taPercent, PM: pmPercent };
  
  Object.entries(expectedDistribution).forEach(([role, expectedPercent]) => {
    const actualPercent = distribution[role];
    assert.strictEqual(actualPercent, expectedPercent, 
      `UAT should have ${expectedPercent}% for ${role}, got ${actualPercent}%`);
  });
  
  this.log(`✅ UAT has correct effort distribution: ${g1Percent}% G1, ${g2Percent}% G2, ${taPercent}% TA, ${pmPercent}% PM`);
});

Then('VAPT should have effort distribution: {int}% G1, {int}% G2, {int}% TA, {int}% PM', 
async function(g1Percent, g2Percent, taPercent, pmPercent) {
  const vapt = this.testContext.testingPhasesExamination?.vapt;
  const distribution = vapt?.definition.distribution || vapt?.phase.distribution || {};
  
  const expectedDistribution = { G1: g1Percent, G2: g2Percent, TA: taPercent, PM: pmPercent };
  
  Object.entries(expectedDistribution).forEach(([role, expectedPercent]) => {
    const actualPercent = distribution[role];
    assert.strictEqual(actualPercent, expectedPercent, 
      `VAPT should have ${expectedPercent}% for ${role}, got ${actualPercent}%`);
  });
  
  this.log(`✅ VAPT has correct effort distribution: ${g1Percent}% G1, ${g2Percent}% G2, ${taPercent}% TA, ${pmPercent}% PM`);
});

Then('all testing phases should be of type {string}', async function(expectedType) {
  const testingPhases = this.testContext.testingPhasesExamination;
  
  ['sit', 'uat', 'vapt'].forEach(phaseKey => {
    const phase = testingPhases[phaseKey];
    const actualType = phase?.definition.type || phase?.phase.type;
    
    assert.strictEqual(actualType, expectedType, 
      `${phaseKey.toUpperCase()} should be of type '${expectedType}', got '${actualType}'`);
  });
  
  this.log(`✅ All testing phases are of type: ${expectedType}`);
});

Then('none should be automatically calculated', async function() {
  const testingPhases = this.testContext.testingPhasesExamination;
  
  ['sit', 'uat', 'vapt'].forEach(phaseKey => {
    const phase = testingPhases[phaseKey];
    const isCalculated = phase?.definition.calculated || phase?.phase.calculated;
    
    assert.strictEqual(isCalculated, false, 
      `${phaseKey.toUpperCase()} should not be automatically calculated`);
  });
  
  this.log('✅ No testing phases are automatically calculated');
});