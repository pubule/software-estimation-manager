/**
 * Assignment Modal Component
 *
 * Modal for creating/editing resource allocations
 *
 * Features:
 * - Project and team member selection
 * - Auto-distribution of MDs across date range
 * - Real-time capacity validation and overflow warnings
 * - Monthly distribution preview
 * - Integration with AllocationActions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { useProjectsList } from '../hooks/useProjectsList';
import { useProjectPhases } from '../hooks/useProjectPhases';
import { AllocationActions } from '../actions/AllocationActions';
import type {
    AllocationFormData,
    PhaseAllocation,
    MonthlyDistribution,
    OverflowAnalysis,
    AvailabilityResult
} from '../types/allocation';

interface AssignmentModalProps {
    allocation?: any; // Existing allocation for edit mode
    initialProjectId?: string;
    initialMemberId?: string;
    initialMonth?: string;
    onSave?: (allocation: any) => void;
    onClose: () => void;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
    allocation,
    initialProjectId,
    initialMemberId,
    initialMonth,
    onSave,
    onClose
}) => {
    const isEditing = allocation !== null && allocation !== undefined;

    // Get team members from global config
    const globalConfig = useStore((state: any) => state.globalConfig);

    // Load available projects
    const { projects: availableProjects, loading: loadingProjects } = useProjectsList();

    // Form state
    const [formData, setFormData] = useState<AllocationFormData>({
        projectId: initialProjectId || '',
        projectName: '',
        teamMemberId: initialMemberId || '',
        totalMDs: 0,
        startDate: '',
        endDate: '',
        notes: ''
    });

    // Load phases for selected project (after formData is defined)
    const { phases: projectPhases, loading: loadingPhases } = useProjectPhases(
        formData.projectId,
        availableProjects
    );

    // Actions instance
    const [allocationActions] = useState(() => new AllocationActions());

    // Phase allocations state (per-phase MDs and dates)
    const [phaseAllocations, setPhaseAllocations] = useState<Record<string, PhaseAllocation>>({});

    // Preview state
    const [distributionPreview, setDistributionPreview] = useState<MonthlyDistribution | null>(null);
    const [availabilityPreview, setAvailabilityPreview] = useState<AvailabilityResult | null>(null);
    const [overflowAnalysis, setOverflowAnalysis] = useState<OverflowAnalysis | null>(null);

    // UI state
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isCalculating, setIsCalculating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Get team members list
    const teamMembers = useMemo(() => {
        if (!globalConfig?.teams) return [];

        const allMembers: any[] = [];
        globalConfig.teams.forEach((team: any) => {
            if (team.members) {
                team.members.forEach((member: any) => {
                    allMembers.push({
                        ...member,
                        teamName: team.name,
                        fullName: `${member.firstName} ${member.lastName}`
                    });
                });
            }
        });
        return allMembers;
    }, [globalConfig]);

    // Initialize form for editing
    useEffect(() => {
        if (allocation) {
            // Find first and last month from monthlyAllocations
            const months = Object.keys(allocation.monthlyAllocations || {}).sort();
            const startMonth = months[0];
            const endMonth = months[months.length - 1];

            // Calculate total MDs
            const totalMDs = months.reduce((sum, month) => {
                return sum + (allocation.monthlyAllocations[month]?.planned || 0);
            }, 0);

            setFormData({
                projectId: allocation.projectId,
                projectName: allocation.projectName,
                teamMemberId: allocation.teamMemberId,
                totalMDs,
                startDate: startMonth ? `${startMonth}-01` : '',
                endDate: endMonth ? `${endMonth}-01` : '',
                notes: allocation.notes || ''
            });
        } else if (initialMonth) {
            // Initialize with specific month
            const [year, month] = initialMonth.split('-');
            setFormData(prev => ({
                ...prev,
                startDate: `${year}-${month}-01`,
                endDate: `${year}-${month}-01`
            }));
        }
    }, [allocation, initialMonth]);

    // Auto-calculate distribution when inputs change
    useEffect(() => {
        if (formData.totalMDs && formData.startDate && formData.endDate && formData.teamMemberId) {
            calculateDistribution();
        } else {
            setDistributionPreview(null);
            setOverflowAnalysis(null);
        }
    }, [formData.totalMDs, formData.startDate, formData.endDate, formData.teamMemberId]);

    // Check availability when member/dates change
    useEffect(() => {
        if (formData.teamMemberId && formData.startDate && formData.endDate) {
            checkAvailability();
        } else {
            setAvailabilityPreview(null);
        }
    }, [formData.teamMemberId, formData.startDate, formData.endDate]);

    /**
     * Calculate distribution preview
     */
    const calculateDistribution = async () => {
        if (!formData.totalMDs || !formData.startDate || !formData.endDate || !formData.teamMemberId) {
            return;
        }

        setIsCalculating(true);
        try {
            const distribution = allocationActions.autoDistributeMDs(
                formData.totalMDs,
                formData.startDate,
                formData.endDate,
                formData.teamMemberId
            );

            setDistributionPreview(distribution);

            // Extract monthly allocations for overflow check
            const monthlyAllocations: any = {};
            Object.keys(distribution).forEach(key => {
                if (!['hasOverflow', 'overflowAmount', 'hasUnallocatedMDs', 'unallocatedAmount', 'error'].includes(key)) {
                    monthlyAllocations[key] = {
                        planned: distribution[key].planned,
                        actual: distribution[key].actual || distribution[key].planned
                    };
                }
            });

            // Check for overflow
            const overflow = allocationActions.checkAllocationOverflow(
                formData.teamMemberId,
                monthlyAllocations
            );
            setOverflowAnalysis(overflow);

        } catch (error: any) {
            console.error('Error calculating distribution:', error);
            setErrors(prev => ({
                ...prev,
                distribution: error.message
            }));
        } finally {
            setIsCalculating(false);
        }
    };

    /**
     * Check member availability
     */
    const checkAvailability = async () => {
        if (!formData.teamMemberId || !formData.startDate || !formData.endDate) {
            return;
        }

        try {
            const availability = allocationActions.checkMemberAvailability(
                formData.teamMemberId,
                formData.startDate,
                formData.endDate
            );
            setAvailabilityPreview(availability);
        } catch (error: any) {
            console.error('Error checking availability:', error);
        }
    };

    /**
     * Handle form input changes
     */
    const handleInputChange = (field: keyof AllocationFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    /**
     * Handle project selection from dropdown
     * Auto-fills project name when a project is selected
     */
    const handleProjectSelect = (projectId: string) => {
        const selectedProject = availableProjects.find(p => p.id === projectId);

        setFormData(prev => ({
            ...prev,
            projectId: projectId,
            projectName: selectedProject?.name || ''
        }));

        // Clear phase allocations when project changes
        setPhaseAllocations({});

        // Clear errors for both fields
        if (errors.projectId || errors.projectName) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.projectId;
                delete newErrors.projectName;
                return newErrors;
            });
        }
    };

    /**
     * Handle phase allocation changes
     */
    const handlePhaseChange = (phaseId: string, field: 'startDate' | 'endDate' | 'totalMDs', value: string | number) => {
        setPhaseAllocations(prev => {
            const existing = prev[phaseId] || {
                phaseId,
                phaseName: projectPhases.find(p => p.id === phaseId)?.name || '',
                totalMDs: 0,
                startDate: '',
                endDate: ''
            };

            return {
                ...prev,
                [phaseId]: {
                    ...existing,
                    [field]: value
                }
            };
        });
    };

    /**
     * Validate form
     */
    const validateForm = (): boolean => {
        const result = allocationActions.validateAllocation(formData);

        if (!result.isValid) {
            const errorMap: Record<string, string> = {};
            result.errors.forEach(error => {
                // Map error messages to field names
                if (error.includes('Project ID')) errorMap.projectId = error;
                else if (error.includes('Team member')) errorMap.teamMemberId = error;
                else if (error.includes('Total MDs')) errorMap.totalMDs = error;
                else if (error.includes('Start date')) errorMap.startDate = error;
                else if (error.includes('End date')) errorMap.endDate = error;
                else errorMap.general = error;
            });
            setErrors(errorMap);
            return false;
        }

        return true;
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            let result;

            if (isEditing && allocation) {
                // Update existing allocation
                result = allocationActions.updateAllocation(allocation.id, {
                    projectId: formData.projectId,
                    projectName: formData.projectName,
                    notes: formData.notes
                });
            } else {
                // Create new allocation
                // Convert phaseAllocations object to array if phase-based allocation
                const hasPhaseAllocations = Object.keys(phaseAllocations).length > 0;
                const phaseAllocationsArray = hasPhaseAllocations
                    ? Object.values(phaseAllocations).filter(p => p.totalMDs > 0 && p.startDate && p.endDate)
                    : undefined;

                const allocationData: AllocationFormData = {
                    ...formData,
                    phaseAllocations: phaseAllocationsArray
                };

                result = allocationActions.createAllocation(allocationData);
            }

            if (result.success) {
                onSave?.(result.allocation);
                onClose();
            } else {
                setErrors({ general: result.error || 'Failed to save allocation' });
            }

        } catch (error: any) {
            console.error('Error saving allocation:', error);
            setErrors({ general: error.message });
        }
    };

    /**
     * Get selected team member
     */
    const selectedMember = useMemo(() => {
        return teamMembers.find(m => m.id === formData.teamMemberId);
    }, [teamMembers, formData.teamMemberId]);

    /**
     * Render distribution preview table
     */
    const renderDistributionPreview = () => {
        if (!distributionPreview || !showPreview) return null;

        const months = Object.keys(distributionPreview)
            .filter(key => !['hasOverflow', 'overflowAmount', 'hasUnallocatedMDs', 'unallocatedAmount', 'error'].includes(key))
            .sort();

        if (months.length === 0) return null;

        return (
            <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#2d2d30',
                borderRadius: '6px',
                border: '1px solid #3c3c3c'
            }}>
                <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: '14px',
                    color: '#d4d4d4',
                    fontWeight: '600'
                }}>
                    📊 Distribution Preview
                </h4>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '8px'
                }}>
                    {months.map(month => {
                        const monthData = distributionPreview[month];
                        const planned = monthData?.planned || 0;

                        // Get overflow for this month
                        const hasOverflow = overflowAnalysis?.overflowByMonth[month] !== undefined;
                        const overflowAmount = overflowAnalysis?.overflowByMonth[month] || 0;

                        const bgColor = hasOverflow ? '#f48771' : planned > 0 ? '#4ec9b0' : '#3c3c3c';

                        return (
                            <div key={month} style={{
                                padding: '8px',
                                backgroundColor: bgColor,
                                borderRadius: '4px',
                                textAlign: 'center',
                                opacity: 0.8
                            }}>
                                <div style={{ fontSize: '11px', color: '#1e1e1e', fontWeight: '600' }}>
                                    {month}
                                </div>
                                <div style={{ fontSize: '16px', color: '#1e1e1e', fontWeight: '700', marginTop: '4px' }}>
                                    {planned.toFixed(1)} MD
                                </div>
                                {hasOverflow && (
                                    <div style={{ fontSize: '10px', color: '#1e1e1e', marginTop: '2px' }}>
                                        ⚠️ +{overflowAmount.toFixed(1)} overflow
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {distributionPreview.hasOverflow && (
                    <div style={{
                        marginTop: '12px',
                        padding: '8px',
                        backgroundColor: '#5a1e1e',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#f48771'
                    }}>
                        ⚠️ <strong>Overflow Detected:</strong> {distributionPreview.overflowAmount.toFixed(1)} MDs could not be allocated due to capacity constraints.
                    </div>
                )}
            </div>
        );
    };

    /**
     * Render availability summary
     */
    const renderAvailabilitySummary = () => {
        if (!availabilityPreview || !selectedMember) return null;

        const utilizationColor = availabilityPreview.overallUtilization > 100
            ? '#f48771'
            : availabilityPreview.overallUtilization >= 90
                ? '#dcdcaa'
                : '#4ec9b0';

        return (
            <div style={{
                marginTop: '12px',
                padding: '10px',
                backgroundColor: '#2d2d30',
                borderRadius: '6px',
                border: '1px solid #3c3c3c'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#858585' }}>
                        Current Utilization for {selectedMember.fullName}:
                    </span>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: utilizationColor
                    }}>
                        {availabilityPreview.overallUtilization.toFixed(1)}%
                    </span>
                </div>

                {availabilityPreview.constraints && availabilityPreview.constraints.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#f48771' }}>
                        ⚠️ {availabilityPreview.constraints.join('; ')}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="modal active">
            <div className="modal-content" style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <h3>{isEditing ? 'Edit Assignment' : 'New Assignment'}</h3>
                    <button className="modal-close" onClick={onClose}>
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* General Error */}
                        {errors.general && (
                            <div style={{
                                padding: '10px',
                                backgroundColor: '#5a1e1e',
                                borderRadius: '4px',
                                color: '#f48771',
                                marginBottom: '16px',
                                fontSize: '13px'
                            }}>
                                ❌ {errors.general}
                            </div>
                        )}

                        {/* Project Selection */}
                        <div className="form-group">
                            <label htmlFor="assignment-project-id">Project:</label>
                            <select
                                id="assignment-project-id"
                                value={formData.projectId}
                                onChange={(e) => handleProjectSelect(e.target.value)}
                                className={errors.projectId ? 'error' : ''}
                                required
                                disabled={loadingProjects}
                            >
                                <option value="">
                                    {loadingProjects ? 'Loading projects...' : 'Select Project'}
                                </option>
                                {availableProjects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.isCurrent ? '🔵 Current: ' : ''}
                                        {project.name} ({project.id})
                                    </option>
                                ))}
                            </select>
                            {errors.projectId && <span className="error-message">{errors.projectId}</span>}
                            {availableProjects.length === 0 && !loadingProjects && (
                                <small className="form-help" style={{ color: '#dcdcaa' }}>
                                    ℹ️ No projects available. Create or open a project first.
                                </small>
                            )}
                        </div>

                        {/* Team Member */}
                        <div className="form-group">
                            <label htmlFor="assignment-team-member">Team Member:</label>
                            <select
                                id="assignment-team-member"
                                value={formData.teamMemberId}
                                onChange={(e) => handleInputChange('teamMemberId', e.target.value)}
                                className={errors.teamMemberId ? 'error' : ''}
                                required
                                disabled={isEditing}
                            >
                                <option value="">Select Team Member</option>
                                {teamMembers.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.fullName} - {member.role} ({member.vendorType})
                                    </option>
                                ))}
                            </select>
                            {errors.teamMemberId && <span className="error-message">{errors.teamMemberId}</span>}
                        </div>

                        {/* Member capacity info */}
                        {selectedMember && (
                            <div style={{
                                padding: '10px',
                                backgroundColor: '#2d2d30',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#858585',
                                marginBottom: '16px'
                            }}>
                                <strong style={{ color: '#4ec9b0' }}>{selectedMember.fullName}</strong>
                                <br />
                                Monthly Capacity: {selectedMember.monthlyCapacity} MD
                                {' • '}
                                {selectedMember.role}
                                {' • '}
                                {selectedMember.country}
                            </div>
                        )}

                        {/* Availability Summary */}
                        {renderAvailabilitySummary()}

                        {/* Phase Allocations Section */}
                        {formData.projectId && projectPhases.length > 0 && (
                            <div className="form-group">
                                <label style={{ marginBottom: '12px', display: 'block', fontSize: '14px', fontWeight: '600' }}>
                                    Phase Allocations:
                                </label>
                                <small className="form-help" style={{ display: 'block', marginBottom: '12px' }}>
                                    Specify start date, end date, and man days for each project phase
                                </small>

                                {loadingPhases && (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#858585' }}>
                                        Loading project phases...
                                    </div>
                                )}

                                {!loadingPhases && projectPhases.map(phase => {
                                    const allocation = phaseAllocations[phase.id] || {
                                        phaseId: phase.id,
                                        phaseName: phase.name,
                                        totalMDs: 0,
                                        startDate: '',
                                        endDate: ''
                                    };

                                    return (
                                        <div
                                            key={phase.id}
                                            style={{
                                                padding: '12px',
                                                backgroundColor: '#2d2d30',
                                                borderRadius: '6px',
                                                marginBottom: '12px',
                                                border: '1px solid #3c3c3c'
                                            }}
                                        >
                                            <div style={{
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: '#4ec9b0',
                                                marginBottom: '10px'
                                            }}>
                                                {phase.name}
                                                {phase.manDays > 0 && (
                                                    <span style={{ color: '#858585', fontWeight: '400', marginLeft: '8px' }}>
                                                        (Estimated: {phase.manDays} MD)
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                                {/* Start Date */}
                                                <div>
                                                    <label
                                                        htmlFor={`phase-${phase.id}-start`}
                                                        style={{ fontSize: '11px', color: '#858585', display: 'block', marginBottom: '4px' }}
                                                    >
                                                        Start Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        id={`phase-${phase.id}-start`}
                                                        value={allocation.startDate}
                                                        onChange={(e) => handlePhaseChange(phase.id, 'startDate', e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px',
                                                            fontSize: '12px',
                                                            backgroundColor: '#1e1e1e',
                                                            border: '1px solid #3c3c3c',
                                                            borderRadius: '4px',
                                                            color: '#d4d4d4'
                                                        }}
                                                        disabled={isEditing}
                                                    />
                                                </div>

                                                {/* End Date */}
                                                <div>
                                                    <label
                                                        htmlFor={`phase-${phase.id}-end`}
                                                        style={{ fontSize: '11px', color: '#858585', display: 'block', marginBottom: '4px' }}
                                                    >
                                                        End Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        id={`phase-${phase.id}-end`}
                                                        value={allocation.endDate}
                                                        onChange={(e) => handlePhaseChange(phase.id, 'endDate', e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px',
                                                            fontSize: '12px',
                                                            backgroundColor: '#1e1e1e',
                                                            border: '1px solid #3c3c3c',
                                                            borderRadius: '4px',
                                                            color: '#d4d4d4'
                                                        }}
                                                        disabled={isEditing}
                                                    />
                                                </div>

                                                {/* Man Days */}
                                                <div>
                                                    <label
                                                        htmlFor={`phase-${phase.id}-mds`}
                                                        style={{ fontSize: '11px', color: '#858585', display: 'block', marginBottom: '4px' }}
                                                    >
                                                        Man Days
                                                    </label>
                                                    <input
                                                        type="number"
                                                        id={`phase-${phase.id}-mds`}
                                                        value={allocation.totalMDs || ''}
                                                        onChange={(e) => handlePhaseChange(phase.id, 'totalMDs', parseFloat(e.target.value) || 0)}
                                                        min="0"
                                                        step="0.1"
                                                        placeholder="0.0"
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px',
                                                            fontSize: '12px',
                                                            backgroundColor: '#1e1e1e',
                                                            border: '1px solid #3c3c3c',
                                                            borderRadius: '4px',
                                                            color: '#d4d4d4'
                                                        }}
                                                        disabled={isEditing}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Fallback to simple allocation if no phases */}
                        {formData.projectId && !loadingPhases && projectPhases.length === 0 && (
                            <>
                                {/* Total MDs */}
                                <div className="form-group">
                                    <label htmlFor="assignment-total-mds">Total Man Days:</label>
                                    <input
                                        type="number"
                                        id="assignment-total-mds"
                                        value={formData.totalMDs || ''}
                                        onChange={(e) => handleInputChange('totalMDs', parseFloat(e.target.value) || 0)}
                                        className={errors.totalMDs ? 'error' : ''}
                                        min="0.1"
                                        step="0.1"
                                        placeholder="e.g., 45.0"
                                        required
                                        disabled={isEditing}
                                    />
                                    <small className="form-help">Total MDs to allocate across the date range</small>
                                    {errors.totalMDs && <span className="error-message">{errors.totalMDs}</span>}
                                </div>

                                {/* Date Range */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {/* Start Date */}
                                    <div className="form-group">
                                        <label htmlFor="assignment-start-date">Start Date:</label>
                                        <input
                                            type="date"
                                            id="assignment-start-date"
                                            value={formData.startDate}
                                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                                            className={errors.startDate ? 'error' : ''}
                                            required
                                            disabled={isEditing}
                                        />
                                        {errors.startDate && <span className="error-message">{errors.startDate}</span>}
                                    </div>

                                    {/* End Date */}
                                    <div className="form-group">
                                        <label htmlFor="assignment-end-date">End Date:</label>
                                        <input
                                            type="date"
                                            id="assignment-end-date"
                                            value={formData.endDate}
                                            onChange={(e) => handleInputChange('endDate', e.target.value)}
                                            className={errors.endDate ? 'error' : ''}
                                            required
                                            disabled={isEditing}
                                        />
                                        {errors.endDate && <span className="error-message">{errors.endDate}</span>}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Preview Toggle */}
                        {distributionPreview && (
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={showPreview}
                                        onChange={(e) => setShowPreview(e.target.checked)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    Show monthly distribution preview
                                </label>
                            </div>
                        )}

                        {/* Distribution Preview */}
                        {renderDistributionPreview()}

                        {/* Overflow Warning */}
                        {overflowAnalysis && overflowAnalysis.hasOverflow && (
                            <div style={{
                                marginTop: '12px',
                                padding: '12px',
                                backgroundColor: '#5a1e1e',
                                borderRadius: '6px',
                                border: '1px solid #f48771'
                            }}>
                                <div style={{ fontSize: '14px', color: '#f48771', fontWeight: '600', marginBottom: '8px' }}>
                                    ⚠️ Capacity Overflow Warning
                                </div>
                                <div style={{ fontSize: '12px', color: '#f48771' }}>
                                    {overflowAnalysis.details}
                                </div>
                                <div style={{ fontSize: '12px', color: '#f48771', marginTop: '4px' }}>
                                    Total overflow: <strong>{overflowAnalysis.totalOverflow.toFixed(1)} MD</strong> across {overflowAnalysis.affectedMonths.length} month(s)
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="form-group">
                            <label htmlFor="assignment-notes">Notes:</label>
                            <textarea
                                id="assignment-notes"
                                value={formData.notes || ''}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                rows={3}
                                placeholder="Optional notes about this assignment..."
                            />
                        </div>

                        {/* Calculating indicator */}
                        {isCalculating && (
                            <div style={{
                                padding: '8px',
                                textAlign: 'center',
                                color: '#858585',
                                fontSize: '12px',
                                fontStyle: 'italic'
                            }}>
                                Calculating distribution...
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isCalculating}
                        >
                            {isEditing ? 'Update' : 'Create'} Assignment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignmentModal;
