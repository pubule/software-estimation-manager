/**
 * Resource Filters Component
 *
 * Filter controls for Resource Overview Dashboard
 * - Month selector
 * - Vendor filter
 * - Role filter
 * - Status filter
 * - Sort options
 */

import React from 'react';
import type { ResourceOverviewFilters } from '../hooks/useResourceOverview';

interface ResourceFiltersProps {
    filters: ResourceOverviewFilters;
    vendors: Array<{ id: string; name: string }>;
    roles: string[];
    onFilterChange: (filters: Partial<ResourceOverviewFilters>) => void;
    onRefresh?: () => void;
}

export const ResourceFilters: React.FC<ResourceFiltersProps> = ({
    filters,
    vendors,
    roles,
    onFilterChange,
    onRefresh
}) => {
    // Generate month options (current month ± 6 months)
    const generateMonthOptions = () => {
        const options: Array<{ value: string; label: string }> = [];
        const today = new Date();

        for (let i = -6; i <= 6; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }

        return options;
    };

    const monthOptions = generateMonthOptions();

    const selectStyle: React.CSSProperties = {
        backgroundColor: 'var(--bg-quaternary)',
        color: 'var(--text-primary)',
        border: '1px solid #555',
        borderRadius: '4px',
        padding: '8px 12px',
        fontSize: '14px',
        cursor: 'pointer',
        outline: 'none'
    };

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

    return (
        <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                alignItems: 'end'
            }}>
                {/* Month Selector */}
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#858585' }}>
                        Month
                    </label>
                    <select
                        style={selectStyle}
                        value={filters.month}
                        onChange={(e) => onFilterChange({ month: e.target.value })}
                    >
                        {monthOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Vendor Filter */}
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#858585' }}>
                        Vendor
                    </label>
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
                </div>

                {/* Role Filter */}
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#858585' }}>
                        Role
                    </label>
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
                </div>

                {/* Status Filter */}
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#858585' }}>
                        Status
                    </label>
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
                </div>

                {/* Sort By */}
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#858585' }}>
                        Sort By
                    </label>
                    <select
                        style={selectStyle}
                        value={filters.sortBy}
                        onChange={(e) => onFilterChange({ sortBy: e.target.value as any })}
                    >
                        <option value="utilization">Utilization</option>
                        <option value="name">Name</option>
                        <option value="available">Available Capacity</option>
                        <option value="role">Role</option>
                    </select>
                </div>

                {/* Sort Order */}
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#858585' }}>
                        Order
                    </label>
                    <select
                        style={selectStyle}
                        value={filters.sortOrder}
                        onChange={(e) => onFilterChange({ sortOrder: e.target.value as any })}
                    >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                    </select>
                </div>

                {/* Refresh Button */}
                {onRefresh && (
                    <div>
                        <button
                            style={buttonStyle}
                            onClick={onRefresh}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1177bb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0e639c'}
                        >
                            🔄 Refresh
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourceFilters;
