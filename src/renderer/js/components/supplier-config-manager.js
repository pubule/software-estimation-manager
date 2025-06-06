/**
 * Supplier Configuration Manager - Table Layout
 * Gestisce la configurazione dei supplier con layout tabellare
 */
class SupplierConfigManager {
    constructor(configManager, app) {
        this.configManager = configManager;
        this.app = app;
        this.currentScope = 'global';
        this.containerId = 'suppliers-content';

        // Stato tabella
        this.suppliers = [];
        this.filteredSuppliers = [];
        this.displayedSuppliers = [];
        this.itemsPerPage = 50;
        this.currentPage = 0;
        this.isLoading = false;
        this.editingRowId = null;

        // Filtri e ordinamento
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.sortField = 'name';
        this.sortDirection = 'asc';
    }

    /**
     * Carica e renderizza la configurazione supplier
     */
    async loadSuppliersConfig() {
        const contentDiv = document.getElementById(this.containerId);
        if (!contentDiv) {
            console.error('Suppliers content container not found');
            return;
        }

        const supplierData = this.getSupplierData();
        this.suppliers = this.currentScope === 'global' ? supplierData.global : supplierData.project;

        contentDiv.innerHTML = this.generateSuppliersHTML(supplierData);
        this.setupEventListeners();
        this.applyFiltersAndSort();
        this.loadInitialItems();
    }

    /**
     * Genera l'HTML per la sezione supplier con layout tabellare
     */
    generateSuppliersHTML(data) {
        return `
            <div class="suppliers-table-container">
                ${this.generateScopeSelector(data)}
                ${this.generateTableControls()}
                ${this.generateSuppliersTable()}
                                        ${this.generateSupplierModal()}
            </div>
        `;
    }

    /**
     * Setup degli event listener principali
     */
    setupEventListeners() {
        this.setupScopeTabEvents();
        this.setupTableControls();
        this.setupTableEvents();
        this.setupScrollInfinito();
        this.setupKeyboardShortcuts();
    }

    /**
     * Setup eventi per i tab di scope
     */
    setupScopeTabEvents() {
        document.querySelectorAll('.suppliers-config-container .scope-tab').forEach(tab => {
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
        const searchInput = document.getElementById('supplier-search');
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
        document.getElementById('add-supplier-btn')?.addEventListener('click', () => {
            this.showModal(this.currentScope);
        });

        document.getElementById('bulk-actions-btn')?.addEventListener('click', () => {
            this.showBulkActionsMenu();
        });

        // Select all checkbox
        document.getElementById('select-all-suppliers')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });
    }

    /**
     * Setup eventi per la tabella
     */
    setupTableEvents() {
        const table = document.querySelector('.suppliers-table');
        if (!table) return;

        // Ordinamento colonne
        table.addEventListener('click', (e) => {
            const sortableHeader = e.target.closest('.sortable');
            if (sortableHeader) {
                this.handleSort(sortableHeader.dataset.field);
            }
        });

        // Delegazione eventi per righe dinamiche
        const tbody = document.getElementById('suppliers-table-body');
        if (tbody) {
            tbody.addEventListener('click', this.handleTableClick.bind(this));
            tbody.addEventListener('change', this.handleTableChange.bind(this));
            tbody.addEventListener('input', this.handleTableInput.bind(this));
            tbody.addEventListener('keydown', this.handleTableKeydown.bind(this));
        }
    }

    /**
     * Gestisce click nella tabella
     */
    handleTableClick(e) {
        const target = e.target;
        const row = target.closest('.supplier-row');
        if (!row) return;

        const supplierId = row.dataset.supplierId;

        // Edit button
        if (target.closest('.edit-btn')) {
            e.preventDefault();
            this.startEditingRow(supplierId);
        }
        // Save button
        else if (target.closest('.save-btn')) {
            e.preventDefault();
            this.saveEditingRow(supplierId);
        }
        // Cancel button
        else if (target.closest('.cancel-btn')) {
            e.preventDefault();
            this.cancelEditingRow(supplierId);
        }
        // Delete button
        else if (target.closest('.delete-btn')) {
            e.preventDefault();
            this.deleteSupplier(supplierId);
        }
        // Duplicate button
        else if (target.closest('.duplicate-btn')) {
            e.preventDefault();
            this.duplicateSupplier(supplierId);
        }
        // Row checkbox
        else if (target.classList.contains('row-checkbox')) {
            this.handleRowSelection(supplierId, target.checked);
        }
    }

    /**
     * Gestisce cambi di input nella tabella
     */
    handleTableChange(e) {
        const target = e.target;
        const row = target.closest('.supplier-row');
        if (!row || !row.classList.contains('editing')) return;

        // Auto-save dopo 2 secondi di inattività
        this.scheduleAutoSave(row.dataset.supplierId);

        // Validazione real-time
        this.validateField(target);
    }

    /**
     * Gestisce input nella tabella
     */
    handleTableInput(e) {
        const target = e.target;
        const row = target.closest('.supplier-row');
        if (!row || !row.classList.contains('editing')) return;

        // Auto-save dopo 2 secondi di inattività
        this.scheduleAutoSave(row.dataset.supplierId);

        // Validazione real-time
        this.validateField(target);
    }

    /**
     * Gestisce tasti nella tabella
     */
    handleTableKeydown(e) {
        const target = e.target;
        const row = target.closest('.supplier-row');
        if (!row) return;

        // Enter per salvare (tranne in textarea)
        if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (row.classList.contains('editing')) {
                this.saveEditingRow(row.dataset.supplierId);
            } else {
                this.startEditingRow(row.dataset.supplierId);
            }
        }
        // Escape per cancellare
        else if (e.key === 'Escape' && row.classList.contains('editing')) {
            e.preventDefault();
            this.cancelEditingRow(row.dataset.supplierId);
        }
        // Tab navigation tra campi
        else if (e.key === 'Tab' && row.classList.contains('editing')) {
            this.handleTabNavigation(e, row);
        }
    }

    /**
     * Inizia editing di una riga
     */
    async startEditingRow(supplierId) {
        // Cancella eventuale altra riga in editing
        if (this.editingRowId && this.editingRowId !== supplierId) {
            await this.cancelEditingRow(this.editingRowId);
        }

        const supplier = this.findSupplier(supplierId);
        if (!supplier) return;

        const row = document.querySelector(`[data-supplier-id="${supplierId}"]`);
        if (!row) return;

        // Salva stato originale per rollback
        this.originalEditingData = { ...supplier };
        this.editingRowId = supplierId;

        // Sostituisci contenuto riga
        row.outerHTML = this.generateEditingRow(supplier);

        // Focus primo campo
        const newRow = document.querySelector(`[data-supplier-id="${supplierId}"]`);
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
    async saveEditingRow(supplierId) {
        const row = document.querySelector(`[data-supplier-id="${supplierId}"]`);
        if (!row || !row.classList.contains('editing')) return;

        try {
            // Estrai dati dal form
            const formData = this.extractRowFormData(row);

            // Valida dati
            const validation = this.validateSupplierData(formData);
            if (!validation.isValid) {
                this.showRowError(row, validation.errors.join(', '));
                return;
            }

            // Mostra loading
            this.showRowLoading(row, true);

            // Salva supplier
            await this.persistSupplier(formData, this.currentScope, supplierId);

            // Aggiorna lista locale
            const supplierIndex = this.suppliers.findIndex(s => s.id === supplierId);
            if (supplierIndex >= 0) {
                this.suppliers[supplierIndex] = formData;
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

            NotificationManager.success('Supplier updated successfully');

        } catch (error) {
            console.error('Failed to save supplier:', error);
            this.showRowError(row, 'Failed to save supplier');
            this.showRowLoading(row, false);
        }
    }

    /**
     * Cancella editing di una riga
     */
    async cancelEditingRow(supplierId) {
        const row = document.querySelector(`[data-supplier-id="${supplierId}"]`);
        if (!row || !row.classList.contains('editing')) return;

        // Ripristina riga originale
        const originalSupplier = this.originalEditingData || this.findSupplier(supplierId);
        if (originalSupplier) {
            row.outerHTML = this.generateSupplierRow(originalSupplier);
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
        const realRateInput = row.querySelector('.rate-input');
        const officialRateInput = row.querySelectorAll('.rate-input')[1];
        const statusSelect = row.querySelector('.status-select');
        const notesInput = row.querySelector('.notes-input');

        return {
            id: row.dataset.supplierId,
            name: nameInput.value.trim(),
            realRate: parseFloat(realRateInput.value) || 0,
            officialRate: parseFloat(officialRateInput.value) || 0,
            status: statusSelect.value,
            notes: notesInput.value.trim(),
            isGlobal: this.currentScope === 'global'
        };
    }

    /**
     * Validazione real-time di un campo
     */
    validateField(field) {
        const row = field.closest('.supplier-row');
        const fieldName = field.className.includes('name-input') ? 'name' :
            field.className.includes('rate-input') ? 'rate' :
                field.className.includes('notes-input') ? 'notes' : '';

        // Rimuovi errori precedenti
        this.clearFieldError(field);

        // Valida campo specifico
        let isValid = true;
        let errorMessage = '';

        if (fieldName === 'name') {
            if (!field.value.trim()) {
                isValid = false;
                errorMessage = 'Name is required';
            } else if (field.value.length > 100) {
                isValid = false;
                errorMessage = 'Name too long';
            }
        } else if (fieldName === 'rate') {
            const value = parseFloat(field.value);
            if (isNaN(value) || value <= 0) {
                isValid = false;
                errorMessage = 'Must be greater than 0';
            }
        } else if (fieldName === 'notes') {
            if (field.value.length > 500) {
                isValid = false;
                errorMessage = 'Notes too long';
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
    scheduleAutoSave(supplierId) {
        // Cancella timer precedente
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        // Schedula nuovo auto-save
        this.autoSaveTimer = setTimeout(() => {
            if (this.editingRowId === supplierId) {
                this.saveEditingRow(supplierId);
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
     * Trova supplier per ID
     */
    findSupplier(supplierId) {
        return this.suppliers.find(s => s.id === supplierId);
    }



    /**
     * Setup scroll infinito
     */
    setupScrollInfinito() {
        const tableWrapper = document.querySelector('.suppliers-table-wrapper');
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
                document.getElementById('supplier-search')?.focus();
            }
            // Ctrl+N per nuovo supplier
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
        return `
            <div class="table-controls">
                <div class="controls-left">
                    <div class="search-container">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" id="supplier-search" placeholder="Search suppliers..." 
                               value="${this.searchQuery}">
                    </div>
                    <div class="filter-chips">
                        <button class="filter-chip ${this.currentFilter === 'all' ? 'active' : ''}" 
                                data-filter="all">
                            All <span class="count">(${this.suppliers.length})</span>
                        </button>
                        <button class="filter-chip ${this.currentFilter === 'active' ? 'active' : ''}" 
                                data-filter="active">
                            Active <span class="count">(${this.suppliers.filter(s => s.status === 'active').length})</span>
                        </button>
                        <button class="filter-chip ${this.currentFilter === 'inactive' ? 'active' : ''}" 
                                data-filter="inactive">
                            Inactive <span class="count">(${this.suppliers.filter(s => s.status === 'inactive').length})</span>
                        </button>
                    </div>
                </div>
                <div class="controls-right">
                    <button class="btn btn-secondary" id="bulk-actions-btn">
                        <i class="fas fa-ellipsis-h"></i> Bulk Actions
                    </button>
                    <button class="btn btn-primary" id="add-supplier-btn">
                        <i class="fas fa-plus"></i> Add Supplier
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Genera la struttura della tabella
     */
    generateSuppliersTable() {
        return `
            <div class="suppliers-table-wrapper">
                <table class="suppliers-table">
                    <thead class="table-header">
                        <tr>
                            <th class="checkbox-col">
                                <input type="checkbox" id="select-all-suppliers">
                            </th>
                            <th class="name-col sortable ${this.sortField === 'name' ? 'sorted' : ''}" 
                                data-field="name">
                                Name 
                                <i class="fas fa-sort${this.getSortIcon('name')}"></i>
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
                            <th class="status-col sortable ${this.sortField === 'status' ? 'sorted' : ''}" 
                                data-field="status">
                                Status
                                <i class="fas fa-sort${this.getSortIcon('status')}"></i>
                            </th>
                            <th class="notes-col">Notes</th>
                            <th class="actions-col">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="suppliers-table-body" class="table-body">
                        <!-- Rows will be populated here -->
                    </tbody>
                </table>
                <div id="table-loading" class="table-loading hidden">
                    <div class="loading-spinner"></div>
                    <span>Loading more suppliers...</span>
                </div>
                <div id="table-empty" class="table-empty hidden">
                    <i class="fas fa-users empty-icon"></i>
                    <h3>No suppliers found</h3>
                    <p>Try adjusting your search or filters, or add a new supplier to get started.</p>
                </div>
            </tbody>
        `;
    }

    /**
     * Genera una riga della tabella
     */
    generateSupplierRow(supplier, isEditing = false) {
        const isSelected = this.isRowSelected(supplier.id);
        const rowClass = `supplier-row ${isEditing ? 'editing' : ''} ${isSelected ? 'selected' : ''}`;

        if (isEditing) {
            return this.generateEditingRow(supplier);
        }

        return `
            <tr class="${rowClass}" data-supplier-id="${supplier.id}">
                <td class="checkbox-cell">
                    <input type="checkbox" class="row-checkbox" data-supplier-id="${supplier.id}" 
                           ${isSelected ? 'checked' : ''}>
                </td>
                <td class="name-cell">
                    <div class="name-content">
                        <span class="supplier-name">${this.escapeHtml(supplier.name)}</span>
                        ${this.generateSupplierBadges(supplier)}
                    </div>
                </td>
                <td class="rate-cell">
                    <span class="rate-value">€${supplier.realRate.toLocaleString()}</span>
                </td>
                <td class="rate-cell">
                    <span class="rate-value">€${supplier.officialRate.toLocaleString()}</span>
                </td>
                <td class="status-cell">
                    <span class="status-badge status-${supplier.status}">${supplier.status}</span>
                </td>
                <td class="notes-cell">
                    <span class="notes-content" title="${this.escapeHtml(supplier.notes || '')}">
                        ${supplier.notes ? this.truncateText(supplier.notes, 50) : '-'}
                    </span>
                </td>
                <td class="actions-cell">
                    ${this.generateRowActions(supplier)}
                </td>
            </tr>
        `;
    }

    /**
     * Genera riga in modalità editing
     */
    generateEditingRow(supplier) {
        return `
            <tr class="supplier-row editing" data-supplier-id="${supplier.id}">
                <td class="checkbox-cell">
                    <input type="checkbox" class="row-checkbox" disabled>
                </td>
                <td class="name-cell">
                    <input type="text" class="edit-input name-input" value="${this.escapeHtml(supplier.name)}" 
                           maxlength="100" required>
                </td>
                <td class="rate-cell">
                    <input type="number" class="edit-input rate-input" value="${supplier.realRate}" 
                           min="0" step="0.01" required>
                </td>
                <td class="rate-cell">
                    <input type="number" class="edit-input rate-input" value="${supplier.officialRate}" 
                           min="0" step="0.01" required>
                </td>
                <td class="status-cell">
                    <select class="edit-select status-select" required>
                        <option value="active" ${supplier.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${supplier.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </td>
                <td class="notes-cell">
                    <textarea class="edit-textarea notes-input" maxlength="500" 
                              placeholder="Optional notes...">${this.escapeHtml(supplier.notes || '')}</textarea>
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
    generateRowActions(supplier) {
        return `
            <div class="row-actions">
                <button class="btn btn-small btn-secondary edit-btn" 
                        onclick="editSupplier('${supplier.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-small btn-secondary duplicate-btn" 
                        onclick="duplicateSupplier('${supplier.id}')" title="Duplicate">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-small btn-danger delete-btn" 
                        onclick="deleteSupplier('${supplier.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    /**
     * Applica filtri e ordinamento
     */
    applyFiltersAndSort() {
        // Filtra suppliers
        this.filteredSuppliers = this.suppliers.filter(supplier => {
            // Filtro per ricerca
            if (this.searchQuery) {
                const searchLower = this.searchQuery.toLowerCase();
                const matchesSearch =
                    supplier.name.toLowerCase().includes(searchLower) ||
                    (supplier.notes && supplier.notes.toLowerCase().includes(searchLower));
                if (!matchesSearch) return false;
            }

            // Filtro per status
            if (this.currentFilter === 'active') return supplier.status === 'active';
            if (this.currentFilter === 'inactive') return supplier.status === 'inactive';

            return true; // 'all' filter
        });

        // Ordina suppliers
        this.filteredSuppliers.sort((a, b) => {
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
        this.displayedSuppliers = [];
    }

    /**
     * Carica elementi iniziali
     */
    loadInitialItems() {
        this.displayedSuppliers = [];
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
        const newItems = this.filteredSuppliers.slice(startIndex, endIndex);

        if (newItems.length === 0) {
            this.showEmptyState();
            return;
        }

        this.displayedSuppliers = [...this.displayedSuppliers, ...newItems];
        this.renderTableRows();
        this.currentPage++;
    }

    /**
     * Renderizza le righe della tabella
     */
    renderTableRows() {
        const tbody = document.getElementById('suppliers-table-body');
        if (!tbody) return;

        // Se è la prima pagina, svuota la tabella
        if (this.currentPage === 0) {
            tbody.innerHTML = '';
        }

        // Aggiungi nuove righe
        const newRowsHTML = this.displayedSuppliers
            .slice(this.currentPage * this.itemsPerPage)
            .map(supplier => this.generateSupplierRow(supplier))
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

    isRowSelected(supplierId) {
        // Implementazione per la selezione multipla
        return false; // Per ora
    }

    generateSupplierBadges(supplier) {
        let badges = '';
        if (supplier.isProjectSpecific) {
            badges += '<span class="supplier-badge project-specific">Project</span>';
        }
        if (supplier.isOverridden) {
            badges += '<span class="supplier-badge overridden">Modified</span>';
        }
        return badges;
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    showEmptyState() {
        document.getElementById('table-empty')?.classList.remove('hidden');
    }

    hideEmptyState() {
        document.getElementById('table-empty')?.classList.add('hidden');
    }

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

    /**
     * Utility functions per UI
     */
    showRowLoading(row, show) {
        const actionsCell = row.querySelector('.actions-cell');
        if (!actionsCell) return;

        if (show) {
            actionsCell.innerHTML = '<div class="saving-indicator"><i class="fas fa-spinner fa-spin"></i> Saving...</div>';
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

    handleRowSelection(supplierId, checked) {
        // Implementazione selezione multipla per bulk actions future
        if (!this.selectedRows) this.selectedRows = new Set();

        if (checked) {
            this.selectedRows.add(supplierId);
        } else {
            this.selectedRows.delete(supplierId);
        }

        this.updateBulkActionsState();
    }

    toggleSelectAll(checked) {
        if (!this.selectedRows) this.selectedRows = new Set();

        document.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
            const supplierId = checkbox.dataset.supplierId;
            if (checked) {
                this.selectedRows.add(supplierId);
            } else {
                this.selectedRows.delete(supplierId);
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
        const activeCount = this.suppliers.filter(s => s.status === 'active').length;
        const inactiveCount = this.suppliers.filter(s => s.status === 'inactive').length;

        document.querySelector('[data-filter="all"] .count').textContent = `(${this.suppliers.length})`;
        document.querySelector('[data-filter="active"] .count').textContent = `(${activeCount})`;
        document.querySelector('[data-filter="inactive"] .count').textContent = `(${inactiveCount})`;
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
            this.saveEditingRow(row.dataset.supplierId);
        }
    }

    showBulkActionsMenu() {
        // Implementazione menu bulk actions
        console.log('Bulk actions menu - to be implemented');
    }

    duplicateSupplier(supplierId) {
        const supplier = this.findSupplier(supplierId);
        if (!supplier) return;

        // Crea copia con nuovo ID
        const duplicate = {
            ...supplier,
            id: this.generateId('supplier_'),
            name: `${supplier.name} (Copy)`
        };

        this.showModal(this.currentScope, duplicate);
    }
    showRowLoading(row, show) {
        const actionsCell = row.querySelector('.actions-cell');
        if (!actionsCell) return;

        if (show) {
            actionsCell.innerHTML = '<div class="saving-indicator"><i class="fas fa-spinner fa-spin"></i> Saving...</div>';
        }
    }

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

    handleRowSelection(supplierId, checked) {
        // Implementazione selezione multipla per bulk actions future
        if (!this.selectedRows) this.selectedRows = new Set();

        if (checked) {
            this.selectedRows.add(supplierId);
        } else {
            this.selectedRows.delete(supplierId);
        }

        this.updateBulkActionsState();
    }

    toggleSelectAll(checked) {
        if (!this.selectedRows) this.selectedRows = new Set();

        document.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
            const supplierId = checkbox.dataset.supplierId;
            if (checked) {
                this.selectedRows.add(supplierId);
            } else {
                this.selectedRows.delete(supplierId);
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
        const activeCount = this.suppliers.filter(s => s.status === 'active').length;
        const inactiveCount = this.suppliers.filter(s => s.status === 'inactive').length;

        document.querySelector('[data-filter="all"] .count').textContent = `(${this.suppliers.length})`;
        document.querySelector('[data-filter="active"] .count').textContent = `(${activeCount})`;
        document.querySelector('[data-filter="inactive"] .count').textContent = `(${inactiveCount})`;
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
            this.saveEditingRow(row.dataset.supplierId);
        }
    }

    showBulkActionsMenu() {
        // Implementazione menu bulk actions
        console.log('Bulk actions menu - to be implemented');
    }

    duplicateSupplier(supplierId) {
        const supplier = this.findSupplier(supplierId);
        if (!supplier) return;

        // Crea copia con nuovo ID
        const duplicate = {
            ...supplier,
            id: this.generateId('supplier_'),
            name: `${supplier.name} (Copy)`
        };

        this.showModal(this.currentScope, duplicate);
    }

    /**
     * Setup eventi per i tab di scope
     */
    setupScopeTabEvents() {
        document.querySelectorAll('.suppliers-config-container .scope-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (tab.disabled) return;
                this.switchScope(tab.dataset.scope);
            });
        });
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
        document.querySelectorAll('.suppliers-config-container .scope-tab').forEach(t =>
            t.classList.remove('active'));
        document.querySelector(`[data-scope="${scope}"]`)?.classList.add('active');

        // Ricarica dati
        this.loadSuppliersConfig();
    }

    /**
     * Mostra modal per aggiungere/modificare supplier
     */
    showModal(scope, supplier = null) {
        const modal = document.getElementById('supplier-modal');
        const title = document.getElementById('supplier-modal-title');
        const form = document.getElementById('supplier-form');

        if (!modal || !title || !form) return;

        // Configura modal
        title.textContent = supplier ? 'Edit Supplier' : 'Add Supplier';
        modal.dataset.scope = scope;
        modal.dataset.supplierId = supplier?.id || '';

        // Popola o resetta form
        if (supplier) {
            this.populateForm(supplier);
        } else {
            form.reset();
        }

        // Mostra modal
        modal.classList.add('active');
        setTimeout(() => document.getElementById('supplier-name')?.focus(), 100);
    }

    /**
     * Popola il form con i dati del supplier
     */
    populateForm(supplier) {
        const fields = ['name', 'realRate', 'officialRate', 'status', 'notes'];
        fields.forEach(field => {
            const element = document.getElementById(`supplier-${field.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
            if (element) {
                element.value = supplier[field] || (field === 'status' ? 'active' : '');
            }
        });
    }

    /**
     * Chiude il modal
     */
    closeModal() {
        document.getElementById('supplier-modal')?.classList.remove('active');
    }

    /**
     * Salva il supplier dal modal
     */
    async saveSupplier() {
        const modal = document.getElementById('supplier-modal');
        const scope = modal.dataset.scope;
        const supplierId = modal.dataset.supplierId;
        const form = document.getElementById('supplier-form');

        if (!form) return;

        try {
            const supplierData = this.extractFormData(form, supplierId, scope);

            if (!this.validateSupplierData(supplierData).isValid) {
                return;
            }

            await this.persistSupplier(supplierData, scope, supplierId);
            this.closeModal();
            await this.loadSuppliersConfig();
            this.app.refreshDropdowns();

            NotificationManager.success('Supplier saved successfully');
        } catch (error) {
            console.error('Failed to save supplier:', error);
            NotificationManager.error('Failed to save supplier');
        }
    }

    /**
     * Estrae i dati dal form del modal
     */
    extractFormData(form, supplierId, scope) {
        const formData = new FormData(form);
        return {
            id: supplierId || this.generateId('supplier_'),
            name: formData.get('name').trim(),
            realRate: parseFloat(formData.get('realRate')) || 0,
            officialRate: parseFloat(formData.get('officialRate')) || 0,
            status: formData.get('status'),
            notes: formData.get('notes').trim(),
            isGlobal: scope === 'global'
        };
    }

    /**
     * Persiste il supplier
     */
    async persistSupplier(supplierData, scope, supplierId) {
        if (scope === 'global') {
            this.persistGlobalSupplier(supplierData, supplierId);
        } else {
            this.persistProjectSupplier(supplierData);
        }
    }

    /**
     * Persiste supplier globale
     */
    persistGlobalSupplier(supplierData, supplierId) {
        if (!this.configManager.globalConfig.suppliers) {
            this.configManager.globalConfig.suppliers = [];
        }

        if (supplierId) {
            // Modifica esistente
            const index = this.configManager.globalConfig.suppliers.findIndex(s => s.id === supplierId);
            if (index >= 0) {
                this.configManager.globalConfig.suppliers[index] = supplierData;
            }
        } else {
            // Nuovo supplier
            this.configManager.globalConfig.suppliers.push(supplierData);
        }
        this.configManager.saveGlobalConfig();
    }

    /**
     * Persiste supplier di progetto
     */
    persistProjectSupplier(supplierData) {
        this.configManager.addSupplierToProject(this.app.currentProject.config, supplierData);
        this.app.markDirty();
    }

    /**
     * Elimina supplier
     */
    async deleteSupplier(supplierId, scope = null) {
        if (!confirm('Are you sure you want to delete this supplier?')) return;

        try {
            const actualScope = scope || this.currentScope;

            if (actualScope === 'global') {
                this.configManager.globalConfig.suppliers =
                    this.configManager.globalConfig.suppliers.filter(s => s.id !== supplierId);
                this.configManager.saveGlobalConfig();
            } else {
                this.configManager.deleteSupplierFromProject(this.app.currentProject.config, supplierId);
                this.app.markDirty();
            }

            // Aggiorna tabella
            this.suppliers = this.suppliers.filter(s => s.id !== supplierId);
            this.refreshTable();
            this.app.refreshDropdowns();

            NotificationManager.success('Supplier deleted successfully');
        } catch (error) {
            console.error('Failed to delete supplier:', error);
            NotificationManager.error('Failed to delete supplier');
        }
    }

    /**
     * Copia supplier globali al progetto corrente
     */
    async copyGlobalSuppliersToProject() {
        try {
            if (!this.app.currentProject || !this.configManager) {
                NotificationManager.warning('No project loaded or configuration manager not available');
                return;
            }

            const globalSuppliers = this.configManager.globalConfig?.suppliers || [];
            if (globalSuppliers.length === 0) {
                NotificationManager.info('No global suppliers to copy');
                return;
            }

            let copiedCount = 0;
            for (const supplier of globalSuppliers) {
                const projectSupplier = {
                    ...supplier,
                    id: this.generateId('supplier_proj_'),
                    isProjectSpecific: true,
                    isGlobal: false
                };

                this.configManager.addSupplierToProject(this.app.currentProject.config, projectSupplier);
                copiedCount++;
            }

            this.app.markDirty();
            await this.loadSuppliersConfig();
            this.app.refreshDropdowns();

            NotificationManager.success(`Copied ${copiedCount} suppliers from global configuration`);
        } catch (error) {
            console.error('Failed to copy suppliers from global:', error);
            NotificationManager.error('Failed to copy suppliers from global configuration');
        }
    }

    /**
     * Esporta supplier globali
     */
    exportGlobalSuppliers() {
        try {
            const globalSuppliers = this.configManager?.globalConfig?.suppliers || [];

            if (globalSuppliers.length === 0) {
                NotificationManager.info('No global suppliers to export');
                return;
            }

            const exportData = {
                metadata: {
                    type: 'suppliers',
                    version: '1.0.0',
                    exportDate: new Date().toISOString(),
                    count: globalSuppliers.length
                },
                suppliers: globalSuppliers
            };

            this.downloadFile(
                JSON.stringify(exportData, null, 2),
                `suppliers-export-${new Date().toISOString().split('T')[0]}.json`,
                'application/json'
            );

            NotificationManager.success('Global suppliers exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            NotificationManager.error('Failed to export suppliers');
        }
    }

    /**
     * Disabilita supplier per il progetto corrente
     */
    async disableSupplier(supplierId) {
        try {
            if (!this.app.currentProject) return;

            this.ensureProjectOverrides();

            const existingOverride = this.app.currentProject.config.projectOverrides.suppliers.find(s => s.id === supplierId);
            if (existingOverride) {
                existingOverride.status = 'inactive';
            } else {
                this.app.currentProject.config.projectOverrides.suppliers.push({
                    id: supplierId,
                    status: 'inactive'
                });
            }

            this.app.markDirty();
            await this.loadSuppliersConfig();
            this.app.refreshDropdowns();

            NotificationManager.success('Supplier disabled for this project');
        } catch (error) {
            console.error('Failed to disable supplier:', error);
            NotificationManager.error('Failed to disable supplier');
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

    generateId(prefix = 'supplier_') {
        return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    downloadFile(content, filename, mimeType) {
        if (typeof Helpers !== 'undefined' && Helpers.downloadAsFile) {
            Helpers.downloadAsFile(content, filename, mimeType);
        } else {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    // Mantengo le funzioni esistenti per scope selector e modal
    generateScopeSelector(data) {
        return `
            <div class="suppliers-scope-selector">
                <div class="scope-tabs">
                    <button class="scope-tab active" data-scope="global">
                        <i class="fas fa-globe"></i> Global Suppliers
                        <span class="count">(${data.global.length})</span>
                    </button>
                    <button class="scope-tab ${!data.hasProject ? 'disabled' : ''}" 
                            data-scope="project" ${!data.hasProject ? 'disabled' : ''}>
                        <i class="fas fa-project-diagram"></i> Project Suppliers
                        <span class="count">(${data.project.length})</span>
                    </button>
                </div>
            </div>
        `;
    }

    generateSupplierModal() {
        return `
            <div id="supplier-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="supplier-modal-title">Add Supplier</h3>
                        <button class="modal-close" onclick="closeSuppliersModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="supplier-form">
                            <div class="form-group">
                                <label for="supplier-name">Supplier Name:</label>
                                <input type="text" id="supplier-name" name="name" required maxlength="100" 
                                       placeholder="Enter supplier company name">
                            </div>
                            <div class="form-group">
                                <label for="supplier-real-rate">Real Rate (€/day):</label>
                                <input type="number" id="supplier-real-rate" name="realRate" min="0" step="0.01" required
                                       placeholder="Actual daily rate">
                            </div>
                            <div class="form-group">
                                <label for="supplier-official-rate">Official Rate (€/day):</label>
                                <input type="number" id="supplier-official-rate" name="officialRate" min="0" step="0.01" required
                                       placeholder="Official/invoiced daily rate">
                            </div>
                            <div class="form-group">
                                <label for="supplier-status">Status:</label>
                                <select id="supplier-status" name="status" required>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="supplier-notes">Notes (Optional):</label>
                                <textarea id="supplier-notes" name="notes" rows="3" maxlength="500" 
                                          placeholder="Additional notes about this supplier"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeSuppliersModal()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveSuppliersModal()">Save Supplier</button>
                    </div>
                </div>
            </div>
        `;
    }

    getSupplierData() {
        const globalSuppliers = this.configManager?.globalConfig?.suppliers || [];
        const currentProject = this.app.currentProject;
        const projectSuppliers = currentProject ?
            this.configManager.getSuppliers(currentProject.config) : [];

        return {
            global: globalSuppliers,
            project: projectSuppliers,
            hasProject: !!currentProject
        };
    }
}

// Funzioni globali per compatibilità con l'HTML esistente
window.showSuppliersModal = function(scope, supplier = null) {
    window.app.supplierConfigManager.showModal(scope, supplier);
};

window.closeSuppliersModal = function() {
    window.app.supplierConfigManager.closeModal();
};

window.saveSuppliersModal = function() {
    window.app.supplierConfigManager.saveSupplier();
};

window.editSupplier = function(supplierId, scope) {
    window.app.supplierConfigManager.startEditingRow(supplierId);
};

window.deleteSupplier = function(supplierId, scope) {
    window.app.supplierConfigManager.deleteSupplier(supplierId, scope);
};

window.disableSupplier = function(supplierId) {
    window.app.supplierConfigManager.disableSupplier(supplierId);
};

window.duplicateSupplier = function(supplierId) {
    window.app.supplierConfigManager.duplicateSupplier(supplierId);
};

// Esporta la classe
if (typeof window !== 'undefined') {
    window.SupplierConfigManager = SupplierConfigManager;
}