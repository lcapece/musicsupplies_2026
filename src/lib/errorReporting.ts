import { supabase } from './supabase';
import { handleError, logSecureError } from '../utils/secureErrorHandler';

interface ErrorDetails {
  message: string;
  stack?: string;
  component?: string;
  user?: {
    accountNumber?: number;
    acctName?: string;
    email?: string;
  };
  additionalContext?: any;
}

export const sendErrorNotificationSMS = async (errorDetails: ErrorDetails): Promise<boolean> => {
  try {
    const userInfo = errorDetails.user 
      ? `User: ${errorDetails.user.acctName} (${errorDetails.user.accountNumber})\nEmail: ${errorDetails.user.email}`
      : 'User: Not logged in';

    const componentInfo = errorDetails.component ? `\nComponent: ${errorDetails.component}` : '';
    
    const additionalInfo = errorDetails.additionalContext 
      ? `\nContext: ${JSON.stringify(errorDetails.additionalContext, null, 2).substring(0, 200)}...`
      : '';

    const message = `🚨 SYSTEM ERROR ALERT 🚨\n\nError: ${errorDetails.message}\n\n${userInfo}${componentInfo}${additionalInfo}\n\nTime: ${new Date().toLocaleString()}`;

    const { data, error } = await supabase.functions.invoke('send-test-sms', {
      body: {
        accountNumber: 'System Error',
        accountName: 'Error Reporting System',
        smsNumber: '+15164550980', // Your admin SMS number
        message: message
      }
    });

    if (error) {
      // Silently fail in production
      return false;
    }

    return true;
  } catch (error) {
    // Silently fail in production
    return false;
  }
};

export const reportError = async (
  error: Error | string, 
  component?: string, 
  user?: { accountNumber?: number; acctName?: string; email?: string },
  additionalContext?: any
): Promise<void> => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;

  const errorDetails: ErrorDetails = {
    message: errorMessage,
    stack: errorStack,
    component,
    user,
    additionalContext
  };

  // Use secure error logging
  logSecureError(error, component, user?.accountNumber?.toString());

  // Send SMS notification (don't await to avoid blocking)
  // Only send sanitized error message
  const sanitizedDetails = {
    ...errorDetails,
    message: handleError(error, component),
    stack: undefined, // Never send stack traces
    additionalContext: undefined // Never send internal context
  };
  sendErrorNotificationSMS(sanitizedDetails).catch(() => {});

  // You could also log to a monitoring service here
  // e.g., Sentry, LogRocket, etc.
};

// React Error Boundary compatible error reporter
export const reportReactError = (error: Error, errorInfo: any, component?: string): void => {
  reportError(error, component, undefined, { errorInfo });
};

// Global error handler for unhandled promise rejections and errors
export const setupGlobalErrorHandling = (): void => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportError(
      `Unhandled Promise Rejection: ${event.reason}`,
      'Global Handler',
      undefined,
      { url: window.location.href }
    );
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    reportError(
      event.error || event.message,
      'Global Handler',
      undefined,
      { 
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: window.location.href
      }
    );
  });
};
