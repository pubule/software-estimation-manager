/**
 * Performance Optimizer
 * Provides utilities for optimizing application performance
 */

class PerformanceOptimizer {
    static instance = null;

    constructor() {
        if (PerformanceOptimizer.instance) {
            return PerformanceOptimizer.instance;
        }

        // Performance monitoring
        this.metrics = {
            componentInitTimes: new Map(),
            renderTimes: new Map(),
            dataOperations: new Map(),
            memoryUsage: []
        };

        // Optimization flags
        this.optimizations = {
            virtualScrolling: false,
            lazyLoading: true,
            componentCaching: true,
            eventDelegation: true
        };

        // DOM optimization
        this.domCache = new Map();
        this.intersectionObserver = null;

        // Initialize performance monitoring
        this.initializeMonitoring();

        PerformanceOptimizer.instance = this;
    }

    static getInstance() {
        if (!PerformanceOptimizer.instance) {
            PerformanceOptimizer.instance = new PerformanceOptimizer();
        }
        return PerformanceOptimizer.instance;
    }

    /**
     * Initialize performance monitoring
     */
    initializeMonitoring() {
        // Monitor memory usage periodically
        this.startMemoryMonitoring();

        // Set up Intersection Observer for lazy loading
        this.setupIntersectionObserver();

        // Monitor long tasks
        this.monitorLongTasks();
    }

    /**
     * Memory usage monitoring
     */
    startMemoryMonitoring() {
        if (!window.performance?.memory) return;

        const measureMemory = () => {
            const memory = window.performance.memory;
            this.metrics.memoryUsage.push({
                timestamp: Date.now(),
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit
            });

            // Keep only last 100 measurements
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage.shift();
            }
        };

        // Measure every 30 seconds
        setInterval(measureMemory, 30000);
        measureMemory(); // Initial measurement
    }

    /**
     * Set up Intersection Observer for lazy loading
     */
    setupIntersectionObserver() {
        if (!window.IntersectionObserver) return;

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const callback = element.dataset.lazyCallback;
                        
                        if (callback && window[callback]) {
                            window[callback](element);
                            this.intersectionObserver.unobserve(element);
                        }
                    }
                });
            },
            { rootMargin: '50px' }
        );
    }

    /**
     * Monitor long tasks that block the main thread
     */
    monitorLongTasks() {
        if (!window.PerformanceObserver) return;

        try {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.duration > 50) { // Tasks longer than 50ms
                        console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
                        
                        // Log for debugging
                        this.metrics.longTasks = this.metrics.longTasks || [];
                        this.metrics.longTasks.push({
                            duration: entry.duration,
                            startTime: entry.startTime,
                            timestamp: Date.now()
                        });
                    }
                });
            });

            observer.observe({ entryTypes: ['longtask'] });
        } catch (error) {
            console.warn('Long task monitoring not supported');
        }
    }

    /**
     * Measure component initialization time
     */
    measureComponentInit(componentName, initFunction) {
        return this.measureOperation(
            `${componentName}_init`, 
            initFunction,
            this.metrics.componentInitTimes
        );
    }

    /**
     * Measure render performance
     */
    measureRender(componentName, renderFunction) {
        return this.measureOperation(
            `${componentName}_render`,
            renderFunction,
            this.metrics.renderTimes
        );
    }

    /**
     * Measure data operation performance
     */
    measureDataOperation(operationName, operationFunction) {
        return this.measureOperation(
            operationName,
            operationFunction,
            this.metrics.dataOperations
        );
    }

    /**
     * Generic operation measurement
     */
    async measureOperation(operationName, operation, metricsMap) {
        const startTime = performance.now();
        
        try {
            const result = await operation();
            const duration = performance.now() - startTime;
            
            // Store metrics
            if (!metricsMap.has(operationName)) {
                metricsMap.set(operationName, []);
            }
            
            const operations = metricsMap.get(operationName);
            operations.push({
                duration,
                timestamp: Date.now()
            });
            
            // Keep only last 50 measurements
            if (operations.length > 50) {
                operations.shift();
            }
            
            // Log slow operations
            if (duration > 100) {
                console.warn(`Slow operation: ${operationName} took ${duration.toFixed(2)}ms`);
            }
            
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            console.error(`Operation ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
            throw error;
        }
    }

    /**
     * Optimize DOM operations
     */
    optimizeDOM() {
        return new DOMOptimizer(this.domCache, this.intersectionObserver);
    }

    /**
     * Batch DOM updates to prevent layout thrashing
     */
    batchDOMUpdates(updates) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                updates.forEach(update => {
                    try {
                        update();
                    } catch (error) {
                        console.error('DOM update error:', error);
                    }
                });
                resolve();
            });
        });
    }

    /**
     * Debounce helper with performance optimization
     */
    debounce(func, wait, options = {}) {
        let timeout;
        let lastCallTime = 0;
        let lastArgs;
        
        const { 
            leading = false, 
            trailing = true,
            maxWait = null 
        } = options;

        return function executedFunction(...args) {
            const currentTime = Date.now();
            lastArgs = args;
            
            const invokeFunc = () => {
                lastCallTime = currentTime;
                return func.apply(this, lastArgs);
            };

            const shouldInvokeLeading = leading && !timeout;
            const shouldInvokeMaxWait = maxWait && (currentTime - lastCallTime >= maxWait);

            clearTimeout(timeout);

            if (shouldInvokeLeading || shouldInvokeMaxWait) {
                return invokeFunc();
            }

            timeout = setTimeout(() => {
                if (trailing && lastArgs) {
                    invokeFunc();
                }
            }, wait);
        };
    }

    /**
     * Throttle helper with performance optimization
     */
    throttle(func, limit) {
        let inThrottle;
        let lastFunc;
        let lastRan;

        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                lastRan = Date.now();
                inThrottle = true;
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    /**
     * Virtual scrolling implementation
     */
    enableVirtualScrolling(container, itemHeight, renderItem) {
        return new VirtualScroller(container, itemHeight, renderItem);
    }

    /**
     * Lazy loading for images and components
     */
    enableLazyLoading(elements, callback) {
        if (!this.intersectionObserver) return;

        elements.forEach(element => {
            element.dataset.lazyCallback = callback.name;
            this.intersectionObserver.observe(element);
        });
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            componentInitTimes: this.formatMetrics(this.metrics.componentInitTimes),
            renderTimes: this.formatMetrics(this.metrics.renderTimes),
            dataOperations: this.formatMetrics(this.metrics.dataOperations),
            memoryUsage: this.getMemoryTrend(),
            longTasks: this.metrics.longTasks?.length || 0
        };
    }

    formatMetrics(metricsMap) {
        const formatted = {};
        
        metricsMap.forEach((operations, operationName) => {
            if (operations.length > 0) {
                const durations = operations.map(op => op.duration);
                formatted[operationName] = {
                    count: operations.length,
                    average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
                    min: Math.min(...durations),
                    max: Math.max(...durations),
                    latest: operations[operations.length - 1].duration
                };
            }
        });
        
        return formatted;
    }

    getMemoryTrend() {
        if (this.metrics.memoryUsage.length < 2) return null;

        const recent = this.metrics.memoryUsage.slice(-10);
        const trend = recent.map(m => m.usedJSHeapSize);
        const isIncreasing = trend[trend.length - 1] > trend[0];

        return {
            current: recent[recent.length - 1].usedJSHeapSize,
            trend: isIncreasing ? 'increasing' : 'stable',
            samples: recent.length
        };
    }

    /**
     * Performance recommendations
     */
    getRecommendations() {
        const metrics = this.getMetrics();
        const recommendations = [];

        // Check for slow renders
        Object.entries(metrics.renderTimes).forEach(([component, stats]) => {
            if (stats.average > 16) { // More than one frame
                recommendations.push({
                    type: 'performance',
                    severity: 'warning',
                    message: `${component} render time is ${stats.average.toFixed(2)}ms (target: <16ms)`
                });
            }
        });

        // Check for slow data operations
        Object.entries(metrics.dataOperations).forEach(([operation, stats]) => {
            if (stats.average > 100) {
                recommendations.push({
                    type: 'performance',
                    severity: 'warning',
                    message: `${operation} taking ${stats.average.toFixed(2)}ms (consider optimization)`
                });
            }
        });

        // Check memory usage
        if (metrics.memoryUsage?.trend === 'increasing') {
            recommendations.push({
                type: 'memory',
                severity: 'warning',
                message: 'Memory usage is increasing, check for memory leaks'
            });
        }

        return recommendations;
    }

    /**
     * Clear metrics
     */
    clearMetrics() {
        this.metrics.componentInitTimes.clear();
        this.metrics.renderTimes.clear();
        this.metrics.dataOperations.clear();
        this.metrics.memoryUsage = [];
        this.metrics.longTasks = [];
    }
}

/**
 * DOM Optimizer
 * Optimizes DOM operations and caching
 */
class DOMOptimizer {
    constructor(domCache, intersectionObserver) {
        this.cache = domCache;
        this.observer = intersectionObserver;
    }

    /**
     * Get element with caching
     */
    getElementById(id, useCache = true) {
        if (useCache && this.cache.has(id)) {
            const cached = this.cache.get(id);
            if (document.contains(cached)) {
                return cached;
            } else {
                this.cache.delete(id); // Element was removed from DOM
            }
        }

        const element = document.getElementById(id);
        if (element && useCache) {
            this.cache.set(id, element);
        }
        
        return element;
    }

    /**
     * Batch multiple DOM reads
     */
    batchReads(operations) {
        const results = [];
        
        // Perform all reads in one batch to avoid layout thrashing
        operations.forEach(operation => {
            results.push(operation());
        });
        
        return results;
    }

    /**
     * Batch multiple DOM writes
     */
    batchWrites(operations) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                operations.forEach(operation => {
                    try {
                        operation();
                    } catch (error) {
                        console.error('DOM write error:', error);
                    }
                });
                resolve();
            });
        });
    }

    /**
     * Clear DOM cache
     */
    clearCache() {
        this.cache.clear();
    }
}

/**
 * Virtual Scroller
 * Implements virtual scrolling for large lists
 */
class VirtualScroller {
    constructor(container, itemHeight, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.items = [];
        this.visibleItems = new Map();
        
        this.setupScrolling();
    }

    setupScrolling() {
        this.container.addEventListener('scroll', 
            PerformanceOptimizer.getInstance().throttle(() => {
                this.updateVisibleItems();
            }, 16)
        );
    }

    setItems(items) {
        this.items = items;
        this.updateVisibleItems();
    }

    updateVisibleItems() {
        const scrollTop = this.container.scrollTop;
        const containerHeight = this.container.clientHeight;
        
        const startIndex = Math.floor(scrollTop / this.itemHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(containerHeight / this.itemHeight) + 1,
            this.items.length
        );

        // Remove items that are no longer visible
        this.visibleItems.forEach((element, index) => {
            if (index < startIndex || index >= endIndex) {
                element.remove();
                this.visibleItems.delete(index);
            }
        });

        // Add newly visible items
        for (let i = startIndex; i < endIndex; i++) {
            if (!this.visibleItems.has(i) && this.items[i]) {
                const element = this.renderItem(this.items[i], i);
                element.style.position = 'absolute';
                element.style.top = `${i * this.itemHeight}px`;
                element.style.height = `${this.itemHeight}px`;
                
                this.container.appendChild(element);
                this.visibleItems.set(i, element);
            }
        }

        // Update container height
        this.container.style.height = `${this.items.length * this.itemHeight}px`;
    }
}

// Create singleton instance
const performanceOptimizer = PerformanceOptimizer.getInstance();

// Make available globally
if (typeof window !== 'undefined') {
    window.PerformanceOptimizer = PerformanceOptimizer;
    window.performanceOptimizer = performanceOptimizer;
    window.DOMOptimizer = DOMOptimizer;
    window.VirtualScroller = VirtualScroller;
}