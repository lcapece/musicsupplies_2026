import React from 'react';
import ChatWidget from '../components/ChatWidget';
import { useAuth } from '../context/AuthContext';

const ChatPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-purple-900 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Music Supplies Chat</h1>
            <span className="text-sm opacity-75">Connect with our team</span>
          </div>
          <a 
            href="/"
            className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-lg transition-colors"
          >
            Back to Store
          </a>
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to Music Supplies Chat</h2>
          
          <div className="space-y-4 text-gray-700">
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center font-semibold">1</div>
              <div>
                <p className="font-medium">{isAuthenticated ? 'Click the chat icon to open chat' : 'Log in to your account'}</p>
                <p className="text-sm text-gray-500">{isAuthenticated ? 'The purple message icon in the bottom-right opens the chat' : 'You must be logged in to use the chat system'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center font-semibold">2</div>
              <div>
                <p className="font-medium">{isAuthenticated ? 'Start chatting instantly' : 'Click the chat icon after logging in'}</p>
                <p className="text-sm text-gray-500">{isAuthenticated ? 'No participation code needed - you\'re automatically connected!' : 'The chat system will open automatically'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center font-semibold">3</div>
              <div>
                <p className="font-medium">Use different channels</p>
                <p className="text-sm text-gray-500">Message everyone, send direct messages, or use staff-only channels (if you're staff)</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">Chat Features:</h3>
            <ul className="space-y-1 text-sm text-purple-700">
              <li><span className="font-mono bg-white px-2 py-1 rounded">#everyone</span> - Message all users in the chat</li>
              <li><span className="font-mono bg-white px-2 py-1 rounded">Direct Messages</span> - Private conversations with specific users</li>
              <li><span className="font-mono bg-white px-2 py-1 rounded">#staff-only</span> - Staff and admin exclusive channel</li>
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Real-time messaging
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Direct messages to team members
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Minimizable chat window
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Typing indicators
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Need Help?
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>If you don't have a participation code, please contact:</p>
              <div className="space-y-1">
                <p className="font-medium">Sales: sales@musicsupplies.com</p>
                <p className="font-medium">Support: support@musicsupplies.com</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">Business hours: Mon-Fri 9AM-5PM EST</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget - automatically rendered */}
      <ChatWidget />
    </div>
  );
};

export default ChatPage;