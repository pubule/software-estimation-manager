const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Initialize default projects folder
const defaultProjectsPath = path.join(os.homedir(), 'Documents', 'Software Estimation Projects');

let mainWindow;

// Create the main application window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        // RIMOZIONE TITLE BAR: Rimuove completamente la title bar di sistema
        frame: false,           // Rimuove il frame della finestra
        backgroundColor: '#1e1e1e',
        show: false,
        icon: path.join(__dirname, '../assets/icon.png'),
        // Menu già rimosso
        autoHideMenuBar: true,
        menuBarVisible: false
    });

    // Menu già disabilitato
    mainWindow.setMenuBarVisibility(false);

    // Load the main HTML file
    mainWindow.loadFile('src/renderer/index.html');

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Ensure default projects folder exists
    ensureProjectsFolder();
}

// Ensure projects folder exists
async function ensureProjectsFolder() {
    try {
        const projectsPath = await getProjectsPath();
        await fs.mkdir(projectsPath, { recursive: true });
        console.log('Projects folder ensured:', projectsPath);
    } catch (error) {
        console.error('Failed to create projects folder:', error);
    }
}

// Get current projects path from settings or default
async function getProjectsPath() {
    try {
        const settings = await loadSettings();
        return settings.projectsPath || defaultProjectsPath;
    } catch (error) {
        return defaultProjectsPath;
    }
}

// Load application settings
async function loadSettings() {
    try {
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        const data = await fs.readFile(settingsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {
            projectsPath: defaultProjectsPath,
            autoSave: true,
            autoSaveInterval: 120000, // 2 minutes
            maxRecentProjects: 10
        };
    }
}

// Save application settings
async function saveSettings(settings) {
    try {
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Failed to save settings:', error);
        return { success: false, error: error.message };
    }
}

// Get list of saved projects
async function listProjects() {
    try {
        const projectsPath = await getProjectsPath();
        const files = await fs.readdir(projectsPath);
        const projects = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(projectsPath, file);
                    const stats = await fs.stat(filePath);
                    const content = await fs.readFile(filePath, 'utf8');
                    const projectData = JSON.parse(content);

                    if (projectData.project) {
                        projects.push({
                            fileName: file,
                            filePath: filePath,
                            project: projectData.project,
                            fileSize: stats.size,
                            lastModified: stats.mtime.toISOString()
                        });
                    }
                } catch (error) {
                    console.warn('Failed to read project file:', file, error);
                }
            }
        }

        return projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    } catch (error) {
        console.error('Failed to list projects:', error);
        return [];
    }
}

// IPC handlers for project management
ipcMain.handle('get-projects-path', async () => {
    return await getProjectsPath();
});

ipcMain.handle('set-projects-path', async (event, newPath) => {
    try {
        const settings = await loadSettings();
        settings.projectsPath = newPath;
        await saveSettings(settings);
        await ensureProjectsFolder();
        return { success: true, path: newPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('choose-projects-folder', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Projects Folder'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const selectedPath = result.filePaths[0];
            return { success: true, path: selectedPath };
        }

        return { success: false, canceled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('list-projects', async () => {
    try {
        const projects = await listProjects();
        return { success: true, projects };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-project-file', async (event, projectData) => {
    try {
        const projectsPath = await getProjectsPath();
        const fileName = `${projectData.project.name.replace(/[^a-z0-9]/gi, '_')}_${projectData.project.id}.json`;
        const filePath = path.join(projectsPath, fileName);

        await fs.writeFile(filePath, JSON.stringify(projectData, null, 2));

        return {
            success: true,
            filePath: filePath,
            fileName: fileName
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-project-file', async (event, filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const projectData = JSON.parse(content);
        return { success: true, data: projectData };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-project-file', async (event, filePath) => {
    try {
        await fs.unlink(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-settings', async () => {
    try {
        const settings = await loadSettings();
        return { success: true, settings };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-settings', async (event, settings) => {
    return await saveSettings(settings);
});

ipcMain.handle('open-projects-folder', async () => {
    try {
        const projectsPath = await getProjectsPath();
        const { shell } = require('electron');
        await shell.openPath(projectsPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Legacy file operations for export functionality
ipcMain.handle('save-file', async (event, defaultPath, data) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath,
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!result.canceled) {
            await fs.writeFile(result.filePath, JSON.stringify(data, null, 2));
            return { success: true, filePath: result.filePath };
        }

        return { success: false, canceled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-file', async (event) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (!result.canceled) {
            const content = await fs.readFile(result.filePaths[0], 'utf8');
            const data = JSON.parse(content);
            return { success: true, data, filePath: result.filePaths[0] };
        }

        return { success: false, canceled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Window controls
ipcMain.handle('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.handle('window-close', () => {
    if (mainWindow) mainWindow.close();
});

// RIMOZIONE MENU: Aggiungere keyboard shortcuts globali se necessario
ipcMain.handle('trigger-action', async (event, action) => {
    // Handle keyboard shortcuts that previously were in the menu
    switch (action) {
        case 'new-project':
        case 'open-project':
        case 'save-project':
        case 'export-json':
            // etc.
            // Send to renderer process
            mainWindow.webContents.send('app-action', action);
            break;
        default:
            console.warn('Unknown action:', action);
    }
});

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (navigationEvent, url) => {
        navigationEvent.preventDefault();
    });
});