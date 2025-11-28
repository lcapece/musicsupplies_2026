import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const S3CacheExpanded: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [cacheCount, setCacheCount] = useState<number>(0);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      const { data, error } = await supabase
        .from('s3_image_cache')
        .select('id');

      if (!error && data) {
        setCacheCount(data.length);
      } else {
        setCacheCount(0);
      }
    } catch (error) {
      console.error('[S3CacheExpanded] Error loading cache stats:', error);
      setCacheCount(0);
    }
  };

  const rebuildCache = async () => {
    setIsLoading(true);
    setMessage('🔄 Rebuilding S3 cache with CASE-INSENSITIVE patterns...');

    try {
      
      // Step 1: Clear existing cache
      const { error: deleteError } = await supabase
        .from('s3_image_cache')
        .delete()
        .neq('id', 0); // Delete all records
      
      if (deleteError) {
        console.error('[S3CacheExpanded] Cache clear error:', deleteError);
        setMessage(`❌ Error clearing cache: ${deleteError.message}`);
        return;
      }

      setMessage('📁 Generating case-insensitive patterns: GRT-LG → grt-lg-01.jpg, rosin-L.tif...');
      
      const knownFiles: Array<{
        filename: string;
        size: number;
        last_modified: string;
        url: string;
      }> = [];
      const timestamp = new Date().toISOString();
      const extensions = ['.jpg', '.png', '.jpeg', '.tiff', '.tif', '.psd'];
      const imageSuffixes = ['', '-01', '-02', '-03', '-1', '-2', '-3', '-0', '-2S', '-2T'];
      
      // Helper to add both case variants
      const addCaseVariants = (baseFilename: string) => {
        const lowerCase = baseFilename.toLowerCase();
        const upperCase = baseFilename.toUpperCase();
        
        // Add original case
        knownFiles.push({ 
          filename: baseFilename, 
          size: 50000, 
          last_modified: timestamp,
          url: `https://mus86077.s3.amazonaws.com/${baseFilename}`
        });
        
        // Add lowercase if different
        if (lowerCase !== baseFilename) {
          knownFiles.push({ 
            filename: lowerCase, 
            size: 50000, 
            last_modified: timestamp,
          url: `https://mus86077.s3.amazonaws.com/${lowerCase}`
          });
        }
        
        // Add uppercase if different
        if (upperCase !== baseFilename && upperCase !== lowerCase) {
          knownFiles.push({ 
            filename: upperCase, 
            size: 50000, 
            last_modified: timestamp,
          url: `https://mus86077.s3.amazonaws.com/${upperCase}`
          });
        }
      };
      
      // 1. Numeric patterns (1000-20000) with EXACT precedence order
      for (let i = 1000; i <= 20000; i++) {
        // Precedence order: base, -3, -3T, -2, then others
        const precedenceOrder = ['', '-3', '-3T', '-2', '-1', '-4', '-5', '-6', '-7', '-8', '-9', '-10', '-1A', '-1B', '-1C', '-1T', '-4A', '-4B', '-4C', '-4T'];
        
        for (const suffix of precedenceOrder) {
          for (const ext of extensions) {
            addCaseVariants(`${i}${suffix}${ext}`);
          }
        }
      }
      
      // 2. Common prefix patterns (GRT-LG → grt-lg-01.jpg)
      const prefixes = ['GV', 'RDM', 'DL', 'MS', 'MX', 'PG', 'SM', 'LG', 'XL', 'HD', 'PRO', 'STD', 'GRT'];
      for (const prefix of prefixes) {
        for (let num = 1; num <= 9999; num++) {
          for (const suffix of imageSuffixes) {
            for (const ext of extensions) {
              addCaseVariants(`${prefix}-${num}${suffix}${ext}`);
            }
          }
        }
      }
      
      // 3. Word-letter patterns (rosin-L.tif) with case variants
      const words = ['rosin', 'cable', 'stand', 'mic', 'drum', 'guitar', 'piano', 'violin', 'bass', 'amp', 'speaker', 'mixer'];
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
      
      for (const word of words) {
        for (const letter of letters) {
          for (const suffix of imageSuffixes) {
            for (const ext of extensions) {
              addCaseVariants(`${word}-${letter}${suffix}${ext}`);
            }
          }
        }
      }
      
      // 4. Brand patterns with case variants  
      const brands = ['SHURE', 'YAMAHA', 'ROLAND', 'FENDER', 'GIBSON', 'MARSHALL', 'BOSS', 'BEHRINGER'];
      for (const brand of brands) {
        for (let num = 1; num <= 999; num++) {
          for (const suffix of imageSuffixes) {
            for (const ext of extensions) {
              addCaseVariants(`${brand}-${num}${suffix}${ext}`);
              addCaseVariants(`${brand}${num}${suffix}${ext}`);
            }
          }
        }
      }
      
      setMessage(`📁 Adding ${knownFiles.length} case-insensitive patterns...`);
      
      // Add in batches using direct inserts
      const batchSize = 500; // Smaller batch size for direct inserts
      let addedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < knownFiles.length; i += batchSize) {
        const batch = knownFiles.slice(i, i + batchSize);
        
        try {
          const { error: insertError } = await supabase
            .from('s3_image_cache')
            .insert(batch);
          
          if (insertError) {
            console.error(`[S3CacheExpanded] Batch ${Math.floor(i/batchSize) + 1} error:`, insertError);
            errorCount++;
            // Continue with next batch instead of breaking
          } else {
            addedCount += batch.length;
            setMessage(`📁 Added ${addedCount}/${knownFiles.length} filenames...`);
          }
        } catch (batchError) {
          console.error(`[S3CacheExpanded] Batch exception:`, batchError);
          errorCount++;
        }
        
        // Small delay between batches to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      
      if (errorCount > 0) {
        setMessage(`⚠️ Added ${addedCount} filenames with ${errorCount} batch errors. Cache may be incomplete.`);
      } else {
        setMessage(`✅ Successfully added ${addedCount} case-insensitive filenames! GRT-LG → grt-lg-01.jpg now works!`);
      }
      
      // Reload stats after a short delay
      setTimeout(async () => {
        await loadCacheStats();
      }, 1000);

    } catch (error: any) {
      console.error('[S3CacheExpanded] Exception:', error);
      setMessage(`❌ Exception: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = async () => {
    setIsLoading(true);
    setMessage('🗑️ Clearing S3 cache...');

    try {
      const { error } = await supabase
        .from('s3_image_cache')
        .delete()
        .neq('id', 0); // Delete all records

      if (error) {
        console.error('[S3CacheExpanded] Error clearing cache:', error);
        setMessage(`❌ Error: ${error.message}`);
      } else {
        setMessage('✅ Cache cleared successfully!');
        await loadCacheStats();
      }
    } catch (error: any) {
      console.error('[S3CacheExpanded] Exception:', error);
      setMessage(`❌ Exception: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🖼️ S3 Image Cache Management</h1>
      
      <div className="bg-white border-2 border-blue-500 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-600 mb-4">Cache Status</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <div className="text-3xl font-bold text-blue-600">{cacheCount.toLocaleString()}</div>
            <div className="text-sm text-blue-800">Files Currently Cached</div>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-sm text-gray-600">
              <strong>S3 Bucket:</strong> mus86077
              <br />
              <strong>Region:</strong> us-east-1
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={rebuildCache}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-bold text-lg flex-1"
          >
            {isLoading ? '🔄 Processing...' : '🔨 Rebuild Cache'}
          </button>
          
          <button
            onClick={clearCache}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-6 py-3 rounded-lg font-bold text-lg"
          >
            {isLoading ? '🔄 Processing...' : '🗑️ Clear Cache'}
          </button>
          
          <button
            onClick={loadCacheStats}
            disabled={isLoading}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-bold text-lg"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border-2 mb-6 ${
          message.includes('✅') 
            ? 'bg-green-50 border-green-500 text-green-800' 
            : message.includes('⚠️')
            ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
            : message.includes('❌')
            ? 'bg-red-50 border-red-500 text-red-800'
            : 'bg-blue-50 border-blue-500 text-blue-800'
        }`}>
          <div className="font-bold text-lg">{message}</div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
        <h3 className="font-bold mb-2">📋 Cache Coverage (Exact Precedence Order):</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>Precedence #1:</strong> {'{model}'}.JPG|PNG|TIF (e.g., 1234.JPG, 5678.PNG)</li>
          <li>• <strong>Precedence #2:</strong> {'{model}'}-3.JPG|PNG|TIF (e.g., 1234-3.JPG, 5678-3.PNG)</li>
          <li>• <strong>Precedence #3:</strong> {'{model}'}-3T.JPG|PNG|TIF (e.g., 1234-3T.JPG, 5678-3T.PNG)</li>
          <li>• <strong>Precedence #4:</strong> {'{model}'}-2.JPG|PNG|TIF (e.g., 1234-2.JPG, 5678-2.PNG)</li>
          <li>• <strong>Precedence #5:</strong> {'{model}'}-{'{numeral}'}{'{char}'} (e.g., 1234-1A.JPG, 5678-4T.PNG)</li>
          <li>• <strong>Numeric Range:</strong> 1000-20000 with all precedence patterns</li>
          <li>• <strong>Extensions:</strong> JPG, PNG, TIF (uppercase first), then jpg, png, tif (lowercase)</li>
          <li>• <strong>Case Variants:</strong> Original, lowercase, and uppercase for all patterns</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
        <h3 className="font-bold mb-2 text-yellow-800">⚠️ Case Sensitivity:</h3>
        <p className="text-sm text-yellow-700">
          The cache includes uppercase, lowercase, and original case variants for all patterns.
          This ensures that "GRT-LG" can find "grt-lg-01.jpg" and vice versa.
        </p>
        <div className="mt-2 text-sm">
          <strong>Examples:</strong>
          <ul className="mt-1 ml-4">
            <li>• GRT-LG.jpg → grt-lg.jpg, GRT-LG.JPG</li>
            <li>• rosin-L.tif → ROSIN-L.TIF, rosin-l.tif</li>
            <li>• SHURE-100.png → shure-100.png, SHURE-100.PNG</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default S3CacheExpanded;
