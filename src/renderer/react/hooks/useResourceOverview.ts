/**
 * useResourceOverview Hook
 *
 * Custom hook for Resource Overview Dashboard
 * Manages state and business logic for resource capacity overview
 *
 * Features:
 * - Fetches all team members
 * - Calculates capacity for each member
 * - Filters by team, vendor, role, month
 * - Sorts by utilization, name, capacity
 * - Real-time updates when allocations change
 */

import { useState, useEffect, useMemo } from 'react';
import { useStore } from './useStore';

// Import Actions (available globally after build)
declare const CapacityActions: any;
declare const AllocationActions: any;
declare const TeamHelpers: any;

export interface ResourceOverviewMember {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    role: string;
    vendorId: string;
    vendorType: 'supplier' | 'internal';
    vendorName: string;
    monthlyCapacity: number;

    // Capacity data for selected month
    baseWorkingDays: number;
    vacationDays: number;
    existingAllocations: number;
    availableCapacity: number;
    utilization: number;
    isOverallocated: boolean;
    isNearCapacity: boolean;

    // Status
    status: 'available' | 'near-capacity' | 'over-allocated';
    statusColor: string;
}

export interface ResourceOverviewFilters {
    month: string; // 'YYYY-MM'
    team?: string;
    vendor?: string;
    role?: string;
    status?: 'all' | 'available' | 'near-capacity' | 'over-allocated';
    sortBy: 'name' | 'utilization' | 'available' | 'role';
    sortOrder: 'asc' | 'desc';
}

export interface ResourceOverviewStats {
    totalMembers: number;
    totalCapacity: number;
    totalAllocated: number;
    totalAvailable: number;
    averageUtilization: number;
    overAllocatedCount: number;
    nearCapacityCount: number;
    availableCount: number;
}

export const useResourceOverview = (initialMonth?: string) => {
    // Current month as default
    const defaultMonth = useMemo(() => {
        if (initialMonth) return initialMonth;
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, [initialMonth]);

    const [filters, setFilters] = useState<ResourceOverviewFilters>({
        month: defaultMonth,
        sortBy: 'utilization',
        sortOrder: 'desc'
    });

    const [members, setMembers] = useState<ResourceOverviewMember[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Watch for allocation changes in store
    const resourceAllocations = useStore((state: any) => state.resourceAllocations);

    // Load and calculate member data
    useEffect(() => {
        loadMemberData();
    }, [filters.month, resourceAllocations]); // Reload when month or allocations change

    const loadMemberData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if dependencies are available
            if (typeof CapacityActions === 'undefined' ||
                typeof TeamHelpers === 'undefined') {
                throw new Error('Required dependencies not loaded');
            }

            // Get all team members
            const allMembers = TeamHelpers.getAllTeamMembers();

            if (!allMembers || allMembers.length === 0) {
                setMembers([]);
                setLoading(false);
                return;
            }

            // Initialize actions
            const capacityActions = new CapacityActions();

            // Calculate capacity for each member
            const memberData: ResourceOverviewMember[] = allMembers.map((member: any) => {
                // Calculate capacity for selected month
                const capacityResult = capacityActions.calculateAvailableCapacity(
                    member.id,
                    filters.month
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

                // Get vendor name
                const vendorName = TeamHelpers.getVendorNameForMember(member.id);

                return {
                    id: member.id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    fullName: `${member.firstName} ${member.lastName}`,
                    email: member.email,
                    role: member.role,
                    vendorId: member.vendorId,
                    vendorType: member.vendorType,
                    vendorName,
                    monthlyCapacity: member.monthlyCapacity || 22,

                    baseWorkingDays: capacityResult.baseWorkingDays,
                    vacationDays: capacityResult.vacationDays,
                    existingAllocations: capacityResult.existingAllocations,
                    availableCapacity: capacityResult.availableCapacity,
                    utilization: capacityResult.utilization,
                    isOverallocated: capacityResult.isOverallocated,
                    isNearCapacity: capacityResult.isNearCapacity,

                    status,
                    statusColor
                };
            });

            setMembers(memberData);
            setLoading(false);

        } catch (err: any) {
            console.error('Error loading member data:', err);
            setError(err.message || 'Failed to load resource data');
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

        // Filter by status
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(m => m.status === filters.status);
        }

        // Sort
        filtered.sort((a, b) => {
            let compareValue = 0;

            switch (filters.sortBy) {
                case 'name':
                    compareValue = a.fullName.localeCompare(b.fullName);
                    break;
                case 'utilization':
                    compareValue = a.utilization - b.utilization;
                    break;
                case 'available':
                    compareValue = a.availableCapacity - b.availableCapacity;
                    break;
                case 'role':
                    compareValue = a.role.localeCompare(b.role);
                    break;
            }

            return filters.sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return filtered;
    }, [members, filters]);

    // Calculate statistics
    const stats = useMemo((): ResourceOverviewStats => {
        const totalMembers = filteredMembers.length;
        const totalCapacity = filteredMembers.reduce((sum, m) => sum + m.monthlyCapacity, 0);
        const totalAllocated = filteredMembers.reduce((sum, m) => sum + m.existingAllocations, 0);
        const totalAvailable = filteredMembers.reduce((sum, m) => sum + m.availableCapacity, 0);
        const averageUtilization = totalMembers > 0
            ? filteredMembers.reduce((sum, m) => sum + m.utilization, 0) / totalMembers
            : 0;

        const overAllocatedCount = filteredMembers.filter(m => m.isOverallocated).length;
        const nearCapacityCount = filteredMembers.filter(m => m.isNearCapacity).length;
        const availableCount = filteredMembers.filter(m => !m.isOverallocated && !m.isNearCapacity).length;

        return {
            totalMembers,
            totalCapacity,
            totalAllocated,
            totalAvailable,
            averageUtilization,
            overAllocatedCount,
            nearCapacityCount,
            availableCount
        };
    }, [filteredMembers]);

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

    // Update filters
    const updateFilters = (newFilters: Partial<ResourceOverviewFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    // Refresh data
    const refresh = () => {
        loadMemberData();
    };

    return {
        members: filteredMembers,
        stats,
        filters,
        updateFilters,
        vendors,
        roles,
        loading,
        error,
        refresh
    };
};
