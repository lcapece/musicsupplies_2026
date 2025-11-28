import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';

interface ProductFilters {
  partnumber: string;
  description: string;
  category: string;
  inStockOnly: boolean;
}

const ProductManagementTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({
    partnumber: '',
    description: '',
    category: '',
    inStockOnly: false
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('rt_productgroups')
        .select('PrdMainGrp')
        .not('PrdMainGrp', 'is', null);
      
      const uniqueCategories = [...new Set(data?.map(item => item.PrdMainGrp) || [])];
      setCategories(uniqueCategories.sort());
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async (searchFilters?: ProductFilters) => {
    try {
      setLoading(true);
      let query = supabase
        .from('lcmd_products')
        .select('*')
        .order('partnumber', { ascending: true })
        .limit(200);

      const currentFilters = searchFilters || filters;

      if (currentFilters.partnumber) {
        query = query.ilike('partnumber', `%${currentFilters.partnumber}%`);
      }
      if (currentFilters.description) {
        query = query.ilike('description', `%${currentFilters.description}%`);
      }
      if (currentFilters.category) {
        query = query.eq('prdmaingrp', currentFilters.category);
      }
      if (currentFilters.inStockOnly) {
        query = query.gt('inventory', 0);
      }

      // Filter out test products
      query = query.not('partnumber', 'ilike', 'TEST-%');

      const { data, error } = await query;

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

  const handleSearch = () => {
    fetchProducts(filters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      partnumber: '',
      description: '',
      category: '',
      inStockOnly: false
    };
    setFilters(emptyFilters);
    fetchProducts(emptyFilters);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleDeleteProduct = async (partnumber: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const { error } = await supabase
          .from('lcmd_products')
          .delete()
          .eq('partnumber', partnumber);

        if (error) {
          console.error('Error deleting product:', error);
          alert('Error deleting product');
          return;
        }

        fetchProducts();
        alert('Product deleted successfully');
      } catch (error) {
        console.error('Error:', error);
        alert('Error deleting product');
      }
    }
  };

  const handleSaveProduct = async (product: Product, isNew: boolean = false) => {
    try {
      if (isNew) {
        const { error } = await supabase
          .from('lcmd_products')
          .insert([product]);

        if (error) {
          console.error('Error adding product:', error);
          alert('Error adding product');
          return;
        }
      } else {
        const { error } = await supabase
          .from('lcmd_products')
          .update(product)
          .eq('partnumber', product.partnumber);

        if (error) {
          console.error('Error updating product:', error);
          alert('Error updating product');
          return;
        }
      }

      setShowEditModal(false);
      setShowAddModal(false);
      fetchProducts();
      alert(isNew ? 'Product added successfully' : 'Product updated successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving product');
    }
  };

  const handleBulkPriceUpdate = async () => {
    const percentage = prompt('Enter percentage increase/decrease (e.g., 10 for 10% increase, -5 for 5% decrease):');
    if (!percentage) return;

    const factor = 1 + (parseFloat(percentage) / 100);
    if (isNaN(factor)) {
      alert('Invalid percentage entered');
      return;
    }

    if (window.confirm(`This will update prices for ${products.length} products by ${percentage}%. Continue?`)) {
      try {
        setLoading(true);
        
        for (const product of products) {
          if (product.price) {
            const newPrice = product.price * factor;
            await supabase
              .from('lcmd_products')
              .update({ price: newPrice })
              .eq('partnumber', product.partnumber);
          }
        }

        fetchProducts();
        alert('Bulk price update completed');
      } catch (error) {
        console.error('Error updating prices:', error);
        alert('Error updating prices');
      } finally {
        setLoading(false);
      }
    }
  };

  const ProductModal: React.FC<{ product: Product | null; isNew: boolean; onClose: () => void; onSave: (product: Product, isNew: boolean) => void }> = ({ product, isNew, onClose, onSave }) => {
    const [formData, setFormData] = useState<Product>(product || {
      partnumber: '',
      description: '',
      price: 0,
      inventory: 0,
      prdmaingrp: '',
      prdsubgrp: ''
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isNew ? 'Add New Product' : 'Edit Product'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
              <input
                type="text"
                value={formData.partnumber}
                onChange={(e) => setFormData({ ...formData, partnumber: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                disabled={!isNew}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inventory</label>
              <input
                type="number"
                value={formData.inventory || ''}
                onChange={(e) => setFormData({ ...formData, inventory: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Main Group</label>
              <select
                value={formData.prdmaingrp || ''}
                onChange={(e) => setFormData({ ...formData, prdmaingrp: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Main Group</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sub Group</label>
              <input
                type="text"
                value={formData.prdsubgrp || ''}
                onChange={(e) => setFormData({ ...formData, prdsubgrp: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(formData, isNew)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              {isNew ? 'Add Product' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Add Product
          </button>
          <button
            onClick={handleBulkPriceUpdate}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Bulk Price Update
          </button>
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter Products</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Part Number"
            value={filters.partnumber}
            onChange={(e) => setFilters({ ...filters, partnumber: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Description"
            value={filters.description}
            onChange={(e) => setFilters({ ...filters, description: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="inStockOnly"
              checked={filters.inStockOnly}
              onChange={(e) => setFilters({ ...filters, inStockOnly: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="inStockOnly" className="ml-2 text-sm text-gray-900">
              In Stock Only
            </label>
          </div>
          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Search
          </button>
          <button
            onClick={handleClearFilters}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Products ({products.length} items)
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading products...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No products found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Main Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inventory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.partnumber} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.partnumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {product.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {product.prdmaingrp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${product.price?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (product.inventory || 0) > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.inventory || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.partnumber)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isNew={false}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveProduct}
        />
      )}

      {showAddModal && (
        <ProductModal
          product={null}
          isNew={true}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
};

export default ProductManagementTab;
