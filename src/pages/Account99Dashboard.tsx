import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import ProductEditTab from '../components/admin/ProductEditTab';

type TabType = 'productedit';

const Account99Dashboard: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('productedit');

  // Check if user is account 99 - handle both string and number types
  const isAccount99 = String(user?.accountNumber) === '99';
  
  if (!isAuthenticated || !isAccount99) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-2xl text-gray-700">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'productedit', label: 'Product Edit', icon: '📝' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'productedit':
        return <ProductEditTab />;
      default:
        return <ProductEditTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with logout button */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            <h1 className="text-4xl font-semibold text-gray-900">Account 99 - Admin Backend</h1>
            <button
              onClick={logout}
              className="inline-flex items-center px-6 py-3 border border-transparent text-2xl font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="h-8 w-8 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200">
            {/* Tab Navigation */}
            <div className="px-6 pt-6">
              <nav className="-mb-px flex space-x-8 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-2 border-b-4 font-medium text-base whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2 text-xl">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="p-12">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account99Dashboard;
