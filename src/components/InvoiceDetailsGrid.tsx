import React, { useState } from 'react';
import type { InvoiceDetail, ProductLookup } from '../types';
import ProductLookupDropdown from './ProductLookupDropdown';

interface InvoiceDetailsGridProps {
  invoiceId: number | null;
  details: InvoiceDetail[];
  onChange: (details: InvoiceDetail[]) => void;
  loading?: boolean;
  readOnly?: boolean;
}

interface EditingCell {
  linekey: number;
  field: keyof InvoiceDetail;
}

const InvoiceDetailsGrid: React.FC<InvoiceDetailsGridProps> = ({
  invoiceId,
  details,
  onChange,
  loading = false,
  readOnly = false
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [addingNew, setAddingNew] = useState(false);

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Handle cell click to start editing
  const handleCellClick = (linekey: number, field: keyof InvoiceDetail, currentValue: any) => {
    if (readOnly) return;
    setEditingCell({ linekey, field });
    setEditValue(currentValue?.toString() || '');
  };

  // Handle cell value change
  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  // Save cell edit
  const handleCellBlur = () => {
    if (!editingCell) return;

    const updatedDetails = details.map(d => {
      if (d.linekey === editingCell.linekey) {
        let newValue: any = editValue;

        // Convert to appropriate type
        if (['qtyordered', 'qtyshipped', 'qtybackordered'].includes(editingCell.field)) {
          newValue = parseInt(editValue) || 0;
        } else if (['unitcost', 'unitnet'].includes(editingCell.field)) {
          newValue = parseFloat(editValue) || 0;
        }

        return { ...d, [editingCell.field]: newValue };
      }
      return d;
    });

    onChange(updatedDetails);
    setEditingCell(null);
    setEditValue('');
  };

  // Handle key press in cell
  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  // Handle product selection for new line
  const handleProductSelect = (product: ProductLookup | null) => {
    if (!product || !invoiceId) return;

    const newLineKey = details.length > 0
      ? Math.max(...details.map(d => d.linekey)) + 1
      : 1;

    const newDetail: InvoiceDetail = {
      linekey: newLineKey,
      ivd: invoiceId,
      partnumber: product.partnumber,
      description: product.description,
      unitnet: product.price || 0,
      unitcost: product.price || 0,
      qtyordered: 1,
      qtyshipped: 0,
      qtybackordered: 0
    };

    onChange([...details, newDetail]);
    setAddingNew(false);
  };

  // Delete line item
  const handleDeleteLine = (linekey: number) => {
    if (readOnly) return;
    onChange(details.filter(d => d.linekey !== linekey));
  };

  // Render editable cell
  const renderCell = (detail: InvoiceDetail, field: keyof InvoiceDetail, value: any, isNumeric = false, isCurrency = false) => {
    const isEditing = editingCell?.linekey === detail.linekey && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          type={isNumeric ? 'number' : 'text'}
          value={editValue}
          onChange={handleCellChange}
          onBlur={handleCellBlur}
          onKeyDown={handleCellKeyDown}
          autoFocus
          step={isCurrency ? '0.01' : '1'}
          className="w-full px-1 py-0 text-[10px] border border-blue-500 bg-blue-50 focus:outline-none"
        />
      );
    }

    const displayValue = isCurrency ? formatCurrency(value) : (value ?? '-');

    return (
      <div
        onClick={() => !readOnly && handleCellClick(detail.linekey, field, value)}
        className={`${!readOnly ? 'cursor-pointer hover:bg-yellow-50' : ''} ${isNumeric ? 'text-right' : ''}`}
      >
        {displayValue}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center border border-black bg-white">
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-black bg-white">
      {/* Add Item Row */}
      {!readOnly && (
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 border-b border-black">
          {addingNew ? (
            <>
              <span className="text-[10px] font-bold">Add Product:</span>
              <div className="flex-1 max-w-sm">
                <ProductLookupDropdown
                  value={null}
                  onChange={handleProductSelect}
                  autoFocus
                  placeholder="Search part #, description..."
                />
              </div>
              <button
                onClick={() => setAddingNew(false)}
                className="px-2 py-0.5 text-[10px] bg-gray-200 hover:bg-gray-300 border border-gray-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setAddingNew(true)}
              className="px-2 py-0.5 text-[10px] bg-green-600 hover:bg-green-700 text-white border border-green-800"
            >
              + Add Line Item
            </button>
          )}
        </div>
      )}

      {/* Table - Traditional style with black borders */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th className="px-2 py-1 text-center border border-black font-bold w-16">Qty Ord</th>
              <th className="px-2 py-1 text-center border border-black font-bold w-16">Qty Shp</th>
              <th className="px-2 py-1 text-left border border-black font-bold w-28">Part Number</th>
              <th className="px-2 py-1 text-left border border-black font-bold">Description</th>
              <th className="px-2 py-1 text-right border border-black font-bold w-20">Unit Net</th>
              <th className="px-2 py-1 text-right border border-black font-bold w-24">Extended Net</th>
              {!readOnly && <th className="px-1 py-1 border border-black font-bold w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {details.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 6 : 7} className="px-4 py-8 text-center text-gray-400 border border-black">
                  No line items. Click "Add Line Item" to begin.
                </td>
              </tr>
            ) : (
              details.map((detail) => {
                const qty = detail.qtyshipped || detail.qtyordered || 0;
                const extended = qty * (detail.unitnet || 0);

                return (
                  <tr key={detail.linekey} className="hover:bg-gray-50">
                    <td className="px-2 py-1 border border-black text-center">
                      {renderCell(detail, 'qtyordered', detail.qtyordered, true)}
                    </td>
                    <td className="px-2 py-1 border border-black text-center">
                      {renderCell(detail, 'qtyshipped', detail.qtyshipped, true)}
                    </td>
                    <td className="px-2 py-1 border border-black">
                      {detail.partnumber || '-'}
                    </td>
                    <td className="px-2 py-1 border border-black">
                      {renderCell(detail, 'description', detail.description)}
                    </td>
                    <td className="px-2 py-1 border border-black text-right">
                      {renderCell(detail, 'unitnet', detail.unitnet, true, true)}
                    </td>
                    <td className="px-2 py-1 border border-black text-right font-semibold">
                      {formatCurrency(extended)}
                    </td>
                    {!readOnly && (
                      <td className="px-1 py-1 border border-black text-center">
                        <button
                          onClick={() => handleDeleteLine(detail.linekey)}
                          className="text-red-600 hover:text-red-800 font-bold"
                          title="Delete line"
                        >
                          X
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
            {/* Empty rows to fill space for traditional look */}
            {details.length > 0 && details.length < 10 && Array.from({ length: 10 - details.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="px-2 py-1 border border-black">&nbsp;</td>
                <td className="px-2 py-1 border border-black">&nbsp;</td>
                <td className="px-2 py-1 border border-black">&nbsp;</td>
                <td className="px-2 py-1 border border-black">&nbsp;</td>
                <td className="px-2 py-1 border border-black">&nbsp;</td>
                <td className="px-2 py-1 border border-black">&nbsp;</td>
                {!readOnly && <td className="px-1 py-1 border border-black">&nbsp;</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceDetailsGrid;
