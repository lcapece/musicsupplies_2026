import React, { useState, useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react';

interface ForceUpdateButtonProps {
  className?: string;
  showVersionInfo?: boolean;
}

const ForceUpdateButton: React.FC<ForceUpdateButtonProps> = ({ 
  className = '',
  showVersionInfo = true 
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Get current version from environment
  useEffect(() => {
    const version = import.meta.env.VITE_APP_VERSION || 'Unknown';
    setCurrentVersion(version);
  }, []);

  // Check for latest version by fetching version.json
  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      // Fetch version.json with cache-busting timestamp
      const response = await fetch(`/version.json?t=${Date.now()}`);
      const versionData = await response.json();
      const latestVer = versionData.version || 'Unknown';
      
      setLatestVersion(latestVer);
      setUpdateAvailable(latestVer !== currentVersion);
      
      return latestVer !== currentVersion;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  // Force update by clearing cache and reloading
  const forceUpdate = async () => {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Force reload with cache bypass
    window.location.reload();
  };

  // Auto-check and force update
  const handleForceUpdate = async () => {
    setIsChecking(true);
    
    try {
      // Check if update is available
      const hasUpdate = await checkForUpdates();
      
      if (hasUpdate) {
        // Show brief message then update
      }
      
      // Force update regardless (clears cache)
      await forceUpdate();
    } catch (error) {
      console.error('Force update failed:', error);
      // Fallback: just reload
      window.location.reload();
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {showVersionInfo && (
        <div className="text-xs text-gray-500 text-center">
          <div>Current: {currentVersion.startsWith('RC') ? currentVersion : `v${currentVersion}`}</div>
          {latestVersion && latestVersion !== currentVersion && (
            <div className="text-blue-600 font-medium">Latest: {latestVersion.startsWith('RC') ? latestVersion : `v${latestVersion}`}</div>
          )}
        </div>
      )}
      
      <button
        onClick={handleForceUpdate}
        disabled={isChecking}
        className={`
          flex items-center space-x-2 px-4 py-2 
          bg-blue-600 hover:bg-blue-700 
          text-white text-sm font-medium rounded-md 
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${updateAvailable ? 'bg-green-600 hover:bg-green-700 animate-pulse' : ''}
        `}
        title="Clear cache and get latest version"
      >
        {isChecking ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : updateAvailable ? (
          <Download className="w-4 h-4" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        <span>
          {isChecking 
            ? 'Checking...' 
            : updateAvailable 
              ? 'Update Available!' 
              : 'Force Refresh'
          }
        </span>
      </button>
      
      {updateAvailable && (
        <div className="text-xs text-green-600 font-medium text-center">
          New version detected! Click to update.
        </div>
      )}
    </div>
  );
};

export default ForceUpdateButton;