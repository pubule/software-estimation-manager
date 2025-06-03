/**
 * Configuration Manager
 * Gestisce le configurazioni globali e specifiche per progetto
 * Implementa un sistema gerarchico: Global -> Project -> Local overrides
 */

class ConfigurationManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.globalConfig = null;
        this.currentProjectConfig = null;
        this.configCache = new Map();
    }

    async init() {
        try {
            await this.loadGlobalConfig();
            console.log('Configuration Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Configuration Manager:', error);
            this.createDefaultGlobalConfig();
        }
    }

    /**
     * Load global default configuration
     */
    async loadGlobalConfig() {
        try {
            const settings = await this.dataManager.getSettings();
            this.globalConfig = settings.globalConfig || this.createDefaultGlobalConfig();
        } catch (error) {
            console.error('Failed to load global config:', error);
            this.globalConfig = this.createDefaultGlobalConfig();
        }
    }

    /**
     * Save global configuration
     */
    async saveGlobalConfig() {
        try {
            const settings = await this.dataManager.getSettings();
            settings.globalConfig = this.globalConfig;
            await this.dataManager.saveSettings(settings);

            // Clear cache to force reload
            this.configCache.clear();

            return { success: true };
        } catch (error) {
            console.error('Failed to save global config:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create default global configuration
     */
    createDefaultGlobalConfig() {
        return {
            suppliers: [
                {
                    id: 'supplier1',
                    name: 'External Supplier A',
                    realRate: 450,
                    officialRate: 500,
                    status: 'active',
                    isGlobal: true
                },
                {
                    id: 'supplier2',
                    name: 'External Supplier B',
                    realRate: 400,
                    officialRate: 450,
                    status: 'active',
                    isGlobal: true
                }
            ],
            internalResources: [
                {
                    id: 'internal1',
                    name: 'Tech Analyst IT',
                    role: 'Tech Analyst IT',
                    realRate: 350,
                    officialRate: 400,
                    department: 'IT',
                    isGlobal: true
                },
                {
                    id: 'internal2',
                    name: 'Tech Analyst RO',
                    role: 'Tech Analyst RO',
                    realRate: 320,
                    officialRate: 380,
                    department: 'RO',
                    isGlobal: true
                },
                {
                    id: 'internal3',
                    name: 'Developer',
                    role: 'Developer',
                    realRate: 400,
                    officialRate: 450,
                    department: 'Development',
                    isGlobal: true
                }
            ],
            categories: [
                {
                    id: 'security',
                    name: 'Security',
                    description: 'Security-related features',
                    multiplier: 1.2,
                    isGlobal: true
                },
                {
                    id: 'ui',
                    name: 'User Interface',
                    description: 'UI/UX features',
                    multiplier: 1.0,
                    isGlobal: true
                },
                {
                    id: 'backend',
                    name: 'Backend',
                    description: 'Backend logic and APIs',
                    multiplier: 1.1,
                    isGlobal: true
                },
                {
                    id: 'integration',
                    name: 'Integration',
                    description: 'Third-party integrations',
                    multiplier: 1.3,
                    isGlobal: true
                },
                {
                    id: 'reporting',
                    name: 'Reporting',
                    description: 'Reports and analytics',
                    multiplier: 1.1,
                    isGlobal: true
                }
            ],
            calculationParams: {
                workingDaysPerMonth: 22,
                workingHoursPerDay: 8,
                currencySymbol: '€',
                riskMargin: 0.15,
                overheadPercentage: 0.10
            }
        };
    }

    /**
     * Initialize project configuration with global defaults
     */
    initializeProjectConfig(projectId) {
        if (!this.globalConfig) {
            this.globalConfig = this.createDefaultGlobalConfig();
        }

        return {
            // Copy global config as base
            suppliers: this.deepClone(this.globalConfig.suppliers),
            internalResources: this.deepClone(this.globalConfig.internalResources),
            categories: this.deepClone(this.globalConfig.categories),
            calculationParams: this.deepClone(this.globalConfig.calculationParams),

            // Project-specific overrides (initially empty)
            projectOverrides: {
                suppliers: [],
                internalResources: [],
                categories: [],
                calculationParams: {}
            }
        };
    }

    /**
     * Get merged configuration for a project
     * Returns global config + project-specific overrides
     */
    getProjectConfig(projectConfig) {
        const cacheKey = this.generateCacheKey(projectConfig);

        if (this.configCache.has(cacheKey)) {
            return this.configCache.get(cacheKey);
        }

        if (!projectConfig) {
            // Return global config if no project config
            const config = {
                suppliers: this.globalConfig?.suppliers || [],
                internalResources: this.globalConfig?.internalResources || [],
                categories: this.globalConfig?.categories || [],
                calculationParams: this.globalConfig?.calculationParams || {}
            };
            this.configCache.set(cacheKey, config);
            return config;
        }

        // Merge global and project configs
        const mergedConfig = {
            suppliers: this.mergeConfigArray('suppliers', projectConfig),
            internalResources: this.mergeConfigArray('internalResources', projectConfig),
            categories: this.mergeConfigArray('categories', projectConfig),
            calculationParams: this.mergeCalculationParams(projectConfig)
        };

        this.configCache.set(cacheKey, mergedConfig);
        return mergedConfig;
    }

    /**
     * Merge configuration arrays (suppliers, internalResources, categories)
     */
    mergeConfigArray(configType, projectConfig) {
        const globalItems = this.globalConfig?.[configType] || [];
        const projectOverrides = projectConfig.projectOverrides?.[configType] || [];
        const projectItems = projectConfig[configType] || [];

        // Start with global items
        const merged = [...globalItems];

        // Add project-specific items (items that don't exist globally)
        projectItems.forEach(item => {
            if (!item.isGlobal && !merged.find(existing => existing.id === item.id)) {
                merged.push({...item, isProjectSpecific: true});
            }
        });

        // Apply project overrides
        projectOverrides.forEach(override => {
            const existingIndex = merged.findIndex(item => item.id === override.id);
            if (existingIndex >= 0) {
                // Override existing item
                merged[existingIndex] = {
                    ...merged[existingIndex],
                    ...override,
                    isOverridden: true
                };
            } else {
                // Add new project-specific item
                merged.push({
                    ...override,
                    isProjectSpecific: true
                });
            }
        });

        // Filter out inactive items
        return merged.filter(item =>
            configType !== 'suppliers' || !item.status || item.status === 'active'
        );
    }

    /**
     * Merge calculation parameters
     */
    mergeCalculationParams(projectConfig) {
        const globalParams = this.globalConfig?.calculationParams || {};
        const projectParams = projectConfig.calculationParams || {};
        const projectOverrides = projectConfig.projectOverrides?.calculationParams || {};

        return {
            ...globalParams,
            ...projectParams,
            ...projectOverrides
        };
    }

    /**
     * Add or update supplier in project
     */
    addSupplierToProject(projectConfig, supplier) {
        if (!projectConfig.projectOverrides) {
            projectConfig.projectOverrides = { suppliers: [], internalResources: [], categories: [], calculationParams: {} };
        }

        supplier.id = supplier.id || this.generateId('supplier');
        supplier.isProjectSpecific = !supplier.isGlobal;

        if (supplier.isGlobal) {
            // Add to global config
            const existingIndex = this.globalConfig.suppliers.findIndex(s => s.id === supplier.id);
            if (existingIndex >= 0) {
                this.globalConfig.suppliers[existingIndex] = supplier;
            } else {
                this.globalConfig.suppliers.push(supplier);
            }
            this.saveGlobalConfig();
        } else {
            // Add to project overrides
            const existingIndex = projectConfig.projectOverrides.suppliers.findIndex(s => s.id === supplier.id);
            if (existingIndex >= 0) {
                projectConfig.projectOverrides.suppliers[existingIndex] = supplier;
            } else {
                projectConfig.projectOverrides.suppliers.push(supplier);
            }
        }

        this.configCache.clear();
        return supplier;
    }

    /**
     * Add or update internal resource in project
     */
    addInternalResourceToProject(projectConfig, resource) {
        if (!projectConfig.projectOverrides) {
            projectConfig.projectOverrides = { suppliers: [], internalResources: [], categories: [], calculationParams: {} };
        }

        resource.id = resource.id || this.generateId('internal');
        resource.isProjectSpecific = !resource.isGlobal;

        if (resource.isGlobal) {
            // Add to global config
            const existingIndex = this.globalConfig.internalResources.findIndex(r => r.id === resource.id);
            if (existingIndex >= 0) {
                this.globalConfig.internalResources[existingIndex] = resource;
            } else {
                this.globalConfig.internalResources.push(resource);
            }
            this.saveGlobalConfig();
        } else {
            // Add to project overrides
            const existingIndex = projectConfig.projectOverrides.internalResources.findIndex(r => r.id === resource.id);
            if (existingIndex >= 0) {
                projectConfig.projectOverrides.internalResources[existingIndex] = resource;
            } else {
                projectConfig.projectOverrides.internalResources.push(resource);
            }
        }

        this.configCache.clear();
        return resource;
    }

    /**
     * Add or update category in project
     */
    addCategoryToProject(projectConfig, category) {
        if (!projectConfig.projectOverrides) {
            projectConfig.projectOverrides = { suppliers: [], internalResources: [], categories: [], calculationParams: {} };
        }

        category.id = category.id || this.generateId('category');
        category.isProjectSpecific = !category.isGlobal;

        if (category.isGlobal) {
            // Add to global config
            const existingIndex = this.globalConfig.categories.findIndex(c => c.id === category.id);
            if (existingIndex >= 0) {
                this.globalConfig.categories[existingIndex] = category;
            } else {
                this.globalConfig.categories.push(category);
            }
            this.saveGlobalConfig();
        } else {
            // Add to project overrides
            const existingIndex = projectConfig.projectOverrides.categories.findIndex(c => c.id === category.id);
            if (existingIndex >= 0) {
                projectConfig.projectOverrides.categories[existingIndex] = category;
            } else {
                projectConfig.projectOverrides.categories.push(category);
            }
        }

        this.configCache.clear();
        return category;
    }

    /**
     * Delete supplier from project
     */
    deleteSupplierFromProject(projectConfig, supplierId) {
        const globalItem = this.globalConfig?.suppliers?.find(s => s.id === supplierId);

        if (globalItem) {
            // Can't delete global items, only disable them
            if (!projectConfig.projectOverrides) {
                projectConfig.projectOverrides = { suppliers: [], internalResources: [], categories: [], calculationParams: {} };
            }

            // Add override to disable this supplier for this project
            const existingOverride = projectConfig.projectOverrides.suppliers.find(s => s.id === supplierId);
            if (existingOverride) {
                existingOverride.status = 'inactive';
            } else {
                projectConfig.projectOverrides.suppliers.push({
                    id: supplierId,
                    status: 'inactive'
                });
            }
        } else {
            // Remove project-specific item
            if (projectConfig.projectOverrides?.suppliers) {
                projectConfig.projectOverrides.suppliers = projectConfig.projectOverrides.suppliers.filter(s => s.id !== supplierId);
            }
        }

        this.configCache.clear();
    }

    /**
     * Delete internal resource from project
     */
    deleteInternalResourceFromProject(projectConfig, resourceId) {
        const globalItem = this.globalConfig?.internalResources?.find(r => r.id === resourceId);

        if (globalItem) {
            // Can't delete global items, only disable them
            if (!projectConfig.projectOverrides) {
                projectConfig.projectOverrides = { suppliers: [], internalResources: [], categories: [], calculationParams: {} };
            }

            // Add override to disable this resource for this project
            const existingOverride = projectConfig.projectOverrides.internalResources.find(r => r.id === resourceId);
            if (existingOverride) {
                existingOverride.status = 'inactive';
            } else {
                projectConfig.projectOverrides.internalResources.push({
                    id: resourceId,
                    status: 'inactive'
                });
            }
        } else {
            // Remove project-specific item
            if (projectConfig.projectOverrides?.internalResources) {
                projectConfig.projectOverrides.internalResources = projectConfig.projectOverrides.internalResources.filter(r => r.id !== resourceId);
            }
        }

        this.configCache.clear();
    }

    /**
     * Delete category from project
     */
    deleteCategoryFromProject(projectConfig, categoryId) {
        const globalItem = this.globalConfig?.categories?.find(c => c.id === categoryId);

        if (globalItem) {
            // Can't delete global items, only disable them
            if (!projectConfig.projectOverrides) {
                projectConfig.projectOverrides = { suppliers: [], internalResources: [], categories: [], calculationParams: {} };
            }

            // Add override to disable this category for this project
            const existingOverride = projectConfig.projectOverrides.categories.find(c => c.id === categoryId);
            if (existingOverride) {
                existingOverride.status = 'inactive';
            } else {
                projectConfig.projectOverrides.categories.push({
                    id: categoryId,
                    status: 'inactive'
                });
            }
        } else {
            // Remove project-specific item
            if (projectConfig.projectOverrides?.categories) {
                projectConfig.projectOverrides.categories = projectConfig.projectOverrides.categories.filter(c => c.id !== categoryId);
            }
        }

        this.configCache.clear();
    }

    /**
     * Update calculation parameters for project
     */
    updateCalculationParams(projectConfig, params) {
        if (!projectConfig.projectOverrides) {
            projectConfig.projectOverrides = { suppliers: [], internalResources: [], categories: [], calculationParams: {} };
        }

        projectConfig.projectOverrides.calculationParams = {
            ...projectConfig.projectOverrides.calculationParams,
            ...params
        };

        this.configCache.clear();
    }

    /**
     * Reset project configuration to global defaults
     */
    resetProjectToGlobalDefaults(projectConfig) {
        projectConfig.projectOverrides = {
            suppliers: [],
            internalResources: [],
            categories: [],
            calculationParams: {}
        };

        // Reset main config arrays to global defaults
        projectConfig.suppliers = this.deepClone(this.globalConfig.suppliers);
        projectConfig.internalResources = this.deepClone(this.globalConfig.internalResources);
        projectConfig.categories = this.deepClone(this.globalConfig.categories);
        projectConfig.calculationParams = this.deepClone(this.globalConfig.calculationParams);

        this.configCache.clear();
    }

    /**
     * Get suppliers for project (merged global + project)
     */
    getSuppliers(projectConfig) {
        return this.getProjectConfig(projectConfig).suppliers;
    }

    /**
     * Get internal resources for project (merged global + project)
     */
    getInternalResources(projectConfig) {
        return this.getProjectConfig(projectConfig).internalResources;
    }

    /**
     * Get categories for project (merged global + project)
     */
    getCategories(projectConfig) {
        return this.getProjectConfig(projectConfig).categories;
    }

    /**
     * Get calculation parameters for project (merged global + project)
     */
    getCalculationParams(projectConfig) {
        return this.getProjectConfig(projectConfig).calculationParams;
    }

    /**
     * Find supplier by ID in project config
     */
    findSupplier(projectConfig, supplierId) {
        return this.getSuppliers(projectConfig).find(s => s.id === supplierId);
    }

    /**
     * Find internal resource by ID in project config
     */
    findInternalResource(projectConfig, resourceId) {
        return this.getInternalResources(projectConfig).find(r => r.id === resourceId);
    }

    /**
     * Find category by ID in project config
     */
    findCategory(projectConfig, categoryId) {
        return this.getCategories(projectConfig).find(c => c.id === categoryId);
    }

    /**
     * Get display name for supplier/resource
     */
    getSupplierDisplayName(projectConfig, supplierId) {
        const supplier = this.findSupplier(projectConfig, supplierId);
        if (supplier) {
            return `${supplier.name} (External)`;
        }

        const resource = this.findInternalResource(projectConfig, supplierId);
        if (resource) {
            return `${resource.name} (Internal)`;
        }

        return `Unknown Supplier (${supplierId})`;
    }

    /**
     * Get display name for category
     */
    getCategoryDisplayName(projectConfig, categoryId) {
        const category = this.findCategory(projectConfig, categoryId);
        return category ? category.name : `Unknown Category (${categoryId})`;
    }

    /**
     * Validate that a supplier/resource exists in project config
     */
    validateSupplier(projectConfig, supplierId) {
        return !!this.findSupplier(projectConfig, supplierId) || !!this.findInternalResource(projectConfig, supplierId);
    }

    /**
     * Validate that a category exists in project config
     */
    validateCategory(projectConfig, categoryId) {
        return !!this.findCategory(projectConfig, categoryId);
    }

    /**
     * Migrate old project config to new format
     */
    migrateProjectConfig(oldConfig) {
        if (oldConfig.projectOverrides) {
            // Already migrated
            return oldConfig;
        }

        const newConfig = {
            // Keep existing config as project-specific
            suppliers: oldConfig.suppliers || [],
            internalResources: oldConfig.internalResources || [],
            categories: oldConfig.categories || [],
            calculationParams: oldConfig.calculationParams || {},

            // Initialize overrides
            projectOverrides: {
                suppliers: [],
                internalResources: [],
                categories: [],
                calculationParams: {}
            }
        };

        // Mark existing items as project-specific if they don't match global defaults
        this.markProjectSpecificItems(newConfig);

        return newConfig;
    }

    /**
     * Mark items as project-specific if they differ from global defaults
     */
    markProjectSpecificItems(projectConfig) {
        // Check suppliers
        projectConfig.suppliers.forEach(supplier => {
            const globalSupplier = this.globalConfig?.suppliers?.find(gs => gs.id === supplier.id);
            if (!globalSupplier || !this.deepEqual(supplier, globalSupplier)) {
                supplier.isProjectSpecific = true;
            }
        });

        // Check internal resources
        projectConfig.internalResources.forEach(resource => {
            const globalResource = this.globalConfig?.internalResources?.find(gr => gr.id === resource.id);
            if (!globalResource || !this.deepEqual(resource, globalResource)) {
                resource.isProjectSpecific = true;
            }
        });

        // Check categories
        projectConfig.categories.forEach(category => {
            const globalCategory = this.globalConfig?.categories?.find(gc => gc.id === category.id);
            if (!globalCategory || !this.deepEqual(category, globalCategory)) {
                category.isProjectSpecific = true;
            }
        });
    }

    /**
     * Utility methods
     */
    generateCacheKey(projectConfig) {
        if (!projectConfig) return 'global';

        const hash = this.simpleHash(JSON.stringify({
            global: this.globalConfig,
            project: projectConfig
        }));

        return `project_${hash}`;
    }

    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    generateId(prefix = '') {
        return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = this.deepClone(obj[key]);
        });
        return cloned;
    }

    deepEqual(obj1, obj2) {
        if (obj1 === obj2) return true;
        if (obj1 == null || obj2 == null) return false;
        if (typeof obj1 !== typeof obj2) return false;

        if (typeof obj1 === 'object') {
            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);

            if (keys1.length !== keys2.length) return false;

            for (const key of keys1) {
                if (!keys2.includes(key)) return false;
                if (!this.deepEqual(obj1[key], obj2[key])) return false;
            }
            return true;
        }

        return false;
    }

    /**
     * Clear cache (useful for testing or forced refresh)
     */
    clearCache() {
        this.configCache.clear();
    }

    /**
     * Get configuration statistics
     */
    getConfigStats(projectConfig) {
        const config = this.getProjectConfig(projectConfig);

        return {
            suppliers: {
                total: config.suppliers.length,
                global: config.suppliers.filter(s => s.isGlobal).length,
                projectSpecific: config.suppliers.filter(s => s.isProjectSpecific).length,
                overridden: config.suppliers.filter(s => s.isOverridden).length
            },
            internalResources: {
                total: config.internalResources.length,
                global: config.internalResources.filter(r => r.isGlobal).length,
                projectSpecific: config.internalResources.filter(r => r.isProjectSpecific).length,
                overridden: config.internalResources.filter(r => r.isOverridden).length
            },
            categories: {
                total: config.categories.length,
                global: config.categories.filter(c => c.isGlobal).length,
                projectSpecific: config.categories.filter(c => c.isProjectSpecific).length,
                overridden: config.categories.filter(c => c.isOverridden).length
            }
        };
    }
}

// Make ConfigurationManager available globally
if (typeof window !== 'undefined') {
    window.ConfigurationManager = ConfigurationManager;
}