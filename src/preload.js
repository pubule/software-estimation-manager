const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Project file operations
    saveProjectFile: (projectData) => ipcRenderer.invoke('save-project-file', projectData),
    loadProjectFile: (filePath) => ipcRenderer.invoke('load-project-file', filePath),
    deleteProjectFile: (filePath) => ipcRenderer.invoke('delete-project-file', filePath),
    checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
    listProjects: () => ipcRenderer.invoke('list-projects'),

    // Projects folder operations
    getProjectsPath: () => ipcRenderer.invoke('get-projects-path'),
    setProjectsPath: (newPath) => ipcRenderer.invoke('set-projects-path', newPath),
    chooseProjectsFolder: () => ipcRenderer.invoke('choose-projects-folder'),
    openProjectsFolder: () => ipcRenderer.invoke('open-projects-folder'),

    // Settings operations
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    // Configuration file operations
    createDefaultConfig: (configData) => ipcRenderer.invoke('create-default-config', configData),

    // Resource Allocations (Global - capacity/allocations.json)
    loadResourceAllocations: () => ipcRenderer.invoke('load-resource-allocations'),
    saveResourceAllocations: (allocations) => ipcRenderer.invoke('save-resource-allocations', allocations),

    // Menu actions
    onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),

    // Application close handling
    onCheckBeforeClose: (callback) => ipcRenderer.on('check-before-close-request', callback),
    confirmWindowClose: (canClose) => ipcRenderer.invoke('confirm-window-close', canClose),

    // File operations (legacy for export)
    saveFile: (defaultPath, data) => ipcRenderer.invoke('save-file', defaultPath, data),
    openFile: () => ipcRenderer.invoke('open-file'),

    // Excel export file operations
    saveExcelFile: (filename, data) => ipcRenderer.invoke('save-excel-file', { filename, data }),
    exportTicketReport: (exportData) => ipcRenderer.invoke('export-ticket-report', exportData),
    exportResourceOverview: (exportData) => ipcRenderer.invoke('export-resource-overview', exportData),

    // Window controls
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    setWindowTitle: (title) => ipcRenderer.invoke('set-window-title', title)
});