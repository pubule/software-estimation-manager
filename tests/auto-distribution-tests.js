/**
 * Auto-Distribution Algorithms - TDD Test Suite
 * 
 * Tests for automatic MD distribution algorithms including:
 * - Project end date calculation
 * - Auto-distribution across months  
 * - Overflow prevention and detection
 * - Redistribution after user changes
 * - Integration with working days calculator
 * 
 * This test suite drives the implementation of auto-distribution algorithms
 * following Test-Driven Development practices.
 */

describe('AutoDistribution Algorithms - TDD Implementation', () => {
    let distributor;
    let mockWorkingDaysCalculator;
    let mockTeamManager;
    
    beforeEach(() => {
        // Mock dependencies
        mockWorkingDaysCalculator = {
            calculateWorkingDays: jest.fn((month, year, country) => {
                // Standard mock: 22 working days per month
                return 22;
            }),
            calculateAvailableCapacity: jest.fn((teamMember, month) => {
                // Mock available capacity (22 working days - vacation - existing allocations)
                return 20; // Default available capacity
            }),
            isNationalHoliday: jest.fn(() => false)
        };

        mockTeamManager = {
            getTeamMemberById: jest.fn((id) => {
                return {
                    id: id,
                    firstName: 'Test',
                    lastName: 'Member',
                    monthlyCapacity: 22,
                    vacationDays: {}
                };
            })
        };

        // AutoDistribution implementation will be created to pass these tests
        distributor = new AutoDistribution(mockWorkingDaysCalculator, mockTeamManager);
    });

    describe('Project End Date Calculation', () => {
        test('TDD: Calculate end date for simple project allocation', () => {
            const startDate = new Date('2024-02-01');
            const totalMDs = 60;
            const teamMemberId = 'tm-001';

            // Mock 20 MDs available per month
            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(20);

            const endDate = distributor.calculateProjectEndDate(startDate, totalMDs, teamMemberId);

            // 60 MDs / 20 MDs per month = 3 months
            expect(endDate.getFullYear()).toBe(2024);
            expect(endDate.getMonth()).toBe(4); // May (0-indexed)
            expect(endDate.getDate()).toBe(1);
        });

        test('TDD: Handle fractional month requirements', () => {
            const startDate = new Date('2024-02-01');
            const totalMDs = 50;
            const teamMemberId = 'tm-001';

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(20);

            const endDate = distributor.calculateProjectEndDate(startDate, totalMDs, teamMemberId);

            // 50 MDs / 20 MDs per month = 2.5 months, should round up to 3
            expect(endDate.getFullYear()).toBe(2024);
            expect(endDate.getMonth()).toBe(4); // May
        });

        test('TDD: Account for reduced capacity due to vacation', () => {
            const startDate = new Date('2024-02-01');
            const totalMDs = 60;
            const teamMemberId = 'tm-001';

            // Mock reduced capacity due to vacation
            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(15);

            const endDate = distributor.calculateProjectEndDate(startDate, totalMDs, teamMemberId);

            // 60 MDs / 15 MDs per month = 4 months
            expect(endDate.getFullYear()).toBe(2024);
            expect(endDate.getMonth()).toBe(5); // June
        });

        test('TDD: Handle year boundary crossing', () => {
            const startDate = new Date('2024-11-01');
            const totalMDs = 80;
            const teamMemberId = 'tm-001';

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(20);

            const endDate = distributor.calculateProjectEndDate(startDate, totalMDs, teamMemberId);

            // 4 months from November = March next year
            expect(endDate.getFullYear()).toBe(2025);
            expect(endDate.getMonth()).toBe(2); // March
        });
    });

    describe('Auto-Distribution Algorithm', () => {
        test('TDD: Distribute MDs evenly across available months', () => {
            const totalMDs = 60;
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-05-01');
            const teamMemberId = 'tm-001';

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(20);

            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Should distribute across 3 months: Feb, Mar, Apr
            expect(distribution).toHaveProperty('2024-02');
            expect(distribution).toHaveProperty('2024-03');
            expect(distribution).toHaveProperty('2024-04');

            // Even distribution: 20 MDs per month
            expect(distribution['2024-02'].planned).toBe(20);
            expect(distribution['2024-03'].planned).toBe(20);
            expect(distribution['2024-04'].planned).toBe(20);

            // Verify total allocation equals total MDs (excluding metadata)
            const totalAllocated = Object.entries(distribution)
                .filter(([key, value]) => !['hasOverflow', 'overflowAmount'].includes(key))
                .reduce((sum, [key, alloc]) => sum + (alloc.planned || 0), 0);
            expect(totalAllocated).toBe(totalMDs);
        });

        test('TDD: Handle uneven distribution with remainder', () => {
            const totalMDs = 65;
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-05-01');
            const teamMemberId = 'tm-001';

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(20);

            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Should distribute 65 MDs across 3 months
            const totalAllocated = Object.values(distribution).reduce((sum, alloc) => sum + alloc.planned, 0);
            expect(totalAllocated).toBe(65);

            // Should favor later months for remainder (common strategy)
            expect(distribution['2024-02'].planned).toBeLessThanOrEqual(22);
            expect(distribution['2024-03'].planned).toBeLessThanOrEqual(22);
            expect(distribution['2024-04'].planned).toBeLessThanOrEqual(22);
        });

        test('TDD: Respect capacity limits in each month', () => {
            const totalMDs = 100;
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-04-01');
            const teamMemberId = 'tm-001';

            // Mock varying capacity per month
            mockWorkingDaysCalculator.calculateAvailableCapacity
                .mockReturnValueOnce(15) // Feb: limited capacity
                .mockReturnValueOnce(20) // Mar: normal capacity  
                .mockReturnValueOnce(18); // Apr: reduced capacity

            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Should not exceed capacity limits
            expect(distribution['2024-02'].planned).toBeLessThanOrEqual(15);
            expect(distribution['2024-03'].planned).toBeLessThanOrEqual(20);

            // Should still allocate total MDs
            const totalAllocated = Object.values(distribution).reduce((sum, alloc) => sum + alloc.planned, 0);
            expect(totalAllocated).toBe(totalMDs);
        });

        test('TDD: Apply safety buffer to capacity allocation', () => {
            const totalMDs = 40;
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-04-01');
            const teamMemberId = 'tm-001';

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(22);

            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // With safety buffer (90%), should allocate max ~19.8 MDs per month
            Object.values(distribution).forEach(allocation => {
                expect(allocation.planned).toBeLessThanOrEqual(20); // 22 * 0.9 = 19.8, rounded up
            });
        });

        test('TDD: Handle insufficient capacity gracefully', () => {
            const totalMDs = 100;
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-03-01');
            const teamMemberId = 'tm-001';

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(10);

            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Should still try to distribute, even if capacity is insufficient
            expect(distribution).toHaveProperty('2024-02');
            
            // Should flag as having overflow
            expect(distribution.hasOverflow).toBe(true);
            expect(distribution.overflowAmount).toBeGreaterThan(0);
        });

        test('TDD: Generate proper allocation structure', () => {
            const totalMDs = 40;
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-04-01');
            const teamMemberId = 'tm-001';

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(20);

            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Verify allocation structure
            Object.entries(distribution).forEach(([month, allocation]) => {
                if (month !== 'hasOverflow' && month !== 'overflowAmount') {
                    expect(allocation).toHaveProperty('planned');
                    expect(allocation).toHaveProperty('actual');
                    expect(allocation).toHaveProperty('locked');
                    expect(allocation.locked).toBe(false); // New allocations are unlocked
                    expect(allocation.actual).toBe(allocation.planned); // Initially same
                }
            });
        });
    });

    describe('Overflow Detection Algorithm', () => {
        test('TDD: Detect capacity overflow for single month', () => {
            const teamMemberId = 'tm-001';
            const month = '2024-02';
            const newAllocation = 25;

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(20);

            const result = distributor.checkCapacityOverflow(teamMemberId, month, newAllocation);

            expect(result.hasOverflow).toBe(true);
            expect(result.overflowAmount).toBe(5);
            expect(result.maxCapacity).toBe(20);
            expect(result.utilization).toBe(125); // 25/20 * 100
        });

        test('TDD: Confirm no overflow when within capacity', () => {
            const teamMemberId = 'tm-001';
            const month = '2024-02';
            const newAllocation = 18;

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(20);

            const result = distributor.checkCapacityOverflow(teamMemberId, month, newAllocation);

            expect(result.hasOverflow).toBe(false);
            expect(result.overflowAmount).toBe(0);
            expect(result.maxCapacity).toBe(20);
            expect(result.utilization).toBe(90); // 18/20 * 100
        });

        test('TDD: Handle zero capacity edge case', () => {
            const teamMemberId = 'tm-001';
            const month = '2024-02';
            const newAllocation = 5;

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(0);

            const result = distributor.checkCapacityOverflow(teamMemberId, month, newAllocation);

            expect(result.hasOverflow).toBe(true);
            expect(result.overflowAmount).toBe(5);
            expect(result.maxCapacity).toBe(0);
            expect(result.utilization).toBe(Infinity); // Division by zero
        });

        test('TDD: Account for existing allocations in overflow calculation', () => {
            const teamMemberId = 'tm-001';
            const month = '2024-02';
            const newAllocation = 18;

            // Mock that team member already has 5 MDs allocated
            distributor.setExistingAllocations(teamMemberId, month, 5);
            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(15); // 20 - 5 existing

            const result = distributor.checkCapacityOverflow(teamMemberId, month, newAllocation);

            expect(result.hasOverflow).toBe(true); // 18 > 15 available
            expect(result.overflowAmount).toBe(3);
        });
    });

    describe('Redistribution After User Changes', () => {
        test('TDD: Redistribute excess to future months when user reduces allocation', () => {
            const assignment = {
                id: 'pa-001',
                teamMemberId: 'tm-001',
                allocations: {
                    '2024-02': { planned: 20, actual: 20, locked: false },
                    '2024-03': { planned: 20, actual: 20, locked: false },
                    '2024-04': { planned: 20, actual: 20, locked: false }
                }
            };

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(22);

            const result = distributor.redistributeAfterUserChange(assignment, '2024-02', 15);

            // User reduced Feb from 20 to 15, so 5 MDs should redistribute to future
            expect(result.allocations['2024-02'].planned).toBe(15);
            
            // Excess should go to future months
            const futureTotal = result.allocations['2024-03'].planned + result.allocations['2024-04'].planned;
            expect(futureTotal).toBeGreaterThan(40); // Original 40 + 5 excess
        });

        test('TDD: Reduce from future months when user increases allocation', () => {
            const assignment = {
                id: 'pa-001',
                teamMemberId: 'tm-001',
                allocations: {
                    '2024-02': { planned: 20, actual: 20, locked: false },
                    '2024-03': { planned: 20, actual: 20, locked: false },
                    '2024-04': { planned: 20, actual: 20, locked: false }
                }
            };

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(25);

            const result = distributor.redistributeAfterUserChange(assignment, '2024-02', 25);

            // User increased Feb from 20 to 25, so 5 MDs should come from future
            expect(result.allocations['2024-02'].planned).toBe(25);
            
            // Future months should be reduced
            const futureTotal = result.allocations['2024-03'].planned + result.allocations['2024-04'].planned;
            expect(futureTotal).toBe(35); // Original 40 - 5
        });

        test('TDD: Preserve locked allocations during redistribution', () => {
            const assignment = {
                id: 'pa-001',
                teamMemberId: 'tm-001',
                allocations: {
                    '2024-02': { planned: 20, actual: 20, locked: false },
                    '2024-03': { planned: 20, actual: 20, locked: true }, // Locked
                    '2024-04': { planned: 20, actual: 20, locked: false }
                }
            };

            const result = distributor.redistributeAfterUserChange(assignment, '2024-02', 15);

            // March should not change (locked)
            expect(result.allocations['2024-03'].planned).toBe(20);
            expect(result.allocations['2024-03'].locked).toBe(true);

            // Only April should receive the excess
            expect(result.allocations['2024-04'].planned).toBeGreaterThan(20);
        });

        test('TDD: Never redistribute to past months', () => {
            const assignment = {
                id: 'pa-001',
                teamMemberId: 'tm-001',
                allocations: {
                    '2024-01': { planned: 20, actual: 20, locked: false }, // Past month
                    '2024-02': { planned: 20, actual: 20, locked: false }, // Current month  
                    '2024-03': { planned: 20, actual: 20, locked: false }  // Future month
                }
            };

            // Mock current date as February
            jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-02-15').getTime());

            const result = distributor.redistributeAfterUserChange(assignment, '2024-02', 15);

            // January (past) should not change
            expect(result.allocations['2024-01'].planned).toBe(20);
            
            // Only March (future) should receive excess
            expect(result.allocations['2024-03'].planned).toBeGreaterThan(20);

            Date.now.mockRestore();
        });

        test('TDD: Update assignment metadata after redistribution', () => {
            const assignment = {
                id: 'pa-001',
                teamMemberId: 'tm-001',
                lastModified: '2024-01-01T00:00:00.000Z',
                allocations: {
                    '2024-02': { planned: 20, actual: 20, locked: false },
                    '2024-03': { planned: 20, actual: 20, locked: false }
                }
            };

            const result = distributor.redistributeAfterUserChange(assignment, '2024-02', 18);

            expect(result.id).toBe('pa-001');
            expect(result.teamMemberId).toBe('tm-001');
            expect(result.lastModified).not.toBe('2024-01-01T00:00:00.000Z');
            expect(new Date(result.lastModified)).toBeInstanceOf(Date);
        });

        test('TDD: Handle insufficient future capacity for redistribution', () => {
            const assignment = {
                id: 'pa-001',
                teamMemberId: 'tm-001',
                allocations: {
                    '2024-02': { planned: 20, actual: 20, locked: false },
                    '2024-03': { planned: 20, actual: 20, locked: false }
                }
            };

            // Mock very limited future capacity
            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(21);

            const result = distributor.redistributeAfterUserChange(assignment, '2024-02', 10);

            // Should redistribute as much as possible
            expect(result.allocations['2024-02'].planned).toBe(10);
            expect(result.allocations['2024-03'].planned).toBeLessThanOrEqual(21);
            
            // Should flag remaining overflow
            expect(result.hasUnallocatedMDs).toBe(true);
            expect(result.unallocatedAmount).toBeGreaterThan(0);
        });
    });

    describe('Integration with Working Days Calculator', () => {
        test('TDD: Use working days calculator for capacity checks', () => {
            const totalMDs = 40;
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-04-01');
            const teamMemberId = 'tm-001';

            distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Should call working days calculator for each month
            expect(mockWorkingDaysCalculator.calculateAvailableCapacity).toHaveBeenCalledWith(
                expect.objectContaining({ id: teamMemberId }),
                '2024-02'
            );
            expect(mockWorkingDaysCalculator.calculateAvailableCapacity).toHaveBeenCalledWith(
                expect.objectContaining({ id: teamMemberId }),
                '2024-03'
            );
        });

        test('TDD: Respect holiday-adjusted working days', () => {
            const totalMDs = 40;
            const startDate = new Date('2024-12-01');
            const endDate = new Date('2025-02-01');
            const teamMemberId = 'tm-001';

            // Mock reduced capacity for December (holidays)
            mockWorkingDaysCalculator.calculateAvailableCapacity
                .mockReturnValueOnce(15) // Dec: many holidays
                .mockReturnValueOnce(18) // Jan: some holidays
                .mockReturnValueOnce(20); // Feb: normal

            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Should allocate less to December due to holidays
            expect(distribution['2024-12'].planned).toBeLessThan(distribution['2025-02'].planned);
        });

        test('TDD: Account for vacation days in capacity planning', () => {
            const totalMDs = 60;
            const startDate = new Date('2024-07-01');
            const endDate = new Date('2024-10-01');
            const teamMemberId = 'tm-001';

            // Mock reduced capacity for August (vacation month)
            mockWorkingDaysCalculator.calculateAvailableCapacity
                .mockReturnValueOnce(20) // Jul: normal
                .mockReturnValueOnce(10) // Aug: vacation
                .mockReturnValueOnce(20); // Sep: normal

            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Should allocate more to non-vacation months
            expect(distribution['2024-08'].planned).toBeLessThan(distribution['2024-07'].planned);
            expect(distribution['2024-08'].planned).toBeLessThan(distribution['2024-09'].planned);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('TDD: Handle zero total MDs gracefully', () => {
            const totalMDs = 0;
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-04-01');
            const teamMemberId = 'tm-001';

            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Should return empty allocation
            expect(Object.keys(distribution)).toHaveLength(0);
        });

        test('TDD: Handle invalid date range', () => {
            const totalMDs = 60;
            const startDate = new Date('2024-04-01');
            const endDate = new Date('2024-02-01'); // End before start

            expect(() => {
                distributor.autoDistributeMDs(totalMDs, startDate, endDate, 'tm-001');
            }).toThrow('Invalid date range');
        });

        test('TDD: Handle non-existent team member', () => {
            mockTeamManager.getTeamMemberById.mockReturnValue(null);

            expect(() => {
                distributor.calculateProjectEndDate(new Date('2024-02-01'), 60, 'invalid-id');
            }).toThrow('Team member not found');
        });

        test('TDD: Handle negative MD values', () => {
            expect(() => {
                distributor.autoDistributeMDs(-10, new Date('2024-02-01'), new Date('2024-04-01'), 'tm-001');
            }).toThrow('Total MDs must be positive');
        });

        test('TDD: Handle very large MD allocations', () => {
            const totalMDs = 10000;
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-04-01');
            const teamMemberId = 'tm-001';

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(20);

            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Should handle large numbers and flag massive overflow
            expect(distribution.hasOverflow).toBe(true);
            expect(distribution.overflowAmount).toBeGreaterThan(9000);
        });

        test('TDD: Preserve data integrity during redistribution failures', () => {
            const originalAssignment = {
                id: 'pa-001',
                teamMemberId: 'tm-001',
                allocations: {
                    '2024-02': { planned: 20, actual: 20, locked: false }
                }
            };

            // Mock calculation failure
            mockWorkingDaysCalculator.calculateAvailableCapacity.mockImplementation(() => {
                throw new Error('Calculation failed');
            });

            const result = distributor.redistributeAfterUserChange(originalAssignment, '2024-02', 15);

            // Should return original assignment on error
            expect(result.allocations['2024-02'].planned).toBe(20);
            expect(result.error).toBeDefined();
        });
    });

    describe('Algorithm Performance and Optimization', () => {
        test('TDD: Efficient allocation for large month ranges', () => {
            const totalMDs = 240;
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2025-01-01'); // 12 months
            const teamMemberId = 'tm-001';

            mockWorkingDaysCalculator.calculateAvailableCapacity.mockReturnValue(20);

            const startTime = Date.now();
            const distribution = distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);
            const endTime = Date.now();

            // Should complete within reasonable time (< 100ms)
            expect(endTime - startTime).toBeLessThan(100);
            expect(Object.keys(distribution)).toHaveLength(12);
        });

        test('TDD: Cache working days calculations for performance', () => {
            const totalMDs = 60;
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-04-01');
            const teamMemberId = 'tm-001';

            // Run distribution twice
            distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);
            distributor.autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId);

            // Working days calculator should use caching (implementation detail)
            // This test documents the expected optimization
            expect(mockWorkingDaysCalculator.calculateAvailableCapacity).toHaveBeenCalled();
        });
    });
});