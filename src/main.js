const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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

// ============== EXCEL STYLING UTILITIES ==============

/**
 * Apply header style to cell
 */
function applyHeaderStyle(sheet, cellAddress, bgColor = '333333', textColor = 'FFFFFF') {
  if (!sheet[cellAddress]) {
    sheet[cellAddress] = {};
  }
  sheet[cellAddress].s = {
    fill: { fgColor: { rgb: bgColor } },
    font: { bold: true, color: { rgb: textColor }, sz: 11 },
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
    fill: bgColor ? { fgColor: { rgb: bgColor } } : undefined,
    font: { bold: isBold, color: { rgb: textColor }, sz: 11 },
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
      fill: { fgColor: { rgb: bgColor } },
      font: { color: { rgb: textColor }, sz: 11 },
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
    const XLSX = require('xlsx');

    console.log(`[IPC] Starting ticket report export with styling`);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // ============== SHEET 1: TEAM ANALYSIS ==============
    if (exportData.teamAnalysis && exportData.teamAnalysis.metrics) {
      const teamData = [
        ['Team Analysis - Operator Performance Metrics'],
        [''],
        ['Operator', 'Assigned Tickets', 'Resolved Tickets', 'Avg Resolution (hrs)', 'Tickets in Delay', 'Delay %', 'Utilization %']
      ];

      exportData.teamAnalysis.metrics.forEach(metric => {
        teamData.push([
          metric.operatorName || '',
          metric.assignedTickets || 0,
          metric.resolvedTickets || 0,
          metric.averageResolutionTime ? metric.averageResolutionTime.toFixed(2) : 0,
          metric.ticketsInDelay || 0,
          metric.delayPercentage ? metric.delayPercentage.toFixed(2) : 0,
          metric.utilizationPercentage ? metric.utilizationPercentage.toFixed(2) : 0
        ]);
      });

      const teamSheet = XLSX.utils.aoa_to_sheet(teamData);
      
      // Apply header styling (row 2, columns 0-6)
      for (let col = 0; col <= 6; col++) {
        applyHeaderStyle(teamSheet, XLSX.utils.encode_cell({ r: 2, c: col }), '333333', 'FFFFFF');
      }
      
      // Apply data row styling with conditional coloring for Delay %
      for (let row = 3; row < teamData.length; row++) {
        const bgColor = (row - 3) % 2 === 0 ? 'FFFFFF' : 'F5F5F5';
        
        for (let col = 0; col <= 6; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          
          // Special handling for Delay % column (col 5)
          if (col === 5) {
            const delayValue = teamData[row][5];
            const delayColor = getConditionalColor(parseFloat(delayValue), 'delayPercentage');
            if (!teamSheet[cellAddress]) teamSheet[cellAddress] = {};
            teamSheet[cellAddress].s = {
              fill: { fgColor: { rgb: delayColor } },
              font: { color: { rgb: 'FFFFFF' }, sz: 11 },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          } else {
            applyCellStyle(teamSheet, cellAddress, bgColor);
          }
        }
      }
      
      // Set column widths
      teamSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
      
      XLSX.utils.book_append_sheet(workbook, teamSheet, 'Team Analysis');
    }

    // ============== SHEET 2: ORPHANED TICKETS ALERT ==============
    if (exportData.alerts && exportData.alerts.orphaned) {
      const alertColors = getAlertColors('orphaned');
      const orphanedData = [
        ['ORPHANED TICKETS ALERT - Unassigned Tickets'],
        [''],
        ['Summary:'],
        ['Total Orphaned', exportData.alerts.orphaned.summary.total],
        ['> 7 Days', exportData.alerts.orphaned.summary.overSevenDays],
        ['> 14 Days', exportData.alerts.orphaned.summary.overFourteenDays],
        ['> 30 Days', exportData.alerts.orphaned.summary.overThirtyDays],
        [''],
        ['Orphaned Tickets Detail:'],
        ['Ticket ID', 'Title', 'Created', 'Days Open', 'Priority', 'Status', 'Last Updated']
      ];

      exportData.alerts.orphaned.tickets.forEach(t => {
        const daysOpen = (new Date().getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24);
        orphanedData.push([
          t.number || '',
          t.short_description || '',
          new Date(t.opened_at).toLocaleDateString(),
          daysOpen.toFixed(1),
          t.priority || '',
          t.state || '',
          new Date(t.sys_updated_on).toLocaleDateString()
        ]);
      });

      const orphanedSheet = XLSX.utils.aoa_to_sheet(orphanedData);
      
      // Apply header styling for detail section (row 8)
      for (let col = 0; col <= 6; col++) {
        applyHeaderStyle(orphanedSheet, XLSX.utils.encode_cell({ r: 8, c: col }), alertColors.headerBg, 'FFFFFF');
      }
      
      // Apply alert data row styling
      for (let row = 9; row < orphanedData.length; row++) {
        const bgColor = (row - 9) % 2 === 0 ? 'FFFFFF' : alertColors.lightBg;
        for (let col = 0; col <= 6; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          
          // Bold Days Open if > 7 days
          let isBold = false;
          if (col === 3 && parseFloat(orphanedData[row][3]) > 7) {
            isBold = true;
          }
          
          if (!orphanedSheet[cellAddress]) orphanedSheet[cellAddress] = {};
          orphanedSheet[cellAddress].s = {
            fill: { fgColor: { rgb: bgColor } },
            font: { bold: isBold, color: { rgb: '000000' }, sz: 11 },
            alignment: { horizontal: col === 3 ? 'right' : 'left', vertical: 'center' }
          };
        }
      }
      
      orphanedSheet['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }];
      
      XLSX.utils.book_append_sheet(workbook, orphanedSheet, 'Orphaned Tickets');
    }

    // ============== SHEET 3: STAGNANT TICKETS ALERT ==============
    if (exportData.alerts && exportData.alerts.stagnant) {
      const alertColors = getAlertColors('stagnant');
      const stagnantData = [
        ['STAGNANT TICKETS ALERT - No Recent Activity'],
        [''],
        ['Summary:'],
        ['Total Stagnant', exportData.alerts.stagnant.summary.total],
        ['> 7 Days No Update', exportData.alerts.stagnant.summary.overSevenDays],
        ['> 14 Days No Update', exportData.alerts.stagnant.summary.overFourteenDays],
        ['Max Stagnation (days)', exportData.alerts.stagnant.summary.maxStagnationDays.toFixed(1)],
        [''],
        ['Stagnant Tickets Detail:'],
        ['Ticket ID', 'Title', 'Created', 'Days Stagnant', 'Days Open', 'Priority', 'Assigned To', 'Status']
      ];

      exportData.alerts.stagnant.tickets.forEach(t => {
        const daysOpen = (new Date().getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceUpdate = (new Date().getTime() - new Date(t.sys_updated_on).getTime()) / (1000 * 60 * 60 * 24);
        stagnantData.push([
          t.number || '',
          t.short_description || '',
          new Date(t.opened_at).toLocaleDateString(),
          daysSinceUpdate.toFixed(1),
          daysOpen.toFixed(1),
          t.priority || '',
          t.assigned_to || '',
          t.state || ''
        ]);
      });

      const stagnantSheet = XLSX.utils.aoa_to_sheet(stagnantData);
      
      // Apply header styling
      for (let col = 0; col <= 7; col++) {
        applyHeaderStyle(stagnantSheet, XLSX.utils.encode_cell({ r: 8, c: col }), alertColors.headerBg, 'FFFFFF');
      }
      
      // Apply data rows
      for (let row = 9; row < stagnantData.length; row++) {
        const bgColor = (row - 9) % 2 === 0 ? 'FFFFFF' : alertColors.lightBg;
        for (let col = 0; col <= 7; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!stagnantSheet[cellAddress]) stagnantSheet[cellAddress] = {};
          stagnantSheet[cellAddress].s = {
            fill: { fgColor: { rgb: bgColor } },
            font: { color: { rgb: '000000' }, sz: 11 },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
      }
      
      stagnantSheet['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 12 }];
      
      XLSX.utils.book_append_sheet(workbook, stagnantSheet, 'Stagnant Tickets');
    }

    // ============== SHEET 4: EXPIRED HIGH PRIORITY ALERT ==============
    if (exportData.alerts && exportData.alerts.expiredHighPriority) {
      const alertColors = getAlertColors('expiredHighPriority');
      const expiredData = [
        ['EXPIRED HIGH PRIORITY ALERT - SLA Violations'],
        [''],
        ['Summary:'],
        ['Total Overdue', exportData.alerts.expiredHighPriority.summary.total],
        ['P5 Overdue', exportData.alerts.expiredHighPriority.summary.p5Overdue],
        ['P6 Overdue', exportData.alerts.expiredHighPriority.summary.p6Overdue],
        ['P7 Overdue', exportData.alerts.expiredHighPriority.summary.p7Overdue],
        ['P8 Overdue', exportData.alerts.expiredHighPriority.summary.p8Overdue],
        ['Max Overdue (hrs)', exportData.alerts.expiredHighPriority.summary.maxOverdueHours.toFixed(1)],
        [''],
        ['Expired High Priority Tickets Detail:'],
        ['Ticket ID', 'Priority', 'Title', 'Created', 'Hours Overdue', 'SLA Threshold (hrs)', 'Assigned To', 'Status']
      ];

      exportData.alerts.expiredHighPriority.tickets.forEach(t => {
        const slaThresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };
        const slaHours = slaThresholds[t.priority] || 72;
        const slaMs = slaHours * 60 * 60 * 1000;
        const openedTime = new Date(t.opened_at).getTime();
        const now = new Date().getTime();
        const hoursOverdue = (now - openedTime - slaMs) / (1000 * 60 * 60);

        expiredData.push([
          t.number || '',
          t.priority || '',
          t.short_description || '',
          new Date(t.opened_at).toLocaleDateString(),
          hoursOverdue.toFixed(1),
          slaHours,
          t.assigned_to || '',
          t.state || ''
        ]);
      });

      const expiredSheet = XLSX.utils.aoa_to_sheet(expiredData);
      
      // Apply header styling
      for (let col = 0; col <= 7; col++) {
        applyHeaderStyle(expiredSheet, XLSX.utils.encode_cell({ r: 10, c: col }), alertColors.headerBg, 'FFFFFF');
      }
      
      // Apply data rows with priority coloring
      for (let row = 11; row < expiredData.length; row++) {
        const bgColor = (row - 11) % 2 === 0 ? 'FFFFFF' : alertColors.lightBg;
        
        for (let col = 0; col <= 7; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          
          // Priority column (col 1) gets color coding
          if (col === 1) {
            const priorityColor = getConditionalColor(expiredData[row][1], 'priority');
            if (!expiredSheet[cellAddress]) expiredSheet[cellAddress] = {};
            expiredSheet[cellAddress].s = {
              fill: { fgColor: { rgb: priorityColor } },
              font: { bold: true, color: { rgb: '000000' }, sz: 11 },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          } else {
            if (!expiredSheet[cellAddress]) expiredSheet[cellAddress] = {};
            expiredSheet[cellAddress].s = {
              fill: { fgColor: { rgb: bgColor } },
              font: { color: { rgb: '000000' }, sz: 11 },
              alignment: { horizontal: 'left', vertical: 'center' }
            };
          }
        }
      }
      
      expiredSheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }];
      
      XLSX.utils.book_append_sheet(workbook, expiredSheet, 'Expired High Priority');
    }

    // ============== SHEET 5: SUSPICIOUS CLOSURES ALERT ==============
    if (exportData.alerts && exportData.alerts.suspiciousClosures) {
      const alertColors = getAlertColors('suspiciousClosures');
      const suspiciousData = [
        ['SUSPICIOUS CLOSURES ALERT - Unusually Fast Resolutions'],
        [''],
        ['Summary:'],
        ['Total Suspicious', exportData.alerts.suspiciousClosures.summary.total],
        ['< 5 minutes', exportData.alerts.suspiciousClosures.summary.lessThan5Min],
        ['< 15 minutes', exportData.alerts.suspiciousClosures.summary.lessThan15Min],
        ['< 30 minutes', exportData.alerts.suspiciousClosures.summary.lessThan30Min],
        ['Avg Close Time (min)', exportData.alerts.suspiciousClosures.summary.avgCloseTimeMin.toFixed(2)],
        [''],
        ['Suspicious Closures Detail:'],
        ['Ticket ID', 'Priority', 'Title', 'Created', 'Resolved', 'Close Time (min)', 'Expected SLA (hrs)']
      ];

      exportData.alerts.suspiciousClosures.tickets.forEach(t => {
        const slaThresholds = { P5: 4, P6: 8, P7: 24, P8: 72 };
        const slaHours = slaThresholds[t.priority] || 72;
        const closeTimeMinutes = (new Date(t.resolved_at || '').getTime() - new Date(t.opened_at).getTime()) / (1000 * 60);

        suspiciousData.push([
          t.number || '',
          t.priority || '',
          t.short_description || '',
          new Date(t.opened_at).toLocaleDateString(),
          new Date(t.resolved_at || '').toLocaleDateString(),
          closeTimeMinutes.toFixed(1),
          slaHours
        ]);
      });

      const suspiciousSheet = XLSX.utils.aoa_to_sheet(suspiciousData);
      
      // Apply header styling
      for (let col = 0; col <= 6; col++) {
        applyHeaderStyle(suspiciousSheet, XLSX.utils.encode_cell({ r: 9, c: col }), alertColors.headerBg, 'FFFFFF');
      }
      
      // Apply data rows
      for (let row = 10; row < suspiciousData.length; row++) {
        const bgColor = (row - 10) % 2 === 0 ? 'FFFFFF' : alertColors.lightBg;
        for (let col = 0; col <= 6; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!suspiciousSheet[cellAddress]) suspiciousSheet[cellAddress] = {};
          suspiciousSheet[cellAddress].s = {
            fill: { fgColor: { rgb: bgColor } },
            font: { color: { rgb: '000000' }, sz: 11 },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
      }
      
      suspiciousSheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
      
      XLSX.utils.book_append_sheet(workbook, suspiciousSheet, 'Suspicious Closures');
    }

    // ============== SHEET 6: UNWORKED TICKETS ALERT ==============
    if (exportData.alerts && exportData.alerts.unworked) {
      const alertColors = getAlertColors('unworked');
      const unworkedData = [
        ['UNWORKED TICKETS ALERT - Assigned But No Activity'],
        [''],
        ['Summary:'],
        ['Total Unworked', exportData.alerts.unworked.summary.total],
        ['> 7 Days', exportData.alerts.unworked.summary.overSevenDays],
        ['> 14 Days', exportData.alerts.unworked.summary.overFourteenDays],
        ['Max Unworked (days)', exportData.alerts.unworked.summary.maxUnworkedDays.toFixed(1)],
        [''],
        ['Unworked Tickets Detail:'],
        ['Ticket ID', 'Priority', 'Title', 'Created', 'Days Unworked', 'Days Open', 'Assigned To', 'Status']
      ];

      exportData.alerts.unworked.tickets.forEach(t => {
        const daysOpen = (new Date().getTime() - new Date(t.opened_at).getTime()) / (1000 * 60 * 60 * 24);
        unworkedData.push([
          t.number || '',
          t.priority || '',
          t.short_description || '',
          new Date(t.opened_at).toLocaleDateString(),
          daysOpen.toFixed(1),
          daysOpen.toFixed(1),
          t.assigned_to || '',
          t.state || ''
        ]);
      });

      const unworkedSheet = XLSX.utils.aoa_to_sheet(unworkedData);
      
      // Apply header styling
      for (let col = 0; col <= 7; col++) {
        applyHeaderStyle(unworkedSheet, XLSX.utils.encode_cell({ r: 8, c: col }), alertColors.headerBg, 'FFFFFF');
      }
      
      // Apply data rows
      for (let row = 9; row < unworkedData.length; row++) {
        const bgColor = (row - 9) % 2 === 0 ? 'FFFFFF' : alertColors.lightBg;
        for (let col = 0; col <= 7; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!unworkedSheet[cellAddress]) unworkedSheet[cellAddress] = {};
          unworkedSheet[cellAddress].s = {
            fill: { fgColor: { rgb: bgColor } },
            font: { color: { rgb: '000000' }, sz: 11 },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
      }
      
      unworkedSheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }];
      
      XLSX.utils.book_append_sheet(workbook, unworkedSheet, 'Unworked Tickets');
    }

    // ============== SHEET 7: FULL BACKLOG ==============
    if (exportData.fullBacklog) {
      const backlogData = [
        ['FULL BACKLOG - All Unresolved Tickets Sorted by Priority'],
        [''],
        ['Export Date', new Date().toLocaleDateString()],
        ['Time Period', exportData.timeFilterLabel || 'All Time'],
        [''],
        ['Ticket ID', 'Title', 'Created', 'Days Open', 'Priority', 'Assigned To', 'Status', 'Last Updated', 'Days Since Update', 'Time in Delay (hrs)', 'Notes']
      ];

      exportData.fullBacklog.forEach(t => {
        backlogData.push([
          t.id || '',
          t.title || '',
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
      });

      const backlogSheet = XLSX.utils.aoa_to_sheet(backlogData);
      
      // Apply header styling (row 4)
      for (let col = 0; col <= 10; col++) {
        applyHeaderStyle(backlogSheet, XLSX.utils.encode_cell({ r: 4, c: col }), '333333', 'FFFFFF');
      }
      
      // Apply data rows with conditional coloring
      for (let row = 5; row < backlogData.length; row++) {
        const bgColor = (row - 5) % 2 === 0 ? 'FFFFFF' : 'F5F5F5';
        
        for (let col = 0; col <= 10; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          
          let cellBgColor = bgColor;
          let textColor = '000000';
          let isBold = false;
          
          // Days Open column (col 3) - conditional color
          if (col === 3) {
            const daysOpen = parseFloat(backlogData[row][3]);
            cellBgColor = getConditionalColor(daysOpen, 'days');
          }
          // Priority column (col 4) - color coding
          else if (col === 4) {
            cellBgColor = getConditionalColor(backlogData[row][4], 'priority');
          }
          // Time in Delay column (col 9) - red text if > 0
          else if (col === 9 && parseFloat(backlogData[row][9]) > 0) {
            textColor = 'C00000';
            isBold = true;
          }
          // Days Since Update (col 8) - orange text if > 7 days
          else if (col === 8 && parseFloat(backlogData[row][8]) > 7) {
            textColor = 'FFA500';
          }
          
          if (!backlogSheet[cellAddress]) backlogSheet[cellAddress] = {};
          backlogSheet[cellAddress].s = {
            fill: { fgColor: { rgb: cellBgColor } },
            font: { bold: isBold, color: { rgb: textColor }, sz: 11 },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
      }
      
      // Set column widths
      backlogSheet['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, 
        { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, 
        { wch: 15 }, { wch: 15 }, { wch: 20 }
      ];
      
      // Freeze header row
      backlogSheet['!freeze'] = { xSplit: 0, ySplit: 5 };
      
      // Add autofilter
      const lastRow = backlogData.length - 1;
      backlogSheet['!autofilter'] = { ref: `A4:K${lastRow}` };
      
      XLSX.utils.book_append_sheet(workbook, backlogSheet, 'Full Backlog');
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `IT_Support_Report_${timestamp}.xlsx`;

    // Get downloads path and create full file path
    const downloadsPath = app.getPath('downloads');
    let filePath = path.join(downloadsPath, filename);

    // Check if file exists and append timestamp if collision
    if (fsSync.existsSync(filePath)) {
      const timeStr = new Date().toISOString().replace(/[:.]/g, '').slice(0, -5);
      const ext = path.extname(filename);
      const basename = path.basename(filename, ext);
      filePath = path.join(downloadsPath, `${basename}_${timeStr}${ext}`);
      console.log(`[IPC] File collision detected, saving with timestamp: ${path.basename(filePath)}`);
    }

    // Write Excel file
    XLSX.writeFile(workbook, filePath);

    console.log(`[IPC] Excel report saved successfully with styling: ${filePath}`);
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