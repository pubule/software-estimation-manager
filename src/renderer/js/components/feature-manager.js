/**
 * Feature Manager - Handles all feature-related operations
 */

class FeatureManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
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
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.closeFeatureModal();
        });

        // Click outside modal to close
        document.getElementById('feature-modal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeFeatureModal();
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
     * Close the feature modal
     */
    closeFeatureModal() {
        const modal = document.getElementById('feature-modal');
        if (modal) {
            modal.classList.remove('active');
        }

        this.editingFeature = null;
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
     * Save feature (add or update)
     */
    async saveFeature() {
        try {
            const formData = this.getFormData();

            // Validate form data
            const validation = this.validateFeatureData(formData);
            if (!validation.isValid) {
                this.showFormErrors(validation.errors);
                return;
            }

            // Check for duplicate IDs
            if (!this.editingFeature || this.editingFeature.id !== formData.id) {
                if (this.isIdDuplicate(formData.id)) {
                    this.showFormErrors({ id: 'Feature ID already exists' });
                    return;
                }
            }

            // Get current project
            const currentProject = window.app?.currentProject;
            if (!currentProject) {
                throw new Error('No project loaded');
            }

            // Add timestamps
            const now = new Date().toISOString();
            if (this.editingFeature) {
                // Update existing feature
                formData.created = this.editingFeature.created || now;
                formData.modified = now;

                const index = currentProject.features.findIndex(f => f.id === this.editingFeature.id);
                if (index !== -1) {
                    currentProject.features[index] = formData;
                }
            } else {
                // Add new feature
                formData.created = now;
                formData.modified = now;
                currentProject.features.push(formData);
            }

            // Mark project as dirty
            window.app?.markDirty();

            // Refresh UI
            this.refreshTable();
            window.app?.updateSummary();

            // Close modal
            this.closeFeatureModal();

            // Show success notification
            const action = this.editingFeature ? 'updated' : 'added';
            NotificationManager.show(`Feature ${action} successfully`, 'success');

        } catch (error) {
            console.error('Save feature failed:', error);
            NotificationManager.show(`Failed to save feature: ${error.message}`, 'error');
        }
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

            // Mark project as dirty
            window.app?.markDirty();

            // Refresh UI
            this.refreshTable();
            window.app?.updateSummary();

            // Show success notification
            NotificationManager.show(`Feature "${feature.description}" deleted`, 'success');

        } catch (error) {
            console.error('Delete feature failed:', error);
            NotificationManager.show(`Failed to delete feature: ${error.message}`, 'error');
        }
    }

    /**
     * Get form data as object
     */
    getFormData() {
        return {
            id: document.getElementById('feature-id')?.value?.trim() || '',
            description: document.getElementById('feature-description')?.value?.trim() || '',
            category: document.getElementById('feature-category')?.value || '',
            supplier: document.getElementById('feature-supplier')?.value || '',
            manDays: parseFloat(document.getElementById('feature-man-days')?.value) || 0,
            notes: document.getElementById('feature-notes')?.value?.trim() || ''
        };
    }

    /**
     * Validate feature data
     * @param {Object} data - Feature data to validate
     */
    validateFeatureData(data) {
        const errors = {};

        // Required fields
        if (!data.id) {
            errors.id = 'Feature ID is required';
        } else if (!/^[A-Z0-9_-]+$/i.test(data.id)) {
            errors.id = 'Feature ID can only contain letters, numbers, underscores, and hyphens';
        }

        if (!data.description) {
            errors.description = 'Description is required';
        } else if (data.description.length < 10) {
            errors.description = 'Description must be at least 10 characters long';
        }

        if (!data.category) {
            errors.category = 'Category is required';
        }

        if (!data.supplier) {
            errors.supplier = 'Supplier is required';
        }

        if (!data.manDays || data.manDays <= 0) {
            errors.manDays = 'Man days must be greater than 0';
        } else if (data.manDays > 1000) {
            errors.manDays = 'Man days seems too high (max 1000)';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Check if feature ID is duplicate
     * @param {string} id - ID to check
     */
    isIdDuplicate(id) {
        const currentProject = window.app?.currentProject;
        if (!currentProject) return false;

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
        if (!currentProject) return 'FEAT-001';

        const existingIds = currentProject.features.map(f => f.id);
        let counter = 1;
        let newId;

        do {
            newId = `FEAT-${counter.toString().padStart(3, '0')}`;
            counter++;
        } while (existingIds.includes(newId));

        return newId;
    }

    /**
     * Refresh the features table
     */
    refreshTable() {
        const currentProject = window.app?.currentProject;
        if (!currentProject) return;

        // Apply current filters
        this.applyFilters();

        // Render table
        this.renderTable();
    }

    /**
     * Apply current filters to features
     */
    applyFilters() {
        const currentProject = window.app?.currentProject;
        if (!currentProject) {
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
        if (!tbody) return;

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
            <td class="feature-id">${Helpers.escapeHtml(feature.id)}</td>
            <td class="feature-description">
                <div class="description-main">${Helpers.escapeHtml(feature.description)}</div>
                ${feature.notes ? `<div class="description-notes">${Helpers.escapeHtml(feature.notes)}</div>` : ''}
            </td>
            <td class="feature-category">
                <span class="badge">${Helpers.escapeHtml(categoryName)}</span>
            </td>
            <td class="feature-supplier">${Helpers.escapeHtml(supplierName)}</td>
            <td class="feature-man-days text-right">${feature.manDays}</td>
            <td class="feature-notes">${Helpers.escapeHtml(feature.notes || '')}</td>
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
     * Get category name by ID
     * @param {Object} project - Project data
     * @param {string} categoryId - Category ID
     */
    getCategoryName(project, categoryId) {
        if (!project || !categoryId) return 'Uncategorized';
        const category = project.config?.categories?.find(c => c.id === categoryId);
        return category?.name || categoryId;
    }

    /**
     * Get supplier name by ID
     * @param {Object} project - Project data
     * @param {string} supplierId - Supplier ID
     */
    getSupplierName(project, supplierId) {
        if (!project || !supplierId) return 'Unassigned';

        // Check suppliers
        let supplier = project.config?.suppliers?.find(s => s.id === supplierId);
        if (supplier) return supplier.name;

        // Check internal resources
        supplier = project.config?.internalResources?.find(r => r.id === supplierId);
        if (supplier) return `${supplier.name}`;

        return supplierId;
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
}

// Make FeatureManager available globally
if (typeof window !== 'undefined') {
    window.FeatureManager = FeatureManager;
}