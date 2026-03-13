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
        this.editingTeam = null;
        this.editingTeamMember = null;
        
        // Flags to prevent double operations - same as Categories
        this.isDeletingTeam = false;
        this.isDeletingTeamMember = false;
        this.isSavingTeam = false;
        this.isSavingTeamMember = false;
        this.isResetting = false;

        // Default configuration manager for loading teams from defaults.json
        this.defaultConfigManager = new DefaultConfigManager();
        
        // Default teams will be loaded from configuration
        this.defaultTeams = [];

        // Initialize with default teams if needed
        this.init();
    }

    /**
     * Initialize the manager
     */
    init() {
        // Delay initialization to ensure ConfigurationManager is ready
        setTimeout(() => {
            this.ensureDefaultTeams();
        }, 100);
    }

    /**
     * Load default configurations
     */
    async loadDefaults() {
        try {
            this.defaultTeams = await this.defaultConfigManager.getDefaultTeams();
            console.log('Default teams loaded:', this.defaultTeams.length);
        } catch (error) {
            console.warn('Failed to load default teams, using empty array:', error);
            this.defaultTeams = [];
        }
    }

    /**
     * Ensure default teams exist
     */
    async ensureDefaultTeams() {
        try {
            if (!this.configManager || !this.configManager.globalConfig) {
                console.log('ConfigManager or globalConfig not available');
                return;
            }
            
            const globalConfig = this.configManager.globalConfig;
            
            if (!globalConfig.teams || globalConfig.teams.length === 0) {
                console.log('No teams found, loading default teams from configuration');
                // Load default teams from configuration file
                await this.loadDefaults();
                if (this.defaultTeams.length > 0) {
                    globalConfig.teams = JSON.parse(JSON.stringify(this.defaultTeams)); // Deep copy
                } else {
                    // Fallback to hardcoded teams if no default teams available
                    globalConfig.teams = this.createFallbackTeams();
                }
                this.configManager.saveGlobalConfig();
                console.log('Default teams initialized successfully');
            } else {
                console.log('Teams already exist, skipping initialization');
                // 🏪 Ensure existing teams are in state store even if skipping initialization
                if (window.appStore && globalConfig) {
                    window.appStore.getState().setGlobalConfig(globalConfig);
                    console.log('✅ Existing teams config synchronized with state store');
                }
            }
        } catch (error) {
            console.error('Failed to ensure default teams:', error);
        }
    }

    /**
     * Create fallback teams with default team members
     */
    createFallbackTeams() {
        return [];
    }

    /**
     * Set up event listeners for the teams page - same pattern as Categories
     */
    setupEventListeners() {
        // Remove existing listeners first to prevent duplicates
        if (this.boundClickHandler) {
            document.removeEventListener('click', this.boundClickHandler);
        }
        if (this.boundSubmitHandler) {
            document.removeEventListener('submit', this.boundSubmitHandler);
        }

        // Create bound handlers
        this.boundClickHandler = this.handleClick.bind(this);
        this.boundSubmitHandler = this.handleSubmit.bind(this);

        // Add global event listener for modals (since they are position:fixed)
        // Container-specific listeners will be added when container is rendered
        document.addEventListener('click', this.boundClickHandler);
        document.addEventListener('submit', this.boundSubmitHandler);
    }

    /**
     * Handle click events
     */
    handleClick(e) {
        // Modal close buttons - global handler for teams modals only
        if (e.target.closest('.modal-close')) {
            const modalElement = e.target.closest('.modal');
            // Only handle teams modals
            if (modalElement && (modalElement.id === 'team-modal' || modalElement.id === 'team-member-modal')) {
                console.log('Teams modal close button clicked:', modalElement.id);
                e.preventDefault();
                e.stopPropagation();
                this.closeModal(modalElement.id);
                return;
            }
        }

        // Only handle clicks within teams config container for non-modal events
        if (!e.target.closest('.teams-config-container')) return;
        
        // Log only clicks that will be processed (after filtering)
        console.log('Teams handleClick processing:', e.target);

        // Handle scope tab switching - only global scope is supported
        if (e.target.classList.contains('teams-scope-tab')) {
            const scope = e.target.dataset.scope;
            if (scope === 'global') {
                this.switchScope(scope);
            }
            e.preventDefault();
            return;
        }

        // Team selection (but not if clicking on action buttons) - same as Categories
        if (e.target.closest('.team-item') && !e.target.closest('.team-actions')) {
            e.preventDefault();
            e.stopPropagation();
            const teamId = e.target.closest('.team-item').dataset.teamId;
            this.selectTeam(teamId);
            return;
        }
        
        // Action buttons - check both target and closest button for action - same as Categories
        const actionButton = e.target.closest('[data-action]');
        console.log('Action button found:', !!actionButton, actionButton?.dataset?.action);
        if (!actionButton) return;
        
        const action = actionButton.dataset.action;
        if (!action) return;

        // Prevent double execution - same as Categories
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        console.log(`TEAMS Action triggered: ${action}`);

        switch (action) {
            case 'add-team':
                this.showAddTeamModal();
                break;
            case 'edit-team':
                this.editTeam(actionButton.dataset.teamId);
                break;
            case 'duplicate-team':
                this.duplicateTeam(actionButton.dataset.teamId);
                break;
            case 'delete-team':
                console.log(`Delete team called for: ${actionButton.dataset.teamId}`);
                this.deleteTeam(actionButton.dataset.teamId);
                break;
            case 'add-team-member':
                this.showAddTeamMemberModal();
                break;
            case 'edit-team-member':
                this.editTeamMember(actionButton.dataset.teamMemberId);
                break;
            case 'duplicate-team-member':
                this.duplicateTeamMember(actionButton.dataset.teamMemberId);
                break;
            case 'delete-team-member':
                console.log(`Delete team member called for: ${actionButton.dataset.teamMemberId}`);
                this.deleteTeamMember(actionButton.dataset.teamMemberId);
                break;
            case 'reset-to-default':
                this.resetToDefaultTeams();
                break;
        }
    }

    /**
     * Handle form submission - same pattern as Categories
     */
    handleSubmit(e) {
        console.log('Teams form submitted:', e.target.id);
        
        if (e.target.id === 'team-form') {
            e.preventDefault();
            e.stopImmediatePropagation();
            // Additional check to prevent double execution
            if (!this.isSavingTeam) {
                this.saveTeamForm();
            } else {
                console.log('Team form submission ignored - save in progress');
            }
        } else if (e.target.id === 'team-member-form') {
            e.preventDefault();
            e.stopImmediatePropagation();
            // Additional check to prevent double execution
            if (!this.isSavingTeamMember) {
                this.saveTeamMemberForm();
            } else {
                console.log('Team member form submission ignored - save in progress');
            }
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
                                <label for="member-user-id">User ID *</label>
                                <input type="text" id="member-user-id" name="user-id" class="validation-tooltip required" required maxlength="255" placeholder="Unique identifier (auto-generated if empty)">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="member-vendor-type">Vendor Type *</label>
                                    <select id="member-vendor-type" name="vendorType" class="validation-tooltip required" required>
                                        <option value="">Select Vendor Type</option>
                                        <option value="Internal">Internal Vendor</option>
                                        <option value="External">External Vendor</option>
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
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="member-job-cluster">Job Cluster *</label>
                                    <select id="member-job-cluster" name="jobCluster" class="validation-tooltip required" required>
                                        <option value="">Select Job Cluster</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="member-seniority">Seniority *</label>
                                    <select id="member-seniority" name="seniority" class="validation-tooltip required" required>
                                        <option value="">Select Seniority</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="member-location">Location *</label>
                                    <select id="member-location" name="location" class="validation-tooltip required" required>
                                        <option value="">Select Location</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="member-delivery-model">Delivery Model *</label>
                                    <select id="member-delivery-model" name="deliveryModel" class="validation-tooltip required" required>
                                        <option value="">Select Delivery Model</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="member-monthly-capacity">Monthly Capacity (Days) *</label>
                                <input type="number" id="member-monthly-capacity" name="monthlyCapacity" 
                                       min="1" max="31" class="validation-tooltip required" required value="22">
                                <small class="form-help">Working days available per month</small>
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
        
        // Add event listeners to the teams container
        const teamsContainer = container.querySelector('.teams-config-container');
        if (teamsContainer) {
            teamsContainer.addEventListener('click', this.boundClickHandler);
            teamsContainer.addEventListener('submit', this.boundSubmitHandler);
            console.log('Teams event listeners attached to container');
        }
        
        // Initial display
        this.refreshTeamsDisplay();
    }

    /**
     * Switch scope - now only global is supported
     */
    switchScope(scope) {
        // Only global scope is supported now
        if (scope !== 'global') return;
        
        this.currentScope = 'global';
        this.selectedTeam = null;

        // Ensure global tab is always active
        document.querySelectorAll('.teams-scope-tab').forEach(tab => {
            tab.classList.toggle('active', true);
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

            // Only return global teams since project scope is removed
            return this.configManager.globalConfig?.teams || [];
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
            const currentProject = StateSelectors.getCurrentProject();
            if (currentProject) {
                const projectConfig = this.configManager.getProjectConfig(currentProject.config);
                const projectOverrides = projectConfig.projectOverrides || {};
                projectTeams = projectOverrides.teams || [];
            }

            const globalCount = document.getElementById('global-teams-count');

            if (globalCount) globalCount.textContent = globalTeams.length;
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
                                    <th>User ID</th>
                                    <th>Role</th>
                                    <th>Vendor</th>
                                    <th>Capacity</th>
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
                                                </div>
                                            </td>
                                            <td class="member-user-id">
                                                <span class="user-id-value" title="${this.escapeHtml(member['user-id'] || '')}">${this.escapeHtml(member['user-id'] || '')}</span>
                                            </td>
                                            <td class="member-role">${this.escapeHtml(member.seniority || '')} ${this.escapeHtml(member.jobCluster || '')}</td>
                                            <td class="member-vendor">
                                                <span class="vendor-badge vendor-${member.vendorType}">
                                                    ${vendorName}
                                                </span>
                                            </td>
                                            <td class="member-capacity">
                                                <span class="capacity-value">${member.monthlyCapacity} days/month</span>
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
            const vendors = this.configManager.globalConfig.vendors || [];
            const vendor = vendors.find(v => v.id === vendorId);
            return vendor ? vendor.name : 'Unknown Vendor';
        } catch (error) {
            console.error('Failed to get vendor display name:', error);
            return 'Unknown Vendor';
        }
    }

    // Modal and form handling methods
    showAddTeamModal() {
        this.editingTeam = null;
        document.getElementById('team-modal-title').textContent = 'Add Team';
        document.getElementById('team-form').reset();
        document.getElementById('team-modal').classList.add('active');
    }

    editTeam(teamId) {
        const teams = this.getCurrentTeams();
        this.editingTeam = teams.find(t => t.id === teamId);
        if (!this.editingTeam) return;

        document.getElementById('team-modal-title').textContent = 'Edit Team';
        
        // Populate form
        document.getElementById('team-name').value = this.editingTeam.name || '';
        document.getElementById('team-description').value = this.editingTeam.description || '';
        
        document.getElementById('team-modal').classList.add('active');
    }

    async duplicateTeam(teamId) {
        const teams = this.getCurrentTeams();
        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        try {
            // Create duplicate with new ID
            const duplicate = {
                ...team,
                id: this.generateId('team-'),
                name: `${team.name} (Copy)`,
                created: new Date().toISOString(),
                members: team.members ? team.members.map(member => ({
                    ...member,
                    id: this.generateId('member-')
                })) : []
            };

            teams.push(duplicate);
            await this.saveCurrentConfiguration();
            this.refreshTeamsDisplay();
            this.showNotification('Team duplicated successfully', 'success');
        } catch (error) {
            console.error('Failed to duplicate team:', error);
            this.showNotification('Failed to duplicate team', 'error');
        }
    }

    async deleteTeam(teamId) {
        // Prevent double execution - same as Categories
        if (this.isDeletingTeam) {
            console.log('Team delete already in progress, ignoring...');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this team and all its members? This action cannot be undone.')) {
            return;
        }

        this.isDeletingTeam = true;
        
        try {
            const teams = this.getCurrentTeams();
            const teamIndex = teams.findIndex(t => t.id === teamId);
            
            if (teamIndex !== -1) {
                teams.splice(teamIndex, 1);
                
                // Clear selection if deleted team was selected
                if (this.selectedTeam && this.selectedTeam.id === teamId) {
                    this.selectedTeam = null;
                }
                
                await this.saveCurrentConfiguration();
                this.refreshTeamsDisplay();
                this.showNotification('Team deleted successfully', 'success');
            }
        } catch (error) {
            console.error('Failed to delete team:', error);
            this.showNotification('Failed to delete team', 'error');
        } finally {
            this.isDeletingTeam = false;
        }
    }

    showAddTeamMemberModal() {
        if (!this.selectedTeam) return;

        this.editingTeamMember = null;
        document.getElementById('team-member-modal-title').textContent = 'Add Team Member';
        document.getElementById('team-member-form').reset();
        
        // Populate vendor dropdowns
        this.populateVendorDropdowns();
        // Populate rate matrix dropdowns
        this.populateRateDropdowns();
        
        document.getElementById('team-member-modal').classList.add('active');
    }

    editTeamMember(memberId) {
        if (!this.selectedTeam) return;

        this.editingTeamMember = this.selectedTeam.members.find(m => m.id === memberId);
        if (!this.editingTeamMember) return;

        document.getElementById('team-member-modal-title').textContent = 'Edit Team Member';
        
        // Populate form
        document.getElementById('member-first-name').value = this.editingTeamMember.firstName || '';
        document.getElementById('member-last-name').value = this.editingTeamMember.lastName || '';
        document.getElementById('member-email').value = this.editingTeamMember.email || '';
        document.getElementById('member-user-id').value = this.editingTeamMember['user-id'] || '';
        document.getElementById('member-vendor-type').value = this.editingTeamMember.vendorType || '';
        document.getElementById('member-monthly-capacity').value = this.editingTeamMember.monthlyCapacity || 22;
        
        // Populate vendor dropdowns and set selection
        this.populateVendorDropdowns(this.editingTeamMember.vendorType);
        document.getElementById('member-vendor').value = this.editingTeamMember.vendorId || '';

        // Populate rate dropdowns and set selections
        this.populateRateDropdowns(this.editingTeamMember);
        
        document.getElementById('team-member-modal').classList.add('active');
    }

    async duplicateTeamMember(memberId) {
        if (!this.selectedTeam) return;

        const member = this.selectedTeam.members.find(m => m.id === memberId);
        if (!member) return;

        try {
            // Create duplicate with new ID
            const duplicate = {
                ...member,
                id: this.generateId('member-'),
                firstName: `${member.firstName} (Copy)`,
                joinDate: new Date().toISOString()
            };

            this.selectedTeam.members.push(duplicate);
            await this.saveCurrentConfiguration();
            this.refreshTeamsDisplay();
            this.showNotification('Team member duplicated successfully', 'success');
        } catch (error) {
            console.error('Failed to duplicate team member:', error);
            this.showNotification('Failed to duplicate team member', 'error');
        }
    }

    async deleteTeamMember(memberId) {
        if (!this.selectedTeam) return;

        // Prevent double execution - same as Categories
        if (this.isDeletingTeamMember) {
            console.log('Team member delete already in progress, ignoring...');
            return;
        }

        if (!confirm('Are you sure you want to remove this team member? This action cannot be undone.')) {
            return;
        }

        this.isDeletingTeamMember = true;
        
        try {
            this.selectedTeam.members = this.selectedTeam.members.filter(m => m.id !== memberId);
            await this.saveCurrentConfiguration();
            this.refreshTeamsDisplay();
            this.showNotification('Team member removed successfully', 'success');
        } catch (error) {
            console.error('Failed to delete team member:', error);
            this.showNotification('Failed to remove team member', 'error');
        } finally {
            this.isDeletingTeamMember = false;
        }
    }

    async resetToDefaultTeams() {
        // Prevent double execution - same as Categories
        if (this.isResetting) {
            console.log('Reset already in progress, ignoring...');
            return;
        }
        
        if (!confirm('Are you sure you want to reset to default teams? This will remove all custom teams and cannot be undone.')) {
            return;
        }

        this.isResetting = true;
        
        try {
            if (this.currentScope === 'global') {
                // Load default teams from configuration file
                await this.loadDefaults();
                if (this.defaultTeams.length > 0) {
                    this.configManager.globalConfig.teams = JSON.parse(JSON.stringify(this.defaultTeams)); // Deep copy
                } else {
                    // Fallback to hardcoded teams if no default teams available
                    this.configManager.globalConfig.teams = this.createFallbackTeams();
                }
            } else {
                // Reset project teams
                const currentProject = StateSelectors.getCurrentProject();
                if (currentProject) {
                    const projectConfig = this.configManager.getProjectConfig(currentProject.config);
                    projectConfig.projectOverrides = projectConfig.projectOverrides || {};
                    projectConfig.projectOverrides.teams = [];
                }
            }
            
            await this.saveCurrentConfiguration();
            this.selectedTeam = null;
            this.refreshTeamsDisplay();
            this.showNotification('Teams reset to default successfully', 'success');
        } catch (error) {
            console.error('Failed to reset teams:', error);
            this.showNotification('Failed to reset teams', 'error');
        } finally {
            this.isResetting = false;
        }
    }

    async saveTeamForm() {
        // Prevent multiple simultaneous save operations - same as Categories
        if (this.isSavingTeam) {
            console.log('Team save already in progress, ignoring...');
            return;
        }
        
        this.isSavingTeam = true;
        
        // Disable submit button to prevent double clicks
        const submitButton = document.querySelector('#team-modal button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
        }
        
        try {
            const formData = {
                name: document.getElementById('team-name').value.trim(),
                description: document.getElementById('team-description').value.trim(),
                status: 'active' // Default status since field is removed
            };

            // Validation
            if (!formData.name) {
                this.showNotification('Team name is required', 'error');
                return;
            }

            console.log('Saving team:', formData.name, 'Edit mode:', !!this.editingTeam);

            const teams = this.getCurrentTeams();

            if (this.editingTeam) {
                // Update existing team
                Object.assign(this.editingTeam, formData);
                console.log('Updated existing team');
            } else {
                // Create new team
                const newTeam = {
                    id: this.generateId('team-'),
                    ...formData,
                    members: [],
                    isGlobal: this.currentScope === 'global',
                    created: new Date().toISOString()
                };
                teams.push(newTeam);
                console.log('Created new team with ID:', newTeam.id);
            }

            await this.saveCurrentConfiguration();
            this.closeModal('team-modal');
            this.refreshTeamsDisplay();
            
            const action = this.editingTeam ? 'updated' : 'created';
            this.showNotification(`Team "${formData.name}" ${action} successfully`, 'success');
        } finally {
            // Always reset the flag and re-enable button
            this.isSavingTeam = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Save Team';
            }
        }
    }

    async saveTeamMemberForm() {
        // Prevent multiple simultaneous save operations - same as Categories
        if (this.isSavingTeamMember) {
            console.log('Team member save already in progress, ignoring...');
            return;
        }
        
        this.isSavingTeamMember = true;
        
        // Disable submit button to prevent double clicks
        const submitButton = document.querySelector('#team-member-modal button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
        }
        
        try {
            if (!this.selectedTeam) return;

            // Get user-id from form or generate if empty
            let userId = document.getElementById('member-user-id').value.trim();
            if (!userId) {
                userId = this.generateUserIdFromUUID();
            }

            const formData = {
                'user-id': userId,
                firstName: document.getElementById('member-first-name').value.trim(),
                lastName: document.getElementById('member-last-name').value.trim(),
                email: document.getElementById('member-email').value.trim(),
                vendorType: document.getElementById('member-vendor-type').value,
                vendorId: document.getElementById('member-vendor').value,
                jobCluster: document.getElementById('member-job-cluster').value,
                seniority: document.getElementById('member-seniority').value,
                location: document.getElementById('member-location').value,
                deliveryModel: document.getElementById('member-delivery-model').value,
                monthlyCapacity: parseInt(document.getElementById('member-monthly-capacity').value) || 22,
                status: 'active' // Default status since field is removed
            };

            // Validation
            if (!formData.firstName || !formData.lastName) {
                this.showNotification('First name and last name are required', 'error');
                return;
            }

            if (!formData.vendorType || !formData.vendorId) {
                this.showNotification('Vendor selection is required', 'error');
                return;
            }

            if (!formData.jobCluster || !formData.seniority || !formData.location || !formData.deliveryModel) {
                this.showNotification('Job Cluster, Seniority, Location, and Delivery Model are all required', 'error');
                return;
            }

            console.log('Saving team member:', `${formData.firstName} ${formData.lastName}`, 'Edit mode:', !!this.editingTeamMember);

            if (this.editingTeamMember) {
                // Update existing team member with form data (including user-id)
                Object.assign(this.editingTeamMember, {
                    'user-id': formData['user-id'],
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    vendorType: formData.vendorType,
                    vendorId: formData.vendorId,
                    jobCluster: formData.jobCluster,
                    seniority: formData.seniority,
                    location: formData.location,
                    deliveryModel: formData.deliveryModel,
                    monthlyCapacity: formData.monthlyCapacity,
                    status: formData.status
                });
                console.log('Updated existing team member');
            } else {
                // Add new team member
                const newMember = {
                    id: this.generateId('member-'),
                    ...formData,
                    joinDate: new Date().toISOString()
                };

                this.selectedTeam.members = this.selectedTeam.members || [];
                this.selectedTeam.members.push(newMember);
                console.log('Created new team member with ID:', newMember.id);
            }

            await this.saveCurrentConfiguration();
            this.closeModal('team-member-modal');
            this.renderTeamDetails(); // Only refresh team details
            this.refreshTeamsDisplay(); // Update counts
            
            const action = this.editingTeamMember ? 'updated' : 'added';
            this.showNotification(`Team member "${formData.firstName} ${formData.lastName}" ${action} successfully`, 'success');
        } finally {
            // Always reset the flag and re-enable button
            this.isSavingTeamMember = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Save Team Member';
            }
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

                const vendors = this.configManager.globalConfig.vendors || [];
                const filteredVendors = vendors.filter(v => v.type.toLowerCase() === vendorType.toLowerCase());

                filteredVendors.forEach(vendor => {
                    const option = document.createElement('option');
                    option.value = vendor.id;
                    option.textContent = `${vendor.name} (${vendor.type})`;
                    vendorSelect.appendChild(option);
                });

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
     * Populate rate-related dropdowns from rateMatrixConfig
     */
    populateRateDropdowns(memberData = null) {
        const { rateMatrixConfig } = this.configManager.globalConfig;
        if (!rateMatrixConfig) {
            console.error('Rate Matrix Configuration not found!');
            return;
        }

        const jobClusterSelect = document.getElementById('member-job-cluster');
        const senioritySelect = document.getElementById('member-seniority');
        const locationSelect = document.getElementById('member-location');
        const deliveryModelSelect = document.getElementById('member-delivery-model');

        // Populate Job Clusters
        jobClusterSelect.innerHTML = '<option value="">Select Job Cluster</option>';
        (rateMatrixConfig.jobClusters || []).forEach(cluster => {
            const option = document.createElement('option');
            option.value = cluster;
            option.textContent = cluster;
            jobClusterSelect.appendChild(option);
        });

        // Populate Seniority
        senioritySelect.innerHTML = '<option value="">Select Seniority</option>';
        (rateMatrixConfig.seniorities || []).forEach(seniority => {
            const option = document.createElement('option');
            option.value = seniority;
            option.textContent = seniority;
            senioritySelect.appendChild(option);
        });

        // Populate Locations
        locationSelect.innerHTML = '<option value="">Select Location</option>';
        (rateMatrixConfig.locations || []).forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            locationSelect.appendChild(option);
        });

        // Handle Location change to update Delivery Models
        const updateDeliveryModels = () => {
            const selectedLocationId = locationSelect.value;
            deliveryModelSelect.innerHTML = '<option value="">Select Delivery Model</option>';
            if (selectedLocationId) {
                const selectedLocation = (rateMatrixConfig.locations || []).find(l => l.id === selectedLocationId);
                if (selectedLocation) {
                    (selectedLocation.deliveryModels || []).forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        deliveryModelSelect.appendChild(option);
                    });
                }
            }
             // If editing, set the delivery model after populating
            if (memberData && memberData.deliveryModel) {
                deliveryModelSelect.value = memberData.deliveryModel;
            }
        };

        locationSelect.removeEventListener('change', updateDeliveryModels); // Prevent duplicates
        locationSelect.addEventListener('change', updateDeliveryModels);

        // If editing, set initial values
        if (memberData) {
            jobClusterSelect.value = memberData.jobCluster || '';
            senioritySelect.value = memberData.seniority || '';
            locationSelect.value = memberData.location || '';
            // Trigger change to populate delivery models and then set the value
            updateDeliveryModels();
        }
    }

    // Removed addTeamToCurrentScope method - not needed with Categories pattern

    // Removed updateTeamInCurrentScope method - not needed with Categories pattern

    // Removed removeTeamFromCurrentScope method - not needed with Categories pattern

    /**
     * Save current configuration - same pattern as Categories
     */
    async saveCurrentConfiguration() {
        if (!this.configManager) return;

        if (this.currentScope === 'global') {
            await this.configManager.saveGlobalConfig();
        } else {
            const currentProject = StateSelectors.getCurrentProject();
            if (currentProject) {
                await this.configManager.saveProjectConfig(currentProject.config);
            }
        }
    }

    /**
     * Generate unique ID - same pattern as Categories
     */
    /**
     * Generate UUID v4 for user ID
     * @returns {string} UUID v4 string
     */
    

    generateId(prefix = 'id-') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
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
     * Close modal - same as Categories
     */
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
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