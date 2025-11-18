/**
 * Resource Overview Export Actions
 *
 * Prepares data for Excel export from Resource Overview pages:
 * - Annual Capacity Heatmap sheet
 * - Capacity Planning by Project sheet
 */

import type { HeatmapMember, HeatmapStats } from '../hooks/useResourceOverviewHeatmap';
import type { ResourceAllocation } from '../types/allocation';

export interface ExportData {
    heatmapMembers: HeatmapMember[];
    heatmapStats: HeatmapStats;
    capacityPlanningData: ProjectAllocationRow[];
    yearRanges: {
        minYear: number;
        maxYear: number;
        allYears: number[];
    };
    exportDate: string;
    selectedYear: number;
}

export interface ProjectAllocationRow {
    projectId: string;
    projectName: string;
    teamMemberId: string;
    teamMemberName: string;
    teamMemberRole: string;
    monthlyAllocations: Record<string, number>; // 'YYYY-MM' → MDs
    totalMDs: number;
    notes?: string;
    startDate: string;
    endDate: string;
}

export class ResourceOverviewExportActions {
    /**
     * Get all resource allocations from store
     */
    private getAllResourceAllocations(): ResourceAllocation[] {
        const store = (window as any).appStore;
        if (!store) {
            console.warn('App store not available');
            return [];
        }
        const state = store.getState();
        return state.resourceAllocations || [];
    }

    /**
     * Get all team members from TeamHelpers
     */
    private getAllTeamMembers(): any[] {
        try {
            const helpers = (window as any).TeamHelpers;
            if (!helpers) {
                console.warn('TeamHelpers not available');
                return [];
            }
            return helpers.getAllTeamMembers() || [];
        } catch (error) {
            console.error('Error getting team members:', error);
            return [];
        }
    }

    /**
     * Extract capacity planning data grouped by project
     * Returns one row per allocation (granular view)
     */
    public getCapacityPlanningExportData(): ProjectAllocationRow[] {
        const allocations = this.getAllResourceAllocations();
        const teamMembers = this.getAllTeamMembers();

        // Create a map for quick member lookup
        const memberMap = new Map();
        teamMembers.forEach(member => {
            memberMap.set(member.id, member);
        });

        // Transform allocations to export rows
        const rows: ProjectAllocationRow[] = allocations.map(allocation => {
            const member = memberMap.get(allocation.teamMemberId);
            const totalMDs = Object.values(allocation.monthlyAllocations || {})
                .reduce((sum, month) => sum + (month.planned || 0), 0);

            return {
                projectId: allocation.projectId,
                projectName: allocation.projectName,
                teamMemberId: allocation.teamMemberId,
                teamMemberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
                teamMemberRole: member?.role || 'No Role',
                monthlyAllocations: this.extractMonthlyMDs(allocation.monthlyAllocations),
                totalMDs,
                notes: allocation.notes,
                startDate: allocation.startDate,
                endDate: allocation.endDate
            };
        });

        // Sort by project name, then by member name
        return rows.sort((a, b) => {
            const projectCmp = a.projectName.localeCompare(b.projectName);
            if (projectCmp !== 0) return projectCmp;
            return a.teamMemberName.localeCompare(b.teamMemberName);
        });
    }

    /**
     * Extract monthly MDs from allocation's monthlyAllocations
     */
    private extractMonthlyMDs(monthlyAllocations: Record<string, any>): Record<string, number> {
        const result: Record<string, number> = {};
        Object.entries(monthlyAllocations || {}).forEach(([month, data]) => {
            result[month] = data.planned || data.actual || 0;
        });
        return result;
    }

    /**
     * Detect year ranges from all allocations and heatmap data
     */
    public getYearRanges(
        heatmapMembers: HeatmapMember[],
        capacityPlanningData: ProjectAllocationRow[]
    ): { minYear: number; maxYear: number; allYears: number[] } {
        const years = new Set<number>();

        // Get years from capacity planning allocations
        capacityPlanningData.forEach(row => {
            Object.keys(row.monthlyAllocations).forEach(month => {
                const year = parseInt(month.split('-')[0]);
                if (!isNaN(year)) years.add(year);
            });
        });

        // Get years from heatmap data (all months covered)
        heatmapMembers.forEach(member => {
            member.months.forEach(month => {
                // Assuming heatmap is for a specific year, we need the year from context
                // For now, just add current year
                years.add(new Date().getFullYear());
            });
        });

        const allYears = Array.from(years).sort((a, b) => a - b);
        const minYear = allYears.length > 0 ? allYears[0] : new Date().getFullYear();
        const maxYear = allYears.length > 0 ? allYears[allYears.length - 1] : new Date().getFullYear();

        return {
            minYear,
            maxYear,
            allYears
        };
    }

    /**
     * Get all months present in export data (for header generation)
     */
    public getAllMonthsInData(capacityPlanningData: ProjectAllocationRow[]): string[] {
        const monthSet = new Set<string>();

        capacityPlanningData.forEach(row => {
            Object.keys(row.monthlyAllocations).forEach(month => {
                monthSet.add(month);
            });
        });

        return Array.from(monthSet).sort();
    }

    /**
     * Prepare complete export data structure
     */
    public prepareExportData(
        heatmapMembers: HeatmapMember[],
        heatmapStats: HeatmapStats,
        selectedYear: number
    ): ExportData {
        const capacityPlanningData = this.getCapacityPlanningExportData();
        const yearRanges = this.getYearRanges(heatmapMembers, capacityPlanningData);

        return {
            heatmapMembers,
            heatmapStats,
            capacityPlanningData,
            yearRanges,
            exportDate: new Date().toISOString(),
            selectedYear
        };
    }
}
