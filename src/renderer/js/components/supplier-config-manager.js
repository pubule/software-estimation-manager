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

        // Flags to prevent double operations
        this.isResetting = false;
        this.isSavingSupplier = false;
        
        // Default suppliers with the provided values
        this.defaultSuppliers = [
            {
                id: 'reply-g1-it',
                name: 'Reply',
                role: 'G1',
                department: 'IT',
                realRate: 463.00,
                officialRate: 463.00,
                isGlobal: true
            },
            {
                id: 'quid-g1-it',
                name: 'Quid',
                role: 'G1',
                department: 'IT',
                realRate: 506.30,
                officialRate: 506.30,
                isGlobal: true
            },
            {
                id: 'pwc-g1-it',
                name: 'PwC',
                role: 'G1',
                department: 'IT',
                realRate: 402.60,
                officialRate: 402.60,
                isGlobal: true
            },
            {
                id: 'reply-pm-it',
                name: 'Reply',
                role: 'PM',
                department: 'IT',
                realRate: 463.00,
                officialRate: 463.00,
                isGlobal: true
            },
            {
                id: 'quid-pm-it',
                name: 'Quid',
                role: 'PM',
                department: 'IT',
                realRate: 506.30,
                officialRate: 506.30,
                isGlobal: true
            },
            {
                id: 'pwc-pm-it',
                name: 'PwC',
                role: 'PM',
                department: 'IT',
                realRate: 402.60,
                officialRate: 402.60,
                isGlobal: true
            },
            {
                id: 'reply-g2-it',
                name: 'Reply',
                role: 'G2',
                department: 'IT',
                realRate: 323.30,
                officialRate: 323.30,
                isGlobal: true
            },
            {
                id: 'quid-g2-it',
                name: 'Quid',
                role: 'G2',
                department: 'IT',
                realRate: 375.76,
                officialRate: 375.76,
                isGlobal: true
            },
            {
                id: 'pwc-g2-it',
                name: 'PwC',
                role: 'G2',
                department: 'IT',
                realRate: 317.20,
                officialRate: 317.20,
                isGlobal: true
            }
        ];

        // Bind methods to window for global access
        this.exposeGlobalMethods();
    }

    exposeGlobalMethods() {
        window.showSuppliersModal = this.showModal.bind(this);
        window.closeSuppliersModal = this.closeModal.bind(this);
        // Removed: window.saveSuppliersModal - now using form submission
        // window.editSupplier = this.startEditingRow.bind(this); // Rimosso - usa solo delegazione eventi
        // window.deleteSupplier = this.deleteSupplier.bind(this); // Rimosso - usa solo delegazione eventi  
        window.disableSupplier = this.disableSupplier.bind(this);
        // window.duplicateSupplier = this.duplicateSupplier.bind(this); // Rimosso - usa solo delegazione eventi
    }

    /**
     * Carica e renderizza la configurazione supplier
     */
    async loadSuppliersConfig() {
        // Previene il reload durante la duplicazione
        if (this.isDuplicating) {
            console.log('Skipping reload during duplication');
            return;
        }
        
        const contentDiv = document.getElementById(this.containerId);
        if (!contentDiv) {
            console.error('Suppliers content container not found');
            return;
        }

        // Ensure default suppliers exist
        this.ensureDefaultSuppliers();

        const supplierData = this.getSupplierData();
        this.suppliers = this.currentScope === 'global' ? supplierData.global : supplierData.project;

        contentDiv.innerHTML = this.generateSuppliersHTML(supplierData);
        this.eventListenersSetup = false; // Reset flag when HTML is regenerated
        this.setupEventListeners();
        this.applyFiltersAndSort();
        this.loadInitialItems();
        
    }

    /**
     * Ensure default suppliers exist in global configuration
     */
    ensureDefaultSuppliers(forceReset = false) {
        console.log('ensureDefaultSuppliers called, forceReset:', forceReset);
        
        // Previene il reload durante la duplicazione
        if (this.isDuplicating && !forceReset) {
            console.log('Skipping ensureDefaultSuppliers during duplication');
            return;
        }
        
        if (!this.configManager || !this.configManager.globalConfig) {
            console.log('ConfigManager or globalConfig not available');
            return;
        }
        
        const existingSuppliers = this.configManager.globalConfig.suppliers;
        console.log('Existing suppliers:', existingSuppliers?.length || 0);
        
        if (!existingSuppliers || existingSuppliers.length === 0 || forceReset) {
            console.log('Initializing default suppliers:', this.defaultSuppliers.length);
            console.log('Force reset:', forceReset);
            this.configManager.globalConfig.suppliers = [...this.defaultSuppliers];
            this.configManager.saveGlobalConfig();
            console.log('Default suppliers initialized successfully');
        } else {
            console.log('Suppliers already exist, skipping initialization');
        }
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
        console.log('Setting up event listeners');
        
        // Previene setup multipli
        if (this.eventListenersSetup) {
            console.log('Event listeners already setup, skipping');
            return;
        }
        
        this.cleanupEventListeners();

        this.setupScopeTabEvents();
        this.setupTableControls();
        this.setupTableEvents();
        this.setupScrollInfinito();
        this.setupKeyboardShortcuts();
        this.setupFormSubmission();
        
        this.eventListenersSetup = true;
    }

    cleanupEventListeners() {
        this.eventListenersSetup = false;
        // Rimuovi listener dai controlli principali
        const addBtn = document.getElementById('add-supplier-btn');
        if (addBtn) {
            addBtn.replaceWith(addBtn.cloneNode(true));
        }

        const bulkBtn = document.getElementById('bulk-actions-btn');
        if (bulkBtn) {
            bulkBtn.replaceWith(bulkBtn.cloneNode(true));
        }

        const selectAllCheckbox = document.getElementById('select-all-suppliers');
        if (selectAllCheckbox) {
            selectAllCheckbox.replaceWith(selectAllCheckbox.cloneNode(true));
        }

        const searchInput = document.getElementById('supplier-search');
        if (searchInput) {
            searchInput.replaceWith(searchInput.cloneNode(true));
        }

        // Rimuovi listener dai filtri
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.replaceWith(chip.cloneNode(true));
        });

        // Rimuovi listener dai tab
        document.querySelectorAll('.suppliers-config-container .scope-tab').forEach(tab => {
            tab.replaceWith(tab.cloneNode(true));
        });
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

        // Reset to default button
        document.getElementById('reset-suppliers-btn')?.addEventListener('click', () => {
            this.resetToDefaultSuppliers();
        });
    }

    /**
     * Setup eventi per la tabella
     */
    setupTableEvents() {
        // Rimuovi listener esistenti prima di aggiungerne di nuovi
        if (this.tableClickHandler) {
            const tbody = document.getElementById('suppliers-table-body');
            if (tbody) {
                tbody.removeEventListener('click', this.tableClickHandler);
                tbody.removeEventListener('change', this.tableChangeHandler);
                tbody.removeEventListener('input', this.tableInputHandler);
                tbody.removeEventListener('keydown', this.tableKeydownHandler);
            }
            
            const table = document.querySelector('.suppliers-table');
            if (table && this.tableSortHandler) {
                table.removeEventListener('click', this.tableSortHandler);
            }
        }
        
        const table = document.querySelector('.suppliers-table');
        if (!table) return;

        // Crea e memorizza i gestori di eventi legati al contesto
        this.tableSortHandler = (e) => {
            const sortableHeader = e.target.closest('.sortable');
            if (sortableHeader) {
                this.handleSort(sortableHeader.dataset.field);
            }
        };
        
        this.tableClickHandler = this.handleTableClick.bind(this);
        this.tableChangeHandler = this.handleTableChange.bind(this);
        this.tableInputHandler = this.handleTableInput.bind(this);
        this.tableKeydownHandler = this.handleTableKeydown.bind(this);

        // Ordinamento colonne
        table.addEventListener('click', this.tableSortHandler);

        // Delegazione eventi per righe dinamiche
        const tbody = document.getElementById('suppliers-table-body');
        if (tbody) {
            tbody.addEventListener('click', this.tableClickHandler);
            tbody.addEventListener('change', this.tableChangeHandler);
            tbody.addEventListener('input', this.tableInputHandler);
            tbody.addEventListener('keydown', this.tableKeydownHandler);
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
            console.log('Duplicate button clicked for supplier:', supplierId);
            
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
     * Mostra o nasconde lo stato di loading per una riga della tabella
     * @param {HTMLElement} row - L'elemento riga della tabella
     * @param {boolean} show - Se true mostra il loading, se false lo nasconde
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
     * Valida i dati del supplier
     * @param {Object} supplierData - Dati del supplier da validare
     * @returns {Object} - Oggetto con isValid (boolean) e errors (array)
     */
    validateSupplierData(supplierData) {
        const errors = [];

        // Validazione nome
        if (!supplierData.name || !supplierData.name.trim()) {
            errors.push('Supplier name is required');
        } else if (supplierData.name.trim().length > 100) {
            errors.push('Supplier name must be 100 characters or less');
        } else if (supplierData.name.trim().length < 2) {
            errors.push('Supplier name must be at least 2 characters');
        }

        // Validazione role
        if (!supplierData.role || !supplierData.role.trim()) {
            errors.push('Role is required');
        } else if (supplierData.role.trim().length > 100) {
            errors.push('Role must be 100 characters or less');
        }

        // Validazione department
        if (!supplierData.department || !supplierData.department.trim()) {
            errors.push('Department is required');
        } else if (supplierData.department.trim().length > 50) {
            errors.push('Department must be 50 characters or less');
        }

        // Validazione real rate
        if (supplierData.realRate === undefined || supplierData.realRate === null) {
            errors.push('Real rate is required');
        } else if (isNaN(supplierData.realRate) || supplierData.realRate <= 0) {
            errors.push('Real rate must be a positive number');
        } else if (supplierData.realRate > 10000) {
            errors.push('Real rate seems unreasonably high (max 10,000 €/day)');
        }

        // Validazione official rate
        if (supplierData.officialRate === undefined || supplierData.officialRate === null) {
            errors.push('Official rate is required');
        } else if (isNaN(supplierData.officialRate) || supplierData.officialRate <= 0) {
            errors.push('Official rate must be a positive number');
        } else if (supplierData.officialRate > 10000) {
            errors.push('Official rate seems unreasonably high (max 10,000 €/day)');
        }

        // Validazione ID (se presente)
        if (supplierData.id && typeof supplierData.id !== 'string') {
            errors.push('Supplier ID must be a string');
        }

        // Validazione duplicati (controllo nome univoco)
        if (supplierData.name && supplierData.name.trim()) {
            const duplicateSupplier = this.suppliers.find(s =>
                s.id !== supplierData.id &&
                s.name.toLowerCase().trim() === supplierData.name.toLowerCase().trim()
            );

            if (duplicateSupplier) {
                errors.push('A supplier with this name already exists');
            }
        }

        // Validazione logica di business
        if (supplierData.realRate && supplierData.officialRate &&
            supplierData.realRate > supplierData.officialRate * 2) {
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
        const roleInput = row.querySelector('.role-input');
        const departmentInput = row.querySelector('.department-input');
        const realRateInput = row.querySelector('.rate-input');
        const officialRateInput = row.querySelectorAll('.rate-input')[1];

        return {
            id: row.dataset.supplierId,
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
        const row = field.closest('.supplier-row');
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
     * Setup form submission handling
     */
    setupFormSubmission() {
        // Add listener directly to the form when modal is shown
        // This will be handled in showModal method
    }

    /**
     * Setup form submit listener for the modal
     */
    setupModalFormListener() {
        const form = document.getElementById('supplier-form');
        if (form) {
            // Remove existing listener
            if (this.boundFormSubmitHandler) {
                form.removeEventListener('submit', this.boundFormSubmitHandler);
            }
            
            // Create and add bound handler
            this.boundFormSubmitHandler = this.handleFormSubmit.bind(this);
            form.addEventListener('submit', this.boundFormSubmitHandler);
        }
    }

    /**
     * Handle form submissions
     */
    handleFormSubmit(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        console.log('Supplier form submitted');
        
        // Prevent double submission
        if (!this.isSavingSupplier) {
            this.saveSupplier();
        } else {
            console.log('Supplier form submission ignored - save in progress');
        }
    }

    /**
     * Genera i controlli della tabella (filtri, ricerca, azioni)
     */
    generateTableControls() {
        const roles = [...new Set(this.suppliers.map(s => s.role).filter(r => r))];
        
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
                        ${roles.map(role => `
                            <button class="filter-chip ${this.currentFilter === role ? 'active' : ''}" 
                                    data-filter="${role}">
                                ${role} <span class="count">(${this.suppliers.filter(s => s.role === role).length})</span>
                            </button>
                        `).join('')}
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
                    <thead class="suppliers-table-header">
                        <tr>
                            <th class="checkbox-col">
                                <input type="checkbox" id="select-all-suppliers">
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
                    <tbody id="suppliers-table-body" class="table-body">
                        <!-- Rows will be populated here -->
                    </tbody>
                </table>
                <div id="suppliers-table-loading" class="table-loading hidden">
                    <div class="loading-spinner"></div>
                    <span>Loading more suppliers...</span>
                </div>
                <div id="suppliers-table-empty" class="table-empty hidden">
                    <i class="fas fa-users empty-icon"></i>
                    <h3>No suppliers found</h3>
                    <p>Try adjusting your search or filters, or add a new supplier to get started.</p>
                </div>
            </div>
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
                <td class="role-cell">
                    <span class="role-value">${this.escapeHtml(supplier.role || '')}</span>
                </td>
                <td class="department-cell">
                    <span class="department-badge dept-${(supplier.department || '').toLowerCase().replace(/\s+/g, '-')}">${this.escapeHtml(supplier.department || '')}</span>
                </td>
                <td class="rate-cell">
                    <span class="rate-value">€${supplier.realRate.toLocaleString()}</span>
                </td>
                <td class="rate-cell">
                    <span class="rate-value">€${supplier.officialRate.toLocaleString()}</span>
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
                <td class="role-cell">
                    <input type="text" class="edit-input role-input" value="${this.escapeHtml(supplier.role || '')}" 
                           maxlength="100" required>
                </td>
                <td class="department-cell">
                    <input type="text" class="edit-input department-input" value="${this.escapeHtml(supplier.department || '')}" 
                           maxlength="50" required>
                </td>
                <td class="rate-cell">
                    <input type="number" class="edit-input rate-input" value="${supplier.realRate}" 
                           min="0" step="0.01" required>
                </td>
                <td class="rate-cell">
                    <input type="number" class="edit-input rate-input" value="${supplier.officialRate}" 
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
    generateRowActions(supplier) {
        return `
            <div class="row-actions">
                <button class="btn btn-small btn-secondary edit-btn" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-small btn-secondary duplicate-btn" title="Duplicate">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-small btn-danger delete-btn" title="Delete">
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
                    (supplier.role || '').toLowerCase().includes(searchLower) ||
                    (supplier.department || '').toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Filtro per role
            if (this.currentFilter !== 'all') {
                return supplier.role === this.currentFilter;
            }

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
            // Show empty state only if this is the first page (table is truly empty)
            if (this.currentPage === 0) {
                this.showEmptyState();
            }
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
        document.getElementById('suppliers-table-empty')?.classList.remove('hidden');
    }

    hideEmptyState() {
        document.getElementById('suppliers-table-empty')?.classList.add('hidden');
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
        const roles = [...new Set(this.suppliers.map(s => s.role).filter(r => r))];
        
        document.querySelector('[data-filter="all"] .count').textContent = `(${this.suppliers.length})`;
        
        roles.forEach(role => {
            const count = this.suppliers.filter(s => s.role === role).length;
            const chip = document.querySelector(`[data-filter="${role}"] .count`);
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
            this.saveEditingRow(row.dataset.supplierId);
        }
    }

    showBulkActionsMenu() {
        // Implementazione menu bulk actions
        console.log('Bulk actions menu - to be implemented');
    }

    duplicateSupplier(supplierId) {
        console.log('duplicateSupplier called with:', supplierId);
        const supplier = this.findSupplier(supplierId);
        console.log('Found supplier:', supplier);
        if (!supplier) {
            console.error('Supplier not found for ID:', supplierId);
            return;
        }

        // Set flag to prevent config reload during duplication
        this.isDuplicating = true;

        // Apri modal vuota per nuovo supplier
        this.showModal(this.currentScope, null, true);
        
        // Popola i campi manualmente DOPO aver aperto la modal (come fa categories)
        setTimeout(() => {
            document.getElementById('supplier-name').value = `${supplier.name} (Copy)`;
            document.getElementById('supplier-role').value = supplier.role || '';
            document.getElementById('supplier-department').value = supplier.department || '';
            document.getElementById('supplier-real-rate').value = supplier.realRate || '';
            document.getElementById('supplier-official-rate').value = supplier.officialRate || '';
            
            // Update modal title
            document.getElementById('supplier-modal-title').textContent = 'Duplicate Supplier';
        }, 10);
    }

    /**
     * Reset suppliers to default values
     */
    async resetToDefaultSuppliers() {
        // Prevent multiple simultaneous reset operations
        if (this.isResetting) {
            console.log('Reset already in progress, ignoring...');
            return;
        }
        
        // Set flag immediately to prevent double execution
        this.isResetting = true;
        
        try {
            if (!confirm('Are you sure you want to reset all suppliers to default values? This will remove all custom suppliers.')) {
                // User cancelled, reset flag and return
                this.isResetting = false;
                return;
            }

            console.log('Resetting suppliers to default values');
            
            // Force reset to default suppliers
            this.ensureDefaultSuppliers(true);
            
            // Reload the data and refresh the display
            console.log('Reset: calling loadSuppliersConfig');
            await this.loadSuppliersConfig();
            
            // Refresh dropdowns in the main app - DISABLED to prevent double event listeners
            // console.log('Reset: calling refreshDropdowns');
            // if (this.app && this.app.refreshDropdowns) {
            //     this.app.refreshDropdowns();
            // }
            // console.log('Reset: refreshDropdowns completed');
            
            // Show success notification
            if (window.NotificationManager) {
                window.NotificationManager.success('Suppliers have been reset to default values');
            } else {
                console.log('SUCCESS: Suppliers have been reset to default values');
            }
            
        } catch (error) {
            console.error('Error resetting suppliers to default:', error);
            if (window.NotificationManager) {
                window.NotificationManager.error('Error resetting suppliers to default');
            } else {
                console.log('ERROR: Error resetting suppliers to default');
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
        document.querySelectorAll('.suppliers-config-container .scope-tab').forEach(t =>
            t.classList.remove('active'));
        document.querySelector(`[data-scope="${scope}"]`)?.classList.add('active');

        // Ricarica dati
        this.loadSuppliersConfig();
    }

    /**
     * Mostra modal per aggiungere/modificare supplier
     */
    showModal(scope, supplier = null, isNewSupplier = false) {
        const modal = document.getElementById('supplier-modal');
        const title = document.getElementById('supplier-modal-title');
        const form = document.getElementById('supplier-form');

        if (!modal || !title || !form) return;

        // Configura modal
        title.textContent = supplier && !isNewSupplier ? 'Edit Supplier' : 'Add Supplier';
        modal.dataset.scope = scope;
        // Solo per editing di supplier esistente imposta l'ID
        modal.dataset.supplierId = (supplier && !isNewSupplier) ? supplier.id : '';
        modal.dataset.isNewSupplier = isNewSupplier ? 'true' : 'false';

        // Popola o resetta form
        if (supplier) {
            this.populateForm(supplier);
        } else {
            form.reset();
        }

        // Setup form submission listener
        this.setupModalFormListener();
        
        // Mostra modal
        modal.classList.add('active');
        setTimeout(() => document.getElementById('supplier-name')?.focus(), 100);
    }

    /**
     * Popola il form con i dati del supplier
     */
    populateForm(supplier) {
        const fields = ['name', 'role', 'department', 'realRate', 'officialRate'];
        fields.forEach(field => {
            const element = document.getElementById(`supplier-${field.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
            if (element) {
                element.value = supplier[field] || '';
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
        // Prevent multiple simultaneous save operations
        if (this.isSavingSupplier) {
            console.log('Supplier save already in progress, ignoring...');
            return;
        }
        
        this.isSavingSupplier = true;
        
        console.log('saveSupplier called');
        const modal = document.getElementById('supplier-modal');
        const scope = modal.dataset.scope;
        const supplierId = modal.dataset.supplierId;
        const isNewSupplier = modal.dataset.isNewSupplier === 'true';
        const form = document.getElementById('supplier-form');
        
        console.log('Modal data - scope:', scope, 'supplierId:', supplierId, 'isNewSupplier:', isNewSupplier);

        if (!form) {
            this.isSavingSupplier = false;
            return;
        }

        try {
            // Mostra loading nel modal
            this.showModalLoading(true);

            // Estrai dati dal form
            const supplierData = this.extractFormData(form, supplierId, scope, isNewSupplier);
            console.log('Extracted supplier data:', supplierData);

            // Valida dati
            const validation = this.validateSupplierData(supplierData);
            if (!validation.isValid) {
                this.showModalErrors(validation.errors);
                this.showModalLoading(false);
                return;
            }

            // Persiste il supplier
            console.log('About to persist supplier...');
            await this.persistSupplier(supplierData, scope, isNewSupplier ? null : supplierId);
            console.log('Supplier persisted successfully');

            // Ricarica la lista dalla configurazione aggiornata invece di aggiungere manualmente
            const reloadedData = this.getSupplierData();
            this.suppliers = this.currentScope === 'global' ? reloadedData.global : reloadedData.project;

            // Chiudi modal e aggiorna UI
            this.closeModal();
            
            // Reset flag di duplicazione se attivo
            const wasDuplicating = this.isDuplicating;
            if (this.isDuplicating) {
                this.isDuplicating = false;
            }
            
            // Only reload if not duplicating to prevent double event listeners
            if (!wasDuplicating) {
                await this.loadSuppliersConfig();
            } else {
                // Just refresh the table display without full reload
                this.applyFiltersAndSort();
                this.loadInitialItems(); // Re-renderizza la tabella HTML
                this.updateFilterCounts(); // Aggiorna i contatori dei filtri
            }
            this.app.refreshDropdowns();

            NotificationManager.success(
                (supplierId && !isNewSupplier) ? 'Supplier updated successfully' : 'Supplier created successfully'
            );

        } catch (error) {
            console.error('Failed to save supplier:', error);
            this.showModalErrors(['Failed to save supplier: ' + error.message]);
            NotificationManager.error('Failed to save supplier');
        } finally {
            this.showModalLoading(false);
            this.isSavingSupplier = false;
        }
    }

    showModalLoading(show) {
        const saveBtn = document.querySelector('#supplier-modal .btn-primary');
        const cancelBtn = document.querySelector('#supplier-modal .btn-secondary');
        const form = document.getElementById('supplier-form');

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
                saveBtn.innerHTML = 'Save Supplier';
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
        const existingErrors = document.querySelector('#supplier-modal .modal-errors');
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
        const modalBody = document.querySelector('#supplier-modal .modal-body');
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
    extractFormData(form, supplierId, scope, isNewSupplier = false) {
        const nameField = document.getElementById('supplier-name');
        const roleField = document.getElementById('supplier-role');
        const departmentField = document.getElementById('supplier-department');
        const realRateField = document.getElementById('supplier-real-rate');
        const officialRateField = document.getElementById('supplier-official-rate');

        return {
            id: (isNewSupplier || !supplierId) ? this.generateId('supplier_') : supplierId,
            name: nameField?.value?.trim() || '',
            role: roleField?.value?.trim() || '',
            department: departmentField?.value?.trim() || '',
            realRate: parseFloat(realRateField?.value) || 0,
            officialRate: parseFloat(officialRateField?.value) || 0,
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
                <div class="scope-actions">
                    <button class="btn btn-small btn-secondary" id="reset-suppliers-btn" title="Reset to Default Suppliers">
                        <i class="fas fa-undo"></i> Reset to Default
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
                                <label for="supplier-role">Role:</label>
                                <input type="text" id="supplier-role" name="role" required maxlength="100" 
                                       placeholder="e.g., G1, G2, PM, Tech Lead">
                            </div>
                            <div class="form-group">
                                <label for="supplier-department">Department:</label>
                                <input type="text" id="supplier-department" name="department" required maxlength="50" 
                                       placeholder="e.g., IT, Development, Operations">
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
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeSuppliersModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary" form="supplier-form">Save Supplier</button>
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

// Esporta la classe
if (typeof window !== 'undefined') {
    window.SupplierConfigManager = SupplierConfigManager;
}