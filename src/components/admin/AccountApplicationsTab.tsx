import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface AccountApplication {
  id: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  business_address: string;
  city: string;
  state: string;
  zip_code: string;
  business_type: string;
  tax_id: string;
  years_in_business: string;
  annual_revenue_range: string;
  primary_music_focus: string;
  how_did_you_hear: string;
  additional_info?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
}

const AccountApplicationsTab: React.FC = () => {
  const [applications, setApplications] = useState<AccountApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<AccountApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('new_account_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        return;
      }

      setApplications(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const { error } = await supabase
        .from('new_account_applications')
        .update({ 
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Admin'
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating application status:', error);
        alert('Error updating application status');
        return;
      }

      await fetchApplications();
      alert(`Application ${status} successfully`);
      
      // Send SMS notification if enabled
      await sendApplicationNotification(status);
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating application status');
    }
  };

  const sendApplicationNotification = async (status: string) => {
    try {
      // Check if new account application notifications are enabled
      const { data: settings, error } = await supabase
        .from('sms_notification_settings')
        .select('*')
        .eq('event_name', 'new_account_application')
        .eq('is_enabled', true)
        .single();

      if (error || !settings) {
        // Notification not enabled, skip
        return;
      }

      const message = `New account application ${status} - MusicSupplies.com Admin Action Required`;

      await supabase.functions.invoke('send-test-sms', {
        body: {
          accountNumber: 'ADMIN',
          accountName: 'Account Application System',
          smsNumber: settings.notification_phone,
          message: message
        }
      });
    } catch (error) {
      console.error('Error sending application notification:', error);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filterStatus === 'all') return true;
    return app.status === filterStatus;
  });

  const statusCounts = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'pending').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
  };

  const ApplicationModal: React.FC<{ 
    application: AccountApplication; 
    onClose: () => void; 
    onUpdate: (id: number, status: string) => void;
  }> = ({ application, onClose, onUpdate }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Account Application Review
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Company Information</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <p className="text-sm text-gray-900">{application.company_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Type</label>
                <p className="text-sm text-gray-900">{application.business_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax ID</label>
                <p className="text-sm text-gray-900">{application.tax_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Years in Business</label>
                <p className="text-sm text-gray-900">{application.years_in_business}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Annual Revenue Range</label>
                <p className="text-sm text-gray-900">{application.annual_revenue_range}</p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Contact Information</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                <p className="text-sm text-gray-900">{application.contact_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{application.contact_email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{application.contact_phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Address</label>
                <p className="text-sm text-gray-900">
                  {application.business_address}<br />
                  {application.city}, {application.state} {application.zip_code}
                </p>
              </div>
            </div>

            {/* Business Details */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Business Details</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Music Focus</label>
                <p className="text-sm text-gray-900">{application.primary_music_focus}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">How Did You Hear About Us</label>
                <p className="text-sm text-gray-900">{application.how_did_you_hear}</p>
              </div>
              {application.additional_info && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Information</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{application.additional_info}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status and Actions */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Submitted:</strong> {new Date(application.created_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Current Status:</strong> 
                  <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    application.status === 'approved' ? 'bg-green-100 text-green-800' :
                    application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {application.status}
                  </span>
                </p>
              </div>
              <div className="flex space-x-3">
                {application.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onUpdate(application.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onUpdate(application.id, 'rejected')}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Account Applications</h2>
          <p className="text-sm text-gray-600 mt-1">Review and manage new account applications</p>
        </div>
        <button
          onClick={fetchApplications}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Applications</div>
          <div className="text-2xl font-bold text-blue-600">{statusCounts.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Pending Review</div>
          <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Approved</div>
          <div className="text-2xl font-bold text-green-600">{statusCounts.approved}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">All Applications</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Applications ({filteredApplications.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading applications...</div>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No applications found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {application.company_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>
                        <div>{application.contact_name}</div>
                        <div className="text-xs text-gray-500">{application.contact_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {application.business_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        application.status === 'approved' ? 'bg-green-100 text-green-800' :
                        application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(application.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedApplication(application);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Review
                        </button>
                        {application.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(application.id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(application.id, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Review Modal */}
      {showModal && selectedApplication && (
        <ApplicationModal
          application={selectedApplication}
          onClose={() => setShowModal(false)}
          onUpdate={(id, status) => {
            handleUpdateStatus(id, status);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};

export default AccountApplicationsTab;
