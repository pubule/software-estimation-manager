/**
 * Modal Manager
 * Handles modal dialogs and popup windows
 */

class ModalManager {
    constructor() {
        // Connect to global state store
        this.store = window.appStore;
        this.storeUnsubscribe = null;
        
        this.activeModals = new Set();
        this.modalStack = [];
        this.escapeKeyHandler = this.handleEscapeKey.bind(this);

        this.init();
        this.setupStoreSubscription();
    }
    /**
     * Setup store subscription for reactive modal state
     */
    setupStoreSubscription() {
        if (!this.store) {
            console.warn('Store not available for ModalManager');
            return;
        }

        this.storeUnsubscribe = this.store.subscribe((state, prevState) => {
            // Sync local modal state with global state
            if (state.modalsOpen !== prevState.modalsOpen) {
                this.syncWithGlobalState(state.modalsOpen);
            }
        });
    }

    /**
     * Sync local modal state with global state
     */
    syncWithGlobalState(globalModalsOpen) {
        // Convert Set to Array for easier comparison
        const globalArray = Array.from(globalModalsOpen);
        const localArray = Array.from(this.activeModals);

        // Find modals that should be opened (in global but not local)
        const toOpen = globalArray.filter(id => !this.activeModals.has(id));
        
        // Find modals that should be closed (in local but not global) 
        const toClose = localArray.filter(id => !globalModalsOpen.has(id));

        // Open modals that are in global state but not local
        toOpen.forEach(modalId => {
            console.log('ModalManager: Syncing modal open from global state:', modalId);
            this.showModalDOM(modalId); // Show DOM without updating global state
        });

        // Close modals that are local but not in global state
        toClose.forEach(modalId => {
            console.log('ModalManager: Syncing modal close from global state:', modalId);
            this.closeModalDOM(modalId); // Close DOM without updating global state
        });
    }

    /**
     * Show modal DOM without updating global state (for sync)
     */
    showModalDOM(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with ID '${modalId}' not found`);
            return false;
        }

        // Only update local state (don't update global state to avoid loops)
        if (!this.activeModals.has(modalId)) {
            this.activeModals.add(modalId);
            this.modalStack.push(modalId);

            // Show modal DOM
            modal.classList.add('active');
            document.body.classList.add('modal-open');

            // Set focus to first focusable element
            this.setInitialFocus(modal, options.focusElement);

            // Setup modal-specific handlers
            this.setupModalHandlers(modal, options);

            // Trigger callback
            if (options.onShow) {
                options.onShow(modal);
            }
        }

        return true;
    }

    /**
     * Close modal DOM without updating global state (for sync)
     */
    closeModalDOM(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal || !this.activeModals.has(modalId)) {
            return false;
        }

        // Only update local state (don't update global state to avoid loops)
        this.activeModals.delete(modalId);

        // Remove from stack
        const stackIndex = this.modalStack.indexOf(modalId);
        if (stackIndex > -1) {
            this.modalStack.splice(stackIndex, 1);
        }

        // Hide modal DOM
        modal.classList.remove('active');

        // Remove body class if no more modals
        if (this.activeModals.size === 0) {
            document.body.classList.remove('modal-open');
        }

        // Restore focus to previous element
        this.restoreFocus(modal);

        // Clean up modal handlers
        this.cleanupModalHandlers(modal);

        // Trigger callback
        if (options.onClose) {
            options.onClose(modal);
        }

        return true;
    }

    init() {
        // Setup global event listeners
        document.addEventListener('keydown', this.escapeKeyHandler);

        // Setup click outside to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
                this.closeModal(e.target.id);
            }
        });
    }

    /**
     * Show a modal
     * @param {string} modalId - Modal element ID
     * @param {Object} options - Modal options
     */
    showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with ID '${modalId}' not found`);
            return false;
        }

        // Close other modals if not stacking
        if (!options.stack && this.activeModals.size > 0) {
            this.closeAllModals();
        }

        // Update global state first (will trigger sync)
        if (this.store) {
            this.store.getState().openModal(modalId);
        }

        // Add to local active modals (if not already added by sync)
        if (!this.activeModals.has(modalId)) {
            this.activeModals.add(modalId);
            this.modalStack.push(modalId);

            // Show modal DOM
            modal.classList.add('active');
            document.body.classList.add('modal-open');

            // Set focus to first focusable element
            this.setInitialFocus(modal, options.focusElement);

            // Setup modal-specific handlers
            this.setupModalHandlers(modal, options);

            // Trigger callback
            if (options.onShow) {
                options.onShow(modal);
            }
        }

        return true;
    }

    /**
     * Close a modal
     * @param {string} modalId - Modal element ID
     * @param {Object} options - Close options
     */
    closeModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal || !this.activeModals.has(modalId)) {
            return false;
        }

        // Trigger before close callback
        if (options.onBeforeClose) {
            const result = options.onBeforeClose(modal);
            if (result === false) {
                return false; // Cancel close
            }
        }

        // Update global state first (will trigger sync)
        if (this.store) {
            this.store.getState().closeModal(modalId);
        }

        // Remove from local active modals (if not already removed by sync)
        if (this.activeModals.has(modalId)) {
            this.activeModals.delete(modalId);

            // Remove from stack
            const stackIndex = this.modalStack.indexOf(modalId);
            if (stackIndex > -1) {
                this.modalStack.splice(stackIndex, 1);
            }

            // Hide modal DOM
            modal.classList.remove('active');

            // Remove body class if no more modals
            if (this.activeModals.size === 0) {
                document.body.classList.remove('modal-open');
            }

            // Restore focus to previous element
            this.restoreFocus(modal);

            // Clean up modal handlers
            this.cleanupModalHandlers(modal);

            // Trigger callback
            if (options.onClose) {
                options.onClose(modal);
            }
        }

        return true;
    }

    /**
     * Close all active modals
     */
    closeAllModals() {
        const modalIds = Array.from(this.activeModals);
        modalIds.forEach(modalId => {
            this.closeModal(modalId);
        });
    }

    /**
     * Check if a modal is active
     * @param {string} modalId - Modal element ID
     */
    isModalActive(modalId) {
        return this.activeModals.has(modalId);
    }

    /**
     * Get the currently active modal (top of stack)
     */
    getActiveModal() {
        if (this.modalStack.length === 0) {
            return null;
        }

        const activeModalId = this.modalStack[this.modalStack.length - 1];
        return document.getElementById(activeModalId);
    }

    /**
     * Handle escape key press
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleEscapeKey(e) {
        if (e.key === 'Escape' && this.modalStack.length > 0) {
            const topModalId = this.modalStack[this.modalStack.length - 1];
            const modal = document.getElementById(topModalId);

            // Check if modal allows escape key closing
            if (modal && !modal.dataset.noEscapeClose) {
                this.closeModal(topModalId);
            }
        }
    }

    /**
     * Set initial focus in modal
     * @param {HTMLElement} modal - Modal element
     * @param {string|HTMLElement} focusElement - Element to focus or selector
     */
    setInitialFocus(modal, focusElement) {
        let elementToFocus;

        if (focusElement) {
            if (typeof focusElement === 'string') {
                elementToFocus = modal.querySelector(focusElement);
            } else if (focusElement instanceof HTMLElement) {
                elementToFocus = focusElement;
            }
        }

        // Fallback to first focusable element
        if (!elementToFocus) {
            elementToFocus = this.getFirstFocusableElement(modal);
        }

        if (elementToFocus) {
            // Store previously focused element
            modal._previouslyFocused = document.activeElement;

            // Focus after a small delay to ensure modal is visible
            setTimeout(() => {
                elementToFocus.focus();
            }, 100);
        }
    }

    /**
     * Restore focus to previously focused element
     * @param {HTMLElement} modal - Modal element
     */
    restoreFocus(modal) {
        if (modal._previouslyFocused && typeof modal._previouslyFocused.focus === 'function') {
            modal._previouslyFocused.focus();
            delete modal._previouslyFocused;
        }
    }

    /**
     * Get first focusable element in modal
     * @param {HTMLElement} modal - Modal element
     */
    getFirstFocusableElement(modal) {
        const focusableSelectors = [
            'input:not([disabled]):not([readonly])',
            'textarea:not([disabled]):not([readonly])',
            'select:not([disabled])',
            'button:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ];

        const focusableElements = modal.querySelectorAll(focusableSelectors.join(', '));
        return focusableElements.length > 0 ? focusableElements[0] : null;
    }

    /**
     * Get all focusable elements in modal
     * @param {HTMLElement} modal - Modal element
     */
    getFocusableElements(modal) {
        const focusableSelectors = [
            'input:not([disabled]):not([readonly])',
            'textarea:not([disabled]):not([readonly])',
            'select:not([disabled])',
            'button:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ];

        return Array.from(modal.querySelectorAll(focusableSelectors.join(', ')));
    }

    /**
     * Setup modal-specific handlers
     * @param {HTMLElement} modal - Modal element
     * @param {Object} options - Modal options
     */
    setupModalHandlers(modal, options) {
        // Setup focus trap
        if (options.trapFocus !== false) {
            modal._focusTrapHandler = this.createFocusTrapHandler(modal);
            document.addEventListener('keydown', modal._focusTrapHandler);
        }

        // Setup close button handlers
        const closeButtons = modal.querySelectorAll('.modal-close, [data-modal-close]');
        closeButtons.forEach(button => {
            if (!button._modalCloseHandler) {
                button._modalCloseHandler = (e) => {
                    e.preventDefault();
                    this.closeModal(modal.id);
                };
                button.addEventListener('click', button._modalCloseHandler);
            }
        });

        // Setup form submission if applicable
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => {
            if (!form._modalSubmitHandler && options.onSubmit) {
                form._modalSubmitHandler = (e) => {
                    e.preventDefault();
                    const result = options.onSubmit(form, modal);

                    // Close modal if submit returns true
                    if (result === true) {
                        this.closeModal(modal.id);
                    }
                };
                form.addEventListener('submit', form._modalSubmitHandler);
            }
        });
    }

    /**
     * Clean up modal handlers
     * @param {HTMLElement} modal - Modal element
     */
    cleanupModalHandlers(modal) {
        // Remove focus trap
        if (modal._focusTrapHandler) {
            document.removeEventListener('keydown', modal._focusTrapHandler);
            delete modal._focusTrapHandler;
        }

        // Clean up close button handlers
        const closeButtons = modal.querySelectorAll('.modal-close, [data-modal-close]');
        closeButtons.forEach(button => {
            if (button._modalCloseHandler) {
                button.removeEventListener('click', button._modalCloseHandler);
                delete button._modalCloseHandler;
            }
        });

        // Clean up form handlers
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => {
            if (form._modalSubmitHandler) {
                form.removeEventListener('submit', form._modalSubmitHandler);
                delete form._modalSubmitHandler;
            }
        });
    }

    /**
     * Create focus trap handler
     * @param {HTMLElement} modal - Modal element
     */
    createFocusTrapHandler(modal) {
        return (e) => {
            if (e.key !== 'Tab') return;

            const focusableElements = this.getFocusableElements(modal);
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                // Shift + Tab - moving backwards
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab - moving forwards
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
    }

    /**
     * Create a confirmation modal
     * @param {string} message - Confirmation message
     * @param {Object} options - Modal options
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const modalId = 'confirmation-modal';
            let modal = document.getElementById(modalId);

            // Create modal if it doesn't exist
            if (!modal) {
                modal = this.createConfirmationModal(modalId);
                document.body.appendChild(modal);
            }

            // Update modal content
            const messageEl = modal.querySelector('.confirmation-message');
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');

            if (messageEl) {
                messageEl.textContent = message;
            }

            if (confirmBtn) {
                confirmBtn.textContent = options.confirmText || 'Confirm';
                confirmBtn.className = `btn ${options.confirmClass || 'btn-primary'} confirm-btn`;
            }

            if (cancelBtn) {
                cancelBtn.textContent = options.cancelText || 'Cancel';
            }

            // Setup handlers
            const handleConfirm = () => {
                this.closeModal(modalId);
                resolve(true);
            };

            const handleCancel = () => {
                this.closeModal(modalId);
                resolve(false);
            };

            // Remove existing handlers
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));

            // Add new handlers
            modal.querySelector('.confirm-btn').addEventListener('click', handleConfirm);
            modal.querySelector('.cancel-btn').addEventListener('click', handleCancel);

            // Show modal
            this.showModal(modalId, {
                focusElement: '.confirm-btn',
                onClose: () => resolve(false)
            });
        });
    }

    /**
     * Create confirmation modal element
     * @param {string} modalId - Modal ID
     */
    createConfirmationModal(modalId) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Confirm Action</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="confirmation-message"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                    <button class="btn btn-primary confirm-btn">Confirm</button>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Create an alert modal
     * @param {string} message - Alert message
     * @param {Object} options - Modal options
     */
    alert(message, options = {}) {
        return new Promise((resolve) => {
            const modalId = 'alert-modal';
            let modal = document.getElementById(modalId);

            // Create modal if it doesn't exist
            if (!modal) {
                modal = this.createAlertModal(modalId);
                document.body.appendChild(modal);
            }

            // Update modal content
            const messageEl = modal.querySelector('.alert-message');
            const okBtn = modal.querySelector('.ok-btn');
            const titleEl = modal.querySelector('.modal-title');

            if (titleEl) {
                titleEl.textContent = options.title || 'Alert';
            }

            if (messageEl) {
                messageEl.textContent = message;
            }

            if (okBtn) {
                okBtn.textContent = options.okText || 'OK';
                okBtn.className = `btn ${options.okClass || 'btn-primary'} ok-btn`;
            }

            // Setup handler
            const handleOk = () => {
                this.closeModal(modalId);
                resolve(true);
            };

            // Remove existing handler
            okBtn.replaceWith(okBtn.cloneNode(true));

            // Add new handler
            modal.querySelector('.ok-btn').addEventListener('click', handleOk);

            // Show modal
            this.showModal(modalId, {
                focusElement: '.ok-btn',
                onClose: () => resolve(true)
            });
        });
    }

    /**
     * Create alert modal element
     * @param {string} modalId - Modal ID
     */
    createAlertModal(modalId) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Alert</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="alert-message"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary ok-btn">OK</button>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Show loading modal
     * @param {string} message - Loading message
     * @param {Object} options - Modal options
     */
    showLoading(message = 'Loading...', options = {}) {
        const modalId = 'loading-modal';
        let modal = document.getElementById(modalId);

        // Create modal if it doesn't exist
        if (!modal) {
            modal = this.createLoadingModal(modalId);
            document.body.appendChild(modal);
        }

        // Update message
        const messageEl = modal.querySelector('.loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }

        // Show modal
        this.showModal(modalId, {
            ...options,
            trapFocus: false
        });

        return modalId;
    }

    /**
     * Create loading modal element
     * @param {string} modalId - Modal ID
     */
    createLoadingModal(modalId) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal loading-modal';
        modal.dataset.noEscapeClose = 'true';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-body text-center">
                    <div class="spinner"></div>
                    <div class="loading-message">Loading...</div>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Hide loading modal
     */
    hideLoading() {
        this.closeModal('loading-modal');
    }

    /**
     * Destroy the modal manager and clean up
     */
    destroy() {
        // Close all modals
        this.closeAllModals();

        // Remove event listeners
        document.removeEventListener('keydown', this.escapeKeyHandler);

        // Cleanup store subscription
        if (this.storeUnsubscribe) {
            this.storeUnsubscribe();
            this.storeUnsubscribe = null;
        }

        // Clear collections
        this.activeModals.clear();
        this.modalStack = [];
    }
}

// Make ModalManager available globally
if (typeof window !== 'undefined') {
    window.ModalManager = ModalManager;
}