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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Button from './Button';
import TimelineMonthCell from './TimelineMonthCell';
import AvailableCapacityRow from './AvailableCapacityRow';
import PhaseBreakdownHeader from './PhaseBreakdownHeader';
import type { TimelineMonth, TimelineMemberCapacity } from '../hooks/useCapacityTimeline';
import '../../styles/capacity-modern.css';

// Import Actions (available globally after build)
declare const AllocationActions: any;

interface ExpandableTimelineRowProps {
    member: TimelineMemberCapacity;
    months: TimelineMonth[];
    onCellClick?: (month: string, memberName: string, data: any) => void;
    onMemberClick?: (member: TimelineMemberCapacity) => void;
    onRefresh?: () => void; // Callback after allocation update
    onEditAllocation?: (allocation: any) => void; // Callback to open edit modal
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
        phaseTotalMDs: number;        // Phase total from project (READ-ONLY)
        allocatedMDs: number;          // Actually allocated MDs (EDITABLE)
        originalAllocatedMDs?: number; // Original value for reset button
        totalMDs: number;              // DEPRECATED: For backward compatibility
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
    onRefresh,
    onEditAllocation
}) => {
    // Helper function to format dates
    const formatDate = (dateString: string): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Expansion state
    const [isMemberExpanded, setIsMemberExpanded] = useState(false);
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

    // Refs for cleanup useEffect (to avoid re-subscription on every state change)
    const isMemberExpandedRef = useRef(isMemberExpanded);
    const expandedProjectsRef = useRef(expandedProjects);

    // Allocations data
    const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);

    // Track which projects have loaded phases from project file (for backward compatibility)
    const [loadedProjectPhases, setLoadedProjectPhases] = useState<Set<string>>(new Set());

    // Sync refs with state (for cleanup useEffect)
    useEffect(() => {
        isMemberExpandedRef.current = isMemberExpanded;
    }, [isMemberExpanded]);

    useEffect(() => {
        expandedProjectsRef.current = expandedProjects;
    }, [expandedProjects]);

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
        } else {
            setIsMemberExpanded(false);
        }
    }, [member.id, member]);

    // Load projects expansion state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(`timeline-projects-expanded-${member.id}`);
        if (saved) {
            try {
                const projectIds = JSON.parse(saved);
                setExpandedProjects(new Set(projectIds));
            } catch (error) {
                console.error('Failed to parse expanded projects:', error);
            }
        } else {
            setExpandedProjects(new Set());
        }
    }, [member.id, member]);

    // Reset expansion state when leaving capacity section (FIX: chevron not resetting)
    useEffect(() => {
        const store = window.appStore;
        if (!store) return;

        const unsubscribe = store.subscribe((state: any) => {
            // Check if still in capacity-related sections
            const isCapacitySection = state.currentSection?.startsWith('capacity') ||
                                      state.currentSection === 'resource-overview';

            // If not on capacity section anymore, reset all expansions
            if (!isCapacitySection) {
                // Use refs to check current state without causing re-subscription
                if (isMemberExpandedRef.current || expandedProjectsRef.current.size > 0) {
                    console.log('🧹 Capacity section left, resetting expansion states');
                    setIsMemberExpanded(false);
                    setExpandedProjects(new Set());
                    // Also clear localStorage to prevent restore on return
                    localStorage.removeItem(`timeline-expanded-${member.id}`);
                    localStorage.removeItem(`timeline-projects-expanded-${member.id}`);
                }
            }
        });

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [member.id]); // Only member.id as dependency to avoid re-subscription

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
                phaseAllocations: allocation.phaseAllocations?.map((phase: any) => ({
                    ...phase,
                    // Ensure new fields exist with backward compatibility
                    phaseTotalMDs: phase.phaseTotalMDs ?? phase.totalMDs ?? 0,
                    allocatedMDs: phase.allocatedMDs ?? phase.totalMDs ?? 0,
                    totalMDs: phase.totalMDs ?? 0  // Keep for backward compatibility
                })) || [],
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

    // Get status class
    const getRowStatusClass = () => {
        if (averageUtilization > 100) return 'over-allocated';
        if (averageUtilization >= 90) return 'near-capacity';
        return 'available';
    };

    // Toggle member expansion
    const toggleMemberExpansion = () => {
        const newExpandedState = !isMemberExpanded;
        setIsMemberExpanded(newExpandedState);
        // Save SYNCHRONOUSLY to localStorage to prevent loss on parent refresh
        localStorage.setItem(`timeline-expanded-${member.id}`, String(newExpandedState));
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
        // Save SYNCHRONOUSLY to localStorage to prevent loss on parent refresh
        const projectIds = Array.from(newExpanded);
        localStorage.setItem(`timeline-projects-expanded-${member.id}`, JSON.stringify(projectIds));
    };

    /**
     * Calculate uniform MDs for a phase month (for reset button)
     * Returns the evenly distributed value based on phase totalMDs and date range
     */
    const calculateUniformPhaseMD = (phase: { phaseId: string; phaseName: string; totalMDs: number; startDate: string; endDate: string }, month: string): number => {
        if (!phase.startDate || !phase.endDate) return 0;

        const startDate = new Date(phase.startDate);
        const endDate = new Date(phase.endDate);

        // Get all months in phase range
        let current = new Date(startDate);
        const phaseMonths: string[] = [];
        while (current <= endDate) {
            const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
            phaseMonths.push(monthKey);
            current.setMonth(current.getMonth() + 1);
        }

        // Check if month is in range
        if (!phaseMonths.includes(month)) return 0;

        // Distribute totalMDs evenly
        return phase.totalMDs / phaseMonths.length;
    };

    /**
     * Handle phase MD input change
     * Updates allocation with full recalculation
     */
    const handlePhaseMDChange = async (allocationId: string, phaseId: string, month: string, newValue: number) => {
        if (isNaN(newValue) || newValue < 0) {
            console.warn('Invalid value:', newValue);
            return;
        }

        try {
            const allocationActions = new window.AllocationActions();
            const allocation = projectAllocations.find(p => p.allocationId === allocationId);
            if (!allocation) return;

            console.log('💾 Updating phase MD:', {
                phase: phaseId,
                month,
                newValue
            });

            // 1. Update phaseMonthlyBreakdown
            const updatedBreakdown = {
                ...(allocation.phaseMonthlyBreakdown || {}),
                [phaseId]: {
                    ...(allocation.phaseMonthlyBreakdown?.[phaseId] || {}),
                    [month]: newValue
                }
            };

            // 2. Recalculate phase totalMDs (sum all months for the phase)
            const updatedPhaseAllocations = (allocation.phaseAllocations || []).map(phase => {
                if (phase.phaseId === phaseId) {
                    const phaseMDs = updatedBreakdown[phase.phaseId] || {};
                    const totalMDs = Object.values(phaseMDs).reduce((sum: number, val: number) => sum + val, 0);
                    return { ...phase, totalMDs };
                }
                return phase;
            });

            // 3. Recalculate monthly allocations (aggregate all phases per month)
            const updatedMonthlyAllocations: any = {};
            const allMonths = new Set<string>();
            Object.values(updatedBreakdown).forEach((phaseMDs: any) => {
                Object.keys(phaseMDs).forEach(m => allMonths.add(m));
            });

            allMonths.forEach(m => {
                let monthTotal = 0;
                Object.values(updatedBreakdown).forEach((phaseMDs: any) => {
                    monthTotal += phaseMDs[m] || 0;
                });
                updatedMonthlyAllocations[m] = {
                    planned: monthTotal,
                    actual: monthTotal
                };
            });

            // 4. Update allocation
            await allocationActions.updateAllocation(allocationId, {
                phaseMonthlyBreakdown: updatedBreakdown,
                phaseAllocations: updatedPhaseAllocations,
                monthlyAllocations: updatedMonthlyAllocations
            });

            console.log('✅ Allocation updated successfully');

            // 5. Refresh data locally (no need to refresh parent - it would cause re-render and lose expansion state)
            loadMemberAllocations();
        } catch (error) {
            console.error('❌ Error updating allocation:', error);
            alert('Failed to update allocation');
        }
    };

    /**
     * Reset phase month MD to original auto-calculated value
     * Uses originalPhaseMonthlyBreakdown saved at allocation creation time
     */
    const resetPhaseMDToUniform = async (allocationId: string, phase: { phaseId: string; phaseName: string; totalMDs: number; startDate: string; endDate: string }, month: string) => {
        try {
            // Get allocation from store to access originalPhaseMonthlyBreakdown
            const store = window.appStore?.getState?.();
            const allocation = store?.resourceAllocations?.find((a: any) => a.id === allocationId);

            let originalValue = 0;

            if (allocation?.originalPhaseMonthlyBreakdown?.[phase.phaseId]?.[month] !== undefined) {
                // Use the original working-days-aware calculated value
                originalValue = allocation.originalPhaseMonthlyBreakdown[phase.phaseId][month];
                console.log(`↻ Resetting ${phase.phaseName} ${month} to original calculated value:`, originalValue);
            } else {
                // Fallback: calculate uniform distribution (for backward compatibility with old allocations)
                originalValue = calculateUniformPhaseMD(phase, month);
                console.log(`↻ Resetting ${phase.phaseName} ${month} to uniform distribution (fallback):`, originalValue);
            }

            await handlePhaseMDChange(allocationId, phase.phaseId, month, originalValue);
        } catch (error) {
            console.error('❌ Error resetting phase MD:', error);
            alert('Failed to reset value');
        }
    };

    // Handle edit allocation button click
    const handleEditAllocation = (e: React.MouseEvent, project: ProjectAllocation) => {
        e.stopPropagation(); // Prevent row toggle

        console.log('✏️ Opening edit modal for allocation:', project.allocationId);

        // Build full allocation object for modal
        const allocationData = {
            id: project.allocationId,
            projectId: project.projectId,
            projectName: project.projectName,
            teamMemberId: member.id,
            monthlyAllocations: project.monthlyAllocations,
            phaseAllocations: project.phaseAllocations || [],
            phaseMonthlyBreakdown: project.phaseMonthlyBreakdown || {}
        };

        // Call parent callback to open modal
        onEditAllocation?.(allocationData);
    };

    // Handle delete allocation button click
    const handleDeleteAllocation = async (e: React.MouseEvent, project: ProjectAllocation) => {
        e.stopPropagation(); // Prevent row toggle

        // Count total months for confirmation message
        const monthCount = Object.keys(project.monthlyAllocations || {}).length;
        const phaseCount = project.phaseAllocations?.length || 0;

        // Confirmation dialog (destructive action)
        const confirmed = window.confirm(
            `Delete allocation for project "${project.projectName}"?\n\n` +
            `This will remove:\n` +
            `• ${monthCount} month(s) of data\n` +
            `• ${phaseCount} phase allocation(s)\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmed) {
            console.log('🚫 Delete cancelled by user');
            return;
        }

        try {
            const allocationActions = new window.AllocationActions();

            console.log('🗑️ Deleting allocation:', project.allocationId);

            // Delete allocation
            const result = await allocationActions.deleteAllocation(project.allocationId);

            if (result.success) {
                console.log('✅ Allocation deleted successfully:', project.allocationId);

                // Refresh data immediately to show updated timeline
                loadMemberAllocations();
                onRefresh?.();
            } else {
                console.error('❌ Delete failed:', result.error);
                alert(`Failed to delete allocation: ${result.error}`);
            }
        } catch (error: any) {
            console.error('❌ Error deleting allocation:', error);
            alert(`Error deleting allocation: ${error.message}`);
        }
    };

    // Calculate total capacity across all months
    const calculateTotalCapacity = (): number => {
        return Object.values(member.monthlyData).reduce((sum: number, data: any) =>
            sum + (data.monthlyCapacity || 0), 0
        );
    };

    // Calculate total allocated across all months
    const calculateTotalAllocated = (): number => {
        return Object.values(member.monthlyData).reduce((sum: number, data: any) =>
            sum + (data.existingAllocations || 0), 0
        );
    };

    // Calculate allocated MDs for a phase (sum of all monthly values)
    const calculatePhaseAllocatedMDs = (phase: { phaseId: string }, phaseMonthlyBreakdown?: { [phaseId: string]: { [month: string]: number } }): number => {
        if (!phaseMonthlyBreakdown || !phaseMonthlyBreakdown[phase.phaseId]) {
            return 0;
        }

        const phaseMDs = phaseMonthlyBreakdown[phase.phaseId] || {};
        return Object.values(phaseMDs).reduce((sum: number, val: number) => sum + (val || 0), 0);
    };

    // Check if phase is over-allocated
    const isPhaseOverAllocated = (phase: { phaseId: string; totalMDs: number }, allocated: number): boolean => {
        return allocated > phase.totalMDs;
    };

    // Calculate total MDs for a project (sum of all monthly allocations)
    const calculateProjectTotalMDs = (project: ProjectAllocation): number => {
        return Object.values(project.monthlyAllocations).reduce(
            (sum: number, monthData: any) => sum + (monthData.planned || 0),
            0
        );
    };

    // Calculate total MDs from phases (sum of all phase totalMDs)
    const calculateProjectPhasesTotalMDs = (project: ProjectAllocation): number => {
        if (!project.phaseAllocations || project.phaseAllocations.length === 0) {
            return 0;
        }
        return project.phaseAllocations.reduce(
            (sum: number, phase: any) => sum + (phase.totalMDs || 0),
            0
        );
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
            className="capacity-modern-member-row"
            style={{
                display: 'grid',
                gridTemplateColumns: `250px 100px 100px 100px repeat(${months.length}, 120px)`
            }}
        >
            {/* Column 1: Member Info - Sticky */}
            <div
                className="capacity-modern-member-info"
                onClick={toggleMemberExpansion}
            >
                {/* Name with Chevron */}
                <div className="capacity-modern-member-header">
                    {/* Chevron */}
                    <div className={`capacity-modern-member-chevron ${isMemberExpanded ? 'expanded' : ''}`}>
                        ▶
                    </div>

                    {/* Status Dot */}
                    <div className={`capacity-modern-member-status-dot ${getRowStatusClass()}`} />

                    <div className="capacity-modern-member-name">
                        {member.fullName}
                    </div>
                </div>

                {/* Role and Vendor */}
                <div className="capacity-modern-member-role">
                    {member.role}
                </div>
                <div className="capacity-modern-member-vendor">
                    {member.vendorName}
                </div>

                {/* Average Utilization */}
                <div className={`capacity-modern-member-utilization ${getRowStatusClass()}`}>
                    Avg: {averageUtilization.toFixed(1)}%
                </div>
            </div>

            {/* Column 2: Actions - Sticky */}
            <div className="capacity-modern-member-actions">
                <i className="fas fa-user-circle" title={member.fullName}></i>
            </div>

            {/* Column 3: Total MDs - Sticky */}
            <div className="capacity-modern-member-total">
                {calculateTotalCapacity().toFixed(1)} MDs
            </div>

            {/* Column 4: Allocated MDs - Sticky */}
            <div className="capacity-modern-member-allocated">
                {calculateTotalAllocated().toFixed(1)} MDs
            </div>

            {/* Month Cells (scrollable) */}
            {months.map(({ month, label }) => {
                const monthData = member.monthlyData[month];

                if (!monthData) {
                    return (
                        <div key={month} className="capacity-modern-month-cell-empty">
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
    );

    // Render project row
    const renderProjectRow = (project: ProjectAllocation) => {
        const isExpanded = expandedProjects.has(project.projectId);
        const phasesTotalMDs = calculateProjectPhasesTotalMDs(project);
        const allocatedMDs = calculateProjectTotalMDs(project);

        return (
            <div key={project.projectId}>
                {/* Project Header Row */}
                <div
                    className="capacity-modern-project-row"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `250px 100px 100px 100px repeat(${months.length}, 120px)`
                    }}
                >
                    {/* Column 1: Project Info - Sticky */}
                    <div
                        className="capacity-modern-project-info"
                        onClick={() => toggleProjectExpansion(project.projectId, project.allocationId)}
                    >
                        {/* Chevron for phases */}
                        {project.phaseAllocations && project.phaseAllocations.length > 0 && (
                            <div className={`capacity-modern-project-chevron ${isExpanded ? 'expanded' : ''}`}>
                                ▶
                            </div>
                        )}

                        <i className="fas fa-box capacity-modern-project-icon"></i>
                        <span className="capacity-modern-project-name">
                            {project.projectName}
                        </span>
                    </div>

                    {/* Column 2: Actions - Sticky */}
                    <div className="capacity-modern-project-actions-col">
                        {/* Edit Button */}
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={(e) => handleEditAllocation(e, project)}
                            title="Edit allocation"
                            aria-label="Edit allocation"
                            icon={<i className="fas fa-edit" />}
                        />

                        {/* Delete Button */}
                        <Button
                            variant="danger"
                            size="small"
                            onClick={(e) => handleDeleteAllocation(e, project)}
                            title="Delete allocation"
                            aria-label="Delete allocation"
                            icon={<i className="fas fa-trash" />}
                        />
                    </div>

                    {/* Column 3: Total MDs - Sticky */}
                    <div className="capacity-modern-project-total">
                        {phasesTotalMDs > 0 ? `${phasesTotalMDs.toFixed(1)} MDs` : '—'}
                    </div>

                    {/* Column 4: Allocated MDs - Sticky */}
                    <div className="capacity-modern-project-allocated">
                        {allocatedMDs.toFixed(1)} MDs
                    </div>

                    {/* Month Cells (scrollable) */}
                    {months.map(({ month }) => {
                        const mds = project.monthlyAllocations[month]?.planned || 0;

                        return (
                            <div
                                key={month}
                                className={`capacity-modern-project-month-cell ${mds > 0 ? 'has-value' : 'no-value'}`}
                            >
                                {mds > 0 ? `${mds.toFixed(1)} MD` : '—'}
                            </div>
                        );
                    })}
                </div>

                {/* Phase Rows (if expanded) */}
                {isExpanded && project.phaseAllocations && project.phaseAllocations.length > 0 && (
                    <>
                        {/* Phase Breakdown Header */}
                        <PhaseBreakdownHeader
                            projectName={project.projectName}
                            months={months}
                        />

                        {/* Phase Rows */}
                        {renderPhaseRows(project)}
                    </>
                )}
            </div>
        );
    };

    // Render phase rows for a project
    const renderPhaseRows = (project: ProjectAllocation) => {
        const breakdown = getPhaseMonthlyBreakdown(project);

        return project.phaseAllocations!.map(phase => {
            // Calculate allocated MDs for this phase
            const allocatedMDs = calculatePhaseAllocatedMDs(phase, project.phaseMonthlyBreakdown);
            const overAllocated = isPhaseOverAllocated(phase, allocatedMDs);

            return (
                <div
                    key={phase.phaseId}
                    className="capacity-modern-phase-row"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `550px repeat(${months.length}, 120px)`
                    }}
                >
                    {/* Phase Info - Sticky (550px total with inner grid) */}
                    <div className="capacity-modern-phase-info">
                        {/* Column: PHASE NAME */}
                        <div className="capacity-modern-phase-details">
                            <strong className="capacity-modern-phase-name">
                                {phase.phaseName}
                            </strong>
                        </div>

                        {/* Column: DATE RANGE */}
                        <div className="phase-daterange">
                            {phase.startDate && phase.endDate ? (
                                <span>
                                    {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
                                </span>
                            ) : (
                                <span>—</span>
                            )}
                        </div>

                        {/* Column: TOTAL MDS */}
                        <div className="phase-total-mds">
                            {phase.phaseTotalMDs.toFixed(1)}
                        </div>

                        {/* Column: ALLOCATED MDS (with over-allocation indicator) */}
                        <div className={`phase-allocated-mds ${overAllocated ? 'over-allocated' : 'normal'}`}>
                            {allocatedMDs.toFixed(1)}
                            {overAllocated && (
                                <i className="fas fa-exclamation-triangle" title="Over-allocated"></i>
                            )}
                        </div>
                    </div>

                    {/* Month Cells (scrollable) */}
                    {months.map(({ month }) => {
                        const mds = breakdown[phase.phaseId]?.monthlyMDs[month] || 0;

                        return (
                            <div key={month} className="capacity-modern-phase-month-cell">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\.?[0-9]*"
                                    value={mds}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;

                                        // Allow empty string for clearing
                                        if (inputValue === '') {
                                            handlePhaseMDChange(project.allocationId, phase.phaseId, month, 0);
                                            return;
                                        }

                                        // Parse and validate numeric input
                                        const value = parseFloat(inputValue);
                                        if (!isNaN(value) && value >= 0) {
                                            handlePhaseMDChange(project.allocationId, phase.phaseId, month, value);
                                        }
                                        // If invalid, don't update - let onBlur handle it
                                    }}
                                    onBlur={(e) => {
                                        // On blur, ensure valid number or reset to 0
                                        const inputValue = e.target.value.trim();
                                        const value = parseFloat(inputValue);
                                        if (inputValue === '' || isNaN(value) || value < 0) {
                                            e.target.value = '0';
                                            handlePhaseMDChange(project.allocationId, phase.phaseId, month, 0);
                                        }
                                    }}
                                    className="final-mds-input"
                                    placeholder="0"
                                />
                                <button
                                    className="reset-mds-btn"
                                    onClick={() => resetPhaseMDToUniform(project.allocationId, phase, month)}
                                    title="Reset to uniform distribution"
                                >
                                    ↻
                                </button>
                            </div>
                        );
                    })}
                </div>
            );
        });
    };

    return (
        <>
            {/* Member Row (always visible) */}
            {renderMemberRow()}

            {/* Expanded: Available Capacity + Projects/Phases */}
            {isMemberExpanded && (
                <>
                    {/* Available Capacity Row */}
                    <AvailableCapacityRow
                        member={member}
                        months={months}
                        totalCapacity={calculateTotalCapacity()}
                        totalAllocated={calculateTotalAllocated()}
                    />

                    {/* Project/Phase Rows */}
                    {projectAllocations.length > 0 && (
                        <>
                            {projectAllocations.map(project => renderProjectRow(project))}
                        </>
                    )}
                </>
            )}
        </>
    );
};

export default ExpandableTimelineRow;
