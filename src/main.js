const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
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

        // Convert globalConfig format to defaults.json format
        const defaultsData = {
            phaseDefinitions: configData.phaseDefinitions || [],
            defaultSuppliers: configData.suppliers || [],
            defaultInternalResources: configData.internalResources || [],
            defaultTeams: configData.teams || [],
            defaultCategories: configData.categories || []
        };

        // Write the updated configuration file
        await fs.writeFile(configFile, JSON.stringify(defaultsData, null, 2));

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

// ============== EXCEL STYLING UTILITIES ==============

/**
 * Apply header style to cell
 */

// Helper function to convert hex string to RGB number for XLSX
function hexToRgb(hexString) {
  return parseInt('0x' + hexString);
}

function applyHeaderStyle(sheet, cellAddress, bgColor = '333333', textColor = 'FFFFFF') {
  if (!sheet[cellAddress]) {
    sheet[cellAddress] = {};
  }
  sheet[cellAddress].s = {
    fill: { fgColor: { rgb: hexToRgb(bgColor) } },
    font: { bold: true, color: { rgb: hexToRgb(textColor) }, sz: 11 },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
}

/**
 * Apply cell style
 */
function applyCellStyle(sheet, cellAddress, bgColor = null, textColor = '000000', isBold = false) {
  if (!sheet[cellAddress]) {
    sheet[cellAddress] = {};
  }
  sheet[cellAddress].s = {
    fill: bgColor ? { fgColor: { rgb: hexToRgb(bgColor) } } : undefined,
    font: { bold: isBold, color: { rgb: hexToRgb(textColor) }, sz: 11 },
    alignment: { horizontal: 'left', vertical: 'center' }
  };
}

/**
 * Apply row style with alternating colors
 */
function applyRowStyle(sheet, row, startCol, endCol, bgColor = 'FFFFFF', textColor = '000000') {
  for (let col = startCol; col <= endCol; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    if (!sheet[cellAddress]) {
      sheet[cellAddress] = {};
    }
    sheet[cellAddress].s = {
      fill: { fgColor: { rgb: hexToRgb(bgColor) } },
      font: { color: { rgb: hexToRgb(textColor) }, sz: 11 },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }
}

/**
 * Apply conditional background color based on value and thresholds
 */
function getConditionalColor(value, type = 'days') {
  if (type === 'days') {
    if (value > 30) return 'FF0000';      // Bright red
    if (value > 14) return 'FFFF00';      // Bright yellow
    return 'FFFFFF';                       // White default
  } else if (type === 'delayPercentage') {
    if (value > 20) return 'C00000';      // Dark red critical
    if (value > 10) return 'FFC000';      // Warning yellow
    return 'C8FFC8';                       // Green OK
  } else if (type === 'priority') {
    if (value === 'P5') return 'FFC8C8';  // Pink
    if (value === 'P6') return 'FFF0C8';  // Orange
    return 'FFFFFF';
  }
  return 'FFFFFF';
}

/**
 * Get alert header colors based on alert type
 */
function getAlertColors(alertType) {
  const criticalAlerts = ['orphaned', 'stagnant', 'expiredHighPriority'];
  if (criticalAlerts.includes(alertType)) {
    return { headerBg: 'C00000', lightBg: 'FFE6E6' };  // Red
  } else {
    return { headerBg: 'FFC000', lightBg: 'FFFFC8' };  // Yellow
  }
}

// ============== END STYLING UTILITIES ==============

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

    // Define reusable styles
    const styles = {
      headerRed: {
        font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },
      headerYellow: {
        font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },
      headerGray: {
        font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },
      dataLight: {
        font: { name: 'Calibri', size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } }
      },
      dataDark: {
        font: { name: 'Calibri', size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } }
      }
    };

    // ============== SHEET 1: TEAM ANALYSIS ==============
    if (exportData.teamAnalysis && exportData.teamAnalysis.metrics) {
      const worksheet = workbook.addWorksheet('Team Analysis', { tabColor: { argb: 'FF333333' } });
      
      // Add title
      worksheet.mergeCells('A1:G1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'Team Analysis - Operator Performance Metrics';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 25;
      
      // Add headers
      const headers = ['Operator', 'Assigned Tickets', 'Resolved Tickets', 'Avg Resolution (hrs)', 'Tickets in Delay', 'Delay %', 'Utilization %'];
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 20;
      
      // Add data rows
      exportData.teamAnalysis.metrics.forEach((metric, index) => {
        const row = worksheet.addRow([
          metric.operatorName || '',
          metric.assignedTickets || 0,
          metric.resolvedTickets || 0,
          metric.averageResolutionTime ? metric.averageResolutionTime.toFixed(2) : 0,
          metric.ticketsInDelay || 0,
          metric.delayPercentage ? metric.delayPercentage.toFixed(2) : 0,
          metric.utilizationPercentage ? metric.utilizationPercentage.toFixed(2) : 0
        ]);
        
        // Apply alternating row colors
        const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';
        
        // Delay % column gets conditional coloring
        const delayValue = metric.delayPercentage || 0;
        let delayFillColor = 'FFC8FFC8'; // Green
        if (delayValue > 20) delayFillColor = 'FFC00000'; // Red
        else if (delayValue > 10) delayFillColor = 'FFFFC000'; // Yellow
        
        for (let i = 1; i <= 7; i++) {
          const cell = row.getCell(i);
          if (i === 6) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: delayFillColor } };
            cell.font = { name: 'Calibri', size: 11, bold: delayValue > 10 };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          }
          cell.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };
          cell.alignment = { horizontal: i === 1 ? 'left' : 'right', vertical: 'center' };
        }
      });
      
      // Set column widths
      worksheet.columns = [
        { width: 25 },
        { width: 15 },
        { width: 15 },
        { width: 18 },
        { width: 15 },
        { width: 12 },
        { width: 15 }
      ];
    }

    // ============== SHEET 2: ORPHANED TICKETS ==============
    if (exportData.alerts && exportData.alerts.orphaned) {
      const worksheet = workbook.addWorksheet('Orphaned Tickets', { tabColor: { argb: 'FFC00000' } });
      
      let rowNum = 1;
      
      // Title
      worksheet.mergeCells(`A${rowNum}:G${rowNum}`);
      const titleCell = worksheet.getCell(`A${rowNum}`);
      titleCell.value = 'ORPHANED TICKETS ALERT - Unassigned Tickets';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(rowNum).height = 25;
      rowNum += 2;
      
      // Summary
      const summaryData = [
        ['Total Orphaned', exportData.alerts.orphaned.summary.total],
        ['> 7 Days', exportData.alerts.orphaned.summary.overSevenDays],
        ['> 14 Days', exportData.alerts.orphaned.summary.overFourteenDays],
        ['> 30 Days', exportData.alerts.orphaned.summary.overThirtyDays]
      ];
      
      summaryData.forEach(([label, value]) => {
        const row = worksheet.addRow([label, value]);
        row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(2).font = { name: 'Calibri', size: 11, bold: value > 0, color: { argb: value > 0 ? 'FFC00000' : 'FF000000' } };
      });
      
      rowNum += summaryData.length + 1;
      
      // Detail headers
      const detailHeaders = ['Ticket ID', 'Title', 'Created', 'Days Open', 'Priority', 'Status', 'Last Updated'];
      const headerRow = worksheet.addRow(detailHeaders);
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
      headerRow.height = 20;
      
      // Detail rows
      exportData.alerts.orphaned.tickets.forEach((t, index) => {
        const daysOpen = (new Date().getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24);
        const row = worksheet.addRow([
          t.number || '',
          t.short_description || '',
          new Date(t.opened_at).toLocaleDateString(),
          daysOpen.toFixed(1),
          t.priority || '',
          t.state || '',
          new Date(t.sys_updated_on).toLocaleDateString()
        ]);
        
        const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFFFE6E6';
        for (let i = 1; i <= 7; i++) {
          const cell = row.getCell(i);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };
        }
      });
      
      worksheet.columns = [{ width: 15 }, { width: 30 }, { width: 15 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 15 }];
    }

    // ============== SHEET 3: STAGNANT TICKETS ==============
    if (exportData.alerts && exportData.alerts.stagnant) {
      const worksheet = workbook.addWorksheet('Stagnant Tickets', { tabColor: { argb: 'FFC00000' } });
      
      let rowNum = 1;
      
      // Title
      worksheet.mergeCells(`A${rowNum}:H${rowNum}`);
      const titleCell = worksheet.getCell(`A${rowNum}`);
      titleCell.value = 'STAGNANT TICKETS ALERT - No Recent Activity';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(rowNum).height = 25;
      rowNum += 2;
      
      // Summary
      const summaryData = [
        ['Total Stagnant', exportData.alerts.stagnant.summary.total],
        ['> 7 Days No Update', exportData.alerts.stagnant.summary.overSevenDays],
        ['> 14 Days No Update', exportData.alerts.stagnant.summary.overFourteenDays],
        ['Max Stagnation (days)', exportData.alerts.stagnant.summary.maxStagnationDays.toFixed(1)]
      ];
      
      summaryData.forEach(([label, value]) => {
        const row = worksheet.addRow([label, value]);
        row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(2).font = { name: 'Calibri', size: 11, bold: value > 7, color: { argb: value > 7 ? 'FFC00000' : 'FF000000' } };
      });
      
      // Detail headers
      const detailHeaders = ['Ticket ID', 'Title', 'Created', 'Days Stagnant', 'Days Open', 'Priority', 'Assigned To', 'Status'];
      const headerRow = worksheet.addRow(detailHeaders);
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
      headerRow.height = 20;
      
      // Detail rows
      exportData.alerts.stagnant.tickets.forEach((t, index) => {
        const daysSinceUpdate = (new Date().getTime() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24);
        const daysOpen = (new Date().getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24);
        const row = worksheet.addRow([
          t.number || '',
          t.short_description || '',
          new Date(t.opened_at).toLocaleDateString(),
          daysSinceUpdate.toFixed(1),
          daysOpen.toFixed(1),
          t.priority || '',
          t.assigned_to || '',
          t.state || ''
        ]);
        
        const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFFFE6E6';
        for (let i = 1; i <= 8; i++) {
          const cell = row.getCell(i);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };
        }
      });
      
      worksheet.columns = [{ width: 15 }, { width: 30 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 15 }, { width: 12 }];
    }

    // ============== SHEET 4: EXPIRED HIGH PRIORITY ==============
    if (exportData.alerts && exportData.alerts.expiredHighPriority) {
      const worksheet = workbook.addWorksheet('Expired High Priority', { tabColor: { argb: 'FFC00000' } });
      
      let rowNum = 1;
      
      // Title
      worksheet.mergeCells(`A${rowNum}:H${rowNum}`);
      const titleCell = worksheet.getCell(`A${rowNum}`);
      titleCell.value = 'EXPIRED HIGH PRIORITY ALERT - SLA Violations';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(rowNum).height = 25;
      rowNum += 2;
      
      // Summary
      const summaryData = [
        ['Total Overdue', exportData.alerts.expiredHighPriority.summary.total],
        ['P5 Overdue', exportData.alerts.expiredHighPriority.summary.p5Overdue],
        ['P6 Overdue', exportData.alerts.expiredHighPriority.summary.p6Overdue],
        ['P7 Overdue', exportData.alerts.expiredHighPriority.summary.p7Overdue],
        ['P8 Overdue', exportData.alerts.expiredHighPriority.summary.p8Overdue],
        ['Max Overdue (hrs)', exportData.alerts.expiredHighPriority.summary.maxOverdueHours.toFixed(1)]
      ];
      
      summaryData.forEach(([label, value]) => {
        const row = worksheet.addRow([label, value]);
        row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(2).font = { name: 'Calibri', size: 11, bold: value > 0, color: { argb: value > 0 ? 'FFC00000' : 'FF000000' } };
      });
      
      // Detail headers
      const detailHeaders = ['Ticket ID', 'Priority', 'Title', 'Created', 'Hours Overdue', 'SLA Threshold (hrs)', 'Assigned To', 'Status'];
      const headerRow = worksheet.addRow(detailHeaders);
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
      headerRow.height = 20;
      
      // Detail rows
      exportData.alerts.expiredHighPriority.tickets.forEach((t, index) => {
        const slaThresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };
        const slaHours = slaThresholds[t.priority] || 72;
        const slaMs = slaHours * 60 * 60 * 1000;
        const openedTime = new Date(t.opened_at).getTime();
        const now = new Date().getTime();
        const hoursOverdue = (now - openedTime - slaMs) / (1000 * 60 * 60);
        
        const row = worksheet.addRow([
          t.number || '',
          t.priority || '',
          t.short_description || '',
          new Date(t.opened_at).toLocaleDateString(),
          hoursOverdue.toFixed(1),
          slaHours,
          t.assigned_to || '',
          t.state || ''
        ]);
        
        const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFFFE6E6';
        for (let i = 1; i <= 8; i++) {
          const cell = row.getCell(i);
          
          // Priority coloring
          if (i === 2) {
            let priorityColor = 'FFFFFFFF';
            if (t.priority === 'P5') priorityColor = 'FFFFC8C8';
            else if (t.priority === 'P6') priorityColor = 'FFFFF0C8';
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: priorityColor } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          }
          
          cell.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };
        }
      });
      
      worksheet.columns = [{ width: 15 }, { width: 10 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 18 }, { width: 15 }, { width: 12 }];
    }

    // ============== SHEET 5: SUSPICIOUS CLOSURES ==============
    if (exportData.alerts && exportData.alerts.suspiciousClosures) {
      const worksheet = workbook.addWorksheet('Suspicious Closures', { tabColor: { argb: 'FFFFC000' } });
      
      let rowNum = 1;
      
      // Title
      worksheet.mergeCells(`A${rowNum}:G${rowNum}`);
      const titleCell = worksheet.getCell(`A${rowNum}`);
      titleCell.value = 'SUSPICIOUS CLOSURES ALERT - Unusually Fast Resolutions';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(rowNum).height = 25;
      rowNum += 2;
      
      // Summary
      const summaryData = [
        ['Total Suspicious', exportData.alerts.suspiciousClosures.summary.total],
        ['< 5 minutes', exportData.alerts.suspiciousClosures.summary.lessThan5Min],
        ['< 15 minutes', exportData.alerts.suspiciousClosures.summary.lessThan15Min],
        ['< 30 minutes', exportData.alerts.suspiciousClosures.summary.lessThan30Min],
        ['Avg Close Time (min)', exportData.alerts.suspiciousClosures.summary.avgCloseTimeMin.toFixed(2)]
      ];
      
      summaryData.forEach(([label, value]) => {
        const row = worksheet.addRow([label, value]);
        row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(2).font = { name: 'Calibri', size: 11 };
      });
      
      // Detail headers
      const detailHeaders = ['Ticket ID', 'Priority', 'Title', 'Created', 'Resolved', 'Close Time (min)', 'Expected SLA (hrs)'];
      const headerRow = worksheet.addRow(detailHeaders);
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      headerRow.height = 20;
      
      // Detail rows
      exportData.alerts.suspiciousClosures.tickets.forEach((t, index) => {
        const closeTimeMinutes = (new Date(t.resolved_at || '').getTime() - new Date(t.opened_at).getTime()) / (1000 * 60);
        const slaThresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };
        const slaHours = slaThresholds[t.priority] || 72;
        
        const row = worksheet.addRow([
          t.number || '',
          t.priority || '',
          t.short_description || '',
          new Date(t.opened_at).toLocaleDateString(),
          new Date(t.resolved_at || '').toLocaleDateString(),
          closeTimeMinutes.toFixed(1),
          slaHours
        ]);
        
        const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFFFC8C8';
        for (let i = 1; i <= 7; i++) {
          const cell = row.getCell(i);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };
        }
      });
      
      worksheet.columns = [{ width: 15 }, { width: 10 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 18 }];
    }

    // ============== SHEET 6: UNWORKED TICKETS ==============
    if (exportData.alerts && exportData.alerts.unworked) {
      const worksheet = workbook.addWorksheet('Unworked Tickets', { tabColor: { argb: 'FFFFC000' } });
      
      let rowNum = 1;
      
      // Title
      worksheet.mergeCells(`A${rowNum}:H${rowNum}`);
      const titleCell = worksheet.getCell(`A${rowNum}`);
      titleCell.value = 'UNWORKED TICKETS ALERT - Assigned But No Activity';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(rowNum).height = 25;
      rowNum += 2;
      
      // Summary
      const summaryData = [
        ['Total Unworked', exportData.alerts.unworked.summary.total],
        ['> 7 Days', exportData.alerts.unworked.summary.overSevenDays],
        ['> 14 Days', exportData.alerts.unworked.summary.overFourteenDays],
        ['Max Unworked (days)', exportData.alerts.unworked.summary.maxUnworkedDays.toFixed(1)]
      ];
      
      summaryData.forEach(([label, value]) => {
        const row = worksheet.addRow([label, value]);
        row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(2).font = { name: 'Calibri', size: 11, bold: value > 7, color: { argb: value > 7 ? 'FFFFC000' : 'FF000000' } };
      });
      
      // Detail headers
      const detailHeaders = ['Ticket ID', 'Priority', 'Title', 'Created', 'Days Unworked', 'Days Open', 'Assigned To', 'Status'];
      const headerRow = worksheet.addRow(detailHeaders);
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      headerRow.height = 20;
      
      // Detail rows
      exportData.alerts.unworked.tickets.forEach((t, index) => {
        const daysOpen = (new Date().getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24);
        const row = worksheet.addRow([
          t.number || '',
          t.priority || '',
          t.short_description || '',
          new Date(t.opened_at).toLocaleDateString(),
          daysOpen.toFixed(1),
          daysOpen.toFixed(1),
          t.assigned_to || '',
          t.state || ''
        ]);
        
        const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFFFC8C8';
        for (let i = 1; i <= 8; i++) {
          const cell = row.getCell(i);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };
        }
      });
      
      worksheet.columns = [{ width: 15 }, { width: 10 }, { width: 30 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 12 }];
    }

    // ============== SHEET 7: FULL BACKLOG ==============
    if (exportData.fullBacklog) {
      const worksheet = workbook.addWorksheet('Full Backlog', { tabColor: { argb: 'FF333333' } });
      
      // Title
      worksheet.mergeCells('A1:K1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'FULL BACKLOG - All Unresolved Tickets Sorted by Priority';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 25;
      
      // Metadata
      worksheet.addRow(['Export Date', new Date().toLocaleDateString()]);
      worksheet.addRow(['Time Period', exportData.timeFilterLabel || 'All Time']);
      
      // Headers
      const headers = ['Ticket ID', 'Title', 'Assignment Group', 'Created', 'Days Open', 'Priority', 'Assigned To', 'Status', 'Last Updated', 'Days Since Update', 'Time in Delay (hrs)', 'Notes'];
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
      headerRow.height = 20;
      
      // Data rows
      exportData.fullBacklog.forEach((t, index) => {
        const row = worksheet.addRow([
          t.id || '',
          t.title || '',
          t.assignment_group || '',
          new Date(t.created).toLocaleDateString(),
          t.daysOpen.toFixed(1),
          t.priority || '',
          t.assignedTo || '',
          t.status || '',
          new Date(t.lastUpdated).toLocaleDateString(),
          t.daysSinceUpdate.toFixed(1),
          t.timeInDelay > 0 ? t.timeInDelay.toFixed(1) : '',
          t.notes || ''
        ]);
        
        const bgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';
        
        for (let i = 1; i <= 11; i++) {
          const cell = row.getCell(i);
          let cellBgColor = bgColor;
          let fontColor = 'FF000000';
          let isBold = false;
          
          // Days Open conditional coloring
          if (i === 4) {
            const daysOpen = parseFloat(t.daysOpen);
            if (daysOpen > 30) cellBgColor = 'FFFF0000';
            else if (daysOpen > 14) cellBgColor = 'FFFFFF00';
          }
          
          // Priority coloring
          if (i === 5) {
            if (t.priority === 'P5') cellBgColor = 'FFFFC8C8';
            else if (t.priority === 'P6') cellBgColor = 'FFFFF0C8';
          }
          
          // Time in Delay - red text if > 0
          if (i === 10 && t.timeInDelay > 0) {
            fontColor = 'FFC00000';
            isBold = true;
          }
          
          // Days Since Update - orange text if > 7
          if (i === 9 && t.daysSinceUpdate > 7) {
            fontColor = 'FFFFA500';
          }
          
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellBgColor } };
          cell.font = { name: 'Calibri', size: 11, bold: isBold, color: { argb: fontColor } };
          cell.border = { top: { style: 'thin', color: { argb: 'FFD3D3D3' } }, left: { style: 'thin', color: { argb: 'FFD3D3D3' } }, bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, right: { style: 'thin', color: { argb: 'FFD3D3D3' } } };
          cell.alignment = { horizontal: i === 2 || i === 3 || i === 6 || i === 11 ? 'left' : 'center', vertical: 'center', wrapText: i === 2 || i === 11 };
        }
      });
      
      // Set column widths
      worksheet.columns = [
        { width: 12 },
        { width: 30 },
        { width: 15 },
        { width: 12 },
        { width: 10 },
        { width: 15 },
        { width: 12 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 20 }
      ];
      
      // Freeze panes
      worksheet.views = [{ state: 'frozen', ySplit: 5, xSplit: 0 }];
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