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
                this.configPath = `file://${projectsPath}/config/defaults.json`;
                console.log('Configuration path:', this.configPath);
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
     * Load configuration from file with fallback
     */
    async loadConfiguration() {
        if (this.isLoaded) {
            return this.config;
        }

        try {
            // Get the configuration file path
            const configPath = await this.getConfigPath();
            
            // Try to load from external config file
            const response = await fetch(configPath);
            if (response.ok) {
                this.config = await response.json();
                console.log('Loaded default configuration from external file:', configPath);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.warn('Failed to load external config file, using fallback defaults:', error.message);
            this.config = this.getFallbackConfiguration();
            
            // Try to create the config file with fallback data for future use
            this.createConfigFileIfNeeded(configPath);
        }

        this.isLoaded = true;
        return this.config;
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
                    "role": "G1",
                    "department": "IT",
                    "realRate": 450,
                    "officialRate": 450,
                    "isGlobal": true
                },
                {
                    "id": "example-g2-it",
                    "name": "Example Supplier G2",
                    "role": "G2",
                    "department": "IT",
                    "realRate": 350,
                    "officialRate": 350,
                    "isGlobal": true
                },
                {
                    "id": "example-pm-it",
                    "name": "Example Supplier PM",
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
                    "role": "G1",
                    "department": "IT",
                    "realRate": 600,
                    "officialRate": 600,
                    "isGlobal": true
                },
                {
                    "id": "internal-developer-it",
                    "name": "Internal Developer",
                    "role": "G2",
                    "department": "IT",
                    "realRate": 550,
                    "officialRate": 550,
                    "isGlobal": true
                },
                {
                    "id": "internal-tech-analyst-it",
                    "name": "Internal Tech Analyst",
                    "role": "TA",
                    "department": "IT",
                    "realRate": 580,
                    "officialRate": 580,
                    "isGlobal": true
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