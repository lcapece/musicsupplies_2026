import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AccountsTab from '../components/admin/AccountsTab';

const AccountsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow-lg border-2 border-red-600 relative">
          {/* Back Button - Upper Right Corner */}
          <button
            onClick={handleBack}
            className="absolute top-4 right-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm z-10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            &lt;&lt; BACK
          </button>

          <div className="border-b border-gray-200">
            {/* Page Header */}
            <div className="px-6 pt-6">
              <div className="flex items-center mb-4">
                <span className="mr-3 text-2xl">👥</span>
                <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
              </div>
              <p className="text-sm text-gray-600 pb-4">
                Manage customer accounts, passwords, and contact information
              </p>
            </div>
          </div>
          
          {/* Accounts Content */}
          <div className="p-6">
            <AccountsTab />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsPage;