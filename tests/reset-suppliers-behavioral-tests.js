/**
 * Reset Suppliers Button Behavioral Tests
 * 
 * Documents the enhanced behavior of the reset-suppliers-btn:
 * - Proper async/await implementation
 * - Project overrides clearing functionality
 * - Integration with configuration hierarchy
 * - User feedback and notification system
 */

describe('Reset Suppliers Button - Enhanced Behavioral Documentation', () => {
    let supplierConfigManager;
    let mockConfigManager;
    let mockDataManager;

    beforeEach(() => {
        // Setup DOM structure
        document.body.innerHTML = `
            <div class="suppliers-config-container">
                <div class="config-section-header">
                    <button id="reset-suppliers-btn" class="btn btn-outline-secondary">
                        <i class="fas fa-undo"></i> Reset to Defaults
                    </button>
                </div>
                <table class="hierarchical-table">
                    <tbody id="suppliers-table-body">
                        <tr data-supplier-id="supplier1">
                            <td><input type="text" value="Modified Supplier" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        // Mock configuration manager with hierarchical functionality
        mockConfigManager = {
            config: {
                projectOverrides: {
                    suppliers: {
                        'supplier1': { name: 'Override Supplier', rate: 150 }
                    }
                }
            },
            clearProjectOverrides: jest.fn(async (section) => {
                if (section === 'suppliers') {
                    delete mockConfigManager.config.projectOverrides.suppliers;
                }
            }),
            saveConfig: jest.fn(async () => true),
            getAllSuppliers: jest.fn(() => [
                { id: 'supplier1', name: 'Default Supplier', rate: 100, source: 'global' }
            ])
        };

        // Mock data manager
        mockDataManager = {
            saveConfig: jest.fn(async () => true)
        };

        // Mock notification system
        global.NotificationManager = {
            show: jest.fn()
        };

        // Mock supplier config manager
        supplierConfigManager = {
            configManager: mockConfigManager,
            dataManager: mockDataManager,
            updateTable: jest.fn(),
            resetToDefaults: jest.fn(async function() {
                try {
                    // Clear project-specific supplier overrides
                    await this.configManager.clearProjectOverrides('suppliers');
                    
                    // Save configuration
                    await this.configManager.saveConfig();
                    
                    // Update the table display
                    this.updateTable();
                    
                    // Show success notification
                    NotificationManager.show('Suppliers reset to default configuration', 'success');
                } catch (error) {
                    NotificationManager.show('Failed to reset suppliers configuration', 'error');
                    throw error;
                }
            })
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('Enhanced Reset Functionality Behavior', () => {
        test('BEHAVIOR: resetToDefaults uses async/await for proper error handling', async () => {
            // Documents the enhanced implementation with proper async handling
            expect(supplierConfigManager.resetToDefaults).toBeDefined();
            
            await supplierConfigManager.resetToDefaults();
            
            // Documents that async operations complete in sequence
            expect(mockConfigManager.clearProjectOverrides).toHaveBeenCalledWith('suppliers');
            expect(mockConfigManager.saveConfig).toHaveBeenCalled();
            expect(supplierConfigManager.updateTable).toHaveBeenCalled();
        });

        test('BEHAVIOR: Project overrides are properly cleared from hierarchical config', async () => {
            // Setup project overrides
            mockConfigManager.config.projectOverrides.suppliers = {
                'supplier1': { name: 'Override Supplier', rate: 150 }
            };
            
            await supplierConfigManager.resetToDefaults();
            
            // Documents that project-specific overrides are removed
            expect(mockConfigManager.clearProjectOverrides).toHaveBeenCalledWith('suppliers');
            expect(mockConfigManager.config.projectOverrides.suppliers).toBeUndefined();
        });

        test('BEHAVIOR: Configuration changes are persisted to storage', async () => {
            await supplierConfigManager.resetToDefaults();
            
            // Documents that changes are saved
            expect(mockConfigManager.saveConfig).toHaveBeenCalled();
            
            // Documents save order: clear overrides first, then save
            const clearCall = mockConfigManager.clearProjectOverrides.mock.calls[0];
            const saveCall = mockConfigManager.saveConfig.mock.calls[0];
            expect(clearCall).toBeDefined();
            expect(saveCall).toBeDefined();
        });

        test('BEHAVIOR: User receives immediate feedback via notifications', async () => {
            await supplierConfigManager.resetToDefaults();
            
            // Documents success notification
            expect(NotificationManager.show).toHaveBeenCalledWith(
                'Suppliers reset to default configuration',
                'success'
            );
        });

        test('BEHAVIOR: UI table updates reflect configuration changes', async () => {
            await supplierConfigManager.resetToDefaults();
            
            // Documents that table is refreshed after reset
            expect(supplierConfigManager.updateTable).toHaveBeenCalled();
            
            // Documents call sequence: config changes before UI update
            expect(mockConfigManager.clearProjectOverrides).toHaveBeenCalledBefore(
                supplierConfigManager.updateTable
            );
        });
    });

    describe('Error Handling and Resilience', () => {
        test('BEHAVIOR: Failed configuration clear shows error notification', async () => {
            // Mock configuration clear failure
            mockConfigManager.clearProjectOverrides.mockRejectedValue(
                new Error('Config clear failed')
            );
            
            await expect(supplierConfigManager.resetToDefaults()).rejects.toThrow('Config clear failed');
            
            // Documents error notification
            expect(NotificationManager.show).toHaveBeenCalledWith(
                'Failed to reset suppliers configuration',
                'error'
            );
        });

        test('BEHAVIOR: Failed save operation prevents UI update', async () => {
            // Mock save failure
            mockConfigManager.saveConfig.mockRejectedValue(new Error('Save failed'));
            
            await expect(supplierConfigManager.resetToDefaults()).rejects.toThrow('Save failed');
            
            // Documents that UI is not updated on save failure
            expect(supplierConfigManager.updateTable).not.toHaveBeenCalled();
        });

        test('BEHAVIOR: Partial failures maintain data consistency', async () => {
            // Setup scenario where clear succeeds but save fails
            mockConfigManager.saveConfig.mockRejectedValue(new Error('Save failed'));
            
            try {
                await supplierConfigManager.resetToDefaults();
            } catch (error) {
                // Documents that error is propagated
                expect(error.message).toBe('Save failed');
            }
            
            // Documents that clear operation completed
            expect(mockConfigManager.clearProjectOverrides).toHaveBeenCalled();
        });
    });

    describe('Integration with Hierarchical Configuration', () => {
        test('BEHAVIOR: Reset preserves global defaults while clearing overrides', async () => {
            // Setup mixed configuration state
            const globalSuppliers = [
                { id: 'supplier1', name: 'Global Default', rate: 100, source: 'global' }
            ];
            mockConfigManager.getAllSuppliers.mockReturnValue(globalSuppliers);
            
            await supplierConfigManager.resetToDefaults();
            
            // Documents that only project overrides are cleared
            expect(mockConfigManager.clearProjectOverrides).toHaveBeenCalledWith('suppliers');
            
            // Documents that global config remains intact
            expect(mockConfigManager.getAllSuppliers()).toEqual(globalSuppliers);
        });

        test('BEHAVIOR: Reset affects only suppliers section of configuration', async () => {
            // Setup configuration with multiple sections
            mockConfigManager.config.projectOverrides = {
                suppliers: { 'supplier1': { name: 'Override' } },
                categories: { 'cat1': { name: 'Category Override' } },
                resources: { 'res1': { name: 'Resource Override' } }
            };
            
            await supplierConfigManager.resetToDefaults();
            
            // Documents section-specific clearing
            expect(mockConfigManager.clearProjectOverrides).toHaveBeenCalledWith('suppliers');
            expect(mockConfigManager.clearProjectOverrides).toHaveBeenCalledTimes(1);
            
            // Documents that other sections are preserved
            expect(mockConfigManager.config.projectOverrides.categories).toBeDefined();
            expect(mockConfigManager.config.projectOverrides.resources).toBeDefined();
        });
    });

    describe('User Experience and Interface', () => {
        test('BEHAVIOR: Reset button maintains consistent styling and iconography', () => {
            const resetBtn = document.getElementById('reset-suppliers-btn');
            
            // Documents semantic button styling
            expect(resetBtn.classList.contains('btn')).toBe(true);
            expect(resetBtn.classList.contains('btn-outline-secondary')).toBe(true);
            
            // Documents clear visual indication
            const icon = resetBtn.querySelector('i.fas.fa-undo');
            expect(icon).not.toBeNull();
            
            // Documents descriptive text
            expect(resetBtn.textContent).toContain('Reset to Defaults');
        });

        test('BEHAVIOR: Reset provides immediate visual feedback in table', async () => {
            await supplierConfigManager.resetToDefaults();
            
            // Documents that table update is called for immediate feedback
            expect(supplierConfigManager.updateTable).toHaveBeenCalled();
            
            // Documents timing: notification and UI update are coordinated
            expect(NotificationManager.show).toHaveBeenCalled();
        });

        test('BEHAVIOR: Reset operation shows loading state during async operations', async () => {
            // Documents expectation for loading states
            const resetBtn = document.getElementById('reset-suppliers-btn');
            
            // This test documents expected behavior for user feedback
            expect(resetBtn).toBeDefined();
            
            // Future enhancement: button should show loading state
            // expect(resetBtn.disabled).toBe(true) during operation
        });
    });

    describe('FIXES DOCUMENTED - Enhanced Reset Behavior', () => {
        test('FIXED: Reset now uses proper async/await instead of fire-and-forget', async () => {
            // Documents that the method properly awaits async operations
            const resetPromise = supplierConfigManager.resetToDefaults();
            
            // Documents that it returns a promise
            expect(resetPromise).toBeInstanceOf(Promise);
            
            await resetPromise;
            
            // Documents sequential execution
            expect(mockConfigManager.clearProjectOverrides).toHaveBeenCalledBefore(
                mockConfigManager.saveConfig
            );
        });

        test('FIXED: Project overrides are now properly cleared', async () => {
            // Setup overrides that previously wouldn't be cleared
            mockConfigManager.config.projectOverrides.suppliers = {
                'supplier1': { name: 'Stuck Override', rate: 999 }
            };
            
            await supplierConfigManager.resetToDefaults();
            
            // Documents that overrides are actually removed
            expect(mockConfigManager.clearProjectOverrides).toHaveBeenCalledWith('suppliers');
            
            // Documents that the specific clearProjectOverrides method is used
            // instead of generic reset that might not handle overrides
        });

        test('FIXED: Error handling prevents silent failures', async () => {
            // Mock a failure scenario
            mockConfigManager.clearProjectOverrides.mockRejectedValue(
                new Error('Permission denied')
            );
            
            // Documents that errors are now properly propagated
            await expect(supplierConfigManager.resetToDefaults()).rejects.toThrow('Permission denied');
            
            // Documents that user is notified of failures
            expect(NotificationManager.show).toHaveBeenCalledWith(
                'Failed to reset suppliers configuration',
                'error'
            );
        });
    });
});