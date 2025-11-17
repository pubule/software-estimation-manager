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
import Button from './Button';
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

    // Load phases for selected project (skip in edit mode - phases come from allocation)
    const { phases: projectPhases, loading: loadingPhases } = useProjectPhases(
        isEditing ? null : formData.projectId,  // Skip loading in edit mode
        availableProjects
    );

    // Actions instance
    const [allocationActions] = useState(() => new AllocationActions());

    // Phase allocations state (per-phase MDs and dates)
    const [phaseAllocations, setPhaseAllocations] = useState<Record<string, PhaseAllocation>>({});

    // Track phases with invalidated monthly breakdown (modified allocatedMDs in modal)
    const [invalidatedPhases, setInvalidatedPhases] = useState<Set<string>>(new Set());

    // Working Days Calculator singleton instance
    const [workingDaysCalc, setWorkingDaysCalc] = useState<any>(null);

    // Preview state
    const [distributionPreview, setDistributionPreview] = useState<MonthlyDistribution | null>(null);
    const [availabilityPreview, setAvailabilityPreview] = useState<AvailabilityResult | null>(null);
    const [overflowAnalysis, setOverflowAnalysis] = useState<OverflowAnalysis | null>(null);

    // UI state
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isCalculating, setIsCalculating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string>(''); // Role filter: G1, G2, TA, PM

    // Available roles for filtering
    const availableRoles = ['G1', 'G2', 'TA', 'PM'];

    // Get all team members
    const allTeamMembers = useMemo(() => {
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

    // Filter team members by selected role
    const teamMembers = useMemo(() => {
        if (!selectedRole) {
            return allTeamMembers;
        }
        return allTeamMembers.filter(member => member.role === selectedRole);
    }, [allTeamMembers, selectedRole]);

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

    // Initialize phaseAllocations from allocation in edit mode
    useEffect(() => {
        if (allocation && allocation.phaseAllocations && Array.isArray(allocation.phaseAllocations)) {
            console.log('📋 Edit mode: Initializing phaseAllocations from allocation object');

            // Convert allocation.phaseAllocations array to phaseAllocations state object
            const initialAllocations: Record<string, PhaseAllocation> = {};

            allocation.phaseAllocations.forEach((phase: any) => {
                // Handle backward compatibility: if no allocatedMDs/phaseTotalMDs, use totalMDs
                const phaseTotalMDs = phase.phaseTotalMDs ?? phase.totalMDs ?? 0;
                let allocatedMDs = phase.allocatedMDs ?? phase.totalMDs ?? 0;

                // ✅ SYNC: If monthly breakdown exists for this phase, recalculate allocatedMDs from monthly sum
                if (allocation.phaseMonthlyBreakdown && allocation.phaseMonthlyBreakdown[phase.phaseId]) {
                    const monthlyValues = Object.values(allocation.phaseMonthlyBreakdown[phase.phaseId]) as number[];
                    const sumFromMonthly = monthlyValues.reduce((sum: number, val: number) => sum + (val || 0), 0);
                    console.log(`  🔄 ${phase.phaseName}: allocatedMDs ${allocatedMDs} → ${sumFromMonthly} (recalculated from monthly breakdown)`);
                    allocatedMDs = sumFromMonthly;
                }

                initialAllocations[phase.phaseId] = {
                    phaseId: phase.phaseId,
                    phaseName: phase.phaseName,
                    phaseTotalMDs: phaseTotalMDs,               // Phase total (READ-ONLY)
                    allocatedMDs: allocatedMDs,                  // Allocated (EDITABLE) - from monthly if exists
                    originalAllocatedMDs: phase.originalAllocatedMDs, // Preserve original value for reset
                    totalMDs: allocatedMDs,                      // Backward compatibility
                    startDate: phase.startDate || '',
                    endDate: phase.endDate || ''
                };
            });

            setPhaseAllocations(initialAllocations);
            console.log(`✅ Edit mode: Loaded ${Object.keys(initialAllocations).length} phase(s) from allocation`);
        }
    }, [allocation]);

    // Auto-calculate distribution when inputs change
    useEffect(() => {
        if (formData.totalMDs && formData.startDate && formData.endDate && formData.teamMemberId) {
            calculateDistribution();
        } else {
            setDistributionPreview(null);
            setOverflowAnalysis(null);
        }
    }, [formData.totalMDs, formData.startDate, formData.endDate, formData.teamMemberId]);

    // Check availability when member or phase allocations change
    useEffect(() => {
        if (!formData.teamMemberId) {
            setAvailabilityPreview(null);
            return;
        }

        // Calculate date range from phase allocations
        const phasesList = Object.values(phaseAllocations);
        if (phasesList.length === 0) {
            setAvailabilityPreview(null);
            return;
        }

        const allDates = phasesList
            .filter(p => p.startDate && p.endDate)
            .flatMap(p => [p.startDate, p.endDate]);

        if (allDates.length === 0) {
            setAvailabilityPreview(null);
            return;
        }

        const startDate = allDates.sort()[0];
        const endDate = allDates.sort()[allDates.length - 1];

        // Check availability with calculated date range
        try {
            const availability = allocationActions.checkMemberAvailability(
                formData.teamMemberId,
                startDate,
                endDate
            );
            setAvailabilityPreview(availability);
        } catch (error: any) {
            console.error('Error checking availability:', error);
            setAvailabilityPreview(null);
        }
    }, [formData.teamMemberId, phaseAllocations]);

    // Auto-populate phase allocations with MDs from project phases (CREATE mode only)
    useEffect(() => {
        console.log('🔍 Allocation Effect Debug:', {
            isEditing,
            projectPhases_length: projectPhases?.length,
            projectId: formData.projectId,
            teamMemberId: formData.teamMemberId,
            loadingPhases,
            first_phase_effort: projectPhases?.[0]?.effort
        });

        if (!isEditing && projectPhases.length > 0 && formData.projectId && formData.teamMemberId && !loadingPhases) {
            console.log('📋 Auto-populating phase allocations from project phases:', projectPhases);

            // Get team member role
            const member = allTeamMembers.find(m => m.id === formData.teamMemberId);
            const role = member?.role; // G1, G2, TA, PM

            if (!role) {
                console.warn('⚠️ Team member role not found for:', formData.teamMemberId);
                return;
            }

            console.log('👤 Calculating MDs for role:', role);

            const initialAllocations: Record<string, PhaseAllocation> = {};

            projectPhases.forEach(phase => {
                // Calculate MDs for this specific role based on effort percentage
                console.log(`🔎 Phase ${phase.name}: effort field = `, phase.effort);
                const effortPercentage = phase.effort?.[role] || 0;
                const mdsForRole = phase.manDays * (effortPercentage / 100);

                console.log(`  📊 ${phase.name}: ${phase.manDays} MD total, ${role} (${effortPercentage}%) = ${mdsForRole} MD allocated`);

                initialAllocations[phase.id] = {
                    phaseId: phase.id,
                    phaseName: phase.name,
                    phaseTotalMDs: phase.manDays,      // Total phase MDs from project (for date calculation)
                    allocatedMDs: mdsForRole,           // Role-specific MDs (user can edit)
                    originalAllocatedMDs: mdsForRole,   // Original value for reset button
                    totalMDs: mdsForRole,               // Backward compatibility
                    startDate: '',
                    endDate: ''
                };
            });

            setPhaseAllocations(initialAllocations);
            console.log('✅ Phase allocations initialized with role-based MDs for', role, ':', initialAllocations);
        }
    }, [projectPhases, formData.projectId, formData.teamMemberId, loadingPhases, allTeamMembers]);

    // Initialize WorkingDaysCalculator singleton
    useEffect(() => {
        const WorkingDaysCalcClass = (window as any).WorkingDaysCalculator;

        if (WorkingDaysCalcClass && !workingDaysCalc) {
            try {
                // Check if it's a constructor or already an instance
                if (typeof WorkingDaysCalcClass === 'function') {
                    // It's a constructor, create new instance
                    const instance = new WorkingDaysCalcClass();
                    setWorkingDaysCalc(instance);
                    console.log('✅ WorkingDaysCalculator initialized (from constructor)');
                } else if (typeof WorkingDaysCalcClass === 'object') {
                    // It's already an instance, use it directly
                    setWorkingDaysCalc(WorkingDaysCalcClass);
                    console.log('✅ WorkingDaysCalculator initialized (using existing instance)');
                }
            } catch (error) {
                console.error('❌ Failed to initialize WorkingDaysCalculator:', error);
            }
        }
    }, [workingDaysCalc]);

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
     * Handle role selection change
     * Resets team member if current selection doesn't match new role filter
     */
    const handleRoleChange = (role: string) => {
        setSelectedRole(role);

        // Check if current team member still matches new role filter
        if (formData.teamMemberId && role) {
            const currentMember = allTeamMembers.find(m => m.id === formData.teamMemberId);
            if (currentMember && currentMember.role !== role) {
                // Reset team member selection if role doesn't match
                handleInputChange('teamMemberId', '');
            }
        }
    };

    /**
     * Check if a date is a working day (not weekend, not Italian holiday)
     */
    const isWorkingDay = (date: Date): boolean => {
        const dayOfWeek = date.getDay();

        // Weekend check
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }

        // Holiday check using singleton instance
        if (workingDaysCalc) {
            try {
                return !workingDaysCalc.isNationalHoliday(date, 'IT');
            } catch (error) {
                console.warn('⚠️ isNationalHoliday failed:', error);
            }
        }

        // Fallback: only exclude weekends
        return true;
    };

    /**
     * Get next working day after a given date
     */
    const getNextWorkingDay = (date: Date): Date => {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);

        while (!isWorkingDay(next)) {
            next.setDate(next.getDate() + 1);
        }

        return next;
    };

    /**
     * Calculate end date from start date + estimated MDs (working days)
     * @param startDateStr - Start date in YYYY-MM-DD format
     * @param estimatedMDs - Number of working days needed
     * @returns End date in YYYY-MM-DD format
     */
    const calculateEndDateFromMDs = (startDateStr: string, estimatedMDs: number): string => {
        if (!startDateStr) {
            return '';
        }

        // Special case: 0 or 1 MD means start date = end date
        if (estimatedMDs <= 1) {
            return startDateStr;
        }

        const startDate = new Date(startDateStr);
        let current = new Date(startDate);
        let workingDaysCount = 0;

        // Count working days until we reach estimatedMDs
        while (workingDaysCount < estimatedMDs) {
            if (isWorkingDay(current)) {
                workingDaysCount++;
                if (workingDaysCount === estimatedMDs) {
                    break;
                }
            }
            current.setDate(current.getDate() + 1);
        }

        // Return in YYYY-MM-DD format
        return current.toISOString().split('T')[0];
    };

    /**
     * Recalculate phase dates with cascade effect
     * When a phase's start date or MDs change, recalculate its end date
     * and cascade the calculation to all subsequent phases
     */
    const recalculatePhaseDates = (changedPhaseId: string, changedField?: 'startDate' | 'endDate' | 'allocatedMDs') => {
        setPhaseAllocations(prev => {
            const updated = { ...prev };

            // Get phase IDs in order (works for both CREATE and EDIT mode)
            let phaseIds: string[];
            if (isEditing) {
                // EDIT mode: Use order from phaseAllocations (already sorted by original allocation)
                phaseIds = Object.keys(prev);
            } else {
                // CREATE mode: Use order from projectPhases
                phaseIds = projectPhases.map(p => p.id);
            }

            const changedIndex = phaseIds.indexOf(changedPhaseId);

            if (changedIndex === -1) return prev;

            console.log(`🔄 Recalculating cascade from phase ${changedIndex}: ${changedPhaseId} (changed field: ${changedField})`);

            // Process from changed phase onwards
            for (let i = changedIndex; i < phaseIds.length; i++) {
                const phaseId = phaseIds[i];
                const allocation = updated[phaseId];

                if (!allocation) continue;

                if (i === changedIndex) {
                    // For the changed phase:
                    // - If endDate was manually changed: keep it, don't recalculate
                    // - If startDate or allocatedMDs changed: recalculate endDate from start + phaseTotalMDs (duration = phase total)
                    if (changedField === 'endDate') {
                        console.log(`  ✏️ Phase ${allocation.phaseName}: endDate manually set, keeping ${allocation.endDate}`);
                        // Don't recalculate, use the manually set endDate
                    } else if (allocation.startDate && allocation.phaseTotalMDs >= 0) {
                        const newEndDate = calculateEndDateFromMDs(allocation.startDate, allocation.phaseTotalMDs);
                        console.log(`  ✏️ Phase ${allocation.phaseName}: endDate ${allocation.endDate} → ${newEndDate} (using phaseTotalMDs: ${allocation.phaseTotalMDs})`);
                        allocation.endDate = newEndDate;
                    }
                } else {
                    // For subsequent phases, calculate both start and end dates
                    const prevPhase = updated[phaseIds[i - 1]];

                    if (prevPhase && prevPhase.endDate) {
                        // Start = next working day after previous phase end
                        const prevEndDate = new Date(prevPhase.endDate);
                        const nextStart = getNextWorkingDay(prevEndDate);
                        const newStartDate = nextStart.toISOString().split('T')[0];

                        console.log(`  ⏭️ Phase ${allocation.phaseName}: startDate ${allocation.startDate} → ${newStartDate}`);
                        allocation.startDate = newStartDate;

                        // End = start + phaseTotalMDs (duration based on phase total from project)
                        if (allocation.phaseTotalMDs >= 0) {
                            const newEndDate = calculateEndDateFromMDs(allocation.startDate, allocation.phaseTotalMDs);
                            console.log(`  ⏭️ Phase ${allocation.phaseName}: endDate ${allocation.endDate} → ${newEndDate} (using phaseTotalMDs: ${allocation.phaseTotalMDs})`);
                            allocation.endDate = newEndDate;
                        }
                    }
                }
            }

            console.log('✅ Cascade recalculation complete');
            return updated;
        });
    };

    /**
     * Handle phase allocation changes
     */
    const handlePhaseChange = (phaseId: string, field: 'startDate' | 'endDate' | 'allocatedMDs', value: string | number) => {
        // ✅ SYNC: If user modifies allocatedMDs in modal (edit mode), invalidate monthly breakdown for this phase
        if (field === 'allocatedMDs' && isEditing) {
            setInvalidatedPhases(prev => {
                const updated = new Set(prev);
                updated.add(phaseId);
                console.log(`⚠️ Phase ${phaseId} invalidated - monthly breakdown will be removed on save`);
                return updated;
            });
        }

        setPhaseAllocations(prev => {
            const existing = prev[phaseId] || {
                phaseId,
                phaseName: projectPhases.find(p => p.id === phaseId)?.name || '',
                phaseTotalMDs: 0,
                allocatedMDs: 0,
                totalMDs: 0, // backward compat
                startDate: '',
                endDate: ''
            };

            // Convert allocatedMDs from string to number, allowing empty string temporarily
            let processedValue: any = value;
            if (field === 'allocatedMDs') {
                if (typeof value === 'string') {
                    if (value === '') {
                        // Allow empty string (user is deleting to type new value)
                        processedValue = '';
                    } else {
                        const parsed = parseFloat(value);
                        processedValue = isNaN(parsed) ? 0 : parsed;
                    }
                }
            }

            return {
                ...prev,
                [phaseId]: {
                    ...existing,
                    [field]: processedValue,
                    // Keep totalMDs in sync with allocatedMDs for backward compatibility
                    ...(field === 'allocatedMDs' ? { totalMDs: processedValue === '' ? 0 : processedValue } : {})
                }
            };
        });

        // Trigger cascade recalculation after state update
        // For startDate or allocatedMDs: recalculate end date and cascade to next phases
        // For endDate in EDIT mode: also cascade (user wants to shift subsequent phases)
        if (field === 'startDate' || field === 'allocatedMDs' || (isEditing && field === 'endDate')) {
            setTimeout(() => recalculatePhaseDates(phaseId, field), 0);
        }
    };

    /**
     * Validate form - Phase allocations only
     */
    const validateForm = (): boolean => {
        const errorMap: Record<string, string> = {};

        // Required fields
        if (!formData.projectId) {
            errorMap.projectId = 'Project is required';
        }

        if (!formData.teamMemberId) {
            errorMap.teamMemberId = 'Team member is required';
        }

        // All phases must have dates and MDs
        const phasesList = Object.values(phaseAllocations);

        if (phasesList.length === 0) {
            errorMap.general = 'No phases found for this project';
            setErrors(errorMap);
            return false;
        }

        const invalidPhases: string[] = [];
        phasesList.forEach(phase => {
            // Convert allocatedMDs to number for validation (handle empty string case)
            const allocatedMDs = phase.allocatedMDs === '' ? 0 : phase.allocatedMDs;

            if (!phase.startDate || !phase.endDate || allocatedMDs === undefined || allocatedMDs < 0) {
                invalidPhases.push(phase.phaseName);
            }
        });

        if (invalidPhases.length > 0) {
            errorMap.general = `All phases must have start date, end date, and MDs. Missing data for: ${invalidPhases.join(', ')}`;
        }

        if (Object.keys(errorMap).length > 0) {
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

        console.log('🎯 handleSubmit called');
        console.log('📋 Form data:', formData);
        console.log('📋 Phase allocations:', phaseAllocations);

        if (!validateForm()) {
            console.log('❌ Validation failed');
            return;
        }

        console.log('✅ Validation passed');

        try {
            let result;

            if (isEditing && allocation) {
                console.log('🔄 Updating existing allocation...');
                console.log('📋 Existing allocation:', allocation);

                // Convert phaseAllocations object to array
                const hasPhaseAllocations = Object.keys(phaseAllocations).length > 0;
                console.log('📊 Has phase allocations:', hasPhaseAllocations);

                const phaseAllocationsArray = hasPhaseAllocations
                    ? Object.values(phaseAllocations)
                        .filter(p => p.allocatedMDs >= 0 && p.startDate && p.endDate)
                        .map(p => ({
                            ...p,
                            // Convert allocatedMDs from string to number if needed
                            allocatedMDs: typeof p.allocatedMDs === 'string' ? parseFloat(p.allocatedMDs) : p.allocatedMDs,
                            // Keep totalMDs in sync for backward compatibility
                            totalMDs: typeof p.allocatedMDs === 'string' ? parseFloat(p.allocatedMDs) : p.allocatedMDs,
                            // Ensure phaseTotalMDs is a number
                            phaseTotalMDs: typeof p.phaseTotalMDs === 'string' ? parseFloat(p.phaseTotalMDs) : p.phaseTotalMDs
                        }))
                    : undefined;

                console.log('📊 Phase allocations array (edit):', phaseAllocationsArray);

                // ✅ SYNC: Filter out invalidated phases from phaseMonthlyBreakdown
                let filteredMonthlyBreakdown = allocation.phaseMonthlyBreakdown;
                if (filteredMonthlyBreakdown && invalidatedPhases.size > 0) {
                    filteredMonthlyBreakdown = { ...filteredMonthlyBreakdown };
                    invalidatedPhases.forEach(phaseId => {
                        if (filteredMonthlyBreakdown[phaseId]) {
                            console.log(`🗑️ Removing monthly breakdown for invalidated phase: ${phaseId}`);
                            delete filteredMonthlyBreakdown[phaseId];
                        }
                    });
                }

                // Update existing allocation
                const updateData = {
                    projectId: formData.projectId,
                    projectName: formData.projectName,
                    teamMemberId: allocation.teamMemberId || formData.teamMemberId, // ✅ Include teamMemberId for recalculation
                    notes: formData.notes,
                    phaseAllocations: phaseAllocationsArray,
                    // ✅ SYNC: Preserve phaseMonthlyBreakdown (excluding invalidated phases)
                    ...(filteredMonthlyBreakdown && Object.keys(filteredMonthlyBreakdown).length > 0 && {
                        phaseMonthlyBreakdown: filteredMonthlyBreakdown
                    })
                };

                console.log('📦 Update data to send:', updateData);

                result = await allocationActions.updateAllocation(allocation.id, updateData);

                console.log('📬 UpdateAllocation result:', result);
            } else {
                console.log('➕ Creating new allocation...');

                // Create new allocation
                // Convert phaseAllocations object to array if phase-based allocation
                const hasPhaseAllocations = Object.keys(phaseAllocations).length > 0;
                console.log('📊 Has phase allocations:', hasPhaseAllocations);

                const phaseAllocationsArray = hasPhaseAllocations
                    ? Object.values(phaseAllocations)
                        .filter(p => p.allocatedMDs >= 0 && p.startDate && p.endDate)
                        .map(p => ({
                            ...p,
                            // Convert allocatedMDs from string to number if needed
                            allocatedMDs: typeof p.allocatedMDs === 'string' ? parseFloat(p.allocatedMDs) : p.allocatedMDs,
                            // Keep totalMDs in sync for backward compatibility
                            totalMDs: typeof p.allocatedMDs === 'string' ? parseFloat(p.allocatedMDs) : p.allocatedMDs,
                            // Ensure phaseTotalMDs is a number
                            phaseTotalMDs: typeof p.phaseTotalMDs === 'string' ? parseFloat(p.phaseTotalMDs) : p.phaseTotalMDs
                        }))
                    : undefined;

                console.log('📊 Phase allocations array:', phaseAllocationsArray);

                const allocationData: AllocationFormData = {
                    ...formData,
                    phaseAllocations: phaseAllocationsArray
                };

                console.log('📦 Allocation data to send:', allocationData);

                result = await allocationActions.createAllocation(allocationData);

                console.log('📬 CreateAllocation result:', result);
            }

            if (result.success) {
                console.log('✅ Allocation saved successfully!');
                console.log('📞 Calling onSave with:', result.allocation);
                onSave?.(result.allocation);
                console.log('📞 Calling onClose');
                onClose();
            } else {
                console.log('❌ Allocation failed:', result.error);
                setErrors({ general: result.error || 'Failed to save allocation' });
            }

        } catch (error: any) {
            console.error('❌ Exception during save:', error);
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

                        {/* 1. Role Selection */}
                        <div className="form-group">
                            <label htmlFor="assignment-role">Team Member Role:</label>
                            <select
                                id="assignment-role"
                                value={selectedRole}
                                onChange={(e) => handleRoleChange(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                {availableRoles.map(role => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                            <small className="form-help">Filter team members by role</small>
                        </div>

                        {/* 2. Team Member (filtered by role) */}
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
                            {selectedRole && teamMembers.length === 0 && (
                                <small className="form-help" style={{ color: '#dcdcaa' }}>
                                    ℹ️ No team members found with role {selectedRole}
                                </small>
                            )}
                        </div>

                        {/* 3. Project Selection */}
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
                        {formData.projectId && (projectPhases.length > 0 || Object.keys(phaseAllocations).length > 0) && (
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

                                {/* CREATE mode: render from projectPhases */}
                                {!loadingPhases && !isEditing && projectPhases.map(phase => {
                                    const allocation = phaseAllocations[phase.id] || {
                                        phaseId: phase.id,
                                        phaseName: phase.name,
                                        phaseTotalMDs: 0,
                                        allocatedMDs: 0,
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
                                                marginBottom: '4px'
                                            }}>
                                                {phase.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px' }}>
                                                Phase Total: {phase.manDays} MD
                                                {selectedMember?.role && phase.effort?.[selectedMember.role] !== undefined && (
                                                    <>
                                                        {' '}<span style={{ color: '#4ec9b0' }}>|</span>{' '}
                                                        {selectedMember.role}: {phase.effort[selectedMember.role]}%{' '}
                                                        <span style={{ color: '#4ec9b0' }}>→</span>{' '}
                                                        <strong style={{ color: '#d4d4d4' }}>
                                                            {allocation.allocatedMDs.toFixed(1)} MD
                                                        </strong>
                                                    </>
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

                                                {/* Allocated Man Days (EDITABLE) */}
                                                <div>
                                                    <label
                                                        htmlFor={`phase-${phase.id}-mds`}
                                                        style={{ fontSize: '11px', color: '#858585', display: 'block', marginBottom: '4px' }}
                                                    >
                                                        Allocated MDs
                                                    </label>
                                                    <input
                                                        type="number"
                                                        id={`phase-${phase.id}-mds`}
                                                        value={allocation.allocatedMDs || ''}
                                                        onChange={(e) => handlePhaseChange(phase.id, 'allocatedMDs', e.target.value)}
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

                                {/* EDIT mode: render from phaseAllocations */}
                                {!loadingPhases && isEditing && Object.values(phaseAllocations).map(phase => {
                                    return (
                                        <div
                                            key={phase.phaseId}
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
                                                marginBottom: '4px'
                                            }}>
                                                {phase.phaseName}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#858585', marginBottom: '8px' }}>
                                                Phase Total: <strong style={{ color: '#d4d4d4' }}>{phase.phaseTotalMDs.toFixed(1)} MD</strong> (READ-ONLY from project)
                                                {' '}<span style={{ color: '#4ec9b0' }}>|</span>{' '}
                                                Allocated: <strong style={{ color: '#4ec9b0' }}>{phase.allocatedMDs.toFixed(1)} MD</strong> (EDITABLE)
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                                {/* Start Date */}
                                                <div>
                                                    <label
                                                        htmlFor={`phase-${phase.phaseId}-start`}
                                                        style={{ fontSize: '11px', color: '#858585', display: 'block', marginBottom: '4px' }}
                                                    >
                                                        Start Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        id={`phase-${phase.phaseId}-start`}
                                                        value={phase.startDate}
                                                        onChange={(e) => handlePhaseChange(phase.phaseId, 'startDate', e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px',
                                                            fontSize: '12px',
                                                            backgroundColor: '#1e1e1e',
                                                            border: '1px solid #3c3c3c',
                                                            borderRadius: '4px',
                                                            color: '#d4d4d4'
                                                        }}
                                                    />
                                                </div>

                                                {/* End Date */}
                                                <div>
                                                    <label
                                                        htmlFor={`phase-${phase.phaseId}-end`}
                                                        style={{ fontSize: '11px', color: '#858585', display: 'block', marginBottom: '4px' }}
                                                    >
                                                        End Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        id={`phase-${phase.phaseId}-end`}
                                                        value={phase.endDate}
                                                        onChange={(e) => handlePhaseChange(phase.phaseId, 'endDate', e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px',
                                                            fontSize: '12px',
                                                            backgroundColor: '#1e1e1e',
                                                            border: '1px solid #3c3c3c',
                                                            borderRadius: '4px',
                                                            color: '#d4d4d4'
                                                        }}
                                                    />
                                                </div>

                                                {/* Allocated Man Days (EDITABLE) */}
                                                <div>
                                                    <label
                                                        htmlFor={`phase-${phase.phaseId}-mds`}
                                                        style={{ fontSize: '11px', color: '#858585', display: 'block', marginBottom: '4px' }}
                                                    >
                                                        Allocated MDs
                                                    </label>
                                                    <input
                                                        type="number"
                                                        id={`phase-${phase.phaseId}-mds`}
                                                        value={phase.allocatedMDs}
                                                        onChange={(e) => handlePhaseChange(phase.phaseId, 'allocatedMDs', e.target.value)}
                                                        step="0.1"
                                                        min="0"
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px',
                                                            fontSize: '12px',
                                                            backgroundColor: '#1e1e1e',
                                                            border: '1px solid #3c3c3c',
                                                            borderRadius: '4px',
                                                            color: '#d4d4d4'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* No phases warning (CREATE mode only - edit mode loads phases from allocation) */}
                        {!isEditing && formData.projectId && !loadingPhases && projectPhases.length === 0 && (
                            <div style={{
                                padding: '20px',
                                backgroundColor: '#5a1e1e',
                                borderRadius: '6px',
                                border: '1px solid #f48771',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '14px', color: '#f48771', marginBottom: '8px' }}>
                                    ⚠️ No phases found for this project
                                </div>
                                <div style={{ fontSize: '12px', color: '#f48771' }}>
                                    Please select a different project or configure phases for this project first.
                                </div>
                            </div>
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
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={isCalculating}
                            disabled={isCalculating}
                        >
                            {isEditing ? 'Update' : 'Create'} Assignment
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignmentModal;
