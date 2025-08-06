/**
 * FeatureManager Behavioral Tests
 * 
 * Documents the current behavior of the FeatureManager class including:
 * - Feature CRUD operations and validation
 * - Real-time calculation behavior 
 * - Dropdown population and filtering logic
 * - Modal management and form handling
 * - Table rendering and interaction behaviors
 */

describe('FeatureManager - Behavioral Documentation', () => {
    let featureManager;
    let mockDataManager;
    let mockConfigManager;
    let mockApp;

    beforeEach(() => {
        // Setup DOM structure
        document.body.innerHTML = `
            <form id="feature-form">
                <input id="feature-id" type="text" />
                <input id="feature-description" type="text" />
                <select id="feature-category"></select>
                <select id="feature-type"></select>
                <select id="feature-supplier"></select>
                <input id="feature-real-man-days" type="number" />
                <input id="feature-expertise" type="number" value="100" />
                <input id="feature-risk-margin" type="number" value="10" />
                <input id="feature-calculated-man-days" type="number" readonly />
                <textarea id="feature-notes"></textarea>
            </form>
            <div id="feature-modal" class="modal">
                <button class="modal-close"></button>
                <h3 id="modal-title"></h3>
                <button id="cancel-feature-btn"></button>
                <button id="save-feature-btn"></button>
            </div>
            <input id="search-input" />
            <select id="category-filter"><option value="">All Categories</option></select>
            <select id="supplier-filter"><option value="">All Suppliers</option></select>
            <select id="feature-type-filter"><option value="">All Feature Types</option></select>
            <table class="features-table">
                <tbody id="features-tbody"></tbody>
            </table>
        `;

        // Mock managers
        mockDataManager = {};
        mockConfigManager = {
            getProjectConfig: jest.fn(() => ({
                categories: [
                    { 
                        id: 'cat1', 
                        name: 'Category 1',
                        featureTypes: [
                            { id: 'ft1', name: 'Feature Type 1', averageMDs: 5 }
                        ]
                    }
                ],
                suppliers: [
                    { id: 'sup1', name: 'Supplier 1', department: 'Dept A', role: 'G2', officialRate: 500 }
                ],
                internalResources: [
                    { id: 'int1', name: 'Internal 1', department: 'IT', role: 'G2', officialRate: 400 }
                ]
            })),
            validateCategory: jest.fn(() => true),
            validateSupplier: jest.fn(() => true),
            getCategoryDisplayName: jest.fn((config, id) => `Category-${id}`),
        };

        // Mock global app
        mockApp = {
            currentProject: {
                features: [],
                config: {}
            },
            markDirty: jest.fn(),
            saveProject: jest.fn().mockResolvedValue(true),
            updateSummary: jest.fn()
        };
        global.window = { 
            app: mockApp,
            NotificationManager: { show: jest.fn() }
        };

        featureManager = new FeatureManager(mockDataManager, mockConfigManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Real-time Calculation Behavior', () => {
        test('BEHAVIOR: Calculation formula uses specific order of operations', () => {
            const realManDaysInput = document.getElementById('feature-real-man-days');
            const expertiseInput = document.getElementById('feature-expertise');
            const riskMarginInput = document.getElementById('feature-risk-margin');
            const calculatedInput = document.getElementById('feature-calculated-man-days');

            // Set test values
            realManDaysInput.value = '10';
            expertiseInput.value = '80';
            riskMarginInput.value = '20';

            featureManager.updateCalculatedManDays();

            // Documents the calculation: 10 * (100 + 20) / 80 = 15.00
            expect(calculatedInput.value).toBe('15.00');
        });

        test('BEHAVIOR: Expertise of zero prevents division by zero', () => {
            const realManDaysInput = document.getElementById('feature-real-man-days');
            const expertiseInput = document.getElementById('feature-expertise');
            const riskMarginInput = document.getElementById('feature-risk-margin');
            const calculatedInput = document.getElementById('feature-calculated-man-days');

            realManDaysInput.value = '10';
            expertiseInput.value = '0'; // Zero expertise
            riskMarginInput.value = '10';

            featureManager.updateCalculatedManDays();

            // Documents zero protection behavior
            expect(calculatedInput.value).toBe('0.00');
        });

        test('BEHAVIOR: Calculation listeners are attached with element cloning to remove old listeners', () => {
            const realManDaysField = document.getElementById('feature-real-man-days');
            const originalField = realManDaysField;
            
            // Add a mock listener counter to track listener attachment
            let listenerCount = 0;
            const originalAddEventListener = realManDaysField.addEventListener;
            realManDaysField.addEventListener = function() {
                listenerCount++;
                return originalAddEventListener.apply(this, arguments);
            };

            featureManager.setupCalculationListeners();

            // Documents that the field is replaced (cloned) to remove old listeners
            const newField = document.getElementById('feature-real-man-days');
            expect(newField).not.toBe(originalField);
        });
    });

    describe('Modal Management Behavior', () => {
        test('BEHAVIOR: Add feature modal generates new ID with specific pattern', () => {
            mockApp.currentProject.features = [
                { id: 'BR-001' },
                { id: 'BR-003' } // Skip BR-002 to test counter logic
            ];

            featureManager.showAddFeatureModal();

            const idField = document.getElementById('feature-id');
            
            // Documents ID generation logic - finds next available number
            expect(idField.value).toBe('BR-004');
        });

        test('BEHAVIOR: Edit modal populates form data with specific field mappings', () => {
            const testFeature = {
                id: 'F1',
                description: 'Test Feature',
                category: 'cat1',
                featureType: 'ft1',
                supplier: 'sup1',
                realManDays: 10,
                expertise: 90,
                riskMargin: 15,
                manDays: 12.5,
                notes: 'Test notes'
            };

            featureManager.populateFeatureForm(testFeature);

            // Documents field mapping behavior
            expect(document.getElementById('feature-id').value).toBe('F1');
            expect(document.getElementById('feature-description').value).toBe('Test Feature');
            expect(document.getElementById('feature-category').value).toBe('cat1');
            expect(document.getElementById('feature-real-man-days').value).toBe('10');
            expect(document.getElementById('feature-expertise').value).toBe('90');
            expect(document.getElementById('feature-notes').value).toBe('Test notes');
        });

        test('BEHAVIOR: Modal closes with multiple event handlers (click outside, escape, buttons)', () => {
            const modal = document.getElementById('feature-modal');
            const mockClose = jest.fn();
            featureManager.closeFeatureModal = mockClose;

            // Test close button
            const closeBtn = document.querySelector('.modal-close');
            closeBtn.click();

            // Test cancel button  
            const cancelBtn = document.getElementById('cancel-feature-btn');
            cancelBtn.click();

            // Test escape key
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            modal.classList.add('active');
            document.dispatchEvent(escapeEvent);

            // Documents multiple close mechanisms
            expect(mockClose).toHaveBeenCalledTimes(3);
        });

        test('BEHAVIOR: Form reset enables all fields except calculated-man-days which stays readonly', () => {
            const calculatedField = document.getElementById('feature-calculated-man-days');
            const idField = document.getElementById('feature-id');
            
            // Set fields to disabled/readonly state
            idField.disabled = true;
            calculatedField.disabled = true;

            featureManager.resetFeatureForm();

            // Documents selective field enabling
            expect(idField.disabled).toBe(false);
            expect(calculatedField.getAttribute('readonly')).toBe(''); // Stays readonly
        });
    });

    describe('Dropdown Population Behavior', () => {
        test('BEHAVIOR: Category dropdown includes visual indicators for project-specific items', () => {
            mockConfigManager.getProjectConfig.mockReturnValue({
                categories: [
                    { id: 'cat1', name: 'Global Cat', status: 'active' },
                    { id: 'cat2', name: 'Project Cat', status: 'active', isProjectSpecific: true },
                    { id: 'cat3', name: 'Modified Cat', status: 'active', isOverridden: true },
                    { id: 'cat4', name: 'Inactive Cat', status: 'inactive' }
                ]
            });

            featureManager.populateCategoryDropdown([]);
            featureManager.populateModalDropdowns();

            const categorySelect = document.getElementById('feature-category');
            const options = Array.from(categorySelect.options);

            // Documents visual indicator behavior
            expect(options[1].textContent).toBe('Global Cat');
            expect(options[2].textContent).toBe('Project Cat (Project)');
            expect(options[3].textContent).toBe('Modified Cat (Modified)');
            expect(options).toHaveLength(4); // Inactive items are excluded
        });

        test('BEHAVIOR: Feature type dropdown is disabled until category is selected', () => {
            const categorySelect = document.getElementById('feature-category');
            const featureTypeSelect = document.getElementById('feature-type');

            featureManager.populateFeatureTypeDropdown(''); // Empty category ID

            expect(featureTypeSelect.disabled).toBe(true);
            expect(featureTypeSelect.innerHTML).toBe('<option value="">Select Feature Type</option>');
        });

        test('BEHAVIOR: Feature type change populates real man days with average value', () => {
            const categorySelect = document.getElementById('feature-category');
            const featureTypeSelect = document.getElementById('feature-type');
            const realManDaysField = document.getElementById('feature-real-man-days');

            // Setup category and populate feature types
            mockConfigManager.getProjectConfig.mockReturnValue({
                categories: [{
                    id: 'cat1',
                    name: 'Category 1',
                    featureTypes: [
                        { id: 'ft1', name: 'Type 1', averageMDs: 7.5 }
                    ]
                }]
            });

            featureManager.populateFeatureTypeDropdown('cat1');
            
            // Setup event handler
            featureManager.setupFeatureTypeListeners();

            // Simulate feature type selection
            featureTypeSelect.innerHTML = '<option value="ft1" data-average-mds="7.5">Type 1</option>';
            featureTypeSelect.value = 'ft1';
            
            const changeHandler = featureManager.featureTypeChangeHandler;
            changeHandler({ target: featureTypeSelect });

            expect(realManDaysField.value).toBe('7.5');
        });

        test('BEHAVIOR: Supplier dropdown filters by G2 role only and shows rates', () => {
            mockConfigManager.getProjectConfig.mockReturnValue({
                suppliers: [
                    { id: 's1', name: 'G1 Supplier', department: 'Dev', role: 'G1', officialRate: 600 },
                    { id: 's2', name: 'G2 Supplier', department: 'Dev', role: 'G2', officialRate: 500, realRate: 480 }
                ],
                internalResources: [
                    { id: 'i1', name: 'Internal G2', department: 'IT', role: 'G2', officialRate: 400 }
                ]
            });

            featureManager.populateSupplierDropdown(
                mockConfigManager.getProjectConfig().suppliers,
                mockConfigManager.getProjectConfig().internalResources
            );

            const supplierSelect = document.getElementById('feature-supplier');
            const options = Array.from(supplierSelect.options);

            // Documents G2 filtering and rate display
            expect(options).toHaveLength(3); // Empty option + 2 G2 resources
            expect(options[1].textContent).toBe('Dev - G2 Supplier (€480/day)'); // Uses realRate when available
            expect(options[2].textContent).toBe('IT - Internal G2 (€400/day)'); // Uses officialRate
        });
    });

    describe('Feature Validation Behavior', () => {
        test('BEHAVIOR: ID validation enforces alphanumeric characters with specific symbols', () => {
            const testData = { id: 'test-id_123', description: 'Valid desc', category: 'cat1', supplier: 'sup1', manDays: 5 };
            
            const result = featureManager.validateFeatureData(testData);
            expect(result.isValid).toBe(true);

            // Test invalid characters
            const invalidData = { ...testData, id: 'test@id!' };
            const invalidResult = featureManager.validateFeatureData(invalidData);
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.errors.id).toBe('Feature ID can only contain letters, numbers, underscores, and hyphens');
        });

        test('BEHAVIOR: Description validation has minimum length requirement', () => {
            const shortDescription = { id: 'F1', description: 'Hi', category: 'cat1', supplier: 'sup1', manDays: 5 };
            
            const result = featureManager.validateFeatureData(shortDescription);
            
            // BUG DOCUMENTATION: Error message says 10 characters but actual validation is 3
            expect(result.isValid).toBe(false);
            expect(result.errors.description).toBe('Description must be at least 10 characters long');
        });

        test('BEHAVIOR: Man days validation enforces positive numbers with upper limit', () => {
            const testData = { id: 'F1', description: 'Valid desc', category: 'cat1', supplier: 'sup1' };

            // Test zero man days
            const zeroData = { ...testData, manDays: 0 };
            const zeroResult = featureManager.validateFeatureData(zeroData);
            expect(zeroResult.isValid).toBe(false);
            expect(zeroResult.errors.manDays).toBe('Man days must be greater than 0');

            // Test excessive man days
            const excessiveData = { ...testData, manDays: 1001 };
            const excessiveResult = featureManager.validateFeatureData(excessiveData);
            expect(excessiveResult.isValid).toBe(false);
            expect(excessiveResult.errors.manDays).toBe('Man days seems too high (max 1000)');
        });

        test('BEHAVIOR: Category and supplier validation uses ConfigurationManager', () => {
            mockConfigManager.validateCategory.mockReturnValue(false);
            mockConfigManager.validateSupplier.mockReturnValue(false);

            const testData = { 
                id: 'F1', 
                description: 'Valid description', 
                category: 'invalid-cat', 
                supplier: 'invalid-sup', 
                manDays: 5 
            };

            const result = featureManager.validateFeatureData(testData);

            expect(result.isValid).toBe(false);
            expect(result.errors.category).toBe('Please select a valid category from the configuration');
            expect(result.errors.supplier).toBe('Please select a valid supplier from the configuration');
        });
    });

    describe('Feature Table Rendering Behavior', () => {
        beforeEach(() => {
            mockApp.currentProject.features = [
                {
                    id: 'F1',
                    description: 'Test Feature',
                    category: 'cat1',
                    supplier: 'sup1',
                    realManDays: 8,
                    manDays: 10.5,
                    notes: 'Test notes',
                    created: '2024-01-01',
                    modified: '2024-01-02'
                }
            ];
        });

        test('BEHAVIOR: Table renders expandable rows with main row and details row', () => {
            featureManager.refreshTable();

            const tbody = document.getElementById('features-tbody');
            const rows = tbody.querySelectorAll('tr');

            // Documents two-row structure per feature
            expect(rows).toHaveLength(2);
            expect(rows[0]).toHaveClass('feature-main-row');
            expect(rows[1]).toHaveClass('feature-details-row', 'collapsed');
        });

        test('BEHAVIOR: Main row contains specific column structure without category column', () => {
            featureManager.refreshTable();

            const mainRow = document.querySelector('.feature-main-row');
            const cells = mainRow.querySelectorAll('td');

            // Documents 7-column structure (expand, id, description, supplier, real MDs, calc MDs, actions)
            expect(cells).toHaveLength(7);
            expect(cells[1]).toHaveClass('feature-id');
            expect(cells[2]).toHaveClass('feature-description');
            expect(cells[3]).toHaveClass('feature-supplier');
            expect(cells[4]).toHaveClass('feature-real-man-days');
            expect(cells[5]).toHaveClass('feature-man-days');
            expect(cells[6]).toHaveClass('feature-actions');
        });

        test('BEHAVIOR: Details row shows comprehensive feature information', () => {
            featureManager.refreshTable();

            const detailsRow = document.querySelector('.feature-details-row');
            const detailsContainer = detailsRow.querySelector('.details-container');

            expect(detailsContainer).toBeTruthy();
            
            // Documents specific detail fields displayed
            const detailGroups = detailsContainer.querySelectorAll('.detail-group');
            expect(detailGroups.length).toBeGreaterThan(5); // Category, Type, Expertise, Risk, Notes, Created, Modified
        });

        test('BEHAVIOR: Empty state shows specific message with column span', () => {
            mockApp.currentProject.features = [];
            
            featureManager.refreshTable();

            const tbody = document.getElementById('features-tbody');
            const emptyRow = tbody.querySelector('tr');
            const emptyCell = emptyRow.querySelector('td');

            expect(emptyCell.getAttribute('colspan')).toBe('7');
            expect(emptyCell).toHaveClass('empty-state');
            expect(emptyCell.textContent).toContain('No features found. Click "Add Feature" to get started.');
        });

        test('BEHAVIOR: Row expansion toggles CSS classes and icon direction', () => {
            featureManager.refreshTable();

            const expandBtn = document.querySelector('.expand-btn');
            const icon = expandBtn.querySelector('i');
            const detailsRow = document.querySelector('.feature-details-row');
            const mainRow = document.querySelector('.feature-main-row');

            // Initial collapsed state
            expect(detailsRow).toHaveClass('collapsed');
            expect(icon).toHaveClass('fa-chevron-right');

            // Simulate expansion
            featureManager.toggleFeatureDetails('F1');

            expect(detailsRow.classList.contains('collapsed')).toBe(false);
            expect(icon).toHaveClass('fa-chevron-down');
            expect(mainRow).toHaveClass('expanded');
        });
    });

    describe('Feature CRUD Operations Behavior', () => {
        test('BEHAVIOR: Save feature triggers multiple system updates in sequence', async () => {
            const formData = {
                id: 'F1',
                description: 'Test Feature',
                category: 'cat1',
                supplier: 'sup1',
                realManDays: 10,
                expertise: 100,
                riskMargin: 10,
                manDays: 11, // Calculated value
                notes: 'Test'
            };

            featureManager.getFormData = jest.fn().mockReturnValue(formData);
            featureManager.validateFeatureData = jest.fn().mockReturnValue({ isValid: true });
            featureManager.isIdDuplicate = jest.fn().mockReturnValue(false);
            featureManager.refreshTable = jest.fn();
            featureManager.closeFeatureModal = jest.fn();

            await featureManager.saveFeature();

            // Documents the update sequence
            expect(mockApp.markDirty).toHaveBeenCalled();
            expect(mockApp.saveProject).toHaveBeenCalled();
            expect(featureManager.refreshTable).toHaveBeenCalled();
            expect(mockApp.updateSummary).toHaveBeenCalled();
            expect(featureManager.closeFeatureModal).toHaveBeenCalled();
        });

        test('BEHAVIOR: Duplicate feature creates copy with modified description and new ID', () => {
            const originalFeature = {
                id: 'F1',
                description: 'Original Feature',
                category: 'cat1',
                notes: 'Original notes'
            };

            featureManager.showDuplicateFeatureModal = jest.fn();
            
            featureManager.duplicateFeature(originalFeature);

            const callArgs = featureManager.showDuplicateFeatureModal.mock.calls[0][0];
            
            // Documents duplication behavior
            expect(callArgs.description).toBe('Original Feature (Copy)');
            expect(callArgs.id).not.toBe('F1');
            expect(callArgs.category).toBe('cat1');
            expect(callArgs.created).toBeUndefined(); // Timestamps cleared for new feature
            expect(callArgs.modified).toBeUndefined();
        });

        test('BEHAVIOR: Delete feature shows confirmation dialog and updates project', async () => {
            mockApp.currentProject.features = [
                { id: 'F1', description: 'Feature to delete' }
            ];

            global.confirm = jest.fn().mockReturnValue(true);
            featureManager.refreshTable = jest.fn();

            await featureManager.deleteFeature('F1');

            expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this feature? This action cannot be undone.');
            expect(mockApp.currentProject.features).toHaveLength(0);
            expect(mockApp.markDirty).toHaveBeenCalled();
            expect(mockApp.saveProject).toHaveBeenCalled();
        });
    });

    describe('Filtering and Sorting Behavior', () => {
        beforeEach(() => {
            mockApp.currentProject.features = [
                { id: 'A1', description: 'Alpha Feature', category: 'cat1', supplier: 'sup1', manDays: 10 },
                { id: 'B2', description: 'Beta Feature', category: 'cat2', supplier: 'sup2', manDays: 5 },
                { id: 'C3', description: 'Gamma Feature', category: 'cat1', supplier: 'sup1', manDays: 15 }
            ];
        });

        test('BEHAVIOR: Search filter matches ID, description, and notes fields', () => {
            document.getElementById('search-input').value = 'beta';
            
            featureManager.filterFeatures();

            expect(featureManager.filteredFeatures).toHaveLength(1);
            expect(featureManager.filteredFeatures[0].id).toBe('B2');
        });

        test('BEHAVIOR: Multiple filters work together (AND logic)', () => {
            document.getElementById('category-filter').value = 'cat1';
            document.getElementById('search-input').value = 'gamma';
            
            featureManager.filterFeatures();

            expect(featureManager.filteredFeatures).toHaveLength(1);
            expect(featureManager.filteredFeatures[0].id).toBe('C3');
        });

        test('BEHAVIOR: Sorting toggles direction on same field click', () => {
            featureManager.currentSort = { field: 'id', direction: 'asc' };
            
            featureManager.sortFeatures('id');

            expect(featureManager.currentSort.direction).toBe('desc');

            featureManager.sortFeatures('manDays'); // Different field

            expect(featureManager.currentSort.field).toBe('manDays');
            expect(featureManager.currentSort.direction).toBe('asc');
        });

        test('BEHAVIOR: Numeric sorting handles manDays as numbers not strings', () => {
            mockApp.currentProject.features = [
                { id: 'F1', manDays: 2 },
                { id: 'F2', manDays: 10 },
                { id: 'F3', manDays: 1 }
            ];

            featureManager.sortFeatures('manDays');
            featureManager.applyFilters();

            // Documents numeric sorting (1, 2, 10) not string sorting (1, 10, 2)
            expect(featureManager.filteredFeatures.map(f => f.manDays)).toEqual([1, 2, 10]);
        });
    });

    describe('CSV Export Behavior', () => {
        beforeEach(() => {
            mockApp.currentProject.features = [
                {
                    id: 'F1',
                    description: 'Feature with "quotes" and, comma',
                    category: 'cat1',
                    featureType: 'ft1',
                    supplier: 'sup1',
                    realManDays: 8.5,
                    expertise: 90,
                    riskMargin: 15,
                    manDays: 11.33,
                    notes: 'Multi\nline\nnotes',
                    created: '2024-01-01',
                    modified: '2024-01-02'
                }
            ];

            featureManager.filteredFeatures = mockApp.currentProject.features;
            
            mockConfigManager.getCategoryDisplayName.mockReturnValue('Category 1');
            featureManager.getSupplierName = jest.fn().mockReturnValue('Dept A - Supplier 1 (€500/day)');
            featureManager.getFeatureTypeName = jest.fn().mockReturnValue('Type 1');
        });

        test('BEHAVIOR: CSV includes comprehensive feature data with specific headers', () => {
            const csv = featureManager.generateCSV();
            const lines = csv.split('\n');

            expect(lines[0]).toBe('ID,Description,Category,Feature Type,Supplier,Real Man Days,Expertise %,Risk Margin %,Calculated Man Days,Notes,Created,Modified');
        });

        test('BEHAVIOR: CSV escaping handles complex field values correctly', () => {
            const csv = featureManager.generateCSV();
            
            expect(csv).toContain('"Feature with ""quotes"" and, comma"');
            expect(csv).toContain('"Multi\nline\nnotes"');
            expect(csv).toContain('8.5'); // Numbers not quoted
            expect(csv).toContain('11.33');
        });

        test('BEHAVIOR: Empty filtered features returns specific message', () => {
            featureManager.filteredFeatures = [];
            
            const result = featureManager.generateCSV();
            
            expect(result).toBe('No features to export');
        });
    });

    describe('KNOWN BUGS - Documented Current Behavior', () => {
        test('BUG: setupCalculationListeners uses waitForElement with maxAttempts but logs warning instead of throwing', () => {
            // Remove the field to trigger the waiting behavior
            document.getElementById('feature-real-man-days').remove();
            
            const consoleSpy = jest.spyOn(console, 'warn');
            
            featureManager.setupCalculationListeners();

            // Advance timers to exceed maxAttempts
            for (let i = 0; i < 11; i++) {
                jest.advanceTimersByTime(50);
            }

            // Documents that missing elements log warnings instead of throwing errors
            expect(consoleSpy).toHaveBeenCalledWith('Element feature-real-man-days not found after 10 attempts');
        });

        test('BUG: Form validation error message inconsistency for description length', () => {
            const testData = {
                id: 'F1',
                description: 'Hi', // 2 chars
                category: 'cat1',
                supplier: 'sup1',
                manDays: 5
            };

            const result = featureManager.validateFeatureData(testData);

            // Documents the bug: check is for 3 chars but error says 10
            expect(result.isValid).toBe(false);
            expect(result.errors.description).toBe('Description must be at least 10 characters long');
            
            // But 4 chars passes validation
            const validData = { ...testData, description: 'Test' };
            const validResult = featureManager.validateFeatureData(validData);
            expect(validResult.isValid).toBe(true);
        });

        test('BUG: toggleFeatureDetails has redundant DOM queries and complex element finding logic', () => {
            featureManager.refreshTable();
            const consoleSpy = jest.spyOn(console, 'log');

            featureManager.toggleFeatureDetails('F1');

            // Documents excessive logging in production code
            expect(consoleSpy).toHaveBeenCalledWith('toggleFeatureDetails called with featureId:', 'F1');
            expect(consoleSpy).toHaveBeenCalledWith('Found rows with matching feature ID:', expect.any(Number));
        });

        test('BUG: Feature type listener setup removes and recreates listeners repeatedly', () => {
            const categorySelect = document.getElementById('feature-category');
            const removeEventListenerSpy = jest.spyOn(categorySelect, 'removeEventListener');
            
            // Call setup multiple times
            featureManager.setupFeatureTypeListeners();
            featureManager.setupFeatureTypeListeners();

            // Documents that listeners are removed before adding new ones
            // This could cause issues if the same handler reference isn't maintained
            expect(removeEventListenerSpy).toHaveBeenCalled();
        });
    });
});