/**
 * Timeline Row Component
 *
 * Displays a single row in the capacity timeline for one team member
 * Shows member info + month cells for each month in timeline
 */

import React from 'react';
import TimelineMonthCell from './TimelineMonthCell';
import type { TimelineMonth, TimelineMemberCapacity } from '../hooks/useCapacityTimeline';

interface TimelineRowProps {
    member: TimelineMemberCapacity;
    months: TimelineMonth[];
    onCellClick?: (month: string, memberName: string, data: any) => void;
    onMemberClick?: (member: TimelineMemberCapacity) => void;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
    member,
    months,
    onCellClick,
    onMemberClick
}) => {
    // Calculate average utilization across all months
    const averageUtilization = React.useMemo(() => {
        const monthData = Object.values(member.monthlyData);
        if (monthData.length === 0) return 0;

        const totalUtilization = monthData.reduce((sum: number, data: any) =>
            sum + data.utilization, 0
        );
        return totalUtilization / monthData.length;
    }, [member.monthlyData]);

    // Determine row status color based on average utilization
    const getRowStatusColor = () => {
        if (averageUtilization > 100) return '#f48771'; // Red
        if (averageUtilization >= 90) return '#dcdcaa'; // Yellow
        return '#4ec9b0'; // Green
    };

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '250px 1fr',
                borderBottom: '1px solid #3c3c3c',
                backgroundColor: '#252526'
            }}
        >
            {/* Member Info Column */}
            <div
                style={{
                    padding: '12px 16px',
                    borderRight: '1px solid #3c3c3c',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    cursor: onMemberClick ? 'pointer' : 'default',
                    transition: 'background-color 0.2s ease'
                }}
                onClick={() => onMemberClick?.(member)}
                onMouseEnter={(e) => {
                    if (onMemberClick) {
                        e.currentTarget.style.backgroundColor = '#2d2d30';
                    }
                }}
                onMouseLeave={(e) => {
                    if (onMemberClick) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                }}
            >
                {/* Name and Status Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {/* Status Dot */}
                    <div
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: getRowStatusColor(),
                            flexShrink: 0
                        }}
                    />
                    <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#d4d4d4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {member.fullName}
                    </div>
                </div>

                {/* Role and Vendor */}
                <div style={{
                    fontSize: '12px',
                    color: '#858585',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginLeft: '16px'
                }}>
                    {member.role}
                </div>
                <div style={{
                    fontSize: '11px',
                    color: '#6a6a6a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginLeft: '16px'
                }}>
                    {member.vendorName}
                </div>

                {/* Average Utilization */}
                <div style={{
                    fontSize: '11px',
                    color: getRowStatusColor(),
                    marginTop: '4px',
                    marginLeft: '16px',
                    fontWeight: '600'
                }}>
                    Avg: {averageUtilization.toFixed(1)}%
                </div>
            </div>

            {/* Month Cells */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${months.length}, 1fr)`,
                    gap: '0'
                }}
            >
                {months.map(({ month, label }) => {
                    const monthData = member.monthlyData[month];

                    if (!monthData) {
                        // No data for this month
                        return (
                            <div
                                key={month}
                                style={{
                                    border: '1px solid #3c3c3c',
                                    minHeight: '50px',
                                    backgroundColor: '#1e1e1e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#6a6a6a',
                                    fontSize: '11px'
                                }}
                            >
                                —
                            </div>
                        );
                    }

                    return (
                        <TimelineMonthCell
                            key={month}
                            month={month}
                            monthLabel={label}
                            memberName={member.fullName}
                            data={monthData}
                            onClick={onCellClick}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default TimelineRow;
