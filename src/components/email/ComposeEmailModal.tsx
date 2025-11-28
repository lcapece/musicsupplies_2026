import React, { useState, useEffect, useRef } from 'react';
import { useEmail, EmailMessage, EmailTemplate } from '../../hooks/useEmail';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: EmailMessage | null;
  username: string;
}

const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  replyTo,
  username
}) => {
  const { sendEmail, saveDraft, account, templates, fetchTemplates, loading } = useEmail(username);

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (replyTo) {
      setTo(replyTo.from_address);
      setSubject(replyTo.subject?.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject || ''}`);

      const originalDate = new Date(replyTo.received_at).toLocaleString();
      const quotedText = `\n\n---\nOn ${originalDate}, ${replyTo.from_name || replyTo.from_address} wrote:\n\n${replyTo.body_text || ''}`;
      setBody(quotedText);
    }
  }, [replyTo]);

  const handleSend = async () => {
    if (!to.trim()) {
      setError('Please enter a recipient');
      return;
    }

    setSending(true);
    setError(null);

    const toAddresses = to.split(/[,;]/).map(e => e.trim()).filter(e => e);
    const ccAddresses = cc ? cc.split(/[,;]/).map(e => e.trim()).filter(e => e) : undefined;
    const bccAddresses = bcc ? bcc.split(/[,;]/).map(e => e.trim()).filter(e => e) : undefined;

    const success = await sendEmail({
      to_addresses: toAddresses,
      cc_addresses: ccAddresses,
      bcc_addresses: bccAddresses,
      subject: subject || '(No subject)',
      body_text: body,
      body_html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">${body.replace(/\n/g, '<br>')}</div>`,
      in_reply_to: replyTo?.message_id
    });

    setSending(false);

    if (success) {
      onClose();
    } else {
      setError('Failed to send email. Please try again.');
    }
  };

  const handleSaveDraft = async () => {
    const toAddresses = to ? to.split(/[,;]/).map(e => e.trim()).filter(e => e) : [];
    const ccAddresses = cc ? cc.split(/[,;]/).map(e => e.trim()).filter(e => e) : undefined;

    await saveDraft({
      to_addresses: toAddresses,
      cc_addresses: ccAddresses,
      subject: subject || '(No subject)',
      body_text: body,
      body_html: body ? `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">${body.replace(/\n/g, '<br>')}</div>` : undefined
    });

    onClose();
  };

  const applyTemplate = (template: EmailTemplate) => {
    if (template.subject) setSubject(template.subject);
    if (template.body_html) {
      // Convert HTML to plain text for textarea
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = template.body_html;
      setBody(tempDiv.textContent || tempDiv.innerText || '');
    }
    setShowTemplates(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
          <h2 className="text-lg font-bold">
            {replyTo ? 'Reply' : 'New Message'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          {/* From */}
          <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-500 w-12">From:</label>
            <span className="text-slate-700">{account?.email_address || `${username}@musicsupplies.com`}</span>
          </div>

          {/* To */}
          <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-500 w-12">To:</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 outline-none text-slate-700 placeholder:text-slate-400"
              autoFocus={!replyTo}
            />
            <div className="flex gap-2 text-sm">
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  className="text-blue-600 hover:underline"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  onClick={() => setShowBcc(true)}
                  className="text-blue-600 hover:underline"
                >
                  Bcc
                </button>
              )}
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-3">
              <label className="text-sm font-medium text-slate-500 w-12">Cc:</label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="flex-1 outline-none text-slate-700 placeholder:text-slate-400"
              />
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-3">
              <label className="text-sm font-medium text-slate-500 w-12">Bcc:</label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
                className="flex-1 outline-none text-slate-700 placeholder:text-slate-400"
              />
            </div>
          )}

          {/* Subject */}
          <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-500 w-12">Subject:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="flex-1 outline-none text-slate-700 placeholder:text-slate-400"
            />
          </div>

          {/* Template selector */}
          {templates.length > 0 && (
            <div className="px-6 py-2 border-b border-slate-200 bg-slate-50">
              <div className="relative">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Use Template
                </button>

                {showTemplates && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="font-medium text-slate-700">{template.name}</div>
                        {template.category && (
                          <div className="text-xs text-slate-500">{template.category}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-4">
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              className="w-full h-64 outline-none resize-none text-slate-700 placeholder:text-slate-400 leading-relaxed"
            />
          </div>

          {/* Signature */}
          {account?.signature && (
            <div className="px-6 pb-4">
              <button
                onClick={() => setBody(prev => prev + '\n\n' + account.signature)}
                className="text-sm text-blue-600 hover:underline"
              >
                Add signature
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-6 pb-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-xl">
          <div className="flex gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={sending}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Discard
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !to.trim()}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComposeEmailModal;
