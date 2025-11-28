import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronDown, ChevronRight, RefreshCw, Guitar, Speaker, Drum, Music, Cable, HelpCircle, Image as ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { IconGenerator } from '../../utils/iconGenerator';

interface FetchedItem { 
  prdmaincat: string;
  prdsubcat: string | null;
}

interface TreeNode {
  id: string; 
  name: string; 
  parent_id: string | null; 
  children?: TreeNode[];
  is_main_category: boolean; 
  icon_name: string | null; 
  originalItemData: FetchedItem; 
}

const ManageTreeviewTab: React.FC = () => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [useForSiteNavigation, setUseForSiteNavigation] = useState(() => {
    const storedValue = localStorage.getItem('musicSupplies_useTreeViewForNavigation');
    return storedValue !== null ? JSON.parse(storedValue) : true; 
  });

  const [selectedNodeForIcon, setSelectedNodeForIcon] = useState<TreeNode | null>(null);
  const [iconDescription, setIconDescription] = useState('');
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [iconApiKey, setIconApiKey] = useState<string>(() => localStorage.getItem('musicSupplies_iconApiKey') || ''); 
  const [selectedGeneratedImageUrl, setSelectedGeneratedImageUrl] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [iconGenerationStatus, setIconGenerationStatus] = useState<string | null>(null);
  
  // State for custom icon persistence
  const [customIconMap, setCustomIconMap] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem('musicSupplies_iconApiKey', iconApiKey);
  }, [iconApiKey]);

  // Load custom icons map on mount
  useEffect(() => {
    const storedIcons = localStorage.getItem('musicSupplies_customCategoryIcons');
    if (storedIcons) {
      try {
        setCustomIconMap(JSON.parse(storedIcons));
      } catch (e) {
        console.error("Failed to parse custom icons from localStorage", e);
        localStorage.removeItem('musicSupplies_customCategoryIcons'); // Clear corrupted data
      }
    }
  }, []);

  const fetchDataFromView = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: viewError } = await supabase
        .from('treeview_datasource') 
        .select('prdmaincat, prdsubcat') 
        .order('prdmaincat', { ascending: true })
        .order('prdsubcat', { ascending: true });

      if (viewError) {
        console.error('[ManageTreeviewTab] Supabase query error:', viewError.message);
        throw viewError; 
      }
      
      const fetchedItems: FetchedItem[] = (data || []).filter(
        (item): item is FetchedItem => 
          typeof item.prdmaincat === 'string' && item.prdmaincat.trim() !== '' &&
          typeof item.prdsubcat === 'string' && item.prdsubcat.trim() !== ''
      );
      
      // Pass customIconMap to buildTree so it can use persisted icons
      const transformedData = buildTree(fetchedItems, null, customIconMap);
      setTreeData(transformedData);

      if (transformedData.length === 0 && fetchedItems.length > 0) {
        console.warn('[ManageTreeviewTab] buildTree resulted in empty array, but source items were present. Check data structure and buildTree logic.');
      } else if (transformedData.length === 0 && fetchedItems.length === 0) {
      }
    } catch (err: any) {
      console.error('[ManageTreeviewTab] Error in fetchDataFromView:', err);
      setError(`Failed to load tree data: ${err.message}`);
      setTreeData([]);
    } finally {
      setIsLoading(false);
    }
  }, [customIconMap]); // Add customIconMap as dependency

  useEffect(() => {
    fetchDataFromView();
  }, [fetchDataFromView]);

  const serializeNodeForStorage = (node: TreeNode): any => ({
    id: node.id,
    name: node.name,
    parent_id: node.parent_id,
    is_main_category: node.is_main_category,
    icon_name: node.icon_name,
    children: node.children ? node.children.map(serializeNodeForStorage) : undefined,
  });

  useEffect(() => {
    localStorage.setItem('musicSupplies_useTreeViewForNavigation', JSON.stringify(useForSiteNavigation));
    if (useForSiteNavigation && treeData.length > 0) {
      const serializableTreeData = treeData.map(serializeNodeForStorage);
      localStorage.setItem('musicSupplies_siteNavigationTreeData', JSON.stringify(serializableTreeData));
    } else if (!useForSiteNavigation) {
      // localStorage.removeItem('musicSupplies_siteNavigationTreeData');
    }
  }, [useForSiteNavigation, treeData]);

  const buildTree = (
    items: FetchedItem[], 
    currentParentMainCat: string | null = null,
    currentCustomIconMap: Record<string, string> // Pass down the map
  ): TreeNode[] => {
    const treeNodes: TreeNode[] = [];
    if (currentParentMainCat === null) {
      const uniqueMainCats = new Map<string, FetchedItem>();
      items.forEach(item => {
        if (item.prdmaincat && !uniqueMainCats.has(item.prdmaincat)) {
          uniqueMainCats.set(item.prdmaincat, { prdmaincat: item.prdmaincat, prdsubcat: null });
        }
      });
      uniqueMainCats.forEach(mainItemRep => {
        const children = buildTree(items, mainItemRep.prdmaincat, currentCustomIconMap);
        const mainNodeName = mainItemRep.prdmaincat;
        treeNodes.push({
          id: mainNodeName,
          name: mainNodeName, 
          parent_id: null,
          is_main_category: true,
          icon_name: currentCustomIconMap[mainNodeName] || mainNodeName, // Use custom icon if exists
          children: children.length > 0 ? children : undefined,
          originalItemData: mainItemRep, 
        });
      });
    } else {
      items.forEach(item => {
        if (item.prdmaincat === currentParentMainCat && item.prdsubcat) { 
          treeNodes.push({
            id: `${item.prdmaincat}_${item.prdsubcat}`,
            name: item.prdsubcat, 
            parent_id: item.prdmaincat,
            is_main_category: false,
            icon_name: null, 
            children: undefined, 
            originalItemData: item,
          });
        }
      });
    }
    return treeNodes.sort((a,b) => a.name.localeCompare(b.name));
  };

  const handleSelectNodeForIcon = (node: TreeNode) => {
    if (node.is_main_category) {
      setSelectedNodeForIcon(node);
      setIconDescription(node.name); 
      setGeneratedImageUrls([]);
      setSelectedGeneratedImageUrl(null);
      setIconError(null);
      setIconGenerationStatus(null);
    } else {
      setSelectedNodeForIcon(null); 
    }
  };
  
  const handleGenerateIconDesigns = async () => {
    if (!iconApiKey) {
      setIconError("OpenAI API Key is required. Please enter a valid key.");
      setIconGenerationStatus(null);
      return;
    }
    if (!iconDescription.trim()) {
      setIconError("Icon description cannot be empty.");
      setIconGenerationStatus(null);
      return;
    }
    if (!selectedNodeForIcon) {
      setIconError("No main category node selected.");
      setIconGenerationStatus(null);
      return;
    }

    setIsGeneratingIcon(true);
    setGeneratedImageUrls([]);
    setSelectedGeneratedImageUrl(null);
    setIconError(null);
    setIconGenerationStatus("Initializing image generation...");

    const categoryIconRequest: import('../../utils/iconGenerator').CategoryIconRequest = {
      categoryName: iconDescription, 
      isMainCategory: true, 
    };
    
    try {
      const urls: string[] = [];
      for (let i = 0; i < 4; i++) {
        setIconGenerationStatus(`Generating design ${i + 1} of 4...`);
        const imageUrl = await IconGenerator.generateCategoryIcon(categoryIconRequest, iconApiKey);
        if (imageUrl) {
          urls.push(imageUrl);
        } else {
          throw new Error(`Failed to generate image variant ${i + 1}. OpenAI API might have returned no URL.`);
        }
      }
      setGeneratedImageUrls(urls);
      setIconGenerationStatus("All 4 designs generated successfully.");
    } catch (err: any) {
      console.error("Error generating icon designs:", err);
      let errorMessage = "Failed to generate icon designs.";
      if (err.message) {
        errorMessage = err.message;
      }
      if (err.status === 401 || (err.message && err.message.includes("401"))) {
        errorMessage = "OpenAI API Key is incorrect or invalid. Please check your key and try again. (Status 401)";
      }
      setIconError(errorMessage);
      setIconGenerationStatus(null); 
      setGeneratedImageUrls([]);
    } finally {
      setIsGeneratingIcon(false);
    }
  };

  const handleUseSelectedIcon = () => {
    if (selectedNodeForIcon && selectedGeneratedImageUrl) {
      const nodeName = selectedNodeForIcon.name; // This is prdmaincat for main nodes

      // Update the customIconMap state and save to localStorage
      const newCustomIconMap = { ...customIconMap, [nodeName]: selectedGeneratedImageUrl };
      setCustomIconMap(newCustomIconMap);
      localStorage.setItem('musicSupplies_customCategoryIcons', JSON.stringify(newCustomIconMap));

      // Update the treeData state to reflect the change immediately
      setTreeData(prevTreeData => {
        const updateNodeInTree = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map(node => {
            if (node.id === selectedNodeForIcon.id) { // node.id is prdmaincat for main nodes
              return { ...node, icon_name: selectedGeneratedImageUrl }; 
            }
            if (node.children) {
              return { ...node, children: updateNodeInTree(node.children) };
            }
            return node;
          });
        };
        return updateNodeInTree(prevTreeData);
      });
      
      setIconGenerationStatus(`Icon for '${nodeName}' updated with selected design.`);
      setSelectedNodeForIcon(null); 
      setIconDescription('');
      setGeneratedImageUrls([]);
      setSelectedGeneratedImageUrl(null);
      setIconError(null);
    }
  };

  const TreeNodeDisplay: React.FC<{ 
    node: TreeNode; 
    level: number;
    onSelectNode: (node: TreeNode) => void; 
    isSelected: boolean; 
  }> = ({ node, level, onSelectNode, isSelected }) => {
    const [isOpen, setIsOpen] = useState(level < 1); 

    const handleNodeClick = (event: React.MouseEvent) => {
      event.stopPropagation(); 
      if (node.is_main_category) {
        onSelectNode(node);
      }
      if (node.children && node.children.length > 0) {
        setIsOpen(!isOpen);
      }
    };
    
    const displayIcon = () => {
      if (node.icon_name && (node.icon_name.startsWith('http://') || node.icon_name.startsWith('https://'))) {
        return <img src={node.icon_name} alt={node.name} className="w-5 h-5 object-contain" />;
      }
      return getLucideIcon(node.icon_name);
    };

    return (
      <li className="my-1 list-none"> 
        <div 
          className={`flex items-center py-1 px-2 rounded hover:bg-gray-100 cursor-pointer ${isSelected ? 'bg-blue-200 ring-2 ring-blue-500' : ''}`}
          // Indentation: level 0 (main) has minimal base padding (e.g., from px-2 on the div).
          // level 1 (sub) gets additional padding. 2.5rem is approx 40px.
          // If base padding of container is effectively 0 for text, then level * 2.5rem works.
          // Let's use a base padding for the container and add for sub-levels.
          // The overall div has px-2 (0.5rem).
          // Main (level 0) will have this 0.5rem.
          // Sub (level 1) needs additional ~5 chars. Let's try adding 1.25rem (20px) for subs.
          // So, level 0: 0.5rem (from parent). level 1: 0.5rem (from parent) + 1.25rem.
          // This means the style should be `level * 1.25rem` if the parent div itself has some base padding.
          // Or, more simply, `paddingLeft: level === 0 ? '0.5rem' : '2.0rem'` (assuming 0.5rem is base, 1.5rem is ~5-6 chars)
          // Let's try: level 0 = 0.5rem (implicit from px-2), level 1 = 0.5rem + 1.25rem = 1.75rem
          // The current style is: style={{ paddingLeft: `${0.5 + level * 1}rem` }}
          // This gives: level 0 = 0.5rem, level 1 = 1.5rem. Difference is 1rem.
          // To make difference ~5 chars (approx 2rem if 1 char ~ 0.4rem or 6-7px wide)
          // Let level 0 be 0.5rem. Level 1 be 0.5rem + 2rem = 2.5rem.
          // So, paddingLeft: `${0.5 + level * 2.0}rem`
          // User wants 300% greater indent for level 1. Original additional indent was 1.0rem (1.5 - 0.5).
          // 300% greater means 1.0rem + 3.0rem = 4.0rem additional indent.
          // So, level 0: 0.5rem. Level 1: 0.5rem + 4.0rem = 4.5rem.
          // Formula: 0.5 + level * 4.0
          // LATEST FEEDBACK: reduce this additional indent (4.0rem) by 40%.
          // New additional indent = 4.0rem * (1 - 0.40) = 4.0rem * 0.60 = 2.4rem.
          // So, level 0: 0.5rem. Level 1: 0.5rem + 2.4rem = 2.9rem.
          // Formula: 0.5 + level * 2.4
          style={{ paddingLeft: `${0.5 + level * 2.4}rem` }} // level 0: 0.5rem, level 1: 2.9rem
          onClick={handleNodeClick}
        >
          {node.children && node.children.length > 0 ? (
            <span onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="cursor-pointer">
              {isOpen ? <ChevronDown size={16} className="mr-2 text-gray-600 shrink-0" /> : <ChevronRight size={16} className="mr-2 text-gray-600 shrink-0" />}
            </span>
          ) : (
            <span className="w-4 mr-2 shrink-0"></span> 
          )}
          
          {node.is_main_category && (
            <span className="mr-2 h-5 w-5 flex items-center justify-center shrink-0">
              {displayIcon()}
            </span>
          )}

          <span className={`text-sm ${
            node.is_main_category 
              ? 'font-bold text-blue-600' // Main: Blue and Bold
              : 'text-gray-700'             // Sub: Default gray (was text-gray-600)
          }`}>
            {node.name}
          </span>
        </div>
        {isOpen && node.children && node.children.length > 0 && (
          <ul className="pl-0"> 
            {node.children.map(childNode => (
              <TreeNodeDisplay 
                key={childNode.id} 
                node={childNode} 
                level={level + 1} 
                onSelectNode={onSelectNode}
                isSelected={selectedNodeForIcon?.id === childNode.id && childNode.is_main_category}
              />
            ))}
          </ul>
        )}
      </li>
    );
  };

  const getLucideIcon = (iconName: string | null): JSX.Element => {
    if (!iconName) return <HelpCircle size={18} className="text-gray-400" />;
    const name = iconName.toLowerCase();
    if (name.includes('fretted') || name.includes('guitar')) return <Guitar size={18} className="text-gray-600" />;
    if (name.includes('amp') || name.includes('speaker') || name.includes('sound')) return <Speaker size={18} className="text-gray-600" />;
    if (name.includes('drum') || name.includes('percussion')) return <Drum size={18} className="text-gray-600" />;
    if (name.includes('cable')) return <Cable size={18} className="text-gray-600" />;
    if (name.includes('instructional') || name.includes('keyboards') || name.includes('pianos')) return <Music size={18} className="text-gray-600" />;
    return <HelpCircle size={18} className="text-gray-400" />; 
  };

  const renderTreeNodes = (nodes: TreeNode[]): JSX.Element => {
    if (!nodes || nodes.length === 0) {
      return <p className="text-gray-500">No tree data to display. Try refreshing.</p>;
    }
    return (
      <ul className="pl-0"> 
        {nodes.map(node => (
          <TreeNodeDisplay 
            key={node.id} 
            node={node} 
            level={0} 
            onSelectNode={handleSelectNodeForIcon}
            isSelected={selectedNodeForIcon?.id === node.id && node.is_main_category}
          />
        ))}
      </ul>
    );
  };

  const handleRefresh = () => {
    fetchDataFromView(); // This will now use the loaded customIconMap in buildTree
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setUseForSiteNavigation(isChecked);
    if (isChecked) {
      if (treeData.length > 0) {
         const serializableTreeData = treeData.map(serializeNodeForStorage);
        localStorage.setItem('musicSupplies_siteNavigationTreeData', JSON.stringify(serializableTreeData));
      }
    } else {
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Manage Treeview</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium text-gray-700">Treeview Preview</h3>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw size={18} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {error && <div className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</div>}
          <div className="border border-gray-300 rounded-md p-4 min-h-[300px] max-h-[60vh] bg-gray-50 overflow-auto">
            {treeData.length > 0 ? renderTreeNodes(treeData) : <p className="text-gray-500">No tree data to display. Try refreshing.</p>}
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-medium text-gray-700 mb-4">Custom Icon Generation</h3>
          {!selectedNodeForIcon && (
            <p className="text-gray-500">Select a main category node from the preview to generate a custom icon.</p>
          )}
          {selectedNodeForIcon && (
            <div>
              <p className="mb-2 text-gray-700">Selected Node: <span className="font-semibold">{selectedNodeForIcon.name}</span></p>
              <div className="mb-4">
                <label htmlFor="iconApiKey" className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
                <input
                  type="text" 
                  id="iconApiKey"
                  value={iconApiKey}
                  onChange={(e) => setIconApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your OpenAI API Key"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="iconDescription" className="block text-sm font-medium text-gray-700 mb-1">Icon Description</label>
                <input
                  type="text"
                  id="iconDescription"
                  value={iconDescription}
                  onChange={(e) => setIconDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., acoustic guitars, drum sets"
                />
              </div>
              <button
                onClick={handleGenerateIconDesigns}
                disabled={isGeneratingIcon || !iconApiKey || !iconDescription.trim()}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 w-full mb-2"
              >
                {isGeneratingIcon ? <Loader2 size={18} className="mr-2 animate-spin" /> : <ImageIcon size={18} className="mr-2" />}
                {isGeneratingIcon ? 'Generating...' : 'Generate 4 Designs'}
              </button>
              
              {iconGenerationStatus && !iconError && ( // Show status only if no overriding error
                <p className={`text-sm mt-1 mb-2 ${generatedImageUrls.length > 0 && !isGeneratingIcon ? 'text-green-600' : 'text-gray-600'}`}>
                  {iconGenerationStatus}
                </p>
              )}
              {iconError && ( 
                 <div className="mt-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
                    <div className="flex items-center">
                        <AlertTriangle size={18} className="mr-2 shrink-0" />
                        <span>{iconError}</span>
                    </div>
                 </div>
              )}

              {generatedImageUrls.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-gray-700 mb-2 mt-3">Generated Designs (PNGs):</h4>
                  <p className="text-xs text-gray-500 mb-2">Note: These are PNG images. True SVG conversion from raster images is complex and not automatically handled. The selected PNG URL will be used as the icon.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {generatedImageUrls.map((url, index) => (
                      <div key={index} 
                           className={`border rounded-md p-2 cursor-pointer ${selectedGeneratedImageUrl === url ? 'ring-2 ring-blue-500' : 'border-gray-300'}`}
                           onClick={() => setSelectedGeneratedImageUrl(url)}>
                        <img src={url} alt={`Generated Design ${index + 1}`} className="w-full h-auto object-contain rounded aspect-square bg-white" />
                        <div className="mt-2 text-center">
                          <input 
                            type="radio" 
                            id={`icon-select-${index}`} 
                            name="selectedIcon" 
                            value={url}
                            checked={selectedGeneratedImageUrl === url}
                            onChange={() => setSelectedGeneratedImageUrl(url)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor={`icon-select-${index}`} className="ml-2 text-sm text-gray-700">Use</label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleUseSelectedIcon}
                    disabled={!selectedGeneratedImageUrl}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 w-full"
                  >
                    Use Selected Design for '{selectedNodeForIcon.name}'
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mt-6">
        <h3 className="text-xl font-medium text-gray-700 mb-4">Settings</h3>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="useForSiteNavigation"
            checked={useForSiteNavigation}
            onChange={handleCheckboxChange}
            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="useForSiteNavigation" className="ml-3 block text-md font-medium text-gray-700">
            Use this Tree View for site product navigation
          </label>
        </div>
        {useForSiteNavigation && (
          <p className="mt-2 text-sm text-gray-600">
            When checked, the tree structure previewed above (including any custom icons) will be used for the main product category navigation on the customer-facing site.
          </p>
        )}
      </div>
    </div>
  );
};

export default ManageTreeviewTab;
