/**
 * Auto-Distribution Algorithms
 * 
 * Handles automatic distribution of project MDs across months including:
 * - Project end date calculation based on team capacity
 * - Intelligent MD distribution with overflow prevention
 * - Overflow detection and capacity management
 * - Redistribution after user modifications
 * - Integration with working days and holiday calculations
 */

class AutoDistribution {
    constructor(workingDaysCalculator, teamManager) {
        this.workingDaysCalculator = workingDaysCalculator;
        this.teamManager = teamManager;
        this.safetyBufferPercentage = 0.9; // Use 90% of available capacity for safety
        this.existingAllocations = new Map(); // teamMemberId-month -> allocated MDs
    }

    /**
     * Calculate project end date based on total MDs and team member capacity
     * @param {Date} startDate Project start date
     * @param {number} totalMDs Total man days to allocate
     * @param {string} teamMemberId Team member ID
     * @returns {Date} Estimated end date
     */
    calculateProjectEndDate(startDate, totalMDs, teamMemberId) {
        // Validate team member exists
        const teamMember = this.teamManager.getTeamMemberById(teamMemberId);
        if (!teamMember) {
            throw new Error('Team member not found');
        }

        if (totalMDs <= 0) {
            return new Date(startDate);
        }

        // Calculate average monthly capacity for this team member
        const avgMonthlyCapacity = this._calculateAverageMonthlyCapacity(teamMember, startDate);
        
        // Calculate months needed (round up)
        const monthsNeeded = Math.ceil(totalMDs / avgMonthlyCapacity);
        
        // Add months to start date
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + monthsNeeded);
        
        return endDate;
    }

    /**
     * Automatically distribute project MDs across months
     * @param {number} totalMDs Total MDs to distribute
     * @param {Date} startDate Distribution start date
     * @param {Date} endDate Distribution end date
     * @param {string} teamMemberId Team member ID
     * @param {Object} existingAllocations Existing allocations per month to subtract from capacity
     * @returns {Object} Monthly allocation distribution
     */
    autoDistributeMDs(totalMDs, startDate, endDate, teamMemberId, existingAllocations = {}) {
        // ⚠️ DEBUG: Old algorithm being called - this should NOT happen with new implementation
        console.warn('⚠️ [DEBUG] OLD autoDistributeMDs algorithm called - this should be replaced by sequential algorithm!');
        console.warn('⚠️ [DEBUG] Called with:', { totalMDs, startDate, endDate, teamMemberId });
        console.trace('⚠️ [DEBUG] Call stack:');
        
        // Validation
        if (totalMDs < 0) {
            throw new Error('Total MDs must be positive');
        }

        if (totalMDs === 0) {
            return {};
        }

        if (startDate >= endDate) {
            throw new Error('Invalid date range: start date must be before end date');
        }

        // Get team member
        const teamMember = this.teamManager.getTeamMemberById(teamMemberId);
        if (!teamMember) {
            throw new Error('Team member not found');
        }

        // Get months between start and end date
        const months = this._getMonthsBetween(startDate, endDate);
        
        if (months.length === 0) {
            console.error(`ERROR: No months found between ${startDate.toISOString().split('T')[0]} and ${endDate.toISOString().split('T')[0]}`);
            return {
                hasOverflow: true,
                overflowAmount: totalMDs
            };
        }
        
        const distribution = {};
        let remainingMDs = totalMDs;
        
        // PHASE 1: Calculate real capacity for each month
        const monthCapacities = {};
        let totalAvailableCapacity = 0;
        
        for (const month of months) {
            // For first month, consider start date for partial month
            const isFirstMonth = month === months[0];
            const isLastMonth = month === months[months.length - 1];
            const monthStartDate = isFirstMonth ? startDate : null;
            const monthEndDate = isLastMonth ? endDate : null; // Pass phase end date for last month
            
            const baseCapacity = this.workingDaysCalculator.calculateAvailableCapacity(
                teamMember, 
                month, 
                monthStartDate,
                true, // excludeExistingAllocations - we handle phase overlaps manually
                monthEndDate // phaseEndDate for accurate partial month calculation
            );
            
            // Calculate precise temporal overlaps instead of full month allocations
            const overlappingAllocation = this._calculateTemporalOverlap(
                month, startDate, endDate, existingAllocations
            );
            const capacity = Math.max(0, baseCapacity - overlappingAllocation);
            
            
            monthCapacities[month] = capacity;
            totalAvailableCapacity += capacity;
            
            // Initialize distribution
            distribution[month] = {
                planned: 0,
                actual: 0,
                locked: false
            };
        }
        
        
        // Check if total capacity is sufficient
        const hasInsufficientCapacity = totalAvailableCapacity < totalMDs;
        const overflowAmount = hasInsufficientCapacity ? totalMDs - totalAvailableCapacity : 0;
        
        // PHASE 2: Distribute MDs sequentially month by month using consumption logic
        // Each phase consumes only what it needs, not all available capacity
        console.log(`Starting phase allocation for ${totalMDs} MDs across ${months.length} months`);
        
        for (const month of months) {
            if (remainingMDs <= 0) break;
            
            const monthCapacity = monthCapacities[month];
            console.log(`Month ${month}: Available capacity = ${monthCapacity}, Remaining MDs to allocate = ${remainingMDs}`);
            
            if (monthCapacity > 0) {
                // Consumption logic: allocate minimum between available capacity and remaining need
                const plannedForMonth = Math.min(monthCapacity, remainingMDs);
                
                distribution[month].planned = plannedForMonth;
                distribution[month].actual = plannedForMonth;
                remainingMDs -= plannedForMonth;
                
                console.log(`Month ${month}: Allocated ${plannedForMonth} MDs, Remaining = ${remainingMDs}`);
            }
        }
        
        // PHASE 3: Distribute any remaining MDs to months with available capacity
        if (remainingMDs > 0) {
            const monthsWithCapacity = months.filter(month => {
                return distribution[month].planned < monthCapacities[month];
            });
            
            for (const month of monthsWithCapacity) {
                if (remainingMDs <= 0) break;
                
                const availableInMonth = monthCapacities[month] - distribution[month].planned;
                const toAdd = Math.min(remainingMDs, availableInMonth);
                
                distribution[month].planned += toAdd;
                distribution[month].actual += toAdd;
                remainingMDs -= toAdd;
            }
        }
        
        // PHASE 4: Handle any truly remaining MDs
        // If there are still remaining MDs, it means insufficient capacity across all months
        // Don't force them into any month - let overflow detection handle this properly
        if (remainingMDs > 0) {
            console.warn(`Unable to allocate ${remainingMDs} MDs - insufficient capacity across all months in phase range`);
        }
        
        // Create result object with overflow metadata
        const result = { ...distribution };
        
        // Calculate final overflow amount considering:
        // 1. MDs that couldn't be allocated due to insufficient capacity
        // 2. Any month-specific capacity overflows (should be rare with new logic)
        let finalOverflowAmount = remainingMDs; // Start with unallocated MDs
        let hasAnyOverflow = remainingMDs > 0;
        
        // Check each month for any capacity overflow (shouldn't happen with new logic)
        for (const month of Object.keys(distribution)) {
            const monthCapacity = monthCapacities[month] || 0;
            const monthAllocation = distribution[month].planned || 0;
            const monthOverflow = Math.max(0, monthAllocation - monthCapacity);
            
            if (monthOverflow > 0) {
                finalOverflowAmount += monthOverflow;
                hasAnyOverflow = true;
                console.warn(`Unexpected month overflow in ${month}: ${monthOverflow} MDs over capacity`);
            }
        }
        
        result.hasOverflow = hasAnyOverflow;
        result.overflowAmount = finalOverflowAmount;

        return result;
    }

    /**
     * Check for capacity overflow in a specific month
     * @param {string} teamMemberId Team member ID
     * @param {string} month Month in YYYY-MM format
     * @param {number} newAllocation Proposed new allocation
     * @returns {Object} Overflow analysis result
     */
    checkCapacityOverflow(teamMemberId, month, newAllocation) {
        const teamMember = this.teamManager.getTeamMemberById(teamMemberId);
        if (!teamMember) {
            throw new Error('Team member not found');
        }

        // Get available capacity (accounts for existing allocations)
        let maxCapacity;
        try {
            maxCapacity = this.workingDaysCalculator.calculateAvailableCapacity(teamMember, month, null, false);
            
            // Add back current allocation to get total capacity
            const existingAllocation = this._getExistingAllocations(teamMemberId, month);
            maxCapacity += existingAllocation;
        } catch (error) {
            // If calculation fails, use zero capacity
            maxCapacity = 0;
        }

        const overflowAmount = Math.max(0, newAllocation - maxCapacity);
        const hasOverflow = overflowAmount > 0;
        
        // Calculate utilization percentage
        let utilization;
        if (maxCapacity === 0) {
            utilization = newAllocation > 0 ? Infinity : 0;
        } else {
            utilization = Math.round((newAllocation / maxCapacity) * 100);
        }

        return {
            hasOverflow,
            overflowAmount,
            maxCapacity,
            utilization
        };
    }

    /**
     * Redistribute MDs after user modifies allocation
     * @param {Object} assignment Project assignment object
     * @param {string} changedMonth Month that was modified (YYYY-MM)
     * @param {number} newValue New allocation value
     * @returns {Object} Updated assignment with redistributed allocations
     */
    redistributeAfterUserChange(assignment, changedMonth, newValue) {
        try {
            // Create copy of assignment
            const result = {
                ...assignment,
                allocations: { ...assignment.allocations },
                lastModified: new Date().toISOString()
            };

            const oldValue = assignment.allocations[changedMonth]?.planned || 0;
            const difference = oldValue - newValue;


            // Update the changed month
            result.allocations[changedMonth] = {
                ...result.allocations[changedMonth],
                planned: newValue,
                actual: newValue
            };

            if (difference === 0) {
                return result; // No redistribution needed
            }

            // Get future months only (never redistribute to past)
            const futureMonths = this._getFutureMonths(changedMonth, result.allocations);
            
            const teamMember = this.teamManager.getTeamMemberById(assignment.teamMemberId);

            if (difference > 0) {
                // User reduced allocation - redistribute excess to future
                this._redistributeExcessToFuture(
                    result.allocations, 
                    futureMonths, 
                    difference, 
                    teamMember
                );
            } else if (difference < 0) {
                // User increased allocation - reduce from future months
                const needed = Math.abs(difference);
                const unallocated = this._reduceFromFutureMonths(
                    result.allocations, 
                    futureMonths, 
                    needed
                );
                
                if (unallocated > 0) {
                    result.hasUnallocatedMDs = true;
                    result.unallocatedAmount = unallocated;
                }
            }

            return result;

        } catch (error) {
            // Return original assignment on error to preserve data integrity
            return {
                ...assignment,
                error: error.message
            };
        }
    }

    /**
     * Set existing allocations for testing purposes
     * @param {string} teamMemberId Team member ID
     * @param {string} month Month in YYYY-MM format
     * @param {number} allocatedMDs Allocated man days
     */
    setExistingAllocations(teamMemberId, month, allocatedMDs) {
        const key = `${teamMemberId}-${month}`;
        this.existingAllocations.set(key, allocatedMDs);
    }

    /**
     * Distribute multiple phases using sequential consumption logic
     * @param {Array} phases Array of phase objects with {phaseId, phaseName, startDate, endDate, estimatedMDs}
     * @param {string} teamMemberId Team member ID
     * @param {Object} existingAllocations Existing allocations to consider
     * @returns {Object} Combined allocation result for all phases
     */
    autoDistributeSequentialPhases(phases, teamMemberId, existingAllocations = {}) {
        // 🔄 DEBUG: Confirm new algorithm is called
        console.log('🔄 [DEBUG] autoDistributeSequentialPhases CALLED - This is the NEW SEQUENTIAL algorithm!');
        console.log('🔄 [DEBUG] Input phases:', phases.map(p => ({ 
            id: p.phaseId, 
            name: p.phaseName, 
            mds: p.estimatedMDs,
            startDate: p.startDate,
            endDate: p.endDate 
        })));
        console.log('🔄 [DEBUG] Team member ID:', teamMemberId);
        
        // Validation
        if (!phases || !Array.isArray(phases) || phases.length === 0) {
            console.log('🔄 [DEBUG] No phases provided, returning empty result');
            return { hasOverflow: false, overflowAmount: 0 };
        }

        // Get team member
        const teamMember = this.teamManager.getTeamMemberById(teamMemberId);
        if (!teamMember) {
            console.error('🔄 [DEBUG] Team member not found:', teamMemberId);
            throw new Error('Team member not found');
        }

        console.log(`🔄 Sequential distribution starting for ${phases.length} phases`);

        // Sort phases by start date to ensure sequential processing
        const sortedPhases = phases.slice().sort((a, b) => 
            new Date(a.startDate) - new Date(b.startDate)
        );

        // Calculate overall date range
        const minStartDate = new Date(Math.min(...sortedPhases.map(p => new Date(p.startDate))));
        const maxEndDate = new Date(Math.max(...sortedPhases.map(p => new Date(p.endDate))));

        // Get all months in the range
        const allMonths = this._getMonthsBetween(minStartDate, maxEndDate);
        console.log(`📅 Processing months: ${allMonths[0]} to ${allMonths[allMonths.length - 1]} (${allMonths.length} total)`);

        // Initialize result structure
        const result = {};
        const phaseAllocations = {}; // Track allocations per phase
        const monthlyCapacityUsed = {}; // Track used capacity per month
        let totalOverflow = 0;

        // Initialize months in result
        allMonths.forEach(month => {
            result[month] = { planned: 0, actual: 0, locked: false };
            monthlyCapacityUsed[month] = 0;
        });

        // Initialize phase tracking
        sortedPhases.forEach(phase => {
            phaseAllocations[phase.phaseId] = {
                allocated: 0,
                needed: phase.estimatedMDs,
                completed: false,
                monthlyDistribution: {}
            };
        });

        // SEQUENTIAL CONSUMPTION ALGORITHM
        // Process phases in chronological order, consuming capacity month by month
        for (const phase of sortedPhases) {
            console.log(`\n🔍 Processing phase: ${phase.phaseName} (${phase.estimatedMDs} MDs needed)`);
            
            const phaseStart = new Date(phase.startDate);
            const phaseEnd = new Date(phase.endDate);
            const phaseMonths = this._getMonthsBetween(phaseStart, phaseEnd);
            
            let phaseRemainingMDs = phase.estimatedMDs;
            
            // Process each month within this phase's timeframe
            for (const month of phaseMonths) {
                if (phaseRemainingMDs <= 0) break;

                // Calculate available capacity for this month
                const isFirstMonth = month === phaseMonths[0];
                const isLastMonth = month === phaseMonths[phaseMonths.length - 1];
                const monthStartDate = isFirstMonth ? phaseStart : null;
                const monthEndDate = isLastMonth ? phaseEnd : null;

                let monthCapacity;
                try {
                    monthCapacity = this.workingDaysCalculator.calculateAvailableCapacity(
                        teamMember, 
                        month, 
                        monthStartDate,
                        true, // excludeExistingAllocations 
                        monthEndDate
                    );
                } catch (error) {
                    console.warn(`Error calculating capacity for ${month}:`, error);
                    monthCapacity = 0;
                }

                // Subtract existing allocations (from other projects)
                const existingInMonth = this._calculateExistingAllocationsForMonth(month, existingAllocations);
                const availableCapacity = Math.max(0, monthCapacity - existingInMonth - monthlyCapacityUsed[month]);

                console.log(`  📊 Month ${month}: Capacity=${monthCapacity}, Used=${monthlyCapacityUsed[month]}, Existing=${existingInMonth}, Available=${availableCapacity}`);

                if (availableCapacity > 0) {
                    // Consume available capacity for this phase
                    const toAllocate = Math.min(phaseRemainingMDs, availableCapacity);
                    
                    // Update result allocation
                    result[month].planned += toAllocate;
                    result[month].actual += toAllocate;
                    
                    // Update phase tracking
                    if (!phaseAllocations[phase.phaseId].monthlyDistribution[month]) {
                        phaseAllocations[phase.phaseId].monthlyDistribution[month] = 0;
                    }
                    phaseAllocations[phase.phaseId].monthlyDistribution[month] += toAllocate;
                    phaseAllocations[phase.phaseId].allocated += toAllocate;
                    
                    // Update capacity tracking
                    monthlyCapacityUsed[month] += toAllocate;
                    phaseRemainingMDs -= toAllocate;

                    console.log(`  ✅ Allocated ${toAllocate} MDs to ${phase.phaseName} in ${month}. Phase remaining: ${phaseRemainingMDs}`);
                } else {
                    console.log(`  ❌ No capacity available in ${month} for ${phase.phaseName}`);
                }
            }

            // Check if phase was completed
            if (phaseRemainingMDs > 0) {
                console.warn(`⚠️ Phase ${phase.phaseName} has ${phaseRemainingMDs} MDs unallocated (overflow)`);
                totalOverflow += phaseRemainingMDs;
                phaseAllocations[phase.phaseId].overflow = phaseRemainingMDs;
            } else {
                console.log(`✅ Phase ${phase.phaseName} fully allocated`);
                phaseAllocations[phase.phaseId].completed = true;
            }
        }

        // Add metadata to result
        result.hasOverflow = totalOverflow > 0;
        result.overflowAmount = totalOverflow;
        result.phaseBreakdown = phaseAllocations;

        console.log(`🏁 Sequential distribution complete. Total overflow: ${totalOverflow} MDs`);
        
        // 🏁 DEBUG: Final result confirmation
        console.log('🏁 [DEBUG] NEW SEQUENTIAL algorithm completed successfully!');
        console.log('🏁 [DEBUG] Final result structure:', {
            monthsWithAllocation: Object.keys(result).filter(k => !['hasOverflow', 'overflowAmount', 'phaseBreakdown'].includes(k)).length,
            hasPhaseBreakdown: !!result.phaseBreakdown,
            totalOverflow: totalOverflow
        });
        
        return result;
    }

    /**
     * Calculate existing allocations for a specific month from external sources
     * @private
     * @param {string} month Month in YYYY-MM format  
     * @param {Object} existingAllocations Existing allocations structure
     * @returns {number} Total existing allocations for the month
     */
    _calculateExistingAllocationsForMonth(month, existingAllocations) {
        if (!existingAllocations || !existingAllocations[month]) {
            return 0;
        }

        // Handle different formats of existingAllocations
        if (Array.isArray(existingAllocations[month])) {
            // Array format: sum all allocations
            return existingAllocations[month].reduce((sum, allocation) => {
                const mdValue = typeof allocation === 'object' ? 
                    (allocation.planned || allocation.allocatedMDs || 0) : allocation;
                return sum + (Number(mdValue) || 0);
            }, 0);
        } else if (typeof existingAllocations[month] === 'object') {
            // Object format: get planned value
            return Number(existingAllocations[month].planned || existingAllocations[month].allocatedMDs || 0) || 0;
        } else {
            // Simple number format
            return Number(existingAllocations[month]) || 0;
        }
    }

    /**
     * Calculate average monthly capacity for a team member
     * @private
     * @param {Object} teamMember Team member object
     * @param {Date} startDate Start date for capacity calculation
     * @returns {number} Average monthly capacity in MDs
     */
    _calculateAverageMonthlyCapacity(teamMember, startDate) {
        // Sample 3 months starting from start date to get average
        const sampleMonths = 3;
        let totalCapacity = 0;

        for (let i = 0; i < sampleMonths; i++) {
            const sampleDate = new Date(startDate);
            sampleDate.setMonth(sampleDate.getMonth() + i);
            
            const monthString = `${sampleDate.getFullYear()}-${String(sampleDate.getMonth() + 1).padStart(2, '0')}`;
            
            try {
                const capacity = this.workingDaysCalculator.calculateAvailableCapacity(teamMember, monthString, null, false);
                totalCapacity += capacity;
            } catch (error) {
                // Fallback to basic working days calculation (no vacations/allocations)
                const [year, month] = monthString.split('-').map(Number);
                const basicWorkingDays = this.workingDaysCalculator.calculateWorkingDays(month, year, teamMember.country || 'IT');
                totalCapacity += basicWorkingDays;
            }
        }

        return Math.round(totalCapacity / sampleMonths);
    }

    /**
     * Get months between start and end date (inclusive of end date month if end date > 1st of month)
     * @private
     * @param {Date} startDate Start date (inclusive)
     * @param {Date} endDate End date (inclusive if not on 1st day of month)
     * @returns {Array} Array of month strings in YYYY-MM format
     */
    _getMonthsBetween(startDate, endDate) {
        const months = [];
        const current = new Date(startDate);

        // Continue while current month is before or equal to end date month
        while (current <= endDate) {
            const monthString = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
            months.push(monthString);
            
            // Move to next month
            current.setMonth(current.getMonth() + 1);
            
            // If we've moved beyond the end date, stop
            if (current > endDate) {
                break;
            }
        }

        return months;
    }

    /**
     * Redistribute remaining MDs to months (may cause overflow)
     * @private
     * @param {Object} distribution Current distribution
     * @param {number} remainingMDs MDs still to allocate
     * @param {Array} months Array of month strings
     * @param {Object} teamMember Team member object
     * @returns {Object} Result with redistributed allocations and overflow
     */
    _redistributeRemaining(distribution, remainingMDs, months, teamMember) {
        const redistributed = { ...distribution };
        let overflow = 0;

        // Try to distribute remaining MDs across all months
        const mdPerMonth = Math.floor(remainingMDs / months.length);
        let remainder = remainingMDs % months.length;

        for (const month of months) {
            if (remainingMDs <= 0) break;

            const additionalMDs = mdPerMonth + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;

            const currentAllocation = redistributed[month]?.planned || 0;
            const newAllocation = currentAllocation + additionalMDs;

            // Check if this would exceed capacity
            const availableCapacity = this.workingDaysCalculator.calculateAvailableCapacity(teamMember, month, null, false);
            
            if (newAllocation > availableCapacity) {
                // Allocate up to capacity, track overflow
                const canAllocate = Math.max(0, availableCapacity - currentAllocation);
                redistributed[month].planned = currentAllocation + canAllocate;
                overflow += additionalMDs - canAllocate;
            } else {
                redistributed[month].planned = newAllocation;
            }

            remainingMDs -= additionalMDs;
        }

        return { redistributed, overflow };
    }

    /**
     * Get existing allocations for a team member in a month
     * @private
     * @param {string} teamMemberId Team member ID
     * @param {string} month Month in YYYY-MM format
     * @returns {number} Existing allocated MDs
     */
    _getExistingAllocations(teamMemberId, month) {
        const key = `${teamMemberId}-${month}`;
        return this.existingAllocations.get(key) || 0;
    }

    /**
     * Get future months from a given month (only those in the allocation)
     * @private
     * @param {string} fromMonth Month in YYYY-MM format
     * @param {Object} allocations Allocations object to filter against
     * @returns {Array} Array of future month strings that exist in allocations
     */
    _getFutureMonths(fromMonth, allocations = {}) {
        const [year, month] = fromMonth.split('-').map(Number);
        const fromDate = new Date(year, month - 1); // month is 0-indexed
        
        // Get all months from allocations that are after fromMonth
        const allMonths = Object.keys(allocations)
            .filter(key => !['hasOverflow', 'overflowAmount', 'hasUnallocatedMDs', 'unallocatedAmount', 'error'].includes(key));
        
        return allMonths.filter(monthKey => {
            const [mYear, mMonth] = monthKey.split('-').map(Number);
            const monthDate = new Date(mYear, mMonth - 1);
            return monthDate > fromDate;
        }).sort(); // Sort chronologically
    }

    /**
     * Redistribute excess MDs to future months
     * @private
     * @param {Object} allocations Allocation object to modify
     * @param {Array} futureMonths Array of future month strings
     * @param {number} excessMDs Excess MDs to redistribute
     * @param {Object} teamMember Team member object
     */
    _redistributeExcessToFuture(allocations, futureMonths, excessMDs, teamMember) {
        let remaining = excessMDs;

        for (const month of futureMonths) {
            if (remaining <= 0) break;

            // Skip locked allocations
            if (allocations[month]?.locked) continue;

            // Calculate how much we can add to this month
            const currentAllocation = allocations[month]?.planned || 0;
            
            try {
                const availableCapacity = this.workingDaysCalculator.calculateAvailableCapacity(teamMember, month, null, false);
                const canAdd = Math.max(0, availableCapacity - currentAllocation);
                const toAdd = Math.min(remaining, canAdd);


                if (toAdd > 0) {
                    if (!allocations[month]) {
                        allocations[month] = { planned: 0, actual: 0, locked: false };
                    }
                    allocations[month].planned += toAdd;
                    allocations[month].actual = allocations[month].planned;
                    remaining -= toAdd;
                }
            } catch (error) {
                console.warn(`Error calculating capacity for ${month}:`, error);
                // No fallback - respect capacity calculation failures
                // This prevents incorrect allocations when capacity cannot be determined
            }
        }
        
        
        // No forcing of remaining MDs - respect capacity constraints
        if (remaining > 0) {
            console.warn(`Could not redistribute ${remaining} MDs due to capacity constraints in future months`);
        }
    }

    /**
     * Reduce MDs from future months
     * @private
     * @param {Object} allocations Allocation object to modify
     * @param {Array} futureMonths Array of future month strings
     * @param {number} neededMDs MDs to reduce from future
     * @returns {number} Unallocated MDs (if any)
     */
    _reduceFromFutureMonths(allocations, futureMonths, neededMDs) {
        let remaining = neededMDs;

        for (const month of futureMonths) {
            if (remaining <= 0) break;

            // Skip locked allocations
            if (allocations[month]?.locked) continue;

            const currentAllocation = allocations[month]?.planned || 0;
            const canReduce = Math.min(remaining, currentAllocation);

            if (canReduce > 0) {
                allocations[month].planned -= canReduce;
                allocations[month].actual = allocations[month].planned;
                remaining -= canReduce;
            }
        }

        return remaining; // Return unallocated amount
    }

    /**
     * Calculate temporal overlap for sequential consumption logic
     * @private
     * @param {string} month Month in YYYY-MM format
     * @param {Date} currentPhaseStart Current phase start date
     * @param {Date} currentPhaseEnd Current phase end date
     * @param {Object} existingAllocations Existing allocations from previous phases
     * @returns {number} Temporal overlap (always 0 for sequential consumption)
     */
    _calculateTemporalOverlap(month, currentPhaseStart, currentPhaseEnd, existingAllocations) {
        // SEQUENTIAL CONSUMPTION LOGIC:
        // In a sequential phase execution model, previous phases have already 
        // finished consuming their MDs before the current phase starts.
        // There is no real temporal overlap between sequential phases.
        // Each phase gets clean capacity in its designated time period.
        
        console.log(`Sequential consumption: No temporal overlap for ${month} - previous phases finished`);
        return 0;
    }

    /**
     * Calculate working days between two dates (helper for temporal overlap)
     * @private
     * @param {Date} startDate Start date (inclusive)
     * @param {Date} endDate End date (inclusive)
     * @returns {number} Working days count
     */
    _calculateWorkingDaysBetween(startDate, endDate) {
        if (!this.workingDaysCalculator || !this.workingDaysCalculator.calculateWorkingDaysBetween) {
            // Fallback: simple day calculation (assumes all days are working days)
            const timeDiff = endDate.getTime() - startDate.getTime();
            return Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1);
        }
        
        return this.workingDaysCalculator.calculateWorkingDaysBetween(startDate, endDate);
    }
}

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoDistribution;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.AutoDistribution = AutoDistribution;
}