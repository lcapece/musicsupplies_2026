import React from 'react';
import { Link } from 'react-router-dom';

const EmailCommunicationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Email Communications Policy</h1>
        
        <div className="prose prose-lg text-gray-700">
          <p><strong>Last Updated:</strong> June 17, 2025</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">1. Introduction</h2>
          <p>
            This page outlines our policies regarding email communications from MusicSupplies.com ("we," "our," or "us"). We only send emails to customers who have opted to receive invoices, alerts, and other system information relevant to their wholesale account.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">2. Types of Emails We Send</h2>
          <p>We send the following types of emails to customers who have opted to receive them:</p>
          <ul>
            <li><strong>Transactional Emails:</strong> These are related to your account activity, such as account creation confirmations, password reset emails, order confirmations, shipping notifications, and responses to your inquiries.</li>
            <li><strong>Alerts and System Information:</strong> These include important updates, service announcements, and other system-related notifications relevant to your wholesale account.</li>
            <li><strong>Invoices:</strong> Electronic invoices for your orders.</li>
          </ul>
          <p>You can manage your email preferences in your account settings. You cannot opt-out of essential transactional emails as they are necessary for providing our services.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">3. Opting-In to Email Communications</h2>
          <p>
            You can opt-in to receive email communications for invoices, alerts, and system information by:
          </p>
          <ul>
            <li>Checking the consent box during account registration or in your account settings.</li>
            <li>Contacting our customer support to update your preferences.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">4. How to Manage Your Email Preferences</h2>
          <p>
            You can manage your email preferences at any time by:
          </p>
          <ul>
            <li>Updating your email preferences in your account settings page on our website.</li>
            <li>Contacting us directly at <a href="mailto:marketing@musicsupplies.com" className="text-blue-600 hover:underline">marketing@musicsupplies.com</a> with your request to update preferences.</li>
          </ul>
          <p>
            Please note that even if you opt-out of certain communications, you may still receive essential transactional emails related to your account and our services.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">5. Email Frequency</h2>
          <p>
            The frequency of promotional emails will vary. We strive to send relevant content without overwhelming your inbox. Transactional emails are sent as needed based on your activity.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">6. Data Protection and Privacy</h2>
          <p>
            We are committed to protecting your email address and personal information. For more details on how we handle your data, please review our <Link to="/privacy-policy" className="text-blue-600 hover:text-blue-800">Privacy Policy</Link>.
          </p>
          <p>
            We do not sell or rent your email address to third parties for their marketing purposes without your explicit consent.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">7. Accuracy of Information</h2>
          <p>
            It is your responsibility to ensure that the email address associated with your account is accurate and up-to-date.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">8. Contact Us</h2>
          <p>
            If you have any questions about our email communications policy, or if you are having trouble unsubscribing, please contact us at:
          </p>
          <p>
            Email: <a href="mailto:marketing@musicsupplies.com" className="text-blue-600 hover:underline">marketing@musicsupplies.com</a><br />
            Physical Address: 2555 North Jerusalem Road, East Meadow NY 11554
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

export default EmailCommunicationsPage;
