# Code Style and Conventions

## Naming Conventions
- **Classes**: PascalCase (e.g., `ApplicationController`, `FeatureManager`, `DataManager`)
- **Methods/Functions**: camelCase (e.g., `initializeComponents`, `markDirty`, `updateUI`)
- **Variables**: camelCase (e.g., `currentProject`, `isDirty`, `totalManDays`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **CSS Classes/IDs**: kebab-case (e.g., `add-feature-btn`, `project-status`)
- **Files**: kebab-case (e.g., `application-controller.js`, `feature-manager.js`)

## Architecture Patterns
- **Component-based**: Each major feature is a separate component class
- **Dependency Injection**: Components receive dependencies via constructor
- **Manager Pattern**: Separate managers for different concerns (data, config, features, etc.)
- **Base Classes**: `BaseComponent` base class for shared functionality
- **Event-driven**: Heavy use of event listeners and DOM manipulation

## Class Structure
```javascript
class ComponentName extends BaseComponent {
    constructor(dependencies) {
        super('ComponentName');
        // Properties
        // Dependency injection
        // Method binding
    }
    
    async onInit() {
        // Initialization logic
    }
    
    // Public methods
    
    // Private methods
    
    onDestroy() {
        // Cleanup
    }
}
```

## Key Patterns
- **Async/await**: Preferred over promises chains
- **Error handling**: Try/catch with proper error reporting
- **Method binding**: `this.methodName = this.methodName.bind(this)` in constructor
- **DOM queries**: Uses `this.getElement()` and `this.querySelectorAll()` from BaseComponent
- **Event listeners**: Uses `this.addEventListener()` from BaseComponent for proper cleanup
- **State management**: Centralized state in ApplicationController
- **Data flow**: One-way data flow with explicit state updates

## Code Organization
- **Entry Point**: `src/renderer/js/main.js`
- **Components**: `src/renderer/js/components/` (feature managers)
- **Utils**: `src/renderer/js/utils/` (base classes, helpers)
- **Styles**: `src/renderer/styles/` with component-specific CSS files
- **Hierarchical structure**: Global → Project → Local configuration patterns

## Documentation
- **JSDoc**: Used for method documentation
- **Inline comments**: For complex business logic
- **Console logging**: Strategic logging for debugging and flow tracking
- **No excessive commenting**: Code is self-documenting through good naming

## Security & Best Practices
- **Context Isolation**: Electron security with preload script
- **Input Validation**: Data validation before persistence
- **Error Boundaries**: Comprehensive error handling
- **Memory Management**: Proper cleanup in onDestroy methods
- **Performance**: Lazy loading and strategic DOM updates