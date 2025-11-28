import React, { useState, useEffect } from 'react';
import { Gift, Star, AlertCircle, X, Sparkles } from 'lucide-react';
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

interface PromotionsLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromotionsLoginModal: React.FC<PromotionsLoginModalProps> = ({
  isOpen,
  onClose
}) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(20);
  const { user } = useAuth();

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen) {
      setCountdown(20);
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
  }, [isOpen, onClose]);

  useEffect(() => {
    const fetchPromotions = async () => {
      if (!isOpen || !user?.accountNumber) return;
      
      setIsLoading(true);
      try {
        
        // First try the specific function, then fallback to available promo codes
        const { data: promoData, error } = await supabase.rpc('get_login_promotions_display', {
          p_account_number: user.accountNumber
        });


        if (error) {
          // Fallback to available promo codes function
          const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_available_promo_codes_only', {
            p_account_number: user.accountNumber,
            p_order_value: 0 // Show all promos regardless of order value for modal
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
    if (promo.status === 'available') return '🎉';
    if (promo.status === 'depleted') return '😔';
    if (promo.status === 'expired') return '⏰';
    if (promo.status === 'min_not_met') return '💰';
    return '🎯';
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
                  🌟 {promotions.length} Active Deals Available! 🌟
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
                          {getStatusEmoji(promo)}
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
                          😔 Promotion over - all items claimed
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
              <div className="text-red-500 animate-ping text-lg">🚨</div>
              <p className="text-sm text-blue-800 font-semibold">
                💡 AUTOMATIC APPLICATION - NO CODES NEEDED!
              </p>
              <div className="text-red-500 animate-ping text-lg">🚨</div>
            </div>
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-6 py-2 rounded-lg hover:from-blue-800 hover:to-blue-900 transition-all duration-200 font-bold shadow-lg border-2 border-yellow-400 hover:border-yellow-300"
            >
              START SHOPPING →
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PromotionsLoginModal;
