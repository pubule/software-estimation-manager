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

    // Calculate background opacity based on utilization
    const getBackgroundStyle = (): React.CSSProperties => {
        // Base color from status
        const baseColor = data.statusColor;

        // Opacity based on utilization (min 20%, max 100%)
        const opacity = Math.max(0.2, Math.min(1, data.utilization / 100));

        return {
            backgroundColor: baseColor,
            opacity: data.existingAllocations > 0 ? opacity : 0.1
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
                    backgroundColor: '#252526',
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
                    borderBottom: '1px solid #3c3c3c',
                    color: '#d4d4d4'
                }}>
                    {memberName} - {monthLabel}
                </div>

                {/* Capacity Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#858585' }}>Monthly Capacity:</span>
                        <span style={{ color: '#d4d4d4', fontWeight: '600' }}>{data.monthlyCapacity} MD</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#858585' }}>Working Days:</span>
                        <span style={{ color: '#d4d4d4', fontWeight: '600' }}>{data.baseWorkingDays} days</span>
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
                        borderTop: '1px solid #3c3c3c',
                        marginTop: '4px'
                    }}>
                        <span style={{ color: '#858585' }}>Allocated:</span>
                        <span style={{
                            color: data.isOverallocated ? '#f48771' : '#d4d4d4',
                            fontWeight: '600'
                        }}>
                            {data.existingAllocations} MD
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#858585' }}>Available:</span>
                        <span style={{
                            color: data.availableCapacity > 0 ? '#4ec9b0' : '#858585',
                            fontWeight: '600'
                        }}>
                            {data.availableCapacity} MD
                        </span>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '4px',
                        borderTop: '1px solid #3c3c3c',
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
                border: '1px solid #3c3c3c',
                transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => onClick?.(month, memberName, data)}
        >
            {/* Background with color coding */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    ...getBackgroundStyle(),
                    transition: 'opacity 0.2s ease'
                }}
            />

            {/* Content */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: data.existingAllocations > 0 ? '#1e1e1e' : '#858585'
            }}>
                {data.existingAllocations > 0 ? (
                    <>
                        <div>{data.existingAllocations} MD</div>
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
