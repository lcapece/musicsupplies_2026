import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Phone, Mail, Calendar, FileText, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Activity {
  activity_id: number;
  prospect_id: number;
  activity_type: string;
  activity_date: string;
  performed_by: string;
  subject: string | null;
  notes: string | null;
  outcome: string | null;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
}

interface ProspectActivityLogProps {
  prospectId: number;
  currentUser?: string;
  onActivityAdded?: () => void;
}

const ProspectActivityLog: React.FC<ProspectActivityLogProps> = ({
  prospectId,
  currentUser = 'Admin',
  onActivityAdded
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [activityType, setActivityType] = useState('call');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');

  useEffect(() => {
    loadActivities();
  }, [prospectId]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospect_activities')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (type: string, outcomeText: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('prospect_activities')
        .insert([{
          prospect_id: prospectId,
          activity_type: type,
          activity_date: new Date().toISOString(),
          performed_by: currentUser,
          subject: outcomeText,
          outcome: outcomeText.toLowerCase().replace(/\s+/g, '_'),
          notes: `Quick action: ${outcomeText}`
        }]);

      if (error) throw error;

      await loadActivities();
      if (onActivityAdded) onActivityAdded();
    } catch (err) {
      console.error('Error adding quick action:', err);
      alert('Failed to log activity');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('prospect_activities')
        .insert([{
          prospect_id: prospectId,
          activity_type: activityType,
          activity_date: new Date().toISOString(),
          performed_by: currentUser,
          subject: subject || null,
          notes: notes || null,
          outcome: outcome || null,
          next_action: nextAction || null,
          next_action_date: nextActionDate || null
        }]);

      if (error) throw error;

      // Reset form
      setSubject('');
      setNotes('');
      setOutcome('');
      setNextAction('');
      setNextActionDate('');
      setShowAddForm(false);

      await loadActivities();
      if (onActivityAdded) onActivityAdded();
    } catch (err) {
      console.error('Error adding activity:', err);
      alert('Failed to add activity');
    } finally {
      setSaving(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'quote_sent': return <DollarSign className="h-4 w-4" />;
      case 'note': return <FileText className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getOutcomeColor = (outcome: string | null) => {
    if (!outcome) return 'text-gray-500';
    if (outcome.includes('interested') || outcome.includes('callback') || outcome.includes('quote')) {
      return 'text-green-600';
    }
    if (outcome.includes('not_interested')) {
      return 'text-red-600';
    }
    return 'text-yellow-600';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Quick Actions */}
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickAction('call', 'Called - No Answer')}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-sm disabled:opacity-50"
          >
            <Phone className="h-4 w-4" />
            No Answer
          </button>
          <button
            onClick={() => handleQuickAction('call', 'Left Voicemail')}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm disabled:opacity-50"
          >
            <Phone className="h-4 w-4" />
            Voicemail
          </button>
          <button
            onClick={() => handleQuickAction('call', 'Spoke - Interested')}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            Interested
          </button>
          <button
            onClick={() => handleQuickAction('email', 'Sent Email')}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            Sent Email
          </button>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          {showAddForm ? 'Cancel' : '+ Add Detailed Activity'}
        </button>
      </div>

      {/* Add Activity Form */}
      {showAddForm && (
        <form onSubmit={handleAddActivity} className="p-4 border-b bg-blue-50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Activity Type *
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="call">Phone Call</option>
                <option value="email">Email</option>
                <option value="quote_sent">Quote Sent</option>
                <option value="note">Note</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief subject line"
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detailed notes about the interaction"
                rows={3}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Outcome
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select outcome...</option>
                <option value="answered">Answered</option>
                <option value="voicemail">Voicemail</option>
                <option value="no_answer">No Answer</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="callback_requested">Callback Requested</option>
                <option value="quote_requested">Quote Requested</option>
                <option value="quote_sent">Quote Sent</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Next Action
                </label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="Call back, Send quote..."
                  className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="datetime-local"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Activity'}
            </button>
          </div>
        </form>
      )}

      {/* Activity Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity History</h3>
        {loading ? (
          <div className="text-center py-4 text-gray-500 text-sm">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            No activities yet. Add one to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.activity_id} className="bg-white border rounded-lg p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 ${getOutcomeColor(activity.outcome)}`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.subject || activity.activity_type.replace('_', ' ').toUpperCase()}
                        </p>
                        {activity.outcome && (
                          <p className={`text-xs ${getOutcomeColor(activity.outcome)} mt-0.5`}>
                            {activity.outcome.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(activity.activity_date)}
                      </span>
                    </div>
                    
                    {activity.notes && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                        {activity.notes}
                      </p>
                    )}
                    
                    {activity.next_action && (
                      <div className="mt-2 flex items-center gap-1 text-xs">
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                        <span className="text-orange-700 font-medium">
                          Next: {activity.next_action}
                        </span>
                        {activity.next_action_date && (
                          <span className="text-gray-500">
                            ({new Date(activity.next_action_date).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-1">
                      by {activity.performed_by}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProspectActivityLog;
