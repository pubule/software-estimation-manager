/**
 * DataManager Behavioral Tests
 * 
 * Documents the current behavior of the DataManager class including:
 * - File system operations with Electron API fallback
 * - Project data validation logic
 * - CSV generation behavior 
 * - Storage mechanisms and error handling
 */

describe('DataManager - Behavioral Documentation', () => {
    let dataManager;
    let mockElectronAPI;

    beforeEach(() => {
        // Mock localStorage
        const localStorageMock = {
            storage: new Map(),
            getItem: jest.fn((key) => localStorageMock.storage.get(key) || null),
            setItem: jest.fn((key, value) => localStorageMock.storage.set(key, value)),
            removeItem: jest.fn((key) => localStorageMock.storage.delete(key)),
            key: jest.fn((index) => Array.from(localStorageMock.storage.keys())[index] || null),
            get length() { return localStorageMock.storage.size; }
        };

        // Create fresh mock for each test
        mockElectronAPI = {
            saveProjectFile: jest.fn(),
            loadProjectFile: jest.fn(),
            listProjects: jest.fn(),
            deleteProjectFile: jest.fn(),
            getSettings: jest.fn(),
            saveSettings: jest.fn(),
            getProjectsPath: jest.fn(),
            setProjectsPath: jest.fn(),
            chooseProjectsFolder: jest.fn(),
            openProjectsFolder: jest.fn()
        };

        // Set up mocks globally
        global.localStorage = localStorageMock;
        window.localStorage = localStorageMock;
        global.window.electronAPI = mockElectronAPI;

        dataManager = new DataManager();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Project Data Validation Behavior', () => {
        test('BEHAVIOR: Validates required top-level project structure', () => {
            const validProject = {
                project: { id: 'test-id', name: 'Test Project' },
                features: [],
                phases: {},
                config: {}
            };

            expect(() => dataManager.validateProjectData(validProject)).not.toThrow();
        });

        test('BEHAVIOR: Throws specific error messages for missing required properties', () => {
            const invalidProject = {
                project: { id: 'test-id', name: 'Test Project' },
                features: []
                // Missing phases and config
            };

            expect(() => dataManager.validateProjectData(invalidProject))
                .toThrow("Invalid project data: missing required property 'phases'");

            // Test missing config
            const missingConfig = { ...invalidProject, phases: {} };
            expect(() => dataManager.validateProjectData(missingConfig))
                .toThrow("Invalid project data: missing required property 'config'");
        });

        test('BEHAVIOR: Validates project metadata requires both id and name', () => {
            const missingId = {
                project: { name: 'Test Project' }, // Missing id
                features: [],
                phases: {},
                config: {}
            };

            expect(() => dataManager.validateProjectData(missingId))
                .toThrow('Invalid project data: project must have id and name');

            const missingName = {
                project: { id: 'test-id' }, // Missing name
                features: [],
                phases: {},
                config: {}
            };

            expect(() => dataManager.validateProjectData(missingName))
                .toThrow('Invalid project data: project must have id and name');
        });

        test('BEHAVIOR: Features array validation includes individual feature validation', () => {
            const invalidFeature = {
                project: { id: 'test', name: 'Test' },
                features: [
                    { description: 'Valid feature', id: 'f1' },
                    { description: 'Invalid feature' } // Missing id
                ],
                phases: {},
                config: {}
            };

            expect(() => dataManager.validateProjectData(invalidFeature))
                .toThrow("Invalid feature at index 1: missing required property 'id'");
        });

        test('BEHAVIOR: Feature man days validation requires positive numbers', () => {
            const negativeManDays = {
                project: { id: 'test', name: 'Test' },
                features: [
                    { id: 'f1', description: 'Feature', manDays: -5 }
                ],
                phases: {},
                config: {}
            };

            expect(() => dataManager.validateProjectData(negativeManDays))
                .toThrow('Invalid feature at index 0: manDays must be a positive number');

            const invalidManDays = {
                project: { id: 'test', name: 'Test' },
                features: [
                    { id: 'f1', description: 'Feature', manDays: 'invalid' }
                ],
                phases: {},
                config: {}
            };

            expect(() => dataManager.validateProjectData(invalidManDays))
                .toThrow('Invalid feature at index 0: manDays must be a positive number');
        });
    });

    describe('File System Operations Behavior', () => {
        test('BEHAVIOR: Save project uses Electron API when available', async () => {
            const projectData = {
                project: { id: 'test', name: 'Test Project', lastModified: '2024-01-01' },
                features: [],
                phases: {},
                config: {}
            };

            mockElectronAPI.saveProjectFile.mockResolvedValue({
                success: true,
                filePath: '/path/to/project.json',
                fileName: 'Test_Project_test.json'
            });

            const result = await dataManager.saveProject(projectData);

            expect(mockElectronAPI.saveProjectFile).toHaveBeenCalledWith(projectData);
            expect(result.success).toBe(true);
            expect(dataManager.currentProjectPath).toBe('/path/to/project.json');
        });

        test('BEHAVIOR: Save project falls back to localStorage when Electron API unavailable', async () => {
            global.window.electronAPI = null;
            const consoleSpy = jest.spyOn(console, 'warn');

            const projectData = {
                project: { id: 'test', name: 'Test Project' },
                features: [],
                phases: {},
                config: {}
            };

            const result = await dataManager.saveProject(projectData);

            expect(consoleSpy).toHaveBeenCalledWith('electronAPI not available, using localStorage fallback');
            expect(result.success).toBe(true);
            expect(result.method).toBe('localStorage');
            // Verify localStorage was used by checking the data was stored
            const storedData = global.localStorage.getItem('software-estimation-project-test');
            expect(storedData).toBe(JSON.stringify(projectData));
        });

        test('BEHAVIOR: Load project updates lastModified timestamp automatically', async () => {
            const originalTime = '2024-01-01T12:00:00Z';
            const projectData = {
                project: { id: 'test', name: 'Test', lastModified: originalTime },
                features: [],
                phases: {},
                config: {}
            };

            // Mock current time
            const mockNow = '2024-01-02T12:00:00Z';
            jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockNow);

            await dataManager.saveProject(projectData);

            // Documents that save automatically updates lastModified
            expect(projectData.project.lastModified).toBe(mockNow);
        });

        test('BEHAVIOR: List projects returns sorted array by lastModified (newest first)', async () => {
            mockElectronAPI.listProjects.mockResolvedValue({
                success: true,
                projects: [
                    { project: { name: 'Old Project' }, lastModified: '2024-01-01' },
                    { project: { name: 'New Project' }, lastModified: '2024-01-02' },
                    { project: { name: 'Medium Project' }, lastModified: '2024-01-01T12:00:00' }
                ]
            });

            const projects = await dataManager.listProjects();

            // Documents sorting behavior (newest first)
            expect(projects[0].lastModified).toBe('2024-01-02');
            expect(projects[1].lastModified).toBe('2024-01-01T12:00:00');
            expect(projects[2].lastModified).toBe('2024-01-01');
        });

        test('BEHAVIOR: List projects with localStorage fallback uses specific key pattern', async () => {
            global.window.electronAPI = null;
            const consoleSpy = jest.spyOn(console, 'warn');

            // Setup localStorage with projects
            localStorage.setItem('software-estimation-project-1', JSON.stringify({
                project: { id: '1', name: 'Project 1', lastModified: '2024-01-01' }
            }));
            localStorage.setItem('other-data', 'should be ignored');
            localStorage.setItem('software-estimation-project-2', JSON.stringify({
                project: { id: '2', name: 'Project 2', lastModified: '2024-01-02' }
            }));

            const projects = await dataManager.listProjects();

            expect(consoleSpy).toHaveBeenCalledWith('electronAPI not available, using localStorage fallback');
            expect(projects).toHaveLength(2);
            expect(projects[0].project.name).toBe('Project 2'); // Sorted newest first
            expect(projects[1].project.name).toBe('Project 1');
        });

        test('BEHAVIOR: Delete project clears currentProjectPath when deleting current project', async () => {
            const testPath = '/path/to/test.json';
            dataManager.currentProjectPath = testPath;

            mockElectronAPI.deleteProjectFile.mockResolvedValue({ success: true });

            await dataManager.deleteProject(testPath);

            expect(dataManager.currentProjectPath).toBe(null);
        });

        test('BEHAVIOR: Settings operations use different storage methods based on API availability', async () => {
            // With Electron API
            mockElectronAPI.getSettings.mockResolvedValue({ 
                success: true, 
                settings: { theme: 'dark' } 
            });

            let settings = await dataManager.getSettings();
            expect(settings).toEqual({ theme: 'dark' });

            // Without Electron API (fallback)
            global.window.electronAPI = null;
            localStorage.setItem('app-settings', JSON.stringify({ theme: 'light' }));

            settings = await dataManager.getSettings();
            expect(settings).toEqual({ theme: 'light' });
        });
    });

    describe('CSV Generation Behavior', () => {
        let sampleProject;

        beforeEach(() => {
            sampleProject = {
                project: { id: 'test', name: 'Test Project' },
                features: [
                    {
                        id: 'F1',
                        description: 'Simple feature',
                        category: 'cat1',
                        supplier: 'sup1',
                        manDays: 10,
                        notes: 'Basic feature',
                        created: '2024-01-01',
                        modified: '2024-01-02'
                    },
                    {
                        id: 'F2',
                        description: 'Feature with "quotes" and, comma',
                        category: 'cat1',
                        supplier: 'sup1',
                        manDays: 5.5,
                        notes: 'Line 1\nLine 2',
                        created: '2024-01-01',
                        modified: '2024-01-01'
                    }
                ],
                phases: {},
                config: {
                    categories: [
                        { id: 'cat1', name: 'Category 1' }
                    ],
                    suppliers: [
                        { id: 'sup1', name: 'Supplier 1', department: 'Dept A' }
                    ]
                }
            };
        });

        test('BEHAVIOR: CSV generation includes specific header structure', () => {
            const csv = dataManager.generateCSV(sampleProject);

            const lines = csv.split('\n');
            const headers = lines[0].split(',');

            expect(headers).toEqual([
                'ID', 'Description', 'Category', 'Supplier', 
                'Man Days', 'Notes', 'Created', 'Modified'
            ]);
        });

        test('BEHAVIOR: CSV escaping handles quotes, commas, and newlines', () => {
            const csv = dataManager.generateCSV(sampleProject);

            // Documents specific escaping behavior
            expect(csv).toContain('"Feature with ""quotes"" and, comma"');
            expect(csv).toContain('"Line 1\nLine 2"');
        });

        test('BEHAVIOR: Empty features returns specific message', () => {
            const emptyProject = { ...sampleProject, features: [] };
            
            const result = dataManager.generateCSV(emptyProject);
            
            expect(result).toBe('No features to export');
        });

        test('BEHAVIOR: CSV field escaping rules are specific and consistent', () => {
            const testCases = [
                { input: 'simple', expected: 'simple' },
                { input: 'has,comma', expected: '"has,comma"' },
                { input: 'has"quote', expected: '"has""quote"' },
                { input: 'has\nnewline', expected: '"has\nnewline"' },
                { input: 'has"quote,comma\nand newline', expected: '"has""quote,comma\nand newline"' }
            ];

            testCases.forEach(testCase => {
                const result = dataManager.escapeCsvField(testCase.input);
                expect(result).toBe(testCase.expected);
            });
        });

        test('BEHAVIOR: Category and supplier name resolution uses fallback logic', () => {
            const projectWithMissingRefs = {
                ...sampleProject,
                features: [{
                    id: 'F1',
                    description: 'Feature',
                    category: 'unknown-cat',
                    supplier: 'unknown-sup',
                    manDays: 10
                }]
            };

            const csv = dataManager.generateCSV(projectWithMissingRefs);
            
            // Documents fallback behavior - uses ID when name not found
            expect(csv).toContain('unknown-cat');
            expect(csv).toContain('unknown-sup');
        });

        test('BEHAVIOR: Internal resources get special department formatting', () => {
            const projectWithInternalResource = {
                ...sampleProject,
                config: {
                    ...sampleProject.config,
                    internalResources: [
                        { id: 'int1', name: 'Internal Dev', department: 'IT' }
                    ]
                },
                features: [{
                    id: 'F1',
                    description: 'Feature',
                    supplier: 'int1',
                    manDays: 10
                }]
            };

            const result = dataManager.getSupplierName(projectWithInternalResource, 'int1');
            
            // Documents internal resource formatting
            expect(result).toBe('IT - Internal Dev (Internal)');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('BEHAVIOR: Invalid project data validation provides specific error context', () => {
            const invalidProject = {
                project: 'not an object', // Invalid type
                features: [],
                phases: {},
                config: {}
            };

            expect(() => dataManager.validateProjectData(invalidProject))
                .toThrow('Invalid project data: project metadata must be an object');
        });

        test('BEHAVIOR: Feature validation includes array type checking', () => {
            const invalidFeaturesType = {
                project: { id: 'test', name: 'Test' },
                features: 'not an array', // Invalid type
                phases: {},
                config: {}
            };

            expect(() => dataManager.validateProjectData(invalidFeaturesType))
                .toThrow('Invalid project data: features must be an array');
        });

        test('BEHAVIOR: Settings operations gracefully handle errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error');
            
            mockElectronAPI.getSettings.mockRejectedValue(new Error('Settings file corrupted'));

            const settings = await dataManager.getSettings();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to get settings:', expect.any(Error));
            expect(settings).toEqual({}); // Returns empty object as fallback
        });

        test('BEHAVIOR: Save project handles Electron API failures with specific error structure', async () => {
            const projectData = {
                project: { id: 'test', name: 'Test' },
                features: [],
                phases: {},
                config: {}
            };

            mockElectronAPI.saveProjectFile.mockResolvedValue({
                success: false,
                error: 'Disk full'
            });

            await expect(dataManager.saveProject(projectData))
                .rejects.toThrow('Disk full');
        });

        test('BEHAVIOR: ID generation uses specific character set and length', () => {
            const id1 = dataManager.generateId();
            const id2 = dataManager.generateId('prefix_');

            // Documents ID characteristics
            expect(id1).toHaveLength(8);
            expect(id2).toMatch(/^prefix_.{8}$/);
            expect(id1).toMatch(/^[A-Za-z0-9]{8}$/);
        });

        test('BEHAVIOR: List projects handles individual file read failures gracefully', async () => {
            global.window.electronAPI = null;
            const consoleSpy = jest.spyOn(console, 'warn');

            // Setup localStorage with valid and invalid projects
            localStorage.setItem('software-estimation-project-1', JSON.stringify({
                project: { id: '1', name: 'Valid' }
            }));
            localStorage.setItem('software-estimation-project-2', 'invalid json');
            localStorage.setItem('software-estimation-project-3', JSON.stringify({
                project: { id: '3', name: 'Also Valid' }
            }));

            const projects = await dataManager.listProjects();

            // Documents that invalid projects are skipped silently
            expect(projects).toHaveLength(2);
            expect(projects.map(p => p.project.name)).toEqual(['Valid', 'Also Valid']);
        });
    });

    describe('KNOWN BUGS - Documented Current Behavior', () => {
        test('BUG: SaveToSpecificFile creates download instead of actual file save', async () => {
            // Documents that this method doesn't actually save to a specific path
            // but creates a browser download instead
            const projectData = { project: { id: 'test', name: 'Test' }, features: [] };
            
            // Mock DOM elements for download creation
            const mockA = {
                href: '',
                download: '',
                click: jest.fn(),
                remove: jest.fn()
            };
            const mockAppendChild = jest.fn();
            const mockRemoveChild = jest.fn();
            
            document.createElement = jest.fn(() => mockA);
            document.body.appendChild = mockAppendChild;
            document.body.removeChild = mockRemoveChild;
            
            global.URL = {
                createObjectURL: jest.fn(() => 'blob:url'),
                revokeObjectURL: jest.fn()
            };
            global.Blob = jest.fn();

            const result = await dataManager.saveToSpecificFile(projectData, 'custom-path.json');

            // Documents that it doesn't actually save to the specified path
            expect(result.filePath).toBe('custom-path.json');
            expect(mockA.download).toBe('custom-path.json');
            expect(mockA.click).toHaveBeenCalled();
        });

        test('BUG: Version creation methods exist but versionsKey property is undefined', async () => {
            // Documents that DataManager has version-related methods but versionsKey is never initialized
            const projectData = {
                project: { id: 'test', name: 'Test', version: '1.0.0', comment: 'Test version' },
                features: []
            };

            // This would cause undefined localStorage key access
            const result = await dataManager.createVersion(projectData);

            // Documents the bug - versionsKey is undefined
            expect(dataManager.versionsKey).toBeUndefined();
        });

        test('BUG: CSV category/supplier resolution depends on config structure but doesnt validate it', () => {
            // Documents that these methods assume specific config structure without validation
            const projectWithoutConfig = {
                project: { id: 'test', name: 'Test' },
                config: null // No config object
            };

            const categoryName = dataManager.getCategoryName(projectWithoutConfig, 'some-id');
            const supplierName = dataManager.getSupplierName(projectWithoutConfig, 'some-id');

            // Documents that methods handle missing config gracefully with fallbacks
            expect(categoryName).toBe('some-id');
            expect(supplierName).toBe('some-id');
        });
    });
});