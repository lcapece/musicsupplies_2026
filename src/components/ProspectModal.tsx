import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, ChevronLeft, ChevronRight, Search, Plus, Trash2, Edit2, Save, Globe, RefreshCw, Brain } from 'lucide-react';

interface Prospect {
  identifier?: string;
  website: string;
  source: string;
  type: string;
  city?: string; // Optional - not in prospects_headers table
  state: string;
  zip: string;
  contact_phone: string;
  contact_email?: string;
  contact_name?: string;
  homepage_screenshot_url?: string;
  tavily_research_data?: any;
  ai_analysis?: any;
  icebreakers?: any;
  last_intelligence_gather?: string;
  intelligence_status?: string;
}

interface ProspectAction {
  action_id?: string;
  identifier: string;
  action_notes: string;
  person: string;
  action_timestamp: string;
}

interface ProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProspectId?: string; // Legacy support - maps to identifier
  initialIdentifier?: string; // New prop
}

export default function ProspectModal({ isOpen, onClose, initialProspectId, initialIdentifier }: ProspectModalProps) {
  // Support both old (initialProspectId) and new (initialIdentifier) props
  const identifier = initialIdentifier || initialProspectId;
  const [prospect, setProspect] = useState<Prospect>({
    website: '',
    source: '',
    type: '',
    city: '',
    state: '',
    zip: '',
    contact_phone: '',
    contact_email: '',
    contact_name: ''
  });

  const [actions, setActions] = useState<ProspectAction[]>([]);
  const [allProspects, setAllProspects] = useState<Prospect[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [newAction, setNewAction] = useState({ action_notes: '', person: '' });
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState<ProspectAction | null>(null);
  const [isGathering, setIsGathering] = useState(false);
  const [gatherError, setGatherError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAllProspectsAndSetCurrent();
    }
  }, [isOpen]);

  const loadAllProspectsAndSetCurrent = async () => {
    const { data, error } = await supabase
      .from('prospects_headers')
      .select('identifier, website, source, type, homepage_screenshot_url, tavily_research_data, ai_analysis, icebreakers, last_intelligence_gather, intelligence_status')
      .order('website');
    
    if (!error && data) {
      // Enrich each prospect with data from prospects_details
      const enrichedProspects = await Promise.all(
        data.map(async (prospect) => {
          const { data: details } = await supabase
            .from('prospects_details')
            .select('state, zip, city, phone')
            .eq('website', prospect.website)
            .limit(1)
            .single();
          
          return {
            ...prospect,
            state: details?.state || '',
            zip: details?.zip || '',
            city: details?.city || '',
            contact_phone: details?.phone || '',
            contact_email: '',
            contact_name: ''
          };
        })
      );
      
      setAllProspects(enrichedProspects);
      
      // If we have an identifier, find and load that specific prospect
      if (identifier) {
        const index = enrichedProspects.findIndex(p => String(p.identifier) === String(identifier));
        if (index !== -1) {
          setCurrentIndex(index);
          loadProspect(enrichedProspects[index]);
        }
      } else if (enrichedProspects.length > 0) {
        // Load the first prospect if no identifier specified
        loadProspect(enrichedProspects[0]);
      }
    }
  };

  const loadProspect = async (prospectData: Prospect) => {
    setProspect(prospectData);
    
    if (prospectData.identifier) {
      const { data: actionsData } = await supabase
        .from('prospects_actions')
        .select('*')
        .eq('identifier', prospectData.identifier)
        .order('action_timestamp', { ascending: false });
      
      if (actionsData) {
        setActions(actionsData);
      }
    }
  };

  const handleSave = async () => {
    if (prospect.identifier) {
      const { error } = await supabase
        .from('prospects_headers')
        .update(prospect)
        .eq('identifier', prospect.identifier);
      
      if (!error) {
        alert('Prospect updated successfully');
        loadAllProspectsAndSetCurrent();
      }
    } else {
      const { data, error } = await supabase
        .from('prospects_headers')
        .insert([prospect])
        .select()
        .single();
      
      if (!error && data) {
        setProspect(data);
        alert('Prospect created successfully');
        loadAllProspectsAndSetCurrent();
      }
    }
  };

  const handleAddAction = async () => {
    if (!prospect.identifier || !newAction.action_notes) return;

    const { data, error } = await supabase
      .from('prospects_actions')
      .insert([{
        identifier: prospect.identifier,
        action_notes: newAction.action_notes,
        person: newAction.person || 'Unknown',
        action_timestamp: new Date().toISOString()
      }])
      .select()
      .single();

    if (!error && data) {
      setActions([data, ...actions]);
      setNewAction({ action_notes: '', person: '' });
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    const { error } = await supabase
      .from('prospects_actions')
      .delete()
      .eq('action_id', actionId);

    if (!error) {
      setActions(actions.filter(a => a.action_id !== actionId));
    }
  };

  const handleUpdateAction = async () => {
    if (!editingAction) return;

    const { error } = await supabase
      .from('prospects_actions')
      .update({
        action_notes: editingAction.action_notes,
        person: editingAction.person
      })
      .eq('action_id', editingAction.action_id);

    if (!error) {
      setActions(actions.map(a => 
        a.action_id === editingAction.action_id ? editingAction : a
      ));
      setEditingActionId(null);
      setEditingAction(null);
    }
  };

  const handleNext = () => {
    if (currentIndex < allProspects.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) {
      loadAllProspectsAndSetCurrent();
      return;
    }

    setIsSearching(true);
    const { data } = await supabase
      .from('prospects_headers')
      .select('identifier, website, source, type, homepage_screenshot_url, tavily_research_data, ai_analysis, icebreakers, last_intelligence_gather, intelligence_status')
      .or(`website.ilike.%${searchTerm}%`)
      .order('website');

    if (data) {
      // Enrich search results with data from prospects_details
      const enrichedResults = await Promise.all(
        data.map(async (prospect) => {
          const { data: details } = await supabase
            .from('prospects_details')
            .select('state, zip, city, phone')
            .eq('website', prospect.website)
            .limit(1)
            .single();
          
          return {
            ...prospect,
            state: details?.state || '',
            zip: details?.zip || '',
            city: details?.city || '',
            contact_phone: details?.phone || '',
            contact_email: '',
            contact_name: ''
          };
        })
      );
      
      setAllProspects(enrichedResults);
      if (enrichedResults.length > 0) {
        setCurrentIndex(0);
        loadProspect(enrichedResults[0]);
      }
    }
    setIsSearching(false);
  };

  const gatherIntelligence = async () => {
    if (!prospect.website || !prospect.identifier) {
      alert('Website URL is required');
      return;
    }

    setIsGathering(true);
    setGatherError(null);

    try {
      const { data, error } = await supabase.functions.invoke('gather-prospect-intelligence', {
        body: {
          identifier: prospect.identifier,
          website: prospect.website
        }
      });

      if (error) throw error;

      if (data.success) {
        // Reload prospect data to get the enriched information
        const { data: updatedProspect, error: fetchError } = await supabase
          .from('prospects_headers')
          .select('*')
          .eq('identifier', prospect.identifier)
          .single();

        if (!fetchError && updatedProspect) {
          setProspect(updatedProspect);
          alert('✅ Intelligence gathered successfully with AI analysis!');
        }
      } else {
        throw new Error(data.error || 'Intelligence gathering failed');
      }
    } catch (error: any) {
      console.error('Gathering error:', error);
      setGatherError(error.message || 'Failed to gather intelligence');
      alert('Failed to gather intelligence: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGathering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold">Prospect Intelligence</h2>
          <button onClick={onClose} className="hover:bg-gray-700 p-1 rounded">
            <X size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Main Form */}
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Prospect ID: {prospect.identifier || 'New Prospect'}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Website *</label>
                <input
                  type="text"
                  value={prospect.website}
                  onChange={(e) => setProspect({ ...prospect, website: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={prospect.city}
                    onChange={(e) => setProspect({ ...prospect, city: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={prospect.state}
                    onChange={(e) => setProspect({ ...prospect, state: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ZIP</label>
                  <input
                    type="text"
                    value={prospect.zip}
                    onChange={(e) => setProspect({ ...prospect, zip: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={prospect.contact_name || ''}
                    onChange={(e) => setProspect({ ...prospect, contact_name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={prospect.contact_email || ''}
                    onChange={(e) => setProspect({ ...prospect, contact_email: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={prospect.contact_phone}
                    onChange={(e) => setProspect({ ...prospect, contact_phone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <input
                    type="text"
                    value={prospect.type}
                    onChange={(e) => setProspect({ ...prospect, type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., Music Store, Restaurant"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Source</label>
                <input
                  type="text"
                  value={prospect.source}
                  onChange={(e) => setProspect({ ...prospect, source: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Google Search, Referral"
                />
              </div>

              {/* AI Intelligence Gathering Section */}
              <div className="border rounded p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <label className="block text-sm font-bold text-purple-900 flex items-center gap-2">
                      🧠 AI Intelligence System
                    </label>
                    {prospect.last_intelligence_gather && (
                      <span className="text-xs text-gray-600">
                        Last gathered: {new Date(prospect.last_intelligence_gather).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={gatherIntelligence}
                    disabled={isGathering || !prospect.website}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg shadow-lg transition-all transform hover:scale-105"
                    title="Gather intelligence with AI"
                  >
                    {isGathering ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Gathering...
                      </>
                    ) : (
                      <>
                        <Brain size={18} />
                        Gather Intelligence
                      </>
                    )}
                  </button>
                </div>

                {gatherError && (
                  <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">
                    ❌ {gatherError}
                  </div>
                )}

                {/* Display Screenshot */}
                {prospect.homepage_screenshot_url && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">📸 Homepage Screenshot</h4>
                    <img
                      src={prospect.homepage_screenshot_url}
                      alt="Website Screenshot"
                      className="w-full rounded-lg border-2 border-gray-200 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => window.open(prospect.homepage_screenshot_url, '_blank')}
                    />
                  </div>
                )}

                {/* Display AI Analysis */}
                {prospect.ai_analysis && (
                  <div className="space-y-4 bg-white p-4 rounded-lg border-2 border-purple-200 shadow-sm">
                    {/* Business Overview */}
                    {prospect.ai_analysis.business_overview && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">📋 Business Overview</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {prospect.ai_analysis.business_overview}
                        </p>
                      </div>
                    )}

                    {/* Business Type */}
                    {prospect.ai_analysis.business_type && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">🏢 Business Type</h4>
                        <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full text-sm font-bold shadow-sm">
                          {prospect.ai_analysis.business_type}
                        </span>
                      </div>
                    )}

                    {/* Key Decision Makers */}
                    {prospect.ai_analysis.key_decision_makers && prospect.ai_analysis.key_decision_makers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">👥 Key Decision Makers</h4>
                        <ul className="space-y-1">
                          {prospect.ai_analysis.key_decision_makers.map((person: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                              <span className="text-blue-500">•</span>
                              {person}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Pain Points */}
                    {prospect.ai_analysis.pain_points && prospect.ai_analysis.pain_points.length > 0 && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <h4 className="text-sm font-semibold text-red-900 mb-2">⚠️ Pain Points</h4>
                        <ul className="space-y-1">
                          {prospect.ai_analysis.pain_points.map((point: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-red-500 mt-0.5">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Buying Signals */}
                    {prospect.ai_analysis.buying_signals && prospect.ai_analysis.buying_signals.length > 0 && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h4 className="text-sm font-semibold text-green-900 mb-2">💰 Buying Signals</h4>
                        <ul className="space-y-1">
                          {prospect.ai_analysis.buying_signals.map((signal: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">•</span>
                              <span>{signal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Rapport Opportunities */}
                    {prospect.ai_analysis.rapport_opportunities && prospect.ai_analysis.rapport_opportunities.length > 0 && (
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <h4 className="text-sm font-semibold text-purple-900 mb-2">🤝 Rapport Opportunities</h4>
                        <ul className="space-y-1">
                          {prospect.ai_analysis.rapport_opportunities.map((opp: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-purple-500 mt-0.5">•</span>
                              <span>{opp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Display Icebreakers */}
                {prospect.icebreakers && prospect.icebreakers.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-bold text-purple-900">💬 Personalized Icebreakers ({prospect.icebreakers.length})</h4>
                    {prospect.icebreakers.map((icebreaker: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-bold">
                            {icebreaker.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{icebreaker.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show message if no data yet */}
                {!prospect.ai_analysis && !isGathering && (
                  <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 text-center">
                    <Brain size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 text-sm">
                      Click "Gather Intelligence" to analyze this prospect with AI
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      AI will capture screenshots, research the company, and generate personalized icebreakers
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-4">
              {/* Actions Section */}
              <div className="border rounded p-4">
                <h3 className="font-medium mb-3">Prospect Actions</h3>
                
                {/* Add New Action */}
                <div className="bg-green-50 p-3 rounded mb-3">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Action notes..."
                      value={newAction.action_notes}
                      onChange={(e) => setNewAction({ ...newAction, action_notes: e.target.value })}
                      className="col-span-2 border rounded px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Person"
                      value={newAction.person}
                      onChange={(e) => setNewAction({ ...newAction, person: e.target.value })}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleAddAction}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                  >
                    <Plus size={16} /> Add Action
                  </button>
                </div>

                {/* Actions List */}
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">Action Notes</th>
                        <th className="px-2 py-1 text-left">Person-Timestamp</th>
                        <th className="px-2 py-1 w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map((action) => (
                        <tr key={action.action_id} className="border-b hover:bg-gray-50">
                          {editingActionId === action.action_id ? (
                            <>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={editingAction?.action_notes || ''}
                                  onChange={(e) => setEditingAction({ ...editingAction!, action_notes: e.target.value })}
                                  className="w-full border rounded px-1"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="text"
                                  value={editingAction?.person || ''}
                                  onChange={(e) => setEditingAction({ ...editingAction!, person: e.target.value })}
                                  className="w-full border rounded px-1"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <button
                                  onClick={handleUpdateAction}
                                  className="text-green-600 hover:text-green-800 p-1"
                                >
                                  <Save size={16} />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 py-1">{action.action_notes}</td>
                              <td className="px-2 py-1 text-xs">
                                {action.person}-{new Date(action.action_timestamp).toLocaleDateString()}
                              </td>
                              <td className="px-2 py-1 flex gap-1">
                                <button
                                  onClick={() => {
                                    setEditingActionId(action.action_id!);
                                    setEditingAction(action);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAction(action.action_id!)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tavily Research Data */}
              {prospect.tavily_research_data && (
                <div className="border rounded p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Globe size={18} />
                    Research Data
                  </h3>
                  <div className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(prospect.tavily_research_data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Navigation Controls */}
        <div className="border-t p-4 bg-gray-50 rounded-b-lg">
          <div className="flex justify-between items-center">
            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-1"
              >
                <ChevronLeft size={20} /> Previous
              </button>
              
              <span className="px-3">
                {currentIndex + 1} of {allProspects.length}
              </span>
              
              <button
                onClick={handleNext}
                disabled={currentIndex === allProspects.length - 1}
                className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-1"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>

            {/* Search Controls */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search prospects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="border rounded px-3 py-2 w-64"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 flex items-center gap-1"
              >
                <Search size={20} /> {isSearching ? 'Searching...' : 'Find'}
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Save Prospect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
