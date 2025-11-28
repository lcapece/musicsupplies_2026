import React, { useState, useEffect } from 'react';
import { ProductGroup } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { fetchCategoryData } from '../data/simpleCategoryTree';

// Define TreeNode structure consistent with what ManageTreeviewTab stores in localStorage
interface LocalTreeNode {
  id: string; 
  name: string;
  parent_id: string | null; 
  children?: LocalTreeNode[];
  is_main_category: boolean;
  icon_name: string | null;
}

export interface CategorySelection {
  id: string; // category_code
  namePath: string[]; // Path of names from root to selected category
  level: number;
  isMainCategory: boolean;
  parentCategoryCode?: string | null; // Only relevant if not a main category
}

interface CategoryTreeProps {
  onSelectCategory: (selection: CategorySelection | null) => void;
  selectedCategoryId: string | null;
  fontSize?: 'smaller' | 'standard' | 'larger';
}

// Icon components removed

interface CategoryTreeItemProps {
  category: ProductGroup;
  level: number;
  onSelectCategory: (selection: CategorySelection) => void;
  selectedCategoryId: string | null;
  currentNamePath: string[];
  fontSize: 'smaller' | 'standard' | 'larger';
  expandAll: boolean;
}

const CategoryTreeItem = ({ category, level, onSelectCategory, selectedCategoryId, currentNamePath, fontSize, expandAll }: CategoryTreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false); // Default to collapsed
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedCategoryId === category.id;

  useEffect(() => {
    if (selectedCategoryId !== null) {
      if (category.id && selectedCategoryId.startsWith(category.id) && category.id !== selectedCategoryId) {
        setIsExpanded(true);
      }
    }
  }, [selectedCategoryId, category.id, level]);

  useEffect(() => {
    if (hasChildren) {
      setIsExpanded(expandAll);
    }
  }, [expandAll, hasChildren]);
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleSelect = () => {
    const newNamePath = [...currentNamePath, category.name];
    const isMain = category.level === 1;

    onSelectCategory({ 
      id: category.id, 
      namePath: newNamePath, 
      level: category.level,
      isMainCategory: isMain,
      parentCategoryCode: category.parentId
    });
    
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };
  
  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-2 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-100' : ''}`}
        onClick={handleSelect}
        style={{ paddingLeft: `${level === 1 ? 8 : (level === 2 ? 20 : (level - 1) * 20 + 8)}px` }}
      >
        {hasChildren ? (
          <span onClick={handleToggle} className="mr-2 flex-shrink-0">
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        ) : (
          <span className="mr-2 w-5 flex-shrink-0"></span>
        )}
        {category.icon && level === 1 && (
          <img 
            src={category.icon} 
            alt={category.name}
            className="w-6 h-6 mr-2 flex-shrink-0 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <span className={`${
          fontSize === 'smaller' ? 'font-professional-smaller' : 
          fontSize === 'standard' ? 'font-professional-standard' : 
          'font-professional-larger'
        } text-left truncate ${level === 2 ? 'text-blue-600' : ''}`}>
          {category.name}
        </span>
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {category.children?.map((child: ProductGroup) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              level={level + 1}
              onSelectCategory={onSelectCategory}
              selectedCategoryId={selectedCategoryId}
              currentNamePath={[...currentNamePath, category.name]}
              fontSize={fontSize}
              expandAll={expandAll}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryTree = ({ 
  onSelectCategory,
  selectedCategoryId,
  fontSize = 'standard'
}: CategoryTreeProps) => {
  const [categories, setCategories] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategoryData();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories for CategoryTree:', err);
      setError(err instanceof Error ? err.message : 'An error occurred loading categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();

    // Listen for refresh event
    const handleRefresh = () => {
      loadCategories();
    };

    window.addEventListener('refreshCategoryTree', handleRefresh);
    window.addEventListener('storage', (e) => {
      if (e.key === 'musicSupplies_useTreeViewForNavigation' || 
          e.key === 'musicSupplies_siteNavigationTreeData') {
        loadCategories();
      }
    });

    return () => {
      window.removeEventListener('refreshCategoryTree', handleRefresh);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc((100vh-12rem)*0.9)] p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc((100vh-12rem)*0.9)] p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 h-full overflow-hidden w-64 flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700">Product Categories</h3>
          <button
            onClick={() => setExpandAll(!expandAll)}
            className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
            title={expandAll ? "Collapse all categories" : "Expand all categories"}
          >
            {expandAll ? "Collapse All" : "Expand All"}
          </button>
        </div>
      </div>
      <div className="p-2 flex-1 overflow-y-auto">
        {categories.map(category => (
          <CategoryTreeItem
            key={category.id}
            category={category}
            level={1}
            onSelectCategory={onSelectCategory}
            selectedCategoryId={selectedCategoryId}
            currentNamePath={[]}
            fontSize={fontSize}
            expandAll={expandAll}
          />
        ))}
        <div 
          className="flex items-center py-2 cursor-pointer hover:bg-gray-100 mt-2 border-t pt-3"
          onClick={() => onSelectCategory(null)}
          style={{ paddingLeft: '8px' }}
        >
          <span className="mr-2 w-5 flex-shrink-0"></span>
          <span className="text-sm text-left text-gray-600 italic">Show All Products</span>
        </div>
      </div>
    </div>
  );
};

export default CategoryTree;
