import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login2: React.FC = () => {
  const { login, loginWith2FA } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    accountNumber: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showTwoFactor, setShowTwoFactor] = useState<boolean>(false);
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const [tempUserData, setTempUserData] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {

      // First, authenticate the user
      const { data, error } = await supabase.rpc('authenticate_user', {
        account_num: formData.accountNumber,
        user_password: formData.password
      });

      if (error) {
        console.error('Login2 - Authentication error:', error);
        throw error;
      }

      if (!data || !data.success) {
        console.error('Login2 - Authentication failed:', data);
        setError('Invalid account number or password');
        setLoading(false);
        return;
      }


      // Check if this is account 999 (admin) and requires 2FA
      if (formData.accountNumber === '999') {
        setTempUserData(data.user_data);
        setShowTwoFactor(true);
        setLoading(false);
        
        // Send 2FA code via SMS
        try {
          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-admin-2fa', {
            body: { accountNumber: '999' }
          });
          
          if (smsError) {
            console.error('Login2 - SMS sending error:', smsError);
          } else {
          }
        } catch (smsErr) {
          console.error('Login2 - SMS sending failed:', smsErr);
        }
        
        return;
      }

      // For non-admin accounts, proceed with normal login
      const loginResult = await login(formData.accountNumber, formData.password);
      
      if (loginResult === true) {
        navigate('/');
      } else if (loginResult === '2FA_REQUIRED') {
        // This shouldn't happen for non-admin accounts, but handle it
        setError('Two-factor authentication required');
      } else {
        setError('Login failed');
      }
      
    } catch (err: any) {
      console.error('Login2 - Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {

      // Verify 2FA code
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('admin-2fa-handler', {
        body: { 
          action: 'verify',
          code: twoFactorCode,
          accountNumber: '999'
        }
      });

      if (verifyError) {
        console.error('Login2 - 2FA verification error:', verifyError);
        throw verifyError;
      }

      if (!verifyResult || !verifyResult.success) {
        console.error('Login2 - 2FA verification failed:', verifyResult);
        setError('Invalid verification code');
        setLoading(false);
        return;
      }


      // Complete login using loginWith2FA function instead
      const loginResult = await loginWith2FA(formData.accountNumber, formData.password, twoFactorCode);
      
      if (loginResult === true) {
        navigate('/');
      } else {
        setError('Login failed after 2FA verification');
      }

    } catch (err: any) {
      console.error('Login2 - 2FA error:', err);
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-auto flex justify-center">
            <img 
              src="/images/logo.png" 
              alt="Music Supplies Logo"
              className="h-12"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {showTwoFactor ? 'Enter Verification Code' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Music Supplies - Wholesale Portal
          </p>
        </div>
        
        {!showTwoFactor ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="accountNumber" className="sr-only">
                  Account Number
                </label>
                <input
                  id="accountNumber"
                  name="accountNumber"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Account Number"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center">
              <Link 
                to="/forgot-password" 
                className="text-indigo-600 hover:text-indigo-500 text-sm"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleTwoFactorSubmit}>
            <div>
              <p className="text-center text-sm text-gray-600 mb-4">
                A verification code has been sent to your registered phone number.
              </p>
              <label htmlFor="twoFactorCode" className="sr-only">
                Verification Code
              </label>
              <input
                id="twoFactorCode"
                name="twoFactorCode"
                type="text"
                required
                maxLength={6}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg tracking-widest"
                placeholder="000000"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowTwoFactor(false);
                  setTwoFactorCode('');
                  setError('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login2;
