import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface DemoModeBannerProps {
  onTimeout: () => void;
}

const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ onTimeout }) => {
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-yellow-100 border-b-2 border-yellow-400 px-4 py-3 shadow-md sticky top-0 z-50">
      <div className="flex items-center justify-center">
        <AlertTriangle className="h-6 w-6 text-yellow-700 mr-3" />
        <div className="flex items-center gap-4">
          <span className="text-yellow-900 font-bold" style={{ fontSize: '16pt' }}>
            DEMONSTRATION MODE - View Only
          </span>
          <span className="text-red-600 font-bold" style={{ fontSize: '16pt' }}>
            Session expires in: {formatTime(timeRemaining)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DemoModeBanner;
