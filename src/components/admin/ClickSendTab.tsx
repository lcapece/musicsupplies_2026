import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface TestMessage {
  id: string;
  smsNumber: string;
  message: string;
  status: 'sending' | 'sent' | 'failed';
  timestamp: string;
}

const ClickSendTab: React.FC = () => {
  const [showAdHocModal, setShowAdHocModal] = useState(false);
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);

  const handleSendAdHocSMS = async (smsNumber: string, message: string) => {
    const messageId = `adhoc-${Date.now()}`;
    
    // Add to test messages immediately
    const newTestMessage: TestMessage = {
      id: messageId,
      smsNumber: smsNumber,
      message,
      status: 'sending',
      timestamp: new Date().toISOString()
    };

    setTestMessages(prev => [newTestMessage, ...prev]);

    try {
      
      const { data, error } = await supabase.functions.invoke('send-admin-sms', {
        body: {
          eventName: 'adhoc_sms',
          message: message,
          customPhones: [smsNumber]
        }
      });


      if (error) {
        console.error('Error sending ad-hoc SMS:', error);
        // Update status to failed
        setTestMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        ));
        alert(`Failed to send ad-hoc SMS: ${error.message || 'Unknown error'}`);
        return;
      }

      if (data && !data.success) {
        console.error('SMS function returned failure:', data);
        setTestMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        ));
        alert(`Failed to send SMS: ${data.message || 'Unknown error'}`);
        return;
      }

      // Update status to sent
      setTestMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'sent' } : msg
      ));

      alert('Ad-hoc SMS sent successfully');
    } catch (error) {
      console.error('Error sending SMS:', error);
      setTestMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'failed' } : msg
      ));
      alert(`Error sending ad-hoc SMS: ${(error as Error).message || 'Unknown error'}`);
    }
  };

  const AdHocSmsModal: React.FC<{
    onClose: () => void;
    onSend: (smsNumber: string, message: string) => void;
  }> = ({ onClose, onSend }) => {
    const [smsNumber, setSmsNumber] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!smsNumber.trim()) {
        alert('Please enter an SMS number');
        return;
      }
      
      if (!message.trim()) {
        alert('Please enter a message');
        return;
      }

      onSend(smsNumber.trim(), message.trim());
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Send Ad-Hoc SMS
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Send a one-time SMS message to any phone number
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMS Number (with country code)
              </label>
              <input
                type="tel"
                value={smsNumber}
                onChange={(e) => setSmsNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Include country code (e.g., +1 for US/Canada)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={4}
                required
                maxLength={160}
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length}/160 characters
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md"
              >
                Send SMS
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ClickSend SMS Management</h2>
          <p className="text-sm text-gray-600 mt-1">Send SMS messages to customers</p>
        </div>
        <div>
          <button
            onClick={() => setShowAdHocModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Send Ad-Hoc SMS
          </button>
        </div>
      </div>

      {/* Test Messages History */}
      {testMessages.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {testMessages.slice(0, 10).map((msg) => (
              <div key={msg.id} className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Ad-Hoc SMS → {msg.smsNumber}
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-md">
                    {msg.message}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    msg.status === 'sent' ? 'bg-green-100 text-green-800' :
                    msg.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {msg.status}
                  </span>
                  <div className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">SMS Messaging Instructions</h4>
        <div className="text-sm text-blue-600 mb-2">
          SMS will be sent from: <span className="font-mono font-bold">+18338291653</span> (Carrier Approved)
        </div>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use the "Send Ad-Hoc SMS" button to send a one-time message to any phone number</li>
          <li>• USA numbers: You can enter with or without +1 (system will automatically add +1 if missing)</li>
          <li>• Examples: "5164550980", "+15164550980", or "1-516-455-0980" all work</li>
          <li>• Messages are limited to 160 characters</li>
          <li>• Message status will be displayed in the Recent Messages section</li>
        </ul>
      </div>

      {/* Ad-Hoc SMS Modal */}
      {showAdHocModal && (
        <AdHocSmsModal
          onClose={() => setShowAdHocModal(false)}
          onSend={handleSendAdHocSMS}
        />
      )}
    </div>
  );
};

export default ClickSendTab;
