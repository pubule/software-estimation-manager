/**
 * Configuration Manager (Refactored)
 * Manages global and project-specific configurations with improved architecture
 */

class ConfigurationManager extends BaseComponent {
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
        
        // Default configuration manager for loading rich defaults
        this.defaultConfigManager = new DefaultConfigManager();
    }

    async onInit() {
        try {
            await this.loadGlobalConfig();
            console.log('Configuration Manager initialized successfully');
        } catch (error) {
            this.handleError('Failed to initialize Configuration Manager', error);
            this.globalConfig = await this.createDefaultGlobalConfig();
        }
    }

    /**
     * Load global configuration
     */
    async loadGlobalConfig() {
        try {
            // Always load fresh defaults from defaults.json first
            console.log('[ConfigManager] Loading fresh defaults from defaults.json...');
            const defaultConfig = await this.createDefaultGlobalConfig();
            console.log('[ConfigManager] Defaults loaded:', {
                vendorsCount: defaultConfig.vendors?.length || 0,
                categoriesCount: defaultConfig.categories?.length || 0
            });

            const settings = await this.dataManager.getSettings();
            let storedConfig = settings.globalConfig;

            let config;
            if (!storedConfig) {
                // No stored config, use defaults
                config = defaultConfig;
                console.log('[ConfigManager] No stored config found, using defaults.json');
            } else {
                // Merge stored config with defaults - defaults provide the base, stored config provides overrides/additions
                console.log('[ConfigManager] Merging stored config with defaults.json...');
                config = this.mergeWithDefaults(storedConfig, defaultConfig);
            }

            this.globalConfig = config;
            this.cache.invalidate();

            if (window.appStore && this.globalConfig) {
                window.appStore.getState().setGlobalConfig(this.globalConfig);
                console.log('✅ Global config saved to state store');
            }
        } catch (error) {
            this.handleError('Failed to load global config', error);
            this.globalConfig = await this.createDefaultGlobalConfig();

            if (window.appStore && this.globalConfig) {
                window.appStore.getState().setGlobalConfig(this.globalConfig);
                console.log('✅ Fallback global config saved to state store');
            }
        }
    }

    /**
     * Merge stored config with defaults - ensures we always have complete data from defaults.json
     * while preserving any user customizations from stored config
     */
    mergeWithDefaults(storedConfig, defaultConfig) {
        // Start with defaults as the base
        const merged = this.deepClone(defaultConfig);

        // Handle migration from old structure
        if (storedConfig.suppliers || storedConfig.internalResources) {
            console.log('[ConfigManager] Old config structure found. Migrating vendors...');
            const vendorMap = new Map();

            (storedConfig.suppliers || []).forEach(s => {
                if (!vendorMap.has(s.name)) {
                    vendorMap.set(s.name, {
                        id: `vendor-${s.name.toLowerCase().replace(/\s+/g, '-')}`,
                        name: s.name,
                        type: 'External',
                        role: s.role,
                        jobClusters: []
                    });
                }
            });

            (storedConfig.internalResources || []).forEach(r => {
                if (!vendorMap.has(r.name)) {
                    vendorMap.set(r.name, {
                        id: `vendor-${r.name.toLowerCase().replace(/\s+/g, '-')}`,
                        name: r.name,
                        type: 'Internal',
                        role: r.role,
                        jobClusters: []
                    });
                }
            });

            // Add migrated vendors to the merged config (avoiding duplicates)
            const migratedVendors = Array.from(vendorMap.values());
            migratedVendors.forEach(mv => {
                const exists = merged.vendors.find(v => v.id === mv.id || v.name === mv.name);
                if (!exists) {
                    merged.vendors.push(mv);
                }
            });

            console.log(`[ConfigManager] Migrated ${migratedVendors.length} vendors from old structure`);
        }

        // Migrate vendor role from vendor level to job cluster level
        if (merged.vendors && Array.isArray(merged.vendors)) {
            let migratedRoleCount = 0;
            merged.vendors.forEach(vendor => {
                if (vendor.role && vendor.jobClusters && Array.isArray(vendor.jobClusters)) {
                    // Vendor has role at vendor level - migrate to job clusters
                    vendor.jobClusters.forEach(jc => {
                        if (!jc.role) {
                            jc.role = vendor.role;
                            migratedRoleCount++;
                        }
                    });
                    // Remove role from vendor level
                    delete vendor.role;
                }
            });
            if (migratedRoleCount > 0) {
                console.log(`[ConfigManager] Migrated ${migratedRoleCount} vendor roles from vendor level to job cluster level`);
            }
        }

        // Merge vendors: defaults as base + stored vendors that don't exist in defaults
        if (storedConfig.vendors && Array.isArray(storedConfig.vendors)) {
            storedConfig.vendors.forEach(storedVendor => {
                const exists = merged.vendors.find(v => v.id === storedVendor.id || v.name === storedVendor.name);
                if (!exists) {
                    // Add project-specific vendor that was added to stored config
                    merged.vendors.push({ ...storedVendor, isProjectSpecific: true });
                } else {
                    // Merge job clusters if the vendor exists
                    if (storedVendor.jobClusters && storedVendor.jobClusters.length > 0) {
                        const existingVendor = merged.vendors.find(v => v.id === storedVendor.id || v.name === storedVendor.name);
                        if (existingVendor) {
                            // Merge job clusters
                            storedVendor.jobClusters.forEach(jc => {
                                const existingJc = existingVendor.jobClusters?.find(ejc => ejc.clusterId === jc.clusterId);
                                if (!existingJc) {
                                    existingVendor.jobClusters = existingVendor.jobClusters || [];
                                    existingVendor.jobClusters.push(jc);
                                }
                            });
                        }
                    }
                }
            });
        }

        // Merge categories: defaults as base + stored categories that don't exist in defaults
        if (storedConfig.categories && Array.isArray(storedConfig.categories)) {
            storedConfig.categories.forEach(storedCategory => {
                const exists = merged.categories.find(c => c.id === storedCategory.id || c.name === storedCategory.name);
                if (!exists) {
                    // Add custom category that was added to stored config
                    merged.categories.push({ ...storedCategory, isProjectSpecific: true });
                }
            });
        }

        // Preserve calculation params from stored config (user preferences)
        if (storedConfig.calculationParams) {
            merged.calculationParams = {
                ...merged.calculationParams,
                ...storedConfig.calculationParams
            };
        }

        // Preserve rateMatrixConfig from stored config if it has more data
        if (storedConfig.rateMatrixConfig) {
            // Merge locations
            if (storedConfig.rateMatrixConfig.locations) {
                const existingLocationIds = new Set(merged.rateMatrixConfig.locations.map(l => l.id));
                storedConfig.rateMatrixConfig.locations.forEach(loc => {
                    if (!existingLocationIds.has(loc.id)) {
                        merged.rateMatrixConfig.locations.push(loc);
                    }
                });
            }
            // Merge seniorities
            if (storedConfig.rateMatrixConfig.seniorities) {
                const existingSeniorities = new Set(merged.rateMatrixConfig.seniorities);
                storedConfig.rateMatrixConfig.seniorities.forEach(sen => {
                    if (!existingSeniorities.has(sen)) {
                        merged.rateMatrixConfig.seniorities.push(sen);
                    }
                });
            }
            // Merge job clusters
            if (storedConfig.rateMatrixConfig.jobClusters) {
                const existingClusters = new Set(merged.rateMatrixConfig.jobClusters);
                storedConfig.rateMatrixConfig.jobClusters.forEach(jc => {
                    if (!existingClusters.has(jc)) {
                        merged.rateMatrixConfig.jobClusters.push(jc);
                    }
                });
            }
        }

        console.log('[ConfigManager] Merge complete:', {
            vendorsCount: merged.vendors?.length || 0,
            categoriesCount: merged.categories?.length || 0
        });

        return merged;
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

            // Also update defaults.json with the current configuration
            if (window.electronAPI && window.electronAPI.updateDefaultConfig) {
                await window.electronAPI.updateDefaultConfig(this.globalConfig);
                console.log('✅ Updated defaults.json with current configuration');
            }

            this.cache.invalidate();
            this.emit('global-config-changed', { config: this.globalConfig });

            // 🏪 Update state store after save
            if (window.appStore && this.globalConfig) {
                window.appStore.getState().setGlobalConfig(this.globalConfig);
                console.log('✅ Global config updated in state store after save');
            }

            return { success: true };
        } catch (error) {
            this.handleError('Failed to save global config', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create default global configuration using DefaultConfigManager
     * ALWAYS loads from defaults.json - no fallbacks allowed
     */
    async createDefaultGlobalConfig() {
        console.log('[ConfigManager] Loading default config from defaults.json...');
        const defaultVendors = await this.defaultConfigManager.getDefaultVendors();
        const rateMatrixConfig = await this.defaultConfigManager.getRateMatrixConfig();
        const defaultCategories = await this.defaultConfigManager.getDefaultCategories();
        const defaultTeams = await this.defaultConfigManager.getDefaultTeams();
        const phaseDefinitions = await this.defaultConfigManager.getPhaseDefinitions();

        console.log('[ConfigManager] Loaded from defaults.json:', {
            vendorsCount: defaultVendors?.length || 0,
            categoriesCount: defaultCategories?.length || 0,
            vendors: defaultVendors?.map(v => ({ id: v.id, name: v.name })),
            categories: defaultCategories?.map(c => ({ id: c.id, name: c.name }))
        });

        const normalizedCategories = this.normalizeCategoriesWithMultiplier(defaultCategories);

        return {
            phaseDefinitions: phaseDefinitions || [],
            vendors: defaultVendors || [],
            rateMatrixConfig: rateMatrixConfig,
            categories: normalizedCategories || [],
            teams: defaultTeams || [],
            calculationParams: this.createDefaultCalculationParams()
        };
    }

    createDefaultRateMatrixConfig() {
        return {
          "locations": [
            { "id": "italy", "name": "Italy", "deliveryModels": ["onsite", "offsite"] },
            { "id": "romania", "name": "Romania", "deliveryModels": ["onsite", "offsite"] },
            { "id": "poland", "name": "Poland", "deliveryModels": ["onsite", "offsite"] },
            { "id": "hungary", "name": "Hungary", "deliveryModels": ["onsite", "offsite"] },
            { "id": "germany", "name": "Germany", "deliveryModels": ["onsite", "offsite"] },
            { "id": "india", "name": "India", "deliveryModels": ["offshore"] }
          ],
          "seniorities": ["Junior", "Mid-Level", "Senior"],
          "jobClusters": ["AI Engineer", "Architect", "Business Analyst", "Cloud Engineer", "Cyber security", "Data Analyst & Scientist", "Data Engineer"]
        }
    }

    /**
     * Normalize categories by adding default multiplier if missing
     */
    normalizeCategoriesWithMultiplier(categories) {
        if (!categories || !Array.isArray(categories)) {
            return null;
        }
        
        return categories.map(category => ({
            ...category,
            multiplier: category.multiplier || 1.0 // Default multiplier if not present
        }));
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
    async initializeProjectConfig() {
        if (!this.globalConfig) {
            this.globalConfig = await this.createDefaultGlobalConfig();
        }

        return {
            vendors: this.deepClone(this.globalConfig.vendors),
            rateMatrixConfig: this.deepClone(this.globalConfig.rateMatrixConfig),
            categories: this.deepClone(this.globalConfig.categories),
            calculationParams: this.deepClone(this.globalConfig.calculationParams),
            projectOverrides: {
                vendors: [],
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
     * Add a vendor to project configuration
     */
    addVendorToProject(projectConfig, vendor) {
        this.ensureProjectOverrides(projectConfig);
        
        vendor.id = vendor.id || this.generateId('vendor');
        vendor.isProjectSpecific = !vendor.isGlobal;

        if (vendor.isGlobal) {
            this.addToGlobalVendors(vendor);
        } else {
            this.addToProjectVendors(projectConfig, vendor);
        }

        this.cache.invalidate();
        return vendor;
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
    addToGlobalVendors(vendor) {
        const existingIndex = this.globalConfig.vendors.findIndex(v => v.id === vendor.id);
        if (existingIndex >= 0) {
            this.globalConfig.vendors[existingIndex] = vendor;
        } else {
            this.globalConfig.vendors.push(vendor);
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
    addToProjectVendors(projectConfig, vendor) {
        const existingIndex = projectConfig.projectOverrides.vendors.findIndex(v => v.id === vendor.id);
        if (existingIndex >= 0) {
            projectConfig.projectOverrides.vendors[existingIndex] = vendor;
        } else {
            projectConfig.projectOverrides.vendors.push(vendor);
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
    deleteVendorFromProject(projectConfig, vendorId) {
        const globalItem = this.globalConfig?.vendors?.find(v => v.id === vendorId);

        if (globalItem) {
            this.disableGlobalItemInProject(projectConfig, 'vendors', vendorId);
        } else {
            this.removeProjectSpecificItem(projectConfig, 'vendors', vendorId);
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
     * Getter methods - ALWAYS return from globalConfig (defaults.json)
     * Project-specific overrides are no longer used
     */
    getVendors() {
        return this.globalConfig?.vendors || [];
    }

    getCategories() {
        return this.globalConfig?.categories || [];
    }

    getCalculationParams() {
        return this.globalConfig?.calculationParams || {};
    }
    
    getRate(options) {
        const { vendorId, jobCluster, seniority, location, deliveryModel } = options;

        if (!this.globalConfig || !this.globalConfig.vendors) {
            console.warn("getRate: globalConfig or vendors not available");
            return { realRate: 0, officialRate: 0 };
        }

        const vendor = this.globalConfig.vendors.find(v => v.id === vendorId);
        if (!vendor) {
            console.warn(`getRate: Vendor not found for id: ${vendorId}`);
            return { realRate: 0, officialRate: 0 };
        }

        const jobClusterData = vendor.jobClusters?.find(jc => jc.clusterId === jobCluster);
        if (!jobClusterData) {
            console.warn(`getRate: Job cluster not found for id: ${jobCluster} in vendor ${vendor.name}`);
            return { realRate: 0, officialRate: 0 };
        }

        const rate = jobClusterData.rates?.find(r => r.seniority === seniority);
        if (!rate) {
            console.warn(`getRate: Rate not found for seniority: ${seniority} in job cluster ${jobCluster}`);
            return { realRate: 0, officialRate: 0 };
        }

        const locationRate = rate.locations?.[location];
        if (!locationRate) {
            console.warn(`getRate: Rate not found for location: ${location} for seniority ${seniority}`);
            return { realRate: 0, officialRate: 0 };
        }

        const finalRate = locationRate[deliveryModel];
        if (finalRate === undefined) {
            console.warn(`getRate: Rate not found for delivery model: ${deliveryModel} at location ${location}`);
            return { realRate: 0, officialRate: 0 };
        }

        // Assuming realRate and officialRate are the same for now. 
        // This can be changed later if the data model is updated.
        return { realRate: finalRate, officialRate: finalRate };
    }

    /**
     * Find methods
     */
    findVendor(projectConfig, vendorId) {
        return this.getVendors(projectConfig).find(v => v.id === vendorId);
    }

    findCategory(projectConfig, categoryId) {
        return this.getCategories(projectConfig).find(c => c.id === categoryId);
    }

    /**
     * Display name methods
     */
    getVendorDisplayName(projectConfig, vendorId) {
        const vendor = this.findVendor(projectConfig, vendorId);
        if (vendor) {
            return `${vendor.name} (${vendor.type})`;
        }
        return `Unknown Vendor (${vendorId})`;
    }

    getCategoryDisplayName(projectConfig, categoryId) {
        const category = this.findCategory(projectConfig, categoryId);
        return category ? category.name : `Unknown Category (${categoryId})`;
    }

    /**
     * Validation methods
     */
    validateVendor(projectConfig, vendorId) {
        return !!this.findVendor(projectConfig, vendorId);
    }

    validateCategory(projectConfig, categoryId) {
        return !!this.findCategory(projectConfig, categoryId);
    }

    /**
     * Migration methods
     */
    migrateProjectConfig(oldConfig) {
        if (oldConfig.projectOverrides && oldConfig.vendors) {
            return oldConfig; // Already migrated
        }

        const newConfig = {
            vendors: oldConfig.vendors || [],
            rateMatrixConfig: oldConfig.rateMatrixConfig || this.createDefaultRateMatrixConfig(),
            categories: oldConfig.categories || [],
            calculationParams: oldConfig.calculationParams || {},
            projectOverrides: {
                vendors: [],
                categories: [],
                calculationParams: {}
            }
        };

        // Simple migration from old suppliers/internalResources
        if (oldConfig.suppliers || oldConfig.internalResources) {
            const suppliers = (oldConfig.suppliers || []).map(s => ({...s, type: 'Supplier'}));
            const internalResources = (oldConfig.internalResources || []).map(r => ({...r, type: 'Internal'}));
            newConfig.vendors = [...suppliers, ...internalResources];
        }

        this.markProjectSpecificItems(newConfig);
        return newConfig;
    }

    markProjectSpecificItems(projectConfig) {
        // Mark vendors
        projectConfig.vendors.forEach(vendor => {
            const globalVendor = this.globalConfig?.vendors?.find(gv => gv.id === vendor.id);
            if (!globalVendor || !this.deepEqual(vendor, globalVendor)) {
                vendor.isProjectSpecific = true;
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
            vendors: [],
            categories: [],
            calculationParams: {}
        };

        projectConfig.vendors = this.deepClone(this.globalConfig.vendors);
        projectConfig.rateMatrixConfig = this.deepClone(this.globalConfig.rateMatrixConfig);
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
            vendors: this.getItemStats(config.vendors),
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
                vendors: [],
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

        try {
            // 🚨 CRITICAL FIX: Prevent circular references in JSON.stringify
            const hash = this.simpleHash(JSON.stringify({
                global: globalConfig,
                project: projectConfig
            }, (key, value) => {
                // Skip circular references and complex objects
                if (key === 'project' && typeof value === 'object' && value !== null) {
                    // Only include basic project properties for cache key
                    return {
                        name: value.name,
                        id: value.id || value.project?.id,
                        lastModified: value.project?.lastModified
                    };
                }
                return value;
            }));

            return `project_${hash}`;
        } catch (error) {
            console.warn('🛡️ ConfigCache.generateKey: Fallback to simple key due to:', error.message);
            // Fallback to a simpler key generation
            const projectId = projectConfig?.project?.id || projectConfig?.id || 'unknown';
            const timestamp = projectConfig?.project?.lastModified || Date.now();
            return `project_${projectId}_${timestamp}`;
        }
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
            vendors: this.mergeConfigArray('vendors', globalConfig, projectConfig),
            categories: this.mergeConfigArray('categories', globalConfig, projectConfig),
            calculationParams: this.mergeCalculationParams(globalConfig, projectConfig),
            rateMatrixConfig: globalConfig?.rateMatrixConfig || {}
        };
    }

    createGlobalOnlyConfig(globalConfig) {
        return {
            vendors: globalConfig?.vendors || [],
            categories: globalConfig?.categories || [],
            calculationParams: globalConfig?.calculationParams || {},
            rateMatrixConfig: globalConfig?.rateMatrixConfig || {}
        };
    }

    mergeConfigArray(configType, globalConfig, projectConfig) {
        const globalItems = globalConfig?.[configType] || [];
        const projectOverrides = projectConfig.projectOverrides?.[configType] || [];
        const projectItems = projectConfig[configType] || [];

        console.log(`[ConfigMerger] mergeConfigArray(${configType}): globalItems=${globalItems.length}, projectItems=${projectItems.length}, projectOverrides=${projectOverrides.length}`);
        console.log(`[ConfigMerger] globalConfig exists: ${!!globalConfig}, globalConfig.${configType} exists: ${!!globalConfig?.[configType]}`);

        // Start with global items (always use latest from defaults.json)
        const merged = [...globalItems];

        // Add project-specific items (items that don't exist in global)
        projectItems.forEach(item => {
            const existsInGlobal = merged.find(existing => existing.id === item.id);
            if (!existsInGlobal && !item.isGlobal) {
                // Item doesn't exist in global and is marked as project-specific
                merged.push({ ...item, isProjectSpecific: true });
            }
            // Note: If item exists in global, we use the global version (already in merged)
            // This ensures defaults.json updates are reflected in the project
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
        const filtered = merged.filter(item =>
            !item.status || item.status === 'active'
        );

        console.log(`[ConfigMerger] mergeConfigArray(${configType}): merged=${merged.length}, after filter=${filtered.length}`);
        console.log(`[ConfigMerger] filtered items:`, filtered.map(i => ({ id: i.id, name: i.name, status: i.status })));

        return filtered;
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

        const requiredProps = ['vendors', 'categories', 'calculationParams', 'rateMatrixConfig'];
        for (const prop of requiredProps) {
            if (!(prop in config)) {
                throw new Error(`Missing required property: ${prop}`);
            }
        }

        this.validateVendors(config.vendors);
        this.validateCategories(config.categories);
        this.validateCalculationParams(config.calculationParams);
    }

    validateVendors(vendors) {
        if (!Array.isArray(vendors)) {
            throw new Error('Vendors must be an array');
        }

        vendors.forEach((vendor, index) => {
            if (!vendor.id || !vendor.name || !vendor.type) {
                throw new Error(`Vendor at index ${index} missing required fields (id, name, type)`);
            }
            if (!['External', 'Internal'].includes(vendor.type)) {
                 throw new Error(`Vendor at index ${index} has invalid type`);
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
            // Multiplier is optional - only validate if present
            if (category.multiplier !== undefined && (typeof category.multiplier !== 'number' || category.multiplier <= 0)) {
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
ConfigurationManager.prototype.deepClone = function(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));

    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
    });
    return cloned;
};

ConfigurationManager.prototype.deepEqual = function(obj1, obj2) {
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
    window.ConfigurationManager = ConfigurationManager;
    window.ConfigCache = ConfigCache;
    window.ConfigurationMerger = ConfigurationMerger;
    window.ConfigurationValidators = ConfigurationValidators;
}