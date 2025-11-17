/**
 * Role-Based Allocation Utilities
 * Handles role-specific resource allocation calculations
 * Used by AssignmentModal and capacity planning components
 */

/**
 * Calculate man days for a specific role within a phase
 * Based on the phase's effort distribution percentages
 *
 * @param phaseTotalMDs - Total man days for the phase (from project)
 * @param roleEffortPercentage - Effort percentage for this role in this phase (0-100)
 * @returns Calculated man days for this role, rounded to 1 decimal place
 *
 * @example
 * // Phase has 100 total MDs, G1 contributes 30%
 * const g1MDs = calculateRoleMDs(100, 30);
 * // Returns 30
 *
 * // Phase has 50 total MDs, G2 contributes 40%
 * const g2MDs = calculateRoleMDs(50, 40);
 * // Returns 20
 */
export function calculateRoleMDs(phaseTotalMDs: number, roleEffortPercentage: number): number {
  if (!phaseTotalMDs || !roleEffortPercentage) {
    return 0;
  }

  const calculated = phaseTotalMDs * (roleEffortPercentage / 100);
  // Round to 1 decimal place to avoid floating point issues
  return Math.round(calculated * 10) / 10;
}

/**
 * Extract role effort for a specific role from phase effort object
 * Handles various phase structure formats (from project phases)
 *
 * @param phaseEffort - Effort object from project phase (e.g., { G1: 30, G2: 40, TA: 20, PM: 10 })
 * @param role - Role to extract (G1, G2, TA, PM)
 * @returns Effort percentage for this role (0-100), or 0 if not found
 *
 * @example
 * const effort = { G1: 30, G2: 40, TA: 20, PM: 10 };
 * const g1 = getRoleEffortPercentage(effort, 'G1');
 * // Returns 30
 *
 * const unknown = getRoleEffortPercentage(effort, 'UNKNOWN');
 * // Returns 0
 */
export function getRoleEffortPercentage(
  phaseEffort: Record<string, number> | undefined,
  role: string
): number {
  if (!phaseEffort || !role) {
    return 0;
  }

  return phaseEffort[role] ?? 0;
}

/**
 * Calculate all role allocations for a phase at once
 * Returns an object with all roles and their calculated MDs
 *
 * @param phaseTotalMDs - Total man days for the phase
 * @param phaseEffort - Effort distribution object
 * @param availableRoles - Array of roles to calculate (e.g., ['G1', 'G2', 'TA', 'PM'])
 * @returns Object mapping each role to its calculated MDs
 *
 * @example
 * const phase = {
 *   manDays: 100,
 *   effort: { G1: 30, G2: 40, TA: 20, PM: 10 }
 * };
 *
 * const allocations = calculatePhaseAllocations(phase.manDays, phase.effort, ['G1', 'G2', 'TA', 'PM']);
 * // Returns { G1: 30, G2: 40, TA: 20, PM: 10 }
 */
export function calculatePhaseAllocations(
  phaseTotalMDs: number,
  phaseEffort: Record<string, number> | undefined,
  availableRoles: string[]
): Record<string, number> {
  const allocations: Record<string, number> = {};

  availableRoles.forEach(role => {
    const effortPercentage = getRoleEffortPercentage(phaseEffort, role);
    allocations[role] = calculateRoleMDs(phaseTotalMDs, effortPercentage);
  });

  return allocations;
}

/**
 * Get team member's role from team members list
 * Handles various member object structures
 *
 * @param teamMembers - Array of team member objects
 * @param memberId - ID of the member to find
 * @returns Member's role (G1, G2, TA, PM), or null if not found
 *
 * @example
 * const members = [
 *   { id: '1', firstName: 'John', lastName: 'Doe', role: 'G1' },
 *   { id: '2', firstName: 'Jane', lastName: 'Smith', role: 'G2' }
 * ];
 *
 * const role = getMemberRole(members, '1');
 * // Returns 'G1'
 */
export function getMemberRole(
  teamMembers: Array<{ id: string; role?: string; [key: string]: any }> | undefined,
  memberId: string
): string | null {
  if (!teamMembers || !memberId) {
    return null;
  }

  const member = teamMembers.find(m => m.id === memberId);
  return member?.role ?? null;
}

/**
 * Get member's full name from team members list
 * Combines first and last name
 *
 * @param teamMembers - Array of team member objects
 * @param memberId - ID of the member to find
 * @returns Full name "FirstName LastName", or empty string if not found
 *
 * @example
 * const members = [
 *   { id: '1', firstName: 'John', lastName: 'Doe', role: 'G1' }
 * ];
 *
 * const name = getMemberName(members, '1');
 * // Returns 'John Doe'
 */
export function getMemberName(
  teamMembers: Array<{ id: string; firstName?: string; lastName?: string; [key: string]: any }> | undefined,
  memberId: string
): string {
  if (!teamMembers || !memberId) {
    return '';
  }

  const member = teamMembers.find(m => m.id === memberId);
  if (!member) {
    return '';
  }

  const firstName = member.firstName ?? '';
  const lastName = member.lastName ?? '';
  return `${firstName} ${lastName}`.trim();
}

/**
 * Filter team members by role
 * Returns only members matching the specified role
 *
 * @param teamMembers - Array of team member objects
 * @param role - Role to filter by (G1, G2, TA, PM), or undefined for all
 * @returns Filtered array of team members
 *
 * @example
 * const members = [
 *   { id: '1', firstName: 'John', role: 'G1' },
 *   { id: '2', firstName: 'Jane', role: 'G2' },
 *   { id: '3', firstName: 'Bob', role: 'G1' }
 * ];
 *
 * const g1Members = filterMembersByRole(members, 'G1');
 * // Returns [{ id: '1', ... }, { id: '3', ... }]
 *
 * const all = filterMembersByRole(members, undefined);
 * // Returns all members
 */
export function filterMembersByRole(
  teamMembers: Array<{ id: string; role?: string; [key: string]: any }> | undefined,
  role: string | undefined
): typeof teamMembers {
  if (!teamMembers) {
    return [];
  }

  if (!role) {
    return teamMembers;
  }

  return teamMembers.filter(member => member.role === role);
}

/**
 * Check if member's current role matches a filter role
 * Used for validation when role filter changes
 *
 * @param teamMembers - Array of team members
 * @param memberId - ID of member to check
 * @param filterRole - Role to match against
 * @returns true if member's role matches filter role, false otherwise
 *
 * @example
 * const members = [
 *   { id: '1', role: 'G1' },
 *   { id: '2', role: 'G2' }
 * ];
 *
 * const matches = memberRoleMatches(members, '1', 'G1');
 * // Returns true
 *
 * const doesntMatch = memberRoleMatches(members, '1', 'G2');
 * // Returns false
 */
export function memberRoleMatches(
  teamMembers: Array<{ id: string; role?: string; [key: string]: any }> | undefined,
  memberId: string,
  filterRole: string
): boolean {
  const memberRole = getMemberRole(teamMembers, memberId);
  return memberRole === filterRole;
}

/**
 * Get team member info with calculated role-based MDs
 * Used when initializing allocation for a specific role
 *
 * @param teamMembers - Array of team members
 * @param memberId - ID of member to get
 * @returns Member object with full name and role, or null if not found
 *
 * @example
 * const members = [
 *   { id: '1', firstName: 'John', lastName: 'Doe', role: 'G1' }
 * ];
 *
 * const member = getMemberInfo(members, '1');
 * // Returns { id: '1', firstName: 'John', lastName: 'Doe', role: 'G1', fullName: 'John Doe' }
 */
export function getMemberInfo(
  teamMembers: Array<{ id: string; firstName?: string; lastName?: string; role?: string; [key: string]: any }> | undefined,
  memberId: string
): (typeof teamMembers[0] & { fullName: string }) | null {
  if (!teamMembers || !memberId) {
    return null;
  }

  const member = teamMembers.find(m => m.id === memberId);
  if (!member) {
    return null;
  }

  const firstName = member.firstName ?? '';
  const lastName = member.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    ...member,
    fullName
  };
}

/**
 * Calculate total MDs needed for all phases when role is assigned
 * Sums up role-specific allocations across all project phases
 *
 * @param phases - Array of project phases with manDays and effort
 * @param role - Role to calculate total MDs for
 * @returns Total man days for this role across all phases
 *
 * @example
 * const phases = [
 *   { id: '1', manDays: 100, effort: { G1: 30, G2: 40, TA: 20, PM: 10 } },
 *   { id: '2', manDays: 50, effort: { G1: 40, G2: 30, TA: 20, PM: 10 } }
 * ];
 *
 * const totalG1 = calculateTotalRoleMDs(phases, 'G1');
 * // Returns 50 (30 from phase 1 + 20 from phase 2)
 */
export function calculateTotalRoleMDs(
  phases: Array<{
    id: string;
    manDays: number;
    effort?: Record<string, number>;
    [key: string]: any;
  }> | undefined,
  role: string
): number {
  if (!phases || !role) {
    return 0;
  }

  return phases.reduce((total, phase) => {
    const effortPercentage = getRoleEffortPercentage(phase.effort, role);
    const roleMDs = calculateRoleMDs(phase.manDays, effortPercentage);
    return total + roleMDs;
  }, 0);
}

/**
 * Validate that role-based allocations don't exceed phase total
 * Useful for capacity checking
 *
 * @param phaseTotalMDs - Total MDs available in phase
 * @param roleAllocations - Object with each role and allocated MDs
 * @returns true if total allocations match or don't exceed phase total, false otherwise
 *
 * @example
 * const total = validateAllocationTotal(100, { G1: 30, G2: 40, TA: 20, PM: 10 });
 * // Returns true (30+40+20+10 = 100)
 *
 * const invalid = validateAllocationTotal(100, { G1: 30, G2: 50, TA: 30 });
 * // Returns false (30+50+30 = 110 > 100)
 */
export function validateAllocationTotal(
  phaseTotalMDs: number,
  roleAllocations: Record<string, number>
): boolean {
  if (!phaseTotalMDs || !roleAllocations) {
    return false;
  }

  const total = Object.values(roleAllocations).reduce((sum, mds) => sum + mds, 0);
  // Allow small floating point differences (0.1)
  return total <= phaseTotalMDs + 0.1;
}
