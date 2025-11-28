import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PromoCode } from '../types';
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

interface UserPreferences {
  column_order: string[];
  column_widths: { [key: string]: number };
  hidden_columns: string[];
  sort_config: {
    sortField: string | null;
    sortDirection: 'asc' | 'desc';
  };
}

type SortDirection = 'asc' | 'desc';

const TEMPLATES = [
  { id: 'spend_get_free', name: 'Spend $X Get Y Part Numbers for Free' },
  { id: 'spend_get_dollar_off', name: 'Spend $X Get $Y Off Total Order' },
  { id: 'spend_get_model_free', name: 'Spend $X Get Free Y Model Number' },
  { id: 'buy_get_free', name: 'Buy Model X Get Y Units of Part Z for Free' },
  { id: 'buy_units_get_units_free', name: 'Buy X Units of Part Y Get Z Units of Part W for Free' },
];

// Draggable column header component for promo codes
const DraggablePromoColumnHeader: React.FC<{
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
      className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer select-none"
      onClick={onSort}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center">
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
          className="w-3 h-3 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-gray-300 rounded opacity-50 hover:opacity-100"
          title="Drag to reorder column"
        >
          ⋮⋮
        </div>
      </div>
    </th>
  );
};

const PromoCodeManager: React.FC = () => {
  const { user } = useAuth();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [sortedPromoCodes, setSortedPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PromoCode>>({
    is_active: false,
    allow_concurrent: false,
    type: 'dollars_off',
  });
  const [templateConfig, setTemplateConfig] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [freeItems, setFreeItems] = useState<Array<{part_number: string, description: string}>>([]);
  const [isFormValid, setIsFormValid] = useState(false);

  // Column management state
  const [filteredColumns, setFilteredColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [preferencesTimer, setPreferencesTimer] = useState<NodeJS.Timeout | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Default column mapping for promo codes
  const defaultColumnMapping = [
    { ordinal: 1, fieldName: 'actions', displayName: 'Actions' },
    { ordinal: 2, fieldName: 'code', displayName: 'Code' },
    { ordinal: 3, fieldName: 'name', displayName: 'Name' },
    { ordinal: 4, fieldName: 'type', displayName: 'Type' },
    { ordinal: 5, fieldName: 'value', displayName: 'Val' },
    { ordinal: 6, fieldName: 'min_order_value', displayName: 'Min$' },
    { ordinal: 7, fieldName: 'max_uses', displayName: 'Max' },
    { ordinal: 8, fieldName: 'uses_remaining', displayName: 'Rem' },
    { ordinal: 9, fieldName: 'used_count', displayName: 'Used' },
    { ordinal: 10, fieldName: 'is_active', displayName: 'Act' },
    { ordinal: 11, fieldName: 'start_date', displayName: 'Start' },
    { ordinal: 12, fieldName: 'end_date', displayName: 'End' },
    { ordinal: 13, fieldName: 'created_at', displayName: 'Created' },
    { ordinal: 14, fieldName: 'updated_at', displayName: 'Updated' },
    { ordinal: 15, fieldName: 'max_uses_per_account', displayName: 'Max/Acc' },
    { ordinal: 16, fieldName: 'uses_per_account_tracking', displayName: 'Trk/Acc' },
    { ordinal: 17, fieldName: 'legacy_code', displayName: 'Free Item' },
    { ordinal: 18, fieldName: 'allow_concurrent', displayName: 'Conc' },
    { ordinal: 19, fieldName: 'template', displayName: 'Tmpl' },
    { ordinal: 20, fieldName: 'template_config', displayName: 'Config' },
  ];

  // Save user preferences for promo codes
  const saveUserPreferences = useCallback(async (preferences: UserPreferences) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_column_preferences')
        .upsert({
          user_id: user.id,
          page_name: 'manager_promo_codes',
          column_order: preferences.column_order,
          column_widths: preferences.column_widths,
          hidden_columns: preferences.hidden_columns,
          sort_config: preferences.sort_config,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving promo code preferences:', error);
      } else {
      }
    } catch (err) {
      console.error('Error saving promo preferences:', err);
    }
  }, [user]);

  // Load user preferences for promo codes
  const loadUserPreferences = useCallback(async (): Promise<UserPreferences | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_column_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('page_name', 'manager_promo_codes')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading promo code preferences:', error);
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
      console.error('Error loading promo preferences:', err);
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
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(fieldName);
      setSortDirection('asc');
    }
    debouncedSavePreferences();
  }, [sortField, sortDirection, debouncedSavePreferences]);

  // Sort the promo code data
  const sortPromoData = useCallback((data: PromoCode[]) => {
    if (!sortField) return data;

    const sorted = [...data].sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Convert to strings for comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      // For numeric fields, try parsing as numbers
      const numericFields = ['value', 'min_order_value', 'max_uses', 'uses_remaining', 'max_uses_per_account'];
      if (numericFields.includes(sortField)) {
        const aNum = parseFloat(aStr) || 0;
        const bNum = parseFloat(bStr) || 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // For boolean fields
      const booleanFields = ['is_active', 'allow_concurrent', 'uses_per_account_tracking'];
      if (booleanFields.includes(sortField)) {
        const aBool = aVal ? 1 : 0;
        const bBool = bVal ? 1 : 0;
        return sortDirection === 'asc' ? aBool - bBool : bBool - aBool;
      }

      // For date fields - 🚨 NO TIMEZONE CONVERSIONS
      const dateFields = ['start_date', 'end_date', 'created_at', 'updated_at'];
      if (dateFields.includes(sortField)) {
        // Extract simple date strings for comparison (YYYY-MM-DD format)
        const aDateStr = String(aVal).split(' ')[0] || String(aVal);
        const bDateStr = String(bVal).split(' ')[0] || String(bVal);
        return sortDirection === 'asc' ? 
          aDateStr.localeCompare(bDateStr) : 
          bDateStr.localeCompare(aDateStr);
      }

      // String comparison
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [sortField, sortDirection]);

  // Initialize columns and load preferences
  useEffect(() => {
    const initializeColumns = async () => {
      const userPrefs = await loadUserPreferences();
      
      if (userPrefs && userPrefs.column_order.length > 0) {
        setFilteredColumns(userPrefs.column_order);
        setColumnWidths(userPrefs.column_widths);
        setSortField(userPrefs.sort_config.sortField);
        setSortDirection(userPrefs.sort_config.sortDirection);
      } else {
        // Use default order
        const defaultOrder = defaultColumnMapping
          .sort((a, b) => a.ordinal - b.ordinal)
          .map(mapping => mapping.fieldName);
        
        setFilteredColumns(defaultOrder);
        
        // Initialize column widths
        const initialWidths: { [key: string]: number } = {};
        defaultOrder.forEach(col => {
          initialWidths[col] = 100; // Smaller default for promo codes
        });
        setColumnWidths(initialWidths);
      }
    };

    if (user) {
      initializeColumns();
    }
  }, [user, loadUserPreferences]);

  // Reset to default column order
  const resetToDefault = useCallback(() => {
    const defaultOrder = defaultColumnMapping
      .sort((a, b) => a.ordinal - b.ordinal)
      .map(mapping => mapping.fieldName);

    const defaultWidths: { [key: string]: number } = {};
    defaultOrder.forEach(col => {
      defaultWidths[col] = 100;
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
  }, [saveUserPreferences]);

  // Auto-size columns based on content
  const autoSizeColumns = useCallback(() => {
    const newWidths: { [key: string]: number } = {};
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.font = '12px Poppins, sans-serif';
    
    filteredColumns.forEach(col => {
      const mapping = defaultColumnMapping.find(m => m.fieldName === col);
      const displayName = mapping ? mapping.displayName : col;
      let maxWidth = context.measureText(displayName).width + 30; // Header width + padding + drag handle
      
      // Check first 50 rows for content width
      const rowsToCheck = Math.min(50, sortedPromoCodes.length);
      for (let i = 0; i < rowsToCheck; i++) {
        const value = getCellDisplayValue(sortedPromoCodes[i], col);
        const textWidth = context.measureText(value).width + 20;
        maxWidth = Math.max(maxWidth, textWidth);
      }
      
      newWidths[col] = Math.max(60, Math.min(250, maxWidth));
    });
    
    setColumnWidths(newWidths);
    debouncedSavePreferences();
  }, [filteredColumns, sortedPromoCodes, debouncedSavePreferences]);

  // Get display value for a cell
  const getCellDisplayValue = (promo: any, field: string): string => {
    const value = promo[field];
    
    switch (field) {
      case 'type':
        if (value === 'percent_off') return '%';
        if (value === 'dollars_off') return '$';
        if (value === 'free_product') return 'Free';
        if (value === 'advanced') return 'Adv';
        return String(value || '');
      case 'is_active':
        return value ? 'Y' : 'N';
      case 'allow_concurrent':
        return value ? 'Y' : 'N';
      case 'uses_per_account_tracking':
        return value ? 'Y' : 'N';
      case 'start_date':
      case 'end_date':
        // 🚨 Format as MM/DD/YYYY per user requirements
        if (!value) return 'N/A';
        const dateStr = value.split(' ')[0] || value; // Extract YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [year, month, day] = dateStr.split('-');
          return `${month}/${day}/${year}`;
        }
        return dateStr;
      case 'created_at':
      case 'updated_at':
        // 🚨 Format as MM/DD/YYYY per user requirements
        if (!value) return 'N/A';
        const dateStr2 = value.split(' ')[0] || value; // Extract YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr2)) {
          const [year, month, day] = dateStr2.split('-');
          return `${month}/${day}/${year}`;
        }
        return dateStr2;
      case 'max_uses':
      case 'max_uses_per_account':
        return value || '∞';
      case 'uses_remaining':
        return value !== null ? String(value) : '∞';
      case 'used_count':
        const usageCount = promo.max_uses && promo.uses_remaining !== null ? 
          promo.max_uses - promo.uses_remaining : 'N/A';
        return String(usageCount);
      case 'template_config':
        return value ? JSON.stringify(value).substring(0, 20) + '...' : '-';
      case 'legacy_code':
      case 'template':
        return value || '-';
      case 'actions':
        return 'Edit | Del';
      default:
        return String(value || '');
    }
  };

  // Get display name for a field
  const getDisplayName = useCallback((fieldName: string) => {
    const mapping = defaultColumnMapping.find(m => m.fieldName === fieldName);
    return mapping ? mapping.displayName : fieldName;
  }, []);

  const fetchPromoCodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (promoError) throw promoError;
      setPromoCodes(data || []);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
      setError('Failed to fetch promo codes. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFreeItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products_supabase')
        .select('part_number, description')
        .ilike('part_number', '%promo%');

      if (error) throw error;
      setFreeItems(data || []);
    } catch (err) {
      console.error('Error fetching free items:', err);
    }
  }, []);

  useEffect(() => {
    fetchPromoCodes();
    fetchFreeItems();
  }, [fetchPromoCodes, fetchFreeItems]);

  // Apply sorting to promo codes
  useEffect(() => {
    const filtered = promoCodes.filter(promo => 
      promo.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      promo.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const sorted = sortPromoData(filtered);
    setSortedPromoCodes(sorted);
  }, [promoCodes, searchTerm, sortPromoData]);

  // Form validation function
  const validateForm = useCallback(() => {
    const requiredFields = ['name', 'code', 'start_date', 'end_date', 'min_order_value'];
    
    // Add value as required for non-free product types
    if (formData.type !== 'free_product') {
      requiredFields.push('value');
    }
    
    // Check if all required fields have values
    const isValid = requiredFields.every(field => {
      const value = formData[field as keyof typeof formData];
      return value !== undefined && value !== null && value !== '';
    });
    
    return isValid;
  }, [formData]);

  // Update form validation when formData changes
  useEffect(() => {
    setIsFormValid(validateForm());
  }, [formData, validateForm]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (preferencesTimer) {
        clearTimeout(preferencesTimer);
      }
    };
  }, [preferencesTimer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setFormData(prev => ({ ...prev, template: templateId }));
    setTemplateConfig({});
  };

  const handleTemplateConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTemplateConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      // 🚨 CRITICAL: NO TIMEZONE CONVERSIONS PER .CLINERULES
      // Use direct string values - NO Date object conversion
      const dataToSave = {
        ...formData,
        // Ensure value is never null - set to 0 for free products
        value: formData.type === 'free_product' ? 0 : (formData.value || 0),
        // 🚨 DIRECT STRING USE - NO TIMEZONE CONVERSION
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        // Ensure legacy_code is always saved (for free items)
        legacy_code: formData.legacy_code || null,
        template_config: templateConfig
      };

      // Add debugging logs
      console.log('🚨 CRITICAL DEBUG - Saving promo data:', dataToSave);
      console.log('🚨 Original form data dates:', {
        start_date: formData.start_date,
        end_date: formData.end_date,
        legacy_code: formData.legacy_code
      });

      if (isEditing) {
        console.log('🚨 UPDATING promo code ID:', isEditing);
        const { error: updateError, data: updateData } = await supabase
          .from('promo_codes')
          .update(dataToSave)
          .eq('id', isEditing)
          .select('*');

        console.log('🚨 Update result:', updateData);
        if (updateError) {
          console.error('🚨 UPDATE ERROR:', updateError);
          throw updateError;
        }
        setIsEditing(null);
      } else {
        console.log('🚨 INSERTING new promo code');
        const { error: insertError, data: insertData } = await supabase
          .from('promo_codes')
          .insert([dataToSave])
          .select('*');

        console.log('🚨 Insert result:', insertData);
        if (insertError) {
          console.error('🚨 INSERT ERROR:', insertError);
          throw insertError;
        }
        setIsCreating(false);
      }

      setFormData({ is_active: false, allow_concurrent: false, type: 'dollars_off' });
      setTemplateConfig({});
      fetchPromoCodes();
      console.log('🚨 Promo code saved successfully!');
    } catch (err) {
      console.error('🚨 CRITICAL ERROR saving promo code:', err);
      setError('Failed to save promo code. Please check the console for details.');
    }
  };

  const handleEdit = (promo: PromoCode) => {
    console.log('🚨🚨🚨 CRITICAL EDIT FUNCTION CALLED - Editing promo:', promo);
    setIsEditing(promo.id);
    
    // 🚨 DIRECT ASSIGNMENT - NO PROCESSING
    console.log('🚨🚨🚨 RAW PROMO DATA FOR EDIT:', {
      start_date: promo.start_date,
      end_date: promo.end_date,
      legacy_code: promo.legacy_code,
      name: promo.name,
      code: promo.code,
      min_order_value: promo.min_order_value,
      is_active: promo.is_active
    });
    
    // 🚨 SIMPLE STRING EXTRACTION FOR DATES
    const extractDate = (dbDate: string) => {
      if (!dbDate) return '';
      // "2025-09-05 00:00:00+00" -> "2025-09-05"
      return dbDate.split(' ')[0];
    };
    
    const startDateForForm = extractDate(promo.start_date || '');
    const endDateForForm = extractDate(promo.end_date || '');
    
    console.log('🚨🚨🚨 DATE EXTRACTION RESULTS:', {
      original_start: promo.start_date,
      original_end: promo.end_date,
      extracted_start: startDateForForm,
      extracted_end: endDateForForm
    });
    
    // 🚨 DIRECT FORM DATA ASSIGNMENT
    const directFormData = {
      ...promo,
      start_date: startDateForForm,
      end_date: endDateForForm,
    };
    
    console.log('🚨🚨🚨 DIRECT FORM DATA BEING SET:', directFormData);
    
    setFormData(directFormData);
    setTemplateConfig(promo.template_config || {});
    
    console.log('🚨🚨🚨 FORM DATA HAS BEEN SET - CHECK IF FORM POPULATES');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const { error: deleteError } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      fetchPromoCodes();
    } catch (err) {
      console.error('Error deleting promo code:', err);
      setError('Failed to delete promo code. Please check the console for details.');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(null);
    setFormData({ is_active: false, allow_concurrent: false, type: 'dollars_off' });
    setTemplateConfig({});
  };

  const renderTemplateConfigFields = () => {
    if (!formData.template) return null;

    switch (formData.template) {
      case 'spend_get_free':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Minimum Spend ($)</label>
              <input
                type="number"
                name="min_spend"
                value={templateConfig.min_spend || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Part Numbers (comma separated)</label>
              <input
                type="text"
                name="free_parts"
                value={templateConfig.free_parts || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="e.g., PART1, PART2"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Quantity per Part</label>
              <input
                type="number"
                name="quantity_per_part"
                value={templateConfig.quantity_per_part || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </>
        );
      case 'spend_get_dollar_off':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Minimum Spend ($)</label>
              <input
                type="number"
                name="min_spend"
                value={templateConfig.min_spend || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Discount Amount ($)</label>
              <input
                type="number"
                name="discount_amount"
                value={templateConfig.discount_amount || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </>
        );
      case 'spend_get_model_free':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Minimum Spend ($)</label>
              <input
                type="number"
                name="min_spend"
                value={templateConfig.min_spend || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Model Number</label>
              <input
                type="text"
                name="free_model"
                value={templateConfig.free_model || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </>
        );
      case 'buy_get_free':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Required Model Number to Buy</label>
              <input
                type="text"
                name="required_model"
                value={templateConfig.required_model || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Part Number</label>
              <input
                type="text"
                name="free_part"
                value={templateConfig.free_part || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Units</label>
              <input
                type="number"
                name="free_units"
                value={templateConfig.free_units || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </>
        );
      case 'buy_units_get_units_free':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Required Part Number to Buy</label>
              <input
                type="text"
                name="required_part"
                value={templateConfig.required_part || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Required Units to Buy</label>
              <input
                type="number"
                name="required_units"
                value={templateConfig.required_units || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Part Number</label>
              <input
                type="text"
                name="free_part"
                value={templateConfig.free_part || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Units</label>
              <input
                type="number"
                name="free_units"
                value={templateConfig.free_units || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading promo codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Promo Code Management</h2>
                <p className="text-xs text-slate-500">Create and manage promotional campaigns</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search promo codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all w-64"
              />
            </div>
            <button
              onClick={autoSizeColumns}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              Auto-Size
            </button>
            <button
              onClick={resetToDefault}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium shadow-md transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Promo Code
            </button>
          </div>
        </div>
      </div>

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

      {(isCreating || isEditing) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">{isEditing ? 'Edit Promotion' : 'Create New Promo Code'}</h3>
                  <p className="text-indigo-100 text-sm mt-0.5">Configure your promotional campaign</p>
                </div>
                <button
                  type="button"
                  className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={handleCancel}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4 col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Promo Type</label>
                  <select
                    name="type"
                    value={formData.type || 'dollars_off'}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  >
                    <option value="dollars_off">Dollars Off</option>
                    <option value="percent_off">Percent Off</option>
                    <option value="free_product">Free Product or Gift</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="mb-4 col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Promo Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Promo Code</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Free Item</label>
                  <select
                    name="legacy_code"
                    value={formData.legacy_code || ''}
                    onChange={handleInputChange}
                    disabled={formData.type !== 'free_product'}
                    className={`mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${
                      formData.type !== 'free_product' ? 'bg-gray-100 text-gray-400' : ''
                    }`}
                  >
                    <option value="">Select free item...</option>
                    {freeItems.map((item) => (
                      <option key={item.part_number} value={item.part_number}>
                        {item.part_number} - {item.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    {formData.type === 'percent_off' ? 'Percent Off' : 'Discount Value'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="value"
                      step="0.01"
                      value={formData.type === 'percent_off' && formData.value ? String(formData.value).replace('%', '') : (formData.value || '')}
                      onChange={(e) => {
                        const { name, value } = e.target;
                        const numericValue = formData.type === 'percent_off' ? parseFloat(value) || 0 : parseFloat(value) || 0;
                        setFormData(prev => ({ ...prev, [name]: numericValue }));
                      }}
                      disabled={formData.type === 'free_product'}
                      className={`mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${
                        formData.type === 'free_product' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                      } ${formData.type === 'percent_off' ? 'pr-8' : ''}`}
                      required={formData.type !== 'free_product'}
                    />
                    {formData.type === 'percent_off' && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500">%</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Minimum Order Value ($)</label>
                  <input
                    type="number"
                    name="min_order_value"
                    step="0.01"
                    value={formData.min_order_value || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Max Uses per Account</label>
                  <input
                    type="number"
                    name="max_uses_per_account"
                    value={formData.max_uses_per_account || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Total Max Activations</label>
                  <input
                    type="number"
                    name="max_uses"
                    value={formData.max_uses || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
                {formData.type === 'advanced' && (
                  <div className="mb-4 col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Template</label>
                    <select
                      name="template"
                      value={formData.template || ''}
                      onChange={handleTemplateChange}
                      className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    >
                      <option value="">Select a template...</option>
                      {TEMPLATES.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="mb-4 col-span-1 md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active || false}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-gray-700">Active</label>
                  </div>
                </div>
                <div className="mb-4 col-span-1 md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allow_concurrent"
                      name="allow_concurrent"
                      checked={formData.allow_concurrent || false}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allow_concurrent" className="ml-2 block text-sm font-medium text-gray-700">Allow Concurrent Use with Other Promos</label>
                  </div>
                </div>
                <div className="mb-4 col-span-1 md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="uses_per_account_tracking"
                      name="uses_per_account_tracking"
                      checked={formData.uses_per_account_tracking || false}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="uses_per_account_tracking" className="ml-2 block text-sm font-medium text-gray-700">Track Uses per Account</label>
                  </div>
                </div>
                {formData.template && (
                  <div className="mb-4 col-span-1 md:col-span-2">
                    <h4 className="text-md font-medium text-gray-800 mb-2">Template Configuration</h4>
                    {renderTemplateConfigFields()}
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-4 border-t pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Close
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <div className="relative">
                    <button
                      type="submit"
                      disabled={!isFormValid}
                      title={!isFormValid ? "Please fill out all required fields" : ""}
                      className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        isFormValid
                          ? 'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                          : 'text-gray-500 bg-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {isEditing ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto flex flex-col">
        {sortedPromoCodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">No promo codes found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="border-collapse w-full" style={{ fontSize: '60%', fontFamily: 'Poppins, sans-serif' }}>
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <SortableContext 
                        items={filteredColumns}
                        strategy={horizontalListSortingStrategy}
                      >
                        {filteredColumns.map((col) => (
                          <DraggablePromoColumnHeader
                            key={col}
                            id={col}
                            width={columnWidths[col] || 100}
                            onSort={() => handleColumnSort(col)}
                            sortDirection={sortField === col ? sortDirection : null}
                            isActive={sortField === col}
                          >
                            {getDisplayName(col)}
                          </DraggablePromoColumnHeader>
                        ))}
                      </SortableContext>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPromoCodes.map((promo, index) => {
                      // 🚨 NO TIMEZONE CONVERSION - Get current date as simple string
                      const now = new Date();
                      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      
                      // Extract simple date from DB timestamp (NO timezone conversion)
                      const getSimpleDate = (dateStr: string | null | undefined): string => {
                        if (!dateStr) return '';
                        // "2025-09-05 00:00:00+00" becomes "2025-09-05"
                        return dateStr.split(' ')[0] || dateStr;
                      };
                      
                      const promoStart = getSimpleDate(promo.start_date);
                      const promoEnd = getSimpleDate(promo.end_date);
                      
                      let rowBgColor = '';
                      
                      // Debug logging for critical promo analysis
                      const startCheck = promoStart <= today;
                      const endCheck = promoEnd >= today;
                      const usesCheck = promo.uses_remaining === null || promo.uses_remaining > 0;
                      
                      console.log('🚨 ROW COLOR DEBUG - Promo:', promo.code, {
                        is_active: promo.is_active,
                        raw_start_date: promo.start_date,
                        raw_end_date: promo.end_date,
                        simple_start_date: promoStart,
                        simple_end_date: promoEnd,
                        today: today,
                        start_comparison: startCheck,
                        end_comparison: endCheck,
                        uses_comparison: usesCheck,
                        uses_remaining: promo.uses_remaining,
                        max_uses: promo.max_uses,
                        SHOULD_BE_GREEN: promo.is_active && promoStart && promoEnd && startCheck && endCheck && usesCheck
                      });
                      
                      // 🚨 CRITICAL FIX: PROPER date comparison logic
                      if (!promo.is_active) {
                        // Inactive promotion - GRAY
                        rowBgColor = 'bg-gray-200';
                      } else if (promo.uses_remaining === 0) {
                        // Depleted promotion - ORANGE
                        rowBgColor = 'bg-orange-100';
                        console.log('🟠 ORANGE - Depleted promotion:', promo.code);
                      } else if (promoEnd && promoEnd < today) {
                        // Expired promotion - RED
                        rowBgColor = 'bg-red-100';
                        console.log('🔴 RED - Expired promotion:', promo.code);
                      } else if (promo.is_active && promoStart && promoEnd && startCheck && endCheck) {
                        // 🚨 ACTIVE PROMOTION - GREEN (check this BEFORE future check)
                        rowBgColor = 'bg-green-100';
                        console.log('🟢 GREEN - ACTIVE PROMOTION:', promo.code, 'Start:', promoStart, '<=', today, ':', startCheck, 'End:', promoEnd, '>=', today, ':', endCheck);
                      } else if (promoStart && promoStart > today) {
                        // Future promotion - YELLOW (check this AFTER active check)
                        rowBgColor = 'bg-yellow-100';
                        console.log('🟡 YELLOW - Future promotion:', promo.code, 'Start:', promoStart, '>', today);
                      } else {
                        // Default alternating row colors
                        rowBgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                      }
                      
                      return (
                        <tr key={promo.id} className={`${rowBgColor} hover:bg-gray-200`}>
                          {filteredColumns.map((col) => (
                            <td 
                              key={col}
                              className="border border-gray-300 px-2 py-1 text-xs"
                              style={{ width: columnWidths[col] || 100, minWidth: columnWidths[col] || 100 }}
                            >
                              {col === 'actions' ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEdit(promo)}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    Edit
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handleDelete(promo.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Del
                                  </button>
                                </div>
                              ) : col === 'is_active' ? (
                                promo.is_active ? (
                                  <span className="px-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Y</span>
                                ) : (
                                  <span className="px-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">N</span>
                                )
                              ) : (
                                <span className={col === 'name' ? 'font-medium text-gray-900' : 'text-gray-500'}>
                                  {getCellDisplayValue(promo, col)}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DndContext>
            </div>
            <div className="bg-white border-t border-gray-200 px-4 py-2 flex-shrink-0 text-sm text-gray-700">
              <p>🟢 Active | 🔴 Expired | 🟡 Upcoming | 🟠 Depleted | ⚪ Inactive</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PromoCodeManager;
