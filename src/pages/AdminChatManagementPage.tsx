import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';
import { 
  Bot, 
  Save, 
  Plus, 
  Trash2, 
  Edit2, 
  Volume2, 
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  Database,
  Settings
} from 'lucide-react';

interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  question: string;
  response: string;
  priority: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface VoiceConfig {
  voiceId: string;
  voiceName: string;
  provider: 'elevenlabs';
  rateLimit: number; // minutes per IP
  dailyLimit: number; // total minutes per day
  enabled: boolean;
}

interface IPRateLimit {
  ip_address: string;
  minutes_used: number;
  last_reset: string;
  blocked: boolean;
}

const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella - Friendly Female', gender: 'female', style: 'friendly' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel - Professional Female', gender: 'female', style: 'professional' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi - Energetic Female', gender: 'female', style: 'energetic' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni - Professional Male', gender: 'male', style: 'professional' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold - Deep Male', gender: 'male', style: 'deep' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam - Narrator Male', gender: 'male', style: 'narrator' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam - Casual Male', gender: 'male', style: 'casual' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli - Young Female', gender: 'female', style: 'youthful' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Claire - British Female', gender: 'female', style: 'british' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy - Pleasant Female', gender: 'female', style: 'pleasant' }
];

const AdminChatManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'knowledge' | 'voice' | 'security'>('knowledge');
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    voiceName: 'Bella',
    provider: 'elevenlabs',
    rateLimit: 5, // 5 minutes per IP by default
    dailyLimit: 100, // 100 minutes total per day
    enabled: true
  });
  const [ipLimits, setIpLimits] = useState<IPRateLimit[]>([]);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  // Local UI helpers
  const [keywordsText, setKeywordsText] = useState<string>('');
  const categoryOptions = Array.from(new Set(knowledgeEntries.map(e => e.category))).sort();

  // Load data on mount
  useEffect(() => {
    loadKnowledgeBase();
    loadVoiceConfig();
    loadIPRateLimits();
  }, []);

  // Check if user is admin
  if (!user || user.accountNumber !== '999') {
    return <Navigate to="/" replace />;
  }

  const loadKnowledgeBase = async () => {
    try {
      // First check if table exists, if not create it
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'chat_knowledge_base');

      if (!tables || tables.length === 0) {
        // Create the table
        await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS chat_knowledge_base (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              category VARCHAR(100) NOT NULL,
              keywords TEXT[] DEFAULT '{}',
              question TEXT NOT NULL,
              response TEXT NOT NULL,
              priority INTEGER DEFAULT 0,
              active BOOLEAN DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Enable RLS
            ALTER TABLE chat_knowledge_base ENABLE ROW LEVEL SECURITY;
            
            -- Policy for public read (active entries only)
            CREATE POLICY "Public can read active knowledge" ON chat_knowledge_base
              FOR SELECT USING (active = true);
            
            -- Policy for admin management
            CREATE POLICY "Admin can manage knowledge" ON chat_knowledge_base
              FOR ALL USING (true);
          `
        });
      }

      // Load entries
      const { data, error } = await supabase
        .from('chat_knowledge_base')
        .select('*')
        .order('priority', { ascending: false })
        .order('category', { ascending: true });

      if (data) {
        setKnowledgeEntries(data);
      }
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    }
  };

  const loadVoiceConfig = async () => {
    try {
      // Check if config table exists
      const { data: configData, error } = await supabase
        .from('chat_voice_config')
        .select('*')
        .single();

      if (error) {
        // Table doesn't exist or access denied, use default config
        return;
      }

      if (configData) {
        setVoiceConfig(configData);
      }
    } catch (error) {
      // Silently handle table access errors
    }
  };

  const loadIPRateLimits = async () => {
    try {
      // Create table if not exists
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS chat_ip_limits (
            ip_address INET PRIMARY KEY,
            minutes_used DECIMAL(10,2) DEFAULT 0,
            last_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            blocked BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `
      });

      const { data } = await supabase
        .from('chat_ip_limits')
        .select('*')
        .order('minutes_used', { ascending: false })
        .limit(50);

      if (data) {
        setIpLimits(data);
      }
    } catch (error) {
      console.error('Error loading IP limits:', error);
    }
  };

  const saveKnowledgeEntry = async (entry: KnowledgeEntry) => {
    setSaveStatus('saving');
    try {
      if (entry.id) {
        // Update existing
        const { error } = await supabase
          .from('chat_knowledge_base')
          .update({
            category: entry.category,
            keywords: entry.keywords,
            question: entry.question,
            response: entry.response,
            priority: entry.priority,
            active: entry.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('chat_knowledge_base')
          .insert({
            category: entry.category,
            keywords: entry.keywords,
            question: entry.question,
            response: entry.response,
            priority: entry.priority,
            active: entry.active
          });

        if (error) throw error;
      }

      setSaveStatus('saved');
      loadKnowledgeBase();
      setEditingEntry(null);
      setIsAddingNew(false);

      // Update the local knowledge base file
      await updateLocalKnowledgeBase();

      alert('Saved successfully!');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving entry:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateLocalKnowledgeBase = async () => {
    try {
      const { data } = await supabase
        .from('chat_knowledge_base')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });

      if (data) {
        // Format for local file
        const formatted = data.reduce((acc, entry) => {
          if (!acc[entry.category]) {
            acc[entry.category] = {};
          }
          acc[entry.category][entry.question] = {
            keywords: entry.keywords,
            response: entry.response
          };
          return acc;
        }, {});

        // This would need a backend endpoint to update the file
      }
    } catch (error) {
      console.error('Error updating local knowledge base:', error);
    }
  };

  const deleteKnowledgeEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('chat_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadKnowledgeBase();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const saveVoiceConfig = async () => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('chat_voice_config')
        .upsert({
          id: 1,
          voice_id: voiceConfig.voiceId,
          voice_name: voiceConfig.voiceName,
          provider: voiceConfig.provider,
          rate_limit: voiceConfig.rateLimit,
          daily_limit: voiceConfig.dailyLimit,
          enabled: voiceConfig.enabled
        });

      if (error) {
        // Table doesn't exist or access denied
        alert('Voice settings cannot be saved - table not accessible');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return;
      }

      // Verify persisted values
      const { data: verify, error: vErr } = await supabase
        .from('chat_voice_config')
        .select('*')
        .single();

      if (!vErr && verify &&
          verify.voice_id === voiceConfig.voiceId &&
          verify.voice_name === voiceConfig.voiceName &&
          verify.provider === voiceConfig.provider &&
          verify.rate_limit === voiceConfig.rateLimit &&
          verify.daily_limit === voiceConfig.dailyLimit &&
          verify.enabled === voiceConfig.enabled) {
        alert('Voice settings saved successfully!');
      } else {
        alert('Voice settings save verification failed. Please try again.');
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const resetIPLimit = async (ip: string) => {
    try {
      const { error } = await supabase
        .from('chat_ip_limits')
        .update({
          minutes_used: 0,
          last_reset: new Date().toISOString(),
          blocked: false
        })
        .eq('ip_address', ip);

      if (error) throw error;
      loadIPRateLimits();
    } catch (error) {
      console.error('Error resetting IP limit:', error);
    }
  };

  const blockIP = async (ip: string, blocked: boolean) => {
    try {
      const { error } = await supabase
        .from('chat_ip_limits')
        .update({ blocked })
        .eq('ip_address', ip);

      if (error) throw error;
      loadIPRateLimits();
    } catch (error) {
      console.error('Error updating IP block status:', error);
    }
  };

  const filteredEntries = knowledgeEntries.filter(entry =>
    entry.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.response.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="text-purple-600" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Chat System Management</h1>
                <p className="text-gray-600">Manage AI knowledge base, voice settings, and security</p>
              </div>
            </div>
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span>Saved successfully</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle size={20} />
                <span>Error saving changes</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'knowledge'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Database size={18} />
              Knowledge Base
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'voice'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Volume2 size={18} />
              Voice Settings
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'security'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Shield size={18} />
              Security & Limits
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Knowledge Base Tab */}
          {activeTab === 'knowledge' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search questions, responses, or keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => {
                    setIsAddingNew(true);
                    setEditingEntry({
                      id: '',
                      category: '',
                      keywords: [],
                      question: '',
                      response: '',
                      priority: 0,
                      active: true
                    });
                    setKeywordsText('');
                  }}
                  className="ml-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Entry
                </button>
              </div>

              {/* Add/Edit Form */}
              {(isAddingNew || editingEntry) && (
                <div className="border rounded-lg p-4 mb-6 bg-gray-50">
                  <h3 className="font-semibold mb-4">
                    {editingEntry?.id ? 'Edit Entry' : 'Add New Entry'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Category</label>
                      <input
                        type="text"
                        list="kb-categories"
                        value={editingEntry?.category || ''}
                        onChange={(e) => setEditingEntry({...editingEntry!, category: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Products, Services, Policies"
                      />
                      <datalist id="kb-categories">
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Priority (0-100)</label>
                      <input
                        type="number"
                        value={editingEntry?.priority || 0}
                        onChange={(e) => setEditingEntry({...editingEntry!, priority: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
                      <input
                        type="text"
                        value={keywordsText}
                        onChange={(e) => setKeywordsText(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="guitar, electric guitar, fender, gibson"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Question/Topic</label>
                      <input
                        type="text"
                        value={editingEntry?.question || ''}
                        onChange={(e) => setEditingEntry({...editingEntry!, question: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="What guitars do you carry?"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Response</label>
                      <textarea
                        value={editingEntry?.response || ''}
                        onChange={(e) => setEditingEntry({...editingEntry!, response: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={4}
                        placeholder="We carry a wide selection of guitars including..."
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editingEntry?.active}
                          onChange={(e) => setEditingEntry({...editingEntry!, active: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">Active</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        const parsed = (keywordsText || '').split(',').map(k => k.trim()).filter(Boolean);
                        saveKnowledgeEntry({ ...editingEntry!, keywords: parsed });
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Save size={18} />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingEntry(null);
                        setIsAddingNew(false);
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Entries Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Category</th>
                      <th className="text-left py-3 px-2">Question</th>
                      <th className="text-left py-3 px-2">Keywords</th>
                      <th className="text-center py-3 px-2">Priority</th>
                      <th className="text-center py-3 px-2">Status</th>
                      <th className="text-center py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                            {entry.category}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">{entry.question}</p>
                            <p className="text-sm text-gray-600 truncate max-w-md">{entry.response}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1">
                            {entry.keywords.slice(0, 3).map((keyword, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                                {keyword}
                              </span>
                            ))}
                            {entry.keywords.length > 3 && (
                              <span className="text-xs text-gray-500">+{entry.keywords.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">{entry.priority}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-1 rounded text-sm ${
                            entry.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {entry.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingEntry(entry);
                                setKeywordsText(entry.keywords?.join(', ') || '');
                              }}
                              className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => deleteKnowledgeEntry(entry.id)}
                              className="text-red-600 hover:bg-red-50 p-1 rounded"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Voice Settings Tab */}
          {activeTab === 'voice' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Voice Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ElevenLabs Voice</label>
                  <select
                    value={voiceConfig.voiceId}
                    onChange={(e) => {
                      const voice = ELEVENLABS_VOICES.find(v => v.id === e.target.value);
                      setVoiceConfig({
                        ...voiceConfig,
                        voiceId: e.target.value,
                        voiceName: voice?.name || ''
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                  >
                    {ELEVENLABS_VOICES.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.style})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-600 mt-1">
                    Select the voice personality for the AI assistant
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Rate Limit (minutes per IP address)
                  </label>
                  <input
                    type="number"
                    value={voiceConfig.rateLimit}
                    onChange={(e) => setVoiceConfig({...voiceConfig, rateLimit: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                    max="60"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Maximum voice minutes allowed per IP address before reset
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Daily Global Limit (total minutes)
                  </label>
                  <input
                    type="number"
                    value={voiceConfig.dailyLimit}
                    onChange={(e) => setVoiceConfig({...voiceConfig, dailyLimit: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="10"
                    max="1000"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Total voice minutes allowed across all users per day
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={voiceConfig.enabled}
                      onChange={(e) => setVoiceConfig({...voiceConfig, enabled: e.target.checked})}
                      className="rounded"
                    />
                    <span className="font-medium">Enable Voice Chat</span>
                  </label>
                  <p className="text-sm text-gray-600 mt-1 ml-6">
                    Turn voice features on/off globally
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={saveVoiceConfig}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Save size={18} />
                    Save Voice Settings
                  </button>
                </div>

                {/* Voice Usage Stats */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock size={18} />
                    Voice Usage Today
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Minutes Used</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {ipLimits.reduce((sum, ip) => sum + ip.minutes_used, 0).toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unique IPs</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {ipLimits.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">IP Rate Limiting</h3>
                <p className="text-gray-600">
                  Monitor and manage voice usage limits per IP address to prevent abuse
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">IP Address</th>
                      <th className="text-center py-3 px-2">Minutes Used</th>
                      <th className="text-center py-3 px-2">Last Reset</th>
                      <th className="text-center py-3 px-2">Status</th>
                      <th className="text-center py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipLimits.map((limit) => (
                      <tr key={limit.ip_address} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 font-mono text-sm">{limit.ip_address}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`font-medium ${
                            limit.minutes_used >= voiceConfig.rateLimit ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {limit.minutes_used.toFixed(2)} / {voiceConfig.rateLimit}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center text-sm">
                          {new Date(limit.last_reset).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {limit.blocked ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">Blocked</span>
                          ) : limit.minutes_used >= voiceConfig.rateLimit ? (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">Limit Reached</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Active</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => resetIPLimit(limit.ip_address)}
                              className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-sm"
                            >
                              Reset
                            </button>
                            <button
                              onClick={() => blockIP(limit.ip_address, !limit.blocked)}
                              className={`px-2 py-1 rounded text-sm ${
                                limit.blocked 
                                  ? 'text-green-600 hover:bg-green-50' 
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                            >
                              {limit.blocked ? 'Unblock' : 'Block'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {ipLimits.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No voice usage recorded yet
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-yellow-800">Security Notes</h4>
                    <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                      <li>• Voice API is protected by IP-based rate limiting</li>
                      <li>• Each IP can use up to {voiceConfig.rateLimit} minutes before requiring reset</li>
                      <li>• Daily global limit is {voiceConfig.dailyLimit} minutes total</li>
                      <li>• IPs are automatically tracked when voice is used</li>
                      <li>• Blocked IPs cannot use voice features until unblocked</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChatManagementPage;
