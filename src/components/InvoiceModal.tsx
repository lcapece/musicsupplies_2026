import React, { useState, useEffect, useCallback } from 'react';
import AccountLookupDropdown from './AccountLookupDropdown';
import InvoiceDetailsGrid from './InvoiceDetailsGrid';
import InvoiceEmailModal from './InvoiceEmailModal';
import InvoiceSmsModal from './InvoiceSmsModal';
import InvoicePrintView from './InvoicePrintView';
import RecordPaymentModal from './RecordPaymentModal';
import { usePaymentTerms, useShipMethods } from '../hooks/useReferenceData';
import { useInvoice, SHIP_VIA_OPTIONS, TERMS_OPTIONS, DOC_TYPE_OPTIONS } from '../hooks/useInvoice';
import type { AccountLookup, InvoiceHeader, InvoiceDetail, StaffMember, InvoiceDocType } from '../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: number;
  accountNumber?: number;
  onSave?: (invoice: InvoiceHeader) => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  accountNumber: initialAccountNumber,
  onSave
}) => {
  const {
    invoice,
    details,
    payments,
    account,
    loading,
    error,
    fetchInvoice,
    createInvoice,
    updateInvoice,
    fetchFirstInvoice,
    fetchLastInvoice,
    fetchNextInvoice,
    fetchPrevInvoice,
    fetchAccount,
    fetchAmountOwed,
    fetchSalespeople,
    saveDetails,
    calculateSubtotal,
    calculateGrandTotal,
    calculateAmountDue
  } = useInvoice();

  // Form state
  const [formData, setFormData] = useState<Partial<InvoiceHeader>>({
    invoice_date: new Date().toISOString().split('T')[0],
    doc_type: 'Invoice',
    terms: 'Net 30 Days',
    ship_method: 'FedEx Ground',
    shipping_charge: 0,
    interest_charge: 0
  });

  const [localDetails, setLocalDetails] = useState<InvoiceDetail[]>([]);
  const [salespeople, setSalespeople] = useState<StaffMember[]>([]);
  const [amountOwed, setAmountOwed] = useState<number>(0);
  const [disableOwesCheck, setDisableOwesCheck] = useState(false);
  const [isNewInvoice, setIsNewInvoice] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Fetch reference data from database tables with fallback to static options
  const { data: paymentTermsRef } = usePaymentTerms();
  const { data: shipMethodsRef } = useShipMethods();

  // Use reference data if available, otherwise fallback to static options
  const termsOptions = paymentTermsRef.length > 0
    ? paymentTermsRef.map(t => t.description)
    : TERMS_OPTIONS;
  const shipViaOptions = shipMethodsRef.length > 0
    ? shipMethodsRef.map(s => s.description)
    : SHIP_VIA_OPTIONS;

  // Load salespeople on mount
  useEffect(() => {
    if (isOpen) {
      loadSalespeople();
    }
  }, [isOpen]);

  // Load invoice or initialize new
  useEffect(() => {
    if (isOpen) {
      if (invoiceId) {
        fetchInvoice(invoiceId);
        setIsNewInvoice(false);
      } else {
        setIsNewInvoice(true);
        setFormData({
          invoice_date: new Date().toISOString().split('T')[0],
          doc_type: 'Invoice',
          terms: 'Net 30 Days',
          ship_method: 'FedEx Ground',
          shipping_charge: 0,
          interest_charge: 0,
          account_number: initialAccountNumber || undefined
        });
        setLocalDetails([]);

        if (initialAccountNumber) {
          handleAccountSelect({ account_number: initialAccountNumber } as AccountLookup);
        }
      }
    }
  }, [isOpen, invoiceId, initialAccountNumber]);

  // Sync form data with loaded invoice
  useEffect(() => {
    if (invoice) {
      setFormData({ ...invoice });
    }
  }, [invoice]);

  // Sync details
  useEffect(() => {
    setLocalDetails(details);
  }, [details]);

  // Update amount owed when account changes
  useEffect(() => {
    if (formData.account_number && !disableOwesCheck) {
      loadAmountOwed(formData.account_number);
    } else {
      setAmountOwed(0);
    }
  }, [formData.account_number, disableOwesCheck]);

  const loadSalespeople = async () => {
    const data = await fetchSalespeople();
    setSalespeople(data);
  };

  const loadAmountOwed = async (accountNum: number) => {
    const owed = await fetchAmountOwed(accountNum);
    setAmountOwed(owed);
  };

  const handleAccountSelect = useCallback(async (selectedAccount: AccountLookup | null) => {
    if (!selectedAccount) {
      setFormData(prev => ({
        ...prev,
        account_number: undefined,
        terms: 'Net 30 Days',
        salesman: undefined,
        st_name: undefined,
        st_address: undefined,
        st_city: undefined,
        st_state: undefined,
        st_zip: undefined,
        st_contact: undefined,
        st_phone: undefined
      }));
      return;
    }

    const fullAccount = await fetchAccount(selectedAccount.account_number);
    if (!fullAccount) return;

    setFormData(prev => ({
      ...prev,
      account_number: fullAccount.account_number,
      terms: fullAccount.terms || prev.terms,
      salesman: fullAccount.salesman || prev.salesman,
      st_name: fullAccount.acct_name,
      st_address: fullAccount.address,
      st_city: fullAccount.city,
      st_state: fullAccount.state,
      st_zip: fullAccount.zip,
      st_contact: fullAccount.contact,
      st_phone: fullAccount.phone,
      st_mobile: fullAccount.mobile_phone,
      st_email: fullAccount.email_address
    }));
  }, [fetchAccount]);

  const handleInputChange = (field: keyof InvoiceHeader, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDetailsChange = (newDetails: InvoiceDetail[]) => {
    setLocalDetails(newDetails);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      if (isNewInvoice) {
        const newId = await createInvoice(formData);
        if (newId) {
          if (localDetails.length > 0) {
            const detailsWithIvd = localDetails.map(d => ({ ...d, ivd: newId }));
            await saveDetails(newId, detailsWithIvd);
          }
          await fetchInvoice(newId);
          setIsNewInvoice(false);
          setSaveStatus('saved');
          onSave?.(invoice!);
        } else {
          setSaveStatus('error');
        }
      } else if (invoice?.ivd) {
        const headerSuccess = await updateInvoice(invoice.ivd, formData);
        const detailsSuccess = await saveDetails(invoice.ivd, localDetails);
        const success = headerSuccess && detailsSuccess;
        setSaveStatus(success ? 'saved' : 'error');
        if (success) onSave?.(invoice);
      }
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleNewInvoice = () => {
    setIsNewInvoice(true);
    setLocalDetails([]);
    setFormData({
      invoice_date: new Date().toISOString().split('T')[0],
      doc_type: 'Invoice',
      terms: 'Net 30 Days',
      ship_method: 'FedEx Ground',
      shipping_charge: 0,
      interest_charge: 0
    });
  };

  const handleNavigation = async (action: 'first' | 'last' | 'next' | 'prev') => {
    switch (action) {
      case 'first': await fetchFirstInvoice(); break;
      case 'last': await fetchLastInvoice(); break;
      case 'next': if (invoice?.ivd) await fetchNextInvoice(invoice.ivd); break;
      case 'prev': if (invoice?.ivd) await fetchPrevInvoice(invoice.ivd); break;
    }
    setIsNewInvoice(false);
  };

  const handleSearchInvoice = () => {
    const id = parseInt(searchValue.trim());
    if (!isNaN(id) && id > 0) {
      fetchInvoice(id);
      setIsNewInvoice(false);
      setSearchValue('');
    }
  };

  // Calculate totals
  const subtotal = calculateSubtotal(localDetails);
  const grandTotal = calculateGrandTotal(subtotal, formData.shipping_charge || 0, formData.interest_charge || 0, 0);
  const totalPayments = payments.reduce((sum, p) => sum + (p.paymentamount || 0), 0);
  const amountDue = calculateAmountDue(grandTotal, totalPayments);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Format phone number as (000)000-0000
  const formatPhoneDisplay = (phone: string | undefined): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1, 4)})${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-start">
      {/* Modal Container - True full screen */}
      <div className="bg-white w-screen h-screen flex flex-col">

        {/* Header Bar - Dense */}
        <div className="flex items-center justify-between px-3 py-1 bg-gray-100 border-b border-black">
          <div className="flex items-center gap-3">
            {/* Navigation buttons */}
            <div className="flex gap-1">
              <button onClick={() => handleNavigation('first')} disabled={loading} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 border border-gray-400 disabled:opacity-50" title="First">|&lt;</button>
              <button onClick={() => handleNavigation('prev')} disabled={loading} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 border border-gray-400 disabled:opacity-50" title="Previous">&lt;</button>
              <button onClick={() => handleNavigation('next')} disabled={loading} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 border border-gray-400 disabled:opacity-50" title="Next">&gt;</button>
              <button onClick={() => handleNavigation('last')} disabled={loading} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 border border-gray-400 disabled:opacity-50" title="Last">&gt;|</button>
            </div>
            <button onClick={handleNewInvoice} disabled={loading} className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white border border-green-800 disabled:opacity-50">+ New</button>
            {/* Search */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchInvoice()}
                placeholder="Go to #"
                className="w-20 px-2 py-1 text-xs border border-gray-400"
              />
              <button onClick={handleSearchInvoice} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 border border-gray-400">Go</button>
            </div>
            {/* Doc Type selector */}
            <select
              value={formData.doc_type || 'Invoice'}
              onChange={(e) => handleInputChange('doc_type', e.target.value as InvoiceDocType)}
              className="px-2 py-1 text-xs border border-gray-400 bg-white"
            >
              {DOC_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Invoice Number - Right aligned */}
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold">
              {isNewInvoice ? 'NEW' : `Invoice #${invoice?.ivd || ''}`}
            </span>
            {saveStatus === 'saving' && <span className="text-xs text-blue-600">Saving...</span>}
            {saveStatus === 'saved' && <span className="text-xs text-green-600">Saved</span>}
            {saveStatus === 'error' && <span className="text-xs text-red-600">Error</span>}
            <button onClick={onClose} className="px-3 py-1 text-lg font-bold hover:bg-gray-200">&times;</button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-3 py-1 bg-red-100 border-b border-red-400 text-red-700 text-xs">
            Error: {error}
          </div>
        )}

        {/* Row 1: Account, Date, Ship Via, Terms, Salesperson */}
        <div className="flex gap-2 px-3 py-2 bg-gray-50 border-b border-gray-300">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Account</label>
            <AccountLookupDropdown
              value={formData.account_number || null}
              onChange={handleAccountSelect}
              disabled={loading}
              autoFocus={isNewInvoice}
            />
          </div>
          <div className="w-28">
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Invoice Date</label>
            <input
              type="date"
              value={formData.invoice_date || ''}
              onChange={(e) => handleInputChange('invoice_date', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-400"
            />
          </div>
          <div className="w-36">
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Ship Via</label>
            <select
              value={formData.ship_method || ''}
              onChange={(e) => handleInputChange('ship_method', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-400 bg-white"
            >
              <option value="">--</option>
              {shipViaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Terms</label>
            <select
              value={formData.terms || ''}
              onChange={(e) => handleInputChange('terms', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-400 bg-white"
            >
              {termsOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Salesperson</label>
            <select
              value={formData.salesman || ''}
              onChange={(e) => handleInputChange('salesman', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-400 bg-white"
            >
              <option value="">--</option>
              {salespeople.map(sp => (
                <option key={sp.username} value={sp.username}>{sp.user_full_name || sp.username}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Customer PO</label>
            <input
              type="text"
              value={formData.customer_po || ''}
              onChange={(e) => handleInputChange('customer_po', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-400"
            />
          </div>
          {amountOwed > 0 && !disableOwesCheck && (
            <div className="w-28">
              <label className="block text-[10px] font-bold text-red-600 mb-0.5">Acct Owes</label>
              <div className="px-2 py-1 text-xs font-bold text-red-600 bg-red-50 border border-red-400">
                {formatCurrency(amountOwed)}
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Bill To & Ship To - Side by side, compact */}
        <div className="flex gap-3 px-3 py-1 border-b border-gray-300">
          {/* Bill To - with gridlines */}
          <div className="flex-1 border-2 border-black p-1.5">
            <div className="text-xs font-bold underline mb-0.5">Bill To:</div>
            {account ? (
              <div className="text-[11px] leading-tight">
                <div className="font-semibold border-b border-gray-300 py-0.5 h-[22px]">{account.acct_name}</div>
                <div className="border-b border-gray-300 py-0.5 h-[22px]">{account.address || '\u00A0'}</div>
                <div className="border-b border-gray-300 py-0.5 h-[22px]">
                  {account.city || account.state || account.zip
                    ? `${account.city || ''}${account.city && account.state ? ', ' : ''}${account.state || ''} ${account.zip || ''}`.trim()
                    : '\u00A0'}
                </div>
                <div className="border-b border-gray-300 py-0.5 h-[22px]">
                  {account.contact ? `Attn: ${account.contact}` : '\u00A0'}
                </div>
                <div className="py-0.5 flex h-[22px]">
                  <span className="w-[140px] min-w-[140px]">Ph: {formatPhoneDisplay(account.phone) || '-'}</span>
                  <span className="w-[140px] min-w-[140px]">Cell: {formatPhoneDisplay(account.mobile_phone) || '-'}</span>
                  <span className="flex-1 truncate">Email: {account.email_address || '-'}</span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] leading-tight">
                <div className="font-semibold border-b border-gray-300 py-0.5 h-[22px] text-gray-400 italic">Select account</div>
                <div className="border-b border-gray-300 py-0.5 h-[22px]">&nbsp;</div>
                <div className="border-b border-gray-300 py-0.5 h-[22px]">&nbsp;</div>
                <div className="border-b border-gray-300 py-0.5 h-[22px]">&nbsp;</div>
                <div className="py-0.5 flex h-[22px]">
                  <span className="w-[140px] min-w-[140px]">Ph: -</span>
                  <span className="w-[140px] min-w-[140px]">Cell: -</span>
                  <span className="flex-1">Email: -</span>
                </div>
              </div>
            )}
          </div>

          {/* Ship To - with gridlines - matching Bill To structure exactly */}
          <div className="flex-1 border-2 border-black p-1.5">
            <div className="text-xs font-bold underline mb-0.5">Ship To:</div>
            <div className="text-[11px] leading-tight">
              <input
                type="text"
                value={formData.st_name || ''}
                onChange={(e) => handleInputChange('st_name', e.target.value)}
                placeholder="Name"
                className="w-full px-1 py-0.5 text-[11px] border border-gray-400 h-[22px] font-semibold"
              />
              <input
                type="text"
                value={formData.st_address || ''}
                onChange={(e) => handleInputChange('st_address', e.target.value)}
                placeholder="Address"
                className="w-full px-1 py-0.5 text-[11px] border border-gray-400 border-t-0 h-[22px]"
              />
              <div className="flex h-[22px]">
                <input
                  type="text"
                  value={formData.st_city || ''}
                  onChange={(e) => handleInputChange('st_city', e.target.value)}
                  placeholder="City"
                  className="flex-1 px-1 py-0.5 text-[11px] border border-gray-400 border-t-0"
                />
                <input
                  type="text"
                  value={formData.st_state || ''}
                  onChange={(e) => handleInputChange('st_state', e.target.value)}
                  placeholder="ST"
                  className="w-10 px-1 py-0.5 text-[11px] border border-gray-400 border-t-0 border-l-0 text-center"
                />
                <input
                  type="text"
                  value={formData.st_zip || ''}
                  onChange={(e) => handleInputChange('st_zip', e.target.value)}
                  placeholder="ZIP"
                  className="w-16 px-1 py-0.5 text-[11px] border border-gray-400 border-t-0 border-l-0"
                />
              </div>
              <input
                type="text"
                value={formData.st_contact || ''}
                onChange={(e) => handleInputChange('st_contact', e.target.value)}
                placeholder="Attn / Contact"
                className="w-full px-1 py-0.5 text-[11px] border border-gray-400 border-t-0 h-[22px]"
              />
              <div className="flex h-[22px]">
                <input
                  type="text"
                  value={formData.st_phone || ''}
                  onChange={(e) => handleInputChange('st_phone', e.target.value)}
                  placeholder="Phone"
                  className="w-[140px] min-w-[140px] px-1 py-0.5 text-[11px] border border-gray-400 border-t-0"
                />
                <input
                  type="text"
                  value={formData.st_mobile || ''}
                  onChange={(e) => handleInputChange('st_mobile', e.target.value)}
                  placeholder="Cell"
                  className="w-[140px] min-w-[140px] px-1 py-0.5 text-[11px] border border-gray-400 border-t-0 border-l-0"
                />
                <input
                  type="email"
                  value={formData.st_email || ''}
                  onChange={(e) => handleInputChange('st_email', e.target.value)}
                  placeholder="Email"
                  className="flex-1 px-1 py-0.5 text-[11px] border border-gray-400 border-t-0 border-l-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Line Items Table - Takes most space */}
        <div className="flex-1 px-3 py-2 overflow-hidden">
          <InvoiceDetailsGrid
            invoiceId={invoice?.ivd || null}
            details={localDetails}
            onChange={handleDetailsChange}
            loading={loading}
            readOnly={false}
          />
        </div>

        {/* Row 4: Payment History & Totals Section */}
        <div className="flex justify-between items-start px-3 py-2 border-t border-gray-300 bg-gray-50">
          {/* Payment History Log */}
          <div className="flex-1 mr-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-gray-600">Payment History</label>
              {!isNewInvoice && invoice?.ivd && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-2 py-0.5 text-[9px] bg-green-600 hover:bg-green-700 text-white rounded"
                >
                  + Add Payment
                </button>
              )}
            </div>
            <div className="border border-black bg-white max-h-24 overflow-y-auto">
              <table className="w-full text-[10px] border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-0.5 text-left border-b border-black font-bold">Date</th>
                    <th className="px-2 py-0.5 text-left border-b border-black font-bold">Type</th>
                    <th className="px-2 py-0.5 text-right border-b border-black font-bold">Amount</th>
                    <th className="px-2 py-0.5 text-left border-b border-black font-bold">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-2 text-center text-gray-400 italic">
                        No payments recorded
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment, idx) => (
                      <tr key={payment.paymentid || idx} className="hover:bg-gray-50 border-b border-gray-200 last:border-b-0">
                        <td className="px-2 py-0.5">
                          {payment.paymentdate ? new Date(payment.paymentdate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-2 py-0.5">{payment.paymenttype || '-'}</td>
                        <td className="px-2 py-0.5 text-right font-semibold text-green-700">
                          {formatCurrency(payment.paymentamount || 0)}
                        </td>
                        <td className="px-2 py-0.5 text-gray-500 truncate max-w-[100px]" title={payment.reference || ''}>
                          {payment.reference || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Small notes field */}
            <div className="mt-1">
              <input
                type="text"
                value={formData.gen_comments || ''}
                onChange={(e) => handleInputChange('gen_comments', e.target.value)}
                className="w-full px-2 py-0.5 text-[10px] border border-gray-400"
                placeholder="Invoice notes..."
              />
            </div>
          </div>

          {/* Totals Table */}
          <table className="border-collapse text-xs">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-right border border-black font-semibold">Subtotal:</td>
                <td className="px-3 py-1 text-right border border-black w-28">{formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-right border border-black font-semibold">Shipping:</td>
                <td className="px-1 py-0.5 border border-black">
                  <input
                    type="number"
                    value={formData.shipping_charge || 0}
                    onChange={(e) => handleInputChange('shipping_charge', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-0.5 text-right text-xs border-0"
                    step="0.01"
                    min="0"
                  />
                </td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-right border border-black font-semibold">Interest:</td>
                <td className="px-1 py-0.5 border border-black">
                  <input
                    type="number"
                    value={formData.interest_charge || 0}
                    onChange={(e) => handleInputChange('interest_charge', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-0.5 text-right text-xs border-0"
                    step="0.01"
                    min="0"
                  />
                </td>
              </tr>
              <tr className="bg-gray-100">
                <td className="px-3 py-1 text-right border border-black font-bold">Grand Total:</td>
                <td className="px-3 py-1 text-right border border-black font-bold text-sm">{formatCurrency(grandTotal)}</td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-right border border-black font-semibold text-green-700">Payments:</td>
                <td className="px-3 py-1 text-right border border-black text-green-700">({formatCurrency(totalPayments)})</td>
              </tr>
              <tr className="bg-yellow-50">
                <td className="px-3 py-1 text-right border-2 border-black font-bold">Amount Due:</td>
                <td className={`px-3 py-1 text-right border-2 border-black font-bold text-sm ${amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(amountDue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer: Action Buttons */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-t border-black">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading || saveStatus === 'saving'}
              className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border border-blue-800 disabled:opacity-50"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs bg-gray-300 hover:bg-gray-400 border border-gray-500"
            >
              Cancel
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmailModal(true)}
              disabled={isNewInvoice || !invoice?.ivd}
              className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 border border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Email
            </button>
            <button
              onClick={() => setShowSmsModal(true)}
              disabled={isNewInvoice || !invoice?.ivd}
              className="px-3 py-1.5 text-xs bg-green-100 hover:bg-green-200 border border-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SMS
            </button>
            <button
              onClick={() => setShowPrintView(true)}
              disabled={isNewInvoice || !invoice?.ivd}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Print
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={isNewInvoice || !invoice?.ivd}
              className="px-3 py-1.5 text-xs bg-yellow-100 hover:bg-yellow-200 border border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Record Payment
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <InvoiceEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        invoice={invoice}
        account={account}
        amountDue={amountDue}
      />
      <InvoiceSmsModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        invoice={invoice}
        account={account}
        amountDue={amountDue}
      />
      <InvoicePrintView
        isOpen={showPrintView}
        onClose={() => setShowPrintView(false)}
        invoice={invoice}
        details={localDetails}
        payments={payments}
        account={account}
      />
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoiceId={invoice?.ivd || 0}
        invoiceNumber={invoice?.ivd?.toString()}
        currentBalance={amountDue}
        onPaymentRecorded={() => {
          if (invoice?.ivd) {
            fetchInvoice(invoice.ivd);
          }
        }}
      />
    </div>
  );
};

export default InvoiceModal;
