import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const SimplePasswordChanger: React.FC = () => {
  const [step, setStep] = useState<'ready' | 'changing' | 'success' | 'error'>('ready');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('ready');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation with clear messages
    if (!currentPassword) {
      setErrorMessage('Please type your CURRENT password');
      setStep('error');
      return;
    }

    if (!newPassword) {
      setErrorMessage('Please type a NEW password');
      setStep('error');
      return;
    }

    if (!confirmPassword) {
      setErrorMessage('Please type the NEW password again');
      setStep('error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('The two NEW passwords do not match. Please try again.');
      setStep('error');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Your NEW password needs to be at least 8 characters long');
      setStep('error');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('Your NEW password must be different from your CURRENT password');
      setStep('error');
      return;
    }

    setStep('changing');
    setErrorMessage('');

    try {
      // Verify current password
      const { data: authData, error: authError } = await supabase.rpc('authenticate_user', {
        p_identifier: '999',
        p_password: currentPassword
      });

      if (authError || !authData) {
        setErrorMessage('Your CURRENT password is incorrect. Please try again.');
        setStep('error');
        return;
      }

      // Update password - try the function first
      const { error: updateError } = await supabase.rpc('update_user_password', {
        p_account_number: 999,
        p_new_password: newPassword
      });

      if (updateError) {
        // If function doesn't exist, update directly
        const { error: directError } = await supabase
          .from('user_passwords')
          .update({ 
            password_hash: await supabase.rpc('crypt', { 
              password: newPassword, 
              salt: await supabase.rpc('gen_salt', { type: 'bf' }) 
            }),
            updated_at: new Date().toISOString()
          })
          .eq('account_number', 999);

        if (directError) {
          throw directError;
        }
      }

      setStep('success');
      setTimeout(() => {
        resetForm();
      }, 10000); // Reset after 10 seconds
      
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Something went wrong. Please try again or contact support.');
      setStep('error');
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-4xl font-bold text-green-600 mb-6">
            Password Changed Successfully!
          </h2>
          <div className="bg-green-50 border-4 border-green-300 rounded-lg p-8 mb-6">
            <p className="text-2xl text-gray-800 mb-4">
              Your new password has been saved.
            </p>
            <p className="text-xl text-gray-700">
              <strong>IMPORTANT:</strong> Write down your new password and keep it in a safe place.
            </p>
          </div>
          <button
            onClick={resetForm}
            className="text-xl bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        Change Your Admin Password
      </h2>

      {/* Instructions */}
      <div className="bg-blue-50 border-4 border-blue-300 rounded-lg p-6 mb-8">
        <p className="text-xl text-gray-800">
          <strong>Instructions:</strong> You will need to enter your current password, 
          then choose a new password. The new password must be at least 8 characters long.
        </p>
      </div>

      {/* Error Message */}
      {step === 'error' && errorMessage && (
        <div className="bg-red-50 border-4 border-red-300 rounded-lg p-6 mb-8">
          <p className="text-xl text-red-800 font-semibold">
            ❌ {errorMessage}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Current Password */}
        <div className="bg-gray-50 rounded-lg p-6">
          <label className="block mb-4">
            <span className="text-2xl font-semibold text-gray-700">
              Step 1: Enter Your CURRENT Password
            </span>
            <div className="mt-4">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full text-2xl px-6 py-4 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Type your current password here"
                disabled={step === 'changing'}
                style={{ fontSize: '24px', letterSpacing: '2px' }}
              />
            </div>
            <p className="mt-2 text-lg text-gray-600">
              This is the password you use now (2750grove)
            </p>
          </label>
        </div>

        {/* Step 2: New Password */}
        <div className="bg-gray-50 rounded-lg p-6">
          <label className="block mb-4">
            <span className="text-2xl font-semibold text-gray-700">
              Step 2: Choose a NEW Password
            </span>
            <div className="mt-4">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-2xl px-6 py-4 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Type your new password here"
                disabled={step === 'changing'}
                style={{ fontSize: '24px', letterSpacing: '2px' }}
              />
            </div>
            <p className="mt-2 text-lg text-gray-600">
              Must be at least 8 characters. Choose something you'll remember!
            </p>
          </label>
        </div>

        {/* Step 3: Confirm New Password */}
        <div className="bg-gray-50 rounded-lg p-6">
          <label className="block mb-4">
            <span className="text-2xl font-semibold text-gray-700">
              Step 3: Type Your NEW Password Again
            </span>
            <div className="mt-4">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full text-2xl px-6 py-4 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Type your new password again"
                disabled={step === 'changing'}
                style={{ fontSize: '24px', letterSpacing: '2px' }}
              />
            </div>
            <p className="mt-2 text-lg text-gray-600">
              This makes sure you typed it correctly
            </p>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 justify-center pt-6">
          <button
            type="button"
            onClick={resetForm}
            className="text-xl bg-gray-500 text-white px-8 py-4 rounded-lg hover:bg-gray-600"
            disabled={step === 'changing'}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`text-xl px-8 py-4 rounded-lg text-white font-semibold ${
              step === 'changing' 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
            disabled={step === 'changing'}
          >
            {step === 'changing' ? 'Changing Password...' : 'Change Password'}
          </button>
        </div>
      </form>

      {/* Help text */}
      <div className="mt-12 p-6 bg-yellow-50 border-4 border-yellow-300 rounded-lg">
        <p className="text-xl text-gray-800">
          <strong>Need Help?</strong> Call support at{' '}
          <span className="font-bold text-2xl">1-800-321-5584</span>
        </p>
      </div>
    </div>
  );
};

export default SimplePasswordChanger;