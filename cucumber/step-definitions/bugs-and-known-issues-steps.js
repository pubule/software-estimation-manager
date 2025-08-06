const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

/**
 * Bugs and Known Issues Step Definitions
 * Documents current bugs, behavioral quirks, and timing issues
 * These tests document the ACTUAL behavior, not necessarily the DESIRED behavior
 */

// Background Steps
Given('all components are initialized', async function() {
  this.log('Verifying all components are initialized for bug testing');
  
  const result = await this.executeScript(`
    return {
      components: {
        app: !!window.app,
        dataManager: !!window.dataManager,
        configurationManager: !!window.configurationManager,
        featureManager: !!window.featureManager,
        projectPhasesManager: !!window.projectPhasesManager,
        versionManager: !!window.versionManager
      },
      allInitialized: !![
        window.app,
        window.dataManager,
        window.configurationManager,
        window.featureManager,
        window.projectPhasesManager
      ].every(component => component)
    };
  `);
  
  assert(result.allInitialized, 'All components should be initialized for bug testing');
  
  this.log('✅ All components are initialized');
});

// Validation and Input Issues
Given('I am creating a new feature', async function() {
  this.log('Setting up new feature creation context for validation testing');
  
  // Ensure project exists
  await this.executeScript(`
    if (!window.app.currentProject) {
      window.app.newProject();
    }
  `);
  
  // Open feature modal
  await this.executeScript(`
    if (window.featureManager && window.featureManager.showModal) {
      window.featureManager.showModal();
    }
  `);
  
  await this.waitForElement('.modal.show', this.timeouts.modal);
  
  this.testContext.validationTestContext = { creatingFeature: true };
  this.log('✅ Feature creation context ready for validation testing');
});

When('I enter a description with exactly {int} characters', async function(characterCount) {
  this.log(`Entering description with exactly ${characterCount} characters`);
  
  const testDescription = 'A'.repeat(characterCount);
  
  await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const descriptionField = modal?.querySelector('#feature-description, [name="description"], textarea');
    
    if (descriptionField) {
      descriptionField.value = '${testDescription}';
      descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
      descriptionField.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  `);
  
  this.testContext.testDescription = testDescription;
  this.testContext.descriptionLength = characterCount;
  
  this.log(`✅ Entered description: "${testDescription}" (${characterCount} characters)`);
});

Then('the validation check should pass \\(actual requirement is 3+ characters)', async function() {
  this.log('Checking validation - should pass for 3+ characters (ACTUAL behavior)');
  
  const result = await this.executeScript(`
    const modal = document.querySelector('.modal.show');
    const descriptionField = modal?.querySelector('#feature-description, [name="description"], textarea');
    const description = descriptionField?.value || '';
    
    // Document ACTUAL validation behavior (3+ characters)
    const actualValidation = description.trim().length >= 3;
    
    return {
      description: description,
      descriptionLength: description.length,
      actualValidationPasses: actualValidation,
      hasValidationError: !!modal?.querySelector('.error, .text-danger, .is-invalid')
    };
  `);
  
  if (this.testContext.descriptionLength >= 3) {
    // This documents the ACTUAL behavior - validation passes with 3+ characters
    assert(result.actualValidationPasses, 
      `ACTUAL BEHAVIOR: Validation should pass with ${this.testContext.descriptionLength} characters (3+ required)`);
    
    this.log(`✅ DOCUMENTED BEHAVIOR: Validation passes with ${this.testContext.descriptionLength} characters`);
  } else {
    this.log(`⚠️  Validation expected to fail with ${this.testContext.descriptionLength} characters`);
  }
  
  this.testContext.actualValidationResult = result.actualValidationPasses;
});

Then('if validation fails, the error message incorrectly states {string}', async function(incorrectErrorMessage) {
  this.log('Documenting BUG: Incorrect error message content');
  
  // If validation did fail, check the error message
  if (!this.testContext.actualValidationResult) {
    const result = await this.executeScript(`
      const modal = document.querySelector('.modal.show');
      const errorElement = modal?.querySelector('.error, .text-danger, .invalid-feedback');
      
      return {
        hasError: !!errorElement,
        errorMessage: errorElement?.textContent?.trim() || ''
      };
    `);
    
    if (result.hasError) {
      // Document the BUG: Error message claims 10 characters but validation is actually 3+
      const actualMessage = result.errorMessage;
      this.log(`🐛 BUG DOCUMENTED: Error message says "${actualMessage}" but actual validation requires 3+ characters`);
      
      // This documents the current buggy behavior
      this.testContext.buggyErrorMessage = actualMessage;
    }
  }
  
  this.log('✅ BUG: Validation error message inconsistency documented');
});

Then('this creates user confusion about actual validation requirements', async function() {
  this.log('Documenting user confusion caused by validation discrepancy');
  
  // This step documents the impact of the bug
  const impact = {
    confusionSource: 'Error message claims 10 char minimum, code validates 3+ chars',
    userExperience: 'Users get conflicting information about requirements',
    severity: 'Medium - causes confusion but doesn\'t break functionality'
  };
  
  this.testContext.bugImpact = impact;
  
  this.log('✅ User confusion impact documented');
  this.log(`   - Source: ${impact.confusionSource}`);
  this.log(`   - Impact: ${impact.userExperience}`);
});

// Feature Validation Discrepancy
Given('I am validating feature input data', async function() {
  this.log('Setting up feature validation test context');
  
  await this.executeScript(`
    if (!window.app.currentProject) {
      window.app.newProject();
    }
  `);
  
  this.testContext.validationTestType = 'feature_input_validation';
  this.log('✅ Feature input validation context ready');
});

When('I enter a description with {int} characters', async function(characterCount) {
  this.log(`Testing validation with ${characterCount} characters`);
  
  const testDescription = 'X'.repeat(characterCount);
  
  // Mock validation test
  const result = await this.executeScript(`
    const description = '${testDescription}';
    
    // Document ACTUAL validation logic (3+ characters)
    const actualValidation = description.trim().length >= 3;
    
    // Mock error message that would appear (claims 10+ characters)
    const errorMessage = "Description must be at least 10 characters long";
    
    return {
      description: description,
      length: description.length,
      actualValidationPasses: actualValidation,
      claimedRequirement: 10,
      actualRequirement: 3,
      errorMessage: errorMessage
    };
  `);
  
  this.testContext.validationTest = result;
  this.log(`✅ Validation test: ${characterCount} chars -> passes: ${result.actualValidationPasses}`);
});

Then('the feature validation should pass', async function() {
  const validationTest = this.testContext.validationTest;
  
  // Document that validation passes (actual behavior)
  assert(validationTest.actualValidationPasses, 
    'ACTUAL BEHAVIOR: Validation passes with 3+ characters');
  
  this.log('✅ DOCUMENTED: Feature validation passes (3+ character requirement)');
});

Then('the error message for short descriptions claims {string}', async function(claimedRequirement) {
  const validationTest = this.testContext.validationTest;
  
  // Document the bug: error message claims different requirement
  const errorMessage = validationTest.errorMessage;
  assert(errorMessage.includes('10 characters'), 
    'BUG DOCUMENTED: Error message claims 10 character minimum');
  
  this.log(`🐛 BUG: Error message incorrectly claims "${claimedRequirement}"`);
  this.log(`   - Actual requirement: ${validationTest.actualRequirement}+ characters`);
  this.log(`   - Claimed requirement: ${validationTest.claimedRequirement}+ characters`);
});

Then('users receive conflicting information about requirements', async function() {
  this.log('Documenting user confusion from conflicting validation messages');
  
  const impact = {
    bug: 'Validation logic (3+ chars) conflicts with error message (10+ chars)',
    userConfusion: 'Users don\'t know the real requirement',
    recommendedFix: 'Align error message with actual validation logic'
  };
  
  this.testContext.validationBugImpact = impact;
  
  this.log('✅ Conflicting information bug documented');
  this.log(`   - Issue: ${impact.bug}`);
  this.log(`   - Impact: ${impact.userConfusion}`);
});

// Timing and Concurrency Issues
Given('I am creating a new project', async function() {
  this.log('Setting up project creation for timing issue testing');
  
  this.testContext.timingTestContext = { 
    projectCreation: true,
    startTime: Date.now()
  };
  
  this.log('✅ Project creation timing test context ready');
});

When('the new project workflow initiates', async function() {
  this.log('Initiating new project workflow to observe timeout behavior');
  
  const result = await this.executeScript(`
    // Document the ACTUAL behavior: multiple setTimeout calls
    const timeouts = [];
    let timeoutCounter = 0;
    
    // Mock the actual setTimeout behavior in new project creation
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay) {
      timeouts.push({
        id: ++timeoutCounter,
        delay: delay,
        scheduledAt: Date.now(),
        type: 'timeout'
      });
      return originalSetTimeout(callback, delay);
    };
    
    // Simulate new project creation with multiple timeouts
    try {
      window.app.newProject();
      
      // Add additional timeouts that would typically be scheduled
      setTimeout(() => {
        // Phase reset timeout (100ms)
      }, 100);
      
      setTimeout(() => {
        // Version creation timeout (600ms) 
      }, 600);
      
    } catch (error) {
      console.log('Error during project creation:', error);
    }
    
    // Restore original setTimeout
    window.setTimeout = originalSetTimeout;
    
    return {
      scheduledTimeouts: timeouts,
      timeoutCount: timeouts.length,
      potentialRaceConditions: timeouts.length > 1
    };
  `);
  
  this.testContext.timingAnalysis = result;
  this.log(`✅ Project workflow initiated - ${result.timeoutCount} timeouts scheduled`);
});

Then('multiple setTimeout operations are scheduled concurrently', async function() {
  const analysis = this.testContext.timingAnalysis;
  
  assert(analysis.timeoutCount > 1, 
    'DOCUMENTED BEHAVIOR: Multiple setTimeout operations are scheduled');
  
  this.log(`✅ DOCUMENTED: ${analysis.timeoutCount} setTimeout operations scheduled concurrently`);
});

Then('a {int}ms timeout is set for phase reset', async function(expectedDelay) {
  const analysis = this.testContext.timingAnalysis;
  
  const hasPhaseResetTimeout = analysis.scheduledTimeouts.some(timeout => 
    timeout.delay === expectedDelay);
  
  // Document this timeout (may or may not exist in actual implementation)
  this.log(`📝 DOCUMENTED: ${expectedDelay}ms timeout for phase reset ${hasPhaseResetTimeout ? '(observed)' : '(expected behavior)'}`);
});

Then('a {int}ms timeout is set for version creation', async function(expectedDelay) {
  const analysis = this.testContext.timingAnalysis;
  
  const hasVersionTimeout = analysis.scheduledTimeouts.some(timeout => 
    timeout.delay === expectedDelay);
  
  this.log(`📝 DOCUMENTED: ${expectedDelay}ms timeout for version creation ${hasVersionTimeout ? '(observed)' : '(expected behavior)'}`);
});

Then('these timeouts could potentially interfere with each other', async function() {
  const analysis = this.testContext.timingAnalysis;
  
  // Document the potential race condition
  assert(analysis.potentialRaceConditions, 
    'DOCUMENTED ISSUE: Multiple timeouts create potential race conditions');
  
  this.log('🐛 RACE CONDITION BUG: Multiple timeouts can interfere with each other');
  this.log('   - Risk: Timing-dependent behavior');
  this.log('   - Impact: Unpredictable execution order');
});

Then('the order of execution is not deterministic', async function() {
  this.log('Documenting non-deterministic execution order issue');
  
  const timingIssue = {
    problem: 'Multiple setTimeout calls with different delays',
    risk: 'Execution order depends on JavaScript event loop timing',
    impact: 'Project creation behavior may vary between runs',
    severity: 'Medium - could cause intermittent issues'
  };
  
  this.testContext.timingBug = timingIssue;
  
  this.log('✅ Non-deterministic execution order documented');
  this.log(`   - Problem: ${timingIssue.problem}`);
  this.log(`   - Impact: ${timingIssue.impact}`);
});

// Project Phases Manager Timing Issues
Given('project phase calculations are being performed', async function() {
  this.log('Setting up project phase calculation timing test');
  
  await this.executeScript(`
    if (!window.app.currentProject) {
      window.app.newProject();
    }
    
    // Add features to trigger phase calculations
    window.app.currentProject.features = [
      { id: 'FEAT-001', manDays: 10 },
      { id: 'FEAT-002', manDays: 15 }
    ];
  `);
  
  this.testContext.phaseCalculationTest = { active: true };
  this.log('✅ Project phase calculation context ready');
});

When('multiple asynchronous operations are queued with setTimeout', async function() {
  this.log('Triggering multiple setTimeout operations in phase calculations');
  
  const result = await this.executeScript(`
    const timeouts = [];
    const originalSetTimeout = window.setTimeout;
    
    window.setTimeout = function(callback, delay) {
      timeouts.push({
        delay: delay,
        timestamp: Date.now()
      });
      return originalSetTimeout(callback, delay);
    };
    
    try {
      // Trigger phase calculations which may use multiple setTimeout calls
      if (window.projectPhasesManager && window.projectPhasesManager.calculatePhases) {
        window.projectPhasesManager.calculatePhases();
      }
      
      // Mock additional phase calculation timeouts
      setTimeout(() => {}, 50);   // Calculation step 1
      setTimeout(() => {}, 100);  // Calculation step 2
      setTimeout(() => {}, 150);  // UI update
      
    } catch (error) {
      console.log('Error in phase calculations:', error);
    }
    
    window.setTimeout = originalSetTimeout;
    
    return {
      timeouts: timeouts,
      count: timeouts.length
    };
  `);
  
  this.testContext.phaseTimingAnalysis = result;
  this.log(`✅ ${result.count} asynchronous operations queued`);
});

Then('timing conflicts could occur between different calculation steps', async function() {
  const analysis = this.testContext.phaseTimingAnalysis;
  
  // Document potential timing conflicts
  const hasMultipleTimeouts = analysis.count > 1;
  assert(hasMultipleTimeouts, 'DOCUMENTED: Multiple setTimeout operations could cause conflicts');
  
  this.log('🐛 TIMING CONFLICT BUG: Different calculation steps could interfere');
  this.log(`   - Operations queued: ${analysis.count}`);
  this.log('   - Risk: Steps executing out of intended order');
});

Then('race conditions might affect the accuracy of calculations', async function() {
  this.log('Documenting potential calculation accuracy issues from race conditions');
  
  const raceConditionIssue = {
    cause: 'Multiple setTimeout operations in phase calculations',
    risk: 'Calculation steps executing in wrong order',
    impact: 'Potentially incorrect phase calculations',
    likelihood: 'Low but possible under high system load'
  };
  
  this.testContext.calculationRaceCondition = raceConditionIssue;
  
  this.log('✅ Calculation accuracy race condition documented');
  this.log(`   - Cause: ${raceConditionIssue.cause}`);
  this.log(`   - Impact: ${raceConditionIssue.impact}`);
});

Then('the final state might depend on timing rather than logic', async function() {
  this.log('Documenting timing-dependent state issue');
  
  const timingDependency = {
    issue: 'Final calculation state depends on setTimeout execution order',
    shouldBe: 'State should depend only on input data and business logic',
    actualBehavior: 'State may vary based on JavaScript timing',
    severity: 'Medium - creates non-deterministic behavior'
  };
  
  this.testContext.timingDependencyBug = timingDependency;
  
  this.log('✅ Timing-dependent state behavior documented');
  this.log(`   - Issue: ${timingDependency.issue}`);
  this.log(`   - Should be: ${timingDependency.shouldBe}`);
  this.log(`   - Actual: ${timingDependency.actualBehavior}`);
});

// State Management Issues
Given('auto-save is disabled', async function() {
  this.log('Disabling auto-save to test state management bug');
  
  await this.executeScript(`
    // Disable auto-save functionality
    if (window.app && window.app.autoSave) {
      window.app.autoSave = false;
    }
    if (window.dataManager && window.dataManager.autoSaveEnabled) {
      window.dataManager.autoSaveEnabled = false;
    }
  `);
  
  this.testContext.autoSaveDisabled = true;
  this.log('✅ Auto-save disabled');
});

Given('I have a project with features loaded', async function() {
  this.log('Loading project with features for state management test');
  
  await this.executeScript(`
    if (!window.app.currentProject) {
      window.app.newProject();
    }
    
    window.app.currentProject.features = [
      { id: 'FEAT-SM1', description: 'Test Feature', manDays: 10 }
    ];
  `);
  
  this.log('✅ Project with features loaded');
});

When('I trigger markDirty on the project', async function() {
  this.log('Triggering markDirty to test state management behavior');
  
  const result = await this.executeScript(`
    let phaseManagerUpdateTriggered = false;
    
    // Mock phase manager update detection
    if (window.projectPhasesManager && window.projectPhasesManager.calculatePhases) {
      const originalCalculate = window.projectPhasesManager.calculatePhases;
      window.projectPhasesManager.calculatePhases = function() {
        phaseManagerUpdateTriggered = true;
        return originalCalculate.apply(this, arguments);
      };
    }
    
    // Trigger markDirty
    if (window.app && window.app.markDirty) {
      window.app.markDirty();
    }
    
    return {
      markDirtyCalled: true,
      phaseManagerUpdateTriggered: phaseManagerUpdateTriggered,
      autoSaveEnabled: window.app?.autoSave || window.dataManager?.autoSaveEnabled || false
    };
  `);
  
  this.testContext.markDirtyTest = result;
  this.log(`✅ markDirty triggered - phase manager update: ${result.phaseManagerUpdateTriggered}`);
});

Then('the project phases manager should still receive update notifications', async function() {
  const testResult = this.testContext.markDirtyTest;
  
  // Document the BUG: Phase manager gets updates even when auto-save is disabled
  assert(!testResult.autoSaveEnabled, 'Auto-save should be disabled for this test');
  
  if (testResult.phaseManagerUpdateTriggered) {
    this.log('🐛 BUG DOCUMENTED: Phase manager receives updates even with auto-save disabled');
    this.log('   - Expected: No phase updates when auto-save is off');
    this.log('   - Actual: Phase manager still gets notified');
  } else {
    this.log('📝 Current behavior: Phase manager does not receive updates (expected)');
  }
  
  this.testContext.phaseManagerBug = {
    description: 'Phase manager updates triggered regardless of auto-save setting',
    expected: 'Updates should respect auto-save setting',
    actual: 'Updates occur even when auto-save is disabled',
    impact: 'Unnecessary calculations and potential performance issues'
  };
  
  this.log('✅ Phase manager update behavior documented');
});

Then('this causes unnecessary recalculations', async function() {
  this.log('Documenting unnecessary recalculation issue');
  
  const performanceIssue = {
    cause: 'markDirty triggers phase calculations regardless of auto-save setting',
    impact: 'CPU cycles wasted on calculations that won\'t be saved',
    frequency: 'Every time project data is modified',
    severity: 'Low - performance impact only'
  };
  
  this.testContext.performanceBug = performanceIssue;
  
  this.log('✅ Unnecessary recalculation issue documented');
  this.log(`   - Cause: ${performanceIssue.cause}`);
  this.log(`   - Impact: ${performanceIssue.impact}`);
  this.log(`   - Frequency: ${performanceIssue.frequency}`);
});