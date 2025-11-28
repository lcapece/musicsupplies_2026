import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import NotificationModal, { NotificationType } from '../components/NotificationModal';

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string, title?: string, displayTimeMs?: number) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [showModal, setShowModal] = useState(false);
  const [notificationProps, setNotificationProps] = useState<{
    type: NotificationType;
    message: string;
    title?: string;
  }>({
    type: 'info',
    message: '',
  });
  
  // Use a ref to track timeout IDs for cleanup
  const notificationTimeoutRef = useRef<number | null>(null);

  const showNotification = useCallback((
    type: NotificationType, 
    message: string, 
    title?: string, 
    displayTimeMs: number = 3000 // Default 3 seconds minimum display time
  ) => {
    // Clear any existing timeout to prevent race conditions
    if (notificationTimeoutRef.current !== null) {
      window.clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    
    setNotificationProps({
      type,
      message,
      title,
    });
    setShowModal(true);
    
    // Set a minimum display time to ensure users can read the message
    notificationTimeoutRef.current = window.setTimeout(() => {
      notificationTimeoutRef.current = null;
      // We don't auto-close, just mark that it's safe to close now
      // This allows the notification to stay until user interaction if needed
    }, displayTimeMs);
  }, []);

  const hideNotification = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <NotificationModal
        show={showModal}
        type={notificationProps.type}
        message={notificationProps.message}
        title={notificationProps.title}
        onClose={hideNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
