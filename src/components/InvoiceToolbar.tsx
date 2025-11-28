import React, { useState } from 'react';

interface InvoiceToolbarProps {
  currentInvoiceId: number | null;
  onNew: () => void;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onSearch: (invoiceId: number) => void;
  loading?: boolean;
}

const InvoiceToolbar: React.FC<InvoiceToolbarProps> = ({
  currentInvoiceId,
  onNew,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onSearch,
  loading = false
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = () => {
    const invoiceId = parseInt(searchValue.trim());
    if (!isNaN(invoiceId) && invoiceId > 0) {
      onSearch(invoiceId);
      setSearchValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 flex flex-col gap-3">
      {/* New Invoice Button */}
      <button
        onClick={onNew}
        disabled={loading}
        className="w-full py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Invoice
      </button>

      {/* Navigation Buttons */}
      <div className="grid grid-cols-4 gap-1">
        <button
          onClick={onFirst}
          disabled={loading}
          className="py-1.5 px-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors"
          title="First Invoice"
        >
          <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={onPrev}
          disabled={loading}
          className="py-1.5 px-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors"
          title="Previous Invoice"
        >
          <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="py-1.5 px-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors"
          title="Next Invoice"
        >
          <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={onLast}
          disabled={loading}
          className="py-1.5 px-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors"
          title="Last Invoice"
        >
          <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Search by Invoice Number */}
      <div className="flex gap-1">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Invoice #"
          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !searchValue.trim()}
          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-xs font-medium rounded transition-colors"
          title="Search Invoice"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Current Invoice Display */}
      {currentInvoiceId && (
        <div className="text-center py-2 bg-white rounded border border-gray-200">
          <div className="text-xs text-gray-500">Current Invoice</div>
          <div className="text-lg font-bold text-blue-600">{currentInvoiceId}</div>
        </div>
      )}
    </div>
  );
};

export default InvoiceToolbar;
