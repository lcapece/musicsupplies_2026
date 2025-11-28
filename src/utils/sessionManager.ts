/**
 * Secure Session Management Utility
 * Handles session storage, validation, and cleanup
 */

export interface SessionData {
  user: any;
  timestamp: number;
  expiresAt: number;
}

const SESSION_KEY = 'app_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const IDLE_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours in milliseconds (increased from 30 minutes)

export class SessionManager {
  private static instance: SessionManager;
  private idleTimer: NodeJS.Timeout | null = null;
  private onSessionExpired?: () => void;

  private constructor() {
    this.setupIdleDetection();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Store user session securely
   */
  setSession(user: any): void {
    const now = Date.now();
    const sessionData: SessionData = {
      user: this.sanitizeUserData(user),
      timestamp: now,
      expiresAt: now + SESSION_DURATION
    };

    try {
      // Use localStorage for session persistence across tabs/refreshes
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      this.resetIdleTimer();
    } catch (error) {
      console.error('Failed to store session:', error);
      throw new Error('Session storage failed');
    }
  }

  /**
   * Get current session if valid
   */
  getSession(): any | null {
    try {
      let sessionStr = localStorage.getItem(SESSION_KEY);
      
      // Fallback to sessionStorage if localStorage is empty (migration support)
      if (!sessionStr) {
        sessionStr = sessionStorage.getItem(SESSION_KEY);
        if (sessionStr) {
          // Migrate from sessionStorage to localStorage
          localStorage.setItem(SESSION_KEY, sessionStr);
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
      
      if (!sessionStr) return null;

      const sessionData: SessionData = JSON.parse(sessionStr);
      
      // Check if session has expired
      if (Date.now() > sessionData.expiresAt) {
        this.clearSession();
        return null;
      }

      // Update last activity timestamp less frequently to reduce storage writes
      const timeSinceLastUpdate = Date.now() - sessionData.timestamp;
      if (timeSinceLastUpdate > 5 * 60 * 1000) { // Update every 5 minutes
        sessionData.timestamp = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      }
      
      return sessionData.user;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY); // Clean up both
      // Clear cart from both storages on logout
      sessionStorage.removeItem('cart');
      localStorage.removeItem('cart');
      sessionStorage.removeItem('searchInteracted');
      this.clearIdleTimer();
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Set callback for session expiration
   */
  onExpired(callback: () => void): void {
    this.onSessionExpired = callback;
  }

  /**
   * Sanitize user data before storage
   */
  private sanitizeUserData(user: any): any {
    // Remove sensitive data and keep only necessary fields
    const {
      accountNumber,
      acctName,
      address,
      city,
      state,
      zip,
      id,
      email,
      mobile_phone,
      requires_password_change,
      is_special_admin,
      is_staff,
      staff_username,
      salesman_mode,
      is_demo
    } = user;

    return {
      accountNumber,
      acctName,
      address,
      city,
      state,
      zip,
      id,
      email,
      mobile_phone,
      requires_password_change: Boolean(requires_password_change),
      is_special_admin: Boolean(is_special_admin),
      is_staff: Boolean(is_staff),
      staff_username: staff_username || null,
      salesman_mode: Boolean(salesman_mode),
      is_demo: Boolean(is_demo)
    };
  }

  /**
   * Setup idle detection
   */
  private setupIdleDetection(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetTimer = () => {
      this.resetIdleTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });
  }

  /**
   * Reset idle timer
   */
  private resetIdleTimer(): void {
    this.clearIdleTimer();
    
    this.idleTimer = setTimeout(() => {
      this.clearSession();
      if (this.onSessionExpired) {
        this.onSessionExpired();
      }
    }, IDLE_TIMEOUT);
  }

  /**
   * Disable idle timer (for debugging)
   */
  disableIdleTimer(): void {
    this.clearIdleTimer();
  }

  /**
   * Clear idle timer
   */
  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Extend session if user is active
   */
  extendSession(): void {
    const session = this.getSession();
    if (session) {
      this.setSession(session);
    }
  }
}

export const sessionManager = SessionManager.getInstance();
