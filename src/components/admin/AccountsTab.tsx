import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ContactInfoModal from '../ContactInfoModal';

interface Account {
  account_number: number;
  acct_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  mobile_phone?: string;
  email_address?: string;
  has_custom_password: boolean;
}


type SortableColumn = 'account_number' | 'acct_name' | 'city' | 'phone' | 'mobile_phone' | 'email_address' | 'zip';

const AccountsTab: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showForcePasswordModal, setShowForcePasswordModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [totalAccountCount, setTotalAccountCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortableColumn>('account_number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAccounts();
  }, [currentPage, sortColumn, sortDirection, searchTerm]);

  useEffect(() => {
    if (searchTerm) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  const getDefaultPassword = (acctName: string, zip: string) => {
    if (!zip) return '';
    const zipFirst5 = zip.substring(0, 5);
    return zipFirst5;
  };

  const formatPhoneNumber = (phone: string | null | undefined) => {
    if (!phone) return 'N/A';
    
    // Remove all non-numeric characters
    const numbers = phone.replace(/\D/g, '');
    
    // Handle US phone numbers (remove country code "1" if present)
    let cleanNumbers = numbers;
    if (numbers.length === 11 && numbers.startsWith('1')) {
      cleanNumbers = numbers.substring(1);
    }
    
    // Format as (000)000-0000
    if (cleanNumbers.length === 10) {
      return `(${cleanNumbers.substring(0, 3)})${cleanNumbers.substring(3, 6)}-${cleanNumbers.substring(6)}`;
    }
    
    // Return original if not 10 digits
    return phone;
  };

  const formatZipCode = (zip: string | null | undefined) => {
    if (!zip) return 'N/A';
    
    // Extract only the first 5 characters and pad with leading zeros if needed
    let zipFirst5 = zip.toString().substring(0, 5);
    
    // Pad with leading zeros to ensure 5 digits
    zipFirst5 = zipFirst5.padStart(5, '0');
    
    return zipFirst5;
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      
      // Set admin session context for account 999 access
      try {
        await supabase.rpc('set_config', {
          setting_name: 'app.current_account_number',
          new_value: '999',
          is_local: true
        });
      } catch (error: any) {
      }
      
      let query = supabase
        .from('accounts_lcmd')
        .select('account_number,acct_name,address,city,state,zip,phone,mobile_phone,email_address', { count: 'exact' });

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const numericSearchTerm = parseInt(searchTerm, 10);
        const orConditions = [
          `acct_name.ilike.%${searchLower}%`,
          `city.ilike.%${searchLower}%`,
          `state.ilike.%${searchLower}%`,
          `email_address.ilike.%${searchLower}%`,
        ];
        
        // Check for phone number pattern: exactly 7 or 10 digits, not starting with "1"
        const digitsOnly = searchTerm.replace(/\D/g, '');
        const isPhonePattern = (digitsOnly.length === 7 || digitsOnly.length === 10) && !digitsOnly.startsWith('1');
        
        if (isPhonePattern) {
          // Add phone number searches - search for the digits within formatted phone numbers
          orConditions.push(`phone.ilike.%${digitsOnly}%`);
          orConditions.push(`mobile_phone.ilike.%${digitsOnly}%`);
        }
        
        if (!isNaN(numericSearchTerm)) {
          orConditions.push(`account_number.eq.${numericSearchTerm}`);
        }
        query = query.or(orConditions.join(','));
      } else {
        // Calculate offset for pagination only when not searching
        const offset = (currentPage - 1) * itemsPerPage;
        query = query.range(offset, offset + itemsPerPage - 1);
      }

      // Always apply sorting
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching accounts:', {
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code
        });
        setAccounts([]);
        setTotalAccountCount(0);
        return;
      }

      if (count) {
        setTotalAccountCount(count);
      }

      // Get password entries from USER_PASSWORDS table only for the current page accounts
      const accountNumbers = data?.map(a => a.account_number) || [];
      let passwordData: any[] = [];
      if (accountNumbers.length > 0) {
        const { data: pwdData, error: passwordError } = await supabase
          .from('user_passwords')
          .select('account_number, password_hash')
          .in('account_number', accountNumbers);

        if (passwordError) {
          console.error('Error fetching password data:', {
            message: (passwordError as any)?.message,
            details: (passwordError as any)?.details,
            hint: (passwordError as any)?.hint,
            code: (passwordError as any)?.code
          });
        }
        passwordData = pwdData || [];
      }

      // Create a map of account passwords - if record exists, they have a custom password
      const passwordMap: { [key: number]: boolean } = {};
      passwordData?.forEach((entry: any) => {
        passwordMap[entry.account_number] = true; // Just track existence, not the hash
      });

      // Check which accounts have custom passwords
      // DEBUGGING: Let's see what's actually happening with the data
      const accountsWithPasswordStatus = (data || []).map(account => {
        const hasEntry = passwordMap.hasOwnProperty(account.account_number);
        const storedPassword = passwordMap[account.account_number];
        const defaultPattern = getDefaultPassword(account.acct_name, account.zip);
        
        
        // NEW LOGIC: If record exists in user_passwords, they have a custom password
        const hasCustomPassword = passwordMap[account.account_number] === true;
        
        return {
          ...account,
          has_custom_password: hasCustomPassword
        };
      });

      setAccounts(accountsWithPasswordStatus);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleSetPassword = async (accountNumber: number, newPassword: string) => {
    try {
      
      // STEP 1: Delete any existing record from USER_PASSWORDS (as per requirement)
      const { error: deleteError } = await supabase
        .from('user_passwords')
        .delete()
        .eq('account_number', accountNumber);

      if (deleteError) {
        alert('Error removing existing password: ' + deleteError.message);
        return;
      }

      // STEP 2: Hash the new password
      const { data: hashResult, error: hashError } = await supabase.rpc('hash_password', {
        plain_password: newPassword
      });

      if (hashError || !hashResult) {
        alert('Error hashing password: ' + (hashError?.message || 'Unknown error'));
        return;
      }

      // STEP 3: Insert new hashed password record
      const { data: insertData, error: insertError } = await supabase
        .from('user_passwords')
        .insert({
          account_number: accountNumber,
          password_hash: hashResult,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        alert('Error setting password: ' + insertError.message);
        return;
      }


      // STEP 4: Verify the record was created
      const { data: verifyData, error: verifyError } = await supabase
        .from('user_passwords')
        .select('account_number, password_hash, created_at, updated_at')
        .eq('account_number', accountNumber)
        .single();

      if (verifyError || !verifyData) {
        alert('Password may not have been set correctly. Please check and try again.');
        return;
      }


      // Close modal and refresh
      setShowPasswordModal(false);
      await fetchAccounts();
      
      alert(`✅ Password has been set successfully for Account ${accountNumber}!\n\nUser can now log in with this password.\n\nRecord ID: ${verifyData.account_number}\nCreated: ${new Date(verifyData.created_at).toLocaleString()}`);
      
    } catch (error) {
      alert('Unexpected error setting password: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleResetPassword = async (accountNumber: number) => {
    try {
      // STEP 1: Remove record from USER_PASSWORDS (as per requirement)
      const { error: deleteError } = await supabase
        .from('user_passwords')
        .delete()
        .eq('account_number', accountNumber);

      if (deleteError) {
        console.error('Error deleting password:', deleteError);
        alert('Error resetting password: ' + deleteError.message);
        return;
      }

      // STEP 2: Clear any auth.users connection
      const { error: clearUserError } = await supabase
        .from('accounts_lcmd')
        .update({ user_id: null })
        .eq('account_number', accountNumber);

      if (clearUserError) {
        console.error('Error clearing user connection:', clearUserError);
        // Don't fail the operation if this fails
      }

      fetchAccounts();
      alert('Password reset completed successfully. User can now log in with their ZIP code (once), which will trigger the mandatory password setup modal.');
    } catch (error) {
      console.error('Error:', error);
      alert('Error resetting password');
    }
  };

  const handleForcePasswordChange = async (accountNumber: number, newPassword: string) => {
    try {
      
      // STEP 1: Delete any existing record from USER_PASSWORDS
      const { error: deleteError } = await supabase
        .from('user_passwords')
        .delete()
        .eq('account_number', accountNumber);

      if (deleteError) {
        alert('Error removing existing password: ' + deleteError.message);
        return;
      }

      // STEP 2: Hash the new password
      const { data: hashResult, error: hashError } = await supabase.rpc('hash_password', {
        plain_password: newPassword
      });

      if (hashError || !hashResult) {
        alert('Error hashing FORCED password: ' + (hashError?.message || 'Unknown error'));
        return;
      }

      // STEP 3: Insert new hashed password record
      const { data: insertData, error: insertError } = await supabase
        .from('user_passwords')
        .insert({
          account_number: accountNumber,
          password_hash: hashResult,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        alert('Error setting FORCED password: ' + insertError.message);
        return;
      }


      // STEP 4: Verify the record was created
      const { data: verifyData, error: verifyError } = await supabase
        .from('user_passwords')
        .select('account_number, password_hash, created_at, updated_at')
        .eq('account_number', accountNumber)
        .single();

      if (verifyError || !verifyData) {
        alert('FORCED password may not have been set correctly. Please check and try again.');
        return;
      }


      // Close modal and refresh
      setShowForcePasswordModal(false);
      await fetchAccounts();
      
      alert(`🚨 EMERGENCY PASSWORD FORCE COMPLETED! 🚨\n\nAccount ${accountNumber} password has been FORCIBLY set!\n\n⚠️ FOR EMERGENCY/TESTING USE ONLY ⚠️\n\nUser can now log in with the forced password.\n\nRecord ID: ${verifyData.account_number}\nForced At: ${new Date(verifyData.created_at).toLocaleString()}`);
      
    } catch (error) {
      alert('Unexpected error in FORCE password change: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getDefaultPasswordDisplay = (account: Account) => {
    return getDefaultPassword(account.acct_name, account.zip) || 'N/A';
  };

  const isInactiveAccount = (account: Account) => {
    const defaultPattern = getDefaultPassword(account.acct_name, account.zip);
    return defaultPattern && defaultPattern.slice(-5) === 'xxxxx';
  };


  const filteredAccounts = accounts;

  const PasswordModal: React.FC<{
    account: Account;
    onClose: () => void;
    onSave: (accountNumber: number, password: string) => void;
    onResetZip: (accountNumber: number) => void;
  }> = ({ account, onClose, onSave, onResetZip }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = () => {
      if (!password.trim()) {
        alert('Please enter a password');
        return;
      }
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }
      onSave(account.account_number, password);
    };

    const handleResetZip = () => {
      onResetZip(account.account_number);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 w-full max-w-2xl">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">
            Password Management for Account {account.account_number}
          </h3>
          <div className="mb-6">
            <p className="text-lg text-gray-600 mb-3">
              <strong>Account:</strong> {account.acct_name}
            </p>
            <p className="text-lg text-gray-600 mb-6">
              <strong>Current Zip Code:</strong> {getDefaultPasswordDisplay(account)}
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password..."
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-lg"
              />
            </div>
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password..."
                className="w-full border border-gray-300 rounded-md px-4 py-3 text-lg"
              />
            </div>
          </div>
          <div className="flex justify-between mt-8">
            <button
              onClick={handleResetZip}
              className="px-6 py-3 text-lg font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              title="Remove current password and allow customer to use their ZIP code once to log in"
            >
              Reset Zip Default
            </button>
            <div className="flex space-x-4">
              <button
                onClick={onClose}
                className="px-6 py-3 text-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Set Password
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ResetConfirmModal: React.FC<{
    account: Account;
    onClose: () => void;
    onConfirm: (accountNumber: number) => void;
  }> = ({ account, onClose, onConfirm }) => {
    const handleConfirm = () => {
      onConfirm(account.account_number);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 w-full max-w-2xl">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">
            Reset Password Confirmation
          </h3>
          <div className="mb-6">
            <p className="text-lg text-gray-700 mb-4">
              Are you sure you want to reset the password for account <strong>{account.account_number}</strong> ({account.acct_name}) who is located in zip code <strong>{formatZipCode(account.zip)}</strong>?
            </p>
            <p className="text-md text-gray-600">
              This will remove the user from the user_passwords table and trigger an automatic first-time password setup when they next log in.
            </p>
          </div>
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 text-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-3 text-lg font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
            >
              Yes, Reset Password
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ForcePasswordModal: React.FC<{
    account: Account;
    onClose: () => void;
    onForce: (accountNumber: number, password: string) => void;
  }> = ({ account, onClose, onForce }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = () => {
      if (!password.trim()) {
        alert('Please enter a password to force');
        return;
      }
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      
      // Additional confirmation for force password change
      if (window.confirm(
        `🚨 EMERGENCY FORCE PASSWORD CHANGE 🚨\n\n` +
        `Are you ABSOLUTELY SURE you want to FORCE the password for:\n\n` +
        `Account: ${account.account_number}\n` +
        `Company: ${account.acct_name}\n\n` +
        `⚠️ FOR EMERGENCY AND TESTING PURPOSES ONLY ⚠️\n\n` +
        `This will immediately set the password without user consent.\n\n` +
        `Click OK to proceed with FORCE password change.`
      )) {
        onForce(account.account_number, password);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 w-full max-w-2xl border-4 border-orange-500">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🚨</div>
            <h3 className="text-2xl font-bold text-orange-600 mb-2">
              EMERGENCY FORCE PASSWORD CHANGE
            </h3>
            <div className="bg-orange-100 border border-orange-400 rounded-md p-4 mb-4">
              <p className="text-lg font-semibold text-orange-800 mb-2">
                ⚠️ FOR EMERGENCY AND TESTING PURPOSES ONLY ⚠️
              </p>
              <p className="text-sm text-orange-700">
                This will forcibly set a password without user consent or notification.
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-lg text-gray-600 mb-3">
              <strong>Account:</strong> {account.account_number} - {account.acct_name}
            </p>
            <p className="text-lg text-gray-600 mb-6">
              <strong>Current Zip Code:</strong> {getDefaultPasswordDisplay(account)}
            </p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-orange-700 mb-2">
                Force New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to force..."
                className="w-full border-2 border-orange-300 rounded-md px-4 py-3 text-lg focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-lg font-medium text-orange-700 mb-2">
                Confirm Forced Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm forced password..."
                className="w-full border-2 border-orange-300 rounded-md px-4 py-3 text-lg focus:border-orange-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 mt-8">
            <button
              onClick={onClose}
              className="px-6 py-3 text-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-3 text-lg font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md border-2 border-orange-700"
            >
              🚨 FORCE PASSWORD CHANGE
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div>
      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow mt-0">
        <div className="flex items-center space-x-4">
          <div className="w-[85%]">
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Search Accounts
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by account number, company name, city, state, email address, or phone number (7 or 10 digits)..."
              className="w-full border border-gray-300 rounded-md px-4 py-3 text-base"
            />
          </div>
          <button
            onClick={fetchAccounts}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-lg font-semibold mt-8"
          >
            Refresh Accounts
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
        <div className="px-8 py-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">
            {searchTerm 
              ? `Found ${totalAccountCount} matching accounts`
              : `Account List (Showing ${filteredAccounts.length} of ${totalAccountCount} accounts)`
            }
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-600 text-xl">Loading accounts...</div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-600 text-xl">No accounts found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer w-20" onClick={() => handleSort('account_number')}>
                    Account # {sortColumn === 'account_number' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer w-48" onClick={() => handleSort('acct_name')}>
                    Company Name {sortColumn === 'acct_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer w-40" onClick={() => handleSort('city')}>
                    Location {sortColumn === 'city' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer w-32" onClick={() => handleSort('phone')}>
                    Busn Phone {sortColumn === 'phone' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer w-32" onClick={() => handleSort('mobile_phone')}>
                    Mobile Phone {sortColumn === 'mobile_phone' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer w-48" onClick={() => handleSort('email_address')}>
                    Email Address {sortColumn === 'email_address' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider cursor-pointer w-20" onClick={() => handleSort('zip')}>
                    Zip Code {sortColumn === 'zip' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider w-20">
                    User Pwd?
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider w-48">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccounts.map((account) => (
                  <tr key={account.account_number} className={`${isInactiveAccount(account) ? 'bg-red-100 hover:bg-red-200' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {account.account_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate">
                      {account.acct_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {account.city || 'N/A'}, {account.state || 'N/A'} {formatZipCode(account.zip)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatPhoneNumber(account.phone)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatPhoneNumber(account.mobile_phone)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 truncate">
                      {account.email_address || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {formatZipCode(account.zip)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <span className={account.has_custom_password ? 'font-bold text-green-700' : 'text-gray-600'}>
                        {account.has_custom_password ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowResetConfirmModal(true);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowForcePasswordModal(true);
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs font-medium"
                          title="Force Password Change - For Emergency and Testing Purposes"
                        >
                          Force Password
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowContactModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Contact Info
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {!searchTerm && totalAccountCount > itemsPerPage && (
          <div className="px-8 py-6 border-t border-gray-200 flex items-center justify-between">
            <div className="text-lg text-gray-700">
              Page {currentPage} of {Math.ceil(totalAccountCount / itemsPerPage)}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-6 py-3 text-lg font-semibold rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalAccountCount / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(totalAccountCount / itemsPerPage)}
                className={`px-6 py-3 text-lg font-semibold rounded-md ${
                  currentPage === Math.ceil(totalAccountCount / itemsPerPage)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && selectedAccount && (
        <PasswordModal
          account={selectedAccount}
          onClose={() => setShowPasswordModal(false)}
          onSave={handleSetPassword}
          onResetZip={handleResetPassword}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirmModal && selectedAccount && (
        <ResetConfirmModal
          account={selectedAccount}
          onClose={() => setShowResetConfirmModal(false)}
          onConfirm={handleResetPassword}
        />
      )}

      {/* Force Password Modal */}
      {showForcePasswordModal && selectedAccount && (
        <ForcePasswordModal
          account={selectedAccount}
          onClose={() => setShowForcePasswordModal(false)}
          onForce={handleForcePasswordChange}
        />
      )}

      {/* Contact Info Modal */}
      {showContactModal && selectedAccount && (
        <ContactInfoModal
          isOpen={showContactModal}
          onClose={() => {
            setShowContactModal(false);
            setSelectedAccount(null);
          }}
          accountNumber={selectedAccount.account_number}
          accountName={selectedAccount.acct_name}
          initialEmail={selectedAccount.email_address}
          initialPhone={selectedAccount.phone}
          initialMobilePhone={selectedAccount.mobile_phone}
          onSuccess={() => {
            // Refresh the accounts list to show updated contact info
            fetchAccounts();
          }}
        />
      )}

    </div>
  );
};

export default AccountsTab;
