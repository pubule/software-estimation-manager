/**
 * Internal Resources Configuration Manager - Table Layout
 * Gestisce la configurazione delle risorse interne con layout tabellare
 */
class InternalResourcesConfigManager {
    constructor(configManager, app) {
        this.configManager = configManager;
        this.app = app;
        this.currentScope = 'global';
        this.containerId = 'resources-content';

        // Stato tabella
        this.resources = [];
        this.filteredResources = [];
        this.displayedResources = [];
        this.itemsPerPage = 50;
        this.currentPage = 0;
        this.isLoading = false;
        this.editingRowId = null;

        // Filtri e ordinamento
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.sortField = 'name';
        this.sortDirection = 'asc';

        // Flags to prevent double operations
        this.isResetting = false;
        
        // Default internal resources with the provided values
        this.defaultInternalResources = [
            {
                id: 'developer-g2',
                name: 'Developer',
                role: 'G2',
                department: 'IT',
                realRate: 624,
                officialRate: 624,
                isGlobal: true
            },
            {
                id: 'developer-g2-ro',
                name: 'Developer',
                role: 'G2',
                department: 'RO',
                realRate: 362,
                officialRate: 352,
                isGlobal: true
            },
            {
                id: 'tech-analyst-it',
                name: 'Tech Analyst',
                role: 'Tech Analyst',
                department: 'IT',
                realRate: 624,
                officialRate: 624,
                isGlobal: true
            },
            {
                id: 'tech-analyst-ro',
                name: 'Tech Analyst',
                role: 'Tech Analyst',
                department: 'RO',
                realRate: 352,
                officialRate: 352,
                isGlobal: true
            }
        ];

        // Bind methods to window for global access
        this.exposeGlobalMethods();
    }

    exposeGlobalMethods() {
        window.showResourcesModal = this.showModal.bind(this);
        window.closeResourcesModal = this.closeModal.bind(this);
        window.saveResourcesModal = this.saveResource.bind(this);
        window.editResource = this.startEditingRow.bind(this);
        window.deleteResource = this.deleteResource.bind(this);
        window.disableResource = this.disableResource.bind(this);
        window.duplicateResource = this.duplicateResource.bind(this);
    }

    /**
     * Carica e renderizza la configurazione risorse interne
     */
    async loadResourcesConfig() {
        const contentDiv = document.getElementById(this.containerId);
        if (!contentDiv) {
            console.error('Resources content container not found');
            return;
        }

        // Ensure default internal resources exist
        this.ensureDefaultInternalResources();

        const resourceData = this.getResourceData();
        this.resources = this.currentScope === 'global' ? resourceData.global : resourceData.project;

        contentDiv.innerHTML = this.generateResourcesHTML(resourceData);
        this.setupEventListeners();
        this.applyFiltersAndSort();
        this.loadInitialItems();
    }

    /**
     * Ensure default internal resources exist in global configuration
     */
    ensureDefaultInternalResources(forceReset = false) {
        console.log('ensureDefaultInternalResources called, forceReset:', forceReset);
        
        if (!this.configManager || !this.configManager.globalConfig) {
            console.log('ConfigManager or globalConfig not available');
            return;
        }
        
        const existingResources = this.configManager.globalConfig.internalResources;
        console.log('Existing internal resources:', existingResources?.length || 0);
        
        if (!existingResources || existingResources.length === 0 || forceReset) {
            console.log('Initializing default internal resources:', this.defaultInternalResources.length);
            console.log('Force reset:', forceReset);
            this.configManager.globalConfig.internalResources = [...this.defaultInternalResources];
            this.configManager.saveGlobalConfig();
            console.log('Default internal resources initialized successfully');
        } else {
            console.log('Internal resources already exist, skipping initialization');
        }
    }

    /**
     * Genera l'HTML per la sezione risorse interne con layout tabellare
     */
    generateResourcesHTML(data) {
        return `
            <div class="resources-table-container">
                ${this.generateScopeSelector(data)}
                ${this.generateTableControls()}
                ${this.generateResourcesTable()}
                ${this.generateResourceModal()}
            </div>
        `;
    }

    /**
     * Setup degli event listener principali
     */
    setupEventListeners() {
        console.log('Setting up event listeners');
        this.cleanupEventListeners();

        this.setupScopeTabEvents();
        this.setupTableControls();
        this.setupTableEvents();
        this.setupScrollInfinito();
        this.setupKeyboardShortcuts();
    }

    cleanupEventListeners() {
        // Rimuovi listener dai controlli principali
        const addBtn = document.getElementById('add-resource-btn');
        if (addBtn) {
            addBtn.replaceWith(addBtn.cloneNode(true));
        }

        const bulkBtn = document.getElementById('bulk-actions-btn');
        if (bulkBtn) {
            bulkBtn.replaceWith(bulkBtn.cloneNode(true));
        }

        const selectAllCheckbox = document.getElementById('select-all-resources');
        if (selectAllCheckbox) {
            selectAllCheckbox.replaceWith(selectAllCheckbox.cloneNode(true));
        }

        const searchInput = document.getElementById('resource-search');
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
        }

        // Rimuovi listener dai filtri
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.replaceWith(chip.cloneNode(true));
        });

        // Rimuovi listener dai tab
        document.querySelectorAll('.resources-config-container .scope-tab').forEach(tab => {
            tab.replaceWith(tab.cloneNode(true));
        });
    }

    /**
     * Setup eventi per i tab di scope
     */
    setupScopeTabEvents() {
        document.querySelectorAll('.resources-config-container .scope-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (tab.disabled) return;
                this.switchScope(tab.dataset.scope);
            });
        });
    }

    /**
     * Setup eventi per i controlli della tabella
     */
    setupTableControls() {
        // Ricerca
        const searchInput = document.getElementById('resource-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value.trim();
                    this.applyFiltersAndSort();
                    this.loadInitialItems();
                    this.updateFilterCounts();
                }, 300);
            });
        }

        // Filtri
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                if (filter === this.currentFilter) return;

                // Aggiorna UI filtri
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');

                this.currentFilter = filter;
                this.applyFiltersAndSort();
                this.loadInitialItems();
            });
        });

        // Bottoni azioni principali
        document.getElementById('add-resource-btn')?.addEventListener('click', () => {
            this.showModal(this.currentScope);
        });

        document.getElementById('bulk-actions-btn')?.addEventListener('click', () => {
            this.showBulkActionsMenu();
        });

        // Select all checkbox
        document.getElementById('select-all-resources')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        // Reset to default button
        document.getElementById('reset-internal-resources-btn')?.addEventListener('click', () => {
            this.resetToDefaultInternalResources();
        });
    }

    /**
     * Setup eventi per la tabella
     */
    setupTableEvents() {
        const table = document.querySelector('.resources-table');
        if (!table) return;

        // Ordinamento colonne
        table.addEventListener('click', (e) => {
            const sortableHeader = e.target.closest('.sortable');
            if (sortableHeader) {
                this.handleSort(sortableHeader.dataset.field);
            }
        });

        // Delegazione eventi per righe dinamiche
        const tbody = document.getElementById('resources-table-body');
        if (tbody) {
            tbody.addEventListener('click', this.handleTableClick.bind(this));
            tbody.addEventListener('change', this.handleTableChange.bind(this));
            tbody.addEventListener('input', this.handleTableInput.bind(this));
            tbody.addEventListener('keydown', this.handleTableKeydown.bind(this));
        }
    }

    /**
     * Gestisce ordinamento
     */
    handleSort(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }

        this.applyFiltersAndSort();
        this.loadInitialItems();
        this.updateSortHeaders();
    }

    /**
     * Gestisce click nella tabella
     */
    handleTableClick(e) {
        const target = e.target;
        const row = target.closest('.resource-row');
        if (!row) return;

        const resourceId = row.dataset.resourceId;

        // Edit button
        if (target.closest('.edit-btn')) {
            e.preventDefault();
            this.startEditingRow(resourceId);
        }
        // Save button
        else if (target.closest('.save-btn')) {
            e.preventDefault();
            this.saveEditingRow(resourceId);
        }
        // Cancel button
        else if (target.closest('.cancel-btn')) {
            e.preventDefault();
            this.cancelEditingRow(resourceId);
        }
        // Delete button
        else if (target.closest('.delete-btn')) {
            e.preventDefault();
            this.deleteResource(resourceId);
        }
        // Duplicate button
        else if (target.closest('.duplicate-btn')) {
            e.preventDefault();
            this.duplicateResource(resourceId);
        }
        // Row checkbox
        else if (target.classList.contains('row-checkbox')) {
            this.handleRowSelection(resourceId, target.checked);
        }
    }

    /**
     * Gestisce cambi di input nella tabella
     */
    handleTableChange(e) {
        const target = e.target;
        const row = target.closest('.resource-row');
        if (!row || !row.classList.contains('editing')) return;

        // Auto-save dopo 2 secondi di inattività
        this.scheduleAutoSave(row.dataset.resourceId);

        // Validazione real-time
        this.validateField(target);
    }

    /**
     * Gestisce input nella tabella
     */
    handleTableInput(e) {
        const target = e.target;
        const row = target.closest('.resource-row');
        if (!row || !row.classList.contains('editing')) return;

        // Auto-save dopo 2 secondi di inattività
        this.scheduleAutoSave(row.dataset.resourceId);

        // Validazione real-time
        this.validateField(target);
    }

    /**
     * Gestisce tasti nella tabella
     */
    handleTableKeydown(e) {
        const target = e.target;
        const row = target.closest('.resource-row');
        if (!row) return;

        // Enter per salvare (tranne in textarea)
        if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (row.classList.contains('editing')) {
                this.saveEditingRow(row.dataset.resourceId);
            } else {
                this.startEditingRow(row.dataset.resourceId);
            }
        }
        // Escape per cancellare
        else if (e.key === 'Escape' && row.classList.contains('editing')) {
            e.preventDefault();
            this.cancelEditingRow(row.dataset.resourceId);
        }
        // Tab navigation tra campi
        else if (e.key === 'Tab' && row.classList.contains('editing')) {
            this.handleTabNavigation(e, row);
        }
    }

    /**
     * Inizia editing di una riga
     */
    async startEditingRow(resourceId) {
        // Cancella eventuale altra riga in editing
        if (this.editingRowId && this.editingRowId !== resourceId) {
            await this.cancelEditingRow(this.editingRowId);
        }

        const resource = this.findResource(resourceId);
        if (!resource) return;

        const row = document.querySelector(`[data-resource-id="${resourceId}"]`);
        if (!row) return;

        // Salva stato originale per rollback
        this.originalEditingData = { ...resource };
        this.editingRowId = resourceId;

        // Sostituisci contenuto riga
        row.outerHTML = this.generateEditingRow(resource);

        // Focus primo campo
        const newRow = document.querySelector(`[data-resource-id="${resourceId}"]`);
        const firstInput = newRow.querySelector('.name-input');
        if (firstInput) {
            firstInput.focus();
            firstInput.select();
        }

        // Disabilita altri edit buttons
        this.toggleEditButtons(false);
    }

    /**
     * Salva riga in editing
     */
    async saveEditingRow(resourceId) {
        const row = document.querySelector(`[data-resource-id="${resourceId}"]`);
        if (!row || !row.classList.contains('editing')) return;

        try {
            // Estrai dati dal form
            const formData = this.extractRowFormData(row);

            // Valida dati
            const validation = this.validateResourceData(formData);
            if (!validation.isValid) {
                this.showRowError(row, validation.errors.join(', '));
                return;
            }

            // Mostra loading
            this.showRowLoading(row, true);

            // Salva resource
            await this.persistResource(formData, this.currentScope, resourceId);

            // Aggiorna lista locale
            const resourceIndex = this.resources.findIndex(r => r.id === resourceId);
            if (resourceIndex >= 0) {
                this.resources[resourceIndex] = formData;
            }

            // Riapplica filtri e ricarica
            this.applyFiltersAndSort();
            this.refreshTable();

            // Reset editing state
            this.editingRowId = null;
            this.originalEditingData = null;

            // Riabilita edit buttons
            this.toggleEditButtons(true);

            // Refresh dropdowns dell'app
            this.app.refreshDropdowns();

            NotificationManager.success('Internal resource updated successfully');

        } catch (error) {
            console.error('Failed to save resource:', error);
            this.showRowError(row, 'Failed to save resource');
            this.showRowLoading(row, false);
        }
    }

    /**
     * Mostra o nasconde lo stato di loading per una riga della tabella
     */
    showRowLoading(row, show) {
        const actionsCell = row.querySelector('.actions-cell');
        if (!actionsCell) return;

        if (show) {
            // Salva il contenuto originale per ripristinarlo dopo
            if (!actionsCell.dataset.originalContent) {
                actionsCell.dataset.originalContent = actionsCell.innerHTML;
            }

            // Mostra indicatore di loading
            actionsCell.innerHTML = `
            <div class="saving-indicator">
                <i class="fas fa-spinner fa-spin"></i> 
                <span>Saving...</span>
            </div>
        `;

            // Disabilita la riga durante il salvataggio
            row.style.opacity = '0.7';
            row.style.pointerEvents = 'none';

            // Disabilita tutti gli input nella riga
            const inputs = row.querySelectorAll('input, select, textarea, button');
            inputs.forEach(input => {
                input.disabled = true;
                input.dataset.wasDisabled = input.disabled;
            });

        } else {
            // Ripristina il contenuto originale
            if (actionsCell.dataset.originalContent) {
                actionsCell.innerHTML = actionsCell.dataset.originalContent;
                delete actionsCell.dataset.originalContent;
            } else {
                // Fallback: ricostruisce le azioni per riga in editing
                if (row.classList.contains('editing')) {
                    actionsCell.innerHTML = `
                    <div class="edit-actions">
                        <button class="btn btn-small btn-success save-btn" title="Save">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-small btn-secondary cancel-btn" title="Cancel">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                }
            }

            // Riabilita la riga
            row.style.opacity = '';
            row.style.pointerEvents = '';

            // Riabilita tutti gli input nella riga
            const inputs = row.querySelectorAll('input, select, textarea, button');
            inputs.forEach(input => {
                // Ripristina lo stato disabled originale
                if (input.dataset.wasDisabled !== undefined) {
                    input.disabled = input.dataset.wasDisabled === 'true';
                    delete input.dataset.wasDisabled;
                } else {
                    input.disabled = false;
                }
            });
        }
    }

    /**
     * Valida i dati della risorsa interna
     */
    validateResourceData(resourceData) {
        const errors = [];

        // Validazione nome
        if (!resourceData.name || !resourceData.name.trim()) {
            errors.push('Resource name is required');
        } else if (resourceData.name.trim().length > 100) {
            errors.push('Resource name must be 100 characters or less');
        } else if (resourceData.name.trim().length < 2) {
            errors.push('Resource name must be at least 2 characters');
        }

        // Validazione role
        if (!resourceData.role || !resourceData.role.trim()) {
            errors.push('Role is required');
        } else if (resourceData.role.trim().length > 100) {
            errors.push('Role must be 100 characters or less');
        }

        // Validazione department
        if (!resourceData.department || !resourceData.department.trim()) {
            errors.push('Department is required');
        } else if (resourceData.department.trim().length > 50) {
            errors.push('Department must be 50 characters or less');
        }

        // Validazione real rate
        if (resourceData.realRate === undefined || resourceData.realRate === null) {
            errors.push('Real rate is required');
        } else if (isNaN(resourceData.realRate) || resourceData.realRate <= 0) {
            errors.push('Real rate must be a positive number');
        } else if (resourceData.realRate > 10000) {
            errors.push('Real rate seems unreasonably high (max 10,000 €/day)');
        }

        // Validazione official rate
        if (resourceData.officialRate === undefined || resourceData.officialRate === null) {
            errors.push('Official rate is required');
        } else if (isNaN(resourceData.officialRate) || resourceData.officialRate <= 0) {
            errors.push('Official rate must be a positive number');
        } else if (resourceData.officialRate > 10000) {
            errors.push('Official rate seems unreasonably high (max 10,000 €/day)');
        }

        // Validazione ID (se presente)
        if (resourceData.id && typeof resourceData.id !== 'string') {
            errors.push('Resource ID must be a string');
        }

        // Validazione duplicati (controllo nome univoco)
        if (resourceData.name && resourceData.name.trim()) {
            const duplicateResource = this.resources.find(r =>
                r.id !== resourceData.id &&
                r.name.toLowerCase().trim() === resourceData.name.toLowerCase().trim()
            );

            if (duplicateResource) {
                errors.push('An internal resource with this name already exists');
            }
        }

        // Validazione logica di business
        if (resourceData.realRate && resourceData.officialRate &&
            resourceData.realRate > resourceData.officialRate * 2) {
            errors.push('Real rate seems unusually high compared to official rate');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Cancella editing di una riga
     */
    async cancelEditingRow(resourceId) {
        const row = document.querySelector(`[data-resource-id="${resourceId}"]`);
        if (!row || !row.classList.contains('editing')) return;

        // Ripristina riga originale
        const originalResource = this.originalEditingData || this.findResource(resourceId);
        if (originalResource) {
            row.outerHTML = this.generateResourceRow(originalResource);
        }

        // Reset editing state
        this.editingRowId = null;
        this.originalEditingData = null;

        // Riabilita edit buttons
        this.toggleEditButtons(true);
    }

    /**
     * Estrae dati dal form di editing
     */
    extractRowFormData(row) {
        const nameInput = row.querySelector('.name-input');
        const roleInput = row.querySelector('.role-input');
        const departmentInput = row.querySelector('.department-input');
        const realRateInput = row.querySelector('.rate-input');
        const officialRateInput = row.querySelectorAll('.rate-input')[1];

        return {
            id: row.dataset.resourceId,
            name: nameInput.value.trim(),
            role: roleInput.value.trim(),
            department: departmentInput.value.trim(),
            realRate: parseFloat(realRateInput.value) || 0,
            officialRate: parseFloat(officialRateInput.value) || 0,
            isGlobal: this.currentScope === 'global'
        };
    }

    /**
     * Validazione real-time di un campo
     */
    validateField(field) {
        const row = field.closest('.resource-row');
        const fieldType = field.className.includes('name-input') ? 'name' :
            field.className.includes('role-input') ? 'role' :
                field.className.includes('department-input') ? 'department' :
                    field.className.includes('rate-input') ? 'rate' : '';

        // Rimuovi errori precedenti
        this.clearFieldError(field);

        // Valida campo specifico
        let isValid = true;
        let errorMessage = '';

        if (fieldType === 'name') {
            if (!field.value.trim()) {
                isValid = false;
                errorMessage = 'Name is required';
            } else if (field.value.length > 100) {
                isValid = false;
                errorMessage = 'Name too long';
            }
        } else if (fieldType === 'role') {
            if (!field.value.trim()) {
                isValid = false;
                errorMessage = 'Role is required';
            } else if (field.value.length > 100) {
                isValid = false;
                errorMessage = 'Role too long';
            }
        } else if (fieldType === 'department') {
            if (!field.value.trim()) {
                isValid = false;
                errorMessage = 'Department is required';
            } else if (field.value.length > 50) {
                isValid = false;
                errorMessage = 'Department too long';
            }
        } else if (fieldType === 'rate') {
            const value = parseFloat(field.value);
            if (isNaN(value) || value <= 0) {
                isValid = false;
                errorMessage = 'Must be greater than 0';
            }
        }

        // Mostra errore se necessario
        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    /**
     * Auto-save scheduler
     */
    scheduleAutoSave(resourceId) {
        // Cancella timer precedente
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        // Schedula nuovo auto-save
        this.autoSaveTimer = setTimeout(() => {
            if (this.editingRowId === resourceId) {
                this.saveEditingRow(resourceId);
            }
        }, 2000);
    }

    /**
     * Aggiorna header di ordinamento
     */
    updateSortHeaders() {
        document.querySelectorAll('.sortable').forEach(header => {
            const field = header.dataset.field;
            const icon = header.querySelector('i');

            header.classList.remove('sorted');
            icon.className = 'fas fa-sort';

            if (field === this.sortField) {
                header.classList.add('sorted');
                icon.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'}`;
            }
        });
    }

    /**
     * Trova risorsa per ID
     */
    findResource(resourceId) {
        return this.resources.find(r => r.id === resourceId);
    }

    /**
     * Setup scroll infinito
     */
    setupScrollInfinito() {
        const tableWrapper = document.querySelector('.resources-table-wrapper');
        if (!tableWrapper) return;

        let scrollTimeout;
        tableWrapper.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const { scrollTop, scrollHeight, clientHeight } = tableWrapper;
                const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

                // Carica più elementi quando si raggiunge l'80% dello scroll
                if (scrollPercentage > 0.8 && !this.isLoading) {
                    this.loadMoreItems();
                }
            }, 100);
        });
    }

    /**
     * Setup shortcuts da tastiera
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+F per focus ricerca
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                document.getElementById('resource-search')?.focus();
            }
            // Ctrl+N per nuova risorsa
            else if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.showModal(this.currentScope);
            }
            // Esc per cancellare editing
            else if (e.key === 'Escape' && this.editingRowId) {
                this.cancelEditingRow(this.editingRowId);
            }
        });
    }

    /**
     * Genera i controlli della tabella (filtri, ricerca, azioni)
     */
    generateTableControls() {
        const departments = [...new Set(this.resources.map(r => r.department).filter(d => d))];
        
        return `
            <div class="table-controls">
                <div class="controls-left">
                    <div class="search-container">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" id="resource-search" placeholder="Search internal resources..." 
                               value="${this.searchQuery}">
                    </div>
                    <div class="filter-chips">
                        <button class="filter-chip ${this.currentFilter === 'all' ? 'active' : ''}" 
                                data-filter="all">
                            All <span class="count">(${this.resources.length})</span>
                        </button>
                        ${departments.map(dept => `
                            <button class="filter-chip ${this.currentFilter === dept ? 'active' : ''}" 
                                    data-filter="${dept}">
                                ${dept} <span class="count">(${this.resources.filter(r => r.department === dept).length})</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="controls-right">
                    <button class="btn btn-secondary" id="bulk-actions-btn">
                        <i class="fas fa-ellipsis-h"></i> Bulk Actions
                    </button>
                    <button class="btn btn-primary" id="add-resource-btn">
                        <i class="fas fa-plus"></i> Add Resource
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Genera la struttura della tabella
     */
    generateResourcesTable() {
        return `
            <div class="resources-table-wrapper">
                <table class="resources-table">
                    <thead class="table-header">
                        <tr>
                            <th class="checkbox-col">
                                <input type="checkbox" id="select-all-resources">
                            </th>
                            <th class="name-col sortable ${this.sortField === 'name' ? 'sorted' : ''}" 
                                data-field="name">
                                Name 
                                <i class="fas fa-sort${this.getSortIcon('name')}"></i>
                            </th>
                            <th class="role-col sortable ${this.sortField === 'role' ? 'sorted' : ''}" 
                                data-field="role">
                                Role
                                <i class="fas fa-sort${this.getSortIcon('role')}"></i>
                            </th>
                            <th class="department-col sortable ${this.sortField === 'department' ? 'sorted' : ''}" 
                                data-field="department">
                                Department
                                <i class="fas fa-sort${this.getSortIcon('department')}"></i>
                            </th>
                            <th class="rate-col sortable ${this.sortField === 'realRate' ? 'sorted' : ''}" 
                                data-field="realRate">
                                Real Rate (€/day)
                                <i class="fas fa-sort${this.getSortIcon('realRate')}"></i>
                            </th>
                            <th class="rate-col sortable ${this.sortField === 'officialRate' ? 'sorted' : ''}" 
                                data-field="officialRate">
                                Official Rate (€/day)
                                <i class="fas fa-sort${this.getSortIcon('officialRate')}"></i>
                            </th>
                            <th class="actions-col">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="resources-table-body" class="table-body">
                        <!-- Rows will be populated here -->
                    </tbody>
                </table>
                <div id="table-loading" class="table-loading hidden">
                    <div class="loading-spinner"></div>
                    <span>Loading more resources...</span>
                </div>
                <div id="table-empty" class="table-empty hidden">
                    <i class="fas fa-users empty-icon"></i>
                    <h3>No internal resources found</h3>
                    <p>Try adjusting your search or filters, or add a new resource to get started.</p>
                </div>
            </div>
        `;
    }

    /**
     * Genera una riga della tabella
     */
    generateResourceRow(resource, isEditing = false) {
        const isSelected = this.isRowSelected(resource.id);
        const rowClass = `resource-row ${isEditing ? 'editing' : ''} ${isSelected ? 'selected' : ''}`;

        if (isEditing) {
            return this.generateEditingRow(resource);
        }

        return `
            <tr class="${rowClass}" data-resource-id="${resource.id}">
                <td class="checkbox-cell">
                    <input type="checkbox" class="row-checkbox" data-resource-id="${resource.id}" 
                           ${isSelected ? 'checked' : ''}>
                </td>
                <td class="name-cell">
                    <div class="name-content">
                        <span class="resource-name">${this.escapeHtml(resource.name)}</span>
                        ${this.generateResourceBadges(resource)}
                    </div>
                </td>
                <td class="role-cell">
                    <span class="role-value">${this.escapeHtml(resource.role)}</span>
                </td>
                <td class="department-cell">
                    <span class="department-badge dept-${resource.department.toLowerCase().replace(/\s+/g, '-')}">${this.escapeHtml(resource.department)}</span>
                </td>
                <td class="rate-cell">
                    <span class="rate-value">€${resource.realRate.toLocaleString()}</span>
                </td>
                <td class="rate-cell">
                    <span class="rate-value">€${resource.officialRate.toLocaleString()}</span>
                </td>
                <td class="actions-cell">
                    ${this.generateRowActions(resource)}
                </td>
            </tr>
        `;
    }

    /**
     * Genera riga in modalità editing
     */
    generateEditingRow(resource) {
        return `
            <tr class="resource-row editing" data-resource-id="${resource.id}">
                <td class="checkbox-cell">
                    <input type="checkbox" class="row-checkbox" disabled>
                </td>
                <td class="name-cell">
                    <input type="text" class="edit-input name-input" value="${this.escapeHtml(resource.name)}" 
                           maxlength="100" required>
                </td>
                <td class="role-cell">
                    <input type="text" class="edit-input role-input" value="${this.escapeHtml(resource.role)}" 
                           maxlength="100" required>
                </td>
                <td class="department-cell">
                    <input type="text" class="edit-input department-input" value="${this.escapeHtml(resource.department)}" 
                           maxlength="50" required>
                </td>
                <td class="rate-cell">
                    <input type="number" class="edit-input rate-input" value="${resource.realRate}" 
                           min="0" step="0.01" required>
                </td>
                <td class="rate-cell">
                    <input type="number" class="edit-input rate-input" value="${resource.officialRate}" 
                           min="0" step="0.01" required>
                </td>
                <td class="actions-cell">
                    <div class="edit-actions">
                        <button class="btn btn-small btn-success save-btn" title="Save">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-small btn-secondary cancel-btn" title="Cancel">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Genera le azioni per una riga
     */
    generateRowActions(resource) {
        return `
            <div class="row-actions">
                <button class="btn btn-small btn-secondary edit-btn" 
                        onclick="editResource('${resource.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-small btn-secondary duplicate-btn" 
                        onclick="duplicateResource('${resource.id}')" title="Duplicate">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-small btn-danger delete-btn" 
                        onclick="deleteResource('${resource.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    /**
     * Applica filtri e ordinamento
     */
    applyFiltersAndSort() {
        // Filtra resources
        this.filteredResources = this.resources.filter(resource => {
            // Filtro per ricerca
            if (this.searchQuery) {
                const searchLower = this.searchQuery.toLowerCase();
                const matchesSearch =
                    resource.name.toLowerCase().includes(searchLower) ||
                    resource.role.toLowerCase().includes(searchLower) ||
                    resource.department.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Filtro per department
            if (this.currentFilter !== 'all') {
                return resource.department === this.currentFilter;
            }

            return true;
        });

        // Ordina resources
        this.filteredResources.sort((a, b) => {
            let valueA = a[this.sortField];
            let valueB = b[this.sortField];

            // Gestione valori numerici
            if (this.sortField === 'realRate' || this.sortField === 'officialRate') {
                valueA = parseFloat(valueA) || 0;
                valueB = parseFloat(valueB) || 0;
            } else {
                valueA = (valueA || '').toString().toLowerCase();
                valueB = (valueB || '').toString().toLowerCase();
            }

            let comparison = 0;
            if (valueA > valueB) comparison = 1;
            if (valueA < valueB) comparison = -1;

            return this.sortDirection === 'desc' ? -comparison : comparison;
        });

        // Reset pagination
        this.currentPage = 0;
        this.displayedResources = [];
    }

    /**
     * Carica elementi iniziali
     */
    loadInitialItems() {
        this.displayedResources = [];
        this.currentPage = 0;
        this.loadMoreItems();
    }

    /**
     * Carica più elementi (scroll infinito)
     */
    loadMoreItems() {
        if (this.isLoading) return;

        const startIndex = this.currentPage * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const newItems = this.filteredResources.slice(startIndex, endIndex);

        if (newItems.length === 0) {
            this.showEmptyState();
            return;
        }

        this.displayedResources = [...this.displayedResources, ...newItems];
        this.renderTableRows();
        this.currentPage++;
    }

    /**
     * Renderizza le righe della tabella
     */
    renderTableRows() {
        const tbody = document.getElementById('resources-table-body');
        if (!tbody) return;

        // Se è la prima pagina, svuota la tabella
        if (this.currentPage === 0) {
            tbody.innerHTML = '';
        }

        // Aggiungi nuove righe
        const newRowsHTML = this.displayedResources
            .slice(this.currentPage * this.itemsPerPage)
            .map(resource => this.generateResourceRow(resource))
            .join('');

        tbody.insertAdjacentHTML('beforeend', newRowsHTML);
        this.hideEmptyState();
    }

    /**
     * Utility functions
     */
    getSortIcon(field) {
        if (this.sortField !== field) return '';
        return this.sortDirection === 'asc' ? '-up' : '-down';
    }

    isRowSelected(resourceId) {
        // Implementazione per la selezione multipla
        return false; // Per ora
    }

    generateResourceBadges(resource) {
        let badges = '';
        if (resource.isProjectSpecific) {
            badges += '<span class="resource-badge project-specific">Project</span>';
        }
        if (resource.isOverridden) {
            badges += '<span class="resource-badge overridden">Modified</span>';
        }
        return badges;
    }

    showEmptyState() {
        document.getElementById('table-empty')?.classList.remove('hidden');
    }

    hideEmptyState() {
        document.getElementById('table-empty')?.classList.add('hidden');
    }

    /**
     * Utility functions per UI
     */
    showRowError(row, message) {
        const actionsCell = row.querySelector('.actions-cell');
        if (actionsCell) {
            actionsCell.innerHTML = `<div class="error-indicator"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`;
            setTimeout(() => {
                // Ripristina azioni dopo 3 secondi
                if (row.classList.contains('editing')) {
                    actionsCell.innerHTML = `
                        <div class="edit-actions">
                            <button class="btn btn-small btn-success save-btn" title="Save">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-small btn-secondary cancel-btn" title="Cancel">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                }
            }, 3000);
        }
    }

    showFieldError(field, message) {
        field.classList.add('error');
        field.title = message;

        // Aggiungi classe al parent per styling
        const cell = field.closest('td');
        if (cell) {
            cell.classList.add('field-error');
        }
    }

    clearFieldError(field) {
        field.classList.remove('error');
        field.title = '';

        const cell = field.closest('td');
        if (cell) {
            cell.classList.remove('field-error');
        }
    }

    toggleEditButtons(enabled) {
        document.querySelectorAll('.edit-btn, .delete-btn, .duplicate-btn').forEach(btn => {
            btn.disabled = !enabled;
            btn.style.opacity = enabled ? '1' : '0.5';
        });
    }

    handleRowSelection(resourceId, checked) {
        // Implementazione selezione multipla per bulk actions future
        if (!this.selectedRows) this.selectedRows = new Set();

        if (checked) {
            this.selectedRows.add(resourceId);
        } else {
            this.selectedRows.delete(resourceId);
        }

        this.updateBulkActionsState();
    }

    toggleSelectAll(checked) {
        if (!this.selectedRows) this.selectedRows = new Set();

        document.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
            const resourceId = checkbox.dataset.resourceId;
            if (checked) {
                this.selectedRows.add(resourceId);
            } else {
                this.selectedRows.delete(resourceId);
            }
        });

        this.updateBulkActionsState();
    }

    updateBulkActionsState() {
        const bulkBtn = document.getElementById('bulk-actions-btn');
        if (bulkBtn) {
            const count = this.selectedRows ? this.selectedRows.size : 0;
            bulkBtn.disabled = count === 0;
            bulkBtn.innerHTML = count > 0 ?
                `<i class="fas fa-ellipsis-h"></i> Bulk Actions (${count})` :
                `<i class="fas fa-ellipsis-h"></i> Bulk Actions`;
        }
    }

    updateFilterCounts() {
        const departments = [...new Set(this.resources.map(r => r.department).filter(d => d))];
        
        document.querySelector('[data-filter="all"] .count').textContent = `(${this.resources.length})`;
        
        departments.forEach(dept => {
            const count = this.resources.filter(r => r.department === dept).length;
            const chip = document.querySelector(`[data-filter="${dept}"] .count`);
            if (chip) {
                chip.textContent = `(${count})`;
            }
        });
    }

    refreshTable() {
        this.applyFiltersAndSort();
        this.loadInitialItems();
        this.updateFilterCounts();
        this.updateSortHeaders();
    }

    handleTabNavigation(e, row) {
        // Gestisce navigazione con Tab tra campi in editing
        const inputs = row.querySelectorAll('input, select, textarea');
        const currentIndex = Array.from(inputs).indexOf(e.target);

        if (e.shiftKey && currentIndex === 0) {
            // Shift+Tab sul primo campo: vai all'ultimo
            e.preventDefault();
            inputs[inputs.length - 1].focus();
        } else if (!e.shiftKey && currentIndex === inputs.length - 1) {
            // Tab sull'ultimo campo: salva
            e.preventDefault();
            this.saveEditingRow(row.dataset.resourceId);
        }
    }

    showBulkActionsMenu() {
        // Implementazione menu bulk actions
        console.log('Bulk actions menu - to be implemented');
    }

    duplicateResource(resourceId) {
        const resource = this.findResource(resourceId);
        if (!resource) return;

        // Crea copia con nuovo ID
        const duplicate = {
            ...resource,
            id: this.generateId('internal_'),
            name: `${resource.name} (Copy)`
        };

        this.showModal(this.currentScope, duplicate);
    }

    /**
     * Reset internal resources to default values
     */
    async resetToDefaultInternalResources() {
        // Prevent multiple simultaneous reset operations
        if (this.isResetting) {
            console.log('Reset already in progress, ignoring...');
            return;
        }
        
        // Set flag immediately to prevent double execution
        this.isResetting = true;
        
        try {
            if (!confirm('Are you sure you want to reset all internal resources to default values? This will remove all custom resources.')) {
                // User cancelled, reset flag and return
                this.isResetting = false;
                return;
            }

            console.log('Resetting internal resources to default values');
            
            // Force reset to default internal resources
            this.ensureDefaultInternalResources(true);
            
            // Reload the data and refresh the display
            await this.loadResourcesConfig();
            
            // Refresh dropdowns in the main app
            if (this.app && this.app.refreshDropdowns) {
                this.app.refreshDropdowns();
            }
            
            // Show success notification
            if (window.NotificationManager) {
                window.NotificationManager.success('Internal resources have been reset to default values');
            } else {
                console.log('SUCCESS: Internal resources have been reset to default values');
            }
            
        } catch (error) {
            console.error('Error resetting internal resources to default:', error);
            if (window.NotificationManager) {
                window.NotificationManager.error('Error resetting internal resources to default');
            } else {
                console.log('ERROR: Error resetting internal resources to default');
            }
        } finally {
            // Always reset the flag
            this.isResetting = false;
        }
    }

    /**
     * Cambia scope (global/project)
     */
    switchScope(scope) {
        this.currentScope = scope;

        // Cancella editing se attivo
        if (this.editingRowId) {
            this.cancelEditingRow(this.editingRowId);
        }

        // Aggiorna tab attivi
        document.querySelectorAll('.resources-config-container .scope-tab').forEach(t =>
            t.classList.remove('active'));
        document.querySelector(`[data-scope="${scope}"]`)?.classList.add('active');

        // Ricarica dati
        this.loadResourcesConfig();
    }

    /**
     * Mostra modal per aggiungere/modificare risorsa
     */
    showModal(scope, resource = null) {
        const modal = document.getElementById('resource-modal');
        const title = document.getElementById('resource-modal-title');
        const form = document.getElementById('resource-form');

        if (!modal || !title || !form) return;

        // Configura modal
        title.textContent = resource ? 'Edit Internal Resource' : 'Add Internal Resource';
        modal.dataset.scope = scope;
        modal.dataset.resourceId = resource?.id || '';

        // Popola o resetta form
        if (resource) {
            this.populateForm(resource);
        } else {
            form.reset();
        }

        // Mostra modal
        modal.classList.add('active');
        setTimeout(() => document.getElementById('resource-name')?.focus(), 100);
    }

    /**
     * Popola il form con i dati della risorsa
     */
    populateForm(resource) {
        const fields = ['name', 'role', 'department', 'realRate', 'officialRate'];
        fields.forEach(field => {
            const element = document.getElementById(`resource-${field.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
            if (element) {
                element.value = resource[field] || '';
            }
        });
    }

    /**
     * Chiude il modal
     */
    closeModal() {
        document.getElementById('resource-modal')?.classList.remove('active');
    }

    /**
     * Salva la risorsa dal modal
     */
    async saveResource() {
        const modal = document.getElementById('resource-modal');
        const scope = modal.dataset.scope;
        const resourceId = modal.dataset.resourceId;
        const form = document.getElementById('resource-form');

        if (!form) return;

        try {
            // Mostra loading nel modal
            this.showModalLoading(true);

            // Estrai dati dal form
            const resourceData = this.extractFormData(form, resourceId, scope);

            // Valida dati
            const validation = this.validateResourceData(resourceData);
            if (!validation.isValid) {
                this.showModalErrors(validation.errors);
                this.showModalLoading(false);
                return;
            }

            // Persiste la risorsa
            await this.persistResource(resourceData, scope, resourceId);

            // Aggiorna la lista locale
            if (resourceId) {
                // Modifica esistente
                const index = this.resources.findIndex(r => r.id === resourceId);
                if (index >= 0) {
                    this.resources[index] = resourceData;
                }
            } else {
                // Nuova risorsa
                this.resources.push(resourceData);
            }

            // Chiudi modal e aggiorna UI
            this.closeModal();
            await this.loadResourcesConfig();
            this.app.refreshDropdowns();

            NotificationManager.success(
                resourceId ? 'Internal resource updated successfully' : 'Internal resource created successfully'
            );

        } catch (error) {
            console.error('Failed to save resource:', error);
            this.showModalErrors(['Failed to save resource: ' + error.message]);
            NotificationManager.error('Failed to save resource');
        } finally {
            this.showModalLoading(false);
        }
    }

    showModalLoading(show) {
        const saveBtn = document.querySelector('#resource-modal .btn-primary');
        const cancelBtn = document.querySelector('#resource-modal .btn-secondary');
        const form = document.getElementById('resource-form');

        if (show) {
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }
            if (cancelBtn) cancelBtn.disabled = true;
            if (form) {
                const inputs = form.querySelectorAll('input, select, textarea');
                inputs.forEach(input => input.disabled = true);
            }
        } else {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Save Resource';
            }
            if (cancelBtn) cancelBtn.disabled = false;
            if (form) {
                const inputs = form.querySelectorAll('input, select, textarea');
                inputs.forEach(input => input.disabled = false);
            }
        }
    }

    showModalErrors(errors) {
        // Rimuovi errori precedenti
        const existingErrors = document.querySelector('#resource-modal .modal-errors');
        if (existingErrors) {
            existingErrors.remove();
        }

        // Crea container errori
        const errorContainer = document.createElement('div');
        errorContainer.className = 'modal-errors alert alert-danger';
        errorContainer.innerHTML = `
        <ul class="mb-0">
            ${errors.map(error => `<li>${this.escapeHtml(error)}</li>`).join('')}
        </ul>
    `;

        // Inserisci errori all'inizio del modal body
        const modalBody = document.querySelector('#resource-modal .modal-body');
        if (modalBody) {
            modalBody.insertBefore(errorContainer, modalBody.firstChild);
        }

        // Auto-rimuovi dopo 5 secondi
        setTimeout(() => {
            if (errorContainer.parentNode) {
                errorContainer.remove();
            }
        }, 5000);
    }

    /**
     * Estrae i dati dal form del modal
     */
    extractFormData(form, resourceId, scope) {
        const nameField = document.getElementById('resource-name');
        const roleField = document.getElementById('resource-role');
        const departmentField = document.getElementById('resource-department');
        const realRateField = document.getElementById('resource-real-rate');
        const officialRateField = document.getElementById('resource-official-rate');

        return {
            id: resourceId || this.generateId('internal_'),
            name: nameField?.value?.trim() || '',
            role: roleField?.value?.trim() || '',
            department: departmentField?.value?.trim() || '',
            realRate: parseFloat(realRateField?.value) || 0,
            officialRate: parseFloat(officialRateField?.value) || 0,
            isGlobal: scope === 'global'
        };
    }

    /**
     * Persiste la risorsa
     */
    async persistResource(resourceData, scope, resourceId) {
        if (scope === 'global') {
            this.persistGlobalResource(resourceData, resourceId);
        } else {
            this.persistProjectResource(resourceData);
        }
    }

    /**
     * Persiste risorsa globale
     */
    persistGlobalResource(resourceData, resourceId) {
        if (!this.configManager.globalConfig.internalResources) {
            this.configManager.globalConfig.internalResources = [];
        }

        if (resourceId) {
            // Modifica esistente
            const index = this.configManager.globalConfig.internalResources.findIndex(r => r.id === resourceId);
            if (index >= 0) {
                this.configManager.globalConfig.internalResources[index] = resourceData;
            }
        } else {
            // Nuova risorsa
            this.configManager.globalConfig.internalResources.push(resourceData);
        }
        this.configManager.saveGlobalConfig();
    }

    /**
     * Persiste risorsa di progetto
     */
    persistProjectResource(resourceData) {
        this.configManager.addInternalResourceToProject(this.app.currentProject.config, resourceData);
        this.app.markDirty();
    }

    /**
     * Elimina risorsa
     */
    async deleteResource(resourceId, scope = null) {
        if (!confirm('Are you sure you want to delete this internal resource?')) return;

        try {
            const actualScope = scope || this.currentScope;

            if (actualScope === 'global') {
                this.configManager.globalConfig.internalResources =
                    this.configManager.globalConfig.internalResources.filter(r => r.id !== resourceId);
                this.configManager.saveGlobalConfig();
            } else {
                this.configManager.deleteInternalResourceFromProject(this.app.currentProject.config, resourceId);
                this.app.markDirty();
            }

            // Aggiorna tabella
            this.resources = this.resources.filter(r => r.id !== resourceId);
            this.refreshTable();
            this.app.refreshDropdowns();

            NotificationManager.success('Internal resource deleted successfully');
        } catch (error) {
            console.error('Failed to delete resource:', error);
            NotificationManager.error('Failed to delete resource');
        }
    }

    /**
     * Disabilita risorsa per il progetto corrente
     */
    async disableResource(resourceId) {
        try {
            if (!this.app.currentProject) return;

            this.ensureProjectOverrides();

            const existingOverride = this.app.currentProject.config.projectOverrides.internalResources.find(r => r.id === resourceId);
            if (existingOverride) {
                existingOverride.status = 'inactive';
            } else {
                this.app.currentProject.config.projectOverrides.internalResources.push({
                    id: resourceId,
                    status: 'inactive'
                });
            }

            this.app.markDirty();
            await this.loadResourcesConfig();
            this.app.refreshDropdowns();

            NotificationManager.success('Internal resource disabled for this project');
        } catch (error) {
            console.error('Failed to disable resource:', error);
            NotificationManager.error('Failed to disable resource');
        }
    }

    /**
     * Assicura che gli override di progetto esistano
     */
    ensureProjectOverrides() {
        if (!this.app.currentProject.config.projectOverrides) {
            this.app.currentProject.config.projectOverrides = {
                suppliers: [],
                internalResources: [],
                categories: [],
                calculationParams: {}
            };
        }
    }

    /**
     * Utility functions
     */
    escapeHtml(text) {
        if (typeof Helpers !== 'undefined' && Helpers.escapeHtml) {
            return Helpers.escapeHtml(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    generateId(prefix = 'internal_') {
        return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateScopeSelector(data) {
        return `
            <div class="resources-scope-selector">
                <div class="scope-tabs">
                    <button class="scope-tab active" data-scope="global">
                        <i class="fas fa-globe"></i> Global Resources
                        <span class="count">(${data.global.length})</span>
                    </button>
                    <button class="scope-tab ${!data.hasProject ? 'disabled' : ''}" 
                            data-scope="project" ${!data.hasProject ? 'disabled' : ''}>
                        <i class="fas fa-project-diagram"></i> Project Resources
                        <span class="count">(${data.project.length})</span>
                    </button>
                </div>
                <div class="scope-actions">
                    <button class="btn btn-small btn-secondary" id="reset-internal-resources-btn" title="Reset to Default Internal Resources">
                        <i class="fas fa-undo"></i> Reset to Default
                    </button>
                </div>
            </div>
        `;
    }

    generateResourceModal() {
        return `
            <div id="resource-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="resource-modal-title">Add Internal Resource</h3>
                        <button class="modal-close" onclick="closeResourcesModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="resource-form">
                            <div class="form-group">
                                <label for="resource-name">Resource Name:</label>
                                <input type="text" id="resource-name" name="name" required maxlength="100" 
                                       placeholder="Enter resource full name">
                            </div>
                            <div class="form-group">
                                <label for="resource-role">Role:</label>
                                <input type="text" id="resource-role" name="role" required maxlength="100" 
                                       placeholder="e.g., Senior Developer, Tech Analyst, Project Manager">
                            </div>
                            <div class="form-group">
                                <label for="resource-department">Department:</label>
                                <input type="text" id="resource-department" name="department" required maxlength="50" 
                                       placeholder="e.g., IT, Development, RO">
                            </div>
                            <div class="form-group">
                                <label for="resource-real-rate">Real Rate (€/day):</label>
                                <input type="number" id="resource-real-rate" name="realRate" min="0" step="0.01" required
                                       placeholder="Actual daily rate">
                            </div>
                            <div class="form-group">
                                <label for="resource-official-rate">Official Rate (€/day):</label>
                                <input type="number" id="resource-official-rate" name="officialRate" min="0" step="0.01" required
                                       placeholder="Official/budgeted daily rate">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeResourcesModal()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveResourcesModal()">Save Resource</button>
                    </div>
                </div>
            </div>
        `;
    }

    getResourceData() {
        const globalResources = this.configManager?.globalConfig?.internalResources || [];
        const currentProject = this.app.currentProject;
        const projectResources = currentProject ?
            this.configManager.getInternalResources(currentProject.config) : [];

        return {
            global: globalResources,
            project: projectResources,
            hasProject: !!currentProject
        };
    }
}

// Esporta la classe
if (typeof window !== 'undefined') {
    window.InternalResourcesConfigManager = InternalResourcesConfigManager;
}