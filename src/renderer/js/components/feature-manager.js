/**
 * Feature Manager (Refactored)
 * Handles feature CRUD operations with improved structure and separation of concerns
 */

class FeatureManager extends BaseComponent {
    constructor(dataManager, configManager) {
        super('FeatureManager');
        
        this.dataManager = dataManager;
        this.configManager = configManager;
        
        // Connect to global state store (may not be available immediately)
        this.store = window.appStore;
        this.storeUnsubscribe = null;
        
        // State management
        this.state = {
            currentSort: { field: 'id', direction: 'asc' },
            filteredFeatures: [],
            editingFeature: null,
            isCalculating: false
        };

        // Modal management
        this.modal = null;
        
        // Throttled methods for performance
        this.updateCalculatedManDays = this.throttle(this._updateCalculatedManDays, 100);
        this.filterFeatures = this.debounce(this._filterFeatures, 300);
        
        // 🚨 CRITICAL FIX: Only setup subscription if store is available
        if (this.store) {
            this.setupStoreSubscription();
        } else {
            console.log('Store not available during FeatureManager construction, will attempt to connect later');
            this.connectToStoreWhenReady();
        }
    }
    /**
     * Attempt to connect to store when it becomes available
     */
    connectToStoreWhenReady() {
        // Check periodically for store availability
        const checkForStore = () => {
            if (window.appStore && !this.store) {
                console.log('Store now available, connecting FeatureManager...');
                this.store = window.appStore;
                this.setupStoreSubscription();
                return;
            }
            
            // Keep checking every 100ms for up to 5 seconds
            if (!this.store && (this.storeCheckAttempts || 0) < 50) {
                this.storeCheckAttempts = (this.storeCheckAttempts || 0) + 1;
                setTimeout(checkForStore, 100);
            } else if (!this.store) {
                console.warn('FeatureManager: Store not available after 5 seconds, will operate without store integration');
            }
        };
        
        setTimeout(checkForStore, 100);
    }
    
    /**
     * Setup store subscription for reactive feature updates
     */
    setupStoreSubscription() {
        // 🚨 CRITICAL FIX: Guard against undefined store
        if (!this.store) {
            console.warn('Store not available for FeatureManager subscription setup');
            return;
        }
        
        // PURE STATE MANAGER: Setup subscription to store changes
        this.storeUnsubscribe = this.store.subscribe((state, prevState) => {
            const currentProject = state.currentProject;
            const previousProject = prevState.currentProject;

            // 🚨 CRITICAL FIX: Deep comparison to prevent infinite loops
            const hasProjectChanged = this.hasProjectReallyChanged(currentProject, previousProject);
            
            if (hasProjectChanged) {
                console.log('FeatureManager: Project changed', true);
                this.handleProjectChange(currentProject);
            }
        });
    }

    /**
     * 🚨 CRITICAL: Deep comparison to prevent infinite loops
     * Compare projects by meaningful properties, not by reference
     */
    hasProjectReallyChanged(currentProject, previousProject) {
        // If both are null/undefined, no change
        if (!currentProject && !previousProject) return false;
        
        // If one is null and the other isn't, it's a change
        if (!currentProject || !previousProject) return true;
        
        // Compare key properties that would require UI refresh
        const currentKey = this.generateProjectComparisonKey(currentProject);
        const previousKey = this.generateProjectComparisonKey(previousProject);
        
        return currentKey !== previousKey;
    }
    
    /**
     * Generate a stable comparison key for projects
     * Only includes properties that matter for FeatureManager
     */
    generateProjectComparisonKey(project) {
        if (!project) return 'null';
        
        try {
            // Only compare properties that matter for feature management
            const keyProps = {
                id: project.project?.id,
                name: project.project?.name,
                featuresLength: project.features?.length || 0,
                // Create a stable hash of features for comparison
                featuresHash: project.features ? 
                    project.features.map(f => `${f.id}:${f.name}:${f.manDays}`).join('|') : '',
                configHash: project.config ? JSON.stringify({
                    suppliers: project.config.suppliers?.length || 0,
                    categories: project.config.categories?.length || 0,
                    internalResources: project.config.internalResources?.length || 0
                }) : ''
            };
            
            return JSON.stringify(keyProps);
        } catch (error) {
            console.warn('🛡️ FeatureManager comparison fallback:', error.message);
            // Fallback to simple comparison
            return `${project.project?.id}_${project.features?.length || 0}_${Date.now()}`;
        }
    }

    /**
     * Handle project changes from global state
     */
    handleProjectChange(newProject) {
        console.log('FeatureManager: Project changed', !!newProject);
        
        if (newProject) {
            // Project loaded - refresh UI with new features
            this.refreshTable();
            this.populateFilterDropdowns();
            this.updateProjectSummary();
        } else {
            // Project closed - clear UI
            this.renderEmptyState();
        }
    }

    /**
     * Handle feature changes within current project
     */
    handleFeaturesChange(newFeatures) {
        console.log('FeatureManager: Features changed', newFeatures?.length || 0);
        
        // Refresh UI to reflect feature changes
        this.refreshTable();
        this.populateFilterDropdowns();  
        this.updateProjectSummary();
        
        // Emit event for other components
        this.emit('features-changed', { features: newFeatures });
    }

    /**
     * Cleanup store subscription
     */
    destroy() {
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
            this.storeUnsubscribe = null;
        }
        
        if (super.destroy) {
            super.destroy();
        }
    }

    async onInit() {
        this.validateDependencies(['NotificationManager', 'Helpers']);
        
        await this.initializeModal();
        this.setupTableEventListeners();
        this.setupFilterEventListeners();
    }

    /**
     * Initialize feature modal
     */
    async initializeModal() {
        this.modal = new FeatureModal('feature-modal', {
            manager: this,
            configManager: this.configManager,
            closeOnOutsideClick: false
        });
        
        await this.modal.init();
        
        // Listen for modal events
        this.modal.on('onSubmit', (data) => this.handleFeatureSubmission(data));
    }

    /**
     * Set up table event listeners
     */
    setupTableEventListeners() {
        // Table sorting
        this.querySelectorAll('[data-sort]').forEach(header => {
            this.addEventListener(header, 'click', (e) => {
                const sortField = header.dataset.sort;
                this.sortFeatures(sortField);
            });
        });

        // Action buttons are handled by table row rendering
    }

    /**
     * Set up filter event listeners
     */
    setupFilterEventListeners() {
        const filterInputs = [
            'search-input',
            'category-filter', 
            'supplier-filter',
            'feature-type-filter'
        ];

        filterInputs.forEach(inputId => {
            const input = this.getElement(inputId);
            if (input) {
                const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
                this.addEventListener(input, eventType, () => this.filterFeatures());
            }
        });
    }

    /**
     * Show add feature modal
     */
    showAddFeatureModal() {
        this.state.editingFeature = null;
        this.modal.open({
            title: 'Add Feature',
            mode: 'add',
            feature: this.createNewFeature()
        });
    }

    /**
     * Show edit feature modal
     */
    showEditFeatureModal(feature) {
        this.state.editingFeature = feature;
        this.modal.open({
            title: 'Edit Feature',
            mode: 'edit',
            feature: { ...feature }
        });
    }

    /**
     * Duplicate feature
     */
    duplicateFeature(feature) {
        if (!feature) return;

        const newId = this.generateFeatureId();
        const duplicate = {
            ...feature,
            id: newId,
            description: `${feature.description} (Copy)`,
            created: undefined,
            modified: undefined
        };

        console.log('Duplicating feature:', {
            originalId: feature.id,
            newId: newId,
            duplicateId: duplicate.id
        });

        this.state.editingFeature = null;
        this.modal.open({
            title: 'Duplicate Feature',
            mode: 'add',
            feature: duplicate
        });
    }

    /**
     * Create new feature template
     */
    createNewFeature() {
        return {
            id: this.generateFeatureId(),
            description: '',
            category: '',
            featureType: '',
            supplier: '',
            realManDays: 0,
            expertise: 100,
            riskMargin: 10,
            manDays: 0,
            notes: ''
        };
    }

    /**
     * Handle feature form submission
     */
    async handleFeatureSubmission({ formData, result }) {
        try {
            console.log('Feature submission - formData ID:', formData.id);
            const processedData = await this.processFeatureData(formData);
            console.log('Feature submission - processedData ID:', processedData.id);
            const success = await this.saveFeatureToProject(processedData);
            
            if (success) {
                this.refreshTable();
                this.updateProjectSummary();
                this.emit('features-changed', { feature: processedData });
                
                const action = this.state.editingFeature ? 'updated' : 'added';
                NotificationManager.show(`Feature ${action} successfully`, 'success');
            }
        } catch (error) {
            this.handleError('Feature submission failed', error);
        }
    }


    /**
     * Process feature data before saving
     */
    async processFeatureData(formData) {
        // Calculate man days
        const calculatedManDays = this.calculateManDays(
            formData.realManDays,
            formData.expertise,
            formData.riskMargin
        );

        // Add timestamps
        const now = new Date().toISOString();
        
        return {
            ...formData,
            manDays: calculatedManDays,
            created: this.state.editingFeature?.created || now,
            modified: now
        };
    }

    /**
     * Save feature to current project
     */
    async saveFeatureToProject(featureData) {
        return await withLoading(
            LoadingOperations.FEATURE_SAVE,
            async () => {
                // Check if store is available
                if (!this.store || !this.store.getState) {
                    console.warn('Store not available for FeatureManager.saveFeatureToProject, aborting operation');
                    throw new Error('Store not available');
                }
                
                const state = this.store.getState();
                const currentProject = state.currentProject;
                if (!currentProject) {
                    throw new Error('No project loaded');
                }

                // Ensure features array exists
                if (!Array.isArray(currentProject.features)) {
                    currentProject.features = [];
                }

                // SAFETY: Ensure unique ID (backup protection against edge cases)
                if (!this.state.editingFeature) {
                    const existingIds = currentProject.features.map(f => f.id);
                    if (existingIds.includes(featureData.id)) {
                        console.warn('ID conflict detected (should not happen), generating new ID for feature:', featureData.id);
                        featureData.id = this.generateFeatureId();
                        console.log('New ID generated:', featureData.id);
                    }
                }

                // Validate for duplicates (excluding current feature being edited)
                console.log('Validating feature ID:', {
                    featureDataId: featureData.id,
                    editingFeature: this.state.editingFeature,
                    existingFeatureIds: currentProject.features.map(f => f.id)
                });
                
                const isDuplicate = currentProject.features.some(f => 
                    f.id === featureData.id && 
                    (!this.state.editingFeature || f.id !== this.state.editingFeature.id)
                );

                console.log('Duplicate check result:', {
                    isDuplicate,
                    matchingFeatures: currentProject.features.filter(f => f.id === featureData.id)
                });

                if (isDuplicate) {
                    throw new Error('Feature ID already exists');
                }

                // Use global state updateProject action instead of direct manipulation
                state.updateProject(project => {
                    const updatedProject = { ...project };
                    
                    if (!Array.isArray(updatedProject.features)) {
                        updatedProject.features = [];
                    }

                    if (this.state.editingFeature) {
                        // Update existing feature
                        const index = updatedProject.features.findIndex(f => 
                            f.id === this.state.editingFeature.id
                        );
                        
                        if (index !== -1) {
                            updatedProject.features[index] = featureData;
                        } else {
                            updatedProject.features.push(featureData);
                        }
                    } else {
                        // Add new feature
                        updatedProject.features.push(featureData);
                    }

                    return updatedProject;
                });

                // Global state automatically marks as dirty via updateProject action
                // Save project via ApplicationController
                if (window.app && window.app.saveProject) {
                    return await window.app.saveProject();
                }

                return true;
            },
            {
                showModal: false, // Features save quickly, no modal needed
                message: 'Saving feature...'
            }
        );
    }

    /**
     * Delete feature
     */
    async deleteFeature(featureId) {
        if (!confirm('Are you sure you want to delete this feature? This action cannot be undone.')) {
            return;
        }

        return await withLoading(
            LoadingOperations.FEATURE_DELETE,
            async () => {
                // Check if store is available
                if (!this.store || !this.store.getState) {
                    console.warn('Store not available for FeatureManager.deleteFeature, aborting operation');
                    throw new Error('Store not available');
                }
                
                const state = this.store.getState();
                const currentProject = state.currentProject;
                if (!currentProject) {
                    throw new Error('No project loaded');
                }

                const index = currentProject.features.findIndex(f => f.id === featureId);
                if (index === -1) {
                    throw new Error('Feature not found');
                }

                const feature = currentProject.features[index];

                // Use global state updateProject action instead of direct manipulation
                state.updateProject(project => {
                    const updatedProject = { ...project };
                    updatedProject.features = [...updatedProject.features];
                    updatedProject.features.splice(index, 1);
                    return updatedProject;
                });

                // Global state automatically marks as dirty via updateProject action
                // Save project via ApplicationController
                if (window.app && window.app.saveProject) {
                    await window.app.saveProject();
                }

                // UI updates will be handled by store subscription
                // No need to manually call refreshTable(), updateProjectSummary()
                
                // Still emit event for other components
                this.emit('features-changed', { deletedFeature: feature });

                NotificationManager.show(`Feature "${feature.description}" deleted`, 'success');
                
                return feature;
            },
            {
                showModal: false, // Delete operations are quick
                message: 'Deleting feature...'
            }
        );
    }

    /**
     * Calculate man days using the formula
     */
    calculateManDays(realManDays, expertise, riskMargin) {
        const real = parseFloat(realManDays) || 0;
        const exp = parseFloat(expertise) || 100;
        const risk = parseFloat(riskMargin) || 0;

        return exp > 0 ? (real * (100 + risk)) / exp : 0;
    }

    /**
     * Internal calculation update (throttled)
     */
    _updateCalculatedManDays() {
        const realManDaysInput = this.getElement('feature-real-man-days');
        const expertiseInput = this.getElement('feature-expertise');
        const riskMarginInput = this.getElement('feature-risk-margin');
        const calculatedInput = this.getElement('feature-calculated-man-days');

        if (!realManDaysInput || !expertiseInput || !riskMarginInput || !calculatedInput) {
            return;
        }

        const realManDays = parseFloat(realManDaysInput.value) || 0;
        const expertise = parseFloat(expertiseInput.value) || 100;
        const riskMargin = parseFloat(riskMarginInput.value) || 0;

        const calculatedManDays = this.calculateManDays(realManDays, expertise, riskMargin);
        calculatedInput.value = calculatedManDays.toFixed(2);
    }

    /**
     * Populate filter dropdowns
     */
    populateFilterDropdowns() {
        const currentProject = window.app?.currentProject;
        if (!currentProject || !this.configManager) {
            this.clearFilterDropdowns();
            return;
        }

        const projectConfig = this.configManager.getProjectConfig(currentProject.config);
        
        this.populateCategoryFilter(projectConfig.categories);
        this.populateSupplierFilter(projectConfig.suppliers, projectConfig.internalResources);
        this.populateFeatureTypeFilter(projectConfig.categories);
    }

    /**
     * Populate category filter dropdown
     */
    populateCategoryFilter(categories) {
        const dropdown = this.getElement('category-filter');
        if (!dropdown) return;

        const currentValue = dropdown.value;
        this.clearDropdownOptions(dropdown, 'All Categories');

        categories.forEach(category => {
            if (this.isValidCategory(category)) {
                const option = this.createCategoryOption(category);
                dropdown.appendChild(option);
            }
        });

        this.restoreDropdownValue(dropdown, currentValue);
    }

    /**
     * Populate supplier filter dropdown
     */
    populateSupplierFilter(suppliers, internalResources) {
        const dropdown = this.getElement('supplier-filter');
        if (!dropdown) return;

        const currentValue = dropdown.value;
        this.clearDropdownOptions(dropdown, 'All Suppliers');

        // Add G2 suppliers and internal resources
        const g2Suppliers = suppliers.filter(s => s.role === 'G2' && s.status !== 'inactive');
        const g2InternalResources = internalResources.filter(r => r.role === 'G2' && r.status !== 'inactive');

        g2Suppliers.forEach(supplier => {
            const option = this.createSupplierOption(supplier);
            dropdown.appendChild(option);
        });

        g2InternalResources.forEach(resource => {
            const option = this.createSupplierOption(resource, true);
            dropdown.appendChild(option);
        });

        this.restoreDropdownValue(dropdown, currentValue);
    }

    /**
     * Populate feature type filter dropdown
     */
    populateFeatureTypeFilter(categories) {
        const dropdown = this.getElement('feature-type-filter');
        if (!dropdown) return;

        const currentValue = dropdown.value;
        this.clearDropdownOptions(dropdown, 'All Feature Types');

        // Collect all feature types from categories
        const allFeatureTypes = [];
        categories.forEach(category => {
            if (category.featureTypes?.length > 0) {
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

        // Sort and add to dropdown
        allFeatureTypes.sort((a, b) => a.name.localeCompare(b.name));
        allFeatureTypes.forEach(featureType => {
            const option = this.createFeatureTypeOption(featureType);
            dropdown.appendChild(option);
        });

        this.restoreDropdownValue(dropdown, currentValue);
    }

    /**
     * Helper methods for dropdown management
     */
    clearDropdownOptions(dropdown, defaultText) {
        dropdown.innerHTML = `<option value="">${defaultText}</option>`;
    }

    restoreDropdownValue(dropdown, value) {
        if (value && Array.from(dropdown.options).some(opt => opt.value === value)) {
            dropdown.value = value;
        }
    }

    createCategoryOption(category) {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        
        if (category.isProjectSpecific) {
            option.textContent += ' (Project)';
        } else if (category.isOverridden) {
            option.textContent += ' (Modified)';
        }
        
        return option;
    }

    createSupplierOption(supplier, isInternal = false) {
        const option = document.createElement('option');
        option.value = supplier.id;
        const rate = supplier.realRate || supplier.officialRate || 0;
        option.textContent = `${supplier.department} - ${supplier.name} (€${rate}/day)`;
        
        if (isInternal) {
            option.textContent += ' - Internal';
        }
        
        if (supplier.isProjectSpecific) {
            option.textContent += ' - Project';
        } else if (supplier.isOverridden) {
            option.textContent += ' - Modified';
        }
        
        return option;
    }

    createFeatureTypeOption(featureType) {
        const option = document.createElement('option');
        option.value = featureType.id;
        option.textContent = featureType.name;
        return option;
    }

    isValidCategory(category) {
        return category.id && category.name && category.status !== 'inactive';
    }

    /**
     * Clear filter dropdowns when no configuration data available
     */
    clearFilterDropdowns() {
        const dropdowns = [
            { id: 'category-filter', text: 'All Categories' },
            { id: 'supplier-filter', text: 'All Suppliers' },
            { id: 'feature-type-filter', text: 'All Feature Types' }
        ];

        dropdowns.forEach(({ id, text }) => {
            const dropdown = this.getElement(id);
            if (dropdown) {
                this.clearDropdownOptions(dropdown, text);
            }
        });
    }

    /**
     * Refresh dropdowns when configuration changes
     */
    refreshDropdowns() {
        this.populateFilterDropdowns();
    }

    /**
     * Internal filter features (debounced)
     */
    _filterFeatures() {
        const currentProject = window.app?.currentProject;
        if (!currentProject?.features) {
            this.state.filteredFeatures = [];
            this.renderTable();
            this.updateProjectSummary();
            return;
        }

        let features = [...currentProject.features];

        // Apply filters
        features = this.applyFilters(features);
        
        // Apply sorting
        features = this.applySorting(features);

        this.state.filteredFeatures = features;
        this.renderTable();
        this.updateProjectSummary();
    }

    /**
     * Apply current filter settings
     */
    applyFilters(features) {
        const filters = this.getCurrentFilters();
        
        return features.filter(feature => {
            return this.matchesSearchFilter(feature, filters.search) &&
                   this.matchesCategoryFilter(feature, filters.category) &&
                   this.matchesSupplierFilter(feature, filters.supplier) &&
                   this.matchesFeatureTypeFilter(feature, filters.featureType);
        });
    }

    /**
     * Get current filter values
     */
    getCurrentFilters() {
        return {
            search: this.getElement('search-input')?.value?.toLowerCase() || '',
            category: this.getElement('category-filter')?.value || '',
            supplier: this.getElement('supplier-filter')?.value || '',
            featureType: this.getElement('feature-type-filter')?.value || ''
        };
    }

    /**
     * Filter matching methods
     */
    matchesSearchFilter(feature, searchTerm) {
        if (!searchTerm) return true;
        
        return feature.id.toLowerCase().includes(searchTerm) ||
               feature.description.toLowerCase().includes(searchTerm) ||
               (feature.notes && feature.notes.toLowerCase().includes(searchTerm));
    }

    matchesCategoryFilter(feature, categoryId) {
        return !categoryId || feature.category === categoryId;
    }

    matchesSupplierFilter(feature, supplierId) {
        return !supplierId || feature.supplier === supplierId;
    }

    matchesFeatureTypeFilter(feature, featureTypeId) {
        return !featureTypeId || feature.featureType === featureTypeId;
    }

    /**
     * Apply sorting to features
     */
    applySorting(features) {
        const { field, direction } = this.state.currentSort;

        return features.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            // Handle different data types
            if (field === 'manDays' || field === 'realManDays') {
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
    }

    /**
     * Sort features by field
     */
    sortFeatures(field) {
        if (this.state.currentSort.field === field) {
            // Toggle direction
            this.state.currentSort.direction = 
                this.state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New field
            this.state.currentSort.field = field;
            this.state.currentSort.direction = 'asc';
        }

        this.updateSortIndicators();
        this.filterFeatures(); // This will re-apply sorting
    }

    /**
     * Update sort indicators in table headers
     */
    updateSortIndicators() {
        // Reset all indicators
        this.querySelectorAll('[data-sort] i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });

        // Set current indicator
        const currentHeader = this.querySelector(`[data-sort="${this.state.currentSort.field}"]`);
        if (currentHeader) {
            const icon = currentHeader.querySelector('i');
            if (icon) {
                icon.className = this.state.currentSort.direction === 'asc'
                    ? 'fas fa-sort-up'
                    : 'fas fa-sort-down';
            }
        }
    }

    /**
     * Refresh table display
     */
    refreshTable() {
        this.populateFilterDropdowns();
        this.filterFeatures();
    }

    /**
     * Render features table
     */
    renderTable() {
        const tbody = this.getElement('features-tbody');
        if (!tbody) {
            console.warn('Features table body not found');
            return;
        }

        tbody.innerHTML = '';

        if (this.state.filteredFeatures.length === 0) {
            this.renderEmptyState(tbody);
            return;
        }

        this.state.filteredFeatures.forEach(feature => {
            const mainRow = this.createFeatureRow(feature);
            const detailsRow = this.createFeatureDetailsRow(feature);
            
            tbody.appendChild(mainRow);
            tbody.appendChild(detailsRow);
        });
    }

    /**
     * Render empty state
     */
    renderEmptyState(tbody) {
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
    }

    /**
     * Create feature table row
     */
    createFeatureRow(feature) {
        const row = document.createElement('tr');
        row.dataset.featureId = feature.id;
        row.classList.add('feature-main-row');

        const currentProject = window.app?.currentProject;
        const categoryName = this.getCategoryName(currentProject, feature.category);
        const supplierName = this.getSupplierName(currentProject, feature.supplier);

        row.innerHTML = this.generateFeatureRowHTML(feature, categoryName, supplierName);
        this.attachFeatureRowEventListeners(row, feature);

        return row;
    }

    /**
     * Generate feature row HTML
     */
    generateFeatureRowHTML(feature, categoryName, supplierName) {
        return `
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
    }

    /**
     * Attach event listeners to feature row
     */
    attachFeatureRowEventListeners(row, feature) {
        const editBtn = row.querySelector('.edit-btn');
        const duplicateBtn = row.querySelector('.duplicate-btn');
        const deleteBtn = row.querySelector('.delete-btn');
        const expandBtn = row.querySelector('.expand-btn');

        if (editBtn) {
            this.addEventListener(editBtn, 'click', () => this.showEditFeatureModal(feature));
        }

        if (duplicateBtn) {
            this.addEventListener(duplicateBtn, 'click', () => this.duplicateFeature(feature));
        }

        if (deleteBtn) {
            this.addEventListener(deleteBtn, 'click', () => this.deleteFeature(feature.id));
        }

        if (expandBtn) {
            this.addEventListener(expandBtn, 'click', () => this.toggleFeatureDetails(feature.id));
        }
    }

    /**
     * Create feature details row
     */
    createFeatureDetailsRow(feature) {
        const detailsRow = document.createElement('tr');
        detailsRow.dataset.featureId = feature.id;
        detailsRow.classList.add('feature-details-row', 'collapsed');

        const currentProject = window.app?.currentProject;
        const categoryName = this.getCategoryName(currentProject, feature.category);
        const featureTypeName = this.getFeatureTypeName(currentProject, feature.featureType);

        detailsRow.innerHTML = this.generateFeatureDetailsHTML(feature, categoryName, featureTypeName);

        return detailsRow;
    }

    /**
     * Generate feature details HTML
     */
    generateFeatureDetailsHTML(feature, categoryName, featureTypeName) {
        return `
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
    }

    /**
     * Toggle feature details visibility
     */
    toggleFeatureDetails(featureId) {
        const allRows = this.querySelectorAll(`tr[data-feature-id="${featureId}"]`);
        
        let mainRow = null;
        let detailsRow = null;
        
        allRows.forEach(row => {
            if (row.classList.contains('feature-main-row')) {
                mainRow = row;
            } else if (row.classList.contains('feature-details-row')) {
                detailsRow = row;
            }
        });
        
        const expandBtn = mainRow?.querySelector('.expand-btn i');

        if (!mainRow || !detailsRow || !expandBtn) {
            return;
        }

        const isExpanded = !detailsRow.classList.contains('collapsed');

        if (isExpanded) {
            // Collapse
            detailsRow.classList.add('collapsed');
            expandBtn.classList.remove('fa-chevron-down');
            expandBtn.classList.add('fa-chevron-right');
            mainRow.classList.remove('expanded');
        } else {
            // Expand
            detailsRow.classList.remove('collapsed');
            expandBtn.classList.remove('fa-chevron-right');
            expandBtn.classList.add('fa-chevron-down');
            mainRow.classList.add('expanded');
        }
    }

    /**
     * Name resolution methods using ConfigurationManager
     */
    getCategoryName(project, categoryId) {
        if (!project || !categoryId || !this.configManager) return 'Uncategorized';
        return this.configManager.getCategoryDisplayName(project.config, categoryId);
    }

    getSupplierName(project, supplierId) {
        if (!project || !supplierId || !this.configManager) return 'Unassigned';
        return this.configManager.getSupplierDisplayName(project.config, supplierId);
    }

    getFeatureTypeName(project, featureTypeId) {
        if (!project || !featureTypeId || !this.configManager) return 'No Feature Type';

        const projectConfig = this.configManager.getProjectConfig(project.config);
        
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
     * Generate feature ID
     */
    generateFeatureId() {
        const currentProject = window.app?.currentProject;
        if (!currentProject?.features || currentProject.features.length === 0) {
            return 'BR-001';
        }

        // Get the last feature added (last in the array)
        const lastFeature = currentProject.features[currentProject.features.length - 1];
        
        if (!lastFeature?.id) {
            return 'BR-001';
        }

        // Extract the numeric part from the last feature ID
        const match = lastFeature.id.match(/BR-(\d+)/);
        if (match) {
            const lastNumber = parseInt(match[1], 10);
            const nextNumber = lastNumber + 1;
            return `BR-${nextNumber.toString().padStart(3, '0')}`;
        }

        // If the last ID doesn't match the expected format, fall back to finding the first available
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
     * Generate CSV export
     */
    generateCSV() {
        if (this.state.filteredFeatures.length === 0) {
            return 'No features to export';
        }

        const currentProject = window.app?.currentProject;
        
        const headers = [
            'ID', 'Description', 'Category', 'Feature Type', 'Supplier',
            'Real Man Days', 'Expertise %', 'Risk Margin %', 'Calculated Man Days',
            'Notes', 'Created', 'Modified'
        ];

        const rows = this.state.filteredFeatures.map(feature => [
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

        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
    }

    /**
     * Escape CSV field
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
     * Escape HTML characters
     */
    escapeHtml(text) {
        if (typeof Helpers !== 'undefined' && Helpers.escapeHtml) {
            return Helpers.escapeHtml(text);
        }
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update project summary
     */
    updateProjectSummary() {
        // 🚨 CRITICAL FIX: Throttle to prevent infinite loops
        if (this._summaryUpdateThrottled) {
            console.warn('🛡️ FeatureManager: Summary update throttled to prevent loop');
            return;
        }
        
        this._summaryUpdateThrottled = true;
        setTimeout(() => {
            this._summaryUpdateThrottled = false;
        }, 100); // 100ms throttle
        
        if (window.app && typeof window.app.updateSummary === 'function') {
            window.app.updateSummary();
        }
    }
}

/**
 * Feature Modal - Specialized modal for feature management
 */
class FeatureModal extends ModalManagerBase {
    constructor(modalId, options = {}) {
        super(modalId, options);
        
        this.manager = options.manager;
        this.configManager = options.configManager;
        this.currentMode = 'add'; // 'add' or 'edit'
    }

    async onInit() {
        await super.onInit();
        this.setupCalculationListeners();
        this.setupDependentDropdowns();
    }

    /**
     * Set up calculation event listeners
     */
    setupCalculationListeners() {
        const calculationFields = [
            'feature-real-man-days',
            'feature-expertise', 
            'feature-risk-margin'
        ];

        calculationFields.forEach(fieldId => {
            const field = this.getElement(fieldId);
            if (field) {
                this.addEventListener(field, 'input', () => {
                    this.manager.updateCalculatedManDays();
                });
            }
        });
    }

    /**
     * Set up dependent dropdown behavior
     */
    setupDependentDropdowns() {
        const categorySelect = this.getElement('feature-category');
        if (categorySelect) {
            this.addEventListener(categorySelect, 'change', (e) => {
                this.populateFeatureTypeDropdown(e.target.value);
                this.clearRealManDays();
            });
        }

        const featureTypeSelect = this.getElement('feature-type');
        if (featureTypeSelect) {
            this.addEventListener(featureTypeSelect, 'change', (e) => {
                this.updateRealManDaysFromFeatureType(e.target);
            });
        }
    }

    /**
     * Populate modal with feature data
     */
    populateModal(data) {
        this.currentMode = data.mode || 'add';
        this.setTitle(data.title || 'Feature');
        
        // Populate dropdowns first
        this.populateDropdowns();
        
        // Then populate form with feature data
        if (data.feature) {
            this.populateForm(data.feature);
            
            // Make ID readonly for duplicate mode to prevent accidental changes
            const idField = this.getElement('feature-id');
            if (idField && data.title === 'Duplicate Feature') {
                idField.readOnly = true;
                idField.style.backgroundColor = '#f5f5f5';
                idField.title = 'ID auto-generated for duplicate feature';
            } else if (idField) {
                idField.readOnly = false;
                idField.style.backgroundColor = '';
                idField.title = '';
            }
        }
    }

    /**
     * Populate all dropdowns
     */
    populateDropdowns() {
        const currentProject = window.app?.currentProject;
        if (!currentProject || !this.configManager) {
            return;
        }

        const projectConfig = this.configManager.getProjectConfig(currentProject.config);
        
        this.populateCategoryDropdown(projectConfig.categories);
        this.populateSupplierDropdown(projectConfig.suppliers, projectConfig.internalResources);
    }

    /**
     * Populate category dropdown
     */
    populateCategoryDropdown(categories) {
        const categorySelect = this.getElement('feature-category');
        if (!categorySelect) return;

        categorySelect.innerHTML = '<option value="">Select Category</option>';

        categories.forEach(category => {
            if (category.id && category.name && category.status !== 'inactive') {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;

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
    }

    /**
     * Populate supplier dropdown
     */
    populateSupplierDropdown(suppliers, internalResources) {
        const supplierSelect = this.getElement('feature-supplier');
        if (!supplierSelect) return;

        supplierSelect.innerHTML = '<option value="">Select Supplier</option>';

        // Add external suppliers (G2 only)
        suppliers.forEach(supplier => {
            if (supplier.id && supplier.name && supplier.status !== 'inactive' && supplier.role === 'G2') {
                const option = this.createSupplierOption(supplier, false);
                supplierSelect.appendChild(option);
            }
        });

        // Add internal resources (G2 only)
        internalResources.forEach(resource => {
            if (resource.id && resource.name && resource.status !== 'inactive' && resource.role === 'G2') {
                const option = this.createSupplierOption(resource, true);
                supplierSelect.appendChild(option);
            }
        });
    }

    /**
     * Create supplier option element
     */
    createSupplierOption(supplier, isInternal) {
        const option = document.createElement('option');
        option.value = supplier.id;
        const rate = supplier.realRate || supplier.officialRate || 0;
        option.textContent = `${supplier.department} - ${supplier.name} (€${rate}/day)`;

        if (isInternal) {
            option.title = `Internal Resource - ${supplier.role} - ${supplier.department}`;
        } else {
            option.title = `External Supplier - Rate: €${supplier.officialRate}/day`;
        }

        if (supplier.isProjectSpecific) {
            option.textContent += ' - Project';
            option.style.fontStyle = 'italic';
        } else if (supplier.isOverridden) {
            option.textContent += ' - Modified';
            option.style.fontWeight = 'bold';
        }

        return option;
    }

    /**
     * Populate feature type dropdown based on category
     */
    populateFeatureTypeDropdown(categoryId) {
        const featureTypeSelect = this.getElement('feature-type');
        if (!featureTypeSelect) return;

        featureTypeSelect.innerHTML = '<option value="">Select Feature Type</option>';

        if (!categoryId) {
            featureTypeSelect.disabled = true;
            return;
        }

        const currentProject = window.app?.currentProject;
        if (!currentProject || !this.configManager) {
            featureTypeSelect.disabled = true;
            return;
        }

        const projectConfig = this.configManager.getProjectConfig(currentProject.config);
        const selectedCategory = projectConfig.categories.find(cat => cat.id === categoryId);
        
        if (!selectedCategory?.featureTypes) {
            featureTypeSelect.disabled = true;
            return;
        }

        featureTypeSelect.disabled = false;
        selectedCategory.featureTypes.forEach(featureType => {
            if (featureType.id && featureType.name) {
                const option = document.createElement('option');
                option.value = featureType.id;
                option.textContent = featureType.name;
                option.title = `${featureType.description || featureType.name} (Average: ${featureType.averageMDs} MDs)`;
                option.dataset.averageMds = featureType.averageMDs;
                featureTypeSelect.appendChild(option);
            }
        });
    }

    /**
     * Update real man days from selected feature type
     */
    updateRealManDaysFromFeatureType(featureTypeSelect) {
        const selectedOption = featureTypeSelect.selectedOptions[0];
        const realManDaysField = this.getElement('feature-real-man-days');
        
        if (!realManDaysField) return;
        
        if (selectedOption?.dataset.averageMds) {
            const averageMDs = parseFloat(selectedOption.dataset.averageMds);
            realManDaysField.value = averageMDs;
            realManDaysField.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (!selectedOption?.value) {
            realManDaysField.value = '';
            realManDaysField.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /**
     * Clear real man days field
     */
    clearRealManDays() {
        const realManDaysField = this.getElement('feature-real-man-days');
        if (realManDaysField) {
            realManDaysField.value = '';
            realManDaysField.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /**
     * Populate form with feature data
     */
    populateForm(feature) {
        const fieldMappings = {
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

        Object.entries(fieldMappings).forEach(([fieldId, dataKey]) => {
            const element = this.getElement(fieldId);
            if (element && dataKey in feature) {
                let value = feature[dataKey];
                
                // Handle default values
                if (dataKey === 'expertise' && !value) value = 100;
                if (dataKey === 'riskMargin' && !value) value = 10;
                
                element.value = value || '';
            }
        });

        // Populate feature types for the selected category
        if (feature.category) {
            setTimeout(() => {
                this.populateFeatureTypeDropdown(feature.category);
                
                // Set feature type after dropdown is populated
                setTimeout(() => {
                    const featureTypeSelect = this.getElement('feature-type');
                    if (featureTypeSelect && feature.featureType) {
                        featureTypeSelect.value = feature.featureType;
                    }
                }, 50);
            }, 50);
        }

        // Trigger calculation update
        setTimeout(() => this.manager.updateCalculatedManDays(), 100);
    }

    /**
     * Get form data
     */
    getFormData() {
        const realManDays = parseFloat(this.getElement('feature-real-man-days')?.value) || 0;
        const expertise = parseFloat(this.getElement('feature-expertise')?.value) || 100;
        const riskMargin = parseFloat(this.getElement('feature-risk-margin')?.value) || 0;

        return {
            id: this.getElement('feature-id')?.value?.trim() || '',
            description: this.getElement('feature-description')?.value?.trim() || '',
            category: this.getElement('feature-category')?.value || '',
            featureType: this.getElement('feature-type')?.value || '',
            supplier: this.getElement('feature-supplier')?.value || '',
            realManDays: realManDays,
            expertise: expertise,
            riskMargin: riskMargin,
            notes: this.getElement('feature-notes')?.value?.trim() || ''
        };
    }

    /**
     * Validate form data
     */
    validateFormData(data) {
        const errors = {};

        console.log('Validating feature data:', data);

        // Define critical fields for intelligent validation
        const criticalFields = {
            id: !data.id || data.id.trim() === '',
            description: !data.description || data.description.trim() === '' || data.description.length < 3,
            category: !data.category || data.category === '',
            supplier: !data.supplier || data.supplier === '',
            realManDays: !data.realManDays || data.realManDays <= 0
        };

        // Count invalid critical fields
        const invalidCriticalFields = Object.values(criticalFields).filter(Boolean).length;
        const totalCriticalFields = Object.keys(criticalFields).length;

        console.log(`Invalid critical fields: ${invalidCriticalFields}/${totalCriticalFields}`);

        // Intelligent validation: if most critical fields are invalid, show generic message
        if (invalidCriticalFields >= 4) {
            console.log('Most fields are invalid, showing generic message');
            
            // Show "Compila questo campo" for all invalid critical fields
            if (criticalFields.id) {
                errors.id = 'Compila questo campo';
            }
            if (criticalFields.description) {
                errors.description = 'Compila questo campo';
            }
            if (criticalFields.category) {
                errors.category = 'Compila questo campo';
            }
            if (criticalFields.supplier) {
                errors.supplier = 'Compila questo campo';
            }
            if (criticalFields.realManDays) {
                errors.realManDays = 'Compila questo campo';
            }

            return {
                isValid: false,
                errors
            };
        }

        // Standard validation for individual fields when only few are invalid
        console.log('Standard validation - showing specific messages');

        // Validate ID
        if (!data.id) {
            errors.id = 'Feature ID is required';
        } else if (!/^[A-Z0-9_-]+$/i.test(data.id)) {
            errors.id = 'Feature ID can only contain letters, numbers, underscores, and hyphens';
        }

        // Validate description
        if (!data.description) {
            errors.description = 'Description is required';
        } else if (data.description.length < 3) {
            errors.description = 'Description must be at least 3 characters long';
        }

        // Validate category
        if (!data.category) {
            errors.category = 'Category is required';
        }

        // Validate supplier
        if (!data.supplier) {
            errors.supplier = 'Supplier is required';
        }

        // Validate real man days
        if (!data.realManDays || data.realManDays <= 0) {
            errors.realManDays = 'Real Man Days must be greater than 0';
        }

        console.log('Feature validation errors:', errors);

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Process form submission
     */
    async processSubmission(formData) {
        try {
            // Form data is already processed in getFormData
            return { success: true, data: formData };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Reset modal
     */
    resetModal() {
        super.resetModal();
        
        // Reset feature type dropdown
        const featureTypeSelect = this.getElement('feature-type');
        if (featureTypeSelect) {
            featureTypeSelect.innerHTML = '<option value="">Select Feature Type</option>';
            featureTypeSelect.disabled = true;
        }
    }

    getSubmitButtonText() {
        return this.currentMode === 'edit' ? 'Update Feature' : 'Add Feature';
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.FeatureManager = FeatureManager;
    window.FeatureModal = FeatureModal;
}