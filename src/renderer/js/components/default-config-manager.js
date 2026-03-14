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
        // Preserve Windows drive letter (e.g., C:) before removing invalid chars
        const windowsDriveMatch = inputPath.match(/^([A-Za-z]:)(.*)/);
        let driveLetter = '';
        let pathWithoutDrive = inputPath;

        if (windowsDriveMatch) {
            driveLetter = windowsDriveMatch[1];
            pathWithoutDrive = windowsDriveMatch[2];
        }

        const sanitizedPath = pathWithoutDrive
            .replace(/[<>"|?*]/g, '')  // Removed : from the list
            .trim();

        const normalized = driveLetter + sanitizedPath
            .replace(/[\\]+/g, '/')
            .replace(/\/+/g, '/');

        if (!normalized.match(/^([A-Za-z]:|\/)/)) {
            return null;
        }
        if (normalized.length > 260) {
            return null;
        }
        return normalized;
    }

    async loadConfiguration() {
        // Always reload from file - no caching
        console.log('[DefaultConfigManager] Loading configuration from defaults.json...');

        const configPath = await this.getConfigPath();
        console.log(`[DefaultConfigManager] Loading from: ${configPath}`);

        const response = await fetch(configPath);
        console.log(`[DefaultConfigManager] Response status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`Failed to load defaults.json: HTTP ${response.status}`);
        }

        const rawText = await response.text();
        console.log(`[DefaultConfigManager] Loaded ${rawText.length} bytes`);

        const rawConfig = JSON.parse(rawText);
        this.config = this._validateConfiguration(rawConfig);

        if (!this.config) {
            throw new Error('Configuration validation failed - check defaults.json format');
        }

        console.log('[DefaultConfigManager] Configuration loaded successfully:', {
            vendors: this.config.vendors?.length || 0,
            categories: this.config.categories?.length || 0,
            phaseDefinitions: this.config.phaseDefinitions?.length || 0
        });

        this.isLoaded = true;
        return this.config;
    }

    _validateConfiguration(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Configuration must be a valid object');
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
                        type: 'External',
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
            validatedConfig.rateMatrixConfig = config.rateMatrixConfig || { locations: [], seniorities: [], jobClusters: [] };
        }
        // Handle new structure - MUST have vendors and rateMatrixConfig
        else if (Array.isArray(config.vendors) && typeof config.rateMatrixConfig === 'object') {
            validatedConfig.vendors = config.vendors;
            validatedConfig.rateMatrixConfig = config.rateMatrixConfig;
        }
        // Invalid structure - throw error instead of fallback
        else {
            throw new Error('Invalid configuration structure: must have vendors array and rateMatrixConfig object');
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

    
    reset() {
        this.config = null;
        this.configPath = null;
        this.isLoaded = false;
    }
}

if (typeof window !== 'undefined') {
    window.DefaultConfigManager = DefaultConfigManager;
}