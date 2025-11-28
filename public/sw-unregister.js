// EMERGENCY SERVICE WORKER UNREGISTRATION
// This script automatically unregisters any service workers that might be caching old code

(function() {
  console.log('[SW-Unregister] Checking for service workers to unregister...');
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      console.log(`[SW-Unregister] Found ${registrations.length} service worker registrations`);
      
      for(let registration of registrations) {
        console.log(`[SW-Unregister] Unregistering service worker: ${registration.scope}`);
        registration.unregister().then(function(success) {
          if (success) {
            console.log('[SW-Unregister] Service worker unregistered successfully');
          } else {
            console.log('[SW-Unregister] Service worker unregistration failed');
          }
        });
      }
      
      // Clear all caches
      if ('caches' in window) {
        caches.keys().then(function(cacheNames) {
          console.log(`[SW-Unregister] Found ${cacheNames.length} caches to clear`);
          return Promise.all(
            cacheNames.map(function(cacheName) {
              console.log(`[SW-Unregister] Deleting cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
          );
        }).then(function() {
          console.log('[SW-Unregister] All caches cleared');
          // Force reload to get fresh code
          if (registrations.length > 0) {
            console.log('[SW-Unregister] Reloading page to get fresh code...');
            window.location.reload();
          }
        });
      }
    }).catch(function(error) {
      console.error('[SW-Unregister] Error checking service workers:', error);
    });
  } else {
    console.log('[SW-Unregister] Service workers not supported');
  }
})();
