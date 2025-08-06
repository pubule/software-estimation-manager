/**
 * VersionManager Behavioral Tests
 * 
 * Documents the current behavior of the VersionManager class including:
 * - Version creation, comparison, and restoration workflows
 * - Project snapshot management and checksum validation
 * - Version filtering and display logic
 * - Version history management with cleanup functionality
 * - Integration with main application state management
 */

describe('VersionManager - Behavioral Documentation', () => {
    let versionManager;
    let mockApp;

    beforeEach(() => {
        // Mock main application
        mockApp = {
            currentProject: {
                project: { id: 'test-project', name: 'Test Project', version: '1.0.0' },
                features: [
                    { id: 'F1', description: 'Feature 1', manDays: 10 },
                    { id: 'F2', description: 'Feature 2', manDays: 15 }
                ],
                phases: {
                    development: { manDays: 25, cost: 10000 },
                    testing: { manDays: 10, cost: 4000 }
                },
                coverage: 5,
                versions: []
            },
            calculationsManager: {
                calculateVendorCosts: jest.fn(),
                calculateKPIs: jest.fn()
            }
        };

        // Setup DOM structure
        document.body.innerHTML = `
            <div class="history-content"></div>
            <button id="create-version-btn"></button>
            <button id="import-version-btn"></button>
            <button id="cleanup-versions-btn"></button>
            <input id="reason-search" />
            <select id="date-range">
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
            </select>
        `;

        // Mock modal manager
        global.ModalManager = {
            show: jest.fn(),
            hide: jest.fn()
        };

        global.NotificationManager = {
            show: jest.fn()
        };

        versionManager = new VersionManager(mockApp);
    });

    afterEach(() => {
        jest.clearAllMocks();
        if (versionManager) {
            // Cleanup event listeners
            document.removeEventListener('keydown', versionManager.boundHandlers.keyboardShortcuts);
        }
    });

    describe('Version Manager Initialization Behavior', () => {
        test('BEHAVIOR: Initializes with default settings and bounded event handlers', () => {
            expect(versionManager.app).toBe(mockApp);
            expect(versionManager.currentVersions).toEqual([]);
            expect(versionManager.maxVersions).toBe(50);
            expect(versionManager.maxFileSize).toBe(10 * 1024 * 1024); // 10MB

            // Documents bounded handlers for proper cleanup
            expect(versionManager.boundHandlers).toHaveProperty('createVersion');
            expect(versionManager.boundHandlers).toHaveProperty('viewVersion');
            expect(versionManager.boundHandlers).toHaveProperty('compareVersion');
            expect(versionManager.boundHandlers).toHaveProperty('restoreVersion');
        });

        test('BEHAVIOR: Loads versions from current project during initialization', () => {
            const existingVersions = [
                { id: 'V1', reason: 'Initial version', timestamp: '2024-01-01' }
            ];
            mockApp.currentProject.versions = existingVersions;

            const newVersionManager = new VersionManager(mockApp);

            expect(newVersionManager.currentVersions).toEqual(existingVersions);
        });

        test('BEHAVIOR: Keyboard shortcuts are registered globally', () => {
            const keydownListenerSpy = jest.spyOn(document, 'addEventListener');
            
            new VersionManager(mockApp);

            expect(keydownListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        });
    });

    describe('Version Creation and Management Behavior', () => {
        test('BEHAVIOR: createProjectSnapshot captures comprehensive project state', () => {
            const snapshot = versionManager.createProjectSnapshot();

            // Documents snapshot structure
            expect(snapshot).toHaveProperty('project');
            expect(snapshot).toHaveProperty('features');
            expect(snapshot).toHaveProperty('phases');
            expect(snapshot).toHaveProperty('coverage');
            expect(snapshot).toHaveProperty('timestamp');

            // Documents deep cloning of project data
            expect(snapshot.features).toHaveLength(2);
            expect(snapshot.features).not.toBe(mockApp.currentProject.features);
            expect(snapshot.project.name).toBe('Test Project');
        });

        test('BEHAVIOR: Version ID generation follows V + incrementing number pattern', () => {
            // Empty versions array
            let nextId = versionManager.generateVersionId();
            expect(nextId).toBe('V1');

            // Existing versions
            versionManager.currentVersions = [
                { id: 'V1' },
                { id: 'V3' }, // Skip V2 to test max finding
                { id: 'V2' }
            ];

            nextId = versionManager.generateVersionId();
            expect(nextId).toBe('V4'); // Next after highest existing
        });

        test('BEHAVIOR: Checksum generation uses JSON string hash for data integrity', () => {
            const testData = { features: [{ id: 'F1', manDays: 10 }] };
            
            const checksum1 = versionManager.generateChecksum(testData);
            const checksum2 = versionManager.generateChecksum(testData);
            
            // Documents consistent checksum generation
            expect(checksum1).toBe(checksum2);
            expect(typeof checksum1).toBe('string');
            expect(checksum1).toMatch(/^[0-9a-f]+$/); // Hex format
            
            // Different data produces different checksum
            const differentData = { features: [{ id: 'F1', manDays: 20 }] };
            const differentChecksum = versionManager.generateChecksum(differentData);
            expect(differentChecksum).not.toBe(checksum1);
        });

        test('BEHAVIOR: createVersion adds to project versions array and triggers calculations', async () => {
            const reason = 'Test version creation';
            
            await versionManager.createVersion(reason);

            // Documents version addition
            expect(mockApp.currentProject.versions).toHaveLength(1);
            const createdVersion = mockApp.currentProject.versions[0];
            
            expect(createdVersion.id).toBe('V1');
            expect(createdVersion.reason).toBe(reason);
            expect(createdVersion.projectSnapshot).toBeDefined();
            expect(createdVersion.checksum).toBeDefined();
            expect(createdVersion.timestamp).toBeDefined();

            // Documents that calculations are triggered before snapshot
            expect(mockApp.calculationsManager.calculateVendorCosts).toHaveBeenCalled();
            expect(mockApp.calculationsManager.calculateKPIs).toHaveBeenCalled();
        });

        test('BEHAVIOR: Version limit enforcement deletes oldest version when exceeded', async () => {
            // Create versions up to limit
            versionManager.maxVersions = 3;
            await versionManager.createVersion('Version 1');
            await versionManager.createVersion('Version 2');
            await versionManager.createVersion('Version 3');

            expect(mockApp.currentProject.versions).toHaveLength(3);

            // Create one more to trigger cleanup
            await versionManager.createVersion('Version 4');

            // Documents oldest version removal
            expect(mockApp.currentProject.versions).toHaveLength(3);
            const versionIds = mockApp.currentProject.versions.map(v => v.id);
            expect(versionIds).toContain('V2'); // V1 removed
            expect(versionIds).toContain('V3');
            expect(versionIds).toContain('V4');
        });

        test('BEHAVIOR: updateCurrentVersion modifies latest version instead of creating new one', async () => {
            // Create initial version
            await versionManager.createVersion('Initial version');
            const originalTimestamp = mockApp.currentProject.versions[0].timestamp;

            // Modify project state
            mockApp.currentProject.features.push({ id: 'F3', manDays: 5 });

            // Update current version
            await versionManager.updateCurrentVersion();

            // Documents in-place update behavior
            expect(mockApp.currentProject.versions).toHaveLength(1);
            const updatedVersion = mockApp.currentProject.versions[0];
            expect(updatedVersion.projectSnapshot.features).toHaveLength(3);
            expect(updatedVersion.lastUpdated).toBeDefined();
            expect(updatedVersion.timestamp).toBe(originalTimestamp); // Original timestamp preserved
        });
    });

    describe('Version Display and Filtering Behavior', () => {
        beforeEach(() => {
            // Setup test versions
            versionManager.currentVersions = [
                {
                    id: 'V1',
                    reason: 'Initial development',
                    timestamp: '2024-01-01T10:00:00Z',
                    projectSnapshot: { features: [{ manDays: 10 }], phases: {} }
                },
                {
                    id: 'V2',
                    reason: 'Bug fixes',
                    timestamp: '2024-01-02T10:00:00Z',
                    projectSnapshot: { features: [{ manDays: 15 }], phases: {} }
                },
                {
                    id: 'V3',
                    reason: 'Feature additions',
                    timestamp: '2024-01-03T10:00:00Z',
                    projectSnapshot: { features: [{ manDays: 20 }], phases: {} }
                }
            ];
        });

        test('BEHAVIOR: getCurrentVersion returns highest version number', () => {
            const currentVersion = versionManager.getCurrentVersion();
            expect(currentVersion).toBe('V3');

            // Test with empty versions
            versionManager.currentVersions = [];
            expect(versionManager.getCurrentVersion()).toBe('No Versions');
        });

        test('BEHAVIOR: Version statistics calculation includes features, man days, and phases', () => {
            const snapshot = {
                features: [
                    { manDays: 10.5 },
                    { manDays: 15.3 },
                    { manDays: 'invalid' } // Test invalid data handling
                ],
                phases: { dev: {}, test: {}, deploy: {} },
                coverage: 5
            };

            const stats = versionManager.calculateVersionStats(snapshot);

            expect(stats).toEqual({
                features: 3,
                totalMDs: '25.8', // 10.5 + 15.3, invalid excluded
                phases: 3,
                coverage: 5
            });
        });

        test('BEHAVIOR: Version filtering supports reason search and date ranges', () => {
            // Test reason filtering
            versionManager.currentFilters.reason = 'bug';
            let filtered = versionManager.getFilteredVersions();
            expect(filtered).toHaveLength(1);
            expect(filtered[0].reason).toContain('Bug fixes');

            // Test date range filtering (today)
            versionManager.currentFilters.reason = '';
            versionManager.currentFilters.dateRange = 'today';
            
            // Mock current date to be 2024-01-02
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-02T15:00:00Z'));
            
            filtered = versionManager.getFilteredVersions();
            expect(filtered).toHaveLength(1); // Only V2 from today
            
            jest.useRealTimers();
        });

        test('BEHAVIOR: Filtered versions are sorted by version number descending', () => {
            const filtered = versionManager.getFilteredVersions();
            
            const versionNumbers = filtered.map(v => parseInt(v.id.substring(1)));
            expect(versionNumbers).toEqual([3, 2, 1]); // Descending order
        });

        test('BEHAVIOR: Version table rendering includes current version badge and conditional buttons', () => {
            mockApp.currentProject.versions = versionManager.currentVersions;
            
            const container = document.querySelector('.history-content');
            versionManager.render();

            const versionsTable = versionManager.renderVersionsTable();
            
            // Documents current version highlighting
            expect(versionsTable).toContain('current-version');
            expect(versionsTable).toContain('LIVE');
            
            // Documents conditional button rendering
            expect(versionsTable).toContain('restore-btn'); // For non-current versions
            expect(versionsTable).toContain('delete-btn');  // For non-current versions
            
            // Current version shouldn't have restore/delete buttons
            const currentVersionRow = versionsTable.match(/data-version-id="V3"[\s\S]*?<\/tr>/)[0];
            expect(currentVersionRow).not.toContain('restore-btn');
            expect(currentVersionRow).not.toContain('delete-btn');
        });
    });

    describe('Version Actions and Event Handling', () => {
        test('BEHAVIOR: Keyboard shortcuts trigger specific actions', () => {
            versionManager.showCreateVersionModal = jest.fn();
            mockApp.navigationManager = { navigateTo: jest.fn() };

            // Test Ctrl+Shift+V for version creation
            const createVersionEvent = new KeyboardEvent('keydown', {
                ctrlKey: true,
                shiftKey: true,
                key: 'V'
            });
            versionManager.handleKeyboardShortcuts(createVersionEvent);
            expect(versionManager.showCreateVersionModal).toHaveBeenCalled();

            // Test Ctrl+Shift+H for history navigation  
            const historyEvent = new KeyboardEvent('keydown', {
                ctrlKey: true,
                shiftKey: true,
                key: 'H'
            });
            versionManager.handleKeyboardShortcuts(historyEvent);
            expect(mockApp.navigationManager.navigateTo).toHaveBeenCalledWith('history');
        });

        test('BEHAVIOR: Event listeners are attached with proper element queries', () => {
            const container = document.querySelector('.history-content');
            versionManager.render();

            // Mock element query methods
            const createBtn = document.getElementById('create-version-btn');
            const addEventListenerSpy = jest.spyOn(createBtn, 'addEventListener');

            versionManager.attachEventListeners();

            expect(addEventListenerSpy).toHaveBeenCalledWith('click', versionManager.boundHandlers.createVersion);
        });

        test('BEHAVIOR: Filter input changes trigger immediate table updates', () => {
            versionManager.updateTable = jest.fn();
            versionManager.attachEventListeners();

            const reasonSearch = document.getElementById('reason-search');
            reasonSearch.value = 'test search';
            reasonSearch.dispatchEvent(new Event('input'));

            expect(versionManager.currentFilters.reason).toBe('test search');
            expect(versionManager.updateTable).toHaveBeenCalled();
        });

        test('BEHAVIOR: Version manager exposes itself globally for onclick handlers', () => {
            versionManager.attachEventListeners();

            expect(window.versionManager).toBe(versionManager);
        });
    });

    describe('Project Integration Behavior', () => {
        test('BEHAVIOR: onProjectChanged resets versions and updates title bar', () => {
            const newProject = {
                versions: [
                    { id: 'V1', reason: 'New project version' }
                ]
            };

            versionManager.updateTitleBar = jest.fn();
            versionManager.ensureVersionsArray = jest.fn();

            versionManager.onProjectChanged(newProject);

            expect(versionManager.ensureVersionsArray).toHaveBeenCalledWith(newProject);
            expect(versionManager.currentVersions).toEqual(newProject.versions);
            expect(versionManager.updateTitleBar).toHaveBeenCalled();
        });

        test('BEHAVIOR: Null project clears version history', () => {
            versionManager.currentVersions = [{ id: 'V1' }];

            versionManager.onProjectChanged(null);

            expect(versionManager.currentVersions).toEqual([]);
        });

        test('BEHAVIOR: ensureVersionsArray creates versions array if missing', () => {
            const project = {};
            
            versionManager.ensureVersionsArray(project);

            expect(project.versions).toEqual([]);
        });

        test('BEHAVIOR: Version header shows warning when approaching limit', () => {
            // Setup versions near limit
            versionManager.maxVersions = 10;
            versionManager.currentVersions = new Array(8).fill(0).map((_, i) => ({ id: `V${i+1}` }));

            const headerHtml = versionManager.renderVersionHistoryHeader();

            // Documents warning at 80% of limit (8/10 = 80%)
            expect(headerHtml).toContain('version-warning-text');
            expect(headerHtml).toContain('Approaching limit');
        });
    });

    describe('Validation and Error Handling Behavior', () => {
        test('BEHAVIOR: Version validation compares checksums for data integrity', () => {
            const validVersion = {
                projectSnapshot: { features: [{ id: 'F1' }] },
                checksum: versionManager.generateChecksum({ features: [{ id: 'F1' }] })
            };

            const invalidVersion = {
                projectSnapshot: { features: [{ id: 'F1' }] },
                checksum: 'invalid-checksum'
            };

            expect(versionManager.validateVersion(validVersion)).toBe(true);
            expect(versionManager.validateVersion(invalidVersion)).toBe(false);
        });

        test('BEHAVIOR: updateCurrentVersion handles missing project gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'warn');
            versionManager.app.currentProject = null;

            await versionManager.updateCurrentVersion();

            expect(consoleSpy).toHaveBeenCalledWith('No project loaded, cannot update current version');
        });

        test('BEHAVIOR: updateCurrentVersion skips if no versions exist', async () => {
            versionManager.currentVersions = [];

            await versionManager.updateCurrentVersion();

            // Should return early without creating version
            expect(mockApp.currentProject.versions).toHaveLength(0);
        });

        test('BEHAVIOR: Error handling in updateCurrentVersion logs and rethrows', async () => {
            const consoleSpy = jest.spyOn(console, 'error');
            
            // Create a version first
            await versionManager.createVersion('Test');
            
            // Mock error during snapshot creation
            versionManager.createProjectSnapshot = jest.fn(() => {
                throw new Error('Snapshot creation failed');
            });

            await expect(versionManager.updateCurrentVersion()).rejects.toThrow('Snapshot creation failed');
            expect(consoleSpy).toHaveBeenCalledWith('Failed to update current version:', expect.any(Error));
        });
    });

    describe('Utility Functions Behavior', () => {
        test('BEHAVIOR: Date formatting uses locale-specific format', () => {
            const isoDate = '2024-01-15T14:30:00Z';
            
            const formatted = versionManager.formatDate(isoDate);
            
            expect(typeof formatted).toBe('string');
            expect(formatted.length).toBeGreaterThan(10); // Some reasonable formatted length
        });

        test('BEHAVIOR: Text truncation adds ellipsis for long text', () => {
            const longText = 'This is a very long reason that exceeds the maximum display length';
            
            const truncated = versionManager.truncateText(longText, 20);
            
            expect(truncated).toBe('This is a very long ...');
            expect(truncated.length).toBe(23); // 20 + 3 for ellipsis
            
            // Short text remains unchanged
            const shortText = 'Short';
            expect(versionManager.truncateText(shortText, 20)).toBe('Short');
        });

        test('BEHAVIOR: Version stats rendering uses specific icons and formatting', () => {
            const version = {
                projectSnapshot: {
                    features: [{ manDays: 10 }, { manDays: 15 }],
                    phases: { dev: {}, test: {} }
                }
            };

            const statsHtml = versionManager.renderVersionStats(version);

            // Documents specific icon usage and formatting
            expect(statsHtml).toContain('2 <i class="fas fa-list"></i>'); // Features count
            expect(statsHtml).toContain('25.0 <i class="fas fa-clock"></i>'); // Total MDs
            expect(statsHtml).toContain('2 <i class="fas fa-project-diagram"></i>'); // Phases count
        });
    });

    describe('KNOWN BUGS - Documented Current Behavior', () => {
        test('BUG: Version ID parsing assumes V prefix but doesnt validate format', () => {
            // This could fail if version IDs have different formats
            versionManager.currentVersions = [
                { id: 'invalid-format-123' }
            ];

            expect(() => {
                versionManager.getCurrentVersion();
            }).not.toThrow(); // Currently doesn't validate, could cause NaN

            const result = versionManager.getCurrentVersion();
            // parseInt('nvalid-format-123'.substring(1)) = NaN
            // This could cause issues in version comparison logic
        });

        test('BUG: createVersion doesnt validate project state before snapshot creation', async () => {
            // Malformed project could cause snapshot issues
            mockApp.currentProject.features = 'not an array';

            // This should ideally validate the project structure first
            await expect(versionManager.createVersion('Test')).not.toThrow();
        });

        test('BUG: checksum generation could produce same result for different objects', () => {
            // Simple string hash could have collisions
            const data1 = { a: '12', b: '3' };
            const data2 = { a: '1', b: '23' };
            
            // Both could produce same string representation depending on JSON.stringify order
            // The simple hash function is vulnerable to collisions
            const checksum1 = versionManager.generateChecksum(data1);
            const checksum2 = versionManager.generateChecksum(data2);
            
            // Documents potential for hash collisions
            expect(typeof checksum1).toBe('string');
            expect(typeof checksum2).toBe('string');
        });

        test('BUG: Filter date range calculations use local time but versions use ISO strings', () => {
            // Date range filtering uses local timezone
            versionManager.currentFilters.dateRange = 'today';
            
            // Version timestamp is ISO string (UTC)
            versionManager.currentVersions = [
                { id: 'V1', timestamp: '2024-01-01T23:00:00Z', reason: 'Test' }
            ];

            // This could cause timezone-related filtering issues
            // Local "today" might not match UTC timestamp dates
            const filtered = versionManager.getFilteredVersions();
            
            // The behavior depends on user's timezone which could be inconsistent
        });

        test('BUG: attachEventListeners calls updateTable method but its not defined', () => {
            // The method calls this.updateTable() but the method doesn't exist
            versionManager.attachEventListeners();

            const reasonSearch = document.getElementById('reason-search');
            reasonSearch.value = 'test';
            
            expect(() => {
                reasonSearch.dispatchEvent(new Event('input'));
            }).toThrow(); // updateTable is not defined
        });

        test('BUG: Version limit cleanup removes oldest without considering importance', () => {
            // No logic to preserve important versions (milestones, releases, etc.)
            versionManager.maxVersions = 2;

            // Create important versions
            mockApp.currentProject.versions = [
                { id: 'V1', reason: 'MILESTONE: First Release', timestamp: '2024-01-01' },
                { id: 'V2', reason: 'Bug fix', timestamp: '2024-01-02' }
            ];
            versionManager.currentVersions = mockApp.currentProject.versions;

            // This will remove the milestone version
            versionManager.createVersion('Minor change').then(() => {
                // Important V1 milestone gets deleted despite its significance
                const remainingReasons = mockApp.currentProject.versions.map(v => v.reason);
                expect(remainingReasons).not.toContain('MILESTONE: First Release');
            });
        });
    });
});