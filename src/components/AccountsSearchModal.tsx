import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface EntityResult {
  id: string;
  business_name: string;
  address?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  salesman?: string;
  monthsSinceActive?: number;
  aiBuyerType?: string;
}

interface AccountsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (accountId: string, businessName: string, salesmanMode: boolean) => void;
}

const AccountsSearchModal: React.FC<AccountsSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount
}) => {
  const { staffUsername } = useAuth();
  const [andContains1, setAndContains1] = useState('');
  const [andContains2, setAndContains2] = useState('');
  const [andDoesNotContain, setAndDoesNotContain] = useState('');
  const [allAccounts, setAllAccounts] = useState<EntityResult[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<EntityResult[]>([]);
  const [displayedAccounts, setDisplayedAccounts] = useState<EntityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accountsScrollRef = useRef<HTMLDivElement>(null);
  const [accountsPage, setAccountsPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Phone number formatter
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    return phone;
  };

  // Check if ZIP code indicates "DO NOT SELL"
  const isDoNotSellZip = (zip: string): boolean => {
    return zip === 'xxxxx' || zip === 'XXXXX' || zip?.toLowerCase() === 'xxxxx';
  };

  // Create searchable text by concatenating fields
  const createSearchableText = (entity: EntityResult): string => {
    return `${entity.id} ${entity.business_name} ${entity.city} ${entity.zip} ${entity.phone}`.toLowerCase();
  };

  // Apply filters and sort results
  const applyFiltersAndSort = (data: EntityResult[]) => {
    let filtered = [...data];

    // Apply filters
    if (andContains1.trim() || andContains2.trim() || andDoesNotContain.trim()) {
      filtered = filtered.filter(item => {
        const searchText = createSearchableText(item);
        
        // Check AND CONTAINS 1
        if (andContains1.trim()) {
          const term1 = andContains1.trim().toLowerCase();
          if (!searchText.includes(term1)) return false;
        }

        // Check AND CONTAINS 2
        if (andContains2.trim()) {
          const term2 = andContains2.trim().toLowerCase();
          if (!searchText.includes(term2)) return false;
        }

        // Check AND DOES NOT CONTAIN
        if (andDoesNotContain.trim()) {
          const excludeTerm = andDoesNotContain.trim().toLowerCase();
          if (searchText.includes(excludeTerm)) return false;
        }

        return true;
      });
    }

    // Sort accounts - exact account number matches first
    if (andContains1.trim()) {
      filtered.sort((a, b) => {
        const isExactA = a.id.toLowerCase() === andContains1.trim().toLowerCase();
        const isExactB = b.id.toLowerCase() === andContains1.trim().toLowerCase();
        
        if (isExactA && !isExactB) return -1;
        if (!isExactA && isExactB) return 1;
        
        return a.business_name.localeCompare(b.business_name);
      });
    } else {
      filtered.sort((a, b) => a.business_name.localeCompare(b.business_name));
    }

    return filtered;
  };

  // Load all data on modal open
  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch ALL accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts_lcmd')
        .select('account_number, acct_name, address, city, state, zip, phone')
        .order('acct_name');

      if (accountsError) throw accountsError;

      // Format and store data
      const formattedAccounts = (accountsData || []).map(account => ({
        id: account.account_number.toString(),
        business_name: account.acct_name,
        address: account.address,
        city: account.city,
        state: account.state,
        zip: account.zip,
        phone: formatPhoneNumber(account.phone),
        salesman: 'John Smith', // Mock salesman data
        monthsSinceActive: Math.floor(Math.random() * 12) + 1,
        aiBuyerType: ['High-Volume Retailer', 'Restaurant Chain', 'Audio Specialist'][Math.floor(Math.random() * 3)]
      }));

      setAllAccounts(formattedAccounts);
      setFilteredAccounts(formattedAccounts);
      
      // Initialize displayed items
      setDisplayedAccounts(formattedAccounts.slice(0, ITEMS_PER_PAGE));
      setAccountsPage(1);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!andContains1.trim() && !andContains2.trim() && !andDoesNotContain.trim()) {
      setError('Please enter at least one search term.');
      return;
    }

    setError(null);
    
    // Apply filters and sort
    const filteredAccountsResult = applyFiltersAndSort(allAccounts);
    
    setFilteredAccounts(filteredAccountsResult);
    
    // Reset pagination and display first page
    setDisplayedAccounts(filteredAccountsResult.slice(0, ITEMS_PER_PAGE));
    setAccountsPage(1);
  };

  const handleClearFilters = () => {
    setAndContains1('');
    setAndContains2('');
    setAndDoesNotContain('');
    setFilteredAccounts(allAccounts);
    setDisplayedAccounts(allAccounts.slice(0, ITEMS_PER_PAGE));
    setAccountsPage(1);
    setError(null);
  };

  // Handle lazy loading on scroll
  const handleAccountsScroll = useCallback(() => {
    if (accountsScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = accountsScrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        const nextPage = accountsPage + 1;
        const startIdx = (nextPage - 1) * ITEMS_PER_PAGE;
        const endIdx = startIdx + ITEMS_PER_PAGE;
        const moreItems = filteredAccounts.slice(startIdx, endIdx);
        
        if (moreItems.length > 0) {
          setDisplayedAccounts(prev => [...prev, ...moreItems]);
          setAccountsPage(nextPage);
        }
      }
    }
  }, [accountsPage, filteredAccounts]);

  const handleAccountClick = (account: EntityResult) => {
    // Open product search in Salesman Mode
    onSelectAccount(account.id, account.business_name, true);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
          {/* Professional Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Accounts Search System</h2>
                <p className="text-blue-100 text-sm mt-1">Advanced customer account search and management</p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                title="Close"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modern Search Controls */}
          <div className="px-8 py-6 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
            <div className="max-w-6xl mx-auto">
              {/* Filter Fields Row */}
              <div className="flex items-end gap-4">
                {/* AND CONTAINS 1 */}
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 block">
                    Primary Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={andContains1}
                      onChange={(e) => setAndContains1(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all placeholder-gray-400"
                      placeholder="Search account #, name, city, zip, phone..."
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* AND CONTAINS 2 */}
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 block">
                    Additional Filter
                  </label>
                  <input
                    type="text"
                    value={andContains2}
                    onChange={(e) => setAndContains2(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all placeholder-gray-400"
                    placeholder="AND contains..."
                  />
                </div>

                {/* AND DOES NOT CONTAIN */}
                <div className="flex-1">
                  <label className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 block">
                    Exclude Terms
                  </label>
                  <input
                    type="text"
                    value={andDoesNotContain}
                    onChange={(e) => setAndDoesNotContain(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all placeholder-red-400"
                    placeholder="Does NOT contain..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </span>
                    ) : 'SEARCH'}
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg shadow transition-all"
                  >
                    CLEAR
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Professional Results Container - MAXIMIZED ACCOUNTS PANEL */}
          <div className="flex-1 overflow-hidden bg-gray-50">
            <div className="h-full p-6">
              <div className="h-full" style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
                {/* Accounts Section - FULL WIDTH */}
                <div className="flex flex-col bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden h-full">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 shadow-sm flex-shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                      </svg>
                      Existing Accounts
                      <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm">
                        {filteredAccounts.length} found
                      </span>
                    </h3>
                  </div>
                  
                  <div 
                    ref={accountsScrollRef}
                    onScroll={handleAccountsScroll}
                    className="flex-1 overflow-y-scroll p-2 space-y-0.5"
                    style={{ height: '0', minHeight: '300px' }}
                  >
                    {displayedAccounts.length > 0 ? (
                      displayedAccounts.map((account) => {
                        const isDoNotSell = isDoNotSellZip(account.zip);
                        
                        return (
                          <div
                            key={account.id}
                            className={`group relative py-1 px-2 rounded border cursor-pointer transition-all hover:shadow-md ${
                              isDoNotSell 
                                ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100' 
                                : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                            }`}
                            onClick={() => handleAccountClick(account)}
                          >
                            {isDoNotSell && (
                              <div className="absolute inset-0 flex items-center justify-end pointer-events-none rounded bg-red-500/10 pr-2">
                                <div className="text-red-600 font-bold text-sm opacity-60">
                                  DO NOT SELL
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 text-xs">
                                    {account.business_name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {account.city}, {account.state} {account.zip}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {account.phone}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <p className="text-lg font-medium">No accounts found</p>
                          <p className="text-sm mt-1">Try adjusting your search criteria</p>
                        </div>
                      </div>
                    )}
                    
                    {displayedAccounts.length < filteredAccounts.length && (
                      <div className="text-center py-4">
                        <span className="text-sm text-gray-500">
                          Loading more... ({displayedAccounts.length} of {filteredAccounts.length})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with Professional Instructions */}
          <div className="px-8 py-4 bg-gradient-to-b from-gray-100 to-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <strong className="text-gray-800">Quick Guide:</strong> Click on 
                <span className="text-blue-600 font-medium mx-1">existing accounts</span> 
                to enter salesman mode and start shopping.
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-500">
                  Total Accounts: {allAccounts.length}
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountsSearchModal;
