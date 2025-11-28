import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Save, X, Search, HelpCircle, Mic, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface KnowledgeItem {
  id?: number;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  is_active: boolean;
}

const AdminKnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voiceName, setVoiceName] = useState('');
  // Local UI helper for robust keyword entry
  const [keywordsText, setKeywordsText] = useState('');

  // Check if user is admin
  useEffect(() => {
    if (user?.accountNumber !== '999') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load knowledge base items and voice settings
  useEffect(() => {
    loadKnowledgeBase();
    loadVoiceSettings();
  }, []);

  const loadKnowledgeBase = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_knowledge_base')
        .select('*')
        .order('priority', { ascending: false })
        .order('category', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVoiceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_config')
        .select('*')
        .in('config_key', ['elevenlabs_voice_id', 'elevenlabs_voice_name']);

      if (error) {
        // Table doesn't exist or access denied, use defaults
        return;
      }

      if (data) {
        const voiceId = data.find(d => d.config_key === 'elevenlabs_voice_id');
        const voiceNameData = data.find(d => d.config_key === 'elevenlabs_voice_name');
        if (voiceId) setSelectedVoice(voiceId.config_value);
        if (voiceNameData) setVoiceName(voiceNameData.config_value);
      }
    } catch (error) {
    }
  };

  const saveVoiceSettings = async () => {
    try {
      // Update voice ID
      const { error: error1 } = await supabase
        .from('chat_config')
        .update({
          config_value: selectedVoice,
          updated_at: new Date().toISOString(),
          updated_by: user?.accountNumber
        })
        .eq('config_key', 'elevenlabs_voice_id');

      if (error1) {
        alert('Voice settings cannot be saved - configuration table not accessible');
        return;
      }

      // Update voice name
      const { error: error2 } = await supabase
        .from('chat_config')
        .update({
          config_value: voiceName,
          updated_at: new Date().toISOString(),
          updated_by: user?.accountNumber
        })
        .eq('config_key', 'elevenlabs_voice_name');

      if (error2) {
        alert('Voice settings cannot be saved - configuration table not accessible');
        return;
      }

      alert('Voice settings saved successfully!');
      setShowVoiceSettings(false);
    } catch (error) {
      alert('Voice settings cannot be saved - configuration table not accessible');
    }
  };

  const handleSave = async (item: KnowledgeItem) => {
    try {
      if (item.id) {
        // Update existing
        const { error } = await supabase
          .from('chat_knowledge_base')
          .update({
            category: item.category,
            question: item.question,
            answer: item.answer,
            keywords: item.keywords,
            priority: item.priority,
            is_active: item.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('chat_knowledge_base')
          .insert({
            category: item.category,
            question: item.question,
            answer: item.answer,
            keywords: item.keywords,
            priority: item.priority,
            is_active: item.is_active,
            created_by: user?.accountNumber
          });

        if (error) throw error;
      }

      await loadKnowledgeBase();
      alert('Saved successfully!');
      setEditingItem(null);
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('chat_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadKnowledgeBase();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item. Please try again.');
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category)))];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header - Large and Clear */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2" aria-label="Knowledge Base Management">
            <HelpCircle className="inline-block mr-3" size={40} />
            Knowledge Base Management
          </h1>
          <p className="text-xl text-gray-600">Manage chat system responses and information</p>
        </div>

        {/* Controls - Large Buttons */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => {
                setIsAddingNew(true);
                setEditingItem({
                  category: 'General',
                  question: '',
                  answer: '',
                  keywords: [],
                  priority: 0,
                  is_active: true
                });
                setKeywordsText('');
              }}
              className="px-8 py-4 bg-green-600 text-white text-xl font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all"
              aria-label="Add new knowledge item"
            >
              <Plus className="inline-block mr-2" size={28} />
              Add New Item
            </button>

            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className="px-8 py-4 bg-purple-600 text-white text-xl font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all"
              aria-label="Configure voice settings"
            >
              <Mic className="inline-block mr-2" size={28} />
              Voice Settings
            </button>

            {/* Search - Large Input */}
            <div className="flex-1 min-w-[300px]">
              <label htmlFor="search" className="sr-only">Search knowledge base</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
                <input
                  id="search"
                  type="text"
                  placeholder="Search questions, answers, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-14 pr-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  aria-label="Search knowledge base"
                />
              </div>
            </div>

            {/* Category Filter - Large Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              aria-label="Filter by category"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="text-lg text-gray-600">
            Showing {filteredItems.length} of {items.length} items
          </div>
        </div>

        {/* Voice Settings Panel */}
        {showVoiceSettings && (
          <div className="bg-purple-50 border-4 border-purple-400 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Settings className="mr-3" size={32} />
              ElevenLabs Voice Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-semibold mb-2" htmlFor="voice-select">
                  Select Voice Actor
                </label>
                <select
                  id="voice-select"
                  value={selectedVoice}
                  onChange={(e) => {
                    setSelectedVoice(e.target.value);
                    const option = e.target.options[e.target.selectedIndex];
                    setVoiceName(option.text.split(' - ')[0]);
                  }}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  aria-label="Select ElevenLabs voice"
                >
                  <option value="">-- Select a Voice --</option>
                  <optgroup label="Female Voices">
                    <option value="21m00Tcm4TlvDq8ikWAM">Rachel - American, young adult female</option>
                    <option value="AZnzlk1XvdvUeBnXmlld">Domi - American, young adult female</option>
                    <option value="EXAVITQu4vr4xnSDxMaL">Bella - American, young adult female (default)</option>
                    <option value="MF3mGyEYCl7XYWbV9V6O">Elli - American, young adult female</option>
                    <option value="XB0fDUnXU5powFXDhCwa">Charlotte - English-Swedish, middle aged female</option>
                    <option value="Xb7hH8MSUJpSbSDYk0k2">Alice - British, middle aged female</option>
                    <option value="pFZP5JQG7iQjIQuC4Bku">Lily - British, middle aged female</option>
                  </optgroup>
                  <optgroup label="Male Voices">
                    <option value="ErXwobaYiN019PkySvjV">Antoni - American, adult male</option>
                    <option value="VR6AewLTigWG4xSOukaG">Arnold - American, adult male</option>
                    <option value="pNInz6obpgDQGcFmaJgB">Adam - American, middle aged male</option>
                    <option value="yoZ06aMxZJJ28mfd3POQ">Sam - American, young adult male</option>
                    <option value="TxGEqnHWrfWFTfGW9XjX">Josh - American, young adult male</option>
                    <option value="2EiwWnXFnvU5JabPnv8n">Clyde - American, adult male</option>
                    <option value="IKne3meq5aSn9XLyUdCD">Charlie - Australian, middle aged male</option>
                    <option value="XrExE9yKIg1WjnnlVkGX">Patrick - American, middle aged male</option>
                  </optgroup>
                  <optgroup label="Special Voices">
                    <option value="iP95p4xoKVk53GoZ742B">Chris - American, middle aged male (conversational)</option>
                    <option value="onwK4e9ZLuTAKqWW03F9">Daniel - British, middle aged male (news presenter)</option>
                    <option value="ThT5KcBeYPX3keUQqHPh">Dorothy - British, young adult female (children's stories)</option>
                    <option value="LcfcDJNUP1GQjkzn1xUU">Emily - American, young adult female (meditation/calm)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-lg font-semibold mb-2">
                  Current Voice: <span className="text-purple-600">{voiceName || 'Not selected'}</span>
                </label>
                <p className="text-gray-600">
                  This voice will be used for all AI chat responses when voice mode is enabled.
                </p>
              </div>

              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                <p className="text-lg font-semibold mb-2">💡 Voice Selection Tips:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Choose a voice that matches your brand personality</li>
                  <li>Test different voices with sample text before selecting</li>
                  <li>Consider your target audience (age, preferences)</li>
                  <li>Some voices work better for technical content, others for casual chat</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={saveVoiceSettings}
                  className="px-8 py-4 bg-purple-600 text-white text-xl font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300"
                  aria-label="Save voice settings"
                >
                  <Save className="inline-block mr-2" size={24} />
                  Save Voice Settings
                </button>
                <button
                  onClick={() => setShowVoiceSettings(false)}
                  className="px-8 py-4 bg-gray-600 text-white text-xl font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300"
                  aria-label="Cancel voice settings"
                >
                  <X className="inline-block mr-2" size={24} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit/Add Form */}
        {(editingItem || isAddingNew) && (
          <div className="bg-yellow-50 border-4 border-yellow-400 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">
              {isAddingNew ? 'Add New Item' : 'Edit Item'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-semibold mb-2" htmlFor="category">
                  Category
                </label>
                <input
                  id="category"
                  type="text"
                  list="kb-categories"
                  value={editingItem.category}
                  onChange={(e) => setEditingItem(prev => ({ ...(prev as KnowledgeItem), category: e.target.value }))}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Hours, Shipping, Returns"
                />
                <datalist id="kb-categories">
                  {categories.filter(c => c !== 'all').map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-lg font-semibold mb-2" htmlFor="question">
                  Question
                </label>
                <textarea
                  id="question"
                  value={editingItem.question}
                  onChange={(e) => setEditingItem(prev => ({ ...(prev as KnowledgeItem), question: e.target.value }))}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  rows={2}
                  placeholder="What question will customers ask?"
                />
              </div>

              <div>
                <label className="block text-lg font-semibold mb-2" htmlFor="answer">
                  Answer
                </label>
                <textarea
                  id="answer"
                  value={editingItem.answer}
                  onChange={(e) => setEditingItem(prev => ({ ...(prev as KnowledgeItem), answer: e.target.value }))}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  rows={4}
                  placeholder="The response to give to customers"
                />
              </div>

              <div>
                <label className="block text-lg font-semibold mb-2" htmlFor="keywords">
                  Keywords (comma separated)
                </label>
                <input
                  id="keywords"
                  type="text"
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="e.g., hours, schedule, time, open"
                />
              </div>

              <div className="flex gap-6">
                <div>
                  <label className="block text-lg font-semibold mb-2" htmlFor="priority">
                    Priority (0-10)
                  </label>
                  <input
                    id="priority"
                    type="number"
                    min="0"
                    max="10"
                    value={editingItem.priority}
                    onChange={(e) => setEditingItem(prev => ({ ...(prev as KnowledgeItem), priority: parseInt(e.target.value) || 0 }))}
                    className="px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="text-lg font-semibold mr-3" htmlFor="active">
                    Active
                  </label>
                  <input
                    id="active"
                    type="checkbox"
                    checked={editingItem.is_active}
                    onChange={(e) => setEditingItem(prev => ({ ...(prev as KnowledgeItem), is_active: e.target.checked }))}
                    className="w-6 h-6"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    const parsed = (keywordsText || '').split(',').map(k => k.trim()).filter(Boolean);
                    handleSave({ ...(editingItem as KnowledgeItem), keywords: parsed });
                  }}
                  className="px-8 py-4 bg-blue-600 text-white text-xl font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
                  aria-label="Save changes"
                >
                  <Save className="inline-block mr-2" size={24} />
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddingNew(false);
                  }}
                  className="px-8 py-4 bg-gray-600 text-white text-xl font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300"
                  aria-label="Cancel editing"
                >
                  <X className="inline-block mr-2" size={24} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items List - Large and Accessible */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xl">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xl text-gray-500">
              No items found. Add your first knowledge base item!
            </div>
          ) : (
            <div className="divide-y-2 divide-gray-200">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-6 hover:bg-gray-50 transition-colors ${!item.is_active ? 'opacity-50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                          {item.category}
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          Priority: {item.priority}
                        </span>
                        {!item.is_active && (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.question}</h3>
                      <p className="text-lg text-gray-700 mb-2">{item.answer}</p>
                      {item.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.keywords.map((keyword, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setKeywordsText(item.keywords?.join(', ') || '');
                        }}
                        className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
                        aria-label={`Edit ${item.question}`}
                      >
                        <Edit2 size={24} />
                      </button>
                      <button
                        onClick={() => item.id && handleDelete(item.id)}
                        className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-4 focus:ring-red-300"
                        aria-label={`Delete ${item.question}`}
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminKnowledgeBase;
