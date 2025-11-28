import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { X, Save, RotateCcw, AlertCircle, CheckCircle, Loader2, Code, Eye } from 'lucide-react';
import './ProductEditPanel.css';

interface ProductEditPanelProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: Product) => void;
}

type ViewMode = 'edit' | 'preview';

interface ValidationError {
  line: number;
  message: string;
  type: 'error' | 'warning';
}

const ProductEditPanel: React.FC<ProductEditPanelProps> = ({
  product,
  isOpen,
  onClose,
  onSave
}) => {
  // State management
  const [editedProduct, setEditedProduct] = useState<Product>(product);
  const [originalProduct, setOriginalProduct] = useState<Product>(product);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [htmlContent, setHtmlContent] = useState(product.longdescription || '');
  const [originalHtmlContent, setOriginalHtmlContent] = useState(product.longdescription || '');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize state when product changes
  useEffect(() => {
    if (product) {
      setEditedProduct(product);
      setOriginalProduct(product);
      setHtmlContent(product.longdescription || '');
      setOriginalHtmlContent(product.longdescription || '');
      setHasUnsavedChanges(false);
      setValidationErrors([]);
    }
  }, [product]);

  // HTML validation function
  const validateHtml = useCallback((html: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    const lines = html.split('\n');
    
    // Stack to track opening tags
    const tagStack: Array<{ tag: string; line: number }> = [];
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Find all HTML tags in the line
      const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
      let match;
      
      while ((match = tagRegex.exec(line)) !== null) {
        const fullTag = match[0];
        const tagName = match[1].toLowerCase();
        
        // Skip self-closing tags and void elements
        const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
        const isSelfClosing = fullTag.endsWith('/>') || voidElements.includes(tagName);
        
        if (fullTag.startsWith('</')) {
          // Closing tag
          const lastOpen = tagStack.pop();
          if (!lastOpen) {
            errors.push({
              line: lineNumber,
              message: `Unexpected closing tag: ${fullTag}`,
              type: 'error'
            });
          } else if (lastOpen.tag !== tagName) {
            errors.push({
              line: lineNumber,
              message: `Mismatched tags: expected </${lastOpen.tag}> but found ${fullTag}`,
              type: 'error'
            });
            // Put the tag back on the stack
            tagStack.push(lastOpen);
          }
        } else if (!isSelfClosing) {
          // Opening tag
          tagStack.push({ tag: tagName, line: lineNumber });
        }
        
        // Check for common HTML issues
        if (fullTag.includes('onclick') || fullTag.includes('onload')) {
          errors.push({
            line: lineNumber,
            message: 'Inline JavaScript detected - consider removing for security',
            type: 'warning'
          });
        }
        
        if (fullTag.includes('style=') && fullTag.includes('javascript:')) {
          errors.push({
            line: lineNumber,
            message: 'JavaScript in style attribute detected',
            type: 'error'
          });
        }
      }
    });
    
    // Check for unclosed tags
    tagStack.forEach(openTag => {
      errors.push({
        line: openTag.line,
        message: `Unclosed tag: <${openTag.tag}>`,
        type: 'error'
      });
    });
    
    return errors;
  }, []);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      setIsAutoSaving(true);
      
      const updatedProduct = {
        ...editedProduct,
        longdescription: htmlContent
      };
      
      const { error } = await supabase
        .from('products_manager')
        .update({ 
          longdescription: htmlContent,
          dstamp: new Date().toISOString()
        })
        .eq('partnumber', product.partnumber);
      
      if (error) {
        console.error('Auto-save failed:', error);
        return;
      }
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setOriginalHtmlContent(htmlContent);
      
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [editedProduct, htmlContent, hasUnsavedChanges, product.partnumber]);

  // Handle HTML content changes
  const handleHtmlChange = useCallback((newHtml: string) => {
    setHtmlContent(newHtml);
    setHasUnsavedChanges(newHtml !== originalHtmlContent);
    
    // Validate HTML
    const errors = validateHtml(newHtml);
    setValidationErrors(errors);
    
    // Clear existing auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new auto-save timeout (3 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 3000);
  }, [originalHtmlContent, validateHtml, autoSave]);

  // Handle other product field changes
  const handleProductChange = useCallback((field: keyof Product, value: any) => {
    setEditedProduct(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Save changes
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const updatedProduct = {
        ...editedProduct,
        longdescription: htmlContent
      };
      
      const { error } = await supabase
        .from('products_manager')
        .update({
          description: updatedProduct.description,
          longdescription: htmlContent,
          price: updatedProduct.price,
          brand: updatedProduct.brand,
          map: updatedProduct.map,
          master_carton_price: updatedProduct.master_carton_price,
          master_carton_qty: updatedProduct.master_carton_quantity,
          dstamp: new Date().toISOString()
        })
        .eq('partnumber', product.partnumber);
      
      if (error) {
        throw error;
      }
      
      setOriginalProduct(updatedProduct);
      setOriginalHtmlContent(htmlContent);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      
      onSave(updatedProduct);
      
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Revert changes
  const handleRevert = () => {
    if (window.confirm('Are you sure you want to revert all changes? This cannot be undone.')) {
      setEditedProduct(originalProduct);
      setHtmlContent(originalHtmlContent);
      setHasUnsavedChanges(false);
      setValidationErrors([]);
      
      // Clear auto-save timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    }
  };

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'edit' || !isEditing) {
      setViewMode(mode);
      if (mode === 'edit') {
        setIsEditing(true);
      }
    }
  };

  // Handle edit mode exit
  const handleExitEditMode = () => {
    setIsEditing(false);
    setViewMode('preview');
  };

  // Add line numbers to textarea
  const getLineNumbers = () => {
    const lines = htmlContent.split('\n');
    return lines.map((_, index) => index + 1).join('\n');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Edit Product: {product.partnumber}
            </h2>
            {hasUnsavedChanges && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Unsaved Changes
              </span>
            )}
            {isAutoSaving && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Auto-saving...
              </span>
            )}
            {lastSaved && (
              <span className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Product Details */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Number
                </label>
                <input
                  type="text"
                  value={editedProduct.partnumber}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editedProduct.description || ''}
                  onChange={(e) => handleProductChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={editedProduct.brand || ''}
                  onChange={(e) => handleProductChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedProduct.price || ''}
                    onChange={(e) => handleProductChange('price', parseFloat(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MAP
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedProduct.map || ''}
                    onChange={(e) => handleProductChange('map', parseFloat(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    M/C Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedProduct.master_carton_price || ''}
                    onChange={(e) => handleProductChange('master_carton_price', parseFloat(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    M/C Quantity
                  </label>
                  <input
                    type="number"
                    value={editedProduct.master_carton_quantity || ''}
                    onChange={(e) => handleProductChange('master_carton_quantity', parseInt(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPC
                </label>
                <input
                  type="text"
                  value={editedProduct.upc || ''}
                  onChange={(e) => handleProductChange('upc', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  value={editedProduct.image || ''}
                  onChange={(e) => handleProductChange('image', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Long Description Editor */}
          <div className="flex-1 flex flex-col">
            {/* Editor Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">Long Description</h3>
                
                {/* Radio Button Mode Toggle */}
                <div className="flex items-center space-x-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="viewMode"
                      value="edit"
                      checked={viewMode === 'edit'}
                      onChange={() => handleViewModeChange('edit')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Raw Text or HTML
                    </span>
                  </label>
                  
                  <label className={`flex items-center cursor-pointer ${
                    isEditing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                    <input
                      type="radio"
                      name="viewMode"
                      value="preview"
                      checked={viewMode === 'preview'}
                      onChange={() => handleViewModeChange('preview')}
                      disabled={isEditing}
                      className={`w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 ${
                        isEditing ? 'cursor-not-allowed' : ''
                      }`}
                    />
                    <span className={`ml-2 text-sm font-medium ${
                      isEditing ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                      Rendered HTML
                    </span>
                  </label>
                </div>
              </div>

              {/* Validation Status */}
              <div className="flex items-center space-x-2">
                {validationErrors.length === 0 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Valid HTML
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {validationErrors.length} Issue{validationErrors.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 flex overflow-hidden">
              {viewMode === 'edit' ? (
                <div className="flex-1 flex">
                  {/* Line Numbers */}
                  <div className="w-12 bg-gray-100 border-r border-gray-300 p-2 text-right text-sm text-gray-500 font-mono leading-6 overflow-hidden">
                    <pre className="whitespace-pre">{getLineNumbers()}</pre>
                  </div>
                  
                  {/* Code Editor */}
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={htmlContent}
                      onChange={(e) => handleHtmlChange(e.target.value)}
                      onFocus={() => setIsEditing(true)}
                      className="w-full h-full p-4 font-mono text-sm leading-6 resize-none focus:outline-none border-none"
                      placeholder="Enter HTML content for the long description..."
                      spellCheck={false}
                      style={{
                        tabSize: 2,
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                      }}
                    />
                    
                    {/* Exit Edit Mode Button */}
                    {isEditing && (
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          onClick={handleExitEditMode}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Done Editing
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Preview Mode */
                <div className="flex-1 p-6 overflow-y-auto bg-white">
                  <div className="max-w-none prose prose-sm">
                    {htmlContent ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                        className="rendered-html"
                      />
                    ) : (
                      <div className="text-gray-500 italic">
                        No description available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="border-t border-gray-200 bg-red-50 p-4 max-h-32 overflow-y-auto">
                <h4 className="text-sm font-medium text-red-800 mb-2">HTML Validation Issues:</h4>
                <div className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <span className="text-red-600 font-mono">Line {error.line}:</span>
                      <span className={error.type === 'error' ? 'text-red-700' : 'text-yellow-700'}>
                        {error.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRevert}
              disabled={!hasUnsavedChanges}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Revert Changes
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || validationErrors.some(e => e.type === 'error')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductEditPanel;