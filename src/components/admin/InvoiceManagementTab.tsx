import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface WebOrder {
  id: string;
  order_number: string;
  created_at: string;
  account_number?: string;
  email: string;
  phone: string;
  items: any[];
  subtotal: number;
  discount_amount?: number;
  total_amount: number;
  payment_method: string;
  order_status: string;
  promo_code_used?: string;
  customer_name?: string;
  invoice_sent?: boolean;
}

const InvoiceManagementTab: React.FC = () => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [orderToCancel, setOrderToCancel] = useState<WebOrder | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSearchInvoice = async () => {
    if (!invoiceNumber.trim()) {
      setMessage({ type: 'error', text: 'Please enter an invoice number' });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      // Search for the order by invoice/order number
      const { data, error } = await supabase
        .from('web_orders')
        .select('*')
        .eq('order_number', invoiceNumber.trim())
        .single();

      if (error || !data) {
        setMessage({ type: 'error', text: 'Invoice not found' });
        setOrderToCancel(null);
      } else {
        setOrderToCancel(data);
        setShowCancelModal(true);
      }
    } catch (err) {
      console.error('Error searching invoice:', err);
      setMessage({ type: 'error', text: 'Error searching for invoice' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!orderToCancel) return;

    setLoading(true);
    
    try {
      // First, check if the order has a promo code that needs to be rolled back
      if (orderToCancel.promo_code_used) {
        // Get the promo code details
        const { data: promoCode, error: promoError } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', orderToCancel.promo_code_used)
          .single();

        if (!promoError && promoCode) {
          // Check if it's a single-use code
          if (promoCode.single_use && promoCode.times_used > 0) {
            // Rollback the usage count
            const { error: rollbackError } = await supabase
              .from('promo_codes')
              .update({ 
                times_used: Math.max(0, promoCode.times_used - 1)
              })
              .eq('id', promoCode.id);

            if (rollbackError) {
              console.error('Error rolling back promo code:', rollbackError);
            }
          }

          // Also check promo_code_usage table for single-use tracking
          const { error: deleteUsageError } = await supabase
            .from('promo_code_usage')
            .delete()
            .eq('promo_code_id', promoCode.id)
            .eq('order_number', orderToCancel.order_number);

          if (deleteUsageError) {
            console.error('Error deleting promo code usage:', deleteUsageError);
          }
        }
      }

      // Update the order status to 'canceled'
      const { error: cancelError } = await supabase
        .from('web_orders')
        .update({ 
          order_status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderToCancel.id);

      if (cancelError) {
        throw cancelError;
      }

      setMessage({ 
        type: 'success', 
        text: `Invoice ${orderToCancel.order_number} has been canceled successfully${
          orderToCancel.promo_code_used ? ' and promo code rolled back' : ''
        }` 
      });
      setShowCancelModal(false);
      setOrderToCancel(null);
      setInvoiceNumber('');
    } catch (err) {
      console.error('Error canceling invoice:', err);
      setMessage({ type: 'error', text: 'Error canceling invoice' });
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

  const CancelConfirmationModal: React.FC = () => {
    if (!orderToCancel) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Confirm Invoice Cancellation
            </h3>
            <button
              onClick={() => {
                setShowCancelModal(false);
                setOrderToCancel(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium mb-2">
              Are you sure you want to cancel this invoice?
            </p>
            <p className="text-red-700 text-sm">
              This action will mark the invoice as canceled and rollback any single-use promo codes.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Invoice Number</p>
                <p className="font-medium">{orderToCancel.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Order Date</p>
                <p className="font-medium">{formatDate(orderToCancel.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium">{orderToCancel.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-medium text-lg">{formatCurrency(orderToCancel.total_amount)}</p>
              </div>
              {orderToCancel.promo_code_used && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Promo Code Used</p>
                  <p className="font-medium text-orange-600">
                    {orderToCancel.promo_code_used} 
                    {orderToCancel.discount_amount && (
                      <span className="text-green-600 ml-2">
                        (-{formatCurrency(orderToCancel.discount_amount)})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Items ({orderToCancel.items.length})</p>
              <div className="bg-gray-50 rounded p-3 text-sm">
                {orderToCancel.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.partnumber} - {item.description}</span>
                    <span>{formatCurrency((item.price || 0) * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowCancelModal(false);
                setOrderToCancel(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              disabled={loading}
            >
              Keep Invoice
            </button>
            <button
              onClick={handleCancelInvoice}
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md"
              disabled={loading}
            >
              {loading ? 'Canceling...' : 'Cancel Invoice'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Invoice Management</h2>
        <p className="text-sm text-gray-600 mt-1">
          Cancel invoices and manage order-related operations
        </p>
      </div>

      {/* Cancel Invoice Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel an Invoice</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter Invoice Number
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchInvoice()}
                placeholder="e.g., 750001"
                className="flex-1 border border-gray-300 rounded-md px-4 py-2"
                disabled={loading}
              />
              <button
                onClick={handleSearchInvoice}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
                disabled={loading || !invoiceNumber.trim()}
              >
                {loading ? 'Searching...' : 'Cancel Invoice'}
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Important Notes:</h4>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Canceling an invoice will mark it as canceled in the system</li>
            <li>Single-use promo codes will be rolled back and made available again</li>
            <li>Multiple-use promo codes will have their usage count decremented</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>
      </div>

      {/* Future features placeholder */}
      <div className="bg-gray-100 rounded-lg p-6 text-center">
        <p className="text-gray-600">
          Additional invoice management features will be added here in future updates
        </p>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && <CancelConfirmationModal />}
    </div>
  );
};

export default InvoiceManagementTab;
