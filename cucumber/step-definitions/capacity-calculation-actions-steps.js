const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

/**
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * 
 * 1. TUTTA la business logic va in Actions (src/renderer/react/actions/CapacityCalculationActionsActions.ts)
 * 2. Lo state va SOLO in app-store.js (Zustand)
 * 3. I componenti React sono SOLO presentazione
 * 4. MAI logica nei componenti, MAI state locale per dati business
 * 
 * Flusso corretto:
 * User Action → Component → Actions Class → Store → State Update → Re-render
 * 
 * 
 */

// Auto-generated step definitions for capacity-calculation-actions
// DEVE seguire il pattern State/Actions SEMPRE

Given('the application is loaded', async function() {
    // Verify app store is initialized (Zustand)
    const store = await this.page.evaluate(() => window.appStore);
    expect(store).toBeTruthy();
    
    // Verify Actions class is available
    const hasActions = await this.page.evaluate(() => {
        return window.CapacityCalculationActionsActions !== undefined;
    });
    // Se false, devi creare src/renderer/react/actions/CapacityCalculationActionsActions.ts
});

When('I perform an action on capacity-calculation-actions', async function() {
    // PATTERN CORRETTO: Usa Actions class, NON manipolare direttamente
    await this.page.evaluate(() => {
        // Istanzia Actions class
        const actions = new CapacityCalculationActionsActions();
        // Chiama metodo dell'Actions (che aggiorna lo store)
        actions.performAction(data);
    });
    
    // MAI FARE:
    // - Manipolazione diretta dello state
    // - Business logic nel test
    // - Chiamate dirette allo store senza Actions
});

When('I save capacity-calculation-actions data', async function() {
    // SEMPRE attraverso Actions
    await this.page.evaluate(() => {
        const actions = new CapacityCalculationActionsActions();
        actions.save(formData); // Actions gestisce validazione e store update
    });
});

Then('the capacity-calculation-actions state should be updated', async function() {
    // Verifica state attraverso store (read-only)
    const state = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().capacity-calculation-actionsState;
    });
    expect(state).toBeDefined();
});

Then('the UI should reflect the capacity-calculation-actions changes', async function() {
    // Verifica che il component React si sia aggiornato
    // (il component usa useStore hook per leggere state)
    const uiState = await this.page.locator('[data-testid="capacity-calculation-actions-display"]').textContent();
    expect(uiState).toContain('expected value');
});

// RICORDA:
// - Actions class: src/renderer/react/actions/CapacityCalculationActionsActions.ts
// - Store state: src/renderer/js/store/app-store.js
// - Component: src/renderer/react/components/CapacityCalculationActions.tsx (solo UI)
// - Hook: useStore per connettere component allo store
