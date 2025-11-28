import React, { useState } from 'react';
import { applyTreeViewMigration } from '../../utils/applyMigration';
import { supabase } from '../../lib/supabase';

const CategoryManagementTab: React.FC = () => {
  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'none';
  }>({ message: '', type: 'none' });
  const [loading, setLoading] = useState(false);
  const [treeStats, setTreeStats] = useState<{
    mainCategories: number;
    subCategories: number;
  } | null>(null);

  const handleFixTreeView = async () => {
    setLoading(true);
    setStatus({ message: 'Applying tree view migration...', type: 'info' });

    try {
      const result = await applyTreeViewMigration();
      
      if (result.success) {
        setStatus({ message: result.message, type: 'success' });
        fetchTreeStats();
        
        // Dispatch an event to refresh the category tree in any components listening
        window.dispatchEvent(new CustomEvent('refreshCategoryTree'));
      } else {
        setStatus({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setStatus({ 
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTreeStats = async () => {
    try {
      // Get main categories count
      const { count: mainCount, error: mainError } = await supabase
        .from('tree_view_data_source')
        .select('*', { count: 'exact' })
        .eq('is_main_category', true);
      
      if (mainError) throw mainError;
      
      // Get subcategories count
      const { count: subCount, error: subError } = await supabase
        .from('tree_view_data_source')
        .select('*', { count: 'exact' })
        .eq('is_main_category', false);
      
      if (subError) throw subError;
      
      setTreeStats({
        mainCategories: mainCount || 0,
        subCategories: subCount || 0
      });
    } catch (error) {
      console.error('Error fetching tree stats:', error);
    }
  };
  
  // Fetch stats on component mount
  React.useEffect(() => {
    fetchTreeStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Category Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage product categories and fix category tree view issues
          </p>
        </div>
      </div>

      {/* Fix TreeView Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-red-300">
        <h3 className="text-lg font-semibold text-red-700 mb-4">⚠️ Fix Category TreeView</h3>
        <p className="text-gray-600 mb-4">
          <strong>Missing TreeView:</strong> If the product category tree view is not displaying correctly, click the button below to refresh
          the tree view data. This will reload the category data from your hosted Supabase database.
        </p>
        
        {treeStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-800">Main Categories</div>
              <div className="text-2xl font-bold text-blue-700">{treeStats.mainCategories}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-800">Subcategories</div>
              <div className="text-2xl font-bold text-green-700">{treeStats.subCategories}</div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <button
            onClick={handleFixTreeView}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md text-sm font-medium font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'REFRESH TREEVIEW DATA'}
          </button>
          
          {status.type !== 'none' && (
            <div 
              className={`px-4 py-2 rounded text-sm ${
                status.type === 'success' ? 'bg-green-100 text-green-800' :
                status.type === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}
            >
              {status.message}
            </div>
          )}
        </div>
        
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-700 mb-2"><strong>Troubleshooting Notes:</strong></p>
          <ol className="text-sm text-gray-600 list-decimal pl-5 space-y-1">
            <li>Click the "REFRESH TREEVIEW DATA" button above first</li>
            <li>If that doesn't work, try refreshing the page</li>
            <li>Make sure your database has the correct table name: <code>tree_view_data_source</code></li>
          </ol>
        </div>
      </div>

      {/* Future Enhancements */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Management Features</h3>
        <p className="text-gray-600">
          This tab will be expanded with additional features for managing product categories:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
          <li>Create/Edit/Delete main categories</li>
          <li>Create/Edit/Delete subcategories</li>
          <li>Reorder categories</li>
          <li>Assign icons to categories</li>
          <li>Bulk update product categories</li>
        </ul>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          These features are planned for a future update.
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementTab;
