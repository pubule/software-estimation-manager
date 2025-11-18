/**
 * Custom Hook: useResourceOverviewHeatmap
 *
 * Manages state and data for the annual capacity heatmap view
 * Fetches 12-month capacity data for all team members
 * Provides filtering, searching, and aggregation capabilities
 */

import { useState, useEffect, useMemo } from 'react';
import { useStore } from './useStore';

// Extend window interface for global Actions
declare global {
    interface Window {
        CapacityActions: any;
        TeamHelpers: any;
    }
}

export interface HeatmapCell {
    month: number; // 0-11 (Jan-Dec)
    utilization: number; // 0-150+ (percentage)
    allocated: number; // MDs allocated
    capacity: number; // MDs available
    workingDays: number;
    vacationDays: number;
}

export interface HeatmapMember {
    id: string;
    fullName: string;
    role: string;
    vendorName: string;
    email: string;
    months: HeatmapCell[]; // 12 months
    yearlyAverage: number; // Average utilization across 12 months
}

export interface HeatmapStats {
    totalMembers: number;
    averageUtilization: number; // Average across all members and months
    overAllocatedCount: number; // Members with >100% in any month
    nearCapacityCount: number; // Members with 90-100% avg
    underUtilizedCount: number; // Members with <50% avg
    healthyCount: number; // Members with 50-89% avg
}

interface UseResourceOverviewHeatmapReturn {
    members: HeatmapMember[];
    stats: HeatmapStats;
    year: number;
    setYear: (year: number) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: string; // 'all' | 'over' | 'near' | 'under' | 'available'
    setStatusFilter: (filter: string) => void;
    vendorFilter: string;
    setVendorFilter: (vendor: string) => void;
    roleFilter: string;
    setRoleFilter: (role: string) => void;
    vendors: string[];
    roles: string[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export const useResourceOverviewHeatmap = (initialYear: number): UseResourceOverviewHeatmapReturn => {
    // Subscribe to resource allocations from store
    const resourceAllocations = useStore((state: any) => state.resourceAllocations);

    // State
    const [year, setYear] = useState(initialYear);
    const [allMembers, setAllMembers] = useState<HeatmapMember[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [vendorFilter, setVendorFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load 12-month data for all team members
    const loadHeatmapData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Wait for window globals to be available (Actions loaded async)
            let attempts = 0;
            const maxAttempts = 50;

            while ((!window.CapacityActions || !window.TeamHelpers) && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.CapacityActions || !window.TeamHelpers) {
                throw new Error('Required Actions not available after timeout');
            }

            // Instantiate CapacityActions
            const capacityActions = new window.CapacityActions();

            // Get all team members
            const teamMembers = window.TeamHelpers.getAllTeamMembers() || [];

            if (teamMembers.length === 0) {
                setAllMembers([]);
                setLoading(false);
                return;
            }

            // Process each member
            const heatmapData: HeatmapMember[] = [];

            for (const member of teamMembers) {
                const months: HeatmapCell[] = [];
                const fullName = `${member.firstName} ${member.lastName}`;

                // Fetch capacity for each month
                for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
                    const monthDate = new Date(year, monthIndex, 1);
                    const monthString = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

                    try {
                        // Get capacity data for this month
                        const capacityData = capacityActions.calculateAvailableCapacity(member.id, monthString);

                        months.push({
                            month: monthIndex,
                            utilization: capacityData?.utilization || 0,
                            allocated: capacityData?.existingAllocations || 0,
                            capacity: capacityData?.monthlyCapacity || 0,
                            workingDays: capacityData?.baseWorkingDays || 0,
                            vacationDays: capacityData?.vacationDays || 0
                        });
                    } catch (err) {
                        console.error(`Error calculating capacity for ${fullName} in month ${monthIndex}:`, err);
                        // Add default empty month data
                        months.push({
                            month: monthIndex,
                            utilization: 0,
                            allocated: 0,
                            capacity: 0,
                            workingDays: 0,
                            vacationDays: 0
                        });
                    }
                }

                // Calculate yearly average
                const yearlyAverage = months.reduce((sum, m) => sum + m.utilization, 0) / 12;

                heatmapData.push({
                    id: member.id,
                    fullName,
                    role: member.role || 'No Role',
                    vendorName: member.vendorName || 'Internal',
                    email: member.email || '',
                    months,
                    yearlyAverage
                });
            }

            setAllMembers(heatmapData);
        } catch (err) {
            console.error('Error loading heatmap data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load capacity data');
        } finally {
            setLoading(false);
        }
    };

    // Load data on mount and when year or allocations change
    useEffect(() => {
        loadHeatmapData();
    }, [year, resourceAllocations]);

    // Refresh data every time user navigates to this page (component mounts)
    useEffect(() => {
        loadHeatmapData();
    }, []);

    // Refresh function
    const refresh = () => {
        loadHeatmapData();
    };

    // Get unique vendors
    const vendors = useMemo(() => {
        const uniqueVendors = new Set(allMembers.map(m => m.vendorName));
        return Array.from(uniqueVendors).sort();
    }, [allMembers]);

    // Get unique roles
    const roles = useMemo(() => {
        const uniqueRoles = new Set(allMembers.map(m => m.role));
        return Array.from(uniqueRoles).sort();
    }, [allMembers]);

    // Filter members based on search and filters
    const filteredMembers = useMemo(() => {
        let filtered = [...allMembers];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(m =>
                m.fullName.toLowerCase().includes(query) ||
                m.role.toLowerCase().includes(query) ||
                m.vendorName.toLowerCase().includes(query) ||
                m.email?.toLowerCase().includes(query)
            );
        }

        // Vendor filter
        if (vendorFilter !== 'all') {
            filtered = filtered.filter(m => m.vendorName === vendorFilter);
        }

        // Role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(m => m.role === roleFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(m => {
                const hasOverAllocation = m.months.some(month => month.utilization > 100);
                const avgUtil = m.yearlyAverage;

                switch (statusFilter) {
                    case 'over':
                        return hasOverAllocation;
                    case 'near':
                        return avgUtil >= 90 && avgUtil <= 100 && !hasOverAllocation;
                    case 'under':
                        return avgUtil < 50;
                    case 'available':
                        return avgUtil >= 50 && avgUtil < 90 && !hasOverAllocation;
                    default:
                        return true;
                }
            });
        }

        return filtered;
    }, [allMembers, searchQuery, vendorFilter, roleFilter, statusFilter]);

    // Calculate statistics
    const stats = useMemo<HeatmapStats>(() => {
        if (filteredMembers.length === 0) {
            return {
                totalMembers: 0,
                averageUtilization: 0,
                overAllocatedCount: 0,
                nearCapacityCount: 0,
                underUtilizedCount: 0,
                healthyCount: 0
            };
        }

        // Calculate average utilization across all members and all months
        const totalUtilization = filteredMembers.reduce((sum, member) => {
            const memberTotal = member.months.reduce((monthSum, month) => monthSum + month.utilization, 0);
            return sum + memberTotal;
        }, 0);
        const averageUtilization = totalUtilization / (filteredMembers.length * 12);

        // Count members by status
        let overAllocatedCount = 0;
        let nearCapacityCount = 0;
        let underUtilizedCount = 0;
        let healthyCount = 0;

        filteredMembers.forEach(member => {
            const hasOverAllocation = member.months.some(m => m.utilization > 100);
            const avgUtil = member.yearlyAverage;

            if (hasOverAllocation) {
                overAllocatedCount++;
            } else if (avgUtil >= 90 && avgUtil <= 100) {
                nearCapacityCount++;
            } else if (avgUtil < 50) {
                underUtilizedCount++;
            } else {
                healthyCount++;
            }
        });

        return {
            totalMembers: filteredMembers.length,
            averageUtilization,
            overAllocatedCount,
            nearCapacityCount,
            underUtilizedCount,
            healthyCount
        };
    }, [filteredMembers]);

    return {
        members: filteredMembers,
        stats,
        year,
        setYear,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        vendorFilter,
        setVendorFilter,
        roleFilter,
        setRoleFilter,
        vendors,
        roles,
        loading,
        error,
        refresh
    };
};
