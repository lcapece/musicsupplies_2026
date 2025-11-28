import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface WebOrder {
  id: number;
  order_number: string;
  account_number: number;
  created_at: string;
  subtotal: string;
  status: string;
  original_status: string; // Keep original status from web_orders
  customer_name: string;
  promo_code: string | null;
  discount_amount: string;
  backend_ivd: string | null;
}

type SortField = 'order_number' | 'customer_name' | 'created_at' | 'status' | 'subtotal' | 'backend_ivd';
type SortDirection = 'asc' | 'desc';

const WebOrdersDisplay: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchWebOrders();
  }, [user]);

  const fetchWebOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Query to get web orders with account names
      const { data, error: fetchError } = await supabase
        .from('web_orders')
        .select(`
          id,
          order_number,
          account_number,
          created_at,
          subtotal,
          status,
          discount_amount,
          accounts_lcmd!inner(acct_name)
        `)
        .eq('account_number', parseInt(user.accountNumber))
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      // Get promo codes used for these orders
      const orderIds = data?.map(order => order.id) || [];
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

      // Get backend invoice_number and status values from v_legacy_order_info view
      const orderNumbers = data?.map(order => order.order_number) || [];
      const backendLookup = new Map<string, { ivd: string; status: string }>();
      
      if (orderNumbers.length > 0) {
        const { data: backendData, error: backendError } = await supabase
          .from('v_legacy_order_info')
          .select('invoice_number, status, web_order_number')
          .in('web_order_number', orderNumbers);

        if (backendError) {
          console.warn('Error fetching backend data from v_legacy_order_info:', backendError);
        } else {
          // Group by web_order_number and take the first IVD and status value (using distinct logic)
          backendData?.forEach((item: any) => {
            if (!backendLookup.has(item.web_order_number)) {
              backendLookup.set(item.web_order_number, {
                ivd: item.invoice_number,
                status: item.status
              });
            }
          });
        }
      }

      // Process the data to extract customer name from the joined table
      const processedOrders: WebOrder[] = data?.map(order => {
        const backendInfo = backendLookup.get(order.order_number);
        const originalStatus = order.status;

        const finalStatus = backendInfo?.status ?? originalStatus;

        return {
          ...order,
          customer_name: (order as any).accounts_lcmd?.acct_name || 'Unknown',
          promo_code: promoLookup.get(order.id) || null,
          discount_amount: order.discount_amount || '0',
          backend_ivd: backendInfo?.ivd || null,
          original_status: originalStatus,
          status: finalStatus
        };
      }) || [];

      setOrders(processedOrders);
    } catch (err) {
      console.error('Error fetching web orders:', err);
      setError('Failed to load web orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle null values
    if (aValue === null) return sortDirection === 'asc' ? 1 : -1;
    if (bValue === null) return sortDirection === 'asc' ? -1 : 1;

    // Handle different data types
    if (sortField === 'subtotal') {
      aValue = parseFloat(aValue);
      bValue = parseFloat(bValue);
    } else if (sortField === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading web orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchWebOrders}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Web Orders</h2>
          <p className="text-sm text-gray-600 mt-1">
            View your recent web orders and their status
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Web Orders Found</h3>
            <p className="text-gray-600">
              You don't have any web orders yet, or the web orders system is still being configured.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('order_number')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Order Number</span>
                      <SortIcon field="order_number" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('backend_ivd')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Backend</span>
                      <SortIcon field="backend_ivd" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('customer_name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Customer</span>
                      <SortIcon field="customer_name" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Promo Code
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date/Time</span>
                      <SortIcon field="created_at" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      <SortIcon field="status" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('subtotal')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Total</span>
                      <SortIcon field="subtotal" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.backend_ivd ? (
                        <span className="text-sm font-bold text-red-600">
                          {order.backend_ivd}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customer_name} ({order.account_number})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.promo_code ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                          {order.promo_code}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'Shipped' || order.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'Processing'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'Not Shipped' || order.status === 'Pending Confirmation'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.status === 'Canceled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                      ${parseFloat(order.subtotal).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                      {order.discount_amount && parseFloat(order.discount_amount) > 0 ? (
                        <span className="text-green-600">
                          ${parseFloat(order.discount_amount).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebOrdersDisplay;
