import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createAccountInSQLServer } from '../lib/createAccount';
import { X, CheckCircle, AlertTriangle, Gift } from 'lucide-react';

interface ProspectData {
  id?: number;
  website: string;
  business_name?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  email?: string | null;
  contact?: string | null;
  address?: string | null;
}

interface ConvertToAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectData: ProspectData | null;
  onConversionSuccess: (accountNumber: string) => void;
  staffUsername?: string;
}

interface ValidationErrors {
  acct_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
}

interface SuccessData {
  accountNumber: string;
  acctName: string;
  zip: string;
  promoCode?: string;
  promoExpires?: string;
}

// CSS for slow pulsating red animation on empty mandatory fields
const pulseRedStyle = `
  @keyframes pulseRed {
    0%, 100% {
      border-color: rgb(239 68 68);
      background-color: rgb(254 242 242);
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
    }
    50% {
      border-color: rgb(185 28 28);
      background-color: rgb(254 226 226);
      box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.3);
    }
  }
  .pulse-red-empty {
    animation: pulseRed 2s ease-in-out infinite;
    border-width: 2px;
  }
`;

const ConvertToAccountModal: React.FC<ConvertToAccountModalProps> = ({
  isOpen,
  onClose,
  prospectData,
  onConversionSuccess,
  staffUsername
}) => {
  const [nextAccountNumber, setNextAccountNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const [formData, setFormData] = useState({
    acct_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email_address: '',
    mobile_phone: '',
    contact: ''
  });

  // Helper to get input class - pulses red if empty mandatory field
  const getMandatoryInputClass = (fieldName: keyof typeof formData, value: string) => {
    const baseClass = 'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500';
    const isEmpty = !value.trim();

    if (isEmpty) {
      return `${baseClass} pulse-red-empty`;
    }
    if (validationErrors[fieldName as keyof ValidationErrors]) {
      return `${baseClass} border-red-500 bg-red-50`;
    }
    return `${baseClass} border-gray-300`;
  };

  // Fetch next account number and populate form when modal opens
  useEffect(() => {
    if (isOpen && prospectData) {
      fetchNextAccountNumber();
      fetchFullProspectData();
      setError(null);
      setValidationErrors({});
      setEnableDiscount(false);
    }
  }, [isOpen, prospectData]);

  const fetchFullProspectData = async () => {
    if (!prospectData?.website) return;

    try {
      // Fetch full prospect data from Supabase - use * to get all available columns
      const { data, error: fetchError } = await supabase
        .from('prospector')
        .select('*')
        .eq('website', prospectData.website)
        .single();

      if (fetchError) {
        console.warn('Could not fetch full prospect data:', fetchError);
        // Fall back to provided data
        setFormData({
          acct_name: prospectData.business_name || '',
          address: prospectData.address || '',
          city: prospectData.city || '',
          state: prospectData.state || '',
          zip: prospectData.zip || '',
          phone: prospectData.phone || '',
          email_address: prospectData.email || '',
          mobile_phone: '',
          contact: prospectData.contact || ''
        });
        return;
      }

      // Populate form with full prospect data - use actual values, not placeholders
      // Note: prospector table may have 'email' or no email column at all
      setFormData({
        acct_name: data?.business_name || prospectData.business_name || '',
        address: data?.address || prospectData.address || '',
        city: data?.city || prospectData.city || '',
        state: data?.state || prospectData.state || '',
        zip: data?.zip || prospectData.zip || '',
        phone: data?.phone || prospectData.phone || '',
        email_address: data?.email || data?.email_address || prospectData.email || '',
        mobile_phone: data?.mobile_phone || '',
        contact: data?.contact || prospectData.contact || ''
      });
    } catch (err) {
      console.error('Error fetching prospect data:', err);
      // Fall back to provided data - populate all available fields
      setFormData({
        acct_name: prospectData.business_name || '',
        address: prospectData.address || '',
        city: prospectData.city || '',
        state: prospectData.state || '',
        zip: prospectData.zip || '',
        phone: prospectData.phone || '',
        email_address: prospectData.email || '',
        mobile_phone: '',
        contact: prospectData.contact || ''
      });
    }
  };

  const fetchNextAccountNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts_lcmd')
        .select('account_number')
        .order('account_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const maxAccountNumber = parseInt(data[0].account_number);
        const newAccountNumber = (maxAccountNumber + 1).toString();
        setNextAccountNumber(newAccountNumber);
      } else {
        setNextAccountNumber('10001'); // Default starting number
      }
    } catch (err: any) {
      console.error('Error fetching next account number:', err);
      setError('Failed to generate account number');
      setNextAccountNumber('ERROR');
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error for this field when user types
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Required fields for SQL Server
    if (!formData.acct_name.trim()) {
      errors.acct_name = 'Business/Account Name is required';
    }
    if (!formData.address.trim()) {
      errors.address = 'Street Address is required';
    }
    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }
    if (!formData.state.trim()) {
      errors.state = 'State is required';
    } else if (formData.state.trim().length !== 2) {
      errors.state = 'State must be 2-letter abbreviation (e.g., CA, NY)';
    }
    if (!formData.zip.trim()) {
      errors.zip = 'ZIP Code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zip.trim())) {
      errors.zip = 'ZIP Code must be 5 digits (or 5+4 format)';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone Number is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createPromoCode = async (accountNumber: string, accountName: string): Promise<{ code: string; expires: string } | null> => {
    try {
      // Call the Supabase function to create promo code
      const { data, error } = await supabase.rpc('create_account_promo_code', {
        p_account_number: parseInt(accountNumber),
        p_account_name: accountName,
        p_created_by: staffUsername || 'SYSTEM'
      });

      if (error) {
        console.error('Error creating promo code:', error);
        return null;
      }

      if (data && data.length > 0 && data[0].success) {
        return {
          code: data[0].promo_code,
          expires: data[0].expires_at
        };
      }

      return null;
    } catch (err) {
      console.error('Failed to create promo code:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!validateForm()) {
      setError('Please fill in all required fields before converting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call SQL Server API to create account
      const result = await createAccountInSQLServer({
        acct_name: formData.acct_name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        zip: formData.zip.trim(),
        phone: formData.phone.trim(),
        email_address: formData.email_address.trim(),
        mobile_phone: formData.mobile_phone.trim(),
        contact: formData.contact.trim(),
        website: prospectData?.website,
        prospect_id: prospectData?.id,
        converted_by: staffUsername || 'Unknown',
        salesman: staffUsername
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create account');
      }

      const accountNumber = result.account_number?.toString() || nextAccountNumber;

      // Create promo code if checkbox is enabled
      let promoData: { code: string; expires: string } | null = null;
      if (enableDiscount) {
        promoData = await createPromoCode(accountNumber, formData.acct_name.trim());
      }

      // Log activity if we have prospect data
      if (prospectData?.website) {
        try {
          await supabase
            .from('prospect_activity_log')
            .insert({
              prospect_website: prospectData.website,
              activity_type: 'conversion',
              activity_details: `Converted to Account #${accountNumber}${promoData ? ` with promo code ${promoData.code}` : ''}`,
              staff_username: staffUsername || 'Unknown',
              activity_timestamp: new Date().toISOString()
            });
        } catch (logError) {
          console.warn('Failed to log conversion activity:', logError);
        }

        // CRITICAL: Insert into prospect_conversions table for tracking
        try {
          await supabase
            .from('prospect_conversions')
            .insert({
              prospect_website: prospectData.website,
              prospect_business_name: formData.acct_name.trim(),
              prospect_city: formData.city.trim(),
              prospect_state: formData.state.trim().toUpperCase(),
              prospect_zip: formData.zip.trim(),
              prospect_phone: formData.phone.trim(),
              prospect_email: formData.email_address.trim() || null,
              account_number: parseInt(accountNumber),
              converted_by: staffUsername || 'Unknown',
              promo_code: promoData?.code || null,
              promo_discount_percent: promoData ? 25 : null,
              promo_max_discount: promoData ? 250.00 : null,
              promo_expires_at: promoData?.expires || null,
              conversion_notes: `Converted from prospect by ${staffUsername || 'Unknown'}`
            });
          console.log('✅ Conversion tracked in prospect_conversions table');
        } catch (conversionLogError) {
          console.error('Failed to log conversion to prospect_conversions:', conversionLogError);
          // Don't throw - this is a tracking feature, not critical to the conversion
        }

        // Update the prospector table to mark as converted with account number
        try {
          await supabase
            .from('prospector')
            .update({
              status: 'CONVERTED ACCT',
              converted_account_number: parseInt(accountNumber),
              converted_at: new Date().toISOString(),
              converted_by: staffUsername || 'Unknown'
            })
            .eq('website', prospectData.website);
          console.log('✅ Prospector record updated with conversion status');
        } catch (updateError) {
          console.warn('Failed to update prospector status:', updateError);
        }
      }

      // Show success modal with account details
      setSuccessData({
        accountNumber,
        acctName: formData.acct_name.trim(),
        zip: formData.zip.trim(),
        promoCode: promoData?.code,
        promoExpires: promoData?.expires
      });
      setShowSuccessModal(true);

    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);

    if (successData) {
      onConversionSuccess(successData.accountNumber);
    }

    onClose();

    // Reset form
    setFormData({
      acct_name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email_address: '',
      mobile_phone: '',
      contact: ''
    });
    setSuccessData(null);
    setEnableDiscount(false);
  };

  if (!isOpen) return null;

  // Success Modal
  if (showSuccessModal && successData) {
    return (
      <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        {/* Inject pulse animation styles */}
        <style>{pulseRedStyle}</style>
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[85vh] overflow-y-auto">
          {/* Success Header - Compact */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-4 text-white text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-2" />
            <h2 className="text-2xl font-bold">Account Created!</h2>
          </div>

          {/* Account Details - Compact */}
          <div className="p-4 space-y-3">
            {/* Main Info Box - Compact */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">
                New Account Number
              </p>
              <p className="text-4xl font-bold text-blue-800 font-mono mb-2">
                {successData.accountNumber}
              </p>

              <div className="border-t border-blue-200 pt-2 mt-2 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-blue-600 font-semibold">Customer Name</p>
                  <p className="text-sm font-bold text-blue-800 truncate">{successData.acctName}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-semibold">ZIP Code (Password)</p>
                  <p className="text-xl font-bold text-blue-800 font-mono">{successData.zip}</p>
                </div>
              </div>
            </div>

            {/* Instructions for salesman - Compact */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="font-bold mb-1">Tell the customer:</p>
                  <p>"Log in with Account #: <strong>{successData.accountNumber}</strong> | Password: <strong>{successData.zip}</strong>"</p>
                </div>
              </div>
            </div>

            {/* Promo Code Section (if enabled) - Compact */}
            {successData.promoCode && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-bold text-purple-800">Special Welcome Discount!</span>
                </div>

                <div className="bg-white rounded-lg p-2 text-center border border-purple-200">
                  <p className="text-xs text-purple-600 font-semibold">Promo Code</p>
                  <p className="text-2xl font-bold text-purple-800 font-mono tracking-wider">
                    {successData.promoCode}
                  </p>
                </div>

                <div className="mt-2 text-xs text-purple-700 grid grid-cols-2 gap-1">
                  <p><strong>25% OFF</strong> (up to $250)</p>
                  <p><strong>Min:</strong> $100 | <strong>Max:</strong> $1,000</p>
                  <p><strong>Valid:</strong> 24 hours only</p>
                  <p className="text-purple-500">* Account #{successData.accountNumber} only</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Compact */}
          <div className="px-4 py-3 bg-gray-50 border-t">
            <button
              onClick={handleSuccessModalClose}
              className="w-full px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-base rounded-lg shadow transition-all"
            >
              OK - Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Convert Form
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Inject pulse animation styles */}
      <style>{pulseRedStyle}</style>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-800 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Convert to Account</h2>
            <p className="text-orange-100 text-sm mt-1">
              New Account Number: <span className="font-mono font-bold text-white">{nextAccountNumber || 'Loading...'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg disabled:opacity-50"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Converting from Prospect:</p>
              <p className="text-blue-700">
                Website: <span className="font-mono">{prospectData?.website || 'N/A'}</span>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            )}

            {/* Required Fields Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              <p className="font-semibold">All fields marked with <span className="text-red-600">*</span> are required for account creation.</p>
            </div>

            {/* Form Fields - 2 Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account/Business Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business/Account Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.acct_name}
                  onChange={(e) => handleInputChange('acct_name', e.target.value)}
                  className={getMandatoryInputClass('acct_name', formData.acct_name)}
                  placeholder="Enter business name"
                  disabled={loading}
                />
                {validationErrors.acct_name && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.acct_name}</p>
                )}
              </div>

              {/* Contact Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => handleInputChange('contact', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Primary contact name"
                  disabled={loading}
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Street Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={getMandatoryInputClass('address', formData.address)}
                  placeholder="123 Main Street"
                  disabled={loading}
                />
                {validationErrors.address && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.address}</p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={getMandatoryInputClass('city', formData.city)}
                  placeholder="City"
                  disabled={loading}
                />
                {validationErrors.city && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.city}</p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  State <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                  className={getMandatoryInputClass('state', formData.state)}
                  placeholder="CA"
                  maxLength={2}
                  disabled={loading}
                />
                {validationErrors.state && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.state}</p>
                )}
              </div>

              {/* ZIP Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ZIP Code <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  className={getMandatoryInputClass('zip', formData.zip)}
                  placeholder="90210"
                  disabled={loading}
                />
                {validationErrors.zip && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.zip}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={getMandatoryInputClass('phone', formData.phone)}
                  placeholder="(555) 123-4567"
                  disabled={loading}
                />
                {validationErrors.phone && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.phone}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email_address}
                  onChange={(e) => handleInputChange('email_address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="contact@example.com"
                  disabled={loading}
                />
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile/SMS Number
                </label>
                <input
                  type="tel"
                  value={formData.mobile_phone}
                  onChange={(e) => handleInputChange('mobile_phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="(555) 987-6543"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Promo Code Checkbox */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5 mt-6">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDiscount}
                  onChange={(e) => setEnableDiscount(e.target.checked)}
                  disabled={loading}
                  className="w-6 h-6 mt-1 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-purple-600" />
                    <span className="font-bold text-purple-800 text-lg">
                      Enable Site-Wide 25% Discount
                    </span>
                  </div>
                  <div className="text-sm text-purple-700 mt-2 space-y-1">
                    <p><strong>Minimum order:</strong> $100</p>
                    <p><strong>Maximum order value:</strong> $1,000</p>
                    <p><strong>Maximum discount:</strong> $250 (25% of $1,000)</p>
                    <p><strong>Valid for:</strong> 24 hours from account creation</p>
                    <p className="text-xs text-purple-500 mt-2">
                      * A unique promo code will be generated for this account only
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {/* Info Note */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-800 mb-2">What happens next:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Account will be created in SQL Server master database</li>
                <li>The account will sync to Supabase automatically</li>
                <li>Customer can immediately order on the website</li>
                <li>The conversion will be logged in prospect activity</li>
                {enableDiscount && (
                  <li className="text-purple-700 font-semibold">A 25% discount promo code will be generated!</li>
                )}
              </ul>
            </div>
          </div>
        </form>

        {/* Footer with Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !nextAccountNumber || nextAccountNumber === 'ERROR'}
            className="px-8 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Converting...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConvertToAccountModal;
