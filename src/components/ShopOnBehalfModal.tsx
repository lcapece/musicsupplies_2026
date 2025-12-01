import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, ArrowUpDown, User, Building2, Users } from 'lucide-react';

interface CustomerAccount {
  account_number: number;
  acct_name: string;
  city: string;
  state: string;
  salesman: string | null;
}

type SortField = 'account_number' | 'acct_name' | 'salesman';
type SortDirection = 'asc' | 'desc';

interface ShopOnBehalfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (accountNumber: string, accountName: string) => void;
}

const ShopOnBehalfModal: React.FC<ShopOnBehalfModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer
}) => {
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerAccount[]>([]);
  const [displayedCustomers, setDisplayedCustomers] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('acct_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Load customers on modal open
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts_lcmd')
        .select('account_number, acct_name, city, state, salesman')
        .order('acct_name');

      if (error) throw error;

      const formattedData = (data || []).map(row => ({
        account_number: row.account_number,
        acct_name: row.acct_name || '',
        city: row.city || '',
        state: row.state || '',
        salesman: row.salesman || null
      }));

      setCustomers(formattedData);
      applyFiltersAndSort(formattedData, searchTerm, sortField, sortDirection);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = (
    data: CustomerAccount[],
    search: string,
    field: SortField,
    direction: SortDirection
  ) => {
    let filtered = [...data];

    // Apply search filter
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.account_number.toString().includes(term) ||
        c.acct_name.toLowerCase().includes(term) ||
        (c.salesman && c.salesman.toLowerCase().includes(term)) ||
        c.city.toLowerCase().includes(term)
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (field) {
        case 'account_number':
          aVal = a.account_number;
          bVal = b.account_number;
          break;
        case 'salesman':
          aVal = (a.salesman || '').toLowerCase();
          bVal = (b.salesman || '').toLowerCase();
          break;
        default:
          aVal = a.acct_name.toLowerCase();
          bVal = b.acct_name.toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredCustomers(filtered);
    setDisplayedCustomers(filtered.slice(0, ITEMS_PER_PAGE));
    setPage(1);
  };

  // Handle search changes
  useEffect(() => {
    applyFiltersAndSort(customers, searchTerm, sortField, sortDirection);
  }, [searchTerm, sortField, sortDirection, customers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Lazy loading on scroll
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        const nextPage = page + 1;
        const startIdx = (nextPage - 1) * ITEMS_PER_PAGE;
        const endIdx = startIdx + ITEMS_PER_PAGE;
        const moreItems = filteredCustomers.slice(startIdx, endIdx);

        if (moreItems.length > 0) {
          setDisplayedCustomers(prev => [...prev, ...moreItems]);
          setPage(nextPage);
        }
      }
    }
  }, [page, filteredCustomers]);

  const handleCustomerClick = (customer: CustomerAccount) => {
    setSelectedCustomer(customer);
  };

  const handleConfirmSelection = () => {
    if (selectedCustomer) {
      onSelectCustomer(
        selectedCustomer.account_number.toString(),
        selectedCustomer.acct_name
      );
      onClose();
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return (
      <ArrowUpDown
        className={`w-4 h-4 ${sortDirection === 'asc' ? 'text-blue-500' : 'text-blue-500 rotate-180'}`}
      />
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Shop on Customer's Behalf</h2>
                <p className="text-purple-200 text-sm">Select a customer to enter orders for</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by account number, name, city, or salesperson..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900 placeholder-gray-400"
              autoFocus
            />
          </div>
          <div className="mt-3 text-sm text-gray-500">
            {filteredCustomers.length} customers found
          </div>
        </div>

        {/* Table Header */}
        <div className="px-6 py-2 bg-gray-100 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <button
              onClick={() => handleSort('account_number')}
              className="col-span-2 flex items-center gap-1 hover:text-purple-600 transition-colors"
            >
              Account # {getSortIcon('account_number')}
            </button>
            <button
              onClick={() => handleSort('acct_name')}
              className="col-span-6 flex items-center gap-1 hover:text-purple-600 transition-colors"
            >
              Customer Name {getSortIcon('acct_name')}
            </button>
            <button
              onClick={() => handleSort('salesman')}
              className="col-span-4 flex items-center gap-1 hover:text-purple-600 transition-colors"
            >
              Salesperson {getSortIcon('salesman')}
            </button>
          </div>
        </div>

        {/* Customer List */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
          style={{ minHeight: '300px', maxHeight: '50vh' }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : displayedCustomers.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {displayedCustomers.map((customer) => (
                <div
                  key={customer.account_number}
                  onClick={() => handleCustomerClick(customer)}
                  className={`px-6 py-3 cursor-pointer transition-all hover:bg-purple-50 ${
                    selectedCustomer?.account_number === customer.account_number
                      ? 'bg-purple-100 border-l-4 border-purple-500'
                      : ''
                  }`}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Account Number */}
                    <div className="col-span-2">
                      <span className="font-mono font-bold text-purple-700 text-lg">
                        {customer.account_number}
                      </span>
                    </div>

                    {/* Customer Name & Location */}
                    <div className="col-span-6">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-gray-900 truncate">
                            {customer.acct_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.city}{customer.city && customer.state ? ', ' : ''}{customer.state}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Salesperson */}
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className={`text-sm ${customer.salesman ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                          {customer.salesman || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {displayedCustomers.length < filteredCustomers.length && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Loading more... ({displayedCustomers.length} of {filteredCustomers.length})
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium">No customers found</p>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          )}
        </div>

        {/* Selected Customer & Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {selectedCustomer ? (
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 rounded-lg p-2">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Selected Customer:</div>
                    <div className="font-semibold text-gray-900">
                      <span className="text-purple-700">#{selectedCustomer.account_number}</span>
                      {' - '}
                      {selectedCustomer.acct_name}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  Click on a customer to select them
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSelection}
                disabled={!selectedCustomer}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-lg disabled:shadow-none transition-all disabled:cursor-not-allowed"
              >
                Start Shopping for This Customer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopOnBehalfModal;
