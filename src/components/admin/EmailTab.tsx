import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface TestEmail {
  id: string;
  to: string;
  subject: string;
  message: string;
  status: 'sending' | 'sent' | 'failed';
  timestamp: string;
  error?: string;
  responseTime?: number;
  mailgunId?: string;
  diagnostics?: EmailDiagnostics;
}

interface EmailDiagnostics {
  credentialsCheck: 'pending' | 'success' | 'failed';
  networkConnectivity: 'pending' | 'success' | 'failed';
  mailgunResponse: any;
  errorCode?: string;
  detailedError?: string;
  suggestions?: string[];
}

interface MailgunCredentialTest {
  status: 'testing' | 'success' | 'failed';
  message: string;
  details?: any;
}

const EmailTab: React.FC = () => {
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmails, setTestEmails] = useState<TestEmail[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [credentialTest, setCredentialTest] = useState<MailgunCredentialTest | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    edgeFunctions: 'checking' | 'available' | 'unavailable';
    vault: 'checking' | 'configured' | 'missing';
    network: 'checking' | 'connected' | 'disconnected';
  }>({
    edgeFunctions: 'checking',
    vault: 'checking',
    network: 'checking'
  });

  const handleSendTestEmail = async (to: string, subject: string, message: string) => {
    const emailId = `test-${Date.now()}`;
    const startTime = Date.now();
    
    // Initialize diagnostics
    const diagnostics: EmailDiagnostics = {
      credentialsCheck: 'pending',
      networkConnectivity: 'pending',
      mailgunResponse: null,
      suggestions: []
    };
    
    // Add to test emails immediately
    const newTestEmail: TestEmail = {
      id: emailId,
      to: to,
      subject,
      message,
      status: 'sending',
      timestamp: new Date().toISOString(),
      diagnostics
    };

    setTestEmails(prev => [newTestEmail, ...prev]);

    try {
        emailId,
        to,
        subject,
        timestamp: new Date().toISOString()
      });

      // Test network connectivity first
      diagnostics.networkConnectivity = 'pending';
      setTestEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, diagnostics: { ...diagnostics } } : email
      ));

      const { data, error } = await supabase.functions.invoke('send-mailgun-email', {
        body: {
          to: to,
          subject: subject,
          text: message,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">Test Email from Music Supplies Admin</h2>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr style="margin: 20px 0; border: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This is a test email sent from the Music Supplies administration panel.<br>
              <strong>Test ID:</strong> ${emailId}<br>
              <strong>Sent:</strong> ${new Date().toLocaleString()}
            </p>
          </div>`,
          testMode: true,
          diagnostics: true
        }
      });

      const responseTime = Date.now() - startTime;
      
        emailId,
        data,
        error,
        responseTime: `${responseTime}ms`
      });

      if (error) {
        console.error('❌ Error sending test email:', error);
        
        // Enhanced error analysis
        let errorMessage = error.message || 'Unknown error';
        let errorCode = 'UNKNOWN_ERROR';
        const suggestions: string[] = [];
        
        // Analyze error types
        if (errorMessage.includes('Mailgun configuration is incomplete')) {
          errorCode = 'MISSING_CREDENTIALS';
          errorMessage = 'Mailgun credentials not configured in Supabase Edge Vault.';
          suggestions.push('Add MAILGUN_API_KEY and MAILGUN_SENDING_KEY to Supabase project settings');
          suggestions.push('Verify MAILGUN_DOMAIN is set to mg.musicsupplies.com');
          diagnostics.credentialsCheck = 'failed';
        } else if (errorMessage.includes('non-2xx status code') || errorMessage.includes('401')) {
          errorCode = 'INVALID_CREDENTIALS';
          errorMessage = 'Mailgun credentials are invalid or expired.';
          suggestions.push('Verify API keys are correct in Mailgun dashboard');
          suggestions.push('Check if domain is properly verified in Mailgun');
          diagnostics.credentialsCheck = 'failed';
        } else if (errorMessage.includes('403')) {
          errorCode = 'FORBIDDEN';
          errorMessage = 'Access forbidden - check domain authorization.';
          suggestions.push('Verify domain ownership in Mailgun dashboard');
          suggestions.push('Check authorized users and IP restrictions');
          diagnostics.credentialsCheck = 'failed';
        } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
          errorCode = 'NETWORK_ERROR';
          errorMessage = 'Network connectivity issue.';
          suggestions.push('Check internet connection');
          suggestions.push('Verify Supabase Edge Functions are accessible');
          diagnostics.networkConnectivity = 'failed';
        } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
          errorCode = 'QUOTA_EXCEEDED';
          errorMessage = 'Mailgun sending quota exceeded.';
          suggestions.push('Check Mailgun account limits');
          suggestions.push('Upgrade Mailgun plan if needed');
        }
        
        // Update diagnostics
        diagnostics.errorCode = errorCode;
        diagnostics.detailedError = errorMessage;
        diagnostics.suggestions = suggestions;
        diagnostics.mailgunResponse = error;
        
        // Update status to failed
        setTestEmails(prev => prev.map(email => 
          email.id === emailId ? { 
            ...email, 
            status: 'failed', 
            error: errorMessage,
            responseTime,
            diagnostics
          } : email
        ));
        
        alert(`❌ Failed to send test email: ${errorMessage}\n\nSuggestions:\n${suggestions.join('\n')}`);
        return;
      }

      // Success case
      
      diagnostics.credentialsCheck = 'success';
      diagnostics.networkConnectivity = 'success';
      diagnostics.mailgunResponse = data;
      
      // Update status to sent
      setTestEmails(prev => prev.map(email => 
        email.id === emailId ? { 
          ...email, 
          status: 'sent',
          responseTime,
          mailgunId: data?.messageId,
          diagnostics
        } : email
      ));

      alert(`✅ Test email sent successfully!\n\nResponse time: ${responseTime}ms\nMailgun ID: ${data?.messageId || 'N/A'}`);
      
    } catch (error) {
      console.error('🔥 Unexpected error:', error);
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      diagnostics.errorCode = 'SYSTEM_ERROR';
      diagnostics.detailedError = errorMessage;
      diagnostics.suggestions = [
        'Check browser console for detailed errors',
        'Verify Supabase Edge Functions are deployed',
        'Check network connectivity'
      ];
      
      setTestEmails(prev => prev.map(email => 
        email.id === emailId ? { 
          ...email, 
          status: 'failed', 
          error: errorMessage,
          responseTime,
          diagnostics
        } : email
      ));
      alert(`🔥 System error sending test email: ${errorMessage}`);
    }
  };

  const runCredentialTest = async () => {
    setCredentialTest({ status: 'testing', message: 'Testing Mailgun credentials...' });
    
    try {
      const { data, error } = await supabase.functions.invoke('send-mailgun-email', {
        body: {
          testCredentials: true
        }
      });

      if (error) {
        setCredentialTest({
          status: 'failed',
          message: `Credential test failed: ${error.message}`,
          details: error
        });
      } else {
        setCredentialTest({
          status: 'success',
          message: 'Credentials are valid and properly configured!',
          details: data
        });
      }
    } catch (error) {
      setCredentialTest({
        status: 'failed',
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }
  };

  const checkSystemStatus = async () => {
    setSystemStatus({
      edgeFunctions: 'checking',
      vault: 'checking',
      network: 'checking'
    });

    try {
      // Test Edge Functions availability
      const { data, error } = await supabase.functions.invoke('send-mailgun-email', {
        body: { healthCheck: true }
      });

      if (error) {
        setSystemStatus(prev => ({ ...prev, edgeFunctions: 'unavailable' }));
      } else {
        setSystemStatus(prev => ({ ...prev, edgeFunctions: 'available' }));
        
        // If edge function responds, check vault status from response
        if (data?.vaultStatus) {
          setSystemStatus(prev => ({ ...prev, vault: data.vaultStatus }));
        }
      }
      
      setSystemStatus(prev => ({ ...prev, network: 'connected' }));
    } catch (error) {
      setSystemStatus({
        edgeFunctions: 'unavailable',
        vault: 'checking',
        network: 'disconnected'
      });
    }
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const TestEmailModal: React.FC<{
    onClose: () => void;
    onSend: (to: string, subject: string, message: string) => void;
  }> = ({ onClose, onSend }) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('Test Email from Music Supplies');
    const [message, setMessage] = useState('This is a test email to verify the Mailgun integration is working correctly.');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!to.trim()) {
        alert('Please enter an email address');
        return;
      }
      
      if (!subject.trim()) {
        alert('Please enter a subject');
        return;
      }
      
      if (!message.trim()) {
        alert('Please enter a message');
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to.trim())) {
        alert('Please enter a valid email address');
        return;
      }

      onSend(to.trim(), subject.trim(), message.trim());
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Send Test Email
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Send a test email to verify Mailgun integration
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Email Address
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={6}
                required
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Send Test Email
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Management</h2>
          <p className="text-sm text-gray-600 mt-1">Send emails via Mailgun integration</p>
        </div>
        <div>
          <button
            onClick={() => setShowTestModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            📧 Send Test Email
          </button>
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Mailgun Configuration</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Sender:</strong> marketing@mg.musicsupplies.com</li>
          <li>• <strong>Service:</strong> Mailgun API</li>
          <li>• <strong>Credentials:</strong> Stored in Supabase Edge Vault</li>
          <li>• <strong>Status:</strong> Ready for testing (after credentials are configured)</li>
        </ul>
      </div>

      {/* Setup Required Notice */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h4 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Setup Required</h4>
        <p className="text-sm text-yellow-800 mb-2">
          Before sending emails, add these credentials to your Supabase project's Edge Functions secrets:
        </p>
        <div className="bg-yellow-100 p-2 rounded text-xs font-mono text-yellow-900 mb-2">
          MAILGUN_API_KEY=your-mailgun-api-key-here<br/>
          MAILGUN_SENDING_KEY=your-mailgun-sending-key-here<br/>
          MAILGUN_DOMAIN=mg.musicsupplies.com
        </div>
        <p className="text-xs text-yellow-700">
          Go to your Supabase dashboard → Edge Functions → Settings to add these environment variables.
        </p>
      </div>

      {/* System Status Dashboard */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
            <button
              onClick={checkSystemStatus}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              systemStatus.edgeFunctions === 'available' ? 'bg-green-500' :
              systemStatus.edgeFunctions === 'unavailable' ? 'bg-red-500' :
              'bg-yellow-500 animate-pulse'
            }`}></div>
            <div>
              <div className="text-sm font-medium text-gray-900">Edge Functions</div>
              <div className="text-xs text-gray-500">{systemStatus.edgeFunctions}</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              systemStatus.vault === 'configured' ? 'bg-green-500' :
              systemStatus.vault === 'missing' ? 'bg-red-500' :
              'bg-yellow-500 animate-pulse'
            }`}></div>
            <div>
              <div className="text-sm font-medium text-gray-900">Credentials</div>
              <div className="text-xs text-gray-500">{systemStatus.vault}</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              systemStatus.network === 'connected' ? 'bg-green-500' :
              systemStatus.network === 'disconnected' ? 'bg-red-500' :
              'bg-yellow-500 animate-pulse'
            }`}></div>
            <div>
              <div className="text-sm font-medium text-gray-900">Network</div>
              <div className="text-xs text-gray-500">{systemStatus.network}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic Tools */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Diagnostic Tools</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Credential Validation</h4>
              <p className="text-xs text-gray-500">Test Mailgun API credentials without sending email</p>
            </div>
            <button
              onClick={runCredentialTest}
              disabled={credentialTest?.status === 'testing'}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
            >
              {credentialTest?.status === 'testing' ? '🔄 Testing...' : '🔍 Test Credentials'}
            </button>
          </div>
          
          {credentialTest && (
            <div className={`p-3 rounded-lg text-sm ${
              credentialTest.status === 'success' ? 'bg-green-50 text-green-800' :
              credentialTest.status === 'failed' ? 'bg-red-50 text-red-800' :
              'bg-yellow-50 text-yellow-800'
            }`}>
              {credentialTest.message}
              {credentialTest.details && (
                <pre className="mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(credentialTest.details, null, 2)}
                </pre>
              )}
            </div>
          )}
          
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            {showDiagnostics ? '🔼 Hide Advanced Diagnostics' : '🔽 Show Advanced Diagnostics'}
          </button>
        </div>
      </div>

      {/* Test Emails History */}
      {testEmails.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Test Emails</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {testEmails.slice(0, 10).map((email) => (
              <div key={email.id} className="px-6 py-3 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      To: {email.to}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Subject: {email.subject}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate max-w-md">
                      {email.message}
                    </div>
                    
                    {/* Response Time and Mailgun ID */}
                    {(email.responseTime || email.mailgunId) && (
                      <div className="text-xs text-blue-600 mt-1 space-x-4">
                        {email.responseTime && <span>⏱️ {email.responseTime}ms</span>}
                        {email.mailgunId && <span>📧 {email.mailgunId}</span>}
                      </div>
                    )}
                    
                    {/* Error Details */}
                    {email.error && (
                      <div className="text-xs text-red-600 mt-1">
                        <div className="font-medium">❌ {email.error}</div>
                        {email.diagnostics?.suggestions && email.diagnostics.suggestions.length > 0 && (
                          <div className="mt-1 space-y-1">
                            <div className="font-medium">Suggestions:</div>
                            {email.diagnostics.suggestions.map((suggestion, idx) => (
                              <div key={idx} className="ml-2">• {suggestion}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Diagnostics Details */}
                    {showDiagnostics && email.diagnostics && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <div className="font-medium text-gray-700 mb-1">Diagnostics:</div>
                        <div className="space-y-1 text-gray-600">
                          <div>🔐 Credentials: {email.diagnostics.credentialsCheck}</div>
                          <div>🌐 Network: {email.diagnostics.networkConnectivity}</div>
                          {email.diagnostics.errorCode && (
                            <div>🔍 Error Code: {email.diagnostics.errorCode}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      email.status === 'sent' ? 'bg-green-100 text-green-800' :
                      email.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {email.status === 'sent' ? '✅ sent' :
                       email.status === 'failed' ? '❌ failed' :
                       '⏳ sending'}
                    </span>
                    <div className="text-xs text-gray-500">
                      {new Date(email.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Email Management Instructions</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Use the "Send Test Email" button to test the Mailgun integration</li>
          <li>• All emails are sent from marketing@mg.musicsupplies.com</li>
          <li>• Test emails include both plain text and HTML formatting</li>
          <li>• Email delivery status will be displayed in the Recent Test Emails section</li>
          <li>• Ensure Mailgun credentials are properly configured in Supabase Edge Vault</li>
        </ul>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <TestEmailModal
          onClose={() => setShowTestModal(false)}
          onSend={handleSendTestEmail}
        />
      )}
    </div>
  );
};

export default EmailTab;
