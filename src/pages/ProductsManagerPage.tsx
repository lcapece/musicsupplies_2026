import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import ProductsManagerGrid from '../components/ProductsManagerGrid';

const ProductsManagerPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  // Check if user is account 99 - handle both string and number types
  const isAuthorizedUser = String(user?.accountNumber) === '99';
  
  if (!isAuthenticated || !isAuthorizedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-2xl text-gray-700">
            You don't have permission to access the Products Manager.
          </p>
          <p className="text-lg text-gray-600 mt-2">
            This page is only available to account number 99.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with logout button */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Products Manager</h1>
              <p className="text-sm text-gray-600">Account 99 - Product Database Management</p>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-lg font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-6" style={{ height: 'calc(100vh - 4rem)' }}>
        <div className="bg-white rounded-lg shadow-lg h-full overflow-hidden">
          <ProductsManagerGrid />
        </div>
      </div>
    </div>
  );
};

export default ProductsManagerPage;