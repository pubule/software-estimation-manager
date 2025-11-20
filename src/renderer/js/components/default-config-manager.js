/**
 * Default Configuration Manager
 * Loads default configurations from external JSON file with fallback
 */

class DefaultConfigManager {
    constructor() {
        this.config = null;
        this.configPath = null;
        this.isLoaded = false;
    }

    /**
     * Get the configuration file path based on projects path
     */
    async getConfigPath() {
        if (this.configPath) {
            return this.configPath;
        }

        try {
            // Get projects path from main process
            if (window.electronAPI && window.electronAPI.getProjectsPath) {
                const projectsPath = await window.electronAPI.getProjectsPath();
                
                // Validate and sanitize the path to prevent directory traversal
                const sanitizedPath = this._sanitizePath(projectsPath);
                if (!sanitizedPath) {
                    throw new Error('Invalid projects path - security validation failed');
                }
                
                this.configPath = `file://${sanitizedPath}/config/defaults.json`;
                return this.configPath;
            } else {
                // Fallback to relative path for development/testing
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

    /**
     * Sanitize path to prevent directory traversal attacks
     * @private
     * @param {string} inputPath - Raw path from external source
     * @returns {string|null} - Sanitized path or null if invalid
     */
    _sanitizePath(inputPath) {
        if (!inputPath || typeof inputPath !== 'string') {
            return null;
        }

        // Remove any path traversal attempts
        if (inputPath.includes('..') || inputPath.includes('~') || inputPath.includes('$')) {
            return null;
        }

        // Normalize path separators and remove dangerous characters
        const normalized = inputPath
            .replace(/[\\]+/g, '/')  // Normalize backslashes to forward slashes
            .replace(/\/+/g, '/')    // Remove multiple consecutive slashes
            .replace(/[<>:"|?*]/g, '') // Remove potentially dangerous characters
            .trim();

        // Ensure it's an absolute path (starts with drive letter on Windows or / on Unix)
        if (!normalized.match(/^([A-Za-z]:|\/)/)) {
            return null;
        }

        // Additional validation - path should be a reasonable length
        if (normalized.length > 260) {
            return null;
        }

        return normalized;
    }

    /**
     * Load configuration from file with fallback
     */
    async loadConfiguration() {
        if (this.isLoaded) {
            return this.config;
        }

        let configPath;
        try {
            // Get the configuration file path
            configPath = await this.getConfigPath();
            
            // Try to load from external config file
            const response = await fetch(configPath);
            if (response.ok) {
                const rawConfig = await response.json();
                
                // Validate configuration structure before using
                const validatedConfig = this._validateConfiguration(rawConfig);
                if (!validatedConfig) {
                    throw new Error('Invalid configuration structure - security validation failed');
                }
                
                this.config = validatedConfig;
                console.log('Loaded and validated configuration from external file:', configPath);
                console.log('Configuration contains:', {
                    phaseDefinitions: validatedConfig.phaseDefinitions?.length || 0,
                    defaultSuppliers: validatedConfig.defaultSuppliers?.length || 0,
                    defaultInternalResources: validatedConfig.defaultInternalResources?.length || 0,
                    defaultCategories: validatedConfig.defaultCategories?.length || 0,
                    defaultTeams: validatedConfig.defaultTeams?.length || 0
                });
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.warn('Failed to load external config file, using fallback defaults:', error.message);
            this.config = this.getFallbackConfiguration();
            
            // Try to create the config file with fallback data for future use
            if (configPath) {
                this.createConfigFileIfNeeded(configPath);
            }
        }

        this.isLoaded = true;
        return this.config;
    }

    /**
     * Validate configuration structure and content
     * @private
     * @param {Object} config - Raw configuration object
     * @returns {Object|null} - Validated config or null if invalid
     */
    _validateConfiguration(config) {
        if (!config || typeof config !== 'object') {
            return null;
        }

        const validatedConfig = {};

        // Validate phaseDefinitions
        if (Array.isArray(config.phaseDefinitions)) {
            validatedConfig.phaseDefinitions = config.phaseDefinitions.filter(phase => 
                phase && 
                typeof phase === 'object' && 
                typeof phase.id === 'string' && 
                typeof phase.name === 'string' &&
                phase.id.length <= 50 &&
                phase.name.length <= 100
            );
        } else {
            validatedConfig.phaseDefinitions = [];
        }

        // Validate defaultSuppliers
        if (Array.isArray(config.defaultSuppliers)) {
            validatedConfig.defaultSuppliers = config.defaultSuppliers.filter(supplier =>
                supplier &&
                typeof supplier === 'object' &&
                typeof supplier.id === 'string' &&
                typeof supplier.name === 'string' &&
                typeof supplier.role === 'string' &&
                supplier.id.length <= 50 &&
                supplier.name.length <= 100 &&
                (typeof supplier.realRate === 'number' && supplier.realRate >= 0) ||
                (typeof supplier.officialRate === 'number' && supplier.officialRate >= 0)
            );
        } else {
            validatedConfig.defaultSuppliers = [];
        }

        // Validate defaultInternalResources
        if (Array.isArray(config.defaultInternalResources)) {
            validatedConfig.defaultInternalResources = config.defaultInternalResources.filter(resource =>
                resource &&
                typeof resource === 'object' &&
                typeof resource.id === 'string' &&
                typeof resource.name === 'string' &&
                typeof resource.role === 'string' &&
                resource.id.length <= 50 &&
                resource.name.length <= 100 &&
                (typeof resource.realRate === 'number' && resource.realRate >= 0) ||
                (typeof resource.officialRate === 'number' && resource.officialRate >= 0)
            );
        } else {
            validatedConfig.defaultInternalResources = [];
        }

        // Validate defaultCategories
        if (Array.isArray(config.defaultCategories)) {
            validatedConfig.defaultCategories = config.defaultCategories.filter(category => 
                category && 
                typeof category === 'object' && 
                typeof category.id === 'string' &&
                typeof category.name === 'string' &&
                category.id.length <= 50 &&
                category.name.length <= 100
            );
        } else {
            validatedConfig.defaultCategories = [];
        }

        // Validate defaultTeams
        if (Array.isArray(config.defaultTeams)) {
            validatedConfig.defaultTeams = config.defaultTeams.map(team => {
                if (!team || typeof team !== 'object' || 
                    typeof team.id !== 'string' || 
                    typeof team.name !== 'string' ||
                    team.id.length > 50 || 
                    team.name.length > 200) {
                    return null;
                }
                
                // Validate team structure
                const validatedTeam = {
                    id: team.id,
                    name: team.name,
                    description: typeof team.description === 'string' ? team.description : '',
                    isGlobal: typeof team.isGlobal === 'boolean' ? team.isGlobal : true,
                    members: []
                };
                
                // Validate team members if present
                if (Array.isArray(team.members)) {
                    validatedTeam.members = team.members.filter(member =>
                        member &&
                        typeof member === 'object' &&
                        typeof member.id === 'string' &&
                        typeof member['user-id'] === 'string' &&
                        typeof member.firstName === 'string' &&
                        typeof member.lastName === 'string' &&
                        member.id.length <= 50 &&
                        member['user-id'].length <= 255 &&
                        member.firstName.length <= 100 &&
                        member.lastName.length <= 100
                    );
                }
                
                return validatedTeam;
            }).filter(team => team !== null);
        } else {
            validatedConfig.defaultTeams = [];
        }

        // Ensure at least basic structure exists
        if (validatedConfig.phaseDefinitions.length === 0 && 
            validatedConfig.defaultSuppliers.length === 0 && 
            validatedConfig.defaultInternalResources.length === 0 && 
            validatedConfig.defaultCategories.length === 0 &&
            validatedConfig.defaultTeams.length === 0) {
            return null; // Empty or completely invalid configuration
        }

        return validatedConfig;
    }

    /**
     * Get phase definitions
     */
    async getPhaseDefinitions() {
        await this.loadConfiguration();
        return this.config.phaseDefinitions;
    }

    /**
     * Get default suppliers
     */
    async getDefaultSuppliers() {
        await this.loadConfiguration();
        return this.config.defaultSuppliers;
    }

    /**
     * Get default internal resources
     */
    async getDefaultInternalResources() {
        await this.loadConfiguration();
        return this.config.defaultInternalResources;
    }

    /**
     * Get default categories
     */
    async getDefaultCategories() {
        await this.loadConfiguration();
        return this.config.defaultCategories;
    }

    /**
     * Get default teams
     */
    async getDefaultTeams() {
        await this.loadConfiguration();
        return this.config.defaultTeams || [];
    }

    /**
     * Fallback configuration when external file is not available
     */
    getFallbackConfiguration() {
        return {
            "phaseDefinitions": [],
            "defaultSuppliers": [],
            "defaultInternalResources": [],
            "defaultTeams": [],
            "defaultCategories": []
        };
    }

    /**
     * Create configuration file if it doesn't exist
     */
    async createConfigFileIfNeeded(configPath) {
        try {
            // Only try to create if we have electronAPI available
            if (window.electronAPI && window.electronAPI.createDefaultConfig) {
                const fallbackConfig = this.getFallbackConfiguration();
                const result = await window.electronAPI.createDefaultConfig(fallbackConfig);
                
                if (result.success) {
                    if (result.created) {
                        console.log('Created default configuration file at:', result.filePath);
                    } else if (result.existed) {
                        console.log('Configuration file already exists at:', result.filePath);
                    }
                } else {
                    console.warn('Failed to create default configuration file:', result.error);
                }
            } else {
                console.warn('ElectronAPI not available, cannot create configuration file');
            }
        } catch (error) {
            console.warn('Error creating configuration file:', error.message);
        }
    }

    /**
     * Reset configuration (force reload)
     */
    reset() {
        this.config = null;
        this.configPath = null;
        this.isLoaded = false;
    }
}

// Make DefaultConfigManager available globally
if (typeof window !== 'undefined') {
    window.DefaultConfigManager = DefaultConfigManager;
}