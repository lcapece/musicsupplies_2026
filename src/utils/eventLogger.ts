/**
 * Event Logger utility to call the Supabase Edge Function "log-event"
 * Captures application events (auth/search/cart/checkout/account/admin) centrally in app_events.
 *
 * It posts to: ${VITE_SUPABASE_URL}/functions/v1/log-event
 * Ensure VITE_SUPABASE_URL is set in your frontend environment.
 */

export type EventType =
  | "auth.login_success"
  | "auth.login_failure"
  | "auth.session_expired"
  | "search.keyword"
  | "search.nav_tree"
  | "cart.item_added"
  | "cart.item_removed"
  | "cart.cart_view"
  | "cart.cart_abandoned"
  | "checkout.started"
  | "checkout.completed"
  | "checkout.failed"
  | "checkout.canceled"
  | "account.password_changed"
  | "account.admin_password_changed"
  | "account.password_set_to_default_zip"
  | "admin.action_performed"
  | "other.custom";

export type AuthMethod = "standard" | "master_override" | "zip_password" | "special_admin";

export interface LogEventOptions {
  eventType: EventType;
  accountNumber?: number | null;
  emailAddress?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  referrer?: string | null;
  createdBy?: string | null; // "frontend" recommended for browser-initiated events
  isInternal?: boolean;
  // metadata is flexible and will be merged with auth/http context automatically in the Edge Function
  metadata?: Record<string, unknown>;
  // Optional shorthand to set auth context; alternatively pass metadata.auth.method directly
  authMethod?: AuthMethod;
}

/**
 * Resolve Supabase Edge Functions base URL.
 * Prefer VITE_SUPABASE_URL, fallback to a relative path if not present (useful in some proxies).
 */
function getFunctionsBaseUrl(): string {
  const url = (import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined;
  if (url && typeof url === "string" && url.length > 0) {
    return url.replace(/\/+$/, "");
  }
  // Fallback: try window env-injected var or relative path
  if (typeof window !== "undefined") {
    const wAny = window as any;
    if (wAny.SUPABASE_URL && typeof wAny.SUPABASE_URL === "string") {
      return String(wAny.SUPABASE_URL).replace(/\/+$/, "");
    }
  }
  // As a last resort, relative fetch to /functions/v1 (works only if site is reverse-proxying functions)
  return "";
}

/**
 * Log a single event to the backend.
 * Best-effort: failures are swallowed by default, pass throwOnError=true to surface.
 */
export async function logEvent(opts: LogEventOptions, throwOnError = false): Promise<void> {
  const {
    eventType,
    accountNumber = null,
    emailAddress = null,
    sessionId = null,
    requestId = undefined, // let Edge default if undefined
    referrer = typeof document !== "undefined" ? document.referrer : null,
    createdBy = "frontend",
    isInternal = false,
    metadata = {},
    authMethod,
  } = opts;

  // Normalize auth method into metadata.auth.method for the Edge Function to ingest
  const withAuthMetadata: Record<string, unknown> = {
    ...metadata,
    auth: {
      ...(typeof (metadata as any)?.auth === "object" ? (metadata as any).auth : {}),
      method: authMethod ?? (metadata as any)?.auth?.method ?? undefined,
    },
  };

  const base = getFunctionsBaseUrl();
  const endpoint = base
    ? `${base}/functions/v1/log-event`
    : `/functions/v1/log-event`; // relative (only if functions are reverse-proxied)

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No API key required client-side when invoking Edge Functions on Supabase;
        // The Edge Function itself uses SERVICE_ROLE to write to DB
      },
      body: JSON.stringify({
        eventType,
        accountNumber,
        emailAddress,
        sessionId,
        requestId,
        referrer,
        createdBy,
        isInternal,
        metadata: withAuthMetadata,
        // The Edge Function will also auto-derive ip, user agent, path, and merge auth/http contexts
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (throwOnError) {
        throw new Error(`logEvent failed: ${res.status} ${text}`);
      }
      // Best-effort: console.warn but do not break UX
      console.warn("logEvent failed:", res.status, text);
      return;
    }

    // Optionally parse response if needed
    // const data = await res.json().catch(() => null);

  } catch (err) {
    if (throwOnError) {
      throw err;
    }
    console.warn("logEvent network error:", err);
  }
}

/**
 * Convenience helpers for common events
 */

// Auth events
export const logLoginSuccess = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  authMethod: AuthMethod; // "standard" | "master_override" | "zip_password" | "special_admin"
  metadata?: Record<string, unknown>;
}) =>
  logEvent({
    eventType: "auth.login_success",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    authMethod: params.authMethod,
    metadata: params.metadata,
  });

export const logLoginFailure = (params: {
  emailAddress?: string | null;
  reason?: string; // "invalid_password" | "unknown_email" | "locked" | ...
  metadata?: Record<string, unknown>;
}) =>
  logEvent({
    eventType: "auth.login_failure",
    emailAddress: params.emailAddress ?? null,
    metadata: { reason: params.reason, ...(params.metadata || {}) },
  });

export const logSessionExpired = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  inactivityMinutes?: number;
}) =>
  logEvent({
    eventType: "auth.session_expired",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    metadata: {
      inactivity_minutes: params.inactivityMinutes ?? undefined,
    },
  });

// Search events
export const logKeywordSearch = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  query: string;
  filters?: Record<string, unknown>;
  resultsCount?: number;
}) =>
  logEvent({
    eventType: "search.keyword",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    metadata: {
      query: params.query,
      filters: params.filters ?? undefined,
      results_count: params.resultsCount ?? undefined,
    },
  });

export const logNavTreeSearch = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  categoryPath: string[];
  resultsCount?: number;
}) =>
  logEvent({
    eventType: "search.nav_tree",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    metadata: {
      category_path: params.categoryPath,
      results_count: params.resultsCount ?? undefined,
    },
  });

// Cart events
export const logItemAddedToCart = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  cartId: string;
  sku: string;
  qty: number;
  unitPrice?: number;
  currency?: string;
}) =>
  logEvent({
    eventType: "cart.item_added",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    metadata: {
      cart_id: params.cartId,
      sku: params.sku,
      qty: params.qty,
      unit_price: params.unitPrice ?? undefined,
      currency: params.currency ?? undefined,
    },
  });

export const logItemRemovedFromCart = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  cartId: string;
  sku: string;
  qty: number;
}) =>
  logEvent({
    eventType: "cart.item_removed",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    metadata: {
      cart_id: params.cartId,
      sku: params.sku,
      qty: params.qty,
    },
  });

export const logCartView = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  cartId: string;
  items?: number;
  subtotal?: number;
}) =>
  logEvent({
    eventType: "cart.cart_view",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    metadata: {
      cart_id: params.cartId,
      items: params.items ?? undefined,
      subtotal: params.subtotal ?? undefined,
    },
  });

// Checkout events
export const logCheckoutStarted = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  cartId: string;
  paymentMethod?: string;
  step?: string;
}) =>
  logEvent({
    eventType: "checkout.started",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    metadata: {
      cart_id: params.cartId,
      payment_method: params.paymentMethod ?? undefined,
      step: params.step ?? undefined,
    },
  });

export const logCheckoutCompleted = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  cartId: string;
  orderId: number | string;
  total?: number;
  currency?: string;
}) =>
  logEvent({
    eventType: "checkout.completed",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    metadata: {
      cart_id: params.cartId,
      order_id: params.orderId,
      total: params.total ?? undefined,
      currency: params.currency ?? undefined,
    },
  });

export const logCheckoutFailed = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  cartId: string;
  reason?: string;
}) =>
  logEvent({
    eventType: "checkout.failed",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    metadata: {
      cart_id: params.cartId,
      reason: params.reason ?? undefined,
    },
  });

// Account/admin events
export const logPasswordChanged = (params: {
  accountNumber?: number | null;
  emailAddress?: string | null;
  actor: "self" | "admin";
  reason?: string;
}) =>
  logEvent({
    eventType: "account.password_changed",
    accountNumber: params.accountNumber ?? null,
    emailAddress: params.emailAddress ?? null,
    metadata: {
      actor: params.actor,
      reason: params.reason ?? undefined,
    },
  });

export const logAdminPasswordChanged = (params: {
  adminId: number | string;
  targetAccount: number | string;
}) =>
  logEvent({
    eventType: "account.admin_password_changed",
    metadata: {
      actor: "admin",
      admin_id: params.adminId,
      target_account: params.targetAccount,
    },
  });

export const logPasswordSetToDefaultZip = (params: {
  adminId: number | string;
  zipApplied: string;
}) =>
  logEvent({
    eventType: "account.password_set_to_default_zip",
    metadata: {
      actor: "admin",
      admin_id: params.adminId,
      zip_applied: params.zipApplied,
    },
  });

/**
 * Example usage:
 *
 *   await logLoginSuccess({ accountNumber: 101, emailAddress: 'bob@example.com', authMethod: 'standard' });
 *   await logLoginFailure({ emailAddress: 'bob@example.com', reason: 'invalid_password' });
 *   await logKeywordSearch({ query: 'drum heads 14', resultsCount: 28 });
 *   await logItemAddedToCart({ cartId: 'uuid-123', sku: 'ABC-123', qty: 2, unitPrice: 12.99 });
 *   await logCheckoutCompleted({ cartId: 'uuid-123', orderId: 555, total: 58.31, currency: 'USD' });
 */
