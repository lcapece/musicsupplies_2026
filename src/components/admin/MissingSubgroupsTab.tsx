import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Product {
  partnumber: string;
  description: string;
  prdmaincat: string | null;
  prdsubcat: string | null;
}

interface ProductGroup {
  main_group: string;
  sub_group: string;
}

const ITEMS_PER_PAGE = 100;

const MissingSubgroupsTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [paginatedProducts, setPaginatedProducts] = useState<Product[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [mainSearch, setMainSearch] = useState('');
  const [secondarySearch, setSecondarySearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product;
    direction: 'asc' | 'desc';
  } | null>(null);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  useEffect(() => {
    fetchMissingProducts();
    fetchProductGroups();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [mainSearch, secondarySearch, products]);

  useEffect(() => {
    updatePaginatedProducts();
  }, [filteredProducts, currentPage, sortConfig]);

  const fetchMissingProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lcmd_products')
        .select('partnumber, description, prdmaincat, prdsubcat')
        .limit(10000);
      
      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      // Filter products with missing groups on client side
      const filteredData = (data || []).filter(product => {
        const isMissingMainCat = !product.prdmaincat || product.prdmaincat === '' || 
                                product.prdmaincat.toUpperCase() === 'NA';
        const isMissingSubCat = !product.prdsubcat || product.prdsubcat === '' || 
                               product.prdsubcat.toUpperCase() === 'NA';
        return isMissingMainCat || isMissingSubCat;
      });

      setProducts(filteredData);
      setFilteredProducts(filteredData);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('product_groups')
        .select('prdmaingrp, prdsubgrp')
        .order('prdmaingrp', { ascending: true })
        .order('prdsubgrp', { ascending: true });

      if (error) {
        console.error('Error fetching product groups:', error);
        return;
      }

      // Map to the expected interface
      const mapped = (data || []).map(group => ({
        main_group: group.prdmaingrp,
        sub_group: group.prdsubgrp
      }));

      setProductGroups(mapped);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (mainSearch) {
      filtered = filtered.filter(product =>
        product.description.toLowerCase().includes(mainSearch.toLowerCase()) ||
        product.partnumber.toLowerCase().includes(mainSearch.toLowerCase())
      );
    }

    if (secondarySearch) {
      filtered = filtered.filter(product =>
        product.description.toLowerCase().includes(secondarySearch.toLowerCase()) ||
        product.partnumber.toLowerCase().includes(secondarySearch.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  };

  const updatePaginatedProducts = () => {
    let sorted = [...filteredProducts];

    // Apply sorting
    if (sortConfig) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedProducts(sorted.slice(startIndex, endIndex));
  };

  const handleSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectProduct = (partnumber: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(partnumber)) {
      newSelected.delete(partnumber);
    } else {
      newSelected.add(partnumber);
    }
    setSelectedProducts(newSelected);
    setSelectAll(newSelected.size === paginatedProducts.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all on current page
      const currentPagePartNumbers = new Set(paginatedProducts.map(p => p.partnumber));
      const newSelected = new Set(selectedProducts);
      currentPagePartNumbers.forEach(pn => newSelected.delete(pn));
      setSelectedProducts(newSelected);
      setSelectAll(false);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedProducts);
      paginatedProducts.forEach(p => newSelected.add(p.partnumber));
      setSelectedProducts(newSelected);
      setSelectAll(true);
    }
  };

  const handleAssignGroups = async () => {
    if (!selectedGroup || selectedProducts.size === 0) {
      alert('Please select products and a product group');
      return;
    }

    const [mainGroup, subGroup] = selectedGroup.split(' >> ');
    
    try {
      setLoading(true);
      const partnumbers = Array.from(selectedProducts);
      
      const { error } = await supabase
        .from('lcmd_products')
        .update({ 
          prdmaincat: mainGroup,
          prdsubcat: subGroup,
          edited: true 
        })
        .in('partnumber', partnumbers);

      if (error) {
        console.error('Error updating products:', error);
        alert('Error updating products');
        return;
      }

      alert(`Successfully updated ${partnumbers.length} products`);
      
      // Reset and refresh
      setSelectedProducts(new Set());
      setSelectAll(false);
      fetchMissingProducts();
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating products');
    } finally {
      setLoading(false);
    }
  };

  const getSortIcon = (column: keyof Product) => {
    if (!sortConfig || sortConfig.key !== column) {
      return '↕️';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setSelectAll(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Missing Subgroups Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage products with missing main or sub categories
          </p>
        </div>
        <button
          onClick={fetchMissingProducts}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh
        </button>
      </div>
      
      {/* Statistics */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm font-medium text-gray-600">Products with Missing Groups</div>
        <div className="text-2xl font-bold text-orange-600">{products.length}</div>
        <div className="text-xs text-gray-500 mt-1">
          Products where main category or sub category is null, empty, or "NA"
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Main Search Term</label>
            <input
              type="text"
              value={mainSearch}
              onChange={(e) => setMainSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Search Term</label>
            <input
              type="text"
              value={secondarySearch}
              onChange={(e) => setSecondarySearch(e.target.value)}
              placeholder="Additional filter..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Group Assignment - Moved above table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Product Groups</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Product Group
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              disabled={selectedProducts.size === 0}
            >
              <option value="">Choose a product group...</option>
              {productGroups.map((group, index) => (
                <option key={index} value={`${group.main_group} >> ${group.sub_group}`}>
                  {group.main_group} &#187;&#187; {group.sub_group}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={handleAssignGroups}
              disabled={selectedProducts.size === 0 || !selectedGroup || loading}
              className={`w-full px-4 py-2 rounded-md text-sm font-medium ${
                selectedProducts.size === 0 || !selectedGroup || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Assign Groups ({selectedProducts.size} selected)
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Products with Missing Groups ({filteredProducts.length} items)
          </h3>
          {totalPages > 1 && (
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} (Showing {paginatedProducts.length} items)
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading products...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No products found with missing groups</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </th>
                    <th 
                      onClick={() => handleSort('partnumber')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Part Number {getSortIcon('partnumber')}
                    </th>
                    <th 
                      onClick={() => handleSort('description')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Description {getSortIcon('description')}
                    </th>
                    <th 
                      onClick={() => handleSort('prdmaincat')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Main Category {getSortIcon('prdmaincat')}
                    </th>
                    <th 
                      onClick={() => handleSort('prdsubcat')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Sub Category {getSortIcon('prdsubcat')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => (
                    <tr key={product.partnumber} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.partnumber)}
                          onChange={() => handleSelectProduct(product.partnumber)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.partnumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(!product.prdmaincat || product.prdmaincat === '' || product.prdmaincat.toUpperCase() === 'NA') ? (
                          <span className="text-red-500 italic">Missing</span>
                        ) : (
                          product.prdmaincat
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(!product.prdsubcat || product.prdsubcat === '' || product.prdsubcat.toUpperCase() === 'NA') ? (
                          <span className="text-red-500 italic">Missing</span>
                        ) : (
                          product.prdsubcat
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md text-sm ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-1 rounded-md text-sm ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md text-sm ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Next
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  {selectedProducts.size > 0 && `${selectedProducts.size} items selected across all pages`}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MissingSubgroupsTab;
