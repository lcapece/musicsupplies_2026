import React, { useState, useEffect } from 'react';
import { Gift, Star, AlertCircle, X, Sparkles, Zap, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Promotion {
  code: string;
  name: string;
  description: string;
  type: string;
  value: number;
  min_order_value: number;
  discount_amount: number;
  valid_from: string;
  valid_until: string;
  status: 'available' | 'depleted' | 'expired' | 'min_not_met';
  is_free_gift: boolean;
  free_gift_inventory?: number;
}

interface ExclusivePromo {
  promo_code: string;
  discount_percentage: number;
  min_order_amount: number;
  max_order_amount: number;
  max_discount_amount: number;
  expires_at: string;
  hours_remaining: number;
  minutes_remaining: number;
  account_name: string;
  created_at: string;
}

interface PromotionsLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// CSS for flashing red border animation
const flashingRedBorderStyle = `
  @keyframes flashRedBorder {
    0%, 100% {
      border-color: rgb(239 68 68);
      box-shadow: 0 0 20px 5px rgba(239, 68, 68, 0.6), inset 0 0 20px rgba(239, 68, 68, 0.1);
    }
    50% {
      border-color: rgb(220 38 38);
      box-shadow: 0 0 40px 10px rgba(220, 38, 38, 0.8), inset 0 0 30px rgba(220, 38, 38, 0.2);
    }
  }

  @keyframes sirenRotate {
    0% { transform: rotate(-15deg) scale(1); }
    25% { transform: rotate(15deg) scale(1.1); }
    50% { transform: rotate(-15deg) scale(1); }
    75% { transform: rotate(15deg) scale(1.1); }
    100% { transform: rotate(-15deg) scale(1); }
  }

  @keyframes sirenGlow {
    0%, 100% {
      filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
      opacity: 1;
    }
    50% {
      filter: drop-shadow(0 0 20px rgba(239, 68, 68, 1));
      opacity: 0.8;
    }
  }

  @keyframes pulseCode {
    0%, 100% {
      transform: scale(1);
      text-shadow: 0 0 10px rgba(220, 38, 38, 0.5);
    }
    50% {
      transform: scale(1.05);
      text-shadow: 0 0 25px rgba(220, 38, 38, 0.8);
    }
  }

  @keyframes urgentPulse {
    0%, 100% {
      background-color: rgba(254, 226, 226, 0.5);
    }
    50% {
      background-color: rgba(254, 202, 202, 0.8);
    }
  }

  .flash-red-border {
    animation: flashRedBorder 0.5s ease-in-out infinite;
    border-width: 6px;
  }

  .siren-animate {
    animation: sirenRotate 0.3s ease-in-out infinite, sirenGlow 0.5s ease-in-out infinite;
  }

  .pulse-code {
    animation: pulseCode 1s ease-in-out infinite;
  }

  .urgent-pulse {
    animation: urgentPulse 1s ease-in-out infinite;
  }
`;

const PromotionsLoginModal: React.FC<PromotionsLoginModalProps> = ({
  isOpen,
  onClose
}) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [exclusivePromo, setExclusivePromo] = useState<ExclusivePromo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(20);
  const { user } = useAuth();

  // Countdown timer effect - ONLY for regular promos, NOT for exclusive one-time offers
  useEffect(() => {
    if (!isOpen) {
      setCountdown(20);
      return;
    }

    // DO NOT auto-close if showing exclusive promo - user must manually dismiss
    if (exclusivePromo) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose, exclusivePromo]);

  useEffect(() => {
    const fetchPromotions = async () => {
      if (!isOpen || !user?.accountNumber) return;

      setIsLoading(true);
      setExclusivePromo(null);

      const accountNum = parseInt(user.accountNumber, 10);
      console.log('🔍 PromotionsLoginModal: Checking for exclusive promo for account:', accountNum);

      try {
        // First, check for exclusive account-specific promo code
        const { data: exclusiveData, error: exclusiveError } = await supabase.rpc('get_account_exclusive_promo', {
          p_account_number: accountNum
        });

        console.log('🔍 Exclusive promo response:', { data: exclusiveData, error: exclusiveError });

        if (exclusiveError) {
          console.error('❌ Error fetching exclusive promo:', exclusiveError);
        }

        if (!exclusiveError && exclusiveData && Array.isArray(exclusiveData) && exclusiveData.length > 0) {
          // Found an exclusive promo - this takes precedence!
          console.log('🎉 EXCLUSIVE PROMO FOUND:', exclusiveData[0]);
          setExclusivePromo(exclusiveData[0]);
          setPromotions([]); // Clear regular promos - exclusive takes over
          setIsLoading(false);
          return;
        }

        console.log('📋 No exclusive promo found, fetching regular promotions...');

        // No exclusive promo, fetch regular promotions
        const { data: promoData, error } = await supabase.rpc('get_login_promotions_display', {
          p_account_number: user.accountNumber
        });

        if (error) {
          console.log('⚠️ get_login_promotions_display error, trying fallback:', error);
          // Fallback to available promo codes function
          const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_available_promo_codes_only', {
            p_account_number: user.accountNumber,
            p_order_value: 0
          });

          if (!fallbackError && fallbackData) {
            setPromotions(fallbackData);
          }
        } else if (promoData) {
          setPromotions(promoData);
        }
      } catch (error) {
        console.error('Error fetching promotions for login modal:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromotions();
  }, [isOpen, user?.accountNumber]);

  if (!isOpen) return null;

  const getStatusEmoji = (promo: Promotion) => {
    if (promo.status === 'available') return '1f389';
    if (promo.status === 'depleted') return '1f61e';
    if (promo.status === 'expired') return '23f0';
    if (promo.status === 'min_not_met') return '1f4b0';
    return '1f3af';
  };

  const getStatusMessage = (promo: Promotion) => {
    if (promo.status === 'available') return 'Ready to Apply!';
    if (promo.status === 'depleted') return 'Sorry, promotion has ended';
    if (promo.status === 'expired') return 'Promotion expired';
    if (promo.status === 'min_not_met') return `Need $${(promo.min_order_value).toFixed(2)} minimum`;
    return '';
  };

  const getCardStyle = (promo: Promotion) => {
    if (promo.status === 'available') {
      return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-green-100';
    }
    if (promo.status === 'depleted' || promo.status === 'expired') {
      return 'bg-gray-100 border-gray-400 opacity-70';
    }
    return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300';
  };

  const getTextStyle = (promo: Promotion) => {
    if (promo.status === 'depleted' || promo.status === 'expired') {
      return 'text-gray-500 line-through';
    }
    return 'text-gray-800';
  };

  // If we have an exclusive promo, show the special emergency display
  if (exclusivePromo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <style>{flashingRedBorderStyle}</style>
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flash-red-border">
          {/* Emergency Header */}
          <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-600 px-6 py-4 text-white relative overflow-hidden">
            <div className="absolute inset-0 urgent-pulse"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Animated Siren Left */}
                <div className="text-4xl siren-animate">
                  <span role="img" aria-label="siren">🚨</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight uppercase">
                    EXCLUSIVE ONE-TIME OFFER!
                  </h2>
                  <p className="text-red-100 text-sm font-bold">
                    FOR YOUR ACCOUNT ONLY - EXPIRES SOON!
                  </p>
                </div>
                {/* Animated Siren Right */}
                <div className="text-4xl siren-animate">
                  <span role="img" aria-label="siren">🚨</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <button
                  onClick={onClose}
                  className="text-white hover:text-red-200 transition-colors bg-red-800 hover:bg-red-900 rounded-full p-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Exclusive Promo Content */}
          <div className="p-6 bg-gradient-to-br from-red-50 via-white to-red-50">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
                <span className="ml-3 text-lg text-red-700">Loading your exclusive offer...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main Exclusive Offer Box */}
                <div className="bg-gradient-to-br from-red-100 via-red-50 to-orange-50 border-4 border-red-400 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                  {/* Corner sirens */}
                  <div className="absolute top-2 left-2 text-2xl siren-animate">
                    <span role="img" aria-label="siren">🚨</span>
                  </div>
                  <div className="absolute top-2 right-2 text-2xl siren-animate" style={{ animationDelay: '0.15s' }}>
                    <span role="img" aria-label="siren">🚨</span>
                  </div>
                  <div className="absolute bottom-2 left-2 text-2xl siren-animate" style={{ animationDelay: '0.3s' }}>
                    <span role="img" aria-label="siren">🚨</span>
                  </div>
                  <div className="absolute bottom-2 right-2 text-2xl siren-animate" style={{ animationDelay: '0.45s' }}>
                    <span role="img" aria-label="siren">🚨</span>
                  </div>

                  <div className="text-center pt-4 pb-2">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Zap className="h-8 w-8 text-red-600 animate-pulse" />
                      <span className="text-4xl font-black text-red-700">
                        {exclusivePromo.discount_percentage}% OFF
                      </span>
                      <Zap className="h-8 w-8 text-red-600 animate-pulse" />
                    </div>

                    <p className="text-lg font-bold text-red-800 mb-4">
                      YOUR EXCLUSIVE WELCOME DISCOUNT!
                    </p>

                    {/* Promo Code Display */}
                    <div className="bg-white border-4 border-red-500 rounded-xl p-4 mb-4 shadow-inner">
                      <p className="text-sm text-red-600 font-semibold mb-2 uppercase tracking-wide">
                        Your Exclusive Code (Auto-Applied):
                      </p>
                      <div className="pulse-code">
                        <span className="text-5xl font-black text-red-700 font-mono tracking-widest">
                          {exclusivePromo.promo_code}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-2 text-green-600">
                        <span className="text-lg">✓</span>
                        <span className="font-bold">AUTOMATICALLY APPLIED TO YOUR CART!</span>
                      </div>
                    </div>

                    {/* Countdown Timer */}
                    <div className="bg-red-900 text-white rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock className="h-5 w-5 animate-pulse" />
                        <span className="font-bold text-lg uppercase">Time Remaining:</span>
                      </div>
                      <div className="text-3xl font-mono font-black">
                        {exclusivePromo.hours_remaining}h {exclusivePromo.minutes_remaining}m
                      </div>
                      <p className="text-red-200 text-sm mt-1">
                        This offer expires and will NOT be extended!
                      </p>
                    </div>

                    {/* Terms */}
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-left">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-bold mb-2">Offer Terms:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>Minimum order:</strong> ${exclusivePromo.min_order_amount.toFixed(2)}</li>
                            <li><strong>Maximum order:</strong> ${exclusivePromo.max_order_amount.toFixed(2)}</li>
                            <li><strong>Maximum discount:</strong> ${exclusivePromo.max_discount_amount.toFixed(2)}</li>
                            <li><strong>One-time use only</strong> - valid for your first order</li>
                            <li><strong>Account #{user?.accountNumber} ONLY</strong> - cannot be shared</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Urgency Message */}
                <div className="text-center">
                  <p className="text-red-700 font-bold text-lg animate-pulse">
                    <span role="img" aria-label="warning">⚠️</span> DON'T MISS OUT! This offer will NOT come back! <span role="img" aria-label="warning">⚠️</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-red-100 to-red-200 px-6 py-4 border-t-4 border-red-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="text-2xl siren-animate">
                  <span role="img" aria-label="siren">🚨</span>
                </div>
                <p className="text-sm text-red-800 font-bold">
                  CODE "{exclusivePromo.promo_code}" - AUTO-APPLIED!
                </p>
                <div className="text-2xl siren-animate">
                  <span role="img" aria-label="siren">🚨</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-black shadow-lg border-2 border-red-800 text-lg"
              >
                START SHOPPING NOW! <span role="img" aria-label="cart">🛒</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular promotions display (no exclusive promo)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border-4 border-yellow-400">
        {/* Header - More Business-like */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 px-6 py-4 text-white relative border-b-4 border-yellow-400">
          <div className="absolute inset-0 bg-yellow-400 opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-400 text-blue-900 rounded-full p-2">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">CURRENT PROMOTIONS</h2>
                <p className="text-blue-100 text-sm font-semibold">SAVE MORE ON YOUR ORDER</p>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <button
                onClick={onClose}
                className="text-white hover:text-yellow-300 transition-colors bg-blue-700 hover:bg-blue-600 rounded-full p-2"
              >
                <X size={20} />
              </button>
              <div className="text-xs text-blue-200 font-medium">
                Auto-closing in: {countdown}s
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              <span className="ml-3 text-lg">Loading amazing deals...</span>
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600">No current promotions available</p>
              <p className="text-sm text-gray-500">Check back soon for new deals!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-lg font-semibold text-gray-800">
                  <span role="img" aria-label="star">🌟</span> {promotions.length} Active Deals Available! <span role="img" aria-label="star">🌟</span>
                </p>
              </div>

              {promotions.map((promo, index) => (
                <div
                  key={promo.code}
                  className={`rounded-xl border-2 p-4 transition-all duration-300 ${getCardStyle(promo)} ${promo.status === 'available' ? 'animate-fade-in-up' : ''}`}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-2xl animate-pulse">
                          {String.fromCodePoint(parseInt(getStatusEmoji(promo), 16))}
                        </span>
                        <h3 className={`text-lg font-bold ${getTextStyle(promo)}`}>
                          {promo.name || promo.description}
                        </h3>
                      </div>

                      {promo.description && promo.name && (
                        <p className={`text-sm mb-2 ${getTextStyle(promo)}`}>{promo.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {promo.min_order_value > 0 && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              Min: ${promo.min_order_value.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                        promo.status === 'available'
                          ? 'bg-green-100 text-green-700'
                          : promo.status === 'depleted' || promo.status === 'expired'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {getStatusMessage(promo)}
                      </div>
                    </div>
                  </div>

                  {/* Special messaging for depleted free gifts */}
                  {promo.status === 'depleted' && promo.is_free_gift && (
                    <div className="mt-3 p-2 bg-gray-100 border border-gray-400 rounded-lg">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium line-through">
                          <span role="img" aria-label="sad">😔</span> Promotion over - all items claimed
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Business-like with flashing sirens */}
        <div className="bg-yellow-50 px-6 py-4 border-t-4 border-yellow-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-red-500 animate-ping text-lg">
                <span role="img" aria-label="siren">🚨</span>
              </div>
              <p className="text-sm text-blue-800 font-semibold">
                <span role="img" aria-label="lightbulb">💡</span> AUTOMATIC APPLICATION - NO CODES NEEDED!
              </p>
              <div className="text-red-500 animate-ping text-lg">
                <span role="img" aria-label="siren">🚨</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-6 py-2 rounded-lg hover:from-blue-800 hover:to-blue-900 transition-all duration-200 font-bold shadow-lg border-2 border-yellow-400 hover:border-yellow-300"
            >
              START SHOPPING <span role="img" aria-label="arrow">→</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PromotionsLoginModal;
