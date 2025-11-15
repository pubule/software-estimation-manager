const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Initialize default projects folder
const defaultProjectsPath = path.join(os.homedir(), 'OneDrive - Unicredit', 'Documentazione', 'TOOLS', 'Software Estimation Projects');

let mainWindow;

// Create the main application window
function createWindow() {
    console.log('🔍 MAIN_PROCESS - createWindow called, starting Electron app');
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        icon: path.join(__dirname, '..', 'assets', 'icon.png'), // Aggiunta icona per sviluppo
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
        autoHideMenuBar: true,
        menuBarVisible: false,
        // Fullscreen all'avvio
        fullscreen: false,      // Non usare true fullscreen (nasconde tutto)
        maximize: true          // Invece massimizza la finestra
    });

    // Menu già disabilitato
    mainWindow.setMenuBarVisibility(false);

    // Load the main HTML file
    mainWindow.loadFile('src/renderer/index.html');

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();  // Massimizza la finestra all'avvio
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Handle window close attempt (before it actually closes)
    mainWindow.on('close', (event) => {
        // Prevent immediate closure
        event.preventDefault();
        
        // Ask renderer to check for unsaved changes
        mainWindow.webContents.send('check-before-close-request');
    });

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

        const jsonString = JSON.stringify(projectData, null, 2);
        
        await fs.writeFile(filePath, jsonString);

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

ipcMain.handle('check-file-exists', async (event, filePath) => {
    try {
        await fs.access(filePath, fs.constants.F_OK);
        return { success: true, exists: true };
    } catch (error) {
        return { success: true, exists: false };
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

// Create default configuration file if it doesn't exist
ipcMain.handle('create-default-config', async (event, configData) => {
    try {
        const projectsPath = await getProjectsPath();
        const configDir = path.join(projectsPath, 'config');
        const configFile = path.join(configDir, 'defaults.json');
        
        // Check if file already exists
        try {
            await fs.access(configFile);
            console.log('Config file already exists:', configFile);
            return { success: true, existed: true, filePath: configFile };
        } catch (error) {
            // File doesn't exist, create it
        }
        
        // Create config directory if it doesn't exist
        await fs.mkdir(configDir, { recursive: true });
        
        // Write the configuration file
        await fs.writeFile(configFile, JSON.stringify(configData, null, 2));
        
        console.log('Created default configuration file:', configFile);
        return { success: true, created: true, filePath: configFile };
    } catch (error) {
        console.error('Failed to create default config file:', error);
        return { success: false, error: error.message };
    }
});

// Load global resource allocations from capacity/allocations.json
ipcMain.handle('load-resource-allocations', async () => {
    try {
        const projectsPath = await getProjectsPath();
        const allocationsPath = path.join(projectsPath, 'capacity', 'allocations.json');

        try {
            const data = await fs.readFile(allocationsPath, 'utf8');
            const parsed = JSON.parse(data);
            return {
                success: true,
                data: parsed.allocations || []
            };
        } catch (error) {
            // File doesn't exist, return empty array
            if (error.code === 'ENOENT') {
                return { success: true, data: [] };
            }
            throw error;
        }
    } catch (error) {
        console.error('Failed to load resource allocations:', error);
        return { success: false, error: error.message, data: [] };
    }
});

// Save global resource allocations to capacity/allocations.json
ipcMain.handle('save-resource-allocations', async (event, allocations) => {
    try {
        const projectsPath = await getProjectsPath();
        const capacityDir = path.join(projectsPath, 'capacity');
        const allocationsPath = path.join(capacityDir, 'allocations.json');

        // Ensure capacity directory exists
        await fs.mkdir(capacityDir, { recursive: true });

        // Save allocations
        const dataToSave = {
            allocations: allocations || [],
            lastModified: new Date().toISOString()
        };

        await fs.writeFile(allocationsPath, JSON.stringify(dataToSave, null, 2));
        console.log('Resource allocations saved:', allocationsPath);

        return { success: true, filePath: allocationsPath };
    } catch (error) {
        console.error('Failed to save resource allocations:', error);
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
    if (mainWindow) {
        // Ask renderer to check for unsaved changes
        mainWindow.webContents.send('check-before-close-request');
        return { success: true, message: 'close-check-initiated' };
    }
    return { success: false, reason: 'no-window' };
});

// Handle response from renderer about whether it's safe to close

// Excel Export IPC Handler - Task Group 9.2
// Using 'save-excel-file' to avoid conflict with legacy 'save-file' handler
ipcMain.handle('save-excel-file', async (event, { filename, data }) => {
    try {
        const downloadsPath = app.getPath('downloads');
        let filePath = path.join(downloadsPath, filename);

        // Check if file exists and append timestamp if collision
        if (fs.existsSync(filePath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, -5);
            const ext = path.extname(filename);
            const basename = path.basename(filename, ext);
            filePath = path.join(downloadsPath, `${basename}_${timestamp}${ext}`);
            console.log(`[IPC] File collision detected, saving with timestamp: ${path.basename(filePath)}`);
        }

        // Convert ArrayBuffer to Buffer if needed
        let bufferData = data;
        if (data instanceof ArrayBuffer) {
            bufferData = Buffer.from(data);
        } else if (typeof data === 'string') {
            bufferData = Buffer.from(data, 'binary');
        }

        // Write file
        await fs.writeFile(filePath, bufferData);

        console.log(`[IPC] File saved successfully: ${filePath}`);
        return {
            success: true,
            filename: path.basename(filePath),
            path: filePath
        };
    } catch (error) {
        console.error('[IPC] File save error:', error);

        // Handle specific error types
        let message = 'Failed to save file';

        if (error.code === 'EACCES') {
            message = 'Permission denied: Cannot write to Downloads folder';
        } else if (error.code === 'ENOSPC') {
            message = 'Disk full: Not enough space to save file';
        } else if (error.code === 'ENOENT') {
            message = 'Invalid Downloads folder path';
        } else if (error.code === 'EEXIST') {
            message = 'File already exists';
        } else if (error instanceof Error) {
            message = error.message;
        }

        return {
            success: false,
            error: message
        };
    }
});

// Export Ticket Report to Excel - Creates Excel file in main process
// This avoids "require is not defined" error in renderer process
ipcMain.handle('export-ticket-report', async (event, { tickets, timeFilterLabel }) => {
  try {
    const XLSX = require('xlsx');

    console.log(`[IPC] Starting ticket report export with ${tickets.length} tickets`);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create Summary sheet
    const summaryData = [
      ['IT Support Team Performance Dashboard'],
      [''],
      ['Total Tickets', tickets.length],
      ['Export Date', new Date().toLocaleDateString()],
      ['Time Period', timeFilterLabel || 'All Time'],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Create Tickets sheet with detailed data
    const ticketHeaders = ['Ticket ID', 'Title', 'Priority', 'Status', 'Created', 'Assigned To'];
    const ticketData = tickets.map(t => [
      t.number || '',
      t.short_description || '',
      t.priority || '',
      t.state || '',
      t.opened_at ? new Date(t.opened_at).toLocaleDateString() : '',
      t.assigned_to || ''
    ]);

    const ticketsSheet = XLSX.utils.aoa_to_sheet([ticketHeaders, ...ticketData]);
    XLSX.utils.book_append_sheet(workbook, ticketsSheet, 'Tickets');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `IT_Support_Performance_${timestamp}.xlsx`;

    // Get downloads path and create full file path
    const downloadsPath = app.getPath('downloads');
    let filePath = path.join(downloadsPath, filename);

    // Check if file exists and append timestamp if collision
    if (fs.existsSync(filePath)) {
      const timeStr = new Date().toISOString().replace(/[:.]/g, '').slice(0, -5);
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);
      filePath = path.join(downloadsPath, `${basename}_${timeStr}${ext}`);
      console.log(`[IPC] File collision detected, saving with timestamp: ${path.basename(filePath)}`);
    }

    // Write Excel file
    XLSX.writeFile(workbook, filePath);

    console.log(`[IPC] Excel report saved successfully: ${filePath}`);
    return {
      success: true,
      filename: path.basename(filePath),
      path: filePath
    };
  } catch (error) {
    console.error('[IPC] Error during ticket report export:', error);

    let message = 'Failed to export report';

    if (error.code === 'EACCES') {
      message = 'Permission denied: Cannot write to Downloads folder';
    } else if (error.code === 'ENOSPC') {
      message = 'Disk full: Not enough space to save file';
    } else if (error.code === 'ENOENT') {
      message = 'Invalid Downloads folder path';
    } else if (error instanceof Error) {
      message = error.message;
    }

    return {
      success: false,
      error: message
    };
  }
});

ipcMain.handle('confirm-window-close', (event, canClose) => {
    if (mainWindow && canClose) {
        mainWindow.destroy();
    }
    // If canClose is false, we do nothing (window stays open)
});

// Set window title
ipcMain.handle('set-window-title', (event, title) => {
    try {
        if (mainWindow) {
            mainWindow.setTitle(title || 'Software Estimation Manager');
            return { success: true };
        }
        return { success: false, reason: 'no-window' };
    } catch (error) {
        return { success: false, error: error.message };
    }
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