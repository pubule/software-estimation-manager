/**
 * Timeline Month Cell Component
 *
 * Displays capacity information for a single member in a single month
 * Used in timeline grid view
 *
 * Features:
 * - Color-coded background based on utilization
 * - Tooltip with detailed capacity info on hover
 * - Click handler for drill-down
 */

import React, { useState } from 'react';

interface MonthCapacityData {
    baseWorkingDays: number;
    vacationDays: number;
    existingAllocations: number;
    availableCapacity: number;
    monthlyCapacity: number;
    utilization: number;
    isOverallocated: boolean;
    isNearCapacity: boolean;
    status: 'available' | 'near-capacity' | 'over-allocated';
    statusColor: string;
}

interface TimelineMonthCellProps {
    month: string; // 'YYYY-MM'
    monthLabel: string; // 'Jan 2025'
    memberName: string;
    data: MonthCapacityData;
    onClick?: (month: string, memberName: string, data: MonthCapacityData) => void;
}

export const TimelineMonthCell: React.FC<TimelineMonthCellProps> = ({
    month,
    monthLabel,
    memberName,
    data,
    onClick
}) => {
    const [showTooltip, setShowTooltip] = useState(false);

    // Calculate background fill based on utilization (horizontal bar from left to right)
    const getBackgroundStyle = (): React.CSSProperties => {
        // Base color from status
        const baseColor = data.statusColor;

        // Fill width based on utilization (0-100%+)
        const fillWidth = data.existingAllocations > 0 ? Math.min(100, data.utilization) : 0;

        return {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${fillWidth}%`,
            background: `linear-gradient(to right, ${baseColor}60, ${baseColor}30)`,
            transition: 'width 0.3s ease',
            ...(data.isOverallocated && {
                width: '100%',
                background: `repeating-linear-gradient(
                    45deg,
                    ${baseColor}80,
                    ${baseColor}80 10px,
                    ${baseColor}50 10px,
                    ${baseColor}50 20px
                )`,
                animation: 'pulse-warning 2s ease-in-out infinite'
            })
        };
    };

    // Tooltip content
    const renderTooltip = () => {
        if (!showTooltip) return null;

        return (
            <div
                style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: `2px solid ${data.statusColor}`,
                    borderRadius: '6px',
                    padding: '12px',
                    minWidth: '220px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    fontSize: '12px',
                    pointerEvents: 'none'
                }}
            >
                {/* Header */}
                <div style={{
                    fontWeight: '700',
                    marginBottom: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)'
                }}>
                    {memberName} - {monthLabel}
                </div>

                {/* Capacity Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#858585' }}>Monthly Capacity:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{data.monthlyCapacity.toFixed(1)} MD</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#858585' }}>Working Days:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{data.baseWorkingDays} days</span>
                    </div>

                    {data.vacationDays > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#858585' }}>Vacation:</span>
                            <span style={{ color: '#dcdcaa', fontWeight: '600' }}>{data.vacationDays} days</span>
                        </div>
                    )}

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '4px',
                        borderTop: '1px solid var(--border-primary)',
                        marginTop: '4px'
                    }}>
                        <span style={{ color: '#858585' }}>Allocated:</span>
                        <span style={{
                            color: data.isOverallocated ? '#f48771' : 'var(--text-primary)',
                            fontWeight: '600'
                        }}>
                            {data.existingAllocations.toFixed(1)} MD
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#858585' }}>Available:</span>
                        <span style={{
                            color: data.availableCapacity > 0 ? '#4ec9b0' : '#858585',
                            fontWeight: '600'
                        }}>
                            {data.availableCapacity.toFixed(1)} MD
                        </span>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '4px',
                        borderTop: '1px solid var(--border-primary)',
                        marginTop: '4px'
                    }}>
                        <span style={{ color: '#858585' }}>Utilization:</span>
                        <span style={{
                            color: data.statusColor,
                            fontWeight: '700'
                        }}>
                            {data.utilization.toFixed(1)}%
                        </span>
                    </div>

                    {data.isOverallocated && (
                        <div style={{
                            marginTop: '8px',
                            padding: '6px',
                            backgroundColor: 'rgba(244, 135, 113, 0.2)',
                            borderRadius: '4px',
                            color: '#f48771',
                            fontSize: '11px',
                            textAlign: 'center'
                        }}>
                            ⚠️ Over-allocated
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: onClick ? 'pointer' : 'default',
                border: '1px solid var(--border-primary)',
                transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => onClick?.(month, memberName, data)}
        >
            {/* Background with color coding - horizontal fill bar */}
            <div style={getBackgroundStyle()} />

            {/* Content */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: data.existingAllocations > 0 ? '700' : '600',
                color: data.existingAllocations > 0 ? '#ffffff' : '#858585',
                textShadow: data.existingAllocations > 0 ? '0 1px 3px rgba(0,0,0,0.8)' : 'none'
            }}>
                {data.existingAllocations > 0 ? (
                    <>
                        <div>{data.existingAllocations.toFixed(1)} MD</div>
                        <div style={{ fontSize: '10px', marginTop: '2px' }}>
                            {data.utilization.toFixed(0)}%
                        </div>
                    </>
                ) : (
                    <div style={{ fontSize: '11px' }}>—</div>
                )}
            </div>

            {/* Tooltip */}
            {renderTooltip()}
        </div>
    );
};

export default TimelineMonthCell;
