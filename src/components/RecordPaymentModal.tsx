/**
 * RecordPaymentModal - Modal for recording manual payments against invoices
 *
 * Features:
 * - Invoice number display (read-only)
 * - Current balance display (calculated from invoice total minus existing payments)
 * - Payment Type dropdown (fed from ref_payment_types table)
 * - Payment Amount input with currency formatting and validation
 * - Payment Date picker (defaults to today)
 * - Payment Reference input (check number, transaction ID, etc.)
 * - Notes/memo field (optional)
 * - Overpayment warning with confirmation
 * - AJAX submission with loading states
 * - Success toast notifications
 *
 * Optimized for 1920x1080 desktop displays
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { usePaymentTypes, RefPaymentType } from '../hooks/useReferenceData';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber?: string;
  currentBalance: number;
  onPaymentRecorded?: () => void;
}

interface PaymentFormData {
  paymentType: string;
  paymentAmount: string;
  paymentDate: string;
  paymentReference: string;
  notes: string;
}

interface ValidationErrors {
  paymentType?: string;
  paymentAmount?: string;
  paymentDate?: string;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  currentBalance,
  onPaymentRecorded
}) => {
  // Fetch payment types from reference table
  const { data: paymentTypes, loading: loadingTypes } = usePaymentTypes();

  // Form state
  const [formData, setFormData] = useState<PaymentFormData>({
    paymentType: '',
    paymentAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentReference: '',
    notes: ''
  });

  // UI state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [showOverpaymentWarning, setShowOverpaymentWarning] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Animation states
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Ref for amount input focus
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Handle modal open/close animations
  useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        paymentType: '',
        paymentAmount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentReference: '',
        notes: ''
      });
      setErrors({});
      setShowOverpaymentWarning(false);
      setToast(null);

      // Focus amount input after a brief delay
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Parse currency string to number
  const parseCurrencyInput = (value: string): number => {
    // Remove everything except digits and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Handle input changes
  const handleInputChange = useCallback((field: keyof PaymentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Check for overpayment when amount changes
    if (field === 'paymentAmount') {
      const amount = parseCurrencyInput(value);
      setShowOverpaymentWarning(amount > currentBalance && currentBalance > 0);
    }
  }, [errors, currentBalance]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.paymentType) {
      newErrors.paymentType = 'Payment type is required';
    }

    const amount = parseCurrencyInput(formData.paymentAmount);
    if (!formData.paymentAmount || amount <= 0) {
      newErrors.paymentAmount = 'Payment amount must be greater than zero';
    }

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (confirmOverpayment: boolean = false) => {
    if (!validateForm()) return;

    const amount = parseCurrencyInput(formData.paymentAmount);

    // Check for overpayment and show warning if not confirmed
    if (!confirmOverpayment && amount > currentBalance && currentBalance > 0) {
      setShowOverpaymentWarning(true);
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      // Get the payment type description for storage
      const selectedType = paymentTypes.find(pt => pt.code === formData.paymentType);
      const paymentTypeDescription = selectedType?.description || formData.paymentType;

      // Insert payment record into tbl_inv_payments
      const { error: insertError } = await supabase
        .from('tbl_inv_payments')
        .insert([{
          invid: invoiceId,
          paymenttype: paymentTypeDescription,
          paymentamount: amount,
          paymentdate: formData.paymentDate,
          paymentreference: formData.paymentReference || null
        }]);

      if (insertError) throw insertError;

      // Show success toast
      setToast({
        type: 'success',
        message: `Payment of ${formatCurrency(amount)} recorded successfully`
      });

      // Notify parent and close after delay
      setTimeout(() => {
        onPaymentRecorded?.();
        handleClose();
      }, 1500);

    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to record payment'
      });
    } finally {
      setSaving(false);
    }
  }, [formData, currentBalance, invoiceId, paymentTypes, onPaymentRecorded, validateForm]);

  // Handle modal close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !saving) {
      handleClose();
    }
  }, [saving, handleClose]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape' && !saving) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, handleClose]);

  if (!isOpen && !isClosing) return null;

  const paymentAmount = parseCurrencyInput(formData.paymentAmount);
  const newBalance = currentBalance - paymentAmount;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Modal Container */}
      <div
        className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl transform transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Record Payment</h2>
                <p className="text-emerald-100 text-sm">
                  Invoice #{invoiceNumber || invoiceId}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={saving}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Balance</span>
              <div className={`text-2xl font-bold ${currentBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(currentBalance)}
              </div>
            </div>
            {paymentAmount > 0 && (
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">After Payment</span>
                <div className={`text-2xl font-bold ${newBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrency(Math.max(0, newBalance))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {toast.message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-6 space-y-5">
          {/* Payment Amount - Primary Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">$</span>
              <input
                ref={amountInputRef}
                type="text"
                value={formData.paymentAmount}
                onChange={(e) => handleInputChange('paymentAmount', e.target.value)}
                placeholder="0.00"
                className={`w-full pl-10 pr-4 py-3 text-xl font-semibold text-right border-2 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  errors.paymentAmount
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200'
                }`}
              />
            </div>
            {errors.paymentAmount && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.paymentAmount}
              </p>
            )}
          </div>

          {/* Overpayment Warning */}
          {showOverpaymentWarning && !toast && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Overpayment Detected</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This payment ({formatCurrency(paymentAmount)}) exceeds the current balance ({formatCurrency(currentBalance)}).
                    This will result in a credit of {formatCurrency(Math.abs(newBalance))}.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSubmit(true)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      Proceed Anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, paymentAmount: currentBalance.toFixed(2) }));
                        setShowOverpaymentWarning(false);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-700 text-sm font-medium rounded-lg border border-amber-300 transition-colors"
                    >
                      Use Balance ({formatCurrency(currentBalance)})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Type & Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Payment Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.paymentType}
                  onChange={(e) => handleInputChange('paymentType', e.target.value)}
                  disabled={loadingTypes}
                  className={`w-full px-4 py-3 border-2 rounded-xl appearance-none cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    errors.paymentType
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200'
                  } ${loadingTypes ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}
                >
                  <option value="">Select type...</option>
                  {paymentTypes.map((pt: RefPaymentType) => (
                    <option key={pt.id} value={pt.code}>
                      {pt.description}
                    </option>
                  ))}
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {errors.paymentType && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.paymentType}
                </p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  errors.paymentDate
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200'
                }`}
              />
              {errors.paymentDate && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.paymentDate}
                </p>
              )}
            </div>
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Reference / Check Number
            </label>
            <input
              type="text"
              value={formData.paymentReference}
              onChange={(e) => handleInputChange('paymentReference', e.target.value)}
              placeholder="Enter check number, transaction ID, etc."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl transition-all duration-150 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:ring-offset-1"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add any additional notes..."
              rows={2}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl resize-none transition-all duration-150 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:ring-offset-1"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={() => handleSubmit()}
            disabled={saving || toast?.type === 'success'}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Record Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
