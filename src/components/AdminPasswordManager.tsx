import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Lock, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminPasswordManager: React.FC = () => {
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const { user } = useAuth();

  // Reveal password + phones state
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [showRevealed, setShowRevealed] = useState(false);

  const [phonePrimary, setPhonePrimary] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [phoneBackup, setPhoneBackup] = useState('');
  const [phonesLoading, setPhonesLoading] = useState(false);
  const [phonesSaving, setPhonesSaving] = useState(false);

  // Load state: we do not retrieve current admin password for security
  const loadAdminPassword = async () => {
    setIsLoading(true);
    try {
      setAdminPassword('');
      setNewPassword('');
      setMessage({ type: 'success', text: 'Admin password is set but not retrievable. Enter a new value to replace it.' });
    } catch (err) {
      console.error('Admin password init error:', err);
      setMessage({ type: 'error', text: 'Initialization error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Save new admin password to database
  const saveAdminPassword = async () => {
    if (!newPassword || newPassword.trim() === '') {
      setMessage({ type: 'error', text: 'Password cannot be empty' });
      return;
    }

    // Enforce minimum complexity (>=6 chars, at least one digit)
    if (!/^(?=.*\d).{6,}$/.test(newPassword.trim())) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters and include at least one number' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.rpc('set_admin_password', {
        p_password: newPassword.trim()
      });
      
      if (error) {
        console.error('Error updating admin password:', error);
        setMessage({ type: 'error', text: error.message || 'Failed to update admin password' });
      } else {
        setAdminPassword(''); // do not display
        setNewPassword('');
        setMessage({ type: 'success', text: 'Admin password updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Exception updating admin password:', err);
      setMessage({ type: 'error', text: 'Error updating admin password' });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: securely reveal admin password (requires account 999 claims)
  const revealAdminPassword = async () => {
    if (revealing) return;
    setRevealing(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc('get_admin_password');
      if (error) {
        console.error('Reveal admin password error:', error);
        setMessage({ type: 'error', text: error.message || 'Failed to reveal password' });
        setRevealedPassword(null);
        setShowRevealed(false);
      } else {
        setRevealedPassword(typeof data === 'string' ? data : '');
        setShowRevealed(true);
      }
    } catch (e: any) {
      console.error('Reveal admin password exception:', e);
      setMessage({ type: 'error', text: 'Unable to reveal password' });
      setRevealedPassword(null);
      setShowRevealed(false);
    } finally {
      setRevealing(false);
    }
  };

  // Load phones from options via RPC
  const loadAdminPhones = async () => {
    setPhonesLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_2fa_phones');
      if (error) {
        console.error('Load admin 2FA phones error:', error);
        setMessage({ type: 'error', text: 'Failed to load admin 2FA phones' });
      } else if (data) {
        // data: { primary_phone, secondary_phone, backup_phone }
        setPhonePrimary((data as any).primary_phone || '');
        setPhoneSecondary((data as any).secondary_phone || '');
        setPhoneBackup((data as any).backup_phone || '');
      }
    } catch (e) {
      console.error('Load admin 2FA phones exception:', e);
      setMessage({ type: 'error', text: 'Failed to load admin 2FA phones' });
    } finally {
      setPhonesLoading(false);
    }
  };

  const saveAdminPhones = async () => {
    setPhonesSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.rpc('set_admin_2fa_phones', {
        p_primary: phonePrimary || null,
        p_secondary: phoneSecondary || null,
        p_backup: phoneBackup || null
      });
      if (error) {
        console.error('Save admin 2FA phones error:', error);
        setMessage({ type: 'error', text: error.message || 'Failed to save 2FA phones' });
      } else {
        setMessage({ type: 'success', text: '2FA phone numbers saved successfully' });
        setTimeout(() => setMessage(null), 3000);
        // Reload to reflect normalization
        await loadAdminPhones();
      }
    } catch (e: any) {
      console.error('Save admin 2FA phones exception:', e);
      setMessage({ type: 'error', text: 'Failed to save 2FA phones' });
    } finally {
      setPhonesSaving(false);
    }
  };

  // Load on component mount
  useEffect(() => {
    loadAdminPassword();
    loadAdminPhones();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
          <Lock className="mr-2" size={24} />
          Administrative Password
        </h2>
        <p className="text-gray-600">
          Manage the administrative password for account 999 (Backend Admin)
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700'
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Current Password Display with Reveal/Hide toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Admin Password
          </label>
          <div className="relative">
            <input
              type={showRevealed ? 'text' : 'password'}
              value={showRevealed && revealedPassword ? revealedPassword : '********'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 pr-24"
              placeholder={isLoading ? 'Loading...' : showRevealed ? 'Revealed' : 'Hidden'}
            />
            <button
              type="button"
              onClick={async () => {
                if (showRevealed) {
                  // Hide and clear from memory
                  setShowRevealed(false);
                  setRevealedPassword(null);
                } else {
                  await revealAdminPassword();
                }
              }}
              disabled={revealing}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-600 hover:text-gray-800"
              aria-label={showRevealed ? 'Hide password' : 'Reveal password'}
              title={showRevealed ? 'Hide password' : 'Reveal password'}
            >
              {showRevealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Use the Reveal button to view the current admin password. It will be hidden again when you click Hide.
          </p>
        </div>

        {/* New Password Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Admin Password
          </label>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter new password"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter a new password to replace the current admin password. Must be at least 6 characters and include at least one number.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={saveAdminPassword}
            disabled={isSaving || newPassword === adminPassword}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="mr-2" size={18} />
            {isSaving ? 'Saving...' : 'Save Password'}
          </button>
          
          <button
            onClick={loadAdminPassword}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Admin 2FA Phone Numbers */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Admin 2FA Phone Numbers</h3>
        <p className="text-xs text-gray-600 mb-3">
          Enter up to three mobile numbers. If +1 is omitted and a 10-digit US number is entered, +1 will be assumed automatically.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Primary</label>
            <input
              type="tel"
              value={phonePrimary}
              onChange={(e) => setPhonePrimary(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+15165550123 or 5165550123"
              disabled={phonesLoading || phonesSaving}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Secondary</label>
            <input
              type="tel"
              value={phoneSecondary}
              onChange={(e) => setPhoneSecondary(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+15165550124 or 5165550124"
              disabled={phonesLoading || phonesSaving}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Backup</label>
            <input
              type="tel"
              value={phoneBackup}
              onChange={(e) => setPhoneBackup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+15165550125 or 5165550125"
              disabled={phonesLoading || phonesSaving}
            />
          </div>
        </div>
        <div className="mt-3 flex space-x-3">
          <button
            onClick={saveAdminPhones}
            disabled={phonesSaving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="mr-2" size={18} />
            {phonesSaving ? 'Saving...' : 'Save Phones'}
          </button>
          <button
            onClick={loadAdminPhones}
            disabled={phonesLoading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`mr-2 ${phonesLoading ? 'animate-spin' : ''}`} size={18} />
            Refresh Phones
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPasswordManager;
