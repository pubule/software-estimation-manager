/**
 * React Unified Wrapper - Replaces all individual React page wrappers
 * 
 * PATTERN: State/Actions/Dispatcher (dal file /agents/auto-workflow.js)
 * - Utilizza ReactPageWrapper generico per eliminare duplicazione
 * - Business logic nelle Actions
 * - Wrapper solo per compatibilità con vanilla navigation
 */

/**
 * ReactPhasesWrapper - Phases page wrapper
 * Pattern State/Actions/Dispatcher: Delega tutto a ReactPageWrapper generico
 */
class ReactPhasesWrapper extends window.ReactPageWrapper {
    constructor() {
        super('phases');
    }
}

/**
 * ReactFeaturesWrapper - Features page wrapper  
 * Pattern State/Actions/Dispatcher: Delega tutto a ReactPageWrapper generico
 */
class ReactFeaturesWrapper extends window.ReactPageWrapper {
    constructor() {
        super('features');
    }
}

/**
 * ReactCalculationsWrapper - Calculations page wrapper
 * Pattern State/Actions/Dispatcher: Delega tutto a ReactPageWrapper generico
 */
class ReactCalculationsWrapper extends window.ReactPageWrapper {
    constructor() {
        super('calculations');
    }
}

/**
 * ReactAssumptionsWrapper - Assumptions page wrapper
 * Pattern State/Actions/Dispatcher: Delega tutto a ReactPageWrapper generico
 */
class ReactAssumptionsWrapper extends window.ReactPageWrapper {
    constructor() {
        super('assumptions');
    }
}

/**
 * ReactVersionHistoryWrapper - Version History page wrapper
 * Pattern State/Actions/Dispatcher: Delega tutto a ReactPageWrapper generico
 */
class ReactVersionHistoryWrapper extends window.ReactPageWrapper {
    constructor() {
        super('version-history');
    }
}

/**
 * ReactProjectManagerWrapper - Projects page wrapper
 * Pattern State/Actions/Dispatcher: Delega tutto a ReactPageWrapper generico
 * + Legacy compatibility methods per progetti
 */
class ReactProjectManagerWrapper extends window.ReactPageWrapper {
    constructor(app) {
        super('projects', app);
    }
    
    // Legacy compatibility: Complex project manager creation (solo per progetti)
    createProjectManagerApp() {
        // Pattern State/Actions/Dispatcher: Delega complex logic alle Actions se necessario
        // Per ora mantiene compatibility con existing logic
        return function ProjectManagerApp() {
            const { useEffect, useState } = window.React;
            const [componentsReady, setComponentsReady] = useState(false);
            const [timeoutReached, setTimeoutReached] = useState(false);
            
            useEffect(() => {
                let attempts = 0;
                const maxAttempts = 100;
                
                const checkComponents = () => {
                    attempts++;
                    
                    if (window.ReactComponents && window.ReactComponents.ProjectManager) {
                        console.log('✅ React ProjectManager component found after', attempts, 'attempts');
                        setComponentsReady(true);
                        return;
                    }
                    
                    if (attempts >= maxAttempts) {
                        console.error('❌ Timeout waiting for React ProjectManager component after 10 seconds');
                        console.log('Available ReactComponents:', window.ReactComponents ? Object.keys(window.ReactComponents) : 'undefined');
                        setTimeoutReached(true);
                        return;
                    }
                    
                    console.log(`⏳ Waiting for React components... attempt ${attempts}/${maxAttempts}`);
                    setTimeout(checkComponents, 100);
                };
                
                checkComponents();
            }, []);
            
            if (timeoutReached) {
                return window.React.createElement('div', {
                    style: {
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#ff6b6b',
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '8px',
                        margin: '1rem'
                    }
                }, [
                    window.React.createElement('h3', { key: 'title' }, '❌ Project Manager Loading Error'),
                    window.React.createElement('p', { key: 'message' }, 'Failed to load React components after 10 seconds'),
                    window.React.createElement('button', {
                        key: 'reload',
                        onClick: () => location.reload(),
                        className: 'btn btn-primary',
                        style: { marginTop: '1rem' }
                    }, 'Reload Application')
                ]);
            }
            
            if (!componentsReady) {
                return window.React.createElement('div', {
                    className: 'react-project-manager-loading',
                    style: {
                        padding: '2rem',
                        textAlign: 'center'
                    }
                }, [
                    window.React.createElement('h3', { 
                        key: 'title',
                        style: { color: '#007acc' }
                    }, '⚛️ Loading React Project Manager...'),
                    window.React.createElement('div', { 
                        key: 'spinner',
                        className: 'loading-spinner',
                        style: {
                            border: '3px solid #f3f3f3',
                            borderTop: '3px solid #007acc',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            animation: 'spin 1s linear infinite',
                            margin: '1rem auto'
                        }
                    })
                ]);
            }
            
            return window.React.createElement(window.ReactComponents.ProjectManager);
        };
    }
}

// Make wrapper classes available globally (backward compatibility)
if (typeof window !== 'undefined') {
    window.ReactPhasesWrapper = ReactPhasesWrapper;
    window.ReactFeaturesWrapper = ReactFeaturesWrapper;
    window.ReactCalculationsWrapper = ReactCalculationsWrapper;
    window.ReactAssumptionsWrapper = ReactAssumptionsWrapper;
    window.ReactVersionHistoryWrapper = ReactVersionHistoryWrapper;
    window.ReactProjectManagerWrapper = ReactProjectManagerWrapper;
    
    console.log('✅ React Unified Wrappers registered globally (State/Actions/Dispatcher pattern)');
}

console.log('React Unified Wrapper loaded - eliminates 200+ lines of duplicated code');