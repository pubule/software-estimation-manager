# Menu as Event Emitter

The native application menu, defined in `main.ts`, must not contain business logic. Instead, menu items should act as event emitters that send IPC messages to the renderer process.

## Rationale

The primary goal of this pattern is to **centralize all application logic within the renderer process**. This creates a clear separation of concerns:
-   **Main Process**: Handles native OS integration (windows, menus).
-   **Renderer Process**: Handles application state, business logic, and UI.

## How It Works

A menu item's `click` handler should simply send an IPC message to the renderer.

```javascript
// In main.ts
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Project',
        accelerator: 'CmdOrCtrl+N',
        // Send an event, don't perform the action here
        click: () => {
          mainWindow.webContents.send('menu-new-project');
        }
      },
    ]
  }
];
```

## Exceptions

Actions can be handled directly in the main process **only if** they are purely related to OS or window management (e.g., `Reload`, `Toggle Full Screen`, `Quit`). Any action that affects application state must be sent to the renderer.
