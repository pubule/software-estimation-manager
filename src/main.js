const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const {
  COLORS,
  renderTable,
  buildFullBacklogColumns,
  toExcelDate,
  slaHoursFor,
} = require('./excel-report-format');

// Initialize default projects folder
// Check for OneDrive path first, fall back to ~/Documents/Software Estimation Projects
const oneDrivePath = path.join(os.homedir(), 'OneDrive - Unicredit', 'Documentazione', 'TOOLS', 'Software Estimation Projects');
const fallbackPath = path.join(os.homedir(), 'Documents', 'Software Estimation Projects');
const defaultProjectsPath = fsSync.existsSync(path.join(os.homedir(), 'OneDrive - Unicredit')) ? oneDrivePath : fallbackPath;

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

// Update defaults.json with current global configuration
ipcMain.handle('update-default-config', async (event, configData) => {
    try {
        const projectsPath = await getProjectsPath();
        const configDir = path.join(projectsPath, 'config');
        const configFile = path.join(configDir, 'defaults.json');

        // Create config directory if it doesn't exist
        await fs.mkdir(configDir, { recursive: true });

        // Write the updated configuration file
        await fs.writeFile(configFile, JSON.stringify(configData, null, 2));

        console.log('Updated default configuration file:', configFile);
        return { success: true, filePath: configFile };
    } catch (error) {
        console.error('Failed to update default config file:', error);
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

// Import project from Excel workbook
ipcMain.handle('import-excel-project', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Import Project from Excel',
            filters: [
                { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
            ],
            properties: ['openFile']
        });

        if (result.canceled) {
            return { success: false, canceled: true };
        }

        const filePath = result.filePaths[0];
        const fileName = require('path').basename(filePath);

        const ExcelJSLib = global.ExcelJS || require('exceljs');
        const workbook = new ExcelJSLib.Workbook();
        await workbook.xlsx.readFile(filePath);

        const warnings = [];

        const getCellNumber = (cell) => {
            const v = cell.value;
            if (typeof v === 'object' && v !== null && 'result' in v) return Number(v.result) || 0;
            return Number(v) || 0;
        };

        const getCellString = (cell) => {
            const v = cell.value;
            if (v == null) return '';
            if (typeof v === 'object') {
                if (v.richText) return v.richText.map(rt => rt.text).join('');
                if ('result' in v) return String(v.result);
                if ('text' in v) return String(v.text);
            }
            return String(v).trim();
        };

        // Parse "Attività" sheet → features
        const features = [];
        const attivitaSheet = workbook.getWorksheet('Attività');
        if (!attivitaSheet) {
            return { success: false, error: 'Sheet "Attività" not found in workbook' };
        }

        const vendorNamesSet = new Set();
        attivitaSheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
            if (rowIndex === 1) return; // skip header
            const brId = row.getCell(1).value;
            const description = getCellString(row.getCell(2));
            const mdsRaw = row.getCell(5).value;
            // ExcelJS formula cells return { formula, result } objects
            const mds = typeof mdsRaw === 'object' && mdsRaw !== null && 'result' in mdsRaw
                ? mdsRaw.result : mdsRaw;

            // Only process rows with a numeric BR ID
            if (typeof brId !== 'number' || !description.length) return;

            const vendor = getCellString(row.getCell(6));
            const comment = getCellString(row.getCell(9));

            if (vendor) vendorNamesSet.add(vendor);

            features.push({
                brId: String(brId),
                description,
                mds: typeof mds === 'number' ? mds : 0,
                vendor,
                comment: comment === 'null' ? '' : comment,
                rowIndex
            });
        });

        // Parse "Summary" sheet → phases
        const phases = [];
        const summarySheet = workbook.getWorksheet('Summary');
        if (summarySheet) {
            summarySheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
                if (rowIndex < 5 || rowIndex > 13) return;
                const phaseName = getCellString(row.getCell(2));
                if (!phaseName || phaseName === 'TOTALE') return;

                const g2MDs = getCellNumber(row.getCell(5));
                const taMDs = getCellNumber(row.getCell(6));
                const elapsed = getCellNumber(row.getCell(3));

                phases.push({ phaseName, elapsed, g2MDs, taMDs });
            });
        } else {
            warnings.push('Sheet "Summary" not found — phases will not be imported');
        }

        // Parse "Estimation export" sheet → vendor costs for Working Package
        const estimationExport = [];
        let estimationTotalAmount = 0;
        let estimationSecondaryPct = 0;
        const estSheet = workbook.getWorksheet('Estimation export');
        if (estSheet) {
            estSheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
                if (rowIndex < 3) return; // skip header rows
                const vendorName = getCellString(row.getCell(2));
                if (!vendorName || vendorName === '0') return;

                const lta = getCellString(row.getCell(3));
                const role = getCellString(row.getCell(4));
                const totalMDs = getCellNumber(row.getCell(5));
                const totalCost = getCellNumber(row.getCell(6));
                const rate = getCellNumber(row.getCell(7));

                if (totalMDs > 0 || totalCost > 0) {
                    estimationExport.push({ vendorName, lta, role, totalMDs, totalCost, rate });
                }
            });
            estimationTotalAmount = getCellNumber(estSheet.getRow(6).getCell(6));
            estimationSecondaryPct = getCellNumber(estSheet.getRow(3).getCell(11));
        } else {
            warnings.push('Sheet "Estimation export" not found — Working Package import unavailable');
        }

        return {
            success: true,
            fileName,
            filePath,
            data: {
                features,
                phases,
                estimationExport,
                estimationTotalAmount,
                estimationSecondaryPct,
                vendorNames: Array.from(vendorNamesSet)
            },
            warnings
        };
    } catch (error) {
        console.error('[IPC] import-excel-project error:', error);
        return { success: false, error: `Failed to read Excel file: ${error.message}` };
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

/**
 * Whole days elapsed from an ISO timestamp until now. null when unparsable.
 *
 * Floored, not rounded: an age of 6.6 days is 6 days old, and the "> 7 Days"
 * summary counters are computed on the raw fraction, so rounding up made the
 * column contradict the counter above it.
 */
function daysBetween(isoTimestamp) {
  const date = toExcelDate(isoTimestamp);
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** Hours a ticket has been open past its SLA window. Never negative. */
function hoursOverdue(ticket) {
  const openedAt = toExcelDate(ticket.opened_at);
  if (!openedAt) return 0;
  const slaMs = slaHoursFor(ticket.priority) * 60 * 60 * 1000;
  return Math.max(0, (Date.now() - openedAt.getTime() - slaMs) / (1000 * 60 * 60));
}

/** Minutes between opening and resolution. null when either timestamp is absent. */
function minutesToClose(ticket) {
  const openedAt = toExcelDate(ticket.opened_at);
  const resolvedAt = toExcelDate(ticket.resolved_at);
  if (!openedAt || !resolvedAt) return null;
  return (resolvedAt.getTime() - openedAt.getTime()) / (1000 * 60);
}

ipcMain.handle('export-ticket-report', async (event, exportData) => {
  try {
    // Load ExcelJS if not available
    if (typeof ExcelJS === 'undefined') {
      // ExcelJS needs to be available - load from Node.js require
      // Since this is in main process, we can use require directly
      try {
        const ExcelJSModule = require('exceljs');
        global.ExcelJS = ExcelJSModule;
      } catch (e) {
        console.error('[IPC] ExcelJS not available:', e.message);
        throw new Error('ExcelJS library not available');
      }
    }

    console.log(`[IPC] Starting ticket report export with ExcelJS`);

    // Create workbook
    const ExcelJSLib = global.ExcelJS || require('exceljs');
    const workbook = new ExcelJSLib.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Ticket Dashboard';
    workbook.lastModifiedBy = 'Ticket Dashboard';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ============== SHEET 1: TEAM ANALYSIS ==============
    if (exportData.teamAnalysis && exportData.teamAnalysis.metrics) {
      const worksheet = workbook.addWorksheet('Team Analysis', { tabColor: { argb: COLORS.headerGray } });

      renderTable(worksheet, {
        columns: [
          { header: 'Operator', width: 26, get: m => m.operatorName },
          { header: 'Assigned Tickets', width: 15, get: m => m.assignedTickets || 0, type: 'int' },
          { header: 'Resolved Tickets', width: 15, get: m => m.resolvedTickets || 0, type: 'int' },
          { header: 'Avg Resolution (hrs)', width: 18, get: m => m.averageResolutionTime || 0, type: 'decimal' },
          { header: 'Tickets in Delay', width: 15, get: m => m.ticketsInDelay || 0, type: 'int' },
          {
            header: 'Delay %',
            width: 12,
            get: m => m.delayPercentage || 0,
            type: 'decimal2',
            fill: value => (value > 20 ? COLORS.darkRed : value > 10 ? COLORS.amber : COLORS.green),
            bold: value => value > 10,
          },
          { header: 'Utilization %', width: 14, get: m => m.utilizationPercentage || 0, type: 'decimal2' },
        ],
        rows: exportData.teamAnalysis.metrics,
        title: 'Team Analysis - Operator Performance Metrics',
        headerFill: COLORS.headerGray,
      });
    }

    // ============== SHEET 2: ORPHANED TICKETS ==============
    if (exportData.alerts && exportData.alerts.orphaned) {
      const worksheet = workbook.addWorksheet('Orphaned Tickets', { tabColor: { argb: COLORS.headerRed } });
      const summary = exportData.alerts.orphaned.summary;

      renderTable(worksheet, {
        columns: [
          { header: 'Ticket ID', width: 14, get: t => t.number },
          { header: 'Title', width: 45, get: t => t.short_description, wrap: true },
          { header: 'Created', width: 13, get: t => t.opened_at, type: 'date' },
          {
            header: 'Days Open',
            width: 11,
            get: t => daysBetween(t.opened_at),
            type: 'int',
            fill: value => (value > 30 ? COLORS.red : value > 14 ? COLORS.yellow : null),
          },
          { header: 'Priority', width: 10, get: t => t.priority, align: 'center' },
          { header: 'Status', width: 14, get: t => t.state },
          { header: 'Last Updated', width: 14, get: t => t.sys_updated_on, type: 'date' },
        ],
        rows: exportData.alerts.orphaned.tickets,
        title: 'ORPHANED TICKETS ALERT - Unassigned Tickets',
        headerFill: COLORS.headerRed,
        stripeFill: COLORS.alertStripe,
        metadata: [
          ['Total Orphaned', summary.total],
          ['> 7 Days', summary.overSevenDays],
          ['> 14 Days', summary.overFourteenDays],
          ['> 30 Days', summary.overThirtyDays],
        ],
      });
    }

    // ============== SHEET 3: STAGNANT TICKETS ==============
    if (exportData.alerts && exportData.alerts.stagnant) {
      const worksheet = workbook.addWorksheet('Stagnant Tickets', { tabColor: { argb: COLORS.headerRed } });
      const summary = exportData.alerts.stagnant.summary;

      renderTable(worksheet, {
        columns: [
          { header: 'Ticket ID', width: 14, get: t => t.number },
          { header: 'Title', width: 45, get: t => t.short_description, wrap: true },
          { header: 'Created', width: 13, get: t => t.opened_at, type: 'date' },
          {
            header: 'Days Stagnant',
            width: 13,
            get: t => daysBetween(t.sys_updated_on),
            type: 'int',
            fontColor: value => (value > 7 ? COLORS.orange : null),
          },
          { header: 'Days Open', width: 11, get: t => daysBetween(t.opened_at), type: 'int' },
          { header: 'Priority', width: 10, get: t => t.priority, align: 'center' },
          { header: 'Assigned To', width: 24, get: t => t.assigned_to, emptyText: 'Non assegnato' },
          { header: 'Status', width: 14, get: t => t.state },
        ],
        rows: exportData.alerts.stagnant.tickets,
        title: 'STAGNANT TICKETS ALERT - No Recent Activity',
        headerFill: COLORS.headerRed,
        stripeFill: COLORS.alertStripe,
        metadata: [
          ['Total Stagnant', summary.total],
          ['> 7 Days No Update', summary.overSevenDays],
          ['> 14 Days No Update', summary.overFourteenDays],
          ['Max Stagnation (days)', Math.round(summary.maxStagnationDays)],
        ],
      });
    }

    // ============== SHEET 4: EXPIRED HIGH PRIORITY ==============
    if (exportData.alerts && exportData.alerts.expiredHighPriority) {
      const worksheet = workbook.addWorksheet('Expired High Priority', { tabColor: { argb: COLORS.headerRed } });
      const summary = exportData.alerts.expiredHighPriority.summary;

      renderTable(worksheet, {
        columns: [
          { header: 'Ticket ID', width: 14, get: t => t.number },
          {
            header: 'Priority',
            width: 10,
            get: t => t.priority,
            align: 'center',
            fill: value => (value === 'P5' ? COLORS.priorityP5 : value === 'P6' ? COLORS.priorityP6 : null),
          },
          { header: 'Title', width: 45, get: t => t.short_description, wrap: true },
          { header: 'Created', width: 13, get: t => t.opened_at, type: 'date' },
          {
            header: 'Hours Overdue',
            width: 14,
            get: t => hoursOverdue(t),
            type: 'decimal',
            fontColor: value => (value > 0 ? COLORS.darkRed : null),
            bold: value => value > 0,
          },
          { header: 'SLA Threshold (hrs)', width: 17, get: t => slaHoursFor(t.priority), type: 'int' },
          { header: 'Assigned To', width: 24, get: t => t.assigned_to, emptyText: 'Non assegnato' },
          { header: 'Status', width: 14, get: t => t.state },
        ],
        rows: exportData.alerts.expiredHighPriority.tickets,
        title: 'EXPIRED HIGH PRIORITY ALERT - SLA Violations',
        headerFill: COLORS.headerRed,
        stripeFill: COLORS.alertStripe,
        metadata: [
          ['Total Overdue', summary.total],
          ['P5 Overdue', summary.p5Overdue],
          ['P6 Overdue', summary.p6Overdue],
          ['P7 Overdue', summary.p7Overdue],
          ['P8 Overdue', summary.p8Overdue],
          ['Max Overdue (hrs)', Number(summary.maxOverdueHours.toFixed(1))],
        ],
      });
    }

    // ============== SHEET 5: SUSPICIOUS CLOSURES ==============
    if (exportData.alerts && exportData.alerts.suspiciousClosures) {
      const worksheet = workbook.addWorksheet('Suspicious Closures', { tabColor: { argb: COLORS.headerAmber } });
      const summary = exportData.alerts.suspiciousClosures.summary;

      renderTable(worksheet, {
        columns: [
          { header: 'Ticket ID', width: 14, get: t => t.number },
          { header: 'Priority', width: 10, get: t => t.priority, align: 'center' },
          { header: 'Title', width: 45, get: t => t.short_description, wrap: true },
          { header: 'Created', width: 13, get: t => t.opened_at, type: 'date' },
          { header: 'Resolved', width: 13, get: t => t.resolved_at, type: 'date' },
          { header: 'Close Time (min)', width: 15, get: t => minutesToClose(t), type: 'decimal' },
          { header: 'Expected SLA (hrs)', width: 17, get: t => slaHoursFor(t.priority), type: 'int' },
        ],
        rows: exportData.alerts.suspiciousClosures.tickets,
        title: 'SUSPICIOUS CLOSURES ALERT - Unusually Fast Resolutions',
        headerFill: COLORS.headerAmber,
        headerFontColor: COLORS.black,
        stripeFill: COLORS.warnStripe,
        metadata: [
          ['Total Suspicious', summary.total],
          ['< 5 minutes', summary.lessThan5Min],
          ['< 15 minutes', summary.lessThan15Min],
          ['< 30 minutes', summary.lessThan30Min],
          ['Avg Close Time (min)', Number(summary.avgCloseTimeMin.toFixed(1))],
        ],
      });
    }

    // ============== SHEET 6: UNWORKED TICKETS ==============
    if (exportData.alerts && exportData.alerts.unworked) {
      const worksheet = workbook.addWorksheet('Unworked Tickets', { tabColor: { argb: COLORS.headerAmber } });
      const summary = exportData.alerts.unworked.summary;

      renderTable(worksheet, {
        columns: [
          { header: 'Ticket ID', width: 14, get: t => t.number },
          { header: 'Priority', width: 10, get: t => t.priority, align: 'center' },
          { header: 'Title', width: 45, get: t => t.short_description, wrap: true },
          { header: 'Created', width: 13, get: t => t.opened_at, type: 'date' },
          {
            // Unworked means no activity since the last update, not since opening.
            header: 'Days Unworked',
            width: 13,
            get: t => daysBetween(t.sys_updated_on),
            type: 'int',
            fontColor: value => (value > 7 ? COLORS.orange : null),
          },
          { header: 'Days Open', width: 11, get: t => daysBetween(t.opened_at), type: 'int' },
          { header: 'Assigned To', width: 24, get: t => t.assigned_to, emptyText: 'Non assegnato' },
          { header: 'Status', width: 14, get: t => t.state },
        ],
        rows: exportData.alerts.unworked.tickets,
        title: 'UNWORKED TICKETS ALERT - Assigned But No Activity',
        headerFill: COLORS.headerAmber,
        headerFontColor: COLORS.black,
        stripeFill: COLORS.warnStripe,
        metadata: [
          ['Total Unworked', summary.total],
          ['> 7 Days', summary.overSevenDays],
          ['> 14 Days', summary.overFourteenDays],
          ['Max Unworked (days)', Math.round(summary.maxUnworkedDays)],
        ],
      });
    }

    // ============== SHEET 7: FULL BACKLOG ==============
    if (exportData.fullBacklog) {
      const worksheet = workbook.addWorksheet('Full Backlog', { tabColor: { argb: COLORS.headerGray } });

      renderTable(worksheet, {
        columns: buildFullBacklogColumns(),
        rows: exportData.fullBacklog,
        title: 'FULL BACKLOG - All Unresolved Tickets Sorted by Priority',
        headerFill: COLORS.headerGray,
        metadata: [
          ['Export Date', new Date()],
          ['Time Period', exportData.timeFilterLabel || 'All Time'],
        ],
      });
    }

    // Save workbook to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Save file
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `IT_Support_Report_${timestamp}.xlsx`;
    const downloadsPath = app.getPath('downloads');
    let filePath = path.join(downloadsPath, filename);

    // Check for collision
    if (fsSync.existsSync(filePath)) {
      const timeStr = new Date().toISOString().replace(/[:.]/g, '').slice(0, -5);
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);
      filePath = path.join(downloadsPath, `${basename}_${timeStr}${ext}`);
    }

    // Write file synchronously
    fsSync.writeFileSync(filePath, buffer);

    console.log(`[IPC] Excel report saved successfully with ExcelJS: ${filePath}`);
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

// ============================================================================
// EXPORT: Resource Overview (Heatmap + Capacity Planning)
// ============================================================================
ipcMain.handle('export-resource-overview', async (event, exportData) => {
  try {
    console.log('[IPC] Starting resource overview export');

    // Load ExcelJS
    const ExcelJSLib = global.ExcelJS || require('exceljs');
    const workbook = new ExcelJSLib.Workbook();

    // Set workbook properties
    workbook.creator = 'Resource Overview';
    workbook.lastModifiedBy = 'Resource Overview';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Define styles
    const styles = {
      headerGray: {
        font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },
      dataLight: {
        font: { name: 'Calibri', size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, left: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }, right: { style: 'thin', color: { argb: 'FFE0E0E0' } } }
      }
    };

    // Color function for utilization cells
    const getUtilizationColor = (util) => {
      if (util < 50) return 'FF4DA6FF';      // Blue (under-utilized)
      if (util < 90) return 'FF4ECDC4';      // Teal (available)
      if (util <= 100) return 'FFFFFF99';    // Yellow (near capacity)
      return 'FFFF6B6B';                     // Red (over-allocated)
    };

    // Helper function to create heatmap sheet for a specific year
    const createHeatmapSheet = (yearToExport) => {
      // Get heatmap data for this year from exportData
      const heatmapData = yearToExport === exportData.selectedYear
        ? exportData.heatmapMembers
        : exportData.nextYearHeatmap || [];

      if (heatmapData.length === 0) {
        console.warn(`[IPC] No heatmap data for year ${yearToExport}`);
        return;
      }

      const sheetName = `Heatmap ${yearToExport}`;
      const worksheet = workbook.addWorksheet(sheetName, { tabColor: { argb: 'FF4ECDC4' } });

      // Title
      worksheet.mergeCells('A1:P1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Annual Capacity Heatmap - ${yearToExport}`;
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 25;

      // Headers
      const headers = ['Member', 'Role', 'Vendor', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Avg %'];
      const headerRow = worksheet.addRow(headers);
      headerRow.font = styles.headerGray.font;
      headerRow.fill = styles.headerGray.fill;
      headerRow.height = 20;

      // Data rows
      heatmapData.forEach((member, idx) => {
        const row = [
          member.fullName,
          member.role,
          member.vendorName,
          ...(member.months || []).map(m => `${m.utilization.toFixed(0)}%`),
          `${member.yearlyAverage.toFixed(0)}%`
        ];

        const dataRow = worksheet.addRow(row);
        const fillColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';

        for (let i = 1; i <= 16; i++) {
          const cell = dataRow.getCell(i);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = styles.dataLight.border;
          cell.font = { name: 'Calibri', size: 11 };

          // Color code the utilization cells (columns 4-15)
          if (i >= 4 && i <= 15 && member.months && member.months[i - 4]) {
            const util = member.months[i - 4].utilization;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getUtilizationColor(util) } };
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
          }
        }
      });

      // Set column widths
      worksheet.columns = [
        { width: 20 },  // Member
        { width: 15 },  // Role
        { width: 15 },  // Vendor
        ...Array(13).fill(null).map(() => ({ width: 10 }))  // 12 months + Avg
      ];

      // Freeze panes
      worksheet.views = [{ state: 'frozen', ySplit: 2, xSplit: 3 }];
    };

    // Create heatmap sheets for both years
    createHeatmapSheet(exportData.selectedYear);
    if (exportData.nextYear) {
      createHeatmapSheet(exportData.nextYear);
    }

    // ============== SHEET 2: CAPACITY PLANNING BY PROJECT ==============
    if (exportData.capacityPlanningData && exportData.capacityPlanningData.length > 0) {
      const worksheet = workbook.addWorksheet('By Project', { tabColor: { argb: 'FF333333' } });

      // Get all unique months from the data
      const allMonths = new Set();
      exportData.capacityPlanningData.forEach(row => {
        Object.keys(row.monthlyAllocations || {}).forEach(m => allMonths.add(m));
      });
      const sortedMonths = Array.from(allMonths).sort();

      // Title
      const headerCount = 5 + sortedMonths.length; // Project, Member, Role, StartDate, EndDate + months
      worksheet.mergeCells(`A1:${String.fromCharCode(64 + headerCount)}1`);
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'Capacity Planning by Project';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 25;

      // Headers
      const headers = ['Project', 'Member', 'Role', 'Start Date', 'End Date', ...sortedMonths, 'Total MDs'];
      const headerRow = worksheet.addRow(headers);
      headerRow.font = styles.headerGray.font;
      headerRow.fill = styles.headerGray.fill;
      headerRow.height = 20;

      // Data rows
      exportData.capacityPlanningData.forEach((item, idx) => {
        const monthValues = sortedMonths.map(month => item.monthlyAllocations[month] || 0);
        const row = [
          item.projectName,
          item.teamMemberName,
          item.teamMemberRole,
          item.startDate,
          item.endDate,
          ...monthValues,
          item.totalMDs
        ];

        const dataRow = worksheet.addRow(row);
        const fillColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';

        for (let i = 1; i <= row.length; i++) {
          const cell = dataRow.getCell(i);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = styles.dataLight.border;
          cell.font = { name: 'Calibri', size: 11 };
          cell.alignment = { horizontal: i <= 5 ? 'left' : 'center', vertical: 'center' };
        }
      });

      // Set column widths
      worksheet.columns = [
        { width: 25 },  // Project
        { width: 20 },  // Member
        { width: 15 },  // Role
        { width: 12 },  // Start Date
        { width: 12 },  // End Date
        ...sortedMonths.map(() => ({ width: 11 })),  // Months
        { width: 10 }   // Total MDs
      ];

      // Freeze panes
      worksheet.views = [{ state: 'frozen', ySplit: 2, xSplit: 2 }];
    }

    // Save workbook
    const buffer = await workbook.xlsx.writeBuffer();

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const year = exportData.selectedYear || new Date().getFullYear();
    const filename = `Resource_Capacity_Export_${year}_${timestamp}.xlsx`;
    const downloadsPath = app.getPath('downloads');
    let filePath = path.join(downloadsPath, filename);

    // Handle file collision
    if (fsSync.existsSync(filePath)) {
      const timeStr = new Date().toISOString().replace(/[:.]/g, '').slice(0, -5);
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);
      filePath = path.join(downloadsPath, `${basename}_${timeStr}${ext}`);
    }

    // Write file
    fsSync.writeFileSync(filePath, buffer);

    console.log(`[IPC] Resource overview export saved: ${filePath}`);
    return {
      success: true,
      filename: path.basename(filePath),
      path: filePath,
      sheetsCreated: 2
    };

  } catch (error) {
    console.error('[IPC] Error during resource overview export:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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