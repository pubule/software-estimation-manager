const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

/**
 * Step definitions for feature display names bug fix
 * 
 * PATTERN OBBLIGATORIO: State/Actions/Dispatcher
 * - Business logic in FeatureActions
 * - State in app-store.js
 * - Components solo presentazione
 */

// Using existing step definition from projects-steps.js
// Given('the application is loaded') is already defined

Given('I have a project with configured categories and feature types', async function() {
    // Setup a project with configuration
    await this.page.evaluate(() => {
        const store = window.appStore;
        const state = store.getState();
        
        // Create test project with configuration
        const testProject = {
            project: {
                name: 'Test Project',
                id: 'test-project-1'
            },
            configuration: {
                categories: [
                    {
                        id: 'cat-fe',
                        name: 'Frontend',
                        featureTypes: [
                            { id: 'ft-1', name: 'Nuova Funzionalità' },
                            { id: 'ft-2', name: 'Bug Fix' }
                        ]
                    },
                    {
                        id: 'cat-be', 
                        name: 'Backend',
                        featureTypes: [
                            { id: 'ft-3', name: 'API Development' },
                            { id: 'ft-4', name: 'Database Schema' }
                        ]
                    }
                ]
            },
            features: []
        };
        
        state.setCurrentProject(testProject);
    });
});

Given('I have categories configured as:', async function(dataTable) {
    const categories = dataTable.hashes();
    
    await this.page.evaluate((cats) => {
        const store = window.appStore;
        const state = store.getState();
        const currentProject = state.currentProject;
        
        if (currentProject) {
            currentProject.configuration.categories = cats.map(cat => ({
                id: cat.id,
                name: cat.name,
                featureTypes: []
            }));
            state.setCurrentProject(currentProject);
        }
    }, categories);
});

Given('I have a category {string} with feature types:', async function(categoryId, dataTable) {
    const featureTypes = dataTable.hashes();
    
    await this.page.evaluate((catId, types) => {
        const store = window.appStore;
        const state = store.getState();
        const currentProject = state.currentProject;
        
        if (currentProject && currentProject.configuration) {
            const category = currentProject.configuration.categories.find(c => c.id === catId);
            if (category) {
                category.featureTypes = types;
            }
            state.setCurrentProject(currentProject);
        }
    }, categoryId, featureTypes);
});

Given('I have features with these categories', async function() {
    await this.page.evaluate(() => {
        const store = window.appStore;
        const state = store.getState();
        const currentProject = state.currentProject;
        
        if (currentProject) {
            // Add test features with the configured categories
            const features = [
                {
                    id: 'feat-1',
                    description: 'Test Feature 1',
                    category: 'cat-fe',
                    featureType: 'ft-1',
                    realManDays: 5,
                    manDays: 6
                },
                {
                    id: 'feat-2',
                    description: 'Test Feature 2',
                    category: 'cat-be',
                    featureType: 'ft-3',
                    realManDays: 10,
                    manDays: 12
                }
            ];
            
            features.forEach(feature => {
                state.addProjectFeature(feature);
            });
        }
    });
});

Given('I have features with these feature types', async function() {
    await this.page.evaluate(() => {
        const store = window.appStore;
        const state = store.getState();
        const currentProject = state.currentProject;
        
        if (currentProject) {
            // Add test features with specific feature types
            const features = [
                {
                    id: 'feat-3',
                    description: 'New Feature',
                    category: 'cat-fe',
                    featureType: 'ft-1',
                    realManDays: 8,
                    manDays: 10
                },
                {
                    id: 'feat-4',
                    description: 'Bug Fix Feature',
                    category: 'cat-fe',
                    featureType: 'ft-2',
                    realManDays: 3,
                    manDays: 4
                }
            ];
            
            features.forEach(feature => {
                state.addProjectFeature(feature);
            });
        }
    });
});

Given('I have a feature with an invalid category ID', async function() {
    await this.page.evaluate(() => {
        const store = window.appStore;
        const state = store.getState();
        
        // Add a feature with non-existent category ID
        const feature = {
            id: 'feat-invalid',
            description: 'Feature with invalid category',
            category: 'non-existent-cat',
            featureType: 'non-existent-type',
            realManDays: 5,
            manDays: 6
        };
        
        state.addProjectFeature(feature);
    });
});

When('I view the features table', async function() {
    // Navigate to features section
    await this.page.click('[data-section="features"]');
    
    // Wait for table to be visible
    await this.page.waitForSelector('.feature-table', { state: 'visible' });
});

Then('I should see {string} instead of {string}', async function(expectedName, id) {
    // Check that the table contains the name, not the ID
    const tableContent = await this.page.locator('.feature-table').textContent();
    
    expect(tableContent).toContain(expectedName);
    expect(tableContent).not.toContain(id);
});

Then('the system should display the ID as fallback', async function() {
    // Check that invalid IDs are displayed as-is
    const tableContent = await this.page.locator('.feature-table').textContent();
    
    expect(tableContent).toContain('non-existent-cat');
});

Then('no errors should occur', async function() {
    // Check console for errors
    const consoleErrors = await this.page.evaluate(() => {
        // This would be set by error handlers
        return window.lastError || null;
    });
    
    expect(consoleErrors).toBeNull();
});