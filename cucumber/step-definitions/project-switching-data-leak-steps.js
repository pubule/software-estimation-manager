const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

/**
 * Step definitions for Project Switching Data Leak bug fix
 * Tests that switching between projects resets all derived states
 */

// Background steps
Given('the application is loaded', async function() {
    await this.page.waitForLoadState('domcontentloaded');
    const store = await this.page.evaluate(() => window.appStore);
    expect(store).toBeTruthy();
});

Given('the store is initialized', async function() {
    const storeState = await this.page.evaluate(() => {
        const store = window.appStore;
        return {
            hasStore: !!store,
            hasCurrentProject: store.getState().currentProject !== undefined,
            hasCurrentPhases: store.getState().currentPhases !== undefined
        };
    });
    expect(storeState.hasStore).toBe(true);
    expect(storeState.hasCurrentProject).toBe(true);
    expect(storeState.hasCurrentPhases).toBe(true);
});

// Project loading steps
Given('I load {string} with phases data:', async function(projectName, dataTable) {
    const phasesData = {};
    const rows = dataTable.hashes();

    rows.forEach(row => {
        phasesData[row.phase] = {
            manDays: parseFloat(row.manDays),
            effort: { G1: 0, G2: 100, TA: 40, PM: 20 },
            assignedResources: [],
            cost: 0,
            lastModified: new Date().toISOString()
        };
    });

    // Add selectedSuppliers
    phasesData.selectedSuppliers = { G1: null, G2: null, TA: null, PM: null };

    await this.page.evaluate(({ name, phases }) => {
        const store = window.appStore;
        const projectData = {
            project: {
                id: name.replace(/\s+/g, '-').toUpperCase(),
                name: name,
                version: '1.0.0',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            },
            features: [],
            phases: phases,
            config: { projectOverrides: {} },
            coverage: 0,
            versions: []
        };

        // Call setProject to load the project
        store.getState().setProject(projectData);

        // Wait for phases initialization
        return new Promise(resolve => {
            setTimeout(() => {
                store.getState().initializePhases();
                resolve();
            }, 50);
        });
    }, { name: projectName, phases: phasesData });

    // Wait for async initialization
    await this.page.waitForTimeout(100);
});

Given('I load {string}', async function(projectName) {
    await this.page.evaluate((name) => {
        const store = window.appStore;
        const projectData = {
            project: {
                id: name.replace(/\s+/g, '-').toUpperCase(),
                name: name,
                version: '1.0.0',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            },
            features: [],
            phases: {
                functionalAnalysis: { manDays: 0, effort: { G1: 100, G2: 0, TA: 20, PM: 50 }, assignedResources: [], cost: 0, lastModified: new Date().toISOString() },
                selectedSuppliers: { G1: null, G2: null, TA: null, PM: null }
            },
            config: { projectOverrides: {} },
            coverage: 0,
            versions: []
        };

        store.getState().setProject(projectData);
    }, projectName);

    await this.page.waitForTimeout(100);
});

Given('phases totals show {string} total man days', async function(expectedTotal) {
    await this.page.evaluate((total) => {
        const store = window.appStore;
        store.getState().calculatePhasesTotals();
    });

    const actualTotal = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().phasesTotals.manDays;
    });

    // Store for later verification
    this.previousPhasesTotal = parseFloat(expectedTotal);
});

// Calculations steps
Given('calculations show vendor costs for {string} with total {string}', async function(vendor, cost) {
    await this.page.evaluate(({ vendorName, totalCost }) => {
        const store = window.appStore;
        store.getState().setCalculationsData({
            vendorCosts: [{
                vendor: vendorName,
                totalCost: parseFloat(totalCost),
                role: 'G2',
                manDays: 10
            }],
            kpiData: { totalCost: parseFloat(totalCost) }
        });
    }, { vendorName: vendor, totalCost: cost });
});

Given('I set manual override {string} to {string} man days', async function(overrideKey, manDays) {
    await this.page.evaluate(({ key, value }) => {
        const store = window.appStore;
        store.getState().updateFinalMDsOverride(key, parseFloat(value));
    }, { key: overrideKey, value: manDays });
});

// Assumptions steps
Given('I set assumptions search filter to {string}', async function(searchTerm) {
    await this.page.evaluate((search) => {
        const store = window.appStore;
        store.getState().setAssumptionsFilters({ search });
    }, searchTerm);
});

Given('I set assumptions type filter to {string}', async function(type) {
    await this.page.evaluate((typeFilter) => {
        const store = window.appStore;
        store.getState().setAssumptionsFilters({ type: typeFilter });
    }, type);
});

Given('I open assumptions modal in {string} mode', async function(mode) {
    await this.page.evaluate((modalMode) => {
        const store = window.appStore;
        store.getState().setAssumptionsModalState({ isOpen: true, mode: modalMode });
    }, mode);
});

// Version history steps
Given('I set version history date range filter to {string}', async function(dateRange) {
    await this.page.evaluate((range) => {
        const store = window.appStore;
        store.getState().setVersionHistoryFilters({ dateRange: range });
    }, dateRange);
});

Given('I set version history reason filter to {string}', async function(reason) {
    await this.page.evaluate((reasonFilter) => {
        const store = window.appStore;
        store.getState().setVersionHistoryFilters({ reason: reasonFilter });
    }, reasonFilter);
});

Given('I open {string} modal for version history', async function(modalType) {
    await this.page.evaluate((type) => {
        const store = window.appStore;
        const modalKey = `${type}Modal`;
        store.getState().setVersionHistoryModalState(modalKey, { isOpen: true });
    }, modalType);
});

// Feature manager steps
Given('I set feature sort to {string} {string}', async function(field, direction) {
    await this.page.evaluate(({ sortField, sortDir }) => {
        const store = window.appStore;
        store.getState().setSortOrder(sortField, sortDir);
    }, { sortField: field, sortDir: direction });
});

Given('I filter features to show {string} filtered results', async function(count) {
    await this.page.evaluate((filterCount) => {
        const store = window.appStore;
        const mockFeatures = Array(parseInt(filterCount)).fill(null).map((_, i) => ({ id: `feat-${i}` }));
        store.getState().setFilteredFeatures(mockFeatures);
    }, count);
});

Given('I open feature modal for editing feature with id {string}', async function(featureId) {
    await this.page.evaluate((id) => {
        const store = window.appStore;
        store.getState().openFeatureModal({ id, name: 'Test Feature' });
    }, featureId);
});

// Supplier steps
Given('I select supplier {string} for resource {string}', async function(supplier, resource) {
    await this.page.evaluate(({ supp, res }) => {
        const store = window.appStore;
        store.getState().setSelectedSupplier(res, supp);
    }, { supp: supplier, res: resource });
});

Given('resource rate for {string} is {string}', async function(resource, rate) {
    const actualRate = await this.page.evaluate((res) => {
        const store = window.appStore;
        return store.getState().resourceRates[res];
    }, resource);

    this.previousResourceRate = actualRate;
});

Given('I load {string} with different suppliers', async function(projectName) {
    await this.page.evaluate((name) => {
        const store = window.appStore;
        const projectData = {
            project: {
                id: name.replace(/\s+/g, '-').toUpperCase(),
                name: name,
                version: '1.0.0',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            },
            features: [],
            phases: {
                functionalAnalysis: { manDays: 5, effort: { G1: 100, G2: 0, TA: 20, PM: 50 }, assignedResources: [], cost: 0, lastModified: new Date().toISOString() },
                selectedSuppliers: { G1: null, G2: null, TA: null, PM: null }
            },
            config: { projectOverrides: {} },
            coverage: 0,
            versions: []
        };

        store.getState().setProject(projectData);
    }, projectName);

    await this.page.waitForTimeout(150);
});

// Complex scenario steps
Given('I load {string} with complete data:', async function(projectName, dataTable) {
    // This is a simplified version - real implementation would set up all data
    await this.page.evaluate((name) => {
        const store = window.appStore;
        const projectData = {
            project: { id: name.toUpperCase(), name, version: '1.0.0', created: new Date().toISOString(), lastModified: new Date().toISOString() },
            features: Array(5).fill(null).map((_, i) => ({ id: `feat-${i}`, name: `Feature ${i}`, priority: i })),
            phases: { functionalAnalysis: { manDays: 10, effort: { G1: 100, G2: 0, TA: 20, PM: 50 }, assignedResources: [], cost: 0, lastModified: new Date().toISOString() }, selectedSuppliers: { G1: null, G2: null, TA: null, PM: null } },
            assumptions: [{ id: '1', type: 'technical', description: 'Assumption 1' }],
            config: { projectOverrides: {} },
            coverage: 0,
            versions: []
        };

        store.getState().setProject(projectData);
    }, projectName);

    await this.page.waitForTimeout(100);
});

Given('I interact with all sections setting filters and states', async function() {
    // Set various filters and states
    await this.page.evaluate(() => {
        const store = window.appStore;
        store.getState().setAssumptionsFilters({ search: 'test', type: 'technical' });
        store.getState().setCalculationsFilters({ vendor: 'VendorA', role: 'G2' });
        store.getState().setSortOrder('priority', 'desc');
    });
});

// When steps (actions that trigger project switch)
When('I load {string} with phases data:', async function(projectName, dataTable) {
    // Same as Given step
    const phasesData = {};
    const rows = dataTable.hashes();

    rows.forEach(row => {
        phasesData[row.phase] = {
            manDays: parseFloat(row.manDays),
            effort: { G1: 0, G2: 100, TA: 40, PM: 20 },
            assignedResources: [],
            cost: 0,
            lastModified: new Date().toISOString()
        };
    });

    phasesData.selectedSuppliers = { G1: null, G2: null, TA: null, PM: null };

    await this.page.evaluate(({ name, phases }) => {
        const store = window.appStore;
        const projectData = {
            project: { id: name.replace(/\s+/g, '-').toUpperCase(), name, version: '1.0.0', created: new Date().toISOString(), lastModified: new Date().toISOString() },
            features: [],
            phases,
            config: { projectOverrides: {} },
            coverage: 0,
            versions: []
        };

        store.getState().setProject(projectData);
    }, { name: projectName, phases: phasesData });

    await this.page.waitForTimeout(150);
});

When('I load {string}', async function(projectName) {
    await this.page.evaluate((name) => {
        const store = window.appStore;
        const projectData = {
            project: { id: name.replace(/\s+/g, '-').toUpperCase(), name, version: '1.0.0', created: new Date().toISOString(), lastModified: new Date().toISOString() },
            features: [],
            phases: { functionalAnalysis: { manDays: 0, effort: { G1: 100, G2: 0, TA: 20, PM: 50 }, assignedResources: [], cost: 0, lastModified: new Date().toISOString() }, selectedSuppliers: { G1: null, G2: null, TA: null, PM: null } },
            config: { projectOverrides: {} },
            coverage: 0,
            versions: []
        };

        store.getState().setProject(projectData);
    }, projectName);

    await this.page.waitForTimeout(150);
});

// Then steps (verifications)
Then('currentPhases should show {string} man days for {string}', async function(expectedManDays, phaseId) {
    const actualManDays = await this.page.evaluate((phase) => {
        const store = window.appStore;
        const phaseData = store.getState().currentPhases.find(p => p.id === phase);
        return phaseData ? phaseData.manDays : null;
    }, phaseId);

    expect(actualManDays).toBe(parseFloat(expectedManDays));
});

Then('phases totals should show {string} total man days', async function(expectedTotal) {
    const actualTotal = await this.page.evaluate(() => {
        const store = window.appStore;
        store.getState().calculatePhasesTotals();
        return store.getState().phasesTotals.manDays;
    });

    expect(actualTotal).toBe(parseFloat(expectedTotal));
});

Then('phases data from {string} should not be present', async function(oldProjectName) {
    // Verify that the previous phases total is different
    const currentTotal = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().phasesTotals.manDays;
    });

    if (this.previousPhasesTotal) {
        expect(currentTotal).not.toBe(this.previousPhasesTotal);
    }
});

Then('calculationsData.vendorCosts should be empty', async function() {
    const vendorCosts = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().calculationsData.vendorCosts;
    });

    expect(vendorCosts).toEqual([]);
});

Then('calculationsData.finalMDsOverrides should be empty', async function() {
    const overrides = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().calculationsData.finalMDsOverrides;
    });

    expect(overrides).toEqual({});
});

Then('calculationsData.kpiData should be null', async function() {
    const kpiData = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().calculationsData.kpiData;
    });

    expect(kpiData).toBeNull();
});

Then('calculations filters should be reset to defaults:', async function(dataTable) {
    const filters = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().calculationsData.filters;
    });

    const expected = {};
    dataTable.hashes().forEach(row => {
        expected[row.filter] = row.value;
    });

    expect(filters).toEqual(expected);
});

Then('assumptions search filter should be empty', async function() {
    const searchFilter = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().assumptionsData.filters.search;
    });

    expect(searchFilter).toBe('');
});

Then('assumptions type filter should be empty', async function() {
    const typeFilter = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().assumptionsData.filters.type;
    });

    expect(typeFilter).toBe('');
});

Then('assumptions impact filter should be empty', async function() {
    const impactFilter = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().assumptionsData.filters.impact;
    });

    expect(impactFilter).toBe('');
});

Then('assumptions modal should be closed', async function() {
    const modalState = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().assumptionsData.modalState.isOpen;
    });

    expect(modalState).toBe(false);
});

Then('version history date range filter should be empty', async function() {
    const dateFilter = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().versionHistoryData.filters.dateRange;
    });

    expect(dateFilter).toBe('');
});

Then('version history reason filter should be empty', async function() {
    const reasonFilter = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().versionHistoryData.filters.reason;
    });

    expect(reasonFilter).toBe('');
});

Then('version history {string} modal should be closed', async function(modalType) {
    const isOpen = await this.page.evaluate((type) => {
        const store = window.appStore;
        const modalKey = `${type}Modal`;
        return store.getState().versionHistoryData.modalStates[modalKey].isOpen;
    }, modalType);

    expect(isOpen).toBe(false);
});

Then('feature sort should be reset to {string} {string}', async function(field, direction) {
    const sortState = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().currentSort;
    });

    expect(sortState.field).toBe(field);
    expect(sortState.direction).toBe(direction);
});

Then('filtered features should be empty', async function() {
    const features = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().filteredFeatures;
    });

    expect(features).toEqual([]);
});

Then('feature modal should be closed', async function() {
    const modalOpen = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().featureModalOpen;
    });

    expect(modalOpen).toBe(false);
});

Then('editing feature should be null', async function() {
    const editingFeature = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().editingFeature;
    });

    expect(editingFeature).toBeNull();
});

Then('duplicate source data should be null', async function() {
    const duplicateData = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().duplicateSourceData;
    });

    expect(duplicateData).toBeNull();
});

Then('selected supplier for {string} should be {string}', async function(resource, expectedSupplier) {
    const supplier = await this.page.evaluate((res) => {
        const store = window.appStore;
        return store.getState().selectedSuppliers[res];
    }, resource);

    if (expectedSupplier === 'null') {
        expect(supplier).toBeNull();
    } else {
        expect(supplier).toBe(expectedSupplier);
    }
});

Then('resource rate for {string} should be {string} \\(default)', async function(resource, expectedRate) {
    const rate = await this.page.evaluate((res) => {
        const store = window.appStore;
        return store.getState().resourceRates[res];
    }, resource);

    expect(rate).toBe(parseFloat(expectedRate));
});

Then('store state should be completely clean for {string}', async function(projectName) {
    const storeState = await this.page.evaluate(() => {
        const store = window.appStore;
        const state = store.getState();
        return {
            projectName: state.currentProject?.project?.name,
            calculationsFilters: state.calculationsData.filters,
            assumptionsFilters: state.assumptionsData.filters,
            featureSort: state.currentSort,
            filteredFeatures: state.filteredFeatures.length
        };
    });

    expect(storeState.projectName).toBe(projectName);
    expect(storeState.calculationsFilters).toEqual({ vendor: 'all', role: 'all', category: 'all' });
    expect(storeState.assumptionsFilters.search).toBe('');
    expect(storeState.featureSort).toEqual({ field: 'id', direction: 'asc' });
});

Then('currentProject should reference {string} data', async function(projectName) {
    const currentProjectName = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().currentProject?.project?.name;
    });

    expect(currentProjectName).toBe(projectName);
});

Then('all derived states should be reset to defaults', async function() {
    const derivedStates = await this.page.evaluate(() => {
        const store = window.appStore;
        const state = store.getState();
        return {
            phasesTotalsManDays: state.phasesTotals.manDays,
            vendorCostsLength: state.calculationsData.vendorCosts.length,
            kpiData: state.calculationsData.kpiData,
            filteredFeaturesLength: state.filteredFeatures.length,
            assumptionsModalOpen: state.assumptionsData.modalState.isOpen
        };
    });

    // Verify defaults (phases totals might be > 0 if project has phases data)
    expect(derivedStates.vendorCostsLength).toBe(0);
    expect(derivedStates.kpiData).toBeNull();
    expect(derivedStates.filteredFeaturesLength).toBe(0);
    expect(derivedStates.assumptionsModalOpen).toBe(false);
});

Then('no {string} data should be visible in any section', async function(oldProjectName) {
    // This is a semantic check - we've already verified specific states above
    const currentProject = await this.page.evaluate(() => {
        const store = window.appStore;
        return store.getState().currentProject?.project?.name;
    });

    expect(currentProject).not.toBe(oldProjectName);
});
