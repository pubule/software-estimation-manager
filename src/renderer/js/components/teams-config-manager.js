/**
 * Teams Configuration Manager
 * Manages teams and team members in Master-Detail layout
 */

class TeamsConfigManager {
    constructor(app, configManager) {
        this.app = app;
        this.configManager = configManager;
        this.selectedTeam = null;
        this.currentScope = 'global'; // 'global' or 'project'

        // Initialize with default teams if needed
        this.init();
    }

    /**
     * Initialize the manager
     */
    init() {
        this.ensureDefaultTeams();
        this.loadDefaults();
    }

    /**
     * Load default configurations
     */
    async loadDefaults() {
        try {
            // Load any default settings if needed
            console.log('TeamsConfigManager defaults loaded');
        } catch (error) {
            console.error('Failed to load teams defaults:', error);
        }
    }

    /**
     * Ensure default teams exist
     */
    ensureDefaultTeams() {
        try {
            if (!this.configManager || !this.configManager.globalConfig) {
                console.log('ConfigManager or globalConfig not available');
                return;
            }
            
            const globalConfig = this.configManager.globalConfig;
            
            if (!globalConfig.teams || globalConfig.teams.length === 0) {
                console.log('No teams found, creating default teams');
                globalConfig.teams = this.createFallbackTeams();
                this.configManager.saveGlobalConfig();
            }
        } catch (error) {
            console.error('Failed to ensure default teams:', error);
        }
    }

    /**
     * Create fallback teams with default team members
     */
    createFallbackTeams() {
        return [
            {
                id: 'team-frontend',
                name: 'Frontend Team',
                description: 'Frontend development team specializing in UI/UX implementation',
                status: 'active',
                isGlobal: true,
                created: new Date().toISOString(),
                members: [
                    {
                        id: 'member-frontend-1',
                        firstName: 'Mario',
                        lastName: 'Rossi',
                        email: 'mario.rossi@company.com',
                        role: 'Senior Frontend Developer',
                        vendorId: 'internal1', // Will reference internal resource
                        vendorType: 'internal', // 'internal' or 'supplier'
                        monthlyCapacity: 22,
                        status: 'active',
                        joinDate: new Date().toISOString()
                    },
                    {
                        id: 'member-frontend-2', 
                        firstName: 'Lucia',
                        lastName: 'Verdi',
                        email: 'lucia.verdi@company.com',
                        role: 'Frontend Developer',
                        vendorId: 'supplier1', // Will reference external supplier
                        vendorType: 'supplier',
                        monthlyCapacity: 22,
                        status: 'active',
                        joinDate: new Date().toISOString()
                    }
                ]
            },
            {
                id: 'team-backend',
                name: 'Backend Team',
                description: 'Backend development team handling server-side logic and APIs',
                status: 'active',
                isGlobal: true,
                created: new Date().toISOString(),
                members: [
                    {
                        id: 'member-backend-1',
                        firstName: 'Anna',
                        lastName: 'Bianchi',
                        email: 'anna.bianchi@company.com',
                        role: 'Senior Backend Developer',
                        vendorId: 'internal2',
                        vendorType: 'internal',
                        monthlyCapacity: 22,
                        status: 'active',
                        joinDate: new Date().toISOString()
                    }
                ]
            },
            {
                id: 'team-qa',
                name: 'QA Team', 
                description: 'Quality Assurance team for testing and validation',
                status: 'active',
                isGlobal: true,
                created: new Date().toISOString(),
                members: [
                    {
                        id: 'member-qa-1',
                        firstName: 'Giuseppe',
                        lastName: 'Neri',
                        email: 'giuseppe.neri@company.com',
                        role: 'QA Engineer',
                        vendorId: 'internal3',
                        vendorType: 'internal',
                        monthlyCapacity: 22,
                        status: 'active',
                        joinDate: new Date().toISOString()
                    }
                ]
            }
        ];
    }

    /**
     * Set up event listeners for the teams page
     */
    setupEventListeners() {
        const container = document.querySelector('.teams-config-container');
        if (!container) return;

        // Use event delegation for dynamic content
        container.addEventListener('click', (e) => this.handleClick(e));
        container.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    /**
     * Handle click events
     */
    handleClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        e.preventDefault();

        switch (action) {
            case 'add-team':
                this.showAddTeamModal();
                break;
            case 'edit-team':
                this.editTeam(target.dataset.teamId);
                break;
            case 'duplicate-team':
                this.duplicateTeam(target.dataset.teamId);
                break;
            case 'delete-team':
                this.deleteTeam(target.dataset.teamId);
                break;
            case 'add-team-member':
                this.showAddTeamMemberModal();
                break;
            case 'edit-team-member':
                this.editTeamMember(target.dataset.teamMemberId);
                break;
            case 'duplicate-team-member':
                this.duplicateTeamMember(target.dataset.teamMemberId);
                break;
            case 'delete-team-member':
                this.deleteTeamMember(target.dataset.teamMemberId);
                break;
            case 'reset-to-default':
                this.resetToDefaultTeams();
                break;
        }

        // Handle team selection
        if (target.classList.contains('team-item')) {
            const teamId = target.dataset.teamId;
            this.selectTeam(teamId);
        }

        // Handle modal close
        if (target.classList.contains('modal-close')) {
            this.closeModal();
        }

        // Handle scope tab switching
        if (target.classList.contains('teams-scope-tab')) {
            const scope = target.dataset.scope;
            this.switchScope(scope);
        }
    }

    /**
     * Handle form submission
     */
    handleSubmit(e) {
        e.preventDefault();
        
        if (e.target.id === 'team-form') {
            this.saveTeamForm();
        } else if (e.target.id === 'team-member-form') {
            this.saveTeamMemberForm();
        }
    }

    /**
     * Render the main teams configuration page
     */
    renderTeamsPage(container) {        
        if (!container) {
            console.log('No container provided to renderTeamsPage');
            return;
        }

        // Ensure default teams are initialized before rendering
        this.ensureDefaultTeams();

        container.innerHTML = `
            <div class="teams-config-container">
                <div class="teams-header">
                    <h2><i class="fas fa-users"></i> Teams & Team Members Configuration</h2>
                    <p class="teams-description">
                        Manage teams and their members. Each team member must be associated with a vendor (supplier or internal resource) for capacity planning and cost calculations.
                    </p>
                </div>

                <!-- Scope Selector -->
                <div class="teams-scope-selector">
                    <div class="scope-tabs">
                        <button class="scope-tab teams-scope-tab active" data-scope="global">
                            <i class="fas fa-globe"></i>
                            Global Teams
                            <span class="count" id="global-teams-count">0</span>
                        </button>
                        <button class="scope-tab teams-scope-tab" data-scope="project">
                            <i class="fas fa-project-diagram"></i>
                            Project Teams
                            <span class="count" id="project-teams-count">0</span>
                        </button>
                    </div>
                    <div class="scope-actions">
                        <button class="btn btn-small btn-secondary" data-action="reset-to-default" title="Reset to Default Teams">
                            <i class="fas fa-undo"></i> Reset to Default
                        </button>
                    </div>
                </div>

                <!-- Main Layout -->
                <div class="teams-table-container">
                    <div class="teams-master-detail-layout">
                        <!-- Teams List (Master Panel) -->
                        <div class="teams-master-panel">
                            <div class="panel-header">
                                <h3>Teams</h3>
                                <button class="btn btn-small btn-primary" data-action="add-team">
                                    <i class="fas fa-plus"></i> Add Team
                                </button>
                            </div>
                            <div class="teams-list" id="teams-list">
                                <!-- Teams will be populated here -->
                            </div>
                        </div>

                        <!-- Team Details and Members (Detail Panel) -->
                        <div class="teams-detail-panel">
                            <div class="team-details-section" id="team-details-section">
                                <div class="no-selection-message">
                                    <i class="fas fa-info-circle"></i>
                                    <p>Select a team to view and manage its members</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Team Modal -->
            <div id="team-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="team-modal-title">Add Team</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="team-form">
                            <div class="form-group">
                                <label for="team-name">Team Name *</label>
                                <input type="text" id="team-name" name="name" class="validation-tooltip required" required maxlength="100">
                            </div>
                            <div class="form-group">
                                <label for="team-description">Description</label>
                                <textarea id="team-description" name="description" rows="3" maxlength="500"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="team-status">Status</label>
                                <select id="team-status" name="status">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                        <button type="submit" class="btn btn-primary" form="team-form">Save Team</button>
                    </div>
                </div>
            </div>

            <!-- Team Member Modal -->
            <div id="team-member-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="team-member-modal-title">Add Team Member</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="team-member-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="member-first-name">First Name *</label>
                                    <input type="text" id="member-first-name" name="firstName" class="validation-tooltip required" required maxlength="50">
                                </div>
                                <div class="form-group">
                                    <label for="member-last-name">Last Name *</label>
                                    <input type="text" id="member-last-name" name="lastName" class="validation-tooltip required" required maxlength="50">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="member-email">Email</label>
                                <input type="email" id="member-email" name="email" maxlength="100">
                            </div>
                            <div class="form-group">
                                <label for="member-role">Role *</label>
                                <input type="text" id="member-role" name="role" class="validation-tooltip required" required maxlength="100">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="member-vendor-type">Vendor Type *</label>
                                    <select id="member-vendor-type" name="vendorType" class="validation-tooltip required" required>
                                        <option value="">Select Vendor Type</option>
                                        <option value="internal">Internal Resource</option>
                                        <option value="supplier">External Supplier</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="member-vendor">Vendor *</label>
                                    <select id="member-vendor" name="vendorId" class="validation-tooltip required" required>
                                        <option value="">Select Vendor</option>
                                        <!-- Will be populated based on vendor type -->
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="member-monthly-capacity">Monthly Capacity (Days) *</label>
                                <input type="number" id="member-monthly-capacity" name="monthlyCapacity" 
                                       min="1" max="31" class="validation-tooltip required" required value="22">
                                <small class="form-help">Working days available per month</small>
                            </div>
                            <div class="form-group">
                                <label for="member-status">Status</label>
                                <select id="member-status" name="status">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                        <button type="submit" class="btn btn-primary" form="team-member-form">Save Team Member</button>
                    </div>
                </div>
            </div>
        `;

        // Setup event listeners
        this.setupEventListeners();
        
        // Initial display
        this.refreshTeamsDisplay();
    }

    /**
     * Switch between global and project scope
     */
    switchScope(scope) {
        if (scope === this.currentScope) return;

        this.currentScope = scope;
        this.selectedTeam = null;

        // Update active tab
        document.querySelectorAll('.teams-scope-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.scope === scope);
        });

        this.refreshTeamsDisplay();
    }

    /**
     * Get current teams based on scope
     */
    getCurrentTeams() {
        try {
            if (!this.configManager) {
                console.log('No configManager available');
                return [];
            }

            if (this.currentScope === 'global') {
                return this.configManager.globalConfig?.teams || [];
            } else {
                // Project scope
                const currentProject = this.app?.currentProject;
                if (!currentProject) {
                    console.log('No current project available');
                    return [];
                }
                
                const projectConfig = this.configManager.getProjectConfig(currentProject.config);
                const projectOverrides = projectConfig.projectOverrides || {};
                return projectOverrides.teams || [];
            }
        } catch (error) {
            console.error('Failed to get current teams:', error);
            return [];
        }
    }

    /**
     * Refresh teams display
     */
    refreshTeamsDisplay() {
        this.renderTeamsList();
        this.renderTeamDetails();
        this.updateTeamsCounts();
    }

    /**
     * Update teams counts in scope tabs
     */
    updateTeamsCounts() {
        try {
            if (!this.configManager) {
                console.log('No configManager available for counts');
                return;
            }

            const globalTeams = this.configManager.globalConfig?.teams || [];
            
            let projectTeams = [];
            const currentProject = this.app?.currentProject;
            if (currentProject) {
                const projectConfig = this.configManager.getProjectConfig(currentProject.config);
                const projectOverrides = projectConfig.projectOverrides || {};
                projectTeams = projectOverrides.teams || [];
            }

            const globalCount = document.getElementById('global-teams-count');
            const projectCount = document.getElementById('project-teams-count');

            if (globalCount) globalCount.textContent = globalTeams.length;
            if (projectCount) projectCount.textContent = projectTeams.length;
        } catch (error) {
            console.error('Failed to update teams counts:', error);
        }
    }

    /**
     * Render teams list (Master Panel)
     */
    renderTeamsList() {
        const container = document.getElementById('teams-list');
        if (!container) return;

        const teams = this.getCurrentTeams();

        if (teams.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No teams configured</p>
                    <small>Create your first team to get started</small>
                </div>
            `;
            return;
        }

        container.innerHTML = teams.map(team => {
            const memberCount = team.members ? team.members.length : 0;
            const isSelected = this.selectedTeam && this.selectedTeam.id === team.id;

            return `
                <div class="team-item ${isSelected ? 'selected' : ''}" data-team-id="${team.id}">
                    <div class="team-item-header">
                        <h4 class="team-name">${this.escapeHtml(team.name)}</h4>
                        <div class="team-actions">
                            <button class="btn btn-small btn-secondary" 
                                    data-action="edit-team" 
                                    data-team-id="${team.id}" title="Edit Team">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-small btn-secondary" 
                                    data-action="duplicate-team" 
                                    data-team-id="${team.id}" title="Duplicate Team">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn btn-small btn-danger" 
                                    data-action="delete-team" 
                                    data-team-id="${team.id}" title="Delete Team">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="team-item-info">
                        <p class="team-description">${this.escapeHtml(team.description || '')}</p>
                        <div class="team-stats">
                            <span class="team-member-count">
                                <i class="fas fa-user"></i> ${memberCount} member${memberCount !== 1 ? 's' : ''}
                            </span>
                            <span class="team-status status-${team.status}">
                                ${team.status}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Select a team and show its details
     */
    selectTeam(teamId) {
        const teams = this.getCurrentTeams();
        this.selectedTeam = teams.find(t => t.id === teamId) || null;

        // Update visual selection
        document.querySelectorAll('.team-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.teamId === teamId);
        });

        this.renderTeamDetails();
    }

    /**
     * Render team details and members (Detail Panel)
     */
    renderTeamDetails() {
        const container = document.getElementById('team-details-section');
        if (!container) return;

        if (!this.selectedTeam) {
            container.innerHTML = `
                <div class="no-selection-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Select a team to view and manage its members</p>
                </div>
            `;
            return;
        }

        const members = this.selectedTeam.members || [];

        container.innerHTML = `
            <div class="team-detail-header">
                <div class="team-detail-info">
                    <h3>${this.escapeHtml(this.selectedTeam.name)}</h3>
                    <p>${this.escapeHtml(this.selectedTeam.description || '')}</p>
                </div>
                <button class="btn btn-small btn-primary" data-action="add-team-member">
                    <i class="fas fa-plus"></i> Add Team Member
                </button>
            </div>

            <div class="team-members-section">
                <h4>Team Members (${members.length})</h4>
                
                ${members.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-user-plus"></i>
                        <p>No team members assigned</p>
                        <small>Add team members to this team</small>
                    </div>
                ` : `
                    <div class="team-members-table">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Vendor</th>
                                    <th>Capacity</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${members.map(member => {
                                    const vendorName = this.getVendorDisplayName(member.vendorId, member.vendorType);
                                    return `
                                        <tr>
                                            <td class="member-name">
                                                <div class="member-info">
                                                    <strong>${this.escapeHtml(member.firstName)} ${this.escapeHtml(member.lastName)}</strong>
                                                    ${member.email ? `<br><small>${this.escapeHtml(member.email)}</small>` : ''}
                                                </div>
                                            </td>
                                            <td class="member-role">${this.escapeHtml(member.role)}</td>
                                            <td class="member-vendor">
                                                <span class="vendor-badge vendor-${member.vendorType}">
                                                    ${vendorName}
                                                </span>
                                            </td>
                                            <td class="member-capacity">
                                                <span class="capacity-value">${member.monthlyCapacity} days/month</span>
                                            </td>
                                            <td class="member-status">
                                                <span class="status-badge status-${member.status}">${member.status}</span>
                                            </td>
                                            <td class="member-actions">
                                                <button class="btn btn-small btn-secondary" 
                                                        data-action="edit-team-member" 
                                                        data-team-member-id="${member.id}" title="Edit">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-small btn-secondary" 
                                                        data-action="duplicate-team-member" 
                                                        data-team-member-id="${member.id}" title="Duplicate">
                                                    <i class="fas fa-copy"></i>
                                                </button>
                                                <button class="btn btn-small btn-danger" 
                                                        data-action="delete-team-member" 
                                                        data-team-member-id="${member.id}" title="Delete">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Get vendor display name by ID and type
     */
    getVendorDisplayName(vendorId, vendorType) {
        try {
            if (!this.configManager || !this.configManager.globalConfig) {
                return 'Unknown Vendor';
            }

            if (vendorType === 'internal') {
                const internalResources = this.configManager.globalConfig.internalResources || [];
                const resource = internalResources.find(r => r.id === vendorId);
                return resource ? resource.name : 'Unknown Internal Resource';
            } else if (vendorType === 'supplier') {
                const suppliers = this.configManager.globalConfig.suppliers || [];
                const supplier = suppliers.find(s => s.id === vendorId);
                return supplier ? supplier.name : 'Unknown Supplier';
            }
            return 'Unknown Vendor';
        } catch (error) {
            console.error('Failed to get vendor display name:', error);
            return 'Unknown Vendor';
        }
    }

    // Modal and form handling methods
    showAddTeamModal() {
        const modal = document.getElementById('team-modal');
        const title = document.getElementById('team-modal-title');
        const form = document.getElementById('team-form');

        if (modal && title && form) {
            title.textContent = 'Add Team';
            form.reset();
            form.dataset.mode = 'add';
            modal.classList.add('show');
        }
    }

    editTeam(teamId) {
        const teams = this.getCurrentTeams();
        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        const modal = document.getElementById('team-modal');
        const title = document.getElementById('team-modal-title');
        const form = document.getElementById('team-form');

        if (modal && title && form) {
            title.textContent = 'Edit Team';
            
            // Populate form
            document.getElementById('team-name').value = team.name || '';
            document.getElementById('team-description').value = team.description || '';
            document.getElementById('team-status').value = team.status || 'active';
            
            form.dataset.mode = 'edit';
            form.dataset.teamId = teamId;
            modal.classList.add('show');
        }
    }

    duplicateTeam(teamId) {
        const teams = this.getCurrentTeams();
        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        // Create duplicate with new ID
        const duplicate = {
            ...team,
            id: this.generateId(),
            name: `${team.name} (Copy)`,
            created: new Date().toISOString(),
            members: team.members ? team.members.map(member => ({
                ...member,
                id: this.generateId()
            })) : []
        };

        this.addTeamToCurrentScope(duplicate);
        this.refreshTeamsDisplay();
        this.showNotification('Team duplicated successfully', 'success');
    }

    async deleteTeam(teamId) {
        if (!confirm('Are you sure you want to delete this team and all its members? This action cannot be undone.')) {
            return;
        }

        try {
            await this.removeTeamFromCurrentScope(teamId);
            
            // Clear selection if deleted team was selected
            if (this.selectedTeam && this.selectedTeam.id === teamId) {
                this.selectedTeam = null;
            }

            this.refreshTeamsDisplay();
            this.showNotification('Team deleted successfully', 'success');
        } catch (error) {
            console.error('Failed to delete team:', error);
            this.showNotification('Failed to delete team', 'error');
        }
    }

    showAddTeamMemberModal() {
        if (!this.selectedTeam) return;

        const modal = document.getElementById('team-member-modal');
        const title = document.getElementById('team-member-modal-title');
        const form = document.getElementById('team-member-form');

        if (modal && title && form) {
            title.textContent = 'Add Team Member';
            form.reset();
            form.dataset.mode = 'add';
            
            // Populate vendor dropdowns
            this.populateVendorDropdowns();
            
            modal.classList.add('show');
        }
    }

    editTeamMember(memberId) {
        if (!this.selectedTeam) return;

        const member = this.selectedTeam.members.find(m => m.id === memberId);
        if (!member) return;

        const modal = document.getElementById('team-member-modal');
        const title = document.getElementById('team-member-modal-title');
        const form = document.getElementById('team-member-form');

        if (modal && title && form) {
            title.textContent = 'Edit Team Member';
            
            // Populate form
            document.getElementById('member-first-name').value = member.firstName || '';
            document.getElementById('member-last-name').value = member.lastName || '';
            document.getElementById('member-email').value = member.email || '';
            document.getElementById('member-role').value = member.role || '';
            document.getElementById('member-vendor-type').value = member.vendorType || '';
            document.getElementById('member-monthly-capacity').value = member.monthlyCapacity || 22;
            document.getElementById('member-status').value = member.status || 'active';
            
            // Populate vendor dropdowns and set selection
            this.populateVendorDropdowns(member.vendorType);
            document.getElementById('member-vendor').value = member.vendorId || '';
            
            form.dataset.mode = 'edit';
            form.dataset.memberId = memberId;
            modal.classList.add('show');
        }
    }

    duplicateTeamMember(memberId) {
        if (!this.selectedTeam) return;

        const member = this.selectedTeam.members.find(m => m.id === memberId);
        if (!member) return;

        // Create duplicate with new ID
        const duplicate = {
            ...member,
            id: this.generateId(),
            firstName: `${member.firstName} (Copy)`,
            joinDate: new Date().toISOString()
        };

        this.selectedTeam.members.push(duplicate);
        this.saveCurrentConfiguration();
        this.refreshTeamsDisplay();
        this.showNotification('Team member duplicated successfully', 'success');
    }

    async deleteTeamMember(memberId) {
        if (!this.selectedTeam) return;

        if (!confirm('Are you sure you want to remove this team member? This action cannot be undone.')) {
            return;
        }

        try {
            this.selectedTeam.members = this.selectedTeam.members.filter(m => m.id !== memberId);
            await this.saveCurrentConfiguration();
            this.refreshTeamsDisplay();
            this.showNotification('Team member removed successfully', 'success');
        } catch (error) {
            console.error('Failed to delete team member:', error);
            this.showNotification('Failed to remove team member', 'error');
        }
    }

    async resetToDefaultTeams() {
        if (!confirm('Are you sure you want to reset to default teams? This will remove all custom teams and cannot be undone.')) {
            return;
        }

        try {
            const globalConfig = this.configManager.getGlobalConfig();
            globalConfig.teams = this.createFallbackTeams();
            await this.configManager.saveGlobalConfig();
            
            this.selectedTeam = null;
            this.refreshTeamsDisplay();
            this.showNotification('Teams reset to default successfully', 'success');
        } catch (error) {
            console.error('Failed to reset teams:', error);
            this.showNotification('Failed to reset teams', 'error');
        }
    }

    async saveTeamForm() {
        const form = document.getElementById('team-form');
        if (!form) return;

        const formData = new FormData(form);
        const mode = form.dataset.mode;
        const teamId = form.dataset.teamId;

        const teamData = {
            name: formData.get('name').trim(),
            description: formData.get('description').trim(),
            status: formData.get('status')
        };

        // Validation
        if (!teamData.name) {
            this.showNotification('Team name is required', 'error');
            return;
        }

        try {
            if (mode === 'add') {
                // Add new team
                const newTeam = {
                    id: this.generateId(),
                    ...teamData,
                    isGlobal: this.currentScope === 'global',
                    created: new Date().toISOString(),
                    members: []
                };

                await this.addTeamToCurrentScope(newTeam);
                this.showNotification('Team added successfully', 'success');
            } else if (mode === 'edit') {
                // Update existing team
                await this.updateTeamInCurrentScope(teamId, teamData);
                this.showNotification('Team updated successfully', 'success');
            }

            this.closeModal();
            this.refreshTeamsDisplay();
        } catch (error) {
            console.error('Failed to save team:', error);
            this.showNotification('Failed to save team', 'error');
        }
    }

    async saveTeamMemberForm() {
        const form = document.getElementById('team-member-form');
        if (!form || !this.selectedTeam) return;

        const formData = new FormData(form);
        const mode = form.dataset.mode;
        const memberId = form.dataset.memberId;

        const memberData = {
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            email: formData.get('email').trim(),
            role: formData.get('role').trim(),
            vendorType: formData.get('vendorType'),
            vendorId: formData.get('vendorId'),
            monthlyCapacity: parseInt(formData.get('monthlyCapacity')) || 22,
            status: formData.get('status')
        };

        // Validation
        if (!memberData.firstName || !memberData.lastName) {
            this.showNotification('First name and last name are required', 'error');
            return;
        }

        if (!memberData.role) {
            this.showNotification('Role is required', 'error');
            return;
        }

        if (!memberData.vendorType || !memberData.vendorId) {
            this.showNotification('Vendor selection is required', 'error');
            return;
        }

        try {
            if (mode === 'add') {
                // Add new team member
                const newMember = {
                    id: this.generateId(),
                    ...memberData,
                    joinDate: new Date().toISOString()
                };

                this.selectedTeam.members = this.selectedTeam.members || [];
                this.selectedTeam.members.push(newMember);
                this.showNotification('Team member added successfully', 'success');
            } else if (mode === 'edit') {
                // Update existing team member
                const memberIndex = this.selectedTeam.members.findIndex(m => m.id === memberId);
                if (memberIndex !== -1) {
                    this.selectedTeam.members[memberIndex] = {
                        ...this.selectedTeam.members[memberIndex],
                        ...memberData
                    };
                    this.showNotification('Team member updated successfully', 'success');
                }
            }

            await this.saveCurrentConfiguration();
            this.closeModal();
            this.refreshTeamsDisplay();
        } catch (error) {
            console.error('Failed to save team member:', error);
            this.showNotification('Failed to save team member', 'error');
        }
    }

    /**
     * Populate vendor dropdowns based on vendor type
     */
    populateVendorDropdowns(selectedVendorType = null) {
        const vendorTypeSelect = document.getElementById('member-vendor-type');
        const vendorSelect = document.getElementById('member-vendor');

        if (!vendorTypeSelect || !vendorSelect) return;

        // Handle vendor type change
        const updateVendorOptions = (vendorType) => {
            vendorSelect.innerHTML = '<option value="">Select Vendor</option>';
            
            try {
                if (!this.configManager || !this.configManager.globalConfig) {
                    console.error('ConfigManager not available for vendor options');
                    return;
                }

                if (vendorType === 'internal') {
                    const internalResources = this.configManager.globalConfig.internalResources || [];
                    internalResources.forEach(resource => {
                        const option = document.createElement('option');
                        option.value = resource.id;
                        option.textContent = `${resource.name} (${resource.role})`;
                        vendorSelect.appendChild(option);
                    });
                } else if (vendorType === 'supplier') {
                    const suppliers = this.configManager.globalConfig.suppliers || [];
                    suppliers.forEach(supplier => {
                        const option = document.createElement('option');
                        option.value = supplier.id;
                        option.textContent = `${supplier.name} (${supplier.role})`;
                        vendorSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Failed to populate vendor options:', error);
            }
        };

        // Set up event listener for vendor type changes
        vendorTypeSelect.addEventListener('change', (e) => {
            updateVendorOptions(e.target.value);
        });

        // Initial population if vendor type is already selected
        if (selectedVendorType) {
            updateVendorOptions(selectedVendorType);
        } else if (vendorTypeSelect.value) {
            updateVendorOptions(vendorTypeSelect.value);
        }
    }

    /**
     * Add team to current scope
     */
    async addTeamToCurrentScope(team) {
        if (this.currentScope === 'global') {
            const globalConfig = this.configManager.getGlobalConfig();
            globalConfig.teams = globalConfig.teams || [];
            globalConfig.teams.push(team);
            await this.configManager.saveGlobalConfig();
        } else {
            const projectConfig = this.configManager.getProjectConfig();
            projectConfig.projectOverrides = projectConfig.projectOverrides || {};
            projectConfig.projectOverrides.teams = projectConfig.projectOverrides.teams || [];
            projectConfig.projectOverrides.teams.push(team);
            await this.saveCurrentConfiguration();
        }
    }

    /**
     * Update team in current scope
     */
    async updateTeamInCurrentScope(teamId, updates) {
        const teams = this.getCurrentTeams();
        const teamIndex = teams.findIndex(t => t.id === teamId);
        
        if (teamIndex !== -1) {
            teams[teamIndex] = { ...teams[teamIndex], ...updates };
            
            // Update selected team if it's the one being edited
            if (this.selectedTeam && this.selectedTeam.id === teamId) {
                this.selectedTeam = teams[teamIndex];
            }
            
            await this.saveCurrentConfiguration();
        }
    }

    /**
     * Remove team from current scope
     */
    async removeTeamFromCurrentScope(teamId) {
        if (this.currentScope === 'global') {
            const globalConfig = this.configManager.getGlobalConfig();
            globalConfig.teams = (globalConfig.teams || []).filter(t => t.id !== teamId);
            await this.configManager.saveGlobalConfig();
        } else {
            const projectConfig = this.configManager.getProjectConfig();
            projectConfig.projectOverrides = projectConfig.projectOverrides || {};
            projectConfig.projectOverrides.teams = (projectConfig.projectOverrides.teams || []).filter(t => t.id !== teamId);
            await this.saveCurrentConfiguration();
        }
    }

    /**
     * Save current configuration
     */
    async saveCurrentConfiguration() {
        try {
            if (this.currentScope === 'global') {
                await this.configManager.saveGlobalConfig();
            } else {
                // For project scope, we need to save through the app
                this.app.markDirty();
            }
        } catch (error) {
            console.error('Failed to save configuration:', error);
            throw error;
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Close modal
     */
    closeModal() {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        if (window.NotificationManager) {
            NotificationManager.show(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Cleanup when destroying the manager
     */
    destroy() {
        // Clean up event listeners and references
        this.selectedTeam = null;
        console.log('TeamsConfigManager destroyed');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.TeamsConfigManager = TeamsConfigManager;
}