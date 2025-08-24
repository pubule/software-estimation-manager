/**
 * Assumptions Manager
 * Manages project assumptions with CRUD operations
 */
class AssumptionsManager extends BaseComponent {
    constructor() {
        super('AssumptionsManager');
        
        // State management
        this.state = {
            currentSort: { field: 'id', direction: 'asc' },
            filteredAssumptions: [],
            editingAssumption: null
        };

        // Modal management
        this.modal = null;
        
        // Throttled methods for performance
        this.filterAssumptions = this.debounce(this._filterAssumptions, 300);
    }

    async onInit() {
        this.validateDependencies(['NotificationManager', 'Helpers']);
        
        await this.initializeModal();
        this.setupEventListeners();
        this.refreshTable();
    }

    /**
     * Initialize modal for assumptions
     */
    async initializeModal() {
        this.modal = new AssumptionModal('assumption-modal', {
            manager: this,
            closeOnOutsideClick: false
        });
        
        await this.modal.init();
        
        // Listen for modal events
        this.modal.on('onSubmit', (data) => this.handleAssumptionSubmission(data));
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Add button
        const addBtn = this.getElement('add-assumption-btn');
        if (addBtn) {
            this.addEventListener(addBtn, 'click', () => this.showAddAssumptionModal());
        }

        // Search input
        const searchInput = this.getElement('assumptions-search-input');
        if (searchInput) {
            this.addEventListener(searchInput, 'input', () => this.filterAssumptions());
        }

        // Filter dropdowns
        const typeFilter = this.getElement('assumption-type-filter');
        if (typeFilter) {
            this.addEventListener(typeFilter, 'change', () => this.filterAssumptions());
        }

        const impactFilter = this.getElement('assumption-impact-filter');
        if (impactFilter) {
            this.addEventListener(impactFilter, 'change', () => this.filterAssumptions());
        }

        // Table sorting
        this.querySelectorAll('#assumptions-table [data-sort]').forEach(header => {
            this.addEventListener(header, 'click', (e) => {
                const sortField = header.dataset.sort;
                this.sortAssumptions(sortField);
            });
        });
    }

    /**
     * Show add assumption modal
     */
    showAddAssumptionModal() {
        this.state.editingAssumption = null;
        this.modal.open({
            title: 'Add Assumption',
            mode: 'add',
            assumption: this.createNewAssumption()
        });
    }

    /**
     * Show edit assumption modal
     */
    showEditAssumptionModal(assumption) {
        this.state.editingAssumption = assumption;
        this.modal.open({
            title: 'Edit Assumption',
            mode: 'edit',
            assumption: { ...assumption }
        });
    }

    /**
     * Duplicate assumption
     */
    duplicateAssumption(assumption) {
        if (!assumption) return;

        const newId = this.generateAssumptionId();
        const duplicate = {
            ...assumption,
            id: newId,
            description: `${assumption.description} (Copy)`,
            created: undefined,
            modified: undefined
        };

        this.state.editingAssumption = null;
        this.modal.open({
            title: 'Duplicate Assumption',
            mode: 'add',
            assumption: duplicate
        });
    }

    /**
     * Create new assumption template
     */
    createNewAssumption() {
        return {
            id: this.generateAssumptionId(),
            description: '',
            type: '',
            impact: '',
            notes: ''
        };
    }

    /**
     * Generate assumption ID
     */
    generateAssumptionId() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject?.assumptions || currentProject.assumptions.length === 0) {
            return 'ASS-001';
        }

        // Get the last assumption added (last in the array)
        const lastAssumption = currentProject.assumptions[currentProject.assumptions.length - 1];
        
        if (!lastAssumption?.id) {
            return 'ASS-001';
        }

        // Extract the numeric part from the last assumption ID
        const match = lastAssumption.id.match(/ASS-(\d+)/);
        if (match) {
            const lastNumber = parseInt(match[1], 10);
            const nextNumber = lastNumber + 1;
            return `ASS-${nextNumber.toString().padStart(3, '0')}`;
        }

        // If the last ID doesn't match the expected format, fall back to finding the first available
        const existingIds = currentProject.assumptions.map(a => a.id);
        let counter = 1;
        let newId;

        do {
            newId = `ASS-${counter.toString().padStart(3, '0')}`;
            counter++;
        } while (existingIds.includes(newId));

        return newId;
    }

    /**
     * Handle assumption form submission
     */
    async handleAssumptionSubmission({ formData, result }) {
        try {
            const processedData = await this.processAssumptionData(formData);
            const success = await this.saveAssumptionToProject(processedData);
            
            if (success) {
                this.refreshTable();
                this.updateSummary();
                this.emit('assumptions-changed', { assumption: processedData });
                
                const action = this.state.editingAssumption ? 'updated' : 'added';
                NotificationManager.show(`Assumption ${action} successfully`, 'success');
            }
        } catch (error) {
            this.handleError('Assumption submission failed', error);
        }
    }

    /**
     * Process assumption data before saving
     */
    async processAssumptionData(formData) {
        const now = new Date().toISOString();
        
        return {
            ...formData,
            created: this.state.editingAssumption?.created || now,
            modified: now
        };
    }

    /**
     * Save assumption to current project
     */
    async saveAssumptionToProject(assumptionData) {
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject) {
            throw new Error('No project loaded');
        }

        // Ensure assumptions array exists
        if (!Array.isArray(currentProject.assumptions)) {
            currentProject.assumptions = [];
        }

        // Ensure unique ID
        if (!this.state.editingAssumption) {
            const existingIds = currentProject.assumptions.map(a => a.id);
            if (existingIds.includes(assumptionData.id)) {
                assumptionData.id = this.generateAssumptionId();
            }
        }

        if (this.state.editingAssumption) {
            // Update existing assumption
            const index = currentProject.assumptions.findIndex(a => 
                a.id === this.state.editingAssumption.id
            );
            
            if (index !== -1) {
                currentProject.assumptions[index] = assumptionData;
            } else {
                currentProject.assumptions.push(assumptionData);
            }
        } else {
            // Add new assumption
            currentProject.assumptions.push(assumptionData);
        }

        // Mark project as dirty and save
        if (window.app) {
            window.app.markDirty();
            return await window.app.saveProject();
        }

        return true;
    }

    /**
     * Delete assumption
     */
    async deleteAssumption(assumptionId) {
        if (!confirm('Are you sure you want to delete this assumption? This action cannot be undone.')) {
            return;
        }

        try {
            const currentProject = StateSelectors.getCurrentProject();
            if (!currentProject) {
                throw new Error('No project loaded');
            }

            const index = currentProject.assumptions.findIndex(a => a.id === assumptionId);
            if (index === -1) {
                throw new Error('Assumption not found');
            }

            const assumption = currentProject.assumptions[index];
            currentProject.assumptions.splice(index, 1);

            // Mark project as dirty and save
            if (window.app) {
                window.app.markDirty();
                await window.app.saveProject();
            }

            this.refreshTable();
            this.updateSummary();
            this.emit('assumptions-changed', { deletedAssumption: assumption });

            NotificationManager.show(`Assumption "${assumption.description}" deleted`, 'success');

        } catch (error) {
            this.handleError('Delete assumption failed', error);
        }
    }

    /**
     * Internal filter assumptions (debounced)
     */
    _filterAssumptions() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject?.assumptions) {
            this.state.filteredAssumptions = [];
            this.renderTable();
            return;
        }

        let assumptions = [...currentProject.assumptions];

        // Apply filters
        assumptions = this.applyFilters(assumptions);
        
        // Apply sorting
        assumptions = this.applySorting(assumptions);

        this.state.filteredAssumptions = assumptions;
        this.renderTable();
    }

    /**
     * Apply current filter settings
     */
    applyFilters(assumptions) {
        const filters = this.getCurrentFilters();
        
        return assumptions.filter(assumption => {
            return this.matchesSearchFilter(assumption, filters.search) &&
                   this.matchesTypeFilter(assumption, filters.type) &&
                   this.matchesImpactFilter(assumption, filters.impact);
        });
    }

    /**
     * Get current filter values
     */
    getCurrentFilters() {
        return {
            search: this.getElement('assumptions-search-input')?.value?.toLowerCase() || '',
            type: this.getElement('assumption-type-filter')?.value || '',
            impact: this.getElement('assumption-impact-filter')?.value || ''
        };
    }

    /**
     * Filter matching methods
     */
    matchesSearchFilter(assumption, searchTerm) {
        if (!searchTerm) return true;
        
        return assumption.id.toLowerCase().includes(searchTerm) ||
               assumption.description.toLowerCase().includes(searchTerm) ||
               (assumption.notes && assumption.notes.toLowerCase().includes(searchTerm));
    }

    matchesTypeFilter(assumption, type) {
        return !type || assumption.type === type;
    }

    matchesImpactFilter(assumption, impact) {
        return !impact || assumption.impact === impact;
    }

    /**
     * Apply sorting to assumptions
     */
    applySorting(assumptions) {
        const { field, direction } = this.state.currentSort;

        return assumptions.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Sort assumptions by field
     */
    sortAssumptions(field) {
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
        this.filterAssumptions(); // This will re-apply sorting
    }

    /**
     * Update sort indicators in table headers
     */
    updateSortIndicators() {
        // Reset all indicators
        this.querySelectorAll('#assumptions-table [data-sort] i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });

        // Set current indicator
        const currentHeader = this.querySelector(`#assumptions-table [data-sort="${this.state.currentSort.field}"]`);
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
        this.filterAssumptions();
        this.updateSummary();
    }

    /**
     * Render assumptions table
     */
    renderTable() {
        const tbody = this.getElement('assumptions-tbody');
        if (!tbody) {
            console.warn('Assumptions table body not found');
            return;
        }

        tbody.innerHTML = '';

        if (this.state.filteredAssumptions.length === 0) {
            this.renderEmptyState(tbody);
            return;
        }

        this.state.filteredAssumptions.forEach(assumption => {
            const row = this.createAssumptionRow(assumption);
            tbody.appendChild(row);
        });
    }

    /**
     * Render empty state
     */
    renderEmptyState(tbody) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <div class="empty-state-message">
                    No assumptions found. Click "Add Assumption" to get started.
                </div>
            </td>
        `;
        tbody.appendChild(row);
    }

    /**
     * Create assumption table row
     */
    createAssumptionRow(assumption) {
        const row = document.createElement('tr');
        row.dataset.assumptionId = assumption.id;

        row.innerHTML = this.generateAssumptionRowHTML(assumption);
        this.attachAssumptionRowEventListeners(row, assumption);

        return row;
    }

    /**
     * Generate assumption row HTML
     */
    generateAssumptionRowHTML(assumption) {
        const impactClass = this.getImpactClass(assumption.impact);
        const typeIcon = this.getTypeIcon(assumption.type);
        
        return `
            <td class="assumption-id">${this.escapeHtml(assumption.id)}</td>
            <td class="assumption-description">
                <div class="description-main">${this.escapeHtml(assumption.description)}</div>
            </td>
            <td class="assumption-type">
                <span class="type-badge">
                    <i class="${typeIcon}"></i> ${this.escapeHtml(assumption.type)}
                </span>
            </td>
            <td class="assumption-impact">
                <span class="impact-badge ${impactClass}">${this.escapeHtml(assumption.impact)}</span>
            </td>
            <td class="assumption-notes">
                <div class="notes-preview">${this.escapeHtml(assumption.notes || '-')}</div>
            </td>
            <td class="assumption-actions">
                <div class="row-actions">
                    <button class="btn btn-small btn-secondary edit-btn" 
                            data-action="edit" data-assumption-id="${assumption.id}" title="Edit Assumption">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-secondary duplicate-btn" 
                            data-action="duplicate" data-assumption-id="${assumption.id}" title="Duplicate Assumption">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-small btn-danger delete-btn" 
                            data-action="delete" data-assumption-id="${assumption.id}" title="Delete Assumption">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
    }

    /**
     * Get impact badge class
     */
    getImpactClass(impact) {
        switch (impact) {
            case 'High': return 'impact-high';
            case 'Medium': return 'impact-medium';
            case 'Low': return 'impact-low';
            default: return '';
        }
    }

    /**
     * Get type icon
     */
    getTypeIcon(type) {
        switch (type) {
            case 'Technical': return 'fas fa-cog';
            case 'Business': return 'fas fa-briefcase';
            case 'Resource': return 'fas fa-users';
            case 'Timeline': return 'fas fa-clock';
            default: return 'fas fa-question';
        }
    }

    /**
     * Attach event listeners to assumption row
     */
    attachAssumptionRowEventListeners(row, assumption) {
        const editBtn = row.querySelector('.edit-btn');
        const duplicateBtn = row.querySelector('.duplicate-btn');
        const deleteBtn = row.querySelector('.delete-btn');

        if (editBtn) {
            this.addEventListener(editBtn, 'click', () => this.showEditAssumptionModal(assumption));
        }

        if (duplicateBtn) {
            this.addEventListener(duplicateBtn, 'click', () => this.duplicateAssumption(assumption));
        }

        if (deleteBtn) {
            this.addEventListener(deleteBtn, 'click', () => this.deleteAssumption(assumption.id));
        }
    }

    /**
     * Update summary
     */
    updateSummary() {
        const totalAssumptions = this.state.filteredAssumptions.length;
        const highImpact = this.state.filteredAssumptions.filter(a => a.impact === 'High').length;
        const mediumImpact = this.state.filteredAssumptions.filter(a => a.impact === 'Medium').length;
        const lowImpact = this.state.filteredAssumptions.filter(a => a.impact === 'Low').length;

        const totalElement = this.getElement('total-assumptions');
        const highElement = this.getElement('high-impact-assumptions');
        const mediumElement = this.getElement('medium-impact-assumptions');
        const lowElement = this.getElement('low-impact-assumptions');

        if (totalElement) totalElement.textContent = totalAssumptions;
        if (highElement) highElement.textContent = highImpact;
        if (mediumElement) mediumElement.textContent = mediumImpact;
        if (lowElement) lowElement.textContent = lowImpact;
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
}

/**
 * Assumption Modal - Specialized modal for assumption management
 */
class AssumptionModal extends ModalManagerBase {
    constructor(modalId, options = {}) {
        super(modalId, options);
        
        this.manager = options.manager;
        this.currentMode = 'add'; // 'add' or 'edit'
    }

    /**
     * Populate modal with assumption data
     */
    populateModal(data) {
        this.currentMode = data.mode || 'add';
        this.setTitle(data.title || 'Assumption');
        
        // Populate form with assumption data
        if (data.assumption) {
            this.populateForm(data.assumption);
        }
    }

    /**
     * Populate form with assumption data
     */
    populateForm(assumption) {
        const fieldMappings = {
            'assumption-id': 'id',
            'assumption-description': 'description',
            'assumption-type': 'type',
            'assumption-impact': 'impact',
            'assumption-notes': 'notes'
        };

        Object.entries(fieldMappings).forEach(([fieldId, dataKey]) => {
            const element = this.getElement(fieldId);
            if (element && dataKey in assumption) {
                element.value = assumption[dataKey] || '';
            }
        });
    }

    /**
     * Get form data
     */
    getFormData() {
        return {
            id: this.getElement('assumption-id')?.value?.trim() || '',
            description: this.getElement('assumption-description')?.value?.trim() || '',
            type: this.getElement('assumption-type')?.value || '',
            impact: this.getElement('assumption-impact')?.value || '',
            notes: this.getElement('assumption-notes')?.value?.trim() || ''
        };
    }

    /**
     * Validate form data
     */
    validateFormData(data) {
        const errors = {};

        // Validate ID
        if (!data.id) {
            errors.id = 'Assumption ID is required';
        } else if (!/^[A-Z0-9_-]+$/i.test(data.id)) {
            errors.id = 'Assumption ID can only contain letters, numbers, underscores, and hyphens';
        }

        // Validate description
        if (!data.description) {
            errors.description = 'Description is required';
        } else if (data.description.length < 3) {
            errors.description = 'Description must be at least 3 characters long';
        }

        // Validate type
        if (!data.type) {
            errors.type = 'Type is required';
        }

        // Validate impact
        if (!data.impact) {
            errors.impact = 'Impact is required';
        }

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
    }
}