import { useEffect, useRef, useCallback } from 'react';
import { useEnhancedSocketContext } from '~/contexts/EnhancedSocketContext';

interface MessageResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface UseStableSocketProps {
  serverId: string;
  channelId: string;
  onMessage?: (message: any) => void;
}

export function useStableSocket({ serverId, channelId, onMessage }: UseStableSocketProps) {
  const {
    isConnected,
    socket,
    userStatus,
    joinServer,
    joinChannel,
    sendMessage: socketSendMessage,
    subscribeToMessages,
    clearNotifications,
    // Voice channel functions
    joinVoiceChannel,
    leaveVoiceChannel,
    updateVoiceStatus,
    getVoiceChannelParticipants,
    isInVoiceChannel,
    getVoiceChannelCount,
    voiceChannelData,
    // Server members
    subscribeToServerMembers,
    getServerMembers,
    getServerOnlineCount,
    serverMembers,
    // Typing indicators
    startTyping,
    stopTyping,
  } = useEnhancedSocketContext();

  // Track what we've already joined to prevent duplicate calls
  const joinedServerRef = useRef<string | null>(null);
  const joinedChannelRef = useRef<string | null>(null);
  const messageUnsubscribeRef = useRef<(() => void) | null>(null);

  // Join server effect
  useEffect(() => {
    if (!serverId || !isConnected) return;

    // Only join if we haven't already joined this server
    if (joinedServerRef.current !== serverId) {
      console.log('🏠 Joining server (stable):', serverId);
      joinServer(serverId);
      clearNotifications(serverId);
      joinedServerRef.current = serverId;
    }
  }, [serverId, isConnected, joinServer, clearNotifications]);

  // Join channel effect
  useEffect(() => {
    if (!channelId || !isConnected || !serverId) return;

    // Only join if we haven't already joined this channel
    if (joinedChannelRef.current !== channelId) {
      console.log('📱 Joining channel (stable):', channelId);
      joinChannel(channelId, serverId);
      joinedChannelRef.current = channelId;
    }
  }, [channelId, serverId, isConnected, joinChannel]);

  // Message subscription effect
  useEffect(() => {
    if (!channelId || !onMessage) return;

    // Clean up previous subscription
    if (messageUnsubscribeRef.current) {
      console.log('📪 Cleaning up previous message subscription');
      messageUnsubscribeRef.current();
      messageUnsubscribeRef.current = null;
    }

    console.log('📬 Setting up message subscription for channel:', channelId);
    
    // Create subscription
    const unsubscribe = subscribeToMessages(onMessage);
    messageUnsubscribeRef.current = unsubscribe;

    return () => {
      if (messageUnsubscribeRef.current) {
        console.log('📪 Cleaning up message subscription on unmount');
        messageUnsubscribeRef.current();
        messageUnsubscribeRef.current = null;
      }
    };
  }, [channelId, onMessage, subscribeToMessages]);

  // Reset joined refs when disconnected
  useEffect(() => {
    if (!isConnected) {
      joinedServerRef.current = null;
      joinedChannelRef.current = null;
    }
  }, [isConnected]);

  // Wrap sendMessage to add typing indicators and handle the Promise
  const sendMessage = useCallback(
    async (content: string, targetChannelId: string = channelId, tempId?: string): Promise<MessageResponse> => {
      if (!targetChannelId) {
        console.error('No channel ID provided for sending message');
        return { success: false, error: 'No channel ID provided' };
      }
      
      if (!content.trim()) {
        console.error('Cannot send empty message');
        return { success: false, error: 'Message cannot be empty' };
      }
      
      try {
        // Start typing indicator
        startTyping(targetChannelId);
        
        // Send the message and wait for confirmation
        const result = await socketSendMessage(content, targetChannelId, tempId);
        
        // Stop typing indicator after a short delay
        const typingTimeout = setTimeout(() => {
          stopTyping(targetChannelId);
        }, 2000);
        
        // Clean up the timeout and typing indicator
        clearTimeout(typingTimeout);
        stopTyping(targetChannelId);
        return result;
      } catch (error) {
        console.error('Error sending message:', error);
        stopTyping(targetChannelId);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to send message' 
        };
      }
    },
    [channelId, socketSendMessage, startTyping, stopTyping],
  );

  return {
    isConnected,
    sendMessage,
    socket,
    userStatus,
    // Voice channel functions
    joinVoiceChannel,
    leaveVoiceChannel,
    updateVoiceStatus,
    getVoiceChannelParticipants,
    isInVoiceChannel,
    getVoiceChannelCount,
    voiceChannelData,
    // Server members
    subscribeToServerMembers,
    getServerMembers,
    getServerOnlineCount,
    serverMembers,
    // Typing indicators
    startTyping,
    stopTyping,
  };
}
