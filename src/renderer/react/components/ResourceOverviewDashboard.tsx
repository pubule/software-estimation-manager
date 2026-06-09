/**
 * Resource Overview Dashboard Component
 *
 * Main dashboard component for resource capacity management
 * Shows:
 * - Overall statistics
 * - Filterable list of team members with capacity info
 * - Real-time updates when allocations change
 *
 * Integrates with:
 * - CapacityActions for capacity calculations
 * - AllocationActions for allocation data
 * - TeamHelpers for team member data
 */

import React, { useState } from 'react';
import { useResourceOverview } from '../hooks/useResourceOverview';
import ResourceCapacityCard from './ResourceCapacityCard';
import ResourceFilters from './ResourceFilters';
import AssignmentModal from './AssignmentModal';
import type { ResourceOverviewMember } from '../hooks/useResourceOverview';

interface ResourceOverviewDashboardProps {
    initialMonth?: string;
    onMemberClick?: (member: ResourceOverviewMember) => void;
}

export const ResourceOverviewDashboard: React.FC<ResourceOverviewDashboardProps> = ({
    initialMonth,
    onMemberClick
}) => {
    const {
        members,
        stats,
        filters,
        updateFilters,
        vendors,
        roles,
        loading,
        error,
        refresh
    } = useResourceOverview(initialMonth);

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Assignment modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<ResourceOverviewMember | null>(null);

    // Handle allocate button click
    const handleAllocateClick = (member: ResourceOverviewMember) => {
        setSelectedMember(member);
        setIsModalOpen(true);
    };

    // Handle modal close
    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedMember(null);
    };

    // Handle successful save
    const handleSave = () => {
        refresh(); // Refresh data to show new allocation
        handleModalClose();
    };

    // Render statistics cards
    const renderStats = () => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
        }}>
            {/* Total Members */}
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: '4px solid #569cd6',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                <div style={{ fontSize: '13px', color: '#858585', marginBottom: '8px' }}>Total Members</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#569cd6' }}>{stats.totalMembers}</div>
            </div>

            {/* Average Utilization */}
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: '4px solid #4ec9b0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                <div style={{ fontSize: '13px', color: '#858585', marginBottom: '8px' }}>Average Utilization</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#4ec9b0' }}>
                    {stats.averageUtilization.toFixed(1)}%
                </div>
            </div>

            {/* Total Capacity */}
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: '4px solid #dcdcaa',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                <div style={{ fontSize: '13px', color: '#858585', marginBottom: '8px' }}>Total Capacity</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#dcdcaa' }}>
                    {stats.totalCapacity.toFixed(1)} MD
                </div>
                <div style={{ fontSize: '12px', color: '#858585', marginTop: '4px' }}>
                    Allocated: {stats.totalAllocated.toFixed(1)} MD
                </div>
            </div>

            {/* Total Available */}
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: '4px solid #4ec9b0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                <div style={{ fontSize: '13px', color: '#858585', marginBottom: '8px' }}>Available</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#4ec9b0' }}>
                    {stats.totalAvailable.toFixed(1)} MD
                </div>
            </div>

            {/* Status Distribution */}
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '20px',
                borderRadius: '8px',
                borderLeft: '4px solid #c586c0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                gridColumn: 'span 2'
            }}>
                <div style={{ fontSize: '13px', color: '#858585', marginBottom: '12px' }}>Status Distribution</div>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#858585', marginBottom: '4px' }}>Available</div>
                        <div style={{ fontSize: '24px', fontWeight: '600', color: '#4ec9b0' }}>
                            {stats.availableCount}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#858585', marginBottom: '4px' }}>Near Capacity</div>
                        <div style={{ fontSize: '24px', fontWeight: '600', color: '#dcdcaa' }}>
                            {stats.nearCapacityCount}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#858585', marginBottom: '4px' }}>Over-Allocated</div>
                        <div style={{ fontSize: '24px', fontWeight: '600', color: '#f48771' }}>
                            {stats.overAllocatedCount}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render loading state
    if (loading) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#858585'
            }}>
                <div style={{ fontSize: '18px', marginBottom: '12px' }}>Loading resource data...</div>
                <div style={{ fontSize: '14px' }}>Please wait...</div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#f48771'
            }}>
                <div style={{ fontSize: '18px', marginBottom: '12px' }}>❌ Error</div>
                <div style={{ fontSize: '14px' }}>{error}</div>
                <button
                    onClick={refresh}
                    style={{
                        marginTop: '20px',
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    // Render empty state
    if (members.length === 0) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#858585'
            }}>
                <div style={{ fontSize: '18px', marginBottom: '12px' }}>No team members found</div>
                <div style={{ fontSize: '14px' }}>
                    {filters.vendor || filters.role || filters.status
                        ? 'Try adjusting your filters'
                        : 'No team members configured in the system'}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            padding: '24px',
            backgroundColor: 'var(--bg-primary)',
            minHeight: '100vh'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{
                    margin: '0 0 8px 0',
                    color: '#4ec9b0',
                    fontSize: '28px',
                    fontWeight: '700'
                }}>
                    Resource Overview
                </h1>
                <p style={{
                    margin: 0,
                    color: '#858585',
                    fontSize: '14px'
                }}>
                    Team capacity and allocation management for {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
            </div>

            {/* Statistics */}
            {renderStats()}

            {/* Filters */}
            <ResourceFilters
                filters={filters}
                vendors={vendors}
                roles={roles}
                onFilterChange={updateFilters}
                onRefresh={refresh}
            />

            {/* View Mode Toggle */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
            }}>
                <div style={{ color: '#858585', fontSize: '14px' }}>
                    Showing {members.length} member{members.length !== 1 ? 's' : ''}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setViewMode('grid')}
                        style={{
                            backgroundColor: viewMode === 'grid' ? 'var(--btn-primary-bg)' : 'var(--bg-quaternary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        Grid
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{
                            backgroundColor: viewMode === 'list' ? 'var(--btn-primary-bg)' : 'var(--bg-quaternary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        List
                    </button>
                </div>
            </div>

            {/* Member Cards */}
            <div style={{
                display: viewMode === 'grid' ? 'grid' : 'block',
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(350px, 1fr))' : '1fr',
                gap: '16px'
            }}>
                {members.map(member => (
                    <ResourceCapacityCard
                        key={member.id}
                        member={member}
                        onClick={onMemberClick}
                        onAllocateClick={handleAllocateClick}
                    />
                ))}
            </div>

            {/* Assignment Modal */}
            {isModalOpen && selectedMember && (
                <AssignmentModal
                    initialMemberId={selectedMember.id}
                    initialMonth={filters.month}
                    onSave={handleSave}
                    onClose={handleModalClose}
                />
            )}
        </div>
    );
};

export default ResourceOverviewDashboard;
