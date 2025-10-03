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
    const buttonStyle: React.CSSProperties = {
        backgroundColor: '#0e639c',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 16px',
        fontSize: '14px',
        cursor: 'pointer',
        fontWeight: '600'
    };

    const selectStyle: React.CSSProperties = {
        backgroundColor: '#3c3c3c',
        color: '#d4d4d4',
        border: '1px solid #555',
        borderRadius: '4px',
        padding: '6px 10px',
        fontSize: '13px',
        cursor: 'pointer',
        outline: 'none'
    };

    return (
        <div style={{ marginBottom: '16px' }}>
            {/* Controls Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                gap: '12px',
                flexWrap: 'wrap'
            }}>
                {/* Navigation Controls */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={() => onNavigate('prev')}
                        style={buttonStyle}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1177bb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0e639c'}
                    >
                        ◀ Previous
                    </button>

                    <button
                        onClick={onResetToToday}
                        style={{ ...buttonStyle, backgroundColor: '#3c3c3c' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4c4c4c'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3c3c3c'}
                    >
                        Today
                    </button>

                    <button
                        onClick={() => onNavigate('next')}
                        style={buttonStyle}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1177bb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0e639c'}
                    >
                        Next ▶
                    </button>

                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            style={{ ...buttonStyle, backgroundColor: '#3c3c3c' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4c4c4c'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3c3c3c'}
                        >
                            🔄 Refresh
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Vendor Filter */}
                    <select
                        style={selectStyle}
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
                        style={selectStyle}
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
                        style={selectStyle}
                        value={filters.status || 'all'}
                        onChange={(e) => onFilterChange({ status: e.target.value as any })}
                    >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="near-capacity">Near Capacity</option>
                        <option value="over-allocated">Over-Allocated</option>
                    </select>

                    {/* Show Only Allocated */}
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        color: '#d4d4d4',
                        cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            checked={filters.showOnlyAllocated || false}
                            onChange={(e) => onFilterChange({ showOnlyAllocated: e.target.checked })}
                            style={{ cursor: 'pointer' }}
                        />
                        Only Allocated
                    </label>
                </div>
            </div>

            {/* Timeline Grid Header */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '250px 1fr',
                    backgroundColor: '#2d2d30',
                    borderBottom: '2px solid #007acc',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}
            >
                {/* Member Column Header */}
                <div
                    style={{
                        padding: '12px 16px',
                        borderRight: '1px solid #3c3c3c',
                        fontWeight: '700',
                        fontSize: '13px',
                        color: '#d4d4d4',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    Team Member
                </div>

                {/* Month Headers */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${months.length}, 1fr)`,
                        gap: '0'
                    }}
                >
                    {months.map(({ month, label }) => (
                        <div
                            key={month}
                            style={{
                                padding: '12px 8px',
                                border: '1px solid #3c3c3c',
                                borderTop: 'none',
                                textAlign: 'center',
                                fontWeight: '600',
                                fontSize: '12px',
                                color: '#d4d4d4',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            {label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TimelineHeader;
