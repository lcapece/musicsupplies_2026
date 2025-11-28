import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Product {
  partnumber: string;
  description: string;
  price: number | null;
  prdmaincat: string;
  prdsubcat: string;
  prdmetacat: string;
  webmsrp: number | null;
  longdescription: string;
  groupedimage: string;
  upc: string;
  brand: string;
  map: number | null;
  masterdescr: string;
  image: string;
  listprice: number | null;
  inv_max: number | null;
  inv_min: number | null;
  vendor: string;
  vendor_part_number: string;
  master_carton_qty: number | null;
  master_carton_price: number | null;
  unit_cost: number | null;
  // Internal tracking
  _isNew?: boolean;
  _isDirty?: boolean;
  _rowIndex?: number;
}

export interface ProductTemplate {
  partnumber: string;
  description: string;
  price: number | null;
  prdmaincat: string;
  prdsubcat: string;
  prdmetacat: string;
  webmsrp: number | null;
  longdescription: string;
  groupedimage: string;
  upc: string;
  brand: string;
  map: number | null;
  masterdescr: string;
  image: string;
  listprice: number | null;
  inv_max: number | null;
  inv_min: number | null;
  vendor: string;
  vendor_part_number: string;
  master_carton_qty: number | null;
  master_carton_price: number | null;
  unit_cost: number | null;
}

const emptyTemplate: ProductTemplate = {
  partnumber: '',
  description: '',
  price: null,
  prdmaincat: '',
  prdsubcat: '',
  prdmetacat: '',
  webmsrp: null,
  longdescription: '',
  groupedimage: '',
  upc: '',
  brand: '',
  map: null,
  masterdescr: '',
  image: '',
  listprice: null,
  inv_max: null,
  inv_min: null,
  vendor: '',
  vendor_part_number: '',
  master_carton_qty: null,
  master_carton_price: null,
  unit_cost: null
};

interface UseProductManagerReturn {
  template: ProductTemplate;
  variations: Product[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  successMessage: string | null;
  categories: { main: string[]; sub: string[]; meta: string[] };
  brands: string[];
  vendors: string[];

  // Actions
  setTemplate: (template: ProductTemplate) => void;
  updateTemplateField: (field: keyof ProductTemplate, value: any) => void;
  generateVariations: (count: number) => void;
  updateVariation: (index: number, field: keyof Product, value: any) => void;
  removeVariation: (index: number) => void;
  clearAll: () => void;
  saveAllProducts: (username: string) => Promise<boolean>;
  loadExistingProduct: (partnumber: string) => Promise<boolean>;
  fetchDropdownData: () => Promise<void>;
}

export const useProductManager = (): UseProductManagerReturn => {
  const [template, setTemplate] = useState<ProductTemplate>(emptyTemplate);
  const [variations, setVariations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ main: string[]; sub: string[]; meta: string[] }>({
    main: [],
    sub: [],
    meta: []
  });
  const [brands, setBrands] = useState<string[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);

  const fetchDropdownData = useCallback(async () => {
    try {
      // Fetch distinct categories
      const { data: mainCats } = await supabase
        .from('pre_products_supabase')
        .select('prdmaincat')
        .not('prdmaincat', 'is', null)
        .not('prdmaincat', 'eq', '');

      const { data: subCats } = await supabase
        .from('pre_products_supabase')
        .select('prdsubcat')
        .not('prdsubcat', 'is', null)
        .not('prdsubcat', 'eq', '');

      const { data: metaCats } = await supabase
        .from('pre_products_supabase')
        .select('prdmetacat')
        .not('prdmetacat', 'is', null)
        .not('prdmetacat', 'eq', '');

      const { data: brandData } = await supabase
        .from('pre_products_supabase')
        .select('brand')
        .not('brand', 'is', null)
        .not('brand', 'eq', '');

      const { data: vendorData } = await supabase
        .from('pre_products_supabase')
        .select('vendor')
        .not('vendor', 'is', null)
        .not('vendor', 'eq', '');

      // Extract unique values
      const uniqueMain = [...new Set(mainCats?.map(r => r.prdmaincat).filter(Boolean))].sort();
      const uniqueSub = [...new Set(subCats?.map(r => r.prdsubcat).filter(Boolean))].sort();
      const uniqueMeta = [...new Set(metaCats?.map(r => r.prdmetacat).filter(Boolean))].sort();
      const uniqueBrands = [...new Set(brandData?.map(r => r.brand).filter(Boolean))].sort();
      const uniqueVendors = [...new Set(vendorData?.map(r => r.vendor).filter(Boolean))].sort();

      setCategories({
        main: uniqueMain as string[],
        sub: uniqueSub as string[],
        meta: uniqueMeta as string[]
      });
      setBrands(uniqueBrands as string[]);
      setVendors(uniqueVendors as string[]);
    } catch (err) {
      console.error('Failed to fetch dropdown data:', err);
    }
  }, []);

  const updateTemplateField = useCallback((field: keyof ProductTemplate, value: any) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  }, []);

  const generateVariations = useCallback((count: number) => {
    const newVariations: Product[] = [];
    for (let i = 0; i < count; i++) {
      newVariations.push({
        ...template,
        _isNew: true,
        _isDirty: true,
        _rowIndex: i
      });
    }
    setVariations(prev => [...prev, ...newVariations]);
  }, [template]);

  const updateVariation = useCallback((index: number, field: keyof Product, value: any) => {
    setVariations(prev => prev.map((v, i) =>
      i === index ? { ...v, [field]: value, _isDirty: true } : v
    ));
  }, []);

  const removeVariation = useCallback((index: number) => {
    setVariations(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setTemplate(emptyTemplate);
    setVariations([]);
    setError(null);
    setSuccessMessage(null);
  }, []);

  const loadExistingProduct = useCallback(async (partnumber: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('pre_products_supabase')
        .select('*')
        .eq('partnumber', partnumber)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setTemplate({
          partnumber: data.partnumber || '',
          description: data.description || '',
          price: data.price,
          prdmaincat: data.prdmaincat || '',
          prdsubcat: data.prdsubcat || '',
          prdmetacat: data.prdmetacat || '',
          webmsrp: data.webmsrp,
          longdescription: data.longdescription || '',
          groupedimage: data.groupedimage || '',
          upc: data.upc || '',
          brand: data.brand || '',
          map: data.map,
          masterdescr: data.masterdescr || '',
          image: data.image || '',
          listprice: data.listprice,
          inv_max: data.inv_max,
          inv_min: data.inv_min,
          vendor: data.vendor || '',
          vendor_part_number: data.vendor_part_number || '',
          master_carton_qty: data.master_carton_qty,
          master_carton_price: data.master_carton_price,
          unit_cost: data.unit_cost
        });
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAllProducts = useCallback(async (username: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Validate all products have partnumbers
      const productsToSave = variations.filter(v => v.partnumber.trim());

      if (productsToSave.length === 0) {
        setError('No products to save. Please add part numbers.');
        return false;
      }

      // Check for duplicate partnumbers in batch
      const partnumbers = productsToSave.map(p => p.partnumber);
      const duplicates = partnumbers.filter((item, index) => partnumbers.indexOf(item) !== index);
      if (duplicates.length > 0) {
        setError(`Duplicate part numbers in batch: ${[...new Set(duplicates)].join(', ')}`);
        return false;
      }

      // Check if any partnumbers already exist in database
      const { data: existingProducts } = await supabase
        .from('pre_products_supabase')
        .select('partnumber')
        .in('partnumber', partnumbers);

      if (existingProducts && existingProducts.length > 0) {
        const existingPNs = existingProducts.map(p => p.partnumber);
        setError(`Part numbers already exist: ${existingPNs.join(', ')}`);
        return false;
      }

      const now = new Date().toISOString();

      // Prepare products for insert
      const productsForInsert = productsToSave.map(p => ({
        partnumber: p.partnumber,
        description: p.description || null,
        price: p.price,
        prdmaincat: p.prdmaincat || null,
        prdsubcat: p.prdsubcat || null,
        prdmetacat: p.prdmetacat || null,
        webmsrp: p.webmsrp,
        longdescription: p.longdescription || null,
        groupedimage: p.groupedimage || null,
        upc: p.upc || null,
        brand: p.brand || null,
        map: p.map,
        masterdescr: p.masterdescr || null,
        image: p.image || null,
        listprice: p.listprice,
        inv_max: p.inv_max,
        inv_min: p.inv_min,
        vendor: p.vendor || null,
        vendor_part_number: p.vendor_part_number || null,
        master_carton_qty: p.master_carton_qty,
        master_carton_price: p.master_carton_price,
        unit_cost: p.unit_cost,
        date_created: now,
        date_edited: now,
        person_edited: username,
        last_edited: now
      }));

      const { error: insertError } = await supabase
        .from('pre_products_supabase')
        .insert(productsForInsert);

      if (insertError) throw insertError;

      setSuccessMessage(`Successfully saved ${productsForInsert.length} products!`);
      setVariations([]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save products');
      return false;
    } finally {
      setSaving(false);
    }
  }, [variations]);

  return {
    template,
    variations,
    loading,
    saving,
    error,
    successMessage,
    categories,
    brands,
    vendors,
    setTemplate,
    updateTemplateField,
    generateVariations,
    updateVariation,
    removeVariation,
    clearAll,
    saveAllProducts,
    loadExistingProduct,
    fetchDropdownData
  };
};

export default useProductManager;
