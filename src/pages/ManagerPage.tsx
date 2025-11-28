import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PromoCodeManager from '../components/PromoCodeManager';
import S3ImageCacheTab from '../components/admin/S3ImageCacheTab';
import MetricsTab from '../components/admin/MetricsTab';
import { SecurityLevel, PermissionScope, SecurityLevelName } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProductMember {
  [key: string]: any; // Dynamic interface for all columns
}

interface StaffMember {
  username: string;
  user_full_name: string;
  security_level: string;
  password_hash: string;
  settings: any;
  created_at?: string;
  updated_at?: string;
}

interface EditableCell {
  id: string;
  field: string;
  value: string;
}

interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

interface UserPreferences {
  column_order: string[];
  column_widths: { [key: string]: number };
  hidden_columns: string[];
  sort_config: {
    sortField: string | null;
    sortDirection: 'asc' | 'desc';
  };
}

type TabType = 'products' | 'placeholder1' | 'systems-settings' | 'metrics' | 'state-assignments';
type SortDirection = 'asc' | 'desc';

// Color palette for salesperson assignments
const SALESPERSON_COLOR_PALETTE = [
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800', name: 'Teal' },
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', name: 'Blue' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', name: 'Purple' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800', name: 'Pink' },
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', name: 'Orange' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-800', name: 'Emerald' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-800', name: 'Cyan' },
  { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800', name: 'Indigo' },
  { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-800', name: 'Rose' },
  { bg: 'bg-lime-100', border: 'border-lime-400', text: 'text-lime-800', name: 'Lime' },
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-800', name: 'Amber' },
  { bg: 'bg-violet-100', border: 'border-violet-400', text: 'text-violet-800', name: 'Violet' },
];

// Function to get consistent color for a salesperson based on their name
const getSalespersonColor = (salespersonName: string | null) => {
  if (!salespersonName || salespersonName === 'Unassigned') {
    return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', name: 'Gray' };
  }
  // Generate consistent index based on salesperson name
  const index = salespersonName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % SALESPERSON_COLOR_PALETTE.length;
  return SALESPERSON_COLOR_PALETTE[index];
};

// Draggable column header component
const DraggableColumnHeader: React.FC<{
  id: string;
  children: React.ReactNode;
  width: number;
  onSort?: () => void;
  sortDirection?: SortDirection | null;
  isActive?: boolean;
}> = ({ id, children, width, onSort, sortDirection, isActive }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: width || 120,
    minWidth: width || 120,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="border border-gray-300 px-1 py-0.5 text-center text-xs font-medium text-red-700 uppercase tracking-wider relative cursor-pointer select-none"
      onClick={onSort}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center justify-center">
          {children}
          {sortDirection && (
            <span className="ml-1 text-xs">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
        <div
          {...attributes}
          {...listeners}
          className="w-3 h-3 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-red-200 rounded opacity-50 hover:opacity-100"
          title="Drag to reorder column"
        >
          ⋮⋮
        </div>
      </div>
    </th>
  );
};

const ManagerPage: React.FC = () => {
  const { user, isSuperUser, closeProspectsModal, openPurchaseOrderModal } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('systems-settings');
  const [productData, setProductData] = useState<ProductMember[]>([]);
  const [filteredProductData, setFilteredProductData] = useState<ProductMember[]>([]);
  const [sortedProductData, setSortedProductData] = useState<ProductMember[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filteredColumns, setFilteredColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'saving' | 'saved' | 'error' }>({});
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductMember | null>(null);
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageExtensionIndex, setImageExtensionIndex] = useState(0);
  const [foundImageUrl, setFoundImageUrl] = useState<string | null>(null);
  const [checkingImage, setCheckingImage] = useState(false);
  const [partNumberFilter, setPartNumberFilter] = useState('');
  const [descriptionFilter1, setDescriptionFilter1] = useState('');
  const [descriptionFilter2, setDescriptionFilter2] = useState('');
  const [descriptionFilterNot, setDescriptionFilterNot] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editModeTimer, setEditModeTimer] = useState<number>(300); // 5 minutes in seconds
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Phone encoding state
  const [isEncodingPhones, setIsEncodingPhones] = useState(false);
  const [showEncodingModal, setShowEncodingModal] = useState(false);
  const [phoneTestMode, setPhoneTestMode] = useState(false);
  const [concurrentRequests, setConcurrentRequests] = useState(10); // Number of parallel requests
  const [encodingProgress, setEncodingProgress] = useState({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    currentRecord: '',
    errors: [] as Array<{ business_name: string; error: string }>
  });

  // Long description editing state
  const [editedLongDescription, setEditedLongDescription] = useState<string>('');
  const [longDescSaveStatus, setLongDescSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Function to update product edit state in Supabase
  const updateProductEditState = useCallback(async (isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('product_edit_state')
        .update({ active_edits: isActive })
        .or('active_edits.eq.true,active_edits.eq.false') // WHERE 1=1 equivalent: match all rows
        .select();

      if (error) {
        console.error('❌ Failed to update product_edit_state:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
      } else {
      }
    } catch (err) {
      console.error('💥 Exception updating product_edit_state:', err);
    }
  }, []);

  // Close any open ProspectsModal when ManagerPage loads
  // This prevents obsolete modal from showing for staff users
  useEffect(() => {
    closeProspectsModal();
  }, [closeProspectsModal]);

  // Initialize: Set ACTIVE_EDITS to FALSE on component mount
  // This ensures we start clean and recover from any stale locks
  useEffect(() => {
    updateProductEditState(false);

    // Immediately disable edit mode to match the database state
    setEditMode(false);
  }, [updateProductEditState]);

  // REMOVED: Duplicate handler - using the CRITICAL one below at line ~1599

  // Heartbeat: Periodically confirm edit state while edit mode is active
  useEffect(() => {
    if (!editMode) return; // Only run when edit mode is active


    const heartbeatInterval = setInterval(() => {
      updateProductEditState(true);
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [editMode, updateProductEditState]);

  // 5-minute countdown timer for edit mode
  useEffect(() => {
    if (editMode) {
      // Reset timer to 5 minutes when entering edit mode
      setEditModeTimer(300);

      // Start countdown
      const interval = setInterval(() => {
        setEditModeTimer((prev) => {
          if (prev <= 1) {
            // Timer reached zero - auto-disable edit mode
            setEditMode(false);
            return 300; // Reset for next time
          }
          return prev - 1;
        });
      }, 1000); // Update every second

      setTimerInterval(interval);

      return () => {
        clearInterval(interval);
        setTimerInterval(null);
      };
    } else {
      // Clear interval when edit mode is disabled
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      // Reset timer when exiting edit mode
      setEditModeTimer(300);
    }
  }, [editMode]);

  // Handle browser close/refresh: Set ACTIVE_EDITS to FALSE
  useEffect(() => {
    const handleBeforeUnload = () => {

      // Fire-and-forget: Start the update but don't wait for it
      // This is best-effort since browser may kill the page before completion
      supabase
        .from('product_edit_state')
        .update({ active_edits: false })
        .or('active_edits.eq.true,active_edits.eq.false')
        .then(undefined, (err: any) => console.error('❌ Cleanup on beforeunload failed:', err));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Staff management state
  const [staffData, setStaffData] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffEditingCell, setStaffEditingCell] = useState<EditableCell | null>(null);
  const [staffSelectedCell, setStaffSelectedCell] = useState<CellPosition | null>(null);
  const [staffIsEditing, setStaffIsEditing] = useState(false);
  const [staffEditMode, setStaffEditMode] = useState(false);
  const [staffSaveStatus, setStaffSaveStatus] = useState<{ [key: string]: 'saving' | 'saved' | 'error' }>({});
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [newStaffData, setNewStaffData] = useState({
    username: '',
    user_full_name: '',
    security_level: 'user',
    password: '',
    confirmPassword: ''
  });
  const [addStaffLoading, setAddStaffLoading] = useState(false);
  const [addStaffErrors, setAddStaffErrors] = useState<{ [key: string]: string }>({});

  // Territory management state - moved to top level to fix hooks order
  const [territories, setTerritories] = useState<Map<string, any>>(new Map());
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [territoryLoading, setTerritoryLoading] = useState(true);
  const [territorySaving, setTerritorySaving] = useState(false);
  const [territoryMessage, setTerritoryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [territorySalespeople, setTerritorySalespeople] = useState<any[]>([]);
  const [filterSalesperson, setFilterSalesperson] = useState<string | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [territorySortColumn, setTerritorySortColumn] = useState<'state' | 'prospects'>('state');
  const [territorySortDirection, setTerritorySortDirection] = useState<'asc' | 'desc'>('asc');

  // Security permissions management state
  const [securityLevelsData, setSecurityLevelsData] = useState<SecurityLevel[]>([]);
  const [securityLevelsLoading, setSecurityLevelsLoading] = useState(false);
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<SecurityLevel | null>(null);
  const [newPermissionData, setNewPermissionData] = useState({
    security_level: 'user' as SecurityLevelName,
    section: '',
    scope: 'read-only' as PermissionScope
  });
  const [addPermissionLoading, setAddPermissionLoading] = useState(false);
  const [addPermissionErrors, setAddPermissionErrors] = useState<{ [key: string]: string }>({});
  const [permissionSaveStatus, setPermissionSaveStatus] = useState<{ [key: string]: 'saving' | 'saved' | 'error' }>({});

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Debounce timer for auto-save
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [preferencesTimer, setPreferencesTimer] = useState<NodeJS.Timeout | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Default column mapping with ordinal, field name, and display name
  const defaultColumnMapping = [
    { ordinal: 1, fieldName: 'partnumber', displayName: 'Part Number' },
    { ordinal: 2, fieldName: 'description', displayName: 'Short Description' },
    { ordinal: 3, fieldName: 'price', displayName: 'Price' },
    { ordinal: 4, fieldName: 'master_carton_price', displayName: 'M/C Price' },
    { ordinal: 5, fieldName: 'master_carton_qty', displayName: 'M/C QTY' },
    { ordinal: 6, fieldName: 'listprice', displayName: 'MSRP' },
    { ordinal: 7, fieldName: 'map', displayName: 'MAP' },
    { ordinal: 8, fieldName: 'upc', displayName: 'UPC' },
    { ordinal: 9, fieldName: 'category', displayName: 'Category' },
    { ordinal: 10, fieldName: 'brand', displayName: 'Brand' },
    { ordinal: 11, fieldName: 'image', displayName: 'Image File' },
    { ordinal: 12, fieldName: 'weblongdescr', displayName: 'WEBLONGDESCR' },
    { ordinal: 13, fieldName: 'inv_max', displayName: 'MAX INV' },
    { ordinal: 14, fieldName: 'inv_min', displayName: 'MIN INV' },
    { ordinal: 15, fieldName: 'date_created', displayName: 'Created' },
    { ordinal: 16, fieldName: 'date_edited', displayName: 'Edited' },
    { ordinal: 17, fieldName: 'vendor', displayName: 'Vendor' },
    { ordinal: 18, fieldName: 'vendor_part_number', displayName: 'Vendor Part' }
  ];

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'metrics', label: 'Metrics', icon: '📊' },
    { id: 'placeholder1', label: 'Promo Codes', icon: '🎟️' },
    { id: 'systems-settings', label: 'Systems Settings', icon: '⚙️' },
    { id: 'state-assignments', label: 'State Assignments', icon: '🗺️' },
  ];

  // Available sections for permissions
  const availableSections = [
    'manager/products',
    'manager/promo_codes',
    'manager/staff',
    'manager/security',
    'dashboard',
    'orders',
    'admin/all'
  ];

  const availableScopes: PermissionScope[] = ['read-only', 'create', 'update', 'delete', 'all', 'none'];
  const availableSecurityLevels: SecurityLevelName[] = ['user', 'manager', 'admin', 'super_admin'];

  // Save user preferences to database
  const saveUserPreferences = useCallback(async (preferences: UserPreferences) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_column_preferences')
        .upsert({
          user_id: user.id,
          page_name: 'manager_products',
          column_order: preferences.column_order,
          column_widths: preferences.column_widths,
          hidden_columns: preferences.hidden_columns,
          sort_config: preferences.sort_config,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving user preferences:', error);
      } else {
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
    }
  }, [user]);

  // Load user preferences from database
  const loadUserPreferences = useCallback(async (): Promise<UserPreferences | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_column_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('page_name', 'manager_products')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user preferences:', error);
        return null;
      }

      if (data) {
        return {
          column_order: data.column_order || [],
          column_widths: data.column_widths || {},
          hidden_columns: data.hidden_columns || [],
          sort_config: data.sort_config || { sortField: null, sortDirection: 'asc' }
        };
      }

      return null;
    } catch (err) {
      console.error('Error loading preferences:', err);
      return null;
    }
  }, [user]);

  // Debounced save preferences
  const debouncedSavePreferences = useCallback(() => {
    if (preferencesTimer) {
      clearTimeout(preferencesTimer);
    }

    const timer = setTimeout(() => {
      const preferences: UserPreferences = {
        column_order: filteredColumns,
        column_widths: columnWidths,
        hidden_columns: [],
        sort_config: {
          sortField,
          sortDirection
        }
      };
      saveUserPreferences(preferences);
    }, 1000);

    setPreferencesTimer(timer);
  }, [filteredColumns, columnWidths, sortField, sortDirection, saveUserPreferences, preferencesTimer]);

  // Reset to default column order
  const resetToDefault = useCallback(() => {
    if (!columns.length) return;

    const defaultOrder = defaultColumnMapping
      .filter(mapping => columns.includes(mapping.fieldName))
      .sort((a, b) => a.ordinal - b.ordinal)
      .map(mapping => mapping.fieldName);

    const defaultWidths: { [key: string]: number } = {};
    defaultOrder.forEach(col => {
      defaultWidths[col] = 120;
    });

    setFilteredColumns(defaultOrder);
    setColumnWidths(defaultWidths);
    setSortField(null);
    setSortDirection('asc');

    // Save the reset preferences
    const preferences: UserPreferences = {
      column_order: defaultOrder,
      column_widths: defaultWidths,
      hidden_columns: [],
      sort_config: {
        sortField: null,
        sortDirection: 'asc'
      }
    };
    saveUserPreferences(preferences);
  }, [columns, saveUserPreferences]);

  // Handle column drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredColumns.indexOf(active.id as string);
      const newIndex = filteredColumns.indexOf(over.id as string);

      const newOrder = arrayMove(filteredColumns, oldIndex, newIndex);
      setFilteredColumns(newOrder);
      debouncedSavePreferences();
    }
  };

  // Handle column sorting
  const handleColumnSort = useCallback((fieldName: string) => {
    if (sortField === fieldName) {
      // Toggle sort direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(fieldName);
      setSortDirection('asc');
    }
    debouncedSavePreferences();
  }, [sortField, sortDirection, debouncedSavePreferences]);

  // Hash password function (simple bcrypt-style hashing simulation)
  const hashPassword = async (password: string): Promise<string> => {
    // In a real implementation, you'd use a proper bcrypt library
    // For now, we'll simulate with a simple hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'music_supplies_salt_2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return '$2a$12$' + hashHex.substring(0, 53); // Format similar to bcrypt
  };

  // Open staff modal for editing
  const openEditStaffModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setNewStaffData({
      username: staff.username,
      user_full_name: staff.user_full_name,
      security_level: staff.security_level,
      password: '',
      confirmPassword: ''
    });
    setAddStaffErrors({});
    setShowAddStaffModal(true);
  };

  // Open staff modal for adding
  const openAddStaffModal = () => {
    setEditingStaff(null);
    setNewStaffData({
      username: '',
      user_full_name: '',
      security_level: 'user',
      password: '',
      confirmPassword: ''
    });
    setAddStaffErrors({});
    setShowAddStaffModal(true);
  };

  // Close staff modal
  const closeStaffModal = () => {
    setShowAddStaffModal(false);
    setEditingStaff(null);
    setNewStaffData({
      username: '',
      user_full_name: '',
      security_level: 'user',
      password: '',
      confirmPassword: ''
    });
    setAddStaffErrors({});
  };

  // Validate staff form (for both add and edit)
  const validateStaffForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Username validation (only for new staff)
    if (!editingStaff) {
      if (!newStaffData.username.trim()) {
        errors.username = 'Username is required';
      } else if (newStaffData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(newStaffData.username)) {
        errors.username = 'Username can only contain letters, numbers, and underscores';
      } else if (staffData.some(staff => staff.username.toLowerCase() === newStaffData.username.toLowerCase())) {
        errors.username = 'Username already exists';
      }
    }

    // Full name validation
    if (!newStaffData.user_full_name.trim()) {
      errors.user_full_name = 'Full name is required';
    } else if (newStaffData.user_full_name.length < 2) {
      errors.user_full_name = 'Full name must be at least 2 characters';
    }

    // Password validation (only required for new staff or if changing password)
    if (!editingStaff || newStaffData.password) {
      if (!newStaffData.password) {
        errors.password = editingStaff ? 'Enter new password or leave blank to keep current' : 'Password is required';
      } else if (newStaffData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }

      // Confirm password validation (only if password is provided)
      if (newStaffData.password) {
        if (!newStaffData.confirmPassword) {
          errors.confirmPassword = 'Please confirm password';
        } else if (newStaffData.password !== newStaffData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    setAddStaffErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save staff member (add or update)
  const saveStaff = async () => {
    if (!validateStaffForm()) return;

    try {
      setAddStaffLoading(true);
      
      if (editingStaff) {
        // Update existing staff member

        const updateData: any = {
          user_full_name: newStaffData.user_full_name,
          security_level: newStaffData.security_level,
        };

        // Only update password if a new one is provided
        if (newStaffData.password) {
          const hashedPassword = await hashPassword(newStaffData.password);
          updateData.password_hash = hashedPassword;
        }

        const { error } = await supabase
          .from('staff_management')
          .update(updateData)
          .eq('username', editingStaff.username);

        if (error) {
          console.error('Error updating staff member:', error);
          setError(`Error updating staff member: ${error.message}`);
          return;
        }


        // Update local data
        setStaffData(prev => prev.map(staff => 
          staff.username === editingStaff.username 
            ? { ...staff, ...updateData }
            : staff
        ));

      } else {
        // Add new staff member

        // Hash the password
        const hashedPassword = await hashPassword(newStaffData.password);

        const staffMember = {
          username: newStaffData.username.toLowerCase(),
          user_full_name: newStaffData.user_full_name,
          security_level: newStaffData.security_level,
          password_hash: hashedPassword,
          settings: {}
        };

        const { data, error } = await supabase
          .from('staff_management')
          .insert([staffMember])
          .select();

        if (error) {
          console.error('Error adding staff member:', error);
          setError(`Error adding staff member: ${error.message}`);
          return;
        }


        // Update local data
        if (data && data[0]) {
          setStaffData(prev => [data[0], ...prev]);
        }
      }

      // Close modal
      closeStaffModal();

    } catch (err) {
      console.error('Error saving staff member:', err);
      setError(err instanceof Error ? err.message : 'Failed to save staff member');
    } finally {
      setAddStaffLoading(false);
    }
  };

  // Delete staff member
  const deleteStaff = async (username: string) => {
    try {

      const { error } = await supabase
        .from('staff_management')
        .delete()
        .eq('username', username);

      if (error) {
        console.error('Error deleting staff member:', error);
        setError(`Error deleting staff member: ${error.message}`);
        return;
      }


      // Update local data
      setStaffData(prev => prev.filter(staff => staff.username !== username));

    } catch (err) {
      console.error('Error deleting staff member:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete staff member');
    }
  };

  // Reset staff member password to "password"
  const resetStaffPassword = async (username: string, fullName: string) => {
    try {

      // Hash the default password "password"
      const hashedPassword = await hashPassword('password');

      const { error } = await supabase
        .from('staff_management')
        .update({ password_hash: hashedPassword })
        .eq('username', username);

      if (error) {
        console.error('Error resetting staff password:', error);
        setError(`Error resetting password: ${error.message}`);
        return;
      }

      alert(`Password reset successfully for ${fullName} (${username}).\n\nNew password: "password"\n\nThe user can now log in and change their password.`);

    } catch (err) {
      console.error('Error resetting staff password:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset staff password');
    }
  };

  // Sort the product data
  const sortProductData = useCallback((data: ProductMember[]) => {
    if (!sortField) return data;

    const sorted = [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Convert to strings for comparison if not already
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      // For numeric fields, try parsing as numbers
      const numericFields = ['price', 'listprice', 'map', 'master_carton_price', 'master_carton_qty', 'inv_max', 'inv_min', 'inventory'];
      if (numericFields.includes(sortField)) {
        const aNum = parseFloat(aStr) || 0;
        const bNum = parseFloat(bStr) || 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [sortField, sortDirection]);

  // Fetch staff data from staff_management table
  const fetchStaffData = useCallback(async () => {
    try {
      setStaffLoading(true);

      const { data, error } = await supabase
        .from('staff_management')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching staff data:', error);
        setError(`Error loading staff data: ${error.message}`);
        return;
      }

      setStaffData(data || []);
    } catch (err) {
      console.error('Error loading staff data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch staff data');
    } finally {
      setStaffLoading(false);
    }
  }, []);

  // Auto-save function for staff data
  const autoSaveStaff = useCallback(async (username: string, field: string, value: string) => {
    const key = `${username}-${field}`;
    setStaffSaveStatus(prev => ({ ...prev, [key]: 'saving' }));

    try {
      const updateData: any = {};
      updateData[field] = value;

      const { error } = await supabase
        .from('staff_management')
        .update(updateData)
        .eq('username', username);

      if (error) throw error;

      setStaffSaveStatus(prev => ({ ...prev, [key]: 'saved' }));
      
      // Clear saved status after 2 seconds
      setTimeout(() => {
        setStaffSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[key];
          return newStatus;
        });
      }, 2000);

      // Update local data
      setStaffData(prev => prev.map(staff => 
        staff.username === username ? { ...staff, [field]: value } : staff
      ));

    } catch (err) {
      setStaffSaveStatus(prev => ({ ...prev, [key]: 'error' }));
      setError(err instanceof Error ? err.message : 'Failed to save staff changes');
    }
  }, []);

  // Fetch security levels data from security_levels table
  const fetchSecurityLevelsData = useCallback(async () => {
    try {
      setSecurityLevelsLoading(true);

      const { data, error } = await supabase
        .from('security_levels')
        .select('*')
        .order('security_level', { ascending: true })
        .order('section', { ascending: true });

      if (error) {
        console.error('Error fetching security levels data:', error);
        setError(`Error loading security levels: ${error.message}`);
        return;
      }

      setSecurityLevelsData(data || []);
    } catch (err) {
      console.error('Error loading security levels data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch security levels data');
    } finally {
      setSecurityLevelsLoading(false);
    }
  }, []);

  // Open permission modal for editing
  const openEditPermissionModal = (permission: SecurityLevel) => {
    setEditingPermission(permission);
    setNewPermissionData({
      security_level: permission.security_level as SecurityLevelName,
      section: permission.section,
      scope: permission.scope
    });
    setAddPermissionErrors({});
    setShowAddPermissionModal(true);
  };

  // Open permission modal for adding
  const openAddPermissionModal = () => {
    setEditingPermission(null);
    setNewPermissionData({
      security_level: 'user',
      section: '',
      scope: 'read-only'
    });
    setAddPermissionErrors({});
    setShowAddPermissionModal(true);
  };

  // Close permission modal
  const closePermissionModal = () => {
    setShowAddPermissionModal(false);
    setEditingPermission(null);
    setNewPermissionData({
      security_level: 'user',
      section: '',
      scope: 'read-only'
    });
    setAddPermissionErrors({});
  };

  // Validate permission form (for both add and edit)
  const validatePermissionForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Section validation
    if (!newPermissionData.section.trim()) {
      errors.section = 'Section is required';
    }

    // Check for duplicate permission (only for new permissions)
    if (!editingPermission) {
      const isDuplicate = securityLevelsData.some(perm => 
        perm.security_level === newPermissionData.security_level && 
        perm.section === newPermissionData.section
      );
      if (isDuplicate) {
        errors.section = 'Permission already exists for this security level and section';
      }
    }

    setAddPermissionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save permission (add or update)
  const savePermission = async () => {
    if (!validatePermissionForm()) return;

    try {
      setAddPermissionLoading(true);
      
      if (editingPermission) {
        // Update existing permission

        const updateData = {
          security_level: newPermissionData.security_level,
          section: newPermissionData.section,
          scope: newPermissionData.scope,
        };

        const { error } = await supabase
          .from('security_levels')
          .update(updateData)
          .eq('id', editingPermission.id);

        if (error) {
          console.error('Error updating permission:', error);
          if (error.code === '23505') {
            setAddPermissionErrors({ section: 'Permission already exists for this security level and section' });
          } else {
            setError(`Error updating permission: ${error.message}`);
          }
          return;
        }


        // Update local data
        setSecurityLevelsData(prev => prev.map(perm => 
          perm.id === editingPermission.id 
            ? { ...perm, ...updateData }
            : perm
        ));

      } else {
        // Add new permission

        const permissionData = {
          security_level: newPermissionData.security_level,
          section: newPermissionData.section,
          scope: newPermissionData.scope
        };

        const { data, error } = await supabase
          .from('security_levels')
          .insert([permissionData])
          .select();

        if (error) {
          console.error('Error adding permission:', error);
          if (error.code === '23505') {
            // Handle unique constraint violation
            setAddPermissionErrors({ section: 'Permission already exists for this security level and section' });
          } else {
            setError(`Error adding permission: ${error.message}`);
          }
          return;
        }


        // Update local data
        if (data && data[0]) {
          setSecurityLevelsData(prev => [data[0], ...prev]);
        }
      }

      // Close modal
      closePermissionModal();

    } catch (err) {
      console.error('Error saving permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to save permission');
    } finally {
      setAddPermissionLoading(false);
    }
  };

  // Delete permission
  const deletePermission = async (permissionId: string) => {
    try {

      const { error } = await supabase
        .from('security_levels')
        .delete()
        .eq('id', permissionId);

      if (error) {
        console.error('Error deleting permission:', error);
        setError(`Error deleting permission: ${error.message}`);
        return;
      }


      // Update local data
      setSecurityLevelsData(prev => prev.filter(perm => perm.id !== permissionId));

    } catch (err) {
      console.error('Error deleting permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete permission');
    }
  };

  // Auto-save function for permission data
  const autoSavePermission = useCallback(async (permissionId: string, field: string, value: string) => {
    const key = `${permissionId}-${field}`;
    setPermissionSaveStatus(prev => ({ ...prev, [key]: 'saving' }));

    try {
      const updateData: any = {};
      updateData[field] = value;

      const { error } = await supabase
        .from('security_levels')
        .update(updateData)
        .eq('id', permissionId);

      if (error) throw error;

      setPermissionSaveStatus(prev => ({ ...prev, [key]: 'saved' }));
      
      // Clear saved status after 2 seconds
      setTimeout(() => {
        setPermissionSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[key];
          return newStatus;
        });
      }, 2000);

      // Update local data
      setSecurityLevelsData(prev => prev.map(perm => 
        perm.id === permissionId ? { ...perm, [field]: value } : perm
      ));

    } catch (err) {
      setPermissionSaveStatus(prev => ({ ...prev, [key]: 'error' }));
      setError(err instanceof Error ? err.message : 'Failed to save permission changes');
    }
  }, []);

  // Territory management functions
  const loadTerritories = useCallback(async () => {
    setTerritoryLoading(true);
    try {
      // Load state assignments from state_xref table
      const { data: stateData, error: stateError } = await supabase
        .from('state_xref')
        .select('*')
        .order('state_name');

      if (stateError) throw stateError;

      // Load prospect counts from prospector table
      // Only count prospects with non-null homepage screenshot URL
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospector')
        .select('state, homepage_screenshot_url')
        .not('homepage_screenshot_url', 'is', null);

      if (prospectError) throw prospectError;

      // Count prospects by state (only those with screenshot URLs)
      const prospectCounts = prospectData?.reduce((acc: Record<string, number>, row) => {
        const state = row.state?.toUpperCase().trim();
        if (state && state.length === 2) {
          acc[state] = (acc[state] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      // Build territory map from state_xref data
      const territoryMap = new Map<string, any>();

      stateData?.forEach((stateRow) => {
        const state = stateRow.state_code;
        territoryMap.set(state, {
          state,
          state_name: stateRow.state_name,
          salesperson: stateRow.assigned_staff || null,
          prospect_count: prospectCounts[state] || 0
        });
      });

      setTerritories(territoryMap);
    } catch (err: any) {
      console.error('Error loading territories:', err);
      setTerritoryMessage({ type: 'error', text: 'Failed to load territory data' });
    } finally {
      setTerritoryLoading(false);
    }
  }, []);

  const loadTerritorySalespeople = useCallback(async () => {
    try {
      
      const { data, error } = await supabase
        .from('staff_management')
        .select('username, user_full_name, is_salesperson')
        .eq('is_salesperson', true)
        .order('user_full_name');

      if (error) {
        console.error('Database error loading salespeople:', error);
        throw new Error(`Failed to load salespeople from database: ${error.message}`);
      }


      const salespeople = (data || []).map((person, idx) => ({
        id: `sp_${idx}`,
        name: person.user_full_name || person.username,
        username: person.username
      }));

      setTerritorySalespeople(salespeople);
    } catch (err: any) {
      console.error('Error loading salespeople:', err);
      setTerritoryMessage({
        type: 'error',
        text: `Failed to load salespeople: ${err.message}. Please ensure the database migration has been applied.`
      });
    }
  }, []);

  const handleStateClick = useCallback((stateId: string) => {
    setSelectedStates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stateId)) {
        newSet.delete(stateId);
      } else {
        newSet.add(stateId);
      }
      return newSet;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedStates(new Set());
  }, []);

  const handleAssignSalesperson = useCallback(async (salespersonName: string) => {
    if (selectedStates.size === 0) {
      setTerritoryMessage({ type: 'error', text: 'No states selected' });
      return;
    }

    setTerritorySaving(true);
    setTerritoryMessage(null);

    try {
      // Update state assignments in state_xref table
      const stateArray = Array.from(selectedStates);

      for (const state of stateArray) {
        const { error } = await supabase
          .from('state_xref')
          .update({ assigned_staff: salespersonName })
          .eq('state_code', state);

        if (error) throw error;
      }

      setTerritoryMessage({
        type: 'success',
        text: `Successfully assigned ${salespersonName} to ${stateArray.length} state(s)`
      });

      // Reload territories and clear selection
      await loadTerritories();
      setSelectedStates(new Set());
      setShowAssignmentModal(false);
    } catch (err: any) {
      console.error('Error assigning salesperson:', err);
      setTerritoryMessage({ type: 'error', text: 'Failed to assign salesperson' });
    } finally {
      setTerritorySaving(false);
    }
  }, [selectedStates, loadTerritories]);

  const handleFilterBySalesperson = useCallback((salesperson: string | null) => {
    setFilterSalesperson(salesperson);
    setSelectedStates(new Set());
  }, []);

  // Handle staff cell edit
  const handleStaffCellEdit = (username: string, field: string, value: string) => {
    setStaffEditingCell({ id: username, field, value });

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for auto-save (500ms delay)
    const timer = setTimeout(() => {
      autoSaveStaff(username, field, value);
    }, 500);

    setDebounceTimer(timer);
  };

  // Fetch brand options from keyvals table
  const fetchBrandOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('keyvals')
        .select('val_txt')
        .eq('key_txt', 'BRAND')
        .order('val_txt');

      if (error) {
        console.error('Error fetching brand options:', error);
        return;
      }

      const brands = data?.map(item => item.val_txt) || [];
      setBrandOptions(brands);
    } catch (err) {
      console.error('Error loading brand options:', err);
    }
  }, []);

  // Fetch vendor options from keyvals table
  const fetchVendorOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('keyvals')
        .select('val_txt')
        .ilike('key_txt', 'VENDORS')
        .order('val_txt');

      if (error) {
        console.error('Error fetching vendor options:', error);
        return;
      }

      const vendors = data?.map(item => item.val_txt) || [];
      setVendorOptions(vendors);
    } catch (err) {
      console.error('Error loading vendor options:', err);
    }
  }, []);

  // Fetch product data using RPC to bypass PostgREST 1000-row limit
  const fetchProductData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      

      // Use RPC function to get ALL records without PostgREST limits
      const { data, error } = await supabase.rpc('get_all_products');

      if (error) {
        console.error('Supabase RPC error:', error);
        throw new Error(`RPC error: ${error.message} (Code: ${error.code})`);
      }
      
      
      // No need for count comparison since RPC bypasses all PostgREST limits
      if (data && data.length > 1000) {
      }
      setProductData(data || []);
      setFilteredProductData(data || []);
      
      // Extract column names from first row
      if (data && data.length > 0) {
        const allCols = Object.keys(data[0]);
        setColumns(allCols);
        
        // Try to load user preferences
        const userPrefs = await loadUserPreferences();
        
        if (userPrefs && userPrefs.column_order.length > 0) {
          // Use saved user preferences
          const validColumns = userPrefs.column_order.filter(col => allCols.includes(col));
          setFilteredColumns(validColumns);
          setColumnWidths(userPrefs.column_widths);
          setSortField(userPrefs.sort_config.sortField);
          setSortDirection(userPrefs.sort_config.sortDirection);
        } else {
          // Use default order
          const filtered = defaultColumnMapping
            .filter(mapping => allCols.includes(mapping.fieldName))
            .sort((a, b) => a.ordinal - b.ordinal)
            .map(mapping => mapping.fieldName);
          
          setFilteredColumns(filtered);
          
          // Initialize column widths
          const initialWidths: { [key: string]: number } = {};
          filtered.forEach(col => {
            initialWidths[col] = 120; // Default width
          });
          setColumnWidths(initialWidths);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch product data';
      setError(`${errorMessage}. Please check the console for more details.`);
    } finally {
      setLoading(false);
    }
  }, [loadUserPreferences]);

  // Get display name for a field
  const getDisplayName = useCallback((fieldName: string) => {
    const mapping = defaultColumnMapping.find(m => m.fieldName === fieldName);
    return mapping ? mapping.displayName : fieldName;
  }, []);

  // Filter products with all 4 filters (part number + 3 description filters)
  const filterProducts = useCallback(() => {
    // URGENT: When filtering, disable edit mode and clear selections
    setEditMode(false);
    setSelectedProducts(new Set());
    setSelectedCell(null);
    setSelectedProduct(null);
    setIsEditing(false);

    let filtered = productData;

    // Apply part number filter
    if (partNumberFilter.trim()) {
      filtered = filtered.filter(product => {
        const partNumber = String(product.partnumber || '').toLowerCase();
        const searchTerm = partNumberFilter.toLowerCase();
        return partNumber.includes(searchTerm);
      });
    }

    // Apply description filter 1 (AND condition)
    if (descriptionFilter1.trim()) {
      filtered = filtered.filter(product => {
        const description = String(product.description || '').toLowerCase();
        const searchTerm = descriptionFilter1.toLowerCase();
        return description.includes(searchTerm);
      });
    }

    // Apply description filter 2 (AND condition)
    if (descriptionFilter2.trim()) {
      filtered = filtered.filter(product => {
        const description = String(product.description || '').toLowerCase();
        const searchTerm = descriptionFilter2.toLowerCase();
        return description.includes(searchTerm);
      });
    }

    // Apply description filter NOT (AND NOT condition)
    if (descriptionFilterNot.trim()) {
      filtered = filtered.filter(product => {
        const description = String(product.description || '').toLowerCase();
        const searchTerm = descriptionFilterNot.toLowerCase();
        return !description.includes(searchTerm);
      });
    }

    setFilteredProductData(filtered);
  }, [productData, partNumberFilter, descriptionFilter1, descriptionFilter2, descriptionFilterNot]);

  // Apply sorting to filtered data
  useEffect(() => {
    const sorted = sortProductData(filteredProductData);
    setSortedProductData(sorted);
  }, [filteredProductData, sortProductData]);

  // Handle filter input change
  const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      filterProducts();
    }
  };

  // Handle description filter input changes
  const handleDescriptionFilter1KeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      filterProducts();
    }
  };

  const handleDescriptionFilter2KeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      filterProducts();
    }
  };

  const handleDescriptionFilterNotKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      filterProducts();
    }
  };

  // Auto-size columns based on content
  const autoSizeColumns = useCallback(() => {
    const newWidths: { [key: string]: number } = {};
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.font = '12px Poppins, sans-serif'; // Match our font
    
    filteredColumns.forEach(col => {
      const displayName = getDisplayName(col);
      let maxWidth = context.measureText(displayName).width + 40; // Header width + padding + drag handle
      
      // Check first 50 rows for content width
      const rowsToCheck = Math.min(50, sortedProductData.length);
      for (let i = 0; i < rowsToCheck; i++) {
        const value = String(sortedProductData[i][col] || '');
        const textWidth = context.measureText(value).width + 20; // Content + padding
        maxWidth = Math.max(maxWidth, textWidth);
      }
      
      // Set minimum and maximum widths
      newWidths[col] = Math.max(80, Math.min(300, maxWidth));
    });
    
    setColumnWidths(newWidths);
    debouncedSavePreferences();
  }, [filteredColumns, sortedProductData, getDisplayName, debouncedSavePreferences]);

  // Minimize columns - set width to average of first 50 rows, with header consideration
  const minimizeColumns = useCallback(() => {
    const newWidths: { [key: string]: number } = {};
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.font = '12px Poppins, sans-serif'; // Match our font
    
    filteredColumns.forEach(col => {
      const displayName = getDisplayName(col);
      const headerWidth = context.measureText(displayName).width + 40; // Include drag handle space
      
      // Calculate average width from first 50 rows
      let totalWidth = 0;
      const rowsToCheck = Math.min(50, sortedProductData.length);
      
      for (let i = 0; i < rowsToCheck; i++) {
        const value = String(sortedProductData[i][col] || '');
        totalWidth += context.measureText(value).width + 20;
      }
      
      const avgWidth = rowsToCheck > 0 ? totalWidth / rowsToCheck : 80;
      
      // If header is greater than average, set to 10% more than header width
      if (headerWidth > avgWidth) {
        newWidths[col] = Math.max(80, headerWidth * 1.1);
      } else {
        newWidths[col] = Math.max(80, avgWidth);
      }
    });
    
    setColumnWidths(newWidths);
    debouncedSavePreferences();
  }, [filteredColumns, sortedProductData, getDisplayName, debouncedSavePreferences]);

  // Auto-save function with debouncing - using partnumber as unique identifier
  const autoSave = useCallback(async (partnumber: string, field: string, value: string) => {
    const key = `${partnumber}-${field}`;
    setSaveStatus(prev => ({ ...prev, [key]: 'saving' }));

    // OPTIMISTIC UPDATE: Update local state immediately so value doesn't disappear
    const timestamp = new Date().toISOString();
    setProductData(prev => prev.map(product =>
      product.partnumber === partnumber ? { ...product, [field]: value, last_edited: timestamp } : product
    ));
    
    // Also update filtered data immediately to ensure UI shows the change
    setFilteredProductData(prev => prev.map(product =>
      product.partnumber === partnumber ? { ...product, [field]: value, last_edited: timestamp } : product
    ));

    try {
      const updateData: any = {};
      
      // Handle numeric fields - convert empty string to null
      const numericFields = ['price', 'listprice', 'map', 'master_carton_price', 'master_carton_qty', 'inv_max', 'inv_min', 'inventory'];
      if (numericFields.includes(field.toLowerCase())) {
        updateData[field] = value.trim() === '' ? null : value;
      } else {
        updateData[field] = value;
      }
      
      updateData['last_edited'] = timestamp;


      const { data, error } = await supabase
        .from('pre_products_supabase')
        .update(updateData)
        .eq('partnumber', partnumber)
        .select();

      if (error) {
        console.error('❌ Database update error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      setSaveStatus(prev => ({ ...prev, [key]: 'saved' }));

      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[key];
          return newStatus;
        });
      }, 2000);

    } catch (err) {
      console.error('💥 AutoSave error:', err);
      setSaveStatus(prev => ({ ...prev, [key]: 'error' }));
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      
      // ROLLBACK: Revert the optimistic update on error
      setProductData(prev => prev.map(product =>
        product.partnumber === partnumber ? { ...product, [field]: product[field] } : product
      ));
    }
  }, []);

  // Save long description changes
  const saveLongDescription = async () => {
    if (!selectedProduct?.partnumber) return;

    setLongDescSaveStatus('saving');

    try {
      await autoSave(selectedProduct.partnumber, 'longdescription', editedLongDescription);
      setLongDescSaveStatus('saved');

      // Clear saved status after 2 seconds
      setTimeout(() => {
        setLongDescSaveStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Error saving long description:', err);
      setLongDescSaveStatus('error');

      // Clear error status after 3 seconds
      setTimeout(() => {
        setLongDescSaveStatus('idle');
      }, 3000);
    }
  };

  // Sync editedLongDescription with selectedProduct
  useEffect(() => {
    if (selectedProduct) {
      setEditedLongDescription(selectedProduct.longdescription || '');
      setLongDescSaveStatus('idle');
    }
  }, [selectedProduct?.partnumber]);

  // Handle cell edit - only updates state, no auto-save
  const handleCellEdit = (id: string, field: string, value: string) => {
    setEditingCell({ id, field, value });
    // No debounced save - only save on Enter key
  };

  // Save immediately and close edit mode - ONLY called on Enter key
  const saveAndCloseEdit = async () => {
    if (editingCell) {
      // Save to database and wait for completion
      await autoSave(editingCell.id, editingCell.field, editingCell.value);
      
      // Small delay to allow React state to propagate through derived states
      // productData → filteredProductData → sortedProductData
      setTimeout(() => {
        setEditingCell(null);
      }, 50);
    }
    
    // Exit edit mode immediately so user can navigate
    setIsEditing(false);
  };

  // Handle keyboard navigation for staff table
  const handleStaffKeyDown = useCallback((e: KeyboardEvent) => {
    if (activeTab !== 'systems-settings' || !staffSelectedCell || staffIsEditing) return;

    const { rowIndex, colIndex } = staffSelectedCell;
    const maxRow = staffData.length - 1;
    const maxCol = 2; // Only 2 editable columns (Full Name, Security Level)

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setStaffSelectedCell({ rowIndex: rowIndex - 1, colIndex });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < maxRow) {
          setStaffSelectedCell({ rowIndex: rowIndex + 1, colIndex });
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 1) { // Start from column 1 (Full Name)
          setStaffSelectedCell({ rowIndex, colIndex: colIndex - 1 });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (colIndex < maxCol) {
          setStaffSelectedCell({ rowIndex, colIndex: colIndex + 1 });
        }
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        setStaffIsEditing(true);
        break;
      case 'Escape':
        e.preventDefault();
        setStaffSelectedCell(null);
        setStaffIsEditing(false);
        break;
    }
  }, [activeTab, staffSelectedCell, staffIsEditing, staffData.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedCell || isEditing) return;

    const { rowIndex, colIndex } = selectedCell;
    const maxRow = sortedProductData.length - 1;
    const maxCol = filteredColumns.length - 1;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setSelectedCell({ rowIndex: rowIndex - 1, colIndex });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < maxRow) {
          setSelectedCell({ rowIndex: rowIndex + 1, colIndex });
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 0) {
          setSelectedCell({ rowIndex, colIndex: colIndex - 1 });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (colIndex < maxCol) {
          setSelectedCell({ rowIndex, colIndex: colIndex + 1 });
        }
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        if (editMode) {
          setIsEditing(true);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSelectedCell(null);
        setIsEditing(false);
        break;
    }
  }, [selectedCell, isEditing, sortedProductData.length, filteredColumns.length, editMode]);

  // Check if image exists at URL
  const checkImageExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Find image with extension fallback
  const findProductImage = async (product: ProductMember) => {
    if (!product.partnumber) return null;
    
    // If image field exists, use it
    if (product.image) {
      return `https://mus86077.s3.amazonaws.com/${product.image}`;
    }
    
    // Try extensions in order
    const extensions = ['jpg', 'JPG', 'png', 'PNG', 'tif', 'TIF', 'tiff', 'TIFF'];
    
    for (const ext of extensions) {
      const filename = `${product.partnumber}.${ext}`;
      const url = `https://mus86077.s3.amazonaws.com/${filename}`;
      
      if (await checkImageExists(url)) {
        // Found the image! Update database if image field is blank
        if (!product.image || product.image.trim() === '') {
          try {
            await autoSave(product.partnumber, 'image', filename);
          } catch (err) {
            console.error(`❌ Failed to update image field for ${product.partnumber}:`, err);
          }
        }
        return url;
      }
    }
    
    return null;
  };

  // Handle cell click
  const handleCellClick = async (rowIndex: number, colIndex: number, product: ProductMember) => {
    setSelectedCell({ rowIndex, colIndex });
    setSelectedProduct(product);
    setImageExtensionIndex(0);
    setFoundImageUrl(null);
    setCheckingImage(true);
    
    // Find the image in background
    const imageUrl = await findProductImage(product);
    setFoundImageUrl(imageUrl);
    setCheckingImage(false);
    
    // In edit mode, single click enters edit mode immediately
    if (editMode) {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  };

  // Handle cell double click
  const handleCellDoubleClick = (rowIndex: number, colIndex: number, product: ProductMember) => {
    if (!editMode) return; // Only allow editing when edit mode is enabled
    setSelectedCell({ rowIndex, colIndex });
    setSelectedProduct(product);
    setIsEditing(true);
  };

  // Handle checkbox selection
  const handleCheckboxChange = (partnumber: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partnumber)) {
        newSet.delete(partnumber);
      } else {
        if (newSet.size >= 10) {
          alert('Maximum 10 products can be selected for bulk update');
          return prev;
        }
        newSet.add(partnumber);
      }
      return newSet;
    });
  };

  // Handle select all/deselect all
  const handleSelectAll = () => {
    const currentPageProducts = sortedProductData
      .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
      .map(p => p.partnumber)
      .filter(Boolean);
    
    if (selectedProducts.size > 0) {
      // Deselect all
      setSelectedProducts(new Set());
    } else {
      // Select up to 10 from current page
      const toSelect = currentPageProducts.slice(0, 10);
      setSelectedProducts(new Set(toSelect));
      if (currentPageProducts.length > 10) {
        alert('Only first 10 products selected (maximum limit)');
      }
    }
  };

  // Handle bulk image update
  const handleBulkImageUpdate = async () => {
    const count = selectedProducts.size;
    
    if (count === 0) {
      alert('Please select at least one product to update');
      return;
    }

    const imageName = prompt(`You have selected ${count} product(s).\n\nEnter the image filename to apply to all selected products:`);
    
    if (!imageName || !imageName.trim()) {
      return; // User cancelled or entered empty string
    }

    const trimmedImageName = imageName.trim();
    
    if (!window.confirm(`Update ${count} product(s) with image filename: "${trimmedImageName}"?`)) {
      return;
    }

    try {
      setBulkUpdating(true);
      const partnumbers = Array.from(selectedProducts);
      
      // Update all selected products
      const { error } = await supabase
        .from('pre_products_supabase')
        .update({ image: trimmedImageName })
        .in('partnumber', partnumbers);

      if (error) throw error;

      alert(`Successfully updated ${count} product(s) with image: ${trimmedImageName}`);
      
      // Clear selections
      setSelectedProducts(new Set());
      
      // Refresh product data
      await fetchProductData();
      
    } catch (err) {
      console.error('Bulk update error:', err);
      alert('Failed to update products: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setBulkUpdating(false);
    }
  };
  
  // Handle image upload: Direct upload to AWS S3 using pre-signed URL from Netlify Function
  const handleImageUpload = async (file: File) => {
    if (!selectedProduct) return;
    
    try {
      setUploadingImage(true);
      const fileName = `${selectedProduct.partnumber}.${file.name.split('.').pop()}`;
      
      
      // STEP 1: Get pre-signed URL from Netlify Function
      
      const response = await fetch('/.netlify/functions/get-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: fileName,
          contentType: file.type
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ STEP 1 FAILED:', response.status, errorText);
        throw new Error(`Failed to get upload URL: ${response.statusText}`);
      }
      
      const { url } = await response.json();
      
      // STEP 2: Upload directly to S3 using pre-signed URL
      
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!uploadResponse.ok) {
        console.error('❌ STEP 2 FAILED:', uploadResponse.status, uploadResponse.statusText);
        throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
      }
      
      
      // STEP 3: Update the database
      await autoSave(selectedProduct.partnumber, 'image', fileName);
      
      alert(`✅ SUCCESS!\n\nFile: ${fileName}\n✓ Uploaded directly to AWS S3\n✓ Database updated`);
      
      // Display image from AWS S3
      const imageUrl = `https://mus86077.s3.amazonaws.com/${fileName}`;
      setFoundImageUrl(imageUrl);
      
    } catch (error) {
      console.error('💥 ERROR:', error);
      alert('❌ Upload failed: ' + (error as Error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle phone number encoding for prospector records (PARALLEL VERSION)
  const handleEncodePhoneNumbers = async () => {
    const testModeText = phoneTestMode ? ' (TEST MODE - 10 records only)' : '';
    if (!window.confirm(`This will fetch phone numbers from Google Places API for ${phoneTestMode ? '10' : 'all'} prospector records without phone numbers${testModeText}.\n\nParallel processing: ${concurrentRequests} concurrent requests\n\nContinue?`)) {
      return;
    }

    try {
      setIsEncodingPhones(true);
      setShowEncodingModal(true);

      // Fetch all prospector records without phone numbers
      let query = supabase
        .from('prospector')
        .select('*')
        .or('phone.is.null,phone.eq.')
        .not('business_name', 'is', null)
        .not('city', 'is', null)
        .not('state', 'is', null)
        .not('website', 'is', null);

      // Limit to 10 records in test mode
      if (phoneTestMode) {
        query = query.limit(10);
      }

      const { data: prospects, error: fetchError } = await query;

      if (fetchError) {
        console.error('❌ Error fetching prospects:', fetchError);
        throw new Error(`Failed to fetch prospects: ${fetchError.message}`);
      }

      if (!prospects || prospects.length === 0) {
        alert('No prospector records found that need phone numbers.');
        setIsEncodingPhones(false);
        setShowEncodingModal(false);
        return;
      }


      // Initialize progress
      setEncodingProgress({
        total: prospects.length,
        processed: 0,
        successful: 0,
        failed: 0,
        currentRecord: '',
        errors: []
      });

      // Process records in parallel batches
      let successful = 0;
      let failed = 0;
      const errors: Array<{ business_name: string; error: string }> = [];

      // Helper function to process a single prospect
      const processProspect = async (prospect: any, index: number) => {
        try {

          // Call the Edge Function to fetch phone number
          const { data: functionData, error: functionError } = await supabase.functions.invoke(
            'fetch-phone-from-places',
            {
              body: {
                business_name: prospect.business_name,
                city: prospect.city,
                state: prospect.state,
                website: prospect.website
              }
            }
          );

          if (functionError) {
            console.error(`❌ Function error for ${prospect.business_name}:`, functionError);

            // Capture more detailed error information
            let errorMessage = functionError.message || 'Unknown error';
            if (functionData?.error) {
              errorMessage = functionData.error;
            }
            if (functionData?.details) {
              errorMessage += ` - ${JSON.stringify(functionData.details)}`;
            }

            return {
              success: false,
              business_name: prospect.business_name,
              error: errorMessage
            };
          } else if (functionData?.success) {
            return {
              success: true,
              business_name: prospect.business_name
            };
          } else if (functionData?.place_id) {
            // Place was found but no phone number
            console.warn(`⚠️ No phone found for ${prospect.business_name}, saved Place ID: ${functionData.place_id}`);
            return {
              success: false,
              business_name: prospect.business_name,
              error: functionData?.message || 'No phone number found (Place ID saved, phone set to 000-000-0000)'
            };
          } else {
            console.warn(`⚠️ No phone or place found for ${prospect.business_name}`);
            return {
              success: false,
              business_name: prospect.business_name,
              error: functionData?.error || 'No phone number or place found'
            };
          }
        } catch (err) {
          console.error(`💥 Error processing ${prospect.business_name}:`, err);
          return {
            success: false,
            business_name: prospect.business_name,
            error: err instanceof Error ? err.message : 'Unknown error'
          };
        }
      };

      // Process in batches
      const batchSize = concurrentRequests;
      for (let i = 0; i < prospects.length; i += batchSize) {
        const batch = prospects.slice(i, i + batchSize);
        const batchStartIndex = i;

        // Update current batch being processed
        setEncodingProgress(prev => ({
          ...prev,
          currentRecord: `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(prospects.length / batchSize)} (${batch.map(p => p.business_name).join(', ')})`
        }));

        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map((prospect, idx) => processProspect(prospect, batchStartIndex + idx))
        );

        // Aggregate results
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const value = result.value;
            if (value.success) {
              successful++;
            } else {
              failed++;
              errors.push({
                business_name: value.business_name,
                error: value.error
              });
            }
          } else {
            // Promise rejected
            failed++;
            errors.push({
              business_name: 'Unknown',
              error: result.reason?.message || 'Promise rejected'
            });
          }
        });

        // Update progress
        const processed = Math.min(i + batchSize, prospects.length);
        setEncodingProgress(prev => ({
          ...prev,
          processed,
          successful,
          failed,
          errors
        }));

        // Small delay between batches to avoid overwhelming the API
        if (i + batchSize < prospects.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      alert(`Encoding complete!\n✅ Successful: ${successful}\n❌ Failed: ${failed}\n\nCheck console for details.`);

    } catch (err) {
      console.error('💥 Phone encoding error:', err);
      alert('Failed to encode phone numbers: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsEncodingPhones(false);
    }
  };

  // Get S3 image URL - tries multiple extensions if no image field exists
  const getImageUrl = (product: ProductMember): string | null => {
    const partNumber = product.partnumber;
    const imageField = product.image?.toLowerCase();
    
    if (!partNumber) return null;
    
    // If image field exists and matches part number, use it
    if (imageField) {
      const imageFieldWithoutExt = imageField.replace(/\.[^/.]+$/, '');
      const partNumberLower = partNumber.toLowerCase();
      
      if (imageFieldWithoutExt === partNumberLower || imageFieldWithoutExt === partNumberLower.replace(/\.[^/.]+$/, '')) {
        return `https://mus86077.s3.amazonaws.com/${product.image}`;
      }
    }
    
    // If no image field or doesn't match, try extensions in order
    // Return first extension - fallback will be handled by onError
    return `https://mus86077.s3.amazonaws.com/${partNumber}.jpg`;
  };

  // Format currency values
  const formatCurrency = (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Get cell value for editing
  const getCellValue = (product: ProductMember, colIndex: number) => {
    const field = filteredColumns[colIndex];
    if (editingCell?.id === product.partnumber && editingCell?.field === field) {
      return editingCell.value;
    }
    return String(product[field] || '');
  };

  // Get formatted cell value for display
  const getFormattedCellValue = (product: ProductMember, field: string) => {
    const value = product[field];
    const fieldLower = field.toLowerCase();
    if (['price', 'listprice', 'map', 'webmsrp', 'master_carton_price'].includes(fieldLower)) {
      return formatCurrency(value);
    }
    return String(value || '');
  };

  // Load data on component mount (only for specific tabs)
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProductData();
      fetchBrandOptions();
      fetchVendorOptions();
    } else if (activeTab === 'systems-settings') {
      fetchStaffData();
      fetchSecurityLevelsData();
    } else if (activeTab === 'state-assignments') {
      loadTerritories();
      loadTerritorySalespeople();
    }
  }, [activeTab, fetchProductData, fetchBrandOptions, fetchVendorOptions, fetchStaffData, fetchSecurityLevelsData, loadTerritories, loadTerritorySalespeople]);

  // Auto-apply filters when any filter value changes
  useEffect(() => {
    if (activeTab === 'products') {
      // URGENT: Reset edit mode and selections when any filter changes
      setEditMode(false);
      setSelectedProducts(new Set());
      setSelectedCell(null);
      setSelectedProduct(null);
      setIsEditing(false);
      
      filterProducts();
      setCurrentPage(0); // Reset to first page when filters change
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, partNumberFilter, descriptionFilter1, descriptionFilter2, descriptionFilterNot]);

  // Add keyboard event listeners
  useEffect(() => {
    if (activeTab === 'products') {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else if (activeTab === 'systems-settings') {
      document.addEventListener('keydown', handleStaffKeyDown);
      return () => {
        document.removeEventListener('keydown', handleStaffKeyDown);
      };
    }
  }, [activeTab, handleKeyDown, handleStaffKeyDown]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (preferencesTimer) {
        clearTimeout(preferencesTimer);
      }
    };
  }, [debounceTimer, preferencesTimer]);

  // Exit edit mode when editMode is disabled
  useEffect(() => {
    if (!editMode) {
      setIsEditing(false);
    }
  }, [editMode]);

  // CRITICAL: Update PRODUCT_EDIT_STATE when editMode changes
  useEffect(() => {
    const syncState = async () => {
      try {
        await updateProductEditState(editMode);
      } catch (error) {
        console.error('❌ Failed to sync edit state to database:', error);
        // If we failed to set active_edits=true, revert to view mode for safety
        if (editMode) {
          console.warn('⚠️ Reverting to view mode due to database sync failure');
          setEditMode(false);
          setError('Failed to enable edit mode. Please try again.');
        }
      }
    };
    syncState();
  }, [editMode, updateProductEditState]);

  // CRITICAL: Set active_edits=FALSE when Manager page closes (component unmounts)
  useEffect(() => {
    return () => {
      // Cleanup: Always set to FALSE on unmount to prevent blocking ETL
      // Use fire-and-forget approach - don't await since component is unmounting

      // Fire-and-forget: Start the update but don't wait for it
      supabase
        .from('product_edit_state')
        .update({ active_edits: false })
        .or('active_edits.eq.true,active_edits.eq.false')
        .then(undefined, (err: any) => console.error('❌ Cleanup on unmount failed:', err));
    };
  }, []);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return renderProductsTab();
      case 'metrics':
        return <MetricsTab />;
      case 'placeholder1':
        return <PromoCodeManager />;
      case 'systems-settings':
        return renderSystemsSettingsTab();
      case 'state-assignments':
        return renderStateAssignmentsTab();
      default:
        return renderProductsTab();
    }
  };

  // Render products tab content
  const renderProductsTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading product data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {/* Product Count Display - Moved to top */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
          <p className="text-lg font-medium text-gray-800" style={{ fontSize: '13.5pt' }}>
            {(partNumberFilter || descriptionFilter1 || descriptionFilter2 || descriptionFilterNot)
              ? `Showing ${sortedProductData.length.toLocaleString()} products (based on filter)`
              : `Showing all ${productData.length.toLocaleString()} Products (unfiltered)`
            }
          </p>
        </div>

        {/* Controls Row */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Edit Mode Timer Display */}
              {editMode && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-semibold ${
                  editModeTimer <= 60
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  <span>⏱️</span>
                  <span>
                    {Math.floor(editModeTimer / 60)}:{String(editModeTimer % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
               <button
                 onClick={() => setEditMode(!editMode)}
                 className={`px-4 py-1 rounded text-xs font-medium transition-colors ${
                   editMode
                     ? 'bg-orange-500 hover:bg-orange-600 text-white'
                     : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                 }`}
                 title={editMode ? 'Switch to View Mode' : 'Switch to Edit Mode'}
               >
                 {editMode ? '✏️ EDIT MODE' : '👁️ VIEW MODE'}
               </button>
               <label className="inline-block">
                 <input
                   type="file"
                   accept="image/*"
                   onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                       const partnumber = prompt('Enter the product part number for this image:');
                       if (partnumber && partnumber.trim()) {
                         const product = productData.find(p => p.partnumber === partnumber.trim());
                         if (product) {
                           setSelectedProduct(product);
                           handleImageUpload(file);
                         } else {
                           alert(`Product with part number "${partnumber}" not found.`);
                         }
                       }
                     }
                     e.target.value = ''; // Reset input
                   }}
                   className="hidden"
                   disabled={uploadingImage}
                 />
                 <span className={`inline-flex items-center px-4 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                   uploadingImage
                     ? 'bg-gray-400 text-white cursor-not-allowed'
                     : 'bg-green-600 hover:bg-green-700 text-white'
                 }`}>
                   {uploadingImage ? '⏳ Uploading...' : '📤 UPLOAD TO S3'}
                 </span>
               </label>
               <button
                 onClick={handleBulkImageUpdate}
                 disabled={bulkUpdating || selectedProducts.size === 0}
                 className={`px-4 py-1 rounded text-xs font-medium transition-colors ${
                   selectedProducts.size > 0
                     ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                     : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                 }`}
                 title={`Bulk update image for ${selectedProducts.size} selected product(s)`}
               >
                 {bulkUpdating ? '⏳ Updating...' : `📸 Bulk Update Images ${selectedProducts.size > 0 ? `(${selectedProducts.size})` : ''}`}
               </button>
               <button
                 onClick={autoSizeColumns}
                 className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
               >
                 Auto-Size Columns
               </button>
               <button
                 onClick={minimizeColumns}
                 className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors"
               >
                 Minimize Columns
               </button>
               <button
                 onClick={resetToDefault}
                 className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs transition-colors"
               >
                 Reset Layout
               </button>
             </div>
            </div>
            
            {/* Enhanced Pagination Controls */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {Math.ceil(sortedProductData.length / rowsPerPage)}
              </span>
              
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded"
                title="First Page"
              >
                ««
              </button>
              
              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded"
                title="Previous Page"
              >
                ‹ Previous
              </button>
              
              {/* Page Input */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={Math.ceil(sortedProductData.length / rowsPerPage)}
                  value={currentPage + 1}
                  onChange={(e) => {
                    const page = parseInt(e.target.value) - 1;
                    const maxPage = Math.ceil(sortedProductData.length / rowsPerPage) - 1;
                    if (page >= 0 && page <= maxPage) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-12 px-1 py-1 text-xs border border-gray-300 rounded text-center"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
              
              {/* Next Page */}
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(sortedProductData.length / rowsPerPage) - 1, currentPage + 1))}
                disabled={currentPage >= Math.ceil(sortedProductData.length / rowsPerPage) - 1}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded"
                title="Next Page"
              >
                Next ›
              </button>
              
              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(Math.ceil(sortedProductData.length / rowsPerPage) - 1)}
                disabled={currentPage >= Math.ceil(sortedProductData.length / rowsPerPage) - 1}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded"
                title="Last Page"
              >
                »»
              </button>
              
              {/* Rows per page selector */}
              <div className="flex items-center gap-1 ml-4">
                <span className="text-xs text-gray-600">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    const newRowsPerPage = parseInt(e.target.value);
                    setRowsPerPage(newRowsPerPage);
                    setCurrentPage(0); // Reset to first page
                  }}
                  className="px-1 py-1 text-xs border border-gray-300 rounded"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex-shrink-0">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Filter Row */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="bg-gray-50 border border-gray-300 rounded-lg mx-4 my-2 p-3">
            <div className="flex space-x-7">
              <div className="flex-1 border border-gray-300 rounded px-2 py-1" style={{ width: '180%' }}>
                <input
                  type="text"
                  placeholder="Part Number..."
                  value={partNumberFilter}
                  onChange={(e) => setPartNumberFilter(e.target.value)}
                  onKeyDown={handleFilterKeyDown}
                  className="w-full px-1 py-1 text-xs text-gray-700 border-0 bg-transparent rounded outline-none"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
              <div className="flex-1 border border-gray-300 rounded px-2 py-1" style={{ width: '180%' }}>
                <input
                  type="text"
                  placeholder="Description MUST include..."
                  value={descriptionFilter1}
                  onChange={(e) => setDescriptionFilter1(e.target.value)}
                  onKeyDown={handleDescriptionFilter1KeyDown}
                  className="w-full px-1 py-1 text-xs text-gray-700 border-0 bg-transparent rounded outline-none"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
              <div className="flex-1 border border-gray-300 rounded px-2 py-1" style={{ width: '180%' }}>
                <input
                  type="text"
                  placeholder="AND description must also include..."
                  value={descriptionFilter2}
                  onChange={(e) => setDescriptionFilter2(e.target.value)}
                  onKeyDown={handleDescriptionFilter2KeyDown}
                  className="w-full px-1 py-1 text-xs text-gray-700 border-0 bg-transparent rounded outline-none"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
              <div className="flex-1 border border-gray-300 rounded px-2 py-1" style={{ width: '180%' }}>
                <input
                  type="text"
                  placeholder="Description must NOT include..."
                  value={descriptionFilterNot}
                  onChange={(e) => setDescriptionFilterNot(e.target.value)}
                  onKeyDown={handleDescriptionFilterNotKeyDown}
                  className="w-full px-1 py-1 text-xs text-gray-700 border-0 bg-transparent rounded outline-none"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Draggable Spreadsheet Table */}
        <div className={`flex-1 overflow-auto ${editMode ? 'bg-orange-50' : 'bg-white'}`}>
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="border-collapse w-full">
              <thead className="bg-red-100 sticky top-0 z-10">
                <tr>
                  {/* Checkbox column header */}
                  <th className="border border-gray-300 px-2 py-0.5 text-center text-xs font-medium text-red-700 uppercase tracking-wider w-10">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size > 0}
                      onChange={handleSelectAll}
                      className="cursor-pointer"
                      title={selectedProducts.size > 0 ? 'Deselect All' : 'Select All (max 10)'}
                    />
                  </th>
                  <SortableContext
                    items={filteredColumns}
                    strategy={horizontalListSortingStrategy}
                  >
                    {filteredColumns.map((col) => (
                      <DraggableColumnHeader
                        key={col}
                        id={col}
                        width={columnWidths[col] || 120}
                        onSort={() => handleColumnSort(col)}
                        sortDirection={sortField === col ? sortDirection : null}
                        isActive={sortField === col}
                      >
                        {getDisplayName(col)}
                      </DraggableColumnHeader>
                    ))}
                  </SortableContext>
                </tr>
              </thead>
              <tbody>
                {sortedProductData
                  .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
                  .map((product, displayRowIndex) => {
                    const actualRowIndex = currentPage * rowsPerPage + displayRowIndex;
                    const uniqueKey = product.id || `row-${actualRowIndex}-${product.partnumber || displayRowIndex}`;
                    const isRowSelected = selectedCell?.rowIndex === actualRowIndex;
                    const isChecked = selectedProducts.has(product.partnumber);
                    return (
                      <tr key={uniqueKey} className={`${isRowSelected ? 'bg-yellow-100' : (displayRowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50')}`}>
                        {/* Checkbox column */}
                        <td className="border border-gray-300 px-2 py-0.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(product.partnumber)}
                            className="cursor-pointer"
                            disabled={!product.partnumber}
                          />
                        </td>
                        {filteredColumns.map((col, colIndex) => {
                          const isSelected = selectedCell?.rowIndex === actualRowIndex && selectedCell?.colIndex === colIndex;
                          const isCurrentlyEditing = isEditing && isSelected;
                          
                          return (
                            <td 
                              key={col}
                              className={`border border-gray-300 px-1 py-0.5 relative ${
                                col === 'inventory' 
                                  ? (isSelected ? 'ring-1 ring-blue-400 bg-blue-50' : 'bg-gray-200') 
                                  : (isSelected ? 'ring-1 ring-blue-400 bg-blue-50' : 'hover:bg-gray-100')
                              }`}
                              style={{ width: columnWidths[col] || 120, minWidth: columnWidths[col] || 120 }}
                              onClick={() => handleCellClick(actualRowIndex, colIndex, product)}
                              onDoubleClick={() => handleCellDoubleClick(actualRowIndex, colIndex, product)}
                            >
                              {isCurrentlyEditing && col !== 'inventory' ? (
                                col === 'brand' ? (
                                  <select
                                    value={getCellValue(product, colIndex)}
                                    onChange={(e) => {
                                      if (product.partnumber) {
                                        handleCellEdit(product.partnumber, col, e.target.value);
                                        setTimeout(() => saveAndCloseEdit(), 50);
                                      } else {
                                        console.error('Cannot update product: missing partnumber', product);
                                        setError('Cannot update product: missing partnumber');
                                        setIsEditing(false);
                                      }
                                    }}
                                    onBlur={saveAndCloseEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === 'Tab') {
                                        saveAndCloseEdit();
                                        e.preventDefault();
                                      }
                                      if (e.key === 'Escape') {
                                        setIsEditing(false);
                                        e.preventDefault();
                                      }
                                    }}
                                    className="w-full px-1 py-1 border border-gray-300 outline-none bg-white text-xs"
                                    style={{ fontFamily: 'Poppins, sans-serif', height: 'auto', minHeight: '20px' }}
                                    autoFocus
                                  >
                                    <option value="">Select Brand...</option>
                                    {brandOptions.map((brand, index) => (
                                      <option key={`brand-${index}-${brand}`} value={brand}>
                                        {brand}
                                      </option>
                                    ))}
                                  </select>
                                ) : col === 'vendor' ? (
                                  <select
                                    value={getCellValue(product, colIndex)}
                                    onChange={(e) => {
                                      if (product.partnumber) {
                                        handleCellEdit(product.partnumber, col, e.target.value);
                                        setTimeout(() => saveAndCloseEdit(), 50);
                                      } else {
                                        console.error('Cannot update product: missing partnumber', product);
                                        setError('Cannot update product: missing partnumber');
                                        setIsEditing(false);
                                      }
                                    }}
                                    onBlur={saveAndCloseEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === 'Tab') {
                                        saveAndCloseEdit();
                                        e.preventDefault();
                                      }
                                      if (e.key === 'Escape') {
                                        setIsEditing(false);
                                        e.preventDefault();
                                      }
                                    }}
                                    className="w-full px-1 py-1 border border-gray-300 outline-none bg-white text-xs"
                                    style={{ fontFamily: 'Poppins, sans-serif', height: 'auto', minHeight: '20px' }}
                                    autoFocus
                                  >
                                    <option value="">Select Vendor...</option>
                                    {vendorOptions.map((vendor, index) => (
                                      <option key={`vendor-${index}-${vendor}`} value={vendor}>
                                        {vendor}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={getCellValue(product, colIndex)}
                                    onChange={(e) => {
                                      if (product.partnumber) {
                                        handleCellEdit(product.partnumber, col, e.target.value);
                                      } else {
                                        console.error('Cannot update product: missing partnumber', product);
                                        setError('Cannot update product: missing partnumber');
                                        setIsEditing(false);
                                      }
                                    }}
                                    onBlur={saveAndCloseEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === 'Tab') {
                                        saveAndCloseEdit();
                                        e.preventDefault();
                                      }
                                      if (e.key === 'Escape') {
                                        setIsEditing(false);
                                        e.preventDefault();
                                      }
                                    }}
                                    className="w-full h-4 px-1 border-0 outline-none bg-white text-xs"
                                    style={{ fontFamily: 'Poppins, sans-serif' }}
                                    autoFocus
                                  />
                                )
                              ) : (
                                <div className={`h-4 px-1 flex items-center text-xs cursor-cell truncate ${
                                  ['price', 'listprice', 'map', 'webmsrp', 'master_carton_price'].includes(col.toLowerCase()) ? 'justify-end' : ''
                                }`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                                  {getFormattedCellValue(product, col)}
                                </div>
                              )}
                              
                              {saveStatus[`${product.partnumber}-${col}`] && (
                                <div className="absolute right-0.5 top-0.5">
                                  {saveStatus[`${product.partnumber}-${col}`] === 'saving' && (
                                    <div className="animate-spin h-2 w-2 border border-blue-500 border-t-transparent rounded-full"></div>
                                  )}
                                  {saveStatus[`${product.partnumber}-${col}`] === 'saved' && (
                                    <svg className="h-2 w-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  {saveStatus[`${product.partnumber}-${col}`] === 'error' && (
                                    <svg className="h-2 w-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </DndContext>
        </div>
        
        {/* Product Details Panel - Shows when a row is selected */}
        {selectedProduct && (
          <div className="border-t border-gray-300 bg-white p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                {selectedProduct.partnumber}
              </h3>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setSelectedCell(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-stretch">
              {/* Image Section */}
              <div className="flex flex-col">
                <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 flex-1 flex flex-col items-center justify-center">
                  {checkingImage ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-xs text-gray-600">Checking for image...</p>
                    </div>
                  ) : foundImageUrl ? (
                    <>
                      <img
                        src={foundImageUrl}
                        alt={selectedProduct.partnumber}
                        className="max-w-full h-auto max-h-96 mx-auto object-contain"
                      />
                      <label className="block mt-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer text-xs font-medium disabled:opacity-50">
                          {uploadingImage ? 'Uploading...' : 'Replace Image'}
                        </span>
                      </label>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-500 text-sm mb-3">No image available</p>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <span className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer text-sm font-medium disabled:opacity-50">
                          {uploadingImage ? 'Uploading...' : 'Upload Image'}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Long Description Section */}
              <div className="flex flex-col">
                {editMode && (
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      onClick={saveLongDescription}
                      disabled={longDescSaveStatus === 'saving'}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        longDescSaveStatus === 'saving'
                          ? 'bg-gray-400 text-white cursor-wait'
                          : longDescSaveStatus === 'saved'
                          ? 'bg-green-500 text-white'
                          : longDescSaveStatus === 'error'
                          ? 'bg-red-500 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {longDescSaveStatus === 'saving' && '⏳ Saving...'}
                      {longDescSaveStatus === 'saved' && '✓ Saved!'}
                      {longDescSaveStatus === 'error' && '✗ Error'}
                      {longDescSaveStatus === 'idle' && 'Save Changes'}
                    </button>
                    {longDescSaveStatus === 'error' && (
                      <span className="text-xs text-red-600">Failed to save. Please try again.</span>
                    )}
                  </div>
                )}
                <div className="border border-gray-300 rounded-lg p-3 bg-white flex-1 overflow-hidden flex flex-col">
                  {editMode ? (
                    <textarea
                      value={editedLongDescription}
                      onChange={(e) => {
                        setEditedLongDescription(e.target.value);
                      }}
                      className="w-full h-full p-2 text-xs font-mono border-0 outline-none resize-none bg-white"
                      style={{ fontFamily: 'Courier New, monospace' }}
                      placeholder="Enter HTML description..."
                    />
                  ) : (
                    <div
                      className="text-sm text-gray-800 prose prose-sm max-w-none overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: selectedProduct.longdescription || '<p class="text-gray-500">No description available</p>'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render systems settings tab content
  const renderSystemsSettingsTab = () => {
    if (staffLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading staff data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Systems Settings</h2>
            <p className="text-sm text-gray-600 mt-1">Manage staff accounts and system configuration</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openAddStaffModal}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
              title="Add New Staff Member"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Staff
            </button>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-300">
                <input
                  type="checkbox"
                  checked={phoneTestMode}
                  onChange={(e) => setPhoneTestMode(e.target.checked)}
                  disabled={isEncodingPhones}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">Run in test mode (10 records)</span>
              </label>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-300">
                <label className="text-sm text-gray-700 font-medium">
                  Concurrent:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={concurrentRequests}
                  onChange={(e) => setConcurrentRequests(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                  disabled={isEncodingPhones}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Number of parallel requests (1-50). Higher = faster but may hit rate limits. Recommended: 10-20 for 5000 records."
                />
                <span className="text-xs text-gray-500">threads</span>
              </div>
              <button
                onClick={handleEncodePhoneNumbers}
                disabled={isEncodingPhones}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  isEncodingPhones
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title="Fetch phone numbers from Google Places API"
              >
                <span className="flex items-center gap-2">
                  {isEncodingPhones ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Encode Phone Numbers
                    </>
                  )}
                </span>
              </button>
            </div>
            <button
              onClick={() => setStaffEditMode(!staffEditMode)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                staffEditMode
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title={staffEditMode ? 'Switch to View Mode' : 'Switch to Edit Mode'}
            >
              {staffEditMode ? '✏️ EDIT MODE' : '👁️ VIEW MODE'}
            </button>
          </div>
        </div>

        {/* Staff Management Panel */}
        <div className="bg-white rounded-lg shadow overflow-hidden max-w-3xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Staff Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {staffData.length} staff member{staffData.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className={`overflow-auto ${staffEditMode ? 'bg-orange-50' : 'bg-white'}`}>
            <table className="border-collapse w-full">
              <thead className="bg-red-100 sticky top-0 z-10">
                <tr>
                  <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium text-red-700 uppercase tracking-wider w-20">
                    Actions
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                    Security Level
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffData.map((staff, rowIndex) => (
                  <tr key={staff.username} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    {/* Actions */}
                    <td className="border border-gray-300 px-1 py-1 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete staff member "${staff.username}"?`)) {
                              deleteStaff(staff.username);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                          title="Delete Staff Member"
                        >
                          Del
                        </button>
                        <button
                          onClick={() => openEditStaffModal(staff)}
                          className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                          title="Edit Staff Member"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Reset password for "${staff.user_full_name}" (${staff.username}) to "password"?\n\nThe user will be able to log in with this temporary password and should change it immediately.`)) {
                              resetStaffPassword(staff.username, staff.user_full_name);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
                          title="Reset Password to 'password'"
                        >
                          Reset Pwd
                        </button>
                      </div>
                    </td>
                    
                    {/* Username - not editable */}
                    <td className="border border-gray-300 px-2 py-1 text-sm font-medium text-gray-900">
                      {staff.username}
                    </td>
                    
                    {/* Full Name */}
                    <td 
                      className={`border border-gray-300 px-2 py-1 relative cursor-pointer ${
                        staffSelectedCell?.rowIndex === rowIndex && staffSelectedCell?.colIndex === 1 
                          ? 'ring-1 ring-blue-400 bg-blue-50' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        setStaffSelectedCell({ rowIndex, colIndex: 1 });
                        if (staffEditMode) {
                          setStaffIsEditing(true);
                        }
                      }}
                      onDoubleClick={() => {
                        setStaffSelectedCell({ rowIndex, colIndex: 1 });
                        setStaffIsEditing(true);
                      }}
                    >
                      {staffIsEditing && staffSelectedCell?.rowIndex === rowIndex && staffSelectedCell?.colIndex === 1 ? (
                        <input
                          type="text"
                          value={staffEditingCell?.id === staff.username && staffEditingCell?.field === 'user_full_name' 
                            ? staffEditingCell.value 
                            : staff.user_full_name}
                          onChange={(e) => handleStaffCellEdit(staff.username, 'user_full_name', e.target.value)}
                          onBlur={() => setStaffIsEditing(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              setStaffIsEditing(false);
                              e.preventDefault();
                            }
                            if (e.key === 'Escape') {
                              setStaffIsEditing(false);
                              e.preventDefault();
                            }
                          }}
                          className="w-full px-1 py-1 border border-gray-300 outline-none bg-white text-sm"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm text-gray-900 truncate">
                          {staff.user_full_name}
                        </div>
                      )}
                      {staffSaveStatus[`${staff.username}-user_full_name`] && (
                        <div className="absolute right-1 top-1">
                          {staffSaveStatus[`${staff.username}-user_full_name`] === 'saving' && (
                            <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full"></div>
                          )}
                          {staffSaveStatus[`${staff.username}-user_full_name`] === 'saved' && (
                            <svg className="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {staffSaveStatus[`${staff.username}-user_full_name`] === 'error' && (
                            <svg className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Security Level */}
                    <td 
                      className={`border border-gray-300 px-2 py-1 relative cursor-pointer ${
                        staffSelectedCell?.rowIndex === rowIndex && staffSelectedCell?.colIndex === 2 
                          ? 'ring-1 ring-blue-400 bg-blue-50' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => {
                        setStaffSelectedCell({ rowIndex, colIndex: 2 });
                        if (staffEditMode) {
                          setStaffIsEditing(true);
                        }
                      }}
                      onDoubleClick={() => {
                        setStaffSelectedCell({ rowIndex, colIndex: 2 });
                        setStaffIsEditing(true);
                      }}
                    >
                      {staffIsEditing && staffSelectedCell?.rowIndex === rowIndex && staffSelectedCell?.colIndex === 2 ? (
                        <select
                          value={staffEditingCell?.id === staff.username && staffEditingCell?.field === 'security_level' 
                            ? staffEditingCell.value 
                            : staff.security_level}
                          onChange={(e) => {
                            handleStaffCellEdit(staff.username, 'security_level', e.target.value);
                            setTimeout(() => setStaffIsEditing(false), 50);
                          }}
                          onBlur={() => setStaffIsEditing(false)}
                          className="w-full px-1 py-1 border border-gray-300 outline-none bg-white text-sm"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                          autoFocus
                        >
                          <option value="user">User</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        <div className="text-sm text-gray-900 truncate">
                          {staff.security_level}
                        </div>
                      )}
                      {staffSaveStatus[`${staff.username}-security_level`] && (
                        <div className="absolute right-1 top-1">
                          {staffSaveStatus[`${staff.username}-security_level`] === 'saving' && (
                            <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full"></div>
                          )}
                          {staffSaveStatus[`${staff.username}-security_level`] === 'saved' && (
                            <svg className="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {staffSaveStatus[`${staff.username}-security_level`] === 'error' && (
                            <svg className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Permissions Panel */}
        <div className="bg-white rounded-lg shadow overflow-hidden max-w-5xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Security Permissions</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {securityLevelsData.length} permission{securityLevelsData.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={openAddPermissionModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                title="Add New Permission"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Permission
              </button>
            </div>
          </div>
          
          {securityLevelsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading permissions...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto bg-white">
              <table className="border-collapse w-full">
                <thead className="bg-red-100 sticky top-0 z-10">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium text-red-700 uppercase tracking-wider w-20">
                      Actions
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                      Security Level
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider">
                      Scope
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {securityLevelsData.map((permission, rowIndex) => (
                    <tr key={permission.id} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {/* Actions */}
                      <td className="border border-gray-300 px-1 py-1 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete permission for "${permission.security_level}" on "${permission.section}"?`)) {
                                deletePermission(permission.id);
                              }
                            }}
                            className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                            title="Delete Permission"
                          >
                            Del
                          </button>
                          <button
                            onClick={() => openEditPermissionModal(permission)}
                            className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                            title="Edit Permission"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                      
                      {/* Security Level */}
                      <td className="border border-gray-300 px-2 py-1 text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          permission.security_level === 'super_admin' ? 'bg-red-100 text-red-800' :
                          permission.security_level === 'admin' ? 'bg-orange-100 text-orange-800' :
                          permission.security_level === 'manager' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {permission.security_level.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      
                      {/* Section */}
                      <td className="border border-gray-300 px-2 py-1 text-sm text-gray-900">
                        {permission.section}
                      </td>

                      {/* Scope */}
                      <td className="border border-gray-300 px-2 py-1 text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          permission.scope === 'all' ? 'bg-green-100 text-green-800' :
                          permission.scope === 'delete' ? 'bg-red-100 text-red-800' :
                          permission.scope === 'update' ? 'bg-yellow-100 text-yellow-800' :
                          permission.scope === 'create' ? 'bg-blue-100 text-blue-800' :
                          permission.scope === 'read-only' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {permission.scope.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* S3 Image Cache Management */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <S3ImageCacheTab />
        </div>

        {/* Add Staff Modal */}
        {showAddStaffModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                  </h3>
                  <button
                    onClick={closeStaffModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                {/* Username Field - only show for new staff */}
                {!editingStaff && (
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={newStaffData.username}
                      onChange={(e) => setNewStaffData(prev => ({ ...prev, username: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                        addStaffErrors.username 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="Enter username"
                    />
                    {addStaffErrors.username && (
                      <p className="mt-1 text-xs text-red-600">{addStaffErrors.username}</p>
                    )}
                  </div>
                )}

                {/* Show username as read-only for existing staff */}
                {editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newStaffData.username}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Full Name Field */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={newStaffData.user_full_name}
                    onChange={(e) => setNewStaffData(prev => ({ ...prev, user_full_name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                      addStaffErrors.user_full_name 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Enter full name"
                  />
                  {addStaffErrors.user_full_name && (
                    <p className="mt-1 text-xs text-red-600">{addStaffErrors.user_full_name}</p>
                  )}
                </div>

                {/* Security Level Field */}
                <div>
                  <label htmlFor="securityLevel" className="block text-sm font-medium text-gray-700 mb-1">
                    Security Level
                  </label>
                  <select
                    id="securityLevel"
                    value={newStaffData.security_level}
                    onChange={(e) => setNewStaffData(prev => ({ ...prev, security_level: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingStaff ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={newStaffData.password}
                    onChange={(e) => setNewStaffData(prev => ({ ...prev, password: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                      addStaffErrors.password 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder={editingStaff ? "Enter new password (optional)" : "Enter password"}
                  />
                  {addStaffErrors.password && (
                    <p className="mt-1 text-xs text-red-600">{addStaffErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password Field - only show if password is entered */}
                {newStaffData.password && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={newStaffData.confirmPassword}
                      onChange={(e) => setNewStaffData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                        addStaffErrors.confirmPassword 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="Confirm password"
                    />
                    {addStaffErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-600">{addStaffErrors.confirmPassword}</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={closeStaffModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  disabled={addStaffLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={saveStaff}
                  disabled={addStaffLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-md transition-colors flex items-center gap-2"
                >
                  {addStaffLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border border-white border-t-transparent rounded-full"></div>
                      {editingStaff ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    editingStaff ? 'Update Staff' : 'Add Staff'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Permission Modal */}
        {showAddPermissionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingPermission ? 'Edit Permission' : 'Add New Permission'}
                  </h3>
                  <button
                    onClick={closePermissionModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                {/* Security Level Field */}
                <div>
                  <label htmlFor="permissionSecurityLevel" className="block text-sm font-medium text-gray-700 mb-1">
                    Security Level *
                  </label>
                  <select
                    id="permissionSecurityLevel"
                    value={newPermissionData.security_level}
                    onChange={(e) => setNewPermissionData(prev => ({ ...prev, security_level: e.target.value as SecurityLevelName }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableSecurityLevels.map(level => (
                      <option key={level} value={level}>
                        {level.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section Field */}
                <div>
                  <label htmlFor="permissionSection" className="block text-sm font-medium text-gray-700 mb-1">
                    Section *
                  </label>
                  <select
                    id="permissionSection"
                    value={newPermissionData.section}
                    onChange={(e) => setNewPermissionData(prev => ({ ...prev, section: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                      addPermissionErrors.section 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select Section...</option>
                    {availableSections.map(section => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                  {addPermissionErrors.section && (
                    <p className="mt-1 text-xs text-red-600">{addPermissionErrors.section}</p>
                  )}
                </div>

                {/* Scope Field */}
                <div>
                  <label htmlFor="permissionScope" className="block text-sm font-medium text-gray-700 mb-1">
                    Scope *
                  </label>
                  <select
                    id="permissionScope"
                    value={newPermissionData.scope}
                    onChange={(e) => setNewPermissionData(prev => ({ ...prev, scope: e.target.value as PermissionScope }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableScopes.map(scope => (
                      <option key={scope} value={scope}>
                        {scope.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={closePermissionModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  disabled={addPermissionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={savePermission}
                  disabled={addPermissionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md transition-colors flex items-center gap-2"
                >
                  {addPermissionLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border border-white border-t-transparent rounded-full"></div>
                      {editingPermission ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    editingPermission ? 'Update Permission' : 'Add Permission'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phone Encoding Progress Modal */}
        {showEncodingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Phone Number Encoding Progress
                  </h3>
                  {!isEncodingPhones && (
                    <button
                      onClick={() => setShowEncodingModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Progress Statistics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{encodingProgress.total}</div>
                    <div className="text-xs text-gray-600 mt-1">Total Records</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-600">{encodingProgress.processed}</div>
                    <div className="text-xs text-gray-600 mt-1">Processed</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{encodingProgress.successful}</div>
                    <div className="text-xs text-gray-600 mt-1">Successful</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{encodingProgress.failed}</div>
                    <div className="text-xs text-gray-600 mt-1">Failed</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progress</span>
                    <span>{encodingProgress.total > 0 ? Math.round((encodingProgress.processed / encodingProgress.total) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${encodingProgress.total > 0 ? (encodingProgress.processed / encodingProgress.total) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Current Record Being Processed */}
                {isEncodingPhones && encodingProgress.currentRecord && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Processing:</span>
                        <span className="ml-2 text-gray-900">{encodingProgress.currentRecord}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Errors List (if any) */}
                {encodingProgress.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">Errors ({encodingProgress.errors.length})</h4>
                    </div>
                    <div className="bg-red-50 rounded-lg border border-red-200 max-h-48 overflow-y-auto">
                      {encodingProgress.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="px-3 py-2 border-b border-red-100 last:border-b-0">
                          <div className="text-sm font-medium text-gray-900">{error.business_name}</div>
                          <div className="text-xs text-red-600 mt-1">{error.error}</div>
                        </div>
                      ))}
                      {encodingProgress.errors.length > 10 && (
                        <div className="px-3 py-2 text-xs text-gray-500 text-center">
                          ... and {encodingProgress.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Completion Message */}
                {!isEncodingPhones && encodingProgress.processed === encodingProgress.total && encodingProgress.total > 0 && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div className="text-sm font-medium text-green-900">
                        Phone encoding complete! {encodingProgress.successful} successful, {encodingProgress.failed} failed.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowEncodingModal(false)}
                  disabled={isEncodingPhones}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isEncodingPhones
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isEncodingPhones ? 'Processing...' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render state assignments tab content
  const renderStateAssignmentsTab = () => {
    const calculateSalespersonSummary = () => {
      const summary: Record<string, { stateCount: number; prospectCount: number }> = {};

      territories.forEach(territory => {
        const salesperson = territory.salesperson || 'Unassigned';
        if (!summary[salesperson]) {
          summary[salesperson] = { stateCount: 0, prospectCount: 0 };
        }
        summary[salesperson].stateCount += 1;
        summary[salesperson].prospectCount += territory.prospect_count;
      });

      return Object.entries(summary).sort((a, b) => {
        if (a[0] === 'Unassigned') return 1;
        if (b[0] === 'Unassigned') return -1;
        return b[1].stateCount - a[1].stateCount;
      });
    };

    const handleStateAssignment = async (stateCode: string, salespersonName: string) => {
      setTerritorySaving(true);
      setTerritoryMessage(null);

      try {
        const { error } = await supabase
          .from('state_xref')
          .update({ assigned_staff: salespersonName })
          .eq('state_code', stateCode);

        if (error) throw error;

        setTerritoryMessage({
          type: 'success',
          text: `Successfully assigned ${salespersonName || 'Unassigned'} to ${stateCode}`
        });

        await loadTerritories();
      } catch (err: any) {
        console.error('Error assigning salesperson:', err);
        setTerritoryMessage({ type: 'error', text: 'Failed to assign salesperson' });
      } finally {
        setTerritorySaving(false);
      }
    };

    const handleRemoveAllAssignments = async () => {
      const filterText = filterSalesperson
        ? `${filterSalesperson}'s assignments`
        : 'all assignments';

      const confirmed = window.confirm(
        `Are you sure that you want to remove ${filterText}? This action cannot be undone.`
      );

      if (!confirmed) return;

      setTerritorySaving(true);
      setTerritoryMessage(null);

      try {
        let query = supabase
          .from('state_xref')
          .update({ assigned_staff: '' });

        // Apply filter if a specific salesperson is selected
        if (filterSalesperson) {
          query = query.eq('assigned_staff', filterSalesperson);
        } else {
          // Update all records - use a condition that matches all rows
          query = query.neq('state_code', '');
        }

        const { error } = await query;

        if (error) throw error;

        setTerritoryMessage({
          type: 'success',
          text: `Successfully removed ${filterText}`
        });

        await loadTerritories();
      } catch (err: any) {
        console.error('Error removing assignments:', err);
        setTerritoryMessage({ type: 'error', text: 'Failed to remove assignments' });
      } finally {
        setTerritorySaving(false);
      }
    };

    const handleSort = (column: 'state' | 'prospects') => {
      if (territorySortColumn === column) {
        setTerritorySortDirection(territorySortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setTerritorySortColumn(column);
        setTerritorySortDirection('asc');
      }
    };

    const sortedTerritories = Array.from(territories.values()).sort((a, b) => {
      if (territorySortColumn === 'state') {
        const comparison = a.state_name.localeCompare(b.state_name);
        return territorySortDirection === 'asc' ? comparison : -comparison;
      } else {
        const comparison = a.prospect_count - b.prospect_count;
        return territorySortDirection === 'asc' ? comparison : -comparison;
      }
    });

    const filteredTerritories = filterSalesperson
      ? sortedTerritories.filter(t => t.salesperson === filterSalesperson)
      : sortedTerritories;

    const salespersonSummary = calculateSalespersonSummary();

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">State Assignment Management</h2>
          <p className="text-blue-100 text-sm">Assign salespeople to state territories</p>
        </div>

        {/* Message Display */}
        {territoryMessage && (
          <div className={`px-6 py-3 text-sm ${
            territoryMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {territoryMessage.text}
          </div>
        )}

        {/* Controls */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Salesperson:</label>
            <select
              value={filterSalesperson || ''}
              onChange={(e) => handleFilterBySalesperson(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Assignments</option>
              <option value="__unassigned__">Unassigned</option>
              {territorySalespeople.map(sp => (
                <option key={sp.id} value={sp.name}>{sp.name}</option>
              ))}
            </select>
            <button
              onClick={handleRemoveAllAssignments}
              disabled={territorySaving}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Remove All Assignments
            </button>
            <div className="ml-auto text-sm text-gray-600">
              Showing {filteredTerritories.length} of {territories.size} states
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Table */}
          <div className="flex-1 overflow-auto">
            {territoryLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading territory data...</div>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-gray-200 sticky top-0 z-10">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-gray-300 cursor-pointer hover:bg-gray-300 transition-colors select-none"
                      onClick={() => handleSort('state')}
                    >
                      <div className="flex items-center gap-2">
                        State
                        <span className="text-xs">
                          {territorySortColumn === 'state' ? (territorySortDirection === 'asc' ? '▲' : '▼') : '⬍'}
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                      Assigned Salesperson
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-gray-300 cursor-pointer hover:bg-gray-300 transition-colors select-none"
                      onClick={() => handleSort('prospects')}
                    >
                      <div className="flex items-center gap-2">
                        Prospects
                        <span className="text-xs">
                          {territorySortColumn === 'prospects' ? (territorySortDirection === 'asc' ? '▲' : '▼') : '⬍'}
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTerritories.map((territory, index) => (
                    <tr
                      key={territory.state}
                      className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-2.5 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{territory.state_name}</span>
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                            {territory.state}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 border-b border-gray-200">
                        <select
                          value={territory.salesperson || ''}
                          onChange={(e) => handleStateAssignment(territory.state, e.target.value)}
                          disabled={territorySaving}
                          className={`w-full px-3 py-1.5 border-2 rounded text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${getSalespersonColor(territory.salesperson || null).bg} ${getSalespersonColor(territory.salesperson || null).border} ${getSalespersonColor(territory.salesperson || null).text} font-medium`}
                        >
                          <option value="">Unassigned</option>
                          {territorySalespeople.map(sp => (
                            <option key={sp.id} value={sp.name}>{sp.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 border-b border-gray-200">
                        <span className="font-medium text-gray-900">{territory.prospect_count.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="w-80 border-l bg-gray-50 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary by Salesperson</h3>

            <div className="space-y-3">
              {salespersonSummary.map(([salesperson, data]) => {
                const colors = getSalespersonColor(salesperson === 'Unassigned' ? null : salesperson);
                return (
                  <div
                    key={salesperson}
                    className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border}`}
                  >
                    <div className={`font-semibold mb-2 ${colors.text}`}>{salesperson}</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">States:</span>
                        <span className="font-medium text-blue-600">{data.stateCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prospects:</span>
                        <span className="font-medium text-purple-600">{data.prospectCount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Access control: Check multiple permission indicators for Manager page access
  const hasManagerAccess = isSuperUser ||
    user?.is_special_admin === true ||
    user?.security_level === 'super_admin' ||
    user?.security_level === 'admin';

  if (!hasManagerAccess) {
    // Show popup message for access denied
    React.useEffect(() => {
      alert('Access Denied');
    }, []);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg border-2 border-red-600 p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-700">
            You do not have permission to access the Manager panel. This area is restricted to Super User accounts only.
          </p>
          <p className="text-gray-600 mt-4">
            If you believe you should have access, please contact your system administrator.
          </p>
          <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
            <strong>Debug Info:</strong><br/>
            isSuperUser: {String(isSuperUser)}<br/>
            is_special_admin: {String(user?.is_special_admin)}<br/>
            security_level: {user?.security_level || 'undefined'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Professional Header Bar */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white flex-shrink-0 shadow-lg">
        <div className="flex items-center px-6 h-14">
          {/* Back to CRM */}
          <button
            onClick={() => navigate('/crm')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors mr-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to CRM
          </button>

          <div className="h-6 w-px bg-slate-600 mr-4" />

          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold">Manager Dashboard</h1>
          </div>

          <div className="flex-1" />

          {/* Purchasing Button */}
          <button
            onClick={openPurchaseOrderModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Purchasing
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="px-6">
          <nav className="flex gap-1 overflow-x-auto py-2">
            {tabs.map((tab) => {
              const icons: Record<string, React.ReactNode> = {
                'products': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
                'metrics': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                'placeholder1': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
                'systems-settings': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                'state-assignments': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
              };
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {icons[tab.id]}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-full">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ManagerPage;
