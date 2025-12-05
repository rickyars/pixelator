/**
 * ErrorHandler - Centralized error handling with consistent behavior
 */
class ErrorHandler {
    /**
     * Handle an error with consistent logging and user notification
     * @param {Error|string} error - Error object or message
     * @param {string} context - Context where error occurred (for logging)
     * @param {boolean} showUser - Whether to show error to user via alert
     * @param {boolean} rethrow - Whether to rethrow the error after handling
     */
    static handle(error, context = 'Unknown', showUser = true, rethrow = false) {
        // Normalize error to Error object
        const errorObj = error instanceof Error ? error : new Error(String(error));

        // Log to console with context
        console.error(`Error in ${context}:`, errorObj);

        // Show user-friendly message if requested
        if (showUser) {
            this.showUserError(errorObj, context);
        }

        // Optionally rethrow for caller to handle
        if (rethrow) {
            throw errorObj;
        }
    }

    /**
     * Show user-friendly error message
     * @param {Error} error - Error object
     * @param {string} context - Context where error occurred
     */
    static showUserError(error, context) {
        // Create user-friendly message
        let message = this.getUserFriendlyMessage(error);

        // Add context if helpful
        if (context && context !== 'Unknown') {
            message = `${message}\n\nContext: ${context}`;
        }

        alert(message);
    }

    /**
     * Convert technical error to user-friendly message
     * @param {Error} error - Error object
     * @returns {string} User-friendly message
     */
    static getUserFriendlyMessage(error) {
        const message = error.message || String(error);

        // Map common errors to friendly messages
        if (message.includes('File too large')) {
            return message; // Already user-friendly
        }

        if (message.includes('dimensions too large')) {
            return message; // Already user-friendly
        }

        if (message.includes('Failed to load image')) {
            return 'Could not load the image. Please try a different file.';
        }

        if (message.includes('Failed to read file')) {
            return 'Could not read the file. Please try again.';
        }

        if (message.includes('Required element') && message.includes('not found')) {
            return 'Application error: Missing UI element. Please refresh the page.';
        }

        // Default: return original message if it seems user-friendly,
        // otherwise generic message
        if (message.length < 100 && !message.includes('undefined') && !message.includes('null')) {
            return message;
        }

        return 'An unexpected error occurred. Please try again.';
    }

    /**
     * Handle promise rejection
     * @param {Error} error - Error from rejected promise
     * @param {string} context - Context where promise was rejected
     * @param {boolean} showUser - Whether to show error to user
     */
    static handlePromiseRejection(error, context = 'Async operation', showUser = true) {
        this.handle(error, context, showUser, false);
    }

    /**
     * Wrap an async function with error handling
     * @param {Function} fn - Async function to wrap
     * @param {string} context - Context for error reporting
     * @param {boolean} showUser - Whether to show errors to user
     * @returns {Function} Wrapped function
     */
    static wrapAsync(fn, context, showUser = true) {
        return async function(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                ErrorHandler.handle(error, context, showUser, false);
                return null; // Return null on error
            }
        };
    }

    /**
     * Assert a condition, throw error if false
     * @param {boolean} condition - Condition to check
     * @param {string} message - Error message if condition is false
     * @param {string} context - Context for error
     */
    static assert(condition, message, context = 'Assertion') {
        if (!condition) {
            this.handle(new Error(message), context, false, true);
        }
    }
}
