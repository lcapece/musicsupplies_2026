import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../images/music_supplies_logo.png';

interface SmsConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: (consented: boolean, marketingConsent?: boolean, phoneNumber?: string) => void;
}

const SmsConsentModal: React.FC<SmsConsentModalProps> = ({ isOpen, onClose, onConsent }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionalConsent, setTransactionalConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Initialize with +1 when modal opens
  useEffect(() => {
    if (isOpen && phoneNumber === '') {
      setPhoneNumber('+1 ');
    }
  }, [isOpen]);

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters except + at the start
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // If it starts with +1, apply US formatting
    if (cleaned.startsWith('+1')) {
      const digits = cleaned.slice(2); // Remove +1
      let formatted = '+1 ';
      
      if (digits.length > 0) {
        if (digits.length <= 3) {
          formatted += `(${digits}`;
        } else if (digits.length <= 6) {
          formatted += `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        } else {
          formatted += `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
        }
      }
      
      return formatted;
    }
    
    // If no +1, return as-is (user removed country code)
    return value;
  };

  // Extract only digits for database storage
  const extractDigitsOnly = (formattedNumber: string) => {
    return formattedNumber.replace(/\D/g, '');
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow user to delete everything including +1
    if (inputValue === '') {
      setPhoneNumber('');
      return;
    }
    
    // If user is typing and it starts with +1, apply formatting
    if (inputValue.startsWith('+1')) {
      const formatted = formatPhoneNumber(inputValue);
      setPhoneNumber(formatted);
    } else {
      // User removed +1, allow freeform entry
      setPhoneNumber(inputValue);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (transactionalConsent) {
      // Extract only digits for database storage
      const digitsOnly = extractDigitsOnly(phoneNumber);
      onConsent(true, marketingConsent, digitsOnly);
    } else {
      onConsent(false, false, '');
    }
    onClose();
  };

  const handleDecline = () => {
    onConsent(false, false, '');
    onClose();
  };

  const isSubmitEnabled = transactionalConsent && phoneNumber.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Music Supplies Logo" className="h-12 w-auto" />
            <div>
              <h2 className="text-xl font-bold">MusicSupplies.com</h2>
              <p className="text-blue-100 text-sm">a subsidiary of Lou Capece Music Distributors</p>
              <h3 className="text-lg font-semibold mt-1">SMS Communication Consent</h3>
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Business Information */}
            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-xs text-gray-700">
              <p className="font-semibold">MusicSupplies.com, a subsidiary of Lou Capece Music Distributors</p>
              <p>2555 North Jerusalem Road, East Meadow, NY 11554 | Customer Service: <a href="tel:18003215584" className="text-blue-600 hover:underline">1-800-321-5584</a></p>
            </div>

          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* SMS Opt-in Information */}
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">SMS Message Subscription</h4>
                <p className="text-sm text-gray-700 mb-3">
                  You are signing up to receive SMS text messages from Lou Capece Music Distributors / MusicSupplies.com. 
                  These messages will include:
                </p>
                
                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                  <h5 className="font-semibold text-gray-900 mb-1 text-sm">Transactional Messages:</h5>
                  <ul className="list-disc list-inside text-gray-700 text-xs space-y-0">
                    <li>Order confirmations and shipping notifications</li>
                    <li>Account alerts and security notifications</li>
                    <li>Payment reminders and account updates</li>
                    <li>Customer service communications</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <h5 className="font-semibold text-gray-900 mb-1 text-sm">Marketing Messages (Optional):</h5>
                  <ul className="list-disc list-inside text-gray-700 text-xs space-y-0">
                    <li>Promotional offers and discounts</li>
                    <li>New product announcements</li>
                    <li>Special sales and events</li>
                    <li>Industry news and updates</li>
                  </ul>
                </div>
              </div>

              {/* Message Frequency and Rates */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                <div className="text-xs text-gray-700">
                  <p><strong>Message Frequency:</strong> 2-10 messages per month depending on your account activity.</p>
                  <p><strong>Rates:</strong> Message and data rates may apply. Standard messaging rates from your mobile carrier will apply.</p>
                </div>
              </div>

              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Phone Number <span className="text-gray-500">(Optional - but required for SMS)</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1 (555) 123-4567"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +1 for US/Canada). Required to receive SMS messages.
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Consent Checkboxes */}
              <div>
                <h5 className="font-semibold text-gray-900 mb-2 text-sm">Consent Options</h5>
                <div className="space-y-3 border-2 border-red-500 p-3 rounded-lg bg-red-50">
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="transactionalConsent"
                      checked={transactionalConsent}
                      onChange={(e) => setTransactionalConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="transactionalConsent" className="text-xs text-gray-700">
                      <span className="font-semibold">I consent to receive transactional SMS messages</span> including order confirmations, 
                      shipping notifications, account alerts, and customer service communications from Lou Capece Music Distributors.
                    </label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="marketingConsent"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="marketingConsent" className="text-xs text-gray-700">
                      <span className="font-semibold">I provide express written consent to receive marketing SMS messages</span> including 
                      promotional offers, product announcements, and special sales from Lou Capece Music Distributors. 
                      <span className="text-gray-600">(Optional and separate from transactional messages)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Help and Opt-out Information */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h5 className="font-semibold text-gray-900 mb-1 text-sm">Help and Opt-out Instructions:</h5>
                <div className="text-xs text-gray-700">
                  <p><strong>For Help:</strong> Text <code className="bg-gray-200 px-1 rounded">HELP</code> to any message for assistance</p>
                  <p><strong>To Unsubscribe:</strong> Text <code className="bg-gray-200 px-1 rounded">STOP</code> to any message to opt out of all SMS communications</p>
                  <p><strong>Customer Service:</strong> Call 1-800-321-5584 for immediate assistance</p>
                </div>
              </div>

              {/* Legal Links */}
              <div className="border-t pt-3">
                <p className="text-xs text-gray-600 mb-2">
                  By providing consent, you agree to our communication practices as described in our policies:
                </p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <Link to="/terms-and-conditions" className="text-blue-600 hover:underline" target="_blank">
                    Terms & Conditions
                  </Link>
                  <Link to="/privacy-policy" className="text-blue-600 hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                  <Link to="/sms-communications" className="text-blue-600 hover:underline" target="_blank">
                    SMS Communications Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t mt-4">
            <button
              onClick={handleSubmit}
              disabled={!isSubmitEnabled}
              className={`flex-1 py-2 px-4 rounded-md text-white font-medium text-sm ${
                isSubmitEnabled 
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {transactionalConsent && marketingConsent 
                ? 'Consent to All SMS Communications' 
                : transactionalConsent 
                ? 'Consent to Transactional SMS Only'
                : 'Please select consent options above'
              }
            </button>
            
            <button
              onClick={handleDecline}
              className="flex-1 py-2 px-4 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300 font-medium text-sm"
            >
              I do not want to receive SMS messages
            </button>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-gray-500 text-center pt-3 border-t mt-3">
            <p>
              This consent form complies with TCPA regulations and carrier requirements for SMS communications. 
              Your consent is not required as a condition of purchase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmsConsentModal;
