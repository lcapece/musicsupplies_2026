import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Phone, Mail, Users, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ActivityLog {
  id: string;
  prospect_website: string;
  activity_date: string;
  activity_type: string;
  comments: string | null;
  follow_up_date: string | null;
  logged_by: string;
  created_at: string;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectWebsite: string;
  businessName: string;
  currentUserEmail: string;
}

const ACTIVITY_TYPES = [
  { value: 'Call', icon: Phone, label: 'Phone Call' },
  { value: 'Email', icon: Mail, label: 'Email' },
  { value: 'Follow-up', icon: Clock, label: 'Follow-up' },
  { value: 'Note', icon: MessageSquare, label: 'Note' }
];

export default function ActivityLogModal({
  isOpen,
  onClose,
  prospectWebsite,
  businessName,
  currentUserEmail
}: ActivityLogModalProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentGrade, setCurrentGrade] = useState<string>('No Contact Yet');

  // Form state
  const [activityType, setActivityType] = useState('Call');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityTime, setActivityTime] = useState(new Date().toTimeString().slice(0, 5));
  const [comments, setComments] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Status options with colors
  const statusOptions = [
    { value: 'No Contact Yet', label: 'No Contact Yet', color: 'bg-white border-gray-300 text-gray-900' },
    { value: 'Out-of-Busn or Remove from List', label: 'Out-of-Busn or Remove from List', color: 'bg-red-100 border-red-300 text-red-900' },
    { value: 'Contacted: Cold', label: 'Contacted: Cold', color: 'bg-blue-100 border-blue-300 text-blue-900' },
    { value: 'Contacted: Warm', label: 'Contacted: Warm', color: 'bg-yellow-100 border-yellow-300 text-yellow-900' },
    { value: 'Contacted: Hot', label: 'Contacted: Hot', color: 'bg-green-100 border-green-300 text-green-900' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadActivities();
      loadProspectorGrade();
    }
  }, [isOpen, prospectWebsite]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospect_activities')
        .select('*')
        .eq('prospect_website', prospectWebsite)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProspectorGrade = async () => {
    try {
      const { data, error } = await supabase
        .from('prospector')
        .select('grade')
        .eq('website', prospectWebsite)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.grade) {
        setCurrentGrade(data.grade);
      }
    } catch (error) {
      console.error('Error loading prospector grade:', error);
    }
  };

  const updateProspectorGrade = async (newGrade: string) => {
    try {
      const { error } = await supabase
        .from('prospector')
        .update({ grade: newGrade })
        .eq('website', prospectWebsite);

      if (error) throw error;
      
      setCurrentGrade(newGrade);
    } catch (error) {
      console.error('Error updating prospector grade:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleAddActivity = async () => {
    if (!comments.trim()) {
      alert('Please add comments for this activity');
      return;
    }

    setSaving(true);
    try {
      const activityDateTime = new Date(`${activityDate}T${activityTime}`);

      const { error } = await supabase
        .from('prospect_activities')
        .insert({
          prospect_website: prospectWebsite,
          activity_date: activityDateTime.toISOString(),
          activity_type: activityType,
          comments: comments.trim(),
          follow_up_date: followUpDate || null,
          logged_by: currentUserEmail
        });

      if (error) throw error;

      // Reset form
      setComments('');
      setFollowUpDate('');
      setActivityDate(new Date().toISOString().split('T')[0]);
      setActivityTime(new Date().toTimeString().slice(0, 5));
      setActivityType('Call');
      setShowAddForm(false);

      // Reload activities
      await loadActivities();
    } catch (error) {
      console.error('Error adding activity:', error);
      alert('Failed to add activity. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getActivityIcon = (type: string) => {
    const activity = ACTIVITY_TYPES.find(a => a.value === type);
    return activity ? activity.icon : MessageSquare;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center space-x-6">
              <h2 className="text-xl font-bold">Activity Log</h2>
              <span className="text-sm text-blue-100">{businessName}</span>
              <span className="text-xs text-blue-200">{prospectWebsite}</span>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Add Activity Button */}
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Plus className="h-5 w-5" />
                Add New Activity
              </button>
            )}

            {/* Add Activity Form */}
            {showAddForm && (
              <div className="mb-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div className="space-y-3">
                  {/* Activity Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Activity Type
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {ACTIVITY_TYPES.map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          onClick={() => setActivityType(value)}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border-2 transition-all ${
                            activityType === value
                              ? 'border-blue-600 bg-blue-100 text-blue-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{value}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={currentGrade}
                      onChange={(e) => updateProspectorGrade(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        statusOptions.find(opt => opt.value === currentGrade)?.color || 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {statusOptions.map(({ value, label, color }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date and Time + Follow-up Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Activity Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={`${activityDate}T${activityTime}`}
                        onChange={(e) => {
                          const [date, time] = e.target.value.split('T');
                          setActivityDate(date);
                          setActivityTime(time);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Follow-up Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comments / Notes
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={4}
                      placeholder="Enter details about this activity..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-4 gap-3 pt-1">
                    <button
                      onClick={handleAddActivity}
                      disabled={saving}
                      className="col-span-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Activity'}
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Activities List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3">
                Activity History ({activities.length})
              </h3>

              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading activities...
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activities logged yet. Add your first activity above.
                </div>
              ) : (
                activities.map((activity) => {
                  const Icon = getActivityIcon(activity.activity_type);
                  return (
                    <div
                      key={activity.id}
                      className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900">
                              {activity.activity_type}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(activity.activity_date)}
                            </span>
                          </div>
                          {activity.comments && (
                            <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">
                              {activity.comments}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>By: {activity.logged_by}</span>
                            {activity.follow_up_date && (
                              <span className="flex items-center gap-1 text-orange-600 font-medium">
                                <Calendar className="h-3 w-3" />
                                Follow-up: {formatDateOnly(activity.follow_up_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
