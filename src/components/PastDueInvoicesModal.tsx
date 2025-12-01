import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CreditCard, Phone, FileText, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PastDueInvoice {
  ivd: number;
  invoice_date: string;
  amount_due: number;
  days_overdue: number;
}

interface PastDueInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountNumber: number;
  onPaymentComplete?: () => void;
}

interface CreditCardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: PastDueInvoice | null;
  onPaymentSuccess: () => void;
}

// Sandbox Credit Card Payment Modal
const CreditCardPaymentModal: React.FC<CreditCardPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showSandboxNotice, setShowSandboxNotice] = useState(false);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSandboxNotice(true);
  };

  const handleSandboxConfirm = () => {
    setProcessing(true);
    // Simulate processing delay
    setTimeout(() => {
      setProcessing(false);
      setShowSandboxNotice(false);
      onPaymentSuccess();
      onClose();
    }, 1500);
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-white" />
              <h2 className="text-xl font-semibold text-white">Payment Details</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sandbox Notice Modal */}
        {showSandboxNotice && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] rounded-2xl">
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-6 m-4 max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <h3 className="text-lg font-bold text-amber-800">Sandbox Mode</h3>
              </div>
              <p className="text-amber-700 mb-6">
                This is a <strong>sandbox demonstration only</strong> and there is no data saved in this operation.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSandboxNotice(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSandboxConfirm}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Invoice Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Invoice #{invoice.ivd}</span>
              <span className="text-xl font-bold text-gray-800">
                ${invoice.amount_due.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Credit Card Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl mt-4"
            >
              Pay ${invoice.amount_due.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </button>
          </form>

          {/* Security Notice */}
          <p className="text-xs text-gray-500 text-center mt-4">
            🔒 Your payment information is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

// Main Past Due Invoices Modal
const PastDueInvoicesModal: React.FC<PastDueInvoicesModalProps> = ({
  isOpen,
  onClose,
  accountNumber,
  onPaymentComplete
}) => {
  const [pastDueInvoices, setPastDueInvoices] = useState<PastDueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<PastDueInvoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fetch past due invoices for the account
  useEffect(() => {
    const fetchPastDueInvoices = async () => {
      if (!isOpen || !accountNumber) return;

      setLoading(true);
      setError(null);

      try {
        // Get all invoices for this account
        const { data: invoices, error: invoicesError } = await supabase
          .from('tbl_inv_headers')
          .select('ivd, invoice_date, shipping_charge, interest_charge')
          .eq('account_number', accountNumber)
          .eq('doc_type', 'Invoice');

        if (invoicesError) throw invoicesError;

        const pastDueList: PastDueInvoice[] = [];
        const today = new Date();

        for (const inv of invoices || []) {
          // Get line item totals
          const { data: details } = await supabase
            .from('tbl_inv_details')
            .select('qtyshipped, unitnet')
            .eq('ivd', inv.ivd);

          const lineTotal = (details || []).reduce((sum, d) =>
            sum + ((d.qtyshipped || 0) * (d.unitnet || 0)), 0);

          // Get payments
          const { data: payments } = await supabase
            .from('tbl_inv_payments')
            .select('paymentamount')
            .eq('invid', inv.ivd);

          const totalPaid = (payments || []).reduce((sum, p) =>
            sum + (p.paymentamount || 0), 0);

          const invoiceTotal = lineTotal + (inv.shipping_charge || 0) + (inv.interest_charge || 0);
          const amountDue = invoiceTotal - totalPaid;

          // Only include if there's an outstanding balance
          if (amountDue > 0.01) {
            const invoiceDate = new Date(inv.invoice_date);
            // Assuming Net 30 terms - invoice is past due 30 days after invoice date
            const dueDate = new Date(invoiceDate);
            dueDate.setDate(dueDate.getDate() + 30);

            const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            // Only include invoices that are actually past due (daysOverdue > 0)
            if (daysOverdue > 0) {
              pastDueList.push({
                ivd: inv.ivd,
                invoice_date: inv.invoice_date,
                amount_due: amountDue,
                days_overdue: daysOverdue
              });
            }
          }
        }

        // Sort by days overdue (most overdue first)
        pastDueList.sort((a, b) => b.days_overdue - a.days_overdue);
        setPastDueInvoices(pastDueList);

      } catch (err) {
        console.error('Error fetching past due invoices:', err);
        setError('Unable to load past due invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchPastDueInvoices();
  }, [isOpen, accountNumber]);

  const handlePayNow = (invoice: PastDueInvoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    // Remove the paid invoice from the list (simulated)
    setPastDueInvoices(prev => prev.filter(inv => inv.ivd !== selectedInvoice?.ivd));
    setSelectedInvoice(null);
    if (onPaymentComplete) {
      onPaymentComplete();
    }
  };

  // Separate invoices into 180+ days and regular past due
  const criticalInvoices = pastDueInvoices.filter(inv => inv.days_overdue >= 180);
  const regularPastDue = pastDueInvoices.filter(inv => inv.days_overdue < 180);
  const hasCriticalInvoices = criticalInvoices.length > 0;

  const totalPastDue = pastDueInvoices.reduce((sum, inv) => sum + inv.amount_due, 0);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate due date (30 days after invoice date)
  const getDueDate = (invoiceDate: string) => {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!isOpen) return null;

  // Don't show modal if no past due invoices
  if (!loading && pastDueInvoices.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className={`px-6 py-5 ${hasCriticalInvoices ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${hasCriticalInvoices ? 'bg-red-500/30' : 'bg-white/20'}`}>
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Past Due Invoices</h2>
                  <p className="text-white/80 text-sm">Account #{accountNumber}</p>
                </div>
              </div>
              {!hasCriticalInvoices && (
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Summary Bar */}
          <div className="bg-gray-50 px-6 py-3 border-b flex items-center justify-between">
            <span className="text-gray-600 font-medium">
              {pastDueInvoices.length} Invoice{pastDueInvoices.length !== 1 ? 's' : ''} Past Due
            </span>
            <span className="text-lg font-bold text-gray-800">
              Total: ${totalPastDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">{error}</div>
            ) : (
              <div className="space-y-4">
                {/* Critical Invoices Section (180+ days) */}
                {criticalInvoices.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-red-600 uppercase text-sm tracking-wide">
                        Critical - Over 180 Days Past Due
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {criticalInvoices.map((invoice) => (
                        <div
                          key={invoice.ivd}
                          className="bg-red-50 border-2 border-red-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-5 h-5 text-red-600" />
                                <span className="font-bold text-red-700 text-lg">
                                  Invoice #{invoice.ivd}
                                </span>
                                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                  {invoice.days_overdue} days overdue
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-red-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Due: {getDueDate(invoice.invoice_date)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-red-700 mb-2">
                                ${invoice.amount_due.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <button
                                onClick={() => handlePayNow(invoice)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                              >
                                <CreditCard className="w-4 h-4" />
                                Pay Now
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Past Due Invoices */}
                {regularPastDue.length > 0 && (
                  <div>
                    {criticalInvoices.length > 0 && (
                      <h3 className="font-semibold text-gray-600 uppercase text-sm tracking-wide mb-3">
                        Other Past Due Invoices
                      </h3>
                    )}
                    <div className="space-y-3">
                      {regularPastDue.map((invoice) => (
                        <div
                          key={invoice.ivd}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-gray-300 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-5 h-5 text-gray-500" />
                                <span className="font-semibold text-gray-800 text-lg">
                                  Invoice #{invoice.ivd}
                                </span>
                                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">
                                  {invoice.days_overdue} days overdue
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Due: {getDueDate(invoice.invoice_date)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-800 mb-2">
                                ${invoice.amount_due.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <button
                                onClick={() => handlePayNow(invoice)}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow hover:shadow-md flex items-center gap-2"
                              >
                                <CreditCard className="w-4 h-4" />
                                Pay Now
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t ${hasCriticalInvoices ? 'bg-red-50' : 'bg-gray-50'}`}>
            {hasCriticalInvoices ? (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 text-sm">
                  <strong>Past due amount over 180 days must be resolved before you can shop on musicsupplies.com.</strong>
                  <br />
                  Please call <a href="tel:1-800-321-5584" className="font-bold underline hover:no-underline">1-800-321-5584</a> for help.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-600 text-sm">
                  Please pay your past due invoices to maintain your account in good standing.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credit Card Payment Modal */}
      <CreditCardPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={selectedInvoice}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
};

export default PastDueInvoicesModal;
