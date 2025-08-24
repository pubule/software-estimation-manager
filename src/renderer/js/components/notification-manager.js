/**
 * Notification Manager
 * Handles in-app notifications and toast messages
 */

class NotificationManager {
    constructor() {
        // Connect to global state store (may not be available immediately)
        this.store = window.appStore;
        this.storeUnsubscribe = null;
        
        // Local maps for DOM elements and timers (not suitable for global state)
        this.notificationElements = new Map(); // DOM elements and timers by ID
        this.container = null;
        this.defaultDuration = 5000; // 5 seconds (was 500, probably a typo)
        this.maxNotifications = 5;

        this.init();
        this.setupStoreSubscription();
        
        // If store wasn't available during construction, try to connect when it becomes available
        if (!this.store) {
            console.log('Store not available during NotificationManager construction, will attempt to connect later');
            this.connectToStoreWhenReady();
        }
    }
    /**
     * Setup store subscription for reactive notification updates
     */
    setupStoreSubscription() {
        if (!this.store) {
            console.warn('Store not available for NotificationManager');
            return;
        }

        this.storeUnsubscribe = this.store.subscribe((state, prevState) => {
            // React to notifications changes
            if (state.notifications !== prevState.notifications) {
                this.syncWithGlobalState(state.notifications, prevState.notifications);
            }
        });
    }

    /**
     * Sync local DOM elements with global state notifications
     */
    syncWithGlobalState(currentNotifications, previousNotifications) {
        // Find notifications that were added
        const currentIds = new Set(currentNotifications.map(n => n.id));
        const previousIds = new Set((previousNotifications || []).map(n => n.id));

        // Add new notifications to DOM
        for (const notification of currentNotifications) {
            if (!previousIds.has(notification.id) && !this.notificationElements.has(notification.id)) {
                this.renderNotification(notification);
            }
        }

        // Remove notifications that were deleted from global state
        for (const prevNotification of (previousNotifications || [])) {
            if (!currentIds.has(prevNotification.id) && this.notificationElements.has(prevNotification.id)) {
                this.removeNotificationElement(prevNotification.id);
            }
        }
    }

    /**
     * Render a notification from global state to DOM
     */
    renderNotification(notificationConfig) {
        // Create notification element
        const notificationEl = this.createNotificationElement(notificationConfig);

        // Add to container
        this.container.appendChild(notificationEl);

        // Store local element and timer info
        this.notificationElements.set(notificationConfig.id, {
            element: notificationEl,
            config: notificationConfig,
            timer: null
        });

        // Auto-remove after duration (if not persistent)
        if (!notificationConfig.persistent && notificationConfig.duration > 0) {
            const elementInfo = this.notificationElements.get(notificationConfig.id);
            elementInfo.timer = setTimeout(() => {
                // Check if store is available before removing
                if (this.store && this.store.getState) {
                    // Remove from global state (will trigger sync)
                    this.store.getState().removeNotification(notificationConfig.id);
                } else {
                    console.warn('Store not available for auto-remove notification, using direct DOM removal');
                    this.removeNotificationElement(notificationConfig.id);
                }
            }, notificationConfig.duration);
        }

        // Trigger entrance animation
        requestAnimationFrame(() => {
            notificationEl.classList.add('show');
        });
    }

    /**
     * Remove notification element from DOM
     */
    removeNotificationElement(id) {
        const elementInfo = this.notificationElements.get(id);
        if (!elementInfo) return;

        // Clear timer
        if (elementInfo.timer) {
            clearTimeout(elementInfo.timer);
        }

        // Trigger exit animation
        elementInfo.element.classList.add('removing');

        // Call onClose callback
        if (elementInfo.config.onClose) {
            elementInfo.config.onClose(elementInfo.config);
        }

        // Remove after animation
        setTimeout(() => {
            if (elementInfo.element.parentNode) {
                elementInfo.element.parentNode.removeChild(elementInfo.element);
            }
            this.notificationElements.delete(id);
        }, 300);
    }

    /**
     * Attempt to connect to store when it becomes available
     */
    connectToStoreWhenReady() {
        // Check periodically for store availability
        const checkForStore = () => {
            if (window.appStore && !this.store) {
                console.log('Store now available, connecting NotificationManager...');
                this.store = window.appStore;
                this.setupStoreSubscription();
                return;
            }
            
            // Keep checking every 100ms for up to 5 seconds
            if (!this.store && (this.storeCheckAttempts || 0) < 50) {
                this.storeCheckAttempts = (this.storeCheckAttempts || 0) + 1;
                setTimeout(checkForStore, 100);
            } else if (!this.store) {
                console.warn('NotificationManager: Store not available after 5 seconds, will operate in fallback mode');
            }
        };
        
        setTimeout(checkForStore, 100);
    }
    
    /**
     * Cleanup store subscription
     */
    destroy() {
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
            this.storeUnsubscribe = null;
        }
    }

    init() {
        // Create notifications container if it doesn't exist
        this.container = document.getElementById('notifications');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notifications';
            this.container.className = 'notifications-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('success', 'error', 'warning', 'info')
     * @param {Object} options - Additional options
     */
    static show(message, type = 'info', options = {}) {
        if (!window.notificationManager) {
            window.notificationManager = new NotificationManager();
        }

        return window.notificationManager.show(message, type, options);
    }

    /**
     * Show a notification instance method
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     * @param {Object} options - Additional options
     */
    show(message, type = 'info', options = {}) {
        const config = {
            id: options.id || Helpers.generateId('notification-'),
            title: options.title || this.getDefaultTitle(type),
            message: message,
            type: type,
            duration: options.duration !== undefined ? options.duration : this.defaultDuration,
            persistent: options.persistent || false,
            actions: options.actions || [],
            onClick: options.onClick || null,
            onClose: options.onClose || null,
            timestamp: new Date()
        };

        // Check if store is available
        if (!this.store || !this.store.getState) {
            console.warn('Store not available for NotificationManager, falling back to direct DOM');
            // Fallback to direct DOM manipulation
            if (!this.notificationElements) {
                this.notificationElements = new Map();
            }
            
            // Remove oldest if at limit
            if (this.notificationElements.size >= this.maxNotifications) {
                const oldestId = this.notificationElements.keys().next().value;
                this.remove(oldestId);
            }
            
            this.notificationElements.set(config.id, { element: null, config: config, timer: null });
            const element = this.createNotificationElement(config);
            this.container.appendChild(element);
            
            // Auto-dismiss if not persistent
            if (config.duration > 0) {
                setTimeout(() => this.remove(config.id), config.duration);
            }
            
            return config.id;
        }

        // Use global state if available
        const currentNotifications = this.store.getState().notifications;
        
        // Remove oldest notification if we're at the limit
        if (currentNotifications.length >= this.maxNotifications) {
            const oldestNotification = currentNotifications[0];
            this.store.getState().removeNotification(oldestNotification.id);
        }

        // Add to global state (will trigger sync to DOM via subscription)
        this.store.getState().addNotification(config);

        return config.id;
    }

    /**
     * Create notification DOM element
     * @param {Object} config - Notification configuration
     */
    createNotificationElement(config) {
        const notification = document.createElement('div');
        notification.className = `notification ${config.type}`;
        notification.dataset.id = config.id;

        // Icon based on type
        const iconClass = this.getIconClass(config.type);

        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="notification-content">
                ${config.title ? `<div class="notification-title">${Helpers.escapeHtml(config.title)}</div>` : ''}
                <div class="notification-message">${Helpers.escapeHtml(config.message)}</div>
                ${config.actions.length > 0 ? this.createActionsHtml(config.actions) : ''}
            </div>
            <button class="notification-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add event listeners
        this.attachEventListeners(notification, config);

        return notification;
    }

    /**
     * Create actions HTML
     * @param {Array} actions - Array of action objects
     */
    createActionsHtml(actions) {
        const actionsHtml = actions.map(action => `
            <button class="notification-action btn btn-small" data-action="${action.id}">
                ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                ${Helpers.escapeHtml(action.label)}
            </button>
        `).join('');

        return `<div class="notification-actions">${actionsHtml}</div>`;
    }

    /**
     * Attach event listeners to notification
     * @param {HTMLElement} element - Notification element
     * @param {Object} config - Notification configuration
     */
    attachEventListeners(element, config) {
        // Close button
        const closeBtn = element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(config.id);
            });
        }

        // Click handler
        if (config.onClick) {
            element.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-close, .notification-action')) {
                    config.onClick(config);
                }
            });
            element.style.cursor = 'pointer';
        }

        // Action buttons
        const actionButtons = element.querySelectorAll('.notification-action');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const actionId = button.dataset.action;
                const action = config.actions.find(a => a.id === actionId);

                if (action && action.handler) {
                    action.handler(config);
                }

                // Auto-close unless action specifies otherwise
                if (!action || action.autoClose !== false) {
                    this.remove(config.id);
                }
            });
        });

        // Pause auto-close on hover
        if (!config.persistent && config.duration > 0) {
            let pausedTime = 0;
            let pauseStart = 0;

            element.addEventListener('mouseenter', () => {
                const notification = this.notificationElements.get(config.id);
                if (notification && notification.timer) {
                    pauseStart = Date.now();
                    clearTimeout(notification.timer);
                    notification.timer = null;
                }
            });

            element.addEventListener('mouseleave', () => {
                const notification = this.notificationElements.get(config.id);
                if (notification && !notification.timer) {
                    pausedTime += Date.now() - pauseStart;
                    const remainingTime = config.duration - pausedTime;

                    if (remainingTime > 0) {
                        notification.timer = setTimeout(() => {
                            this.remove(config.id);
                        }, remainingTime);
                    } else {
                        this.remove(config.id);
                    }
                }
            });
        }
        
        return element;
    }

    /**
     * Remove a notification
     * @param {string} id - Notification ID
     */
    remove(id) {
        // Check if store is available
        if (!this.store || !this.store.getState) {
            console.warn('Store not available for NotificationManager.remove, using direct DOM removal');
            // Fallback to direct DOM removal
            if (this.notificationElements) {
                this.notificationElements.delete(id);
            }
            this.removeNotificationElement(id);
            return;
        }
        
        // Use global state instead of local notifications map
        // The removal will trigger sync via store subscription
        this.store.getState().removeNotification(id);
    }

    /**
     * Remove all notifications
     */
    removeAll() {
        // Check if store is available
        if (!this.store || !this.store.getState) {
            console.warn('Store not available for NotificationManager.removeAll, clearing local elements only');
            // Fallback to clearing local elements
            this.notificationElements.forEach((elementInfo, id) => {
                this.removeNotificationElement(id);
            });
            return;
        }
        
        // Use global state instead of local notifications map
        this.store.getState().clearNotifications();
    }

    /**
     * Update an existing notification
     * @param {string} id - Notification ID
     * @param {Object} updates - Updates to apply
     */
    update(id, updates) {
        // Check if store is available
        if (!this.store || !this.store.getState) {
            console.warn('Store not available for NotificationManager.update, updating DOM directly');
            // Fallback to direct DOM update only
            const elementInfo = this.notificationElements.get(id);
            if (elementInfo) {
                const { element } = elementInfo;
                
                // Update element content directly
                const titleEl = element.querySelector('.notification-title');
                const messageEl = element.querySelector('.notification-message');

                if (updates.title && titleEl) {
                    titleEl.textContent = updates.title;
                }

                if (updates.message && messageEl) {
                    messageEl.textContent = updates.message;
                }

                if (updates.type) {
                    // Update type class
                    element.className = `notification ${updates.type}`;

                    // Update icon
                    const iconEl = element.querySelector('.notification-icon i');
                    if (iconEl) {
                        iconEl.className = this.getIconClass(updates.type);
                    }
                }
                
                return true;
            }
            return false;
        }
        
        // Find notification in global state
        const state = this.store.getState();
        const notificationIndex = state.notifications.findIndex(n => n.id === id);
        if (notificationIndex === -1) return false;

        // Update in global state - this will trigger sync to DOM
        const updatedNotifications = [...state.notifications];
        updatedNotifications[notificationIndex] = {
            ...updatedNotifications[notificationIndex],
            ...updates,
            timestamp: new Date() // Update timestamp on change
        };

        // Update global state (will trigger DOM updates via subscription)
        this.store.setState({ notifications: updatedNotifications });

        // Also directly update DOM element for immediate feedback
        const elementInfo = this.notificationElements.get(id);
        if (elementInfo) {
            const { element } = elementInfo;
            
            // Update element content
            const titleEl = element.querySelector('.notification-title');
            const messageEl = element.querySelector('.notification-message');

            if (updates.title && titleEl) {
                titleEl.textContent = updates.title;
            }

            if (updates.message && messageEl) {
                messageEl.textContent = updates.message;
            }

            if (updates.type) {
                // Update type class
                element.className = `notification ${updates.type}`;

                // Update icon
                const iconEl = element.querySelector('.notification-icon i');
                if (iconEl) {
                    iconEl.className = this.getIconClass(updates.type);
                }
            }
        }

        return true;
    }

    /**
     * Get default title for notification type
     * @param {string} type - Notification type
     */
    getDefaultTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };

        return titles[type] || 'Notification';
    }

    /**
     * Get icon class for notification type
     * @param {string} type - Notification type
     */
    getIconClass(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        return icons[type] || 'fas fa-info-circle';
    }

    /**
     * Show success notification
     * @param {string} message - Message
     * @param {Object} options - Options
     */
    static success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show error notification
     * @param {string} message - Message
     * @param {Object} options - Options
     */
    static error(message, options = {}) {
        return this.show(message, 'error', {
            duration: 8000, // Longer duration for errors
            ...options
        });
    }

    /**
     * Show warning notification
     * @param {string} message - Message
     * @param {Object} options - Options
     */
    static warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Show info notification
     * @param {string} message - Message
     * @param {Object} options - Options
     */
    static info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Show persistent notification (doesn't auto-close)
     * @param {string} message - Message
     * @param {string} type - Type
     * @param {Object} options - Options
     */
    static persistent(message, type = 'info', options = {}) {
        return this.show(message, type, {
            persistent: true,
            ...options
        });
    }

    /**
     * Show confirmation notification with actions
     * @param {string} message - Message
     * @param {Function} onConfirm - Confirm callback
     * @param {Function} onCancel - Cancel callback
     * @param {Object} options - Options
     */
    static confirm(message, onConfirm, onCancel, options = {}) {
        const actions = [
            {
                id: 'confirm',
                label: options.confirmLabel || 'Confirm',
                icon: 'fas fa-check',
                handler: () => {
                    if (onConfirm) onConfirm();
                }
            },
            {
                id: 'cancel',
                label: options.cancelLabel || 'Cancel',
                icon: 'fas fa-times',
                handler: () => {
                    if (onCancel) onCancel();
                }
            }
        ];

        return this.show(message, 'warning', {
            persistent: true,
            actions: actions,
            ...options
        });
    }

    /**
     * Show progress notification
     * @param {string} message - Message
     * @param {number} progress - Progress percentage (0-100)
     * @param {Object} options - Options
     */
    static progress(message, progress = 0, options = {}) {
        const id = options.id || Helpers.generateId('progress-');

        // Create custom message with progress bar
        const progressMessage = `
            <div class="progress-notification">
                <div class="progress-message">${Helpers.escapeHtml(message)}</div>
                <div class="progress">
                    <div class="progress-bar" style="width: ${Math.max(0, Math.min(100, progress))}%"></div>
                </div>
                <div class="progress-text">${Math.round(progress)}%</div>
            </div>
        `;

        return this.show('', 'info', {
            id: id,
            title: options.title || 'Progress',
            message: progressMessage,
            persistent: true,
            ...options
        });
    }

    /**
     * Update progress notification
     * @param {string} id - Notification ID
     * @param {number} progress - Progress percentage
     * @param {string} message - Optional new message
     */
    static updateProgress(id, progress, message) {
        const notification = window.notificationManager?.notifications.get(id);
        if (!notification) return false;

        const progressBar = notification.element.querySelector('.progress-bar');
        const progressText = notification.element.querySelector('.progress-text');
        const progressMessage = notification.element.querySelector('.progress-message');

        if (progressBar) {
            progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        }

        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }

        if (message && progressMessage) {
            progressMessage.textContent = message;
        }

        // Auto-close when complete
        if (progress >= 100) {
            setTimeout(() => {
                NotificationManager.remove(id);
            }, 2000);
        }

        return true;
    }

    /**
     * Remove notification (static method)
     * @param {string} id - Notification ID
     */
    static remove(id) {
        if (window.notificationManager) {
            window.notificationManager.remove(id);
        }
    }

    /**
     * Remove all notifications (static method)
     */
    static removeAll() {
        if (window.notificationManager) {
            window.notificationManager.removeAll();
        }
    }

    /**
     * Get notification count
     */
    static getCount() {
        return window.appStore?.getState().notifications.length || 0;
    }

    /**
     * Check if a notification exists
     * @param {string} id - Notification ID
     */
    static exists(id) {
        const notifications = window.appStore?.getState().notifications || [];
        return notifications.some(n => n.id === id);
    }
}

// Add custom CSS for progress notifications
const progressNotificationCSS = `
.progress-notification {
    min-width: 250px;
}

.progress-message {
    margin-bottom: 8px;
    font-weight: 500;
}

.progress {
    height: 6px;
    background-color: var(--bg-quaternary);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 4px;
}

.progress-bar {
    height: 100%;
    background-color: var(--text-accent);
    transition: width 0.3s ease;
    border-radius: 3px;
}

.progress-text {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    text-align: right;
}

.notification-actions {
    margin-top: 12px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.notification-action {
    padding: 4px 12px;
    font-size: 12px;
}

.notification.removing {
    animation: slideOutRight 0.3s ease-out forwards;
}

.notification.show {
    animation: slideInRight 0.3s ease-out;
}

@keyframes slideOutRight {
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}
`;

// Inject CSS if not already present
if (typeof document !== 'undefined' && !document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = progressNotificationCSS;
    document.head.appendChild(style);
}

// Make NotificationManager available globally
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
}