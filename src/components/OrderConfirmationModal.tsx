import React, { useEffect, useState } from 'react';
import { OrderConfirmationDetails, CartItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface OrderConfirmationModalProps {
  orderDetails: OrderConfirmationDetails | null;
  onClose: () => void;
}

const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({ orderDetails, onClose }) => {
  const { user } = useAuth();
  const [smsStatus, setSmsStatus] = useState<'pending' | 'sending' | 'sent' | 'failed'>('pending');

  useEffect(() => {
    if (orderDetails && user) {
      sendOrderNotificationSMS();
    }
  }, [orderDetails, user]);

  const sendOrderNotificationSMS = async () => {
    if (!orderDetails || !user) return;

    try {
      setSmsStatus('sending');

      const { data, error } = await supabase.functions.invoke('send-order-sms', {
        body: {
          accountNumber: user.accountNumber,
          accountName: user.acctName,
          orderNumber: orderDetails.webOrderNumber,
          totalAmount: orderDetails.total
        }
      });

      if (error) {
        console.error('Error sending SMS notification:', error);
        setSmsStatus('failed');
        return;
      }

      setSmsStatus('sent');
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      setSmsStatus('failed');
    }
  };

  if (!orderDetails) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Order Confirmation</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-lg text-gray-700">
            Thank you for your order! Your Web Order Number is:
            <strong className="text-blue-600 ml-2">{orderDetails.webOrderNumber}</strong>
          </p>
        </div>

        {/* SMS Notification Status */}
        <div className="mb-6 p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">SMS Notification:</span>
            {smsStatus === 'pending' && (
              <span className="text-sm text-gray-500">Preparing...</span>
            )}
            {smsStatus === 'sending' && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-600">Sending SMS notification...</span>
              </div>
            )}
            {smsStatus === 'sent' && (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-sm text-green-600">SMS notification sent to +15164550980</span>
              </div>
            )}
            {smsStatus === 'failed' && (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <span className="text-sm text-red-600">Failed to send SMS notification</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-medium text-gray-700 mb-3">Order Summary:</h3>
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part #
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderDetails.items.map((item: CartItem) => (
                  <tr key={item.partnumber}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.partnumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                      ${item.price !== null ? item.price.toFixed(2) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                      ${item.price !== null ? (item.price * item.quantity).toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-right mb-6">
          <p className="text-xl font-semibold text-gray-800">
            Total: ${orderDetails.total.toFixed(2)}
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;
