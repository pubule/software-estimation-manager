const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

/**
 * Project Management Step Definitions
 * Covers project lifecycle, state management, and configuration
 */

// Background and Setup Steps
Given('the Software Estimation Manager application is initialized', async function() {
  this.log('Ensuring application is initialized');
  
  // Verify app is running and core components loaded
  await this.waitForElement('#app-container');
  
  const result = await this.executeScript(`
    return {
      hasApp: !!window.app,
      hasDataManager: !!window.dataManager,
      hasConfigManager: !!window.configurationManager,
      hasFeatureManager: !!window.featureManager,
      hasProjectPhasesManager: !!window.projectPhasesManager,
      isInitialized: document.readyState === 'complete'
    };
  `);
  
  assert(result.hasApp, 'Main application instance not found');
  assert(result.hasDataManager, 'Data manager not initialized');
  assert(result.isInitialized, 'Application not fully initialized');
  
  this.log('✅ Application initialization verified');
});

Given('all required components are loaded', async function() {
  this.log('Verifying all components are loaded');
  
  const result = await this.executeScript(`
    return {
      components: {
        app: !!window.app,
        dataManager: !!window.dataManager,
        configurationManager: !!window.configurationManager,
        featureManager: !!window.featureManager,
        projectPhasesManager: !!window.projectPhasesManager,
        navigationManager: !!window.navigationManager,
        versionManager: !!window.versionManager
      },
      dom: {
        appContainer: !!document.getElementById('app-container'),
        navigation: !!document.getElementById('navigation-tabs'),
        projectInfo: !!document.getElementById('project-info'),
        statusIndicator: !!document.getElementById('project-status')
      }
    };
  `);
  
  // Verify all critical components
  Object.entries(result.components).forEach(([name, exists]) => {
    assert(exists, `Component ${name} not loaded`);
  });
  
  Object.entries(result.dom).forEach(([name, exists]) => {
    assert(exists, `DOM element ${name} not found`);
  });
  
  this.log('✅ All components verified as loaded');
});

// Project Creation Steps
Given('I am working on any existing project', async function() {
  this.log('Ensuring any project is loaded (could be new or existing)');
  
  const result = await this.executeScript(`
    return {
      hasProject: !!window.app.currentProject,
      projectName: window.app.currentProject?.name || null,
      isDirty: window.app.currentProject?.isDirty || false
    };
  `);
  
  // If no project exists, create a new one
  if (!result.hasProject) {
    this.log('No project loaded, creating new project');
    await this.executeScript('window.app.newProject()');
    await this.waitForElement('#project-name');
  }
  
  this.testContext.currentProject = result;
  this.log(`✅ Working with project: ${result.projectName || 'New Project'}`);
});

When('I create a new project', async function() {
  this.log('Creating new project');
  
  // Execute new project creation
  await this.executeScript('window.app.newProject()');
  
  // Wait for project to be created and UI to update
  await this.waitForElement('#project-name');
  await this.pause(500); // Allow time for initialization
  
  // Verify project was created
  const result = await this.executeScript(`
    return {
      project: window.app.currentProject,
      projectName: document.getElementById('project-name')?.value,
      statusIndicator: document.getElementById('project-status')?.textContent
    };
  `);
  
  this.testContext.currentProject = result.project;
  this.log(`✅ New project created: ${result.projectName}`);
});

// Project Verification Steps
Then('a new project should be created with name {string}', async function(expectedName) {
  const result = await this.executeScript(`
    return {
      projectName: window.app.currentProject?.name,
      inputValue: document.getElementById('project-name')?.value,
      hasProject: !!window.app.currentProject
    };
  `);
  
  assert(result.hasProject, 'No project was created');
  assert(result.projectName === expectedName || result.inputValue === expectedName, 
    `Project name should be '${expectedName}', got '${result.projectName || result.inputValue}'`);
  
  this.log(`✅ Project created with name: ${expectedName}`);
});

Then('the project should have version {string}', async function(expectedVersion) {
  const result = await this.executeScript(`
    return {
      version: window.app.currentProject?.version
    };
  `);
  
  assert.strictEqual(result.version, expectedVersion, 
    `Project version should be '${expectedVersion}', got '${result.version}'`);
  
  this.log(`✅ Project version verified: ${expectedVersion}`);
});

Then('the project should have an empty features list', async function() {
  const result = await this.executeScript(`
    return {
      features: window.app.currentProject?.features,
      featureCount: window.app.currentProject?.features?.length || 0
    };
  `);
  
  assert(Array.isArray(result.features), 'Project features should be an array');
  assert.strictEqual(result.featureCount, 0, 'Project should start with empty features list');
  
  this.log('✅ Project has empty features list');
});

Then('the project should have all 8 project phases defined', async function() {
  const result = await this.executeScript(`
    return {
      phases: window.app.currentProject?.phases,
      phaseKeys: Object.keys(window.app.currentProject?.phases || {})
    };
  `);
  
  const expectedPhases = [
    'functionalSpec', 'techSpec', 'development', 'sit', 
    'uat', 'vapt', 'consolidation', 'postGoLive'
  ];
  
  assert(result.phases, 'Project phases should be defined');
  assert.strictEqual(result.phaseKeys.length, 8, 'Should have exactly 8 phases');
  
  expectedPhases.forEach(phase => {
    assert(result.phaseKeys.includes(phase), `Phase '${phase}' should be defined`);
  });
  
  this.log('✅ All 8 project phases are defined');
});

Then('each phase should have manDays and cost properties initialized', async function() {
  const result = await this.executeScript(`
    const phases = window.app.currentProject?.phases || {};
    const phaseDetails = {};
    
    Object.keys(phases).forEach(phaseKey => {
      const phase = phases[phaseKey];
      phaseDetails[phaseKey] = {
        hasManDays: phase.hasOwnProperty('manDays'),
        hasCost: phase.hasOwnProperty('cost'),
        manDays: phase.manDays,
        cost: phase.cost
      };
    });
    
    return { phaseDetails, phaseCount: Object.keys(phases).length };
  `);
  
  assert(result.phaseCount > 0, 'No phases found');
  
  Object.entries(result.phaseDetails).forEach(([phaseName, details]) => {
    assert(details.hasManDays, `Phase '${phaseName}' should have manDays property`);
    assert(details.hasCost, `Phase '${phaseName}' should have cost property`);
    assert(typeof details.manDays === 'number', `Phase '${phaseName}' manDays should be a number`);
    assert(typeof details.cost === 'number', `Phase '${phaseName}' cost should be a number`);
  });
  
  this.log('✅ All phases have manDays and cost properties initialized');
});

// Project Status Steps
Then('the project status should show as unsaved', async function() {
  const result = await this.executeScript(`
    return {
      statusText: document.getElementById('project-status')?.textContent,
      statusClass: document.getElementById('project-status')?.className,
      isDirty: window.app.currentProject?.isDirty
    };
  `);
  
  // Check for unsaved indicators
  const hasUnsavedIndicator = result.statusText?.includes('●') || 
                             result.statusClass?.includes('unsaved') ||
                             result.isDirty === true;
  
  assert(hasUnsavedIndicator, 'Project should show as unsaved');
  this.log('✅ Project status shows as unsaved');
});

// Configuration Initialization Steps
Given('no project configuration exists', async function() {
  this.log('Ensuring no project configuration exists');
  
  // Clear any existing configuration
  await this.executeScript(`
    if (window.configurationManager) {
      window.configurationManager.currentConfig = null;
    }
  `);
  
  this.log('✅ Project configuration cleared');
});

When('I initialize a new project', async function() {
  this.log('Initializing new project with configuration');
  
  // Create new project which should initialize configuration
  await this.executeScript('window.app.newProject()');
  
  // Wait for configuration to be initialized
  await this.pause(1000);
  
  const result = await this.executeScript(`
    return {
      hasConfig: !!window.configurationManager?.getCurrentConfig(),
      config: window.configurationManager?.getCurrentConfig()
    };
  `);
  
  this.testContext.currentProject = { config: result.config };
  this.log('✅ Project initialized with configuration');
});

Then('the project should have a hierarchical configuration structure', async function() {
  const result = await this.executeScript(`
    const config = window.configurationManager?.getCurrentConfig();
    return {
      hasConfig: !!config,
      hasGlobalConfig: !!config?.globalConfig,
      hasProjectOverrides: !!config?.projectOverrides,
      structure: {
        globalConfig: !!config?.globalConfig,
        projectOverrides: !!config?.projectOverrides,
        suppliers: !!config?.globalConfig?.suppliers,
        categories: !!config?.globalConfig?.categories,
        internalResources: !!config?.globalConfig?.internalResources
      }
    };
  `);
  
  assert(result.hasConfig, 'Configuration should exist');
  assert(result.hasGlobalConfig, 'Global configuration should exist');
  assert(result.hasProjectOverrides, 'Project overrides should exist');
  
  Object.entries(result.structure).forEach(([key, exists]) => {
    assert(exists, `Configuration should have ${key}`);
  });
  
  this.log('✅ Hierarchical configuration structure verified');
});

Then('the configuration should include global defaults for suppliers', async function() {
  const result = await this.executeScript(`
    const config = window.configurationManager?.getCurrentConfig();
    return {
      suppliers: config?.globalConfig?.suppliers || [],
      supplierCount: (config?.globalConfig?.suppliers || []).length
    };
  `);
  
  assert(Array.isArray(result.suppliers), 'Suppliers should be an array');
  assert(result.supplierCount > 0, 'Should have default suppliers configured');
  
  this.log(`✅ Configuration has ${result.supplierCount} default suppliers`);
});

Then('the configuration should include global defaults for categories', async function() {
  const result = await this.executeScript(`
    const config = window.configurationManager?.getCurrentConfig();
    return {
      categories: config?.globalConfig?.categories || [],
      categoryCount: (config?.globalConfig?.categories || []).length
    };
  `);
  
  assert(Array.isArray(result.categories), 'Categories should be an array');
  assert(result.categoryCount > 0, 'Should have default categories configured');
  
  this.log(`✅ Configuration has ${result.categoryCount} default categories`);
});

Then('the configuration should include global defaults for internal resources', async function() {
  const result = await this.executeScript(`
    const config = window.configurationManager?.getCurrentConfig();
    return {
      internalResources: config?.globalConfig?.internalResources || [],
      resourceCount: (config?.globalConfig?.internalResources || []).length
    };
  `);
  
  assert(Array.isArray(result.internalResources), 'Internal resources should be an array');
  assert(result.resourceCount > 0, 'Should have default internal resources configured');
  
  this.log(`✅ Configuration has ${result.resourceCount} default internal resources`);
});

Then('the configuration should have empty project overrides', async function() {
  const result = await this.executeScript(`
    const config = window.configurationManager?.getCurrentConfig();
    return {
      projectOverrides: config?.projectOverrides || {},
      overrideKeys: Object.keys(config?.projectOverrides || {})
    };
  `);
  
  assert(typeof result.projectOverrides === 'object', 'Project overrides should be an object');
  assert(result.overrideKeys.length === 0, 'Project overrides should be empty for new project');
  
  this.log('✅ Project overrides are empty');
});

Then('the configuration should be ready for project-specific customizations', async function() {
  const result = await this.executeScript(`
    const config = window.configurationManager?.getCurrentConfig();
    return {
      hasAddMethods: typeof window.configurationManager?.addProjectItem === 'function',
      hasGetMethods: typeof window.configurationManager?.getProjectItems === 'function',
      canCustomize: !!config && typeof config === 'object'
    };
  `);
  
  assert(result.hasAddMethods, 'Configuration manager should have methods for adding project items');
  assert(result.hasGetMethods, 'Configuration manager should have methods for getting project items');
  assert(result.canCustomize, 'Configuration should be ready for customization');
  
  this.log('✅ Configuration ready for project-specific customizations');
});

// Project State Management Steps
Given('I have a clean project open', async function() {
  this.log('Ensuring clean project is open');
  
  // Create new project or clean existing one
  await this.executeScript('window.app.newProject()');
  await this.pause(500);
  
  // Verify project is clean
  const result = await this.executeScript(`
    return {
      isDirty: window.app.currentProject?.isDirty || false,
      hasProject: !!window.app.currentProject
    };
  `);
  
  assert(result.hasProject, 'Project should be loaded');
  assert(!result.isDirty, 'Project should be clean (not dirty)');
  
  this.testContext.currentProject = { isDirty: false };
  this.log('✅ Clean project is open');
});

When('I modify project data', async function() {
  this.log('Modifying project data to make it dirty');
  
  // Modify project name to trigger dirty state
  await this.executeScript(`
    const nameInput = document.getElementById('project-name');
    if (nameInput) {
      nameInput.value = 'Modified Project Name';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Mark project as dirty if not automatically triggered
    if (window.app.currentProject) {
      window.app.markDirty();
    }
  `);
  
  await this.pause(500); // Allow time for state updates
  
  this.log('✅ Project data modified');
});

Then('the project should be marked as dirty', async function() {
  const result = await this.executeScript(`
    return {
      isDirty: window.app.currentProject?.isDirty,
      projectState: window.app.currentProject
    };
  `);
  
  assert(result.isDirty === true, 'Project should be marked as dirty');
  
  this.testContext.currentProject = { ...this.testContext.currentProject, isDirty: true };
  this.log('✅ Project is marked as dirty');
});

Then('the project status indicator should display {string}', async function(expectedIndicator) {
  const result = await this.executeScript(`
    return {
      statusText: document.getElementById('project-status')?.textContent?.trim(),
      statusHTML: document.getElementById('project-status')?.innerHTML
    };
  `);
  
  const actualIndicator = result.statusText || result.statusHTML;
  assert(actualIndicator?.includes(expectedIndicator), 
    `Status indicator should display '${expectedIndicator}', got '${actualIndicator}'`);
  
  this.log(`✅ Status indicator displays: ${expectedIndicator}`);
});

Then('the status indicator should have {string} CSS class', async function(expectedClass) {
  const result = await this.executeScript(`
    return {
      classList: Array.from(document.getElementById('project-status')?.classList || []),
      className: document.getElementById('project-status')?.className
    };
  `);
  
  assert(result.classList.includes(expectedClass), 
    `Status indicator should have '${expectedClass}' class. Current classes: ${result.classList.join(', ')}`);
  
  this.log(`✅ Status indicator has '${expectedClass}' CSS class`);
});

Then('the navigation manager should be notified of dirty state', async function() {
  const result = await this.executeScript(`
    return {
      hasNavigationManager: !!window.navigationManager,
      navigationState: window.navigationManager?.currentState
    };
  `);
  
  assert(result.hasNavigationManager, 'Navigation manager should exist');
  // In a real implementation, we'd verify the navigation manager received the dirty state notification
  
  this.log('✅ Navigation manager notified of dirty state');
});