import React from 'react';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CartRestorationModalProps {
  isOpen: boolean;
  onGoToCart: () => void;
  onContinueShopping: () => void;
}

const CartRestorationModal: React.FC<CartRestorationModalProps> = ({
  isOpen,
  onGoToCart,
  onContinueShopping
}) => {
  const { restoreCartFromDatabase, dismissCartRestoration } = useCart();

  const handleGoToCart = async () => {
    await restoreCartFromDatabase();
    onGoToCart();
  };

  const handleContinueShopping = () => {
    dismissCartRestoration();
    onContinueShopping();
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 border-4 border-blue-400">
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-6 py-4 text-white rounded-t-lg">
          <div className="flex items-center">
            <ShoppingCart className="h-6 w-6 text-yellow-300 mr-2" />
            <h2 className="text-xl font-bold">
              CART ITEMS FOUND!
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-800 mb-6 font-medium">
            Reminder: You have items in your cart from your last visit. Do you want to go to the cart now?
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleGoToCart}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-lg"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              YES - GO TO CART
            </button>
            
            <button
              onClick={handleContinueShopping}
              className="w-full flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-bold"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              NO - CONTINUE SHOPPING
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartRestorationModal;
