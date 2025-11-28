import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { AccountLookup } from '../types';

interface AccountLookupDropdownProps {
  value: number | null;
  onChange: (account: AccountLookup | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const AccountLookupDropdown: React.FC<AccountLookupDropdownProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Search by name, phone, address, or account #...',
  className = '',
  autoFocus = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState<AccountLookup[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountLookup[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load all accounts on mount for instant filtering
  useEffect(() => {
    loadAccounts();
  }, []);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Load selected account if value is provided
  useEffect(() => {
    if (value && !selectedAccount) {
      loadAccountById(value);
    } else if (!value) {
      setSelectedAccount(null);
      setSearchQuery('');
    }
  }, [value]);

  // Instant search with debounce for smooth UX
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setFilteredAccounts([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounce for 50ms - nearly instant but prevents excessive re-renders
    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 50);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, accounts]);

  // Intelligent multi-field search
  const performSearch = useCallback((query: string) => {
    const searchTerms = query.toLowerCase().trim().split(/\s+/);

    const scored = accounts.map(account => {
      let score = 0;
      const searchFields = {
        accountNum: account.account_number.toString(),
        name: (account.acct_name || '').toLowerCase(),
        phone: (account.phone || '').replace(/\D/g, ''),
        address: (account.address || '').toLowerCase(),
        city: (account.city || '').toLowerCase(),
        state: (account.state || '').toLowerCase(),
        zip: (account.zip || '').toLowerCase()
      };

      // Create combined search text
      const combinedText = `${searchFields.accountNum} ${searchFields.name} ${searchFields.phone} ${searchFields.address} ${searchFields.city} ${searchFields.state}`.toLowerCase();

      for (const term of searchTerms) {
        // Exact account number match - highest priority
        if (searchFields.accountNum === term) {
          score += 1000;
        } else if (searchFields.accountNum.startsWith(term)) {
          score += 500;
        }

        // Phone number match (digits only)
        const termDigits = term.replace(/\D/g, '');
        if (termDigits.length >= 3) {
          if (searchFields.phone === termDigits) {
            score += 800;
          } else if (searchFields.phone.includes(termDigits)) {
            score += 400;
          }
        }

        // Business name match - very important
        if (searchFields.name === term) {
          score += 600;
        } else if (searchFields.name.startsWith(term)) {
          score += 300;
        } else if (searchFields.name.includes(term)) {
          score += 150;
        }

        // Address match
        if (searchFields.address.startsWith(term)) {
          score += 200;
        } else if (searchFields.address.includes(term)) {
          score += 100;
        }

        // City match
        if (searchFields.city.startsWith(term)) {
          score += 150;
        } else if (searchFields.city.includes(term)) {
          score += 75;
        }

        // General match in combined text
        if (combinedText.includes(term)) {
          score += 25;
        }
      }

      return { account, score };
    });

    // Filter accounts with score > 0 and sort by score descending
    const results = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15) // Limit to 15 results for performance
      .map(item => item.account);

    setFilteredAccounts(results);
    setHighlightedIndex(0);
    setIsSearching(false);
  }, [accounts]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts_lcmd')
        .select('account_number, acct_name, address, city, state, zip, phone, mobile_phone, email_address, contact, terms, salesman')
        .order('acct_name', { ascending: true });

      if (error) throw error;
      setAccounts((data || []) as AccountLookup[]);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAccountById = async (accountNumber: number) => {
    try {
      const { data, error } = await supabase
        .from('accounts_lcmd')
        .select('account_number, acct_name, address, city, state, zip, phone, mobile_phone, email_address, contact, terms, salesman')
        .eq('account_number', accountNumber)
        .single();

      if (error) throw error;
      if (data) {
        const account = data as AccountLookup;
        setSelectedAccount(account);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Failed to load account:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setIsOpen(true);
    setSelectedAccount(null);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (selectedAccount) {
      setSearchQuery('');
    }
  };

  const handleSelectAccount = useCallback((account: AccountLookup) => {
    setSelectedAccount(account);
    setSearchQuery('');
    setIsOpen(false);
    setFilteredAccounts([]);
    onChange(account);
  }, [onChange]);

  const handleClear = () => {
    setSelectedAccount(null);
    setSearchQuery('');
    setFilteredAccounts([]);
    onChange(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && filteredAccounts.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredAccounts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredAccounts.length) {
          handleSelectAccount(filteredAccounts[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'Tab':
        if (filteredAccounts.length > 0 && highlightedIndex >= 0) {
          handleSelectAccount(filteredAccounts[highlightedIndex]);
        }
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedItem = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Format phone for display
  const formatPhone = (phone: string | undefined): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  // Highlight matching text
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query.trim() || !text) return text;

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    let result = text;

    for (const term of terms) {
      const regex = new RegExp(`(${term})`, 'gi');
      result = result.replace(regex, '|||$1|||');
    }

    const parts = result.split('|||');
    return parts.map((part, i) => {
      const isMatch = terms.some(term => part.toLowerCase() === term.toLowerCase());
      return isMatch ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
      ) : part;
    });
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Account Display */}
      {selectedAccount && !isOpen ? (
        <div
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-2 border-emerald-200 rounded-lg cursor-pointer hover:border-emerald-300 transition-all shadow-sm"
          onClick={() => {
            setIsOpen(true);
            setSearchQuery('');
            inputRef.current?.focus();
          }}
        >
          <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-emerald-700 font-bold text-sm">
              {selectedAccount.acct_name?.charAt(0).toUpperCase() || '#'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 truncate">
                {selectedAccount.acct_name}
              </span>
              <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                #{selectedAccount.account_number}
              </span>
            </div>
            <div className="text-sm text-slate-500 truncate">
              {selectedAccount.city}, {selectedAccount.state}
              {selectedAccount.phone && ` • ${formatPhone(selectedAccount.phone)}`}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Clear selection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {isSearching || loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            className={`w-full pl-12 pr-4 py-3 text-base border-2 rounded-lg transition-all duration-200 ${
              disabled
                ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400'
                : isOpen
                  ? 'bg-white border-blue-400 ring-4 ring-blue-50 shadow-lg'
                  : 'bg-white border-slate-200 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilteredAccounts([]);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && (searchQuery.trim() || loading) && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
        >
          {/* Results Header */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {loading ? 'Loading accounts...' :
               filteredAccounts.length === 0 ? 'No matches found' :
               `${filteredAccounts.length} match${filteredAccounts.length !== 1 ? 'es' : ''}`}
            </span>
            <span className="text-xs text-slate-400">
              ↑↓ Navigate • Enter Select • Esc Close
            </span>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto max-h-64">
            {filteredAccounts.length === 0 && !loading ? (
              <div className="px-4 py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium">No accounts found</p>
                <p className="text-sm text-slate-400 mt-1">Try searching by name, phone, or address</p>
              </div>
            ) : (
              filteredAccounts.map((account, index) => (
                <div
                  key={account.account_number}
                  onClick={() => handleSelectAccount(account)}
                  className={`px-4 py-3 cursor-pointer border-b border-slate-50 last:border-b-0 transition-all duration-150 ${
                    index === highlightedIndex
                      ? 'bg-blue-50 border-l-4 border-l-blue-500'
                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === highlightedIndex
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {account.acct_name?.charAt(0).toUpperCase() || '#'}
                    </div>

                    {/* Account Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-slate-800">
                          {highlightMatch(account.acct_name || '', searchQuery)}
                        </span>
                        <span className="text-xs font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          #{account.account_number}
                        </span>
                      </div>

                      {/* Address Line */}
                      {account.address && (
                        <div className="text-sm text-slate-500 truncate">
                          {highlightMatch(account.address, searchQuery)}
                        </div>
                      )}

                      {/* City, State, Phone */}
                      <div className="flex items-center gap-3 text-sm text-slate-400 mt-0.5">
                        <span>
                          {highlightMatch(`${account.city}, ${account.state}`, searchQuery)}
                        </span>
                        {account.phone && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-xs">
                              {highlightMatch(formatPhone(account.phone), searchQuery)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {index === highlightedIndex && (
                      <div className="flex-shrink-0 text-blue-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountLookupDropdown;
