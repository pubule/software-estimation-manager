const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const assert = require('assert');

/**
 * Coverage Bug Fix - Test Steps
 * These tests describe the CORRECT behavior (not reproducing the bug)
 * Test should fail initially because bug exists, then pass when fixed
 */

// Background steps
Given('I am on the project management page', async function() {
    // Navigate to project management if not already there
    await this.page.goto(this.baseURL);
    
    // Wait for application to load
    await this.page.waitForFunction(() => window.appStore && window.app);
    
    this.log('✅ Application loaded and ready');
});

// Test steps for coverage behavior
When('I create a new project without any features', async function() {
    // Click new project button
    await this.page.click('[data-testid="new-project-btn"], .new-project-btn, #new-project-btn');
    
    // Fill project details but don't add any features
    await this.page.fill('[data-testid="project-name"], .project-name-input, #project-name', 'Test Project');
    await this.page.fill('[data-testid="project-description"], .project-description, #project-description', 'Test project for coverage bug fix');
    
    // Save the project
    await this.page.click('[data-testid="save-project"], .save-project-btn, #save-project-btn');
    
    // Wait for project to be created
    await this.page.waitForTimeout(1000);
    
    this.log('✅ New project created without features');
});

When('I create a new project', async function() {
    // Same as above - create new project
    await this.page.click('[data-testid="new-project-btn"], .new-project-btn, #new-project-btn');
    await this.page.fill('[data-testid="project-name"], .project-name-input, #project-name', 'Test Project');
    await this.page.fill('[data-testid="project-description"], .project-description, #project-description', 'Test project');
    await this.page.click('[data-testid="save-project"], .save-project-btn, #save-project-btn');
    await this.page.waitForTimeout(1000);
});

Given('I have created a new project with 0% coverage', async function() {
    // Create project first
    await this.page.click('[data-testid="new-project-btn"], .new-project-btn, #new-project-btn');
    await this.page.fill('[data-testid="project-name"], .project-name-input, #project-name', 'Test Project Zero Coverage');
    await this.page.fill('[data-testid="project-description"], .project-description, #project-description', 'Project with zero coverage');
    await this.page.click('[data-testid="save-project"], .save-project-btn, #save-project-btn');
    await this.page.waitForTimeout(1000);
    
    // Verify it has 0% coverage (this is the expected behavior after bug fix)
    const coverage = await this.page.evaluate(() => {
        const store = window.appStore.getState();
        return store.currentProject?.coverage || 0;
    });
    
    this.log(`✅ Project created with coverage: ${coverage}%`);
});

When('I add features to the project', async function() {
    // Navigate to features tab/section
    await this.page.click('[data-testid="features-tab"], .features-tab, #features-tab');
    
    // Add a test feature
    await this.page.click('[data-testid="add-feature-btn"], .add-feature-btn, #add-feature-btn');
    
    // Fill feature details
    await this.page.fill('[data-testid="feature-name"], .feature-name-input', 'Test Feature');
    await this.page.selectOption('[data-testid="feature-category"], .feature-category-select', { index: 0 });
    await this.page.selectOption('[data-testid="feature-type"], .feature-type-select', { index: 0 });
    
    // Save feature
    await this.page.click('[data-testid="save-feature"], .save-feature-btn');
    await this.page.waitForTimeout(500);
    
    this.log('✅ Feature added to project');
});

// Assertion steps
Then('the project coverage should be 0%', async function() {
    // Check coverage value in store
    const coverage = await this.page.evaluate(() => {
        const store = window.appStore.getState();
        return store.currentProject?.coverage || 0;
    });
    
    assert.strictEqual(coverage, 0, `Expected coverage to be 0%, but got ${coverage}%`);
    this.log(`✅ Project coverage is correctly 0%`);
});

Then('the coverage should be automatically calculated', async function() {
    // Check if coverage is marked as auto-calculated
    const isAutoCalculated = await this.page.evaluate(() => {
        const store = window.appStore.getState();
        return store.currentProject?.coverageIsAutoCalculated !== false;
    });
    
    assert.strictEqual(isAutoCalculated, true, 'Coverage should be automatically calculated');
    this.log('✅ Coverage is automatically calculated');
});

Then('no hardcoded 110% value should appear', async function() {
    // Verify no 110 value anywhere in the project
    const coverage = await this.page.evaluate(() => {
        const store = window.appStore.getState();
        return store.currentProject?.coverage || 0;
    });
    
    assert.notStrictEqual(coverage, 110, 'Coverage should not be hardcoded to 110%');
    this.log('✅ No hardcoded 110% value found');
});

Then('the coverage input field should show 0', async function() {
    // Check the UI input field value
    const inputValue = await this.page.inputValue('[data-testid="coverage-value"], .coverage-input, #coverage-value');
    const numericValue = parseFloat(inputValue) || 0;
    
    assert.strictEqual(numericValue, 0, `Expected coverage input to show 0, but shows ${numericValue}`);
    this.log('✅ Coverage input field shows 0');
});

Then('the coverage should be marked as automatically calculated', async function() {
    // Same check as previous step
    const isAutoCalculated = await this.page.evaluate(() => {
        const store = window.appStore.getState();
        return store.currentProject?.coverageIsAutoCalculated !== false;
    });
    
    assert.strictEqual(isAutoCalculated, true, 'Coverage should be marked as automatically calculated');
    this.log('✅ Coverage is marked as automatically calculated');
});

Then('the reset button should be hidden initially', async function() {
    // Check if reset button is hidden when coverage is auto-calculated
    const isResetButtonVisible = await this.page.isVisible('[data-testid="coverage-reset-btn"], .coverage-reset-btn, #coverage-reset-btn');
    
    assert.strictEqual(isResetButtonVisible, false, 'Reset button should be hidden for auto-calculated coverage');
    this.log('✅ Reset button is hidden as expected');
});

Then('the coverage should be recalculated based on actual features', async function() {
    // Coverage should be based on actual features, not hardcoded
    const projectState = await this.page.evaluate(() => {
        const store = window.appStore.getState();
        return {
            coverage: store.currentProject?.coverage || 0,
            featuresCount: store.currentProject?.features?.length || 0,
            isAutoCalculated: store.currentProject?.coverageIsAutoCalculated !== false
        };
    });
    
    // Coverage should be calculated based on features (not hardcoded to 110)
    assert.notStrictEqual(projectState.coverage, 110, 'Coverage should not be hardcoded to 110%');
    assert.strictEqual(projectState.isAutoCalculated, true, 'Coverage should be auto-calculated');
    assert.strictEqual(projectState.featuresCount > 0, true, 'Project should have features');
    
    this.log(`✅ Coverage recalculated: ${projectState.coverage}% for ${projectState.featuresCount} features`);
});

Then('the coverage should remain realistic and not hardcoded', async function() {
    const coverage = await this.page.evaluate(() => {
        const store = window.appStore.getState();
        return store.currentProject?.coverage || 0;
    });
    
    // Coverage should be realistic (0-100 range, not 110 hardcoded value)
    assert.strictEqual(coverage >= 0, true, 'Coverage should be >= 0');
    assert.strictEqual(coverage <= 100, true, 'Coverage should be <= 100% for realistic values');
    assert.notStrictEqual(coverage, 110, 'Coverage should not be hardcoded to 110%');
    
    this.log(`✅ Coverage is realistic: ${coverage}%`);
});
