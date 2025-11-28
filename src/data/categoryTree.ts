import { ProductGroup } from '../types';
import { supabase } from '../lib/supabase';
import { getCategoryIcon } from './categoryIcons';

// Initial empty array for category tree data
export let categoryTreeData: ProductGroup[] = [];

// Fetch category data from Supabase rt_taxonomy table
export const fetchCategoryData = async (): Promise<ProductGroup[]> => {
  try {
    
    // Query rt_taxonomy ordered by maingrp, subgrp
    const { data, error } = await supabase
      .from('rt_taxonomy')
      .select('*')
      .order('maingrp', { ascending: true })
      .order('subgrp', { ascending: true });

    if (error) {
      console.error('[categoryTree] Error fetching from rt_taxonomy:', error);
      console.error('[categoryTree] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('[categoryTree] No data returned from rt_taxonomy');
      return [];
    }

    console.log('[categoryTree] Successfully fetched', data.length, 'rows from rt_taxonomy');
    console.log('[categoryTree] Sample row:', data[0]);
    
    // Transform the data to the expected format
    const transformed = buildCategoryTreeFromRtTaxonomy(data);
    
    console.log('[categoryTree] Transformed into', transformed.length, 'main categories');
    
    // Cache the data
    categoryTreeData = transformed;
    
    return transformed;
  } catch (error) {
    console.error('[categoryTree] Exception in fetchCategoryData:', error);
    return [];
  }
};

// Helper function to build tree from rt_taxonomy table (ordered by maingrp, subgrp)
export const buildCategoryTreeFromRtTaxonomy = (rawData: any[]): ProductGroup[] => {
  const tree: ProductGroup[] = [];
  const mainCategories = new Map<string, ProductGroup>();
  
  // First pass: collect all unique main categories
  rawData.forEach(row => {
    const mainCat = row.maingrp;
    if (mainCat && !mainCategories.has(mainCat)) {
      const mainGroup: ProductGroup = {
        id: `main_${mainCat.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: mainCat,
        level: 1,
        parentId: null,
        children: [],
        prdmaingrp: mainCat,
        icon: getCategoryIcon(mainCat)
      };
      mainCategories.set(mainCat, mainGroup);
      tree.push(mainGroup);
    }
  });
  
  // Second pass: add subcategories (data is already ordered by maingrp, subgrp)
  rawData.forEach(row => {
    const mainCat = row.maingrp;
    const subCat = row.subgrp;
    
    if (mainCat && subCat) {
      const mainGroup = mainCategories.get(mainCat);
      if (mainGroup) {
        // Check if this subcategory already exists
        const subId = `sub_${mainCat.replace(/[^a-zA-Z0-9]/g, '_')}_${subCat.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const existingSubGroup = mainGroup.children?.find(child => child.id === subId);
        
        if (!existingSubGroup) {
          const subGroup: ProductGroup = {
            id: subId,
            name: subCat,
            level: 2,
            parentId: mainGroup.id,
            prdsubgrp: subCat
          };
          mainGroup.children = mainGroup.children || [];
          mainGroup.children.push(subGroup);
        }
      }
    }
  });
  
  // Data is already sorted by the query, but maintain order
  return tree;
};

// Original helper function (kept for backwards compatibility if needed)
export const buildCategoryTree = (rawData: any[]): ProductGroup[] => {
  const tree: ProductGroup[] = [];
  const mainGroups = new Map<string, ProductGroup>();

  // Sort rawData by prdmaincat and prdsubcat
  const sortedRawData = [...rawData].sort((a, b) => {
    const mainCatCompare = a.prdmaincat.localeCompare(b.prdmaincat);
    if (mainCatCompare !== 0) {
      return mainCatCompare;
    }
    return (a.prdsubcat || '').localeCompare(b.prdsubcat || '');
  });

  // Process main groups (level 1)
  sortedRawData?.forEach(row => {
    if (row.is_main_category && !mainGroups.has(row.category_code)) {
      const group: ProductGroup = {
        id: `main_${row.category_code}`,
        name: row.category_name,
        level: 1,
        parentId: null,
        children: [],
        prdmaingrp: row.category_code,
        icon: row.icon_name
      };
      mainGroups.set(row.category_code, group);
      tree.push(group);
    }
  });

  // Process sub groups (level 2)
  sortedRawData?.forEach(row => {
    if (!row.is_main_category && row.parent_category_code) {
      const mainGroup = mainGroups.get(row.parent_category_code);
      if (mainGroup) {
        const existingSubGroup = mainGroup.children?.find(
          child => child.id === `sub_${row.parent_category_code}_${row.category_code}`
        );
        
        if (!existingSubGroup) {
          const subGroup: ProductGroup = {
            id: `sub_${row.parent_category_code}_${row.category_code}`,
            name: row.category_name,
            level: 2,
            parentId: mainGroup.id,
            prdsubgrp: row.category_code,
            productCount: row.product_count || 0
          };
          mainGroup.children = mainGroup.children || [];
          mainGroup.children.push(subGroup);
        }
      }
    }
  });

  return tree;
};
