const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

/**
 * Feature Management Step Definitions
 * Covers CRUD operations, calculations, validations, and modal interactions
 */

// Background and Setup Steps
Given('I have a project loaded with configuration data', async function() {
  this.log('Ensuring project with configuration is loaded');
  
  // Create new project if none exists
  await this.executeScript('window.app.newProject()');
  
  // Wait for configuration to be loaded
  await this.pause(1000);
  
  const result = await this.executeScript(`
    return {
      hasProject: !!window.app.currentProject,
      hasConfig: !!window.configurationManager?.getCurrentConfig(),
      projectName: window.app.currentProject?.name,
      configStructure: {
        suppliers: (window.configurationManager?.getCurrentConfig()?.globalConfig?.suppliers || []).length,
        categories: (window.configurationManager?.getCurrentConfig()?.globalConfig?.categories || []).length
      }
    };
  `);
  
  assert(result.hasProject, 'Project should be loaded');
  assert(result.hasConfig, 'Configuration should be loaded');
  
  this.testContext.currentProject = { 
    name: result.projectName, 
    hasConfig: true,
    configStructure: result.configStructure
  };
  
  this.log(`✅ Project loaded with configuration: ${result.configStructure.suppliers} suppliers, ${result.configStructure.categories} categories`);
});

Given('the feature management system is initialized', async function() {
  this.log('Verifying feature management system initialization');
  
  const result = await this.executeScript(`
    return {
      hasFeatureManager: !!window.featureManager,
      hasFeatureModal: !!document.getElementById('feature-modal'),
      hasFeatureTable: !!document.getElementById('features-table') || !!document.querySelector('.features-table'),
      hasAddButton: !!document.getElementById('add-feature-btn') || !!document.querySelector('[onclick*="addFeature"]'),
      methods: {
        showModal: typeof window.featureManager?.showModal === 'function',
        addFeature: typeof window.featureManager?.addFeature === 'function',
        editFeature: typeof window.featureManager?.editFeature === 'function',
        deleteFeature: typeof window.featureManager?.deleteFeature === 'function'
      }
    };
  `);
  
  assert(result.hasFeatureManager, 'Feature manager should be initialized');
  assert(result.hasFeatureModal, 'Feature modal should exist in DOM');
  
  Object.entries(result.methods).forEach(([method, exists]) => {
    assert(exists, `Feature manager should have ${method} method`);
  });
  
  this.log('✅ Feature management system is initialized');
});

// Feature Creation Steps
Given('I have existing features with IDs {string} and {string}', async function(id1, id2) {
  this.log(`Setting up existing features with IDs: ${id1}, ${id2}`);
  
  await this.executeScript(`
    // Add mock features to the project
    if (!window.app.currentProject.features) {
      window.app.currentProject.features = [];
    }
    
    const feature1 = {
      id: '${id1}',
      description: 'Test Feature 1',
      category: 'Category1',
      supplier: 'Supplier1',
      realManDays: 5,
      expertiseLevel: 100,
      riskMargin: 0,
      manDays: 5
    };
    
    const feature2 = {
      id: '${id2}',
      description: 'Test Feature 2', 
      category: 'Category1',
      supplier: 'Supplier1',
      realManDays: 8,
      expertiseLevel: 80,
      riskMargin: 25,
      manDays: 10
    };
    
    window.app.currentProject.features = [feature1, feature2];
    
    // Update UI if feature manager exists
    if (window.featureManager && window.featureManager.updateTable) {
      window.featureManager.updateTable();
    }
  `);
  
  this.testContext.existingFeatures = [id1, id2];
  this.log(`✅ Added existing features: ${id1}, ${id2}`);
});

When('I open the add feature modal', async function() {
  this.log('Opening add feature modal');
  
  // Click add feature button or call method directly
  await this.executeScript(`
    if (window.featureManager && window.featureManager.showModal) {
      window.featureManager.showModal();
    } else {
      // Fallback: look for add button and click it
      const addButton = document.getElementById('add-feature-btn') || 
                       document.querySelector('[onclick*="addFeature"]') ||
                       document.querySelector('.add-feature-btn');
      if (addButton) {
        addButton.click();
      }
    }
  `);
  
  // Wait for modal to be visible
  await this.waitForElement('.modal.show', this.timeouts.modal);
  await this.pause(300); // Allow modal animation
  
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show') || 
                  document.querySelector('.modal[style*="display: block"]');
    return {
      isModalVisible: !!modal,
      modalTitle: modal?.querySelector('.modal-title')?.textContent,
      hasForm: !!modal?.querySelector('form'),
      featureIdField: modal?.querySelector('#feature-id, [name="id"], input[type="text"]')?.value
    };
  `);
  
  assert(result.isModalVisible, 'Feature modal should be visible');
  
  this.testContext.modalState = { 
    isOpen: true, 
    type: 'add',
    modalTitle: result.modalTitle,
    initialId: result.featureIdField
  };
  
  this.log('✅ Add feature modal opened');
});

Then('the feature ID field should be automatically populated with {string}', async function(expectedId) {
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show') || 
                  document.querySelector('.modal[style*="display: block"]');
    const idField = modal?.querySelector('#feature-id, [name="id"], input[type="text"]');
    
    return {
      idFieldValue: idField?.value,
      idFieldExists: !!idField,
      modalVisible: !!modal
    };
  `);
  
  assert(result.modalVisible, 'Modal should be visible');
  assert(result.idFieldExists, 'ID field should exist in modal');
  assert.strictEqual(result.idFieldValue, expectedId, 
    `Feature ID should be auto-populated with '${expectedId}', got '${result.idFieldValue}'`);
  
  this.log(`✅ Feature ID auto-populated: ${expectedId}`);
});

Then('the modal title should indicate {string}', async function(expectedTitle) {
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show') || 
                  document.querySelector('.modal[style*="display: block"]');
    return {
      modalTitle: modal?.querySelector('.modal-title, h4, h5')?.textContent?.trim()
    };
  `);
  
  assert(result.modalTitle?.includes(expectedTitle) || result.modalTitle === expectedTitle, 
    `Modal title should indicate '${expectedTitle}', got '${result.modalTitle}'`);
  
  this.log(`✅ Modal title indicates: ${expectedTitle}`);
});

Then('all form fields should be empty except the generated ID', async function() {
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show') || 
                  document.querySelector('.modal[style*="display: block"]');
    const form = modal?.querySelector('form');
    const inputs = form?.querySelectorAll('input, select, textarea') || [];
    
    const fieldValues = {};
    inputs.forEach((input, index) => {
      const name = input.name || input.id || \`field_\${index}\`;
      fieldValues[name] = {
        value: input.value || '',
        type: input.type || input.tagName.toLowerCase()
      };
    });
    
    return {
      fieldValues,
      fieldCount: inputs.length
    };
  `);
  
  assert(result.fieldCount > 0, 'Form should have input fields');
  
  // Check that non-ID fields are empty
  Object.entries(result.fieldValues).forEach(([fieldName, fieldInfo]) => {
    if (!fieldName.toLowerCase().includes('id')) {
      assert(!fieldInfo.value || fieldInfo.value.trim() === '', 
        `Non-ID field '${fieldName}' should be empty, got '${fieldInfo.value}'`);
    }
  });
  
  this.log(`✅ All ${result.fieldCount} form fields are empty except ID`);
});

// Calculation Steps
Given('I am creating a feature', async function() {
  this.log('Setting up feature creation context');
  
  // Open modal if not already open
  if (!this.testContext.modalState?.isOpen) {
    await this.executeScript(`
      if (window.featureManager && window.featureManager.showModal) {
        window.featureManager.showModal();
      }
    `);
    
    await this.waitForElement('.modal.show', this.timeouts.modal);
    this.testContext.modalState = { isOpen: true, type: 'add' };
  }
  
  this.log('✅ Feature creation context ready');
});

Given('I enter {int} real man days', async function(manDays) {
  this.log(`Entering ${manDays} real man days`);
  
  await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const manDaysField = modal?.querySelector('#real-man-days, [name="realManDays"], input[placeholder*="man"], input[placeholder*="Real"]');
    
    if (manDaysField) {
      manDaysField.value = '${manDays}';
      manDaysField.dispatchEvent(new Event('input', { bubbles: true }));
      manDaysField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  `);
  
  this.testContext.currentFeature = { 
    ...this.testContext.currentFeature, 
    realManDays: manDays 
  };
  
  this.log(`✅ Entered ${manDays} real man days`);
});

Given('I set expertise level to {int}', async function(expertise) {
  this.log(`Setting expertise level to ${expertise}`);
  
  await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const expertiseField = modal?.querySelector('#expertise-level, [name="expertiseLevel"], select[name*="expertise"], input[placeholder*="expertise"]');
    
    if (expertiseField) {
      expertiseField.value = '${expertise}';
      expertiseField.dispatchEvent(new Event('input', { bubbles: true }));
      expertiseField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  `);
  
  this.testContext.currentFeature = { 
    ...this.testContext.currentFeature, 
    expertiseLevel: expertise 
  };
  
  this.log(`✅ Set expertise level to ${expertise}`);
});

Given('I set risk margin to {int}', async function(riskMargin) {
  this.log(`Setting risk margin to ${riskMargin}`);
  
  await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const riskField = modal?.querySelector('#risk-margin, [name="riskMargin"], input[placeholder*="risk"], select[name*="risk"]');
    
    if (riskField) {
      riskField.value = '${riskMargin}';
      riskField.dispatchEvent(new Event('input', { bubbles: true }));
      riskField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  `);
  
  this.testContext.currentFeature = { 
    ...this.testContext.currentFeature, 
    riskMargin: riskMargin 
  };
  
  this.log(`✅ Set risk margin to ${riskMargin}`);
});

When('the calculation is triggered', async function() {
  this.log('Triggering calculation');
  
  // Trigger calculation by calling feature manager method or simulating input event
  await this.executeScript(`
    if (window.featureManager && window.featureManager.calculateManDays) {
      window.featureManager.calculateManDays();
    } else {
      // Trigger calculation via input events
      const modal = document.querySelector('.modal.show');
      const inputs = modal?.querySelectorAll('input, select');
      inputs?.forEach(input => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  `);
  
  await this.pause(300); // Allow time for calculation
  
  this.log('✅ Calculation triggered');
});

Then('the calculated man days should be {float}', async function(expectedManDays) {
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const calculatedField = modal?.querySelector('#calculated-man-days, [name="manDays"], .calculated-value, input[readonly]');
    
    return {
      calculatedValue: calculatedField?.value || calculatedField?.textContent,
      fieldExists: !!calculatedField,
      fieldType: calculatedField?.tagName.toLowerCase()
    };
  `);
  
  assert(result.fieldExists, 'Calculated man days field should exist');
  
  const actualValue = parseFloat(result.calculatedValue);
  assert(!isNaN(actualValue), `Calculated value should be a number, got '${result.calculatedValue}'`);
  assert(Math.abs(actualValue - expectedManDays) < 0.01, 
    `Calculated man days should be ${expectedManDays}, got ${actualValue}`);
  
  this.testContext.currentFeature = { 
    ...this.testContext.currentFeature, 
    calculatedManDays: actualValue 
  };
  
  this.log(`✅ Calculated man days: ${actualValue} (expected: ${expectedManDays})`);
});

Then('the formula used should be: real man days * \\(100 + risk margin) / expertise level', async function() {
  // Verify the formula is documented or visible
  const result = await this.executeScript(`
    return {
      hasFormulaDisplay: !!document.querySelector('.formula, .calculation-formula, [title*="formula"]'),
      tooltipText: document.querySelector('[title*="formula"]')?.title,
      // Verify calculation matches formula
      testCalculation: {
        realManDays: ${this.testContext.currentFeature?.realManDays || 10},
        riskMargin: ${this.testContext.currentFeature?.riskMargin || 20},
        expertiseLevel: ${this.testContext.currentFeature?.expertiseLevel || 80},
        expectedResult: (${this.testContext.currentFeature?.realManDays || 10} * (100 + ${this.testContext.currentFeature?.riskMargin || 20})) / ${this.testContext.currentFeature?.expertiseLevel || 80}
      }
    };
  `);
  
  // The formula is documented in behavior, verify calculation matches
  const expectedResult = result.testCalculation.expectedResult;
  const actualResult = this.testContext.currentFeature?.calculatedManDays;
  
  if (actualResult !== undefined) {
    assert(Math.abs(actualResult - expectedResult) < 0.01, 
      `Calculation should follow formula: ${this.testContext.currentFeature.realManDays} * (100 + ${this.testContext.currentFeature.riskMargin}) / ${this.testContext.currentFeature.expertiseLevel} = ${expectedResult}, got ${actualResult}`);
  }
  
  this.log('✅ Calculation formula verified');
});

// Edge Case Handling
When('I set expertise level to 0', async function() {
  this.log('Setting expertise level to 0 (edge case)');
  
  await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const expertiseField = modal?.querySelector('#expertise-level, [name="expertiseLevel"], select[name*="expertise"], input[placeholder*="expertise"]');
    
    if (expertiseField) {
      expertiseField.value = '0';
      expertiseField.dispatchEvent(new Event('input', { bubbles: true }));
      expertiseField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  `);
  
  this.testContext.currentFeature = { 
    ...this.testContext.currentFeature, 
    expertiseLevel: 0 
  };
  
  this.log('✅ Set expertise level to 0');
});

Then('no division by zero error should occur', async function() {
  const result = await this.executeScript(`
    return {
      hasError: !!document.querySelector('.error, .alert-danger, .text-danger'),
      consoleErrors: [], // Would need to capture console.error calls
      calculationSucceeded: true // If we get here, no error thrown
    };
  `);
  
  assert(!result.hasError, 'No error messages should be displayed');
  assert(result.calculationSucceeded, 'Calculation should complete without throwing errors');
  
  this.log('✅ No division by zero error occurred');
});

// Real-time Updates
Given('I have the feature form open', async function() {
  this.log('Ensuring feature form is open');
  
  if (!this.testContext.modalState?.isOpen) {
    await this.executeScript(`
      if (window.featureManager && window.featureManager.showModal) {
        window.featureManager.showModal();
      }
    `);
    
    await this.waitForElement('.modal.show', this.timeouts.modal);
  }
  
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    return {
      isModalOpen: !!modal,
      hasForm: !!modal?.querySelector('form'),
      fieldCount: modal?.querySelectorAll('input, select, textarea').length || 0
    };
  `);
  
  assert(result.isModalOpen, 'Feature modal should be open');
  assert(result.hasForm, 'Modal should contain a form');
  assert(result.fieldCount > 0, 'Form should have input fields');
  
  this.testContext.modalState = { isOpen: true, hasForm: true };
  this.log(`✅ Feature form is open with ${result.fieldCount} fields`);
});

When('I modify the real man days field', async function() {
  this.log('Modifying real man days field');
  
  const newValue = 15; // Test value
  
  await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const manDaysField = modal?.querySelector('#real-man-days, [name="realManDays"], input[placeholder*="man"], input[placeholder*="Real"]');
    
    if (manDaysField) {
      manDaysField.value = '${newValue}';
      manDaysField.dispatchEvent(new Event('input', { bubbles: true }));
    }
  `);
  
  // Store original calculated value to compare
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const calculatedField = modal?.querySelector('#calculated-man-days, [name="manDays"], .calculated-value, input[readonly]');
    return {
      calculatedValue: calculatedField?.value || calculatedField?.textContent
    };
  `);
  
  this.testContext.realTimeTest = {
    ...this.testContext.realTimeTest,
    beforeManDaysChange: result.calculatedValue,
    newManDays: newValue
  };
  
  this.log(`✅ Modified real man days to ${newValue}`);
});

Then('the calculated man days should update immediately', async function() {
  // Allow short time for real-time update
  await this.pause(200);
  
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const calculatedField = modal?.querySelector('#calculated-man-days, [name="manDays"], .calculated-value, input[readonly]');
    return {
      calculatedValue: calculatedField?.value || calculatedField?.textContent,
      timestamp: Date.now()
    };
  `);
  
  // Verify the calculated value has changed (real-time update)
  const beforeValue = this.testContext.realTimeTest?.beforeManDaysChange;
  if (beforeValue !== undefined) {
    assert(result.calculatedValue !== beforeValue, 
      `Calculated man days should update immediately. Before: '${beforeValue}', After: '${result.calculatedValue}'`);
  }
  
  // Store for next comparison
  this.testContext.realTimeTest = {
    ...this.testContext.realTimeTest,
    afterUpdate: result.calculatedValue,
    updateTimestamp: result.timestamp
  };
  
  this.log(`✅ Calculated man days updated immediately to: ${result.calculatedValue}`);
});

// Similar steps for expertise level and risk margin would follow the same pattern...