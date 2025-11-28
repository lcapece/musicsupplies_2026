import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, ShoppingCart, Check, AlertCircle, Clock } from 'lucide-react';

interface QuantitySelectorProps {
  product: {
    partnumber: string;
    description: string;
    price: number | null;
    inventory: number | null;
  };
  onAddToCart: (product: any, quantity: number) => void;
  onAddToBackorder?: (product: any, quantity: number) => void;
  disabled?: boolean;
  isAdding?: boolean;
  fontSize?: 'smaller' | 'standard' | 'larger';
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  product,
  onAddToCart,
  onAddToBackorder,
  disabled = false,
  isAdding = false,
  fontSize = 'standard'
}) => {
  const [quantity, setQuantity] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [backorderNetQuantity, setBackorderNetQuantity] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inventory validation
  const maxQuantity = product.inventory || 0;
  const isOutOfStock = !product.inventory || product.inventory <= 0;
  const isLowStock = product.inventory && product.inventory <= 2;
  // Show backorder for "Low - Call" (≤2) or "Out of Stock" (≤0) when backorder function is available
  const isBackorderOnly = onAddToBackorder && (product.inventory === null || product.inventory <= 2);
  
  // Check if quantity exceeds available inventory (for split order feature)
  const exceedsInventory = !isBackorderOnly && onAddToBackorder && product.inventory !== null && product.inventory > 0 && quantity > product.inventory;
  const excessQuantity = exceedsInventory ? quantity - (product.inventory || 0) : 0;
  const cartQuantity = exceedsInventory ? (product.inventory || 0) : quantity;

  // Font size classes
  const getFontSizeClass = (element: 'button' | 'input' | 'text') => {
    const sizeMap = {
      smaller: {
        button: 'text-xs px-1.5 py-1',
        input: 'text-xs px-2 py-1',
        text: 'text-xs'
      },
      standard: {
        button: 'text-sm px-2 py-1.5',
        input: 'text-sm px-3 py-1.5',
        text: 'text-sm'
      },
      larger: {
        button: 'text-base px-3 py-2',
        input: 'text-base px-4 py-2',
        text: 'text-base'
      }
    };
    return sizeMap[fontSize][element];
  };

  // Validate quantity against inventory
  const validateQuantity = (qty: number): string | null => {
    if (qty < 1) return 'Quantity must be at least 1';
    // For backorder items, allow any quantity
    if (isBackorderOnly) return null;
    // If backorder is available and quantity exceeds inventory, allow it (will show checkbox)
    if (onAddToBackorder && qty > maxQuantity) return null;
    // For regular items without backorder, enforce inventory limit
    if (!onAddToBackorder && qty > maxQuantity) return `Maximum available: ${maxQuantity}`;
    return null;
  };

  // Handle quantity change with validation
  const handleQuantityChange = (newQuantity: number) => {
    const error = validateQuantity(newQuantity);
    setValidationError(error);
    
    if (!error) {
      setQuantity(newQuantity);
      setInputValue(newQuantity.toString());
    }
  };

  // Handle input field changes
  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    // Allow empty input for editing
    if (value === '') {
      setValidationError(null);
      return;
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      setValidationError('Please enter a valid number');
      return;
    }

    const error = validateQuantity(numValue);
    setValidationError(error);
    
    if (!error) {
      setQuantity(numValue);
    }
  };

  // Handle input blur - ensure we have a valid quantity
  const handleInputBlur = () => {
    if (inputValue === '' || isNaN(parseInt(inputValue, 10))) {
      setInputValue('1');
      setQuantity(1);
      setValidationError(null);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!validationError && !isOutOfStock) {
        handleAddToCart();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleQuantityChange(quantity + 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleQuantityChange(Math.max(1, quantity - 1));
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  // Handle add to cart with success feedback
  const handleAddToCart = async () => {
    if (validationError || isAdding) return;

    try {
      if (isBackorderOnly && onAddToBackorder) {
        // For items with ≤1 inventory, add to backorder
        onAddToBackorder(product, quantity);
      } else if (!isOutOfStock) {
        // For items with >1 inventory, add to cart normally
        onAddToCart(product, quantity);
      } else {
        return; // Should not happen, but safety check
      }
      
      // Show success animation
      setShowSuccess(true);
      
      // Reset to default quantity after successful add
      setTimeout(() => {
        setQuantity(1);
        setInputValue('1');
        setShowSuccess(false);
        setIsExpanded(false);
      }, 1200);
    } catch (error) {
      console.error('Error adding to cart/backorder:', error);
    }
  };

  // CRITICAL FIX: Handle initial button click to expand controls
  const handleInitialClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    
    // Use immediate state update with callback to ensure expansion happens
    setIsExpanded(true);
    
    // Focus the input after a brief delay to ensure the expanded view is rendered
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  };

  // Collapse on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Success state
  if (showSuccess) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="flex items-center gap-1 text-green-600 font-medium">
          <Check size={16} />
          <span className={getFontSizeClass('text')}>
            {isBackorderOnly ? 'Added to Backorder!' : 'Added!'}
          </span>
        </div>
      </div>
    );
  }

  // Out of stock state - only show for items with no inventory AND no backorder function
  if (isOutOfStock && !onAddToBackorder) {
    return (
      <div className="flex items-center gap-2 opacity-60">
        <div className="flex items-center gap-1 text-red-600">
          <AlertCircle size={14} />
          <span className={`${getFontSizeClass('text')} font-medium`}>Out of Stock</span>
        </div>
      </div>
    );
  }

  // Compact view (default) - all items start compact, expand only when clicked
  if (!isExpanded) {
    return (
      <div ref={containerRef} className="flex items-center gap-1">
        <button
          onClick={handleInitialClick}
          disabled={disabled || isAdding}
          className={`
            inline-flex items-center justify-center gap-1.5 border rounded-lg
            transition-all duration-200 font-medium w-32
            ${getFontSizeClass('button')}
            ${disabled || isAdding ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
            ${isBackorderOnly 
              ? 'border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500' 
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            }
            ${isLowStock && !isBackorderOnly ? 'border-yellow-400 bg-yellow-50' : ''}
          `}
        >
          {isBackorderOnly ? <Clock size={14} /> : <ShoppingCart size={14} />}
          <span>{isBackorderOnly ? 'Add Backorder' : 'Add to Cart'}</span>
        </button>
      </div>
    );
  }

  // Expanded view with quantity controls
  return (
    <div ref={containerRef} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
      {/* Quantity Controls */}
      <div className="flex items-center border border-gray-300 rounded-md bg-white">
        {/* Minus Button */}
        <button
          onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
          disabled={quantity <= 1 || disabled}
          className={`
            flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700
            hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150 rounded-l-md
          `}
          aria-label="Decrease quantity"
        >
          <Minus size={12} />
        </button>

        {/* Quantity Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={`
            w-12 text-center border-0 focus:ring-0 focus:outline-none
            ${getFontSizeClass('input')} font-medium text-gray-900
            ${validationError ? 'text-red-600' : ''}
          `}
          disabled={disabled}
          aria-label="Quantity"
          autoComplete="off"
        />

        {/* Plus Button */}
        <button
          onClick={() => handleQuantityChange(quantity + 1)}
          disabled={(!isBackorderOnly && quantity >= maxQuantity) || disabled}
          className={`
            flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700
            hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150 rounded-r-md
          `}
          aria-label="Increase quantity"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Add to Cart/Backorder Button */}
      <button
        onClick={handleAddToCart}
        disabled={disabled || isAdding || !!validationError}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium
          transition-all duration-200 focus:ring-2 focus:ring-offset-1
          ${getFontSizeClass('button')}
          ${
            disabled || isAdding || validationError
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isBackorderOnly
              ? 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500 hover:shadow-sm'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 hover:shadow-sm'
          }
        `}
      >
        {isBackorderOnly ? <Clock size={14} /> : <ShoppingCart size={14} />}
        <span>
          {isAdding 
            ? (isBackorderOnly ? 'Adding to Backorder...' : 'Adding...') 
            : (isBackorderOnly ? 'Add Backorder' : 'Add')
          }
        </span>
      </button>

      {/* Stock Warning - only show for regular items, not backorder items */}
      {isLowStock && !validationError && !isBackorderOnly && (
        <div className="flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2 py-1 rounded-md">
          <AlertCircle size={12} />
          <span className={`${getFontSizeClass('text')} font-medium`}>Low Stock</span>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-md">
          <AlertCircle size={12} />
          <span className={`${getFontSizeClass('text')} font-medium`}>{validationError}</span>
        </div>
      )}

    </div>
  );
};

export default QuantitySelector;
