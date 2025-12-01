import React, { useState, useRef, useEffect } from 'react';
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

// New line item row state
interface NewLineState {
  partnumber: string;
  description: string;
  qtyordered: number;
  qtyshipped: number;
  unitcost: number;
  unitnet: number;
}

const emptyNewLine: NewLineState = {
  partnumber: '',
  description: '',
  qtyordered: 1,
  qtyshipped: 0,
  unitcost: 0,
  unitnet: 0
};

const InvoiceDetailsGrid: React.FC<InvoiceDetailsGridProps> = ({
  invoiceId,
  details,
  onChange,
  loading = false,
  readOnly = false
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [newLine, setNewLine] = useState<NewLineState>(emptyNewLine);
  const [isProductSelected, setIsProductSelected] = useState(false);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Focus qty input after product selection
  useEffect(() => {
    if (isProductSelected && qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  }, [isProductSelected]);

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

  // Handle product selection for new line - fills in default values
  const handleProductSelect = (product: ProductLookup | null) => {
    if (!product) {
      setNewLine(emptyNewLine);
      setIsProductSelected(false);
      return;
    }

    // Fill in defaults from the product
    setNewLine({
      partnumber: product.partnumber,
      description: product.description || '',
      qtyordered: 1,
      qtyshipped: 0,
      unitcost: product.price || 0,
      unitnet: product.price || 0
    });
    setIsProductSelected(true);
  };

  // Handle changes to new line fields
  const handleNewLineChange = (field: keyof NewLineState, value: string | number) => {
    setNewLine(prev => ({ ...prev, [field]: value }));
  };

  // Add the new line to the invoice
  const handleAddNewLine = () => {
    if (!newLine.partnumber) return;

    const newLineKey = details.length > 0
      ? Math.max(...details.map(d => d.linekey)) + 1
      : 1;

    const newDetail: InvoiceDetail = {
      linekey: newLineKey,
      ivd: invoiceId || 0, // Will be set properly when invoice is saved
      partnumber: newLine.partnumber,
      description: newLine.description,
      unitnet: newLine.unitnet,
      unitcost: newLine.unitcost,
      qtyordered: newLine.qtyordered,
      qtyshipped: newLine.qtyshipped,
      qtybackordered: 0
    };

    onChange([...details, newDetail]);

    // Reset for next entry
    setNewLine(emptyNewLine);
    setIsProductSelected(false);
  };

  // Handle Enter key in new line fields to add the line
  const handleNewLineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newLine.partnumber) {
      e.preventDefault();
      handleAddNewLine();
    }
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

  // Calculate extended values for new line preview
  const newLineQty = newLine.qtyshipped || newLine.qtyordered || 0;
  const newLineExtNet = newLineQty * newLine.unitnet;
  const newLineExtCost = newLineQty * newLine.unitcost;
  const newLineExtProfit = newLineExtNet - newLineExtCost;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center border border-black bg-white">
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-black bg-white">
      {/* Table - Traditional style with black borders */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="px-1 py-1 text-center border border-black font-bold w-32 text-red-600">Part #</th>
              <th className="px-1 py-1 text-center border border-black font-bold w-14 text-red-600">Qty Ord</th>
              <th className="px-1 py-1 text-center border border-black font-bold w-14 text-red-600">Qty Shp</th>
              <th className="px-1 py-1 text-center border border-black font-bold text-red-600">Description</th>
              <th className="px-1 py-1 text-center border border-black font-bold w-20 text-red-600">Unit Cost</th>
              <th className="px-1 py-1 text-center border border-black font-bold w-20 text-red-600">Unit Net</th>
              <th className="px-1 py-1 text-center border border-black font-bold w-20 text-red-600">Ext Net</th>
              <th className="px-1 py-1 text-center border border-black font-bold w-20 text-red-600">Ext Profit</th>
              {!readOnly && <th className="px-1 py-1 border border-black font-bold w-8 text-red-600"></th>}
            </tr>
          </thead>
          <tbody>
            {/* Live Entry Row - Always visible at top when not readOnly */}
            {!readOnly && (
              <tr className="bg-green-50 border-2 border-green-400">
                <td className="px-1 py-0.5 border border-green-300">
                  <ProductLookupDropdown
                    value={isProductSelected ? newLine.partnumber : null}
                    onChange={handleProductSelect}
                    placeholder="Type part # or search..."
                    compact
                    autoFocus={!isProductSelected}
                  />
                </td>
                <td className="px-1 py-0.5 border border-green-300">
                  <input
                    ref={qtyInputRef}
                    type="number"
                    value={newLine.qtyordered}
                    onChange={(e) => handleNewLineChange('qtyordered', parseInt(e.target.value) || 0)}
                    onKeyDown={handleNewLineKeyDown}
                    disabled={!isProductSelected}
                    className="w-full px-1 py-0.5 text-[10px] text-center border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    min="0"
                  />
                </td>
                <td className="px-1 py-0.5 border border-green-300">
                  <input
                    type="number"
                    value={newLine.qtyshipped}
                    onChange={(e) => handleNewLineChange('qtyshipped', parseInt(e.target.value) || 0)}
                    onKeyDown={handleNewLineKeyDown}
                    disabled={!isProductSelected}
                    className="w-full px-1 py-0.5 text-[10px] text-center border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    min="0"
                  />
                </td>
                <td className="px-1 py-0.5 border border-green-300">
                  <input
                    type="text"
                    value={newLine.description}
                    onChange={(e) => handleNewLineChange('description', e.target.value)}
                    onKeyDown={handleNewLineKeyDown}
                    disabled={!isProductSelected}
                    placeholder={isProductSelected ? '' : 'Select a product...'}
                    className="w-full px-1 py-0.5 text-[10px] border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </td>
                <td className="px-1 py-0.5 border border-green-300">
                  <input
                    type="number"
                    value={newLine.unitcost}
                    onChange={(e) => handleNewLineChange('unitcost', parseFloat(e.target.value) || 0)}
                    onKeyDown={handleNewLineKeyDown}
                    disabled={!isProductSelected}
                    step="0.01"
                    className="w-full px-1 py-0.5 text-[10px] text-right border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </td>
                <td className="px-1 py-0.5 border border-green-300">
                  <input
                    type="number"
                    value={newLine.unitnet}
                    onChange={(e) => handleNewLineChange('unitnet', parseFloat(e.target.value) || 0)}
                    onKeyDown={handleNewLineKeyDown}
                    disabled={!isProductSelected}
                    step="0.01"
                    className="w-full px-1 py-0.5 text-[10px] text-right border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </td>
                <td className="px-1 py-0.5 border border-green-300 text-right text-[10px] font-semibold text-gray-500">
                  {isProductSelected ? formatCurrency(newLineExtNet) : '-'}
                </td>
                <td className={`px-1 py-0.5 border border-green-300 text-right text-[10px] font-semibold ${newLineExtProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {isProductSelected ? formatCurrency(newLineExtProfit) : '-'}
                </td>
                <td className="px-1 py-0.5 border border-green-300 text-center">
                  <button
                    onClick={handleAddNewLine}
                    disabled={!isProductSelected || !newLine.partnumber}
                    className="px-1.5 py-0.5 text-[9px] font-bold bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Add line (Enter)"
                  >
                    +
                  </button>
                </td>
              </tr>
            )}

            {/* Existing line items */}
            {details.map((detail) => {
              const qty = detail.qtyshipped || detail.qtyordered || 0;
              const extendedNet = qty * (detail.unitnet || 0);
              const extendedCost = qty * (detail.unitcost || 0);
              const extendedProfit = extendedNet - extendedCost;

              return (
                <tr key={detail.linekey} className="hover:bg-gray-50">
                  <td className="px-1 py-1 border border-black font-mono text-[9px]">
                    {detail.partnumber || '-'}
                  </td>
                  <td className="px-1 py-1 border border-black text-center">
                    {renderCell(detail, 'qtyordered', detail.qtyordered, true)}
                  </td>
                  <td className="px-1 py-1 border border-black text-center">
                    {renderCell(detail, 'qtyshipped', detail.qtyshipped, true)}
                  </td>
                  <td className="px-1 py-1 border border-black truncate max-w-[12rem]" title={detail.description}>
                    {renderCell(detail, 'description', detail.description)}
                  </td>
                  <td className="px-1 py-1 border border-black text-right">
                    {renderCell(detail, 'unitcost', detail.unitcost, true, true)}
                  </td>
                  <td className="px-1 py-1 border border-black text-right">
                    {renderCell(detail, 'unitnet', detail.unitnet, true, true)}
                  </td>
                  <td className="px-1 py-1 border border-black text-right font-semibold">
                    {formatCurrency(extendedNet)}
                  </td>
                  <td className={`px-1 py-1 border border-black text-right font-semibold ${extendedProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatCurrency(extendedProfit)}
                  </td>
                  {!readOnly && (
                    <td className="px-1 py-1 border border-black text-center">
                      <button
                        onClick={() => handleDeleteLine(detail.linekey)}
                        className="text-red-600 hover:text-red-800 font-bold text-[9px]"
                        title="Delete line"
                      >
                        X
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}

            {/* Empty rows placeholder when no items */}
            {details.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 8 : 9} className="px-4 py-6 text-center text-gray-400 border border-black italic">
                  {readOnly ? 'No line items.' : 'Search for a product above to add line items'}
                </td>
              </tr>
            )}

            {/* Empty rows to fill space for traditional look */}
            {details.length > 0 && details.length < 8 && Array.from({ length: 8 - details.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="px-1 py-1 border border-black">&nbsp;</td>
                <td className="px-1 py-1 border border-black">&nbsp;</td>
                <td className="px-1 py-1 border border-black">&nbsp;</td>
                <td className="px-1 py-1 border border-black">&nbsp;</td>
                <td className="px-1 py-1 border border-black">&nbsp;</td>
                <td className="px-1 py-1 border border-black">&nbsp;</td>
                <td className="px-1 py-1 border border-black">&nbsp;</td>
                <td className="px-1 py-1 border border-black">&nbsp;</td>
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
