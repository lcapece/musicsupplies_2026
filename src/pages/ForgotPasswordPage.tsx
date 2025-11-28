import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Success Modal Component
const SuccessModal: React.FC<{ 
  maskedEmail: string; 
  onClose: () => void; 
}> = ({ maskedEmail, onClose }) => {
  const [countdown, setCountdown] = useState(20);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Password Reset Email Sent</h3>
          <p className="text-gray-600 mb-4">
            Password reset link has been e-mailed to {maskedEmail}
          </p>
          <p className="text-sm text-gray-500">
            Auto-closing in {countdown} seconds
          </p>
        </div>
      </div>
    </div>
  );
};

// Error Modal Component
const ErrorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [countdown, setCountdown] = useState(20);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Information Not Found</h3>
          <p className="text-gray-600 mb-4">
            Sorry, we are having trouble finding some of your information. Please contact helpdesk at 516-221-5596.
          </p>
          <p className="text-sm text-gray-500">
            Auto-closing in {countdown} seconds
          </p>
        </div>
      </div>
    </div>
  );
};

const ForgotPasswordPage: React.FC = () => {
  const [inputType, setInputType] = useState<'email' | 'account'>('email');
  const [email, setEmail] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number>(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const navigate = useNavigate();

  // Rate limiting: 1 request per 60 seconds
  const RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds

  // Auto-close countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleClose = () => {
    navigate('/');
  };

  // Function to mask email address starting from 3rd character
  const maskEmail = (email: string): string => {
    const atIndex = email.indexOf('@');
    if (atIndex <= 2) return email; // If @ is at position 0, 1, or 2, don't mask
    
    const beforeAt = email.substring(0, atIndex);
    const afterAt = email.substring(atIndex);
    
    if (beforeAt.length <= 2) return email; // Don't mask if username is too short
    
    const visiblePart = beforeAt.substring(0, 2);
    const maskedPart = '*'.repeat(beforeAt.length - 2);
    
    return visiblePart + maskedPart + afterAt;
  };

  // Validate account number
  const isValidAccountNumber = (accountNum: string): boolean => {
    const num = parseInt(accountNum);
    return !isNaN(num) && num >= 101 && num <= 9999 && num !== 999;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Immediate state updates for visual feedback - this ensures first click works
    setIsLoading(true);
    setMessage('');
    setError('');
    setRateLimitRemaining(0);

    const currentInput = inputType === 'email' ? email : accountNumber;

    // Additional validation for account number - show error modal for invalid numbers
    if (inputType === 'account' && !isValidAccountNumber(accountNumber)) {
      setIsLoading(false);
      setShowErrorModal(true);
      return;
    }
    
    // Check rate limiting after setting loading state
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT_WINDOW) {
      const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - timeSinceLastRequest) / 1000);
      setError(`Please wait ${remainingTime} seconds before requesting another password reset.`);
      setRateLimitRemaining(remainingTime);
      setIsLoading(false); // Reset loading state
      
      // Start countdown for rate limit
      const rateLimitTimer = setInterval(() => {
        setRateLimitRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(rateLimitTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return;
    }

    try {
      let userData: any = null;
      let lookupError: any = null;

      if (inputType === 'email') {
        // Look up by email address
        const { data, error } = await supabase
          .from('accounts_lcmd')
          .select('email_address, acct_name, account_number')
          .eq('email_address', email)
          .single();
        
        userData = data;
        lookupError = error;
      } else {
        // Look up by account number
        const accountNum = parseInt(accountNumber);
        const { data, error } = await supabase
          .from('accounts_lcmd')
          .select('email_address, acct_name, account_number')
          .eq('account_number', accountNum)
          .single();
        
        userData = data;
        lookupError = error;
      }

      // Handle lookup results
      if (lookupError || !userData) {
        console.error('User lookup error:', lookupError);
        setIsLoading(false);
        setShowErrorModal(true);
        return;
      }

      // For account number lookup, check if email exists
      if (inputType === 'account') {
        if (!userData.email_address || userData.email_address.trim() === '') {
          setIsLoading(false);
          setShowErrorModal(true);
          return;
        }
      }

      // Use the email from the lookup (whether from direct email search or account lookup)
      const targetEmail = inputType === 'email' ? email : userData.email_address;

      // Clean up any existing unused tokens for this email to prevent accumulation
      const { error: cleanupError } = await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('email', targetEmail)
        .eq('used', false);

      if (cleanupError) {
        console.warn('Token cleanup warning (non-critical):', cleanupError);
        // Continue anyway - this is just cleanup
      }

      // Generate a secure reset token and store it
      const resetToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store the reset token in the database
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          email: targetEmail,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (tokenError) {
        console.error('Token storage error:', tokenError);
        
        // Check for specific errors to provide better user feedback
        if (tokenError.message?.includes('relation "public.password_reset_tokens" does not exist')) {
          setError('Password reset system is not configured. Please contact support.');
        } else if (tokenError.message?.includes('rate') || tokenError.message?.includes('limit')) {
          setError('Too many password reset requests. Please wait a few minutes before trying again.');
        } else {
          setError('Failed to generate reset token. Please try again.');
        }
        return;
      }

      // Send password reset email via Mailgun
      const resetLink = `${window.location.origin}/update-password?token=${resetToken}`;
      
      const { data, error } = await supabase.functions.invoke('send-mailgun-email', {
        body: {
          to: targetEmail,
          subject: 'Password Reset - Music Supplies',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Password Reset Request</h2>
              <p>Hello ${userData.acct_name || 'Customer'},</p>
              <p>You requested a password reset for your Music Supplies account. Click the link below to reset your password:</p>
              <div style="margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
              </div>
              <p>This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this password reset, please ignore this email.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Music Supplies<br>
                Phone: (800) 321-5584<br>
                Email: marketing@musicsupplies.com
              </p>
            </div>
          `,
          text: `
Password Reset Request

Hello ${userData.acct_name || 'Customer'},

You requested a password reset for your Music Supplies account. 

Reset your password by visiting this link:
${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

Music Supplies
Phone: (800) 321-5584
Email: marketing@musicsupplies.com
          `
        }
      });

      if (error) {
        console.error('Mailgun email error:', error);
        
        // Check for specific rate limiting errors
        if (error.message?.includes('rate') || error.message?.includes('limit') || 
            error.message?.includes('429') || error.message?.includes('quota')) {
          setError('Email service temporarily unavailable due to high demand. Please try again in a few minutes.');
        } else if (error.message?.includes('401') || error.message?.includes('authentication')) {
          setError('Email service configuration error. Please contact support.');
        } else {
          setError('Failed to send reset email. Please try again or contact support.');
        }
      } else {
        setLastRequestTime(now); // Update last request time only on success
        
        // Show success modal with masked email
        setMaskedEmail(maskEmail(targetEmail));
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      
      // Enhanced error handling
      if (err instanceof Error) {
        if (err.message.includes('rate') || err.message.includes('limit')) {
          setError('Too many requests. Please wait a few minutes before trying again.');
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('An unexpected error occurred. Please try again later.');
        }
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Forgot Your Password?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter either your email address or account number below and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 relative">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Countdown display */}
          <div className="text-center mb-4">
            <p className="text-sm text-gray-500">
              Auto-closing in {countdown} seconds
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Input Type Toggle */}
            <div>
              <div className="flex justify-center space-x-4 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setInputType('email');
                    setAccountNumber('');
                    setError('');
                    setMessage('');
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    inputType === 'email'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Email Address
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputType('account');
                    setEmail('');
                    setError('');
                    setMessage('');
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    inputType === 'account'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Account Number
                </button>
              </div>
            </div>

            {/* Email Input */}
            {inputType === 'email' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* Account Number Input */}
            {inputType === 'account' && (
              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                  Account number
                </label>
                <div className="mt-1">
                  <input
                    id="accountNumber"
                    name="accountNumber"
                    type="number"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter account number"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || rateLimitRemaining > 0}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${
                  isLoading || rateLimitRemaining > 0
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading 
                  ? 'Sending...' 
                  : rateLimitRemaining > 0 
                    ? `Wait ${rateLimitRemaining}s` 
                    : 'Send Reset Link'
                }
              </button>
            </div>
          </form>

          {message && <p className="mt-4 text-center text-sm text-green-600">{message}</p>}
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
        </div>
      </div>
      
      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal 
          maskedEmail={maskedEmail}
          onClose={() => {
            setShowSuccessModal(false);
            navigate('/');
          }}
        />
      )}
      
      {/* Error Modal */}
      {showErrorModal && (
        <ErrorModal 
          onClose={() => {
            setShowErrorModal(false);
            navigate('/');
          }}
        />
      )}
    </div>
  );
};

export default ForgotPasswordPage;
