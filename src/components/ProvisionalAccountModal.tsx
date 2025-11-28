import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface EntityResult {
  id: string;
  business_name: string;
  address?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

interface ProvisionalAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: EntityResult;
  onComplete: () => void;
}

const ProvisionalAccountModal: React.FC<ProvisionalAccountModalProps> = ({
  isOpen,
  onClose,
  prospect,
  onComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [nextAccountNumber, setNextAccountNumber] = useState<string>('');
  const [formData, setFormData] = useState({
    business_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    status: 'Active'
  });

  useEffect(() => {
    if (isOpen && prospect) {
      // Initialize form with prospect data
      setFormData({
        business_name: prospect.business_name,
        address: prospect.address || '',
        city: prospect.city,
        state: prospect.state,
        zip: prospect.zip,
        phone: prospect.phone,
        status: 'Active'
      });
      
      // Get next account number
      fetchNextAccountNumber();
    }
  }, [isOpen, prospect]);

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
    } catch (err) {
      console.error('Error fetching next account number:', err);
      setNextAccountNumber('ERROR');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Insert into accounts_lcmd_inject table
      const { error: insertError } = await supabase
        .from('accounts_lcmd_inject')
        .insert({
          account_number: nextAccountNumber,
          business_name: formData.business_name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          phone: formData.phone,
          status: formData.status,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Delete prospect from prospects table
      const { error: deleteError } = await supabase
        .from('prospects')
        .delete()
        .eq('id', prospect.id);

      if (deleteError) {
        console.error('Error deleting prospect:', deleteError);
      }

      setSuccess(true);
      
      // Wait for animation then complete
      setTimeout(() => {
        onComplete();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error creating provisional account:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-white mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              <div>
                <h2 className="text-xl font-bold text-white">Create Provisional Account</h2>
                <p className="text-emerald-100 text-sm">Converting prospect to customer account</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg disabled:opacity-50"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-blue-900 font-medium">System Integration Notice</p>
              <p className="text-xs text-blue-700 mt-1">
                This account will be added to the injection table and automatically synced with the legacy system within 5 minutes.
                Once synced, the account will be available for order processing.
              </p>
            </div>
          </div>
        </div>

        {/* Account Number Display */}
        <div className="px-6 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">New Account Number</span>
              <div className="flex items-center mt-1">
                <span className="text-3xl font-bold text-red-600">
                  #{nextAccountNumber}
                </span>
                {nextAccountNumber === 'ERROR' && (
                  <span className="ml-3 text-sm text-red-500">Unable to generate account number</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</span>
              <div className="mt-1">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-4">
            {/* Business Name */}
            <div>
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                Business Name *
              </label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                placeholder="Enter business name"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                Street Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                placeholder="Enter street address"
              />
            </div>

            {/* City, State, ZIP Row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  maxLength={2}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all uppercase"
                  placeholder="ST"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                  placeholder="12345"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                placeholder="555-555-5555"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start">
                <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Success Animation */}
            {success && (
              <div className="p-6 bg-green-50 border-2 border-green-300 rounded-lg text-center">
                <svg className="w-16 h-16 text-green-600 mx-auto mb-3 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-bold text-green-900 mb-1">Account Created Successfully!</h3>
                <p className="text-sm text-green-700">Account #{nextAccountNumber} has been created and will sync shortly.</p>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gradient-to-b from-gray-100 to-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              * Required fields. Account will be available for orders after legacy system sync.
            </p>
            <div className="flex gap-3">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || success || nextAccountNumber === 'ERROR'}
                className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                ) : success ? (
                  '✓ Created'
                ) : (
                  'Create Account'
                )}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-medium rounded-lg shadow transition-all disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvisionalAccountModal;
