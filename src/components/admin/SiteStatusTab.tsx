import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface SiteStatus {
  status: string;
  status_message: string;
}

const SiteStatusTab: React.FC = () => {
  const [currentStatus, setCurrentStatus] = useState<'online' | 'offline'>('online');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load current status on component mount
  useEffect(() => {
    loadCurrentStatus();
  }, []);

  const loadCurrentStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check if site is currently offline
      const { data: offlineData, error: offlineError } = await supabase
        .from('site_status')
        .select('status, status_message')
        .eq('status', 'offline')
        .single();

      if (offlineError && offlineError.code !== 'PGRST116') {
        console.error('Error loading site status:', offlineError);
        setError('Failed to load current site status');
        return;
      }

      if (offlineData) {
        // Site is offline
        setCurrentStatus('offline');
        setStatusMessage(offlineData.status_message || '');
      } else {
        // Site is online
        setCurrentStatus('online');
        
        // Get the online message
        const { data: onlineData, error: onlineError } = await supabase
          .from('site_status')
          .select('status_message')
          .eq('status', 'online')
          .single();

        if (onlineError && onlineError.code !== 'PGRST116') {
          console.error('Error loading online message:', onlineError);
        } else if (onlineData) {
          setStatusMessage(onlineData.status_message || '');
        }
      }
    } catch (err) {
      console.error('Error in loadCurrentStatus:', err);
      setError('Failed to load site status');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSiteStatus = async (newStatus: 'online' | 'offline', message: string) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      if (newStatus === 'offline') {
        // Update offline status and message
        const { error: offlineError } = await supabase
          .from('site_status')
          .upsert([
            {
              status: 'offline',
              status_message: message || 'Site is temporarily unavailable for maintenance. Please check back soon.'
            }
          ]);

        if (offlineError) {
          console.error('Error setting offline status:', offlineError);
          setError('Failed to set site offline');
          return;
        }

        // Also update online message for future reference
        const { error: onlineError } = await supabase
          .from('site_status')
          .upsert([
            {
              status: 'online',
              status_message: 'Site is operational'
            }
          ]);

        if (onlineError) {
          console.error('Error updating online message:', onlineError);
        }

        setSuccess('Site is now OFFLINE. Users will see the maintenance message.');

      } else {
        // Set site online by removing offline record
        const { error: deleteError } = await supabase
          .from('site_status')
          .delete()
          .eq('status', 'offline');

        if (deleteError) {
          console.error('Error setting site online:', deleteError);
          setError('Failed to set site online');
          return;
        }

        // Update online message
        const { error: onlineError } = await supabase
          .from('site_status')
          .upsert([
            {
              status: 'online',
              status_message: message || 'Site is operational'
            }
          ]);

        if (onlineError) {
          console.error('Error updating online message:', onlineError);
        }

        setSuccess('Site is now ONLINE. Users can access normally.');
      }

      setCurrentStatus(newStatus);
      setStatusMessage(message);

    } catch (err) {
      console.error('Error updating site status:', err);
      setError('Failed to update site status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSiteStatus(currentStatus, statusMessage);
  };

  const toggleStatus = () => {
    const newStatus = currentStatus === 'online' ? 'offline' : 'online';
    setCurrentStatus(newStatus);
    
    // Set default message based on status
    if (newStatus === 'offline' && !statusMessage) {
      setStatusMessage('Site is temporarily unavailable for maintenance. Please check back soon.');
    } else if (newStatus === 'online' && !statusMessage) {
      setStatusMessage('Site is operational');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading site status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Site Status Management</h2>
        <p className="text-gray-600">
          Control whether the site is accessible to users. Account 999 can always access the site regardless of status.
        </p>
      </div>

      {/* Current Status Display */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Status</h3>
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              currentStatus === 'online' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  currentStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>{currentStatus === 'online' ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
            </div>
            {currentStatus === 'offline' && (
              <div className="text-sm text-gray-600">
                <strong>Bypass URL:</strong> https://musicsupplies.com/5150
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Control Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Update Site Status</h3>
          
          {/* Status Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Site Status
            </label>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={toggleStatus}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  currentStatus === 'online'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Online</span>
                </div>
              </button>
              <button
                type="button"
                onClick={toggleStatus}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  currentStatus === 'offline'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span>Offline</span>
                </div>
              </button>
            </div>
          </div>

          {/* Status Message */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {currentStatus === 'offline' ? 'Maintenance Message' : 'Status Message'}
            </label>
            <textarea
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={
                currentStatus === 'offline'
                  ? 'Message users will see when the site is offline...'
                  : 'Internal status message...'
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              {currentStatus === 'offline'
                ? 'This message will be displayed to users when they try to access the site.'
                : 'This message is for internal reference only.'
              }
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${isSaving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : currentStatus === 'offline'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                } focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                `Set Site ${currentStatus === 'online' ? 'Online' : 'Offline'}`
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Information Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">How Site Status Works</h4>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Online:</strong> All users can access the site normally</li>
                <li><strong>Offline:</strong> Regular users see the maintenance message</li>
                <li><strong>Account 999:</strong> Can always access the site regardless of status</li>
                <li><strong>Bypass URL:</strong> https://musicsupplies.com/5150 allows direct access to login page</li>
                <li>Changes take effect immediately across all user sessions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteStatusTab;
