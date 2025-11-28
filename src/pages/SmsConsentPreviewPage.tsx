import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../images/music_supplies_logo.png';

const SmsConsentPreviewPage: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionalConsent, setTransactionalConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('This is a preview page for ClickSend approval. Form submission is disabled.');
  };

  const handleDecline = () => {
    alert('This is a preview page for ClickSend approval. Form submission is disabled.');
  };

  const isSubmitEnabled = transactionalConsent && phoneNumber.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Preview Notice */}
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6">
          <p className="font-semibold">ClickSend TFN Registration Preview</p>
          <p className="text-sm">This page demonstrates our SMS consent process for ClickSend Toll-Free Number registration approval. Form submission is disabled on this preview page.</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6 rounded-t-lg">
            <div className="flex items-center space-x-4">
              <img src={logo} alt="Music Supplies Logo" className="h-16 w-auto" />
            <div>
              <h2 className="text-2xl font-bold">MusicSupplies.com</h2>
              <p className="text-blue-100 mt-1">a subsidiary of Lou Capece Music Distributors</p>
              <h3 className="text-xl font-semibold mt-2">SMS Communication Consent</h3>
            </div>
            </div>
          </div>

          <div className="p-6">
            {/* Business Information */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="text-sm text-gray-700">
                <p className="font-semibold">MusicSupplies.com, a subsidiary of Lou Capece Music Distributors</p>
                <p>2555 North Jerusalem Road, East Meadow, NY 11554</p>
                <p className="mt-2">
                  Customer Service: <a href="tel:18003215584" className="text-blue-600 hover:underline">1-800-321-5584</a>
                </p>
              </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* SMS Opt-in Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">SMS Message Subscription</h4>
                  <p className="text-gray-700 mb-4">
                    You are signing up to receive SMS text messages from Lou Capece Music Distributors / MusicSupplies.com. 
                    These messages will include:
                  </p>
                  
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h5 className="font-semibold text-gray-900 mb-2">Transactional Messages:</h5>
                    <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                      <li>Order confirmations and shipping notifications</li>
                      <li>Account alerts and security notifications</li>
                      <li>Payment reminders and account updates</li>
                      <li>Customer service communications</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-gray-900 mb-2">Marketing Messages (Optional):</h5>
                    <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                      <li>Promotional offers and discounts</li>
                      <li>New product announcements</li>
                      <li>Special sales and events</li>
                      <li>Industry news and updates</li>
                    </ul>
                  </div>
                </div>

                {/* Message Frequency and Rates */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="text-sm text-gray-700 space-y-2">
                    <p><strong>Message Frequency:</strong> Message frequency varies. You may receive 2-10 messages per month depending on your account activity and preferences.</p>
                    <p><strong>Rates:</strong> Message and data rates may apply. Standard messaging rates from your mobile carrier will apply.</p>
                  </div>
                </div>

                {/* Phone Number Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Phone Number <span className="text-gray-500">(Optional - but required for SMS)</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include country code (e.g., +1 for US/Canada). This field is optional for account creation but required to receive SMS messages.
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Consent Checkboxes */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-4">Consent Options</h5>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="transactionalConsent"
                        checked={transactionalConsent}
                        onChange={(e) => setTransactionalConsent(e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="transactionalConsent" className="text-sm text-gray-700">
                        <span className="font-semibold">I consent to receive transactional SMS messages</span> including order confirmations, 
                        shipping notifications, account alerts, and customer service communications from Lou Capece Music Distributors.
                      </label>
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="marketingConsent"
                        checked={marketingConsent}
                        onChange={(e) => setMarketingConsent(e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="marketingConsent" className="text-sm text-gray-700">
                        <span className="font-semibold">I provide express written consent to receive marketing SMS messages</span> including 
                        promotional offers, product announcements, and special sales from Lou Capece Music Distributors. 
                        <span className="text-gray-600">(This is optional and separate from transactional messages)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Help and Opt-out Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-gray-900 mb-2">Help and Opt-out Instructions:</h5>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>For Help:</strong> Text <code className="bg-gray-200 px-1 rounded">HELP</code> to any message for assistance</p>
                    <p><strong>To Unsubscribe:</strong> Text <code className="bg-gray-200 px-1 rounded">STOP</code> to any message to opt out of all SMS communications</p>
                    <p><strong>Customer Service:</strong> Call 1-800-321-5584 for immediate assistance</p>
                  </div>
                </div>

                {/* Legal Links */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    By providing consent, you agree to our communication practices as described in our policies:
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
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
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t mt-6">
                <button
                  type="submit"
                  disabled={!isSubmitEnabled}
                  className={`flex-1 py-3 px-4 rounded-md text-white font-medium ${
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
                  type="button"
                  onClick={handleDecline}
                  className="flex-1 py-3 px-4 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300 font-medium"
                >
                  I do not want to receive SMS messages
                </button>
              </div>
            </form>

            {/* Disclaimer */}
            <div className="text-xs text-gray-500 text-center pt-4 border-t mt-4">
              <p>
                This consent form complies with TCPA regulations and carrier requirements for SMS communications. 
                Your consent is not required as a condition of purchase.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Information */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>This SMS consent form is used by Lou Capece Music Distributors for ClickSend Toll-Free Number registration.</p>
          <p className="mt-2">For questions about this form, contact: <a href="mailto:marketing@musicsupplies.com" className="text-blue-600 hover:underline">marketing@musicsupplies.com</a></p>
        </div>
      </div>
    </div>
  );
};

export default SmsConsentPreviewPage;
