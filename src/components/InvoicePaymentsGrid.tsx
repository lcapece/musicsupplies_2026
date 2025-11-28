import React from 'react';
import type { InvoicePayment } from '../types';

interface InvoicePaymentsGridProps {
  payments: InvoicePayment[];
  loading?: boolean;
}

const InvoicePaymentsGrid: React.FC<InvoicePaymentsGridProps> = ({
  payments,
  loading = false
}) => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Calculate total payments
  const totalPayments = payments.reduce((sum, p) => sum + (p.paymentamount || 0), 0);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Payments</h3>
        </div>
        <div className="p-4 flex items-center justify-center">
          <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-sm text-gray-500">Loading payments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Payments
          {payments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({payments.length} record{payments.length !== 1 ? 's' : ''})
            </span>
          )}
        </h3>
        <span className="text-sm font-bold text-green-600">
          {formatCurrency(totalPayments)}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {payments.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No payments recorded
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <tr key={payment.paymentid} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">
                    {formatDate(payment.paymentdate)}
                  </td>
                  <td className="px-2 py-1.5 text-gray-700">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      payment.paymenttype === 'Credit Card'
                        ? 'bg-blue-100 text-blue-800'
                        : payment.paymenttype === 'Check'
                        ? 'bg-green-100 text-green-800'
                        : payment.paymenttype === 'Cash'
                        ? 'bg-yellow-100 text-yellow-800'
                        : payment.paymenttype === 'ACH'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {payment.paymenttype}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-900 font-medium whitespace-nowrap">
                    {formatCurrency(payment.paymentamount)}
                  </td>
                  <td className="px-2 py-1.5 text-gray-500 truncate max-w-[100px]" title={payment.paymentreference || ''}>
                    {payment.paymentreference || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default InvoicePaymentsGrid;
