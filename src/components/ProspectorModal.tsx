import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase, FUNCTIONS_URL } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ActivityLogModal from './ActivityLogModal';
import ConvertToAccountModal from './ConvertToAccountModal';

type IntelligenceStatus = 'idle' | 'researching' | 'generating' | 'complete' | 'error';

interface ProspectorRow {
  website: string;
  business_name?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  facebook_page?: string | null;
  instagram_page?: string | null;

  // Enrichment fields (single-table prospector)
  homepage_screenshot_url?: string | null;
  intelligence_status?: IntelligenceStatus | null;
  last_intelligence_gather?: string | null;
  tavily_research_data?: any;
  ai_markdown?: string | null;
  icebreakers?: string | null;

  // New AI grading/focus fields
  ai_grade?: string | null;
  ai_grade_reason?: string | null;
  ai_music_focus?: boolean | null;
}

interface ProspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  website?: string;
}

/**
 * ProspectorModal
 * - Title bar shows compact identifiers (Business Name — City — website)
 * - Tabs:
 *   - Intelligence (default): stepper + run button + screenshot + markdown + icebreakers
 *   - Details: small form to edit business_name/city (website is read-only)
 * - All bound to single-table 'prospector'
 */
const ProspectorModal: React.FC<ProspectorModalProps> = ({ isOpen, onClose, website }) => {
  const { staffUsername, user } = useAuth();
  const [record, setRecord] = useState<ProspectorRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'intelligence' | 'details'>('intelligence');
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const titleBusiness = record?.business_name?.trim() || '';
  const titleCity = record?.city?.trim() || '';
  const titleWebsite = record?.website || website || '';

  const status: IntelligenceStatus = (record?.intelligence_status as IntelligenceStatus) || 'idle';

  const stepIndex = useMemo(() => {
    switch (status) {
      case 'researching': return 0; // Start at step 0 (Research company offerings)
      case 'generating': return 1; // Move to step 1 (Generate sales report)
      case 'complete': return 2; // Complete at step 2 (Analysis complete)
      case 'error': return -1;
      case 'idle':
      default: return -1;
    }
  }, [status]);

  const steps = [
    { key: 'researching', label: 'Tavily data enrichment' },
    { key: 'generating', label: 'OpenAI analysis & icebreaker generation' },
    { key: 'complete', label: 'Intelligence complete' },
  ];

  const load = async () => {
    if (!isOpen || !website) return;
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      // Use maybeSingle() instead of single() to handle 0 or 1 rows gracefully
      const { data, error } = await supabase
        .from('prospector')
        .select('website, business_name, city, phone, email, facebook_page, instagram_page, homepage_screenshot_url, intelligence_status, last_intelligence_gather, ai_markdown, icebreakers, ai_grade, ai_grade_reason, ai_music_focus')
        .eq('website', website)
        .maybeSingle();
      if (error) throw error;

      // If no record found, show a clearer message
      if (!data) {
        setErr(`No prospect found with website: ${website}`);
        setLoading(false);
        return;
      }
      
      // CRITICAL FIX: Generate screenshot URL from Supabase Storage if not already set
      if (data && !data.homepage_screenshot_url) {
        const screenshotFilename = `${website}.png`;
        const { data: urlData } = supabase.storage
          .from('prospect-screenshots')
          .getPublicUrl(screenshotFilename);
        
        data.homepage_screenshot_url = urlData.publicUrl;
        
        // Update the database with the screenshot URL for future use
        await supabase
          .from('prospector')
          .update({ homepage_screenshot_url: urlData.publicUrl })
          .eq('website', website);
      }
      
      setRecord((data || null) as ProspectorRow);
    } catch (e: any) {
      console.error('Failed to load prospector row:', e);
      setErr(e?.message || 'Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('intelligence');
      load();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, website]);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('prospector')
          .select('website, business_name, city, phone, homepage_screenshot_url, intelligence_status, last_intelligence_gather, ai_markdown, icebreakers, ai_grade, ai_grade_reason, ai_music_focus')
          .eq('website', website as string)
          .maybeSingle();
        if (data) {
          // CRITICAL FIX: Generate screenshot URL from Supabase Storage if not already set
          if (!data.homepage_screenshot_url) {
            const screenshotFilename = `${website}.png`;
            const { data: urlData } = supabase.storage
              .from('prospect-screenshots')
              .getPublicUrl(screenshotFilename);
            
            data.homepage_screenshot_url = urlData.publicUrl;
          }
          
          setRecord(data as ProspectorRow);
          // stop on terminal states
          if (data.intelligence_status === 'complete' || data.intelligence_status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch (e) {
        // ignore transient poll errors
      }
    }, 1500);
  };

  const runIntelligence = async () => {
    if (!website) return;
    setErr(null);
    setMsg(null);
    try {
      // Immediately bump UI status to "researching" (skip capturing phase)
      setRecord(prev => (prev ? { ...prev, intelligence_status: 'researching' } : prev));
  
  
      // Use the Supabase SDK with proper authentication
      const { data, error } = await supabase.functions.invoke('gather-prospector-intelligence', {
        body: {
          website,
          business_name: record?.business_name || undefined,
          city: record?.city || undefined,
          staff_username: staffUsername
        }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

  
      // Start polling until status transitions to complete/error
      startPolling();
      setMsg('Intelligence gathering started...');
    } catch (e: any) {
      console.error('Intelligence error:', e);
      setErr(e?.message || 'Failed to start intelligence gathering.');
      await supabase.from('prospector').update({ intelligence_status: 'error' }).eq('website', website);
      load();
    }
  };

  const handleChange = (field: keyof ProspectorRow, value: string) => {
    setRecord(prev => prev ? { ...prev, [field]: value } as ProspectorRow : prev);
    setMsg(null);
  };

  const handleSave = async () => {
    if (!record?.website) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const payload = {
        website: record.website.trim(),
        business_name: (record.business_name || '').trim() || null,
        city: (record.city || '').trim() || null,
        phone: (record.phone || '').trim() || null
      };
      const { error } = await supabase
        .from('prospector')
        .upsert([payload], { onConflict: 'website' });
      if (error) throw error;
      setMsg('Saved identifiers.');
    } catch (e: any) {
      console.error('Save error:', e);
      setErr(e?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleConversionSuccess = (accountNumber: string) => {
    setMsg(`✅ Successfully converted to Account #${accountNumber}! The new account has been created.`);
    // Optionally reload the prospect data to reflect any updates
    load();
  };

  if (!isOpen) return null;

  const Title = () => (
    <div className="flex flex-col">
      <div className="text-xl font-bold">
        {titleBusiness || '(Unnamed)'}
      </div>
      <div className="text-green-100 text-xs">
        {titleCity ? `${titleCity} — ` : ''}{titleWebsite}
      </div>
    </div>
  );

  const StatusPill = () => {
    const map: Record<string, string> = {
      idle: 'bg-gray-200 text-gray-800',
      researching: 'bg-purple-200 text-purple-900',
      generating: 'bg-amber-200 text-amber-900',
      complete: 'bg-green-200 text-green-900',
      error: 'bg-red-200 text-red-900'
    };
    const cls = map[status] || map['idle'];
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
        {status}
      </span>
    );
  };

  const IntelligenceTab = () => (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill />
          {record?.ai_grade && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              record.ai_grade === 'A' ? 'bg-green-600 text-white' :
              record.ai_grade === 'B' ? 'bg-blue-600 text-white' :
              record.ai_grade === 'C' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'
            }`}>
              Grade {record.ai_grade}
            </span>
          )}
          {typeof record?.ai_music_focus === 'boolean' && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              record.ai_music_focus ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
            }`}>
              {record.ai_music_focus ? '🎸 Music Focus' : 'General'}
            </span>
          )}
          {record?.last_intelligence_gather && (
            <span className="text-xs text-gray-500">
              Last run: {new Date(record.last_intelligence_gather).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActivityLog(true)}
            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow"
            title="View Activity Log"
          >
            📋 Activity Log
          </button>
          <button
            onClick={() => setShowConvertModal(true)}
            className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow"
            title="Convert this prospect to an Account"
          >
            🔄 Convert to Account
          </button>
          <button
            onClick={runIntelligence}
            disabled={status === 'researching' || status === 'generating'}
            className={`px-4 py-2 rounded text-white font-semibold shadow
              ${status === 'complete' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
              disabled:bg-gray-400`}
            title={status === 'complete' ? 'Re-run Intelligence' : 'Gather Intelligence'}
          >
            {status === 'complete' ? 'Re-run Intelligence' : 'Gather Intelligence'}
          </button>
        </div>
      </div>

      {/* Visual stepper */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((s, idx) => {
          const isActive = stepIndex === idx;
          const isDone = stepIndex > idx || status === 'complete';
          const isError = status === 'error' && idx === (stepIndex === -1 ? 0 : stepIndex);
          return (
            <div key={s.key} className={`rounded-lg border p-3 ${isDone ? 'border-green-300 bg-green-50' : isActive ? 'border-blue-300 bg-blue-50' : isError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-2">
                {isDone ? (
                  <span className="text-green-600 font-bold">✓</span>
                ) : isError ? (
                  <span className="text-red-600 font-bold">!</span>
                ) : isActive ? (
                  <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="text-gray-400 font-bold">•</span>
                )}
                <div className="text-sm font-semibold">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Screenshot + Sales Intelligence + Icebreakers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 text-sm font-semibold bg-gray-50 border-b">Homepage</div>
            <div className="p-2">
              {record?.homepage_screenshot_url ? (
                <button
                  type="button"
                  onClick={() => setShowZoom(true)}
                  className="block w-full text-left"
                  title="Click to open full-height zoom"
                >
                  <img
                    src={record.homepage_screenshot_url}
                    alt="Homepage screenshot"
                    className="w-full h-auto rounded shadow"
                  />
                  <div className="text-xs text-gray-500 mt-1">Click to zoom and scroll full height</div>
                </button>
              ) : (
                <div className="text-sm text-gray-500">No screenshot yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 text-sm font-semibold bg-gray-50 border-b">Sales Intelligence</div>
            <div className="p-3">
              {record?.ai_markdown ? (
                (() => {
                  // Check if content contains HTML tags (like <div>, <h1>, <p>, <ul>, etc.)
                  const hasHtmlTags = /<(div|h[1-6]|p|ul|ol|li|strong|em|span|a|br|hr)[>\s]/i.test(record.ai_markdown);

                  // If HTML tags are found, render as HTML directly
                  if (hasHtmlTags) {
                    return (
                      <div
                        className="prose prose-sm max-w-none text-gray-800"
                        dangerouslySetInnerHTML={{ __html: record.ai_markdown }}
                      />
                    );
                  }

                  // Otherwise, process as markdown
                  return (
                    <div className="prose prose-sm max-w-none text-gray-800">
                      {record.ai_markdown.split('\n').map((line, index) => {
                        // Function to convert <NEGATIVE> tags to red styling
                        const formatNegativeTags = (text: string) => {
                          return text.replace(/<NEGATIVE>(.*?)<\/NEGATIVE>/gi,
                            '<span class="font-bold text-red-600">$1</span>'
                          );
                        };

                        // Handle headers
                        if (line.startsWith('### ')) {
                          const headerText = line.replace('### ', '');
                          return <h3 key={index} className="text-lg font-bold mt-4 mb-2 text-gray-900">{headerText.replace(/\*\*/g, '')}</h3>
                        }
                        if (line.startsWith('## ')) {
                          const headerText = line.replace('## ', '');
                          return <h2 key={index} className="text-xl font-bold mt-4 mb-2 text-gray-900">{headerText.replace(/\*\*/g, '')}</h2>
                        }
                        if (line.startsWith('# ')) {
                          const headerText = line.replace('# ', '');
                          return <h1 key={index} className="text-2xl font-bold mt-4 mb-2 text-gray-900">{headerText.replace(/\*\*/g, '')}</h1>
                        }

                        // Handle bullet points
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          const content = line.replace(/^[*-] /, '');
                          let formattedContent = formatNegativeTags(content);

                          // Handle bold text within bullet points
                          if (formattedContent.includes('**')) {
                            const parts = formattedContent.split('**');
                            formattedContent = parts.map((part, i) =>
                              i % 2 === 1 ? `<strong class="font-bold">${part}</strong>` : part
                            ).join('');
                          }

                          return <li key={index} className="ml-4 mb-1" dangerouslySetInnerHTML={{ __html: formattedContent }} />;
                        }

                        // Handle bold text and negative tags
                        if (line.includes('**') || line.includes('<NEGATIVE>')) {
                          let formattedLine = line;

                          // First apply negative tag formatting
                          formattedLine = formatNegativeTags(formattedLine);

                          // Then handle bold text
                          const parts = formattedLine.split('**');
                          return (
                            <p key={index} className="mb-2" dangerouslySetInnerHTML={{
                              __html: parts.map((part, i) =>
                                i % 2 === 1 ? `<strong class="font-bold">${part}</strong>` : part
                              ).join('')
                            }} />
                          );
                        }

                        // Handle empty lines
                        if (line.trim() === '') {
                          return <br key={index} />
                        }

                        // Regular paragraphs - check for negative tags
                        const formattedLine = formatNegativeTags(line);
                        if (formattedLine !== line) {
                          return <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                        }

                        return <p key={index} className="mb-2">{line}</p>
                      })}
                    </div>
                  );
                })()
              ) : (
                <div className="text-sm text-gray-500">No analysis yet.</div>
              )}
            </div>
          </div>

          <div className="border rounded-lg mt-3">
            <div className="px-3 py-2 text-sm font-semibold bg-gray-50 border-b">Icebreakers</div>
            <div className="p-3">
              {record?.icebreakers ? (
                <div className="prose prose-sm max-w-none text-gray-800">
                  {record.icebreakers.split('\n').map((line, index) => {
                    // Function to convert <NEGATIVE> tags to red styling
                    const formatNegativeTags = (text: string) => {
                      return text.replace(/<NEGATIVE>(.*?)<\/NEGATIVE>/gi,
                        '<span class="font-bold text-red-600">$1</span>'
                      );
                    };

                    // Handle headers
                    if (line.startsWith('### ')) {
                      return <h3 key={index} className="text-lg font-bold mt-3 mb-2 text-gray-900">{line.replace('### ', '')}</h3>
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={index} className="text-xl font-bold mt-3 mb-2 text-gray-900">{line.replace('## ', '')}</h2>
                    }
                    if (line.startsWith('# ')) {
                      return <h1 key={index} className="text-2xl font-bold mt-3 mb-2 text-gray-900">{line.replace('# ', '')}</h1>
                    }
                    
                    // Handle bullet points - apply markdown formatting to the content
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      const content = line.replace(/^[*-] /, '');
                      let formattedContent = formatNegativeTags(content);
                      
                      if (content.includes('**')) {
                        const parts = formattedContent.split('**');
                        const htmlContent = parts.map((part, i) =>
                          i % 2 === 1 ? `<strong class="font-bold">${part}</strong>` : part
                        ).join('');
                        
                        return (
                          <div key={index} className="flex items-start gap-2 mb-1">
                            <span className="mt-1 text-green-600">•</span>
                            <span className="text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: htmlContent }} />
                          </div>
                        );
                      } else {
                        return (
                          <div key={index} className="flex items-start gap-2 mb-1">
                            <span className="mt-1 text-green-600">•</span>
                            <span className="text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: formattedContent }} />
                          </div>
                        );
                      }
                    }
                    
                    // Handle bold text and negative tags in regular paragraphs
                    if (line.includes('**') || line.includes('<NEGATIVE>')) {
                      let formattedLine = formatNegativeTags(line);
                      
                      const parts = formattedLine.split('**');
                      const htmlContent = parts.map((part, i) =>
                        i % 2 === 1 ? `<strong class="font-bold">${part}</strong>` : part
                      ).join('');
                      
                      return (
                        <p key={index} className="mb-2 text-sm" dangerouslySetInnerHTML={{ __html: htmlContent }} />
                      );
                    }
                    
                    // Handle empty lines
                    if (line.trim() === '') {
                      return <br key={index} />
                    }
                    
                    // Regular paragraphs - check for negative tags
                    const formattedLine = formatNegativeTags(line);
                    if (formattedLine !== line) {
                      return <p key={index} className="mb-2 text-sm" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                    }
                    
                    return <p key={index} className="mb-2 text-sm">{line}</p>
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No icebreakers yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {err && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{err}</div>
      )}
      {msg && !err && (
        <div className="p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">{msg}</div>
      )}
    </div>
  );

  const DetailsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Website (read-only) */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Website (Unique Key)
          </label>
          <input
            type="text"
            value={record?.website || website || ''}
            readOnly
            className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-700"
          />
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Business Name
          </label>
          <input
            type="text"
            value={record?.business_name || ''}
            onChange={(e) => handleChange('business_name', e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Company / Store name"
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            City
          </label>
          <input
            type="text"
            value={record?.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="City"
          />
        </div>

        {/* Phone */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Phone Number
          </label>
          <input
            type="text"
            value={record?.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Phone number (research and add if missing)"
          />
        </div>
      </div>

      {/* Alerts */}
      {err && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{err}</div>
      )}
      {msg && !err && (
        <div className="p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">{msg}</div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all disabled:bg-gray-400"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-4 text-white flex items-center justify-between">
          <Title />
          <button
            onClick={() => {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              onClose();
            }}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 bg-white border-b">
          <div className="inline-flex rounded-lg overflow-hidden border border-gray-300">
            <button
              className={`px-4 py-2 text-sm font-semibold ${activeTab === 'intelligence' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('intelligence')}
            >
              Intelligence
            </button>
            <button
              className={`px-4 py-2 text-sm font-semibold ${activeTab === 'details' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent" />
            </div>
          ) : activeTab === 'intelligence' ? (
            <IntelligenceTab />
          ) : (
            <DetailsTab />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={() => {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              onClose();
            }}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* Full-height screenshot zoom overlay */}
      {showZoom && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex flex-col" style={{ height: '100vh', width: '100vw' }}>
          <div className="flex items-center justify-between p-3 text-white bg-black/50 flex-shrink-0">
            <div className="text-sm">Full homepage snapshot (scroll to view entire page)</div>
            <button
              onClick={() => setShowZoom(false)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded"
              title="Close zoom"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
            {record?.homepage_screenshot_url ? (
              <img
                src={record.homepage_screenshot_url}
                alt="Homepage screenshot (full)"
                className="block mx-auto max-w-full h-auto"
                style={{ display: 'block', width: 'auto', maxWidth: '100%' }}
              />
            ) : (
              <div className="text-white text-center p-6">No screenshot available.</div>
            )}
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      <ActivityLogModal
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
        prospectWebsite={website || ''}
        businessName={record?.business_name || ''}
        currentUserEmail={user?.email || ''}
      />

      {/* Convert to Account Modal */}
      <ConvertToAccountModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        prospectData={record ? {
          website: record.website,
          business_name: record.business_name,
          city: record.city,
          phone: record.phone
        } : null}
        onConversionSuccess={handleConversionSuccess}
        staffUsername={staffUsername}
      />
    </div>
  );
};

export default ProspectorModal;
