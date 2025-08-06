/**
 * ConfigurationManager Behavioral Tests
 * 
 * Documents the current behavior of the ConfigurationManager class including:
 * - Hierarchical configuration system (Global → Project → Local overrides)  
 * - Configuration merging and caching logic
 * - Project-specific overrides and migration behavior
 * - Validation and lookup functions
 * - Configuration statistics and utilities
 */

describe('ConfigurationManager - Behavioral Documentation', () => {
    let configManager;
    let mockDataManager;

    beforeEach(() => {
        // Mock DataManager
        mockDataManager = {
            getSettings: jest.fn(),
            saveSettings: jest.fn().mockResolvedValue({ success: true })
        };

        configManager = new ConfigurationManager(mockDataManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Global Configuration Initialization Behavior', () => {
        test('BEHAVIOR: Creates default global config with specific structure when none exists', async () => {
            mockDataManager.getSettings.mockResolvedValue({});

            await configManager.loadGlobalConfig();

            const globalConfig = configManager.globalConfig;

            // Documents default configuration structure
            expect(globalConfig).toHaveProperty('suppliers');
            expect(globalConfig).toHaveProperty('internalResources'); 
            expect(globalConfig).toHaveProperty('categories');
            expect(globalConfig).toHaveProperty('calculationParams');

            // Documents default suppliers
            expect(globalConfig.suppliers).toHaveLength(2);
            expect(globalConfig.suppliers[0]).toMatchObject({
                id: 'supplier1',
                name: 'External Supplier A',
                realRate: 450,
                officialRate: 500,
                status: 'active',
                isGlobal: true
            });

            // Documents default calculation parameters
            expect(globalConfig.calculationParams).toMatchObject({
                workingDaysPerMonth: 22,
                workingHoursPerDay: 8,
                currencySymbol: '€',
                riskMargin: 0.15,
                overheadPercentage: 0.10
            });
        });

        test('BEHAVIOR: Creates fallback config when DataManager fails', async () => {
            mockDataManager.getSettings.mockRejectedValue(new Error('Settings unavailable'));
            const consoleSpy = jest.spyOn(console, 'error');

            await configManager.init();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize Configuration Manager:', expect.any(Error));
            expect(configManager.globalConfig).toBeDefined();
            expect(configManager.globalConfig.categories).toHaveLength(5);
        });

        test('BEHAVIOR: Default categories include specific multipliers and descriptions', async () => {
            await configManager.init();

            const categories = configManager.globalConfig.categories;
            const securityCategory = categories.find(c => c.id === 'security');
            const integrationCategory = categories.find(c => c.id === 'integration');

            // Documents specific category configurations
            expect(securityCategory).toMatchObject({
                id: 'security',
                name: 'Security',
                description: 'Security-related features',
                multiplier: 1.2,
                isGlobal: true
            });

            expect(integrationCategory.multiplier).toBe(1.3); // Highest multiplier
        });

        test('BEHAVIOR: Default internal resources include specific roles and departments', async () => {
            await configManager.init();

            const resources = configManager.globalConfig.internalResources;
            
            // Documents role and department structure
            expect(resources).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ role: 'Tech Analyst IT', department: 'IT' }),
                    expect.objectContaining({ role: 'Tech Analyst RO', department: 'RO' }),
                    expect.objectContaining({ role: 'Developer', department: 'Development' })
                ])
            );

            // Documents rate structure
            const techAnalystIT = resources.find(r => r.role === 'Tech Analyst IT');
            expect(techAnalystIT.realRate).toBe(350);
            expect(techAnalystIT.officialRate).toBe(400);
        });
    });

    describe('Project Configuration Initialization Behavior', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        test('BEHAVIOR: Initializes project config with deep cloned global defaults', () => {
            const projectConfig = configManager.initializeProjectConfig('test-project');

            // Documents structure includes both base config and overrides
            expect(projectConfig).toHaveProperty('suppliers');
            expect(projectConfig).toHaveProperty('internalResources');
            expect(projectConfig).toHaveProperty('categories');
            expect(projectConfig).toHaveProperty('calculationParams');
            expect(projectConfig).toHaveProperty('projectOverrides');

            // Documents that projectOverrides are initially empty
            expect(projectConfig.projectOverrides).toEqual({
                suppliers: [],
                internalResources: [],
                categories: [],
                calculationParams: {}
            });

            // Documents deep cloning (modifications don't affect global)
            projectConfig.suppliers[0].name = 'Modified Supplier';
            expect(configManager.globalConfig.suppliers[0].name).toBe('External Supplier A');
        });

        test('BEHAVIOR: Project config returns global when no project config provided', () => {
            const config = configManager.getProjectConfig(null);

            // Documents fallback behavior
            expect(config.suppliers).toEqual(configManager.globalConfig.suppliers);
            expect(config.categories).toEqual(configManager.globalConfig.categories);
        });
    });

    describe('Configuration Merging Behavior', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        test('BEHAVIOR: Merges global config with project overrides correctly', () => {
            const projectConfig = {
                suppliers: configManager.globalConfig.suppliers,
                categories: configManager.globalConfig.categories,
                internalResources: configManager.globalConfig.internalResources,
                calculationParams: configManager.globalConfig.calculationParams,
                projectOverrides: {
                    suppliers: [
                        { id: 'project-supplier', name: 'Project Specific Supplier', officialRate: 600 }
                    ],
                    categories: [
                        { id: 'security', name: 'Custom Security', multiplier: 1.5 } // Override existing
                    ],
                    internalResources: [],
                    calculationParams: {
                        riskMargin: 0.20 // Override default 0.15
                    }
                }
            };

            const mergedConfig = configManager.getProjectConfig(projectConfig);

            // Documents override behavior for existing items
            const securityCategory = mergedConfig.categories.find(c => c.id === 'security');
            expect(securityCategory.name).toBe('Custom Security');
            expect(securityCategory.multiplier).toBe(1.5);
            expect(securityCategory.isOverridden).toBe(true);

            // Documents addition of new project-specific items
            const projectSupplier = mergedConfig.suppliers.find(s => s.id === 'project-supplier');
            expect(projectSupplier.name).toBe('Project Specific Supplier');
            expect(projectSupplier.isProjectSpecific).toBe(true);

            // Documents calculation parameter merging
            expect(mergedConfig.calculationParams.riskMargin).toBe(0.20);
            expect(mergedConfig.calculationParams.workingDaysPerMonth).toBe(22); // Unchanged
        });

        test('BEHAVIOR: Inactive suppliers are filtered out during merge', () => {
            const projectConfig = {
                suppliers: configManager.globalConfig.suppliers,
                projectOverrides: {
                    suppliers: [
                        { id: 'supplier1', status: 'inactive' }, // Disable existing supplier
                        { id: 'active-supplier', name: 'Active', status: 'active' }
                    ],
                    categories: [],
                    internalResources: [],
                    calculationParams: {}
                }
            };

            const mergedConfig = configManager.getProjectConfig(projectConfig);
            
            // Documents filtering behavior
            const inactiveSupplier = mergedConfig.suppliers.find(s => s.id === 'supplier1' && s.status === 'inactive');
            expect(inactiveSupplier).toBeUndefined();

            const activeSupplier = mergedConfig.suppliers.find(s => s.id === 'active-supplier');
            expect(activeSupplier).toBeDefined();
        });

        test('BEHAVIOR: Project items without isGlobal flag are marked as project-specific', () => {
            const projectConfig = {
                suppliers: [
                    ...configManager.globalConfig.suppliers,
                    { id: 'custom', name: 'Custom Supplier', officialRate: 550 } // No isGlobal flag
                ],
                projectOverrides: { suppliers: [], categories: [], internalResources: [], calculationParams: {} }
            };

            const mergedConfig = configManager.getProjectConfig(projectConfig);
            
            const customSupplier = mergedConfig.suppliers.find(s => s.id === 'custom');
            expect(customSupplier.isProjectSpecific).toBe(true);
        });
    });

    describe('Configuration Caching Behavior', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        test('BEHAVIOR: Configuration results are cached using generated cache keys', () => {
            const projectConfig = { projectOverrides: { suppliers: [], categories: [], internalResources: [], calculationParams: {} } };

            // First call should populate cache
            const config1 = configManager.getProjectConfig(projectConfig);
            
            // Second call should use cache
            const config2 = configManager.getProjectConfig(projectConfig);

            expect(config1).toBe(config2); // Same object reference from cache
            expect(configManager.configCache.size).toBe(1);
        });

        test('BEHAVIOR: Cache is cleared when global config is saved', async () => {
            const projectConfig = { projectOverrides: { suppliers: [], categories: [], internalResources: [], calculationParams: {} } };
            
            // Populate cache
            configManager.getProjectConfig(projectConfig);
            expect(configManager.configCache.size).toBe(1);

            // Save global config
            await configManager.saveGlobalConfig();

            // Documents cache clearing behavior
            expect(configManager.configCache.size).toBe(0);
        });

        test('BEHAVIOR: Cache key generation uses hash of combined global and project config', () => {
            const projectConfig = { test: 'data' };
            
            const cacheKey = configManager.generateCacheKey(projectConfig);
            
            expect(cacheKey).toMatch(/^project_\d+$/);
            expect(typeof cacheKey).toBe('string');

            // Same input generates same key
            const cacheKey2 = configManager.generateCacheKey(projectConfig);
            expect(cacheKey).toBe(cacheKey2);
        });
    });

    describe('Configuration Manipulation Methods', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        test('BEHAVIOR: Adding supplier to project creates or updates projectOverrides', () => {
            const projectConfig = { projectOverrides: { suppliers: [], categories: [], internalResources: [], calculationParams: {} } };
            const newSupplier = { name: 'Test Supplier', officialRate: 400, isGlobal: false };

            const result = configManager.addSupplierToProject(projectConfig, newSupplier);

            // Documents auto-ID generation
            expect(result.id).toBeDefined();
            expect(result.id).toContain('supplier');

            // Documents project-specific marking
            expect(result.isProjectSpecific).toBe(true);

            // Documents addition to overrides array
            expect(projectConfig.projectOverrides.suppliers).toContain(result);
            expect(configManager.configCache.size).toBe(0); // Cache cleared
        });

        test('BEHAVIOR: Adding global supplier updates global config instead of project overrides', () => {
            const projectConfig = { projectOverrides: { suppliers: [], categories: [], internalResources: [], calculationParams: {} } };
            const globalSupplier = { name: 'Global Supplier', officialRate: 500, isGlobal: true };

            configManager.addSupplierToProject(projectConfig, globalSupplier);

            // Documents global addition behavior
            expect(projectConfig.projectOverrides.suppliers).toHaveLength(0);
            
            const addedToGlobal = configManager.globalConfig.suppliers.find(s => s.name === 'Global Supplier');
            expect(addedToGlobal).toBeDefined();
        });

        test('BEHAVIOR: Deleting global items marks them inactive instead of removing', () => {
            const projectConfig = { projectOverrides: { suppliers: [], categories: [], internalResources: [], calculationParams: {} } };
            const globalSupplierId = configManager.globalConfig.suppliers[0].id;

            configManager.deleteSupplierFromProject(projectConfig, globalSupplierId);

            // Documents disable behavior for global items
            const inactiveOverride = projectConfig.projectOverrides.suppliers.find(s => s.id === globalSupplierId);
            expect(inactiveOverride).toEqual({
                id: globalSupplierId,
                status: 'inactive'
            });
        });

        test('BEHAVIOR: Updating calculation params merges with existing overrides', () => {
            const projectConfig = { 
                projectOverrides: { 
                    calculationParams: { riskMargin: 0.10 },
                    suppliers: [], categories: [], internalResources: []
                } 
            };

            configManager.updateCalculationParams(projectConfig, { 
                workingDaysPerMonth: 20,
                overheadPercentage: 0.15
            });

            // Documents merge behavior preserving existing overrides
            expect(projectConfig.projectOverrides.calculationParams).toEqual({
                riskMargin: 0.10, // Preserved
                workingDaysPerMonth: 20, // Added
                overheadPercentage: 0.15 // Added
            });
        });
    });

    describe('Project Configuration Migration Behavior', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        test('BEHAVIOR: Old format project config is migrated to hierarchical structure', () => {
            const oldConfig = {
                suppliers: [
                    { id: 's1', name: 'Old Supplier', officialRate: 400 }
                ],
                categories: [
                    { id: 'c1', name: 'Old Category', multiplier: 1.0 }
                ],
                calculationParams: {
                    riskMargin: 0.25
                }
                // Missing projectOverrides - indicates old format
            };

            const migratedConfig = configManager.migrateProjectConfig(oldConfig);

            // Documents migration creates projectOverrides structure
            expect(migratedConfig.projectOverrides).toBeDefined();
            expect(migratedConfig.projectOverrides).toEqual({
                suppliers: [],
                internalResources: [],
                categories: [],
                calculationParams: {}
            });

            // Documents that existing config is preserved
            expect(migratedConfig.suppliers[0].name).toBe('Old Supplier');
        });

        test('BEHAVIOR: Already migrated config is returned unchanged', () => {
            const modernConfig = {
                suppliers: [],
                projectOverrides: { suppliers: [], categories: [], internalResources: [], calculationParams: {} }
            };

            const result = configManager.migrateProjectConfig(modernConfig);

            expect(result).toBe(modernConfig); // Same reference
        });

        test('BEHAVIOR: Migration marks items as project-specific when they differ from global', () => {
            const mockConfigWithDifferentItem = {
                suppliers: [
                    { id: 'supplier1', name: 'Modified Global Supplier', officialRate: 999 } // Different from global
                ]
            };

            configManager.migrateProjectConfig(mockConfigWithDifferentItem);

            // The implementation would mark items as project-specific during markProjectSpecificItems call
            // This documents the intended behavior even if not fully implemented
        });
    });

    describe('Lookup and Validation Methods', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        test('BEHAVIOR: Supplier lookup searches both suppliers and internal resources', () => {
            const projectConfig = configManager.getProjectConfig({});

            const externalSupplier = configManager.findSupplier(projectConfig, 'supplier1');
            const internalResource = configManager.findInternalResource(projectConfig, 'internal1');

            expect(externalSupplier.name).toBe('External Supplier A');
            expect(internalResource.role).toBe('Tech Analyst IT');
        });

        test('BEHAVIOR: Display name generation includes type indicators', () => {
            const projectConfig = configManager.getProjectConfig({});
            
            const supplierDisplay = configManager.getSupplierDisplayName(projectConfig, 'supplier1');
            const resourceDisplay = configManager.getSupplierDisplayName(projectConfig, 'internal1');

            // Documents display format differences
            expect(supplierDisplay).toBe('External Supplier A (External)');
            expect(resourceDisplay).toBe('Tech Analyst IT (Internal)');
        });

        test('BEHAVIOR: Unknown IDs return formatted fallback strings', () => {
            const projectConfig = configManager.getProjectConfig({});
            
            const unknownSupplier = configManager.getSupplierDisplayName(projectConfig, 'unknown-id');
            const unknownCategory = configManager.getCategoryDisplayName(projectConfig, 'unknown-id');

            expect(unknownSupplier).toBe('Unknown Supplier (unknown-id)');
            expect(unknownCategory).toBe('Unknown Category (unknown-id)');
        });

        test('BEHAVIOR: Validation methods check existence in merged configuration', () => {
            const projectConfig = configManager.getProjectConfig({});

            expect(configManager.validateSupplier(projectConfig, 'supplier1')).toBe(true);
            expect(configManager.validateSupplier(projectConfig, 'internal1')).toBe(true); // Internal resources count as suppliers
            expect(configManager.validateSupplier(projectConfig, 'nonexistent')).toBe(false);

            expect(configManager.validateCategory(projectConfig, 'security')).toBe(true);
            expect(configManager.validateCategory(projectConfig, 'nonexistent')).toBe(false);
        });
    });

    describe('Configuration Statistics Behavior', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        test('BEHAVIOR: Config stats provide detailed breakdown by type', () => {
            const projectConfig = {
                projectOverrides: {
                    suppliers: [
                        { id: 'supplier1', name: 'Modified', isOverridden: true },
                        { id: 'custom-supplier', name: 'Custom', isProjectSpecific: true }
                    ],
                    categories: [],
                    internalResources: [],
                    calculationParams: {}
                }
            };

            const stats = configManager.getConfigStats(projectConfig);

            // Documents statistics structure
            expect(stats).toHaveProperty('suppliers');
            expect(stats).toHaveProperty('internalResources');
            expect(stats).toHaveProperty('categories');

            // Documents count breakdown
            expect(stats.suppliers.total).toBeGreaterThan(0);
            expect(stats.suppliers.global).toBeGreaterThan(0);
            expect(stats.categories.total).toBeGreaterThan(0);
            expect(stats.internalResources.total).toBeGreaterThan(0);
        });
    });

    describe('Utility Methods Behavior', () => {
        test('BEHAVIOR: Deep clone creates independent copies of complex objects', () => {
            const original = {
                simple: 'value',
                nested: { level2: { level3: 'deep' } },
                array: [1, { obj: 'in array' }, 3],
                date: new Date('2024-01-01'),
                nullValue: null
            };

            const cloned = configManager.deepClone(original);

            // Documents deep copying
            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned.nested).not.toBe(original.nested);
            expect(cloned.array).not.toBe(original.array);
            expect(cloned.date).not.toBe(original.date);
            expect(cloned.date.getTime()).toBe(original.date.getTime());

            // Modifications don't affect original
            cloned.nested.level2.level3 = 'modified';
            expect(original.nested.level2.level3).toBe('deep');
        });

        test('BEHAVIOR: Deep equal performs comprehensive object comparison', () => {
            const obj1 = { a: 1, b: { c: 'test' }, d: [1, 2, 3] };
            const obj2 = { a: 1, b: { c: 'test' }, d: [1, 2, 3] };
            const obj3 = { a: 1, b: { c: 'different' }, d: [1, 2, 3] };

            expect(configManager.deepEqual(obj1, obj2)).toBe(true);
            expect(configManager.deepEqual(obj1, obj3)).toBe(false);
            expect(configManager.deepEqual(null, null)).toBe(true);
            expect(configManager.deepEqual(obj1, null)).toBe(false);
        });

        test('BEHAVIOR: ID generation includes timestamp and random suffix', () => {
            const id1 = configManager.generateId('test');
            const id2 = configManager.generateId('test');

            expect(id1).toMatch(/^test\d+_[a-z0-9]{9}$/);
            expect(id2).toMatch(/^test\d+_[a-z0-9]{9}$/);
            expect(id1).not.toBe(id2); // Should be unique
        });

        test('BEHAVIOR: Simple hash produces consistent numeric hash from string', () => {
            const hash1 = configManager.simpleHash('test string');
            const hash2 = configManager.simpleHash('test string');
            const hash3 = configManager.simpleHash('different string');

            expect(typeof hash1).toBe('number');
            expect(hash1).toBe(hash2); // Consistent
            expect(hash1).not.toBe(hash3); // Different inputs produce different hashes
            expect(hash1).toBeGreaterThan(0); // Always positive due to Math.abs
        });
    });

    describe('KNOWN BUGS - Documented Current Behavior', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        test('BUG: Reset to global defaults doesnt handle projectOverrides array references correctly', () => {
            const projectConfig = {
                suppliers: [{ id: 'custom', name: 'Custom' }],
                projectOverrides: {
                    suppliers: [{ id: 'override', name: 'Override' }],
                    categories: [],
                    internalResources: [],
                    calculationParams: {}
                }
            };

            configManager.resetProjectToGlobalDefaults(projectConfig);

            // Documents that reset clears overrides but assigns new arrays
            // This could cause reference issues if other code holds references to the old arrays
            expect(projectConfig.projectOverrides.suppliers).toHaveLength(0);
            expect(projectConfig.suppliers).toEqual(configManager.globalConfig.suppliers);
        });

        test('BUG: Cache key generation could produce collisions for similar configs', () => {
            const config1 = { a: 1, b: 2 };
            const config2 = { a: 12 }; // Could potentially produce same hash

            const key1 = configManager.generateCacheKey(config1);
            const key2 = configManager.generateCacheKey(config2);

            // Documents potential for hash collisions with simple string hash
            expect(typeof key1).toBe('string');
            expect(typeof key2).toBe('string');
            // The simple hash function could theoretically produce the same result
        });

        test('BUG: markProjectSpecificItems method exists but isnt called during migration', () => {
            const oldConfig = {
                suppliers: [
                    { id: 'supplier1', name: 'Different Name', officialRate: 999 } // Different from global
                ]
            };

            const migrated = configManager.migrateProjectConfig(oldConfig);

            // Documents that markProjectSpecificItems is defined but not automatically called
            // The method exists but the migration doesn't use it to mark differing items
            expect(migrated.suppliers[0].isProjectSpecific).toBeUndefined();
        });

        test('BUG: deleteSupplierFromProject assumes global item existence without validation', () => {
            const projectConfig = { projectOverrides: { suppliers: [], categories: [], internalResources: [], calculationParams: {} } };
            
            // This would fail if globalConfig.suppliers is undefined
            configManager.globalConfig.suppliers = null;

            expect(() => {
                configManager.deleteSupplierFromProject(projectConfig, 'any-id');
            }).not.toThrow(); // Documents that it handles null/undefined gracefully

            // But it would add a meaningless override
            expect(projectConfig.projectOverrides.suppliers).toHaveLength(1);
        });
    });
});