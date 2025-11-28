import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ScrapedData {
  url: string;
  scraped_at: string;
  brands: string[];
  business_type: string;
  observations: string[];
  contact_info: {
    email?: string;
    phone?: string;
  };
  social_media: {
    facebook?: boolean;
    instagram?: boolean;
    youtube?: boolean;
    twitter?: boolean;
    tiktok?: boolean;
  };
  technologies?: string[];
  page_info?: {
    title?: string;
    description?: string;
  };
}

interface Prospect {
  prospect_id: number | null;
  prospect_cat: string;
  google_reviews: number | null;
  website: string;
  business_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  source: string;
  notes: string;
  contact: string;
  scraped_data?: ScrapedData | null;
  screenshot_url?: string | null;
  scrape_status?: string | null;
  last_scrape_date?: string | null;
}

interface ProspectsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProspectsManagerModal: React.FC<ProspectsManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [allProspects, setAllProspects] = useState<Prospect[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentProspect, setCurrentProspect] = useState<Prospect>({
    prospect_id: null,
    prospect_cat: '',
    google_reviews: null,
    website: '',
    business_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    source: '',
    notes: '',
    contact: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const [isGatheringIntel, setIsGatheringIntel] = useState(false);

  // Load all prospects on modal open
  useEffect(() => {
    if (isOpen) {
      loadAllProspects();
    }
  }, [isOpen]);

  // Update current prospect when index changes
  useEffect(() => {
    if (allProspects.length > 0 && currentIndex >= 0 && currentIndex < allProspects.length) {
      setCurrentProspect(allProspects[currentIndex]);
      setIsNewRecord(false);
      setShowIntel(false);
    }
  }, [currentIndex, allProspects]);

  const loadAllProspects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('prospect_id');

      if (error) throw error;

      const prospects = (data || []).map(p => ({
        prospect_id: p.prospect_id,
        prospect_cat: p.prospect_cat || '',
        google_reviews: p.google_reviews,
        website: p.website || '',
        business_name: p.business_name || '',
        email: p.email || '',
        phone: p.phone || '',
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        zip: p.zip || '',
        source: p.source || '',
        notes: p.notes || '',
        contact: p.contact || '',
        scraped_data: p.scraped_data,
        screenshot_url: p.screenshot_url,
        scrape_status: p.scrape_status,
        last_scrape_date: p.last_scrape_date
      }));

      setAllProspects(prospects);
      if (prospects.length > 0) {
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Error loading prospects:', err);
      setMessage('Failed to load prospects');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof Prospect, value: string | number | null) => {
    setCurrentProspect(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (isNewRecord || !currentProspect.prospect_id) {
        // Insert new record
        const { data, error } = await supabase
          .from('prospects')
          .insert([{
            prospect_cat: currentProspect.prospect_cat || null,
            google_reviews: currentProspect.google_reviews,
            website: currentProspect.website || null,
            business_name: currentProspect.business_name || null,
            email: currentProspect.email || null,
            phone: currentProspect.phone || null,
            address: currentProspect.address || null,
            city: currentProspect.city || null,
            state: currentProspect.state || null,
            zip: currentProspect.zip || null,
            source: currentProspect.source || null,
            notes: currentProspect.notes || null,
            contact: currentProspect.contact || null
          }])
          .select()
          .single();

        if (error) throw error;

        setMessage('New prospect created successfully!');
        // Reload all prospects to get the new ID
        await loadAllProspects();
      } else {
        // Update existing record
        const { error } = await supabase
          .from('prospects')
          .update({
            prospect_cat: currentProspect.prospect_cat || null,
            google_reviews: currentProspect.google_reviews,
            website: currentProspect.website || null,
            business_name: currentProspect.business_name || null,
            email: currentProspect.email || null,
            phone: currentProspect.phone || null,
            address: currentProspect.address || null,
            city: currentProspect.city || null,
            state: currentProspect.state || null,
            zip: currentProspect.zip || null,
            source: currentProspect.source || null,
            notes: currentProspect.notes || null,
            contact: currentProspect.contact || null
          })
          .eq('prospect_id', currentProspect.prospect_id);

        if (error) throw error;

        setMessage('Prospect updated successfully!');
        // Update local data
        setAllProspects(prev => prev.map(p => 
          p.prospect_id === currentProspect.prospect_id ? currentProspect : p
        ));
      }
    } catch (err) {
      console.error('Error saving prospect:', err);
      setMessage('Failed to save prospect');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProspect.prospect_id || isNewRecord) return;
    
    if (!confirm('Are you sure you want to delete this prospect?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('prospect_id', currentProspect.prospect_id);

      if (error) throw error;

      setMessage('Prospect deleted successfully!');
      await loadAllProspects();
      
      // Adjust current index if needed
      if (currentIndex >= allProspects.length - 1) {
        setCurrentIndex(Math.max(0, allProspects.length - 2));
      }
    } catch (err) {
      console.error('Error deleting prospect:', err);
      setMessage('Failed to delete prospect');
    } finally {
      setSaving(false);
    }
  };

  const handleNew = () => {
    setCurrentProspect({
      prospect_id: null,
      prospect_cat: '',
      google_reviews: null,
      website: '',
      business_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      source: '',
      notes: '',
      contact: ''
    });
    setIsNewRecord(true);
    setMessage(null);
    setShowIntel(false);
  };

  const handleScrapeWebsite = async () => {
    if (!currentProspect.website || !currentProspect.prospect_id) {
      setMessage('Website URL is required to scrape');
      return;
    }

    setIsScraping(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-prospect-website-enhanced', {
        body: {
          websiteUrl: currentProspect.website,
          prospectId: currentProspect.prospect_id
        }
      });

      if (error) throw error;

      setMessage('Website scraped successfully! Click "View Intel" to see results.');
      
      // Reload the prospect to get updated data
      const { data: updatedProspect, error: fetchError } = await supabase
        .from('prospects')
        .select('*')
        .eq('prospect_id', currentProspect.prospect_id)
        .single();

      if (!fetchError && updatedProspect) {
        const updated = {
          ...currentProspect,
          scraped_data: updatedProspect.scraped_data,
          screenshot_url: updatedProspect.screenshot_url,
          scrape_status: updatedProspect.scrape_status,
          last_scrape_date: updatedProspect.last_scrape_date
        };
        setCurrentProspect(updated);
        
        // Update in the list too
        setAllProspects(prev => prev.map(p => 
          p.prospect_id === currentProspect.prospect_id ? updated : p
        ));
      }
    } catch (err: any) {
      console.error('Error scraping website:', err);
      setMessage(`Failed to scrape website: ${err.message || 'Unknown error'}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleGatherIntel = async () => {
    if (!currentProspect.website || !currentProspect.prospect_id) {
      setMessage('Website URL is required to gather intel');
      return;
    }

    setIsGatheringIntel(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('brightdata-scrape', {
        body: {
          websiteUrl: currentProspect.website,
          prospectId: currentProspect.prospect_id
        }
      });

      if (error) throw error;

      setMessage('Business intelligence gathered successfully! Click "View Intel" to see AI analysis.');
      
      // Reload the prospect to get updated AI data
      const { data: updatedProspect, error: fetchError } = await supabase
        .from('prospects')
        .select('*')
        .eq('prospect_id', currentProspect.prospect_id)
        .single();

      if (!fetchError && updatedProspect) {
        const updated = {
          ...currentProspect,
          scraped_data: updatedProspect.scraped_data,
          screenshot_url: updatedProspect.screenshot_url,
          scrape_status: updatedProspect.scrape_status,
          last_scrape_date: updatedProspect.last_scrape_date
        };
        setCurrentProspect(updated);
        
        // Update in the list too
        setAllProspects(prev => prev.map(p => 
          p.prospect_id === currentProspect.prospect_id ? updated : p
        ));
        
        // Auto-show intel panel
        setShowIntel(true);
      }
    } catch (err: any) {
      console.error('Error gathering intel:', err);
      setMessage(`Failed to gather intel: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGatheringIntel(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setMessage(null);
    }
  };

  const handleNext = () => {
    if (currentIndex < allProspects.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setMessage(null);
    }
  };

  if (!isOpen) return null;

  const hasIntel = currentProspect.scraped_data && !isNewRecord;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Prospects Manager</h2>
              <p className="text-green-100 text-sm">
                {isNewRecord ? 'New Prospect' : 
                 allProspects.length === 0 ? 'No prospects found' :
                 `Record ${currentIndex + 1} of ${allProspects.length}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={loading || currentIndex === 0}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              disabled={loading || currentIndex >= allProspects.length - 1}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              Next →
            </button>
          </div>

          <div className="flex gap-2">
            {!isNewRecord && currentProspect.website && (
              <>
                <button
                  onClick={handleGatherIntel}
                  disabled={isGatheringIntel || loading || saving}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 shadow-md flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  {isGatheringIntel ? 'Gathering Intel & Info...' : '🔍 Gather Intel & Info'}
                </button>
                {hasIntel && (
                  <button
                    onClick={() => setShowIntel(!showIntel)}
                    className="px-3 py-1 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600"
                  >
                    {showIntel ? 'Hide Intel' : 'View Intel'}
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleNew}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            >
              + New
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || saving || isNewRecord || !currentProspect.prospect_id}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:bg-gray-300"
            >
              Delete
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`px-6 py-2 text-sm ${
            message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading prospects...</div>
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Main Form */}
              <div className={`${showIntel && hasIntel ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Prospect ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prospect ID
                    </label>
                    <input
                      type="text"
                      value={currentProspect.prospect_id || 'Auto-generated'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={currentProspect.business_name}
                      onChange={(e) => handleInputChange('business_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter business name"
                    />
                  </div>

                  {/* Contact Person */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={currentProspect.contact}
                      onChange={(e) => handleInputChange('contact', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter contact person"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={currentProspect.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={currentProspect.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={currentProspect.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter website URL"
                    />
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={currentProspect.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter street address"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={currentProspect.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter city"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={currentProspect.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter state"
                    />
                  </div>

                  {/* ZIP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={currentProspect.zip}
                      onChange={(e) => handleInputChange('zip', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter ZIP code"
                    />
                  </div>

                  {/* Prospect Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={currentProspect.prospect_cat}
                      onChange={(e) => handleInputChange('prospect_cat', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter prospect category"
                    />
                  </div>

                  {/* Google Reviews */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Reviews (Rating)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={currentProspect.google_reviews || ''}
                      onChange={(e) => handleInputChange('google_reviews', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter rating (0-5)"
                    />
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source
                    </label>
                    <input
                      type="text"
                      value={currentProspect.source}
                      onChange={(e) => handleInputChange('source', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter lead source"
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={4}
                      value={currentProspect.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                      placeholder="Enter any additional notes or comments"
                    />
                  </div>
                </div>
              </div>

              {/* Intel Panel */}
              {showIntel && hasIntel && currentProspect.scraped_data && (
                <div className="w-1/2 border-l pl-6 overflow-y-auto">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Website Intel
                  </h3>

                  {/* Screenshot */}
                  {currentProspect.screenshot_url && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Homepage Screenshot</h4>
                      <img 
                        src={currentProspect.screenshot_url} 
                        alt="Website screenshot" 
                        className="w-full rounded-lg border shadow-sm"
                      />
                    </div>
                  )}

                  {/* Business Type */}
                  {currentProspect.scraped_data.business_type && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Business Type</h4>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {currentProspect.scraped_data.business_type}
                      </span>
                    </div>
                  )}

                  {/* Brands */}
                  {currentProspect.scraped_data.brands && currentProspect.scraped_data.brands.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Brands Carried ({currentProspect.scraped_data.brands.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentProspect.scraped_data.brands.map((brand, idx) => (
                          <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            {brand}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observations */}
                  {currentProspect.scraped_data.observations && currentProspect.scraped_data.observations.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Observations</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {currentProspect.scraped_data.observations.map((obs, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-indigo-600 mt-1">•</span>
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Technologies */}
                  {currentProspect.scraped_data.technologies && currentProspect.scraped_data.technologies.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Technologies</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentProspect.scraped_data.technologies.map((tech, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social Media */}
                  {currentProspect.scraped_data.social_media && Object.values(currentProspect.scraped_data.social_media).some(v => v) && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Social Media Presence</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentProspect.scraped_data.social_media.facebook && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Facebook</span>}
                        {currentProspect.scraped_data.social_media.instagram && <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">Instagram</span>}
                        {currentProspect.scraped_data.social_media.youtube && <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">YouTube</span>}
                        {currentProspect.scraped_data.social_media.twitter && <span className="px-2 py-1 bg-sky-100 text-sky-800 rounded text-xs">Twitter/X</span>}
                        {currentProspect.scraped_data.social_media.tiktok && <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">TikTok</span>}
                      </div>
                    </div>
                  )}

                  {/* Scraped Date */}
                  {currentProspect.last_scrape_date && (
                    <div className="mt-6 pt-4 border-t text-xs text-gray-500">
                      Last scraped: {new Date(currentProspect.last_scrape_date).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProspectsManagerModal;
