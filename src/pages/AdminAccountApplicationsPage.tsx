import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Assuming supabase client is here
// Define a type for the application data, matching your table structure
// This should ideally be in a shared types file if used elsewhere

interface TradeReference {
  name: string;
  phone: string;
  addn_info: string;
}

interface AccountApplication {
  id: number;
  created_at: string;
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
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
}

const AdminAccountApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<AccountApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<AccountApplication | null>(null);
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      setProcessingAction(true);
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
        alert('Error updating application status: ' + error.message);
        return;
      }

      // Refresh applications list
      setRefreshTrigger(prev => prev + 1);
      alert(`Application ${status} successfully`);
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error updating application status');
    } finally {
      setProcessingAction(false);
    }
  };

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('new_account_applications')
          .select('*') // Select all columns for now, can be specific later
          .order('created_at', { ascending: false }); // Show newest first

        if (fetchError) {
          console.error("Error fetching account applications:", fetchError);
          setError(fetchError.message);
          setApplications([]);
        } else {
          setApplications(data || []);
        }
      } catch (err: any) {
        console.error("Unexpected error fetching applications:", err);
        setError(err.message || "An unexpected error occurred.");
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [refreshTrigger]);

  if (loading) {
    return <div className="p-6 text-center">Loading applications...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600 text-center">Error loading applications: {error}</div>;
  }

  // Filter applications based on selected status
  const filteredApplications = applications.filter(app => {
    if (filterStatus === 'all') return true;
    return app.status === filterStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">New Account Applications</h1>
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
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Status counts */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Applications</div>
          <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{applications.filter(app => app.status === 'pending').length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Approved</div>
          <div className="text-2xl font-bold text-green-600">{applications.filter(app => app.status === 'approved').length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{applications.filter(app => app.status === 'rejected').length}</div>
        </div>
      </div>
      
      {filteredApplications.length === 0 ? (
        <p className="text-center text-gray-500 text-xl">No account applications found.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Submitted</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Business Name</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Contact Name</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-5 whitespace-nowrap text-base text-gray-700">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-base font-semibold text-gray-900">{app.company_name}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-base text-gray-700">{app.contact_name}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-base text-gray-700">{app.contact_email}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-base text-gray-700">{app.contact_phone}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-base">
                    <span className={`px-3 py-1 inline-flex text-sm font-bold rounded-full ${
                      app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      app.status === 'approved' ? 'bg-green-100 text-green-800' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-base">
                    <button
                      onClick={() => setSelectedApplication(app)}
                      className="text-indigo-600 hover:text-indigo-900 font-semibold text-base"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Basic Modal for Viewing Details */}
      {selectedApplication && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                      Application Details: {selectedApplication.company_name}
                    </h3>
                    <div className="mt-2 text-sm text-gray-600 space-y-2">
                      <p><strong>Submitted:</strong> {new Date(selectedApplication.created_at).toLocaleString()}</p>
                      <p><strong>Status:</strong> {selectedApplication.status}</p>
                      <p><strong>Contact:</strong> {selectedApplication.contact_name} ({selectedApplication.contact_email}, {selectedApplication.contact_phone})</p>
                      <p><strong>Resale Cert #:</strong> {selectedApplication.tax_id || 'N/A'}</p>
                      <p><strong>Business Type:</strong> {selectedApplication.business_type || 'N/A'}</p>
                      <p><strong>Years in Business:</strong> {selectedApplication.years_in_business || 'N/A'}</p>
                      <p><strong>Revenue Range:</strong> {selectedApplication.annual_revenue_range || 'N/A'}</p>
                      <p><strong>Address:</strong> {selectedApplication.business_address}, {selectedApplication.city}, {selectedApplication.state} {selectedApplication.zip_code}</p>
                      <p><strong>Additional Info:</strong> {selectedApplication.additional_info || 'N/A'}</p>
                      <p><strong>Notes:</strong> {selectedApplication.notes || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {selectedApplication.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={processingAction}
                      className="ml-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => {
                        handleUpdateStatus(selectedApplication.id, 'approved');
                        setSelectedApplication(null);
                      }}
                    >
                      {processingAction ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={processingAction}
                      className="ml-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => {
                        handleUpdateStatus(selectedApplication.id, 'rejected');
                        setSelectedApplication(null);
                      }}
                    >
                      {processingAction ? 'Processing...' : 'Reject'}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setSelectedApplication(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccountApplicationsPage;
