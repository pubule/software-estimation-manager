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
                        typeof member.firstName === 'string' &&
                        typeof member.lastName === 'string' &&
                        member.id.length <= 50 &&
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
            "phaseDefinitions": [
                {
                    "id": "functionalAnalysis",
                    "name": "Functional Analysis",
                    "description": "Business requirements analysis and functional specification",
                    "type": "analysis",
                    "defaultEffort": { "G1": 100, "G2": 0, "TA": 20, "PM": 50 },
                    "editable": true
                },
                {
                    "id": "technicalAnalysis",
                    "name": "Technical Analysis",
                    "description": "Technical design and architecture specification",
                    "type": "analysis",
                    "defaultEffort": { "G1": 0, "G2": 100, "TA": 60, "PM": 20 },
                    "editable": true
                },
                {
                    "id": "development",
                    "name": "Development",
                    "description": "Implementation of features (calculated from features list)",
                    "type": "development",
                    "defaultEffort": { "G1": 0, "G2": 100, "TA": 40, "PM": 20 },
                    "editable": true,
                    "calculated": true
                },
                {
                    "id": "integrationTests",
                    "name": "Integration Tests",
                    "description": "System integration and integration testing",
                    "type": "testing",
                    "defaultEffort": { "G1": 100, "G2": 50, "TA": 50, "PM": 75 },
                    "editable": true
                },
                {
                    "id": "uatTests",
                    "name": "UAT Tests",
                    "description": "User acceptance testing support and execution",
                    "type": "testing",
                    "defaultEffort": { "G1": 50, "G2": 50, "TA": 40, "PM": 75 },
                    "editable": true
                },
                {
                    "id": "consolidation",
                    "name": "Consolidation",
                    "description": "Final testing, bug fixing, and deployment preparation",
                    "type": "testing",
                    "defaultEffort": { "G1": 30, "G2": 30, "TA": 30, "PM": 20 },
                    "editable": true
                },
                {
                    "id": "vapt",
                    "name": "VAPT",
                    "description": "Vulnerability Assessment and Penetration Testing",
                    "type": "testing",
                    "defaultEffort": { "G1": 30, "G2": 30, "TA": 30, "PM": 20 },
                    "editable": true
                },
                {
                    "id": "postGoLive",
                    "name": "Post Go-Live Support",
                    "description": "Production support and monitoring after deployment",
                    "type": "support",
                    "defaultEffort": { "G1": 0, "G2": 100, "TA": 50, "PM": 100 },
                    "editable": true
                }
            ],
            "defaultSuppliers": [
                {
                    "id": "example-g1-it",
                    "name": "Example Supplier G1",
                    "lta": "LTA001",
                    "role": "G1",
                    "department": "IT",
                    "realRate": 450,
                    "officialRate": 450,
                    "isGlobal": true
                },
                {
                    "id": "example-g2-it",
                    "name": "Example Supplier G2",
                    "lta": "LTA002",
                    "role": "G2",
                    "department": "IT",
                    "realRate": 350,
                    "officialRate": 350,
                    "isGlobal": true
                },
                {
                    "id": "example-pm-it",
                    "name": "Example Supplier PM",
                    "lta": "LTA003",
                    "role": "PM",
                    "department": "IT",
                    "realRate": 500,
                    "officialRate": 500,
                    "isGlobal": true
                }
            ],
            "defaultInternalResources": [
                {
                    "id": "internal-analyst-it",
                    "name": "Internal Analyst",
                    "lta": "INT001",
                    "role": "G1",
                    "department": "IT",
                    "realRate": 600,
                    "officialRate": 600,
                    "isGlobal": true
                },
                {
                    "id": "internal-developer-it",
                    "name": "Internal Developer",
                    "lta": "INT002",
                    "role": "G2",
                    "department": "IT",
                    "realRate": 550,
                    "officialRate": 550,
                    "isGlobal": true
                },
                {
                    "id": "internal-tech-analyst-it",
                    "name": "Internal Tech Analyst",
                    "lta": "INT003",
                    "role": "TA",
                    "department": "IT",
                    "realRate": 580,
                    "officialRate": 580,
                    "isGlobal": true
                }
            ],
            "defaultTeams": [
                {
                    "id": "team-frontend",
                    "name": "Frontend Team",
                    "description": "Frontend development team specializing in UI/UX implementation",
                    "isGlobal": true,
                    "members": [
                        {
                            "id": "member-frontend-1",
                            "firstName": "Mario",
                            "lastName": "Rossi",
                            "email": "mario.rossi@company.com",
                            "role": "Senior Frontend Developer",
                            "vendorId": "internal-analyst-it",
                            "vendorType": "internal",
                            "monthlyCapacity": 22
                        },
                        {
                            "id": "member-frontend-2",
                            "firstName": "Lucia",
                            "lastName": "Verdi",
                            "email": "lucia.verdi@company.com",
                            "role": "Frontend Developer",
                            "vendorId": "example-g1-it",
                            "vendorType": "supplier",
                            "monthlyCapacity": 22
                        }
                    ]
                },
                {
                    "id": "team-backend",
                    "name": "Backend Team",
                    "description": "Backend development team handling server-side logic and APIs",
                    "isGlobal": true,
                    "members": [
                        {
                            "id": "member-backend-1",
                            "firstName": "Anna",
                            "lastName": "Bianchi",
                            "email": "anna.bianchi@company.com",
                            "role": "Senior Backend Developer",
                            "vendorId": "internal-developer-it",
                            "vendorType": "internal",
                            "monthlyCapacity": 22
                        }
                    ]
                }
            ],
            "defaultCategories": [
                {
                    "id": "development-activities",
                    "name": "DEVELOPMENT ACTIVITIES",
                    "description": "Software development and coding tasks",
                    "status": "active",
                    "isGlobal": true,
                    "featureTypes": [
                        {
                            "id": "new-feature-dev",
                            "name": "New Feature Development",
                            "description": "Development of new application features",
                            "averageMDs": 5
                        },
                        {
                            "id": "bug-fix",
                            "name": "Bug Fix",
                            "description": "Fixing existing software bugs",
                            "averageMDs": 2
                        },
                        {
                            "id": "code-refactoring",
                            "name": "Code Refactoring",
                            "description": "Improving existing code structure",
                            "averageMDs": 3
                        }
                    ]
                },
                {
                    "id": "testing-activities",
                    "name": "TESTING ACTIVITIES",
                    "description": "Quality assurance and testing tasks",
                    "status": "active",
                    "isGlobal": true,
                    "featureTypes": [
                        {
                            "id": "unit-testing",
                            "name": "Unit Testing",
                            "description": "Creating and executing unit tests",
                            "averageMDs": 2
                        },
                        {
                            "id": "integration-testing",
                            "name": "Integration Testing",
                            "description": "Testing system integration points",
                            "averageMDs": 4
                        }
                    ]
                }
            ]
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