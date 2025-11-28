import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Phone, Mail, Smartphone } from 'lucide-react';

interface ContactInfo {
  account_number: number;
  email_address?: string;
  business_phone?: string;
  mobile_phone?: string;
  updated_at?: string;
}

interface ContactInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountNumber: number;
  accountName?: string;
  initialEmail?: string;
  initialPhone?: string;
  initialMobilePhone?: string;
  onSuccess?: () => void;
}

export const ContactInfoModal: React.FC<ContactInfoModalProps> = ({
  isOpen,
  onClose,
  accountNumber,
  accountName,
  initialEmail,
  initialPhone,
  initialMobilePhone,
  onSuccess
}) => {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    account_number: accountNumber,
    email_address: initialEmail || '',
    business_phone: initialPhone || '',
    mobile_phone: initialMobilePhone || ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load existing contact info when modal opens
  useEffect(() => {
    if (isOpen && accountNumber) {
      // Initialize with values from accounts table (passed as props)
      setContactInfo({
        account_number: accountNumber,
        email_address: initialEmail || '',
        business_phone: initialPhone || '',
        mobile_phone: initialMobilePhone || ''
      });
      // Then check if there's additional info in the contact_info table
      loadContactInfo();
    }
  }, [isOpen, accountNumber, initialEmail, initialPhone, initialMobilePhone]);

  const loadContactInfo = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Set admin context when editing from admin page
      const isAdminPage = window.location.pathname.includes('/admin');
      if (isAdminPage) {
        try {
          await supabase.rpc('set_config', {
            setting_name: 'app.current_account_number',
            new_value: '999',
            is_local: true
          });
        } catch (configError) {
          console.log('Session context set failed (non-critical):', configError);
        }
      }

      const { data, error } = await supabase
        .rpc('get_contact_info', { p_account_number: accountNumber });

      if (error) throw error;

      if (data && data.length > 0) {
        const info = data[0];
        setContactInfo({
          account_number: info.account_number,
          email_address: info.email_address || initialEmail || '',
          business_phone: info.business_phone || initialPhone || '',
          mobile_phone: info.mobile_phone || initialMobilePhone || '',
          updated_at: info.updated_at
        });
      }
      // If no record in contact_info table, keep the initial values from accounts table
    } catch (err) {
      console.error('Error loading contact info:', err);
      // Don't show error since we have initial values from accounts table
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Set admin context when editing from admin page
      const isAdminPage = window.location.pathname.includes('/admin');
      if (isAdminPage) {
        try {
          await supabase.rpc('set_config', {
            setting_name: 'app.current_account_number',
            new_value: '999',
            is_local: true
          });
        } catch (configError) {
          console.log('Session context set failed (non-critical):', configError);
        }
      }

      // Log the data being sent
      console.log('Saving contact info for account:', accountNumber);
      console.log('Data being sent:', {
        p_account_number: accountNumber,
        p_email_address: contactInfo.email_address || null,
        p_business_phone: contactInfo.business_phone || null,
        p_mobile_phone: contactInfo.mobile_phone || null
      });

      const { data, error } = await supabase
        .rpc('upsert_contact_info', {
          p_account_number: accountNumber,
          p_email_address: contactInfo.email_address || null,
          p_business_phone: contactInfo.business_phone || null,
          p_mobile_phone: contactInfo.mobile_phone || null
        });

      if (error) {
        console.error('Supabase RPC error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Response from upsert_contact_info:', data);

      if (data && data.length > 0) {
        const updated = data[0];
        setContactInfo(prev => ({
          ...prev,
          updated_at: updated.updated_at
        }));
        setSuccess('Contact information saved successfully!');
        
        // Call onSuccess callback to refresh the accounts grid
        if (onSuccess) {
          onSuccess();
        }
        
        // Auto-close modal after 1.5 seconds
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 1500);
      } else {
        console.warn('No data returned from upsert_contact_info');
        setError('Contact information saved but no confirmation received');
      }
    } catch (err: any) {
      console.error('Error saving contact info:', err);
      
      // Provide more detailed error message
      let errorMessage = 'Failed to save contact information';
      if (err.message) {
        errorMessage += ': ' + err.message;
      }
      if (err.code === 'PGRST202') {
        errorMessage = 'Function upsert_contact_info not found. Please run the database migration.';
      } else if (err.code === '42501') {
        errorMessage = 'Permission denied. Please check database permissions.';
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Limit to 10 digits (US phone numbers)
    const truncated = numbers.slice(0, 10);
    
    // Format as (999)999-9999
    if (truncated.length >= 6) {
      return `(${truncated.slice(0, 3)})${truncated.slice(3, 6)}-${truncated.slice(6)}`;
    } else if (truncated.length >= 3) {
      return `(${truncated.slice(0, 3)})${truncated.slice(3)}`;
    } else if (truncated.length > 0) {
      return `(${truncated}`;
    }
    return '';
  };

  const handleInputChange = (field: keyof ContactInfo, value: string) => {
    let processedValue = value;
    
    // Apply phone formatting for phone fields
    if (field === 'business_phone' || field === 'mobile_phone') {
      processedValue = formatPhoneNumber(value);
    }
    
    setContactInfo(prev => ({
      ...prev,
      [field]: processedValue
    }));
    // Clear messages when user starts typing
    setError('');
    setSuccess('');
  };

  const validateEmail = (email: string) => {
    if (!email) return true; // Email is optional
    
    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    // Additional checks
    if (email.length > 254) return false; // Max email length per RFC
    if (email.startsWith('.') || email.endsWith('.')) return false;
    if (email.includes('..')) return false;
    
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    if (!phone) return true; // Phone is optional
    
    // Remove formatting to check the actual number
    const numbers = phone.replace(/\D/g, '');
    
    // Must be exactly 10 digits for US phone numbers
    return numbers.length === 10;
  };

  const isFormValid = () => {
    return validateEmail(contactInfo.email_address || '') &&
           validatePhone(contactInfo.business_phone || '') &&
           validatePhone(contactInfo.mobile_phone || '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Contact Information
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={saving}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Account Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">
              Account: #{accountNumber}
              {accountName && <span className="text-gray-600"> - {accountName}</span>}
            </p>
            {contactInfo.updated_at && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {new Date(contactInfo.updated_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          )}

          {/* Form */}
          {!loading && (
            <div className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Mail size={16} className="mr-2 text-gray-500" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={contactInfo.email_address || ''}
                  onChange={(e) => handleInputChange('email_address', e.target.value)}
                  placeholder="Enter email address"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    contactInfo.email_address && !validateEmail(contactInfo.email_address)
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                  disabled={saving}
                />
                {contactInfo.email_address && !validateEmail(contactInfo.email_address) && (
                  <p className="text-xs text-red-600 mt-1">
                    Please enter a valid email address (e.g., name@example.com)
                  </p>
                )}
              </div>

              {/* Business Phone */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Phone size={16} className="mr-2 text-gray-500" />
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={contactInfo.business_phone || ''}
                  onChange={(e) => handleInputChange('business_phone', e.target.value)}
                  placeholder="(999)999-9999"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    contactInfo.business_phone && !validatePhone(contactInfo.business_phone)
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                  disabled={saving}
                />
                {contactInfo.business_phone && !validatePhone(contactInfo.business_phone) && (
                  <p className="text-xs text-red-600 mt-1">
                    Please enter a 10-digit phone number
                  </p>
                )}
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Smartphone size={16} className="mr-2 text-gray-500" />
                  Mobile Phone
                </label>
                <input
                  type="tel"
                  value={contactInfo.mobile_phone || ''}
                  onChange={(e) => handleInputChange('mobile_phone', e.target.value)}
                  placeholder="(999)999-9999"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    contactInfo.mobile_phone && !validatePhone(contactInfo.mobile_phone)
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300'
                  }`}
                  disabled={saving}
                />
                {contactInfo.mobile_phone && !validatePhone(contactInfo.mobile_phone) && (
                  <p className="text-xs text-red-600 mt-1">
                    Please enter a 10-digit phone number
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isFormValid()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Contact Info'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactInfoModal;
