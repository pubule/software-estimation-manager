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

import React, { useState } from 'react';
import { useCapacityTimeline } from '../hooks/useCapacityTimeline';
import TimelineHeader from './TimelineHeader';
import ExpandableTimelineRow from './ExpandableTimelineRow';
import AssignmentModal from './AssignmentModal';
import CollapsibleSection from './CollapsibleSection';
import EmptyStateAllocation from './EmptyStateAllocation';
import type { TimelineMemberCapacity } from '../hooks/useCapacityTimeline';
import '../../styles/capacity-modern.css';

interface CapacityTimelineProps {
    monthsToShow?: number; // Number of months to display (default: 8)
    onMemberClick?: (member: TimelineMemberCapacity) => void;
    onCellClick?: (month: string, memberName: string, data: any) => void;
}

export const CapacityTimeline: React.FC<CapacityTimelineProps> = ({
    monthsToShow = 8,
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

    // Assignment modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);
    const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
    const [editingAllocation, setEditingAllocation] = useState<any | undefined>(undefined);

    // Collapsible sections state
    const [projectPhasesExpanded, setProjectPhasesExpanded] = useState(false);
    const [teamMemberAllocationsExpanded, setTeamMemberAllocationsExpanded] = useState(true);

    // Handle Add Assignment button click
    const handleAddAssignment = () => {
        setSelectedMemberId(undefined);
        setSelectedMonth(undefined);
        setEditingAllocation(undefined);
        setIsModalOpen(true);
    };

    // Handle cell click (member + month selection)
    const handleCellClickInternal = (month: string, memberName: string, data: any) => {
        // Find member by name to get ID
        const member = members.find(m => m.fullName === memberName);
        if (member) {
            setSelectedMemberId(member.id);
            setSelectedMonth(month);
            setEditingAllocation(undefined);
            setIsModalOpen(true);
        }

        // Call original onCellClick if provided
        onCellClick?.(month, memberName, data);
    };

    // Handle edit allocation (from ExpandableTimelineRow edit button)
    const handleEditAllocation = (allocation: any) => {
        console.log('✏️ Opening edit modal for allocation:', allocation);
        setEditingAllocation(allocation);
        setSelectedMemberId(undefined); // Clear member selection (allocation has its own member)
        setSelectedMonth(undefined); // Clear month selection (allocation has its own dates)
        setIsModalOpen(true);
    };

    // Handle modal close
    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedMemberId(undefined);
        setSelectedMonth(undefined);
        setEditingAllocation(undefined);
    };

    // Helper function to collapse all timeline chevrons by clearing localStorage
    const collapseAllTimelineChevrons = () => {
        // Get all localStorage keys
        const keys = Object.keys(localStorage);

        // Remove all timeline expansion state keys
        keys.forEach(key => {
            if (key.startsWith('timeline-expanded-') ||
                key.startsWith('timeline-projects-expanded-')) {
                localStorage.removeItem(key);
            }
        });

        console.log('🧹 All timeline chevron states cleared from localStorage');
    };

    // Handle successful save
    const handleSave = (updatedAllocation?: any) => {
        console.log('💾 CapacityTimeline: handleSave called with:', updatedAllocation);
        collapseAllTimelineChevrons(); // Collapse all chevrons before refresh
        refresh(); // Refresh data to show new allocation
        handleModalClose();
        console.log('✅ CapacityTimeline: Data refreshed and modal closed');
    };

    // Render statistics bar
    const renderStats = () => (
        <div className="capacity-modern-stats-grid">
            {/* Total Members */}
            <div className="capacity-modern-stat-card capacity-modern-stat-primary">
                <div className="capacity-modern-stat-label">Team Members</div>
                <div className="capacity-modern-stat-value">{stats.totalMembers}</div>
            </div>

            {/* Average Utilization */}
            <div className="capacity-modern-stat-card capacity-modern-stat-success">
                <div className="capacity-modern-stat-label">Avg Utilization</div>
                <div className="capacity-modern-stat-value">
                    {stats.averageUtilization.toFixed(1)}%
                </div>
            </div>

            {/* Over-allocated Count */}
            <div className="capacity-modern-stat-card capacity-modern-stat-danger">
                <div className="capacity-modern-stat-label">Over-Allocated</div>
                <div className="capacity-modern-stat-value">
                    {stats.totalOverallocated}
                </div>
                <div className="capacity-modern-stat-sublabel">
                    member-months
                </div>
            </div>

            {/* Months Displayed */}
            <div className="capacity-modern-stat-card capacity-modern-stat-warning">
                <div className="capacity-modern-stat-label">Timeline Range</div>
                <div className="capacity-modern-stat-value">
                    {stats.monthsDisplayed}
                </div>
                <div className="capacity-modern-stat-sublabel">
                    months
                </div>
            </div>
        </div>
    );

    // Render table header with columns
    const renderTableHeader = () => (
        <div
            className="capacity-modern-table-header"
            style={{
                display: 'grid',
                gridTemplateColumns: `250px 100px 100px 100px repeat(${months.length}, 120px)`
            }}
        >
            {/* Column 1: TEAM MEMBER - Sticky */}
            <div className="capacity-modern-table-header-cell" style={{ textAlign: 'left' }}>
                <i className="fas fa-user"></i> TEAM MEMBER
            </div>

            {/* Column 2: ACTIONS - Sticky */}
            <div className="capacity-modern-table-header-cell" style={{ textAlign: 'center' }}>
                ACTIONS
            </div>

            {/* Column 3: TOTAL MDS - Sticky */}
            <div className="capacity-modern-table-header-cell" style={{ textAlign: 'center' }}>
                TOTAL MDS
            </div>

            {/* Column 4: ALLOCATED MDS - Sticky */}
            <div className="capacity-modern-table-header-cell" style={{ textAlign: 'center' }}>
                ALLOCATED MDS
            </div>

            {/* Months (scrollable) */}
            {months.map(({ label }) => (
                <div key={label} className="capacity-modern-table-header-cell" style={{ textAlign: 'center' }}>
                    {label}
                </div>
            ))}
        </div>
    );

    // Render loading state
    if (loading) {
        return (
            <div className="capacity-modern-section">
                <div className="capacity-modern-empty-state">
                    <i className="fas fa-spinner fa-spin"></i>
                    <h3>Loading timeline data...</h3>
                    <p>Please wait while we load your capacity information</p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="capacity-modern-section">
                <div className="capacity-modern-empty-state">
                    <i className="fas fa-exclamation-triangle" style={{ color: '#f48771' }}></i>
                    <h3 style={{ color: '#f48771' }}>Error</h3>
                    <p>{error}</p>
                    <button onClick={refresh} className="capacity-modern-btn capacity-modern-btn-primary">
                        <i className="fas fa-redo"></i> Retry
                    </button>
                </div>
            </div>
        );
    }

    // Render empty state
    if (members.length === 0) {
        return (
            <div className="capacity-modern-section">
                <div className="capacity-modern-empty-state">
                    <i className="fas fa-users"></i>
                    <h3>No team members found</h3>
                    <p>
                        {filters.vendor || filters.role || filters.status
                            ? 'Try adjusting your filters to see team members'
                            : 'No team members configured in the system'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="capacity-modern-section">
            {/* Page Header with Add Assignment Button */}
            <div className="page-header">
                <div>
                    <h2>
                        <i className="fas fa-chart-timeline"></i>
                        Capacity Timeline
                    </h2>
                    <p className="capacity-modern-description">
                        Resource capacity visualization across time - {months[0]?.label} to {months[months.length - 1]?.label}
                    </p>
                </div>
                <div className="page-actions">
                    <button
                        onClick={handleAddAssignment}
                        className="btn btn-primary"
                    >
                        <i className="fas fa-plus"></i> Add Assignment
                    </button>
                </div>
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

            {/* Section 1: PROJECT PHASES TIMELINE (Collapsible) */}
            <CollapsibleSection
                title="PROJECT PHASES TIMELINE"
                icon="fas fa-project-diagram"
                isExpanded={projectPhasesExpanded}
                onToggle={() => setProjectPhasesExpanded(!projectPhasesExpanded)}
            >
                <div className="capacity-modern-card">
                    {/* Future implementation: Project phases timeline view */}
                    <div style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-info-circle"></i> Project phases timeline view will be implemented here
                    </div>
                </div>
            </CollapsibleSection>

            {/* Section 2: TEAM MEMBER ALLOCATIONS (Collapsible) */}
            <CollapsibleSection
                title="TEAM MEMBER ALLOCATIONS"
                icon="fas fa-users"
                isExpanded={teamMemberAllocationsExpanded}
                onToggle={() => setTeamMemberAllocationsExpanded(!teamMemberAllocationsExpanded)}
            >
                <div className="capacity-modern-card">
                    {/* Table Header */}
                    {renderTableHeader()}

                    {/* Member Rows or Empty State */}
                    {members.length === 0 ? (
                        <EmptyStateAllocation />
                    ) : (
                        members.map(member => (
                            <ExpandableTimelineRow
                                key={member.id}
                                member={member}
                                months={months}
                                onCellClick={handleCellClickInternal}
                                onMemberClick={onMemberClick}
                                onRefresh={refresh}
                                onEditAllocation={handleEditAllocation}
                            />
                        ))
                    )}
                </div>
            </CollapsibleSection>

            {/* Assignment Modal */}
            {isModalOpen && (
                <AssignmentModal
                    allocation={editingAllocation}
                    initialMemberId={selectedMemberId}
                    initialMonth={selectedMonth}
                    onSave={handleSave}
                    onClose={handleModalClose}
                />
            )}

            {/* Legend */}
            <div className="capacity-modern-legend">
                <div className="capacity-modern-legend-label">Legend:</div>

                <div className="capacity-modern-legend-item">
                    <div className="capacity-modern-legend-box capacity-modern-legend-available" />
                    <span>Available (0-89%)</span>
                </div>

                <div className="capacity-modern-legend-item">
                    <div className="capacity-modern-legend-box capacity-modern-legend-near-capacity" />
                    <span>Near Capacity (90-100%)</span>
                </div>

                <div className="capacity-modern-legend-item">
                    <div className="capacity-modern-legend-box capacity-modern-legend-over-allocated" />
                    <span>Over-Allocated (&gt;100%)</span>
                </div>

                <div className="capacity-modern-legend-hint">
                    <i className="fas fa-info-circle"></i> Hover over cells for detailed capacity information
                </div>
            </div>
        </div>
    );
};

export default CapacityTimeline;
