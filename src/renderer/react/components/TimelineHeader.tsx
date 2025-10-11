/**
 * Timeline Header Component
 *
 * Header for capacity timeline showing:
 * - Navigation controls (prev/next/today)
 * - Month columns
 * - Filters
 */

import React from 'react';
import type { TimelineMonth, TimelineFilters } from '../hooks/useCapacityTimeline';
import '../../styles/capacity-modern.css';

interface TimelineHeaderProps {
    months: TimelineMonth[];
    filters: TimelineFilters;
    vendors: Array<{ id: string; name: string }>;
    roles: string[];
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
    onNavigate,
    onResetToToday,
    onFilterChange,
    onRefresh
}) => {
    return (
        <div className="capacity-modern-timeline-header">
            {/* Controls Bar */}
            <div className="capacity-modern-controls-bar">
                {/* Navigation Controls */}
                <div className="capacity-modern-nav-buttons">
                    <button
                        onClick={() => onNavigate('prev')}
                        className="capacity-modern-btn capacity-modern-btn-primary"
                    >
                        <i className="fas fa-chevron-left"></i> Previous
                    </button>

                    <button
                        onClick={onResetToToday}
                        className="capacity-modern-btn capacity-modern-btn-secondary"
                    >
                        <i className="fas fa-calendar-day"></i> Today
                    </button>

                    <button
                        onClick={() => onNavigate('next')}
                        className="capacity-modern-btn capacity-modern-btn-primary"
                    >
                        Next <i className="fas fa-chevron-right"></i>
                    </button>

                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className="capacity-modern-btn capacity-modern-btn-secondary"
                        >
                            <i className="fas fa-sync-alt"></i> Refresh
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="capacity-modern-filters-group">
                    {/* Vendor Filter */}
                    <select
                        className="capacity-modern-filter-select"
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
                        value={filters.status || 'all'}
                        onChange={(e) => onFilterChange({ status: e.target.value as any })}
                    >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="near-capacity">Near Capacity</option>
                        <option value="over-allocated">Over-Allocated</option>
                    </select>

                    {/* Show Only Allocated */}
                    <label className="capacity-modern-checkbox-label">
                        <input
                            type="checkbox"
                            checked={filters.showOnlyAllocated || false}
                            onChange={(e) => onFilterChange({ showOnlyAllocated: e.target.checked })}
                        />
                        Only Allocated
                    </label>
                </div>
            </div>
        </div>
    );
};

export default TimelineHeader;
