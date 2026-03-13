/**
 * Default Configuration Manager (Modernized)
 * Loads default configurations from external JSON file, compatible with the new data model.
 */
class DefaultConfigManager {
    constructor() {
        this.config = null;
        this.configPath = null;
        this.isLoaded = false;
    }

    async getConfigPath() {
        if (this.configPath) {
            return this.configPath;
        }

        try {
            if (window.electronAPI && window.electronAPI.getProjectsPath) {
                const projectsPath = await window.electronAPI.getProjectsPath();
                const sanitizedPath = this._sanitizePath(projectsPath);
                if (!sanitizedPath) {
                    throw new Error('Invalid projects path - security validation failed');
                }
                this.configPath = `file://${sanitizedPath}/config/defaults.json`;
                return this.configPath;
            } else {
                this.configPath = './config/defaults.json';
                console.warn('ElectronAPI not available, using relative path:', this.configPath);
                return this.configPath;
            }
        } catch (error) {
            console.warn('Failed to get projects path, using relative fallback:', error.message);
            this.configPath = './config/defaults.json';
            return this.configPath;
        }
    }

    _sanitizePath(inputPath) {
        if (!inputPath || typeof inputPath !== 'string') {
            return null;
        }
        if (inputPath.includes('..') || inputPath.includes('~') || inputPath.includes('$')) {
            return null;
        }
        const normalized = inputPath
            .replace(/[\\]+/g, '/')
            .replace(/\/+/g, '/')
            .replace(/[<>:"|?*]/g, '')
            .trim();
        if (!normalized.match(/^([A-Za-z]:|\/)/)) {
            return null;
        }
        if (normalized.length > 260) {
            return null;
        }
        return normalized;
    }

    async loadConfiguration() {
        if (this.isLoaded) {
            return this.config;
        }

        console.log('[Debug] Starting configuration load...');
        try {
            const configPath = await this.getConfigPath();
            console.log(`[Debug] Attempting to load from config path: ${configPath}`);
            
            const response = await fetch(configPath);
            console.log(`[Debug] Fetch response status: ${response.status}`);

            if (response.ok) {
                const rawText = await response.text();
                console.log(`[Debug] Raw config file content (first 500 chars): ${rawText.substring(0, 500)}`);

                const rawConfig = JSON.parse(rawText);
                console.log('[Debug] Parsed rawConfig object:', rawConfig);

                this.config = this._validateConfiguration(rawConfig);
                console.log('[Debug] Result after validation:', this.config);

                if (!this.config) {
                    throw new Error('Loaded configuration is invalid or empty after validation.');
                }
                console.log('Loaded and validated new configuration from external file:', configPath);
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.warn('Failed to load or validate external config file, using fallback defaults:', error.message);
            this.config = this.getFallbackConfiguration();
        }

        this.isLoaded = true;
        return this.config;
    }

    _validateConfiguration(config) {
        if (!config || typeof config !== 'object') {
            return null;
        }

        const validatedConfig = {};

        // Handle migration from old structure if present
        if (config.defaultSuppliers || config.defaultInternalResources) {
            console.log('[Validation] Old structure detected, migrating...');
            const vendorMap = new Map();
            (config.defaultSuppliers || []).forEach(s => {
                if (!vendorMap.has(s.name)) {
                    vendorMap.set(s.name, {
                        id: `vendor-${s.name.toLowerCase().replace(/\s+/g, '-')}`,
                        name: s.name,
                        type: 'Supplier',
                        jobClusters: []
                    });
                }
            });
            (config.defaultInternalResources || []).forEach(r => {
                if (!vendorMap.has(r.name)) {
                    vendorMap.set(r.name, {
                        id: `vendor-${r.name.toLowerCase().replace(/\s+/g, '-')}`,
                        name: r.name,
                        type: 'Internal',
                        jobClusters: []
                    });
                }
            });
            validatedConfig.vendors = Array.from(vendorMap.values());
            validatedConfig.rateMatrixConfig = this.getFallbackConfiguration().rateMatrixConfig; // Use fallback as old config has no matrix
        } 
        // Handle new structure
        else if (Array.isArray(config.vendors) && typeof config.rateMatrixConfig === 'object') {
            validatedConfig.vendors = config.vendors;
            validatedConfig.rateMatrixConfig = config.rateMatrixConfig;
        } 
        // If neither is present, use fallback
        else {
            const fallback = this.getFallbackConfiguration();
            validatedConfig.vendors = fallback.vendors;
            validatedConfig.rateMatrixConfig = fallback.rateMatrixConfig;
        }
        
        validatedConfig.phaseDefinitions = Array.isArray(config.phaseDefinitions) ? config.phaseDefinitions : [];
        validatedConfig.categories = Array.isArray(config.categories) ? config.categories : [];
        validatedConfig.defaultTeams = Array.isArray(config.defaultTeams) ? config.defaultTeams : [];

        return validatedConfig;
    }
    
    async getDefaultVendors() {
        await this.loadConfiguration();
        return this.config.vendors || [];
    }

    async getRateMatrixConfig() {
        await this.loadConfiguration();
        return this.config.rateMatrixConfig;
    }

    async getDefaultCategories() {
        await this.loadConfiguration();
        return this.config.categories || [];
    }
    
    async getPhaseDefinitions() {
        await this.loadConfiguration();
        return this.config.phaseDefinitions || [];
    }

    async getDefaultTeams() {
        await this.loadConfiguration();
        return this.config.defaultTeams || [];
    }

    getFallbackConfiguration() {
        return {
            "phaseDefinitions": [
                { "id": "functionalAnalysis", "name": "Functional Analysis", "type": "analysis", "defaultEffort": { "G1": 100, "G2": 0, "TA": 20, "PM": 50 } },
                { "id": "technicalAnalysis", "name": "Technical Analysis", "type": "analysis", "defaultEffort": { "G1": 0, "G2": 100, "TA": 60, "PM": 20 } },
            ],
            "vendors": [
                { "id": "vendor-ext", "name": "EXT Vendor", "type": "Supplier", "jobClusters": [] },
                { "id": "vendor-internal-it", "name": "Internal IT Team", "type": "Internal", "jobClusters": [] }
            ],
            "rateMatrixConfig": {
                "locations": [
                    { "id": "italy", "name": "Italy", "deliveryModels": ["onsite", "offsite"] },
                    { "id": "romania", "name": "Romania", "deliveryModels": ["onsite", "offsite"] },
                    { "id": "india", "name": "India", "deliveryModels": ["offshore"] }
                ],
                "seniorities": ["Junior", "Mid-Level", "Senior"],
                "jobClusters": ["AI Engineer", "Architect", "Business Analyst", "Cloud Engineer"]
            },
            "defaultTeams": [],
            "categories": [
                { "id": "dev-activities", "name": "DEVELOPMENT ACTIVITIES", "featureTypes": [ { "id": "new-dev", "name": "New Feature" } ] }
            ]
        };
    }
    
    reset() {
        this.config = null;
        this.configPath = null;
        this.isLoaded = false;
    }
}

if (typeof window !== 'undefined') {
    window.DefaultConfigManager = DefaultConfigManager;
}