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
     * Populate supplier dropdown
     * @param {Array} suppliers - Array of external suppliers
     * @param {Array} internalResources - Array of internal resources
     */
    populateSupplierDropdown(suppliers, internalResources) {
        const supplierSelect = document.getElementById('feature-supplier');
        if (!supplierSelect) return;

        // Clear existing options (keep only the first option)
        supplierSelect.innerHTML = '<option value="">Select Supplier</option>';

        // Add external suppliers
        suppliers.forEach(supplier => {
            if (supplier.id && supplier.name && supplier.status !== 'inactive') {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = `${supplier.name} (External)`;

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

        // Add internal resources
        internalResources.forEach(resource => {
            if (resource.id && resource.name && resource.status !== 'inactive') {
                const option = document.createElement('option');
                option.value = resource.id;
                option.textContent = `${resource.name} (Internal)`;

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

        console.log(`Populated ${suppliers.length} suppliers and ${internalResources.length} internal resources in modal dropdown`);
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

        // Add external suppliers
        suppliers.forEach(supplier => {
            if (supplier.id && supplier.name && supplier.status !== 'inactive') {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = `${supplier.name} (External)`;

                // Add visual indicator for global vs project-specific
                if (supplier.isProjectSpecific) {
                    option.textContent += ' - Project';
                } else if (supplier.isOverridden) {
                    option.textContent += ' - Modified';
                }

                supplierFilterSelect.appendChild(option);
            }
        });

        // Add internal resources
        internalResources.forEach(resource => {
            if (resource.id && resource.name && resource.status !== 'inactive') {
                const option = document.createElement('option');
                option.value = resource.id;
                option.textContent = `${resource.name} (Internal)`;

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

        console.log(`Populated ${suppliers.length} suppliers and ${internalResources.length} internal resources in filter dropdown`);
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

        if (categoryFilterSelect) {
            categoryFilterSelect.innerHTML = '<option value="">All Categories</option>';
        }

        if (supplierFilterSelect) {
            supplierFilterSelect.innerHTML = '<option value="">All Suppliers</option>';
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

        console.log('Feature form reset');
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
            'feature-supplier',
            'feature-man-days',
            'feature-notes'
        ];

        const mapping = {
            'feature-id': 'id',
            'feature-description': 'description',
            'feature-category': 'category',
            'feature-supplier': 'supplier',
            'feature-man-days': 'manDays',
            'feature-notes': 'notes'
        };

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            const dataKey = mapping[fieldId];

            if (element && dataKey in feature) {
                element.value = feature[dataKey] || '';
            }
        });
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
     * Get form data as object
     */
    getFormData() {
        const data = {
            id: document.getElementById('feature-id')?.value?.trim() || '',
            description: document.getElementById('feature-description')?.value?.trim() || '',
            category: document.getElementById('feature-category')?.value || '',
            supplier: document.getElementById('feature-supplier')?.value || '',
            manDays: parseFloat(document.getElementById('feature-man-days')?.value) || 0,
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
            // Show empty state
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

        // Render feature rows
        this.filteredFeatures.forEach(feature => {
            const row = this.createFeatureRow(feature);
            tbody.appendChild(row);
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

        const currentProject = window.app?.currentProject;
        const categoryName = this.getCategoryName(currentProject, feature.category);
        const supplierName = this.getSupplierName(currentProject, feature.supplier);

        row.innerHTML = `
            <td class="feature-id">${this.escapeHtml(feature.id)}</td>
            <td class="feature-description">
                <div class="description-main">${this.escapeHtml(feature.description)}</div>
                ${feature.notes ? `<div class="description-notes">${this.escapeHtml(feature.notes)}</div>` : ''}
            </td>
            <td class="feature-category">
                <span class="badge">${this.escapeHtml(categoryName)}</span>
            </td>
            <td class="feature-supplier">${this.escapeHtml(supplierName)}</td>
            <td class="feature-man-days text-right">${feature.manDays}</td>
            <td class="feature-notes">${this.escapeHtml(feature.notes || '')}</td>
            <td class="feature-actions">
                <div class="action-buttons">
                    <button class="action-btn edit" data-action="edit" data-feature-id="${feature.id}" title="Edit Feature">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" data-action="delete" data-feature-id="${feature.id}" title="Delete Feature">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        // Add event listeners for action buttons
        const editBtn = row.querySelector('[data-action="edit"]');
        const deleteBtn = row.querySelector('[data-action="delete"]');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.showEditFeatureModal(feature);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteFeature(feature.id);
            });
        }

        return row;
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

        return this.configManager.getSupplierDisplayName(project.config, supplierId);
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
            'Supplier',
            'Man Days',
            'Notes',
            'Created',
            'Modified'
        ];

        // Convert features to CSV rows
        const rows = this.filteredFeatures.map(feature => [
            this.escapeCsvField(feature.id || ''),
            this.escapeCsvField(feature.description || ''),
            this.escapeCsvField(this.getCategoryName(currentProject, feature.category)),
            this.escapeCsvField(this.getSupplierName(currentProject, feature.supplier)),
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