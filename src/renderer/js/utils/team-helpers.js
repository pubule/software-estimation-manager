/**
 * Team Member Helper Functions
 *
 * Pure utility functions to work with globalConfig.teams
 * NO business logic, NO state mutations, ONLY data queries
 *
 * These functions provide easy access to team members stored in globalConfig.teams[]
 * Used by Capacity Actions and Components to query team member data
 */

/**
 * Get all team members flattened from all teams
 * @returns {Array} Array of all team members across all teams
 */
export function getAllTeamMembers() {
    const store = window.appStore?.getState();
    const globalConfig = store?.globalConfig;

    if (!globalConfig?.teams || !Array.isArray(globalConfig.teams)) {
        return [];
    }

    // Flatten: extract all members from all teams
    return globalConfig.teams.flatMap(team => team.members || []);
}

/**
 * Get team member by ID
 * @param {string} memberId - Team member ID
 * @returns {Object|null} Team member object or null if not found
 */
export function getTeamMemberById(memberId) {
    if (!memberId) return null;

    const allMembers = getAllTeamMembers();
    return allMembers.find(m => m.id === memberId) || null;
}

/**
 * Get team members by vendor ID
 * @param {string} vendorId - Vendor/Supplier ID
 * @returns {Array} Array of team members from that vendor
 */
export function getTeamMembersByVendor(vendorId) {
    if (!vendorId) return [];

    const allMembers = getAllTeamMembers();
    return allMembers.filter(m => m.vendorId === vendorId);
}

/**
 * Get team members by vendor type (supplier | internal)
 * @param {'supplier'|'internal'} vendorType - Vendor type
 * @returns {Array} Array of team members
 */
export function getTeamMembersByVendorType(vendorType) {
    if (!vendorType) return [];

    const allMembers = getAllTeamMembers();
    return allMembers.filter(m => m.vendorType === vendorType);
}

/**
 * Get team members by role
 * @param {string} role - Role name (e.g., "Senior Frontend Developer")
 * @returns {Array} Array of team members with that role
 */
export function getTeamMembersByRole(role) {
    if (!role) return [];

    const allMembers = getAllTeamMembers();
    return allMembers.filter(m => m.role === role);
}

/**
 * Get team for a specific member
 * @param {string} memberId - Team member ID
 * @returns {Object|null} Team object or null if not found
 */
export function getTeamForMember(memberId) {
    if (!memberId) return null;

    const store = window.appStore?.getState();
    const globalConfig = store?.globalConfig;

    if (!globalConfig?.teams || !Array.isArray(globalConfig.teams)) {
        return null;
    }

    return globalConfig.teams.find(team =>
        team.members?.some(m => m.id === memberId)
    ) || null;
}

/**
 * Get team member's monthly capacity
 * @param {string} memberId - Team member ID
 * @returns {number} Monthly capacity in days (default 22 if not found)
 */
export function getTeamMemberCapacity(memberId) {
    const member = getTeamMemberById(memberId);
    return member?.monthlyCapacity || 22; // Default 22 working days per month
}

/**
 * Get team member's full name
 * @param {string} memberId - Team member ID
 * @returns {string} Full name or "Unknown" if not found
 */
export function getTeamMemberFullName(memberId) {
    const member = getTeamMemberById(memberId);
    if (!member) return 'Unknown';

    return `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown';
}

/**
 * Search team members by name (firstName or lastName)
 * @param {string} query - Search query
 * @returns {Array} Matching team members
 */
export function searchTeamMembers(query) {
    const allMembers = getAllTeamMembers();

    if (!query || query.trim() === '') {
        return allMembers;
    }

    const lowerQuery = query.toLowerCase().trim();

    return allMembers.filter(m => {
        const firstName = (m.firstName || '').toLowerCase();
        const lastName = (m.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();

        return firstName.includes(lowerQuery) ||
               lastName.includes(lowerQuery) ||
               fullName.includes(lowerQuery);
    });
}

/**
 * Get vendor name for team member
 * Searches in both suppliers and internal resources
 * @param {string} memberId - Team member ID
 * @returns {string} Vendor name or "Unknown" if not found
 */
export function getVendorNameForMember(memberId) {
    const member = getTeamMemberById(memberId);
    if (!member) return 'Unknown';

    const store = window.appStore?.getState();
    const globalConfig = store?.globalConfig;

    if (!globalConfig) return member.vendorId || 'Unknown';

    // Search in suppliers
    if (globalConfig.suppliers && Array.isArray(globalConfig.suppliers)) {
        const supplier = globalConfig.suppliers.find(s => s.id === member.vendorId);
        if (supplier) return supplier.name || supplier.id;
    }

    // Search in internal resources
    if (globalConfig.internalResources && Array.isArray(globalConfig.internalResources)) {
        const internal = globalConfig.internalResources.find(i => i.id === member.vendorId);
        if (internal) return internal.name || internal.id;
    }

    return member.vendorId || 'Unknown';
}

/**
 * Get all unique roles from all team members
 * @returns {Array} Array of unique role names
 */
export function getAllRoles() {
    const allMembers = getAllTeamMembers();
    const roles = allMembers
        .map(m => m.role)
        .filter(role => role && role.trim() !== '');

    // Return unique roles
    return [...new Set(roles)];
}

/**
 * Get all unique vendors from all team members
 * @returns {Array} Array of unique vendor IDs
 */
export function getAllVendors() {
    const allMembers = getAllTeamMembers();
    const vendors = allMembers
        .map(m => m.vendorId)
        .filter(vendorId => vendorId && vendorId.trim() !== '');

    // Return unique vendor IDs
    return [...new Set(vendors)];
}

/**
 * Check if a team member exists
 * @param {string} memberId - Team member ID
 * @returns {boolean} True if member exists
 */
export function teamMemberExists(memberId) {
    return getTeamMemberById(memberId) !== null;
}

/**
 * Get team members count
 * @returns {number} Total number of team members
 */
export function getTeamMembersCount() {
    return getAllTeamMembers().length;
}

/**
 * Get team member's email
 * @param {string} memberId - Team member ID
 * @returns {string|null} Email or null if not found
 */
export function getTeamMemberEmail(memberId) {
    const member = getTeamMemberById(memberId);
    return member?.email || null;
}

// Make functions available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.TeamHelpers = {
        getAllTeamMembers,
        getTeamMemberById,
        getTeamMembersByVendor,
        getTeamMembersByVendorType,
        getTeamMembersByRole,
        getTeamForMember,
        getTeamMemberCapacity,
        getTeamMemberFullName,
        searchTeamMembers,
        getVendorNameForMember,
        getAllRoles,
        getAllVendors,
        teamMemberExists,
        getTeamMembersCount,
        getTeamMemberEmail
    };
}
