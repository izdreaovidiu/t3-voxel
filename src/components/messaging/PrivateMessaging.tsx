// src/components/messaging/PrivateMessaging.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  X, 
  Minimize2,
  Maximize2,
  MoreHorizontal,
  Search,
  AtSign,
  Gift
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface PrivateMessage {
  id: string;
  content: string;
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  timestamp: Date;
  edited?: boolean;
}

interface PrivateConversation {
  id: string;
  friendId: string;
  friendUsername: string;
  friendAvatar?: string;
  friendStatus: 'online' | 'away' | 'dnd' | 'offline';
  messages: PrivateMessage[];
  unreadCount: number;
  lastActivity: Date;
}

interface PrivateMessagingProps {
  friendId?: string;
  onClose?: () => void;
  onStartCall?: (friendId: string, type: 'voice' | 'video') => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const PrivateMessaging: React.FC<PrivateMessagingProps> = ({
  friendId,
  onClose,
  onStartCall,
  isMinimized = false,
  onToggleMinimize
}) => {
  const { user } = useUser();
  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockConversations: PrivateConversation[] = [
      {
        id: 'conv1',
        friendId: 'kopl',
        friendUsername: 'kopl',
        friendStatus: 'online',
        messages: [
          {
            id: 'msg1',
            content: 'Hey! How are you doing?',
            senderId: 'kopl',
            senderUsername: 'kopl',
            timestamp: new Date(Date.now() - 3600000)
          },
          {
            id: 'msg2',
            content: 'Pretty good! Just working on this chat app. Want to test the features?',
            senderId: user?.id || '',
            senderUsername: user?.username || user?.firstName || 'You',
            timestamp: new Date(Date.now() - 3500000)
          },
          {
            id: 'msg3',
            content: 'Absolutely! This looks amazing! 🚀',
            senderId: 'kopl',
            senderUsername: 'kopl',
            timestamp: new Date(Date.now() - 3400000)
          }
        ],
        unreadCount: 0,
        lastActivity: new Date()
      }
    ];

    setConversations(mockConversations);
    
    if (friendId) {
      const existing = mockConversations.find(conv => conv.friendId === friendId);
      if (existing) {
        setActiveConversation(existing.id);
      } else {
        // Create new conversation
        const newConv: PrivateConversation = {
          id: `conv_${friendId}`,
          friendId,
          friendUsername: friendId, // Replace with actual username
          friendStatus: 'online',
          messages: [],
          unreadCount: 0,
          lastActivity: new Date()
        };
        setConversations(prev => [newConv, ...prev]);
        setActiveConversation(newConv.id);
      }
    } else if (mockConversations.length > 0) {
      setActiveConversation(mockConversations[0].id);
    }
  }, [friendId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeConversation]);

  const currentConversation = conversations.find(conv => conv.id === activeConversation);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentConversation) return;

    const newMessage: PrivateMessage = {
      id: Math.random().toString(),
      content: messageInput,
      senderId: user?.id || '',
      senderUsername: user?.username || user?.firstName || 'You',
      senderAvatar: user?.imageUrl,
      timestamp: new Date()
    };

    setConversations(prev => prev.map(conv => 
      conv.id === activeConversation
        ? { ...conv, messages: [...conv.messages, newMessage], lastActivity: new Date() }
        : conv
    ));

    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'status-online';
      case 'away': return 'status-away';
      case 'dnd': return 'status-dnd';
      default: return 'status-offline';
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggleMinimize}
          className="btn-interactive flex items-center space-x-2 bg-[#5865F2] text-white px-4 py-2 rounded-lg shadow-lg hover:bg-[#4752C4] hover:shadow-xl"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{currentConversation?.friendUsername || 'Messages'}</span>
          {conversations.reduce((total, conv) => total + conv.unreadCount, 0) > 0 && (
            <div className="notification-badge bg-[#ED4245] text-white text-xs px-1.5 py-0.5 rounded-full">
              {conversations.reduce((total, conv) => total + conv.unreadCount, 0)}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 bg-[#0D1117] border-l border-gray-800/50 shadow-2xl animate-modal-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800/50 bg-gradient-to-r from-[#161B22] to-[#21262D]">
        <div className="flex items-center space-x-3">
          {currentConversation && (
            <>
              <div className="relative">
                {currentConversation.friendAvatar ? (
                  <img
                    src={currentConversation.friendAvatar}
                    alt={currentConversation.friendUsername}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black">
                    {currentConversation.friendUsername[0].toUpperCase()}
                  </div>
                )}
                <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0D1117] ${getStatusColor(currentConversation.friendStatus)}`} />
              </div>
              
              <div>
                <h3 className="font-medium text-white">{currentConversation.friendUsername}</h3>
                <p className="text-xs text-gray-400">
                  {currentConversation.friendStatus === 'online' ? 'Online' : currentConversation.friendStatus}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {currentConversation && (
            <>
              <button
                onClick={() => onStartCall?.(currentConversation.friendId, 'voice')}
                className="btn-interactive flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-[#57F287]"
                title="Voice Call"
              >
                <Phone className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => onStartCall?.(currentConversation.friendId, 'video')}
                className="btn-interactive flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-[#57F287]"
                title="Video Call"
              >
                <Video className="h-4 w-4" />
              </button>
              
              <button className="btn-interactive flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white">
                <Search className="h-4 w-4" />
              </button>
            </>
          )}
          
          <button
            onClick={onToggleMinimize}
            className="btn-interactive flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          
          <button
            onClick={onClose}
            className="btn-interactive flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Conversations List */}
        <div className="w-24 border-r border-gray-800/50 bg-[#161B22] p-2 space-y-2 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`relative w-full hover-lift transition-all duration-200 ${
                activeConversation === conv.id
                  ? 'ring-2 ring-[#57F287]/50'
                  : ''
              }`}
            >
              <div className="relative">
                {conv.friendAvatar ? (
                  <img
                    src={conv.friendAvatar}
                    alt={conv.friendUsername}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black text-sm">
                    {conv.friendUsername[0].toUpperCase()}
                  </div>
                )}
                <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#161B22] ${getStatusColor(conv.friendStatus)}`} />
                
                {conv.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 notification-badge bg-[#ED4245] text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {conv.unreadCount}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Messages Area */}
        {currentConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentConversation.messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.senderId === user?.id ? 'order-2' : 'order-1'}`}>
                    <div className={`message-hover rounded-xl px-4 py-2 ${
                      message.senderId === user?.id
                        ? 'bg-[#5865F2] text-white'
                        : 'bg-[#21262D] text-gray-200'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                        {message.edited && ' • edited'}
                      </p>
                    </div>
                  </div>
                  
                  {message.senderId !== user?.id && (
                    <div className="order-1 mr-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#57F287] to-[#3BA55C] font-bold text-black text-xs">
                        {message.senderUsername[0].toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-800/50">
              <div className="flex items-end space-x-2">
                <button className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                  <Paperclip className="h-4 w-4" />
                </button>
                
                <div className="flex-1">
                  <div className="rounded-lg border border-gray-700/50 bg-[#21262D] p-2">
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Message ${currentConversation.friendUsername}...`}
                      className="w-full h-10 resize-none border-none bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
                      rows={1}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                    <AtSign className="h-4 w-4" />
                  </button>
                  <button className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                    <Smile className="h-4 w-4" />
                  </button>
                  <button className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/30 hover:text-[#57F287]">
                    <Gift className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="btn-interactive flex h-10 w-10 items-center justify-center rounded-lg bg-[#57F287] text-black hover:bg-[#3BA55C] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
