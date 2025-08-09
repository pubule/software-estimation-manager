/**
 * Working Days Calculator - TDD Test Suite
 * 
 * Tests for calculating working days in a month excluding:
 * - Weekends (Saturday, Sunday)  
 * - National holidays (Italy, Romania)
 * - Vacation days (per team member)
 * 
 * This test suite drives the implementation of WorkingDaysCalculator
 * following Test-Driven Development practices.
 */

describe('WorkingDaysCalculator - TDD Implementation', () => {
    let calculator;
    
    beforeEach(() => {
        // Mock implementation will be created to pass these tests
        calculator = new WorkingDaysCalculator();
    });

    describe('Basic Working Days Calculation', () => {
        test('TDD: Calculate working days excluding weekends only', () => {
            // January 2024: 31 days, starts on Monday
            // Weekends: 6-7, 13-14, 20-21, 27-28 (8 weekend days)
            // Expected: 31 - 8 = 23 working days
            const workingDays = calculator.calculateWorkingDays(1, 2024, 'IT');
            expect(workingDays).toBe(23);
        });

        test('TDD: February 2024 (leap year) working days calculation', () => {
            // February 2024: 29 days (leap year), starts on Thursday  
            // Weekends: 3-4, 10-11, 17-18, 24-25 (8 weekend days)
            // Expected: 29 - 8 = 21 working days
            const workingDays = calculator.calculateWorkingDays(2, 2024, 'IT');
            expect(workingDays).toBe(21);
        });

        test('TDD: February 2023 (non-leap year) working days calculation', () => {
            // February 2023: 28 days, starts on Wednesday
            // Weekends: 4-5, 11-12, 18-19, 25-26 (8 weekend days)  
            // Expected: 28 - 8 = 20 working days
            const workingDays = calculator.calculateWorkingDays(2, 2023, 'IT');
            expect(workingDays).toBe(20);
        });

        test('TDD: Month with 30 days working days calculation', () => {
            // April 2024: 30 days, starts on Monday
            // Weekends: 6-7, 13-14, 20-21, 27-28 (8 weekend days)
            // Expected: 30 - 8 = 22 working days  
            const workingDays = calculator.calculateWorkingDays(4, 2024, 'IT');
            expect(workingDays).toBe(22);
        });
    });

    describe('Italian National Holidays Integration', () => {
        test('TDD: January 2024 with Italian holidays (New Year, Epiphany)', () => {
            // January 2024: 23 working days (base)
            // Italian holidays: Jan 1 (Mon - New Year), Jan 6 (Sat - Epiphany on weekend)
            // Only Jan 1 reduces working days (Jan 6 is weekend)
            // Expected: 23 - 1 = 22 working days
            const workingDays = calculator.calculateWorkingDays(1, 2024, 'IT');
            expect(workingDays).toBe(22);
        });

        test('TDD: December 2024 with multiple Italian holidays', () => {
            // December 2024: starts on Sunday
            // Base working days: 31 - 8 weekends = 23
            // Italian holidays: Dec 8 (Sun - weekend), Dec 25 (Wed), Dec 26 (Thu)
            // Dec 8 doesn\'t reduce (weekend), Dec 25 and 26 reduce by 2
            // Expected: 23 - 2 = 21 working days
            const workingDays = calculator.calculateWorkingDays(12, 2024, 'IT');
            expect(workingDays).toBe(21);
        });

        test('TDD: May 2024 with Labour Day (May 1st)', () => {
            // May 2024: 31 days, starts on Wednesday  
            // Base working days: 31 - 8 weekends = 23
            // Italian holidays: May 1 (Wed - Labour Day)
            // Expected: 23 - 1 = 22 working days
            const workingDays = calculator.calculateWorkingDays(5, 2024, 'IT');
            expect(workingDays).toBe(22);
        });

        test('TDD: April 2024 with Easter Monday', () => {
            // April 2024: 30 days, starts on Monday
            // Base working days: 30 - 8 weekends = 22  
            // Italian holidays: April 1 (Easter Monday), April 25 (Liberation Day)
            // Expected: 22 - 2 = 20 working days
            const workingDays = calculator.calculateWorkingDays(4, 2024, 'IT');
            expect(workingDays).toBe(20);
        });
    });

    describe('Romanian National Holidays Integration', () => {
        test('TDD: January 2024 with Romanian holidays', () => {
            // January 2024: 23 working days (base)
            // Romanian holidays: Jan 1 (Mon), Jan 2 (Tue), Jan 24 (Wed - Union Day)  
            // All are weekdays, reduce by 3
            // Expected: 23 - 3 = 20 working days
            const workingDays = calculator.calculateWorkingDays(1, 2024, 'RO');
            expect(workingDays).toBe(20);
        });

        test('TDD: December 2024 with Romanian Christmas holidays', () => {
            // December 2024: 23 base working days
            // Romanian holidays: Dec 1 (National Day - Sun), Dec 25 (Wed), Dec 26 (Thu)
            // Dec 1 doesn\'t reduce (weekend), Dec 25 and 26 reduce by 2
            // Expected: 23 - 2 = 21 working days  
            const workingDays = calculator.calculateWorkingDays(12, 2024, 'RO');
            expect(workingDays).toBe(21);
        });
    });

    describe('Holiday Data Management', () => {
        test('TDD: Italian holiday detection for specific dates', () => {
            expect(calculator.isNationalHoliday(new Date('2024-01-01'), 'IT')).toBe(true); // New Year
            expect(calculator.isNationalHoliday(new Date('2024-04-25'), 'IT')).toBe(true); // Liberation Day
            expect(calculator.isNationalHoliday(new Date('2024-12-25'), 'IT')).toBe(true); // Christmas
            expect(calculator.isNationalHoliday(new Date('2024-07-15'), 'IT')).toBe(false); // Random date
        });

        test('TDD: Romanian holiday detection for specific dates', () => {
            expect(calculator.isNationalHoliday(new Date('2024-01-24'), 'RO')).toBe(true); // Union Day
            expect(calculator.isNationalHoliday(new Date('2024-12-01'), 'RO')).toBe(true); // National Day
            expect(calculator.isNationalHoliday(new Date('2024-06-01'), 'RO')).toBe(true); // Children\'s Day
            expect(calculator.isNationalHoliday(new Date('2024-07-15'), 'RO')).toBe(false); // Random date
        });

        test('TDD: Invalid country code defaults to no holidays', () => {
            // Invalid country should not throw error, should calculate base working days
            const workingDays = calculator.calculateWorkingDays(1, 2024, 'INVALID');
            expect(workingDays).toBe(23); // Base calculation without holidays
        });
    });

    describe('Available Capacity Calculation', () => {
        test('TDD: Calculate available capacity with vacation days', () => {
            const teamMember = {
                id: 'tm-001',
                firstName: 'Mario',
                lastName: 'Rossi',
                vacationDays: {
                    2024: ['2024-02-15', '2024-02-16'] // 2 vacation days in February
                }
            };

            // February 2024: 21 working days (base)
            // Vacation: 2 days (both weekdays)
            // Available: 21 - 2 = 19 days
            const available = calculator.calculateAvailableCapacity(teamMember, '2024-02');
            expect(available).toBe(19);
        });

        test('TDD: Vacation on weekend should not reduce capacity', () => {
            const teamMember = {
                id: 'tm-002', 
                firstName: 'Anna',
                lastName: 'Bianchi',
                vacationDays: {
                    2024: ['2024-02-03', '2024-02-04'] // Saturday and Sunday
                }
            };

            // February 2024: 21 working days
            // Vacation on weekend doesn\'t reduce capacity
            // Available: 21 days (no reduction)
            const available = calculator.calculateAvailableCapacity(teamMember, '2024-02');
            expect(available).toBe(21);
        });

        test('TDD: Mixed vacation days (weekday and weekend)', () => {
            const teamMember = {
                id: 'tm-003',
                firstName: 'Luca', 
                lastName: 'Verdi',
                vacationDays: {
                    2024: ['2024-02-15', '2024-02-17', '2024-02-18'] // Thu, Sat, Sun
                }
            };

            // February 2024: 21 working days
            // Vacation: Feb 15 (Thu) reduces capacity, Feb 17-18 (weekend) don\'t
            // Available: 21 - 1 = 20 days  
            const available = calculator.calculateAvailableCapacity(teamMember, '2024-02');
            expect(available).toBe(20);
        });

        test('TDD: Vacation on national holiday should not double-reduce', () => {
            const teamMember = {
                id: 'tm-004',
                firstName: 'Sofia',
                lastName: 'Russo', 
                vacationDays: {
                    2024: ['2024-01-01', '2024-01-02'] // New Year (holiday) and next day
                }
            };

            // January 2024: 22 working days (with Italian holidays)
            // Vacation: Jan 1 is already a holiday, Jan 2 reduces by 1
            // Available: 22 - 1 = 21 days
            const available = calculator.calculateAvailableCapacity(teamMember, '2024-01', 'IT');
            expect(available).toBe(21);
        });
    });

    describe('Existing Allocations Integration', () => {
        test('TDD: Calculate available capacity with existing project allocations', () => {
            const teamMember = {
                id: 'tm-005',
                firstName: 'Marco',
                lastName: 'Neri',
                vacationDays: { 2024: [] }
            };

            // Mock existing allocations for this team member in February 2024
            calculator.setExistingAllocations('tm-005', '2024-02', 15); // 15 MDs already allocated

            // February 2024: 21 working days
            // Existing allocations: 15 MDs  
            // Available: 21 - 15 = 6 days
            const available = calculator.calculateAvailableCapacity(teamMember, '2024-02');
            expect(available).toBe(6);
        });

        test('TDD: Fully allocated team member has zero availability', () => {
            const teamMember = {
                id: 'tm-006',
                firstName: 'Elena',
                lastName: 'Rossi',
                vacationDays: { 2024: [] }
            };

            calculator.setExistingAllocations('tm-006', '2024-02', 21); // Fully allocated

            // February 2024: 21 working days
            // Existing allocations: 21 MDs (100% allocated)
            // Available: 21 - 21 = 0 days
            const available = calculator.calculateAvailableCapacity(teamMember, '2024-02');
            expect(available).toBe(0);
        });

        test('TDD: Over-allocated team member should not return negative availability', () => {
            const teamMember = {
                id: 'tm-007', 
                firstName: 'Giuseppe',
                lastName: 'Bianchi',
                vacationDays: { 2024: [] }
            };

            calculator.setExistingAllocations('tm-007', '2024-02', 25); // Over-allocated

            // February 2024: 21 working days
            // Existing allocations: 25 MDs (over-allocated)
            // Available: Math.max(0, 21 - 25) = 0 days (not negative)
            const available = calculator.calculateAvailableCapacity(teamMember, '2024-02');
            expect(available).toBe(0);
        });
    });

    describe('Caching and Performance', () => {
        test('TDD: Working days calculation should use caching', () => {
            const spy = jest.spyOn(calculator, '_calculateWorkingDaysUncached');

            // First call should calculate
            calculator.calculateWorkingDays(1, 2024, 'IT');
            expect(spy).toHaveBeenCalledTimes(1);

            // Second call should use cache  
            calculator.calculateWorkingDays(1, 2024, 'IT');
            expect(spy).toHaveBeenCalledTimes(1); // No additional call

            spy.mockRestore();
        });

        test('TDD: Different months should not share cache', () => {
            const spy = jest.spyOn(calculator, '_calculateWorkingDaysUncached');

            calculator.calculateWorkingDays(1, 2024, 'IT'); // January
            calculator.calculateWorkingDays(2, 2024, 'IT'); // February
            
            // Should calculate twice (different months)
            expect(spy).toHaveBeenCalledTimes(2);

            spy.mockRestore();
        });

        test('TDD: Cache should be cleared when needed', () => {
            calculator.calculateWorkingDays(1, 2024, 'IT');
            expect(calculator._cache.size).toBeGreaterThan(0);

            calculator.clearCache();
            expect(calculator._cache.size).toBe(0);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('TDD: Invalid month should throw descriptive error', () => {
            expect(() => {
                calculator.calculateWorkingDays(13, 2024, 'IT'); // Invalid month
            }).toThrow('Invalid month: 13. Month must be between 1 and 12.');
        });

        test('TDD: Invalid year should throw descriptive error', () => {
            expect(() => {
                calculator.calculateWorkingDays(1, 1900, 'IT'); // Too old
            }).toThrow('Invalid year: 1900. Year must be between 2020 and 2030.');
        });

        test('TDD: Future years should be supported (capacity planning)', () => {
            // Should support up to 2030 for long-term capacity planning
            expect(() => {
                calculator.calculateWorkingDays(1, 2030, 'IT');
            }).not.toThrow();
        });

        test('TDD: Null team member should not crash', () => {
            expect(() => {
                calculator.calculateAvailableCapacity(null, '2024-02');
            }).toThrow('Team member is required for capacity calculation');
        });

        test('TDD: Invalid month format should throw descriptive error', () => {
            const teamMember = { id: 'tm-001', vacationDays: {} };
            
            expect(() => {
                calculator.calculateAvailableCapacity(teamMember, '2024/02'); // Wrong format
            }).toThrow('Invalid month format. Expected YYYY-MM, got: 2024/02');
        });
    });

    describe('Multi-Year Support', () => {
        test('TDD: Calculation should work across year boundaries', () => {
            // December 2024 to January 2025 transition
            const dec2024 = calculator.calculateWorkingDays(12, 2024, 'IT');
            const jan2025 = calculator.calculateWorkingDays(1, 2025, 'IT');

            expect(dec2024).toBeGreaterThan(0);
            expect(jan2025).toBeGreaterThan(0);
            expect(dec2024).not.toBe(jan2025); // Should be different
        });

        test('TDD: Vacation days should work across years', () => {
            const teamMember = {
                id: 'tm-008',
                firstName: 'Carla',
                lastName: 'Rossi',
                vacationDays: {
                    2024: ['2024-12-30', '2024-12-31'], // End of 2024
                    2025: ['2025-01-02', '2025-01-03']  // Start of 2025
                }
            };

            const dec2024Available = calculator.calculateAvailableCapacity(teamMember, '2024-12');
            const jan2025Available = calculator.calculateAvailableCapacity(teamMember, '2025-01');

            // Both months should have reduced capacity
            expect(dec2024Available).toBeLessThan(22); // Typical max
            expect(jan2025Available).toBeLessThan(22); // Typical max
        });
    });
});