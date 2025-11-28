import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface DateBasedDiscount {
  id: number;
  discount: number; // This is specific to lcmd_discount table structure
  message: string;
  start_date: string;
  end_date: string;
  created_at: string;
  is_active: boolean;
}

interface OrderBasedDiscount {
  id: number;
  name?: string;
  description?: string;
  discount_type: string; // e.g., 'order_based', 'introductory_percentage_first_n_orders'
  value: number; // Discount rate/amount, consistent with discount_tiers.value
  max_orders?: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

type DiscountType = 'date_based' | 'order_based' | 'introductory_percentage_first_n_orders';

const DiscountManagementTab: React.FC = () => {
  const [dateBasedDiscounts, setDateBasedDiscounts] = useState<DateBasedDiscount[]>([]);
  const [orderBasedDiscounts, setOrderBasedDiscounts] = useState<OrderBasedDiscount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<any>(null);
  const [selectedDiscountType, setSelectedDiscountType] = useState<DiscountType>('date_based');
  const [activeTab, setActiveTab] = useState<DiscountType>('date_based');

  useEffect(() => {
    fetchAllDiscounts();
  }, []);

  const fetchAllDiscounts = async () => {
    try {
      setLoading(true);
      
      const { data: dateDiscounts, error: dateError } = await supabase
        .from('lcmd_discount')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateError) {
        console.error('Error fetching date-based discounts:', dateError);
      } else {
        setDateBasedDiscounts(dateDiscounts || []);
      }

      const { data: fetchedOrderDiscounts, error: orderError } = await supabase
        .from('discount_tiers')
        .select('*')
        .in('discount_type', ['order_based', 'introductory_percentage_first_n_orders'])
        .order('created_at', { ascending: false });

      if (orderError) {
        console.error('Error fetching order-based discounts:', orderError);
      } else {
        setOrderBasedDiscounts(fetchedOrderDiscounts || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDateBasedDiscount = async (discountData: Partial<DateBasedDiscount>, isNew: boolean = false) => {
    try {
      if (isNew) {
        const { error } = await supabase.from('lcmd_discount').insert([discountData]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lcmd_discount').update(discountData).eq('id', discountData.id);
        if (error) throw error;
      }
      setShowAddModal(false);
      setShowEditModal(false);
      fetchAllDiscounts();
      alert(isNew ? 'Date-based discount added successfully' : 'Date-based discount updated successfully');
    } catch (error) {
      console.error('Error saving date-based discount:', error);
      alert('Error saving discount');
    }
  };

  const handleSaveOrderBasedDiscount = async (discountData: Partial<OrderBasedDiscount>, isNew: boolean = false) => {
    try {
      const payload = {
        ...discountData,
        updated_at: new Date().toISOString()
      };

      if (isNew) {
        const { error } = await supabase.from('discount_tiers').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('discount_tiers').update(payload).eq('id', discountData.id);
        if (error) throw error;
      }
      setShowAddModal(false);
      setShowEditModal(false);
      fetchAllDiscounts();
      alert(isNew ? 'Order-based discount added successfully' : 'Order-based discount updated successfully');
    } catch (error) {
      console.error('Error saving order-based discount:', error);
      alert('Error saving discount');
    }
  };

  const handleDeleteDateBasedDiscount = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this date-based discount?')) {
      try {
        const { error } = await supabase.from('lcmd_discount').delete().eq('id', id);
        if (error) throw error;
        fetchAllDiscounts();
        alert('Date-based discount deleted successfully');
      } catch (error) {
        console.error('Error deleting date-based discount:', error);
        alert('Error deleting discount');
      }
    }
  };

  const handleDeleteOrderBasedDiscount = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this order-based discount?')) {
      try {
        const { error } = await supabase.from('discount_tiers').delete().eq('id', id);
        if (error) throw error;
        fetchAllDiscounts();
        alert('Order-based discount deleted successfully');
      } catch (error) {
        console.error('Error deleting order-based discount:', error);
        alert('Error deleting discount');
      }
    }
  };

  const handleToggleActive = async (discount: DateBasedDiscount) => { // Only for DateBasedDiscount for now
    try {
      const { error } = await supabase
        .from('lcmd_discount')
        .update({ is_active: !discount.is_active })
        .eq('id', discount.id);
      if (error) throw error;
      fetchAllDiscounts();
    } catch (error) {
      console.error('Error toggling discount status:', error);
      alert('Error updating discount status');
    }
  };
  
  // Add a similar function for OrderBasedDiscount if needed
  const handleToggleOrderBasedActive = async (discount: OrderBasedDiscount) => {
    try {
      const { error } = await supabase
        .from('discount_tiers')
        .update({ is_active: !discount.is_active })
        .eq('id', discount.id);
      if (error) throw error;
      fetchAllDiscounts();
    } catch (error) {
      console.error('Error toggling order-based discount status:', error);
      alert('Error updating discount status');
    }
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDiscountPercentage = (value: number | undefined | null) => {
    if (typeof value !== 'number') return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  const isDiscountActive = (discount: DateBasedDiscount) => {
    if (!discount.is_active) return false;
    const now = new Date();
    const startDate = new Date(discount.start_date);
    const endDate = new Date(discount.end_date);
    return now >= startDate && now <= endDate;
  };

  const getMaxDiscountRate = (type: DiscountType) => {
    if (type === 'date_based') {
      const validDiscounts = dateBasedDiscounts.map(d => d.discount).filter(d => typeof d === 'number' && d > 0);
      return validDiscounts.length > 0 ? Math.max(...validDiscounts) : null;
    } else { 
      const validDiscounts = orderBasedDiscounts.map(d => d.value).filter(d => typeof d === 'number' && d > 0);
      return validDiscounts.length > 0 ? Math.max(...validDiscounts) : null;
    }
  };

  const DateBasedDiscountModal: React.FC<{
    discount: DateBasedDiscount | null;
    isNew: boolean;
    onClose: () => void;
    onSave: (discount: Partial<DateBasedDiscount>, isNew: boolean) => void;
  }> = ({ discount, isNew, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<DateBasedDiscount>>(discount || {
      discount: 0, message: '', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], is_active: true
    });
    useEffect(() => { if (discount) setFormData(discount); }, [discount]);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{isNew ? 'Add New Date-Based Discount' : 'Edit Date-Based Discount'}</h3>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Discount Rate (decimal, e.g., 0.05 for 5%)</label><input type="number" step="0.01" min="0" max="1" value={formData.discount || ''} onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Message</label><textarea value={formData.message || ''} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={3} placeholder="Enter promotional message..."/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" value={formData.start_date || ''} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date</label><input type="date" value={formData.end_date || ''} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"/></div>
            <div className="flex items-center"><input type="checkbox" id="dateBasedIsActive" checked={formData.is_active || false} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 text-blue-600 border-gray-300 rounded"/><label htmlFor="dateBasedIsActive" className="ml-2 text-sm text-gray-900">Active</label></div>
          </div>
          <div className="flex justify-end space-x-3 mt-6"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button><button onClick={() => onSave(formData, isNew)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">{isNew ? 'Add Discount' : 'Save Changes'}</button></div>
        </div>
      </div>
    );
  };

  const OrderBasedDiscountModal: React.FC<{
    discount: OrderBasedDiscount | null;
    isNew: boolean;
    onClose: () => void;
    onSave: (discount: Partial<OrderBasedDiscount>, isNew: boolean) => void;
  }> = ({ discount, isNew, onClose, onSave }) => {
    const initialFormData: Partial<OrderBasedDiscount> = { name: '', description: '', value: 0.05, max_orders: 3, discount_type: 'order_based', is_active: true };
    const [formData, setFormData] = useState<Partial<OrderBasedDiscount>>(discount || initialFormData);
    useEffect(() => { setFormData(discount || initialFormData); }, [discount]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{isNew ? 'Add New Order/Introductory Discount' : 'Edit Order/Introductory Discount'}</h3>
          <div className="space-y-4">
            <div><label htmlFor="discountName" className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" id="discountName" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="e.g., New Customer Welcome Offer"/></div>
            <div><label htmlFor="discountDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea id="discountDescription" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={2} placeholder="e.g., 5% off first three orders"/></div>
            <div><label htmlFor="discountType" className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <select id="discountType" value={formData.discount_type || 'order_based'} onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as OrderBasedDiscount['discount_type'] })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="order_based">Standard Order-Based</option>
                <option value="introductory_percentage_first_n_orders">Introductory (First N Orders)</option>
              </select>
            </div>
            <div><label htmlFor="discountValue" className="block text-sm font-medium text-gray-700 mb-1">Discount Rate (decimal, e.g., 0.05 for 5%)</label><input type="number" id="discountValue" step="0.01" min="0" max="1" value={formData.value || ''} onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"/></div>
            <div><label htmlFor="maxOrders" className="block text-sm font-medium text-gray-700 mb-1">Maximum Orders</label><input type="number" id="maxOrders" min="1" value={formData.max_orders || ''} onChange={(e) => setFormData({ ...formData, max_orders: parseInt(e.target.value) || undefined })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" disabled={formData.discount_type !== 'introductory_percentage_first_n_orders' && formData.discount_type !== 'order_based'}/></div>
            <div className="flex items-center"><input type="checkbox" id="orderDiscountIsActive" checked={formData.is_active === undefined ? true : formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 text-blue-600 border-gray-300 rounded"/><label htmlFor="orderDiscountIsActive" className="ml-2 text-sm text-gray-900">Active</label></div>
            {formData.discount_type === 'order_based' && (<div className="bg-blue-50 p-3 rounded-md text-xs text-blue-700 mt-2">Note: Standard 'Order-Based' discounts might use legacy part numbers.</div>)}
            {formData.discount_type === 'introductory_percentage_first_n_orders' && (<div className="bg-green-50 p-3 rounded-md text-xs text-green-700 mt-2">Note: 'Introductory' discounts apply to a customer's first N orders.</div>)}
          </div>
          <div className="flex justify-end space-x-3 mt-6"><button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button><button onClick={() => onSave(formData, isNew)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">{isNew ? 'Add Discount' : 'Save Changes'}</button></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Discount Management</h2>
        <div className="flex space-x-3">
          <button onClick={() => { setSelectedDiscountType('date_based'); setShowAddModal(true);}} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">Add Date-Based Discount</button>
          <button onClick={() => { setSelectedDiscount(null); setSelectedDiscountType('order_based'); setShowAddModal(true);}} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">Add Order/Introductory Discount</button>
        </div>
      </div>

      <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-8">
        <button onClick={() => setActiveTab('date_based')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'date_based' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Date-Based Discounts ({dateBasedDiscounts.length})</button>
        <button onClick={() => setActiveTab('order_based')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'order_based' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Order/Introductory Discounts ({orderBasedDiscounts.length})</button>
      </nav></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow"><div className="flex items-center"><div className="p-2 bg-green-100 rounded-lg"><span className="text-2xl">💰</span></div><div className="ml-4"><p className="text-sm font-medium text-gray-600">Max {activeTab === 'date_based' ? 'Date-Based' : 'Order/Introductory'} Rate</p><p className="text-2xl font-bold text-gray-900">{getMaxDiscountRate(activeTab) ? formatDiscountPercentage(getMaxDiscountRate(activeTab)!) : 'N/A'}</p></div></div></div>
        <div className="bg-white p-6 rounded-lg shadow"><div className="flex items-center"><div className="p-2 bg-blue-100 rounded-lg"><span className="text-2xl">📊</span></div><div className="ml-4"><p className="text-sm font-medium text-gray-600">Total {activeTab === 'date_based' ? 'Date-Based' : 'Order/Introductory'}</p><p className="text-2xl font-bold text-gray-900">{activeTab === 'date_based' ? dateBasedDiscounts.length : orderBasedDiscounts.length}</p></div></div></div>
        <div className="bg-white p-6 rounded-lg shadow"><div className="flex items-center"><div className="p-2 bg-orange-100 rounded-lg"><span className="text-2xl">⚡</span></div><div className="ml-4"><p className="text-sm font-medium text-gray-600">{activeTab === 'date_based' ? 'Currently Active (Date)' : 'Active (Order/Intro.)'}</p><p className="text-2xl font-bold text-gray-900">{activeTab === 'date_based' ? dateBasedDiscounts.filter(d => isDiscountActive(d)).length : orderBasedDiscounts.filter(d => d.is_active !== false).length}</p></div></div></div>
      </div>

      {activeTab === 'date_based' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">Date-Based Discounts</h3></div>
          {loading ? <div className="p-6 text-center">Loading...</div> : dateBasedDiscounts.length === 0 ? <div className="p-6 text-center">No date-based discounts.</div> : (<div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="th">Rate</th><th className="th">Message</th><th className="th">Start</th><th className="th">End</th><th className="th">Status</th><th className="th">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{dateBasedDiscounts.map(d => (<tr key={d.id} className="hover:bg-gray-50"><td className="td">{formatDiscountPercentage(d.discount)}</td><td className="td max-w-xs truncate" title={d.message}>{d.message}</td><td className="td">{formatDate(d.start_date)}</td><td className="td">{formatDate(d.end_date)}</td><td className="td"><span className={`status ${d.is_active && isDiscountActive(d) ? 'status-active' : d.is_active ? 'status-enabled' : 'status-disabled'}`}>{d.is_active && isDiscountActive(d) ? 'Active Now' : d.is_active ? 'Enabled' : 'Disabled'}</span></td><td className="td space-x-2"><button onClick={() => {setSelectedDiscount(d); setSelectedDiscountType('date_based'); setShowEditModal(true);}} className="btn-text-blue">Edit</button><button onClick={() => handleToggleActive(d)} className="btn-text-orange">{d.is_active ? 'Disable' : 'Enable'}</button><button onClick={() => handleDeleteDateBasedDiscount(d.id)} className="btn-text-red">Delete</button></td></tr>))}</tbody></table></div>)}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">Order/Introductory Discounts</h3></div>
          {loading ? <div className="p-6 text-center">Loading...</div> : orderBasedDiscounts.length === 0 ? <div className="p-6 text-center">No order/introductory discounts.</div> : (<div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="th">Name</th><th className="th">Description</th><th className="th">Type</th><th className="th">Rate</th><th className="th">Max Orders</th><th className="th">Created</th><th className="th">Status</th><th className="th">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{orderBasedDiscounts.map(d => (<tr key={d.id} className="hover:bg-gray-50"><td className="td max-w-xs truncate" title={d.name}>{d.name || 'N/A'}</td><td className="td max-w-xs truncate" title={d.description}>{d.description || 'N/A'}</td><td className="td">{d.discount_type === 'introductory_percentage_first_n_orders' ? 'Introductory' : 'Order-Based'}</td><td className="td">{formatDiscountPercentage(d.value)}</td><td className="td">{d.max_orders || 'N/A'}</td><td className="td">{formatDate(d.created_at)}</td><td className="td"><span className={`status ${d.is_active !== false ? 'status-active' : 'status-disabled'}`}>{d.is_active !== false ? 'Active' : 'Disabled'}</span></td><td className="td space-x-2"><button onClick={() => {setSelectedDiscount(d); setSelectedDiscountType(d.discount_type as DiscountType); setShowEditModal(true);}} className="btn-text-blue">Edit</button><button onClick={() => handleToggleOrderBasedActive(d)} className="btn-text-orange">{d.is_active !== false ? 'Disable' : 'Enable'}</button><button onClick={() => handleDeleteOrderBasedDiscount(d.id)} className="btn-text-red">Delete</button></td></tr>))}</tbody></table></div>)}
        </div>
      )}

      {showAddModal && selectedDiscountType === 'date_based' && <DateBasedDiscountModal discount={null} isNew={true} onClose={() => setShowAddModal(false)} onSave={handleSaveDateBasedDiscount}/>}
      {showAddModal && (selectedDiscountType === 'order_based' || selectedDiscountType === 'introductory_percentage_first_n_orders') && <OrderBasedDiscountModal discount={null} isNew={true} onClose={() => setShowAddModal(false)} onSave={handleSaveOrderBasedDiscount}/>}
      {showEditModal && selectedDiscountType === 'date_based' && selectedDiscount && <DateBasedDiscountModal discount={selectedDiscount} isNew={false} onClose={() => setShowEditModal(false)} onSave={handleSaveDateBasedDiscount}/>}
      {showEditModal && (selectedDiscountType === 'order_based' || selectedDiscountType === 'introductory_percentage_first_n_orders') && selectedDiscount && <OrderBasedDiscountModal discount={selectedDiscount} isNew={false} onClose={() => setShowEditModal(false)} onSave={handleSaveOrderBasedDiscount}/>}
    </div>
  );
};

// Helper for table cell styling, can be moved to a CSS file or Tailwind plugin
const thStyles = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
const tdStyles = "px-6 py-4 whitespace-nowrap text-sm";

// Add this to your CSS or a style tag if not using Tailwind JIT, or integrate into Tailwind config
// .th { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
// .td { @apply px-6 py-4 whitespace-nowrap text-sm text-gray-600; }
// .status { @apply inline-flex px-2 py-1 text-xs font-semibold rounded-full; }
// .status-active { @apply bg-green-100 text-green-800; }
// .status-enabled { @apply bg-blue-100 text-blue-800; } // For enabled but not currently date-active
// .status-disabled { @apply bg-gray-100 text-gray-800; }
// .btn-text-blue { @apply text-blue-600 hover:text-blue-900; }
// .btn-text-orange { @apply text-orange-600 hover:text-orange-900; }
// .btn-text-red { @apply text-red-600 hover:text-red-900; }


export default DiscountManagementTab;
