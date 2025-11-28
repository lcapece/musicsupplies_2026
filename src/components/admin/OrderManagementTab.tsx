import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Order {
  linekey: number;
  accountnumber: number;
  invoicenumber: number;
  dstamp: string;
  invoicedate: string;
  payments: string;
  salesman: string;
  terms: string;
  model: string;
  Description: string;
  Qty: string;
  unitnet: string;
  ups: string;
}

interface OrderSearchFilters {
  accountNumber: string;
  invoiceNumber: string;
  dateFrom: string;
  dateTo: string;
  salesman: string;
}

const OrderManagementTab: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<OrderSearchFilters>({
    accountNumber: '',
    invoiceNumber: '',
    dateFrom: '',
    dateTo: '',
    salesman: ''
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (searchFilters?: OrderSearchFilters) => {
    try {
      setLoading(true);
      let query = supabase
        .from('lcmd_ordhist')
        .select('*')
        .order('linekey', { ascending: false })
        .limit(100);

      const currentFilters = searchFilters || filters;

      if (currentFilters.accountNumber) {
        query = query.eq('accountnumber', parseInt(currentFilters.accountNumber));
      }
      if (currentFilters.invoiceNumber) {
        query = query.eq('invoicenumber', parseInt(currentFilters.invoiceNumber));
      }
      if (currentFilters.salesman) {
        query = query.ilike('salesman', `%${currentFilters.salesman}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchOrders(filters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      accountNumber: '',
      invoiceNumber: '',
      dateFrom: '',
      dateTo: '',
      salesman: ''
    };
    setFilters(emptyFilters);
    fetchOrders(emptyFilters);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleDeleteOrder = async (linekey: number) => {
    if (window.confirm('Are you sure you want to delete this order line?')) {
      try {
        const { error } = await supabase
          .from('lcmd_ordhist')
          .delete()
          .eq('linekey', linekey);

        if (error) {
          console.error('Error deleting order:', error);
          alert('Error deleting order');
          return;
        }

        fetchOrders();
        alert('Order line deleted successfully');
      } catch (error) {
        console.error('Error:', error);
        alert('Error deleting order');
      }
    }
  };

  const calculateOrderTotal = (orders: Order[], invoiceNumber: number) => {
    return orders
      .filter(order => order.invoicenumber === invoiceNumber)
      .reduce((total, order) => {
        const qty = parseFloat(order.Qty || '0');
        const unitnet = parseFloat(order.unitnet || '0');
        return total + (qty * unitnet);
      }, 0);
  };

  // Group orders by invoice number for summary view
  const orderSummaries = orders.reduce((acc, order) => {
    const invoiceNumber = order.invoicenumber;
    if (!acc[invoiceNumber]) {
      acc[invoiceNumber] = {
        invoiceNumber,
        accountNumber: order.accountnumber,
        invoiceDate: order.invoicedate,
        salesman: order.salesman,
        terms: order.terms,
        lineCount: 0,
        total: 0
      };
    }
    acc[invoiceNumber].lineCount++;
    const qty = parseFloat(order.Qty || '0');
    const unitnet = parseFloat(order.unitnet || '0');
    acc[invoiceNumber].total += qty * unitnet;
    return acc;
  }, {} as any);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
        <div className="text-sm text-gray-500">
          Showing {orders.length} order lines
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter Orders</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Account Number"
            value={filters.accountNumber}
            onChange={(e) => setFilters({ ...filters, accountNumber: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Invoice Number"
            value={filters.invoiceNumber}
            onChange={(e) => setFilters({ ...filters, invoiceNumber: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Salesman"
            value={filters.salesman}
            onChange={(e) => setFilters({ ...filters, salesman: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Search
          </button>
          <button
            onClick={handleClearFilters}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Order Summary Cards */}
      {Object.values(orderSummaries).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(orderSummaries).slice(0, 6).map((summary: any) => (
              <div key={summary.invoiceNumber} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-gray-900">
                    Invoice #{summary.invoiceNumber}
                  </div>
                  <div className="text-xs text-gray-500">
                    {summary.lineCount} lines
                  </div>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  Account: {summary.accountNumber}
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  Date: {summary.invoiceDate}
                </div>
                <div className="text-sm font-bold text-green-600">
                  Total: ${summary.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => {
                  const qty = parseFloat(order.Qty || '0');
                  const unitPrice = parseFloat(order.unitnet || '0');
                  const total = qty * unitPrice;
                  
                  return (
                    <tr key={order.linekey} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.accountnumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.invoicenumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.invoicedate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.model}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {order.Description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.Qty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${unitPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.linekey)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Order Line</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="text"
                  value={selectedOrder.Qty}
                  onChange={(e) => setSelectedOrder({ ...selectedOrder, Qty: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                <input
                  type="text"
                  value={selectedOrder.unitnet}
                  onChange={(e) => setSelectedOrder({ ...selectedOrder, unitnet: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={selectedOrder.Description}
                  onChange={(e) => setSelectedOrder({ ...selectedOrder, Description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('lcmd_ordhist')
                      .update({
                        Qty: selectedOrder.Qty,
                        unitnet: selectedOrder.unitnet,
                        Description: selectedOrder.Description
                      })
                      .eq('linekey', selectedOrder.linekey);

                    if (error) {
                      console.error('Error updating order:', error);
                      alert('Error updating order');
                      return;
                    }

                    setShowEditModal(false);
                    fetchOrders();
                    alert('Order updated successfully');
                  } catch (error) {
                    console.error('Error:', error);
                    alert('Error updating order');
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagementTab;
