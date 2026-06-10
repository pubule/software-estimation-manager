/**
 * Resource Overview Heatmap Component
 *
 * Annual capacity heatmap dashboard for monitoring resource allocation
 * Shows 12-month view with utilization percentages and status indicators
 *
 * Features:
 * - Heatmap visualization (12 months × N members)
 * - Color-coded cells (under/available/near/over allocated)
 * - Avg column (yearly average)
 * - Status column (yearly summary)
 * - Search and quick filters
 * - Click to drill-down on specific month
 */

import React, { useState, useMemo } from 'react';
import Button from './Button';
import { useResourceOverviewHeatmap } from '../hooks/useResourceOverviewHeatmap';
import type { HeatmapMember, HeatmapCell } from '../hooks/useResourceOverviewHeatmap';
import { ResourceOverviewExportActions } from '../actions/ResourceOverviewExportActions';
import { getCapacityActionsClass, getTeamHelpers, getElectronAPI } from '../utils/electronBridge';
import '../../styles/capacity-heatmap.css';

interface ResourceOverviewHeatmapProps {
    initialYear?: number;
}

export const ResourceOverviewHeatmap: React.FC<ResourceOverviewHeatmapProps> = ({
    initialYear = new Date().getFullYear()
}) => {
    const {
        members,
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
    } = useResourceOverviewHeatmap(initialYear);

    // Modal state for drill-down
    const [selectedCell, setSelectedCell] = useState<{ member: HeatmapMember; month: number } | null>(null);

    // Calculate heatmap data for a specific year
    const calculateHeatmapForYear = async (targetYear: number): Promise<any[]> => {
        try {
            // Wait for window globals to be available
            let attempts = 0;
            const maxAttempts = 50;

            while ((!getCapacityActionsClass() || !getTeamHelpers()) && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            const CapacityActionsClass = getCapacityActionsClass();
            const teamHelpersInstance = getTeamHelpers();

            if (!CapacityActionsClass || !teamHelpersInstance) {
                console.warn('Required Actions not available');
                return [];
            }

            const capacityActions = new CapacityActionsClass();
            const teamMembers = teamHelpersInstance.getAllTeamMembers() || [];

            const heatmapData: HeatmapMember[] = [];

            for (const member of teamMembers) {
                const months: any[] = [];
                const fullName = `${member.firstName} ${member.lastName}`;

                for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
                    const monthString = `${targetYear}-${String(monthIndex + 1).padStart(2, '0')}`;

                    try {
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

                const yearlyAverage = months.reduce((sum: number, m: any) => sum + m.utilization, 0) / 12;

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

            return heatmapData;
        } catch (error) {
            console.error('Error calculating heatmap for year:', error);
            return [];
        }
    };

    // Handle export to Excel
    const handleExport = async () => {
        try {
            const exportActions = new ResourceOverviewExportActions();
            const exportData = exportActions.prepareExportData(members, stats, year);

            // Calculate heatmap for next year
            const nextYear = year + 1;
            const nextYearHeatmap = await calculateHeatmapForYear(nextYear);

            // Add next year data for dual-year export
            exportData.nextYear = nextYear;
            exportData.nextYearHeatmap = nextYearHeatmap;

            const electronAPI = getElectronAPI();
            if (!electronAPI) {
                throw new Error('Electron API not available');
            }
            const result = await electronAPI.exportResourceOverview(exportData);

            if (result.success) {
                alert(`Export successful!\nFile: ${result.filename}\nLocation: Downloads folder`);
            } else {
                alert(`Export failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Export error:', error);
            alert(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Month labels
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Get cell color class based on utilization
    const getCellColorClass = (utilization: number): string => {
        if (utilization < 50) return 'under';        // 🟦 Under-utilized
        if (utilization < 90) return 'available';    // 🟩 Available
        if (utilization <= 100) return 'near';       // 🟨 Near capacity
        return 'over';                               // 🟥 Over-allocated
    };

    // Get cell icon based on utilization
    const getCellIcon = (utilization: number): string => {
        if (utilization < 50) return '🟦';
        if (utilization < 90) return '🟩';
        if (utilization <= 100) return '🟨';
        return '🟥';
    };

    // Calculate status summary for member
    const getStatusSummary = (member: HeatmapMember): { text: string; icon: string; className: string } => {
        const overMonths = member.months.filter(m => m.utilization > 100).length;
        const avgUtil = member.yearlyAverage;

        if (overMonths >= 6) {
            return { text: '🔴 CRIT', icon: '🔴', className: 'status-critical' };
        }
        if (overMonths > 0) {
            return { text: `⚠ ${overMonths}🟥`, icon: '⚠', className: 'status-warning' };
        }
        if (avgUtil < 50) {
            return { text: '⚠ Under', icon: '⚠', className: 'status-under' };
        }
        return { text: '✓ Stable', icon: '✓', className: 'status-stable' };
    };

    // Handle cell click for drill-down
    const handleCellClick = (member: HeatmapMember, monthIndex: number) => {
        setSelectedCell({ member, month: monthIndex });
    };

    // Render loading state
    if (loading) {
        return (
            <div className="heatmap-loading">
                <div className="loading-spinner"></div>
                <div>Loading annual capacity data...</div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="heatmap-error">
                <div className="error-icon">⚠</div>
                <div className="error-message">{error}</div>
                <Button variant="primary" onClick={refresh}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="resource-heatmap-container">
            {/* Header */}
            <div className="heatmap-header">
                <h2>Resource Overview - Annual Capacity Heatmap</h2>
                <div className="heatmap-actions">
                    <Button
                        variant="secondary"
                        onClick={refresh}
                        title="Refresh data"
                        icon={<i className="fas fa-sync-alt" />}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="secondary"
                        title="Export to CSV"
                        icon={<i className="fas fa-download" />}
                        onClick={handleExport}
                    >
                        Export
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="heatmap-filters">
                {/* Search Box */}
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="🔍 Search by name, role, vendor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                        aria-label="Search resources"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="search-clear"
                            aria-label="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Dropdown Filters */}
                <div className="filter-dropdowns">
                    <select
                        value={vendorFilter}
                        onChange={(e) => setVendorFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Vendors</option>
                        {vendors.map(vendor => (
                            <option key={vendor} value={vendor}>{vendor}</option>
                        ))}
                    </select>

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Roles</option>
                        {roles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>

                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="filter-select"
                        aria-label="Select year"
                    >
                        {Array.from({ length: 16 }, (_, i) => 2020 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Quick Status Filters */}
            <div className="quick-filters">
                <button
                    className={`quick-filter ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                >
                    All ({stats.totalMembers})
                </button>
                <button
                    className={`quick-filter over ${statusFilter === 'over' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('over')}
                >
                    🟥 Over-allocated ({stats.overAllocatedCount})
                </button>
                <button
                    className={`quick-filter near ${statusFilter === 'near' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('near')}
                >
                    🟨 Near Capacity ({stats.nearCapacityCount})
                </button>
                <button
                    className={`quick-filter under ${statusFilter === 'under' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('under')}
                >
                    🟦 Under-utilized ({stats.underUtilizedCount})
                </button>
                <button
                    className={`quick-filter available ${statusFilter === 'available' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('available')}
                >
                    🟩 Healthy ({stats.healthyCount})
                </button>

                {/* Year Navigation */}
                <div className="year-navigation">
                    <button
                        onClick={() => setYear(year - 1)}
                        className="btn-year-nav"
                        title="Previous year"
                        aria-label="Previous year"
                    >
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <span className="current-year">{year}</span>
                    <button
                        onClick={() => setYear(year + 1)}
                        className="btn-year-nav"
                        title="Next year"
                        aria-label="Next year"
                    >
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            {/* Heatmap Table */}
            <div className="heatmap-scroll-container">
                <table className="heatmap-table">
                    <thead>
                        <tr>
                            <th className="col-name">Name ↕</th>
                            {monthLabels.map((month, idx) => (
                                <th key={idx} className="col-month">{month}</th>
                            ))}
                            <th className="col-avg">Avg</th>
                            <th className="col-status">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.length === 0 ? (
                            <tr>
                                <td colSpan={15} className="no-results">
                                    No members found matching current filters
                                </td>
                            </tr>
                        ) : (
                            members.map((member) => {
                                const status = getStatusSummary(member);
                                return (
                                    <React.Fragment key={member.id}>
                                        {/* Member row with percentages */}
                                        <tr className="member-row">
                                            <td className="cell-name">
                                                <div className="member-name">{member.fullName}</div>
                                                <div className="member-role">{member.role}</div>
                                            </td>
                                            {member.months.map((monthData, idx) => (
                                                <td
                                                    key={idx}
                                                    className={`cell-month ${getCellColorClass(monthData.utilization)}`}
                                                    onClick={() => handleCellClick(member, idx)}
                                                    title={`${monthLabels[idx]}: ${monthData.utilization.toFixed(1)}% - Click for details`}
                                                >
                                                    {monthData.utilization.toFixed(0)}%
                                                </td>
                                            ))}
                                            <td className={`cell-avg ${getCellColorClass(member.yearlyAverage)}`}>
                                                {member.yearlyAverage.toFixed(1)}%
                                            </td>
                                            <td className={`cell-status ${status.className}`}>
                                                {status.text}
                                            </td>
                                        </tr>
                                        {/* Icon row */}
                                        <tr className="icon-row">
                                            <td className="cell-name-icon"></td>
                                            {member.months.map((monthData, idx) => (
                                                <td key={idx} className="cell-icon">
                                                    {getCellIcon(monthData.utilization)}
                                                </td>
                                            ))}
                                            <td className="cell-icon"></td>
                                            <td className="cell-icon"></td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="heatmap-legend">
                <div className="legend-title">Legend:</div>
                <div className="legend-items">
                    <div className="legend-item">
                        <span className="legend-icon">🟦</span>
                        <span>Under-utilized (&lt;50%)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-icon">🟩</span>
                        <span>Available (50-89%)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-icon">🟨</span>
                        <span>Near Capacity (90-100%)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-icon">🟥</span>
                        <span>Over-allocated (&gt;100%)</span>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="heatmap-summary">
                <span><strong>{stats.totalMembers}</strong> members</span>
                <span>|</span>
                <span>Avg: <strong>{stats.averageUtilization.toFixed(1)}%</strong></span>
                <span>|</span>
                <span className="stat-critical">🔴 <strong>{stats.overAllocatedCount}</strong> over-allocated</span>
                <span>|</span>
                <span className="stat-warning">⚠ <strong>{stats.underUtilizedCount}</strong> under-utilized</span>
            </div>

            {/* Drill-down Modal (TODO: implement) */}
            {selectedCell && (
                <div className="modal-overlay" onClick={() => setSelectedCell(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>
                            {selectedCell.member.fullName} - {monthLabels[selectedCell.month]} {year}
                        </h3>
                        <p>Utilization: {selectedCell.member.months[selectedCell.month].utilization.toFixed(1)}%</p>
                        <p className="text-muted">Drill-down details coming soon...</p>
                        <Button variant="primary" onClick={() => setSelectedCell(null)}>
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceOverviewHeatmap;
