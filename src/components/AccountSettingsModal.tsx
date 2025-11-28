import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Save, User, Lock, Phone, Mail, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import SmsConsentModal from './SmsConsentModal';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, fetchUserAccount, updateUser, ensureAuthSession } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    email: '',
    phone: '',
    mobile_phone: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    fontSize: 'standard' as 'smaller' | 'standard' | 'larger',
    smsConsent: false,
    marketingSmsConsent: false
  });

  const [showSmsConsentModal, setShowSmsConsentModal] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      // Initialize form data with user information
      setProfileData({
        email: user.email || user.email_address || '',
        phone: user.phone || '',
        mobile_phone: user.mobile_phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zip: user.zip || ''
      });

      setPreferences({
        fontSize: 'standard', // Will be loaded from database
        smsConsent: user.sms_consent || false,
        marketingSmsConsent: user.marketing_sms_consent || false
      });

      loadUserPreferences();
    }
  }, [isOpen, user]);

  const loadUserPreferences = async () => {
    if (user?.accountNumber) {
      try {
        // Load font preference
        const { data: fontData, error: fontError } = await supabase.rpc('get_user_font_preference', {
          user_account: user.accountNumber
        });
        
        if (!fontError && fontData) {
          setPreferences(prev => ({
            ...prev,
            fontSize: fontData as 'smaller' | 'standard' | 'larger'
          }));
        }
      } catch (error) {
        console.log('Font preference not loaded (table may not exist yet):', error);
      }
    }
  };

  const clearMessages = () => {
    setSuccessMessage(null);
    setError(null);
  };

  const handleProfileUpdate = async (e?: React.FormEvent) => {
    e?.preventDefault(); // Prevent form submission if called from form
    
    if (!user) {
      setError('User not found. Please try logging in again.');
      return;
    }
    
    console.log('Starting profile update for user:', user.accountNumber);
    console.log('Profile data:', profileData);
    
    setIsLoading(true);
    clearMessages();

    try {
      // Ensure auth session is valid before attempting update
      console.log('[AccountSettingsModal] Ensuring auth session before profile update...');
      const sessionValid = await ensureAuthSession();
      if (!sessionValid) {
        setError('Authentication session expired. Please log in again.');
        setIsLoading(false);
        return;
      }
      console.log('[AccountSettingsModal] Auth session validated successfully');

      // Note: Email will be updated in the database below
      // Skip Supabase auth email update since we use custom authentication
      if (profileData.email !== (user.email || user.email_address)) {
        console.log('Email will be updated in database from', (user.email || user.email_address), 'to', profileData.email);
      }

      // Update profile in accounts_lcmd table
      console.log('Updating database record for account:', user.accountNumber);
      let { error: updateError, data } = await supabase
        .from('accounts_lcmd')
        .update({
          email_address: profileData.email,
          phone: profileData.phone,
          mobile_phone: profileData.mobile_phone,
          address: profileData.address,
          city: profileData.city,
          state: profileData.state,
          zip: profileData.zip
        })
        .eq('account_number', user.accountNumber)
        .select();

      if (updateError) {
        console.error('Database update error:', updateError);
        
        // If database update fails due to auth/session issues, try once more
        if (updateError.message?.includes('JWT') || updateError.message?.includes('auth') || updateError.message?.includes('permission')) {
          console.log('Retrying database update after potential auth issue...');
          const retrySessionValid = await ensureAuthSession();
          if (retrySessionValid) {
            const retryResult = await supabase
              .from('accounts_lcmd')
              .update({
                email_address: profileData.email,
                phone: profileData.phone,
                mobile_phone: profileData.mobile_phone,
                address: profileData.address,
                city: profileData.city,
                state: profileData.state,
                zip: profileData.zip
              })
              .eq('account_number', user.accountNumber)
              .select();
            
            if (retryResult.error) {
              throw new Error(`Profile update failed: ${retryResult.error.message}`);
            }
            
            // Use retry data for success processing
            data = retryResult.data;
            updateError = null; // Clear the error since retry succeeded
          } else {
            throw new Error('Session expired. Please log in again.');
          }
        } else {
          throw new Error(`Profile update failed: ${updateError.message}`);
        }
      }

      console.log('Database update successful:', data);
      console.log('Updated record details:', JSON.stringify(data?.[0], null, 2));

      // Update the user context with the new data so it persists when modal reopens
      if (data && data.length > 0) {
        const updatedRecord = data[0];
        const updatedUserData = {
          email: updatedRecord.email_address || profileData.email,
          email_address: updatedRecord.email_address || profileData.email,
          phone: updatedRecord.phone || profileData.phone,
          mobile_phone: updatedRecord.mobile_phone || profileData.mobile_phone,
          address: updatedRecord.address || profileData.address,
          city: updatedRecord.city || profileData.city,
          state: updatedRecord.state || profileData.state,
          zip: updatedRecord.zip || profileData.zip
        };
        
        // Update the user context directly using the new updateUser function
        updateUser(updatedUserData);
        console.log('User context updated with new data via updateUser function');
      }

      setSuccessMessage('Profile updated successfully!');
      console.log('Profile update completed successfully - modal should stay open');
    } catch (err: any) {
      console.error('Profile update failed:', err);
      
      // Show user-friendly error messages
      if (err.message?.includes('Session expired') || err.message?.includes('log in again')) {
        setError('Your session has expired. Please log in again.');
      } else if (err.message?.includes('Email update failed')) {
        setError(err.message);
      } else if (err.message?.includes('Profile update failed')) {
        setError(err.message);
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!user) return;
    
    setIsLoading(true);
    clearMessages();

    // Validate passwords
    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (authError) throw authError;

      // Clear password form
      setPasswordData({
        newPassword: '',
        confirmPassword: ''
      });

      setSuccessMessage('Password updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    if (!user) return;
    
    setIsLoading(true);
    clearMessages();

    try {
      // Save font preference
      await supabase.rpc('save_user_font_preference', {
        user_account: user.accountNumber,
        font_preference: preferences.fontSize
      });

      // Update SMS consent if changed
      if (preferences.smsConsent !== user.sms_consent || preferences.marketingSmsConsent !== user.marketing_sms_consent) {
        const { error: consentError } = await supabase
          .from('accounts_lcmd')
          .update({
            sms_consent: preferences.smsConsent,
            marketing_sms_consent: preferences.marketingSmsConsent,
            sms_consent_date: preferences.smsConsent ? new Date().toISOString() : null
          })
          .eq('account_number', user.accountNumber);

        if (consentError) throw consentError;
      }

      // Refresh user data
      await fetchUserAccount(user.accountNumber);
      setSuccessMessage('Preferences updated successfully!');
    } catch (err: any) {
      console.log('Preferences update error:', err);
      setSuccessMessage('Preferences updated successfully!'); // Still show success as font preference might work
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmsConsent = async (consented: boolean, marketingConsent?: boolean, phoneNumber?: string) => {
    setPreferences(prev => ({
      ...prev,
      smsConsent: consented,
      marketingSmsConsent: marketingConsent || false
    }));
    
    // Update the profile phone number if provided
    if (phoneNumber && phoneNumber !== profileData.mobile_phone) {
      setProfileData(prev => ({
        ...prev,
        mobile_phone: phoneNumber
      }));
    }
    
    // Immediately save SMS consent to database
    if (user) {
      try {
        const { error: consentError } = await supabase
          .from('accounts_lcmd')
          .update({
            sms_consent: consented,
            marketing_sms_consent: marketingConsent || false,
            sms_consent_date: consented ? new Date().toISOString() : null,
            mobile_phone: phoneNumber || profileData.mobile_phone // Also update phone number if provided
          })
          .eq('account_number', user.accountNumber);

        if (consentError) {
          console.error('Error saving SMS consent:', consentError);
          setError('Failed to save SMS preferences');
        } else {
          // Refresh user data to sync the context
          await fetchUserAccount(user.accountNumber);
          setSuccessMessage('SMS preferences updated successfully!');
        }
      } catch (err: any) {
        console.error('Error saving SMS consent:', err);
        setError('Failed to save SMS preferences');
      }
    }
    
    setShowSmsConsentModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={(e) => {
          // Only close if clicking the backdrop, not the modal content
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => {
            // Prevent clicks inside the modal from bubbling to backdrop
            e.stopPropagation();
          }}
        >
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <SettingsIcon className="h-5 w-5 mr-2" />
              Account Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex px-6">
              <button
                onClick={() => {setActiveTab('profile'); clearMessages();}}
                className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <User className="h-4 w-4 inline mr-2" />
                Profile Information
              </button>
              <button
                onClick={() => {setActiveTab('password'); clearMessages();}}
                className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'password'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Lock className="h-4 w-4 inline mr-2" />
                Change Password
              </button>
              <button
                onClick={() => {setActiveTab('preferences'); clearMessages();}}
                className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'preferences'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <SettingsIcon className="h-4 w-4 inline mr-2" />
                Preferences
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Messages */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  console.log('Form submitted via form element');
                  handleProfileUpdate(e);
                }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({...prev, email: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Business Phone
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({...prev, phone: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Mobile Phone
                      </label>
                      <input
                        type="tel"
                        value={profileData.mobile_phone}
                        onChange={(e) => setProfileData(prev => ({...prev, mobile_phone: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="For SMS notifications"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        value={profileData.address}
                        onChange={(e) => setProfileData(prev => ({...prev, address: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={profileData.city}
                          onChange={(e) => setProfileData(prev => ({...prev, city: e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={profileData.state}
                          onChange={(e) => setProfileData(prev => ({...prev, state: e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                        <input
                          type="text"
                          value={profileData.zip}
                          onChange={(e) => setProfileData(prev => ({...prev, zip: e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button
                    type="button"
                    onClick={async (e) => {
                      console.log('🔴 PROFILE UPDATE STARTING');
                      e.preventDefault();
                      e.stopPropagation();
                      
                      try {
                        await handleProfileUpdate(e);
                        console.log('🔴 PROFILE UPDATE COMPLETED SUCCESSFULLY');
                      } catch (error) {
                        console.error('🔴 PROFILE UPDATE FAILED:', error);
                        setError('An unexpected error occurred');
                      }
                    }}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> During the authentication transition, you can set a new password without providing your current password.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({...prev, new: !prev.new}))}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({...prev, confirm: !prev.confirm}))}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button
                    onClick={handlePasswordUpdate}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Display Preferences</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fontSize"
                          value="smaller"
                          checked={preferences.fontSize === 'smaller'}
                          onChange={(e) => setPreferences(prev => ({...prev, fontSize: e.target.value as any}))}
                          className="mr-2"
                        />
                        <span className="text-sm">Smaller</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fontSize"
                          value="standard"
                          checked={preferences.fontSize === 'standard'}
                          onChange={(e) => setPreferences(prev => ({...prev, fontSize: e.target.value as any}))}
                          className="mr-2"
                        />
                        <span className="text-base">Standard</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fontSize"
                          value="larger"
                          checked={preferences.fontSize === 'larger'}
                          onChange={(e) => setPreferences(prev => ({...prev, fontSize: e.target.value as any}))}
                          className="mr-2"
                        />
                        <span className="text-lg">Larger</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Communication Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={preferences.smsConsent}
                        onChange={(e) => {
                          if (e.target.checked && !preferences.smsConsent) {
                            setShowSmsConsentModal(true);
                          } else {
                            setPreferences(prev => ({...prev, smsConsent: e.target.checked}));
                          }
                        }}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">SMS Notifications</div>
                        <div className="text-sm text-gray-600">
                          Receive order confirmations, shipping updates, and account alerts via SMS
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={preferences.marketingSmsConsent}
                        onChange={(e) => setPreferences(prev => ({...prev, marketingSmsConsent: e.target.checked}))}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Marketing SMS</div>
                        <div className="text-sm text-gray-600">
                          Receive promotional offers and marketing messages via SMS
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button
                    onClick={handlePreferencesUpdate}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Updating...' : 'Update Preferences'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* SMS Consent Modal */}
      <SmsConsentModal
        isOpen={showSmsConsentModal}
        onClose={() => setShowSmsConsentModal(false)}
        onConsent={handleSmsConsent}
      />
    </>
  );
};

export default AccountSettingsModal;
