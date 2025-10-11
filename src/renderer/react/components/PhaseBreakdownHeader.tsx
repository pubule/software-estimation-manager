/**
 * Phase Breakdown Header Component
 *
 * Header for phase breakdown section when a project is expanded
 * Shows project name and table header with columns: PHASE | DATE RANGE | TOTAL MDS | ALLOCATED MDS | (months)
 *
 * Features:
 * - Clear section separation
 * - Sticky positioning for visibility during scroll
 * - Column headers for phase data
 */

import React from 'react';
import type { TimelineMonth } from '../hooks/useCapacityTimeline';
import '../../styles/capacity-modern.css';

interface PhaseBreakdownHeaderProps {
    projectName: string;
    months: TimelineMonth[];
}

export const PhaseBreakdownHeader: React.FC<PhaseBreakdownHeaderProps> = ({
    projectName,
    months
}) => {
    return (
        <>
            {/* Section Title */}
            <div className="capacity-modern-phase-breakdown-title">
                <i className="fas fa-layer-group"></i>
                <span>Phase Breakdown for {projectName}</span>
            </div>

            {/* Table Header */}
            <div
                className="capacity-modern-phase-breakdown-header"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `550px repeat(${months.length}, 120px)`
                }}
            >
                {/* Phase Info Columns - Sticky (550px with inner grid) */}
                <div className="capacity-modern-phase-breakdown-info-cols">
                    {/* Column: PHASE */}
                    <div className="capacity-modern-phase-header-col phase-col-name">
                        PHASE
                    </div>

                    {/* Column: DATE RANGE */}
                    <div className="capacity-modern-phase-header-col phase-col-daterange">
                        DATE RANGE
                    </div>

                    {/* Column: TOTAL MDS */}
                    <div className="capacity-modern-phase-header-col phase-col-total">
                        TOTAL MDS
                    </div>

                    {/* Column: ALLOCATED MDS */}
                    <div className="capacity-modern-phase-header-col phase-col-allocated">
                        ALLOCATED MDS
                    </div>

                    {/* Column: Empty spacer for alignment */}
                    <div className="capacity-modern-phase-header-col">
                        {/* Empty column for grid alignment */}
                    </div>
                </div>

                {/* Month Columns (scrollable) */}
                {months.map(({ label }) => (
                    <div key={label} className="capacity-modern-phase-header-month">
                        {label}
                    </div>
                ))}
            </div>
        </>
    );
};

export default PhaseBreakdownHeader;
