import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Search,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Users,
  FileText,
  BarChart3,
  Plus,
  CheckCircle2,
  PhoneOff,
  Voicemail,
  PhoneCall,
  Calendar,
  Building2,
  User,
  ChevronRight,
  X,
  Edit3,
  Save,
  Loader2,
  Star,
  TrendingUp,
  Filter,
  RefreshCw,
  AlertCircle,
  Bell,
  ChevronDown,
  ChevronUp,
  Package,
  Settings,
  UserPlus,
  LogOut,
  Home,
  ExternalLink,
  MoreHorizontal,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
  ShoppingCart,
  Target,
  Activity,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';

// ============================================
// TYPES
// ============================================
interface Account {
  account_number: number;
  acct_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  mobile_phone: string;
  email_address: string;
  contact: string;
  website: string;
  terms: string;
  salesman: string;
  status: string;
  updated_at: string;
  dstamp: string;
}

interface CallRecord {
  id: string;
  account_number: number;
  call_date: string;
  call_outcome: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'email';
  notes: string;
  callback_date: string | null;
  callback_reason: string | null;
  is_callback_complete: boolean;
  called_by: string;
  duration_minutes: number | null;
  created_at: string;
}

interface Contact {
  id: string;
  account_number: number;
  contact_name: string;
  title: string;
  phone: string;
  extension: string;
  mobile: string;
  email: string;
  is_primary: boolean;
  notes: string;
  created_at: string;
}

type TabType = 'activity' | 'contacts' | 'stats';

interface PendingCallback {
  id: string;
  account_number: number;
  acct_name: string;
  callback_date: string;
  callback_reason: string | null;
  notes: string;
  call_outcome: string;
}

interface AccountHealth {
  account_number: number;
  account_name: string;
  account_salesman: string;
  sales_dollars_current_90: number;
  order_count_current_90: number;
  avg_order_value_current_90: number;
  distinct_products_current_90: number;
  sales_dollars_prior_90: number;
  order_count_prior_90: number;
  avg_order_value_prior_90: number;
  distinct_products_prior_90: number;
  sales_dollars_yoy_90: number;
  order_count_yoy_90: number;
  sales_pct_change_vs_prior: number;
  sales_pct_change_vs_yoy: number;
  order_freq_pct_change: number;
  avg_order_value_pct_change: number;
  days_since_last_order: number;
  first_order_date: string;
  lifetime_order_count: number;
  lifetime_sales_dollars: number;
  health_score: number;
  health_status: string;
}

interface DailySales {
  invoice_date: string;
  sales_dollars: number;
  order_count: number;
  line_item_count: number;
}

interface ReorderPrediction {
  account_number: number;
  part_number: string;
  main_group: string;
  sub_group: string;
  order_count: number;
  avg_interval_days: number;
  last_order_date: string;
  days_since_last_order: number;
  predicted_next_order: string;
  days_until_predicted: number;
  in_upcoming_window: boolean;
  confidence_score: number;
}

interface CrossSellOpportunity {
  id: number;
  account_number: number;
  recommended_main_group: string;
  recommended_sub_group: string;
  pct_of_peers_purchasing: number;
  avg_peer_annual_spend: number;
  estimated_opportunity_dollars: number;
  opportunity_score: number;
  account_has_purchased_before: boolean;
  months_since_last_purchase: number | null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatPhone = (phone: string | null): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const getRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// Generate a consistent color based on name
const getAvatarColor = (name: string): string => {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-500',
    'from-teal-500 to-green-500',
    'from-red-500 to-orange-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ============================================
// SKELETON LOADER COMPONENTS
// ============================================
const SkeletonPulse: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`} />
);

const CustomerListSkeleton: React.FC = () => (
  <div className="space-y-1">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="px-4 py-3 flex items-center gap-3">
        <SkeletonPulse className="w-14 h-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-3/4" />
          <SkeletonPulse className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

const ActivitySkeleton: React.FC = () => (
  <div className="p-4 space-y-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex gap-3">
        <SkeletonPulse className="w-3 h-3 rounded-full mt-1" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <SkeletonPulse className="h-6 w-20 rounded-full" />
            <SkeletonPulse className="h-4 w-16" />
          </div>
          <SkeletonPulse className="h-16 w-full rounded-xl" />
          <SkeletonPulse className="h-3 w-24" />
        </div>
      </div>
    ))}
  </div>
);

// ============================================
// CALL OUTCOME BADGE COMPONENT
// ============================================
const OutcomeBadge: React.FC<{ outcome: string }> = ({ outcome }) => {
  const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    answered: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: 'Answered',
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
    },
    voicemail: {
      icon: <Voicemail className="w-3 h-3" />,
      label: 'Voicemail',
      className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
    },
    no_answer: {
      icon: <PhoneOff className="w-3 h-3" />,
      label: 'No Answer',
      className: 'bg-gray-50 text-gray-600 ring-1 ring-gray-600/20'
    },
    busy: {
      icon: <Phone className="w-3 h-3" />,
      label: 'Busy',
      className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20'
    },
    email: {
      icon: <Mail className="w-3 h-3" />,
      label: 'Email',
      className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20'
    }
  };

  const defaultBadge = { icon: <Phone className="w-3 h-3" />, label: outcome, className: 'bg-gray-50 text-gray-600 ring-1 ring-gray-600/20' };
  const { icon, label, className } = config[outcome] || defaultBadge;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md ${className}`}>
      {icon}
      {label}
    </span>
  );
};

// ============================================
// CUSTOMER LIST ITEM COMPONENT
// ============================================
const CustomerListItem: React.FC<{
  account: Account;
  isSelected: boolean;
  onClick: () => void;
  hasCallback?: boolean;
}> = ({ account, isSelected, onClick, hasCallback }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 relative
        transition-all duration-150 ease-out group
        focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500
        ${isSelected
          ? 'bg-indigo-50 border-l-[3px] border-l-indigo-600'
          : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {/* Account Number Badge */}
        <div className={`
          px-2.5 py-1.5 rounded-lg text-xs font-semibold tabular-nums
          transition-all duration-150
          ${isSelected
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
          }
        `}>
          {account.account_number}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium text-sm truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
              {account.acct_name}
            </h3>
            {hasCallback && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Pending callback" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {account.city && account.state ? `${account.city}, ${account.state}` : 'No location'}
            {account.salesman && <span className="text-gray-400"> · {account.salesman}</span>}
          </p>
        </div>

        <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 ${
          isSelected ? 'text-indigo-400 translate-x-0.5' : 'text-gray-300 group-hover:text-gray-400'
        }`} />
      </div>
    </button>
  );
};

// ============================================
// QUICK ACTION BUTTON COMPONENT
// ============================================
const QuickActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  disabled?: boolean;
  size?: 'sm' | 'md';
}> = ({ icon, label, onClick, variant = 'secondary', disabled, size = 'md' }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:bg-indigo-800',
    secondary: 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 active:bg-gray-100',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:bg-emerald-800'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center rounded-lg font-medium
        transition-all duration-150 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variants[variant]} ${sizes[size]}
      `}
    >
      {icon}
      {label}
    </button>
  );
};

// ============================================
// INFO CARD COMPONENT
// ============================================
const InfoCard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  label?: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  href?: string;
}> = ({ icon, iconBg, label, value, subValue, href }) => {
  const content = (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/80 transition-colors group">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        {label && <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-0.5">{label}</p>}
        <p className={`text-sm font-medium text-gray-900 truncate ${href ? 'group-hover:text-indigo-600' : ''}`}>
          {value}
        </p>
        {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
      </div>
      {href && <ExternalLink className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />}
    </div>
  );

  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }
  return content;
};

// ============================================
// ACTIVITY TAB COMPONENT
// ============================================
const ActivityTab: React.FC<{
  accountNumber: number;
  staffUsername: string;
}> = ({ accountNumber, staffUsername }) => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCall, setShowNewCall] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newCall, setNewCall] = useState({
    outcome: 'answered' as CallRecord['call_outcome'],
    notes: '',
    callbackDate: '',
    callbackTime: '',
    callbackReason: ''
  });

  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_calls')
        .select('*')
        .eq('account_number', accountNumber)
        .order('call_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCalls(data || []);
    } catch (err) {
      console.error('Error loading calls:', err);
    } finally {
      setLoading(false);
    }
  }, [accountNumber]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  const handleSaveCall = async () => {
    if (!newCall.notes.trim()) return;

    setSaving(true);
    try {
      const callbackDateTime = newCall.callbackDate && newCall.callbackTime
        ? new Date(`${newCall.callbackDate}T${newCall.callbackTime}`).toISOString()
        : newCall.callbackDate
          ? new Date(`${newCall.callbackDate}T09:00`).toISOString()
          : null;

      const { error } = await supabase
        .from('account_calls')
        .insert({
          account_number: accountNumber,
          call_outcome: newCall.outcome,
          notes: newCall.notes,
          callback_date: callbackDateTime,
          callback_reason: newCall.callbackReason || null,
          called_by: staffUsername
        });

      if (error) throw error;

      setNewCall({ outcome: 'answered', notes: '', callbackDate: '', callbackTime: '', callbackReason: '' });
      setShowNewCall(false);
      loadCalls();
    } catch (err) {
      console.error('Error saving call:', err);
    } finally {
      setSaving(false);
    }
  };

  const markCallbackComplete = async (callId: string) => {
    try {
      await supabase
        .from('account_calls')
        .update({ is_callback_complete: true })
        .eq('id', callId);
      loadCalls();
    } catch (err) {
      console.error('Error marking callback complete:', err);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Activity Log</h3>
          <p className="text-xs text-gray-500 mt-0.5">{calls.length} recorded</p>
        </div>
        <button
          onClick={() => setShowNewCall(!showNewCall)}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500
            ${showNewCall
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }
          `}
        >
          {showNewCall ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showNewCall ? 'Cancel' : 'Log Activity'}
        </button>
      </div>

      {/* New Call Form */}
      {showNewCall && (
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <div className="space-y-4">
            {/* Outcome Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Outcome</label>
              <div className="flex flex-wrap gap-2">
                {(['answered', 'voicemail', 'no_answer', 'busy', 'email'] as const).map(outcome => (
                  <button
                    key={outcome}
                    onClick={() => setNewCall(prev => ({ ...prev, outcome }))}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-indigo-500
                      ${newCall.outcome === outcome
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 ring-1 ring-gray-300 hover:ring-gray-400'
                      }
                    `}
                  >
                    {outcome.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={newCall.notes}
                onChange={e => setNewCall(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="What was discussed? Key takeaways, action items..."
                rows={3}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  placeholder:text-gray-400 resize-none transition-shadow"
              />
            </div>

            {/* Callback Scheduling */}
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-3">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                Schedule Callback (Optional)
              </label>

              {/* Quick Callback Buttons */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  { label: 'Tomorrow', days: 1 },
                  { label: '2 Days', days: 2 },
                  { label: '1 Week', days: 7 },
                  { label: '2 Weeks', days: 14 },
                  { label: '1 Month', days: 30 }
                ].map(option => {
                  const futureDate = new Date();
                  futureDate.setDate(futureDate.getDate() + option.days);
                  const dateStr = futureDate.toISOString().split('T')[0];
                  const isSelected = newCall.callbackDate === dateStr;

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setNewCall(prev => ({
                        ...prev,
                        callbackDate: isSelected ? '' : dateStr,
                        callbackTime: isSelected ? '' : (prev.callbackTime || '09:00')
                      }))}
                      className={`
                        px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150
                        ${isSelected
                          ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-600/30'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newCall.callbackDate}
                  onChange={e => setNewCall(prev => ({ ...prev, callbackDate: e.target.value }))}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="time"
                  value={newCall.callbackTime}
                  onChange={e => setNewCall(prev => ({ ...prev, callbackTime: e.target.value }))}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <input
                type="text"
                value={newCall.callbackReason}
                onChange={e => setNewCall(prev => ({ ...prev, callbackReason: e.target.value }))}
                placeholder="Callback reason..."
                className="w-full mt-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveCall}
              disabled={saving || !newCall.notes.trim()}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm
                hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                shadow-sm transition-all duration-150 flex items-center justify-center gap-2
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Activity
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <ActivitySkeleton />
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No activity yet</h4>
            <p className="text-xs text-gray-500 max-w-[200px]">Log your first call or interaction to start tracking</p>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {calls.map((call, index) => (
              <div
                key={call.id}
                className="group relative pl-6"
              >
                {/* Timeline */}
                <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-2 ${index === 0 ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                  {index < calls.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>

                {/* Content */}
                <div className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-150">
                  <div className="flex items-center gap-2 mb-2">
                    <OutcomeBadge outcome={call.call_outcome} />
                    <span className="text-xs text-gray-400">by {call.called_by}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{getRelativeTime(call.call_date)}</span>
                  </div>

                  <p className="text-sm text-gray-700 leading-relaxed">{call.notes}</p>

                  {/* Callback info */}
                  {call.callback_date && !call.is_callback_complete && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-medium text-amber-800">
                          Callback: {formatDateTime(call.callback_date)}
                          {call.callback_reason && ` — ${call.callback_reason}`}
                        </span>
                      </div>
                      <button
                        onClick={() => markCallbackComplete(call.id)}
                        className="text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded hover:bg-amber-100 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// CONTACTS TAB COMPONENT
// ============================================
const ContactsTab: React.FC<{
  accountNumber: number;
  primaryContact: string;
  primaryPhone: string;
  primaryEmail: string;
}> = ({ accountNumber, primaryContact, primaryPhone, primaryEmail }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newContact, setNewContact] = useState({
    name: '',
    title: '',
    phone: '',
    extension: '',
    mobile: '',
    email: '',
    notes: ''
  });

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_contacts')
        .select('*')
        .eq('account_number', accountNumber)
        .order('is_primary', { ascending: false })
        .order('contact_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [accountNumber]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSaveContact = async () => {
    if (!newContact.name.trim()) return;

    setSaving(true);
    try {
      const phoneWithExt = newContact.phone
        ? (newContact.extension ? `${newContact.phone} x${newContact.extension}` : newContact.phone)
        : null;

      const { error } = await supabase
        .from('account_contacts')
        .insert({
          account_number: accountNumber,
          contact_name: newContact.name,
          title: newContact.title || null,
          phone: phoneWithExt,
          mobile: newContact.mobile || null,
          email: newContact.email || null,
          notes: newContact.notes || null,
          is_primary: contacts.length === 0
        });

      if (error) throw error;

      setNewContact({ name: '', title: '', phone: '', extension: '', mobile: '', email: '', notes: '' });
      setShowAdd(false);
      loadContacts();
    } catch (err) {
      console.error('Error saving contact:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Contacts</h3>
          <p className="text-xs text-gray-500 mt-0.5">{contacts.length + (primaryContact ? 1 : 0)} people</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500
            ${showAdd
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }
          `}
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'Cancel' : 'Add Contact'}
        </button>
      </div>

      {/* Add Contact Form */}
      {showAdd && (
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newContact.name}
              onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Contact name *"
              className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <input
              type="text"
              value={newContact.title}
              onChange={e => setNewContact(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Title (e.g., Owner)"
              className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="flex gap-2">
              <input
                type="tel"
                value={newContact.phone}
                onChange={e => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone"
                className="flex-1 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                value={newContact.extension}
                onChange={e => setNewContact(prev => ({ ...prev, extension: e.target.value }))}
                placeholder="Ext"
                className="w-16 px-2 py-2.5 bg-white border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <input
              type="tel"
              value={newContact.mobile}
              onChange={e => setNewContact(prev => ({ ...prev, mobile: e.target.value }))}
              placeholder="Mobile"
              className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <input
              type="email"
              value={newContact.email}
              onChange={e => setNewContact(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className="col-span-2 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSaveContact}
            disabled={saving || !newContact.name.trim()}
            className="w-full mt-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm
              hover:bg-indigo-700 disabled:opacity-50 shadow-sm
              transition-all duration-150 flex items-center justify-center gap-2
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Contact
          </button>
        </div>
      )}

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-3">
        {/* Primary Contact from Account */}
        {primaryContact && !contacts.some(c => c.contact_name.toLowerCase() === primaryContact.toLowerCase()) && (
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-semibold text-sm shadow-sm">
                {getInitials(primaryContact)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-gray-900">{primaryContact}</p>
                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-medium rounded">Primary</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600">
                  {primaryPhone && (
                    <a href={`tel:${primaryPhone}`} className="hover:text-indigo-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {formatPhone(primaryPhone)}
                    </a>
                  )}
                  {primaryEmail && (
                    <a href={`mailto:${primaryEmail}`} className="hover:text-indigo-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {primaryEmail}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : contacts.length === 0 && !primaryContact ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No contacts yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first contact above</p>
          </div>
        ) : (
          contacts.map(contact => (
            <div key={contact.id} className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-150">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(contact.contact_name)} text-white flex items-center justify-center font-semibold text-sm shadow-sm`}>
                  {getInitials(contact.contact_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900">{contact.contact_name}</p>
                    {contact.is_primary && (
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-medium rounded">Primary</span>
                    )}
                  </div>
                  {contact.title && <p className="text-xs text-gray-500">{contact.title}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="hover:text-indigo-600 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {formatPhone(contact.phone)}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="hover:text-indigo-600 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {contact.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================
// STATS TAB COMPONENT
// ============================================
const StatsTab: React.FC<{ accountNumber: number }> = ({ accountNumber }) => {
  const [accountHealth, setAccountHealth] = useState<AccountHealth | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [predictions, setPredictions] = useState<ReorderPrediction[]>([]);
  const [opportunities, setOpportunities] = useState<CrossSellOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        // Load account health
        const { data: healthData, error: healthError } = await supabase
          .from('agg_account_health')
          .select('*')
          .eq('account_number', accountNumber)
          .single();

        if (healthError && healthError.code !== 'PGRST116') {
          console.error('Error loading health:', healthError);
        } else {
          setAccountHealth(healthData);
        }

        // Load daily sales (last 365 days)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const { data: salesData, error: salesError } = await supabase
          .from('agg_account_daily')
          .select('invoice_date, sales_dollars, order_count, line_item_count')
          .eq('account_number', accountNumber)
          .gte('invoice_date', oneYearAgo.toISOString().split('T')[0])
          .order('invoice_date', { ascending: true });

        if (salesError) {
          console.error('Error loading sales:', salesError);
        } else {
          setDailySales(salesData || []);
        }

        // Load reorder predictions (in upcoming window, high confidence)
        const { data: predData, error: predError } = await supabase
          .from('predictions_account_part')
          .select('*')
          .eq('account_number', accountNumber)
          .eq('in_upcoming_window', true)
          .gte('confidence_score', 3)
          .order('confidence_score', { ascending: false })
          .order('days_until_predicted', { ascending: true })
          .limit(10);

        if (predError) {
          console.error('Error loading predictions:', predError);
        } else {
          setPredictions(predData || []);
        }

        // Load cross-sell opportunities (score >= 3)
        const { data: oppData, error: oppError } = await supabase
          .from('opportunities_account_crosssell')
          .select('*')
          .eq('account_number', accountNumber)
          .gte('opportunity_score', 3)
          .order('opportunity_score', { ascending: false })
          .order('estimated_opportunity_dollars', { ascending: false })
          .limit(10);

        if (oppError) {
          console.error('Error loading opportunities:', oppError);
        } else {
          setOpportunities(oppData || []);
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [accountNumber]);

  const getHealthScoreColor = (score: number): string => {
    if (score >= 3) return 'text-emerald-600 bg-emerald-50';
    if (score >= 1) return 'text-blue-600 bg-blue-50';
    if (score === 0) return 'text-gray-600 bg-gray-50';
    if (score >= -2) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getHealthScoreBadge = (score: number): string => {
    if (score >= 3) return 'bg-emerald-600';
    if (score >= 1) return 'bg-blue-600';
    if (score === 0) return 'bg-gray-600';
    if (score >= -2) return 'bg-amber-600';
    return 'bg-red-600';
  };

  const getTrendIcon = (value: number) => {
    if (value > 5) return <ArrowUp className="w-4 h-4 text-emerald-600" />;
    if (value < -5) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getConfidenceBadge = (score: number): string => {
    if (score === 5) return 'bg-emerald-600 text-white';
    if (score === 4) return 'bg-blue-600 text-white';
    if (score === 3) return 'bg-amber-600 text-white';
    return 'bg-gray-600 text-white';
  };

  const getOpportunityBadge = (score: number): string => {
    if (score === 5) return 'bg-purple-600 text-white';
    if (score === 4) return 'bg-indigo-600 text-white';
    return 'bg-blue-600 text-white';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!accountHealth) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
          <AlertCircle className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          This account doesn't have analytics data yet. Data will appear after the first order.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Health Score Banner */}
        <div className={`p-6 rounded-2xl ${getHealthScoreColor(accountHealth.health_score)} border border-current border-opacity-20`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-75">Account Health</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getHealthScoreBadge(accountHealth.health_score)} text-white`}>
                  {accountHealth.health_score >= 0 ? '+' : ''}{accountHealth.health_score}
                </span>
              </div>
              <h3 className="text-2xl font-bold capitalize">{accountHealth.health_status.replace('_', ' ')}</h3>
              <p className="text-sm mt-1 opacity-75">
                {accountHealth.days_since_last_order} days since last order
              </p>
            </div>
            <Activity className="w-16 h-16 opacity-20" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {/* Current 90 Days Sales */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-indigo-600" />
              </div>
              {getTrendIcon(accountHealth.sales_pct_change_vs_prior)}
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Last 90 Days</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(accountHealth.sales_dollars_current_90)}
            </p>
            <p className={`text-xs mt-1 font-medium ${accountHealth.sales_pct_change_vs_prior >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatPercent(accountHealth.sales_pct_change_vs_prior)} vs prior
            </p>
          </div>

          {/* Order Count */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
              </div>
              {getTrendIcon(accountHealth.order_freq_pct_change)}
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Orders (90d)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {accountHealth.order_count_current_90}
            </p>
            <p className={`text-xs mt-1 font-medium ${accountHealth.order_freq_pct_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatPercent(accountHealth.order_freq_pct_change)} frequency
            </p>
          </div>

          {/* Average Order Value */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              {getTrendIcon(accountHealth.avg_order_value_pct_change)}
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Avg Order Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(accountHealth.avg_order_value_current_90)}
            </p>
            <p className={`text-xs mt-1 font-medium ${accountHealth.avg_order_value_pct_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatPercent(accountHealth.avg_order_value_pct_change)} vs prior
            </p>
          </div>

          {/* Lifetime Value */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Lifetime Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(accountHealth.lifetime_sales_dollars)}
            </p>
            <p className="text-xs mt-1 text-gray-500 font-medium">
              {accountHealth.lifetime_order_count} orders total
            </p>
          </div>
        </div>

        {/* Sales Trend Chart */}
        {dailySales.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sales Trend (12 Months)</h3>
              <p className="text-sm text-gray-500">Daily sales activity over the past year</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailySales}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="invoice_date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales_dollars"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                  name="Sales"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Period Comparison */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Current 90 Days</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Sales</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(accountHealth.sales_dollars_current_90)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Orders</span>
                <span className="text-sm font-bold text-gray-900">{accountHealth.order_count_current_90}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Products</span>
                <span className="text-sm font-bold text-gray-900">{accountHealth.distinct_products_current_90}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Prior 90 Days</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Sales</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(accountHealth.sales_dollars_prior_90)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Orders</span>
                <span className="text-sm font-bold text-gray-900">{accountHealth.order_count_prior_90}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Products</span>
                <span className="text-sm font-bold text-gray-900">{accountHealth.distinct_products_prior_90}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Same Period Last Year</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Sales</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(accountHealth.sales_dollars_yoy_90)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Orders</span>
                <span className="text-sm font-bold text-gray-900">{accountHealth.order_count_yoy_90}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">YoY Change</span>
                <span className={`text-sm font-bold ${accountHealth.sales_pct_change_vs_yoy >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatPercent(accountHealth.sales_pct_change_vs_yoy)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reorder Predictions */}
        {predictions.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                Upcoming Reorder Predictions
              </h3>
              <p className="text-sm text-gray-500">Products likely to be reordered soon</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Product</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Reorder Pattern</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Days Until</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {predictions.map((pred, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <span className="text-sm font-medium text-gray-900 font-mono">{pred.part_number}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-sm text-gray-700">{pred.main_group}</div>
                        <div className="text-xs text-gray-500">{pred.sub_group}</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-sm text-gray-600">Every {Math.round(pred.avg_interval_days)} days</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          pred.days_until_predicted < 0
                            ? 'bg-red-100 text-red-700'
                            : pred.days_until_predicted <= 3
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {pred.days_until_predicted < 0 ? `${Math.abs(pred.days_until_predicted)}d overdue` : `${pred.days_until_predicted}d`}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${getConfidenceBadge(pred.confidence_score)}`}>
                          {pred.confidence_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cross-Sell Opportunities */}
        {opportunities.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Cross-Sell Opportunities
              </h3>
              <p className="text-sm text-gray-500">Products that similar accounts purchase</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Peer Adoption</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Potential Revenue</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Score</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {opportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="text-sm font-medium text-gray-900">{opp.recommended_main_group}</div>
                        <div className="text-xs text-gray-500">{opp.recommended_sub_group}</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-sm font-semibold text-indigo-600">{opp.pct_of_peers_purchasing.toFixed(0)}%</span>
                        <div className="text-xs text-gray-500">of peers buy this</div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(opp.estimated_opportunity_dollars)}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${getOpportunityBadge(opp.opportunity_score)}`}>
                          {opp.opportunity_score}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {opp.account_has_purchased_before ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3 mr-1" />
                            Lapsed {opp.months_since_last_purchase}mo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                            New Opportunity
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty States */}
        {predictions.length === 0 && opportunities.length === 0 && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">No Predictions or Opportunities</h4>
            <p className="text-xs text-gray-500">More data needed to generate actionable insights</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// CALLBACKS PANEL COMPONENT
// ============================================
const CallbacksPanel: React.FC<{
  staffUsername: string;
  onSelectAccount: (accountNumber: number) => void;
}> = ({ staffUsername, onSelectAccount }) => {
  const [callbacks, setCallbacks] = useState<PendingCallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  const loadCallbacks = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('account_calls')
        .select(`
          id,
          account_number,
          callback_date,
          callback_reason,
          notes,
          call_outcome,
          accounts_lcmd!inner(acct_name)
        `)
        .eq('called_by', staffUsername)
        .eq('is_callback_complete', false)
        .not('callback_date', 'is', null)
        .lte('callback_date', today.toISOString())
        .order('callback_date', { ascending: true });

      if (error) throw error;

      const formattedCallbacks = (data || []).map((cb: any) => ({
        id: cb.id,
        account_number: cb.account_number,
        acct_name: cb.accounts_lcmd?.acct_name || 'Unknown',
        callback_date: cb.callback_date,
        callback_reason: cb.callback_reason,
        notes: cb.notes,
        call_outcome: cb.call_outcome
      }));

      setCallbacks(formattedCallbacks);
    } catch (err) {
      console.error('Error loading callbacks:', err);
    } finally {
      setLoading(false);
    }
  }, [staffUsername]);

  useEffect(() => {
    if (staffUsername) {
      loadCallbacks();
    }
  }, [loadCallbacks, staffUsername]);

  const markComplete = async (callbackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase
        .from('account_calls')
        .update({ is_callback_complete: true })
        .eq('id', callbackId);
      loadCallbacks();
    } catch (err) {
      console.error('Error marking callback complete:', err);
    }
  };

  const isOverdue = (dateStr: string) => {
    const callbackDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    callbackDate.setHours(0, 0, 0, 0);
    return callbackDate < today;
  };

  if (callbacks.length === 0 && !loading) {
    return null;
  }

  const overdueCount = callbacks.filter(c => isOverdue(c.callback_date)).length;

  return (
    <div className="bg-amber-50 border-b border-amber-200/80">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-amber-900 text-sm">Today's Callbacks</h3>
            <p className="text-xs text-amber-700">
              {loading ? 'Loading...' : `${callbacks.length} pending`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {overdueCount} overdue
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
        </div>
      </button>

      {/* Callbacks List */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2 max-h-40 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            </div>
          ) : (
            callbacks.map(callback => (
              <button
                key={callback.id}
                onClick={() => onSelectAccount(callback.account_number)}
                className={`
                  w-full p-3 rounded-lg text-left transition-all duration-150
                  ${isOverdue(callback.callback_date)
                    ? 'bg-red-50 border border-red-200 hover:bg-red-100'
                    : 'bg-white border border-amber-200 hover:bg-amber-50'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm truncate ${isOverdue(callback.callback_date) ? 'text-red-800' : 'text-gray-900'}`}>
                        {callback.acct_name}
                      </span>
                      {isOverdue(callback.callback_date) && (
                        <span className="px-1.5 py-0.5 bg-red-200 text-red-800 text-[10px] font-bold rounded uppercase">
                          Overdue
                        </span>
                      )}
                    </div>
                    {callback.callback_reason && (
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{callback.callback_reason}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(callback.callback_date)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => markComplete(callback.id, e)}
                    className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors flex-shrink-0"
                    title="Mark complete"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// CUSTOMER DETAIL VIEW COMPONENT
// ============================================
const CustomerDetailView: React.FC<{
  account: Account;
  staffUsername: string;
  onClose: () => void;
}> = ({ account, staffUsername, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('activity');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'activity', label: 'Activity', icon: <PhoneCall className="w-4 h-4" /> },
    { id: 'contacts', label: 'Contacts', icon: <Users className="w-4 h-4" /> },
    { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> }
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="px-6 py-5">
          {/* Title Row */}
          <div className="flex items-start gap-4">
            {/* Account Number Badge */}
            <div className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-lg font-bold shadow-sm tabular-nums">
              {account.account_number}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900 truncate">{account.acct_name}</h2>
                {account.status && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    account.status.toLowerCase() === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {account.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {account.city && account.state && `${account.city}, ${account.state}`}
                {account.salesman && <span> · Rep: {account.salesman}</span>}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <QuickActionButton
                icon={<Phone className="w-4 h-4" />}
                label="Call"
                onClick={() => account.phone && window.open(`tel:${account.phone}`)}
                variant="primary"
                disabled={!account.phone}
                size="sm"
              />
              <QuickActionButton
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                onClick={() => account.email_address && window.open(`mailto:${account.email_address}`)}
                disabled={!account.email_address}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <InfoCard
              icon={<MapPin className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-100"
              value={account.address || 'No address'}
              subValue={`${account.city || ''}, ${account.state || ''} ${account.zip || ''}`}
            />
            <InfoCard
              icon={<Phone className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-100"
              value={formatPhone(account.phone) || 'No phone'}
              subValue={account.mobile_phone ? `Mobile: ${formatPhone(account.mobile_phone)}` : undefined}
              href={account.phone ? `tel:${account.phone}` : undefined}
            />
            <InfoCard
              icon={<Mail className="w-4 h-4 text-blue-600" />}
              iconBg="bg-blue-100"
              label="Email"
              value={account.email_address || 'No email'}
              href={account.email_address ? `mailto:${account.email_address}` : undefined}
            />
          </div>
          {(account.contact || account.website || account.terms) && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              {account.contact && (
                <InfoCard
                  icon={<User className="w-4 h-4 text-purple-600" />}
                  iconBg="bg-purple-100"
                  label="Contact"
                  value={account.contact}
                />
              )}
              {account.website && (
                <InfoCard
                  icon={<Globe className="w-4 h-4 text-cyan-600" />}
                  iconBg="bg-cyan-100"
                  label="Website"
                  value={account.website}
                  href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                />
              )}
              {account.terms && (
                <InfoCard
                  icon={<Building2 className="w-4 h-4 text-amber-600" />}
                  iconBg="bg-amber-100"
                  label="Terms"
                  value={account.terms}
                />
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 border-t border-gray-100">
          <nav className="flex gap-1 -mb-px" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500
                  ${activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {activeTab === 'activity' && (
          <ActivityTab accountNumber={account.account_number} staffUsername={staffUsername} />
        )}
        {activeTab === 'contacts' && (
          <ContactsTab
            accountNumber={account.account_number}
            primaryContact={account.contact}
            primaryPhone={account.phone}
            primaryEmail={account.email_address}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab accountNumber={account.account_number} />
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN BACKEND SYSTEM PAGE COMPONENT
// ============================================
const CRMPage: React.FC = () => {
  const navigate = useNavigate();
  const { staffUsername, isStaffUser, isSuperUser, openProspectsModal, logout } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAllAccounts, setShowAllAccounts] = useState(false);

  // Load accounts with salesman filter
  useEffect(() => {
    const loadAccounts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('accounts_lcmd')
          .select('*')
          .order('acct_name');

        if (!isSuperUser && !showAllAccounts && staffUsername) {
          query = query.or(`salesman.ilike.%${staffUsername}%,salesman.is.null,salesman.eq.`);
        }

        const { data, error } = await query;

        if (error) throw error;
        setAccounts(data || []);
        setFilteredAccounts(data || []);
      } catch (err) {
        console.error('Error loading accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [staffUsername, isSuperUser, showAllAccounts]);

  // Filter accounts based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAccounts(accounts);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const searchDigits = term.replace(/\D/g, '');
    const isPhoneSearch = searchDigits.length >= 7;

    const filtered = accounts.filter(a => {
      if (a.acct_name?.toLowerCase().includes(term)) return true;
      if (a.account_number?.toString().includes(term)) return true;
      if (a.zip?.startsWith(term) || a.zip?.includes(term)) return true;
      if (a.city?.toLowerCase().includes(term)) return true;
      if (a.state?.toLowerCase().includes(term)) return true;

      if (isPhoneSearch && searchDigits.length >= 7) {
        const phoneDigits = a.phone?.replace(/\D/g, '') || '';
        const mobileDigits = a.mobile_phone?.replace(/\D/g, '') || '';
        if (phoneDigits === searchDigits || phoneDigits.endsWith(searchDigits)) return true;
        if (mobileDigits === searchDigits || mobileDigits.endsWith(searchDigits)) return true;
      }

      if (a.contact?.toLowerCase().includes(term)) return true;

      return false;
    });
    setFilteredAccounts(filtered);
  }, [searchTerm, accounts]);

  return (
    <div className="min-h-screen h-screen max-h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Navigation Header */}
      <header className="bg-slate-900 text-white flex-shrink-0">
        <div className="flex items-center h-14 px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mr-8 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
            <div className="font-semibold text-sm">
              <span className="text-blue-400">Music</span>
              <span className="text-red-400">Supplies</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-white text-sm font-medium">
              <Users className="w-4 h-4" />
              Backend System
            </div>

            <Link
              to="/invoicing"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              Invoicing
            </Link>

            <Link
              to="/products"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <Package className="w-4 h-4" />
              Products
            </Link>

            <button
              onClick={openProspectsModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Prospects
            </button>

            <Link
              to="/manager"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manager
            </Link>
          </nav>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-72 mr-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search accounts..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                placeholder:text-gray-500 transition-all"
            />
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">{staffUsername || 'Staff'}</div>
              <div className="text-xs text-gray-500">{isSuperUser ? 'Super User' : 'Staff'}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
          {/* Callbacks Panel */}
          {staffUsername && (
            <CallbacksPanel
              staffUsername={staffUsername}
              onSelectAccount={(accountNumber) => {
                const account = accounts.find(a => a.account_number === accountNumber);
                if (account) setSelectedAccount(account);
              }}
            />
          )}

          {/* Sidebar Header */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Customers</h2>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full tabular-nums">
                {filteredAccounts.length}
              </span>
            </div>

            {isSuperUser && (
              <button
                onClick={() => setShowAllAccounts(!showAllAccounts)}
                className={`w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  showAllAccounts
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {showAllAccounts ? 'All Accounts' : 'My Accounts'}
              </button>
            )}
          </div>

          {/* Customer List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <CustomerListSkeleton />
            ) : filteredAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">No customers found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {searchTerm ? 'Try a different search' : 'No accounts assigned'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAccounts.map(account => (
                  <CustomerListItem
                    key={account.account_number}
                    account={account}
                    isSelected={selectedAccount?.account_number === account.account_number}
                    onClick={() => setSelectedAccount(account)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Area */}
        <main className="flex-1 overflow-hidden">
          {selectedAccount ? (
            <CustomerDetailView
              account={selectedAccount}
              staffUsername={staffUsername || 'Unknown'}
              onClose={() => setSelectedAccount(null)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center bg-gray-50">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-5">
                <Building2 className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Select a Customer</h3>
              <p className="text-sm text-gray-500">Choose from the list to view details</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CRMPage;
