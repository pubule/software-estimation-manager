/**
 * Allocation Type Definitions
 *
 * TypeScript interfaces for resource allocation management
 */

/**
 * Phase Allocation (per-phase allocation data)
 * Used when allocating MDs per project phase
 */
export interface PhaseAllocation {
    phaseId: string;
    phaseName: string;

    // NEW: Distinguish between project total (READ-ONLY) and allocated (EDITABLE)
    phaseTotalMDs: number;  // Total MDs for this role from project phase (informational, READ-ONLY)
    allocatedMDs: number;    // MDs actually allocated to this team member (EDITABLE)
    originalAllocatedMDs?: number; // Original value from mdsForRole calculation (for reset button)

    // DEPRECATED: Use phaseTotalMDs and allocatedMDs instead
    totalMDs?: number;       // For backward compatibility with existing allocations

    startDate: string; // ISO date 'YYYY-MM-DD'
    endDate: string;   // ISO date 'YYYY-MM-DD'
}

/**
 * Allocation Form Data (input from user)
 * Used when creating new allocations via Assignment Modal
 */
export interface AllocationFormData {
    projectId: string;
    projectName?: string;
    teamMemberId: string;

    // NUOVO: Per allocazioni multi-fase (sostituisce totalMDs/startDate/endDate)
    phaseAllocations?: PhaseAllocation[];

    // LEGACY: Per allocazioni semplici (backward compatibility)
    totalMDs?: number; // Optional if using phaseAllocations or monthlyAllocations
    startDate?: string; // ISO date 'YYYY-MM-DD'
    endDate?: string;   // ISO date 'YYYY-MM-DD'

    monthlyAllocations?: MonthlyAllocations;
    notes?: string;
}

/**
 * Monthly Allocations Map
 * Key: month in 'YYYY-MM' format
 * Value: planned and actual MDs
 */
export interface MonthlyAllocations {
    [month: string]: {
        planned: number;
        actual?: number;
    };
}

/**
 * Allocation Result (operation outcome)
 * Returned by create/update/delete methods
 */
export interface AllocationResult {
    success: boolean;
    error?: string;
    allocationId?: string;
    allocation?: any; // Full allocation object if needed
    hasOverflow?: boolean;
    overflowAmount?: number;
    warnings?: string[];
}

/**
 * Monthly Distribution Result
 * Returned by auto-distribution methods
 */
export interface MonthlyDistribution {
    [month: string]: {
        planned: number;
        actual: number;
        locked?: boolean;
    };
    hasOverflow: boolean;
    overflowAmount: number;
    hasUnallocatedMDs?: boolean;
    unallocatedAmount?: number;
}

/**
 * Phase Definition (for multi-phase projects)
 * Used in autoDistributePhases()
 */
export interface Phase {
    phaseId: string;
    phaseName: string;
    startDate: string; // ISO date
    endDate: string;   // ISO date
    estimatedMDs: number;
}

/**
 * Phase Distribution Result
 * Returned by autoDistributePhases()
 */
export interface PhaseDistributionResult {
    [month: string]: {
        planned: number;
        actual: number;
        locked?: boolean;
    };
    hasOverflow: boolean;
    overflowAmount: number;
    phaseBreakdown?: {
        [phaseId: string]: {
            allocated: number;
            needed: number;
            completed: boolean;
            overflow?: number;
            monthlyDistribution: {
                [month: string]: number;
            };
        };
    };
}

/**
 * Validation Result
 * Returned by validateAllocation()
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Overflow Analysis
 * Returned by checkAllocationOverflow()
 */
export interface OverflowAnalysis {
    hasOverflow: boolean;
    overflowByMonth: {
        [month: string]: number;
    };
    totalOverflow: number;
    affectedMonths: string[];
    details?: string;
}

/**
 * Member Availability Result
 * Returned by checkMemberAvailability()
 */
export interface AvailabilityResult {
    isAvailable: boolean;
    availabilityByMonth: {
        [month: string]: {
            totalCapacity: number;
            existingAllocations: number;
            availableCapacity: number;
            utilization: number;
        };
    };
    overallUtilization: number;
    constraints?: string[];
}

/**
 * Redistribution Options
 * Options for redistributeAfterUserChange()
 */
export interface RedistributionOptions {
    lockPastMonths?: boolean; // Don't redistribute to past months (default: true)
    lockSpecificMonths?: string[]; // Specific months to lock
    allowOverflow?: boolean; // Allow creating overflow if needed (default: false)
}

/**
 * Auto-Distribution Options
 * Options for autoDistributeMDs()
 */
export interface AutoDistributionOptions {
    safetyBufferPercentage?: number; // Use % of available capacity (default: 1.0 = 100%)
    excludeExistingAllocations?: boolean; // Exclude allocations from other projects (default: false)
    preferEvenDistribution?: boolean; // Try to distribute evenly vs. sequential (default: false)
}
