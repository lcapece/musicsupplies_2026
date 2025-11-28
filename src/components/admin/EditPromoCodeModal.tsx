import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PromoCode } from '../../types';
import { X } from 'lucide-react';

interface EditPromoCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  promoCode: PromoCode | null;
}

const EditPromoCodeModal: React.FC<EditPromoCodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  promoCode
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'percent_off' as 'percent_off' | 'dollars_off',
    value: '',
    min_order_value: '',
    max_uses: '',
    start_date: '',
    end_date: '',
    is_active: true,
    max_uses_per_account: '',
    uses_per_account_tracking: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when promo code is provided
  useEffect(() => {
    if (promoCode) {
      setFormData({
        code: promoCode.code,
        name: promoCode.name,
        type: promoCode.type,
        value: promoCode.value.toString(),
        min_order_value: promoCode.min_order_value.toString(),
        max_uses: promoCode.max_uses?.toString() || '',
        start_date: promoCode.start_date.split('T')[0], // Format for date input
        end_date: promoCode.end_date.split('T')[0], // Format for date input
        is_active: promoCode.is_active,
        max_uses_per_account: promoCode.max_uses_per_account?.toString() || '',
        uses_per_account_tracking: promoCode.uses_per_account_tracking || false
      });
    }
  }, [promoCode]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setFormData({
        code: '',
        name: '',
        type: 'percent_off',
        value: '',
        min_order_value: '',
        max_uses: '',
        start_date: '',
        end_date: '',
        is_active: true,
        max_uses_per_account: '',
        uses_per_account_tracking: false
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode) return;

    setLoading(true);
    setError(null);

    try {
      const newMaxUses = formData.max_uses ? parseInt(formData.max_uses) : null;
      const oldMaxUses = promoCode.max_uses;
      const oldUsesRemaining = promoCode.uses_remaining;

      // Calculate new uses_remaining when max_uses changes
      let newUsesRemaining = oldUsesRemaining;
      
      if (newMaxUses !== oldMaxUses) {
        if (newMaxUses === null) {
          // Changed to unlimited - set uses_remaining to null
          newUsesRemaining = null;
        } else if (oldMaxUses === null) {
          // Changed from unlimited to limited - set uses_remaining to new max_uses
          newUsesRemaining = newMaxUses;
        } else {
          // Both are limited - calculate the difference and adjust uses_remaining
          const usedCount = oldMaxUses - (oldUsesRemaining || 0);
          newUsesRemaining = Math.max(0, newMaxUses - usedCount);
        }
      }

      const updateData = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        type: formData.type,
        value: parseFloat(formData.value),
        min_order_value: parseFloat(formData.min_order_value),
        max_uses: newMaxUses,
        uses_remaining: newUsesRemaining,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
        max_uses_per_account: formData.max_uses_per_account ? parseInt(formData.max_uses_per_account) : null,
        uses_per_account_tracking: formData.uses_per_account_tracking,
        updated_at: new Date().toISOString()
      };


      const { error } = await supabase
        .from('promo_codes')
        .update(updateData)
        .eq('id', promoCode.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating promo code:', err);
      setError(err.message || 'Failed to update promo code');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Promo Code</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Promo Code *
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter promo code"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter promo name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Type *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="percent_off">Percentage Off</option>
              <option value="dollars_off">Dollars Off</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Value *
            </label>
            <input
              type="number"
              name="value"
              value={formData.value}
              onChange={handleChange}
              required
              min="0"
              step={formData.type === 'percent_off' ? '1' : '0.01'}
              max={formData.type === 'percent_off' ? '100' : undefined}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder={formData.type === 'percent_off' ? 'Enter percentage' : 'Enter dollar amount'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Order Value *
            </label>
            <input
              type="number"
              name="min_order_value"
              value={formData.min_order_value}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter minimum order value"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Uses (leave empty for unlimited)
            </label>
            <input
              type="number"
              name="max_uses"
              value={formData.max_uses}
              onChange={handleChange}
              min="1"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter maximum uses"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="uses_per_account_tracking"
              checked={formData.uses_per_account_tracking}
              onChange={handleChange}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">
              Enable per-account usage tracking
            </label>
          </div>

          {formData.uses_per_account_tracking && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Uses Per Account (leave empty for unlimited)
              </label>
              <input
                type="number"
                name="max_uses_per_account"
                value={formData.max_uses_per_account}
                onChange={handleChange}
                min="1"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Enter max uses per account"
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Promo Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPromoCodeModal;
