import React from 'react';
import { X } from 'lucide-react';

interface AppliedOrderInfo {
  order_number: string;
  order_date: string;
  invoice_amount: number;
  savings_amount: number;
}

interface IntroductoryPromoInfo {
  name: string;
  description: string;
  value: number;
  uses_remaining: number | null;
  max_uses: number | null;
  orders_applied: AppliedOrderInfo[];
  is_active_for_user: boolean;
}

interface EverydayDiscountInfo {
  name: string;
  description: string;
  value: number;
}

export interface PromotionalOffersStatus {
  introductoryPromo: IntroductoryPromoInfo | null;
  everydayDiscount: EverydayDiscountInfo | null;
}

interface PromotionalPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  promoStatus: PromotionalOffersStatus | null;
}

const PromotionalPopupModal: React.FC<PromotionalPopupModalProps> = ({ isOpen, onClose, promoStatus }) => {
  if (!isOpen || !promoStatus) return null;

  const { introductoryPromo, everydayDiscount } = promoStatus;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close promotional offers modal"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-center text-indigo-600 mb-6">
          musicsupplies.com Promotional Offers
        </h2>

        <div className="space-y-6">
          {introductoryPromo && introductoryPromo.is_active_for_user && (
            <div className="p-4 border border-green-300 rounded-lg bg-green-50">
              <h3 className="text-lg font-semibold text-green-700">{introductoryPromo.name}</h3>
              <p className="text-sm text-green-600 mt-1">{introductoryPromo.description}</p>
              <p className="text-sm text-green-600 mt-1">
                Discount: <strong>{introductoryPromo.value}%</strong>
              </p>
              {introductoryPromo.uses_remaining !== null && (
                <p className="text-sm font-semibold text-green-700 mt-2">
                  Uses Remaining: {introductoryPromo.uses_remaining} / {introductoryPromo.max_uses || 'N/A'}
                </p>
              )}
              {introductoryPromo.orders_applied && introductoryPromo.orders_applied.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">Applied to Orders:</h4>
                  <ul className="space-y-1 text-xs text-gray-600 max-h-32 overflow-y-auto">
                    {introductoryPromo.orders_applied.map(order => (
                      <li key={order.order_number} className="p-1 bg-white rounded border border-gray-200">
                        Order: {order.order_number} ({order.order_date}) - Saved: ${order.savings_amount.toFixed(2)} (Invoice: ${order.invoice_amount.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {everydayDiscount && (
            <div className="p-4 border border-blue-300 rounded-lg bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-700">{everydayDiscount.name}</h3>
              <p className="text-sm text-blue-600 mt-1">{everydayDiscount.description}</p>
              <p className="text-sm text-blue-600 mt-1">
                Discount: <strong>{everydayDiscount.value}%</strong>
              </p>
            </div>
          )}

          {(!introductoryPromo || !introductoryPromo.is_active_for_user) && !everydayDiscount && (
             <p className="text-center text-gray-500">No special promotional offers currently active for your account.</p>
          )}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionalPopupModal;
