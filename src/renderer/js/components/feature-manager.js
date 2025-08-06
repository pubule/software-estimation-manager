/**
 * Fixed Feature Manager - PROBLEMA SALVATAGGIO RISOLTO
 * Corretto il salvataggio delle feature e l'aggiornamento dell'UI
 */

class FeatureManager {
    constructor(dataManager, configManager) {
        this.dataManager = dataManager;
        this.configManager = configManager;
        this.currentSort = { field: 'id', direction: 'asc' };
        this.filteredFeatures = [];
        this.editingFeature = null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Form submission
        const featureForm = document.getElementById('feature-form');
        if (featureForm) {
            featureForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveFeature();
            });
        }

        // Modal close events
        const modalCloseBtn = document.querySelector('#feature-modal .modal-close');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                this.closeFeatureModal();
            });
        }

        const cancelBtn = document.getElementById('cancel-feature-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeFeatureModal();
            });
        }

        const saveBtn = document.getElementById('save-feature-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveFeature();
            });
        }

        // Click outside modal to close
        const modal = document.getElementById('feature-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.closeFeatureModal();
                }
            });
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('feature-modal');
                if (modal && modal.classList.contains('active')) {
                    this.closeFeatureModal();
                }
            }
        });

        // Add event listeners for real-time calculation updates
        this.setupCalculationListeners();
    }

    /**
     * Setup event listeners for real-time calculation updates
     */
    setupCalculationListeners() {
        // Function to wait for element to be available
        const waitForElement = (id, callback, maxAttempts = 10) => {
            let attempts = 0;
            const checkElement = () => {
                const element = document.getElementById(id);
                if (element) {
                    callback(element);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkElement, 50);
                } else {
                    console.warn(`Element ${id} not found after ${maxAttempts} attempts`);
                }
            };
            checkElement();
        };

        // Setup listener for Real Man Days field
        waitForElement('feature-real-man-days', (realManDaysField) => {
            // Clone the node to remove all event listeners
            const newRealManDaysField = realManDaysField.cloneNode(true);
            realManDaysField.parentNode.replaceChild(newRealManDaysField, realManDaysField);
            
            newRealManDaysField.addEventListener('input', () => {
                this.updateCalculatedManDays();
            });
            console.log('Real man days listener attached');
        });

        // Setup listener for Expertise field
        waitForElement('feature-expertise', (expertiseField) => {
            // Clone the node to remove all event listeners
            const newExpertiseField = expertiseField.cloneNode(true);
            expertiseField.parentNode.replaceChild(newExpertiseField, expertiseField);
            
            newExpertiseField.addEventListener('input', () => {
                this.updateCalculatedManDays();
            });
            console.log('Expertise listener attached');
        });

        // Setup listener for Risk Margin field
        waitForElement('feature-risk-margin', (riskMarginField) => {
            // Clone the node to remove all event listeners
            const newRiskMarginField = riskMarginField.cloneNode(true);
            riskMarginField.parentNode.replaceChild(newRiskMarginField, riskMarginField);
            
            newRiskMarginField.addEventListener('input', () => {
                this.updateCalculatedManDays();
            });
            console.log('Risk margin listener attached');
        });
    }

    /**
     * Update the calculated man days field in real-time
     */
    updateCalculatedManDays() {
        const realManDaysInput = document.getElementById('feature-real-man-days');
        const expertiseInput = document.getElementById('feature-expertise');
        const riskMarginInput = document.getElementById('feature-risk-margin');
        const calculatedInput = document.getElementById('feature-calculated-man-days');

        if (!realManDaysInput || !expertiseInput || !riskMarginInput || !calculatedInput) {
            return;
        }

        const realManDays = parseFloat(realManDaysInput.value) || 0;
        const expertise = parseFloat(expertiseInput.value) || 100;
        const riskMargin = parseFloat(riskMarginInput.value) || 0;

        // Calculate using the new formula: Real Man Days * (100 + Risk Margin) / Expertise
        const calculatedManDays = expertise > 0 ? (realManDays * (100 + riskMargin)) / expertise : 0;

        // Update the calculated field
        calculatedInput.value = calculatedManDays.toFixed(2);

        console.log(`Calculation update: ${realManDays} * (100 + ${riskMargin}) / ${expertise} = ${calculatedManDays.toFixed(2)}`);
    }

    /**
     * Show the add feature modal
     */
    showAddFeatureModal() {
        this.editingFeature = null;
        this.resetFeatureForm();

        const modal = document.getElementById('feature-modal');
        const modalTitle = document.getElementById('modal-title');

        if (modalTitle) {
            modalTitle.textContent = 'Add Feature';
        }

        // Generate new ID
        const idField = document.getElementById('feature-id');
        if (idField) {
            idField.value = this.generateFeatureId();
        }

        // Populate dropdowns with current project configuration
        this.populateModalDropdowns();

        if (modal) {
            modal.classList.add('active');

            // Focus first input
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    /**
     * Show the edit feature modal
     * @param {Object} feature - Feature to edit
     */
    showEditFeatureModal(feature) {
        this.editingFeature = feature;

        // Populate dropdowns before populating the form
        this.populateModalDropdowns();
        this.populateFeatureForm(feature);

        const modal = document.getElementById('feature-modal');
        const modalTitle = document.getElementById('modal-title');

        if (modalTitle) {
            modalTitle.textContent = 'Edit Feature';
        }

        if (modal) {
            modal.classList.add('active');

            // Focus description field for editing
            const descField = document.getElementById('feature-description');
            if (descField) {
                setTimeout(() => {
                    descField.focus();
                    descField.select();
                }, 100);
            }
        }
    }

    /**
     * Populate modal dropdowns using ConfigurationManager
     */
    populateModalDropdowns() {
        const currentProject = window.app?.currentProject;

        if (!currentProject || !this.configManager) {
            console.warn('No project or configuration manager found');
            this.clearModalDropdowns();
            return;
        }

        // Get merged configuration for current project
        const projectConfig = this.configManager.getProjectConfig(currentProject.config);

        // Populate category dropdown in modal
        this.populateCategoryDropdown(projectConfig.categories);

        // Populate supplier dropdown in modal (include both suppliers and internal resources)
        this.populateSupplierDropdown(projectConfig.suppliers, projectConfig.internalResources);

        // Setup event listeners for dynamic behavior
        this.setupFeatureTypeListeners();

        console.log('Modal dropdowns populated from merged project configuration');
    }

    /**
     * Populate category dropdown
     * @param {Array} categories - Array of categories from merged config
     */
    populateCategoryDropdown(categories) {
        const categorySelect = document.getElementById('feature-category');
        if (!categorySelect) return;

        // Clear existing options (keep only the first option)
        categorySelect.innerHTML = '<option value="">Select Category</option>';

        // Add categories from merged configuration
        categories.forEach(category => {
            if (category.id && category.name && category.status !== 'inactive') {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;

                // Add visual indicator for global vs project-specific
                if (category.isProjectSpecific) {
                    option.textContent += ' (Project)';
                    option.style.fontStyle = 'italic';
                } else if (category.isOverridden) {
                    option.textContent += ' (Modified)';
                    option.style.fontWeight = 'bold';
                }

                option.title = category.description || category.name;
                categorySelect.appendChild(option);
            }
        });

        console.log(`Populated ${categories.length} categories in modal dropdown`);
    }

    /**
     * Populate feature type dropdown based on selected category
     * @param {string} categoryId - Selected category ID
     */
    populateFeatureTypeDropdown(categoryId) {
        const featureTypeSelect = document.getElementById('feature-type');
        if (!featureTypeSelect) return;

        // Clear existing options
        featureTypeSelect.innerHTML = '<option value="">Select Feature Type</option>';

        if (!categoryId) {
            featureTypeSelect.disabled = true;
            return;
        }

        // Get current project configuration
        const currentProject = window.app?.currentProject;
        if (!currentProject || !this.configManager) {
            console.warn('No project or configuration manager found for feature types');
            featureTypeSelect.disabled = true;
            return;
        }

        // Get merged configuration for current project
        const projectConfig = this.configManager.getProjectConfig(currentProject.config);
        
        // Find the selected category
        const selectedCategory = projectConfig.categories.find(cat => cat.id === categoryId);
        if (!selectedCategory || !selectedCategory.featureTypes) {
            featureTypeSelect.disabled = true;
            return;
        }

        // Enable dropdown and populate feature types
        featureTypeSelect.disabled = false;
        selectedCategory.featureTypes.forEach(featureType => {
            if (featureType.id && featureType.name) {
                const option = document.createElement('option');
                option.value = featureType.id;
                option.textContent = featureType.name;
                option.title = `${featureType.description || featureType.name} (Average: ${featureType.averageMDs} MDs)`;
                // Store the averageMDs for later use
                option.dataset.averageMds = featureType.averageMDs;
                featureTypeSelect.appendChild(option);
            }
        });

        console.log(`Populated ${selectedCategory.featureTypes.length} feature types for category ${categoryId}`);
    }

    /**
     * Populate supplier dropdown
     * @param {Array} suppliers - Array of external suppliers
     * @param {Array} internalResources - Array of internal resources
     */
    populateSupplierDropdown(suppliers, internalResources) {
        const supplierSelect = document.getElementById('feature-supplier');
        if (!supplierSelect) return;

        // Clear existing options (keep only the first option)
        supplierSelect.innerHTML = '<option value="">Select Supplier</option>';

        // Add external suppliers (only G2 role)
        suppliers.forEach(supplier => {
            if (supplier.id && supplier.name && supplier.status !== 'inactive' && supplier.role === 'G2') {
                const option = document.createElement('option');
                option.value = supplier.id;
                const rate = supplier.realRate || supplier.officialRate || 0;
                option.textContent = `${supplier.department} - ${supplier.name} (€${rate}/day)`;

                // Add visual indicator for global vs project-specific
                if (supplier.isProjectSpecific) {
                    option.textContent += ' - Project';
                    option.style.fontStyle = 'italic';
                } else if (supplier.isOverridden) {
                    option.textContent += ' - Modified';
                    option.style.fontWeight = 'bold';
                }

                option.title = `External Supplier - Rate: €${supplier.officialRate}/day`;
                supplierSelect.appendChild(option);
            }
        });

        // Add internal resources (only G2 role)
        internalResources.forEach(resource => {
            if (resource.id && resource.name && resource.status !== 'inactive' && resource.role === 'G2') {
                const option = document.createElement('option');
                option.value = resource.id;
                const rate = resource.realRate || resource.officialRate || 0;
                option.textContent = `${resource.department} - ${resource.name} (€${rate}/day)`;

                // Add visual indicator for global vs project-specific
                if (resource.isProjectSpecific) {
                    option.textContent += ' - Project';
                    option.style.fontStyle = 'italic';
                } else if (resource.isOverridden) {
                    option.textContent += ' - Modified';
                    option.style.fontWeight = 'bold';
                }

                option.title = `Internal Resource - ${resource.role} - ${resource.department}`;
                supplierSelect.appendChild(option);
            }
        });

        const g2Suppliers = suppliers.filter(s => s.role === 'G2');
        const g2InternalResources = internalResources.filter(r => r.role === 'G2');
        console.log(`Populated ${g2Suppliers.length} G2 suppliers and ${g2InternalResources.length} G2 internal resources in modal dropdown`);
    }

    /**
     * Setup event listeners for feature type functionality
     */
    setupFeatureTypeListeners() {
        console.log('Setting up feature type listeners...');
        
        const categorySelect = document.getElementById('feature-category');
        const featureTypeSelect = document.getElementById('feature-type');
        const realManDaysField = document.getElementById('feature-real-man-days');

        if (!categorySelect || !featureTypeSelect || !realManDaysField) {
            console.warn('Feature type elements not found:', {
                categorySelect: !!categorySelect,
                featureTypeSelect: !!featureTypeSelect,
                realManDaysField: !!realManDaysField
            });
            return;
        }

        // Remove existing listeners by storing reference and cleaning up properly
        if (this.categoryChangeHandler) {
            categorySelect.removeEventListener('change', this.categoryChangeHandler);
        }
        if (this.featureTypeChangeHandler) {
            featureTypeSelect.removeEventListener('change', this.featureTypeChangeHandler);
        }

        // Create bound handlers
        this.categoryChangeHandler = (e) => {
            const selectedCategoryId = e.target.value;
            console.log('Category changed to:', selectedCategoryId);
            
            // Populate feature types for selected category
            this.populateFeatureTypeDropdown(selectedCategoryId);
            
            // Clear real man days when category changes
            const realManDaysField = document.getElementById('feature-real-man-days');
            if (realManDaysField && !selectedCategoryId) {
                realManDaysField.value = '';
                realManDaysField.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };

        this.featureTypeChangeHandler = (e) => {
            console.log('Feature type change event triggered');
            const selectedOption = e.target.selectedOptions[0];
            const realManDaysField = document.getElementById('feature-real-man-days');
            
            if (!realManDaysField) {
                console.warn('Real man days field not found during feature type change');
                return;
            }
            
            if (selectedOption && selectedOption.dataset.averageMds) {
                const averageMDs = parseFloat(selectedOption.dataset.averageMds);
                console.log('Feature type changed, setting real MDs to:', averageMDs);
                realManDaysField.value = averageMDs;
                
                // Trigger the input event to update calculated man days
                realManDaysField.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('Real MDs field updated and input event triggered');
            } else if (!selectedOption || !selectedOption.value) {
                // Clear real man days if no feature type selected
                console.log('Clearing real MDs field - no feature type selected');
                realManDaysField.value = '';
                realManDaysField.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };

        // Attach the listeners
        categorySelect.addEventListener('change', this.categoryChangeHandler);
        featureTypeSelect.addEventListener('change', this.featureTypeChangeHandler);

        console.log('Feature type listeners setup completed');
    }

    /**
     * Populate filter dropdowns using ConfigurationManager
     */
    populateFilterDropdowns() {
        const currentProject = window.app?.currentProject;

        if (!currentProject || !this.configManager) {
            console.warn('No project or configuration manager found for filters');
            this.clearFilterDropdowns();
            return;
        }

        // Get merged configuration for current project
        const projectConfig = this.configManager.getProjectConfig(currentProject.config);

        // Populate category filter dropdown
        this.populateCategoryFilterDropdown(projectConfig.categories);

        // Populate supplier filter dropdown
        this.populateSupplierFilterDropdown(projectConfig.suppliers, projectConfig.internalResources);

        // Populate feature type filter dropdown
        this.populateFeatureTypeFilterDropdown(projectConfig.categories);

        console.log('Filter dropdowns populated from merged project configuration');
    }

    /**
     * Populate category filter dropdown
     * @param {Array} categories - Array of categories from merged config
     */
    populateCategoryFilterDropdown(categories) {
        const categoryFilterSelect = document.getElementById('category-filter');
        if (!categoryFilterSelect) return;

        // Store current selection
        const currentValue = categoryFilterSelect.value;

        // Clear existing options (except first)
        while (categoryFilterSelect.children.length > 1) {
            categoryFilterSelect.removeChild(categoryFilterSelect.lastChild);
        }

        // Add categories
        categories.forEach(category => {
            if (category.id && category.name && category.status !== 'inactive') {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;

                // Add visual indicator for global vs project-specific
                if (category.isProjectSpecific) {
                    option.textContent += ' (Project)';
                } else if (category.isOverridden) {
                    option.textContent += ' (Modified)';
                }

                categoryFilterSelect.appendChild(option);
            }
        });

        // Restore selection if it still exists
        if (currentValue && Array.from(categoryFilterSelect.options).some(opt => opt.value === currentValue)) {
            categoryFilterSelect.value = currentValue;
        }

        console.log(`Populated ${categories.length} categories in filter dropdown`);
    }

    /**
     * Populate supplier filter dropdown
     * @param {Array} suppliers - Array of external suppliers
     * @param {Array} internalResources - Array of internal resources
     */
    populateSupplierFilterDropdown(suppliers, internalResources) {
        const supplierFilterSelect = document.getElementById('supplier-filter');
        if (!supplierFilterSelect) return;

        // Store current selection
        const currentValue = supplierFilterSelect.value;

        // Clear existing options (except first)
        while (supplierFilterSelect.children.length > 1) {
            supplierFilterSelect.removeChild(supplierFilterSelect.lastChild);
        }

        // Add external suppliers (only G2 role)
        suppliers.forEach(supplier => {
            if (supplier.id && supplier.name && supplier.status !== 'inactive' && supplier.role === 'G2') {
                const option = document.createElement('option');
                option.value = supplier.id;
                const rate = supplier.realRate || supplier.officialRate || 0;
                option.textContent = `${supplier.department} - ${supplier.name} (€${rate}/day)`;

                // Add visual indicator for global vs project-specific
                if (supplier.isProjectSpecific) {
                    option.textContent += ' - Project';
                } else if (supplier.isOverridden) {
                    option.textContent += ' - Modified';
                }

                supplierFilterSelect.appendChild(option);
            }
        });

        // Add internal resources (only G2 role)
        internalResources.forEach(resource => {
            if (resource.id && resource.name && resource.status !== 'inactive' && resource.role === 'G2') {
                const option = document.createElement('option');
                option.value = resource.id;
                const rate = resource.realRate || resource.officialRate || 0;
                option.textContent = `${resource.department} - ${resource.name} (€${rate}/day)`;

                // Add visual indicator for global vs project-specific
                if (resource.isProjectSpecific) {
                    option.textContent += ' - Project';
                } else if (resource.isOverridden) {
                    option.textContent += ' - Modified';
                }

                supplierFilterSelect.appendChild(option);
            }
        });

        // Restore selection if it still exists
        if (currentValue && Array.from(supplierFilterSelect.options).some(opt => opt.value === currentValue)) {
            supplierFilterSelect.value = currentValue;
        }

        const g2SuppliersFilter = suppliers.filter(s => s.role === 'G2' && s.status !== 'inactive');
        const g2InternalResourcesFilter = internalResources.filter(r => r.role === 'G2' && r.status !== 'inactive');
        console.log(`Populated ${g2SuppliersFilter.length} G2 suppliers and ${g2InternalResourcesFilter.length} G2 internal resources in filter dropdown`);
    }

    /**
     * Populate feature type filter dropdown
     * @param {Array} categories - Array of categories from merged config
     */
    populateFeatureTypeFilterDropdown(categories) {
        const featureTypeFilterSelect = document.getElementById('feature-type-filter');
        if (!featureTypeFilterSelect) return;

        // Store current selection
        const currentValue = featureTypeFilterSelect.value;

        // Clear existing options (except first)
        while (featureTypeFilterSelect.children.length > 1) {
            featureTypeFilterSelect.removeChild(featureTypeFilterSelect.lastChild);
        }

        // Collect all feature types from all categories
        const allFeatureTypes = [];
        categories.forEach(category => {
            if (category.featureTypes && category.featureTypes.length > 0) {
                category.featureTypes.forEach(featureType => {
                    if (featureType.id && featureType.name) {
                        allFeatureTypes.push({
                            id: featureType.id,
                            name: featureType.name,
                            categoryName: category.name
                        });
                    }
                });
            }
        });

        // Sort feature types by name
        allFeatureTypes.sort((a, b) => a.name.localeCompare(b.name));

        // Add feature types to dropdown
        allFeatureTypes.forEach(featureType => {
            const option = document.createElement('option');
            option.value = featureType.id;
            option.textContent = featureType.name;
            featureTypeFilterSelect.appendChild(option);
        });

        // Restore previous selection if it still exists
        if (currentValue) {
            featureTypeFilterSelect.value = currentValue;
        }

        console.log(`Populated ${allFeatureTypes.length} feature types in filter dropdown`);
    }

    /**
     * Clear dropdowns when no configuration data is available
     */
    clearModalDropdowns() {
        const categorySelect = document.getElementById('feature-category');
        const supplierSelect = document.getElementById('feature-supplier');

        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">No Categories Available</option>';
        }

        if (supplierSelect) {
            supplierSelect.innerHTML = '<option value="">No Suppliers Available</option>';
        }

        console.log('Modal dropdowns cleared - no configuration data available');
    }

    /**
     * Clear filter dropdowns when no configuration data is available
     */
    clearFilterDropdowns() {
        const categoryFilterSelect = document.getElementById('category-filter');
        const supplierFilterSelect = document.getElementById('supplier-filter');
        const featureTypeFilterSelect = document.getElementById('feature-type-filter');

        if (categoryFilterSelect) {
            categoryFilterSelect.innerHTML = '<option value="">All Categories</option>';
        }

        if (supplierFilterSelect) {
            supplierFilterSelect.innerHTML = '<option value="">All Suppliers</option>';
        }

        if (featureTypeFilterSelect) {
            featureTypeFilterSelect.innerHTML = '<option value="">All Feature Types</option>';
        }

        console.log('Filter dropdowns cleared - no configuration data available');
    }

    /**
     * Method to refresh all dropdowns when configuration changes
     */
    refreshDropdowns() {
        this.populateFilterDropdowns();

        // If modal is open, also refresh modal dropdowns
        const modal = document.getElementById('feature-modal');
        if (modal && modal.classList.contains('active')) {
            this.populateModalDropdowns();
        }
    }

    /**
     * Close the feature modal
     */
    closeFeatureModal() {
        console.log('Closing feature modal...');

        const modal = document.getElementById('feature-modal');
        if (modal) {
            modal.classList.remove('active');
            console.log('Modal closed');
        }

        // Reset editing state
        this.editingFeature = null;

        // Reset form
        this.resetFeatureForm();
    }

    /**
     * Reset the feature form
     */
    resetFeatureForm() {
        const form = document.getElementById('feature-form');
        if (form) {
            form.reset();
        }

        // Clear any validation errors
        this.clearFormErrors();

        // Ensure all input fields are enabled and editable (except readonly calculated field)
        const inputFields = form?.querySelectorAll('input, textarea, select');
        if (inputFields) {
            inputFields.forEach(field => {
                // Remove disabled attribute from all fields
                field.removeAttribute('disabled');
                
                // Only keep readonly on the calculated man days field
                if (field.id !== 'feature-calculated-man-days') {
                    field.removeAttribute('readonly');
                }
                
                // Ensure fields are not marked as invalid
                field.classList.remove('error');
            });
        }

        // Re-setup calculation listeners to ensure they work after reset
        // Use longer timeout and ensure DOM is ready
        setTimeout(() => {
            this.setupCalculationListeners();
        }, 300);

        console.log('Feature form reset with input fields enabled');
    }

    /**
     * Populate the feature form with data
     * @param {Object} feature - Feature data
     */
    populateFeatureForm(feature) {
        const fields = [
            'feature-id',
            'feature-description',
            'feature-category',
            'feature-type',
            'feature-supplier',
            'feature-real-man-days',
            'feature-expertise',
            'feature-risk-margin',
            'feature-calculated-man-days',
            'feature-notes'
        ];

        const mapping = {
            'feature-id': 'id',
            'feature-description': 'description',
            'feature-category': 'category',
            'feature-type': 'featureType',
            'feature-supplier': 'supplier',
            'feature-real-man-days': 'realManDays',
            'feature-expertise': 'expertise',
            'feature-risk-margin': 'riskMargin',
            'feature-calculated-man-days': 'manDays',
            'feature-notes': 'notes'
        };

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            const dataKey = mapping[fieldId];

            if (element && dataKey in feature) {
                element.value = feature[dataKey] || (dataKey === 'expertise' ? 100 : dataKey === 'riskMargin' ? 10 : '');
            }
        });

        // If editing a feature with a category, populate feature types for that category
        if (feature.category) {
            setTimeout(() => {
                this.populateFeatureTypeDropdown(feature.category);
            }, 50); // Small delay to ensure DOM is ready
        }

        // Trigger calculation update for display
        this.updateCalculatedManDays();
    }

    /**
     * FIXED: Save feature method with improved debugging and error handling
     */
    async saveFeature() {
        console.log('=== SAVEFEATURE START ===');

        try {
            const formData = this.getFormData();
            console.log('Form data:', formData);

            // Validate form data
            const validation = this.validateFeatureData(formData);
            console.log('Validation result:', validation);

            if (!validation.isValid) {
                console.log('Validation failed, showing errors');
                this.showFormErrors(validation.errors);
                return;
            }

            // Check for duplicate IDs
            if (!this.editingFeature || this.editingFeature.id !== formData.id) {
                if (this.isIdDuplicate(formData.id)) {
                    console.log('Duplicate ID detected');
                    this.showFormErrors({ id: 'Feature ID already exists' });
                    return;
                }
            }

            // Get current project
            const currentProject = window.app?.currentProject;
            console.log('Current project:', currentProject ? 'Found' : 'Not found');

            if (!currentProject) {
                throw new Error('No project loaded');
            }

            // Ensure features array exists
            if (!Array.isArray(currentProject.features)) {
                console.log('Creating features array');
                currentProject.features = [];
            }

            // Add timestamps
            const now = new Date().toISOString();

            if (this.editingFeature) {
                // Update existing feature
                console.log('Updating existing feature:', this.editingFeature.id);
                formData.created = this.editingFeature.created || now;
                formData.modified = now;

                const index = currentProject.features.findIndex(f => f.id === this.editingFeature.id);
                console.log('Feature index:', index);

                if (index !== -1) {
                    currentProject.features[index] = formData;
                    console.log('Feature updated at index:', index);
                } else {
                    console.warn('Feature not found for update, adding as new');
                    currentProject.features.push(formData);
                }
            } else {
                // Add new feature
                console.log('Adding new feature');
                formData.created = now;
                formData.modified = now;
                currentProject.features.push(formData);
                console.log('Feature added. Total features:', currentProject.features.length);
            }

            // CRITICAL: Mark project as dirty to trigger save
            console.log('Marking project as dirty');
            if (window.app && typeof window.app.markDirty === 'function') {
                window.app.markDirty();
                console.log('Project marked as dirty');
            } else {
                console.error('window.app.markDirty not available');
            }

            // CRITICAL: Force project save to ensure data persistence
            console.log('Triggering project save...');
            if (window.app && typeof window.app.saveProject === 'function') {
                try {
                    await window.app.saveProject();
                    console.log('Project saved successfully');
                } catch (saveError) {
                    console.error('Project save failed:', saveError);
                    // Continue anyway as the feature is in memory
                }
            }

            // Refresh UI
            console.log('Refreshing UI');
            this.refreshTable();

            if (window.app && typeof window.app.updateSummary === 'function') {
                window.app.updateSummary();
            }

            // Close modal
            this.closeFeatureModal();

            // Show success notification
            const action = this.editingFeature ? 'updated' : 'added';
            console.log('Feature operation successful:', action);

            if (window.NotificationManager) {
                NotificationManager.show(`Feature ${action} successfully`, 'success');
            }

            // ADDITIONAL: Debug current state
            console.log('Current project features count:', currentProject.features.length);
            console.log('Last feature:', currentProject.features[currentProject.features.length - 1]);

        } catch (error) {
            console.error('=== SAVEFEATURE ERROR ===');
            console.error('Save feature failed:', error);
            console.error('Stack trace:', error.stack);

            if (window.NotificationManager) {
                NotificationManager.show(`Failed to save feature: ${error.message}`, 'error');
            } else {
                alert(`Failed to save feature: ${error.message}`);
            }
        }

        console.log('=== SAVEFEATURE END ===');
    }

    /**
     * Delete a feature
     * @param {string} featureId - ID of feature to delete
     */
    async deleteFeature(featureId) {
        try {
            // Confirm deletion
            const confirmed = confirm('Are you sure you want to delete this feature? This action cannot be undone.');
            if (!confirmed) return;

            const currentProject = window.app?.currentProject;
            if (!currentProject) {
                throw new Error('No project loaded');
            }

            // Find and remove feature
            const index = currentProject.features.findIndex(f => f.id === featureId);
            if (index === -1) {
                throw new Error('Feature not found');
            }

            const feature = currentProject.features[index];
            currentProject.features.splice(index, 1);

            // Mark project as dirty and save
            if (window.app) {
                window.app.markDirty();
                try {
                    await window.app.saveProject();
                } catch (saveError) {
                    console.error('Auto-save after delete failed:', saveError);
                }
            }

            // Refresh UI
            this.refreshTable();
            if (window.app && typeof window.app.updateSummary === 'function') {
                window.app.updateSummary();
            }

            // Show success notification
            if (window.NotificationManager) {
                NotificationManager.show(`Feature "${feature.description}" deleted`, 'success');
            }

        } catch (error) {
            console.error('Delete feature failed:', error);
            if (window.NotificationManager) {
                NotificationManager.show(`Failed to delete feature: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Duplicate a feature
     * @param {Object} feature - Feature to duplicate
     */
    duplicateFeature(feature) {
        if (!feature) return;

        // Create copy with new ID and modified description
        const duplicate = {
            ...feature,
            id: this.generateFeatureId(),
            description: `${feature.description} (Copy)`,
            // Remove timestamps so new ones will be generated when saved
            created: undefined,
            modified: undefined
        };

        // Show the modal with the duplicated data (similar to supplier duplication)
        this.showDuplicateFeatureModal(duplicate);
    }

    /**
     * Show the duplicate feature modal
     * @param {Object} duplicateFeature - Feature data to populate the modal with
     */
    showDuplicateFeatureModal(duplicateFeature) {
        this.editingFeature = null; // This is a new feature, not editing existing one

        // Populate dropdowns before populating the form
        this.populateModalDropdowns();
        this.populateFeatureForm(duplicateFeature);

        const modal = document.getElementById('feature-modal');
        const modalTitle = document.getElementById('modal-title');

        if (modalTitle) {
            modalTitle.textContent = 'Duplicate Feature';
        }

        if (modal) {
            modal.classList.add('active');

            // Focus description field for editing the copied description
            const descField = document.getElementById('feature-description');
            if (descField) {
                setTimeout(() => {
                    descField.focus();
                    descField.select();
                }, 100);
            }
        }
    }

    /**
     * Get form data as object
     */
    getFormData() {
        const realManDays = parseFloat(document.getElementById('feature-real-man-days')?.value) || 0;
        const expertise = parseFloat(document.getElementById('feature-expertise')?.value) || 100;
        const riskMargin = parseFloat(document.getElementById('feature-risk-margin')?.value) || 0;
        
        // Calculate Man Days using the new formula: Real Man Days * (100 + Risk Margin) / Expertise
        const calculatedManDays = expertise > 0 ? (realManDays * (100 + riskMargin)) / expertise : 0;
        
        const data = {
            id: document.getElementById('feature-id')?.value?.trim() || '',
            description: document.getElementById('feature-description')?.value?.trim() || '',
            category: document.getElementById('feature-category')?.value || '',
            featureType: document.getElementById('feature-type')?.value || '',
            supplier: document.getElementById('feature-supplier')?.value || '',
            realManDays: realManDays,
            expertise: expertise,
            riskMargin: riskMargin,
            manDays: calculatedManDays, // This is now calculated, not input directly
            notes: document.getElementById('feature-notes')?.value?.trim() || ''
        };

        console.log('getFormData result:', data);
        return data;
    }

    /**
     * Validate feature data using ConfigurationManager
     * @param {Object} data - Feature data to validate
     */
    validateFeatureData(data) {
        const errors = {};

        console.log('Validating data:', data);

        // Required fields
        if (!data.id) {
            errors.id = 'Feature ID is required';
        } else if (!/^[A-Z0-9_-]+$/i.test(data.id)) {
            errors.id = 'Feature ID can only contain letters, numbers, underscores, and hyphens';
        }

        if (!data.description) {
            errors.description = 'Description is required';
        } else if (data.description.length < 3) {
            errors.description = 'Description must be at least 10 characters long';
        }

        if (!data.category) {
            errors.category = 'Category is required';
        } else {
            // Validate that category exists in merged configuration
            if (!this.isCategoryValid(data.category)) {
                errors.category = 'Please select a valid category from the configuration';
            }
        }

        if (!data.supplier) {
            errors.supplier = 'Supplier is required';
        } else {
            // Validate that supplier exists in merged configuration
            if (!this.isSupplierValid(data.supplier)) {
                errors.supplier = 'Please select a valid supplier from the configuration';
            }
        }

        if (!data.manDays || data.manDays <= 0) {
            errors.manDays = 'Man days must be greater than 0';
        } else if (data.manDays > 1000) {
            errors.manDays = 'Man days seems too high (max 1000)';
        }

        console.log('Validation errors:', errors);

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Verify that category is valid in merged configuration
     * @param {string} categoryId - Category ID to verify
     */
    isCategoryValid(categoryId) {
        const currentProject = window.app?.currentProject;
        if (!currentProject || !this.configManager) {
            return false;
        }

        return this.configManager.validateCategory(currentProject.config, categoryId);
    }

    /**
     * Verify that supplier is valid in merged configuration
     * @param {string} supplierId - Supplier ID to verify
     */
    isSupplierValid(supplierId) {
        const currentProject = window.app?.currentProject;
        if (!currentProject || !this.configManager) {
            return false;
        }

        return this.configManager.validateSupplier(currentProject.config, supplierId);
    }

    /**
     * Check if feature ID is duplicate
     * @param {string} id - ID to check
     */
    isIdDuplicate(id) {
        const currentProject = window.app?.currentProject;
        if (!currentProject || !currentProject.features) return false;

        return currentProject.features.some(feature =>
            feature.id.toLowerCase() === id.toLowerCase()
        );
    }

    /**
     * Show form validation errors
     * @param {Object} errors - Validation errors
     */
    showFormErrors(errors) {
        // Clear existing errors
        this.clearFormErrors();

        // Show new errors
        Object.keys(errors).forEach(field => {
            const fieldId = `feature-${field.replace('manDays', 'man-days')}`;
            const element = document.getElementById(fieldId);

            if (element) {
                element.classList.add('error');

                // Add error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = errors[field];

                element.parentNode.appendChild(errorDiv);
            }
        });

        // Focus first error field
        const firstErrorField = document.querySelector('#feature-form .error');
        if (firstErrorField) {
            firstErrorField.focus();
        }
    }

    /**
     * Clear form validation errors
     */
    clearFormErrors() {
        // Remove error classes
        document.querySelectorAll('#feature-form .error').forEach(el => {
            el.classList.remove('error');
        });

        // Remove error messages
        document.querySelectorAll('#feature-form .error-message').forEach(el => {
            el.remove();
        });
    }

    /**
     * Generate a new feature ID
     */
    generateFeatureId() {
        const currentProject = window.app?.currentProject;
        if (!currentProject || !currentProject.features) return 'BR-001';

        const existingIds = currentProject.features.map(f => f.id);
        let counter = 1;
        let newId;

        do {
            newId = `BR-${counter.toString().padStart(3, '0')}`;
            counter++;
        } while (existingIds.includes(newId));

        return newId;
    }

    /**
     * ENHANCED: Refresh the features table with better debugging
     */
    refreshTable() {
        console.log('=== REFRESH TABLE START ===');

        const currentProject = window.app?.currentProject;
        if (!currentProject) {
            console.log('No current project for table refresh');
            return;
        }

        console.log('Refreshing table with features:', currentProject.features?.length || 0);

        // Refresh filter dropdowns
        this.populateFilterDropdowns();

        // Apply current filters
        this.applyFilters();

        // Render table
        this.renderTable();

        console.log('=== REFRESH TABLE END ===');
    }

    /**
     * Apply current filters to features
     */
    applyFilters() {
        const currentProject = window.app?.currentProject;
        if (!currentProject || !currentProject.features) {
            this.filteredFeatures = [];
            return;
        }

        let features = [...currentProject.features];

        // Category filter
        const categoryFilter = document.getElementById('category-filter')?.value;
        if (categoryFilter) {
            features = features.filter(f => f.category === categoryFilter);
        }

        // Supplier filter
        const supplierFilter = document.getElementById('supplier-filter')?.value;
        if (supplierFilter) {
            features = features.filter(f => f.supplier === supplierFilter);
        }

        // Feature type filter
        const featureTypeFilter = document.getElementById('feature-type-filter')?.value;
        if (featureTypeFilter) {
            features = features.filter(f => f.featureType === featureTypeFilter);
        }

        // Search filter
        const searchTerm = document.getElementById('search-input')?.value?.toLowerCase();
        if (searchTerm) {
            features = features.filter(f =>
                f.id.toLowerCase().includes(searchTerm) ||
                f.description.toLowerCase().includes(searchTerm) ||
                (f.notes && f.notes.toLowerCase().includes(searchTerm))
            );
        }

        // Apply sorting
        features.sort((a, b) => {
            const field = this.currentSort.field;
            const direction = this.currentSort.direction;

            let aVal = a[field];
            let bVal = b[field];

            // Handle different data types
            if (field === 'manDays') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.filteredFeatures = features;
        console.log('Applied filters, filtered features:', this.filteredFeatures.length);
    }

    /**
     * Filter features (called by filter inputs)
     */
    filterFeatures() {
        this.refreshTable();
    }

    /**
     * Sort features by field
     * @param {string} field - Field to sort by
     */
    sortFeatures(field) {
        if (this.currentSort.field === field) {
            // Toggle direction
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New field
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        // Update sort indicators
        this.updateSortIndicators();

        // Refresh table
        this.refreshTable();
    }

    /**
     * Update sort indicators in table headers
     */
    updateSortIndicators() {
        // Reset all sort indicators
        document.querySelectorAll('[data-sort] i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });

        // Set current sort indicator
        const currentHeader = document.querySelector(`[data-sort="${this.currentSort.field}"]`);
        if (currentHeader) {
            const icon = currentHeader.querySelector('i');
            if (icon) {
                icon.className = this.currentSort.direction === 'asc'
                    ? 'fas fa-sort-up'
                    : 'fas fa-sort-down';
            }
        }
    }

    /**
     * Render the features table
     */
    renderTable() {
        const tbody = document.getElementById('features-tbody');
        if (!tbody) {
            console.warn('Features table body not found');
            return;
        }

        // Clear existing rows
        tbody.innerHTML = '';

        if (this.filteredFeatures.length === 0) {
            // Show empty state (7 columns now without category)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="7" class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <div class="empty-state-message">
                        No features found. Click "Add Feature" to get started.
                    </div>
                </td>
            `;
            tbody.appendChild(row);
            return;
        }

        // Render feature rows with expandable details
        this.filteredFeatures.forEach(feature => {
            console.log('Creating rows for feature:', feature.id);
            const mainRow = this.createFeatureRow(feature);
            const detailsRow = this.createFeatureDetailsRow(feature);
            
            console.log('Main row classes:', mainRow.className);
            console.log('Details row classes:', detailsRow.className);
            
            tbody.appendChild(mainRow);
            tbody.appendChild(detailsRow);
        });

        console.log(`Rendered ${this.filteredFeatures.length} feature rows`);
    }

    /**
     * Create a table row for a feature
     * @param {Object} feature - Feature data
     */
    createFeatureRow(feature) {
        const row = document.createElement('tr');
        row.dataset.featureId = feature.id;
        row.classList.add('feature-main-row');

        const currentProject = window.app?.currentProject;
        const categoryName = this.getCategoryName(currentProject, feature.category);
        const supplierName = this.getSupplierName(currentProject, feature.supplier);

        row.innerHTML = `
            <td class="expand-col">
                <button class="expand-btn" data-feature-id="${feature.id}" title="Expand details">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </td>
            <td class="feature-id">${this.escapeHtml(feature.id)}</td>
            <td class="feature-description">
                <div class="description-main">${this.escapeHtml(feature.description)}</div>
            </td>
            <td class="feature-supplier">${this.escapeHtml(supplierName)}</td>
            <td class="feature-real-man-days text-right">${feature.realManDays || 0}</td>
            <td class="feature-man-days text-right"><strong>${feature.manDays}</strong></td>
            <td class="feature-actions">
                <div class="row-actions">
                    <button class="btn btn-small btn-secondary edit-btn" 
                            data-action="edit" data-feature-id="${feature.id}" title="Edit Feature">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-secondary duplicate-btn" 
                            data-action="duplicate" data-feature-id="${feature.id}" title="Duplicate Feature">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-small btn-danger delete-btn" 
                            data-action="delete" data-feature-id="${feature.id}" title="Delete Feature">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        // Add event listeners for action buttons
        const editBtn = row.querySelector('.edit-btn');
        const duplicateBtn = row.querySelector('.duplicate-btn');
        const deleteBtn = row.querySelector('.delete-btn');
        const expandBtn = row.querySelector('.expand-btn');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.showEditFeatureModal(feature);
            });
        }

        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', () => {
                this.duplicateFeature(feature);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteFeature(feature.id);
            });
        }

        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                console.log('Expand button clicked for feature:', feature.id);
                this.toggleFeatureDetails(feature.id);
            });
        } else {
            console.log('Expand button not found for feature:', feature.id);
        }

        return row;
    }

    /**
     * Create expandable details row for a feature
     * @param {Object} feature - Feature data
     */
    createFeatureDetailsRow(feature) {
        const detailsRow = document.createElement('tr');
        detailsRow.dataset.featureId = feature.id;
        detailsRow.classList.add('feature-details-row', 'collapsed');

        const currentProject = window.app?.currentProject;
        const categoryName = this.getCategoryName(currentProject, feature.category);
        const featureTypeName = this.getFeatureTypeName(currentProject, feature.featureType);

        detailsRow.innerHTML = `
            <td colspan="7" class="feature-details">
                <div class="details-container">
                    <div class="details-grid">
                        <div class="detail-group">
                            <label>Category:</label>
                            <span class="detail-value">${this.escapeHtml(categoryName)}</span>
                        </div>
                        <div class="detail-group">
                            <label>Feature Type:</label>
                            <span class="detail-value">${this.escapeHtml(featureTypeName)}</span>
                        </div>
                        <div class="detail-group">
                            <label>Expertise Level:</label>
                            <span class="detail-value">${feature.expertise || 100}%</span>
                        </div>
                        <div class="detail-group">
                            <label>Risk Margin:</label>
                            <span class="detail-value">${feature.riskMargin || 0}%</span>
                        </div>
                        <div class="detail-group full-width">
                            <label>Notes:</label>
                            <div class="detail-value notes">${this.escapeHtml(feature.notes || 'No notes')}</div>
                        </div>
                        <div class="detail-group">
                            <label>Created:</label>
                            <span class="detail-value">${feature.created ? new Date(feature.created).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div class="detail-group">
                            <label>Modified:</label>
                            <span class="detail-value">${feature.modified ? new Date(feature.modified).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </td>
        `;

        return detailsRow;
    }

    /**
     * Toggle the visibility of feature details
     * @param {string} featureId - Feature ID
     */
    toggleFeatureDetails(featureId) {
        console.log('toggleFeatureDetails called with featureId:', featureId);
        
        // Find all rows with the matching feature ID
        const allRows = document.querySelectorAll(`tr[data-feature-id="${featureId}"]`);
        console.log('Found rows with matching feature ID:', allRows.length);
        
        let mainRow = null;
        let detailsRow = null;
        
        // Identify main row and details row
        allRows.forEach(row => {
            if (row.classList.contains('feature-main-row')) {
                mainRow = row;
            } else if (row.classList.contains('feature-details-row')) {
                detailsRow = row;
            }
        });
        
        const expandBtn = mainRow?.querySelector('.expand-btn i');

        console.log('Elements found:', {
            mainRow: !!mainRow,
            detailsRow: !!detailsRow,
            expandBtn: !!expandBtn
        });

        if (!mainRow || !detailsRow || !expandBtn) {
            console.log('Missing elements, returning early');
            return;
        }

        const isExpanded = !detailsRow.classList.contains('collapsed');
        console.log('Current state - isExpanded:', isExpanded);

        if (isExpanded) {
            // Collapse
            console.log('Collapsing...');
            detailsRow.classList.add('collapsed');
            expandBtn.classList.remove('fa-chevron-down');
            expandBtn.classList.add('fa-chevron-right');
            mainRow.classList.remove('expanded');
        } else {
            // Expand
            console.log('Expanding...');
            detailsRow.classList.remove('collapsed');
            expandBtn.classList.remove('fa-chevron-right');
            expandBtn.classList.add('fa-chevron-down');
            mainRow.classList.add('expanded');
        }
        
        console.log('After toggle - collapsed class present:', detailsRow.classList.contains('collapsed'));
    }

    /**
     * Get category name by ID using ConfigurationManager
     * @param {Object} project - Project data
     * @param {string} categoryId - Category ID
     */
    getCategoryName(project, categoryId) {
        if (!project || !categoryId || !this.configManager) return 'Uncategorized';

        return this.configManager.getCategoryDisplayName(project.config, categoryId);
    }

    /**
     * Get supplier name by ID using ConfigurationManager
     * @param {Object} project - Project data
     * @param {string} supplierId - Supplier ID
     */
    getSupplierName(project, supplierId) {
        if (!project || !supplierId || !this.configManager) return 'Unassigned';

        const projectConfig = this.configManager.getProjectConfig(project.config);
        
        // Check external suppliers first
        const supplier = projectConfig.suppliers.find(s => s.id === supplierId);
        if (supplier) {
            const rate = supplier.realRate || supplier.officialRate || 0;
            return `${supplier.department} - ${supplier.name} (€${rate}/day)`;
        }

        // Check internal resources
        const resource = projectConfig.internalResources.find(r => r.id === supplierId);
        if (resource) {
            const rate = resource.realRate || resource.officialRate || 0;
            return `${resource.department} - ${resource.name} (€${rate}/day)`;
        }

        return `Unknown Supplier (${supplierId})`;
    }

    /**
     * Get feature type name by ID using ConfigurationManager
     * @param {Object} project - Project data
     * @param {string} featureTypeId - Feature type ID
     */
    getFeatureTypeName(project, featureTypeId) {
        if (!project || !featureTypeId || !this.configManager) return 'No Feature Type';

        // Get project config
        const projectConfig = this.configManager.getProjectConfig(project.config);
        
        // Search through all categories to find the feature type
        for (const category of projectConfig.categories || []) {
            if (category.featureTypes) {
                const featureType = category.featureTypes.find(ft => ft.id === featureTypeId);
                if (featureType) {
                    return featureType.name;
                }
            }
        }
        
        return 'Unknown Feature Type';
    }

    /**
     * Generate CSV export of current filtered features
     */
    generateCSV() {
        if (this.filteredFeatures.length === 0) {
            return 'No features to export';
        }

        const currentProject = window.app?.currentProject;

        // CSV headers
        const headers = [
            'ID',
            'Description',
            'Category',
            'Feature Type',
            'Supplier',
            'Real Man Days',
            'Expertise %',
            'Risk Margin %',
            'Calculated Man Days',
            'Notes',
            'Created',
            'Modified'
        ];

        // Convert features to CSV rows
        const rows = this.filteredFeatures.map(feature => [
            this.escapeCsvField(feature.id || ''),
            this.escapeCsvField(feature.description || ''),
            this.escapeCsvField(this.getCategoryName(currentProject, feature.category)),
            this.escapeCsvField(this.getFeatureTypeName(currentProject, feature.featureType)),
            this.escapeCsvField(this.getSupplierName(currentProject, feature.supplier)),
            feature.realManDays || 0,
            feature.expertise || 100,
            feature.riskMargin || 0,
            feature.manDays || 0,
            this.escapeCsvField(feature.notes || ''),
            feature.created || '',
            feature.modified || ''
        ]);

        // Combine headers and rows
        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
    }

    /**
     * Escape CSV field
     * @param {string} field - Field to escape
     */
    escapeCsvField(field) {
        if (typeof field !== 'string') {
            field = String(field);
        }

        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return '"' + field.replace(/"/g, '""') + '"';
        }

        return field;
    }

    /**
     * Escape HTML characters (fallback implementation)
     * @param {string} text - Text to escape
     */
    escapeHtml(text) {
        if (typeof Helpers !== 'undefined' && Helpers.escapeHtml) {
            return Helpers.escapeHtml(text);
        }
        // Fallback implementation
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Make FeatureManager available globally
if (typeof window !== 'undefined') {
    window.FeatureManager = FeatureManager;
}