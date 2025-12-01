// Music Supplies App - Version 12.01.120 - Account 99 Admin Backend
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import ActiveDiscountDisplayModal from './components/ActiveDiscountDisplayModal';
import LoginFixBanner from './components/LoginFixBanner';
import Login from './components/Login';
import Login2 from './components/Login2';
import Dashboard from './pages/DashboardClean';
import SiteStatusOffline from './components/SiteStatusOffline';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NewAccountApplicationPage from './pages/NewAccountApplicationPage';
import AdminAccountApplicationsPage from './pages/AdminAccountApplicationsPage';
import AdminDashboard from './pages/AdminDashboard';
import PasswordChangeModal from './components/PasswordChangeModal';
import DiscountFormModal from './components/DiscountFormModal';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'; // Import new page
import SmsCommunicationsPage from './pages/SmsCommunicationsPage'; // Import new page
import EmailCommunicationsPage from './pages/EmailCommunicationsPage'; // Import new page
import TermsAndConditionsPage from './pages/TermsAndConditionsPage'; // Import Terms & Conditions page
import CustomerAccountPage from './pages/CustomerAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage'; // Import forgot password page
import UpdatePasswordPage from './pages/UpdatePasswordPage'; // Import update password page
import SmsConsentPreviewPage from './pages/SmsConsentPreviewPage'; // Import SMS consent preview page
import ErrorBoundary from './components/ErrorBoundary';
// import SkuImportPage from './pages/SkuImportPage'; // DISABLED - Import SKU Import page for account 99
// import Account99Dashboard from './pages/Account99Dashboard'; // DISABLED - Import Account 99 admin dashboard
import EnhancedChatWidget from './components/EnhancedChatWidget';
import ChatPage from './pages/ChatPage';
import AdminKnowledgeBase from './pages/AdminKnowledgeBase'; // Admin knowledge base management
import ManagerPage from './pages/ManagerPage'; // Manager staff management page
import ProspectsPage from './pages/ProspectsPage'; // Prospects management page
import ImageGeneratorPage from './pages/ImageGeneratorPage'; // Image generator page
import AccountsPage from './pages/AccountsPage'; // Accounts management page
import CRMPage from './pages/CRMPage'; // Backend System page (accounts, calls, contacts)
import InvoicingPage from './pages/InvoicingPage'; // Invoicing module for staff
import ProductsPage from './pages/ProductsPage'; // Products management page
import EmailClientPage from './pages/EmailClientPage'; // Email client for staff
import ProductManagerPage from './pages/ProductManagerPage'; // Bulk product entry system
import ProductEditDemo from './pages/ProductEditDemo'; // Product Edit Panel Demo page
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'; // Purchase Orders management page
import PayInvoicesPage from './pages/PayInvoicesPage'; // Stripe payment page for overdue invoices
import PaymentSuccessPage from './pages/PaymentSuccessPage'; // Payment success confirmation page
import { useLocation, useNavigate } from 'react-router-dom';
import { VersionCheck } from './components/VersionCheck';
import CartRestorationModal from './components/CartRestorationModal';
import PromotionsLoginModal from './components/PromotionsLoginModal';
// SearchEntityModal PERMANENTLY REMOVED - Use ProspectsSearchModal instead
import AccountsSearchModal from './components/AccountsSearchModal';
import ProspectsSearchModal from './components/ProspectsSearchModal';
import { StaffPasswordChangeModal } from './components/StaffPasswordChangeModal';
import PurchaseOrderModal from './components/PurchaseOrderModal';
import SecurityBridgeModal from './components/SecurityBridgeModal';
import SuperUserChoiceModal from './components/SuperUserChoiceModal';
import ShopOnBehalfModal from './components/ShopOnBehalfModal';
import { useCart } from './context/CartContext';
import LouCapecePlayer from './components/LouCapecePlayer';


interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth(); // Added user

  if (isLoading) {
    return <div>Loading authentication status...</div>; // Or a spinner
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Specific protected route for admin (user 999)
const AdminProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading authentication status...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for admin account 999
  const isAdmin = user?.accountNumber === '999';
  return isAdmin ? children : <Navigate to="/" replace />; // Redirect non-admins to dashboard
};

// Specific protected route for special admin (user 99)
const SpecialAdminProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, isSpecialAdmin } = useAuth();

  if (isLoading) {
    return <div>Loading authentication status...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is account 99 specifically or has special admin flag
  const isAccount99 = user?.accountNumber === '99';
  const hasAccess = isSpecialAdmin || isAccount99;


  // Use a state variable to prevent infinite redirects
  const [redirectAttempted, setRedirectAttempted] = React.useState(false);
  
  React.useEffect(() => {
    // Reset redirect flag if user or access status changes
    if (user?.accountNumber || hasAccess !== undefined) {
      setRedirectAttempted(false);
    }
  }, [user?.accountNumber, hasAccess]);

  // If user doesn't have access and haven't attempted redirect yet
  if (!hasAccess && !redirectAttempted) {
    setRedirectAttempted(true);
    return <Navigate to="/" replace />;
  }

  return hasAccess ? children : <div>Redirecting...</div>;
};


function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user, // Get user for accountData
    // activeDiscount,  // Removed as part of new discount logic
    // showActiveDiscountModal, // Removed
    // clearActiveDiscount, // Removed
    showPasswordChangeModal,
    handlePasswordModalClose,
    showDiscountFormModal,
    closeDiscountFormModal,
    isSpecialAdmin,
    showPromotionsLoginModal,
    closePromotionsLoginModal,
    showAccountsModal,
    closeAccountsModal,
    showProspectsModal,
    closeProspectsModal,
    showPurchaseOrderModal,
    closePurchaseOrderModal,
    showStaffPasswordChangeModal,
    closeStaffPasswordChangeModal,
    staffUsername,
    selectCustomerAccount,
    isStaffUser,
    showSecurityBridge,
    handleSecurityBridgeSuccess,
    handleSecurityBridgeFailure,
    // Shop on behalf of customer
    showSuperUserChoiceModal,
    closeSuperUserChoiceModal,
    handleChooseBackend,
    handleChooseShopOnBehalf,
    showShopOnBehalfModal,
    closeShopOnBehalfModal,
    handleSelectShopOnBehalfCustomer
  } = useAuth();
  
  const { 
    showCartRestorationModal, 
    dismissCartRestoration, 
    emptyEntireCart,
    restoreCartFromDatabase
  } = useCart();
  
  // For error handling
  const [dbUpdateError, setDbUpdateError] = useState<boolean>(false);

  // Lou Capece Music Player
  const [showMusicPlayer, setShowMusicPlayer] = useState<boolean>(false);

  // Check database updates when the app loads
  useEffect(() => {
    const checkDb = async () => {
      try {
        // Run a query to check if the new columns exist
        const { data, error } = await supabase
          .from('pre_products_supabase')
          .select('partnumber, brand, map')
          .limit(1);
          
        if (error) {
          console.error('Database schema check failed:', error);
          setDbUpdateError(true);
        } else {
          setDbUpdateError(false);
        }
      } catch (err) {
        console.error('Error checking database schema:', err);
        setDbUpdateError(true);
      }
    };
    
    // Only run this check if the user is logged in
    if (user) {
      checkDb();
    }
  }, [user]);

  
  // If there's a database update error, show an admin message
  if (dbUpdateError && user?.accountNumber === '999') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center text-red-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold ml-4">Database Update Required</h2>
          </div>
          <p className="text-gray-700 mb-6">
            The database schema needs to be updated to include the new brand and MAP columns. 
            Please click the button below to apply the database updates.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            Apply Database Updates
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {/* Version Check Component - shows version and auto-refreshes */}
      <VersionCheck />
      
      {/* Authentication Fix Banner - only shows for admin users */}
      <LoginFixBanner />
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login2" element={<Login2 />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        {/* Admin Dashboard via /5150 bypass */}
        <Route 
          path="/5150" 
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } 
        />
        {/* Admin Dashboard */}
        <Route 
          path="/admin" 
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } 
        />
        {/* Home route with special handling for different account types */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {user?.accountNumber === '999' ? (
                <AdminDashboard />
              ) : isStaffUser ? (
                <Navigate to="/crm" replace />
              ) : (
                <Navigate to="/shopping" replace />
              )}
            </ProtectedRoute>
          }
        />
        {/* Shopping page - Main product browsing and shopping interface */}
        <Route 
          path="/shopping" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/new-account-application" 
          element={<NewAccountApplicationPage />} 
        />
        <Route 
          path="/admin/account-applications"
          element={
            <AdminProtectedRoute>
              <AdminAccountApplicationsPage />
            </AdminProtectedRoute>
          }
        />
        {/* DISABLED - SKU Import and Account 99 routes removed */}
        {/* <Route 
          path="/sku-import"
          element={
            <SpecialAdminProtectedRoute>
              <SkuImportPage />
            </SpecialAdminProtectedRoute>
          }
        /> */}
        {/* <Route 
          path="/admin99"
          element={
            <SpecialAdminProtectedRoute>
              <Account99Dashboard />
            </SpecialAdminProtectedRoute>
          }
        /> */}
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/sms-communications" element={<SmsCommunicationsPage />} />
        <Route path="/email-communications" element={<EmailCommunicationsPage />} />
        {/* Invoice Payment Page - Protected route for B2B customers */}
        <Route
          path="/pay-invoices"
          element={
            <ProtectedRoute>
              <PayInvoicesPage />
            </ProtectedRoute>
          }
        />
        {/* Payment Success Page */}
        <Route
          path="/payment-success"
          element={
            <ProtectedRoute>
              <PaymentSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
        <Route path="/gduej83hd68386bxsd-ejdhgdsw22" element={<SmsConsentPreviewPage />} />
        <Route 
          path="/account" 
          element={
            <ProtectedRoute>
              <CustomerAccountPage />
            </ProtectedRoute>
          } 
        />
        {/* Admin Knowledge Base Management - Account 999 only */}
        <Route 
          path="/admin/knowledge-base"
          element={
            <AdminProtectedRoute>
              <AdminKnowledgeBase />
            </AdminProtectedRoute>
          }
        />
        {/* Chat route - accessible to everyone */}
        <Route path="/chat" element={<ChatPage />} />
        {/* Manager Panel - Protected route */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute>
              <ManagerPage />
            </ProtectedRoute>
          }
        />
        {/* Purchase Orders - Staff only */}
        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />
        {/* Prospects Management - Staff and Admin */}
        <Route
          path="/prospects"
          element={
            <ProtectedRoute>
              <ProspectsPage
                onNavigateBack={() => navigate('/shopping')}
                preservedState={{
                  filters: {},
                  searchParams: {},
                  sessionData: {}
                }}
              />
            </ProtectedRoute>
          }
        />
        {/* Image Generator - Authenticated users */}
        <Route
          path="/image-generator"
          element={
            <ProtectedRoute>
              <ImageGeneratorPage />
            </ProtectedRoute>
          }
        />
        {/* Accounts Management - Staff and Admin */}
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <AccountsPage />
            </ProtectedRoute>
          }
        />
        {/* Backend System - Staff and Admin */}
        <Route
          path="/crm"
          element={
            <ProtectedRoute>
              <CRMPage />
            </ProtectedRoute>
          }
        />
        {/* Products Management - Staff and Admin */}
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        {/* Invoicing Module - Staff and Admin */}
        <Route
          path="/invoicing"
          element={
            <ProtectedRoute>
              <InvoicingPage />
            </ProtectedRoute>
          }
        />
        {/* Email Client - Staff and Admin */}
        <Route
          path="/email"
          element={
            <ProtectedRoute>
              <EmailClientPage />
            </ProtectedRoute>
          }
        />
        {/* Product Manager - Bulk Product Entry System */}
        <Route
          path="/product-manager"
          element={
            <ProtectedRoute>
              <ProductManagerPage />
            </ProtectedRoute>
          }
        />
        {/* Product Edit Panel Demo - Public access for demonstration */}
        <Route
          path="/product-edit-demo"
          element={<ProductEditDemo />}
        />
         {/* Redirect any unmatched routes to the home page */}
         <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Password Change Modal */}
      {user && showPasswordChangeModal && (
        <PasswordChangeModal
          isOpen={showPasswordChangeModal}
          onClose={handlePasswordModalClose}
          accountData={user} 
        />
      )}

      {/* Discount Form Modal */}
      {showDiscountFormModal && (
        <DiscountFormModal
          isOpen={showDiscountFormModal}
          onClose={closeDiscountFormModal}
        />
      )}

      {/* Cart Restoration Modal */}
      {showCartRestorationModal && (
        <CartRestorationModal
          isOpen={showCartRestorationModal}
          onGoToCart={async () => {
            // First restore the cart items from database
            await restoreCartFromDatabase();
            // Then navigate to shopping page with cart auto-open parameter
            navigate('/shopping?openCart=true');
          }}
          onContinueShopping={() => {
            // The modal handles dismissing cart restoration internally
            dismissCartRestoration();
          }}
        />
      )}

      {/* Promotions Login Modal */}
      {showPromotionsLoginModal && (
        <PromotionsLoginModal
          isOpen={showPromotionsLoginModal}
          onClose={closePromotionsLoginModal}
        />
      )}

      {/* Accounts Search Modal - For staff to search accounts only */}
      {showAccountsModal && (
        <AccountsSearchModal
          isOpen={showAccountsModal}
          onClose={closeAccountsModal}
          onSelectAccount={selectCustomerAccount}
        />
      )}

      {/* Prospects Search Modal - For staff to search prospects only */}
      {showProspectsModal && (
        <ProspectsSearchModal
          isOpen={showProspectsModal}
          onClose={closeProspectsModal}
        />
      )}

      {/* Staff Password Change Modal - For staff users with default password */}
      {showStaffPasswordChangeModal && staffUsername && (
        <StaffPasswordChangeModal
          isOpen={showStaffPasswordChangeModal}
          onClose={(success) => {
            if (success) {
              // Password changed successfully, attempt login again
              window.location.reload();
            } else {
              closeStaffPasswordChangeModal();
            }
          }}
          staffUsername={staffUsername}
        />
      )}

      {/* Purchase Order Modal - For staff to manage purchase orders */}
      {showPurchaseOrderModal && (
        <PurchaseOrderModal
          isOpen={showPurchaseOrderModal}
          onClose={closePurchaseOrderModal}
        />
      )}

      {/* Security Bridge Modal - Enhanced authentication for user Peter */}
      <SecurityBridgeModal
        isOpen={showSecurityBridge}
        onSuccess={handleSecurityBridgeSuccess}
        onFailure={handleSecurityBridgeFailure}
        username={staffUsername || 'PETER'}
      />

      {/* Super User Choice Modal - Backend vs Shop on Behalf */}
      <SuperUserChoiceModal
        isOpen={showSuperUserChoiceModal}
        onClose={closeSuperUserChoiceModal}
        onChooseBackend={handleChooseBackend}
        onChooseShopOnBehalf={handleChooseShopOnBehalf}
        staffUsername={staffUsername || 'User'}
      />

      {/* Shop on Behalf Modal - Customer selection */}
      <ShopOnBehalfModal
        isOpen={showShopOnBehalfModal}
        onClose={closeShopOnBehalfModal}
        onSelectCustomer={handleSelectShopOnBehalfCustomer}
      />

      {/* Lou Capece Music Player - Only show on login page */}
      {(location.pathname === '/login' || location.pathname === '/login2') && (
        <>
          <LouCapecePlayer
            isOpen={showMusicPlayer}
            onClose={() => setShowMusicPlayer(false)}
          />

          {/* Floating Music Button - Click here to listen to Lou Capece */}
          {!showMusicPlayer && (
            <button
              onClick={() => setShowMusicPlayer(true)}
              className="fixed bottom-4 right-4 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-3 rounded-2xl shadow-lg z-40 flex items-center gap-3 transition-all duration-300 hover:scale-105"
              title="Listen to Lou Capece - Jazz Guitar Classics"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
              <span className="text-xs font-medium text-center leading-tight">
                Listen to Lou Capece Vols. I &amp; II<br/>
                Solo Jazz Guitar Classics
              </span>
            </button>
          )}
        </>
      )}

    </>
  );
}

function App() {
  // CHECK FOR /5150 IMMEDIATELY
  const isAdminBypass = window.location.pathname.includes('/5150') || 
                        sessionStorage.getItem('adminBypass') === 'true';
  
  const [siteStatus, setSiteStatus] = useState<{ status: string; message: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(!isAdminBypass); // Skip loading if bypassed
  const [bypassCheck, setBypassCheck] = useState(isAdminBypass); // Set bypass immediately

  // Check for bypass conditions on app load
  useEffect(() => {
    // If on login page, ALWAYS bypass site status check
    const currentPath = window.location.pathname;
    if (currentPath === '/login' || currentPath === '/5150' || currentPath.includes('login')) {
      sessionStorage.setItem('adminBypass', 'true');
      setStatusLoading(false);
      setBypassCheck(true);
      return; // Don't check site status on login page
    }
    
    // If already bypassed from login, stay bypassed
    if (isAdminBypass) {
      setStatusLoading(false);
      return;
    }
    
    const checkSiteStatus = async () => {
      try {

        // THIS CODE NEVER RUNS
        const { data, error } = await supabase
          .from('site_status')
          .select('is_online, message')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking site status:', error);
          // If we can't check status, allow access (fail open)
          setStatusLoading(false);
          return;
        }

        if (data && data.is_online === false) {
          // Site is offline ONLY if is_online is explicitly false
          setSiteStatus({
            status: 'offline',
            message: data.message || 'Site is temporarily unavailable for maintenance.'
          });
        }

        setStatusLoading(false);
      } catch (error) {
        console.error('Site status check failed:', error);
        // If check fails, allow access (fail open)
        setStatusLoading(false);
      }
    };

    // DISABLED - SITE ALWAYS ONLINE
    // checkSiteStatus();
  }, []);

  // NEVER SHOW LOADING OR OFFLINE - GO STRAIGHT TO APP
  // Normal app flow
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <NotificationProvider>
              <AppContentWithStatusCheck bypassCheck={bypassCheck} />
              {/* Enhanced Chat Widget - REMOVED - Replaced with Lou Capece Music Player */}
            </NotificationProvider>
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

// Wrapper component for offline status that can access auth context
function SiteStatusOfflineWrapper({ message }: { message: string }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SiteStatusChecker message={message} />
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Component that checks if user is account 999 (admin bypass)
function SiteStatusChecker({ message }: { message: string }) {
  const { user, isAuthenticated } = useAuth();
  
  // If user is already logged in as account 999, bypass offline check
  if (isAuthenticated && user?.accountNumber === '999') {
    return (
      <CartProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </CartProvider>
    );
  }
  
  // Show offline page
  return <SiteStatusOffline message={message} />;
}

// Modified AppContent to handle bypass
function AppContentWithStatusCheck({ bypassCheck }: { bypassCheck: boolean }) {
  const { user } = useAuth();
  
  // If bypass was used or user is admin, show normal app
  if (bypassCheck || (user?.accountNumber === '999')) {
    return <AppContent />;
  }
  
  // For regular users, do a final status check
  return <AppContentWithFinalStatusCheck />;
}

// Final status check for regular users
function AppContentWithFinalStatusCheck() {
  const [siteStatus, setSiteStatus] = useState<{ status: string; message: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false); // SITE ALWAYS ONLINE
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('site_status')
          .select('status, status_message')
          .eq('status', 'offline')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking site status:', error);
        } else if (data) {
          setSiteStatus({
            status: data.status,
            message: data.status_message || 'Site is temporarily unavailable for maintenance.'
          });
        }
      } catch (error) {
        console.error('Final site status check failed:', error);
      } finally {
        setStatusLoading(false);
      }
    };
    
    // DISABLED - SITE ALWAYS ONLINE
    // checkStatus();
    setStatusLoading(false); // Immediately set to false
  }, []);
  
  // NEVER SHOW LOADING - GO STRAIGHT TO APP
  return <AppContent />;
}

export default App;
