/**
 * Capacity Timeline Component
 *
 * Main timeline view for resource capacity visualization
 * Shows capacity allocation across time for all team members
 *
 * Features:
 * - Multi-month timeline grid
 * - Color-coded cells based on utilization
 * - Navigation controls (prev/next/today)
 * - Filters (vendor, role, status)
 * - Interactive cells with tooltips
 * - Real-time updates
 *
 * Integrates with:
 * - CapacityActions for capacity calculations
 * - TeamHelpers for team member data
 * - Store for allocation tracking
 */

import React from 'react';
import { useCapacityTimeline } from '../hooks/useCapacityTimeline';
import TimelineHeader from './TimelineHeader';
import TimelineRow from './TimelineRow';
import type { TimelineMemberCapacity } from '../hooks/useCapacityTimeline';

interface CapacityTimelineProps {
    monthsToShow?: number; // Number of months to display (default: 6)
    onMemberClick?: (member: TimelineMemberCapacity) => void;
    onCellClick?: (month: string, memberName: string, data: any) => void;
}

export const CapacityTimeline: React.FC<CapacityTimelineProps> = ({
    monthsToShow = 6,
    onMemberClick,
    onCellClick
}) => {
    const {
        months,
        members,
        stats,
        filters,
        updateFilters,
        vendors,
        roles,
        loading,
        error,
        refresh,
        navigateTimeline,
        resetToCurrentMonth
    } = useCapacityTimeline(monthsToShow);

    // Render statistics bar
    const renderStats = () => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
        }}>
            {/* Total Members */}
            <div style={{
                backgroundColor: '#252526',
                padding: '16px',
                borderRadius: '6px',
                borderLeft: '4px solid #569cd6'
            }}>
                <div style={{ fontSize: '12px', color: '#858585', marginBottom: '6px' }}>Team Members</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#569cd6' }}>{stats.totalMembers}</div>
            </div>

            {/* Average Utilization */}
            <div style={{
                backgroundColor: '#252526',
                padding: '16px',
                borderRadius: '6px',
                borderLeft: '4px solid #4ec9b0'
            }}>
                <div style={{ fontSize: '12px', color: '#858585', marginBottom: '6px' }}>Avg Utilization</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#4ec9b0' }}>
                    {stats.averageUtilization.toFixed(1)}%
                </div>
            </div>

            {/* Over-allocated Count */}
            <div style={{
                backgroundColor: '#252526',
                padding: '16px',
                borderRadius: '6px',
                borderLeft: '4px solid #f48771'
            }}>
                <div style={{ fontSize: '12px', color: '#858585', marginBottom: '6px' }}>Over-Allocated</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f48771' }}>
                    {stats.totalOverallocated}
                </div>
                <div style={{ fontSize: '11px', color: '#858585', marginTop: '4px' }}>
                    member-months
                </div>
            </div>

            {/* Months Displayed */}
            <div style={{
                backgroundColor: '#252526',
                padding: '16px',
                borderRadius: '6px',
                borderLeft: '4px solid #dcdcaa'
            }}>
                <div style={{ fontSize: '12px', color: '#858585', marginBottom: '6px' }}>Timeline Range</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#dcdcaa' }}>
                    {stats.monthsDisplayed}
                </div>
                <div style={{ fontSize: '11px', color: '#858585', marginTop: '4px' }}>
                    months
                </div>
            </div>
        </div>
    );

    // Render loading state
    if (loading) {
        return (
            <div style={{
                padding: '60px',
                textAlign: 'center',
                color: '#858585',
                backgroundColor: '#1e1e1e',
                minHeight: '400px'
            }}>
                <div style={{ fontSize: '18px', marginBottom: '12px' }}>Loading timeline data...</div>
                <div style={{ fontSize: '14px' }}>Please wait...</div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div style={{
                padding: '60px',
                textAlign: 'center',
                color: '#f48771',
                backgroundColor: '#1e1e1e',
                minHeight: '400px'
            }}>
                <div style={{ fontSize: '18px', marginBottom: '12px' }}>❌ Error</div>
                <div style={{ fontSize: '14px', marginBottom: '20px' }}>{error}</div>
                <button
                    onClick={refresh}
                    style={{
                        backgroundColor: '#0e639c',
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
                padding: '60px',
                textAlign: 'center',
                color: '#858585',
                backgroundColor: '#1e1e1e',
                minHeight: '400px'
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
            backgroundColor: '#1e1e1e',
            minHeight: '100vh'
        }}>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{
                    margin: '0 0 8px 0',
                    color: '#4ec9b0',
                    fontSize: '28px',
                    fontWeight: '700'
                }}>
                    Capacity Timeline
                </h1>
                <p style={{
                    margin: 0,
                    color: '#858585',
                    fontSize: '14px'
                }}>
                    Resource capacity visualization across time - {months[0]?.label} to {months[months.length - 1]?.label}
                </p>
            </div>

            {/* Statistics */}
            {renderStats()}

            {/* Timeline Controls and Header */}
            <TimelineHeader
                months={months}
                filters={filters}
                vendors={vendors}
                roles={roles}
                onNavigate={navigateTimeline}
                onResetToToday={resetToCurrentMonth}
                onFilterChange={updateFilters}
                onRefresh={refresh}
            />

            {/* Timeline Grid */}
            <div style={{
                backgroundColor: '#252526',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
                {/* Member Rows */}
                {members.map(member => (
                    <TimelineRow
                        key={member.id}
                        member={member}
                        months={months}
                        onCellClick={onCellClick}
                        onMemberClick={onMemberClick}
                    />
                ))}
            </div>

            {/* Legend */}
            <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#252526',
                borderRadius: '6px',
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <div style={{ fontSize: '13px', color: '#858585', fontWeight: '600' }}>Legend:</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#4ec9b0',
                        borderRadius: '3px'
                    }} />
                    <span style={{ fontSize: '13px', color: '#d4d4d4' }}>Available (0-89%)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#dcdcaa',
                        borderRadius: '3px'
                    }} />
                    <span style={{ fontSize: '13px', color: '#d4d4d4' }}>Near Capacity (90-100%)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: '#f48771',
                        borderRadius: '3px'
                    }} />
                    <span style={{ fontSize: '13px', color: '#d4d4d4' }}>Over-Allocated (&gt;100%)</span>
                </div>

                <div style={{
                    marginLeft: 'auto',
                    fontSize: '12px',
                    color: '#858585',
                    fontStyle: 'italic'
                }}>
                    💡 Hover over cells for detailed capacity information
                </div>
            </div>
        </div>
    );
};

export default CapacityTimeline;
