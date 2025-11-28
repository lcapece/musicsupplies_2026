import React from 'react';
import { X } from 'lucide-react';

interface ActiveDiscountDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  startDate: string;
  endDate: string;
}

const ActiveDiscountDisplayModal: React.FC<ActiveDiscountDisplayModalProps> = ({
  isOpen,
  onClose,
  message,
  startDate,
  endDate,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Assuming dateString is YYYY-MM-DD
    const date = new Date(dateString + 'T00:00:00'); // Ensure it's parsed as local date
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative bg-white p-8 rounded-lg shadow-xl w-full max-w-md mx-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-4 text-indigo-600">Special Promotion!</h2>
        
        <div className="mb-6">
          <p className="text-gray-700" style={{ fontSize: '16pt', lineHeight: '1.5' }}>
            {message}
          </p>
        </div>

        <div className="text-sm text-gray-600 mb-6">
          <p>
            <strong>Effective from:</strong> {formatDate(startDate)}
          </p>
          <p>
            <strong>Until:</strong> {formatDate(endDate)}
          </p>
        </div>

        <div className="flex justify-start"> {/* Changed to justify-start for OK button on lower left */}
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveDiscountDisplayModal;
