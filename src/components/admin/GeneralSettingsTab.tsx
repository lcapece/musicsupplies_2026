import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { applyPasswordRulesMigration, applyTreeViewMigration } from '../../utils/applyMigration';

interface SmsNotificationSetting {
  id: number;
  event_name: string;
  event_description: string;
  is_enabled: boolean;
  notification_phone: string;
  created_at: string;
  updated_at: string;
}

interface Discount {
  id: number;
  discount: number;
  message: string;
  start_date: string;
  end_date: string;
  created_at: string;
  is_active: boolean;
}

const GeneralSettingsTab: React.FC = () => {
  const [smsSettings, setSmsSettings] = useState<SmsNotificationSetting[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [maxDiscount, setMaxDiscount] = useState<number | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchDiscounts();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sms_notification_settings')
        .select('*')
        .order('event_name', { ascending: true });

      if (error) {
        console.error('Error fetching SMS settings:', error);
        return;
      }

      setSmsSettings(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

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

      // Calculate max discount
      const validDiscounts = (data || []).map(d => d.discount).filter(d => typeof d === 'number' && d > 0);
      if (validDiscounts.length > 0) {
        setMaxDiscount(Math.max(...validDiscounts));
      } else {
        setMaxDiscount(null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (id: number, updates: Partial<SmsNotificationSetting>) => {
    try {
      setSaving(prev => [...prev, id]);
      
      const { error } = await supabase
        .from('sms_notification_settings')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating SMS setting:', error);
        alert('Error updating SMS notification setting');
        return;
      }

      await fetchSettings();
      alert('SMS notification setting updated successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating SMS notification setting');
    } finally {
      setSaving(prev => prev.filter(settingId => settingId !== id));
    }
  };

  const handleSendTestSMS = async (setting: SmsNotificationSetting) => {
    if (!setting.notification_phone) {
      alert('No phone number configured for this event');
      return;
    }

    try {
      const testMessage = `Test SMS for "${setting.event_description}" event from MusicSupplies.com admin panel.`;
      
      const { data, error } = await supabase.functions.invoke('send-test-sms', {
        body: {
          accountNumber: 'ADMIN',
          accountName: 'System Test',
          smsNumber: setting.notification_phone,
          message: testMessage
        }
      });

      if (error) {
        console.error('Error sending test SMS:', error);
        alert('Failed to send test SMS');
        return;
      }

      alert('Test SMS sent successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error sending test SMS');
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

  const handleDeleteDiscount = async (id: number) => {
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
      message: '',
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
                value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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

  const isDiscountActive = (discount: Discount) => {
    if (!discount.is_active) return false;
    const now = new Date();
    const startDate = new Date(discount.start_date);
    const endDate = new Date(discount.end_date);
    return now >= startDate && now <= endDate;
  };

  // Database migration handlers
  const [migrationLoading, setMigrationLoading] = useState<{
    passwordRules: boolean;
    treeView: boolean;
  }>({
    passwordRules: false,
    treeView: false
  });
  
  const [migrationResults, setMigrationResults] = useState<{
    passwordRules: {success: boolean; message: string} | null;
    treeView: {success: boolean; message: string} | null;
  }>({
    passwordRules: null,
    treeView: null
  });

  const handleApplyPasswordRulesMigration = async () => {
    try {
      setMigrationLoading(prev => ({ ...prev, passwordRules: true }));
      const result = await applyPasswordRulesMigration();
      setMigrationResults(prev => ({ ...prev, passwordRules: result }));
    } catch (error) {
      console.error('Error applying password rules migration:', error);
      setMigrationResults(prev => ({ 
        ...prev, 
        passwordRules: { 
          success: false, 
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        } 
      }));
    } finally {
      setMigrationLoading(prev => ({ ...prev, passwordRules: false }));
    }
  };

  const handleApplyTreeViewMigration = async () => {
    try {
      setMigrationLoading(prev => ({ ...prev, treeView: true }));
      const result = await applyTreeViewMigration();
      setMigrationResults(prev => ({ ...prev, treeView: result }));
    } catch (error) {
      console.error('Error applying tree view migration:', error);
      setMigrationResults(prev => ({ 
        ...prev, 
        treeView: { 
          success: false, 
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        } 
      }));
    } finally {
      setMigrationLoading(prev => ({ ...prev, treeView: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Configure system-wide settings including SMS notifications and discount rates</p>
        </div>
        <button
          onClick={() => {
            fetchSettings();
            fetchDiscounts();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh All
        </button>
      </div>

      {/* Discount Management Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Discount Management</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Add Discount
          </button>
        </div>

        {/* Discount Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-xl">💰</span>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Maximum Discount Rate</p>
                <p className="text-lg font-bold text-gray-900">
                  {maxDiscount ? formatDiscountPercentage(maxDiscount) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-xl">📊</span>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total Discounts</p>
                <p className="text-lg font-bold text-gray-900">{discounts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-xl">⚡</span>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Active Discounts</p>
                <p className="text-lg font-bold text-gray-900">
                  {discounts.filter(d => isDiscountActive(d)).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Discounts Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading discounts...</div>
          </div>
        ) : discounts.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No discounts found</div>
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
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
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
                      {discount.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(discount.start_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(discount.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          discount.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {discount.is_active ? 'Enabled' : 'Disabled'}
                        </span>
                        {isDiscountActive(discount) && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Currently Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => {
                            setSelectedDiscount(discount);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 text-left"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(discount)}
                          className="text-orange-600 hover:text-orange-900 text-left"
                        >
                          {discount.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteDiscount(discount.id)}
                          className="text-red-600 hover:text-red-900 text-left"
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

      {/* SMS Notification Settings Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">SMS Notification Settings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure which events trigger SMS notifications and where they are sent
          </p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading notification settings...</div>
          </div>
        ) : smsSettings.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No notification settings found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enabled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notification Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {smsSettings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {setting.event_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {setting.event_description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={setting.is_enabled}
                          onChange={(e) => handleUpdateSetting(setting.id, { is_enabled: e.target.checked })}
                          disabled={saving.includes(setting.id)}
                          className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                        />
                        <span className={`ml-2 text-sm ${setting.is_enabled ? 'text-green-600' : 'text-red-600'}`}>
                          {setting.is_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="tel"
                        value={setting.notification_phone}
                        onChange={(e) => handleUpdateSetting(setting.id, { notification_phone: e.target.value })}
                        disabled={saving.includes(setting.id)}
                        className="text-sm text-gray-600 font-mono border border-gray-300 rounded px-2 py-1 w-32"
                        placeholder="+1234567890"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSendTestSMS(setting)}
                          disabled={!setting.notification_phone || saving.includes(setting.id)}
                          className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                        >
                          Test SMS
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

      {/* Database Migrations Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Database Migrations</h3>
          <p className="text-sm text-gray-600 mt-1">
            Apply system-wide database updates and fixes
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Password Rules Migration */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-md font-medium text-gray-900">Password Authentication Rules Update</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Apply the latest password authentication rules update that removes special case handling for certain accounts.
                  This allows all accounts to authenticate using the standard password mechanism.
                </p>
                
                {migrationResults.passwordRules && (
                  <div className={`mt-3 p-3 rounded-md ${
                    migrationResults.passwordRules.success 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-red-50 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">
                      {migrationResults.passwordRules.message}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={handleApplyPasswordRulesMigration}
                disabled={migrationLoading.passwordRules}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  migrationLoading.passwordRules
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {migrationLoading.passwordRules ? 'Applying...' : 'Apply Migration'}
              </button>
            </div>
          </div>
          
          {/* Tree View Migration */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-md font-medium text-gray-900">Category Tree View Refresh</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Refresh the category tree view data from the database. Use this if the category tree
                  is not displaying correctly or after making changes to product categories.
                </p>
                
                {migrationResults.treeView && (
                  <div className={`mt-3 p-3 rounded-md ${
                    migrationResults.treeView.success 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-red-50 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">
                      {migrationResults.treeView.message}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={handleApplyTreeViewMigration}
                disabled={migrationLoading.treeView}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  migrationLoading.treeView
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {migrationLoading.treeView ? 'Refreshing...' : 'Refresh Tree View'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">General Settings Instructions</h4>
        <div className="text-sm text-blue-800 space-y-2">
          <div>
            <strong>Discount Management:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Set discount rates as decimals (e.g., 0.05 for 5%)</li>
              <li>• Configure start and end dates for promotional periods</li>
              <li>• Add promotional messages that customers will see</li>
              <li>• Enable/disable discounts without deleting them</li>
            </ul>
          </div>
          <div className="mt-3">
            <strong>SMS Notifications:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Enable SMS alerts for specific system events</li>
              <li>• Enter phone numbers with country code (e.g., +1234567890)</li>
              <li>• Test SMS functionality before enabling notifications</li>
              <li>• Receive alerts for new orders and account applications</li>
            </ul>
          </div>
        </div>
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

export default GeneralSettingsTab;
