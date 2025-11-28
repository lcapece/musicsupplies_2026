import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';

type SortField = 'partnumber' | 'description' | 'price' | 'inventory' | 'prdmaingrp' | 'prdsubgrp';
type SortDirection = 'asc' | 'desc';

const ProductsTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [primarySearch, setPrimarySearch] = useState('');
  const [secondarySearch, setSecondarySearch] = useState('');
  const [showMissingSubgroups, setShowMissingSubgroups] = useState(false);
  const [sortField, setSortField] = useState<SortField>('partnumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [totalProductCount, setTotalProductCount] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, primarySearch, secondarySearch, showMissingSubgroups, sortField, sortDirection]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // First get the total count
      const { count, error: countError } = await supabase
        .from('lcmd_products')
        .select('*', { count: 'exact', head: true });
      
      if (!countError && count) {
        setTotalProductCount(count);
      }
      
      // Then fetch products with limit
      const { data, error } = await supabase
        .from('lcmd_products')
        .select('*')
        .order('partnumber', { ascending: true })
        .limit(10000);

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Apply missing subgroups filter
    if (showMissingSubgroups) {
      filtered = filtered.filter(product => 
        !product.prdmaingrp || product.prdmaingrp === 'NA' || 
        !product.prdsubgrp || product.prdsubgrp === 'NA'
      );
    }

    // Apply search filters
    if (primarySearch.trim()) {
      const searchLower = primarySearch.toLowerCase().trim();
      filtered = filtered.filter(product => 
        Object.values(product).some(value => 
          value && value.toString().toLowerCase().includes(searchLower)
        )
      );
    }

    if (secondarySearch.trim()) {
      const searchLower = secondarySearch.toLowerCase().trim();
      filtered = filtered.filter(product => 
        Object.values(product).some(value => 
          value && value.toString().toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Convert to strings for comparison
      aVal = aVal.toString();
      bVal = bVal.toString();

      // Numeric comparison for price and inventory
      if (sortField === 'price' || sortField === 'inventory') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    setFilteredProducts(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const formatInventory = (inventory: number | null) => {
    if (inventory === null || inventory === undefined) return 'N/A';
    return inventory.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            View and search all products in the system
            {totalProductCount > 0 && ` (${totalProductCount} total products in database)`}
          </p>
        </div>
        <button
          onClick={fetchProducts}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Products</div>
          <div className="text-2xl font-bold text-blue-600">
            {products.length}
            {totalProductCount > products.length && (
              <span className="text-sm text-gray-500"> of {totalProductCount}</span>
            )}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Filtered Products</div>
          <div className="text-2xl font-bold text-green-600">{filteredProducts.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Missing Groups</div>
          <div className="text-2xl font-bold text-orange-600">
            {products.filter(p => 
              !p.prdmaingrp || p.prdmaingrp === 'NA' || 
              !p.prdsubgrp || p.prdsubgrp === 'NA'
            ).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">No Price</div>
          <div className="text-2xl font-bold text-red-600">
            {products.filter(p => !p.price || p.price === 0).length}
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Search Term
            </label>
            <input
              type="text"
              value={primarySearch}
              onChange={(e) => setPrimarySearch(e.target.value)}
              placeholder="Search any field..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Search Term
            </label>
            <input
              type="text"
              value={secondarySearch}
              onChange={(e) => setSecondarySearch(e.target.value)}
              placeholder="Additional search term..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showMissingSubgroups"
            checked={showMissingSubgroups}
            onChange={(e) => setShowMissingSubgroups(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="showMissingSubgroups" className="ml-2 text-sm text-gray-700">
            Show products with missing groups only
          </label>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Products List</h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading products...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No products found matching criteria</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleSort('partnumber')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      Part Number
                      <span className="ml-1">{getSortIcon('partnumber')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('description')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      Description
                      <span className="ml-1">{getSortIcon('description')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('price')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      Price
                      <span className="ml-1">{getSortIcon('price')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('inventory')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      Inventory
                      <span className="ml-1">{getSortIcon('inventory')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('prdmaingrp')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      Main Group
                      <span className="ml-1">{getSortIcon('prdmaingrp')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('prdsubgrp')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      Sub Group
                      <span className="ml-1">{getSortIcon('prdsubgrp')}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.partnumber} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.partnumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatInventory(product.inventory)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={!product.prdmaingrp || product.prdmaingrp === 'NA' ? 'text-red-600 font-medium' : ''}>
                        {product.prdmaingrp || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={!product.prdsubgrp || product.prdsubgrp === 'NA' ? 'text-red-600 font-medium' : ''}>
                        {product.prdsubgrp || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-800">
          Showing {filteredProducts.length} of {products.length} total products
          {showMissingSubgroups && ' (filtered to show missing groups only)'}
          {totalProductCount > products.length && 
            ` - Limited display to ${products.length} products for performance`}
        </div>
      </div>
    </div>
  );
};

export default ProductsTab;
