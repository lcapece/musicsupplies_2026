import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Camera, Globe, Phone, Mail, MapPin } from 'lucide-react';

interface ContactActivity {
  id: number;
  date: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  description: string;
  outcome: string;
}

interface Prospect {
  id: number;
  prospect_cat: string;
  source: string;
  business_name: string;
  google_reviews: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website_url: string;
  website_screenshot: string;
  website_analysis: string;
  notes: string;
  contact_activities: ContactActivity[];
}

// Mock data for demonstration
const mockProspects: Prospect[] = [
  {
    id: 1,
    prospect_cat: 'Music Store',
    source: 'Google Search',
    business_name: 'Harmony Music Center',
    google_reviews: '4.5 stars (127 reviews)',
    phone: '(555) 123-4567',
    email: 'info@harmonymusic.com',
    address: '123 Main Street',
    city: 'Nashville',
    state: 'TN',
    zip: '37201',
    website_url: 'https://harmonymusic.com',
    website_screenshot: '/api/placeholder/400/300',
    website_analysis: 'Modern e-commerce site with online catalog. Strong SEO presence. Mobile-responsive design. Competitor analysis shows mid-range pricing strategy.',
    notes: 'Potential high-value client. Owner expressed interest in expanding inventory. Follow up on bulk pricing discussion.',
    contact_activities: [
      {
        id: 1,
        date: '2024-01-15',
        type: 'call',
        description: 'Initial contact call',
        outcome: 'Interested in bulk instrument orders'
      },
      {
        id: 2,
        date: '2024-01-20',
        type: 'email',
        description: 'Sent catalog and pricing information',
        outcome: 'Requested quote for 50 guitars'
      }
    ]
  },
  {
    id: 2,
    prospect_cat: 'School District',
    source: 'Referral',
    business_name: 'Metro Public Schools',
    google_reviews: 'N/A (Government)',
    phone: '(555) 987-6543',
    email: 'purchasing@metro.edu',
    address: '456 Education Blvd',
    city: 'Memphis',
    state: 'TN',
    zip: '38103',
    website_url: 'https://metro.edu',
    website_screenshot: '/api/placeholder/400/300',
    website_analysis: 'Government website with procurement section. Budget cycle runs July-June. Strong emphasis on educational programs.',
    notes: 'Large potential order for band program. Need to follow procurement process. Contact budget committee in March.',
    contact_activities: [
      {
        id: 3,
        date: '2024-02-01',
        type: 'meeting',
        description: 'Meeting with music director',
        outcome: 'Need 100 instruments for fall semester'
      }
    ]
  },
  {
    id: 3,
    prospect_cat: 'Church',
    source: 'Trade Show',
    business_name: 'Grace Community Church',
    google_reviews: '4.8 stars (89 reviews)',
    phone: '(555) 456-7890',
    email: 'worship@gracechurch.org',
    address: '789 Faith Avenue',
    city: 'Knoxville',
    state: 'TN',
    zip: '37901',
    website_url: 'https://gracechurch.org',
    website_screenshot: '/api/placeholder/400/300',
    website_analysis: 'Clean, modern church website with strong community focus. Active worship ministry section. Recent growth indicates expansion.',
    notes: 'Expanding worship team. Looking for sound equipment and instruments. Budget approved for $15K purchase.',
    contact_activities: [
      {
        id: 4,
        date: '2024-02-10',
        type: 'call',
        description: 'Follow-up from trade show',
        outcome: 'Scheduled demo for next week'
      }
    ]
  }
];

const ContactActivitySubform: React.FC<{ activities: ContactActivity[] }> = ({ activities }) => {
  const getActivityIcon = (type: ContactActivity['type']) => {
    switch (type) {
      case 'call': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'meeting': return <Globe className="w-4 h-4" />;
      default: return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    }
  };

  const getActivityColor = (type: ContactActivity['type']) => {
    switch (type) {
      case 'call': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border-2 border-gray-300 rounded-lg p-4 h-64 overflow-y-auto bg-white">
      <div className="text-center text-lg font-bold mb-4 text-gray-700">
        CONTACT ACTIVITY SUBFORM
      </div>
      
      {activities.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          No contact activities recorded
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                    <span className="ml-1 capitalize">{activity.type}</span>
                  </span>
                  <span className="text-sm text-gray-600">{activity.date}</span>
                </div>
              </div>
              <div className="text-sm text-gray-800 mb-1">
                <strong>Description:</strong> {activity.description}
              </div>
              <div className="text-sm text-gray-700">
                <strong>Outcome:</strong> {activity.outcome}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 text-center">
        <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors">
          Add Activity
        </button>
      </div>
    </div>
  );
};

const WebsiteScreenshotArea: React.FC<{ 
  websiteUrl: string; 
  currentScreenshot: string;
  onScreenshotUpdate: (screenshot: string) => void;
}> = ({ websiteUrl, currentScreenshot, onScreenshotUpdate }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  
  const captureScreenshot = async () => {
    if (!websiteUrl) {
      alert('Please enter a website URL first');
      return;
    }
    
    setIsCapturing(true);
    try {
      // This would integrate with our screenshot tool
      // For demo purposes, we'll simulate the process
      setTimeout(() => {
        const mockScreenshot = `/api/placeholder/400/300?url=${encodeURIComponent(websiteUrl)}`;
        onScreenshotUpdate(mockScreenshot);
        setIsCapturing(false);
      }, 2000);
      
      // In real implementation, you would call:
      // const { takeScreenshot } = await import('../../ai-screenshot-demo.js');
      // const result = await takeScreenshot(websiteUrl, `screenshot-${Date.now()}.png`);
      // if (result.success) onScreenshotUpdate(result.path);
      
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      setIsCapturing(false);
    }
  };

  return (
    <div className="border-2 border-gray-300 rounded-lg p-4 h-80 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-red-600 font-medium">screen shot of website</span>
        <button
          onClick={captureScreenshot}
          disabled={isCapturing}
          className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors disabled:bg-gray-400"
        >
          <Camera className="w-4 h-4" />
          <span>{isCapturing ? 'Capturing...' : 'Capture'}</span>
        </button>
      </div>
      
      {isCapturing ? (
        <div className="flex items-center justify-center h-60 bg-gray-200 rounded">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-gray-600">Capturing screenshot...</div>
          </div>
        </div>
      ) : currentScreenshot ? (
        <div className="h-60 bg-white rounded border overflow-hidden">
          <img 
            src={currentScreenshot} 
            alt="Website screenshot" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/api/placeholder/400/300';
            }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-60 bg-gray-200 rounded border-2 border-dashed border-gray-400">
          <div className="text-center text-gray-500">
            <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div>No screenshot available</div>
            <div className="text-sm">Click 'Capture' to take screenshot</div>
          </div>
        </div>
      )}
    </div>
  );
};

const WebsiteAnalysisArea: React.FC<{ analysis: string; onAnalysisUpdate: (analysis: string) => void }> = ({ 
  analysis, 
  onAnalysisUpdate 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const analyzeWebsite = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const mockAnalysis = "AI Analysis: Modern responsive website with good user experience. Strong SEO indicators. Mobile-friendly design. Competitive pricing structure. Recommended approach: Direct contact with decision maker.";
      onAnalysisUpdate(mockAnalysis);
      setIsAnalyzing(false);
    }, 3000);
  };

  return (
    <div className="border-2 border-gray-300 rounded-lg p-4 h-80 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-red-600 font-medium">Website analysis</span>
        <button
          onClick={analyzeWebsite}
          disabled={isAnalyzing}
          className="flex items-center space-x-1 px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors disabled:bg-gray-400"
        >
          <Globe className="w-4 h-4" />
          <span>{isAnalyzing ? 'Analyzing...' : 'AI Analyze'}</span>
        </button>
      </div>
      
      {isAnalyzing ? (
        <div className="flex items-center justify-center h-60 bg-gray-200 rounded">
          <div className="text-center">
            <div className="animate-pulse text-purple-600 text-lg mb-2">🤖</div>
            <div className="text-gray-600">AI analyzing website...</div>
          </div>
        </div>
      ) : (
        <textarea
          value={analysis}
          onChange={(e) => onAnalysisUpdate(e.target.value)}
          className="w-full h-60 p-3 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="AI website analysis will appear here..."
        />
      )}
    </div>
  );
};

export const ProspectsForm: React.FC = () => {
  const [prospects] = useState<Prospect[]>(mockProspects);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentProspect, setCurrentProspect] = useState<Prospect>(prospects[0]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setCurrentProspect(prospects[currentIndex]);
  }, [currentIndex, prospects]);

  const navigateToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prospects.length - 1));
  };

  const navigateToNext = () => {
    setCurrentIndex((prev) => (prev < prospects.length - 1 ? prev + 1 : 0));
  };

  const updateProspectField = (field: keyof Prospect, value: any) => {
    setCurrentProspect(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    const foundIndex = prospects.findIndex(p => 
      p.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prospect_cat.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (foundIndex !== -1) {
      setCurrentIndex(foundIndex);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Prospects Management</h1>
        <p className="text-gray-600">Record {currentIndex + 1} of {prospects.length}</p>
      </div>

      {/* Top row fields */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category:</label>
          <input
            type="text"
            value={currentProspect.prospect_cat}
            onChange={(e) => updateProspectField('prospect_cat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Source:</label>
          <input
            type="text"
            value={currentProspect.source}
            onChange={(e) => updateProspectField('source', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="col-span-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name:</label>
          <input
            type="text"
            value={currentProspect.business_name}
            onChange={(e) => updateProspectField('business_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
        
        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Google Reviews:</label>
          <input
            type="text"
            value={currentProspect.google_reviews}
            onChange={(e) => updateProspectField('google_reviews', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Contact information row */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone:</label>
          <input
            type="tel"
            value={currentProspect.phone}
            onChange={(e) => updateProspectField('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="col-span-9">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
          <input
            type="email"
            value={currentProspect.email}
            onChange={(e) => updateProspectField('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Address row */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address:</label>
          <input
            type="text"
            value={currentProspect.address}
            onChange={(e) => updateProspectField('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">City:</label>
          <input
            type="text"
            value={currentProspect.city}
            onChange={(e) => updateProspectField('city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">State:</label>
          <input
            type="text"
            value={currentProspect.state}
            onChange={(e) => updateProspectField('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP:</label>
          <input
            type="text"
            value={currentProspect.zip}
            onChange={(e) => updateProspectField('zip', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Website URL field */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Website URL:</label>
        <input
          type="url"
          value={currentProspect.website_url}
          onChange={(e) => updateProspectField('website_url', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com"
        />
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Left side - Website sections */}
        <div className="col-span-5 space-y-4">
          <WebsiteScreenshotArea
            websiteUrl={currentProspect.website_url}
            currentScreenshot={currentProspect.website_screenshot}
            onScreenshotUpdate={(screenshot) => updateProspectField('website_screenshot', screenshot)}
          />
          
          <WebsiteAnalysisArea
            analysis={currentProspect.website_analysis}
            onAnalysisUpdate={(analysis) => updateProspectField('website_analysis', analysis)}
          />
        </div>

        {/* Right side - Contact activity and notes */}
        <div className="col-span-7 space-y-4">
          <ContactActivitySubform activities={currentProspect.contact_activities} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes:</label>
            <textarea
              value={currentProspect.notes}
              onChange={(e) => updateProspectField('notes', e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter notes about this prospect..."
            />
          </div>
        </div>
      </div>

      {/* Bottom navigation and search */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-300">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-400 px-4 py-2 text-white font-medium rounded">
            NAVIGATION CONTROL
          </div>
          <button
            onClick={navigateToPrevious}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          <button
            onClick={navigateToNext}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prospects..."
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors flex items-center"
          >
            <Search className="w-4 h-4 mr-1" />
            Search
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-4 text-sm text-gray-600">
        Viewing: {currentProspect.business_name} | Category: {currentProspect.prospect_cat} | Last Updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default ProspectsForm;
