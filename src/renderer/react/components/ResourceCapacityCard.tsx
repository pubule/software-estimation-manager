/**
 * Resource Capacity Card Component
 *
 * Displays capacity information for a single team member
 * Shows: name, role, vendor, utilization, allocations, available capacity
 */

import React from 'react';
import type { ResourceOverviewMember } from '../hooks/useResourceOverview';

interface ResourceCapacityCardProps {
    member: ResourceOverviewMember;
    onClick?: (member: ResourceOverviewMember) => void;
}

export const ResourceCapacityCard: React.FC<ResourceCapacityCardProps> = ({ member, onClick }) => {
    // Calculate progress bar width
    const progressWidth = Math.min(member.utilization, 100);
    const overflowWidth = Math.max(0, member.utilization - 100);

    return (
        <div
            onClick={() => onClick?.(member)}
            style={{
                backgroundColor: '#252526',
                border: `2px solid ${member.statusColor}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => {
                if (onClick) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                }
            }}
            onMouseLeave={(e) => {
                if (onClick) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                }
            }}
        >
            {/* Header: Name and Status Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0', color: '#d4d4d4', fontSize: '16px', fontWeight: '600' }}>
                        {member.fullName}
                    </h3>
                    <p style={{ margin: 0, color: '#858585', fontSize: '13px' }}>
                        {member.role} • {member.vendorName}
                    </p>
                </div>

                <div
                    style={{
                        backgroundColor: member.statusColor,
                        color: '#1e1e1e',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                    }}
                >
                    {member.status.replace('-', ' ')}
                </div>
            </div>

            {/* Utilization Progress Bar */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#858585' }}>Utilization</span>
                    <span style={{
                        fontSize: '13px',
                        color: member.isOverallocated ? '#f48771' : '#d4d4d4',
                        fontWeight: '600'
                    }}>
                        {member.utilization.toFixed(1)}%
                    </span>
                </div>

                <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#3c3c3c',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {/* Main progress */}
                    <div
                        style={{
                            width: `${progressWidth}%`,
                            height: '100%',
                            backgroundColor: member.statusColor,
                            transition: 'width 0.3s ease'
                        }}
                    />

                    {/* Overflow indicator */}
                    {overflowWidth > 0 && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: '100%',
                                width: `${Math.min(overflowWidth, 50)}%`,
                                height: '100%',
                                backgroundColor: '#f48771',
                                opacity: 0.7
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Capacity Details Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                fontSize: '12px'
            }}>
                <div>
                    <div style={{ color: '#858585', marginBottom: '2px' }}>Monthly Capacity</div>
                    <div style={{ color: '#d4d4d4', fontWeight: '600' }}>{member.monthlyCapacity} MD</div>
                </div>

                <div>
                    <div style={{ color: '#858585', marginBottom: '2px' }}>Working Days</div>
                    <div style={{ color: '#d4d4d4', fontWeight: '600' }}>{member.baseWorkingDays} days</div>
                </div>

                <div>
                    <div style={{ color: '#858585', marginBottom: '2px' }}>Allocated</div>
                    <div style={{ color: member.isOverallocated ? '#f48771' : '#d4d4d4', fontWeight: '600' }}>
                        {member.existingAllocations} MD
                    </div>
                </div>

                <div>
                    <div style={{ color: '#858585', marginBottom: '2px' }}>Available</div>
                    <div style={{ color: member.availableCapacity > 0 ? '#4ec9b0' : '#858585', fontWeight: '600' }}>
                        {member.availableCapacity} MD
                    </div>
                </div>

                {member.vacationDays > 0 && (
                    <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ color: '#858585', marginBottom: '2px' }}>Vacation Days</div>
                        <div style={{ color: '#dcdcaa', fontWeight: '600' }}>{member.vacationDays} days</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourceCapacityCard;
