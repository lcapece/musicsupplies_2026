import React from 'react';
import { EmailMessage } from '../../hooks/useEmail';

interface EmailMessageViewProps {
  message: EmailMessage;
  onReply: () => void;
  onDelete: () => void;
  onMarkUnread: () => void;
  onPermanentDelete?: () => void;
  onMoveToInbox?: () => void;
}

const EmailMessageView: React.FC<EmailMessageViewProps> = ({
  message,
  onReply,
  onDelete,
  onMarkUnread,
  onPermanentDelete,
  onMoveToInbox
}) => {
  const formatFullDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
        <button
          onClick={onReply}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Reply
        </button>

        <button
          onClick={onMarkUnread}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Mark Unread
        </button>

        {onMoveToInbox && (
          <button
            onClick={onMoveToInbox}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            Move to Inbox
          </button>
        )}

        <div className="flex-1" />

        {onPermanentDelete ? (
          <button
            onClick={onPermanentDelete}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Permanently
          </button>
        ) : (
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-white border border-slate-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        )}
      </div>

      {/* Message Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          {message.subject || '(No subject)'}
        </h2>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {(message.from_name || message.from_address).charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">
                  {message.from_name || message.from_address}
                </span>
                {message.from_name && (
                  <span className="text-slate-500 ml-2">&lt;{message.from_address}&gt;</span>
                )}
              </div>
              <span className="text-sm text-slate-500">
                {formatFullDate(message.received_at)}
              </span>
            </div>

            <div className="text-sm text-slate-600 mt-1">
              <span className="text-slate-500">To:</span>{' '}
              {message.to_addresses?.join(', ') || 'Unknown'}
            </div>

            {message.cc_addresses && message.cc_addresses.length > 0 && (
              <div className="text-sm text-slate-600 mt-0.5">
                <span className="text-slate-500">Cc:</span>{' '}
                {message.cc_addresses.join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Attachments indicator */}
        {message.has_attachments && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span>{message.attachment_count} attachment{message.attachment_count > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {message.body_html ? (
          <div
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: message.body_html }}
          />
        ) : message.body_text ? (
          <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
            {message.body_text}
          </pre>
        ) : (
          <p className="text-slate-500 italic">No message content</p>
        )}
      </div>

      {/* Quick Reply Footer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <button
          onClick={onReply}
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-left text-slate-500 hover:border-blue-400 hover:text-slate-700 transition-colors"
        >
          Click to reply...
        </button>
      </div>
    </div>
  );
};

export default EmailMessageView;
