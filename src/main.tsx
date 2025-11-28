import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupGlobalErrorHandling } from './lib/errorReporting';
import { checkDbUpdate } from './utils/checkDbUpdate';
import { supabase } from './lib/supabase';

/**
 * TEMP: Global network error logger to capture failing URLs/status codes (e.g., 406)
 * Remove after troubleshooting.
 */
(function attachNetworkLogger() {
  try {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;
      const method =
        typeof input === 'string' || input instanceof URL
          ? (init?.method || 'GET')
          : ((input as Request).method || init?.method || 'GET');

      // Network request logging removed to prevent console flooding

      const res = await originalFetch(input as any, init);

      // Network response logging removed to prevent console flooding

      if (res.status === 406 || !res.ok) {
        // Network error logging removed to prevent console flooding
      }
      return res;
    };

    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string,
      async?: boolean,
      user?: string | null,
      password?: string | null
    ) {
      (this as any).__url = url;
      (this as any).__method = method;
      // XHR request logging removed to prevent console flooding
      // @ts-ignore
      return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      this.addEventListener('load', function () {
        // @ts-ignore
        const url = (this as any).__url;
        // @ts-ignore
        const method = (this as any).__method || '';
        // XHR response logging removed to prevent console flooding
        // Log 406 specifically and any other error statuses
        if (this.status === 406 || (this.status && this.status >= 400) || this.status === 0) {
          // XHR error logging removed to prevent console flooding
        }
      });
      // @ts-ignore
      return send.apply(this, arguments);
    };
  } catch (e) {
    // Network logger install failed (warning removed to prevent console flooding)
  }
})();

/**
 * TEMP: Resource error logger for <img>, <link>, and <script> failures (e.g., 406)
 * Remove after troubleshooting.
 */
window.addEventListener(
  'error',
  (event: Event) => {
    try {
      // Resource event logging removed to prevent console flooding
      const target = (event as any).target as any;
      if (!target) return;
      const tag = target.tagName;
      const url = target?.src || target?.href;
      if (url && (tag === 'IMG' || tag === 'SCRIPT' || tag === 'LINK')) {
        // Resource error logging removed to prevent console flooding
      }
    } catch (e) {
      // Resource logger failed (warning removed to prevent console flooding)
    }
  },
  true
);

// Set up global error handling
setupGlobalErrorHandling();

// Check if database updates have been applied
checkDbUpdate(supabase).then((success: boolean) => {
  // Database update check completed
}).catch((error: unknown) => {
  // Database update check failed
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
