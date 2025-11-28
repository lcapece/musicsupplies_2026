import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Phone, Mail, Calendar, User, Building, MapPin, Globe, Star, RefreshCw } from 'lucide-react';

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
}

interface Contact {
  contact_id: number | null;
  prospect_id: number;
  contact_date: string;
  contact_type: string;
  contact_person: string;
  notes: string;
  callback_flag: boolean;
  callback_date: string | null;
  follow_up_required: boolean;
  outcome: string;
}

interface ProspectCRMModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectId?: number | null;
  onProspectSaved?: () => void;
}

const ProspectCRMModal: React.FC<ProspectCRMModalProps> = ({
  isOpen,
  onClose,
  prospectId = null,
  onProspectSaved
}) => {
  const [prospect, setProspect] = useState<Prospect>({
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

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState<Contact>({
    contact_id: null,
    prospect_id: 0,
    contact_date: new Date().toISOString().split('T')[0],
    contact_type: 'phone',
    contact_person: '',
    notes: '',
    callback_flag: false,
    callback_date: null,
    follow_up_required: false,
    outcome: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'prospect' | 'contacts'>('prospect');
  const [showAddContact, setShowAddContact] = useState(false);

  // Load prospect data when modal opens
  useEffect(() => {
    if (isOpen && prospectId) {
      loadProspectData();
      loadContactHistory();
    } else if (isOpen && !prospectId) {
      // Reset for new prospect
      setProspect({
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
      setContacts([]);
    }
  }, [isOpen, prospectId]);

  const loadProspectData = async () => {
    if (!prospectId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('prospect_id', prospectId)
        .single();

      if (error) throw error;

      setProspect({
        prospect_id: data.prospect_id,
        prospect_cat: data.prospect_cat || '',
        google_reviews: data.google_reviews,
        website: data.website || '',
        business_name: data.business_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        source: data.source || '',
        notes: data.notes || '',
        contact: data.contact || ''
      });
    } catch (err) {
      console.error('Error loading prospect:', err);
      setMessage('Failed to load prospect data');
    } finally {
      setLoading(false);
    }
  };

  const loadContactHistory = async () => {
    if (!prospectId) return;

    try {
      const { data, error } = await supabase
        .from('prospect_contacts')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('contact_date', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setContacts(data || []);
    } catch (err) {
      console.error('Error loading contact history:', err);
    }
  };

  const handleProspectChange = (field: keyof Prospect, value: string | number | null) => {
    setProspect(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (field: keyof Contact, value: string | number | boolean | null) => {
    setNewContact(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveProspect = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (!prospect.prospect_id) {
        // Create new prospect
        const { data, error } = await supabase
          .from('prospects')
          .insert([{
            prospect_cat: prospect.prospect_cat || null,
            google_reviews: prospect.google_reviews,
            website: prospect.website || null,
            business_name: prospect.business_name || null,
            email: prospect.email || null,
            phone: prospect.phone || null,
            address: prospect.address || null,
            city: prospect.city || null,
            state: prospect.state || null,
            zip: prospect.zip || null,
            source: prospect.source || null,
            notes: prospect.notes || null,
            contact: prospect.contact || null
          }])
          .select()
          .single();

        if (error) throw error;
        
        setProspect(prev => ({ ...prev, prospect_id: data.prospect_id }));
        setMessage('Prospect created successfully!');
      } else {
        // Update existing prospect
        const { error } = await supabase
          .from('prospects')
          .update({
            prospect_cat: prospect.prospect_cat || null,
            google_reviews: prospect.google_reviews,
            website: prospect.website || null,
            business_name: prospect.business_name || null,
            email: prospect.email || null,
            phone: prospect.phone || null,
            address: prospect.address || null,
            city: prospect.city || null,
            state: prospect.state || null,
            zip: prospect.zip || null,
            source: prospect.source || null,
            notes: prospect.notes || null,
            contact: prospect.contact || null
          })
          .eq('prospect_id', prospect.prospect_id);

        if (error) throw error;
        setMessage('Prospect updated successfully!');
      }

      if (onProspectSaved) onProspectSaved();
    } catch (err) {
      console.error('Error saving prospect:', err);
      setMessage('Failed to save prospect');
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    if (!prospect.prospect_id) {
      setMessage('Please save the prospect first');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('prospect_contacts')
        .insert([{
          prospect_id: prospect.prospect_id,
          contact_date: newContact.contact_date,
          contact_type: newContact.contact_type,
          contact_person: newContact.contact_person,
          notes: newContact.notes,
          callback_flag: newContact.callback_flag,
          callback_date: newContact.callback_date,
          follow_up_required: newContact.follow_up_required,
          outcome: newContact.outcome
        }]);

      if (error) throw error;

      setMessage('Contact logged successfully!');
      setShowAddContact(false);
      setNewContact({
        contact_id: null,
        prospect_id: prospect.prospect_id,
        contact_date: new Date().toISOString().split('T')[0],
        contact_type: 'phone',
        contact_person: '',
        notes: '',
        callback_flag: false,
        callback_date: null,
        follow_up_required: false,
        outcome: ''
      });
      loadContactHistory();
    } catch (err) {
      console.error('Error saving contact:', err);
      setMessage('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshTest = () => {
    setMessage('Test refresh button clicked!');
    setTimeout(() => setMessage(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-gray-700 rounded-xl w-full max-w-6xl h-full max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Building className="h-8 w-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                {prospect.prospect_id ? 'Edit Prospect' : 'New Prospect'}
              </h2>
              <p className="text-gray-400 text-sm">Professional CRM System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`px-6 py-3 text-sm border-b border-gray-700 ${
            message.includes('success') ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            {message}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 bg-gray-900">
          <button
            onClick={() => setActiveTab('prospect')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'prospect'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Prospect Details
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'contacts'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Contact History ({contacts.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'prospect' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Building className="h-5 w-5 mr-2 text-blue-400" />
                    Business Information
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={prospect.business_name}
                      onChange={(e) => handleProspectChange('business_name', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                      placeholder="Enter business name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={prospect.prospect_cat}
                      onChange={(e) => handleProspectChange('prospect_cat', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                      placeholder="e.g., Music Store, School, Church"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Lead Source
                    </label>
                    <input
                      type="text"
                      value={prospect.source}
                      onChange={(e) => handleProspectChange('source', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                      placeholder="e.g., Website, Referral, Cold Call"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <Star className="h-4 w-4 mr-1 text-yellow-400" />
                      Google Reviews Rating
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={prospect.google_reviews || ''}
                      onChange={(e) => handleProspectChange('google_reviews', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                      placeholder="0.0 - 5.0"
                    />
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-green-400" />
                    Contact Information
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Primary Contact
                    </label>
                    <input
                      type="text"
                      value={prospect.contact}
                      onChange={(e) => handleProspectChange('contact', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                      placeholder="Enter contact person name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <Phone className="h-4 w-4 mr-1 text-green-400" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={prospect.phone}
                      onChange={(e) => handleProspectChange('phone', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <Mail className="h-4 w-4 mr-1 text-blue-400" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={prospect.email}
                      onChange={(e) => handleProspectChange('email', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                      placeholder="contact@business.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <Globe className="h-4 w-4 mr-1 text-purple-400" />
                      Website
                    </label>
                    <input
                      type="url"
                      value={prospect.website}
                      onChange={(e) => handleProspectChange('website', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                      placeholder="https://business.com"
                    />
                  </div>
                </div>

                {/* Address Section */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-red-400" />
                    Address Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={prospect.address}
                        onChange={(e) => handleProspectChange('address', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={prospect.city}
                        onChange={(e) => handleProspectChange('city', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={prospect.state}
                        onChange={(e) => handleProspectChange('state', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={prospect.zip}
                        onChange={(e) => handleProspectChange('zip', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    rows={4}
                    value={prospect.notes}
                    onChange={(e) => handleProspectChange('notes', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 resize-none"
                    placeholder="Enter any additional notes, comments, or important information..."
                  />
                </div>
              </div>
            ) : (
              /* Contact History Tab */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Contact History</h3>
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Contact
                  </button>
                </div>

                {showAddContact && (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-4">
                    <h4 className="text-lg font-medium text-white">Log New Contact</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Contact Date
                        </label>
                        <input
                          type="date"
                          value={newContact.contact_date}
                          onChange={(e) => handleContactChange('contact_date', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Contact Type
                        </label>
                        <select
                          value={newContact.contact_type}
                          onChange={(e) => handleContactChange('contact_type', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400"
                        >
                          <option value="phone">Phone Call</option>
                          <option value="email">Email</option>
                          <option value="video">Video Call</option>
                          <option value="text">Text Message</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Contact Person
                        </label>
                        <input
                          type="text"
                          value={newContact.contact_person}
                          onChange={(e) => handleContactChange('contact_person', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400"
                          placeholder="Who did you speak with?"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Outcome
                        </label>
                        <input
                          type="text"
                          value={newContact.outcome}
                          onChange={(e) => handleContactChange('outcome', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400"
                          placeholder="e.g., Interested, Not Ready, Follow Up"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Notes
                        </label>
                        <textarea
                          rows={3}
                          value={newContact.notes}
                          onChange={(e) => handleContactChange('notes', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 resize-none"
                          placeholder="Detailed notes about the conversation..."
                        />
                      </div>

                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newContact.callback_flag}
                            onChange={(e) => handleContactChange('callback_flag', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-gray-300">Callback Required</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newContact.follow_up_required}
                            onChange={(e) => handleContactChange('follow_up_required', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-gray-300">Follow-up Required</span>
                        </label>
                      </div>

                      {newContact.callback_flag && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Callback Date
                          </label>
                          <input
                            type="date"
                            value={newContact.callback_date || ''}
                            onChange={(e) => handleContactChange('callback_date', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={saveContact}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Contact'}
                      </button>
                      <button
                        onClick={() => setShowAddContact(false)}
                        className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Contact History List */}
                <div className="space-y-4">
                  {contacts.map((contact, index) => (
                    <div key={index} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <span className="text-sm font-medium text-blue-400">
                              {new Date(contact.contact_date).toLocaleDateString()}
                            </span>
                            <span className="text-sm text-gray-400 capitalize">
                              {contact.contact_type}
                            </span>
                            {contact.contact_person && (
                              <span className="text-sm text-gray-300">
                                with {contact.contact_person}
                              </span>
                            )}
                          </div>
                          
                          {contact.outcome && (
                            <div className="text-sm text-green-400 mb-2">
                              Outcome: {contact.outcome}
                            </div>
                          )}
                          
                          {contact.notes && (
                            <p className="text-gray-300 text-sm">{contact.notes}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2">
                            {contact.callback_flag && (
                              <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded">
                                Callback: {contact.callback_date ? new Date(contact.callback_date).toLocaleDateString() : 'TBD'}
                              </span>
                            )}
                            {contact.follow_up_required && (
                              <span className="text-xs bg-orange-900 text-orange-300 px-2 py-1 rounded">
                                Follow-up Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {contacts.length === 0 && !showAddContact && (
                    <div className="text-center text-gray-400 py-8">
                      No contact history available. Click "Log Contact" to add the first entry.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Image Placeholder and Refresh Button */}
          <div className="w-72 border-l border-gray-700 p-6 flex flex-col">
            <div className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden mb-4" style={{height: '25%'}}>
              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-900">
                <div className="text-center">
                  <Building className="h-12 w-12 mx-auto mb-2 text-gray-500" />
                  <p className="text-sm">Business Photo</p>
                  <p className="text-xs text-gray-500">Placeholder</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleRefreshTest}
              className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Test
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6 bg-gray-900">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveProspect}
              disabled={saving || loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Prospect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProspectCRMModal;