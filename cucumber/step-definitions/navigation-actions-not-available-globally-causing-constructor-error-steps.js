const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

/**
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * 
 * 1. TUTTA la business logic va in Actions (src/renderer/react/actions/NavigationActionsNotAvailableGloballyCausingConstructorErrorActions.ts)
 * 2. Lo state va SOLO in app-store.js (Zustand)
 * 3. I componenti React sono SOLO presentazione
 * 4. MAI logica nei componenti, MAI state locale per dati business
 * 
 * Flusso corretto:
 * User Action → Component → Actions Class → Store → State Update → Re-render
 * 
 * 
 * ⚠️ BUG FIX: Questi test descrivono il comportamento CORRETTO
 * - NON replicano il bug
 * - Descrivono come l'app DOVREBBE funzionare
 * - Test fallisce perché bug esiste → Fix implementato → Test passa
 * 
 */

// Auto-generated step definitions for navigation-actions-not-available-globally-causing-constructor-error
// DEVE seguire il pattern State/Actions SEMPRE

// Test specific to NavigationActions global availability
Given('I have NavigationActions available globally', async function() {
    // Verify NavigationActions is available globally (CORE BUG FIX VERIFICATION)
    const hasNavigationActions = await this.page.evaluate(() => {
        return window.NavigationActions !== undefined;
    });
    expect(hasNavigationActions).toBeTruthy();
    
    // Verify we can instantiate it without errors
    const canInstantiate = await this.page.evaluate(() => {
        try {
            const instance = new window.NavigationActions();
            return instance !== null;
        } catch (error) {
            console.error('NavigationActions instantiation failed:', error);
            return false;
        }
    });
    expect(canInstantiate).toBeTruthy();
    
    // Create a test project for navigation testing
    await this.page.evaluate(() => {
        const store = window.appStore;
        const state = store.getState();
        
        // Create test project
        const testProject = {
            id: 'nav-test-project',
            name: 'Navigation Test Project',
            code: 'NAV-001',
            phases: [
                { name: 'Analysis', supplierType: 'internal', resourceName: 'Analyst', effortMDs: 10 }
            ],
            features: [
                { name: 'Login', complexity: 'medium', featureType: 'functional' }
            ]
        };
        
        state.setProject(testProject);
    });
});

When('I perform the standard navigation actions not available globally causing constructor error actions', async function() {
    // Test the ACTUAL navigation functionality that was broken
    await this.page.evaluate(() => {
        // This should work now that NavigationActions is globally available
        const navigationActions = new window.NavigationActions();
        navigationActions.navigateToCalculations();
    });
    
    // Wait for navigation to complete
    await this.page.waitForTimeout(500);
});

When('I save navigation-actions-not-available-globally-causing-constructor-error data', async function() {
    // SEMPRE attraverso Actions
    await this.page.evaluate(() => {
        const actions = new NavigationActionsNotAvailableGloballyCausingConstructorErrorActions();
        actions.save(formData); // Actions gestisce validazione e store update
    });
});

Then('the system should respond correctly', async function() {
    // Verify navigation to calculations worked without errors
    const currentPage = await this.page.evaluate(() => {
        return document.querySelector('.calculations-page') !== null;
    });
    expect(currentPage).toBeTruthy();
});

Then('the expected result should be displayed', async function() {
    // Verify calculations page is visible and functional
    const isVisible = await this.page.locator('.calculations-page').isVisible();
    expect(isVisible).toBeTruthy();
});

// RICORDA:
// - Actions class: src/renderer/react/actions/NavigationActionsNotAvailableGloballyCausingConstructorErrorActions.ts
// - Store state: src/renderer/js/store/app-store.js
// - Component: src/renderer/react/components/NavigationActionsNotAvailableGloballyCausingConstructorError.tsx (solo UI)
// - Hook: useStore per connettere component allo store
