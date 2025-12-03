import React, { useState, useEffect } from 'react';
import { Settings, LogOut, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ShoppingCartComponent from './ShoppingCart';
import AccountSettingsModal from './AccountSettingsModal';
import { useAutoVersionCheck } from '../hooks/useAutoVersionCheck';

interface HeaderProps {
  onViewChange: (view: 'products' | 'orders' | 'weborders') => void;
  activeView: 'products' | 'orders' | 'weborders';
}

const Header: React.FC<HeaderProps> = ({ onViewChange, activeView }) => {
  const { user, logout, isDemoMode, isStaffUser } = useAuth();
  const { totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Silent automatic version checking
  useAutoVersionCheck();

  // REMOVED: Staff auto-redirect to Backend System was breaking the shopping page
  // Staff can navigate freely between Backend System and Shopping pages

  // Check for cart auto-open URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('openCart') === 'true') {
      setIsCartOpen(true);

      // Clean up the URL parameter without causing a page reload
      urlParams.delete('openCart');
      const newSearch = urlParams.toString();
      const newUrl = location.pathname + (newSearch ? `?${newSearch}` : '');
      navigate(newUrl, { replace: true });
    }
  }, [location.search, navigate]);

  const handleLogout = () => {
    logout();
  };

  const openCart = () => {
    setIsCartOpen(true);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const openAccountSettings = () => {
    setIsAccountSettingsOpen(true);
  };

  const closeAccountSettings = () => {
    setIsAccountSettingsOpen(false);
  };

  // Staff users CAN access shopping page - header renders for everyone
  // Backend System has its own header, so this only renders on shopping page

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-full mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo and Backend Button for Staff */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center">
              <div className="font-bold header-logo leading-none whitespace-nowrap">
                <span className="text-blue-600">Music</span>
                <span className="text-red-600">Supplies</span>
                <span className="text-black">.com</span>
              </div>
            </Link>

            {/* Backend Button - Only visible for staff/manager users */}
            {isStaffUser && (
              <button
                onClick={() => navigate('/crm')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                &laquo; Backend
              </button>
            )}
          </div>

          {/* Center Section - Navigation */}
          <div className="flex items-center space-x-6">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="radio"
                className="form-radio text-blue-600 h-4 w-4"
                name="view"
                value="products"
                checked={activeView === 'products'}
                onChange={() => onViewChange('products')}
              />
              <span className="ml-2 text-gray-700 font-medium" style={{ fontSize: '10.8px' }}>SHOPPING</span>
            </label>

            {!isDemoMode && (
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="form-radio text-blue-600 h-4 w-4"
                  name="view"
                  value="orders"
                  checked={activeView === 'orders'}
                  onChange={() => onViewChange('orders')}
                />
                <span className="ml-2 text-gray-700 font-medium" style={{ fontSize: '10.8px' }}>Order History</span>
              </label>
            )}
          </div>

          {/* Right Section - Shopping Cart, Account Settings, Logout, and User Info */}
          <div className="flex items-center space-x-3">
            {/* Shopping Cart Button */}
            {!isDemoMode ? (
              <button
                onClick={openCart}
                className="relative inline-flex items-center px-6 py-2 border border-green-500 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-w-[120px]"
                style={{ fontSize: '13.5px' }}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            ) : (
              <div className="inline-flex items-center px-6 py-2 border border-gray-300 font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed min-w-[120px]" style={{ fontSize: '13.5px' }}>
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart Disabled
              </div>
            )}

            {/* Account Settings Button - Hidden in demo mode */}
            {!isDemoMode && (
              <button
                onClick={openAccountSettings}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>

            {/* User Info Box */}
            {isDemoMode ? (
              <div className="bg-yellow-50 border border-yellow-300 rounded px-3 py-2 min-w-[200px]">
                <div className="text-sm font-bold text-yellow-800">
                  DEMO ACCOUNT
                </div>
                <div className="text-xs text-yellow-700 leading-tight">
                  View-Only Mode<br />
                  No Checkout Available<br />
                  Limited Functionality
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 min-w-[200px]">
                <div className="text-sm font-bold text-blue-700">
                  {user?.acctName}
                </div>
                <div className="text-xs text-blue-600 leading-tight">
                  Account #{user?.accountNumber}<br />
                  {user?.city}, {user?.state} {user?.zip}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shopping Cart Modal */}
      <ShoppingCartComponent isOpen={isCartOpen} onClose={closeCart} />

      {/* Account Settings Modal */}
      <AccountSettingsModal isOpen={isAccountSettingsOpen} onClose={closeAccountSettings} />
    </header>
  );
};

export default Header;
