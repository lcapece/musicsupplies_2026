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
      .slice(0, 25)
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
      // Load from products_supabase table with inventory data
      const { data, error } = await supabase
        .from('products_supabase')
        .select('partnumber, description, price, prdmaincat, prdsubcat, image, brand')
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
        .from('products_supabase')
        .select('partnumber, description, price, prdmaincat, prdsubcat, image, brand')
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
      return isMatch ? <mark key={i} className="bg-yellow-300 text-black font-bold px-0.5">{part}</mark> : part;
    });
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Product Display */}
      {selectedProduct && !isOpen ? (
        <div
          className="flex items-center gap-2 px-2 py-1 bg-blue-600 text-white border-2 border-blue-800 rounded cursor-pointer hover:bg-blue-700 transition-all"
          onClick={() => { setIsOpen(true); setSearchQuery(''); inputRef.current?.focus(); }}
        >
          <div className="flex-1 min-w-0">
            <span className="font-mono text-xs font-bold">{selectedProduct.partnumber}</span>
            <span className="mx-2 text-blue-200">|</span>
            <span className="text-xs truncate">{selectedProduct.description}</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="p-0.5 text-blue-200 hover:text-white hover:bg-blue-800 rounded transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
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
          className={`w-full px-2 py-1 text-sm font-bold border-2 rounded transition-all ${
            disabled ? 'bg-gray-200 border-gray-300 cursor-not-allowed text-gray-500' :
            isOpen ? 'bg-yellow-100 border-yellow-500 text-black ring-2 ring-yellow-300 shadow-lg' :
            'bg-yellow-50 border-yellow-400 text-black hover:bg-yellow-100 focus:bg-yellow-100 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-300'
          }`}
        />
      )}

      {/* Dropdown Results - Wide and Dense */}
      {isOpen && (searchQuery.trim() || loading) && (
        <div
          className="absolute z-50 left-0 mt-1 bg-white border-2 border-gray-800 rounded shadow-2xl overflow-hidden"
          style={{
            width: '50vw',
            maxWidth: '900px',
            minWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}
        >
          {/* Header */}
          <div className="px-2 py-1 bg-gray-800 text-white flex items-center text-xs font-bold">
            <div className="w-24">PART #</div>
            <div className="flex-1">DESCRIPTION</div>
            <div className="w-48 text-right">CATEGORY</div>
            <div className="w-16 text-right">PRICE</div>
            <div className="w-16 text-center">STOCK</div>
          </div>

          {/* Results */}
          <div ref={listRef} className="overflow-y-auto max-h-80">
            {loading ? (
              <div className="px-4 py-3 text-center text-sm text-gray-500">
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-4 py-3 text-center text-sm text-gray-500">
                No products found for "<span className="font-bold">{searchQuery}</span>"
              </div>
            ) : (
              filteredProducts.map((product, index) => (
                <div
                  key={product.partnumber}
                  onClick={() => handleSelectProduct(product)}
                  className={`flex items-center px-2 py-1.5 cursor-pointer border-b border-gray-200 text-xs ${
                    index === highlightedIndex
                      ? 'bg-blue-600 text-white'
                      : index % 2 === 0
                        ? 'bg-white hover:bg-blue-50'
                        : 'bg-gray-50 hover:bg-blue-50'
                  }`}
                >
                  {/* Part Number */}
                  <div className={`w-24 font-mono font-bold ${index === highlightedIndex ? 'text-yellow-300' : 'text-blue-700'}`}>
                    {highlightMatch(product.partnumber, searchQuery)}
                  </div>

                  {/* Description */}
                  <div className={`flex-1 truncate ${index === highlightedIndex ? 'text-white' : 'text-gray-800'}`}>
                    {highlightMatch(product.description || '-', searchQuery)}
                  </div>

                  {/* Category: maincat >> subcat */}
                  <div className={`w-48 text-right truncate ${index === highlightedIndex ? 'text-blue-200' : 'text-gray-500'}`}>
                    {product.prdmaincat || product.prdsubcat
                      ? `${product.prdmaincat || ''}${product.prdmaincat && product.prdsubcat ? ' >> ' : ''}${product.prdsubcat || ''}`
                      : '-'
                    }
                  </div>

                  {/* Price */}
                  <div className={`w-16 text-right font-semibold ${index === highlightedIndex ? 'text-green-300' : 'text-green-700'}`}>
                    ${(product.price || 0).toFixed(2)}
                  </div>

                  {/* Stock */}
                  <div className={`w-16 text-center font-semibold ${
                    index === highlightedIndex
                      ? (product.inventory && product.inventory > 0 ? 'text-green-300' : 'text-red-300')
                      : (product.inventory && product.inventory > 0 ? 'text-green-600' : 'text-red-500')
                  }`}>
                    {product.inventory || 0}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-2 py-1 bg-gray-100 border-t border-gray-300 flex justify-between text-[10px] text-gray-500">
            <span>{filteredProducts.length} results</span>
            <span>↑↓ Navigate | Enter Select | Esc Close</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductLookupDropdown;
