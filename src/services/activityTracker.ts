import { supabase } from '../lib/supabase';

interface SessionData {
  sessionId: string | null;
  accountNumber: number | null;
}

interface SearchActivityData {
  searchTerm: string;
  searchType?: 'keyword' | 'sku' | 'brand' | 'category' | 'barcode';
  resultsCount?: number;
  clickedResults?: string[];
  searchDurationMs?: number;
  filtersApplied?: Record<string, any>;
}

interface CartActivityData {
  actionType: 'add' | 'remove' | 'update_quantity' | 'clear' | 'view' | 'add_backorder';
  sku: string;
  productName?: string;
  quantity?: number;
  quantityChange?: number;
  unitPrice?: number;
  totalPrice?: number;
  cartTotalAfter?: number;
  cartItemsCountAfter?: number;
  sourcePage?: string;
}

interface PageViewData {
  pageType: 'product_detail' | 'category' | 'search_results' | 'cart' | 'checkout' | 'order_history' | 'home';
  pageIdentifier?: string;
  viewDurationSeconds?: number;
  referrerPage?: string;
}

class ActivityTracker {
  private sessionId: string | null = null;
  private accountNumber: number | null = null;
  private sessionStartTime: Date | null = null;
  private lastActivityTime: Date | null = null;
  private pageViewStartTime: Date | null = null;
  private currentPage: string | null = null;

  // Initialize or get existing session
  async initSession(accountNumber: number, loginIdentifier: string): Promise<void> {
    try {
      // Check for existing active session
      const { data: existingSession } = await supabase
        .from('shopping_sessions')
        .select('id')
        .eq('account_number', accountNumber)
        .eq('session_status', 'active')
        .order('session_start', { ascending: false })
        .limit(1)
        .single();

      if (existingSession) {
        this.sessionId = existingSession.id;
        console.log('[ActivityTracker] Resuming existing session:', this.sessionId);
      } else {
        // Create new session
        const { data: newSession, error } = await supabase
          .from('shopping_sessions')
          .insert({
            account_number: accountNumber,
            login_identifier: loginIdentifier,
            ip_address: await this.getClientIP(),
            user_agent: navigator.userAgent,
            session_status: 'active'
          })
          .select('id')
          .single();

        if (error) {
          console.error('[ActivityTracker] Failed to create session:', error);
          return;
        }

        this.sessionId = newSession.id;
        console.log('[ActivityTracker] Created new session:', this.sessionId);
      }

      this.accountNumber = accountNumber;
      this.sessionStartTime = new Date();
      this.lastActivityTime = new Date();
    } catch (error) {
      console.error('[ActivityTracker] Session initialization error:', error);
    }
  }

  // End session on logout
  async endSession(): Promise<void> {
    if (!this.sessionId) return;

    try {
      await supabase
        .from('shopping_sessions')
        .update({
          session_end: new Date().toISOString(),
          session_status: 'logged_out'
        })
        .eq('id', this.sessionId);

      console.log('[ActivityTracker] Session ended:', this.sessionId);
      this.resetSession();
    } catch (error) {
      console.error('[ActivityTracker] Failed to end session:', error);
    }
  }

  // Track search activity
  async trackSearch(data: SearchActivityData): Promise<void> {
    if (!this.sessionId || !this.accountNumber) {
      console.warn('[ActivityTracker] No active session for search tracking');
      return;
    }

    try {
      const { error } = await supabase
        .from('search_activity')
        .insert({
          session_id: this.sessionId,
          account_number: this.accountNumber,
          search_term: data.searchTerm,
          search_type: data.searchType || 'keyword',
          results_count: data.resultsCount || 0,
          clicked_results: data.clickedResults || null,
          search_duration_ms: data.searchDurationMs || null,
          filters_applied: data.filtersApplied || null
        });

      if (error) {
        console.error('[ActivityTracker] Failed to track search:', error);
      } else {
        console.log('[ActivityTracker] Search tracked:', data.searchTerm);
        this.updateLastActivity();
      }
    } catch (error) {
      console.error('[ActivityTracker] Search tracking error:', error);
    }
  }

  // Track cart activity
  async trackCartAction(data: CartActivityData): Promise<void> {
    if (!this.sessionId || !this.accountNumber) {
      console.warn('[ActivityTracker] No active session for cart tracking');
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_activity')
        .insert({
          session_id: this.sessionId,
          account_number: this.accountNumber,
          action_type: data.actionType,
          sku: data.sku,
          product_name: data.productName || null,
          quantity: data.quantity || null,
          quantity_change: data.quantityChange || null,
          unit_price: data.unitPrice || null,
          total_price: data.totalPrice || null,
          cart_total_after: data.cartTotalAfter || null,
          cart_items_count_after: data.cartItemsCountAfter || null,
          source_page: data.sourcePage || this.currentPage || null
        });

      if (error) {
        console.error('[ActivityTracker] Failed to track cart action:', error);
      } else {
        console.log('[ActivityTracker] Cart action tracked:', data.actionType, data.sku);
        this.updateLastActivity();
      }
    } catch (error) {
      console.error('[ActivityTracker] Cart tracking error:', error);
    }
  }

  // Track page views
  async trackPageView(data: PageViewData): Promise<void> {
    if (!this.sessionId || !this.accountNumber) {
      console.warn('[ActivityTracker] No active session for page view tracking');
      return;
    }

    // End previous page view tracking
    if (this.pageViewStartTime && this.currentPage) {
      const duration = Math.floor((new Date().getTime() - this.pageViewStartTime.getTime()) / 1000);
      
      try {
        await supabase
          .from('page_view_activity')
          .insert({
            session_id: this.sessionId,
            account_number: this.accountNumber,
            page_type: this.currentPage as any,
            view_duration_seconds: duration,
            referrer_page: null
          });
      } catch (error) {
        console.error('[ActivityTracker] Failed to track previous page view duration:', error);
      }
    }

    // Start tracking new page view
    this.pageViewStartTime = new Date();
    this.currentPage = data.pageType;

    try {
      const { error } = await supabase
        .from('page_view_activity')
        .insert({
          session_id: this.sessionId,
          account_number: this.accountNumber,
          page_type: data.pageType,
          page_identifier: data.pageIdentifier || null,
          view_duration_seconds: data.viewDurationSeconds || null,
          referrer_page: data.referrerPage || null
        });

      if (error) {
        console.error('[ActivityTracker] Failed to track page view:', error);
      } else {
        console.log('[ActivityTracker] Page view tracked:', data.pageType);
        this.updateLastActivity();
      }
    } catch (error) {
      console.error('[ActivityTracker] Page view tracking error:', error);
    }
  }

  // Check for session timeout (30 minutes of inactivity)
  checkSessionTimeout(): void {
    if (!this.lastActivityTime || !this.sessionId) return;

    const now = new Date();
    const timeSinceLastActivity = now.getTime() - this.lastActivityTime.getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (timeSinceLastActivity > thirtyMinutes) {
      this.markSessionAsExpired();
    }
  }

  // Mark session as expired
  private async markSessionAsExpired(): Promise<void> {
    if (!this.sessionId) return;

    try {
      await supabase
        .from('shopping_sessions')
        .update({
          session_end: new Date().toISOString(),
          session_status: 'expired'
        })
        .eq('id', this.sessionId);

      console.log('[ActivityTracker] Session marked as expired:', this.sessionId);
      this.resetSession();
    } catch (error) {
      console.error('[ActivityTracker] Failed to mark session as expired:', error);
    }
  }

  // Detect and record abandoned cart
  async detectAbandonedCart(): Promise<void> {
    if (!this.sessionId || !this.accountNumber) return;

    try {
      // Check if there's cart activity in this session
      const { data: cartActivity } = await supabase
        .from('cart_activity')
        .select('*')
        .eq('session_id', this.sessionId)
        .order('action_timestamp', { ascending: false })
        .limit(1);

      if (!cartActivity || cartActivity.length === 0) return;

      const lastActivity = cartActivity[0];
      
      // Only mark as abandoned if cart has items and value
      if (lastActivity.cart_items_count_after > 0 && lastActivity.cart_total_after > 0) {
        // Get all cart items for this session
        const { data: allCartActivity } = await supabase
          .from('cart_activity')
          .select('*')
          .eq('session_id', this.sessionId)
          .order('action_timestamp', { ascending: false });

        // Build cart contents
        const cartItems = allCartActivity
          ?.filter(item => item.action_type === 'add' || item.action_type === 'update_quantity')
          .map(item => ({
            sku: item.sku,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price
          }));

        await supabase
          .from('abandoned_carts')
          .insert({
            session_id: this.sessionId,
            account_number: this.accountNumber,
            cart_value: lastActivity.cart_total_after,
            items_count: lastActivity.cart_items_count_after,
            cart_items: cartItems || [],
            last_activity: lastActivity.action_timestamp
          });

      }
    } catch (error) {
      console.error('[ActivityTracker] Failed to detect abandoned cart:', error);
    }
  }

  // Helper to get client IP (would need server-side for real IP)
  private async getClientIP(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  }

  // Update last activity time
  private updateLastActivity(): void {
    this.lastActivityTime = new Date();
  }

  // Reset session data
  private resetSession(): void {
    this.sessionId = null;
    this.accountNumber = null;
    this.sessionStartTime = null;
    this.lastActivityTime = null;
    this.pageViewStartTime = null;
    this.currentPage = null;
  }

  // Get current session info
  getSessionInfo(): SessionData {
    return {
      sessionId: this.sessionId,
      accountNumber: this.accountNumber
    };
  }
}

// Export singleton instance
export const activityTracker = new ActivityTracker();

// Auto-check for session timeout every 5 minutes
setInterval(() => {
  activityTracker.checkSessionTimeout();
}, 5 * 60 * 1000);
