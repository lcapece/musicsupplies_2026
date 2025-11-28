import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PromoCode } from '../../types';

interface AddPromoCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddPromoCodeModal: React.FC<AddPromoCodeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'percent_off',
    value: '',
    min_order_value: '0',
    max_uses: '',
    start_date: '',
    end_date: '',
    uses_per_account_tracking: false,
    max_uses_per_account: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set default dates (today and 30 days from now)
  React.useEffect(() => {
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    setFormData(prev => ({
      ...prev,
      start_date: today.toISOString().split('T')[0],
      end_date: thirtyDaysLater.toISOString().split('T')[0],
    }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'value' || name === 'min_order_value' || name === 'max_uses' || name === 'max_uses_per_account') {
      // For numeric fields, allow empty string or numbers
      if (value === '' || !isNaN(Number(value))) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    if (!formData.code.trim()) return 'Promo code is required';
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.value || Number(formData.value) <= 0) return 'Value must be greater than 0';
    if (Number(formData.min_order_value) < 0) return 'Minimum order value cannot be negative';
    if (formData.max_uses && Number(formData.max_uses) <= 0) return 'Maximum uses must be greater than 0';
    if (formData.uses_per_account_tracking && formData.max_uses_per_account && Number(formData.max_uses_per_account) <= 0) {
      return 'Maximum uses per account must be greater than 0';
    }
    if (!formData.start_date) return 'Start date is required';
    if (!formData.end_date) return 'End date is required';
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    if (endDate < startDate) return 'End date must be after start date';
    
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const newPromoCode = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        type: formData.type,
        value: Number(formData.value),
        min_order_value: Number(formData.min_order_value) || 0,
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        uses_remaining: formData.max_uses ? Number(formData.max_uses) : null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        is_active: true,
        uses_per_account_tracking: formData.uses_per_account_tracking,
        max_uses_per_account: formData.uses_per_account_tracking && formData.max_uses_per_account 
          ? Number(formData.max_uses_per_account) 
          : null,
      };
      
      const { error: insertError } = await supabase
        .from('promo_codes')
        .insert([newPromoCode]);
      
      if (insertError) throw insertError;
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error adding promo code:', err);
      setError(err.message || 'An error occurred while creating the promo code');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Add New Promo Code</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Promo Code
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g. SUMMER25"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Code will be converted to uppercase</p>
            </div>
            
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Promo Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Summer Special Discount"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
            
            {/* Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Discount Type
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              >
                <option value="percent_off">Percentage Discount</option>
                <option value="dollars_off">Fixed Amount Discount</option>
              </select>
            </div>
            
            {/* Value */}
            <div>
              <label htmlFor="value" className="block text-sm font-medium text-gray-700">
                {formData.type === 'percent_off' ? 'Percentage Value' : 'Dollar Amount'}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {formData.type === 'percent_off' ? '%' : '$'}
                </div>
                <input
                  type="text"
                  id="value"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  placeholder={formData.type === 'percent_off' ? '10' : '25.00'}
                  className="block w-full pl-7 pr-12 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>
            
            {/* Min Order Value */}
            <div>
              <label htmlFor="min_order_value" className="block text-sm font-medium text-gray-700">
                Minimum Order Value
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  $
                </div>
                <input
                  type="text"
                  id="min_order_value"
                  name="min_order_value"
                  value={formData.min_order_value}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="block w-full pl-7 pr-12 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Set to 0 for no minimum</p>
            </div>
            
            {/* Max Uses */}
            <div>
              <label htmlFor="max_uses" className="block text-sm font-medium text-gray-700">
                Maximum Total Uses
              </label>
              <input
                type="text"
                id="max_uses"
                name="max_uses"
                value={formData.max_uses}
                onChange={handleChange}
                placeholder="Leave blank for unlimited"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            {/* Start Date */}
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
            
            {/* End Date */}
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
          </div>
          
          {/* Per-account limits section */}
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="uses_per_account_tracking"
                name="uses_per_account_tracking"
                checked={formData.uses_per_account_tracking}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="uses_per_account_tracking" className="ml-2 block text-sm font-medium text-gray-700">
                Limit usage per account
              </label>
            </div>
            
            {formData.uses_per_account_tracking && (
              <div>
                <label htmlFor="max_uses_per_account" className="block text-sm font-medium text-gray-700">
                  Maximum Uses Per Account
                </label>
                <input
                  type="text"
                  id="max_uses_per_account"
                  name="max_uses_per_account"
                  value={formData.max_uses_per_account}
                  onChange={handleChange}
                  placeholder="e.g. 1 for one-time use per account"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required={formData.uses_per_account_tracking}
                />
                <p className="mt-1 text-xs text-gray-500">
                  The maximum number of times each account can use this promo code
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Promo Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPromoCodeModal;
