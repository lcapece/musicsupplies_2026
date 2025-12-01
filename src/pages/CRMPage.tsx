import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  AreaChart,
  PieChart,
  Pie,
  Cell
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

type TabType = 'activity' | 'contacts' | 'calls' | 'stats' | 'predictions' | 'crosssell' | 'categorysales';

interface CallHistoryRecord {
  id: number;
  call_time: string;
  call_date: string;
  direction: 'Inbound' | 'Outbound' | 'Internal';
  status: 'Answered' | 'Unanswered';
  extension: string;
  employee_name: string;
  phone_number: string;
  talking_seconds: number;
  ringing_seconds: number;
  caller_id_raw: string;
  call_activity_details: string;
  contact_name: string;
  contact_type: 'phone' | 'mobile';
  has_notes: boolean;
  note_count: number;
}

interface CallStats {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  answered_calls: number;
  missed_calls: number;
  total_talk_minutes: number;
  avg_call_duration_seconds: number;
  last_inbound_call: string;
  last_outbound_call: string;
  first_call_date: string;
  unique_employees: number;
  pending_notes: number;
}

interface CallNote {
  id: string;
  call_record_id: number;
  account_number: number;
  note_text: string;
  note_type: string;
  created_by: string;
  created_at: string;
  is_resolved: boolean;
}

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
// Helper to get phone icon color and style based on days since last outbound call
const getPhoneCallStyle = (days: number | null | undefined): { bgColor: string; textColor: string; flash: boolean; title: string } => {
  // No call data = same as 90+ days - red flashing
  if (days === null || days === undefined) {
    return { bgColor: 'bg-red-600', textColor: 'text-white', flash: true, title: 'No outbound calls recorded - URGENT!' };
  }
  // Called within last 30 days - green
  if (days <= 30) {
    return { bgColor: 'bg-emerald-500', textColor: 'text-white', flash: false, title: `Last outbound call: ${days} days ago` };
  }
  // Called 31-89 days ago - amber
  if (days <= 89) {
    return { bgColor: 'bg-amber-500', textColor: 'text-white', flash: false, title: `Last outbound call: ${days} days ago - needs attention` };
  }
  // 90+ days - red flashing
  return { bgColor: 'bg-red-600', textColor: 'text-white', flash: true, title: `Last outbound call: ${days} days ago - URGENT!` };
};

const CustomerListItem: React.FC<{
  account: Account;
  isSelected: boolean;
  onClick: () => void;
  hasCallback?: boolean;
  healthScore?: number;
  hasImminentPrediction?: boolean;
  daysSinceCall?: number | null;
}> = ({ account, isSelected, onClick, hasCallback, healthScore, hasImminentPrediction, daysSinceCall }) => {
  // Get churn-based background color
  const churnColor = getChurnBackgroundColor(healthScore);
  // Get phone icon styling
  const phoneStyle = getPhoneCallStyle(daysSinceCall);

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 relative
        transition-all duration-150 ease-out group
        focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500
        border-l-[3px]
        ${isSelected
          ? 'bg-indigo-50 border-l-indigo-600'
          : churnColor || 'hover:bg-gray-50 border-l-transparent'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {/* Account Number Badge - Pulsates red when prediction within ±15 days */}
        <div className={`
          px-2.5 py-1.5 rounded-lg text-xs font-semibold tabular-nums
          transition-all duration-150
          ${hasImminentPrediction && !isSelected
            ? 'account-number-pulse'
            : isSelected
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
          }
        `}
        title={hasImminentPrediction ? 'Order prediction within ±15 days' : undefined}
        >
          {account.account_number}
        </div>

        {/* Phone Icon with Days Since Last Outbound Call */}
        <div
          className={`
            relative flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0
            ${phoneStyle.bgColor} ${phoneStyle.textColor}
            ${phoneStyle.flash ? 'phone-flash-urgent' : ''}
          `}
          title={phoneStyle.title}
        >
          <Phone className="w-3.5 h-3.5" />
          {daysSinceCall !== null && daysSinceCall !== undefined && (
            <span className="absolute -bottom-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-inherit text-[10px] font-bold flex items-center justify-center border border-white">
              {daysSinceCall > 99 ? '99+' : daysSinceCall}
            </span>
          )}
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
      {/* New Activity Form - Prominent with visual cue */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b-2 border-indigo-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-indigo-900">Log New Activity</h3>
            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">{calls.length} recorded</span>
          </div>
        </div>

        <div className="space-y-2">
          {/* Outcome Selection - Inline */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">Outcome:</span>
            <div className="flex flex-wrap gap-1">
              {(['answered', 'voicemail', 'no_answer', 'busy', 'email'] as const).map(outcome => (
                <button
                  key={outcome}
                  onClick={() => setNewCall(prev => ({ ...prev, outcome }))}
                  className={`
                    px-2 py-1 rounded text-xs font-medium transition-all duration-150
                    ${newCall.outcome === outcome
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 ring-1 ring-gray-300 hover:ring-gray-400'
                    }
                  `}
                >
                  {outcome.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Notes - Compact */}
          <textarea
            value={newCall.notes}
            onChange={e => setNewCall(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notes: What was discussed? Key takeaways..."
            rows={2}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              placeholder:text-gray-400 resize-none"
          />

          {/* Callback Scheduling - Compact inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Callback:
            </span>
            {[
              { label: 'Tomorrow', days: 1 },
              { label: '2 Days', days: 2 },
              { label: '1 Week', days: 7 },
              { label: '2 Wks', days: 14 },
              { label: '1 Mo', days: 30 }
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
                    px-2 py-0.5 rounded text-xs font-medium transition-all
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
            <input
              type="date"
              value={newCall.callbackDate}
              onChange={e => setNewCall(prev => ({ ...prev, callbackDate: e.target.value }))}
              className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs w-28
                focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="time"
              value={newCall.callbackTime}
              onChange={e => setNewCall(prev => ({ ...prev, callbackTime: e.target.value }))}
              className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs w-20
                focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Save Button - Compact */}
          <button
            onClick={handleSaveCall}
            disabled={saving || !newCall.notes.trim()}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm
              hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-all flex items-center justify-center gap-2"
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

      {/* Activity History List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <ActivitySkeleton />
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-indigo-500" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">No Activity Yet</h4>
            <p className="text-xs text-gray-500 max-w-[280px] mb-4">
              Start tracking customer interactions by logging your first call, email, or conversation using the form above.
            </p>
            <div className="flex items-center gap-2 text-xs text-indigo-600">
              <ArrowUp className="w-4 h-4 animate-bounce" />
              <span className="font-medium">Use the form above to get started</span>
            </div>
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
            <textarea
              value={newContact.notes}
              onChange={e => setNewContact(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes / Comments (press Enter for new line)"
              rows={3}
              style={{ fontSize: '10pt', lineHeight: '1.4' }}
              className="col-span-2 px-3 py-2 bg-white border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                resize-none"
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-5 shadow-sm">
              <Users className="w-10 h-10 text-purple-500" />
            </div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">No Contacts Added</h4>
            <p className="text-sm text-gray-500 max-w-[280px] mb-5">
              Keep track of everyone at this company. Add contacts with their roles, phone numbers, and email addresses.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium text-sm
                hover:bg-purple-700 shadow-sm transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500"
            >
              <UserPlus className="w-4 h-4" />
              Add First Contact
            </button>
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
              {/* Notes section */}
              {contact.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10pt] text-gray-600 whitespace-pre-wrap leading-snug">{contact.notes}</p>
                </div>
              )}
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
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-5 shadow-sm">
          <BarChart3 className="w-10 h-10 text-blue-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">Analytics Coming Soon</h3>
        <p className="text-sm text-gray-500 max-w-[300px] mb-5">
          Once this account places their first order, you'll see detailed insights including sales trends, reorder predictions, and growth opportunities.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
            Sales Trends
          </span>
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            Reorder Predictions
          </span>
          <span className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            Cross-Sell Opportunities
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-3 space-y-3">
        {/* Health Score Banner - Compact */}
        <div className={`p-3 rounded-xl ${getHealthScoreColor(accountHealth.health_score)} border border-current border-opacity-20`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">Health</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getHealthScoreBadge(accountHealth.health_score)} text-white`}>
                    {accountHealth.health_score >= 0 ? '+' : ''}{accountHealth.health_score}
                  </span>
                </div>
                <h3 className="text-lg font-bold capitalize">{accountHealth.health_status.replace('_', ' ')}</h3>
              </div>
              <span className="text-xs opacity-75">{accountHealth.days_since_last_order}d since last order</span>
            </div>
            <Activity className="w-10 h-10 opacity-20" />
          </div>
        </div>

        {/* KPI Cards - Compact */}
        <div className="grid grid-cols-4 gap-2">
          {/* Current 90 Days Sales */}
          <div className="bg-white rounded-lg p-2.5 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <div className="w-7 h-7 rounded bg-indigo-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-indigo-600" />
              </div>
              {getTrendIcon(accountHealth.sales_pct_change_vs_prior)}
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Last 90 Days</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(accountHealth.sales_dollars_current_90)}
            </p>
            <p className={`text-[10px] font-medium ${accountHealth.sales_pct_change_vs_prior >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatPercent(accountHealth.sales_pct_change_vs_prior)} vs prior
            </p>
          </div>

          {/* Order Count */}
          <div className="bg-white rounded-lg p-2.5 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <div className="w-7 h-7 rounded bg-emerald-100 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
              </div>
              {getTrendIcon(accountHealth.order_freq_pct_change)}
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Orders (90d)</p>
            <p className="text-lg font-bold text-gray-900">
              {accountHealth.order_count_current_90}
            </p>
            <p className={`text-[10px] font-medium ${accountHealth.order_freq_pct_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatPercent(accountHealth.order_freq_pct_change)} frequency
            </p>
          </div>

          {/* Average Order Value */}
          <div className="bg-white rounded-lg p-2.5 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              {getTrendIcon(accountHealth.avg_order_value_pct_change)}
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Avg Order</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(accountHealth.avg_order_value_current_90)}
            </p>
            <p className={`text-[10px] font-medium ${accountHealth.avg_order_value_pct_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatPercent(accountHealth.avg_order_value_pct_change)} vs prior
            </p>
          </div>

          {/* Lifetime Value */}
          <div className="bg-white rounded-lg p-2.5 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <div className="w-7 h-7 rounded bg-purple-100 flex items-center justify-center">
                <Star className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Lifetime</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(accountHealth.lifetime_sales_dollars)}
            </p>
            <p className="text-[10px] text-gray-500 font-medium">
              {accountHealth.lifetime_order_count} orders
            </p>
          </div>
        </div>

        {/* Sales Trend Chart - Compact */}
        {dailySales.length > 0 && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Sales Trend (12 Months)</h3>
            </div>
            <ResponsiveContainer width="100%" height={160}>
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
                  tick={{ fontSize: 10 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
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

        {/* Period Comparison - Compact Horizontal */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-lg p-2.5 border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Current 90d</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Sales</span>
                <span className="text-xs font-bold text-gray-900">{formatCurrency(accountHealth.sales_dollars_current_90)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Orders</span>
                <span className="text-xs font-bold text-gray-900">{accountHealth.order_count_current_90}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Products</span>
                <span className="text-xs font-bold text-gray-900">{accountHealth.distinct_products_current_90}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-2.5 border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Prior 90d</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Sales</span>
                <span className="text-xs font-bold text-gray-900">{formatCurrency(accountHealth.sales_dollars_prior_90)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Orders</span>
                <span className="text-xs font-bold text-gray-900">{accountHealth.order_count_prior_90}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Products</span>
                <span className="text-xs font-bold text-gray-900">{accountHealth.distinct_products_prior_90}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-2.5 border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">YoY (90d)</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Sales</span>
                <span className="text-xs font-bold text-gray-900">{formatCurrency(accountHealth.sales_dollars_yoy_90)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">Orders</span>
                <span className="text-xs font-bold text-gray-900">{accountHealth.order_count_yoy_90}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-gray-500">YoY Δ</span>
                <span className={`text-xs font-bold ${accountHealth.sales_pct_change_vs_yoy >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatPercent(accountHealth.sales_pct_change_vs_yoy)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PREDICTIONS TAB COMPONENT
// ============================================
const PredictionsTab: React.FC<{ accountNumber: number }> = ({ accountNumber }) => {
  const [predictions, setPredictions] = useState<ReorderPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPredictions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('predictions_account_part')
          .select('*')
          .eq('account_number', accountNumber)
          .eq('in_upcoming_window', true)
          .gte('confidence_score', 3)
          .order('confidence_score', { ascending: false })
          .order('days_until_predicted', { ascending: true })
          .limit(20);

        if (error) throw error;
        setPredictions(data || []);
      } catch (err) {
        console.error('Error loading predictions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPredictions();
  }, [accountNumber]);

  const getConfidenceBadge = (score: number): string => {
    if (score === 5) return 'bg-emerald-600 text-white';
    if (score === 4) return 'bg-blue-600 text-white';
    if (score === 3) return 'bg-amber-600 text-white';
    return 'bg-gray-600 text-white';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-indigo-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">No Predictions Yet</h3>
        <p className="text-sm text-gray-500 max-w-[280px]">
          Once this account has more order history, we'll predict when they're likely to reorder products.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />
            Upcoming Reorder Predictions
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Products likely to be reordered soon</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Product</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Category</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Pattern</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Days</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {predictions.map((pred, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <span className="text-xs font-medium text-gray-900 font-mono">{pred.part_number}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="text-xs text-gray-700">{pred.main_group}</div>
                    <div className="text-[10px] text-gray-500">{pred.sub_group}</div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-xs text-gray-600">~{Math.round(pred.avg_interval_days)}d</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      pred.days_until_predicted < 0
                        ? 'bg-red-100 text-red-700'
                        : pred.days_until_predicted <= 5
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {pred.days_until_predicted < 0 ? `${Math.abs(pred.days_until_predicted)}d overdue` : `${pred.days_until_predicted}d`}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${getConfidenceBadge(pred.confidence_score)}`}>
                      {pred.confidence_score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CROSS-SELL TAB COMPONENT
// ============================================
const CrossSellTab: React.FC<{ accountNumber: number }> = ({ accountNumber }) => {
  const [opportunities, setOpportunities] = useState<CrossSellOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOpportunities = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('opportunities_account_crosssell')
          .select('*')
          .eq('account_number', accountNumber)
          .gte('opportunity_score', 3)
          .order('opportunity_score', { ascending: false })
          .order('estimated_opportunity_dollars', { ascending: false })
          .limit(20);

        if (error) throw error;
        setOpportunities(data || []);
      } catch (err) {
        console.error('Error loading opportunities:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOpportunities();
  }, [accountNumber]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  const getOpportunityBadge = (score: number): string => {
    if (score === 5) return 'bg-purple-600 text-white';
    if (score === 4) return 'bg-indigo-600 text-white';
    return 'bg-blue-600 text-white';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-purple-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">No Cross-Sell Opportunities</h3>
        <p className="text-sm text-gray-500 max-w-[280px]">
          We'll identify products that similar accounts purchase to help grow this account's basket.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Cross-Sell Opportunities
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Products that similar accounts purchase</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Category</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Peers</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Potential</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Score</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div className="text-xs font-medium text-gray-900">{opp.recommended_main_group}</div>
                    <div className="text-[10px] text-gray-500">{opp.recommended_sub_group}</div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-xs font-semibold text-indigo-600">{opp.pct_of_peers_purchasing.toFixed(0)}%</span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className="text-xs font-bold text-gray-900">{formatCurrency(opp.estimated_opportunity_dollars)}</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${getOpportunityBadge(opp.opportunity_score)}`}>
                      {opp.opportunity_score}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {opp.account_has_purchased_before ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                        Lapsed {opp.months_since_last_purchase}mo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                        New
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CATEGORY SALES TAB COMPONENT
// ============================================
interface CategorySalesData {
  name: string;
  sales: number;
  orders: number;
  items: number;
}

const CATEGORY_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308'
];

const CategorySalesTab: React.FC<{ account: Account }> = ({ account }) => {
  const [loading, setLoading] = useState(true);
  const [mainGroupData, setMainGroupData] = useState<CategorySalesData[]>([]);
  const [subGroupData, setSubGroupData] = useState<CategorySalesData[]>([]);
  const [selectedMainGroup, setSelectedMainGroup] = useState<string | null>(null);
  const [drillLevel, setDrillLevel] = useState<'main' | 'sub'>('main');
  const [monthlyData, setMonthlyData] = useState<{ month: string; [key: string]: number | string }[]>([]);

  useEffect(() => {
    const loadCategorySales = async () => {
      setLoading(true);
      try {
        // Get order history for last 12 months
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

        const { data, error } = await supabase
          .from('order_history_lcmd')
          .select('main_group, sub_group, sales_dollars, qty_ordered, invoice_date')
          .eq('account_number', account.account_number)
          .gte('invoice_date', twelveMonthsAgo.toISOString().split('T')[0]);

        if (error) throw error;

        if (data && data.length > 0) {
          // Aggregate by main_group
          const mainGroupMap = new Map<string, { sales: number; orders: Set<string>; items: number }>();
          const monthlyMap = new Map<string, Map<string, number>>();

          data.forEach((row: { main_group: string; sub_group: string; sales_dollars: number; qty_ordered: number; invoice_date: string }) => {
            const mainGroup = row.main_group || 'Uncategorized';
            const month = row.invoice_date.substring(0, 7); // YYYY-MM

            // Main group aggregation
            if (!mainGroupMap.has(mainGroup)) {
              mainGroupMap.set(mainGroup, { sales: 0, orders: new Set(), items: 0 });
            }
            const mg = mainGroupMap.get(mainGroup)!;
            mg.sales += row.sales_dollars || 0;
            mg.orders.add(row.invoice_date);
            mg.items += row.qty_ordered || 0;

            // Monthly trend aggregation
            if (!monthlyMap.has(month)) {
              monthlyMap.set(month, new Map());
            }
            const monthData = monthlyMap.get(month)!;
            monthData.set(mainGroup, (monthData.get(mainGroup) || 0) + (row.sales_dollars || 0));
          });

          // Convert to array and sort by sales
          const mainGroupArray: CategorySalesData[] = Array.from(mainGroupMap.entries())
            .map(([name, data]) => ({
              name,
              sales: data.sales,
              orders: data.orders.size,
              items: data.items
            }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10); // Top 10

          setMainGroupData(mainGroupArray);

          // Build monthly trend data
          const topGroups = mainGroupArray.slice(0, 5).map(g => g.name);
          const sortedMonths = Array.from(monthlyMap.keys()).sort();
          const monthlyArray = sortedMonths.map(month => {
            const entry: { month: string; [key: string]: number | string } = {
              month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            };
            topGroups.forEach(group => {
              entry[group] = monthlyMap.get(month)?.get(group) || 0;
            });
            return entry;
          });
          setMonthlyData(monthlyArray);
        }
      } catch (err) {
        console.error('Error loading category sales:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCategorySales();
  }, [account.account_number]);

  // Load sub-group data when a main group is selected
  useEffect(() => {
    if (!selectedMainGroup) return;

    const loadSubGroupData = async () => {
      try {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

        const { data, error } = await supabase
          .from('order_history_lcmd')
          .select('sub_group, sales_dollars, qty_ordered, invoice_date')
          .eq('account_number', account.account_number)
          .eq('main_group', selectedMainGroup)
          .gte('invoice_date', twelveMonthsAgo.toISOString().split('T')[0]);

        if (error) throw error;

        if (data && data.length > 0) {
          const subGroupMap = new Map<string, { sales: number; orders: Set<string>; items: number }>();

          data.forEach((row: { sub_group: string; sales_dollars: number; qty_ordered: number; invoice_date: string }) => {
            const subGroup = row.sub_group || 'Other';
            if (!subGroupMap.has(subGroup)) {
              subGroupMap.set(subGroup, { sales: 0, orders: new Set(), items: 0 });
            }
            const sg = subGroupMap.get(subGroup)!;
            sg.sales += row.sales_dollars || 0;
            sg.orders.add(row.invoice_date);
            sg.items += row.qty_ordered || 0;
          });

          const subGroupArray: CategorySalesData[] = Array.from(subGroupMap.entries())
            .map(([name, data]) => ({
              name,
              sales: data.sales,
              orders: data.orders.size,
              items: data.items
            }))
            .sort((a, b) => b.sales - a.sales);

          setSubGroupData(subGroupArray);
        }
      } catch (err) {
        console.error('Error loading sub-group data:', err);
      }
    };

    loadSubGroupData();
  }, [selectedMainGroup, account.account_number]);

  const handleBarClick = (data: CategorySalesData) => {
    setSelectedMainGroup(data.name);
    setDrillLevel('sub');
  };

  const handleBackClick = () => {
    setSelectedMainGroup(null);
    setDrillLevel('main');
    setSubGroupData([]);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  const currentData = drillLevel === 'main' ? mainGroupData : subGroupData;
  const topGroups = mainGroupData.slice(0, 5).map(g => g.name);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (mainGroupData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">No Category Data</h3>
        <p className="text-sm text-gray-500 max-w-[280px]">
          Once this account has order history, you'll see sales breakdown by category.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-3">
      <div className="space-y-3">
        {/* Breadcrumb */}
        {drillLevel === 'sub' && (
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              All Categories
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">{selectedMainGroup}</span>
          </div>
        )}

        {/* Chart 1: Category Revenue Bar Chart */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            {drillLevel === 'main' ? 'Sales by Category' : `${selectedMainGroup} Sub-Categories`}
            <span className="text-xs font-normal text-gray-500">(click bar to drill down)</span>
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={currentData} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
              <Bar
                dataKey="sales"
                fill="#6366f1"
                radius={[0, 4, 4, 0]}
                cursor={drillLevel === 'main' ? 'pointer' : 'default'}
                onClick={drillLevel === 'main' ? (data: CategorySalesData) => handleBarClick(data) : undefined}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Category Distribution Pie Chart */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-600" />
            {drillLevel === 'main' ? 'Category Distribution' : `${selectedMainGroup} Distribution`}
          </h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={150}>
              <PieChart>
                <Pie
                  data={currentData.slice(0, 8)}
                  dataKey="sales"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  innerRadius={30}
                  onClick={drillLevel === 'main' ? (data: CategorySalesData) => handleBarClick(data) : undefined}
                  cursor={drillLevel === 'main' ? 'pointer' : 'default'}
                >
                  {currentData.slice(0, 8).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {currentData.slice(0, 6).map((item, index) => (
                <div
                  key={item.name}
                  className={`flex items-center gap-2 text-xs ${drillLevel === 'main' ? 'cursor-pointer hover:bg-gray-50 p-1 rounded' : ''}`}
                  onClick={drillLevel === 'main' ? () => handleBarClick(item) : undefined}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                  />
                  <span className="truncate flex-1 text-gray-700">{item.name}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(item.sales)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Monthly Trend Line Chart (only at main level) */}
        {drillLevel === 'main' && monthlyData.length > 0 && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Category Trends (12 Months)
            </h3>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={monthlyData} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={40} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {topGroups.map((group, index) => (
                  <Line
                    key={group}
                    type="monotone"
                    dataKey={group}
                    stroke={CATEGORY_COLORS[index]}
                    strokeWidth={2}
                    dot={false}
                    name={group.length > 15 ? group.substring(0, 15) + '...' : group}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// CALL HISTORY TAB COMPONENT (3CX Phone System Integration)
// ============================================
const CallHistoryTab: React.FC<{ accountNumber: number; staffUsername: string }> = ({ accountNumber, staffUsername }) => {
  const [calls, setCalls] = useState<CallHistoryRecord[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Inbound' | 'Outbound'>('all');
  const [selectedCall, setSelectedCall] = useState<CallHistoryRecord | null>(null);
  const [notes, setNotes] = useState<CallNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 25;

  const loadCallHistory = useCallback(async (reset = false) => {
    if (reset) {
      setOffset(0);
      setLoading(true);
    }
    try {
      const currentOffset = reset ? 0 : offset;
      const { data, error } = await supabase.rpc('get_account_call_history', {
        p_account_number: accountNumber,
        p_limit: LIMIT,
        p_offset: currentOffset,
        p_direction: filter === 'all' ? null : filter
      });

      if (error) throw error;

      // Dedupe by id (in case of multiple contact matches)
      const uniqueCalls = (data || []).reduce((acc: CallHistoryRecord[], call: CallHistoryRecord) => {
        if (!acc.find(c => c.id === call.id)) {
          acc.push(call);
        }
        return acc;
      }, []);

      if (reset) {
        setCalls(uniqueCalls);
      } else {
        setCalls(prev => [...prev, ...uniqueCalls.filter((c: CallHistoryRecord) => !prev.find(p => p.id === c.id))]);
      }
      setHasMore(uniqueCalls.length === LIMIT);
    } catch (err) {
      console.error('Error loading call history:', err);
    } finally {
      setLoading(false);
    }
  }, [accountNumber, filter, offset]);

  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_account_call_stats', {
        p_account_number: accountNumber
      });
      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (err) {
      console.error('Error loading call stats:', err);
    }
  }, [accountNumber]);

  const loadNotesForCall = useCallback(async (callId: number) => {
    try {
      const { data, error } = await supabase
        .from('call_notes')
        .select('*')
        .eq('call_record_id', callId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error loading notes:', err);
    }
  }, []);

  useEffect(() => {
    loadCallHistory(true);
    loadStats();
  }, [accountNumber, filter]);

  useEffect(() => {
    if (selectedCall) {
      loadNotesForCall(selectedCall.id);
    }
  }, [selectedCall, loadNotesForCall]);

  const handleSaveNote = async () => {
    if (!newNote.trim() || !selectedCall) return;
    setSavingNote(true);
    try {
      const { error } = await supabase.from('call_notes').insert({
        call_record_id: selectedCall.id,
        account_number: accountNumber,
        phone_number: selectedCall.phone_number,
        note_text: newNote.trim(),
        note_type: 'follow_up',
        created_by: staffUsername
      });

      if (error) throw error;
      setNewNote('');
      loadNotesForCall(selectedCall.id);
      loadCallHistory(true); // Refresh to update note counts
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const formatCallTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatRelativeTime = (timestamp: string): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading && calls.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Stats Summary */}
      {stats && stats.total_calls > 0 && (
        <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{stats.total_calls}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Total Calls</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">{stats.inbound_calls}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Inbound</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{stats.outbound_calls}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Outbound</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{stats.total_talk_minutes || 0}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Talk Mins</div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Last inbound: {formatRelativeTime(stats.last_inbound_call)}</span>
            <span>Last outbound: {formatRelativeTime(stats.last_outbound_call)}</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex gap-2">
          {(['all', 'Inbound', 'Outbound'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All Calls' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Call List + Detail Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Call List */}
        <div className={`${selectedCall ? 'w-1/2' : 'w-full'} overflow-y-auto border-r border-gray-200`}>
          {calls.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">No Call History</h3>
              <p className="text-sm text-gray-500 max-w-[280px]">
                Call records matching this account's phone numbers will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {calls.map((call) => (
                <div
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedCall?.id === call.id ? 'bg-indigo-50 border-l-2 border-indigo-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Direction Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      call.direction === 'Inbound'
                        ? call.status === 'Answered' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {call.direction === 'Inbound' ? (
                        call.status === 'Answered' ? <PhoneCall className="w-4 h-4" /> : <PhoneOff className="w-4 h-4" />
                      ) : (
                        <Phone className="w-4 h-4" />
                      )}
                    </div>

                    {/* Call Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {call.contact_name || call.phone_number}
                        </span>
                        {call.has_notes && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                            {call.note_count} note{call.note_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span>{formatCallTime(call.call_time)}</span>
                        <span>·</span>
                        <span>{call.employee_name}</span>
                        {call.talking_seconds > 0 && (
                          <>
                            <span>·</span>
                            <span className="font-medium text-gray-700">{formatDuration(call.talking_seconds)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                      call.status === 'Answered'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {call.status}
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    onClick={() => {
                      setOffset(prev => prev + LIMIT);
                      loadCallHistory(false);
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Load more calls...
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Call Detail Panel */}
        {selectedCall && (
          <div className="w-1/2 flex flex-col overflow-hidden bg-white">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedCall.contact_name || 'Unknown Contact'}</h4>
                  <p className="text-xs text-gray-500">{selectedCall.phone_number}</p>
                </div>
                <button
                  onClick={() => setSelectedCall(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Call Details */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Direction:</span>
                  <span className={`ml-2 font-medium ${
                    selectedCall.direction === 'Inbound' ? 'text-emerald-600' : 'text-blue-600'
                  }`}>{selectedCall.direction}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 font-medium">{selectedCall.status}</span>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="ml-2 font-medium">{formatDuration(selectedCall.talking_seconds)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Employee:</span>
                  <span className="ml-2 font-medium">{selectedCall.employee_name}</span>
                </div>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Time:</span>
                <span className="ml-2">{new Date(selectedCall.call_time).toLocaleString()}</span>
              </div>
              {selectedCall.call_activity_details && (
                <div className="text-xs">
                  <span className="text-gray-500">Details:</span>
                  <p className="mt-1 text-gray-700 break-words">{selectedCall.call_activity_details}</p>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Notes</h5>

              {notes.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No notes yet for this call.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-800">{note.note_text}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {note.created_by} · {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Note */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this call..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg resize-none
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleSaveNote}
                disabled={!newNote.trim() || savingNote}
                className="mt-2 w-full py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg
                  hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save Note
              </button>
            </div>
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
// Terms dropdown options
const TERMS_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'Net 10', label: 'Net 10' },
  { value: 'Net 30', label: 'Net 30' },
  { value: 'Cash Only', label: 'Cash Only' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Do Not Sell', label: 'Do Not Sell' }
];

// Inline Editable Card Component - Click to edit, auto-save on blur
const InlineEditableCard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  field: string;
  accountNumber: number;
  onUpdate: (field: string, value: string) => void;
  type?: 'text' | 'tel' | 'email' | 'select';
  options?: { value: string; label: string }[];
  href?: string;
  placeholder?: string;
}> = ({ icon, iconBg, label, value, field, accountNumber, onUpdate, type = 'text', options, href, placeholder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('accounts_lcmd')
        .update({
          [field]: editValue || null,
          updated_at: new Date().toISOString()
        })
        .eq('account_number', accountNumber);

      if (error) throw error;
      onUpdate(field, editValue);
    } catch (err) {
      console.error('Error saving:', err);
      setEditValue(value); // Revert on error
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleSelectChange = async (newValue: string) => {
    setEditValue(newValue);
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('accounts_lcmd')
        .update({
          [field]: newValue || null,
          updated_at: new Date().toISOString()
        })
        .eq('account_number', accountNumber);

      if (error) throw error;
      onUpdate(field, newValue);
    } catch (err) {
      console.error('Error saving:', err);
      setEditValue(value);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const displayValue = value || placeholder || `No ${label.toLowerCase()}`;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-150 cursor-pointer group
        ${isEditing ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'bg-gray-50/50 hover:bg-gray-100/80'}`}
      onClick={() => !isEditing && setIsEditing(true)}
    >
      <div className={`w-7 h-7 rounded-md ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-gray-400 font-medium">{label}</p>
        {isEditing ? (
          type === 'select' && options ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={(e) => handleSelectChange(e.target.value)}
              onBlur={() => setIsEditing(false)}
              className="w-full px-1.5 py-0.5 text-xs font-medium text-gray-900 bg-white border border-indigo-300 rounded
                focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-1.5 py-0.5 text-xs font-medium text-gray-900 bg-white border border-indigo-300 rounded
                focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )
        ) : (
          <div className="flex items-center gap-1">
            {href && value ? (
              <a
                href={href}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-gray-900 hover:text-indigo-600 truncate"
              >
                {type === 'tel' ? formatPhone(value) : displayValue}
              </a>
            ) : (
              <p className={`text-xs font-medium truncate ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {type === 'tel' && value ? formatPhone(value) : displayValue}
              </p>
            )}
            <Edit3 className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
};

const CustomerDetailView: React.FC<{
  account: Account;
  staffUsername: string;
  onClose: () => void;
  onAccountUpdate?: (updatedAccount: Account) => void;
}> = ({ account, staffUsername, onClose, onAccountUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [localAccount, setLocalAccount] = useState(account);

  // Reset local account when account changes
  useEffect(() => {
    setLocalAccount(account);
  }, [account]);

  const handleFieldUpdate = (field: string, value: string) => {
    const updated = { ...localAccount, [field]: value };
    setLocalAccount(updated);
    if (onAccountUpdate) {
      onAccountUpdate(updated);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'activity', label: 'Activity', icon: <PhoneCall className="w-4 h-4" /> },
    { id: 'contacts', label: 'Contacts', icon: <Users className="w-4 h-4" /> },
    { id: 'calls', label: 'Phone Log', icon: <Phone className="w-4 h-4" /> },
    { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'predictions', label: 'Predictions', icon: <Target className="w-4 h-4" /> },
    { id: 'crosssell', label: 'Cross-Sell', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'categorysales', label: 'Category Sales', icon: <Package className="w-4 h-4" /> }
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header - Compact */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="px-4 py-3">
          {/* Title Row */}
          <div className="flex items-center gap-3">
            {/* Account Number Badge */}
            <div className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-base font-bold tabular-nums">
              {localAccount.account_number}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{localAccount.acct_name}</h2>
                {localAccount.status && (
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                    localAccount.status.toLowerCase() === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {localAccount.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {localAccount.city && localAccount.state && `${localAccount.city}, ${localAccount.state}`}
                {localAccount.salesman && <span> · Rep: {localAccount.salesman}</span>}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <QuickActionButton
                icon={<Phone className="w-3.5 h-3.5" />}
                label="Call"
                onClick={() => localAccount.phone && window.open(`tel:${localAccount.phone}`)}
                variant="primary"
                disabled={!localAccount.phone}
                size="sm"
              />
              <QuickActionButton
                icon={<Mail className="w-3.5 h-3.5" />}
                label="Email"
                onClick={() => localAccount.email_address && window.open(`mailto:${localAccount.email_address}`)}
                disabled={!localAccount.email_address}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Inline Editable Info Cards - Compact */}
        <div className="px-4 pb-3">
          <p className="text-[10px] text-gray-400 mb-1.5 flex items-center gap-1">
            <Edit3 className="w-3 h-3" /> Click any field to edit
          </p>
          {/* Row 1: Address (2 cols), Main Phone (1 col), Mobile Phone (1 col), Terms (1 col) */}
          <div className="grid grid-cols-10 gap-2">
            <div className="col-span-4">
              <InlineEditableCard
                icon={<MapPin className="w-3.5 h-3.5 text-indigo-600" />}
                iconBg="bg-indigo-100"
                label="Address"
                value={localAccount.address || ''}
                field="address"
                accountNumber={localAccount.account_number}
                onUpdate={handleFieldUpdate}
                placeholder="No address"
              />
            </div>
            <div className="col-span-2">
              <InlineEditableCard
                icon={<Phone className="w-3.5 h-3.5 text-emerald-600" />}
                iconBg="bg-emerald-100"
                label="Main Phone"
                value={localAccount.phone || ''}
                field="phone"
                accountNumber={localAccount.account_number}
                onUpdate={handleFieldUpdate}
                type="tel"
                href={localAccount.phone ? `tel:${localAccount.phone}` : undefined}
                placeholder="No phone"
              />
            </div>
            <div className="col-span-2">
              <InlineEditableCard
                icon={<Phone className="w-3.5 h-3.5 text-teal-600" />}
                iconBg="bg-teal-100"
                label="Mobile Phone"
                value={localAccount.mobile_phone || ''}
                field="mobile_phone"
                accountNumber={localAccount.account_number}
                onUpdate={handleFieldUpdate}
                type="tel"
                href={localAccount.mobile_phone ? `tel:${localAccount.mobile_phone}` : undefined}
                placeholder="No mobile"
              />
            </div>
            <div className="col-span-2">
              <InlineEditableCard
                icon={<Building2 className="w-3.5 h-3.5 text-amber-600" />}
                iconBg="bg-amber-100"
                label="Terms"
                value={localAccount.terms || ''}
                field="terms"
                accountNumber={localAccount.account_number}
                onUpdate={handleFieldUpdate}
                type="select"
                options={TERMS_OPTIONS}
                placeholder="Not set"
              />
            </div>
          </div>
          {/* Row 2: Email, Contact, Website */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <InlineEditableCard
              icon={<Mail className="w-3.5 h-3.5 text-blue-600" />}
              iconBg="bg-blue-100"
              label="Email"
              value={localAccount.email_address || ''}
              field="email_address"
              accountNumber={localAccount.account_number}
              onUpdate={handleFieldUpdate}
              type="email"
              href={localAccount.email_address ? `mailto:${localAccount.email_address}` : undefined}
              placeholder="No email"
            />
            <InlineEditableCard
              icon={<User className="w-3.5 h-3.5 text-purple-600" />}
              iconBg="bg-purple-100"
              label="Contact"
              value={localAccount.contact || ''}
              field="contact"
              accountNumber={localAccount.account_number}
              onUpdate={handleFieldUpdate}
              placeholder="No contact"
            />
            <InlineEditableCard
              icon={<Globe className="w-3.5 h-3.5 text-cyan-600" />}
              iconBg="bg-cyan-100"
              label="Website"
              value={localAccount.website || ''}
              field="website"
              accountNumber={localAccount.account_number}
              onUpdate={handleFieldUpdate}
              href={localAccount.website ? (localAccount.website.startsWith('http') ? localAccount.website : `https://${localAccount.website}`) : undefined}
              placeholder="No website"
            />
          </div>
        </div>

        {/* Tabs - Compact */}
        <div className="px-4 border-t border-gray-100">
          <nav className="flex gap-1 -mb-px" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all duration-150
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
        {activeTab === 'calls' && (
          <CallHistoryTab accountNumber={account.account_number} staffUsername={staffUsername} />
        )}
        {activeTab === 'stats' && (
          <StatsTab accountNumber={account.account_number} />
        )}
        {activeTab === 'predictions' && (
          <PredictionsTab accountNumber={account.account_number} />
        )}
        {activeTab === 'crosssell' && (
          <CrossSellTab accountNumber={account.account_number} />
        )}
        {activeTab === 'categorysales' && (
          <CategorySalesTab account={account} />
        )}
      </div>
    </div>
  );
};

// ============================================
// ACCOUNT HEALTH DATA FOR LIST COLORING
// ============================================
interface AccountHealthSummary {
  account_number: number;
  health_score: number;
  health_status: string;
  lifetime_sales_dollars: number;
  order_count_current_90: number;
  sales_dollars_current_90: number;
  sales_dollars_prior_90: number;
}

type SortOption = 'name_asc' | 'sales_180_desc' | 'health_desc';

// Get background color for customer list based on health score (churn rating)
const getChurnBackgroundColor = (healthScore: number | undefined): string => {
  if (healthScore === undefined) return ''; // No data, default styling
  // Bright green: best customers (score >= 3)
  if (healthScore >= 3) return 'bg-emerald-100 hover:bg-emerald-150 border-l-emerald-500';
  // Pale green: good customers (score 1-2)
  if (healthScore >= 1) return 'bg-green-50 hover:bg-green-100 border-l-green-400';
  // Amber/yellow: middle customers (score 0)
  if (healthScore === 0) return 'bg-amber-50 hover:bg-amber-100 border-l-amber-400';
  // Light red: at risk (score -1 to -2)
  if (healthScore >= -2) return 'bg-orange-50 hover:bg-orange-100 border-l-orange-400';
  // Dark red: severe churn risk (score <= -3)
  return 'bg-red-100 hover:bg-red-150 border-l-red-500';
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
  // Super users see all accounts by default
  const [showAllAccounts, setShowAllAccounts] = useState(isSuperUser);
  const [hideOutOfBusiness, setHideOutOfBusiness] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [accountHealthMap, setAccountHealthMap] = useState<Map<number, AccountHealthSummary>>(new Map());
  const [imminentPredictionAccounts, setImminentPredictionAccounts] = useState<Set<number>>(new Set());
  const [accountCallDaysMap, setAccountCallDaysMap] = useState<Map<number, number | null>>(new Map());
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync showAllAccounts when isSuperUser changes (handles auth context loading)
  useEffect(() => {
    if (isSuperUser) {
      setShowAllAccounts(true);
    }
  }, [isSuperUser]);

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

        // Load account health data for churn coloring and sorting
        const { data: healthData, error: healthError } = await supabase
          .from('agg_account_health')
          .select('account_number, health_score, health_status, lifetime_sales_dollars, order_count_current_90, sales_dollars_current_90, sales_dollars_prior_90');

        if (healthError) {
          console.error('Error loading health data:', healthError);
        } else if (healthData) {
          const healthMap = new Map<number, AccountHealthSummary>();
          healthData.forEach((h: AccountHealthSummary) => {
            healthMap.set(h.account_number, h);
          });
          setAccountHealthMap(healthMap);
        }

        // Load imminent predictions (within ±15 days) for account number indicator
        const { data: predData, error: predError } = await supabase
          .from('predictions_account_part')
          .select('account_number, days_until_predicted')
          .eq('in_upcoming_window', true)
          .gte('confidence_score', 3)
          .gte('days_until_predicted', -15)
          .lte('days_until_predicted', 15);

        if (predError) {
          console.error('Error loading predictions:', predError);
        } else if (predData) {
          const accountsWithPredictions = new Set<number>();
          predData.forEach((p: { account_number: number }) => {
            accountsWithPredictions.add(p.account_number);
          });
          setImminentPredictionAccounts(accountsWithPredictions);
        }

        // Load days since last outbound call per account
        const { data: callDaysData, error: callDaysError } = await supabase
          .from('v_account_last_outbound_call')
          .select('account_number, days_since_last_outbound');

        if (callDaysError) {
          console.error('Error loading call days:', callDaysError);
        } else if (callDaysData) {
          const callDaysMap = new Map<number, number | null>();
          callDaysData.forEach((c: { account_number: number; days_since_last_outbound: number | null }) => {
            callDaysMap.set(c.account_number, c.days_since_last_outbound);
          });
          setAccountCallDaysMap(callDaysMap);
        }
      } catch (err) {
        console.error('Error loading accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [staffUsername, isSuperUser, showAllAccounts]);

  // Filter accounts based on search and hide out of business
  useEffect(() => {
    let filtered = accounts;

    // Filter out "out of business" accounts if checkbox is checked
    if (hideOutOfBusiness) {
      filtered = filtered.filter(a => {
        const statusLower = (a.status || '').toLowerCase();
        const zipLower = (a.zip || '').toUpperCase();
        // Hide if status contains "out of business", "dead", or zip starts with XXXXX
        if (statusLower.includes('out of business')) return false;
        if (statusLower.includes('dead')) return false;
        if (zipLower.startsWith('XXXXX')) return false;
        return true;
      });
    }

    // Apply search filter with intelligent sorting
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const searchDigits = term.replace(/\D/g, '');
      const isNumericSearch = /^\d+$/.test(term);
      const isPhoneSearch = searchDigits.length >= 7;

      // Filter and categorize matches
      const exactAccountMatches: Account[] = [];
      const startsWithAccountMatches: Account[] = [];
      const containsAccountMatches: Account[] = [];
      const nameMatches: Account[] = [];
      const otherMatches: Account[] = [];

      filtered.forEach(a => {
        const accountNumStr = a.account_number?.toString() || '';
        const acctNameLower = a.acct_name?.toLowerCase() || '';

        // For numeric searches, prioritize account number matches
        if (isNumericSearch) {
          // Exact account number match - highest priority
          if (accountNumStr === term) {
            exactAccountMatches.push(a);
            return;
          }
          // Account number starts with search term - second priority
          if (accountNumStr.startsWith(term)) {
            startsWithAccountMatches.push(a);
            return;
          }
          // Account number contains search term - third priority
          if (accountNumStr.includes(term)) {
            containsAccountMatches.push(a);
            return;
          }
        }

        // Name matches
        if (acctNameLower.includes(term)) {
          nameMatches.push(a);
          return;
        }

        // Account number contains (for non-numeric searches)
        if (!isNumericSearch && accountNumStr.includes(term)) {
          otherMatches.push(a);
          return;
        }

        // Other field matches
        if (a.zip?.startsWith(term) || a.zip?.includes(term)) {
          otherMatches.push(a);
          return;
        }
        if (a.city?.toLowerCase().includes(term)) {
          otherMatches.push(a);
          return;
        }
        if (a.state?.toLowerCase().includes(term)) {
          otherMatches.push(a);
          return;
        }
        if (isPhoneSearch && searchDigits.length >= 7) {
          const phoneDigits = a.phone?.replace(/\D/g, '') || '';
          const mobileDigits = a.mobile_phone?.replace(/\D/g, '') || '';
          if (phoneDigits === searchDigits || phoneDigits.endsWith(searchDigits) ||
              mobileDigits === searchDigits || mobileDigits.endsWith(searchDigits)) {
            otherMatches.push(a);
            return;
          }
        }
        if (a.contact?.toLowerCase().includes(term)) {
          otherMatches.push(a);
          return;
        }
      });

      // Sort each category by account number for consistency
      const sortByAccountNum = (a: Account, b: Account) => a.account_number - b.account_number;
      startsWithAccountMatches.sort(sortByAccountNum);
      containsAccountMatches.sort(sortByAccountNum);
      nameMatches.sort((a, b) => (a.acct_name || '').localeCompare(b.acct_name || ''));

      // Combine results with intelligent ordering
      filtered = [
        ...exactAccountMatches,
        ...startsWithAccountMatches,
        ...containsAccountMatches,
        ...nameMatches,
        ...otherMatches
      ];
    } else {
      // No search term - apply selected sort option
      const getSales180 = (acct: Account): number => {
        const health = accountHealthMap.get(acct.account_number);
        if (!health) return 0;
        return (health.sales_dollars_current_90 || 0) + (health.sales_dollars_prior_90 || 0);
      };

      const getHealthScore = (acct: Account): number => {
        const health = accountHealthMap.get(acct.account_number);
        return health?.health_score ?? 0;
      };

      switch (sortOption) {
        case 'name_asc':
          filtered = [...filtered].sort((a, b) => (a.acct_name || '').localeCompare(b.acct_name || ''));
          break;
        case 'sales_180_desc':
          filtered = [...filtered].sort((a, b) => getSales180(b) - getSales180(a));
          break;
        case 'health_desc':
          // Higher health score = healthier, so those come first
          filtered = [...filtered].sort((a, b) => getHealthScore(b) - getHealthScore(a));
          break;
      }
    }

    setFilteredAccounts(filtered);
  }, [searchTerm, accounts, hideOutOfBusiness, sortOption, accountHealthMap]);

  // Full-page loading overlay for initial data load
  if (loading) {
    return (
      <div className="min-h-screen h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">Loading data, please wait...</p>
            <p className="text-sm text-gray-500 mt-1">Fetching customer accounts</p>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Customer Search Panel */}
          <div className="px-4 py-3 border-b border-gray-100">
            {/* Dynamic Search Box - replaces "Customers" label */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder=""
                className="w-full pl-9 pr-12 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  transition-all"
              />
              {/* Pulsating red placeholder text when empty and not focused */}
              {!searchTerm && !searchFocused && (
                <div
                  className="absolute left-9 top-1/2 -translate-y-1/2 pointer-events-none search-placeholder-pulse text-sm"
                  onClick={() => searchInputRef.current?.focus()}
                >
                  Search customers here
                </div>
              )}
              {/* Customer count badge */}
              <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full tabular-nums">
                {filteredAccounts.length}
              </span>
            </div>

            {/* Sort By dropdown */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500 font-medium">Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-700
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                <option value="name_asc">Account Name (A-Z)</option>
                <option value="sales_180_desc">Sales Last 180 Days (High → Low)</option>
                <option value="health_desc">Health Score (Healthy → At Risk)</option>
              </select>
            </div>

            {/* Controls row: checkbox and filter */}
            <div className="flex items-center justify-between mt-2">
              {/* Hide Out of Business Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={hideOutOfBusiness}
                  onChange={(e) => setHideOutOfBusiness(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                  Hide Dead
                </span>
              </label>

              {isSuperUser && (
                <button
                  onClick={() => setShowAllAccounts(!showAllAccounts)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showAllAccounts
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  {showAllAccounts ? 'All' : 'Mine'}
                </button>
              )}
            </div>
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
                    healthScore={accountHealthMap.get(account.account_number)?.health_score}
                    hasImminentPrediction={imminentPredictionAccounts.has(account.account_number)}
                    daysSinceCall={accountCallDaysMap.get(account.account_number)}
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
              onAccountUpdate={(updatedAccount) => {
                // Update the selected account
                setSelectedAccount(updatedAccount);
                // Update the accounts list
                setAccounts(prev => prev.map(a =>
                  a.account_number === updatedAccount.account_number ? updatedAccount : a
                ));
              }}
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
