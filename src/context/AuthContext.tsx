import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { sessionManager } from '../utils/sessionManager';
import { logLoginSuccess, logLoginFailure, logSessionExpired } from '../utils/eventLogger';
import { validateEmail, validateAccountNumber } from '../utils/validation';
import { activityTracker } from '../services/activityTracker';

interface DiscountInfo {
  rate: number;
  type: 'date_based' | 'order_based';
  message?: string;
  source: string; // Description of discount source
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<boolean | '2FA_REQUIRED'>;
  loginWith2FA: (identifier: string, password: string, twoFactorCode: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  fetchUserAccount: (accountNumber: string) => Promise<User | null>;
  updateUser: (userData: Partial<User>) => void;
  maxDiscountRate: number | null;
  currentDiscountInfo: DiscountInfo | null;
  showPasswordChangeModal: boolean;
  openPasswordChangeModal: () => void;
  handlePasswordModalClose: (wasSuccess: boolean) => void;
  showDiscountFormModal: boolean;
  openDiscountFormModal: () => void;
  closeDiscountFormModal: () => void;
  isSpecialAdmin: boolean;
  isSuperUser: boolean;
  showDeactivatedAccountModal: boolean;
  deactivatedAccountName: string;
  closeDeactivatedAccountModal: () => void;
  validateAndRefreshSession: () => Promise<boolean>;
  ensureAuthSession: () => Promise<boolean>;
  showPasswordInitializationModal: boolean;
  needsPasswordInitialization: boolean;
  resolvedAccountNumber: string | null;
  closePasswordInitializationModal: () => void;
  isDemoMode: boolean;
  showPromotionsLoginModal: boolean;
  closePromotionsLoginModal: () => void;
  showAccountsModal: boolean;
  showProspectsModal: boolean;
  showEntityWorkflowSelector: boolean;
  showSalesWorkflowModal: boolean;
  isStaffUser: boolean;
  staffUsername: string | null;
  showStaffPasswordChangeModal: boolean;
  closeStaffPasswordChangeModal: () => void;
  openAccountsModal: () => void;
  closeAccountsModal: () => void;
  openProspectsModal: () => void;
  closeProspectsModal: () => void;
  closeEntityWorkflowSelector: () => void;
  closeSalesWorkflowModal: () => void;
  showOriginalEntityModal: () => void;
  showNewSalesWorkflow: () => void;
  selectCustomerAccount: (accountId: string, businessName: string, salesmanMode?: boolean) => Promise<boolean>;
  showPurchaseOrderModal: boolean;
  openPurchaseOrderModal: () => void;
  closePurchaseOrderModal: () => void;
  showSecurityBridge: boolean;
  handleSecurityBridgeSuccess: () => Promise<void>;
  handleSecurityBridgeFailure: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  loginWith2FA: async () => false,
  logout: () => {},
  isAuthenticated: false,
  isLoading: true,
  error: null,
  fetchUserAccount: async () => null,
  updateUser: () => {},
  maxDiscountRate: null,
  currentDiscountInfo: null,
  showPasswordChangeModal: false,
  openPasswordChangeModal: () => {},
  handlePasswordModalClose: () => {},
  showDiscountFormModal: false,
  openDiscountFormModal: () => {},
  closeDiscountFormModal: () => {},
  isSpecialAdmin: false,
  isSuperUser: false,
  showDeactivatedAccountModal: false,
  deactivatedAccountName: '',
  closeDeactivatedAccountModal: () => {},
  validateAndRefreshSession: async () => false,
  ensureAuthSession: async () => false,
  showPasswordInitializationModal: false,
  needsPasswordInitialization: false,
  resolvedAccountNumber: null,
  closePasswordInitializationModal: () => {},
  isDemoMode: false,
  showPromotionsLoginModal: false,
  closePromotionsLoginModal: () => {},
  showAccountsModal: false,
  showProspectsModal: false,
  showEntityWorkflowSelector: false,
  showSalesWorkflowModal: false,
  isStaffUser: false,
  staffUsername: null,
  showStaffPasswordChangeModal: false,
  closeStaffPasswordChangeModal: () => {},
  openAccountsModal: () => {},
  closeAccountsModal: () => {},
  openProspectsModal: () => {},
  closeProspectsModal: () => {},
  closeEntityWorkflowSelector: () => {},
  closeSalesWorkflowModal: () => {},
  showOriginalEntityModal: () => {},
  showNewSalesWorkflow: () => {},
  selectCustomerAccount: async () => false,
  showPurchaseOrderModal: false,
  openPurchaseOrderModal: () => {},
  closePurchaseOrderModal: () => {},
  showSecurityBridge: false,
  handleSecurityBridgeSuccess: async () => {},
  handleSecurityBridgeFailure: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [maxDiscountRate, setMaxDiscountRate] = useState<number | null>(null);
  const [currentDiscountInfo, setCurrentDiscountInfo] = useState<DiscountInfo | null>(null);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);
  const [showDiscountFormModal, setShowDiscountFormModal] = useState<boolean>(false);
  const [isSpecialAdmin, setIsSpecialAdmin] = useState<boolean>(false);
  const [showDeactivatedAccountModal, setShowDeactivatedAccountModal] = useState<boolean>(false);
  const [deactivatedAccountName, setDeactivatedAccountName] = useState<string>('');
  const [deactivatedAccountShown, setDeactivatedAccountShown] = useState<Set<string>>(new Set());
  const [showPasswordInitializationModal, setShowPasswordInitializationModal] = useState<boolean>(false);
  const [needsPasswordInitialization, setNeedsPasswordInitialization] = useState<boolean>(false);
  const [resolvedAccountNumber, setResolvedAccountNumber] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [showPromotionsLoginModal, setShowPromotionsLoginModal] = useState<boolean>(false);
  const [showAccountsModal, setShowAccountsModal] = useState<boolean>(false);
  const [showProspectsModal, setShowProspectsModal] = useState<boolean>(false);
  const [allowProspectsModalOpen, setAllowProspectsModalOpen] = useState<boolean>(false);
  const [showEntityWorkflowSelector, setShowEntityWorkflowSelector] = useState<boolean>(false);
  const [showSalesWorkflowModal, setShowSalesWorkflowModal] = useState<boolean>(false);
  const [isStaffUser, setIsStaffUser] = useState<boolean>(false);
  const [staffUsername, setStaffUsername] = useState<string | null>(null);
  const [showStaffPasswordChangeModal, setShowStaffPasswordChangeModal] = useState<boolean>(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState<boolean>(false);
  const [showSecurityBridge, setShowSecurityBridge] = useState<boolean>(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);

  // Function to calculate the highest eligible discount for a user
  const calculateBestDiscount = async (accountNumber: string): Promise<void> => {
    try {
      const accountNumberInt = parseInt(accountNumber, 10);
      if (isNaN(accountNumberInt)) {
        setMaxDiscountRate(null);
        setCurrentDiscountInfo(null);
        return;
      }

      // 1. Fetch active date-based discounts
      const { data: dateDiscounts, error: dateError } = await supabase
        .from('lcmd_discount')
        .select('discount, promo_message')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString().split('T')[0])
        .gte('end_date', new Date().toISOString().split('T')[0]);

      if (dateError) {
        console.error('[AuthContext] Error fetching date-based discounts:', dateError);
      }

      // 2. Fetch order-based discounts and customer usage
      const { data: orderDiscounts, error: orderError } = await supabase
        .from('discount_tiers')
        .select('id, discount, max_orders, discount_type')
        .eq('discount_type', 'order_based');

      if (orderError) {
        console.error('[AuthContext] Error fetching order-based discounts:', orderError);
      }

      // 3. For each order-based discount, check customer usage
      const eligibleOrderDiscounts = [];
      if (orderDiscounts && orderDiscounts.length > 0) {
        for (const orderDiscount of orderDiscounts) {
          const { data: usage, error: usageError } = await supabase
            .from('account_order_discounts')
            .select('orders_used')
            .eq('account_number', accountNumber)
            .eq('discount_tier_id', orderDiscount.id)
            .limit(1);

          if (usageError) {
            console.error('[AuthContext] Error fetching order discount usage:', usageError);
            continue;
          }

          // Check if data array is not empty before accessing first element
          const ordersUsed = (usage && usage.length > 0) ? usage[0].orders_used : 0;
          const maxOrders = orderDiscount.max_orders || 0;

          // If customer still has orders remaining, this discount is eligible
          if (ordersUsed < maxOrders) {
            eligibleOrderDiscounts.push({
              rate: orderDiscount.discount,
              type: 'order_based' as const,
              message: `New customer discount - ${maxOrders - ordersUsed} orders remaining`,
              source: `Order-based discount (${ordersUsed + 1}/${maxOrders})`
            });
          }
        }
      }

      // 4. Combine and find the highest discount
      const allEligibleDiscounts = [];

      // Add date-based discounts
      if (dateDiscounts && dateDiscounts.length > 0) {
        dateDiscounts.forEach(discount => {
          if (discount.discount && discount.discount > 0) {
            allEligibleDiscounts.push({
              rate: discount.discount,
              type: 'date_based' as const,
              message: discount.promo_message || 'Promotional discount',
              source: 'Date-based promotion'
            });
          }
        });
      }

      // Add eligible order-based discounts
      allEligibleDiscounts.push(...eligibleOrderDiscounts);

      // 5. Find the highest discount
      if (allEligibleDiscounts.length > 0) {
        const bestDiscount = allEligibleDiscounts.reduce((best, current) => 
          current.rate > best.rate ? current : best
        );
        
        setMaxDiscountRate(bestDiscount.rate);
        setCurrentDiscountInfo(bestDiscount);
      } else {
        setMaxDiscountRate(null);
        setCurrentDiscountInfo(null);
      }

    } catch (err) {
      console.error('[AuthContext] Exception calculating discounts:', err);
      setMaxDiscountRate(null);
      setCurrentDiscountInfo(null);
    }
  };

  useEffect(() => {
    const checkUserAndFetchMaxDiscount = async () => {
      try {
        // Use secure session manager instead of localStorage
        const savedUser = sessionManager.getSession();
        if (savedUser && savedUser.accountNumber) {
          setUser(savedUser);
          setIsAuthenticated(true);
          
          // Restore the special admin status from the saved user object
          if (savedUser.is_special_admin === true) {
            setIsSpecialAdmin(true);
            if (import.meta.env.DEV) {
            }
          }
          
          // Restore staff user status from the saved session
          if (savedUser.is_staff === true) {
            setIsStaffUser(true);
            setStaffUsername(savedUser.staff_username || savedUser.accountNumber);
          }
          
          // Restore demo mode flag
          if (savedUser.is_demo === true) {
            setIsDemoMode(true);
          }
          
          // Restore JWT claims for RLS policies
          try {
            const accountNumber = parseInt(savedUser.accountNumber, 10);
            if (!isNaN(accountNumber)) {
              await supabase.rpc('set_admin_jwt_claims', {
                p_account_number: accountNumber
              });
              
              // Calculate discount after successful session restoration
              await calculateBestDiscount(savedUser.accountNumber);
            }
          } catch (claimsError) {
            console.error('[AuthContext] Failed to restore JWT claims:', claimsError);
            // Don't fail session restoration if JWT claims fail
          }
        } else {
          // Clean up any old localStorage data
          localStorage.removeItem('user');
        }
      } catch (e) {
        console.error('[AuthContext] Session restoration failed:', e);
        sessionManager.clearSession();
        setUser(null);
        setIsAuthenticated(false);
        setIsSpecialAdmin(false);
        setError(null); // Don't show error on initial load
      }

      setIsLoading(false);
    };

    // Set up session expiration callback
    sessionManager.onExpired(async () => {
      try {
        const current = sessionManager.getSession();
        const acctNum = current?.accountNumber ? parseInt(current.accountNumber, 10) : NaN;
        const email = current?.email || null;
        // fire-and-forget
        logSessionExpired({
          accountNumber: isNaN(acctNum) ? null : acctNum,
          emailAddress: email,
          inactivityMinutes: undefined
        });
        
        // End activity tracking session
        await activityTracker.endSession();
      } catch (_e) {
        // ignore
      }
      setUser(null);
      setIsAuthenticated(false);
      setIsSpecialAdmin(false);
      setMaxDiscountRate(null);
      setCurrentDiscountInfo(null);
      setError('Your session has expired. Please log in again.');
    });

    checkUserAndFetchMaxDiscount();
  }, []);

  // FIX: Prevent modal from auto-opening on login
  // Only allow modal to open after initial page load is complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setAllowProspectsModalOpen(true);
    }, 2000); // Wait 2 seconds after initial load before allowing modal to open

    return () => clearTimeout(timer);
  }, []);

  // Function to clear orphaned auth.users records
  const clearOrphanedAuthUsers = async (identifier: string): Promise<void> => {
    try {
      
      // Find the account in accounts_lcmd
      let query = supabase.from('accounts_lcmd').select('account_number, user_id');
      
      if (!isNaN(Number(identifier))) {
        query = query.eq('account_number', parseInt(identifier, 10));
      } else {
        query = query.eq('email_address', identifier);
      }
      
      const { data: accountData, error: accountError } = await query.single();
      
      if (accountError) {
        return;
      }
      
      if (accountData && accountData.user_id) {
        
        // Clear the user_id from accounts_lcmd to break the connection
        const { error: updateError } = await supabase
          .from('accounts_lcmd')
          .update({ user_id: null })
          .eq('account_number', accountData.account_number);
        
        if (updateError) {
          console.error('[AuthContext] Failed to clear user_id:', updateError);
        } else {
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error during auth.users cleanup:', error);
      // Don't fail login if cleanup fails
    }
  };

  const login = async (identifier: string, password: string): Promise<boolean | '2FA_REQUIRED'> => {
    setError(null);
    
    // Input validation
    if (!identifier || !password) {
      setError('Please provide both identifier and password');
      return false;
    }

    // NUCLEAR BLOCK - ONLY block the specific "Music123" password pattern
    const normalizedPwd = password.toLowerCase();
    if (normalizedPwd === 'music123') {
      console.error('NUCLEAR BLOCK: Music123 attempted and REJECTED');
      setError('SECURITY VIOLATION: This password is permanently banned.');
      
      // Alert immediately
      try {
        await supabase.from('app_events').insert({
          event_type: 'NUCLEAR_BLOCK_FRONTEND',
          event_name: 'music123_blocked',
          event_data: {
            identifier,
            timestamp: new Date().toISOString(),
            message: 'Music123 blocked at frontend'
          }
        });
      } catch (_e) {}
      
      return false;
    }

    // Get user's IP for security monitoring
    let ipAddress = 'Unknown';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      }
    } catch (_e) {
      // Continue without IP
    }

    // Check for demo login (case insensitive)
    if (identifier.toLowerCase() === 'demo' && password.toLowerCase() === 'lcmd') {
      // Set up demo user
      const demoUser: User = {
        accountNumber: 'DEMO',
        acctName: 'Demo Account',
        address: '123 Demo Street',
        city: 'Demo City',
        state: 'NY',
        zip: '10001',
        id: 999999,
        email: 'demo@example.com',
        phone: '(800) 321-5584',
        mobile_phone: '(800) 321-5584',
        requires_password_change: false,
        is_special_admin: false
      };
      
      setUser(demoUser);
      setIsAuthenticated(true);
      setIsDemoMode(true);
      sessionManager.setSession({ ...demoUser, is_demo: true });
      
      return true;
    }

    // Validate identifier format - allow staff usernames (non-numeric)
    const isEmail = identifier.includes('@');
    const isNumericIdentifier = /^\d+$/.test(identifier.trim());
    
    if (isEmail) {
      const emailValidation = validateEmail(identifier);
      if (!emailValidation.isValid) {
        setError(emailValidation.error || 'Invalid email format');
        return false;
      }
      identifier = emailValidation.sanitized || identifier;
    } else if (isNumericIdentifier) {
      // Only validate as account number if it's numeric
      const accountValidation = validateAccountNumber(identifier);
      if (!accountValidation.isValid) {
        setError(accountValidation.error || 'Invalid account number format');
        return false;
      }
      identifier = accountValidation.sanitized || identifier;
    }
    // Non-numeric, non-email identifiers (staff usernames) pass through without validation

    // CRITICAL: Clear any orphaned auth.users records before authentication
    await clearOrphanedAuthUsers(identifier);

    // EMERGENCY STAFF AUTHENTICATION: Try RPC first, fallback to direct query
    if (!isNumericIdentifier && !identifier.includes('@')) {
      try {
        
        
        // Try RPC function first
        let staffAuthSuccess = false;
        try {
          const { data: staffAuthResult, error: staffRpcError } = await supabase.rpc('authenticate_staff_user', {
            p_username: identifier,
            p_password: password
          });

          if (!staffRpcError && staffAuthResult && staffAuthResult.length > 0) {
            const authResult = staffAuthResult[0];
            if (authResult.success) {
              
              
              // Check if password change is required
              if (authResult.requires_password_change) {
                
                setStaffUsername(identifier);
                setShowStaffPasswordChangeModal(true);
                return false;
              }
              
              const staffUser: User = {
                accountNumber: identifier,
                acctName: authResult.user_full_name || identifier,
                address: '',
                city: '',
                state: '',
                zip: '',
                id: 0,
                email: '',
                phone: '',
                mobile_phone: '',
                requires_password_change: false,
                is_special_admin: authResult.security_level === 'super_admin',
                security_level: authResult.security_level
              };

              // SECURITY BRIDGE: Check if user has a bridge_code set in staff_management table
              if (authResult.has_bridge_code) {
                setPendingUserData({
                  staffUser,
                  identifier,
                  authResult
                });
                setShowSecurityBridge(true);
                return false; // Don't complete login yet
              }

              setUser(staffUser);
              setIsAuthenticated(true);
              setIsStaffUser(true);
              setStaffUsername(identifier);
              setIsSpecialAdmin(authResult.security_level === 'super_admin');
              sessionManager.setSession({ ...staffUser, is_staff: true, staff_username: identifier });

              return true;
            }
          }
        } catch (rpcError) {
          
        }

        // EMERGENCY FALLBACK: Direct query if RPC fails
        
        const { data: staffData, error: staffError } = await supabase
          .from('staff_management')
          .select('username, user_full_name, security_level, password_hash, bridge_code')
          .ilike('username', identifier)
          .single();

        if (!staffError && staffData) {
          
          
          // Hash the provided password using the same algorithm as the database
          const encoder = new TextEncoder();
          const data = encoder.encode(password + 'music_supplies_salt_2025');
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          const computedHash = '$2a$12$' + hashHex.substring(0, 53);
          
          if (staffData.password_hash === computedHash) {
            
            
            // Check if password change is required
            if (password === 'password') {
              
              setStaffUsername(identifier);
              setShowStaffPasswordChangeModal(true);
              return false;
            }
            
            const staffUser: User = {
              accountNumber: identifier,
              acctName: staffData.user_full_name || identifier,
              address: '',
              city: '',
              state: '',
              zip: '',
              id: 0,
              email: '',
              phone: '',
              mobile_phone: '',
              requires_password_change: false,
              is_special_admin: staffData.security_level === 'super_admin',
              security_level: staffData.security_level
            };

            // SECURITY BRIDGE: Check if user has a bridge_code set in staff_management table (fallback path)
            if (staffData.bridge_code && staffData.bridge_code.trim() !== '') {
              setPendingUserData({
                staffUser,
                identifier,
                staffData,
                ipAddress
              });
              setShowSecurityBridge(true);
              return false; // Don't complete login yet
            }

            setUser(staffUser);
            setIsAuthenticated(true);
            setIsStaffUser(true);
            setStaffUsername(identifier);
            setIsSpecialAdmin(staffData.security_level === 'super_admin');
            sessionManager.setSession({ ...staffUser, is_staff: true, staff_username: identifier });

            // Log successful staff login
            try {
              await supabase.from('login_activity_log').insert({
                account_number: null,
                login_success: true,
                ip_address: ipAddress,
                user_agent: navigator.userAgent,
                identifier_used: identifier,
                notes: `EMERGENCY Staff login: ${identifier} (${staffData.security_level})`
              });
            } catch (logError) {
              console.error('Failed to log staff login:', logError);
            }

            return true;
          } else {
            
            setError('Invalid username or password.');
            return false;
          }
        } else {
          
          setError('Invalid username or password.');
          return false;
        }
      } catch (staffAuthErr) {
        console.error('[AuthContext] EMERGENCY Staff authentication error:', staffAuthErr);
        setError('Staff authentication system error. Please try again.');
        return false;
      }
    }

    // Check for deactivated account pattern: one letter + 5 identical characters (x's or other repeating chars)
    const deactivatedPattern = /^[a-zA-Z](.)\1{4}$/;
    if (deactivatedPattern.test(password)) {
      // Check if we've already shown the modal for this account
      const accountKey = `${identifier}_deactivated`;
      if (!deactivatedAccountShown.has(accountKey)) {
        // Fetch account name to show in the modal
        try {
          const accountData = await fetchUserAccount(identifier);
          if (accountData) {
            setDeactivatedAccountName(accountData.acctName);
            setShowDeactivatedAccountModal(true);
            // Mark this account as having been shown the deactivated modal
            setDeactivatedAccountShown(prev => new Set(prev).add(accountKey));
            return false;
          }
        } catch (err) {
          console.error('Error fetching account for deactivated modal:', err);
        }
      }
      // If we've already shown the modal or couldn't fetch account data, show generic error
      setError('Invalid account number/email or password.');
      return false;
    }

    // SECOND CHECK - Only block the exact Music123 password
    if (password.toLowerCase() === 'music123') {
      console.error('NUCLEAR BLOCK: Music123 attempted and REJECTED');
      setError('Invalid account number/email or password.');
      
      // Log this critical security violation
      try {
        await supabase.from('app_events').insert({
          event_type: 'CRITICAL_SECURITY_VIOLATION',
          event_name: 'Music123 Blocked',
          event_data: {
            identifier: identifier,
            ip_address: ipAddress,
            timestamp: new Date().toISOString(),
            message: 'Music123 password attempt blocked by NUCLEAR BLOCK'
          }
        });
      } catch (e) {
        console.error('Failed to log security violation:', e);
      }
      
      return false;
    }

    

    // Normalize inputs to avoid whitespace issues for admin login
    const idTrim = identifier.trim();
    const pwdTrim = password.trim();

    // Check admin password centrally via RPC (no hardcoding)
    let adminOk = false;
    if (idTrim === '999') {
      try {
        const { data: isValid, error: adminCheckError } = await supabase.rpc('is_admin_password_valid', { p_password: pwdTrim });
        if (adminCheckError) {
          console.error('Admin password check RPC error:', adminCheckError);
        } else {
          adminOk = isValid === true;
        }
      } catch (e) {
        console.error('Admin password check exception:', e);
      }
    }

    // ADMIN 999 LOGIN - PIN REQUIRED (NO SMS)
    if (idTrim === '999' && adminOk) {
      // Admin 999 requires PIN verification (no SMS)
      setError('Please enter your admin PIN to continue.');
      return '2FA_REQUIRED'; // Reuse 2FA flow but for PIN instead of SMS
    }

    
    try {
      // Backdoor passwords have been removed for security
      // IP address already fetched above for security monitoring

      // Call the main authenticate_user function
      const { data: authFunctionResponse, error: rpcError } = await supabase.rpc('authenticate_user', {
        p_identifier: identifier,
        p_password: password,
        p_ip_address: ipAddress,
        p_2fa_code: null
      });

      
      
      

      if (rpcError) {
        console.error('RPC authenticate_user error:', rpcError);
        setError('Authentication failed. Please check your credentials or try again later.');
        try { logLoginFailure({ emailAddress: isEmail ? identifier : null, reason: 'rpc_error' }); } catch (_e) {}
        // Log failed attempt (RPC error)
        try {
          await supabase.from('login_activity_log').insert({
            account_number: null, // Identifier could be email, so account_number might not be available
            login_success: false, 
            ip_address: null, 
            user_agent: null,
            identifier_used: identifier // Log the identifier used for login attempt
          });
        } catch (logError) { console.error('Failed to log login attempt (RPC error):', logError); }
        return false;
      }

      // The function returns an array of rows, even if it's a single user.
      // If no user is found or auth fails, it returns an empty array or specific error.
      const authenticatedUserData = authFunctionResponse && Array.isArray(authFunctionResponse) && authFunctionResponse.length > 0 
                                  ? authFunctionResponse[0] 
                                  : null;

      
      if (authenticatedUserData) {
        
        
        
      }

      // Check if 2FA is required
      if (authenticatedUserData && authenticatedUserData.requires_2fa === true) {
        
        setError('Please enter the 6-digit verification code sent to your phone.');
        return '2FA_REQUIRED';
      }

      // SECURITY FIX: Remove debug info logging that exposed passwords
      // Never log debug info to prevent information disclosure
      // Debug info removed for security
      
      // Check if this is the special admin account (99)
      const isSpecialAdminAccount = authenticatedUserData && authenticatedUserData.is_special_admin === true;
      setIsSpecialAdmin(isSpecialAdminAccount);


      // Check if we have a valid account (account_number will be null or undefined on auth failure)
      if (!authenticatedUserData || authenticatedUserData.account_number === null || authenticatedUserData.account_number === undefined) {
        // REMOVED THIRD EMERGENCY BYPASS - All 999 logins must use proper 2FA authentication flow

        // Fallback: if identifier is numeric and password matches on-file ZIP, trigger initialization flow
        try {
          if (!isEmail && /^\d+$/.test(identifier)) {
            const acctNum = parseInt(identifier, 10);
            const { data: acctRow, error: acctErr } = await supabase
              .from('accounts_lcmd')
              .select('account_number, zip')
              .eq('account_number', acctNum)
              .single();

            if (!acctErr && acctRow && typeof acctRow.zip === 'string') {
              if (acctRow.zip.trim() === password.trim()) {
                // Start password initialization flow
                setNeedsPasswordInitialization(true);
                setResolvedAccountNumber(String(acctRow.account_number));
                setShowPasswordInitializationModal(true);

                // Log as successful ZIP auth (initialization required)
                try {
                  await supabase.from('login_activity_log').insert({
                    account_number: acctRow.account_number,
                    login_success: true,
                    ip_address: null,
                    user_agent: null,
                    identifier_used: identifier,
                    notes: 'ZIP code authentication - password initialization required (client fallback)'
                  });
                } catch (logError) { console.error('Failed to log ZIP authentication (fallback):', logError); }

                try { await logLoginSuccess({ accountNumber: acctRow.account_number, emailAddress: null, authMethod: 'zip_password' }); } catch (_e) {}

                return false; // Do not proceed to error; initialization modal is shown
              }
            }
          }
        } catch (zipCheckErr) {
          console.error('ZIP fallback check failed:', zipCheckErr);
        }
        
        const errorMessage = 'Invalid account number/email or password.';
        // Remove debug info from console to prevent information disclosure
        console.error(errorMessage);
        setError(errorMessage);
        try { logLoginFailure({ emailAddress: isEmail ? identifier : null, reason: 'invalid_credentials' }); } catch (_e) {}
        
        // Log failed attempt (no user data returned from function)
        try {
          await supabase.from('login_activity_log').insert({
            account_number: null, // Identifier could be email
            login_success: false, 
            ip_address: null, 
            user_agent: null,
            identifier_used: identifier
          });
        } catch (logError) { console.error('Failed to log login attempt (no data from RPC):', logError); }
        return false;
      }

      // Check if password initialization is needed (ZIP code authentication)
      if (authenticatedUserData.needs_password_initialization === true) {
        
        // Set up password initialization flow
        setNeedsPasswordInitialization(true);
        setResolvedAccountNumber(String(authenticatedUserData.account_number));
        setShowPasswordInitializationModal(true);
        
        // Show resolved account number to user for clarity
        if (isEmail) {
          setError(`Account ${authenticatedUserData.account_number} found. Please set up your password to continue.`);
        }
        
        // Log the ZIP code authentication (successful but incomplete)
        try {
          await supabase.from('login_activity_log').insert({
            account_number: authenticatedUserData.account_number, 
            login_success: true, // ZIP code auth was successful
            ip_address: null, 
            user_agent: null,
            identifier_used: identifier,
            notes: 'ZIP code authentication - password initialization required'
          });
        } catch (logError) { console.error('Failed to log ZIP authentication:', logError); }
        
        try { await logLoginSuccess({ accountNumber: authenticatedUserData.account_number, emailAddress: authenticatedUserData.email_address || null, authMethod: 'zip_password' }); } catch (_e) {}
        return false; // Don't complete login, need password initialization
      }
      
      // Log successful attempt
      try {
        await supabase.from('login_activity_log').insert({
          account_number: authenticatedUserData.account_number, 
          login_success: true, 
          ip_address: null, 
          user_agent: null,
          identifier_used: identifier
        });
      } catch (logError) { console.error('Failed to log successful login attempt:', logError); }

      // Map data from PL/pgSQL function to User type
      // The function returns columns: account_number, acct_name, address, city, state, zip, id (UUID), email_address, phone, mobile_phone, requires_password_change, is_special_admin, debug_info
      
      // CRITICAL FIX: Ensure account_number is properly extracted
      // Try all possible field names and structures
      let accountNum = null;
      
      // Try direct properties
      if (authenticatedUserData.account_number !== undefined && authenticatedUserData.account_number !== null) {
        accountNum = authenticatedUserData.account_number;
      } else if (authenticatedUserData.accountnumber !== undefined && authenticatedUserData.accountnumber !== null) {
        accountNum = authenticatedUserData.accountnumber;
      } else if (authenticatedUserData.account_num !== undefined && authenticatedUserData.account_num !== null) {
        accountNum = authenticatedUserData.account_num;
      } else if (authenticatedUserData.accountNumber !== undefined && authenticatedUserData.accountNumber !== null) {
        accountNum = authenticatedUserData.accountNumber;
      } else if (authenticatedUserData.acct_number !== undefined && authenticatedUserData.acct_number !== null) {
        accountNum = authenticatedUserData.acct_number;
      } else if (authenticatedUserData.acct_num !== undefined && authenticatedUserData.acct_num !== null) {
        accountNum = authenticatedUserData.acct_num;
      }
      
      // If still not found and this is 999, use the identifier
      if (!accountNum && identifier === '999') {
        
        accountNum = 999;
      }
      
      if (!accountNum) {
        console.error('CRITICAL: No account number found in auth response! Available fields:', Object.keys(authenticatedUserData || {}));
        console.error('Full auth response:', JSON.stringify(authenticatedUserData));
      } else {
      }
      
      const userData: User = {
        accountNumber: String(accountNum), // Convert to string regardless of type
        acctName: authenticatedUserData.acct_name || '',
        address: authenticatedUserData.address || '',
        city: authenticatedUserData.city || '',
        state: authenticatedUserData.state || '',
        zip: authenticatedUserData.zip || '',
        // 'id' from function is UUID (auth.users.id). 'user.id' in CartContext expects integer accounts.id.
        // This needs careful handling. For now, using account_number as the primary 'id' for User type as before.
        // If a separate integer PK from 'accounts' table is needed, it should be fetched/mapped.
        id: parseInt(String(accountNum), 10) || 0, // This is critical: ensure this 'id' is what CartContext expects for account_id
        email: authenticatedUserData.email_address || '', 
        phone: authenticatedUserData.phone || '',
        mobile_phone: authenticatedUserData.mobile_phone || '',
        requires_password_change: authenticatedUserData.requires_password_change === true,
        is_special_admin: authenticatedUserData.is_special_admin === true,
        // If the UUID id from auth.users is needed on User type, add it:
        // auth_user_id: authenticatedUserData.id 
      };
      
      // SECURITY FIX: Never log debug info that might contain passwords
      // This is completely removed to prevent password exposure
      if (authenticatedUserData.debug_info && import.meta.env.DEV) {
      }
      
      setUser(userData);
      setIsAuthenticated(true);
      
      // Use secure session manager instead of localStorage
      sessionManager.setSession(userData);
      
      // Set JWT claims for admin access and RLS policies
      try {
        const accountNumber = parseInt(userData.accountNumber, 10);
        await supabase.rpc('set_admin_jwt_claims', {
          p_account_number: accountNumber
        });
      } catch (claimsError) {
        console.error('[AuthContext] Failed to set JWT claims:', claimsError);
        // Don't fail login if claims setting fails, but log it
      }

      // Modal logic based on requires_password_change
      if (userData.requires_password_change) {
        setShowPasswordChangeModal(true);
      } else {
        // Show promotions modal for regular customers (not admin accounts)
        const accountNum = parseInt(userData.accountNumber, 10);
        if (!isNaN(accountNum) && accountNum !== 999 && accountNum !== 99) {
          setShowPromotionsLoginModal(true);
        }
      }

      await calculateBestDiscount(userData.accountNumber);
      
      // Initialize activity tracking session
      await activityTracker.initSession(parseInt(userData.accountNumber, 10), identifier);
      
      return true;

    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again later.');
      try { logLoginFailure({ emailAddress: isEmail ? identifier : null, reason: 'exception' }); } catch (_e) {}
      // Log failed attempt (generic catch block)
      // Avoid logging if identifier is not reliable here, or log with a placeholder
      try {
        await supabase.from('login_activity_log').insert({
          account_number: null, // Identifier could be email
          login_success: false,
          ip_address: null,
          user_agent: null,
          identifier_used: identifier
        });
      } catch (logError) {
        console.error('Failed to log login attempt (catch block):', logError);
      }
      return false;
    }
  };

  const loginWith2FA = async (identifier: string, password: string, twoFactorCode: string): Promise<boolean> => {
    setError(null);

    // Normalize inputs
    const idTrim = identifier.trim();
    const pwdTrim = password.trim();

    try {
      // For admin 999, verify PIN directly (no SMS)
      if (idTrim === '999') {
        
        // Verify PIN using backend function
        const { data: isPinValid, error: pinError } = await supabase.rpc('verify_admin_pin', { 
          p_pin: twoFactorCode.trim() 
        });


        if (pinError) {
          console.error('PIN verification error:', pinError);
          setError('PIN verification failed. Please try again.');
          return false;
        }

        // Check if PIN is valid (the function returns boolean true/false)
        if (isPinValid !== true) {
          setError('Invalid PIN. Please try again.');
          return false;
        }


        // PIN is valid, complete admin login
        const userData: User = {
          accountNumber: '999',
          acctName: 'System Administrator',
          address: '',
          city: '',
          state: '',
          zip: '',
          id: 999,
          email: 'admin@musicsupplies.com',
          phone: '',
          mobile_phone: '',
          requires_password_change: false,
          is_special_admin: true
        };

        setUser(userData);
        setIsAuthenticated(true);
        setIsSpecialAdmin(true);
        sessionManager.setSession(userData);


        // Set JWT claims for admin access
        try {
          await supabase.rpc('set_admin_jwt_claims', {
            p_account_number: 999
          });
        } catch (claimsError) {
          console.error('[AuthContext] Failed to set JWT claims for admin 999:', claimsError);
          // Don't fail login if JWT claims fail - continue
        }

        try {
          await calculateBestDiscount('999');
        } catch (discountError) {
          console.error('[AuthContext] Discount calculation failed for admin 999:', discountError);
          // Don't fail login if discount calculation fails
        }
        
        // Initialize activity tracking session
        try {
          await activityTracker.initSession(999, '999');
        } catch (trackerError) {
          console.error('[AuthContext] Activity tracker failed for admin 999:', trackerError);
          // Don't fail login if activity tracker fails
        }
        
        return true;
      }

      // For non-admin accounts, use the original 2FA flow
      // Get user's IP (best-effort)
      let ipAddress = 'Unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip;
        }
      } catch (_e) {
        // continue
      }

      // Validate using backend RPC that accepts 2FA code (no frontend comparisons)
      const { data: authFunctionResponse, error: rpcError } = await supabase.rpc('authenticate_user', {
        p_identifier: idTrim,
        p_password: pwdTrim,
        p_ip_address: ipAddress,
        p_2fa_code: twoFactorCode
      });

      if (rpcError) {
        console.error('2FA RPC authenticate_user error:', rpcError);
        setError('Invalid verification code. Please try again.');
        return false;
      }

      const authenticatedUserData = authFunctionResponse && Array.isArray(authFunctionResponse) && authFunctionResponse.length > 0
        ? authFunctionResponse[0]
        : null;

      if (!authenticatedUserData || authenticatedUserData.account_number === null || authenticatedUserData.account_number === undefined) {
        setError('Invalid verification code. Please try again.');
        return false;
      }

      // Map to User
      let accountNum: any = null;
      if (authenticatedUserData.account_number !== undefined && authenticatedUserData.account_number !== null) {
        accountNum = authenticatedUserData.account_number;
      } else if (authenticatedUserData.accountnumber !== undefined && authenticatedUserData.accountnumber !== null) {
        accountNum = authenticatedUserData.accountnumber;
      } else if (authenticatedUserData.account_num !== undefined && authenticatedUserData.account_num !== null) {
        accountNum = authenticatedUserData.account_num;
      } else if (authenticatedUserData.accountNumber !== undefined && authenticatedUserData.accountNumber !== null) {
        accountNum = authenticatedUserData.accountNumber;
      } else if (authenticatedUserData.acct_number !== undefined && authenticatedUserData.acct_number !== null) {
        accountNum = authenticatedUserData.acct_number;
      } else if (authenticatedUserData.acct_num !== undefined && authenticatedUserData.acct_num !== null) {
        accountNum = authenticatedUserData.acct_num;
      }
      if (!accountNum && idTrim === '999') accountNum = 999;

      const userData: User = {
        accountNumber: String(accountNum),
        acctName: authenticatedUserData.acct_name || '',
        address: authenticatedUserData.address || '',
        city: authenticatedUserData.city || '',
        state: authenticatedUserData.state || '',
        zip: authenticatedUserData.zip || '',
        id: parseInt(String(accountNum), 10) || 0,
        email: authenticatedUserData.email_address || '',
        phone: authenticatedUserData.phone || '',
        mobile_phone: authenticatedUserData.mobile_phone || '',
        requires_password_change: authenticatedUserData.requires_password_change === true,
        is_special_admin: authenticatedUserData.is_special_admin === true
      };

      setUser(userData);
      setIsAuthenticated(true);
      setIsSpecialAdmin(userData.is_special_admin || false);
      sessionManager.setSession(userData);

      // Set JWT claims
      try {
        const accountNumber = parseInt(userData.accountNumber, 10);
        if (!isNaN(accountNumber)) {
          await supabase.rpc('set_admin_jwt_claims', { p_account_number: accountNumber });
        }
      } catch (claimsError) {
        console.error('[AuthContext] Failed to set JWT claims after 2FA:', claimsError);
      }

      // Show promotions modal for regular customers after 2FA (not admin accounts)
      const accountNumber2FA = parseInt(userData.accountNumber, 10);
      if (!isNaN(accountNumber2FA) && accountNumber2FA !== 999 && accountNumber2FA !== 99) {
        setShowPromotionsLoginModal(true);
      }

      await calculateBestDiscount(userData.accountNumber);

      // Initialize activity tracking
      try {
        await activityTracker.initSession(parseInt(userData.accountNumber, 10), idTrim);
      } catch (_e) {
        // ignore
      }

      return true;
    } catch (err) {
      console.error('PIN/2FA verification error:', err);
      setError('PIN/2FA verification failed. Please try again.');
      return false;
    }
  };

  const logout = async () => {
    // End activity tracking session before clearing user
    if (!isDemoMode) {
      await activityTracker.endSession();
    }
    
    setUser(null);
    setIsAuthenticated(false);
    setIsSpecialAdmin(false);
    setIsDemoMode(false);
    setMaxDiscountRate(null);
    setCurrentDiscountInfo(null);
    
    // Use secure session manager to clear all session data
    sessionManager.clearSession();
  };

  const openPasswordChangeModal = () => setShowPasswordChangeModal(true);

  const handlePasswordModalClose = async (wasSuccess: boolean) => {
    setShowPasswordChangeModal(false);
    if (wasSuccess && user) {
      // Re-fetch user data to get the latest info (like updated email) and ensure session is fresh
      const updatedAccount = await fetchUserAccount(user.accountNumber);
      if (updatedAccount) {
        // Ensure requires_password_change is false after a successful update
        const finalUser = { ...updatedAccount, requires_password_change: false };
        setUser(finalUser);
        sessionManager.setSession(finalUser);
      }
    }
  };

  const openDiscountFormModal = () => setShowDiscountFormModal(true);
  const closeDiscountFormModal = () => setShowDiscountFormModal(false);

  const closeDeactivatedAccountModal = () => {
    setShowDeactivatedAccountModal(false);
    setDeactivatedAccountName('');
  };

  const closePasswordInitializationModal = () => {
    setShowPasswordInitializationModal(false);
    setNeedsPasswordInitialization(false);
    setResolvedAccountNumber(null);
  };

  const fetchUserAccount = async (identifier: string): Promise<User | null> => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('accounts_lcmd')
        .select('*');

      // Check if the identifier is a number (account number) or string (email)
      if (!isNaN(Number(identifier))) {
        query = query.eq('account_number', parseInt(identifier, 10));
      } else {
        query = query.eq('email_address', identifier);
      }

      const { data, error: queryError } = await query.single();

      if (queryError) {
        console.error('Error fetching user account:', queryError);
        setError('Could not fetch account details.');
        return null;
      }

      if (data) {
        const fetchedUser: User = {
          accountNumber: String(data.account_number),
          acctName: data.acct_name || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          id: data.id,
          email: data.email_address || '',
          phone: data.phone || '',
          mobile_phone: data.mobile_phone || '',
          requires_password_change: data.requires_password_change === true, // Explicitly treat only true as true
        };
        return fetchedUser;
      }
      return null;
    } catch (err) {
      console.error('Fetch user account error:', err);
      setError('An unexpected error occurred while fetching account details.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      sessionManager.setSession(updatedUser);
    }
  };

  const validateAndRefreshSession = async (): Promise<boolean> => {
    try {
      
      // Check if we have a user in context
      if (!user || !isAuthenticated) {
        return false;
      }

      // Check if session manager has valid session
      const sessionUser = sessionManager.getSession();
      if (!sessionUser) {
        setUser(null);
        setIsAuthenticated(false);
        setIsSpecialAdmin(false);
        return false;
      }

      // Verify Supabase auth session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[AuthContext] Error getting Supabase session:', error);
        return false;
      }

      // If no Supabase session, try to refresh
      if (!session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('[AuthContext] Session refresh failed:', refreshError);
          // Clear invalid session
          sessionManager.clearSession();
          setUser(null);
          setIsAuthenticated(false);
          setIsSpecialAdmin(false);
          return false;
        }
        
      }

      // Ensure JWT claims are set for current user
      if (user.accountNumber) {
        try {
          const accountNumber = parseInt(user.accountNumber, 10);
          if (!isNaN(accountNumber)) {
            await supabase.rpc('set_admin_jwt_claims', {
              p_account_number: accountNumber
            });
          }
        } catch (claimsError) {
          console.error('[AuthContext] Failed to refresh JWT claims:', claimsError);
          // Don't fail validation if claims setting fails, but log it
        }
      }

      return true;
    } catch (error) {
      console.error('[AuthContext] Session validation failed:', error);
      return false;
    }
  };

  const ensureAuthSession = async (): Promise<boolean> => {
    try {
      
      // Check if we have a user in context and sessionManager
      const sessionUser = sessionManager.getSession();
      if (!sessionUser || !sessionUser.accountNumber) {
        setError('Authentication session expired. Please log in again.');
        return false;
      }

      // Check Supabase auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[AuthContext] Error getting Supabase session:', sessionError);
      }

      // If no Supabase session, try to refresh it
      if (!session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          // Don't fail immediately - we might still be able to use stored session
        } else {
        }
      }

      // Ensure user context is up to date
      if (!user || user.accountNumber !== sessionUser.accountNumber) {
        setUser(sessionUser);
        setIsAuthenticated(true);
        setIsSpecialAdmin(sessionUser.is_special_admin || false);
      }

      // Try to set JWT claims for database operations
      try {
        const accountNumber = parseInt(sessionUser.accountNumber, 10);
        if (!isNaN(accountNumber)) {
          await supabase.rpc('set_admin_jwt_claims', {
            p_account_number: accountNumber
          });
        }
      } catch (claimsError) {
        console.error('[AuthContext] Failed to set JWT claims:', claimsError);
        
        // If JWT claims fail, the user's session might be truly expired
        // Try one more refresh attempt
        try {
          const { data: retryRefresh, error: retryError } = await supabase.auth.refreshSession();
          if (!retryError && retryRefresh.session) {
            // Retry JWT claims with fresh session
            const accountNumber = parseInt(sessionUser.accountNumber, 10);
            if (!isNaN(accountNumber)) {
              await supabase.rpc('set_admin_jwt_claims', {
                p_account_number: accountNumber
              });
            }
          } else {
            // Session is truly expired, clear everything
            sessionManager.clearSession();
            setUser(null);
            setIsAuthenticated(false);
            setIsSpecialAdmin(false);
            setError('Your session has expired. Please log in again.');
            return false;
          }
        } catch (retryError) {
          // Final attempt failed
          console.error('[AuthContext] Final session restoration attempt failed:', retryError);
          sessionManager.clearSession();
          setUser(null);
          setIsAuthenticated(false);
          setIsSpecialAdmin(false);
          setError('Your session has expired. Please log in again.');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[AuthContext] Error ensuring auth session:', error);
      setError('Authentication error. Please try logging in again.');
      return false;
    }
  };

  const closePromotionsLoginModal = () => setShowPromotionsLoginModal(false);

  const closeStaffPasswordChangeModal = () => {
    setShowStaffPasswordChangeModal(false);
    setStaffUsername(null);
  };

  const openAccountsModal = () => {
    setShowAccountsModal(true);
  };

  const closeAccountsModal = () => {
    setShowAccountsModal(false);
  };

  const openProspectsModal = () => {
    // CRITICAL FIX: Only allow modal to open if we're past initial load
    // This prevents auto-opening on login
    if (!allowProspectsModalOpen) {
      return;
    }
    setShowProspectsModal(true);
  };

  const closeProspectsModal = () => {
    setShowProspectsModal(false);
  };

  const openPurchaseOrderModal = () => {
    setShowPurchaseOrderModal(true);
  };

  const closePurchaseOrderModal = () => {
    setShowPurchaseOrderModal(false);
  };

  const handleSecurityBridgeSuccess = async () => {
    setShowSecurityBridge(false);

    if (!pendingUserData) {
      console.error('[AuthContext] SECURITY BRIDGE: No pending user data!');
      return;
    }

    const { staffUser, identifier, staffData, ipAddress } = pendingUserData;

    // Complete the login process
    setUser(staffUser);
    setIsAuthenticated(true);
    setIsStaffUser(true);
    setStaffUsername(identifier);
    setIsSpecialAdmin(staffUser.is_special_admin || false);
    sessionManager.setSession({ ...staffUser, is_staff: true, staff_username: identifier });

    // Log successful staff login with security bridge notation
    try {
      await supabase.from('login_activity_log').insert({
        account_number: null,
        login_success: true,
        ip_address: ipAddress || 'Unknown',
        user_agent: navigator.userAgent,
        identifier_used: identifier,
        notes: `Staff login with SECURITY BRIDGE: ${identifier} (${staffUser.security_level || 'super_admin'})`
      });
    } catch (logError) {
      console.error('Failed to log staff login:', logError);
    }

    // Clear pending data
    setPendingUserData(null);
  };

  const handleSecurityBridgeFailure = async () => {
    setShowSecurityBridge(false);
    setPendingUserData(null);

    // Log the failed security bridge attempt
    try {
      await supabase.from('login_activity_log').insert({
        account_number: null,
        login_success: false,
        ip_address: 'Unknown',
        user_agent: navigator.userAgent,
        identifier_used: pendingUserData?.identifier || 'PETER',
        notes: `SECURITY BRIDGE FAILED: User failed 6-digit authentication`
      });
    } catch (logError) {
      console.error('Failed to log security bridge failure:', logError);
    }

    // Force logout
    logout();
  };

  const closeEntityWorkflowSelector = () => {
    setShowEntityWorkflowSelector(false);
  };

  const closeSalesWorkflowModal = () => {
    setShowSalesWorkflowModal(false);
  };

  const showOriginalEntityModal = () => {
    // CRITICAL FIX: Only allow modal to open if we're past initial load
    if (!allowProspectsModalOpen) {
      return;
    }
    setShowEntityWorkflowSelector(false);
    setShowProspectsModal(true);
  };

  const showNewSalesWorkflow = () => {
    setShowEntityWorkflowSelector(false);
    setShowSalesWorkflowModal(true);
  };

  const selectCustomerAccount = async (accountId: string, businessName: string, salesmanMode?: boolean): Promise<boolean> => {
    try {
      // Fetch the full customer account data from accounts_lcmd
      const accountData = await fetchUserAccount(accountId);
      if (!accountData) {
        setError('Could not load selected account.');
        return false;
      }

      // Set up the customer account as the current user but keep staff context
      // Include salesman mode flag in the session
      setUser(accountData);
      setIsAuthenticated(true);
      sessionManager.setSession({ 
        ...accountData, 
        staff_username: staffUsername,
        salesman_mode: salesmanMode || false 
      });

      // Set JWT claims for the selected customer account
      try {
        const accountNumber = parseInt(accountData.accountNumber, 10);
        if (!isNaN(accountNumber)) {
          await supabase.rpc('set_admin_jwt_claims', {
            p_account_number: accountNumber
          });
        }
      } catch (claimsError) {
        console.error('[AuthContext] Failed to set JWT claims for selected account:', claimsError);
      }

      // Calculate discounts for the selected account
      await calculateBestDiscount(accountData.accountNumber);

      // Initialize activity tracking for the selected account
      await activityTracker.initSession(parseInt(accountData.accountNumber, 10), accountId);

      // Close any open modals (Prospects or Accounts)
      setShowProspectsModal(false);
      setShowAccountsModal(false);
      
      
      // If in salesman mode, navigate to shopping page
      if (salesmanMode && typeof window !== 'undefined') {
        window.location.href = '/shopping?salesmanMode=true';
      }
      
      return true;
    } catch (err) {
      console.error('Error selecting customer account:', err);
      setError('Failed to login as selected account.');
      return false;
    }
  };

  // Computed value: check if user is a superuser (case-insensitive, handle underscores)
  const isSuperUser = user?.security_level ?
    user.security_level.toLowerCase().replace(/[_\s]/g, '') === 'superuser' ||
    user.security_level.toLowerCase().replace(/[_\s]/g, '') === 'superadmin' ||
    user.security_level.toLowerCase() === 'super_admin' : false;

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginWith2FA,
      logout,
      isAuthenticated,
      isLoading,
      error,
      fetchUserAccount,
      updateUser,
      maxDiscountRate,
      currentDiscountInfo,
      showPasswordChangeModal,
      openPasswordChangeModal,
      handlePasswordModalClose,
      showDiscountFormModal,
      openDiscountFormModal,
      closeDiscountFormModal,
      isSpecialAdmin,
      isSuperUser,
      showDeactivatedAccountModal,
      deactivatedAccountName,
      closeDeactivatedAccountModal,
      validateAndRefreshSession,
      ensureAuthSession,
      showPasswordInitializationModal,
      needsPasswordInitialization,
      resolvedAccountNumber,
      closePasswordInitializationModal,
      isDemoMode,
      showPromotionsLoginModal,
      closePromotionsLoginModal,
      showAccountsModal,
      showProspectsModal,
      showEntityWorkflowSelector,
      showSalesWorkflowModal,
      isStaffUser,
      staffUsername,
      showStaffPasswordChangeModal,
      closeStaffPasswordChangeModal,
      openAccountsModal,
      closeAccountsModal,
      openProspectsModal,
      closeProspectsModal,
      closeEntityWorkflowSelector,
      closeSalesWorkflowModal,
      showOriginalEntityModal,
      showNewSalesWorkflow,
      selectCustomerAccount,
      showPurchaseOrderModal,
      openPurchaseOrderModal,
      closePurchaseOrderModal,
      showSecurityBridge,
      handleSecurityBridgeSuccess,
      handleSecurityBridgeFailure
    }}>
      {children}
    </AuthContext.Provider>
  );
};
