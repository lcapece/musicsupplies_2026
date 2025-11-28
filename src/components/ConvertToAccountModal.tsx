import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createAccountInSQLServer } from '../lib/createAccount';
import { X } from 'lucide-react';

interface ProspectData {
  id?: number;
  website: string;
  business_name?: string | null;
  city?: string | null;
  phone?: string | null;
}

interface ConvertToAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectData: ProspectData | null;
  onConversionSuccess: (accountNumber: string) => void;
  staffUsername?: string;
}

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
  const [formData, setFormData] = useState({
    acct_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email_address: '',
    mobile_phone: ''
  });

  // Fetch next account number and populate form when modal opens
  useEffect(() => {
    if (isOpen && prospectData) {
      fetchNextAccountNumber();
      // Pre-populate form with prospect data
      setFormData({
        acct_name: prospectData.business_name || '',
        address: '',
        city: prospectData.city || '',
        state: '',
        zip: '',
        phone: prospectData.phone || '',
        email_address: '',
        mobile_phone: ''
      });
      setError(null);
    }
  }, [isOpen, prospectData]);

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.acct_name.trim()) {
      setError('Business/Account Name is required');
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
        state: formData.state.trim(),
        zip: formData.zip.trim(),
        phone: formData.phone.trim(),
        email_address: formData.email_address.trim(),
        mobile_phone: formData.mobile_phone.trim(),
        prospect_id: prospectData?.id,
        converted_by: staffUsername || 'Unknown',
        salesman: staffUsername
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create account');
      }

      const accountNumber = result.account_number?.toString() || nextAccountNumber;

      // Display promo code if returned
      if (result.promo_code) {
        // Show success modal with promo code
        alert(`
✨ SUCCESS! Account #${accountNumber} Created!

🎁 EXCLUSIVE PROMO CODE: ${result.promo_code}

This vowel-only code "${result.promo_code}" is easy to remember!

📌 IMPORTANT:
• 25% OFF (up to $250 discount)
• Valid for 24 HOURS only
• Maximum order: $1,000
• This code ONLY works for Account #${accountNumber}
• Cannot be shared with other accounts

Please write down or save this code: ${result.promo_code}
        `);
      }

      // Log activity if we have prospect data
      if (prospectData?.website) {
        try {
          await supabase
            .from('prospect_activity_log')
            .insert({
              prospect_website: prospectData.website,
              activity_type: 'conversion',
              activity_details: `Converted to Account #${nextAccountNumber}`,
              staff_username: staffUsername || 'Unknown',
              activity_timestamp: new Date().toISOString()
            });
        } catch (logError) {
          console.warn('Failed to log conversion activity:', logError);
          // Don't throw - conversion succeeded even if logging failed
        }
      }

      // Success! Call the callback and close modal
      onConversionSuccess(accountNumber);
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
        mobile_phone: ''
      });

    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
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
              <p className="font-semibold mb-1">📋 Converting from Prospect:</p>
              <p className="text-blue-700">
                Website: <span className="font-mono">{prospectData?.website || 'N/A'}</span>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                <p className="font-semibold">❌ Error:</p>
                <p>{error}</p>
              </div>
            )}

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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter business name"
                  required
                  disabled={loading}
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="123 Main Street"
                  disabled={loading}
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="City"
                  disabled={loading}
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="CA"
                  maxLength={2}
                  disabled={loading}
                />
              </div>

              {/* ZIP Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="90210"
                  disabled={loading}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="(555) 123-4567"
                  disabled={loading}
                />
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

            {/* Info Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
              <p className="font-semibold text-amber-900 mb-1">🚀 CRITICAL INFORMATION:</p>
              <ul className="list-disc list-inside space-y-1">
                <li className="font-bold">Account will be created directly in SQL Server master database</li>
                <li>The account will sync back to Supabase automatically</li>
                <li>This enables immediate ordering capability on the website</li>
                <li>The conversion will be logged in the prospect activity log</li>
                <li className="text-amber-900 font-semibold">Once created, the customer can use promo codes immediately!</li>
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
              <>
                🔄 Create Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConvertToAccountModal;
