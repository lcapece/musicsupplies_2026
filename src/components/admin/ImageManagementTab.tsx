import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface S3File {
  filename: string;
  size: number;
  lastModified: string;
}

interface CachedData {
  files: S3File[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const ImageManagementTab: React.FC = () => {
  const [s3Images, setS3Images] = useState<S3File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use ref for in-memory cache to persist across re-renders
  const cacheRef = useRef<CachedData | null>(null);

  const loadS3Images = useCallback(async () => {
    
    // Check if we have cached data that's still valid
    if (cacheRef.current) {
      const cacheAge = Date.now() - cacheRef.current.timestamp;
      if (cacheAge < CACHE_DURATION) {
        setS3Images(cacheRef.current.files);
        setLastUpdated(new Date(cacheRef.current.timestamp));
        return;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      
      
      // Call the edge function
      const { data, error: fetchError } = await supabase.functions.invoke('list-s3-files', {
        method: 'GET'
      });
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (data && data.files) {
        
        // Update cache
        cacheRef.current = {
          files: data.files,
          timestamp: Date.now()
        };
        
        setS3Images(data.files);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error('No data received from S3');
      }
      
    } catch (err: any) {
      console.error('Error loading S3 images:', err);
      
      // Use mock data when edge function fails
      const mockFiles: S3File[] = [
        {
          filename: 'products/guitar-strings.jpg',
          size: 245632,
          lastModified: new Date('2024-01-15').toISOString(),
        },
        {
          filename: 'products/drum-sticks.jpg',
          size: 189456,
          lastModified: new Date('2024-01-16').toISOString(),
        },
        {
          filename: 'products/keyboards.jpg',
          size: 312789,
          lastModified: new Date('2024-01-17').toISOString(),
        },
        {
          filename: 'products/microphones.jpg',
          size: 278934,
          lastModified: new Date('2024-01-18').toISOString(),
        },
        {
          filename: 'products/amplifiers.jpg',
          size: 356712,
          lastModified: new Date('2024-01-19').toISOString(),
        },
        {
          filename: 'brands/fender-logo.png',
          size: 45678,
          lastModified: new Date('2024-01-10').toISOString(),
        },
        {
          filename: 'brands/gibson-logo.png',
          size: 52341,
          lastModified: new Date('2024-01-11').toISOString(),
        },
        {
          filename: 'brands/yamaha-logo.png',
          size: 48923,
          lastModified: new Date('2024-01-12').toISOString(),
        },
        {
          filename: 'banners/sale-banner.jpg',
          size: 423156,
          lastModified: new Date('2024-01-20').toISOString(),
        },
        {
          filename: 'banners/new-arrivals.jpg',
          size: 389234,
          lastModified: new Date('2024-01-21').toISOString(),
        },
      ];
      
      // Update cache with mock data
      cacheRef.current = {
        files: mockFiles,
        timestamp: Date.now()
      };
      
      setS3Images(mockFiles);
      setLastUpdated(new Date());
      setError('Using demo data - Edge function temporarily unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear cache when component unmounts or after inactivity
  useEffect(() => {
    const inactivityTimer = setTimeout(() => {
      cacheRef.current = null;
    }, 30 * 60 * 1000); // Clear after 30 minutes of inactivity
    
    return () => clearTimeout(inactivityTimer);
  }, [s3Images]); // Reset timer when data changes

  // Filter images based on search term
  const filteredImages = s3Images.filter(image =>
    image.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getTotalSize = (): number => {
    return s3Images.reduce((sum, img) => sum + img.size, 0);
  };

  const refreshCache = useCallback(() => {
    cacheRef.current = null;
    loadS3Images();
  }, [loadS3Images]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-gray-900">Image Management</h2>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                <span>Last updated: {lastUpdated.toLocaleString()}</span>
                {cacheRef.current && (
                  <span className="ml-2 text-green-600">(Cached)</span>
                )}
              </div>
            )}
            <button
              onClick={loadS3Images}
              disabled={loading}
              className={`px-6 py-3 text-lg font-semibold rounded-md ${
                loading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Loading...' : 'Create source files'}
            </button>
          </div>
        </div>

        <p className="text-lg text-gray-600">
          Manage images from S3 bucket: <span className="font-mono font-bold">mus86077</span>
        </p>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded-md">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}
      </div>

      {/* Search and Image Count */}
      {s3Images.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 max-w-md">
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                Search Images
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by filename..."
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-base"
              />
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">
                {filteredImages.length} of {s3Images.length} images
              </p>
              <p className="text-sm text-gray-500">
                Total size: {formatFileSize(getTotalSize())}
              </p>
              <button
                onClick={refreshCache}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Force Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* S3 Images List */}
      {s3Images.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900">S3 Images</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {filteredImages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No images match your search criteria
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredImages.map((image, index) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(image.filename);
                  return (
                    <div
                      key={`${image.filename}-${index}`}
                      className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-blue-600 font-bold text-lg">
                                {isImage ? '📷' : '📄'}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-medium text-gray-900 truncate">
                              {image.filename}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(image.size)} • Modified: {formatDate(image.lastModified)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(image.filename);
                            // Could add a toast notification here
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Copy Name
                        </button>
                        <button
                          onClick={() => {
                            // Generate S3 URL (you may need to adjust based on your bucket settings)
                            const s3Url = `https://mus86077.s3.amazonaws.com/${encodeURIComponent(image.filename)}`;
                            navigator.clipboard.writeText(s3Url);
                          }}
                          className="text-sm text-green-600 hover:text-green-800 font-medium"
                        >
                          Copy URL
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">Loading S3 Files...</h3>
          <p className="text-lg text-gray-600">
            Fetching file information from bucket mus86077
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && s3Images.length === 0 && !error && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Images Loaded</h3>
          <p className="text-lg text-gray-600 mb-6">
            Click "Create source files" to load images from S3 bucket mus86077
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Images will be cached for 5 minutes for fast access
          </p>
          <button
            onClick={loadS3Images}
            className="px-8 py-3 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Load Images Now
          </button>
        </div>
      )}

      {/* Cache Info */}
      {s3Images.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-semibold">Performance Information:</p>
          <ul className="mt-2 space-y-1">
            <li>• Images are cached in memory for 5 minutes</li>
            <li>• Cache is automatically cleared after 30 minutes of inactivity</li>
            <li>• Use "Force Refresh" to manually update the cache</li>
            <li>• Total files in bucket: {s3Images.length}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImageManagementTab;
