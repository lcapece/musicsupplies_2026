import React, { useState, useEffect } from 'react';

// Utility function to decode HTML entities
const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};
import { supabase } from '../lib/supabase';
import CategoryTree from '../components/CategoryTree';
import ProductTable from '../components/ProductTable';
import SearchBar from '../components/SearchBar';
import Header from '../components/Header';
import OrderHistory from './OrderHistory';
import WebOrdersDisplay from './WebOrdersDisplay';
import { Product, User as AuthUser, RtExtended } from '../types';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import ImageComingSoon from '../images/coming-soon.png';
import { useAuth } from '../context/AuthContext';
import PromotionalPopupModal, { PromotionalOffersStatus } from '../components/PromotionalPopupModal';
import PromoCodePopup from '../components/PromoCodePopup';
import { logKeywordSearch, logNavTreeSearch } from '../utils/eventLogger';
import { activityTracker } from '../services/activityTracker';
import { logSearchActivity, getSessionId, buildSearchQuery } from '../utils/performantLogger';
import DemoModeBanner from '../components/DemoModeBanner';
import { useNavigate } from 'react-router-dom';
import { useAutoVersionCheck } from '../hooks/useAutoVersionCheck';
// EMERGENCY REMOVED: OverdueInvoiceModal and useOverdueInvoices - blocking ALL customers

const DashboardClean: React.FC = () => {
  const { user, isDemoMode, logout, showOriginalEntityModal, isStaffUser, staffUsername, openProspectsModal } = useAuth();
  const navigate = useNavigate();
  
  useAutoVersionCheck();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | null; direction: 'ascending' | 'descending' }>({ key: 'partnumber', direction: 'ascending' });
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | undefined>();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>();
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState<string | undefined>();
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showImageAndSpecs, setShowImageAndSpecs] = useState(true);
  const [showMsrp, setShowMsrp] = useState(true);
  const [showMapPrice, setShowMapPrice] = useState(true);
  const [showMasterCartonPrices, setShowMasterCartonPrices] = useState(true);
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);
  const [rtExtendedData, setRtExtendedData] = useState<RtExtended | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
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
  const [exactMatches, setExactMatches] = useState<Set<string>>(new Set());
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [promoStatusData, setPromoStatusData] = useState<PromotionalOffersStatus | null>(null);
  const [showPromoCodePopup, setShowPromoCodePopup] = useState(false);
  const [inventoryRefreshTimestamp, setInventoryRefreshTimestamp] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'smaller' | 'standard' | 'larger'>('standard');
  // EMERGENCY REMOVED 11/28 - ALL overdue invoice code deleted

  const handleDemoTimeout = () => {
    logout();
    navigate('/');
  };

  // IMPROVED SIMPLE IMAGE LOADING - Try multiple patterns but stop immediately when found
  useEffect(() => {
    if (!showImageAndSpecs || !selectedProductForImage) {
      setCurrentImageUrl('');
      setRtExtendedData(null);
      return;
    }

    const partnumber = selectedProductForImage.partnumber;
    let currentAttempt = 0;
    let imageFound = false; // Flag to stop all searches once image is found
    const maxAttempts = 5; // Limit attempts to prevent loops
    
    const tryImageUrls = [
      `https://mus86077.s3.amazonaws.com/${partnumber.toLowerCase()}.jpg`,
      `https://mus86077.s3.amazonaws.com/${partnumber.toLowerCase()}.png`,
      `https://mus86077.s3.amazonaws.com/${partnumber.toLowerCase()}-1.jpg`,
      `https://mus86077.s3.amazonaws.com/${partnumber.toLowerCase()}-2.jpg`,
      `https://mus86077.s3.amazonaws.com/${partnumber.toLowerCase()}-3.jpg`
    ];

    const testImage = (url: string) => {
      if (imageFound) return; // STOP: Image already found
      
      const img = new Image();
      img.onload = () => {
        if (!imageFound) { // Double-check to prevent race conditions
          imageFound = true; // STOP all further searches
          setCurrentImageUrl(url);
        }
      };
      img.onerror = () => {
        if (imageFound) return; // STOP: Image already found
        
        currentAttempt++;
        if (currentAttempt < maxAttempts && currentAttempt < tryImageUrls.length) {
          testImage(tryImageUrls[currentAttempt]);
        } else {
          if (!imageFound) {
            setCurrentImageUrl(ImageComingSoon);
          }
        }
      };
      img.src = url;
    };

    // Start with first URL
    testImage(tryImageUrls[0]);
    setRtExtendedData(null);
    
  }, [selectedProductForImage, showImageAndSpecs]);

  // All other useEffects and functions remain the same...
  useEffect(() => {
    if (isDemoMode) {
      const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); return false; };
      const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); return false; };
      const handleSelectStart = (e: Event) => { e.preventDefault(); return false; };

      document.addEventListener('copy', handleCopy);
      document.addEventListener('cut', handleCopy);
      document.addEventListener('paste', handleCopy);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('selectstart', handleSelectStart);
      document.body.classList.add('demo-mode-no-select');

      return () => {
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('cut', handleCopy);
        document.removeEventListener('paste', handleCopy);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('selectstart', handleSelectStart);
        document.body.classList.remove('demo-mode-no-select');
      };
    }
  }, [isDemoMode]);

  useEffect(() => {
    const loadUserFontPreference = async () => {
      if (user?.accountNumber) {
        try {
          const { data, error } = await supabase.rpc('get_user_font_preference', {
            user_account: user.accountNumber
          });
          
          if (!error && data) {
            setFontSize(data as 'smaller' | 'standard' | 'larger');
          } else {
            setFontSize('standard');
          }
        } catch (error) {
          setFontSize('standard');
        }
      } else {
        setFontSize('standard');
      }
    };

    loadUserFontPreference();
  }, [user?.accountNumber]);

  const handleFontSizeChange = async (newSize: 'smaller' | 'standard' | 'larger') => {
    setFontSize(newSize);
    
    if (user?.accountNumber) {
      try {
        await supabase.rpc('save_user_font_preference', {
          user_account: user.accountNumber,
          font_preference: newSize
        });
      } catch (error) {
      }
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchInventoryRefreshTimestamp();
    setSelectedProductForImage(null);
  }, [searchTerms, inStockOnly]);

  useEffect(() => {
    const fetchAndShowPromoPopup = async () => {
    };
    fetchAndShowPromoPopup();
  }, [user]);
  
  useEffect(() => {
  }, [user]);

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

  const fetchInventoryRefreshTimestamp = async () => {
    try {
      const { data, error } = await supabase
        .from('products_supabase')
        .select('inventory_refreshed')
        .not('inventory_refreshed', 'is', null)
        .order('inventory_refreshed', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching inventory refresh timestamp:', error);
        return;
      }

      if (data && data.inventory_refreshed) {
        const timestamp = new Date(data.inventory_refreshed);
        const formatted = timestamp.toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        setInventoryRefreshTimestamp(formatted);
      }
    } catch (error) {
      console.error('Error fetching inventory refresh timestamp:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('products_supabase').select('*');

      // REMOVED CATEGORY FILTERING - Navigation tree is for display only, not filtering
      // Category filtering has been disabled to show all products

      if (searchTerms.primary || searchTerms.additional) {
        if (searchTerms.primary && searchTerms.additional) {
          query = query.or(`partnumber.ilike.%${searchTerms.primary}%,description.ilike.%${searchTerms.primary}%,brand.ilike.%${searchTerms.primary}%`);
        } else if (searchTerms.primary) {
          query = query.or(`partnumber.ilike.%${searchTerms.primary}%,description.ilike.%${searchTerms.primary}%,brand.ilike.%${searchTerms.primary}%`);
        } else if (searchTerms.additional) {
          query = query.or(`partnumber.ilike.%${searchTerms.additional}%,description.ilike.%${searchTerms.additional}%,brand.ilike.%${searchTerms.additional}%`);
        }
      }

      // Apply exclude filter at database level for better performance
      if (searchTerms.exclude) {
        query = query
          .not('partnumber', 'ilike', `%${searchTerms.exclude}%`)
          .not('description', 'ilike', `%${searchTerms.exclude}%`)
          .not('brand', 'ilike', `%${searchTerms.exclude}%`);
      }

      if (inStockOnly) {
        query = query.gt('inventory', 0);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      let filteredData = data || [];

      // Apply AND logic client-side for additional term
      if (searchTerms.primary && searchTerms.additional && filteredData.length > 0) {
        const additionalLower = searchTerms.additional.toLowerCase();
        filteredData = filteredData.filter(product => {
          const partnumberMatch = product.partnumber?.toLowerCase().includes(additionalLower) || false;
          const descriptionMatch = product.description?.toLowerCase().includes(additionalLower) || false;
          const brandMatch = product.brand?.toLowerCase().includes(additionalLower) || false;
          return partnumberMatch || descriptionMatch || brandMatch;
        });
      }

      // Apply exclude filter client-side for better control
      if (searchTerms.exclude && filteredData.length > 0) {
        const excludeLower = searchTerms.exclude.toLowerCase();
        filteredData = filteredData.filter(product => {
          const partnumberHasExclude = product.partnumber?.toLowerCase().includes(excludeLower) || false;
          const descriptionHasExclude = product.description?.toLowerCase().includes(excludeLower) || false;
          const brandHasExclude = product.brand?.toLowerCase().includes(excludeLower) || false;
          return !partnumberHasExclude && !descriptionHasExclude && !brandHasExclude;
        });
      }

      // Exact part number match prioritization
      let finalData = filteredData;
      const newExactMatches = new Set<string>();
      
      if (searchTerms.primary && filteredData.length > 0) {
        const primaryLower = searchTerms.primary.toLowerCase();
        const exactMatchProducts: Product[] = [];
        const wildcardMatches: Product[] = [];
        
        filteredData.forEach(product => {
          if (product.partnumber?.toLowerCase() === primaryLower) {
            exactMatchProducts.push(product);
            newExactMatches.add(product.partnumber);
          } else {
            wildcardMatches.push(product);
          }
        });
        
        if (exactMatchProducts.length > 0) {
          finalData = [...exactMatchProducts, ...wildcardMatches];
        }
      }
      
      setExactMatches(newExactMatches);
      setProducts(finalData);

      // Simplified logging without phantom function calls
      try {
        const resultsCount = Array.isArray(finalData) ? finalData.length : 0;
        const acctNum = user?.accountNumber ? parseInt(user.accountNumber, 10) : NaN;
        const email = user?.email || null;
        
        if ((searchTerms.primary || searchTerms.additional || searchTerms.exclude) && user) {
        }
      } catch (e) {
      }
    } catch (error) {
      console.error('[DashboardClean] Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCategorySelect = (selection: import('../components/CategoryTree').CategorySelection | null) => {
    setSelectedProductForImage(null); 

    if (selection) {
      setSelectedCategoryId(selection.id);
      const { namePath, isMainCategory, parentCategoryCode } = selection;
      
      if (isMainCategory) {
        setSelectedMainCategory(namePath[0]);
        setSelectedSubCategory(undefined);
        setSelectedMainCategoryName(namePath[0]);
        setSelectedSubCategoryName(undefined);
      } else {
        setSelectedMainCategory(namePath[0]);
        setSelectedSubCategory(namePath[1]);
        setSelectedMainCategoryName(namePath[0]);
        setSelectedSubCategoryName(namePath[1]);
      }
    } else {
      setSelectedCategoryId(null);
      setSelectedMainCategory(undefined);
      setSelectedSubCategory(undefined);
      setSelectedMainCategoryName(undefined);
      setSelectedSubCategoryName(undefined);
    }
  };
  
  const handleSearch = (primaryQuery: string, additionalQuery: string, excludeQuery: string) => {
    const p = primaryQuery.trim();
    const a = additionalQuery.trim();
    const e = excludeQuery.trim();
    setSearchQuery(p);
    setSearchTerms({
      primary: p,
      additional: a,
      exclude: e
    });
    setSelectedProductForImage(null);
    setSelectedMainCategory(undefined);
    setSelectedSubCategory(undefined);
    setSelectedMainCategoryName(undefined);
    setSelectedSubCategoryName(undefined);
    setSelectedCategoryId(null);
  };

  const handleViewChange = (view: 'products' | 'orders' | 'weborders') => {
    setActiveView(view);
  };
  
  return (
    <div className="h-screen bg-gray-100 flex flex-col relative">
      {isDemoMode && <DemoModeBanner onTimeout={handleDemoTimeout} />}
      <Header onViewChange={handleViewChange} activeView={activeView} />
      
      
      <div className="flex flex-col h-[85vh]">
        {activeView === 'products' ? (
          <>
            <div className="py-2 px-4 sm:px-6 lg:px-8 flex-shrink-0">
              <SearchBar onSearch={handleSearch} fontSize={fontSize} />
            </div>
            
            <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-2 overflow-hidden">
              <div className="flex h-full">
                <div className="w-64 flex-shrink-0 pr-8">
                  <CategoryTree 
                    onSelectCategory={handleCategorySelect}
                    selectedCategoryId={selectedCategoryId}
                    fontSize={fontSize}
                  />
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md w-full overflow-visible">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className={`${fontSize === 'smaller' ? 'font-professional-smaller' : fontSize === 'larger' ? 'font-professional-larger' : 'font-professional-standard'} text-gray-700`}>
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

                      <div className="flex items-center justify-center gap-6">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="showImageAndSpecs"
                            checked={showImageAndSpecs}
                            onChange={(e) => {
                              setShowImageAndSpecs(e.target.checked);
                              if (!e.target.checked) {
                                setSelectedProductForImage(null);
                              }
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="showImageAndSpecs" className={`ml-2 block ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-900`}>
                            Show Images & Specs
                          </label>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="inStockOnly"
                            checked={inStockOnly}
                            onChange={(e) => setInStockOnly(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="inStockOnly" className={`ml-2 block ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-900`}>
                            Show In-Stock Items Only
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-6">
                        <div className={`${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-base' : 'text-sm'} text-gray-600`}>
                          {inventoryRefreshTimestamp ? `Inventory as of: ${inventoryRefreshTimestamp}` : 'Loading inventory timestamp...'}
                        </div>

                        {!showImageAndSpecs && (
                          <>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="showMsrp"
                                checked={showMsrp}
                                onChange={(e) => setShowMsrp(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="showMsrp" className={`ml-2 block ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-900`}>
                                Show MSRP
                              </label>
                            </div>
                            
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="showMapPrice"
                                checked={showMapPrice}
                                onChange={(e) => setShowMapPrice(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="showMapPrice" className={`ml-2 block ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-900`}>
                                Show MAP Price
                              </label>
                            </div>
                            
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="showMasterCartonPrices"
                                checked={showMasterCartonPrices}
                                onChange={(e) => setShowMasterCartonPrices(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="showMasterCartonPrices" className={`ml-2 block ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-900`}>
                                Show Master Carton Prices
                              </label>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-500">Loading products...</p>
                    </div>
                  ) : sortedProducts.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-500">There are no active products in this category at the moment.</p>
                    </div>
                  ) : (
                    <div className={`flex flex-col ${showImageAndSpecs ? 'lg:flex-row' : ''} gap-4 flex-1 min-h-0`}>
                      <div className={`${showImageAndSpecs ? 'lg:w-4/5' : 'w-full'} flex flex-col min-h-0`}>
                        <ProductTable
                          products={sortedProducts}
                          requestSort={requestSort}
                          sortConfig={sortConfig}
                          title={searchQuery ? `Search Results for "${searchQuery}"` : (selectedMainCategoryName || 'Products')}
                          onRowClick={(product) => setSelectedProductForImage(product)}
                          showUpcColumn={!showImageAndSpecs}
                          showMsrp={!showImageAndSpecs && showMsrp}
                          showMapPrice={!showImageAndSpecs && showMapPrice}
                          className="flex-1"
                          fontSize={fontSize}
                          onFontSizeChange={setFontSize}
                          enableFiltering={false}
                          exactMatches={exactMatches}
                          showImages={false}
                        />
                      </div>
                      {showImageAndSpecs && selectedProductForImage && (
                        <div className="lg:w-1/5 bg-white p-3 rounded-lg shadow overflow-y-auto max-h-[calc(100vh-200px)]">
                          <h3 className="text-lg font-semibold mb-2">
                            {selectedProductForImage.partnumber} - Image & Specs
                          </h3>
                          <div className="mb-4 flex justify-center">
                            {currentImageUrl && currentImageUrl !== ImageComingSoon ? (
                              <img
                                src={currentImageUrl}
                                alt={selectedProductForImage.description || selectedProductForImage.partnumber}
                                className="max-h-[550px] w-auto object-contain rounded border"
                                onError={() => setCurrentImageUrl(ImageComingSoon)}
                              />
                            ) : currentImageUrl === ImageComingSoon ? (
                              <div className="flex items-center justify-center h-64 bg-gray-100 rounded border">
                                <div className="text-center text-gray-500">
                                  <div className="text-lg font-medium">Image Coming Soon</div>
                                  <div className="text-sm">No image available for this product</div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-64 bg-gray-100 rounded border">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col h-full">
                            <h4 className="font-medium mb-1">Product Specifications:</h4>
                            
                            {/* Long description or description with flexible height to fill remaining space */}
                            <div className="text-sm text-gray-700 mb-3 flex-1 overflow-y-auto border border-gray-200 p-2 rounded">
                              {selectedProductForImage.longdescription ? (
                                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(selectedProductForImage.longdescription) }} />
                              ) : (
                                <p>{selectedProductForImage.description}</p>
                              )}
                            </div>

                            {/* Conditional UPC display */}
                            {selectedProductForImage.upc && selectedProductForImage.upc.trim() !== '' && (
                              <div className="text-sm text-gray-700 mb-2 flex-shrink-0">
                                <span className="font-medium">UPC:</span> {selectedProductForImage.upc}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {showImageAndSpecs && !selectedProductForImage && (
                        <div className="lg:w-1/5 bg-white p-3 rounded-lg shadow flex items-center justify-center">
                          <p className="text-gray-500">Select a product to view its image and specs.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'orders' ? (
          <OrderHistory />
        ) : activeView === 'weborders' ? (
          <WebOrdersDisplay /> 
        ) : null}
      </div>

      {promoStatusData && (
        <PromotionalPopupModal
          isOpen={showPromoPopup}
          onClose={() => setShowPromoPopup(false)}
          promoStatus={promoStatusData}
        />
      )}
      
      <PromoCodePopup
        isOpen={showPromoCodePopup}
        onClose={() => setShowPromoCodePopup(false)}
      />

      {/* EMERGENCY DISABLED 11/28 - Overdue modal completely removed */}
    </div>
  );
};

export default DashboardClean;
