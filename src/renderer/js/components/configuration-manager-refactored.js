/**
 * Configuration Manager (Refactored)
 * Manages global and project-specific configurations with improved architecture
 */

class ConfigurationManagerRefactored extends BaseComponent {
    constructor(dataManager) {
        super('ConfigurationManager');
        
        this.dataManager = dataManager;
        
        // Configuration state
        this.globalConfig = null;
        this.currentProjectConfig = null;
        
        // Cache management
        this.cache = new ConfigCache();
        
        // Configuration validators
        this.validators = new ConfigurationValidators();
        
        // Configuration merger
        this.merger = new ConfigurationMerger(this.cache);
    }

    async onInit() {
        try {
            await this.loadGlobalConfig();
            console.log('Configuration Manager initialized successfully');
        } catch (error) {
            this.handleError('Failed to initialize Configuration Manager', error);
            this.globalConfig = this.createDefaultGlobalConfig();
        }
    }

    /**
     * Load global configuration
     */
    async loadGlobalConfig() {
        try {
            const settings = await this.dataManager.getSettings();
            this.globalConfig = settings.globalConfig || this.createDefaultGlobalConfig();
            this.cache.invalidate(); // Clear cache when global config changes
        } catch (error) {
            this.handleError('Failed to load global config', error);
            this.globalConfig = this.createDefaultGlobalConfig();
        }
    }

    /**
     * Save global configuration
     */
    async saveGlobalConfig() {
        try {
            this.validators.validateGlobalConfig(this.globalConfig);
            
            const settings = await this.dataManager.getSettings();
            settings.globalConfig = this.globalConfig;
            await this.dataManager.saveSettings(settings);

            this.cache.invalidate();
            this.emit('global-config-changed', { config: this.globalConfig });

            return { success: true };
        } catch (error) {
            this.handleError('Failed to save global config', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create default global configuration
     */
    createDefaultGlobalConfig() {
        return {
            suppliers: this.createDefaultSuppliers(),
            internalResources: this.createDefaultInternalResources(),
            categories: this.createDefaultCategories(),
            calculationParams: this.createDefaultCalculationParams()
        };
    }

    createDefaultSuppliers() {
        return [
            {
                id: 'supplier1',
                name: 'External Supplier A',
                realRate: 450,
                officialRate: 500,
                role: 'G2',
                department: 'External',
                status: 'active',
                isGlobal: true
            },
            {
                id: 'supplier2', 
                name: 'External Supplier B',
                realRate: 400,
                officialRate: 450,
                role: 'G2',
                department: 'External',
                status: 'active',
                isGlobal: true
            }
        ];
    }

    createDefaultInternalResources() {
        return [
            {
                id: 'internal1',
                name: 'Tech Analyst IT',
                role: 'G2',
                realRate: 350,
                officialRate: 400,
                department: 'IT',
                status: 'active',
                isGlobal: true
            },
            {
                id: 'internal2',
                name: 'Tech Analyst RO', 
                role: 'G2',
                realRate: 320,
                officialRate: 380,
                department: 'RO',
                status: 'active',
                isGlobal: true
            },
            {
                id: 'internal3',
                name: 'Developer',
                role: 'G2',
                realRate: 400,
                officialRate: 450,
                department: 'Development',
                status: 'active',
                isGlobal: true
            }
        ];
    }

    createDefaultCategories() {
        return [
            {
                id: 'security',
                name: 'Security',
                description: 'Security-related features',
                multiplier: 1.2,
                status: 'active',
                isGlobal: true,
                featureTypes: [
                    {
                        id: 'authentication',
                        name: 'Authentication',
                        description: 'User authentication features',
                        averageMDs: 5
                    },
                    {
                        id: 'authorization',
                        name: 'Authorization',
                        description: 'User authorization and permissions',
                        averageMDs: 3
                    }
                ]
            },
            {
                id: 'ui',
                name: 'User Interface',
                description: 'UI/UX features',
                multiplier: 1.0,
                status: 'active',
                isGlobal: true,
                featureTypes: [
                    {
                        id: 'form',
                        name: 'Form',
                        description: 'Data input forms',
                        averageMDs: 2
                    },
                    {
                        id: 'dashboard',
                        name: 'Dashboard',
                        description: 'Data visualization dashboards',
                        averageMDs: 8
                    }
                ]
            },
            {
                id: 'backend',
                name: 'Backend',
                description: 'Backend logic and APIs',
                multiplier: 1.1,
                status: 'active',
                isGlobal: true,
                featureTypes: [
                    {
                        id: 'api',
                        name: 'API Endpoint',
                        description: 'REST API endpoints',
                        averageMDs: 3
                    },
                    {
                        id: 'business_logic',
                        name: 'Business Logic',
                        description: 'Core business logic implementation',
                        averageMDs: 5
                    }
                ]
            }
        ];
    }

    createDefaultCalculationParams() {
        return {
            workingDaysPerMonth: 22,
            workingHoursPerDay: 8,
            currencySymbol: '€',
            riskMargin: 0.15,
            overheadPercentage: 0.10
        };
    }

    /**
     * Initialize project configuration with global defaults
     */
    initializeProjectConfig() {
        if (!this.globalConfig) {
            this.globalConfig = this.createDefaultGlobalConfig();
        }

        return {
            suppliers: this.deepClone(this.globalConfig.suppliers),
            internalResources: this.deepClone(this.globalConfig.internalResources),
            categories: this.deepClone(this.globalConfig.categories),
            calculationParams: this.deepClone(this.globalConfig.calculationParams),
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
     */
    getProjectConfig(projectConfig) {
        const cacheKey = this.cache.generateKey(this.globalConfig, projectConfig);
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const mergedConfig = this.merger.mergeConfigurations(
            this.globalConfig, 
            projectConfig
        );

        this.cache.set(cacheKey, mergedConfig);
        return mergedConfig;
    }

    /**
     * Add supplier to project configuration
     */
    addSupplierToProject(projectConfig, supplier) {
        this.ensureProjectOverrides(projectConfig);
        
        supplier.id = supplier.id || this.generateId('supplier');
        supplier.isProjectSpecific = !supplier.isGlobal;

        if (supplier.isGlobal) {
            this.addToGlobalSuppliers(supplier);
        } else {
            this.addToProjectSuppliers(projectConfig, supplier);
        }

        this.cache.invalidate();
        return supplier;
    }

    /**
     * Add internal resource to project configuration
     */
    addInternalResourceToProject(projectConfig, resource) {
        this.ensureProjectOverrides(projectConfig);
        
        resource.id = resource.id || this.generateId('internal');
        resource.isProjectSpecific = !resource.isGlobal;

        if (resource.isGlobal) {
            this.addToGlobalInternalResources(resource);
        } else {
            this.addToProjectInternalResources(projectConfig, resource);
        }

        this.cache.invalidate();
        return resource;
    }

    /**
     * Add category to project configuration
     */
    addCategoryToProject(projectConfig, category) {
        this.ensureProjectOverrides(projectConfig);
        
        category.id = category.id || this.generateId('category');
        category.isProjectSpecific = !category.isGlobal;

        if (category.isGlobal) {
            this.addToGlobalCategories(category);
        } else {
            this.addToProjectCategories(projectConfig, category);
        }

        this.cache.invalidate();
        return category;
    }

    /**
     * Helper methods for adding to global configurations
     */
    addToGlobalSuppliers(supplier) {
        const existingIndex = this.globalConfig.suppliers.findIndex(s => s.id === supplier.id);
        if (existingIndex >= 0) {
            this.globalConfig.suppliers[existingIndex] = supplier;
        } else {
            this.globalConfig.suppliers.push(supplier);
        }
        this.saveGlobalConfig();
    }

    addToGlobalInternalResources(resource) {
        const existingIndex = this.globalConfig.internalResources.findIndex(r => r.id === resource.id);
        if (existingIndex >= 0) {
            this.globalConfig.internalResources[existingIndex] = resource;
        } else {
            this.globalConfig.internalResources.push(resource);
        }
        this.saveGlobalConfig();
    }

    addToGlobalCategories(category) {
        const existingIndex = this.globalConfig.categories.findIndex(c => c.id === category.id);
        if (existingIndex >= 0) {
            this.globalConfig.categories[existingIndex] = category;
        } else {
            this.globalConfig.categories.push(category);
        }
        this.saveGlobalConfig();
    }

    /**
     * Helper methods for adding to project configurations
     */
    addToProjectSuppliers(projectConfig, supplier) {
        const existingIndex = projectConfig.projectOverrides.suppliers.findIndex(s => s.id === supplier.id);
        if (existingIndex >= 0) {
            projectConfig.projectOverrides.suppliers[existingIndex] = supplier;
        } else {
            projectConfig.projectOverrides.suppliers.push(supplier);
        }
    }

    addToProjectInternalResources(projectConfig, resource) {
        const existingIndex = projectConfig.projectOverrides.internalResources.findIndex(r => r.id === resource.id);
        if (existingIndex >= 0) {
            projectConfig.projectOverrides.internalResources[existingIndex] = resource;
        } else {
            projectConfig.projectOverrides.internalResources.push(resource);
        }
    }

    addToProjectCategories(projectConfig, category) {
        const existingIndex = projectConfig.projectOverrides.categories.findIndex(c => c.id === category.id);
        if (existingIndex >= 0) {
            projectConfig.projectOverrides.categories[existingIndex] = category;
        } else {
            projectConfig.projectOverrides.categories.push(category);
        }
    }

    /**
     * Delete operations
     */
    deleteSupplierFromProject(projectConfig, supplierId) {
        const globalItem = this.globalConfig?.suppliers?.find(s => s.id === supplierId);

        if (globalItem) {
            this.disableGlobalItemInProject(projectConfig, 'suppliers', supplierId);
        } else {
            this.removeProjectSpecificItem(projectConfig, 'suppliers', supplierId);
        }

        this.cache.invalidate();
    }

    deleteInternalResourceFromProject(projectConfig, resourceId) {
        const globalItem = this.globalConfig?.internalResources?.find(r => r.id === resourceId);

        if (globalItem) {
            this.disableGlobalItemInProject(projectConfig, 'internalResources', resourceId);
        } else {
            this.removeProjectSpecificItem(projectConfig, 'internalResources', resourceId);
        }

        this.cache.invalidate();
    }

    deleteCategoryFromProject(projectConfig, categoryId) {
        const globalItem = this.globalConfig?.categories?.find(c => c.id === categoryId);

        if (globalItem) {
            this.disableGlobalItemInProject(projectConfig, 'categories', categoryId);
        } else {
            this.removeProjectSpecificItem(projectConfig, 'categories', categoryId);
        }

        this.cache.invalidate();
    }

    /**
     * Helper methods for deletion
     */
    disableGlobalItemInProject(projectConfig, itemType, itemId) {
        this.ensureProjectOverrides(projectConfig);

        const existingOverride = projectConfig.projectOverrides[itemType].find(item => item.id === itemId);
        if (existingOverride) {
            existingOverride.status = 'inactive';
        } else {
            projectConfig.projectOverrides[itemType].push({
                id: itemId,
                status: 'inactive'
            });
        }
    }

    removeProjectSpecificItem(projectConfig, itemType, itemId) {
        if (projectConfig.projectOverrides?.[itemType]) {
            projectConfig.projectOverrides[itemType] = 
                projectConfig.projectOverrides[itemType].filter(item => item.id !== itemId);
        }
    }

    /**
     * Getter methods for merged configurations
     */
    getSuppliers(projectConfig) {
        return this.getProjectConfig(projectConfig).suppliers;
    }

    getInternalResources(projectConfig) {
        return this.getProjectConfig(projectConfig).internalResources;
    }

    getCategories(projectConfig) {
        return this.getProjectConfig(projectConfig).categories;
    }

    getCalculationParams(projectConfig) {
        return this.getProjectConfig(projectConfig).calculationParams;
    }

    /**
     * Find methods
     */
    findSupplier(projectConfig, supplierId) {
        return this.getSuppliers(projectConfig).find(s => s.id === supplierId);
    }

    findInternalResource(projectConfig, resourceId) {
        return this.getInternalResources(projectConfig).find(r => r.id === resourceId);
    }

    findCategory(projectConfig, categoryId) {
        return this.getCategories(projectConfig).find(c => c.id === categoryId);
    }

    /**
     * Display name methods
     */
    getSupplierDisplayName(projectConfig, supplierId) {
        const supplier = this.findSupplier(projectConfig, supplierId);
        if (supplier) {
            const rate = supplier.realRate || supplier.officialRate || 0;
            return `${supplier.department} - ${supplier.name} (€${rate}/day)`;
        }

        const resource = this.findInternalResource(projectConfig, supplierId);
        if (resource) {
            const rate = resource.realRate || resource.officialRate || 0;
            return `${resource.department} - ${resource.name} (€${rate}/day)`;
        }

        return `Unknown Supplier (${supplierId})`;
    }

    getCategoryDisplayName(projectConfig, categoryId) {
        const category = this.findCategory(projectConfig, categoryId);
        return category ? category.name : `Unknown Category (${categoryId})`;
    }

    /**
     * Validation methods
     */
    validateSupplier(projectConfig, supplierId) {
        return !!this.findSupplier(projectConfig, supplierId) || 
               !!this.findInternalResource(projectConfig, supplierId);
    }

    validateCategory(projectConfig, categoryId) {
        return !!this.findCategory(projectConfig, categoryId);
    }

    /**
     * Migration methods
     */
    migrateProjectConfig(oldConfig) {
        if (oldConfig.projectOverrides) {
            return oldConfig; // Already migrated
        }

        const newConfig = {
            suppliers: oldConfig.suppliers || [],
            internalResources: oldConfig.internalResources || [],
            categories: oldConfig.categories || [],
            calculationParams: oldConfig.calculationParams || {},
            projectOverrides: {
                suppliers: [],
                internalResources: [],
                categories: [],
                calculationParams: {}
            }
        };

        this.markProjectSpecificItems(newConfig);
        return newConfig;
    }

    markProjectSpecificItems(projectConfig) {
        // Mark suppliers
        projectConfig.suppliers.forEach(supplier => {
            const globalSupplier = this.globalConfig?.suppliers?.find(gs => gs.id === supplier.id);
            if (!globalSupplier || !this.deepEqual(supplier, globalSupplier)) {
                supplier.isProjectSpecific = true;
            }
        });

        // Mark internal resources
        projectConfig.internalResources.forEach(resource => {
            const globalResource = this.globalConfig?.internalResources?.find(gr => gr.id === resource.id);
            if (!globalResource || !this.deepEqual(resource, globalResource)) {
                resource.isProjectSpecific = true;
            }
        });

        // Mark categories
        projectConfig.categories.forEach(category => {
            const globalCategory = this.globalConfig?.categories?.find(gc => gc.id === category.id);
            if (!globalCategory || !this.deepEqual(category, globalCategory)) {
                category.isProjectSpecific = true;
            }
        });
    }

    /**
     * Reset project to global defaults
     */
    resetProjectToGlobalDefaults(projectConfig) {
        projectConfig.projectOverrides = {
            suppliers: [],
            internalResources: [],
            categories: [],
            calculationParams: {}
        };

        projectConfig.suppliers = this.deepClone(this.globalConfig.suppliers);
        projectConfig.internalResources = this.deepClone(this.globalConfig.internalResources);
        projectConfig.categories = this.deepClone(this.globalConfig.categories);
        projectConfig.calculationParams = this.deepClone(this.globalConfig.calculationParams);

        this.cache.invalidate();
    }

    /**
     * Update calculation parameters
     */
    updateCalculationParams(projectConfig, params) {
        this.ensureProjectOverrides(projectConfig);

        projectConfig.projectOverrides.calculationParams = {
            ...projectConfig.projectOverrides.calculationParams,
            ...params
        };

        this.cache.invalidate();
    }

    /**
     * Get configuration statistics
     */
    getConfigStats(projectConfig) {
        const config = this.getProjectConfig(projectConfig);

        return {
            suppliers: this.getItemStats(config.suppliers),
            internalResources: this.getItemStats(config.internalResources),
            categories: this.getItemStats(config.categories)
        };
    }

    getItemStats(items) {
        return {
            total: items.length,
            global: items.filter(item => item.isGlobal).length,
            projectSpecific: items.filter(item => item.isProjectSpecific).length,
            overridden: items.filter(item => item.isOverridden).length
        };
    }

    /**
     * Utility methods
     */
    ensureProjectOverrides(projectConfig) {
        if (!projectConfig.projectOverrides) {
            projectConfig.projectOverrides = {
                suppliers: [],
                internalResources: [],
                categories: [],
                calculationParams: {}
            };
        }
    }

    generateId(prefix = '') {
        return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    clearCache() {
        this.cache.clear();
    }

    onDestroy() {
        this.cache.clear();
    }
}

/**
 * Configuration Cache
 * Manages caching of merged configurations for performance
 */
class ConfigCache {
    constructor(maxSize = 50) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.accessTimes = new Map();
    }

    generateKey(globalConfig, projectConfig) {
        if (!projectConfig) return 'global';

        const hash = this.simpleHash(JSON.stringify({
            global: globalConfig,
            project: projectConfig
        }));

        return `project_${hash}`;
    }

    has(key) {
        return this.cache.has(key);
    }

    get(key) {
        if (this.cache.has(key)) {
            this.accessTimes.set(key, Date.now());
            return this.cache.get(key);
        }
        return null;
    }

    set(key, value) {
        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLeastRecentlyUsed();
        }

        this.cache.set(key, value);
        this.accessTimes.set(key, Date.now());
    }

    evictLeastRecentlyUsed() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, time] of this.accessTimes) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.accessTimes.delete(oldestKey);
        }
    }

    clear() {
        this.cache.clear();
        this.accessTimes.clear();
    }

    invalidate() {
        this.clear();
    }

    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash);
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.calculateHitRate()
        };
    }

    calculateHitRate() {
        // This would need to track hits/misses to calculate properly
        // For now, return a placeholder
        return 0;
    }
}

/**
 * Configuration Merger
 * Handles merging of global and project configurations
 */
class ConfigurationMerger {
    constructor(cache) {
        this.cache = cache;
    }

    mergeConfigurations(globalConfig, projectConfig) {
        if (!projectConfig) {
            return this.createGlobalOnlyConfig(globalConfig);
        }

        return {
            suppliers: this.mergeConfigArray('suppliers', globalConfig, projectConfig),
            internalResources: this.mergeConfigArray('internalResources', globalConfig, projectConfig),
            categories: this.mergeConfigArray('categories', globalConfig, projectConfig),
            calculationParams: this.mergeCalculationParams(globalConfig, projectConfig)
        };
    }

    createGlobalOnlyConfig(globalConfig) {
        return {
            suppliers: globalConfig?.suppliers || [],
            internalResources: globalConfig?.internalResources || [],
            categories: globalConfig?.categories || [],
            calculationParams: globalConfig?.calculationParams || {}
        };
    }

    mergeConfigArray(configType, globalConfig, projectConfig) {
        const globalItems = globalConfig?.[configType] || [];
        const projectOverrides = projectConfig.projectOverrides?.[configType] || [];
        const projectItems = projectConfig[configType] || [];

        // Start with global items
        const merged = [...globalItems];

        // Add project-specific items
        projectItems.forEach(item => {
            if (!item.isGlobal && !merged.find(existing => existing.id === item.id)) {
                merged.push({ ...item, isProjectSpecific: true });
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

    mergeCalculationParams(globalConfig, projectConfig) {
        const globalParams = globalConfig?.calculationParams || {};
        const projectParams = projectConfig.calculationParams || {};
        const projectOverrides = projectConfig.projectOverrides?.calculationParams || {};

        return {
            ...globalParams,
            ...projectParams,
            ...projectOverrides
        };
    }
}

/**
 * Configuration Validators
 * Validates configuration data structure and content
 */
class ConfigurationValidators {
    validateGlobalConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Global configuration must be an object');
        }

        const requiredProps = ['suppliers', 'internalResources', 'categories', 'calculationParams'];
        for (const prop of requiredProps) {
            if (!(prop in config)) {
                throw new Error(`Missing required property: ${prop}`);
            }
        }

        this.validateSuppliers(config.suppliers);
        this.validateInternalResources(config.internalResources);
        this.validateCategories(config.categories);
        this.validateCalculationParams(config.calculationParams);
    }

    validateSuppliers(suppliers) {
        if (!Array.isArray(suppliers)) {
            throw new Error('Suppliers must be an array');
        }

        suppliers.forEach((supplier, index) => {
            if (!supplier.id || !supplier.name) {
                throw new Error(`Supplier at index ${index} missing required fields`);
            }
            if (typeof supplier.officialRate !== 'number' || supplier.officialRate < 0) {
                throw new Error(`Supplier at index ${index} has invalid rate`);
            }
        });
    }

    validateInternalResources(resources) {
        if (!Array.isArray(resources)) {
            throw new Error('Internal resources must be an array');
        }

        resources.forEach((resource, index) => {
            if (!resource.id || !resource.name || !resource.role) {
                throw new Error(`Internal resource at index ${index} missing required fields`);
            }
            if (typeof resource.officialRate !== 'number' || resource.officialRate < 0) {
                throw new Error(`Internal resource at index ${index} has invalid rate`);
            }
        });
    }

    validateCategories(categories) {
        if (!Array.isArray(categories)) {
            throw new Error('Categories must be an array');
        }

        categories.forEach((category, index) => {
            if (!category.id || !category.name) {
                throw new Error(`Category at index ${index} missing required fields`);
            }
            if (typeof category.multiplier !== 'number' || category.multiplier <= 0) {
                throw new Error(`Category at index ${index} has invalid multiplier`);
            }
        });
    }

    validateCalculationParams(params) {
        if (!params || typeof params !== 'object') {
            throw new Error('Calculation parameters must be an object');
        }

        const numericFields = ['workingDaysPerMonth', 'workingHoursPerDay'];
        numericFields.forEach(field => {
            if (field in params && (typeof params[field] !== 'number' || params[field] <= 0)) {
                throw new Error(`Invalid ${field}: must be a positive number`);
            }
        });
    }
}

// Add utility methods from original implementation
ConfigurationManagerRefactored.prototype.deepClone = function(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));

    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
    });
    return cloned;
};

ConfigurationManagerRefactored.prototype.deepEqual = function(obj1, obj2) {
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
};

// Make available globally
if (typeof window !== 'undefined') {
    window.ConfigurationManagerRefactored = ConfigurationManagerRefactored;
    window.ConfigCache = ConfigCache;
    window.ConfigurationMerger = ConfigurationMerger;
    window.ConfigurationValidators = ConfigurationValidators;
}