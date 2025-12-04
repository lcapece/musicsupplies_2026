import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ProspectorModal from './ProspectorModal';

interface AssignedState {
  state_abbr: string;
  state_name: string;
  country_code: string;
}

type SortColumn =
  | 'business_name'
  | 'status'
  | 'website'
  | 'state'
  | 'city'
  | 'google_review'
  | 'email'
  | 'contact'
  | 'phone';

interface EntityResult {
  id: string;
  business_name: string;
  status?: string | null;
  address?: string;
  city?: string;
  state: string;
  zip: string;
  email?: string;
  contact?: string;
  website?: string;
  phone?: string;
  google_review?: number | null;
  salesrep?: string; // placeholder for now

  // Intelligence indicators
  intelligence_status?: string | null;
  ai_grade?: string | null;

  // Activity tracking
  recent_activity?: string | null;
  recent_activity_date?: string | null;
}

interface ProspectsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProspectsSearchModal: React.FC<ProspectsSearchModalProps> = ({
  isOpen,
  onClose
}) => {
  const { staffUsername, isSuperUser, isSpecialAdmin } = useAuth();
  const [andContains1, setAndContains1] = useState('');
  const [andContains2, setAndContains2] = useState('');
  const [andDoesNotContain, setAndDoesNotContain] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [allProspects, setAllProspects] = useState<EntityResult[]>([]);
  const [filteredProspects, setFilteredProspects] = useState<EntityResult[]>([]);
  const [displayedProspects, setDisplayedProspects] = useState<EntityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProspectModal, setShowProspectModal] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string | undefined>(undefined);
  const prospectsScrollRef = useRef<HTMLDivElement>(null);
  const [prospectsPage, setProspectsPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // State assignment management
  const [assignedStates, setAssignedStates] = useState<AssignedState[]>([]);
  const [availableStates, setAvailableStates] = useState<AssignedState[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Excel-like sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('business_name');
  const [sortAsc, setSortAsc] = useState(true);

  // Inline editing state
  const [editingProspect, setEditingProspect] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'phone' | 'email' | 'status' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [fetchingPhone, setFetchingPhone] = useState<string | null>(null);

  // Contact notes popup state
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [contactPopupProspect, setContactPopupProspect] = useState<string | null>(null);
  const [contactNotes, setContactNotes] = useState<string>('');

  // Fixed column widths - HARDCODED for reliability
  // CRITICAL: Status must be wide enough for "MADE PURCHASE" (longest option)
  const columnWidths = {
    business_name: 200,
    status: 170,  // Wide enough for full status text like "NOT INTERESTED"
    intel: 50,
    website: 200,
    state: 50,
    city: 100,
    phone: 120,
    google_review: 80,
    email: 200,
    contact: 80,
    address: 150,
    zip: 60
  };

  // Critical stats
  const [statsValidPhone, setStatsValidPhone] = useState(0);
  const [statsGooglePlacesId, setStatsGooglePlacesId] = useState(0);
  const [statsValidScreenshots, setStatsValidScreenshots] = useState(0);

  // Function to calculate critical stats from raw prospector data
  // IMPORTANT: Must filter by assigned states for non-super-admin users
  const calculateCriticalStats = (rawProspects: any[], userAssignedStates: AssignedState[], isSuperAdminUser: boolean) => {
    // Filter prospects by assigned states if not super admin
    let filteredForStats = rawProspects;
    if (!isSuperAdminUser && userAssignedStates.length > 0) {
      const allowedStates = userAssignedStates.map(s => s.state_abbr.toUpperCase());
      filteredForStats = rawProspects.filter(p =>
        p.state && allowedStates.includes(p.state.toUpperCase())
      );
    }

    const validPhoneCount = filteredForStats.filter(p =>
      p.phone &&
      p.phone.trim() !== '' &&
      p.phone !== '000-000-0000'
    ).length;

    const googlePlacesIdCount = filteredForStats.filter(p =>
      p.google_places_id &&
      p.google_places_id.trim() !== ''
    ).length;

    setStatsValidPhone(validPhoneCount);
    setStatsGooglePlacesId(googlePlacesIdCount);


    return { validPhone: validPhoneCount, googlePlacesId: googlePlacesIdCount };
  };

  // Function to fetch user's assigned states
  // RETURNS the computed super admin status to avoid React state race condition
  const fetchUserAssignedStates = async (): Promise<boolean> => {
    if (!staffUsername) {
      console.warn('⚠️ No staffUsername provided, cannot fetch states');
      return false;
    }

    setIsLoadingStates(true);
    let computedIsSuperAdmin = false;

    try {
      // Check if user is super admin first
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_user_super_admin', {
        p_username: staffUsername
      });


      if (adminError) {
        console.error('❌ Error checking admin status:', adminError);
        // Fallback: check using context values
        computedIsSuperAdmin = isSuperUser || isSpecialAdmin || false;
        setIsSuperAdmin(computedIsSuperAdmin);
      } else {
        computedIsSuperAdmin = isAdmin || isSuperUser || isSpecialAdmin || false;
        setIsSuperAdmin(computedIsSuperAdmin);
      }

      // If super admin, get ALL states (no restrictions), otherwise get assigned states only
      if (isAdmin || isSuperUser || isSpecialAdmin) {
        const { data: allStates, error: statesError } = await supabase.rpc('get_all_states');


        if (statesError) {
          console.error('❌ Error fetching all states via RPC:', statesError);
          // Fallback: fetch ALL states from state_xref table directly
          const { data: fallbackStates, error: fallbackError } = await supabase
            .from('state_xref')
            .select('state_code, state_name, country_code')
            .order('country_code')
            .order('state_code');


          if (!fallbackError && fallbackStates) {
            // Map state_code to state_abbr for consistency
            const mappedStates = fallbackStates.map(s => ({
              state_abbr: s.state_code,
              state_name: s.state_name,
              country_code: s.country_code
            }));
            setAvailableStates(mappedStates);
            setAssignedStates(mappedStates);
          } else {
            console.error('❌ Fallback also failed - no states loaded for super admin!');
          }
        } else {
          setAvailableStates(allStates || []);
          setAssignedStates(allStates || []);
        }
      } else {
        const { data: userStates, error: userStatesError } = await supabase.rpc('get_user_assigned_states', {
          p_username: staffUsername
        });


        if (userStatesError) {
          console.error('❌ Error fetching user states via RPC:', userStatesError);
          // Fallback: fetch from state_xref table directly with CASE-INSENSITIVE match
          // This is critical because username might be "GUY" but database has "Guy"
          const { data: fallbackStates, error: fallbackError } = await supabase
            .from('state_xref')
            .select('state_code, state_name, country_code')
            .ilike('assigned_staff', staffUsername)
            .order('country_code')
            .order('state_code');


          if (!fallbackError && fallbackStates) {
            // Map state_code to state_abbr for consistency
            const mappedStates = fallbackStates.map(s => ({
              state_abbr: s.state_code,
              state_name: s.state_name,
              country_code: s.country_code
            }));
            setAvailableStates(mappedStates);
            setAssignedStates(mappedStates);
          } else {
            console.error('❌ Fallback also failed - no states loaded for regular user!');
          }
        } else {
          setAvailableStates(userStates || []);
          setAssignedStates(userStates || []);
        }
      }
    } catch (error) {
      console.error('❌ Exception fetching states:', error);
    } finally {
      setIsLoadingStates(false);
    }

    // CRITICAL: Return the computed admin status to avoid React state race condition
    return computedIsSuperAdmin;
  };

  // Phone number formatter (kept for potential future data)
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Format as 000-000-0000 (supports partial input for inline editing)
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  // Check if ZIP code indicates "DO NOT SELL"
  const isDoNotSellZip = (zip: string): boolean => {
    return zip === 'xxxxx' || zip === 'XXXXX' || zip?.toLowerCase() === 'xxxxx';
  };

  // Create searchable text by concatenating fields
  // Must include: business_name, website, state, city, google_review(s), email, contact
  const createSearchableText = (entity: EntityResult): string => {
    const googleStr =
      typeof entity.google_review === 'number'
        ? String(entity.google_review)
        : entity.google_review
        ? String(entity.google_review)
        : '';
    return `${entity.business_name} ${entity.website || ''} ${entity.state || ''} ${entity.city || ''} ${googleStr} ${entity.email || ''} ${entity.contact || ''} ${entity.id} ${entity.zip || ''} ${entity.intelligence_status || ''} ${entity.ai_grade || ''}`.toLowerCase();
  };

  // Apply filters and sort results
  const applyFiltersAndSort = (data: EntityResult[]) => {
    let filtered = [...data];

    // NO NEED FOR STATE FILTERING - database already did it via JOIN!
    // Data comes pre-filtered based on user's assigned states

    // Apply other filters
    if (andContains1.trim() || andContains2.trim() || andDoesNotContain.trim() || stateFilter.trim()) {
      filtered = filtered.filter(item => {
        const searchText = createSearchableText(item);

        // Check AND CONTAINS 1
        if (andContains1.trim()) {
          const term1 = andContains1.trim().toLowerCase();
          if (!searchText.includes(term1)) return false;
        }

        // Check AND CONTAINS 2
        if (andContains2.trim()) {
          const term2 = andContains2.trim().toLowerCase();
          if (!searchText.includes(term2)) return false;
        }

        // Check AND DOES NOT CONTAIN
        if (andDoesNotContain.trim()) {
          const excludeTerm = andDoesNotContain.trim().toLowerCase();
          if (searchText.includes(excludeTerm)) return false;
        }

        // Check STATE FILTER
        // CRITICAL: Super admins must see ALL prospects - state filter has NO EFFECT on them
        // For regular users, database already filtered by assigned states, so this is just additional UI filtering
        if (stateFilter.trim() && !isSuperAdmin) {
          const stateFilterTerm = stateFilter.trim().toLowerCase();
          if (!item.state?.toLowerCase().includes(stateFilterTerm)) return false;
        }

        return true;
      });
    }

    // Sort prospects dynamically (Excel-like)
    const getComparable = (val: any, col: SortColumn) => {
      if (col === 'google_review') {
        const n = typeof val === 'number' ? val : val ? Number(val) : 0;
        return isNaN(n) ? 0 : n;
      }
      const s = (val ?? '').toString().toLowerCase();
      return s;
    };

    filtered.sort((a, b) => {
      const va = getComparable((a as any)[sortColumn], sortColumn);
      const vb = getComparable((b as any)[sortColumn], sortColumn);
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Fetch user's assigned states when modal opens, THEN load data
  useEffect(() => {
    if (isOpen && staffUsername) {
      // CRITICAL: Fetch states first to determine isSuperAdmin, THEN load data
      // Pass the returned admin status to loadAllData to avoid React state race condition
      fetchUserAssignedStates().then((confirmedSuperAdmin) => {
        console.log('🔑 fetchUserAssignedStates returned:', confirmedSuperAdmin);
        loadAllData(confirmedSuperAdmin);
      });
    } else {
    }
  }, [isOpen, staffUsername]);

  // No localStorage needed - using fixed widths

  // Auto-filter and sort when inputs or sort change (including state restrictions)
  useEffect(() => {
    if (allProspects.length > 0) {
      handleSearch();
    }
  }, [andContains1, andContains2, andDoesNotContain, stateFilter, sortColumn, sortAsc, assignedStates, isSuperAdmin, allProspects]);

  // CRITICAL: Accept confirmedSuperAdmin parameter to avoid React state race condition
  // The isSuperAdmin state may not be updated yet when this function is called
  const loadAllData = async (confirmedSuperAdmin?: boolean) => {
    setLoading(true);
    setError(null);

    // Use the passed parameter OR fall back to state/context values
    const effectiveSuperAdmin = confirmedSuperAdmin ?? isSuperAdmin ?? isSuperUser ?? isSpecialAdmin ?? false;
    console.log('🔍 loadAllData - confirmedSuperAdmin:', confirmedSuperAdmin, 'effectiveSuperAdmin:', effectiveSuperAdmin);

    try {
      // States are loaded via useEffect - no need to check here
      // The database function handles filtering, not client-side

      // Check cache first - but we need to recalculate stats based on assigned states
      const CACHE_KEY = `prospector_cache_v5_${staffUsername}`; // v5: database-level filtering per user
      const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
      const isLimitedCache = localStorage.getItem(CACHE_KEY + '_limited') === 'true';
      const cachedData = !isLimitedCache ? localStorage.getItem(CACHE_KEY) : null;
      const cacheTimestamp = localStorage.getItem(CACHE_KEY + '_timestamp');

      // Only use cache for non-super-admins or if we have full cache
      if (cachedData && cacheTimestamp && !isLimitedCache) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < CACHE_DURATION) {
          const formattedProspects = JSON.parse(cachedData) as EntityResult[];
          setAllProspects(formattedProspects);
          setFilteredProspects(formattedProspects);
          setDisplayedProspects(formattedProspects.slice(0, ITEMS_PER_PAGE));
          setProspectsPage(1);

          // SECURITY FIX: Recalculate stats from cached data filtered by assigned states
          // We cannot use cached stats because they may have been calculated for a different user

          // Need to get raw data from cache to recalculate
          const cachedRawData = localStorage.getItem(CACHE_KEY + '_raw');
          if (cachedRawData) {
            const rawProspects = JSON.parse(cachedRawData);
            calculateCriticalStats(rawProspects, assignedStates, effectiveSuperAdmin);

            // Calculate screenshot count filtered by assigned states
            let screenshotCount = 0;
            if (effectiveSuperAdmin) {
              screenshotCount = rawProspects.filter((p: any) => p.homepage_screenshot_url && p.homepage_screenshot_url.trim() !== '').length;
            } else {
              const allowedStates = assignedStates.map(s => s.state_abbr.toUpperCase());
              screenshotCount = rawProspects.filter((p: any) =>
                p.homepage_screenshot_url &&
                p.homepage_screenshot_url.trim() !== '' &&
                p.state &&
                allowedStates.includes(p.state.toUpperCase())
              ).length;
            }
            setStatsValidScreenshots(screenshotCount);
          }

          setLoading(false);
          return;
        }
      }

      // SIMPLE FIX: Use database-level filtering with JOIN
      // Super admins get ALL prospects, regular users get ONLY their assigned states
      let prospectsData: any[];
      let prospectsError: any;

      // CRITICAL: Use the effective super admin status (from parameter, not potentially stale state)
      const isUserSuperAdmin = effectiveSuperAdmin;

      if (isUserSuperAdmin) {
        // Super admin: fetch ALL prospects
        const result = await supabase
          .from('prospector')
          .select('*')
          .not('homepage_screenshot_url', 'is', null)
          .neq('homepage_screenshot_url', '')
          .order('website');
        prospectsData = result.data || [];
        prospectsError = result.error;
      } else {
        // Regular user: use database JOIN to get ONLY assigned state prospects
        const result = await supabase.rpc('get_prospects_for_user', {
          p_username: staffUsername
        });
        prospectsData = result.data || [];
        prospectsError = result.error;
      }

      if (prospectsError) {
        console.error('❌ Database query error:', prospectsError);
        console.error('❌ Error message:', prospectsError.message);
        console.error('❌ Error details:', prospectsError.details);
        console.error('❌ Error hint:', prospectsError.hint);
        console.error('❌ Error code:', prospectsError.code);
        throw prospectsError;
      }

      // Calculate stats from filtered data (excluding 0000000000 phone numbers)
      const validPhoneCount = (prospectsData || []).filter(p =>
        p.phone &&
        p.phone.trim() !== '' &&
        p.phone !== '000-000-0000' &&
        p.phone !== '0000000000'
      ).length;

      const placesVerifiedCount = (prospectsData || []).filter(p =>
        p.google_places_id &&
        p.google_places_id.trim() !== '' &&
        p.phone !== '0000000000'
      ).length;

      const screenshotCount = (prospectsData || []).filter(p =>
        p.homepage_screenshot_url &&
        p.homepage_screenshot_url.trim() !== '' &&
        p.phone !== '0000000000'
      ).length;

      setStatsValidPhone(validPhoneCount);
      setStatsGooglePlacesId(placesVerifiedCount);
      setStatsValidScreenshots(screenshotCount);


      // Map single-table rows directly
      const formattedProspects: EntityResult[] = (prospectsData || [])
        .map((row: any) => {
          // Support both google_review (singular, int/float) and legacy google_reviews (plural, often float)
          const grRaw = row.google_review ?? row.google_reviews ?? null;
          const gr =
            typeof grRaw === 'number'
              ? grRaw
              : grRaw
              ? parseFloat(String(grRaw))
              : null;

          // REVERTED: No activity data - activity log join removed to fix the error
          let recentActivity = null;
          let recentActivityDate = null;

          return {
            id: row.website,
            business_name: row.business_name || row.business_nam || row.website,
            status: row.status || null,
            address: '',
            city: row.city || '',
            state: row.state || '',
            zip: row.zip || '',
            email: row.email || '',
            contact: row.contact || '',
            website: row.website,
            phone: row.phone || '',
            google_review: isNaN(gr as any) ? null : (gr as number),
            salesrep: 'Unassigned', // placeholder column as requested
            intelligence_status: row.intelligence_status || null,
            ai_grade: row.ai_grade || null,
            recent_activity: recentActivity,
            recent_activity_date: recentActivityDate
          } as EntityResult;
        });

      // SECURITY FIX: Calculate critical stats filtered by assigned states
      const criticalStats = calculateCriticalStats(prospectsData || [], assignedStates, isUserSuperAdmin);

      // Add screenshot count to stats
      const allStats = {
        ...criticalStats,
        validScreenshots: screenshotCount || 0
      };

      // Cache the results - but handle quota errors gracefully
      try {
        // For super admins with large datasets, skip caching raw data to avoid quota issues
        if (isSuperAdmin && formattedProspects.length > 2000) {
          // Only cache essential data for super admins with large datasets
          localStorage.setItem(CACHE_KEY + '_timestamp', Date.now().toString());
          localStorage.setItem(CACHE_KEY + '_stats', JSON.stringify(allStats));
          // Store a flag that this is a limited cache
          localStorage.setItem(CACHE_KEY + '_limited', 'true');
        } else {
          // Normal caching for regular users or smaller datasets
          localStorage.setItem(CACHE_KEY, JSON.stringify(formattedProspects));
          localStorage.setItem(CACHE_KEY + '_timestamp', Date.now().toString());
          localStorage.setItem(CACHE_KEY + '_raw', JSON.stringify(prospectsData || []));
          localStorage.setItem(CACHE_KEY + '_stats', JSON.stringify(allStats));
          localStorage.removeItem(CACHE_KEY + '_limited'); // Clear limited flag
        }
      } catch (storageError) {
        console.warn('⚠️ Storage quota exceeded or error - continuing without cache:', storageError);
        // Clear old cache entries if quota exceeded
        try {
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_KEY + '_raw');
          localStorage.removeItem(CACHE_KEY + '_timestamp');
          localStorage.removeItem(CACHE_KEY + '_stats');
          localStorage.removeItem(CACHE_KEY + '_limited');
        } catch (clearError) {
          console.warn('Could not clear cache:', clearError);
        }
      }

      setAllProspects(formattedProspects);
      setFilteredProspects(formattedProspects);

      // Initialize displayed items
      const initial = applyFiltersAndSort(formattedProspects);
      setDisplayedProspects(initial.slice(0, ITEMS_PER_PAGE));
      setProspectsPage(1);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setError(null);

    // Apply filters and sort
    const filteredProspectsResult = applyFiltersAndSort(allProspects);

    setFilteredProspects(filteredProspectsResult);

    // Reset pagination and display first page
    setDisplayedProspects(filteredProspectsResult.slice(0, ITEMS_PER_PAGE));
    setProspectsPage(1);
  };

  const handleClearFilters = () => {
    setAndContains1('');
    setAndContains2('');
    setAndDoesNotContain('');
    setStateFilter('');
    setFilteredProspects(allProspects);
    // Reset sort to default (optional)
    setSortColumn('business_name');
    setSortAsc(true);
    const initial = applyFiltersAndSort(allProspects);
    setDisplayedProspects(initial.slice(0, ITEMS_PER_PAGE));
    setProspectsPage(1);
    setError(null);
  };

  // Handle lazy loading on scroll
  const handleProspectsScroll = useCallback(() => {
    if (prospectsScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = prospectsScrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        const nextPage = prospectsPage + 1;
        const startIdx = (nextPage - 1) * ITEMS_PER_PAGE;
        const endIdx = startIdx + ITEMS_PER_PAGE;
        const moreItems = filteredProspects.slice(startIdx, endIdx);

        if (moreItems.length > 0) {
          setDisplayedProspects(prev => [...prev, ...moreItems]);
          setProspectsPage(nextPage);
        }
      }
    }
  }, [prospectsPage, filteredProspects]);

  const handleProspectClick = async (prospect: EntityResult) => {
    // Open the ProspectModal directly when a prospect is clicked
    setSelectedProspectId(prospect.id);
    setShowProspectModal(true);
  };

  // Email validation function
  const isValidEmail = (email: string) => {
    if (!email) return true; // Allow empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEditClick = (prospectId: string, field: 'phone' | 'email' | 'status', currentValue: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProspect(prospectId);
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  // Handle contact notes popup
  const handleContactClick = (prospectId: string, currentValue: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    setContactPopupProspect(prospectId);
    setContactNotes(currentValue || '');
    setShowContactPopup(true);
  };

  const handleSaveContactNotes = async () => {
    if (!contactPopupProspect) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('prospector')
        .update({ contact: contactNotes || null })
        .eq('website', contactPopupProspect);

      if (error) throw error;

      // Update local state
      setAllProspects(prev => prev.map(p =>
        p.id === contactPopupProspect
          ? { ...p, contact: contactNotes || undefined }
          : p
      ));

      setShowContactPopup(false);
      setContactPopupProspect(null);
      setContactNotes('');
    } catch (err) {
      console.error('Error updating contact notes:', err);
      alert('Failed to update contact notes');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseContactPopup = () => {
    setShowContactPopup(false);
    setContactPopupProspect(null);
    setContactNotes('');
  };

  // Status options with colors
  const statusOptions = [
    { value: '', label: '(no status)', color: 'text-gray-400' },
    { value: 'INAPPROPRIATE', label: 'INAPPROPRIATE', color: 'text-red-600' },
    { value: 'REQUEST REMOVE', label: 'REQUEST REMOVE', color: 'text-red-600' },
    { value: 'NOT INTERESTED', label: 'NOT INTERESTED', color: 'text-amber-800' },
    { value: 'LEFT MESSAGE', label: 'LEFT MESSAGE', color: 'text-amber-800' },
    { value: 'CALL BACK', label: 'CALL BACK', color: 'text-blue-600' },
    { value: 'HOT PROSPECT', label: 'HOT PROSPECT', color: 'text-blue-600' },
    { value: 'CONVERTED ACCT', label: 'CONVERTED ACCT', color: 'text-green-600' },
    { value: 'MADE PURCHASE', label: 'MADE PURCHASE', color: 'text-green-600' }
  ];

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'text-gray-400';
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || 'text-gray-600';
  };

  const handleStatusChange = async (prospectWebsite: string, newStatus: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('prospector')
        .update({ status: newStatus || null })
        .eq('website', prospectWebsite);

      if (error) throw error;

      // Update local state
      setAllProspects(prev => prev.map(p =>
        p.website === prospectWebsite
          ? { ...p, status: newStatus || null }
          : p
      ));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneInputChange = (value: string) => {
    setEditValue(formatPhoneNumber(value));
  };

  const handleSaveEdit = async (prospectWebsite: string) => {
    if (!editingField) return;

    // Validate email before saving
    if (editingField === 'email' && editValue && !isValidEmail(editValue)) {
      alert('Please enter a valid email address (e.g., name@example.com)');
      return;
    }

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

  const handleFetchPhone = async (prospect: EntityResult, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!prospect.business_name || !prospect.city || !prospect.state) {
      alert('Missing required information: business name, city, or state');
      return;
    }

    setFetchingPhone(prospect.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-phone-from-places', {
        body: {
          business_name: prospect.business_name,
          city: prospect.city,
          state: prospect.state,
          website: prospect.website
        }
      });

      if (error) {
        console.error('Error fetching phone:', error);
        alert(`Failed to fetch phone: ${error.message}`);
        return;
      }

      if (data?.success && data?.phone_number) {
        // Update local state
        setAllProspects(prev => prev.map(p =>
          p.id === prospect.id
            ? { ...p, phone: data.phone_number }
            : p
        ));

        // Success - no popup needed, phone number updated silently
      } else {
        // No phone number found - update to 0000000000
        setAllProspects(prev => prev.map(p =>
          p.id === prospect.id
            ? { ...p, phone: '0000000000' }
            : p
        ));
      }
    } catch (err) {
      console.error('Error calling fetch-phone function:', err);
      alert('Failed to fetch phone number');
    } finally {
      setFetchingPhone(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(col);
      setSortAsc(true);
    }
  };

  const sortIndicator = (col: SortColumn) => {
    if (sortColumn !== col) return null;
    return (
      <span className="ml-1 text-gray-500">{sortAsc ? '▲' : '▼'}</span>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white shadow-2xl w-full h-full m-2 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-800 px-8 py-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Prospects Search System</h2>
                <p className="text-green-100 text-sm mt-1">Excel-style searchable grid (prospector single-table)</p>
                {/* Display assigned states for current user */}
                {staffUsername && assignedStates.length > 0 && (
                  <div className="mt-2">
                    <p className={`text-sm font-semibold ${isSuperAdmin ? 'text-yellow-200' : 'text-red-200'}`}>
                      {isSuperAdmin ? (
                        `🔓 ${staffUsername.toUpperCase()} - SUPER ADMIN: CAN VIEW/FILTER ALL ${assignedStates.length} STATES`
                      ) : (
                        `${staffUsername.toUpperCase()} IS ASSIGNED THE FOLLOWING STATES: ${assignedStates.map(s => s.state_abbr).join(', ')}`
                      )}
                    </p>
                  </div>
                )}
                {isLoadingStates && (
                  <div className="mt-2">
                    <p className="text-green-200 text-sm">Loading state assignments...</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Critical Stats */}
                <div className="bg-emerald-500/30 border-2 border-emerald-300 px-3 py-1.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <div className="text-emerald-100 text-xs font-medium">Valid Phones</div>
                      <div className="text-white font-bold text-lg leading-tight">{statsValidPhone.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-500/30 border-2 border-cyan-300 px-3 py-1.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <div className="text-cyan-100 text-xs font-medium">Places Verified</div>
                      <div className="text-white font-bold text-lg leading-tight">{statsGooglePlacesId.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-500/30 border-2 border-purple-300 px-3 py-1.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="text-purple-100 text-xs font-medium">Valid Screenshots</div>
                      <div className="text-white font-bold text-lg leading-tight">{statsValidScreenshots.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <span className="bg-white/20 px-4 py-2 rounded-full text-white font-bold text-lg">
                  {filteredProspects.length.toLocaleString()} found
                </span>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                  title="Close"
                >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          </div>

          {/* Search Controls */}
          <div className="px-4 py-3 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
            <div className="mx-auto">
              <div className="flex items-end gap-3">
                {/* Primary Search */}
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">
                    Primary Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={andContains1}
                      onChange={(e) => setAndContains1(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all placeholder-gray-400"
                      placeholder="Search name, website, state, city, google reviews, email, contact, sales rep..."
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* AND CONTAINS 2 */}
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">
                    Additional Filter
                  </label>
                  <input
                    type="text"
                    value={andContains2}
                    onChange={(e) => setAndContains2(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all placeholder-gray-400"
                    placeholder="AND contains..."
                  />
                </div>

                {/* AND DOES NOT CONTAIN */}
                <div className="flex-1">
                  <label className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1 block">
                    Exclude Terms
                  </label>
                  <input
                    type="text"
                    value={andDoesNotContain}
                    onChange={(e) => setAndDoesNotContain(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 bg-white border-2 border-red-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all placeholder-red-400"
                    placeholder="Does NOT contain..."
                  />
                </div>

                {/* State Filter - Dynamic Dropdown */}
                <div className="w-32">
                  <label className={`text-xs font-semibold uppercase tracking-wider mb-1 block ${isSuperAdmin ? 'text-yellow-600' : 'text-gray-600'}`}>
                    State {isSuperAdmin && '(Disabled)'}
                  </label>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className={`w-full px-3 py-2 border-2 rounded-lg shadow-sm transition-all text-center ${
                      isSuperAdmin
                        ? 'bg-gray-100 border-gray-400 text-gray-500 cursor-not-allowed'
                        : 'bg-white border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                    }`}
                    disabled={isLoadingStates || isSuperAdmin}
                    title={isSuperAdmin ? 'Super admins can see ALL states - filter is disabled' : ''}
                  >
                    <option value="">All States</option>
                    {availableStates.map((state) => (
                      <option key={`${state.country_code}-${state.state_abbr}`} value={state.state_abbr}>
                        {state.state_abbr} - {state.state_name}
                      </option>
                    ))}
                  </select>
                  {availableStates.length === 0 && !isLoadingStates && (
                    <p className="text-xs text-red-500 mt-1">No states {isSuperAdmin ? 'available' : 'assigned'}</p>
                  )}
                  {isSuperAdmin && availableStates.length > 0 && (
                    <p className="text-xs text-yellow-600 mt-1 font-semibold">Filter disabled - viewing all {availableStates.length} states</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </span>
                    ) : 'SEARCH'}
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg shadow transition-all"
                  >
                    CLEAR
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Excel-like Grid */}
          <div className="flex-1 overflow-hidden bg-gray-50">
            <div className="h-full p-2">
              <div className="h-full" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
                <div className="flex flex-col bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden h-full">
                  <div
                    ref={prospectsScrollRef}
                    onScroll={handleProspectsScroll}
                    className="flex-1"
                    style={{ overflow: 'auto' }}
                  >
                    {loading ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <svg className="animate-spin h-16 w-16 text-green-600 mx-auto mb-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <p className="text-2xl font-semibold text-gray-700">Loading...</p>
                          <p className="text-sm text-gray-500 mt-2">Please wait while we load prospects</p>
                        </div>
                      </div>
                    ) : displayedProspects.length > 0 ? (
                      <>
                        <table className="border-collapse border border-gray-300" style={{ tableLayout: 'fixed', width: '1500px' }}>
                          <thead className="sticky top-0 z-20 bg-gray-100">
                            <tr>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                                style={{ width: `${columnWidths.business_name}px` }}
                                onClick={() => handleSort('business_name')}
                              >
                                Business Name {sortIndicator('business_name')}
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                                style={{ width: `${columnWidths.status}px` }}
                                onClick={() => handleSort('status')}
                              >
                                Status {sortIndicator('status')}
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700"
                                style={{ width: `${columnWidths.intel}px` }}
                              >
                                Intel
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                                style={{ width: `${columnWidths.website}px` }}
                                onClick={() => handleSort('website')}
                              >
                                Website {sortIndicator('website')}
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                                style={{ width: `${columnWidths.state}px` }}
                                onClick={() => handleSort('state')}
                              >
                                State {sortIndicator('state')}
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                                style={{ width: `${columnWidths.city}px` }}
                                onClick={() => handleSort('city')}
                              >
                                City {sortIndicator('city')}
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                                style={{ width: `${columnWidths.phone}px` }}
                                onClick={() => handleSort('phone')}
                              >
                                Phone {sortIndicator('phone')}
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-right text-sm font-semibold text-gray-700 cursor-pointer"
                                style={{ width: `${columnWidths.google_review}px` }}
                                onClick={() => handleSort('google_review')}
                              >
                                Google Reviews {sortIndicator('google_review')}
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                                style={{ width: `${columnWidths.email}px` }}
                                onClick={() => handleSort('email')}
                              >
                                Email {sortIndicator('email')}
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                                style={{ width: `${columnWidths.contact}px` }}
                                onClick={() => handleSort('contact')}
                              >
                                Contact {sortIndicator('contact')}
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700"
                                style={{ width: `${columnWidths.address}px` }}
                              >
                                Address
                              </th>
                              <th
                                className="px-3 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-700"
                                style={{ width: `${columnWidths.zip}px` }}
                              >
                                ZIP
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedProspects.map((prospect, rowIndex) => {
                              const isDoNotSell = isDoNotSellZip(prospect.zip);
                              return (
                                <tr
                                  key={prospect.id}
                                  className={`${isDoNotSell ? 'bg-yellow-50' : 'bg-white'} hover:bg-green-50 transition-colors`}
                                >
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top cursor-pointer overflow-hidden"
                                    style={{ width: `${columnWidths.business_name}px` }}
                                    onClick={() => handleProspectClick(prospect)}
                                  >
                                    <span className="text-blue-600 underline font-semibold truncate block" style={{ fontSize: '0.75rem' }}>
                                      {prospect.business_name}
                                    </span>
                                  </td>
                                  <td
                                    className="px-1 py-0.5 border border-gray-300 align-top"
                                    style={{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <select
                                      value={prospect.status || ''}
                                      onChange={(e) => handleStatusChange(prospect.website || '', e.target.value)}
                                      disabled={saving}
                                      className={`w-full px-1 py-1 border border-gray-300 rounded text-xs ${getStatusColor(prospect.status)} font-semibold bg-white cursor-pointer`}
                                      style={{ minWidth: '150px' }}
                                    >
                                      {statusOptions.map((option) => (
                                        <option
                                          key={option.value}
                                          value={option.value}
                                          className={option.color}
                                        >
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top text-xs overflow-hidden"
                                    style={{ width: `${columnWidths.intel}px` }}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      <span
                                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                                          prospect.intelligence_status === 'complete' ? 'bg-green-600' :
                                          prospect.intelligence_status === 'error' ? 'bg-red-600' :
                                          prospect.intelligence_status === 'researching' || prospect.intelligence_status === 'generating' ? 'bg-amber-500 animate-pulse' :
                                          'bg-gray-400'
                                        }`}
                                        title={`Status: ${prospect.intelligence_status || 'idle'}`}
                                      />
                                      <span className={`font-semibold ${
                                        prospect.ai_grade === 'A' ? 'text-green-700' :
                                        prospect.ai_grade === 'B' ? 'text-blue-700' :
                                        prospect.ai_grade === 'C' ? 'text-amber-700' : 'text-red-700'
                                      }`}>
                                        {prospect.ai_grade || ''}
                                      </span>
                                    </span>
                                  </td>
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top text-xs text-gray-700 overflow-hidden"
                                    style={{ width: `${columnWidths.website}px` }}
                                  >
                                    <span className="truncate block">{prospect.website}</span>
                                  </td>
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top text-xs text-gray-700 overflow-hidden"
                                    style={{ width: `${columnWidths.state}px` }}
                                  >
                                    {prospect.state}
                                  </td>
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top text-xs text-gray-700 overflow-hidden"
                                    style={{ width: `${columnWidths.city}px` }}
                                  >
                                    <span className="truncate block">{prospect.city}</span>
                                  </td>
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top text-xs text-gray-700 overflow-hidden"
                                    style={{ width: `${columnWidths.phone}px` }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {editingProspect === prospect.id && editingField === 'phone' ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={editValue}
                                          onChange={(e) => handlePhoneInputChange(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit(prospect.website || '');
                                            if (e.key === 'Escape') handleCancelEdit();
                                          }}
                                          className="w-full px-1 py-0.5 border border-blue-500 rounded text-sm"
                                          placeholder="000-000-0000"
                                          autoFocus
                                          disabled={saving}
                                          maxLength={12}
                                        />
                                        <button onClick={() => handleSaveEdit(prospect.website || '')} className="text-green-600 hover:text-green-800 text-xs" disabled={saving}>✓</button>
                                        <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-800 text-xs" disabled={saving}>✕</button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        {(!prospect.phone || prospect.phone.trim() === '' || prospect.phone === '000-000-0000') ? (
                                          <button
                                            onClick={(e) => handleFetchPhone(prospect, e)}
                                            disabled={fetchingPhone === prospect.id}
                                            className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                                              fetchingPhone === prospect.id
                                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                            title="Fetch phone number from Google Places"
                                          >
                                            {fetchingPhone === prospect.id ? (
                                              <span className="flex items-center gap-1">
                                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Fetching
                                              </span>
                                            ) : (
                                              'Fetch Phone Number'
                                            )}
                                          </button>
                                        ) : (
                                          <span
                                            className="cursor-pointer hover:bg-yellow-100 px-1 rounded block text-gray-800"
                                            onClick={(e) => handleEditClick(prospect.id, 'phone', prospect.phone, e)}
                                          >
                                            {prospect.phone}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top text-right text-sm text-gray-800 overflow-hidden"
                                    style={{ width: `${columnWidths.google_review}px` }}
                                  >
                                    {typeof prospect.google_review === 'number' ? prospect.google_review : ''}
                                  </td>
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top text-xs text-gray-700 overflow-hidden"
                                    style={{ width: `${columnWidths.email}px` }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {editingProspect === prospect.id && editingField === 'email' ? (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="email"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveEdit(prospect.website || '');
                                              if (e.key === 'Escape') handleCancelEdit();
                                            }}
                                            className={`w-full px-1 py-0.5 border rounded text-sm ${
                                              editValue && !isValidEmail(editValue)
                                                ? 'border-red-500 bg-red-50'
                                                : 'border-blue-500'
                                            }`}
                                            placeholder="name@example.com"
                                            autoFocus
                                            disabled={saving}
                                          />
                                          <button onClick={() => handleSaveEdit(prospect.website || '')} className="text-green-600 hover:text-green-800 text-xs" disabled={saving}>✓</button>
                                          <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-800 text-xs" disabled={saving}>✕</button>
                                        </div>
                                        {editValue && !isValidEmail(editValue) && (
                                          <span className="text-xs text-red-600">Invalid email format</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span
                                        className="cursor-pointer hover:bg-yellow-100 px-1 rounded block text-gray-800 truncate"
                                        onClick={(e) => handleEditClick(prospect.id, 'email', prospect.email, e)}
                                      >
                                        {prospect.email || '(click to add)'}
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top text-sm overflow-hidden"
                                    style={{ width: `${columnWidths.contact}px` }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div
                                      className={`cursor-pointer hover:bg-yellow-100 px-2 py-1 rounded block text-xs truncate ${prospect.contact && prospect.contact.trim() !== '' ? 'bg-red-100 text-red-900 font-semibold' : 'text-gray-500'}`}
                                      onClick={(e) => handleContactClick(prospect.id, prospect.contact, e)}
                                      title={prospect.contact || 'Click to add notes'}
                                    >
                                      {prospect.contact && prospect.contact.trim() !== '' ? 'NOTES' : '(add notes)'}
                                    </div>
                                  </td>
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top text-xs text-gray-700 overflow-hidden"
                                    style={{ width: `${columnWidths.address}px` }}
                                  >
                                    <span className="truncate block">{prospect.address || ''}</span>
                                  </td>
                                  <td
                                    className="px-3 py-0.5 border border-gray-300 align-top text-xs text-gray-700 overflow-hidden"
                                    style={{ width: `${columnWidths.zip}px` }}
                                  >
                                    <span className={`${isDoNotSell ? 'text-red-600 font-bold' : ''}`}>{prospect.zip}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {displayedProspects.length < filteredProspects.length && (
                          <div className="text-center py-3 text-sm text-gray-500">
                            Loading more... ({displayedProspects.length} of {filteredProspects.length})
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20a3 3 0 01-3-3v-2a3 3 0 013-3h10a3 3 0 013 3v2a3 3 0 01-3 3" />
                          </svg>
                          <p className="text-lg font-medium">No prospects found</p>
                          <p className="text-sm mt-1">Try adjusting your search criteria</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gradient-to-b from-gray-100 to-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <strong className="text-gray-800">Tip:</strong> Click on a <span className="text-green-700 font-semibold">Business Name</span> to open the details modal.
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-500">
                  Total Prospects: {filteredProspects.length}
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prospect Modal */}
      {showProspectModal && (
        <ProspectorModal
          isOpen={showProspectModal}
          onClose={() => {
            setShowProspectModal(false);
            setSelectedProspectId(undefined);
            loadAllData(); // Reload data after closing to reflect any changes
          }}
          website={selectedProspectId}
        />
      )}

      {/* Contact Notes Popup */}
      {showContactPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={handleCloseContactPopup}>
          <div
            className="bg-white rounded-lg shadow-2xl border-2 border-blue-500"
            style={{ width: '300px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-600 px-4 py-2 rounded-t-lg flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Contact Notes</h3>
              <button
                onClick={handleCloseContactPopup}
                className="text-white hover:text-gray-200 text-xl font-bold leading-none"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
                rows={8}
                placeholder="Enter contact notes..."
                autoFocus
                disabled={saving}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveContactNotes}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded transition-all"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCloseContactPopup}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold rounded transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProspectsSearchModal;
