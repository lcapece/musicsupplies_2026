import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface SystemStats {
  totalAccounts: number;
  totalProducts: number;
  totalOrders: number;
  recentLogins: number;
  topCategories: Array<{ category: string; count: number }>;
  recentOrders: Array<{
    id: number;
    accountnumber: number;
    invoicenumber: number;
    invoicedate: string;
    total: number;
  }>;
}

const SystemAnalyticsTab: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalAccounts: 0,
    totalProducts: 0,
    totalOrders: 0,
    recentLogins: 0,
    topCategories: [],
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);

      // Fetch total accounts
      const { count: accountCount } = await supabase
        .from('accounts_lcmd')
        .select('*', { count: 'exact', head: true });

      // Fetch total products
      const { count: productCount } = await supabase
        .from('lcmd_products')
        .select('*', { count: 'exact', head: true });

      // Fetch total orders
      const { count: orderCount } = await supabase
        .from('lcmd_ordhist')
        .select('*', { count: 'exact', head: true });

      // Fetch recent logins (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: recentLoginCount } = await supabase
        .from('logon_lcmd')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Fetch top categories
      const { data: categoryData } = await supabase
        .from('lcmd_products')
        .select('prdmetacat')
        .not('prdmetacat', 'is', null)
        .limit(1000);

      const categoryCounts: { [key: string]: number } = {};
      categoryData?.forEach(item => {
        if (item.prdmetacat) {
          categoryCounts[item.prdmetacat] = (categoryCounts[item.prdmetacat] || 0) + 1;
        }
      });

      const topCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      // Fetch recent orders
      const { data: recentOrdersData } = await supabase
        .from('lcmd_ordhist')
        .select('accountnumber, invoicenumber, invoicedate, unitnet')
        .order('linekey', { ascending: false })
        .limit(10);

      const recentOrders = recentOrdersData?.map((order, index) => ({
        id: index + 1,
        accountnumber: order.accountnumber,
        invoicenumber: order.invoicenumber,
        invoicedate: order.invoicedate || 'N/A',
        total: parseFloat(order.unitnet || '0')
      })) || [];

      setStats({
        totalAccounts: accountCount || 0,
        totalProducts: productCount || 0,
        totalOrders: orderCount || 0,
        recentLogins: recentLoginCount || 0,
        topCategories,
        recentOrders
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Analytics & Reports</h2>
        <button
          onClick={fetchSystemStats}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh Data
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">🔐</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Logins (7d)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentLogins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Product Categories</h3>
          <div className="space-y-3">
            {stats.topCategories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                  <span className="ml-2 text-sm text-gray-900">{category.category}</span>
                </div>
                <span className="text-sm font-bold text-blue-600">{category.count} products</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Account</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Invoice</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Date</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.recentOrders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td className="py-2 text-sm text-gray-900">{order.accountnumber}</td>
                    <td className="py-2 text-sm text-gray-900">{order.invoicenumber}</td>
                    <td className="py-2 text-sm text-gray-600">{order.invoicedate}</td>
                    <td className="py-2 text-sm text-gray-900 text-right">${order.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <div className="text-lg mb-2">📊</div>
            <div className="font-medium">Generate Sales Report</div>
            <div className="text-sm text-gray-600">Export detailed sales analytics</div>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <div className="text-lg mb-2">📧</div>
            <div className="font-medium">Send System Newsletter</div>
            <div className="text-sm text-gray-600">Notify all accounts of updates</div>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
            <div className="text-lg mb-2">🔧</div>
            <div className="font-medium">System Maintenance</div>
            <div className="text-sm text-gray-600">Database cleanup and optimization</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemAnalyticsTab;
