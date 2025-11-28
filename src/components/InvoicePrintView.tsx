import React, { useRef } from 'react';
import type { InvoiceHeader, InvoiceDetail, InvoicePayment, AccountLookup } from '../types';

interface InvoicePrintViewProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceHeader | null;
  details: InvoiceDetail[];
  payments: InvoicePayment[];
  account: AccountLookup | null;
}

const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({
  isOpen,
  onClose,
  invoice,
  details,
  payments,
  account
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  // Calculate totals
  const subtotal = details.reduce((sum, d) => {
    const qty = typeof d.qtyshipped === 'number' ? d.qtyshipped : parseFloat(String(d.qtyordered)) || 0;
    return sum + (qty * (d.unitnet || 0));
  }, 0);
  const totalPayments = payments.reduce((sum, p) => sum + (p.paymentamount || 0), 0);
  const grandTotal = subtotal + (invoice.shipping_charge || 0) + (invoice.interest_charge || 0);
  const amountDue = grandTotal - totalPayments;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  // Determine display info
  const isWebOrder = invoice.ivd >= 750000 && invoice.ivd <= 770000;
  const displayNumber = isWebOrder ? `WB${invoice.ivd}` : String(invoice.ivd);
  const displayLabel = isWebOrder ? 'WEB ORDER' : invoice.doc_type?.toUpperCase() || 'INVOICE';

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the invoice');
      return;
    }

    // Write the print content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${displayNumber}</title>
        <style>
          @page {
            size: letter;
            margin: 0.5in;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #1a1a1a;
            background: white;
          }

          .invoice-container {
            max-width: 8in;
            margin: 0 auto;
            padding: 0.25in;
          }

          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #1e40af;
          }

          .company-info h1 {
            font-size: 22px;
            color: #1e40af;
            margin-bottom: 4px;
          }

          .company-info h1 span {
            color: #dc2626;
          }

          .company-info h2 {
            font-size: 14px;
            color: #1e40af;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .company-info p {
            font-size: 10px;
            color: #4b5563;
            line-height: 1.5;
          }

          .invoice-meta {
            text-align: right;
          }

          .invoice-meta .label {
            font-size: 12px;
            color: #4a90a4;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .invoice-meta .number {
            font-size: 28px;
            font-weight: 700;
            color: #1e293b;
            margin: 4px 0;
          }

          .invoice-meta .details {
            font-size: 10px;
            color: #64748b;
          }

          .invoice-meta .details span {
            display: block;
            margin: 2px 0;
          }

          /* Proforma Warning */
          .proforma-warning {
            background-color: #fef3c7;
            border: 2px solid #dc2626;
            padding: 12px;
            text-align: center;
            margin-bottom: 20px;
          }

          .proforma-warning h3 {
            color: #dc2626;
            font-size: 14px;
            font-weight: 700;
          }

          /* Address Section */
          .address-section {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
          }

          .address-box {
            flex: 1;
            border: 2px solid #1e293b;
            padding: 12px;
            min-height: 110px;
          }

          .address-box h4 {
            font-size: 11px;
            font-weight: 700;
            text-decoration: underline;
            margin-bottom: 8px;
            color: #1e293b;
          }

          .address-box p {
            font-size: 10px;
            line-height: 1.5;
          }

          .address-box .name {
            font-weight: 700;
            margin-bottom: 4px;
          }

          /* Info Row */
          .info-row {
            display: flex;
            gap: 12px;
            margin-bottom: 15px;
            flex-wrap: wrap;
          }

          .info-item {
            background: #f1f5f9;
            padding: 8px 12px;
            border-radius: 4px;
          }

          .info-item .label {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .info-item .value {
            font-size: 11px;
            font-weight: 600;
            color: #1e293b;
          }

          /* Items Table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          .items-table thead th {
            background: #1e40af;
            color: white;
            padding: 8px 6px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid #1e40af;
          }

          .items-table tbody td {
            padding: 6px;
            border: 1px solid #e2e8f0;
            font-size: 10px;
          }

          .items-table tbody tr:nth-child(even) {
            background: #f8fafc;
          }

          .items-table .qty {
            text-align: center;
          }

          .items-table .price {
            text-align: right;
          }

          .items-table .partnumber {
            font-weight: 600;
            color: #1e40af;
          }

          /* Totals Section */
          .totals-section {
            display: flex;
            justify-content: space-between;
            gap: 40px;
          }

          .notes-box {
            flex: 1;
            max-width: 250px;
          }

          .notes-box h4 {
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 6px;
          }

          .notes-box p {
            font-size: 10px;
            color: #475569;
            background: #f8fafc;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
          }

          .totals-table {
            width: 280px;
          }

          .totals-table table {
            width: 100%;
            border-collapse: collapse;
          }

          .totals-table td {
            padding: 6px 10px;
            font-size: 11px;
            border: 1px solid #e2e8f0;
          }

          .totals-table .label {
            text-align: right;
            font-weight: 600;
            color: #64748b;
          }

          .totals-table .value {
            text-align: right;
            font-weight: 700;
            color: #1e293b;
          }

          .totals-table .total-row {
            background: #1e40af;
          }

          .totals-table .total-row td {
            color: white;
            font-size: 13px;
          }

          /* Payment Method */
          .payment-method {
            margin-top: 20px;
            padding: 10px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
          }

          .payment-method strong {
            color: #1e293b;
          }

          /* Footer */
          .footer {
            margin-top: 30px;
            text-align: center;
            padding-top: 15px;
            border-top: 2px solid #e2e8f0;
          }

          .footer p {
            font-size: 10px;
            color: #64748b;
          }

          .footer .thank-you {
            font-size: 12px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 4px;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 flex items-center justify-center">
        <div className="relative w-full max-w-4xl h-full max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold">Print Invoice</h2>
                <p className="text-slate-300 text-sm">Invoice #{displayNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-6 py-2 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
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

          {/* Print Preview */}
          <div className="flex-1 overflow-auto bg-slate-200 p-6">
            <div className="bg-white shadow-xl mx-auto" style={{ maxWidth: '8.5in' }}>
              {/* Printable Content */}
              <div ref={printRef} className="p-8">
                <div className="invoice-container">
                  {/* Header */}
                  <div className="header flex justify-between items-start mb-5 pb-4 border-b-4 border-blue-700">
                    <div className="company-info">
                      <h1 className="text-2xl font-bold text-blue-700 mb-1">
                        Music<span className="text-red-600">Supplies</span>.com
                      </h1>
                      <h2 className="text-sm font-semibold text-blue-700 mb-2">Lou Capece Music Distributors</h2>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        2555 North Jerusalem Rd.<br />
                        East Meadow, NY 11554<br />
                        Toll Free 1(800) 321-5584<br />
                        marketing@loucapecemusic.com
                      </p>
                    </div>
                    <div className="invoice-meta text-right">
                      <div className="text-xs font-semibold text-cyan-600 uppercase tracking-wider">{displayLabel}</div>
                      <div className="text-3xl font-bold text-gray-800 my-1">#{displayNumber}</div>
                      <div className="text-xs text-gray-500">
                        <span className="block"><strong>Date:</strong> {invoice.invoice_date}</span>
                        {invoice.account_number && <span className="block"><strong>Acct #:</strong> {invoice.account_number}</span>}
                        {invoice.customer_po && <span className="block"><strong>PO #:</strong> {invoice.customer_po}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Proforma Warning */}
                  {(!invoice.shipping_charge || invoice.shipping_charge === 0) && (
                    <div className="proforma-warning bg-yellow-100 border-2 border-red-500 p-3 text-center mb-5">
                      <h3 className="text-red-600 font-bold text-sm">
                        PROFORMA INVOICE - SHIPPING NOT YET CALCULATED
                      </h3>
                    </div>
                  )}

                  {/* Address Section */}
                  <div className="address-section flex gap-5 mb-5">
                    <div className="address-box flex-1 border-2 border-gray-800 p-3 min-h-[100px]">
                      <h4 className="text-xs font-bold underline mb-2">Bill To:</h4>
                      <p className="text-xs">
                        <span className="name font-bold">{account?.acct_name || 'N/A'}</span><br />
                        {account?.address}<br />
                        {account?.city}, {account?.state} {account?.zip}<br />
                        {account?.contact && <>Attn: {account.contact}<br /></>}
                        {account?.phone}
                      </p>
                    </div>
                    <div className="address-box flex-1 border-2 border-gray-800 p-3 min-h-[100px]">
                      <h4 className="text-xs font-bold underline mb-2">Ship To:</h4>
                      <p className="text-xs">
                        <span className="name font-bold">{invoice.st_name || account?.acct_name || 'N/A'}</span><br />
                        {invoice.st_address || account?.address}<br />
                        {invoice.st_city || account?.city}, {invoice.st_state || account?.state} {invoice.st_zip || account?.zip}<br />
                        {invoice.st_contact && <>Attn: {invoice.st_contact}<br /></>}
                        {invoice.st_phone}
                      </p>
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="info-row flex gap-3 mb-4 flex-wrap">
                    <div className="info-item bg-gray-100 px-3 py-2 rounded">
                      <div className="text-[8px] text-gray-500 uppercase tracking-wider">Terms</div>
                      <div className="text-xs font-semibold">{invoice.terms || 'N/A'}</div>
                    </div>
                    <div className="info-item bg-gray-100 px-3 py-2 rounded">
                      <div className="text-[8px] text-gray-500 uppercase tracking-wider">Ship Via</div>
                      <div className="text-xs font-semibold">{invoice.ship_method || 'N/A'}</div>
                    </div>
                    <div className="info-item bg-gray-100 px-3 py-2 rounded">
                      <div className="text-[8px] text-gray-500 uppercase tracking-wider">Sales Rep</div>
                      <div className="text-xs font-semibold">{invoice.salesman || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="items-table w-full border-collapse mb-5">
                    <thead>
                      <tr style={{ backgroundColor: '#1e40af' }}>
                        <th className="text-white p-2 text-[9px] font-semibold uppercase border border-blue-700" style={{ width: '8%' }}>Qty Ord</th>
                        <th className="text-white p-2 text-[9px] font-semibold uppercase border border-blue-700" style={{ width: '8%' }}>Qty Shp</th>
                        <th className="text-white p-2 text-[9px] font-semibold uppercase border border-blue-700 text-left" style={{ width: '18%' }}>Part Number</th>
                        <th className="text-white p-2 text-[9px] font-semibold uppercase border border-blue-700 text-left">Description</th>
                        <th className="text-white p-2 text-[9px] font-semibold uppercase border border-blue-700 text-right" style={{ width: '12%' }}>Unit Net</th>
                        <th className="text-white p-2 text-[9px] font-semibold uppercase border border-blue-700 text-right" style={{ width: '12%' }}>Extended</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((item, index) => {
                        const qty = typeof item.qtyshipped === 'number' ? item.qtyshipped : parseFloat(String(item.qtyordered)) || 0;
                        const extended = qty * (item.unitnet || 0);
                        return (
                          <tr key={item.linekey || index} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                            <td className="p-1.5 border border-gray-200 text-center text-[10px]">{item.qtyordered || 0}</td>
                            <td className="p-1.5 border border-gray-200 text-center text-[10px]">{qty}</td>
                            <td className="p-1.5 border border-gray-200 text-[10px] font-semibold text-blue-700">{item.partnumber || ''}</td>
                            <td className="p-1.5 border border-gray-200 text-[10px]">{item.description || ''}</td>
                            <td className="p-1.5 border border-gray-200 text-right text-[10px]">{formatCurrency(item.unitnet || 0)}</td>
                            <td className="p-1.5 border border-gray-200 text-right text-[10px] font-medium">{formatCurrency(extended)}</td>
                          </tr>
                        );
                      })}
                      {/* Add empty rows to fill space if few items */}
                      {details.length < 10 && Array(10 - details.length).fill(0).map((_, i) => (
                        <tr key={`empty-${i}`} className={((details.length + i) % 2 === 1) ? 'bg-gray-50' : ''}>
                          <td className="p-1.5 border border-gray-200 text-center text-[10px]">&nbsp;</td>
                          <td className="p-1.5 border border-gray-200 text-center text-[10px]">&nbsp;</td>
                          <td className="p-1.5 border border-gray-200 text-[10px]">&nbsp;</td>
                          <td className="p-1.5 border border-gray-200 text-[10px]">&nbsp;</td>
                          <td className="p-1.5 border border-gray-200 text-[10px]">&nbsp;</td>
                          <td className="p-1.5 border border-gray-200 text-[10px]">&nbsp;</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Section */}
                  <div className="totals-section flex justify-between gap-10">
                    <div className="notes-box flex-1 max-w-[250px]">
                      {invoice.gen_comments && (
                        <>
                          <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Notes:</h4>
                          <p className="text-[10px] text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                            {invoice.gen_comments}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="totals-table" style={{ width: '260px' }}>
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr>
                            <td className="p-1.5 border border-gray-200 text-right font-semibold text-gray-500 text-xs">Subtotal:</td>
                            <td className="p-1.5 border border-gray-200 text-right font-bold text-xs">{formatCurrency(subtotal)}</td>
                          </tr>
                          {invoice.shipping_charge > 0 && (
                            <tr>
                              <td className="p-1.5 border border-gray-200 text-right font-semibold text-gray-500 text-xs">Shipping:</td>
                              <td className="p-1.5 border border-gray-200 text-right font-bold text-xs">{formatCurrency(invoice.shipping_charge)}</td>
                            </tr>
                          )}
                          {invoice.interest_charge > 0 && (
                            <tr>
                              <td className="p-1.5 border border-gray-200 text-right font-semibold text-gray-500 text-xs">Interest:</td>
                              <td className="p-1.5 border border-gray-200 text-right font-bold text-xs">{formatCurrency(invoice.interest_charge)}</td>
                            </tr>
                          )}
                          {totalPayments > 0 && (
                            <tr>
                              <td className="p-1.5 border border-gray-200 text-right font-semibold text-green-600 text-xs">Payments:</td>
                              <td className="p-1.5 border border-gray-200 text-right font-bold text-green-600 text-xs">-{formatCurrency(totalPayments)}</td>
                            </tr>
                          )}
                          <tr style={{ backgroundColor: '#1e40af' }}>
                            <td className="p-2 border border-blue-700 text-right font-semibold text-white text-sm">Amount Due:</td>
                            <td className="p-2 border border-blue-700 text-right font-bold text-white text-base">{formatCurrency(amountDue)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="payment-method mt-5 p-2.5 border border-gray-200 bg-gray-50 text-xs">
                    <strong>Payment Terms:</strong> {invoice.terms || 'N/A'}
                    {invoice.terms?.toLowerCase().includes('net') && ' - Payment due within terms of invoice date.'}
                  </div>

                  {/* Footer */}
                  <div className="footer mt-8 text-center pt-4 border-t-2 border-gray-200">
                    <p className="thank-you text-sm font-semibold text-blue-700 mb-1">Thank you for your business!</p>
                    <p className="text-[10px] text-gray-500">
                      Lou Capece Music Distributors • MusicSupplies.com • 1-800-321-5584
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Preview how the invoice will appear when printed
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-semibold rounded-lg transition-all shadow-lg shadow-slate-500/25 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintView;
