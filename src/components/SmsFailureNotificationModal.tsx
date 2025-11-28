import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

interface SmsFailure {
  id: string;
  order_number: string;
  customer_phone: string;
  customer_name: string;
  customer_account_number: string;
  error_message: string;
  created_at: string;
}

interface SmsFailureNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SmsFailureNotificationModal: React.FC<SmsFailureNotificationModalProps> = ({ isOpen, onClose }) => {
  const [failures, setFailures] = useState<SmsFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFailures();
    }
  }, [isOpen]);

  const fetchFailures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_unacknowledged_sms_failures');
      
      if (error) {
        console.error('Error fetching SMS failures:', error);
      } else {
        setFailures(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeFailures = async () => {
    if (failures.length === 0) return;

    try {
      setAcknowledging(true);
      const failureIds = failures.map(f => f.id);
      
      const { error } = await supabase.rpc('acknowledge_sms_failures', {
        failure_ids: failureIds
      });
      
      if (error) {
        console.error('Error acknowledging failures:', error);
        alert('Failed to acknowledge SMS failures. Please try again.');
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setAcknowledging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <h3 className="text-2xl font-bold text-gray-900">SMS Notification Failures</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X size={24} />
            </button>
          </div>
          <p className="mt-2 text-gray-600">
            The following SMS notifications failed to send. Please follow up with these customers manually.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading SMS failures...</p>
            </div>
          ) : failures.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-2 text-lg text-gray-600">No SMS failures to report!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {failures.map((failure) => (
                <div key={failure.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Order Number</p>
                      <p className="text-lg font-semibold text-gray-900">{failure.order_number}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Customer Phone</p>
                      <p className="text-lg font-semibold text-gray-900">{failure.customer_phone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Customer Name</p>
                      <p className="text-lg text-gray-900">{failure.customer_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Account Number</p>
                      <p className="text-lg text-gray-900">{failure.customer_account_number || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-700">Error Message</p>
                      <p className="text-sm text-red-600 mt-1">{failure.error_message}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">
                        Failed at: {new Date(failure.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            {failures.length > 0 && (
              <button
                onClick={acknowledgeFailures}
                disabled={acknowledging}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300"
              >
                {acknowledging ? 'Acknowledging...' : 'Acknowledge All'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmsFailureNotificationModal;
