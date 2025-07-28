/**
 * Storage Configuration Manager
 * Gestisce la configurazione del percorso di salvataggio dei progetti
 */
class StorageConfigManager {
    constructor(dataManager, app) {
        this.dataManager = dataManager;
        this.app = app;
        this.containerId = 'storage-content';
        
        // Stato corrente
        this.currentPath = null;
        this.isLoading = false;
        this.storageMode = 'file'; // 'file' o 'localStorage'
        
        // Bind methods
        this.exposeGlobalMethods();
    }

    exposeGlobalMethods() {
        window.chooseStorageFolder = this.chooseFolder.bind(this);
        window.openStorageFolder = this.openFolder.bind(this);
        window.resetStorageToDefault = this.resetToDefault.bind(this);
        window.testStorageAccess = this.testAccess.bind(this);
    }

    /**
     * Carica e renderizza la configurazione storage
     */
    async loadStorageConfig() {
        const contentDiv = document.getElementById(this.containerId);
        if (!contentDiv) {
            console.error('Storage content container not found');
            return;
        }

        try {
            // Carica configurazione attuale
            await this.loadCurrentConfig();
            
            // Genera e inserisci HTML
            contentDiv.innerHTML = this.generateStorageHTML();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Aggiorna UI con dati correnti
            await this.updateUI();
            
        } catch (error) {
            console.error('Failed to load storage configuration:', error);
            contentDiv.innerHTML = this.generateErrorHTML(error.message);
        }
    }

    /**
     * Carica configurazione attuale
     */
    async loadCurrentConfig() {
        try {
            // Controlla se Electron API è disponibile
            if (window.electronAPI && window.electronAPI.getProjectsPath) {
                this.storageMode = 'file';
                this.currentPath = await this.dataManager.getProjectsPath();
            } else {
                this.storageMode = 'localStorage';
                this.currentPath = 'localStorage';
            }
        } catch (error) {
            console.error('Failed to load current config:', error);
            this.storageMode = 'localStorage';
            this.currentPath = 'localStorage';
        }
    }

    /**
     * Genera HTML per la configurazione storage
     */
    generateStorageHTML() {
        return `
            <div class="storage-config-container">
                <!-- Storage Mode Section -->
                <div class="storage-section">
                    <div class="section-header">
                        <h4><i class="fas fa-hdd"></i> Storage Mode</h4>
                        <p class="section-description">Configure how and where project files are stored</p>
                    </div>
                    
                    <div class="storage-mode-selector">
                        <div class="mode-option ${this.storageMode === 'file' ? 'active' : 'disabled'}" data-mode="file">
                            <div class="mode-icon">
                                <i class="fas fa-folder"></i>
                            </div>
                            <div class="mode-info">
                                <h5>File System Storage</h5>
                                <p>Save projects as JSON files in a chosen folder</p>
                                <div class="mode-benefits">
                                    <span class="benefit"><i class="fas fa-check"></i> Permanent storage</span>
                                    <span class="benefit"><i class="fas fa-check"></i> Easy backup</span>
                                    <span class="benefit"><i class="fas fa-check"></i> File versioning</span>
                                </div>
                            </div>
                            <div class="mode-status">
                                ${this.storageMode === 'file' ? 
                                    '<span class="status-badge active">Active</span>' : 
                                    '<span class="status-badge disabled">Not Available</span>'
                                }
                            </div>
                        </div>
                        
                        <div class="mode-option ${this.storageMode === 'localStorage' ? 'active' : ''}" data-mode="localStorage">
                            <div class="mode-icon">
                                <i class="fas fa-database"></i>
                            </div>
                            <div class="mode-info">
                                <h5>Browser Storage</h5>
                                <p>Save projects in browser's local storage (fallback mode)</p>
                                <div class="mode-limitations">
                                    <span class="limitation"><i class="fas fa-exclamation-triangle"></i> Temporary storage</span>
                                    <span class="limitation"><i class="fas fa-exclamation-triangle"></i> Limited space</span>
                                    <span class="limitation"><i class="fas fa-exclamation-triangle"></i> No file export</span>
                                </div>
                            </div>
                            <div class="mode-status">
                                ${this.storageMode === 'localStorage' ? 
                                    '<span class="status-badge fallback">Fallback Mode</span>' : 
                                    '<span class="status-badge available">Available</span>'
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <!-- File System Configuration -->
                ${this.storageMode === 'file' ? this.generateFileSystemConfig() : ''}
                
                <!-- Storage Statistics -->
                <div class="storage-section">
                    <div class="section-header">
                        <h4><i class="fas fa-chart-pie"></i> Storage Statistics</h4>
                        <p class="section-description">Current storage usage information</p>
                    </div>
                    
                    <div class="storage-stats" id="storage-stats">
                        <div class="stats-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Loading statistics...</span>
                        </div>
                    </div>
                </div>

                <!-- Storage Actions -->
                <div class="storage-section">
                    <div class="section-header">
                        <h4><i class="fas fa-tools"></i> Storage Actions</h4>
                        <p class="section-description">Manage your project storage</p>
                    </div>
                    
                    <div class="storage-actions">
                        ${this.generateStorageActions()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Genera configurazione per file system
     */
    generateFileSystemConfig() {
        return `
            <div class="storage-section">
                <div class="section-header">
                    <h4><i class="fas fa-folder-open"></i> Projects Folder</h4>
                    <p class="section-description">Choose where your project files will be saved</p>
                </div>
                
                <div class="folder-config">
                    <div class="current-folder">
                        <div class="folder-info">
                            <div class="folder-path">
                                <i class="fas fa-folder"></i>
                                <span id="current-folder-path">${this.escapeHtml(this.currentPath || 'Loading...')}</span>
                            </div>
                            <div class="folder-details" id="folder-details">
                                <span class="detail-item">
                                    <i class="fas fa-file"></i>
                                    <span id="projects-count">- projects</span>
                                </span>
                                <span class="detail-item">
                                    <i class="fas fa-clock"></i>
                                    <span id="last-access">Last accessed: -</span>
                                </span>
                            </div>
                        </div>
                        
                        <div class="folder-actions">
                            <button class="btn btn-secondary" onclick="chooseStorageFolder()" id="choose-folder-btn">
                                <i class="fas fa-folder-plus"></i> Change Folder
                            </button>
                            <button class="btn btn-secondary" onclick="openStorageFolder()" id="open-folder-btn">
                                <i class="fas fa-external-link-alt"></i> Open Folder
                            </button>
                        </div>
                    </div>
                    
                    <div class="folder-recommendations">
                        <h5><i class="fas fa-lightbulb"></i> Recommendations</h5>
                        <ul class="recommendations-list">
                            <li><i class="fas fa-check-circle"></i> Choose a folder that's regularly backed up</li>
                            <li><i class="fas fa-check-circle"></i> Avoid temporary folders like Desktop or Downloads</li>
                            <li><i class="fas fa-check-circle"></i> Consider using cloud storage folders (OneDrive, Google Drive, etc.)</li>
                            <li><i class="fas fa-check-circle"></i> Ensure the folder has sufficient space for your projects</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Genera azioni storage
     */
    generateStorageActions() {
        const actions = [];
        
        if (this.storageMode === 'file') {
            actions.push(`
                <div class="action-item">
                    <div class="action-info">
                        <h5>Test Storage Access</h5>
                        <p>Verify that the application can read and write to the selected folder</p>
                    </div>
                    <button class="btn btn-secondary" onclick="testStorageAccess()">
                        <i class="fas fa-vial"></i> Run Test
                    </button>
                </div>
            `);
            
            actions.push(`
                <div class="action-item">
                    <div class="action-info">
                        <h5>Reset to Default</h5>
                        <p>Reset the storage location to the default application folder</p>
                    </div>
                    <button class="btn btn-warning" onclick="resetStorageToDefault()">
                        <i class="fas fa-undo"></i> Reset to Default
                    </button>
                </div>
            `);
        }
        
        actions.push(`
            <div class="action-item">
                <div class="action-info">
                    <h5>Export All Projects</h5>
                    <p>Create a backup of all your projects in a single file</p>
                </div>
                <button class="btn btn-primary" onclick="window.app?.exportAllProjects()">
                    <i class="fas fa-download"></i> Export All
                </button>
            </div>
        `);

        return actions.join('');
    }

    /**
     * Genera HTML di errore
     */
    generateErrorHTML(errorMessage) {
        return `
            <div class="storage-error">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="error-content">
                    <h3>Storage Configuration Error</h3>
                    <p>Failed to load storage configuration: ${this.escapeHtml(errorMessage)}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mode selector (se disponibile)
        document.querySelectorAll('.mode-option[data-mode="file"]').forEach(option => {
            if (this.storageMode === 'file') {
                option.addEventListener('click', () => {
                    // File mode is already active
                    console.log('File system storage is already active');
                });
            }
        });

        // Refresh stats ogni 30 secondi
        this.statsInterval = setInterval(() => {
            this.updateStorageStats();
        }, 30000);
    }

    /**
     * Aggiorna UI con dati correnti
     */
    async updateUI() {
        try {
            await this.updateFolderInfo();
            await this.updateStorageStats();
        } catch (error) {
            console.error('Failed to update UI:', error);
        }
    }

    /**
     * Aggiorna informazioni folder
     */
    async updateFolderInfo() {
        if (this.storageMode !== 'file') return;

        try {
            const pathElement = document.getElementById('current-folder-path');
            const projectsCountElement = document.getElementById('projects-count');
            const lastAccessElement = document.getElementById('last-access');

            if (pathElement) {
                pathElement.textContent = this.currentPath || 'Unknown';
            }

            // Conta progetti
            const projects = await this.dataManager.listProjects();
            if (projectsCountElement) {
                const count = projects.length;
                projectsCountElement.textContent = `${count} project${count !== 1 ? 's' : ''}`;
            }

            // Last access (simulato)
            if (lastAccessElement) {
                lastAccessElement.textContent = `Last accessed: ${new Date().toLocaleString()}`;
            }

        } catch (error) {
            console.error('Failed to update folder info:', error);
        }
    }

    /**
     * Aggiorna statistiche storage
     */
    async updateStorageStats() {
        const statsContainer = document.getElementById('storage-stats');
        if (!statsContainer) return;

        try {
            const projects = await this.dataManager.listProjects();
            const totalProjects = projects.length;
            const totalSize = projects.reduce((sum, project) => sum + (project.fileSize || 0), 0);
            
            // Calcola statistiche
            const stats = {
                totalProjects,
                totalSize: this.formatFileSize(totalSize),
                averageSize: totalProjects > 0 ? this.formatFileSize(totalSize / totalProjects) : '0 B',
                lastModified: totalProjects > 0 ? 
                    new Date(Math.max(...projects.map(p => new Date(p.lastModified || 0)))).toLocaleString() : 
                    'Never',
                storageMode: this.storageMode === 'file' ? 'File System' : 'Browser Storage'
            };

            statsContainer.innerHTML = this.generateStatsHTML(stats);

        } catch (error) {
            console.error('Failed to update storage stats:', error);
            statsContainer.innerHTML = `
                <div class="stats-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Failed to load statistics</span>
                </div>
            `;
        }
    }

    /**
     * Genera HTML per le statistiche
     */
    generateStatsHTML(stats) {
        return `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.totalProjects}</div>
                        <div class="stat-label">Total Projects</div>
                    </div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-icon">
                        <i class="fas fa-hdd"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.totalSize}</div>
                        <div class="stat-label">Total Size</div>
                    </div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.averageSize}</div>
                        <div class="stat-label">Average Size</div>
                    </div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.lastModified}</div>
                        <div class="stat-label">Last Modified</div>
                    </div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-icon">
                        <i class="fas fa-cog"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.storageMode}</div>
                        <div class="stat-label">Storage Mode</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Sceglie una nuova cartella
     */
    async chooseFolder() {
        if (this.storageMode !== 'file') {
            this.showNotification('Folder selection is not available in browser storage mode', 'warning');
            return;
        }

        try {
            this.setLoading(true);
            
            const result = await this.dataManager.chooseProjectsFolder();
            
            if (result.success) {
                this.currentPath = result.path;
                await this.updateFolderInfo();
                this.showNotification('Projects folder updated successfully', 'success');
                
                // Ricarica lista progetti per riflettere il cambiamento
                if (this.app && this.app.refreshProjectsList) {
                    await this.app.refreshProjectsList();
                }
            } else {
                this.showNotification(result.error || 'Failed to change folder', 'error');
            }
            
        } catch (error) {
            console.error('Failed to choose folder:', error);
            this.showNotification('Failed to change folder: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Apre la cartella corrente
     */
    async openFolder() {
        if (this.storageMode !== 'file') {
            this.showNotification('Folder access is not available in browser storage mode', 'warning');
            return;
        }

        try {
            const success = await this.dataManager.openProjectsFolder();
            
            if (!success) {
                this.showNotification('Failed to open projects folder', 'error');
            }
            
        } catch (error) {
            console.error('Failed to open folder:', error);
            this.showNotification('Failed to open folder: ' + error.message, 'error');
        }
    }

    /**
     * Reset alla cartella predefinita
     */
    async resetToDefault() {
        if (this.storageMode !== 'file') {
            this.showNotification('Reset is not available in browser storage mode', 'warning');
            return;
        }

        if (!confirm('Are you sure you want to reset the storage location to default? This will not move existing projects.')) {
            return;
        }

        try {
            this.setLoading(true);
            
            // Reset path to default (passa null o stringa vuota)
            const success = await this.dataManager.setProjectsPath('');
            
            if (success) {
                this.currentPath = await this.dataManager.getProjectsPath();
                await this.updateFolderInfo();
                this.showNotification('Storage location reset to default', 'success');
                
                // Ricarica lista progetti
                if (this.app && this.app.refreshProjectsList) {
                    await this.app.refreshProjectsList();
                }
            } else {
                this.showNotification('Failed to reset storage location', 'error');
            }
            
        } catch (error) {
            console.error('Failed to reset to default:', error);
            this.showNotification('Failed to reset: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Testa l'accesso allo storage
     */
    async testAccess() {
        if (this.storageMode !== 'file') {
            this.showNotification('Storage test is not available in browser storage mode', 'warning');
            return;
        }

        try {
            this.setLoading(true);
            
            // Crea un progetto di test
            const testProject = {
                project: {
                    id: 'test_' + Date.now(),
                    name: 'Storage Test Project',
                    description: 'Test project for storage access verification',
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    version: '1.0.0'
                },
                features: [],
                phases: {},
                config: {
                    suppliers: [],
                    internalResources: [],
                    categories: [],
                    calculationParams: {}
                }
            };

            // Prova a salvare il progetto di test
            const saveResult = await this.dataManager.saveProject(testProject);
            
            if (saveResult.success) {
                // Prova a caricare il progetto di test
                const loadResult = await this.dataManager.loadProject(saveResult.filePath);
                
                if (loadResult) {
                    // Elimina il progetto di test
                    await this.dataManager.deleteProject(saveResult.filePath);
                    
                    this.showNotification('Storage access test completed successfully', 'success');
                } else {
                    this.showNotification('Storage test failed: Unable to read test file', 'error');
                }
            } else {
                this.showNotification('Storage test failed: Unable to write test file', 'error');
            }
            
        } catch (error) {
            console.error('Storage test failed:', error);
            this.showNotification('Storage test failed: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        
        const buttons = document.querySelectorAll('#choose-folder-btn, #open-folder-btn');
        buttons.forEach(btn => {
            btn.disabled = loading;
            if (loading) {
                btn.style.opacity = '0.6';
            } else {
                btn.style.opacity = '1';
            }
        });
    }

    /**
     * Mostra notifica
     */
    showNotification(message, type = 'info') {
        if (window.NotificationManager) {
            window.NotificationManager[type](message);
        } else {
            // Fallback
            alert(message);
        }
    }

    /**
     * Formatta dimensione file
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (typeof Helpers !== 'undefined' && Helpers.escapeHtml) {
            return Helpers.escapeHtml(text);
        }
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
    }
}

// Esporta la classe
if (typeof window !== 'undefined') {
    window.StorageConfigManager = StorageConfigManager;
}