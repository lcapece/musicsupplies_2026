import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordChangeModal from './PasswordChangeModal';
import DeactivatedAccountModal from './DeactivatedAccountModal';
import { StaffPasswordChangeModal } from './StaffPasswordChangeModal';
import { User } from '../types';
import { validateEmail, validateAccountNumber } from '../utils/validation';
import { supabase } from '../lib/supabase';
import logo from '../images/music_supplies_logo.png';
import buildings from '../images/buildings.png';

// Import all brand logos
import logo1 from '../images/logo_1.png';
import logo2 from '../images/logo_2.png';
import logo3 from '../images/logo_3.png';
import logo4 from '../images/logo_4.png';
import logo5 from '../images/logo_5.png';
import logo6 from '../images/logo_6.png';
import logo7 from '../images/logo_7.png';
import logo8 from '../images/logo_8.png';
import logo9 from '../images/logo_9.png';
import logo10 from '../images/logo_10.png';
import logo11 from '../images/logo_11.png';
import logo12 from '../images/logo_12.png';
import logo13 from '../images/logo_13.png';
import logo14 from '../images/logo_14.png';
import logo15 from '../images/logo_15.png';
import logo16 from '../images/logo_16.png';

const brandLogos = [
  logo1, logo2, logo3, logo4, logo5, logo6, logo7, logo8,
  logo9, logo10, logo11, logo12, logo13, logo14, logo15, logo16
];

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [showPinCode, setShowPinCode] = useState(false);
  const {
    login,
    loginWith2FA,
    error,
    user,
    isAuthenticated,
    showPasswordChangeModal,
    handlePasswordModalClose,
    showDeactivatedAccountModal,
    deactivatedAccountName,
    closeDeactivatedAccountModal,
    showPasswordInitializationModal,
    resolvedAccountNumber,
    closePasswordInitializationModal,
    showStaffPasswordChangeModal,
    staffUsername,
    closeStaffPasswordChangeModal,
    isStaffUser
  } = useAuth();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only navigate if authenticated, user exists, doesn't require password change,
    // and password modal is not showing
    if (isAuthenticated && user && !user.requires_password_change && !showPasswordChangeModal) {
      // Check if this is admin account 999 - redirect to admin page
      if (String(user.accountNumber) === '999') {
        navigate('/admin');  // Admin dashboard
      } else {
        navigate('/');  // All other users (regular customers and staff) go to home, which will route them appropriately
      }
    }
  }, [isAuthenticated, user, navigate, showPasswordChangeModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      const loginResult = await login(identifier, password);
      if (loginResult === '2FA_REQUIRED') {
        // Show PIN input for admin 999 (reuses 2FA flow)
        setShowPinInput(true);
        setIsLoading(false);
        return;
      }
      // Don't navigate immediately - let the AuthContext handle showing password change modal
      // Navigation will happen after modal closes if password change is successful
    } catch (err) {
      console.error("Login submit error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate PIN length (4-8 digits for admin)
    if (!pinCode || pinCode.length < 4 || pinCode.length > 8) {
      return;
    }
    
    setIsPinLoading(true);
    try {
      const loginSuccess = await loginWith2FA(identifier, password, pinCode);
      if (loginSuccess) {
        setShowPinInput(false);
        setPinCode('');
      }
    } catch (err) {
      console.error("PIN submit error", err);
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleModalClose = (wasSuccess: boolean) => {
    handlePasswordModalClose(wasSuccess);
    if (wasSuccess) {
      // Check if admin account 999
      if (user && String(user.accountNumber) === '999') {
        navigate('/admin');  // Admin dashboard
      } else {
        navigate('/');  // All other users (regular customers and staff) go to home, which will route them appropriately
      }
    }
  };


  return (
    <div className="min-h-screen bg-white flex justify-center relative">
      <div ref={contentRef} className="bg-white w-full">
        <div className="w-[95vw] max-w-[1400px] mx-auto px-[2vw] sm:px-[3vw] lg:px-[4vw] pt-[1vh]">
          {/* Main Content */}
          <div className="flex flex-col md:flex-row items-center md:items-start mb-4">
            {/* Left Column */}
            <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left mb-[4vh] md:mb-0">
              <img 
                src={logo} 
                alt="Music Supplies Logo" 
                className="h-[clamp(6rem,10vw,12rem)] w-auto mb-[1vh]" 
              />
              <div className="text-left w-full">
                <p className="text-red-600 text-[clamp(1.25rem,2.5vw,2rem)] font-semibold">FOR WHOLESALE ACCOUNTS ONLY</p>
              </div>
              <p className="text-gray-600 text-[clamp(1rem,1.8vw,1.5rem)] mt-[1vh]">Please call 1(800)321-5584 for help or any questions.</p>
            </div>

            {/* Right Column */}
            <div className="w-full md:w-1/2 flex flex-col items-end">
              {!showPinInput ? (
                <form onSubmit={handleSubmit} className="w-full max-w-[clamp(20rem,35vw,28rem)]">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-[1.5vw] py-[1vh] rounded mb-[2vh] text-[clamp(0.875rem,1.2vw,1rem)]">
                    {error}
                  </div>
                )}
                <div className="mb-[2vh]">
                  <label htmlFor="identifier" className="block text-[clamp(0.875rem,1.2vw,1rem)] font-medium text-gray-700 mb-[0.5vh]">
                    Account Number or Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-[1vw] flex items-center pointer-events-none">
                      <UserIcon size={Math.max(16, Math.min(24, window.innerWidth * 0.015))} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="identifier"
                      className="w-full pl-[3vw] pr-[1vw] py-[1.2vh] text-[clamp(1rem,1.4vw,1.125rem)] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Account Number or Email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
                <div className="mb-[3vh]">
                  <label htmlFor="password" className="block text-[clamp(0.875rem,1.2vw,1rem)] font-medium text-gray-700 mb-[0.5vh]">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-[1vw] flex items-center pointer-events-none">
                      <KeyRound size={Math.max(16, Math.min(24, window.innerWidth * 0.015))} className="text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      className="w-full pl-[3vw] pr-[3vw] py-[1.2vh] text-[clamp(1rem,1.4vw,1.125rem)] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-[1vw] flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={Math.max(18, Math.min(24, window.innerWidth * 0.018))} className="text-gray-500" /> : <Eye size={Math.max(18, Math.min(24, window.innerWidth * 0.018))} className="text-gray-500" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-[1.5vh] px-[2vw] text-[clamp(1rem,1.4vw,1.125rem)] font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
                <div className="text-center mt-[2vh]">
                  <Link to="/forgot-password" className="text-blue-600 hover:underline text-[clamp(0.875rem,1.2vw,1rem)]">
                    Forgot Password?
                  </Link>
                </div>
              </form>
              ) : (
                <form onSubmit={handlePinSubmit} className="w-full max-w-[clamp(20rem,35vw,28rem)]">
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 px-[1.5vw] py-[2vh] rounded mb-[2vh] text-[clamp(0.875rem,1.2vw,1rem)]">
                    <div className="font-semibold mb-1">Admin PIN Required</div>
                    <div>Please enter your admin PIN to continue.</div>
                  </div>
                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-[1.5vw] py-[1vh] rounded mb-[2vh] text-[clamp(0.875rem,1.2vw,1rem)]">
                      {error}
                    </div>
                  )}
                  <div className="mb-[2vh]">
                    <label htmlFor="pinCode" className="block text-[clamp(0.875rem,1.2vw,1rem)] font-medium text-gray-700 mb-[0.5vh]">
                      Admin PIN
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-[1vw] flex items-center pointer-events-none">
                        <KeyRound size={Math.max(16, Math.min(24, window.innerWidth * 0.015))} className="text-gray-400" />
                      </div>
                      <input
                        type={showPinCode ? "text" : "password"}
                        id="pinCode"
                        className="w-full pl-[3vw] pr-[3vw] py-[1.2vh] text-[clamp(1rem,1.4vw,1.125rem)] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-wider"
                        placeholder="Enter PIN"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').substring(0, 8))}
                        maxLength={8}
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-[1vw] flex items-center"
                        onClick={() => setShowPinCode(!showPinCode)}
                      >
                        {showPinCode ? <EyeOff size={Math.max(18, Math.min(24, window.innerWidth * 0.018))} className="text-gray-500" /> : <Eye size={Math.max(18, Math.min(24, window.innerWidth * 0.018))} className="text-gray-500" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-[1.5vh] px-[2vw] text-[clamp(1rem,1.4vw,1.125rem)] font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
                    disabled={isPinLoading}
                  >
                    {isPinLoading ? 'Verifying...' : 'Verify PIN'}
                  </button>
                  <div className="text-center mt-[2vh]">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPinInput(false);
                        setPinCode('');
                      }}
                      className="text-gray-600 hover:underline text-[clamp(0.875rem,1.2vw,1rem)]"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Brands Bar */}
          <div className="my-[4vh] text-center">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {brandLogos.map((brandLogo, index) => (
                <div key={index} className="flex justify-center items-center">
                  <img 
                    src={brandLogo} 
                    alt={`Brand ${index + 1}`} 
                    className="max-h-[clamp(3rem,6vw,4rem)] w-auto object-contain hover:scale-110 transition-transform duration-200" 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-[4vw]">
            <div className="w-full md:w-1/2 mb-[4vh] md:mb-0">
              <img 
                src={buildings} 
                alt="Lou Capece Music Building" 
                className="w-full h-auto rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300" 
              />
            </div>
            <div className="w-full md:w-1/2">
              <p className="text-gray-600 text-[clamp(1rem,1.4vw,1.125rem)] leading-relaxed">
                Lou Capece Music Distributors, founded in 1987, has been proudly supporting independent music shops for nearly four decades. Despite the rise of Amazon, the national chains, and massive online retailers, you can still find a local music store in nearly every small city's downtown or Main Street—and we're part of the reason why. Trusted by over 2,000 independent brick-and-mortar and online musical instrument retailers in the USA.
                <br /><br />
                With over 10 exclusive brands, including Cordovox, New York Pro, and Stadium, we provide dependable, low cost wholesale distribution and 100% personalized service. Our dedicated sales team works hand-in-hand with shop owners to help them stay competitive, well-stocked, and thriving in a challenging retail landscape.
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-center mt-[6vh] border-t pt-[3vh]">
            <Link 
              to="/new-account-application" 
              className="text-blue-600 hover:underline font-medium text-[clamp(1rem,1.4vw,1.25rem)] hover:text-blue-800 transition-colors duration-200"
            >
              Click here to apply for a new account
            </Link>
            <div className="mt-[2vh] text-[clamp(0.875rem,1.2vw,1rem)] text-gray-500">
              <Link to="/terms-and-conditions" className="hover:underline mx-[1vw] hover:text-gray-700 transition-colors duration-200">Terms & Conditions</Link> |
              <Link to="/privacy-policy" className="hover:underline mx-[1vw] hover:text-gray-700 transition-colors duration-200">Privacy Policy</Link> |
              <Link to="/sms-communications" className="hover:underline mx-[1vw] hover:text-gray-700 transition-colors duration-200">SMS Policy</Link> |
              <Link to="/email-communications" className="hover:underline mx-[1vw] hover:text-gray-700 transition-colors duration-200">Email Policy</Link>
            </div>
          </div>
        </div>
      </div>

      {user && showPasswordChangeModal && user.requires_password_change && (
        <PasswordChangeModal
          isOpen={showPasswordChangeModal}
          onClose={handleModalClose}
          accountData={user}
        />
      )}

      {showPasswordInitializationModal && resolvedAccountNumber && (
        <PasswordChangeModal
          isOpen={showPasswordInitializationModal}
          onClose={(wasSuccess) => {
            closePasswordInitializationModal();
            if (wasSuccess) {
              navigate('/dashboard');
            }
          }}
          accountData={{
            accountNumber: resolvedAccountNumber,
            acctName: `Account ${resolvedAccountNumber}`,
            address: '',
            city: '',
            state: '',
            zip: '',
            id: parseInt(resolvedAccountNumber, 10),
            email: '',
            phone: '',
            mobile_phone: '',
            requires_password_change: false,
            is_special_admin: false
          }}
        />
      )}

      <DeactivatedAccountModal
        show={showDeactivatedAccountModal}
        accountName={deactivatedAccountName}
        onClose={closeDeactivatedAccountModal}
      />

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
      
      {/* Contact info in lower right corner */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
        <a href="tel:18003215584" className="hover:text-gray-600">1 (800) 321-5584</a>
        {' '}
        <a href="mailto:marketing@musicsupplies.com" className="hover:text-gray-600">marketing@musicsupplies.com</a>
      </div>
    </div>
  );
};

export default Login;
