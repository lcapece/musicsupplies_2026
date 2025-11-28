import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmail, EmailMessage, EmailFolder } from '../hooks/useEmail';
import ComposeEmailModal from '../components/email/ComposeEmailModal';
import EmailMessageView from '../components/email/EmailMessageView';

const EmailClientPage: React.FC = () => {
  const { user, staffUsername, isStaffUser } = useAuth();
  const username = isStaffUser ? staffUsername : user?.accountNumber;

  const {
    messages,
    selectedMessage,
    currentFolder,
    loading,
    error,
    unreadCount,
    account,
    fetchMessages,
    fetchMessage,
    setCurrentFolder,
    markAsRead,
    markAsUnread,
    toggleStar,
    deleteMessage,
    permanentlyDelete,
    moveToFolder,
    clearSelectedMessage
  } = useEmail(username || null);

  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<EmailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (username) {
      fetchMessages('inbox');
    }
  }, [username]);

  const handleCompose = () => {
    setReplyTo(null);
    setShowCompose(true);
  };

  const handleReply = (message: EmailMessage) => {
    setReplyTo(message);
    setShowCompose(true);
  };

  const handleFolderChange = (folder: EmailFolder) => {
    clearSelectedMessage();
    setCurrentFolder(folder);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateText = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const folders: { key: EmailFolder; label: string; icon: JSX.Element }[] = [
    {
      key: 'inbox',
      label: 'Inbox',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )
    },
    {
      key: 'sent',
      label: 'Sent',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      )
    },
    {
      key: 'drafts',
      label: 'Drafts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      key: 'deleted',
      label: 'Deleted',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    }
  ];

  if (!username) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-700">Email not available</h2>
          <p className="text-slate-500 mt-2">Please log in to access email.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Email</h1>
              <p className="text-blue-200 text-sm">
                {account?.email_address || `${username}@musicsupplies.com`}
              </p>
            </div>
          </div>

          <button
            onClick={handleCompose}
            className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl shadow-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Compose
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col">
          {/* Folders */}
          <nav className="p-4 flex-1">
            <ul className="space-y-1">
              {folders.map(folder => (
                <li key={folder.key}>
                  <button
                    onClick={() => handleFolderChange(folder.key)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      currentFolder === folder.key
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {folder.icon}
                    <span className="flex-1 text-left">{folder.label}</span>
                    {folder.key === 'inbox' && unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Account Info */}
          <div className="p-4 border-t border-slate-200">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Signed in as</div>
            <div className="font-semibold text-slate-700 truncate">
              {account?.display_name || username}
            </div>
          </div>
        </aside>

        {/* Message List */}
        <div className="w-96 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emails..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto">
            {loading && messages.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-slate-500">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-700 mb-1">No messages</h3>
                <p className="text-sm text-slate-500">
                  {currentFolder === 'inbox' ? 'Your inbox is empty' :
                   currentFolder === 'sent' ? 'No sent messages' :
                   currentFolder === 'drafts' ? 'No drafts' :
                   'Trash is empty'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {messages.map(message => (
                  <li key={message.id}>
                    <button
                      onClick={() => fetchMessage(message.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                        selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                      } ${!message.is_read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Star */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStar(message.id); }}
                          className={`mt-1 ${message.is_starred ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                        >
                          <svg className="w-4 h-4" fill={message.is_starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm truncate ${!message.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                              {currentFolder === 'sent'
                                ? message.to_addresses?.[0] || 'No recipient'
                                : message.from_name || message.from_address
                              }
                            </span>
                            <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                              {formatDate(message.received_at)}
                            </span>
                          </div>
                          <div className={`text-sm truncate ${!message.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                            {message.subject || '(No subject)'}
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {truncateText(message.body_text, 60)}
                          </div>
                        </div>

                        {/* Unread indicator */}
                        {!message.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Message View */}
        <div className="flex-1 bg-white flex flex-col">
          {selectedMessage ? (
            <EmailMessageView
              message={selectedMessage}
              onReply={() => handleReply(selectedMessage)}
              onDelete={() => deleteMessage(selectedMessage.id)}
              onMarkUnread={() => { markAsUnread(selectedMessage.id); clearSelectedMessage(); }}
              onPermanentDelete={currentFolder === 'deleted' ? () => permanentlyDelete(selectedMessage.id) : undefined}
              onMoveToInbox={currentFolder === 'deleted' ? () => moveToFolder(selectedMessage.id, 'inbox') : undefined}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a message</h3>
                <p className="text-slate-500">Choose a message from the list to read it</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeEmailModal
          isOpen={showCompose}
          onClose={() => { setShowCompose(false); setReplyTo(null); }}
          replyTo={replyTo}
          username={username}
        />
      )}
    </div>
  );
};

export default EmailClientPage;
