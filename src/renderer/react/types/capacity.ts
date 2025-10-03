/**
 * Capacity Type Definitions
 *
 * TypeScript interfaces for team member capacity calculations
 */

/**
 * Team Member interface
 * Maps to structure in globalConfig.teams[].members[]
 */
export interface TeamMember {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    role: string;
    vendorId: string;
    vendorType: 'supplier' | 'internal';
    monthlyCapacity: number; // Working days per month (default 22)
    vacationDays?: {
        [year: number]: string[]; // Array of ISO date strings 'YYYY-MM-DD'
    };
}

/**
 * Capacity Calculation Result
 * Returned by calculateAvailableCapacity()
 */
export interface CapacityResult {
    success: boolean;
    error?: string;
    memberId: string;
    month: string; // Format: 'YYYY-MM'
    baseWorkingDays: number; // Working days in month (excludes weekends/holidays)
    vacationDays: number; // Vacation days that fall on working days
    existingAllocations: number; // Total MDs already allocated (across ALL projects)
    availableCapacity: number; // baseWorkingDays - vacationDays - existingAllocations
    monthlyCapacity: number; // Member's monthly capacity (default 22)
    utilization: number; // Percentage: (existingAllocations / monthlyCapacity) * 100
    isOverallocated: boolean; // True if utilization > 100%
    isNearCapacity: boolean; // True if utilization >= 90% && <= 100%
}

/**
 * Overflow Check Result
 * Returned by checkCapacityOverflow()
 */
export interface OverflowResult {
    hasOverflow: boolean;
    overflowAmount: number; // How many MDs over capacity (0 if no overflow)
    maxCapacity?: number;
    totalAfterAllocation?: number;
    utilization?: number; // Percentage after proposed allocation
    currentAvailable?: number;
    error?: string;
}

/**
 * Monthly Capacity for Timeline View
 * Returned by calculateCapacityRange()
 */
export interface MonthlyCapacity extends CapacityResult {
    month: string; // Format: 'YYYY-MM'
}

/**
 * Resource Allocation Entry
 * Stored in global resourceAllocations array in store
 */
export interface ResourceAllocation {
    id: string; // Unique allocation ID
    projectId: string;
    projectName?: string;
    teamMemberId: string;
    role?: string;
    monthlyAllocations: {
        [month: string]: { // Format: 'YYYY-MM'
            planned: number; // Planned MDs
            actual?: number; // Actual MDs (for tracking)
        };
    };
    startDate?: string; // ISO date 'YYYY-MM-DD'
    endDate?: string; // ISO date 'YYYY-MM-DD'
    notes?: string;
}

/**
 * Capacity Summary for Dashboard
 */
export interface CapacitySummary {
    month: string;
    totalMembers: number;
    totalCapacity: number;
    totalAllocated: number;
    totalAvailable: number;
    utilizationAverage: number;
    overallocatedCount: number;
    nearCapacityCount: number;
}
