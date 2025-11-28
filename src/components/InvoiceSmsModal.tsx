import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { InvoiceHeader, AccountLookup } from '../types';

interface InvoiceSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceHeader | null;
  account: AccountLookup | null;
  amountDue: number;
}

// Helper to format phone for display
function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  }
  return phone;
}

const InvoiceSmsModal: React.FC<InvoiceSmsModalProps> = ({
  isOpen,
  onClose,
  invoice,
  account,
  amountDue
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [includePaymentLink, setIncludePaymentLink] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [messagePreview, setMessagePreview] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && account) {
      // Prefer mobile_phone, fallback to regular phone
      const phone = account.mobile_phone || account.phone || '';
      setPhoneNumber(phone);
      setIncludePaymentLink(true);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, account]);

  // Update message preview
  useEffect(() => {
    if (invoice) {
      const isWebOrder = invoice.ivd >= 750000 && invoice.ivd <= 770000;
      const displayNumber = isWebOrder ? `WB${invoice.ivd}` : String(invoice.ivd);
      const companyShort = account?.acct_name ? account.acct_name.substring(0, 20) : 'Customer';

      let preview = `Lou Capece Music: Invoice #${displayNumber} for ${companyShort}`;
      preview += ` - Amount Due: $${amountDue.toFixed(2)}`;

      if (includePaymentLink && amountDue > 0) {
        preview += ` Pay at: musicsupplies.com/pay-invoice`;
      }

      // If too long, use shorter version
      if (preview.length > 160) {
        preview = `Lou Capece: Invoice #${displayNumber} - $${amountDue.toFixed(2)} due`;
        if (includePaymentLink && amountDue > 0) {
          preview += ` musicsupplies.com/pay-invoice`;
        }
      }

      setMessagePreview(preview);
    }
  }, [invoice, account, amountDue, includePaymentLink]);

  const displayNumber = invoice ?
    (invoice.ivd >= 750000 && invoice.ivd <= 770000 ? `WB${invoice.ivd}` : String(invoice.ivd))
    : '';

  const handleSend = async () => {
    if (!invoice?.ivd) {
      setError('No invoice selected');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    // Validate phone number (at least 10 digits)
    const digits = phoneNumber.replace(/[^0-9]/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const { data, error: sendError } = await supabase.functions.invoke('send-invoice-sms', {
        body: {
          invoiceId: invoice.ivd,
          phoneNumber: phoneNumber.trim(),
          includePaymentLink
        }
      });

      if (sendError) {
        throw sendError;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send SMS');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Error sending invoice SMS:', err);
      setError(err instanceof Error ? err.message : 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold">Text Invoice</h2>
                  <p className="text-emerald-100 text-sm">Invoice #{displayNumber}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-emerald-800">SMS Sent Successfully!</h4>
                <p className="text-sm text-emerald-600">Invoice notification sent to {formatPhoneDisplay(phoneNumber)}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Body */}
          {!success && (
            <div className="p-6 space-y-5">
              {/* Invoice Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Customer</div>
                    <div className="font-semibold text-slate-800">{account?.acct_name || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">Amount Due</div>
                    <div className="font-bold text-lg text-slate-800">
                      ${amountDue.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">
                  US numbers only. Will be formatted automatically.
                </p>
              </div>

              {/* Include Payment Link Toggle */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div>
                  <div className="font-semibold text-slate-700 text-sm">Include Payment Link</div>
                  <div className="text-xs text-slate-500">Add link to pay invoice online</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludePaymentLink(!includePaymentLink)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    includePaymentLink ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      includePaymentLink ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Message Preview */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Message Preview
                </label>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-sm text-emerald-800 whitespace-pre-wrap">
                    {messagePreview}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={`${messagePreview.length > 160 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {messagePreview.length} / 160 characters
                    </span>
                    {messagePreview.length > 160 && (
                      <span className="text-amber-600 font-medium">
                        (Will send as {Math.ceil(messagePreview.length / 153)} messages)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {!success && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Sent from: +1(833) 829-1653
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !phoneNumber.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 disabled:shadow-none flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send SMS
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceSmsModal;
