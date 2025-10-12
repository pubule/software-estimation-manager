/**
 * Available Capacity Row Component
 *
 * Displays available capacity for a team member across the timeline
 * Shows capacity remaining after allocations (Total Capacity - Allocated = Available)
 *
 * Features:
 * - Green-themed styling to indicate availability
 * - Shows total available MDs
 * - Monthly breakdown of available capacity
 * - Label "AVAILABLE CAPACITY" for clarity
 */

import React from 'react';
import type { TimelineMonth, TimelineMemberCapacity } from '../hooks/useCapacityTimeline';
import '../../styles/capacity-modern.css';

interface AvailableCapacityRowProps {
    member: TimelineMemberCapacity;
    months: TimelineMonth[];
    totalCapacity: number;
    totalAllocated: number;
}

export const AvailableCapacityRow: React.FC<AvailableCapacityRowProps> = ({
    member,
    months,
    totalCapacity,
    totalAllocated
}) => {
    // Calculate total available
    const totalAvailable = totalCapacity - totalAllocated;

    // Calculate available capacity per month
    const getMonthlyAvailable = (month: string): number => {
        const monthData = member.monthlyData[month];
        if (!monthData) return 0;

        const capacity = monthData.monthlyCapacity || 0;
        const allocated = monthData.existingAllocations || 0;
        return Math.max(0, capacity - allocated);
    };

    return (
        <div
            className="capacity-modern-available-row"
            style={{
                display: 'grid',
                gridTemplateColumns: `250px 100px 100px 100px repeat(${months.length}, 120px)`
            }}
        >
            {/* Column 1: Member Info - Sticky */}
            <div className="capacity-modern-available-info">
                {/* Label */}
                <div className="capacity-modern-available-label">
                    AVAILABLE CAPACITY
                </div>

                {/* Member Name */}
                <div className="capacity-modern-available-member-name">
                    {member.fullName}
                </div>

                {/* Role and Vendor */}
                <div className="capacity-modern-available-meta">
                    {member.role} - {member.vendorName}
                </div>
            </div>

            {/* Column 2: Actions - Sticky */}
            <div className="capacity-modern-available-actions">
                <i className="fas fa-check-circle capacity-modern-available-icon"></i>
            </div>

            {/* Column 3: Total MDs - Sticky */}
            <div className="capacity-modern-available-total">
                <span className="capacity-modern-available-value">
                    {totalCapacity.toFixed(1)} MDs
                </span>
            </div>

            {/* Column 4: Allocated MDs - Sticky */}
            <div className="capacity-modern-available-allocated">
                <span className="capacity-modern-available-allocated-value">
                    {totalAllocated.toFixed(1)} MDs
                </span>
            </div>

            {/* Month Cells (scrollable) */}
            {months.map(({ month, label }) => {
                const available = getMonthlyAvailable(month);

                return (
                    <div key={month} className="capacity-modern-available-month-cell">
                        <span className="capacity-modern-available-month-value">
                            {available > 0 ? `${available.toFixed(1)} MDs` : '—'}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default AvailableCapacityRow;
