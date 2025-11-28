import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface NotificationModalProps {
  show: boolean;
  type: NotificationType;
  title?: string;
  message: string;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ 
  show, 
  type, 
  title, 
  message, 
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

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="text-green-500 text-xl" />;
      case 'warning':
        return <FaExclamationCircle className="text-yellow-500 text-xl" />;
      case 'error':
        return <FaTimesCircle className="text-red-500 text-xl" />;
      case 'info':
      default:
        return <FaInfoCircle className="text-blue-500 text-xl" />;
    }
  };

  const getHeaderClass = () => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'info':
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'success': return 'bg-green-600 hover:bg-green-700';
      case 'warning': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'error': return 'bg-red-600 hover:bg-red-700';
      case 'info':
      default: return 'bg-blue-600 hover:bg-blue-700';
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
        <div className={`flex items-center px-4 py-3 ${getHeaderClass()}`}>
          <div className="mr-2">
            {getIcon()}
          </div>
          <h3 className="font-bold text-lg">
            {title || type.charAt(0).toUpperCase() + type.slice(1)}
          </h3>
        </div>
        <div className="p-4 text-gray-700">
          {message}
        </div>
        <div className="px-4 py-3 bg-gray-50 flex justify-end">
          <button 
            className={`px-4 py-2 ${getButtonClass()} text-white rounded transition-colors duration-200`}
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

export default NotificationModal;
