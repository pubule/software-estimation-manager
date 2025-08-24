/**
 * VersionManager - Handles project versioning, comparison, and restoration
 * Provides comprehensive version history management with diff tracking
 */
class VersionManager {
    constructor(app) {
        this.app = app;
        
        // PURE STATE MANAGER: Connect to store
        this.store = window.appStore;
        this.storeUnsubscribe = null;
        
        this.currentVersions = [];
        this.maxVersions = 50;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        
        // Current state
        this.isLoading = false;
        this.currentFilters = {
            dateRange: '',
            reason: ''
        };
        
        // Bind event handlers once to enable proper cleanup
        this.boundHandlers = {
            createVersion: this.handleCreateVersion.bind(this),
            viewVersion: this.handleViewVersion.bind(this),
            compareVersion: this.handleCompareVersion.bind(this),
            restoreVersion: this.handleRestoreVersion.bind(this),
            exportVersion: this.handleExportVersion.bind(this),
            deleteVersion: this.handleDeleteVersion.bind(this),
            keyboardShortcuts: this.handleKeyboardShortcuts.bind(this)
        };
        
        this.initializeEventListeners();
        
        // PURE STATE MANAGER: Setup store subscription
        this.setupStoreSubscription();
        
        // Load versions from current project if available (using StateSelectors)
        const currentProject = StateSelectors.getCurrentProject();
        if (currentProject) {
            this.loadVersionsFromProject(currentProject);
        }
    }

    /**
     * PURE STATE MANAGER: Setup store subscription for reactive updates
     */
    setupStoreSubscription() {
        if (!this.store) {
            console.warn('Store not available for VersionManager');
            return;
        }

        this.storeUnsubscribe = this.store.subscribe((state, prevState) => {
            // React to project changes
            if (state.currentProject !== prevState.currentProject) {
                this.handleProjectChange(state.currentProject);
            }
        });
    }

    /**
     * PURE STATE MANAGER: Handle project change from store
     */
    handleProjectChange(newProject) {
        console.log('VersionManager: Project changed', !!newProject);
        
        if (newProject) {
            this.loadVersionsFromProject(newProject);
        } else {
            this.currentVersions = [];
            this.render();
        }
    }

    initializeEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', this.boundHandlers.keyboardShortcuts);
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.showCreateVersionModal();
            } else if (e.shiftKey && e.key === 'H') {
                e.preventDefault();
                if (this.app.navigationManager) {
                    this.app.navigationManager.navigateTo('history');
                }
            }
        }
    }

    /**
     * Render the version history page
     */
    render() {
        const container = document.querySelector('.history-content');
        if (!container) return;

        const currentProject = this.app?.currentProject;
        if (!currentProject) {
            container.innerHTML = this.renderNoProjectState();
            return;
        }

        // Trigger calculations update to ensure data is current
        if (this.app.calculationsManager) {
            this.app.calculationsManager.calculateVendorCosts();
            this.app.calculationsManager.calculateKPIs();
        }

        // Initialize versions array if it doesn't exist
        this.ensureVersionsArray(currentProject);
        
        // Load versions from project
        this.loadVersionsFromProject(currentProject);

        container.innerHTML = `
            ${this.renderVersionHistoryHeader()}
            ${this.renderVersionFilters()}
            ${this.renderVersionsTable()}
        `;

        // Attach event listeners after rendering
        setTimeout(() => {
            this.attachEventListeners();
        }, 10);
    }

    /**
     * Render no project state
     */
    renderNoProjectState() {
        return `
            <div class="version-no-project-state">
                <div class="version-no-project-icon">
                    <i class="fas fa-history"></i>
                </div>
                <h3>No Project Loaded</h3>
                <p>Load or create a project to view version history</p>
            </div>
        `;
    }

    /**
     * Render version history header
     */
    renderVersionHistoryHeader() {
        const currentProject = this.app?.currentProject;
        const currentVersion = this.getCurrentVersion();
        const versionsCount = this.currentVersions.length;
        
        return `
            <div class="version-header">
                <div class="version-info">
                    <h3>Version History</h3>
                    <p class="version-subtitle">
                        Live Version: ${currentVersion} | Total Versions: ${versionsCount}
                        ${versionsCount >= this.maxVersions * 0.8 ? 
                            `<span class="version-warning-text">⚠️ Approaching limit (${this.maxVersions})</span>` : ''
                        }
                        ${versionsCount > 0 ? '<br><small>Live version automatically updates when you save changes</small>' : ''}
                    </p>
                </div>
                <div class="version-actions">
                    <button class="btn btn-primary" id="create-version-btn">
                        <i class="fas fa-plus"></i> Create Version
                    </button>
                    <button class="btn btn-secondary" id="import-version-btn">
                        <i class="fas fa-upload"></i> Import Version
                    </button>
                    <button class="btn btn-secondary" id="cleanup-versions-btn" 
                            ${versionsCount < 10 ? 'disabled' : ''}>
                        <i class="fas fa-broom"></i> Cleanup
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render version filters
     */
    renderVersionFilters() {
        return `
            <div class="version-filters">
                <div class="filter-group">
                    <label for="reason-search">Search Reason:</label>
                    <input type="text" id="reason-search" placeholder="Search in reasons...">
                </div>
                <div class="filter-group">
                    <label for="date-range">Date Range:</label>
                    <select id="date-range">
                        <option value="">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                </div>
            </div>
        `;
    }

    /**
     * Render versions table
     */
    renderVersionsTable() {
        const filteredVersions = this.getFilteredVersions();
        const currentVersion = this.getCurrentVersion();
        
        return `
            <div class="version-table-container">
                <table class="data-table version-table">
                    <thead>
                        <tr>
                            <th>Version</th>
                            <th>Date</th>
                            <th>Reason</th>
                            <th>Stats</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredVersions.length === 0 ? `
                            <tr>
                                <td colspan="5" class="no-data">
                                    ${this.currentVersions.length === 0 ? 
                                        'No versions created yet. Create your first version!' :
                                        'No versions match the current filters.'
                                    }
                                </td>
                            </tr>
                        ` : filteredVersions.map(version => `
                            <tr class="version-row ${version.id === currentVersion ? 'current-version' : ''}" 
                                data-version-id="${version.id}">
                                <td>
                                    <span class="version-id">${version.id}</span>
                                    ${version.id === currentVersion ? '<span class="current-badge" title="Live version - automatically updated on save">LIVE</span>' : ''}
                                </td>
                                <td class="version-date">
                                    ${version.id === currentVersion && version.lastUpdated ? 
                                        `<div>${this.formatDate(version.timestamp)}</div><small class="last-updated">Updated: ${this.formatDate(version.lastUpdated)}</small>` :
                                        this.formatDate(version.timestamp)
                                    }
                                </td>
                                <td class="version-reason" title="${version.reason}">${this.truncateText(version.reason, 50)}</td>
                                <td class="version-stats">${this.renderVersionStats(version)}</td>
                                <td class="version-actions">
                                    <div class="row-actions">
                                        <button class="btn btn-small btn-secondary view-btn" 
                                                data-action="view" data-version-id="${version.id}" title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-small btn-secondary compare-btn" 
                                                data-action="compare" data-version-id="${version.id}" title="Compare with Current">
                                            <i class="fas fa-code-branch"></i>
                                        </button>
                                        ${version.id !== currentVersion ? `
                                            <button class="btn btn-small btn-secondary restore-btn" 
                                                    data-action="restore" data-version-id="${version.id}" title="Restore Version">
                                                <i class="fas fa-undo"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-small btn-secondary export-btn" 
                                                data-action="export" data-version-id="${version.id}" title="Export Version">
                                            <i class="fas fa-download"></i>
                                        </button>
                                        ${version.id !== currentVersion && this.currentVersions.length > 1 ? `
                                            <button class="btn btn-small btn-danger delete-btn" 
                                                    data-action="delete" data-version-id="${version.id}" title="Delete Version">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Render version statistics
     */
    renderVersionStats(version) {
        const stats = this.calculateVersionStats(version.projectSnapshot);
        return `
            <div class="version-stats-compact">
                <span title="Features">${stats.features} <i class="fas fa-list"></i></span>
                <span title="Total MDs">${stats.totalMDs} <i class="fas fa-clock"></i></span>
                <span title="Phases">${stats.phases} <i class="fas fa-project-diagram"></i></span>
            </div>
        `;
    }

    /**
     * Calculate statistics for a version snapshot
     */
    calculateVersionStats(snapshot) {
        return {
            features: snapshot.features?.length || 0,
            totalMDs: snapshot.features?.reduce((sum, f) => sum + (parseFloat(f.manDays) || 0), 0).toFixed(1) || '0.0',
            phases: snapshot.phases ? Object.keys(snapshot.phases).length : 0,
            assumptions: snapshot.assumptions?.length || 0,
            coverage: snapshot.coverage || 0
        };
    }

    /**
     * Ensure versions array exists in project
     */
    ensureVersionsArray(project) {
        if (!project.versions) {
            project.versions = [];
        }
    }

    /**
     * Load versions from current project
     */
    loadVersionsFromProject(project) {
        this.currentVersions = project.versions || [];
    }

    /**
     * Update version manager when project changes
     */
    onProjectChanged(project) {
        if (project) {
            // Ensure the project has a versions array
            this.ensureVersionsArray(project);
            
            // Load versions from the new project (this will reset currentVersions)
            this.loadVersionsFromProject(project);
            
            // Update title bar
            this.updateTitleBar();
        } else {
            // No project - reset everything
            this.currentVersions = [];
        }
    }

    /**
     * Get current version identifier
     */
    getCurrentVersion() {
        if (this.currentVersions.length === 0) {
            return 'No Versions';
        }
        // Return the highest version number
        const latestVersion = this.currentVersions.reduce((latest, version) => {
            const currentNum = parseInt(version.id.substring(1));
            const latestNum = parseInt(latest.id.substring(1));
            return currentNum > latestNum ? version : latest;
        });
        return latestVersion.id;
    }

    /**
     * Update the current (most recent) version with latest project state
     */
    async updateCurrentVersion() {
        const currentProject = StateSelectors.getCurrentProject();
        if (!currentProject) {
            console.warn('No project loaded, cannot update current version');
            return;
        }

        if (this.currentVersions.length === 0) {
            // No versions exist, don't create one automatically
            console.log('🔍 VERSION UPDATE - No versions exist, skipping update');
            return;
        }

        try {
            // Find the most recent version (highest version number)
            const latestVersion = this.currentVersions.reduce((latest, version) => {
                const currentNum = parseInt(version.id.substring(1));
                const latestNum = parseInt(latest.id.substring(1));
                return currentNum > latestNum ? version : latest;
            });

            console.log('🔍 VERSION UPDATE - Updating current version:', latestVersion.id);
            console.log('🔍 VERSION UPDATE - Previous checksum:', latestVersion.checksum);
            
            // Create updated snapshot of current project state
            const updatedSnapshot = this.createProjectSnapshot();
            console.log('🔍 VERSION UPDATE - Current project state:', {
                features: updatedSnapshot.features?.length || 0,
                coverage: updatedSnapshot.coverage,
                phases: Object.keys(updatedSnapshot.phases || {}).length,
                hasCalculationData: !!updatedSnapshot.calculationData
            });

            const updatedChecksum = this.generateChecksum(updatedSnapshot);
            console.log('🔍 VERSION UPDATE - New checksum:', updatedChecksum);

            // Compare checksums to see if there are changes
            const hasChanges = updatedChecksum !== latestVersion.checksum;
            console.log('🔍 VERSION UPDATE - Has changes:', hasChanges);

            if (hasChanges) {
                console.log('🔍 VERSION UPDATE - Updating version snapshot with new data');
            } else {
                console.log('🔍 VERSION UPDATE - No changes detected, updating timestamps only');
            }

            // Update the latest version with current project state
            latestVersion.projectSnapshot = updatedSnapshot;
            latestVersion.checksum = updatedChecksum;
            latestVersion.lastUpdated = new Date().toISOString();

            console.log('🔍 VERSION UPDATE - Version', latestVersion.id, 'updated successfully');

            // Update title bar to reflect any changes
            this.updateTitleBar();

        } catch (error) {
            console.error('Failed to update current version:', error);
            throw error;
        }
    }


    /**
     * Generate checksum for data integrity
     */
    generateChecksum(data) {
        // Create a copy of data excluding volatile fields for consistent comparison
        const dataForHashing = JSON.parse(JSON.stringify(data));
        
        // Normalize structure for backward compatibility
        // Ensure assumptions array exists for consistent comparison with older versions
        if (!dataForHashing.assumptions) {
            dataForHashing.assumptions = [];
        }
        
        // Remove volatile timestamp fields that change during save but don't represent actual content changes
        if (dataForHashing.project && dataForHashing.project.lastModified) {
            delete dataForHashing.project.lastModified;
        }
        
        // Remove calculation data timestamp if it exists
        if (dataForHashing.calculationData && dataForHashing.calculationData.timestamp) {
            delete dataForHashing.calculationData.timestamp;
        }
        
        // Remove volatile timestamp fields from assumptions to avoid false differences
        if (dataForHashing.assumptions && Array.isArray(dataForHashing.assumptions)) {
            dataForHashing.assumptions.forEach(assumption => {
                if (assumption.created) delete assumption.created;
                if (assumption.modified) delete assumption.modified;
            });
        }
        
        // Remove volatile timestamp fields from features (existing fix)
        if (dataForHashing.features && Array.isArray(dataForHashing.features)) {
            dataForHashing.features.forEach(feature => {
                if (feature.created) delete feature.created;
                if (feature.modified) delete feature.modified;
            });
        }
        
        // Remove volatile lastModified timestamps from phases
        if (dataForHashing.phases && typeof dataForHashing.phases === 'object') {
            Object.keys(dataForHashing.phases).forEach(phaseKey => {
                if (dataForHashing.phases[phaseKey] && dataForHashing.phases[phaseKey].lastModified) {
                    delete dataForHashing.phases[phaseKey].lastModified;
                }
            });
        }
        
        // Simple checksum using JSON string hash
        const str = JSON.stringify(dataForHashing);
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        const result = Math.abs(hash).toString(16);
        return result;
    }

    /**
     * Validate version checksum
     */
    validateVersion(version) {
        const calculatedChecksum = this.generateChecksum(version.projectSnapshot);
        return calculatedChecksum === version.checksum;
    }


    /**
     * Format date for display
     */
    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString();
    }

    /**
     * Truncate text for display
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }


    /**
     * Get filtered versions based on current filters
     */
    getFilteredVersions() {
        let filtered = [...this.currentVersions];

        // Apply reason search
        if (this.currentFilters.reason) {
            const searchTerm = this.currentFilters.reason.toLowerCase();
            filtered = filtered.filter(v => v.reason.toLowerCase().includes(searchTerm));
        }

        // Apply date range filter
        if (this.currentFilters.dateRange) {
            const now = new Date();
            let cutoffDate;
            
            switch (this.currentFilters.dateRange) {
                case 'today':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                default:
                    cutoffDate = null;
            }
            
            if (cutoffDate) {
                filtered = filtered.filter(v => new Date(v.timestamp) >= cutoffDate);
            }
        }

        // Sort by version number (descending)
        return filtered.sort((a, b) => {
            const aNum = parseInt(a.id.substring(1));
            const bNum = parseInt(b.id.substring(1));
            return bNum - aNum;
        });
    }

    /**
     * Attach event listeners to rendered elements
     */
    attachEventListeners() {
        // Create version button
        const createBtn = document.getElementById('create-version-btn');
        if (createBtn) {
            createBtn.addEventListener('click', this.boundHandlers.createVersion);
        }

        // Import button
        const importBtn = document.getElementById('import-version-btn');
        if (importBtn) {
            importBtn.addEventListener('click', this.showImportModal.bind(this));
        }

        // Cleanup button
        const cleanupBtn = document.getElementById('cleanup-versions-btn');
        if (cleanupBtn && !cleanupBtn.disabled) {
            cleanupBtn.addEventListener('click', this.showCleanupModal.bind(this));
        }


        const reasonSearch = document.getElementById('reason-search');
        if (reasonSearch) {
            reasonSearch.addEventListener('input', (e) => {
                this.currentFilters.reason = e.target.value;
                this.updateTable();
            });
        }

        const dateRange = document.getElementById('date-range');
        if (dateRange) {
            dateRange.addEventListener('change', (e) => {
                this.currentFilters.dateRange = e.target.value;
                this.updateTable();
            });
        }

        // Add event listeners for version action buttons
        this.attachVersionActionListeners();

        // Make this manager globally accessible for onclick handlers
        window.versionManager = this;
    }

    /**
     * Attach event listeners for version action buttons
     */
    attachVersionActionListeners() {
        // Use event delegation to handle dynamically created buttons
        const tableContainer = document.querySelector('.version-table-container');
        if (!tableContainer) return;

        // Remove existing listeners to avoid duplicates
        tableContainer.removeEventListener('click', this.handleVersionActionClick);
        
        // Add single delegated listener
        this.handleVersionActionClick = this.handleVersionActionClick.bind(this);
        tableContainer.addEventListener('click', this.handleVersionActionClick);
    }

    /**
     * Handle version action button clicks
     */
    handleVersionActionClick(e) {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        e.preventDefault();
        e.stopPropagation();

        const action = button.dataset.action;
        const versionId = button.dataset.versionId;

        if (!versionId) return;

        switch (action) {
            case 'view':
                this.handleViewVersion(versionId);
                break;
            case 'compare':
                this.handleCompareVersion(versionId);
                break;
            case 'restore':
                this.handleRestoreVersion(versionId);
                break;
            case 'export':
                this.handleExportVersion(versionId);
                break;
            case 'delete':
                this.handleDeleteVersion(versionId);
                break;
            default:
                console.warn('Unknown action:', action);
        }
    }

    /**
     * Update table content with current filters
     */
    updateTable() {
        const container = document.querySelector('.version-table-container');
        if (container) {
            container.innerHTML = this.renderVersionsTable().match(/<table[\s\S]*<\/table>/)[0];
            // Re-attach event listeners for the new content
            this.attachVersionActionListeners();
        }
    }

    /**
     * Show create version modal
     */
    showCreateVersionModal() {
        if (!this.app.currentProject) {
            NotificationManager.show('No project loaded', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal version-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create New Version</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-version-form">
                        <div class="form-group">
                            <label for="version-reason">Reason for Version:</label>
                            <textarea id="version-reason" name="reason" required 
                                    placeholder="Describe the changes or reason for creating this version..."
                                    rows="4" maxlength="500"></textarea>
                            <small class="form-help">Explain what changes this version contains</small>
                        </div>
                        <div class="version-preview">
                            <h4>Version Preview</h4>
                            <div class="preview-stats">
                                ${this.renderCurrentProjectStats()}
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-version-btn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="create-version-confirm-btn">Create Version</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Focus on reason textarea
        const reasonInput = modal.querySelector('#version-reason');
        reasonInput.focus();

        // Handle form submission
        const form = modal.querySelector('#create-version-form');
        const confirmBtn = modal.querySelector('#create-version-confirm-btn');
        
        const handleCreateVersion = (e) => {
            e.preventDefault();
            const reason = reasonInput.value.trim();
            if (!reason) {
                reasonInput.focus();
                reasonInput.style.borderColor = 'var(--error)';
                return;
            }
            reasonInput.style.borderColor = '';
            this.createVersion(reason);
            document.body.removeChild(modal);
        };

        // Add listeners for both form submit and button click
        form.addEventListener('submit', handleCreateVersion);
        confirmBtn.addEventListener('click', handleCreateVersion);

        // Handle cancel
        const cancelBtn = modal.querySelector('#cancel-version-btn');
        const closeBtn = modal.querySelector('.modal-close');
        [cancelBtn, closeBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Render current project statistics for preview
     */
    renderCurrentProjectStats() {
        if (!this.app.currentProject) return '<p>No project loaded</p>';
        
        const stats = this.calculateVersionStats(this.app.currentProject);
        return `
            <div class="version-stats-grid">
                <div class="version-preview-stat-item">
                    <span class="version-preview-stat-label">Features:</span>
                    <span class="version-preview-stat-value">${stats.features}</span>
                </div>
                <div class="version-preview-stat-item">
                    <span class="version-preview-stat-label">Total MDs:</span>
                    <span class="version-preview-stat-value">${stats.totalMDs}</span>
                </div>
                <div class="version-preview-stat-item">
                    <span class="version-preview-stat-label">Phases:</span>
                    <span class="version-preview-stat-value">${stats.phases}</span>
                </div>
                <div class="version-preview-stat-item">
                    <span class="version-preview-stat-label">Coverage:</span>
                    <span class="version-preview-stat-value">${stats.coverage}</span>
                </div>
            </div>
        `;
    }

    /**
     * Create a new version
     */
    async createVersion(reason) {
        if (!this.app.currentProject) {
            NotificationManager.show('No project loaded', 'error');
            return;
        }


        try {
            this.isLoading = true;
            this.showLoading('Creating version...');

            // Ensure we're synchronized with the current project before creating version
            this.ensureVersionsArray(this.app.currentProject);
            this.loadVersionsFromProject(this.app.currentProject);

            // Force synchronization of all managers to currentProject before creating snapshot
            if (this.app.projectPhasesManager && typeof this.app.projectPhasesManager.syncToCurrentProject === 'function') {
                this.app.projectPhasesManager.syncToCurrentProject();
            }
            
            // Force recalculation of vendor costs and KPIs to ensure calculation data is current
            if (this.app.calculationsManager) {
                this.app.calculationsManager.calculateVendorCosts();
                this.app.calculationsManager.calculateKPIs();
            }

            // Check file size before creating version
            const projectSize = JSON.stringify(this.app.currentProject).length;
            if (projectSize > this.maxFileSize) {
                NotificationManager.show(`Project size (${(projectSize / 1024 / 1024).toFixed(1)}MB) exceeds recommended limit`, 'warning');
            }

            // Generate next version ID
            const nextVersionId = this.generateNextVersionId();

            // Update project version to match the new version ID
            const newProjectVersion = this.convertVersionIdToSemver(nextVersionId);
            
            // PURE STATE MANAGER: Use store action instead of direct mutation
            this.store.getState().updateProjectMetadata({ version: newProjectVersion });

            // Create deep copy of current project state
            const projectSnapshot = this.createProjectSnapshot();
            
            // Generate checksum for data integrity
            const checksum = this.generateChecksum(projectSnapshot);

            // Create version object
            const newVersion = {
                id: nextVersionId,
                timestamp: new Date().toISOString(),
                reason: reason,
                projectSnapshot: projectSnapshot,
                checksum: checksum
            };

            // Add to versions array
            // PURE STATE MANAGER: Use store action instead of direct mutation
            const currentProject = StateSelectors.getCurrentProject();
            const currentVersions = currentProject.versions || [];
            const updatedVersions = [...currentVersions, newVersion];
            
            this.store.getState().updateProjectVersions(updatedVersions);
            this.currentVersions = updatedVersions;

            // Save project with new version
            await this.app.saveProject();

            // Update title bar to show new version
            this.updateTitleBar();

            // Refresh the UI
            this.render();

            NotificationManager.show(`Version ${nextVersionId} created successfully`, 'success');

        } catch (error) {
            console.error('Failed to create version:', error);
            NotificationManager.show('Failed to create version', 'error');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Generate next version ID
     */
    generateNextVersionId() {
        // Always check current project's versions array for most accurate count
        const projectVersions = this.app.currentProject?.versions || [];
        
        // Double-check with currentVersions array for consistency
        if (projectVersions.length === 0 && this.currentVersions.length === 0) {
            return 'v1';
        }
        
        // Use the project's versions array as the source of truth
        const versionsToCheck = projectVersions.length > 0 ? projectVersions : this.currentVersions;
        
        if (versionsToCheck.length === 0) {
            return 'v1';
        }
        
        const maxVersion = Math.max(...versionsToCheck.map(v => parseInt(v.id.substring(1))));
        const nextVersion = `v${maxVersion + 1}`;
        
        return nextVersion;
    }

    /**
     * Convert version ID to semantic version format
     */
    convertVersionIdToSemver(versionId) {
        // Convert "v2" to "2.0.0", "v10" to "10.0.0", etc.
        const versionNumber = parseInt(versionId.substring(1));
        return `${versionNumber}.0.0`;
    }

    /**
     * Create deep copy snapshot of current project
     */
    createProjectSnapshot() {
        // Create deep copy without versions array to avoid circular references
        const snapshot = JSON.parse(JSON.stringify(this.app.currentProject));
        delete snapshot.versions; // Remove versions to avoid storing versions within versions
        
        // Include current calculation data if available, but exclude timestamp for comparison consistency
        if (this.app.calculationsManager?.vendorCosts) {
            snapshot.calculationData = {
                vendorCosts: JSON.parse(JSON.stringify(this.app.calculationsManager.vendorCosts))
                // NOTE: Excluding timestamp to avoid false changes in version comparison
            };
        }
        
        return snapshot;
    }


    /**
     * Update title bar to show current version
     */
    updateTitleBar() {
        const titleElement = document.getElementById('title-project-name');
        if (titleElement && this.app.currentProject) {
            const currentVersion = this.getCurrentVersion();
            const projectName = this.app.currentProject.project.name;
            const versionText = currentVersion !== 'No Versions' ? ` - ${currentVersion} (Live)` : '';
            titleElement.textContent = `${projectName}${versionText}`;
        }
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Placeholder methods for handlers (to be implemented)
    handleCreateVersion() {
        this.showCreateVersionModal();
    }

    handleViewVersion(versionId) {
        // TODO: Implement view version details
        NotificationManager.show('View version feature coming soon', 'info');
    }

    handleCompareVersion(versionId) {
        
        if (!this.app.currentProject) {
            NotificationManager.show('No project loaded', 'error');
            return;
        }

        // Find the version to compare
        const versionToCompare = this.currentVersions.find(v => v.id === versionId);
        if (!versionToCompare) {
            NotificationManager.show('Version not found', 'error');
            return;
        }

        // Validate version integrity
        if (!this.validateVersion(versionToCompare)) {
            NotificationManager.show('Version data is corrupted and cannot be compared', 'error');
            return;
        }

        this.showComparisonModal(versionToCompare);
    }

    handleRestoreVersion(versionId) {
        
        if (!this.app.currentProject) {
            NotificationManager.show('No project loaded', 'error');
            return;
        }

        // Find the version to restore
        const versionToRestore = this.currentVersions.find(v => v.id === versionId);
        if (!versionToRestore) {
            NotificationManager.show('Version not found', 'error');
            return;
        }

        // Validate version integrity
        if (!this.validateVersion(versionToRestore)) {
            NotificationManager.show('Version data is corrupted and cannot be restored', 'error');
            return;
        }

        this.showRestoreConfirmationModal(versionToRestore);
    }

    /**
     * Show restore confirmation modal with diff preview
     */
    showRestoreConfirmationModal(versionToRestore) {
        const modal = document.createElement('div');
        modal.className = 'modal version-restore-modal';
        modal.innerHTML = `
            <div class="modal-content restore-modal-content">
                <div class="modal-header">
                    <h3>Restore Version ${versionToRestore.id}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="restore-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Warning:</strong> Restoring this version will create a new version with the restored data.
                            Your current changes will be preserved as a backup.
                        </div>
                    </div>
                    
                    <div class="version-comparison">
                        <div class="version-comparison-header">
                            <h4>What will change:</h4>
                        </div>
                        <div class="version-comparison-content">
                            ${this.renderVersionComparison(versionToRestore)}
                        </div>
                    </div>
                    
                    <div class="version-restore-details">
                        <div class="version-detail-row">
                            <span class="version-detail-label">Restore from:</span>
                            <span class="version-detail-value">${versionToRestore.id} (${this.formatDate(versionToRestore.timestamp)})</span>
                        </div>
                        <div class="version-detail-row">
                            <span class="version-detail-label">Reason:</span>
                            <span class="version-detail-value">${versionToRestore.reason}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-restore-btn">Cancel</button>
                    <button type="button" class="btn btn-warning" id="confirm-restore-btn">
                        <i class="fas fa-undo"></i> Restore Version
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Handle confirmation
        const confirmBtn = modal.querySelector('#confirm-restore-btn');
        confirmBtn.addEventListener('click', async () => {
            document.body.removeChild(modal);
            await this.performRestore(versionToRestore);
        });

        // Handle cancel
        const cancelBtn = modal.querySelector('#cancel-restore-btn');
        const closeBtn = modal.querySelector('.modal-close');
        [cancelBtn, closeBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Render version comparison summary
     */
    renderVersionComparison(versionToRestore) {
        const currentStats = this.calculateVersionStats(this.app.currentProject);
        const restoreStats = this.calculateVersionStats(versionToRestore.projectSnapshot);
        
        const changes = [];
        
        // Compare features
        const featureDiff = parseInt(restoreStats.features) - parseInt(currentStats.features);
        if (featureDiff !== 0) {
            changes.push({
                type: 'features',
                icon: 'fas fa-list',
                label: 'Features',
                current: currentStats.features,
                restore: restoreStats.features,
                diff: featureDiff
            });
        }
        
        // Compare assumptions
        const assumptionsDiff = parseInt(restoreStats.assumptions) - parseInt(currentStats.assumptions);
        if (assumptionsDiff !== 0) {
            changes.push({
                type: 'assumptions',
                icon: 'fas fa-clipboard-list',
                label: 'Assumptions',
                current: currentStats.assumptions,
                restore: restoreStats.assumptions,
                diff: assumptionsDiff
            });
        }
        
        // Compare total MDs
        const mdDiff = parseFloat(restoreStats.totalMDs) - parseFloat(currentStats.totalMDs);
        if (Math.abs(mdDiff) > 0.1) {
            changes.push({
                type: 'totalMDs',
                icon: 'fas fa-clock',
                label: 'Total MDs',
                current: currentStats.totalMDs,
                restore: restoreStats.totalMDs,
                diff: mdDiff.toFixed(1)
            });
        }
        
        // Compare phases
        const phasesDiff = parseInt(restoreStats.phases) - parseInt(currentStats.phases);
        if (phasesDiff !== 0) {
            changes.push({
                type: 'phases',
                icon: 'fas fa-project-diagram',
                label: 'Phases',
                current: currentStats.phases,
                restore: restoreStats.phases,
                diff: phasesDiff
            });
        }

        if (changes.length === 0) {
            return '<p class="version-no-changes">No significant changes detected in basic statistics.</p>';
        }

        return changes.map(change => `
            <div class="version-change-item">
                <i class="${change.icon}"></i>
                <div class="version-change-details">
                    <span class="version-change-label">${change.label}:</span>
                    <span class="version-change-values">
                        ${change.current} → ${change.restore}
                        <span class="version-change-diff ${change.diff > 0 ? 'positive' : 'negative'}">
                            (${change.diff > 0 ? '+' : ''}${change.diff})
                        </span>
                    </span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Perform the actual version restoration
     */
    async performRestore(versionToRestore) {
        try {
            this.isLoading = true;
            this.showLoading('Restoring version...');

            // Create backup of current state before restore
            const backupReason = `Backup before restoring ${versionToRestore.id}`;
            await this.createVersion(backupReason);


            // Restore the version data (without versions array)
            const restoredData = JSON.parse(JSON.stringify(versionToRestore.projectSnapshot));
            
            // Preserve the versions array from current project
            restoredData.versions = this.app.currentProject.versions;
            
            
            // Create a version to represent the restored state BEFORE updating the current project
            const restoreReason = `Restored from version ${versionToRestore.id}`;
            const nextVersionId = this.generateNextVersionId();
            const restoreVersion = {
                id: nextVersionId,
                timestamp: new Date().toISOString(),
                reason: restoreReason,
                projectSnapshot: JSON.parse(JSON.stringify(versionToRestore.projectSnapshot)),
                checksum: this.generateChecksum(versionToRestore.projectSnapshot)
            };

            // Add the restore version to the versions array before updating the project
            restoredData.versions.push(restoreVersion);

            // Update current project with restored data (including the new restore version)
            this.app.currentProject = restoredData;
            
            
            // Update title bar
            this.updateTitleBar();

            // Force refresh ALL components to ensure they use the restored data
            
            // Force refresh features manager
            if (this.app.featureManager) {
                this.app.featureManager.refreshTable();
            }

            // DON'T synchronize phases after restore - it overwrites the restored data!
            // The restored project data is already correct, synchronization would overwrite it

            // Re-initialize all managers with the restored data from currentProject
            
            // Re-initialize phases manager with restored data
            if (this.app.projectPhasesManager && typeof this.app.projectPhasesManager.initializePhases === 'function') {
                this.app.projectPhasesManager.initializePhases();
            }

            // Ensure phases are properly initialized - create phasesManager reference for calculations
            this.app.phasesManager = this.app.projectPhasesManager;

            // Force refresh calculations data
            if (this.app.calculationsManager) {
                this.app.calculationsManager.calculateVendorCosts();
                this.app.calculationsManager.calculateKPIs();
            }

            // Force refresh UI of all sections to show restored data
            
            // Force refresh all dropdowns to reflect restored configuration
            if (this.app && typeof this.app.refreshDropdowns === 'function') {
                this.app.refreshDropdowns();
            }
            
            // Force refresh configuration manager to reload project config
            if (this.app.configManager) {
                // Force reload of project configuration
                this.app.configManager.currentConfig = null; // Clear cache
            }

            // Refresh version history UI (this component)
            this.render();
            
            // Mark as dirty AFTER all managers have been properly initialized with restored data
            this.app.markDirty();
            
            // Force save the project with restored data
            await this.app.saveProject();
            
            NotificationManager.show(`Successfully restored version ${versionToRestore.id}`, 'success');

        } catch (error) {
            console.error('Failed to restore version:', error);
            NotificationManager.show('Failed to restore version', 'error');
            
            // Skip automatic rollback as it may cause path issues
            // User should manually reload project if needed
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }


    /**
     * Show version comparison modal
     */
    showComparisonModal(versionToCompare) {
        console.log('🔍 VERSION COMPARE - Starting comparison modal');
        console.log('🔍 VERSION COMPARE - Version to compare:', {
            id: versionToCompare.id,
            timestamp: versionToCompare.timestamp,
            checksum: versionToCompare.checksum,
            reason: versionToCompare.reason
        });
        
        const currentVersion = this.getCurrentVersion();
        console.log('🔍 VERSION COMPARE - Current version:', currentVersion);
        console.log('🔍 VERSION COMPARE - Current project data keys:', Object.keys(this.app.currentProject));
        console.log('🔍 VERSION COMPARE - Version snapshot data keys:', Object.keys(versionToCompare.projectSnapshot));
        
        const modal = document.createElement('div');
        modal.className = 'modal version-compare-modal';
        modal.innerHTML = `
            <div class="modal-content compare-modal-content">
                <div class="modal-header">
                    <h3>Compare Versions: Current vs ${versionToCompare.id}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="version-comparison-container">
                        <div class="version-comparison-header">
                            <div class="version-column current">
                                <h4>Current Version (${currentVersion})</h4>
                                <span class="version-info">Live project state</span>
                            </div>
                            <div class="version-column compare">
                                <h4>Version ${versionToCompare.id}</h4>
                                <span class="version-info">${this.formatDate(versionToCompare.timestamp)}</span>
                            </div>
                        </div>
                        
                        <div class="comparison-sections">
                            ${this.renderProjectComparison(versionToCompare)}
                            ${this.renderFeaturesComparison(versionToCompare)}
                            ${this.renderAssumptionsComparison(versionToCompare)}
                            ${this.renderConfigurationComparison(versionToCompare)}
                            ${this.renderPhasesComparison(versionToCompare)}
                            ${this.renderCalculationsComparison(versionToCompare)}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="close-compare-btn">Close</button>
                    <button type="button" class="btn btn-warning" id="restore-from-compare-btn">
                        <i class="fas fa-undo"></i> Restore This Version
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Handle restore from comparison
        const restoreBtn = modal.querySelector('#restore-from-compare-btn');
        restoreBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            this.handleRestoreVersion(versionToCompare.id);
        });

        // Handle close
        const closeBtn = modal.querySelector('#close-compare-btn');
        const modalCloseBtn = modal.querySelector('.modal-close');
        [closeBtn, modalCloseBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Render project metadata comparison
     */
    renderProjectComparison(versionToCompare) {
        const current = this.app.currentProject;
        const compare = versionToCompare.projectSnapshot;
        
        console.log('🔍 PROJECT COMPARE - Current project data:', {
            name: current.project?.name,
            description: current.project?.description,
            coverage: current.coverage,
            version: current.project?.version,
            lastModified: current.project?.lastModified
        });
        
        console.log('🔍 PROJECT COMPARE - Compare project data:', {
            name: compare.project?.name,
            description: compare.project?.description,
            coverage: compare.coverage,
            version: compare.project?.version,
            lastModified: compare.project?.lastModified
        });
        
        const projectFields = [
            {
                label: 'Project Name',
                currentValue: current.project?.name || 'N/A',
                compareValue: compare.project?.name || 'N/A',
                type: 'text'
            },
            {
                label: 'Description',
                currentValue: current.project?.description || 'N/A',
                compareValue: compare.project?.description || 'N/A',
                type: 'text'
            },
            {
                label: 'Coverage',
                currentValue: (current.coverage || 0).toString(),
                compareValue: (compare.coverage || 0).toString(),
                type: 'number'
            }
        ];
        
        const fieldsWithDiff = projectFields.filter(field => field.currentValue !== field.compareValue);
        console.log('🔍 PROJECT COMPARE - Fields with differences:', fieldsWithDiff.map(f => ({ label: f.label, current: f.currentValue, compare: f.compareValue })));
        
        return `
            <div class="comp-section comp-project">
                <div class="comp-section-header">
                    <h5><i class="fas fa-project-diagram"></i> Project Information</h5>
                    <small>${fieldsWithDiff.length} field${fieldsWithDiff.length !== 1 ? 's' : ''} with differences</small>
                </div>
                <div class="comp-section-body">
                    <div class="comp-project-container">
                        <div class="comp-project-header">
                            <div class="comp-project-field-col">Field</div>
                            <div class="comp-project-data-cols">
                                <div class="comp-project-version-group comp-current">
                                    <div class="comp-version-label">Current Version</div>
                                </div>
                                <div class="comp-project-version-group comp-compare">
                                    <div class="comp-version-label">Version ${versionToCompare.id}</div>
                                </div>
                                <div class="comp-project-diff-col">
                                    <div class="comp-version-label">Status</div>
                                </div>
                            </div>
                        </div>
                        <div class="comp-project-rows">
                            ${projectFields.map(field => {
                                const hasDiff = field.currentValue !== field.compareValue;
                                return `
                                    <div class="comp-project-row ${hasDiff ? 'comp-has-diff' : ''}">
                                        <div class="comp-project-field-info">
                                            <div class="comp-project-field-name">${field.label}</div>
                                            <div class="comp-project-field-type">${field.type}</div>
                                        </div>
                                        <div class="comp-project-data">
                                            <div class="comp-project-version-data comp-current">
                                                <div class="comp-project-value ${hasDiff ? 'comp-different' : ''}" title="${field.currentValue}">
                                                    ${this.truncateText(field.currentValue, 40)}
                                                </div>
                                            </div>
                                            <div class="comp-project-version-data comp-compare">
                                                <div class="comp-project-value ${hasDiff ? 'comp-different' : ''}" title="${field.compareValue}">
                                                    ${this.truncateText(field.compareValue, 40)}
                                                </div>
                                            </div>
                                            <div class="comp-project-diff">
                                                ${hasDiff ? `
                                                    <span class="comp-status-badge comp-changed">
                                                        <i class="fas fa-edit"></i> Changed
                                                    </span>
                                                ` : `
                                                    <span class="comp-status-badge comp-same">
                                                        <i class="fas fa-check"></i> Same
                                                    </span>
                                                `}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render features comparison
     */
    renderFeaturesComparison(versionToCompare) {
        const currentFeatures = this.app.currentProject.features || [];
        const compareFeatures = versionToCompare.projectSnapshot.features || [];
        
        console.log('🔍 FEATURES COMPARE - Current features:', currentFeatures.map(f => ({
            id: f.id,
            description: f.description,
            manDays: f.manDays,
            supplier: f.supplier,
            category: f.category
        })));
        
        console.log('🔍 FEATURES COMPARE - Compare features:', compareFeatures.map(f => ({
            id: f.id,
            description: f.description,
            manDays: f.manDays,
            supplier: f.supplier,
            category: f.category
        })));
        
        const currentStats = this.calculateVersionStats(this.app.currentProject);
        const compareStats = this.calculateVersionStats(versionToCompare.projectSnapshot);
        
        console.log('🔍 FEATURES COMPARE - Current stats:', currentStats);
        console.log('🔍 FEATURES COMPARE - Compare stats:', compareStats);
        
        // Calculate feature differences
        const added = currentFeatures.filter(cf => !compareFeatures.find(vf => vf.id === cf.id));
        const removed = compareFeatures.filter(vf => !currentFeatures.find(cf => cf.id === vf.id));
        const modified = currentFeatures.filter(cf => {
            const vf = compareFeatures.find(f => f.id === cf.id);
            return vf && JSON.stringify(cf) !== JSON.stringify(vf);
        });
        
        console.log('🔍 FEATURES COMPARE - Added features:', added.map(f => ({ id: f.id, manDays: f.manDays })));
        console.log('🔍 FEATURES COMPARE - Removed features:', removed.map(f => ({ id: f.id, manDays: f.manDays })));
        console.log('🔍 FEATURES COMPARE - Modified features:', modified.map(f => {
            const vf = compareFeatures.find(cf => cf.id === f.id);
            return {
                id: f.id,
                currentMD: f.manDays,
                compareMD: vf?.manDays,
                difference: f.manDays - (vf?.manDays || 0)
            };
        }));
        
        const totalChanges = added.length + removed.length + modified.length;
        
        return `
            <div class="comp-section comp-features">
                <div class="comp-section-header">
                    <h5><i class="fas fa-list-ul"></i> Features Comparison</h5>
                    <small>${totalChanges} change${totalChanges !== 1 ? 's' : ''} detected</small>
                </div>
                <div class="comp-section-body">
                    <!-- Statistics Overview -->
                    <div class="comp-features-stats">
                        <div class="comp-stats-header">
                            <h6><i class="fas fa-chart-bar"></i> Statistics Overview</h6>
                        </div>
                        <div class="comp-stats-grid">
                            <div class="comp-stat-item">
                                <div class="comp-stat-label">Total Features</div>
                                <div class="comp-stat-values">
                                    <div class="comp-stat-value comp-current">${currentStats.features}</div>
                                    <div class="comp-stat-separator">→</div>
                                    <div class="comp-stat-value comp-compare">${compareStats.features}</div>
                                    <div class="comp-stat-diff ${currentStats.features - compareStats.features > 0 ? 'comp-positive' : currentStats.features - compareStats.features < 0 ? 'comp-negative' : 'comp-neutral'}">
                                        ${currentStats.features - compareStats.features > 0 ? '+' : ''}${currentStats.features - compareStats.features}
                                    </div>
                                </div>
                            </div>
                            <div class="comp-stat-item">
                                <div class="comp-stat-label">Total Man Days</div>
                                <div class="comp-stat-values">
                                    <div class="comp-stat-value comp-current">${currentStats.totalMDs}</div>
                                    <div class="comp-stat-separator">→</div>
                                    <div class="comp-stat-value comp-compare">${compareStats.totalMDs}</div>
                                    <div class="comp-stat-diff ${currentStats.totalMDs - compareStats.totalMDs > 0 ? 'comp-positive' : currentStats.totalMDs - compareStats.totalMDs < 0 ? 'comp-negative' : 'comp-neutral'}">
                                        ${currentStats.totalMDs - compareStats.totalMDs > 0 ? '+' : ''}${currentStats.totalMDs - compareStats.totalMDs}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Feature Changes -->
                    <div class="comp-features-changes">
                        ${added.length > 0 ? `
                            <div class="comp-feature-change-group comp-added">
                                <div class="comp-change-header">
                                    <h6><i class="fas fa-plus-circle"></i> Added Features</h6>
                                    <span class="comp-change-count">${added.length}</span>
                                </div>
                                <div class="comp-feature-list">
                                    ${added.map(f => `
                                        <div class="comp-feature-item comp-added">
                                            <div class="comp-feature-id">${f.id}</div>
                                            <div class="comp-feature-info">
                                                <div class="comp-feature-desc" title="${f.description}">${this.truncateText(f.description, 50)}</div>
                                                <div class="comp-feature-meta">
                                                    <span class="comp-feature-md">${f.manDays} MD</span>
                                                    ${f.category ? `<span class="comp-feature-category">${f.category}</span>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${removed.length > 0 ? `
                            <div class="comp-feature-change-group comp-removed">
                                <div class="comp-change-header">
                                    <h6><i class="fas fa-minus-circle"></i> Removed Features</h6>
                                    <span class="comp-change-count">${removed.length}</span>
                                </div>
                                <div class="comp-feature-list">
                                    ${removed.map(f => `
                                        <div class="comp-feature-item comp-removed">
                                            <div class="comp-feature-id">${f.id}</div>
                                            <div class="comp-feature-info">
                                                <div class="comp-feature-desc" title="${f.description}">${this.truncateText(f.description, 50)}</div>
                                                <div class="comp-feature-meta">
                                                    <span class="comp-feature-md">${f.manDays} MD</span>
                                                    ${f.category ? `<span class="comp-feature-category">${f.category}</span>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${modified.length > 0 ? `
                            <div class="comp-feature-change-group comp-modified">
                                <div class="comp-change-header">
                                    <h6><i class="fas fa-edit"></i> Modified Features</h6>
                                    <span class="comp-change-count">${modified.length}</span>
                                </div>
                                <div class="comp-feature-list">
                                    ${modified.map(f => {
                                        const vf = compareFeatures.find(cf => cf.id === f.id);
                                        const mdChange = f.manDays - vf.manDays;
                                        return `
                                            <div class="comp-feature-item comp-modified">
                                                <div class="comp-feature-id">${f.id}</div>
                                                <div class="comp-feature-info">
                                                    <div class="comp-feature-desc" title="${f.description}">${this.truncateText(f.description, 40)}</div>
                                                    <div class="comp-feature-meta">
                                                        <div class="comp-feature-md-change">
                                                            <span class="comp-md-old">${vf.manDays}</span>
                                                            <span class="comp-md-arrow">→</span>
                                                            <span class="comp-md-new">${f.manDays}</span>
                                                            <span class="comp-md-diff ${mdChange > 0 ? 'comp-positive' : mdChange < 0 ? 'comp-negative' : 'comp-neutral'}">
                                                                (${mdChange > 0 ? '+' : ''}${mdChange} MD)
                                                            </span>
                                                        </div>
                                                        ${f.category ? `<span class="comp-feature-category">${f.category}</span>` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${totalChanges === 0 ? `
                            <div class="comp-no-data">
                                <i class="fas fa-check-circle"></i>
                                <span>No feature changes detected</span>
                                <small>Both versions have identical features</small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render assumptions comparison
     */
    renderAssumptionsComparison(versionToCompare) {
        const currentAssumptions = this.app.currentProject.assumptions || [];
        const compareAssumptions = versionToCompare.projectSnapshot.assumptions || [];
        
        console.log('🔍 ASSUMPTIONS COMPARE - Current assumptions:', currentAssumptions.map(a => ({
            id: a.id,
            description: a.description,
            type: a.type,
            impact: a.impact
        })));
        
        console.log('🔍 ASSUMPTIONS COMPARE - Compare assumptions:', compareAssumptions.map(a => ({
            id: a.id,
            description: a.description,
            type: a.type,
            impact: a.impact
        })));
        
        const currentStats = this.calculateVersionStats(this.app.currentProject);
        const compareStats = this.calculateVersionStats(versionToCompare.projectSnapshot);
        
        console.log('🔍 ASSUMPTIONS COMPARE - Current stats:', currentStats);
        console.log('🔍 ASSUMPTIONS COMPARE - Compare stats:', compareStats);
        
        // Calculate assumption differences
        const added = currentAssumptions.filter(ca => !compareAssumptions.find(va => va.id === ca.id));
        const removed = compareAssumptions.filter(va => !currentAssumptions.find(ca => ca.id === va.id));
        const modified = currentAssumptions.filter(ca => {
            const va = compareAssumptions.find(a => a.id === ca.id);
            return va && JSON.stringify(ca) !== JSON.stringify(va);
        });
        
        console.log('🔍 ASSUMPTIONS COMPARE - Added assumptions:', added.map(a => ({ id: a.id, type: a.type, impact: a.impact })));
        console.log('🔍 ASSUMPTIONS COMPARE - Removed assumptions:', removed.map(a => ({ id: a.id, type: a.type, impact: a.impact })));
        console.log('🔍 ASSUMPTIONS COMPARE - Modified assumptions:', modified.map(a => {
            const va = compareAssumptions.find(ca => ca.id === a.id);
            return {
                id: a.id,
                currentImpact: a.impact,
                compareImpact: va?.impact,
                currentType: a.type,
                compareType: va?.type
            };
        }));
        
        const totalChanges = added.length + removed.length + modified.length;
        
        return `
            <div class="comp-section comp-assumptions">
                <div class="comp-section-header">
                    <h5><i class="fas fa-clipboard-list"></i> Assumptions Comparison</h5>
                    <small>${totalChanges} change${totalChanges !== 1 ? 's' : ''} detected</small>
                </div>
                <div class="comp-section-body">
                    <!-- Statistics Overview -->
                    <div class="comp-assumptions-stats">
                        <div class="comp-stats-header">
                            <h6><i class="fas fa-chart-bar"></i> Statistics Overview</h6>
                        </div>
                        <div class="comp-stats-grid">
                            <div class="comp-stat-item">
                                <div class="comp-stat-label">Total Assumptions</div>
                                <div class="comp-stat-values">
                                    <div class="comp-stat-value comp-current">${currentStats.assumptions}</div>
                                    <div class="comp-stat-separator">→</div>
                                    <div class="comp-stat-value comp-compare">${compareStats.assumptions}</div>
                                    <div class="comp-stat-diff ${currentStats.assumptions - compareStats.assumptions > 0 ? 'comp-positive' : currentStats.assumptions - compareStats.assumptions < 0 ? 'comp-negative' : 'comp-neutral'}">
                                        ${currentStats.assumptions - compareStats.assumptions > 0 ? '+' : ''}${currentStats.assumptions - compareStats.assumptions}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Assumption Changes -->
                    <div class="comp-assumptions-changes">
                        ${added.length > 0 ? `
                            <div class="comp-assumption-change-group comp-added">
                                <div class="comp-change-header">
                                    <h6><i class="fas fa-plus-circle"></i> Added Assumptions</h6>
                                    <span class="comp-change-count">${added.length}</span>
                                </div>
                                <div class="comp-assumption-list">
                                    ${added.map(a => `
                                        <div class="comp-assumption-item comp-added">
                                            <div class="comp-assumption-id">${a.id}</div>
                                            <div class="comp-assumption-info">
                                                <div class="comp-assumption-desc" title="${a.description}">${this.truncateText(a.description, 50)}</div>
                                                <div class="comp-assumption-meta">
                                                    <span class="comp-assumption-type">${a.type}</span>
                                                    <span class="comp-assumption-impact impact-${a.impact?.toLowerCase()}">${a.impact}</span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${removed.length > 0 ? `
                            <div class="comp-assumption-change-group comp-removed">
                                <div class="comp-change-header">
                                    <h6><i class="fas fa-minus-circle"></i> Removed Assumptions</h6>
                                    <span class="comp-change-count">${removed.length}</span>
                                </div>
                                <div class="comp-assumption-list">
                                    ${removed.map(a => `
                                        <div class="comp-assumption-item comp-removed">
                                            <div class="comp-assumption-id">${a.id}</div>
                                            <div class="comp-assumption-info">
                                                <div class="comp-assumption-desc" title="${a.description}">${this.truncateText(a.description, 50)}</div>
                                                <div class="comp-assumption-meta">
                                                    <span class="comp-assumption-type">${a.type}</span>
                                                    <span class="comp-assumption-impact impact-${a.impact?.toLowerCase()}">${a.impact}</span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${modified.length > 0 ? `
                            <div class="comp-assumption-change-group comp-modified">
                                <div class="comp-change-header">
                                    <h6><i class="fas fa-edit"></i> Modified Assumptions</h6>
                                    <span class="comp-change-count">${modified.length}</span>
                                </div>
                                <div class="comp-assumption-list">
                                    ${modified.map(a => {
                                        const va = compareAssumptions.find(ca => ca.id === a.id);
                                        const typeChanged = a.type !== va?.type;
                                        const impactChanged = a.impact !== va?.impact;
                                        const descChanged = a.description !== va?.description;
                                        const notesChanged = a.notes !== va?.notes;
                                        
                                        return `
                                            <div class="comp-assumption-item comp-modified">
                                                <div class="comp-assumption-id">${a.id}</div>
                                                <div class="comp-assumption-info">
                                                    <div class="comp-assumption-desc" title="${a.description}">${this.truncateText(a.description, 40)}</div>
                                                    <div class="comp-assumption-changes">
                                                        ${typeChanged ? `
                                                            <div class="comp-assumption-change">
                                                                <span class="comp-change-label">Type:</span>
                                                                <span class="comp-change-value">
                                                                    <span class="comp-old">${va?.type || 'N/A'}</span>
                                                                    <span class="comp-arrow">→</span>
                                                                    <span class="comp-new">${a.type}</span>
                                                                </span>
                                                            </div>
                                                        ` : ''}
                                                        ${impactChanged ? `
                                                            <div class="comp-assumption-change">
                                                                <span class="comp-change-label">Impact:</span>
                                                                <span class="comp-change-value">
                                                                    <span class="comp-old">${va?.impact || 'N/A'}</span>
                                                                    <span class="comp-arrow">→</span>
                                                                    <span class="comp-new">${a.impact}</span>
                                                                </span>
                                                            </div>
                                                        ` : ''}
                                                        ${descChanged ? `
                                                            <div class="comp-assumption-change">
                                                                <span class="comp-change-label">Description modified</span>
                                                            </div>
                                                        ` : ''}
                                                        ${notesChanged ? `
                                                            <div class="comp-assumption-change">
                                                                <span class="comp-change-label">Notes modified</span>
                                                            </div>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${totalChanges === 0 ? `
                            <div class="comp-no-data">
                                <i class="fas fa-check-circle"></i>
                                <span>No assumption changes detected</span>
                                <small>Both versions have identical assumptions</small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render configuration comparison
     */
    renderConfigurationComparison(versionToCompare) {
        const currentOverrides = this.app.currentProject.projectOverrides || {};
        const compareOverrides = versionToCompare.projectSnapshot.projectOverrides || {};
        
        const configFields = [
            {
                label: 'Custom Suppliers',
                currentValue: Object.keys(currentOverrides.suppliers || {}).length,
                compareValue: Object.keys(compareOverrides.suppliers || {}).length,
                type: 'count',
                icon: 'fas fa-truck'
            },
            {
                label: 'Custom Resources',
                currentValue: Object.keys(currentOverrides.internalResources || {}).length,
                compareValue: Object.keys(compareOverrides.internalResources || {}).length,
                type: 'count',
                icon: 'fas fa-users'
            },
            {
                label: 'Custom Categories',
                currentValue: Object.keys(currentOverrides.categories || {}).length,
                compareValue: Object.keys(compareOverrides.categories || {}).length,
                type: 'count',
                icon: 'fas fa-tags'
            }
        ];
        
        const fieldsWithDiff = configFields.filter(field => field.currentValue !== field.compareValue);
        
        return `
            <div class="comp-section comp-config">
                <div class="comp-section-header">
                    <h5><i class="fas fa-cog"></i> Configuration Overrides</h5>
                    <small>${fieldsWithDiff.length} configuration${fieldsWithDiff.length !== 1 ? 's' : ''} changed</small>
                </div>
                <div class="comp-section-body">
                    <div class="comp-config-container">
                        <div class="comp-config-header">
                            <div class="comp-config-field-col">Configuration Type</div>
                            <div class="comp-config-data-cols">
                                <div class="comp-config-version-group comp-current">
                                    <div class="comp-version-label">Current Version</div>
                                    <div class="comp-config-sub-header">Count</div>
                                </div>
                                <div class="comp-config-version-group comp-compare">
                                    <div class="comp-version-label">Version ${versionToCompare.id}</div>
                                    <div class="comp-config-sub-header">Count</div>
                                </div>
                                <div class="comp-config-diff-col">
                                    <div class="comp-version-label">Difference</div>
                                    <div class="comp-config-sub-header">Δ</div>
                                </div>
                            </div>
                        </div>
                        <div class="comp-config-rows">
                            ${configFields.map(field => {
                                const hasDiff = field.currentValue !== field.compareValue;
                                const diff = field.currentValue - field.compareValue;
                                return `
                                    <div class="comp-config-row ${hasDiff ? 'comp-has-diff' : ''}">
                                        <div class="comp-config-field-info">
                                            <div class="comp-config-field-name">
                                                <i class="${field.icon}"></i>
                                                ${field.label}
                                            </div>
                                            <div class="comp-config-field-type">${field.type}</div>
                                        </div>
                                        <div class="comp-config-data">
                                            <div class="comp-config-version-data comp-current">
                                                <div class="comp-config-value ${hasDiff ? 'comp-different' : ''}">${field.currentValue}</div>
                                            </div>
                                            <div class="comp-config-version-data comp-compare">
                                                <div class="comp-config-value ${hasDiff ? 'comp-different' : ''}">${field.compareValue}</div>
                                            </div>
                                            <div class="comp-config-diff">
                                                ${hasDiff ? `
                                                    <span class="comp-diff-value ${diff > 0 ? 'comp-positive' : 'comp-negative'}">
                                                        ${diff > 0 ? '+' : ''}${diff}
                                                    </span>
                                                ` : '<span class="comp-no-diff">—</span>'}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    ${fieldsWithDiff.length === 0 ? `
                        <div class="comp-config-summary">
                            <div class="comp-summary-card comp-no-changes">
                                <i class="fas fa-check-circle"></i>
                                <div class="comp-summary-content">
                                    <h6>No Configuration Changes</h6>
                                    <p>Both versions have identical configuration overrides</p>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="comp-config-summary">
                            <div class="comp-summary-card comp-has-changes">
                                <i class="fas fa-exclamation-triangle"></i>
                                <div class="comp-summary-content">
                                    <h6>Configuration Changes Detected</h6>
                                    <p>${fieldsWithDiff.length} configuration type${fieldsWithDiff.length !== 1 ? 's have' : ' has'} been modified between versions</p>
                                </div>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Render phases comparison
     */
    renderPhasesComparison(versionToCompare) {
        // Get current phases from phases manager (the actual table data)
        let currentPhasesArray = this.app.phasesManager?.currentPhases || [];
        
        console.log('🔍 PHASES COMPARE - Current phases array:', currentPhasesArray.map(p => ({
            id: p.id,
            name: p.name,
            manDays: this.app.currentProject.phases?.[p.id]?.manDays || 0
        })));
        
        // Fallback: if phases manager is not available or empty, use phase definitions from current project phases
        if (currentPhasesArray.length === 0) {
            const currentPhasesMap = this.app.currentProject.phases || {};
            const defaultPhaseNames = [
                { id: 'functionalAnalysis', name: 'Functional Analysis' },
                { id: 'technicalAnalysis', name: 'Technical Analysis' },
                { id: 'development', name: 'Development' },
                { id: 'integrationTests', name: 'Integration Tests' },
                { id: 'uatTests', name: 'UAT Tests' },
                { id: 'consolidation', name: 'Consolidation' },
                { id: 'vapt', name: 'VAPT' },
                { id: 'postGoLive', name: 'Post Go-Live Support' }
            ];
            
            // Filter only phases that exist in the current project
            currentPhasesArray = defaultPhaseNames.filter(phase => 
                currentPhasesMap[phase.id] !== undefined
            );
        }
        
        const currentPhasesMap = this.app.currentProject.phases || {};
        const comparePhasesMap = versionToCompare.projectSnapshot.phases || {};
        
        console.log('🔍 PHASES COMPARE - Current phases map:', Object.entries(currentPhasesMap).map(([id, data]) => ({
            id,
            manDays: data.manDays || 0,
            effort: data.effort || 0
        })));
        
        console.log('🔍 PHASES COMPARE - Compare phases map:', Object.entries(comparePhasesMap).map(([id, data]) => ({
            id,
            manDays: data.manDays || 0,
            effort: data.effort || 0
        })));
        
        // Calculate phases with differences using the real phase data
        const phasesWithDiff = currentPhasesArray.filter(phase => {
            const currentMD = currentPhasesMap[phase.id]?.manDays || 0;
            const compareMD = comparePhasesMap[phase.id]?.manDays || 0;
            return Math.abs(currentMD - compareMD) > 0.1;
        });
        
        const phaseComparisons = currentPhasesArray.map(phase => {
            const currentMD = currentPhasesMap[phase.id]?.manDays || 0;
            const compareMD = comparePhasesMap[phase.id]?.manDays || 0;
            const diff = currentMD - compareMD;
            
            return {
                phase: phase.name, // Use the real phase name from Project Phases Configuration
                phaseId: phase.id,
                currentMD,
                compareMD,
                diff,
                hasDiff: Math.abs(diff) > 0.1
            };
        });
        
        return `
            <div class="comp-section comp-phases">
                <div class="comp-section-header">
                    <h5><i class="fas fa-tasks"></i> Project Phases Comparison</h5>
                    <small>${phasesWithDiff.length} phase${phasesWithDiff.length !== 1 ? 's' : ''} with differences</small>
                </div>
                <div class="comp-section-body">
                    <div class="comp-phases-container">
                        <div class="comp-phases-header">
                            <div class="comp-phase-name-col">Phase</div>
                            <div class="comp-phases-data-cols">
                                <div class="comp-phases-version-group comp-current">
                                    <div class="comp-version-label">Current Version</div>
                                    <div class="comp-phases-sub-header">Man Days Total</div>
                                </div>
                                <div class="comp-phases-version-group comp-compare">
                                    <div class="comp-version-label">Version ${versionToCompare.id}</div>
                                    <div class="comp-phases-sub-header">Man Days Total</div>
                                </div>
                                <div class="comp-phases-diff-col">
                                    <div class="comp-version-label">Difference</div>
                                    <div class="comp-phases-sub-header">MDs</div>
                                </div>
                            </div>
                        </div>
                        <div class="comp-phases-rows">
                            ${phaseComparisons.map(comp => `
                                <div class="comp-phases-row ${comp.hasDiff ? 'comp-has-diff' : ''}">
                                    <div class="comp-phase-info">
                                        <div class="comp-phase-name">${comp.phase}</div>
                                        <div class="comp-phase-details">Project phase</div>
                                    </div>
                                    <div class="comp-phases-data">
                                        <div class="comp-phases-version-data comp-current">
                                            <div class="comp-phase-mds ${comp.hasDiff ? 'comp-different' : ''}">${comp.currentMD.toFixed(1)} MD</div>
                                        </div>
                                        <div class="comp-phases-version-data comp-compare">
                                            <div class="comp-phase-mds ${comp.hasDiff ? 'comp-different' : ''}">${comp.compareMD.toFixed(1)} MD</div>
                                        </div>
                                        <div class="comp-phases-diff">
                                            ${comp.hasDiff ? `
                                                <span class="comp-diff-value ${comp.diff > 0 ? 'comp-positive' : 'comp-negative'}">
                                                    ${comp.diff > 0 ? '+' : ''}${comp.diff.toFixed(1)} MD
                                                </span>
                                            ` : '<span class="comp-no-diff">—</span>'}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCalculationsComparison(versionToCompare) {
        
        // Get current calculations data directly from the calculations manager if available
        const currentCalculationsManager = this.app.calculationsManager;
        const currentVendorCosts = currentCalculationsManager?.vendorCosts || [];
        
        
        // Get compare version data from snapshot
        const compareProject = versionToCompare.projectSnapshot;
        const compareOverrides = compareProject.finalMDsOverrides || {};
        
        
        // Try to reconstruct compare vendor costs from snapshot
        const compareVendorCosts = this.reconstructVendorCostsSimplified(compareProject);
        
        
        // If we have current data but no compare data, try to get it from stored calculation data
        if (currentVendorCosts.length > 0 && compareVendorCosts.length === 0) {
            // Check if version snapshot contains stored calculation data
            if (compareProject.calculationData?.vendorCosts) {
                compareVendorCosts.push(...compareProject.calculationData.vendorCosts);
            }
        }
        
        // Create unified comparison data
        const allVendorKeys = new Set([
            ...currentVendorCosts.map(c => `${c.vendor}-${c.role}-${c.department}`),
            ...compareVendorCosts.map(c => `${c.vendor}-${c.role}-${c.department}`)
        ]);
        
        
        const vendorComparisons = Array.from(allVendorKeys).map(vendorKey => {
            const currentCost = currentVendorCosts.find(c => `${c.vendor}-${c.role}-${c.department}` === vendorKey);
            const compareCost = compareVendorCosts.find(c => `${c.vendor}-${c.role}-${c.department}` === vendorKey);
            
            const currentFinalMDs = currentCost?.finalMDs || 0;
            const compareFinalMDs = compareCost?.finalMDs || 0;
            const currentFinalCost = currentCost ? (currentFinalMDs * (currentCost.officialRate || currentCost.rate || 0)) : 0;
            const compareFinalCost = compareCost ? (compareFinalMDs * (compareCost.officialRate || compareCost.rate || 0)) : 0;
            
            const mdsDiff = currentFinalMDs - compareFinalMDs;
            const costDiff = currentFinalCost - compareFinalCost;
            
            return {
                vendor: currentCost?.vendor || compareCost?.vendor || '',
                role: currentCost?.role || compareCost?.role || '',
                department: currentCost?.department || compareCost?.department || '',
                currentFinalMDs,
                compareFinalMDs,
                currentFinalCost,
                compareFinalCost,
                mdsDiff,
                costDiff,
                hasMDsDiff: Math.abs(mdsDiff) > 0.1,
                hasCostDiff: Math.abs(costDiff) > 0.1
            };
        }).filter(c => c.vendor); // Remove empty entries
        
        
        if (vendorComparisons.length === 0) {
            return `
                <div class="comp-section comp-calculations">
                    <div class="comp-section-header">
                        <h5><i class="fas fa-calculator"></i> Calculations</h5>
                    </div>
                    <div class="comp-section-body">
                        <div class="comp-no-data">
                            <i class="fas fa-info-circle"></i>
                            <span>No calculation data available for comparison.</span>
                            <small>This may occur if calculations weren't generated for one or both versions.</small>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="comp-section comp-calculations">
                <div class="comp-section-header">
                    <h5><i class="fas fa-calculator"></i> Calculations Comparison</h5>
                    <small>${vendorComparisons.length} vendor${vendorComparisons.length !== 1 ? 's' : ''} compared</small>
                </div>
                <div class="comp-section-body">
                    <div class="comp-calc-container">
                        <div class="comp-calc-header">
                            <div class="comp-calc-vendor-col">Vendor & Role</div>
                            <div class="comp-calc-data-cols">
                                <div class="comp-calc-version-group comp-current">
                                    <div class="comp-version-label">Current Version</div>
                                    <div class="comp-calc-sub-headers">
                                        <span>Final MDs</span>
                                        <span>Final Cost</span>
                                    </div>
                                </div>
                                <div class="comp-calc-version-group comp-compare">
                                    <div class="comp-version-label">Version ${versionToCompare.id}</div>
                                    <div class="comp-calc-sub-headers">
                                        <span>Final MDs</span>
                                        <span>Final Cost</span>
                                    </div>
                                </div>
                                <div class="comp-calc-diff-col">
                                    <div class="comp-version-label">Difference</div>
                                    <div class="comp-calc-sub-headers">
                                        <span>MDs</span>
                                        <span>Cost</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="comp-calc-rows">
                            ${vendorComparisons.map(comp => `
                                <div class="comp-calc-row ${comp.hasMDsDiff || comp.hasCostDiff ? 'comp-has-diff' : ''}">
                                    <div class="comp-calc-vendor-info">
                                        <div class="comp-vendor-name">${comp.vendor}</div>
                                        <div class="comp-vendor-details">${comp.role} • ${comp.department}</div>
                                    </div>
                                    <div class="comp-calc-data">
                                        <div class="comp-calc-version-data comp-current">
                                            <div class="comp-calc-mds ${comp.hasMDsDiff ? 'comp-different' : ''}">${comp.currentFinalMDs} MD</div>
                                            <div class="comp-calc-cost ${comp.hasCostDiff ? 'comp-different' : ''}">€${comp.currentFinalCost.toLocaleString()}</div>
                                        </div>
                                        <div class="comp-calc-version-data comp-compare">
                                            <div class="comp-calc-mds ${comp.hasMDsDiff ? 'comp-different' : ''}">${comp.compareFinalMDs} MD</div>
                                            <div class="comp-calc-cost ${comp.hasCostDiff ? 'comp-different' : ''}">€${comp.compareFinalCost.toLocaleString()}</div>
                                        </div>
                                        <div class="comp-calc-diff">
                                            <div class="comp-calc-mds-diff">
                                                ${comp.hasMDsDiff ? `
                                                    <span class="comp-diff-value ${comp.mdsDiff > 0 ? 'comp-positive' : 'comp-negative'}">
                                                        ${comp.mdsDiff > 0 ? '+' : ''}${comp.mdsDiff.toFixed(1)} MD
                                                    </span>
                                                ` : '<span class="comp-no-diff">—</span>'}
                                            </div>
                                            <div class="comp-calc-cost-diff">
                                                ${comp.hasCostDiff ? `
                                                    <span class="comp-diff-value ${comp.costDiff > 0 ? 'comp-positive' : 'comp-negative'}">
                                                        ${comp.costDiff > 0 ? '+' : ''}€${Math.abs(comp.costDiff).toLocaleString()}
                                                    </span>
                                                ` : '<span class="comp-no-diff">—</span>'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    reconstructVendorCostsSimplified(projectSnapshot) {
        const vendorCosts = [];
        
        try {
            // First, check if we have stored calculation data in the snapshot
            if (projectSnapshot.calculationData?.vendorCosts) {
                return projectSnapshot.calculationData.vendorCosts;
            }
            
            // Fallback: try to reconstruct from basic project data
            const finalMDsOverrides = projectSnapshot.finalMDsOverrides || {};
            
            // Get configuration data
            const globalSuppliers = projectSnapshot.projectOverrides?.suppliers || [];
            const globalConfig = this.app.configManager?.config?.global?.suppliers || [];
            const allSuppliers = [...globalSuppliers, ...globalConfig];
            
            
            // Process finalMDsOverrides to create vendor costs
            Object.entries(finalMDsOverrides).forEach(([key, finalMDs]) => {
                const [supplierId, role, department] = key.split('_');
                const supplier = allSuppliers.find(s => s.id === supplierId);
                
                if (supplier && finalMDs > 0) {
                    vendorCosts.push({
                        vendor: supplier.name,
                        vendorId: supplier.id,
                        role: role,
                        department: department || 'Unknown',
                        finalMDs: finalMDs,
                        rate: supplier.rate || 0,
                        officialRate: supplier.rate || 0,
                        isInternal: supplier.type === 'internal'
                    });
                }
            });
            
            
        } catch (error) {
            console.error('Error reconstructing vendor costs:', error);
        }
        
        return vendorCosts;
    }

    async handleExportVersion(versionId) {
        
        if (!this.app.currentProject) {
            NotificationManager.show('No project loaded', 'error');
            return;
        }

        // Find the version to export
        const versionToExport = this.currentVersions.find(v => v.id === versionId);
        if (!versionToExport) {
            NotificationManager.show('Version not found', 'error');
            return;
        }

        // Validate version integrity
        if (!this.validateVersion(versionToExport)) {
            NotificationManager.show('Version data is corrupted and cannot be exported', 'error');
            return;
        }

        try {
            this.showLoading('Exporting version...');

            // Create export data with metadata
            const exportData = {
                version: versionToExport,
                exportedAt: new Date().toISOString(),
                originalProject: {
                    name: this.app.currentProject.project.name,
                    id: this.app.currentProject.project.id
                }
            };

            // Generate filename
            const projectName = this.app.currentProject.project.name.replace(/[^a-z0-9]/gi, '_');
            const filename = `${projectName}_${versionId}_${new Date().toISOString().split('T')[0]}.json`;

            // Use Electron API to save file
            if (window.electronAPI && window.electronAPI.saveFile) {
                const result = await window.electronAPI.saveFile(filename, exportData);
                if (result.success) {
                    NotificationManager.show(`Version ${versionId} exported successfully`, 'success');
                } else if (!result.canceled) {
                    NotificationManager.show('Failed to export version', 'error');
                }
            } else {
                // Fallback: download as file (web version)
                this.downloadAsFile(filename, exportData);
                NotificationManager.show(`Version ${versionId} exported successfully`, 'success');
            }

        } catch (error) {
            console.error('Failed to export version:', error);
            NotificationManager.show('Failed to export version', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Download data as file (fallback for web version)
     */
    downloadAsFile(filename, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    handleDeleteVersion(versionId) {
        
        if (!this.app.currentProject) {
            NotificationManager.show('No project loaded', 'error');
            return;
        }

        // Find the version to delete
        const versionToDelete = this.currentVersions.find(v => v.id === versionId);
        if (!versionToDelete) {
            NotificationManager.show('Version not found', 'error');
            return;
        }

        // Prevent deleting the current version if it's the only one
        if (this.currentVersions.length === 1) {
            NotificationManager.show('Cannot delete the only version', 'error');
            return;
        }

        // Prevent deleting current version
        const currentVersion = this.getCurrentVersion();
        if (versionId === currentVersion) {
            NotificationManager.show('Cannot delete the current version', 'error');
            return;
        }

        this.showDeleteConfirmationModal(versionToDelete);
    }

    /**
     * Show delete confirmation modal
     */
    showDeleteConfirmationModal(versionToDelete) {
        const modal = document.createElement('div');
        modal.className = 'modal version-delete-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Delete Version ${versionToDelete.id}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="version-delete-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Warning:</strong> This action cannot be undone. 
                            The version and all its data will be permanently deleted.
                        </div>
                    </div>
                    
                    <div class="version-details">
                        <div class="version-detail-row">
                            <span class="version-detail-label">Version:</span>
                            <span class="version-detail-value">${versionToDelete.id}</span>
                        </div>
                        <div class="version-detail-row">
                            <span class="version-detail-label">Created:</span>
                            <span class="version-detail-value">${this.formatDate(versionToDelete.timestamp)}</span>
                        </div>
                        <div class="version-detail-row">
                            <span class="version-detail-label">Reason:</span>
                            <span class="version-detail-value">${versionToDelete.reason}</span>
                        </div>
                    </div>
                    
                    <div class="version-stats-summary">
                        <h4>Version contains:</h4>
                        ${this.renderVersionStats(versionToDelete)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-delete-btn">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-btn">
                        <i class="fas fa-trash"></i> Delete Version
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Handle confirmation
        const confirmBtn = modal.querySelector('#confirm-delete-btn');
        confirmBtn.addEventListener('click', async () => {
            document.body.removeChild(modal);
            await this.performDelete(versionToDelete);
        });

        // Handle cancel
        const cancelBtn = modal.querySelector('#cancel-delete-btn');
        const closeBtn = modal.querySelector('.modal-close');
        [cancelBtn, closeBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Perform the actual version deletion
     */
    async performDelete(versionToDelete) {
        try {
            this.showLoading('Deleting version...');

            // Remove version from current versions array
            const index = this.currentVersions.findIndex(v => v.id === versionToDelete.id);
            if (index !== -1) {
                this.currentVersions.splice(index, 1);
                
                // PURE STATE MANAGER: Use store action instead of direct mutation
                this.store.getState().updateProjectVersions([...this.currentVersions]);
                
                // Save project to persist the deletion
                await this.app.saveProject();
                
                // Refresh UI
                this.render();
                
                NotificationManager.show(`Version ${versionToDelete.id} deleted successfully`, 'success');
            } else {
                NotificationManager.show('Version not found in current project', 'error');
            }

        } catch (error) {
            console.error('Failed to delete version:', error);
            NotificationManager.show('Failed to delete version', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showCleanupModal() {
        if (!this.app.currentProject || this.currentVersions.length < 10) {
            NotificationManager.show('Cleanup is only available when there are 10 or more versions', 'info');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal version-cleanup-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Cleanup Old Versions</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="cleanup-info">
                        <i class="fas fa-broom"></i>
                        <div>
                            <p><strong>Clean up old versions to reduce file size and improve performance.</strong></p>
                            <p>Current versions: <strong>${this.currentVersions.length}</strong> (approaching limit of ${this.maxVersions})</p>
                        </div>
                    </div>
                    
                    <div class="cleanup-options">
                        <h4>Cleanup Options:</h4>
                        
                        <div class="cleanup-option">
                            <input type="radio" id="keep-recent" name="cleanup-strategy" value="recent" checked>
                            <label for="keep-recent">
                                <strong>Keep Recent Versions</strong>
                                <span>Keep the 20 most recent versions</span>
                            </label>
                        </div>
                        
                        <div class="cleanup-option">
                            <input type="radio" id="keep-milestones" name="cleanup-strategy" value="milestones">
                            <label for="keep-milestones">
                                <strong>Keep Milestone Versions</strong>
                                <span>Keep versions with words like "release", "milestone", "final" in reason</span>
                            </label>
                        </div>
                        
                        <div class="cleanup-option">
                            <input type="radio" id="custom-count" name="cleanup-strategy" value="custom">
                            <label for="custom-count">
                                <strong>Custom Count</strong>
                                <span>Keep a specific number of recent versions</span>
                            </label>
                            <input type="number" id="custom-version-count" min="5" max="30" value="15" class="custom-input">
                        </div>
                    </div>
                    
                    <div class="cleanup-preview" id="cleanup-preview">
                        <!-- Preview will be populated here -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-cleanup-btn">Cancel</button>
                    <button type="button" class="btn btn-warning" id="preview-cleanup-btn">Preview Cleanup</button>
                    <button type="button" class="btn btn-danger" id="confirm-cleanup-btn" disabled>
                        <i class="fas fa-broom"></i> Perform Cleanup
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Setup event listeners
        const previewBtn = modal.querySelector('#preview-cleanup-btn');
        const confirmBtn = modal.querySelector('#confirm-cleanup-btn');
        const strategyInputs = modal.querySelectorAll('input[name="cleanup-strategy"]');
        const customInput = modal.querySelector('#custom-version-count');

        // Enable custom input only when custom strategy is selected
        strategyInputs.forEach(input => {
            input.addEventListener('change', () => {
                customInput.disabled = input.value !== 'custom';
                confirmBtn.disabled = true; // Reset confirmation
            });
        });

        customInput.addEventListener('input', () => {
            confirmBtn.disabled = true; // Reset confirmation when count changes
        });

        // Preview cleanup
        previewBtn.addEventListener('click', () => {
            const strategy = modal.querySelector('input[name="cleanup-strategy"]:checked').value;
            const customCount = parseInt(customInput.value) || 15;
            const preview = this.previewCleanup(strategy, customCount);
            this.renderCleanupPreview(modal.querySelector('#cleanup-preview'), preview);
            confirmBtn.disabled = false;
        });

        // Confirm cleanup
        confirmBtn.addEventListener('click', async () => {
            const strategy = modal.querySelector('input[name="cleanup-strategy"]:checked').value;
            const customCount = parseInt(customInput.value) || 15;
            document.body.removeChild(modal);
            await this.performCleanup(strategy, customCount);
        });

        // Handle cancel
        const cancelBtn = modal.querySelector('#cancel-cleanup-btn');
        const closeBtn = modal.querySelector('.modal-close');
        [cancelBtn, closeBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Preview cleanup based on strategy
     */
    previewCleanup(strategy, customCount) {
        const currentVersion = this.getCurrentVersion();
        let versionsToKeep = [];
        let versionsToDelete = [];

        switch (strategy) {
            case 'recent':
                // Keep 20 most recent versions
                const sortedByDate = [...this.currentVersions].sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                versionsToKeep = sortedByDate.slice(0, 20);
                versionsToDelete = sortedByDate.slice(20);
                break;

            case 'milestones':
                // Keep versions with milestone keywords
                const milestoneKeywords = ['release', 'milestone', 'final', 'production', 'deploy', 'launch', 'stable'];
                versionsToKeep = this.currentVersions.filter(v => {
                    const reason = v.reason.toLowerCase();
                    return milestoneKeywords.some(keyword => reason.includes(keyword)) || 
                           v.id === currentVersion;
                });
                versionsToDelete = this.currentVersions.filter(v => !versionsToKeep.includes(v));
                break;

            case 'custom':
                // Keep custom count of recent versions
                const sortedCustom = [...this.currentVersions].sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                versionsToKeep = sortedCustom.slice(0, customCount);
                versionsToDelete = sortedCustom.slice(customCount);
                break;
        }

        // Ensure current version is always kept
        if (!versionsToKeep.some(v => v.id === currentVersion)) {
            const currentVersionObj = this.currentVersions.find(v => v.id === currentVersion);
            if (currentVersionObj) {
                versionsToKeep.push(currentVersionObj);
                versionsToDelete = versionsToDelete.filter(v => v.id !== currentVersion);
            }
        }

        return {
            strategy,
            customCount,
            versionsToKeep: versionsToKeep.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
            versionsToDelete: versionsToDelete.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
            originalCount: this.currentVersions.length
        };
    }

    /**
     * Render cleanup preview
     */
    renderCleanupPreview(container, preview) {
        container.innerHTML = `
            <div class="cleanup-summary">
                <h4>Cleanup Preview</h4>
                <div class="summary-stats">
                    <div class="summary-item keep">
                        <span class="count">${preview.versionsToKeep.length}</span>
                        <span class="label">Versions to Keep</span>
                    </div>
                    <div class="summary-item delete">
                        <span class="count">${preview.versionsToDelete.length}</span>
                        <span class="label">Versions to Delete</span>
                    </div>
                </div>
            </div>
            
            ${preview.versionsToDelete.length > 0 ? `
                <div class="versions-to-delete">
                    <h5>Versions that will be deleted:</h5>
                    <div class="version-list">
                        ${preview.versionsToDelete.map(v => `
                            <div class="version-item">
                                <span class="version-id">${v.id}</span>
                                <span class="version-date">${this.formatDate(v.timestamp)}</span>
                                <span class="version-reason">${this.truncateText(v.reason, 40)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '<p class="no-cleanup">No versions will be deleted with this strategy.</p>'}
        `;
    }

    /**
     * Perform cleanup
     */
    async performCleanup(strategy, customCount) {
        try {
            this.showLoading('Cleaning up versions...');

            const preview = this.previewCleanup(strategy, customCount);
            
            if (preview.versionsToDelete.length === 0) {
                NotificationManager.show('No versions to clean up', 'info');
                return;
            }

            // Update versions array
            this.currentVersions = preview.versionsToKeep;
            this.app.currentProject.versions = this.currentVersions;

            // Save project
            await this.app.saveProject();

            // Refresh UI
            this.render();

            NotificationManager.show(
                `Cleanup completed: ${preview.versionsToDelete.length} versions deleted, ${preview.versionsToKeep.length} kept`, 
                'success'
            );


        } catch (error) {
            console.error('Failed to cleanup versions:', error);
            NotificationManager.show('Failed to cleanup versions', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Show import version modal
     */
    showImportModal() {
        if (!this.app.currentProject) {
            NotificationManager.show('No project loaded', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal version-import-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Import Version</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="version-import-info">
                        <i class="fas fa-upload"></i>
                        <div>
                            <p><strong>Import a previously exported version file</strong></p>
                            <p>Select a JSON file that was exported from this or another project.</p>
                        </div>
                    </div>
                    
                    <div class="import-file-section">
                        <input type="file" id="import-file-input" accept=".json" style="display: none;">
                        <button class="btn btn-primary" id="select-import-file-btn">
                            <i class="fas fa-file-upload"></i> Select Version File
                        </button>
                        <div id="import-file-info" class="version-file-info" style="display: none;">
                            <i class="fas fa-file-code"></i>
                            <span id="import-file-name"></span>
                            <span id="import-file-size"></span>
                        </div>
                    </div>
                    
                    <div id="import-preview" class="import-preview" style="display: none;">
                        <!-- Import preview will be populated here -->
                    </div>
                    
                    <div class="import-options" id="import-options" style="display: none;">
                        <h4>Import Options:</h4>
                        <div class="version-option-group">
                            <label>
                                <input type="radio" name="import-strategy" value="add" checked>
                                <strong>Add to current versions</strong>
                                <span class="version-option-desc">Add the imported version to your current project</span>
                            </label>
                        </div>
                        <div class="version-option-group">
                            <label>
                                <input type="radio" name="import-strategy" value="replace-id">
                                <strong>Replace if version ID exists</strong>
                                <span class="version-option-desc">Replace existing version if same ID is found</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-import-btn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="perform-import-btn" disabled>
                        <i class="fas fa-upload"></i> Import Version
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Setup file input
        const fileInput = modal.querySelector('#import-file-input');
        const selectBtn = modal.querySelector('#select-import-file-btn');
        const fileInfo = modal.querySelector('#import-file-info');
        const fileName = modal.querySelector('#import-file-name');
        const fileSize = modal.querySelector('#import-file-size');
        const preview = modal.querySelector('#import-preview');
        const options = modal.querySelector('#import-options');
        const importBtn = modal.querySelector('#perform-import-btn');

        let selectedFile = null;
        let importData = null;

        selectBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            selectedFile = file;
            fileName.textContent = file.name;
            fileSize.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
            fileInfo.style.display = 'flex';

            try {
                const content = await this.readFileAsText(file);
                importData = JSON.parse(content);
                
                if (this.validateImportData(importData)) {
                    this.renderImportPreview(preview, importData);
                    preview.style.display = 'block';
                    options.style.display = 'block';
                    importBtn.disabled = false;
                } else {
                    NotificationManager.show('Invalid version file format', 'error');
                    importBtn.disabled = true;
                }
            } catch (error) {
                console.error('Failed to read import file:', error);
                NotificationManager.show('Failed to read file. Please check the file format.', 'error');
                importBtn.disabled = true;
            }
        });

        // Handle import
        importBtn.addEventListener('click', async () => {
            if (!importData) return;
            
            const strategy = modal.querySelector('input[name="import-strategy"]:checked').value;
            document.body.removeChild(modal);
            await this.performImport(importData, strategy);
        });

        // Handle cancel
        const cancelBtn = modal.querySelector('#cancel-import-btn');
        const closeBtn = modal.querySelector('.modal-close');
        [cancelBtn, closeBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * Read file as text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    /**
     * Validate import data format
     */
    validateImportData(data) {
        try {
            // Check if it's an export file with version data
            if (data.version && data.version.id && data.version.projectSnapshot) {
                return true;
            }
            
            // Check if it's a direct version object
            if (data.id && data.projectSnapshot && data.timestamp) {
                return true;
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Render import preview
     */
    renderImportPreview(container, importData) {
        const versionData = importData.version || importData;
        const stats = this.calculateVersionStats(versionData.projectSnapshot);
        
        container.innerHTML = `
            <div class="import-preview-content">
                <h4>Version Preview</h4>
                <div class="version-import-details">
                    <div class="version-detail-row">
                        <span class="version-detail-label">Version ID:</span>
                        <span class="version-detail-value">${versionData.id}</span>
                    </div>
                    <div class="version-detail-row">
                        <span class="version-detail-label">Created:</span>
                        <span class="version-detail-value">${this.formatDate(versionData.timestamp)}</span>
                    </div>
                    <div class="version-detail-row">
                        <span class="version-detail-label">Reason:</span>
                        <span class="version-detail-value">${versionData.reason}</span>
                    </div>
                    ${importData.originalProject ? `
                        <div class="version-detail-row">
                            <span class="version-detail-label">Original Project:</span>
                            <span class="version-detail-value">${importData.originalProject.name}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="version-import-stats">
                    <h5>Version Contents:</h5>
                    <div class="version-stats-grid">
                        <div class="version-preview-stat-item">
                            <span class="version-preview-stat-label">Features:</span>
                            <span class="version-preview-stat-value">${stats.features}</span>
                        </div>
                        <div class="version-preview-stat-item">
                            <span class="version-preview-stat-label">Total MDs:</span>
                            <span class="version-preview-stat-value">${stats.totalMDs}</span>
                        </div>
                        <div class="version-preview-stat-item">
                            <span class="version-preview-stat-label">Phases:</span>
                            <span class="version-preview-stat-value">${stats.phases}</span>
                        </div>
                        <div class="version-preview-stat-item">
                            <span class="version-preview-stat-label">Coverage:</span>
                            <span class="version-preview-stat-value">${stats.coverage}</span>
                        </div>
                    </div>
                </div>
                
                ${this.checkVersionConflict(versionData.id) ? `
                    <div class="version-import-conflict">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Version ID Conflict:</strong> A version with ID "${versionData.id}" already exists in this project.
                            Choose "Replace if version ID exists" to overwrite it, or the version will be imported with a new ID.
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Check if version ID already exists
     */
    checkVersionConflict(versionId) {
        return this.currentVersions.some(v => v.id === versionId);
    }

    /**
     * Perform version import
     */
    async performImport(importData, strategy) {
        try {
            this.showLoading('Importing version...');

            const versionData = importData.version || importData;
            
            // Validate version checksum if available
            if (versionData.checksum && !this.validateVersion(versionData)) {
                NotificationManager.show('Version data integrity check failed', 'error');
                return;
            }

            let finalVersionData = { ...versionData };

            // Handle version ID conflicts based on strategy
            if (strategy === 'add' && this.checkVersionConflict(versionData.id)) {
                // Generate new ID to avoid conflict
                finalVersionData.id = this.generateNextVersionId();
                finalVersionData.reason = `Imported: ${versionData.reason}`;
                
                // Regenerate checksum for modified data
                finalVersionData.checksum = this.generateChecksum(finalVersionData.projectSnapshot);
            } else if (strategy === 'replace-id' && this.checkVersionConflict(versionData.id)) {
                // Remove existing version with same ID
                const existingIndex = this.currentVersions.findIndex(v => v.id === versionData.id);
                if (existingIndex !== -1) {
                    this.currentVersions.splice(existingIndex, 1);
                }
            }

            // Add import metadata
            finalVersionData.importedAt = new Date().toISOString();
            if (importData.originalProject) {
                finalVersionData.originalProject = importData.originalProject;
            }

            // Add version to project
            this.currentVersions.push(finalVersionData);
            this.app.currentProject.versions = this.currentVersions;

            // Save project
            await this.app.saveProject();

            // Refresh UI
            this.render();

            NotificationManager.show(
                `Version ${finalVersionData.id} imported successfully${strategy === 'add' && versionData.id !== finalVersionData.id ? ` (renamed from ${versionData.id})` : ''}`,
                'success'
            );


        } catch (error) {
            console.error('Failed to import version:', error);
            NotificationManager.show('Failed to import version', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Cleanup event listeners to prevent memory leaks
     * Should be called when the component is no longer needed
     */
    destroy() {
        // Remove global event listeners
        if (this.boundHandlers.keyboardShortcuts) {
            document.removeEventListener('keydown', this.boundHandlers.keyboardShortcuts);
        }
        
        // Clear bound handlers
        this.boundHandlers = {};
        
        // Clear references to prevent memory leaks
        this.app = null;
        this.currentVersions = [];
    }
}