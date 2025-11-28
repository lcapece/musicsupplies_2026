import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronUp, ChevronDown, Edit2, Save, X, Download } from 'lucide-react';

interface StateAssignment {
  state_abbr: string;
  state_name: string;
  salesman_assigned: string | null;
  prospect_count: number;
  country_code: string;
}

interface SortConfig {
  key: keyof StateAssignment;
  direction: 'asc' | 'desc';
}

interface StateAssignmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const StateAssignmentManager: React.FC<StateAssignmentManagerProps> = ({ isOpen, onClose }) => {
  const [states, setStates] = useState<StateAssignment[]>([]);
  const [salespeople, setSalespeople] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'state_name', direction: 'asc' });
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterSalesperson, setFilterSalesperson] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load state assignments from state_xref table
      const { data: stateData, error: stateError } = await supabase
        .from('state_xref')
        .select('*')
        .order('state_name');

      if (stateError) throw stateError;

      // Load prospect counts from prospector table
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospector')
        .select('state')
        .eq('round_number', 1);

      if (prospectError) throw prospectError;

      // Count prospects by state
      const prospectCounts = prospectData?.reduce((acc: Record<string, number>, row) => {
        const state = row.state?.toUpperCase().trim();
        if (state && state.length === 2) {
          acc[state] = (acc[state] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      // Load salespeople from staff_management
      const { data: staffData, error: staffError } = await supabase
        .from('staff_management')
        .select('user_full_name, username')
        .eq('is_salesperson', true);

      if (staffError) {
        console.warn('Could not load salespeople:', staffError);
      }

      const salespeople = (staffData || []).map(person => 
        person.user_full_name || person.username
      ).filter(Boolean);

      setSalespeople(salespeople);

      // Combine data
      const combinedData: StateAssignment[] = (stateData || []).map(state => ({
        state_abbr: state.state_code,
        state_name: state.state_name,
        salesman_assigned: state.assigned_staff,
        prospect_count: prospectCounts[state.state_code] || 0,
        country_code: 'US' // Assuming US for now, can be enhanced later
      }));

      setStates(combinedData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setMessage({ type: 'error', text: 'Failed to load state assignment data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof StateAssignment) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedAndFilteredStates = useMemo(() => {
    let filtered = states;

    // Apply filters
    if (filterCountry !== 'all') {
      filtered = filtered.filter(state => state.country_code === filterCountry);
    }

    if (filterSalesperson !== 'all') {
      if (filterSalesperson === 'unassigned') {
        filtered = filtered.filter(state => !state.salesman_assigned);
      } else {
        filtered = filtered.filter(state => state.salesman_assigned === filterSalesperson);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(state => 
        state.state_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        state.state_abbr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (state.salesman_assigned && state.salesman_assigned.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue === null) return sortConfig.direction === 'asc' ? -1 : 1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [states, sortConfig, filterCountry, filterSalesperson, searchTerm]);

  const handleEdit = (stateAbbr: string, currentValue: string | null) => {
    setEditingRow(stateAbbr);
    setEditValue(currentValue || '');
  };

  const handleSave = async (stateAbbr: string) => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('state_xref')
        .update({ assigned_staff: editValue || null })
        .eq('state_code', stateAbbr);

      if (error) throw error;

      // Update local state
      setStates(prev => prev.map(state => 
        state.state_abbr === stateAbbr 
          ? { ...state, salesman_assigned: editValue || null }
          : state
      ));

      setEditingRow(null);
      setEditValue('');
      setMessage({ type: 'success', text: 'Assignment updated successfully' });
    } catch (err: any) {
      console.error('Error updating assignment:', err);
      setMessage({ type: 'error', text: 'Failed to update assignment' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditValue('');
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['State Name', 'State Code', 'Assigned Salesperson', 'Prospect Count'],
      ...sortedAndFilteredStates.map(state => [
        state.state_name,
        state.state_abbr,
        state.salesman_assigned || 'Unassigned',
        state.prospect_count.toString()
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `state-assignments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSortIcon = (key: keyof StateAssignment) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const calculateSummary = () => {
    const total = sortedAndFilteredStates.length;
    const assigned = sortedAndFilteredStates.filter(state => state.salesman_assigned).length;
    const unassigned = total - assigned;
    const totalProspects = sortedAndFilteredStates.reduce((sum, state) => sum + state.prospect_count, 0);

    return { total, assigned, unassigned, totalProspects };
  };

  const calculateSalespersonSummary = () => {
    const summary: Record<string, { stateCount: number; prospectCount: number }> = {};

    states.forEach(state => {
      const salesperson = state.salesman_assigned || 'Unassigned';
      if (!summary[salesperson]) {
        summary[salesperson] = { stateCount: 0, prospectCount: 0 };
      }
      summary[salesperson].stateCount += 1;
      summary[salesperson].prospectCount += state.prospect_count;
    });

    return Object.entries(summary)
      .sort((a, b) => {
        // Sort unassigned last
        if (a[0] === 'Unassigned') return 1;
        if (b[0] === 'Unassigned') return -1;
        // Sort by state count descending
        return b[1].stateCount - a[1].stateCount;
      });
  };

  if (!isOpen) return null;

  const summary = calculateSummary();
  const salespersonSummary = calculateSalespersonSummary();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">State Assignment Management</h2>
              <p className="text-blue-100 text-sm">
                Assign salespeople to states and manage territories
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                title="Export to CSV"
              >
                <Download className="w-5 h-5" />
              </button>

              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`px-6 py-3 text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Controls */}
        <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Search */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search states or salespeople..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <select
                  value={filterSalesperson}
                  onChange={(e) => setFilterSalesperson(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Assignments</option>
                  <option value="unassigned">Unassigned</option>
                  {salespeople.map(sp => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              </div>

              {/* Summary Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="text-gray-600">
                  <span className="font-medium text-blue-600">{summary.total}</span> Total
                </div>
                <div className="text-gray-600">
                  <span className="font-medium text-green-600">{summary.assigned}</span> Assigned
                </div>
                <div className="text-gray-600">
                  <span className="font-medium text-yellow-600">{summary.unassigned}</span> Unassigned
                </div>
                <div className="text-gray-600">
                  <span className="font-medium text-purple-600">{summary.totalProspects}</span> Prospects
                </div>
              </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading state assignments...</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('state_name')}
                  >
                    <div className="flex items-center gap-2">
                      State Name
                      {getSortIcon('state_name')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('salesman_assigned')}
                  >
                    <div className="flex items-center gap-2">
                      Assigned Salesperson
                      {getSortIcon('salesman_assigned')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('prospect_count')}
                  >
                    <div className="flex items-center gap-2">
                      Prospects
                      {getSortIcon('prospect_count')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedAndFilteredStates.map((state) => (
                  <tr key={state.state_abbr} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{state.state_name}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {state.state_abbr}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingRow === state.state_abbr ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                            disabled={saving}
                          >
                            <option value="">Unassigned</option>
                            {salespeople.map(sp => (
                              <option key={sp} value={sp}>{sp}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className={`${
                          state.salesman_assigned 
                            ? 'text-gray-900 font-medium' 
                            : 'text-gray-400 italic'
                        }`}>
                          {state.salesman_assigned || 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {state.prospect_count.toLocaleString()}
                        </span>
                        {state.prospect_count > 0 && (
                          <div className={`w-2 h-2 rounded-full ${
                            state.prospect_count >= 50 ? 'bg-red-500' :
                            state.prospect_count >= 25 ? 'bg-yellow-500' :
                            state.prospect_count >= 10 ? 'bg-blue-500' :
                            'bg-green-500'
                          }`} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingRow === state.state_abbr ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSave(state.state_abbr)}
                            disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(state.state_abbr, state.salesman_assigned)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer - Salesperson Summary */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary by Salesperson</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {salespersonSummary.map(([salesperson, data]) => (
              <div
                key={salesperson}
                className={`p-4 rounded-lg border-2 ${
                  salesperson === 'Unassigned'
                    ? 'bg-gray-100 border-gray-300'
                    : 'bg-white border-blue-200'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-2 truncate" title={salesperson}>
                  {salesperson}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">States:</span>
                    <span className="font-medium text-blue-600">{data.stateCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Prospects:</span>
                    <span className="font-medium text-purple-600">{data.prospectCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-300">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
              <div>
                Showing {sortedAndFilteredStates.length} of {states.length} states
              </div>
              <div className="flex items-center gap-6">
                <div>Total States: <span className="font-medium text-blue-600">{summary.total}</span></div>
                <div>Assigned: <span className="font-medium text-green-600">{summary.assigned}</span></div>
                <div>Unassigned: <span className="font-medium text-yellow-600">{summary.unassigned}</span></div>
                <div>Total Prospects: <span className="font-medium text-purple-600">{summary.totalProspects.toLocaleString()}</span></div>
                <div>Assignment Rate: <span className="font-medium text-blue-600">{states.length > 0 ? Math.round((summary.assigned / states.length) * 100) : 0}%</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateAssignmentManager;