const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

/**
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * 
 * 1. TUTTA la business logic va in Actions (src/renderer/react/actions/ConfigManagerNotAvailableCausingCalculationsPageEmptyActions.ts)
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

// Auto-generated step definitions for config-manager-not-available-causing-calculations-page-empty
// DEVE seguire il pattern State/Actions SEMPRE

// Removed duplicate step definition - using the one from projects-steps.js

When('I perform an action on config-manager-not-available-causing-calculations-page-empty', async function() {
    // PATTERN CORRETTO: Usa Actions class, NON manipolare direttamente
    await this.page.evaluate(() => {
        // Istanzia Actions class
        const actions = new ConfigManagerNotAvailableCausingCalculationsPageEmptyActions();
        // Chiama metodo dell'Actions (che aggiorna lo store)
        actions.performAction(data);
    });
    
    // MAI FARE:
    // - Manipolazione diretta dello state
    // - Business logic nel test
    // - Chiamate dirette allo store senza Actions
});

When('I save config-manager-not-available-causing-calculations-page-empty data', async function() {
    // SEMPRE attraverso Actions
    await this.page.evaluate(() => {
        const actions = new ConfigManagerNotAvailableCausingCalculationsPageEmptyActions();
        actions.save(formData); // Actions gestisce validazione e store update
    });
});

Then('the config-manager-not-available-causing-calculations-page-empty state should be updated', async function() {
    // Verifica state attraverso store (read-only)
    const state = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().config-manager-not-available-causing-calculations-page-emptyState;
    });
    expect(state).toBeDefined();
});

Then('the UI should reflect the config-manager-not-available-causing-calculations-page-empty changes', async function() {
    // Verifica che il component React si sia aggiornato
    // (il component usa useStore hook per leggere state)
    const uiState = await this.page.locator('[data-testid="config-manager-not-available-causing-calculations-page-empty-display"]').textContent();
    expect(uiState).toContain('expected value');
});

// RICORDA:
// - Actions class: src/renderer/react/actions/ConfigManagerNotAvailableCausingCalculationsPageEmptyActions.ts
// - Store state: src/renderer/js/store/app-store.js
// - Component: src/renderer/react/components/ConfigManagerNotAvailableCausingCalculationsPageEmpty.tsx (solo UI)
// - Hook: useStore per connettere component allo store
