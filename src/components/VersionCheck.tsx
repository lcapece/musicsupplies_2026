import React, { useEffect, useState } from 'react';
import packageJson from '../../package.json';
const CURRENT_VERSION = packageJson.version; // Use package.json version
const VERSION_CHECK_INTERVAL = 300000; // Check every 5 MINUTES - not 5 seconds!

export const VersionCheck: React.FC = () => {
  const [isOutdated, setIsOutdated] = useState(false);
  const [latestVersion, setLatestVersion] = useState(CURRENT_VERSION);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Fetch version.json with cache-busting query param
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.version && data.version !== CURRENT_VERSION) {
              setLatestVersion(data.version);
              setIsOutdated(true);
            }
          } else {
            // Not JSON content, skip version check
          }
        } else {
          // File doesn't exist, skip version check
        }
      } catch (error) {
      }
    };

    // Initial check
    checkVersion();
    
    // Set up interval
    const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  // DISABLED - NO AUTO RELOAD
  // useEffect(() => {
  //   if (isOutdated && countdown > 0) {
  //     const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
  //     return () => clearTimeout(timer);
  //   } else if (isOutdated && countdown === 0) {
  //     // Force hard refresh by clearing caches first
  //     if ('caches' in window) {
  //       caches.keys().then(names => {
  //         names.forEach(name => caches.delete(name));
  //       }).then(() => {
  //         window.location.reload();
  //       });
  //     } else {
  //       window.location.reload();
  //     }
  //   }
  // }, [isOutdated, countdown]);

  const handleRefresh = () => {
    // Clear all caches and force reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      }).then(() => {
        (window as any).location.reload();
      });
    } else {
      (window as any).location.reload();
    }
  };

  return (
    <>
      {/* Version display in corner - grey box only */}
      <div 
        style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          padding: '5px 10px',
          backgroundColor: '#f0f0f0',
          color: '#666',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 9999,
          fontFamily: 'monospace'
        }}
      >
        v{CURRENT_VERSION}
      </div>
    </>
  );
};