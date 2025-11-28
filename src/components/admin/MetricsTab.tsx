import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface WebOrder {
  id: string;
  order_number: string;
  created_at: string;
  account_number?: string;
  subtotal: number;
  discount_amount?: number;
  grand_total: number;
  payment_method?: string;
  order_status: string;
}

interface DailyMetric {
  date: string;
  orders: number;
  revenue: number;
  customers: Set<string>;
}

const MetricsTab: React.FC = () => {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('past_30_days');
  const [chartView, setChartView] = useState<'bars' | 'combo'>('bars');

  useEffect(() => {
    fetchOrders();
  }, []);

  const getDateRange = (filter: string): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let start: Date;
    
    switch (filter) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'past_7_days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
        break;
      case 'past_30_days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
        break;
      case 'past_90_days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0, 0);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    }
    
    return { start, end };
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(dateFilter);
      
      const { data, error } = await supabase
        .from('web_orders')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
        return;
      }

      setOrders(data || []);
    } catch (err) {
      console.error('Error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate daily metrics
  const getDailyMetrics = (): DailyMetric[] => {
    const dailyMap = new Map<string, DailyMetric>();
    
    orders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          orders: 0,
          revenue: 0,
          customers: new Set()
        });
      }
      
      const metric = dailyMap.get(date)!;
      metric.orders++;
      metric.revenue += order.grand_total;
      if (order.account_number) {
        metric.customers.add(order.account_number);
      }
    });
    
    return Array.from(dailyMap.values());
  };

  const dailyMetrics = getDailyMetrics();
  
  // Calculate summary statistics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.grand_total, 0);
  const totalDiscounts = orders.reduce((sum, order) => sum + (order.discount_amount || 0), 0);
  const uniqueCustomers = new Set(orders.map(o => o.account_number).filter(Boolean)).size;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Find max values for chart scaling
  const maxOrders = Math.max(...dailyMetrics.map(d => d.orders), 1);
  const maxRevenue = Math.max(...dailyMetrics.map(d => d.revenue), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sales Metrics & Performance</h2>
          <p className="text-xs text-gray-600 mt-1">Daily trends and key performance indicators</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-300 rounded overflow-hidden">
            <button
              onClick={() => setChartView('bars')}
              className={`px-3 py-1 text-xs font-medium ${
                chartView === 'bars'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Bar Charts
            </button>
            <button
              onClick={() => setChartView('combo')}
              className={`px-3 py-1 text-xs font-medium border-l border-gray-300 ${
                chartView === 'combo'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Combo Chart
            </button>
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-xs"
          >
            <option value="today">Today</option>
            <option value="past_7_days">Past 7 Days</option>
            <option value="past_30_days">Past 30 Days</option>
            <option value="past_90_days">Past 90 Days</option>
            <option value="this_year">This Year</option>
          </select>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Compact Summary Metrics */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-white border border-gray-200 rounded p-2">
          <div className="text-xs text-gray-600">Total Orders</div>
          <div className="text-lg font-bold text-blue-600">{totalOrders}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-2">
          <div className="text-xs text-gray-600">Total Revenue</div>
          <div className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-2">
          <div className="text-xs text-gray-600">Avg Order Value</div>
          <div className="text-lg font-bold text-purple-600">{formatCurrency(averageOrderValue)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-2">
          <div className="text-xs text-gray-600">Unique Customers</div>
          <div className="text-lg font-bold text-indigo-600">{uniqueCustomers}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-2">
          <div className="text-xs text-gray-600">Total Discounts</div>
          <div className="text-lg font-bold text-orange-600">{formatCurrency(totalDiscounts)}</div>
        </div>
      </div>

      {/* Charts */}
      {chartView === 'bars' ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Orders Per Day Chart */}
          <div className="bg-white border border-gray-200 rounded p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Orders Per Day</h3>
            <div className="space-y-1">
              {dailyMetrics.map((metric, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="text-xs text-gray-600 w-16 text-right">{metric.date}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                    <div
                      className="bg-blue-500 h-5 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(metric.orders / maxOrders) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{metric.orders}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Per Day Chart */}
          <div className="bg-white border border-gray-200 rounded p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Revenue Per Day</h3>
            <div className="space-y-1">
              {dailyMetrics.map((metric, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="text-xs text-gray-600 w-16 text-right">{metric.date}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                    <div
                      className="bg-green-500 h-5 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(metric.revenue / maxRevenue) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{formatCurrency(metric.revenue)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Dual-Axis Combo Chart */
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Revenue & Orders Trend</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-600">Revenue (bars)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Orders (line)</span>
              </div>
            </div>
          </div>
          
          <div className="relative" style={{ height: '400px' }}>
            {/* Y-axis labels for Revenue (left) */}
            <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-600 pr-2">
              <span>{formatCurrency(maxRevenue)}</span>
              <span>{formatCurrency(maxRevenue * 0.75)}</span>
              <span>{formatCurrency(maxRevenue * 0.5)}</span>
              <span>{formatCurrency(maxRevenue * 0.25)}</span>
              <span>$0</span>
            </div>
            
            {/* Y-axis labels for Orders (right) */}
            <div className="absolute right-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-600 pl-2">
              <span>{Math.round(maxOrders)}</span>
              <span>{Math.round(maxOrders * 0.75)}</span>
              <span>{Math.round(maxOrders * 0.5)}</span>
              <span>{Math.round(maxOrders * 0.25)}</span>
              <span>0</span>
            </div>
            
            {/* Chart area */}
            <div className="absolute left-12 right-12 top-0 bottom-8 border-l border-b border-gray-300">
              {/* Horizontal grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-t border-gray-200"></div>
                ))}
              </div>
              
              {/* Bars and line */}
              <div className="absolute inset-0 flex items-end justify-around px-2">
                {dailyMetrics.map((metric, index) => {
                  const barHeight = (metric.revenue / maxRevenue) * 100;
                  const lineY = 100 - (metric.orders / maxOrders) * 100;
                  
                  return (
                    <div key={index} className="flex-1 relative flex items-end justify-center" style={{ maxWidth: '60px' }}>
                      {/* Revenue bar */}
                      <div
                        className="w-full bg-green-500 hover:bg-green-600 transition-colors cursor-pointer rounded-t"
                        style={{ height: `${barHeight}%` }}
                        title={`${metric.date}: ${formatCurrency(metric.revenue)}`}
                      ></div>
                      
                      {/* Order count dot */}
                      <div
                        className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow-sm"
                        style={{ bottom: `${100 - lineY}%`, left: '50%', transform: 'translateX(-50%)' }}
                        title={`${metric.date}: ${metric.orders} orders`}
                      ></div>
                      
                      {/* Line connecting dots */}
                      {index < dailyMetrics.length - 1 && (
                        <svg
                          className="absolute pointer-events-none"
                          style={{
                            left: '50%',
                            bottom: `${100 - lineY}%`,
                            width: '100%',
                            height: '100px',
                            overflow: 'visible'
                          }}
                        >
                          <line
                            x1="0"
                            y1="0"
                            x2="100%"
                            y2={`${lineY - (100 - (dailyMetrics[index + 1].orders / maxOrders) * 100)}%`}
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* X-axis labels */}
            <div className="absolute left-12 right-12 bottom-0 flex justify-around">
              {dailyMetrics.map((metric, index) => (
                <div key={index} className="text-xs text-gray-600 text-center" style={{ maxWidth: '60px' }}>
                  {metric.date}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Details Table */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-3 py-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Daily Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Order</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Customers</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dailyMetrics.map((metric, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-900">{metric.date}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-right font-medium">{metric.orders}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-right">{formatCurrency(metric.revenue)}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-right">
                    {formatCurrency(metric.orders > 0 ? metric.revenue / metric.orders : 0)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-right">{metric.customers.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MetricsTab;