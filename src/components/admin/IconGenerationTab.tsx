import React, { useState } from 'react';
import { IconGenerator, runIconGeneration } from '../../utils/iconGenerator';
import { categoryTreeData } from '../../data/categoryTree';

const IconGenerationTab: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleGenerateAllIcons = async () => {
    if (!apiKey.trim()) {
      setResults({ success: false, message: 'Please enter your OpenAI API key' });
      return;
    }

    setIsGenerating(true);
    setProgress('Starting icon generation...');
    setResults(null);

    try {
      const result = await runIconGeneration(apiKey);
      setResults(result);
    } catch (error) {
      setResults({ 
        success: false, 
        message: `Icon generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  const handleGenerateSingleIcon = async () => {
    if (!apiKey.trim()) {
      setResults({ success: false, message: 'Please enter your OpenAI API key' });
      return;
    }

    if (!selectedCategory) {
      setResults({ success: false, message: 'Please select a category' });
      return;
    }

    setIsGenerating(true);
    setProgress(`Generating icon for ${selectedSubcategory || selectedCategory}...`);
    setResults(null);

    try {
      const iconPath = await IconGenerator.generateSingleIcon(
        selectedCategory, 
        apiKey,
        selectedSubcategory || undefined
      );
      
      if (iconPath) {
        setResults({ 
          success: true, 
          message: `Icon generated successfully: ${iconPath}` 
        });
      } else {
        setResults({ 
          success: false, 
          message: 'Failed to generate icon' 
        });
      }
    } catch (error) {
      setResults({ 
        success: false, 
        message: `Icon generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  const getSubcategories = () => {
    if (!selectedCategory) return [];
    const category = categoryTreeData.find(cat => cat.name === selectedCategory);
    return category?.children || [];
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          AI Icon Generation with DALL-E
        </h3>
        
        <div className="space-y-4">
          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sk-..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Your OpenAI API key (required for DALL-E image generation)
            </p>
          </div>

          {/* Generate All Icons */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-800 mb-3">
              Generate All Category Icons
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              This will generate icons for all {categoryTreeData.length} main categories and their subcategories.
              Estimated cost: ~$0.04 per icon × {categoryTreeData.reduce((acc, cat) => acc + 1 + (cat.children?.length || 0), 0)} icons = 
              ~${ (categoryTreeData.reduce((acc, cat) => acc + 1 + (cat.children?.length || 0), 0) * 0.04).toFixed(2) }
            </p>
            <button
              onClick={handleGenerateAllIcons}
              disabled={isGenerating || !apiKey.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate All Icons'}
            </button>
          </div>

          {/* Generate Single Icon */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-800 mb-3">
              Generate Single Icon
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Main Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubcategory('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categoryTreeData.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategory (Optional)
                </label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedCategory}
                >
                  <option value="">Main category only</option>
                  {getSubcategories().map(subcategory => (
                    <option key={subcategory.id} value={subcategory.name}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleGenerateSingleIcon}
              disabled={isGenerating || !apiKey.trim() || !selectedCategory}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate Single Icon'}
            </button>
          </div>

          {/* Progress */}
          {isGenerating && progress && (
            <div className="border-t pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-blue-800">{progress}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="border-t pt-4">
              <div className={`border rounded-md p-3 ${results.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className={results.success ? 'text-green-800' : 'text-red-800'}>
                  {results.message}
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-800 mb-3">
              How It Works
            </h4>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• Icons are generated using OpenAI's DALL-E 3 AI image generation</p>
              <p>• Each icon is created as a clean, minimalist design with black color on white background</p>
              <p>• Icons are saved to the <code className="bg-gray-100 px-1 rounded">/public/icons/</code> directory</p>
              <p>• Generated icons can replace the current SVG icons in the category tree</p>
              <p>• Cost: ~$0.04 per icon (DALL-E 3 pricing)</p>
            </div>
          </div>

          {/* Category Overview */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-800 mb-3">
              Category Overview
            </h4>
            <div className="text-sm text-gray-600">
              <p>Total categories: <strong>{categoryTreeData.length}</strong></p>
              <p>Total subcategories: <strong>{categoryTreeData.reduce((acc, cat) => acc + (cat.children?.length || 0), 0)}</strong></p>
              <p>Total icons needed: <strong>{categoryTreeData.reduce((acc, cat) => acc + 1 + (cat.children?.length || 0), 0)}</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconGenerationTab;
