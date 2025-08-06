const { Before, After, BeforeAll, AfterAll, Status } = require('@cucumber/cucumber');
const path = require('path');
const fs = require('fs');

/**
 * Global setup before all scenarios
 */
BeforeAll(async function() {
  console.log('🚀 Starting Software Estimation Manager test suite');
  
  // Ensure reports directory exists
  const reportsDir = path.join(__dirname, '../../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Clean up any previous test artifacts
  await cleanupTestArtifacts();
});

/**
 * Setup before each scenario
 */
Before(async function(scenario) {
  this.log(`📝 Starting scenario: ${scenario.pickle.name}`);
  
  // Reset test context
  this.resetTestContext();
  
  // Launch Electron app if not already running
  if (!this.isAppRunning) {
    await this.launchElectronApp();
  }
  
  // Wait for app to be fully initialized
  await this.waitForAppReady();
  
  this.log('✅ Scenario setup complete');
});

/**
 * Cleanup after each scenario
 */
After(async function(scenario) {
  this.log(`📋 Finishing scenario: ${scenario.pickle.name} - Status: ${scenario.result.status}`);
  
  // Take screenshot on failure
  if (scenario.result.status === Status.FAILED) {
    await this.takeScreenshot(`failed-${scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, '-')}`);
    
    // Log error details
    if (this.testContext.lastError) {
      this.log(`❌ Last error: ${JSON.stringify(this.testContext.lastError, null, 2)}`);
    }
  }
  
  // Reset application state for next scenario
  await resetApplicationState.call(this);
  
  this.log('🧹 Scenario cleanup complete');
});

/**
 * Global cleanup after all scenarios
 */
AfterAll(async function() {
  console.log('🏁 Software Estimation Manager test suite completed');
  
  // Close any remaining Electron instances
  if (this && this.isAppRunning) {
    await this.closeElectronApp();
  }
  
  // Generate final test report summary
  await generateTestSummary();
});

/**
 * Reset application state between scenarios
 */
async function resetApplicationState() {
  this.log('🔄 Resetting application state');
  
  try {
    // Close any open modals
    await this.executeScript(`
      const modals = document.querySelectorAll('.modal.show, .modal[style*="display: block"]');
      modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('show');
      });
    `);
    
    // Clear any project data
    await this.executeScript(`
      if (window.app && window.app.newProject) {
        window.app.newProject();
      }
    `);
    
    // Reset navigation to default state
    await this.executeScript(`
      if (window.navigationManager && window.navigationManager.showSection) {
        window.navigationManager.showSection('features');
      }
    `);
    
    // Clear any form data
    await this.executeScript(`
      const forms = document.querySelectorAll('form');
      forms.forEach(form => form.reset());
    `);
    
    this.log('✅ Application state reset complete');
  } catch (error) {
    this.log(`⚠️  Error resetting application state: ${error.message}`);
    // Don't fail the test for reset issues
  }
}

/**
 * Clean up test artifacts from previous runs
 */
async function cleanupTestArtifacts() {
  const artifactDirs = [
    path.join(__dirname, '../../reports'),
    path.join(__dirname, '../../temp-test-files')
  ];
  
  for (const dir of artifactDirs) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up ${dir}`);
      } catch (error) {
        console.warn(`⚠️  Could not clean up ${dir}: ${error.message}`);
      }
    }
  }
}

/**
 * Generate test execution summary
 */
async function generateTestSummary() {
  const summaryPath = path.join(__dirname, '../../reports/test-summary.md');
  
  const summary = `# Test Execution Summary

## Overview
- **Execution Time**: ${new Date().toISOString()}
- **Test Suite**: Software Estimation Manager Cucumber Tests
- **Framework**: Cucumber.js + Electron Testing

## Test Coverage
This test suite covers all 9 feature areas:
1. **Project Management** - Project lifecycle and state management
2. **Feature Management** - CRUD operations and calculations  
3. **Configuration Management** - Hierarchical configuration system
4. **Project Phases Management** - 8-phase project planning
5. **Data Persistence** - File operations and validation
6. **Export Functionality** - Multi-format export capabilities
7. **UI Interactions** - Modal and navigation management
8. **Version Management** - Project versioning and comparison
9. **Bugs and Known Issues** - Documented behavioral quirks

## Key Test Behaviors
- **Electron Application Testing**: Full desktop app automation
- **Real-time Calculations**: Formula validation and edge cases
- **Data Validation**: Business rule enforcement
- **File Operations**: Export and persistence testing
- **UI State Management**: Modal, navigation, and form interactions

## Notes
- Tests document current behavior (including known bugs)
- Screenshots captured on test failures
- Application state reset between scenarios
- Comprehensive fixture data for consistent testing

Generated by Software Estimation Manager Test Suite
`;
  
  try {
    fs.writeFileSync(summaryPath, summary);
    console.log(`📊 Test summary generated: ${summaryPath}`);
  } catch (error) {
    console.warn(`⚠️  Could not generate test summary: ${error.message}`);
  }
}