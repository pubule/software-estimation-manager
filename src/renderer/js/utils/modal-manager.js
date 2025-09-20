/**
 * Modal Manager Base Class
 * Provides standardized modal management functionality
 */

class ModalManagerBase extends BaseComponent {
    constructor(modalId, options = {}) {
        super(`ModalManager:${modalId}`);
        
        this.modalId = modalId;
        this.options = {
            closeOnEscape: true,
            closeOnOutsideClick: true,
            autoFocus: true,
            destroyOnClose: false,
            ...options
        };
        
        this.isOpen = false;
        this.focusedElementBeforeModal = null;
        this.form = null;
        this.callbacks = {
            onOpen: [],
            onClose: [],
            onSubmit: [],
            onCancel: []
        };
    }

    async onInit() {
        this.modal = this.getElement(this.modalId);
        if (!this.modal) {
            throw new Error(`Modal element with id '${this.modalId}' not found`);
        }

        this.setupEventListeners();
        this.findFormElement();
    }

    /**
     * Set up modal event listeners
     */
    setupEventListeners() {
        // Close button
        const closeBtn = this.querySelector('.modal-close', this.modal);
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', this.close);
        }

        // Cancel button
        const cancelBtn = this.querySelector('.cancel-btn, .btn-cancel', this.modal);
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', this.handleCancel);
        }

        // Submit button
        const submitBtn = this.querySelector('.submit-btn, .btn-submit', this.modal);
        if (submitBtn) {
            this.addEventListener(submitBtn, 'click', this.handleSubmit);
        }

        // Outside click
        if (this.options.closeOnOutsideClick) {
            this.addEventListener(this.modal, 'click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }

        // Escape key
        if (this.options.closeOnEscape) {
            this.addEventListener(document, 'keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        }

        // Form submission
        if (this.form) {
            this.addEventListener(this.form, 'submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
    }

    /**
     * Find form element within modal
     */
    findFormElement() {
        this.form = this.querySelector('form', this.modal);
    }

    /**
     * Open modal
     */
    open(data = null) {
        try {
            this.ensureValidState();

            if (this.isOpen) {
                console.warn(`Modal ${this.modalId} is already open`);
                return;
            }

            // Store currently focused element
            this.focusedElementBeforeModal = document.activeElement;

            // Populate modal if data provided
            if (data) {
                this.populateModal(data);
            }

            // Show modal
            this.modal.classList.add('active');
            this.isOpen = true;

            // Focus management
            if (this.options.autoFocus) {
                this.focusFirstElement();
            }

            // Trigger callbacks
            this.triggerCallbacks('onOpen', data);

            // Emit event
            this.emit('modal-opened', { modalId: this.modalId, data });

        } catch (error) {
            this.handleError('Failed to open modal', error);
        }
    }

    /**
     * Close modal
     */
    close() {
        try {
            if (!this.isOpen) {
                return;
            }

            // Hide modal
            this.modal.classList.remove('active');
            this.isOpen = false;

            // Restore focus
            if (this.focusedElementBeforeModal) {
                this.focusedElementBeforeModal.focus();
                this.focusedElementBeforeModal = null;
            }

            // Reset form if exists
            this.resetModal();

            // Trigger callbacks
            this.triggerCallbacks('onClose');

            // Emit event
            this.emit('modal-closed', { modalId: this.modalId });

            // Destroy if configured
            if (this.options.destroyOnClose && this.initialized) {
                setTimeout(() => this.destroy(), 100);
            }

        } catch (error) {
            this.handleError('Failed to close modal', error);
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        try {
            const formData = this.getFormData();
            const validation = this.validateFormData(formData);

            if (!validation.isValid) {
                this.showValidationErrors(validation.errors);
                return;
            }

            this.clearValidationErrors();
            
            // Show loading state
            this.setSubmitState(true);

            // Process submission
            const result = await this.processSubmission(formData);

            if (result.success) {
                this.triggerCallbacks('onSubmit', { formData, result });
                this.emit('modal-submitted', { modalId: this.modalId, formData, result });
                this.close();
            } else {
                this.handleSubmissionError(result.error);
            }

        } catch (error) {
            this.handleError('Form submission failed', error);
        } finally {
            this.setSubmitState(false);
        }
    }

    /**
     * Handle cancel action
     */
    handleCancel() {
        this.triggerCallbacks('onCancel');
        this.emit('modal-cancelled', { modalId: this.modalId });
        this.close();
    }

    /**
     * Get form data - override in subclasses
     */
    getFormData() {
        if (!this.form) return {};

        const formData = new FormData(this.form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
    }

    /**
     * Validate form data - override in subclasses
     */
    validateFormData(data) {
        return { isValid: true, errors: {} };
    }

    /**
     * Process form submission - override in subclasses
     */
    async processSubmission(formData) {
        return { success: true, data: formData };
    }

    /**
     * Populate modal with data - override in subclasses
     */
    populateModal(data) {
        // Override in subclasses
    }

    /**
     * Reset modal state - override in subclasses
     */
    resetModal() {
        if (this.form) {
            this.form.reset();
        }
        this.clearValidationErrors();
    }

    /**
     * Show validation errors
     */
    showValidationErrors(errors) {
        this.clearValidationErrors();

        Object.keys(errors).forEach(field => {
            const element = this.getElement(field) || this.querySelector(`[name="${field}"]`, this.modal);
            if (element) {
                element.classList.add('error');
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = errors[field];
                
                element.parentNode.appendChild(errorDiv);
            }
        });

        // Focus first error field
        const firstErrorField = this.querySelector('.error', this.modal);
        if (firstErrorField) {
            firstErrorField.focus();
        }
    }

    /**
     * Clear validation errors
     */
    clearValidationErrors() {
        // Remove error classes
        this.querySelectorAll('.error', this.modal).forEach(el => {
            el.classList.remove('error');
        });

        // Remove error messages
        this.querySelectorAll('.error-message', this.modal).forEach(el => {
            el.remove();
        });
    }

    /**
     * Handle submission errors
     */
    handleSubmissionError(error) {
        if (window.NotificationManager) {
            NotificationManager.show(`Submission failed: ${error}`, 'error');
        }
    }

    /**
     * Set submit button loading state
     */
    setSubmitState(isSubmitting) {
        const submitBtn = this.querySelector('.submit-btn, .btn-submit', this.modal);
        if (submitBtn) {
            submitBtn.disabled = isSubmitting;
            submitBtn.textContent = isSubmitting ? 'Processing...' : this.getSubmitButtonText();
        }
    }

    /**
     * Get submit button text - override in subclasses
     */
    getSubmitButtonText() {
        return 'Submit';
    }

    /**
     * Focus first focusable element in modal
     */
    focusFirstElement() {
        const focusableElements = this.querySelectorAll(
            'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            this.modal
        );

        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    /**
     * Register callback
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    /**
     * Unregister callback
     */
    off(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index > -1) {
                this.callbacks[event].splice(index, 1);
            }
        }
    }

    /**
     * Trigger callbacks
     */
    triggerCallbacks(event, data = null) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.handleError(`Callback error for ${event}`, error);
                }
            });
        }
    }

    /**
     * Set modal title
     */
    setTitle(title) {
        const titleElement = this.querySelector('.modal-title, h1, h2', this.modal);
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Show/hide modal
     */
    toggle(data = null) {
        if (this.isOpen) {
            this.close();
        } else {
            this.open(data);
        }
    }

    /**
     * Show unsaved changes dialog and return user's choice
     * @returns {Promise<boolean|null>} true = save, false = don't save, null = cancel
     */
    async showUnsavedChangesDialog() {
        return new Promise((resolve) => {
            try {
                // Check if unsaved changes modal exists
                const unsavedModal = document.getElementById('unsaved-changes-modal');
                if (!unsavedModal) {
                    // Fallback to browser confirm if modal doesn't exist
                    console.warn('Unsaved changes modal not found, using browser confirm');
                    const result = confirm('You have unsaved changes. Do you want to save them?');
                    resolve(result);
                    return;
                }

                // Show the modal
                unsavedModal.classList.add('active');

                // Handle button clicks
                const handleSave = () => {
                    cleanup();
                    resolve(true);
                };

                const handleDontSave = () => {
                    cleanup();
                    resolve(false);
                };

                const handleCancel = () => {
                    cleanup();
                    resolve(null);
                };

                const cleanup = () => {
                    unsavedModal.classList.remove('active');
                    saveBtn?.removeEventListener('click', handleSave);
                    dontSaveBtn?.removeEventListener('click', handleDontSave);
                    cancelBtn?.removeEventListener('click', handleCancel);
                    document.removeEventListener('keydown', handleEscape);
                };

                const handleEscape = (e) => {
                    if (e.key === 'Escape') {
                        handleCancel();
                    }
                };

                // Add event listeners
                const saveBtn = unsavedModal.querySelector('.save-btn, .btn-save');
                const dontSaveBtn = unsavedModal.querySelector('.dont-save-btn, .btn-dont-save');
                const cancelBtn = unsavedModal.querySelector('.cancel-btn, .btn-cancel');

                saveBtn?.addEventListener('click', handleSave);
                dontSaveBtn?.addEventListener('click', handleDontSave);
                cancelBtn?.addEventListener('click', handleCancel);
                document.addEventListener('keydown', handleEscape);

                // Focus the save button by default
                if (saveBtn) {
                    saveBtn.focus();
                }

            } catch (error) {
                console.error('Failed to show unsaved changes dialog:', error);
                // Fallback to browser confirm
                const result = confirm('You have unsaved changes. Do you want to save them?');
                resolve(result);
            }
        });
    }

    onDestroy() {
        if (this.isOpen) {
            this.close();
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ModalManagerBase = ModalManagerBase;
}