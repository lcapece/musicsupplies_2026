import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface EmailMessage {
  id: number;
  message_id?: string;
  owner_username: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'deleted';
  from_address: string;
  from_name?: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  attachment_count: number;
  in_reply_to?: string;
  thread_id?: string;
  linked_account_number?: number;
  sent_at?: string;
  received_at: string;
  created_at: string;
}

export interface EmailAccount {
  id: number;
  username: string;
  email_address: string;
  display_name?: string;
  signature?: string;
  is_active: boolean;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject?: string;
  body_html?: string;
  category?: string;
}

export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'deleted';

interface UseEmailReturn {
  messages: EmailMessage[];
  selectedMessage: EmailMessage | null;
  currentFolder: EmailFolder;
  loading: boolean;
  error: string | null;
  unreadCount: number;
  account: EmailAccount | null;
  templates: EmailTemplate[];

  // Actions
  fetchMessages: (folder: EmailFolder) => Promise<void>;
  fetchMessage: (id: number) => Promise<void>;
  setCurrentFolder: (folder: EmailFolder) => void;
  markAsRead: (id: number) => Promise<void>;
  markAsUnread: (id: number) => Promise<void>;
  toggleStar: (id: number) => Promise<void>;
  moveToFolder: (id: number, folder: EmailFolder) => Promise<void>;
  deleteMessage: (id: number) => Promise<void>;
  permanentlyDelete: (id: number) => Promise<void>;
  sendEmail: (email: Partial<EmailMessage>) => Promise<boolean>;
  saveDraft: (email: Partial<EmailMessage>) => Promise<number | null>;
  fetchTemplates: () => Promise<void>;
  searchMessages: (query: string) => Promise<void>;
  clearSelectedMessage: () => void;
}

export const useEmail = (username: string | null): UseEmailReturn => {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>('inbox');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch user's email account
  useEffect(() => {
    if (username) {
      fetchAccount();
      fetchUnreadCount();
    }
  }, [username]);

  const fetchAccount = async () => {
    if (!username) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('username', username.toLowerCase())
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      setAccount(data as EmailAccount);
    } catch (err) {
      console.error('Failed to fetch email account:', err);
    }
  };

  const fetchUnreadCount = async () => {
    if (!username) return;

    try {
      const { count, error: countError } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('owner_username', username.toLowerCase())
        .eq('folder', 'inbox')
        .eq('is_read', false);

      if (countError) throw countError;
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const fetchMessages = useCallback(async (folder: EmailFolder) => {
    if (!username) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('email_messages')
        .select('*')
        .eq('owner_username', username.toLowerCase())
        .eq('folder', folder)
        .order('received_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      setMessages(data as EmailMessage[]);
      setCurrentFolder(folder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [username]);

  const fetchMessage = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('email_messages')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setSelectedMessage(data as EmailMessage);

      // Mark as read if in inbox
      if (data && !data.is_read && data.folder === 'inbox') {
        await markAsRead(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch message');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: number) => {
    try {
      const { error: updateError } = await supabase
        .from('email_messages')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, is_read: true } : null);
      }
      fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAsUnread = async (id: number) => {
    try {
      const { error: updateError } = await supabase
        .from('email_messages')
        .update({ is_read: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: false } : m));
      fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark as unread:', err);
    }
  };

  const toggleStar = async (id: number) => {
    const message = messages.find(m => m.id === id);
    if (!message) return;

    try {
      const { error: updateError } = await supabase
        .from('email_messages')
        .update({ is_starred: !message.is_starred, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_starred: !m.is_starred } : m));
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const moveToFolder = async (id: number, folder: EmailFolder) => {
    try {
      const { error: updateError } = await supabase
        .from('email_messages')
        .update({ folder, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      fetchUnreadCount();
    } catch (err) {
      console.error('Failed to move message:', err);
    }
  };

  const deleteMessage = async (id: number) => {
    await moveToFolder(id, 'deleted');
  };

  const permanentlyDelete = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('email_messages')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Failed to permanently delete:', err);
    }
  };

  const sendEmail = async (email: Partial<EmailMessage>): Promise<boolean> => {
    if (!account) return false;

    setLoading(true);
    setError(null);

    try {
      // Call existing send-mailgun-email edge function
      const { data, error: funcError } = await supabase.functions.invoke('send-mailgun-email', {
        body: {
          to: email.to_addresses?.join(', '),
          subject: email.subject,
          html: email.body_html,
          text: email.body_text
        }
      });

      if (funcError) throw funcError;

      // Save to sent folder
      const { error: insertError } = await supabase
        .from('email_messages')
        .insert({
          message_id: data?.messageId,
          owner_username: username?.toLowerCase(),
          folder: 'sent',
          from_address: account.email_address,
          from_name: account.display_name,
          to_addresses: email.to_addresses,
          cc_addresses: email.cc_addresses,
          bcc_addresses: email.bcc_addresses,
          subject: email.subject,
          body_text: email.body_text,
          body_html: email.body_html,
          is_read: true,
          in_reply_to: email.in_reply_to,
          linked_account_number: email.linked_account_number,
          sent_at: new Date().toISOString(),
          received_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async (email: Partial<EmailMessage>): Promise<number | null> => {
    if (!account || !username) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('email_messages')
        .insert({
          owner_username: username.toLowerCase(),
          folder: 'drafts',
          from_address: account.email_address,
          from_name: account.display_name,
          to_addresses: email.to_addresses || [],
          cc_addresses: email.cc_addresses,
          subject: email.subject,
          body_text: email.body_text,
          body_html: email.body_html,
          is_read: true,
          linked_account_number: email.linked_account_number,
          received_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      return data?.id || null;
    } catch (err) {
      console.error('Failed to save draft:', err);
      return null;
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (fetchError) throw fetchError;
      setTemplates(data as EmailTemplate[]);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const searchMessages = async (query: string) => {
    if (!username || !query.trim()) {
      fetchMessages(currentFolder);
      return;
    }

    setLoading(true);
    try {
      const { data, error: searchError } = await supabase
        .from('email_messages')
        .select('*')
        .eq('owner_username', username.toLowerCase())
        .or(`subject.ilike.%${query}%,body_text.ilike.%${query}%,from_address.ilike.%${query}%`)
        .order('received_at', { ascending: false })
        .limit(100);

      if (searchError) throw searchError;
      setMessages(data as EmailMessage[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const clearSelectedMessage = () => {
    setSelectedMessage(null);
  };

  return {
    messages,
    selectedMessage,
    currentFolder,
    loading,
    error,
    unreadCount,
    account,
    templates,
    fetchMessages,
    fetchMessage,
    setCurrentFolder: (folder: EmailFolder) => {
      setCurrentFolder(folder);
      fetchMessages(folder);
    },
    markAsRead,
    markAsUnread,
    toggleStar,
    moveToFolder,
    deleteMessage,
    permanentlyDelete,
    sendEmail,
    saveDraft,
    fetchTemplates,
    searchMessages,
    clearSelectedMessage
  };
};

export default useEmail;
