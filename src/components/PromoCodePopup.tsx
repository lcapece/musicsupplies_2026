import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PromoCodeSummary, AvailablePromoCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface PromoCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

// Extended PromoCodeSummary with account usage information and status
type ExtendedPromoCodeSummary = PromoCodeSummary & {
  uses_remaining_for_account?: number | null;
  status?: 'available' | 'expired' | 'expired_global' | 'expired_date' | 'not_active' | 'disabled' | 'min_not_met';
};

const PromoCodePopup: React.FC<PromoCodePopupProps> = ({ isOpen, onClose }) => {
  const [allPromoCodes, setAllPromoCodes] = useState<ExtendedPromoCodeSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { totalPrice } = useCart();

  useEffect(() => {
    const fetchPromoCodes = async () => {
      if (!isOpen || !user) return;
      
      setLoading(true);
      try {
        // Use the new function with status information
        const { data: allCodesData, error: queryError } = await supabase.rpc('get_all_promo_codes_with_status', {
          p_account_number: user.accountNumber,
          p_order_value: totalPrice || 0
        });
        
        if (!queryError && allCodesData && allCodesData.length > 0) {
          // Transform to expected format with status information
          const promoCodes: ExtendedPromoCodeSummary[] = allCodesData.map((promo: any) => ({
            code: promo.code,
            name: promo.name,
            description: promo.description,
            type: promo.type,
            value: promo.value,
            min_order_value: promo.min_order_value || 0,
            uses_remaining_for_account: promo.uses_remaining_for_account,
            status: promo.status
          }));
          
          setAllPromoCodes(promoCodes);
          return;
        }
        
        // Fallback to get_best_promo_code function
        const { data: bestPromo, error: bestError } = await supabase.rpc('get_best_promo_code', {
          p_account_number: user.accountNumber
        });
        
        if (!bestError && bestPromo) {
          const promoCode: ExtendedPromoCodeSummary = {
            code: bestPromo.code,
            name: bestPromo.name,
            description: bestPromo.description,
            type: bestPromo.type || 'percent_off',
            value: bestPromo.value || 0,
            min_order_value: bestPromo.min_order_value || 0,
            uses_remaining_for_account: null,
            status: 'available'
          };
          setAllPromoCodes([promoCode]);
        } else {
          // No promo codes available
          setError('No promotional codes are available for your account at this time.');
        }
      } catch (err) {
        console.error('Error in promo code popup:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPromoCodes();
  }, [isOpen, user, totalPrice]);

  // Helper function to get status display information
  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'expired':
        return { text: 'EXPIRED', color: 'text-red-600', bgColor: 'bg-red-100', badge: true };
      case 'expired_global':
        return { text: 'EXPIRED', color: 'text-red-600', bgColor: 'bg-red-100', badge: true };
      case 'expired_date':
        return { text: 'EXPIRED', color: 'text-red-600', bgColor: 'bg-red-100', badge: true };
      case 'not_active':
        return { text: 'NOT ACTIVE', color: 'text-gray-500', bgColor: 'bg-gray-100', badge: true };
      case 'disabled':
        return { text: 'DISABLED', color: 'text-gray-500', bgColor: 'bg-gray-100', badge: true };
      case 'min_not_met':
        return { text: 'MIN ORDER NOT MET', color: 'text-yellow-600', bgColor: 'bg-yellow-100', badge: true };
      case 'available':
      default:
        return { text: 'AVAILABLE', color: 'text-green-600', bgColor: 'bg-green-100', badge: false };
    }
  };

  // Separate available and expired codes
  const availableCodes = allPromoCodes.filter(code => code.status === 'available' || code.status === 'min_not_met');
  const expiredCodes = allPromoCodes.filter(code => 
    code.status === 'expired' || 
    code.status === 'expired_global' || 
    code.status === 'expired_date' ||
    code.status === 'not_active' ||
    code.status === 'disabled'
  );

  const bestAvailableCode = availableCodes.find(code => code.status === 'available') || availableCodes[0];

  // Don't render anything if the modal isn't open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-[70]">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Special Offer Just For You!
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <div className="bg-red-50 p-6 rounded-lg mb-4">
              <div className="text-lg text-red-700 mb-2">
                {error}
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        ) : allPromoCodes.length > 0 ? (
          <div className="text-center py-4 max-h-96 overflow-y-auto">
            {/* Show available codes first */}
            {bestAvailableCode && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Available Offer</h4>
                <div className="bg-blue-50 p-6 rounded-lg mb-4">
                  <div className="text-2xl font-bold text-blue-800 mb-2">
                    {bestAvailableCode.code}
                  </div>
                  <div className="text-lg text-blue-700 mb-4">
                    {bestAvailableCode.name}
                  </div>
                  <div className="text-gray-700">
                    {bestAvailableCode.description}
                  </div>
                  <div className="mt-3 space-y-1">
                    {bestAvailableCode.min_order_value > 0 && (
                      <div className="text-sm text-gray-500">
                        *Minimum order value: ${bestAvailableCode.min_order_value.toFixed(2)}
                      </div>
                    )}
                    {bestAvailableCode.uses_remaining_for_account !== undefined && 
                     bestAvailableCode.uses_remaining_for_account !== null && (
                      <div className="text-sm font-medium text-blue-600">
                        You can use this code {bestAvailableCode.uses_remaining_for_account} more time{bestAvailableCode.uses_remaining_for_account !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Use this code at checkout to receive your discount.
                </p>
              </div>
            )}

            {/* Show expired codes if any */}
            {expiredCodes.length > 0 && (
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-gray-600 mb-3">Previously Used Codes</h4>
                <div className="space-y-3">
                  {expiredCodes.map((code, index) => {
                    const statusInfo = getStatusInfo(code.status);
                    return (
                      <div key={index} className={`p-4 rounded-lg border ${statusInfo.bgColor} opacity-75`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className={`text-lg font-bold ${statusInfo.color} line-through`}>
                            {code.code}
                          </div>
                          {statusInfo.badge && (
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.color} ${statusInfo.bgColor} border`}>
                              {statusInfo.text}
                            </span>
                          )}
                        </div>
                        <div className={`text-sm ${statusInfo.color} line-through`}>
                          {code.name}
                        </div>
                        <div className={`text-xs ${statusInfo.color} mt-1`}>
                          {code.status === 'expired' && code.uses_remaining_for_account === 0 && 
                            'You have already used this one-time code'}
                          {code.status === 'expired_date' && 'This code has expired'}
                          {code.status === 'expired_global' && 'This code has reached its usage limit'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Got it!
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="bg-gray-50 p-6 rounded-lg mb-4">
              <div className="text-lg text-gray-700 mb-2">
                No promotional codes are available for your account at this time.
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromoCodePopup;
