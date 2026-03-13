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
                        <button class="tab-button" data-tab="vendors-rates">Vendors & Rates</button>
                        <button class="tab-button" data-tab="teams">Teams</button>
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
            { id: 'vendors-rates', title: 'Vendors & Rates Configuration', description: 'Manage all external suppliers and internal resources, and configure their rate matrix based on location, seniority, and job cluster.' },
            { id: 'teams', title: 'Teams & Team Members Configuration', description: 'Manage teams and their members. Each team member must be associated with a vendor (supplier or internal resource).' },
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
                case 'vendors-rates':
                    await this.loadRateMatrixConfig(contentDiv);
                    break;
                case 'teams':
                    await this.loadTeamsConfig(contentDiv);
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
     * Carica configurazione matrice tariffe
     */
    async loadRateMatrixConfig(contentDiv) {
        if (!this.subManagers.has('rateMatrix')) {
            this.subManagers.set('rateMatrix', new RateMatrixConfigManager(this.configManager, this.app));
        }

        const rateManager = this.subManagers.get('rateMatrix');
        await rateManager.render();
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

    async loadTeamsConfig(contentDiv) {
        console.log('ConfigurationUIManager: loadTeamsConfig called');
        console.log('contentDiv:', contentDiv);
        
        if (!this.subManagers.has('teams')) {
            console.log('Creating new TeamsConfigManager');
            this.subManagers.set('teams', new TeamsConfigManager(this.app, this.configManager));
        }

        const teamsManager = this.subManagers.get('teams');
        console.log('Calling renderTeamsPage');
        teamsManager.renderTeamsPage(contentDiv);
    }

    /**
     * Carica configurazione categorie
     */
    async loadCategoriesConfig(contentDiv) {
        console.log('ConfigurationUIManager: loadCategoriesConfig called');
        console.log('contentDiv:', contentDiv);
        
        if (!this.subManagers.has('categories')) {
            console.log('Creating new CategoriesConfigManager');
            this.subManagers.set('categories', new CategoriesConfigManager(this.app, this.configManager));
        }

        const categoriesManager = this.subManagers.get('categories');
        console.log('Calling renderCategoriesPage');
        categoriesManager.renderCategoriesPage(contentDiv);
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