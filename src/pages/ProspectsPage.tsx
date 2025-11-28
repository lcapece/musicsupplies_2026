import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Search, Filter, Download, RefreshCw, Eye, Phone, Mail, Calendar, TrendingUp, Users, Building, MapPin, Star, Globe, Activity, DollarSign } from 'lucide-react';
import ProspectorModal from '../components/ProspectorModal';
import ConvertToAccountModal from '../components/ConvertToAccountModal';

type SortColumn =
  | 'business_name'
  | 'website'
  | 'state'
  | 'city'
  | 'google_review'
  | 'email'
  | 'contact'
  | 'phone'
  | 'lead_status'
  | 'last_contact'
  | 'conversion_score'
  | 'intelligence_status'
  | 'ai_grade'
  | 'total_interactions';

interface ProspectData {
  id: string;
  business_name: string;
  address?: string;
  city?: string;
  state: string;
  zip: string;
  email?: string;
  contact?: string;
  website?: string;
  phone?: string;
  google_review?: number | null;
  
  // Enhanced fields for comprehensive view
  intelligence_status?: string | null;
  ai_grade?: string | null;
  lead_status?: string;
  last_contact?: string | null;
  conversion_score?: number;
  total_interactions?: number;
  days_since_contact?: number;
  account_progression?: string;
  territory?: string;
  industry?: string;
  company_size?: string;
  revenue_potential?: number;
  
  // Activity tracking
  recent_activity?: string | null;
  recent_activity_date?: string | null;
}

interface ProspectsPageProps {
  onNavigateBack: () => void;
  preservedState?: {
    filters?: any;
    searchParams?: any;
    sessionData?: any;
  };
}

const ProspectsPage: React.FC<ProspectsPageProps> = ({
  onNavigateBack,
  preservedState
}) => {
  const { staffUsername } = useAuth();
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState(preservedState?.searchParams?.searchTerm || '');
  const [stateFilter, setStateFilter] = useState(preservedState?.filters?.state || '');
  const [leadStatusFilter, setLeadStatusFilter] = useState(preservedState?.filters?.leadStatus || '');
  const [gradeFilter, setGradeFilter] = useState(preservedState?.filters?.grade || '');
  const [industryFilter, setIndustryFilter] = useState(preservedState?.filters?.industry || '');
  
  // Data state
  const [allProspects, setAllProspects] = useState<ProspectData[]>([]);
  const [filteredProspects, setFilteredProspects] = useState<ProspectData[]>([]);
  const [displayedProspects, setDisplayedProspects] = useState<ProspectData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [selectedProspectId, setSelectedProspectId] = useState<string | undefined>(undefined);
  const [showProspectModal, setShowProspectModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertProspectData, setConvertProspectData] = useState<any>(null);
  
  // Pagination and scrolling
  const prospectsScrollRef = useRef<HTMLDivElement>(null);
  const [prospectsPage, setProspectsPage] = useState(1);
  const ITEMS_PER_PAGE = 100; // Increased for full-screen view
  
  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('business_name');
  const [sortAsc, setSortAsc] = useState(true);

  // Inline editing state
  const [editingProspect, setEditingProspect] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'phone' | 'contact' | 'recent_activity' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    gradeA: 0,
    gradeB: 0,
    gradeC: 0,
    gradeD: 0,
    hotLeads: 0,
    recentActivity: 0,
    withValidPhone: 0,
    withGooglePlacesId: 0
  });

  // Load data on component mount
  useEffect(() => {
    loadAllProspects();
  }, []);

  // Auto-filter when inputs change
  useEffect(() => {
    if (allProspects.length > 0) {
      applyFiltersAndSort();
    }
  }, [searchTerm, stateFilter, leadStatusFilter, gradeFilter, industryFilter, sortColumn, sortAsc, allProspects]);

  const loadAllProspects = async () => {
    setLoading(true);
    setError(null);

    try {

      // Get the current user's assigned states from state_xref
      const { data: assignedStatesData, error: statesError } = await supabase
        .from('state_xref')
        .select('state_code')
        .eq('assigned_staff', staffUsername);

      if (statesError) {
        console.error('Error loading assigned states:', statesError);
        throw statesError;
      }

      const assignedStateCodes = assignedStatesData?.map(row => row.state_code) || [];

      // If user has no assigned states, show empty results
      if (assignedStateCodes.length === 0) {
        console.warn(`User ${staffUsername} has no assigned states`);
        setAllProspects([]);
        setLoading(false);
        return;
      }

      // Fetch prospects with enhanced data - filtered by assigned states
      const { data: prospectsData, error: prospectsError } = await supabase
        .from('prospector')
        .select(`
          *,
          prospect_activity_log!prospect_activity_log_prospect_website_fkey(
            activity_type,
            activity_date,
            activity_details
          )
        `)
        .in('state', assignedStateCodes)
        .order('website');

      if (prospectsError) throw prospectsError;


      // Process and enhance prospect data
      const enhancedProspects: ProspectData[] = (prospectsData || [])
        .map((row: any) => {
          // Calculate enhanced metrics
          const activities = row.prospect_activity_log || [];
          const lastActivity = activities.length > 0 ? activities[0] : null;
          const daysSinceContact = lastActivity 
            ? Math.floor((Date.now() - new Date(lastActivity.activity_date).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          // Calculate conversion score based on various factors
          let conversionScore = 0;
          if (row.google_review && row.google_review >= 4.0) conversionScore += 20;
          if (row.email) conversionScore += 15;
          if (row.phone) conversionScore += 15;
          if (row.ai_grade === 'A') conversionScore += 30;
          else if (row.ai_grade === 'B') conversionScore += 20;
          else if (row.ai_grade === 'C') conversionScore += 10;
          if (activities.length > 0) conversionScore += Math.min(activities.length * 5, 20);

          // Determine lead status
          let leadStatus = 'New';
          if (activities.length > 0) {
            const recentActivity = activities[0];
            if (recentActivity.activity_type === 'conversion') leadStatus = 'Converted';
            else if (recentActivity.activity_details?.includes('interested')) leadStatus = 'Hot';
            else if (recentActivity.activity_details?.includes('callback')) leadStatus = 'Warm';
            else if (daysSinceContact && daysSinceContact > 30) leadStatus = 'Cold';
            else leadStatus = 'Active';
          }

          // Account progression
          let accountProgression = 'Prospect';
          if (activities.some((a: any) => a.activity_type === 'conversion')) accountProgression = 'Converted';
          else if (activities.some((a: any) => a.activity_details?.includes('quote'))) accountProgression = 'Quoted';
          else if (activities.length > 3) accountProgression = 'Engaged';
          else if (activities.length > 0) accountProgression = 'Contacted';

          return {
            id: row.website,
            business_name: row.business_name || row.business_nam || row.website,
            address: row.address || '',
            city: row.city || '',
            state: row.state || '',
            zip: row.zip || '',
            email: row.email || '',
            contact: row.contact || '',
            website: row.website,
            phone: row.phone || '',
            google_review: typeof row.google_review === 'number' ? row.google_review : null,
            
            // Enhanced fields
            intelligence_status: row.intelligence_status || 'idle',
            ai_grade: row.ai_grade || 'Ungraded',
            lead_status: leadStatus,
            last_contact: lastActivity?.activity_date || null,
            conversion_score: conversionScore,
            total_interactions: activities.length,
            days_since_contact: daysSinceContact,
            account_progression: accountProgression,
            territory: row.state || 'Unassigned',
            industry: row.business_name?.includes('Music') ? 'Music' : 
                     row.business_name?.includes('School') ? 'Education' : 
                     row.business_name?.includes('Church') ? 'Religious' : 'Other',
            company_size: 'Unknown',
            revenue_potential: conversionScore * 100, // Rough estimate
            
            recent_activity: lastActivity?.activity_type || null,
            recent_activity_date: lastActivity?.activity_date || null
          } as ProspectData;
        });

      // Calculate statistics
      const newStats = {
        total: enhancedProspects.length,
        gradeA: enhancedProspects.filter(p => p.ai_grade === 'A').length,
        gradeB: enhancedProspects.filter(p => p.ai_grade === 'B').length,
        gradeC: enhancedProspects.filter(p => p.ai_grade === 'C').length,
        gradeD: enhancedProspects.filter(p => p.ai_grade === 'D').length,
        hotLeads: enhancedProspects.filter(p => p.lead_status === 'Hot').length,
        recentActivity: enhancedProspects.filter(p => p.days_since_contact !== null && p.days_since_contact !== undefined && p.days_since_contact <= 7).length,
        withValidPhone: enhancedProspects.filter(p => p.phone && p.phone.trim() !== '' && p.phone !== '000-000-0000').length,
        withGooglePlacesId: (prospectsData || []).filter((p: any) => p.google_places_id && p.google_places_id.trim() !== '').length
      };

      setStats(newStats);
      setAllProspects(enhancedProspects);
      setFilteredProspects(enhancedProspects);

    } catch (err) {
      console.error('Error loading prospects:', err);
      setError('Failed to load prospects data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...allProspects];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(prospect => 
        prospect.business_name.toLowerCase().includes(term) ||
        prospect.website?.toLowerCase().includes(term) ||
        prospect.email?.toLowerCase().includes(term) ||
        prospect.contact?.toLowerCase().includes(term) ||
        prospect.city?.toLowerCase().includes(term) ||
        prospect.state?.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (stateFilter) {
      filtered = filtered.filter(p => p.state?.toLowerCase().includes(stateFilter.toLowerCase()));
    }
    if (leadStatusFilter) {
      filtered = filtered.filter(p => p.lead_status === leadStatusFilter);
    }
    if (gradeFilter) {
      filtered = filtered.filter(p => p.ai_grade === gradeFilter);
    }
    if (industryFilter) {
      filtered = filtered.filter(p => p.industry === industryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortColumn] ?? '';
      const bVal = (b as any)[sortColumn] ?? '';
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (aStr < bStr) return sortAsc ? -1 : 1;
      if (aStr > bStr) return sortAsc ? 1 : -1;
      return 0;
    });

    setFilteredProspects(filtered);
    setDisplayedProspects(filtered.slice(0, ITEMS_PER_PAGE));
    setProspectsPage(1);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(column);
      setSortAsc(true);
    }
  };

  const handleProspectClick = (prospect: ProspectData) => {
    setSelectedProspectId(prospect.id);
    setShowProspectModal(true);
  };

  const handleConvertClick = (prospect: ProspectData, e: React.MouseEvent) => {
    e.stopPropagation();
    setConvertProspectData({
      website: prospect.website,
      business_name: prospect.business_name,
      city: prospect.city,
      phone: prospect.phone
    });
    setShowConvertModal(true);
  };

  const handleConversionSuccess = (accountNumber: string) => {
    // Reload data to reflect changes
    loadAllProspects();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot': return 'bg-red-100 text-red-800';
      case 'Warm': return 'bg-orange-100 text-orange-800';
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'Cold': return 'bg-gray-100 text-gray-800';
      case 'Converted': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-700 font-bold';
      case 'B': return 'text-blue-700 font-semibold';
      case 'C': return 'text-yellow-700 font-medium';
      case 'D': return 'text-red-700 font-medium';
      default: return 'text-gray-500';
    }
  };

  const handleEditClick = (prospectId: string, field: 'phone' | 'contact' | 'recent_activity', currentValue: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProspect(prospectId);
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const handleSaveEdit = async (prospectWebsite: string) => {
    if (!editingField) return;

    setSaving(true);
    try {
      const updateData: any = {};
      updateData[editingField] = editValue || null;

      const { error } = await supabase
        .from('prospector')
        .update(updateData)
        .eq('website', prospectWebsite);

      if (error) throw error;

      // Update local state
      setAllProspects(prev => prev.map(p =>
        p.website === prospectWebsite
          ? { ...p, [editingField]: editValue || undefined }
          : p
      ));

      setEditingProspect(null);
      setEditingField(null);
      setEditValue('');
    } catch (err) {
      console.error('Error updating prospect:', err);
      alert('Failed to update prospect');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProspect(null);
    setEditingField(null);
    setEditValue('');
  };

  const sortIndicator = (col: SortColumn) => {
    if (sortColumn !== col) return null;
    return (
      <span className="ml-1 text-blue-600">{sortAsc ? '↑' : '↓'}</span>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col">
      {/* Compact Header */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Prospects Management</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadAllProspects}
                disabled={loading}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={onNavigateBack}
                className="flex items-center px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Prospects</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg border-2 border-emerald-300">
            <div className="flex items-center">
              <Phone className="w-8 h-8 text-emerald-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-emerald-600">Valid Phone #s</p>
                <p className="text-2xl font-bold text-emerald-900">{stats.withValidPhone}</p>
              </div>
            </div>
          </div>

          <div className="bg-cyan-50 p-4 rounded-lg border-2 border-cyan-300">
            <div className="flex items-center">
              <MapPin className="w-8 h-8 text-cyan-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-cyan-600">Places API Verified</p>
                <p className="text-2xl font-bold text-cyan-900">{stats.withGooglePlacesId}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Star className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Grade A</p>
                <p className="text-2xl font-bold text-green-900">{stats.gradeA}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Grade B</p>
                <p className="text-2xl font-bold text-blue-900">{stats.gradeB}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-600">Grade C</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.gradeC}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-600">Hot Leads</p>
                <p className="text-2xl font-bold text-red-900">{stats.hotLeads}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">Recent Activity</p>
                <p className="text-2xl font-bold text-purple-900">{stats.recentActivity}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Filter className="w-8 h-8 text-gray-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Filtered</p>
                <p className="text-2xl font-bold text-gray-900">{filteredProspects.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search prospects by name, website, email, contact..."
              />
            </div>
          </div>
          
          {/* Filters */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All States</option>
            <option value="CA">California</option>
            <option value="TX">Texas</option>
            <option value="NY">New York</option>
            <option value="FL">Florida</option>
          </select>
          
          <select
            value={leadStatusFilter}
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Active">Active</option>
            <option value="Cold">Cold</option>
            <option value="New">New</option>
            <option value="Converted">Converted</option>
          </select>
          
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Grades</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
            <option value="D">Grade D</option>
          </select>
          
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Industries</option>
            <option value="Music">Music</option>
            <option value="Education">Education</option>
            <option value="Religious">Religious</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Main Data Grid - Full Screen */}
      <div className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
        <div className="bg-white rounded-lg shadow flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading prospects...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-red-600">
                <p className="font-semibold">Error loading data</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th
                      className="w-64 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('business_name')}
                    >
                      Business Name {sortIndicator('business_name')}
                    </th>
                    <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Intel
                    </th>
                    <th
                      className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('lead_status')}
                    >
                      Status {sortIndicator('lead_status')}
                    </th>
                    <th
                      className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('conversion_score')}
                    >
                      Score {sortIndicator('conversion_score')}
                    </th>
                    <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="w-56 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th
                      className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('google_review')}
                    >
                      Reviews {sortIndicator('google_review')}
                    </th>
                    <th
                      className="w-36 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('total_interactions')}
                    >
                      Interactions {sortIndicator('total_interactions')}
                    </th>
                    <th
                      className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('last_contact')}
                    >
                      Last Contact {sortIndicator('last_contact')}
                    </th>
                    <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progression
                    </th>
                    <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedProspects.map((prospect) => (
                    <tr 
                      key={prospect.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleProspectClick(prospect)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {prospect.business_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {prospect.website}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              prospect.intelligence_status === 'complete' ? 'bg-green-500' :
                              prospect.intelligence_status === 'error' ? 'bg-red-500' :
                              prospect.intelligence_status === 'researching' ? 'bg-yellow-500 animate-pulse' :
                              'bg-gray-400'
                            }`}
                          />
                          <span className={`text-sm font-semibold ${getGradeColor(prospect.ai_grade || '')}`}>
                            {prospect.ai_grade || '-'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(prospect.lead_status || 'New')}`}>
                          {prospect.lead_status}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min((prospect.conversion_score || 0), 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-900">{prospect.conversion_score || 0}</span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                          {prospect.city}, {prospect.state}
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="text-sm text-gray-900">
                          {prospect.email && (
                            <div className="flex items-center mb-1">
                              <Mail className="w-3 h-3 text-gray-400 mr-1" />
                              <span className="truncate max-w-32">{prospect.email}</span>
                            </div>
                          )}

                          {/* Editable Phone */}
                          <div className="flex items-center mb-1">
                            <Phone className="w-3 h-3 text-gray-400 mr-1" />
                            {editingProspect === prospect.id && editingField === 'phone' ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(prospect.website || '');
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  className="w-32 px-1 py-0.5 border border-blue-500 rounded text-xs"
                                  autoFocus
                                  disabled={saving}
                                />
                                <button onClick={() => handleSaveEdit(prospect.website || '')} className="text-green-600 hover:text-green-800" disabled={saving}>✓</button>
                                <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-800" disabled={saving}>✕</button>
                              </div>
                            ) : (
                              <span
                                className="cursor-pointer hover:bg-yellow-100 px-1 rounded"
                                onClick={(e) => handleEditClick(prospect.id, 'phone', prospect.phone, e)}
                              >
                                {prospect.phone || '(click to add)'}
                              </span>
                            )}
                          </div>

                          {/* Editable Contact */}
                          <div className="text-xs text-gray-500">
                            {editingProspect === prospect.id && editingField === 'contact' ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(prospect.website || '');
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  className="w-32 px-1 py-0.5 border border-blue-500 rounded text-xs"
                                  autoFocus
                                  disabled={saving}
                                />
                                <button onClick={() => handleSaveEdit(prospect.website || '')} className="text-green-600 hover:text-green-800" disabled={saving}>✓</button>
                                <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-800" disabled={saving}>✕</button>
                              </div>
                            ) : (
                              <span
                                className="cursor-pointer hover:bg-yellow-100 px-1 rounded"
                                onClick={(e) => handleEditClick(prospect.id, 'contact', prospect.contact, e)}
                              >
                                Contact: {prospect.contact || '(click to add)'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap">
                        {prospect.google_review ? (
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="text-sm text-gray-900">{prospect.google_review}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="text-sm text-gray-900">
                          <span className="font-semibold">{prospect.total_interactions || 0}</span>

                          {/* Editable Recent Activity */}
                          <div className="text-xs text-gray-500 mt-1">
                            {editingProspect === prospect.id && editingField === 'recent_activity' ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(prospect.website || '');
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  className="w-40 px-1 py-0.5 border border-blue-500 rounded text-xs"
                                  autoFocus
                                  disabled={saving}
                                  placeholder="Activity note..."
                                />
                                <button onClick={() => handleSaveEdit(prospect.website || '')} className="text-green-600 hover:text-green-800" disabled={saving}>✓</button>
                                <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-800" disabled={saving}>✕</button>
                              </div>
                            ) : (
                              <span
                                className="cursor-pointer hover:bg-yellow-100 px-1 rounded block"
                                onClick={(e) => handleEditClick(prospect.id, 'recent_activity', prospect.recent_activity, e)}
                              >
                                Last: {prospect.recent_activity || '(click to add)'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(prospect.last_contact || null)}
                          {prospect.days_since_contact !== null && (
                            <div className="text-xs text-gray-500">
                              {prospect.days_since_contact} days ago
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          prospect.account_progression === 'Converted' ? 'bg-green-100 text-green-800' :
                          prospect.account_progression === 'Quoted' ? 'bg-blue-100 text-blue-800' :
                          prospect.account_progression === 'Engaged' ? 'bg-purple-100 text-purple-800' :
                          prospect.account_progression === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {prospect.account_progression}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProspectClick(prospect);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {prospect.account_progression !== 'Converted' && (
                            <button
                              onClick={(e) => handleConvertClick(prospect, e)}
                              className="text-green-600 hover:text-green-900"
                              title="Convert to Account"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {displayedProspects.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No prospects found matching your criteria</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showProspectModal && (
        <ProspectorModal
          isOpen={showProspectModal}
          onClose={() => {
            setShowProspectModal(false);
            setSelectedProspectId(undefined);
            loadAllProspects(); // Reload to reflect any changes
          }}
          website={selectedProspectId}
        />
      )}

      {showConvertModal && (
        <ConvertToAccountModal
          isOpen={showConvertModal}
          onClose={() => {
            setShowConvertModal(false);
            setConvertProspectData(null);
          }}
          prospectData={convertProspectData}
          onConversionSuccess={handleConversionSuccess}
          staffUsername={staffUsername || undefined}
        />
      )}
    </div>
  );
};

export default ProspectsPage;
