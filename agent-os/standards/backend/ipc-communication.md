# IPC Communication

Communication between the Electron main process (`main.ts`) and the renderer process (the UI) must be done using Electron's Inter-Process Communication (IPC) APIs.

## Rationale

This is the standard, secure, and performant way to communicate between processes in an Electron application. It provides a clear contract between the frontend and backend parts of the application.

## Patterns

### One-Way (Events)

Use for firing events from one process to another without needing a direct response.
- **Main to Renderer**: Use `window.webContents.send()`
- **Renderer to Main**: Use `ipcRenderer.send()` and `ipcMain.on()`

### Two-Way (Request-Response)

This is the preferred pattern for when the renderer needs to call a function in the main process and get a value back.
- **Renderer**: Use `ipcRenderer.invoke()`
- **Main**: Use `ipcMain.handle()`

```javascript
// Renderer Process
const fileContent = await ipcRenderer.invoke('read-file', 'path/to/file.json');

// Main Process (main.ts)
ipcMain.handle('read-file', async (event, filePath) => {
  return fs.promises.readFile(filePath, 'utf-8');
});
```

## Channel Naming Convention

All IPC channel names **must** follow a `kebab-case` format, structured as `verb-noun`.

-   ✅ **Good**: `get-user-data`, `save-project`, `menu-action-triggered`
-   ❌ **Bad**: `getUserData`, `project_save`, `MENU`
