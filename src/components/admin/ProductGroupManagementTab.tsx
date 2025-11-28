import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RefreshCw, Search, Package } from 'lucide-react';

interface ProductGroup {
  PrdMainGrp: string;
  PrdSubGrp: string;
}

const ProductGroupManagementTab: React.FC = () => {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalGroups: 0,
    uniqueMainGroups: 0,
    uniqueSubGroups: 0
  });

  useEffect(() => {
    fetchProductGroups();
  }, []);

  useEffect(() => {
    filterGroups();
  }, [filterQuery, productGroups]);

  const fetchProductGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rt_productgroups')
        .select('PrdMainGrp, PrdSubGrp')
        .order('PrdMainGrp, PrdSubGrp');

      if (error) throw error;

      setProductGroups(data || []);
      
      // Calculate stats
      if (data) {
        const uniqueMain = new Set(data.map(g => g.PrdMainGrp));
        const uniqueSub = new Set(data.map(g => g.PrdSubGrp));
        
        setStats({
          totalGroups: data.length,
          uniqueMainGroups: uniqueMain.size,
          uniqueSubGroups: uniqueSub.size
        });
      }
    } catch (error) {
      console.error('Error fetching product groups:', error);
      alert('Failed to fetch product groups');
    } finally {
      setLoading(false);
    }
  };

  const filterGroups = () => {
    if (!filterQuery.trim()) {
      setFilteredGroups(productGroups);
      return;
    }

    const query = filterQuery.toLowerCase();
    const filtered = productGroups.filter(group => 
      group.PrdMainGrp.toLowerCase().includes(query) ||
      group.PrdSubGrp.toLowerCase().includes(query)
    );
    
    setFilteredGroups(filtered);
  };

  const handleRefreshTree = async () => {
    setRefreshing(true);
    try {
      // Fetch fresh data
      await fetchProductGroups();
      
      // Trigger a custom event that CategoryTree component can listen to
      window.dispatchEvent(new CustomEvent('refreshCategoryTree'));
      
      alert('Product tree has been refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing tree:', error);
      alert('Failed to refresh product tree');
    } finally {
      setRefreshing(false);
    }
  };

  // Group the filtered results by main group for better display
  const groupedData = filteredGroups.reduce((acc, item) => {
    if (!acc[item.PrdMainGrp]) {
      acc[item.PrdMainGrp] = [];
    }
    acc[item.PrdMainGrp].push(item.PrdSubGrp);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Product Group Management</h2>
          <button
            onClick={handleRefreshTree}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Product Tree
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Total Mappings</div>
            <div className="text-2xl font-semibold text-gray-800">{stats.totalGroups}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Main Groups (Level 1)</div>
            <div className="text-2xl font-semibold text-gray-800">{stats.uniqueMainGroups}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Sub Groups (Level 2)</div>
            <div className="text-2xl font-semibold text-gray-800">{stats.uniqueSubGroups}</div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by main group or sub group name..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Product Groups ({filteredGroups.length} results)
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading product groups...</p>
            </div>
          ) : Object.keys(groupedData).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {filterQuery ? 'No product groups match your filter.' : 'No product groups found.'}
            </div>
          ) : (
            <div className="space-y-6 max-h-[600px] overflow-y-auto">
              {Object.entries(groupedData).map(([mainGroup, subGroups]) => (
                <div key={mainGroup} className="border-b border-gray-200 pb-4 last:border-0">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    {mainGroup}
                    <span className="text-sm font-normal text-gray-500">
                      ({subGroups.length} sub-groups)
                    </span>
                  </h4>
                  <div className="ml-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {subGroups.map((subGroup, index) => (
                      <div
                        key={`${mainGroup}-${subGroup}-${index}`}
                        className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded"
                      >
                        {subGroup}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 text-blue-600 mt-0.5">ℹ️</div>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">About Product Groups</p>
            <p>
              This page displays the two-level product category structure from the rt_productgroups table. 
              Use the filter to search across both main groups (Level 1) and sub groups (Level 2). 
              Click "Refresh Product Tree" to reload the category navigation tree with any new groups.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductGroupManagementTab;
