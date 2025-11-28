import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react'; // Added ArrowDown, ArrowUp
import QuantitySelector from './QuantitySelector';
import { cleanProductText } from '../utils/textCleaner';
import { getProductImageUrl } from '../utils/imageLoader';
import ImageComingSoon from '../images/coming-soon.png';

interface ProductTableProps {
  products: Product[];
  title?: string;
  requestSort: (key: keyof Product) => void;
  sortConfig: { key: keyof Product | null; direction: 'ascending' | 'descending' };
  onRowClick?: (product: Product) => void; // Added onRowClick prop
  className?: string; // Added className prop
  showUpcColumn?: boolean; // Whether to display the UPC column
  showMsrp?: boolean; // Whether to display the MSRP column
  showMapPrice?: boolean; // Whether to display the MAP Price column
  fontSize?: 'smaller' | 'standard' | 'larger';
  onFontSizeChange?: (size: 'smaller' | 'standard' | 'larger') => void;
  enableFiltering?: boolean; // Whether to show filtering controls
  exactMatches?: Set<string>; // Set of part numbers that are exact matches for highlighting
  showImages?: boolean; // Whether to display product images in the table
}

const ProductTable: React.FC<ProductTableProps> = ({
  products = [],
  title = 'Products',
  requestSort,
  sortConfig,
  onRowClick, // Destructure onRowClick
  className, // Destructure className
  showUpcColumn = false, // Default to false
  showMsrp = true, // Default to true
  showMapPrice = true, // Default to true
  fontSize = 'standard',
  onFontSizeChange,
  enableFiltering = true, // Default to true
  exactMatches = new Set(), // Default to empty set
  showImages = true // Default to true - show images by default
}) => {
  // Removed excessive console logging that was flooding browser debug window
  const { addToCart, addToBackorder, isCartReady } = useCart();
  const { isDemoMode } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [tableContainerRef, setTableContainerRef] = useState<HTMLDivElement | null>(null);

  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<Map<string, string>>(new Map());

  // Filter states
  const [filters, setFilters] = useState({
    partnumber: '',
    description: '',
    brand: '',
    upc: '',
    priceMin: '',
    priceMax: '',
    msrpMin: '',
    msrpMax: '',
    mapMin: '',
    mapMax: '',
    inventoryMin: '',
    inventoryMax: '',
    inStockOnly: false
  });

  // Filtered products based on current filters
  const filteredProducts = React.useMemo(() => {
    if (!enableFiltering) return products;

    return products.filter(product => {
      // Part number filter
      if (filters.partnumber && !product.partnumber?.toLowerCase().includes(filters.partnumber.toLowerCase())) {
        return false;
      }

      // Description filter
      if (filters.description && !product.description?.toLowerCase().includes(filters.description.toLowerCase())) {
        return false;
      }

      // Brand filter
      if (filters.brand && !product.brand?.toLowerCase().includes(filters.brand.toLowerCase())) {
        return false;
      }

      // UPC filter
      if (filters.upc && !product.upc?.toLowerCase().includes(filters.upc.toLowerCase())) {
        return false;
      }

      // Price range filters
      if (filters.priceMin && product.price && product.price < parseFloat(filters.priceMin)) {
        return false;
      }
      if (filters.priceMax && product.price && product.price > parseFloat(filters.priceMax)) {
        return false;
      }

      // MSRP range filters
      if (filters.msrpMin && product.webmsrp && product.webmsrp < parseFloat(filters.msrpMin)) {
        return false;
      }
      if (filters.msrpMax && product.webmsrp && product.webmsrp > parseFloat(filters.msrpMax)) {
        return false;
      }

      // MAP range filters
      if (filters.mapMin && product.map && product.map < parseFloat(filters.mapMin)) {
        return false;
      }
      if (filters.mapMax && product.map && product.map > parseFloat(filters.mapMax)) {
        return false;
      }

      // Inventory range filters
      if (filters.inventoryMin && product.inventory && product.inventory < parseInt(filters.inventoryMin)) {
        return false;
      }
      if (filters.inventoryMax && product.inventory && product.inventory > parseInt(filters.inventoryMax)) {
        return false;
      }

      // In stock only filter - hide items with zero inventory, out of stock, or call for price
      if (filters.inStockOnly) {
        // Hide if inventory is null, zero, or negative
        if (!product.inventory || product.inventory <= 0) {
          return false;
        }
        // Hide if price is null (call for price items)
        if (product.price === null) {
          return false;
        }
      }

      return true;
    });
  }, [products, filters, enableFiltering]);

  // Update filter function
  const updateFilter = (key: keyof typeof filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      partnumber: '',
      description: '',
      brand: '',
      upc: '',
      priceMin: '',
      priceMax: '',
      msrpMin: '',
      msrpMax: '',
      mapMin: '',
      mapMax: '',
      inventoryMin: '',
      inventoryMax: '',
      inStockOnly: false
    });
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'inStockOnly') return value === true;
    return value !== '';
  });

  // Note: Removed dynamic pagination calculation that was interfering with user's selection
  // and preventing proper scrolling through products

  // Reset pagination when products change (e.g., new search, category change)
  React.useEffect(() => {
    setCurrentPage(1);
  }, [products]);

  // Reset pagination when items per page changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Calculate pagination using filtered products - memoized to prevent infinite re-renders
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = React.useMemo(() => {
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, startIndex, itemsPerPage]);

  // Load images for visible products - ULTRA SIMPLE: just use image field directly
  useEffect(() => {
    if (!showImages || paginatedProducts.length === 0) {
      setProductImages(prev => prev.size > 0 ? new Map() : prev);
      return;
    }

    const newImageMap = new Map<string, string>();
    
    for (const product of paginatedProducts) {
      // Use ultra-simple rule: get image URL from product.image field only
      const imageUrl = getProductImageUrl(product.image);
      newImageMap.set(product.partnumber, imageUrl || ImageComingSoon);
    }
    
    // Only update if the map has actually changed
    setProductImages(prev => {
      if (prev.size !== newImageMap.size) return newImageMap;
      
      // Check if any values have changed
      for (const [key, value] of newImageMap) {
        if (prev.get(key) !== value) return newImageMap;
      }
      
      return prev; // No changes, return previous map
    });
  }, [paginatedProducts.length, currentPage, showImages]);

  // Add keyboard navigation for pagination
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard events when not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (currentPage > 1) {
            event.preventDefault();
            setCurrentPage(prev => prev - 1);
          }
          break;
        case 'ArrowRight':
          if (currentPage < totalPages) {
            event.preventDefault();
            setCurrentPage(prev => prev + 1);
          }
          break;
        case 'Home':
          if (totalPages > 1) {
            event.preventDefault();
            setCurrentPage(1);
          }
          break;
        case 'End':
          if (totalPages > 1) {
            event.preventDefault();
            setCurrentPage(totalPages);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    // Removed excessive logging
    
    // Basic validation
    if (!product.inventory || product.inventory <= 0) {
      // Product out of stock
      return;
    }
    
    // Prevent double-clicks
    if (addingToCart === product.partnumber) {
      // Already adding this product
      return;
    }

    // IMPROVED FIX: Simple validation and immediate execution
    if (!addToCart || typeof addToCart !== 'function') {
      // addToCart function not available
      return;
    }
    
    // Adding to cart
    
    // Set loading state IMMEDIATELY
    setAddingToCart(product.partnumber);
    
    try {
      // Call addToCart with quantity - no delays or retry logic
      addToCart({
        partnumber: product.partnumber,
        description: product.description,
        price: product.price,
        inventory: product.inventory
      }, quantity);
      
      // addToCart called successfully
      
      // Clear loading state with visual feedback
      setTimeout(() => {
        setAddingToCart(null);
      }, 600);
    } catch (error) {
      // Error adding to cart
      setAddingToCart(null);
    }
  };

  const getInventoryDisplay = (inventory: number | null) => {
    if (inventory === null || inventory <= 0) {
      return <span className="text-red-600 font-medium">Out of Stock</span>;
    } else if (inventory <= 2) { // Covers 1 and 2
      return <span className="text-yellow-600 font-medium">{inventory}</span>;
    } else {
      return <span className="text-green-600 font-medium">{inventory}</span>;
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) {
      return <span className="text-gray-500 italic">Call for Price</span>;
    }
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatListPrice = (msrp: number | null | undefined) => {
    if (msrp === null || msrp === undefined) {
      return <span className="text-gray-500">---</span>;
    }
    return `$${msrp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMapPrice = (map: number | null | undefined) => {
    if (map === null || map === undefined) {
      return <span className="text-gray-500">---</span>;
    }
    try {
      return `$${map.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch (error) {
      // Error formatting MAP price
      return <span className="text-gray-500">Error</span>;
    }
  };

  // Format master carton information according to requirements
  const formatMasterCartonInfo = (product: Product) => {
    // If no master carton info available, display ---
    if (!product.master_carton_quantity || !product.master_carton_price) {
      return <span className="text-gray-500">---</span>;
    }

    // If available inventory is less than master carton quantity, display ---
    if (!product.inventory || product.inventory < product.master_carton_quantity) {
      return <span className="text-gray-500">---</span>;
    }

    // Format as "4 @ $55.00"
    const formattedPrice = `$${product.master_carton_price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
    
    return <span className="text-gray-900 font-medium">{product.master_carton_quantity} @ {formattedPrice}</span>;
  };

  // Pagination calculations completed

  const handlePreviousPage = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (currentPage > 1) {
      setCurrentPage(prev => Math.max(1, prev - 1));
    }
  };

  const handleNextPage = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (currentPage < totalPages) {
      setCurrentPage(prev => Math.min(totalPages, prev + 1));
    }
  };

  // Font size mappings reduced by 25% per user request
  const getFontSizeClasses = (type: 'header' | 'cell' | 'button' | 'pagination') => {
    const sizeMap = {
      smaller: {
        header: 'text-xs font-medium',
        cell: 'text-xs',
        button: 'text-xs',
        pagination: 'text-xs'
      },
      standard: {
        header: 'text-sm font-medium',
        cell: 'text-sm',
        button: 'text-sm',
        pagination: 'text-sm'
      },
      larger: {
        header: 'text-base font-medium',
        cell: 'text-base',
        button: 'text-base',
        pagination: 'text-base'
      }
    };
    return sizeMap[fontSize][type];
  };

  // Reusable pagination component
  const PaginationControls = ({ position }: { position: 'top' | 'bottom' }) => (
    <div className={`px-6 py-3 border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0 ${
      position === 'top' ? 'border-b' : 'border-t'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`${fontSize === 'smaller' ? 'font-professional-smaller' : fontSize === 'larger' ? 'font-professional-larger' : 'font-professional-standard'} text-gray-700`}>
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
          {hasActiveFilters && (
            <span className="text-blue-600 ml-1">(filtered from {products.length})</span>
          )}
        </div>
        {/* Removed "Show: X" dropdown selector as requested */}
      </div>
      <div className="flex items-center gap-2">
        {/* Readability controls removed per user request */}
        <button
          onClick={(e) => handlePreviousPage(e)}
          disabled={currentPage === 1}
          type="button"
          className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} font-medium transition-colors ${
            currentPage === 1
              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
              : 'text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          }`}
        >
          <ChevronLeft size={16} className="mr-1" />
          Previous
        </button>
        
        <div className="flex items-center gap-1">
          <span className={`${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-700`}>Page</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) {
                setCurrentPage(page);
              }
            }}
            className={`w-16 px-2 py-1 ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />
          <span className={`${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-700`}>of {totalPages}</span>
        </div>

        <button
          onClick={(e) => handleNextPage(e)}
          disabled={currentPage === totalPages}
          type="button"
          className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} font-medium transition-colors ${
            currentPage === totalPages
              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
              : 'text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          }`}
        >
          Next
          <ChevronRight size={16} className="ml-1" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={setTableContainerRef}
      className={`bg-white rounded-lg shadow-sm overflow-hidden flex flex-col ${className || ''}`}
      style={{ height: '100%' }}
    >
      {products && products.length > 0 ? (
        <>
          {/* Filter Row */}
          {enableFiltering && (
            <div className="bg-blue-50 border-b border-gray-200 px-6 py-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} font-medium text-gray-900`}>
                  Table Filters
                </h3>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <span className={`${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} text-blue-600 bg-blue-100 px-2 py-1 rounded`}>
                      {Object.entries(filters).filter(([key, value]) => key === 'inStockOnly' ? value === true : value !== '').length} active
                    </span>
                  )}
                  <button
                    onClick={clearAllFilters}
                    disabled={!hasActiveFilters}
                    className={`${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} px-3 py-1 rounded transition-colors ${
                      hasActiveFilters
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {/* Part Number Filter */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Part Number
                  </label>
                  <input
                    type="text"
                    value={filters.partnumber}
                    onChange={(e) => updateFilter('partnumber', e.target.value)}
                    placeholder="Filter by part number..."
                    className={`w-full px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>

                {/* Description Filter */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={filters.description}
                    onChange={(e) => updateFilter('description', e.target.value)}
                    placeholder="Filter by description..."
                    className={`w-full px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>

                {/* Brand Filter */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Brand
                  </label>
                  <input
                    type="text"
                    value={filters.brand}
                    onChange={(e) => updateFilter('brand', e.target.value)}
                    placeholder="Filter by brand..."
                    className={`w-full px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Price Range
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={filters.priceMin}
                      onChange={(e) => updateFilter('priceMin', e.target.value)}
                      placeholder="Min"
                      className={`w-1/2 px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    <input
                      type="number"
                      value={filters.priceMax}
                      onChange={(e) => updateFilter('priceMax', e.target.value)}
                      placeholder="Max"
                      className={`w-1/2 px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                </div>

                {/* Inventory Range */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Inventory Range
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={filters.inventoryMin}
                      onChange={(e) => updateFilter('inventoryMin', e.target.value)}
                      placeholder="Min"
                      className={`w-1/2 px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    <input
                      type="number"
                      value={filters.inventoryMax}
                      onChange={(e) => updateFilter('inventoryMax', e.target.value)}
                      placeholder="Max"
                      className={`w-1/2 px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                </div>

                {/* In Stock Only Checkbox */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Stock Filter
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.inStockOnly}
                      onChange={(e) => updateFilter('inStockOnly', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className={`ml-2 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} text-gray-700`}>
                      In Stock Only
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Scrollable table container that uses flexbox to fill available space */}
          <div
            className="flex-1 overflow-y-auto overflow-x-auto product-table-scroll"
            style={{
              minHeight: 0 // Allow flex item to shrink below content size
            }}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {showImages && (
                    <th className={`px-3 py-2 text-center ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider w-[80px]`}>
                      Image
                    </th>
                  )}
                  <th
                    className={`px-3 py-2 text-left ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${showImages ? 'w-[10%]' : 'w-[12%]'}`}
                    onClick={() => requestSort('partnumber')}
                  >
                    Part Number
                    {sortConfig.key === 'partnumber' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  <th
                    className={`px-3 py-2 text-left ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${showImages ? 'w-[35%]' : 'w-[40%]'}`}
                    onClick={() => requestSort('description')}
                  >
                    Description
                    {sortConfig.key === 'description' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  <th 
                    className={`px-3 py-2 text-left ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => requestSort('brand')}
                  >
                    Brand
                    {sortConfig.key === 'brand' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  {showUpcColumn && (
                    <th
                      className={`px-3 py-2 text-left ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                      onClick={() => requestSort('upc')}
                    >
                      UPC
                      {sortConfig.key === 'upc' && (
                        <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                      )}
                    </th>
                  )}
                  {showMsrp && (
                    <th
                      className={`px-3 py-2 text-right ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                      onClick={() => requestSort('webmsrp')}
                    >
                      MSRP
                      {sortConfig.key === 'webmsrp' && (
                        <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                      )}
                    </th>
                  )}
                  <th
                    className={`px-3 py-2 text-right ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-blue-50 w-[8%]`}
                    onClick={() => requestSort('price')}
                  >
                    Your Price
                    {sortConfig.key === 'price' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  <th
                    className={`px-3 py-2 text-center ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => requestSort('master_carton_quantity')}
                  >
                    Master Carton
                    {sortConfig.key === 'master_carton_quantity' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  {showMapPrice && (
                    <th
                      className={`px-3 py-2 text-right ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                      onClick={() => requestSort('map')}
                    >
                      MAP
                      {sortConfig.key === 'map' && (
                        <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                      )}
                    </th>
                  )}
                  <th 
                    className={`px-3 py-2 text-center ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => requestSort('inventory')}
                  >
                    Inventory
                    {sortConfig.key === 'inventory' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  <th className={`px-3 py-2 text-center ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => {
                  // Check if this product is an exact match
                  const isExactMatch = exactMatches.has(product.partnumber);
                  
                  return (
                  <tr
                    key={product.partnumber}
                    className={`hover:bg-gray-100 ${onRowClick ? 'cursor-pointer' : ''} ${
                      selectedProductId === product.partnumber ? 'bg-blue-50' :
                      isExactMatch ? 'bg-green-100' : ''
                    }`}
                    onClick={() => {
                      if (onRowClick) {
                        setSelectedProductId(product.partnumber);
                        onRowClick(product);
                      }
                    }}
                  >
                    {showImages && (
                      <td className="px-3 py-2 text-center w-[80px]">
                        <div className="flex justify-center items-center h-16 w-16 mx-auto">
                          <img
                            src={productImages.get(product.partnumber) || ImageComingSoon}
                            alt={product.description || product.partnumber}
                            className="h-16 w-16 object-contain rounded border border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src !== ImageComingSoon) {
                                target.src = ImageComingSoon;
                              }
                            }}
                          />
                        </div>
                      </td>
                    )}
                    <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} font-medium text-gray-900 ${showImages ? 'w-[10%]' : 'w-[12%]'}`}>
                      {product.partnumber}
                    </td>
                    <td className={`px-3 py-2 ${getFontSizeClasses('cell')} text-gray-500 ${showImages ? 'w-[35%]' : 'w-[40%]'}`}>
                      {cleanProductText(product.description)}
                    </td>
                    <td className={`px-3 py-2 ${getFontSizeClasses('cell')} text-gray-500`}>
                      {product.brand ? cleanProductText(product.brand) : '---'}
                    </td>
                    {showUpcColumn && (
                      <td className={`px-3 py-2 ${getFontSizeClasses('cell')} text-gray-500`}>
                        {product.upc || '---'}
                      </td>
                    )}
                    {showMsrp && (
                      <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} text-right font-medium`}>
                        {formatListPrice(product.webmsrp)}
                      </td>
                    )}
                    <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} text-right font-medium bg-blue-50 text-blue-800 font-bold w-[8%] ${isDemoMode ? 'demo-mode-blur' : ''}`}>
                      {formatPrice(product.price)}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} text-center font-medium ${isDemoMode ? 'demo-mode-blur' : ''}`}>
                      {formatMasterCartonInfo(product)}
                    </td>
                    {showMapPrice && (
                      <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} text-right font-medium`}>
                        {formatMapPrice(product.map)}
                      </td>
                    )}
                    <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} text-center ${isDemoMode ? 'demo-mode-blur' : ''}`}>
                      {getInventoryDisplay(product.inventory)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-center relative">
                      <div onClick={(e) => e.stopPropagation()}>
                        {isDemoMode ? (
                          <button
                            disabled
                            className="px-3 py-1 text-sm font-medium text-gray-400 bg-gray-100 rounded cursor-not-allowed"
                          >
                            Disabled
                          </button>
                        ) : (
                          <QuantitySelector
                            product={product}
                            onAddToCart={handleAddToCart}
                            onAddToBackorder={(product, quantity) => {
                              // Adding to backorder
                              if (addToBackorder) {
                                addToBackorder({
                                  partnumber: product.partnumber,
                                  description: product.description,
                                  price: product.price,
                                  inventory: product.inventory
                                }, quantity);
                              }
                            }}
                            disabled={!isCartReady}
                            isAdding={addingToCart === product.partnumber}
                            fontSize={fontSize}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination */}
          <PaginationControls position="bottom" />
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No products found.</p>
        </div>
      )}
    </div>
  );
};

export default ProductTable;
