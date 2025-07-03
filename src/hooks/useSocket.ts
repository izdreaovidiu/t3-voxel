// Fixed Context Hook to ensure proper typing and error handling
"use client";

import { useContext } from 'react';
import { useEnhancedSocketContext } from '~/contexts/EnhancedSocketContext';

// Compatibility hook for backward compatibility
export const useSocket = () => {
  try {
    const context = useEnhancedSocketContext();
    
    // Map enhanced context to legacy interface for backward compatibility
    return {
      ...context,
      // Legacy method names
      sendMessage: context.sendMessage,
      subscribeToMessages: context.subscribeToMessages,
      joinChannel: context.joinChannel,
      joinServer: context.joinServer,
      clearNotifications: context.clearNotifications,
      isConnected: context.isConnected,
      socket: context.socket,
      
      // Voice channel methods
      joinVoiceChannel: context.joinVoiceChannel,
      leaveVoiceChannel: context.leaveVoiceChannel,
      updateVoiceStatus: context.updateVoiceStatus,
      getVoiceChannelData: context.getVoiceChannelData,
      isInVoiceChannel: context.isInVoiceChannel,
      
      // Additional enhanced features
      subscribeToVoiceUpdates: context.subscribeToVoiceUpdates,
      subscribeToSpeakingUpdates: context.subscribeToSpeakingUpdates,
      updateSpeakingStatus: context.updateSpeakingStatus,
      
      // Connection management
      forceReconnect: context.forceReconnect,
      getConnectionInfo: context.getConnectionInfo,
    };
  } catch (error) {
    console.error('Error accessing socket context:', error);
    throw new Error('useSocket must be used within an EnhancedSocketProvider');
  }
};

export default useSocket;