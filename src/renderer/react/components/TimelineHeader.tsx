/**
 * Timeline Header Component
 *
 * Toolbar for capacity timeline, split in two rows:
 * - Row 1: free-text search + dropdown filters (who am I looking at)
 * - Row 2: month navigation + displayed range, result count and refresh (when am I looking at)
 */

import React from 'react';
import type { TimelineMonth, TimelineFilters } from '../hooks/useCapacityTimeline';
import '../../styles/capacity-modern.css';

interface TimelineHeaderProps {
    months: TimelineMonth[];
    filters: TimelineFilters;
    vendors: Array<{ id: string; name: string }>;
    roles: string[];
    filteredCount: number;
    totalCount: number;
    onNavigate: (direction: 'prev' | 'next') => void;
    onResetToToday: () => void;
    onFilterChange: (filters: Partial<TimelineFilters>) => void;
    onRefresh?: () => void;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
    months,
    filters,
    vendors,
    roles,
    filteredCount,
    totalCount,
    onNavigate,
    onResetToToday,
    onFilterChange,
    onRefresh
}) => {
    const rangeLabel = months.length > 0
        ? `${months[0].label} - ${months[months.length - 1].label}`
        : '';

    return (
        <div className="capacity-modern-timeline-header">
            <div className="capacity-modern-toolbar">
                {/* Row 1: search + filters */}
                <div className="capacity-modern-toolbar-row">
                    {/* Same pattern as the Resource Overview heatmap: the magnifier lives in
                        the placeholder, so it cannot overlap what the user types. */}
                    <div className="capacity-modern-search">
                        <input
                            type="text"
                            className="capacity-modern-search-input"
                            placeholder="🔍 Search by name, role, vendor..."
                            aria-label="Search team members"
                            value={filters.search || ''}
                            onChange={(e) => onFilterChange({ search: e.target.value })}
                        />
                        {filters.search && (
                            <button
                                type="button"
                                className="capacity-modern-search-clear"
                                aria-label="Clear search"
                                onClick={() => onFilterChange({ search: '' })}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Vendor Filter */}
                    <select
                        className="capacity-modern-filter-select"
                        aria-label="Filter by vendor"
                        value={filters.vendor || ''}
                        onChange={(e) => onFilterChange({ vendor: e.target.value || undefined })}
                    >
                        <option value="">All Vendors</option>
                        {vendors.map(vendor => (
                            <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                        ))}
                    </select>

                    {/* Role Filter */}
                    <select
                        className="capacity-modern-filter-select"
                        aria-label="Filter by role"
                        value={filters.role || ''}
                        onChange={(e) => onFilterChange({ role: e.target.value || undefined })}
                    >
                        <option value="">All Roles</option>
                        {roles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        className="capacity-modern-filter-select"
                        aria-label="Filter by capacity status"
                        value={filters.status || 'all'}
                        onChange={(e) => onFilterChange({ status: e.target.value as any })}
                    >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="near-capacity">Near Capacity</option>
                        <option value="over-allocated">Over-Allocated</option>
                    </select>

                    {/* Allocation Filter */}
                    <select
                        className="capacity-modern-filter-select"
                        aria-label="Filter by allocation"
                        value={filters.allocationFilter || ''}
                        onChange={(e) => onFilterChange({ allocationFilter: e.target.value as any })}
                    >
                        <option value="">All Members</option>
                        <option value="allocated">Only Allocated</option>
                        <option value="unallocated">Only Unallocated</option>
                    </select>
                </div>

                {/* Row 2: month navigation + result count + refresh */}
                <div className="capacity-modern-toolbar-row capacity-modern-toolbar-row-split">
                    <div className="capacity-modern-toolbar-row">
                        <div className="capacity-modern-nav" role="group" aria-label="Timeline navigation">
                            <button type="button" onClick={() => onNavigate('prev')}>
                                <i className="fas fa-chevron-left"></i> Previous
                            </button>
                            <button type="button" onClick={onResetToToday}>
                                <i className="fas fa-calendar-day"></i> Today
                            </button>
                            <button type="button" onClick={() => onNavigate('next')}>
                                Next <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>

                        <span className="capacity-modern-range">
                            <i className="far fa-calendar"></i> <strong>{rangeLabel}</strong>
                        </span>
                    </div>

                    <div className="capacity-modern-toolbar-row">
                        <span className="capacity-modern-result-count">
                            <strong>{filteredCount}</strong> of {totalCount} members
                        </span>

                        {onRefresh && (
                            <button
                                type="button"
                                className="capacity-modern-btn capacity-modern-btn-secondary"
                                onClick={onRefresh}
                            >
                                <i className="fas fa-sync-alt"></i> Refresh
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimelineHeader;
