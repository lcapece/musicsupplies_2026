import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProductManager, ProductTemplate, Product } from '../hooks/useProductManager';

const ProductManagerPage: React.FC = () => {
  const { staffUsername, isStaffUser } = useAuth();
  const {
    template,
    variations,
    loading,
    saving,
    error,
    successMessage,
    categories,
    brands,
    vendors,
    updateTemplateField,
    generateVariations,
    updateVariation,
    removeVariation,
    clearAll,
    saveAllProducts,
    loadExistingProduct,
    fetchDropdownData
  } = useProductManager();

  const [cloneCount, setCloneCount] = useState(5);
  const [searchPartNumber, setSearchPartNumber] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const variationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleLoadProduct = async () => {
    if (searchPartNumber.trim()) {
      await loadExistingProduct(searchPartNumber.trim());
    }
  };

  const handleGenerateVariations = () => {
    if (!template.partnumber.trim()) {
      setValidationErrors(['Please enter a base part number first']);
      setShowValidation(true);
      return;
    }
    generateVariations(cloneCount);
    // Scroll to variations after a short delay
    setTimeout(() => {
      variationsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const validateProducts = (): boolean => {
    const errors: string[] = [];

    // Check template
    if (!template.partnumber.trim()) {
      errors.push('Base product must have a part number');
    }

    // Check variations
    variations.forEach((v, i) => {
      if (!v.partnumber.trim()) {
        errors.push(`Row ${i + 1}: Part number is required`);
      }
    });

    // Check for duplicates within variations
    const allPartNumbers = variations.map(v => v.partnumber.trim().toUpperCase());
    const seen = new Set<string>();
    allPartNumbers.forEach((pn, i) => {
      if (pn && seen.has(pn)) {
        errors.push(`Row ${i + 1}: Duplicate part number "${pn}"`);
      }
      seen.add(pn);
    });

    setValidationErrors(errors);
    setShowValidation(errors.length > 0);
    return errors.length === 0;
  };

  const handleSaveAll = async () => {
    if (!validateProducts()) return;

    const username = staffUsername || 'system';
    await saveAllProducts(username);
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return '';
    return value.toFixed(2);
  };

  const parseCurrency = (value: string): number | null => {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? null : parsed;
  };

  // Field configuration for the template form
  const templateFields: { key: keyof ProductTemplate; label: string; type: 'text' | 'number' | 'textarea' | 'select'; options?: string[]; width?: string }[] = [
    { key: 'partnumber', label: 'Part Number', type: 'text', width: 'w-48' },
    { key: 'description', label: 'Description', type: 'text', width: 'w-96' },
    { key: 'brand', label: 'Brand', type: 'select', options: brands, width: 'w-40' },
    { key: 'vendor', label: 'Vendor', type: 'select', options: vendors, width: 'w-40' },
    { key: 'vendor_part_number', label: 'Vendor Part #', type: 'text', width: 'w-40' },
    { key: 'prdmaincat', label: 'Main Category', type: 'select', options: categories.main, width: 'w-40' },
    { key: 'prdsubcat', label: 'Sub Category', type: 'select', options: categories.sub, width: 'w-40' },
    { key: 'prdmetacat', label: 'Meta Category', type: 'select', options: categories.meta, width: 'w-40' },
    { key: 'unit_cost', label: 'Unit Cost', type: 'number', width: 'w-28' },
    { key: 'price', label: 'Sell Price', type: 'number', width: 'w-28' },
    { key: 'listprice', label: 'List Price', type: 'number', width: 'w-28' },
    { key: 'webmsrp', label: 'Web MSRP', type: 'number', width: 'w-28' },
    { key: 'map', label: 'MAP', type: 'number', width: 'w-28' },
    { key: 'upc', label: 'UPC', type: 'text', width: 'w-40' },
    { key: 'image', label: 'Image URL', type: 'text', width: 'w-64' },
    { key: 'groupedimage', label: 'Grouped Image', type: 'text', width: 'w-64' },
    { key: 'masterdescr', label: 'Master Description', type: 'text', width: 'w-64' },
    { key: 'longdescription', label: 'Long Description', type: 'textarea', width: 'w-full' },
    { key: 'master_carton_qty', label: 'Master Carton Qty', type: 'number', width: 'w-28' },
    { key: 'master_carton_price', label: 'Master Carton Price', type: 'number', width: 'w-28' },
    { key: 'inv_min', label: 'Inv Min', type: 'number', width: 'w-24' },
    { key: 'inv_max', label: 'Inv Max', type: 'number', width: 'w-24' },
  ];

  // Columns to show in variations grid (key fields for quick editing)
  const gridColumns: { key: keyof Product; label: string; width: string; editable: boolean }[] = [
    { key: 'partnumber', label: 'Part Number', width: 'w-40', editable: true },
    { key: 'description', label: 'Description', width: 'w-72', editable: true },
    { key: 'upc', label: 'UPC', width: 'w-36', editable: true },
    { key: 'unit_cost', label: 'Cost', width: 'w-24', editable: true },
    { key: 'price', label: 'Sell', width: 'w-24', editable: true },
    { key: 'vendor_part_number', label: 'Vendor PN', width: 'w-32', editable: true },
  ];

  if (!isStaffUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
          <p className="text-slate-500 mt-2">Staff access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Product Manager</h1>
              <p className="text-emerald-200 text-sm">Bulk Product Entry System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}

        {/* Load Existing Product */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Load Existing Product as Template</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchPartNumber}
              onChange={(e) => setSearchPartNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadProduct()}
              placeholder="Enter part number to load..."
              className="flex-1 max-w-md px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              onClick={handleLoadProduct}
              disabled={loading}
              className="px-6 py-2.5 bg-slate-600 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load Product'}
            </button>
          </div>
        </div>

        {/* Base Product Template Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Base Product Template</h2>
            <div className="text-sm text-slate-500">
              Enter all common product information here, then clone for variations
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templateFields.map(field => (
              <div key={field.key} className={field.type === 'textarea' ? 'col-span-full' : ''}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {field.label}
                  {field.key === 'partnumber' && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    value={(template[field.key] as string) || ''}
                    onChange={(e) => updateTemplateField(field.key, e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={(template[field.key] as string) || ''}
                    onChange={(e) => updateTemplateField(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                  >
                    <option value="">Select...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="text"
                    value={template[field.key] !== null ? formatCurrency(template[field.key] as number) : ''}
                    onChange={(e) => updateTemplateField(field.key, parseCurrency(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-right"
                    placeholder="0.00"
                  />
                ) : (
                  <input
                    type="text"
                    value={(template[field.key] as string) || ''}
                    onChange={(e) => updateTemplateField(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Clone Controls */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">Generate Variations:</span>
              <input
                type="number"
                value={cloneCount}
                onChange={(e) => setCloneCount(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={50}
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleGenerateVariations}
                className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Add {cloneCount} Variation{cloneCount > 1 ? 's' : ''}
              </button>
              <span className="text-sm text-slate-500">
                (Copies all template data - just edit part numbers & sizes)
              </span>
            </div>
          </div>
        </div>

        {/* Variations Grid */}
        {variations.length > 0 && (
          <div ref={variationsRef} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                Product Variations ({variations.length})
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">
                  Edit part numbers and descriptions below, then validate and save
                </span>
              </div>
            </div>

            {/* Validation Errors */}
            {showValidation && validationErrors.length > 0 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="font-medium text-amber-800 mb-2">Please fix the following issues:</div>
                <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Grid Header */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">
                      #
                    </th>
                    {gridColumns.map(col => (
                      <th
                        key={col.key}
                        className={`px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${col.width}`}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {variations.map((variation, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-sm text-slate-500 font-medium">
                        {index + 1}
                      </td>
                      {gridColumns.map(col => (
                        <td key={col.key} className="px-3 py-2">
                          <input
                            type={col.key === 'unit_cost' || col.key === 'price' ? 'text' : 'text'}
                            value={
                              col.key === 'unit_cost' || col.key === 'price'
                                ? (variation[col.key] !== null ? formatCurrency(variation[col.key] as number) : '')
                                : (variation[col.key] as string) || ''
                            }
                            onChange={(e) => {
                              const value = col.key === 'unit_cost' || col.key === 'price'
                                ? parseCurrency(e.target.value)
                                : e.target.value;
                              updateVariation(index, col.key, value);
                            }}
                            className={`w-full px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm ${
                              col.key === 'partnumber' ? 'font-mono font-semibold bg-amber-50' : ''
                            } ${col.key === 'unit_cost' || col.key === 'price' ? 'text-right' : ''}`}
                            placeholder={col.key === 'partnumber' ? 'Required' : ''}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeVariation(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save Actions */}
            <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {variations.length} product{variations.length > 1 ? 's' : ''} ready to save
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setVariations([])}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Clear Variations
                </button>
                <button
                  onClick={validateProducts}
                  className="px-6 py-2.5 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Validate
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save All Products
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-800 mb-3">Quick Tips for Bulk Entry</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">1.</span>
              <span><strong>Load or enter base product</strong> - Fill in all common fields (brand, vendor, prices, category, description)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">2.</span>
              <span><strong>Clone variations</strong> - Click "Add X Variations" to create copies (e.g., 6 for violin sizes, 20 for colors)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">3.</span>
              <span><strong>Quick edits only</strong> - Just change part numbers (V-44 → V-43, V-42) and size/color in description</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">4.</span>
              <span><strong>Validate & Save</strong> - System checks for duplicates and missing part numbers before inserting</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProductManagerPage;
