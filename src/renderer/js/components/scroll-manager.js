/**
 * Scroll Manager for Configuration Tabs
 * Handles scroll-to-top functionality and smooth scrolling enhancements
 */
class ScrollManager {
    constructor() {
        this.scrollToTopButton = null;
        this.scrollableContainers = new Map();
        this.scrollThreshold = 200;
        
        this.init();
    }

    /**
     * Initialize scroll manager
     */
    init() {
        this.createScrollToTopButton();
        this.setupScrollableContainers();
        this.bindEvents();
    }

    /**
     * Create scroll-to-top button
     */
    createScrollToTopButton() {
        // Create button if it doesn't exist
        if (!document.getElementById('scroll-to-top-btn')) {
            const button = document.createElement('button');
            button.id = 'scroll-to-top-btn';
            button.className = 'scroll-to-top';
            button.innerHTML = '<i class="fas fa-chevron-up"></i>';
            button.title = 'Scroll to top';
            button.setAttribute('aria-label', 'Scroll to top');
            
            document.body.appendChild(button);
            this.scrollToTopButton = button;
        } else {
            this.scrollToTopButton = document.getElementById('scroll-to-top-btn');
        }
    }

    /**
     * Setup scrollable containers
     */
    setupScrollableContainers() {
        // Configuration tab content areas
        const containerIds = [
            'storage-content',
            'suppliers-content', 
            'resources-content',
            'categories-content',
            'parameters-content',
            'global-content'
        ];

        containerIds.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                this.scrollableContainers.set(id, container);
                this.enhanceScrollableContainer(container);
            }
        });

        // Table wrappers
        const tableWrappers = document.querySelectorAll('.suppliers-table-wrapper, .resources-table-wrapper, .hierarchical-table-wrapper');
        tableWrappers.forEach((wrapper, index) => {
            const id = `table-wrapper-${index}`;
            this.scrollableContainers.set(id, wrapper);
            this.enhanceScrollableContainer(wrapper);
        });
    }

    /**
     * Enhance scrollable container with indicators and smooth scrolling
     */
    enhanceScrollableContainer(container) {
        // Add scroll indicator
        if (!container.querySelector('.scroll-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'scroll-indicator';
            container.style.position = 'relative';
            container.appendChild(indicator);
        }

        // Add scrollable class for CSS targeting
        container.classList.add('scrollable-container');

        // Setup scroll event listener
        container.addEventListener('scroll', (e) => {
            this.handleContainerScroll(e.target);
        });

        // Add keyboard navigation
        container.setAttribute('tabindex', '0');
        container.addEventListener('keydown', (e) => {
            this.handleKeyboardScroll(e, container);
        });
    }

    /**
     * Handle container scroll events
     */
    handleContainerScroll(container) {
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        // Update scroll indicator visibility
        const indicator = container.querySelector('.scroll-indicator');
        if (indicator) {
            const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
            indicator.style.opacity = scrollTop > 50 ? '0.3' : '0';
            indicator.style.top = `${scrollPercentage * (clientHeight - 50)}px`;
        }

        // Show/hide scroll-to-top button
        this.updateScrollToTopButton(scrollTop);

        // Add scroll momentum on mobile
        if (this.isMobileDevice()) {
            container.style.webkitOverflowScrolling = 'touch';
        }
    }

    /**
     * Handle keyboard scrolling
     */
    handleKeyboardScroll(event, container) {
        const scrollAmount = 50;
        let handled = false;

        switch (event.key) {
            case 'ArrowUp':
                container.scrollTop -= scrollAmount;
                handled = true;
                break;
            case 'ArrowDown':
                container.scrollTop += scrollAmount;
                handled = true;
                break;
            case 'PageUp':
                container.scrollTop -= container.clientHeight * 0.8;
                handled = true;
                break;
            case 'PageDown':
                container.scrollTop += container.clientHeight * 0.8;
                handled = true;
                break;
            case 'Home':
                if (event.ctrlKey) {
                    container.scrollTop = 0;
                    handled = true;
                }
                break;
            case 'End':
                if (event.ctrlKey) {
                    container.scrollTop = container.scrollHeight;
                    handled = true;
                }
                break;
        }

        if (handled) {
            event.preventDefault();
        }
    }

    /**
     * Update scroll-to-top button visibility
     */
    updateScrollToTopButton(scrollTop) {
        if (!this.scrollToTopButton) return;

        if (scrollTop > this.scrollThreshold) {
            this.scrollToTopButton.classList.add('visible');
        } else {
            this.scrollToTopButton.classList.remove('visible');
        }
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Scroll-to-top button click
        if (this.scrollToTopButton) {
            this.scrollToTopButton.addEventListener('click', () => {
                this.scrollToTop();
            });
        }

        // Listen for new configuration tabs being loaded
        document.addEventListener('configTabLoaded', (event) => {
            const tabId = event.detail.tabId;
            const container = document.getElementById(`${tabId}-content`);
            if (container && !this.scrollableContainers.has(`${tabId}-content`)) {
                this.scrollableContainers.set(`${tabId}-content`, container);
                this.enhanceScrollableContainer(container);
            }
        });

        // Listen for configuration tab switches
        document.addEventListener('configTabSwitch', (event) => {
            this.resetScrollPositions();
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Global scroll shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'Home') {
                event.preventDefault();
                this.scrollToTop();
            }
        });
    }

    /**
     * Scroll to top of current active container
     */
    scrollToTop() {
        // Find the currently active/visible scrollable container
        const activeContainer = this.getCurrentActiveContainer();
        
        if (activeContainer) {
            activeContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            // Fallback to window scroll
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }

    /**
     * Get currently active scrollable container
     */
    getCurrentActiveContainer() {
        // Check for active configuration tab
        const activeTab = document.querySelector('.tab-pane.active');
        if (activeTab) {
            const contentId = activeTab.id.replace('-tab', '-content');
            return this.scrollableContainers.get(contentId);
        }

        // Check for visible scrollable containers
        for (const [id, container] of this.scrollableContainers) {
            if (this.isElementVisible(container)) {
                return container;
            }
        }

        return null;
    }

    /**
     * Check if element is visible
     */
    isElementVisible(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth &&
            rect.width > 0 &&
            rect.height > 0
        );
    }

    /**
     * Reset scroll positions
     */
    resetScrollPositions() {
        // Optionally reset scroll positions when switching tabs
        // Currently disabled to maintain scroll position per tab
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Recalculate scroll indicators
        this.scrollableContainers.forEach((container) => {
            if (container.scrollTop > 0) {
                this.handleContainerScroll(container);
            }
        });
    }

    /**
     * Add smooth scrolling to specific element
     */
    scrollToElement(element, container = null) {
        if (!element) return;

        const targetContainer = container || this.getCurrentActiveContainer();
        if (!targetContainer) return;

        const elementRect = element.getBoundingClientRect();
        const containerRect = targetContainer.getBoundingClientRect();
        
        const scrollTop = targetContainer.scrollTop + elementRect.top - containerRect.top - 20; // 20px offset

        targetContainer.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });
    }

    /**
     * Scroll to section within container
     */
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            this.scrollToElement(section);
        }
    }

    /**
     * Enable/disable smooth scrolling
     */
    setSmoothScrolling(enabled) {
        const behavior = enabled ? 'smooth' : 'auto';
        
        this.scrollableContainers.forEach((container) => {
            container.style.scrollBehavior = behavior;
        });
    }

    /**
     * Check if device is mobile
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Add scroll position restoration
     */
    saveScrollPosition(containerId) {
        const container = this.scrollableContainers.get(containerId);
        if (container) {
            sessionStorage.setItem(`scroll-${containerId}`, container.scrollTop.toString());
        }
    }

    /**
     * Restore scroll position
     */
    restoreScrollPosition(containerId) {
        const container = this.scrollableContainers.get(containerId);
        const savedPosition = sessionStorage.getItem(`scroll-${containerId}`);
        
        if (container && savedPosition) {
            container.scrollTop = parseInt(savedPosition, 10);
        }
    }

    /**
     * Clear saved scroll positions
     */
    clearScrollPositions() {
        this.scrollableContainers.forEach((container, id) => {
            sessionStorage.removeItem(`scroll-${id}`);
        });
    }

    /**
     * Get scroll statistics
     */
    getScrollStats() {
        const stats = {};
        
        this.scrollableContainers.forEach((container, id) => {
            stats[id] = {
                scrollTop: container.scrollTop,
                scrollHeight: container.scrollHeight,
                clientHeight: container.clientHeight,
                scrollPercentage: (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100
            };
        });

        return stats;
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Remove scroll-to-top button
        if (this.scrollToTopButton && this.scrollToTopButton.parentNode) {
            this.scrollToTopButton.parentNode.removeChild(this.scrollToTopButton);
        }

        // Clear saved positions
        this.clearScrollPositions();

        // Remove event listeners (they'll be cleaned up with the elements)
        this.scrollableContainers.clear();
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.scrollManager = new ScrollManager();
});

// Make ScrollManager available globally
if (typeof window !== 'undefined') {
    window.ScrollManager = ScrollManager;
}