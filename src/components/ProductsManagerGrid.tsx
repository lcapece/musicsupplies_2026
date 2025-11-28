import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellValueChangedEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ProductsManagerRow {
  id?: number;
  product_code: string;
  product_name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  price: number;
  cost: number;
  quantity_on_hand: number;
  reorder_level: number;
  supplier?: string;
  active: boolean;
}

const ProductsManagerGrid: React.FC = () => {
  const { user } = useAuth();
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<ProductsManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Column definitions with Excel-like editing
  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      editable: false,
      pinned: 'left',
      cellStyle: { backgroundColor: '#f0f0f0' }
    },
    {
      field: 'product_code',
      headerName: 'Product Code',
      width: 120,
      editable: true,
      pinned: 'left'
    },
    {
      field: 'product_name',
      headerName: 'Product Name',
      width: 200,
      editable: true,
      pinned: 'left'
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 250,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Guitars', 'Bass Guitars', 'Drums', 'Keyboards', 'Amplifiers', 'Microphones', 'Accessories']
      }
    },
    {
      field: 'subcategory',
      headerName: 'Subcategory',
      width: 120,
      editable: true
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 100,
      editable: true,
      cellDataType: 'number',
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : '$0.00'
    },
    {
      field: 'cost',
      headerName: 'Cost',
      width: 100,
      editable: true,
      cellDataType: 'number',
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : '$0.00'
    },
    {
      field: 'quantity_on_hand',
      headerName: 'Qty on Hand',
      width: 120,
      editable: true,
      cellDataType: 'number'
    },
    {
      field: 'reorder_level',
      headerName: 'Reorder Level',
      width: 120,
      editable: true,
      cellDataType: 'number'
    },
    {
      field: 'supplier',
      headerName: 'Supplier',
      width: 150,
      editable: true
    },
    {
      field: 'active',
      headerName: 'Active',
      width: 80,
      editable: true,
      cellDataType: 'boolean',
      cellRenderer: (params) => params.value ? '✓' : '✗'
    }
  ], []);

  // Default column properties for Excel-like behavior
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    suppressKeyboardEvent: (params) => {
      // Allow Tab and Enter to move between cells like Excel
      const { event, editing } = params;
      if (!editing && (event.key === 'Tab' || event.key === 'Enter')) {
        return false;
      }
      return false;
    }
  }), []);

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/products-manager-api`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRowData(data);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save a single cell change
  const saveCellChange = useCallback(async (params: CellValueChangedEvent) => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/products-manager-api?id=${params.data.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params.data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh the grid data to show any server-side updates
      params.api.refreshCells({ rowNodes: [params.node] });
    } catch (error) {
      console.error('Error saving cell change:', error);
      alert('Failed to save change: ' + (error as Error).message);
      // Revert the change
      params.api.undoCellEditing();
    } finally {
      setSaving(false);
    }
  }, []);

  // Add new row
  const addRow = useCallback(async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      const newRow: ProductsManagerRow = {
        product_code: 'NEW_PRODUCT',
        product_name: 'New Product',
        description: 'Enter description',
        category: 'Accessories',
        subcategory: 'Other',
        price: 0,
        cost: 0,
        quantity_on_hand: 0,
        reorder_level: 0,
        supplier: 'TBD',
        active: true
      };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/products-manager-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRow)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const createdRow = await response.json();

      if (gridApi) {
        gridApi.applyTransaction({ add: [createdRow], addIndex: 0 });
        // Start editing the first cell of the new row
        setTimeout(() => {
          const firstRowNode = gridApi.getDisplayedRowAtIndex(0);
          if (firstRowNode) {
            gridApi.startEditingCell({
              rowIndex: 0,
              colKey: 'product_code'
            });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error adding row:', error);
      alert('Failed to add new row: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  }, [gridApi]);

  // Delete selected rows
  const deleteSelectedRows = useCallback(async () => {
    if (!gridApi) return;

    const selectedNodes = gridApi.getSelectedNodes();
    if (selectedNodes.length === 0) {
      alert('Please select rows to delete');
      return;
    }

    if (!confirm(`Delete ${selectedNodes.length} selected row(s)?`)) {
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session found');
      }

      // Delete each selected row
      for (const node of selectedNodes) {
        if (node.data.id) {
          const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/products-manager-api?id=${node.data.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to delete row ${node.data.id}`);
          }
        }
      }

      // Remove from grid
      gridApi.applyTransaction({ remove: selectedNodes.map(node => node.data) });
    } catch (error) {
      console.error('Error deleting rows:', error);
      alert('Failed to delete rows: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  }, [gridApi]);

  // Grid ready event
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    loadData();
  }, [loadData]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="h-full bg-white">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-2xl font-bold text-gray-900">Products Manager</h2>
        <div className="flex gap-2">
          <button
            onClick={addRow}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Add Row
          </button>
          <button
            onClick={deleteSelectedRows}
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Delete Selected
          </button>
          <button
            onClick={loadData}
            disabled={loading || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {saving && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 text-sm">
          Saving changes...
        </div>
      )}

      <div className="ag-theme-alpine h-full" style={{ height: 'calc(100vh - 200px)' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onCellValueChanged={saveCellChange}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          animateRows={true}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          maintainColumnOrder={true}
          enableRangeSelection={true}
          copyHeadersToClipboard={true}
          enableClipboard={true}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={20}
          stopEditingWhenGridLosesFocus={true}
          enterNavigatesVertically={true}
          enterNavigatesVerticallyAfterEdit={true}
          tabToNextCell={(params) => {
            const nextCell = params.nextCellPosition;
            return nextCell;
          }}
          onCellKeyDown={(event) => {
            // Enable F2 to start editing (like Excel)
            if (event.event?.key === 'F2') {
              event.api.startEditingCell({
                rowIndex: event.rowIndex!,
                colKey: event.column.getColId()
              });
            }
          }}
        />
      </div>

      <div className="p-4 bg-gray-50 text-sm text-gray-600 border-t">
        <p>
          <strong>Excel-like controls:</strong> 
          Use Tab/Shift+Tab to move between cells, Enter to move down, F2 to edit, 
          Ctrl+C/Ctrl+V for copy/paste, and click+drag to select ranges.
          Changes are saved automatically when you finish editing a cell.
        </p>
      </div>
    </div>
  );
};

export default ProductsManagerGrid;