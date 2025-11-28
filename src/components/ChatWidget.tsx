import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Send, X, Minimize2, MessageSquare, Users, Hash, AtSign, AlertCircle } from 'lucide-react';

interface Message {
  id: number;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'public' | 'direct' | 'everyone';
  recipientId?: string;
  recipientName?: string;
}

interface User {
  id: string;
  name: string;
  accountNumber?: string;
  role?: 'admin' | 'staff' | 'customer';
}

interface ChatWidgetProps {
  serverUrl?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  serverUrl = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3001' 
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<'everyone' | 'public' | string>('everyone');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<'admin' | 'staff' | 'customer'>('customer');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set());
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Check user role on mount
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;
      
      try {
        const accountNumber = parseInt(user.accountNumber, 10);
        const { data, error } = await supabase
          .from('staff')
          .select('privs')
          .eq('account_number', accountNumber)
          .single();
        
        if (!error && data) {
          if (data.privs >= 5) {
            setUserRole('admin');
          } else if (data.privs === 1) {
            setUserRole('staff');
          } else {
            setUserRole('customer');
          }
        } else {
          setUserRole('customer');
        }
      } catch (err) {
        console.error('Error checking user role:', err);
        setUserRole('customer');
      }
    };
    
    checkUserRole();
  }, [user]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Flash icon when new message arrives and minimized
  useEffect(() => {
    if (hasNewMessage && (isMinimized || !isOpen)) {
      const interval = setInterval(() => {
        setHasNewMessage(prev => !prev);
      }, 500);
      
      setTimeout(() => {
        clearInterval(interval);
        setHasNewMessage(true);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [hasNewMessage, isMinimized, isOpen]);

  // Initialize socket connection
  const connectToChat = useCallback(() => {
    if (socketRef.current || !isAuthenticated) return;

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      
      // Auto-join with LCMD code for logged-in users
      if (user) {
        socket.emit('join-room', {
          participationCode: 'LCMD',
          userName: user.acctName || user.email || `User ${user.accountNumber}`,
          isAuthenticated: true,
          accountNumber: user.accountNumber,
          userRole: userRole
        });
      }
    });

    socket.on('room-joined', ({ users }) => {
      setRoomUsers(users);
      setMessages([{
        id: Date.now(),
        userId: 'system',
        userName: 'System',
        message: `Welcome to Music Supplies Chat!`,
        timestamp: new Date(),
        type: 'public'
      }]);
    });

    socket.on('user-joined', ({ user: newUser, users }) => {
      setRoomUsers(users);
      setMessages(prev => [...prev, {
        id: Date.now(),
        userId: 'system',
        userName: 'System',
        message: `${newUser.name} joined the chat`,
        timestamp: new Date(),
        type: 'public'
      }]);
    });

    socket.on('user-left', ({ userName: name }) => {
      setRoomUsers(prev => prev.filter(u => u.name !== name));
      setMessages(prev => [...prev, {
        id: Date.now(),
        userId: 'system',
        userName: 'System',
        message: `${name} left the chat`,
        timestamp: new Date(),
        type: 'public'
      }]);
    });

    socket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      if (isMinimized || !isOpen) {
        setHasNewMessage(true);
      }
      if (message.type === 'everyone' && selectedChannel !== 'everyone') {
        setUnreadChannels(prev => new Set(prev).add('everyone'));
      }
    });

    socket.on('new-direct-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      if (isMinimized || !isOpen) {
        setHasNewMessage(true);
      }
      const channelId = message.userId === socket.id ? message.recipientId! : message.userId;
      if (selectedChannel !== channelId) {
        setUnreadChannels(prev => new Set(prev).add(channelId));
      }
    });

    socket.on('user-typing', ({ userId, isTyping }) => {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        if (isTyping) {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return updated;
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return socket;
  }, [serverUrl, isAuthenticated, user, userRole, isMinimized, isOpen, selectedChannel]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && !socketRef.current) {
      connectToChat();
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, connectToChat]);

  // Send message
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socketRef.current) return;

    if (selectedChannel === 'everyone') {
      socketRef.current.emit('send-message', {
        message: inputMessage,
        participationCode: 'LCMD',
        type: 'everyone'
      });
    } else if (selectedChannel === 'public') {
      socketRef.current.emit('send-message', {
        message: inputMessage,
        participationCode: 'LCMD',
        type: 'public'
      });
    } else {
      socketRef.current.emit('send-direct-message', {
        message: inputMessage,
        recipientId: selectedChannel
      });
    }
    
    setInputMessage('');
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('typing', {
      participationCode: 'LCMD',
      isTyping: true
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', {
        participationCode: 'LCMD',
        isTyping: false
      });
    }, 1000);
  };

  // Handle channel selection
  const handleChannelSelect = (channel: string) => {
    setSelectedChannel(channel);
    setUnreadChannels(prev => {
      const updated = new Set(prev);
      updated.delete(channel);
      return updated;
    });
  };

  // Open chat and clear notification
  const handleOpenChat = () => {
    setIsOpen(true);
    setHasNewMessage(false);
  };

  // Filter messages based on selected channel
  const filteredMessages = messages.filter(msg => {
    if (selectedChannel === 'everyone') {
      return msg.type === 'everyone';
    }
    if (selectedChannel === 'public') {
      return msg.type === 'public';
    }
    return msg.type === 'direct' && 
           (msg.userId === selectedChannel || msg.recipientId === selectedChannel);
  });

  // Filter users based on role
  const visibleUsers = roomUsers.filter(u => {
    if (userRole === 'admin' || userRole === 'staff') {
      return true; // Admin and staff see everyone
    }
    // Customers only see staff and admins
    return u.role === 'admin' || u.role === 'staff';
  });

  // Modified to allow non-authenticated users to use AI chat
  // Only authenticated users can access the live chat with other users
  // Non-authenticated users get AI assistant powered by knowledge base

  if (!isOpen) {
    return (
      <button
        onClick={handleOpenChat}
        className={`fixed bottom-4 right-4 ${hasNewMessage ? 'bg-orange-500 animate-pulse' : 'bg-purple-600'} text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50`}
        aria-label="Open chat"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 bg-white border ${hasNewMessage ? 'border-orange-500' : 'border-gray-300'} rounded-lg shadow-lg p-2 flex items-center gap-2 z-50`}>
        <button
          onClick={() => {
            setIsMinimized(false);
            setHasNewMessage(false);
          }}
          className={`flex items-center gap-2 ${hasNewMessage ? 'text-orange-600' : 'text-gray-700'} hover:text-gray-900`}
        >
          <MessageSquare size={20} className={hasNewMessage ? 'animate-pulse' : ''} />
          <span className="text-sm font-medium">Chat</span>
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-red-600"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-2xl flex flex-col z-50"
      style={{ width: '600px', height: '500px' }}
    >
      {/* Header */}
      <div className="bg-purple-900 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} />
          <span className="font-semibold">
            Music Supplies Chat - {user?.acctName || user?.email}
          </span>
          {userRole === 'admin' && (
            <span className="bg-purple-700 px-2 py-0.5 rounded text-xs">Admin</span>
          )}
          {userRole === 'staff' && (
            <span className="bg-purple-700 px-2 py-0.5 rounded text-xs">Staff</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-purple-800 p-1 rounded"
            aria-label="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-purple-800 p-1 rounded"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-purple-50 border-r border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-200">
            <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Channels</div>
            <button
              onClick={() => handleChannelSelect('everyone')}
              className={`w-full text-left px-2 py-1 rounded text-sm flex items-center justify-between ${
                selectedChannel === 'everyone' ? 'bg-purple-200' : 'hover:bg-purple-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <Hash size={14} />
                everyone
              </div>
              {unreadChannels.has('everyone') && (
                <span className="bg-orange-500 w-2 h-2 rounded-full animate-pulse"></span>
              )}
            </button>
            {(userRole === 'admin' || userRole === 'staff') && (
              <button
                onClick={() => handleChannelSelect('public')}
                className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-1 ${
                  selectedChannel === 'public' ? 'bg-purple-200' : 'hover:bg-purple-100'
                }`}
              >
                <Hash size={14} />
                staff-only
              </button>
            )}
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-600 uppercase mb-1 flex items-center gap-1">
              <Users size={12} />
              Direct Messages
            </div>
            {visibleUsers.filter(u => u.id !== socketRef.current?.id).map(chatUser => (
              <button
                key={chatUser.id}
                onClick={() => handleChannelSelect(chatUser.id)}
                className={`w-full text-left px-2 py-1 rounded text-sm flex items-center justify-between ${
                  selectedChannel === chatUser.id ? 'bg-purple-200' : 'hover:bg-purple-100'
                }`}
              >
                <div className="flex items-center gap-1">
                  <AtSign size={14} />
                  <span className="truncate">{chatUser.name}</span>
                  {chatUser.role === 'admin' && (
                    <span className="text-xs text-purple-600">(A)</span>
                  )}
                  {chatUser.role === 'staff' && (
                    <span className="text-xs text-blue-600">(S)</span>
                  )}
                </div>
                {unreadChannels.has(chatUser.id) && (
                  <span className="bg-orange-500 w-2 h-2 rounded-full animate-pulse"></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`${
                  msg.userId === 'system' ? 'text-center text-gray-500 text-xs italic' : ''
                }`}
              >
                {msg.userId !== 'system' && (
                  <div className={`flex items-start gap-2 ${msg.userId === socketRef.current?.id ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 ${msg.userId === socketRef.current?.id ? 'bg-green-600' : 'bg-purple-600'} text-white rounded-full flex items-center justify-center text-xs font-semibold`}>
                      {msg.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className={`flex-1 ${msg.userId === socketRef.current?.id ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{msg.userName}</span>
                        {msg.type === 'direct' && (
                          <span className="text-xs text-gray-500">
                            {msg.userId === socketRef.current?.id ? `→ ${msg.recipientName}` : '(Direct)'}
                          </span>
                        )}
                        {msg.type === 'everyone' && (
                          <span className="text-xs text-purple-600">(Everyone)</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`inline-block text-sm px-3 py-1 rounded-lg mt-1 ${
                        msg.userId === socketRef.current?.id 
                          ? 'bg-green-100 text-gray-800' 
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                )}
                {msg.userId === 'system' && msg.message}
              </div>
            ))}
            {typingUsers.size > 0 && (
              <div className="text-xs text-gray-500 italic pl-10">
                Someone is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  handleTyping();
                }}
                placeholder={`Message ${
                  selectedChannel === 'everyone' ? '#everyone' : 
                  selectedChannel === 'public' ? '#staff-only' : 
                  visibleUsers.find(u => u.id === selectedChannel)?.name || ''
                }`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm"
              />
              <button
                type="submit"
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                disabled={!inputMessage.trim() || !isConnected}
              >
                <Send size={18} />
              </button>
            </div>
            {!isConnected && (
              <p className="text-xs text-red-500 mt-1">Connecting to chat server...</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;