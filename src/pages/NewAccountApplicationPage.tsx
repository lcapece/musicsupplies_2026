import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Assuming supabase client is here

interface TradeReference {
  name: string; // Will be "Distributor Name"
  phone: string;
  addn_info: string; // Was 'contact', now "Optional: Addn Info"
}

interface ApplicationFormData {
  business_name: string;
  business_type: string;
  other_retailer_type_description: string;
  business_address: string;
  business_city: string;
  business_state: string;
  business_zip: string;
  business_website: string;
  business_email: string;
  business_phone: string;
  contact_name: string;
  contact_title: string;
  state_registration: string; // For State of Certificate Issue
  resale_cert_number: string; // For Resale Certificate Number
  year_established: string;
  estimated_annual_purchases: string;
  requesting_credit_line: boolean;
  trade_references: TradeReference[]; // Will always be 3 items if requesting_credit_line is true
  notes: string; // General notes, can include 'other retailer type' if not a dedicated field
}

const initialFormData: ApplicationFormData = {
  business_name: '',
  business_type: '',
  other_retailer_type_description: '',
  business_address: '',
  business_city: '',
  business_state: '',
  business_zip: '',
  business_website: '',
  business_email: '',
  business_phone: '',
  contact_name: '',
  contact_title: '',
  state_registration: '',
  resale_cert_number: '',
  year_established: '',
  estimated_annual_purchases: '',
  requesting_credit_line: false,
  trade_references: [ // Initialize with 3 empty references
    { name: '', phone: '', addn_info: '' },
    { name: '', phone: '', addn_info: '' },
    { name: '', phone: '', addn_info: '' },
  ],
  notes: '',
};

const retailerTypes = ["Single Store", "Chain of Stores", "Web Only", "Other"];

const NewAccountApplicationPage: React.FC = () => {
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const navigate = useNavigate();

  useEffect(() => {
    if (formData.requesting_credit_line) {
      // Ensure 3 trade reference objects exist if requesting credit
      if (formData.trade_references.length !== 3) {
        setFormData(prev => ({
          ...prev,
          trade_references: [
            prev.trade_references[0] || { name: '', phone: '', addn_info: '' },
            prev.trade_references[1] || { name: '', phone: '', addn_info: '' },
            prev.trade_references[2] || { name: '', phone: '', addn_info: '' },
          ]
        }));
      }
    } else {
      // Optionally, reset to 3 empty ones if credit line is unchecked, or leave as is
      // For simplicity, let's ensure it's always an array of 3, but they'll only be submitted if requesting_credit_line is true
       setFormData(prev => ({
         ...prev,
         trade_references: [
            prev.trade_references[0] || { name: '', phone: '', addn_info: '' },
            prev.trade_references[1] || { name: '', phone: '', addn_info: '' },
            prev.trade_references[2] || { name: '', phone: '', addn_info: '' },
         ]
       }));
    }
  }, [formData.requesting_credit_line]);

  const sendApplicationNotificationSMS = async () => {
    try {
      setSmsStatus('sending');

      const message = `New Account Application Submitted!\nBusiness: ${formData.business_name}\nContact: ${formData.contact_name}\nPhone: ${formData.business_phone}\nEmail: ${formData.business_email}\nCredit Requested: ${formData.requesting_credit_line ? 'Yes' : 'No'}`;

      const { data, error } = await supabase.functions.invoke('send-test-sms', {
        body: {
          accountNumber: 'New Application',
          accountName: formData.business_name,
          smsNumber: '+15164550980', // Your admin SMS number
          message: message
        }
      });

      if (error) {
        console.error('Error sending application SMS:', error);
        setSmsStatus('failed');
        return;
      }

      setSmsStatus('sent');
    } catch (error) {
      console.error('Error sending application SMS:', error);
      setSmsStatus('failed');
    }
  };

  // Format phone number as (999) 999-9999
  const formatPhoneNumber = (value: string): string => {
    // Strip all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format the phone number
    if (phoneNumber.length === 0) {
      return '';
    } else if (phoneNumber.length <= 3) {
      return `(${phoneNumber}`;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === 'business_phone' || name === 'contact_phone') {
      // Apply phone number formatting for phone fields
      setFormData(prev => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTradeReferenceChange = (index: number, field: keyof TradeReference, value: string) => {
    const updatedReferences = [...formData.trade_references];
    
    // Apply phone number formatting if it's a phone field
    if (field === 'phone') {
      updatedReferences[index] = { ...updatedReferences[index], [field]: formatPhoneNumber(value) };
    } else {
      updatedReferences[index] = { ...updatedReferences[index], [field]: value };
    }
    
    setFormData(prev => ({ ...prev, trade_references: updatedReferences }));
  };

  // addTradeReference and removeTradeReference are no longer needed as we always show 3 rows.
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    setFormSuccess(null);
    setSmsStatus('idle');

    // Basic validation
    if (formData.requesting_credit_line) {
      const filledReferences = formData.trade_references.filter(ref => ref.name.trim() !== '' && ref.phone.trim() !== '');
      if (filledReferences.length < 2) {
        setFormError("Please provide at least 2 complete trade references (Distributor Name and Phone Number) if requesting credit.");
        setIsLoading(false);
        return;
      }
    }
    if (formData.business_type === "Other" && !formData.other_retailer_type_description.trim()) {
        setFormError("Please describe your business type if 'Other' is selected.");
        setIsLoading(false);
        return;
    }

    const dataToSubmit: any = {
      company_name: formData.business_name,
      contact_name: formData.contact_name,
      contact_email: formData.business_email,
      contact_phone: formData.business_phone,
      business_address: formData.business_address,
      city: formData.business_city,
      state: formData.business_state,
      zip_code: formData.business_zip,
      business_type: formData.business_type,
      tax_id: formData.resale_cert_number,
      years_in_business: formData.year_established,
      annual_revenue_range: formData.estimated_annual_purchases,
      primary_music_focus: 'Not Specified', // Placeholder for missing form field
      how_did_you_hear: 'Not Specified', // Placeholder for missing form field
      additional_info: `Contact Title: ${formData.contact_title}\nState Registration: ${formData.state_registration}\nWebsite: ${formData.business_website}`,
      notes: formData.business_type === "Other"
        ? `Retailer Type: Other - ${formData.other_retailer_type_description}. ${formData.notes}`
        : formData.notes,
    };

    if (formData.requesting_credit_line) {
        const references_info = formData.trade_references
            .filter(ref => ref.name && ref.phone)
            .map(ref => `${ref.name} (${ref.phone}) - ${ref.addn_info}`)
            .join(', ');
        dataToSubmit.additional_info += `\n\nCredit Line Requested. References: [${references_info}]`;
    }

    try {
      const { error } = await supabase.from('new_account_applications').insert([dataToSubmit]);
      if (error) {
        console.error("Error submitting application:", error);
        setFormError(`Submission failed: ${error.message}`);
      } else {
        setFormSuccess("Application submitted successfully! We will get back to you soon.");
        
        // Send SMS notification after successful submission
        await sendApplicationNotificationSMS();
        
        setFormData(initialFormData); // Reset form
        // navigate('/application-success'); // Optional: redirect to a success page
      }
    } catch (err: any) {
      console.error("Unexpected error submitting application:", err);
      setFormError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render input fields for brevity
  const renderInput = (name: keyof ApplicationFormData, label: string, type: string = "text", required: boolean = false, placeholder?: string) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
      <input
        type={type}
        id={name}
        name={name}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        value={String(formData[name] || '')}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">New Account Application</h1>
        
        {formSuccess && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md">
            {formSuccess}
            
            {/* SMS Notification Status */}
            <div className="mt-3 p-3 rounded-lg border bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Admin SMS Notification:</span>
                {smsStatus === 'idle' && (
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
                    <span className="text-sm text-green-600">Admin notified via SMS</span>
                  </div>
                )}
                {smsStatus === 'failed' && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span className="text-sm text-red-600">SMS notification failed</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {formError && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">{formError}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Business Information</h2>
            {renderInput("business_name", "Business Name", "text", true)}
            {renderInput("business_address", "Business Address", "text", true)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {renderInput("business_city", "City", "text", true)}
              {renderInput("business_state", "State", "text", true)}
              {renderInput("business_zip", "Zip Code", "text", true)}
            </div>
      <div className="mb-4">
        <label htmlFor="business_phone" className="block text-sm font-medium text-gray-700 mb-1">Business Phone<span className="text-red-500">*</span></label>
        <input
          type="tel"
          id="business_phone"
          name="business_phone"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={formData.business_phone}
          onChange={handleChange}
          required={true}
          placeholder="(999) 999-9999"
          maxLength={14} // (999) 999-9999 = 14 characters
        />
      </div>
            {renderInput("business_email", "Business Email", "email", true)}
            {renderInput("business_website", "Business Website (Optional)", "url")}
            {renderInput("year_established", "Year Established", "text", true)}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Contact Information</h2>
            {renderInput("contact_name", "Primary Contact Name", "text", true)}
            {renderInput("contact_title", "Primary Contact Title", "text", true)}
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Retailer & Tax Information</h2>
            <div className="mb-4">
                <label htmlFor="business_type" className="block text-sm font-medium text-gray-700 mb-1">Type of Retailer<span className="text-red-500">*</span></label>
                <select 
                    id="business_type" 
                    name="business_type" 
                    value={formData.business_type} 
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">Select type...</option>
                    {retailerTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
            {formData.business_type === "Other" && renderInput("other_retailer_type_description", "If Other, please describe", "text", true)}
            {renderInput("resale_cert_number", "Resale Certificate Number", "text", true)}
            {renderInput("state_registration", "State of Certificate Issue", "text", true)}
            {renderInput("estimated_annual_purchases", "Estimated Annual Purchases (USD - Optional)", "text")}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Credit Information</h2>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="requesting_credit_line"
                  checked={formData.requesting_credit_line}
                  onChange={handleChange}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Request Credit Line</span>
              </label>
            </div>

            {formData.requesting_credit_line && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-md font-semibold text-gray-600">Trade References</h3>
                  <p className="text-sm text-gray-500">Minimum of 2 trade references are needed.</p>
                </div>
                {formData.trade_references.map((ref, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-md mb-3 space-y-2">
                    <h4 className="text-sm font-medium text-gray-500">Reference {index + 1}</h4>
                    <input
                      type="text"
                      placeholder="Distributor Name"
                      value={ref.name}
                      onChange={(e) => handleTradeReferenceChange(index, 'name', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      // required={index < 2} // Validation handled in handleSubmit
                    />
                    <input
                      type="tel"
                      placeholder="(999) 999-9999"
                      value={ref.phone}
                      onChange={(e) => handleTradeReferenceChange(index, 'phone', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      maxLength={14} // (999) 999-9999 = 14 characters
                      // required={index < 2} // Validation handled in handleSubmit
                    />
                    <input
                      type="text"
                      placeholder="Optional: Addn Info"
                      value={ref.addn_info}
                      onChange={(e) => handleTradeReferenceChange(index, 'addn_info', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                ))}
                {/* Add/Remove buttons are removed as we always show 3 rows */}
              </div>
            )}
          </section>
          
          <section>
             <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Additional Notes</h2>
             <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any other information you'd like to provide?"
             />
          </section>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NewAccountApplicationPage;
