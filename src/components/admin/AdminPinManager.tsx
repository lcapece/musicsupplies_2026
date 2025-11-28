import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Key, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface AdminPinManagerProps {
  accountNumber?: string; // Default to 999 if not provided
}

const AdminPinManager: React.FC<AdminPinManagerProps> = ({ 
  accountNumber = '999' 
}) => {
  const [pin, setPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });

  // Fetch current PIN on component mount
  useEffect(() => {
    fetchCurrentPin();
  }, [accountNumber]);

  const fetchCurrentPin = async () => {
    setLoadingCurrent(true);
    try {
      const { data, error } = await supabase
        .from('admin_pins')
        .select('pin_hash')
        .eq('account_number', parseInt(accountNumber))
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching current PIN:', error);
      } else if (data && data.length > 0) {
        setCurrentPin(data[0].pin_hash);
      } else {
        setCurrentPin('No PIN set');
      }
    } catch (error) {
      console.error('Error fetching current PIN:', error);
      setCurrentPin('Error loading');
    } finally {
      setLoadingCurrent(false);
    }
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!pin.trim()) {
      setMessage({ type: 'error', text: 'PIN is required' });
      return;
    }

    if (!/^\d{4,8}$/.test(pin.trim())) {
      setMessage({ type: 'error', text: 'PIN must be 4-8 digits' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: null, text: '' });

    try {
      // Use the update_admin_pin function
      const { data, error } = await supabase.rpc('update_admin_pin', {
        p_account_number: parseInt(accountNumber),
        p_new_pin: pin.trim()
      });

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: `PIN updated successfully for account ${accountNumber}!` });
      setPin(''); // Clear the input
      
      // Refresh current PIN display
      await fetchCurrentPin();
      
    } catch (error) {
      console.error('Error setting PIN:', error);
      setMessage({ type: 'error', text: 'Failed to set PIN. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (value: string) => {
    // Only allow digits and limit to 8 characters
    const digitsOnly = value.replace(/\D/g, '').substring(0, 8);
    setPin(digitsOnly);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Key className="text-blue-600" size={24} />
        <h3 className="text-lg font-semibold text-gray-900">
          Admin PIN Manager
        </h3>
      </div>

      {accountNumber === '999' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            This will set the master admin (999) PIN for login authentication.
          </p>
        </div>
      )}

      {/* Current PIN Display */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Current PIN
        </label>
        <div className="flex items-center gap-2">
          {loadingCurrent ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
              {showPin ? currentPin : '••••••'}
            </code>
          )}
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPin ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <form onSubmit={handlePinChange} className="space-y-4">
        {/* PIN Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New PIN
          </label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => handlePinInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent pr-20 text-center font-mono text-lg tracking-wider"
              placeholder="Enter PIN"
              maxLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border text-gray-600 hover:text-gray-800"
            >
              {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {pin.length}/8 digits
          </p>
        </div>

        {/* PIN Requirements */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>PIN requirements:</p>
          <ul className="ml-4 space-y-0.5">
            <li>• Must be 4-8 digits only</li>
            <li>• Used for admin login authentication</li>
            <li>• Replaces SMS verification</li>
          </ul>
        </div>

        {/* Messages */}
        {message.type && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !pin.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Updating PIN...
            </>
          ) : (
            <>
              <Save size={20} />
              Set PIN
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AdminPinManager;
