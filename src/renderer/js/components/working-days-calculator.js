/**
 * Working Days Calculator
 * 
 * Calculates working days in a month excluding:
 * - Weekends (Saturday, Sunday)
 * - National holidays (Italy, Romania)  
 * - Team member vacation days
 * - Existing project allocations
 * 
 * Implements caching for performance optimization.
 */

class WorkingDaysCalculator {
    constructor() {
        this._cache = new Map();
        this._existingAllocations = new Map(); // teamMemberId-month -> allocated MDs
        
        this.initializeHolidays();
    }

    /**
     * Initialize national holidays data for Italy and Romania
     */
    initializeHolidays() {
        this.holidays = {
            IT: {
                2024: [
                    '2024-01-01', // New Year's Day
                    '2024-01-06', // Epiphany
                    '2024-04-01', // Easter Monday
                    '2024-04-25', // Liberation Day
                    '2024-05-01', // Labour Day
                    '2024-06-02', // Republic Day
                    '2024-08-15', // Assumption of Mary
                    '2024-11-01', // All Saints' Day
                    '2024-12-08', // Immaculate Conception
                    '2024-12-25', // Christmas Day
                    '2024-12-26'  // St. Stephen's Day
                ],
                2025: [
                    '2025-01-01', '2025-01-06', '2025-04-21', '2025-04-25',
                    '2025-05-01', '2025-06-02', '2025-08-15', '2025-11-01',
                    '2025-12-08', '2025-12-25', '2025-12-26'
                ],
                2026: [
                    '2026-01-01', '2026-01-06', '2026-04-06', '2026-04-25',
                    '2026-05-01', '2026-06-02', '2026-08-15', '2026-11-01',
                    '2026-12-08', '2026-12-25', '2026-12-26'
                ],
                2027: [
                    '2027-01-01', '2027-01-06', '2027-03-29', '2027-04-25',
                    '2027-05-01', '2027-06-02', '2027-08-15', '2027-11-01',
                    '2027-12-08', '2027-12-25', '2027-12-26'
                ],
                2028: [
                    '2028-01-01', '2028-01-06', '2028-04-17', '2028-04-25',
                    '2028-05-01', '2028-06-02', '2028-08-15', '2028-11-01',
                    '2028-12-08', '2028-12-25', '2028-12-26'
                ],
                2029: [
                    '2029-01-01', '2029-01-06', '2029-04-02', '2029-04-25',
                    '2029-05-01', '2029-06-02', '2029-08-15', '2029-11-01',
                    '2029-12-08', '2029-12-25', '2029-12-26'
                ],
                2030: [
                    '2030-01-01', '2030-01-06', '2030-04-22', '2030-04-25',
                    '2030-05-01', '2030-06-02', '2030-08-15', '2030-11-01',
                    '2030-12-08', '2030-12-25', '2030-12-26'
                ]
            },
            RO: {
                2024: [
                    '2024-01-01', '2024-01-02', // New Year
                    '2024-01-24', // Union Day
                    '2024-04-29', '2024-05-05', '2024-05-06', // Orthodox Easter
                    '2024-05-01', // Labour Day
                    '2024-06-01', // Children's Day
                    '2024-06-24', // Orthodox Pentecost
                    '2024-08-15', // Assumption of Mary
                    '2024-11-30', // St. Andrew's Day
                    '2024-12-01', // National Day
                    '2024-12-25', '2024-12-26' // Christmas
                ],
                2025: [
                    '2025-01-01', '2025-01-02', '2025-01-24',
                    '2025-04-20', '2025-04-21', '2025-05-01',
                    '2025-06-01', '2025-06-08', '2025-08-15',
                    '2025-11-30', '2025-12-01', '2025-12-25', '2025-12-26'
                ],
                2026: [
                    '2026-01-01', '2026-01-02', '2026-01-24',
                    '2026-04-12', '2026-04-13', '2026-05-01',
                    '2026-06-01', '2026-05-31', '2026-08-15',
                    '2026-11-30', '2026-12-01', '2026-12-25', '2026-12-26'
                ],
                2027: [
                    '2027-01-01', '2027-01-02', '2027-01-24',
                    '2027-05-02', '2027-05-03', '2027-05-01',
                    '2027-06-01', '2027-06-20', '2027-08-15',
                    '2027-11-30', '2027-12-01', '2027-12-25', '2027-12-26'
                ],
                2028: [
                    '2028-01-01', '2028-01-02', '2028-01-24',
                    '2028-04-16', '2028-04-17', '2028-05-01',
                    '2028-06-01', '2028-06-04', '2028-08-15',
                    '2028-11-30', '2028-12-01', '2028-12-25', '2028-12-26'
                ],
                2029: [
                    '2029-01-01', '2029-01-02', '2029-01-24',
                    '2029-04-08', '2029-04-09', '2029-05-01',
                    '2029-06-01', '2029-05-27', '2029-08-15',
                    '2029-11-30', '2029-12-01', '2029-12-25', '2029-12-26'
                ],
                2030: [
                    '2030-01-01', '2030-01-02', '2030-01-24',
                    '2030-04-28', '2030-04-29', '2030-05-01',
                    '2030-06-01', '2030-06-16', '2030-08-15',
                    '2030-11-30', '2030-12-01', '2030-12-25', '2030-12-26'
                ]
            }
        };
    }

    /**
     * Calculate working days in a month excluding weekends and national holidays
     * @param {number} month Month (1-12)
     * @param {number} year Year (2020-2030)
     * @param {string} country Holiday calendar ('IT' or 'RO')
     * @returns {number} Working days count
     */
    calculateWorkingDays(month, year, country = 'IT') {
        // Validation
        this._validateMonth(month);
        this._validateYear(year);

        // Check cache first
        const cacheKey = `${month}-${year}-${country}`;
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }

        // Calculate and cache result
        const workingDays = this._calculateWorkingDaysUncached(month, year, country);
        this._cache.set(cacheKey, workingDays);

        return workingDays;
    }

    /**
     * Internal working days calculation without caching
     * @private
     */
    _calculateWorkingDaysUncached(month, year, country) {
        const daysInMonth = new Date(year, month, 0).getDate();
        let workingDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();

            // Skip weekends (Saturday = 6, Sunday = 0)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                continue;
            }

            // Skip national holidays
            if (this.isNationalHoliday(date, country)) {
                continue;
            }

            workingDays++;
        }

        return workingDays;
    }

    /**
     * Check if a date is a national holiday
     * @param {Date} date Date to check
     * @param {string} country Country code ('IT' or 'RO')
     * @returns {boolean} True if date is a national holiday
     */
    isNationalHoliday(date, country = 'IT') {
        const year = date.getFullYear();
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format

        const countryHolidays = this.holidays[country];
        if (!countryHolidays || !countryHolidays[year]) {
            return false; // No holiday data for this country/year
        }

        return countryHolidays[year].includes(dateString);
    }

    /**
     * Calculate available capacity for a team member in a specific month
     * @param {Object} teamMember Team member object with vacation data
     * @param {string} month Month in YYYY-MM format
     * @param {string} country Country for holiday calendar
     * @returns {number} Available capacity in working days
     */
    calculateAvailableCapacity(teamMember, month, country = 'IT') {
        if (!teamMember) {
            throw new Error('Team member is required for capacity calculation');
        }

        this._validateMonthFormat(month);

        const [year, monthNum] = month.split('-').map(Number);

        // Get base working days
        const baseWorkingDays = this.calculateWorkingDays(monthNum, year, country);

        // Subtract vacation days
        const vacationDays = this._countVacationDaysInMonth(teamMember, month);

        // Subtract existing allocations  
        const existingAllocations = this._getExistingAllocations(teamMember.id, month);

        const availableCapacity = baseWorkingDays - vacationDays - existingAllocations;

        return Math.max(0, availableCapacity); // Cannot be negative
    }

    /**
     * Count vacation days for a team member in a specific month
     * Only counts weekdays (weekends don't reduce capacity)
     * @private
     */
    _countVacationDaysInMonth(teamMember, month) {
        const [year, monthNum] = month.split('-').map(Number);
        const vacationDays = teamMember.vacationDays?.[year] || [];

        let vacationCount = 0;

        vacationDays.forEach(vacationDate => {
            const vDate = new Date(vacationDate);
            if (vDate.getMonth() + 1 === monthNum) {
                const dayOfWeek = vDate.getDay();
                
                // Only count weekdays as vacation (weekends don't reduce capacity)
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    // Don't double-count if vacation is on a national holiday
                    if (!this.isNationalHoliday(vDate, 'IT')) {
                        vacationCount++;
                    }
                }
            }
        });

        return vacationCount;
    }

    /**
     * Get existing allocations for a team member in a specific month
     * @private
     */
    _getExistingAllocations(teamMemberId, month) {
        const key = `${teamMemberId}-${month}`;
        return this._existingAllocations.get(key) || 0;
    }

    /**
     * Set existing allocations for testing purposes
     * @param {string} teamMemberId Team member ID
     * @param {string} month Month in YYYY-MM format  
     * @param {number} allocatedMDs Allocated man days
     */
    setExistingAllocations(teamMemberId, month, allocatedMDs) {
        const key = `${teamMemberId}-${month}`;
        this._existingAllocations.set(key, allocatedMDs);
    }

    /**
     * Clear the working days cache
     */
    clearCache() {
        this._cache.clear();
    }

    /**
     * Validate month parameter
     * @private
     */
    _validateMonth(month) {
        if (typeof month !== 'number' || month < 1 || month > 12) {
            throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
        }
    }

    /**
     * Validate year parameter  
     * @private
     */
    _validateYear(year) {
        if (typeof year !== 'number' || year < 2020 || year > 2030) {
            throw new Error(`Invalid year: ${year}. Year must be between 2020 and 2030.`);
        }
    }

    /**
     * Calculate available capacity for team member in specific month
     * @param {Object} teamMember Team member object
     * @param {string} monthString Month in YYYY-MM format
     * @param {Date} startDate Optional start date for partial month calculation
     * @param {boolean} excludeExistingAllocations If true, don't subtract existing allocations from other projects
     * @returns {number} Available working days
     */
    calculateAvailableCapacity(teamMember, monthString, startDate = null, excludeExistingAllocations = false) {
        const [year, month] = monthString.split('-').map(Number);
        
        // Calculate base working days for the month
        let baseCapacity = this.calculateWorkingDays(month, year, teamMember.country || 'IT');
        console.log(`DEBUG WDC: ${monthString} - initial baseCapacity: ${baseCapacity}`);
        
        // Handle partial month if start date is provided
        if (startDate) {
            const startYear = startDate.getFullYear();
            const startMonth = startDate.getMonth() + 1;
            console.log(`DEBUG WDC: ${monthString} - startDate provided: ${startDate.toISOString().split('T')[0]}, startYear: ${startYear}, startMonth: ${startMonth}`);
            
            if (startYear === year && startMonth === month) {
                // Calculate working days from start date to end of month
                const monthEnd = new Date(year, month, 0); // Last day of current month
                console.log(`DEBUG WDC: ${monthString} - calculating partial month from ${startDate.toISOString().split('T')[0]} to ${monthEnd.toISOString().split('T')[0]}`);
                baseCapacity = this.calculateWorkingDaysBetween(startDate, monthEnd);
                console.log(`DEBUG WDC: ${monthString} - partial month baseCapacity: ${baseCapacity}`);
            }
        }
        
        // Subtract team member vacation days if any
        const vacationDays = this._getVacationDays(teamMember.id, monthString);
        console.log(`DEBUG WDC: ${monthString} - vacationDays: ${vacationDays}`);
        
        // Subtract existing allocations from other projects only if not excluded
        const existingAllocations = excludeExistingAllocations ? 0 : this._getExistingAllocations(teamMember.id, monthString);
        console.log(`DEBUG WDC: ${monthString} - existingAllocations: ${existingAllocations}, excludeExistingAllocations: ${excludeExistingAllocations}`);
        
        const finalCapacity = Math.max(0, baseCapacity - vacationDays - existingAllocations);
        console.log(`DEBUG WDC: ${monthString} - finalCapacity: ${finalCapacity} (${baseCapacity} - ${vacationDays} - ${existingAllocations})`);
        
        return finalCapacity;
    }

    /**
     * Calculate working days between two dates
     * @param {Date} startDate Start date (inclusive)
     * @param {Date} endDate End date (inclusive)
     * @returns {number} Working days count
     */
    calculateWorkingDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let workingDays = 0;
        const current = new Date(start);
        
        while (current <= end) {
            const dayOfWeek = current.getDay();
            const dateString = current.toISOString().split('T')[0];
            
            // Skip weekends and holidays
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !this._isHoliday(dateString)) {
                workingDays++;
            }
            
            current.setDate(current.getDate() + 1);
        }
        
        return workingDays;
    }

    /**
     * Get vacation days for team member in specific month
     * @private
     * @param {string} teamMemberId Team member ID
     * @param {string} monthString Month in YYYY-MM format
     * @returns {number} Vacation days count
     */
    _getVacationDays(teamMemberId, monthString) {
        // Implementation to get vacation days from team member data
        // For now, return 0 as default implementation
        return 0;
    }

    /**
     * Get existing allocations for team member in specific month
     * @private
     * @param {string} teamMemberId Team member ID
     * @param {string} monthString Month in YYYY-MM format
     * @returns {number} Existing allocated MDs
     */
    _getExistingAllocations(teamMemberId, monthString) {
        const key = `${teamMemberId}-${monthString}`;
        return this._existingAllocations.get(key) || 0;
    }

    /**
     * Check if date is a holiday
     * @private
     * @param {string} dateString Date in YYYY-MM-DD format
     * @returns {boolean} True if date is a holiday
     */
    _isHoliday(dateString) {
        const year = parseInt(dateString.split('-')[0]);
        const country = 'IT'; // Default to Italy, can be made configurable
        const holidays = this.holidays[country] && this.holidays[country][year] || [];
        return holidays.includes(dateString);
    }

    /**
     * Set existing allocations for capacity calculation
     * @param {string} teamMemberId Team member ID
     * @param {string} monthString Month in YYYY-MM format
     * @param {number} allocatedMDs Allocated man days
     */
    setExistingAllocations(teamMemberId, monthString, allocatedMDs) {
        const key = `${teamMemberId}-${monthString}`;
        this._existingAllocations.set(key, allocatedMDs);
    }

    /**
     * Validate month format (YYYY-MM)
     * @private
     */
    _validateMonthFormat(month) {
        const monthRegex = /^\d{4}-\d{2}$/;
        if (!monthRegex.test(month)) {
            throw new Error(`Invalid month format. Expected YYYY-MM, got: ${month}`);
        }
    }
}

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkingDaysCalculator;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.WorkingDaysCalculator = WorkingDaysCalculator;
}