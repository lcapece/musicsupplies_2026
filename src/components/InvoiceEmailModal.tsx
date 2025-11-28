import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { InvoiceHeader, AccountLookup } from '../types';

interface InvoiceEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceHeader | null;
  account: AccountLookup | null;
  amountDue: number;
}

interface CcRecipient {
  id: string;
  email: string;
  label?: string;
}

const InvoiceEmailModal: React.FC<InvoiceEmailModalProps> = ({
  isOpen,
  onClose,
  invoice,
  account,
  amountDue
}) => {
  const [toEmail, setToEmail] = useState('');
  const [ccRecipients, setCcRecipients] = useState<CcRecipient[]>([]);
  const [newCcEmail, setNewCcEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when modal opens with new invoice
  useEffect(() => {
    if (isOpen && account) {
      setToEmail(account.email_address || '');
      setCcRecipients([]);
      setNewCcEmail('');
      setCustomMessage('');
      setCustomSubject('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, account]);

  const displayNumber = invoice ?
    (invoice.ivd >= 750000 && invoice.ivd <= 770000 ? `WB${invoice.ivd}` : String(invoice.ivd))
    : '';

  const addCcRecipient = () => {
    if (!newCcEmail.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCcEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Check for duplicates
    if (ccRecipients.some(r => r.email.toLowerCase() === newCcEmail.trim().toLowerCase())) {
      setError('This email is already in the CC list');
      return;
    }

    if (newCcEmail.trim().toLowerCase() === toEmail.toLowerCase()) {
      setError('CC email cannot be the same as the primary recipient');
      return;
    }

    setCcRecipients(prev => [...prev, { id: `cc-${Date.now()}`, email: newCcEmail.trim() }]);
    setNewCcEmail('');
    setError(null);
  };

  const removeCcRecipient = (id: string) => {
    setCcRecipients(prev => prev.filter(r => r.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCcRecipient();
    }
  };

  const handleSend = async () => {
    if (!invoice?.ivd) {
      setError('No invoice selected');
      return;
    }

    if (!toEmail.trim()) {
      setError('Please enter a recipient email address');
      return;
    }

    // Validate primary email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const { data, error: sendError } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId: invoice.ivd,
          toEmail: toEmail.trim(),
          ccEmails: ccRecipients.map(r => r.email),
          subject: customSubject.trim() || undefined,
          customMessage: customMessage.trim() || undefined
        }
      });

      if (sendError) {
        throw sendError;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send email');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Error sending invoice email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email');
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
        <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold">Email Invoice</h2>
                  <p className="text-blue-100 text-sm">Invoice #{displayNumber}</p>
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
                <h4 className="font-semibold text-emerald-800">Email Sent Successfully!</h4>
                <p className="text-sm text-emerald-600">Invoice has been emailed to {toEmail}</p>
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

              {/* Primary Recipient */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Send To <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* CC Recipients */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  CC (Carbon Copy)
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Add salespeople, managers, or other recipients who should receive a copy
                </p>

                {/* CC Input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="email"
                    value={newCcEmail}
                    onChange={(e) => setNewCcEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add email address..."
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={addCcRecipient}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                </div>

                {/* CC List */}
                {ccRecipients.length > 0 && (
                  <div className="space-y-2">
                    {ccRecipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                          <span className="text-sm text-blue-800">{recipient.email}</span>
                        </div>
                        <button
                          onClick={() => removeCcRecipient(recipient.id)}
                          className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                        >
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Subject (Optional) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Subject Line <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder={`Invoice #${displayNumber} from Lou Capece Music Distributors`}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Custom Message (Optional) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Personal Message <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal message to include with the invoice..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          {!success && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Sent from: marketing@mg.musicsupplies.com
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
                  disabled={sending || !toEmail.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:shadow-none flex items-center gap-2"
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
                      Send Invoice
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

export default InvoiceEmailModal;
