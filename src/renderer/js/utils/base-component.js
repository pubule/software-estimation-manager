/**
 * Base Component Class
 * Provides common functionality for all application components
 */

class BaseComponent {
    constructor(name) {
        this.name = name;
        this.eventListeners = new Map();
        this.initialized = false;
        this.destroyed = false;
        
        // Bind methods to maintain context
        this.destroy = this.destroy.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Initialize component - override in subclasses
     */
    async init() {
        if (this.initialized) {
            console.warn(`${this.name} already initialized`);
            return;
        }

        try {
            await this.onInit();
            this.initialized = true;
            console.log(`${this.name} initialized successfully`);
        } catch (error) {
            this.handleError('Initialization failed', error);
            throw error;
        }
    }

    /**
     * Override this method in subclasses
     */
    async onInit() {
        // Subclasses should implement this
    }

    /**
     * Add event listener with automatic cleanup tracking
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element || !event || !handler) {
            throw new Error('Invalid addEventListener parameters');
        }

        const boundHandler = handler.bind(this);
        element.addEventListener(event, boundHandler, options);

        // Track for cleanup
        const key = `${element.constructor.name}_${event}_${Date.now()}`;
        this.eventListeners.set(key, {
            element,
            event,
            handler: boundHandler,
            options
        });

        return key; // Return key for manual removal if needed
    }

    /**
     * Remove specific event listener
     */
    removeEventListener(key) {
        const listener = this.eventListeners.get(key);
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler);
            this.eventListeners.delete(key);
        }
    }

    /**
     * Remove all event listeners
     */
    removeAllEventListeners() {
        this.eventListeners.forEach((listener, key) => {
            listener.element.removeEventListener(listener.event, listener.handler);
        });
        this.eventListeners.clear();
    }

    /**
     * Safe DOM element getter
     */
    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found in ${this.name}`);
        }
        return element;
    }

    /**
     * Safe DOM query selector
     */
    querySelector(selector, parent = document) {
        const element = parent.querySelector(selector);
        if (!element) {
            console.warn(`Element with selector '${selector}' not found in ${this.name}`);
        }
        return element;
    }

    /**
     * Safe DOM query selector all
     */
    querySelectorAll(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Loading...') {
        const overlay = this.getElement('loading-overlay');
        if (overlay) {
            const messageEl = overlay.querySelector('p');
            if (messageEl) messageEl.textContent = message;
            overlay.classList.add('active');
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const overlay = this.getElement('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * Standardized error handling
     */
    handleError(context, error, showNotification = true) {
        const errorMessage = `${this.name}: ${context} - ${error.message}`;
        console.error(errorMessage, error);

        if (showNotification && window.NotificationManager) {
            NotificationManager.show(errorMessage, 'error');
        }

        // Emit error event for parent components to handle
        this.emit('error', { context, error, component: this.name });
    }

    /**
     * Execute operation with error boundary protection
     */
    async withErrorBoundary(operation, context, options = {}) {
        const {
            showNotification = true,
            defaultValue = null,
            swallowError = true,
            component = this.name
        } = options;

        try {
            return await operation();
        } catch (error) {
            // Use ErrorHandler if available, otherwise use built-in handling
            if (window.ErrorHandler) {
                const errorHandler = window.ErrorHandler.getInstance();
                errorHandler.handleError(context, error, { 
                    component,
                    showNotification 
                });
            } else {
                this.handleError(context, error, showNotification);
            }
            
            // Re-throw if not configured to swallow
            if (!swallowError) {
                throw error;
            }
            
            return defaultValue;
        }
    }

    /**
     * Emit custom events
     */
    emit(eventName, data = {}) {
        const customEvent = new CustomEvent(eventName, {
            detail: { ...data, component: this.name }
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * Listen for custom events
     */
    on(eventName, handler) {
        return this.addEventListener(document, eventName, handler);
    }

    /**
     * Debounce helper
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Throttle helper
     */
    throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Deep clone utility
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = this.deepClone(obj[key]);
        });
        return cloned;
    }

    /**
     * Validate required dependencies
     */
    validateDependencies(dependencies) {
        const missing = [];
        dependencies.forEach(dep => {
            if (!window[dep]) {
                missing.push(dep);
            }
        });

        if (missing.length > 0) {
            throw new Error(`Missing dependencies in ${this.name}: ${missing.join(', ')}`);
        }
    }

    /**
     * Check if component is in valid state
     */
    ensureValidState() {
        if (this.destroyed) {
            throw new Error(`${this.name} has been destroyed and cannot be used`);
        }
        if (!this.initialized) {
            throw new Error(`${this.name} must be initialized before use`);
        }
    }

    /**
     * Component cleanup
     */
    destroy() {
        if (this.destroyed) {
            console.warn(`${this.name} already destroyed`);
            return;
        }

        try {
            this.onDestroy();
            this.removeAllEventListeners();
            this.destroyed = true;
            console.log(`${this.name} destroyed successfully`);
        } catch (error) {
            this.handleError('Destroy failed', error);
        }
    }

    /**
     * Override this method in subclasses for cleanup
     */
    onDestroy() {
        // Subclasses should implement this
    }
}

// Make BaseComponent available globally
if (typeof window !== 'undefined') {
    window.BaseComponent = BaseComponent;
}