/**
 * Security Headers Implementation
 * Provides security headers for production deployment
 */

import { SECURITY_CONFIG } from './securityConfig';

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'Strict-Transport-Security': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

export class SecurityHeadersManager {
  /**
   * Generate all security headers for production
   */
  static generateSecurityHeaders(): SecurityHeaders {
    return {
      'Content-Security-Policy': this.generateCSPHeader(),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
  }

  /**
   * Generate Content Security Policy header
   */
  private static generateCSPHeader(): string {
    const csp = SECURITY_CONFIG.CSP;
    const directives = [
      `default-src ${csp.DEFAULT_SRC.join(' ')}`,
      `script-src ${csp.SCRIPT_SRC.join(' ')}`,
      `style-src ${csp.STYLE_SRC.join(' ')}`,
      `img-src ${csp.IMG_SRC.join(' ')}`,
      `connect-src ${csp.CONNECT_SRC.join(' ')}`,
      `font-src 'self' data:`,
      `object-src 'none'`,
      `media-src 'self'`,
      `frame-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`
    ];
    
    return directives.join('; ');
  }

  /**
   * Generate Netlify _headers file content
   */
  static generateNetlifyHeaders(): string {
    const headers = this.generateSecurityHeaders();
    
    let content = '/*\n';
    Object.entries(headers).forEach(([key, value]) => {
      content += `  ${key}: ${value}\n`;
    });
    
    // Add cache headers for static assets
    content += '\n/static/*\n';
    content += '  Cache-Control: public, max-age=31536000, immutable\n';
    
    content += '\n/*.js\n';
    content += '  Cache-Control: public, max-age=31536000, immutable\n';
    
    content += '\n/*.css\n';
    content += '  Cache-Control: public, max-age=31536000, immutable\n';
    
    content += '\n/*.png\n';
    content += '  Cache-Control: public, max-age=31536000, immutable\n';
    
    content += '\n/*.jpg\n';
    content += '  Cache-Control: public, max-age=31536000, immutable\n';

    return content;
  }

  /**
   * Generate Apache .htaccess file content
   */
  static generateApacheHeaders(): string {
    const headers = this.generateSecurityHeaders();
    
    let content = '<IfModule mod_headers.c>\n';
    Object.entries(headers).forEach(([key, value]) => {
      content += `  Header always set ${key} "${value}"\n`;
    });
    content += '</IfModule>\n\n';
    
    // Add cache headers
    content += '<IfModule mod_expires.c>\n';
    content += '  ExpiresActive on\n';
    content += '  ExpiresByType text/css "access plus 1 year"\n';
    content += '  ExpiresByType application/javascript "access plus 1 year"\n';
    content += '  ExpiresByType image/png "access plus 1 year"\n';
    content += '  ExpiresByType image/jpg "access plus 1 year"\n';
    content += '  ExpiresByType image/jpeg "access plus 1 year"\n';
    content += '</IfModule>\n';

    return content;
  }

  /**
   * Validate current security headers (for testing)
   */
  static async validateSecurityHeaders(url: string = window.location.origin): Promise<{
    isSecure: boolean;
    missingHeaders: string[];
    warnings: string[];
  }> {
    const missingHeaders: string[] = [];
    const warnings: string[] = [];
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const requiredHeaders = this.generateSecurityHeaders();
      
      Object.keys(requiredHeaders).forEach(header => {
        if (!response.headers.get(header)) {
          missingHeaders.push(header);
        }
      });
      
      // Check HTTPS
      if (!url.startsWith('https://') && window.location.protocol !== 'https:') {
        warnings.push('HTTPS not enforced');
      }
      
      return {
        isSecure: missingHeaders.length === 0 && warnings.length === 0,
        missingHeaders,
        warnings
      };
    } catch (error) {
      return {
        isSecure: false,
        missingHeaders: Object.keys(this.generateSecurityHeaders()),
        warnings: ['Unable to validate headers - network error']
      };
    }
  }
}

export default SecurityHeadersManager;
