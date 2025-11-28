import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Filter, Search, RefreshCw, Eye, ShoppingCart } from 'lucide-react';

interface SystemLogEvent {
  id: string;
  occurred_at: string;
  event_type: string;
  account_number: number | null;
  email_address: string | null;
  session_id: string | null;
  request_id: string | null;
  ip: string | null;
  user_agent: string | null;
  path: string | null;
  referrer: string | null;
  metadata: any;
  created_by: string;
  is_internal: boolean;
}

interface CartActivity {
  id: number;
  account_number: number;
  product_code: string;
  action: string;
  quantity: number;
  old_quantity: number;
  activity_at: string;
  session_id: string | null;
}

interface CartContents {
  account_number: number;
  email_address: string | null;
  cart_contents: any;
  last_updated: string;
  total_items: number;
}

type LogViewType = 'system' | 'cart' | 'carts';

const SystemLogTab: React.FC = () => {
  const [viewType, setViewType] = useState<LogViewType>('system');
  const [systemLogs, setSystemLogs] = useState<SystemLogEvent[]>([]);
  const [cartActivity, setCartActivity] = useState<CartActivity[]>([]);
  const [cartContents, setCartContents] = useState<CartContents[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last 7 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [searchString, setSearchString] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('');

  const eventTypes = [
    'auth.login_success',
    'auth.login_failure', 
    'auth.session_expired',
    'search.keyword',
    'search.nav_tree',
    'cart.item_added',
    'cart.item_removed', 
    'cart.cart_view',
    'cart.cart_abandoned',
    'checkout.started',
    'checkout.completed',
    'checkout.failed',
    'checkout.canceled',
    'account.password_changed',
    'account.admin_password_changed',
    'account.password_set_to_default_zip',
    'admin.action_performed',
    'other.custom'
  ];

  const loadSystemLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startDateTime = startDate ? new Date(startDate + 'T00:00:00Z').toISOString() : null;
      const endDateTime = endDate ? new Date(endDate + 'T23:59:59Z').toISOString() : null;
      
      const { data, error } = await supabase.rpc('get_system_logs', {
        p_start_date: startDateTime,
        p_end_date: endDateTime,
        p_event_types: selectedEventTypes.length > 0 ? selectedEventTypes : null,
        p_search_string: searchString.trim() || null,
        p_account_number: accountFilter.trim() ? parseInt(accountFilter) : null,
        p_limit: 200,
        p_offset: 0
      });

      if (error) throw error;
      setSystemLogs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system logs');
      console.error('Error loading system logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCartActivity = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startDateTime = startDate ? new Date(startDate + 'T00:00:00Z').toISOString() : null;
      const endDateTime = endDate ? new Date(endDate + 'T23:59:59Z').toISOString() : null;
      
      const { data, error } = await supabase.rpc('get_cart_activity_admin', {
        p_start_date: startDateTime,
        p_end_date: endDateTime,
        p_account_number: accountFilter.trim() ? parseInt(accountFilter) : null,
        p_limit: 200,
        p_offset: 0
      });

      if (error) throw error;
      setCartActivity(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart activity');
      console.error('Error loading cart activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCartContents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_all_cart_contents');

      if (error) throw error;
      setCartContents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart contents');
      console.error('Error loading cart contents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = () => {
    switch (viewType) {
      case 'system':
        loadSystemLogs();
        break;
      case 'cart':
        loadCartActivity();
        break;
      case 'carts':
        loadCartContents();
        break;
    }
  };

  useEffect(() => {
    loadData();
  }, [viewType]);

  const handleEventTypeToggle = (eventType: string) => {
    setSelectedEventTypes(prev => 
      prev.includes(eventType)
        ? prev.filter(t => t !== eventType)
        : [...prev, eventType]
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatCartContents = (cartContents: any) => {
    if (!cartContents || typeof cartContents !== 'object') return 'Empty';
    
    const items = Object.entries(cartContents).map(([code, details]: [string, any]) => 
      `${code} (${details?.quantity || 0})`
    );
    
    return items.join(', ');
  };

  const renderSystemLogs = () => (
    <div className="space-y-4">
      {systemLogs.map((log) => (
        <div key={log.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                log.event_type.startsWith('auth.login_success') ? 'bg-green-100 text-green-800' :
                log.event_type.startsWith('auth.login_failure') ? 'bg-red-100 text-red-800' :
                log.event_type.startsWith('cart.') ? 'bg-blue-100 text-blue-800' :
                log.event_type.startsWith('checkout.') ? 'bg-purple-100 text-purple-800' :
                log.event_type.startsWith('admin.') ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {log.event_type}
              </span>
              <span className="text-sm text-gray-600">{formatTimestamp(log.occurred_at)}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {log.account_number && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Account: {log.account_number}
                </span>
              )}
              {log.created_by && (
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  {log.created_by}
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {log.email_address && (
              <div><span className="font-medium">Email:</span> {log.email_address}</div>
            )}
            {log.ip && (
              <div><span className="font-medium">IP:</span> {log.ip}</div>
            )}
            {log.path && (
              <div><span className="font-medium">Path:</span> {log.path}</div>
            )}
            {log.session_id && (
              <div><span className="font-medium">Session:</span> {log.session_id.substring(0, 8)}...</div>
            )}
          </div>
          
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="mt-2">
              <span className="font-medium text-sm">Metadata:</span>
              <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderCartActivity = () => (
    <div className="space-y-4">
      {cartActivity.map((activity) => (
        <div key={activity.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                activity.action === 'add' ? 'bg-green-100 text-green-800' :
                activity.action === 'remove' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {activity.action.toUpperCase()}
              </span>
              <span className="text-sm text-gray-600">{formatTimestamp(activity.activity_at)}</span>
            </div>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              Account: {activity.account_number}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><span className="font-medium">Product:</span> {activity.product_code}</div>
            <div><span className="font-medium">Quantity:</span> {activity.quantity}</div>
            {activity.old_quantity !== null && (
              <div><span className="font-medium">Previous Qty:</span> {activity.old_quantity}</div>
            )}
          </div>
          
          {activity.session_id && (
            <div className="mt-2 text-sm">
              <span className="font-medium">Session:</span> {activity.session_id.substring(0, 8)}...
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderCartContents = () => (
    <div className="space-y-4">
      {cartContents.map((cart) => (
        <div key={cart.account_number} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium">Account {cart.account_number}</h3>
              {cart.email_address && (
                <span className="text-sm text-gray-600">{cart.email_address}</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {cart.total_items} items
              </span>
              <span className="text-sm text-gray-500">
                Updated: {formatTimestamp(cart.last_updated)}
              </span>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium mb-2">Cart Contents:</h4>
            <div className="text-sm">
              {formatCartContents(cart.cart_contents)}
            </div>
          </div>
        </div>
      ))}
      
      {cartContents.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No active carts found
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Log</h2>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* View Type Selection */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setViewType('system')}
          className={`py-2 px-4 text-sm font-medium border-b-2 ${
            viewType === 'system' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Eye className="h-4 w-4 inline mr-2" />
          System Events
        </button>
        <button
          onClick={() => setViewType('cart')}
          className={`py-2 px-4 text-sm font-medium border-b-2 ${
            viewType === 'cart' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingCart className="h-4 w-4 inline mr-2" />
          Cart Activity
        </button>
        <button
          onClick={() => setViewType('carts')}
          className={`py-2 px-4 text-sm font-medium border-b-2 ${
            viewType === 'carts' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingCart className="h-4 w-4 inline mr-2" />
          Active Carts
        </button>
      </div>

      {/* Filters */}
      {viewType !== 'carts' && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search String */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search className="h-4 w-4 inline mr-1" />
                Search
              </label>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchString}
                onChange={(e) => setSearchString(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Account Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="number"
                placeholder="Account #"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Event Type Filters (only for system logs) */}
          {viewType === 'system' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="h-4 w-4 inline mr-1" />
                Event Types
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {eventTypes.map((eventType) => (
                  <label key={eventType} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedEventTypes.includes(eventType)}
                      onChange={() => handleEventTypeToggle(eventType)}
                      className="rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-xs">{eventType.replace(/^[^.]+\./, '')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading...</span>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {viewType === 'system' && renderSystemLogs()}
          {viewType === 'cart' && renderCartActivity()}
          {viewType === 'carts' && renderCartContents()}
        </>
      )}

      {/* Empty State */}
      {!loading && !error && (
        <>
          {viewType === 'system' && systemLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No system events found for the selected criteria
            </div>
          )}
          {viewType === 'cart' && cartActivity.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No cart activity found for the selected criteria
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SystemLogTab;
