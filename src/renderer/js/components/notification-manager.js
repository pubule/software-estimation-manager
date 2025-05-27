/**
 * Notification Manager
 * Handles in-app notifications and toast messages
 */

class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.container = null;
        this.defaultDuration = 5000; // 5 seconds
        this.maxNotifications = 5;

        this.init();
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
            onClose: options.onClose || null
        };

        // Remove oldest notification if we're at the limit
        if (this.notifications.size >= this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.remove(oldestId);
        }

        // Create notification element
        const notificationEl = this.createNotificationElement(config);

        // Add to container
        this.container.appendChild(notificationEl);

        // Store notification
        this.notifications.set(config.id, {
            element: notificationEl,
            config: config,
            timer: null
        });

        // Auto-remove after duration (if not persistent)
        if (!config.persistent && config.duration > 0) {
            const notification = this.notifications.get(config.id);
            notification.timer = setTimeout(() => {
                this.remove(config.id);
            }, config.duration);
        }

        // Trigger entrance animation
        requestAnimationFrame(() => {
            notificationEl.classList.add('show');
        });

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
                const notification = this.notifications.get(config.id);
                if (notification && notification.timer) {
                    pauseStart = Date.now();
                    clearTimeout(notification.timer);
                    notification.timer = null;
                }
            });

            element.addEventListener('mouseleave', () => {
                const notification = this.notifications.get(config.id);
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
    }

    /**
     * Remove a notification
     * @param {string} id - Notification ID
     */
    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }

        // Trigger exit animation
        notification.element.classList.add('removing');

        // Call onClose callback
        if (notification.config.onClose) {
            notification.config.onClose(notification.config);
        }

        // Remove after animation
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications.delete(id);
        }, 300);
    }

    /**
     * Remove all notifications
     */
    removeAll() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.remove(id));
    }

    /**
     * Update an existing notification
     * @param {string} id - Notification ID
     * @param {Object} updates - Updates to apply
     */
    update(id, updates) {
        const notification = this.notifications.get(id);
        if (!notification) return false;

        // Update config
        Object.assign(notification.config, updates);

        // Update element content
        const titleEl = notification.element.querySelector('.notification-title');
        const messageEl = notification.element.querySelector('.notification-message');

        if (updates.title && titleEl) {
            titleEl.textContent = updates.title;
        }

        if (updates.message && messageEl) {
            messageEl.textContent = updates.message;
        }

        if (updates.type) {
            // Update type class
            notification.element.className = `notification ${updates.type}`;

            // Update icon
            const iconEl = notification.element.querySelector('.notification-icon i');
            if (iconEl) {
                iconEl.className = this.getIconClass(updates.type);
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
        return window.notificationManager?.notifications.size || 0;
    }

    /**
     * Check if a notification exists
     * @param {string} id - Notification ID
     */
    static exists(id) {
        return window.notificationManager?.notifications.has(id) || false;
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