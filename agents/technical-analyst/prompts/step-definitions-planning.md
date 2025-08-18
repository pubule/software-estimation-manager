# Step Definitions Planning Template

## Cucumber Step Definitions Architecture

### File Organization Strategy
```
cucumber/step-definitions/
├── {feature-name}-steps.js          # Main step definitions for feature
├── shared/
│   ├── common-steps.js              # Reusable steps across features
│   ├── navigation-steps.js          # Navigation-related steps
│   └── data-setup-steps.js          # Data setup and teardown steps
└── page-objects/
    ├── {feature-name}-page.js       # Page object for feature
    └── shared/
        ├── modal-page.js            # Shared modal interactions
        └── navigation-page.js       # Shared navigation
```

### Step Definition Categories

#### 1. Given Steps (Setup and Preconditions)
```javascript
// Application State Setup
Given('the Software Estimation Manager application is running', async function() {
    // Initialize application state
});

Given('I have a project loaded with {string}', async function(projectType) {
    // Load specific project configuration
});

Given('the {string} system is initialized', async function(systemName) {
    // Initialize specific system/manager
});

// Data Prerequisites  
Given('I have {int} features configured', async function(featureCount) {
    // Setup test features
});

Given('the configuration is set to {string}', async function(configType) {
    // Configure system for test scenario
});

// User State Setup
Given('I am viewing the {string} section', async function(sectionName) {
    // Navigate to specific section
});

Given('I have appropriate permissions for {string}', async function(operation) {
    // Setup user permissions
});
```

#### 2. When Steps (Actions and Interactions)
```javascript
// UI Interactions
When('I click {string}', async function(buttonText) {
    // Click button or link
});

When('I enter {string} as {string}', async function(value, fieldName) {
    // Fill form field
});

When('I select {string} from {string}', async function(option, dropdownName) {
    // Select from dropdown
});

// Navigation Actions
When('I navigate to {string}', async function(destination) {
    // Navigate to section/page
});

When('I open the {string} modal', async function(modalType) {
    // Open specific modal
});

// Data Operations
When('I save the current data', async function() {
    // Trigger save operation
});

When('I export data as {string}', async function(format) {
    // Trigger export operation
});

// Business Operations
When('I create a new {string}', async function(entityType) {
    // Create new business entity
});

When('I update {string} with {string}', async function(entity, changes) {
    // Update existing entity
});
```

#### 3. Then Steps (Verification and Assertions)
```javascript
// UI State Verification
Then('I should see {string}', async function(expectedText) {
    // Verify text is visible
});

Then('the {string} field should contain {string}', async function(fieldName, expectedValue) {
    // Verify field value
});

Then('the {string} should be {string}', async function(element, state) {
    // Verify element state (enabled/disabled/visible/hidden)
});

// Data Verification
Then('the project should contain {int} features', async function(expectedCount) {
    // Verify data count
});

Then('the calculations should show {string}', async function(expectedResult) {
    // Verify calculation results
});

// System State Verification
Then('the system should be in {string} state', async function(expectedState) {
    // Verify system state
});

Then('no errors should be displayed', async function() {
    // Verify error-free state
});

// Business Logic Verification
Then('the {string} should be updated correctly', async function(entityType) {
    // Verify business logic execution
});
```

## Page Object Design Patterns

### Base Page Object Structure
```javascript
class BasePage {
    constructor(page) {
        this.page = page;
    }
    
    async waitForElement(selector, timeout = 5000) {
        return await this.page.waitForSelector(selector, { timeout });
    }
    
    async click(selector) {
        await this.waitForElement(selector);
        return await this.page.click(selector);
    }
    
    async type(selector, text) {
        await this.waitForElement(selector);
        await this.page.fill(selector, '');
        return await this.page.type(selector, text);
    }
    
    async getText(selector) {
        await this.waitForElement(selector);
        return await this.page.textContent(selector);
    }
    
    async isVisible(selector) {
        try {
            await this.waitForElement(selector, 1000);
            return true;
        } catch {
            return false;
        }
    }
}
```

### Feature-Specific Page Object
```javascript
class FeatureManagementPage extends BasePage {
    constructor(page) {
        super(page);
        this.selectors = {
            addFeatureButton: '[data-testid="add-feature-btn"]',
            featureNameInput: '[data-testid="feature-name-input"]',
            complexitySelect: '[data-testid="complexity-select"]',
            saveButton: '[data-testid="save-feature-btn"]',
            featuresList: '[data-testid="features-list"]',
            deleteButton: '[data-testid="delete-feature-btn"]'
        };
    }
    
    async addNewFeature(featureData) {
        await this.click(this.selectors.addFeatureButton);
        await this.type(this.selectors.featureNameInput, featureData.name);
        await this.selectComplexity(featureData.complexity);
        await this.click(this.selectors.saveButton);
    }
    
    async selectComplexity(complexity) {
        await this.click(this.selectors.complexitySelect);
        await this.click(`[data-value="${complexity}"]`);
    }
    
    async getFeatureCount() {
        const features = await this.page.$$(`${this.selectors.featuresList} .feature-item`);
        return features.length;
    }
    
    async deleteFeature(featureName) {
        const featureRow = await this.page.$(`[data-testid="feature-${featureName}"]`);
        const deleteBtn = await featureRow.$(this.selectors.deleteButton);
        await deleteBtn.click();
    }
}
```

### Modal Page Object
```javascript
class ModalPage extends BasePage {
    constructor(page) {
        super(page);
        this.selectors = {
            modal: '.modal',
            modalTitle: '.modal-title',
            modalBody: '.modal-body',
            closeButton: '.modal-close',
            cancelButton: '.modal-cancel',
            confirmButton: '.modal-confirm'
        };
    }
    
    async waitForModalOpen(modalTitle) {
        await this.waitForElement(this.selectors.modal);
        await this.page.waitForFunction(
            (title) => document.querySelector('.modal-title')?.textContent?.includes(title),
            modalTitle
        );
    }
    
    async closeModal() {
        await this.click(this.selectors.closeButton);
        await this.page.waitForSelector(this.selectors.modal, { state: 'hidden' });
    }
    
    async confirmAction() {
        await this.click(this.selectors.confirmButton);
        await this.page.waitForSelector(this.selectors.modal, { state: 'hidden' });
    }
    
    async cancelAction() {
        await this.click(this.selectors.cancelButton);
        await this.page.waitForSelector(this.selectors.modal, { state: 'hidden' });
    }
}
```

## Test Data Management Strategy

### Test Data Factory
```javascript
class TestDataFactory {
    static createProject(overrides = {}) {
        return {
            name: 'Test Project',
            description: 'Test project for automation',
            status: 'pending',
            features: [],
            configuration: this.createConfiguration(),
            ...overrides
        };
    }
    
    static createFeature(overrides = {}) {
        return {
            name: 'Test Feature',
            description: 'Test feature for automation',
            complexity: 'Medium',
            supplier: 'Internal',
            effort: 10,
            ...overrides
        };
    }
    
    static createConfiguration(overrides = {}) {
        return {
            suppliers: this.createSuppliers(),
            categories: this.createCategories(),
            resources: this.createResources(),
            ...overrides
        };
    }
    
    static createSuppliers() {
        return [
            { id: 'internal', name: 'Internal Development', type: 'internal' },
            { id: 'external1', name: 'External Partner 1', type: 'external' }
        ];
    }
}
```

### Test Data Cleanup Strategy
```javascript
class TestDataManager {
    constructor(world) {
        this.world = world;
        this.createdData = [];
    }
    
    async createTestProject(projectData) {
        const project = await this.world.dataManager.createProject(projectData);
        this.createdData.push({ type: 'project', id: project.id });
        return project;
    }
    
    async createTestFeature(featureData) {
        const feature = await this.world.featureManager.createFeature(featureData);
        this.createdData.push({ type: 'feature', id: feature.id });
        return feature;
    }
    
    async cleanup() {
        for (const item of this.createdData.reverse()) {
            try {
                switch (item.type) {
                    case 'project':
                        await this.world.dataManager.deleteProject(item.id);
                        break;
                    case 'feature':
                        await this.world.featureManager.deleteFeature(item.id);
                        break;
                }
            } catch (error) {
                console.warn(`Failed to cleanup ${item.type} ${item.id}:`, error);
            }
        }
        this.createdData = [];
    }
}
```

## Mock Strategy for Step Definitions

### Electron API Mocking
```javascript
// Mock Electron APIs for consistent testing
const mockElectronAPI = {
    fileOperations: {
        saveFile: jest.fn().mockResolvedValue({ success: true }),
        loadFile: jest.fn().mockResolvedValue({ data: mockProjectData }),
        exportFile: jest.fn().mockResolvedValue({ path: '/mock/path/export.xlsx' })
    },
    dialog: {
        showSaveDialog: jest.fn().mockResolvedValue({ filePath: '/mock/path/save.json' }),
        showOpenDialog: jest.fn().mockResolvedValue({ filePaths: ['/mock/path/load.json'] })
    }
};
```

### Data Manager Mocking
```javascript
// Mock data persistence for reliable testing
const mockDataManager = {
    currentProject: null,
    
    async saveProject(project) {
        this.currentProject = { ...project };
        return { success: true };
    },
    
    async loadProject(path) {
        return this.currentProject || TestDataFactory.createProject();
    },
    
    async validateProject(project) {
        return { valid: true, errors: [] };
    }
};
```

## Integration Testing Patterns

### Manager Integration Testing
```javascript
// Test integration between managers
Then('the feature manager should update project calculations', async function() {
    const initialTotal = await this.projectManager.getTotalEffort();
    await this.featureManager.addFeature(TestDataFactory.createFeature());
    const updatedTotal = await this.projectManager.getTotalEffort();
    
    expect(updatedTotal).toBeGreaterThan(initialTotal);
});
```

### Configuration System Testing
```javascript
// Test hierarchical configuration inheritance
Given('I have global configuration with {string} set to {string}', async function(setting, value) {
    await this.configManager.setGlobalSetting(setting, value);
});

Then('the project should inherit the global {string} setting', async function(setting) {
    const projectValue = await this.configManager.getProjectSetting(setting);
    const globalValue = await this.configManager.getGlobalSetting(setting);
    
    expect(projectValue).toBe(globalValue);
});
```

## Error Handling Patterns

### Graceful Error Handling in Steps
```javascript
When('I attempt to save invalid data', async function() {
    try {
        await this.page.click('[data-testid="save-btn"]');
        this.lastError = null;
    } catch (error) {
        this.lastError = error;
    }
});

Then('I should see a validation error', async function() {
    const errorMessage = await this.page.textContent('.error-message');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage).toContain('validation');
});
```

### Retry Logic for Flaky Operations
```javascript
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

## Performance Testing Integration

### Performance Assertion Patterns
```javascript
Then('the operation should complete within {int} seconds', async function(maxSeconds) {
    const startTime = Date.now();
    await this.performOperation();
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(maxSeconds * 1000);
});

Then('the memory usage should remain stable', async function() {
    const memoryBefore = await this.getMemoryUsage();
    await this.performMemoryIntensiveOperation();
    await this.triggerGarbageCollection();
    const memoryAfter = await this.getMemoryUsage();
    
    const memoryIncrease = memoryAfter - memoryBefore;
    expect(memoryIncrease).toBeLessThan(ACCEPTABLE_MEMORY_INCREASE);
});
```

## Cross-Platform Testing Considerations

### Platform-Specific Step Variations
```javascript
When('I use the platform-specific save shortcut', async function() {
    const isMac = process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+S' : 'Control+S';
    await this.page.keyboard.press(shortcut);
});

Then('the file should be saved to the platform-appropriate location', async function() {
    const expectedPath = process.platform === 'win32' 
        ? 'C:\\Users\\...\\Documents' 
        : '/Users/.../Documents';
    
    const actualPath = await this.getLastSavePath();
    expect(actualPath).toContain(expectedPath);
});
```

## Step Definition Quality Guidelines

### Naming Conventions
- Use present tense for Given steps ("the system is initialized")
- Use present tense for When steps ("I click the button")  
- Use future/conditional tense for Then steps ("the result should be visible")

### Reusability Principles
- Create parameterized steps for similar operations
- Extract common patterns into shared step libraries
- Use page objects to encapsulate UI interactions
- Design steps to be composition-friendly

### Maintainability Guidelines
- Keep steps focused on single responsibilities
- Use descriptive variable names and comments
- Handle async operations properly with await
- Implement proper error handling and logging
- Include timeout handling for UI operations