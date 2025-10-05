/**
 * Expandable Timeline Row Component
 *
 * Enhanced timeline row with drill-down to see project/phase allocations
 * Supports inline editing of allocation MDs with real-time validation
 *
 * Features:
 * - 3-level hierarchy: Member → Projects → Phases
 * - Inline editing with auto-save
 * - Overflow capacity validation
 * - Persistent expansion state (localStorage)
 */

import React, { useState, useEffect, useMemo } from 'react';
import TimelineMonthCell from './TimelineMonthCell';
import type { TimelineMonth, TimelineMemberCapacity } from '../hooks/useCapacityTimeline';

// Import Actions (available globally after build)
declare const AllocationActions: any;

interface ExpandableTimelineRowProps {
    member: TimelineMemberCapacity;
    months: TimelineMonth[];
    onCellClick?: (month: string, memberName: string, data: any) => void;
    onMemberClick?: (member: TimelineMemberCapacity) => void;
    onRefresh?: () => void; // Callback after allocation update
}

interface ProjectAllocation {
    projectId: string;
    projectName: string;
    allocationId: string;
    monthlyAllocations: {
        [month: string]: {
            planned: number;
            actual?: number;
        };
    };
    phaseAllocations?: {
        phaseId: string;
        phaseName: string;
        totalMDs: number;
        startDate: string;
        endDate: string;
    }[];
    phaseMonthlyBreakdown?: {
        [phaseId: string]: {
            [month: string]: number;
        };
    };
}

interface PhaseMonthlyBreakdown {
    [phaseId: string]: {
        phaseName: string;
        monthlyMDs: {
            [month: string]: number;
        };
    };
}

export const ExpandableTimelineRow: React.FC<ExpandableTimelineRowProps> = ({
    member,
    months,
    onCellClick,
    onMemberClick,
    onRefresh
}) => {
    // Expansion state
    const [isMemberExpanded, setIsMemberExpanded] = useState(false);
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

    // Editing state
    const [editingCell, setEditingCell] = useState<{
        allocationId: string;
        phaseId?: string;
        month: string;
    } | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    // Allocations data
    const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);

    // Track which projects have loaded phases from project file (for backward compatibility)
    const [loadedProjectPhases, setLoadedProjectPhases] = useState<Set<string>>(new Set());

    // Load member's allocations when expanded
    useEffect(() => {
        if (isMemberExpanded && typeof window.AllocationActions !== 'undefined') {
            loadMemberAllocations();
        }
    }, [isMemberExpanded, member.id]);

    // Load expansion state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(`timeline-expanded-${member.id}`);
        if (saved === 'true') {
            setIsMemberExpanded(true);
        }
    }, [member.id]);

    // Save expansion state to localStorage
    useEffect(() => {
        localStorage.setItem(`timeline-expanded-${member.id}`, String(isMemberExpanded));
    }, [isMemberExpanded, member.id]);

    const loadMemberAllocations = () => {
        try {
            const allocationActions = new window.AllocationActions();
            const allocations = allocationActions.getAllocationsForMember(member.id);

            console.log(`📊 Loaded ${allocations.length} allocation(s) for ${member.fullName}`);

            const projects: ProjectAllocation[] = allocations.map((allocation: any) => ({
                projectId: allocation.projectId,
                projectName: allocation.projectName || allocation.projectId,
                allocationId: allocation.id,
                monthlyAllocations: allocation.monthlyAllocations || {},
                phaseAllocations: allocation.phaseAllocations || [],
                phaseMonthlyBreakdown: allocation.phaseMonthlyBreakdown || {}
            }));

            setProjectAllocations(projects);
        } catch (error) {
            console.error('Error loading allocations:', error);
        }
    };

    /**
     * Load phases from project file (backward compatibility for old allocations)
     * Called when project is expanded and allocation has no phaseAllocations
     */
    const loadProjectPhases = async (projectId: string, allocationId: string) => {
        // Skip if already loaded
        if (loadedProjectPhases.has(projectId)) {
            console.log(`✅ Phases already loaded for project ${projectId}`);
            return;
        }

        try {
            console.log(`📂 Loading phases from project file for ${projectId}...`);

            // Find project file path from store
            const store = window.appStore?.getState();
            const projectsList = store?.projectsList || [];
            const project = projectsList.find((p: any) => p.id === projectId || p.code === projectId);

            if (!project || !project.filePath) {
                console.warn(`⚠️ Project file path not found for ${projectId}`);
                return;
            }

            // Load project file
            if (!window.electronAPI?.loadProjectFile) {
                console.error('❌ electronAPI not available');
                return;
            }

            const result = await window.electronAPI.loadProjectFile(project.filePath);

            if (!result.success || !result.data) {
                console.error(`❌ Failed to load project file: ${result.error}`);
                return;
            }

            const projectData = result.data;

            // Extract phases from project
            const phasesFromProject: any[] = [];

            // Helper to get display name
            const getPhaseDisplayName = (phaseId: string): string => {
                const names: Record<string, string> = {
                    functionalAnalysis: 'Functional Analysis',
                    technicalAnalysis: 'Technical Analysis',
                    development: 'Development',
                    integrationTests: 'Integration Tests',
                    uatTests: 'UAT Tests',
                    consolidation: 'Consolidation',
                    vapt: 'VAPT',
                    postGoLive: 'Post Go-Live'
                };
                return names[phaseId] || phaseId;
            };

            if (projectData.phases && typeof projectData.phases === 'object') {
                // Phases are stored as object (most common format)
                Object.entries(projectData.phases).forEach(([phaseId, phaseData]: [string, any]) => {
                    if (phaseId === 'selectedSuppliers') return; // Skip metadata

                    phasesFromProject.push({
                        phaseId,
                        phaseName: getPhaseDisplayName(phaseId),
                        totalMDs: phaseData.manDays || 0,
                        startDate: phaseData.startDate || '',
                        endDate: phaseData.endDate || ''
                    });
                });
            }

            console.log(`✅ Loaded ${phasesFromProject.length} phase(s) from project file`);

            // Update the allocation's phaseAllocations
            setProjectAllocations(prev => prev.map(p =>
                p.allocationId === allocationId
                    ? { ...p, phaseAllocations: phasesFromProject }
                    : p
            ));

            // Mark as loaded
            setLoadedProjectPhases(prev => new Set([...prev, projectId]));

        } catch (error) {
            console.error(`❌ Error loading project phases:`, error);
        }
    };

    // Calculate average utilization
    const averageUtilization = useMemo(() => {
        const monthData = Object.values(member.monthlyData);
        if (monthData.length === 0) return 0;

        const totalUtilization = monthData.reduce((sum: number, data: any) =>
            sum + data.utilization, 0
        );
        return totalUtilization / monthData.length;
    }, [member.monthlyData]);

    // Get status color
    const getRowStatusColor = () => {
        if (averageUtilization > 100) return '#f48771'; // Red
        if (averageUtilization >= 90) return '#dcdcaa'; // Yellow
        return '#4ec9b0'; // Green
    };

    // Toggle member expansion
    const toggleMemberExpansion = () => {
        setIsMemberExpanded(!isMemberExpanded);
    };

    // Toggle project expansion
    const toggleProjectExpansion = (projectId: string, allocationId: string) => {
        const newExpanded = new Set(expandedProjects);
        const wasCollapsed = !newExpanded.has(projectId);

        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
        } else {
            newExpanded.add(projectId);

            // If expanding and project has no phases, load from project file
            if (wasCollapsed) {
                const project = projectAllocations.find(p => p.projectId === projectId);
                if (project && (!project.phaseAllocations || project.phaseAllocations.length === 0)) {
                    console.log(`📦 Project ${projectId} has no phases, loading from file...`);
                    loadProjectPhases(projectId, allocationId);
                }
            }
        }
        setExpandedProjects(newExpanded);
    };

    // Start editing a cell
    const startEditing = (allocationId: string, phaseId: string | undefined, month: string, currentValue: number) => {
        setEditingCell({ allocationId, phaseId, month });
        setEditValue(String(currentValue));
    };

    // Save edited value with full recalculation
    const saveEdit = async () => {
        if (!editingCell) return;

        const newValue = parseFloat(editValue);
        if (isNaN(newValue) || newValue < 0) {
            alert('Please enter a valid number');
            setEditingCell(null);
            return;
        }

        // If editing a phase cell, phaseId must be present
        if (!editingCell.phaseId) {
            console.error('Cannot edit phase cell without phaseId');
            setEditingCell(null);
            return;
        }

        try {
            const allocationActions = new window.AllocationActions();

            // Find the allocation
            const allocation = projectAllocations.find(p => p.allocationId === editingCell.allocationId);
            if (!allocation) return;

            console.log('💾 Saving phase MD edit:', {
                phase: editingCell.phaseId,
                month: editingCell.month,
                oldValue: allocation.phaseMonthlyBreakdown?.[editingCell.phaseId!]?.[editingCell.month],
                newValue
            });

            // 1. Update phaseMonthlyBreakdown
            const updatedBreakdown = {
                ...(allocation.phaseMonthlyBreakdown || {}),
                [editingCell.phaseId!]: {
                    ...(allocation.phaseMonthlyBreakdown?.[editingCell.phaseId!] || {}),
                    [editingCell.month]: newValue
                }
            };

            // 2. Recalculate phase totalMDs (sum all months for the phase)
            const updatedPhaseAllocations = (allocation.phaseAllocations || []).map(phase => {
                if (phase.phaseId === editingCell.phaseId) {
                    const phaseMDs = updatedBreakdown[phase.phaseId] || {};
                    const totalMDs = Object.values(phaseMDs).reduce((sum: number, val: number) => sum + val, 0);
                    console.log(`📊 Recalculated ${phase.phaseName} totalMDs:`, totalMDs);
                    return { ...phase, totalMDs };
                }
                return phase;
            });

            // 3. Recalculate monthly allocations (aggregate all phases per month)
            const updatedMonthlyAllocations: any = {};

            // Get all months across all phases
            const allMonths = new Set<string>();
            Object.values(updatedBreakdown).forEach((phaseMDs: any) => {
                Object.keys(phaseMDs).forEach(month => allMonths.add(month));
            });

            // For each month, sum across all phases
            allMonths.forEach(month => {
                let monthTotal = 0;
                Object.values(updatedBreakdown).forEach((phaseMDs: any) => {
                    monthTotal += phaseMDs[month] || 0;
                });
                updatedMonthlyAllocations[month] = {
                    planned: monthTotal,
                    actual: monthTotal
                };
            });

            console.log('📊 Recalculated monthly allocations:', updatedMonthlyAllocations);

            // 4. Update allocation with all 3 recalculated structures
            await allocationActions.updateAllocation(editingCell.allocationId, {
                phaseMonthlyBreakdown: updatedBreakdown,
                phaseAllocations: updatedPhaseAllocations,
                monthlyAllocations: updatedMonthlyAllocations
            });

            console.log('✅ Allocation updated successfully with full recalculation');

            // 5. Refresh data → This triggers capacity timeline recalculation (% + overflow)
            loadMemberAllocations();
            onRefresh?.();

            setEditingCell(null);
        } catch (error) {
            console.error('❌ Error updating allocation:', error);
            alert('Failed to update allocation');
            setEditingCell(null);
        }
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    // Calculate phase breakdown per month (for phase-based allocations)
    const getPhaseMonthlyBreakdown = (project: ProjectAllocation): PhaseMonthlyBreakdown => {
        const breakdown: PhaseMonthlyBreakdown = {};

        if (!project.phaseAllocations || project.phaseAllocations.length === 0) {
            return breakdown;
        }

        // If phaseMonthlyBreakdown exists (saved data), use it
        if (project.phaseMonthlyBreakdown) {
            console.log('📊 Using saved phaseMonthlyBreakdown for project:', project.projectName);
            project.phaseAllocations.forEach(phase => {
                breakdown[phase.phaseId] = {
                    phaseName: phase.phaseName,
                    monthlyMDs: project.phaseMonthlyBreakdown![phase.phaseId] || {}
                };
            });
            return breakdown;
        }

        // Otherwise, calculate uniformly (backward compatibility for old allocations)
        console.log('📊 Calculating uniform distribution for project:', project.projectName);
        project.phaseAllocations.forEach(phase => {
            const startDate = new Date(phase.startDate);
            const endDate = new Date(phase.endDate);

            const monthlyMDs: { [month: string]: number } = {};

            // Get all months in phase range
            let current = new Date(startDate);
            const phaseMonths: string[] = [];
            while (current <= endDate) {
                const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                phaseMonths.push(monthKey);
                current.setMonth(current.getMonth() + 1);
            }

            // Distribute totalMDs evenly across months
            const mdsPerMonth = phase.totalMDs / phaseMonths.length;
            phaseMonths.forEach(month => {
                monthlyMDs[month] = mdsPerMonth;
            });

            breakdown[phase.phaseId] = {
                phaseName: phase.phaseName,
                monthlyMDs
            };
        });

        return breakdown;
    };

    // Render member row (always visible)
    const renderMemberRow = () => (
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
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                }}
                onClick={toggleMemberExpansion}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2d2d30';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }}
            >
                {/* Name with Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {/* Chevron */}
                    <div style={{
                        fontSize: '12px',
                        color: '#858585',
                        transition: 'transform 0.2s ease',
                        transform: isMemberExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        width: '16px'
                    }}>
                        ▶
                    </div>

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
                    marginLeft: '24px'
                }}>
                    {member.role}
                </div>
                <div style={{
                    fontSize: '11px',
                    color: '#6a6a6a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginLeft: '24px'
                }}>
                    {member.vendorName}
                </div>

                {/* Average Utilization */}
                <div style={{
                    fontSize: '11px',
                    color: getRowStatusColor(),
                    marginTop: '4px',
                    marginLeft: '24px',
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

    // Render project row
    const renderProjectRow = (project: ProjectAllocation) => {
        const isExpanded = expandedProjects.has(project.projectId);

        return (
            <div key={project.projectId}>
                {/* Project Header Row */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '250px 1fr',
                        borderBottom: '1px solid #2d2d30',
                        backgroundColor: '#1e1e1e'
                    }}
                >
                    {/* Project Info */}
                    <div
                        style={{
                            padding: '8px 16px 8px 40px',
                            borderRight: '1px solid #2d2d30',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease'
                        }}
                        onClick={() => toggleProjectExpansion(project.projectId, project.allocationId)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#252526';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        {/* Chevron for phases */}
                        {project.phaseAllocations && project.phaseAllocations.length > 0 && (
                            <div style={{
                                fontSize: '10px',
                                color: '#858585',
                                transition: 'transform 0.2s ease',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                width: '12px'
                            }}>
                                ▶
                            </div>
                        )}

                        <span style={{ fontSize: '12px' }}>📦</span>
                        <span style={{
                            fontSize: '12px',
                            color: '#d4d4d4',
                            fontWeight: '500',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {project.projectName}
                        </span>
                    </div>

                    {/* Project Month Cells */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${months.length}, 1fr)`,
                            gap: '0'
                        }}
                    >
                        {months.map(({ month }) => {
                            const mds = project.monthlyAllocations[month]?.planned || 0;

                            return (
                                <div
                                    key={month}
                                    style={{
                                        border: '1px solid #2d2d30',
                                        minHeight: '40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        color: mds > 0 ? '#d4d4d4' : '#6a6a6a',
                                        fontWeight: mds > 0 ? '600' : '400'
                                    }}
                                >
                                    {mds > 0 ? `${mds.toFixed(1)} MD` : '—'}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Phase Rows (if expanded) */}
                {isExpanded && project.phaseAllocations && project.phaseAllocations.length > 0 && (
                    <>
                        {renderPhaseRows(project)}
                    </>
                )}
            </div>
        );
    };

    // Render phase rows for a project
    const renderPhaseRows = (project: ProjectAllocation) => {
        const breakdown = getPhaseMonthlyBreakdown(project);

        return project.phaseAllocations!.map(phase => (
            <div
                key={phase.phaseId}
                style={{
                    display: 'grid',
                    gridTemplateColumns: '250px 1fr',
                    borderBottom: '1px solid #2d2d30',
                    backgroundColor: '#1a1a1a'
                }}
            >
                {/* Phase Info */}
                <div
                    style={{
                        padding: '6px 16px 6px 64px',
                        borderRight: '1px solid #2d2d30',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span style={{ fontSize: '11px', color: '#858585' }}>•</span>
                    <span style={{
                        fontSize: '11px',
                        color: '#858585',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {phase.phaseName}
                    </span>
                </div>

                {/* Phase Month Cells (editable) */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${months.length}, 1fr)`,
                        gap: '0'
                    }}
                >
                    {months.map(({ month }) => {
                        const mds = breakdown[phase.phaseId]?.monthlyMDs[month] || 0;
                        const isEditing = editingCell?.allocationId === project.allocationId &&
                                         editingCell?.phaseId === phase.phaseId &&
                                         editingCell?.month === month;

                        return (
                            <div
                                key={month}
                                style={{
                                    border: '1px solid #2d2d30',
                                    minHeight: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    padding: '2px'
                                }}
                            >
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={saveEdit}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEdit();
                                            if (e.key === 'Escape') cancelEdit();
                                        }}
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            padding: '2px 4px',
                                            fontSize: '10px',
                                            backgroundColor: '#1e1e1e',
                                            border: '1px solid #4ec9b0',
                                            borderRadius: '2px',
                                            color: '#d4d4d4',
                                            textAlign: 'center'
                                        }}
                                    />
                                ) : (
                                    <div
                                        onClick={() => startEditing(project.allocationId, phase.phaseId, month, mds)}
                                        style={{
                                            cursor: 'pointer',
                                            padding: '4px',
                                            width: '100%',
                                            textAlign: 'center',
                                            color: mds > 0 ? '#d4d4d4' : '#6a6a6a',
                                            fontWeight: mds > 0 ? '600' : '400'
                                        }}
                                        title="Click to edit"
                                    >
                                        {mds > 0 ? `${mds.toFixed(1)} ✏️` : '— ✏️'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ));
    };

    return (
        <>
            {/* Member Row (always visible) */}
            {renderMemberRow()}

            {/* Expanded Project/Phase Rows */}
            {isMemberExpanded && projectAllocations.length > 0 && (
                <>
                    {projectAllocations.map(project => renderProjectRow(project))}
                </>
            )}
        </>
    );
};

export default ExpandableTimelineRow;
