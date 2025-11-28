import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Discount {
  id: string;
  discount: number;
  promo_message: string;
  start_date: string;
  end_date: string;
  created_at: string;
  is_active: boolean;
}

const ManagementTab: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [currentDiscount, setCurrentDiscount] = useState<number | null>(null);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lcmd_discount')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching discounts:', error);
        return;
      }

      setDiscounts(data || []);

      // Get current active discount
      const activeDiscounts = (data || []).filter(d => d.is_active);
      if (activeDiscounts.length > 0) {
        const maxDiscount = Math.max(...activeDiscounts.map(d => d.discount));
        setCurrentDiscount(maxDiscount);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiscount = async (discountData: Partial<Discount>, isNew: boolean = false) => {
    try {
      if (isNew) {
        const { error } = await supabase
          .from('lcmd_discount')
          .insert([discountData]);

        if (error) {
          console.error('Error adding discount:', error);
          alert('Error adding discount');
          return;
        }
      } else {
        const { error } = await supabase
          .from('lcmd_discount')
          .update(discountData)
          .eq('id', discountData.id);

        if (error) {
          console.error('Error updating discount:', error);
          alert('Error updating discount');
          return;
        }
      }

      setShowAddModal(false);
      setShowEditModal(false);
      fetchDiscounts();
      alert(isNew ? 'Discount added successfully' : 'Discount updated successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving discount');
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this discount?')) {
      try {
        const { error } = await supabase
          .from('lcmd_discount')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting discount:', error);
          alert('Error deleting discount');
          return;
        }

        fetchDiscounts();
        alert('Discount deleted successfully');
      } catch (error) {
        console.error('Error:', error);
        alert('Error deleting discount');
      }
    }
  };

  const handleToggleActive = async (discount: Discount) => {
    try {
      const { error } = await supabase
        .from('lcmd_discount')
        .update({ is_active: !discount.is_active })
        .eq('id', discount.id);

      if (error) {
        console.error('Error toggling discount status:', error);
        alert('Error updating discount status');
        return;
      }

      fetchDiscounts();
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating discount status');
    }
  };

  const DiscountModal: React.FC<{
    discount: Discount | null;
    isNew: boolean;
    onClose: () => void;
    onSave: (discount: Partial<Discount>, isNew: boolean) => void;
  }> = ({ discount, isNew, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Discount>>(discount || {
      discount: 0,
      promo_message: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isNew ? 'Add New Discount' : 'Edit Discount'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Rate (decimal, e.g., 0.05 for 5%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.discount || ''}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={formData.promo_message || ''}
                onChange={(e) => setFormData({ ...formData, promo_message: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                placeholder="Enter promotional message..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.is_active || false}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-900">
                Active
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(formData, isNew)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              {isNew ? 'Add Discount' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDiscountPercentage = (discount: number) => {
    return `${(discount * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage system discounts and settings</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Add New Discount
        </button>
      </div>

      {/* Current Discount Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-800">Current Active Discount</div>
            <div className="text-2xl font-bold text-blue-900">
              {currentDiscount ? formatDiscountPercentage(currentDiscount) : 'No Active Discount'}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Total Discounts Configured</div>
            <div className="text-2xl font-bold text-gray-900">{discounts.length}</div>
          </div>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Discount Management</h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading discounts...</div>
          </div>
        ) : discounts.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No discounts configured</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {discounts.map((discount) => (
                  <tr key={discount.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDiscountPercentage(discount.discount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {discount.promo_message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(discount.start_date)} - {formatDate(discount.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        discount.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {discount.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDiscount(discount);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(discount)}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          {discount.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteDiscount(discount.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <DiscountModal
          discount={null}
          isNew={true}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveDiscount}
        />
      )}

      {showEditModal && selectedDiscount && (
        <DiscountModal
          discount={selectedDiscount}
          isNew={false}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveDiscount}
        />
      )}
    </div>
  );
};

export default ManagementTab;
