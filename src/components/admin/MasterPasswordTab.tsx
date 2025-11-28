import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Save } from 'lucide-react';

export function MasterPasswordTab() {
  const [currentMasterPassword, setCurrentMasterPassword] = useState('');
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchCurrentMasterPassword();
  }, []);

  const fetchCurrentMasterPassword = async () => {
    try {
      const { data, error } = await supabase
        .from('PWD')
        .select('pwd')
        .limit(1)
        .single();

      if (error) throw error;
      
      setCurrentMasterPassword(data.pwd || '');
    } catch (err: any) {
      console.error('Error fetching master password:', err);
      setError('Failed to fetch current master password');
    }
  };

  const handleUpdateMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    if (!newMasterPassword.trim()) {
      setError('New master password is required');
      setIsLoading(false);
      return;
    }

    if (newMasterPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      setIsLoading(false);
      return;
    }

    if (newMasterPassword.length < 8) {
      setError('Master password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('PWD')
        .update({ 
          pwd: newMasterPassword,
          description: 'Master password for salesperson override login',
          updated_at: new Date().toISOString()
        })
        .eq('pwd', currentMasterPassword);

      if (updateError) throw updateError;

      setMessage('Master password updated successfully');
      setCurrentMasterPassword(newMasterPassword);
      setNewMasterPassword('');
      setConfirmPassword('');
      
      // Log the password change
      
    } catch (err: any) {
      console.error('Error updating master password:', err);
      setError('Failed to update master password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Master Password Management
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          The master password allows salespeople to log into any customer account using their account number and this override password.
          This is used for customer service purposes when a salesperson needs to assist a customer directly.
        </p>
      </div>

      {/* Current Master Password Display */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">Current Master Password</h4>
        <div className="flex items-center gap-2">
          <input
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentMasterPassword}
            readOnly
            className="flex-1 px-3 py-2 border border-yellow-300 rounded-md bg-yellow-50 text-yellow-800 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="px-3 py-2 text-sm bg-yellow-200 text-yellow-800 rounded-md hover:bg-yellow-300 flex items-center gap-1"
          >
            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showCurrentPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Update Master Password Form */}
      <form onSubmit={handleUpdateMasterPassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Master Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newMasterPassword}
              onChange={(e) => setNewMasterPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new master password"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new master password"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-md text-sm">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Updating...' : 'Update Master Password'}
        </button>
      </form>

      {/* Usage Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Usage Guidelines</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• The master password can be used to log into ANY account, including account 999</li>
          <li>• <strong>For salespeople:</strong> Login with your own account number and this master password</li>
          <li>• <strong>For customer service:</strong> Login with customer's account number and this master password</li>
          <li>• All master password logins are logged for security auditing</li>
          <li>• All accounts can view this password, but only admin can change it</li>
          <li>• Consider changing this password regularly for security</li>
          <li>• Current master password: <code className="bg-blue-100 px-1 rounded">{currentMasterPassword}</code></li>
        </ul>
      </div>

      {/* Recent Login Activity */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-2">Security Information</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• <strong>Read Access:</strong> ALL authenticated accounts can view the master password</p>
          <p>• <strong>Write Access:</strong> Only admin (account 999) can update the master password</p>
          <p>• Master password logins are tracked in the system logs</p>
          <p>• Check the Account Management tab for login activity</p>
          <p>• Master password authentication is supplemental to regular passwords</p>
          <p>• <strong>Salesperson Usage:</strong> Login with your own account number + master password</p>
        </div>
      </div>
    </div>
  );
}
