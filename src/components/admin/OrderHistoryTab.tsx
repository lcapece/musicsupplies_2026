import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface WebOrder {
  id: string;
  order_number: string;
  created_at: string;
  account_number?: string;
  order_comments?: string;
  order_items?: any[];
  subtotal: number;
  discount_amount?: number;
  grand_total: number;
  payment_method?: string;
  order_status: string;
  original_status?: string;
  status?: string;
  email?: string;
  phone?: string;
  promo_code_used?: string;
  customer_name?: string;
  invoice_sent?: boolean;
  backend_ivd?: string | null;
  has_backend_match?: boolean;
}

const OrderHistoryTab: React.FC = () => {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('Past 30 Days');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<WebOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [purgingOrder, setPurgingOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Automatically refresh orders when filters change
  useEffect(() => {
    const refreshWithFilters = async () => {
      await fetchOrders();
    };
    refreshWithFilters();
  }, [dateFilter, searchTerm]);

  const getDateRange = (filter: string) => {
    try {
      const now = new Date();
      
      // Validate that 'now' is a valid date
      if (isNaN(now.getTime())) {
        console.error('Invalid current date');
        return null;
      }
      
      let startDate: Date | null = null;
      
      switch (filter) {
        case 'Today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          break;
        case 'Past 7 Days':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
          break;
        case 'Past 30 Days':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
          break;
        case 'All History':
          startDate = null;
          break;
        default:
          console.warn('Unknown date filter:', filter);
          startDate = null;
          break;
      }
      
      // Validate the created date
      if (startDate && isNaN(startDate.getTime())) {
        console.error('Invalid date created for filter:', filter);
        return null;
      }
      
      return startDate;
    } catch (error) {
      console.error('Error in getDateRange:', error);
      return null;
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // First get the web orders
      let query = supabase
        .from('web_orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filter if set
      if (dateFilter !== 'All History') {
        const startDate = getDateRange(dateFilter);
        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setOrders([]);
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Get unique account numbers from orders
      const accountNumbers = [...new Set(ordersData.map(order => order.account_number))];
      
      // Get account information
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts_lcmd')
        .select('account_number, acct_name')
        .in('account_number', accountNumbers);

      if (accountsError) {
        console.warn('Error fetching account data:', accountsError);
      }

      // Create account lookup map
      const accountLookup = new Map();
      accountsData?.forEach(account => {
        accountLookup.set(account.account_number, account.acct_name);
      });

      // Get promo codes used for these orders
      const orderIds = ordersData.map(order => order.id);
      let promoLookup = new Map();
      
      if (orderIds.length > 0) {
        const { data: promoData, error: promoError } = await supabase
          .from('promo_code_usage')
          .select(`
            order_id,
            promo_codes(code)
          `)
          .in('order_id', orderIds);

        if (promoError) {
          console.warn('Error fetching promo codes:', promoError);
        } else {
          promoData?.forEach((item: any) => {
            if (item.promo_codes && typeof item.promo_codes === 'object' && 'code' in item.promo_codes) {
              promoLookup.set(item.order_id, item.promo_codes.code);
            }
          });
        }
      }

      // Get backend IVD and status values from v_legacy_order_info view
      const orderNumbers = ordersData.map(order => order.order_number);
      let backendLookup = new Map();
      
      if (orderNumbers.length > 0) {
        const { data: backendData, error: backendError } = await supabase
          .from('v_legacy_order_info')
          .select('invoice_number, status, web_order_number')
          .in('web_order_number', orderNumbers);

        if (backendError) {
          console.warn('Error fetching backend data from v_legacy_order_info:', backendError);
        } else {
          // Map the data by web_order_number
          backendData?.forEach((item: any) => {
            backendLookup.set(item.web_order_number, {
              backend: item.invoice_number,
              status: item.status
            });
          });
        }
      }

      // Process the orders and apply search filter
      let processedOrders = ordersData.map(order => {
        const backendInfo = backendLookup.get(order.order_number);
        const originalStatus = order.order_status;
        
        // Use backend status unless the current status is "Canceled"
        let finalStatus = originalStatus;
        if (originalStatus !== 'Canceled' && backendInfo?.status) {
          finalStatus = backendInfo.status;
        }
        
        return {
          ...order,
          customer_name: accountLookup.get(order.account_number) || 'Unknown',
          promo_code_used: promoLookup.get(order.id) || null,
          backend_ivd: backendInfo?.backend || null,
          original_status: originalStatus,
          order_status: finalStatus,
          has_backend_match: !!backendInfo
        };
      });

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        processedOrders = processedOrders.filter(order => 
          order.order_number.toString().toLowerCase().includes(searchLower) ||
          (order.customer_name && order.customer_name.toLowerCase().includes(searchLower)) ||
          (order.account_number && order.account_number.toString().toLowerCase().includes(searchLower))
        );
      }

      setOrders(processedOrders);
    } catch (err) {
      console.error('Error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // First get the web orders
      let query = supabase
        .from('web_orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filter if set
      if (dateFilter !== 'All History') {
        const startDate = getDateRange(dateFilter);
        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setOrders([]);
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Get unique account numbers from orders
      const accountNumbers = [...new Set(ordersData.map(order => order.account_number))];
      
      // Get account information
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts_lcmd')
        .select('account_number, acct_name')
        .in('account_number', accountNumbers);

      if (accountsError) {
        console.warn('Error fetching account data:', accountsError);
      }

      // Create account lookup map
      const accountLookup = new Map();
      accountsData?.forEach(account => {
        accountLookup.set(account.account_number, account.acct_name);
      });

      // Get promo codes used for these orders
      const orderIds = ordersData.map(order => order.id);
      let promoLookup = new Map();
      
      if (orderIds.length > 0) {
        const { data: promoData, error: promoError } = await supabase
          .from('promo_code_usage')
          .select(`
            order_id,
            promo_codes(code)
          `)
          .in('order_id', orderIds);

        if (promoError) {
          console.warn('Error fetching promo codes:', promoError);
        } else {
          promoData?.forEach((item: any) => {
            if (item.promo_codes && typeof item.promo_codes === 'object' && 'code' in item.promo_codes) {
              promoLookup.set(item.order_id, item.promo_codes.code);
            }
          });
        }
      }

      // Get backend IVD and status values from v_legacy_order_info view
      const orderNumbers = ordersData.map(order => order.order_number);
      let backendLookup = new Map();
      
      if (orderNumbers.length > 0) {
        const { data: backendData, error: backendError } = await supabase
          .from('v_legacy_order_info')
          .select('invoice_number, status, web_order_number')
          .in('web_order_number', orderNumbers);

        if (backendError) {
          console.warn('Error fetching backend data from v_legacy_order_info:', backendError);
        } else {
          // Map the data by web_order_number
          backendData?.forEach((item: any) => {
            backendLookup.set(item.web_order_number, {
              backend: item.invoice_number,
              status: item.status
            });
          });
        }
      }

      // Process the orders and apply search filter
      let processedOrders = ordersData.map(order => {
        const backendInfo = backendLookup.get(order.order_number);
        const originalStatus = order.order_status;
        
        // Use backend status unless the current status is "Canceled"
        let finalStatus = originalStatus;
        if (originalStatus !== 'Canceled' && backendInfo?.status) {
          finalStatus = backendInfo.status;
        }
        
        return {
          ...order,
          customer_name: accountLookup.get(order.account_number) || 'Unknown',
          promo_code_used: promoLookup.get(order.id) || null,
          backend_ivd: backendInfo?.backend || null,
          original_status: originalStatus,
          order_status: finalStatus,
          has_backend_match: !!backendInfo
        };
      });

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        processedOrders = processedOrders.filter(order => 
          order.order_number.toString().toLowerCase().includes(searchLower) ||
          (order.customer_name && order.customer_name.toLowerCase().includes(searchLower)) ||
          (order.account_number && order.account_number.toString().toLowerCase().includes(searchLower))
        );
      }

      setOrders(processedOrders);
    } catch (err) {
      console.error('Error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleViewDetails = (order: WebOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleCancelOrder = async (order: WebOrder) => {
    if (!confirm(`Are you sure you want to cancel order ${order.order_number}? This action cannot be undone.`)) {
      return;
    }

    setCancellingOrder(order.id);
    try {
      // Update order status to Canceled
      const { error: orderError } = await supabase
        .from('web_orders')
        .update({ order_status: 'Canceled' })
        .eq('id', order.id);

      if (orderError) {
        console.error('Error canceling order:', orderError);
        alert('Failed to cancel order. Please try again.');
        return;
      }

      // If promo code was used, roll it back to unused
      if (order.promo_code_used) {
        const { error: promoError } = await supabase
          .from('promo_codes')
          .update({ 
            used: false,
            used_by_account: null,
            used_at: null
          })
          .eq('code', order.promo_code_used);

        if (promoError) {
          console.error('Error rolling back promo code:', promoError);
          // Don't fail the entire operation, just log the error
        }
      }

      // Update the local state immediately to reflect the cancelled status
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === order.id 
            ? { ...o, order_status: 'Canceled' }
            : o
        )
      );

      // Also refresh the orders list from database to ensure consistency
      await fetchOrders();
      
      alert(`Order ${order.order_number} has been canceled successfully.`);
    } catch (error) {
      console.error('Error canceling order:', error);
      alert('Failed to cancel order. Please try again.');
      // Revert the optimistic update on error by refreshing from database
      fetchOrders();
    } finally {
      setCancellingOrder(null);
    }
  };

  const handlePurgeOrder = async (order: WebOrder) => {
    alert('Purging orders is no longer supported due to the need to maintain order number synchronization with the backend legacy system');
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'Not Shipped': 'bg-yellow-100 text-yellow-800',
      'Processing': 'bg-blue-100 text-blue-800',
      'Shipped': 'bg-green-100 text-green-800',
      'Canceled': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const OrderDetailsModal: React.FC<{ order: WebOrder; onClose: () => void }> = ({ order, onClose }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Order Details - {order.order_number}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Order Date</p>
              <p className="font-medium">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Method</p>
              <p className="font-medium">{order.payment_method === 'credit' ? 'Credit Card' : 'Net-10'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer Email</p>
              <p className="font-medium">{order.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer Phone</p>
              <p className="font-medium">{order.phone}</p>
            </div>
            {order.account_number && (
              <div>
                <p className="text-sm text-gray-600">Account Number</p>
                <p className="font-medium">{order.account_number}</p>
              </div>
            )}
            {order.promo_code_used && (
              <div>
                <p className="text-sm text-gray-600">Promo Code Used</p>
                <p className="font-medium">{order.promo_code_used}</p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h4 className="font-semibold mb-2">Order Items</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(order.order_items || []).map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm">{item.partnumber}</td>
                      <td className="px-4 py-2 text-sm">{item.description || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.price || 0)}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {formatCurrency((item.price || 0) * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount_amount && order.discount_amount > 0 && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold">
              <span>Total:</span>
              <span>{formatCurrency(order.grand_total)}</span>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Calculate summary statistics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.grand_total, 0);
  const totalDiscounts = orders.reduce((sum, order) => sum + (order.discount_amount || 0), 0);
  const creditOrders = orders.filter(o => o.payment_method === 'credit').length;
  const net10Orders = orders.filter(o => o.payment_method === 'net10').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Web Order History</h2>
          <p className="text-sm text-gray-600 mt-1">View and manage all web orders placed through the system</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Orders</div>
          <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
          <div className="text-xs text-gray-500 mt-1">
            {dateFilter ? `On ${dateFilter}` : 'All time'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Revenue</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-gray-500 mt-1">After discounts</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Discounts</div>
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalDiscounts)}</div>
          <div className="text-xs text-gray-500 mt-1">From promo codes</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Payment Methods</div>
          <div className="text-lg font-bold">
            <span className="text-blue-600">{creditOrders} Credit</span>
            <span className="mx-2">|</span>
            <span className="text-purple-600">{net10Orders} Net-10</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="Today">Today</option>
              <option value="Past 7 Days">Past 7 Days</option>
              <option value="Past 30 Days">Past 30 Days</option>
              <option value="All History">All History</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Orders</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Order #, email, or phone..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={() => {
                setDateFilter('Past 30 Days');
                setSearchTerm('');
                fetchOrders();
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Clear Filters
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Web Orders ({orders.length} found)
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading orders...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No orders found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1400px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" style={{ minWidth: '120px' }}>
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" style={{ minWidth: '100px' }}>
                    Backend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '180px' }}>
                    Date/Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '200px' }}>
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '100px' }}>
                    Promo Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '120px' }}>
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '100px' }}>
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '100px' }}>
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '120px' }}>
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '260px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className={`hover:bg-gray-50 ${!order.has_backend_match ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_number}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${!order.has_backend_match ? 'bg-red-100' : ''}`}>
                      {order.backend_ivd ? (
                        <span className="text-sm font-bold text-red-600">
                          {order.backend_ivd}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="font-medium">
                        {order.customer_name} ({order.account_number})
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.promo_code_used || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(order.order_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(order.grand_total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {order.discount_amount && order.discount_amount > 0 
                        ? formatCurrency(order.discount_amount)
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.payment_method === 'credit' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {order.payment_method === 'credit' ? 'Credit Card' : 'Net-10'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                      {order.order_status !== 'Canceled' && order.order_status !== 'Shipped' && (
                        <button
                          onClick={() => handleCancelOrder(order)}
                          disabled={cancellingOrder === order.id}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancellingOrder === order.id ? 'Canceling...' : 'Cancel Order'}
                        </button>
                      )}
                      {order.order_status === 'Canceled' && (
                        <button
                          onClick={() => handlePurgeOrder(order)}
                          disabled={purgingOrder === order.id}
                          className="text-red-800 hover:text-red-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                        >
                          {purgingOrder === order.id ? 'Purging...' : 'Purge Order'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default OrderHistoryTab;
