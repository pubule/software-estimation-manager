/**
 * Helper Utilities
 * Common utility functions used throughout the application
 */

class Helpers {
    /**
     * Generate a unique ID
     * @param {string} prefix - Optional prefix for the ID
     * @param {number} length - Length of random part (default: 8)
     */
    static generateId(prefix = '', length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';

        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return prefix ? `${prefix}${result}` : result;
    }

    /**
     * Generate UUID v4
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     */
    static escapeHtml(text) {
        if (typeof text !== 'string') {
            return String(text);
        }

        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /**
     * Unescape HTML characters
     * @param {string} text - Text to unescape
     */
    static unescapeHtml(text) {
        if (typeof text !== 'string') {
            return String(text);
        }

        const map = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#039;': "'"
        };

        return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, (m) => map[m]);
    }

    /**
     * Format currency
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency symbol (default: €)
     */
    static formatCurrency(amount, currency = '€') {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return `${currency}0.00`;
        }

        return `${currency}${amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    /**
     * Format number with thousand separators
     * @param {number} number - Number to format
     * @param {number} decimals - Number of decimal places
     */
    static formatNumber(number, decimals = 0) {
        if (typeof number !== 'number' || isNaN(number)) {
            return '0';
        }

        return number.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Format date
     * @param {string|Date} date - Date to format
     * @param {string} format - Format type ('short', 'long', 'datetime')
     */
    static formatDate(date, format = 'short') {
        if (!date) return '';

        const dateObj = date instanceof Date ? date : new Date(date);

        if (isNaN(dateObj.getTime())) {
            return 'Invalid Date';
        }

        const options = {
            short: {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            },
            long: {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            },
            datetime: {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        };

        return dateObj.toLocaleDateString('en-US', options[format] || options.short);
    }

    /**
     * Calculate time ago
     * @param {string|Date} date - Date to calculate from
     */
    static timeAgo(date) {
        if (!date) return '';

        const dateObj = date instanceof Date ? date : new Date(date);
        const now = new Date();
        const diffMs = now - dateObj;
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

        return this.formatDate(dateObj);
    }

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately
     */
    static debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }

        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }

    /**
     * Deep merge objects
     * @param {Object} target - Target object
     * @param {...Object} sources - Source objects
     */
    static deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    /**
     * Check if value is an object
     * @param {*} item - Item to check
     */
    static isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     */
    static validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     */
    static validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Convert bytes to human readable format
     * @param {number} bytes - Bytes to convert
     * @param {number} decimals - Number of decimal places
     */
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Generate random color
     * @param {string} format - Color format ('hex', 'rgb', 'hsl')
     */
    static randomColor(format = 'hex') {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);

        switch (format) {
            case 'rgb':
                return `rgb(${r}, ${g}, ${b})`;
            case 'hsl':
                const h = Math.floor(Math.random() * 360);
                const s = Math.floor(Math.random() * 100);
                const l = Math.floor(Math.random() * 100);
                return `hsl(${h}, ${s}%, ${l}%)`;
            case 'hex':
            default:
                return '#' + [r, g, b].map(x => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                }).join('');
        }
    }

    /**
     * Convert string to slug
     * @param {string} text - Text to convert
     */
    static slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    /**
     * Capitalize first letter of each word
     * @param {string} text - Text to capitalize
     */
    static capitalize(text) {
        if (typeof text !== 'string') return '';

        return text.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    /**
     * Truncate text with ellipsis
     * @param {string} text - Text to truncate
     * @param {number} length - Maximum length
     * @param {string} suffix - Suffix to add (default: '...')
     */
    static truncate(text, length, suffix = '...') {
        if (typeof text !== 'string') return '';
        if (text.length <= length) return text;

        return text.substring(0, length - suffix.length) + suffix;
    }

    /**
     * Get file extension from filename
     * @param {string} filename - Filename
     */
    static getFileExtension(filename) {
        if (typeof filename !== 'string') return '';

        const lastDot = filename.lastIndexOf('.');
        return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase();
    }

    /**
     * Get file size category
     * @param {number} bytes - File size in bytes
     */
    static getFileSizeCategory(bytes) {
        if (bytes < 1024) return 'tiny';
        if (bytes < 1024 * 1024) return 'small';
        if (bytes < 10 * 1024 * 1024) return 'medium';
        if (bytes < 100 * 1024 * 1024) return 'large';
        return 'huge';
    }

    /**
     * Parse CSV line
     * @param {string} text - CSV line text
     * @param {string} separator - Field separator
     */
    static parseCSVLine(text, separator = ',') {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const next = text[i + 1];

            if (char === '"') {
                if (inQuotes && next === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === separator && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    /**
     * Sort array of objects by multiple fields
     * @param {Array} array - Array to sort
     * @param {Array} sortFields - Array of sort field objects {field, direction}
     */
    static multiSort(array, sortFields) {
        return array.sort((a, b) => {
            for (const { field, direction = 'asc' } of sortFields) {
                let aVal = a[field];
                let bVal = b[field];

                // Handle null/undefined values
                if (aVal == null && bVal == null) continue;
                if (aVal == null) return direction === 'asc' ? 1 : -1;
                if (bVal == null) return direction === 'asc' ? -1 : 1;

                // Convert to comparable types
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    /**
     * Group array by field
     * @param {Array} array - Array to group
     * @param {string|Function} keySelector - Field name or function to get key
     */
    static groupBy(array, keySelector) {
        const getKey = typeof keySelector === 'function'
            ? keySelector
            : (item) => item[keySelector];

        return array.reduce((groups, item) => {
            const key = getKey(item);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    }

    /**
     * Remove duplicates from array
     * @param {Array} array - Array to deduplicate
     * @param {string|Function} keySelector - Field name or function to get unique key
     */
    static uniqueBy(array, keySelector) {
        const seen = new Set();
        const getKey = typeof keySelector === 'function'
            ? keySelector
            : (item) => item[keySelector];

        return array.filter(item => {
            const key = getKey(item);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Check if browser supports local storage
     */
    static supportsLocalStorage() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Safe JSON parse
     * @param {string} jsonString - JSON string to parse
     * @param {*} defaultValue - Default value if parsing fails
     */
    static safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.warn('JSON parse failed:', e);
            return defaultValue;
        }
    }

    /**
     * Safe JSON stringify
     * @param {*} obj - Object to stringify
     * @param {*} defaultValue - Default value if stringifying fails
     */
    static safeJsonStringify(obj, defaultValue = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            console.warn('JSON stringify failed:', e);
            return defaultValue;
        }
    }

    /**
     * Download data as file
     * @param {string} data - Data to download
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    static downloadAsFile(data, filename, mimeType = 'text/plain') {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            }
        } catch (error) {
            console.error('Copy to clipboard failed:', error);
            return false;
        }
    }

    /**
     * Wait for specified time
     * @param {number} ms - Milliseconds to wait
     */
    static wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry function with exponential backoff
     * @param {Function} fn - Function to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     */
    static async retry(fn, maxRetries = 3, baseDelay = 1000) {
        let lastError;

        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (i === maxRetries) {
                    throw lastError;
                }

                const delay = baseDelay * Math.pow(2, i);
                await this.wait(delay);
            }
        }
    }
}

// Make Helpers available globally
if (typeof window !== 'undefined') {
    window.Helpers = Helpers;
}