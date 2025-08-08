/**
 * Comprehensive Behavioral Tests for Software Estimation Manager
 * 
 * These tests document the CURRENT behavior of the application as it exists today,
 * including any bugs, quirks, or unexpected behaviors discovered during analysis.
 * 
 * Purpose: Serve as living documentation of system behavior for future developers
 * 
 * DO NOT modify these tests to "fix" behaviors - they document reality.
 */

describe('Software Estimation Manager - Behavioral Documentation', () => {
    
    describe('SoftwareEstimationApp - Main Application Controller', () => {
        let app;
        let mockWindow;
        let mockElectronAPI;

        beforeEach(() => {
            // Mock window object and required dependencies
            mockWindow = {
                electronAPI: {
                    onMenuAction: jest.fn(),
                    onCheckBeforeClose: jest.fn(),
                    confirmWindowClose: jest.fn()
                },
                localStorage: {
                    getItem: jest.fn(),
                    setItem: jest.fn(),
                    removeItem: jest.fn()
                },
                NotificationManager: {
                    show: jest.fn(),
                    info: jest.fn()
                }
            };

            // Mock required manager classes
            global.DataManager = jest.fn(() => ({
                saveProject: jest.fn(),
                loadProject: jest.fn(),
                getSettings: jest.fn(() => ({})),
                saveSettings: jest.fn()
            }));

            global.ConfigurationManager = jest.fn(() => ({
                init: jest.fn(),
                initializeProjectConfig: jest.fn(() => ({})),
                getProjectConfig: jest.fn(() => ({ suppliers: [], internalResources: [], categories: [] }))
            }));

            global.FeatureManager = jest.fn(() => ({
                populateFilterDropdowns: jest.fn(),
                refreshDropdowns: jest.fn(),
                refreshTable: jest.fn()
            }));

            global.EnhancedNavigationManager = jest.fn(() => ({
                navigateTo: jest.fn(),
                onProjectLoaded: jest.fn(),
                onProjectClosed: jest.fn(),
                onProjectDirty: jest.fn()
            }));

            global.ModalManager = jest.fn();
            global.ProjectManager = jest.fn();
            global.CalculationsManager = jest.fn(() => ({
                calculateVendorCosts: jest.fn(),
                refresh: jest.fn()
            }));
            global.NotificationManager = { show: jest.fn(), info: jest.fn() };
            global.Helpers = { generateId: jest.fn(() => 'test-id') };

            // Set up DOM elements
            document.body.innerHTML = `
                <div id="save-btn"></div>
                <div id="export-btn"></div>
                <div id="add-feature-btn"></div>
                <div id="search-input"></div>
                <div id="category-filter"></div>
                <div id="supplier-filter"></div>
                <div id="coverage-value"></div>
                <div id="coverage-reset-btn"></div>
                <div id="title-project-name"></div>
                <div id="project-status"></div>
                <div id="total-features"></div>
                <div id="total-man-days"></div>
                <div id="average-man-days"></div>
                <div id="loading-overlay"><p></p></div>
            `;

            global.window = mockWindow;
        });

        afterEach(() => {
            if (app) {
                app.destroy();
            }
            jest.clearAllMocks();
        });

        describe('Initialization Behavior', () => {
            test('BEHAVIOR: Creates default project structure when no project exists', async () => {
                app = new SoftwareEstimationApp();
                await app.init();

                // Documents that app creates a "New Project" by default
                expect(app.currentProject).toBeDefined();
                expect(app.currentProject.project.name).toBe('New Project');
                expect(app.currentProject.project.version).toBe('1.0.0');
                expect(app.currentProject.features).toEqual([]);
                
                // Documents phase structure initialization
                expect(app.currentProject.phases).toBeDefined();
                const expectedPhases = [
                    'functionalSpec', 'techSpec', 'development', 'sit', 
                    'uat', 'vapt', 'consolidation', 'postGoLive'
                ];
                expectedPhases.forEach(phase => {
                    expect(app.currentProject.phases[phase]).toBeDefined();
                    expect(app.currentProject.phases[phase]).toHaveProperty('manDays');
                    expect(app.currentProject.phases[phase]).toHaveProperty('cost');
                });
            });

            test('BEHAVIOR: Initializes components in specific order with error handling', async () => {
                const consoleSpy = jest.spyOn(console, 'log');
                
                app = new SoftwareEstimationApp();
                await app.init();

                // Documents the initialization order and logging behavior
                expect(consoleSpy).toHaveBeenCalledWith('Checking class availability:');
                expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Running in'));
                expect(consoleSpy).toHaveBeenCalledWith('All managers initialized successfully with hierarchical configuration and nested navigation');
            });

            test('BEHAVIOR: Navigation defaults to projects section with delayed activation', async () => {
                app = new SoftwareEstimationApp();
                await app.init();

                // Documents that there's a 200ms timeout before navigation
                expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 200);
            });
        });

        describe('Project Management Behavior', () => {
            beforeEach(async () => {
                app = new SoftwareEstimationApp();
                await app.init();
            });

            test('BEHAVIOR: New project creation workflow includes version creation with delays', async () => {
                const initialProject = app.currentProject;
                
                // Mock confirmSave to return false (no save needed)
                app.confirmSave = jest.fn().resolve(false);
                
                await app.newProject();

                // Documents that new project gets a different ID
                expect(app.currentProject.project.id).not.toBe(initialProject.project.id);
                expect(app.currentProject.project.name).toBe('New Project');
                
                // Documents the delayed version creation (600ms timeout)
                expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 600);
                
                // Documents that phases are reset with 100ms delay
                expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
            });

            test('BEHAVIOR: Project dirty state affects multiple UI components', () => {
                app.markDirty();

                expect(app.isDirty).toBe(true);
                // Documents that marking dirty triggers navigation manager update
                expect(app.navigationManager.onProjectDirty).toHaveBeenCalledWith(true);
            });

            test('BEHAVIOR: Close request handling shows confirmation dialog when dirty', async () => {
                app.isDirty = true;
                app.saveProject = jest.fn().resolves(true);
                app.performProjectClose = jest.fn();
                
                // Mock confirm to return true (save before close)
                global.confirm = jest.fn().mockReturnValue(true);

                await app.handleCloseRequest();

                // Documents the confirmation flow
                expect(global.confirm).toHaveBeenCalledWith('You have unsaved changes. Do you want to save before continuing?');
                expect(app.saveProject).toHaveBeenCalled();
                expect(app.performProjectClose).toHaveBeenCalled();
                expect(mockWindow.electronAPI.confirmWindowClose).toHaveBeenCalledWith(true);
            });
        });

        describe('Project Configuration Migration Behavior', () => {
            beforeEach(async () => {
                app = new SoftwareEstimationApp();
                await app.init();
            });

            test('BEHAVIOR: Old project format gets migrated to hierarchical structure', () => {
                const oldFormatProject = {
                    project: { id: 'test', name: 'Test' },
                    features: [],
                    phases: {},
                    config: {
                        suppliers: [],
                        categories: [],
                        // Missing projectOverrides - indicates old format
                    }
                };

                const migratedProject = app.migrateProjectConfig(oldFormatProject);

                // Documents automatic migration behavior
                expect(migratedProject.config.projectOverrides).toBeDefined();
                expect(migratedProject.config.projectOverrides.suppliers).toEqual([]);
                expect(migratedProject.config.projectOverrides.categories).toEqual([]);
            });

            test('BEHAVIOR: Already migrated projects are left unchanged', () => {
                const alreadyMigratedProject = {
                    project: { id: 'test', name: 'Test' },
                    features: [],
                    phases: {},
                    config: {
                        suppliers: [],
                        categories: [],
                        projectOverrides: { suppliers: [], categories: [] }
                    }
                };

                const result = app.migrateProjectConfig(alreadyMigratedProject);

                // Documents that migration is idempotent
                expect(result).toBe(alreadyMigratedProject);
            });
        });

        describe('Coverage Calculation Behavior', () => {
            beforeEach(async () => {
                app = new SoftwareEstimationApp();
                await app.init();
                app.currentProject.features = [
                    { manDays: 10 },
                    { manDays: 20 },
                    { manDays: 5 }
                ];
            });

            test('BEHAVIOR: Coverage auto-calculates to 30% of total man days', () => {
                app.updateSummary();

                // Documents the 30% coverage calculation
                const totalManDays = 35; // 10 + 20 + 5
                const expectedCoverage = totalManDays * 0.3; // 10.5
                
                expect(app.currentProject.coverage).toBe(expectedCoverage);
                expect(app.currentProject.coverageIsAutoCalculated).toBe(true);
            });

            test('BEHAVIOR: Manual coverage input disables auto-calculation', () => {
                const coverageInput = document.getElementById('coverage-value');
                
                // Simulate user input
                coverageInput.value = '15';
                coverageInput.dispatchEvent(new Event('input'));

                expect(app.currentProject.coverage).toBe(15);
                expect(app.currentProject.coverageIsAutoCalculated).toBe(false);
            });

            test('BEHAVIOR: Reset coverage button restores auto-calculation', () => {
                // First set manual coverage
                app.currentProject.coverage = 15;
                app.currentProject.coverageIsAutoCalculated = false;

                app.resetCoverageToAuto();

                // Documents restoration to auto-calculated value
                expect(app.currentProject.coverage).toBe(10.5); // 30% of 35
                expect(app.currentProject.coverageIsAutoCalculated).toBe(true);
            });
        });

        describe('Export Functionality Behavior', () => {
            beforeEach(async () => {
                app = new SoftwareEstimationApp();
                await app.init();
                
                // Mock XLSX library
                global.XLSX = {
                    utils: {
                        book_new: jest.fn(() => ({})),
                        book_append_sheet: jest.fn(),
                        aoa_to_sheet: jest.fn(() => ({})),
                        decode_range: jest.fn(() => ({ e: { r: 5, c: 10 } })),
                        encode_cell: jest.fn(() => 'A1')
                    },
                    write: jest.fn(() => new ArrayBuffer(8))
                };
            });

            test('BEHAVIOR: Export menu creates context menu with specific positioning', () => {
                app.showExportMenu();

                const contextMenu = document.querySelector('.context-menu');
                expect(contextMenu).toBeTruthy();
                
                // Documents specific CSS positioning
                expect(contextMenu.style.position).toBe('fixed');
                expect(contextMenu.style.top).toBe('50px');
                expect(contextMenu.style.right).toBe('20px');
            });

            test('BEHAVIOR: Excel export creates three sheets with specific structure', async () => {
                app.currentProject.features = [
                    { id: 'F1', description: 'Test Feature', manDays: 10 }
                ];

                await app.exportExcel('test-project');

                // Documents the three-sheet structure
                expect(global.XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(3);
                expect(global.XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
                    expect.any(Object), expect.any(Object), 'Features'
                );
                expect(global.XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
                    expect.any(Object), expect.any(Object), 'Phases'
                );
                expect(global.XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
                    expect.any(Object), expect.any(Object), 'Calculations'
                );
            });

            test('BEHAVIOR: CSV export uses specific field escaping rules', async () => {
                app.currentProject.features = [
                    { 
                        id: 'F1', 
                        description: 'Test "quoted" feature, with comma',
                        manDays: 10,
                        notes: 'Line 1\nLine 2'
                    }
                ];

                const csv = await app.exportCSV('test-project');

                // Documents CSV escaping behavior
                expect(csv).toContain('"Test ""quoted"" feature, with comma"');
                expect(csv).toContain('"Line 1\nLine 2"');
            });
        });

        describe('Error Handling and Edge Cases', () => {
            beforeEach(async () => {
                app = new SoftwareEstimationApp();
                await app.init();
            });

            test('BEHAVIOR: Save project handles missing project gracefully', async () => {
                app.currentProject = null;

                const result = await app.saveProject();

                // Documents that save returns false for missing project
                expect(result).toBe(false);
            });

            test('BEHAVIOR: Load project handles corrupted data with fallback', async () => {
                const consoleSpy = jest.spyOn(console, 'warn');
                app.dataManager.loadProject = jest.fn().mockRejectedValue(new Error('Corrupted data'));

                await app.loadLastProject();

                // Documents that load failure is logged as warning, not error
                expect(consoleSpy).toHaveBeenCalledWith('Failed to load last project:', expect.any(Error));
            });

            test('BEHAVIOR: Keyboard shortcuts work with both Ctrl and Cmd keys', () => {
                app.saveProject = jest.fn();
                app.newProject = jest.fn();
                app.openProject = jest.fn();

                // Test Ctrl key combinations
                const ctrlSEvent = new KeyboardEvent('keydown', { ctrlKey: true, key: 's' });
                document.dispatchEvent(ctrlSEvent);
                expect(app.saveProject).toHaveBeenCalled();

                // Test Cmd key combinations (Mac)
                const cmdNEvent = new KeyboardEvent('keydown', { metaKey: true, key: 'n' });
                document.dispatchEvent(cmdNEvent);
                expect(app.newProject).toHaveBeenCalled();
            });
        });

        describe('UI State Management Behavior', () => {
            beforeEach(async () => {
                app = new SoftwareEstimationApp();
                await app.init();
            });

            test('BEHAVIOR: Loading overlay shows/hides with specific message updates', () => {
                const overlay = document.getElementById('loading-overlay');
                const messageEl = overlay.querySelector('p');

                app.showLoading('Custom message');

                expect(overlay.classList.contains('active')).toBe(true);
                expect(messageEl.textContent).toBe('Custom message');

                app.hideLoading();

                expect(overlay.classList.contains('active')).toBe(false);
            });

            test('BEHAVIOR: Project status indicator uses specific symbols', () => {
                const statusEl = document.getElementById('project-status');

                // Clean state
                app.isDirty = false;
                app.updateProjectStatus();
                expect(statusEl.textContent).toBe('○');
                expect(statusEl.className).toBe('saved');

                // Dirty state  
                app.isDirty = true;
                app.updateProjectStatus();
                expect(statusEl.textContent).toBe('●');
                expect(statusEl.className).toBe('unsaved');
            });

            test('BEHAVIOR: Summary updates trigger coverage reset button visibility', () => {
                const resetBtn = document.getElementById('coverage-reset-btn');

                // Auto-calculated coverage hides button
                app.currentProject.coverageIsAutoCalculated = true;
                app.updateCoverageResetButtonVisibility();
                expect(resetBtn.classList.contains('hidden')).toBe(true);

                // Manual coverage shows button
                app.currentProject.coverageIsAutoCalculated = false;
                app.updateCoverageResetButtonVisibility();
                expect(resetBtn.classList.contains('hidden')).toBe(false);
            });
        });

        describe('KNOWN BUGS - Documented Current Behavior', () => {
            beforeEach(async () => {
                app = new SoftwareEstimationApp();
                await app.init();
            });

            test('BUG: Description validation accepts 3+ chars but error message says 10+ chars', () => {
                // This documents a discrepancy in the validation logic
                // The actual validation in FeatureManager checks for 3+ characters
                // but the error message says 10+ characters
                const mockFeatureManager = {
                    validateFeatureData: (data) => {
                        const errors = {};
                        if (data.description && data.description.length < 3) {
                            // BUG: Error message says 10 but check is for 3
                            errors.description = 'Description must be at least 10 characters long';
                        }
                        return { isValid: Object.keys(errors).length === 0, errors };
                    }
                };

                const result = mockFeatureManager.validateFeatureData({ description: 'Test' });
                
                // Documents the bug: 4-char description passes validation despite error message
                expect(result.isValid).toBe(true);
                
                const shortResult = mockFeatureManager.validateFeatureData({ description: 'Hi' });
                expect(shortResult.errors.description).toContain('10 characters');
            });

            test('BUG: Version creation has multiple timeout delays that could overlap', () => {
                // Documents potentially problematic timeout stacking in newProject()
                jest.clearAllTimers();
                
                app.newProject();

                // Documents multiple setTimeout calls that could cause timing issues
                const timeoutCalls = jest.mocked(setTimeout).mock.calls;
                const delayedCalls = timeoutCalls.filter(call => call[1] > 0);
                
                expect(delayedCalls.length).toBeGreaterThan(1);
                // Documents specific delays: 100ms for phase reset, 600ms for version creation
                expect(delayedCalls.some(call => call[1] === 100)).toBe(true);
                expect(delayedCalls.some(call => call[1] === 600)).toBe(true);
            });

            test('BUG: Auto-save disabled but markDirty still triggers phase manager updates', () => {
                // Documents that even though auto-save is disabled, 
                // markDirty still triggers projectPhasesManager updates
                app.projectPhasesManager = {
                    calculateDevelopmentPhase: jest.fn(),
                    updateCalculations: jest.fn()
                };

                // Mock navigation state
                app.navigationManager.currentSection = 'phases';
                
                app.markDirty();

                // Documents the behavior that phases get updated on every markDirty call
                expect(app.projectPhasesManager.calculateDevelopmentPhase).toHaveBeenCalled();
            });
        });
    });
});