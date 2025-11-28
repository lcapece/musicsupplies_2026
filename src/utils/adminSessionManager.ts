/**
 * Secure Admin Session Management Utility
 * Provides secure session access for admin components
 */

import { sessionManager } from './sessionManager';

export class AdminSessionManager {
  /**
   * Get current admin user securely
   * @returns Admin user data or null if not authenticated as admin
   */
  static getAdminUser(): any | null {
    const user = sessionManager.getSession();
    
    // Verify admin privileges
    if (!user || (user.accountNumber !== '999' && user.accountNumber !== '99' && !user.is_special_admin)) {
      return null;
    }
    
    return user;
  }

  /**
   * Check if current user is admin
   * @returns boolean indicating admin status
   */
  static isAdmin(): boolean {
    const user = sessionManager.getSession();
    return user && (user.accountNumber === '999' || user.accountNumber === '99' || user.is_special_admin === true);
  }

  /**
   * Check if current user is super admin (999)
   * @returns boolean indicating super admin status
   */
  static isSuperAdmin(): boolean {
    const user = sessionManager.getSession();
    return user && user.accountNumber === '999';
  }

  /**
   * Check if current user is special admin (99)
   * @returns boolean indicating special admin status
   */
  static isSpecialAdmin(): boolean {
    const user = sessionManager.getSession();
    return user && (user.accountNumber === '99' || user.is_special_admin === true);
  }

  /**
   * Validate admin action with additional security check
   * @param requiredLevel - 'admin', 'super', or 'special'
   * @returns boolean indicating if action is allowed
   */
  static validateAdminAction(requiredLevel: 'admin' | 'super' | 'special' = 'admin'): boolean {
    switch (requiredLevel) {
      case 'super':
        return this.isSuperAdmin();
      case 'special':
        return this.isSpecialAdmin();
      case 'admin':
      default:
        return this.isAdmin();
    }
  }
}

export const adminSessionManager = AdminSessionManager;