/**
 * useCapacityTimeline Hook
 *
 * Custom hook for Capacity Timeline visualization
 * Manages state and business logic for timeline view of resource capacity
 *
 * Features:
 * - Multi-month timeline view
 * - Capacity calculation for each member/month
 * - Timeline navigation (previous/next periods)
 * - Filters by vendor, role, status
 * - Real-time updates when allocations change
 */

import { useState, useEffect, useMemo } from 'react';
import { useStore } from './useStore';

// Import Actions (available globally after build)
declare const CapacityActions: any;
declare const TeamHelpers: any;

export interface TimelineMonth {
    month: string; // 'YYYY-MM'
    label: string; // 'Jan 2025'
}

export interface TimelineMemberCapacity {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: string;
    vendorId: string;
    vendorName: string;
    vendorType: 'supplier' | 'internal';

    // Capacity data per month
    monthlyData: {
        [month: string]: {
            baseWorkingDays: number;
            vacationDays: number;
            existingAllocations: number;
            availableCapacity: number;
            monthlyCapacity: number;
            utilization: number;
            isOverallocated: boolean;
            isNearCapacity: boolean;
            status: 'available' | 'near-capacity' | 'over-allocated';
            statusColor: string;
        };
    };
}

export interface TimelineFilters {
    vendor?: string;
    role?: string;
    status?: 'all' | 'available' | 'near-capacity' | 'over-allocated';
    showOnlyAllocated?: boolean;
}

export interface TimelineStats {
    totalMembers: number;
    averageUtilization: number;
    totalOverallocated: number;
    monthsDisplayed: number;
}

export const useCapacityTimeline = (monthsToShow: number = 8) => {
    // Calculate initial month range (current month + next N months)
    const initialMonths = useMemo(() => {
        const today = new Date();
        const startMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        return generateMonthRange(startMonth, monthsToShow);
    }, [monthsToShow]);

    const [months, setMonths] = useState<TimelineMonth[]>(initialMonths);
    const [filters, setFilters] = useState<TimelineFilters>({});
    const [members, setMembers] = useState<TimelineMemberCapacity[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Watch for allocation changes in store
    const resourceAllocations = useStore((state: any) => state.resourceAllocations);

    // Load timeline data
    useEffect(() => {
        loadTimelineData();
    }, [months, resourceAllocations]); // Reload when months or allocations change

    const loadTimelineData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if dependencies are available - with retry logic
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait

            while (attempts < maxAttempts) {
                if (typeof window.CapacityActions !== 'undefined' &&
                    typeof window.TeamHelpers !== 'undefined') {
                    break;
                }

                if (attempts === 0) {
                    console.log('⏳ Waiting for dependencies to load...');
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    throw new Error('Required dependencies not loaded after 5 seconds');
                }

                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`✅ Dependencies loaded after ${attempts} attempts`);

            // Get all team members
            const allMembers = window.TeamHelpers.getAllTeamMembers();

            if (!allMembers || allMembers.length === 0) {
                setMembers([]);
                setLoading(false);
                return;
            }

            // Initialize actions
            const capacityActions = new window.CapacityActions();

            // Calculate capacity for each member across all months
            const timelineData: TimelineMemberCapacity[] = allMembers.map((member: any) => {
                const monthlyData: any = {};

                // Calculate capacity for each month in timeline
                months.forEach(({ month }) => {
                    const capacityResult = capacityActions.calculateAvailableCapacity(
                        member.id,
                        month
                    );

                    // Determine status
                    let status: 'available' | 'near-capacity' | 'over-allocated' = 'available';
                    let statusColor = '#4ec9b0'; // Green

                    if (capacityResult.isOverallocated) {
                        status = 'over-allocated';
                        statusColor = '#f48771'; // Red
                    } else if (capacityResult.isNearCapacity) {
                        status = 'near-capacity';
                        statusColor = '#dcdcaa'; // Yellow
                    }

                    monthlyData[month] = {
                        baseWorkingDays: capacityResult.baseWorkingDays,
                        vacationDays: capacityResult.vacationDays,
                        existingAllocations: capacityResult.existingAllocations,
                        availableCapacity: capacityResult.availableCapacity,
                        monthlyCapacity: capacityResult.monthlyCapacity,
                        utilization: capacityResult.utilization,
                        isOverallocated: capacityResult.isOverallocated,
                        isNearCapacity: capacityResult.isNearCapacity,
                        status,
                        statusColor
                    };
                });

                // Get vendor name
                const vendorName = window.TeamHelpers.getVendorNameForMember(member.id);

                return {
                    id: member.id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    fullName: `${member.firstName} ${member.lastName}`,
                    role: member.role,
                    vendorId: member.vendorId,
                    vendorName,
                    vendorType: member.vendorType,
                    monthlyData
                };
            });

            setMembers(timelineData);
            setLoading(false);

        } catch (err: any) {
            console.error('Error loading timeline data:', err);
            setError(err.message || 'Failed to load timeline data');
            setLoading(false);
        }
    };

    // Filter members
    const filteredMembers = useMemo(() => {
        let filtered = [...members];

        // Filter by vendor
        if (filters.vendor) {
            filtered = filtered.filter(m => m.vendorId === filters.vendor);
        }

        // Filter by role
        if (filters.role) {
            filtered = filtered.filter(m => m.role === filters.role);
        }

        // Filter by status (check if ANY month has this status)
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(m => {
                return Object.values(m.monthlyData).some((data: any) =>
                    data.status === filters.status
                );
            });
        }

        // Filter: show only members with allocations
        if (filters.showOnlyAllocated) {
            filtered = filtered.filter(m => {
                return Object.values(m.monthlyData).some((data: any) =>
                    data.existingAllocations > 0
                );
            });
        }

        return filtered;
    }, [members, filters]);

    // Calculate statistics
    const stats = useMemo((): TimelineStats => {
        const totalMembers = filteredMembers.length;

        // Calculate average utilization across all members and all months
        let totalUtilization = 0;
        let utilizationCount = 0;
        let totalOverallocated = 0;

        filteredMembers.forEach(member => {
            months.forEach(({ month }) => {
                const data = member.monthlyData[month];
                if (data) {
                    totalUtilization += data.utilization;
                    utilizationCount++;
                    if (data.isOverallocated) {
                        totalOverallocated++;
                    }
                }
            });
        });

        const averageUtilization = utilizationCount > 0
            ? totalUtilization / utilizationCount
            : 0;

        return {
            totalMembers,
            averageUtilization,
            totalOverallocated,
            monthsDisplayed: months.length
        };
    }, [filteredMembers, months]);

    // Get unique vendors
    const vendors = useMemo(() => {
        const vendorSet = new Set(members.map(m => m.vendorId));
        return Array.from(vendorSet).map(vendorId => {
            const member = members.find(m => m.vendorId === vendorId);
            return {
                id: vendorId,
                name: member?.vendorName || vendorId
            };
        });
    }, [members]);

    // Get unique roles
    const roles = useMemo(() => {
        const roleSet = new Set(members.map(m => m.role));
        return Array.from(roleSet).sort();
    }, [members]);

    // Navigation: Move timeline forward/backward
    const navigateTimeline = (direction: 'prev' | 'next') => {
        const firstMonth = months[0].month;
        const [year, month] = firstMonth.split('-').map(Number);

        let newStartDate: Date;

        if (direction === 'prev') {
            // Move back by monthsToShow
            newStartDate = new Date(year, month - 1 - monthsToShow, 1);
        } else {
            // Move forward by monthsToShow
            newStartDate = new Date(year, month - 1 + monthsToShow, 1);
        }

        const newStartMonth = `${newStartDate.getFullYear()}-${String(newStartDate.getMonth() + 1).padStart(2, '0')}`;
        setMonths(generateMonthRange(newStartMonth, monthsToShow));
    };

    // Reset to current month
    const resetToCurrentMonth = () => {
        const today = new Date();
        const startMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        setMonths(generateMonthRange(startMonth, monthsToShow));
    };

    // Update filters
    const updateFilters = (newFilters: Partial<TimelineFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    // Refresh data
    const refresh = () => {
        loadTimelineData();
    };

    return {
        months,
        members: filteredMembers,
        stats,
        filters,
        updateFilters,
        vendors,
        roles,
        loading,
        error,
        refresh,
        navigateTimeline,
        resetToCurrentMonth
    };
};

/**
 * Generate array of months from start month
 */
function generateMonthRange(startMonth: string, count: number): TimelineMonth[] {
    const [year, month] = startMonth.split('-').map(Number);
    const months: TimelineMonth[] = [];

    for (let i = 0; i < count; i++) {
        const date = new Date(year, month - 1 + i, 1);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        months.push({ month: monthStr, label });
    }

    return months;
}
