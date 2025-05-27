const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Project file operations
    saveProjectFile: (projectData) => ipcRenderer.invoke('save-project-file', projectData),
    loadProjectFile: (filePath) => ipcRenderer.invoke('load-project-file', filePath),
    deleteProjectFile: (filePath) => ipcRenderer.invoke('delete-project-file', filePath),
    listProjects: () => ipcRenderer.invoke('list-projects'),

    // Projects folder operations
    getProjectsPath: () => ipcRenderer.invoke('get-projects-path'),
    setProjectsPath: (newPath) => ipcRenderer.invoke('set-projects-path', newPath),
    chooseProjectsFolder: () => ipcRenderer.invoke('choose-projects-folder'),
    openProjectsFolder: () => ipcRenderer.invoke('open-projects-folder'),

    // Settings operations
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    // Menu actions
    onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),

    // File operations (legacy for export)
    saveFile: (defaultPath, data) => ipcRenderer.invoke('save-file', defaultPath, data),
    openFile: () => ipcRenderer.invoke('open-file'),

    // Window controls
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close')
});