import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { POHeader, POHeaderWithDetails } from '../types';
import { useAuth } from '../context/AuthContext';
import POEditorModal from '../components/POEditorModal';

const PurchaseOrdersPage: React.FC = () => {
  const { user, isStaffUser } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<POHeader[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<POHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<number | null>(null);

  // Search filters
  const [searchPONumber, setSearchPONumber] = useState('');
  const [searchVendor, setSearchVendor] = useState('');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');

  useEffect(() => {
    if (isStaffUser) {
      loadPurchaseOrders();
    }
  }, [isStaffUser]);

  useEffect(() => {
    filterOrders();
  }, [purchaseOrders, searchPONumber, searchVendor, searchStatus, searchDateFrom, searchDateTo]);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('po_headers')
        .select('*')
        .order('po_number', { ascending: false });

      if (fetchError) throw fetchError;

      setPurchaseOrders(data || []);
    } catch (err: any) {
      console.error('Error loading purchase orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...purchaseOrders];

    // Filter by PO number
    if (searchPONumber) {
      filtered = filtered.filter(po =>
        po.po_number?.toString().includes(searchPONumber)
      );
    }

    // Filter by vendor
    if (searchVendor) {
      filtered = filtered.filter(po =>
        po.vendor_id?.toLowerCase().includes(searchVendor.toLowerCase())
      );
    }

    // Filter by status
    if (searchStatus) {
      filtered = filtered.filter(po => po.po_status === searchStatus);
    }

    // Filter by date range
    if (searchDateFrom) {
      filtered = filtered.filter(po => {
        const poDate = new Date(po.po_date);
        return poDate >= new Date(searchDateFrom);
      });
    }

    if (searchDateTo) {
      filtered = filtered.filter(po => {
        const poDate = new Date(po.po_date);
        return poDate <= new Date(searchDateTo);
      });
    }

    setFilteredOrders(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const clearFilters = () => {
    setSearchPONumber('');
    setSearchVendor('');
    setSearchStatus('');
    setSearchDateFrom('');
    setSearchDateTo('');
  };

  if (!isStaffUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only staff members can access Purchase Orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
              <p className="text-gray-600 mt-1">Manage and track purchase orders with vendors</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
            >
              + Create New PO
            </button>
          </div>
        </div>

        {/* Search Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
              <input
                type="text"
                value={searchPONumber}
                onChange={(e) => setSearchPONumber(e.target.value)}
                placeholder="Search PO#"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
              <input
                type="text"
                value={searchVendor}
                onChange={(e) => setSearchVendor(e.target.value)}
                placeholder="Search vendor"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={searchDateFrom}
                onChange={(e) => setSearchDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={searchDateTo}
                onChange={(e) => setSearchDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {purchaseOrders.length} purchase orders
            </div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="text-gray-600">Loading purchase orders...</div>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-red-600 mb-4">Error: {error}</div>
              <button
                onClick={loadPurchaseOrders}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-600 mb-4">
                {purchaseOrders.length === 0
                  ? 'No purchase orders yet. Create your first PO!'
                  : 'No purchase orders match your search criteria.'
                }
              </div>
              {purchaseOrders.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordered By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grand Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((po) => (
                    <tr
                      key={po.po_number}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedPO(po.po_number || null)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{po.po_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(po.po_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {po.vendor_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {po.ordered_by}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(po.po_status)}`}>
                          {po.po_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(po.grand_total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPO(po.po_number || null);
                          }}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View/Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total POs</div>
            <div className="text-2xl font-bold text-gray-900">{purchaseOrders.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Open POs</div>
            <div className="text-2xl font-bold text-green-600">
              {purchaseOrders.filter(po => po.po_status === 'Open').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Pending POs</div>
            <div className="text-2xl font-bold text-yellow-600">
              {purchaseOrders.filter(po => po.po_status === 'Pending').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Value</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(purchaseOrders.reduce((sum, po) => sum + po.grand_total, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* PO Create/Edit Modal */}
      <POEditorModal
        isOpen={showCreateModal || selectedPO !== null}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedPO(null);
        }}
        poNumber={selectedPO}
        onSaved={() => {
          loadPurchaseOrders();
        }}
      />
    </div>
  );
};

export default PurchaseOrdersPage;
