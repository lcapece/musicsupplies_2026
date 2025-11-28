import React from 'react';
import { Link } from 'react-router-dom';

const SmsCommunicationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Musicsupplies.com SMS Messaging Policy</h1>
        <p className="text-sm text-gray-600 mb-6 border-b pb-4">Last updated: June 17, 2025</p>
        
        <div className="prose prose-lg text-gray-700 max-w-none"> {/* Added max-w-none to prose for wider text if needed */}
          
          <h2 className="text-xl font-semibold mt-6 mb-3">1. Consent to Receive SMS Messages</h2>
          <p>
            By providing your mobile number and opting into our SMS service, you expressly consent to receive informational SMS text messages from MusicSupplies.com and Lou Capece Music Distributors (LCMD). This service is exclusively for our verified wholesale customers.
          </p>
          <p>
            Messages will include occasional text alerts on shipping statuses, order processing updates, and other relevant system alerts. Message frequency may vary.
          </p>
          <p>
            Your consent is not a condition of purchasing any goods or services.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. Message and Data Rates</h2>
          <p>
            Standard messaging and data rates may apply according to your mobile carrier's terms and your mobile service plan. MusicSupplies.com is not responsible for charges related to SMS messages received or sent through our SMS service.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. Opt-Out & Help</h2>
          <p>
            You may opt-out at any time by replying STOP to any SMS message sent by MusicSupplies.com. Once you opt-out, you will receive a final confirmation message, and no additional messages will be sent unless you choose to opt-in again.
          </p>
          <p>
            For assistance, reply HELP to any SMS message, or contact our customer service directly at <a href="mailto:info@loucapecemusic.com" className="text-blue-600 hover:underline">info@loucapecemusic.com</a> or via phone at 1-800-321-5584.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. Privacy & Data Security</h2>
          <p>
            We value your privacy and take comprehensive measures to protect your personal information. Your mobile number, message content, and metadata will only be used for communication related to your account, promotions, or transactions with MusicSupplies.com. We will not share or sell your personal information to third parties without your explicit consent, except as required by law.
          </p>
          <p>
            All customer data is stored securely in compliance with applicable data privacy regulations, including but not limited to the U.S. Telephone Consumer Protection Act (TCPA), Canada's Anti-Spam Legislation (CASL), and relevant state and provincial laws.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Application-to-Person (A2P) SMS Compliance</h2>
          <p>
            MusicSupplies.com complies fully with industry-standard best practices and guidelines set forth by mobile carriers and regulatory authorities for A2P messaging across North America. Our SMS campaigns adhere strictly to carrier requirements, TCPA regulations, and industry codes of conduct, ensuring transparent communication and user consent processes.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">6. Disclaimer of Liability</h2>
          <p>
            MusicSupplies.com disclaims liability for delayed, lost, misdirected, undelivered, or incomplete messages due to technical limitations, service interruptions, carrier outages, or any factors beyond our direct control.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">7. Amendments and Updates</h2>
          <p>
            We reserve the right to modify, update, or amend this policy at any time. Changes to this policy will be effective immediately upon posting at musicsupplies.com. Continued use of the SMS service following policy updates constitutes acceptance of those changes.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">8. Governing Law & Jurisdiction</h2>
          <p>
            This policy shall be governed by and construed in accordance with the laws of the jurisdiction where MusicSupplies.com is incorporated (e.g., state laws applicable in the United States). Any disputes related to this SMS service or this policy shall be handled in accordance with applicable jurisdictional laws.
          </p>

          <h3 className="text-lg font-semibold mt-8 mb-3">Contact Information</h3>
          <p>
            For questions regarding this policy or about our SMS messaging service, please contact:
          </p>
          <p>
            MusicSupplies.com<br />
            Email: <a href="mailto:info@loucapecemusic.com" className="text-blue-600 hover:underline">info@loucapecemusic.com</a><br />
            Phone: 1-800-321-5584<br />
            Website: <a href="https://musicsupplies.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.musicsupplies.com</a>
          </p>
          <p className="mt-4">
            Thank you for choosing MusicSupplies.com—we appreciate your trust and are committed to safeguarding your privacy and providing a superior user experience.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SmsCommunicationsPage;
