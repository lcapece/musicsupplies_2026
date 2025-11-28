import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Privacy Policy</h1>
        
        <div className="prose prose-lg text-gray-700">
          <p><strong>Last Updated:</strong> June 17, 2025</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">1. Introduction</h2>
          <p>
            Welcome to MusicSupplies.com ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us at <a href="mailto:marketing@musicsupplies.com" className="text-blue-600 hover:underline">marketing@musicsupplies.com</a>.
          </p>
          <p>
            This privacy notice describes how we might use your information if you:
            Visit our website at [Your Website URL]
            Engage with us in other related ways ― including any sales, marketing, or events.
          </p>
          <p>In this privacy notice, if we refer to:</p>
          <ul>
            <li><strong>"Website,"</strong> we are referring to any website of ours that references or links to this policy.</li>
            <li><strong>"Services,"</strong> we are referring to our Website, and other related services, including any sales, marketing, or events.</li>
          </ul>
          <p>The purpose of this privacy notice is to explain to you in the clearest way possible what information we collect, how we use it, and what rights you have in relation to it. If there are any terms in this privacy notice that you do not agree with, please discontinue use of our Services immediately.</p>

          <h2 className="text-xl font-semibold mt-6 mb-2">2. What Information Do We Collect?</h2>
          <p>
            We collect personal information that you voluntarily provide to us when you register on the Website, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Website (such as posting messages in our forums or entering contests, giveaways or surveys) or otherwise when you contact us.
          </p>
          <p>
            The personal information that we collect depends on the context of your interactions with us and the Website, the choices you make and the products and features you use. The personal information we collect may include the following:
          </p>
          <ul>
            <li><strong>Account Data:</strong> Account number, company name, contact name, billing address, shipping address, email address, phone number, and password.</li>
            <li><strong>Order Data:</strong> Details about products purchased, order history, pricing, and payment method (e.g., credit card on file, net-10 open account).</li>
            <li><strong>Communication Data:</strong> Information you provide when you communicate with us via email, phone, or other channels.</li>
            <li><strong>Usage Data:</strong> Information about how you use our Website, such as your IP address, browser type, device information, pages viewed, and access times.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">3. How Do We Use Your Information?</h2>
          <p>
            We use personal information collected via our Website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations. We indicate the specific processing grounds we rely on next to each purpose listed below.
          </p>
          <p>We use the information we collect or receive:</p>
          <ul>
            <li><strong>To facilitate account creation and logon process.</strong> If you choose to link your account with us to a third-party account (such as your Google or Facebook account), we use the information you allowed us to collect from those third parties to facilitate account creation and logon process.</li>
            <li><strong>To post testimonials.</strong> We post testimonials on our Website that may contain personal information. Prior to posting a testimonial, we will obtain your consent to use your name and the content of the testimonial. If you wish to update, or delete your testimonial, please contact us at <a href="mailto:marketing@musicsupplies.com" className="text-blue-600 hover:underline">marketing@musicsupplies.com</a> and be sure to include your name, testimonial location, and contact information.</li>
            <li><strong>Request feedback.</strong> We may use your information to request feedback and to contact you about your use of our Website.</li>
            <li><strong>To enable user-to-user communications.</strong> We may use your information in order to enable user-to-user communications with each user's consent.</li>
            <li><strong>To manage user accounts.</strong> We may use your information for the purposes of managing our account and keeping it in working order.</li>
            <li><strong>To send administrative information to you.</strong> We may use your personal information to send you product, service and new feature information and/or information about changes to our terms, conditions, and policies.</li>
            <li><strong>To protect our Services.</strong> We may use your information as part of our efforts to keep our Website safe and secure (for example, for fraud monitoring and prevention).</li>
            <li><strong>To enforce our terms, conditions and policies for business purposes, to comply with legal and regulatory requirements or in connection with our contract.</strong></li>
            <li><strong>To respond to legal requests and prevent harm.</strong> If we receive a subpoena or other legal request, we may need to inspect the data we hold to determine how to respond.</li>
            <li><strong>Fulfill and manage your orders.</strong> We may use your information to fulfill and manage your orders, payments, returns, and exchanges made through the Website.</li>
            <li><strong>Administer prize draws and competitions.</strong> We may use your information to administer prize draws and competitions when you elect to participate in our competitions.</li>
            <li><strong>To deliver and facilitate delivery of services to the user.</strong> We may use your information to provide you with the requested service.</li>
            <li><strong>To respond to user inquiries/offer support to users.</strong> We may use your information to respond to your inquiries and solve any potential issues you might have with the use of our Services.</li>
            <li><strong>To send you marketing and promotional communications.</strong> We and/or our third-party marketing partners may use the personal information you send to us for our marketing purposes, if this is in accordance with your marketing preferences. For example, when expressing an interest in obtaining information about us or our Website, subscribing to marketing or otherwise contacting us, we will collect personal information from you. You can opt-out of our marketing emails at any time (see the "WHAT ARE YOUR PRIVACY RIGHTS?" below).</li>
            <li><strong>Deliver targeted advertising to you.</strong> We may use your information to develop and display personalized content and advertising (and work with third parties who do so) tailored to your interests and/or location and to measure its effectiveness.</li>
            <li><strong>For other business purposes.</strong> We may use your information for other Business Purposes, such as data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns and to evaluate and improve our Website, products, marketing and your experience.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">4. Will Your Information Be Shared With Anyone?</h2>
          <p>
            We may process or share your data that we hold based on the following legal basis:
          </p>
          <ul>
            <li><strong>Consent:</strong> We may process your data if you have given us specific consent to use your personal information for a specific purpose.</li>
            <li><strong>Legitimate Interests:</strong> We may process your data when it is reasonably necessary to achieve our legitimate business interests.</li>
            <li><strong>Performance of a Contract:</strong> Where we have entered into a contract with you, we may process your personal information to fulfill the terms of our contract.</li>
            <li><strong>Legal Obligations:</strong> We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process, such as in response to a court order or a subpoena (including in response to public authorities to meet national security or law enforcement requirements).</li>
            <li><strong>Vital Interests:</strong> We may disclose your information where we believe it is necessary to investigate, prevent, or take action regarding potential violations of our policies, suspected fraud, situations involving potential threats to the safety of any person and illegal activities, or as evidence in litigation in which we are involved.</li>
          </ul>
          <p>More specifically, we may need to process your data or share your personal information in the following situations:</p>
          <ul>
            <li><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
            <li><strong>Vendors, Consultants and Other Third-Party Service Providers.</strong> We may share your data with third-party vendors, service providers, contractors or agents who perform services for us or on our behalf and require access to such information to do that work. Examples include: payment processing, data analysis, email delivery, hosting services, customer service and marketing efforts. We may allow selected third parties to use tracking technology on the Website, which will enable them to collect data about how you interact with the Website over time. This information may be used to, among other things, analyze and track data, determine the popularity of certain content, events and activities, and better understand online activity. Unless described in this Notice, we do not share, sell, rent or trade any of your information with third parties for their promotional purposes.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-2">5. How Long Do We Keep Your Information?</h2>
          <p>
            We keep your information for as long as necessary to fulfill the purposes outlined in this privacy notice unless otherwise required by law. This means we will retain your personal information for the period necessary to provide you with the services you have requested, to comply with our legal obligations, resolve disputes, and enforce our agreements.
          </p>
          <p>
            When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize it, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">6. How Do We Keep Your Information Safe?</h2>
          <p>
            We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security, and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Website is at your own risk. You should only access the Website within a secure environment.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">7. What Are Your Privacy Rights?</h2>
          <p>
            In some regions (like the European Economic Area), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; (iv) if applicable, to data portability; and (v) to object to the processing of your personal information. In certain circumstances, you may also have the right to lodge a complaint with your local data protection supervisory authority.
          </p>
          <p>
            We will consider and act upon any request in accordance with applicable data protection laws.
          </p>
          <p>
            If you are a resident in the European Economic Area and you believe we are unlawfully processing your personal information, you also have the right to complain to your local data protection supervisory authority. You can find their contact details here: <a href="http://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">http://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm</a>.
          </p>
          <p>
            If you are a resident in California, you are provided with specific rights regarding access to your personal information.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">8. Controls for Do-Not-Track Features</h2>
          <p>
            Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track (“DNT”) feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">9. Updates To This Notice</h2>
          <p>
            We may update this privacy notice from time to time. The updated version will be indicated by an updated "Last Updated" date and the updated version will be effective as soon as it is accessible.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-2">10. How Can You Contact Us About This Notice?</h2>
          <p>
            If you have questions or comments about this notice, you may email us at <a href="mailto:marketing@musicsupplies.com" className="text-blue-600 hover:underline">marketing@musicsupplies.com</a> or by post to:
            Lou Capece Music Distributors
            2555 North Jerusalem Road, East Meadow NY 11554
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

export default PrivacyPolicyPage;
