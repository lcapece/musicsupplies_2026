import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';

interface StoredPaymentData {
  invoices: Array<{
    ivd: number;
    balance_owed: number;
    invoice_date: string;
    due_date: string;
    days_overdue: number;
  }>;
  total: number;
  accountNumber: string;
}

// Initialize Stripe - you'll need to add your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const PayInvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [paymentData, setPaymentData] = useState<StoredPaymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach'>('card');

  useEffect(() => {
    // Get payment data from sessionStorage
    const storedData = sessionStorage.getItem('overduePayment');
    if (storedData) {
      try {
        const data = JSON.parse(storedData) as StoredPaymentData;
        setPaymentData(data);
      } catch (err) {
        setError('Invalid payment data');
      }
    } else {
      setError('No payment data found. Please select invoices to pay.');
    }
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePayment = async () => {
    if (!paymentData || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Create a Stripe Checkout Session via your backend/edge function
      const { data, error: funcError } = await supabase.functions.invoke('create-invoice-payment-session', {
        body: {
          invoices: paymentData.invoices.map(inv => ({
            ivd: inv.ivd,
            amount: inv.balance_owed
          })),
          total: paymentData.total,
          accountNumber: user.accountNumber,
          customerEmail: user.email || user.email_address,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/pay-invoices`
        }
      });

      if (funcError) throw funcError;

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (stripe && data?.sessionId) {
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: data.sessionId
        });
        if (stripeError) throw stripeError;
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem('overduePayment');
    navigate('/');
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Payment Data</h2>
          <p className="text-slate-600 mb-6">{error || 'Please select invoices to pay from the reminder popup.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
          >
            Return to Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Pay Invoices</h1>
              <p className="text-indigo-200 mt-1">Secure payment powered by Stripe</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Invoice List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Selected Invoices</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {paymentData.invoices.length} invoice{paymentData.invoices.length > 1 ? 's' : ''} selected for payment
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {paymentData.invoices.map((invoice) => (
                  <div key={invoice.ivd} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg text-slate-800">#{invoice.ivd}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          invoice.days_overdue >= 60 ? 'bg-red-100 text-red-700' :
                          invoice.days_overdue >= 30 ? 'bg-orange-100 text-orange-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {invoice.days_overdue} days overdue
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        Invoice Date: {formatDate(invoice.invoice_date)} | Due: {formatDate(invoice.due_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-slate-800">{formatCurrency(invoice.balance_owed)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-8">
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <h2 className="text-lg font-bold">Payment Summary</h2>
              </div>

              <div className="p-6">
                {/* Payment Method Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-600 mb-3">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        paymentMethod === 'card'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <svg className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className={`text-sm font-medium ${paymentMethod === 'card' ? 'text-indigo-700' : 'text-slate-600'}`}>
                        Credit Card
                      </span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('ach')}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        paymentMethod === 'ach'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <svg className={`w-6 h-6 ${paymentMethod === 'ach' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className={`text-sm font-medium ${paymentMethod === 'ach' ? 'text-indigo-700' : 'text-slate-600'}`}>
                        Bank (ACH)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-slate-200 pt-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(paymentData.total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold text-slate-800">Total Due</span>
                    <span className="font-bold text-2xl text-emerald-600">{formatCurrency(paymentData.total)}</span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* Pay Button */}
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-emerald-500/25 disabled:shadow-none flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Pay {formatCurrency(paymentData.total)}
                    </>
                  )}
                </button>

                {/* Cancel Button */}
                <button
                  onClick={handleCancel}
                  className="w-full mt-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>

                {/* Security Note */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secured by Stripe
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PayInvoicesPage;
