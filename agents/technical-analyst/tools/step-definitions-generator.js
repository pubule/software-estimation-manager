/**
 * Step Definitions Generator
 * 
 * Generates Cucumber step definitions from Gherkin scenarios
 * and technical implementation analysis.
 */

class StepDefinitionsGenerator {
    constructor() {
        this.stepPatterns = this.initializeStepPatterns();
        this.pageObjectTemplates = this.initializePageObjectTemplates();
    }

    /**
     * Generate complete step definitions file from Cucumber features and technical analysis
     * @param {Object} analysisResults - Technical analysis results
     * @returns {String} Complete step definitions file content
     */
    generateStepDefinitions(analysisResults) {
        const {
            featureName,
            cucumberScenarios,
            technicalArchitecture,
            integrationPoints,
            mockRequirements,
            pageObjectDesign
        } = analysisResults;

        return this.buildStepDefinitionsFile({
            featureName,
            scenarios: cucumberScenarios,
            architecture: technicalArchitecture,
            integration: integrationPoints,
            mocks: mockRequirements,
            pageObjects: pageObjectDesign
        });
    }

    /**
     * Build complete step definitions file
     */
    buildStepDefinitionsFile(params) {
        const {featureName, scenarios, architecture, integration, mocks, pageObjects} = params;
        
        return `/**
 * Step Definitions: ${featureName}
 * 
 * Generated step definitions for ${featureName} feature.
 * Includes page objects, data setup, and integration test patterns.
 */

const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
${this.generateImports(params)}

${this.generatePageObjectInstantiation(pageObjects)}

${this.generateHooks(params)}

${this.generateGivenSteps(scenarios, architecture)}

${this.generateWhenSteps(scenarios, architecture)}

${this.generateThenSteps(scenarios, architecture)}

${this.generateHelperFunctions(params)}`;
    }

    /**
     * Generate imports for step definitions
     */
    generateImports(params) {
        const imports = [
            "const TestDataFactory = require('../support/test-data-factory');",
            "const TestDataManager = require('../support/test-data-manager');"
        ];

        if (params.pageObjects && params.pageObjects.length > 0) {
            params.pageObjects.forEach(pageObject => {
                imports.push(`const ${pageObject.className} = require('../page-objects/${pageObject.fileName}');`);
            });
        }

        if (params.integration && params.integration.length > 0) {
            imports.push("const IntegrationTestHelper = require('../support/integration-helper');");
        }

        return imports.join('\n');
    }

    /**
     * Generate page object instantiation
     */
    generatePageObjectInstantiation(pageObjects) {
        if (!pageObjects || pageObjects.length === 0) return '';

        return `
// Page Object Instances
let pageObjects = {};

Before(async function() {
    ${pageObjects.map(po => `pageObjects.${po.name} = new ${po.className}(this.page);`).join('\n    ')}
});`;
    }

    /**
     * Generate Before/After hooks
     */
    generateHooks(params) {
        return `
// Test Setup and Cleanup Hooks
Before(async function() {
    // Initialize test data manager
    this.testDataManager = new TestDataManager(this);
    
    // Setup feature-specific test environment
    ${this.generateFeatureSetup(params)}
});

After(async function() {
    // Cleanup test data
    if (this.testDataManager) {
        await this.testDataManager.cleanup();
    }
    
    // Feature-specific cleanup
    ${this.generateFeatureCleanup(params)}
});`;
    }

    /**
     * Generate Given steps for setup and preconditions
     */
    generateGivenSteps(scenarios, architecture) {
        const givenSteps = this.extractUniqueSteps(scenarios, 'Given');
        
        return `
// Given Steps - Setup and Preconditions
${givenSteps.map(step => this.generateGivenStep(step, architecture)).join('\n\n')}`;
    }

    /**
     * Generate individual Given step
     */
    generateGivenStep(step, architecture) {
        const pattern = this.matchStepPattern(step, 'given');
        
        if (pattern) {
            return pattern.generate(step, architecture);
        }
        
        // Generate custom step
        return `Given('${step.text}', async function() {
    // TODO: Implement setup for "${step.text}"
    ${this.generateStepImplementation(step, 'setup', architecture)}
});`;
    }

    /**
     * Generate When steps for actions
     */
    generateWhenSteps(scenarios, architecture) {
        const whenSteps = this.extractUniqueSteps(scenarios, 'When');
        
        return `
// When Steps - Actions and Interactions
${whenSteps.map(step => this.generateWhenStep(step, architecture)).join('\n\n')}`;
    }

    /**
     * Generate individual When step
     */
    generateWhenStep(step, architecture) {
        const pattern = this.matchStepPattern(step, 'when');
        
        if (pattern) {
            return pattern.generate(step, architecture);
        }
        
        // Generate custom step
        return `When('${step.text}', async function() {
    // TODO: Implement action for "${step.text}"
    ${this.generateStepImplementation(step, 'action', architecture)}
});`;
    }

    /**
     * Generate Then steps for verification
     */
    generateThenSteps(scenarios, architecture) {
        const thenSteps = this.extractUniqueSteps(scenarios, 'Then');
        
        return `
// Then Steps - Verification and Assertions
${thenSteps.map(step => this.generateThenStep(step, architecture)).join('\n\n')}`;
    }

    /**
     * Generate individual Then step
     */
    generateThenStep(step, architecture) {
        const pattern = this.matchStepPattern(step, 'then');
        
        if (pattern) {
            return pattern.generate(step, architecture);
        }
        
        // Generate custom step
        return `Then('${step.text}', async function() {
    // TODO: Implement verification for "${step.text}"
    ${this.generateStepImplementation(step, 'verification', architecture)}
});`;
    }

    /**
     * Generate helper functions
     */
    generateHelperFunctions(params) {
        return `
// Helper Functions
${this.generateDataHelpers(params)}
${this.generateUIHelpers(params)}
${this.generateIntegrationHelpers(params)}`;
    }

    /**
     * Extract unique steps from scenarios
     */
    extractUniqueSteps(scenarios, stepType) {
        const steps = new Set();
        
        scenarios.forEach(scenario => {
            if (scenario.steps) {
                scenario.steps
                    .filter(step => step.keyword.trim() === stepType)
                    .forEach(step => steps.add(JSON.stringify(step)));
            }
        });
        
        return Array.from(steps).map(step => JSON.parse(step));
    }

    /**
     * Match step to predefined patterns
     */
    matchStepPattern(step, stepType) {
        const patterns = this.stepPatterns[stepType] || [];
        
        return patterns.find(pattern => {
            return pattern.regex.test(step.text);
        });
    }

    /**
     * Generate step implementation based on context
     */
    generateStepImplementation(step, actionType, architecture) {
        switch (actionType) {
            case 'setup':
                return this.generateSetupImplementation(step, architecture);
            case 'action':
                return this.generateActionImplementation(step, architecture);
            case 'verification':
                return this.generateVerificationImplementation(step, architecture);
            default:
                return '// TODO: Implement step logic';
        }
    }

    /**
     * Generate setup implementation
     */
    generateSetupImplementation(step, architecture) {
        if (step.text.includes('project')) {
            return `// Setup project data
    const projectData = TestDataFactory.createProject();
    this.currentProject = await this.testDataManager.createTestProject(projectData);`;
        }
        
        if (step.text.includes('feature')) {
            return `// Setup feature data
    const featureData = TestDataFactory.createFeature();
    this.currentFeature = await this.testDataManager.createTestFeature(featureData);`;
        }
        
        return '// TODO: Implement setup logic';
    }

    /**
     * Generate action implementation
     */
    generateActionImplementation(step, architecture) {
        if (step.text.includes('click')) {
            const element = this.extractElementFromStep(step.text);
            return `// Click action
    await pageObjects.main.click('${element}');`;
        }
        
        if (step.text.includes('enter') || step.text.includes('type')) {
            return `// Input action
    const value = '${this.extractValueFromStep(step.text)}';
    const field = '${this.extractFieldFromStep(step.text)}';
    await pageObjects.main.type(field, value);`;
        }
        
        return '// TODO: Implement action logic';
    }

    /**
     * Generate verification implementation
     */
    generateVerificationImplementation(step, architecture) {
        if (step.text.includes('should see')) {
            const expectedText = this.extractExpectedTextFromStep(step.text);
            return `// Visibility verification
    const isVisible = await pageObjects.main.isVisible('${expectedText}');
    expect(isVisible).toBe(true);`;
        }
        
        if (step.text.includes('should contain')) {
            return `// Content verification
    const actualContent = await pageObjects.main.getText('.content');
    expect(actualContent).toContain('${this.extractExpectedContentFromStep(step.text)}');`;
        }
        
        return '// TODO: Implement verification logic';
    }

    /**
     * Generate data helper functions
     */
    generateDataHelpers(params) {
        return `
async function setupTestData(dataType, overrides = {}) {
    switch (dataType) {
        case 'project':
            return TestDataFactory.createProject(overrides);
        case 'feature':
            return TestDataFactory.createFeature(overrides);
        case 'configuration':
            return TestDataFactory.createConfiguration(overrides);
        default:
            throw new Error(\`Unknown data type: \${dataType}\`);
    }
}

async function cleanupTestData(world) {
    if (world.testDataManager) {
        await world.testDataManager.cleanup();
    }
}`;
    }

    /**
     * Generate UI helper functions
     */
    generateUIHelpers(params) {
        return `
async function waitForElementVisible(page, selector, timeout = 5000) {
    await page.waitForSelector(selector, { state: 'visible', timeout });
}

async function waitForElementHidden(page, selector, timeout = 5000) {
    await page.waitForSelector(selector, { state: 'hidden', timeout });
}

async function retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}`;
    }

    /**
     * Generate integration helper functions
     */
    generateIntegrationHelpers(params) {
        return `
async function validateIntegrationPoint(world, integrationName) {
    switch (integrationName) {
        case 'dataManager':
            return await world.dataManager.validate();
        case 'configManager':
            return await world.configManager.validate();
        default:
            return true;
    }
}

async function mockExternalDependency(dependencyName, mockBehavior) {
    // TODO: Implement mock setup for external dependencies
    console.log(\`Mocking \${dependencyName} with behavior \${mockBehavior}\`);
}`;
    }

    /**
     * Generate feature-specific setup
     */
    generateFeatureSetup(params) {
        return `// Initialize ${params.featureName} specific components
    // Setup mocks and test data
    // Configure integration points`;
    }

    /**
     * Generate feature-specific cleanup
     */
    generateFeatureCleanup(params) {
        return `// Cleanup ${params.featureName} specific resources
    // Reset mocks
    // Clear temporary data`;
    }

    /**
     * Helper methods for text extraction
     */
    extractElementFromStep(stepText) {
        const match = stepText.match(/click\s+"([^"]+)"/i);
        return match ? match[1] : 'button';
    }

    extractValueFromStep(stepText) {
        const match = stepText.match(/"([^"]+)"/);
        return match ? match[1] : 'test value';
    }

    extractFieldFromStep(stepText) {
        const match = stepText.match(/(?:in|into)\s+"([^"]+)"/i);
        return match ? match[1] : 'input';
    }

    extractExpectedTextFromStep(stepText) {
        const match = stepText.match(/see\s+"([^"]+)"/i);
        return match ? match[1] : 'text';
    }

    extractExpectedContentFromStep(stepText) {
        const match = stepText.match(/contain\s+"([^"]+)"/i);
        return match ? match[1] : 'content';
    }

    /**
     * Initialize predefined step patterns
     */
    initializeStepPatterns() {
        return {
            given: [
                {
                    regex: /the Software Estimation Manager application is running/i,
                    generate: () => `Given('the Software Estimation Manager application is running', async function() {
    // Application should already be running from hooks
    expect(this.page).toBeDefined();
    await this.page.waitForLoadState('networkidle');
});`
                },
                {
                    regex: /I have a project loaded/i,
                    generate: () => `Given('I have a project loaded', async function() {
    const projectData = TestDataFactory.createProject();
    this.currentProject = await this.testDataManager.createTestProject(projectData);
    await pageObjects.main.loadProject(this.currentProject.id);
});`
                }
            ],
            when: [
                {
                    regex: /I click "([^"]+)"/i,
                    generate: (step) => {
                        const buttonText = step.text.match(/"([^"]+)"/)[1];
                        return `When('I click "${buttonText}"', async function() {
    await pageObjects.main.click('[data-testid="${buttonText.toLowerCase().replace(/\s+/g, '-')}-btn"]');
});`;
                    }
                }
            ],
            then: [
                {
                    regex: /I should see "([^"]+)"/i,
                    generate: (step) => {
                        const expectedText = step.text.match(/"([^"]+)"/)[1];
                        return `Then('I should see "${expectedText}"', async function() {
    const isVisible = await pageObjects.main.isTextVisible('${expectedText}');
    expect(isVisible).toBe(true);
});`;
                    }
                }
            ]
        };
    }

    /**
     * Initialize page object templates
     */
    initializePageObjectTemplates() {
        return {
            main: {
                className: 'MainPage',
                fileName: 'main-page.js'
            },
            modal: {
                className: 'ModalPage',
                fileName: 'modal-page.js'
            }
        };
    }
}

module.exports = StepDefinitionsGenerator;