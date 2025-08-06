/**
 * ProjectPhasesManager Behavioral Tests
 * 
 * Documents the current behavior of the ProjectPhasesManager class including:
 * - Project phases calculation and management across 8 phases
 * - Resource assignment and rate management
 * - Supplier selection and development phase special calculation logic
 * - Phase synchronization with current project data
 * - Real-time UI updates and validation behavior
 */

describe('ProjectPhasesManager - Behavioral Documentation', () => {
    let phasesManager;
    let mockApp;
    let mockConfigManager;
    let mockDefaultConfigManager;

    beforeEach(() => {
        // Mock DefaultConfigManager
        mockDefaultConfigManager = {
            getPhaseDefinitions: jest.fn().mockResolvedValue([
                {
                    id: 'functionalSpec',
                    name: 'Functional Specification',
                    description: 'Define functional requirements',
                    type: 'pre-development',
                    calculated: false,
                    defaultEffort: { G1: 0, G2: 0, TA: 80, PM: 20 }
                },
                {
                    id: 'techSpec',
                    name: 'Technical Specification',
                    description: 'Technical design and architecture',
                    type: 'pre-development',
                    calculated: false,
                    defaultEffort: { G1: 20, G2: 60, TA: 15, PM: 5 }
                },
                {
                    id: 'development',
                    name: 'Development',
                    description: 'Implementation of features',
                    type: 'development',
                    calculated: true,
                    defaultEffort: { G1: 10, G2: 80, TA: 5, PM: 5 }
                },
                {
                    id: 'sit',
                    name: 'System Integration Testing',
                    description: 'Integration testing',
                    type: 'testing',
                    calculated: false,
                    defaultEffort: { G1: 0, G2: 30, TA: 50, PM: 20 }
                },
                {
                    id: 'uat',
                    name: 'User Acceptance Testing',
                    description: 'User testing phase',
                    type: 'testing',
                    calculated: false,
                    defaultEffort: { G1: 0, G2: 20, TA: 60, PM: 20 }
                },
                {
                    id: 'vapt',
                    name: 'Vulnerability Assessment',
                    description: 'Security testing',
                    type: 'testing',
                    calculated: false,
                    defaultEffort: { G1: 0, G2: 0, TA: 100, PM: 0 }
                },
                {
                    id: 'consolidation',
                    name: 'Consolidation',
                    description: 'Final preparations',
                    type: 'deployment',
                    calculated: false,
                    defaultEffort: { G1: 0, G2: 40, TA: 40, PM: 20 }
                },
                {
                    id: 'postGoLive',
                    name: 'Post Go-Live Support',
                    description: 'Support after deployment',
                    type: 'post-deployment',
                    calculated: false,
                    defaultEffort: { G1: 0, G2: 50, TA: 30, PM: 20 }
                }
            ])
        };

        // Mock ConfigurationManager
        mockConfigManager = {
            getProjectConfig: jest.fn().mockReturnValue({
                suppliers: [
                    { id: 'sup1', name: 'Supplier 1', department: 'Dev', role: 'G1', realRate: 450, officialRate: 500 },
                    { id: 'sup2', name: 'Supplier 2', department: 'Dev', role: 'G2', realRate: 400, officialRate: 450 }
                ],
                internalResources: [
                    { id: 'int1', name: 'Internal TA', department: 'IT', role: 'TA', realRate: 350, officialRate: 400 },
                    { id: 'int2', name: 'Internal PM', department: 'PM', role: 'PM', realRate: 500, officialRate: 550 }
                ]
            })
        };

        // Mock main app
        mockApp = {
            currentProject: {
                features: [
                    { id: 'F1', description: 'Feature 1', manDays: 10, supplier: 'sup2' },
                    { id: 'F2', description: 'Feature 2', manDays: 15, supplier: 'sup2' }
                ],
                coverage: 5,
                phases: {}
            },
            markDirty: jest.fn()
        };

        // Mock global classes
        global.DefaultConfigManager = jest.fn(() => mockDefaultConfigManager);

        // Setup DOM
        document.body.innerHTML = `
            <div class="phases-configuration">
                <div class="phases-content"></div>
            </div>
        `;

        phasesManager = new ProjectPhasesManager(mockApp, mockConfigManager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Phase Initialization Behavior', () => {
        test('BEHAVIOR: Loads 8 standard project phases with specific structure', async () => {
            await phasesManager.init();

            expect(phasesManager.phaseDefinitions).toHaveLength(8);
            
            const phaseIds = phasesManager.phaseDefinitions.map(p => p.id);
            expect(phaseIds).toEqual([
                'functionalSpec', 'techSpec', 'development', 'sit',
                'uat', 'vapt', 'consolidation', 'postGoLive'
            ]);
        });

        test('BEHAVIOR: Creates default phases with zero man days and default effort distribution', async () => {
            await phasesManager.init();

            const defaultPhases = phasesManager.createDefaultPhases();
            
            expect(defaultPhases).toHaveLength(8);
            expect(defaultPhases[0]).toMatchObject({
                id: 'functionalSpec',
                name: 'Functional Specification',
                manDays: 0,
                effort: { G1: 0, G2: 0, TA: 80, PM: 20 },
                assignedResources: [],
                cost: 0
            });
        });

        test('BEHAVIOR: Merges existing project phases with phase definitions', async () => {
            mockApp.currentProject.phases = {
                functionalSpec: { manDays: 5, effort: { G1: 0, G2: 20, TA: 60, PM: 20 } },
                development: { manDays: 25, effort: { G1: 10, G2: 80, TA: 5, PM: 5 } }
            };

            await phasesManager.init();
            const mergedPhases = phasesManager.mergeProjectPhases(mockApp.currentProject.phases);

            // Documents that existing phases override defaults
            const funcSpec = mergedPhases.find(p => p.id === 'functionalSpec');
            expect(funcSpec.manDays).toBe(5);
            expect(funcSpec.effort.G2).toBe(20); // Overridden from default 0

            // Documents that missing phases use defaults
            const techSpec = mergedPhases.find(p => p.id === 'techSpec');
            expect(techSpec.manDays).toBe(0);
            expect(techSpec.effort).toEqual({ G1: 20, G2: 60, TA: 15, PM: 5 });
        });
    });

    describe('Resource Rate Management Behavior', () => {
        beforeEach(async () => {
            await phasesManager.init();
        });

        test('BEHAVIOR: Default resource rates are set for 4 standard roles', () => {
            expect(phasesManager.resourceRates).toEqual({
                G1: 450,  // Grade 1 Developer
                G2: 380,  // Grade 2 Developer
                TA: 420,  // Technical Analyst
                PM: 500   // Project Manager
            });

            expect(phasesManager.selectedSuppliers).toEqual({
                G1: null,
                G2: null,
                TA: null,
                PM: null
            });
        });

        test('BEHAVIOR: Selected supplier changes update corresponding rates', () => {
            phasesManager.selectedSuppliers.G1 = 'sup1';
            phasesManager.selectedSuppliers.TA = 'int1';

            phasesManager.updateRatesFromSelectedSuppliers();

            expect(phasesManager.resourceRates.G1).toBe(450); // Uses realRate from sup1
            expect(phasesManager.resourceRates.TA).toBe(350); // Uses realRate from int1
            expect(phasesManager.resourceRates.G2).toBe(380); // Unchanged (no selection)
        });

        test('BEHAVIOR: Available suppliers filter includes both external and internal resources', () => {
            const availableSuppliers = phasesManager.getAvailableSuppliers();

            expect(availableSuppliers).toHaveLength(4);
            expect(availableSuppliers).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ id: 'sup1', name: 'Supplier 1' }),
                    expect.objectContaining({ id: 'int1', name: 'Internal TA' })
                ])
            );
        });
    });

    describe('Development Phase Auto-Calculation Behavior', () => {
        beforeEach(async () => {
            await phasesManager.init();
        });

        test('BEHAVIOR: Development phase man days auto-calculated from features + coverage', () => {
            // Features total: 10 + 15 = 25, Coverage: 5, Total: 30
            phasesManager.calculateDevelopmentPhase();

            const developmentPhase = phasesManager.currentPhases.find(p => p.id === 'development');
            expect(developmentPhase.manDays).toBe(30);
            expect(developmentPhase.lastModified).toBeDefined();
        });

        test('BEHAVIOR: Development phase calculation rounds to 1 decimal place', () => {
            mockApp.currentProject.features = [
                { manDays: 10.333 },
                { manDays: 15.666 }
            ];
            mockApp.currentProject.coverage = 5.123;

            phasesManager.calculateDevelopmentPhase();

            const developmentPhase = phasesManager.currentPhases.find(p => p.id === 'development');
            // Total: 31.122, Rounded: 31.1
            expect(developmentPhase.manDays).toBe(31.1);
        });

        test('BEHAVIOR: Development phase changes sync to current project automatically', () => {
            phasesManager.calculateDevelopmentPhase();

            expect(mockApp.currentProject.phases.development).toBeDefined();
            expect(mockApp.currentProject.phases.development.manDays).toBe(30);
        });

        test('BEHAVIOR: Missing features or coverage default to zero in calculations', () => {
            mockApp.currentProject.features = [];
            mockApp.currentProject.coverage = null;

            phasesManager.calculateDevelopmentPhase();

            const developmentPhase = phasesManager.currentPhases.find(p => p.id === 'development');
            expect(developmentPhase.manDays).toBe(0);
        });
    });

    describe('Phase Calculations and Cost Analysis', () => {
        beforeEach(async () => {
            await phasesManager.init();
        });

        test('BEHAVIOR: Man days distribution uses effort percentages', () => {
            const totalManDays = 100;
            const effort = { G1: 10, G2: 60, TA: 20, PM: 10 };

            const result = phasesManager.calculateManDaysByResource(totalManDays, effort);

            expect(result).toEqual({
                G1: 10,  // 100 * 10/100
                G2: 60,  // 100 * 60/100
                TA: 20,  // 100 * 20/100
                PM: 10   // 100 * 10/100
            });
        });

        test('BEHAVIOR: Cost calculation multiplies man days by resource rates', () => {
            const manDaysByResource = { G1: 10, G2: 20, TA: 5, PM: 3 };
            
            // Using default rates: G1=450, G2=380, TA=420, PM=500
            const result = phasesManager.calculateCostByResource(manDaysByResource);

            expect(result).toEqual({
                G1: 4500,   // 10 * 450
                G2: 7600,   // 20 * 380 
                TA: 2100,   // 5 * 420
                PM: 1500    // 3 * 500
            });
        });

        test('BEHAVIOR: Development phase uses special cost calculation with feature-specific rates', () => {
            const developmentPhase = {
                id: 'development',
                manDays: 25,
                effort: { G1: 10, G2: 80, TA: 5, PM: 5 }
            };

            // Mock feature suppliers with different rates
            mockConfigManager.getProjectConfig.mockReturnValue({
                suppliers: [
                    { id: 'sup2', realRate: 400 }
                ],
                internalResources: []
            });

            const result = phasesManager.calculateDevelopmentCosts(developmentPhase);

            // G2 cost uses feature-specific rates: (10+15) * 400 * 0.8 = 8000
            expect(result.G2).toBe(8000);
            
            // Other resources use normal calculation
            expect(result.G1).toBe(Math.round(2.5 * 450)); // 25 * 10% * 450
            expect(result.TA).toBe(Math.round(1.25 * 420)); // 25 * 5% * 420
            expect(result.PM).toBe(Math.round(1.25 * 500)); // 25 * 5% * 500
        });

        test('BEHAVIOR: Total calculations aggregate across all phases', () => {
            // Setup phases with known values
            phasesManager.currentPhases = [
                {
                    id: 'phase1',
                    manDays: 10,
                    effort: { G1: 50, G2: 50, TA: 0, PM: 0 }
                },
                {
                    id: 'phase2', 
                    manDays: 20,
                    effort: { G1: 0, G2: 0, TA: 70, PM: 30 }
                }
            ];

            const totals = phasesManager.calculateTotals();

            expect(totals.manDays).toBe(30);
            expect(totals.manDaysByResource.G1).toBe(5);  // 10 * 50%
            expect(totals.manDaysByResource.G2).toBe(5);  // 10 * 50%
            expect(totals.manDaysByResource.TA).toBe(14); // 20 * 70%
            expect(totals.manDaysByResource.PM).toBe(6);  // 20 * 30%
        });
    });

    describe('Phase Synchronization Behavior', () => {
        beforeEach(async () => {
            await phasesManager.init();
        });

        test('BEHAVIOR: syncToCurrentProject updates project phases structure', () => {
            phasesManager.currentPhases[0].manDays = 15;
            phasesManager.currentPhases[0].effort.G1 = 25;
            phasesManager.selectedSuppliers.G1 = 'sup1';

            phasesManager.syncToCurrentProject();

            expect(mockApp.currentProject.phases.functionalSpec).toEqual({
                manDays: 15,
                effort: { G1: 25, G2: 0, TA: 80, PM: 20 },
                lastModified: expect.any(String),
                calculated: false
            });

            expect(mockApp.currentProject.phases.selectedSuppliers).toEqual({
                G1: 'sup1', G2: null, TA: null, PM: null
            });
        });

        test('BEHAVIOR: synchronizeWithProject reloads phases from current project', () => {
            mockApp.currentProject.phases = {
                functionalSpec: { manDays: 8, effort: { G1: 10, G2: 10, TA: 60, PM: 20 } },
                selectedSuppliers: { G1: 'sup1', TA: 'int1' }
            };

            phasesManager.synchronizeWithProject();

            // Documents that phase data is reloaded
            const funcSpec = phasesManager.currentPhases.find(p => p.id === 'functionalSpec');
            expect(funcSpec.manDays).toBe(8);
            expect(funcSpec.effort.G1).toBe(10);

            // Documents that supplier selections are restored
            expect(phasesManager.selectedSuppliers.G1).toBe('sup1');
            expect(phasesManager.selectedSuppliers.TA).toBe('int1');

            // Documents that markDirty is called during sync
            expect(mockApp.markDirty).toHaveBeenCalled();
        });

        test('BEHAVIOR: clearSelectedSuppliers resets all supplier selections', () => {
            phasesManager.selectedSuppliers = { G1: 'sup1', G2: 'sup2', TA: 'int1', PM: 'int2' };

            phasesManager.clearSelectedSuppliers();

            expect(phasesManager.selectedSuppliers).toEqual({
                G1: null, G2: null, TA: null, PM: null
            });
        });

        test('BEHAVIOR: resetAllPhaseData performs complete phase reset', () => {
            // Setup modified state
            phasesManager.selectedSuppliers.G1 = 'sup1';
            phasesManager.currentPhases[0].manDays = 15;
            mockApp.currentProject.phases.selectedSuppliers = { G1: 'sup1' };

            phasesManager.resetAllPhaseData();

            // Documents complete reset
            expect(phasesManager.selectedSuppliers.G1).toBeNull();
            expect(phasesManager.currentPhases[0].manDays).toBe(0);
            expect(mockApp.currentProject.phases.selectedSuppliers).toBeUndefined();
        });
    });

    describe('UI Rendering and Interaction Behavior', () => {
        beforeEach(async () => {
            await phasesManager.init();
        });

        test('BEHAVIOR: Development notice shows feature count and coverage breakdown', () => {
            const container = document.querySelector('.phases-content');
            
            phasesManager.renderPhasesPage(container);

            const noticeHtml = phasesManager.renderDevelopmentNotice();
            
            expect(noticeHtml).toContain('2 features'); // From mockApp.currentProject.features
            expect(noticeHtml).toContain('Coverage: 5.0 days');
            expect(noticeHtml).toContain('Total: 30.0 days'); // 25 from features + 5 coverage
        });

        test('BEHAVIOR: Supplier dropdown filters by role and shows rates', () => {
            const availableSuppliers = [
                { id: 'sup1', name: 'G1 Supplier', department: 'Dev', role: 'G1', realRate: 450 },
                { id: 'sup2', name: 'G2 Supplier', department: 'Dev', role: 'G2', realRate: 400 },
                { id: 'int1', name: 'TA Resource', department: 'IT', role: 'TA', officialRate: 420 }
            ];

            const dropdownHtml = phasesManager.renderSupplierDropdown('G1', 'g1-supplier', availableSuppliers);

            // Documents role filtering - only G1 suppliers shown
            expect(dropdownHtml).toContain('G1 Supplier');
            expect(dropdownHtml).not.toContain('G2 Supplier');
            expect(dropdownHtml).not.toContain('TA Resource');

            // Documents rate display format
            expect(dropdownHtml).toContain('Dev - G1 Supplier (€450/day)');
        });

        test('BEHAVIOR: Phase table rows show readonly calculated-man-days for development phase', () => {
            const rowHtml = phasesManager.renderPhaseRows();

            // Development phase input should be readonly with tooltip
            expect(rowHtml).toContain('readonly class="calculated tooltip"');
            expect(rowHtml).toContain('data-tooltip="Calculated from features list"');
        });

        test('BEHAVIOR: Effort distribution validation shows visual indicators', () => {
            // Setup DOM elements for validation
            document.body.innerHTML += `
                <tr data-phase-id="functionalSpec">
                    <td></td>
                    <td></td>
                    <td><input class="effort-input" value="40" /></td>
                    <td><input class="effort-input" value="30" /></td>
                    <td><input class="effort-input" value="20" /></td>
                    <td><input class="effort-input" value="20" /></td>
                </tr>
            `;

            const phase = phasesManager.currentPhases.find(p => p.id === 'functionalSpec');
            phase.effort = { G1: 40, G2: 30, TA: 20, PM: 20 }; // Total: 110%

            phasesManager.validateEffortDistribution('functionalSpec');

            const effortInputs = document.querySelectorAll('.effort-input');
            
            // Documents error highlighting for totals over 100%
            expect(effortInputs[0]).toHaveClass('percentage-error');
        });
    });

    describe('Event Handling Behavior', () => {
        beforeEach(async () => {
            await phasesManager.init();
        });

        test('BEHAVIOR: Input changes trigger immediate calculations and sync', () => {
            phasesManager.updatePhaseCalculations = jest.fn();
            phasesManager.syncToCurrentProject = jest.fn();

            // Mock DOM input element
            const mockInput = {
                closest: jest.fn().mockReturnValue({
                    dataset: { phaseId: 'functionalSpec' }
                }),
                dataset: { field: 'manDays' },
                value: '15'
            };

            phasesManager.handleInputChange(mockInput);

            const phase = phasesManager.currentPhases.find(p => p.id === 'functionalSpec');
            expect(phase.manDays).toBe(15);
            expect(mockApp.markDirty).toHaveBeenCalled();
            expect(phasesManager.syncToCurrentProject).toHaveBeenCalled();
        });

        test('BEHAVIOR: Supplier selection updates rates and triggers recalculation', () => {
            phasesManager.updateCalculationsExceptDevelopment = jest.fn();
            phasesManager.syncToCurrentProject = jest.fn();

            const mockSelect = {
                dataset: { resource: 'G1' },
                value: 'sup1',
                querySelector: jest.fn().mockReturnValue({
                    dataset: { rate: '450' }
                })
            };

            phasesManager.handleSupplierChange(mockSelect);

            expect(phasesManager.selectedSuppliers.G1).toBe('sup1');
            expect(phasesManager.resourceRates.G1).toBe(450);
            expect(mockApp.markDirty).toHaveBeenCalled();
            expect(phasesManager.syncToCurrentProject).toHaveBeenCalled();
        });

        test('BEHAVIOR: Development phase excluded from supplier-driven recalculations', () => {
            phasesManager.updatePhaseCalculations = jest.fn();

            // Mock phases including development
            phasesManager.currentPhases = [
                { id: 'functionalSpec' },
                { id: 'development' },
                { id: 'sit' }
            ];

            phasesManager.updateCalculationsExceptDevelopment();

            // Documents that development phase is skipped
            expect(phasesManager.updatePhaseCalculations).toHaveBeenCalledWith('functionalSpec');
            expect(phasesManager.updatePhaseCalculations).toHaveBeenCalledWith('sit');
            expect(phasesManager.updatePhaseCalculations).not.toHaveBeenCalledWith('development');
        });
    });

    describe('Public Interface Methods', () => {
        beforeEach(async () => {
            await phasesManager.init();
        });

        test('BEHAVIOR: refreshFromFeatures triggers development recalculation and UI update', () => {
            phasesManager.calculateDevelopmentPhase = jest.fn();
            phasesManager.renderPhasesPage = jest.fn();
            
            // Mock DOM container
            document.body.innerHTML = '<div class="phases-configuration"><div class="parent"></div></div>';

            phasesManager.refreshFromFeatures();

            expect(phasesManager.calculateDevelopmentPhase).toHaveBeenCalled();
            expect(mockApp.markDirty).toHaveBeenCalled();
        });

        test('BEHAVIOR: getTotalProjectCost sums all resource costs across phases', () => {
            // Mock phases with known costs
            phasesManager.currentPhases = [
                { id: 'phase1', manDays: 10, effort: { G1: 100, G2: 0, TA: 0, PM: 0 } },
                { id: 'phase2', manDays: 5, effort: { G1: 0, G2: 100, TA: 0, PM: 0 } }
            ];

            const totalCost = phasesManager.getTotalProjectCost();
            
            // G1: 10 * 450 = 4500, G2: 5 * 380 = 1900, Total: 6400
            expect(totalCost).toBe(6400);
        });

        test('BEHAVIOR: getTotalProjectManDays sums all phase man days', () => {
            phasesManager.currentPhases = [
                { id: 'phase1', manDays: 10 },
                { id: 'phase2', manDays: 15 },
                { id: 'phase3', manDays: 8 }
            ];

            const totalManDays = phasesManager.getTotalProjectManDays();
            
            expect(totalManDays).toBe(33);
        });

        test('BEHAVIOR: getProjectPhases returns current phases array', () => {
            const phases = phasesManager.getProjectPhases();
            
            expect(phases).toBe(phasesManager.currentPhases);
            expect(phases).toHaveLength(8);
        });
    });

    describe('KNOWN BUGS - Documented Current Behavior', () => {
        beforeEach(async () => {
            await phasesManager.init();
        });

        test('BUG: updateTotals has complex DOM selector fallback logic that may fail', () => {
            const consoleSpy = jest.spyOn(console, 'log');
            
            // Remove totals row to trigger fallback behavior
            document.querySelectorAll('.phases-totals-row').forEach(el => el.remove());
            
            phasesManager.updateTotals();

            expect(consoleSpy).toHaveBeenCalledWith('Found totals row:', false);
            expect(consoleSpy).toHaveBeenCalledWith('Totals row not found in DOM, trying to regenerate...');
        });

        test('BUG: Development cost calculation assumes features have suppliers but doesnt validate', () => {
            mockApp.currentProject.features = [
                { id: 'F1', manDays: 10 } // Missing supplier property
            ];

            const developmentPhase = {
                id: 'development',
                manDays: 10,
                effort: { G1: 0, G2: 100, TA: 0, PM: 0 }
            };

            // This could cause issues if feature.supplier is undefined
            const result = phasesManager.calculateDevelopmentCosts(developmentPhase);
            
            // Documents that missing supplier results in 0 rate
            expect(result.G2).toBe(0);
        });

        test('BUG: Multiple setTimeout calls in phase management could cause timing issues', () => {
            jest.useFakeTimers();
            
            // These methods use setTimeout with different delays
            phasesManager.renderPhasesPage(document.createElement('div'));
            phasesManager.handleInputChange({
                closest: () => ({ dataset: { phaseId: 'test' }}),
                dataset: { field: 'manDays' },
                value: '10'
            });

            // Documents overlapping timeouts
            const timeoutCalls = jest.mocked(setTimeout).mock.calls;
            expect(timeoutCalls.length).toBeGreaterThan(1);
        });

        test('BUG: Phase validation exists but is never called during input handling', () => {
            const validationResult = phasesManager.validateAllPhases();
            
            // Documents that validation method exists and works
            expect(validationResult).toHaveProperty('isValid');
            expect(validationResult).toHaveProperty('errors');
            
            // But input handling doesn't use it - potential data integrity issue
            const mockInput = {
                closest: () => ({ dataset: { phaseId: 'test' }}),
                dataset: { field: 'manDays' },
                value: '-10' // Invalid negative value
            };
            
            // This should fail validation but won't because validation isn't called
            expect(() => phasesManager.handleInputChange(mockInput)).not.toThrow();
        });

        test('BUG: syncToCurrentProject doesnt ensure project phases structure exists', () => {
            mockApp.currentProject.phases = null;
            
            phasesManager.syncToCurrentProject();
            
            // Documents that method creates phases object but logs warning
            expect(mockApp.currentProject.phases).toBeDefined();
        });
    });
});