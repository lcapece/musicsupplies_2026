import React from 'react';

interface EntityResult {
  id: string;
  business_name: string;
  address?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

interface DuplicateCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: EntityResult;
  duplicates: EntityResult[];
  onConfirmDuplicate: (accountId: string) => void;
  onNotDuplicate: () => void;
}

const DuplicateCheckModal: React.FC<DuplicateCheckModalProps> = ({
  isOpen,
  onClose,
  prospect,
  duplicates,
  onConfirmDuplicate,
  onNotDuplicate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Professional Header with Warning */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-white mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h2 className="text-xl font-bold text-white">Potential Duplicate Account Detected</h2>
                <p className="text-yellow-100 text-sm">Please review the following existing accounts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Prospect Information Card */}
        <div className="px-6 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
          <div className="bg-white rounded-lg border-2 border-green-300 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Prospect Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500">Business Name:</span>
                <p className="font-semibold text-gray-900">{prospect.business_name}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Address:</span>
                <p className="font-medium text-gray-700">{prospect.address || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Location:</span>
                <p className="font-medium text-gray-700">{prospect.city}, {prospect.state} {prospect.zip}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Phone:</span>
                <p className="font-medium text-gray-700">{prospect.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Duplicate Accounts Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Potential Matching Accounts ({duplicates.length})
            </h3>
            <p className="text-sm text-gray-600">
              The following accounts match the prospect's criteria. Please select if any of these is the same business.
            </p>
          </div>

          <div className="space-y-3">
            {duplicates.map((account, index) => (
              <div
                key={account.id}
                className="group bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-2xl font-bold text-red-600 mr-3">
                        #{account.id}
                      </span>
                      <span className="text-lg font-semibold text-gray-900">
                        {account.business_name}
                      </span>
                    </div>
                    <button
                      onClick={() => onConfirmDuplicate(account.id)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md transition-all transform hover:scale-105"
                    >
                      Select This Account
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Address</span>
                      <p className="font-medium text-gray-700 mt-1">{account.address || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">City/State/ZIP</span>
                      <p className="font-medium text-gray-700 mt-1">
                        {account.city}, {account.state} {account.zip}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Phone</span>
                      <p className="font-medium text-gray-700 mt-1">{account.phone}</p>
                    </div>
                  </div>

                  {/* Visual Comparison Indicators */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3">
                    {account.business_name.toLowerCase().substring(0, 5) === 
                     prospect.business_name.toLowerCase().substring(0, 5) && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        ✓ Name Match
                      </span>
                    )}
                    {account.zip === prospect.zip && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        ✓ ZIP Match
                      </span>
                    )}
                    {account.address?.toLowerCase().substring(0, 3) === 
                     prospect.address?.toLowerCase().substring(0, 3) && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        ✓ Address Match
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gradient-to-b from-gray-100 to-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              If none of these accounts match the prospect, click "Create New Account"
            </p>
            <div className="flex gap-3">
              <button
                onClick={onNotDuplicate}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-lg shadow-md transition-all"
              >
                Create New Account
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg shadow transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuplicateCheckModal;
