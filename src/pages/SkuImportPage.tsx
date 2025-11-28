import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

const SkuImportPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [fileType, setFileType] = useState<'excel' | 'csv'>('excel');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<'success' | 'error' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileTypeChange = (type: 'excel' | 'csv') => {
    setFileType(type);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setValidationMessage(null);
    setValidationStatus(null);

    try {
      // Parse the file based on type
      const data = await parseFile(file);
      
      if (!data || !data.length) {
        setValidationMessage('No data found in file.');
        setValidationStatus('error');
        return;
      }

      // Truncate the staging table
      const { error: truncateError } = await supabase.rpc('truncate_stg_update_skus');
      if (truncateError) {
        console.error('Error truncating table:', truncateError);
        setValidationMessage('Error preparing database. Please try again.');
        setValidationStatus('error');
        return;
      }

      // Insert data into staging table
      const { error: insertError } = await supabase
        .from('stg_update_skus')
        .insert(
          data.map(row => ({
            sku: row.sku || row.partnumber || row.SKU || row.PartNumber || '',
            description: row.description || row.Description || '',
            price: row.price || row.Price || null,
            cost: row.cost || row.Cost || null,
            category: row.category || row.Category || '',
            subcategory: row.subcategory || row.Subcategory || row.SubCategory || '',
            brand: row.brand || row.Brand || '',
            upc: row.upc || row.UPC || '',
            map: row.map || row.MAP || row.Map || null, // Add MAP field
            imported_by: user?.accountNumber || '99'
          }))
        );

      if (insertError) {
        console.error('Error inserting data:', insertError);
        setValidationMessage('Error importing data. Please check your file format.');
        setValidationStatus('error');
        return;
      }

      // Validate the imported data
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_stg_update_skus');

      if (validationError) {
        console.error('Error validating data:', validationError);
        setValidationMessage('Error validating data. Please try again.');
        setValidationStatus('error');
        return;
      }

      if (validationData && validationData.length > 0) {
        const validation = validationData[0];
        if (validation.is_valid) {
          setValidationMessage('ALL SKUs ARE UNIQUE');
          setValidationStatus('success');
        } else {
          setValidationMessage(validation.message || 'DUPLICATE OR EMPTY VALUES IN FILE');
          setValidationStatus('error');
        }
      }

    } catch (error) {
      console.error('Error processing file:', error);
      setValidationMessage('Error processing file. Please check format and try again.');
      setValidationStatus('error');
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('No data read from file'));
            return;
          }

          let parsedData: any[] = [];

          if (fileType === 'excel') {
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            parsedData = XLSX.utils.sheet_to_json(worksheet);
          } else {
            // Parse CSV data
            const text = data.toString();
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(header => header.trim());
            
            parsedData = lines.slice(1).map(line => {
              const values = line.split(',').map(value => value.trim());
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = values[index] || '';
              });
              return obj;
            });
          }

          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      if (fileType === 'excel') {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-gray-900">
                📦 SKU Management
              </div>
              <div className="text-sm text-gray-500">
                Account: {user?.accountNumber} - {user?.acctName}
              </div>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto mt-8 px-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Import SKUs</h2>
          
          <div className="flex items-center mb-6">
            <div className="text-sm font-medium text-gray-700 mr-4">File Type:</div>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-blue-600"
                  checked={fileType === 'excel'}
                  onChange={() => handleFileTypeChange('excel')}
                />
                <span className="ml-2 text-gray-700">Excel</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-blue-600"
                  checked={fileType === 'csv'}
                  onChange={() => handleFileTypeChange('csv')}
                />
                <span className="ml-2 text-gray-700">CSV</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <button
              onClick={handleBrowseClick}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Import File'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={fileType === 'excel' ? '.xlsx,.xls' : '.csv'}
              className="hidden"
            />
          </div>

          {validationMessage && (
            <div 
              className={`p-4 mb-4 rounded-md ${
                validationStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              <p className="font-medium">{validationMessage}</p>
            </div>
          )}

          <div className="border-t pt-4 mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions:</h3>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li>Select the file type (Excel or CSV)</li>
              <li>Click "Import File" to select and upload your file</li>
              <li>The file should contain at least a "SKU" column</li>
              <li>Other recommended columns: Description, Price, Cost, MAP, Category, Subcategory, Brand, UPC</li>
              <li>The system will check for duplicate or empty SKUs</li>
              <li>If validation passes, the data will be ready for further processing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkuImportPage;
