# Legacy Manager/Controller Pattern

This document describes the architectural pattern used in the older, non-React parts of the application.

**This is a legacy pattern. It should only be used as a reference for maintaining existing code.** All new features should be built using the modern React and Hooks-based architecture.

## Overview

The legacy architecture is a classic controller pattern built with JavaScript classes. It consists of:

1.  **`ApplicationController`**: The central orchestrator.
2.  **Manager Classes**: Specialized classes that handle specific domains of functionality (e.g., `TeamsConfigManager`, `ModalManager`).

## Key Principle: Central Instantiation

The most important concept to understand is that **`ApplicationController` is responsible for instantiating all other manager classes.** When the application starts, `ApplicationController.js` creates instances of the various managers, making them singletons for the application's lifecycle.

```javascript
// From: application-controller.js

class ApplicationController {
    async initializeComponents() {
        // Controller creates instances of all managers
        this.managers.config = new ConfigurationManager(this.managers.data);
        this.managers.navigation = new EnhancedNavigationManager(this, this.managers.config);
        this.managers.modal = new ModalManager();
        // ...and so on
    }
}
```

## Communication

-   **Controller to Manager**: The `ApplicationController` holds references to all manager instances and can call methods on them directly.
-   **Manager to Store**: Managers interact with the global state via `window.appStore`.

## Rules for Maintaining Legacy Code

-   **DO** look at `ApplicationController.js` first to understand how the legacy system is connected.
-   **DO** respect the existing pattern of separating concerns into manager classes when modifying existing code.
-   **DO NOT** add new features using this pattern. New features must use React.
