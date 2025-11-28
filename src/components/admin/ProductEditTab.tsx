import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellValueChangedEvent } from 'ag-grid-community';
import { supabase } from '../../lib/supabase';
import ProductEditPanel from '../ProductEditPanel';
import { Product } from '../../types';
import { Edit3 } from 'lucide-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface ProductManagerRow {
  partnumber: string;
  description: string | null;
  longdescription: string | null;
  map: number | null;
  brand: string | null;
  image: string | null;
  price: number | null;
  master_carton_price: number | null;
  master_carton_qty: number | null;
  listprice: number | null;
  dstamp: string | null;
}

const ProductEditTab: React.FC = () => {
  const [rowData, setRowData] = useState<ProductManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerms, setSearchTerms] = useState({
    primary: '',
    additional: '',
    exclude: ''
  });
  const [filteredData, setFilteredData] = useState<ProductManagerRow[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);

  // Convert ProductManagerRow to Product type
  const convertToProduct = useCallback((row: ProductManagerRow): Product => ({
    partnumber: row.partnumber,
    description: row.description || '',
    longdescription: row.longdescription || '',
    price: row.price,
    brand: row.brand || '',
    map: row.map,
    master_carton_price: row.master_carton_price,
    master_carton_quantity: row.master_carton_qty,
    inventory: null, // Not available in products_manager table
    upc: '', // Not available in products_manager table
    image: row.image || ''
  }), []);

  // Handle opening the detailed edit panel
  const handleOpenEditPanel = useCallback((row: ProductManagerRow) => {
    const product = convertToProduct(row);
    setSelectedProduct(product);
    setShowEditPanel(true);
  }, [convertToProduct]);

  // Handle saving from the edit panel
  const handleSaveFromPanel = useCallback((updatedProduct: Product) => {
    // Update the row data with the changes from the edit panel
    const updatedRowData = rowData.map(row =>
      row.partnumber === updatedProduct.partnumber
        ? {
            ...row,
            description: updatedProduct.description || null,
            longdescription: updatedProduct.longdescription || null,
            price: updatedProduct.price,
            brand: updatedProduct.brand || null,
            map: updatedProduct.map,
            master_carton_price: updatedProduct.master_carton_price,
            master_carton_qty: updatedProduct.master_carton_quantity,
            image: updatedProduct.image || null,
            dstamp: new Date().toISOString()
          } as ProductManagerRow
        : row
    );
    setRowData(updatedRowData);
    setShowEditPanel(false);
    setSelectedProduct(null);
  }, [rowData]);

  // Column definitions with Excel-like editing using ACTUAL database columns
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'partnumber',
      headerName: 'Part Number',
      editable: true,
      width: 150,
      pinned: 'left',
      cellStyle: { fontWeight: 'bold', backgroundColor: '#f0f8ff' }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      pinned: 'left',
      editable: false,
      cellRenderer: (params: any) => {
        return `
          <button
            class="edit-btn inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-partnumber="${params.data.partnumber}"
            title="Open detailed editor"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit
          </button>
        `;
      },
      onCellClicked: (params: any) => {
        const target = params.event.target;
        if (target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
          handleOpenEditPanel(params.data);
        }
      }
    },
    {
      field: 'description',
      headerName: 'Description',
      editable: true,
      width: 300,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true
    },
    {
      field: 'longdescription',
      headerName: 'Long Description',
      editable: true,
      width: 400,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true
    },
    {
      field: 'brand',
      headerName: 'Brand',
      editable: true,
      width: 150
    },
    {
      field: 'price',
      headerName: 'Price',
      editable: true,
      width: 100,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params: any) => params.value != null ? `$${params.value.toFixed(2)}` : '',
      valueParser: (params: any) => parseFloat(params.newValue) || null
    },
    {
      field: 'master_carton_price',
      headerName: 'M/C Price',
      editable: true,
      width: 100,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params: any) => params.value != null ? `$${params.value.toFixed(2)}` : '',
      valueParser: (params: any) => parseFloat(params.newValue) || null
    },
    {
      field: 'master_carton_qty',
      headerName: 'M/C Qty',
      editable: true,
      width: 100,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params: any) => params.value != null ? params.value.toString() : '',
      valueParser: (params: any) => parseInt(params.newValue) || null
    },
    {
      field: 'listprice',
      headerName: 'List Price',
      editable: true,
      width: 100,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params: any) => params.value != null ? `$${params.value.toFixed(2)}` : '',
      valueParser: (params: any) => parseFloat(params.newValue) || null
    },
    {
      field: 'map',
      headerName: 'MAP',
      editable: true,
      width: 100,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params: any) => params.value != null ? `$${params.value.toFixed(2)}` : '',
      valueParser: (params: any) => parseFloat(params.newValue) || null
    },
    {
      field: 'image',
      headerName: 'Image',
      editable: true,
      width: 200,
      cellRenderer: (params: any) => {
        if (params.value) {
          return `<span title="${params.value}">${params.value.substring(0, 30)}${params.value.length > 30 ? '...' : ''}</span>`;
        }
        return '';
      }
    },
    {
      field: 'dstamp',
      headerName: 'Date Stamp',
      editable: false,
      width: 150,
      valueFormatter: (params: any) => {
        if (params.value) {
          const date = new Date(params.value);
          return date.toLocaleString();
        }
        return '';
      }
    }
  ], []);

  // Default column properties
  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true,
    editable: true,
    suppressMovable: false
  }), []);

  // Fetch products from products_manager table
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_manager')
        .select('*')
        .order('partnumber');

      if (error) {
        console.error('Error fetching products:', error);
        alert(`Error fetching products: ${error.message}`);
        return;
      }

      setRowData(data || []);
      setFilteredData(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Apply search filters
  useEffect(() => {
    let filtered = [...rowData];

    // Apply primary search term
    if (searchTerms.primary) {
      const primaryLower = searchTerms.primary.toLowerCase();
      filtered = filtered.filter(product => 
        product.partnumber?.toLowerCase().includes(primaryLower) ||
        product.description?.toLowerCase().includes(primaryLower) ||
        product.longdescription?.toLowerCase().includes(primaryLower) ||
        product.brand?.toLowerCase().includes(primaryLower)
      );
    }

    // Apply additional search term (AND logic)
    if (searchTerms.additional) {
      const additionalLower = searchTerms.additional.toLowerCase();
      filtered = filtered.filter(product => 
        product.partnumber?.toLowerCase().includes(additionalLower) ||
        product.description?.toLowerCase().includes(additionalLower) ||
        product.longdescription?.toLowerCase().includes(additionalLower) ||
        product.brand?.toLowerCase().includes(additionalLower)
      );
    }

    // Apply exclude search term (NOT logic)
    if (searchTerms.exclude) {
      const excludeLower = searchTerms.exclude.toLowerCase();
      filtered = filtered.filter(product => 
        !product.partnumber?.toLowerCase().includes(excludeLower) &&
        !product.description?.toLowerCase().includes(excludeLower) &&
        !product.longdescription?.toLowerCase().includes(excludeLower) &&
        !product.brand?.toLowerCase().includes(excludeLower)
      );
    }

    setFilteredData(filtered);
  }, [rowData, searchTerms]);

  // Handle cell value changes with real-time updates
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const { data, colDef, newValue, oldValue } = event;
    
    if (newValue === oldValue) return;

    try {
      
      // Update the database using partnumber as primary key
      const { error } = await supabase
        .from('products_manager')
        .update({ 
          [colDef.field!]: newValue,
          dstamp: new Date().toISOString() // Update timestamp
        })
        .eq('partnumber', data.partnumber);

      if (error) {
        console.error('Error updating product:', error);
        // Revert the change in the grid
        data[colDef.field!] = oldValue;
        event.api.refreshCells({ rowNodes: [event.node!], force: true });
        alert(`Failed to update product: ${error.message}`);
        return;
      }

      // Update local data
      const updatedRowData = rowData.map(row => 
        row.partnumber === data.partnumber 
          ? { ...row, [colDef.field!]: newValue, dstamp: new Date().toISOString() }
          : row
      );
      setRowData(updatedRowData);

    } catch (error) {
      console.error('Error updating product:', error);
      // Revert the change in the grid
      data[colDef.field!] = oldValue;
      event.api.refreshCells({ rowNodes: [event.node!], force: true });
      alert('Failed to update product. Please try again.');
    }
  }, [rowData]);

  const handleSearchChange = (field: 'primary' | 'additional' | 'exclude', value: string) => {
    setSearchTerms(prev => ({ ...prev, [field]: value }));
  };

  const clearSearch = () => {
    setSearchTerms({ primary: '', additional: '', exclude: '' });
  };

  const addNewProduct = () => {
    const newPartnumber = prompt('Enter new part number:');
    if (!newPartnumber) return;
    
    // Check if part number already exists
    if (rowData.some(row => row.partnumber === newPartnumber)) {
      alert('Part number already exists!');
      return;
    }

    const newProduct: ProductManagerRow = {
      partnumber: newPartnumber,
      description: 'New Product',
      longdescription: null,
      map: null,
      brand: null,
      image: null,
      price: null,
      master_carton_price: null,
      master_carton_qty: null,
      listprice: null,
      dstamp: new Date().toISOString()
    };

    // Add to database
    supabase
      .from('products_manager')
      .insert(newProduct)
      .then(({ error }) => {
        if (error) {
          console.error('Error adding product:', error);
          alert(`Failed to add product: ${error.message}`);
        } else {
          fetchProducts(); // Refresh data
        }
      });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Products Manager - Excel Editor</h2>
          <button
            onClick={addNewProduct}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            + Add New Product
          </button>
        </div>
        
        {/* Search Section */}
        <div className="bg-gray-50 p-4 rounded-lg border mb-4">
          <h3 className="text-lg font-semibold mb-3">Search & Filter Products</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="primary-search" className="block text-sm font-medium text-gray-700 mb-1">
                Search A (Primary)
              </label>
              <input
                type="text"
                id="primary-search"
                value={searchTerms.primary}
                onChange={(e) => handleSearchChange('primary', e.target.value)}
                placeholder="Part number, description, brand..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="additional-search" className="block text-sm font-medium text-gray-700 mb-1">
                Search B (Additional)
              </label>
              <input
                type="text"
                id="additional-search"
                value={searchTerms.additional}
                onChange={(e) => handleSearchChange('additional', e.target.value)}
                placeholder="Must also contain..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="exclude-search" className="block text-sm font-medium text-gray-700 mb-1">
                Search NOT (Exclude)
              </label>
              <input
                type="text"
                id="exclude-search"
                value={searchTerms.exclude}
                onChange={(e) => handleSearchChange('exclude', e.target.value)}
                placeholder="Exclude results containing..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Showing {filteredData.length} of {rowData.length} products
          </div>
        </div>
      </div>

      {/* AG Grid */}
      <div className="flex-1" style={{ minHeight: '600px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-gray-500">Loading products from database...</div>
          </div>
        ) : (
          <div className="ag-theme-alpine h-full">
            <AgGridReact
              rowData={filteredData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onCellValueChanged={onCellValueChanged}
              animateRows={true}
              rowSelection="single"
              enableCellTextSelection={true}
              suppressRowClickSelection={false}
              stopEditingWhenCellsLoseFocus={true}
              undoRedoCellEditing={true}
              undoRedoCellEditingLimit={20}
              enableRangeSelection={false}
              singleClickEdit={true}
              getRowId={(params) => params.data.partnumber}
            />
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-lg font-semibold text-blue-800 mb-2">📋 Excel-like Editor Instructions:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Edit:</strong> Single-click any cell to edit (except Date Stamp)</li>
            <li><strong>Navigate:</strong> Use arrow keys to move between cells</li>
            <li><strong>Save:</strong> Press Enter or Tab to save changes</li>
            <li><strong>Undo:</strong> Use Ctrl+Z to undo recent changes</li>
          </ul>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Search:</strong> Use Search A + B for AND logic</li>
            <li><strong>Exclude:</strong> Use Search NOT to exclude terms</li>
            <li><strong>NEW FIELDS:</strong> M/C Price and M/C Qty are now editable</li>
            <li><strong>Auto-Save:</strong> Changes saved automatically to database</li>
          </ul>
        </div>
        <div className="mt-2 text-xs text-blue-600">
          💡 <strong>Tip:</strong> All edits are immediately saved to the Supabase database. Part Number (partnumber) is the primary key.
        </div>
      </div>

      {/* Product Edit Panel Modal */}
      {showEditPanel && selectedProduct && (
        <ProductEditPanel
          product={selectedProduct}
          isOpen={showEditPanel}
          onClose={() => {
            setShowEditPanel(false);
            setSelectedProduct(null);
          }}
          onSave={handleSaveFromPanel}
        />
      )}
    </div>
  );
};

export default ProductEditTab;
