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
import { useResourceOverviewHeatmap } from '../hooks/useResourceOverviewHeatmap';
import type { HeatmapMember, HeatmapCell } from '../hooks/useResourceOverviewHeatmap';
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
                <button onClick={refresh} className="btn btn-primary">Retry</button>
            </div>
        );
    }

    return (
        <div className="resource-heatmap-container">
            {/* Header */}
            <div className="heatmap-header">
                <h2>Resource Overview - Annual Capacity Heatmap {year}</h2>
                <div className="heatmap-actions">
                    <button onClick={refresh} className="btn btn-secondary" title="Refresh data">
                        <i className="fas fa-sync-alt"></i> Refresh
                    </button>
                    <button className="btn btn-secondary" title="Export to CSV">
                        <i className="fas fa-download"></i> Export
                    </button>
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
                    >
                        <option value={year - 1}>{year - 1}</option>
                        <option value={year}>{year}</option>
                        <option value={year + 1}>{year + 1}</option>
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
                        <button onClick={() => setSelectedCell(null)} className="btn btn-primary">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceOverviewHeatmap;
