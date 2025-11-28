import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface LoginHistoryEntry { // Renamed for clarity, as this will be raw log data or simple aggregation
  account_number: number;
  acct_name: string; // Joined from accounts_lcmd
  login_date: string; // Date part of login_timestamp
  login_time: string; // Time part of login_timestamp
  login_success: boolean;
}

interface AggregatedLoginHistory {
  account_number: number;
  acct_name: string;
  login_date: string; // Specific date for this aggregation
  successful_login_count: number;
  last_successful_login_time?: string; // Time part of the last successful login on this date
}


interface DailyStats {
  date: string;
  unique_active_accounts: number; // Number of distinct accounts with successful logins
  total_successful_logins: number;
  // total_failed_logins: number; // Optional: could add this
}

const HistoryTab: React.FC = () => {
  const [accountActivity, setAccountActivity] = useState<AggregatedLoginHistory[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [viewMode, setViewMode] = useState<'daily' | 'account'>('daily');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDateFilter(today);
    fetchAccountActivity(today); // Renamed and will fetch real data
    fetchDailyLoginStats(); // Renamed and will fetch real data
  }, []);

  const fetchAccountActivity = async (targetDate?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('login_activity_log')
        .select(`
          account_number,
          login_timestamp,
          login_success,
          accounts_lcmd (acct_name)
        `)
        .eq('login_success', true); // Only successful logins for this view

      if (targetDate) {
        query = query.gte('login_timestamp', `${targetDate}T00:00:00.000Z`)
                     .lt('login_timestamp', `${targetDate}T23:59:59.999Z`);
      }
      
      if (accountFilter) {
         // This part needs careful handling due to join
         // For simplicity, filtering on account_number directly if possible,
         // or fetching more data and filtering client-side if acct_name search is complex with aggregation.
         // Let's assume accountFilter is primarily for account_number for now.
         if (!isNaN(parseInt(accountFilter))) {
            query = query.eq('account_number', parseInt(accountFilter));
         }
         // If filtering by acct_name is needed, it's more complex with aggregates.
         // A simpler approach for acct_name might be to filter after fetching if dataset is not too large.
      }

      const { data, error } = await query.order('login_timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching account activity:', error);
        setAccountActivity([]);
        return;
      }

      // Aggregate data
      const aggregated: { [key: string]: AggregatedLoginHistory } = {};
      data?.forEach(log => {
        const dateStr = new Date(log.login_timestamp).toISOString().split('T')[0];
        const timeStr = new Date(log.login_timestamp).toLocaleTimeString();
        const key = `${log.account_number}-${dateStr}`;

        if (!aggregated[key]) {
          aggregated[key] = {
            account_number: log.account_number,
            acct_name: (log.accounts_lcmd as any)?.acct_name || 'N/A',
            login_date: dateStr,
            successful_login_count: 0,
            last_successful_login_time: undefined,
          };
        }
        aggregated[key].successful_login_count += 1;
        if (!aggregated[key].last_successful_login_time || new Date(log.login_timestamp).getTime() > new Date(`${dateStr}T${aggregated[key].last_successful_login_time}`).getTime()) {
            aggregated[key].last_successful_login_time = timeStr;
        }
      });
      
      let result = Object.values(aggregated);

      // If accountFilter was by name, filter here
      if (accountFilter && isNaN(parseInt(accountFilter))) {
        result = result.filter(item => item.acct_name.toLowerCase().includes(accountFilter.toLowerCase()));
      }
      
      setAccountActivity(result.sort((a,b) => b.successful_login_count - a.successful_login_count));

    } catch (err) {
      console.error('Error processing account activity:', err);
      setAccountActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyLoginStats = async () => {
    // Fetches stats for the last 30 days
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .rpc('get_daily_login_stats', {
          start_date: thirtyDaysAgo.toISOString().split('T')[0]
        });

      if (error) {
        console.error('Error fetching daily login stats:', error);
        setDailyStats([]);
        return;
      }
      setDailyStats(data || []);
    } catch (err) {
      console.error('Error processing daily login stats:', err);
      setDailyStats([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to create an RPC for daily stats if it doesn't exist
  // This is illustrative; actual creation would be a migration.
  // For now, I'll assume an RPC function `get_daily_login_stats` can be created.
  // Or, do client-side aggregation if simpler for now.
  // Let's try client-side aggregation first for fetchDailyLoginStats to avoid creating RPC now.

  const fetchDailyLoginStatsClientSide = async () => {
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logs, error } = await supabase
        .from('login_activity_log')
        .select('account_number, login_timestamp, login_success')
        .eq('login_success', true)
        .gte('login_timestamp', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error fetching logs for daily stats:', error);
        setDailyStats([]);
        return;
      }

      const dailyMap: { [date: string]: { uniqueAccounts: Set<number>, totalLogins: number } } = {};

      logs?.forEach(log => {
        const dateStr = new Date(log.login_timestamp).toISOString().split('T')[0];
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { uniqueAccounts: new Set(), totalLogins: 0 };
        }
        dailyMap[dateStr].uniqueAccounts.add(log.account_number);
        dailyMap[dateStr].totalLogins += 1;
      });

      const formattedStats: DailyStats[] = Object.entries(dailyMap).map(([date, stats]) => ({
        date: date,
        unique_active_accounts: stats.uniqueAccounts.size,
        total_successful_logins: stats.totalLogins,
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setDailyStats(formattedStats);

    } catch (err) {
      console.error('Error processing daily login stats (client-side):', err);
      setDailyStats([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDateFilter(today);
    fetchAccountActivity(today);
    fetchDailyLoginStatsClientSide(); // Use client-side aggregation
  }, []); // Initial fetch

  const handleDateFilterChange = (date: string) => {
    setDateFilter(date);
    fetchAccountActivity(date); // Refetch account activity for the new date
    // Daily stats are for last 30 days, typically not re-fetched on single date change unless desired
  };

  const formatCurrency = (amount: number) => {
    // This function might not be needed if no currency is displayed
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Ensure dateString is valid before parsing
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString();
  };
  
  // Filtering for account activity is now handled within fetchAccountActivity or client-side if needed
  // For this example, server-side filtering by account number is partial, name filtering is client-side in fetch.

  // Calculate totals for the currently displayed account activity (if dateFilter is active)
  const currentDisplayTotalLogins = accountActivity.reduce((sum, record) => sum + record.successful_login_count, 0);
  const currentDisplayActiveAccounts = new Set(accountActivity.map(r => r.account_number)).size;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Login & Sales History</h2>
          <p className="text-sm text-gray-600 mt-1">Track daily login activity with sales performance</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Daily Overview
          </button>
          <button
            onClick={() => setViewMode('account')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'account'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Account Details
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Simplified to 2 cards for login stats */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Active Accounts Today</div>
          <div className="text-2xl font-bold text-blue-600">{currentDisplayActiveAccounts}</div>
          <div className="text-xs text-gray-500 mt-1">
            {dateFilter ? `On ${formatDate(dateFilter)}` : 'Overview'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Successful Logins Today</div>
          <div className="text-2xl font-bold text-green-600">{currentDisplayTotalLogins}</div>
          <div className="text-xs text-gray-500 mt-1">
             {dateFilter ? `On ${formatDate(dateFilter)}` : 'Overview'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Account</label>
            <input
              type="text"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              placeholder="Account number or company name..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setDateFilter(today); // Reset date to today
              setAccountFilter('');
              fetchAccountActivity(today); // Fetch for today
              // fetchDailyLoginStatsClientSide(); // Daily stats are generally not affected by this specific filter reset
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Reset Filters
          </button>
          <button
            onClick={() => {
                fetchAccountActivity(dateFilter);
                fetchDailyLoginStatsClientSide(); // Optionally refresh daily stats too
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'daily' ? (
        /* Daily Overview */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Daily Activity Overview (Last 30 Days)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unique Active Accounts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Successful Logins
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyStats.map((stat) => (
                  <tr key={stat.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(stat.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {stat.unique_active_accounts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {stat.total_successful_logins}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Account Details */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Account Activity Details ({accountActivity.length} accounts for {dateFilter ? formatDate(dateFilter) : 'selected period'})
            </h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600">Loading activity data...</div>
            </div>
          ) : accountActivity.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600">No activity found for selected criteria</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Successful Logins
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login Time (on this date)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accountActivity.map((record) => (
                    <tr key={`${record.account_number}-${record.login_date}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.account_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {record.acct_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.successful_login_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.last_successful_login_time || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
