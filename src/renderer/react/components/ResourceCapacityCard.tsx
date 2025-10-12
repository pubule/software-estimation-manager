/**
 * Resource Capacity Card Component
 *
 * Displays capacity information for a single team member
 * Shows: name, role, vendor, utilization, allocations, available capacity
 */

import React from 'react';
import type { ResourceOverviewMember } from '../hooks/useResourceOverview';
import '../../styles/capacity-modern.css';

interface ResourceCapacityCardProps {
    member: ResourceOverviewMember;
    onClick?: (member: ResourceOverviewMember) => void;
    onAllocateClick?: (member: ResourceOverviewMember) => void;
}

export const ResourceCapacityCard: React.FC<ResourceCapacityCardProps> = ({ member, onClick, onAllocateClick }) => {
    // Calculate progress bar width
    const progressWidth = Math.min(member.utilization, 100);
    const overflowWidth = Math.max(0, member.utilization - 100);

    // Determine status class
    const statusClass = member.status.replace('-', ' ');

    return (
        <div
            onClick={() => onClick?.(member)}
            className={`capacity-modern-resource-card status-${member.status}`}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {/* Header: Name and Status Badge */}
            <div className="capacity-modern-resource-header">
                <div>
                    <h3 className="capacity-modern-resource-name">
                        {member.fullName}
                    </h3>
                    <p className="capacity-modern-resource-meta">
                        {member.role} • {member.vendorName}
                    </p>
                </div>

                <div className={`capacity-modern-status-badge status-${member.status}`}>
                    {statusClass}
                </div>
            </div>

            {/* Utilization Progress Bar */}
            <div className="capacity-modern-utilization-bar-container">
                <div className="capacity-modern-utilization-header">
                    <span className="capacity-modern-utilization-label">Utilization</span>
                    <span className={`capacity-modern-utilization-value ${member.isOverallocated ? 'over-allocated' : ''}`}>
                        {member.utilization.toFixed(1)}%
                    </span>
                </div>

                <div className="capacity-modern-utilization-bar">
                    {/* Main progress */}
                    <div
                        className={`capacity-modern-utilization-progress status-${member.status}`}
                        style={{ width: `${progressWidth}%` }}
                    />

                    {/* Overflow indicator */}
                    {overflowWidth > 0 && (
                        <div
                            className="capacity-modern-utilization-overflow"
                            style={{ width: `${Math.min(overflowWidth, 50)}%` }}
                        />
                    )}
                </div>
            </div>

            {/* Capacity Details Grid */}
            <div className="capacity-modern-capacity-grid">
                <div className="capacity-modern-capacity-item">
                    <span className="capacity-modern-capacity-label">Monthly Capacity</span>
                    <span className="capacity-modern-capacity-value">{member.monthlyCapacity.toFixed(1)} MD</span>
                </div>

                <div className="capacity-modern-capacity-item">
                    <span className="capacity-modern-capacity-label">Working Days</span>
                    <span className="capacity-modern-capacity-value">{member.baseWorkingDays} days</span>
                </div>

                <div className="capacity-modern-capacity-item">
                    <span className="capacity-modern-capacity-label">Allocated</span>
                    <span className={`capacity-modern-capacity-value ${member.isOverallocated ? 'allocated' : ''}`}>
                        {member.existingAllocations.toFixed(1)} MD
                    </span>
                </div>

                <div className="capacity-modern-capacity-item">
                    <span className="capacity-modern-capacity-label">Available</span>
                    <span className={`capacity-modern-capacity-value ${member.availableCapacity > 0 ? 'available' : ''}`}>
                        {member.availableCapacity.toFixed(1)} MD
                    </span>
                </div>

                {member.vacationDays > 0 && (
                    <div className="capacity-modern-capacity-item" style={{ gridColumn: 'span 2' }}>
                        <span className="capacity-modern-capacity-label">Vacation Days</span>
                        <span className="capacity-modern-capacity-value vacation">{member.vacationDays} days</span>
                    </div>
                )}
            </div>

            {/* Allocate Button */}
            {onAllocateClick && (
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Don't trigger card click
                        onAllocateClick(member);
                    }}
                    className="capacity-modern-allocate-btn"
                >
                    <i className="fas fa-clipboard-list"></i> Allocate Project
                </button>
            )}
        </div>
    );
};

export default ResourceCapacityCard;
