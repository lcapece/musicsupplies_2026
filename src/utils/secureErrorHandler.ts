/**
 * Secure Error Handler
 * Maps internal errors to generic user-friendly messages
 * Prevents exposure of sensitive information in browser console
 */

// Error codes map - internal use only
const ERROR_CODES = {
  AUTH_001: 'Authentication failed',
  AUTH_002: 'Session expired',
  AUTH_003: 'Invalid credentials',
  AUTH_004: 'Account locked',
  AUTH_005: 'Account deactivated',
  
  DATA_001: 'Unable to load data',
  DATA_002: 'Unable to save changes',
  DATA_003: 'Invalid data format',
  DATA_004: 'Data not found',
  
  NET_001: 'Connection error',
  NET_002: 'Server unavailable',
  NET_003: 'Request timeout',
  
  PERM_001: 'Access denied',
  PERM_002: 'Insufficient permissions',
  
  VAL_001: 'Invalid input',
  VAL_002: 'Required field missing',
  VAL_003: 'Invalid format',
  
  SYS_001: 'System error',
  SYS_002: 'Service unavailable',
  SYS_003: 'Feature not available'
};

// Production mode check
const isProduction = import.meta.env.PROD;

// Error sanitization patterns
const SENSITIVE_PATTERNS = [
  /supabase/gi,
  /database/gi,
  /table\s+\w+/gi,
  /column\s+\w+/gi,
  /accounts_lcmd/gi,
  /user_passwords/gi,
  /pwd/gi,
  /api[_\s]?key/gi,
  /secret/gi,
  /token/gi,
  /bearer/gi,
  /authorization/gi,
  /postgres/gi,
  /sql/gi,
  /rpc/gi,
  /function\s+\w+/gi,
  /\.from\(['"]\w+['"]\)/gi,
  /\.select\(/gi,
  /\.insert\(/gi,
  /\.update\(/gi,
  /\.delete\(/gi,
  /https?:\/\/[^\s]+/gi
];

/**
 * Sanitize error messages to remove sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  if (!message) return 'An error occurred';
  
  let sanitized = message;
  
  // Remove all sensitive patterns
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // If message is mostly redacted, return generic message
  if (sanitized.includes('[REDACTED]') && sanitized.split('[REDACTED]').length > 3) {
    return 'An error occurred while processing your request';
  }
  
  return sanitized;
}

/**
 * Map error to user-friendly message based on error type
 */
function mapErrorToUserMessage(error: any): string {
  // Check for specific error patterns
  const errorString = String(error?.message || error || '').toLowerCase();
  
  // Authentication errors
  if (errorString.includes('auth') || errorString.includes('login') || errorString.includes('password')) {
    if (errorString.includes('expired')) return ERROR_CODES.AUTH_002;
    if (errorString.includes('invalid')) return ERROR_CODES.AUTH_003;
    if (errorString.includes('locked')) return ERROR_CODES.AUTH_004;
    if (errorString.includes('deactivated')) return ERROR_CODES.AUTH_005;
    return ERROR_CODES.AUTH_001;
  }
  
  // Network errors
  if (errorString.includes('network') || errorString.includes('fetch') || errorString.includes('connection')) {
    if (errorString.includes('timeout')) return ERROR_CODES.NET_003;
    if (errorString.includes('server')) return ERROR_CODES.NET_002;
    return ERROR_CODES.NET_001;
  }
  
  // Permission errors
  if (errorString.includes('permission') || errorString.includes('denied') || errorString.includes('unauthorized')) {
    return ERROR_CODES.PERM_001;
  }
  
  // Validation errors
  if (errorString.includes('valid') || errorString.includes('format') || errorString.includes('required')) {
    if (errorString.includes('required')) return ERROR_CODES.VAL_002;
    if (errorString.includes('format')) return ERROR_CODES.VAL_003;
    return ERROR_CODES.VAL_001;
  }
  
  // Data errors
  if (errorString.includes('data') || errorString.includes('load') || errorString.includes('save')) {
    if (errorString.includes('not found')) return ERROR_CODES.DATA_004;
    if (errorString.includes('save') || errorString.includes('update')) return ERROR_CODES.DATA_002;
    return ERROR_CODES.DATA_001;
  }
  
  // Default system error
  return ERROR_CODES.SYS_001;
}

/**
 * Handle error securely - main export
 */
export function handleError(error: any, context?: string): string {
  // In development, log sanitized error for debugging
  if (!isProduction) {
    const sanitized = sanitizeErrorMessage(String(error?.message || error));
    console.warn(`[DEV] Error in ${context || 'Unknown'}: ${sanitized}`);
  }
  
  // Always return user-friendly message
  return mapErrorToUserMessage(error);
}

/**
 * Log error securely (for internal tracking only)
 */
export function logSecureError(error: any, context?: string, userId?: string): void {
  // Create secure error object without sensitive data
  const secureError = {
    timestamp: new Date().toISOString(),
    context: context || 'Unknown',
    errorCode: mapErrorToCode(error),
    userId: userId || 'anonymous',
    // Never include stack traces, original messages, or system details
  };
  
  // In production, you might send this to a secure logging service
  // For now, we'll only log in development with sanitization
  if (!isProduction) {
    console.info('Secure error logged:', secureError);
  }
}

/**
 * Map error to error code for internal tracking
 */
function mapErrorToCode(error: any): string {
  const message = mapErrorToUserMessage(error);
  return Object.entries(ERROR_CODES).find(([_, value]) => value === message)?.[0] || 'SYS_001';
}

/**
 * Create user-friendly error response
 */
export function createErrorResponse(error: any, context?: string): {
  success: false;
  message: string;
  errorCode?: string;
} {
  const userMessage = handleError(error, context);
  
  return {
    success: false,
    message: userMessage,
    // Only include error code in development
    ...(isProduction ? {} : { errorCode: mapErrorToCode(error) })
  };
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = handleError(error, context);
      throw new Error(message);
    }
  }) as T;
}

/**
 * React error boundary error handler
 */
export function handleReactError(error: Error, errorInfo: any): string {
  // Never expose React component stack or error details
  logSecureError(error, 'React Component');
  return 'The application encountered an error. Please refresh the page.';
}

/**
 * Global error handler setup
 */
export function setupSecureErrorHandling(): void {
  // Override console methods in production
  if (isProduction) {
    // Store original console methods for internal use
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };
    
    // Override console methods to prevent information disclosure
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};
    
    // Store originals for emergency use only
    (window as any).__emergency_console = originalConsole;
  }
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    logSecureError(event.reason, 'Unhandled Promise');
  });
  
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    event.preventDefault();
    logSecureError(event.error || event.message, 'Global Error');
  });
}