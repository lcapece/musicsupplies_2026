import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTimesCircle } from 'react-icons/fa';

interface DeactivatedAccountModalProps {
  show: boolean;
  accountName: string;
  onClose: () => void;
}

const DeactivatedAccountModal: React.FC<DeactivatedAccountModalProps> = ({ 
  show, 
  accountName, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsClosing(false);
    } else {
      handleClose();
    }
  }, [show]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full mx-4 transform transition-transform ${isClosing ? 'scale-95' : 'scale-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 bg-red-100 text-red-800">
          <div className="mr-2">
            <FaTimesCircle className="text-red-500 text-xl" />
          </div>
          <h3 className="font-bold text-lg">
            Account Deactivated
          </h3>
        </div>
        <div className="p-4 text-gray-700">
          <p className="mb-2">
            <strong>{accountName}</strong> has been deactivated.
          </p>
          <p>
            Please call our help desk at{' '}
            <a 
              href="tel:18003215584" 
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              1-800-321-5584
            </a>
          </p>
        </div>
        <div className="px-4 py-3 bg-gray-50 flex justify-end">
          <button 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200"
            onClick={handleClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeactivatedAccountModal;
