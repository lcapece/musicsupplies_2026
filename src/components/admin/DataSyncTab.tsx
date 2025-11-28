import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface DirtyAccount {
  account_number: number;
  acct_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email?: string;
  is_dirty: boolean;
  updated_at?: string;
}

const DataSyncTab: React.FC = () => {
  const [dirtyAccounts, setDirtyAccounts] = useState<DirtyAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<number[]>([]);

  useEffect(() => {
    fetchDirtyAccounts();
  }, []);

  const fetchDirtyAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts_lcmd')
        .select('*')
        .eq('is_dirty', true)
        .order('account_number', { ascending: true });

      if (error) {
        console.error('Error fetching dirty accounts:', error);
        return;
      }

      setDirtyAccounts(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSynced = async (accountNumber: number) => {
    try {
      setSyncing(prev => [...prev, accountNumber]);
      
      const { error } = await supabase
        .from('accounts_lcmd')
        .update({ is_dirty: false })
        .eq('account_number', accountNumber);

      if (error) {
        console.error('Error marking account as synced:', error);
        alert('Error updating account status');
        return;
      }

      // Refresh the list
      await fetchDirtyAccounts();
      alert('Account marked as synced successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating account status');
    } finally {
      setSyncing(prev => prev.filter(id => id !== accountNumber));
    }
  };

  const handleBulkMarkSynced = async () => {
    if (dirtyAccounts.length === 0) return;
    
    if (!window.confirm(`Mark all ${dirtyAccounts.length} accounts as synced?`)) return;

    try {
      setLoading(true);
      
      const accountNumbers = dirtyAccounts.map(acc => acc.account_number);
      
      const { error } = await supabase
        .from('accounts_lcmd')
        .update({ is_dirty: false })
        .in('account_number', accountNumbers);

      if (error) {
        console.error('Error bulk updating accounts:', error);
        alert('Error updating accounts');
        return;
      }

      await fetchDirtyAccounts();
      alert('All accounts marked as synced successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating accounts');
    } finally {
      setLoading(false);
    }
  };

  const exportDirtyAccounts = () => {
    if (dirtyAccounts.length === 0) {
      alert('No accounts to export');
      return;
    }

    // Create CSV content
    const headers = ['Account Number', 'Company Name', 'Address', 'City', 'State', 'ZIP', 'Phone', 'Email'];
    const csvContent = [
      headers.join(','),
      ...dirtyAccounts.map(account => [
        account.account_number,
        `"${account.acct_name || ''}"`,
        `"${account.address || ''}"`,
        `"${account.city || ''}"`,
        account.state || '',
        account.zip || '',
        account.phone || '',
        account.email || ''
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dirty_accounts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Warehouse Sync</h2>
          <p className="text-sm text-gray-600 mt-1">
            Accounts that have been modified and need to be synchronized with the legacy data warehouse
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchDirtyAccounts}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Refresh
          </button>
          <button
            onClick={exportDirtyAccounts}
            disabled={dirtyAccounts.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:bg-gray-300"
          >
            Export CSV
          </button>
          <button
            onClick={handleBulkMarkSynced}
            disabled={dirtyAccounts.length === 0 || loading}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:bg-gray-300"
          >
            Mark All Synced
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Accounts Pending Sync</div>
          <div className="text-2xl font-bold text-orange-600">{dirtyAccounts.length}</div>
          <div className="text-xs text-gray-500 mt-1">Need data warehouse update</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Currently Syncing</div>
          <div className="text-2xl font-bold text-blue-600">{syncing.length}</div>
          <div className="text-xs text-gray-500 mt-1">In progress</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Export Available</div>
          <div className="text-2xl font-bold text-green-600">
            {dirtyAccounts.length > 0 ? 'Yes' : 'No'}
          </div>
          <div className="text-xs text-gray-500 mt-1">CSV export ready</div>
        </div>
      </div>

      {/* Dirty Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Modified Accounts ({dirtyAccounts.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Accounts that have been modified by customers and need to be synced to the legacy system
          </p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading modified accounts...</div>
          </div>
        ) : dirtyAccounts.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-gray-600 mb-2">✅ All accounts are synchronized</div>
              <div className="text-sm text-gray-500">No accounts require data warehouse updates</div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dirtyAccounts.map((account) => (
                  <tr key={account.account_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.account_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {account.acct_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {account.address}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {account.city}, {account.state} {account.zip}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>
                        <div>{account.phone || 'N/A'}</div>
                        {account.email && (
                          <div className="text-xs text-gray-500">{account.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(account.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleMarkSynced(account.account_number)}
                        disabled={syncing.includes(account.account_number)}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                      >
                        {syncing.includes(account.account_number) ? 'Syncing...' : 'Mark Synced'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Data Warehouse Sync Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Accounts marked as "dirty" have been modified by customers through the self-service portal</li>
          <li>• Export the CSV file to get a list of modified accounts for your ETL process</li>
          <li>• After successfully updating your legacy data warehouse, mark accounts as "synced"</li>
          <li>• Use "Mark All Synced" only after confirming all accounts have been processed</li>
          <li>• The system automatically sets accounts to dirty when customers make changes</li>
        </ul>
      </div>
    </div>
  );
};

export default DataSyncTab;
