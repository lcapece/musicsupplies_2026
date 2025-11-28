import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface DiscountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DiscountData {
  id?: string; // UUID, optional for new entries
  promo_message: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  discount: number; // float4, e.g., 0.0025 for 0.25%
  discount_type: 'amount_based' | 'order_based'; // New: Type of discount
  max_orders?: number; // New: Max orders for order-based discount
  created_at?: string;
}

const DiscountFormModal: React.FC<DiscountFormModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<DiscountData>({
    promo_message: '',
    start_date: '',
    end_date: '',
    discount: 0.0025, // Default to 0.25%
    discount_type: 'amount_based', // Default to amount_based
    max_orders: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch existing discount to pre-fill or decide if it's an update/insert
  // For simplicity, this example assumes we are creating a new one or replacing the single existing one.
  // A more robust solution would handle multiple discounts or allow selecting one to edit.
  useEffect(() => {
    if (isOpen) {
      const fetchDiscount = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        // Attempt to fetch the most recent discount to pre-fill
        const { data, error: fetchError } = await supabase
          .from('lcmd_discount')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows found
          console.error('Error fetching discount:', fetchError);
          setError('Could not load existing discount data.');
        } else if (data) {
          setFormData({
            id: data.id,
            promo_message: data.promo_message || '',
            start_date: data.start_date || '',
            end_date: data.end_date || '',
            discount: data.discount || 0.0025,
            discount_type: data.discount_type || 'amount_based',
            max_orders: data.max_orders || undefined,
          });
        } else {
          // No existing discount, reset form to defaults for a new entry
          setFormData({
            promo_message: '',
            start_date: '',
            end_date: '',
            discount: 0.0025,
            discount_type: 'amount_based',
            max_orders: undefined,
          });
        }
        setIsLoading(false);
      };
      fetchDiscount();
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'discount' ? parseFloat(value) : 
              name === 'max_orders' ? parseInt(value) || undefined : 
              value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!formData.start_date || !formData.end_date) {
        setError("Start date and end date are required.");
        setIsLoading(false);
        return;
    }
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
        setError("End date cannot be before start date.");
        setIsLoading(false);
        return;
    }
    if (formData.discount_type === 'order_based' && (!formData.max_orders || formData.max_orders <= 0)) {
      setError("Max orders must be a positive number for order-based discounts.");
      setIsLoading(false);
      return;
    }

    try {
      const payload: Omit<DiscountData, 'id'> & { id?: string } = {
        promo_message: formData.promo_message,
        start_date: formData.start_date,
        end_date: formData.end_date,
        discount: formData.discount,
        discount_type: formData.discount_type,
        max_orders: formData.discount_type === 'order_based' ? formData.max_orders : undefined, // Set to undefined if not order_based
      };
      if (formData.id) {
        payload.id = formData.id; // Include ID for update
      }


      const { error: upsertError } = await supabase
        .from('lcmd_discount')
        .upsert(payload, { onConflict: 'id' }); // Assumes 'id' is the primary key and conflict target

      if (upsertError) {
        console.error('Error saving discount:', upsertError);
        throw upsertError;
      }

      setSuccessMessage('Discount saved successfully!');
      // Optionally close modal on success after a delay
      // setTimeout(onClose, 2000);
    } catch (err) {
      setError('Failed to save discount. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const discountOptions = [];
  for (let i = 0.25; i <= 2.00; i += 0.25) {
    discountOptions.push({ value: i / 100, label: `${i.toFixed(2)}%` });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative bg-white p-8 rounded-lg shadow-xl w-full max-w-lg mx-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Manage Discount</h2>

        {isLoading && <p className="text-blue-500">Loading...</p>}
        {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</p>}
        {successMessage && <p className="text-green-500 bg-green-100 p-3 rounded mb-4">{successMessage}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="promo_message" className="block text-sm font-medium text-gray-700 mb-1">
              Promotional Message
            </label>
            <textarea
              id="promo_message"
              name="promo_message"
              value={formData.promo_message}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., Summer Sale! Get an extra discount on all items."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="discount_type" className="block text-sm font-medium text-gray-700 mb-1">
              Discount Type
            </label>
            <select
              id="discount_type"
              name="discount_type"
              value={formData.discount_type}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="amount_based">Amount Based</option>
              <option value="order_based">Order Based</option>
            </select>
          </div>

          {formData.discount_type === 'order_based' && (
            <div>
              <label htmlFor="max_orders" className="block text-sm font-medium text-gray-700 mb-1">
                Max Orders
              </label>
              <input
                type="number"
                id="max_orders"
                name="max_orders"
                value={formData.max_orders || ''}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., 3"
                min="1"
              />
            </div>
          )}

          <div>
            <label htmlFor="discount" className="block text-sm font-medium text-gray-700 mb-1">
              Discount Percentage
            </label>
            <select
              id="discount"
              name="discount"
              value={formData.discount}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {discountOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              Close
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Discount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiscountFormModal;
