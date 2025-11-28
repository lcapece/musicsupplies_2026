import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ProductLookup } from '../types';

interface ProductLookupDropdownProps {
  value: string | null;
  onChange: (product: ProductLookup | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  compact?: boolean; // For use in grid rows
}

const ProductLookupDropdown: React.FC<ProductLookupDropdownProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Search part #, description, category...',
  className = '',
  autoFocus = false,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductLookup[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductLookup[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductLookup | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Load selected product if value provided
  useEffect(() => {
    if (value && !selectedProduct) {
      loadProductByPartNumber(value);
    } else if (!value) {
      setSelectedProduct(null);
      setSearchQuery('');
    }
  }, [value]);

  // Instant search with minimal debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setFilteredProducts([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 30);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, products]);

  // Intelligent multi-field search with scoring
  const performSearch = useCallback((query: string) => {
    const searchTerms = query.toLowerCase().trim().split(/\s+/);

    const scored = products.map(product => {
      let score = 0;
      const fields = {
        partnum: (product.partnumber || '').toLowerCase(),
        desc: (product.description || '').toLowerCase(),
        maincat: (product.prdmaincat || '').toLowerCase(),
        subcat: (product.prdsubcat || '').toLowerCase(),
        brand: (product.brand || '').toLowerCase()
      };

      const combined = `${fields.partnum} ${fields.desc} ${fields.maincat} ${fields.subcat} ${fields.brand}`;

      for (const term of searchTerms) {
        // Exact part number match - highest priority
        if (fields.partnum === term) {
          score += 1000;
        } else if (fields.partnum.startsWith(term)) {
          score += 600;
        } else if (fields.partnum.includes(term)) {
          score += 300;
        }

        // Description match
        if (fields.desc.includes(term)) {
          const words = fields.desc.split(/\s+/);
          if (words.some(w => w === term)) {
            score += 400; // Exact word match
          } else if (words.some(w => w.startsWith(term))) {
            score += 250; // Word starts with term
          } else {
            score += 100; // Partial match
          }
        }

        // Brand match
        if (fields.brand === term) {
          score += 350;
        } else if (fields.brand.startsWith(term)) {
          score += 200;
        } else if (fields.brand.includes(term)) {
          score += 100;
        }

        // Category match
        if (fields.maincat.includes(term) || fields.subcat.includes(term)) {
          score += 75;
        }

        // General combined match
        if (combined.includes(term)) {
          score += 10;
        }
      }

      return { product, score };
    });

    const results = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(item => item.product);

    setFilteredProducts(results);
    setHighlightedIndex(0);
    setIsSearching(false);
  }, [products]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Join with inventory table to get stock levels
      const { data, error } = await supabase
        .from('lcmd_products')
        .select('partnumber, description, price, prdmaincat, prdsubcat, image')
        .order('partnumber', { ascending: true });

      if (error) throw error;

      // Also fetch inventory data
      const { data: invData } = await supabase
        .from('inventory_lcmd')
        .select('part_number, inventory');

      const invMap = new Map((invData || []).map(i => [i.part_number, i.inventory]));

      const productsWithInv = (data || []).map(p => ({
        ...p,
        inventory: invMap.get(p.partnumber) || 0
      })) as ProductLookup[];

      setProducts(productsWithInv);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProductByPartNumber = async (partnum: string) => {
    try {
      const { data, error } = await supabase
        .from('lcmd_products')
        .select('partnumber, description, price, prdmaincat, prdsubcat, image')
        .eq('partnumber', partnum)
        .single();

      if (error) throw error;
      if (data) {
        const { data: invData } = await supabase
          .from('inventory_lcmd')
          .select('inventory')
          .eq('part_number', partnum)
          .single();

        const product: ProductLookup = {
          ...data,
          inventory: invData?.inventory || 0
        };
        setSelectedProduct(product);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Failed to load product:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
    setSelectedProduct(null);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (selectedProduct) {
      setSearchQuery('');
    }
  };

  const handleSelectProduct = useCallback((product: ProductLookup) => {
    setSelectedProduct(product);
    setSearchQuery('');
    setIsOpen(false);
    setFilteredProducts([]);
    onChange(product);
  }, [onChange]);

  const handleClear = () => {
    setSelectedProduct(null);
    setSearchQuery('');
    setFilteredProducts([]);
    onChange(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && filteredProducts.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < filteredProducts.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          handleSelectProduct(filteredProducts[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'Tab':
        if (filteredProducts.length > 0 && highlightedIndex >= 0) {
          handleSelectProduct(filteredProducts[highlightedIndex]);
        }
        break;
    }
  };

  // Scroll highlighted into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

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
      return isMatch ? <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5">{part}</mark> : part;
    });
  };

  const baseInputClass = compact
    ? 'w-full px-2 py-1 text-sm border rounded'
    : 'w-full pl-10 pr-4 py-2.5 text-base border-2 rounded-lg';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Product Display */}
      {selectedProduct && !isOpen ? (
        <div
          className={`flex items-center gap-2 ${compact ? 'px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-sm' : 'px-3 py-2.5 bg-gradient-to-r from-emerald-50 to-white border-2 border-emerald-200 rounded-lg'} cursor-pointer hover:border-emerald-300 transition-all`}
          onClick={() => { setIsOpen(true); setSearchQuery(''); inputRef.current?.focus(); }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-mono ${compact ? 'text-xs' : 'text-sm'} font-bold text-emerald-700`}>
                {selectedProduct.partnumber}
              </span>
              {!compact && (
                <span className="text-slate-600 truncate text-sm">
                  {selectedProduct.description}
                </span>
              )}
            </div>
            {compact && selectedProduct.description && (
              <div className="text-xs text-slate-500 truncate">{selectedProduct.description}</div>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative">
          {!compact && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {isSearching || loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
              )}
            </div>
          )}
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
            className={`${baseInputClass} transition-all duration-200 ${
              disabled ? 'bg-slate-100 border-slate-200 cursor-not-allowed' :
              isOpen ? 'bg-white border-blue-400 ring-2 ring-blue-100 shadow-md' :
              'bg-white border-slate-200 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
            }`}
          />
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && (searchQuery.trim() || loading) && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-hidden"
          style={{ minWidth: compact ? '320px' : 'auto', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.25)' }}
        >
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {loading ? 'Loading...' : filteredProducts.length === 0 ? 'No matches' : `${filteredProducts.length} found`}
            </span>
            <span className="text-xs text-slate-400">↑↓ Enter Esc</span>
          </div>

          <div className="overflow-y-auto max-h-60">
            {filteredProducts.length === 0 && !loading ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No products found for "{searchQuery}"
              </div>
            ) : (
              filteredProducts.map((product, index) => (
                <div
                  key={product.partnumber}
                  onClick={() => handleSelectProduct(product)}
                  className={`px-3 py-2 cursor-pointer border-b border-slate-50 last:border-b-0 transition-all ${
                    index === highlightedIndex ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-sm font-bold text-slate-800">
                          {highlightMatch(product.partnumber, searchQuery)}
                        </span>
                        <span className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(product.price)}
                        </span>
                        {product.inventory !== undefined && product.inventory > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            {product.inventory} in stock
                          </span>
                        )}
                        {product.inventory === 0 && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                            Out of stock
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 truncate">
                        {highlightMatch(product.description || '', searchQuery)}
                      </div>
                      {(product.prdmaincat || product.prdsubcat) && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {[product.prdmaincat, product.prdsubcat].filter(Boolean).join(' > ')}
                        </div>
                      )}
                    </div>
                    {index === highlightedIndex && (
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
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

export default ProductLookupDropdown;
