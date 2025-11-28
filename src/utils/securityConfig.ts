/**
 * Security Configuration and Constants
 * Centralized security settings for the application
 */

export const SECURITY_CONFIG = {
  // Session Management
  SESSION: {
    DURATION: 8 * 60 * 60 * 1000, // 8 hours
    IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    STORAGE_KEY: 'app_session',
    USE_SESSION_STORAGE: true, // Use sessionStorage instead of localStorage
  },

  // Input Validation
  VALIDATION: {
    EMAIL_MAX_LENGTH: 254,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    ACCOUNT_NUMBER_MAX_LENGTH: 10,
    PROMO_CODE_MAX_LENGTH: 20,
    TEXT_INPUT_MAX_LENGTH: 1000,
    SEARCH_QUERY_MAX_LENGTH: 100,
    PART_NUMBER_MAX_LENGTH: 50,
    QUANTITY_MAX: 9999,
    AMOUNT_MAX: 999999.99,
  },

  // XSS Prevention
  XSS_PREVENTION: {
    DANGEROUS_CHARS: /[<>"'&]/g,
    SANITIZE_HTML: true,
    ESCAPE_OUTPUT: true,
  },

  // Admin Security
  ADMIN: {
    SUPER_ADMIN_ACCOUNT: '999',
    SPECIAL_ADMIN_ACCOUNT: '99',
    REQUIRE_ADDITIONAL_VALIDATION: true,
  },

  // Environment Security
  ENVIRONMENT: {
    REQUIRE_HTTPS_IN_PRODUCTION: true,
    HIDE_ERRORS_IN_PRODUCTION: true,
    LOG_SECURITY_EVENTS: true,
  },

  // Content Security Policy
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'"],
    STYLE_SRC: ["'self'", "'unsafe-inline'"],
    IMG_SRC: ["'self'", "data:", "https:"],
    CONNECT_SRC: ["'self'", "https://api.netlify.com", "https://*.supabase.co"],
  },

  // Rate Limiting (for future implementation)
  RATE_LIMITING: {
    LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW: 15 * 60 * 1000, // 15 minutes
    API_REQUESTS_PER_MINUTE: 100,
  },
};

/**
 * Security utility functions
 */
export class SecurityUtils {
  /**
   * Check if running in production
   */
  static isProduction(): boolean {
    return import.meta.env.PROD;
  }

  /**
   * Check if HTTPS is being used
   */
  static isHTTPS(): boolean {
    return window.location.protocol === 'https:';
  }

  /**
   * Validate environment security requirements
   */
  static validateEnvironmentSecurity(): {
    isSecure: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let isSecure = true;

    // Check HTTPS in production
    if (this.isProduction() && !this.isHTTPS()) {
      warnings.push('HTTPS is required in production');
      isSecure = false;
    }

    // Check for required environment variables
    const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    for (const envVar of requiredEnvVars) {
      if (!import.meta.env[envVar]) {
        warnings.push(`Missing required environment variable: ${envVar}`);
        isSecure = false;
      }
    }

    return { isSecure, warnings };
  }

  /**
   * Log security event (for monitoring)
   */
  static logSecurityEvent(event: string, details?: any): void {
    if (SECURITY_CONFIG.ENVIRONMENT.LOG_SECURITY_EVENTS) {
      console.warn(`[SECURITY] ${event}`, details);
      
      // In production, this would send to a security monitoring service
      if (this.isProduction()) {
        // TODO: Send to security monitoring service
      }
    }
  }

  /**
   * Generate Content Security Policy header value
   */
  static generateCSPHeader(): string {
    const csp = SECURITY_CONFIG.CSP;
    const directives = [
      `default-src ${csp.DEFAULT_SRC.join(' ')}`,
      `script-src ${csp.SCRIPT_SRC.join(' ')}`,
      `style-src ${csp.STYLE_SRC.join(' ')}`,
      `img-src ${csp.IMG_SRC.join(' ')}`,
      `connect-src ${csp.CONNECT_SRC.join(' ')}`,
    ];
    
    return directives.join('; ');
  }
}

export default SECURITY_CONFIG;