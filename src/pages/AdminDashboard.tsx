import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AccountsTab from '../components/admin/AccountsTab';
import AccountApplicationsTab from '../components/admin/AccountApplicationsTab';
import OrderHistoryTab from '../components/admin/OrderHistoryTab';
import ClickSendTab from '../components/admin/ClickSendTab';
import PromoCodeManagementTab from '../components/admin/PromoCodeManagementTab';
import SiteStatusTab from '../components/admin/SiteStatusTab';
import SmsNotificationTab from '../components/admin/SmsNotificationTab';
import SmsFailureNotificationModal from '../components/SmsFailureNotificationModal';
import AdminChatManagementPage from './AdminChatManagementPage';
import SimplePasswordChanger from '../components/admin/SimplePasswordChanger';
import AdminPasswordManager from '../components/AdminPasswordManager';
import AdminPinManager from '../components/admin/AdminPinManager';
import SystemLogTab from '../components/admin/SystemLogTab';
import S3CacheExpanded from '../components/admin/S3CacheExpanded';

type TabType = 'accounts' | 'applications' | 'history' | 'sms' | 'clicksend' | 'promocodes' | 'sitestatus' | 'chat' | 'security' | 'systemlog' | 's3cache';

const AdminDashboard: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [showSmsFailureModal, setShowSmsFailureModal] = useState(false);
  const [hasCheckedForFailures, setHasCheckedForFailures] = useState(false);

  // Check for SMS failures when admin logs in
  useEffect(() => {
    const checkForSmsFailures = async () => {
      // CRITICAL: Only check for SMS failures if this is the admin account (999)
      const isAdminUser = String(user?.accountNumber) === '999';
      if (!hasCheckedForFailures && isAdminUser && isAuthenticated) {
        try {
          // Check if there are any unacknowledged SMS failures
          const { data, error } = await supabase.rpc('get_unacknowledged_sms_failures');
          
          if (!error && data && data.length > 0) {
            setShowSmsFailureModal(true);
          }
          
          setHasCheckedForFailures(true);
        } catch (error) {
          console.error('Error checking for SMS failures:', error);
          setHasCheckedForFailures(true);
        }
      } else if (!isAdminUser) {
        // Not admin, mark as checked to prevent any future attempts
        setHasCheckedForFailures(true);
      }
    };

    checkForSmsFailures();
  }, [user, hasCheckedForFailures, isAuthenticated]);

  // Check if user is admin (account 999) - handle both string and number types
  const isAdmin = String(user?.accountNumber) === '999';
  
  if (!isAuthenticated || !isAdmin) {
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
    { id: 'accounts', label: 'Accounts', icon: '👥' },
    { id: 'applications', label: 'Applications', icon: '📝' },
    { id: 'history', label: 'Order History', icon: '📊' },
    { id: 's3cache', label: 'S3 Images', icon: '🖼️' },
    { id: 'chat', label: 'Chat System', icon: '🤖' },
    { id: 'sms', label: 'SMS Notifications', icon: '📱' },
    { id: 'clicksend', label: 'ClickSend', icon: '📨' },
    { id: 'promocodes', label: 'Promo Codes', icon: '🏷️' },
    { id: 'sitestatus', label: 'Site Status', icon: '⚠️' },
    { id: 'security', label: 'Security', icon: '🔐' },
    { id: 'systemlog', label: 'System Log', icon: '📋' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'accounts':
        return <AccountsTab />;
      case 'applications':
        return <AccountApplicationsTab />;
      case 'history':
        return <OrderHistoryTab />;
      case 'chat':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Chat System Management</h2>
              <a
                href="/admin/knowledge-base"
                className="px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                Manage Knowledge Base →
              </a>
            </div>
            <AdminChatManagementPage />
          </div>
        );
      case 'sms':
        return <SmsNotificationTab />;
      case 'clicksend':
        return <ClickSendTab />;
      case 'promocodes':
        return <PromoCodeManagementTab />;
      case 'sitestatus':
        return <SiteStatusTab />;
      case 'security':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Security Settings</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminPasswordManager />
              <AdminPinManager />
            </div>
            <div className="mt-8">
              <SimplePasswordChanger />
            </div>
          </div>
        );
      case 's3cache':
        return <S3CacheExpanded />;
      case 'systemlog':
        return <SystemLogTab />;
      default:
        return <AccountsTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header with just logout button */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            <h1 className="text-4xl font-semibold text-gray-900">Admin Backend System</h1>
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

      {/* SMS Failure Notification Modal */}
      <SmsFailureNotificationModal 
        isOpen={showSmsFailureModal} 
        onClose={() => setShowSmsFailureModal(false)} 
      />
    </div>
  );
};

export default AdminDashboard;
