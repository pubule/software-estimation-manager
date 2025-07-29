/**
 * Data Manager - Handles all data persistence operations with file system
 */

class DataManager {
    constructor() {
        this.currentProjectPath = null;
    }

    /**
     * Save project to file system
     * @param {Object} projectData - Complete project data
     * @param {string} filePath - Optional file path (for save as)
     */
    async saveProject(projectData, filePath = null) {
        try {
            // Validate data before saving
            this.validateProjectData(projectData);

            // Update project metadata
            projectData.project.lastModified = new Date().toISOString();

            let result;

            if (window.electronAPI && window.electronAPI.saveProjectFile) {
                // Use Electron file system
                if (filePath) {
                    result = await this.saveToSpecificFile(projectData, filePath);
                } else {
                    result = await window.electronAPI.saveProjectFile(projectData);
                }

                if (result?.success) {
                    this.currentProjectPath = result.filePath;
                    console.log('Project saved to:', result.filePath);
                    return result;
                } else {
                    throw new Error(result?.error || 'Failed to save project');
                }
            } else {
                // Fallback to localStorage for development/testing
                console.warn('electronAPI not available, using localStorage fallback');
                const key = `software-estimation-project-${projectData.project.id}`;
                localStorage.setItem(key, JSON.stringify(projectData));
                return {
                    success: true,
                    filePath: 'localStorage',
                    fileName: `${projectData.project.name}.json`,
                    method: 'localStorage'
                };
            }
        } catch (error) {
            console.error('DataManager: Save project failed:', error);
            throw error;
        }
    }

    /**
     * Load project from file system
     * @param {string} filePath - File path to load
     */
    async loadProject(filePath) {
        try {
            if (window.electronAPI && window.electronAPI.loadProjectFile) {
                // Use Electron file system
                const result = await window.electronAPI.loadProjectFile(filePath);

                if (result?.success) {
                    this.validateProjectData(result.data);
                    this.currentProjectPath = filePath;
                    console.log('Project loaded from:', filePath);
                    return result.data;
                } else {
                    throw new Error(result?.error || 'Failed to load project');
                }
            } else {
                // Fallback to localStorage
                console.warn('electronAPI not available, using localStorage fallback');
                const data = localStorage.getItem(filePath);
                if (!data) {
                    throw new Error('Project not found in localStorage');
                }
                const projectData = JSON.parse(data);
                this.validateProjectData(projectData);
                return projectData;
            }
        } catch (error) {
            console.error('DataManager: Load project failed:', error);
            throw error;
        }
    }

    /**
     * Get list of all projects
     */
    async listProjects() {
        try {
            if (window.electronAPI && window.electronAPI.listProjects) {
                // Use Electron file system
                const result = await window.electronAPI.listProjects();

                if (result?.success) {
                    return result.projects;
                } else {
                    throw new Error(result?.error || 'Failed to list projects');
                }
            } else {
                // Fallback to localStorage
                console.warn('electronAPI not available, using localStorage fallback');
                const projects = [];

                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('software-estimation-project-')) {
                        try {
                            const data = localStorage.getItem(key);
                            const projectData = JSON.parse(data);
                            if (projectData && projectData.project) {
                                projects.push({
                                    filePath: key,
                                    fileName: `${projectData.project.name}.json`,
                                    project: projectData.project,
                                    fileSize: data.length,
                                    lastModified: projectData.project.lastModified
                                });
                            }
                        } catch (e) {
                            // Skip invalid data
                        }
                    }
                }

                return projects.sort((a, b) =>
                    new Date(b.lastModified) - new Date(a.lastModified)
                );
            }
        } catch (error) {
            console.error('DataManager: List projects failed:', error);
            return [];
        }
    }

    /**
     * Delete project file
     * @param {string} filePath - File path to delete
     */
    async deleteProject(filePath) {
        try {
            if (window.electronAPI && window.electronAPI.deleteProjectFile) {
                // Use Electron file system
                const result = await window.electronAPI.deleteProjectFile(filePath);

                if (result?.success) {
                    if (this.currentProjectPath === filePath) {
                        this.currentProjectPath = null;
                    }
                    return true;
                } else {
                    throw new Error(result?.error || 'Failed to delete project');
                }
            } else {
                // Fallback to localStorage
                console.warn('electronAPI not available, using localStorage fallback');
                localStorage.removeItem(filePath);
                return true;
            }
        } catch (error) {
            console.error('DataManager: Delete project failed:', error);
            throw error;
        }
    }

    /**
     * Get current projects folder path
     */
    async getProjectsPath() {
        try {
            if (window.electronAPI && window.electronAPI.getProjectsPath) {
                return await window.electronAPI.getProjectsPath();
            } else {
                return 'localStorage'; // Fallback indicator
            }
        } catch (error) {
            console.error('Failed to get projects path:', error);
            return null;
        }
    }

    /**
     * Set projects folder path
     * @param {string} newPath - New projects folder path
     */
    async setProjectsPath(newPath) {
        try {
            if (window.electronAPI && window.electronAPI.setProjectsPath) {
                const result = await window.electronAPI.setProjectsPath(newPath);
                return result?.success || false;
            } else {
                console.warn('electronAPI not available, cannot set projects path');
                return false;
            }
        } catch (error) {
            console.error('Failed to set projects path:', error);
            return false;
        }
    }

    /**
     * Choose projects folder with dialog
     */
    async chooseProjectsFolder() {
        try {
            if (window.electronAPI && window.electronAPI.chooseProjectsFolder) {
                const result = await window.electronAPI.chooseProjectsFolder();
                return result;
            } else {
                console.warn('electronAPI not available, cannot choose projects folder');
                return { success: false, error: 'Feature not available in this mode' };
            }
        } catch (error) {
            console.error('Failed to choose projects folder:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Open projects folder in file explorer
     */
    async openProjectsFolder() {
        try {
            if (window.electronAPI && window.electronAPI.openProjectsFolder) {
                const result = await window.electronAPI.openProjectsFolder();
                return result?.success || false;
            } else {
                console.warn('electronAPI not available, cannot open projects folder');
                return false;
            }
        } catch (error) {
            console.error('Failed to open projects folder:', error);
            return false;
        }
    }

    /**
     * Save to specific file (for export)
     */
    async saveToSpecificFile(projectData, filePath) {
        try {
            // This would use a different IPC call for custom file paths
            // For now, download as file
            const dataStr = JSON.stringify(projectData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filePath;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true, filePath: filePath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Auto-save method removed

    /**
     * Get application settings
     */
    async getSettings() {
        try {
            if (window.electronAPI && window.electronAPI.getSettings) {
                const result = await window.electronAPI.getSettings();
                return result?.success ? result.settings : {};
            } else {
                // Fallback to localStorage
                const settings = localStorage.getItem('app-settings');
                return settings ? JSON.parse(settings) : {};
            }
        } catch (error) {
            console.error('Failed to get settings:', error);
            return {};
        }
    }

    /**
     * Save application settings
     */
    async saveSettings(settings) {
        try {
            if (window.electronAPI && window.electronAPI.saveSettings) {
                const result = await window.electronAPI.saveSettings(settings);
                return result?.success || false;
            } else {
                // Fallback to localStorage
                localStorage.setItem('app-settings', JSON.stringify(settings));
                return true;
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Create a version snapshot of the project
     * @param {Object} projectData - Project data to version
     */
    async createVersion(projectData) {
        try {
            // Load existing versions
            const versionsData = localStorage.getItem(this.versionsKey);
            const versions = versionsData ? JSON.parse(versionsData) : [];

            // Create version entry
            const version = {
                id: this.generateId(),
                version: projectData.project.version,
                timestamp: new Date().toISOString(),
                comment: projectData.project.comment || 'Manual save',
                projectData: JSON.parse(JSON.stringify(projectData)), // Deep clone
                size: JSON.stringify(projectData).length
            };

            // Add to versions array
            versions.unshift(version);

            // Keep only last 50 versions
            if (versions.length > 50) {
                versions.splice(50);
            }

            // Save versions
            localStorage.setItem(this.versionsKey, JSON.stringify(versions));

            return version;
        } catch (error) {
            console.error('DataManager: Create version failed:', error);
            // Don't throw error here to avoid breaking the main save operation
        }
    }

    /**
     * Load version history
     */
    async loadVersions() {
        try {
            const data = localStorage.getItem(this.versionsKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('DataManager: Load versions failed:', error);
            return [];
        }
    }

    /**
     * Validate project data structure
     * @param {Object} projectData - Project data to validate
     */
    validateProjectData(projectData) {
        if (!projectData || typeof projectData !== 'object') {
            throw new Error('Invalid project data: must be an object');
        }

        // Check required top-level properties
        const requiredProps = ['project', 'features', 'phases', 'config'];
        for (const prop of requiredProps) {
            if (!(prop in projectData)) {
                throw new Error(`Invalid project data: missing required property '${prop}'`);
            }
        }

        // Validate project metadata
        if (!projectData.project || typeof projectData.project !== 'object') {
            throw new Error('Invalid project data: project metadata must be an object');
        }

        if (!projectData.project.id || !projectData.project.name) {
            throw new Error('Invalid project data: project must have id and name');
        }

        // Validate features array
        if (!Array.isArray(projectData.features)) {
            throw new Error('Invalid project data: features must be an array');
        }

        // Validate each feature
        projectData.features.forEach((feature, index) => {
            this.validateFeature(feature, index);
        });

        // Validate phases object
        if (!projectData.phases || typeof projectData.phases !== 'object') {
            throw new Error('Invalid project data: phases must be an object');
        }

        // Validate configuration
        if (!projectData.config || typeof projectData.config !== 'object') {
            throw new Error('Invalid project data: config must be an object');
        }
    }

    /**
     * Validate individual feature
     * @param {Object} feature - Feature to validate
     * @param {number} index - Feature index for error reporting
     */
    validateFeature(feature, index) {
        if (!feature || typeof feature !== 'object') {
            throw new Error(`Invalid feature at index ${index}: must be an object`);
        }

        // Required properties
        const requiredProps = ['id', 'description'];
        for (const prop of requiredProps) {
            if (!feature[prop]) {
                throw new Error(`Invalid feature at index ${index}: missing required property '${prop}'`);
            }
        }

        // Validate man days
        if ('manDays' in feature) {
            const manDays = parseFloat(feature.manDays);
            if (isNaN(manDays) || manDays < 0) {
                throw new Error(`Invalid feature at index ${index}: manDays must be a positive number`);
            }
        }
    }

    /**
     * Generate CSV from project data
     * @param {Object} projectData - Project data
     */
    generateCSV(projectData) {
        const features = projectData.features || [];

        if (features.length === 0) {
            return 'No features to export';
        }

        // CSV headers
        const headers = [
            'ID',
            'Description',
            'Category',
            'Supplier',
            'Man Days',
            'Notes',
            'Created',
            'Modified'
        ];

        // Convert features to CSV rows
        const rows = features.map(feature => [
            this.escapeCsvField(feature.id || ''),
            this.escapeCsvField(feature.description || ''),
            this.escapeCsvField(this.getCategoryName(projectData, feature.category) || ''),
            this.escapeCsvField(this.getSupplierName(projectData, feature.supplier) || ''),
            feature.manDays || 0,
            this.escapeCsvField(feature.notes || ''),
            feature.created || '',
            feature.modified || ''
        ]);

        // Combine headers and rows
        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');

        return csvContent;
    }

    /**
     * Escape CSV field
     * @param {string} field - Field to escape
     */
    escapeCsvField(field) {
        if (typeof field !== 'string') {
            field = String(field);
        }

        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return '"' + field.replace(/"/g, '""') + '"';
        }

        return field;
    }

    /**
     * Get category name by ID
     * @param {Object} projectData - Project data
     * @param {string} categoryId - Category ID
     */
    getCategoryName(projectData, categoryId) {
        if (!categoryId) return '';
        const category = projectData.config?.categories?.find(c => c.id === categoryId);
        return category?.name || categoryId;
    }

    /**
     * Get supplier name by ID
     * @param {Object} projectData - Project data
     * @param {string} supplierId - Supplier ID
     */
    getSupplierName(projectData, supplierId) {
        if (!supplierId) return '';

        // Check suppliers
        let supplier = projectData.config?.suppliers?.find(s => s.id === supplierId);
        if (supplier) return supplier.name;

        // Check internal resources
        supplier = projectData.config?.internalResources?.find(r => r.id === supplierId);
        if (supplier) return `${supplier.name} (Internal)`;

        return supplierId;
    }

    /**
     * Generate a unique ID
     * @param {string} prefix - Optional prefix
     */
    generateId(prefix = '') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';

        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return prefix ? `${prefix}${result}` : result;
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        try {
            const keys = [this.storageKey, this.autosaveKey, this.versionsKey, this.configKey];

            for (const key of keys) {
                localStorage.removeItem(key);
            }

            return true;
        } catch (error) {
            console.error('DataManager: Clear data failed:', error);
            throw error;
        }
    }
}

// Make DataManager available globally
if (typeof window !== 'undefined') {
    window.DataManager = DataManager;
}