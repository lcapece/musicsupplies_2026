import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsAndConditionsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <Link 
              to="/" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to Login
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Terms and Conditions</h1>
            <p className="text-gray-600 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using the Lou Capece Music Distributors wholesale platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Wholesale Account Requirements</h2>
              <p className="text-gray-700 mb-4">
                This platform is exclusively for authorized wholesale accounts. By using this service, you represent and warrant that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>You are an authorized representative of a legitimate music retail business</li>
                <li>You have a valid business license and tax identification number</li>
                <li>You will use purchased products for resale purposes only</li>
                <li>You will not resell products below minimum advertised pricing (MAP) when applicable</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Account Security</h2>
              <p className="text-gray-700 mb-4">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Keep your password secure and confidential</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Log out from your account at the end of each session</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Orders and Pricing</h2>
              <p className="text-gray-700 mb-4">
                All orders are subject to acceptance and product availability. We reserve the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Refuse or cancel orders at our discretion</li>
                <li>Modify pricing without prior notice</li>
                <li>Require additional verification for large orders</li>
                <li>Apply credit limits and payment terms based on account standing</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Payment Terms</h2>
              <p className="text-gray-700 mb-4">
                Payment terms are established based on your account approval and credit evaluation. Standard terms include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Net payment terms as specified in your account agreement</li>
                <li>Late payment fees may apply to overdue accounts</li>
                <li>Credit limits may be adjusted based on payment history</li>
                <li>COD or prepayment may be required for certain accounts</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Shipping and Returns</h2>
              <p className="text-gray-700 mb-4">
                Shipping terms and return policies are subject to our current wholesale policies. Please contact customer service for specific details regarding:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Minimum order requirements</li>
                <li>Shipping costs and delivery timeframes</li>
                <li>Return authorization procedures</li>
                <li>Defective merchandise policies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Communications Consent</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">SMS Communications</h3>
              <p className="text-gray-700 mb-4">
                By providing your mobile phone number and using our services, you consent to receive SMS text messages from Lou Capece Music Distributors. These messages may include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Order confirmations and shipping notifications</li>
                <li>Account alerts and security notifications</li>
                <li>Promotional offers and product announcements</li>
                <li>Customer service communications</li>
              </ul>
              <p className="text-gray-700 mb-4">
                <strong>Opt-out:</strong> You may opt out of SMS communications at any time by replying "STOP" to any text message or by contacting customer service. Standard message and data rates may apply.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Email Communications</h3>
              <p className="text-gray-700 mb-4">
                By providing your email address, you consent to receive email communications from us, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Order confirmations and invoices</li>
                <li>Account statements and payment reminders</li>
                <li>Product catalogs and promotional offers</li>
                <li>Company news and industry updates</li>
              </ul>
              <p className="text-gray-700 mb-4">
                <strong>Opt-out:</strong> You may unsubscribe from promotional emails by clicking the unsubscribe link in any email or by contacting customer service. Transactional emails related to your account and orders will continue to be sent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Privacy and Data Protection</h2>
              <p className="text-gray-700 mb-4">
                We are committed to protecting your privacy and personal information. Our collection, use, and protection of your data is governed by our Privacy Policy. By using our services, you consent to our data practices as described in our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                All content on this platform, including but not limited to text, graphics, logos, images, and software, is the property of Lou Capece Music Distributors or its licensors and is protected by copyright and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                Lou Capece Music Distributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business interruption, arising from your use of our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Modifications to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to this page. Your continued use of the service after any changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms and Conditions, please contact us:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Lou Capece Music Distributors</strong><br />
                  Phone: <a href="tel:18003215584" className="text-blue-600 hover:underline">1 (800) 321-5584</a><br />
                  Email: <a href="mailto:marketing@musicsupplies.com" className="text-blue-600 hover:underline">marketing@musicsupplies.com</a>
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These terms shall be governed by and construed in accordance with the laws of the state where Lou Capece Music Distributors is incorporated, without regard to conflict of law principles.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <Link 
                to="/" 
                className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 sm:mb-0"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back to Login
              </Link>
              <div className="text-sm text-gray-500">
                <Link to="/privacy-policy" className="hover:underline mx-2">Privacy Policy</Link> |
                <Link to="/sms-communications" className="hover:underline mx-2">SMS Policy</Link> |
                <Link to="/email-communications" className="hover:underline mx-2">Email Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;
