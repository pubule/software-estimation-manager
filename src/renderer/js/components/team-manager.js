/**
 * Team Manager
 * 
 * Handles CRUD operations for team members including:
 * - Team member creation, update, deletion
 * - Vacation day management
 * - Data validation and persistence
 * - Integration with configuration system
 */

class TeamManager {
    constructor(dataManager, configManager) {
        this.dataManager = dataManager;
        this.configManager = configManager;
        this._teamMembers = [];
        this._lastId = 0;
        
        this.validRoles = ['G1', 'G2', 'PM', 'TA'];
        this.defaultMonthlyCapacity = 22;
    }

    /**
     * Load team members from storage
     */
    async loadTeamMembers() {
        try {
            const loadedMembers = await this.dataManager.loadTeamMembers();
            this._teamMembers = loadedMembers || [];
            
            // Update last ID to prevent conflicts
            if (this._teamMembers.length > 0) {
                const maxId = Math.max(...this._teamMembers.map(member => {
                    const idNum = parseInt(member.id.replace('tm-', ''));
                    return isNaN(idNum) ? 0 : idNum;
                }));
                this._lastId = maxId;
            }
            
            return true;
        } catch (error) {
            console.error('Failed to load team members:', error);
            return false;
        }
    }

    /**
     * Create a new team member
     * @param {Object} data Team member data
     * @returns {Object} Result with success status and team member or errors
     */
    async createTeamMember(data) {
        // Validate input data
        const validationResult = this._validateTeamMemberData(data);
        if (!validationResult.isValid) {
            return {
                success: false,
                errors: validationResult.errors
            };
        }

        try {
            // Create team member object
            const teamMember = {
                id: this._generateId(),
                firstName: data.firstName,
                lastName: data.lastName,
                vendor: data.vendor,
                role: data.role || 'G2',
                monthlyCapacity: data.monthlyCapacity || this.defaultMonthlyCapacity,
                vacationDays: data.vacationDays || {},
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            // Add to internal collection
            this._teamMembers.push(teamMember);

            // Save to storage
            await this.dataManager.saveTeamMembers(this._teamMembers);

            return {
                success: true,
                teamMember: teamMember
            };
        } catch (error) {
            console.error('Failed to create team member:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update existing team member
     * @param {string} id Team member ID
     * @param {Object} data Updated data
     * @returns {Object} Result with success status and updated team member or errors
     */
    async updateTeamMember(id, data) {
        const memberIndex = this._teamMembers.findIndex(member => member.id === id);
        if (memberIndex === -1) {
            return {
                success: false,
                error: 'Team member not found'
            };
        }

        // Validate input data
        const validationResult = this._validateTeamMemberData(data, true);
        if (!validationResult.isValid) {
            return {
                success: false,
                errors: validationResult.errors
            };
        }

        try {
            // Update team member
            const existingMember = this._teamMembers[memberIndex];
            const updatedMember = {
                ...existingMember,
                firstName: data.firstName,
                lastName: data.lastName,
                vendor: data.vendor,
                role: data.role || existingMember.role,
                monthlyCapacity: data.monthlyCapacity !== undefined ? data.monthlyCapacity : existingMember.monthlyCapacity,
                vacationDays: data.vacationDays || existingMember.vacationDays,
                lastModified: new Date().toISOString()
            };

            this._teamMembers[memberIndex] = updatedMember;

            // Save to storage
            await this.dataManager.saveTeamMembers(this._teamMembers);

            return {
                success: true,
                teamMember: updatedMember
            };
        } catch (error) {
            console.error('Failed to update team member:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete team member
     * @param {string} id Team member ID
     * @returns {Object} Result with success status
     */
    async deleteTeamMember(id) {
        const memberIndex = this._teamMembers.findIndex(member => member.id === id);
        if (memberIndex === -1) {
            return {
                success: false,
                error: 'Team member not found'
            };
        }

        // Check for active assignments (mock check for now)
        const member = this._teamMembers[memberIndex];
        if (member.hasActiveAssignments) {
            return {
                success: false,
                error: 'Cannot delete team member with active project assignments'
            };
        }

        try {
            // Remove from collection
            this._teamMembers.splice(memberIndex, 1);

            // Save to storage
            await this.dataManager.saveTeamMembers(this._teamMembers);

            return {
                success: true
            };
        } catch (error) {
            console.error('Failed to delete team member:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all team members
     * @returns {Array} Array of team members
     */
    getAllTeamMembers() {
        return [...this._teamMembers];
    }

    /**
     * Get team member by ID
     * @param {string} id Team member ID
     * @returns {Object|null} Team member object or null
     */
    getTeamMemberById(id) {
        const member = this._teamMembers.find(member => member.id === id);
        return member || null;
    }

    /**
     * Get team members by vendor
     * @param {string} vendorId Vendor ID
     * @returns {Array} Array of team members for the vendor
     */
    getTeamMembersByVendor(vendorId) {
        return this._teamMembers.filter(member => member.vendor === vendorId);
    }

    /**
     * Add vacation days to team member
     * @param {string} teamMemberId Team member ID
     * @param {number} year Year
     * @param {Array} dates Array of date strings (YYYY-MM-DD)
     * @returns {Object} Result with success status
     */
    async addVacationDays(teamMemberId, year, dates) {
        const member = this.getTeamMemberById(teamMemberId);
        if (!member) {
            return {
                success: false,
                error: 'Team member not found'
            };
        }

        try {
            // Initialize year if doesn't exist
            if (!member.vacationDays[year]) {
                member.vacationDays[year] = [];
            }

            // Add dates (avoiding duplicates)
            dates.forEach(date => {
                if (!member.vacationDays[year].includes(date)) {
                    member.vacationDays[year].push(date);
                }
            });

            // Update last modified
            member.lastModified = new Date().toISOString();

            // Save to storage
            await this.dataManager.saveTeamMembers(this._teamMembers);

            return {
                success: true
            };
        } catch (error) {
            console.error('Failed to add vacation days:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Remove vacation days from team member
     * @param {string} teamMemberId Team member ID
     * @param {number} year Year
     * @param {Array} dates Array of date strings to remove
     * @returns {Object} Result with success status
     */
    async removeVacationDays(teamMemberId, year, dates) {
        const member = this.getTeamMemberById(teamMemberId);
        if (!member) {
            return {
                success: false,
                error: 'Team member not found'
            };
        }

        try {
            // Remove dates if year exists
            if (member.vacationDays[year]) {
                dates.forEach(date => {
                    const index = member.vacationDays[year].indexOf(date);
                    if (index > -1) {
                        member.vacationDays[year].splice(index, 1);
                    }
                });
            }

            // Update last modified
            member.lastModified = new Date().toISOString();

            // Save to storage
            await this.dataManager.saveTeamMembers(this._teamMembers);

            return {
                success: true
            };
        } catch (error) {
            console.error('Failed to remove vacation days:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get vacation days for team member in specific month
     * @param {string} teamMemberId Team member ID
     * @param {string} month Month in YYYY-MM format
     * @returns {Array} Array of vacation dates in the month
     */
    getVacationDaysInMonth(teamMemberId, month) {
        const member = this.getTeamMemberById(teamMemberId);
        if (!member) {
            return [];
        }

        const [year] = month.split('-').map(Number);
        const vacationDays = member.vacationDays[year] || [];

        return vacationDays.filter(date => date.startsWith(month));
    }

    /**
     * Get total vacation days for year
     * @param {string} teamMemberId Team member ID
     * @param {number} year Year
     * @returns {number} Total vacation days count
     */
    getTotalVacationDaysForYear(teamMemberId, year) {
        const member = this.getTeamMemberById(teamMemberId);
        if (!member || !member.vacationDays[year]) {
            return 0;
        }

        return member.vacationDays[year].length;
    }

    /**
     * Search team members by name
     * @param {string} query Search query
     * @returns {Array} Array of matching team members
     */
    searchTeamMembers(query) {
        const lowerQuery = query.toLowerCase();
        return this._teamMembers.filter(member =>
            member.firstName.toLowerCase().includes(lowerQuery) ||
            member.lastName.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Filter team members by role
     * @param {string} role Role to filter by
     * @returns {Array} Array of team members with the role
     */
    filterTeamMembersByRole(role) {
        return this._teamMembers.filter(member => member.role === role);
    }

    /**
     * Get available vendors from configuration
     * @returns {Array} Array of available vendors
     */
    getAvailableVendors() {
        return this.configManager.getSuppliers();
    }

    /**
     * Get available roles
     * @returns {Array} Array of available roles
     */
    getAvailableRoles() {
        return [...this.validRoles];
    }

    /**
     * Generate unique ID for team members
     * @private
     * @returns {string} Unique team member ID
     */
    _generateId() {
        this._lastId++;
        return `tm-${String(this._lastId).padStart(3, '0')}`;
    }

    /**
     * Validate team member data
     * @private
     * @param {Object} data Team member data
     * @param {boolean} isUpdate Whether this is an update operation
     * @returns {Object} Validation result
     */
    _validateTeamMemberData(data, isUpdate = false) {
        const errors = {};

        // Required fields validation
        if (!data.firstName || data.firstName.trim().length === 0) {
            errors.firstName = 'First name is required';
        }

        if (!data.lastName || data.lastName.trim().length === 0) {
            errors.lastName = 'Last name is required';
        }

        if (!data.vendor) {
            errors.vendor = 'Vendor is required';
        } else {
            // Validate vendor exists in configuration
            const availableVendors = this.getAvailableVendors();
            const vendorExists = availableVendors.some(vendor => vendor.id === data.vendor);
            if (!vendorExists) {
                errors.vendor = 'Invalid vendor selected';
            }
        }

        // Role validation
        if (data.role && !this.validRoles.includes(data.role)) {
            errors.role = 'Invalid role selected';
        }

        // Monthly capacity validation
        if (data.monthlyCapacity !== undefined) {
            if (typeof data.monthlyCapacity !== 'number' || data.monthlyCapacity <= 0) {
                errors.monthlyCapacity = 'Monthly capacity must be positive number';
            }
        }

        // Vacation days validation
        if (data.vacationDays) {
            try {
                Object.keys(data.vacationDays).forEach(year => {
                    const dates = data.vacationDays[year];
                    if (!Array.isArray(dates)) {
                        throw new Error('Vacation days must be an array');
                    }
                    
                    dates.forEach(date => {
                        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                        if (!dateRegex.test(date)) {
                            throw new Error(`Invalid date format: ${date}`);
                        }
                    });
                });
            } catch (error) {
                errors.vacationDays = error.message;
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    }
}

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamManager;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.TeamManager = TeamManager;
}