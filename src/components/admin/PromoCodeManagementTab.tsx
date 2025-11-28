import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Plus, Edit2, Trash2 } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  name: string;
  type: 'percent_off' | 'dollars_off';
  value: number;
  min_order_value: number;
  max_uses: number | null;
  uses_remaining: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  uses_per_account_tracking: boolean;
  max_uses_per_account: number | null;
  created_at: string;
  updated_at: string;
}

interface PromoCodeStats {
  promo_code: string;
  promo_name: string;
  total_uses: number;
  unique_accounts: number;
  total_discount_given: number;
  avg_order_value: number;
  max_uses_per_account: number | null;
  uses_remaining: number | null;
  is_single_use: boolean;
}

interface AccountUsage {
  account_number: string;
  times_used: number;
  first_used: string;
  last_used: string;
  total_discount: number;
}

const PromoCodeManagementTab: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoStats, setPromoStats] = useState<PromoCodeStats[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<string>('');
  const [accountUsage, setAccountUsage] = useState<AccountUsage[]>([]);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [testCode, setTestCode] = useState('');
  const [testAccount, setTestAccount] = useState('');
  const [testOrderValue, setTestOrderValue] = useState('100');
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'percent_off' as 'percent_off' | 'dollars_off',
    value: 0,
    min_order_value: 0,
    max_uses_per_account: '999' as string | number,
    start_date: '',
    end_date: '',
    is_active: true
  });

  useEffect(() => {
    fetchPromoCodes();
    fetchPromoStats();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
    }
  };

  const fetchPromoStats = async () => {
    try {
      // Skip stats for now since the function doesn't exist
      setPromoStats([]);
    } catch (error) {
      console.error('Error fetching promo stats:', error);
    }
  };

  const fetchAccountUsage = async (code: string) => {
    if (!code) return;
    
    try {
      const { data, error } = await supabase.rpc('get_promo_code_usage_by_accounts', {
        p_code: code
      });
      if (error) throw error;
      setAccountUsage(data || []);
    } catch (error) {
      console.error('Error fetching account usage:', error);
    }
  };

  const testPromoCode = async () => {
    if (!testCode || !testAccount || !testOrderValue) {
      setTestResult({ success: false, message: 'Please fill all test fields' });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_promo_code_validity', {
        p_code: testCode,
        p_account_number: testAccount,
        p_order_value: parseFloat(testOrderValue)
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      
      if (result.is_valid) {
        setTestResult({ 
          success: true, 
          message: `Valid! ${result.message}. Discount: $${result.discount_amount}` 
        });
      } else {
        setTestResult({ 
          success: false, 
          message: result.message || 'Invalid promo code' 
        });
      }
    } catch (error) {
      console.error('Error testing promo code:', error);
      setTestResult({ success: false, message: 'Error testing promo code' });
    }
  };

  const togglePromoCode = async (promo: PromoCode) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);

      if (error) throw error;
      
      fetchPromoCodes();
      fetchPromoStats();
    } catch (error) {
      console.error('Error toggling promo code:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getPromoTypeDisplay = (type: string, value: number) => {
    return type === 'percent_off' ? `${value}%` : `$${value}`;
  };

  const handleOpenAddModal = () => {
    setEditingPromo(null);
    setFormData({
      code: '',
      name: '',
      type: 'percent_off',
      value: 0,
      min_order_value: 0,
      max_uses_per_account: 999,
      start_date: '',
      end_date: '',
      is_active: true
    });
    setShowPromoModal(true);
  };

  const handleOpenEditModal = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      type: promo.type,
      value: promo.value,
      min_order_value: promo.min_order_value,
      max_uses_per_account: promo.max_uses_per_account ?? 999,
      start_date: promo.start_date ? promo.start_date.split('T')[0] : '',
      end_date: promo.end_date ? promo.end_date.split('T')[0] : '',
      is_active: promo.is_active
    });
    setShowPromoModal(true);
  };

  const handleSavePromoCode = async () => {
    try {
      
      // Ensure proper parsing of max_uses_per_account
      const maxUsesPerAccount = parseInt(String(formData.max_uses_per_account), 10);
      const isUnlimited = isNaN(maxUsesPerAccount) || maxUsesPerAccount >= 999;
      
      const updateData = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        type: formData.type,
        value: Number(formData.value),
        min_order_value: Number(formData.min_order_value),
        max_uses_per_account: isUnlimited ? null : maxUsesPerAccount,
        uses_per_account_tracking: !isUnlimited,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: formData.is_active
      };


      // Skip Supabase auth check since we use custom authentication

      if (editingPromo) {
        // Update existing promo code using admin RPC function to bypass RLS
        
        const { data, error } = await supabase.rpc('admin_update_promo_code', {
          p_promo_id: editingPromo.id,
          p_code: updateData.code,
          p_name: updateData.name,
          p_type: updateData.type,
          p_value: updateData.value,
          p_min_order_value: updateData.min_order_value,
          p_max_uses_per_account: updateData.max_uses_per_account,
          p_uses_per_account_tracking: updateData.uses_per_account_tracking,
          p_start_date: updateData.start_date ? new Date(updateData.start_date + 'T00:00:00Z').toISOString() : null,
          p_end_date: updateData.end_date ? new Date(updateData.end_date + 'T23:59:59Z').toISOString() : null,
          p_is_active: updateData.is_active
        });


        if (error) {
          throw new Error(`Admin update failed: ${error.message} (Code: ${error.code})`);
        }

        if (!data || data.length === 0) {
          throw new Error('Admin update failed - no data returned.');
        }

      } else {
        // Create new promo code
        const { data, error } = await supabase
          .from('promo_codes')
          .insert(updateData)
          .select();


        if (error) {
          console.error('SUPABASE INSERT ERROR:', error);
          throw new Error(`Database insert failed: ${error.message}`);
        }
      }

      alert('Promo code saved successfully!');
      setShowPromoModal(false);
      await fetchPromoCodes();
      await fetchPromoStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`CRITICAL ERROR - Promo code save failed: ${errorMessage}`);
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchPromoCodes();
      fetchPromoStats();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      alert('Error deleting promo code');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promo Code Management</h2>
          <p className="text-sm text-gray-600 mt-1">Monitor and manage promotional codes</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} className="mr-2" />
            Add New Promo Code
          </button>
          <button
            onClick={() => {
              fetchPromoCodes();
              fetchPromoStats();
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Promo Code Testing Tool */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Promo Code Validation</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
            <input
              type="text"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value.toUpperCase())}
              placeholder="SAVE10"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              value={testAccount}
              onChange={(e) => setTestAccount(e.target.value)}
              placeholder="123"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Value</label>
            <input
              type="number"
              value={testOrderValue}
              onChange={(e) => setTestOrderValue(e.target.value)}
              placeholder="100.00"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={testPromoCode}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Test Validation
            </button>
          </div>
        </div>
        {testResult && (
          <div className={`mt-4 p-3 rounded-md flex items-center ${
            testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {testResult.success ? <CheckCircle size={20} className="mr-2" /> : <XCircle size={20} className="mr-2" />}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique Accounts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Single Use?
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promoStats.map((stat) => (
                <tr key={stat.promo_code} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{stat.promo_code}</div>
                    <div className="text-sm text-gray-500">{stat.promo_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {promoCodes.find(p => p.code === stat.promo_code)?.type || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.total_uses}
                    {stat.uses_remaining !== null && (
                      <span className="text-gray-500"> ({stat.uses_remaining} left)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.unique_accounts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${stat.total_discount_given.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stat.is_single_use ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertCircle size={12} className="mr-1" />
                        Single Use
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedPromo(stat.promo_code);
                        fetchAccountUsage(stat.promo_code);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Usage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promo Code List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Promo Codes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Limits
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
              {promoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{promo.code}</div>
                    <div className="text-sm text-gray-500">{promo.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getPromoTypeDisplay(promo.type, promo.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${promo.min_order_value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(promo.start_date)} - {formatDate(promo.end_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {promo.uses_per_account_tracking && promo.max_uses_per_account === 1 ? (
                      <span className="text-red-600 font-medium">Single use only</span>
                    ) : promo.max_uses_per_account ? (
                      <span>{promo.max_uses_per_account} per account</span>
                    ) : (
                      <span className="text-gray-500">999 per account</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      promo.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(promo)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => togglePromoCode(promo)}
                        className={`${
                          promo.is_active 
                            ? 'text-orange-600 hover:text-orange-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        title={promo.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {promo.is_active ? '⏸️' : '▶️'}
                      </button>
                      <button
                        onClick={() => handleDeletePromoCode(promo.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Usage Modal */}
      {selectedPromo && accountUsage.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Account Usage for {selectedPromo}
            </h3>
            <button
              onClick={() => {
                setSelectedPromo('');
                setAccountUsage([]);
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <XCircle size={24} />
            </button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Times Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Discount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountUsage.map((usage) => (
                  <tr key={usage.account_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {usage.account_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usage.times_used}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(usage.first_used)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(usage.last_used)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${usage.total_discount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Promo Code Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPromo ? 'Edit Promo Code' : 'Add New Promo Code'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promo Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="SAVE10"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  disabled={!!editingPromo}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description/Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Save 10% on your order"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as 'percent_off' | 'dollars_off'})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="percent_off">Percent Off</option>
                    <option value="dollars_off">Fixed Amount Off</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value {formData.type === 'percent_off' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                    placeholder="10"
                    min="0"
                    step={formData.type === 'percent_off' ? '1' : '0.01'}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Order Value ($)
                </label>
                <input
                  type="number"
                  value={formData.min_order_value}
                  onChange={(e) => setFormData({...formData, min_order_value: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uses Per Account (999 = unlimited)
                </label>
                <input
                  type="text"
                  value={formData.max_uses_per_account}
                  onChange={(e) => setFormData({...formData, max_uses_per_account: e.target.value})}
                  placeholder="999"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active (Available for use immediately)
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowPromoModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePromoCode}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                {editingPromo ? 'Update' : 'Create'} Promo Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodeManagementTab;
