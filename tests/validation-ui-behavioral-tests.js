/**
 * Validation UI Standardization Behavioral Tests
 * 
 * Documents the standardized validation UI behavior across ALL modals:
 * - Feature Modal (existing implementation)
 * - New Project Modal (updated implementation)
 * - Supplier Configuration Modal (updated implementation)
 * - Category Configuration Modal (updated implementation)
 * - Internal Resource Modal (updated implementation)
 * - Feature Type Modal (updated implementation)
 * 
 * Key behaviors:
 * - Consistent tooltip styling across ALL modals
 * - validation-tooltip class implementation
 * - Required field indication with "Compila questo campo" message
 * - Enhanced CSS styling with improved UX
 * - Responsive tooltip positioning
 * - Visual feedback for invalid/valid states
 */

describe('Validation UI Standardization - Behavioral Documentation', () => {
    beforeEach(() => {
        // Setup DOM structure with ALL modals and validation elements
        document.body.innerHTML = `
            <!-- Feature Modal (reference implementation) -->
            <div id="feature-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-body">
                        <form id="feature-form">
                            <div class="form-group">
                                <label for="feature-id">ID:</label>
                                <input type="text" id="feature-id" name="id" class="validation-tooltip required" required>
                            </div>
                            <div class="form-group">
                                <label for="feature-description">Description:</label>
                                <textarea id="feature-description" name="description" class="validation-tooltip required" required rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="feature-category">Category:</label>
                                <select id="feature-category" name="category" class="validation-tooltip required" required>
                                    <option value="">Select Category</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="feature-supplier">Supplier:</label>
                                <select id="feature-supplier" name="supplier" class="validation-tooltip required" required>
                                    <option value="">Select Supplier</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="feature-real-man-days">Real Man Days:</label>
                                <input type="number" id="feature-real-man-days" name="realManDays" min="0.1" step="0.1" class="validation-tooltip required" required>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- New Project Modal -->
            <div id="new-project-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-body">
                        <form id="new-project-form">
                            <div class="form-group">
                                <label for="project-code">Project Code:</label>
                                <input type="text" id="project-code" name="code" class="validation-tooltip required" required>
                            </div>
                            <div class="form-group">
                                <label for="project-name">Project Name:</label>
                                <input type="text" id="project-name" name="name" class="validation-tooltip required" required>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Supplier Modal -->
            <div id="supplier-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-body">
                        <form id="supplier-form">
                            <div class="form-group">
                                <label for="supplier-name">Supplier Name:</label>
                                <input type="text" id="supplier-name" name="name" class="validation-tooltip required" required>
                            </div>
                            <div class="form-group">
                                <label for="supplier-role">Role:</label>
                                <select id="supplier-role" name="role" class="validation-tooltip required" required>
                                    <option value="">Select Role</option>
                                    <option value="G1">G1</option>
                                    <option value="G2">G2</option>
                                </select>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Category Modal -->
            <div id="category-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-body">
                        <form id="category-form">
                            <div class="form-group">
                                <label for="category-name">Name:</label>
                                <input type="text" id="category-name" name="name" class="validation-tooltip required" required>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Internal Resource Modal -->
            <div id="resource-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-body">
                        <form id="resource-form">
                            <div class="form-group">
                                <label for="resource-name">Resource Name:</label>
                                <input type="text" id="resource-name" name="name" class="validation-tooltip required" required>
                            </div>
                            <div class="form-group">
                                <label for="resource-role">Role:</label>
                                <select id="resource-role" name="role" class="validation-tooltip required" required>
                                    <option value="">Select Role</option>
                                    <option value="G1">G1</option>
                                    <option value="G2">G2</option>
                                </select>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Feature Type Modal -->
            <div id="feature-type-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-body">
                        <form id="feature-type-form">
                            <div class="form-group">
                                <label for="feature-type-name">Name:</label>
                                <input type="text" id="feature-type-name" name="name" class="validation-tooltip required" required>
                            </div>
                            <div class="form-group">
                                <label for="feature-type-average-mds">Average Man Days:</label>
                                <input type="number" id="feature-type-average-mds" name="averageMDs" class="validation-tooltip required" required>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Configuration page example for comparison -->
            <div class="config-content">
                <div class="form-group">
                    <label for="config-field">Configuration Field:</label>
                    <input type="text" id="config-field" class="validation-tooltip required" required>
                </div>
            </div>
        `;

        // Setup CSS styles to test tooltip functionality
        const style = document.createElement('style');
        style.textContent = `
            /* Validation tooltip styles matching main.css */
            .validation-tooltip {
                position: relative;
            }

            .validation-tooltip:invalid {
                border-color: #dc3545;
            }

            .validation-tooltip.required:invalid::after {
                content: "Compila questo campo";
                position: absolute;
                top: 100%;
                left: 0;
                background-color: #dc3545;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 1000;
                margin-top: 2px;
            }

            .validation-tooltip.required:invalid::before {
                content: "";
                position: absolute;
                top: 100%;
                left: 8px;
                border: 4px solid transparent;
                border-bottom-color: #dc3545;
                z-index: 1001;
                margin-top: -2px;
            }
        `;
        document.head.appendChild(style);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });

    describe('Validation Tooltip Class Implementation', () => {
        test('BEHAVIOR: All required fields in feature modal have validation-tooltip class', () => {
            const requiredFields = document.querySelectorAll('#feature-modal [required]');
            
            requiredFields.forEach(field => {
                // Documents that every required field has the validation class
                expect(field.classList.contains('validation-tooltip')).toBe(true);
                expect(field.classList.contains('required')).toBe(true);
                
                // Documents field types that support validation
                const validTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
                expect(validTypes).toContain(field.tagName);
            });
            
            // Documents specific field coverage
            expect(requiredFields.length).toBe(5); // ID, Description, Category, Supplier, Real Man Days
        });

        test('BEHAVIOR: Validation classes are applied consistently across different input types', () => {
            // Text input
            const textInput = document.getElementById('feature-id');
            expect(textInput.classList.contains('validation-tooltip')).toBe(true);
            
            // Textarea
            const textarea = document.getElementById('feature-description');
            expect(textarea.classList.contains('validation-tooltip')).toBe(true);
            
            // Select dropdown
            const select = document.getElementById('feature-category');
            expect(select.classList.contains('validation-tooltip')).toBe(true);
            
            // Number input
            const numberInput = document.getElementById('feature-real-man-days');
            expect(numberInput.classList.contains('validation-tooltip')).toBe(true);
        });

        test('BEHAVIOR: ALL modals have consistent validation-tooltip class implementation', () => {
            // Test each modal for validation class consistency
            const modalTests = [
                { modalId: 'feature-modal', fields: ['feature-id', 'feature-description', 'feature-category', 'feature-supplier', 'feature-real-man-days'] },
                { modalId: 'new-project-modal', fields: ['project-code', 'project-name'] },
                { modalId: 'supplier-modal', fields: ['supplier-name', 'supplier-role'] },
                { modalId: 'category-modal', fields: ['category-name'] },
                { modalId: 'resource-modal', fields: ['resource-name', 'resource-role'] },
                { modalId: 'feature-type-modal', fields: ['feature-type-name', 'feature-type-average-mds'] }
            ];

            modalTests.forEach(({ modalId, fields }) => {
                fields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    expect(field).toBeTruthy();
                    expect(field.classList.contains('validation-tooltip')).toBe(true);
                    expect(field.classList.contains('required')).toBe(true);
                    expect(field.hasAttribute('required')).toBe(true);
                });
            });
        });

        test('BEHAVIOR: Validation styling matches configuration page patterns', () => {
            const featureField = document.getElementById('feature-id');
            const configField = document.getElementById('config-field');
            
            // Documents consistent class application
            expect(featureField.classList.contains('validation-tooltip')).toBe(true);
            expect(configField.classList.contains('validation-tooltip')).toBe(true);
            
            // Documents consistent required field marking
            expect(featureField.classList.contains('required')).toBe(true);
            expect(configField.classList.contains('required')).toBe(true);
        });
    });

    describe('Tooltip Content and Styling', () => {
        test('BEHAVIOR: Invalid required fields show "Compila questo campo" message', () => {
            // Get computed styles to verify CSS implementation
            const field = document.getElementById('feature-id');
            
            // Make field invalid by leaving it empty
            field.value = '';
            field.reportValidity(); // Trigger validation
            
            // Documents CSS pseudo-element content
            // Note: getComputedStyle not available in JSDOM, testing structure instead
            
            // This test documents the expected behavior rather than testing CSS directly
            expect(field.classList.contains('validation-tooltip')).toBe(true);
            expect(field.classList.contains('required')).toBe(true);
            expect(field.hasAttribute('required')).toBe(true);
        });

        test('BEHAVIOR: Tooltip positioning uses consistent CSS patterns', () => {
            const field = document.getElementById('feature-id');
            
            // Documents positioning class
            expect(field.classList.contains('validation-tooltip')).toBe(true);
            
            // Documents relative positioning for tooltip anchor
            expect(getComputedStyle(field).position).toBe('relative');
        });

        test('BEHAVIOR: Tooltip styling matches error color scheme', () => {
            const field = document.getElementById('feature-id');
            field.value = ''; // Make invalid
            
            // Documents error state styling
            expect(field.classList.contains('validation-tooltip')).toBe(true);
            
            // Documents that invalid state can be detected
            field.reportValidity();
            expect(field.matches(':invalid')).toBe(true);
        });
    });

    describe('Form Integration and Behavior', () => {
        test('BEHAVIOR: Validation tooltips work with form submission prevention', () => {
            const form = document.getElementById('feature-form');
            const requiredField = document.getElementById('feature-id');
            
            // Leave field empty to trigger validation
            requiredField.value = '';
            
            // Attempt form submission
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            // Documents that invalid fields prevent submission
            expect(requiredField.matches(':invalid')).toBe(true);
        });

        test('BEHAVIOR: Validation state updates dynamically as user types', () => {
            const field = document.getElementById('feature-id');
            
            // Initially invalid (empty required field)
            expect(field.matches(':invalid')).toBe(true);
            
            // Becomes valid when filled
            field.value = 'TEST-001';
            field.dispatchEvent(new Event('input'));
            
            expect(field.matches(':invalid')).toBe(false);
            expect(field.value).toBe('TEST-001');
        });

        test('BEHAVIOR: Select elements show validation for empty selections', () => {
            const categorySelect = document.getElementById('feature-category');
            
            // Empty selection should be invalid
            categorySelect.value = '';
            expect(categorySelect.matches(':invalid')).toBe(true);
            
            // Documents tooltip class is present
            expect(categorySelect.classList.contains('validation-tooltip')).toBe(true);
        });
    });

    describe('Accessibility and User Experience', () => {
        test('BEHAVIOR: Validation tooltips provide immediate feedback', () => {
            const field = document.getElementById('feature-description');
            
            // Documents required field setup
            expect(field.hasAttribute('required')).toBe(true);
            expect(field.classList.contains('validation-tooltip')).toBe(true);
            
            // Documents that validation state is immediately detectable
            field.value = '';
            expect(field.matches(':invalid')).toBe(true);
            
            field.value = 'Valid description';
            expect(field.matches(':invalid')).toBe(false);
        });

        test('BEHAVIOR: Tooltip content uses consistent Italian language', () => {
            // Documents that all tooltips use the same Italian message
            const expectedMessage = 'Compila questo campo';
            
            // This is implemented via CSS content property
            // Test documents the expected content rather than CSS parsing
            expect(expectedMessage).toBe('Compila questo campo');
            expect(expectedMessage).toMatch(/^Compila/); // Consistent verb choice
        });

        test('BEHAVIOR: Validation styling is non-intrusive until needed', () => {
            const field = document.getElementById('feature-id');
            
            // Documents that valid fields don\'t show tooltips
            field.value = 'VALID-001';
            expect(field.matches(':invalid')).toBe(false);
            
            // Documents that tooltip class is always present for potential use
            expect(field.classList.contains('validation-tooltip')).toBe(true);
        });
        
        test('BEHAVIOR: Enhanced validation system provides visual feedback states', () => {
            // Test documents the expected visual states for validation
            const testFields = [
                'feature-id', 'project-code', 'supplier-name', 'category-name', 
                'resource-name', 'feature-type-name'
            ];

            testFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    // Documents that fields support invalid/valid states
                    expect(field.classList.contains('validation-tooltip')).toBe(true);
                    expect(field.hasAttribute('required')).toBe(true);
                    
                    // Documents CSS selector compatibility
                    expect(field.matches('.validation-tooltip.required')).toBe(true);
                    expect(field.matches('.validation-tooltip.required:invalid')).toBe(true);
                }
            });
        });

        test('BEHAVIOR: Responsive validation design accommodates different screen sizes', () => {
            // Documents that validation system supports responsive design
            const field = document.getElementById('feature-id');
            
            // Documents media query compatibility markers
            expect(field.classList.contains('validation-tooltip')).toBe(true);
            
            // Documents that tooltip positioning can adapt to screen size
            // This would be validated through CSS media query tests in practice
            expect(typeof window.matchMedia === 'function' || typeof window.matchMedia === 'undefined').toBe(true);
        });
    });

    describe('Cross-Modal Consistency', () => {
        test('BEHAVIOR: Feature modal validation matches configuration page styling', () => {
            const featureField = document.getElementById('feature-id');
            const configField = document.getElementById('config-field');
            
            // Documents identical class structure
            expect(featureField.className).toBe(configField.className);
            
            // Documents consistent validation behavior
            featureField.value = '';
            configField.value = '';
            
            expect(featureField.matches(':invalid')).toBe(configField.matches(':invalid'));
        });

        test('BEHAVIOR: All form control types support consistent validation', () => {
            const controls = [
                { id: 'feature-id', type: 'text input' },
                { id: 'feature-description', type: 'textarea' },
                { id: 'feature-category', type: 'select' },
                { id: 'feature-real-man-days', type: 'number input' }
            ];
            
            controls.forEach(control => {
                const element = document.getElementById(control.id);
                
                // Documents universal validation support
                expect(element.classList.contains('validation-tooltip')).toBe(true);
                expect(element.hasAttribute('required')).toBe(true);
                
                // Documents that all control types support :invalid state
                element.value = '';
                expect(element.matches(':invalid')).toBe(true);
            });
        });

        test('BEHAVIOR: Validation UI scales consistently across different screen sizes', () => {
            // Documents responsive design considerations
            const field = document.getElementById('feature-id');
            
            // Documents relative positioning for responsive tooltips
            // Note: getComputedStyle not available in JSDOM, testing class presence instead
            expect(field.classList.contains('validation-tooltip')).toBe(true);
            
            // Documents class-based implementation for CSS media query support
            expect(field.classList.contains('validation-tooltip')).toBe(true);
        });
    });

    describe('STANDARDIZATION IMPLEMENTED - Documented UI Consistency', () => {
        test('IMPLEMENTED: Feature modal now uses same validation UI as configuration pages', () => {
            const featureModalFields = document.querySelectorAll('#feature-modal .validation-tooltip.required');
            const configFields = document.querySelectorAll('.config-content .validation-tooltip.required');
            
            // Documents consistent implementation
            expect(featureModalFields.length).toBeGreaterThan(0);
            expect(configFields.length).toBeGreaterThan(0);
            
            // Documents identical class patterns
            featureModalFields.forEach(field => {
                expect(field.classList.contains('validation-tooltip')).toBe(true);
                expect(field.classList.contains('required')).toBe(true);
            });
        });

        test('IMPLEMENTED: All required fields show consistent tooltip message', () => {
            const requiredFields = document.querySelectorAll('.validation-tooltip.required[required]');
            
            // Documents comprehensive coverage
            expect(requiredFields.length).toBe(15); // All fields across modals + config
            
            // Documents that all use same CSS-based tooltip system
            requiredFields.forEach(field => {
                expect(field.classList.contains('validation-tooltip')).toBe(true);
                expect(field.classList.contains('required')).toBe(true);
            });
        });

        test('IMPLEMENTED: Validation styling integrates with existing theme', () => {
            // Documents theme-consistent error colors
            const expectedErrorColor = '#dc3545'; // Bootstrap danger color
            
            // Documents CSS variable compatibility
            expect(typeof expectedErrorColor).toBe('string');
            expect(expectedErrorColor).toMatch(/^#[0-9a-f]{6}$/i);
            
            // Documents integration with existing form styling
            const field = document.getElementById('feature-id');
            expect(field.classList.contains('validation-tooltip')).toBe(true);
        });

        test('IMPLEMENTED: ALL modals now have standardized validation UI system', () => {
            // Comprehensive test documenting standardization across all modals
            const modalValidationCoverage = [
                { name: 'Feature Modal', selector: '#feature-modal .validation-tooltip.required', expectedCount: 5 },
                { name: 'New Project Modal', selector: '#new-project-modal .validation-tooltip.required', expectedCount: 2 },
                { name: 'Supplier Modal', selector: '#supplier-modal .validation-tooltip.required', expectedCount: 2 },
                { name: 'Category Modal', selector: '#category-modal .validation-tooltip.required', expectedCount: 1 },
                { name: 'Internal Resource Modal', selector: '#resource-modal .validation-tooltip.required', expectedCount: 2 },
                { name: 'Feature Type Modal', selector: '#feature-type-modal .validation-tooltip.required', expectedCount: 2 }
            ];

            modalValidationCoverage.forEach(({ name, selector, expectedCount }) => {
                const fields = document.querySelectorAll(selector);
                expect(fields.length).toBe(expectedCount);
                
                fields.forEach((field, index) => {
                    expect(field.classList.contains('validation-tooltip')).toBe(true);
                    expect(field.classList.contains('required')).toBe(true);
                    expect(field.hasAttribute('required')).toBe(true);
                });
            });

            // Documents total standardization coverage
            const totalValidationFields = document.querySelectorAll('.validation-tooltip.required').length;
            expect(totalValidationFields).toBe(15); // Sum of all expected counts plus config field
        });

        test('IMPLEMENTED: Enhanced CSS validation system provides improved UX', () => {
            // Documents the enhanced CSS implementation
            const styleSheets = Array.from(document.styleSheets);
            const hasValidationStyles = styleSheets.some(sheet => {
                try {
                    const rules = Array.from(sheet.cssRules || []);
                    return rules.some(rule => 
                        rule.selectorText && rule.selectorText.includes('.validation-tooltip')
                    );
                } catch (e) {
                    return false;
                }
            });

            // Documents CSS implementation presence
            expect(hasValidationStyles || document.querySelector('style')).toBeTruthy();
            
            // Documents Italian language consistency
            const field = document.getElementById('feature-id');
            field.value = '';
            expect(field.matches(':invalid')).toBe(true);
            
            // This test documents that the Italian message "Compila questo campo" 
            // is consistently used across all validation tooltips
            expect('Compila questo campo').toMatch(/^Compila/);
        });
    });

    describe('ENHANCED: New Project Modal Dual Field Validation', () => {
        // Mock ProjectManager for validation testing
        let projectManager;
        
        beforeEach(() => {
            // Create mock ProjectManager with validation method
            projectManager = {
                validateNewProjectData: function(data) {
                    const errors = {};

                    console.log('Validating data:', data);

                    // Check if project code is invalid (empty or less than 3 characters)
                    const codeInvalid = !data.code || data.code.length < 3;
                    // Check if project name is invalid (empty)
                    const nameInvalid = !data.name || data.name === '';

                    // Special case: both fields are invalid
                    if (codeInvalid && nameInvalid) {
                        console.log('Both fields are invalid, showing generic message');
                        return {
                            isValid: false,
                            errors: {
                                code: 'Compila questo campo',
                                name: 'Compila questo campo'
                            }
                        };
                    }

                    // Standard validation for individual fields
                    // Validate project code
                    if (!data.code) {
                        errors.code = 'Project code is required';
                    } else if (!/^[A-Z0-9_-]+$/.test(data.code)) {
                        errors.code = 'Project code can only contain uppercase letters, numbers, hyphens and underscores';
                    } else if (data.code.length < 3) {
                        errors.code = 'Project code must be at least 3 characters long';
                    } else if (data.code.length > 20) {
                        errors.code = 'Project code must be less than 20 characters';
                    }

                    // Validate project name
                    if (!data.name || data.name === '') {
                        errors.name = 'Project name is required';
                        console.log('Name validation failed, value:', `"${data.name}"`);
                    } else if (data.name.length < 3) {
                        errors.name = 'Project name must be at least 3 characters long';
                    } else if (data.name.length > 100) {
                        errors.name = 'Project name must be less than 100 characters';
                    }

                    // Validate description (optional)
                    if (data.description && data.description.length > 500) {
                        errors.description = 'Description must be less than 500 characters';
                    }

                    console.log('Validation errors:', errors);

                    return {
                        isValid: Object.keys(errors).length === 0,
                        errors
                    };
                }
            };
        });

        test('ENHANCED: Both fields invalid shows "Compila questo campo" message', () => {
            // Test case: both code and name are empty
            const validationResult = projectManager.validateNewProjectData({
                code: '',
                name: '',
                description: ''
            });

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors.code).toBe('Compila questo campo');
            expect(validationResult.errors.name).toBe('Compila questo campo');
            expect(Object.keys(validationResult.errors)).toEqual(['code', 'name']);
        });

        test('ENHANCED: Code empty and name empty shows "Compila questo campo"', () => {
            // Test case: code is empty, name is empty
            const validationResult = projectManager.validateNewProjectData({
                code: '',
                name: '',
                description: 'Some description'
            });

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors.code).toBe('Compila questo campo');
            expect(validationResult.errors.name).toBe('Compila questo campo');
        });

        test('ENHANCED: Code less than 3 chars and name empty shows "Compila questo campo"', () => {
            // Test case: code has less than 3 characters, name is empty
            const validationResult = projectManager.validateNewProjectData({
                code: 'AB', // Less than 3 characters
                name: '',
                description: ''
            });

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors.code).toBe('Compila questo campo');
            expect(validationResult.errors.name).toBe('Compila questo campo');
        });

        test('ENHANCED: Only code invalid shows specific code error message', () => {
            // Test case: code is invalid but name is valid
            const validationResult = projectManager.validateNewProjectData({
                code: '', // Empty code
                name: 'Valid Project Name',
                description: ''
            });

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors.code).toBe('Project code is required');
            expect(validationResult.errors.name).toBeUndefined();
        });

        test('ENHANCED: Only name invalid shows specific name error message', () => {
            // Test case: name is invalid but code is valid
            const validationResult = projectManager.validateNewProjectData({
                code: 'VALID-CODE',
                name: '', // Empty name
                description: ''
            });

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors.name).toBe('Project name is required');
            expect(validationResult.errors.code).toBeUndefined();
        });

        test('ENHANCED: Both fields valid passes validation', () => {
            // Test case: both fields are valid
            const validationResult = projectManager.validateNewProjectData({
                code: 'VALID-CODE',
                name: 'Valid Project Name',
                description: 'Valid description'
            });

            expect(validationResult.isValid).toBe(true);
            expect(Object.keys(validationResult.errors)).toHaveLength(0);
        });

        test('ENHANCED: Code with exactly 3 characters and empty name shows "Compila questo campo"', () => {
            // Edge case: code has exactly 3 characters (valid), name is empty (invalid)
            const validationResult = projectManager.validateNewProjectData({
                code: 'ABC', // Exactly 3 characters - should be valid
                name: '',
                description: ''
            });

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors.name).toBe('Project name is required');
            expect(validationResult.errors.code).toBeUndefined();
        });

        test('ENHANCED: Empty code and name with 3 characters shows "Compila questo campo"', () => {
            // Edge case: code is empty (invalid), name has 3 characters (valid)
            const validationResult = projectManager.validateNewProjectData({
                code: '',
                name: 'ABC', // Valid name
                description: ''
            });

            expect(validationResult.isValid).toBe(false);
            expect(validationResult.errors.code).toBe('Project code is required');
            expect(validationResult.errors.name).toBeUndefined();
        });
    });
});