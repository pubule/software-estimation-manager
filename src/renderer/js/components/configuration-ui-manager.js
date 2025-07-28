class ConfigurationUIManager {
    constructor(app, configManager) {
        this.app = app;
        this.configManager = configManager;
        this.currentTab = 'storage';
        this.subManagers = new Map();
    }

    /**
     * Renderizza l'intera interfaccia di configurazione
     */
    render() {
        const container = document.querySelector('#configuration-page .config-content');
        if (!container) return;

        container.innerHTML = this.generateConfigurationHTML();
        this.initializeTabFunctionality();
        this.loadTabContent(this.currentTab);
    }

    /**
     * Genera l'HTML per la configurazione
     */
    generateConfigurationHTML() {
        return `
            <div class="config-tabs">
                <div class="tabs">
                    <div class="tabs-nav">
                        <button class="tab-button active" data-tab="storage">Storage</button>
                        <button class="tab-button" data-tab="global">Global Config</button>
                        <button class="tab-button" data-tab="suppliers">Suppliers</button>
                        <button class="tab-button" data-tab="resources">Internal Resources</button>
                        <button class="tab-button" data-tab="categories">Categories</button>
                        <button class="tab-button" data-tab="parameters">Parameters</button>
                    </div>
                </div>
                
                <div class="tab-content">
                    ${this.generateTabPanes()}
                </div>
            </div>
        `;
    }

    /**
     * Genera i pane dei tab
     */
    generateTabPanes() {
        const tabs = [
            { id: 'storage', title: 'Projects Storage Configuration', description: '' },
            { id: 'global', title: 'Global Default Configuration', description: 'These settings apply to all new projects by default. Projects can override these settings individually.' },
            { id: 'suppliers', title: 'Suppliers Configuration', description: 'Manage external suppliers and their rates. These will be available for all new projects by default.' },
            { id: 'resources', title: 'Internal Resources Configuration', description: 'Manage internal team resources like developers, analysts, and project managers.' },
            { id: 'categories', title: 'Feature Categories Configuration', description: 'Manage feature categories and their complexity multipliers.' },
            { id: 'parameters', title: 'Calculation Parameters', description: 'Configure global calculation parameters like working days, currency, and margins.' }
        ];

        return tabs.map((tab, index) => `
            <div id="${tab.id}-tab" class="tab-pane ${index === 0 ? 'active' : ''}">
                <div class="config-section-header">
                    <h3>${tab.title}</h3>
                    ${tab.description ? `<p class="config-description">${tab.description}</p>` : ''}
                </div>
                <div id="${tab.id}-content">
                    <!-- Content will be loaded here -->
                </div>
            </div>
        `).join('');
    }

    /**
     * Inizializza la funzionalità dei tab
     */
    initializeTabFunctionality() {
        const tabButtons = document.querySelectorAll('.config-tabs .tab-button');
        const tabPanes = document.querySelectorAll('.config-tabs .tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName, tabButtons, tabPanes);
            });
        });
    }

    /**
     * Cambia tab attivo
     */
    switchTab(tabName, tabButtons, tabPanes) {
        // Update UI
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        const activePane = document.getElementById(`${tabName}-tab`);

        if (activeButton) activeButton.classList.add('active');
        if (activePane) activePane.classList.add('active');

        // Load content
        this.currentTab = tabName;
        this.loadTabContent(tabName);
    }

    /**
     * Carica il contenuto per un tab specifico
     */
    async loadTabContent(tabName) {
        const contentDiv = document.getElementById(`${tabName}-content`);
        if (!contentDiv) return;

        try {
            switch (tabName) {
                case 'storage':
                    await this.loadStorageConfig(contentDiv);
                    break;
                case 'global':
                    await this.loadGlobalConfig(contentDiv);
                    break;
                case 'suppliers':
                    await this.loadSuppliersConfig(contentDiv);
                    break;
                case 'resources':
                    await this.loadResourcesConfig(contentDiv);
                    break;
                case 'categories':
                    await this.loadCategoriesConfig(contentDiv);
                    break;
                case 'parameters':
                    await this.loadParametersConfig(contentDiv);
                    break;
                default:
                    contentDiv.innerHTML = `<p>Configuration for ${tabName} will be implemented here...</p>`;
            }
        } catch (error) {
            console.error(`Failed to load ${tabName} config:`, error);
            contentDiv.innerHTML = `<p class="error">Failed to load ${tabName} configuration</p>`;
        }
    }

    /**
     * Carica configurazione supplier
     */
    async loadSuppliersConfig(contentDiv) {
        if (!this.subManagers.has('suppliers')) {
            this.subManagers.set('suppliers', new SupplierConfigManager(this.configManager, this.app));
        }

        const supplierManager = this.subManagers.get('suppliers');
        await supplierManager.loadSuppliersConfig();
    }

    /**
     * Carica configurazione storage
     */
    async loadStorageConfig(contentDiv) {
        if (!this.subManagers.has('storage')) {
            this.subManagers.set('storage', new StorageConfigManager(this.app.dataManager, this.app));
        }

        const storageManager = this.subManagers.get('storage');
        await storageManager.loadStorageConfig();
    }

    /**
     * Carica configurazione globale
     */
    async loadGlobalConfig(contentDiv) {
        // Implementa logica global config
        contentDiv.innerHTML = '<p>Global configuration will be implemented here...</p>';
    }

    /**
     * Carica configurazione risorse
     */
    async loadResourcesConfig(contentDiv) {
        if (!this.subManagers.has('resources')) {
            this.subManagers.set('resources', new InternalResourcesConfigManager(this.configManager, this.app));
        }

        const resourcesManager = this.subManagers.get('resources');
        await resourcesManager.loadResourcesConfig();
    }

    /**
     * Carica configurazione categorie
     */
    async loadCategoriesConfig(contentDiv) {
        // Implementa logica categories o delega a CategoriesConfigManager
        contentDiv.innerHTML = '<p>Categories configuration will be implemented here...</p>';
    }

    /**
     * Carica configurazione parametri
     */
    async loadParametersConfig(contentDiv) {
        // Implementa logica parameters
        contentDiv.innerHTML = '<p>Parameters configuration will be implemented here...</p>';
    }

    /**
     * Refresh del tab corrente
     */
    refresh() {
        this.loadTabContent(this.currentTab);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.subManagers.clear();
    }
}

if (typeof window !== 'undefined') {
    window.ConfigurationUIManager = ConfigurationUIManager;
}