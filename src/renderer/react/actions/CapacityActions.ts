/**
 * Capacity Calculation Actions
 *
 * Business logic for calculating team member capacity considering:
 * - Working days (excluding weekends)
 * - National holidays (IT/RO)
 * - Team member vacation days
 * - Existing allocations across ALL projects (from global resourceAllocations)
 *
 * Integrates with:
 * - WorkingDaysCalculator (legacy) for working days calculation
 * - team-helpers.js for team member data
 * - resourceAllocations store (global) for existing allocations
 *
 * Pattern: State/Actions/Dispatcher
 * - NO direct state mutations
 * - ONLY business logic and calculations
 * - Returns structured results
 */

import type { TeamMember, CapacityResult, OverflowResult, MonthlyCapacity } from '../types/capacity';

export class CapacityActions {
    /**
     * Get store instance
     */
    private getStore(): any {
        return (window as any).appStore;
    }

    /**
     * Get WorkingDaysCalculator instance
     */
    private getCalculator(): any {
        return (window as any).WorkingDaysCalculator;
    }

    /**
     * Get team helpers
     */
    private getTeamHelpers(): any {
        return (window as any).TeamHelpers;
    }

    /**
     * Calculate available capacity for a team member in a specific month
     *
     * @param memberId - Team member ID
     * @param month - Month in format 'YYYY-MM'
     * @param startDate - Optional: start date if partial month (format 'YYYY-MM-DD')
     * @param endDate - Optional: end date if partial month (format 'YYYY-MM-DD')
     * @returns Capacity calculation result
     */
    calculateAvailableCapacity(
        memberId: string,
        month: string,
        startDate?: string,
        endDate?: string
    ): CapacityResult {
        try {
            // 1. Validate inputs
            if (!memberId || !month) {
                return this.createErrorResult('Invalid parameters: memberId and month are required');
            }

            const teamHelpers = this.getTeamHelpers();
            if (!teamHelpers) {
                return this.createErrorResult('TeamHelpers not available');
            }

            // 2. Get team member data
            const member = teamHelpers.getTeamMemberById(memberId);
            if (!member) {
                return this.createErrorResult(`Team member not found: ${memberId}`);
            }

            // 3. Parse month
            const [yearStr, monthStr] = month.split('-');
            const year = parseInt(yearStr);
            const monthNum = parseInt(monthStr);

            if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                return this.createErrorResult(`Invalid month format: ${month}. Expected YYYY-MM`);
            }

            const calculator = this.getCalculator();
            if (!calculator) {
                return this.createErrorResult('WorkingDaysCalculator not available');
            }

            // 4. Get country for holiday calendar
            const country = this.getCountryForMember(member);

            // 5. Calculate base working days
            let baseWorkingDays: number;

            if (startDate || endDate) {
                // Partial month calculation
                baseWorkingDays = this.calculatePartialMonthDays(
                    month,
                    startDate,
                    endDate,
                    country
                );
            } else {
                // Full month calculation
                baseWorkingDays = calculator.calculateWorkingDays(monthNum, year, country);
            }

            // 6. Subtract vacation days (only working days)
            const vacationDays = this.getVacationDaysInMonth(member, month, country);

            // 7. Get existing allocations from GLOBAL resourceAllocations store
            const existingAllocations = this.getExistingAllocationsForMonth(memberId, month);

            // 8. Calculate available capacity
            const availableCapacity = Math.max(
                0,
                baseWorkingDays - vacationDays - existingAllocations
            );

            // 9. Get monthly capacity
            const monthlyCapacity = teamHelpers.getTeamMemberCapacity(memberId);

            // 10. Calculate utilization percentage
            const utilization = monthlyCapacity > 0
                ? (existingAllocations / monthlyCapacity) * 100
                : 0;

            // 11. Determine status flags
            const isOverallocated = utilization > 100;
            const isNearCapacity = utilization >= 90 && utilization <= 100;

            return {
                success: true,
                memberId,
                month,
                baseWorkingDays,
                vacationDays,
                existingAllocations,
                availableCapacity,
                monthlyCapacity,
                utilization: Math.round(utilization * 10) / 10, // 1 decimal place
                isOverallocated,
                isNearCapacity
            };

        } catch (error: any) {
            console.error('Error calculating capacity:', error);
            return this.createErrorResult(`Error: ${error.message}`);
        }
    }

    /**
     * Get vacation days for member in specific month
     * Only counts vacation days that fall on working days (not weekends, not holidays)
     *
     * @private
     */
    private getVacationDaysInMonth(member: any, month: string, country: string): number {
        const [year, monthNum] = month.split('-');
        const yearNum = parseInt(year);
        const monthNumInt = parseInt(monthNum);

        const vacationDays = member.vacationDays?.[yearNum] || [];

        if (!Array.isArray(vacationDays) || vacationDays.length === 0) {
            return 0;
        }

        const calculator = this.getCalculator();
        let count = 0;

        // Count only vacation days that are working days
        vacationDays.forEach((dateStr: string) => {
            const date = new Date(dateStr);
            const vacMonth = date.getMonth() + 1; // getMonth() returns 0-11

            // Check if vacation is in this month
            if (vacMonth !== monthNumInt) {
                return;
            }

            // Check if it's a working day
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = calculator.isNationalHoliday(date, country);

            // Only count if it's a working day (not weekend, not holiday)
            if (!isWeekend && !isHoliday) {
                count++;
            }
        });

        return count;
    }

    /**
     * Get total allocated MDs for member in month (across ALL projects)
     * Uses global resourceAllocations from store
     *
     * @private
     */
    private getExistingAllocationsForMonth(memberId: string, month: string): number {
        const store = this.getStore();
        if (!store) {
            console.warn('Store not available');
            return 0;
        }

        const state = store.getState();
        if (!state || typeof state.getTotalAllocatedMDs !== 'function') {
            console.warn('getTotalAllocatedMDs not available in store');
            return 0;
        }

        // Use store query method (implemented in PROMPT 1)
        return state.getTotalAllocatedMDs(memberId, month) || 0;
    }

    /**
     * Calculate working days for partial month
     *
     * @private
     */
    private calculatePartialMonthDays(
        month: string,
        startDate: string | undefined,
        endDate: string | undefined,
        country: string
    ): number {
        const calculator = this.getCalculator();
        const [year, monthNum] = month.split('-');
        const yearNum = parseInt(year);
        const monthNumInt = parseInt(monthNum);

        // Default to full month if no dates provided
        const monthStart = new Date(yearNum, monthNumInt - 1, 1);
        const monthEnd = new Date(yearNum, monthNumInt, 0); // Last day of month

        const effectiveStart = startDate ? new Date(startDate) : monthStart;
        const effectiveEnd = endDate ? new Date(endDate) : monthEnd;

        // Validate dates
        if (effectiveStart > effectiveEnd) {
            console.warn('Start date is after end date, returning 0');
            return 0;
        }

        return calculator.calculateWorkingDaysBetween(effectiveStart, effectiveEnd);
    }

    /**
     * Get country for team member (from vendor)
     * Defaults to 'IT' if not found
     *
     * @private
     */
    private getCountryForMember(member: any): string {
        const store = this.getStore();
        const globalConfig = store?.getState()?.globalConfig;

        if (!globalConfig) {
            return 'IT'; // Default
        }

        // Check in suppliers
        if (globalConfig.suppliers && Array.isArray(globalConfig.suppliers)) {
            const supplier = globalConfig.suppliers.find((s: any) => s.id === member.vendorId);
            if (supplier?.country) {
                return supplier.country;
            }
        }

        // Check in internal resources
        if (globalConfig.internalResources && Array.isArray(globalConfig.internalResources)) {
            const internal = globalConfig.internalResources.find((i: any) => i.id === member.vendorId);
            if (internal?.country) {
                return internal.country;
            }
        }

        // Default to IT
        return 'IT';
    }

    /**
     * Check if allocation would cause overflow
     *
     * @param memberId - Team member ID
     * @param month - Month in format 'YYYY-MM'
     * @param proposedAllocation - Proposed MDs to allocate
     * @returns Overflow check result
     */
    checkCapacityOverflow(
        memberId: string,
        month: string,
        proposedAllocation: number
    ): OverflowResult {
        const capacity = this.calculateAvailableCapacity(memberId, month);

        if (!capacity.success) {
            return {
                hasOverflow: false,
                overflowAmount: 0,
                error: capacity.error
            };
        }

        const totalAfterAllocation = capacity.existingAllocations + proposedAllocation;
        const maxCapacity = capacity.monthlyCapacity;

        const hasOverflow = totalAfterAllocation > maxCapacity;
        const overflowAmount = hasOverflow
            ? totalAfterAllocation - maxCapacity
            : 0;

        const utilization = maxCapacity > 0
            ? (totalAfterAllocation / maxCapacity) * 100
            : 0;

        return {
            hasOverflow,
            overflowAmount,
            maxCapacity,
            totalAfterAllocation,
            utilization: Math.round(utilization * 10) / 10,
            currentAvailable: capacity.availableCapacity
        };
    }

    /**
     * Get capacity for multiple months (for timeline view)
     *
     * @param memberId - Team member ID
     * @param startMonth - Start month 'YYYY-MM'
     * @param endMonth - End month 'YYYY-MM'
     * @returns Array of monthly capacity results
     */
    calculateCapacityRange(
        memberId: string,
        startMonth: string,
        endMonth: string
    ): MonthlyCapacity[] {
        const months = this.generateMonthRange(startMonth, endMonth);

        return months.map(month => ({
            month,
            ...this.calculateAvailableCapacity(memberId, month)
        }));
    }

    /**
     * Generate array of months between start and end
     *
     * @private
     */
    private generateMonthRange(startMonth: string, endMonth: string): string[] {
        const months: string[] = [];
        const [startYear, startMon] = startMonth.split('-').map(Number);
        const [endYear, endMon] = endMonth.split('-').map(Number);

        let year = startYear;
        let month = startMon;

        // Safety: max 120 months (10 years)
        let iterations = 0;
        const maxIterations = 120;

        while ((year < endYear || (year === endYear && month <= endMon)) && iterations < maxIterations) {
            months.push(`${year}-${month.toString().padStart(2, '0')}`);

            month++;
            if (month > 12) {
                month = 1;
                year++;
            }

            iterations++;
        }

        return months;
    }

    /**
     * Get capacity summary for all team members (for dashboard)
     *
     * @param month - Month in format 'YYYY-MM'
     * @returns Array of capacity summaries
     */
    getCapacitySummaryForMonth(month: string): CapacityResult[] {
        const teamHelpers = this.getTeamHelpers();
        if (!teamHelpers) {
            return [];
        }

        const allMembers = teamHelpers.getAllTeamMembers();

        return allMembers.map((member: any) =>
            this.calculateAvailableCapacity(member.id, month)
        );
    }

    /**
     * Create error result
     *
     * @private
     */
    private createErrorResult(error: string): CapacityResult {
        return {
            success: false,
            error,
            memberId: '',
            month: '',
            baseWorkingDays: 0,
            vacationDays: 0,
            existingAllocations: 0,
            availableCapacity: 0,
            monthlyCapacity: 0,
            utilization: 0,
            isOverallocated: false,
            isNearCapacity: false
        };
    }
}

// Make CapacityActions available globally for backward compatibility
if (typeof window !== 'undefined') {
    (window as any).CapacityActions = CapacityActions;
}
