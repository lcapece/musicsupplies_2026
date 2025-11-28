import { supabase } from '../lib/supabase';

// Performance-optimized logging utility with zero blocking operations
// All logging is async, queued, and fire-and-forget to ensure maximum frontend performance

interface CartActivityLogEntry {
  account_number?: number | null;
  cart_session_id: string;
  activity_type: 'add_item' | 'remove_item' | 'update_quantity' | 'clear_cart' | 'checkout_started' | 'checkout_completed' | 'checkout_failed' | 'add_backorder';
  item_partnumber?: string;
  item_description?: string;
  quantity_change?: number;
  quantity_after?: number;
  unit_price?: number;
  cart_total_after?: number;
  cart_items_count_after?: number;
  user_email?: string;
  source_page?: string;
}

interface SearchLogEntry {
  account_number?: number | null;
  session_id: string;
  search_term_1?: string;
  search_term_2?: string;
  exclusion_term?: string;
  search_query_full?: string;
  results_count?: number;
  results_clicked?: boolean;
  user_email?: string;
  source_page?: string;
}

// Logging queue for batching operations (if needed in future)
const logQueue: Array<{type: 'cart' | 'search', data: any}> = [];

// High-performance cart activity logger - completely async, non-blocking
export const logCartActivity = (entry: CartActivityLogEntry): void => {
  // Fire and forget - never block the UI
  setTimeout(async () => {
    try {
      const { error } = await supabase
        .from('cart_activity_log')
        .insert([{
          account_number: entry.account_number,
          cart_session_id: entry.cart_session_id,
          activity_type: entry.activity_type,
          item_partnumber: entry.item_partnumber || null,
          item_description: entry.item_description || null,
          quantity_change: entry.quantity_change || 0,
          quantity_after: entry.quantity_after || 0,
          unit_price: entry.unit_price || 0,
          cart_total_after: entry.cart_total_after || 0,
          cart_items_count_after: entry.cart_items_count_after || 0,
          user_email: entry.user_email || null,
          source_page: entry.source_page || window.location.pathname
        }]);
      
      if (error && process.env.NODE_ENV === 'development') {
        console.warn('Cart activity logging error (non-blocking):', error);
      }
    } catch (err) {
      // Silent fail in production to never impact user experience
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cart activity logging failed (non-blocking):', err);
      }
    }
  }, 0); // Next tick execution
};

// High-performance search logger - completely async, non-blocking
export const logSearchActivity = (entry: SearchLogEntry): void => {
  // Fire and forget - never block the UI
  setTimeout(async () => {
    try {
      const { error } = await supabase
        .from('customer_search_log')
        .insert([{
          account_number: entry.account_number,
          session_id: entry.session_id,
          search_term_1: entry.search_term_1 || null,
          search_term_2: entry.search_term_2 || null,
          exclusion_term: entry.exclusion_term || null,
          search_query_full: entry.search_query_full || null,
          results_count: entry.results_count || 0,
          results_clicked: entry.results_clicked || false,
          user_email: entry.user_email || null,
          source_page: entry.source_page || window.location.pathname
        }]);
      
      if (error && process.env.NODE_ENV === 'development') {
        console.warn('Search activity logging error (non-blocking):', error);
      }
    } catch (err) {
      // Silent fail in production to never impact user experience
      if (process.env.NODE_ENV === 'development') {
        console.warn('Search activity logging failed (non-blocking):', err);
      }
    }
  }, 0); // Next tick execution
};

// Utility to get session ID consistently
export const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

// Utility to get cart session ID consistently (from existing CartContext pattern)
export const getCartSessionId = (): string => {
  let cartId = sessionStorage.getItem('cartId');
  if (!cartId) {
    cartId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem('cartId', cartId);
  }
  return cartId;
};

// Helper function to build full search query string for logging
export const buildSearchQuery = (term1?: string, term2?: string, exclusion?: string): string => {
  const parts: string[] = [];
  
  if (term1?.trim()) {
    parts.push(term1.trim());
  }
  
  if (term2?.trim()) {
    parts.push(`AND ${term2.trim()}`);
  }
  
  if (exclusion?.trim()) {
    parts.push(`NOT ${exclusion.trim()}`);
  }
  
  return parts.join(' ');
};

// Performance monitoring - track if logging is causing any delays (dev only)
export const performanceTest = (): void => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const start = performance.now();
  logCartActivity({
    cart_session_id: 'test-session',
    activity_type: 'add_item',
    item_partnumber: 'PERF-TEST',
    item_description: 'Performance Test Item',
    quantity_change: 1,
    cart_total_after: 100
  });
  const end = performance.now();
  
};
