const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

/**
 * Step definitions for Calculations page improvements
 * Following State/Actions/Dispatcher pattern
 */

// Background steps
Given('I have a project with multiple vendors and features', async function() {
    // Setup test project with multiple vendors through Actions
    await this.page.evaluate(() => {
        const store = window.appStore;
        const projectData = {
            name: 'Test Project',
            features: [
                { name: 'Feature 1', supplier: 'vendor1', manDays: 10 },
                { name: 'Feature 2', supplier: 'vendor2', manDays: 20 }
            ],
            configuration: {
                suppliers: [
                    { id: 'vendor1', name: 'Vendor 1', role: 'G2', officialRate: 450, type: 'external' },
                    { id: 'vendor2', name: 'Vendor 2', role: 'G1', officialRate: 500, type: 'internal' },
                    { id: 'vendor3', name: 'Vendor 3', role: 'TA', officialRate: 400, type: 'external' },
                    { id: 'vendor4', name: 'Vendor 4', role: 'PM', officialRate: 600, type: 'internal' }
                ]
            }
        };
        
        // Load project in store
        store.getState().setCurrentProject(projectData);
    });
});

// Container overflow scenarios
Then('the main container should have scrollable overflow', async function() {
    const hasOverflow = await this.page.evaluate(() => {
        const container = document.querySelector('.calculations-page');
        const styles = window.getComputedStyle(container);
        return styles.overflowY === 'auto' || styles.overflowY === 'scroll';
    });
    expect(hasOverflow).toBeTruthy();
});

Then('the max-height should be set to allow vertical scrolling', async function() {
    const hasMaxHeight = await this.page.evaluate(() => {
        const container = document.querySelector('.calculations-page');
        const styles = window.getComputedStyle(container);
        return styles.maxHeight && styles.maxHeight !== 'none';
    });
    expect(hasMaxHeight).toBeTruthy();
});

// Filter buttons scenarios
Then('I should see filter buttons {string}, {string}, and {string}', async function(btn1, btn2, btn3) {
    const buttonsExist = await this.page.evaluate(() => {
        const allBtn = document.querySelector('.filter-btn-all');
        const gtoBtn = document.querySelector('.filter-btn-gto');
        const gdsBtn = document.querySelector('.filter-btn-gds');
        return allBtn && gtoBtn && gdsBtn;
    });
    expect(buttonsExist).toBeTruthy();
});

Then('the {string} button should show the total count of all vendors', async function(buttonName) {
    const buttonText = await this.page.locator('.filter-btn-all').textContent();
    expect(buttonText).toMatch(/ALL \(\d+\)/);
});

Then('the {string} button should show count for G2 and TA roles', async function(buttonName) {
    const buttonText = await this.page.locator('.filter-btn-gto').textContent();
    expect(buttonText).toMatch(/GTO \(\d+\)/);
});

Then('the {string} button should show count for G1 and PM roles', async function(buttonName) {
    const buttonText = await this.page.locator('.filter-btn-gds').textContent();
    expect(buttonText).toMatch(/GDS \(\d+\)/);
});

// Filtering scenarios
When('I click the {string} filter button', async function(filterType) {
    const selector = `.filter-btn-${filterType.toLowerCase()}`;
    await this.page.click(selector);
});

Then('only vendors with roles {string} or {string} should be visible', async function(role1, role2) {
    const visibleRoles = await this.page.evaluate(() => {
        const rows = document.querySelectorAll('.calculations-table tbody tr');
        return Array.from(rows).map(row => {
            const roleCell = row.querySelector('.vendor-role .role-badge');
            return roleCell ? roleCell.textContent : null;
        }).filter(Boolean);
    });
    
    visibleRoles.forEach(role => {
        expect([role1, role2]).toContain(role);
    });
});

Then('the filter button should be highlighted as active', async function() {
    const hasActiveButton = await this.page.evaluate(() => {
        return document.querySelector('.filter-btn.active') !== null;
    });
    expect(hasActiveButton).toBeTruthy();
});

// Reset button scenarios
Given('I have modified a Final MDs value for a vendor', async function() {
    // Modify first input through Actions
    await this.page.evaluate(() => {
        const firstInput = document.querySelector('.final-mds-input');
        if (firstInput) {
            firstInput.value = '100';
            firstInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
});

When('I click the reset button for that specific row', async function() {
    await this.page.click('.reset-mds-btn:first-of-type');
});

Then('the Final MDs value should reset to the Official Tot MDs value', async function() {
    const valuesMatch = await this.page.evaluate(() => {
        const firstRow = document.querySelector('.calculations-table tbody tr');
        const officialValue = firstRow.querySelector('.official-tot-mds').textContent;
        const finalInput = firstRow.querySelector('.final-mds-input');
        return finalInput.value === officialValue;
    });
    expect(valuesMatch).toBeTruthy();
});

Then('the Final Tot Cost should be recalculated', async function() {
    const hasCost = await this.page.evaluate(() => {
        const finalCost = document.querySelector('.final-tot-cost');
        return finalCost && finalCost.textContent.includes('€');
    });
    expect(hasCost).toBeTruthy();
});

// Reset all scenario
Given('I have modified multiple Final MDs values', async function() {
    await this.page.evaluate(() => {
        const inputs = document.querySelectorAll('.final-mds-input');
        for (let i = 0; i < Math.min(3, inputs.length); i++) {
            inputs[i].value = String(100 + i * 10);
            inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
});

When('I click the main {string} button', async function(buttonText) {
    await this.page.click('.btn-warning');
});

Then('all Final MDs values should reset to their Official Tot MDs values', async function() {
    const allReset = await this.page.evaluate(() => {
        const rows = document.querySelectorAll('.calculations-table tbody tr');
        return Array.from(rows).every(row => {
            const officialValue = row.querySelector('.official-tot-mds').textContent;
            const finalInput = row.querySelector('.final-mds-input');
            return finalInput.value === officialValue;
        });
    });
    expect(allReset).toBeTruthy();
});

Then('all Final Tot Costs should be recalculated', async function() {
    const allHaveCosts = await this.page.evaluate(() => {
        const costs = document.querySelectorAll('.final-tot-cost');
        return Array.from(costs).every(cost => 
            cost.textContent && cost.textContent.includes('€')
        );
    });
    expect(allHaveCosts).toBeTruthy();
});

// KPI cards spacing scenarios
Then('the KPI cards should display percentages with proper spacing from amounts', async function() {
    const hasProperSpacing = await this.page.evaluate(() => {
        const metricCosts = document.querySelectorAll('.metric-cost');
        return Array.from(metricCosts).every(cost => {
            const styles = window.getComputedStyle(cost);
            return styles.marginLeft && styles.marginLeft !== '0px';
        });
    });
    expect(hasProperSpacing).toBeTruthy();
});

Then('the cards should have colored borders \\(blue for GTO, orange for GDS, green for Total)', async function() {
    const hasCorrectBorders = await this.page.evaluate(() => {
        const gtoCard = document.querySelector('.gto-card');
        const gdsCard = document.querySelector('.gds-card');
        const totalCard = document.querySelector('.total-card');
        
        if (!gtoCard || !gdsCard || !totalCard) return false;
        
        const gtoStyles = window.getComputedStyle(gtoCard);
        const gdsStyles = window.getComputedStyle(gdsCard);
        const totalStyles = window.getComputedStyle(totalCard);
        
        // Check for colored borders (approximate RGB values)
        return gtoStyles.borderLeftColor.includes('33') && // Blue
               gdsStyles.borderLeftColor.includes('255') && // Orange
               totalStyles.borderLeftColor.includes('76'); // Green
    });
    expect(hasCorrectBorders).toBeTruthy();
});

// Share button positioning
Then('the Share button should be positioned in the vendor cost summary section', async function() {
    const shareButtonInSummary = await this.page.evaluate(() => {
        return document.querySelector('.vendor-cost-summary .btn-share') !== null;
    });
    expect(shareButtonInSummary).toBeTruthy();
});

Then('not in the individual KPI cards', async function() {
    const shareButtonInCards = await this.page.evaluate(() => {
        return document.querySelector('.kpi-card .btn-share') === null;
    });
    expect(shareButtonInCards).toBeTruthy();
});