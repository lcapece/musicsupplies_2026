import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SecurityBridgeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onFailure: () => void;
  username: string;
}

const SecurityBridgeModal: React.FC<SecurityBridgeModalProps> = ({
  isOpen,
  onSuccess,
  onFailure,
  username
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      // Focus first input when modal opens
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError(false);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all digits are filled
    if (index === 5 && value) {
      const enteredCode = newDigits.join('');
      validateCode(enteredCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      const enteredCode = digits.join('');
      if (enteredCode.length === 6) {
        validateCode(enteredCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setDigits(newDigits);

    // Focus the next empty input or last input
    const nextEmptyIndex = newDigits.findIndex(d => !d);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();

    // Auto-validate if all 6 digits pasted
    if (pastedData.length === 6) {
      validateCode(pastedData);
    }
  };

  const validateCode = async (code: string) => {
    if (isValidating) return; // Prevent multiple concurrent validations

    setIsValidating(true);

    try {
      // Call the Supabase function to validate the bridge code
      const { data, error: rpcError } = await supabase
        .rpc('validate_security_bridge_code', {
          p_username: username,
          p_bridge_code: code
        });

      if (rpcError) {
        console.error('Bridge code validation error:', rpcError);
        throw rpcError;
      }

      // Check if validation was successful
      const result = data && data.length > 0 ? data[0] : null;

      if (result && result.success) {
        // Success animation
        setError(false);
        setTimeout(() => {
          onSuccess();
        }, 300);
      } else {
        // Error animation
        setError(true);
        setIsShaking(true);
        setAttempts(prev => prev + 1);

        setTimeout(() => setIsShaking(false), 650);

        // Check if max attempts reached
        if (attempts + 1 >= MAX_ATTEMPTS) {
          setTimeout(() => {
            onFailure();
          }, 1000);
        } else {
          // Clear inputs for retry
          setTimeout(() => {
            setDigits(['', '', '', '', '', '']);
            setError(false);
            inputRefs.current[0]?.focus();
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Validation error:', err);
      // Handle error as failed validation
      setError(true);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 650);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    setDigits(['', '', '', '', '', '']);
    setError(false);
    inputRefs.current[0]?.focus();
  };

  if (!isOpen) return null;

  const allFilled = digits.every(d => d !== '');
  const remainingAttempts = MAX_ATTEMPTS - attempts;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-black"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      />

      {/* Animated background gradient */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
          animation: 'pulse 4s ease-in-out infinite'
        }}
      />

      {/* Modal Container */}
      <div
        className={`relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-12 max-w-lg w-full mx-4 border border-slate-700/50 ${isShaking ? 'animate-shake' : ''}`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 100px rgba(59, 130, 246, 0.1)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-20 blur-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(147, 51, 234, 0.4) 100%)',
            zIndex: -1
          }}
        />

        {/* Lock Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-40 animate-pulse" />
            <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-4">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Security Bridge
          </h2>
          <p className="text-slate-400 text-sm font-medium">
            Enhanced authentication for SUPERUSERS
          </p>
        </div>

        {/* PIN Input */}
        <div className="mb-8">
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`
                  w-14 h-16 text-center text-3xl font-bold rounded-xl
                  bg-slate-700/50 border-2 backdrop-blur-sm
                  transition-all duration-200 outline-none
                  ${error
                    ? 'border-red-500 text-red-400 bg-red-500/10'
                    : digit
                      ? 'border-blue-500 text-white bg-blue-500/10 shadow-lg shadow-blue-500/20'
                      : 'border-slate-600 text-white hover:border-slate-500 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/20'
                  }
                  ${isShaking ? 'shake' : ''}
                `}
                style={{
                  caretColor: 'transparent'
                }}
              />
            ))}
          </div>

          {/* Placeholder hint */}
          <div className="text-center mb-4">
            <span className="text-slate-500 text-xs font-mono">
              Enter 6-digit security code
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 animate-fadeIn">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-red-400 font-semibold text-sm">Invalid security code</p>
                <p className="text-red-400/70 text-xs mt-1">
                  {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClear}
            disabled={!digits.some(d => d)}
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm
              bg-slate-700/50 text-slate-300 border border-slate-600
              hover:bg-slate-700 hover:border-slate-500
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            Clear
          </button>
          <button
            onClick={() => validateCode(digits.join(''))}
            disabled={!allFilled || isValidating}
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm
              bg-gradient-to-r from-blue-600 to-purple-600 text-white
              hover:from-blue-500 hover:to-purple-500
              disabled:opacity-30 disabled:cursor-not-allowed
              shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40
              transition-all duration-200 transform hover:scale-[1.02]"
          >
            {isValidating ? 'Verifying...' : 'Verify'}
          </button>
        </div>

        {/* Security Footer */}
        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-slate-500 text-xs flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Secure authentication • Encrypted connection
          </p>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }

        .animate-shake {
          animation: shake 0.65s cubic-bezier(.36,.07,.19,.97) both;
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .shake {
          animation: shake 0.65s cubic-bezier(.36,.07,.19,.97) both;
        }

        /* Prevent input spinner on number inputs */
        input[type="text"]::-webkit-inner-spin-button,
        input[type="text"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default SecurityBridgeModal;
