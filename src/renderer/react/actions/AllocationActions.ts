/**
 * Allocation Actions
 *
 * Business logic for managing resource allocations including:
 * - CRUD operations on allocations
 * - Auto-distribution of MDs across months (wrapping AutoDistribution legacy)
 * - Validation and overflow detection
 * - Cross-project allocation tracking
 * - Integration with global resourceAllocations store
 *
 * Integrates with:
 * - app-store.js (global resourceAllocations state)
 * - AutoDistribution (legacy) for intelligent MD distribution
 * - CapacityActions for capacity validation
 * - TeamHelpers for team member queries
 * - DataManager for persistence to capacity/allocations.json
 *
 * Pattern: State/Actions/Dispatcher
 * - NO direct state mutations
 * - ONLY business logic and operations
 * - Returns structured results
 */

import type {
    AllocationFormData,
    AllocationResult,
    MonthlyDistribution,
    MonthlyAllocations,
    Phase,
    PhaseDistributionResult,
    ValidationResult,
    OverflowAnalysis,
    AvailabilityResult,
    RedistributionOptions,
    AutoDistributionOptions
} from '../types/allocation';

import { CapacityActions } from './CapacityActions';

export class AllocationActions {
    private capacityActions: CapacityActions;

    constructor() {
        this.capacityActions = new CapacityActions();
    }

    /**
     * Get store instance
     */
    private getStore(): any {
        return (window as any).appStore;
    }

    /**
     * Get AutoDistribution instance (legacy)
     */
    private getAutoDistribution(): any {
        // AutoDistribution is a class, need to instantiate it
        const AutoDistributionClass = (window as any).AutoDistribution;
        if (!AutoDistributionClass) {
            throw new Error('AutoDistribution not available');
        }

        const workingDaysCalculator = (window as any).WorkingDaysCalculator;
        const teamHelpers = (window as any).TeamHelpers;

        if (!workingDaysCalculator || !teamHelpers) {
            throw new Error('Dependencies not available for AutoDistribution');
        }

        // Create instance with dependencies
        return new AutoDistributionClass(workingDaysCalculator, {
            getTeamMemberById: teamHelpers.getTeamMemberById.bind(teamHelpers)
        });
    }

    /**
     * Get DataManager instance
     */
    private getDataManager(): any {
        return (window as any).appController?.managers?.data;
    }

    /**
     * Get TeamHelpers
     */
    private getTeamHelpers(): any {
        return (window as any).TeamHelpers;
    }

    // ======================
    // CREATE OPERATIONS
    // ======================

    /**
     * Create new resource allocation
     *
     * @param data - Allocation form data
     * @returns Allocation result with success/error
     */
    createAllocation(data: AllocationFormData): AllocationResult {
        try {
            // 1. Validate input
            const validation = this.validateAllocation(data);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.errors.join(', '),
                    warnings: validation.warnings
                };
            }

            // 2. Generate allocation ID
            const allocationId = this.generateAllocationId();

            // 3. Prepare monthly allocations
            let monthlyAllocations: MonthlyAllocations = {};
            let hasOverflow = false;
            let overflowAmount = 0;

            if (data.monthlyAllocations) {
                // Use provided monthly allocations
                monthlyAllocations = data.monthlyAllocations;
            } else if (data.phaseAllocations && data.phaseAllocations.length > 0 && data.teamMemberId) {
                // Phase-based allocation - use autoDistributePhases
                const phases: Phase[] = data.phaseAllocations.map(pa => ({
                    phaseId: pa.phaseId,
                    phaseName: pa.phaseName,
                    startDate: pa.startDate,
                    endDate: pa.endDate,
                    estimatedMDs: pa.totalMDs
                }));

                const distribution = this.autoDistributePhases(phases, data.teamMemberId);

                // Extract monthly allocations (excluding metadata)
                Object.keys(distribution).forEach(key => {
                    if (!['hasOverflow', 'overflowAmount', 'phaseBreakdown', 'error'].includes(key)) {
                        monthlyAllocations[key] = {
                            planned: distribution[key].planned,
                            actual: distribution[key].actual || distribution[key].planned
                        };
                    }
                });

                hasOverflow = distribution.hasOverflow;
                overflowAmount = distribution.overflowAmount;

                // Calculate date range from phases
                const allDates = data.phaseAllocations.flatMap(p => [p.startDate, p.endDate]);
                data.startDate = allDates.sort()[0];
                data.endDate = allDates.sort()[allDates.length - 1];
            } else if (data.totalMDs && data.startDate && data.endDate && data.teamMemberId) {
                // Simple allocation - auto-distribute MDs
                const distribution = this.autoDistributeMDs(
                    data.totalMDs,
                    data.startDate,
                    data.endDate,
                    data.teamMemberId
                );

                // Extract monthly allocations (excluding metadata)
                Object.keys(distribution).forEach(key => {
                    if (!['hasOverflow', 'overflowAmount', 'hasUnallocatedMDs', 'unallocatedAmount'].includes(key)) {
                        monthlyAllocations[key] = {
                            planned: distribution[key].planned,
                            actual: distribution[key].actual || distribution[key].planned
                        };
                    }
                });

                hasOverflow = distribution.hasOverflow;
                overflowAmount = distribution.overflowAmount;
            } else {
                return {
                    success: false,
                    error: 'Either monthlyAllocations, phaseAllocations, or (totalMDs, startDate, endDate) must be provided'
                };
            }

            // 4. Create allocation object
            const allocation = {
                id: allocationId,
                projectId: data.projectId,
                projectName: data.projectName || 'Unnamed Project',
                teamMemberId: data.teamMemberId,
                monthlyAllocations,
                startDate: data.startDate,
                endDate: data.endDate,
                notes: data.notes || '',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            // 5. Add to store
            const store = this.getStore();
            if (!store) {
                return { success: false, error: 'Store not available' };
            }

            store.getState().addResourceAllocation(allocation);

            // 6. Auto-save
            this.saveAllocations();

            return {
                success: true,
                allocationId,
                allocation,
                hasOverflow,
                overflowAmount,
                warnings: validation.warnings
            };

        } catch (error: any) {
            console.error('Error creating allocation:', error);
            return {
                success: false,
                error: `Failed to create allocation: ${error.message}`
            };
        }
    }

    // ======================
    // READ OPERATIONS
    // ======================

    /**
     * Get all allocations for a team member
     *
     * @param memberId - Team member ID
     * @returns Array of allocations
     */
    getAllocationsForMember(memberId: string): any[] {
        const store = this.getStore();
        if (!store) return [];

        return store.getState().getAllocationsForMember(memberId) || [];
    }

    /**
     * Get all allocations for a project
     *
     * @param projectId - Project ID
     * @returns Array of allocations
     */
    getAllocationsForProject(projectId: string): any[] {
        const store = this.getStore();
        if (!store) return [];

        return store.getState().getAllocationsForProject(projectId) || [];
    }

    /**
     * Get allocations for a specific month
     *
     * @param memberId - Team member ID
     * @param month - Month in 'YYYY-MM' format
     * @returns Array of allocations
     */
    getAllocationsForMonth(memberId: string, month: string): any[] {
        const store = this.getStore();
        if (!store) return [];

        return store.getState().getAllocationsForMonth(memberId, month) || [];
    }

    /**
     * Get allocation by ID
     *
     * @param id - Allocation ID
     * @returns Allocation object or null
     */
    getAllocationById(id: string): any | null {
        const store = this.getStore();
        if (!store) return null;

        const allocations = store.getState().resourceAllocations || [];
        return allocations.find((a: any) => a.id === id) || null;
    }

    /**
     * Get all allocations
     *
     * @returns Array of all allocations
     */
    getAllAllocations(): any[] {
        const store = this.getStore();
        if (!store) return [];

        return store.getState().resourceAllocations || [];
    }

    // ======================
    // UPDATE OPERATIONS
    // ======================

    /**
     * Update allocation
     *
     * @param id - Allocation ID
     * @param updates - Partial allocation data to update
     * @returns Allocation result
     */
    updateAllocation(id: string, updates: Partial<any>): AllocationResult {
        try {
            const store = this.getStore();
            if (!store) {
                return { success: false, error: 'Store not available' };
            }

            // Check if allocation exists
            const existing = this.getAllocationById(id);
            if (!existing) {
                return { success: false, error: 'Allocation not found' };
            }

            // Update in store
            store.getState().updateResourceAllocation(id, updates);

            // Auto-save
            this.saveAllocations();

            return {
                success: true,
                allocationId: id,
                allocation: this.getAllocationById(id)
            };

        } catch (error: any) {
            console.error('Error updating allocation:', error);
            return {
                success: false,
                error: `Failed to update allocation: ${error.message}`
            };
        }
    }

    /**
     * Update monthly allocation for a specific month
     *
     * @param id - Allocation ID
     * @param month - Month in 'YYYY-MM' format
     * @param mds - New MD value
     * @returns Allocation result
     */
    updateMonthlyAllocation(id: string, month: string, mds: number): AllocationResult {
        try {
            const allocation = this.getAllocationById(id);
            if (!allocation) {
                return { success: false, error: 'Allocation not found' };
            }

            // Update the specific month
            const updatedMonthlyAllocations = {
                ...allocation.monthlyAllocations,
                [month]: {
                    planned: mds,
                    actual: mds
                }
            };

            return this.updateAllocation(id, {
                monthlyAllocations: updatedMonthlyAllocations
            });

        } catch (error: any) {
            console.error('Error updating monthly allocation:', error);
            return {
                success: false,
                error: `Failed to update monthly allocation: ${error.message}`
            };
        }
    }

    // ======================
    // DELETE OPERATIONS
    // ======================

    /**
     * Delete allocation
     *
     * @param id - Allocation ID
     * @returns Allocation result
     */
    deleteAllocation(id: string): AllocationResult {
        try {
            const store = this.getStore();
            if (!store) {
                return { success: false, error: 'Store not available' };
            }

            // Check if exists
            const existing = this.getAllocationById(id);
            if (!existing) {
                return { success: false, error: 'Allocation not found' };
            }

            // Delete from store
            store.getState().deleteResourceAllocation(id);

            // Auto-save
            this.saveAllocations();

            return { success: true };

        } catch (error: any) {
            console.error('Error deleting allocation:', error);
            return {
                success: false,
                error: `Failed to delete allocation: ${error.message}`
            };
        }
    }

    // ======================
    // AUTO-DISTRIBUTION METHODS (Legacy Integration)
    // ======================

    /**
     * Auto-distribute MDs across months using legacy AutoDistribution
     *
     * @param totalMDs - Total MDs to distribute
     * @param startDate - Start date (ISO string 'YYYY-MM-DD')
     * @param endDate - End date (ISO string 'YYYY-MM-DD')
     * @param memberId - Team member ID
     * @param options - Distribution options
     * @returns Monthly distribution result
     */
    autoDistributeMDs(
        totalMDs: number,
        startDate: string,
        endDate: string,
        memberId: string,
        options?: AutoDistributionOptions
    ): MonthlyDistribution {
        try {
            // Get team member
            const teamHelpers = this.getTeamHelpers();
            const teamMember = teamHelpers.getTeamMemberById(memberId);

            if (!teamMember) {
                throw new Error(`Team member not found: ${memberId}`);
            }

            // Get existing allocations for this member
            const existingAllocations = this.getExistingAllocationsMap(memberId);

            // Get AutoDistribution instance
            const autoDistributor = this.getAutoDistribution();

            // Call legacy auto-distribution
            const distribution = autoDistributor.autoDistributeMDs(
                totalMDs,
                new Date(startDate),
                new Date(endDate),
                memberId,
                existingAllocations
            );

            return distribution as MonthlyDistribution;

        } catch (error: any) {
            console.error('Error in auto-distribution:', error);
            return {
                hasOverflow: true,
                overflowAmount: totalMDs,
                error: error.message
            } as MonthlyDistribution;
        }
    }

    /**
     * Auto-distribute multiple phases sequentially
     *
     * @param phases - Array of phase objects
     * @param memberId - Team member ID
     * @returns Phase distribution result
     */
    autoDistributePhases(
        phases: Phase[],
        memberId: string
    ): PhaseDistributionResult {
        try {
            // Get existing allocations
            const existingAllocations = this.getExistingAllocationsMap(memberId);

            // Get AutoDistribution instance
            const autoDistributor = this.getAutoDistribution();

            // Convert phases to legacy format
            const legacyPhases = phases.map(p => ({
                phaseId: p.phaseId,
                phaseName: p.phaseName,
                startDate: new Date(p.startDate),
                endDate: new Date(p.endDate),
                estimatedMDs: p.estimatedMDs
            }));

            // Call legacy sequential distribution
            const distribution = autoDistributor.autoDistributeSequentialPhases(
                legacyPhases,
                memberId,
                existingAllocations
            );

            return distribution as PhaseDistributionResult;

        } catch (error: any) {
            console.error('Error in phase distribution:', error);
            return {
                hasOverflow: true,
                overflowAmount: phases.reduce((sum, p) => sum + p.estimatedMDs, 0),
                error: error.message
            } as PhaseDistributionResult;
        }
    }

    /**
     * Redistribute allocations after user manual change
     *
     * @param allocationId - Allocation ID
     * @param changedMonth - Month that was changed
     * @param newValue - New MD value
     * @param options - Redistribution options
     * @returns Allocation result
     */
    redistributeAfterUserChange(
        allocationId: string,
        changedMonth: string,
        newValue: number,
        options?: RedistributionOptions
    ): AllocationResult {
        try {
            const allocation = this.getAllocationById(allocationId);
            if (!allocation) {
                return { success: false, error: 'Allocation not found' };
            }

            // Get AutoDistribution instance
            const autoDistributor = this.getAutoDistribution();

            // Prepare assignment object for legacy method
            const assignment = {
                ...allocation,
                allocations: allocation.monthlyAllocations
            };

            // Call legacy redistribution
            const result = autoDistributor.redistributeAfterUserChange(
                assignment,
                changedMonth,
                newValue
            );

            // Update allocation with redistributed values
            const updatedMonthlyAllocations: MonthlyAllocations = {};
            Object.keys(result.allocations).forEach(key => {
                if (!['hasOverflow', 'overflowAmount', 'hasUnallocatedMDs', 'unallocatedAmount', 'error'].includes(key)) {
                    updatedMonthlyAllocations[key] = {
                        planned: result.allocations[key].planned,
                        actual: result.allocations[key].actual || result.allocations[key].planned
                    };
                }
            });

            // Update in store
            return this.updateAllocation(allocationId, {
                monthlyAllocations: updatedMonthlyAllocations
            });

        } catch (error: any) {
            console.error('Error redistributing allocations:', error);
            return {
                success: false,
                error: `Failed to redistribute: ${error.message}`
            };
        }
    }

    /**
     * Calculate project end date based on total MDs and team member capacity
     *
     * @param startDate - Project start date (ISO string)
     * @param totalMDs - Total MDs needed
     * @param memberId - Team member ID
     * @returns Estimated end date (ISO string)
     */
    calculateProjectEndDate(
        startDate: string,
        totalMDs: number,
        memberId: string
    ): string {
        try {
            const autoDistributor = this.getAutoDistribution();

            const endDate = autoDistributor.calculateProjectEndDate(
                new Date(startDate),
                totalMDs,
                memberId
            );

            return endDate.toISOString().split('T')[0]; // Return YYYY-MM-DD

        } catch (error: any) {
            console.error('Error calculating end date:', error);
            // Fallback: add 3 months
            const start = new Date(startDate);
            start.setMonth(start.getMonth() + 3);
            return start.toISOString().split('T')[0];
        }
    }

    // ======================
    // VALIDATION METHODS
    // ======================

    /**
     * Validate allocation data
     *
     * @param data - Allocation form data
     * @returns Validation result
     */
    validateAllocation(data: AllocationFormData): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Required fields
        if (!data.projectId || data.projectId.trim() === '') {
            errors.push('Project ID is required');
        }

        if (!data.teamMemberId || data.teamMemberId.trim() === '') {
            errors.push('Team member ID is required');
        } else {
            // Check if team member exists
            const teamHelpers = this.getTeamHelpers();
            const member = teamHelpers?.getTeamMemberById(data.teamMemberId);
            if (!member) {
                errors.push(`Team member not found: ${data.teamMemberId}`);
            }
        }

        // If using auto-distribution (not phase-based or manual), validate dates and totalMDs
        if (!data.monthlyAllocations && !data.phaseAllocations) {
            if (!data.totalMDs || data.totalMDs <= 0) {
                errors.push('Total MDs must be greater than 0');
            }

            if (!data.startDate) {
                errors.push('Start date is required for auto-distribution');
            }

            if (!data.endDate) {
                errors.push('End date is required for auto-distribution');
            }

            if (data.startDate && data.endDate) {
                const start = new Date(data.startDate);
                const end = new Date(data.endDate);

                if (start >= end) {
                    errors.push('Start date must be before end date');
                }

                // Warning if project is very long
                const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 +
                                  (end.getMonth() - start.getMonth());
                if (monthsDiff > 24) {
                    warnings.push('Project duration exceeds 24 months');
                }
            }
        }

        // If using manual monthly allocations, validate structure
        if (data.monthlyAllocations) {
            const months = Object.keys(data.monthlyAllocations);
            if (months.length === 0) {
                errors.push('At least one month must have allocations');
            }

            let totalMDs = 0;
            months.forEach(month => {
                const allocation = data.monthlyAllocations![month];
                if (typeof allocation.planned !== 'number' || allocation.planned < 0) {
                    errors.push(`Invalid planned MDs for month ${month}`);
                }
                totalMDs += allocation.planned;
            });

            if (totalMDs === 0) {
                warnings.push('Total allocated MDs is 0');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Check allocation overflow across all months
     *
     * @param memberId - Team member ID
     * @param monthlyAllocations - Proposed monthly allocations
     * @returns Overflow analysis
     */
    checkAllocationOverflow(
        memberId: string,
        monthlyAllocations: MonthlyAllocations
    ): OverflowAnalysis {
        const overflowByMonth: { [month: string]: number } = {};
        const affectedMonths: string[] = [];
        let totalOverflow = 0;

        Object.keys(monthlyAllocations).forEach(month => {
            const proposedMDs = monthlyAllocations[month].planned;

            // Check overflow for this month
            const overflowResult = this.capacityActions.checkCapacityOverflow(
                memberId,
                month,
                proposedMDs
            );

            if (overflowResult.hasOverflow) {
                overflowByMonth[month] = overflowResult.overflowAmount;
                affectedMonths.push(month);
                totalOverflow += overflowResult.overflowAmount;
            }
        });

        return {
            hasOverflow: totalOverflow > 0,
            overflowByMonth,
            totalOverflow,
            affectedMonths,
            details: affectedMonths.length > 0
                ? `Overflow detected in ${affectedMonths.length} month(s): ${affectedMonths.join(', ')}`
                : 'No overflow detected'
        };
    }

    /**
     * Check member availability for date range
     *
     * @param memberId - Team member ID
     * @param startDate - Start date (ISO string)
     * @param endDate - End date (ISO string)
     * @returns Availability result
     */
    checkMemberAvailability(
        memberId: string,
        startDate: string,
        endDate: string
    ): AvailabilityResult {
        try {
            // Get capacity for each month in range
            const capacityResults = this.capacityActions.calculateCapacityRange(
                memberId,
                this.dateToMonth(startDate),
                this.dateToMonth(endDate)
            );

            const availabilityByMonth: { [month: string]: any } = {};
            let totalCapacity = 0;
            let totalAllocated = 0;
            const constraints: string[] = [];

            capacityResults.forEach(result => {
                if (result.success) {
                    availabilityByMonth[result.month] = {
                        totalCapacity: result.monthlyCapacity,
                        existingAllocations: result.existingAllocations,
                        availableCapacity: result.availableCapacity,
                        utilization: result.utilization
                    };

                    totalCapacity += result.monthlyCapacity;
                    totalAllocated += result.existingAllocations;

                    if (result.isOverallocated) {
                        constraints.push(`${result.month}: Already over-allocated (${result.utilization.toFixed(1)}%)`);
                    } else if (result.isNearCapacity) {
                        constraints.push(`${result.month}: Near capacity (${result.utilization.toFixed(1)}%)`);
                    }
                } else {
                    constraints.push(`${result.month}: ${result.error}`);
                }
            });

            const overallUtilization = totalCapacity > 0
                ? (totalAllocated / totalCapacity) * 100
                : 0;

            const isAvailable = constraints.length === 0 ||
                !constraints.some(c => c.includes('over-allocated'));

            return {
                isAvailable,
                availabilityByMonth,
                overallUtilization,
                constraints: constraints.length > 0 ? constraints : undefined
            };

        } catch (error: any) {
            return {
                isAvailable: false,
                availabilityByMonth: {},
                overallUtilization: 0,
                constraints: [`Error checking availability: ${error.message}`]
            };
        }
    }

    // ======================
    // HELPER METHODS
    // ======================

    /**
     * Generate unique allocation ID
     */
    private generateAllocationId(): string {
        return `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get existing allocations as map for legacy AutoDistribution
     */
    private getExistingAllocationsMap(memberId: string): { [month: string]: number } {
        const allocations = this.getAllocationsForMember(memberId);
        const map: { [month: string]: number } = {};

        allocations.forEach((allocation: any) => {
            if (allocation.monthlyAllocations) {
                Object.keys(allocation.monthlyAllocations).forEach(month => {
                    const mds = allocation.monthlyAllocations[month].planned || 0;
                    map[month] = (map[month] || 0) + mds;
                });
            }
        });

        return map;
    }

    /**
     * Convert ISO date to month string (YYYY-MM)
     */
    private dateToMonth(isoDate: string): string {
        const date = new Date(isoDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Save allocations to file
     */
    private async saveAllocations(): Promise<void> {
        try {
            const dataManager = this.getDataManager();
            if (!dataManager) {
                console.warn('DataManager not available for auto-save');
                return;
            }

            const store = this.getStore();
            const allocations = store.getState().resourceAllocations || [];

            await dataManager.saveResourceAllocations(allocations);
            console.log('✅ Allocations auto-saved');

        } catch (error) {
            console.error('Error auto-saving allocations:', error);
        }
    }
}

// Make AllocationActions available globally for backward compatibility
if (typeof window !== 'undefined') {
    (window as any).AllocationActions = AllocationActions;
}
