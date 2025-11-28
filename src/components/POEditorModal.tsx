import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { POHeader, PODetail, ProductLCMD, POStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface POEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  poNumber?: number | null;
  onSaved?: () => void;
}

const POEditorModal: React.FC<POEditorModalProps> = ({ isOpen, onClose, poNumber, onSaved }) => {
  const { staffUsername } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PO Header fields
  const [vendorId, setVendorId] = useState('');
  const [vendorOrderNumber, setVendorOrderNumber] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [shipper, setShipper] = useState('');
  const [poStatus, setPoStatus] = useState<POStatus>('Open');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [freight, setFreight] = useState(0);
  const [taxesDuties, setTaxesDuties] = useState(0);
  const [otherFees, setOtherFees] = useState(0);
  const [lastEmailedTo, setLastEmailedTo] = useState('');

  // PO Details (line items)
  const [lineItems, setLineItems] = useState<PODetail[]>([]);
  const [nextLineNumber, setNextLineNumber] = useState(1);

  // Product search
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductLCMD[]>([]);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && poNumber) {
      loadPurchaseOrder();
    } else if (isOpen && !poNumber) {
      resetForm();
    }
  }, [isOpen, poNumber]);

  const resetForm = () => {
    setVendorId('');
    setVendorOrderNumber('');
    setPoDate(new Date().toISOString().split('T')[0]);
    setExpectedDate('');
    setShipper('');
    setPoStatus('Open');
    setSpecialInstructions('');
    setFreight(0);
    setTaxesDuties(0);
    setOtherFees(0);
    setLastEmailedTo('');
    setLineItems([]);
    setNextLineNumber(1);
    setError(null);
  };

  const loadPurchaseOrder = async () => {
    if (!poNumber) return;

    try {
      setLoading(true);
      setError(null);

      // Load header
      const { data: header, error: headerError } = await supabase
        .from('po_headers')
        .select('*')
        .eq('po_number', poNumber)
        .single();

      if (headerError) throw headerError;

      // Load details
      const { data: details, error: detailsError } = await supabase
        .from('po_details')
        .select('*')
        .eq('po_number', poNumber)
        .order('line_number', { ascending: true });

      if (detailsError) throw detailsError;

      // Populate form
      setVendorId(header.vendor_id);
      setVendorOrderNumber(header.vendor_order_number || '');
      setPoDate(header.po_date.split('T')[0]);
      setExpectedDate(header.expected_date ? header.expected_date.split('T')[0] : '');
      setShipper(header.shipper || '');
      setPoStatus(header.po_status);
      setSpecialInstructions(header.special_instructions || '');
      setFreight(header.freight);
      setTaxesDuties(header.taxes_duties);
      setOtherFees(header.other_fees);
      setLastEmailedTo(header.last_emailed_to || '');
      setLineItems(details || []);
      setNextLineNumber((details?.length || 0) + 1);

    } catch (err: any) {
      console.error('Error loading PO:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('product_lcmd')
        .select('*')
        .or(`part_number.ilike.%${query}%,description.ilike.%${query}%,vendor_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (err: any) {
      console.error('Error searching products:', err);
    }
  };

  const addLineItem = (product?: ProductLCMD) => {
    const newLine: PODetail = {
      po_number: poNumber || 0,
      line_number: nextLineNumber,
      lcmd_part_number: product?.part_number || '',
      vendor: product?.vendor_name || vendorId,
      description: product?.description || '',
      qty_ordered: 1,
      qty_current: product?.current_inventory || 0,
      min_qty: product?.min_qty || 0,
      max_inventory: product?.max_qty || 0,
      unit_cost: product?.unit_cost || 0,
      extended_amount: product?.unit_cost || 0,
      qty_received: 0
    };

    setLineItems([...lineItems, newLine]);
    setNextLineNumber(nextLineNumber + 1);
    setShowProductSearch(false);
    setProductSearchQuery('');
    setSearchResults([]);
  };

  const updateLineItem = (index: number, field: keyof PODetail, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate extended amount
    if (field === 'qty_ordered' || field === 'unit_cost') {
      updated[index].extended_amount = updated[index].qty_ordered * updated[index].unit_cost;
    }

    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.extended_amount || 0), 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + freight + taxesDuties + otherFees;
  };

  const savePurchaseOrder = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validation
      if (!vendorId.trim()) {
        throw new Error('Vendor ID is required');
      }

      if (lineItems.length === 0) {
        throw new Error('At least one line item is required');
      }

      const headerData: any = {
        vendor_id: vendorId,
        vendor_order_number: vendorOrderNumber || null,
        po_date: poDate,
        expected_date: expectedDate || null,
        shipper: shipper || null,
        ordered_by: staffUsername || 'Unknown',
        po_status: poStatus,
        special_instructions: specialInstructions || null,
        po_subtotal: calculateSubtotal(),
        freight: freight,
        taxes_duties: taxesDuties,
        other_fees: otherFees,
        grand_total: calculateGrandTotal(),
        last_emailed_to: lastEmailedTo || null
      };

      let savedPONumber = poNumber;

      if (poNumber) {
        // Update existing PO
        const { error: updateError } = await supabase
          .from('po_headers')
          .update(headerData)
          .eq('po_number', poNumber);

        if (updateError) throw updateError;

        // Delete old line items
        const { error: deleteError } = await supabase
          .from('po_details')
          .delete()
          .eq('po_number', poNumber);

        if (deleteError) throw deleteError;

      } else {
        // Create new PO
        const { data: newPO, error: insertError } = await supabase
          .from('po_headers')
          .insert([headerData])
          .select()
          .single();

        if (insertError) throw insertError;

        savedPONumber = newPO.po_number;
      }

      // Insert line items
      const detailsData = lineItems.map(item => ({
        po_number: savedPONumber,
        line_number: item.line_number,
        lcmd_part_number: item.lcmd_part_number || null,
        vendor: item.vendor || null,
        description: item.description,
        qty_ordered: item.qty_ordered,
        qty_current: item.qty_current,
        min_qty: item.min_qty,
        max_inventory: item.max_inventory,
        unit_cost: item.unit_cost,
        extended_amount: item.extended_amount,
        qty_received: item.qty_received
      }));

      const { error: detailsError } = await supabase
        .from('po_details')
        .insert(detailsData);

      if (detailsError) throw detailsError;

      // Success!
      if (onSaved) onSaved();
      onClose();

    } catch (err: any) {
      console.error('Error saving PO:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {poNumber ? `Edit Purchase Order #${poNumber}` : 'Create New Purchase Order'}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {poNumber ? 'Modify existing PO' : 'New PO will start at #888000'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Loading purchase order...</div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-red-800 font-semibold">Error</div>
                  <div className="text-red-600">{error}</div>
                </div>
              )}

              {/* PO Header Section */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Order Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter vendor ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Order #</label>
                    <input
                      type="text"
                      value={vendorOrderNumber}
                      onChange={(e) => setVendorOrderNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PO Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shipper</label>
                    <input
                      type="text"
                      value={shipper}
                      onChange={(e) => setShipper(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Shipping company"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={poStatus}
                      onChange={(e) => setPoStatus(e.target.value as POStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Open">Open</option>
                      <option value="Pending">Pending</option>
                      <option value="Closed">Closed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                    <textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter any special instructions..."
                    />
                  </div>
                </div>
              </div>

              {/* Line Items Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowProductSearch(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      + Add from LCMD
                    </button>
                    <button
                      onClick={() => addLineItem()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      + Add Manual Line
                    </button>
                  </div>
                </div>

                {lineItems.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-600">No line items yet. Add products from LCMD or create manual lines.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Line</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part #</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Extended</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {lineItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900">{item.line_number}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={item.lcmd_part_number || ''}
                                  onChange={(e) => updateLineItem(index, 'lcmd_part_number', e.target.value)}
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={item.qty_ordered}
                                  onChange={(e) => updateLineItem(index, 'qty_ordered', parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  min="0"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_cost}
                                  onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  min="0"
                                />
                              </td>
                              <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                                ${(item.extended_amount || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => removeLineItem(index)}
                                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Totals Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="max-w-md ml-auto">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="font-semibold text-gray-900">${calculateSubtotal().toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center gap-4">
                      <label className="text-gray-700">Freight:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={freight}
                        onChange={(e) => setFreight(parseFloat(e.target.value) || 0)}
                        className="w-32 px-3 py-1 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>

                    <div className="flex justify-between items-center gap-4">
                      <label className="text-gray-700">Taxes/Duties:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={taxesDuties}
                        onChange={(e) => setTaxesDuties(parseFloat(e.target.value) || 0)}
                        className="w-32 px-3 py-1 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>

                    <div className="flex justify-between items-center gap-4">
                      <label className="text-gray-700">Other Fees:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={otherFees}
                        onChange={(e) => setOtherFees(parseFloat(e.target.value) || 0)}
                        className="w-32 px-3 py-1 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>

                    <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Grand Total:</span>
                      <span className="text-2xl font-bold text-blue-600">${calculateGrandTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={savePurchaseOrder}
            disabled={saving || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
          >
            {saving ? 'Saving...' : poNumber ? 'Update PO' : 'Create PO'}
          </button>
        </div>
      </div>

      {/* Product Search Modal */}
      {showProductSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-green-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Search LCMD Products</h3>
              <button
                onClick={() => {
                  setShowProductSearch(false);
                  setProductSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => {
                  setProductSearchQuery(e.target.value);
                  searchProducts(e.target.value);
                }}
                placeholder="Search by part number, description, or vendor..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />

              <div className="mt-4 max-h-96 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    {productSearchQuery.length < 2
                      ? 'Enter at least 2 characters to search'
                      : 'No products found'
                    }
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((product) => (
                      <div
                        key={product.part_number}
                        onClick={() => addLineItem(product)}
                        className="p-3 border border-gray-200 rounded-md hover:bg-green-50 hover:border-green-300 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{product.part_number}</div>
                            <div className="text-sm text-gray-600">{product.description}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Vendor: {product.vendor_name || 'N/A'} |
                              Inventory: {product.current_inventory} |
                              Min: {product.min_qty} |
                              Max: {product.max_qty}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-semibold text-green-600">
                              ${product.unit_cost?.toFixed(2) || '0.00'}
                            </div>
                            <div className="text-xs text-gray-500">unit cost</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POEditorModal;
