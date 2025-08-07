/**
 * Data Manager (Refactored)
 * Handles data persistence with improved architecture and validation
 */

class DataManagerRefactored extends BaseComponent {
    constructor() {
        super('DataManager');
        
        this.currentProjectPath = null;
        
        // Persistence strategies
        this.persistenceStrategy = this.determinePersistenceStrategy();
        
        // Validators
        this.validators = new DataValidators();
        
        // Serializers
        this.serializers = new DataSerializers();
        
        // Operation history for debugging
        this.operationHistory = [];
        this.maxHistorySize = 100;
    }

    async onInit() {
        console.log(`Data Manager initialized with ${this.persistenceStrategy.name} strategy`);
    }

    /**
     * Determine the appropriate persistence strategy based on environment
     */
    determinePersistenceStrategy() {
        if (window.electronAPI?.saveProjectFile) {
            return new ElectronPersistenceStrategy();
        } else {
            console.warn('Electron API not available, using localStorage fallback');
            return new LocalStoragePersistenceStrategy();
        }
    }

    /**
     * Save project with validation and error handling
     */
    async saveProject(projectData, filePath = null) {
        return this.withErrorBoundary(async () => {
            this.logOperation('saveProject', { projectId: projectData?.project?.id, filePath });

            console.log('🔍 SAVE DEBUG - Original project data before save:', {
                projectId: projectData?.project?.id,
                lastModified: projectData?.project?.lastModified,
                featuresCount: projectData?.features?.length,
                originalDataHash: this.generateDataHash(projectData)
            });

            // Validate data before saving
            await this.validators.validateProjectData(projectData);

            // Create a deep copy to avoid modifying the original project data
            const projectDataForSaving = this.deepClone(projectData);

            console.log('🔍 SAVE DEBUG - Deep copy created:', {
                originalHash: this.generateDataHash(projectData),
                copyHash: this.generateDataHash(projectDataForSaving),
                areEqual: this.generateDataHash(projectData) === this.generateDataHash(projectDataForSaving)
            });

            // Update metadata on the copy
            this.updateProjectMetadata(projectDataForSaving);

            console.log('🔍 SAVE DEBUG - After metadata update:', {
                originalLastModified: projectData?.project?.lastModified,
                copyLastModified: projectDataForSaving?.project?.lastModified,
                originalHash: this.generateDataHash(projectData),
                copyHash: this.generateDataHash(projectDataForSaving),
                metadataChanged: projectData?.project?.lastModified !== projectDataForSaving?.project?.lastModified
            });

            // Serialize data
            const serializedData = this.serializers.serializeProject(projectDataForSaving);

            // Save using appropriate strategy
            const result = await this.persistenceStrategy.saveProject(serializedData, filePath);

            if (result.success) {
                this.currentProjectPath = result.filePath;
                
                console.log('🔍 SAVE DEBUG - After successful save:', {
                    originalDataAfterSave: this.generateDataHash(projectData),
                    savedDataHash: this.generateDataHash(projectDataForSaving),
                    filePath: result.filePath
                });
                
                this.emit('project-saved', { 
                    projectId: projectDataForSaving.project.id, 
                    filePath: result.filePath 
                });
                
                console.log('Project saved successfully:', result.filePath);
            }

            return result;

        }, 'saveProject', { 
            showNotification: true,
            defaultValue: { success: false, error: 'Save operation failed' }
        });
    }

    /**
     * Load project with validation and deserialization
     */
    async loadProject(filePath = null) {
        return this.withErrorBoundary(async () => {
            this.logOperation('loadProject', { filePath });

            // Load using appropriate strategy
            const result = await this.persistenceStrategy.loadProject(filePath);

            if (result.success) {
                // Deserialize data
                const projectData = this.serializers.deserializeProject(result.data);

                // Validate loaded data
                await this.validators.validateProjectData(projectData);

                this.currentProjectPath = filePath;
                this.emit('project-loaded', { 
                    projectId: projectData.project.id, 
                    filePath 
                });

                console.log('Project loaded successfully:', filePath || 'default');
                return projectData;
            } else {
                throw new Error(result.error || 'Failed to load project');
            }

        }, 'loadProject', { 
            showNotification: true,
            defaultValue: null 
        });
    }

    /**
     * List available projects with metadata
     */
    async listProjects() {
        return this.withErrorBoundary(async () => {
            this.logOperation('listProjects');

            const result = await this.persistenceStrategy.listProjects();
            
            if (result.success) {
                // Sort by last modified date
                const sortedProjects = result.projects.sort((a, b) => 
                    new Date(b.lastModified) - new Date(a.lastModified)
                );

                return sortedProjects;
            }

            return [];

        }, 'listProjects', { 
            showNotification: false,
            defaultValue: [] 
        });
    }

    /**
     * Load the last modified project
     */
    async loadLastProject() {
        return this.withErrorBoundary(async () => {
            this.logOperation('loadLastProject');

            // Get list of projects
            const projects = await this.listProjects();
            
            if (projects && projects.length > 0) {
                // Get the most recent project (already sorted by listProjects)
                const lastProject = projects[0];
                const projectData = await this.loadProject(lastProject.filePath);
                return projectData; // This should be the actual project data, not a result object
            }

            return null;

        }, 'loadLastProject', { 
            showNotification: false,
            defaultValue: null 
        });
    }

    /**
     * Delete project with confirmation
     */
    async deleteProject(filePath) {
        return this.withErrorBoundary(async () => {
            this.logOperation('deleteProject', { filePath });

            const result = await this.persistenceStrategy.deleteProject(filePath);

            if (result.success) {
                if (this.currentProjectPath === filePath) {
                    this.currentProjectPath = null;
                }
                
                this.emit('project-deleted', { filePath });
                return true;
            } else {
                throw new Error(result.error || 'Failed to delete project');
            }

        }, 'deleteProject', { 
            showNotification: true,
            defaultValue: false 
        });
    }

    /**
     * Settings management
     */
    async getSettings() {
        return this.withErrorBoundary(async () => {
            const result = await this.persistenceStrategy.getSettings();
            return result.success ? result.settings : {};
        }, 'getSettings', { 
            showNotification: false,
            defaultValue: {} 
        });
    }

    async saveSettings(settings) {
        return this.withErrorBoundary(async () => {
            this.validators.validateSettings(settings);
            const result = await this.persistenceStrategy.saveSettings(settings);
            
            if (result.success) {
                this.emit('settings-saved', { settings });
            }
            
            return result.success;
        }, 'saveSettings', { 
            showNotification: true,
            defaultValue: false 
        });
    }

    /**
     * Project metadata management
     */
    updateProjectMetadata(projectData) {
        if (!projectData.project) {
            projectData.project = {};
        }

        projectData.project.lastModified = new Date().toISOString();
        
        // Ensure required fields
        if (!projectData.project.id) {
            projectData.project.id = this.generateId('project');
        }
        
        if (!projectData.project.created) {
            projectData.project.created = projectData.project.lastModified;
        }
    }

    /**
     * Export functionality
     */
    async exportToCSV(projectData, filename) {
        return this.withErrorBoundary(async () => {
            const csvData = this.serializers.generateCSV(projectData);
            
            if (this.persistenceStrategy.name === 'electron') {
                const result = await window.electronAPI.saveFile(`${filename}.csv`, csvData);
                return result;
            } else {
                this.downloadAsFile(csvData, `${filename}.csv`, 'text/csv');
                return { success: true, method: 'download' };
            }
        }, 'exportToCSV', { showNotification: true });
    }

    async exportToJSON(projectData, filename) {
        return this.withErrorBoundary(async () => {
            const jsonData = this.serializers.serializeProject(projectData);
            
            if (this.persistenceStrategy.name === 'electron') {
                const result = await window.electronAPI.saveFile(`${filename}.json`, jsonData);
                return result;
            } else {
                this.downloadAsFile(
                    JSON.stringify(jsonData, null, 2), 
                    `${filename}.json`, 
                    'application/json'
                );
                return { success: true, method: 'download' };
            }
        }, 'exportToJSON', { showNotification: true });
    }

    /**
     * Backup and restore functionality
     */
    async createBackup(includeSettings = true) {
        return this.withErrorBoundary(async () => {
            const backupData = {
                metadata: {
                    version: '1.0.0',
                    createdAt: new Date().toISOString(),
                    application: 'Software Estimation Manager'
                },
                projects: await this.listProjects()
            };

            if (includeSettings) {
                backupData.settings = await this.getSettings();
            }

            const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
            const dataStr = JSON.stringify(backupData, null, 2);

            if (this.persistenceStrategy.name === 'electron') {
                const result = await window.electronAPI.saveFile(filename, backupData);
                return result;
            } else {
                this.downloadAsFile(dataStr, filename, 'application/json');
                return { success: true, method: 'download' };
            }
        }, 'createBackup', { showNotification: true });
    }

    async restoreBackup(backupData) {
        return this.withErrorBoundary(async () => {
            // Validate backup data structure
            this.validators.validateBackupData(backupData);

            // Restore settings if available
            if (backupData.settings) {
                await this.saveSettings(backupData.settings);
            }

            this.emit('backup-restored', { backup: backupData });
            return true;
        }, 'restoreBackup', { showNotification: true });
    }

    /**
     * File path operations
     */
    async getProjectsPath() {
        return this.withErrorBoundary(async () => {
            if (this.persistenceStrategy.name === 'electron') {
                return await window.electronAPI.getProjectsPath();
            }
            return 'localStorage';
        }, 'getProjectsPath');
    }

    async setProjectsPath(newPath) {
        return this.withErrorBoundary(async () => {
            if (this.persistenceStrategy.name === 'electron') {
                const result = await window.electronAPI.setProjectsPath(newPath);
                if (result.success) {
                    this.emit('projects-path-changed', { path: newPath });
                }
                return result.success;
            }
            return false;
        }, 'setProjectsPath');
    }

    /**
     * Utility methods
     */
    downloadAsFile(data, filename, mimeType) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    generateId(prefix = '') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return prefix ? `${prefix}_${result}` : result;
    }

    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('Deep clone failed:', error);
            return obj; // Fallback to original if cloning fails
        }
    }

    generateDataHash(data) {
        try {
            const str = JSON.stringify(data, Object.keys(data).sort());
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash.toString(16);
        } catch (error) {
            console.error('Hash generation failed:', error);
            return 'error';
        }
    }

    /**
     * Operation logging for debugging
     */
    logOperation(operation, params = {}) {
        const logEntry = {
            operation,
            params,
            timestamp: new Date().toISOString(),
            strategy: this.persistenceStrategy.name
        };

        this.operationHistory.unshift(logEntry);
        
        // Limit history size
        if (this.operationHistory.length > this.maxHistorySize) {
            this.operationHistory.splice(this.maxHistorySize);
        }

        console.debug(`DataManager: ${operation}`, params);
    }

    getOperationHistory(limit = 20) {
        return this.operationHistory.slice(0, limit);
    }

    clearOperationHistory() {
        this.operationHistory = [];
    }

    /**
     * Clear all data (for testing/reset)
     */
    async clearAllData() {
        return this.withErrorBoundary(async () => {
            const result = await this.persistenceStrategy.clearAllData();
            
            if (result.success) {
                this.currentProjectPath = null;
                this.operationHistory = [];
                this.emit('data-cleared');
            }
            
            return result.success;
        }, 'clearAllData', { showNotification: true });
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        return this.withErrorBoundary(async () => {
            const projects = await this.listProjects();
            const settings = await this.getSettings();
            
            return {
                projectCount: projects.length,
                totalSize: projects.reduce((sum, p) => sum + (p.fileSize || 0), 0),
                settingsSize: JSON.stringify(settings).length,
                strategy: this.persistenceStrategy.name,
                lastOperation: this.operationHistory[0]?.timestamp
            };
        }, 'getStorageStats', { defaultValue: {} });
    }

    onDestroy() {
        this.operationHistory = [];
        this.currentProjectPath = null;
    }
}

/**
 * Electron Persistence Strategy
 * Handles data persistence using Electron's file system APIs
 */
class ElectronPersistenceStrategy {
    constructor() {
        this.name = 'electron';
    }

    async saveProject(projectData, filePath = null) {
        try {
            let result;
            
            if (filePath) {
                // Save to specific path
                result = await window.electronAPI.saveFileToPath(filePath, projectData);
            } else {
                // Use default project saving
                result = await window.electronAPI.saveProjectFile(projectData);
            }

            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async loadProject(filePath = null) {
        try {
            const result = await window.electronAPI.loadProjectFile(filePath);
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async listProjects() {
        try {
            const result = await window.electronAPI.listProjects();
            return result;
        } catch (error) {
            return { success: false, error: error.message, projects: [] };
        }
    }

    async deleteProject(filePath) {
        try {
            const result = await window.electronAPI.deleteProjectFile(filePath);
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getSettings() {
        try {
            const result = await window.electronAPI.getSettings();
            return result;
        } catch (error) {
            return { success: false, settings: {} };
        }
    }

    async saveSettings(settings) {
        try {
            const result = await window.electronAPI.saveSettings(settings);
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async clearAllData() {
        try {
            // This would need to be implemented in the main process
            const result = await window.electronAPI.clearAllProjectData?.();
            return result || { success: false, error: 'Method not available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

/**
 * LocalStorage Persistence Strategy
 * Fallback persistence using browser localStorage
 */
class LocalStoragePersistenceStrategy {
    constructor() {
        this.name = 'localStorage';
        this.storageKeys = {
            projects: 'software-estimation-projects',
            settings: 'software-estimation-settings'
        };
    }

    async saveProject(projectData, filePath = null) {
        try {
            const projectId = projectData.project.id;
            const projectKey = filePath || `software-estimation-project-${projectId}`;
            
            localStorage.setItem(projectKey, JSON.stringify(projectData));
            
            // Update projects index
            this.updateProjectsIndex(projectData, projectKey);
            
            return {
                success: true,
                filePath: projectKey,
                fileName: `${projectData.project.name}.json`,
                method: 'localStorage'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async loadProject(filePath = null) {
        try {
            if (filePath) {
                const data = localStorage.getItem(filePath);
                if (!data) {
                    throw new Error('Project not found');
                }
                return { success: true, data: JSON.parse(data) };
            } else {
                // Load the most recently modified project
                const projects = await this.listProjects();
                if (projects.success && projects.projects.length > 0) {
                    const latestProject = projects.projects[0];
                    return this.loadProject(latestProject.filePath);
                }
                throw new Error('No projects found');
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async listProjects() {
        try {
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
                        // Skip invalid entries
                        console.warn(`Invalid project data in localStorage key: ${key}`);
                    }
                }
            }
            
            return {
                success: true,
                projects: projects.sort((a, b) => 
                    new Date(b.lastModified) - new Date(a.lastModified)
                )
            };
        } catch (error) {
            return { success: false, error: error.message, projects: [] };
        }
    }

    async deleteProject(filePath) {
        try {
            localStorage.removeItem(filePath);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getSettings() {
        try {
            const settings = localStorage.getItem(this.storageKeys.settings);
            return {
                success: true,
                settings: settings ? JSON.parse(settings) : {}
            };
        } catch (error) {
            return { success: false, settings: {} };
        }
    }

    async saveSettings(settings) {
        try {
            localStorage.setItem(this.storageKeys.settings, JSON.stringify(settings));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async clearAllData() {
        try {
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('software-estimation-')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    updateProjectsIndex(projectData, projectKey) {
        // This could maintain an index of projects for faster listing
        // For now, we scan localStorage each time
    }
}

/**
 * Data Validators
 * Validates data structures and content
 */
class DataValidators {
    async validateProjectData(projectData) {
        if (!projectData || typeof projectData !== 'object') {
            throw new Error('Project data must be an object');
        }

        // Validate required top-level properties
        const requiredProps = ['project', 'features', 'phases', 'config'];
        for (const prop of requiredProps) {
            if (!(prop in projectData)) {
                throw new Error(`Missing required property: ${prop}`);
            }
        }

        this.validateProjectMetadata(projectData.project);
        this.validateFeatures(projectData.features);
        this.validatePhases(projectData.phases);
        this.validateConfig(projectData.config);
    }

    validateProjectMetadata(project) {
        if (!project || typeof project !== 'object') {
            throw new Error('Project metadata must be an object');
        }

        if (!project.id || !project.name) {
            throw new Error('Project must have id and name');
        }

        if (project.version && typeof project.version !== 'string') {
            throw new Error('Project version must be a string');
        }
    }

    validateFeatures(features) {
        if (!Array.isArray(features)) {
            throw new Error('Features must be an array');
        }

        features.forEach((feature, index) => {
            this.validateFeature(feature, index);
        });
    }

    validateFeature(feature, index) {
        if (!feature || typeof feature !== 'object') {
            throw new Error(`Feature at index ${index} must be an object`);
        }

        const requiredProps = ['id', 'description'];
        for (const prop of requiredProps) {
            if (!feature[prop]) {
                throw new Error(`Feature at index ${index} missing required property: ${prop}`);
            }
        }

        if ('manDays' in feature) {
            const manDays = parseFloat(feature.manDays);
            if (isNaN(manDays) || manDays < 0) {
                throw new Error(`Feature at index ${index} has invalid manDays`);
            }
        }

        if ('expertise' in feature) {
            const expertise = parseFloat(feature.expertise);
            if (isNaN(expertise) || expertise < 0 || expertise > 100) {
                throw new Error(`Feature at index ${index} has invalid expertise value`);
            }
        }
    }

    validatePhases(phases) {
        if (!phases || typeof phases !== 'object') {
            throw new Error('Phases must be an object');
        }

        // Validate each phase has expected structure
        Object.entries(phases).forEach(([phaseKey, phase]) => {
            if (phaseKey !== 'selectedSuppliers' && phase && typeof phase === 'object') {
                if ('manDays' in phase && (isNaN(phase.manDays) || phase.manDays < 0)) {
                    throw new Error(`Phase ${phaseKey} has invalid manDays`);
                }
                if ('cost' in phase && (isNaN(phase.cost) || phase.cost < 0)) {
                    throw new Error(`Phase ${phaseKey} has invalid cost`);
                }
            }
        });
    }

    validateConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Configuration must be an object');
        }

        // Basic config structure validation
        if (config.projectOverrides && typeof config.projectOverrides !== 'object') {
            throw new Error('Project overrides must be an object');
        }
    }

    validateSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            throw new Error('Settings must be an object');
        }

        // Validate global config if present
        if (settings.globalConfig) {
            // This would use the configuration validators
            // For now, just check it's an object
            if (typeof settings.globalConfig !== 'object') {
                throw new Error('Global configuration must be an object');
            }
        }
    }

    validateBackupData(backupData) {
        if (!backupData || typeof backupData !== 'object') {
            throw new Error('Backup data must be an object');
        }

        if (!backupData.metadata) {
            throw new Error('Backup must contain metadata');
        }

        if (backupData.projects && !Array.isArray(backupData.projects)) {
            throw new Error('Backup projects must be an array');
        }
    }
}

/**
 * Data Serializers
 * Handles serialization/deserialization of different data formats
 */
class DataSerializers {
    serializeProject(projectData) {
        return projectData; // Already an object, no transformation needed
    }

    deserializeProject(data) {
        if (typeof data === 'string') {
            return JSON.parse(data);
        }
        return data;
    }

    generateCSV(projectData) {
        const features = projectData.features || [];
        
        if (features.length === 0) {
            return 'No features to export';
        }

        const headers = [
            'ID', 'Description', 'Category', 'Feature Type', 'Supplier',
            'Real Man Days', 'Expertise %', 'Risk Margin %', 'Calculated Man Days',
            'Notes', 'Created', 'Modified'
        ];

        const rows = features.map(feature => [
            this.escapeCsvField(feature.id || ''),
            this.escapeCsvField(feature.description || ''),
            this.escapeCsvField(this.getCategoryName(projectData, feature.category) || ''),
            this.escapeCsvField(this.getFeatureTypeName(projectData, feature.featureType) || ''),
            this.escapeCsvField(this.getSupplierName(projectData, feature.supplier) || ''),
            feature.realManDays || 0,
            feature.expertise || 100,
            feature.riskMargin || 0,
            feature.manDays || 0,
            this.escapeCsvField(feature.notes || ''),
            feature.created || '',
            feature.modified || ''
        ]);

        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
    }

    escapeCsvField(field) {
        if (typeof field !== 'string') {
            field = String(field);
        }

        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return '"' + field.replace(/"/g, '""') + '"';
        }

        return field;
    }

    getCategoryName(projectData, categoryId) {
        if (!categoryId) return '';
        const category = projectData.config?.categories?.find(c => c.id === categoryId);
        return category?.name || categoryId;
    }

    getFeatureTypeName(projectData, featureTypeId) {
        if (!featureTypeId) return '';
        
        // Search through all categories to find the feature type
        for (const category of projectData.config?.categories || []) {
            if (category.featureTypes) {
                const featureType = category.featureTypes.find(ft => ft.id === featureTypeId);
                if (featureType) {
                    return featureType.name;
                }
            }
        }
        
        return featureTypeId;
    }

    getSupplierName(projectData, supplierId) {
        if (!supplierId) return '';

        // Check suppliers
        let supplier = projectData.config?.suppliers?.find(s => s.id === supplierId);
        if (supplier) return `${supplier.department} - ${supplier.name}`;

        // Check internal resources
        supplier = projectData.config?.internalResources?.find(r => r.id === supplierId);
        if (supplier) return `${supplier.department} - ${supplier.name} (Internal)`;

        return supplierId;
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.DataManagerRefactored = DataManagerRefactored;
    window.ElectronPersistenceStrategy = ElectronPersistenceStrategy;
    window.LocalStoragePersistenceStrategy = LocalStoragePersistenceStrategy;
    window.DataValidators = DataValidators;
    window.DataSerializers = DataSerializers;
}