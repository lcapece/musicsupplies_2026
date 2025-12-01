import React from 'react';
import { Settings, ShoppingCart } from 'lucide-react';

interface SuperUserChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseBackend: () => void;
  onChooseShopOnBehalf: () => void;
  staffUsername: string;
}

const SuperUserChoiceModal: React.FC<SuperUserChoiceModalProps> = ({
  isOpen,
  onClose,
  onChooseBackend,
  onChooseShopOnBehalf,
  staffUsername
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-black opacity-95"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4 border border-slate-700/50">
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-20 blur-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(147, 51, 234, 0.4) 100%)',
            zIndex: -1
          }}
        />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-40 animate-pulse" />
              <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome, {staffUsername}
          </h2>
          <p className="text-slate-400 text-sm">
            Security verification successful. Choose your destination:
          </p>
        </div>

        {/* Choice Buttons */}
        <div className="space-y-4">
          {/* Backend Option */}
          <button
            onClick={onChooseBackend}
            className="w-full group relative overflow-hidden rounded-xl border-2 border-slate-600 hover:border-blue-500 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-blue-800/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center p-5">
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div className="ml-5 text-left">
                <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                  Go to Backend
                </h3>
                <p className="text-sm text-slate-400">
                  Access CRM, invoicing, accounts management
                </p>
              </div>
              <div className="ml-auto">
                <svg className="w-6 h-6 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Shop on Behalf Option */}
          <button
            onClick={onChooseShopOnBehalf}
            className="w-full group relative overflow-hidden rounded-xl border-2 border-slate-600 hover:border-purple-500 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-purple-800/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center p-5">
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-7 h-7 text-white" />
              </div>
              <div className="ml-5 text-left">
                <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                  Shop on Customer's Behalf
                </h3>
                <p className="text-sm text-slate-400">
                  Enter orders for a specific customer account
                </p>
              </div>
              <div className="ml-auto">
                <svg className="w-6 h-6 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-slate-500 text-xs flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Super User Access Granted
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuperUserChoiceModal;
