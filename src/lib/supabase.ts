import { createClient } from '@supabase/supabase-js';

// Get environment variables - no fallbacks for security
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseFunctionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
let resolvedFunctionsUrl: string | undefined = undefined;

// Validate required environment variables - fail fast if missing
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL environment variable is required. Set it in your .env file or Netlify dashboard.');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY environment variable is required. Set it in your .env file or Netlify dashboard.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error('VITE_SUPABASE_URL must be a valid URL');
}

// Create and export the Supabase client
const options: Parameters<typeof createClient>[2] = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
};
// In local dev, allow overriding the Functions URL to point at the local stack (http://127.0.0.1:54321/functions/v1)
if (supabaseFunctionsUrl) {
  // If the override is a relative path (e.g., "/supabase-fn"), resolve it against the current origin.
  try {
    resolvedFunctionsUrl = supabaseFunctionsUrl.startsWith('/')
      ? new URL(supabaseFunctionsUrl, window.location.origin).toString()
      : supabaseFunctionsUrl;
    (options as any).functions = { url: resolvedFunctionsUrl };
  } catch {
    // Fallback to the raw value if URL construction fails
    resolvedFunctionsUrl = supabaseFunctionsUrl;
    (options as any).functions = { url: supabaseFunctionsUrl };
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);

// Optional helper export so UI can directly hit a proxy/override when needed
export const FUNCTIONS_URL = resolvedFunctionsUrl ?? supabaseFunctionsUrl;

// Only log in development
if (import.meta.env.DEV) {
  if (resolvedFunctionsUrl || supabaseFunctionsUrl) {
  } else {
  }
}
