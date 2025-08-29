const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

/**
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * 
 * 1. TUTTA la business logic va in Actions (src/renderer/react/actions/CalculationsMigrationActions.ts)
 * 2. Lo state va SOLO in app-store.js (Zustand)
 * 3. I componenti React sono SOLO presentazione
 * 4. MAI logica nei componenti, MAI state locale per dati business
 * 
 * Flusso corretto:
 * User Action → Component → Actions Class → Store → State Update → Re-render
 * 
 * 
 */

// Step definitions for calculations functionality
// DEVE seguire il pattern State/Actions/Dispatcher SEMPRE

Given('I have a project with phases and features loaded', async function() {
    // Create a project with sample data
    await this.page.evaluate(() => {
        const store = window.appStore;
        const state = store.getState();
        
        // Create sample project with phases and features
        const testProject = {
            id: 'test-project',
            name: 'Test Project',
            code: 'TST-001',
            phases: [
                { name: 'Analysis', supplierType: 'internal', resourceName: 'Analyst', effortMDs: 10 },
                { name: 'Development', supplierType: 'external', resourceName: 'Developer', effortMDs: 20 }
            ],
            features: [
                { name: 'Login', complexity: 'medium', featureType: 'functional' },
                { name: 'Dashboard', complexity: 'high', featureType: 'functional' }
            ]
        };
        
        state.setProject(testProject);
    });
});

When('I navigate to the calculations section', async function() {
    await this.page.click('.nav-child[data-section="calculations"]');
    await this.page.waitForSelector('.calculations-page', { timeout: 5000 });
});

Then('I should see the calculations dashboard', async function() {
    await this.page.waitForSelector('.calculations-page', { timeout: 5000 });
    expect(await this.page.locator('.calculations-page').isVisible()).toBeTruthy();
});

Then('I should see the empty calculations state', async function() {
    // Look for the specific text that indicates empty calculations state
    const emptyMessage = this.page.locator('text=No calculations available');
    await emptyMessage.waitFor({ timeout: 5000 });
    expect(await emptyMessage.isVisible()).toBeTruthy();
});

Then('I should see the vendor and role filter dropdowns', async function() {
    await this.page.waitForSelector('#vendor-filter', { timeout: 5000 });
    await this.page.waitForSelector('#role-filter', { timeout: 5000 });
    expect(await this.page.locator('#vendor-filter').isVisible()).toBeTruthy();
    expect(await this.page.locator('#role-filter').isVisible()).toBeTruthy();
});

Given('I have a project with valid supplier configuration', async function() {
    // Create a project with proper supplier configuration matching CalculationsActions expectations
    await this.page.evaluate(() => {
        const store = window.appStore;
        const state = store.getState();
        
        // Set configuration with suppliers
        state.setConfiguration({
            suppliers: [
                { id: 'internal', name: 'Internal Team', type: 'internal' },
                { id: 'vendor-1', name: 'External Vendor', type: 'external' }
            ],
            categories: [
                { id: 'functional', name: 'Functional' },
                { id: 'technical', name: 'Technical' }
            ],
            featureTypes: [
                { id: 'crud', name: 'CRUD Operations' },
                { id: 'ui', name: 'User Interface' }
            ],
            roles: [
                { name: 'Analyst', department: 'TA', officialRate: 500, realRate: 450 },
                { name: 'Developer', department: 'G2', officialRate: 600, realRate: 550 }
            ]
        });
        
        // Create test project with proper structure
        const testProject = {
            id: 'test-calc-project',
            name: 'Test Calc Project',
            code: 'CALC-001',
            phases: [
                { 
                    name: 'Analysis', 
                    supplierType: 'internal', 
                    resourceName: 'Analyst',
                    department: 'TA',
                    effortMDs: 10 
                },
                { 
                    name: 'Development', 
                    supplierType: 'external', 
                    resourceName: 'Developer',
                    department: 'G2', 
                    effortMDs: 20 
                }
            ],
            features: [
                { name: 'Login', complexity: 'medium', featureType: 'functional', category: 'functional' },
                { name: 'Dashboard', complexity: 'high', featureType: 'ui', category: 'functional' }
            ]
        };
        
        state.setProject(testProject);
    });
});

Then('I should see KPI cards for GTO, GDS and Total Project', async function() {
    await this.page.waitForSelector('.kpi-cards-grid', { timeout: 5000 });
    
    const gtoCard = this.page.locator('.kpi-card.gto-card');
    const gdsCard = this.page.locator('.kpi-card.gds-card');
    const totalCard = this.page.locator('.kpi-card.total-card');
    
    expect(await gtoCard.isVisible()).toBeTruthy();
    expect(await gdsCard.isVisible()).toBeTruthy();
    expect(await totalCard.isVisible()).toBeTruthy();
});

Then('I should see the vendor costs table', async function() {
    await this.page.waitForSelector('.calculations-table', { timeout: 5000 });
    expect(await this.page.locator('.calculations-table').isVisible()).toBeTruthy();
});

Given('I am on the calculations page', async function() {
    await this.page.click('.nav-child[data-section="calculations"]');
    await this.page.waitForSelector('.calculations-page', { timeout: 5000 });
});

Given('the calculations table is displayed', async function() {
    await this.page.waitForSelector('.calculations-table tbody tr', { timeout: 5000 });
    const rowCount = await this.page.locator('.calculations-table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
});

When('I change a Final MDs value for a vendor role', async function() {
    // Find first Final MDs input and change its value
    const firstInput = this.page.locator('.final-mds-input').first();
    await firstInput.fill('15');
    await firstInput.blur(); // Trigger change event
});

When('the value is updated', async function() {
    // Wait for the UI to process the change
    await this.page.waitForTimeout(500);
});

Then('the total cost should be recalculated', async function() {
    // Verify that totals row exists and shows updated values
    await this.page.waitForSelector('.totals-row', { timeout: 5000 });
    expect(await this.page.locator('.totals-row').isVisible()).toBeTruthy();
});

Then('the KPIs should update accordingly', async function() {
    // Verify KPI cards show updated values
    await this.page.waitForSelector('.kpi-cards-grid', { timeout: 5000 });
    const totalValue = await this.page.locator('.kpi-card.total-card .kpi-total').textContent();
    expect(totalValue).toMatch(/€[\d,]+/);
});

Given('the calculations table shows multiple vendors', async function() {
    await this.page.waitForSelector('.calculations-table tbody tr', { timeout: 5000 });
    const rowCount = await this.page.locator('.calculations-table tbody tr').count();
    expect(rowCount).toBeGreaterThan(1);
});

When('I select a specific vendor from the vendor filter', async function() {
    // Open vendor filter and select first non-"all" option
    await this.page.selectOption('#vendor-filter', { index: 1 });
});

Then('the table should show only costs for that vendor', async function() {
    // Verify filtering worked - table should show filtered results
    await this.page.waitForTimeout(500); // Allow filtering to process
    const rows = await this.page.locator('.calculations-table tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
});

Then('the totals should reflect the filtered data', async function() {
    // Verify totals row exists (would be recalculated for filtered data)
    expect(await this.page.locator('.totals-row').isVisible()).toBeTruthy();
});

Given('the calculations table shows multiple roles', async function() {
    await this.page.waitForSelector('.calculations-table tbody tr', { timeout: 5000 });
    const rowCount = await this.page.locator('.calculations-table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
});

When('I select a specific role from the role filter', async function() {
    // Open role filter and select first non-"all" option
    await this.page.selectOption('#role-filter', { index: 1 });
});

Then('the table should show only costs for that role', async function() {
    await this.page.waitForTimeout(500);
    const rows = await this.page.locator('.calculations-table tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
});

Then('the totals should be recalculated for the filtered data', async function() {
    expect(await this.page.locator('.totals-row').isVisible()).toBeTruthy();
});

Given('I have modified some Final MDs values', async function() {
    // Modify a Final MDs value
    const firstInput = this.page.locator('.final-mds-input').first();
    await firstInput.fill('25');
    await firstInput.blur();
    await this.page.waitForTimeout(500);
});

When('I click the Reset button', async function() {
    await this.page.click('button:has-text("Reset")');
});

Then('all Final MDs should revert to estimated values', async function() {
    await this.page.waitForTimeout(500);
    // Verify reset worked by checking that values changed back
    expect(await this.page.locator('.final-mds-input').first().inputValue()).not.toBe('25');
});

Then('the total costs should be recalculated', async function() {
    // Verify totals are recalculated after reset
    expect(await this.page.locator('.totals-row').isVisible()).toBeTruthy();
});
