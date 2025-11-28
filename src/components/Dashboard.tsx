import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CategoryTree from '../components/CategoryTree';
import ProductTable from '../components/ProductTable';
import SearchBar from '../components/SearchBar';
import Header from '../components/Header';
import OrderHistory from '../pages/OrderHistory';
import WebOrdersDisplay from '../pages/WebOrdersDisplay'; // Importing the new component
import { Product } from '../types';
import { useMemo } from 'react'; // Import useMemo
import { Link } from 'react-router-dom'; // Import Link for footer
import ImageComingSoon from '../images/coming-soon.png'; // Import the placeholder image
import { getProductImageUrl } from '../utils/imageLoader'; // Import the new image loader

const Dashboard: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | null; direction: 'ascending' | 'descending' }>({ key: 'partnumber', direction: 'ascending' });
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | undefined>();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>();
  // States for category names
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState<string | undefined>();
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showImageAndSpecs, setShowImageAndSpecs] = useState(true); // Changed to true for default checked
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(ImageComingSoon); // State for the image URL to display
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'products' | 'orders' | 'weborders'>('products');
  const [searchTerms, setSearchTerms] = useState<{
    primary: string;
    additional: string;
    exclude: string;
  }>({
    primary: '',
    additional: '',
    exclude: ''
  });
  const [fontSize, setFontSize] = useState<'smaller' | 'standard' | 'larger'>(() => {
    // Load font size preference from localStorage on mount
    const savedFontSize = localStorage.getItem('fontSizePreference');
    if (savedFontSize === 'smaller' || savedFontSize === 'standard' || savedFontSize === 'larger') {
      return savedFontSize;
    }
    return 'standard'; // Default to 'standard' (middle option)
  });

  // Save font size preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fontSizePreference', fontSize);
  }, [fontSize]);

  useEffect(() => {
    fetchProducts();
    setSelectedProductForImage(null);
  }, [selectedMainCategory, selectedSubCategory, searchTerms, inStockOnly]);

  // Effect to load product image using ultra-simple rule
  useEffect(() => {
    if (showImageAndSpecs && selectedProductForImage) {
      // Use ultra-simple rule: get image URL from product.image field only
      const imageUrl = getProductImageUrl(selectedProductForImage.image);
      setCurrentImageUrl(imageUrl || ImageComingSoon);
    } else {
      setCurrentImageUrl(ImageComingSoon); // Reset to placeholder if panel is hidden or no product selected
    }
  }, [selectedProductForImage, showImageAndSpecs]);

  const requestSort = (key: keyof Product) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = useMemo(() => {
    let sortableProducts = [...products];
    if (sortConfig.key !== null) {
      sortableProducts.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        // Handle null or undefined values by pushing them to the end
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableProducts;
  }, [products, sortConfig]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Use RPC function to get all products (bypasses 1000-row PostgREST limit)
      const { data: allProducts, error } = await supabase.rpc('get_all_products');

      if (error) {
        // Error fetching products
        return;
      }

      let filteredProducts = allProducts || [];

      // Apply filters client-side since RPC returns all products
      // Note: Category filtering logic will need to be updated once database migration is complete
      // For now, we'll comment out the old category filtering
      // if (selectedMainCategory) {
      //   filteredProducts = filteredProducts.filter((product: Product) => product.category === selectedMainCategory);
      // }
      // if (selectedSubCategory) {
      //   filteredProducts = filteredProducts.filter((product: Product) => product.category === selectedSubCategory);
      // }

      // Filter out test products
      filteredProducts = filteredProducts.filter((product: Product) => 
        !product.partnumber?.toLowerCase().startsWith('test-')
      );

      // Apply search terms by checking partnumber and description
      if (searchTerms.primary) {
        const primaryTerm = searchTerms.primary.toLowerCase();
        filteredProducts = filteredProducts.filter((product: Product) =>
          product.partnumber?.toLowerCase().includes(primaryTerm) ||
          product.description?.toLowerCase().includes(primaryTerm)
        );
      }
      if (searchTerms.additional) {
        const additionalTerm = searchTerms.additional.toLowerCase();
        filteredProducts = filteredProducts.filter((product: Product) =>
          product.partnumber?.toLowerCase().includes(additionalTerm) ||
          product.description?.toLowerCase().includes(additionalTerm)
        );
      }
      if (searchTerms.exclude) {
        const excludeTerm = searchTerms.exclude.toLowerCase();
        filteredProducts = filteredProducts.filter((product: Product) =>
          !product.partnumber?.toLowerCase().includes(excludeTerm) &&
          !product.description?.toLowerCase().includes(excludeTerm)
        );
      }

      if (inStockOnly) {
        filteredProducts = filteredProducts.filter((product: Product) => (product.inventory || 0) > 0);
      }

      setProducts(filteredProducts);
    } catch (error) {
      // Error fetching products
    } finally {
      setLoading(false);
    }
  };
  
  // Updated to match CategorySelection type from CategoryTree.tsx
  const handleCategorySelect = (selection: import('../components/CategoryTree').CategorySelection | null) => {
    // Clear previous search terms when a category is selected or deselected
    setSearchQuery('');
    setSearchTerms({ primary: '', additional: '', exclude: '' });
    setSelectedProductForImage(null); // Reset selected product

    if (selection) {
      setSelectedCategoryId(selection.id);
      const { namePath, level } = selection;
      
      // Extract category codes from ID (main_CODE, sub_MAIN_CODE)
      const idParts = selection.id.split('_');
      const type = idParts[0]; // 'main' or 'sub'
      
      if (type === 'main' && namePath.length >= 1) {
        setSelectedMainCategory(idParts.slice(1).join('_'));
        setSelectedSubCategory(undefined);
        setSelectedMainCategoryName(namePath[0]);
        setSelectedSubCategoryName(undefined);
      } else if (type === 'sub' && namePath.length >= 2) {
        setSelectedMainCategory(idParts[1]);
        setSelectedSubCategory(idParts.slice(2).join('_'));
        setSelectedMainCategoryName(namePath[0]);
        setSelectedSubCategoryName(namePath[1]);
      } else {
        // Fallback or error case if path and id don't align, clear all
        setSelectedMainCategory(undefined);
        setSelectedSubCategory(undefined);
        setSelectedMainCategoryName(undefined);
        setSelectedSubCategoryName(undefined);
        setSelectedCategoryId(null);
      }
    } else {
      // Deselection: clear all category related states
      setSelectedCategoryId(null);
      setSelectedMainCategory(undefined);
      setSelectedSubCategory(undefined);
      setSelectedMainCategoryName(undefined);
      setSelectedSubCategoryName(undefined);
    }
  };
  
  const handleSearch = (primaryQuery: string, additionalQuery: string, excludeQuery: string) => { // Removed showInStock parameter
    setSearchQuery(primaryQuery);
    // setInStockOnly is now handled by its own checkbox onChange
    setSearchTerms({
      primary: primaryQuery,
      additional: additionalQuery,
      exclude: excludeQuery
    });
    setSelectedProductForImage(null); // Reset selected product
    setSelectedMainCategory(undefined);
    setSelectedSubCategory(undefined);
    setSelectedMainCategoryName(undefined);
    setSelectedSubCategoryName(undefined);
    setSelectedCategoryId(null); // Also clear selectedCategoryId
  };

  const handleViewChange = (view: 'products' | 'orders' | 'weborders') => {
    setActiveView(view);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header onViewChange={handleViewChange} activeView={activeView} />
      
      <div className="flex-grow flex flex-col">
        {activeView === 'products' ? (
          <>
            <div className="py-4 px-4 sm:px-6 lg:px-8">
              <SearchBar onSearch={handleSearch} />
            </div>
            
            <div className="flex-grow px-4 sm:px-6 lg:px-8 pb-6 overflow-hidden">
              <div className="grid grid-cols-12 gap-6 h-full">
                <div className="col-span-12 lg:col-span-3 flex flex-col">
                  <CategoryTree 
                    onSelectCategory={handleCategorySelect}
                    selectedCategoryId={selectedCategoryId}
                  />
                </div>
                
                <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0">
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 mb-2 sm:mb-0">
                      {(() => {
                        const path = [];
                        if (selectedMainCategoryName) path.push(selectedMainCategoryName);
                        if (selectedSubCategoryName) path.push(selectedSubCategoryName);

                        if (path.length > 0) {
                          return `Current Path: ${path.join(' > ')}`;
                        }
                        if (searchTerms.primary || searchTerms.additional || searchTerms.exclude) {
                          return `Search results for: "${searchTerms.primary}${searchTerms.additional ? ' + ' + searchTerms.additional : ''}${searchTerms.exclude ? ' - ' + searchTerms.exclude : ''}"`;
                        }
                        return "Showing all product groups";
                      })()}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
                      {/* Inventory Timestamp */}
                      <div className="text-lg font-semibold text-gray-600">
                        Inventory as of {new Date().toLocaleString('en-US', {
                          month: '2-digit',
                          day: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>

                      {/* Toggles Container */}
                      <div className="flex items-center space-x-6">
                      {/* Toggle for Show Images & Specs */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="showImageAndSpecs"
                          checked={showImageAndSpecs}
                          onChange={(e) => {
                            setShowImageAndSpecs(e.target.checked);
                            if (!e.target.checked) {
                              setSelectedProductForImage(null); // Clear selection when hiding
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="showImageAndSpecs" className="ml-2 block text-sm text-gray-900">
                          Show Images & Specs
                        </label>
                      </div>

                      {/* Toggle for Show In-Stock Items Only */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="inStockOnly"
                          checked={inStockOnly}
                          onChange={(e) => setInStockOnly(e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="inStockOnly" className="ml-2 block text-sm text-gray-900">
                          Show In-Stock Items Only
                        </label>
                      </div>
                    </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-8 bg-white rounded-lg shadow flex-grow">
                      <p className="text-gray-500">Loading products...</p>
                    </div>
                  ) : sortedProducts.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg shadow flex-grow">
                      <p className="text-gray-500">There are no active products in this category at the moment.</p>
                    </div>
                  ) : (
                    // Product Table and Image/Specs Area
                    <div className="flex-grow flex flex-col">
                      <div className="flex-grow">
                        <ProductTable 
                          products={sortedProducts}
                          requestSort={requestSort}
                          sortConfig={sortConfig}
                          title={searchQuery ? `Search Results for "${searchQuery}"` : (selectedMainCategoryName || 'Products')}
                          onRowClick={(product) => setSelectedProductForImage(product)} // Handle row click
                          className="h-full"
                          fontSize={fontSize}
                          onFontSizeChange={setFontSize}
                        />
                      </div>
                      {showImageAndSpecs && (
                        <div className="mt-6 bg-white p-4 rounded-lg shadow flex-shrink-0">
                          {selectedProductForImage ? (
                            <>
                              <h3 className="text-xl font-semibold mb-2">
                                {selectedProductForImage.partnumber} - Image & Specs
                              </h3>
                              <div className="mb-4 flex justify-center">
                                <img 
                                  src={currentImageUrl} // Use state for image URL
                                  alt={selectedProductForImage.description || selectedProductForImage.partnumber}
                                  className="max-h-[550px] w-auto object-contain rounded border"
                                />
                              </div>
                              <div>
                                <h4 className="text-lg font-medium mb-1">Specifications:</h4>
                                <p className="text-lg text-gray-600 mb-2">{selectedProductForImage.description}</p>
                                <ul className="list-disc list-inside text-lg text-gray-700 space-y-1">
                                  <li>Net Price: ${selectedProductForImage.price?.toFixed(2) ?? 'N/A'}</li>
                                  <li>List Price: ${selectedProductForImage.webmsrp ?? 'N/A'}</li>
                                  <li>Inventory: {selectedProductForImage.inventory ?? 'N/A'}</li>
                                </ul>
                                
                                <div className="mt-3">
                                  <div className="text-lg text-gray-700" dangerouslySetInnerHTML={{ __html: selectedProductForImage.longdescription || 'No additional description available' }} />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-center py-8">
                              <p className="text-lg text-gray-500">Select a product to view its image and specs.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Right spacer for visual balance */}
                <div className="hidden lg:block lg:col-span-1"></div>
              </div>
            </div>
          </>
        ) : activeView === 'orders' ? (
          <OrderHistory />
        ) : activeView === 'weborders' ? (
          <WebOrdersDisplay /> 
        ) : null}
      </div>

      <footer className="bg-gray-300 text-gray-700 py-6 px-4 sm:px-6 lg:px-8 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <div>
            &copy; {new Date().getFullYear()} Lou Capece Music Distributors
          </div>
          <div>
            <Link to="/sms-communications" className="hover:text-blue-600 hover:underline">
              SMS Messaging Policy & Disclaimer
            </Link>
          </div>
          <div className="font-semibold">
            CONFIDENTIAL: Wholesale Only
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
