import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Lock, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface AdminPasswordManagerProps {
  accountNumber?: string; // Default to 999 if not provided
}

const AdminPasswordManager: React.FC<AdminPasswordManagerProps> = ({ 
  accountNumber = '999' 
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!password.trim()) {
      setMessage({ type: 'error', text: 'Password is required' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: null, text: '' });

    try {
      // Hash the password and update directly
      const { data: saltData, error: saltError } = await supabase.rpc('gen_salt', { type: 'bf' });
      
      if (saltError) {
        throw saltError;
      }

      const { data: hashData, error: hashError } = await supabase.rpc('crypt', { 
        password: password, 
        salt: saltData 
      });

      if (hashError) {
        throw hashError;
      }

      // Update or insert the password
      const { error: upsertError } = await supabase
        .from('user_passwords')
        .upsert({ 
          account_number: parseInt(accountNumber),
          password_hash: hashData,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (upsertError) {
        throw upsertError;
      }

      setMessage({ type: 'success', text: `Password set successfully for account ${accountNumber}!` });
      
    } catch (error) {
      console.error('Error setting password:', error);
      setMessage({ type: 'error', text: 'Failed to set password. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Lock className="text-purple-600" size={24} />
        <h3 className="text-lg font-semibold text-gray-900">
          Admin Password Manager
        </h3>
      </div>

      {accountNumber === '999' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            This will set the master admin (999) password. Make sure to remember the password!
          </p>
        </div>
      )}

      <form onSubmit={handlePasswordChange} className="space-y-4">
        {/* Password Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admin Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent pr-20"
              placeholder="Enter admin password"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border text-gray-600 hover:text-gray-800"
            >
              {showPassword ? 'Hide' : 'Reveal'}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>Password requirements:</p>
          <ul className="ml-4 space-y-0.5">
            <li>• At least 6 characters long</li>
            <li>• Will be securely hashed and stored</li>
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
          disabled={isLoading}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Changing Password...
            </>
          ) : (
            <>
              <Save size={20} />
              Set Password
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AdminPasswordManager;