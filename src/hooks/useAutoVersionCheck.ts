import { useEffect, useRef } from 'react';
import packageJson from '../../package.json';

interface VersionData {
  version: string;
  timestamp: string;
  build: number;
}

export const useAutoVersionCheck = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentVersion = packageJson.version;
  
  const checkAndUpdateVersion = async () => {
    try {
      // SERVER-SIDE VERSION CHECK - bypasses all client cache
      // Hit a Supabase Edge Function that returns current package.json version
      const response = await fetch('/api/version-check', {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) return;
      
      const versionData: VersionData = await response.json();
      const latestVersion = versionData.version;
      
      // Compare versions - if different, force update
      if (latestVersion !== currentVersion) {
        
        // NUCLEAR CACHE CLEAR - bypass chicken-and-egg problem
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        }

        // Clear ALL storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies (if any)
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // Force hard reload - bypasses all cache
        window.location.href = window.location.href + '?v=' + Date.now();
      }
    } catch (error) {
      // Fallback: Try direct package.json fetch (for development)
      try {
        const pkgResponse = await fetch('/package.json?t=' + Date.now(), { 
          cache: 'no-cache',
          headers: { 'Accept': 'application/json' }
        });
        if (pkgResponse.ok) {
          const pkg = await pkgResponse.json();
          if (pkg.version && pkg.version !== currentVersion) {
            window.location.href = window.location.href + '?v=' + Date.now();
          }
        }
      } catch (fallbackError) {
        console.debug('Version check failed completely:', error, fallbackError);
      }
    }
  };

  useEffect(() => {
    // Initial check after component mounts (delay to avoid blocking initial load)
    const initialTimeout = setTimeout(() => {
      checkAndUpdateVersion();
    }, 5000); // Wait 5 seconds after page load

    // Set up periodic checks every 2 minutes
    intervalRef.current = setInterval(() => {
      checkAndUpdateVersion();
    }, 120000); // 120 seconds = 2 minutes

    // Cleanup on unmount
    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentVersion]);

  // Also check when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User came back to tab, check for updates
        setTimeout(checkAndUpdateVersion, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Return nothing - this is a silent hook
  return null;
};
