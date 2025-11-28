import React from 'react';
import { X } from 'lucide-react';

export interface ImportStepStatus {
  step: string;
  status: 'pending' | 'in-progress' | 'success' | 'error';
  message?: string;
}

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusMessages: ImportStepStatus[];
  title?: string;
}

const ProductImportModal: React.FC<ProductImportModalProps> = ({
  isOpen,
  onClose,
  statusMessages,
  title = "Product Import Status"
}) => {
  if (!isOpen) {
    return null;
  }

  const getStatusColor = (status: ImportStepStatus['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'in-progress':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: ImportStepStatus['status']) => {
    switch (status) {
      case 'success':
        return '✓'; // Check mark
      case 'error':
        return '✗'; // X mark
      case 'in-progress':
        return '⏳'; // Hourglass
      default: // pending
        return '...'; 
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        <div className="mt-3">
          <ul className="space-y-2">
            {statusMessages.map((item, index) => (
              <li key={index} className="text-sm">
                <span className={`font-semibold ${getStatusColor(item.status)} mr-2`}>
                  {getStatusIcon(item.status)}
                </span>
                <span>{item.step}: </span>
                <span className={getStatusColor(item.status)}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
                {item.message && <p className="text-xs text-gray-500 pl-6">{item.message}</p>}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductImportModal;
