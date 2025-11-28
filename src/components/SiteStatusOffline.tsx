import React from 'react';

interface SiteStatusOfflineProps {
  message: string;
}

const SiteStatusOffline: React.FC<SiteStatusOfflineProps> = ({ message }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            className="h-20 w-auto"
            src="/src/images/logo_1.png"
            alt="Music Supplies"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/src/images/logo_2.png";
            }}
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Site Temporarily Unavailable
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Maintenance in Progress
            </h3>
            <div className="mt-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>
            <div className="mt-6">
              <p className="text-xs text-gray-500">
                If you need immediate assistance, please contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteStatusOffline;
